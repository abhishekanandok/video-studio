"""The Argon motion agent: Gemini 4 Argon designs a motion-graphics video by WRITING IT, scene by scene, as code.

Nothing here is a template. From a topic (or a script), the agent:
  1. plans the film: the theme (palette, fonts, a background painted around the topic, how things move) and, for every
     line, the beat it needs (a photo with callouts, a cycle, a process, a graph, a timeline, a number, a comparison, a
     map, a meme, a transition) with the pictures and data it needs and the words each thing lands on;
  2. voices it (Gemini TTS) and times every word (faster-whisper), so things land exactly when they are said;
  3. finds the pictures: real photos from Wikimedia (checked by a vision model), animated Noto emoji, illustrated icons,
     and paints what nothing has (the background plate, drawn pictures);
  4. writes every scene as a React/Remotion component on a small kit (src/argon/kit.tsx: timing on words, appear, draw
     on, travel along a path, photos with pointer callouts, counters, charts, kinetic words);
  5. compiles each scene, renders stills of it, LOOKS at them and fixes its own code;
  6. renders the film.

    public/argon/<slug>/   plan.json, voice-NN.wav, words.json, assets, stills/
    src/argon/gen/<slug>/  scene-NN.tsx (written by the agent), film.tsx, entry.ts
    out/argon-<slug>.mp4

Run from backend/:  .venv/bin/python ../video/argon.py --slug watercycle --topic "The water cycle" [--steps all|plan|voice|assets|code|check|render]
"""

import argparse
import concurrent.futures
import functools
import json
import os
import re
import shutil
import subprocess
import sys
import time
import wave

from pydantic import BaseModel, Field

import styles

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
sys.path.insert(0, HERE)
ARGON = os.environ.get("ARGON_MODEL", "gemini-4-argon")
ARGON_OK = True
LOG_PATH = ""  # the film's argon.log: the model that answered is noted there (for the app's pipeline page)  # False once Argon answers 404 (not enabled for this key): the run goes on with the fallback model
NPX = shutil.which("npx") or "npx"
NODE = shutil.which("node") or "node"


# ---------------- the model ----------------
_clients: dict = {}
import threading
_lock = threading.Lock()  # scenes are written in parallel: one client per endpoint, never one replaced mid-request


def client(model: str):
    """A Gemini client that reaches `model` (Argon is served from the global endpoint)."""
    from google import genai
    from google.genai import types

    from app.config import settings
    key = "global" if model.startswith("gemini-4") else "default"
    with _lock:
        return _client_locked(key, genai, types, settings)


def _client_locked(key, genai, types, settings):
    if key not in _clients:
        kw = {"location": "global"} if key == "global" and not settings.gemini_key else {}
        http = types.HttpOptions(timeout=600_000, **({"base_url": "https://aiplatform.googleapis.com/"} if key == "global" and settings.gemini_key else {}))
        _clients[key] = genai.Client(vertexai=settings.gemini_vertex, api_key=settings.gemini_key or None, http_options=http, **kw)
    return _clients[key]


def fallback_model() -> str:
    from app.config import settings
    return settings.gemini_model_smart


TRIES = 9  # Google's per-minute quota runs out when scenes are written in parallel: enough tries to outlast it


def think(contents, system: str, schema=None, model: str = "", max_tokens: int = 32000, live=None, waiting=None, tries: int = 0) -> str:
    """Argon (or the fallback model) answers: JSON when a schema is given, else text. Retries a few times.
    live: called with the answer so far while it streams in (the editor shows the code being written).
    waiting: called (try, reason, seconds) when Google is busy and the agent waits to try again, so the editor can say so.
    tries: fewer tries than TRIES, for optional steps that should give up rather than wait out a long quota."""
    global ARGON_OK
    from google.genai import types
    model = model or (ARGON if ARGON_OK else fallback_model())
    sys.set_int_max_str_digits(0)
    def cfg_for(m: str):
        # Argon reasons by design; the fallback model gets a fixed thinking budget (unbounded, it stalls for many minutes)
        think_cfg = {} if m.startswith("gemini-4") else {"thinking_config": types.ThinkingConfig(thinking_budget=2048)}
        return types.GenerateContentConfig(system_instruction=system, max_output_tokens=max_tokens, **think_cfg,
                                           **({"response_mime_type": "application/json", "response_schema": schema} if schema else {}))
    last = None
    for attempt in range(tries or TRIES):
        try:
            t0 = time.time()
            if live:  # stream: every chunk goes to the editor as it arrives
                text, usage = "", None
                for ch in client(model).models.generate_content_stream(model=model, contents=contents, config=cfg_for(model)):
                    if ch.text:
                        text += ch.text
                        live(text)
                    usage = ch.usage_metadata or usage
                r = type("Streamed", (), {"text": text, "usage_metadata": usage, "candidates": []})()
            else:
                r = client(model).models.generate_content(model=model, contents=contents, config=cfg_for(model))
            print(f"  {model} answered in {time.time() - t0:.0f} s", flush=True)
            if LOG_PATH:
                open(LOG_PATH, "a").write(f"  model: {model} answered in {time.time() - t0:.0f} s\n")
            try:
                import cost
                cost.tokens(model, r.usage_metadata)
            except Exception:
                pass
            if r.text:
                return re.sub(r"-?\d[\d.eE+\-]{11,}", lambda m: m.group(0).lstrip("-")[:3].rstrip("."), r.text) if schema else r.text
            last = ValueError(f"empty reply ({r.candidates[0].finish_reason if r.candidates else 'none'})")
        except Exception as e:
            last = e
            if "404" in str(e) and model == ARGON:
                ARGON_OK = False
                print(f"  {ARGON} is not reachable with this key ({str(e)[:90]}); using {fallback_model()} for the rest of the film", flush=True)
                model = fallback_model()
                continue
        print(f"  {model} attempt {attempt + 1} failed: {str(last)[:120]}", flush=True)
        busy = "429" in str(last) or "RESOURCE_EXHAUSTED" in str(last)
        pause = min(120, (30 if busy else 4) * (attempt + 1))  # a quota limit needs patience (a per-minute quota: up to 2 min)
        if waiting:
            try:
                waiting(attempt + 2, "Google is busy" if busy else "Google timed out" if "timed out" in str(last) else "Google failed", pause)
            except Exception:
                pass
        time.sleep(pause)
    raise RuntimeError(f"{model} failed: {last}")


# ---------------- 1. the plan ----------------
class Asset(BaseModel):
    name: str = Field(description="file-safe name the scene code uses, e.g. 'clouds-photo'")
    kind: str = Field(description="photo (a real photo from Wikimedia) | emoji (an animated Noto emoji) | icon (an illustrated icon) | draw (painted in the film's art style)")
    query: str = Field(description="photo: the real thing, place or person; emoji/icon/draw: the one object, 1-4 words")


class Backdrop(BaseModel):
    kind: str = Field(description="map (the place and its neighbourhood) | photo (a REAL photo: only when the line names a real place, person, event or object) | "
                                  "paint (a full-screen picture painted for this scene: land, sky, ocean, a cross-section, a lab...) | plain (the theme's ground)")
    query: str = Field("", description="map: the region ('Ganga basin, North India'); photo: exactly what to find ('Marina Beach Chennai'); paint: what fills the screen, composed for this scene")


class Beat(BaseModel):
    line: int
    backdrop: Backdrop
    look: str = Field("", description="a film in several looks only: the id of the look this scene is made in")
    beat: str = Field(description="photo | cycle | process | graph | timeline | number | compare | map | meme | definition | person | title | transition")
    concept: str = Field(description="what the viewer SEES and how it MOVES, frame by frame, tied to the words of the line: pictured things that act "
                                     "(arrive, travel, light up, flicker, break, fill, flow), never a word, stamp, card or panel saying it")
    assets: list[Asset] = Field(default_factory=list)
    data: str = Field("", description="numbers, labels, dates or steps the beat needs, ONLY from the line itself")
    physics: str = Field("", description="how this really looks and happens in the real world, which the scene must respect: positions, angles, directions, order, scale (e.g. 'the sun is BEHIND the viewer and low, under 42 degrees; the rainbow is opposite it, centred on the antisolar point, red outside, violet inside')")
    labels: list[str] = Field(default_factory=list, description="0-2 short labels (1-3 words) the scene POINTS at a visible thing with; never a sentence, never words the narration says as a phrase, never a number a counter already shows")
    transition: str = Field("", description="how this scene hands over to the next: cut | fade | slide | zoom | wipe | match (an object carries over)")


class Theme(BaseModel):
    look: str = Field(description="real (a documentary look: real photos, Vox-style cut-outs, paper grain, photos that drift) | anime (hand-painted anime film backgrounds and characters, soft natural light)")
    mood: str
    bg: list[str] = Field(description="1-2 hex colours of the ground")
    ink: str
    accent: str
    accent2: str
    paper: str = Field(description="card / label colour")
    muted: str
    font: str = Field(description="body font: baloo | inter | fredoka | playfair | space_grotesk | caveat | oswald | newsreader | permanent_marker | poppins | lora | bebas | nunito")
    display: str = Field(description="display font for big words, same list")
    radius: int = Field(description="card corner radius px, 0-48")
    outline: int = Field(description="card outline px, 0-8")
    shadow: str = Field(description="hard | soft | none")
    layout: str = Field(description="the layout system every scene follows, so the film feels consistent while every scene has its own world: where titles sit, label and card style, how pictures are framed, margins")
    art_style: str = Field(description="the art style of painted backdrops and drawn pictures, matching the look (style words only)")
    motion: str = Field(description="the film's motion personality: how things enter, idle and transition")


class Character(BaseModel):
    name: str = Field(description="file-safe short name the scenes use, e.g. 'boy', 'mother', 'friend'")
    who: str = Field(description="how the puppet looks: age, clothes and colours, anything carried (e.g. 'a 10-year-old schoolboy in a rust jacket, sage shorts, brown shoes, a small school backpack')")


class Plan(BaseModel):
    title: str
    theme: Theme
    characters: list[Character] = Field(default_factory=list, description="the people of the story (0-4); in the paper style each becomes a jointed puppet that walks, waves and meets")
    lines: list[str] = Field(description="the narration, one spoken sentence per line")
    beats: list[Beat]


