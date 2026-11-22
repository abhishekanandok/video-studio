"""Picture rules: what the creator taught the agent about each type of picture, learned from their corrections.

At the picture check the creator redraws a wrong picture and may say why ("a graph shows only the first quadrant") and
add a reference image ("graphs look like this"). Gemini turns that into short rules for that TYPE of picture (graph,
diagram, map...), kept with every version, and every later picture of that type, in every film, follows them: the plan
and the spec writer read them, and they ride along in the prompt Qwen-Image gets. Approved pictures become examples.

Stored in video/public/picture-rules/rules.json (references beside it in refs/).
"""

import json
import os
import shutil
import time

from pydantic import BaseModel, Field

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(HERE, "public", "picture-rules")
PATH = os.path.join(DIR, "rules.json")
TYPES = ["graph", "diagram", "chart", "formula", "timeline", "map", "cycle", "scene", "object", "person", "other"]
TYPE_HINT = ("graph = axes and plotted lines; diagram = a labelled drawing of how something is built or works (forces, "
             "a circuit, a cell, paths A to B); chart = bars, pies, tables of numbers; formula = an equation or a "
             "calculation shown; timeline = dates in order; map = places; cycle = steps going round; scene = an "
             "everyday or story moment; object = one thing shown; person = a person or historical figure")


def load() -> dict:
    try:
        return json.load(open(PATH, encoding="utf-8"))
    except Exception:
        return {"types": {}}


def save(d: dict) -> None:
    os.makedirs(DIR, exist_ok=True)
    tmp = PATH + ".tmp"
    json.dump(d, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, PATH)


def _type(d: dict, t: str) -> dict:
    return d["types"].setdefault(t, {"rules": [], "refs": [], "history": [], "examples": []})


def rules_for(t: str | None) -> list[str]:
    return list((load()["types"].get(t or "") or {}).get("rules") or [])


def rules_text(t: str | None) -> str:
    """The rules for one type, as a sentence for a prompt ("" when there are none)."""
    r = rules_for(t)
    return (f" The creator's rules for every {t} picture: " + " ".join(x.rstrip(".") + "." for x in r)) if r else ""


def all_rules_text() -> str:
    """Every type's rules, for the planner and the spec writer."""
    d = load()["types"]
    lines = [f"- {t}: " + " ".join(x.rstrip(".") + "." for x in v["rules"]) for t, v in d.items() if v.get("rules")]
    return ("\n\nTHE CREATOR'S PICTURE RULES, learned from their corrections. Every picture of that type follows them "
            "(write them into its picture and spec):\n" + "\n".join(lines)) if lines else ""


class Learned(BaseModel):
    rules: list[str] = Field(description="The full, updated rule list for this type of picture: short, concrete, general")
    lesson: str = Field(description="One sentence: what was learned from this correction")
    prompt: str = Field(description="The corrected prompt for this picture, following every rule")


LEARN = """You keep the rule book an illustrator follows when drawing pictures for exam-prep videos.
The creator rejected a {t} picture and corrected it. Learn from it:
1. Update the rules for ALL {t} pictures: add what this correction teaches, as short, concrete, GENERAL rules (true for
   every {t}, not just this one: "a graph shows only the first quadrant, origin at the bottom-left", not "this graph
   shows speed"). Keep the old rules unless the correction contradicts them; merge duplicates; at most 12 rules.
   If a reference image is attached, learn its STYLE and its correctness (line weights, colours, how labels and axes
   are drawn, the background) - never its layout or contents as a template: every {t} picture shows different content,
   so never a rule that fixes a layout ("mini-graphs at the top, an equation box in the middle"), adds boxes, tags or
   extra text, or forbids drawing real objects or scenes. Never a rule asking for more writing in pictures: text in a
   picture is kept to a few exact words.
2. Rewrite this picture's prompt so it fixes the problem and follows every rule.
Current rules for {t} pictures:
{rules}
The prompt that drew the rejected picture:
{old}
The creator's prompt for the redraw (empty: write one):
{new}
What the creator said was wrong:
{note}"""


def learn(t: str, note: str, old: str, new: str, ref: str | None = None) -> Learned | None:
    """A correction: Gemini updates the rules for type t (and sees the reference image if there is one) and writes the
    corrected prompt. Every version is kept in the type's history."""
    import pipeline as base
    from google.genai import types
    from app.config import settings
    d = load()
    cur = _type(d, t)
    parts = []
    if ref and os.path.exists(ref):
        ext = os.path.splitext(ref)[1].lower()
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}.get(ext, "image/png")
        parts.append(types.Part.from_bytes(data=open(ref, "rb").read(), mime_type=mime))
        parts.append(f"(Above: the creator's reference image: {t} pictures should look like this.)")
    ask = LEARN.format(t=t, rules="\n".join(f"- {r}" for r in cur["rules"]) or "(none yet)", old=old or "(unknown)",
                       new=new or "", note=note or "(no words: see the reference image)")
    try:
        c = base.client()
        r = c.models.generate_content(model=settings.gemini_model, contents=[*parts, ask], config=types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=Learned))
        got = Learned.model_validate_json(r.text)
    except Exception as e:
        print(f"  no lesson learned ({str(e)[:100]})", flush=True)
        return None
    if ref and os.path.exists(ref):
        os.makedirs(os.path.join(DIR, "refs"), exist_ok=True)
        keep = f"{t}-{int(time.time())}{os.path.splitext(ref)[1].lower()}"
        shutil.copy(ref, os.path.join(DIR, "refs", keep))
        cur["refs"].append({"file": f"refs/{keep}", "note": note, "at": int(time.time())})
    cur["history"].append({"at": int(time.time()), "note": note, "lesson": got.lesson, "before": cur["rules"],
                           "after": got.rules, "old_prompt": old, "new_prompt": new or got.prompt})
    cur["history"] = cur["history"][-50:]
    cur["rules"] = [r.strip() for r in got.rules if r.strip()][:12]
    save(d)
    return got


def approved(t: str, prompt: str, src: str) -> None:
    """A picture the creator approved: its prompt is a good example of a {t} picture (the last 8 are kept)."""
    if not prompt:
        return
    d = load()
    cur = _type(d, t)
    if any(x["prompt"] == prompt for x in cur["examples"]):
        return
    cur["examples"] = (cur["examples"] + [{"prompt": prompt, "src": src, "at": int(time.time())}])[-8:]
    save(d)


def set_rules(t: str, rules: list[str]) -> dict:
    """The creator edits a type's rules by hand (kept in the history like a correction)."""
    d = load()
    cur = _type(d, t)
    cur["history"].append({"at": int(time.time()), "note": "edited by hand", "lesson": "", "before": cur["rules"],
                           "after": rules})
    cur["rules"] = [r.strip() for r in rules if r.strip()][:12]
    save(d)
    return cur
