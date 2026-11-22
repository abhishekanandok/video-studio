"""Producer: owns making the media. Records the voices (Gemini TTS), fetches the full-size picture the human picked (or
draws one, only when the human asks), renders each scene (Remotion "Notes") and joins the film. Never changes a word or a
design: it makes exactly what was approved."""

import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor

import archive
import notes
import pipeline as base
from app.llm import get_llm

from crew.state import HERE, p, save_json


# ---------- voices ----------
def clear_take(slug: str, key: str) -> None:
    for name in os.listdir(p(slug, "audio")):
        if name == f"{key}.wav" or name.startswith(f"{key}-l"):
            os.remove(p(slug, "audio", name))


def record(slug: str, cfg: dict, key: str, lines: list[dict]) -> dict:
    """Every line on its own in its host's voice (bare text only: an instruction in the prompt gets read aloud), joined with
    natural pauses. Returns {seconds, line_at}."""
    voices = {r["name"]: r["voice"] for r in cfg["roles"]}
    c = base.client()
    at, line_at, paths, gaps = 0.0, [], [], []
    for j, ln in enumerate(lines):
        path = p(slug, "audio", f"{key}-l{j:02d}.wav")
        d = notes.speak_line(c, voices[ln["speaker"]], ln["speech"], path)
        gap = float(ln.get("pause") or 0.2) + (0.15 if j + 1 < len(lines) and lines[j + 1]["speaker"] != ln["speaker"] else 0)
        line_at.append(round(at, 3))
        at += d + gap
        paths.append(path)
        gaps.append(gap)
    notes.join_wavs(paths, gaps, p(slug, "audio", f"{key}.wav"))
    return {"seconds": round(at, 3), "line_at": line_at, "audio": f"audio/{key}.wav"}


def record_many(slug: str, cfg: dict, script: dict, keys: list[str], say) -> dict:
    out, done = {}, [0]

    def one(k):
        clear_take(slug, k)
        out[k] = record(slug, cfg, k, script[k]["lines"])
        done[0] += 1
        say(f"Recorded {k} ({out[k]['seconds']:.0f}s)", done=done[0])
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(one, keys))
    return out


# ---------- pictures ----------
def full_picture(slug: str, title: str) -> dict:
    full = archive.commons(title, slug, width=1400)
    cr = json.load(open(p(slug, "credits.json"))).get(title, {})
    return {"src": f"archive/{os.path.basename(full)}", "credit": f"{cr.get('licence', '').upper()} · WIKIMEDIA COMMONS".strip(" ·")}


def draw_picture(slug: str, key: str, want: str) -> dict | None:
    """A clean, static textbook illustration (no text in it). Only when the human asks for it at the pictures gate."""
    png = get_llm().generate_image(notes.DRAW.format(want=want))
    if not png:
        return None
    os.makedirs(p(slug, "images"), exist_ok=True)
    open(p(slug, "images", f"{key}.png"), "wb").write(png)
    return {"src": f"images/{key}.png", "credit": "", "drawn": True}


# ---------- scenes ----------
def scene_props(st: dict) -> dict:
    """Props for every scene, in the Notes composition's format (index 0 = the cold open)."""
    order, script, takes, direction, slides = st["order"], st["script"], st["takes"], st.get("direction") or {}, st["slides"]
    total, speed, title = len(order) + 1, st.get("speed") or 1.0, st["plan"]["title"]
    hook = script["hook"]
    props = {"hook": {"kind": "hook", "index": 0, "total": total, "title": title, "kicker": hook["kicker"], "headline": hook["headline"],
                      "audio": "audio/hook.wav", "seconds": takes["hook"]["seconds"], "speed": speed, "line_at": takes["hook"]["line_at"],
                      "bullet_at": [], "lines": hook["lines"]}}
    for i, k in enumerate(order):
        pic = (st.get("pictures") or {}).get(k) or {}
        chosen = pic.get("chosen") or {}
        props[k] = {"kind": "slide", "index": i + 1, "total": total, "title": title, "section": slides[k]["section"],
                    "slide_title": slides[k]["title"], "bullets": slides[k]["bullets"], "pages": None,
                    "audio": f"audio/{k}.wav", "seconds": takes[k]["seconds"], "speed": speed, "line_at": takes[k]["line_at"],
                    "bullet_at": (direction.get(k) or {}).get("bullet_at") or script[k]["bullet_at"], "lines": script[k]["lines"],
                    "image": chosen.get("src"), "credit": chosen.get("credit", ""), "split": 0, "visual": None,
                    "diagram": (direction.get(k) or {}).get("diagram")}
    return props


def render(slug: str, props: dict, keys: list[str], say) -> dict:
    """Render the given scenes (only those whose props changed since their last render). Returns key -> video path."""
    index = {k: pr["index"] for k, pr in props.items()}
    stale = []
    for k in keys:
        i = index[k]
        js, mp4 = p(slug, "render", f"scene{i:03d}.json"), p(slug, "render", f"scene{i:03d}.mp4")
        if not (os.path.exists(mp4) and os.path.exists(js) and json.load(open(js)) == props[k]):
            save_json(js, props[k])
            stale.append(i)
    if stale:
        # still scenes by the fast export (fastrender.py: stills + FFmpeg); a scene that moves every frame by Remotion
        import fastrender
        say(f"Rendering {len(stale)} scenes", "build", done=0, total=len(stale))
        fast = [i for i in stale if fastrender.can_be_fast(json.load(open(p(slug, "render", f"scene{i:03d}.json"))))]
        slow = [i for i in stale if i not in fast]
        n = 0

        def one(i):
            nonlocal n
            n += 1
            say(f"Scene {i} rendered", done=n)

        fastrender.render_scenes(slug, fast, one)
        fastrender.forget_fast(slug, slow)
        proc = subprocess.Popen(["node", os.path.join(HERE, "notes-render.mjs"), slug, ",".join(map(str, slow))], cwd=HERE,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) if slow else None
        for line in (proc.stdout if proc else []):
            if line.startswith("SCENE_DONE"):
                n += 1
                say(f"Scene {line.split()[1]} rendered", done=n)
            elif line.strip() and not line.startswith("PROGRESS"):
                print(line.rstrip(), flush=True)
        if proc and proc.wait() != 0:
            raise RuntimeError("A scene failed to render (see pipeline.log)")
    return {k: {"index": index[k], "video": f"render/scene{index[k]:03d}.mp4"} for k in keys}


def join(slug: str, n: int) -> str:
    lst = p(slug, "render", "list.txt")
    with open(lst, "w") as fh:
        for i in range(n):
            fh.write(f"file '{p(slug, 'render', f'scene{i:03d}.mp4')}'\n")
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    target = os.path.join(HERE, "out", f"{slug}.mp4")
    import fastrender
    fastrender.join(slug, n, target)  # copies clips that are all fast; re-encodes once when Remotion made some
    return f"{slug}.mp4"
