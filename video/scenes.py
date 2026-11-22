"""The scene director: a voiced film (archive.json) -> a template film in the "Explain UPI" demo's look (Remotion "Scenes").

The model never places or draws anything. For each narration line it only picks one of the hand-built scene templates
(src/scenes/Scenes.tsx) and fills its slots with short words from the line itself, plus up to two animated Noto emoji
(Lottie, free from Google) for the margins. Code checks every pick (a template whose slots came back empty becomes a
headline) and downloads the emoji. Any model that answers structured JSON can direct (Gemini today).

    archive.json ─► picks, 4 lines per call (parallel) ─► emoji ─► scenes.json ─► Remotion "Scenes"

Run from backend/ for an existing film:  .venv/bin/python ../video/scenes.py --out film14 [--lines 10] [--render]
"""

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from typing import Literal

import httpx
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, conlist, create_model

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
sys.path.insert(0, HERE)

TEMPLATES = ["headline", "number", "flow", "hub", "timer", "stamp", "notes", "phone", "quote", "compare", "list", "photos", "map"]
# the moment skills (backend/app/api/vskills.py) and the templates each one brings; the rest are the look's own
MOMENTS = {"numbers": ["number", "compare", "timer"], "flows": ["flow", "hub", "list"], "maps": ["map"], "photos": ["photos"]}
BASE = ["headline", "notes", "quote", "phone", "stamp"]


def allowed_templates(cfg: dict) -> list[str]:
    """The templates this video may use: the look's own plus those of the moment skills the creator kept on (all of
    them when the video has no skill choices, as films made before skills)."""
    sk = cfg.get("skills") or {}
    on = sk.get("moments")
    if on is None:
        return TEMPLATES
    if "photos" in ((sk.get("look") or {}).get("show") or []):  # "Real photos" chosen: pictures that move on the words
        on = list(on) + ["photos"]
    return BASE + [t for m in on for t in MOMENTS.get(m, [])]
NOTO = "https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/lottie.json"


Short = Annotated[str, StringConstraints(max_length=28)]   # one word or two: a list item can never run on (it once did:
Point = Annotated[str, StringConstraints(max_length=70)]   # a headline "word" of 400 characters, 2026-10-23)


class PicPick(BaseModel):
    subject: str = Field(max_length=80, description="exactly what the photo must show: a real person, place, thing, organism or event named in the line")
    search: list[Short] = Field(default_factory=list, max_length=3, description="1-3 Wikimedia Commons searches for it, in English")
    word: str = Field(max_length=30, description="the word of the line (copied exactly) on which this picture appears")


