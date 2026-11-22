"""The motion director: turns a finished, voiced script into an agent-designed motion-graphics film (Remotion "Motion").

Nothing is a template. For each film the director first picks a look that suits the topic (palettes, ink, accent, a
motif, the caption style). Then, for every line, the model designs the shot as data: the background, and every thing on
screen with its position, size, colour and motion (how it enters, how it idles, where it travels). Things the shot
needs come from the internet: illustrated icons and 3D-style emoji from Iconify (a man, oxygen, a robot, a rupee),
real photos from Wikimedia Commons (real people, places, events), and, when neither has it, a sticker the image model
draws. The renderer (src/motion/Motion.tsx) draws whatever the director designed.

    archive.json (the voiced lines) ─► look ─► scene per line (parallel) ─► assets ─► motion.json ─► Remotion render

Run from backend/ for an existing film:  .venv/bin/python ../video/motionfx.py --out film14 [--lines 6] [--render]
"""

import argparse
import hashlib
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from typing import Literal, Optional

import httpx
from pydantic import BaseModel, Field, field_validator

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
sys.path.insert(0, HERE)

UA = {"User-Agent": "Drishyya-motion/1.0 (video studio; contact rkraushan0303@gmail.com)"}
# colourful, illustrated sets first: they read as objects on screen, not as UI glyphs
# Google's Noto animated emoji (free, no key): 881 Lottie animations, listed with their codepoints and tags
NOTO_INDEX = "https://googlefonts.github.io/noto-emoji-animation/data/api.json"
NOTO_LOTTIE = "https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/lottie.json"
_noto: list[tuple[str, str]] | None = None


def noto_animated() -> list[tuple[str, str]]:
    """(codepoint, name) for every animated emoji: the name from Unicode ("robot face") plus Google's tags, as a slug."""
    global _noto
    if _noto is None:
        import unicodedata
        cache = os.path.join(HERE, "public", "motion-noto-index.json")
        if os.path.exists(cache):
            data = json.load(open(cache))
        else:
            data = httpx.get(NOTO_INDEX, headers=UA, timeout=30).json()
            json.dump(data, open(cache, "w"))
        out = []
        for e in data.get("icons", []):
            cp = e["codepoint"]
            names = []
            for part in cp.split("_"):
                try:
                    ch = chr(int(part, 16))
                    if part not in ("200d", "fe0f"):
                        names.append(unicodedata.name(ch).lower())
                except (ValueError, KeyError):
                    pass
            tags = [t.strip(":").replace("-", " ") for t in e.get("tags", [])]
            slug = re.sub(r"[^a-z0-9]+", "-", " ".join(dict.fromkeys(names + tags)).lower()).strip("-")
            if slug:
                out.append((cp, slug))
        _noto = out
    return _noto


ICON_SETS = ["fluent-emoji", "fluent-emoji-flat", "noto", "twemoji", "openmoji", "emojione", "streamline-emojis", "fxemoji",
             "flat-color-icons", "logos", "skill-icons", "devicon", "vscode-icons"]


# ---------------- what the model designs ----------------
class Enter(BaseModel):
    style: str = "pop"
    at: float = Field(0, description="seconds after the shot starts")
    dur: float = 0.5


class Move(BaseModel):
    x: float
    y: float
    at: float = Field(description="seconds after the shot starts")
    dur: float = 0.8
    spin: float = Field(0, description="degrees of Y-spin while travelling (a coin flip is 720)")
    scale: float = 1


class Exit(BaseModel):
    at: float
    style: str = "fade"


class Bar(BaseModel):
    label: str
    value: float
    display: str = ""
    color: str = ""


class El(BaseModel):
    type: str
    x: float = Field(0, description="left edge, stage units")
    y: float = Field(0, description="top edge, stage units")
    w: float = 20
    h: float = 20
    r: float = Field(0, description="rotation, degrees")
    z: int = 1
    text: str = Field("", description="text / box / sticky / phone / polaroid caption: short, in the film's language")
    size: float = Field(0, description="font size in stage units (text 5-14, box 3-7); 0 = default")
    color: str = ""
    mark: str = Field("", description="text: the word(s) to sweep a highlighter over")
    markColor: str = ""
    fill: str = ""
    stroke: str = ""
    strokeWidth: float = 0
    radius: float = 0
    shadow: str = "hard"
    shape: str = "circle"
    from_: list[float] = Field(default_factory=list, alias="from", description="arrow: [x, y] start")
    to: list[float] = Field(default_factory=list, description="arrow: [x, y] end")
    curve: float = 0
    dashed: bool = False
    query: str = Field("", description="icon / image: what to fetch, 1-4 plain English words (e.g. 'oxygen molecule', 'Indian farmer')")
    source: str = Field("", description="icon: illustrated icon/emoji; photo: a real photo; generate: a drawn sticker")
    frame: str = "none"
    tape: bool = False
    value: str = Field("", description="counter: the number exactly as in the line, e.g. '41', '2.2 million', '₹10'")
    bars: list[Bar] = Field(default_factory=list)
    enter: Enter = Field(default_factory=Enter)
    loop: str = "none"
    move: Optional[Move] = None
    exit: Optional[Exit] = None

    model_config = {"populate_by_name": True}

    @field_validator("value", "text", "query", mode="before")
    @classmethod
    def as_text(cls, v):  # a model writes 17 for "17"
        return "" if v is None else str(v)


