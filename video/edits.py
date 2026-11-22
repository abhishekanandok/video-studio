"""The creator's own changes to single lines of a documentary, made in the Studio's live tracker and kept in
public/<film>/edits.json, keyed by the line's recording ("c03l07" = chapter 3, line 7; c99 is the cold open):

    {"c03l07": {"speech": "new words", "rerecord": true, "layout": "scene", "picture": "TSMC fab in Hsinchu",
                "picture_kind": "real" | "paint", "note": "show the chip, not the CEO", "cut": false}}

Every field is optional. The next run honours them: new words are re-recorded, a layout or a direction re-plans only that
line, a picture is found (a real Commons photo) or painted (a cut-out: never a real person, never words or numbers),
"cut" drops the line or brings back one the trim removed. Everything else in the film is kept as it is. What happened to
each change is written back under "result", for the Studio to show."""
from __future__ import annotations

import json
import os
import re

EDITORIAL = ("portrait", "circle", "strips", "timeline", "stack", "scene")
LAYOUTS = ("auto", "build", "photo", "quote") + EDITORIAL


def key(ln: dict) -> str | None:
    m = re.search(r"c(\d\d)l(\d\d)-", ln.get("audio") or "")
    return f"c{m[1]}l{m[2]}" if m else None


def load(out_dir: str) -> dict:
    path = os.path.join(out_dir, "edits.json")
    try:
        return json.load(open(path)) if os.path.exists(path) else {}
    except ValueError:
        return {}


def save(out_dir: str, data: dict) -> None:
    tmp = os.path.join(out_dir, "edits.json.tmp")
    json.dump(data, open(tmp, "w"), indent=1, ensure_ascii=False)
    os.replace(tmp, os.path.join(out_dir, "edits.json"))


def script(agent, chapters: list[dict], opener: dict | None) -> None:
    """Before the voices: new words go into the script, and a changed or re-record line loses its old take."""
    import archivedoc
    edits = load(agent.out)
    changed = False
    for k, e in edits.items():
        m = re.fullmatch(r"c(\d\d)l(\d\d)", k)
        if not m:
            continue
        n, i = int(m[1]), int(m[2])
        block, name = (opener, "opener.json") if n == archivedoc.OPEN else (chapters[n] if n < len(chapters) else None, f"chapter{n:02d}.json")
        if not block or i >= len(block.get("lines", [])):
            continue
        wav = agent.voice_path(n, i)
        new = (e.get("speech") or "").strip()
        if new and new != block["lines"][i]["speech"]:
            block["lines"][i]["speech"] = new
            agent.save(name, block)
            if os.path.exists(wav):
                os.remove(wav)
            changed = True
        if e.pop("rerecord", False):
            if os.path.exists(wav):
                os.remove(wav)
            changed = True
    if changed:
        save(agent.out, edits)
        agent.st.update(msg="Your changed lines will be recorded again")


def apply(d, out: list[dict], cfg: dict, blank: str | None) -> None:
    """After the edit is laid out (out[i] is still archive line i): the creator's layouts, directions and pictures."""
    edits = load(d.out)
    if not edits:
        return
    import build
    b = build.Builder(d)
    for i, ln in enumerate(out):
        k = key(ln)
        e = edits.get(k or "")
        if not e:
            continue
        if "cut" in e:
            if e["cut"]:
                ln["cut"] = True
            else:
                ln.pop("cut", None)
        if ln.get("cut") or not ln.get("audio"):
            e["result"] = "skipped" if ln.get("cut") else "no recording yet"
            continue
        said = []
        lay, note = e.get("layout") or "", (e.get("note") or "").strip()
        if lay and lay != "auto" or note:
            said.append(replan(d, b, out, i, lay or "auto", note, blank))
        if (e.get("picture") or "").strip():
            said.append(picture(d, b, ln, i, e["picture"].strip(), e.get("picture_kind") or "real"))
        e["result"] = "; ".join(x for x in said if x) or "kept as planned"
        print(f"  your change to {k}: {e['result']}", flush=True)
        d.st.update(msg=f"Your change to {k}: {e['result']}")
    save(d.out, edits)


