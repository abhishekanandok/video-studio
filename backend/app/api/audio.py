"""Audio films: upload a recorded lecture, get a slide film cut to it (video/audiofilm.py).

The pipeline runs in two stages around one gate: "plan" (transcript + scenes) stops at stage "waiting"; the human edits
the scenes here and approves; "build" makes the pictures, renders every scene and lays the recording over the film.
"""

import json
import os
import re
import subprocess
import sys

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select

from app.api.studio import ASSETS, BACKEND, OUT, PUBLIC, VIDEO, _alive, _read
from app.db import session_scope
from app.models import Film

router = APIRouter()
AUDIO_TYPES = (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".flac", ".webm", ".mp4")


def _spawn(slug: str, *extra: str) -> int:
    log = open(os.path.join(PUBLIC, slug, "pipeline.log"), "a")
    args = [sys.executable, "-u", os.path.join(VIDEO, "audiofilm.py"), "--out", slug, *extra]
    return subprocess.Popen(args, cwd=BACKEND, stdout=log, stderr=subprocess.STDOUT).pid


def _film(s, film_id: int) -> Film:
    f = s.get(Film, film_id)
    if not f or f.kind != "audio":
        raise HTTPException(404, "audio film not found")
    return f


def _summary(f: Film, full: bool = False) -> dict:
    base = os.path.join(PUBLIC, f.slug)
    st = _read(os.path.join(base, "status.json"), {}) or {}
    if not st.get("log"):  # missing or damaged (a crash mid-write): the film's own printed log instead
        import sys
        sys.path.insert(0, VIDEO) if VIDEO not in sys.path else None
        import doc
        st = {**st, "log": doc.log_from(base)}
    plan = _read(os.path.join(base, "plan.json"))
    running = _alive(f.pid)
    stage = st.get("stage", "queued")
    state = "running" if running else "waiting" if stage == "waiting" else "checkpics" if stage == "checkpics" else \
        "done" if stage == "done" else \
        "failed" if stage == "failed" else "stopped"
    video = st.get("video")
    path = os.path.join(VIDEO, "out", video) if video else ""
    cfg = f.config or {}
    out = {"id": f.id, "slug": f.slug, "title": (plan or {}).get("title") or cfg.get("title") or cfg.get("file") or "Untitled",
           "subject": cfg.get("subject"), "file": cfg.get("file"), "state": state, "running": running, "stage": stage,
           "counts": (st.get("stages") or {}).get(stage, {}), "log": (st.get("log") or [])[-12:],
           "scenes_count": len((plan or {}).get("scenes", [])), "created_at": f.created_at,
           "cost": _read(os.path.join(base, "cost.json")),
           "video": f"{OUT}/{video}?v={int(os.path.getmtime(path))}" if path and os.path.exists(path) else None}
    if full:
        tr = _read(os.path.join(base, "transcript.json")) or {}
        pics = _read(os.path.join(base, "images.json"), {}) or {}
        scenes = []
        for i, s in enumerate((plan or {}).get("scenes", [])):
            pic = pics.get(s["key"]) or {}
            mp4, js = os.path.join(base, "render", f"scene{i:03d}.mp4"), os.path.join(base, "render", f"scene{i:03d}.json")
            fresh = os.path.exists(mp4) and os.path.exists(js) and os.path.getmtime(mp4) >= os.path.getmtime(js)
            scenes.append({**s, "image": f"{ASSETS}/{f.slug}/{pic['src']}?v={int(os.path.getmtime(os.path.join(base, pic['src'])))}"
                           if pic.get("src") and os.path.exists(os.path.join(base, pic["src"])) else None,
                           "credit": pic.get("credit", ""), "drawn": bool(pic.get("drawn")),
                           "prompt": pic.get("prompt") or "", "precise": bool(pic.get("precise")), "own": bool(pic.get("own")),
                           "labels": [l.get("text") for l in pic.get("labels") or []],
                           "off_point": pic.get("off_point") or "",
                           "image2": f"{ASSETS}/{f.slug}/{pics[s['key'] + '-z2']['src']}" if (pics.get(s["key"] + "-z2") or {}).get("src") else None,
                           "video": f"{ASSETS}/{f.slug}/render/scene{i:03d}.mp4?v={int(os.path.getmtime(mp4))}" if fresh else None})
        out.update(scenes=scenes, duration=tr.get("duration"), language=tr.get("language"), look=cfg.get("look"),
                   config={k: v for k, v in cfg.items()})
    return out


