"""The Skill Tab: slide skills, reusable looks for slide films learned from reference slides (video/slideskill.py).

A skill is a Skill row with data.type == "look" (the crew's idea library uses the same table without it). The agent runs
as a background process and writes its progress into the row (state: working | ready | failed, log)."""

import json
import os
import re
import shutil
import subprocess
import sys

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.api.studio import ASSETS, BACKEND, PUBLIC, VIDEO
from app.db import session_scope
from app.models import Skill, Setting

router = APIRouter()
IMAGE_TYPES = (".png", ".jpg", ".jpeg", ".webp")
LAYOUTS, SOURCES, FRAMES = ("card", "picture_right", "on_picture"), ("qwen", "wikimedia"), ("print", "blend", "blob")


def _dir(skill_id: int) -> str:
    d = os.path.join(PUBLIC, "skills", str(skill_id))
    os.makedirs(d, exist_ok=True)
    return d


def _spawn(skill_id: int, do: str = "all", *extra: str) -> None:
    log = open(os.path.join(_dir(skill_id), "agent.log"), "a")
    subprocess.Popen([sys.executable, "-u", os.path.join(VIDEO, "slideskill.py"), "--skill", str(skill_id), "--do", do, *extra],
                     cwd=BACKEND, stdout=log, stderr=subprocess.STDOUT)


def _url(skill_id: int, name: str) -> str | None:
    path = os.path.join(PUBLIC, "skills", str(skill_id), name)
    return f"{ASSETS}/skills/{skill_id}/{name}?v={int(os.path.getmtime(path))}" if os.path.exists(path) else None


def _out(row: Skill, names: dict[int, str] | None = None) -> dict:
    d = dict(row.data or {})
    look = d.get("look")
    canvas = None
    if look:
        sys.path.insert(0, VIDEO) if VIDEO not in sys.path else None
        import slideskill
        canvas = slideskill.canvas_of(look)
    return {"id": row.id, "name": d.get("name"), "subject": d.get("subject"), "collection_subject": d.get("collection_subject", "Physics"), "notes": d.get("notes", ""), "summary": d.get("summary", ""),
            "extends": slideskill_parents(d),
            "backgrounds": [{**b, "plate_url": _url(row.id, b.get("plate") or ""), "sample_url": _url(row.id, b.get("sample") or "")}
                            for b in ((look or {}).get("backgrounds") or {}).values()],
            "extends_name": " + ".join(n for n in ((names or {}).get(i) for i in slideskill_parents(d)) if n) or None,
            "look": look, "canvas": canvas, "demo": _demo(d),
            "not_matched": d.get("not_matched") or [], "code_notes": d.get("code_notes") or [], "history": d.get("history") or [],
            "assets": [{"name": n, "url": _url(row.id, n)} for n in d.get("assets") or []],
            "sample": d.get("sample"), "state": d.get("state", "working"), "log": (d.get("log") or [])[-10:],
            "references": [u for u in (_url(row.id, n) for n in d.get("references") or []) if u],
            "plate": _url(row.id, "plate.png"), "samples": [u for u in (_url(row.id, n) for n in d.get("samples") or []) if u],
            "created_at": row.created_at}


def slideskill_parents(d: dict) -> list[int]:
    e = d.get("extends")
    return [int(x) for x in (e if isinstance(e, list) else [e] if e else [])]


def _demo(d: dict) -> dict | None:
    """The skill's 1-minute demo film (an audio film made with it): its state and video."""
    fid = d.get("demo_film")
    if not fid:
        return None
    from app.api.audio import _summary
    from app.models import Film
    with session_scope() as s:
        f = s.get(Film, fid)
        if not f:  # the demo film was deleted
            return None
        out = _summary(f)
        return {"id": fid, "state": out["state"], "video": out["video"]}


def _looks(s) -> list[Skill]:
    return [r for r in s.scalars(select(Skill).order_by(Skill.id.desc())) if (r.data or {}).get("type") == "look"]


def _get(s, skill_id: int) -> Skill:
    row = s.get(Skill, skill_id)
    if not row or (row.data or {}).get("type") != "look":
        raise HTTPException(404, "skill not found")
    return row