class Pick(BaseModel):
    line: int = Field(description="the line's number, as given")
    template: Literal["headline", "number", "flow", "hub", "timer", "stamp", "notes", "phone", "quote", "compare", "list", "photos", "map"]
    pictures: list[PicPick] = Field(default_factory=list, max_length=3, description="photos: 2-3 real photos, in the order the line names them, each on its word")
    words: list[Short] = Field(default_factory=list, max_length=5, description="2-5 big kinetic words from the line itself (its language), for headline/flow/timer/notes/compare")
    mark: int = Field(-1, description="index in words of the ONE word to highlight with the lime marker (the key word), or -1")
    sub: str = Field("", max_length=80, description="one short supporting line, max 8 words (headline, number, phone)")
    notes: list[Short] = Field(default_factory=list, max_length=3, description="sticky notes, max 4 words each: headline 0-2, notes 3")
    value: str = Field("", max_length=30, description="number: the figure exactly as said ('₹10', '41', '71%', '2.2 million'); timer: the time ('17 din', '0.8s')")
    label: str = Field("", max_length=60, description="number: what the figure counts (max 4 words); hub: a sticky note; stamp: the claim (max 7 words); phone: a sticky note")
    steps: list[Short] = Field(default_factory=list, max_length=3, description="flow: exactly 3 boxes, max 2 words each, in order")
    pills: list[Short] = Field(default_factory=list, max_length=3, description="flow: 0 or 3 step labels under the boxes, max 2 words")
    center: str = Field("", max_length=30, description="hub: the thing in the middle, max 2 words")
    spokes: list[Short] = Field(default_factory=list, max_length=4, description="hub: 3-4 things around it, max 2 words each")
    stamp: str = Field("", max_length=20, description="stamp: ONE word for the stamp ('SAFE', 'VERIFIED', 'FAKE', 'PROVEN')")
    top: str = Field("", max_length=30, description="phone: the app or sender shown at the top, max 2 words")
    big: str = Field("", max_length=40, description="phone: the big thing on screen, max 3 words")
    quote: str = Field("", max_length=220, description="quote: the words quoted, max 25 words, exactly as in the line")
    who: str = Field("", max_length=60, description="quote: who said it")
    left_title: str = Field("", max_length=40, description="compare: left side's title, max 3 words")
    left_value: str = Field("", max_length=30, description="compare: left side's figure or word")
    right_title: str = Field("", max_length=40, description="compare: right side's title, max 3 words")
    right_value: str = Field("", max_length=30, description="compare: right side's figure or word")
    title: str = Field("", max_length=60, description="list: a short title, max 6 words")
    points: list[Point] = Field(default_factory=list, max_length=4, description="list: 3-4 points, max 7 words each")
    emoji_left: str = Field("", max_length=20, description="ONE plain English word for an emoji that literally shows something in the line (robot, money, rocket, lock, chai), or ''")
    emoji_right: str = Field("", max_length=20, description="a second such word, or ''")


class Picks(BaseModel):
    picks: list[Pick]


DIRECT = """You direct an explainer video made of ready-made animated scene templates (bold box cards with hard ink shadows,
sticky notes, a lime highlighter, kinetic words). For EVERY line below pick ONE template and fill ONLY its slots. You never
design layouts: the templates do that. Keep every slot SHORT (the limits are hard) and take the words from the line itself,
in the line's own language (Hinglish stays Hinglish); numbers exactly as said.

Templates, and when they fit:
- headline: the default; a hook, a question, a claim. words (2-5) + mark + optional sub + 0-2 notes.
- number: the line hinges on one figure. value + label (+ sub).
- flow: a process or journey in 3 steps (A then B then C). steps (3) + optional pills (3) + words.
- hub: one thing connecting or serving many. center + spokes (3-4) + optional label.
- timer: speed, time, duration, a deadline. value + words.
- stamp: safety, proof, verification, a verdict. stamp (one word) + label (the claim).
- notes: a recap or three takeaways. notes (3) + words.
- phone: something on a screen, an app, a message, a payment. top + big (+ label, sub).
- quote: someone is quoted or says something. quote + who.
- compare: two things side by side, before/after, with/without. left_title/left_value + right_title/right_value + words.
- list: 3-4 points, reasons or steps the line lists. title + points.
- map: the line is about real places, countries, states, rivers, borders or routes (where something is, how big, how
  far): a real map, the camera flies there on the word. words (2-4, the place) only; the map itself is planned later.
- photos: the line names 2-3 real, photographable things (a leaf, chlorophyll, the Amazon, a scientist, a machine):
  real photos change ON the words that name them. pictures (2-3: subject, English searches, the exact word) + words.
Vary the film: never the same template on two lines in a row, and use headline for at most a third of the lines.
Emoji: name at most two everyday things the line talks about, one plain English word each (robot, money, rocket, lock,
check, lab, globe, idea); leave them '' when nothing fits. They are shown as animated emoji beside the scene.
Return one pick per line, with its line number."""


def emoji_index() -> dict[str, str]:
    """The animated Noto emoji Google publishes (cached by motionfx in public/motion-noto-index.json): tag word -> codepoint,
    the most popular emoji winning a shared word."""
    path = os.path.join(HERE, "public", "motion-noto-index.json")
    if not os.path.exists(path):
        r = httpx.get("https://googlefonts.github.io/noto-emoji-animation/data/api.json", timeout=30)
        open(path, "w").write(r.text)
    words: dict[str, str] = {}
    for i in sorted(json.load(open(path))["icons"], key=lambda i: -(i.get("popularity") or 0)):
        for tag in i.get("tags") or []:
            for w in [tag.strip(":")] + tag.strip(":").split("-"):
                words.setdefault(w.lower(), i["codepoint"])
    return words


