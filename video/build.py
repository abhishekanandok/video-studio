"""The "build-up" edit: every line builds its page piece by piece, each piece landing on the word that names it.

While the narrator says "warship" a ship flies in, on "Japanese" a submarine photo, on "twelve minutes" a torn stamp: the
page fills up over the sentence, and a line may keep the previous page and add to it. The camera never moves; only the
pieces do (they fly in from the nearest edge, overshoot a little and settle). Charts, headlines and title cards stay as the
board draws them.

- Director: Gemini plans 1-4 pieces per line, each with trigger words copied from the line: a real archival photo from the
  chapter, a new cut-out picture (budgeted), a stamped label or a sticky note. Code checks every piece (the words are in the
  line, every number is in the line, pictures carry no text or names) and asks again with the errors.
- Timing: `align` finds when the trigger words are spoken from the pauses in the recorded line (clause ends snap to them).
- Layout: code places pieces in fixed regions (never over the narrator), so a carried piece keeps its place.
"""
import json
import os
import re
import wave
from typing import Literal

from pydantic import BaseModel, Field

import board

CUTOUTS_PER_LINE = 0.7  # new cut-out pictures per spoken line (the rest are real photos, stamps and notes)
MAX_PIECES = 5  # on one page, carried pieces included
USED: dict[str, set[str]] = {}  # per film: the Commons photos already used (a photo appears once in a film)


class Drop(BaseModel):
    at: str = Field(description="1-3 consecutive words copied exactly from the line: the piece lands as they are spoken")
    kind: Literal["photo", "real", "cutout", "stamp", "note", "bullets", "quote", "trend"]
    photo: str = Field("", description="photo: the id of one listed archival photo")
    subject: str = Field("", description="real: exactly who or what the real photo must show (e.g. 'Sam Altman', 'a TSMC chip fab in Taiwan')")
    searches: list[str] = Field(default_factory=list, description="real: 2-3 Wikimedia Commons searches for it")
    picture: str = Field("", description="cutout: the one object or anonymous scene to paint")
    caption: str = Field("", description="photo / real / cutout: what the picture shows, 2-6 words (e.g. 'Nvidia H100 chip')")
    text: str = Field("", description='stamp: a number WITH what it counts, or 1-4 words; note: "BIG|small"; quote: the exact quoted words')
    bullets: list[str] = Field(default_factory=list, description="bullets: 1-3 short points from the line, max 8 words each")
    who: str = Field("", description="quote: who said it, 'Name, role'")
    start: str = Field("", description="trend: the earlier number exactly as the line says it")
    end: str = Field("", description="trend: the later number exactly as the line says it")
    label: str = Field("", description="trend: what is measured, 2-5 words (e.g. 'Oracle employees')")


class BuildLine(BaseModel):
    i: int = Field(description="the line number, as given")
    keep_page: bool = Field(False, description="true to keep the previous line's pieces on the page and add to them")
    pieces: list[Drop]


class BuildPlan(BaseModel):
    lines: list[BuildLine]


