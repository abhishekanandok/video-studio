"""The board director: turns an archival film's resolved lines (archive.json) into the Vox collage board (board.json,
rendered by the Remotion "Board" composition). The script and the voices are never touched; only the pictures change.

    mix       about 70% collage (sticky notes, typed scraps, red-string diagrams), about 20% pictures (the real archival
              photos, kept exactly as found, plus generated collage cut-outs), about 10% newspaper (real headlines, and
              the big rises and falls over time as a newspaper line chart).
    direct    Gemini (Flash) reads each chapter and decides, for the lines that carry a number, a comparison or a turn of
              the argument, how to split the fact onto sticky notes, what to join with red string, or which object to
              show as a cut-out. Code checks every choice: each number on a note must be in that line or its cited beat;
              every string node must come from the line's own words; a cut-out may never show a real, named person,
              a logo, text or a chart. A choice that fails a check falls back to a plain split made by code.
    fixed     Quotes and filings are typed onto a torn scrap (who and when on a kraft tag); headlines stay real
              clippings; charts whose labels are points in time become a newspaper line chart with a rise/fall stamp.
    plates    Per chapter, two collage backgrounds are generated (a collage on the left, empty paper on the right for the
              words), plus one plain paper board for full-width pieces. The camera never moves: each piece zooms in
              once as it lands and then holds while it is read.
Everything is cached in public/<slug>/board/; re-running resumes.
"""
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from typing import Literal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, os.path.dirname(__file__))

from pydantic import BaseModel, Field  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
PICTURE_SHARE = 0.20  # archival photos + cut-outs, of all spoken lines
TIME = re.compile(r"\b(19|20)\d\d\b|\bFY\s?\d\d\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b|\b20\d\d-\d\d\b", re.I)
FRAGMENT = re.compile(r"\b(than|to|of|and|or|but|all|every|that|which|who|the|a|an|by|for|with|from|in|on|at|is|are|was|were)\s*$", re.I)
BANNED_PICTURE = re.compile(r"\b(logo|logos|text|word|words|letter|letters|sign|signs|chart|graph|number|numbers|headline|caption|label|brand)\b", re.I)


class Visual(BaseModel):
    i: int = Field(description="the line number, as given")
    kind: Literal["notes", "connect", "cutout", "keep"]
    notes: list[str] = Field(default_factory=list, description='notes: 2-4 sticky notes, each "BIG|small"')
    nodes: list[str] = Field(default_factory=list, description="connect: 3-6 short labels to join with red string")
    shape: Literal["chain", "star"] = "chain"
    picture: str = Field("", description="cutout: the one object or anonymous scene to show")


class Box(BaseModel):
    label: str = Field(description="what the object is, in 1-4 words")
    box_2d: list[int] = Field(description="[ymin, xmin, ymax, xmax], each normalised to 0-1000")


class Boxes(BaseModel):
    objects: list[Box]


FIND_PIECES = ("This is a paper-collage background. Find each separate object or paper scrap in the collage (the objects, "
               "photos and scraps pasted on it; ignore the plain empty paper). Return 3 to 7 of them, the largest first, each "
               "with a tight box_2d [ymin, xmin, ymax, xmax] normalised to 0-1000.")


def pieces_of(boxes: list[list[int]]) -> list[dict]:
    """Keep sensible boxes (inside the frame, not a speck, not the whole collage) as fractions of the frame, padded a little."""
    out = []
    for b in boxes:
        if len(b) != 4:
            continue
        y0, x0, y1, x1 = (max(0, min(1000, v)) / 1000 for v in b)
        area = (y1 - y0) * (x1 - x0)
        if y1 <= y0 or x1 <= x0 or not 0.004 <= area <= 0.35:
            continue
        pad = 0.012
        out.append({"x": round(max(0, x0 - pad), 4), "y": round(max(0, y0 - pad), 4),
                    "w": round(min(1, x1 + pad) - max(0, x0 - pad), 4), "h": round(min(1, y1 + pad) - max(0, y0 - pad), 4)})
    return out[:7]


class Direction(BaseModel):
    visuals: list[Visual]


class Plate(BaseModel):
    motif: str = Field(description="the objects in the collage, no people's faces, no text")


class Plates(BaseModel):
    plates: list[Plate]


