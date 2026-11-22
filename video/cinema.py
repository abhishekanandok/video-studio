"""Cinema Studio: short cinematic AI films (about a minute), made the way a director works, one approved step at a time.

    1. story      an idea in about 20 words (who, what, where, when), expanded into a short screenplay: characters,
                  props, the film's global look, and a shot list with the narration for each shot
    2. sheets     a character sheet (studio portrait + full body front and back) and a prop sheet for each, so every
                  shot shows the same people and things
    3. frames     one keyframe per shot, painted from the sheets: the creator sees (and can repaint) every shot before
                  any video money is spent
    4. shots      each keyframe comes alive with Veo (image to video, 4 / 6 / 8 seconds); a bad shot is made again on
                  its own with a correction note, never the whole film
    5. voice      the narration, recorded with Gemini TTS, one line per shot; a shot is never shorter than its line
    6. film       the shots joined in order, each line starting with its shot (Veo's own sound kept quietly underneath)

Fictional people only: never a real or named person, never footage that could pass for a real event. Everything is kept in
public/cinema/<slug>/project.json; every step can be edited by hand in the Studio and is redone only when asked."""
from __future__ import annotations

import json
import os
import shutil as _shutil

NPX = _shutil.which("npx") or "npx"  # npx.cmd on Windows, which a bare "npx" doesn't find
import subprocess
import threading
import time
import traceback
from typing import Literal

from pydantic import BaseModel, Field

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "public", "cinema")
DURATIONS = (4, 6, 8)  # what Veo makes
WPS = 2.4  # narration words per second (about 145 a minute)
VOICES = ("Algenib", "Charon", "Kore", "Fenrir", "Puck", "Aoede", "Orus", "Leda")


# ---------- the screenplay ----------
class Character(BaseModel):
    id: str = Field(description="short slug, e.g. 'grandpa'")
    name: str = Field(description="the character's name (fictional)")
    look: str = Field(description="age, build, face, hair, skin, distinguishing features, in one or two sentences")
    wardrobe: str = Field(description="exactly what they wear in the whole film, colours and materials")
    voice: str = Field("", description="how they sound, for the actor: e.g. 'deep, hoarse, slow, Delhi Hindi accent'")


class Prop(BaseModel):
    id: str
    name: str
    look: str = Field(description="design, materials, colours, wear and size, in one or two sentences")


class Look(BaseModel):
    camera: str = Field(description="camera and lens feel, e.g. 'ARRI Alexa 35, 35mm anamorphic, natural film grain'")
    depth_of_field: str = Field(description="e.g. 'shallow, f/2.8, background soft' and why")
    lighting: str = Field(description="how many lights and from where, their quality (hard/soft) and colour, and how the background is lit")
    grade: str = Field(description="colours and contrast, e.g. 'muted, low contrast, cool shadows, warm skin'")
    handheld: str = Field(description="the camera's general feel: locked off, smooth dolly, handheld, shaky in action")


class Said(BaseModel):
    who: str = Field(description="the id of the character speaking")
    line: str = Field(description="the exact words, 3-8 words, in Hinglish written in Roman script (e.g. 'Bhaiya, card khatam ho gaya.')")


class Shot(BaseModel):
    seconds: Literal[4, 6, 8]
    type: str = Field(description="wide / medium / close-up / extreme close-up / over-the-shoulder / aerial ...")
    action: str = Field(description="exactly what happens in this shot, start to end, in one or two sentences")
    performance: str = Field("", description="what the character feels and the small physical signs of it (brow tension, a swallow, hands)")
    camera: str = Field(description="camera movement in this shot, e.g. 'slow push in', 'handheld, shaky', 'static'")
    sound: str = Field("", description="the sounds of the shot (no music), e.g. 'rain on glass, distant thunder'")
    characters: list[str] = Field(default_factory=list, description="ids of the characters in the shot")
    props: list[str] = Field(default_factory=list, description="ids of the props in the shot")
    narration: str = Field("", description="the narrator's line over this shot, or empty; it must fit the shot (about 2.4 words a second)")
    dialogue: list[Said] = Field(default_factory=list, description="what a character says ON SCREEN in this shot (usually nothing)")


class Screenplay(BaseModel):
    title: str
    logline: str = Field(description="the whole story in at most 20 words: who, what, where, when")
    where: str
    when: str = Field(description="time of day, weather and era")
    characters: list[Character]
    props: list[Prop]
    look: Look
    shots: list[Shot]


