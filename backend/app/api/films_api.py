"""Films in the app (ADR 0013): Plan with Drishyya → storyboard review → write → check → render, run by video/oneshot.py.

The creator brings a topic, notes, audience, tone, a style (or a mix) and a length. The runner plans the story, voices
it and draws the storyboard, then STOPS. The creator approves each card, or writes a note on it (only that card is
redrawn) or changes its words (only that line is voiced again). The film is written only when every card is approved:
this file refuses the write otherwise, whatever the page does. After the film is made, a changed card is rewritten into
the film on its own (the other lines keep their code).

Everything is read from the film's folder, video/public/oneshot/<slug>/: job.json (what the creator asked),
plan.json, voice.json, storyboard.json, feedback.jsonl, run.log (what it is doing), cost.json, report.json; the film is
out/oneshot-<slug>.mp4. The older argon pipeline stays in argon_api.py (the app's "Classic" page)."""

import json
import os
import re
import subprocess
import sys
import time

from fastapi import APIRouter, HTTPException
from typing import Literal

from pydantic import BaseModel

router = APIRouter()
VIDEO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "video"))
FILMS = os.path.join(VIDEO, "public", "oneshot")
STEPS = [("plan", "Plan + script"), ("voice", "Voice + word timing"), ("storyboard", "Storyboard review"),
         ("write", "Write the film"), ("check", "Compile + check"), ("render", "Render")]


def _video_mod(name: str):
    if VIDEO not in sys.path:
        sys.path.insert(0, VIDEO)
    return __import__(name)


def _clean(slug: str) -> str:
    return re.sub(r"[^a-z0-9-]", "", slug)


def _read(path: str, default=None):
    try:
        return json.load(open(path))
    except Exception:
        return default


def _jobs(slug: str) -> list[str]:
    """the stages of this film being run right now (redraw can run for several cards at once)"""
    out = subprocess.run(["ps", "-axo", "command"], capture_output=True, text=True).stdout
    return [m.group(1) for l in out.splitlines() if f"oneshot.py --slug {slug} " in l + " " and (m := re.search(r"--stage (\w+)", l))]


def _launch(slug: str, stage: str, *extra: str) -> None:
    d = os.path.join(FILMS, slug)
    backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    subprocess.Popen([sys.executable, "-u", os.path.join(VIDEO, "oneshot.py"), "--slug", slug, "--stage", stage, *extra],
                     cwd=backend, stdout=open(os.path.join(d, "proc.log"), "a"), stderr=subprocess.STDOUT, start_new_session=True)


def _film_dir(slug: str) -> str:
    d = os.path.join(FILMS, slug)
    if not os.path.exists(os.path.join(d, "job.json")):
        raise HTTPException(404, "No such film")
    return d


