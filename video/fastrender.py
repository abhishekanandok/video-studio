"""Fast export for the Notes renderer (notes films, crew films, audio films): a few stills per scene + FFmpeg.

A slide film is almost all still frames (a slide holds while it is talked through), yet Remotion screenshots every frame
in a browser: a 13-minute film is ~23,500 screenshots, ~25 minutes. Here each scene is rendered by the same Notes
renderer only at the moments it changes (the card landing, each bullet arriving), and FFmpeg holds every still for
exactly its frames, fades each change in, adds the scene's voice, and encodes on the NVIDIA card (NVENC). The same
13-minute film takes ~4 minutes. On screen, bullets fade in instead of sliding up, and a heading's highlighter is
already drawn when the card fades in; everything else is the same renderer, frame for frame in timing.

Scenes that really move every frame (a Skill 2 animation before the slide, a moving picture) still go through Remotion:
can_be_fast() says which. The creator approved this export for every film (2026-10-05).
"""

import json
import math
import os
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, LEAD, TAIL = 30, 0.4, 0.6  # src/notes/Notes.tsx
FADE = 10  # frames (1/3 s): a change fades in about as long as a bullet's slide-in in Notes.tsx (9 frames)


def ffmpeg() -> str:
    """The full FFmpeg build from the imageio-ffmpeg package (Remotion's own ffmpeg has no xfade, fade or zoompan)."""
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def ff(*args: str) -> None:
    r = subprocess.run([ffmpeg(), "-y", "-loglevel", "error", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-400:])


def can_be_fast(p: dict) -> bool:
    """False for a scene that moves every frame: an animation before the slide, or a picture whose subject moves."""
    return not ((p.get("visual") and (p.get("split") or 0) > 0) or (p.get("sprite") and p.get("motion")))


def frames(p: dict) -> int:
    """Notes.tsx notesFrames."""
    if p.get("frames"):
        return max(1, int(p["frames"]))
    return max(1, math.ceil((LEAD + (p.get("seconds") or 1) / (p.get("speed") or 1) + TAIL) * FPS))


def _line_frame(p: dict, line: int) -> int:
    """Notes.tsx lineFrame: the frame a spoken line starts at."""
    at = p["line_at"][line] if line < len(p.get("line_at") or []) else 0
    lead = p["lead"] if p.get("lead") is not None else LEAD
    return round((lead + at / (p.get("speed") or 1)) * FPS)


def _bullet_frame(p: dict, k: int) -> int:
    """Notes.tsx bulletFrame (no animation phase, so no offset): the frame bullet k starts to appear."""
    line = (p.get("bullet_at") or [0])[k] if k < len(p.get("bullet_at") or []) else 0
    return max(8, _line_frame(p, line)) + (8 if k == 0 else 0)


def states(p: dict) -> list[tuple[int, int]]:
    """A scene as its still states: (frame the change starts fading in, frame to capture it once settled). The first is
    the empty page at frame 0, which the card fades in over. Changes: each bullet arriving, and each picture break
    (props "interludes", frames decided by audiofilm.props) fading in and back out."""
    d = frames(p)
    if p["kind"] == "picture":  # the picture, then each montage picture as it comes in
        out = [(0, 0), (0, min(FADE, d - 1))]
        for m in p.get("montage") or []:
            if out[-1][0] + FADE <= m["at"] < d - FADE:
                out.append((m["at"], min(m["at"] + FADE, d - 1)))
        return out
    if p["kind"] == "hook":  # the headline card, its highlighter and the title tag have all landed by frame 45
        return [(0, 0), (0, min(45, d - 1))]
    starts = [_bullet_frame(p, k) for k in range(len(p.get("bullets") or []))]
    breaks = sorted(x for it in p.get("interludes") or [] if not it.get("zoom")  # a zoom break moves: scene_plan
                    for x in (it["from"], it["to"]) if x < d - FADE)  # a break running to the end never comes back
    first = min(starts[:1] + breaks[:1] or [d])
    out = [(0, 0), (0, min(26 if first > 26 else first - 1, d - 1))]  # card landed, title swept
    changes = sorted(set(min(s, d - FADE) for s in starts) | set(breaks))
    for k, s in enumerate(changes):
        if k + 1 < len(changes) and changes[k + 1] < s + FADE and s not in breaks:
            continue  # the next bullet arrives before this one has settled: they fade in together
        if s < out[-1][0] + FADE:  # too close to the last change (or at the very end): shown with it
            out[-1] = (out[-1][0], min(max(s + FADE, out[-1][1]), d - 1))
            continue
        out.append((s, min(s + FADE, d - 1)))
    return out


