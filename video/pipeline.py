"""Lesson -> animated story episode.

    lesson + PYQs ─► screenplay (Gemini) ─► cast sheet (image) ─► scene art (image, cast as reference)
                                        └─► every line spoken (Gemini TTS, one voice per character)
                                                               └─► props.json ─► Remotion render (animated diagrams)

Run from backend/:  .venv/bin/python ../video/pipeline.py --lesson 1 --minutes 3 --out ep1
Re-running reuses finished art/audio, so a failed step can simply be run again.
"""

import argparse
import json
import os
import sys
import time
import wave
from concurrent.futures import ThreadPoolExecutor
from typing import Literal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from google import genai  # noqa: E402
from google.genai import types  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.config import settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.llm import get_llm  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
TTS_MODEL = "gemini-3.8-flash-tts"  # stable only (user, 2026-10-03)
RATE = 24000

CAST = {
    "Narrator": {"voice": "Charon", "style": "a calm, deep documentary narrator, unhurried, with a sense of wonder"},
    "Ravi": {"voice": "Puck", "style": "a 23-year-old BPSC aspirant from Patna, tired but curious, speaks fast when excited"},
    "Meera": {"voice": "Aoede", "style": "a sharp 22-year-old RRB JE aspirant from Gaya, sceptical, asks pointed questions"},
    "Setu": {"voice": "Fenrir", "style": "a small wise brass robot guide, warm, playful, patient, a teacher who loves a good analogy"},
}
LOOKS = """Ravi: 23, Indian, lean, messy black hair, round glasses, faded maroon hoodie, jeans, a worn backpack.
Meera: 22, Indian, long braid, mustard-yellow kurta over jeans, a canvas sling bag full of notes, sharp eyes.
Setu: a small floating brass robot the size of a football, one big round lens-eye that glows warm red, two stubby arms,
  a tiny antenna, riveted body.
Jaalnagar (the world): a hand-painted city where roads are thick glowing cables, buildings are giant old computers and
  servers, and data travels as tiny folded paper birds carrying envelopes."""
STYLE = ("2D animated film still, soft cel-shaded cartoon with hand-painted backgrounds, warm off-white paper texture, "
         "muted palette of cream, ink black and grey with ONE vivid red accent, cinematic 16:9 composition, "
         "expressive characters, no text, no letters, no watermark")

DIAGRAMS = Literal["none", "network", "protocol", "topology_meaning", "bus", "bus_failure", "ring", "ring_failure",
                   "star", "star_failure", "mesh", "tree", "hybrid", "recap"]


class Line(BaseModel):
    speaker: Literal["Narrator", "Ravi", "Meera", "Setu"]
    speech: str = Field(description="What is spoken: natural Hinglish, Hindi in Devanagari with English technical terms in Latin script")
    subtitle: str = Field(description="The same line in Roman-script Hinglish for on-screen subtitles")
    delivery: str = Field(description="How to say it, e.g. 'whispering, awed' or 'laughing' (English)")


class Scene(BaseModel):
    title: str = Field(description="Short English scene name")
    art: str = Field(description="English image prompt for the background art: place, characters present, action, mood, camera")
    diagram: DIAGRAMS = Field(description="Animated diagram overlaid on this scene, or none")
    caption: str = Field(description="The one exam fact of this scene in English, max 12 words, shown on screen ('' if none)")
    lines: list[Line]


class Screenplay(BaseModel):
    episode_title: str
    tagline: str
    scenes: list[Scene]