def status(slug: str) -> dict:
    d = _film_dir(slug)
    sb_mod = _video_mod("storyboard")
    job, plan, report = _read(os.path.join(d, "job.json"), {}), _read(os.path.join(d, "plan.json"), {}) or {}, _read(os.path.join(d, "report.json"))
    sb = sb_mod.load(slug)
    running = _jobs(slug)
    log = open(os.path.join(d, "run.log")).read().splitlines()[-60:] if os.path.exists(os.path.join(d, "run.log")) else []
    proc = open(os.path.join(d, "proc.log")).read()[-4000:] if os.path.exists(os.path.join(d, "proc.log")) else ""
    video = os.path.join(VIDEO, "out", f"oneshot-{slug}.mp4")
    changed = sb_mod.changed(sb) if sb else []
    if "plan" in running:
        state = "planning"
    elif "write" in running or "redo" in running or "finish" in running:
        state = "writing"
    elif report and report.get("state") == "done":
        state = "done"
    elif report and report.get("state") == "failed":
        state = "failed"
    elif sb and os.path.exists(os.path.join(d, "handoff.json")):  # the creator chose Claude Code: waiting for it to draw the film
        state = "claude"
    elif sb:
        state = "review"
    else:
        state = "failed" if "Traceback" in proc else "stopped"
    approved = sum(c["status"] == "approved" for c in sb["cards"]) if sb else 0
    rendering = (state == "writing") and any("Rendering the film" in l for l in log[-6:])
    steps = {
        "plan": "done" if plan.get("lines") else "running" if "plan" in running else "pending",
        "voice": "done" if os.path.exists(os.path.join(d, "voice.json")) else "running" if "plan" in running and plan.get("lines") else "pending",
        "storyboard": "done" if sb and sb_mod.all_approved(sb) else "waiting" if sb else "running" if "plan" in running and plan.get("lines") else "pending",
        "write": "done" if report and report.get("lines_final") else "running" if state == "writing" and not rendering else "waiting" if state == "claude" else "pending",
        "check": "done" if report and report.get("compiles") else "failed" if report and not report.get("compiles") else "pending",
        "render": "done" if report and report.get("video") and os.path.exists(video) else "running" if rendering else "pending",
    }
    if sb:
        for c in sb["cards"]:
            c["changed"] = c["id"] in changed
    # the editor's timeline: each line's place in the film (its voice + 0.4 s, as src/argon/film.tsx plays it), voice, words
    from app.api.argon_api import _peaks, _url
    lines, at = [], 0.0
    for i, v in enumerate(_read(os.path.join(d, "voice.json"), []) or []):
        span = round(v["seconds"] + 0.4, 2)
        wav = os.path.join(VIDEO, "public", v["audio"])
        lines.append({"i": i, "start": round(at, 2), "span": span, "voice": _url(wav), "peaks": _peaks(wav), "words": v.get("words") or []})
        at += span
    return {"slug": slug, "topic": job.get("topic", slug), "title": plan.get("title", ""), "style": job.get("style", ""), "language": job.get("language", "English"),
            "vertical": job.get("vertical", False), "minutes": job.get("minutes", 1), "notes": job.get("notes", ""), "audience": job.get("audience", ""), "tone": job.get("tone", ""),
            "state": state, "running": running, "steps": [{"id": k, "label": label, "state": steps[k]} for k, label in STEPS],
            "storyboard": sb, "approved": approved, "total": len(sb["cards"]) if sb else 0, "changed": changed, "lines": lines, "length": round(at, 2),
            "script": plan.get("lines") or [], "voiced": [os.path.exists(os.path.join(d, f"voice-{i:02d}.wav")) for i in range(len(plan.get("lines") or []))],
            "code": _url(os.path.join(d, "film.tsx.txt")) if report and report.get("lines_final") else "",
            "log": [l for l in log if "] Report: " not in l][-40:], "error": proc.strip().splitlines()[-1][:300] if state == "failed" and proc.strip() else "",
            "cost": _read(os.path.join(d, "cost.json")), "report": report,
            "video": f"/studio-out/oneshot-{slug}.mp4?v={int(os.path.getmtime(video))}" if os.path.exists(video) and report and report.get("video") else "",
            "started": time.strftime("%d %b %H:%M", time.localtime(os.path.getctime(d))),
            "look": {"family": plan["dna"].get("family", ""), "summary": _video_mod("looks").summary(plan["dna"]), "auto": job.get("look") == "auto"} if plan.get("dna") else None}


@router.get("/films/looks")
def look_list():
    """the look families for the Plan page: name, blurb, preview still, the creator's brand in it and how many looks it has"""
    return {"looks": _video_mod("looks").options()}


@router.get("/films/looks/{fam}/studio")
def look_studio(fam: str):
    """the look studio for one family (Plan page step 2): its preview look, and the palettes, grounds, font pairings, boxes
    and motions the creator may pin; the browser draws the preview live from these (frontend/public/library/specimen.html)"""
    lk = _video_mod("looks")
    if fam not in lk.FAMILIES:
        raise HTTPException(404, "No such look.")
    return lk.studio(fam)


@router.post("/films/looks/{fam}/shuffle")
def look_shuffle(fam: str):
    """a new brand for the creator in this family (their next films keep it)"""
    lk = _video_mod("looks")
    if fam not in lk.FAMILIES:
        raise HTTPException(404, "No such look.")
    lk.brand(fam, shuffle=True)
    _render_preview(fam)
    return {"id": fam, "brand": lk.brand_name(fam)}