PLAN_SYSTEM = """You are the creative director of a top documentary explainer studio (Vox, Johnny Harris, Kurzgesagt,
the best anime-style science films). You plan a short film that SHOWS the real world: what the viewer sees must look
like the real thing and behave like it, never abstract boxes, cards or diagrams standing in for it.

1. THE LOOK, one for the whole film (theme.look):
   real  = a documentary: real photographs (Wikimedia) as full-screen backdrops and as Vox-style white-border cut-outs,
           photos that drift and zoom slowly, paper grain, hand-drawn marker circles and arrows on the photos.
   anime = a hand-painted anime film: every scene a painted world (soft natural light, detailed skies, water, land),
           painted characters, light and particles moving in it.
   Pick what suits the topic (nature and science processes: anime or real; history, places, people, money: real).
   The theme is the layout system on top of the look: fonts, colours, label style, where labels sit, motion personality.
2. THE NARRATION (if not given): 6-9 short spoken lines, 45-70 seconds in all, in the requested language, vivid and true.
3. A BEAT FOR EVERY LINE: what the viewer SEES HAPPEN while the line is said. Prefer the phenomenon itself, moving:
   water flowing and evaporating, vapour rising and cooling into cloud, rain falling, light entering a drop and
   splitting, a crowd moving, money changing hands, a map zooming to a place. Use beats photo | process | cycle | map |
   compare | number | person | timeline | graph only where they fit; a graph or number only when the line says one.
   In `concept`, write it like a storyboard: the start frame, what moves on which word, where the camera goes, the end.
4. PHYSICS (`physics`): for every scene, state how it really looks and happens (positions, angles, directions, order,
   scale). The scene must respect it: the sun where it really is, water running downhill, vapour going up, the right
   colours in the right order.
5. SHOW, DON'T WRITE. The captions already carry the narration, so the screen is pictures that act. When the line says
   something happens, it happens to a pictured thing: a vacuum tube flickers, glows and bursts in a puff of smoke; a
   server hall's lights go dark row by row; a route draws across the map. Never a stamp, badge, word or panel announcing
   it. The scene GROWS from its own objects: the world first, then each object arrives on its word and acts, building
   on what is there. Words appear only as LABELS on visible things (`labels`: 0-2 per scene, 1-3 words each): a name with a line to
   the part it names, a number beside what it counts, each said ONCE. No headlines, no sentences, no text cards, no
   dashboards or data sheets, nothing the screen or the caption already says.
6. A BACKDROP FOR EVERY SCENE, its own world, full screen: a scene that names a real place, person or thing shows its
   REAL PHOTO (look real) or a painting of it (look anime); a place gets its MAP and neighbourhood; otherwise paint the
   scene's world (look anime) or find a real photo of that kind of place (look real). When a person matters, show one.
7. ASSETS each scene needs, 1-3: real photos of real things (look real; they become cut-outs), draw for painted
   things and characters in the art style (look anime). Emoji and icons only for a tiny symbol, never as the hero.
Numbers and facts only from the narration. Reply with the plan."""


# ---------------- 4. the scene code ----------------
CODE_SYSTEM = """You are a senior motion designer at a documentary explainer studio, animating in React with Remotion.
You write the WHOLE film in ONE answer: you get every scene's brief at once, plan once, then write every file. There is
no second pass and no reviewer but the compiler, so it must compile and play the first time. Every scene must look like
a frame from a real documentary or an anime film: the real world, moving, with the thing the line talks about
happening in front of the viewer.

HOW YOU WORK
1. Plan first, as a comment block at the top of common.tsx: for every scene its beat and a per-second shot list on the
   word times given ("0.0 backdrop drifts; 0.6 pin drops on 'Kerala'; 1.8 rain starts on 'monsoon'; end-0.5 clears").
2. common.tsx is the film's own small library, written once: its visual system from the THEME and the style's DNA (its
   colours, its fonts through family(), one radius, one shadow, one easing) and 5-10 pieces built ON the kit and the
   library (a label with its pointer, a callout...). Export them; scenes import them from "./common". This is what
   keeps the film short and consistent. No decoration repeated across scenes: crosshairs, reticles, X marks, circles
   and grids appear only where the line points at one spot, in a few scenes at most.
3. Each scene file is then just a timeline: 10-40 lines of kit, library and common pieces saying what, where and on
   which word. No new animation code in a scene (a small drawing of its own is fine).
4. Motion everywhere, by the same few principles: ease out on entrances, ease in on exits, nothing at constant speed;
   things in a list arrive 0.1-0.2 s apart; a small overshoot and settle on landing; hold 1-2 s so things can be read;
   carry something over from one scene to the next (a colour, an object, a direction of motion).

THE KIT, its whole source: pieces you import ready-made. Import only from "../../kit", "remotion", "react", the film's
"./rigs" (RIGS, the characters' puppet rigs), "./common" (in scene files) and THE LIBRARY PIECES the brief lists;
nothing else (no other file, no fetch, no fs). Use the kit's pieces exactly as their TypeScript says:
{kit}

THE LIBRARY PIECES: each scene's brief names the motion-library pieces picked for it (MOTIONS), and the brief ends
with their exact props and import path. They make the scene's OBJECTS act (a tube bursts: Shatter; parts lock into a
machine: Assemble): wrap the scene's own picture or drawing in them, on its word. Use the props exactly as listed.

EVERYTHING ELSE you write yourself, once, in common.tsx, from React and Remotion (AbsoluteFill, Img, interpolate,
spring, Easing, staticFile, useCurrentFrame, useVideoConfig): cards, counters, charts, arrows, labels, pointers, paper
scraps, simple drawings as SVG paths. Small typed components that every scene then calls: this is what keeps the film
consistent and makes it compile the first time. A scene's CONCEPT may name a piece that is neither in the kit nor
among its library pieces: build what it describes yourself in common.tsx.

RULES (every scene file)
- `export default function Scene() {{ const s = useScene(); ... return <Stage>...</Stage>; }}` — Stage is the root.
- Time: s.t is seconds since the scene began, s.dur its length. s.at("word", fallback) is when a word is said: things
  arrive and change on the words that name them.
- The stage is {W} x {H} px. Keep important things 80 px inside the edges; the bottom {cap} px holds the captions.
- THE WORLD: the scene's BACKDROP fills the screen and is ALWAYS moving: <KenBurns src=...> (or Stage backdrop with
  push), or <Parallax> for depth. Then make the phenomenon HAPPEN in it with the real-world pieces: <Water> for seas,
  lakes and rivers; <Particles kind="vapour"> for evaporation and steam rising, "rain"/"drops" for rain, "mist" for
  haze and cloud forming, "snow", "bubbles", "dust" in light; <FlowPath> for flow along a path (a river, vapour going up,
  air, light); <Sun> placed where the sun really is with rays at the real angle. Finish with <Grain> (paper on the real look).
- LOOK real: photos as <Cutout> (white border, slight tilt) or full-screen <KenBurns>, <MarkerCircle> and hand-drawn
  <Arrow>/<DrawPath> on them. LOOK anime: the painted backdrop, painted pictures as <Sticker>/<Photo frame="none">, soft
  light and particles. NEVER flat abstract shapes, cards or boxes standing in for real things.
- PHYSICS: follow the scene's PHYSICS line exactly: where things are, angles, directions, order, colours.
- SHOW, DON'T WRITE: motion means THINGS moving. Objects arrive in an order that tells the story, travel, grow, light
  up, flicker, break, fill and flow on the words that name them. When the line says something happens, it happens to
  the picture (a tube flickers, then bursts with sparks and smoke), never a stamp, badge or word announcing it.
- THE SCENE GROWS from its own objects, like a map film: start with the world, then the line's objects arrive one
  by one and act, each building on what is already there (a route draws, then a pin drops on it, then the area
  fills); nothing is thrown on top to look busy. The same objects carry into the next scene where the story does.
- TEXT: the only words on screen are the scene's LABELS, each attached to what it names (a short label with a thin
  line or pointer to the thing, a number beside what it counts), 1-3 words, on its word. Each word or number appears
  ONCE in a scene: never a label for what a counter, card or picture already shows. No headers, titles, captions,
  "// LOG" lines, mission lines, data sheets, dashboards or sentences, in scenes or in common.tsx pieces.
- NOTHING OVERLAPS: in the plan comment give every element of a scene its own box (x, y, w, h); a new thing lands in
  empty space, never on text or across another picture (only a thin pointer may touch its thing).
- MOTION EVERYWHERE: the world moves the whole time (backdrop drift, particles, water, light); things arrive on their
  words; the camera pushes toward what matters. No static frames.
- Show a human when a person matters (a real photo of them, or a painted person in the anime look).
- Use the theme colours and fonts for labels. Never invent numbers or facts.
- Make it work at every moment: before a thing's time it is hidden; after, it stays (or leaves on purpose). Every
  interpolate() gets numbers only; guard divisions and array reads.
- TypeScript strict: type every function parameter and every component's props (in common.tsx too). Hooks only at the
  top of components; common.tsx helpers that are plain functions take what they need as arguments.

ANSWER: the files one after another, each starting with a line that is exactly its name, and nothing else (no fences,
no explanation):
// FILE: common.tsx
// FILE: scene-00.tsx
// FILE: scene-01.tsx
... one file per scene, in order, numbered from 00."""

FIX_SYSTEM = """You fix a film you wrote in React with Remotion: some of its files do not compile, break a rule, or crash
while playing. You get each broken file, numbered, with its errors, and common.tsx for reference. Change as little as
possible and keep the design and timing. Answer ONLY with patches in this exact format, one or more, nothing else:

<<<FIND scene-03.tsx
exact text copied from that file (a few whole lines, unique in it, without the line numbers)
===
the replacement text
>>>

A file that is empty or has no `export default function Scene()`: send it whole instead, as
<<<FILE scene-03.tsx
the whole file
>>>"""


def looks_of(p: dict) -> dict[str, dict]:
    """the film's looks, each with its DNA: one style, or a mix ("documentary+map") where every scene picks its look"""
    return p.get("looks") or ({p["style"]: p.get("dna") or {}} if p.get("style") in styles.STYLES else {})


def look_of(p: dict, b: dict) -> tuple[dict | None, dict]:
    """the style and DNA a scene is made in (the film's first look when the scene names none)"""
    ls = looks_of(p)
    k = b.get("look") if b.get("look") in ls else next(iter(ls), "")
    return styles.STYLES.get(k), ls.get(k, {})


def code_system(p: dict, W: int, H: int, cap: int) -> str:
    """the scene writer's brief: the general rules, then the film's style rules and its DNA (every look's, in a mix)"""
    ls = looks_of(p)
    if len(ls) > 1:
        extra = ("\n\nMIXED STYLE: every scene is made in the LOOK its brief names: follow that look's rules and DNA for that "
                 "scene. common.tsx stays shared (label style, easing, motif), so the looks still read as one film."
                 + "".join(f"\n\nLOOK {k}:\n{styles.STYLES[k]['code']}\nITS DNA: {styles.dna_text(d)}" for k, d in ls.items()))
    else:
        extra = "".join(f"\n\n{styles.STYLES[k]['code']}\nTHIS FILM'S DNA: {styles.dna_text(d)}" for k, d in ls.items())
    return CODE_SYSTEM.format(kit=kit_docs(), W=W, H=H, cap=cap) + extra


def kit_docs() -> str:
    """The kit, as the agent reads it: its whole source (short, and the comments are its manual)."""
    return open(os.path.join(HERE, "src", "argon", "kit.tsx")).read()


