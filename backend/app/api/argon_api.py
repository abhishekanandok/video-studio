"""The Argon motion agent in the app: start a film from a topic, and watch it being made, step by step (video/argon.py).

The pipeline's state is read from what the agent writes, so any film can be watched, even one started from the
terminal: plan.json (the plan), voice-NN.wav + words.json (the voice), assets.json (backdrops and pictures),
src/argon/gen/<slug>/scene-NN.tsx (the code it wrote), stills/ (what it looked at), argon.log (what it is doing),
cost.json (what it has cost) and out/argon-<slug>.mp4 (the film)."""

import json
import os
import re
import subprocess
import sys
import threading
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
VIDEO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "video"))
PUBLIC = os.path.join(VIDEO, "public")
FILMS = os.path.join(PUBLIC, "argon")
ASSETS = "/studio-assets"
STEPS = [("plan", "Plan the film"), ("voice", "Voice + word timing"), ("backdrops", "Backdrops"), ("pictures", "Pictures"),
         ("code", "Writing the film (one pass)"), ("compile", "Compile + fix"), ("render", "Render")]


def _url(path: str) -> str:
    """A file under video/public as the browser loads it (with its time, so a redrawn still is fetched again)."""
    full = path if os.path.isabs(path) else os.path.join(PUBLIC, path)
    rel = os.path.relpath(full, PUBLIC)
    return f"{ASSETS}/{rel}?v={int(os.path.getmtime(full))}" if os.path.exists(full) else ""


def _read(path: str, default=None):
    try:
        return json.load(open(path))
    except Exception:
        return default


def _running(slug: str) -> bool:
    r = subprocess.run(["pgrep", "-f", f"argon.py --slug {slug}( |$)"], capture_output=True, text=True)
    return bool(r.stdout.strip())


def _peaks(wav: str, n: int = 48) -> list[float]:
    """The voice's loudness in n slices (0..1), for the timeline's waveform."""
    try:
        import wave
        import numpy as np
        with wave.open(wav) as w:
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
        if not len(a):
            return []
        p = np.array([np.abs(c).max() if len(c) else 0 for c in np.array_split(a, n)])
        return [round(float(x), 2) for x in p / (p.max() or 1)]
    except Exception:
        return []


STEP_OF = [("Rendering the film", "render"), ("render stopped", "render"), ("Playing every scene through", "compile"), ("crash", "compile"),
           ("Fixing ", "compile"), ("Every scene compiles", "compile"), ("Looked up the motion library", "code"), ("does not compile", "compile"), ("patch(es) applied", "compile"),
           ("writing the whole film", "code"), ("Writing chapter", "code"), ("Wrote the film", "code"), ("writing scene", "code"),
           ("Pictures found", "pictures"), ("Finding ", "pictures"), ("backdrop", "backdrops"), ("Timing every word", "voice"),
           ("Voicing line", "voice"), ("do not start with", "voice"), ("Plan:", "plan"), ("planning", "plan"), ("Starting the motion agent", "plan")]


def _step_of(line: str) -> str | None:
    """which pipeline step a line of the agent's log is about"""
    return next((k for key, k in STEP_OF if key in line), None)


