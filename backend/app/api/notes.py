"""Exam notes films: a script, notes or a book becomes a text-slide film talked through by two hosts (video/notes.py).

Its own section of the app (the "Exam notes" pages), separate from the documentary Studio. Each film runs as a separate
process and reports progress in video/public/<slug>/status.json; every scene is rendered on its own so it can be watched
and redone alone.
"""

import json
import os
import re
import subprocess
import sys

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select

from app.api.studio import ASSETS, BACKEND, OUT, PUBLIC, VIDEO, _alive, _presets, _read
from app.db import session_scope
from app.models import Film, Setting

router = APIRouter()
STAGES = ["extract", "slides", "images", "scripts", "visuals", "voices", "render", "join"]
SOURCE_TYPES = (".pdf", ".txt", ".md")


def _default_prompt(s) -> str:
    row = s.get(Setting, "notes_system_prompt")
    if row and (row.value or {}).get("text"):
        return row.value["text"]
    sys.path.insert(0, VIDEO)
    import notes  # noqa: E402  (the engine holds the creator's original prompt)
    return notes.DEFAULT_SYSTEM


def _house_roles(s) -> list[dict]:
    """The two exam hosts with the house voices (the same pair the lesson films use)."""
    row = s.get(Setting, "lesson_video_voices")
    house = (row.value if row else {}) or {}
    roles = [dict(r) for r in _presets()["exam"]["roles"]]
    for r in roles:
        r["voice"] = house.get(r["name"]) or r["voice"]
    return roles


@router.get("/notes/defaults")
def defaults():
    with session_scope() as s:
        return {"system_prompt": _default_prompt(s), "roles": _house_roles(s), "languages": ["Hinglish", "Hindi", "English"],
                "paces": {"slow": "Slow", "normal": "Normal", "fast": "Fast"}}


class PromptIn(BaseModel):
    text: str


@router.put("/notes/defaults")
def save_default_prompt(body: PromptIn):
    with session_scope() as s:
        row = s.get(Setting, "notes_system_prompt") or Setting(key="notes_system_prompt", value={})
        row.value = {"text": body.text.strip()}
        s.merge(row)
    return {"ok": True}