def _render_preview(fam: str) -> None:
    """re-render the family's Plan page card in the creator's new brand (src/print/looks-preview.tsx, in the background)"""
    lk = _video_mod("looks")
    json.dump([lk.preview_dna(k) for k in lk.FAMILIES], open(os.path.join(VIDEO, "src", "print", "looks-preview.json"), "w"), indent=1)
    out = os.path.join(os.path.dirname(VIDEO), "frontend", "public", "looks", f"{fam}.jpg")
    i = list(lk.FAMILIES).index(fam) * 150  # each family plays 5 s in the preview (src/print/looks-preview.tsx)
    still = ["npx", "remotion", "still", "src/print/looks-preview.tsx", "LookPreview", out, f"--frame={i + 140}", "--image-format=jpeg", "--scale=0.5", "--log=error"]
    clip = ["npx", "remotion", "render", "src/print/looks-preview.tsx", "LookPreview", out[:-4] + ".mp4", f"--frames={i}-{i + 149}", "--scale=0.5", "--crf=30", "--log=error"]
    subprocess.Popen(["sh", "-c", " && ".join(" ".join(f"'{a}'" for a in c) for c in (still, clip))], cwd=VIDEO,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)


@router.get("/films/styles")
def style_list():
    st = _video_mod("styles")
    return {"styles": [x for x in st.options() if x["id"] in st.DRAWN]}


@router.get("/films")
def films():
    out = []
    if os.path.isdir(FILMS):
        for slug in sorted(os.listdir(FILMS), key=lambda s: -os.path.getmtime(os.path.join(FILMS, s))):
            if os.path.exists(os.path.join(FILMS, slug, "job.json")):
                try:
                    s = status(slug)
                    out.append({k: s[k] for k in ("slug", "topic", "title", "style", "state", "approved", "total", "video", "started")} | {"changed": len(s["changed"])})
                except Exception:
                    continue
    return {"films": out}


class StartIn(BaseModel):
    topic: str
    notes: str = ""
    audience: str = ""
    tone: str = ""
    language: str = "English"
    accent: str = ""  # the narration's locale, e.g. "en-IN" (English said the Indian way); "" = the language's own (video/argon.py accent_of)
    vertical: bool = False
    style: str = ""  # one style id, or a mix: "whiteboard+map"
    minutes: float = 1
    clear: bool = False  # clear film: comprehension contract, viewer test before the gate, real maps
    mix: bool = False  # mix film (ADR 0014): the script picks each scene's kind (card, flow, map, motion, kinetic); implies clear
    look: str = ""  # the look family (video/looks.py FAMILIES), or "auto": Gemini picks the family from the topic
    draw: bool = False  # a drawn film: a shot list, every scene drawn alone with the pen, looked at and redrawn (video/oneshot.py draw_rounds)
    story: bool = False  # a story film: an arc told in painted worlds with a camera (video/oneshot.py STORY_*), not an explainer
    review: bool = False  # stop at the storyboard for the creator to approve every card (off: it writes and renders straight on)
    pin: dict = {}  # what the creator fixed in the look studio: paper, ink, inks, display, body, mono, box, motion (video/looks.py clean_pin)
    brief: dict = {}  # the film brief: the cinematic experience, pace, tone, cold open, chapters, transitions, music... (clean_brief)


BRIEF_KINDS = ("documentary", "explainer", "story", "fiction")
BRIEF_TONES = ("curious", "grave", "hopeful", "angry", "warm", "urgent", "playful", "calm")
BRIEF_MUSIC = ("none", "soft pad", "documentary pulse", "stings only", "orchestral", "ambient", "electronic")
BRIEF_MOMENTS = ("cold open", "chapter titles", "big numbers", "cinematic shots", "the closing question", "the end")