def status(slug: str) -> dict:
    d = os.path.join(FILMS, slug)
    if not os.path.isdir(d):
        raise HTTPException(404, "No such film")
    gen = os.path.join(VIDEO, "src", "argon", "gen", slug)
    plan = _read(os.path.join(d, "plan.json"), {}) or {}
    job = _read(os.path.join(d, "job.json"), {}) or {}
    lines = plan.get("lines") or []
    n = len(lines)
    words = _read(os.path.join(d, "words.json")) or []
    found = _read(os.path.join(d, "assets.json"), {}) or {}
    log_path = os.path.join(d, "argon.log")
    log = [l.rstrip() for l in open(log_path).read().splitlines()[-80:]] if os.path.exists(log_path) else []
    text = "\n".join(log)
    video = os.path.join(VIDEO, "out", f"argon-{slug}.mp4")
    running = _running(slug)
    voices = [os.path.exists(os.path.join(d, f"voice-{i:02d}.wav")) for i in range(n)]
    codes = [os.path.exists(p := os.path.join(gen, f"scene-{i:02d}.tsx")) and "export default" in open(p).read() for i in range(n)]
    stills = {i: [u for u in (_url(os.path.join(d, "stills", f"{i:02d}-{k}.png")) for k in range(3)) if u] for i in range(n)}
    backdrop_done = any(k.endswith(":backdrop") for k in found) or "Finding " in text and "pictures" in text
    checked = "Review 1:" in text or "Every scene plays through" in text  # a film made before one-pass writing was reviewed

    def st(done: bool, started: bool) -> str:
        return "done" if done else ("running" if running and started else "failed" if started and not running else "pending")

    states = {
        "plan": st(bool(n), "planning" in text or bool(n)),
        "voice": st(bool(words) and len(words) == n and n > 0, any(voices)),
        "backdrops": st(backdrop_done, "backdrop" in text),
        "pictures": st("Pictures found" in text, "Finding " in text and "pictures" in text),
        "code": st(n > 0 and all(codes), "writing scene" in text or "writing the whole film" in text),
        "compile": st("Every scene compiles" in text, "compile" in text.lower() or "Every scene" in text),
        "render": st(os.path.exists(video) and "DONE" in text, "Rendering the film" in text),
    }
    if plan.get("showreel") and os.path.exists(video):  # a showreel (video/showcase.py) has no voice lines: it is done once rendered
        states = {k: "done" for k in states}
    # the step being worked on is the one the agent's LATEST line belongs to (it can go back: fixing a scene after the
    # review is the compile step again, not the render); the steps before it are done, a step after it waits
    current = None
    if running:
        for l in reversed([x for x in log if x.startswith("[")]):
            current = _step_of(l)
            if current:
                break
        current = current or next((k for k, _ in STEPS if states[k] != "done"), None)
        order = [k for k, _ in STEPS]
        if current in order:
            n = order.index(current)
            for k in order[:n]:
                states[k] = "done"
            states[current] = "running"
            for k in order[n + 1:]:
                if states[k] == "running" or k == "render":
                    states[k] = "pending"
    times = {}
    for k, label in STEPS:
        hit = next((l for l in log if label.split()[0].lower() in l.lower()), None)
        times[k] = hit[1:9] if hit and hit.startswith("[") else ""

    vo = _read(os.path.join(d, "voice.json"), []) or []
    start = 0.0
    scenes = []
    for i, line in enumerate(lines):
        b = next((x for x in plan.get("beats") or [] if x.get("line") == i), {})
        secs = vo[i]["seconds"] if i < len(vo) else (words[i][-1]["e"] if i < len(words) and words[i] else 4.0)
        span = round(secs + 0.4, 2)  # video/src/argon/film.tsx: each scene is its voice + 0.4 s
        wav = os.path.join(d, f"voice-{i:02d}.wav")
        names = {a.get("name"): a for a in b.get("assets") or []}
        bd = found.get(f"{i}:backdrop") or (f"argon/{slug}/backdrop-{i:02d}.png" if os.path.exists(os.path.join(d, f"backdrop-{i:02d}.png")) else None)
        writing = running and (f"writing scene {i + 1} " in text or "writing the whole film" in text) and not codes[i]
        state = ("ready" if stills[i] and checked else "drawn" if stills[i] else "written" if codes[i] else "writing" if writing
                 else "pictures" if any(k.startswith(f"{i}:") for k in found) else "voiced" if i < len(voices) and voices[i] else "planned")
        scenes.append({"i": i, "line": line, "beat": b.get("beat", ""), "concept": b.get("concept", ""), "backdrop_kind": (b.get("backdrop") or {}).get("kind", ""),
                       "backdrop_query": (b.get("backdrop") or {}).get("query", ""), "backdrop": _url(bd) if bd else "",
                       "pictures": [_url(v) for k, v in found.items() if k.startswith(f"{i}:") and not k.endswith(":backdrop") and v and _url(v)],
                       "seconds": round(words[i][-1]["e"], 1) if i < len(words) and words[i] else None,
                       "code_lines": len(open(os.path.join(gen, f"scene-{i:02d}.tsx")).read().splitlines()) if codes[i] else 0,
                       "stills": stills[i], "state": state, "start": round(start, 2), "span": span, "transition": b.get("transition", ""), "data": b.get("data", ""),
                       "voice": _url(wav), "peaks": _peaks(wav), "words": words[i] if i < len(words) else [],
                       "assets": [{"name": k.split(":", 1)[1], "kind": (names.get(k.split(":", 1)[1]) or {}).get("kind", ""), "query": (names.get(k.split(":", 1)[1]) or {}).get("query", ""),
                                   "url": _url(v) if v else ""} for k, v in found.items() if k.startswith(f"{i}:") and not k.endswith(":backdrop")]})
        start += span
    cost = _read(os.path.join(d, "cost.json"), None)
    qall = _queue()
    qslugs = [j["slug"] for j in qall]
    qentry = next((j for j in qall if j["slug"] == slug), {})
    qpos = qslugs.index(slug) + 1 if slug in qslugs and qentry.get("state", "waiting") == "waiting" else 0
    paused_reason = qentry.get("reason", "") if qentry.get("state") == "paused" else ""
    crashed = os.path.exists(os.path.join(d, "run.log")) and "Traceback" in open(os.path.join(d, "run.log")).read()[-6000:]
    state = ("done" if states["render"] == "done" else "running" if running else "queued" if qpos
             else "stopped" if os.path.exists(os.path.join(d, "stopped")) or not crashed else "failed")
    if qpos or (not running and state != "done"):  # nothing is running for it: no step shows as running (or failed, unless it crashed)
        for k in states:
            if states[k] == "running" or (states[k] == "failed" and state != "failed"):
                states[k] = "pending"
    used = re.findall(r"model: ([\w.-]+) answered", open(log_path).read()) if os.path.exists(log_path) else []
    model = used[-1] if used else ""
    if model and model != "gemini-4-argon":
        model += " (Argon not reachable with this key)"
    return {"slug": slug, "topic": plan.get("topic") or job.get("topic") or slug, "style": plan.get("style") or job.get("style", ""), "title": plan.get("title", ""), "running": running,
            "state": "paused" if paused_reason and not running else state, "queue": qpos, "reason": paused_reason,
            "steps": [{"id": k, "label": label, "state": states[k], "at": times[k]} for k, label in STEPS], "current": current,
            "theme": plan.get("theme") or {}, "scenes": scenes, "total": round(start, 2),
            "doing": next((re.sub(r"\s*\(.*$", "", l[11:]) for l in reversed(log) if l.startswith("[")), "") if running else "", "log": log[-40:], "cost": cost,
            "video": f"/studio-out/argon-{slug}.mp4?v={int(os.path.getmtime(video))}" if os.path.exists(video) else "", "model": model,
            "started": time.strftime("%d %b %H:%M", time.localtime(os.path.getctime(d)))}