class Bg(BaseModel):
    type: str = "linear"
    colors: list[str] = Field(description="1-3 colours")
    angle: float = 160
    pattern: str = "none"
    patternColor: str = ""


class Shot(BaseModel):
    bg: Bg
    ink: str = Field(description="main text/outline colour, high contrast on bg")
    accent: str
    camera: str = "push"
    elements: list[El] = Field(description="3-9 things on screen")


class Design(BaseModel):
    shots: list[Shot] = Field(description="1 shot, or 2 for a line longer than about 6 seconds (each gets half the time)")


class Critique(BaseModel):
    ok: bool = Field(description="true only if this frame would pass in a professional explainer")
    problems: list[str] = Field(default_factory=list, description="each problem, specific and fixable")


REVIEW = """You are a strict art director reviewing one frame of a {aspect} motion-graphics explainer ({shot}), taken
after every element has arrived. The narrator is saying: "{speech}"
List every real problem, specifically (what, where, how to fix):
- text unreadable: low contrast, cut off, overflowing its card, too small, overlapping something
- an empty or blank card/box/sticky, a stray tiny mark, a shape that looks like a mistake
- clutter or overlap: things on top of each other by accident; or the opposite: a frame mostly empty, the hero too small
- an icon or picture that doesn't show what the line is about
- anything important in the bottom caption area, or off the edges
- weak composition: no clear focus, random placement, nothing that explains the line visually
ok = true only if none of these. Reply with ONLY JSON: {{"ok": true/false, "problems": ["..."]}}"""


class IconPick(BaseModel):
    n: int
    icon: str = Field(description="the chosen full name exactly as listed (prefix:name), or empty if none really shows it")


class IconPicks(BaseModel):
    picks: list[IconPick]


PICK = """For each numbered thing a motion-graphics shot needs, choose the ONE icon from its list whose name really shows that
thing (the object or person itself, not something that merely shares a word: 'US flag' is flag-united-states, never
flag-chad; 'scientist' is a person, never a lock). Prefer an animated emoji (noto-anim:...) when it really shows the thing: it moves by itself.
Otherwise prefer the colourful illustration sets (fluent-emoji, noto, twemoji, openmoji). If nothing in the list really shows it, leave icon empty."""


class Palette(BaseModel):
    name: str
    bg: Bg
    ink: str
    accent: str


class Look(BaseModel):
    mood: str = Field(description="one sentence: the feel of this film's visuals")
    motif: str = Field(description="a recurring visual idea, e.g. 'lab notebook stickers', 'neon circuit board'")
    palettes: list[Palette] = Field(description="4-6 palettes that belong together; at least one dark")
    caption_bg: str
    caption_fg: str
    caption_hi: str


LOOK = """You are the art director of a motion-graphics explainer studio (Kurzgesagt, Vox, Johnny Harris, Instagram
explainer reels). Pick ONE visual look for this whole film that suits its topic and mood. Colours are yours to choose:
not a house colour. A finance reel, a biology explainer and a travel vlog must look different. Give 4-6 palettes that
belong together (use them across shots for variety), at least one dark. Every palette must have strong contrast
between its background and its ink. Hex colours only.
FILM: {topic}
LANGUAGE ON SCREEN: {language}
SOME LINES:
{sample}"""

