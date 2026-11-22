"""Lesson -> a series of short Vox-style explainer episodes (paper-collage look, one calm narrator).

    lesson + PYQs ─► series plan (N one-idea episodes) ─► [episode script × N]  (beats: one sentence + the visual for it)
                                                         ├─► collage plates per episode (image model)
                                                         └─► narration per beat (Gemini TTS)
                                                              └─► public/<out>/epNN.json ─► Remotion "Explainer" render

Run from backend/:  .venv/bin/python ../video/explainer.py --lesson 1 --episodes 15 --out cn01
Everything is cached on disk; re-running resumes where it stopped.
"""

import argparse
import json
import os
import sys
import time
import wave
from concurrent.futures import ThreadPoolExecutor
from typing import Literal, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, os.path.dirname(__file__))

from pydantic import BaseModel, Field  # noqa: E402
from sqlalchemy import select  # noqa: E402

import pipeline as base  # noqa: E402  (client, paint, TTS helpers)
from app.db import SessionLocal  # noqa: E402
from app.llm import get_llm  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = "Iapetus"
NARRATOR = ("a calm, clear science-explainer narrator in the style of a thoughtful documentary: measured, unhurried pace, "
            "natural pauses at commas and full stops, Indian English accent; the few Hindi words are written in Roman script "
            "and must be pronounced naturally as Hindi")
COLLAGE = ("vintage editorial paper collage in the style of a Vox explainer: aged beige paper background with subtle stains and "
           "fibres, layered torn paper scraps, fragments of old newspaper and faded maps, strips of yellow masking tape, "
           "black-and-white halftone photo cutouts with thick white torn-paper borders and soft drop shadows, brass push pins "
           "joined by red string, an occasional red rubber-stamp mark; muted palette of beige, grey and black with red and "
           "mustard accents; photographic paper textures, 16:9, no readable words or letters")

Topo = Literal["network", "p2p", "bus", "ring", "star", "mesh", "tree", "hybrid"]


class Visual(BaseModel):
    kind: Literal["plate", "string", "stamp", "pyq", "formula", "compare", "list", "title"]
    plate: int = Field(0, description="Which of the episode's collage plates is the background (0-based)")
    label: str = Field("", description="plate/title: a short headline on a paper tag (max 6 words)")
    topology: Optional[Topo] = Field(None, description="string: the red-string diagram to draw")
    fail: Literal["none", "backbone", "node", "hub", "cable"] = Field("none", description="string: what breaks")
    tags: list[str] = Field(default_factory=list, description="string: up to 3 short labels pinned on the diagram (e.g. BACKBONE)")
    nodes: int = Field(5, description="string: number of devices (3-6)")
    text: str = Field("", description="stamp: 1-3 words in capitals")
    pyq: int = Field(-1, description="pyq: index into the PYQ list given")
    lines: list[str] = Field(default_factory=list, description="formula: 2-4 short lines worked out; list: 2-5 short items")
    left_title: str = ""
    left: list[str] = Field(default_factory=list)
    right_title: str = ""
    right: list[str] = Field(default_factory=list)


class Beat(BaseModel):
    narration: str = Field(description="1-2 spoken sentences, max ~30 words, English-first with occasional Roman-script Hindi")
    visual: Visual


class EpisodeScript(BaseModel):
    title: str = Field(description="Episode title, max 6 words")
    plates: list[str] = Field(description="2-3 collage image prompts (objects only, composition on the LEFT 45%, right side empty paper)")
    beats: list[Beat]
    takeaway: str = Field(description="One line to remember, max 14 words")


class EpisodePlan(BaseModel):
    title: str
    idea: str = Field(description="The single idea this episode teaches")
    covers: list[str] = Field(description="Every fact from the lesson that must be said in this episode")
    pyqs: list[int] = Field(default_factory=list, description="Indexes of PYQs answered in this episode")


class SeriesPlan(BaseModel):
    series_title: str
    episodes: list[EpisodePlan]


PLANNER = """You split one exam chapter into a series of short explainer videos, each about one minute, in the style of Vox /
Veritasium explainers. Each episode teaches ONE idea completely; together they cover every fact in the lesson and every
PYQ, in the order a good teacher would. Assign each PYQ to the episode that makes it answerable. No drama, no characters."""