BUILDER = """You are the editor of a documentary cut in the "build-up" style: while each line is spoken, its page is built
piece by piece, and every piece lands on screen exactly as the narrator says the words it shows. The page must EXPLAIN,
not just decorate: a viewer with the sound off should still get the point. Plan 2-4 pieces per line:

Pictures (each with a "caption": 2-6 words saying what it shows):
- "photo": one of the real archival photos listed for this chapter (give its id), only when it shows what the words say.
- "real": a REAL photo of a named person, company, building, place, product or event the words name (e.g. Sam Altman,
  Dario Amodei, Jensen Huang, an Nvidia H100, a TSMC fab, the White House, ENIAC, an oil refinery, a data centre). Give
  the exact subject and 2-3 Wikimedia Commons searches. Always use this, never a cut-out, for a real person or thing.
- "cutout": a new collage cut-out picture painted for exactly this moment: ONE object or anonymous scene that shows
  precisely what the words say, specific in kind, era and setting (e.g. "a customs officer inspecting a crate of computer
  chips", "a 1940s room-sized vacuum-tube computer", "an oil pumpjack beside a data centre"). Never a real or named
  person, never a logo or brand, never text, numbers, charts or screens with writing. At most {budget} in this chapter.
Words:
- "stamp": a big stamped label: a number or date WITH what it is ("24,000 FAKE ACCOUNTS", "1999: FIRST GPU",
  "$720 BILLION SPENT"), or 1-4 words ("BANNED", "NOT LOSING MONEY"). Never a bare number or year.
- "note": a sticky note "BIG|small": BIG a number or 1-3 words, small what it means (max 40 chars).
- "bullets": 1-3 short points (max 8 words each) that spell out what the line says, e.g. for "Nvidia invented the GPU in
  1999 and CUDA in 2006": ["1999: Nvidia invents the GPU", "2006: CUDA opens it to science"]. Use them whenever a
  picture alone would leave the screen unexplained.
- "quote": when the line quotes someone, their exact words (copied from the line) and "who" ("Name, role"). ALWAYS add
  a "real" photo of that person on the same page.
- "trend": when the line gives a number going up or down (from X to Y, rose, fell, doubled, cut), the two numbers
  exactly as the line says them and what is measured; it is drawn as bars growing with an arrow and a % change.

Pacing (how Vox and the best explainers cut): something new lands about every 2-3 seconds of narration, so a long line
needs more pieces, spread across its words, never bunched at the start or the end. One idea per screen. Bullets ONLY for a
list, a comparison or several facts in one line, each point max 6 key words (not half a sentence). A page of words also
gets a picture; a picture also gets words (its caption, a stamp or bullets). When a line has a "QUOTE TO SHOW", the page
must show it as a quote piece (those exact words) with a real photo of who said it or of what it is about.
Rules: every page has at least one word piece; a line that quotes someone has a quote AND the person's real photo; a line
with a rise or fall has a trend. "at" is 1-3 consecutive words copied EXACTLY from the line. Pieces are listed in the
order their words are spoken; the first lands within the first few words. Set keep_page true when a line continues the
same moment as the line before (the page keeps its pieces and adds yours; at most {max_pieces} pieces on a page). Never
put a number on screen that is not in the line. Return EVERY line number given."""


# ---- checks ----
def tokens(speech: str) -> list[str]:
    return speech.split()


def norm(w: str) -> str:
    return re.sub(r"[^\w₹$%]", "", w.lower())


def find(speech: str, at: str) -> int:
    """The index of the first word of `at` in the line, or -1."""
    toks, want = [norm(t) for t in tokens(speech)], [norm(t) for t in at.split() if norm(t)]
    if not want:
        return -1
    for k in range(len(toks) - len(want) + 1):
        if toks[k:k + len(want)] == want:
            return k
    return -1


QUOTED = re.compile(r"[\"“]([^\"”]{12,})[\"”]")
TREND = re.compile(r"\b(rose|rise|rising|fell|fall|falling|grew|grow|dropped|drop|doubled|tripled|halved|cut|increased?|decreased?|"
                   r"jumped|surged|plunged|declined?|shrank|up from|down from|from [^.]{0,40}? to)\b", re.I)


def quoted(speech: str) -> str:
    """The words a line quotes, if it quotes someone."""
    m = QUOTED.search(speech)
    return m.group(1).strip() if m else ""