DIRECTOR = """You are the visual director of a Vox-style documentary built as a paper collage board. The narration is fixed;
you only choose what appears on screen while each line below is spoken. Choose one visual per line:

- "notes": the fact split onto 2-4 sticky notes that pop in as the narrator reaches each part. Each note is "BIG|small":
  BIG is a number exactly as in the line (e.g. "4,000", "19%", "$200B", "₹21 lakh") or 1-3 plain words; small is a
  short plain label under it (max 40 characters). Split the fact into its parts (who, how many, compared with what,
  when), one part per note. Never put a number on a note that is not in the line or its beat.
- "connect": 3-6 short labels (max 22 characters each, words taken from the line) joined by red string, like pins on a
  detective's board: "chain" for a sequence or cause-and-effect, "star" for one thing linked to several (the first
  label is the hub). Every label must make sense on its own (never "18x faster than" + "batteries"). Use it when the line links things: causes, steps, one company to many deals, then-to-now.
- "cutout": one generated collage cut-out picture: ONE everyday object or an anonymous scene (e.g. "an empty office
  chair at a desk", "a stack of graduation caps", "rows of server racks", "an old telephone switchboard"). Never a real
  or named person, never a company logo or product, never text, numbers, charts or screens with writing.
  You may use at most {cutouts} cut-outs in this chapter; spend them on lines that carry a turn or a feeling, not a number.
- "keep": leave the beat as it is.

Aim for variety: never three of the same kind in a row, and use "connect" on about one line in four. Lines with numbers almost always get "notes"; lines that
compare or link things get "connect". Plain, simple words; no full sentences on notes.

Return one visual for EVERY line number given."""

PLATER = """You design backgrounds for one chapter of a Vox-style paper-collage documentary. Give {n} collage motifs for
this chapter: each is a short list of 3-5 physical objects and paper fragments that evoke the chapter's subject
(e.g. "a vintage telephone receiver, punch cards, a factory time clock, a torn city map"). Everyday objects only:
no real or named people, no faces, no company logos or products, no text, no charts."""


def numbers(text: str) -> set[str]:
    return {re.sub(r"[,.]$", "", n.replace(",", "")) for n in re.findall(r"\d[\d,.]*", text)}


def words(text: str) -> set[str]:
    return {w[:5] for w in re.findall(r"[a-z]{3,}", text.lower())}


def check_visual(v: Visual, line: dict, allow_cutout: bool) -> str:
    """Why this visual is wrong for this line ("" when it is fine)."""
    pool_text = (line.get("speech") or "") + " " + json.dumps(line["beat"], ensure_ascii=False)
    pool, vocab = numbers(pool_text), words(pool_text)
    if v.kind == "notes":
        if not 2 <= len(v.notes) <= 4:
            return "notes: need 2-4 notes"
        for n in v.notes:
            big, _, small = n.partition("|")
            if not big.strip() or len(big) > 16 or len(small) > 44:
                return f"notes: '{n}' too long"
            if numbers(n) - pool:
                return f"notes: '{n}' has a number not in the line"
    elif v.kind == "connect":
        if not 3 <= len(v.nodes) <= 6:
            return "connect: need 3-6 nodes"
        for n in v.nodes:
            if len(n) > 24 or not n.strip():
                return f"connect: '{n}' too long"
            if numbers(n) - pool or not (words(n) & vocab or numbers(n)):
                return f"connect: '{n}' is not from the line"
            if FRAGMENT.search(n):
                return f"connect: '{n}' is half a phrase; each pin must make sense on its own"
    if v.kind in ("notes", "connect"):
        shown = numbers(" ".join(v.notes + v.nodes))
        b = line["beat"]
        if b["kind"] == "number" and numbers(b["value"]) and not numbers(b["value"]) & shown:
            return f"{v.kind}: the line's number ({b['value']}) is missing"
        if b["kind"] == "chart":
            need = min(2, len(b["bars"]))
            if sum(1 for x in b["bars"] if numbers(x["display"]) and numbers(x["display"]) <= shown) < need:
                return f"{v.kind}: show the chart's numbers ({', '.join(x['display'] for x in b['bars'])})"
    if v.kind == "cutout":
        if not allow_cutout:
            return "cutout: over budget"
        if not v.picture.strip() or len(v.picture) > 220 or BANNED_PICTURE.search(v.picture):
            return "cutout: picture must be one object or scene, no text or logos"
        names = set(re.findall(r"(?<![.!?]\s)(?<!^)\b([A-Z][a-z]+)", line.get("speech") or ""))
        if any(nm in v.picture for nm in names):
            return "cutout: shows a named person, place or company"
    return ""


