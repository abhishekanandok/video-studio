"""Jointed paper puppets for the paper cut-out style (video/styles.py): a character the film can really animate, with
arms and legs that swing at their pins, like a felt-and-card puppet on split pins.

  1. KIT: the image model makes the character as a puppet kit, laid flat in separate pieces (head, torso, arms,
     thighs, lower legs) on a white table, in the film's look.
  2. PIECES: the white is cut away and every separate piece is found (connected shapes on the cut-out).
  3. NAMES: a vision model is shown the kit with a number on each piece and says what each piece is and which end
     of it joins the body. Extra or broken pieces are left out.
  4. RIG: each piece is cropped, turned so its joint end is up, and written with its size; rig.json says which piece
     is the head, the torso, each arm and leg. video/src/argon/kit.tsx <Puppet> draws it and moves the joints.

Run alone to test:  .venv/bin/python ../video/puppet.py <out-dir> "<a schoolboy in a rust jacket...>" ["<style words>"]"""

import io
import json
import os
import sys

from pydantic import BaseModel, Field

KIT_PROMPT = ("A paper puppet KIT laid flat on a plain pure white table, photographed from directly above with flat even light and no shadows. "
              "The puppet is {who}, seen in side profile facing right, {style}, with small brass split pins at the joint holes. "
              "The puppet is DISASSEMBLED into exactly these 8 separate pieces, each fully separate with wide white gaps, none touching or "
              "overlapping, in a neat grid: 1 head (with hair and any hat, one piece, facing right), 1 torso (with clothes and anything worn on "
              "the back, one piece), 2 whole arms (each one piece from shoulder to hand), 2 thighs, 2 lower legs (each with its shoe). "
              "No extra pieces, no text, no labels, no numbers, no other objects.")


class Piece(BaseModel):
    n: int
    part: str = Field(description="head | torso | arm | thigh | shin | other")
    joint: str = Field(description="which side of the piece joins the body: top | bottom | left | right (head: the neck side; torso: none)")


class Names(BaseModel):
    pieces: list[Piece]
    neck: list[float] = Field(description="on the TORSO piece: where the neck joins, [x, y] as fractions 0-1 of the torso's box")
    shoulder: list[float] = Field(description="on the TORSO piece: where the arms are pinned, [x, y] fractions")
    hip: list[float] = Field(description="on the TORSO piece: where the legs are pinned, [x, y] fractions")


def make_kit(llm, who: str, style: str) -> bytes | None:
    return llm.generate_image(KIT_PROMPT.format(who=who, style=style or "made of felt and textured card in a warm earthy palette"))


def pieces_of(png: bytes, min_frac: float = 0.002):
    """the separate shapes on a cut-out kit: [(box, crop RGBA)], largest first"""
    import numpy as np
    from PIL import Image
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from motionfx import cut_out
    im = Image.open(io.BytesIO(cut_out(png))).convert("RGBA")
    a = np.array(im)[:, :, 3] > 40
    # also drop near-white pixels the flood fill left inside gaps
    rgb = np.array(im)[:, :, :3].min(axis=2) > 235
    a &= ~rgb
    h, w = a.shape
    s = 4  # label on a smaller grid, fast enough without scipy
    small = a[::s, ::s]
    lab = np.zeros(small.shape, dtype=np.int32)
    n = 0
    for y0, x0 in zip(*np.nonzero(small)):
        if lab[y0, x0]:
            continue
        n += 1
        stack = [(y0, x0)]
        lab[y0, x0] = n
        while stack:
            y, x = stack.pop()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < small.shape[0] and 0 <= xx < small.shape[1] and small[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    stack.append((yy, xx))
    out = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) < min_frac * small.size:
            continue
        box = (int(xs.min() * s), int(ys.min() * s), int(min(w, (xs.max() + 1) * s)), int(min(h, (ys.max() + 1) * s)))
        mask = np.zeros((h, w), dtype=bool)
        grow = lab == k  # one cell wider, so the full-size alpha (not the coarse grid) draws the edge
        grow = grow | np.roll(grow, 1, 0) | np.roll(grow, -1, 0) | np.roll(grow, 1, 1) | np.roll(grow, -1, 1)
        big = np.kron(grow, np.ones((s, s), dtype=bool))[:h, :w]
        mask[: big.shape[0], : big.shape[1]] = big
        arr = np.array(im).copy()
        arr[:, :, 3] = np.where(mask & a, arr[:, :, 3], 0)
        crop = Image.fromarray(arr).crop(box)
        out.append((box, crop))
    out.sort(key=lambda p: -(p[0][2] - p[0][0]) * (p[0][3] - p[0][1]))
    return im, out


def numbered(im, parts) -> bytes:
    from PIL import ImageDraw
    sheet = im.copy().convert("RGB")
    d = ImageDraw.Draw(sheet)
    for i, (b, _) in enumerate(parts):
        cx, cy = (b[0] + b[2]) // 2, (b[1] + b[3]) // 2
        d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=(220, 20, 60))
        d.text((cx - 7, cy - 10), str(i + 1), fill=(255, 255, 255))
        d.rectangle(b, outline=(220, 20, 60), width=3)
    buf = io.BytesIO()
    sheet.save(buf, "PNG")
    return buf.getvalue()