WRITER = """You write one episode of a short explainer series (Vox / Veritasium style) for Indian exam aspirants (RRB JE,
SSC JE, BPSC TRE, IBPS SO IT). One calm narrator. No characters, no drama.

STRUCTURE (each beat = 1-2 sentences, max ~30 words, plus the visual that shows exactly that sentence):
1. Cold open: a concrete, real question or situation ("A bank branch has five computers. How should the cables run?").
2. Build the idea step by step: define it plainly, SHOW it, explain WHY it works that way, then the consequence.
3. The catch: the misconception or exam trap, and why it is tempting.
4. The exam moment: read ONLY the PYQs assigned to this episode (by their index) with a pyq beat, pause, then the answer
   and the one-line reason. If none are assigned, skip this step: other episodes own the other PYQs.
5. End on the takeaway.
Slow and complete: never skip a step the student needs. Total about 140-170 spoken words.

LANGUAGE: Indian English explainer voice. Use a Hindi word only to make something click (socho, yaani, matlab, dhyaan do),
at most one per two sentences, always in Roman script. Every technical term in English, exactly as the exam writes it.
Never invent facts.

VISUALS (choose per beat; the paper-collage look is automatic):
- plate: the episode's collage art full-frame, with a short headline tag.   - title: big headline on a kraft tag.
- string: devices as brass pins joined by red string, drawn live: topology network|p2p|bus|ring|star|mesh|tree|hybrid,
  optional fail backbone|node|hub|cable (the string snaps / a device dies), up to 3 tags like BACKBONE, TERMINATOR, TOKEN.
  Keep the same topology across consecutive beats to build on the drawing.
- stamp: a red rubber stamp slams on (e.g. SINGLE POINT OF FAILURE).   - formula: 2-4 lines worked out on a paper strip.
- pyq: the exam question on an index card, a red marker circles the answer.   - compare: two torn cards, X vs Y.
- list: 2-5 short slips.
PLATES: 2-3 image prompts of real-world objects for this idea (e.g. a bank counter terminal, a coil of coaxial cable, an
old hub), as halftone cutouts arranged on the LEFT 45%, right side left empty. Objects only, no people's faces, no text."""


def _pyqs(s, lesson) -> list[dict]:
    exams = {e.id: e.name for e in s.scalars(select(Exam))}
    return [{"q": q.stem, "options": q.options[:4], "answer": q.answer_index, "exam": f"{exams.get(q.exam_id, '')} {q.year or ''}".strip()}
            for q in s.scalars(select(Question).where(Question.topic_id == lesson.topic_id, Question.source == "pyq").order_by(Question.id))
            if len(q.options) >= 2]