def short(text: str, n: int = 44) -> str:
    """At most n characters, cut at a word (never mid-word), without a dangling small word or bracket."""
    text = re.sub(r"\s*\([^)]*\)", "", text).strip()
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(" ", 1)[0]
    return FRAGMENT.sub("", cut).strip(" ,;:-")


def fallback(line: dict) -> dict:
    """The plain split code makes when the director's choice fails its checks."""
    b = line["beat"]
    if b["kind"] == "number":
        label = short(b.get("label", ""))
        return {"kind": "notes", "notes": [f"{b['value']}|{label}" if label else b["value"]], "source": b.get("source", "")}
    if b["kind"] == "chart":
        return {"kind": "notes", "notes": [f"{x['display']}|{short(x['label'])}" for x in b["bars"][:4]], "source": b.get("source", "")}
    if b["kind"] == "phrase":
        t = b["text"].strip()
        # a half sentence on a note reads as a mistake: show a still close-up of the chapter's collage instead
        speech = (line.get("speech") or "").strip()
        cut_from_speech = speech.startswith(t) and len(speech) > len(t) + 1 and speech[len(t)] not in ".?!"
        if len(t.split()) > 5 or FRAGMENT.search(t) or not t or cut_from_speech:
            return {"kind": "plate"}
        return {"kind": "notes", "notes": [t]}
    return fixed(line)


def fixed(line: dict) -> dict:
    b = line["beat"]
    k = b["kind"]
    if k == "headline":
        return {"kind": "newshead", "items": b["items"]}
    if k == "quote":
        return {"kind": "scrap", "text": b["text"], "who": b.get("who", ""), "when": b.get("when", "")}
    if k == "filing":
        head = " · ".join(short(x, 48) for x in (b.get("company"), b.get("form"), b.get("lead")) if x)
        return {"kind": "scrap", "text": b["quote"], "highlight": b.get("highlight", ""), "heading": head}
    if k == "archival":
        return {"kind": "photo", "src": b["src"], "caption": b.get("caption", ""), "credit": b.get("credit", "")}
    if k == "chart" and is_timeline(b):
        return {"kind": "newschart", "outlet": "", "title": b["title"], "source": b.get("source", ""),
                "points": [{"label": x["label"], "value": x["value"], "display": x["display"]} for x in b["bars"]]}
    if k == "title":
        return b
    return fallback(line)


def is_timeline(b: dict) -> bool:
    return len(b.get("bars", [])) >= 2 and all(TIME.search(x["label"]) for x in b["bars"])


def see_through(path: str) -> float:
    """How cleanly a cut-out's background came away: the share of fully clear pixels, or 0 when a haze of half-clear
    pixels is left (a textured background the cutter could only partly lift shows as a grey box on the board)."""
    import pymupdf
    pix = pymupdf.Pixmap(path)
    if not pix.alpha:
        return 0.0
    a = pix.samples[pix.n - 1::pix.n][::7]
    if sum(1 for v in a if 30 <= v <= 220) / max(1, len(a)) > 0.05:
        return 0.0
    return sum(1 for v in a if v < 30) / max(1, len(a))


def trim(path: str) -> None:
    """Crop a cut-out to what is left after the background came away, so it fills its place on the board."""
    from PIL import Image
    im = Image.open(path)
    box = im.getchannel("A").point(lambda v: 255 if v > 30 else 0).getbbox()
    if box and (box[2] - box[0]) * (box[3] - box[1]) < im.width * im.height * 0.95:
        im.crop((max(0, box[0] - 12), max(0, box[1] - 12), min(im.width, box[2] + 12), min(im.height, box[3] + 12))).save(path)


