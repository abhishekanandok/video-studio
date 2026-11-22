"""Verifier: owns quality reports, nothing else. Checks every agent's output against what it had to match and reports
problems with reasons. Never fixes anything and never approves anything: the owner fixes, the human approves."""

import json
import os
import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor

from pydantic import BaseModel, Field

import notes
import pipeline as base
from app.llm import get_llm

from crew.state import HERE, p, save_json


class Item(BaseModel):
    key: str
    issues: list[str] = Field(default_factory=list, description="Concrete problems; empty when it is right")


class Report(BaseModel):
    items: list[Item]


def _report(system: str, user: str, keys: list[str]) -> dict:
    try:
        got = {i.key: i.issues for i in get_llm().structured(Report, system, user).items}
    except Exception as e:
        return {"*": [f"The check could not run ({str(e)[:80]})"]}
    return {k: got.get(k, []) for k in keys}


# ---------- the plan ----------
class PlanCheck(BaseModel):
    missing: list[str] = Field(description="Facts, definitions, examples, formulas or numbers of the source that no scene covers")
    issues: list[Item] = Field(default_factory=list, description="Scenes whose source quote is not really in the source, or that break the order")


def plan(cfg: dict, pl: dict) -> dict:
    listing = "\n".join(f"{s['key']}: {s['source']}" for s in pl["scenes"])
    try:
        r = get_llm().structured(PlanCheck, "You check a film plan against its source. Be strict and concrete. Every fact of the "
                                 "source must be in some scene's source quote, in the source's order.",
                                 f"THE SOURCE:\n{cfg['source']}\n\nTHE PLAN'S SCENES (key: source quote):\n{listing}")
    except Exception as e:
        return {"*": [f"The check could not run ({str(e)[:80]})"]}
    out = {i.key: i.issues for i in r.issues if i.issues}
    if r.missing:
        out["*"] = [f"Not covered: {m}" for m in r.missing]
    return out


# ---------- slides ----------
SLIDES = """You check exam slides against their source, like a strict editor. For each slide report concrete problems:
- a fact, number, example or formula in the slide that is NOT in its source (invented);
- a fact of its source that is missing from the slide (dropped);
- an English word written in Devanagari (English terms must stay in Latin script, e.g. 'Distance', not 'डिस्टेंस');
- more than 4 bullets, or far more than 40 words in total;
- a highlight that is a whole sentence.
Empty issues when the slide is right."""


def slides(pl: dict, sl: dict, keys: list[str]) -> dict:
    src = {s["key"]: s["source"] for s in pl["scenes"]}
    out = {}
    for start in range(0, len(keys), 8):
        batch = keys[start:start + 8]
        items = [{"key": k, "source": src[k], "slide": sl[k]} for k in batch]
        out.update(_report(SLIDES, json.dumps(items, ensure_ascii=False, indent=1), batch))
    return out


# ---------- the script ----------
SCRIPT = """You check the narration of an exam notes film. For each scene report concrete problems:
- a bullet of the slide the hosts never talk about;
- a fact or number that is not on the slide or in its source (invented), or that contradicts it;
- a line that repeats what the other host just said, or empty filler;
- a word too hard for an average Indian student, where a simpler one exists.
Empty issues when the scene is right."""


def script(cfg: dict, pl: dict, sl: dict, sc: dict, keys: list[str]) -> dict:
    src = {s["key"]: s["source"] for s in pl["scenes"]}
    out = {}
    devanagari = (cfg.get("language") or "Hinglish").lower() in ("hinglish", "hindi")
    for k in (keys if devanagari else []):  # the spoken text must be all Devanagari: Latin letters in speech come out with an English accent
        bad = [j for j, ln in enumerate(sc[k]["lines"]) if re.search(r"[A-Za-z]{2,}", ln["speech"])]
        if bad:
            out[k] = [f"Lines {', '.join(str(j + 1) for j in bad)} have English letters in the speech (must be Devanagari)"]
    slide_keys = [k for k in keys if k != "hook"]
    for start in range(0, len(slide_keys), 6):
        batch = slide_keys[start:start + 6]
        items = [{"key": k, "slide": [b["text"] for b in sl[k]["bullets"]], "source": src[k],
                  "lines": [f"{ln['speaker']}: {ln['speech']}" for ln in sc[k]["lines"]]} for k in batch]
        for k, iss in _report(SCRIPT, json.dumps(items, ensure_ascii=False, indent=1), batch).items():
            out[k] = out.get(k, []) + iss
    return {k: out.get(k, []) for k in keys} | ({"*": out["*"]} if "*" in out else {})


# ---------- voices ----------
def listen(slug: str, cfg: dict, key: str, lines: list[dict]) -> list[str]:
    from google.genai import types
    from app.config import settings
    text = "\n".join(f"{ln['speaker']}: {ln['speech']}" for ln in lines)
    c = base.client()
    for attempt in range(3):
        try:
            r = c.models.generate_content(model=settings.gemini_model, contents=[
                types.Part.from_bytes(data=open(p(slug, "audio", f"{key}.wav"), "rb").read(), mime_type="audio/wav"),
                notes.LISTEN.format(script=text, lang=cfg.get("language") or "Hinglish")],
                config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=notes.Heard))
            h = notes.Heard.model_validate_json(r.text)
            return [] if h.ok else [h.problem or "The take does not match the script"]
        except Exception as e:
            print(f"  listener failed for {key} (try {attempt + 1}): {str(e)[:80]}", flush=True)
            time.sleep(5 * (attempt + 1))
    return ["Could not be listened to; please listen yourself"]


