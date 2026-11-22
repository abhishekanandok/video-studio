"""The crew: a notes film made by six agents (video/crew/, LangGraph) that stops at eight gates for the human.

Each run of video/crew/run.py goes until the next gate and exits; the film then waits (state in Postgres) until the human
answers here. The app reads public/<slug>/crew.json (the state, written after every step) and status.json (live progress).
"""

import json
import os
import subprocess
import sys
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.notes import _default_prompt, _house_roles
from app.api.studio import ASSETS, BACKEND, OUT, PUBLIC, VIDEO, _alive, _read
from app.db import session_scope
from app.models import Film

router = APIRouter()
STEPS = ["plan", "slides", "script", "voices", "direct", "pictures", "build", "final"]
VOICES = os.path.join(VIDEO, "public", "voices", "gemini-3.8-flash-tts")


def _spawn(slug: str, *extra: str) -> int:
    log = open(os.path.join(PUBLIC, slug, "pipeline.log"), "a")
    args = [sys.executable, "-u", os.path.join(VIDEO, "crew", "run.py"), "--slug", slug, *extra]
    pid = subprocess.Popen(args, cwd=BACKEND, stdout=log, stderr=subprocess.STDOUT, start_new_session=True).pid
    try:  # keep the Mac awake while the crew works
        subprocess.Popen(["caffeinate", "-i", "-w", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    except OSError:
        pass
    return pid


def _film(s, film_id: int) -> Film:
    f = s.get(Film, film_id)
    if not f or f.kind != "crew":
        raise HTTPException(404, "crew film not found")
    return f


def _summary(f: Film, full: bool = False) -> dict:
    base = os.path.join(PUBLIC, f.slug)
    st = _read(os.path.join(base, "status.json"), {}) or {}
    crew = _read(os.path.join(base, "crew.json"), {}) or {}
    running = _alive(f.pid)
    waiting = (crew.get("waiting") or {}).get("gate") if not running else None
    video = crew.get("video")
    path = os.path.join(VIDEO, "out", video) if video else ""
    state = "running" if running else "waiting" if waiting else "done" if st.get("stage") == "done" else \
        "failed" if crew.get("error") or st.get("stage") == "failed" else "stopped"
    out = {"id": f.id, "slug": f.slug, "title": (crew.get("plan") or {}).get("title") or (f.config or {}).get("title") or "Untitled",
           "subject": (f.config or {}).get("subject"), "state": state, "running": running, "waiting": waiting,
           "step": st.get("stage"), "approved": crew.get("approved") or [], "error": crew.get("error"),
           "log": (st.get("log") or [])[-14:], "counts": (st.get("stages") or {}).get(st.get("stage"), {}),
           "cost": _read(os.path.join(base, "cost.json")), "created_at": f.created_at,
           "video": f"{OUT}/{video}?v={int(os.path.getmtime(path))}" if path and os.path.exists(path) else None}
    if full:
        media = f"{ASSETS}/{f.slug}/"
        out.update(media=media, config={k: v for k, v in (f.config or {}).items() if k != "system_prompt"},
                   **{k: crew.get(k) for k in ("plan", "skill_ideas", "order", "slides", "script", "takes", "speed", "direction",
                                                "pictures", "renders", "checks", "fresh", "history", "routed")})
        out["config"]["roles"] = (crew.get("config") or f.config or {}).get("roles")
        out["stamp"] = {k: int(os.path.getmtime(os.path.join(base, "audio", f"{k}.wav")))
                        for k in (["hook"] + (crew.get("order") or [])) if os.path.exists(os.path.join(base, "audio", f"{k}.wav"))}
    return out


@router.get("/crew/defaults")
def defaults():
    with session_scope() as s:
        roles = _house_roles(s)
    voices = _read(os.path.join(VIDEO, "public", "voices", "voices.json"), {}) or {}
    return {"roles": roles, "languages": ["Hinglish", "Hindi", "English"], "paces": ["slow", "normal", "fast"],
            "voices": [{"name": v["name"], "character": v.get("character", ""),
                        "sample": f"{ASSETS}/voices/gemini-3.8-flash-tts/{v['name']}.wav" if os.path.exists(os.path.join(VOICES, f"{v['name']}.wav")) else None}
                       for v in voices.get("voices", [])]}


class FilmIn(BaseModel):
    text: str
    subject: str = ""
    title: str = ""
    language: str = "Hinglish"
    pace: str = "normal"
    roles: list[dict] | None = None


@router.post("/crew/films")
def create(body: FilmIn):
    if len(body.text.split()) < 20:
        raise HTTPException(400, "Paste the script (at least a few sentences).")
    with session_scope() as s:
        roles = body.roles or _house_roles(s)
        cfg = {"title": body.title.strip(), "subject": body.subject.strip(), "language": body.language, "pace": body.pace,
               "skill": "slides", "system_prompt": _default_prompt(s), "source": body.text.strip(),
               "roles": [{"name": r["name"], "voice": r["voice"], "style": r.get("style", "")} for r in roles]}
        f = Film(slug="", kind="crew", config=cfg, minutes=0, format="notes", voices={r["name"]: r["voice"] for r in cfg["roles"]})
        s.add(f)
        s.flush()
        f.slug = f"crew{f.id}"
        os.makedirs(os.path.join(PUBLIC, f.slug), exist_ok=True)
        json.dump(cfg, open(os.path.join(PUBLIC, f.slug, "config.json"), "w"), ensure_ascii=False, indent=1)
        f.pid = _spawn(f.slug)
        return _summary(f)


@router.get("/crew/films")
def films():
    with session_scope() as s:
        return [_summary(f) for f in s.scalars(select(Film).where(Film.kind == "crew").order_by(Film.id.desc()))]


@router.get("/crew/films/{film_id}")
def film(film_id: int):
    with session_scope() as s:
        return _summary(_film(s, film_id), full=True)


class Answer(BaseModel):
    gate: str
    action: str = "approve"  # approve | revise
    edits: dict = {}
    notes: dict[str, str] = {}
    note: str = ""


@router.post("/crew/films/{film_id}/gate")
def answer(film_id: int, body: Answer):
    """The human's decision at the gate the film is waiting at: approve (with any edits), or send notes back."""
    if body.action not in ("approve", "revise"):
        raise HTTPException(400, "action must be approve or revise")
    with session_scope() as s:
        f = _film(s, film_id)
        cur = _summary(f)
        if cur["running"]:
            raise HTTPException(409, "The crew is still working.")
        if cur["waiting"] != body.gate:
            raise HTTPException(409, f"The film is waiting at '{cur['waiting'] or 'no gate'}', not '{body.gate}'.")
        if body.action == "revise" and not (body.note.strip() or any(v.strip() for v in body.notes.values())) and not body.edits.get("roles"):
            raise HTTPException(400, "Write what should change, or approve.")
        path = os.path.join(PUBLIC, f.slug, f"answer-{int(time.time())}.json")
        json.dump(body.model_dump(), open(path, "w"), ensure_ascii=False, indent=1)
        f.pid = _spawn(f.slug, "--resume", path)
        return _summary(f)


@router.post("/crew/films/{film_id}/continue")
def resume(film_id: int):
    """Carry on after a crash or a stop, from the last saved step."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The crew is still working.")
        f.pid = _spawn(f.slug)
        return _summary(f)


@router.post("/crew/films/{film_id}/stop")
def stop(film_id: int):
    with session_scope() as s:
        f = _film(s, film_id)
        from app import procs
        procs.stop(f.pid)
        return _summary(f)