def name_pieces(sheet_png: bytes, count: int) -> dict:
    from google.genai import types
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import argon
    ask = [types.Part.from_bytes(data=sheet_png, mime_type="image/png"),
           f"This is a disassembled paper puppet kit. Each of the {count} pieces has a red number. For EVERY number say what the piece is "
           "(head, torso, arm = a whole arm with its hand, thigh, shin = a lower leg with its shoe, other = anything else or a duplicate or a "
           "piece that is only a forearm or only a hand) and which side of it joins the body (an arm joins at the shoulder end, not the hand "
           "end; a thigh at the hip end; a shin at the knee end, not the shoe end; the head at the neck side). Then, on the torso piece, give "
           "where the neck, the shoulder pin and the hip pin are, as fractions of the torso's box."]
    return Names.model_validate_json(argon.think(ask, "You label puppet pieces precisely.", Names)).model_dump()


class HeadPin(BaseModel):
    neck: list[float] = Field(description="on this HEAD piece: the point where the head joins the body, just under the chin at the front of the neck, [x, y] as fractions 0-1 of the image")


def head_pin(head_png: bytes) -> list[float]:
    """where the head piece is pinned to the body: under the chin, not the bottom of whatever hangs below it (a scarf, hair)"""
    from google.genai import types
    import argon
    ask = [types.Part.from_bytes(data=head_png, mime_type="image/png"),
           "This is the HEAD piece of a paper puppet seen in profile. Give the point just under the chin where the neck joins the body "
           "(ignore any scarf ends, long hair or collar hanging below it)."]
    pt = HeadPin.model_validate_json(argon.think(ask, "You locate puppet joints precisely.", HeadPin)).neck[:2]
    return [min(0.95, max(0.05, pt[0])), min(0.98, max(0.3, pt[1]))]


def toes_forward(img):
    """a lower leg with its shoe, knee end up: the shoe must point forward (right, the way the puppet faces); a shoe
    drawn pointing back is mirrored. The shoe is the part of the bottom that sticks out from the leg's column."""
    import numpy as np
    from PIL import ImageOps
    a = np.array(img)[:, :, 3] > 40
    h = a.shape[0]
    top = a[: h // 2]
    cols = np.nonzero(top.any(axis=0))[0]
    if not len(cols):
        return img
    leg_mid = (cols.min() + cols.max()) / 2  # the middle of the leg above the shoe
    foot = np.nonzero(a[int(h * 0.8):])[1]
    if not len(foot):
        return img
    return ImageOps.mirror(img) if foot.mean() < leg_mid - 2 else img


def rig(png: bytes, out_dir: str) -> dict:
    """the kit image -> piece PNGs (each turned with its joint end up) and rig.json"""
    from PIL import Image
    os.makedirs(out_dir, exist_ok=True)
    im, parts = pieces_of(png)
    names = name_pieces(numbered(im, parts), len(parts))
    turn = {"top": 0, "bottom": 180, "left": -90, "right": 90}  # rotate so the joint end is at the top
    got: dict[str, list] = {"head": [], "torso": [], "arm": [], "thigh": [], "shin": []}
    for p in names["pieces"]:
        if p["part"] not in got or not (1 <= p["n"] <= len(parts)):
            continue
        crop: Image.Image = parts[p["n"] - 1][1]
        if p["part"] in ("arm", "thigh", "shin"):
            crop = crop.rotate(turn.get(p["joint"], 0), expand=True)
        if p["part"] == "shin":
            crop = toes_forward(crop)
        elif p["part"] == "head" and p["joint"] in ("top", "left", "right"):
            crop = crop.rotate({"top": 180, "left": 90, "right": -90}[p["joint"]], expand=True)
        got[p["part"]].append(crop)
    need = {"head": 1, "torso": 1, "arm": 2, "thigh": 2, "shin": 2}
    missing = [k for k, v in need.items() if len(got[k]) < v]
    if missing:
        raise ValueError(f"the kit is missing {', '.join(missing)}")
    files = {}
    for k in need:
        for i, crop in enumerate(got[k][: need[k]]):
            name = f"{k}{i}.png"
            crop.save(os.path.join(out_dir, name))
            files[f"{k}{i}"] = {"file": name, "w": crop.width, "h": crop.height}
    data = {"pieces": files, "neck": names["neck"][:2], "shoulder": names["shoulder"][:2], "hip": names["hip"][:2],
            "head_neck": head_pin(open(os.path.join(out_dir, "head0.png"), "rb").read())}
    json.dump(data, open(os.path.join(out_dir, "rig.json"), "w"), indent=1)
    return data


def repin(out_dir: str) -> dict:
    """add the head's pin to a rig made before head pins existed"""
    path = os.path.join(out_dir, "rig.json")
    data = json.load(open(path))
    data["head_neck"] = head_pin(open(os.path.join(out_dir, "head0.png"), "rb").read())
    json.dump(data, open(path, "w"), indent=1)
    return data


if __name__ == "__main__":
    if sys.argv[1] == "--fixlegs":  # rigs made before: turn any shoe that points back
        from PIL import Image
        for d in sys.argv[2:]:
            for k in ("shin0", "shin1"):
                f = os.path.join(d, f"{k}.png")
                im = Image.open(f).convert("RGBA")
                out = toes_forward(im)
                if out is not im:
                    out.save(f)
                    print(d, k, "mirrored: the shoe pointed back")
        sys.exit(0)
    if sys.argv[1] == "--repin":
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
        for d in sys.argv[2:]:
            print(d, repin(d)["head_neck"])
        sys.exit(0)
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
    from app.llm import get_llm
    out, who = sys.argv[1], sys.argv[2]
    kit = os.path.join(out, "kit.png")
    os.makedirs(out, exist_ok=True)
    if not os.path.exists(kit):
        open(kit, "wb").write(make_kit(get_llm(), who, sys.argv[3] if len(sys.argv) > 3 else ""))
    print(json.dumps(rig(open(kit, "rb").read(), out), indent=1))