# ---------------- the film ----------------
class Film:
    def __init__(self, slug: str):
        self.slug = slug
        self.dir = os.path.join(HERE, "public", "argon", slug)
        self.gen = os.path.join(HERE, "src", "argon", "gen", slug)
        os.makedirs(self.dir, exist_ok=True)
        os.makedirs(self.gen, exist_ok=True)

    def p(self, *a) -> str:
        return os.path.join(self.dir, *a)

    def read(self, name, default=None):
        return json.load(open(self.p(name))) if os.path.exists(self.p(name)) else default

    def write(self, name, data) -> None:
        json.dump(data, open(self.p(name), "w"), ensure_ascii=False, indent=1)

    def say(self, msg: str) -> None:
        line = f"[{time.strftime('%H:%M:%S')}] {msg}"
        print(line, flush=True)
        open(self.p("argon.log"), "a").write(line + "\n")

    def event(self, kind: str, text: str, scene: int | None = None, **kw) -> None:
        """One thing the agent did, for the editor to animate (live/events.jsonl): a picture found, a scene written..."""
        os.makedirs(self.p("live"), exist_ok=True)
        with _lock:
            open(self.p("live", "events.jsonl"), "a").write(json.dumps({"t": round(time.time(), 2), "kind": kind, "text": text, "scene": scene, **kw}, ensure_ascii=False) + "\n")

    def live(self, i: int, action: str, text: str = "", state: str = "streaming", prev: str | None = None, note: str = "") -> None:
        """What the agent is writing into scene i right now (live/scene-NN.json): the editor types it out as it streams in.
        prev: the code before a fix, so the editor can show the change as a diff."""
        os.makedirs(self.p("live"), exist_ok=True)
        path = self.p("live", f"scene-{i:02d}.json")
        before = json.load(open(path)) if os.path.exists(path) else None
        old = before if prev is None and state != "streaming" else None
        since = (before or {}).get("since") if before and before.get("state") == "streaming" else None  # when this piece of work began
        data = {"scene": i, "action": action, "state": state, "text": text, "prev": prev if prev is not None else (old or {}).get("prev"), "note": note,
                "t": round(time.time(), 2), "since": since or round(time.time(), 2)}
        tmp = path + ".tmp"
        json.dump(data, open(tmp, "w"), ensure_ascii=False)
        os.replace(tmp, path)  # whole files only: the editor never reads half a write


def plan(f: Film, topic: str, language: str, script: list[str], vertical: bool, style: str = "", looks: dict | None = None, minutes: float = 0) -> dict:
    f.say(f"Argon is planning the film on {topic}")
    f.event("planning", f"Planning the film on {topic}: the story, the look, every scene's backdrop and pictures")
    ask = (f"TOPIC: {topic}\nLANGUAGE ON SCREEN AND IN THE NARRATION: {language}"
           + (" (Roman letters, never Devanagari)" if language.lower() == "hinglish" else "")
           + f"\nFORMAT: {'vertical 9:16 reel' if vertical else '16:9 video'}\n"
           + ("NARRATION (use exactly these lines):\n" + "\n".join(script) if script else "Write the narration."))
    looks = looks or {}
    if len(looks) == 1:  # the film's style and its own DNA (no other film has this combination)
        (k, dna), = looks.items()
        ask += f"\n\n{styles.STYLES[k]['plan']}\nTHIS FILM'S DNA (unique to this film, keep it in every scene): {styles.dna_text(dna)}"
        if styles.STYLES[k].get("length") and not script and not minutes:
            ask += f"\nLENGTH (this replaces the 6-9 lines in point 2): {styles.STYLES[k]['length']}."
    elif looks:  # a mix: every scene is made in one of the looks, each with its own rules and DNA
        ask += ("\n\nMIXED STYLE: this film is made in several LOOKS. Set every beat's `look` to the id of the look that tells "
                "that moment best; keep a run of scenes in one look (a sequence) and switch looks on a turn of the story. Each "
                "scene's backdrop and pictures follow its look's rules." + "".join(
                    f"\n\nLOOK {k}:\n{styles.STYLES[k]['plan']}\nITS DNA: {styles.dna_text(d)}" for k, d in looks.items()))
    if minutes and not script:  # a long film: a real story in chapters, about five seconds a line
        n = round(minutes * 60 / 5.2)
        ask += (f"\nLENGTH (this replaces the 6-9 lines in point 2 and any style length): about {minutes:g} minutes in all, "
                f"{n - 4}-{n + 4} short spoken lines of about 5 s each. A real story told in chapters: a hook, the build-up, "
                "turns and surprises, a climax and an ending; every line moves it on, nothing repeats.")
    kit_names = sorted(set(re.findall(r"^export function ([A-Z]\w+)", kit_docs(), re.M)))
    ask += ("\n\nTHE KIT the scenes are built from (everything else is drawn by the scene writer in code). In every beat's "
            "`concept`, write a timed shot list naming the kit pieces that do each thing, e.g. '0.0 s the motif drifts; 1.2 s "
            "a number counts to 40 on \"forty\"; 2.5 s DrawPath arrow to the basket; 3.8 s a tag \"onion\"'. Something no kit "
            "piece does: say \"make:\" and describe it.\nKIT PIECES: " + ", ".join(kit_names))
    p = Plan.model_validate_json(think(ask, PLAN_SYSTEM, Plan, max_tokens=64000 if minutes else 32000)).model_dump()
    if script:
        p["lines"] = script
    p["beats"] = [b for b in p["beats"] if 0 <= b["line"] < len(p["lines"])]
    have = {b["line"] for b in p["beats"]}
    p["beats"] += [{"line": i, "beat": "definition", "concept": "Big kinetic words of the line with a supporting picture", "assets": [], "data": "", "transition": "fade"}
                   for i in range(len(p["lines"])) if i not in have]
    p["beats"].sort(key=lambda b: b["line"])
    p.update(topic=topic, language=language, vertical=vertical, style=style, dna=next(iter(looks.values()), {}), looks=looks)
    if looks:
        p["theme"]["look"] = style
        for b in p["beats"]:  # a style film's pictures come the style's way (the scene's look's): its plates and cut-outs, or real photos first
            b["look"] = b.get("look") if b.get("look") in looks else next(iter(looks))
            st = styles.STYLES[b["look"]]
            bd = b.get("backdrop") or {}
            b["backdrop"] = ({"kind": "plain", "query": ""} if st.get("backdrop") == "none" else  # a calm ground drawn in code: no plate image
                             {"kind": bd.get("kind") if st.get("backdrop") == "photo" and bd.get("kind") in ("photo", "map") else "paint",
                              "query": bd.get("query") or b["concept"][:200]})
            for x in b.get("assets") or []:
                x["kind"] = ("photo" if x.get("kind") != "draw" else "draw") if st.get("pictures") == "photo" else "draw"
    f.write("plan.json", p)
    f.event("plan", f"Planned {len(p['lines'])} scenes: " + ", ".join(b["beat"] for b in p["beats"]))
    f.say(f"Plan: {len(p['lines'])} lines; beats " + ", ".join(b["beat"] for b in p["beats"]) + f"; fonts {p['theme']['display']}/{p['theme']['font']}")
    if len(looks) > 1:
        f.say("Looks: " + ", ".join(f"{k} {sum(b['look'] == k for b in p['beats'])} scenes" for k in looks))
    return p


# ---------------- 2. the voice and its words ----------------
# the accent is the voice's locale (SpeechConfig.language_code, BCP-47), never words in the line: Gemini TTS reads its
# input verbatim, so "say this in an Indian accent" would be spoken. Hinglish and the Indian languages get India's own.
ACCENTS = {"hinglish": "en-IN", "indian english": "en-IN", "hindi": "hi-IN", "marathi": "mr-IN", "tamil": "ta-IN", "telugu": "te-IN"}


def accent_of(p: dict) -> str:
    """the locale the narration is voiced in: the creator's pick (job accent, e.g. "en-IN" for English said the Indian
    way), else the language's own; "" leaves it to the model"""
    return p.get("accent") or ACCENTS.get(str(p.get("language", "")).strip().lower(), "")


def voice(f: Film, p: dict, tries: int = 0) -> list[dict]:
    import pipeline as base
    from google.genai import types
    c = base.client()
    out = []
    for i, text in enumerate(p["lines"]):
        path = f.p(f"voice-{i:02d}.wav")
        if not os.path.exists(path):
            f.say(f"Voicing line {i + 1}: {text[:60]}")
            for attempt in range(6):
                try:
                    r = c.models.generate_content(model=base.TTS_MODEL, contents=text,  # only the line: any instruction here gets read aloud
                                                  config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=types.SpeechConfig(
                                                      voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")),
                                                      **({"language_code": accent} if (accent := accent_of(p)) else {}))))
                    base._wav(path, r.candidates[0].content.parts[0].inline_data.data)
                    f.event("voice", f"Voiced line {i + 1}", scene=i)
                    try:
                        import cost
                        cost.tokens(base.TTS_MODEL, r.usage_metadata)
                    except Exception:
                        pass
                    break
                except Exception as e:
                    print(f"  tts retry {attempt + 1}: {str(e)[:80]}", flush=True)
                    time.sleep(6 * (attempt + 1))
        with wave.open(path) as w:
            out.append({"audio": f"argon/{f.slug}/voice-{i:02d}.wav", "seconds": w.getnframes() / w.getframerate()})
    words = f.read("words.json")
    if words and len(words) == len(out):
        bad = [i for i, ws in enumerate(words) if not starts_like(ws, p["lines"][i])]
        if bad and tries < 2:  # the voice said something else first (an instruction read aloud): voice those lines again
            f.say(f"Lines {', '.join(str(i + 1) for i in bad)} do not start with their own words: voicing them again")
            for i in bad:
                os.remove(f.p(f"voice-{i:02d}.wav"))
            f.write("words.json", None)
            return voice(f, p, tries + 1)
    if not words or len(words) != len(out):
        f.say("Timing every word (faster-whisper)")
        from faster_whisper import WhisperModel
        m = WhisperModel("small", device="cpu", compute_type="int8")
        words = []
        for i, _ in enumerate(out):
            segs, _info = m.transcribe(samples16k(f.p(f"voice-{i:02d}.wav")), word_timestamps=True, vad_filter=False, beam_size=1)
            words.append([{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for s in segs for w in (s.words or [])])
        f.write("words.json", words)
    for i, v in enumerate(out):
        v["words"] = script_words(words[i], p["lines"][i])
    f.write("voice.json", out)
    return out


def script_words(heard: list[dict], line: str) -> list[dict]:
    """The script's own words on whisper's timings: whisper mishears ("freeze" as "-free") and splits hyphens
    ("non", "-essential"), but the captions must show what the line says."""
    import difflib
    norm = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
    said = line.split()
    if not heard or not said:
        return heard
    a, b = [norm(w["w"]) for w in heard], [norm(w) for w in said]
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal":
            out += [{**heard[i1 + k], "w": said[j1 + k]} for k in range(i2 - i1)]
        elif j2 > j1:  # replaced or missing words: the script's words share the heard span (or the gap) evenly
            s = heard[i1]["s"] if i2 > i1 else (out[-1]["e"] if out else 0.0)
            e = heard[i2 - 1]["e"] if i2 > i1 else (heard[i1]["s"] if i1 < len(heard) else s + 0.3 * (j2 - j1))
            step = max(e - s, 0.05 * (j2 - j1)) / (j2 - j1)
            out += [{"w": said[j1 + k], "s": round(s + k * step, 2), "e": round(s + (k + 1) * step, 2)} for k in range(j2 - j1)]
    return out


def starts_like(words: list[dict], line: str) -> bool:
    norm = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
    said = [norm(w["w"]) for w in words[:3]]
    want = [norm(w) for w in line.split()[:3]]
    return sum(a == b for a, b in zip(said, want)) >= 2


def samples16k(path: str):
    """A wav as 16 kHz mono float samples (faster-whisper's own decoder breaks on this PyAV version)."""
    import numpy as np
    with wave.open(path) as w:
        rate, ch, width = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16 if width == 2 else np.int32).astype(np.float32)
    raw = raw.reshape(-1, ch).mean(axis=1) / (32768.0 if width == 2 else 2147483648.0)
    n = int(len(raw) * 16000 / rate)
    return np.interp(np.linspace(0, len(raw) - 1, n), np.arange(len(raw)), raw).astype(np.float32)