# the motion styles (video/styles.py) and, under each, the films made in it: its demos
PLANNED = [("papercollage", "Paper collage + cut-out"), ("paper", "Paper cut-out"), ("documentary", "Documentary 2.5D"), ("collage", "Collage (Vox)"), ("map", "Map (Johnny Harris)"),
           ("anime", "Anime painted"), ("horror", "Horror / mystery"), ("kinetic", "Kinetic typography"), ("whiteboard", "Whiteboard"), ("isometric", "Isometric")]


def _styles_mod():
    if VIDEO not in sys.path:
        sys.path.insert(0, VIDEO)
    import styles
    return styles


@router.get("/argon/queue")
def queue_view():
    q = _queue()
    out = []
    for i, j in enumerate(q):
        plan = _read(os.path.join(FILMS, j["slug"], "plan.json"), {}) or {}
        out.append({"slug": j["slug"], "title": plan.get("title") or j["topic"], "style": j.get("style", ""), "lane": j.get("lane", "next"),
                    "state": j.get("state", "waiting"), "reason": j.get("reason", ""), "position": i + 1})
    blocked = next((x for x in out if x["state"] == "paused"), None)
    return {"queue": out, "blocked": blocked}


@router.get("/argon/styles")
def style_list():
    built = {x["id"]: x for x in _styles_mod().options()}
    films = []
    if os.path.isdir(FILMS):
        for slug in os.listdir(FILMS):
            pl = _read(os.path.join(FILMS, slug, "plan.json"), {}) or _read(os.path.join(FILMS, slug, "job.json"), {}) or {}
            if pl.get("style"):
                films.append((os.path.getmtime(os.path.join(FILMS, slug)), slug, pl))
    out = []
    for sid, name in PLANNED:
        mine = sorted([x for x in films if x[2].get("style") == sid], reverse=True)
        demos = []
        for _, slug, pl in mine[:6]:
            try:
                st = status(slug)
                demos.append({"slug": slug, "title": st["title"] or st["topic"], "state": st["state"], "video": st["video"], "dna": pl.get("dna") or {},
                              "cover": next((x["stills"][1] if len(x["stills"]) > 1 else x["stills"][0] for x in st["scenes"] if x["stills"]), "") or next((x["backdrop"] for x in st["scenes"] if x["backdrop"]), "")})
            except Exception:
                continue
        out.append({"id": sid, "name": built.get(sid, {}).get("name", name), "blurb": built.get(sid, {}).get("blurb", ""), "ready": sid in built, "demos": demos,
                    "best_for": built.get(sid, {}).get("best_for", ""), "demo": built.get(sid, {}).get("demo", "")})
    return {"styles": out}