class Director:
    def __init__(self, slug: str, st):
        from app.llm import get_llm
        self.slug, self.st, self.llm = slug, st, get_llm()
        self.out = os.path.join(HERE, "public", slug)
        self.dir = os.path.join(self.out, "board")
        os.makedirs(self.dir, exist_ok=True)

    def cache(self, name: str, make):
        p = os.path.join(self.dir, name)
        if os.path.exists(p):
            return json.load(open(p))
        v = make()
        json.dump(v, open(p, "w"), indent=1, ensure_ascii=False)
        return v

    # ---- 1. chapters ----
    @staticmethod
    def chapters(lines: list[dict]) -> list[list[int]]:
        out, cur = [], []
        for i, ln in enumerate(lines):
            if ln["beat"]["kind"] == "title" and "chapter" in (ln["beat"].get("kicker") or "").lower() and cur:
                out.append(cur)
                cur = []
            cur.append(i)
        return out + [cur] if cur else out

    # ---- 2. directing ----
    def direct(self, lines: list[dict], chapter: list[int], cutouts: int) -> dict[int, dict]:
        ask = [i for i in chapter if lines[i]["beat"]["kind"] in ("number", "chart", "phrase") and lines[i].get("audio")
               and not (lines[i]["beat"]["kind"] == "chart" and is_timeline(lines[i]["beat"]))]
        if not ask:
            return {}
        listing = "\n".join(f"[{i}] {lines[i].get('speech', '')}\n     beat: {json.dumps({k: v for k, v in lines[i]['beat'].items() if k != 'kind'}, ensure_ascii=False)}"
                            for i in ask)
        context = " ".join((lines[i].get("speech") or "") for i in chapter)[:3000]
        feedback, got = "", {}
        for _ in range(3):
            try:
                d = self.llm.structured(Direction, DIRECTOR.format(cutouts=cutouts),
                                        f"THE CHAPTER, FOR CONTEXT:\n{context}\n\nLINES TO DIRECT:\n{listing}{feedback}")
            except Exception as e:  # the director is an improvement, never a blocker
                self.st.update(msg=f"Director call failed ({str(e)[:60]}); using the plain split")
                break
            errors, used = [], sum(1 for v in got.values() if v["kind"] == "cutout")
            for v in d.visuals:
                if v.i not in ask or v.i in got:
                    continue
                why = check_visual(v, lines[v.i], used < cutouts)
                if why:
                    errors.append(f"[{v.i}] {why}")
                    continue
                if v.kind == "notes":
                    got[v.i] = {"kind": "notes", "notes": v.notes, "source": lines[v.i]["beat"].get("source", "")}
                elif v.kind == "connect":
                    got[v.i] = {"kind": "connect", "nodes": v.nodes, "shape": v.shape}
                elif v.kind == "cutout":
                    got[v.i] = {"kind": "cutout", "picture": v.picture}
                    used += 1
            missing = [i for i in ask if i not in got and not any(e.startswith(f"[{i}]") for e in errors)]
            if not errors:
                break
            listing = "\n".join(f"[{i}] {lines[i].get('speech', '')}\n     beat: {json.dumps({k: v for k, v in lines[i]['beat'].items() if k != 'kind'}, ensure_ascii=False)}"
                                for i in ask if i not in got)
            feedback = "\n\nFIX THESE PROBLEMS FROM YOUR LAST ANSWER:\n" + "\n".join(errors + [f"[{i}] missing" for i in missing])
        return {str(k): v for k, v in got.items()}

    # ---- 3. pictures ----
    def paint(self, prompt: str, path: str) -> bool:
        import pipeline as base
        try:
            base.STYLE = ""
            base.paint(self.c, prompt, path, [])
            return True
        except Exception as e:
            self.st.update(msg=f"Image failed ({str(e)[:60]}); leaving it out")
            return False

    def plates(self, lines: list[dict], chapters: list[list[int]]) -> list[list[str]]:
        import doc
        design = lambda ch: [p.motif for p in self.llm.structured(Plates, PLATER.format(n=2), " ".join((lines[i].get("speech") or "") for i in ch)[:3000]).plates[:2]]
        motifs = self.cache("plates.json", lambda: [design(ch) for ch in chapters])
        if len(motifs) < len(chapters):  # the film gained a chapter since (e.g. its cold open): design backgrounds for it too
            motifs += [design(ch) for ch in chapters[len(motifs):]]
            json.dump(motifs, open(os.path.join(self.dir, "plates.json"), "w"), indent=1, ensure_ascii=False)
        jobs = [("blank", "An empty sheet of aged beige paper filling the whole frame, seen flat from above: soft stains, fibres, faint "
                          "creases, and only at the very edges a few torn paper scraps and a strip of masking tape; the whole centre is "
                          "empty paper. " + doc.LOOKS["collage"] + ", 16:9, no readable words or letters, no people")]
        for n, ms in enumerate(motifs):
            for k, m in enumerate(ms):
                jobs.append((f"c{n:02d}p{k}", "A wide 16:9 paper collage board seen flat from above. The LEFT 40% of the frame holds a layered "
                             f"collage of: {m}. The RIGHT 60% of the frame is completely empty plain aged beige paper, nothing on it. "
                             "Style: " + doc.LOOKS["collage"] + ". No readable words or letters, no faces, no logos"))
        self.st.update("visuals", f"Painting {len(jobs)} backgrounds", done=0, total=len(jobs))
        for k, (name, prompt) in enumerate(jobs):
            self.paint(prompt, os.path.join(self.dir, f"{name}.png"))
            self.st.update(done=k + 1)
        ok = lambda name: os.path.exists(os.path.join(self.dir, f"{name}.png"))
        return [[f"{self.slug}/board/c{n:02d}p{k}.png" for k in range(len(ms)) if ok(f"c{n:02d}p{k}")] for n, ms in enumerate(motifs)]

    def shows(self, path: str, picture: str) -> bool:
        """Gemini looks at a painted picture: does it really show what was asked for? (a vague or wrong one is painted again)"""
        try:
            ans = self.llm.transcribe_image(open(path, "rb").read(), f"Does this picture clearly show: {picture}? Answer only YES or NO.")
            return not ans.strip().upper().startswith("NO")
        except Exception:
            return True  # the check improves pictures, it never blocks the film

    def cutout(self, i: int, picture: str, color: bool = False) -> str | None:
        import doc
        import hashlib
        tag = hashlib.sha1((picture + ("|colour" if color else "")).encode()).hexdigest()[:8]  # a changed picture is painted again
        raw, clean = os.path.join(self.dir, f"cut{i:03d}-{tag}.png"), os.path.join(self.dir, f"cut{i:03d}-{tag}-a.png")
        look = "full-colour, modern, crisp photo" if color else "black-and-white halftone photo"  # the present is in colour
        prompt = (f"{picture}, as ONE {look} cut-out with a thick white torn-paper border and one strip of "
                  "yellow masking tape, alone in the middle of a completely flat, plain, solid mid-grey (#9a9a9a) background with "
                  "nothing else on it. Vintage editorial collage look. No readable words, letters or numbers, no charts, no logos, no identifiable faces")
        for _ in range(2):
            if not self.paint(prompt, raw):
                return None
            doc.cut_out(raw, clean)
            trim(clean)
            if see_through(clean) >= 0.05 and self.shows(raw, picture):  # the background came away, and it is the right picture
                return f"{self.slug}/board/{os.path.basename(clean)}"
            os.remove(raw)
            os.remove(clean)  # a textured background the cutter cannot lift: paint it again
        return None

    def plate_pieces(self, rel: str) -> list[dict]:
        """The separate objects of a collage background (the Vox skill assembles the background from them). Gemini finds
        them; a background it cannot read is split into three torn strips instead. Cached next to the image."""
        path = os.path.join(HERE, "public", rel)
        cache = path[:-4] + ".pieces.json"
        if os.path.exists(cache):
            return json.load(open(cache))
        found: list[dict] = []
        try:
            from google.genai import types
            from app.config import settings
            png = open(path, "rb").read()
            if hasattr(type(self.llm), "look"):  # OpenRouter: the same Gemini (good at boxes) on the OpenRouter key, not Google's quota
                found = pieces_of([o.box_2d for o in self.llm.look(Boxes, png, FIND_PIECES, mime="image/png", model="google/gemini-3.8-flash").objects])
                raise StopIteration
            raw = self.llm._generate(settings.gemini_model, [types.Part.from_bytes(data=png, mime_type="image/png"), FIND_PIECES],
                                     types.GenerateContentConfig(response_mime_type="application/json", response_json_schema=Boxes.model_json_schema()))
            found = pieces_of([o.box_2d for o in Boxes.model_validate_json(raw).objects])
        except StopIteration:
            pass
        except Exception as e:
            self.st.update(msg=f"Could not find the pieces of {os.path.basename(rel)} ({str(e)[:60]}); using strips")
        if len(found) < 2:
            found = [{"x": 0.0, "y": k / 3, "w": 0.44, "h": 1 / 3 + 0.02} for k in range(3)]
        json.dump(found, open(cache, "w"))
        return found

    # ---- 4. the board ----
    def run(self) -> dict:
        import pipeline as base
        self.c = base.client()
        src = json.load(open(os.path.join(self.out, "archive.json")))
        lines = src["lines"]
        chapters = self.chapters(lines)
        spoken = sum(1 for ln in lines if ln.get("audio"))
        photos = sum(1 for ln in lines if ln["beat"]["kind"] == "archival")
        budget = max(0, round(PICTURE_SHARE * spoken) - photos)
        per = [max(0, round(budget * len(ch) / len(lines))) for ch in chapters]
        cfg_path = os.path.join(self.out, "config.json")
        cfg = json.load(open(cfg_path)) if os.path.exists(cfg_path) else {}
        if cfg.get("hold_visuals"):  # the creator asked to stop before the pictures (e.g. while a new edit is built)
            self.st.update("paused", "Held before the visuals: script and voices are ready")
            raise SystemExit(0)
        # past or present: for the modern look, and for the editorial edit (grid for the present, paper for the past)
        era = eras(lines, chapters) if cfg.get("era_look") or cfg.get("edit") == "editorial" else {}
        self.st.update("visuals", f"Directing {len(chapters)} chapters", done=0, total=len(chapters))
        def plan_for(q):  # a cached plan is re-checked against today's rules; a chapter with a failing choice is directed again
            n, ch = q
            name = f"direct{n:02d}.json"
            got = self.cache(name, lambda: self.direct(lines, ch, per[n]))
            if any(check_visual(Visual(i=int(k), **{x: y for x, y in v.items() if x in ("kind", "notes", "nodes", "shape", "picture")}),
                                lines[int(k)], True) for k, v in got.items()):
                os.remove(os.path.join(self.dir, name))
                got = self.cache(name, lambda: self.direct(lines, ch, per[n]))
            return got
        with ThreadPoolExecutor(3) as ex:
            plans = list(ex.map(plan_for, enumerate(chapters)))
        plan = {int(k): v for p in plans for k, v in p.items()}
        plates = self.plates(lines, chapters)
        seen: list[set[str]] = []
        for i in sorted(plan):  # the same picture twice (or nearly: two empty office chairs) reads as a mistake
            if plan[i]["kind"] == "cutout":
                key = {w for w in re.findall(r"[a-z]{4,}", plan[i]["picture"].lower())}
                if any(len(key & o) / max(1, min(len(key), len(o))) >= 0.5 for o in seen):
                    plan[i] = fallback(lines[i])
                    continue
                seen.append(key)
        cuts = [(i, v["picture"]) for i, v in plan.items() if v["kind"] == "cutout"]
        self.st.update("visuals", f"Painting {len(cuts)} cut-outs", done=0, total=len(cuts))
        for k, (i, pic) in enumerate(cuts):
            p = self.cutout(i, pic, color=era.get(i) == "present")
            plan[i] = {"kind": "photo", "src": p, "cutout": True} if p else fallback(lines[i])
            self.st.update(done=k + 1)
        blank = f"{self.slug}/board/blank.png" if os.path.exists(os.path.join(self.dir, "blank.png")) else None
        out = []
        for n, ch in enumerate(chapters):
            for k, i in enumerate(ch):
                ln = lines[i]
                beat = plan.get(i) or fixed(ln)
                if beat["kind"] == "plate" and not plates[n]:
                    beat = {"kind": "notes", "notes": [ln["beat"].get("text", "")]}
                side = bool(plates[n]) and (beat["kind"] == "scrap" or beat["kind"] == "notes" and len(beat["notes"]) <= 3
                                            or beat["kind"] == "newshead" and len(beat["items"]) == 1)
                plate = plates[n][(k // 3) % len(plates[n])] if side or beat["kind"] == "plate" else blank
                who = ln["beat"].get("who", "") if ln["beat"]["kind"] == "quote" and cfg.get("vox") else ""  # a lower third
                out.append({**{x: y for x, y in ln.items() if x != "beat"}, "beat": beat, "plate": plate, "side": side, "orig": ln["beat"],
                            **({"era": era[i]} if i in era else {}), **({"who": who} if who else {})})
        edit = cfg.get("edit") or ""
        if edit == "layered":  # extra edits, chosen per film; "board" (the default) is the board as it is
            add_layers(out, blank)
        elif edit == "build":
            import build
            build.Builder(self).apply(out, chapters, blank)
        elif edit == "editorial":  # the modern Vox layouts for the present day; history keeps the build-up paper pages
            import build
            import editorial
            taken = editorial.Director(self).apply(out, chapters, era or eras(lines, chapters))
            build.Builder(self).apply(out, chapters, blank, only=set(range(len(out))) - taken, tag="build")
        import edits  # the creator's own changes to single lines, from the Studio
        edits.apply(self, out, cfg, blank)
        # the cold open is stored after the chapters (so their line numbers and saved plans never shift): play it first,
        # without its marker, then the film's title card, then chapter 1
        if any(ln.get("opener") for ln in out):
            out = [ln for ln in out if ln.get("opener") is True] + [ln for ln in out if not ln.get("opener")]
        out = [ln for ln in out if not ln.get("cut")]  # lines trimmed to keep the film to its length
        once(out)
        sync_quotes(out)
        for ln in out:
            ln.pop("orig", None)
        props = {"speed": src.get("speed", 1), "lines": out, "narrator": src.get("narrator"), "vox": bool(cfg.get("vox")),
                 "grid": edit == "editorial"}
        if cfg.get("vox"):  # every collage background assembles itself from its pieces the first time it appears
            used = sorted({ln["plate"] for ln in out if ln.get("plate") and ln["plate"] != blank})
            props["plate_pieces"] = {p: self.plate_pieces(p) for p in used}
            props["blank"] = blank
        json.dump(props, open(os.path.join(self.out, "board.json"), "w"), indent=1, ensure_ascii=False)
        return props


def sync_quotes(out: list[dict]) -> None:
    """A quote types itself exactly while the narrator speaks it: the moment its first words are said is found in the
    recorded voice (build.align), and the typing runs until its last word. A quote the narration paraphrases keeps the
    default pace. A quote card with no words becomes the line's own text visual."""
    import build
    from archivedoc import norm as qnorm
    said: set[str] = set()
    for ln in out:
        b = ln["beat"]
        # points on an editorial layout appear as the narrator reaches their words, like the build-up bullets
        if b.get("kind") == "editorial" and b.get("bullets") and ln.get("audio"):
            times = build.align(os.path.join(HERE, "public", ln["audio"]), ln.get("speech") or "")
            b["bullet_at"] = build.bullet_times(ln.get("speech") or "", times, b["bullets"])
        # the same quote twice reads as a mistake: the second time the person is shown without repeating the words
        q = qnorm(b.get("text") or "") if b.get("kind") == "scrap" else qnorm(b.get("quote") or "") if b.get("layout") == "quote" else ""
        if q and q in said:
            if b.get("layout") == "quote" and b.get("cut"):
                ln["beat"] = {**b, "layout": "portrait", "quote": "", "label": ""}
            else:
                ln["beat"] = fallback({"beat": {"kind": "phrase", "text": " ".join((ln.get("speech") or "").split()[:6])}, "speech": ln.get("speech", "")})
            continue
        if q:
            said.add(q)
        if b.get("kind") == "scrap":
            text = b.get("text") or ""
        elif b.get("kind") == "editorial" and b.get("layout") == "quote":
            text = b.get("quote") or ""
        else:
            continue
        if len(text.split()) < 3:
            ln["beat"] = fallback({"beat": {"kind": "phrase", "text": " ".join((ln.get("speech") or "").split()[:6])}, "speech": ln.get("speech", "")})
            continue
        speech, words = ln.get("speech") or "", text.split()
        k = build.find(speech, " ".join(words[:3]))
        if k < 0 or not ln.get("audio"):
            continue
        times = build.align(os.path.join(HERE, "public", ln["audio"]), speech)
        end = min(len(times) - 1, k + len(words))
        b["sync"] = [round(times[k], 3), round(times[end] if end > k else 0.95, 3)]


def once(out: list[dict]) -> None:
    """A hard rule: no photo appears twice in a film. Walks the film in playing order; a photo already shown is taken off
    the later page (a quote keeps its words, a portrait or circle falls back to the line's own text visual)."""
    seen: set[str] = set()
    base = lambda p: p.split("?")[0] if p else p
    def fresh(p):
        if not p or base(p) in seen:
            return False
        seen.add(base(p))
        return True
    for ln in out:
        b = ln["beat"]
        k = b.get("kind")
        if k == "build":
            b["pieces"] = [p for p in b["pieces"] if p.get("kind") not in ("photo",) or p.get("at", 0) < 0 or fresh(p.get("src"))]
        elif k == "photo" and not b.get("cutout"):
            if not fresh(b.get("src")):
                ln["beat"] = fixed({"beat": {**(ln.get("orig") or {}), "kind": "phrase"} if (ln.get("orig") or {}).get("kind") == "archival" else ln.get("orig") or b, "speech": ln.get("speech", "")})
        elif k == "editorial":
            lay = b.get("layout")
            if lay == "stack":
                b["srcs"] = [p for p in b.get("srcs", []) if fresh(p)]
            elif lay == "timeline":
                for it in b.get("items", []):
                    if it.get("src") and not fresh(it["src"]):
                        it["src"] = None
            elif lay in ("portrait", "circle", "strips", "quote", "headline") and b.get("src"):
                if not fresh(b["src"]):
                    if lay in ("quote", "headline"):
                        b["cut"], b["src"] = None, None  # the words stay, without the repeated face
                    else:
                        ln["beat"] = fixed({"beat": ln.get("orig") or {"kind": "phrase", "text": ln.get("speech", "")[:40]}, "speech": ln.get("speech", "")})


YEAR = re.compile(r"\b(1[5-9]\d\d|20\d\d)s?\b")
SPOKEN = {"present": re.compile(r"\btwenty (twenty|nineteen|eighteen|seventeen|sixteen|fifteen)\b", re.I),
          "past": re.compile(r"\b(eighteen|nineteen) (hundred|[a-z]+ty)\b", re.I)}
NOW_FROM = 2015  # a line about 2015 or later is "the present"


def eras(lines: list[dict], chapters: list[list[int]]) -> dict[int, str]:
    """Past or present for every line (the "modern look for current events" skill). A line's years decide; a line with no
    year takes the one before it in its chapter, and a chapter's first undated lines take the chapter's majority."""
    out: dict[int, str] = {}
    for ch in chapters:
        tags = {}
        for i in ch:
            # the narration's years decide (a photo's caption carries the year it was uploaded, not what it shows);
            # headlines and charts add their own dates
            b = lines[i]["beat"]
            text = (lines[i].get("speech") or "") + " " + (json.dumps(b, ensure_ascii=False) if b["kind"] in ("headline", "newshead", "chart", "newschart", "number") else "")
            ys = [int(y) for y in YEAR.findall(text)]
            if ys:
                tags[i] = "present" if max(ys) >= NOW_FROM else "past"
            elif SPOKEN["present"].search(text):
                tags[i] = "present"
            elif SPOKEN["past"].search(text):
                tags[i] = "past"
        last = "past" if sum(v == "past" for v in tags.values()) > len(tags) / 2 else "present"
        for i in ch:
            last = tags.get(i, last)
            out[i] = last
    return out


def add_layers(lines: list[dict], blank: str | None) -> None:
    """Layered backgrounds: a shot that would sit on flat paper (or the dark title backdrop) gets a faint, tinted montage of its
    own chapter's pictures, so no background is ever a flat colour (the Board draws it; see Layered in Board.tsx)."""
    for ch in Director.chapters(lines):
        mine = [lines[i] for i in ch]
        pool = layer_pool(mine, [ln["plate"] for ln in mine if ln.get("plate") and ln["plate"] != blank])
        for k, ln in enumerate(mine):
            if ln.get("plate") == blank and pool:
                ln["layers"] = pick_layers(pool, k, ln["beat"].get("src"))


def layer_pool(lines: list[dict], plates: list[str]) -> list[str]:
    """A chapter's pictures for layered backgrounds: its real archival photos first, then its cut-outs, then its collage plates
    (every one is about the chapter's subject, so the background supports the story instead of decorating it)."""
    photos = [ln["beat"]["src"] for ln in lines if ln["beat"]["kind"] == "photo" and not ln["beat"].get("cutout")]
    cuts = [ln["beat"]["src"] for ln in lines if ln["beat"]["kind"] == "photo" and ln["beat"].get("cutout")]
    return list(dict.fromkeys(photos + cuts + list(plates)))


def pick_layers(pool: list[str], k: int, own: str | None) -> list[str]:
    """Three pictures for one shot, rotating through the pool so neighbouring shots differ; never the picture the shot shows."""
    rest = [p for p in pool if p != own] or pool
    return [rest[(k + j) % len(rest)] for j in range(min(3, len(rest)))]


def mix(props: dict) -> dict:
    """The share of each family of visuals, over the spoken lines."""
    fam = {"notes": "collage", "scrap": "collage", "connect": "collage", "photo": "pictures", "newshead": "newspaper", "newschart": "newspaper", "build": "collage"}
    spoken = [ln for ln in props["lines"] if ln.get("audio")]
    out: dict[str, float] = {}
    for ln in spoken:
        f = fam.get(ln["beat"]["kind"], "other")
        out[f] = out.get(f, 0) + 1 / len(spoken)
    return {k: round(v, 2) for k, v in out.items()}


def render(slug: str, st) -> None:
    import archivedoc
    archivedoc.render(slug, st, composition="Board", props=f"public/{slug}/board.json")


if __name__ == "__main__":
    import doc
    slug = sys.argv[1]
    st = doc.Status(os.path.join(HERE, "public", slug))
    props = Director(slug, st).run()
    print("mix", mix(props))
    if "--render" in sys.argv:
        render(slug, st)