SHOT = """You are a motion designer. Design the shot that plays while the narrator says ONE line of a {aspect} video. You
decide everything: the background, every object on screen, where it sits, how big, its colours, and how it moves.

THE FILM'S LOOK: {look}
Palettes you can use (pick one, or a close variation; vary between shots): {palettes}

STAGE: {W} x {H} units, origin top-left. Keep everything inside x 4..{W4}, y 4..{Hsafe}; below y {Hsafe} the captions sit,
so nothing important there. Element x/y is the top-left corner, w/h its size.

WHAT YOU CAN PUT ON SCREEN
- text: kinetic words (each word pops in; 'mark' sweeps a highlighter over key words). Max 6 words. size 6-14.
- box: a card with a thick outline and a hard offset shadow, with a short label. sticky: a sticky note with tape.
- shape: circle, rect, pill, star, ring, blob, line, burst (decoration, highlights, sparkles, diagrams).
- arrow: from [x,y] to [x,y], 'curve' bends it, 'dashed' for routes. It draws itself.
- icon: ANY object or idea, fetched from a huge library of illustrated icons and 3D-style emoji: a man, a woman, a farmer,
  oxygen, a molecule, a robot, a rocket, money, a bank, a phone, a brain, a lab, a flag, a tree, a planet... Give 'query'
  (1-4 plain English words) and source 'icon'. This is your main way to SHOW things. Use several per shot.
- image: a real photo (source 'photo': real people, places, events, products by name) or a drawn sticker (source
  'generate': a specific object no icon has). Give 'query'. Put it in a frame: polaroid, circle or card.
- counter: a big number that counts up. 'value' must be a number that is IN the line or its facts, written as there.
- bars: a small bar chart, only with numbers from the line or its facts.
- phone: a phone with text on its screen.

MOTION: each element has 'enter' (style + 'at' seconds + 'dur'). Stagger the entrances across the shot so something new
happens about every 1-1.5 seconds; the most important thing arrives first. 'loop' keeps 1-3 things alive (bob, float,
pulse, spin, wiggle). 'move' makes a thing travel (a coin flying into a phone, a molecule entering the lungs, a person
walking to a door) to show cause and effect. 'exit' removes something before the shot ends, if the story needs it.
Camera: push (default), pull, drift, still.

RULES
- SHOW the idea literally with objects, not just words. A person said something: their icon or photo with a speech card.
  A process: objects connected by arrows, a thing travelling along them. A number: a counter plus an icon of what it counts.
- One idea per shot, BOLD and FULL: one hero object big (40-70 units wide) as the focus, 2-5 supporting objects (14-30
  units), words in boxes or sticky notes rather than floating. Use the whole stage above the captions; no tiny things
  lost in empty space. Layer: a coloured shape or burst behind the hero, a sticky or label overlapping a corner.
- Colour: things must stand out from the background (a light card on a dark ground, a dark outline on a light one).
- On-screen words in {language}{roman}, short. Never invent facts or numbers.
- If the line is longer than about 6 seconds you may design 2 shots (each plays for half the line).

COMPOSE LIKE A DESIGNER (pick one layout and commit to it):
- HERO: one big object centred (50-70 wide), a shape (circle/blob/burst) right behind it, 2-3 small things around it
  (a sticky with the key words, a label box, an icon), the key phrase as text above or below.
- FLOW: 2-4 boxes or icons in a row (landscape) or a column (vertical), arrows between them, something travelling along.
- VERSUS: two halves, left/right (or top/bottom), each a hero object with a label box, a 'vs' or arrow between.
- NUMBER: a huge counter, the icon of what it counts beside or above it, a sticky saying what it means.
- PERSON SAYS: the person's icon or photo big on one side, a speech-card box with their words beside them.
Align things on shared lines, keep even gaps, nothing floating at random. Never leave a box without text.

A GOOD SHOT (vertical stage 100 x 178; scale positions for landscape), for "Rs 10 ki chai, aur payment ek second mein":
{{"bg":{{"type":"radial","colors":["#fff3d6","#fde7b6"],"pattern":"rays","patternColor":"#fbe0a4"}},"ink":"#1f1c1b","accent":"#a6f04a","camera":"push",
"elements":[{{"type":"shape","shape":"blob","x":14,"y":22,"w":72,"h":62,"fill":"#ffd36b","enter":{{"style":"zoom","at":0}}}},
{{"type":"icon","query":"tea glass","source":"icon","x":26,"y":26,"w":48,"h":50,"enter":{{"style":"drop","at":0.1}},"loop":"bob"}},
{{"type":"sticky","text":"Rs 10","x":64,"y":20,"w":28,"h":22,"r":8,"size":7,"enter":{{"style":"stamp","at":0.9}}}},
{{"type":"icon","query":"qr code","source":"icon","x":8,"y":70,"w":22,"h":22,"enter":{{"style":"pop","at":1.4}},"loop":"pulse"}},
{{"type":"arrow","from":[31,80],"to":[52,92],"curve":-6,"dashed":true,"enter":{{"style":"draw","at":1.7}}}},
{{"type":"phone","text":"Paid","x":54,"y":76,"w":30,"h":44,"fill":"#a6f04a","enter":{{"style":"right","at":2.0}}}},
{{"type":"text","text":"ek second mein","mark":"second","x":6,"y":4,"w":88,"size":9,"enter":{{"style":"rise","at":0.4}}}}]}}

THE LINE ({seconds:.1f} s): {speech}
{context}"""


def lenient(schema, raw: str):
    """A design keeps every element that is valid; one malformed element is dropped, not the whole shot."""
    if schema is not Design:
        return schema.model_validate_json(raw)
    data = json.loads(raw)
    shots = []
    for sh in (data.get("shots") or ([data] if "elements" in data else [])):
        els = []
        for e in sh.get("elements") or []:
            try:
                els.append(El.model_validate(e))
            except Exception:
                pass
        try:
            shots.append(Shot.model_validate({**sh, "elements": []}).model_copy(update={"elements": els}))
        except Exception:
            continue
    if not any(s.elements for s in shots):
        raise ValueError("no usable shot in the reply")
    return Design(shots=shots)


