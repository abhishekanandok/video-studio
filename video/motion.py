"""How each scene moves. A decision node (the director) picks, for every scene, one of:

    veo       a real cinematic video shot made from the scene's own image (Gemini Veo, image-to-video)
    parallax  2.5D: the main subject is lifted off a clean background plate and the two layers move at different speeds
    camera    a plain push / pull / pan on the still image

Veo needs its own credentials (see video/README.md). Without them, or when a clip fails, a veo pick falls back to parallax,
so a film never waits on Veo. Once credentials arrive, re-running the film makes the missing clips.
"""

import json
import os
import shutil as _shutil

NPX = _shutil.which("npx") or "npx"  # npx.cmd on Windows, which a bare "npx" doesn't find
import subprocess
import time
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

import pipeline as base
from app.config import settings

HERE = os.path.dirname(os.path.abspath(__file__))
CLIP_SECONDS = 8
# how many scenes may become Veo shots, and whether parallax is used at all
BUDGET = {"off": (0, False), "parallax": (0, True), "few": (1 / 12, True), "many": (1 / 5, True)}


class ShotPick(BaseModel):
    act: int
    scene: int
    motion: Literal["veo", "parallax", "camera"]
    action: str = Field("", description="veo: what moves and how the camera moves, one sentence. parallax: the foreground subject, a few words")


class MotionPlan(BaseModel):
    shots: list[ShotPick]


DIRECTOR = """You are the director of photography of a documentary in the Vox / Veritasium style. For every scene listed, pick
how it moves:
- veo: a real cinematic video shot generated from the scene's image. At most {budget} in the whole film. Spend them on the
  moments that deserve motion: the opening shot, establishing shots of places, the future or a hypothetical scenario,
  something invisible made visible, the turning point of an act. NEVER for a real historical event or a real, named person
  (generated footage must never look like evidence of something that happened), never for diagrams, infographics,
  blueprints or scenes full of notes. action: one sentence: what moves in the frame and how the camera moves (slow dolly in,
  orbit, crane up, drift through...). No dialogue, no text.
- parallax: a 2.5D move where one clear subject lifts off its background. Use it for about a quarter of the scenes: collage,
  photo, archival or illustration scenes with ONE clear foreground subject. action: that subject in a few words.
- camera: a plain push, pull or pan. Everything else, and every scene with a diagram.
{parallax_rule}Spread veo shots across the film; never two in a row. Return exactly one entry per scene listed."""


def plan_path(out: str) -> str:
    return os.path.join(out, "motion.json")


def clip_path(out: str, n: int, i: int) -> str:
    return os.path.join(out, f"a{n:02d}s{i:02d}.mp4")


def layer_paths(out: str, n: int, i: int) -> tuple[str, str]:
    return os.path.join(out, f"a{n:02d}s{i:02d}-plate.png"), os.path.join(out, f"a{n:02d}s{i:02d}-fg.png")


def decide(out: str, docs: list[dict], level: str, llm) -> dict:
    """The decision node: one pass over the whole film (so shots are spread well). Cached in motion.json."""
    path = plan_path(out)
    if os.path.exists(path):
        return json.load(open(path))
    share, parallax = BUDGET.get(level, BUDGET["few"])
    scenes = [(n, i, sc) for n, d in enumerate(docs) for i, sc in enumerate(d["scenes"])]
    budget = int(len(scenes) * share)
    if budget == 0 and not parallax:
        picks = {}
    else:
        listing = "\n".join(
            f"act {n} scene {i} | look {sc.get('look')} | {'DIAGRAM | ' if sc.get('diagram') else ''}{len(sc.get('notes', []))} notes"
            f"{' | same image as previous' if sc.get('reuse') and i else ''} | image: {sc['image'][:220]} | says: "
            + " ".join(ln["speech"] for ln in sc["lines"])[:200]
            for n, i, sc in scenes)
        system = DIRECTOR.format(budget=budget, parallax_rule="" if parallax else "Do not use parallax in this film.\n")
        mp = llm.structured(MotionPlan, system, "SCENES\n" + listing, smart=True)
        picks = {}
        for s in mp.shots:
            key = f"{s.act}:{s.scene}"
            if not any(n == s.act and i == s.scene for n, i, _ in scenes):
                continue
            sc = docs[s.act]["scenes"][s.scene]
            m = s.motion
            if sc.get("diagram") or (sc.get("reuse") and s.scene):  # a diagram or a reused image always stays a camera move
                m = "camera"
            if m == "veo" and sum(p["motion"] == "veo" for p in picks.values()) >= budget:
                m = "parallax" if parallax else "camera"
            if m == "parallax" and not parallax:
                m = "camera"
            picks[key] = {"motion": m, "action": s.action}
    json.dump(picks, open(path, "w"), ensure_ascii=False, indent=1)
    return picks