# ---------------- 3. the pictures ----------------
def assets(f: Film, p: dict) -> dict:
    import motionfx
    from app.llm import get_llm
    llm = get_llm()
    a = a0 = motionfx.Assets(f"argon/{f.slug}", llm)
    a.style = (("hand-painted anime film illustration, soft natural light, detailed; " if p["theme"].get("look") == "anime" else "photorealistic, natural light, true to life; ")
               + p["theme"].get("art_style", ""))
    ls = looks_of(p)
    st, dna = look_of(p, {})  # the film's first look: whether it is a style film, and how its puppets are drawn
    if st:  # the style's cut-outs, all in this film's DNA
        a.style = st["cutout"].format(**dna)
    drawers = {}  # in a mix, each look draws its cut-outs its own way (one shared cache)
    for k, d in ls.items():
        drawers[k] = motionfx.Assets(f"argon/{f.slug}", llm)
        drawers[k].cache, drawers[k].style = a.cache, styles.STYLES[k]["cutout"].format(**d)
    found = f.read("assets.json", {})
    shape = "9:16 vertical" if p["vertical"] else "16:9"
    # a style whose plate ignores the scene (kinetic, whiteboard) sends the same prompt for every scene: ask Google once
    # and every scene shares the picture (eight identical asks only spend the quota), starting from one this film has
    plates, plate_locks, plates_guard = {}, {}, threading.Lock()
    if len(ls) == 1 and st and st.get("backdrop") != "photo" and "{what}" not in st.get("plate", "{what}"):
        made = next((v for k, v in found.items() if k.endswith(":backdrop") and v and os.path.exists(os.path.join(HERE, "public", v))), None)
        if made:
            plates[st["plate"].format(what="", **dna) + f" A full-screen {shape} frame."] = made

    def plate(prompt: str, line: int) -> str | None:
        with plates_guard:
            lock = plate_locks.setdefault(prompt, threading.Lock())
        with lock:  # the first scene asks; the others with the same prompt wait for its picture
            if not plates.get(prompt):
                png = llm.generate_image(prompt)
                if png:
                    name = f"backdrop-{line:02d}.png"
                    open(f.p(name), "wb").write(png)
                    plates[prompt] = f"argon/{f.slug}/{name}"
            return plates.get(prompt)

    def backdrop(b):
        key, bd = f"{b['line']}:backdrop", b.get("backdrop") or {}
        if found.get(key) and os.path.exists(os.path.join(HERE, "public", found[key])):
            return key, found[key]
        kind, q = bd.get("kind", "plain"), (bd.get("query") or "").strip()
        st, dna = look_of(p, b)
        if st and q:  # a style film: the scene's plate, made in this film's DNA (a real photo first where the style uses them)
            if st.get("backdrop") == "photo":
                try:
                    path = a.photo(q if kind != "map" else f"{q} map")
                    if path:
                        return key, path
                except Exception as e:
                    print(f"  backdrop photo {q} failed: {str(e)[:90]}", flush=True)
            try:
                path = plate(st["plate"].format(what=q, **dna) + f" A full-screen {shape} frame.", b["line"])
                if path:
                    return key, path
            except Exception as e:
                print(f"  plate {q} failed: {str(e)[:90]}", flush=True)
            return key, None
        if kind == "plain" or not q:
            return key, None
        path = None
        look = p["theme"].get("look", "real")
        try:
            if kind == "photo" or (kind == "paint" and look == "real"):  # the real look finds a real photo of the world first
                path = a.photo(q)
            elif kind == "map":
                path = a.photo(f"{q} map")
        except Exception as e:
            print(f"  backdrop {q} ({kind}) failed: {str(e)[:90]}", flush=True)
        if not path:  # no real photo or map found: paint the scene's world
            try:
                what = f"an illustrated map of {q} and its neighbourhood, clear borders and rivers, no labels" if kind == "map" else q
                style = (f"a hand-painted anime film background: soft natural light, rich painterly detail, atmospheric depth, {p['theme'].get('art_style', '')}"
                         if look == "anime" else f"a realistic documentary photograph, natural light, true colours and true scale, {p['theme'].get('art_style', '')}")
                png = llm.generate_image(f"{what}. A full-screen {shape} frame, {style}. Physically accurate (real positions, angles, scale, light direction). "
                                         "Leave calm areas for labels; absolutely no text, words, letters or logos.")
                if png:
                    name = f"backdrop-{b['line']:02d}.png"
                    open(f.p(name), "wb").write(png)
                    path = f"argon/{f.slug}/{name}"
            except Exception as e:
                print(f"  backdrop paint {q} failed: {str(e)[:90]}", flush=True)
        return key, path

    f.event("planning", "Finding each scene's backdrop and pictures")
    f.say("Finding each scene's backdrop (maps and real photos where a place is named, else painted)")
    with concurrent.futures.ThreadPoolExecutor(3) as ex:
        for key, path in ex.map(backdrop, p["beats"]):
            found[key] = path
            line = int(key.split(":")[0])
            bd = p["beats"][line].get("backdrop") or {}
            f.event("backdrop", f"Backdrop for scene {line + 1}: {bd.get('query', '')}" if path else f"Scene {line + 1} keeps the theme's ground",
                    scene=line, url=path or "", what=bd.get("kind", ""))
    want = [(b["line"], x) for b in p["beats"] for x in b.get("assets") or []]
    f.say(f"Finding {len(want)} pictures (Wikimedia photos checked by a vision model, animated emoji, icons, drawn)")

    def one(item):
        line, x = item
        key = f"{line}:{x['name']}"
        if key in found and found[key] and os.path.exists(os.path.join(HERE, "public", found[key])):
            return key, found[key]
        kind, q = x["kind"], x["query"]
        b = p["beats"][line]
        st, _ = look_of(p, b)
        a = drawers.get(b.get("look") or "", drawers.get(next(iter(ls), ""), a0))

        def emoji():
            words_ = [w for w in re.findall(r"[a-z]+", q.lower()) if len(w) > 2]
            hit = next((slug for c, slug in motionfx.noto_animated() if any(w in slug.split("-") for w in words_)), None)
            return a.fetch_icon(f"noto-anim:{hit}") if hit else None
        order = {"photo": [lambda: a.photo(q), lambda: a.icon(q)], "emoji": [emoji, lambda: a.icon(q)],
                 "draw": [lambda: a.draw(q), lambda: a.icon(q)]}.get(kind, [lambda: a.icon(q), lambda: a.draw(q)])
        if st:  # a style film never mixes in icons or emoji: its own cut-outs, or real photos where the style uses them
            order = [lambda: a.photo(q), lambda: a.draw(q)] if st.get("pictures") == "photo" and kind == "photo" else [lambda: a.draw(q), lambda: a.draw(q + ", simple")]
        for way in order:  # each source in turn: one that fails (a rate limit, nothing found) hands over to the next
            try:
                path = way()
                if path:
                    f.event("picture", f"Found {x['name']} ({kind}): {q}", scene=line, url=path, name=x["name"], what=kind)
                    return key, path
            except Exception as e:
                print(f"  asset {q} ({kind}) failed: {str(e)[:90]}", flush=True)
        return key, None

    with concurrent.futures.ThreadPoolExecutor(6) as ex:
        for key, path in ex.map(one, want):
            found[key] = path
    if st and p.get("characters"):  # the story's people: jointed paper puppets, in this film's look
        import puppet

        def make(c):
            out = f.p("puppets", c["name"])
            if os.path.exists(os.path.join(out, "rig.json")):
                return c["name"], True
            os.makedirs(out, exist_ok=True)
            for attempt in range(3):  # a kit that comes out with missing pieces is drawn again
                try:
                    f.say(f"Making {c['name']} as a jointed paper puppet (try {attempt + 1})")
                    png = puppet.make_kit(llm, c["who"], a.style)
                    if not png:
                        continue
                    open(os.path.join(out, "kit.png"), "wb").write(png)
                    puppet.rig(png, out)
                    f.event("picture", f"Made {c['name']} as a jointed puppet", url=f"argon/{f.slug}/puppets/{c['name']}/torso0.png", name=c["name"], what="puppet")
                    return c["name"], True
                except Exception as e:
                    print(f"  puppet {c['name']} failed: {str(e)[:120]}", flush=True)
            return c["name"], False
        with concurrent.futures.ThreadPoolExecutor(2) as ex:
            made = dict(ex.map(make, p["characters"]))
        f.say(f"Puppets rigged: {', '.join(k for k, v in made.items() if v) or 'none'}")
    a.save()
    f.write("assets.json", found)
    # only the pictures that were asked for: a plain backdrop is drawn in code and never asks for an image
    plain = {f"{b['line']}:backdrop" for b in p["beats"] if (b.get("backdrop") or {}).get("kind", "plain") == "plain"}
    asked = {k: v for k, v in found.items() if k not in plain}
    got = sum(1 for v in asked.values() if v)
    f.say(f"Pictures found: {got} of {len(asked)}")
    if st and asked and got < len(asked) * 0.4:  # a style film without its pictures would be drawn in code: stop and say so
        raise RuntimeError(f"Only {got} of {len(asked)} pictures could be made (the image service failed); the film stops here so it is not drawn without them")
    return found


# ---------------- 4. the code ----------------
def stage(p: dict) -> tuple[int, int, int]:
    return (1080, 1920, 380) if p["vertical"] else (1920, 1080, 150)


def scene_brief(f: Film, p: dict, i: int, v: dict, found: dict) -> str:
    """one scene's part of the film's brief: its world, its line and words, its beat, its pictures"""
    b = p["beats"][i]
    files = []
    for x in b.get("assets") or []:
        path = found.get(f"{i}:{x['name']}")
        if path:
            name = os.path.basename(path)
            what = ("an animated emoji (Lottie): <Sticker>" if name.endswith(".json") else "a ONE-COLOUR icon: <Sticker color=...>, never <Photo>" if ".mono." in name
                    else "a colour icon: <Sticker>" if name.endswith(".svg") else "a drawn picture on a transparent ground: <Sticker> or <Photo frame='none'>"
                    if name.startswith("draw-") else "a real photograph: <Photo> with callouts")
            files.append(f"- {os.path.relpath(os.path.join(HERE, 'public', path), f.dir)}  — {what}; it shows: {x['query']}" + ("" if x["kind"] in name or name.startswith(("photo", "draw")) else " (no photo was found, this is the fallback)"))
    words = " ".join(f"{w['w']}@{w['s']}" for w in v["words"])
    nxt = p["beats"][i + 1]["beat"] if i + 1 < len(p["beats"]) else "the end"
    bd, bdp = b.get("backdrop") or {}, found.get(f"{i}:backdrop")
    back = (f"BACKDROP (this scene's own world, full screen): <Stage backdrop={{s.asset(\"{os.path.relpath(os.path.join(HERE, 'public', bdp), f.dir)}\")}}> — "
            f"a {'real photo' if 'photo-' in os.path.basename(bdp) and bd.get('kind') == 'photo' else 'map' if bd.get('kind') == 'map' else 'painted scene'} of: {bd.get('query')}. "
            "Build ON it: pins, callouts, arrows and labels over the right parts of it." if bdp else
            "BACKDROP: none; use the theme's ground (<Stage>) and build the scene's world from shapes and pictures.")
    look = f"LOOK: {b.get('look')} (this scene follows LOOK {b.get('look')}'s rules)\n" if len(looks_of(p)) > 1 else ""
    return (f"SCENE {i + 1} of {len(p['lines'])} (file scene-{i:02d}.tsx), {v['seconds']:.2f} s. The next scene is a {nxt}.\n{back}\n{look}"
            f"THE LINE: {p['lines'][i]}\nWORDS WITH THEIR TIMES (s): {words}\n"
            f"BEAT: {b['beat']}\nCONCEPT: {b['concept']}\nPHYSICS: {b.get('physics') or '-'}\n"
            f"LABELS (the only words allowed on screen): {', '.join(b.get('labels') or []) or 'none'}\nDATA: {b.get('data') or '-'}\n"
            f"MOTIONS (library pieces that make this scene's objects act): {', '.join(b.get('motions') or []) or 'none'}\n"
            f"FILES (use with s.asset(name)):\n" + ("\n".join(files) or "- none: build it from shapes, paths, words and the kit"))


