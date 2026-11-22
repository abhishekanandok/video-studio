"""Correct words on a drawn picture (the creator, 2026-10-11): an image model writes gibberish, so every patch of writing
in a picture is found by Gemini, which also says the right words for it (only from the slide's own content); the patch
is erased (filled from the colours around it) and the words are set by code in clean type. The picture itself stays."""
import os
from typing import Literal

from pydantic import BaseModel, Field

FONTS = "C:/Windows/Fonts/"


class TextPatch(BaseModel):
    box: list[int] = Field(description="[ymin, xmin, ymax, xmax] of this patch of writing, 0-1000 of the picture's height "
                                       "and width, tight around the letters only (never around a drawing)")
    role: Literal["heading", "body", "label", "number"] = Field(description="What the writing there is")
    lines: list[str] = Field(description="The correct words to write there instead, one string per line, as many lines as "
                                         "the patch had (or fewer); empty to leave the patch blank")
    light: bool = Field(False, description="true if the writing there is light on a dark background")


class TextFound(BaseModel):
    has_text: bool = Field(description="true if there is ANY writing in the picture: letters, words or numbers")
    patches: list[TextPatch] = Field(default_factory=list)


ASK = """This picture was drawn by an image model for an exam slide. Image models write gibberish, so every word in it
will be replaced by code. Find EVERY patch of writing in the picture (a title, a paragraph, a label, a list, a legend
entry, a number on a chart, a caption): each as a tight box around its letters only, never around a drawing, a photo,
an arrow, a colour swatch or a chart bar.
For each patch, write the CORRECT words to put there instead, taken only from the slide below, so the picture teaches
the slide: a heading becomes a short heading, a label names what its arrow points at, a list item becomes a slide fact.
Use the slide's own wording: copy names, terms, spellings and facts exactly as the slide (and what the teacher says)
has them; never add a fact, an example or a detail that is not there. A number ONLY if the slide states that number
for that very place; chart ticks, axis values and scale numbers are left EMPTY unless the slide gives exactly those
values. Keep each line about as long as the gibberish it replaces, so it fits. Include even tiny fragments of writing.

The slide:
{content}"""


def find(image_path: str, content: str) -> TextFound | None:
    import slideskill
    try:
        return TextFound.model_validate(slideskill._ask_labels(image_path, ASK.format(content=content), TextFound))
    except Exception as e:
        print(f"  no text check for {os.path.basename(image_path)}: {str(e)[:80]}", flush=True)
        return None


def _erase(im, box) -> None:
    """Fill a patch from the colours just outside it: across (left to right) or down (top to bottom), whichever edge is
    the plainer one (an arrow line or a card's border on one side would smear into it), then soften it."""
    from PIL import ImageFilter, ImageStat
    W, H = im.size
    x0, y0, x1, y1 = box
    px = im.load()

    def spread(cols):
        return sum(ImageStat.Stat(im.crop(c)).stddev[0] for c in cols)

    across = spread([(max(0, x0 - 4), y0, max(1, x0 - 1), y1), (min(W - 1, x1 + 1), y0, min(W, x1 + 4), y1)])
    down = spread([(x0, max(0, y0 - 4), x1, max(1, y0 - 1)), (x0, min(H - 1, y1 + 1), x1, min(H, y1 + 4))])
    avg = lambda pts: tuple(sum(p[i] for p in pts) // len(pts) for i in range(3))  # noqa: E731
    if across <= down:
        for y in range(y0, y1):
            a = avg([px[max(0, x0 - k), y] for k in (2, 3, 4)])
            z = avg([px[min(W - 1, x1 + k), y] for k in (2, 3, 4)])
            for x in range(x0, x1):
                t = (x - x0) / max(1, x1 - x0 - 1)
                px[x, y] = tuple(round(a[i] + (z[i] - a[i]) * t) for i in range(3))
    else:
        for x in range(x0, x1):
            a = avg([px[x, max(0, y0 - k)] for k in (2, 3, 4)])
            z = avg([px[x, min(H - 1, y1 + k)] for k in (2, 3, 4)])
            for y in range(y0, y1):
                t = (y - y0) / max(1, y1 - y0 - 1)
                px[x, y] = tuple(round(a[i] + (z[i] - a[i]) * t) for i in range(3))
    im.paste(im.crop(box).filter(ImageFilter.GaussianBlur(3)), (x0, y0))


def _numbers_ok(line: str, content: str) -> bool:
    """A line of only numbers (a chart's ticks) stays only if the slide has exactly those numbers in a row; a number
    inside words must be one the slide states."""
    import re
    nums = re.findall(r"\d+(?:\.\d+)?", line)
    if not nums:
        return True
    if not re.search(r"[A-Za-z]", line):
        return " ".join(nums) in " ".join(re.findall(r"\d+(?:\.\d+)?", content))
    have = set(re.findall(r"\d+(?:\.\d+)?", content))
    return all(n in have for n in nums)


def _write(im, box, p: TextPatch) -> None:
    """The words in the patch, as big as fit its height and width (one size for all its lines)."""
    from PIL import ImageDraw, ImageFont
    lines = [ln.strip() for ln in p.lines if ln.strip()]
    if not lines:
        return
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    d = ImageDraw.Draw(im)
    face = FONTS + ("georgiab.ttf" if p.role in ("heading", "number") else "georgia.ttf")
    size = max(9, int(h / len(lines) / 1.2))
    while size > 9:
        font = ImageFont.truetype(face, size)
        if max(d.textlength(ln, font=font) for ln in lines) <= w * 1.04:
            break
        size -= 1
    font = ImageFont.truetype(face, size)
    ink = (250, 250, 250) if p.light else (24, 24, 24)
    y = y0 + (h - size * 1.2 * len(lines)) / 2
    for ln in lines:
        d.text((x0, y), ln, font=font, fill=ink)
        y += size * 1.2


def fix(image_path: str, content: str, out_path: str, passes: int = 2) -> bool:
    """The picture with its words corrected, saved to out_path; False when it has no writing (nothing to do) or the
    check failed. A second pass looks at the corrected picture and cleans any writing the first one missed."""
    done = False
    for k in range(passes):
        if not _fix_once(out_path if done else image_path, content, out_path, again=done):
            break
        done = True
    return done


def _fix_once(image_path: str, content: str, out_path: str, again: bool = False) -> bool:
    from PIL import Image
    found = find(image_path, content + ("\n\n(The picture's words were already corrected once: list ONLY writing that is "
                                        "still garbled, misspelled or made up; correct writing is left alone.)" if again else ""))
    if not found or not found.has_text or not found.patches:
        return False
    im = Image.open(image_path).convert("RGB")
    W, H = im.size
    boxes = []
    for p in found.patches:
        if len(p.box) != 4:
            continue
        y0, x0, y1, x1 = p.box
        b = (max(0, int(x0 * W / 1000) - 3), max(0, int(y0 * H / 1000) - 3), min(W, int(x1 * W / 1000) + 3), min(H, int(y1 * H / 1000) + 3))
        if b[2] - b[0] < 6 or b[3] - b[1] < 6 or (b[2] - b[0]) * (b[3] - b[1]) > 0.25 * W * H:
            continue  # nothing, or a box around half the picture (that's a drawing, not writing)
        p.lines = [ln for ln in p.lines if _numbers_ok(ln, content)]  # never a made-up number
        boxes.append((b, p))
    if not boxes:
        return False
    for b, _ in boxes:  # every patch erased first, so no patch samples gibberish from its neighbour
        _erase(im, b)
    for b, p in boxes:
        _write(im, b, p)
    im.save(out_path)
    return True