def clean_brief(b: dict) -> dict:
    """The creator's film brief (frontend/components/app/brief.tsx), kept to known values: what it asks for is stored in
    job.json for whoever draws the film (the pipeline, or Claude Code with the draw-film skill)."""
    b = b if isinstance(b, dict) else {}
    pick = lambda v, ok, d: v if v in ok else d
    sub = lambda k: b.get(k) if isinstance(b.get(k), dict) else {}
    num = lambda v, lo, hi, d: max(lo, min(hi, v)) if isinstance(v, (int, float)) and not isinstance(v, bool) else d
    words = lambda v, n: " ".join(str(v).split())[:n] if isinstance(v, str) else ""
    ids = lambda v, n: [x for x in v if isinstance(x, str) and re.fullmatch(r"[a-z0-9-]{2,40}", x)][:n] if isinstance(v, list) else []
    t, co, ch, tr, ci, mu = sub("tone"), sub("cold_open"), sub("chapters"), sub("transitions"), sub("cinematic"), sub("music")
    return {
        "kind": pick(b.get("kind"), BRIEF_KINDS, "explainer"),
        "pace": pick(b.get("pace"), (1, 1.15, 1.25), 1),
        "tone": {"presets": [x for x in ids(t.get("presets"), 4) if x in BRIEF_TONES], "words": words(t.get("words"), 200)},
        "cold_open": {"on": bool(co.get("on", True)), "style": pick(co.get("style"), ("3d-night", "drawn"), "drawn")},
        "chapters": {"mode": pick(ch.get("mode"), ("auto", "fixed"), "auto"), "count": int(num(ch.get("count"), 2, 15, 6)), "handoff": bool(ch.get("handoff", True))},
        "transitions": {"mode": pick(tr.get("mode"), ("auto", "pick"), "auto"), "picks": ids(tr.get("picks"), 100)},
        "cinematic": {"count": int(num(ci.get("count"), 0, 20, 3))},
        "music": {"style": pick(mu.get("style"), BRIEF_MUSIC, "documentary pulse"),
                  "moments": [x for x in (mu.get("moments") if isinstance(mu.get("moments"), list) else []) if x in BRIEF_MOMENTS],
                  "loudness": pick(mu.get("loudness"), ("quiet", "clear", "loud"), "clear")},
        "maps": bool(b.get("maps", True)), "photos": bool(b.get("photos", True)), "logos": bool(b.get("logos", True)),
        "dub": pick(b.get("dub"), ("none", "hinglish", "english"), "none"),
    }