WRITER = """You are a film director planning a short cinematic AI film of about {seconds} seconds, to be generated shot by
shot with Google Veo and narrated by one voice. Think like a director:
1. STORY: a simple idea a viewer gets at once, written as a logline of at most 20 words that answers who, what, where and
   when. One clear emotional turn. A grounded, real-world story (everyday India, real places, real people's lives) unless the idea asks for fantasy or science fiction; real, physical detail so it feels real.
2. CHARACTERS AND PROPS: only what the story needs (1-3 characters, 1-4 props). ADULTS ONLY (18+; never a child, a schoolgirl or a kid: video models refuse them). FICTIONAL people only: never a real,
   famous or named real person, never a real brand or logo. Describe each precisely enough that every shot draws the same
   person (face, age, hair, build, exact clothes) and the same object.
3. GLOBAL LOOK, applied to every shot: the camera and lens, depth of field (most film shots are shallow or medium so the
   eye goes to the subject), the lighting (how many sources and from where, hard or soft, warm, neutral or cool, and how the
   background is lit, chosen for the mood), the grade (colour and contrast that carry the mood), and the camera feel.
4. SHOT BREAKDOWN: {shots} shots, each 4, 6 or 8 seconds, adding up to about {seconds} seconds. For each: the shot type,
   exactly what happens from start to end, the PERFORMANCE (what the character feels and its small physical signs: a
   tightening brow, a swallow, a hand that will not stay still; never "neutral"), the camera movement (handheld and shakier
   for speed or danger, slow and steady for calm), and the sounds (never music).
5. NARRATION: the narrator's line for each shot, at most {words} words per 8 seconds (about 2.4 words a second), or empty
   when the picture should speak alone. The lines together tell the story; the first line hooks, the last one lands.
STYLE: creative and surprising, never a cliche. Prefer bright daylight and vivid real colour unless the idea asks for night.
Wonder, wit and a twist the viewer does not see coming; show the impossible as if it were ordinary life. AVOID: rain at
night, neon-noir, a lonely sad old man in a dark room, sacrifice melodrama, characters staring silently, and narration
that explains the feeling or states the theme. Narration should be witty, specific and surprising, like a great trailer.
6. DIALOGUE: characters may speak on screen 2-4 short lines in the whole film (3-8 words each), in natural Hinglish (Delhi
   Hindi with English words, Roman script), only in medium or side shots (not big close-ups), and never in a shot that also
   has narration. Give each character a voice description.
Keep it filmable: one location or two, simple actions Veo can show (no crowds of named people, no text on screen, no
complicated fights)."""


class Fix(BaseModel):
    action: str
    performance: str
    camera: str


# ---------- the project ----------
def path(slug: str, *parts: str) -> str:
    return os.path.join(ROOT, slug, *parts)


def rel(slug: str, name: str) -> str:
    return f"cinema/{slug}/{name}"


LOCK = threading.Lock()


def load(slug: str) -> dict:
    with LOCK:
        return json.load(open(path(slug, "project.json")))


def save(slug: str, p: dict) -> None:
    with LOCK:
        tmp = path(slug, "project.json.tmp")
        json.dump(p, open(tmp, "w"), indent=1, ensure_ascii=False)
        os.replace(tmp, path(slug, "project.json"))


def update(slug: str, **kw) -> dict:
    p = load(slug)
    p.update(kw)
    save(slug, p)
    return p


def log(slug: str, msg: str, busy: str | None = "keep") -> None:
    p = load(slug)
    p.setdefault("log", []).append({"at": time.strftime("%H:%M:%S"), "msg": msg})
    p["log"] = p["log"][-200:]
    if busy != "keep":
        p["busy"] = busy
    save(slug, p)
    print(f"[{slug}] {msg}", flush=True)


def create(idea: str, seconds: int = 60, voice: str = "Algenib", sound: bool = True) -> str:
    slug = "c" + time.strftime("%m%d-%H%M%S")
    os.makedirs(path(slug), exist_ok=True)
    save(slug, {"slug": slug, "idea": idea.strip(), "seconds": seconds, "voice": voice if voice in VOICES else "Algenib",
                "veo_sound": sound, "created": time.strftime("%Y-%m-%d %H:%M"), "busy": None, "log": [],
                "story": None, "characters": [], "props": [], "look": None, "shots": [], "film": None})
    return slug


def projects() -> list[dict]:
    if not os.path.isdir(ROOT):
        return []
    out = []
    for s in sorted(os.listdir(ROOT), reverse=True):
        if os.path.exists(path(s, "project.json")):
            p = load(s)
            out.append({"slug": s, "title": (p.get("story") or {}).get("title") or p["idea"][:60], "idea": p["idea"],
                        "created": p["created"], "shots": len(p["shots"]), "made": sum(1 for x in p["shots"] if x.get("clip")),
                        "film": p.get("film"), "busy": p.get("busy"), "poster": next((x.get("frame") for x in p["shots"] if x.get("frame")), None)})
    return out


# ---------- running steps in the background ----------
STEPS = {}  # name -> function, filled in at the end


def run(slug: str, name: str, arg: str = "") -> None:
    """One step at a time per film, as its own process (a server restart never kills it; its spend is counted in the
    film's own cost.json); progress and any failure go to the film's log."""
    import sys
    p = load(slug)
    if p.get("busy") and alive(p.get("pid")):
        raise RuntimeError(f"busy: {p['busy']}")
    logf = open(path(slug, "steps.log"), "a")
    proc = subprocess.Popen([sys.executable, "-u", os.path.join(HERE, "cinema.py"), slug, name, arg],
                            cwd=os.path.join(HERE, "..", "backend"),  # where its settings (.env) are
                            stdout=logf, stderr=subprocess.STDOUT, start_new_session=True)
    from app import procs
    procs.keep_awake(proc.pid)  # the Mac stays awake while a step runs
    p = load(slug)
    p["busy"], p["pid"] = name, proc.pid
    save(slug, p)


