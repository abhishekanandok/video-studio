"""A skill's samples: three frames of a short lesson ON THE SKILL'S TOPIC, drawn by the skill's own renderer, so the
creator sees what the skill really does (backend/app/api/vskills.py).

1. The lesson: a model writes three lines on the topic (a hook, a process, a number) with what each line puts on screen.
2. The frames, by the skill's renderer:
   - "scenes" (SKILL 01, the UPI explainer): the lines as Scenes templates (headline, number, flow) with the look's settings.
   - "motion" (motion graphics, real pictures, cartoonish, realistic, and skills built on them): the motion director
     (motionfx.py) designs a look and a shot per line following the skill's style brief, then one still per shot.

Run from backend/:  .venv/bin/python ../video/vskill_sample.py ../video/public/vskills/<id>/sample-spec.json
"""

import concurrent.futures
import glob
import json
import os
import shutil
import subprocess
import sys

from pydantic import BaseModel, Field

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
sys.path.insert(0, HERE)
NPX = shutil.which("npx") or "npx"
EMOJI_SRC = "https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/lottie.json"
LESSON_TIMEOUT_SEC = 120


class Hook(BaseModel):
    speech: str = Field(description="the opening line a teacher says, one sentence, max 16 words")
    words: list[str] = Field(description="2-5 big words from that line")
    mark: int = Field(0, description="index in words of the key word")
    sub: str = Field("", description="a supporting line, max 6 words")
    note: str = Field("", description="a sticky note, max 3 words: the topic's key term")
    emoji: str = Field("", description="one emoji for the line")


class Process(BaseModel):
    speech: str = Field(description="one sentence walking through 3 steps of the topic, max 22 words")
    steps: list[str] = Field(description="exactly 3 step names, 1-2 words each, in order")
    pills: list[str] = Field(description="exactly 3 one-word labels under the steps")
    words: list[str] = Field(description="2-4 words naming the process")
    mark: int = 0
    emoji: str = ""


class Number(BaseModel):
    speech: str = Field(description="one sentence with ONE real, well-known figure about the topic, max 18 words")
    value: str = Field(description="the figure exactly as said, short: '97%', '1,400 km', '6'")
    label: str = Field(description="what it counts, max 3 words")
    sub: str = Field("", description="max 5 words")
    emoji: str = ""


class Lesson(BaseModel):
    hook: Hook
    process: Process
    number: Number


def write_lesson(topic: str, language: str) -> Lesson:
    from app.llm import get_llm

    roman = " in Roman letters (never Devanagari), the way Indian students text" if language.lower() == "hinglish" else ""
    system = (f"You write three lines of a short school lesson on a topic, in {language}{roman}, and what each line shows "
              "on screen. Facts must be true and well known. Short, vivid, spoken.")
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        return pool.submit(get_llm().structured, Lesson, system, f"Topic: {topic}", max_tokens=1500).result(timeout=LESSON_TIMEOUT_SEC)
    finally:
        pool.shutdown(wait=False)


def cp_of(emoji: str) -> str | None:
    """'☀️' -> '2600_fe0f' (the Noto animated emoji file name)"""
    return "_".join(f"{ord(c):x}" for c in emoji.strip()) or None


