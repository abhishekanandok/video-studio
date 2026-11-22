"""The on-screen host: one painted presenter with a pose library the renderer animates.

From one approved portrait, every pose is an EDIT of that portrait (same person, clothes and brushwork), painted on flat
green and keyed out. Each pose also gets a mouth-open and an eyes-closed edit; only the region that changed is kept, as a
small patch at a known position, so the renderer can make the host talk (mouth driven by the voice) and blink by laying
the patch over the pose. An edit that moved more than the face is rejected and retried.

    public/hosts/<name>/<pose>.png           keyed full pose (RGBA)
    public/hosts/<name>/<pose>-mouth.png      patch, and <pose>-blink.png
    public/hosts/<name>/host.json             {pose: {w, h, mouth: [x, y, w, h] | null, blink: [...] | null}}

Run from backend/:  .venv/bin/python ../video/host.py --name arjun --ref path/to/portrait.png
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, os.path.dirname(__file__))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import pipeline as base  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
POSES = {
    "talk": "standing relaxed, hands loosely together at waist height, looking straight at the viewer",
    "explain": "both hands open in front of the chest, palms up, explaining something, looking at the viewer",
    "point_right": "body turned slightly, right arm extended pointing firmly to the far right edge of the frame, "
                   "head turned towards where he points",
    "point_left": "body turned slightly, left arm extended pointing firmly to the far left edge of the frame, "
                  "head turned towards where he points",
    "count": "one hand raised at shoulder height showing two fingers, as if counting points, looking at the viewer",
    "think": "one hand on his chin, thoughtful, looking slightly up",
    "shrug": "a small open-handed shrug, eyebrows slightly raised, half smile",
}
KEEP = ("Keep EXACTLY the same person, face, hair, glasses, beard, clothes and painterly brush style as the attached "
        "portrait. Waist-up, centred, same size in frame. Background: perfectly flat, solid pure green (#00FF00), no "
        "shadows on it, no text.")


def key(img: Image.Image) -> Image.Image:
    """Green-screen key with despill: green-dominant pixels become transparent, edges soften, fringes lose their green."""
    a = np.asarray(img.convert("RGB")).astype(np.int32)  # int32: (spill - 30) * 255 overflows 16 bits
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = g - np.maximum(r, b)
    alpha = np.clip(255 - (spill - 30) * 255 // 50, 0, 255)  # spill <= 30 opaque, >= 80 transparent
    g2 = np.where(spill > 0, np.maximum(r, b), g)  # despill
    out = np.dstack([r, g2, b, alpha]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def patch(pose: Image.Image, variant: Image.Image, max_share: float = 0.045) -> tuple[Image.Image, list[int]] | None:
    """The small region where `variant` differs from `pose` (the mouth, or the eyes), or None if the edit moved more
    than a small part of the image (then it can't be overlaid without a visible jump)."""
    p, v = np.asarray(pose.convert("RGB")).astype(np.int32), np.asarray(variant.convert("RGB")).astype(np.int32)
    if p.shape != v.shape:
        return None
    diff = np.abs(p - v).sum(axis=2) > 60
    # the DENSE region of change: re-encoding sprinkles a little noise everywhere, so look at 16-px cells and keep the
    # ones where a real share of pixels changed
    cell = 16
    hh, ww = diff.shape[0] // cell, diff.shape[1] // cell
    dens = diff[:hh * cell, :ww * cell].reshape(hh, cell, ww, cell).mean(axis=(1, 3))
    cy, cx = np.nonzero(dens > 0.15)
    if len(cx) < 2:
        return None
    pad = 8
    x0, y0 = max(0, cx.min() * cell - pad), max(0, cy.min() * cell - pad)
    x1, y1 = min(p.shape[1] - 1, (cx.max() + 1) * cell + pad), min(p.shape[0] - 1, (cy.max() + 1) * cell + pad)
    if (x1 - x0) * (y1 - y0) > max_share * p.shape[0] * p.shape[1]:
        return None
    keyed = key(variant)
    return keyed.crop((x0, y0, x1 + 1, y1 + 1)), [int(x0), int(y0), int(x1 - x0 + 1), int(y1 - y0 + 1)]


def edit(c, ref: str, prompt: str, dst: str) -> Image.Image:
    base.STYLE = ""
    if not os.path.exists(dst):
        base.paint(c, prompt, dst, [ref], lead="")
    return Image.open(dst)


def build(name: str, ref: str, poses: list[str] | None = None) -> dict:
    out = os.path.join(HERE, "public", "hosts", name)
    raw = os.path.join(out, "raw")
    os.makedirs(raw, exist_ok=True)
    c = base.client()
    meta_path = os.path.join(out, "host.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    for pose in poses or list(POSES):
        if pose in meta:
            continue
        img = edit(c, ref, f"The same presenter, {POSES[pose]}, mouth closed, eyes open. {KEEP}", os.path.join(raw, f"{pose}.png"))
        key(img).save(os.path.join(out, f"{pose}.png"))
        entry = {"w": img.width, "h": img.height, "mouth": None, "blink": None}
        for part, change in (("mouth", "ONLY his mouth slightly open, as if in the middle of saying a word"),
                             ("blink", "ONLY his eyes closed, as in a natural blink")):
            for attempt in range(3):
                src = os.path.join(raw, f"{pose}-{part}{attempt}.png")
                var = edit(c, os.path.join(raw, f"{pose}.png"),
                           f"Edit the attached image: change {change}. Everything else must stay pixel-identical: same pose, "
                           f"framing, face, clothes, background and brushwork. No text.", src)
                got = patch(img, var)
                if got:
                    got[0].save(os.path.join(out, f"{pose}-{part}.png"))
                    entry[part] = got[1]
                    break
                print(f"  {pose} {part}: edit moved too much (attempt {attempt + 1}); retrying", flush=True)
        meta[pose] = entry
        json.dump(meta, open(meta_path, "w"), indent=1)
        print(f"pose {pose}: mouth {'ok' if entry['mouth'] else 'none'}, blink {'ok' if entry['blink'] else 'none'}", flush=True)
    return meta


def crop(name: str, pad: int = 24) -> dict:
    """Crop each pose to its OWN width but one SHARED top and bottom, from the raw paintings: every pose has the same
    height (so the host stays the same size when he changes pose) and no empty sides (so he can be placed by his outline,
    e.g. flush against a panel he points at). Patch positions move with the crop. Safe to run again."""
    out = os.path.join(HERE, "public", "hosts", name)
    meta_path = os.path.join(out, "host.json")
    meta = json.load(open(meta_path))
    if meta.get("_cropped") == "per-pose":
        return meta
    ox, oy = meta.pop("_cropped", [0, 0])  # undo an older shared crop's offsets: patches go back to raw coordinates
    poses = [k for k in meta]
    keyed = {k: key(Image.open(os.path.join(out, "raw", f"{k}.png"))) for k in poses}
    boxes = {k: im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox() for k, im in keyed.items()}
    y0 = max(0, min(b[1] for b in boxes.values()) - pad)
    for k in poses:
        im = keyed[k]
        x0, x1 = max(0, boxes[k][0] - pad), min(im.width, boxes[k][2] + pad)
        im.crop((x0, y0, x1, im.height)).save(os.path.join(out, f"{k}.png"))
        meta[k]["w"], meta[k]["h"] = x1 - x0, im.height - y0
        for part in ("mouth", "blink"):
            r = meta[k][part]
            if r:
                meta[k][part] = [r[0] + ox - x0, r[1] + oy - y0, r[2], r[3]]
    meta["_cropped"] = "per-pose"
    json.dump(meta, open(meta_path, "w"), indent=1)
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--ref", required=True)
    ap.add_argument("--pose", action="append", default=[])
    a = ap.parse_args()
    build(a.name, a.ref, a.pose or None)
    crop(a.name)
