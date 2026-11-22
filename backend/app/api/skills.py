"""The Skill Lab: the crew's library of skills (ways of putting an idea on screen), designed together by the team and the
Skill Scout (video/crew/scout.py). A skill goes idea -> approved (the team wants it built) -> built (the renderer can draw
it, so the Director may use it in films). Example images live in video/public/skills/<id>/."""

import os
import sys
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.api.studio import ASSETS, PUBLIC, VIDEO
from app.db import session_scope
from app.models import Skill

router = APIRouter()
STATUSES = ("idea", "approved", "built")
IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
VIDEO_TYPES = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"}
FIELDS = ("name", "kind", "summary", "students", "when_to_use", "avoid_when", "look", "motion", "best_practices", "image_prompt", "used_by")


def _scout():
    for p in (VIDEO, os.path.join(VIDEO, "..", "backend")):
        if p not in sys.path:
            sys.path.insert(0, p)
    from crew import scout
    return scout


def _dir(skill_id: int) -> str:
    d = os.path.join(PUBLIC, "skills", str(skill_id))
    os.makedirs(d, exist_ok=True)
    return d


def _out(s: Skill) -> dict:
    d = dict(s.data or {})
    d["examples"] = [{**e, "url": f"{ASSETS}/skills/{s.id}/{e['file']}"} for e in d.get("examples", [])]
    return {"id": s.id, "created_at": s.created_at, **d}


def _get(s, skill_id: int) -> Skill:
    sk = s.get(Skill, skill_id)
    if not sk:
        raise HTTPException(404, "skill not found")
    return sk


def _save(sk: Skill, data: dict) -> None:
    sk.data = data
    flag_modified(sk, "data")


def _new(proposal: dict, by: str, status: str = "idea") -> dict:
    return {**{k: proposal.get(k) for k in FIELDS if k in proposal}, "sources": proposal.get("sources", []), "status": status,
            "used_by": proposal.get("used_by") or "Director", "by": by, "examples": [], "notes": [], "updated": time.strftime("%Y-%m-%d %H:%M")}


@router.get("/crew/skills")
def skills():
    with session_scope() as s:
        # the Skill Tab's slide looks share the table (data.type == "look"); they are not the crew's skill ideas
        return [_out(x) for x in s.scalars(select(Skill).order_by(Skill.id)) if (x.data or {}).get("type") != "look"]


@router.get("/crew/skills/{skill_id}")
def skill(skill_id: int):
    with session_scope() as s:
        return _out(_get(s, skill_id))


@router.post("/crew/skills/scout")
async def scout(brief: str = Form(""), author: str = Form("Team"), count: int = Form(1), file: UploadFile | None = File(default=None)):
    """Brainstorm new skills with the Scout: a brief and/or a reference picture -> researched skill ideas."""
    image, mime, ext = None, "image/png", ".png"
    if file and file.filename:
        ext = os.path.splitext(file.filename.lower())[1]
        if ext not in IMAGE_TYPES and file.content_type in IMAGE_TYPES.values():  # a pasted picture
            ext = next(e for e, t in IMAGE_TYPES.items() if t == file.content_type)
        if ext not in IMAGE_TYPES:
            raise HTTPException(400, "Upload a PNG, JPG or WEBP picture.")
        image, mime = await file.read(), IMAGE_TYPES[ext]
        if len(image) > 12 * 1024 * 1024:
            raise HTTPException(400, "The picture is too big (12 MB max).")
    if not brief.strip() and not image:
        raise HTTPException(400, "Write a brief or add a reference picture.")
    import anyio
    props, seen = await anyio.to_thread.run_sync(lambda: _scout().propose(brief.strip(), image, mime, max(1, min(3, count))))
    ids = []
    with session_scope() as s:
        for p in props:
            data = _new(p, f"Skill Scout, from {author}'s brief")
            data["brief"] = brief.strip()
            data["notes"] = [{"author": author, "text": brief.strip() or "(a reference picture)", "at": time.strftime("%Y-%m-%d %H:%M")}] \
                + [{"author": "Skill Scout", "text": f"Here is what I see in your picture:\n{seen}" if seen else "Proposed from your brief.",
                    "at": time.strftime("%Y-%m-%d %H:%M")}]
            sk = Skill(data=data)
            s.add(sk)
            s.flush()
            if image:
                name = f"reference-{int(time.time())}{ext}"
                open(os.path.join(_dir(sk.id), name), "wb").write(image)
                data["examples"] = [{"file": name, "caption": "The reference picture", "by": author, "kind": "reference"}]
                _save(sk, data)
            ids.append(sk.id)
    return {"ids": ids}


class SkillIn(BaseModel):
    name: str
    summary: str = ""
    kind: str = "layout"
    author: str = "Team"


@router.post("/crew/skills")
def create(body: SkillIn):
    if not body.name.strip():
        raise HTTPException(400, "Give the skill a name.")
    with session_scope() as s:
        sk = Skill(data=_new({"name": body.name.strip(), "summary": body.summary.strip(), "kind": body.kind}, body.author))
        s.add(sk)
        s.flush()
        return _out(sk)