# everyday words the model uses that Google tags differently
ALIAS = {"lock": "locked", "idea": "bulb", "chai": "hot-beverage", "tea": "hot-beverage", "coffee": "hot-beverage",
         "lab": "brain", "science": "brain", "speed": "zap", "fast": "zap", "time": "clock", "timer": "clock",
         "growth": "chart", "data": "chart", "graph": "chart", "laptop": "computer", "win": "party", "success": "party",
         "danger": "warning", "risk": "warning", "think": "thinking", "doubt": "thinking", "strong": "muscle", "power": "zap"}


def emoji_for(word: str, index: dict[str, str]) -> str | None:
    w = (word or "").lower().strip()
    w = ALIAS.get(w, w)
    return index.get(w) or index.get(w.rstrip("s")) or (index.get(w + "s") if w else None)


def ordered(lines: list[dict]) -> list[dict]:
    """As the film plays: the cold open first, then the chapters; trimmed lines and markers left out."""
    keep = [l for l in lines if not l.get("cut") and l.get("opener") != "marker"]
    return [l for l in keep if l.get("opener")] + [l for l in keep if not l.get("opener")]


def _clean(v):
    """Every text the model wrote, held to what a scene can show (a second guard after the schema's limits)."""
    if isinstance(v, str):
        return v[:220]
    if isinstance(v, list):
        return [_clean(x) for x in v if not isinstance(x, str) or len(x.split()) <= 12][:5]
    if isinstance(v, dict):
        return {k: _clean(x) for k, x in v.items()}
    return v


def slots_of(p: Pick, speech: str) -> tuple[str, dict]:
    """The pick's slots for its template; a template whose essential slots are empty falls back to a headline."""
    s = {k: _clean(v) for k, v in p.model_dump().items() if v not in ("", [], -1, None) and k not in ("line", "template", "emoji_left", "emoji_right")}
    if p.left_title or p.left_value:
        s["left"] = {"title": p.left_title, "value": p.left_value}
    if p.right_title or p.right_value:
        s["right"] = {"title": p.right_title, "value": p.right_value}
    need = {"photos": ["pictures"], "number": ["value"], "flow": ["steps"], "hub": ["center", "spokes"], "timer": ["value"], "stamp": ["label"],
            "notes": ["notes"], "phone": ["big"], "quote": ["quote"], "compare": ["left", "right"], "list": ["points"]}
    if any(k not in s for k in need.get(p.template, [])):
        words = (p.words or speech.split())[:4]
        return "headline", {"words": words, "mark": min(max(p.mark, 0), len(words) - 1), "sub": p.sub}
    if "mark" in s and not (0 <= s["mark"] < len(s.get("words", []))):
        s.pop("mark")
    return p.template, s


def word_times(audio: str | None, speech: str, seconds: float) -> list[float]:
    """When each word of the line starts, in seconds from the line's start: the voice's own pauses and word lengths
    (build.align, no model), or spread evenly when there is no recording yet."""
    words = speech.split()
    if audio and os.path.exists(os.path.join(HERE, "public", audio)):
        import build
        return [round(f * seconds, 2) for f in build.align(os.path.join(HERE, "public", audio), speech)]
    return [round(seconds * k / max(1, len(words)), 2) for k in range(len(words))]