def alive(pid) -> bool:
    from app import procs
    return procs.alive(pid)


def main() -> None:
    import sys
    sys.path.insert(0, os.path.join(HERE, "..", "backend"))
    slug, name, arg = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else "")
    import cost
    cost.start(path(slug))
    cost.stage(name)
    try:
        fn = STEPS[name]
        fn(slug, int(arg)) if arg.isdigit() else fn(slug, arg) if arg else fn(slug)
        log(slug, f"{name}: done", busy=None)
    except Exception as e:
        traceback.print_exc()
        log(slug, f"{name} stopped: {str(e)[:240]}", busy=None)


def llm():
    from app.llm import get_llm
    return get_llm()


def gclient():
    import pipeline
    return pipeline.client()


# ---------- 1. story ----------
def write_story(slug: str) -> None:
    p = load(slug)
    seconds = p["seconds"]
    shots = max(4, round(seconds / 7))
    log(slug, f"Writing the screenplay: {shots} shots, about {seconds} seconds")
    sp = llm().structured(Screenplay, WRITER.format(seconds=seconds, shots=shots, words=19),
                          f"THE IDEA:\n{p['idea']}", smart=True)
    d = sp.model_dump()
    p = load(slug)
    p["story"] = {k: d[k] for k in ("title", "logline", "where", "when")}
    p["characters"], p["props"], p["look"] = d["characters"], d["props"], d["look"]
    for i, ch in enumerate(p["characters"]):  # a fixed Gemini voice for each character's on-screen lines
        ch.setdefault("tts", ["Charon", "Leda", "Puck", "Kore"][i % 4])
    p["shots"] = [{**s, "n": i + 1} for i, s in enumerate(d["shots"])]
    save(slug, p)
    log(slug, f"Screenplay: \"{sp.title}\", {len(sp.shots)} shots, {sum(s.seconds for s in sp.shots)} s")


# ---------- 2. character and prop sheets ----------
REAL_LOOK = ("Photorealistic cinematic still, real skin texture and pores, natural imperfections, real fabric folds, shot on a "
             "cinema camera, no illustration, no CGI look, no text, no watermark, no logo")


def paint(prompt: str, dst: str, refs: list[str] | None = None, aspect: str = "16:9") -> None:
    """One picture with Gemini's image model (references keep a character the same), retried through quotas."""
    from google.genai import types
    from app.config import settings
    from app.llm import transient, wait_before_retry
    c = gclient()
    parts = [types.Part.from_bytes(data=open(r, "rb").read(), mime_type="image/png") for r in refs or []]
    parts.append(types.Part(text=prompt))
    attempt, hard = -1, 0
    while hard < 4:
        attempt += 1
        try:
            r = c.models.generate_content(model=settings.gemini_image_model, contents=types.Content(role="user", parts=parts),
                                          config=types.GenerateContentConfig(response_modalities=["IMAGE"],
                                                                             image_config=types.ImageConfig(aspect_ratio=aspect)))
            import cost
            cost.tokens(settings.gemini_image_model, getattr(r, "usage_metadata", None))
            for part in r.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    _png(part.inline_data.data, dst)
                    return
            hard += 1
        except Exception as e:
            if not transient(e):
                hard += 1
            time.sleep(wait_before_retry(e, attempt) if transient(e) else 10)
    raise RuntimeError(f"no picture for: {prompt[:80]}")


def _png(data: bytes, dst: str) -> None:
    from io import BytesIO
    from PIL import Image
    Image.open(BytesIO(data)).convert("RGB").save(dst, "PNG")


def sheet(images: list[str], dst: str) -> None:
    """Side by side on white, each scaled to the same height (the sheet Veo and the keyframes refer to)."""
    from PIL import Image
    ims = [Image.open(x).convert("RGB") for x in images]
    h = 1024
    ims = [im.resize((round(im.width * h / im.height), h)) for im in ims]
    gap = 24
    out = Image.new("RGB", (sum(im.width for im in ims) + gap * (len(ims) + 1), h + 2 * gap), "white")
    x = gap
    for im in ims:
        out.paste(im, (x, gap))
        x += im.width + gap
    out.save(dst, "PNG")