def check_line(b: BuildLine, line: dict, photos: set[str], cutouts_left: int) -> str:
    speech = line.get("speech") or ""
    pool_text = speech + " " + json.dumps(line["beat"], ensure_ascii=False)
    pool, vocab = board.numbers(pool_text), board.words(pool_text)
    short = len(speech.split()) < 8
    if not (1 if short else 2) <= len(b.pieces) <= 4:
        return "need 2-4 pieces (1-4 for a very short line)"
    kinds = [p.kind for p in b.pieces]
    # pacing: something new about every 3 seconds (each bullet point lands on its own words, so it counts)
    secs = (line.get("seconds") or 0) / 1.1
    beats = sum(len(p.bullets) if p.kind == "bullets" else 1 for p in b.pieces)
    need = min(5, max(1, round(secs / 3.2)))
    if beats < need:
        return f"this line lasts about {secs:.0f} seconds: it needs about {need} things landing across it (pieces or bullet points), it has {beats}"
    if not short and not set(kinds) & {"photo", "real", "cutout"}:
        return "a page of words also needs a picture (a real photo or a cut-out of what the line is about)"
    must = (line["beat"].get("text") or "") if line["beat"]["kind"] == "scrap" and line["beat"].get("who") else ""
    if must and "quote" not in kinds:
        return f'show the quote "{must[:50]}" as a quote piece, with who said it'

    if not set(kinds) & {"stamp", "note", "bullets", "quote", "trend"}:
        return "every page needs at least one word piece (stamp, note, bullets, quote or trend) so it explains itself"
    q = quoted(speech)
    if q and len(q.split()) >= 4:
        if "quote" not in kinds:
            return f"the line quotes someone (\"{q[:50]}\"): add a quote piece with their words and who said it"
        if "real" not in kinds and "photo" not in kinds:
            return "the line quotes someone: add a real photo of the person quoted"
    nums = board.numbers(speech)
    if len(nums) >= 2 and TREND.search(speech) and "trend" not in kinds and "note" not in kinds:
        return "the line has a number going up or down: add a trend piece (the two numbers and what is measured)"
    last = -1
    for p in b.pieces:
        k = find(speech, p.at)
        if k < 0:
            return f"'{p.at}' is not in the line word for word"
        if k < last:
            return f"'{p.at}' comes before the previous piece's words; list pieces in spoken order"
        last = k
        if p.kind in ("photo", "real", "cutout"):
            if not 1 <= len(p.caption.split()) <= 7:
                return f"the picture at '{p.at}' needs a caption of 2-6 words saying what it shows"
            if board.numbers(p.caption) - pool:
                return f"caption '{p.caption}' has a number not in the line"
        if p.kind == "photo" and p.photo not in photos:
            return f"photo '{p.photo}' is not one of the listed ids"
        if p.kind == "real" and (not p.subject.strip() or not p.searches):
            return f"real photo at '{p.at}' needs a subject and Commons searches"
        if p.kind == "cutout":
            why = board.check_visual(board.Visual(i=0, kind="cutout", picture=p.picture), line, cutouts_left > 0)
            if why:
                return why
            cutouts_left -= 1
        if p.kind in ("stamp", "note"):
            big, _, small = p.text.partition("|")
            if not big.strip() or (p.kind == "stamp" and (len(p.text) > 30 or len(p.text.split()) > 5)) or (p.kind == "note" and len(big) > 16) or len(small) > 44:
                return f"{p.kind} '{p.text}' is too long"
            if board.numbers(p.text) - pool:
                return f"{p.kind} '{p.text}' has a number not in the line"
            if p.kind == "stamp" and board.numbers(p.text) and not re.search(r"[A-Za-z]{3,}", re.sub(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b", "", p.text, flags=re.I)):
                return f"stamp '{p.text}' is a bare number: say what it counts (e.g. '24,000 FAKE ACCOUNTS')"
            if not (board.words(p.text) & vocab or board.numbers(p.text)):
                return f"{p.kind} '{p.text}' is not about the line's own words"
        if p.kind == "bullets":
            if not 1 <= len(p.bullets) <= 3 or any(len(x.split()) > 7 for x in p.bullets):
                return "bullets: 1-3 points, max 6 key words each (not half a sentence)"
            if any(board.FRAGMENT.search(x) for x in p.bullets):
                return "a bullet must not end mid-phrase (on 'of', 'to', 'the'...)"
            for x in p.bullets:
                if board.numbers(x) - pool:
                    return f"bullet '{x}' has a number not in the line"
                if not (board.words(x) & vocab):
                    return f"bullet '{x}' is not about the line"
        if p.kind == "quote":
            from archivedoc import norm as qnorm
            source = speech + " " + (line["beat"].get("text") or "")  # the narration, or the quote this line must show
            if len(p.text.split()) < 3 or qnorm(p.text) not in qnorm(source) or not p.who.strip():
                return "quote: copy the quoted words exactly from the line, and say who said it"
        if p.kind == "trend":
            a, z = board.numbers(p.start), board.numbers(p.end)
            if not a or not z or (a | z) - pool or not p.label.strip():
                return "trend: both numbers exactly as in the line, and what is measured"
            if not same_kind(p.start, p.end):
                return f"trend: '{p.start}' and '{p.end}' are different kinds of number; compare like with like (two percentages, two amounts)"
    return ""


def same_kind(a: str, b: str) -> bool:
    """Two numbers a trend can compare: both percentages, both money, both multiples, or both plain counts."""
    kind = lambda t: ("%" if "%" in t or "percent" in t.lower() else "$" if re.search(r"[$₹€£]|dollar|rupee|crore|lakh", t, re.I)
                      else "x" if re.search(r"\d\s*x\b|×|times", t, re.I) else "n")
    return bool(a and b) and kind(a) == kind(b)


NUM = re.compile(r"[$₹]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?")


def key_points(speech: str) -> list[str]:
    """Up to 3 points made of the line's key names and quantities ("150,000 exchanges", "Anthropic CEO Dario Amodei"):
    the last resort when no well-written points are to be had; never a cut-up sentence."""
    out = []
    for m in NUM.finditer(speech):
        if re.fullmatch(r"(1[5-9]|20)\d\d", m.group(0)):
            continue
        rest = []
        for w in speech[m.end():].split()[:2]:  # the words after the number, up to the end of its clause
            if not w.strip(",.;:").isalpha() or board.FRAGMENT.search(w.strip(",.;:")):
                break
            rest.append(w.strip(",.;:"))
            if w[-1] in ",.;:":
                break
        out.append(" ".join([m.group(0)] + rest))
    for m in re.finditer(r"\b([A-Z][a-zA-Z&.-]+(?:\s+(?:CEO\s+)?[A-Z][a-zA-Z&.-]+)+)", speech):
        if m.group(1) not in out:
            out.append(m.group(1))
    return [x for x in dict.fromkeys(out)][:3]


def words_page(speech: str, points: list[str] | None = None) -> dict:
    """A page made by code for a line whose plan failed: its points (written by the model and checked, or the line's key
    names and quantities), and a stamp for its first real quantity (never a year) with what it counts."""
    trim = lambda ws: ws[:max(1, next((k for k in range(len(ws), 0, -1) if not board.FRAGMENT.search(" ".join(ws[:k]))), len(ws)))]
    first = re.split(r"[,;:.]\s", speech)[0].split()
    pts = points or key_points(speech) or ([subject_of(speech)] if subject_of(speech) else []) or ([" ".join(first)] if 3 <= len(first) <= 7 else [])
    if not pts:
        return {"keep_page": False, "pieces": []}  # nothing clean to say: the line keeps its own visual
    pieces = [{"at": speech.split()[0], "kind": "bullets", "bullets": pts, "text": "", "caption": ""}]
    for m in NUM.finditer(speech):
        if re.fullmatch(r"(1[5-9]|20)\d\d", m.group(0)):
            continue  # a year is not a quantity
        words = []
        for w in speech[m.end():].split()[:2]:
            if not w.strip(",.;:").isalpha():
                break
            words.append(w.strip(",.;:"))
            if w[-1] in ",.;:":
                break
        text = f"{m.group(0)} {' '.join(trim(words) if words else [])}".strip().upper()
        if words and len(text) <= 30:
            pieces.append({"at": m.group(0), "kind": "stamp", "text": text, "caption": ""})
        break
    return {"keep_page": False, "pieces": pieces}


class Points(BaseModel):
    points: list[str] = Field(description="2-3 short points, max 6 words each, using the line's own words and numbers")


# capitalised only because they start a sentence (English and Hinglish), or dates: never the subject of a photo
NOT_NAMES = set("""the a an but and in on this that these those it its so then yet if when while after before late early
toh to lekin par aur ye yeh wo woh ek is us isne usne inme unme isliye phir jab kya kyun kaise kab kahan agar matlab
sab yahan wahan aaj kal abhi bas haan nahi january february march april may june july august september october november
december monday tuesday wednesday thursday friday saturday sunday generative""".split())


def subject_of(speech: str) -> str:
    """The line's main named subject (a person, company or place), for its photo: the first run of capitalised words,
    within one sentence, that is not just a sentence's first word, a sentence-starter or a date ("...kaam karta hai?
    Jawab simple hai" once put a Taj Mahal building called the Jawab on a page about AI, film 14)."""
    for m in re.finditer(r"\b([A-Z][a-zA-Z&'-]*(?:\.[A-Z][a-zA-Z&'-]*)*(?:\s+[A-Z][a-zA-Z&'-]*(?:\.[A-Z][a-zA-Z&'-]*)*)*)", speech):
        words = [w for w in m.group(1).split() if w.lower().strip("'") not in NOT_NAMES and not re.fullmatch(r"[A-Z]{2,}s", w)]  # not "GPUs"
        first = re.search(r"(^|[.?!:;]\s*)$", speech[:m.start()]) and m.group(1).split()[0] == (words or [""])[0]
        if not words or (first and len(words) == 1) or len(words[0]) < 2:
            continue
        return " ".join(words)
    return ""


def bullet_times(speech: str, times: list[float], bullets: list[str]) -> list[float]:
    """When each bullet point should appear: as the narrator reaches its words (the first of its words, after the
    previous point's), so the points follow the voice. Points whose words are not spoken are spread in between."""
    toks = [norm(t) for t in speech.split()]
    out, after = [], 0
    for x in bullets:
        k = next((j for j in range(after, len(toks)) for w in x.split() if len(norm(w)) > 3 and toks[j] == norm(w)), -1)
        out.append(times[k] if 0 <= k < len(times) else None)
        if k >= 0:
            after = k + 1
    for n, v in enumerate(out):  # fill the gaps evenly
        if v is None:
            prev = next((out[j] for j in range(n - 1, -1, -1) if out[j] is not None), 0.05)
            nxt = next((out[j] for j in range(n + 1, len(out)) if out[j] is not None), 0.8)
            out[n] = round(prev + (nxt - prev) / 2, 3)
    return [round(v, 3) for v in out]


def value(text: str) -> float | None:
    """The number in '162,000', '$55.7 billion' or '19%' (for drawing a trend; the text shown is the line's own)."""
    m = re.search(r"\d[\d,]*(?:\.\d+)?", text or "")
    return float(m.group(0).replace(",", "")) if m else None


# ---- timing ----
def align(wav_path: str, speech: str) -> list[float]:
    """When each word starts, as a fraction of the clip. Words are spread by how long they take to say (numbers count as
    the words they are read as), then every clause end (, . ; : ? !) snaps to a real pause in the recording when one is
    near, and the words between anchors are spread again."""
    import doc
    import numpy as np
    toks = tokens(speech)
    if not toks:
        return []
    weights = [doc.spoken_words(t) for t in toks]
    try:
        with wave.open(wav_path) as w:
            rate, pcm = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    except (OSError, wave.Error):
        cum = np.cumsum([0] + weights)
        return list(cum[:-1] / cum[-1])
    total = len(pcm) / rate
    hop = int(rate * 0.02)
    rms = np.array([np.sqrt(np.mean(pcm[k:k + hop] ** 2)) for k in range(0, len(pcm) - hop, hop)]) if len(pcm) > hop else np.array([0.0])
    loud = rms > max(0.08 * rms.max(), 1.0)
    voiced = np.flatnonzero(loud)
    t0, t1 = (voiced[0] * 0.02, (voiced[-1] + 1) * 0.02) if len(voiced) else (0.0, total)
    pauses, k = [], 0  # centres of silences of 0.12s or more inside the speech
    while k < len(loud):
        if not loud[k]:
            j = k
            while j < len(loud) and not loud[j]:
                j += 1
            if (j - k) * 0.02 >= 0.12 and t0 < k * 0.02 and j * 0.02 < t1:
                pauses.append(((k + j) / 2 * 0.02, j * 0.02))  # (centre, where speech resumes)
            k = j
        else:
            k += 1
    cum = np.cumsum([0] + weights).astype(float)
    start = t0 + (t1 - t0) * cum[:-1] / cum[-1]  # first guess: even spread by spoken length
    anchors = [(0, t0)]
    for n, t in enumerate(toks[:-1]):
        if re.search(r"[,.;:?!…—]$", t):
            guess = start[n + 1]
            near = [p for p in pauses if abs(p[0] - guess) < 0.7 and p[1] > anchors[-1][1]]
            if near:
                anchors.append((n + 1, min(near, key=lambda p: abs(p[0] - guess))[1]))
    anchors.append((len(toks), t1))
    out = [0.0] * len(toks)
    for (a, ta), (b, tb) in zip(anchors, anchors[1:]):
        seg = cum[a:b + 1] - cum[a]
        for n in range(a, b):
            out[n] = ta + (tb - ta) * (seg[n - a] / seg[-1] if seg[-1] else 0)
    return [max(0.0, min(1.0, t / total)) for t in out]


# ---- layout ----
# regions on the 1920x1080 page (the narrator sits bottom-left, so nothing goes there); pictures and words prefer different ones
REGIONS = {
    "A": {"pic": (760, 590, 1040), "txt": (760, 560, 760), "from": "left"},
    "B": {"pic": (600, 250, 560), "txt": (600, 150, 720), "from": "top"},
    "C": {"pic": (1480, 290, 680), "txt": (1460, 200, 840), "from": "right"},
    "D": {"pic": (1470, 760, 720), "txt": (1460, 860, 840), "from": "right"},
    "E": {"pic": (1060, 890, 560), "txt": (1040, 930, 640), "from": "bottom"},
}
PREFER = {"pic": "ACDEB", "txt": "BDCEA"}


def place(pieces: list[dict], taken: set[str], seed: int) -> None:
    for n, p in enumerate(pieces):
        kind = "pic" if p["kind"] in ("photo", "cutout") else "txt"
        region = next((r for r in PREFER[kind] if r not in taken), None)
        if region is None:
            p["drop"] = True
            continue
        taken.add(region)
        x, y, w = REGIONS[region][kind]
        rot = round(((seed * 7 + n * 13) % 9 - 4) * 0.9, 1)
        p.update(x=x, y=y, w=w, rot=rot, frm=REGIONS[region]["from"], region=region)


class Picture(BaseModel):
    picture: str = Field(description="ONE physical object or anonymous scene, described for a painter in 6-15 words")
    caption: str = Field(description="2-5 words naming what the picture shows")


PICTURE = ("Pick ONE picture for this documentary line: a physical object or an anonymous scene that shows what it is "
           "about (a chip wafer, a server hall, a power plant, a cargo ship of chips). Never a named or real person, no "
           "faces, no logos, and nothing with words, numbers, charts or screens of text in it.")


# ---- the edit ----
class Builder:
    def __init__(self, director: "board.Director"):
        self.d = director

    def points(self, line: dict) -> list[str] | None:
        """2-3 well-written points for a line whose page plan failed, checked like any bullets (the line's own words and
        numbers, short, never mid-phrase); None when they do not pass."""
        try:
            got = self.d.llm.structured(Points, "Write 2-3 short on-screen points (max 6 words each) that capture what this "
                                        "documentary line says. Use only its own words and numbers. Key words, not sentences.",
                                        line["speech"]).points[:3]
        except Exception:
            return None
        vocab, pool = board.words(line["speech"]), board.numbers(line["speech"])
        ok = [x for x in got if len(x.split()) <= 7 and not board.FRAGMENT.search(x) and not (board.numbers(x) - pool) and board.words(x) & vocab]
        return ok if len(ok) >= 2 else None

    def picture(self, i: int, line: dict) -> dict | None:
        """An extra picture for a page left without one (its photo was not found, or was already used in the film): first
        a real photo of the line's named subject, else a new painted cut-out of one object or anonymous scene from the line
        (never a real person's likeness, never words, numbers or charts in the image)."""
        who = subject_of(line["speech"])
        src = self.real(who, [who], line["speech"]) if who else None
        if src:
            return {"kind": "photo", "src": src, "caption": who}
        try:
            got = self.d.llm.structured(Picture, PICTURE, line["speech"])
        except Exception:
            return None
        src = self.d.cutout(i, got.picture, color=line.get("era") == "present")
        return {"kind": "cutout", "src": src, "caption": got.caption} if src else None

    def real(self, subject: str, searches: list[str], line: str) -> str | None:
        """A real, licensed photo of a named person or thing from Wikimedia Commons, checked by Gemini to really show it
        (the archival agent's finder). Never an AI likeness of a real person. A photo is used ONCE in a film: every finder
        of the film shares one list of used photos (the script's archive photos included), so the same person seen again
        gets a different photo of them, or none."""
        import archivedoc
        if not hasattr(self, "finder"):
            self.finder = archivedoc.Agent.__new__(archivedoc.Agent)
            self.finder.slug, self.finder.llm, self.finder.out = self.d.slug, self.d.llm, self.d.out
            if self.d.slug not in USED:
                picks = json.load(open(os.path.join(self.d.out, "images.json"))) if os.path.exists(os.path.join(self.d.out, "images.json")) else {}
                USED[self.d.slug] = {p["title"] for p in picks.values() if p}
            self.used = USED[self.d.slug]
            self.found: dict[tuple[str, str], str | None] = {}
        if not subject:
            return None
        key = (subject, line)
        if key in self.found:  # the same request for the same line (a rerun), not the same person on another line
            return self.found[key]
        try:
            got = self.finder.find_image(subject, searches[:3] or [subject], line, self.used)
        except Exception:
            got = None
        if got:
            self.used.add(got["title"])
        self.found[key] = got["src"] if got else None
        return self.found[key]

    def plan(self, lines: list[dict], chapter: list[int], n: int, budget: int, extra: str = "") -> dict:
        ask = [i for i in chapter if lines[i].get("audio") and not lines[i].get("cut") and lines[i]["beat"]["kind"] not in ("newschart", "newshead", "title")]
        photos = {lines[i]["beat"]["src"]: lines[i]["beat"].get("caption", "") for i in chapter
                  if lines[i]["beat"]["kind"] == "photo" and not lines[i]["beat"].get("cutout")}
        if not ask:
            return {}
        def listing(ids):
            rows = []
            for i in ids:
                b = lines[i]["beat"]
                q = f'\n    QUOTE TO SHOW: "{b["text"]}" ({b.get("who", "")})' if b["kind"] == "scrap" and b.get("who") and b.get("text") else ""
                rows.append(f"[{i}] {lines[i]['speech']}{q}")
            return "\n".join(rows)
        pics = "\n".join(f"- id {k}: {v[:140]}" for k, v in photos.items()) or "(none in this chapter)"
        system = BUILDER.format(budget=budget, max_pieces=MAX_PIECES)
        got, feedback, todo = {}, "", ask
        for _ in range(3):
            try:
                plan = self.d.llm.structured(BuildPlan, system, f"ARCHIVAL PHOTOS YOU MAY USE:\n{pics}\n\nLINES:\n{listing(todo)}{extra}{feedback}")
            except Exception as e:  # a broken or cut-off reply is a failed round, tried again; three failures keep the board
                self.d.st.update(msg=f"Build director reply failed ({str(e)[:60]}); trying again")
                feedback = "\n\nYour last answer broke off. Answer with the JSON only, and keep it short."
                continue
            errors = []
            used = sum(1 for v in got.values() for p in v["pieces"] if p["kind"] == "cutout")
            for b in plan.lines:
                if b.i not in todo or b.i in got:
                    continue
                why = check_line(b, lines[b.i], set(photos), budget - used)
                if why:
                    errors.append(f"[{b.i}] {why}")
                    continue
                got[b.i] = {"keep_page": b.keep_page, "pieces": [p.model_dump() for p in b.pieces]}
                used += sum(1 for p in b.pieces if p.kind == "cutout")
            todo = [i for i in ask if i not in got]
            if not todo:
                break
            feedback = "\n\nFIX THESE PROBLEMS FROM YOUR LAST ANSWER:\n" + "\n".join(errors + [f"[{i}] missing" for i in todo if not any(e.startswith(f"[{i}]") for e in errors)])
        return {str(k): v for k, v in got.items()}

    def pieces(self, i: int, ln: dict, got: dict) -> list[dict]:
        """One line's planned pieces made real: pictures found or painted, each landing on its word in the voice."""
        times = align(os.path.join(self.d.out, "..", ln["audio"]), ln["speech"])
        pieces = []
        for p in got["pieces"]:
            if p["kind"] == "real":
                src = self.real(p.get("subject", ""), p.get("searches", []), ln["speech"])
            else:
                src = p["photo"] if p["kind"] == "photo" else self.d.cutout(i, p["picture"], color=ln.get("era") == "present") if p["kind"] == "cutout" else None
            if p["kind"] in ("photo", "real", "cutout") and not src:
                continue  # a picture that could not be found or painted to match is left out
            w = find(ln["speech"], p["at"])
            piece = {"kind": "photo" if p["kind"] == "real" else p["kind"], "src": src, "text": p["text"],
                     "caption": p.get("caption", ""), "at": round(times[w], 3) if 0 <= w < len(times) else 0.0}
            if p["kind"] == "bullets":  # it explains the whole line: it lands at the start (its points follow the voice)
                piece["at"] = min(piece["at"], 0.05)
            if p["kind"] == "bullets":
                piece["bullets"] = p.get("bullets", [])
                piece["bullet_at"] = bullet_times(ln["speech"], times, piece["bullets"])
            if p["kind"] == "quote":
                piece["who"] = p.get("who", "")
            if p["kind"] == "trend":
                a, z = value(p.get("start", "")), value(p.get("end", ""))
                if a is None or z is None:
                    continue
                piece.update(start=p["start"], end=p["end"], label=p.get("label", ""), a=a, z=z)
            pieces.append(piece)
        if not any(q.get("src") for q in pieces) and len(ln["speech"].split()) >= 8:
            extra = self.picture(i, ln)  # a page always has a picture: its real or painted one could not be had
            if extra:
                pieces.insert(0, {**extra, "text": "", "at": round(times[0], 3) if times else 0.0})
        return pieces

    def apply(self, out: list[dict], chapters: list[list[int]], blank: str | None, only: set[int] | None = None, tag: str = "") -> None:
        """Turn the board's lines into built pages (in place). `only` limits it to some lines (demos)."""
        spoken = sum(1 for ln in out if ln.get("audio"))
        self.d.st.update("visuals", f"Building the pages of {len(chapters)} chapters", done=0, total=len(chapters))
        for n, ch in enumerate(chapters):
            self.d.st.update(done=n)
            ch = [i for i in ch if only is None or i in only]
            if not ch:
                continue
            budget = max(1, round(CUTOUTS_PER_LINE * spoken * len(ch) / len(out)))
            name = f"build{n:02d}.json" if only is None or tag else f"build-demo{n:02d}.json"
            plan = self.d.cache(name, lambda: self.plan(out, ch, n, budget))
            page: list[dict] = []
            for k, i in enumerate(ch):
                got = plan.get(str(i))
                if got:  # a saved plan is held to today's rules too: a trend comparing unlike numbers is dropped
                    got = {**got, "pieces": [p for p in got["pieces"] if p["kind"] != "trend" or same_kind(p.get("start", ""), p.get("end", ""))]}
                if not got or not got["pieces"]:
                    if out[i].get("era") == "present" and out[i]["beat"]["kind"] in ("plate", "notes", "connect", "scrap") and out[i].get("speech"):
                        got = words_page(out[i]["speech"], self.points(out[i]))  # never an empty grid
                        who = subject_of(out[i]["speech"])
                        if who:  # and a real photo of what it is about, so the words never stand alone
                            got["pieces"].insert(0, {"at": who.split()[0], "kind": "real", "subject": who, "searches": [who],
                                                     "caption": who, "text": "", "picture": "", "photo": ""})
                    else:
                        page = []
                        continue
                ln = out[i]
                pieces = self.pieces(i, ln, got)
                carried = [{**q, "at": -1} for q in page] if got["keep_page"] and len(page) + len(pieces) <= MAX_PIECES else []
                place(pieces, {q["region"] for q in carried}, i)
                page = carried + [q for q in pieces if not q.get("drop")]
                ln["beat"] = {"kind": "build", "pieces": page}
                ln["plate"], ln["side"] = blank, False
                ln.pop("layers", None)


def demo(slug: str, pick: list[int], out_name: str) -> str:
    """A short clip of some lines of a finished board film in the build-up edit (the film itself is not touched)."""
    class St:
        data: dict = {}
        def update(self, *a, **k):
            if k.get("msg"):
                print(k["msg"], flush=True)
    import pipeline as base
    d = board.Director(slug, St())
    d.c = base.client()
    props = json.load(open(os.path.join(d.out, "board.json")))
    Builder(d).apply(props["lines"], board.Director.chapters(props["lines"]), f"{slug}/board/blank.png", only=set(pick))
    props["lines"] = [props["lines"][i] for i in pick]
    path = os.path.join(d.out, out_name)
    json.dump(props, open(path, "w"), indent=1, ensure_ascii=False)
    return path


if __name__ == "__main__":
    import sys
    print(demo(sys.argv[1], [int(x) for x in sys.argv[2].split(",")], sys.argv[3] if len(sys.argv) > 3 else "demo-build.json"))