# ---------- films ----------
def _spawn(slug: str, *extra: str) -> int:
    base = os.path.join(PUBLIC, slug)
    log = open(os.path.join(base, "pipeline.log"), "a")
    args = [sys.executable, "-u", os.path.join(VIDEO, "notes.py"), "--out", slug, *extra]
    pid = subprocess.Popen(args, cwd=BACKEND, stdout=log, stderr=subprocess.STDOUT, start_new_session=True).pid
    try:  # keep the Mac awake while the film is made
        subprocess.Popen(["caffeinate", "-i", "-w", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    except OSError:
        pass
    return pid


def _summary(f: Film) -> dict:
    base = os.path.join(PUBLIC, f.slug)
    st = _read(os.path.join(base, "status.json"), {}) or {}
    cfg = f.config or {}
    running = _alive(f.pid)
    stage = st.get("stage", "queued")
    if not running and stage not in ("done", "failed"):
        stage = "stopped"
    video = st.get("video")
    path = os.path.join(VIDEO, "out", video) if video else ""
    skill = "Skill 2 · Motion explainer" if cfg.get("explain") else "Skill 1 · Text slides"
    return {"id": f.id, "slug": f.slug, "title": st.get("title") or cfg.get("title") or "Untitled notes film", "subject": cfg.get("subject"), "skill": skill,
            "language": cfg.get("language"), "roles": [{"name": r["name"], "voice": r.get("voice") or ""} for r in cfg.get("roles", [])],
            "source": {k: v for k, v in (cfg.get("source") or {}).items() if k != "text"}, "slides": st.get("slides"),
            "running": running, "stage": stage, "stages": st.get("stages", {}), "log": (st.get("log") or [])[-12:],
            "video": f"{OUT}/{video}?v={int(os.path.getmtime(path))}" if path and os.path.exists(path) else None,
            "cost": _read(os.path.join(base, "cost.json")), "created_at": f.created_at}


def _film(s, film_id: int) -> Film:
    f = s.get(Film, film_id)
    if not f or f.kind != "notes":
        raise HTTPException(404, "notes film not found")
    return f


@router.get("/notes/films")
def films():
    with session_scope() as s:
        return [_summary(f) for f in s.scalars(select(Film).where(Film.kind == "notes").order_by(Film.id.desc()))]


@router.post("/notes/films")
async def create_film(config: str = Form(...), file: UploadFile | None = File(default=None)):
    try:
        cfg = json.loads(config)
    except json.JSONDecodeError:
        raise HTTPException(400, "bad config")
    text = (cfg.get("text") or "").strip()
    if not text and not (file and file.filename):
        raise HTTPException(400, "Paste a script or upload a book / notes file.")
    if file and file.filename and not file.filename.lower().endswith(SOURCE_TYPES):
        raise HTTPException(400, "Upload a PDF, TXT or MD file.")
    roles = cfg.get("roles") or []
    if not roles or any(not (r.get("name") or "").strip() or not r.get("voice") for r in roles):
        raise HTTPException(400, "Every host needs a name and a voice.")
    with session_scope() as s:
        film_cfg = {"title": (cfg.get("title") or "").strip(), "subject": (cfg.get("subject") or "").strip(),
                    # skill 1 = text slides (the default); skill 2 = the motion explainer: a 3Blue1Brown-style animation before each slide
                    "skill": "motion" if cfg.get("skill") == "motion" else "slides",
                    "explain": cfg.get("skill") == "motion",
                    "moving_pictures": bool(cfg.get("moving_pictures")),  # a picture's subject moves on it (being trialled)
                    "language": cfg.get("language") or "Hinglish", "pace": cfg.get("pace") or "normal",
                    "system_prompt": (cfg.get("system_prompt") or "").strip() or _default_prompt(s),
                    "roles": [{"name": r["name"].strip(), "voice": r["voice"], "style": r.get("style", "")} for r in roles],
                    "source": {"text": text, "file": None, "from_page": cfg.get("from_page") or None, "to_page": cfg.get("to_page") or None}}
        f = Film(slug="", kind="notes", config=film_cfg, minutes=0, format="notes", voices={r["name"]: r["voice"] for r in film_cfg["roles"]})
        s.add(f)
        s.flush()
        f.slug = f"notes{f.id}"
        base = os.path.join(PUBLIC, f.slug)
        os.makedirs(os.path.join(base, "source"), exist_ok=True)
        if file and file.filename:
            name = re.sub(r"[^\w.\- ]", "_", os.path.basename(file.filename))[:120]
            with open(os.path.join(base, "source", name), "wb") as fh:
                while chunk := await file.read(1 << 20):
                    fh.write(chunk)
            film_cfg["source"]["file"] = name
            f.config = dict(film_cfg)
        json.dump(film_cfg, open(os.path.join(base, "config.json"), "w"), ensure_ascii=False, indent=1)
        f.pid = _spawn(f.slug)
        return _summary(f)


@router.get("/notes/films/{film_id}")
def film(film_id: int):
    with session_scope() as s:
        f = _film(s, film_id)
        out = _summary(f)
    base = os.path.join(PUBLIC, f.slug)
    hook = _read(os.path.join(base, "script", "hook.json"))
    parts = _read(os.path.join(base, "pages.json"), []) or []
    deck = []
    for k in range(len(parts)):
        deck += _read(os.path.join(base, "parts", f"slides{k:03d}.json"), []) or []
    pics = _read(os.path.join(base, "images.json"), {}) or {}
    scenes = []
    rows = ([{"kind": "hook", "kicker": hook["kicker"], "headline": hook["headline"], "lines": hook["lines"]}] if hook else
            [{"kind": "hook", "kicker": "", "headline": "", "lines": []}])
    for i, sl in enumerate(deck):
        sc = _read(os.path.join(base, "script", f"s{i:03d}.json"), {}) or {}
        pic = pics.get(str(i)) or {}
        rows.append({"kind": "slide", "section": sl["section"], "title": sl["title"], "bullets": sl["bullets"], "pages": sl.get("pages"),
                     "picture": sl.get("picture") or "", "image": f"{ASSETS}/{f.slug}/{pic['src']}" if pic.get("src") else None, "credit": pic.get("credit", ""),
                     "explain": sc.get("explain", []), "lines": sc.get("lines", []), "bullet_at": sc.get("bullet_at", []),
                     "animated": os.path.exists(os.path.join(base, "visuals", f"s{i:03d}.json"))})
    for i, r in enumerate(rows):
        key = "hook" if i == 0 else f"s{i - 1:03d}"
        mp4 = os.path.join(base, "render", f"scene{i:03d}.mp4")
        r.update(index=i, voiced=os.path.exists(os.path.join(base, "audio", f"{key}.wav")),
                 video=f"{ASSETS}/{f.slug}/render/scene{i:03d}.mp4?v={int(os.path.getmtime(mp4))}" if os.path.exists(mp4) else None)
        scenes.append(r)
    out.update(scenes=scenes, parts=len(parts), system_prompt=(f.config or {}).get("system_prompt"))
    return out


def _stop(f: Film) -> None:
    from app import procs
    procs.stop(f.pid)


@router.post("/notes/films/{film_id}/stop")
def stop(film_id: int):
    with session_scope() as s:
        f = _film(s, film_id)
        _stop(f)
        return _summary(f)


@router.post("/notes/films/{film_id}/continue")
def resume(film_id: int):
    """Carry on from where it stopped (everything finished is cached), or apply edits: changed scenes re-render."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "This film is still being made.")
        f.pid = _spawn(f.slug)
        return _summary(f)


class SlideIn(BaseModel):
    section: str
    title: str
    bullets: list[dict]


@router.put("/notes/films/{film_id}/slides/{n}")
def edit_slide(film_id: int, n: int, body: SlideIn):
    """Edit slide n (1-based, as numbered on screen). The narration stays; Continue re-renders only the changed scene."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "Wait for the film to stop before editing.")
    base = os.path.join(PUBLIC, f.slug)
    parts = _read(os.path.join(base, "pages.json"), []) or []
    i = n - 1
    for k in range(len(parts)):
        path = os.path.join(base, "parts", f"slides{k:03d}.json")
        slides = _read(path, []) or []
        if i < len(slides):
            bullets = [{"text": (b.get("text") or "").strip(), "key": [x for x in b.get("key", []) if x.strip()],
                        "green": [x for x in b.get("green", []) if x.strip()]} for b in body.bullets if (b.get("text") or "").strip()]
            if not bullets:
                raise HTTPException(400, "A slide needs at least one bullet.")
            slides[i].update(section=body.section.strip().upper(), title=body.title.strip(), bullets=bullets)
            json.dump(slides, open(path, "w"), ensure_ascii=False, indent=1)
            return {"ok": True}
        i -= len(slides)
    raise HTTPException(404, "no such slide")


class RedoIn(BaseModel):
    what: str = "render"  # render | narration
    feedback: str = ""


@router.post("/notes/films/{film_id}/scenes/{i}/redo")
def redo(film_id: int, i: int, body: RedoIn):
    """Redo one scene (0 = the cold open): its narration (script, voice and render) or only its render; the film is rejoined."""
    if body.what not in ("render", "narration"):
        raise HTTPException(400, "what must be render or narration")
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "Wait for the film to stop first.")
        f.pid = _spawn(f.slug, "--scene", str(i), "--redo", body.what, "--feedback", body.feedback[:1000])
        return _summary(f)