@router.get("/audio/films")
def films():
    with session_scope() as s:
        return [_summary(f) for f in s.scalars(select(Film).where(Film.kind == "audio").order_by(Film.id.desc()))]


@router.post("/audio/films")
async def create(config: str = Form("{}"), file: UploadFile = File(...), guide_images: list[UploadFile] = File(default=[])):
    try:
        cfg = json.loads(config or "{}")
    except json.JSONDecodeError:
        raise HTTPException(400, "bad config")
    if not file.filename or not file.filename.lower().endswith(AUDIO_TYPES):
        raise HTTPException(400, "Upload an audio file (MP3, WAV, M4A, AAC, OGG, OPUS, FLAC, WEBM or MP4).")
    name = re.sub(r"[^\w.\- ]", "_", os.path.basename(file.filename))[:120]
    with session_scope() as s:
        film_cfg = {"title": (cfg.get("title") or "").strip(), "subject": (cfg.get("subject") or "").strip(),
                    "language": cfg.get("language") or "Hinglish", "style": (cfg.get("style") or "").strip(), "file": name,
                    "guide": (cfg.get("guide") or "").strip()[:4000]}
        skill_id = int(cfg["skill"]) if cfg.get("skill") else None
        f = Film(slug="", kind="audio", config=film_cfg, minutes=0, format="audio", voices={})
        s.add(f)
        s.flush()
        f.slug = f"audio{f.id}"
        base = os.path.join(PUBLIC, f.slug)
        os.makedirs(os.path.join(base, "source"), exist_ok=True)
        if skill_id:  # the slide skill's look, copied into the film (editing the skill later leaves this film alone)
            from app.api.slideskills import film_look
            film_cfg["look"] = film_look(skill_id, base, film_cfg["subject"])
            f.config = dict(film_cfg)
        with open(os.path.join(base, "source", name), "wb") as fh:
            while chunk := await file.read(1 << 20):
                fh.write(chunk)
        shown = []  # the creator's example images for the writing guide (the planner sees them)
        for k, g in enumerate(guide_images[:6]):
            ext = os.path.splitext(g.filename or "")[1].lower()
            if ext not in (".png", ".jpg", ".jpeg", ".webp"):
                continue
            os.makedirs(os.path.join(base, "guide"), exist_ok=True)
            open(os.path.join(base, "guide", f"{k + 1:02d}{ext}"), "wb").write(await g.read())
            shown.append(f"guide/{k + 1:02d}{ext}")
        if shown:
            film_cfg["guide_images"] = shown
            f.config = dict(film_cfg)
        json.dump(film_cfg, open(os.path.join(base, "config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        f.pid = _spawn(f.slug, "--stage", "plan")
        return _summary(f)


@router.get("/audio/films/{film_id}")
def film(film_id: int):
    with session_scope() as s:
        return _summary(_film(s, film_id), full=True)


class BulletIn(BaseModel):
    text: str
    key: list[str] = []
    green: list[str] = []
    line: int
    picture: str = ""
    picture_break: bool | None = None


class SceneIn(BaseModel):
    key: str
    kind: str
    section: str = ""
    title: str = ""
    bullets: list[BulletIn] = []
    picture: str = ""
    image_text: str = ""
    search: list[str] = []
    picture_break: bool | None = None


class PlanIn(BaseModel):
    title: str = ""
    scenes: list[SceneIn]


@router.put("/audio/films/{film_id}/plan")
def save_plan(film_id: int, body: PlanIn):
    """The human's edits to the scenes (what is shown); scene timings stay as cut from the recording."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The film is still being made; wait until it stops.")
        path = os.path.join(PUBLIC, f.slug, "plan.json")
        plan = _read(path)
        if not plan:
            raise HTTPException(409, "There are no scenes yet.")
        by_key = {x.key: x for x in body.scenes}
        by_old = {sc["key"]: [dict(b) for b in sc.get("bullets", [])] for sc in plan["scenes"]}
        pics_path = os.path.join(PUBLIC, f.slug, "images.json")
        pics = _read(pics_path, {}) or {}
        for sc in plan["scenes"]:
            e = by_key.get(sc["key"])
            if not e:
                continue
            if e.kind not in ("picture", "slide"):
                raise HTTPException(400, f"{sc['key']}: kind must be picture or slide")
            what_changed = (e.kind, e.picture.strip(), e.image_text.strip()) != (sc["kind"], sc.get("picture", ""), sc.get("image_text", ""))
            if what_changed:
                pics.pop(sc["key"], None)  # the picture no longer fits: made again
            if e.picture_break is not None:
                sc["picture_break"] = e.picture_break
            sc.update(kind=e.kind, section=e.section.strip(), title=e.title.strip(), picture=e.picture.strip(),
                      image_text=e.image_text.strip(), search=[x for x in e.search if x.strip()])
            lo, hi = sc["first"], sc["last"]
            sc["bullets"] = [] if e.kind == "picture" else [
                {"text": b.text.strip(), "key": [k for k in b.key if k.strip() and k.lower() in b.text.lower()],
                 "green": [g for g in b.green if g.strip() and g.lower() in b.text.lower()], "line": min(max(b.line, lo), hi),
                 "picture": b.picture.strip(), **({"picture_break": b.picture_break} if b.picture_break is not None else {})}
                for b in e.bullets if b.text.strip()]
            for k, b in enumerate(sc["bullets"]):  # a bullet's picture break no longer fits its new idea: made again
                prev = by_old.get(sc["key"]) or []
                if k >= len(prev) or (prev[k].get("picture") or "") != b["picture"]:
                    pics.pop(f"{sc['key']}-b{k}", None)
            if e.kind == "slide" and not sc["bullets"]:
                sc["bullets"] = [{"text": sc["title"] or sc["section"], "key": [], "green": [], "line": lo}]
        if body.title.strip():
            plan["title"] = body.title.strip()
        json.dump(plan, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        json.dump(pics, open(pics_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        return _summary(f, full=True)


@router.post("/audio/films/{film_id}/approve")
def approve(film_id: int):
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The film is still being made.")
        if not _read(os.path.join(PUBLIC, f.slug, "plan.json")):
            raise HTTPException(409, "There are no scenes yet.")
        ok = os.path.join(PUBLIC, f.slug, "pictures_ok.json")
        if os.path.exists(ok):  # new scenes: their pictures are checked again
            os.remove(ok)
        f.pid = _spawn(f.slug, "--stage", "build")
        return _summary(f)


@router.post("/audio/films/{film_id}/scenes/{n}/picture")
async def repaint(film_id: int, n: int, prompt: str = Form(""), exact: bool = Form(False), note: str = Form(""),
                  kind: str = Form(""), ref: UploadFile | None = File(None)):
    """The picture check: redraw scene n's picture (n = 1 for the first) from the creator's own prompt; exact = a clean
    notebook-style diagram. The film waits at the picture check again afterwards."""
    data = await ref.read() if ref is not None and ref.filename else b""
    if not prompt.strip() and not note.strip() and not data:
        raise HTTPException(400, "Write the prompt, or say what is wrong, or add a reference image.")
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The film is still being made.")
        path = os.path.join(PUBLIC, f.slug, "plan.json")
        plan = _read(path)
        if not plan or not 1 <= n <= len(plan["scenes"]):
            raise HTTPException(404, "no such scene")
        sc = plan["scenes"][n - 1]
        sc["picture_prompt"], sc["picture_exact"], sc["picture_note"] = prompt.strip()[:3000], exact, note.strip()[:2000]
        if kind.strip():
            sc["picture_type"] = kind.strip().lower()
        if data:
            ext = os.path.splitext(ref.filename)[1].lower()
            if ext not in (".png", ".jpg", ".jpeg", ".webp"):
                raise HTTPException(400, "The reference must be a PNG, JPG or WEBP image.")
            os.makedirs(os.path.join(PUBLIC, f.slug, "guide"), exist_ok=True)
            name = f"guide/ref-s{n:03d}-{int(__import__('time').time())}{ext}"
            open(os.path.join(PUBLIC, f.slug, name), "wb").write(data)
            sc["picture_ref"] = name
        json.dump(plan, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        f.pid = _spawn(f.slug, "--stage", "picture", "--scene", str(n))
        return _summary(f)


@router.post("/audio/films/{film_id}/scenes/{n}/upload")
async def own_picture(film_id: int, n: int, file: UploadFile = File(...)):
    """The creator's own picture for scene n (n = 1 for the first), in place of the drawn one. At the picture check, its
    zoom labels are made again and the film waits; on a finished film, the scene is rendered again and the film joined."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        raise HTTPException(400, "Upload a PNG, JPG or WEBP image.")
    data = await file.read()
    if not data:
        raise HTTPException(400, "The image is empty.")
    import time
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The film is still being made.")
        base = os.path.join(PUBLIC, f.slug)
        plan, pics = _read(os.path.join(base, "plan.json")), _read(os.path.join(base, "images.json"), {}) or {}
        if not plan or not 1 <= n <= len(plan["scenes"]):
            raise HTTPException(404, "no such scene")
        key = plan["scenes"][n - 1]["key"]
        os.makedirs(os.path.join(base, "images"), exist_ok=True)
        name = f"images/{key}-own-{int(time.time())}{ext}"
        open(os.path.join(base, name), "wb").write(data)
        for k in (f"{key}-z2", f"{key}-motion"):  # its second picture and motion belonged to the old picture
            pics.pop(k, None)
        pics[key] = {"src": name, "credit": "", "drawn": False, "own": True, "uploaded": True,
                     "prompt": "(your own picture)"}
        json.dump(pics, open(os.path.join(base, "images.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        at_check = (_read(os.path.join(base, "status.json"), {}) or {}).get("stage") == "checkpics"
        f.pid = _spawn(f.slug, "--stage", "label" if at_check else "build")  # at the picture check: wait again; else remake
        return _summary(f)


class ZoomIn(BaseModel):
    zoom: bool
    second: bool = True


@router.post("/audio/films/{film_id}/scenes/{n}/zoom")
def set_zoom(film_id: int, n: int, body: ZoomIn):
    """The picture check: whether scene n's picture zooms up, and whether its zoom keeps its second picture."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The film is still being made.")
        base = os.path.join(PUBLIC, f.slug)
        plan, pics = _read(os.path.join(base, "plan.json")), _read(os.path.join(base, "images.json"), {}) or {}
        if not plan or not 1 <= n <= len(plan["scenes"]):
            raise HTTPException(404, "no such scene")
        sc = plan["scenes"][n - 1]
        sc["picture_break"], sc["zoom_off"] = body.zoom, not body.zoom
        if not body.second:
            pics.pop(f"{sc['key']}-z2", None)
            sc["no_second"] = True
        json.dump(plan, open(os.path.join(base, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        json.dump(pics, open(os.path.join(base, "images.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        return _summary(f, full=True)


@router.post("/audio/films/{film_id}/pictures/approve")
def approve_pictures(film_id: int):
    """The picture check passed: the film carries on (zooms, labels, motion, render, join)."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The film is still being made.")
        json.dump({"at": int(__import__("time").time())}, open(os.path.join(PUBLIC, f.slug, "pictures_ok.json"), "w"))
        sys.path.insert(0, VIDEO) if VIDEO not in sys.path else None
        import picrules  # every approved picture's prompt is a good example of its type
        plan = _read(os.path.join(PUBLIC, f.slug, "plan.json")) or {}
        pics = _read(os.path.join(PUBLIC, f.slug, "images.json"), {}) or {}
        for sc in plan.get("scenes", []):
            pic = pics.get(sc["key"]) or {}
            if pic.get("prompt"):
                picrules.approved(sc.get("picture_type") or "other", pic["prompt"], f"{f.slug}/{pic['src']}")
        f.pid = _spawn(f.slug, "--stage", "build")
        return _summary(f)


@router.post("/audio/films/{film_id}/scenes/{n}/redo")
def redo_picture(film_id: int, n: int):
    """Draw (or find) scene n's picture again (n = 1 for the first scene), re-render it and re-join the film."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The film is still being made.")
        f.pid = _spawn(f.slug, "--stage", "build", "--scene", str(n), "--redo", "picture")
        return _summary(f)


@router.post("/audio/films/{film_id}/continue")
def resume(film_id: int):
    """Carry on after a stop or a failure: the plan stage if there are no scenes yet, else the build (cached work kept)."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "The film is still being made.")
        has_plan = bool(_read(os.path.join(PUBLIC, f.slug, "plan.json")))
        f.pid = _spawn(f.slug, "--stage", "build" if has_plan else "plan")
        return _summary(f)


@router.post("/audio/films/{film_id}/stop")
def stop(film_id: int):
    with session_scope() as s:
        f = _film(s, film_id)
        from app import procs
        procs.stop(f.pid)
        return _summary(f)


@router.delete("/audio/films/{film_id}")
def delete(film_id: int):
    """Delete a film: its folder (recording, pictures, scenes), its video, and its row. A skill whose demo it was
    simply has no demo any more."""
    import shutil
    with session_scope() as s:
        f = _film(s, film_id)
        from app import procs
        procs.stop(f.pid)
        slug = f.slug
        s.delete(f)
    shutil.rmtree(os.path.join(PUBLIC, slug), ignore_errors=True)
    out = os.path.join(VIDEO, "out", f"{slug}.mp4")
    if os.path.exists(out):
        os.remove(out)
    return {"ok": True}
