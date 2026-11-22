"""Director: owns how each scene plays, second by second, inside Skill 1. Which spoken line reveals each bullet (timed to the
real recorded voice), and whether the scene shows a real photo, of what. Never writes words, fetches or draws pictures."""

import json
from typing import Literal

from pydantic import BaseModel, Field

from app.llm import get_llm

from crew.state import SKILL
from crew.writer import tidy_bullet_at


class SceneSpec(BaseModel):
    key: str
    bullet_at: list[int] = Field(description="For each bullet, the index of the spoken line on which it appears")
    picture: bool = Field(description="True only if a real photo beside the text teaches something the words cannot")
    want: str = Field("", description="When picture: exactly what the photo must show, plain English, max 15 words")
    searches: list[str] = Field(default_factory=list, description="When picture: 1-3 short Wikimedia Commons searches (2-5 words)")
    note: str = Field("", description="One line for the human: why this scene plays this way")


class Specs(BaseModel):
    scenes: list[SceneSpec]


SYSTEM = f"""You are the DIRECTOR of an exam notes film. Skill: {SKILL}. The screen is one card on grid paper: a heading and
3-4 bullets, plus at most one real photograph on the right third. The hosts' voices are already recorded; you see each
line with the second it starts.

DECIDE FOR EVERY SCENE
- bullet_at: the line on which each bullet appears. A bullet lands on the line where the hosts START talking about it,
  never before (the viewer must not read ahead of the voice) and never long after. Non-decreasing; the first bullet can
  land on line 0. Leave at least ~2 seconds between two bullets when the lines allow.
- picture: the human already approved the plan, including its photo ideas: when the scene has a planner photo idea,
  set picture=true and keep that idea (you may sharpen the wording and the searches). Add a photo yourself where the
  narration names a real-world example the viewer should see. No photo for a pure formula, unit conversion or worked
  question. A photo must be something Wikimedia Commons has (a real object or scene), never a diagram, chart or text.
- note: one plain line telling the human why.
(Scenes the planner marked weak get a Diagram card instead of a photo; that is drawn separately.)"""


def direct(slides: dict, script: dict, takes: dict, plan: dict, keys: list[str], feedback: dict, current: dict) -> dict:
    hints = {s["key"]: s.get("picture", "") for s in plan["scenes"]}
    by_key = {s["key"]: s for s in plan["scenes"]}
    out = {}
    for start in range(0, len(keys), 6):
        batch = keys[start:start + 6]
        items = []
        for k in batch:
            at = takes.get(k, {}).get("line_at") or []
            it = {"key": k, "title": slides[k]["title"], "bullets": [b["text"] for b in slides[k]["bullets"]],
                  "lines": [f"[{j}] {at[j] if j < len(at) else '?'}s {ln['speaker']}: {ln['speech']}" for j, ln in enumerate(script[k]["lines"])],
                  "planner_picture_hint": hints.get(k, "")}
            if feedback.get(k):
                it["YOUR CURRENT DESIGN"] = current.get(k)
                it["FIX THIS (act on it, keep everything else)"] = feedback[k]
            items.append(it)
        user = f"SCENES ({len(batch)}):\n{json.dumps(items, ensure_ascii=False, indent=1)}"
        res = None
        for _ in range(3):
            res = get_llm().structured(Specs, SYSTEM, user, smart=True)
            if {s.key for s in res.scenes} >= set(batch):
                break
            user += f"\n\n(Return one scene for every key: {', '.join(batch)}.)"
        got = {s.key: s.model_dump() for s in res.scenes}
        for k in batch:
            s = got.get(k) or {"key": k, "bullet_at": script[k].get("bullet_at", []), "picture": False, "want": "", "searches": [], "note": ""}
            s["bullet_at"] = tidy_bullet_at(s["bullet_at"], len(slides[k]["bullets"]), len(script[k]["lines"]))
            sc = by_key[k]
            fb = feedback.get(k, "")
            had = (current.get(k) or {}).get("diagram")
            if sc.get("fit") == "weak" or had or "diagram" in fb.lower():  # the Diagram card takes the photo's place
                if fb.lower().strip().startswith("no diagram"):
                    s["diagram"] = None
                elif had and not fb:
                    s["diagram"] = had  # already approved and nobody asked to change it: keep it as it is
                else:
                    s["diagram"] = draw(slides[k], sc, script[k]["lines"], fb, had)
                    if s["diagram"]:
                        s["picture"], s["note"] = False, (s["diagram"].pop("note", "") or s["note"])
            if not s["picture"]:
                s["want"], s["searches"] = "", []
            out[k] = s
    return out


# ---------- the Diagram card: a still diagram where Skill 1's text + photo is weak ----------
class DObj(BaseModel):
    """Every field is required (0, "" or false when it doesn't apply): with defaults the model left out labels and bends."""
    kind: Literal["point", "arrow", "line", "label", "brace", "triangle", "fraction", "box"]
    x: float
    y: float
    x2: float = Field(description="End x for arrow, line, brace; else 0")
    y2: float = Field(description="End y for arrow, line, brace; else 0")
    w: float = Field(description="Width for box and triangle; else 0")
    h: float = Field(description="Height for box; else 0")
    text: str = Field(description="The visible text: point name, arrow label, brace length, label, box text, triangle 'D|S|T', fraction left side")
    num: str = Field(description="Fraction numerator; else empty")
    den: str = Field(description="Fraction denominator; else empty")
    size: Literal["s", "m", "l"]
    color: Literal["ink", "blue", "green", "red", "orange"]
    dashed: bool
    bend: float = Field(description="Arrows only: 0 straight, 0.5 to 0.8 bows up, -0.5 to -0.8 bows down")