# ---------- Veo ----------
def veo_client() -> genai.Client | None:
    """A client that can reach Veo, or None. The Vertex express key used for everything else cannot."""
    opts = types.HttpOptions(timeout=600_000)
    if settings.veo_api_key:
        return genai.Client(api_key=settings.veo_api_key, http_options=opts)
    if settings.veo_project:
        if settings.google_application_credentials:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials
        return genai.Client(vertexai=True, project=settings.veo_project, location=settings.veo_location, http_options=opts)
    return None


def animate(c: genai.Client, image: str, action: str, dst: str) -> None:
    """Image-to-video: the scene's own painted image comes alive, so style and composition match the rest of the film."""
    if os.path.exists(dst):
        return
    prompt = (f"{action}. Keep the exact look, style, colours and composition of the image; smooth, slow, cinematic motion. "
              "No text, no captions, no letters, no people speaking to camera.")
    img = types.Image(image_bytes=open(image, "rb").read(), mime_type="image/png")
    for attempt in range(6):
        try:
            # no audio: clips play muted under the narration, and video-only is half the price ($0.20 vs $0.40 a second)
            audio = False
            try:
                cfg = types.GenerateVideosConfig(aspect_ratio="16:9", duration_seconds=CLIP_SECONDS, number_of_videos=1,
                                                 resolution="1080p", generate_audio=False)
                op = c.models.generate_videos(model=settings.veo_model, prompt=prompt, image=img, config=cfg)
            except Exception as e:  # an endpoint that rejects these options: fall back to its defaults (priced with audio)
                if "resolution" not in str(e).lower() and "audio" not in str(e).lower():
                    raise
                audio = True
                cfg = types.GenerateVideosConfig(aspect_ratio="16:9", duration_seconds=CLIP_SECONDS, number_of_videos=1)
                op = c.models.generate_videos(model=settings.veo_model, prompt=prompt, image=img, config=cfg)
            while not op.done:
                time.sleep(10)
                op = c.operations.get(op)
            if op.error:
                raise RuntimeError(str(op.error)[:200])
            vids = (op.response.generated_videos if op.response else None) or []
            if not vids:
                raise RuntimeError("Veo returned no video (possibly filtered)")
            v = vids[0].video
            if not v.video_bytes:
                c.files.download(file=v)
            open(dst, "wb").write(v.video_bytes)
            import cost
            cost.video(settings.veo_model, CLIP_SECONDS, audio)
            return
        except Exception as e:
            msg = str(e)
            print("  veo retry", attempt, msg[:120])
            if "429" not in msg and "RESOURCE_EXHAUSTED" not in msg and attempt >= 1:
                raise
            time.sleep(min(180, 20 * 1.8 ** attempt))


def clip_info(clip: str) -> tuple[float, str]:
    """(duration in seconds, last frame as a png): a scene longer than its clip holds on the clip's last frame."""
    last = clip[:-4] + "-last.png"
    probe = subprocess.run([NPX, "remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip],
                           cwd=HERE, capture_output=True, text=True)
    try:
        secs = float(probe.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        secs = float(CLIP_SECONDS)
    if not os.path.exists(last):
        subprocess.run([NPX, "remotion", "ffmpeg", "-y", "-v", "error", "-sseof", "-0.15", "-i", clip, "-frames:v", "1", last],
                       cwd=HERE, capture_output=True)
    return secs, last


# ---------- parallax ----------
def lift(c, image: str, subject: str, plate: str, fg: str) -> None:
    """Two image edits of the scene's own image: a clean plate without the subject, and the subject alone (keyed out)."""
    from doc import cut_out
    base.STYLE = ""
    if not os.path.exists(plate):
        base.paint(c, f"Edit the attached image: remove {subject} completely and fill that area naturally so the background "
                      "continues seamlessly. Change nothing else: same style, colours, lighting and composition. No text.", plate, [image], lead="")
    key = fg[:-4] + "-key.png"
    if not os.path.exists(fg):
        base.paint(c, f"Edit the attached image: keep ONLY {subject}, exactly as it is (same position, size, colours and details), and "
                      "replace everything else with a perfectly flat, solid, pure green (#00FF00) background. No shadow, no text.", key, [image], lead="")
        cut_out(key, fg)
        despill(fg)


def despill(path: str) -> None:
    """Remove the green fringe the key leaves on the subject's edges: no pixel may be greener than its red/blue allow,
    and nearly-transparent edge pixels are dropped."""
    import pymupdf
    pix = pymupdf.Pixmap(path)
    if not pix.alpha:
        return
    px = bytearray(pix.samples)
    for o in range(0, len(px), 4):
        r, g, b, a = px[o], px[o + 1], px[o + 2], px[o + 3]
        if a and g > max(r, b):
            px[o + 1] = max(r, b)
            if a < 200 and g - max(r, b) > 40:  # a mostly-green edge pixel is background, not subject
                px[o + 3] = 0
    out = pymupdf.Pixmap(pymupdf.csRGB, pix.width, pix.height, bytes(px), True)
    out.save(path)
