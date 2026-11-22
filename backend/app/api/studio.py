"""Studio: make documentary films about anything, fully configurable, and watch every stage of the pipeline.

The pipeline is video/doc.py (story world -> plan -> act scripts -> images -> voices -> render). It runs as a separate
process from a config.json the Studio writes, and reports progress in video/public/<slug>/status.json.
The lesson page's one-click video is the same pipeline with a fixed preset (exam-ready, two co-hosts, Hinglish).
"""

import json
import re
import os
import subprocess
import sys

from fastapi import File, UploadFile, APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.config import settings
from app.db import session_scope
from app.models import Film, Setting

router = APIRouter()
VIDEO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "video"))
PUBLIC = os.path.join(VIDEO, "public")
ASSETS = "/studio-assets"  # video/public, mounted in main.py
OUT = "/studio-out"  # video/out
BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

LOOKS = {
    "collage": "Vox-style paper collage", "archival": "Archival photo", "illustration": "Cinematic illustration",
    "cartoon": "2D cartoon", "blueprint": "Blueprint", "map": "Vintage map", "infographic": "Infographic",
    "photo": "Realistic photo", "macro": "Macro close-up",
}
STORY_MODES = {"none": "No story", "opening": "Opens with a story", "interludes": "Story interludes", "whole": "Whole film is a story"}
LANGUAGES = ["Hinglish", "Hindi", "English"]
SUBTITLES = {"same": "Same as speech", "roman": "Roman script", "english": "English", "off": "Off"}
TONES = ["Calm documentary", "Energetic YouTube", "Cinematic and dramatic", "Friendly classroom", "Podcast conversation"]
PACES = {"slow": "Slow", "normal": "Normal", "fast": "Fast"}


def _read(path: str, default=None):
    for enc in ("utf-8", "cp1252"):  # UTF-8 (plans, pictures); an older status.json in Windows' own encoding
        try:
            return json.load(open(path, encoding=enc))
        except UnicodeDecodeError:
            continue
        except Exception:
            return default
    return default


def _alive(pid: int | None) -> bool:
    from app import procs
    return procs.alive(pid)


def _presets() -> dict:
    return _read(os.path.join(VIDEO, "formats.json"), {}) or {}


def _preset_config(key: str, **over) -> dict:
    p = _presets()[key]
    return {"topic": "", "lesson_id": None, "source_text": "", "audience": "Indian competitive-exam aspirants", "narration": key,
            "roles": [dict(r) for r in p["roles"]], "story_mode": p.get("story_mode", "none"), "premise": "", "language": "Hinglish",
            "subtitles": "off", "looks": [], "visual_direction": "", "diagrams": True, "tone": "", "pace": "normal", "minutes": 15,
            "instructions": "", "facts": "", "dock": p.get("dock", ""), "look": p.get("look", "collage"),
            "cinematic": "parallax", "second_language": "", "accent": "", **over}


def _config(f: Film) -> dict:
    """Studio films carry a full config; films made before it (film1) get one from their old fields."""
    if f.config:
        return f.config
    # cinematic off: films made before the motion director stay exactly as they were rendered
    cfg = _preset_config(f.format or "exam", lesson_id=f.lesson_id, minutes=f.minutes, premise=f.premise or "", cinematic="off")
    for r in cfg["roles"]:
        r["voice"] = (f.voices or {}).get(r["name"]) or ""
    return cfg