def place_photos(scenes: list[dict], slug: str, cfg: dict, st) -> None:
    """Pictures on the words: each photo scene's pictures are found (Wikimedia Commons, the model checks each shows its
    subject) and timed to the word that names them, at least 1.5 s apart; the first lands as the line starts. A scene whose
    pictures cannot be found becomes a headline."""
    import re
    todo = [sc for sc in scenes if sc["template"] == "photos"]
    if not todo:
        return
    import archivedoc
    finder = archivedoc.Agent(cfg, slug, st)
    used: set[str] = set()
    jobs = [(sc, p) for sc in todo for p in sc["slots"].get("pictures", [])[:3]]
    st.update("visuals", f"Finding {len(jobs)} real photos for {len(todo)} scenes", done=0, total=max(1, len(jobs)))
    found: dict[int, dict | None] = {}

    def one(k: int):
        sc, p = jobs[k]
        try:
            return k, finder.find_image(p["subject"], p.get("search") or [p["subject"]], sc.get("caption") or "", used)
        except Exception as e:
            print(f"  photo '{p['subject'][:40]}' failed: {str(e)[:80]}", flush=True)
            return k, None

    with ThreadPoolExecutor(3) as ex:
        for n, (k, got) in enumerate(ex.map(one, range(len(jobs)))):
            found[k] = got
            if got:
                used.add(got["title"])
            st.update("visuals", f"Found {sum(1 for v in found.values() if v)} of {len(jobs)} photos", done=n + 1, total=len(jobs))
    k = 0
    for sc in todo:
        speech = sc.get("caption") or ""
        times = word_times(sc.get("audio"), speech, sc["seconds"])
        norm = [re.sub(r"[^\w]", "", w.lower()) for w in speech.split()]
        pics, last = [], -9.0
        for p in sc["slots"].get("pictures", [])[:3]:
            got, k = found.get(k), k + 1
            if not got:
                continue
            target = re.sub(r"[^\w]", "", (p.get("word") or "").split()[0].lower()) if p.get("word") else ""
            at = next((times[i] for i, w in enumerate(norm) if target and (w == target or w.startswith(target[:5])) and i < len(times)), None)
            at = 0.0 if not pics else max(last + 1.5, at if at is not None else last + sc["seconds"] / 3)
            if at > sc["seconds"] - 0.8:
                continue
            pics.append({"src": got["src"], "at": round(at, 2), "caption": got.get("caption", ""), "credit": got.get("credit", "")})
            last = at
        if pics:
            sc["slots"] = {**sc["slots"], "pictures": pics}
        else:
            words = (sc["slots"].get("words") or speech.split())[:4]
            sc["template"], sc["slots"] = "headline", {"words": words, "mark": 0}


def place_maps(scenes: list[dict], st, vertical: bool = False) -> None:
    """Map and place: each map scene's beats are planned from the line's words and their times by the geography engine
    (audiofilm.BEAT_ASK, the same as the exam-notes geography films), and every country, state and coordinate is
    checked by code (audiofilm._beats_from). The camera flies on from the film's previous map. A map that cannot be
    planned (or a vertical film, which the map renderer does not draw yet) becomes a headline."""
    todo = [sc for sc in scenes if sc["template"] == "map"]
    if not todo:
        return
    import audiofilm
    from app.llm import get_llm
    names, states = audiofilm._atlas_names(), audiofilm._india_states()
    ask = audiofilm.BEAT_ASK.format(countries=" | ".join(names), states=" | ".join(states))
    st.update("visuals", f"Planning {len(todo)} maps", done=0, total=len(todo))
    prev = None
    for n, sc in enumerate(todo):
        speech, dur = sc.get("caption") or "", sc["seconds"]
        times = word_times(sc.get("audio"), speech, dur)
        words = list(zip(speech.split(), times))
        beats = []
        if not vertical:
            try:
                want = max(1, round(dur / 6.5))
                got = get_llm().structured(audiofilm.VBeats, ask, f"Topic: {' '.join(sc['slots'].get('words') or [])}\nIts notes:\n(none)\n"
                                           f"Length: {dur:.0f} s. Give {want} beats, from 0 to {max(0, dur - 2):.0f} s, each a DIFFERENT visual.\n\n"
                                           "What the teacher says:\n" + " ".join(f"[{t:.1f}] {w}" for w, t in words), smart=True)
                beats = audiofilm._beats_from(got, {"t0": 0.0}, speech, words, names, states, 0.0, dur)
            except Exception as e:
                print(f"  map for '{speech[:40]}' failed: {str(e)[:80]}", flush=True)
        beats = [b for b in beats if b["kind"] == "map"]
        if not beats:
            words4 = (sc["slots"].get("words") or speech.split())[:4]
            sc["template"], sc["slots"] = "headline", {"words": words4, "mark": 0}
            continue
        beats[0]["t"] = 0.0
        sc["slots"] = {**sc["slots"], "geo": {"beats": [{**b, "at": round(b["t"] * 30), "lines": [{**x, "at": round(x["t"] * 30) if x.get("t") is not None else None}
                                                                                     for x in b.get("lines") or []]} for b in beats],
                                             "beats_v": 2, "notes_at": None, "side": "left", "prev": prev}}
        prev = beats[-1]
        st.update("visuals", f"Planned {n + 1} of {len(todo)} maps", done=n + 1, total=len(todo))