def _subjects(s) -> Setting:
    registry = s.get(Setting, "slide_skill_subjects")
    if registry is None:
        registry = Setting(key="slide_skill_subjects", value={"names": ["Physics"]})
        s.add(registry)
        # Existing styles belong to Physics; keep their original sample subjects and assets.
        for row in _looks(s):
            row.data = {**row.data, "collection_subject": "Physics"}
        s.flush()
    return registry


def init_subjects() -> None:
    with session_scope() as s:
        _subjects(s)


@router.get("/slide-skill-subjects")
def subjects():
    with session_scope() as s:
        return _subjects(s).value["names"]


class SubjectIn(BaseModel):
    name: str


@router.post("/slide-skill-subjects")
def create_subject(body: SubjectIn):
    name = " ".join(body.name.split())
    if not name or len(name) > 80:
        raise HTTPException(400, "Enter a subject name of 1–80 characters.")
    with session_scope() as s:
        registry = _subjects(s)
        names = registry.value["names"]
        existing = next((n for n in names if n.casefold() == name.casefold()), None)
        if existing:
            return {"name": existing}
        registry.value = {"names": [*names, name]}
        return {"name": name}


@router.get("/slide-skills")
def skills():
    with session_scope() as s:
        _subjects(s)
        rows = _looks(s)
        names = {r.id: (r.data or {}).get("name") for r in rows}
        return [_out(r, names) for r in rows]


@router.get("/slide-skills/{skill_id}")
def skill(skill_id: int):
    with session_scope() as s:
        row = _get(s, skill_id)
        names = {r.id: (r.data or {}).get("name") for r in _looks(s)}
        return _out(row, names)