@router.get("/argon")
def films():
    if not os.path.isdir(FILMS):
        return {"films": []}
    out = []
    for slug in sorted(os.listdir(FILMS), key=lambda s: -os.path.getmtime(os.path.join(FILMS, s))):
        if os.path.exists(os.path.join(FILMS, slug, "plan.json")) or os.path.exists(os.path.join(FILMS, slug, "argon.log")):
            try:
                s = status(slug)
                out.append({k: s[k] for k in ("slug", "topic", "title", "state", "started", "video", "queue", "reason")} | {"scenes": len(s["scenes"]),
                           "cover": next((x["stills"][1] if len(x["stills"]) > 1 else x["stills"][0] for x in s["scenes"] if x["stills"]), "") or next((x["backdrop"] for x in s["scenes"] if x["backdrop"]), "")})
            except Exception:
                continue
    return {"films": out}


@router.get("/argon/{slug}/live")
def live(slug: str):
    """What the agent is doing this second (video/argon.py writes live/): the code it is typing into each scene (with
    the code before, when it is fixing one), its last actions, and the render's progress. The editor polls it fast."""
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    d = os.path.join(FILMS, slug, "live")
    if not os.path.isdir(os.path.join(FILMS, slug)):
        raise HTTPException(404, "No such film")
    scenes = {}
    if os.path.isdir(d):
        for name in os.listdir(d):
            m = re.match(r"scene-(\d+)\.json$", name)
            if m and (x := _read(os.path.join(d, name))):
                scenes[int(m.group(1))] = x
    events = []
    ev = os.path.join(d, "events.jsonl")
    if os.path.exists(ev):
        for l in open(ev).read().splitlines()[-80:]:
            try:
                e = json.loads(l)
                if e.get("url"):
                    e["url"] = _url(e["url"])
                events.append(e)
            except Exception:
                pass
    running = _running(slug)
    now = time.time()
    busy = sorted((x for x in scenes.values() if x.get("state") == "streaming" and now - x.get("t", 0) < 300), key=lambda x: -x.get("t", 0)) if running else []
    return {"running": running, "now": now, "scenes": scenes, "events": events, "render": _read(os.path.join(d, "render.json")),
            "busy": [x["scene"] for x in busy]}


@router.get("/argon/{slug}")
def film(slug: str):
    return status(re.sub(r"[^a-z0-9-]", "", slug))


class StartIn(BaseModel):
    topic: str
    language: str = "English"
    vertical: bool = False
    style: str = ""




# ---------------- the queue ----------------
# Every film is an entry in the queue, in order. lane "now": made right away, in parallel with the other "now" films
# (what you asked for first). lane "next": made one at a time, only when nothing else is being made. An entry is
# waiting, running or paused; a film that stops (an error, or you pressed Stop) PAUSES in its place with the reason, and
# the queue does not move on until you resume it or remove it.
QUEUE = os.path.join(FILMS, "_queue.json")
_qlock = threading.Lock()


def _queue() -> list[dict]:
    return _read(QUEUE, []) or []


def _save_queue(q: list[dict]) -> None:
    before = {j["slug"] for j in _queue()}
    gone = before - {j["slug"] for j in q}
    if gone:  # a record of every film that leaves the queue, and from where
        import traceback
        open(os.path.join(FILMS, "_queue.log"), "a").write(f"{time.strftime('%H:%M:%S')} left the queue: {', '.join(sorted(gone))} via {traceback.extract_stack()[-2].name}\n")
    seen, once = set(), []
    for j in q:  # a film is in the queue once, at its first place
        if j["slug"] not in seen:
            seen.add(j["slug"])
            once.append(j)
    os.makedirs(FILMS, exist_ok=True)
    json.dump(once, open(QUEUE, "w"), indent=1)