def film_brief(f: Film, p: dict, vo: list[dict], found: dict, idx: list[int]) -> str:
    """the film at once: what holds for every scene, the whole story when only a chapter is written, then each scene's part"""
    n = len(p["lines"])
    head = (f"FILM: {p['title']} ({p['topic']})\nTHEME (the layout system; keep it consistent): {json.dumps(p['theme'], ensure_ascii=False)}\n"
            f"LOOK: {p['theme'].get('look', 'real')}\nSCENES: {n} in the film"
            + "".join(f"\nCHARACTER {c['name']}: {c['who']} -> <Puppet rig={{RIGS.{c['name']}}} ... /> (a jointed puppet: it walks/runs from->to, waves, cheers, stands; import {{ RIGS }} from \"./rigs\")"
                      for c in p.get("characters") or [] if os.path.exists(f.p("puppets", c["name"], "rig.json"))))
    story = "" if len(idx) == n else "\n\nTHE WHOLE STORY (every line, so this chapter flows from and into its neighbours):\n" + "\n".join(f"{i + 1}. {l}" for i, l in enumerate(p["lines"]))
    return head + story + "\n\n" + "\n\n".join(scene_brief(f, p, i, vo[i], found) for i in idx) + library_brief(p, idx)


@functools.cache
def library() -> tuple[dict, ...]:
    """The motion library's motions and blocks (layers 1 and 2), as catalog.py wrote them into lib/catalog.ts."""
    s = open(os.path.join(HERE, "src", "argon", "lib", "catalog.ts")).read()
    a = s.index("export const LIBRARY: LibEntry[] = ") + len("export const LIBRARY: LibEntry[] = ")
    return tuple(e for e in json.loads(s[a:s.index("];\n", a) + 1]) if e["layer"] in (1, 2))


_HOMES: dict[str, list[str]] = {}


def lib_homes() -> dict[str, list[str]]:
    """every name the motion library exports, and the lib file(s) that export it, read from the library's own code"""
    if not _HOMES:
        d = os.path.join(HERE, "src", "argon", "lib")
        for name in sorted(os.listdir(d)):
            if name.endswith((".tsx", ".ts")):
                for m in re.finditer(r"^export (?:const|function|class|type|interface|enum) (\w+)", open(os.path.join(d, name)).read(), re.M):
                    _HOMES.setdefault(m.group(1), []).append(name.rsplit(".", 1)[0])
    return _HOMES


_LIB_IMPORT = re.compile(r'import\s*(type\s*)?\{([^}]*)\}\s*from\s*"((?:\.\./)+(?:argon/)?lib/)([\w.-]+)";?')


def lib_imports(src: str, prefix: str, missing: set[str] = frozenset()) -> tuple[str, list[str]]:
    """The model decides which library pieces a film uses; the code decides where each comes from. Every name imported
    from a lib file that does not export it moves to the file that does, and every library name in `missing` (tsc's
    'Cannot find name') is imported, so a film never fails on an import path. prefix: the lib folder as the film's
    file reaches it ("../../lib/" from an argon scene, "../../../argon/lib/" from a oneshot film). Returns the source and
    what it changed."""
    homes, moved, have, said = lib_homes(), {}, set(), []

    def regroup(m: re.Match) -> str:
        typ, pre, file = m.group(1) or "", m.group(3), m.group(4)
        keep = []
        for raw in (n.strip() for n in m.group(2).split(",")):
            base = raw.removeprefix("type ").split(" as ")[0].strip()
            if not base:
                continue
            files = homes.get(base, [])
            if files and file not in files:
                moved.setdefault((pre, files[0], typ), []).append(raw)
                said.append(f"{base}: {file} -> {files[0]}")
            else:
                keep.append(raw)
                have.add(base)
        return f'import {typ}{{ {", ".join(keep)} }} from "{pre}{file}";' if keep else ""

    src = _LIB_IMPORT.sub(regroup, src)
    for n in sorted(missing - have):
        if homes.get(n):
            moved.setdefault((prefix, homes[n][0], ""), []).append(n)
            said.append(f"{n}: imported from {homes[n][0]}")
    fresh = {k: [n for n in dict.fromkeys(ns) if n.removeprefix("type ").split(" as ")[0].strip() not in have] for k, ns in moved.items()}
    adds = [f'import {typ}{{ {", ".join(ns)} }} from "{pre}{file}";' for (pre, file, typ), ns in sorted(fresh.items()) if ns]
    if adds:
        lines = src.split("\n")
        last = max((i for i, l in enumerate(lines) if l.startswith("import ")), default=-1)
        lines[last + 1:last + 1] = adds
        src = "\n".join(lines)
    return src, said


def library_brief(p: dict, idx: list[int]) -> str:
    """Only the library pieces these scenes picked, each with its exact props and import path: looked up, never guessed."""
    picked = {m for i in idx for m in p["beats"][i].get("motions") or []}
    got = [e for e in library() if e["name"] in picked]
    return "" if not got else "\n\nTHE LIBRARY PIECES these scenes picked (props exactly as typed):\n" + "\n".join(
        f"- {e['name']}({e['props']}): {e['does']}. import {{ {e['name']} }} from \"../../lib/{e['file'][:-4]}\""
        + (f". parts: {', '.join(e['parts'])}" if e["parts"] else "") for e in got)


class Pick(BaseModel):
    line: int
    motions: list[str] = Field(default_factory=list, description="0-2 exact names from THE MOTION LIBRARY")


class Picks(BaseModel):
    scenes: list[Pick]


PICK_SYSTEM = """You pick, for every scene of a film, 0-2 pieces from THE MOTION LIBRARY that make the scene's OBJECTS act
the way its line and concept say (a tube bursts: Shatter; a crowd gathers: Assemble; a route is followed: Travel).
Pick by what the piece DOES, exact names only. Nothing that only decorates; the same piece in at most a few scenes.
None fits: an empty list. Reply {"scenes": [{"line": 0, "motions": ["..."]}, ...]}."""


def pick_motions(f: Film, p: dict) -> None:
    """Looks up, for every scene, the library pieces that make its objects act (one short ask on the library's list of
    what each piece does), so the writer is handed their exact props instead of guessing them."""
    names = {e["name"] for e in library()}
    menu = "\n".join(f"{e['name']}: {e['does']}" for e in library())
    ask = "THE MOTION LIBRARY:\n" + menu + "\n\nTHE SCENES:\n" + "\n".join(
        f"{b['line']}. {p['lines'][b['line']]} | {b['concept']}" for b in p["beats"])
    picks = {s.get("line"): s.get("motions") or [] for s in json.loads(think(ask, PICK_SYSTEM, Picks, max_tokens=8000)).get("scenes", [])}
    for b in p["beats"]:
        b["motions"] = [m for m in picks.get(b["line"], []) if m in names][:2]
    f.write("plan.json", p)
    used = [m for b in p["beats"] for m in b["motions"]]
    f.say(f"Looked up the motion library: {len(used)} pieces for {sum(1 for b in p['beats'] if b['motions'])} scenes ({', '.join(sorted(set(used))[:12])})")


FILE_LINE = re.compile(r"^// FILE: (common\.tsx|scene-\d\d\.tsx)\s*$", re.M)


def split_files(text: str) -> dict[str, str]:
    """the one answer cut into its files at their `// FILE: name` lines"""
    parts = FILE_LINE.split(text)
    return {parts[k]: strip_fences(parts[k + 1]) for k in range(1, len(parts) - 1, 2)}


CHAPTER = 12  # scenes per writing ask: a long film is written chapter by chapter, every chapter on the same common.tsx