class DiagramSpec(BaseModel):
    objects: list[DObj]
    note: str = Field("", description="One plain line for the human: what the diagram shows")


DIAGRAM = """You are the DIRECTOR drawing a Diagram card: ONE still diagram (no animation) that sits beside a notes slide
in place of a photo, so the student SEES the idea the text explains. It is drawn by code from your spec.

THE CANVAS: 12 units wide, 9 units tall. x runs 0 (left) to 12 (right); y runs 0 (TOP) to 9 (bottom). Keep everything
inside x 0.8-11.2, y 0.8-8.4. Text sizes: s (small), m (normal), l (large).

OBJECTS
- point (x, y, text): a dot with its name above it, e.g. "A".
- arrow (x, y -> x2, y2, text, bend): a movement or a vector, label above it. bend 0 = straight; bend 0.6 bows it up,
  -0.6 bows it down (use opposite bends for a trip there and back so the two arrows don't sit on top of each other).
- line (x, y -> x2, y2, dashed): a road, a track, a guide.
- brace (x, y -> x2, y2, text): a measured length |<- 50 m ->|, the value written under it.
- label (x, y, text): a short label or result, e.g. "Distance = 100 m".
- box (x, y = centre, w, h, text): a labelled box, e.g. a category name.
- triangle (x, y = centre, w ~6, text "D|S|T" = top|bottom-left|bottom-right): the formula triangle.
- fraction (x, y, text = left side like "S =", num, den): a formula written as a fraction.
COLOURS mean something: blue = the movement / path travelled; green = displacement or the result; orange = the key
quantity; red = a change or a wrong idea; ink = everything else.

RULES
- Only facts and numbers on the slide. Labels short (max ~22 characters), English terms and symbols in Latin script.
- 3-12 objects. Uncluttered: labels at least 0.8 units from each other; nothing overlapping. Big and readable on a phone.
- Show the idea physically: a straight trip is two points and one arrow with its length; a round trip is the arrow there
  (bend up) and the arrow back (bend down), with the two results as labels below.

EXAMPLE (Case 1: A to B, 50 m, straight line):
 point (2,4) "A" l; point (10,4) "B" l; arrow (2,4)->(10,4) blue "walks" bend 0; brace (2,5.4)->(10,5.4) "50 m";
 label (6,7) blue "Distance = 50 m"; label (6,7.9) green "Displacement = 50 m"
EXAMPLE (Case 2: A to B and back):
 point (2,4.6) "A" l; point (10,4.6) "B" l; arrow (2.2,4.4)->(9.8,4.4) blue "50 m" bend 0.6;
 arrow (9.8,4.8)->(2.2,4.8) blue "50 m back" bend -0.6; label (6,7.2) blue "Distance = 100 m"; label (6,8.1) green "Displacement = 0"
EXAMPLE (formula triangle): triangle (6,4.2) w 6.5 "D|S|T"; label (6,7.6) orange "S = D ÷ T" l
Use colour: the path or movement is blue, displacement or the result green, the key formula orange."""


def clean_diagram(d: dict) -> dict:
    cl = lambda a, lo, hi: max(lo, min(hi, float(a)))
    objs = []
    for o in (d.get("objects") or [])[:14]:
        o = dict(o)
        o["x"], o["y"] = cl(o["x"], 0.5, 11.5), cl(o["y"], 0.5, 8.6)
        if o["kind"] in ("arrow", "line", "brace"):
            o["x2"], o["y2"] = cl(o.get("x2") or o["x"], 0.5, 11.5), cl(o.get("y2") or o["y"], 0.5, 8.6)
            if abs(o["x2"] - o["x"]) + abs(o["y2"] - o["y"]) < 0.5:
                continue
        o["text"] = (o.get("text") or "")[:30]
        o["bend"] = cl(o.get("bend") or 0, -1, 1)
        objs.append({k: v for k, v in o.items() if v not in ("", 0, 0.0, False) or k in ("x", "y")})
    return {"objects": objs, "note": d.get("note", "")}


def draw(slide: dict, scene: dict, lines: list[dict], note: str = "", current: dict | None = None) -> dict | None:
    user = (f"THE SLIDE: {slide['title']}\n" + "\n".join(f"- {b['text']}" for b in slide["bullets"])
            + f"\n\nWHAT IT MUST MAKE VISIBLE (the planner): {scene.get('weak_why') or scene.get('focus')}"
            + f"\nSOURCE: {scene.get('source', '')}\nWHAT THE HOSTS SAY: " + " / ".join(ln["speech"] for ln in lines))
    if note:
        user += (f"\n\nYOUR CURRENT DIAGRAM:\n{json.dumps(current, ensure_ascii=False)}" if current else "") + f"\n\nFIX THIS (keep what works): {note}"
    for _ in range(2):
        try:
            d = clean_diagram(get_llm().structured(DiagramSpec, DIAGRAM, user, smart=True).model_dump())
            if len(d["objects"]) >= 2:
                return d
        except Exception as e:
            print(f"  diagram failed: {str(e)[:90]}", flush=True)
    return current