def make_sheets(slug: str, only: str | None = None) -> None:
    p = load(slug)
    look = p["look"] or {}
    for kind in ("characters", "props"):
        for i, x in enumerate(p[kind]):
            if only and x["id"] != only:
                continue
            base = path(slug, f"{kind[:4]}-{x['id']}")
            if only:  # asked again: paint it fresh
                for suf in ("-portrait.png", "-front.png", "-back.png", "-sheet.png"):
                    if os.path.exists(base + suf):
                        os.remove(base + suf)
            if kind == "characters":
                who = f"{x['look']}. Wearing {x['wardrobe']}"
                log(slug, f"Character sheet: {x['name']}")
                portrait = base + "-portrait.png"
                if not os.path.exists(portrait):
                    paint(f"Studio portrait, head and shoulders, of a fictional person: {who}. Soft key light, plain light-grey "
                          f"seamless backdrop, looking at camera. {REAL_LOOK}", portrait, aspect="4:3")
                for side, pose in (("front", "standing straight facing the camera, arms relaxed"), ("back", "standing straight, seen from directly behind")):
                    f = base + f"-{side}.png"
                    if not os.path.exists(f):
                        paint(f"Full body, head to toe, of exactly the person in the attached portrait (same face, hair, age and "
                              f"build), {pose}, wearing {x['wardrobe']}. Plain light-grey seamless studio backdrop, even soft light. {REAL_LOOK}",
                              f, refs=[portrait], aspect="9:16")
                sheet([portrait, base + "-front.png", base + "-back.png"], base + "-sheet.png")
            else:
                log(slug, f"Prop sheet: {x['name']}")
                f = base + "-front.png"
                if not os.path.exists(f):
                    paint(f"Product photo of one {x['name']}: {x['look']}. Three views side by side on a plain light-grey studio "
                          f"backdrop: front, side and three-quarter. Even soft light, real materials and wear. {REAL_LOOK}", f)
                sheet([f], base + "-sheet.png")
            p = load(slug)
            p[kind][i]["sheet"] = rel(slug, os.path.basename(base + "-sheet.png"))
            save(slug, p)


# ---------- 3. keyframes ----------
def shot_prompt(p: dict, s: dict, still: bool) -> str:
    """Everything one shot needs, in the order a director briefs: story, who and what is in it, the global look, the shot."""
    st, lk = p["story"] or {}, p["look"] or {}
    chars = [c for c in p["characters"] if c["id"] in s.get("characters", [])]
    props = [x for x in p["props"] if x["id"] in s.get("props", [])]
    refs = "; ".join([f"{c['name']}: {c['look']}, wearing {c['wardrobe']}" for c in chars] + [f"the {x['name']}: {x['look']}" for x in props])
    parts = [f"STORY: {st.get('logline', '')} Location: {st.get('where', '')}. {st.get('when', '')}."]
    if refs:
        parts.append(f"IN THIS SHOT (match the attached reference sheets exactly): {refs}.")
    parts.append(f"LOOK: {lk.get('camera', '')}. Depth of field: {lk.get('depth_of_field', '')}. Lighting: {lk.get('lighting', '')}. "
                 f"Grade: {lk.get('grade', '')}.")
    if still:
        parts.append(f"FRAME: the first moment of a {s['type']} shot: {s['action']} {s.get('performance', '')}")
        parts.append("A single photorealistic film frame, 16:9. " + REAL_LOOK)
    else:
        parts.append(f"SHOT ({s['seconds']} seconds, {s['type']}): {s['action']} Performance: {s.get('performance', '')} "
                     f"Camera: {s['camera']}; overall camera feel: {lk.get('handheld', '')}.")
        if s.get("fix"):
            parts.append(f"CORRECTION FROM THE DIRECTOR (must be followed): {s['fix']}")
        said = [(next((c for c in p["characters"] if c["id"] == d["who"]), None), d["line"]) for d in s.get("dialogue") or []]
        said = [(c, line) for c, line in said if c]
        if said:
            parts.append("DIALOGUE (spoken on screen, lips in sync, only these exact words, nothing else said): " + " ".join(
                f'{c["name"]} says, in Hinglish with an Indian accent{", " + c["voice"] if c.get("voice") else ""}: "{line}"' for c, line in said))
        parts.append(f"SOUND: {s.get('sound') or 'natural ambience'}. No music. {'' if said else 'No dialogue. '}No voice-over, no on-screen text.")
        parts.append("Photorealistic, real physics: hair, clothes and loose things move with wind and motion; consistent faces and objects.")
    return "\n".join(parts)


def make_frames(slug: str, only: int | None = None) -> None:
    p = load(slug)
    for k, s in enumerate(p["shots"]):
        if only is not None and s["n"] != only:
            continue
        dst = path(slug, f"shot{s['n']:02d}-frame.png")
        if only is not None and os.path.exists(dst):
            os.remove(dst)
        if os.path.exists(dst):
            continue
        log(slug, f"Keyframe: shot {s['n']} ({s['type']})")
        refs = [path(slug, os.path.basename(x["sheet"])) for x in p["characters"] + p["props"]
                if x.get("sheet") and x["id"] in s.get("characters", []) + s.get("props", [])][:3]
        paint(shot_prompt(p, s, still=True), dst, refs=refs)
        p = load(slug)
        p["shots"][k]["frame"] = rel(slug, os.path.basename(dst)) + f"?v={int(time.time())}"
        p["shots"][k].pop("clip", None)  # a new frame means the old video no longer matches it
        save(slug, p)


