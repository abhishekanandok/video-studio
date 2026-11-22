"""Cinema Studio API: short cinematic AI films, step by step (see video/cinema.py). Every step is started by the creator;
the costly ones (Veo) show their price first."""
import json
import os
import sys

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.studio import PUBLIC, VIDEO

sys.path.insert(0, VIDEO)
import cinema  # noqa: E402

router = APIRouter()
ASSETS, OUT = "/studio-assets", "/studio-out"


def _url(rel: str | None) -> str | None:
    if not rel:
        return None
    name, _, q = rel.partition("?")
    f = os.path.join(PUBLIC, name)
    return f"{ASSETS}/{name}?v={int(os.path.getmtime(f))}" if os.path.exists(f) else None


def _get(slug: str) -> dict:
    if not os.path.exists(cinema.path(slug, "project.json")):
        raise HTTPException(404, "no such film")
    p = cinema.load(slug)
    if p.get("busy") and not cinema.alive(p.get("pid")):  # the step's process ended without saying so
        p["busy"] = None
        cinema.save(slug, p)
    return p


def _view(p: dict) -> dict:
    slug = p["slug"]
    out = json.loads(json.dumps(p))
    for x in out["characters"] + out["props"]:
        base = f"cinema/{slug}/{'char' if x in out['characters'] else 'prop'}-{x['id']}"
        x["sheet_url"] = _url(x.get("sheet"))
        x["portrait_url"] = _url(base + "-portrait.png")
    for s in out["shots"]:
        s["frame_url"], s["clip_url"], s["vo_url"] = _url(s.get("frame")), _url(s.get("clip")), _url(s.get("vo"))
        for t in s.get("takes", []):
            t["url"] = _url(t["clip"])
    film = os.path.join(VIDEO, "out", p["film"]) if p.get("film") else None
    out["film_url"] = f"{OUT}/{p['film']}?v={int(os.path.getmtime(film))}" if film and os.path.exists(film) else None
    out["estimate"] = cinema.estimate(p)
    cost = cinema.path(slug, "cost.json")
    out["spent"] = round(json.load(open(cost)).get("total_usd", 0), 2) if os.path.exists(cost) else 0
    out["voices"] = list(cinema.VOICES)
    return out


class NewFilm(BaseModel):
    idea: str
    seconds: int = 60
    voice: str = "Algenib"
    veo_sound: bool = True


@router.get("/cinema")
def list_films():
    return cinema.projects()


@router.post("/cinema")
def new_film(body: NewFilm):
    if len(body.idea.strip()) < 10:
        raise HTTPException(400, "Describe the film in a sentence or two.")
    slug = cinema.create(body.idea, max(20, min(180, body.seconds)), body.voice, body.veo_sound)
    cinema.run(slug, "story")
    return _view(_get(slug))


@router.get("/cinema/{slug}")
def get_film(slug: str):
    return _view(_get(slug))


EDITABLE = ("idea", "seconds", "voice", "veo_sound", "story", "characters", "props", "look", "shots")


@router.put("/cinema/{slug}")
def edit_film(slug: str, body: dict):
    """The creator's edits to any part of the plan (story, characters, props, look, shots and their narration)."""
    p = _get(slug)
    if p.get("busy"):
        raise HTTPException(409, f"wait: {p['busy']} is running")
    for k in EDITABLE:
        if k in body:
            p[k] = body[k]
    for i, s in enumerate(p["shots"]):
        s["n"] = i + 1
        if s.get("seconds") not in cinema.DURATIONS:
            s["seconds"] = 8
    cinema.save(slug, p)
    return _view(p)


class RunIn(BaseModel):
    step: str
    arg: str = ""


@router.post("/cinema/{slug}/run")
def run_step(slug: str, body: RunIn):
    p = _get(slug)
    if body.step not in cinema.STEPS:
        raise HTTPException(400, "unknown step")
    if p.get("busy"):
        raise HTTPException(409, f"wait: {p['busy']} is running")
    cinema.run(slug, body.step, body.arg)
    return _view(_get(slug))


class FixIn(BaseModel):
    note: str = ""


@router.post("/cinema/{slug}/shots/{n}/retake")
def retake(slug: str, n: int, body: FixIn):
    """Make one shot again with Veo, with the director's correction note (the other shots are kept)."""
    p = _get(slug)
    if p.get("busy"):
        raise HTTPException(409, f"wait: {p['busy']} is running")
    cinema.fix_shot(slug, n, body.note)
    cinema.run(slug, "shots", str(n))
    return _view(_get(slug))


class TakeIn(BaseModel):
    take: int


@router.post("/cinema/{slug}/shots/{n}/use")
def use_take(slug: str, n: int, body: TakeIn):
    p = _get(slug)
    for s in p["shots"]:
        if s["n"] == n and 0 <= body.take < len(s.get("takes", [])):
            s["clip"] = s["takes"][body.take]["clip"]
    cinema.save(slug, p)
    return _view(p)
