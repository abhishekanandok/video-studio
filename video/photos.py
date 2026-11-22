"""Real photos for films: search Wikimedia Commons for a free-licence photo that matches a line, let Gemini look at the
candidates and pick one (with where its subject is), then save it and its credit.

  fetch(slug, "L03", "Reserve Bank of India headquarters Mumbai", "the RBI building")
    -> {"src": "oneshot/<slug>/photos/L03.jpg", "w", "h", "focus": [x, y], "credit": "...", ...} or None

Licences: only public domain / CC0 / CC BY / CC BY-SA (archive.OK, never NC or ND); every photo used is written to
public/oneshot/<slug>/credits.json and its credit is shown on the photo.
"""
import io, json, os, re, sys, urllib.parse

import httpx
from PIL import Image, ImageDraw
from pydantic import BaseModel, Field

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
from archive import BAD, OK, UA  # noqa: E402

API = "https://commons.wikimedia.org/w/api.php"


def search(query: str, n: int = 8) -> list[dict]:
    """free-licence bitmap photos on Commons for a query, biggest first, at most n"""
    q = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrlimit": 30,
         "gsrsearch": f"{query} filetype:bitmap", "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1920}
    pages = (httpx.get(API, params=q, headers=UA, timeout=30).json().get("query") or {}).get("pages", {})
    strip = lambda s: re.sub(r"<[^>]+>", "", s or "").strip()
    out = []
    for p in sorted(pages.values(), key=lambda p: p.get("index", 99)):
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata") or {}
        lic = strip(meta.get("LicenseShortName", {}).get("value"))
        if ii.get("mime") not in ("image/jpeg", "image/png") or ii.get("width", 0) < 1000 or not OK.match(lic) or BAD.search(lic):
            continue
        out.append({"title": p["title"], "thumb": ii.get("thumburl") or ii["url"], "w": ii["width"], "h": ii["height"], "licence": lic,
                    "artist": strip(meta.get("Artist", {}).get("value"))[:80], "source": ii.get("descriptionurl", "")})
        if len(out) >= n:
            break
    return out


class Pick(BaseModel):
    index: int = Field(description="the number of the photo that best shows what is wanted, or -1 if none does")
    x: float = Field(0.5, description="where the subject is in that photo, 0 (left) to 1 (right)")
    y: float = Field(0.5, description="where the subject is in that photo, 0 (top) to 1 (bottom)")
    reason: str = Field("", description="a few words")


def choose(cands: list[dict], want: str) -> tuple[dict, list[float]] | None:
    """Gemini looks at a numbered sheet of the candidates and picks the one that shows `want` (None if none does)"""
    imgs = []
    for c in cands[:8]:
        try:
            imgs.append((c, Image.open(io.BytesIO(httpx.get(c["thumb"], headers=UA, timeout=60, follow_redirects=True).content)).convert("RGB")))
        except Exception:
            continue
    if not imgs:
        return None
    tw, th = 480, 320
    sheet = Image.new("RGB", (tw * 4, th * ((len(imgs) + 3) // 4)), "white")
    draw = ImageDraw.Draw(sheet)
    for k, (_, im) in enumerate(imgs):
        im = im.copy()
        im.thumbnail((tw - 8, th - 8))
        x, y = (k % 4) * tw + 4, (k // 4) * th + 4
        sheet.paste(im, (x, y))
        draw.rectangle([x, y, x + 46, y + 40], fill="black")
        draw.text((x + 14, y + 10), str(k), fill="white")
    buf = io.BytesIO()
    sheet.save(buf, "JPEG", quality=85)
    try:
        from app.llm import get_llm
        pick = get_llm().look(Pick, buf.getvalue(), f"These are numbered photos. Which ONE clearly shows: {want}? It must be a real photograph "
                              "of that (not a map, diagram, logo, document scan or unrelated scene). Answer its number and where the subject "
                              "sits in it, or -1 if none fits.")
    except Exception as e:  # rate limits or an outage: the first candidate is the search's best guess
        print(f"  photo check skipped ({str(e)[:80]}): using the first result", flush=True)
        return imgs[0][0] | {"_img": imgs[0][1]}, [0.5, 0.5]
    if not 0 <= pick.index < len(imgs):
        return None
    c, im = imgs[pick.index]
    return c | {"_img": im}, [min(0.85, max(0.15, pick.x)), min(0.85, max(0.15, pick.y))]


def fetch(slug: str, cid: str, query: str, want: str) -> dict | None:
    """the photo for one card, saved to public/oneshot/<slug>/photos/<cid>.jpg, its credit recorded; None if none fits"""
    for q in (query, " ".join(query.split()[:3])):
        cands = search(q)
        got = choose(cands, want) if cands else None
        if got:
            break
    else:
        return None
    c, focus = got
    out = os.path.join(HERE, "public", "oneshot", slug, "photos")
    os.makedirs(out, exist_ok=True)
    im = c.pop("_img")
    im.thumbnail((1920, 1920))
    im.save(os.path.join(out, f"{cid}.jpg"), "JPEG", quality=88)
    path = os.path.join(HERE, "public", "oneshot", slug, "credits.json")
    credits = json.load(open(path)) if os.path.exists(path) else {}
    credits[c["title"]] = {"licence": c["licence"], "artist": c["artist"], "source": c["source"], "card": cid}
    json.dump(credits, open(path, "w"), indent=1, ensure_ascii=False)
    who = c["artist"] or "Wikimedia Commons"
    return {"src": f"oneshot/{slug}/photos/{cid}.jpg", "w": im.width, "h": im.height, "focus": focus, "title": c["title"],
            "credit": f"{who} · {c['licence']} · Wikimedia Commons"[:110]}


if __name__ == "__main__":  # python photos.py "<query>" "<what it must show>"
    for c in search(sys.argv[1]):
        print(c["licence"], c["w"], c["title"])