SCREENWRITER = f"""You are the screenwriter of an animated documentary-drama that teaches Indian competitive-exam aspirants
(RRB JE, SSC JE, BPSC TRE / Computer Teacher, IBPS SO IT) computer networks through a story.

WORLD AND CAST (original; never reference any existing cartoon, film or franchise):
{LOOKS}
Narrator: an unseen documentary voice.
Premise: Ravi fell asleep over his networking notes after failing another mock. He woke up in Jaalnagar. Meera, stuck on
the same chapter for her exam, landed there the same night. Setu, the city's guide, needs them: tonight is the festival
of lights, and the Grand Bank of Jaalnagar is collapsing because its network is wired wrong. To save it they must learn
exactly what the exam asks. Their exam and the city's crisis are the same problem.

HOW TO WRITE
- Every fact in the lesson and every PYQ must land INSIDE the story, as a consequence the characters feel: the bank goes
  dark because a single cable snapped, a teller is stranded because the ring broke. Facts are discovered, not lectured.
- Setu explains with analogies; Meera cross-questions like an examiner ("toh exam mein agar Disk option aaye?"); Ravi
  gets things wrong the way students do and then gets them right. The Narrator connects scenes and states the fact
  plainly at the moment of impact.
- Each PYQ appears as a moment: Meera or Setu asks it, a character is tempted by the trap option, the right answer and
  its reason follow.
- Language: natural spoken Hinglish, like a great coaching teacher. English for every technical term.
- Short lines (max ~25 words each), lively back-and-forth, a real emotional arc, a cliffhanger at the end.
- Pick the diagram for each scene from the allowed list so the concept is animated while it is discussed.
- art prompts: describe place, which characters, what they are doing, mood and camera; keep the cast consistent."""


def pcm_of(data: bytes) -> bytes:
    """Raw 16-bit PCM from a TTS reply. gemini-3.8-flash-tts returns a whole WAV file (header + audio + a C2PA provenance
    chunk at the end) instead of bare PCM; written into our own WAV as is, the header played as a click at the start of
    every line and the metadata as a "chhrrr" burst at the end. Only the 'data' chunk is audio."""
    if not data.startswith(b"RIFF") or data[8:12] != b"WAVE":
        return data
    import struct
    at = 12
    while at + 8 <= len(data):
        cid, size = data[at:at + 4], struct.unpack("<I", data[at + 4:at + 8])[0]
        if cid == b"data":
            return data[at + 8:at + 8 + size]
        at += 8 + size + (size & 1)
    return data[44:]


def _wav(path: str, pcm: bytes) -> float:
    pcm = pcm_of(pcm)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm)
    return len(pcm) / (RATE * 2)


def client() -> genai.Client:
    return genai.Client(vertexai=True, api_key=settings.gemini_api_key, http_options=types.HttpOptions(timeout=240_000))


def speak(c, line: dict, path: str) -> float:
    if os.path.exists(path):
        with wave.open(path) as w:
            return w.getnframes() / w.getframerate()
    who = CAST[line["speaker"]]
    prompt = f"You are {who['style']}. Say this {line['delivery']}, in natural Hinglish:\n{line['speech']}"
    for attempt in range(8):
        try:
            r = c.models.generate_content(model=TTS_MODEL, contents=prompt, config=types.GenerateContentConfig(
                response_modalities=["AUDIO"], speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=who["voice"])))))
            return _wav(path, r.candidates[0].content.parts[0].inline_data.data)
        except Exception as e:
            print("  tts retry", attempt, str(e)[:80])
            time.sleep(min(60, 8 * (attempt + 1)))
    raise RuntimeError(f"TTS failed for: {line['subtitle']}")