def code(f: Film, p: dict, vo: list[dict], found: dict, force: bool = False) -> None:
    """The whole film in one ask: the plan with its timings and the film's own small library (common.tsx), then every
    scene as a short timeline. A long film: the first chapter writes common.tsx, the others (three at a time) build on it.
    What is already written is kept unless force (a rewrite with the newest rules)."""
    W, H, cap = stage(p)
    n = len(p["lines"])
    paths = [os.path.join(f.gen, "common.tsx")] + [os.path.join(f.gen, f"scene-{i:02d}.tsx") for i in range(n)]
    if not force and all(os.path.exists(x) and open(x).read().strip() for x in paths):
        film_files(f, p, vo)
        return
    if any("motions" not in b for b in p["beats"]):  # a plan made before the library lookup: look it up now
        pick_motions(f, p)
    chapters = [list(range(k, min(n, k + CHAPTER))) for k in range(0, n, CHAPTER)]
    if len(chapters) > 1 and len(chapters[-1]) < 4:  # a short last chapter joins the one before
        last = chapters.pop()  # popped first: `chapters[-2] += chapters.pop()` writes back into the wrong slot
        chapters[-1] += last
    f.say(f"Argon is writing the whole film in one pass ({n} scenes)" if len(chapters) == 1 else
          f"Argon is writing the whole film: {n} scenes in {len(chapters)} chapters, all on one common.tsx")
    f.event("chapters", f"Writing the whole film: {n} scenes" + (f" in {len(chapters)} chapters" if len(chapters) > 1 else " in one pass"))
    system = code_system(p, W, H, cap)
    began, wrote = set(), set()  # the editor is told when each scene starts and ends, as the old one-scene-at-a-time writing did

    def begin(i: int) -> None:
        if i not in began:
            began.add(i)
            f.event("writing", f"Writing scene {i + 1} ({p['beats'][i]['beat']})", scene=i)

    def finish(i: int, src: str) -> None:
        if i not in wrote:
            wrote.add(i)
            f.live(i, "Wrote the scene", src, state="done", prev="")
            f.event("wrote", f"Wrote scene {i + 1}: {len(src.splitlines())} lines", scene=i)
    os.makedirs(f.p("live"), exist_ok=True)

    def waiting(k: int, why: str, secs: int) -> None:
        f.say(f"{why}: trying again in {secs} s (try {k} of {TRIES})")
        f.event("waiting", f"{why}, trying again in {secs} s (try {k} of {TRIES})")

    def chapter(c: int, idx: list[int], common: str) -> dict[str, str]:
        last = [0.0]

        def stream(text: str) -> None:  # the scene being written streams to its card; one the answer has moved past is done
            if time.time() - last[0] < 1.0:
                return
            last[0] = time.time()
            scenes = [(int(name[6:8]), src) for name, src in split_files(text).items() if name.startswith("scene-") and int(name[6:8]) in idx]
            for k, (i, src) in enumerate(scenes):
                begin(i)
                if k < len(scenes) - 1:
                    finish(i, src)
                else:
                    f.live(i, "Writing the scene", src, prev="")
        files_ = f"scene-{idx[0]:02d}.tsx to scene-{idx[-1]:02d}.tsx"
        ask = film_brief(f, p, vo, found, idx) + (f"\n\nWRITE: common.tsx, then {files_}." if not common else
                                                  f"\n\nWRITE ONLY {files_}. common.tsx IS ALREADY WRITTEN (below): import from it, never write it "
                                                  f"again, and carry its look and motif on.\n\ncommon.tsx:\n{common}")
        if len(chapters) > 1:
            f.say(f"Writing chapter {c + 1} of {len(chapters)}: scenes {idx[0] + 1}-{idx[-1] + 1}")
        answer = think(ask, system, max_tokens=64000, live=stream, waiting=waiting)
        open(f.p("live", f"film-answer-{c + 1:02d}.txt"), "w").write(answer)
        got = split_files(answer)
        for i in idx:  # the chapter is written: its scenes are done now, not when every chapter is
            begin(i)
            finish(i, got.get(f"scene-{i:02d}.tsx", ""))
        return got

    files = chapter(0, chapters[0], "")
    common = files.get("common.tsx", "")
    if len(chapters) > 1:
        with concurrent.futures.ThreadPoolExecutor(3) as ex:
            for got in ex.map(lambda c: chapter(c, chapters[c], common), range(1, len(chapters))):
                files.update({k: v for k, v in got.items() if k != "common.tsx"})
    open(paths[0], "w").write(ensure_imports(common) if common else "")
    exports = common_exports(common)
    missing = []
    for i in range(n):
        src = files.get(f"scene-{i:02d}.tsx", "")
        if not src.strip():
            missing.append(i + 1)
        src = ensure_imports(src, exports) if src.strip() else ""
        open(paths[i + 1], "w").write(src)
        f.live(i, "Wrote the scene", src, state="done", prev="")  # (its "wrote" went to the editor when its chapter got to it)
    f.say(f"Wrote the film{' in one pass' if len(chapters) == 1 else f' in {len(chapters)} chapters'}: common.tsx ({len(common.splitlines())} lines) and {n - len(missing)} scenes"
          + (f"; scenes {', '.join(map(str, missing))} came back empty and are written in the check" if missing else ""))
    claude_style(f, p)
    film_files(f, p, vo)


CLAUDE_INDEX = os.path.join(HERE, "public", "argon", "_claude.json")


def claude_style(f: Film, p: dict) -> None:
    """Note that this film was written the Claude way (one plan, its own small library in common.tsx, the kit only): in
    its plan, and in the list the app's Motion page shows as its own section."""
    p["writer"] = "claude-style"
    f.write("plan.json", p)
    with _lock:
        films = (json.load(open(CLAUDE_INDEX)) if os.path.exists(CLAUDE_INDEX) else {}).get("films", [])
        if f.slug not in films:
            json.dump({"films": [f.slug] + films}, open(CLAUDE_INDEX, "w"), indent=1)


def common_exports(src: str) -> set[str]:
    return set(re.findall(r"^export (?:function|const|type|interface|class) (\w+)", src, re.M))


def strip_fences(src: str) -> str:
    m = re.search(r"```(?:tsx|typescript|ts|jsx)?\s*\n(.*?)```", src, re.S)
    return (m.group(1) if m else src).strip() + "\n"


REMOTION = ["AbsoluteFill", "Img", "interpolate", "spring", "staticFile", "useCurrentFrame", "useVideoConfig", "Easing", "Sequence"]
REACT = ["useMemo", "useState", "useEffect", "Fragment"]


def ensure_imports(src: str, common: set[str] | None = None) -> str:
    """The kit, Remotion and React names the code uses but forgot to import (models often skip the import lines);
    common: the names the film's common.tsx exports (for a scene file). A motion-library piece is imported from its own
    file when the code uses it as a tag (<Shatter ...>)."""
    kit = set(re.findall(r"^export (?:function|const|type) (\w+)", open(os.path.join(HERE, "src", "argon", "kit.tsx")).read(), re.M))
    have = set(re.findall(r"import\s*(?:type\s*)?\{([^}]*)\}", src))
    have = {x.strip().split(" as ")[-1] for grp in have for x in grp.split(",") if x.strip()}
    have |= set(re.findall(r"\b(?:function|const|let|class|type|interface)\s+(\w+)", src))  # its own names are never imported
    used = lambda names: sorted(n for n in names if n not in have and re.search(rf"\b{n}\b", src))
    head = []
    for names, mod in ((common or set(), "./common"), (kit - (common or set()), "../../kit"), (REMOTION, "remotion"), (REACT, "react"), ({"RIGS"}, "./rigs")):
        u = used(names)
        if u:
            head.append(f'import {{ {", ".join(u)} }} from "{mod}";')
    lib: dict[str, list[str]] = {}
    for e in library():
        n = e["name"]
        if n not in have and n not in kit and n not in (common or set()) and re.search(rf"<{n}\b", src):
            lib.setdefault(f"../../lib/{e['file'][:-4]}", []).append(n)
    head += [f'import {{ {", ".join(sorted(ns))} }} from "{mod}";' for mod, ns in sorted(lib.items())]
    return ("\n".join(head) + "\n\n" + src) if head else src


def film_files(f: Film, p: dict, vo: list[dict]) -> None:
    """film.tsx (every scene in order, its voice, its words, the transitions, the captions) and its own entry point."""
    W, H, _ = stage(p)
    n = len(p["lines"])
    imports = "\n".join(f'import S{i} from "./scene-{i:02d}";' for i in range(n))
    theme = {k: p["theme"][k] for k in ("bg", "ink", "accent", "accent2", "paper", "muted", "font", "display", "radius", "outline", "shadow")}
    scenes = [{"audio": v["audio"], "seconds": v["seconds"], "words": v["words"], "text": p["lines"][i], "transition": p["beats"][i].get("transition") or "fade"} for i, v in enumerate(vo)]
    open(os.path.join(f.gen, "film.tsx"), "w").write(f'''/* written by video/argon.py: the scenes Argon designed, in order, with their voice, words and transitions */
import {{ Composition }} from "remotion";
import {{ ArgonFilm, filmFrames, type FilmScene }} from "../../film";
import type {{ Theme }} from "../../kit";
{imports}

const SCENES = [{", ".join(f"S{i}" for i in range(n))}];
const THEME: Theme = {json.dumps(theme, ensure_ascii=False)};
const DATA: FilmScene[] = {json.dumps(scenes, ensure_ascii=False)};

export const Root = () => (
  <>
    <Composition id="ArgonFilm" component={{() => <ArgonFilm scenes={{SCENES}} data={{DATA}} theme={{THEME}} dir="argon/{f.slug}" />}} durationInFrames={{filmFrames(DATA)}} fps={{30}} width={{{W}}} height={{{H}}} />
    {{SCENES.map((_, i) => <Composition key={{i}} id={{`Scene${{i}}`}} component={{() => <ArgonFilm scenes={{SCENES}} data={{DATA}} theme={{THEME}} dir="argon/{f.slug}" only={{i}} />}} durationInFrames={{filmFrames([DATA[i]])}} fps={{30}} width={{{W}}} height={{{H}}} />)}}
  </>
);
''')
    rigs = {}
    for c in p.get("characters") or []:
        rp = f.p("puppets", c["name"], "rig.json")
        if os.path.exists(rp):
            rigs[c["name"]] = {"dir": f"argon/{f.slug}/puppets/{c['name']}", **json.load(open(rp))}
    open(os.path.join(f.gen, "rigs.ts"), "w").write('/* written by video/argon.py: the story\'s characters as jointed paper puppets (video/puppet.py) */\n'
                                                   'import type { Rig } from "../../kit";\n\nexport const RIGS: Record<string, Rig> = '
                                                   + json.dumps(rigs, ensure_ascii=False) + ";\n")
    open(os.path.join(f.gen, "entry.ts"), "w").write('import { registerRoot } from "remotion";\nimport { Root } from "./film";\n\nregisterRoot(Root);\n')


# ---------------- 5. compile, look, fix ----------------
def compile_errors(f: Film) -> dict[int, str]:
    """tsc on the film's files only: the errors of each scene (and of common.tsx, under -1)."""
    cfg = os.path.join(f.gen, "tsconfig.json")
    json.dump({"extends": os.path.relpath(os.path.join(HERE, "tsconfig.json"), f.gen), "include": ["./*.tsx", "./*.ts"]}, open(cfg, "w"))
    tsx = [n for n in sorted(os.listdir(f.gen)) if n.endswith(".tsx")]

    def place(missing: dict[str, set[str]]) -> None:  # library imports come from the file that exports them, by code
        for name in tsx:
            path = os.path.join(f.gen, name)
            src = open(path).read()
            new, said = lib_imports(src, "../../lib/", missing.get(name, set()))
            if new != src:
                open(path, "w").write(new)
                f.say(f"Placed the library import(s) of {name} by code: {'; '.join(said)}")
    place({})
    r = subprocess.run([NPX, "tsc", "--noEmit", "-p", cfg], cwd=HERE, capture_output=True, text=True)
    unimported: dict[str, set[str]] = {}
    for line in (r.stdout + r.stderr).splitlines():
        m = re.search(r"((?:scene-\d+|common)\.tsx)\(\d+,\d+\): error TS2304: Cannot find name '(\w+)'", line)
        if m and m.group(2) in lib_homes():
            unimported.setdefault(m.group(1), set()).add(m.group(2))
    if unimported:
        place(unimported)
        r = subprocess.run([NPX, "tsc", "--noEmit", "-p", cfg], cwd=HERE, capture_output=True, text=True)
    errs: dict[int, str] = {}
    for name in sorted(os.listdir(f.gen)):  # an empty scene compiles but renders nothing: it is an error too
        m = re.match(r"scene-(\d+)\.tsx$", name)
        if m and "export default" not in open(os.path.join(f.gen, name)).read():
            errs[int(m.group(1))] = "the file has no `export default function Scene()` (it is empty or incomplete)\n"
    plan_ = f.read("plan.json") or {}
    for i, line_text in enumerate(plan_.get("lines") or []):  # a number on screen that the narration never says is invented
        path = os.path.join(f.gen, f"scene-{i:02d}.tsx")
        if os.path.exists(path):
            b = next((x for x in plan_.get("beats") or [] if x.get("line") == i), {})  # the plan's own figures for the scene count as said
            bad = invented_numbers(open(path).read(), " ".join([line_text, str(b.get("data") or ""), *(b.get("labels") or [])]))
            if bad:
                errs[i] = errs.get(i, "") + f"numbers on screen that the line never says (invented facts; remove them or use only the line's own words): {', '.join(bad)}\n"
            loose = loose_words(open(path).read(), b.get("labels") or [])
            if loose and look_of(plan_, b)[0] is not styles.STYLES.get("kinetic"):  # kinetic type is made of words
                errs[i] = errs.get(i, "") + ("words on screen that are not the scene's labels, or that say something twice (the screen shows "
                                             "pictures that act; the captions carry the narration): remove them, or show the thing happening "
                                             f"to a picture instead. The only words allowed: {', '.join(b.get('labels') or []) or 'none'}. "
                                             f"Found: {'; '.join(loose)}\n")
            bdp = (f.read("assets.json") or {}).get(f"{i}:backdrop")
            if bdp and os.path.basename(bdp) not in open(path).read():  # the scene's world (its map, its photo) was made but never shown
                errs[i] = errs.get(i, "") + (f"the scene never shows its BACKDROP picture: put it on the stage as the scene's world, "
                                             f"<Stage backdrop={{s.asset(\"{os.path.relpath(os.path.join(HERE, 'public', bdp), f.dir)}\")}}> "
                                             "(or a full-screen <KenBurns src=...>), and build the scene ON it\n")
            rods = sticks(open(path).read())
            if rods:
                errs[i] = errs.get(i, "") + ("the scene draws a visible stick/rod/dowel holding something up (a 'puppet stick'): remove every one; "
                                             f"things stand on the floor, hang, float or rise from behind the set. Found: {'; '.join(rods)}\n")
    for line in (r.stdout + r.stderr).splitlines():
        m = re.search(r"(?:scene-(\d+)|common)\.tsx\((\d+),(\d+)\): (error .*)", line)
        if m:
            k = int(m.group(1)) if m.group(1) else -1
            errs[k] = errs.get(k, "") + f"line {m.group(2)}: {m.group(4)}\n"
    return errs