@router.post("/films")
def start(body: StartIn):
    """Plan with Drishyya: plan, voice, storyboard (checked by the viewer test), then straight on to write and render;
    review=True stops at the storyboard for the creator to approve every card first."""
    topic = " ".join(body.topic.split())[:160]
    if not topic:
        raise HTTPException(400, "Name the topic.")
    st = _video_mod("styles")
    look = body.look if body.look in _video_mod("looks").FAMILIES or body.look == "auto" else ""
    style = look or "+".join(k for k in body.style.split("+") if k in st.DRAWN)
    slug = (re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")[:40] or "film") + "-" + time.strftime("%m%d%H%M%S")
    d = os.path.join(FILMS, slug)
    os.makedirs(d, exist_ok=True)
    json.dump({"topic": topic, "notes": body.notes.strip()[:8000], "audience": body.audience.strip()[:200], "tone": body.tone.strip()[:200],
               "language": body.language, "accent": body.accent if re.fullmatch(r"[a-z]{2,3}-[A-Z]{2}", body.accent) else "", "vertical": body.vertical, "style": style, "minutes": max(0.5, min(body.minutes, 30)), "clear": body.clear, "mix": body.mix or bool(look), "look": look, "story": body.story and bool(look), "draw": body.draw and bool(look), "review": body.review,
               "pin": _video_mod("looks").clean_pin(look, body.pin) if look != "auto" else {}, "brief": clean_brief(body.brief)},
              open(os.path.join(d, "job.json"), "w"), ensure_ascii=False, indent=1)
    _launch(slug, "plan")
    return {"slug": slug}


@router.get("/films/{slug}")
def film(slug: str):
    return status(_clean(slug))


@router.get("/films/{slug}/live")
def live(slug: str):
    """What the runner is doing this second (video/oneshot.py writes live/): every step it took (events.jsonl), the code
    as Gemini types it (write.json), the storyboard's cards as they are drawn (progress.json), the render's frames
    (render.json). The editor polls it fast while something runs."""
    slug = _clean(slug)
    d = _film_dir(slug)
    lv = os.path.join(d, "live")
    events = []
    if os.path.exists(os.path.join(lv, "events.jsonl")):
        for l in open(os.path.join(lv, "events.jsonl")).read().splitlines()[-120:]:
            try:
                events.append(json.loads(l))
            except Exception:
                pass
    running = _jobs(slug)
    return {"running": running, "now": time.time(), "events": events, "write": _read(os.path.join(lv, "write.json")),
            "progress": _read(os.path.join(lv, "progress.json")), "render": _read(os.path.join(lv, "render.json"))}


def _card_action(slug: str, cid: str, change) -> dict:
    slug = _clean(slug)
    _film_dir(slug)
    sb_mod = _video_mod("storyboard")
    if "plan" in _jobs(slug) or "write" in _jobs(slug) or "redo" in _jobs(slug):
        raise HTTPException(409, "The film is being worked on: wait until it stops.")
    out = {}

    def fn(sb: dict) -> None:
        try:
            c = sb_mod.card(sb, cid)
        except KeyError:
            raise HTTPException(404, "No such card")
        if c["status"] == "redrawing":
            raise HTTPException(409, "This card is being redrawn: wait for it.")
        change(c)
        out["card"] = dict(c)
    try:
        sb_mod.update(slug, fn)
    except FileNotFoundError:
        raise HTTPException(409, "The storyboard is not ready yet.")
    return out["card"]


@router.post("/films/{slug}/cards/{cid}/approve")
def approve(slug: str, cid: str):
    def fn(c: dict) -> None:
        c.update(status="approved", updated=time.time())
    c = _card_action(slug, cid, fn)
    _video_mod("storyboard").log(_clean(slug), "approve", c)
    return {"card": c}


class NoteIn(BaseModel):
    note: str


@router.post("/films/{slug}/cards/{cid}/feedback")
def feedback(slug: str, cid: str, body: NoteIn):
    """the creator's note on one card: only that card is redrawn (it comes back pending, to approve again)"""
    note = " ".join(body.note.split())[:1000]
    if not note:
        raise HTTPException(400, "Write what to change.")

    def fn(c: dict) -> None:
        c["notes"] = (c.get("notes") or []) + [{"at": time.time(), "note": note}]
        c.update(status="redrawing", updated=time.time())
    c = _card_action(slug, cid, fn)
    _video_mod("storyboard").log(_clean(slug), "feedback", c, note)
    _launch(_clean(slug), "redraw", "--card", cid, "--note", note)
    return {"card": c}


class LineIn(BaseModel):
    text: str


@router.post("/films/{slug}/cards/{cid}/line")
def edit_line(slug: str, cid: str, body: LineIn):
    """new words for one line: that line is voiced again and its card redrawn"""
    text = " ".join(body.text.split())[:400]
    if not text:
        raise HTTPException(400, "The line is empty.")
    if any(j != "redraw" for j in _jobs(_clean(slug))):  # one voice job at a time (the words are timed again for every line)
        raise HTTPException(409, "Another line is being voiced: wait for it.")

    def fn(c: dict) -> None:
        c.update(status="redrawing", updated=time.time())
    c = _card_action(slug, cid, fn)
    _video_mod("storyboard").log(_clean(slug), "edit-line", c, text)
    _launch(_clean(slug), "reline", "--card", cid, "--note", text)
    return {"card": c}


@router.post("/films/{slug}/approve-all")
def approve_all(slug: str):
    slug = _clean(slug)
    _film_dir(slug)
    sb_mod = _video_mod("storyboard")
    if _jobs(slug):
        raise HTTPException(409, "Something is still being worked on: wait until it stops.")
    done = []

    def fn(sb: dict) -> None:
        for c in sb["cards"]:
            if c["status"] == "pending":
                c.update(status="approved", updated=time.time())
                done.append(dict(c))
    try:
        sb_mod.update(slug, fn)
    except FileNotFoundError:
        raise HTTPException(409, "The storyboard is not ready yet.")
    for c in done:
        sb_mod.log(slug, "approve", c)
    return {"approved": len(done)}


@router.post("/films/{slug}/look/reroll")
def look_reroll(slug: str):
    """a new pick on the film's varied axes (headline, boxes, motion, photos, charts, labels, ornaments, lead colour)
    before it is written; the family and the creator's brand stay, so the approved storyboard still holds"""
    slug = _clean(slug)
    d = _film_dir(slug)
    if _jobs(slug):
        raise HTTPException(409, "Something is still being worked on: wait until it stops.")
    if (_read(os.path.join(d, "report.json")) or {}).get("lines_final"):
        raise HTTPException(409, "The film is already written in this look.")
    plan = _read(os.path.join(d, "plan.json"), {}) or {}
    if not plan.get("dna"):
        raise HTTPException(409, "This film has no look to re-roll.")
    lk = _video_mod("looks")
    try:
        plan["dna"] = lk.reroll(slug)
    except KeyError:
        raise HTTPException(409, "This film's look is not on record.")
    json.dump(plan, open(os.path.join(d, "plan.json"), "w"), ensure_ascii=False, indent=1)
    return {"summary": lk.summary(plan["dna"])}


class WriteIn(BaseModel):
    drawer: Literal["gemini", "claude"] = "gemini"  # who draws it: Gemini through the API, or Claude Code (the film waits for it)


@router.post("/films/{slug}/write")
def write(slug: str, body: WriteIn | None = None):
    """THE GATE: the film is written only when every card is approved (checked here, not only on the page). drawer
    "claude": nothing is launched; the film waits for Claude Code to draw it (.claude/skills/draw-film) and finish it."""
    slug = _clean(slug)
    _film_dir(slug)
    sb_mod = _video_mod("storyboard")
    if _jobs(slug):
        raise HTTPException(409, "Something is still being worked on: wait until it stops.")
    sb = sb_mod.load(slug)
    if not sb_mod.all_approved(sb):
        waiting = [c["id"] for c in (sb or {}).get("cards", []) if c["status"] != "approved"]
        raise HTTPException(409, f"Approve every card first. Not approved: {', '.join(waiting) or 'no storyboard yet'}.")
    if (_read(os.path.join(FILMS, slug, "report.json")) or {}).get("compiles"):  # a failed write can be tried again
        raise HTTPException(409, "The film is already written: change a card and use Rewrite changed lines.")
    if body and body.drawer == "claude":
        if not (_read(os.path.join(FILMS, slug, "plan.json"), {}) or {}).get("print"):
            raise HTTPException(409, "Claude Code draws look films only: pick a look for this film, or draw it with Gemini.")
        json.dump({"drawer": "claude", "asked": time.time()}, open(os.path.join(FILMS, slug, "handoff.json"), "w"))
        return {"slug": slug, "waiting_for": "claude", "ask": f"draw film {slug}"}
    if os.path.exists(os.path.join(FILMS, slug, "handoff.json")):  # changed their mind: Gemini draws it after all
        os.remove(os.path.join(FILMS, slug, "handoff.json"))
    _launch(slug, "write")
    return {"slug": slug, "writing": True}


@router.post("/films/{slug}/redo")
def redo(slug: str):
    """rewrite only the lines whose cards changed since the film was written, then render again"""
    slug = _clean(slug)
    _film_dir(slug)
    sb_mod = _video_mod("storyboard")
    if _jobs(slug):
        raise HTTPException(409, "Something is still being worked on: wait until it stops.")
    sb = sb_mod.load(slug)
    if not sb_mod.all_approved(sb):
        raise HTTPException(409, "Approve every card first.")
    ids = sb_mod.changed(sb)
    if not ids:
        raise HTTPException(409, "No line has changed since the film was written.")
    _launch(slug, "redo", "--card", ",".join(ids))
    return {"slug": slug, "lines": ids}


@router.post("/films/{slug}/stop")
def stop(slug: str):
    slug = _clean(slug)
    _film_dir(slug)
    subprocess.run(["pkill", "-f", f"oneshot.py --slug {slug} "])
    sb_mod = _video_mod("storyboard")
    if sb_mod.load(slug):  # a card that was being redrawn goes back to waiting, unchanged
        sb_mod.update(slug, lambda sb: [c.update(status="pending") for c in sb["cards"] if c["status"] == "redrawing"])
    open(os.path.join(FILMS, slug, "run.log"), "a").write(f"[{time.strftime('%H:%M:%S')}] Stopped by you\n")
    return {"slug": slug, "stopped": True}