def replan(d, b, out: list[dict], i: int, lay: str, note: str, blank: str | None) -> str:
    ln = out[i]
    direction = f"\n\nTHE CREATOR'S DIRECTION FOR THIS LINE (follow it): {note}" if note else ""
    if lay in EDITORIAL:
        import editorial
        ed = editorial.Director(d)
        for _ in range(3):
            try:
                plan = d.llm.structured(editorial.EdPlan, editorial.DIRECTOR,
                                        f"LINES:\n[{i}] {ln['speech']}\n\nTHE CREATOR CHOSE THE \"{lay}\" LAYOUT FOR THIS LINE.{direction}")
            except Exception:
                continue
            p = next((x for x in plan.lines if x.i == i and x.layout == lay), None)
            if not p or editorial.check(p, ln):
                continue
            beat = ed.beat(p.model_dump(), ln)
            if beat:
                ln["beat"], ln["plate"], ln["side"] = beat, None, False
                ln.pop("layers", None)
                return f"{lay} layout"
        return f"{lay} layout could not be made (no matching real photo); page kept"
    if lay == "quote":
        o = ln.get("orig") or {}
        if o.get("kind") != "scrap" or not o.get("who") or not o.get("text"):
            return "this line quotes no one; page kept"
        import editorial
        name, _, role = o["who"].partition(",")
        src = b.real(name.strip(), [name.strip(), f"{name.strip()} portrait"], ln["speech"])
        cut = editorial.lift(src) if src else None
        if not cut:
            return f"no single-person photo of {name.strip()} found; page kept"
        ln["beat"] = {"kind": "editorial", "layout": "quote", "quote": o["text"], "name": name.strip(), "role": role.strip(),
                      "src": src, "cut": cut, "credit": "PHOTO: WIKIMEDIA COMMONS"}
        ln["plate"], ln["side"] = None, False
        return "quote with the speaker"
    if lay == "photo":
        return ""  # the picture itself is set below (or kept)
    # "build" or "auto" with a direction: the build-up page of this line, planned again
    plan = b.plan(out, [i], 0, 1, extra=direction)
    got = plan.get(str(i))
    if not got:
        return "page could not be re-planned; kept"
    pieces = b.pieces(i, ln, got)
    build_place(pieces, i)
    ln["beat"] = {"kind": "build", "pieces": pieces}
    ln["plate"], ln["side"] = blank, False
    ln.pop("layers", None)
    return "build-up page re-planned"


def build_place(pieces: list[dict], i: int) -> None:
    import build
    build.place(pieces, set(), i)
    pieces[:] = [q for q in pieces if not q.get("drop")]


def picture(d, b, ln: dict, i: int, what: str, kind: str) -> str:
    present = ln.get("era") == "present"
    if kind == "paint":
        src = d.cutout(i, what, color=present)
        if not src:
            return f"could not paint \"{what}\" to match"
    else:
        src = b.real(what, [what], ln["speech"])
        if not src:
            return f"no real photo of \"{what}\" found (or it is already used in the film)"
    beat = ln["beat"]
    if beat.get("kind") == "build":
        pics = [q for q in beat["pieces"] if q.get("src") and q.get("at", 0) >= 0]
        if pics:
            pics[0].update(src=src, caption=what, kind="cutout" if kind == "paint" else "photo")
        else:
            beat["pieces"].insert(0, {"kind": "cutout" if kind == "paint" else "photo", "src": src, "text": "", "caption": what, "at": 0.0})
            build_place(beat["pieces"], i)
        return "picture changed"
    if beat.get("kind") == "editorial" and beat.get("layout") in ("portrait", "circle", "strips", "scene", "quote"):
        beat["src"] = src
        if beat["layout"] in ("portrait", "quote"):
            import editorial
            cut = editorial.lift(src)
            if not cut:
                return "the photo shows more than one person, so it cannot be cut out; picture kept"
            beat["cut"] = cut
        if beat["layout"] == "scene":
            beat["label"] = beat.get("label") or what
        return "picture changed"
    ln["beat"] = {"kind": "photo", "src": src, "caption": what, **({"cutout": True} if kind == "paint" else {})}
    return "shown as a full picture"