def ask_json(llm, schema, system: str, user: str, max_tokens: int):
    """Plain JSON in the shape the prompt's example shows (models copy an example far better than they fill a long
    strict schema, which made GLM leave most fields empty), checked by pydantic; one retry."""
    if getattr(llm, "name", "") == "gemini":
        # Gemini's JSON mode (no thinking) sometimes runs a number on for 15,000 digits, which no parser accepts: read
        # the raw reply, cut every runaway number back to its first digits (clean() clamps positions anyway), keep the shot
        from google.genai import types

        from app.llm import inline_schema
        config = types.GenerateContentConfig(system_instruction=system, response_mime_type="application/json",
                                             response_json_schema=inline_schema(schema), max_output_tokens=max_tokens,
                                             thinking_config=types.ThinkingConfig(thinking_budget=0))
        sys.set_int_max_str_digits(0)  # the SDK parses the reply itself (a schema is set): let it, then cut the runaway below
        raw = llm._generate(llm._model(False), user, config)
        return lenient(schema, re.sub(r"-?\d[\d.eE+\-]{11,}", lambda m: m.group(0).lstrip("-")[:3].rstrip("."), raw))
    if not hasattr(llm, "_chat") or not hasattr(llm, "_json"):
        return llm.structured(schema, system, user, max_tokens=max_tokens)
    err = ""
    for _ in range(2):
        resp = llm._chat(llm._model(False), [{"role": "system", "content": system}, {"role": "user", "content": user + err}],
                         max_tokens=max_tokens, response_format={"type": "json_object"})
        try:
            return lenient(schema, llm._json(resp))
        except Exception as e:
            why = str(e)[:300]
            err = f"\n\nYour last reply was not valid ({why[:200]}). Reply with ONLY the JSON object."
    raise ValueError(f"no valid JSON after a retry: {why}")


def stage(vertical: bool) -> tuple[float, float]:
    return (100.0, 177.8) if vertical else (177.8, 100.0)