def break_frames(p: dict, images: list, look: dict) -> list[dict]:
    """Picture breaks for a slide's props: bullet k's picture (images[k]) fills the screen after bullet k has arrived.
    The bullet is first read on the slide for read_seconds (default 3: the creator, 2026-10-05, "give more time to
    the bullet", no time wasted on the photo).
    interlude_mode "seconds": then its picture for the look's seconds (default 2), back on the slide before the next
    bullet (left out if under 1 s).
    interlude_mode "until_next" (the creator, 2026-10-05): the bullet is read for read_seconds, then its picture stays
    until the narrator starts the next bullet: the slide comes back just as that bullet arrives. The last picture stays
    to the end of the scene."""
    starts = [_bullet_frame(p, k) for k in range(len(p.get("bullets") or []))]
    d, out = frames(p), []
    until_next = look.get("interlude_mode") == "until_next"
    read = round(float(look.get("read_seconds") or 3.0) * FPS)
    hold = round(float(look.get("interlude_seconds") or 2.0) * FPS)
    for k, st in enumerate(starts):
        img = images[k] if k < len(images) else None
        if not img:
            continue
        nxt = starts[k + 1] if k + 1 < len(starts) else None
        if until_next:
            frm = st + FADE + read
            to = (nxt - FADE) if nxt is not None else d + FADE  # the last one never fades back
            if to - frm >= 20 and frm < d - FADE:
                out.append({"from": frm, "to": to, "image": img})
        else:
            frm = st + FADE + read  # the bullet has landed and been read
            to = min(frm + hold, (nxt if nxt is not None else d) - FADE - 12)
            if to - frm >= FPS:
                out.append({"from": frm, "to": to, "image": img})
    return out


ZOOM, LABEL_FADE, TRAVEL = 24, 12, 15  # src/notes/Notes.tsx  # src/notes/Notes.tsx: the picture grows in half a second, then its labels fade in


LABEL_HOLD = 45  # a moving zoom: its labels hold 1.5 s on the still whole picture, then the clip plays


def zoom_window(p: dict, look: dict, two: bool = False, hold_frames: int | None = None) -> tuple[int, int] | None:
    """When a slide's zoom break happens (the creator, 2026-10-05): just before its last bullet, once the bullet before
    it has been read; if that gap is too short, still before it (the last bullet waits until the picture is back: this
    changes p["line_at"]), else after the last bullet. The picture holds at full size for the look's
    seconds (at least 3). Returns (from, to): grow from `from`, shrink from `to`; None when there is no room."""
    starts = [_bullet_frame(p, k) for k in range(len(p.get("bullets") or []))]
    d = frames(p)
    read = round(float(look.get("read_seconds") or 3.0) * FPS)
    hold = round((max(3.0, float(look.get("interlude_seconds") or 3.0)) + (1.5 if two else 0)) * FPS)  # two pictures: more to read
    if hold_frames:
        hold = hold_frames
    need = ZOOM + hold + ZOOM
    short = min(read, FPS)  # a shorter read (1 s) before giving the zoom up: every slide zooms (the creator, 2026-10-06)
    for r_ in (read, short):  # just before the last bullet, once the one before it has been read
        if len(starts) >= 2:
            frm = starts[-2] + FADE + r_
            if starts[-1] - FADE - 6 - frm >= need:
                return frm, frm + ZOOM + hold
    if len(starts) >= 2:  # the gap is too short: still before the last bullet, which then lands as the picture goes
        # back (the creator, 2026-10-11: the zoom came after the last point; it belongs before it)
        frm = starts[-2] + FADE + short
        last = frm + need + 6
        if last + FADE + 2 * FPS <= d:
            k = (p.get("bullet_at") or [])[-1] if p.get("bullet_at") else len(starts) - 1
            lead = p["lead"] if p.get("lead") is not None else LEAD
            at = list(p["line_at"])
            at[k] = max(at[k], round(last / FPS - lead, 3) * (p.get("speed") or 1))
            p["line_at"] = at  # (the props are this scene's: the last bullet waits for the zoom)
            return frm, frm + ZOOM + hold
    for r_ in (read, short):  # else after the last bullet
        frm = (starts[-1] if starts else 30) + FADE + r_
        if d - 6 - frm >= need:
            return frm, frm + ZOOM + hold
    for k in range(len(starts) - 2, 0, -1):  # else the latest gap between two earlier bullets that holds it
        frm = starts[k - 1] + FADE + short
        if starts[k] - FADE - 6 - frm >= need:
            return frm, frm + ZOOM + hold
    return None


