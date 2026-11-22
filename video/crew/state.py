"""The crew's shared state, the step order and the bookkeeping every agent uses.

Ownership: each step is owned by exactly one agent and only that agent writes its part of the state. When a step changes a
scene, every later step is told to redo that scene (dirty); a step that has never run does everything.
"""

import json
import os
import shutil
import sys
from typing import TypedDict

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # video/
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
sys.path.insert(0, HERE)

STEPS = ["plan", "slides", "script", "voices", "direct", "pictures", "build", "final"]
OWNER = {"plan": "planner", "slides": "writer", "script": "writer", "voices": "producer", "direct": "director",
         "pictures": "searcher", "build": "producer", "final": "producer"}
GATE_TITLE = {"plan": "The plan", "slides": "On-screen text", "script": "The script", "voices": "Voices and takes",
              "direct": "Scene plans", "pictures": "Pictures", "build": "Scene by scene", "final": "The final film"}
SKILL = "Skill 1 · Text slides"  # text cards + a real photo where it helps, or a still Diagram card where text is weak; no animation


class Crew(TypedDict, total=False):
    slug: str
    config: dict        # subject, title, language, pace, roles (name, voice, style), source text, system prompt
    plan: dict          # Planner: title, summary, cold_open, scenes [{key, section, focus, source, picture, fit, weak_why}]
    skill_ideas: list   # Searcher (web): ideas for a new skill where Skill 1 is weak; research only, nothing is built
    slides: dict        # Writer: key -> {section, title, bullets[{text, key[], green[]}]}
    order: list         # slide keys in film order
    script: dict        # Writer: "hook" -> {title, kicker, headline, lines}; slide key -> {lines, bullet_at}
    takes: dict         # Producer: key -> {seconds, line_at[]}
    speed: float
    direction: dict     # Director: key -> {bullet_at[], picture: bool, want, searches[], note}
    pictures: dict      # Searcher: key -> {candidates [{title, preview, licence, match, shows}], pick, drawn}
    renders: dict       # Producer: key -> {video, index}
    video: str
    checks: dict        # Verifier: step -> key -> [issues]   ("*" = the whole step)
    dirty: dict         # step -> [keys] still to (re)do; a step missing here has never run (= everything)
    fresh: dict         # step -> [keys] it made in its last run (what the Verifier checks, what a gate highlights)
    auto: dict          # step -> {key: rounds} the Verifier already sent back by itself (after 3 the report goes to the human)
    feedback: dict      # step -> key -> the note the owner must act on (from the human, the Verifier or the Planner)
    approved: list      # gates the human has approved at least once
    gate: str           # the gate the film is waiting at
    history: list       # every human decision: {at, gate, action, notes}
    routed: list        # the Planner's last routing of notes on finished scenes: [{key, step, note}]


def out_dir(slug: str) -> str:
    return os.path.join(HERE, "public", slug)


def p(slug: str, *parts: str) -> str:
    return os.path.join(out_dir(slug), *parts)


def prepare(slug: str) -> None:
    for d in ("audio", "render", "sfx", "archive"):
        os.makedirs(p(slug, d), exist_ok=True)
    for s in ("bed", "paper", "whoosh"):  # the renderer only sees the film's own folder
        # a fresh clone has no public/sfx (git ignores public/): no sound effects then, instead of a crash
        if not os.path.exists(p(slug, "sfx", f"{s}.wav")) and os.path.exists(os.path.join(HERE, "public", "sfx", f"{s}.wav")):
            shutil.copy(os.path.join(HERE, "public", "sfx", f"{s}.wav"), p(slug, "sfx", f"{s}.wav"))


def scene_keys(st: Crew) -> list[str]:
    return ["hook"] + list(st.get("order") or [])


def todo(st: Crew, step: str, keys: list[str]) -> list[str]:
    """The keys this step still has to (re)do."""
    d = (st.get("dirty") or {}).get(step, "all")
    return list(keys) if d == "all" else [k for k in keys if k in d]


def finished(st: Crew, step: str, made: list[str], **extra) -> dict:
    """Mark a step done: nothing left to do, the keys it just made are fresh, and every later step must redo them."""
    dirty = dict(st.get("dirty") or {})
    dirty[step] = []
    for later in STEPS[STEPS.index(step) + 1:]:
        if later in dirty and dirty[later] != "all":
            dirty[later] = sorted(set(dirty[later]) | set(made))
    fb = dict(st.get("feedback") or {})
    fb.pop(step, None)
    return {"dirty": dirty, "fresh": {**(st.get("fresh") or {}), step: made}, "feedback": fb, **extra}


def redo_everything_after(st: Crew, step: str) -> dict:
    dirty = dict(st.get("dirty") or {})
    for later in STEPS[STEPS.index(step) + 1:]:
        if later in dirty:
            dirty[later] = "all"
    return dirty


class Say:
    """Live progress for the app (status.json): what the crew is doing right now. Prices every paid call into cost.json."""

    def __init__(self, slug: str):
        import doc
        self.st = doc.Status(out_dir(slug))

    def __call__(self, msg: str | None = None, step: str | None = None, **counts) -> None:
        self.st.update(step, msg, **counts)


def save_json(path: str, data) -> None:
    tmp = f"{path}.{os.getpid()}.tmp"
    with open(tmp, "w") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, path)