@router.post("/slide-skills")
async def create(data: str = Form(...), files: list[UploadFile] = File(default=[]), assets: list[UploadFile] = File(default=[])):
    try:
        cfg = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(400, "bad data")
    name = (cfg.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Give the skill a name.")
    ext = cfg.get("extends") or []
    ext = [int(x) for x in (ext if isinstance(ext, list) else [ext])]
    refs = [f for f in files if f.filename and f.filename.lower().endswith(IMAGE_TYPES)]
    if not refs and not assets and not (cfg.get("notes") or "").strip() and len(ext) < 2:
        raise HTTPException(400, "Add reference slides, describe the look in the notes, or pick skills to combine.")
    with session_scope() as s:
        subject = " ".join((cfg.get("subject") or "").split())
        subject = next((n for n in _subjects(s).value["names"] if n.casefold() == subject.casefold()), None)
        if not subject:
            raise HTTPException(400, "Choose a subject, or create it first.")
        for i in ext:
            parent = _get(s, i).data or {}
            if parent.get("collection_subject", "Physics") != subject:
                raise HTTPException(400, "Build on skills from the same subject.")
            if parent.get("state") != "ready":
                raise HTTPException(409, "A skill it builds on isn't ready yet.")
        row = Skill(data={"type": "look", "name": name, "subject": subject, "collection_subject": subject,
                          "notes": (cfg.get("notes") or "").strip(), "extends": ext, "references": [], "state": "working", "log": []})
        s.add(row)
        s.flush()
        folder, names, own = _dir(row.id), [], []
        for k, f in enumerate(refs):
            n = f"ref-{k + 1:02d}{os.path.splitext(f.filename)[1].lower()}"
            with open(os.path.join(folder, n), "wb") as fh:
                while chunk := await f.read(1 << 20):
                    fh.write(chunk)
            names.append(n)
        for f in assets:  # the creator's own images, used exactly as uploaded (a background, stickers, a logo)
            if not (f.filename and f.filename.lower().endswith(IMAGE_TYPES)):
                continue
            n = "asset-" + re.sub(r"[^\w.\-]", "_", os.path.basename(f.filename))[:80]
            with open(os.path.join(folder, n), "wb") as fh:
                while chunk := await f.read(1 << 20):
                    fh.write(chunk)
            own.append(n)
        row.data = {**row.data, "references": names, "assets": own}
        flag_modified(row, "data")
        skill_id = row.id
    _spawn(skill_id)
    with session_scope() as s:
        return _out(_get(s, skill_id))


class LookIn(BaseModel):
    name: str | None = None
    subject: str | None = None
    layout: str = "card"
    picture_source: str
    picture_style: str = ""
    frame: str = "print"
    background: str = ""
    tape: str = ""
    interlude: bool = False
    interlude_mode: str = "seconds"
    interlude_seconds: float = 2.5
    read_seconds: float = 3.0
    break_style: str = "zoom"
    break_shape: str = "arch"
    break_text: str = "labels"


@router.put("/slide-skills/{skill_id}")
def save(skill_id: int, body: LookIn):
    """The human's edits to the look; the sample is made again (and the background, if it changed)."""
    if body.layout not in LAYOUTS or body.picture_source not in SOURCES or body.frame not in FRAMES:
        raise HTTPException(400, "bad layout, picture source or frame")
    if body.tape and not re.fullmatch(r"#[0-9a-fA-F]{6}", body.tape):
        raise HTTPException(400, "tape must be a colour like #8bc34a, or empty")
    with session_scope() as s:
        row = _get(s, skill_id)
        d = dict(row.data or {})
        if d.get("state") == "working":
            raise HTTPException(409, "The agent is still working on this skill.")
        old = d.get("look") or {}
        look = {**old, "layout": body.layout, "picture_source": body.picture_source, "picture_style": body.picture_style.strip(),
                "frame": body.frame, "background": body.background.strip(), "tape": body.tape, "interlude": body.interlude,
                "interlude_mode": "until_next" if body.interlude_mode == "until_next" else "seconds",
                "read_seconds": min(8.0, max(1.0, body.read_seconds)),
                "break_style": body.break_style if body.break_style in ("zoom", "framed", "full") else "zoom",
                "break_shape": body.break_shape if body.break_shape in ("arch", "rounded", "rect", "oval", "circle") else "arch",
                "break_text": body.break_text if body.break_text in ("labels", "caption", "none") else "labels",
                "interlude_seconds": min(10.0, max(1.5, body.interlude_seconds))}
        d.update(look=look, state="working", name=(body.name or d.get("name") or "").strip(), subject=(body.subject or d.get("subject") or "").strip())
        row.data = d
        flag_modified(row, "data")
    _spawn(skill_id, "plate" if look["background"] != old.get("background") else "sample")
    return skill(skill_id)


class FeedbackIn(BaseModel):
    text: str


@router.post("/slide-skills/{skill_id}/feedback")
def feedback(skill_id: int, body: FeedbackIn):
    """The creator tells the agent what to change ("put the picture in an oval on the left"); it changes only that."""
    import time
    if not body.text.strip():
        raise HTTPException(400, "Write what should change.")
    with session_scope() as s:
        row = _get(s, skill_id)
        d = dict(row.data or {})
        if d.get("state") == "working":
            raise HTTPException(409, "The agent is still working on this skill.")
        d["history"] = (d.get("history") or []) + [{"text": body.text.strip(), "at": time.strftime("%d %b %H:%M")}]
        d["state"] = "working"
        row.data = d
        flag_modified(row, "data")
    _spawn(skill_id, "feedback")
    return skill(skill_id)


@router.post("/slide-skills/{skill_id}/backgrounds")
async def add_background(skill_id: int, subject: str = Form(...), notes: str = Form(""), file: UploadFile | None = File(default=None)):
    """A background for one subject inside this skill (painted in its style, or the creator's own image). Films of that
    subject use it; the rest of the skill is untouched."""
    if not subject.strip():
        raise HTTPException(400, "Say which subject the background is for.")
    asset = ""
    with session_scope() as s:
        row = _get(s, skill_id)
        d = dict(row.data or {})
        if d.get("state") == "working":
            raise HTTPException(409, "The agent is still working on this skill.")
        if not os.path.exists(os.path.join(_dir(skill_id), "sample.json")):
            raise HTTPException(409, "Make the skill's sample first.")
        if file and file.filename and file.filename.lower().endswith(IMAGE_TYPES):
            asset = "bg-" + re.sub(r"[^\w.\-]", "_", os.path.basename(file.filename))[:80]
            with open(os.path.join(_dir(skill_id), asset), "wb") as fh:
                while chunk := await file.read(1 << 20):
                    fh.write(chunk)
        row.data = {**d, "state": "working"}
        flag_modified(row, "data")
    _spawn(skill_id, "background", "--subject", subject.strip(), "--notes", notes.strip(), "--asset", asset)
    return skill(skill_id)


@router.delete("/slide-skills/{skill_id}/backgrounds/{key}")
def delete_background(skill_id: int, key: str):
    with session_scope() as s:
        row = _get(s, skill_id)
        d = dict(row.data or {})
        look = dict(d.get("look") or {})
        look["backgrounds"] = {k: v for k, v in (look.get("backgrounds") or {}).items() if k != key}
        row.data = {**d, "look": look}
        flag_modified(row, "data")
    return skill(skill_id)


DEMO = os.path.join(PUBLIC, "skills", "demo.m4a")  # one minute of a real lecture, the same for every skill's demo


DEMO2 = os.path.join(PUBLIC, "skills", "demo2.m4a")  # the same lecture's first two minutes (a mix skill shows all its looks)
DEMO3 = os.path.join(PUBLIC, "skills", "demo3.m4a")  # its first three minutes (a skill with many break techniques)


@router.post("/slide-skills/{skill_id}/demo")
def demo(skill_id: int, minutes: int = 1):
    """A 1-minute demo film of the skill: the demo recording made into an audio film with this skill (scene check
    approved automatically)."""
    if not os.path.exists(DEMO):
        raise HTTPException(409, "There is no demo recording (video/public/skills/demo.m4a).")
    from app.api.audio import _spawn as spawn_film
    from app.models import Film
    with session_scope() as s:
        row = _get(s, skill_id)
        d = dict(row.data or {})
        if d.get("state") != "ready":
            raise HTTPException(409, "The skill isn't ready yet.")
        cfg = {"title": f"Demo: {d.get('name')}", "subject": d.get("subject") or "", "language": "Hinglish", "style": "",
               "file": "demo.m4a", "auto_approve": True}
        f = Film(slug="", kind="audio", config=cfg, minutes=0, format="audio", voices={})
        s.add(f)
        s.flush()
        f.slug = f"audio{f.id}"
        base = os.path.join(PUBLIC, f.slug)
        os.makedirs(os.path.join(base, "source"), exist_ok=True)
        src = {2: DEMO2, 3: DEMO3}.get(minutes, DEMO)
        shutil.copy(src if os.path.exists(src) else DEMO, os.path.join(base, "source", "demo.m4a"))
        cfg["look"] = film_look(skill_id, base, cfg["subject"])
        f.config = dict(cfg)
        json.dump(cfg, open(os.path.join(base, "config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        f.pid = spawn_film(f.slug, "--stage", "plan")
        row.data = {**d, "demo_film": f.id}
        flag_modified(row, "data")
    return skill(skill_id)


@router.post("/slide-skills/{skill_id}/remake")
def remake(skill_id: int, what: str = "sample"):
    """Make the sample again (new pictures), or the background too, or everything (the agent reads the references again)."""
    if what not in ("sample", "plate", "all"):
        raise HTTPException(400, "what = sample | plate | all")
    with session_scope() as s:
        row = _get(s, skill_id)
        if (row.data or {}).get("state") == "working":
            raise HTTPException(409, "The agent is still working on this skill.")
        row.data = {**row.data, "state": "working"}
        flag_modified(row, "data")
    _spawn(skill_id, what)
    return skill(skill_id)


@router.delete("/slide-skills/{skill_id}")
def delete(skill_id: int):
    with session_scope() as s:
        row = _get(s, skill_id)
        if any(skill_id in slideskill_parents(r.data or {}) for r in _looks(s)):
            raise HTTPException(409, "Another skill is built on this one; delete that one first.")
        s.delete(row)
    shutil.rmtree(os.path.join(PUBLIC, "skills", str(skill_id)), ignore_errors=True)
    return {"ok": True}


BACKDROP_CANVAS = {"card": {"x": 110, "y": None, "w": 1000},  # x: the photo's calmer side, chosen per slide
                   "slots": [{"fill": "scene", "x": 0, "y": 0, "w": 1920, "h": 1080, "shape": "rect", "frame": "none", "rotate": 0, "layer": "behind"}]}


def mix_look(d: dict, skill_id: int, film_dir: str, subject: str) -> dict:
    """A mix skill's film look: each look it mixes (cartoon, photo) copied in as its own variant, plus backdrop: the
    photo look's real photos filling the screen under a glass card. The plan picks one per slide."""
    m = d["look"]["mix"]
    variants = {name: film_look(int(sid), film_dir, subject, prefix=f"{name}-") for name, sid in m.items()}
    for v in variants.values():  # every look in the mix zooms its picture the same way, for the mix's own hold time
        v.update(interlude=True, break_style="zoom", break_text=d["look"].get("break_text") or "labels",
                 techniques=d["look"].get("techniques") or [],
                 interlude_seconds=d["look"].get("interlude_seconds") or v.get("interlude_seconds") or 4.0,
                 read_seconds=d["look"].get("read_seconds") or v.get("read_seconds") or 3.0)
    photo = variants.get("photo") or next(iter(variants.values()))
    if d["look"].get("backdrop"):  # the glass-card backdrop is only in a mix that asks for it
        variants["backdrop"] = {**photo, "plate": None, "canvas": BACKDROP_CANVAS, "glass": True, "interlude": False, "tape": None}
    cartoon = variants.get("cartoon") or photo
    return {"mix": True, "skill": d.get("name"), "skill_id": skill_id, "variants": variants, "plate": cartoon.get("plate"),
            "techniques": d["look"].get("techniques") or [],
            "interlude": True, "break_style": "zoom", "break_text": "labels"}


def film_look(skill_id: int, film_dir: str, subject: str = "", prefix: str = "") -> dict:
    """The look a new film uses: the skill's look, with its background, stickers and the creator's images copied into
    the film's own folder (the renderer only sees the film's folder; editing the skill later leaves the film alone)."""
    import copy
    with session_scope() as s:
        row = _get(s, skill_id)
        d = dict(row.data or {})
    if d.get("state") != "ready" or not d.get("look"):
        raise HTTPException(409, f"The skill '{d.get('name')}' isn't ready yet.")
    if d["look"].get("mix"):
        return mix_look(d, skill_id, film_dir, subject)
    sys.path.insert(0, VIDEO) if VIDEO not in sys.path else None
    import slideskill
    src_dir, dst_dir = os.path.join(PUBLIC, "skills", str(skill_id)), os.path.join(film_dir, "look")
    os.makedirs(dst_dir, exist_ok=True)

    def take(name: str | None) -> str | None:
        if not name or not os.path.exists(os.path.join(src_dir, name)):
            return None
        shutil.copy(os.path.join(src_dir, name), os.path.join(dst_dir, prefix + name))
        return f"look/{prefix}{name}"

    look = copy.deepcopy(d["look"])
    canvas = copy.deepcopy(slideskill.canvas_of(look))
    if canvas:
        for sl in canvas["slots"]:
            if sl["fill"] in ("sticker", "asset"):
                sl["src"] = take(sl.get("src"))
        canvas["slots"] = [sl for sl in canvas["slots"] if sl["fill"] not in ("sticker", "asset") or sl.get("src")]
    own = (look.get("backgrounds") or {}).get(slideskill.subject_key(subject)) if subject.strip() else None
    look.update(skill=d.get("name"), skill_id=skill_id, canvas=canvas,
                plate=(take(own.get("plate")) if own else None) or take("plate.png") or take(look.get("background_asset")))
    if own:
        look["background"] = own.get("background", "")
    if look.get("alt_plate"):  # a second background some slides use (the documentary look's landscape layout)
        look["alt_plate"] = take(look["alt_plate"])
    return look