def _spawn(f: Film) -> int:
    cfg = _config(f)
    # never record voices nobody picked: without a voice for every role the pipeline stops after the images and waits
    until = "all" if all(r.get("voice") for r in cfg["roles"]) else "images"
    base = os.path.join(PUBLIC, f.slug)
    os.makedirs(base, exist_ok=True)
    json.dump(cfg, open(os.path.join(base, "config.json"), "w"), ensure_ascii=False, indent=1)
    log = open(os.path.join(base, "pipeline.log"), "a")
    args = [sys.executable, "-u", os.path.join(VIDEO, "doc.py"), "--out", f.slug, "--config", os.path.join(base, "config.json"), "--until", until]
    pid = subprocess.Popen(args, cwd=BACKEND, stdout=log, stderr=subprocess.STDOUT, start_new_session=True).pid
    # keep the Mac from idle-sleeping while this film is made (a sleep froze a run for 5 hours); ends with the process
    try:
        subprocess.Popen(["caffeinate", "-i", "-w", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    except OSError:
        pass
    return pid


def _film(s, film_id: int) -> Film:
    f = s.get(Film, film_id)
    if not f:
        raise HTTPException(404, "film not found")
    return f


def _counts(slug: str, cfg: dict) -> dict:
    """Progress counted from the files that actually exist, so a stopped run or a deleted take never leaves a stale number."""
    base = os.path.join(PUBLIC, slug)
    plan = _read(os.path.join(base, "plan.json"))
    if not plan:
        return {}
    acts = [_read(os.path.join(base, f"act{n:02d}.json")) for n in range(len(plan["acts"]))]
    written = [(n, a) for n, a in enumerate(acts) if a]
    files = set(os.listdir(base))
    scenes = [(n, i, sc) for n, a in written for i, sc in enumerate(a["scenes"])]
    voice = {r["name"]: r.get("voice") or "" for r in cfg["roles"]}
    out = {"plan": {"done": 1, "total": 1}, "scripts": {"done": len(written), "total": len(plan["acts"])}}
    painted = [x for x in scenes if not (x[2].get("reuse") and x[1])]
    out["images"] = {"done": sum(f"a{n:02d}s{i:02d}.png" in files for n, i, _ in painted), "total": len(painted)}
    motion = _read(os.path.join(base, "motion.json"))
    if motion:
        moving = [k.split(":") for k, p in motion.items() if p.get("motion") != "camera"]
        out["motion"] = {"done": sum(f"a{int(n):02d}s{int(i):02d}.mp4" in files or f"a{int(n):02d}s{int(i):02d}-fg.png" in files for n, i in moving),
                         "total": len(moving)}
    lang2 = (cfg.get("second_language") or "").strip().lower()
    lang2 = "" if lang2 == (cfg.get("language") or "").lower() else lang2
    tracks = [""] + ([f"-{lang2}"] if lang2 else [])
    if all(voice.values()):
        if len(cfg["roles"]) == 2:  # one conversation take per scene (per track)
            tag = "-".join(voice[r["name"]] for r in cfg["roles"])
            out["voices"] = {"done": sum(f"a{n:02d}s{i:02d}-conv-{tag}{t}.wav" in files for n, i, _ in scenes for t in tracks),
                             "total": len(scenes) * len(tracks)}
        else:
            lines = [(n, i, j, ln) for n, i, sc in scenes for j, ln in enumerate(sc["lines"])]
            out["voices"] = {"done": sum(f"a{n:02d}s{i:02d}l{j:02d}-{voice.get(ln['speaker'], '')}{t}.wav" in files for n, i, j, ln in lines for t in tracks),
                             "total": len(lines) * len(tracks)}
    return out


def _video_url(name: str | None) -> str | None:
    if not name:
        return None
    path = os.path.join(VIDEO, "out", name)
    return f"{OUT}/{name}?v={int(os.path.getmtime(path))}" if os.path.exists(path) else f"{OUT}/{name}"


def _summary(s, f: Film) -> dict:
    st = _read(os.path.join(PUBLIC, f.slug, "status.json"), {}) or {}
    cfg = _config(f)
    running = _alive(f.pid)
    stage = st.get("stage", "queued")
    if not running and stage not in ("done", "paused", "failed"):
        stage = "stopped"
    return {"id": f.id, "slug": f.slug, "kind": f.kind, "topic": cfg.get("topic") or "",
            "lesson_id": f.lesson_id, "minutes": cfg.get("minutes", f.minutes), "narration": cfg.get("narration"),
            "language": cfg.get("language"), "roles": [{"name": r["name"], "voice": r.get("voice") or ""} for r in cfg["roles"]],
            "running": running, "stage": stage, "stages": {**st.get("stages", {}), **_counts(f.slug, cfg)}, "now": _now(f.slug, running),
            # versioned by the file's modification time: a re-render gets a new URL, so no browser plays a cached old cut
            "video": _video_url(st.get("video")),
            "audio_tracks": {k: f"{OUT}/{v}" for k, v in (st.get("audio_tracks") or {}).items()},
            "cost": _read(os.path.join(PUBLIC, f.slug, "cost.json")), "created_at": f.created_at}


def _now(slug: str, running: bool) -> str | None:
    """What the agent is doing this very moment, in plain words, from the newest line of its log: a wait (no internet,
    Google's quota or servers) is said as a wait, with how long it has lasted, so a quiet page never looks stuck."""
    import time
    path = os.path.join(PUBLIC, slug, "pipeline.log")
    if not running or not os.path.exists(path):
        return None
    tail = [x.strip() for x in open(path, errors="ignore").read().splitlines()[-400:] if x.strip()]
    if not tail:
        return None
    age = int(time.time() - os.path.getmtime(path))
    last = tail[-1]
    waits = [("no internet", "The Mac's internet is down: waiting and retrying every 10 s"),
             ("openrouter", "OpenRouter (Claude) is busy: waiting and retrying"),
             ("429", "Google's quota is full: waiting and retrying"), ("RESOURCE_EXHAUSTED", "Google's quota is full: waiting and retrying"),
             ("500 INTERNAL", "Google's servers are erroring: waiting and retrying"), ("503", "Google's servers are busy: waiting and retrying")]
    step = ((_read(os.path.join(PUBLIC, slug, "status.json"), {}) or {}).get("log") or [{}])[-1].get("msg", "")
    for key, say in waits:
        if key in last and age > 75:  # waits are logged every 10-60 s: an older one has ended and a request is under way
            return f"{step}: the wait is over, the agent is talking to the AI again (a long answer can take a few minutes)."
        if key in last:
            n = 0
            for x in reversed(tail):
                if key not in x:
                    break
                n += 1
            m = re.search(r"attempt (\d+)", last)
            return f"{say} ({m.group(1) if m else n} tries so far, last {age}s ago). It carries on by itself once this clears."
    # otherwise exactly the step the pipeline says it is on, and for how long: a fresh line of real progress (a photo
    # found, a render frame) adds to it, but a warning or a stale line never stands in for what is happening
    st = _read(os.path.join(PUBLIC, slug, "status.json"), {}) or {}
    since = int(time.time() - st["step_at"]) if st.get("step_at") else None
    took = "" if since is None else f" · {since // 60} min {since % 60:02d} s so far" if since >= 60 else f" · {since} s so far"
    noise = re.search(r"invalid json|validation error|failed|error|warning|traceback|not recommended|retry|retrying|^\s*\^|^\s*File ", last, re.I)
    if age <= 20 and not noise and last != step:
        return f"{step}{took} · {last[:140]}"
    # the render writes to render.log and reports frames as its counter: a quiet log there is not a wait for the AI
    return f"{step}{took}" + (" · waiting for the AI's reply" if age > 45 and st.get("stage") != "render" else "")


def _new_film(s, cfg: dict, kind: str) -> Film:
    f = Film(slug="", lesson_id=cfg.get("lesson_id"), kind=kind, config=cfg, minutes=cfg["minutes"], format=cfg["narration"],
             voices={r["name"]: r.get("voice", "") for r in cfg["roles"]})
    s.add(f)
    s.flush()
    f.slug = f"film{f.id}"
    f.pid = _spawn(f)
    return f


# ---------- options for the Studio form ----------

@router.get("/studio/options")
def options():
    return {"narrations": [{"key": k, "label": v["label"], "description": v["description"], "story_mode": v.get("story_mode", "none"),
                            "roles": v["roles"], "dock": v.get("dock", ""), "look": v.get("look", "collage")} for k, v in _presets().items()],
            "looks": [{"key": k, "label": v} for k, v in LOOKS.items()],
            "story_modes": [{"key": k, "label": v} for k, v in STORY_MODES.items()],
            "languages": LANGUAGES, "subtitles": [{"key": k, "label": v} for k, v in SUBTITLES.items()],
            "tones": TONES, "paces": [{"key": k, "label": v} for k, v in PACES.items()],
            "cinematic": [{"key": "off", "label": "Still images"}, {"key": "parallax", "label": "Parallax only"},
                          {"key": "few", "label": "A few video shots"}, {"key": "many", "label": "Many video shots"}],
            "veo_ready": bool(settings.veo_api_key or settings.veo_project)}


@router.get("/studio/voices")
def voices():
    data = _read(os.path.join(PUBLIC, "voices", "voices.json"))
    if not data:
        return {"ready": False, "models": [], "voices": []}
    for v in data["voices"]:
        v["samples"] = {m: f"{ASSETS}/voices/{m}/{v['name']}.wav" for m in data["models"]
                        if os.path.exists(os.path.join(PUBLIC, "voices", m, f"{v['name']}.wav"))}
    return {"ready": True, **data}


@router.get("/studio/lessons")
def lessons():
    """Lessons as source material belong to the Tayyari study app; the standalone Studio works from topics and notes."""
    return []


# ---------- films ----------

class Role(BaseModel):
    name: str
    style: str = ""
    voice: str = ""
    look: str = ""


class FilmConfig(BaseModel):
    topic: str = ""
    skills: dict = {}  # the V1 skills chosen for this video (api/vskills.py): moments on, and the look's settings
    lesson_id: int | None = None
    source_text: str = ""
    audience: str = "Indian competitive-exam aspirants"
    narration: str = "documentary"
    roles: list[Role]
    story_mode: str = "none"
    premise: str = ""
    language: str = "Hinglish"
    subtitles: str = "off"
    looks: list[str] = []
    visual_direction: str = ""
    diagrams: bool = True
    tone: str = ""
    pace: str = "normal"
    minutes: int = 10
    instructions: str = ""
    facts: str = ""
    cinematic: str = "few"  # off | parallax | few | many: how many scenes the motion director may turn into Veo video shots
    second_language: str = ""  # a dubbed second audio track over the same pictures (e.g. English + Hinglish)
    accent: str = "Indian English"  # how the voices sound; most viewers are Indian
    style: str = "archival"  # archival: research-first documentary with real sources (archivedoc.py); illustrated: painted scenes
    regions: str = "India"
    questions: str = ""  # archival: questions the film must answer and sides it must cover (steers the investigation)
    review_research: bool = True  # archival: pause after research so the creator reads and approves the pack
    aspect: str = "16:9"  # "9:16" for reels and Shorts
    motion_reviews: int = 1  # motion edit: rounds of the agent looking at its own shots and redesigning the weak ones
    investigate_rounds: int = 2  # archival: extra rounds chasing gaps and leads after the first pass (0 for a reel)
    vox: bool = False  # archival: the "Vox motion & story" skill (story shape, seamless transitions, constant motion, lower thirds)
    era_look: bool = False  # archival: the present in colour (photos turn to colour and fill the frame, modern news cards), the past as old paper
    edit: str = "board"  # archival edit: board (the collage board) | layered (+ layered backgrounds) | build (word-synced build-up) | editorial (modern Vox layouts for today, paper for history)


@router.get("/studio/films")
def films():
    with session_scope() as s:
        # exam notes films have their own section (app/api/notes.py)
        return [_summary(s, f) for f in s.scalars(select(Film).where(Film.kind != "notes").order_by(Film.id.desc()))]


@router.post("/studio/films")
def create_film(body: FilmConfig):
    if not body.topic.strip() and not body.lesson_id and not body.source_text.strip():
        raise HTTPException(400, "Tell the Studio what the film is about: a topic or your notes.")
    if not body.roles or any(not r.name.strip() for r in body.roles):
        raise HTTPException(400, "Every role needs a name.")
    presets = _presets()
    p = presets.get(body.narration, {})
    cfg = body.model_dump()
    cfg["minutes"] = max(1, min(45, cfg["minutes"]))
    cfg["story_mode"] = cfg["story_mode"] if cfg["story_mode"] in STORY_MODES else "none"
    cfg["edit"] = cfg["edit"] if cfg["edit"] in ("scenes", "motion", "board", "layered", "build", "editorial") else "scenes"
    cfg["dock"] = p.get("dock", "") if all(r.look for r in body.roles) else ""
    fallback = p.get("look", "collage")
    cfg["look"] = cfg["looks"][0] if cfg["looks"] else fallback if fallback in LOOKS else "collage"
    with session_scope() as s:
        if body.lesson_id:
            raise HTTPException(400, "Lesson films need the Tayyari study app; paste the lesson as notes instead.")
        return _summary(s, _new_film(s, cfg, "studio"))


class VoicesIn(BaseModel):
    voices: dict[str, str] = {}  # none: go on with what the film has (the creator's own recording, when there is one)


@router.post("/studio/films/{film_id}/continue")
def continue_film(film_id: int, body: VoicesIn | None = None):
    """Resume a paused/stopped film; new voices re-record the lines (scripts and images are kept)."""
    with session_scope() as s:
        f = _film(s, film_id)
        if _alive(f.pid):
            raise HTTPException(409, "already running")
        cfg = _config(f)
        if body and body.voices:
            cfg = {**cfg, "roles": [{**r, "voice": body.voices.get(r["name"], r.get("voice", ""))} for r in cfg["roles"]]}
            f.voices = {r["name"]: r["voice"] for r in cfg["roles"]}
            cfg = {**cfg, "voice_mode": "ai"}  # an AI voice picked now wins over an earlier recording
        f.config = cfg
        base = os.path.join(PUBLIC, f.slug)
        st = _read(os.path.join(base, "status.json"), {}) or {}
        if st.get("stage") == "paused" and "Research ready" in ((st.get("log") or [{}])[-1].get("msg") or ""):
            open(os.path.join(base, "research-approved"), "w").close()  # continuing from the research pause approves it
        if st.get("stage") == "paused" and "Voices ready" in ((st.get("log") or [{}])[-1].get("msg") or ""):
            open(os.path.join(base, "voices-approved"), "w").close()  # continuing from the voice review approves them
        elif body and body.voices and os.path.exists(os.path.join(base, "voices-approved")):
            os.remove(os.path.join(base, "voices-approved"))  # a new voice is heard again before the video is made
        f.pid = _spawn(f)
        return _summary(s, f)


@router.get("/studio/films/{film_id}/live")
def film_live(film_id: int):
    """Everything happening in a film, for the live tracker: the raw log, the error meter, the step timeline, every line
    with what it will show (layout chosen, pictures found), the newest images, and the cost so far."""
    import time
    with session_scope() as s:
        f = _film(s, film_id)
        base = os.path.join(PUBLIC, f.slug)
        st = _read(os.path.join(base, "status.json"), {}) or {}
        log_path = os.path.join(base, "pipeline.log")
        tail = open(log_path, errors="ignore").read().splitlines()[-300:] if os.path.exists(log_path) else []
        recent = tail[-120:]
        health = {"network": sum("no internet" in x for x in recent), "quota": sum("429" in x for x in recent), "server": sum("500 INTERNAL" in x or "503" in x for x in recent),
                  "crash": sum("Traceback" in x for x in recent),
                  "log_age": int(time.time() - os.path.getmtime(log_path)) if os.path.exists(log_path) else None}
        events = st.get("log", [])
        timeline = [{"at": e["at"], "msg": e["msg"]} for e in events[-80:]]
        # every line, grouped by chapter, with the visuals planned for it and the pictures it has
        arc = (_read(os.path.join(base, "archive.json"), {}) or {}).get("lines", [])
        board = (_read(os.path.join(base, "board.json"), {}) or {}).get("lines", [])
        by_key = {_line_key(x): x for x in board if _line_key(x)}
        edits = _read(os.path.join(base, "edits.json"), {}) or {}
        bdir = os.path.join(base, "board")
        plans: dict[str, dict] = {}
        if os.path.isdir(bdir):
            for x in sorted(os.listdir(bdir)):
                m = re.fullmatch(r"(direct|editorial|build)(\d\d)\.json", x)
                if m:
                    for k, v in (_read(os.path.join(bdir, x), {}) or {}).items():
                        plans.setdefault(k, {})[m.group(1)] = v
        url = lambda rel: _asset(rel.split("/")[0], rel.split("/", 1)[1]) if rel and "/" in rel else None
        def pictures(b: dict) -> list[str]:
            out = [b.get("src"), b.get("cut")] + list(b.get("srcs") or []) + [it.get("src") for it in b.get("items") or []] + [p.get("src") for p in b.get("pieces") or []]
            return [u for u in (url(r) for r in out if r) if u]
        chapters, cur = [], None
        for i, ln in enumerate(arc):
            b = ln["beat"]
            if b.get("kind") == "title" and "chapter" in (b.get("kicker") or "").lower() or cur is None:
                cur = {"title": b.get("title") if b.get("kind") == "title" else "Opening", "lines": []}
                chapters.append(cur)
            if not ln.get("speech"):
                continue
            p = plans.get(str(i), {})
            k = _line_key(ln)
            fb = by_key.get(k)  # the finished board is reordered (cold open first) and trimmed: matched by recording
            final = fb["beat"] if fb else None
            layout = (final or {}).get("layout") or (final or {}).get("kind") if final else \
                (p.get("editorial", {}).get("layout") if p.get("editorial", {}).get("layout") not in (None, "keep") else
                 ("build" if p.get("build") else p.get("direct", {}).get("kind") or b.get("kind")))
            cur["lines"].append({"i": i, "speech": ln["speech"], "voiced": bool(ln.get("audio") and os.path.exists(os.path.join(PUBLIC, ln["audio"]))),
                                 "layout": layout, "final": bool(final), "era": (fb or {}).get("era"),
                                 "pictures": pictures(final or {}) or pictures(b), "key": k, "audio": url(ln.get("audio")),
                                 "cut": bool(ln.get("cut")), "edit": edits.get(k or "")})
        # the cold open is stored after the chapters but plays first: it is listed first, as chapter 00
        for c in chapters:
            c["opener"] = any((l.get("key") or "").startswith("c99") for l in c["lines"])
            if c["opener"]:
                c["title"] = "The opening hook"
        chapters.sort(key=lambda c: not c["opener"])
        # the newest pictures on disk
        files = []
        for sub in ("archive", "board"):
            d = os.path.join(base, sub)
            if os.path.isdir(d):
                files += [(os.path.getmtime(os.path.join(d, x)), sub, x) for x in os.listdir(d) if x.lower().endswith((".png", ".jpg", ".jpeg"))]
        files.sort(reverse=True)
        kind = lambda sub, x: ("sticker" if x.startswith("sticker") else "lifted" if x.startswith("lift") else "cut-out" if x.startswith("cut")
                               else "background" if re.match(r"c\d\dp\d|blank", x) else "real photo")
        newest = [{"url": _asset(f.slug, f"{sub}/{x}"), "kind": kind(sub, x), "name": x, "at": time.strftime("%H:%M:%S", time.localtime(t))} for t, sub, x in files[:30]]
        counts = {k: sum(1 for _, sub, x in files if kind(sub, x) == k) for k in ("real photo", "sticker", "cut-out", "background")}
        cost = _read(os.path.join(base, "cost.json"), {}) or {}
        return {"id": f.id, "title": (_config(f).get("topic") or f.slug), "stage": st.get("stage"), "running": _alive(f.pid), "now": _now(f.slug, _alive(f.pid)), "stages": _counted(base, st.get("stages") or {}, _config(f)),
                "health": health, "log": tail, "timeline": timeline, "chapters": chapters, "newest": newest, "counts": counts,
                "cost": {"usd": round(cost.get("total_usd", 0), 2), "stages": {k: round(v["usd"], 2) for k, v in (cost.get("stages") or {}).items()}}}


def _line_key(ln: dict) -> str | None:
    m = re.search(r"c(\d\d)l(\d\d)-", ln.get("audio") or "")
    return f"c{m[1]}l{m[2]}" if m else None


class LineEditIn(BaseModel):
    speech: str | None = None
    rerecord: bool | None = None
    layout: str | None = None
    picture: str | None = None
    picture_kind: str | None = None
    note: str | None = None
    cut: bool | None = None


@router.put("/studio/films/{film_id}/lines/{key}")
def edit_line(film_id: int, key: str, body: LineEditIn):
    """The creator's change to one line of a documentary (words, layout, picture, a direction, skip or bring back). Kept
    in edits.json; the next run (Apply changes) re-records and re-plans only the changed lines. An empty body clears it."""
    if not re.fullmatch(r"c\d\dl\d\d", key):
        raise HTTPException(400, "unknown line")
    if body.layout and body.layout not in ("auto", "build", "photo", "quote", "portrait", "circle", "strips", "timeline", "stack", "scene"):
        raise HTTPException(400, "unknown layout")
    if body.picture_kind and body.picture_kind not in ("real", "paint"):
        raise HTTPException(400, "picture_kind is real or paint")
    with session_scope() as s:
        f = _film(s, film_id)
        base = os.path.join(PUBLIC, f.slug)
        edits = _read(os.path.join(base, "edits.json"), {}) or {}
        e = {k: v for k, v in body.model_dump().items() if v not in (None, "")}
        if e:
            edits[key] = e  # a new change replaces the old one; its result is cleared until the next run
        else:
            edits.pop(key, None)
        tmp = os.path.join(base, "edits.json.tmp")
        json.dump(edits, open(tmp, "w"), indent=1, ensure_ascii=False)
        os.replace(tmp, os.path.join(base, "edits.json"))
        return {"key": key, "edit": edits.get(key), "pending": sum(1 for v in edits.values() if "result" not in v)}


@router.get("/studio/films/{film_id}/research-pack", response_class=PlainTextResponse)
def research_pack(film_id: int):
    """The research pack (Markdown) the creator reviews before the script is written."""
    with session_scope() as s:
        f = _film(s, film_id)
        path = os.path.join(PUBLIC, f.slug, "research-pack.md")
        if not os.path.exists(path):
            raise HTTPException(404, "no research pack yet")
        return open(path).read()


@router.post("/studio/films/{film_id}/recording")
async def upload_recording(film_id: int, file: UploadFile = File(...)):
    """The creator's own reading of the script (recorded off the teleprompter in the browser). Saved next to the film;
    the AI voice is not used for this film."""
    with session_scope() as s:
        f = _film(s, film_id)
        base = os.path.join(PUBLIC, f.slug)
        ext = os.path.splitext(file.filename or "")[1].lower() or ".webm"
        if ext not in (".webm", ".m4a", ".mp3", ".wav", ".ogg", ".mp4"):
            raise HTTPException(400, "Send an audio recording (webm, m4a, mp3, wav, ogg).")
        name = f"my-recording{ext}"
        with open(os.path.join(base, name), "wb") as out:
            out.write(await file.read())
        f.config = {**_config(f), "voice_mode": "own", "own_recording": name}
        if os.path.exists(os.path.join(base, "voices-approved")):
            os.remove(os.path.join(base, "voices-approved"))  # a new take is heard again before the video is made
        st_path = os.path.join(base, "status.json")
        st = _read(st_path, {}) or {}
        st.setdefault("log", []).append({"at": __import__("datetime").datetime.now().strftime("%H:%M:%S"), "msg": "Your recording is saved"})
        json.dump(st, open(st_path, "w"), ensure_ascii=False, indent=1)
        return {"saved": f"{ASSETS}/{f.slug}/{name}"}


@router.post("/studio/films/{film_id}/stop")
def stop_film(film_id: int):
    with session_scope() as s:
        f = _film(s, film_id)
        from app import procs
        procs.stop(f.pid)
        return _summary(s, f)


@router.get("/studio/films/{film_id}")
def film_detail(film_id: int):
    """Everything the pipeline has produced so far, stage by stage."""
    with session_scope() as s:
        f = _film(s, film_id)
        base = os.path.join(PUBLIC, f.slug)
        st = _read(os.path.join(base, "status.json"), {}) or {}
        plan = _read(os.path.join(base, "plan.json"))
        cfg = _config(f)
        voice_of = {r["name"]: r.get("voice") or "" for r in cfg["roles"]}
        conv = "-".join(voice_of[r["name"]] for r in cfg["roles"]) if len(cfg["roles"]) == 2 else ""
        acts = _archival_acts(f.slug, cfg) if cfg.get("style") == "archival" else []
        for n, a in enumerate((plan or {}).get("acts", []) if cfg.get("style") != "archival" else []):
            d = _read(os.path.join(base, f"act{n:02d}.json"))
            scenes = []
            for i, sc in enumerate((d or {}).get("scenes", [])):
                lines = []
                for j, ln in enumerate(sc["lines"]):
                    lines.append({**ln, "text": ln.get("subtitle") or ln.get("speech"),
                                  "audio": _asset(f.slug, f"a{n:02d}s{i:02d}l{j:02d}-{voice_of.get(ln['speaker'], '')}.wav")})
                scenes.append({**sc, "image_prompt": sc["image"], "image": _asset(f.slug, f"a{n:02d}s{i:02d}.png"),
                               "audio": _asset(f.slug, f"a{n:02d}s{i:02d}-conv-{conv}.wav") if conv else None,
                               "note_texts": [x["text"] for x in sc["notes"]], "topology": (sc.get("diagram") or {}).get("topology"), "lines": lines})
            acts.append({"title": a["title"], "seconds": a["seconds"], "hook": a["hook"], "covers": a["covers"], "written": d is not None, "scenes": scenes})
        tasks = _read(os.path.join(base, "tasks.json"), {}) or {}
        for t in tasks.values():  # a task whose process has died is not running, whatever the file last said
            if t.get("state") == "running" and not _alive(t.get("pid")):
                t["state"] = "stopped"
        research = _research(base) if cfg.get("style") == "archival" else None
        stages = _counted(base, st.get("stages") or {}, cfg) if cfg.get("style") == "archival" else None
        return {**_summary(s, f), **({"stages": stages} if stages else {}), "title": (plan or {}).get("title"), "config": cfg, "story": st.get("story"), "research": research,
                "log": st.get("log", [])[-60:], "acts": acts, "tasks": tasks,
                **({"prompter": _prompter(f.slug, cfg)} if cfg.get("style") == "archival" else {})}


def _counted(base: str, stages: dict, cfg: dict) -> dict:
    """Fill in counts a resumed run could not report, from the files on disk: voices recorded (of all lines), and the
    visuals steps (layouts and pages, one file per chapter)."""
    stages = {k: dict(v) for k, v in stages.items()}
    voice = _archival_voice(cfg)
    lines = sum(len((_read(os.path.join(base, x), {}) or {}).get("lines", [])) for x in os.listdir(base) if re.fullmatch(r"chapter\d\d\.json", x))
    if lines and not (stages.get("voices") or {}).get("total"):
        recorded = sum(1 for x in os.listdir(base) if x.endswith(f"-{voice}.wav"))
        stages["voices"] = {"done": min(recorded, lines), "total": lines}
    # visuals is one bar over all its steps (the agent counts each step from zero): every step saves one file per
    # chapter, and which steps run depends on the film's edit
    opener = 1 if os.path.exists(os.path.join(base, "opener.json")) else 0  # the cold open is a chapter of its own
    if opener and (stages.get("scripts") or {}).get("total"):
        n = sum(1 for x in os.listdir(base) if re.fullmatch(r"chapter\d\d\.json", x)) + 1
        stages["scripts"] = {"done": n, "total": n}
    board_dir = os.path.join(base, "board")
    if os.path.isdir(board_dir):
        chapters = sum(1 for x in os.listdir(base) if re.fullmatch(r"chapter\d\d\.json", x)) + opener
        steps = {"build": ["direct", "build"], "editorial": ["direct", "editorial", "build"]}.get(cfg.get("edit") or "", ["direct"])
        made = sum(1 for x in os.listdir(board_dir) if re.fullmatch(rf"({'|'.join(steps)})\d\d\.json", x))
        st = _read(os.path.join(base, "status.json"), {}) or {}
        if chapters:
            past = st.get("stage") in ("render", "done")  # visuals finished in this run
            done = chapters * len(steps) if past else made
            stages["visuals"] = {"done": min(done, chapters * len(steps)), "total": chapters * len(steps),
                                 "step": None if past else _visual_step(st, steps)}
        if st.get("stage") not in ("render", "done"):  # a re-run has not rendered yet: the last run's frames are not this one's
            stages["render"] = {"done": 0, "total": 0}
    return stages


VISUAL_STEPS = [("Painting", "backgrounds", "Painting backgrounds and cut-outs"), ("Directing", "direct", "Directing each line"),
                ("Choosing layouts", "editorial", "Choosing layouts"), ("Editorial layouts", "editorial", "Choosing layouts"),
                ("Building the pages", "build", "Building the pages"), ("Assembling", "direct", "Assembling the board")]


def _visual_step(st: dict, steps: list[str]) -> str | None:
    """Which step of the visuals the agent is on, and how far into it: 'Step 3 of 3 · Building the pages · chapter 2 of 15'."""
    for e in reversed(st.get("log") or []):
        for start, key, label in VISUAL_STEPS:
            if e.get("msg", "").startswith(start):
                c = (st.get("stages") or {}).get("visuals") or {}
                n = f"Step {steps.index(key) + 1} of {len(steps)} · " if key in steps else ""
                where = f" · chapter {min(c.get('done', 0) + 1, c['total'])} of {c['total']}" if c.get("total") and key in steps else ""
                return f"{n}{label}{where}"
    return None


def _research(base: str) -> dict | None:
    """What the investigation found, for the Studio: leads per round, quotes word for word, sources, what was refused."""
    d = _read(os.path.join(base, "research.json"))
    if not d:
        return None
    src = d["sources"]
    site = lambda f: src.get(f["sid"], {}).get("site", "")
    url = lambda f: src.get(f["sid"], {}).get("url", "")
    return {
        "facts": len(d["facts"]), "sources": len(src), "rejected": len(d["rejected"]),
        "approved": os.path.exists(os.path.join(base, "research-approved")),
        "pack": os.path.exists(os.path.join(base, "research-pack.md")),
        "rounds": d.get("rounds", []),
        "quotes": [{"speaker": f["speaker"], "text": f["evidence"], "site": site(f), "date": f.get("date", ""), "url": url(f)}
                   for f in d["facts"] if f.get("speaker")][:80],
        "source_list": [{"site": v["site"], "title": v["title"], "url": v["url"], "tier": v["tier"], "found_in": v.get("found_in", "first"),
                         "facts": sum(1 for f in d["facts"] if f["sid"] == k)} for k, v in src.items()],
        "refused": [r for r in d["rejected"] if r.get("why") != "not a primary or established source"][:60],
    }


def _beat_summary(b: dict) -> list[str]:
    """What a line shows on screen, in words, for the scene list (archival films)."""
    k = b.get("kind")
    if k == "headline":
        return [f"{x.get('outlet', '')} · {x.get('date', '')}: {x.get('headline', '')}" for x in b.get("items", [])] or ["headline"]
    if k == "number":
        return [f"{b.get('value', '')} {b.get('label', '')}".strip()]
    if k == "quote":
        return [f"\u201c{b.get('text') or b.get('quote', '')}\u201d {('- ' + b['who']) if b.get('who') else ''}"]
    if k in ("filing", "document"):
        return [f"{b.get('company') or ''} {b.get('form') or ''}: \u201c{b.get('quote', '')}\u201d"]
    if k == "chart":
        return [f"{b.get('title') or b.get('chart_title', '')}: " + ", ".join(f"{x['label']} {x['display']}" for x in b.get("bars", []))]
    if k == "archival":
        return [b.get("caption") or b.get("image_subject") or "archival image"]
    if k == "title":
        return [b.get("title", "")]
    return [b.get("text") or b.get("phrase") or ""]


def _archival_voice(cfg: dict) -> str:
    """The name in an archival film's voice files (c00l00-<name>.wav): the AI voice, or "own" when the creator recorded
    the script (archivedoc.Agent.voice_path)."""
    if cfg.get("voice_mode") == "own" and cfg.get("own_recording"):
        return "own"
    return (cfg.get("roles") or [{}])[0].get("voice", "")


def _prompter(slug: str, cfg: dict) -> list[dict]:
    """The film's lines in film order (the cold open first, trimmed lines left out), each with its recorded voice: the
    teleprompter reads them (video/ownvoice.py matches the recording to them) and the voice review plays them."""
    if VIDEO not in sys.path:
        sys.path.insert(0, VIDEO)
    import ownvoice  # noqa: PLC0415
    voice = _archival_voice(cfg)
    return [{"speech": x["speech"], "audio": _asset(slug, f"c{x['n']:02d}l{x['i']:02d}-{voice}.wav") if voice else None}
            for x in ownvoice.prompter(os.path.join(PUBLIC, slug))]


def _archival_acts(slug: str, cfg: dict) -> list[dict]:
    """Archival films, chapter by chapter and line by line: the words, the voice, and what is on screen."""
    base = os.path.join(PUBLIC, slug)
    outline = _read(os.path.join(base, "outline.json"), {}) or {}
    images = _read(os.path.join(base, "images.json"), {}) or {}
    voice = _archival_voice(cfg)
    # chapters are written several at a time, so a later one can exist before an earlier one: list every file there is
    last = max([int(x[7:9]) for x in os.listdir(base) if re.fullmatch(r"chapter\d\d\.json", x)] + [-1]) if os.path.isdir(base) else -1
    acts = []
    for n in range(last + 1):
        ch = _read(os.path.join(base, f"chapter{n:02d}.json"))
        if ch is None:
            continue
        scenes = []
        for i, ln in enumerate(ch.get("lines", [])):
            if ch.get("locked"):  # resolved beats with their own audio
                beat, audio = ln["beat"], ln.get("audio")
                img = beat.get("src") if beat.get("kind") == "archival" else None
                audio_url = _asset(audio.split("/")[0], audio.split("/", 1)[1]) if audio else None
                img_url = _asset(img.split("/")[0], img.split("/", 1)[1]) if img else None
            else:
                beat = ln["beat"]
                pick = images.get(f"{n}:{i}")
                img_url = _asset(slug, "archive/" + pick["src"].split("/")[-1]) if pick else None
                if pick:
                    beat = {**beat, "caption": pick.get("caption")}
                audio_url = _asset(slug, f"c{n:02d}l{i:02d}-{voice}.wav")
            scenes.append({"image": img_url, "image_prompt": beat.get("kind", ""), "look": beat.get("kind", ""), "move": "", "transition": "",
                           "sfx": "", "notes": [], "note_texts": _beat_summary(beat), "topology": None, "reuse": False,
                           "lines": [{"speaker": "Narrator", "speech": ln["speech"], "text": ln["speech"], "audio": audio_url, "pause": ln.get("pause", 0.3)}]})
        planned = next((c for c in outline.get("chapters", []) if c["title"] == ch.get("title")), {})
        acts.append({"title": ch.get("title", f"Chapter {n + 1}") + (" (locked)" if ch.get("locked") else ""), "seconds": planned.get("seconds", 0),
                     "hook": ch.get("question", ""), "covers": [], "written": True, "scenes": scenes, "locked": bool(ch.get("locked")), "n": n})
    written = {a["title"].removesuffix(" (locked)") for a in acts}
    for k, c in enumerate(outline.get("chapters", [])):  # planned chapters not written yet, in their place in the film
        if c["title"] not in written:
            acts.append({"title": c["title"], "seconds": c["seconds"], "hook": c["question"], "covers": [], "written": False, "scenes": [], "n": k})
    acts.sort(key=lambda a: a["n"])
    return acts


def _asset(slug: str, name: str) -> str | None:
    """URL of a generated file, versioned by its modification time so an edited image/voice is never served stale."""
    path = os.path.join(PUBLIC, slug, name)
    return f"{ASSETS}/{slug}/{name}?v={int(os.path.getmtime(path))}" if os.path.exists(path) else None


# ---------- editing: change any scene, then redo only what the change touched ----------

class NoteIn(BaseModel):
    text: str
    style: str = "label"
    line: int = 0


class LineIn(BaseModel):
    speaker: str
    speech: str
    subtitle: str = ""
    pause: float = 0.2


class SceneIn(BaseModel):
    look: str = "collage"
    image: str
    reuse: bool = False
    move: str = "push"
    transition: str = "cut"
    sfx: str = "none"
    diagram: dict | None = None
    notes: list[NoteIn] = []
    lines: list[LineIn]


def _doc():
    """The pipeline module (video/doc.py), imported on demand for its shared edit logic."""
    if VIDEO not in sys.path:
        sys.path.insert(0, VIDEO)
    import doc  # noqa: PLC0415
    return doc


@router.put("/studio/films/{film_id}/acts/{n}/scenes/{i}")
def save_scene(film_id: int, n: int, i: int, body: SceneIn):
    """Save an edited scene. Images and voices of whatever changed are dropped; Apply & render remakes only those."""
    with session_scope() as s:
        f = _film(s, film_id)
        roles = {r["name"] for r in _config(f)["roles"]}
    if any(ln.speaker not in roles for ln in body.lines):
        raise HTTPException(400, f"Speakers must be one of: {', '.join(sorted(roles))}")
    if not body.lines:
        raise HTTPException(400, "A scene needs at least one line.")
    path = os.path.join(PUBLIC, f.slug, f"act{n:02d}.json")
    act = _read(path)
    if not act or not 0 <= i < len(act["scenes"]):
        raise HTTPException(404, "scene not found")
    new = json.loads(json.dumps(act))
    new["scenes"][i] = {**act["scenes"][i], **body.model_dump()}
    dropped = _doc().invalidate(os.path.join(PUBLIC, f.slug), n, act, new)
    json.dump(new, open(path, "w"), ensure_ascii=False, indent=1)
    return {"ok": True, "redo": dropped}


class TaskIn(BaseModel):
    kind: str  # paint | voice | rewrite | dialogue (act -1 = every act)
    act: int
    scene: int = 0
    line: int = 0
    feedback: str = ""


@router.post("/studio/films/{film_id}/tasks")
def start_task(film_id: int, body: TaskIn):
    """Redo one thing now: repaint a scene, re-record a line, or rewrite an act with the creator's feedback."""
    if body.kind not in ("paint", "voice", "rewrite", "dialogue"):
        raise HTTPException(400, "unknown task")
    with session_scope() as s:
        f = _film(s, film_id)
        cfg = _config(f)
        slug = f.slug
    if body.kind == "voice" and not all(r.get("voice") for r in cfg["roles"]):
        raise HTTPException(400, "Pick the voices first.")
    if body.kind == "rewrite" and not body.feedback.strip():
        raise HTTPException(400, "Tell the writer what to change.")
    base = os.path.join(PUBLIC, slug)
    json.dump(cfg, open(os.path.join(base, "config.json"), "w"), ensure_ascii=False, indent=1)
    args = [sys.executable, "-u", os.path.join(VIDEO, "doc.py"), "--out", slug, "--config", os.path.join(base, "config.json"),
            "--task", body.kind, "--act", str(body.act), "--scene", str(body.scene), "--line", str(body.line), "--feedback", body.feedback]
    subprocess.Popen(args, cwd=BACKEND, stdout=open(os.path.join(base, "pipeline.log"), "a"), stderr=subprocess.STDOUT, start_new_session=True)
    return {"ok": True}


# ---------- the lesson page's one-click video ----------

def _lesson_voices(s) -> dict:
    row = s.get(Setting, "lesson_video_voices")
    return (row.value if row else {}) or {}


class HouseVoices(BaseModel):
    voices: dict[str, str]


@router.get("/studio/house-voices")
def get_house_voices():
    with session_scope() as s:
        return {**{r["name"]: r["voice"] for r in _presets()["exam"]["roles"]}, **_lesson_voices(s)}


@router.put("/studio/house-voices")
def set_house_voices(body: HouseVoices):
    """The two voices every lesson-page video uses."""
    with session_scope() as s:
        row = s.get(Setting, "lesson_video_voices") or Setting(key="lesson_video_voices", value={})
        row.value = {k: v for k, v in body.voices.items() if k in ("Kabir", "Tara") and v}
        s.merge(row)
        return row.value