def _any_running() -> bool:
    return bool(subprocess.run(["pgrep", "-f", "argon.py --slug"], capture_output=True, text=True).stdout.strip())


def _finished(slug: str) -> bool:
    log = os.path.join(FILMS, slug, "argon.log")
    return os.path.exists(os.path.join(VIDEO, "out", f"argon-{slug}.mp4")) and os.path.exists(log) and "DONE" in open(log).read()[-3000:]


def _reason(slug: str) -> str:
    """why a film stopped, in plain words, from what it wrote last"""
    d = os.path.join(FILMS, slug)
    if os.path.exists(os.path.join(d, "stopped")):
        return "Stopped by you."
    run = open(os.path.join(d, "run.log")).read()[-5000:] if os.path.exists(os.path.join(d, "run.log")) else ""
    if "Traceback" in run:
        last = [l for l in run.splitlines() if l.strip()][-1]
        if "429" in last or "RESOURCE_EXHAUSTED" in last:
            return "Google kept refusing requests (its usage limit for your project). Resume when the limit resets."
        if "402" in run[-3000:] or "in balance" in run[-3000:] or "pictures could be made" in last:
            return "Google Vertex could not make the pictures (check the Google Cloud billing and the image model's quota), then Resume."
        if "render failed" in run:
            return "The render stopped on a scene that crashes. Resume to fix it and render again."
        return f"It hit an error: {last[:180]}"
    return "It stopped without finishing."


def _launch(job: dict) -> None:
    d = os.path.join(FILMS, job["slug"])
    os.makedirs(d, exist_ok=True)
    if os.path.exists(os.path.join(d, "stopped")):
        os.remove(os.path.join(d, "stopped"))
    backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    args = ([sys.executable, "-u", os.path.join(VIDEO, "argon.py"), "--slug", job["slug"], "--topic", job["topic"], "--language", job.get("language", "English")]
            + (["--vertical"] if job.get("vertical") else []) + (["--style", job["style"]] if job.get("style") else [])
            + (["--steps", job["steps"]] if job.get("steps") else []))
    subprocess.Popen(args, cwd=backend, stdout=open(os.path.join(d, "run.log"), "a"), stderr=subprocess.STDOUT, start_new_session=True)
    open(os.path.join(d, "argon.log"), "a").write(f"[{time.strftime('%H:%M:%S')}] {'Resuming' if job.get('steps') else 'Starting'} the motion agent on {job['topic']}\n")


def pump() -> None:
    """keep the queue moving: notice films that ended, start the "now" films, then the next film when nothing runs and
    nothing is paused"""
    with _qlock:
        q = _queue()
        for j in q:
            if j.get("state") == "running" and not _running(j["slug"]):
                if _finished(j["slug"]):
                    j["state"] = "done"
                else:
                    j["state"], j["reason"] = "paused", _reason(j["slug"])
        q = [j for j in q if j.get("state") != "done"]
        for j in q:
            if j.get("lane") == "now" and j.get("state", "waiting") == "waiting":
                _launch(j)
                j["state"] = "running"
        busy = any(j.get("state") in ("running", "paused") for j in q) or _any_running()
        if not busy:
            nxt = next((j for j in q if j.get("state", "waiting") == "waiting"), None)
            if nxt:
                _launch(nxt)
                nxt["state"] = "running"
        _save_queue(q)


def _pump_forever() -> None:
    while True:
        try:
            pump()
        except Exception:
            pass
        time.sleep(8)


threading.Thread(target=_pump_forever, daemon=True).start()


def enqueue(job: dict, front: bool = False, lane: str = "next") -> int:
    job = {**job, "lane": lane, "state": "waiting", "reason": ""}
    with _qlock:
        q = _queue()
        old = next((j for j in q if j["slug"] == job["slug"]), None)
        if old:  # already in line: it keeps its place
            old.update(job)
        else:
            q = [job] + q if front else q + [job]
        _save_queue(q)
        pos = [j["slug"] for j in q].index(job["slug"]) + 1
    d = os.path.join(FILMS, job["slug"])
    os.makedirs(d, exist_ok=True)
    json.dump({k: job[k] for k in ("topic", "language", "vertical", "style") if k in job}, open(os.path.join(d, "job.json"), "w"))
    open(os.path.join(d, "argon.log"), "a").write(f"[{time.strftime('%H:%M:%S')}] " + ("Starting now, alongside the others" if lane == "now" else f"Queued: {pos} in line (made one at a time)") + "\n")
    pump()
    return pos