def sticks(src: str) -> list[str]:
    """a visible stick or rod holding a thing up (a puppet stick): it reads as a pole between a character's legs"""
    hits = []
    for n, l in enumerate(src.splitlines(), 1):
        if re.search(r"\bstick=\{\s*[1-9]", l) or re.search(r"\b(stick|sticks|dowel|rod|rods|skewer)\b", l, re.I) and not re.search(r"\bSticker\b", l):
            hits.append(f"line {n}: {l.strip()[:90]}")
    return hits[:6]


def loose_words(src: str, labels: list[str]) -> list[str]:
    """Words a scene puts on screen beyond its labels (headers, data sheets, stamps, sentences), and words or numbers it
    shows twice (a label that repeats its counter)."""
    texts = re.findall(r">([^<>{}=;()&|?]*[A-Za-z]{2}[^<>{}=;()&|?]*)<", src)
    texts += re.findall(r"\b(?:text|label|title|caption|heading|subtitle|name|sub|subtext|note|hint|detail|desc)=\{?\s*[\"'`]([^\"'`]*[A-Za-z][^\"'`]*)[\"'`]", src)
    counted = set(re.findall(r"<Counter[^>]*?\bto=\{\s*([\d.]+)\s*\}", src, re.S))
    allowed = [l.lower() for l in labels]
    out, seen = [], set()
    for t in (" ".join(t.split()) for t in texts):
        k = t.lower()
        if not t or re.fullmatch(r"[a-z_$][\w$]*", t):  # code between a > and a <, not words on screen
            continue
        if k in seen:
            out.append(f'"{t}" (twice)')
        elif not any(k in l or l in k for l in allowed):
            out.append(f'"{t}"')
        elif any(n.replace(",", "") in counted for n in re.findall(r"\d[\d,]*\.?\d*", t)):
            out.append(f'"{t}" (repeats its counter)')
        seen.add(k)
    return out[:8]


UNITS = {w: n for n, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
                                      "fifteen sixteen seventeen eighteen nineteen".split())}