@router.put("/crew/skills/{skill_id}")
def update(skill_id: int, body: dict):
    with session_scope() as s:
        sk = _get(s, skill_id)
        data = dict(sk.data)
        for k, v in body.items():
            if k in FIELDS:
                data[k] = v
        if body.get("status"):
            if body["status"] not in STATUSES:
                raise HTTPException(400, f"status must be one of {', '.join(STATUSES)}")
            if body["status"] == "built" and data.get("status") != "built":
                raise HTTPException(400, "A skill becomes 'built' when its renderer exists; mark it approved and it gets built.")
            data["status"] = body["status"]
        data["updated"] = time.strftime("%Y-%m-%d %H:%M")
        _save(sk, data)
        return _out(sk)


class NoteIn(BaseModel):
    author: str = "Team"
    text: str
    ask_scout: bool = True


@router.post("/crew/skills/{skill_id}/notes")
async def note(skill_id: int, body: NoteIn):
    """A message in the skill's brainstorm; the Scout answers (and may suggest changes the team can apply)."""
    if not body.text.strip():
        raise HTTPException(400, "Write something first.")
    now = time.strftime("%Y-%m-%d %H:%M")
    with session_scope() as s:
        sk = _get(s, skill_id)
        data = dict(sk.data)
        data["notes"] = data.get("notes", []) + [{"author": body.author.strip() or "Team", "text": body.text.strip(), "at": now}]
        _save(sk, data)
    if body.ask_scout:
        import anyio
        r = await anyio.to_thread.run_sync(lambda: _scout().discuss(data, data["notes"]))
        changes = {k: v for k, v in r.items() if k != "reply" and v}
        with session_scope() as s:
            sk = _get(s, skill_id)
            data = dict(sk.data)
            data["notes"] = data.get("notes", []) + [{"author": "Skill Scout", "text": r["reply"], "at": time.strftime("%Y-%m-%d %H:%M"),
                                                      **({"changes": changes} if changes else {})}]
            _save(sk, data)
    with session_scope() as s:
        return _out(_get(s, skill_id))


@router.post("/crew/skills/{skill_id}/notes/{n}/apply")
def apply(skill_id: int, n: int):
    """Apply the changes the Scout suggested in note n."""
    with session_scope() as s:
        sk = _get(s, skill_id)
        data = dict(sk.data)
        notes = data.get("notes", [])
        if n >= len(notes) or not notes[n].get("changes"):
            raise HTTPException(404, "no changes to apply in that note")
        data.update({k: v for k, v in notes[n]["changes"].items() if k in FIELDS})
        notes[n] = {**notes[n], "applied": True}
        data["notes"], data["updated"] = notes, time.strftime("%Y-%m-%d %H:%M")
        _save(sk, data)
        return _out(sk)


@router.post("/crew/skills/{skill_id}/examples")
async def upload(skill_id: int, caption: str = Form(""), author: str = Form("Team"), file: UploadFile = File(...)):
    """Add an example: a picture (e.g. a slide made from the skill's image prompt) or a short video, uploaded or pasted."""
    ext = os.path.splitext((file.filename or "").lower())[1]
    if not ext and file.content_type:  # pasted media can arrive without a usable file name
        ext = next((e for e, t in {**IMAGE_TYPES, **VIDEO_TYPES}.items() if t == file.content_type), "")
    video = ext in VIDEO_TYPES
    if ext not in IMAGE_TYPES and not video:
        raise HTTPException(400, "Add a PNG, JPG or WEBP picture, or an MP4, WEBM or MOV video.")
    blob = await file.read()
    if len(blob) > (80 if video else 12) * 1024 * 1024:
        raise HTTPException(400, f"That file is too big ({80 if video else 12} MB max).")
    with session_scope() as s:
        sk = _get(s, skill_id)
        name = f"example-{int(time.time() * 1000)}{ext}"
        open(os.path.join(_dir(skill_id), name), "wb").write(blob)
        data = dict(sk.data)
        data["examples"] = data.get("examples", []) + [{"file": name, "caption": caption.strip(), "by": author, "kind": "video" if video else "example"}]
        _save(sk, data)
        return _out(sk)


@router.post("/crew/skills/{skill_id}/sample")
async def sample(skill_id: int):
    """The Scout draws a sample slide from the skill's image prompt (Gemini image model)."""
    with session_scope() as s:
        prompt = (_get(s, skill_id).data or {}).get("image_prompt") or ""
    if not prompt:
        raise HTTPException(400, "This skill has no image prompt yet.")
    import anyio
    png = await anyio.to_thread.run_sync(lambda: _scout().sample(prompt))
    if not png:
        raise HTTPException(502, "The image model returned no picture; try again.")
    with session_scope() as s:
        sk = _get(s, skill_id)
        name = f"sample-{int(time.time() * 1000)}.png"
        open(os.path.join(_dir(skill_id), name), "wb").write(png)
        data = dict(sk.data)
        data["examples"] = data.get("examples", []) + [{"file": name, "caption": "Sample drawn by Gemini from the image prompt (text may be imperfect)",
                                                        "by": "Skill Scout", "kind": "sample"}]
        _save(sk, data)
        return _out(sk)


@router.delete("/crew/skills/{skill_id}/examples/{file}")
def remove_example(skill_id: int, file: str):
    with session_scope() as s:
        sk = _get(s, skill_id)
        data = dict(sk.data)
        data["examples"] = [e for e in data.get("examples", []) if e["file"] != file]
        _save(sk, data)
        return _out(sk)
