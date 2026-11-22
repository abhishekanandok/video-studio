"""Real archival images for documentaries, licence-checked.

Fetches a file from Wikimedia Commons, keeps it only if its licence allows reuse in a monetised video (public domain, CC0,
CC BY, CC BY-SA), and records the credit line in public/<slug>/credits.json for the video description. Anything else
(fair-use-only, non-commercial, no-derivatives, unknown) is refused.

    from archive import commons
    path = commons("File:Luddite.jpg", "film3")
"""

import json
import os
import re
import urllib.parse

import httpx

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "TayyariDocumentary/1.0 (contact: rkraushan0303@gmail.com)"}
OK = re.compile(r"^(public domain|pd|cc0|cc by(-sa)? [0-9.]+( [a-z]+)?|cc-by(-sa)?-[0-9.]+)", re.I)
BAD = re.compile(r"\b(nc|nd|fair use|non-commercial|noncommercial|no derivatives)\b", re.I)


class LicenceError(Exception):
    pass


import threading
_CREDITS = threading.Lock()


def commons(title: str, slug: str, width: int = 1920, preview: bool = False) -> str:
    """Download a free-licence Commons image (checked licence) and record its credit. preview: a small copy in
    archive/_preview/ for Gemini to look at first; the full-size one is fetched only for a picture that matches."""
    q = urllib.parse.urlencode({"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata|size",
                                "iiurlwidth": width, "format": "json"})
    d = httpx.get(f"https://commons.wikimedia.org/w/api.php?{q}", headers=UA, timeout=30).json()
    page = next(iter(d["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise LicenceError(f"{title}: not found on Commons")
    ii, meta = page["imageinfo"][0], page["imageinfo"][0]["extmetadata"]
    strip = lambda s: re.sub(r"<[^>]+>", "", s or "").strip()
    lic = strip(meta.get("LicenseShortName", {}).get("value"))
    if not OK.match(lic) or BAD.search(lic):
        raise LicenceError(f"{title}: licence '{lic}' is not free for commercial reuse")
    out = os.path.join(HERE, "public", slug, "archive", "_preview") if preview else os.path.join(HERE, "public", slug, "archive")
    os.makedirs(out, exist_ok=True)
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", title.split(":", 1)[1])
    path = os.path.join(out, os.path.splitext(name)[0] + ".jpg")
    if not os.path.exists(path):
        r = httpx.get(ii.get("thumburl") or ii["url"], headers=UA, timeout=60, follow_redirects=True)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    if preview:
        return path
    with _CREDITS:
        _credit(title, slug, lic, meta, ii, strip)
    return path


def _credit(title, slug, lic, meta, ii, strip) -> None:
    credits_path = os.path.join(HERE, "public", slug, "credits.json")
    credits = {}
    if os.path.exists(credits_path):  # older files were written in the Windows code page
        raw = open(credits_path, "rb").read()
        try:
            credits = json.loads(raw.decode("utf-8"))
        except UnicodeDecodeError:
            credits = json.loads(raw.decode("cp1252"))
    credits[title] = {"licence": lic, "artist": strip(meta.get("Artist", {}).get("value"))[:200],
                      "description": strip(meta.get("ImageDescription", {}).get("value"))[:200],
                      "date": strip(meta.get("DateTimeOriginal", {}).get("value"))[:120],
                      "source": ii.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title)}"}
    json.dump(credits, open(credits_path, "w", encoding="utf-8"), ensure_ascii=True, indent=1)