def paint(c, prompt: str, path: str, refs: list[str], lead: str | None = None) -> None:
    if os.path.exists(path):
        return
    parts = [types.Part.from_bytes(data=open(r, "rb").read(), mime_type="image/png") for r in refs]
    if lead is None:
        lead = "Use the attached character sheet for how the characters look. " if refs else ""
    parts.append(types.Part(text=(lead
                                  + prompt + ". Style: " + STYLE)))
    # waiting fixes most failures (no internet, the per-minute image quota, Google's servers): those retry forever; a real
    # refusal (a bad request, a blocked prompt, no image returned) gets 4 tries
    from app.llm import is_network, transient, wait_before_retry
    attempt, hard = -1, 0
    while hard < 4:
        attempt += 1
        try:
            r = c.models.generate_content(model=settings.gemini_image_model, contents=types.Content(role="user", parts=parts),
                                          config=types.GenerateContentConfig(response_modalities=["IMAGE"],
                                                                             image_config=types.ImageConfig(aspect_ratio="16:9")))
            import cost
            cost.tokens(settings.gemini_image_model, getattr(r, "usage_metadata", None))
            for p in r.candidates[0].content.parts:
                if p.inline_data and p.inline_data.data:
                    open(path, "wb").write(p.inline_data.data)
                    return
            hard += 1  # an answer with no picture in it
            print(f"  image retry {attempt}: no picture returned ({hard} of 4)", flush=True)
        except Exception as e:
            if not transient(e):
                hard += 1
            wait = wait_before_retry(e, attempt) if transient(e) else 10
            why = "no internet" if is_network(e) else str(e)[:80]
            print(f"  image retry {attempt}: {why}; next try in {wait:.0f}s", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"image failed: {prompt[:60]}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lesson", type=int, required=True)
    ap.add_argument("--minutes", type=float, default=3)
    ap.add_argument("--out", default="ep1")
    ap.add_argument("--act", default="the opening act: arrival, what a network and a protocol are, what topology means, bus topology and its failure; end on a cliffhanger")
    a = ap.parse_args()
    out = os.path.join(HERE, "public", a.out)
    os.makedirs(out, exist_ok=True)
    c = client()

    # 1. screenplay
    sp_path = os.path.join(out, "screenplay.json")
    if not os.path.exists(sp_path):
        # the original lesson -> episode command needs the Tayyari study database; it is not part of the Studio
        raise SystemExit("pipeline.py --lesson needs the Tayyari study app's lessons and PYQs; use doc.py with a topic instead.")
        t = time.time()
        sp = get_llm().structured(Screenplay, SCREENWRITER, user, smart=True)
        json.dump(sp.model_dump(), open(sp_path, "w"), ensure_ascii=False, indent=1)
        print(f"screenplay: {len(sp.scenes)} scenes, {sum(len(x.lines) for x in sp.scenes)} lines ({round(time.time() - t)}s)")
    sp = json.load(open(sp_path))

    # 2. cast sheet, then scene art with the sheet as reference (keeps faces consistent)
    sheet = os.path.join(out, "cast.png")
    paint(c, "Character model sheet on a plain cream background: Ravi, Meera and Setu standing side by side, full body, "
             "front view, clearly separated. " + LOOKS.split("Jaalnagar")[0], sheet, [])
    t = time.time()
    with ThreadPoolExecutor(2) as ex:
        list(ex.map(lambda ix: paint(c, ix[1]["art"], os.path.join(out, f"scene{ix[0]:02d}.png"), [sheet]), enumerate(sp["scenes"])))
    print(f"art: {len(sp['scenes'])} scenes ({round(time.time() - t)}s)")

    # 3. voices
    jobs = [(i, j, line) for i, sc in enumerate(sp["scenes"]) for j, line in enumerate(sc["lines"])]
    t = time.time()
    with ThreadPoolExecutor(6) as ex:
        durs = list(ex.map(lambda x: speak(c, x[2], os.path.join(out, f"s{x[0]:02d}l{x[1]:02d}.wav")), jobs))
    print(f"voices: {len(jobs)} lines, {round(sum(durs))}s of audio ({round(time.time() - t)}s)")

    # 4. props for the renderer
    k = 0
    scenes = []
    for i, sc in enumerate(sp["scenes"]):
        lines = []
        for j, line in enumerate(sc["lines"]):
            lines.append({**line, "audio": f"{a.out}/s{i:02d}l{j:02d}.wav", "seconds": round(durs[k], 3)})
            k += 1
        scenes.append({"title": sc["title"], "diagram": sc["diagram"], "caption": sc["caption"],
                       "image": f"{a.out}/scene{i:02d}.png", "lines": lines})
    props = {"title": sp["episode_title"], "tagline": sp["tagline"], "lesson": a.lesson, "scenes": scenes}
    json.dump(props, open(os.path.join(out, "props.json"), "w"), ensure_ascii=False, indent=1)
    print(f"props ready: {round(sum(durs) / 60, 1)} min of dialogue")


if __name__ == "__main__":
    main()