def moving_spans(p: dict) -> list[tuple[int, int]]:
    """The frames of a scene that move (a zoom break growing, its labels fading, it shrinking): rendered frame by frame."""
    d, out = frames(p), []
    for it in p.get("interludes") or []:
        if it.get("zoom") and it.get("motion"):  # growing + labels in; labels out + the clip + shrinking back (every frame)
            st = it["motion"]["start"]
            out += [(it["from"], min(d, it["from"] + ZOOM + LABEL_FADE)), (max(0, st - LABEL_FADE), min(d, it["to"] + ZOOM))]
        elif it.get("zoom") and it.get("points") and it.get("style") in ("pen", "spotlight", "tour"):
            # grows; the pen / light / camera glides to each part and its label fades in; the camera eases out; shrinks
            out.append((it["from"], min(d, it["from"] + ZOOM + LABEL_FADE)))
            out += [(q["at"], min(d, q["at"] + TRAVEL + LABEL_FADE)) for q in it["points"]]
            out.append((max(0, it["to"] - 2 * LABEL_FADE), min(d, it["to"] + ZOOM)))
        elif it.get("zoom"):
            out += [(it["from"], min(d, it["from"] + ZOOM + LABEL_FADE)), (max(0, it["to"] - LABEL_FADE), min(d, it["to"] + ZOOM))]
    for q in p.get("pointer") or []:  # a glance: the pen glides over the slide's picture
        out.append((max(0, q["at"] - 10), min(d, q["at"] + TRAVEL)))
    merged = []
    for a, b in sorted(x for x in out if x[1] > x[0]):  # overlapping spans become one
        if merged and a <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
        else:
            merged.append((a, b))
    return merged


def scene_plan(p: dict) -> list[dict]:
    """The scene as parts: still parts (a few stills held and cross-faded, as states() says) and moving parts (every
    frame). Each part: {kind, a, b, states?}; frames [a, b)."""
    d, spans = frames(p), moving_spans(p)
    base = states(p)
    if not spans:
        return [{"kind": "still", "a": 0, "b": d, "states": base}]
    parts, at = [], 0
    for a, b in spans + [(d, d)]:
        if a > at:  # a still part from `at` to `a`: what shows at its start, then the changes inside it
            if at == 0:
                st = base[:2] + [x for x in base[2:] if x[0] < a - FADE]
            else:  # right after a moving part: the frame there is settled (the picture at full size, or the slide back)
                st = [(at, at)] + [x for x in base if at < x[0] < a - FADE]
            parts.append({"kind": "still", "a": at, "b": a, "states": st})
        if b > a:
            parts.append({"kind": "frames", "a": a, "b": b})
        at = max(at, b)
    return parts


def stills_of(plan: list[dict]) -> list[int]:
    """Every frame the scene needs a still of."""
    out = set()
    for part in plan:
        out |= {c for _, c in part["states"]} if part["kind"] == "still" else set(range(part["a"], part["b"]))
    return sorted(out)


_nvenc = None