TENS = {w: 10 * n for n, w in enumerate("_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()) if w != "_"}
SCALES = {"hundred": 100, "thousand": 1000, "million": 10 ** 6, "billion": 10 ** 9, "trillion": 10 ** 12, "quadrillion": 10 ** 15}


def spoken_numbers(line: str) -> set[str]:
    """Every number a line says, as digits: the narration is written out for the voice ("nineteen sixty-five", "two
    thousand and eight", "fifty billion", "one point zero one"), the screen shows 1965, 2008, 50 billion, 1.01."""
    out = {n.replace(",", "").rstrip(".") for n in re.findall(r"\d[\d,]*\.?\d*", line)}
    words = re.findall(r"[a-z]+", line.lower().replace("-", " "))
    k = 0
    while k < len(words):
        if words[k] not in UNITS and words[k] not in TENS:
            k += 1
            continue
        groups, total, cur, small = [], 0, 0, []  # small: the run's numbers under 100, for a year said in two halves
        while k < len(words) and (words[k] in UNITS or words[k] in TENS or words[k] in SCALES or words[k] == "and"):
            w = words[k]
            if w in UNITS or w in TENS:
                v = UNITS.get(w, TENS.get(w, 0))
                if 0 < cur < 100 and (w in TENS or v >= 10 or cur % 10):  # "nineteen | sixty", "twenty | twelve": a new half
                    small.append(cur)
                    cur = 0
                cur += v
            elif w == "hundred":
                cur = max(cur, 1) * 100
                groups.append(total + cur)
            elif w in SCALES:
                total, cur = total + max(cur, 1) * SCALES[w], 0
                groups.append(total)
            k += 1
        value = total + cur
        out |= {str(value), *map(str, groups), *map(str, small)}
        if small and len(small) == 1 and cur < 100:  # a year in two halves: nineteen sixty-five, twenty twelve
            out.add(str(small[0] * 100 + cur))
        for g in groups + [value]:  # "fifty billion" is also shown as 50 (billion)
            for s in sorted(SCALES.values(), reverse=True):
                if g >= s and g % s == 0:
                    out.add(str(g // s))
                    break
        if k + 1 < len(words) and words[k] == "point":  # one point zero one
            digits = []
            k += 1
            while k < len(words) and words[k] in UNITS and UNITS[words[k]] < 10:
                digits.append(str(UNITS[words[k]]))
                k += 1
            out.add(f"{value}.{''.join(digits)}")
    return out


def invented_numbers(src: str, line: str) -> list[str]:
    """Figures the scene puts on screen (Counter values, JSX text, text/label/title/value props) that its line never says."""
    said = spoken_numbers(line)
    texts = re.findall(r">\s*([^<>{}\n]*[A-Za-z][^<>{}\n]*)\s*<", src)
    texts += re.findall(r"\b(?:text|label|title|value|prefix|suffix|display)=\{?\s*[\"'`]([^\"'`]*)[\"'`]", src)
    shown = re.findall(r"<Counter[^>]*?\bto=\{\s*([\d.]+)\s*\}", src, re.S)
    shown += [n for t in texts for n in re.findall(r"\d[\d,]*\.?\d*", t)]
    return sorted({n.rstrip(",.") for n in shown if n.replace(",", "").rstrip(".") not in said and (n.rstrip(",.").lstrip("0") or "0") not in ("0", "1", "2", "3", "4", "5", "6", "7", "8", "9")})  # step numbers are fine


def file_of(i: int) -> str:
    return "common.tsx" if i < 0 else f"scene-{i:02d}.tsx"


def numbered(src: str) -> str:
    return "\n".join(f"{k:4d}| {l}" for k, l in enumerate(src.splitlines(), 1)) or "(empty)"


def apply_patches(f: Film, answer: str) -> int:
    """<<<FIND file ... === ... >>> and <<<FILE file ... >>> from the fixer's answer, applied; returns how many took."""
    done = 0
    unnumber = lambda s: re.sub(r"^\s*\d+\| ?", "", s, flags=re.M) if all(re.match(r"^\s*\d+\|", l) for l in s.splitlines() if l.strip()) else s
    for name, find, repl in re.findall(r"<<<FIND ((?:common|scene-\d\d)\.tsx)\n(.*?)\n===\n(.*?)\n?>>>", answer, re.S):
        path = os.path.join(f.gen, name)
        src, find = (open(path).read() if os.path.exists(path) else ""), unnumber(find)
        if find and find in src:
            open(path, "w").write(src.replace(find, unnumber(repl), 1))
            done += 1
    for name, whole in re.findall(r"<<<FILE ((?:common|scene-\d\d)\.tsx)\n(.*?)\n?>>>", answer, re.S):
        open(os.path.join(f.gen, name), "w").write(strip_fences(unnumber(whole)))
        done += 1
    exports = common_exports(open(os.path.join(f.gen, "common.tsx")).read()) if os.path.exists(os.path.join(f.gen, "common.tsx")) else set()
    for name in os.listdir(f.gen):  # a patch may use a name it did not import
        if re.match(r"(scene-\d\d|common)\.tsx$", name):
            path = os.path.join(f.gen, name)
            src = open(path).read()  # read first: open(path, "w") empties the file
            if src.strip():
                open(path, "w").write(ensure_imports(src, None if name == "common.tsx" else exports))
    return done


def patch(f: Film, p: dict, problems: dict[int, str], what: str) -> None:
    """One ask for every broken file at once: its problems and its numbered code (and common.tsx); the answer is small
    patches, never a rewrite."""
    common = open(os.path.join(f.gen, "common.tsx")).read() if os.path.exists(os.path.join(f.gen, "common.tsx")) else ""
    parts, olds = [], {}
    for i, err in problems.items():
        path = os.path.join(f.gen, file_of(i))
        olds[i] = open(path).read() if os.path.exists(path) else ""
        if i >= 0:
            parts.append(f"FILE {file_of(i)} (scene {i + 1}: {p['lines'][i]})\nPROBLEMS:\n{err[:3000]}\nCODE:\n{numbered(olds[i])}")
            f.event("error", f"Scene {i + 1}: {what}: {err.strip().splitlines()[0][:160] if err.strip() else ''}", scene=i)
            f.live(i, f"Fixing {what}", "", prev=olds[i], note=err[:600])
    ref = f"FILE common.tsx\nPROBLEMS:\n{problems[-1][:3000]}\nCODE:\n" if -1 in problems else "common.tsx (for reference; patch it too if the problem is there):\n"
    ask = ref + numbered(common) + "\n\n" + "\n\n".join(parts)
    system = FIX_SYSTEM + ("\nImport only from the kit, remotion, react, ./rigs, ./common and the library pieces listed; a missing piece is written in common.tsx."
                           f"\n\nTHE KIT:\n{kit_docs()}" + library_brief(p, [i for i in problems if i >= 0]))
    answer = think(ask, system, max_tokens=16000)
    took = apply_patches(f, answer)
    f.say(f"  {took} patch(es) applied")
    for i in problems:
        if i >= 0:
            new = open(os.path.join(f.gen, file_of(i))).read()
            f.live(i, f"Fixed {what}" if new != olds[i] else f"Could not patch {what}", new, state="done", prev=olds[i], note=problems[i][:600])
            if new != olds[i]:
                f.event("fixed", f"Patched scene {i + 1}", scene=i)


def fix_compile(f: Film, p: dict, rounds: int = 3) -> None:
    """Compile the film; whatever does not compile (or breaks a rule) goes back in one ask for small patches."""
    for r in range(rounds):
        errs = compile_errors(f)
        if not errs:
            f.say("Every scene compiles")
            return
        count = lambda *signs: sum(1 for v in errs.values() if any(x in v for x in signs))
        found = {"type errors": count("error TS", "export default"), "extra words": count("not the scene's labels"),
                 "invented numbers": count("invented facts"), "unused backdrop": count("BACKDROP picture"), "puppet sticks": count("puppet stick")}
        f.say(f"Fixing {len(errs)} files ({', '.join(f'{n} with {k}' for k, n in found.items() if n)}): "
              f"{', '.join(file_of(i) for i in sorted(errs))}: small patches (round {r + 1})")
        keys = sorted(errs)
        for k in range(0, len(keys), 10):  # ten files to an ask at most (a long film can have many); one after another, as they may patch common.tsx
            patch(f, p, {i: errs[i] for i in keys[k:k + 10]}, "a compile error")
    for i in compile_errors(f):  # still broken: the simplest honest scene, so the film always renders
        if i < 0:
            continue  # common.tsx: the scenes that still break on it are the ones replaced below
        f.say(f"Scene {i + 1} still does not compile: using a plain kinetic-words scene")
        path = os.path.join(f.gen, f"scene-{i:02d}.tsx")
        old = open(path).read() if os.path.exists(path) else ""
        open(path, "w").write(SAFE_SCENE)
        f.live(i, "Gave up: plain words scene", SAFE_SCENE, state="done", prev=old)
        f.event("error", f"Scene {i + 1} still does not compile: a plain words scene stands in", scene=i)


SAFE_SCENE = '''import { Appear, At, Loop, Stage, Words, useScene } from "../../kit";

export default function Scene() {
  const s = useScene();
  const text = s.words.map((w) => w.w).join(" ");
  return (
    <Stage>
      <At x={s.W * 0.1} y={s.H * 0.3} w={s.W * 0.8}><Loop kind="float"><Words text={text.split(" ").slice(0, 8).join(" ")} at={0.2} size={96} sync /></Loop></At>
      <At x={s.W * 0.42} y={s.H * 0.62} w={s.W * 0.16} h={18}><Appear at={0.6} from="scale"><div style={{ height: 18, borderRadius: 9, background: s.theme.accent }} /></Appear></At>
    </Stage>
  );
}
'''


def draw_frames(f: Film, jobs: list[dict], out: str, start, done) -> tuple[int, str]:
    """argon-stills.mjs on the film, read as it goes: start(i) when scene i begins, done(i, error) when it ends (error "" if
    it drew), so the editor follows it scene by scene instead of seeing nothing for minutes. Returns its exit code and output."""
    os.makedirs(out, exist_ok=True)
    spec = os.path.join(out, "jobs.json")
    json.dump(jobs, open(spec, "w"))
    proc = subprocess.Popen([NODE, "argon-stills.mjs", os.path.join(f.gen, "entry.ts"), spec, out], cwd=HERE,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    order = [int(j["id"][5:]) for j in jobs]
    k, tail = 0, []
    if order:
        start(order[0])
    for line in proc.stdout:
        tail = (tail + [line])[-40:]
        m = re.match(r"(STILL|FAILED) Scene(\d+) ?(.*)", line.strip())
        if m:
            done(int(m.group(2)), m.group(3) if m.group(1) == "FAILED" else "")
            k += 1
            if k < len(order):
                start(order[k])
    return proc.wait(), "".join(tail)


def stills(f: Film, p: dict, scenes: list[int]) -> dict[int, list[str]]:
    """Three stills of each scene (early, middle, end), one bundle for all."""
    out = os.path.join(f.dir, "stills")
    vo = f.read("voice.json")
    jobs = [{"id": f"Scene{i}", "frames": [int(fr * (vo[i]["seconds"] + 0.4) * 30) for fr in (0.3, 0.65, 0.97)], "prefix": f"{i:02d}"} for i in scenes]
    f.say(f"Drawing previews of {len(scenes)} scenes")

    def start(i: int) -> None:
        f.live(i, "Drawing its preview", "", prev=None)

    def done(i: int, err: str) -> None:
        f.live(i, "Preview drawn" if not err else "Could not draw its preview", "", state="done", prev=None)
        if not err:
            f.event("drawn", f"Drew the preview of scene {i + 1}", scene=i, url=f"argon/{f.slug}/stills/{i:02d}-1.png")
    code_, out_text = draw_frames(f, jobs, out, start, done)
    if code_ != 0:
        f.say(f"Stills failed: {out_text[-400:]}")
    else:
        f.event("stills", f"Drew stills of scenes {', '.join(str(i + 1) for i in scenes)}")
    return {i: [os.path.join(out, f"{i:02d}-{k}.png") for k in range(3) if os.path.exists(os.path.join(out, f"{i:02d}-{k}.png"))] for i in scenes}


def runtime_errors(f: Film, p: dict) -> dict[int, str]:
    """Draw every scene at small size every ~0.7 s: a scene that compiles can still crash while it plays (a word passed
    where a number belongs...). Those crashes, by scene. The film is only rendered once this is empty."""
    vo = f.read("voice.json")
    jobs = []
    for i in range(len(p["lines"])):
        n = int((vo[i]["seconds"] + 0.4) * 30)
        jobs.append({"id": f"Scene{i}", "frames": sorted({min(n - 1, k) for k in range(0, n, 21)} | {n - 1}), "prefix": f"{i:02d}", "scale": 0.2})
    errs = {}

    def start(i: int) -> None:
        f.live(i, "Playing it through", "", prev=None)
        f.event("looking", f"Playing scene {i + 1} through", scene=i)

    def done(i: int, err: str) -> None:
        if err:
            errs[i] = err
            f.live(i, "Crashes while playing", "", state="done", prev=None, note=err[:600])
            f.event("error", f"Scene {i + 1} crashes while playing: {err[:140]}", scene=i)
        else:
            f.live(i, "Plays through", "", state="done", prev=None)
            f.event("played", f"Scene {i + 1} plays through", scene=i)
    code_, out_text = draw_frames(f, jobs, os.path.join(f.dir, "check"), start, done)
    if code_ != 0 and not errs:
        f.say(f"The play-through check could not run: {out_text[-300:]}")
    return errs


def fix_runtime(f: Film, p: dict, rounds: int = 2) -> None:
    """Play every scene through; the crashes go back in one ask for small patches, then a plain scene stands in."""
    f.say("Playing every scene through to catch crashes")
    f.event("stills", "Playing every scene through to catch crashes")
    for r in range(rounds):
        errs = runtime_errors(f, p)
        if not errs:
            f.say("Every scene plays through")
            return
        f.say(f"Scenes {', '.join(str(i + 1) for i in errs)} crash while playing: small patches")
        keys = sorted(errs)
        for k in range(0, len(keys), 10):
            patch(f, p, {i: f"IT COMPILES BUT CRASHES WHILE PLAYING: {errs[i][:2000]}" for i in keys[k:k + 10]}, "a crash")
        fix_compile(f, p)
    for i in runtime_errors(f, p):  # still crashing: the plain scene, so the film always renders
        f.say(f"Scene {i + 1} still crashes: using a plain kinetic-words scene")
        path = os.path.join(f.gen, f"scene-{i:02d}.tsx")
        old = open(path).read()
        open(path, "w").write(SAFE_SCENE)
        f.live(i, "Gave up: plain words scene", SAFE_SCENE, state="done", prev=old)
        f.event("error", f"Scene {i + 1} still crashes: a plain words scene stands in", scene=i)


def render(f: Film) -> str:
    target = os.path.join(HERE, "out", f"argon-{f.slug}.mp4")
    f.say("Rendering the film")
    f.event("render", "Rendering the film")
    proc = subprocess.Popen([NPX, "remotion", "render", os.path.join(f.gen, "entry.ts"), "ArgonFilm", target, "--concurrency=6", "--crf=20"], cwd=HERE,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    tail, last = [], 0.0
    os.makedirs(f.p("live"), exist_ok=True)
    for out_line in proc.stdout:  # the progress goes to the editor (live/render.json)
        tail = (tail + [out_line])[-40:]
        m = re.search(r"(Rendered|Encoded)\s+(\d+)/(\d+)", out_line)
        if m and time.time() - last > 0.5:
            last = time.time()
            json.dump({"stage": m.group(1).lower(), "done": int(m.group(2)), "total": int(m.group(3)), "t": round(last, 2)}, open(f.p("live", "render.json"), "w"))
    if proc.wait() != 0:
        raise RuntimeError(f"render failed: {''.join(tail)[-800:]}")
    json.dump({"stage": "done", "done": 1, "total": 1, "t": round(time.time(), 2)}, open(f.p("live", "render.json"), "w"))
    f.event("done", "The film is rendered")
    f.say(f"DONE {target}")
    return target


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True)
    ap.add_argument("--topic", default="")
    ap.add_argument("--language", default="English")
    ap.add_argument("--script", default="", help="a text file with one narration line per line (else Argon writes it)")
    ap.add_argument("--vertical", action="store_true")
    ap.add_argument("--steps", default="all")
    ap.add_argument("--style", default="", help="a motion style from video/styles.py (paper...), or a mix of them: documentary+map+horror")
    ap.add_argument("--minutes", type=float, default=0, help="a long film of about this many minutes (else the style's length)")
    a = ap.parse_args()
    f = Film(a.slug)
    global LOG_PATH
    LOG_PATH = f.p("argon.log")
    import cost
    cost.start(f.dir)
    steps = {"plan", "voice", "assets", "code", "check", "render"} if a.steps == "all" else set(a.steps.split(","))
    p = f.read("plan.json")
    if "plan" in steps or not p:
        script = [l.strip() for l in open(a.script).read().splitlines() if l.strip()] if a.script else []
        cost.stage("plan")
        looks = {k: styles.pick_dna(k, a.slug) for k in a.style.split("+") if k in styles.STYLES}  # one style, or a mix: "documentary+map"
        for k, dna in looks.items():
            styles.remember(k, a.slug, dna)
            f.say(f"Style {styles.STYLES[k]['name']}, this film's own DNA: {styles.dna_text(dna)}")
        p = plan(f, a.topic, a.language, script, a.vertical, a.style, looks, a.minutes)
    cost.stage("voice")
    vo = voice(f, p) if ("voice" in steps or not f.read("voice.json")) else f.read("voice.json")
    cost.stage("pictures")
    found = assets(f, p) if ("assets" in steps or f.read("assets.json") is None) else f.read("assets.json")
    cost.stage("code")
    if "code" in steps or "recode" in steps:  # recode: the whole film again (new rules, a better kit), keeping the plan, voice and pictures
        if "recode" in steps:
            f.say("Writing the whole film again with the newest rules")
        code(f, p, vo, found, force="recode" in steps)
    film_files(f, p, vo)
    cost.stage("check")
    if "check" in steps or "code" in steps or "recode" in steps:
        fix_compile(f, p)
    if "render" in steps:
        fix_runtime(f, p)  # a crash mid-scene would stop the render: every scene is played through first
        stills(f, p, list(range(len(p["lines"]))))  # the editor's pictures of each scene (no model call): you are the reviewer
        try:
            render(f)
        except RuntimeError as e:  # one more round on what the full render hit, then render again
            f.say(f"The render stopped: {str(e)[-200:]}")
            fix_runtime(f, p)
            render(f)


if __name__ == "__main__":
    main()