@router.post("/argon/{slug}/remove")
def remove(slug: str):
    """take a film out of the queue (it stops if it is being made)"""
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    with _qlock:
        _save_queue([j for j in _queue() if j["slug"] != slug])
    subprocess.run(["pkill", "-f", f"argon.py --slug {slug}( |$)"])
    return {"slug": slug, "removed": True}


@router.post("/argon")
def start(body: StartIn):
    """Put a film in the queue (one film is made at a time); the page follows it through status()."""
    topic = " ".join(body.topic.split())[:160]
    if not topic:
        raise HTTPException(400, "Name the topic.")
    slug = (re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")[:40] or "film") + "-" + time.strftime("%m%d%H%M%S")
    style = body.style if body.style in {x["id"] for x in _styles_mod().options()} else ""
    pos = enqueue({"slug": slug, "topic": topic, "language": body.language, "vertical": body.vertical, "style": style})
    return {"slug": slug, "position": pos}


@router.post("/argon/{slug}/resume")
def resume(slug: str):
    """Go on from where the film stopped: what is already made (plan, voice, pictures, written scenes) is kept."""
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    d = os.path.join(FILMS, slug)
    if not os.path.isdir(d):
        raise HTTPException(404, "No such film")
    if _running(slug):
        raise HTTPException(409, "It is being made right now.")
    job = _read(os.path.join(d, "job.json"), {}) or {}
    plan = _read(os.path.join(d, "plan.json"), {}) or {}
    job.update(slug=slug, topic=job.get("topic") or plan.get("topic") or slug, language=job.get("language") or plan.get("language", "English"),
               vertical=job.get("vertical", plan.get("vertical", False)), style=job.get("style") or plan.get("style", ""),
               steps="voice,assets,code,check,render" if plan else "")
    return {"slug": slug, "position": enqueue(job, lane="now")}


@router.post("/argon/{slug}/redo")
def redo(slug: str):
    """Write every scene again with the newest rules and kit (the plan, voice and pictures stay), check and render; it goes
    to the front of the queue."""
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    d = os.path.join(FILMS, slug)
    plan = _read(os.path.join(d, "plan.json"), {}) or {}
    if not plan:
        raise HTTPException(409, "This film has no plan yet: resume it instead.")
    subprocess.run(["pkill", "-f", f"argon.py --slug {slug}( |$)"])
    job = _read(os.path.join(d, "job.json"), {}) or {}
    job.update(slug=slug, topic=job.get("topic") or plan.get("topic") or slug, language=plan.get("language", "English"), vertical=plan.get("vertical", False),
               style=plan.get("style", ""), steps="assets,recode,render")
    return {"slug": slug, "position": enqueue(job, front=True, lane="now")}


@router.post("/argon/{slug}/rerender")
def rerender(slug: str):
    """Render a finished film again with the newest motion and kit (nothing else is redone); it starts right away."""
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    d = os.path.join(FILMS, slug)
    plan = _read(os.path.join(d, "plan.json"), {}) or {}
    if not plan:
        raise HTTPException(409, "This film has no plan yet: resume it instead.")
    job = _read(os.path.join(d, "job.json"), {}) or {}
    job.update(slug=slug, topic=job.get("topic") or plan.get("topic") or slug, language=plan.get("language", "English"), vertical=plan.get("vertical", False),
               style=plan.get("style", ""), steps="render")
    return {"slug": slug, "position": enqueue(job, front=True, lane="now")}


@router.post("/argon/{slug}/stop")
def stop(slug: str):
    """Stop making this film: it stays in its place in the queue, paused, until you resume or remove it."""
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    subprocess.run(["pkill", "-f", f"argon.py --slug {slug}( |$)"])
    with _qlock:  # it keeps its place in the queue, paused; the queue waits for you
        q = _queue()
        for j in q:
            if j["slug"] == slug:
                j["state"], j["reason"] = "paused", "Stopped by you."
        _save_queue(q)
    d = os.path.join(FILMS, slug)
    if os.path.isdir(d):
        open(os.path.join(d, "argon.log"), "a").write(f"[{time.strftime('%H:%M:%S')}] Stopped by you\n")
        open(os.path.join(d, "stopped"), "w").write(time.strftime("%H:%M:%S"))
    return {"slug": slug, "stopped": True}