# ---------------- assets from the internet ----------------
class Assets:
    def __init__(self, slug: str, llm, st=None):
        self.slug, self.llm, self.st = slug, llm, st
        self.done, self.total = 0, 0
        self.dir = os.path.join(HERE, "public", slug, "motion")
        os.makedirs(self.dir, exist_ok=True)
        self.cache_path = os.path.join(self.dir, "assets.json")
        self.cache = json.load(open(self.cache_path)) if os.path.exists(self.cache_path) else {}
        self.generated = 0
        self.style = ""  # the skill's art style for drawn pictures, if it has one

    def save(self):
        json.dump(self.cache, open(self.cache_path, "w"), indent=1)

    def say(self, msg: str) -> None:
        """Progress onto the film's page (the stage stays 'visuals'), so a long fetch never looks stuck."""
        if self.st:
            self.st.update("visuals", msg, done=min(self.done, self.total), total=max(1, self.total))
        else:
            print(msg, flush=True)

    def get(self, source: str, query: str) -> str | None:
        key = f"{source}:{query.lower().strip()}"
        if key in self.cache:
            return self.cache[key]
        path = None
        try:
            if source == "photo":
                path = self.photo(query) or self.icon(query)
            elif source == "generate":
                path = self.icon(query) if self.generated >= 14 else (self.draw(query) or self.icon(query))
            else:
                path = self.icon(query) or (self.draw(query) if self.generated < 14 else None)
        except Exception as e:
            print(f"  asset failed ({source} {query}): {str(e)[:90]}", flush=True)
        self.cache[key] = path
        return path

    def candidates(self, query: str) -> list[str]:
        """Iconify (200,000+ open icons) names that might show the thing: the whole query and its main words, colourful
        illustration sets first, then the whole library."""
        words = [w for w in re.findall(r"[a-z]+", query.lower()) if len(w) > 2]
        found: list[str] = []
        for q in dict.fromkeys([query] + sorted(words, key=len, reverse=True)[:2]):
            for pf in (",".join(ICON_SETS[:9]), None):
                r = httpx.get("https://api.iconify.design/search", params={"query": q, "limit": 24, **({"prefixes": pf} if pf else {})}, headers=UA, timeout=20)
                found += [n for n in (r.json().get("icons", []) if r.status_code == 200 else []) if n not in found]
        rank = lambda n: (ICON_SETS.index(n.split(":")[0]) if n.split(":")[0] in ICON_SETS else 99)
        colour = [n for n in found if rank(n) < 9][:12]
        try:  # animated emoji whose name shares a word with the query: they move on their own, so they come first
            anim = [f"noto-anim:{slug}" for cp, slug in noto_animated() if any(w in slug.split("-") for w in words)][:6]
        except Exception:
            anim = []
        return anim + colour + [n for n in found if rank(n) >= 9][: 22 - len(colour)]

    def pick_icons(self, queries: list[str]) -> None:
        """One model call picks, for every query, the icon whose name really means it ('US flag' -> flag-united-states,
        not flag-chad), or none (then the image model draws it)."""
        todo = [q for q in queries if f"icon:{q.lower().strip()}" not in self.cache]
        if not todo:
            return
        with ThreadPoolExecutor(6) as ex:
            cands = dict(zip(todo, ex.map(self.candidates, todo)))
        # in batches: one answer for 96 things ran past the reply limit and came back cut off
        chosen: dict[int, str] = {}
        for b0 in range(0, len(todo), 15):
            part = todo[b0:b0 + 15]
            self.say(f"Choosing icons {b0 + 1}-{b0 + len(part)} of {len(todo)}")
            listing = "\n".join(f"{k}. {q}: " + ", ".join(cands[q]) for k, q in enumerate(part))
            for attempt in range(2):
                try:
                    picks = self.llm.structured(IconPicks, PICK, listing, max_tokens=12000).picks
                    chosen.update({b0 + p.n: p.icon for p in picks if 0 <= p.n < len(part)})
                    break
                except Exception as e:
                    print(f"  icon picks {b0 + 1}-{b0 + len(part)} failed ({str(e)[:70]}){'; retrying' if not attempt else '; using the best-ranked match'}", flush=True)
        for k, q in enumerate(todo):
            name = chosen.get(k, "") or self.best_guess(q, cands[q])
            self.done += 1
            self.say(f"Icon {k + 1} of {len(todo)}: {q}")
            try:
                path = self.fetch_icon(name) if name and name in cands[q] else None
                self.cache[f"icon:{q.lower().strip()}"] = path or (self.draw(q) if self.generated < 14 else None)
            except Exception as e:  # one icon that can't be fetched is left out; the film carries on
                print(f"  icon '{q}' failed: {str(e)[:80]}", flush=True)
                self.cache[f"icon:{q.lower().strip()}"] = None

    @staticmethod
    def best_guess(query: str, names: list[str]) -> str:
        """Without the model's pick: the colourful icon whose name holds the most of the query's words, if any does."""
        words = [w for w in re.findall(r"[a-z]+", query.lower()) if len(w) > 2]
        # a blind guess must be exact: every word asked for and nothing else ("rocket" -> rocket, "flag" alone never
        # becomes flag-chad); anything less is left to the image model, which draws exactly what was asked
        for n in names:
            parts = [x for x in n.split(":", 1)[1].split("-") if not x.isdigit()]
            if words and sorted(parts) == sorted(words):
                return n
        return ""

    def fetch_icon(self, full: str) -> str | None:
        prefix, name = full.split(":", 1)
        if prefix == "noto-anim":  # an animated emoji: Google's Lottie JSON, played by the renderer
            cp = next((c for c, slug in noto_animated() if slug == name), None)
            r = httpx.get(NOTO_LOTTIE.format(cp=cp), headers=UA, timeout=30) if cp else None
            if not r or r.status_code != 200 or not r.text.lstrip().startswith("{"):
                return None
            f = f"anim-{cp}.json"
            open(os.path.join(self.dir, f), "w").write(r.text)
            return f"{self.slug}/motion/{f}"
        svg = httpx.get(f"https://api.iconify.design/{prefix}/{name}.svg", params={"height": "512"}, headers=UA, timeout=20)
        if svg.status_code != 200 or not svg.text.lstrip().startswith("<svg"):
            return None
        mono = "currentColor" in svg.text and prefix not in ICON_SETS[:9]  # a one-colour glyph: the renderer tints it
        f = f"icon-{prefix}-{name}{'.mono' if mono else ''}.svg"
        open(os.path.join(self.dir, f), "w").write(svg.text)
        return f"{self.slug}/motion/{f}"

    def icon(self, query: str) -> str | None:
        self.pick_icons([query])
        return self.cache.get(f"icon:{query.lower().strip()}")

    def photo(self, query: str) -> str | None:
        """A real photo from Wikimedia Commons (free licences); the vision model checks it shows the thing."""
        self.say(f"Finding a photo: {query}")
        r = httpx.get("https://commons.wikimedia.org/w/api.php", headers=UA, timeout=30, params={
            "action": "query", "generator": "search", "gsrsearch": f"{query} filetype:bitmap", "gsrnamespace": 6, "gsrlimit": 6,
            "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": 1280, "format": "json"})
        pages = sorted((r.json().get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
        for p in pages[:4]:
            info = (p.get("imageinfo") or [{}])[0]
            url = info.get("thumburl") or info.get("url")
            if not url or info.get("mime") not in ("image/jpeg", "image/png"):
                continue
            data = httpx.get(url, headers=UA, timeout=60, follow_redirects=True).content
            if hasattr(type(self.llm), "look"):
                try:
                    from archivedoc import Look as Seen
                    seen = self.llm.look(Seen, data, f"Does this photo clearly show: {query}? Answer match true/false, and what it shows.")
                    if not seen.match:
                        continue
                except Exception:
                    pass
            f = "photo-" + hashlib.md5(url.encode()).hexdigest()[:10] + (".png" if url.lower().endswith(".png") else ".jpg")
            open(os.path.join(self.dir, f), "wb").write(data)
            return f"{self.slug}/motion/{f}"
        return None

    def draw(self, query: str) -> str | None:
        """A sticker the image model draws, for a thing no icon library has."""
        self.say(f"Drawing picture {self.generated + 1} (up to 14): {query}")
        if self.style:  # a skill's own art style (learned from the creator's references)
            png = self.llm.generate_image(f"{query}. Drawn in this exact style: {self.style}. One isolated subject, centred on a plain "
                                          "white background, no text, no frame.")
        else:
            png = self.llm.generate_image(f"{query}. A single sticker-style illustration: bold clean outlines, flat bright colours, "
                                          "centred on a plain white background, no text, no frame, no shadow.")
        if not png:
            return None
        self.generated += 1
        f = "draw-" + hashlib.md5(query.encode()).hexdigest()[:10] + ".png"
        open(os.path.join(self.dir, f), "wb").write(cut_out(png))
        return f"{self.slug}/motion/{f}"


def cut_out(png: bytes) -> bytes:
    """A drawn sticker comes on a plain white ground: make the white that touches the edges transparent, so the sticker
    sits on the shot's background instead of in a white box. Unchanged if anything goes wrong."""
    try:
        import io

        from PIL import Image, ImageDraw
        im = Image.open(io.BytesIO(png)).convert("RGBA")
        w, h = im.size
        for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
            if min(im.getpixel(xy)[:3]) > 225:
                ImageDraw.floodfill(im, xy, (255, 255, 255, 0), thresh=40)
        out = io.BytesIO()
        im.save(out, "PNG")
        return out.getvalue()
    except Exception:
        return png


# ---------------- the director ----------------
def ordered(lines: list[dict]) -> list[dict]:
    """The cold open first (as the film plays), then the chapters; trimmed lines and markers left out."""
    keep = [l for l in lines if not l.get("cut") and l.get("opener") != "marker"]
    return [l for l in keep if l.get("opener")] + [l for l in keep if not l.get("opener")]


def beat_context(l: dict) -> str:
    b = l.get("beat") or {}
    k = b.get("kind")
    if k == "number":
        return f"FACT ON THIS LINE: {b.get('value')} = {b.get('label')} (source: {b.get('source')})"
    if k == "quote":
        return f"QUOTE ON THIS LINE: “{b.get('text')}” — {b.get('who')}"
    if k == "chart":
        return "CHART DATA: " + "; ".join(f"{x.get('label')}: {x.get('display') or x.get('value')}" for x in b.get("bars", []))
    if k == "archival" and b.get("src"):
        return f"A REAL PHOTO IS AVAILABLE for this line (use an image element with source 'photo' and query: {b.get('caption') or ''})"
    return ""


def numbers_ok(el: El, allowed: str) -> bool:
    digits = re.findall(r"\d+(?:\.\d+)?", el.value or "")
    return all(d in allowed for d in digits)


TYPES = {"text", "box", "sticky", "shape", "arrow", "icon", "image", "counter", "bars", "phone"}
ENTERS = {"pop", "fade", "rise", "drop", "left", "right", "zoom", "draw", "flip", "type", "stamp", "count", "none"}
ENTER_ALIAS = {"spin": "flip", "slide": "left", "grow": "zoom", "scale": "zoom", "bounce": "pop", "appear": "fade", "slam": "stamp", "write": "type"}
LOOPS = {"bob", "pulse", "spin", "float", "wiggle", "blink", "none"}
SHAPES = {"rect", "circle", "pill", "star", "ring", "blob", "line", "burst"}


def clean(shot: Shot, W: float, H: float, allowed: str) -> Shot:
    els = []
    for el in shot.elements[:10]:
        el.type = {"label": "box", "card": "box", "note": "sticky", "emoji": "icon", "photo": "image", "number": "counter"}.get(el.type, el.type)
        if el.type not in TYPES:
            continue
        el.enter.style = el.enter.style if el.enter.style in ENTERS else ENTER_ALIAS.get(el.enter.style, "pop")
        el.loop = el.loop if el.loop in LOOPS else "none"
        el.shape = el.shape if el.shape in SHAPES else "circle"
        if el.type in ("box", "sticky", "phone") and not el.text.strip():
            continue  # never an empty card
        if el.type == "arrow" and (len(el.from_) != 2 or len(el.to) != 2):
            continue
        if el.type == "counter" and not numbers_ok(el, allowed):
            el = el.model_copy(update={"type": "text", "value": "", "text": el.text or el.value})  # never a number the line doesn't have
        if el.type == "bars" and not all(numbers_ok(El(type="counter", x=0, y=0, value=str(b.display or b.value)), allowed) for b in el.bars):
            continue
        el.w, el.h = max(2, min(el.w, W)), max(2, min(el.h, H))
        el.x, el.y = max(-el.w * 0.3, min(el.x, W - el.w * 0.7)), max(-el.h * 0.3, min(el.y, H - el.h * 0.5))
        els.append(el)
    shot.elements = els
    return shot


def slim(x):
    """Empty strings, zeros and empty lists mean "use the renderer's default": drop them so they don't override it."""
    if isinstance(x, dict):
        return {k: slim(v) for k, v in x.items() if v not in ("", None, []) and not (k in ("size", "strokeWidth", "radius", "curve", "spin") and v == 0)}
    if isinstance(x, list):
        return [slim(v) for v in x]
    return x


def fallback(speech: str, look: Look, n: int, W: float, H: float) -> Shot:
    p = look.palettes[n % len(look.palettes)]
    words = " ".join(speech.split()[:6])
    return Shot(bg=p.bg, ink=p.ink, accent=p.accent, elements=[El(type="text", x=8, y=H * 0.3, w=W - 16, h=30, text=words, size=10, mark=words.split()[-1] if words else "")])


def direct(slug: str, st=None, cfg: dict | None = None, llm=None, limit: int = 0) -> dict:
    from app.llm import get_llm

    llm = llm or get_llm()
    base = os.path.join(HERE, "public", slug)
    props = json.load(open(os.path.join(base, "archive.json")))
    cfg = cfg or (json.load(open(os.path.join(base, "config.json"))) if os.path.exists(os.path.join(base, "config.json")) else {})
    vertical = (cfg.get("aspect") or "") == "9:16"
    W, H = stage(vertical)
    lang = cfg.get("language") or "English"
    roman = " (Roman letters, never Devanagari)" if lang.lower() == "hinglish" else ""
    lines = ordered(props["lines"])[: limit or None]
    # the skill's style brief (backend/app/api/vskills.py LOOKS): what makes a cartoon film differ from a realistic one
    style = f"\nSTYLE BRIEF (follow it strictly; it overrides the defaults above): {cfg['style']}" if cfg.get("style") else ""
    say = lambda m: st.update("visuals", m) if st else print(m, flush=True)

    look_path = os.path.join(base, "motion", "look.json")
    os.makedirs(os.path.dirname(look_path), exist_ok=True)
    if cfg.get("look"):  # a skill learned from the creator's references brings its own look: never a new one
        look = Look.model_validate(cfg["look"])
        open(look_path, "w").write(look.model_dump_json(indent=1))
    elif os.path.exists(look_path):
        look = Look.model_validate_json(open(look_path).read())
    else:
        say("Choosing the film's look")
        sample = "\n".join(l["speech"] for l in lines if l.get("speech"))[:2500]
        look = llm.structured(Look, LOOK.format(topic=cfg.get("topic", slug), language=lang, sample=sample) + style, "Design the look.", smart=True, max_tokens=10000)
        open(look_path, "w").write(look.model_dump_json(indent=1))
    pal = "; ".join(f"{p.name}: bg {p.bg.type} {', '.join(p.bg.colors)} pattern {p.bg.pattern}, ink {p.ink}, accent {p.accent}" for p in look.palettes)

    shots_path = os.path.join(base, "motion", "shots.json")
    done: dict = json.load(open(shots_path)) if os.path.exists(shots_path) else {}
    speed = props.get("speed", 1) or 1

    def design(i: int, l: dict, review: str = "") -> list[dict]:
        key = hashlib.md5(((l.get("speech") or "") + json.dumps(l.get("beat") or {}, sort_keys=True)).encode()).hexdigest()
        if key in done and not review:
            return done[key]
        speech = l.get("speech") or (l.get("beat") or {}).get("title", "")
        secs = (l["seconds"] / speed if l.get("audio") else l["seconds"]) + (l.get("pause") or 0.3)
        title = not l.get("speech")
        context = beat_context(l) + ("\nThis is a CHAPTER TITLE card: make it a bold title shot." if title else "")
        allowed = speech + " " + context
        shots = []
        for attempt in range(2):  # a reply that degenerates (a 15,000-digit number) gets one more try before the fallback
            try:
                d = ask_json(llm, Design, SHOT.format(aspect="vertical 9:16 reel" if vertical else "16:9", look=f"{look.mood} Motif: {look.motif}.{style}",
                                                       palettes=pal, W=round(W), H=round(H), W4=round(W - 4), Hsafe=round(H * (0.74 if vertical else 0.82)),
                                                       language=lang, roman=roman, seconds=secs, speech=speech, context=context) + review,
                                   'Reply with ONLY a JSON object: {"shots": [ <one shot like the example>, <optional second shot> ]}. '
                                   "Every box, sticky and phone has its text; every icon/image has its query and source.", max_tokens=16000)
                shots = [clean(s, W, H, allowed) for s in d.shots[: 2 if secs > 6 else 1] if s.elements]
                break
            except Exception as e:
                print(f"  shot {i + 1} {'failed, trying again' if attempt == 0 else 'fell back'} ({str(e)[:90]})", flush=True)
        if review and not shots:
            return done.get(key) or [slim(fallback(speech, look, i, W, H).model_dump(by_alias=True))]  # a failed fix keeps the draft
        out = [slim(s.model_dump(by_alias=True)) for s in (shots or [fallback(speech, look, i, W, H)])]
        done[key] = out
        return out

    say(f"Designing {len(lines)} motion shots")
    designed: list[list[dict]] = [None] * len(lines)  # type: ignore
    with ThreadPoolExecutor(6) as ex:
        for k, (i, out) in enumerate(zip(range(len(lines)), ex.map(lambda il: design(*il), enumerate(lines)))):
            designed[i] = out
            if st:
                st.update(done=k + 1, total=len(lines))
    json.dump(done, open(shots_path, "w"))

    assets = Assets(slug, llm, st)
    assets.style = cfg.get("picture_style") or ""
    for name, path in (cfg.get("stickers") or {}).items():  # the skill's own painted stickers: the shots ask for them by name
        assets.cache[f"skill:{name.lower().strip()}"] = path
    src_of = lambda el: el.get("source") or ("icon" if el["type"] == "icon" else "photo")

    def finish() -> dict:
        """Fetch what the shots ask for (once each), drop what couldn't be found, write motion.json."""
        wanted = {(src_of(el), el["query"]) for shots in designed for s in shots for el in s["elements"]
                  if el["type"] in ("icon", "image") and el.get("query") and not el.get("src")}
        say(f"Fetching {len(wanted)} pictures and icons")
        assets.done, assets.total = 0, len(wanted)
        try:
            assets.pick_icons(sorted({q for src, q in wanted if src == "icon"}))
        except Exception as e:  # pictures improve a shot; they never stop the film (a shot without one keeps its words)
            print(f"  icons failed, shots keep their other elements: {str(e)[:100]}", flush=True)
        with ThreadPoolExecutor(6) as ex:
            def one(sq):
                r = assets.get(*sq)
                assets.done += 1
                return r
            list(ex.map(one, sorted(w for w in wanted if w[0] != "icon")))
        assets.save()
        for shots in designed:
            for s in shots:
                for el in s["elements"]:
                    if el["type"] in ("icon", "image") and not el.get("src"):
                        el["src"] = assets.cache.get(f"{src_of(el)}:{el['query'].lower().strip()}") if el.get("query") else None
                s["elements"] = [el for el in s["elements"] if el["type"] not in ("icon", "image") or el.get("src")]
        o = {"speed": speed, "vertical": vertical, "captions": {"bg": look.caption_bg, "fg": look.caption_fg, "hi": look.caption_hi}, **({"skin": cfg["skin"]} if cfg.get("skin") else {}),
             "lines": [{"speech": l.get("speech") or "", "audio": l.get("audio"), "seconds": l["seconds"], "pause": l.get("pause", 0.3),
                        "sfx": l.get("sfx"), "scenes": designed[i]} for i, l in enumerate(lines)]}
        json.dump(o, open(os.path.join(base, "motion.json"), "w"), ensure_ascii=False)
        return o

    out = finish()

    # the agent looks at what it made: a still of every shot, a reviewer's eye on it, and a redesign where it falls short
    for rnd in range(int(cfg.get("motion_reviews", 1))):
        say(f"Looking at every shot (review {rnd + 1}): taking a still of each")
        stills = os.path.join(base, "motion", "stills")
        import shutil
        import subprocess
        shutil.rmtree(stills, ignore_errors=True)
        r = subprocess.run([shutil.which("node") or "node", "motion-stills.mjs", f"public/{slug}/motion.json", stills], cwd=HERE, capture_output=True, text=True)
        if r.returncode != 0:
            print(f"  stills failed, keeping the designs as they are: {r.stderr[-300:]}", flush=True)
            break

        def critique(i: int) -> tuple[int, list[str]]:
            probs: list[str] = []
            for j in range(len(designed[i])):
                png = os.path.join(stills, f"{i}-{j}.png")
                if not os.path.exists(png):
                    continue
                try:
                    c = llm.look(Critique, open(png, "rb").read(), REVIEW.format(aspect="9:16 reel" if vertical else "16:9 video",
                                                                                    speech=lines[i].get("speech") or "(a chapter title card)",
                                                                                    shot=f"shot {j + 1} of {len(designed[i])}"), mime="image/png")
                    if not c.ok:
                        probs += [f"shot {j + 1}: {p}" for p in c.problems]
                except Exception as e:
                    print(f"  review of line {i + 1} failed: {str(e)[:80]}", flush=True)
            return i, probs

        found, seen = [], 0
        with ThreadPoolExecutor(6) as ex:
            for x in ex.map(critique, range(len(lines))):
                seen += 1
                if st:
                    st.update("visuals", f"Reviewing shots: line {seen} of {len(lines)}, {len(found) + bool(x[1])} need work", done=seen, total=len(lines))
                if x[1]:
                    found.append(x)
        if not found:
            say("Every shot passed review")
            break
        say(f"Redesigning {len(found)} shots the review flagged")
        def fix(ip):
            i, probs = ip
            prev = json.dumps({"shots": designed[i]}, ensure_ascii=False)[:6000]
            return i, design(i, lines[i], f"\n\nYOUR PREVIOUS DESIGN FOR THIS LINE:\n{prev}\n\nA REVIEWER LOOKED AT THE RENDERED FRAME "
                                          "AND FOUND THESE PROBLEMS. Redesign the shot so every one is fixed (keep what worked):\n- " + "\n- ".join(probs))
        with ThreadPoolExecutor(6) as ex:
            for k, (i, shots) in enumerate(ex.map(fix, found)):
                designed[i] = shots
                if st:
                    st.update("visuals", f"Redesigning shot {k + 1} of {len(found)}", done=k + 1, total=len(found))
        json.dump(done, open(shots_path, "w"))
        out = finish()

    say(f"Motion design done: {sum(len(s) for s in designed)} shots")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--lines", type=int, default=0, help="only the first N lines (a quick sample)")
    ap.add_argument("--render", action="store_true")
    a = ap.parse_args()
    props = direct(a.out, limit=a.lines)
    if a.render:
        import subprocess
        comp = "MotionVertical" if props["vertical"] else "Motion"
        target = os.path.join(HERE, "out", f"{a.out}-motion{'-sample' if a.lines else ''}.mp4")
        subprocess.run(["npx", "remotion", "render", "src/index.ts", comp, target, f"--props=public/{a.out}/motion.json", "--concurrency=6", "--crf=20"], cwd=HERE, check=True)
        print("DONE", target)