def encoder() -> list[str]:
    """NVENC on the NVIDIA card when this machine has one, else x264."""
    global _nvenc
    if _nvenc is None:
        try:
            ff("-f", "lavfi", "-i", "color=c=black:s=256x256:d=0.1", "-c:v", "h264_nvenc", "-f", "null", "-")
            _nvenc = True
        except RuntimeError:
            _nvenc = False
    return (["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "19", "-b:v", "0", "-profile:v", "high"] if _nvenc
            else X264)


X264 = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-tune", "stillimage", "-profile:v", "high"]


WORK = os.environ.get("VIDEO_WORK") or (r"D:\video-studio-work" if os.path.isdir("D:/") else "")  # big scratch, off C: (full)


def _fast(base: str, *name: str) -> str:
    """The fast export's scratch (stills, part clips): D:/video-studio-work/<film>/fast, or the film's render/fast."""
    root = os.path.join(WORK, os.path.basename(base.rstrip("\\/")), "fast") if WORK else os.path.join(base, "render", "fast")
    return os.path.join(root, *name)


def _still(base: str, i: int, frame: int) -> str:
    return _fast(base, f"s{i:03d}-f{frame:05d}.png")


def _encode(args: list[str], out: str) -> None:
    try:
        ff(*args, *encoder(), "-pix_fmt", "yuv420p", "-an", out)
    except RuntimeError:  # NVENC busy (too many encodes at once on this card): the CPU encoder instead
        ff(*args, *X264, "-pix_fmt", "yuv420p", "-an", out)


def _still_part(base: str, i: int, p: dict, part: dict, out: str) -> None:
    """Frames [a, b) from a few stills: each held for its frames, each change cross-faded in, a picture scene slowly
    pushed in."""
    a, b, st, fade = part["a"], part["b"], part["states"], FADE / FPS
    n_all = b - a
    ins, chain = [], []
    for j, (t, cap) in enumerate(st):
        t = max(t, a) - a
        nxt = (max(st[j + 1][0], a) - a) if j + 1 < len(st) else None
        n = (nxt - t + FADE) if nxt is not None else n_all - t
        ins += ["-loop", "1", "-framerate", str(FPS), "-t", f"{n / FPS:.4f}", "-i", _still(base, i, cap)]
        zoom = (f",scale=3840:2160,zoompan=z='1+0.06*in/{max(1, n)}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps={FPS}"
                if p["kind"] == "picture" and j >= 1 else "")
        chain.append(f"[{j}:v]settb=AVTB,fps={FPS}{zoom},format=yuv420p[v{j}]")
    last = "v0"
    for j in range(1, len(st)):
        chain.append(f"[{last}][v{j}]xfade=transition=fade:duration={fade:.4f}:offset={(max(st[j][0], a) - a) / FPS:.4f}[x{j}]")
        last = f"x{j}"
    chain.append(f"[{last}]format=yuv420p[vout]")  # xfade hands back 4:4:4, which browsers and phones can't play
    _encode([*ins, "-filter_complex", ";".join(chain), "-map", "[vout]", "-frames:v", str(n_all), "-r", str(FPS)], out)


def _frames_part(base: str, i: int, part: dict, out: str) -> None:
    """Frames [a, b), each its own still (the zoom of a picture break)."""
    lst = out + ".txt"
    with open(lst, "w") as fh:
        for fr in range(part["a"], part["b"]):
            fh.write(f"file '{_still(base, i, fr)}'\nduration {1 / FPS:.6f}\n")
        fh.write(f"file '{_still(base, i, part['b'] - 1)}'\n")
    _encode(["-f", "concat", "-safe", "0", "-i", lst, "-vf", f"fps={FPS},format=yuv420p", "-frames:v", str(part["b"] - part["a"]),
             "-r", str(FPS)], out)


def _clip(base: str, i: int, p: dict, plan: list[dict]) -> None:
    """One scene: its parts encoded and joined (frame-accurate), then the scene's own voice (after the lead-in, at the
    film's speed) when it has one."""
    d = frames(p)
    parts = []
    for k, part in enumerate(plan):
        out = _fast(base, f"scene{i:03d}-part{k:02d}.mp4")
        (_still_part(base, i, p, part, out) if part["kind"] == "still" else _frames_part(base, i, part, out))
        parts.append(out)
    video = _fast(base, f"scene{i:03d}-video.mp4")
    if len(parts) == 1:
        os.replace(parts[0], video)
    else:
        lst = _fast(base, f"scene{i:03d}-parts.txt")
        with open(lst, "w") as fh:
            fh.writelines(f"file '{x}'\n" for x in parts)
        ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video)
    out = os.path.join(base, "render", f"scene{i:03d}.mp4")
    tmp = os.path.join(base, "render", f"scene{i:03d}.fast.mp4")
    if p.get("audio") and os.path.exists(os.path.join(base, p["audio"])):
        lead = p["lead"] if p.get("lead") is not None else LEAD
        speed = p.get("speed") or 1
        tempo = f"atempo={speed}," if abs(speed - 1) > 1e-3 else ""
        ff("-i", video, "-i", os.path.join(base, p["audio"]), "-filter_complex",
           f"[1:a]{tempo}aresample=48000,adelay={round(lead * 1000)}:all=1,apad,atrim=0:{d / FPS:.4f}[aout]",
           "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", tmp)
    else:
        shutil.move(video, tmp)  # the scratch is on D:, the clip on C:
    os.replace(tmp, out)  # only a finished clip ever has the real name
    open(os.path.join(base, "render", f"scene{i:03d}.fast"), "w").write("stills + ffmpeg")