# ---------- 4. shots (Veo) ----------
def make_shots(slug: str, only: int | None = None) -> None:
    from google.genai import types
    from app.config import settings
    import motion
    c = motion.veo_client()
    if not c:
        raise RuntimeError("Veo is not set up (VEO_PROJECT / service account)")
    p = load(slug)
    for k, s in enumerate(p["shots"]):
        if only is not None and s["n"] != only:
            continue
        frame = path(slug, f"shot{s['n']:02d}-frame.png")
        if not os.path.exists(frame):
            raise RuntimeError(f"shot {s['n']} has no keyframe yet")
        if only is None and s.get("clip"):
            continue
        take = len(s.get("takes", [])) + 1
        dst = path(slug, f"shot{s['n']:02d}-take{take}.mp4")
        log(slug, f"Veo: shot {s['n']}, take {take} ({s['seconds']} s){' with your correction' if s.get('fix') else ''}")
        cfg = types.GenerateVideosConfig(aspect_ratio="16:9", duration_seconds=s["seconds"], number_of_videos=1,
                                         resolution="1080p", generate_audio=bool(p.get("veo_sound")), person_generation="allow_adult",
                                         negative_prompt="text, subtitles, captions, watermark, logo, music, cartoon, CGI, distorted faces, extra fingers")
        img = types.Image(image_bytes=open(frame, "rb").read(), mime_type="image/png")
        op = None
        for attempt in range(12):
            try:
                op = c.models.generate_videos(model=settings.veo_model, prompt=shot_prompt(p, s, still=False), image=img, config=cfg)
                break
            except Exception as e:
                if "429" not in str(e) and "RESOURCE_EXHAUSTED" not in str(e) and attempt >= 1:
                    raise
                log(slug, f"Veo busy ({str(e)[:60]}); trying again")
                time.sleep(min(180, 20 * 1.6 ** attempt))
        while not op.done:
            time.sleep(10)
            op = c.operations.get(op)
        if op.error:
            raise RuntimeError(f"shot {s['n']}: {str(op.error)[:200]}")
        vids = (op.response.generated_videos if op.response else None) or []
        if not vids:  # blocked by Veo's safety filter (not billed): say why, and go on with the other shots
            why = ", ".join(getattr(op.response, "rai_media_filtered_reasons", None) or []) if op.response else ""
            log(slug, f"Shot {s['n']}: Veo's safety filter blocked it{': ' + why[:160] if why else ''}. Change its wording and make it again")
            continue
        v = vids[0].video
        if not v.video_bytes:
            c.files.download(file=v)
        open(dst, "wb").write(v.video_bytes)
        import cost
        cost.video(settings.veo_model, s["seconds"], bool(p.get("veo_sound")))
        p = load(slug)
        sh = p["shots"][k]
        take_info = {"clip": rel(slug, os.path.basename(dst)), "fix": sh.get("fix", ""), "at": time.strftime("%H:%M")}
        sh.setdefault("takes", []).append(take_info)
        sh["clip"] = take_info["clip"]
        save(slug, p)
        if sh.get("dialogue"):
            check_words(slug, k, dst)  # did Veo say our words? (kept with the take; a wrong one can be retaken)
            if p.get("dub"):  # optional: our own Gemini voices on Veo's lips (off: Veo's own voices sound best)
                dub(slug, k, dst)


# ---------- dialogue: our own voices on Veo's lips ----------
class Heard(BaseModel):
    words: list[str] = Field(description="every word spoken, in order, as heard")
    starts: list[float] = Field(description="when each word starts, seconds from the start of the clip")
    ends: list[float] = Field(description="when each word ends, seconds")


def _wav(src: str, dst: str) -> None:
    ff("-i", src, "-vn", "-ac", "1", "-ar", "24000", dst)


def _dur(wav: str) -> float:
    import wave
    with wave.open(wav) as w:
        return w.getnframes() / w.getframerate()


def _trim(src: str, dst: str) -> None:
    """A recorded line without its silence at either end, at a clear, even level (peaks at about -1.5 dB)."""
    import wave
    import numpy as np
    with wave.open(src) as w:
        rate, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    loud = np.flatnonzero(np.abs(x) > 0.02 * max(1.0, np.abs(x).max()))
    if len(loud):
        x = x[max(0, loud[0] - int(0.03 * rate)):loud[-1] + int(0.08 * rate)]
    x = x * (0.84 * 32767 / max(1.0, np.abs(x).max()))
    with wave.open(dst, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(x.astype(np.int16).tobytes())


def _frames(wav: str, hop_s: float = 0.05):
    import wave
    import numpy as np
    with wave.open(wav) as w:
        rate = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    hop = int(rate * hop_s)
    return np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)]), hop_s