def voices(slug: str, cfg: dict, sc: dict, keys: list[str]) -> dict:
    with ThreadPoolExecutor(4) as ex:
        return dict(zip(keys, ex.map(lambda k: listen(slug, cfg, k, sc[k]["lines"]), keys)))


# ---------- scene plans ----------
DIRECT = """You check a director's scene plans for an exam notes film. Each bullet appears on the spoken line given by
bullet_at. Report concrete problems: a bullet that appears BEFORE the hosts start talking about it, or well after they
finished; a photo asked for a pure formula, unit conversion or worked question; a photo that Wikimedia Commons would not have;
a diagram label or number that is not on the slide or contradicts it (e.g. a wrong distance).
Empty issues when the plan is right."""


def direct(sl: dict, sc: dict, dr: dict, keys: list[str]) -> dict:
    out = {}
    for start in range(0, len(keys), 8):
        batch = keys[start:start + 8]
        items = [{"key": k, "bullets": {i: b["text"] for i, b in enumerate(sl[k]["bullets"])},
                  "lines": {j: ln["speech"] for j, ln in enumerate(sc[k]["lines"])}, "bullet_at": dr[k]["bullet_at"],
                  "photo": dr[k]["want"] if dr[k]["picture"] else None,
                  "diagram_labels": [" ".join(x for x in (o.get("text"), o.get("num"), o.get("den")) if x)
                                     for o in ((dr[k].get("diagram") or {}).get("objects") or [])] or None} for k in batch]
        out.update(_report(DIRECT, json.dumps(items, ensure_ascii=False, indent=1), batch))
    return out


# ---------- pictures ----------
def look(slug: str, preview: str, want: str) -> dict:
    from google.genai import types
    from app.config import settings
    c = base.client()  # keep a reference: a client garbage-collected mid-call is closed under the request
    try:
        r = c.models.generate_content(model=settings.gemini_model, contents=[
            types.Part.from_bytes(data=open(p(slug, preview), "rb").read(), mime_type="image/jpeg"), notes.LOOK.format(want=want)],
            config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=notes.Look))
        v = notes.Look.model_validate_json(r.text)
        return {"match": v.match, "shows": v.shows}
    except Exception as e:
        return {"match": False, "shows": f"could not be checked ({str(e)[:60]})"}


def pictures(slug: str, pics: dict, dr: dict, keys: list[str]) -> dict:
    """Marks every candidate match/no-match in place; returns the issues per scene."""
    jobs = [(k, c) for k in keys for c in pics[k]["candidates"] if "match" not in c]
    with ThreadPoolExecutor(4) as ex:
        for (k, c), v in zip(jobs, ex.map(lambda j: look(slug, j[1]["preview"], dr[j[0]]["want"]), jobs)):
            c.update(v)
    return {k: [] if any(c.get("match") for c in pics[k]["candidates"]) else ["No photo found that really shows it"] for k in keys}


# ---------- built scenes ----------
FRAME = """This is the last frame of one scene of an exam notes film (every bullet visible). It will be watched on phones.
Report concrete problems: text cut off or overflowing the card, text too small to read on a phone, highlights covering
the wrong words, a photo that covers text, a photo that does not fit the slide, anything broken. Empty when it looks right.
THE SLIDE: {title} - {bullets}"""


def build(slug: str, props: dict, keys: list[str]) -> dict:
    """Renders the final frame of each scene and has Gemini look at it like a strict editor."""
    from google.genai import types
    from app.config import settings
    spec = [f"{props[k]['index']}:{max(1, int((0.4 + props[k]['seconds'] / (props[k]['speed'] or 1)) * 30) - 2)}:end" for k in keys]
    r = subprocess.run(["node", os.path.join(HERE, "notes-still.mjs"), slug, ",".join(spec)], cwd=HERE, capture_output=True, text=True)
    if r.returncode != 0:
        return {"*": [f"Could not render the check frames ({(r.stdout + r.stderr)[-120:]})"]}

    def one(k):
        pr = props[k]
        png = p(slug, "render", f"check{pr['index']:03d}-end.png")
        what = FRAME.format(title=pr.get("slide_title") or pr.get("headline", ""), bullets=" / ".join(b["text"] for b in pr.get("bullets") or []))
        c = base.client()  # keep a reference: a client garbage-collected mid-call is closed under the request
        try:
            res = c.models.generate_content(model=settings.gemini_model, contents=[
                types.Part.from_bytes(data=open(png, "rb").read(), mime_type="image/png"), what],
                config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=notes.VisualCheck))
            v = notes.VisualCheck.model_validate_json(res.text)
            return [] if v.ok else v.problems or ["Looks wrong"]
        except Exception as e:
            return [f"Could not be checked ({str(e)[:60]})"]
    with ThreadPoolExecutor(4) as ex:
        return dict(zip(keys, ex.map(one, keys)))


def save(slug: str, checks: dict) -> None:
    save_json(p(slug, "checks.json"), checks)
