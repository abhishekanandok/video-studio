"""Gemini makes a 2D film by itself with the 2D kit (src/twodemo/kit2d.tsx): it writes the story, the film's code (its
own world, sets and actions on the kit's character rig and camera) and its sound score; this script only voices the
lines, compiles, draws frames for Gemini to look at and fix, renders, and adds up the cost. Claude's chai film
(src/twodemo/Chai2D.tsx) is in the brief as the worked example.

    cd backend && .venv/bin/python ../video/gemini2d.py --topic "How milk reaches your home"

  public/twodemo/<slug>/   story.json, voice-NN.wav, voice.json, score.json, ambient.wav, stills/, run.log, cost.json, report.json
  src/twodemo/gen/<slug>/  Film.tsx (Gemini's), entry.tsx
  out/twodemo-<slug>.mp4
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
sys.path.insert(0, HERE)

import argon  # noqa: E402  (think(): Gemini, with retries and cost tracking)
import cost  # noqa: E402
import oneshot  # noqa: E402  (its patch helpers)
from pydantic import BaseModel, Field  # noqa: E402

LOG = ""


def say(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    if LOG:
        open(LOG, "a").write(line + "\n")


class Story(BaseModel):
    title: str
    lines: list[str] = Field(description="the narration: 8-10 short spoken sentences, about 5 seconds each, true facts only")
    places: list[str] = Field(description="the 4-6 places the story moves through, in order (they become stations on one world strip)")


STORY_SYSTEM = """You write the narration of a one-minute animated explainer for an Indian audience. A curious child follows the
thing the film is about through every place it passes, so the story is a journey through 4-6 places. 8-10 short spoken
sentences, about 5 seconds each, warm and clear, in English. Only true facts; no numbers you are not sure of."""

WRITE_SYSTEM = """You are the animator and director of a 2D motion film, written as ONE TypeScript React file for Remotion. You
get the story with every line's length, THE KIT (its whole source: import from "../../kit2d") and THE EXAMPLE (a film
made the same way, its whole source: study how it works and reach its quality; it has its own copy of the rig, you
import the kit's).

HOW THE FILM IS BUILT (the method of the example)
- ONE world strip: the places are stations laid out left to right along x (about 2500-3000 px apart), each drawn as a
  rich SVG set with real objects (machines, animals, vehicles, buildings, tools), on one ground (y = 0). The camera
  (cameraAt with Shot[]) holds on each station and glides to the next; the far layer moves slower (view(cam, 0.25)).
- ONE character rig for every person: the child in every station, and the people of each place in their own clothes
  (Look). Actions are poses built with mixPose from STAND/walkPose and the kit's actions (SIT, REACH, RAISE, HOLD_UP,
  SIP, POINT, CARRY), switched on at the right seconds with ease(). Walking comes from walkIn (no sliding feet). A
  held thing is drawn at handAt(...) so it is IN the hand.
- MOTION BY RULES: wheels and rollers turn by distance / radius, belts carry things at the belt's speed, liquids pour
  along a path, steam and smoke rise and loop, things change colour as they move through a process.
- Each line's moment: what the line says HAPPENS on screen while it is said (the verb becomes an action).
- Plan first, as a comment at the top: for every scene its idea, its station, who does what on which second, the shot.