def _bursts(wav: str, gap: float, clean: bool = False) -> list[tuple[float, float]]:
    """Spans of speech: frames well above the quiet floor, joined across gaps shorter than `gap`, tiny blips dropped."""
    import numpy as np
    rms, hop = _frames(wav)
    if not len(rms):
        return []
    floor = np.percentile(rms, 30)
    loud = rms > (0.07 * rms.max() if clean else max(2.5 * floor, 0.12 * rms.max()))  # a clean recording has no floor
    out, start = [], None
    for i, on in enumerate(list(loud) + [False]):
        if on and start is None:
            start = i
        if not on and start is not None:
            out.append([start * hop, i * hop])
            start = None
    merged = []
    for a, b in out:
        if merged and a - merged[-1][1] < gap:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    return [(a, b) for a, b in merged if b - a >= 0.12]


def _group(spans: list[tuple[float, float]], k: int) -> list[tuple[float, float]]:
    """Join neighbouring spans across the smallest gaps until there are k (the phrases of both recordings line up)."""
    spans = [list(x) for x in spans]
    while len(spans) > k:
        i = min(range(len(spans) - 1), key=lambda j: spans[j + 1][0] - spans[j][1])
        spans[i][1] = spans[i + 1][1]
        del spans[i + 1]
    return [tuple(x) for x in spans]


def _quietest(wav: str, bursts: list, total: float) -> tuple[float, float]:
    """The longest stretch with no speech (the shot's own ambience), as (start, length)."""
    gaps, t = [], 0.0
    for a, b in bursts:
        gaps.append((t, a - t))
        t = b
    gaps.append((t, total - t))
    at, length = max(gaps, key=lambda g: g[1])
    return (at + 0.1, max(0.0, length - 0.2))