def render_scenes(slug: str, which: list[int], say=None) -> None:
    """Render scenes `which` of public/<slug> fast, from their props in render/scene<NNN>.json, each to render/scene<NNN>.mp4.
    say(i) is called as each scene finishes."""
    if not which:
        return
    base = os.path.join(HERE, "public", slug)
    os.makedirs(_fast(base), exist_ok=True)
    props = {i: json.load(open(os.path.join(base, "render", f"scene{i:03d}.json"), encoding="utf-8")) for i in which}
    plans = {i: scene_plan(props[i]) for i in which}
    spec = [{"props": f"render/scene{i:03d}.json", "scene": i, "frame": fr, "out": _still(base, i, fr)}
            for i in which for fr in stills_of(plans[i])]
    spec_path = _fast(base, "spec.json")
    json.dump(spec, open(spec_path, "w"))
    for attempt in range(3):  # a failed run (Windows short of connections, a browser hiccup) resumes after a pause
        r = subprocess.run(["node", os.path.join(HERE, "notes-stills.mjs"), slug, spec_path], cwd=HERE, capture_output=True, text=True)
        if r.returncode == 0:
            break
        err = next((ln.strip() for ln in (r.stdout + r.stderr).splitlines() if "Error" in ln and "at " not in ln[:6]), "")
        print(f"  stills failed (try {attempt + 1}): {err[:160]}; trying again in 45 s", flush=True)
        if attempt < 2:
            import time
            time.sleep(45)
    else:
        raise RuntimeError(f"The stills failed to render: {(r.stdout + r.stderr)[-400:]}")

    def one(i):
        _clip(base, i, props[i], plans[i])
        if say:
            say(i)

    with ThreadPoolExecutor(4) as ex:
        list(ex.map(one, which))


def all_fast(slug: str, n: int) -> bool:
    """Whether every scene clip came from this fast path (then they join without re-encoding). A Remotion render of a
    scene deletes its marker (forget_fast)."""
    base = os.path.join(HERE, "public", slug, "render")
    return all(os.path.exists(os.path.join(base, f"scene{i:03d}.fast")) for i in range(n))


def forget_fast(slug: str, which: list[int]) -> None:
    """Called before Remotion renders these scenes: their clips will no longer be fast ones."""
    for i in which:
        try:
            os.remove(os.path.join(HERE, "public", slug, "render", f"scene{i:03d}.fast"))
        except FileNotFoundError:
            pass


def join(slug: str, n: int, target: str, audio: str | None = None) -> None:
    """Join scene clips 0..n-1 into target. Clips from both renderers re-encode once (their encodings differ); clips that
    are all fast are copied. audio: a recording laid over the whole film instead of the scenes' own sound."""
    base = os.path.join(HERE, "public", slug, "render")
    lst = os.path.join(base, "list.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{os.path.join(base, f'scene{i:03d}.mp4')}'\n" for i in range(n))
    video = ["-c:v", "copy"] if all_fast(slug, n) else [*encoder(), "-pix_fmt", "yuv420p"]
    if audio:
        ff("-f", "concat", "-safe", "0", "-i", lst, "-i", audio, "-map", "0:v", "-map", "1:a", *video, "-c:a", "aac", "-b:a", "192k",
           "-shortest", "-movflags", "+faststart", target)
    else:
        ff("-f", "concat", "-safe", "0", "-i", lst, "-map", "0:v", "-map", "0:a", *video, "-c:a", "aac", "-b:a", "192k",
           "-movflags", "+faststart", target)
