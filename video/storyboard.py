"""The storyboard of a film made by the one-shot pipeline (video/oneshot.py), and its approval rules (ADR 0013).

One card per spoken line: the line, its seconds, and its design (what is on screen, what moves on which word, links,
chart, words on screen). A card is "pending" until the creator approves it, "redrawing" while the designer redraws it
from the creator's feedback, and "approved" once approved. The film is written only when EVERY card is approved; the
backend checks that before it starts the write (not only the page).

  public/oneshot/<slug>/storyboard.json   {"slug", "topic", "title", "style", "ground", "written": {id: design hash}, "cards": [...]}
  public/oneshot/<slug>/feedback.jsonl    every approve and every feedback note, with the card as it was (PRD V1-20)

Both the runner and the backend import this file; every write is a whole file (tmp + rename), so a reader never sees half.
"""

import hashlib
import json
import os
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, "public", "oneshot")


def path(slug: str, name: str = "storyboard.json") -> str:
    return os.path.join(PUBLIC, slug, name)


def card_id(i: int) -> str:
    return f"L{i + 1:02d}"


def load(slug: str) -> dict | None:
    try:
        return json.load(open(path(slug)))
    except Exception:
        return None


def save(sb: dict) -> None:
    p = path(sb["slug"])
    tmp = p + ".tmp"
    json.dump(sb, open(tmp, "w"), ensure_ascii=False, indent=1)
    os.replace(tmp, p)


def update(slug: str, change) -> dict:
    """read, change and save the storyboard under a lock: the page (approve) and the runner (redraw) both write cards,
    and neither may lose the other's change"""
    import fcntl
    with open(path(slug, ".storyboard.lock"), "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        sb = load(slug)
        if sb is None:
            raise FileNotFoundError(f"no storyboard for {slug}")
        change(sb)
        save(sb)
        return sb


def design_hash(card: dict) -> str:
    """what a card says (its line and design), so the page knows which lines changed since the film was written"""
    return hashlib.sha1(json.dumps([card["line"], card["design"]], sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]


def from_design(slug: str, p: dict, voice: list[dict], design: dict, style: str) -> dict:
    """the first storyboard: every card pending"""
    cards = []
    for i, s in enumerate(design["scenes"]):
        cards.append({"id": card_id(i), "i": i, "line": p["lines"][i], "seconds": round(voice[i]["seconds"], 2),
                      "design": s, "status": "pending", "notes": [], "updated": time.time()})
    return {"slug": slug, "topic": p["topic"], "title": p.get("title", ""), "style": style, "ground": design["ground"],
            "written": {}, "cards": cards}


def card(sb: dict, cid: str) -> dict:
    c = next((c for c in sb["cards"] if c["id"] == cid), None)
    if c is None:
        raise KeyError(f"no card {cid}")
    return c


def all_approved(sb: dict | None) -> bool:
    return bool(sb and sb["cards"]) and all(c["status"] == "approved" for c in sb["cards"])


def changed(sb: dict) -> list[str]:
    """approved cards whose line or design changed since the film was written: the lines to rewrite"""
    if not sb.get("written"):
        return []
    return [c["id"] for c in sb["cards"] if sb["written"].get(c["id"]) != design_hash(c)]


def log(slug: str, kind: str, c: dict, note: str = "") -> None:
    """one approve or feedback, for tuning the designer later (PRD V1-20)"""
    with open(path(slug, "feedback.jsonl"), "a") as f:
        f.write(json.dumps({"t": round(time.time(), 2), "kind": kind, "card": c["id"], "note": note, "line": c["line"], "design": c["design"]},
                           ensure_ascii=False) + "\n")


def design_of(sb: dict) -> dict:
    """the design the writer follows: the approved cards, in order"""
    return {"ground": sb["ground"], "scenes": [c["design"] for c in sb["cards"]]}