RULES
- The file: import from "react", "remotion", "@remotion/google-fonts/Baloo2" and "../../kit2d" only; import VOICE
  from the voice path given; export const SECONDS (the film's length) and export const Film: React.FC.
- Use the kit's Narration with the scheduled lines (schedule(VOICE, WANT)) and the ambience path given.
- No words on screen except the subtitles (no titles, labels, signs with text).
- Frame every shot so the action fills it: people whole (feet to head inside the frame), nothing important under the
  subtitles (the bottom 140 px), nothing floating, nobody walking backwards (face matches the direction).
- TypeScript strict: type every prop and parameter; deterministic (seeded(), never Math.random); every .map item has a key.

ANSWER with two blocks and nothing else: the film in one ```tsx block, then its ambience score in one ```json block:
a list of {"kind", "start", "end", "gain"} with kind one of: wind, river, hum, road, bubble, crowd, birds, bells, drone
(gain 0.1-0.4), matching what each station sounds like."""

LOOK_SYSTEM = """You are checking frames of a 2D film you wrote, against its code. For each frame, look for: people cut off by the
frame or hidden by the subtitles, an empty or badly framed shot, things floating in the air, a held object not in the
hand, someone walking backwards, things overlapping wrongly, text on screen, anything that does not show what the line
says. Fix only what is clearly wrong, with small patches to the code. Answer ONLY with patches, nothing else:

<<<FIND
exact lines copied from the file (without the line numbers)
===
the replacement
>>>

If everything is fine, answer exactly: NO CHANGES"""


def block(text: str, lang: str) -> str:
    m = re.search(rf"```{lang}\s*\n(.*?)```", text, re.S)
    return m.group(1).strip() + "\n" if m else ""


def compile_errors(gen: str) -> list[str]:
    r = subprocess.run([argon.NPX, "tsc", "--noEmit", "-p", os.path.join(gen, "tsconfig.json")], cwd=HERE, capture_output=True, text=True)
    return [ln for ln in (r.stdout + r.stderr).splitlines() if "Film.tsx(" in ln and ": error " in ln]


def fix_compile(gen: str, film: str, src: str, out: str, tag: str) -> str:
    for r in range(3):
        errs = compile_errors(gen)
        if not errs:
            return src
        say(f"{len(errs)} compile error(s): asking Gemini for a patch (round {r + 1})")
        nos = [int(m.group(1)) for e in errs if (m := re.search(r"Film\.tsx\((\d+),", e))]
        before = src
        answer = argon.think(f"COMPILE ERRORS:\n" + "\n".join(errs[:20]) + "\n\nTHE LINES AROUND THEM:\n" + oneshot.around(src, nos), oneshot.FIX_SYSTEM.replace("Remotion film file", "Remotion film file (Film.tsx)"),
                             model=argon.fallback_model(), max_tokens=8000)
        open(os.path.join(out, f"raw-{tag}-{r + 1}.txt"), "w").write(answer)
        src, done, missed = oneshot.apply_patches(src, answer)
        open(film, "w").write(src)
        if len(compile_errors(gen)) > len(errs):
            src = before
            open(film, "w").write(src)
            say("  the patch made it worse: undone")
        else:
            say(f"  {done} patch(es) applied, {missed} not found")
    return src


def stills(gen: str, out: str, times: list[float]) -> list[str]:
    os.makedirs(os.path.join(out, "stills"), exist_ok=True)
    paths = []
    for t in times:
        p = os.path.join(out, "stills", f"t{t:05.1f}.png")
        subprocess.run([argon.NPX, "remotion", "still", os.path.join(gen, "entry.tsx"), "Film", p, f"--frame={int(t * 30)}", "--scale=0.5", "--log=error"], cwd=HERE, capture_output=True, text=True)
        if os.path.exists(p):
            paths.append(p)
    return paths


def main() -> None:
    global LOG
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", required=True)
    ap.add_argument("--looks", type=int, default=2, help="rounds of looking at frames and fixing")
    a = ap.parse_args()
    from google.genai import types
    slug = "gemini-" + re.sub(r"[^a-z0-9]+", "-", a.topic.lower()).strip("-")[:32] + time.strftime("-%m%d%H%M")
    out, gen = os.path.join(HERE, "public", "twodemo", slug), os.path.join(HERE, "src", "twodemo", "gen", slug)
    os.makedirs(out, exist_ok=True)
    os.makedirs(gen, exist_ok=True)
    LOG = os.path.join(out, "run.log")
    cost.start(out)
    model = argon.fallback_model()
    report: dict = {"slug": slug, "topic": a.topic, "model": model, "seconds": {}}
    t_all = time.time()

    say(f"Gemini ({model}) is making a 2D film by itself: {a.topic}")
    cost.stage("story")
    t0 = time.time()
    story = json.loads(argon.think(f"TOPIC: {a.topic}", STORY_SYSTEM, Story, model=model, max_tokens=4000))
    json.dump(story, open(os.path.join(out, "story.json"), "w"), indent=1, ensure_ascii=False)
    say(f"Story: {story['title']}: {len(story['lines'])} lines through {', '.join(story['places'])}")
    report["seconds"]["story"] = round(time.time() - t0)

    cost.stage("voice")
    t0 = time.time()

    class F(argon.Film):
        def __init__(self):
            self.slug, self.dir, self.gen = slug, out, gen
    vo = argon.voice(F(), {"lines": story["lines"]})
    for i, v in enumerate(vo):
        v["audio"], v["text"] = f"twodemo/{slug}/voice-{i:02d}.wav", story["lines"][i]
    json.dump([{k: v[k] for k in ("audio", "seconds", "text")} for v in vo], open(os.path.join(out, "voice.json"), "w"), indent=1, ensure_ascii=False)
    want, at = [], 1.2
    for v in vo:
        want.append(round(at, 1))
        at += v["seconds"] + 1.6
    seconds = round(at + 2.5)
    report["seconds"]["voice"] = round(time.time() - t0)
    say(f"Voiced {len(vo)} lines; the film is {seconds} s")

    cost.stage("write")
    t0 = time.time()
    kit = open(os.path.join(HERE, "src", "twodemo", "kit2d.tsx")).read()
    example = open(os.path.join(HERE, "src", "twodemo", "Chai2D.tsx")).read()
    ask = (f"TITLE: {story['title']}\nPLACES (stations, in order): {', '.join(story['places'])}\nFILM LENGTH: {seconds} s (export const SECONDS = {seconds})\n"
           f"VOICE: import VOICE from \"../../../../public/twodemo/{slug}/voice.json\" (a list of {{audio, seconds, text}})\n"
           f"AMBIENCE PATH (for Narration): \"twodemo/{slug}/ambient.wav\"\nWANT (each line's start, for schedule): {json.dumps(want)}\n\nTHE LINES:\n"
           + "\n".join(f"{i + 1}. at {want[i]} s for {v['seconds']:.1f} s: {v['text']}" for i, v in enumerate(vo))
           + f"\n\nTHE KIT (src/twodemo/kit2d.tsx):\n{kit}\n\nTHE EXAMPLE (src/twodemo/Chai2D.tsx):\n{example}")
    answer = argon.think(ask, WRITE_SYSTEM, model=model, max_tokens=64000)
    open(os.path.join(out, "raw-write.txt"), "w").write(answer)
    src, sc = block(answer, "tsx"), block(answer, "json")
    film = os.path.join(gen, "Film.tsx")
    open(film, "w").write(src)
    open(os.path.join(gen, "entry.tsx"), "w").write('import { Composition, registerRoot } from "remotion";\nimport { Film, SECONDS } from "./Film";\n\n'
                                                     'const Root: React.FC = () => <Composition id="Film" component={Film} durationInFrames={Math.round(SECONDS * 30)} fps={30} width={1920} height={1080} />;\n\nregisterRoot(Root);\n')
    json.dump({"extends": os.path.relpath(os.path.join(HERE, "tsconfig.json"), gen), "include": ["./*.tsx"]}, open(os.path.join(gen, "tsconfig.json"), "w"))
    report["seconds"]["write"] = round(time.time() - t0)
    report["lines_written"] = len(src.splitlines())
    say(f"Gemini wrote Film.tsx: {report['lines_written']} lines in {report['seconds']['write']} s")
    try:
        layers = json.loads(sc) if sc else [{"kind": "wind", "start": 0, "end": seconds, "gain": 0.2}]
        json.dump(layers, open(os.path.join(out, "score.json"), "w"), indent=1)
        import ambient
        ambient.score(os.path.join(out, "ambient.wav"), seconds, layers)
        say(f"Ambience from Gemini's score: {', '.join(sorted({L['kind'] for L in layers}))}")
    except Exception as e:
        say(f"The sound score did not work ({str(e)[:100]}): the film plays with the voice only")

    cost.stage("fix")
    t0 = time.time()
    src = fix_compile(gen, film, src, out, "fix")
    report["compiles"] = not compile_errors(gen)
    report["seconds"]["fix"] = round(time.time() - t0)
    if not report["compiles"]:
        say("It still does not compile: stopping")
        json.dump(report, open(os.path.join(out, "report.json"), "w"), indent=1)
        return
    say("Film.tsx compiles")

    cost.stage("look")
    t0 = time.time()
    times = [round(want[i] + vo[i]["seconds"] * 0.6, 1) for i in range(len(vo))]
    for r in range(a.looks):  # Gemini looks at a frame of every line and fixes what it sees
        shots = stills(gen, out, times)
        say(f"Look {r + 1}: Gemini checks {len(shots)} frames")
        parts = []
        for p, tt in zip(shots, times):
            parts.append(types.Part.from_text(text=f"FRAME at {tt} s"))
            parts.append(types.Part.from_bytes(data=open(p, "rb").read(), mime_type="image/png"))
        parts.append(types.Part.from_text(text="THE LINES:\n" + "\n".join(f"{want[i]} s: {v['text']}" for i, v in enumerate(vo)) + "\n\nTHE CODE (Film.tsx, numbered):\n" + oneshot.around(src, list(range(1, len(src.splitlines()) + 1)), 0)))
        answer = argon.think(parts, LOOK_SYSTEM, model=model, max_tokens=16000)
        open(os.path.join(out, f"raw-look-{r + 1}.txt"), "w").write(answer)
        if "NO CHANGES" in answer and "<<<FIND" not in answer:
            say("  Gemini sees nothing to fix")
            break
        before = src
        src, done, missed = oneshot.apply_patches(src, answer)
        open(film, "w").write(src)
        say(f"  {done} fix(es) applied, {missed} not found")
        if compile_errors(gen):
            src = fix_compile(gen, film, src, out, f"look-fix-{r + 1}")
            if compile_errors(gen):
                src = before
                open(film, "w").write(src)
                say("  those fixes broke the compile: undone")
    report["seconds"]["look"] = round(time.time() - t0)

    t0 = time.time()
    target = os.path.join(HERE, "out", f"twodemo-{slug}.mp4")
    say("Rendering the film")
    r = subprocess.run([argon.NPX, "remotion", "render", os.path.join(gen, "entry.tsx"), "Film", target, "--concurrency=6", "--crf=18", "--log=error"], cwd=HERE, capture_output=True, text=True)
    report["seconds"]["render"] = round(time.time() - t0)
    report["video"] = target if r.returncode == 0 else ""
    say(f"DONE {target}" if r.returncode == 0 else "Render failed:\n" + (r.stdout + r.stderr)[-1500:])

    c = json.load(open(os.path.join(out, "cost.json")))
    report["usd_by_stage"] = {k: round(v.get("usd", 0), 4) for k, v in c.get("stages", {}).items()}
    tts = c.get("models", {}).get(argon.fallback_model() + "-tts") or next((v for k, v in c.get("models", {}).items() if "tts" in k), {})
    report["voice_usd_estimate"] = round(tts.get("tokens_out", 0) * 20 / 1e6 + tts.get("tokens_in", 0) * 1 / 1e6, 4)  # TTS is not in the price table: Google's TTS rate
    report["usd"] = round(c.get("total_usd", 0) + report["voice_usd_estimate"], 4)
    report["calls"] = {k: v.get("calls", 0) for k, v in c.get("stages", {}).items()}
    report["seconds"]["total"] = round(time.time() - t_all)
    json.dump(report, open(os.path.join(out, "report.json"), "w"), indent=1)
    say("Report: " + json.dumps(report))


if __name__ == "__main__":
    main()