def _trim_join(wavs: list[str], dst: str) -> None:
    """Several recorded lines, each without its end silences, joined with a natural breath between them, at one level."""
    import wave
    import numpy as np
    chunks, rate = [], 24000
    for src in wavs:
        tmp = src[:-4] + "-trim.wav"
        _trim(src, tmp)
        with wave.open(tmp) as w:
            rate = w.getframerate()
            chunks.append(np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16))
        chunks.append(np.zeros(int(0.35 * rate), dtype=np.int16))
    with wave.open(dst, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(np.concatenate(chunks[:-1]).tobytes())


def _room(src: str, dst: str, a: float, b: float, amb_at: float, amb_len: float) -> None:
    """The shot's sound with the span [a, b] (Veo's voice) replaced by the shot's own ambience, looped with soft joins;
    with too little clean ambience, the voice span is just turned well down."""
    import wave
    import numpy as np
    with wave.open(src) as w:
        rate = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    ia, ib = int(a * rate), min(len(x), int(b * rate))
    y = x.copy()
    if amb_len >= 0.5:
        amb = x[int(amb_at * rate):int((amb_at + amb_len) * rate)]
        fill = np.tile(amb, (ib - ia) // max(1, len(amb)) + 2)[:ib - ia]
        fade = min(int(0.08 * rate), (ib - ia) // 2)
        ramp = np.linspace(0, 1, fade) if fade else np.array([])
        y[ia:ib] = fill
        if fade:
            y[ia:ia + fade] = x[ia:ia + fade] * (1 - ramp) + fill[:fade] * ramp
            y[ib - fade:ib] = fill[-fade:] * (1 - ramp) + x[ib - fade:ib] * ramp
    else:
        y[ia:ib] *= 0.12
    with wave.open(dst, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes())


def check_words(slug: str, k: int, clip: str) -> None:
    """What Veo's character actually said, against the script's words."""
    import difflib
    import re
    from google.genai import types
    from app.config import settings
    p = load(slug)
    sh = p["shots"][k]
    said = " ".join(d["line"] for d in sh["dialogue"])
    wav = clip[:-4] + "-veo.wav"
    _wav(clip, wav)
    r = gclient().models.generate_content(
        model=settings.gemini_model,
        contents=[types.Part.from_bytes(data=open(wav, "rb").read(), mime_type="audio/wav"),
                  f"Write down exactly the words spoken in this clip (it should be close to: \"{said}\"). Only the words."])
    heard = (r.text or "").strip().strip('"')
    norm = lambda t: re.sub(r"[^a-z0-9 ]", "", t.lower()).split()
    match = difflib.SequenceMatcher(None, norm(said), norm(heard)).ratio()
    p = load(slug)
    p["shots"][k]["takes"][-1].update(heard=heard, match=round(match, 2))
    save(slug, p)
    log(slug, f"Shot {sh['n']}: Veo said \"{heard}\" ({match:.0%} of the script's words)")


def redub(slug: str, n: int) -> None:
    """Dub a shot's latest take again (after its lines or voices changed), with no new Veo take."""
    p = load(slug)
    k = next(i for i, s in enumerate(p["shots"]) if s["n"] == n)
    take = p["shots"][k]["takes"][-1]
    dub(slug, k, os.path.join(HERE, "public", take["clip"]))


def dub(slug: str, k: int, clip: str) -> None:
    """Veo acted the line; Gemini TTS says the exact words in the character's fixed voice, stretched word by word onto the
    moments Veo's lips say them; Veo's voice is replaced by the shot's own background sound. The word check (did Veo
    say our words?) is kept with the take, so a wrong take can be retaken."""
    import difflib
    import re
    import doc
    from google.genai import types
    from app.config import settings
    p = load(slug)
    sh = p["shots"][k]
    lines = sh["dialogue"]
    base = clip[:-4]
    veo_wav = base + "-veo.wav"
    _wav(clip, veo_wav)
    log(slug, f"Dialogue: listening to shot {sh['n']}")
    said = " ".join(d["line"] for d in lines)
    c = gclient()
    r = c.models.generate_content(
        model=settings.gemini_model,
        contents=[types.Part.from_bytes(data=open(veo_wav, "rb").read(), mime_type="audio/wav"),
                  f"Transcribe the speech in this clip word by word (it should be close to: \"{said}\"), with when each word "
                  "starts and ends in seconds (two decimals). Ignore background sounds."],
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=Heard))
    heard = Heard.model_validate_json(r.text)
    norm = lambda t: re.sub(r"[^a-z0-9 ]", "", t.lower()).split()
    match = difflib.SequenceMatcher(None, norm(said), norm(" ".join(heard.words))).ratio()
    p = load(slug)
    take = p["shots"][k]["takes"][-1]
    take.update(heard=" ".join(heard.words), match=round(match, 2))
    save(slug, p)
    if not heard.words or not heard.starts:
        log(slug, f"Shot {sh['n']}: no speech heard in Veo's take; keeping its own sound")
        return
    if match < 0.75:
        log(slug, f"Shot {sh['n']}: Veo said \"{' '.join(heard.words)}\" ({match:.0%} of our words); dubbing anyway, retake if the lips look wrong")
    # our voice, the exact words
    parts, cursor = [], 0
    starts, ends = heard.starts, heard.ends or heard.starts[1:] + [heard.starts[-1] + 0.4]
    for d in lines:
        ch = next(c_ for c_ in p["characters"] if c_["id"] == d["who"])
        import hashlib
        tts = base + f"-{d['who']}-{hashlib.sha1((d['line'] + (ch.get('tts') or '')).encode()).hexdigest()[:8]}.wav"
        doc.speak(c, {"name": ch["name"]}, ch.get("tts") or "Charon", d["line"], "", tts, "Hinglish", "normal", "Indian")
        n = len(d["line"].split())
        w0, w1 = cursor, min(len(starts), cursor + n) - 1
        cursor += n
        if w0 >= len(starts):
            break
        parts.append((tts, d["line"], starts[w0], ends[min(w1, len(ends) - 1)]))
    # where Veo's character really speaks, measured in the sound (Gemini's timestamps are only roughly right), and our
    # recording split at its own pauses (never inside a word): each phrase starts exactly when the lips start it
    veo_bursts = _bursts(veo_wav, gap=0.25)
    lo, hi = min(starts) - 0.8, max(ends) + 0.8  # sounds far outside what Gemini heard as speech are effects, not words
    veo_bursts = [x for x in veo_bursts if x[1] >= lo and x[0] <= hi]
    clean = base + "-ours.wav"
    _trim_join([t for t, *_ in parts], clean)
    ours = _bursts(clean, gap=0.08, clean=True)
    if not veo_bursts or not ours:
        log(slug, f"Shot {sh['n']}: could not find the speech in the sound; keeping Veo's own voice")
        return
    phrases = min(len(veo_bursts), len(ours))
    veo_g, our_g = _group(veo_bursts, phrases), _group(ours, phrases)
    pieces = []
    for i, ((va, vb), (oa, ob)) in enumerate(zip(veo_g, our_g)):
        a_, b_ = max(0.0, oa - 0.04), ob + 0.06
        tempo = max(0.95, min(1.15, (b_ - a_) / max(0.2, vb - va + 0.1)))
        w = base + f"-phrase{i}.wav"
        ff("-i", clean, "-ss", f"{a_:.3f}", "-t", f"{b_ - a_:.3f}", "-af", f"atempo={tempo:.3f}", "-ar", "24000", w)
        pieces.append((w, max(0.0, va - 0.04)))
    # Veo's voice cut out over the whole measured span, filled with the shot's quietest stretch of its own ambience
    span_a, span_b = max(0.0, veo_bursts[0][0] - 0.1), min(sh["seconds"], veo_bursts[-1][1] + 0.25)
    room = base + "-room.wav"
    quiet = _quietest(veo_wav, veo_bursts, sh["seconds"])
    _room(veo_wav, room, span_a, span_b, *quiet)
    inputs, mix = ["-i", room], "[0:a]volume=0.55[bed];"
    for i, (w, at) in enumerate(pieces):
        inputs += ["-i", w]
        mix += f"[{i + 1}:a]adelay={int(at * 1000)}|{int(at * 1000)}[d{i}];"
    mix += "[bed]" + "".join(f"[d{i}]" for i in range(len(pieces))) + f"amix=inputs={len(pieces) + 1}:duration=first:normalize=0[o]"
    mixed = base + "-dub.wav"
    ff(*inputs, "-filter_complex", mix, "-map", "[o]", mixed)
    out = base + "-dub.mp4"
    ff("-i", clip, "-i", mixed, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", out)
    p = load(slug)
    sh = p["shots"][k]
    sh["takes"][-1]["dub"] = rel(slug, os.path.basename(out))
    sh["clip"] = rel(slug, os.path.basename(out))
    save(slug, p)
    log(slug, f"Dialogue: shot {sh['n']} dubbed in our voices ({match:.0%} of the words matched Veo's lips)")


def fix_shot(slug: str, n: int, note: str) -> None:
    """The director's correction for one shot: kept with the shot and sent to Veo with the next take."""
    p = load(slug)
    for s in p["shots"]:
        if s["n"] == n:
            s["fix"] = note.strip()
    save(slug, p)


# ---------- 5. voice ----------
def make_voice(slug: str) -> None:
    import doc
    p = load(slug)
    c = gclient()
    role = {"name": "Narrator", "voice": p["voice"]}
    for k, s in enumerate(p["shots"]):
        line = (s.get("narration") or "").strip()
        import hashlib
        dst = path(slug, f"shot{s['n']:02d}-vo-{p['voice']}-{hashlib.sha1(line.encode()).hexdigest()[:8]}.wav")
        if not line:
            p["shots"][k].pop("vo", None)
            continue
        if not os.path.exists(dst):
            log(slug, f"Voice: shot {s['n']}")
        secs = doc.speak(c, role, p["voice"], line, "", dst, "English", "normal", "Indian")
        p = load(slug)
        sh = p["shots"][k]
        sh["vo"], sh["vo_seconds"] = rel(slug, os.path.basename(dst)), round(secs, 2)
        if secs + 0.6 > sh["seconds"]:  # a shot never ends before its line: the next length Veo makes, or a warning
            longer = next((d for d in DURATIONS if d >= secs + 0.6), None)
            if longer and not sh.get("clip"):
                sh["seconds"] = longer
            elif not longer:
                sh["warn"] = f"the line takes {secs:.1f} s, longer than the 8 s a shot can be: shorten it"
        save(slug, p)


# ---------- 6. the film ----------
def ff(*args: str) -> None:
    r = subprocess.run([NPX, "remotion", "ffmpeg", "-y", "-v", "error", *args], cwd=HERE, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-400:])


def make_film(slug: str) -> None:
    """Every shot at its planned length (held on its last frame if the clip is short), its line starting 0.3 s in, Veo's
    own sound kept underneath at a third, joined in order."""
    p = load(slug)
    missing = [s["n"] for s in p["shots"] if not s.get("clip")]
    if missing:
        raise RuntimeError(f"shots without video yet: {missing}")
    parts = []
    for s in p["shots"]:
        clip = os.path.join(HERE, "public", s["clip"])
        part = path(slug, f"part{s['n']:02d}.mp4")
        dur = str(s["seconds"])
        has_audio = bool(p.get("veo_sound"))
        inputs = ["-i", clip]
        vo = os.path.join(HERE, "public", s["vo"]) if s.get("vo") else None
        if vo:
            inputs += ["-i", vo]
        bed = "[0:a]volume=0.33[bed]" if has_audio else f"anullsrc=r=48000:cl=stereo,atrim=0:{dur}[bed]"
        if vo:
            mix = f"{bed};[1:a]adelay=300|300,aresample=48000[v];[bed][v]amix=inputs=2:duration=longest:normalize=0,atrim=0:{dur}[a]"
        else:
            mix = f"{bed};[bed]atrim=0:{dur}[a]"
        ff(*inputs, "-filter_complex", f"[0:v]scale=1920:1080,tpad=stop_mode=clone:stop_duration={dur},trim=0:{dur},setpts=PTS-STARTPTS,fps=24[v0];{mix}",
           "-map", "[v0]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-ar", "48000", part)
        parts.append(part)
    lst = path(slug, "parts.txt")
    open(lst, "w").write("".join(f"file '{x}'\n" for x in parts))
    out_dir = os.path.join(HERE, "out")
    name = f"cinema-{slug}.mp4"
    ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", os.path.join(out_dir, name))
    update(slug, film=name, film_at=time.strftime("%Y-%m-%d %H:%M"))


def estimate(p: dict) -> dict:
    """What the expensive steps will cost (Vertex list prices), so nothing is spent by surprise."""
    secs = sum(s["seconds"] for s in p["shots"])
    rate = 0.40 if p.get("veo_sound") else 0.20
    return {"seconds": secs, "veo_usd": round(secs * rate, 2), "veo_rate": rate,
            "frames_usd": round(0.04 * len(p["shots"]), 2), "sheets_usd": round(0.04 * (3 * len(p["characters"]) + len(p["props"])), 2)}


STEPS.update(dub=redub, story=write_story, sheets=make_sheets, frames=make_frames, shots=make_shots, voice=make_voice, film=make_film)

if __name__ == "__main__":
    main()