def direct(slug: str, st, cfg: dict, llm, limit: int | None = None) -> dict:
    base = os.path.join(HERE, "public", slug)
    out = os.path.join(base, "scenes")
    os.makedirs(out, exist_ok=True)
    lines = ordered(json.load(open(os.path.join(base, "archive.json")))["lines"])
    if limit:
        lines = lines[:limit]
    spoken = [k for k, l in enumerate(lines) if l.get("speech")]
    index = emoji_index()
    cache_path = os.path.join(out, "picks.json")
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    todo = [k for k in spoken if lines[k]["speech"] not in cache]
    chunks = [todo[i:i + 4] for i in range(0, len(todo), 4)]  # Gemini rejects an exact-count schema of 8 (400)
    st.update("visuals", f"Choosing a scene for each of {len(spoken)} lines", done=len(spoken) - len(todo), total=len(spoken))

    allowed = allowed_templates(cfg)
    look = (cfg.get("skills") or {}).get("look") or {}
    rules = f"\n\nTHIS VIDEO'S SKILLS: use ONLY these templates: {', '.join(allowed)}."
    if look.get("text") == "bullets":
        rules += " The creator wants points on screen: prefer list and notes where a line has several points."
    if look.get("notes"):
        rules += f"\nThe creator's own words about the look (follow them where a template allows): {look['notes'][:500]}"

    def ask(chunk: list[int]) -> list[Pick]:
        listing = "\n".join(f"[{k}] {lines[k]['speech']}" for k in chunk) + rules
        # exactly one pick per line, in the schema itself: asked loosely, Gemini answered 10 lines with a single pick
        Exact = create_model("Picks", picks=(conlist(Pick, min_length=len(chunk), max_length=len(chunk)), ...))
        ask_for = f"\n\nReturn exactly {len(chunk)} picks, one for each line: {', '.join(str(k) for k in chunk)}."
        for attempt in range(2):
            try:
                got = llm.structured(Exact, DIRECT, f"LINES:\n{listing}{ask_for}", smart=True, max_tokens=16000).picks
                if sorted(p.line for p in got) != sorted(chunk):  # numbered its own way, or a line twice: match by order
                    got = [p.model_copy(update={"line": k}) for p, k in zip(got, chunk)]
                return got
            except Exception as e:  # one failed chunk never stops the film: its lines become headlines
                print(f"  scene picks for lines {chunk[0]}-{chunk[-1]} failed ({str(e)[:80]}){'; retrying' if not attempt else ''}", flush=True)
        return []

    done = len(spoken) - len(todo)
    with ThreadPoolExecutor(4) as ex:
        for chunk, picks in zip(chunks, ex.map(ask, chunks)):
            for p in picks:
                if p.line in chunk:
                    cache[lines[p.line]["speech"]] = p.model_dump()
            done += len(chunk)
            st.update("visuals", f"Chose scenes for {done} of {len(spoken)} lines", done=done, total=len(spoken))
            json.dump(cache, open(cache_path, "w"), ensure_ascii=False, indent=1)

    scenes, want, chapter = [], set(), 0
    for k, l in enumerate(lines):
        if not l.get("speech"):  # a chapter card or the film's title card
            chapter += 1
            b = l.get("beat") or {}
            scenes.append({"template": "chapter", "slots": {"words": (b.get("title") or "").split()[:5], "label": b.get("kicker") or ""},
                           "emoji": [None, None], "audio": None, "seconds": float(l.get("seconds") or 2.6), "dir": f"{slug}/scenes", "chapter": chapter})
            continue
        raw = cache.get(l["speech"])
        p = Pick(**raw) if raw else Pick(line=k, template="headline", words=l["speech"].split()[:4])
        template, slots = slots_of(p, l["speech"])
        if template not in allowed and template != "headline":  # a skill the creator switched off
            words = (p.words or l["speech"].split())[:4]
            template, slots = "headline", {"words": words, "mark": min(max(p.mark, 0), len(words) - 1)}
        emoji = [emoji_for(p.emoji_left, index), emoji_for(p.emoji_right, index)]
        if look and "stickers" not in (look.get("show") or []):  # the creator switched the animated stickers off
            emoji = [None, None]
        if emoji[0] and emoji[0] == emoji[1]:
            emoji[1] = None
        want |= {e for e in emoji if e}
        scenes.append({"template": template, "slots": slots, "emoji": emoji, "audio": l.get("audio"), "seconds": float(l["seconds"]),
                       "dir": f"{slug}/scenes", "chapter": chapter, "caption": l["speech"]})

    place_photos(scenes, slug, cfg, st)
    place_maps(scenes, st, vertical=(cfg.get("aspect") or "") == "9:16")
    st.update("visuals", f"Fetching {len(want)} animated emoji", done=0, total=max(1, len(want)))
    got = set()
    for n, cp in enumerate(sorted(want)):
        path = os.path.join(out, f"{cp}.json")
        if not os.path.exists(path):
            try:
                r = httpx.get(NOTO.format(cp=cp), timeout=30)
                if r.status_code == 200:
                    open(path, "w").write(r.text)
            except Exception as e:
                print(f"  emoji {cp} failed: {str(e)[:60]}", flush=True)
        if os.path.exists(path):
            got.add(cp)
        st.update(done=n + 1)
    for sc in scenes:
        sc["emoji"] = [e if e in got else None for e in sc["emoji"]]
    used = {}
    for sc in scenes:
        used[sc["template"]] = used.get(sc["template"], 0) + 1
    style = {k: look.get(k) for k in ("text", "background", "transition", "pace", "background_image", "sticker_place", "sticker_size", "caption_pos", "stage") if look.get(k)}
    for b in (cfg.get("skills") or {}).get("backgrounds") or []:  # a background the skill keeps for this film's subject
        if b.get("image") and b.get("subject", "").lower() in f"{cfg.get('topic', '')} {cfg.get('subject', '')}".lower():
            style.update(background="own", background_image=b["image"])
    if style.get("background") == "topic":  # a hue of the topic's own, the same every time for the same topic
        import hashlib
        style["hue"] = int(hashlib.md5((cfg.get("topic") or slug).encode()).hexdigest()[:4], 16) % 360
    json.dump({"lines": scenes, "style": style}, open(os.path.join(base, "scenes.json"), "w"), ensure_ascii=False, indent=1)
    st.update("visuals", f"Scenes ready: {len(scenes)} scenes ({', '.join(f'{v} {k}' for k, v in sorted(used.items(), key=lambda x: -x[1]))})")
    return {"scenes": len(scenes)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--lines", type=int, default=0)
    ap.add_argument("--render", action="store_true")
    a = ap.parse_args()
    import doc
    from app.llm import get_llm
    base = os.path.join(HERE, "public", a.out)
    cfg = json.load(open(os.path.join(base, "config.json")))
    st = doc.Status(base)
    direct(a.out, st, cfg, get_llm(), a.lines or None)
    if a.render:
        import archivedoc
        archivedoc.render(a.out, st, composition="Scenes", props=f"public/{a.out}/scenes.json")


if __name__ == "__main__":
    main()