def board_frames(sid: str, out: str, lesson: Lesson, look: dict) -> None:
    h, p, n = lesson.hook, lesson.process, lesson.number
    pad3 = lambda xs: (list(xs) + ["", "", ""])[:3]
    scenes = [
        ("headline", {"words": h.words[:5], "mark": h.mark, "sub": h.sub, "notes": [h.note] if h.note else []}, h.emoji, h.speech),
        ("number", {"value": n.value, "label": n.label, "sub": n.sub}, n.emoji, n.speech),
        ("flow", {"steps": pad3(p.steps), "pills": pad3(p.pills), "words": p.words[:4], "mark": p.mark}, p.emoji, p.speech),
    ]
    stickers = "stickers" in (look.get("show") or []) and look.get("sticker_place") != "none"
    lines = [{"template": t, "slots": slots, "emoji": [cp_of(e) if stickers and e else None, None], "audio": None, "seconds": 4.0,
              "dir": f"vskills/{sid}", "chapter": k, "caption": speech} for k, (t, slots, e, speech) in enumerate(scenes)]
    import httpx
    for cp in {e for l in lines for e in l["emoji"] if e}:  # the animated stickers the samples use
        path = os.path.join(out, f"{cp}.json")
        if not os.path.exists(path):
            try:
                r = httpx.get(EMOJI_SRC.format(cp=cp), timeout=30)
                if r.status_code == 200:
                    open(path, "w").write(r.text)
            except Exception:
                pass
    for l in lines:
        l["emoji"] = [e if e and os.path.exists(os.path.join(out, f"{e}.json")) else None for e in l["emoji"]]
    style = {k: look.get(k) for k in ("text", "background", "transition", "pace", "background_image", "sticker_place", "sticker_size", "caption_pos", "stage") if look.get(k)}
    props = os.path.join(out, "sample.json")
    json.dump({"lines": lines, "style": style}, open(props, "w"), ensure_ascii=False)
    rel = os.path.relpath(props, HERE)
    fps, start = 30, 0
    for k, l in enumerate(lines):
        frame = start + int((l["seconds"] + 0.45) * fps * 0.8)  # late in each scene: everything has landed
        subprocess.run([NPX, "remotion", "still", "src/index.ts", "Scenes", os.path.join(out, f"sample-{k}.png"), f"--props={rel}", f"--frame={frame}", "--scale=0.5"],
                       cwd=HERE, check=False)
        start += int(round((l["seconds"] + 0.45) * fps))


def motion_frames(sid: str, out: str, lesson: Lesson, spec: dict) -> None:
    import motionfx

    slug = f"vskills/{sid}/sample"
    base = os.path.join(HERE, "public", slug)
    shutil.rmtree(base, ignore_errors=True)  # a new sample is a new look: nothing reused from the last one
    os.makedirs(base)
    lines = [{"speech": x.speech, "seconds": 5.0, "audio": None, "pause": 0.3} for x in (lesson.hook, lesson.process, lesson.number)]
    json.dump({"lines": lines, "speed": 1}, open(os.path.join(base, "archive.json"), "w"), ensure_ascii=False)
    cfg = {"topic": spec["topic"], "language": spec["look"].get("language") or "Hinglish", "aspect": "16:9", "motion_reviews": 1, "style": spec.get("style", "")}
    motionfx.direct(slug, cfg=cfg)
    stills = os.path.join(base, "stills")
    subprocess.run([shutil.which("node") or "node", "motion-stills.mjs", f"public/{slug}/motion.json", stills], cwd=HERE, check=False)
    for k in range(3):
        src = os.path.join(stills, f"{k}-0.png")
        if os.path.exists(src):
            shutil.copy(src, os.path.join(out, f"sample-{k}.png"))


def main(spec_path: str) -> None:
    spec = json.load(open(spec_path))
    sid, look = spec["skill"], spec["look"]
    out = os.path.dirname(os.path.abspath(spec_path))
    try:
        topic = spec.get("topic") or "Photosynthesis"
        print(f"Writing a sample lesson on {topic}", flush=True)
        lesson = write_lesson(topic, look.get("language") or "Hinglish")
        json.dump(lesson.model_dump(), open(os.path.join(out, "sample-lesson.json"), "w"), ensure_ascii=False, indent=1)
        for old in glob.glob(os.path.join(out, "sample-[0-9].png")):
            os.remove(old)
        if spec.get("renderer") == "motion":
            motion_frames(sid, out, lesson, spec)
        else:
            board_frames(sid, out, lesson, look)
    finally:
        from app.api.vskills import sample_done
        sample_done(sid)


if __name__ == "__main__":
    main(sys.argv[1])