def speak(c, text: str, path: str) -> float:
    if os.path.exists(path):
        with wave.open(path) as w:
            return w.getnframes() / w.getframerate()
    from google.genai import types
    for attempt in range(8):
        try:
            r = c.models.generate_content(model=base.TTS_MODEL, contents=f"You are {NARRATOR}. Read this:\n{text}",
                                          config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=types.SpeechConfig(
                                              voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE)))))
            return base._wav(path, r.candidates[0].content.parts[0].inline_data.data)
        except Exception as e:
            print("  tts retry", attempt, str(e)[:70])
            time.sleep(min(60, 8 * (attempt + 1)))
    raise RuntimeError(f"TTS failed: {text[:60]}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lesson", type=int, required=True)
    ap.add_argument("--episodes", type=int, default=15)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="", help="comma-separated episode numbers to produce (default: all)")
    a = ap.parse_args()
    raise SystemExit("explainer.py turns a Tayyari lesson into episodes and needs the study app's database; use doc.py here.")
    out = os.path.join(HERE, "public", a.out)
    os.makedirs(out, exist_ok=True)
    c = base.client()
    s = SessionLocal()
    lesson = s.get(Lesson, a.lesson)
    pyqs = _pyqs(s, lesson)
    lesson_title, lesson_content = lesson.title, lesson.content
    s.close()  # release the read transaction: a long-lived one blocks the API's startup migrations
    pyq_text = "\n".join(f"[{i}] ({p['exam']}) {p['q']} | options: {p['options']} | answer: "
                         f"{p['options'][p['answer']] if p['answer'] is not None else '?'}" for i, p in enumerate(pyqs))

    plan_path = os.path.join(out, "plan.json")
    if not os.path.exists(plan_path):
        plan = get_llm().structured(SeriesPlan, PLANNER, f"LESSON: {lesson_title}\nEXACTLY {a.episodes} episodes.\n\nPYQs:\n{pyq_text}\n\n"
                                                         f"LESSON TEXT:\n{lesson_content[:30000]}", smart=True)
        json.dump(plan.model_dump(), open(plan_path, "w"), indent=1)
    plan = json.load(open(plan_path))
    eps = plan["episodes"]
    todo = [int(x) for x in a.only.split(",") if x] or list(range(1, len(eps) + 1))
    print(f"plan: {len(eps)} episodes; producing {todo}")

    def script(n: int) -> dict:
        path = os.path.join(out, f"ep{n:02d}.script.json")
        if not os.path.exists(path):
            e = eps[n - 1]
            prev = "; ".join(x["title"] for x in eps[:n - 1][-3:]) or "(first episode)"
            nxt = eps[n]["title"] if n < len(eps) else "(last episode)"
            user = (f"SERIES: {plan['series_title']} | EPISODE {n} of {len(eps)}: {e['title']}\nIDEA: {e['idea']}\n"
                    f"MUST SAY: " + "; ".join(e["covers"]) + f"\nPREVIOUS EPISODES: {prev}\nNEXT EPISODE: {nxt}\n\n"
                    f"PYQs for this episode (use pyq beats with these indexes):\n" +
                    "\n".join(f"[{i}] ({pyqs[i]['exam']}) {pyqs[i]['q']} | {pyqs[i]['options']} | answer: "
                              f"{pyqs[i]['options'][pyqs[i]['answer']] if pyqs[i]['answer'] is not None else '?'}"
                              for i in e["pyqs"] if 0 <= i < len(pyqs)) +
                    f"\n\nLESSON TEXT (facts):\n{lesson_content[:20000]}")
            sc = get_llm().structured(EpisodeScript, WRITER, user, smart=True)
            json.dump(sc.model_dump(), open(path, "w"), indent=1, ensure_ascii=False)
        return json.load(open(path))

    t = time.time()
    with ThreadPoolExecutor(3) as ex:
        scripts = dict(zip(todo, ex.map(script, todo)))
    print(f"scripts: {len(scripts)} ({round(time.time() - t)}s)")

    base.STYLE = COLLAGE
    arts = [(n, k, p) for n in todo for k, p in enumerate(scripts[n]["plates"][:3])]
    t = time.time()
    with ThreadPoolExecutor(2) as ex:
        list(ex.map(lambda x: base.paint(c, x[2] + ". Arrange the cutouts on the LEFT 45% of the frame; keep the right 55% as "
                                         "plain aged paper for text", os.path.join(out, f"ep{x[0]:02d}p{x[1]}.png"), []), arts))
    print(f"plates: {len(arts)} ({round(time.time() - t)}s)")

    lines = [(n, i, b["narration"]) for n in todo for i, b in enumerate(scripts[n]["beats"])]
    t = time.time()
    with ThreadPoolExecutor(5) as ex:
        durs = list(ex.map(lambda x: speak(c, x[2], os.path.join(out, f"ep{x[0]:02d}b{x[1]:02d}.wav")), lines))
    print(f"narration: {len(lines)} beats, {round(sum(durs))}s ({round(time.time() - t)}s)")

    dur = {(n, i): d for (n, i, _), d in zip(lines, durs)}
    for n in todo:
        sc = scripts[n]
        nplates = len(sc["plates"][:3])
        beats = []
        for i, b in enumerate(sc["beats"]):
            v = dict(b["visual"])
            v["plate"] = max(0, min(nplates - 1, v.get("plate", 0)))
            if v["kind"] == "pyq":
                v["card"] = pyqs[v["pyq"]] if 0 <= v["pyq"] < len(pyqs) else None
                if not v["card"]:
                    v["kind"] = "plate"
            beats.append({"narration": b["narration"], "visual": v, "audio": f"{a.out}/ep{n:02d}b{i:02d}.wav", "seconds": round(dur[(n, i)], 3)})
        props = {"series": plan["series_title"], "episode": n, "of": len(eps), "title": sc["title"], "takeaway": sc["takeaway"],
                 "next": eps[n]["title"] if n < len(eps) else "", "plates": [f"{a.out}/ep{n:02d}p{k}.png" for k in range(nplates)],
                 "beats": beats}
        json.dump(props, open(os.path.join(out, f"ep{n:02d}.json"), "w"), indent=1, ensure_ascii=False)
    print("props ready")


if __name__ == "__main__":
    main()
