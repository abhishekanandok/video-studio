"""One-shot films (an experiment, separate from argon.py): the model plans once and writes the whole film as ONE file.

The idea: think once (a per-second shot list for every scene), write a small design system and helper library at the top
of the file, then each scene as a short timeline of helper calls; everything drawn in code (no image calls); compile
with tsc and, on an error, send only that error and ask for a small patch. No screenshot review loop: you review.

It takes an existing argon film's voice and word times, so the two films can be compared with the same narration,
captions and timing (it plays through the unchanged ArgonFilm player). Nothing in the argon pipeline changes.

  src/oneshot/gen/<slug>/   film.tsx (the model's one file), brief.ts, root.tsx, entry.ts
  public/oneshot/<slug>/    report.json (calls, tokens, cost, seconds, lines, fix rounds), cost.json, run.log, raw-*.txt,
                            film.tsx.txt (the code, for the app's page)
  public/oneshot/index.json every experiment, for the app's list (/app/motion/oneshot)
  out/oneshot-<slug>.mp4

Run from backend/:  .venv/bin/python ../video/oneshot.py --from <argon slug> [--no-render]
                    .venv/bin/python ../video/oneshot.py --publish   (refresh the app's files, no model call)
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "backend"))
sys.path.insert(0, HERE)

import argon  # noqa: E402  (its model access: think(), the Argon model with the fallback)
import cost  # noqa: E402
import looks as lookmod  # noqa: E402
import storyboard  # noqa: E402
import styles  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

PAD = 0.4  # ArgonFilm holds each scene this long after its voice ends (src/argon/film.tsx)
FIX_ROUNDS = 3
PUBLIC = os.path.join(HERE, "public", "oneshot")
LOG_PATH = ""  # the experiment's run.log (the app shows it while the film is made)

SYSTEM = """You make short explainer videos as code: ONE TypeScript React file for Remotion that IS the whole visual film.
You get the whole brief at once and answer once, with the complete file. There is no second pass and no reviewer but
the compiler, so it must compile and run the first time.

HOW YOU WORK
1. Plan before you write, as a comment block at the very top of the file: for every scene, its beat (hook, explanation,
   turn, ending), then a per-second shot list ("0.0 background; 0.4 title slides in; 1.4 counter counts to 37 on the
   word '37'; 3.0 arrow draws; dur-0.5 everything leaves"). Put key moments ON the words given with their times.
2. One visual system for the whole film, defined once at the top: the colours given (3-5 of them), the two fonts given,
   one corner radius, one shadow, one easing. Never invent other colours or fonts in a scene.
3. A small library next, written once and used everywhere (5-10 helpers): an easing, appear(t, at, dur) giving 0..1,
   clamp, stagger, and pieces such as Title, Words, Counter, Card, Arrow, Bar, Line chart, Icon-like SVG drawings.
   This is the trick: the rest of the file is short and consistent because scenes only call these.
4. Each scene is then just a timeline: 10-40 lines saying what, where and at which second. No new animation code in a
   scene, only helper calls (a small custom SVG drawing for that scene is fine).
5. Everything visual is drawn in code: shapes, cards, charts, arrows, SVG paths written by hand for simple drawings
   (coin, sun, house, person), gradients, a subtle grain or noise made with SVG/CSS, shadows, blur. No images, no URLs.
6. Motion principles everywhere: ease out on entrances, ease in on exits, nothing at constant speed; items in a list
   arrive 0.1-0.2 s apart; a small overshoot-and-settle on landing; hold 1-2 s after things arrive so they can be read;
   clear the scene in its last 0.4-0.6 s (fade, slide or wipe) so the next one starts clean; carry something over
   between scenes (the same colour, an object, a direction of motion).
7. Flat motion graphics: text, shapes, colour and movement. Quality comes from timing, layout and consistency, not
   complexity. Big, legible type; generous margins; one idea per scene.

THE FILE CONTRACT (the player that plays your scenes is fixed and already written)
- Imports ONLY from "react", "remotion" and "./brief". From "./brief": FONTS (FONTS.display and FONTS.body are CSS
  font-family strings, already loaded).
- export const SCENES: React.FC[] = [Scene1, Scene2, ...]: exactly the number of scenes in the brief, in order. Each
  takes no props. Each is played alone for its duration in its own <Sequence>, so useCurrentFrame() is 0 at the scene's
  start: const t = useCurrentFrame() / fps (seconds). Read width/height and fps from useVideoConfig().
- Every scene paints its own full background (an <AbsoluteFill> with the film's background) first.
- The player draws the captions and plays the voice: keep the bottom CAPTION_SAFE pixels free of important content.

CODE THAT RUNS THE FIRST TIME
- TypeScript strict mode: type every function parameter and every component's props; no implicit any.
- Hooks only at the top of a component (never in loops, conditions or helpers called in loops). No state, effects,
  timers or refs: everything is a pure function of t.
- Clamp every progress to 0..1; never divide by zero; nothing renders before its time (opacity 0 or null).
- Deterministic: no Math.random or Date; for scattered things use a small seeded function of the index.
- Every element in a .map() has a key. Every number you render is finite and formatted (toFixed / toLocaleString).
- Use only standard APIs you know well: interpolate (with extrapolateLeft/Right "clamp"), spring, Easing, SVG, CSS.

ANSWER with the complete file in one ```tsx block and nothing else."""

SYSTEM_DRAWN = """You make short explainer videos as code: ONE TypeScript React file for Remotion that IS the whole visual film.
You get the whole brief at once and answer once, with the complete file. There is no second pass and no reviewer but
the compiler, so it must compile and run the first time. Everything is DRAWN IN CODE: no images, no URLs.

HOW YOU WORK
1. Plan before you write, as a comment block at the very top of the file: the film's ground, then for every scene its
   look, the objects and people in it, and a per-second shot list on the words given with their times ("0.0 the rack
   slides in; 1.2 its lights go dark row by row on 'shut'; 2.6 a coin travels from phone.screen to bank.slot").
2. ONE GROUND for the whole film, drawn in code and never repainted per scene: exactly the GROUND the brief names
   (when it names none: what suits the topic). It may shift a little (zoom, a colour) between parts of the film.
3. FOUR LOOKS that all live on that ground; give each scene the one that tells it best:
   diagram   = boxes, nodes and arrows; objects connected; things travel between them (a coin, a packet, a document).
   paper     = card cut-outs: layered shapes with soft cast shadows, folds, hinges, pop-ups.
   collage   = torn paper scraps with tape and a halftone texture, hand-drawn marker circles and arrows.
   kinetic   = words as OBJECTS: they stack, get crossed out, bend, fall, push each other. Never a caption.
4. OBJECT RIGS: every made thing the line names (a phone, server rack, laptop, robot arm, truck, factory, coin, desk,
   chart, office, conveyor) is a component you draw in SVG, made of NAMED PARTS, with STATE props that are numbers
   driven by time (on, open, fill, broken, level, progress) and ANCHORS (exported points such as screen, slot, hand)
   so other things travel from one object's anchor to another's. The motion comes from the objects' own parts acting
   on the words: a screen lights up, a stamp presses down, a robot arm swings and picks, a desk empties.
5. SKINS: draw each object once; its look's skin (fill, stroke, shadow, texture, defined once at the top) paints it
   as diagram, paper, collage or kinetic.
6. PEOPLE are simple code puppets: a circle head, a rounded body, limbs as rounded rects rotating at shoulder, elbow,
   hip and knee; poses as functions of t: stand, walk (legs and arms swing with a sine), type at a desk, point, wave,
   slump, cheer. Two dots for eyes at most. People walk, sit, look at things and react; they are the story's actors.
7. A small library first, written once and used everywhere: easing, appear(t, at, dur) giving 0..1, clamp, stagger,
   the skins, the person puppet, and the object rigs. Each scene is then a short timeline of these.
8. TEXT: at most one or two short labels per scene, attached to what they name, or kinetic words that ARE the scene's
   object. No headers, titles on every scene, data panels, stamps or sentences; the captions carry the narration.
   Nothing overlaps: give every element its own place; a new thing lands in empty space.
9. Motion principles everywhere: ease out on entrances, ease in on exits, nothing at constant speed; items arrive
   0.1-0.2 s apart; a small overshoot-and-settle on landing; hold 1-2 s so things can be read; clear the scene in its
   last 0.4-0.6 s; carry something over between scenes (an object, a person, a direction of motion). The scene GROWS
   from its objects: each new thing builds on what is already there.

THE FILE CONTRACT (the player that plays your scenes is fixed and already written)
- Imports ONLY from "react", "remotion" and "./brief". From "./brief": FONTS (FONTS.display and FONTS.body are CSS
  font-family strings, already loaded).
- export const SCENES: React.FC[] = [Scene1, Scene2, ...]: exactly the number of scenes in the brief, in order. Each
  takes no props. Each is played alone for its duration in its own <Sequence>, so useCurrentFrame() is 0 at the scene's
  start: const t = useCurrentFrame() / fps (seconds). Read width/height and fps from useVideoConfig().
- Every scene paints the film's ground first (an <AbsoluteFill>), then puts EVERYTHING ELSE inside a second
  <AbsoluteFill> (or a wrapper with position: "relative"). A plain <div> after an absolutely positioned ground is
  painted UNDER it, and the scene shows only the ground.
- The player draws the captions and plays the voice: keep the bottom CAPTION_SAFE pixels free of important content.

CODE THAT RUNS THE FIRST TIME
- TypeScript strict mode: type every function parameter and every component's props; no implicit any.
- Hooks only at the top of a component (never in loops, conditions or helpers called in loops). No state, effects,
  timers or refs: everything is a pure function of t.
- Clamp every progress to 0..1; never divide by zero; nothing renders before its time (opacity 0 or null).
- Deterministic: no Math.random or Date; for scattered things use a small seeded function of the index.
- Every element in a .map() has a key. Every number you render is finite and formatted (toFixed / toLocaleString).
- Use only standard APIs you know well: interpolate (with extrapolateLeft/Right "clamp"), spring, Easing, SVG, CSS.

ANSWER with the complete file in one ```tsx block and nothing else."""

# ---------------- the designed method: a design pass decides WHAT is on screen, the writer decides only HOW ----------------
class Actor(BaseModel):
    name: str = Field(description="short id the code uses, e.g. 'rack', 'worker', 'crane'")
    kind: str = Field(description="object | person | chart | words")
    draw: str = Field(description="how it is drawn in code, with its named PARTS (e.g. 'a dockside crane: tower, boom, trolley, cable, hook')")
    states: list[str] = Field(default_factory=list, description="the state props its parts move through (on, open, broken, level, progress, pose)")


class Move(BaseModel):
    word: str = Field(description="the exact word of the line it happens on")
    actor: str
    verb: str = Field(description="the verb of the line this motion shows (takes, grows, connects, breaks, climbs, shrinks...)")
    motion: str = Field(description="what the actor's PARTS do, concretely ('the boom swings over the ship; the hook drops and lifts a box')")


class Link(BaseModel):
    source: str
    target: str
    meaning: str = Field(description="what travels between them or how the line connects them (money, goods, data, causes, replaces)")


class Chart(BaseModel):
    kind: str = Field(description="none | bar | line | dots (one dot per unit) | stack | gauge")
    values: str = Field("", description="the numbers with their labels, ONLY from the line")
    highlight: str = Field("", description="the one value the line is about: it lights up on its word")


class Callout(BaseModel):
    text: str = Field(description="1-4 words: what the thing IS or what changed ('Ganga', 'flood plain', '+40 km'), from the line or its facts")
    target: str = Field(description="the actor it points at")
    part: str = Field("", description="the actor's part it points at (the river's 'bank', the map's 'Bihar'), or empty for the whole actor")
    word: str = Field(description="the exact word of the line it appears on")


class Place(BaseModel):
    name: str = Field(description="the place's real name as a map labels it (Patna, Kosi river, Nepal)")
    lon: float
    lat: float


class FlowStep(BaseModel):
    label: str = Field(description="1-2 words")
    icon: str = Field(description="ONE emoji that pictures the step")
    word: str = Field(description="the exact word of the line it appears on")


class KWord(BaseModel):
    text: str = Field(description="1-2 words, shown huge")
    word: str = Field(description="the exact word of the line it slams in on")
    effect: str = Field("slam", description="slam | stack | cross (crossed out) | stretch | fall")


class CardSpec(BaseModel):
    title: str = Field("", description="1-4 words, the card's main text")
    sub: str = Field("", description="0-5 words under it, or empty")
    icon: str = Field("", description="ONE emoji on the card, or empty")
    number: float | None = Field(None, description="a number from the line that counts up, or null")
    prefix: str = Field("", description="before the number, e.g. '$' or '₹'")
    suffix: str = Field("", description="after the number, e.g. '%', ' GW', ' million'")
    word: str = Field("", description="the exact word of the line the card lands on")


class PhotoSpec(BaseModel):
    query: str = Field("", description="Wikimedia Commons search words for a REAL photograph, specific and in English ('Reserve Bank of India building', 'vegetable market India')")
    shows: str = Field("", description="what the photo must clearly show, for checking it ('a busy Indian vegetable market')")
    caption: str = Field("", description="1-3 words on a tag pointing at the subject")
    word: str = Field("", description="the exact word of the line the caption appears on")


class SpreadItem(BaseModel):
    label: str = Field(description="1-4 words: a step, a bar's / slice's / period's name, a month, or a headline line")
    text: str = Field("", description="what is printed on it as said: a stamp ('₹500'), a bar's value ('₹5 lakh'), a ratio ('4.2×'); empty = from value")
    note: str = Field("", description="steps only: 2-5 words under the step, or empty")
    value: float | None = Field(None, description="its number (bar height, slice size, a combo's first series), from the line or the notes")
    value2: float | None = Field(None, description="combo only: the second series' number")
    word: str = Field("", description="the exact word of the line it appears on")
    effect: str = Field("", description="headline: bar | plain | cross | accent; steps: cross (struck out); number bars: ghost (a value still to come)")
    word2: str = Field("", description="steps with effect cross: the exact word it is struck out on")


class SpreadNumber(BaseModel):
    to: float = Field(description="the number, as a plain number (120000, 12, 3.8)")
    prefix: str = Field("", description="before it: '₹', '$'")
    suffix: str = Field("", description="after it: '%', ' lakh', ' GB', '×'")
    decimals: int = 0
    label: str = Field("", description="2-5 words printed under it in small caps ('you actually put in')")
    note: str = Field("", description="0-8 words printed after it ('≈ ₹5 lakh after 20 years', 'Only ₹1.2 lakh came from you.')")
    word: str = Field("", description="the exact word it starts counting on")
    note_word: str = Field("", description="the exact word the note appears on")


class SpreadBoard(BaseModel):
    title: list[str] = Field(default_factory=list, description="1-3 short CAPS lines printed top left of the dark board ('WHAT ₹500', 'A MONTH', 'BECOMES')")
    tag: list[str] = Field(default_factory=list, description="1-2 tiny CAPS lines top right ('12%', 'A YEAR')")
    foot: str = Field("", description="footer, two CAPS lines split by '/' ('AN ILLUSTRATION/NOT A PROMISE')")


class SpreadToken(BaseModel):
    text: str = Field(description="1-2 words on the travelling disc ('₹500', 'PIN', 'packet')")
    word: str = Field("", description="the exact word it appears on")
    go_word: str = Field("", description="the exact word it starts travelling on")
    arrive_word: str = Field("", description="the exact word it arrives on")


class SpreadGrid(BaseModel):
    rows: int = Field(description="rows of squares (e.g. 20 years)")
    cols: int = Field(description="columns (e.g. 12 months); rows x cols = the count the line says")
    col_labels: list[str] = Field(default_factory=list, description="one short label per column ('J','F','M'...)")
    legend: str = Field("", description="what one square is ('= one month's ₹500')")
    from_word: str = Field("", description="the exact word the squares start filling on")
    to_word: str = Field("", description="the exact word the last square fills on")


class SpreadCallout(BaseModel):
    text: str = Field("", description="combo: the big figure in the box ('4.2×'); stamps: empty")
    note: str = Field("", description="combo: 4-10 words beside it; stamps: the line printed under the title")
    word: str = Field("", description="the exact word it appears on (stamps: the word the title's first letters light up on)")


class Piece(BaseModel):
    kind: str = Field(description="title | text | kicker | watermark | number | board | glassbars | pie | legend | grid | combo | bars | steps | stamps | walk | headline")
    col: int = Field(description="left column, 0-11")
    row: int = Field(description="top row, 0-5")
    w: int = Field(description="width in columns, 1-12")
    h: int = Field(description="height in rows, 1-6")
    word: str = Field("", description="the exact word of the line it appears on")
    text: str = Field("", description="title / text / watermark: the words; board: its tag, two CAPS lines split by '/'")
    lines: list[str] = Field(default_factory=list, description="kicker: 1-3 tiny CAPS lines; board: 1-3 CAPS title lines")
    foot: str = Field("", description="board: footer, two CAPS lines split by '/'")
    number: SpreadNumber | None = Field(None, description="number: the figure")
    items: list[SpreadItem] = Field(default_factory=list, description="glassbars / pie / legend / combo / bars / steps / stamps / headline: the items")
    grid: SpreadGrid | None = Field(None, description="grid: its squares")
    token: SpreadToken | None = Field(None, description="steps: a disc travelling from step 1 to 2; walk: go_word..arrive_word draw the line")
    callout: SpreadCallout | None = Field(None, description="combo: the callout box")
    keys: list[str] = Field(default_factory=list, description="combo: the two series' names and the line's")


class SpreadSpec(BaseModel):
    layout: str = Field("", description="compose (you lay out the page from PIECES) | number | stamps | steps | grid | pie | combo | bars | walk | headline")
    pieces: list[Piece] = Field(default_factory=list, description="layout compose: the page's 2-6 pieces on the 12 x 6 grid")
    kicker: list[str] = Field(default_factory=list, description="1-3 tiny mono CAPS lines of 1-3 words framing the spread ('OVER', '20 YEARS')")
    title: str = Field("", description="a printed title, 2-6 words, or empty")
    title_word: str = Field("", description="the exact word the title appears on")
    watermark: str = Field("", description="optional: a faded giant word or number printed behind ('SIP', '12%')")
    number: SpreadNumber | None = None
    items: list[SpreadItem] = Field(default_factory=list)
    board: SpreadBoard | None = None
    token: SpreadToken | None = None
    grid: SpreadGrid | None = None
    keys: list[str] = Field(default_factory=list, description="combo: names of the two series ('You put in', 'Growth') and the line ('Total ÷ put in')")
    callout: SpreadCallout | None = None


class SceneDesign(BaseModel):
    scene: int
    idea: str = Field(description="what the viewer must understand after this line, one sentence")
    device: str = Field(description="ladder | flow | cause-effect | before-after | scale | part-whole | network | timeline | journey | compare | transform | countdown")
    look: str = Field(description="diagram | paper | collage | kinetic")
    actors: list[Actor]
    start: str = Field(description="what is on screen as the scene opens (what carries over from the scene before)")
    moves: list[Move]
    links: list[Link] = Field(default_factory=list)
    chart: Chart
    words: list[str] = Field(default_factory=list, description="0-2 words or numbers on screen, only what the picture cannot say")
    end: str = Field(description="what is different at the end, and what carries into the next scene")
    camera: str = Field("", description="hold | push in toward X | pan to X")
    callouts: list[Callout] = Field(default_factory=list, description="0-2 labels with a leader line to a part of the picture, ONLY where the viewer must know what a thing is or what changed")
    technique: str = Field("none", description="none | spotlight | lens | cutaway | trail | scale | wipe | count: one explainer technique, only when the idea needs it")
    # the comprehension contract (clear films): what a viewer must get from the pictures alone
    takeaway: str = Field("", description="the one plain sentence a first-time viewer must be able to say after this scene")
    question: str = Field("", description="a question a viewer answers from the PICTURES ALONE if the scene works ('Is the river higher or lower than the village?')")
    kind: str = Field("", description="where | how | how-much | when | compare | why-chain")
    view: str = Field("", description="map | cutaway | side-profile | comparison | timeline | diagram | cause-chain")
    focus: str = Field("", description="the ONE actor that moves in this scene; everything else is still and dimmed")
    places: list[Place] = Field(default_factory=list, description="view map only: the real places shown, with their real coordinates")
    # mix films: the kind of scene this line needs, and how it enters
    scene_kind: str = Field("", description="card | flow | map | motion | kinetic | photo")
    transition: str = Field("", description="how this scene enters: cut | slide | zoom | wipe | page | fold | rise")
    steps: list[FlowStep] = Field(default_factory=list, description="scene_kind flow only: 3-5 steps in order")
    kinetic: list[KWord] = Field(default_factory=list, description="scene_kind kinetic only: 2-4 words in order")
    card: CardSpec = Field(default_factory=CardSpec, description="scene_kind card only: what is on the card")
    photo: PhotoSpec = Field(default_factory=PhotoSpec, description="scene_kind photo only: the real photo to find")
    spread: SpreadSpec = Field(default_factory=SpreadSpec, description="print films, scene_kind spread: the printed layout and its data")


class Design(BaseModel):
    ground: str = Field(description="the film's one ground: exactly the GROUND the brief gives")
    region: str = Field("", description="when any scene is a map: the real area every map scene shows, 'west,south,east,north' in degrees")
    scenes: list[SceneDesign]


DESIGN_SYSTEM = """You are the art director of a motion-graphics explainer studio. Before anything is drawn, you design every
scene of a film from its narration: WHAT is on screen, what moves, why, and on which word. A separate animator draws
it all in code exactly as you say, so be concrete.

For every scene answer the eight questions:
1. IDEA: what must the viewer understand after this line? One sentence.
2. DEVICE: the picture that IS the idea, one of: ladder (levels taken one by one), flow (things move through steps),
   cause-effect, before-after, scale (small vs huge, many vs few), part-whole, network (who connects to whom),
   timeline, journey (a route across places), compare, transform (one thing becomes another), countdown.
3. ACTORS: the objects and people in it. Made things (machines, buildings, vehicles, phones, boxes, money, documents)
   are drawn in code with named PARTS; people are simple puppets that walk, carry, point, type, slump, cheer. Reuse
   the same actors across scenes when the story continues: the film has a cast, not a new set every line.
4. CHANGE: what is different at the end compared with the start. The scene is that change.
5. VERB -> MOTION: each verb of the line becomes one motion of an actor's parts, on the word that says it:
   takes/replaces -> it is grabbed or slides off and something else slides in; grows -> it rises from its base;
   connects/sends -> a line draws, then something travels along it; breaks/fails -> it cracks, flickers, falls;
   shrinks/cheapens -> it compresses, a pile drops; climbs -> it steps up level by level; stops -> everything freezes;
   multiplies -> copies pop out in a stagger; compares -> side by side, the bigger one grows.
6. LINKS: what is connected and in which direction (direction = what flows, or time).
7. WORDS: 0-2 words or numbers on screen, only what the picture cannot say (a year, a price, a name). Never a
   headline, a title, a sentence, a data panel, or words the narration says.
8. CARRY-OVER: what the scene starts with from the one before, and what it hands to the next.
9. CALLOUTS (0-2): where the picture alone would leave the viewer asking "what is that?" or "what changed?", a short
   label points at that exact part with a leader line, on the word that names it: "Ganga" at the river, "flood plain" at
   the water that spread, "Bihar" at the region. Never a label for what is obvious, never a sentence, never a caption.
10. TECHNIQUE (only when the idea needs it, else none): spotlight (everything dims but the one part that matters) |
   lens (a magnifier circle shows a detail up close) | cutaway (the outside slides off to show the inside) | trail (a
   moving thing leaves a dotted path, so the route is seen) | scale (a known object beside it, for size) | wipe
   (before and after, split by a moving line) | count (things counted one by one as they appear).
A CHART only when the line itself gives numbers: one comparison, the value the line is about lit up on its word.
LOOK per scene: diagram (boxes, nodes, arrows, things travelling) | paper (card cut-outs, layers, shadows) |
collage (torn scraps, tape, marker) | kinetic (the words themselves are the objects; list them in WORDS).
The film has ONE ground for every scene. Never invent facts or numbers. Reply with the design."""


def design_text(d: dict) -> str:
    """the design as the animator reads it, scene by scene"""
    out = [f"GROUND (every scene): {d['ground']}"]
    for s in d["scenes"]:
        c = s.get("chart") or {}
        out += [f"SCENE {s['scene']} DESIGN: device {s['device']}, look {s['look']}", f"  idea: {s['idea']}"]
        if s.get("scene_kind"):
            out += [f"  scene kind: {s['scene_kind']}; enters with: {s.get('transition') or 'cut'}"]
        if s.get("scene_kind") == "flow" and s.get("steps"):
            out += ["  flow chart: " + " -> ".join(f"{x['icon']} {x['label']} (on \"{x['word']}\")" for x in s["steps"])]
        if s.get("scene_kind") == "kinetic" and s.get("kinetic"):
            out += ["  big words: " + ", ".join(f"{x['text'].upper()} {x.get('effect', 'slam')} on \"{x['word']}\"" for x in s["kinetic"])]
        if s.get("scene_kind") == "card" and (s.get("card") or {}).get("title"):
            c = s["card"]
            num = f"{c.get('prefix', '')}{c['number']:g}{c.get('suffix', '')} counting up, " if c.get("number") is not None else ""
            out += [f"  paper card on \"{c.get('word', '')}\": {c.get('icon', '')} {num}\"{c['title']}\"" + (f" / \"{c['sub']}\"" if c.get("sub") else "")]
        if s.get("scene_kind") == "spread" and (sp := s.get("spread") or {}).get("layout"):
            out += [f"  printed spread: {sp['layout']}" + (f", title \"{sp['title']}\"" if sp.get("title") else "")
                    + (f", kicker {' / '.join(sp['kicker'])}" if sp.get("kicker") else "")]
            if n := sp.get("number"):
                out += [f"    number {n.get('prefix', '')}{n['to']:g}{n.get('suffix', '')} counting on \"{n.get('word', '')}\": {n.get('label', '')}" + (f"; then \"{n['note']}\"" if n.get("note") else "")]
            out += [f"    {x['label']}" + (f" = {x.get('text') or x.get('value')}" if x.get("text") or x.get("value") is not None else "")
                    + (f" / {x['value2']:g}" if x.get("value2") is not None else "") + (f" ({x['effect']})" if x.get("effect") else "") + f" on \"{x.get('word', '')}\""
                    for x in sp.get("items") or []]
            if g := sp.get("grid"):
                out += [f"    grid {g['rows']} x {g['cols']} squares filling from \"{g.get('from_word', '')}\" to \"{g.get('to_word', '')}\" ({g.get('legend', '')})"]
            if tk := sp.get("token"):
                out += [f"    token \"{tk['text']}\" travels on \"{tk.get('go_word', '')}\""]
            if b := sp.get("board"):
                out += [f"    dark board: {' / '.join(b.get('title') or [])}"]
            for x in sp.get("pieces") or []:
                what = x.get("text") or " / ".join(x.get("lines") or []) or (f"{(x.get('number') or {}).get('prefix', '')}{(x.get('number') or {}).get('to', '')}" if x.get("number") else "") \
                    or ", ".join(f"{i['label']}{'=' + str(i.get('text') or i.get('value')) if i.get('text') or i.get('value') is not None else ''}" for i in x.get("items") or [])
                out += [f"    {x['kind']} at col {x['col']} row {x['row']} ({x['w']}x{x['h']}): {what} on \"{x.get('word', '')}\""]
        if (ph := s.get("photo") or {}).get("src") and s.get("scene_kind") != "photo":
            out += [f"  REAL PHOTO for this scene (use it with <Plate>): src \"{ph['src']}\", {ph['w']}x{ph['h']}, focus {ph.get('focus') or [0.5, 0.5]}, "
                    f"caption \"{ph.get('caption', '')}\", credit \"{ph.get('credit', '')}\""]
        if s.get("view"):
            out += [f"  view: {s['view']} ({s.get('kind', '')}); focus: {s.get('focus', '')}"]
        if s.get("takeaway"):
            out += [f"  takeaway: {s['takeaway']}"]
        if s.get("question"):
            out += [f"  question the pictures must answer: {s['question']}"]
        if s.get("places"):
            out += ["  real places: " + ", ".join(f"{x['name']} ({x['lon']:.2f}, {x['lat']:.2f})" for x in s["places"])]
        out += [f"  starts with: {s['start']}"]
        out += [f"  actor {a['name']} ({a['kind']}): {a['draw']}" + (f"; states: {', '.join(a['states'])}" if a.get("states") else "") for a in s["actors"]]
        out += [f"  on \"{m['word']}\": {m['actor']} {m['verb']}: {m['motion']}" for m in s["moves"]]
        out += [f"  link {l['source']} -> {l['target']}: {l['meaning']}" for l in s.get("links") or []]
        if c.get("kind", "none") != "none":
            out.append(f"  chart {c['kind']}: {c.get('values', '')}; highlight {c.get('highlight', '')}")
        out += [f"  callout \"{co['text']}\" -> {co['target']}{('.' + co['part']) if co.get('part') else ''} on \"{co['word']}\"" for co in s.get("callouts") or []]
        if s.get("technique") and s["technique"] != "none":
            out.append(f"  technique: {s['technique']}")
        out += [f"  words on screen: {', '.join(s.get('words') or []) or 'none'}", f"  ends with: {s['end']}", f"  camera: {s.get('camera') or 'hold'}", ""]
    return "\n".join(out)


DESIGNED_RULES = """THE DESIGN (given for every scene, from the art director): follow it exactly. Its actors with their parts and
states, each move on its word, its links, its chart, ONLY its words on screen, its start, end and camera, and its
ground for every scene. You decide how it looks and moves, never what is on screen. Nothing on screen that the design
does not name: no headlines, titles, data panels, captions, tags or extra labels.

LAYOUT AND TYPE: every text sits in its own box with a fixed width and a font size that fits it (no overflow, no text
running out of a card); two or three type sizes in the whole film; nothing overlaps: give every actor its own place.

CALLOUTS: each callout's label sits in empty space near its target, in the look's label style (a highlighter sticker,
chalk letters, a marker tag, a pinned card), never covering what it names; on its word a leader line DRAWS from the label
to that part's anchor point (a thin hand-drawn curve or a dashed line, ending in a small arrowhead or dot), then the label
pops in; it stays until the scene clears. The callouts are the only labels.

TECHNIQUES (when the design names one): spotlight = a dark overlay with a soft hole over the part, easing in on its word;
lens = a circle with a rim that shows the part scaled 2-3x, with a thin line to where it is; cutaway = the outer layer
slides or fades off to show the parts inside; trail = small dots left behind a moving thing, fading slowly; scale = a known
object (a person, a bus) drawn beside at true size; wipe = a vertical line moves across, before on one side, after on the
other; count = a counter ticks up as each thing appears.

CHARTS in the film's theme: bars are paper strips rising from a baseline drawn on the ground, a line is ink drawing
across the grid, dots appear in a stagger; minimal axes; the highlighted value lights up on its word."""

# ---------------- clear films: every scene must be understood from its pictures alone ----------------

CLEAR_DESIGN = """

CLEAR FILM: THE VIEWER MUST UNDERSTAND EVERY SCENE FROM ITS PICTURES ALONE. A first-time viewer, with the sound off,
must be able to say each scene's TAKEAWAY. For every scene also fill the comprehension contract:
- TAKEAWAY: one plain sentence a 12-year-old could repeat. If you cannot write it, the line is two ideas: show only one.
- QUESTION: a question the pictures alone answer ("Is the river higher or lower than the village?").
- KIND and VIEW: pick the view from what the line explains; this rule comes before every other choice:
    where (a real place, a route)      -> map: real places at their real coordinates (fill PLACES); start from a shape
                                          everyone knows (the country's outline) before zooming to the place
    how (a mechanism, a process)       -> cutaway: a side-view cross-section that shows the inside and the levels
                                          (water above fields, layers of silt, a pipe's inside); never a map
    how steep / how fast / how high    -> side-profile: the real slope as a line, a moving thing speeding or slowing
    how much / how many                -> comparison: two things on one baseline, or a strip of units filling
                                          (12 months with 4 filled), with a familiar object for scale; never a bare number
    when / change over time            -> timeline: a track with a moving marker, or the same picture changing as a
                                          year counter ticks
    one thing causing another          -> diagram; several causes adding up -> cause-chain: one link added per scene,
                                          the whole chain lit up at the end
- FOCUS: ONE actor moves in the scene; everything else is still and dimmed. At most 3 new things per scene.
- Every thing the narrator names is visible and appears on the word that names it; every verb is the focus's motion,
  on its word. Nothing moves that the narrator is not talking about.
- The same thing looks the same in every scene (same shape, same colour); one colour per meaning for the whole film
  (water blue, mud brown, danger red, people dark). A scene grows out of the one before it: the map zooms in, and the
  river there tilts into its cross-section; never a new set without a link.
- Labels: 1-3 words. Every number gets a familiar comparison.
- REGION (film-wide, only when a scene is a map): the real area the map scenes need, as west,south,east,north."""

CLEAR_WRITE = """CLEAR FILM RULES (above everything else in the look):
- FOCUS: only the design's focus actor moves; once it starts, everything else drops to 35% opacity and stays still.
- SYNC: every move starts within 0.15 s AFTER its word's time (given with the voice), never before it.
- HOLD: after a move lands it holds still at least 1.2 s before the next move. The scene is a few clear beats, not
  constant motion.
- TYPE: labels at least 40 px tall on a 1080 px frame, 1-3 words, dark on light or light on dark, always readable.
- VIEWS: cutaway = a side-view slice with ground layers; water is a blue body with a flat top; levels are dashed lines
  with a small label; a house or a person drawn for scale. side-profile = the slope as a thick line with height marks,
  the moving thing speeds up downhill and slows on the flat. comparison = things on one baseline, same units, the
  bigger one grows on its word. timeline = a horizontal track, a marker moving along it, a counter. cause-chain = 2-6
  boxes with an icon each, joined by arrows that light up in order.
- The same actor is drawn by the same component in every scene, in the same colour."""

MAP_KIT = """REAL MAP KIT (use it for every scene whose view is map; it IS that scene's ground, so do not paint another one):
  import MAP from "../../../../public/geo/SLUG/map.json";
  import { useRealMap, MapStage, MapLayer, Borders, River, alongRiver, PlaceDot, AreaLabel, Callout, Credit, flyTo, type MapData } from "../../../geodemo/realmap";
  const m = useRealMap(MAP as unknown as MapData);          // inside the scene component, at the top
  const cam = flyTo(m, frame, [[0, {lon, lat, span}], [60, {lon, lat, span}]]);   // span = degrees of longitude across the screen
  const [x, y] = m.toScreen(cam, [lon, lat]);   // where a real place is on screen now, for anything you draw over the map
  <MapStage m={m} cam={cam} grade={0..1 dims colour} skin={"paper" in paper, collage, cut-out and whiteboard styles, else "real"} screen={<>...screen-space pieces...</>}>
     <MapLayer> <Borders kind="countries" | "states" only={["Bihar"]} stroke width dash? fill? opacity? />
                <River name="..." progress={0..1} color? width? glow? /> </MapLayer>
  </MapStage>
  screen-space pieces: <PlaceDot lon lat name show={0..1} side?="r"|"l" big? />, <AreaLabel lon lat text show size? color? />,
  <Callout lon lat dx dy title sub? t={0..1} accent? /> (a card with a leader line to the place), <Credit /> (always, once).
  alongRiver(m, name, 0..1) gives [lon, lat] a fraction along a river. Real terrain, borders and rivers are already drawn
  from real data; you only choose the camera, what is highlighted and when. The region's names:
COUNTRIES: {countries}
STATES: {states}
RIVERS: {rivers}"""


MIX_DESIGN = """

MIX FILM: THE SCRIPT PICKS EACH SCENE'S KIND; THE FILM'S STYLE SKINS THEM ALL. For every scene choose SCENE_KIND:
  card    = ONE number, quote or definition on a paper card that MOVES: the card slides in and is taped down, the
            number counts up, a highlighter swipes across the key word, a stamp presses on. For "how much" lines.
  flow    = 3-5 steps as paper tags joined by arrows that DRAW ON as each step is said; a token (a drop, a coin, a
            packet) travels along the arrows; the current step lights up. For steps, processes, chains of causes.
  map     = the real map (where). Only for lines about places.
  motion  = a mechanism drawn and animated (a cutaway, a side profile, a machine working). ONLY for lines that explain
            HOW something physically works; 2-4 per film, they are the expensive scenes.
  kinetic = the line's key words are the objects: they slam, stack, get crossed out. For a punchline or a turn.
  photo   = a REAL photograph from Wikimedia Commons, pasted in as a torn paper cut-out, the camera pushing toward its
            subject, a marker circling it and a caption tag. For real places, institutions, objects, people at work,
            moments in history (a real central bank, a real market, real banknotes). Only things a free photo surely
            exists of; never a concept ("inflation") or a feeling. Fill PHOTO.
RHYTHM: at least 3 kinds in the film; never the same kind more than twice in a row; open on something concrete (a map,
a motion or a card), close on a flow that sums up the whole chain.
TRANSITION (how each scene enters), by how it relates to the scene before: continues the same thing -> zoom or cut;
contrast or before/after -> wipe; a new part of the story -> page; the next item of a list -> slide; something being
built up -> rise; a reveal -> fold. Scene 1 is cut. Do not use one transition more than three times.
STRICT STYLE: every DRAWN thing, of every kind, is in the film's one style on its one ground: a card is a paper card,
a flow is paper tags and hand-drawn arrows, a motion scene is cut paper. Never a dark slide, never a different ground,
never a plain web-page card. REAL THINGS STAY REAL: a place is shown on the real map (paper-toned), never as an
invented blob; being understood comes before looking uniform.
WORDS: list every word the scene shows: a flow's step labels (1-2 words each), a kinetic scene's words, a card's text.
FILL THE KIND'S DATA (they are built straight from it, so it must be complete): flow -> STEPS (3-5, each with an emoji
and the word it appears on, in the order they are said); kinetic -> KINETIC (2-4 words, each on its word); card ->
CARD (title, sub, an emoji, the number if the line gives one, the word it lands on); photo -> PHOTO (query, shows,
caption, word). A motion scene leaves them empty;
its actors are drawn big: the main drawing fills at least half of the frame."""

MIX_WRITE = """MIX FILM RULES: you write ONLY the motion and map scenes. The card, flow and kinetic scenes are built by the
player from the storyboard with the collage kit; they are listed in the design so you know the story around yours.
- motion -> your own SVG drawing of the mechanism, moving on its words (the voice's word times), on a TRANSPARENT layer:
            the player adds the paper ground and wraps it in <Cutout> (the cut-paper edge and shadow). Draw BIG, simple,
            recognisable shapes with flat paper colours; name parts with the kit's <Pointer> or <Label>.
            PAPER PALETTE: cream #fbf6ea, kraft #c9a874, brick red #c8553d, teal #2a7f7a, mustard #e0a530, ink
            #1d1b19, sky #8fb8d6. No dark navy or black panels: dark only for small details (a screen, a tyre, eyes).
- map    -> the REAL MAP KIT (when given): real things stay real; skin="paper" tones it to the paper style.
- Nothing appears before its word. The same thing is drawn by the same component in every scene you write."""

LAYOUT_KIT = """LAYOUT (checked in code): you never choose where a main piece sits on the frame by pixels.
  import { Layout, Region } from "../../../argon/regions";
  Every scene: <Layout kind="..."> with one <Region> per main piece (a drawing, a chart, a panel, a big number, a title).
  kinds and their regions:  full: main | title-main: title, main | split: left, right | title-split: title, left, right
    hero-left: main, side | hero-right: side, main | title-hero: title, main, side | main-footer: main, footer
    title-main-footer: title, main, footer | three: a, b, c | title-three: title, a, b, c | quad: a, b, c, d
  <Region name="left" id="cable" design={[800, 600]}>...</Region>: draw the piece at its design size, in the region's
    own px ((0,0) its top-left); the region scales it to fit and centres it, clear of the edges and the captions.
    design = the size of what you draw inside, including its own labels; one main piece per region.
  x, y, cx, cy are only for positions INSIDE a region (and inside your SVGs). Labels: <Tag to="cable.top">; give the
    region an id to point at it. Pick a different kind from the scene before (variety)."""

COLLAGE_KIT = """COLLAGE KIT (import what you use):
  import { PaperGround, Cutout, PaperCard, Tape, Words, Label, Pointer, Highlight, MarkerCircle, Halftone, FlowTags, KineticWords, CountCard, appear, land, clamp01 } from "../../../collage/kit";
  All take t (seconds into the scene) and `at` (when the piece appears); positions are px inside their <Region>.
  <PaperGround tone?: "cream"|"kraft"|"grey"|"pink"|"blue" />                       the ground (first child of the scene)
  <Cutout edge?=5 lift?=1>{any SVG or HTML drawing, full frame}</Cutout>               white paper edge + cast shadow around it
  <PaperCard x y w h? at t rot? edge?: "torn"|"cut" tape?=true color? seed?>{children}</PaperCard>   h omitted = fits content
  <Words size?=48 weight?=800 color?>text</Words>        text on cards (never below 34 px)
  <Label text x y at t size? rot? />                     a small paper tag centred on (x, y)
  <Pointer from={[x,y]} to={[x,y]} text at t />          label at `from`, a leader line drawn to `to`
  <Highlight x y w h at t />   <MarkerCircle x y r at t />   <Tape x y w? rot? />   <Halftone x y w h />
  <FlowTags steps={[{label, at, icon?}]} t token?="●" layout?: "row"|"arc" y?=470 />   3-5 steps, label 1-2 words
  <KineticWords words={[{text, at, effect?}]} t size?=150 y?=300 />                   2-4 words, uppercase, the last one in accent
  <CountCard x y at t to from? dur? prefix? suffix? label? decimals? w?=720 />
  appear(t, at, dur?) -> 0..1 eased; land(t, at, dur?) -> 0..1 with a small overshoot; clamp01(v)."""


class Answer(BaseModel):
    scene: int
    answer: str = Field(description="your answer to the scene's question, from what you would SEE")
    clear: bool = Field(description="false if you would be confused, or could not answer")
    confusing: str = Field("", description="what would confuse you, concretely")


class Answers(BaseModel):
    scenes: list[Answer]


class Verdict(BaseModel):
    scene: int
    understood: bool = Field(description="the viewer's answer shows they got the takeaway")
    why: str = Field(description="what in the pictures makes it work or fail, and what to change")
    unsure_facts: list[str] = Field(default_factory=list, description="facts or numbers in the line or design that may be wrong or need a source")


class Verdicts(BaseModel):
    scenes: list[Verdict]


VIEWER_SYSTEM = """You are a curious 14-year-old who knows nothing about the topic. You will WATCH a short film with the
sound OFF: you get only what will be on screen, beat by beat. For each scene answer its question from what you would see,
honestly. If the pictures would not tell you, say so and say what confuses you. Never guess from general knowledge."""

JUDGE_SYSTEM = """You review a storyboard for an explainer film. For each scene you get the narrator's line, the scene's
TAKEAWAY, and what a first-time viewer answered after seeing only the pictures. Decide if the viewer got the takeaway.
If not, say exactly what to change in the PICTURES (a different view, a missing actor, too many things moving, a label).
Also be a sceptic: list any fact or number in the line or the design that may be wrong or needs a source."""


def beats(s: dict) -> str:
    """what the viewer will see in a scene: the design without its idea, takeaway or narration"""
    t = design_text({"ground": "", "scenes": [{**{k: v for k, v in s.items() if k not in ("takeaway", "question")}, "idea": ""}]})
    return "\n".join(l for l in t.splitlines()[1:] if l.strip() and not l.strip().startswith("idea:"))


def review(p: dict, d: dict, out: str) -> list[dict]:
    """the naive viewer sees only the pictures and answers each scene's question; the judge compares with the takeaway"""
    cost.stage("review")
    say("A first-time viewer is watching the storyboard with the sound off", "review")
    ask = "\n\n".join(f"SCENE {i + 1}\n  QUESTION: {s.get('question', '')}\n  ON SCREEN:\n{beats(s)}" for i, s in enumerate(d["scenes"]))
    seen = json.loads(argon.think(ask, VIEWER_SYSTEM, Answers, max_tokens=8000))["scenes"]
    ask = "\n\n".join(f"SCENE {i + 1}\n  LINE: {p['lines'][i]}\n  TAKEAWAY: {s.get('takeaway', '')}\n  QUESTION: {s.get('question', '')}\n"
                      f"  VIEWER'S ANSWER: {a['answer']}\n  VIEWER WAS CONFUSED BY: {a.get('confusing') or 'nothing'}"
                      for i, (s, a) in enumerate(zip(d["scenes"], seen)))
    judged = json.loads(argon.think(ask, JUDGE_SYSTEM, Verdicts, max_tokens=8000))["scenes"]
    verdicts = [{**a, **v, "scene": i + 1} for i, (a, v) in enumerate(zip(seen, judged))]
    for i, v in enumerate(verdicts):
        say(f"Card L{i + 1:02d} {'understood' if v['understood'] else 'NOT understood'}: viewer said \"{v['answer'][:140]}\""
            + ("" if v["understood"] else f". Fix: {v['why'][:200]}") + (f". Check: {'; '.join(v['unsure_facts'])[:200]}" if v["unsure_facts"] else ""), "review", i)
    return verdicts


def map_region(slug: str, d: dict) -> dict | None:
    """the real map for a film's map scenes (geo.py), built once; None when no scene is a map"""
    if not d.get("region") or not any(s.get("view") == "map" for s in d["scenes"]):
        return None
    bbox = [float(v) for v in d["region"].split(",")]
    span = max(bbox[2] - bbox[0], bbox[3] - bbox[1])
    zoom = 8 if span <= 18 else 7 if span <= 36 else 6 if span <= 70 else 5 if span <= 140 else 4  # about 100 terrain tiles at most
    say(f"Building the real map: {d['region']} at zoom {zoom} (real terrain, borders, rivers, towns)", "storyboard")
    try:
        subprocess.run([sys.executable, os.path.join(HERE, "geo.py"), "--name", slug, "--bbox", d["region"], "--zoom", str(zoom)], cwd=HERE, check=True, timeout=240)
    except Exception as e:  # a map that cannot be built (the network, a tile server down) must not stop the film
        say(f"The real map could not be built ({str(e)[:120]}): the map scenes use the world map instead")
        return None
    m = json.load(open(os.path.join(HERE, "public", "geo", slug, "map.json")))
    return {"countries": [f["properties"]["name"] for f in m["countries"]], "states": [f["properties"]["name"] for f in m["states"]],
            "rivers": [f["properties"]["name"] for f in m["rivers"]], "places": [x["name"] for x in m["places"][:60]]}


KIND_PIECE = {"flow": "<FlowTags>", "kinetic": "<KineticWords>", "card": "<PaperCard> or <CountCard>", "map": "<MapStage>", "motion": "<Cutout>", "photo": "<PhotoCut>"}
KIND_NEEDS = {"flow": ("FlowTags",), "kinetic": ("KineticWords",), "card": ("PaperCard", "CountCard"), "map": ("MapStage",), "motion": ("Cutout",)}


def rhythm_breaks(d: dict) -> list[tuple[int, str, str]]:
    """(scene index, its kind, the kind to use instead) for every third scene of one kind in a row"""
    kinds = [s.get("scene_kind") or "" for s in d["scenes"]]
    out = []
    for i in range(2, len(kinds)):
        if kinds[i] and kinds[i] == kinds[i - 1] == kinds[i - 2]:
            near = set(kinds[max(0, i - 2):i + 2])
            other = next(k for k in ("flow", "card", "kinetic", "motion", "photo") if k not in near)
            kinds[i] = other
            out.append((i, kinds[i - 1], other))
    return out


def find_photos(slug: str, sb: dict, printed: bool = False) -> None:
    """the real photo for every photo card (Wikimedia Commons, free licence, checked by Gemini's eyes); a card with no
    fitting photo becomes a paper card with its caption, so nothing is invented"""
    import photos
    for c in sb["cards"]:
        s = c["design"]
        if s.get("scene_kind") != "photo" and not (printed and (s.get("photo") or {}).get("query")):
            continue
        ph = s.get("photo") or {}
        cost.stage("photos")
        try:
            got = photos.fetch(slug, c["id"], ph.get("query") or c["line"], ph.get("shows") or ph.get("query") or c["line"])
        except Exception as e:
            say(f"Card {c['id']}: the photo search failed ({str(e)[:120]})", "error", c["i"])
            got = None
        if got:
            say(f"Card {c['id']}: real photo found on Wikimedia Commons: {got['title']} ({got['credit']})", "card", c["i"])
            storyboard.update(slug, lambda sb, cid=c["id"], got=got: storyboard.card(sb, cid)["design"]["photo"].update(got))
        else:
            say(f"Card {c['id']}: no free photo clearly shows \"{ph.get('shows', '')}\"; it becomes a " + ("printed headline" if printed else "paper card"), "card", c["i"])
            if printed and s.get("scene_kind") != "photo":  # a drawn scene simply goes on without its photo
                storyboard.update(slug, lambda sb, cid=c["id"]: storyboard.card(sb, cid)["design"].update(photo={}))
                continue
            if printed:
                spread = {"layout": "headline", "kicker": [], "items": [{"label": ph.get("caption") or s.get("takeaway", "")[:40], "word": ph.get("word", ""), "effect": "bar"}]}
                storyboard.update(slug, lambda sb, cid=c["id"], spread=spread: storyboard.card(sb, cid)["design"].update(scene_kind="spread", spread=spread))
                continue
            card = {"title": ph.get("caption") or (s.get("words") or [""])[0] or s.get("takeaway", "")[:40], "sub": "", "icon": "", "number": None,
                    "prefix": "", "suffix": "", "word": ph.get("word", "")}
            storyboard.update(slug, lambda sb, cid=c["id"], card=card: storyboard.card(sb, cid)["design"].update(scene_kind="card", card=card))


def top_block(src: str, name: str) -> str:
    """the source of a top-level declaration (a helper component a scene uses)"""
    lines = src.splitlines()
    start = next((n for n, l in enumerate(lines) if re.match(rf"(export\s+)?(const|function)\s+{name}\b", l)), None)
    if start is None:
        return ""
    end = next((n for n in range(start + 1, len(lines)) if re.match(r"(export\s+)?(const|let|function|type|interface|class)\s", lines[n])), len(lines))
    return "\n".join(lines[start:end])


def text_words(code: str) -> list[str]:
    """the words a piece of JSX prints: text between tags (also across lines), {"string"} children and text props"""
    texts = re.findall(r">([^<>{}]*[A-Za-z]{2}[^<>{}]*)<", code, re.S)
    texts += re.findall(r"\{\s*[\"'`]([^\"'`$]*[A-Za-z]{2}[^\"'`$]*)[\"'`]\s*\}", code)
    for name, val in re.findall(r"\b(\w+)\s*[=:]\s*[\"'`]([^\"'`$]*)[\"'`]", code):
        if name in ("label", "text", "title", "caption", "note", "foot", "tag") and re.search(r"[A-Za-z]{2}", val):
            texts.append(val)
    words = []
    for t in texts:
        t = " ".join(t.split())
        if re.search(r"[=;(){}]|=>|\bconst\b|\breturn\b", t):  # code, not text
            continue
        words += [w for w in t.split() if re.search(r"[A-Za-z0-9]", w)]
    return words


PLACED = ("At", "Panel", "Board", "Num", "Stack", "PaperCard", "CountCard", "Plate", "Pie", "Pie3D", "Grid", "CubeGrid", "HeatTiles", "Combo",
          "Walk", "Legend", "Label", "Words", "Type")


def placed_by_pixels(body: str):
    """the opening tags of the pieces in PLACED that set x or cx: each tag read to its real end, braces balanced, so a
    `>` inside a prop ({t > 2 ? 1 : 0}, an arrow function) never cuts it short"""
    for m in re.finditer(r"<(" + "|".join(PLACED) + r")\b", body):
        depth, i = 0, m.end()
        while i < len(body):
            ch = body[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            elif ch == ">" and depth == 0:
                break
            i += 1
        top, d = [], 0  # the tag's own props: what is outside every {...}
        for ch in body[m.end():i]:
            d += ch == "{"
            top.append(ch if d == 0 else " ")
            d -= ch == "}"
        if re.search(r"(?<![\w-])(x|cx)\s*=", "".join(top)):
            yield m


def placement_problems(src: str, d: dict) -> list[str]:
    """a drawn scene of an explainer places its main pieces with <Layout>/<Region>, never by frame pixels: a piece with
    x/cx outside every region is a guessed position (it ends up cut by the frame or on another piece). Only drawn
    (motion) scenes are checked: map, kinetic, flow and card scenes are built full frame from their kit piece"""
    out, lines = [], src.splitlines()
    for k, sc in enumerate(d["scenes"], start=1):
        if (sc.get("scene_kind") or "motion") != "motion":
            continue
        blk = scene_block(src, k)
        if not blk:
            continue
        body = "\n".join(lines[blk[0]:blk[1]])
        if "<Layout" not in body:
            out.append(f"line {blk[0] + 1}: Scene{k} has no <Layout>: wrap it in <Layout kind=...> and put each main piece in a <Region> (LAYOUT)")
            continue
        inside = [(m.start(), m.end()) for m in re.finditer(r"<Region\b.*?</Region>", body, re.S)]
        for m in placed_by_pixels(body):
            if not any(a <= m.start() < b for a, b in inside):
                n = blk[0] + body[:m.start()].count("\n") + 1
                out.append(f"line {n}: <{m.group(1)}> is placed by frame pixels outside any <Region>: move it into a region and give x/y in the region's own px")
    return out


def kit_problems(src: str, d: dict, has_map: bool, regions: bool = False) -> list[str]:
    """mix films: each scene must be built from its kind's kit piece, and no text may be smaller than the kit's minimum"""
    out, lines = [], src.splitlines()
    m = re.search(r"export const MOTION[^=]*=\s*\{([^}]*)\}", src)
    if m:  # a mix film: the model wrote only the motion/map scenes; each one asked for must be in MOTION
        for i, s in enumerate(d["scenes"]):
            if (s.get("scene_kind") or "motion") in CODE_KINDS and not re.search(rf"\b{i + 1}\s*:", m.group(1)):
                out.append(f"line {src[:m.start()].count(chr(10)) + 1}: scene {i + 1} is a {s.get('scene_kind') or 'motion'} scene but MOTION has no {i + 1}: write Scene{i + 1} and add it")
    for i, s in enumerate(d["scenes"]):
        kind = s.get("scene_kind") or ""
        if m and kind != "map":
            continue  # mix: card/flow/kinetic are built by the player; a motion scene is wrapped in Cutout by it
        if kind not in KIND_NEEDS or (kind == "map" and not has_map):
            continue
        blk = scene_block(src, i + 1)
        if not blk:
            continue
        text = "\n".join(lines[blk[0]:blk[1]])
        text += "".join(top_block(src, h) for h in set(re.findall(r"<([A-Z]\w+)", text)))  # helpers the scene draws with
        if not any(f"<{n}" in text for n in KIND_NEEDS[kind]):
            out.append(f"line {blk[0] + 1}: Scene{i + 1} is a {kind} scene but is not built with the collage kit's {KIND_PIECE[kind]}")
    if "../../../print/kit" in src:  # a printed film: the text budget and fitted type
        for i in range(len(d["scenes"])):
            blk = scene_block(src, i + 1)
            if not blk:
                continue
            body = "\n".join(lines[blk[0]:blk[1]])
            body += "".join(top_block(src, h) for h in set(re.findall(r"<([A-Z]\w+)", body)) if h not in ("Type", "Stack", "Num", "Board", "Pie", "Legend", "GlassBars", "Grid", "Combo", "Walk", "Watermark", "Ornaments", "Plate", "Pie3D", "CubeGrid", "HeatTiles", "Panel"))
            words = len(text_words(body))
            if words > 16:
                out.append(f"line {blk[0] + 1}: Scene{i + 1} prints {words} words; the budget is 14: keep only the names and key numbers, cut every sentence, subtitle and description")
        for m in re.finditer(r"<Type\b([^>]*)>", src, re.S):  # forced onto one line, text can only fit if it is given its box
            if re.search(r"nowrap", m.group(1)) and not re.search(r"\bw=\{", m.group(1)):
                out.append(f"line {src[:m.start()].count(chr(10)) + 1}: <Type> set to nowrap without w: give it w={{the width of its box}} so it never spills out")
    for n, line in enumerate(lines, 1):
        for m in re.finditer(r"fontSize\s*[:=]\s*\{?\s*(\d+)", line):
            if int(m.group(1)) < 34:
                out.append(f"line {n}: fontSize {m.group(1)} is below 34 px (unreadable on a phone): make it at least 34, or shorten the label")
    if regions:  # only a film whose writer was given the LAYOUT rules (never a story film, never one written before them)
        out += placement_problems(src, d)
    return out


def guessed_boxes(src: str) -> list[str]:
    """label boxes sized by guessing their text's width (width={label.length * 11}): when the text grows to the readable
    size the box does not, and the text is cut; <Tag> sizes its box from the text itself"""
    return [f"line {n}: a box sized from the text's length (`{l.strip()[:60]}`) cuts its text when the font grows: draw the label with <Tag> "
            "(import { Tag } from \"../../../print/depth\") instead" for n, l in enumerate(src.splitlines(), 1) if re.search(r"(width|w)\s*[=:]\s*\{?[^,}\n]*\.length\s*\*", l)]


ARRIVES = ("<Enter", "<Panel", "<Board", "<Plate", "<Tag", "<Pie3D", "<CubeGrid", "<HeatTiles", "useEnter(")


def cast_problems(src: str) -> list[str]:
    """a JSX prop forced through with `as any` (map={{ center: [0, 20], zoom: 1 } as any}): it compiles, then the piece
    gets a value it cannot use and the render crashes mid-film; the prop must be what the piece's type says"""
    out = []
    for n, line in enumerate(src.splitlines(), 1):
        for m in re.finditer(r"\b(\w+)=\{[^\n]*?\bas any\s*\}", line):
            out.append(f"line {n}: the prop {m.group(1)}= is forced with `as any`: give it exactly what the piece's type asks for "
                       f"(a map from makeMap, a real image path...) or leave the prop out so the piece uses its own default")
    return out


def style_problems(src: str, story: bool = False) -> list[str]:
    """a print film moves one way and paints with its look: every scene's pieces arrive through the film's motion
    (Enter, Panel, Board, Plate, Tag...), and colours come from useDNA(), never written in as fixed values"""
    if "print/kit" not in src or story:  # a story film moves by its camera and light, in its world's own colours
        return []
    out, lines = [], src.splitlines()
    table = re.search(r"export const MOTION[^=]*=\s*\{(.*?)\}", src, re.S)
    for n, name in re.findall(r"(\d+)\s*:\s*(\w+)", table.group(1) if table else ""):
        body = "\n".join(lines[i - 1] for i in scene_lines(src, int(n)))
        if body and not any(a in body for a in ARRIVES):
            first = scene_lines(src, int(n))[0]
            out.append(f"line {first}: scene {n} draws its pieces with hand-made fades: wrap them in <Enter t at> (import {{ Enter }} from "
                       "\"../../../print/enter\") so they arrive in the film's motion like every other scene")
    fixed = [n for n, l in enumerate(lines, 1) if re.search(r"[\"'`]#[0-9a-fA-F]{6}\b", l) and not l.strip().startswith(("//", "*", "/*"))]
    out += [f"line {n}: a colour written in as a fixed value: take it from useDNA() (ink, inks[0..3], paper, board) so it follows the look"
            for n in fixed[:12]]
    return out


def kit_rounds(gen: str, film: str, src: str, out: str, report: dict, d: dict, has_map: bool, regions: bool = False, story: bool = False) -> str:
    """the kit check, sent back as patches. It is POLISH on a film that already compiles, so it never puts that film at
    risk: a patch that breaks the compile is undone at once (no repair rounds spent on polish), and the rounds stop as soon
    as one does not cut the problems (a check that finds as many new ones as it fixed is going in circles)"""
    last = None
    for r in range(3):
        probs = kit_problems(src, d, has_map, regions) + guessed_boxes(src) + style_problems(src, story) + cast_problems(src)
        report["kit_problems"] = len(probs)
        if not probs:
            say("Every scene is built from its kit piece, and all text is readable", "ok")
            break
        if last is not None and len(probs) >= last:
            say(f"{len(probs)} kit problem(s) left after a round that did not cut them: the film renders as it is", "fix")
            break
        last = len(probs)
        say(f"{len(probs)} kit problem(s): {'; '.join(probs[:3])[:300]}: asking for patches (round {r + 1})", "fix")
        before = src
        nos = [int(m.group(1)) for e in probs if (m := re.match(r"line (\d+)", e))]
        try:  # polish: when Google is out of quota the film renders without it rather than wait
            src, done, missed = fix(film, src, "THE KIT CHECK FAILED (fix every listed problem: rebuild with the named kit piece, cut words to the budget, "
                                    "give <Type> its box width w, raise small font sizes; keep timing and meaning):\n" + "\n".join(probs[:20]), nos[:20], out, f"kit-{r + 1}", tries=3)
        except RuntimeError as e:
            say(f"Gemini is busy ({str(e)[:60]}): rendering without the rest of the kit polish", "fix")
            break
        say(f"  {done} patch(es) applied, {missed} not found")
        if compile_errors(gen):
            src = before
            open(film, "w").write(src)
            say("The polish patches broke the compile: undone (the film keeps its working code)", "fix")
            break
    return src


FRAME_CHECK = """You check the rendered frames of an explainer film. Each image is one scene, late in the scene when
everything has arrived; its number is written above it. Report ONLY problems you can clearly SEE:
- cut: text clipped by its box or by the frame edge, a word or number cut off
- overlap: things drawn on top of each other, or anything (an ornament, a line, a shape) sitting on the title or a label
- faded: text too faint, too small or too low in contrast to read on a phone
- tiny: the scene's main thing is small in a big empty page; it should fill a good part of the frame
Name the scene, the kind and, in a few words, what and where ("the label '1858 CABLE' is cut at its right edge").
A clean scene: report nothing for it. Reply {"issues": [{"scene": 3, "kind": "cut", "what": "..."}]}."""


class FrameIssue(BaseModel):
    scene: int
    kind: str = Field(description="cut | overlap | faded | tiny | flat")
    what: str


class FrameIssues(BaseModel):
    issues: list[FrameIssue] = Field(default_factory=list)


def scene_lines(src: str, n: int) -> list[int]:
    """the line numbers of scene n's component in film.tsx (MOTION maps n to it)"""
    table = re.search(r"export const MOTION[^=]*=\s*\{(.*?)\}", src, re.S)
    m = re.search(rf"\b{n}\s*:\s*(\w+)", table.group(1)) if table else None
    if not m:
        return []
    lines = src.splitlines()
    start = next((i for i, l in enumerate(lines, 1) if re.match(rf"\s*(export\s+)?(const|function)\s+{m.group(1)}\b", l)), 0)
    if not start:
        return []
    end = next((i for i in range(start + 1, len(lines) + 1) if re.match(r"(export\s+)?(const|function)\s+\w+", lines[i - 1])), len(lines) + 1)
    return list(range(start, end))


RESCENE = """You rewrite whole scenes of one Remotion film file (a print-look explainer) to fix what was seen in their
rendered frames. You get the problems and each scene's current component. Keep each component's NAME, each scene's
meaning, words and timing (the same `at` seconds); fix every problem: cut text -> draw labels with <Tag> or give <Type> its
box width w; overlaps -> move things apart and off titles; faint text -> full-contrast ink, at least 34 px; tiny ->
scale the main thing up so it fills about half the frame and set it near the centre. Use only names the file already
imports or defines (plus Tag, Enter, Panel from the print kit if imported). Answer ONLY with the rewritten components,
each in full, each preceded by a line `// SCENE <n>`, and nothing else."""


def rewrite_scenes(film: str, src: str, issues: list[dict], out: str, tag: str) -> tuple[str, list[int]]:
    """the scenes with problems, each rewritten whole (patches fail on big visual changes: their find text drifts);
    returns the new source and the scenes replaced"""
    by: dict[int, list[str]] = {}
    for x in issues:
        by.setdefault(x["scene"], []).append(f"{x['kind']}: {x['what']}")
    lines = src.splitlines()
    ranges = {n: scene_lines(src, n) for n in by}
    ranges = {n: r for n, r in ranges.items() if r}
    if not ranges:
        return src, []
    imports = "\n".join(l for l in lines if l.startswith("import "))
    ask = (f"THE FILE'S IMPORTS:\n{imports}\n\n" + "\n\n".join(
        f"SCENE {n} PROBLEMS:\n- " + "\n- ".join(by[n]) + f"\nSCENE {n} NOW:\n" + "\n".join(lines[i - 1] for i in r) for n, r in sorted(ranges.items())))
    answer = argon.think(ask, RESCENE, max_tokens=24000, tries=3)
    open(os.path.join(out, f"raw-{tag}.txt"), "w").write(answer)
    parts = re.split(r"^// SCENE (\d+)\s*$", code_of(answer) if "```" in answer else answer, flags=re.M)
    new = {int(parts[k]): parts[k + 1].strip("\n") for k in range(1, len(parts) - 1, 2)}
    done = []
    for n in sorted((n for n in new if n in ranges), key=lambda n: -ranges[n][0]):  # from the bottom up, so earlier ranges stay put
        r = ranges[n]
        lines[r[0] - 1:r[-1]] = new[n].splitlines() + [""]
        done.append(n)
    src2 = "\n".join(lines) + "\n"
    open(film, "w").write(src2)
    return src2, sorted(done)


GEOM_FIX = """MEASURED LAYOUT PROBLEMS in the rendered frames (exact boxes in px, x,y = top-left on the 1920x1080 frame).
Fix each with the smallest patch: never place two pieces of text by hand near each other. Turn a hand-placed label into
<Tag to="piece.point"> (or <Tag tx ty>) and let the scene place it; give a pointed-at spot a name with <Mark id x y> (or
<SvgMark> inside an <svg>); shrink or move a headline or number that collides with another; keep text 40 px inside the frame.
A label pointing at a name that is not in the scene: give that piece the id, or point at a <Mark> you add.
"""


def frame_rounds(gen: str, film: str, src: str, out: str, report: dict, voice: list[dict], d: dict, story: bool = False) -> str:
    """THE FRAME CHECK: render every drawn scene empty (its first frames) and settled (late), measure how much of the
    frame it fills, and let Gemini look at the settled frames for cut text, overlaps, faded text and tiny things; the
    problems go back as patches (two rounds at most). Optional: when it cannot run, the film renders as it is."""
    from PIL import Image, ImageChops
    starts, at = [], 0
    for v in voice:
        starts.append(at)
        at += round((v["seconds"] + PAD) * 30)
    drawn = [i for i, sc in enumerate(d["scenes"]) if (sc.get("scene_kind") or "motion") == "motion"]
    for r in range(2):
        shots = os.path.join(out, "frames", f"round-{r + 1}")
        jobs = ",".join(f"e{i}:{starts[i] + 2},s{i}:{starts[i] + round((voice[i]['seconds'] + PAD) * 30 * 0.85)}" for i in drawn)
        try:
            subprocess.run(["node", os.path.join(HERE, "framecheck.mjs"), os.path.join(gen, "entry.ts"), shots, jobs, "0.25"],
                           cwd=HERE, check=True, capture_output=True, timeout=600)
        except Exception as e:
            say(f"Frame check skipped: the stills could not be made ({str(e)[:80]})", "fix")
            return src
        issues = []
        for i in drawn:  # how much of the frame the scene fills: settled minus empty
            a, b = Image.open(os.path.join(shots, f"e{i}.jpg")).convert("L"), Image.open(os.path.join(shots, f"s{i}.jpg")).convert("L")
            mask = ImageChops.difference(a, b).point(lambda v: 255 if v > 28 else 0)
            filled = sum(mask.histogram()[255:]) / (mask.width * mask.height)
            box = mask.getbbox()
            spread = ((box[2] - box[0]) * (box[3] - box[1]) / (mask.width * mask.height)) if box else 0
            if filled < 0.06 or spread < 0.3:
                issues.append({"scene": i + 1, "kind": "tiny", "what": f"the scene fills only {filled:.0%} of the frame (its pieces span {spread:.0%}): "
                               "scale the main thing up to fill about half the frame, and its labels with it"})
        # MEASURED, not looked at: what each settled frame's own layout found (src/argon/place.tsx via framecheck.mjs):
        # text over text, text cut by the frame, a label naming a point that is not in the scene. They go back as small
        # patches that carry the measured boxes, on the lines that hold those words; no model has to judge pixels.
        geom = json.load(open(os.path.join(shots, "geom.json"))) if os.path.exists(os.path.join(shots, "geom.json")) else {}
        measured = [(i, g) for i in drawn for g in geom.get(f"s{i}", [])]
        report["geom_problems"] = report.get("geom_problems", 0) + len(measured)
        if measured:
            say(f"Measured {len(measured)} layout problem(s): " + "; ".join(f"scene {i + 1}: {g}" for i, g in measured[:3])[:300] + f": patching them (round {r + 1})", "fix")
            words = {w for _, g in measured for w in re.findall(r'"([^"]{2,60})"', g)}
            nos = sorted({n for n, l in enumerate(src.splitlines(), 1) if any(w in l for w in words)} | {n for i, _ in measured for n in scene_lines(src, i + 1)[:1]})
            before = src
            try:
                src, done, missed = fix(film, src, GEOM_FIX + "\n".join(f"- scene {i + 1}: {g}" for i, g in measured[:20]), nos[:40], out, f"geom-{r + 1}", tries=3)
                say(f"  {done} patch(es) applied, {missed} not found")
                if compile_errors(gen):
                    src = before
                    open(film, "w").write(src)
                    say("  the layout patches broke the compile: undone", "fix")
            except RuntimeError as e:
                say(f"Gemini is busy ({str(e)[:60]}): the measured layout problems stay", "fix")
        from google.genai import types
        parts = []
        for i in drawn:
            parts += [f"SCENE {i + 1}:", types.Part.from_bytes(data=open(os.path.join(shots, f"s{i}.jpg"), "rb").read(), mime_type="image/jpeg")]
        try:
            seen = json.loads(argon.think(parts, FRAME_CHECK.replace("Report ONLY problems you can clearly SEE:", "Report ONLY problems you can clearly SEE:" + (FRAME_STORY if story else "")), FrameIssues, model=argon.fallback_model(), max_tokens=3000, tries=3)).get("issues", [])
            issues += [x for x in seen if x.get("kind") in ("cut", "overlap", "faded", "tiny") and x.get("scene") in [i + 1 for i in drawn]]
        except Exception as e:
            say(f"Gemini could not look at the frames ({str(e)[:60]}): only the size check runs", "fix")
        report["frame_issues"] = report.get("frame_issues", 0) + len(issues)
        if measured and not issues:
            continue  # the layout patches changed the film: check the new frames once more
        if not issues:
            say("Frame check: every drawn scene fills its frame, and no text is cut, faded or covered", "ok")
            break
        say(f"Frame check found {len(issues)} problem(s): " + "; ".join(f"scene {x['scene']} {x['kind']}: {x['what']}" for x in issues[:4])[:300] + f": asking for patches (round {r + 1})", "fix")
        before = src
        try:
            src, done = rewrite_scenes(film, src, issues, out, f"frames-{r + 1}")
        except RuntimeError as e:
            say(f"Gemini is busy ({str(e)[:60]}): rendering without the frame fixes", "fix")
            break
        say(f"  rewrote scene(s) {', '.join(map(str, done)) or 'none'} whole")
        if compile_errors(gen):
            src = compile_rounds(gen, film, src, out, report, f"frames-fix-{r + 1}")
            if compile_errors(gen):
                src = before
                open(film, "w").write(src)
                say("The frame patches broke the compile: undone", "fix")
                break
    return src


CODE_KINDS = ("motion", "map")  # the only scenes the model writes as code in a mix film; the rest are built from data


def ground_tone(ground: str) -> str:
    g = ground.lower()
    return next((t for t in ("kraft", "grey", "gray", "pink", "blue") if t in g), "cream").replace("gray", "grey")


def word_at(words: list[dict], word: str, after: float = 0.0, fallback: float = 0.3) -> float:
    """the time (s) the narrator says `word` (first match at or after `after`); `fallback` when it is not in the line"""
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    w0 = norm(word.split()[0]) if word.strip() else ""
    for w in words:
        if w["s"] >= after - 0.01 and w0 and (norm(w["w"]) == w0 or norm(w["w"]).startswith(w0)):
            return round(w["s"], 2)
    return round(fallback, 2)


def kit_scenes(d: dict, voice: list[dict], tone: str) -> str:
    """scenes.tsx for a mix film: card, flow and kinetic scenes built from the storyboard with the collage kit, on the
    real word times; motion and map scenes come from the model's film.tsx (MOTION), drawn on the paper ground inside a
    Cutout. A scene the model did not write falls back to a card with its takeaway, so the film always plays."""
    j = json.dumps
    out = ["/* written by video/oneshot.py from the storyboard (mix film): data scenes from the collage kit, motion scenes from film.tsx */",
           'import React from "react";', 'import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";',
           'import { PaperGround, Cutout, PaperCard, Words, FlowTags, KineticWords, CountCard, PhotoCut, appear } from "../../../collage/kit";',
           'import { MOTION } from "./film";', "",
           "const useT = () => useCurrentFrame() / 30;", ""]
    names = []
    for i, s in enumerate(d["scenes"]):
        k, name, words = s.get("scene_kind") or "motion", f"S{i + 1}", voice[i]["words"]
        names.append(name)
        ground = f'<PaperGround tone={j(tone)} />'
        dur = voice[i]["seconds"] + PAD
        if k == "photo" and (s.get("photo") or {}).get("src"):
            ph = s["photo"]
            cap_at = word_at(words, ph.get("word", ""), 0.0, 1.4)
            body = (f"{ground}<PhotoCut src={{staticFile({j(ph['src'])})}} ratio={{{ph['w'] / ph['h']:.3f}}} at={{0.15}} t={{t}} dur={{{dur:.2f}}} "
                    f"focus={{{j(ph.get('focus') or [0.5, 0.5])}}} caption={j(ph.get('caption', ''), ensure_ascii=False)} captionAt={{{max(0.9, cap_at)}}} "
                    f"credit={j(ph.get('credit', ''), ensure_ascii=False)} seed={{{i + 2}}} />")
        elif k == "flow" and len(s.get("steps") or []) >= 2:
            at, steps = 0.2, []
            for n, x in enumerate(s["steps"][:5]):
                at = word_at(words, x["word"], at, at + 0.7)
                steps.append({"label": x["label"], "icon": x.get("icon", ""), "at": min(at, 0.35) if n == 0 else at})  # never an empty opening
            body = f"{ground}<FlowTags t={{t}} steps={{{j(steps, ensure_ascii=False)}}} layout=\"row\" y={{430}} />"
        elif k == "kinetic" and s.get("kinetic"):
            at, ws = 0.15, []
            for n, x in enumerate(s["kinetic"][:4]):
                at = word_at(words, x["word"], at, at + 0.6)
                ws.append({"text": x["text"], "at": min(at, 0.35) if n == 0 else at, "effect": x.get("effect") or "slam"})
            longest = max(len(x["text"]) for x in ws)
            body = f"{ground}<KineticWords t={{t}} words={{{j(ws, ensure_ascii=False)}}} size={{{min(170, int(1600 / max(1, longest * 0.62)))}}} y={{{420 - 90 * (len(ws) - 1)}}} />"
        elif k == "card" and (s.get("card") or {}).get("title"):
            c = s["card"]
            at = min(0.5, word_at(words, c.get("word", ""), 0.0, 0.3))  # the card is there from the start; its word marks it
            mark_at = max(at + 0.7, word_at(words, c.get("word", ""), 0.0, at + 0.7))
            if c.get("number") is not None:
                dec = 0 if float(c["number"]).is_integer() else 1
                body = (f"{ground}<CountCard x={{600}} y={{270}} at={{{at}}} t={{t}} to={{{c['number']}}} decimals={{{dec}}} prefix={j(c.get('prefix', ''), ensure_ascii=False)} "
                        f"suffix={j(c.get('suffix', ''), ensure_ascii=False)} label={j(c['title'], ensure_ascii=False)} w={{720}} />")
            else:
                # the card drifts slowly closer, its emoji bounces in after it, a highlighter swipes the title on its word
                body = (f"{ground}<div style={{{{ position: \"absolute\", inset: 0, transform: `scale(${{1 + 0.05 * Math.min(1, t / {dur:.2f})}})` }}}}>"
                        f"<PaperCard x={{460}} y={{200}} w={{1000}} at={{{at}}} t={{t}} rot={{-2}}>"
                        + (f"<div style={{{{ fontSize: 150, lineHeight: 1.1, transform: `translateY(${{(1 - appear(t, {at + 0.35:.2f}, 0.45)) * -60}}px) scale(${{appear(t, {at + 0.35:.2f}, 0.45)}})` }}}}>{c['icon']}</div>" if c.get("icon") else "")
                        + f"<Words size={{96}} weight={{900}} mark={{appear(t, {mark_at:.2f}, 0.5)}}>{{{j(c['title'], ensure_ascii=False)}}}</Words>"
                        + (f"<Words size={{50}} weight={{600}} style={{{{ marginTop: 14 }}}}>{{{j(c['sub'], ensure_ascii=False)}}}</Words>" if c.get("sub") else "")
                        + "</PaperCard></div>")
        else:  # motion, map, or a data scene with no data: the model's drawing (a card with the takeaway if it wrote none)
            fallback = j(s.get("takeaway") or s.get("idea") or "", ensure_ascii=False)
            inner = (f"M ? <M /> : <PaperCard x={{360}} y={{300}} w={{1200}} at={{0.2}} t={{t}}><Words size={{64}}>{{{fallback}}}</Words></PaperCard>")
            body = (f"{{M ? <M /> : null}}" if k == "map" else f"{ground}<Cutout>{{{inner}}}</Cutout>")
            out.append(f"const {name}: React.FC = () => {{\n  const t = useT();\n  const M = MOTION[{i + 1}];\n  return <AbsoluteFill>{body}</AbsoluteFill>;\n}};\n")
            continue
        out.append(f"const {name}: React.FC = () => {{\n  const t = useT();\n  return <AbsoluteFill>{body}</AbsoluteFill>;\n}};\n")
    out.append(f"export const SCENES: React.FC[] = [{', '.join(names)}];\n")
    return "\n".join(out)


MIX_CONTRACT = """- export const MOTION: Record<number, React.FC> = { 2: Scene2, 5: Scene5, ... }: ONLY the scenes whose kind is motion
  or map, keyed by scene number. Do NOT write card, flow or kinetic scenes: they are built from the storyboard by the
  player with the collage kit. Each scene takes no props and is played alone, so useCurrentFrame() is 0 at its start:
  const t = useCurrentFrame() / fps.
- A motion scene draws ONLY its pieces on a TRANSPARENT layer (no ground, no background, no full-frame rect): the player
  paints the paper ground and wraps your drawing in the kit's <Cutout>, which gives it the cut-paper edge and shadow.
  Draw BIG: the main actors fill at least half of the 1920x1080 frame. Name parts with the kit's <Pointer> or <Label>.
- A map scene uses the REAL MAP KIT full frame (it is its own ground)."""


# ---------------- print films: every scene a printed spread (src/print/layouts.tsx), one print DNA per film ----------------
PRINT_DESIGN = """

THE FILM'S LOOK (one look for the whole film): LOOK_ART. Every scene is DRAWN
(scene_kind motion): you design what the line needs and the writer draws and animates it in this theme. You are free to
draw anything: a mechanism, a chart, a timeline, a split, a machine, people, a page of numbers. Never UI cards,
stickers, emoji or screenshots.
For every scene:
  scene_kind motion  (almost every scene). Design it fully: actors with named parts, moves on the exact words, the
                     chart (kind and its numbers from the line or the notes), the printed words (WORDS) and where the eye
                     goes. Show the idea moving: slices sweep in as they are named, grid cells ink in, bars grow, numbers
                     count up, tokens travel, a balance shrinks, a crossed-out word gets struck, a label prints on its word.
  scene_kind photo   only for a real place, building or object that a free photo surely exists of (fill PHOTO); it is
                     printed as a duotone plate. At most 2 per film.
  scene_kind map     only for lines about real places.
ONE CLEAR IDEA PER SCENE: one hero drawing or chart, big and readable, with calm space around it; add a second
element (a panel with the key number, a legend, a photo) only when the line needs it. AT MOST 14 PRINTED WORDS per
scene (a 2-4 word kicker, a 2-6 word title, 1-2 word labels, numbers): never sentences, subtitles, descriptions or
jargon the narration does not say. The pictures and the narrator do the explaining.
REAL PHOTOS: any scene may use a real photograph as one part of its page (a building, a market, a machine, a person
at work): fill PHOTO (query, shows, caption) and design where it sits; it is found on Wikimedia Commons and printed as a
duotone plate. Never a photo of a concept.
VARIETY: no two scenes composed the same way. Move the hero (left, right, centre, full width), split the page, set a
dark board beside the paper, a heat grid across the top, a big number with a column of notes; think like an editorial
designer laying out a magazine.
NUMBERS only from the line or the creator's notes (you may compute derived values honestly; never invent data).
TRANSITION (how each scene enters), by how it relates to the scene before: continues the same thing -> zoom or cut;
contrast or before/after -> wipe; a new part of the story -> page; the next item of a list -> slide; something being
built up -> rise; a reveal -> fold. Scene 1 is cut. Do not use one transition more than three times.
WORDS: list every word the scene prints (titles, labels, numbers as printed)."""

PRINT_WRITE = """YOU DRAW EVERY SCENE, IN THIS FILM'S ONE LOOK. You have full control over WHAT you draw; HOW it
looks is this film's look, described here (and shown by the THEME REFERENCES when images come with the brief: every
scene must look like a page from them, never copy their data):
ART_DIRECTION
- THE GROUND: the player lays every scene on the film's ground (its colour and texture); you draw on a TRANSPARENT
  layer over it. Never paint a background, never a full-frame rect (a panel set into the page is fine).
- COLOURS: only the film's inks (useDNA(): paper, ink, inks, board, boardInk). On a dark ground the key ink is light.
- TYPE: all text is <Type> from the kit (the film's typefaces): display face for headlines and big numbers, body face
  for sentences and legends, the mono face for tiny labels (<Stack> or <Type caps>). Never set fontFamily yourself and
  never use FONTS from ./brief. Text never below 34 px except the tiny caps labels (24 px is fine for those).
- INK: filled shapes and charts take filter: INK (the film's ink texture); pieces lifted off the page take filter: CUT
  (ink + a soft shadow). Thin rules (1-3 px) in the key ink separate things.
- CHARTS and PHOTOS and LABELS and MOTION follow the look above; ornaments come from <Ornaments> in free corners.
- NOT AN APP: never dashboard cards (bordered boxes of text with badges, pills, chips, status tags, code-like labels
  such as "GEMM" or "X_I", underscores). A chart, a drawing or a big number IS the scene; the main words big (56 px+).
- ONLY THE NOTES' FACTS: never print a number, percentage, speed or claim that is not in the narration or the design
  (no "120 tokens/s", "8x", "0% loss"); a label names what is drawn, it does not add facts.
- NO OVERLAPS: a <Stack> of N lines is N x 34 px tall; put the next thing below it. Labels never sit on other text.
- LAYOUT: compose each scene like a good magazine page with <Layout> and <Region> (LAYOUT above): one clear hero in
  the biggest region, calm space around it. Empty paper is fine; clutter is not. Every scene a different layout kind.
- READABLE TEXT, ALWAYS: every word must be easy to read when it is on screen. Type in the key ink on the ground;
  boardInk on a panel; on a colour fill, whichever of paper or key ink contrasts most; never faded text, never text
  on a colour of similar lightness. Once a word has appeared it stays at full opacity. Text always fits inside its shape
  (measure it: a word in a box of width W at size S needs about 0.6 x S x letters px) and never sits on other text.
- POINTER LABELS (a tag with a leader line to what it names) go BELOW or beside their target, in free space, the line
  drawn up to the target; never above it where the title and subtitle are, never on top of any text.
- TEXT BUDGET (checked in code): at most 14 words on screen per scene, counting everything: a tiny caps kicker (2-4
  words), a title (2-6 words), labels (1-2 words each), numbers. No sentences, no subtitles, no paragraphs, no
  descriptions inside boxes, no taglines, no jargon the narration does not say: the drawing and the narrator explain.
- TEXT STAYS IN ITS BOX: put text inside a box with a set width (<Type> wraps inside it), or give <Type> w = the width
  it may take (it shrinks to one line or wraps to two). Never whiteSpace nowrap without w. Nothing runs past the frame.
- MOTION: things print onto the page on their words: slices sweep, cells ink in one by one, bars grow, numbers count
  up, rules draw across, cut-paper pieces slide in and settle with their shadow, a token travels along a hairline, a word
  is struck through. Keep a slow drift (a gentle push or float) so no frame is dead still.
PRINT KIT (import what helps; draw your own shapes freely in SVG/HTML in the same theme):
  import { Type, appear, clamp01, useDNA, INK, CUT } from "../../../print/kit";
  import { Pie, Legend, GlassBars, Board, Num, Stack, Grid, Walk, Combo, Watermark, Ornaments, Plate } from "../../../print/spread";
  useDNA() -> { paper, ink, inks, board, boardInk, dark }   appear(t, at, dur?) -> 0..1 eased   (px on 1920x1080; t = seconds)
  <Type size={56} display? caps? color? style?>words</Type>
  <Stack x y lines={["TINY","CAPS"]} t at size? color? align? />
  <Num x y t at to prefix? suffix? decimals? size label? w? dark? color? money? />   (a plain count; money: rupees in lakh/crore)
  <Pie cx cy r t at={[time per slice]} slices={[{label, value}]} dark? />   <Legend x y w t at={[...]} items={[{label, value}]} />
  <Board x y w h t at title={["CAPS"]} tag={["CAPS"]} foot="A/B">{children, positioned inside the board}</Board>
  <GlassBars x y w h t bars={[{label, value, text, at, ghost?}]} />   (inside a Board, board-relative px)
  <Grid x y w h rows={[...]} cols={[...]} t from to tone={(i, j) => 0..3 or -1} />
  <Combo x y w h t groups={[{label, a, b, line, lineText, at}]} keys={[a, b, line]} />
  <Walk x y w h t at dur />   <Watermark x y text t size? />   <Ornaments zones={["tl","br"]} seed t />
  import { Pie3D, CubeGrid, HeatTiles, Panel, Tag } from "../../../print/depth";   (3D pieces in the film's material and depth)
  <Tag to="globe.equator" t at size? tone?="dark"|"ink"|"accent"|"plain" side?="left">LABEL</Tag>   EVERY label, callout or
     tag. Say WHAT it points at, never WHERE the label goes: the scene measures the frame and puts each label in the first
     spot clear of other text, drawings and the frame's edge, with a leader to its target. Name the target with `to`:
       a piece's own point: <Globe id="globe" .../> gives "globe.equator", "globe.equator.left", "globe.pole.s", "globe.-33.9,18.4"
       a spot in your own drawing: <Mark id="bar.north.top" x y /> (or <SvgMark id x y/> inside an <svg>), then to="bar.north.top"
       any placed piece: <At id="ship" x y anchor="center">…</At>, then to="ship.top" (center, top, bottom, left, right, corners)
     tx, ty (px) only for a point you computed (m.toScreen(...), your own chart's scale), never a point guessed by eye.
     x, y are only a wish (kept when that spot is clear). Never place two texts by hand near each other: give labels to Tag.
     Never draw a label box yourself: a box sized from text.length cuts its text.
  import { Mark, SvgMark } from "../../../argon/place";
  <At x y anchor="center" id?>   ONLY inside a <Region>, in its px (import { At } from "../../../argon/kit"): anchor="center" makes x, y the piece's CENTRE;
     without it x, y is the TOP-LEFT corner. Never draw something "at the globe's centre" from a corner position.
  <Pie3D cx cy r t at={[time per slice]} slices={[{label, value, text?}]} donut?={0.42} />   a thick pie or donut, values on it
  <CubeGrid x y cell rows={[...]} cols={[...]} values={[[...]]} t from to />   an isometric heatmap of rising cubes
  <HeatTiles x y w h rows cols values t from to scale?={["Low","Medium","High"]} />   a flat tile heatmap with a scale bar
  <Panel x y w h t at kicker? title?>{children, panel-relative px}</Panel>   a card in the film's shape and material (glass,
     stone, clay, paper...): use it for any box that holds a chart, a number or a list
  import { Enter } from "../../../print/enter";
  <Enter t at>{anything}</Enter>   makes ANY drawn piece arrive in the film's motion (Panel, Board, Plate already do):
     wrap your own drawings in it instead of hand-writing fades, so the whole film moves one way
  The SET (window light, stone plinths, a dark wave, colour discs...) is drawn behind every scene by the player.
  <Plate x y w h t at src={staticFile("...")} focus?={[fx, fy]} caption? credit? cut? />   a REAL photo printed as a
     duotone plate; cut = a paper cut-out (a paper border, a slight tilt, lifted off the page). Only the photos the
     design gives you, with their exact src and credit; import staticFile from "remotion".
- map -> the REAL MAP KIT (when given), skin="paper".
- Nothing appears before its word.
DRAW WHAT THE LIBRARY LACKS: when a scene needs a THING no listed library piece shows (a soop of fruit at a river ghat,
a temple, a festival lamp, a costume, a tool, an animal), draw it yourself as a NEW PIECE, so it can be kept in the
library for the next film. A NEW PIECE is a top-level component above the scenes, in exactly this form:
  /** NEW PIECE: what it is and how it moves, then the topics it suits (Chhath, a village, Bihar, a festival) */
  function ChhathSoop({ size = 420, at = 0 }: { size?: number; at?: number }) {
    const { t, theme } = useScene();   // t: seconds into the scene; theme.ink, theme.accent, theme.accent2, theme.paper
    const k = clamp01((t - at) / 0.8);
    return <svg width={size} height={size} viewBox="0 0 400 400" style={{ overflow: "visible" }}>…</svg>;
  }
  - It draws ONLY its thing: no words, no scene numbers, no data from this film, no background. Every size inside it
    comes from its viewBox, so `size` scales it.
  - It is drawn in this film's look (outlines, flat fills, the inks), takes its colours from theme (or plain earth
    colours), and it MOVES from `at` on: it draws on, pops, sways, flickers, turns.
  - Its imports, besides React: useScene and clamp01 from "../../../argon/kit", ease from "../../../argon/lib/motion".
  - Use it like a library piece, in its region: <Region name="main" id="soop" design={[360, 360]}><Lib><ChhathSoop size={360} at={1.2} /></Lib></Region>.
  - Name it plainly for the thing (PascalCase, no film or scene name), never a name the library already has. One new
    piece per thing; reuse it in other scenes. Draw it with care: it will be used again."""


# ---------------- story films: told like a short animated film, the way the look showcases are (src/gallery/stories.tsx) ----------------
STORY_PLAN = """

HOW TO TELL IT: this is a STORY FILM, not an explainer. Tell it like a storyteller narrating a short animated film,
with an arc:
1. THE HOOK (1-3 lines): open inside one moment, in one place, at one time of day (the river at dawn, a kitchen at
   night): what the viewer sees and hears, before any explaining.
2. THE WHY (the heart): why people do this and what it means to them: the belief, and the legends exactly as the notes
   tell them, told as stories ("Kehte hain...", "The story goes...", "Mana jata hai..."), never stated as fact.
3. THE JOURNEY: what happens, in its real order (the days, the steps), each in a place with people doing things.
4. THE MOMENT: the most moving moment, slowed down and told closely (the light, the water, the faces).
5. THE CLOSE: back to the opening image, changed (the light has turned, the people have arrived), and one line that
   stays with the viewer.
Lines are spoken: short, warm, sensory (light, water, smoke, song, the smell of food), mostly present tense. In every
beat's `concept`, write a SHOT in a WORLD: where we are, the light, what the camera does, who moves. Facts only from the
notes; when the notes do not give a detail, leave it out rather than invent it."""

STORY_DESIGN = """

THIS IS A STORY FILM, shot like a short animated film in this look: LOOK_ART.
SEQUENCES, NOT SLIDES. Group the lines into 5-8 SEQUENCES. A sequence is ONE painted WORLD (a river ghat at dusk, a
village kitchen at night, the Sun's court in the sky) that stays on screen for several lines while the story moves
through it: people arrive, a lamp is lit, the light changes, the camera travels. Every scene of a sequence names the
same world in its `start` and says what has already happened there.
Every scene is scene_kind motion (drawn), and for every scene:
- camera: the shot: "wide establishing", "push in to the women in the water", "pan right to the sun", "pull back to
  reveal the whole ghat", "slow drift". In a sequence each scene's camera starts where the scene before ended; a
  sequence opens wide and often ends on a pull-back.
- start / end: the world, its LIGHT (night, predawn, sunrise, day, golden, dusk, lamplight) and who is where. The
  light moves with the story's time: dusk darkens, sunrise breaks.
- actors: the people (what they wear, what they hold), animals and things: one cast for the whole film.
- moves: what happens on which word: a woman lowers a soop to the water, the sun touches the river, steam rises.
- words: almost none: at most 4 per scene, and only INSIDE the world (a chapter painted on a wall or banner such as
  "Day 2 · Kharna", a name on a boat). Never titles, kickers, captions, labels with lines, charts, numbers on boards,
  panels, diagrams or devices. chart: none.
- device: journey, transform, before-after or timeline (whatever the moment is); idea: what the viewer should FEEL and
  understand in this moment.
- transition: cut between scenes of one sequence (the shot simply goes on); a new sequence enters by fade (time passes,
  a new place) or zoom (into a legend or a memory).
A LEGEND is a sequence of its own, in its own world (the sky, a palace, the epic past), painted like a memory.
A NUMBER only when the line says it, and then shown as a thing (36 hours: the sun going round), never as a chart."""

STORY_WRITE = """YOU ANIMATE A SHORT FILM, scene by scene, in this film's one look:
ART_DIRECTION
- WORLDS: every scene paints its WHOLE world, edge to edge, from far to near: <Sky> (its time's light), the far land,
  the river or the room, the people and things, then a near layer (reeds, a pillar's edge, a lamp) for depth. Write each
  sequence's world ONCE as a component (function GhatWorld({ light }: { light: string }) { ... }) and use it in every
  scene of that sequence, so the place stays the same while the story moves through it.
- CAMERA: wrap the world in <Camera keys={[[0, fx, fy, zoom], [seconds, fx2, fy2, zoom2]]}> and follow the storyboard's
  shot. In a sequence, a scene's first key is the last key of the scene before, so the shot never jumps. Never a frame
  that stands still: at least a slow push or drift.
- LIGHT: <Sky time to at dur> turns the light during a scene (dusk going dark, sunrise breaking); <Water> takes the
  same time; <Light tone> casts warm lamplight or gold over a sacred moment.
- LIFE: people walk, bend, raise their hands, carry, sing; water ripples; flames flicker; smoke and steam rise; birds
  cross; cloth sways. The library's people (<Person avatar pose>) and pieces go inside <Lib>, placed with <At>; draw a
  NEW PIECE for any thing the library lacks.
- WORDS: at most 4 per scene and only inside the world (painted on a wall, a banner, a boat), in <Type> from the kit,
  readable on what they sit on. Never captions, titles, kickers, labels with lines, charts, panels or boards: the
  narrator tells, the pictures show. The print kit's charts, boards, panels, tags and spreads are NOT used here.
- COLOURS: the look's inks and the natural colours of the world (sky, water, skin, fire), drawn in the look's manner
  (flat and outlined for a folk look).
- Nothing appears before its word; within a scene the world comes first, then the people, then what they do.
CINEMA KIT (part of the PRINT KIT): import { Camera, Sky, Water, Light, Drift } from "../../../print/cinema";
PRINT KIT (only these): import { Type, appear, clamp01, useDNA } from "../../../print/kit"; import { Enter } from "../../../print/enter";
"""

STORY_CONTRACT = """- export const MOTION: Record<number, React.FC> = { 1: Scene1, 2: Scene2, ... }: EVERY scene, keyed by scene number.
  Each scene takes no props and is played alone, so useCurrentFrame() is 0 at its start: const t = useCurrentFrame() / fps.
- A scene paints its whole world edge to edge (it is its own background); the player lays the paper's grain under it."""

FRAME_STORY = """
- flat: the scene is a diagram, chart or slide on blank paper, or an empty page, instead of a painted world with its sky
  or room and people; this is a story film"""


LIB_PICK = """You pick, for each scene of a film, 0-2 pieces from THE MOTION LIBRARY that show the scene's THINGS and make them
act (a ship sails: Vehicle; servers trade data: CloudServers; a crowd gathers: Assemble). Pick by what the piece DOES and
only when it shows a real thing the scene is about. Never for charts, numbers, titles or text (the film draws those).
The same piece in at most two scenes. None fits: an empty list. Reply {"scenes": [{"line": 0, "motions": ["..."]}]}."""


LIB_PICK_ALL = """You pick, for each SHOT of a hand-painted film, 0-3 pieces from THE MOTION LIBRARY that the shot needs:
people, a crowd, a vehicle, a creature, a robot, an object, a set, a motion (fire, smoke, a ripple, a pour, day turning to
night, a calendar turning), anything. Pick by what the piece DOES and only when it shows a real thing the shot is about;
the film's own cast (its main people and things) is drawn already, so never pick a piece for them. A piece may come back
when its thing comes back. None fits: an empty list. Reply {"scenes": [{"line": 0, "motions": ["..."]}]}."""


def pick_library(p: dict, d: dict, shots: dict | None = None) -> dict[int, list[str]]:
    """the library pieces (src/argon/lib) that suit each drawn scene of a look film; one short ask; optional, so a
    failure picks none. A normal look film: only the block groups its family allows (video/looks.py blocks) plus the
    layer-1 motions, for its motion scenes. A drawn film (shots given): the whole library, for every shot"""
    if shots is not None:
        lib = list(argon.library())
        scenes = [(i, s) for i, s in sorted(shots.items())]
        text = lambda i, s: f"{s.get('shot', '')} | {s.get('setting', '')} | {s.get('subject', '')} | {s.get('action', '')}"
    else:
        allowed = set(lookmod.FAMILIES[p["dna"]["family"]].get("blocks", []))
        allowed |= {"MADHUBANI", "TRUCK ART", "MUGHAL MINIATURE", "KOLAM", "GROWN"}  # folk art and what films grew take the film's colours: any look
        lib = [e for e in argon.library() if e["layer"] == 1 or e["group"] in allowed]
        scenes = [(i, s) for i, s in enumerate(d["scenes"]) if (s.get("scene_kind") or "motion") == "motion"]
        text = lambda i, s: s.get("idea", "")
    names = {e["name"] for e in lib}
    if not scenes:
        return {}
    ask = ("THE MOTION LIBRARY:\n" + "\n".join(f"{e['name']} [{e['group']}]: {e['does']}" for e in lib) + "\n\nTHE SCENES:\n"
           + "\n".join(f"{i}. {p['lines'][i]} | {text(i, s)}" for i, s in scenes))
    try:
        got = json.loads(argon.think(ask, LIB_PICK_ALL if shots is not None else LIB_PICK, argon.Picks, model=argon.fallback_model(), max_tokens=6000, tries=3)).get("scenes", [])
    except Exception as e:
        say(f"Library lookup skipped ({str(e)[:60]}): Gemini draws every thing itself", "write")
        return {}
    picks = {int(x["line"]): [m for m in x.get("motions") or [] if m in names][:3 if shots is not None else 2] for x in got if isinstance(x.get("line"), int)}
    return {i: m for i, m in picks.items() if m}


def library_for_print(picks: dict[int, list[str]]) -> str:
    """the picked library pieces with their exact props and import paths, and how a look film draws them"""
    got = {e["name"]: e for e in argon.library() if any(e["name"] in m for m in picks.values())}
    if not got:
        return ""
    return ("\n\nTHE MOTION LIBRARY PIECES picked for these scenes (use them; props exactly as typed). Draw them inside <Lib> "
            '(import { Lib } from "../../../print/bridge") so they take the film\'s inks, fonts and library look; place each with '
            '<At x y> (import { At } from "../../../argon/kit"); give `at` in seconds from the scene start:\n'
            + "\n".join(f"- scene {i + 1}: " + "; ".join(f"{n}({got[n]['props']}): {got[n]['does']}. import {{ {n} }} from \"../../../argon/lib/{got[n]['file'][:-4]}\""
                                                        for n in names if n in got) for i, names in sorted(picks.items())))


# the player's own pieces (the page, the look for map scenes) and the old full-frame spreads: never for a drawn scene
PLAYER_ONLY = {"Sheet", "WithDNA", "BigNumber", "InkPie", "InkHeatmap", "InkBars", "Steps", "Headline", "PrintPhoto"}


def print_pieces() -> str:
    """every piece the print kit exports that the rules above do not list yet, read from the code with its doc comment,
    so a piece added to src/print/*.tsx reaches the writer without anyone editing this prompt"""
    out = []
    for fn in ("kit.tsx", "spread.tsx", "depth.tsx", "enter.tsx", "cinema.tsx"):
        code = open(os.path.join(HERE, "src", "print", fn)).read()
        for m in re.finditer(r"/\*\*((?:(?!\*/).)*?)\*/\s*export const (\w+): React\.FC<(\{.*?\})>", code, re.S):
            doc, name, props = m.group(1), m.group(2), m.group(3)
            if re.search(rf"<{name}\b", PRINT_WRITE) or name in PLAYER_ONLY:
                continue
            doc = " ".join(l.strip(" *") for l in doc.splitlines()).strip()
            out.append(f'  <{name}> from "../../../print/{fn[:-4]}": {doc[:260]}  props {re.sub(r"\s+", " ", props)[:260]}')
    return ("\nMORE PIECES (read from the code; same theme rules):\n" + "\n".join(out)) if out else ""


def print_write(p: dict) -> str:
    """the writer's look rules for this film: the shared rules with the film's own art direction in them; a story film
    gets the film rules (worlds, camera, light) with the same NEW PIECE rule"""
    if p.get("story"):
        rule = PRINT_WRITE[PRINT_WRITE.index("DRAW WHAT THE LIBRARY LACKS"):]
        rule = re.sub(r"  - Use it like a library piece, in its region:.*?\n", "  - Use it like a library piece, inside <Lib> and placed in the world with <At>: "
                      "<Lib><At x={900} y={420}><ChhathSoop size={360} at={1.2} /></At></Lib>.\n", rule, count=1)
        return STORY_WRITE.replace("ART_DIRECTION", lookmod.art_direction(p["dna"])) + rule + print_pieces()
    return PRINT_WRITE.replace("ART_DIRECTION", lookmod.art_direction(p["dna"])) + print_pieces()

PRINT_CONTRACT = """- export const MOTION: Record<number, React.FC> = { 2: Scene2, 5: Scene5, ... }: ONLY the scenes whose kind is motion
  or map, keyed by scene number. Do NOT write spread or photo scenes: the player builds them from the storyboard.
  Each scene takes no props and is played alone, so useCurrentFrame() is 0 at its start: const t = useCurrentFrame() / fps.
- A motion scene draws ONLY its pieces on a TRANSPARENT layer (no ground, no background, no full-frame rect): the player
  puts it on the printed sheet. A map scene uses the REAL MAP KIT full frame (it is its own ground)."""

SPREAD_LAYOUTS = ("number", "stamps", "steps", "grid", "pie", "combo", "bars", "walk", "headline")


PIECE_MIN = {"title": (3, 1), "text": (3, 1), "kicker": (2, 1), "watermark": (1, 1), "number": (3, 2), "board": (3, 3), "glassbars": (3, 3),
             "pie": (3, 3), "legend": (3, 1), "grid": (4, 3), "combo": (6, 3), "bars": (4, 3), "steps": (6, 2), "stamps": (4, 2),
             "walk": (6, 2), "headline": (6, 2)}
QUIET = ("kicker", "watermark")


def arrangement(pieces: list[dict]) -> str:
    """a page's arrangement: the hero's kind and where it sits, and whether a board splits the page"""
    real = [x for x in pieces if x.get("kind") not in QUIET and x.get("kind") != "board"]
    if not real:
        return "empty"
    hero = max(real, key=lambda x: x.get("w", 0) * x.get("h", 0))
    cx = hero.get("col", 0) + hero.get("w", 0) / 2
    side = "full" if hero.get("w", 0) >= 10 else "left" if cx < 5 else "right" if cx > 7 else "centre"
    board = next((("board-" + ("left" if b.get("col", 0) + b.get("w", 0) / 2 < 6 else "right")) for b in pieces if b.get("kind") == "board"), "paper")
    return f"{hero.get('kind')}@{side}/{board}"


def compose_problems(pieces: list[dict]) -> list[str]:
    """what breaks a composed page: boxes out of the grid or too small, overlaps, too little of the page used, no hero,
    a piece without its data"""
    out = []
    if not 2 <= len(pieces) <= 7:
        out.append(f"the page has {len(pieces)} pieces: use 2-6")
    cells: set = set()
    for n, x in enumerate(pieces):
        k, c, r, w, h = x.get("kind", ""), x.get("col", 0), x.get("row", 0), x.get("w", 0), x.get("h", 0)
        name = f"piece {n + 1} ({k})"
        if k not in PIECE_MIN:
            out.append(f"{name}: unknown kind")
            continue
        if c < 0 or r < 0 or w < 1 or h < 1 or c + w > 12 or r + h > 6:
            out.append(f"{name}: box col {c} row {r} w {w} h {h} leaves the 12 x 6 grid")
        mw, mh = PIECE_MIN[k]
        if w < mw or h < mh:
            out.append(f"{name}: {w}x{h} is too small; at least {mw}x{mh}")
        items, vals = x.get("items") or [], [i for i in x.get("items") or [] if i.get("value") is not None]
        need = {"title": bool(x.get("text")), "text": bool(x.get("text")), "watermark": bool(x.get("text")), "kicker": bool(x.get("lines") or x.get("text")),
                "number": (x.get("number") or {}).get("to") is not None, "glassbars": len(vals) >= 1, "pie": len(vals) >= 2, "legend": len(items) >= 2,
                "grid": bool((x.get("grid") or {}).get("rows")), "combo": len([i for i in vals if i.get("value2") is not None]) >= 2, "bars": len(vals) >= 2,
                "steps": len(items) >= 2, "stamps": len(items) >= 2, "walk": True, "headline": len(items) >= 1, "board": True}[k]
        if not need:
            out.append(f"{name}: its data is missing")
        if k == "glassbars" and not any(b.get("kind") == "board" and c >= b["col"] and r >= b["row"] and c + w <= b["col"] + b["w"] and r + h <= b["row"] + b["h"] for b in pieces):
            out.append(f"{name}: glass bars must sit inside a board")
    flat = [x for x in pieces if x.get("kind") not in QUIET]
    for a in range(len(flat)):
        for b in range(a + 1, len(flat)):
            x, y = flat[a], flat[b]
            ov = x["col"] < y["col"] + y["w"] and y["col"] < x["col"] + x["w"] and x["row"] < y["row"] + y["h"] and y["row"] < x["row"] + x["h"]
            inside = lambda p, q: q.get("kind") == "board" and p["col"] >= q["col"] and p["row"] >= q["row"] and p["col"] + p["w"] <= q["col"] + q["w"] and p["row"] + p["h"] <= q["row"] + q["h"]
            if ov and not (inside(x, y) or inside(y, x)):
                out.append(f"{x['kind']} and {y['kind']} overlap")
    for x in flat:
        cells |= {(c, r) for c in range(x.get("col", 0), min(12, x.get("col", 0) + x.get("w", 0))) for r in range(x.get("row", 0), min(6, x.get("row", 0) + x.get("h", 0)))}
    if len(cells) < 36:
        out.append(f"the pieces cover {len(cells)} of 72 cells: use at least half of the page")
    sizes = [x.get("w", 0) * x.get("h", 0) for x in flat if x.get("kind") != "board"]
    if not sizes or max(sizes) < 15:
        out.append("no hero: make the piece that carries the line at least 5 columns x 3 rows")
    return out


def layout_of(s: dict) -> str:
    """the scene's visual kind for the rhythm rule: a composed page's arrangement, a spread's layout, else its scene kind"""
    k = s.get("scene_kind") or "motion"
    if k != "spread":
        return k
    sp = s.get("spread") or {}
    return "compose:" + arrangement(sp.get("pieces") or []) if sp.get("layout") == "compose" else sp.get("layout") or "headline"


REFS = os.path.join(HERE, "public", "print", "refs")


def with_refs(ask: str, family: str = "paper") -> list | str:
    """the writer's brief with the look family's reference images in front of it (public/print/refs/<family>/); a
    family with no references gets the brief alone"""
    from google.genai import types
    d = os.path.join(REFS, family)
    imgs = sorted(f for f in os.listdir(d) if f.endswith(".jpg")) if os.path.isdir(d) else []
    if not imgs:
        return ask
    return [types.Part.from_bytes(data=open(os.path.join(d, f), "rb").read(), mime_type="image/jpeg") for f in imgs] + [
        "THE THEME REFERENCES are the images above: draw every scene in their look.\n\n" + ask]


def print_rhythm(d: dict) -> list[tuple[int, str]]:
    """(scene index, layout) for every scene that repeats the layout of the scene before"""
    out, prev = [], ""
    for i, s in enumerate(d["scenes"]):
        k = layout_of(s)
        if i and k == prev and k not in ("map", "motion"):
            out.append((i, k))
            k = ""  # the redraw changes it; do not flag the next one against it
        prev = k
    return out


def spread_gaps(s: dict) -> str:
    """what a spread's layout is missing to be built (empty when complete): such a card is redrawn at plan time"""
    if (s.get("scene_kind") or "") != "spread":
        return ""
    sp = s.get("spread") or {}
    lay, items = sp.get("layout") or "", sp.get("items") or []
    if lay == "compose":
        return "; ".join(compose_problems(sp.get("pieces") or []))
    vals = [x for x in items if x.get("value") is not None]
    need = {"number": (sp.get("number") or {}).get("to") is not None or "NUMBER (to, label, word)",
            "stamps": len(items) >= 2 or "4-12 ITEMS (label, text, word)",
            "steps": len(items) >= 2 or "2-4 ITEMS (label, note, word) and a TOKEN if something travels",
            "grid": bool((sp.get("grid") or {}).get("rows")) and bool(sp.get("number")) or "GRID (rows, cols, from_word, to_word) and NUMBER (the total)",
            "pie": len(vals) >= 2 or "2-4 ITEMS with value (the slices)",
            "combo": len([x for x in vals if x.get("value2") is not None]) >= 2 or "3-6 ITEMS with value and value2 (the periods), KEYS and a CALLOUT",
            "bars": len(vals) >= 2 or "2-6 ITEMS with value",
            "walk": len(items) >= 1 or "2 ITEMS (the two headline lines) and a TOKEN (go_word, arrive_word)",
            "headline": len(items) >= 1 or "2-3 ITEMS (the lines, each with its word and effect)"}.get(lay, f"a known layout ({', '.join(SPREAD_LAYOUTS)})")
    return "" if need is True else need


def cues(x: dict, W, dur: float) -> dict:
    """a spread's or a piece's data with every cue word turned into seconds: items, number, token, grid, callout"""
    out: dict = {"items": []}
    at = 0.1
    for it in x.get("items") or []:
        at = W(it.get("word"), at, at + 0.6)
        r = {"label": it.get("label") or "", "text": it.get("text") or "", "note": it.get("note") or "", "value": it.get("value"), "value2": it.get("value2"),
             "at": at, "effect": it.get("effect") or ""}
        if r["effect"] == "cross":
            r["value"] = W(it.get("word2"), at, at + 0.8)  # a struck step carries the time it is struck
        out["items"].append(r)
    if (n := x.get("number")) and n.get("to") is not None:
        nat = W(n.get("word"), 0, 0.3)
        out["number"] = {"to": n["to"], "prefix": n.get("prefix") or "", "suffix": n.get("suffix") or "", "decimals": int(n.get("decimals") or 0),
                         "label": n.get("label") or "", "note": n.get("note") or "", "at": nat, "note_at": W(n.get("note_word"), nat, nat + 1.0)}
    if tk := x.get("token"):
        tat = W(tk.get("word"), 0, 0.5)
        go = W(tk.get("go_word"), tat, tat + 0.5)
        out["token"] = {"text": tk.get("text") or "", "at": tat, "go": go, "arrive": max(go + 0.6, W(tk.get("arrive_word"), go, go + 1.6))}
    if g := x.get("grid"):
        fr = W(g.get("from_word"), 0, 0.4)
        out["grid"] = {"rows": int(g.get("rows") or 1), "cols": int(g.get("cols") or 1), "col_labels": g.get("col_labels") or [], "legend": g.get("legend") or "",
                       "from": fr, "to": max(fr + 0.8, W(g.get("to_word"), fr, dur - 1.0))}
    if c := x.get("callout"):
        out["callout"] = {"text": c.get("text") or "", "note": c.get("note") or "", "at": W(c.get("word"), 0, dur * 0.6)}
    return out


def page_pieces(pieces: list[dict], W, dur: float) -> list[dict]:
    """a composed page ready to draw: boxes pulled into the grid, a piece that breaks the page rules (no data, too small,
    overlapping one placed before it) left out, every cue word in seconds"""
    kept: list[dict] = []
    for x in pieces:
        k = x.get("kind", "")
        if k not in PIECE_MIN:
            continue
        w, h = max(1, min(12, int(x.get("w") or 1))), max(1, min(6, int(x.get("h") or 1)))
        c, r = max(0, min(12 - w, int(x.get("col") or 0))), max(0, min(6 - h, int(x.get("row") or 0)))
        y = {**x, "col": c, "row": r, "w": w, "h": h}
        if compose_problems([y, {"kind": "board", "col": 0, "row": 0, "w": 12, "h": 6}] if k == "glassbars" else [y, y]) and any(
                "data is missing" in e or "too small" in e for e in compose_problems([y, y])):
            continue
        if k not in QUIET and any(e.endswith("overlap") for e in compose_problems(kept + [y])):
            continue
        kept.append(y)
    first = min([W(x.get("word"), 0, 0.2) for x in kept] or [0.2])
    out = []
    for y in kept:  # the first piece is there within the first second, so the page never opens empty
        at = W(y.get("word"), 0, 0.3)
        out.append({"kind": y["kind"], "col": y["col"], "row": y["row"], "w": y["w"], "h": y["h"], "at": min(at, 0.4) if at == first else at,
                    "text": y.get("text") or "", "lines": y.get("lines") or [], "foot": y.get("foot") or "", "keys": y.get("keys") or [], **cues(y, W, dur)})
    return out


def spread_spec(s: dict, words: list[dict], i: int, seed: int, dur: float) -> dict:
    """a scene's printed spread with every cue word turned into seconds on the real voice; a spread missing the data its
    layout needs becomes a headline of its takeaway, so the film always plays"""
    sp = s.get("spread") or {}
    W = lambda w, after=0.0, fb=0.3: word_at(words, w or "", after, fb)
    spec: dict = {"layout": sp.get("layout") or "headline", "seed": seed, "flip": seed % 2 == 1, "kicker": [k for k in sp.get("kicker") or [] if k][:3],
                  "title": sp.get("title") or "", "title_at": W(sp.get("title_word"), 0, 0.1), "watermark": sp.get("watermark") or "",
                  "keys": sp.get("keys") or [], "items": []}
    spec.update(cues(sp, W, dur))
    if b := sp.get("board"):
        spec["board"] = {"title": b.get("title") or [], "tag": b.get("tag") or [], "foot": b.get("foot") or ""}
    if spec["layout"] == "compose":
        spec["pieces"] = page_pieces(sp.get("pieces") or [], W, dur)
    vals = [x for x in spec["items"] if x["value"] is not None]
    lay = spec["layout"]
    ok = {"number": bool(spec.get("number")), "stamps": len(spec["items"]) >= 2, "steps": len(spec["items"]) >= 2, "grid": bool(spec.get("grid")),
          "pie": len(vals) >= 2, "combo": len(vals) >= 2, "bars": len(vals) >= 2, "walk": len(spec["items"]) >= 1, "headline": len(spec["items"]) >= 1,
          "compose": len([x for x in spec.get("pieces") or [] if x["kind"] not in QUIET]) >= 1}.get(lay, False)
    if s.get("scene_kind") == "photo" and (s.get("photo") or {}).get("src"):
        ph = s["photo"]
        spec.update(layout="photo", photo={"src": ph["src"], "w": ph["w"], "h": ph["h"], "focus": ph.get("focus") or [0.5, 0.5],
                                           "caption": ph.get("caption") or "", "credit": ph.get("credit") or ""}, title_at=W(ph.get("word"), 0, 1.0))
    elif not ok:
        text = spec["title"] or (s.get("words") or [""])[0] or s.get("takeaway") or s.get("idea") or ""
        spec.update(layout="headline", items=[{"label": text[:40], "at": 0.2, "effect": "bar"}])
    return spec


def print_scenes(d: dict, voice: list[dict], dna: dict, slug: str) -> str:
    """scenes.tsx for a print film: every spread and photo scene built from the storyboard with the print layouts, in the
    film's DNA, on the real word times; motion and map scenes come from the model's film.tsx (MOTION), inked on the sheet.
    A motion scene the model did not write falls back to a printed headline of its takeaway."""
    j = lambda v: json.dumps(v, ensure_ascii=False)
    base = int(hashlib.sha1(slug.encode()).hexdigest(), 16) % 997
    out = ["/* written by video/oneshot.py from the storyboard (print film): spreads from src/print/layouts.tsx, motion scenes from film.tsx */",
           'import React from "react";', 'import { useCurrentFrame } from "remotion";',
           'import { Inked, loadPrintFonts, Sheet, WithDNA, type DNA } from "../../../print/kit";', 'import { Spread } from "../../../print/layouts";',
           'import { MOTION } from "./film";', "",
           f"const PRINT = {j({k: v for k, v in dna.items() if k != 'name'})} as DNA;", "loadPrintFonts(PRINT);",
           "const useT = () => useCurrentFrame() / 30;", ""]
    names = []
    for i, s in enumerate(d["scenes"]):
        k, name, dur = s.get("scene_kind") or "motion", f"S{i + 1}", voice[i]["seconds"] + PAD
        names.append(name)
        spec = spread_spec(s, voice[i]["words"], i, base + i * 7, dur)
        page = f"<Sheet dna={{PRINT}} page={{{i + 1}}}>"
        if k in CODE_KINDS:
            fallback = j({**spec, "layout": "headline", "items": [{"label": (s.get("takeaway") or s.get("idea") or "")[:40], "at": 0.2, "effect": "bar"}]})
            body = (f"M ? <WithDNA dna={{PRINT}}><M /></WithDNA> : {page}<Spread spec={{{fallback}}} t={{t}} dur={{{dur:.2f}}} /></Sheet>" if k == "map"
                    else f"{page}{{M ? <M /> : <Spread spec={{{fallback}}} t={{t}} dur={{{dur:.2f}}} />}}</Sheet>")
            out.append(f"const {name}: React.FC = () => {{\n  const t = useT();\n  const M = MOTION[{i + 1}];\n  return {body};\n}};\n")
        else:
            out.append(f"const {name}: React.FC = () => {{\n  const t = useT();\n  return {page}<Spread spec={{{j(spec)}}} t={{t}} dur={{{dur:.2f}}} /></Sheet>;\n}};\n")
    out.append(f"export const SCENES: React.FC[] = [{', '.join(names)}];\n")
    return "\n".join(out)


def design_extra(p: dict) -> str:
    looks = "" if p.get("print") else look_rules(p.get("style", ""))[0]  # a print film has one look: the print theme
    pd = ((STORY_DESIGN if p.get("story") else PRINT_DESIGN).replace("LOOK_ART", lookmod.FAMILIES[(p.get("dna") or {}).get("family") or "paper"]["art"])
          if p.get("print") else "")
    if p.get("print"):
        pd += "\n" + lookmod.world((p.get("dna") or {}).get("family") or "paper")
    return looks + (CLEAR_DESIGN if p.get("clear") else "") + (pd if p.get("print") else MIX_DESIGN if p.get("mix") else "")


FIX_SYSTEM = """You fix TypeScript compile errors (or a render crash) in one Remotion film file, changing as little as
possible. You get the errors and the numbered lines around them. Answer ONLY with patches in this exact format, one or
more, nothing else:

<<<FIND
exact text copied from the file (a few whole lines, unique in the file)
===
the replacement text
>>>

Keep the film's design and timing; fix only what breaks."""


def say(msg: str, kind: str = "info", line: int | None = None, **kw) -> None:
    """one step of the run: into run.log and, for the app's editor, live/events.jsonl (kind picks its icon; line: which
    spoken line it is about)"""
    stamp = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(stamp, flush=True)
    if LOG_PATH:
        open(LOG_PATH, "a").write(stamp + "\n")
        live = os.path.join(os.path.dirname(LOG_PATH), "live")
        os.makedirs(live, exist_ok=True)
        open(os.path.join(live, "events.jsonl"), "a").write(json.dumps({"t": round(time.time(), 2), "kind": kind, "text": msg.split("\n")[0], "scene": line, **kw}, ensure_ascii=False) + "\n")


def live_file(name: str, data: dict) -> None:
    """what the editor shows this second (live/write.json: the code as it streams in; live/render.json; live/progress.json)"""
    if not LOG_PATH:
        return
    p = os.path.join(os.path.dirname(LOG_PATH), "live", name)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump({**data, "t": round(time.time(), 2)}, open(p + ".tmp", "w"), ensure_ascii=False)
    os.replace(p + ".tmp", p)


def streamer(name: str, every: float = 0.6):
    """a live= callback for argon.think: the answer so far, at most every `every` seconds"""
    last = [0.0]

    def put(text: str) -> None:
        if time.time() - last[0] >= every:
            last[0] = time.time()
            live_file(name, {"state": "streaming", "text": text[-24000:], "chars": len(text), "lines": text.count("\n") + 1})
    return put


def waiter(tries: int, reason: str, seconds: float) -> None:
    say(f"{reason}: trying again in {seconds:.0f} s (try {tries})", "waiting")


def publish() -> None:
    """The app's files: each experiment's code next to its report, and the list of every experiment."""
    items = []
    for slug in sorted(os.listdir(PUBLIC)) if os.path.isdir(PUBLIC) else []:
        d = os.path.join(PUBLIC, slug)
        if not os.path.isdir(d):
            continue
        film = os.path.join(HERE, "src", "oneshot", "gen", slug, "film.tsx")
        if os.path.exists(film):
            open(os.path.join(d, "film.tsx.txt"), "w").write(open(film).read())
        r = json.load(open(os.path.join(d, "report.json"))) if os.path.exists(os.path.join(d, "report.json")) else {}
        plan = next((x for x in (os.path.join(d, "plan.json"), os.path.join(HERE, "public", "argon", slug, "plan.json")) if os.path.exists(x)), "")
        p = json.load(open(plan)) if plan else {}
        video = os.path.join(HERE, "out", f"oneshot-{slug}.mp4")
        items.append({"slug": slug, "title": p.get("title") or p.get("topic", slug), "topic": p.get("topic", ""), "state": r.get("state", "running"),
                      "scenes": r.get("scenes"), "lines": r.get("lines_final"), "calls": r.get("model_calls"), "usd": r.get("usd"),
                      "video": f"/studio-out/oneshot-{slug}.mp4?v={int(os.path.getmtime(video))}" if os.path.exists(video) else "",
                      "updated": time.strftime("%d %b %H:%M", time.localtime(os.path.getmtime(d)))})
    os.makedirs(PUBLIC, exist_ok=True)
    json.dump({"experiments": items}, open(os.path.join(PUBLIC, "index.json"), "w"), indent=1)


def brief(p: dict, voice: list[dict], W: int, H: int, cap: int) -> str:
    th = p["theme"]
    colours = {k: th[k] for k in ("bg", "ink", "accent", "accent2", "paper", "muted") if th.get(k)}
    if p.get("print"):  # a printed film: no captions, the film's inks, the print typefaces (the theme guide has the rest)
        dna = p["dna"]
        out = [f"TITLE: {p.get('title') or p['topic']}", f"TOPIC: {p['topic']}", f"FRAME: {W} x {H} px, 30 fps",
               "CAPTIONS: none. The WHOLE frame is yours, top to bottom.",
               f"COLOURS (the whole palette): ground {dna['paper']}{' (DARK)' if dna.get('dark') else ''}, key ink {dna['ink']}, inks {', '.join(dna['inks'])}, panel {dna.get('board', '#1b1a18')} with type {dna.get('boardInk', dna['paper'])}",
               "FONTS: all text through <Type> from the print kit (the film's print typefaces)", f"SCENES: {len(voice)}", ""]
    else:
        out = [f"TITLE: {p.get('title') or p['topic']}", f"TOPIC: {p['topic']}", f"FRAME: {W} x {H} px, 30 fps",
               f"CAPTION_SAFE: {cap} px at the bottom", f"MOOD: {th.get('mood', '')}",
               f"COLOURS (the whole palette): {json.dumps(colours)}",
               f"FONTS: FONTS.display ({th.get('display', 'playfair')}) for headings and numbers, FONTS.body ({th.get('font', 'inter')}) for text",
               f"SCENES: {len(voice)}", ""]
    for i, v in enumerate(voice):
        words = " ".join(f"{w['w']}@{w['s']:.2f}" for w in v["words"])
        out += [f"SCENE {i + 1}: duration {v['seconds'] + PAD:.2f} s", f"  voice: {p['lines'][i]}", f"  word times (s): {words}", ""]
    return "\n".join(out)


def code_of(text: str) -> str:
    m = re.search(r"```(?:tsx|typescript|ts)?\s*\n(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip() + "\n"


def write_shell(gen: str, slug: str, p: dict, voice: list[dict], W: int, H: int) -> None:
    """The fixed files around the model's film.tsx: its fonts, and the root that plays it through ArgonFilm."""
    th = p["theme"]
    if p.get("print"):
        th = {**th, "bg": [p["dna"]["paper"], p["dna"]["paper"]]}
    open(os.path.join(gen, "brief.ts"), "w").write(
        '/* written by video/oneshot.py: the fonts the one-shot film may use */\n'
        'import { family } from "../../../argon/kit";\n\n'
        f'export const FONTS = {{ display: family({json.dumps(th.get("display", "playfair"))}), body: family({json.dumps(th.get("font", "inter"))}) }};\n')
    sb = storyboard.load(slug)  # each scene enters the way its card says (src/argon/film.tsx Enter); legacy films cut
    cuts = [c["design"].get("transition") or "cut" for c in sb["cards"]] if sb and len(sb["cards"]) == len(voice) else ["cut"] * len(voice)
    cuts = [c if c in ("cut", "slide", "zoom", "wipe", "page", "fold", "rise") else "cut" for c in cuts]
    allowed = (p.get("dna") or {}).get("transitions")  # pinned in the look studio: only these, the storyboard's pick when it is one
    if allowed:
        cuts = [c if c in allowed else allowed[i % len(allowed)] for i, c in enumerate(cuts)]
    data = [{"audio": v["audio"], "seconds": v["seconds"], "words": v["words"], "text": p["lines"][i], "transition": cuts[i]} for i, v in enumerate(voice)]
    open(os.path.join(gen, "root.tsx"), "w").write(f"""/* written by video/oneshot.py: the one-shot film played through the unchanged ArgonFilm player */
import {{ Composition }} from "remotion";
import {{ ArgonFilm, filmFrames, type FilmScene }} from "../../../argon/film";
import type {{ Theme }} from "../../../argon/kit";
import {{ SCENES }} from "./{'scenes' if p.get('mix') else 'film'}";

const THEME = {json.dumps(th)} as unknown as Theme;
const DATA: FilmScene[] = {json.dumps(data)};

export const Root: React.FC = () => (
  <Composition id="OneShot" component={{() => <ArgonFilm scenes={{SCENES}} data={{DATA}} theme={{THEME}} dir="oneshot/{slug}"{' captions={false}' if p.get('print') else ''} />}}
    durationInFrames={{filmFrames(DATA)}} fps={{30}} width={{{W}}} height={{{H}}} />
);
""")
    open(os.path.join(gen, "entry.ts"), "w").write('import { registerRoot } from "remotion";\nimport { Root } from "./root";\n\nregisterRoot(Root);\n')
    json.dump({"extends": os.path.relpath(os.path.join(HERE, "tsconfig.json"), gen), "include": ["./*.tsx", "./*.ts"]},
              open(os.path.join(gen, "tsconfig.json"), "w"))


GROUND_THEN_DIV = re.compile(r"(<\w*(?:Ground|Background|Bg)\b[^>]*/>\s*\n(\s*)<div\s*\n?\s*style=\{\{)(?![^}]*position)")


def lift_over_ground(src: str) -> tuple[str, int]:
    """A scene that paints an absolutely positioned ground and then a plain <div> shows only the ground (the browser
    paints positioned boxes over static ones). Give such a wrapper position: relative, so it is painted over the ground.
    Deterministic, no model call; returns the new source and how many wrappers it lifted."""
    return GROUND_THEN_DIV.subn(lambda m: m.group(1) + ' position: "relative",', src)


def compile_errors(gen: str) -> list[str]:
    """tsc on the film: the errors in film.tsx (the only file the model writes)."""
    r = subprocess.run([argon.NPX, "tsc", "--noEmit", "-p", os.path.join(gen, "tsconfig.json")], cwd=HERE, capture_output=True, text=True)
    lines = (r.stdout + r.stderr).splitlines()
    own = os.path.relpath(os.path.join(gen, "film.tsx"), HERE) + "("  # this film's file only: the player is src/argon/film.tsx too
    return [ln for ln in lines if ln.startswith(own) and ": error " in ln]


def around(src: str, line_nos: list[int], ctx: int = 8) -> str:
    """The numbered lines around each error: all the model needs to patch it."""
    lines, keep = src.splitlines(), set()
    for n in line_nos:
        keep.update(range(max(1, n - ctx), min(len(lines), n + ctx) + 1))
    out, prev = [], 0
    for n in sorted(keep):
        if prev and n > prev + 1:
            out.append("...")
        out.append(f"{n:4d}| {lines[n - 1]}")
        prev = n
    return "\n".join(out)


def apply_patches(src: str, answer: str) -> tuple[str, int, int]:
    """Applies <<<FIND ... === ... >>> patches; returns the new source, patches applied and patches whose FIND was missing."""
    done = missed = 0
    unnumber = lambda s: re.sub(r"^\s*\d+\| ?", "", s, flags=re.M) if all(re.match(r"^\s*\d+\|", l) for l in s.splitlines() if l.strip()) else s
    for find, repl in re.findall(r"<<<FIND\n(.*?)\n===\n(.*?)\n?>>>", answer, re.S):
        find, repl = unnumber(find), unnumber(repl)
        if find and find in src:
            src = src.replace(find, repl, 1)
            done += 1
            continue
        # the same lines with other indentation: match line by line, ignoring the spaces around each
        want, lines = [l.strip() for l in find.splitlines() if l.strip()], src.splitlines()
        at = next((k for k in range(len(lines)) if want and [l.strip() for l in lines[k:k + len(want)]] == want), -1)
        if at >= 0:
            src = "\n".join(lines[:at] + repl.splitlines() + lines[at + len(want):]) + "\n"
            done += 1
        else:
            missed += 1
    return src, done, missed


NON_TEXT = {"src", "d", "fill", "stroke", "color", "background", "fontFamily", "transform", "viewBox", "className", "key", "id", "kind",
            "points", "strokeLinecap", "strokeLinejoin", "textAnchor", "dominantBaseline", "preserveAspectRatio", "xmlns", "mode",
            "position", "display", "justifyContent", "alignItems", "textAlign", "overflow", "fontWeight", "whiteSpace", "pose", "look",
            # SVG plumbing: filters, gradients, masks and links name things, they never show ("SourceGraphic", "coloredBlur")
            "in", "in2", "result", "operator", "values", "type", "filter", "filterUnits", "gradientUnits", "patternUnits", "maskUnits",
            "clipPathUnits", "spreadMethod", "href", "xlinkHref", "clipPath", "mask", "markerEnd", "markerStart", "fontStyle",
            "textDecoration", "textTransform", "mixBlendMode", "pointerEvents", "visibility", "fillRule", "clipRule", "vectorEffect"}
CODE_NAME = re.compile(r"^[A-Za-z]*[a-z][A-Z][A-Za-z0-9]*$")  # one camelCase or PascalCase token is a name in code, not words on screen


def screen_words(src: str, allowed: list[str]) -> list[str]:
    """Words the film puts on screen that its design does not name (headlines, panels, tags, sentences). Flipped on purpose:
    every JSX text and every text-like string counts as words on screen unless it is a known non-text prop."""
    ok = [a.lower() for a in allowed if a.strip()]
    hits = []
    for n, line in enumerate(src.splitlines(), 1):
        if line.lstrip().startswith(("import ", "//", "*", "/*")):
            continue
        texts = re.findall(r">([^<>{}=;()&|?]*[A-Za-z]{2}[^<>{}=;()&|?]*)<", line)
        for name, val in re.findall(r"(\w+)\s*[=:]\s*[\"'`]([^\"'`$]*)[\"'`]", line):
            if name not in NON_TEXT and re.search(r"[A-Z]", val):  # all lower case is a css value ("center bottom")
                texts.append(val)
        texts += re.findall(r"[\[,]\s*[\"']([^\"']*[A-Z][a-z]*[^\"']*)[\"']", line)  # strings in a list of names
        for t in (" ".join(t.split()) for t in texts):
            if not re.search(r"[A-Za-z]{2}", t) or re.search(r"[()%#;]|\d(px|em|rem|deg|ms|s)\b|^[a-z-]+$", t) or CODE_NAME.match(t):  # css values and code words
                continue
            if not any(t.lower() in a or a in t.lower() for a in ok):
                hits.append(f"line {n}: \"{t}\"")
    return list(dict.fromkeys(hits))


def fix(film: str, src: str, problem: str, line_nos: list[int], raw_dir: str, tag: str, tries: int = 0) -> tuple[str, int, int]:
    user = f"{problem}\n\nTHE LINES AROUND THEM (from film.tsx):\n{around(src, line_nos) if line_nos else src[:6000]}"
    answer = argon.think(user, FIX_SYSTEM, max_tokens=8000, tries=tries)
    open(os.path.join(raw_dir, f"raw-{tag}.txt"), "w").write(answer)
    new, done, missed = apply_patches(src, answer)
    open(film, "w").write(new)
    return new, done, missed


class Exp(argon.Film):
    """An experiment's own story and voice, kept in public/oneshot/<slug>: it never shows up as an unfinished argon film."""

    def __init__(self, slug: str, gen: str):
        self.slug, self.dir, self.gen = slug, os.path.join(PUBLIC, slug), gen
        os.makedirs(self.dir, exist_ok=True)


def story(f: Exp, topic: str, minutes: float) -> tuple[dict, list[dict]]:
    """The narration (the argon planner's story) and its voice with every word timed."""
    cost.stage("story")
    p = argon.plan(f, topic, "English", [], False, "", {}, minutes)
    cost.stage("voice")
    vo = argon.voice(f, p)
    for i, v in enumerate(vo):  # the voice lives with the experiment
        v["audio"] = f"oneshot/{f.slug}/voice-{i:02d}.wav"
    f.write("voice.json", vo)
    return p, vo


def look_rules(style: str) -> tuple[str, str]:
    """the film's chosen looks (video/styles.py DRAWN): a paragraph for the designer and one for the writer; they replace
    the four default looks. No style: the four default looks stay."""
    ls = styles.drawn(style)
    if not ls:
        return "", ""
    ids = " | ".join(ls)
    design_extra = (f"\n\nTHIS FILM'S LOOKS (they replace diagram/paper/collage/kinetic): every scene's look is one of {ids}. Keep a "
                    "run of scenes in one look and switch on a turn of the story. Pick the ONE ground that suits these looks.\n"
                    + "\n".join(f"{k}: {v}" for k, v in ls.items()))
    write_extra = ("THIS FILM'S LOOKS (they replace the FOUR LOOKS above; draw each scene in the look its design names, on the "
                   "film's one ground):\n" + "\n".join(f"{k} = {v}" for k, v in ls.items()))
    return design_extra, write_extra


def design(p: dict, vo: list[dict], out: str, extra: str = "") -> dict:
    """The design pass: the eight questions for every scene, in one ask."""
    ask = f"TOPIC: {p['topic']}\nTITLE: {p.get('title', '')}\nSCENES: {len(vo)}\n\n" + "\n".join(
        f"SCENE {i + 1} ({v['seconds']:.1f} s): {p['lines'][i]}\n  words: {' '.join(w['w'] for w in v['words'])}" for i, v in enumerate(vo))
    n = len(vo)
    live_file("progress.json", {"what": "storyboard", "done": 0, "total": n})
    counted = lambda text: live_file("progress.json", {"what": "storyboard", "done": min(text.count('"idea"'), n), "total": n})
    d = json.loads(argon.think(ask, DESIGN_SYSTEM + extra, Design, max_tokens=24000, live=counted, waiting=waiter))
    live_file("progress.json", {"what": "storyboard", "done": n, "total": n})
    json.dump(d, open(os.path.join(out, "design.json"), "w"), indent=1, ensure_ascii=False)
    for k, sc in enumerate(d["scenes"]):
        say(f"Card L{k + 1:02d}: {sc['device']} / {sc['look']}: {sc['idea']}", "card", k)
    return d


def render(gen: str, target: str) -> tuple[bool, str]:
    """renders the film; its progress (frames rendered, then encoded) goes to the editor (live/render.json)"""
    proc = subprocess.Popen([argon.NPX, "remotion", "render", os.path.join(gen, "entry.ts"), "OneShot", target, "--concurrency=6", "--crf=20"],
                            cwd=HERE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    tail, last = [], 0.0
    for ln in proc.stdout:
        tail = (tail + [ln])[-120:]
        m = re.search(r"(Rendered|Encoded)\s+(\d+)/(\d+)", ln)
        if m and time.time() - last > 0.5:
            last = time.time()
            live_file("render.json", {"stage": m.group(1).lower(), "done": int(m.group(2)), "total": int(m.group(3))})
    ok = proc.wait() == 0
    live_file("render.json", {"stage": "done" if ok else "failed", "done": 1, "total": 1})
    return ok, "".join(tail)[-3000:]


# ---------------- the checks every write goes through (compile, words on screen, render) ----------------
def declared_at(src: str, errs: list[str]) -> list[int]:
    """line numbers of the declarations behind "Property 'x' does not exist" errors (the object the code reads x from),
    so the fixer sees the real object and patches it instead of guessing its contents"""
    lines, out = src.splitlines(), []
    for e in errs:
        m = re.search(r"film\.tsx\((\d+),(\d+)\).*Property '(\w+)' does not exist", e)
        if not m or int(m.group(1)) > len(lines):
            continue
        before = lines[int(m.group(1)) - 1][:int(m.group(2)) - 1]
        obj = re.search(r"(\w+)\??\.?$", before)
        if not obj:
            continue
        at = next((n for n, l in enumerate(lines, 1) if re.match(rf"\s*(export\s+)?(const|let|var)\s+{obj.group(1)}\b", l)), None)
        if at and at not in out:
            out.append(at)
    for e in errs:  # "Cannot find name 'x'": the fixer must see what the enclosing component DOES declare (its header, its consts)
        m = re.search(r"film\.tsx\((\d+),\d+\).*Cannot find name '(\w+)'", e)
        if not m or int(m.group(1)) > len(lines):
            continue
        no = int(m.group(1))
        head = next((n for n in range(no, 0, -1) if re.match(r"\s*(export\s+)?(const\s+\w+\s*(:\s*React\.FC[^=]*)?=\s*\(|function\s+\w+)", lines[n - 1])), None)
        if head:
            out += [n for n in range(head, min(no, head + 12)) if n not in out and (n == head or re.match(r"\s*const\s", lines[n - 1]))]
    return out


def real_members(errs: list[str]) -> str:
    """for "Property 'x' does not exist on type 'T'" where T is one of our kit's types: T's real definition and the
    exported functions beside it that take a T, read from src/ (never the generated films), so the fixer uses what
    exists instead of guessing another name"""
    import glob
    types = sorted({m.group(1) for e in errs if (m := re.search(r"does not exist on type '([A-Z]\w+)'", e))})
    out = []
    for T in types:
        for f in glob.glob(os.path.join(HERE, "src", "**", "*.ts*"), recursive=True):
            if "/gen/" in f:
                continue
            code = open(f).read()
            m = re.search(rf"export (?:type|interface|class) {T}\b[^\n]*(?:\n(?!export)[^\n]*){{0,12}}", code)
            if not m:
                continue
            helpers = [l.strip()[:200] for l in code.splitlines() if re.match(r"export (function|const \w+ = \()", l) and re.search(rf"\b{T}\b", l)][:8]
            out.append(f"THE REAL {T} (from {os.path.relpath(f, os.path.join(HERE, 'src'))}): it has ONLY these members; use one of them or a "
                       f"helper below, never another name:\n{m.group(0)[:700]}" + ("\nHELPERS THAT TAKE IT:\n" + "\n".join(helpers) if helpers else ""))
            break
    return "\n\n".join(out)


def add_imports(src: str, errs: list[str] = ()) -> str:
    """Library imports are placed by code, never patched by the model (it sees only the line it fixes, never the import
    block): a piece imported from a file that does not export it moves to the one that does (argon.lib_imports), and a
    piece used with no import ('Cannot find name X') is imported; At and Lib, which the prompt asks for, likewise."""
    missing = {m.group(1) for e in errs if (m := re.search(r"Cannot find name '(\w+)'", e))}
    src, said = argon.lib_imports(src, "../../../argon/lib/", missing)
    lines = src.split("\n")
    heads = [i for i, l in enumerate(lines) if l.startswith("import ")]
    kit = {"At": "../../../argon/kit", "Lib": "../../../print/bridge"}  # placement + look wrapper the prompt asks for
    extra = [n for n in sorted(missing & kit.keys()) if not re.search(rf"import[^;]*\b{n}\b[^;]*from", src)]
    if extra and heads:
        lines[heads[-1] + 1:heads[-1] + 1] = [f'import {{ {n} }} from "{kit[n]}";' for n in extra]
        said += [f"{n}: imported from {kit[n].rsplit('/', 1)[1]}" for n in extra]
    if said:
        say(f"Placed the library import(s) by code: {'; '.join(said)}", "fix")
    return "\n".join(lines)


GROWN = os.path.join(HERE, "src", "argon", "lib", "grown.tsx")
NEW_PIECE = re.compile(r"/\*\*\s*NEW PIECE:\s*((?:(?!\*/).)*?)\s*\*/\s*(?:export\s+)?function\s+([A-Z]\w*)\s*\(", re.S)


def function_rest(src: str, i: int) -> str:
    """from the ( of a function's parameters to the } that closes its body (balanced), or "" """
    depth, j = 0, i
    for j in range(i, len(src)):
        depth += {"(": 1, ")": -1}.get(src[j], 0)
        if depth == 0:
            break
    k = src.find("{", j)
    depth = 0
    for e in range(max(k, 0), len(src)):
        depth += {"{": 1, "}": -1}.get(src[e], 0)
        if depth == 0 and k >= 0:
            return src[i:e + 1]
    return ""


def grown_errors() -> list[str]:
    """tsc on the grown library file alone: a piece must stand on its own there, not lean on its film"""
    cfg = os.path.join(HERE, ".grown-tsconfig.json")
    json.dump({"extends": "./tsconfig.json", "files": [os.path.relpath(GROWN, HERE)]}, open(cfg, "w"))
    try:
        r = subprocess.run([argon.NPX, "tsc", "--noEmit", "-p", cfg], cwd=HERE, capture_output=True, text=True)
    finally:
        os.remove(cfg)
    return [l for l in (r.stdout + r.stderr).splitlines() if f"{os.path.basename(GROWN)}(" in l and ": error " in l]


FILM_CONST = re.compile(r"^const ([A-Za-z_]\w*)\b[^=\n]*=", re.M)


def film_consts(src: str, body: str) -> list[str]:
    """the film's own top-level constants a piece uses (its palette `C`, a size table, a helper), and the ones those use:
    they travel with the piece into the library, or it would not compile there on its own"""
    defs = {}
    for m in FILM_CONST.finditer(src):
        depth, j = 0, m.end()
        while j < len(src):
            ch = src[j]
            depth += {"(": 1, "[": 1, "{": 1, ")": -1, "]": -1, "}": -1}.get(ch, 0)
            if depth == 0 and (ch == ";" or (ch == "\n" and src[m.end():j].strip())):
                break
            j += 1
        if not re.match(r"Scene\d|MOTION$", m.group(1)):
            defs[m.group(1)] = src[m.start():j + 1].rstrip()
    need, todo = [], [body]
    while todo:
        text = todo.pop()
        for name, code in defs.items():
            if name not in need and re.search(rf"\b{name}\b", text):
                need.append(name)
                todo.append(code)
    return [defs[n] for n in defs if n in need]  # in the film's own order, so one can use another


def with_consts(rest: str, consts: list[str]) -> str:
    """the piece's function with the film's constants as the first lines of its body (local, so two pieces' `C` never clash)"""
    if not consts:
        return rest
    depth = 0
    for j, ch in enumerate(rest):
        depth += {"(": 1, ")": -1}.get(ch, 0)
        if depth == 0:
            break
    k = rest.find("{", j)
    return rest[:k + 1] + "\n  " + "\n  ".join(c.replace("\n", "\n  ") for c in consts) + rest[k + 1:]


def grow_library(slug: str, src: str) -> list[str]:
    """The library grows from the films: every NEW PIECE a rendered film drew (a thing the library had none of) moves into
    src/argon/lib/grown.tsx as a block, kept only when it compiles there on its own and its name is new; the catalogue is
    rewritten, so the next film's writer is offered it (pick_library) instead of drawing it again."""
    homes, kept = argon.lib_homes(), []
    for m in NEW_PIECE.finditer(src):
        doc, name = re.sub(r"\s+", " ", m.group(1)).strip(), m.group(2)
        rest = function_rest(src, m.end() - 1)
        if name in homes or name in kept or not rest:
            continue
        rest = with_consts(rest, film_consts(src, rest))
        before = open(GROWN).read()
        open(GROWN, "w").write(before.rstrip("\n") + f"\n/** {doc} (drawn by the film {slug}) */\nfunction {name}View{rest}\n"
                               f'export const {name} = block("{name}", {name}View);\n')
        errs = grown_errors()
        if errs:
            open(GROWN, "w").write(before)
            say(f"Not kept for the library: {name} does not compile on its own ({errs[0].split(': error ')[-1][:140]})")
            continue
        kept.append(name)
    if kept:
        subprocess.run([sys.executable, os.path.join(HERE, "catalog.py")], cwd=HERE, capture_output=True, text=True)
        argon._HOMES.clear()
        say(f"Added to the motion library for the next films: {', '.join(kept)}", "ok")
    return kept


def compile_rounds(gen: str, film: str, src: str, out: str, report: dict, tag: str) -> str:
    """small patches until it compiles; a patch that leaves more errors than before is undone"""
    last = None
    for r in range(FIX_ROUNDS * 2 + 1):  # FIX_ROUNDS, then more only while each round still cuts the errors
        placed = add_imports(src)  # every compile sees the library imported from the right files
        if placed != src:
            src = placed
            open(film, "w").write(src)
        errs = compile_errors(gen)
        if not errs:
            say("film.tsx compiles" + (f" after {r} fix round(s)" if r else " the first time" if tag == "fix" else ""), "ok")
            return src
        stuck = r >= FIX_ROUNDS and last is not None and len(errs) >= last
        last = len(errs)
        if r == FIX_ROUNDS * 2 or stuck:
            say(f"Still {len(errs)} compile error(s) after {r} rounds:\n" + "\n".join(errs[:10]), "error")
            return src
        report["compile_rounds"] = report.get("compile_rounds", 0) + 1
        fixed = add_imports(src, errs)
        if fixed != src:
            src = fixed
            open(film, "w").write(src)
            continue
        nos = [int(m.group(1)) for e in errs if (m := re.search(r"film\.tsx\((\d+),", e))]
        nos += declared_at(src, errs)  # "X does not exist" / "Cannot find name X": the fixer must see the declarations in scope
        say(f"{len(errs)} compile error(s): asking for a small patch (round {r + 1})", "fix")
        before = src
        known = real_members(errs)
        src, done, missed = fix(film, src, "COMPILE ERRORS:\n" + "\n".join(errs[:20]) + (f"\n\n{known}" if known else ""), nos, out, f"{tag}-{r + 1}")
        placed = add_imports(src)  # a patch that touched an import is judged with the import put right
        if placed != src:
            src = placed
            open(film, "w").write(src)
        after_errs = compile_errors(gen)
        after = len(after_errs)
        # a syntax error (TS1xxx) hides every type error behind it: removing one is progress even when the type
        # errors it hid now show up, so the patch is kept and the next round fixes those
        syntax = lambda es: sum(bool(re.search(r"error TS1\d{3}:", e)) for e in es)
        if (syntax(after_errs), after) > (syntax(errs), len(errs)):
            src = before
            open(film, "w").write(src)
            say(f"The patch left {after} errors instead of {len(errs)}: undone", "fix")
        elif after > len(errs):
            say(f"  the syntax error is fixed; {after} type error(s) it was hiding show now: fixing them next")
        else:
            say(f"  {done} patch(es) applied, {missed} not found")
    return src


def words_rounds(gen: str, film: str, src: str, out: str, report: dict, allowed: list[str]) -> str:
    """words the design does not name go back, as patches"""
    for r in range(2):
        extra = screen_words(src, allowed)
        report["extra_words"] = len(extra)
        if not extra:
            say("Only the storyboard's words are on screen", "ok")
            break
        say(f"{len(extra)} words on screen the storyboard does not name: asking for patches (round {r + 1})", "fix")
        report["words_rounds"] = report.get("words_rounds", 0) + 1
        before = src
        nos = [int(m.group(1)) for e in extra if (m := re.match(r"line (\d+)", e))]
        try:  # polish: when Google is out of quota the film renders without it rather than wait
            src, done, missed = fix(film, src, "WORDS ON SCREEN THAT THE DESIGN DOES NOT NAME (remove each one, or the element that "
                                    "only exists to hold it; keep the drawings and motion; NEVER change <defs>, filters, gradients, masks, "
                                    "ids or attribute values: if a listed item is one of those, it is not on screen, leave it):\n"
                                    + "\n".join(extra[:30]), nos[:30], out, f"words-{r + 1}", tries=3)
        except RuntimeError as e:
            say(f"Gemini is busy ({str(e)[:60]}): rendering without the word check's patches", "fix")
            break
        say(f"  {done} patch(es) applied, {missed} not found")
        if compile_errors(gen):
            src = compile_rounds(gen, film, src, out, report, f"words-fix-{r + 1}")
            if compile_errors(gen):
                src = before
                open(film, "w").write(src)
                say("The word patches broke the compile: undone", "fix")
                break
    return src


def argon_public_gb() -> float:
    """the size of video/public: a render's bundle copies all of it into the temp folder"""
    return sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(os.path.join(HERE, "public")) for f in fs) / 1e9


def render_rounds(gen: str, film: str, src: str, out: str, report: dict, slug: str) -> str:
    target = os.path.join(HERE, "out", f"oneshot-{slug}.mp4")
    t0 = time.time()
    for r in range(FIX_ROUNDS + 1):
        say("Rendering the film", "render")
        ok, log = render(gen, target)
        if ok:
            say(f"DONE {target}", "done")
            report["video"] = target
            break
        open(os.path.join(out, f"render-fail-{r + 1}.log"), "w").write(log)  # what the renderer said, kept to read later
        if re.search(r"ENOSPC|no space left on device|EDQUOT|disk (is )?full", log, re.I):  # the machine, not the film: no patch can fix it
            free = shutil.disk_usage(HERE).free / 1e9
            say(f"Render stopped: the disk is full ({free:.1f} GB free; a render needs about {argon_public_gb():.1f} GB for its bundle). "
                "Free space, then resume: the film's code is fine and was not changed.", "error")
            break
        if r == FIX_ROUNDS:
            say("Render still fails:\n" + log[-1200:], "error")
            break
        report["render_rounds"] = r + 1
        crash = "\n".join(ln for ln in log.splitlines() if re.search(r"Error|error|at Scene|film\.tsx", ln))[-2500:] or log[-2500:]
        nos = [int(n) for n in re.findall(r"film\.tsx:(\d+)", log)][:6]
        say(f"Render crashed: asking for a small patch (round {r + 1})", "fix")
        before = src
        src, done, missed = fix(film, src, "THE RENDER CRASHED:\n" + crash, nos, out, f"crash-{r + 1}")
        say(f"  {done} patch(es) applied, {missed} not found")
        if compile_errors(gen):  # the crash patch broke the compile: fix that too, or go back to the file that compiled
            src = compile_rounds(gen, film, src, out, report, f"crash-{r + 1}-fix")
            if compile_errors(gen):
                open(film, "w").write(before)
                say("The crash patch broke the compile and could not be fixed; went back to the file that compiled", "error")
                src = before
                break
    report.setdefault("seconds", {})["render"] = round(time.time() - t0)
    return src


def costs_into(report: dict, out: str) -> None:
    c = json.load(open(os.path.join(out, "cost.json"))) if os.path.exists(os.path.join(out, "cost.json")) else {}
    report["model_calls"] = sum(s.get("calls", 0) for s in c.get("stages", {}).values())
    report["tokens_in"] = sum(s.get("tokens_in", 0) for s in c.get("stages", {}).values())
    report["tokens_out"] = sum(s.get("tokens_out", 0) for s in c.get("stages", {}).values())
    report["usd"] = c.get("total_usd", 0.0)
    report["model"] = ", ".join(c.get("models", {}))
    report["usd_by_stage"] = {k: round(v.get("usd", 0), 4) for k, v in c.get("stages", {}).items()}


# ---------------- the film pipeline with the storyboard gate (ADR 0013), run by the app (backend/app/api/films_api.py) ----------------
REDRAW_SYSTEM = DESIGN_SYSTEM + """

NOW YOU REDRAW ONE SCENE. The creator read your storyboard and wrote a note on this scene. Redesign ONLY this scene so it
does what the note asks. Keep everything the note does not mention, keep the film's cast, and keep the carry-over from the
scene before and into the scene after. Reply with this one scene's design (same scene number)."""

REWRITE_ANSWER = """NOW YOU REWRITE ONE SCENE of a film that is already written. You get the file's top part (its design system
and helper library: use it, never repeat or change it), the scene's current code, its brief and its design. Answer with ONLY
the complete new code of that one scene component, with the same name, in one ```tsx block, and nothing else."""


def job_paths(slug: str) -> tuple[str, str, str]:
    """a film's folders: public/oneshot/<slug>, src/oneshot/gen/<slug> and its film.tsx"""
    gen = os.path.join(HERE, "src", "oneshot", "gen", slug)
    return os.path.join(PUBLIC, slug), gen, os.path.join(gen, "film.tsx")


def begin(slug: str) -> tuple[str, str, str]:
    global LOG_PATH
    out, gen, film = job_paths(slug)
    os.makedirs(out, exist_ok=True)
    os.makedirs(gen, exist_ok=True)
    LOG_PATH = os.path.join(out, "run.log")
    cost.start(out)  # one ledger for the whole film: every stage adds to it
    return out, gen, film


def auto_look(topic: str, title: str, notes: str) -> str:
    """the creator picked Auto: Gemini picks the look family that suits the topic best (video/looks.py)"""
    from pydantic import BaseModel, Field

    class Choice(BaseModel):
        family: str = Field(description="the id of the look family, exactly as listed")
        why: str = Field(description="a few words on why it suits this topic")
    ask = (f"TOPIC: {topic}\nTITLE: {title}\nNOTES: {notes[:1500]}\n\nLOOK FAMILIES:\n{lookmod.menu()}\n\n"
           "Pick the ONE look family that would make this topic clearest and most memorable on screen. Match the subject's world "
           "(money: Market desk or Newspaper; history: Encyclopedia or Atlas; AI and chips: Dark tech, Keynote or Blueprint; "
           "a process or flow: Transit map or Whiteboard), but surprise when a less obvious family would serve it better.")
    try:
        c = json.loads(argon.think(ask, "You are the art director of an explainer studio.", schema=Choice, model=argon.fallback_model(), max_tokens=800))  # a small choice: the fast model
        fam = c["family"] if c.get("family") in lookmod.FAMILIES else "paper"
        say(f"Auto look: {lookmod.FAMILIES[fam]['name']} ({c.get('why', '')})", "plan")
    except Exception as e:
        fam = "paper"
        say(f"Auto look failed ({str(e)[:80]}): using Printed paper", "plan")
    return fam


def stage_plan(slug: str) -> None:
    """Plan with Drishyya: the story from the topic and the creator's notes, the voice, then the storyboard, checked by
    the viewer test (a first-time viewer, cards it does not get are redrawn). Then it goes straight on to write and
    render the film: the cards are approved by that test, not by the creator. job.json "review": true stops at the
    storyboard instead, for the creator to approve every card (the old gate, ADR 0013)."""
    out, gen, _ = begin(slug)
    job = json.load(open(os.path.join(out, "job.json")))
    topic = job["topic"]
    brief_text = topic + "".join(f"\n{label}: {job[k]}" for k, label in (("audience", "AUDIENCE"), ("tone", "TONE")) if job.get(k))
    if job.get("notes"):
        brief_text += f"\nTHE CREATOR'S NOTES (build the story on these facts; never invent beyond them):\n{job['notes']}"
    if job.get("story"):  # a story film: an arc (hook, why, journey, moment, close), not a list of facts
        brief_text += STORY_PLAN
    fam = job.get("look") or ("paper" if job.get("mix") else "")  # the look the creator picked: known before the plan, so the plan is made for it
    if fam == "auto":
        fam = auto_look(topic, "", job.get("notes", ""))
    if fam in lookmod.FAMILIES:
        brief_text += (f"\n\nTHE FILM'S LOOK: {lookmod.FAMILIES[fam]['name']}: {lookmod.FAMILIES[fam]['art']}.\n{lookmod.world(fam)}\n"
                       "Every character's `who` and every beat's `concept` describe people and places in this world and this art.")
    say(f"Planning the story of {topic!r} (about {job.get('minutes', 1):g} min)" + (f" in {job['style']}" if job.get("style") else ""), "plan")
    f = Exp(slug, gen)
    cost.stage("story")
    p = argon.plan(f, brief_text, job.get("language", "English"), [], bool(job.get("vertical")), "", {}, float(job.get("minutes", 1)))
    p["topic"] = topic
    p["style"] = job.get("style", "")
    p["accent"] = job.get("accent", "")  # the voice's locale (argon.accent_of); Hinglish and Hindi get India's own without it
    p["draw"] = bool(job.get("draw"))  # a drawn film: a shot list, every scene drawn alone with the pen, looked at and redrawn (draw_rounds)
    p["story"] = bool(job.get("story"))  # a story film: sequences of painted worlds shot with a camera (STORY_DESIGN, STORY_WRITE)
    p["mix"] = bool(job.get("mix"))
    p["clear"] = bool(job.get("clear")) or p["mix"]  # a mix film always signs the comprehension contract
    p["print"] = fam in lookmod.FAMILIES
    if p["print"]:
        p["theme"]["art_style"] = lookmod.FAMILIES[fam]["art"]  # code decides: painted backdrops in the look's art, never "anime"
        p["mix"] = p["clear"] = True
        p["dna"] = lookmod.apply_pin(lookmod.pick(slug, fam, p.get("title") or topic), lookmod.clean_pin(fam, job.get("pin") or {}))  # the studio's pins stay exactly
    f.write("plan.json", p)
    say(f"Story: {len(p['lines'])} lines. Voicing them", "story", lines=p["lines"])
    cost.stage("voice")
    vo = argon.voice(f, p)
    for i, v in enumerate(vo):
        v["audio"] = f"oneshot/{slug}/voice-{i:02d}.wav"
    f.write("voice.json", vo)
    cost.stage("design")
    say(f"Every line voiced and its words timed. Drawing the storyboard: {len(vo)} cards", "storyboard")
    ground = f"the film's look: {p['dna']['name']}" if p.get("print") else styles.pick_ground(p["style"], slug)
    say(f"This film's look: {p['dna']['name']}" if p.get("print") else f"This film's ground: {ground}", "storyboard")
    d = design(p, vo, out, design_extra(p) + f"\n\nTHE FILM'S GROUND (fixed for every scene; use exactly this): {ground}")
    d["ground"] = ground
    sb = storyboard.from_design(slug, p, vo, d, p["style"])
    if p.get("print"):  # the rhythm rule is checked in code: a layout repeated from the scene before is redrawn
        storyboard.save(sb)
        for i, lay in print_rhythm(d):
            say(f"Card L{i + 1:02d} repeats the page of the scene before ({lay}): redrawing it arranged differently", "redraw", i)
            redraw(slug, storyboard.card_id(i), f"The scene before has the same page ({lay}). Compose this page DIFFERENTLY: move the hero "
                   "(left, right, centre, top band, full width), add or drop a board, change the pieces. Fill every piece's data, keep the takeaway. "
                   "List every word it prints in WORDS.")
        for i, s in enumerate(storyboard.design_of(storyboard.load(slug))["scenes"]):  # a layout must come with its data
            if gap := spread_gaps(s):
                lay = (s.get("spread") or {}).get("layout")
                say(f"Card L{i + 1:02d} ({lay}) breaks the page rules: {gap[:200]}: redrawing it", "redraw", i)
                redraw(slug, storyboard.card_id(i), f"This {lay} spread breaks the page rules: {gap}. Fix every one and fill SPREAD completely. "
                       "Every number from the line or the notes, every word an exact word of the line.")
        sb = storyboard.load(slug)
        find_photos(slug, sb, printed=True)
        sb = storyboard.load(slug)
        d = {**storyboard.design_of(sb), "region": d.get("region", "")}
    elif p.get("mix"):  # the rhythm rule is checked in code: a third scene of one kind in a row is redrawn as another kind
        storyboard.save(sb)
        for i, kind, other in rhythm_breaks(d):
            say(f"Card L{i + 1:02d} is the third {kind} scene in a row: redrawing it as {other}", "redraw", i)
            redraw(slug, storyboard.card_id(i), f"Three {kind} scenes in a row is monotonous. Make this scene_kind {other}, drawn with the "
                   f"collage kit's {KIND_PIECE[other]}, and keep the takeaway. List every word it shows in WORDS.")
        sb = storyboard.load(slug)
        find_photos(slug, sb)
        sb = storyboard.load(slug)
        d = {**storyboard.design_of(sb), "region": d.get("region", "")}
    if p["clear"]:
        sb["map"] = map_region(slug, d)
        sb["region"] = d.get("region", "")
        storyboard.save(sb)
        first = review(p, d, out)
        failed = [v for v in first if not v["understood"]]
        for v in failed:  # one redraw for every card the viewer did not get, with the reason
            redraw(slug, storyboard.card_id(v["scene"] - 1), f"A first-time viewer watching only the pictures was asked \"{d['scenes'][v['scene'] - 1].get('question', '')}\" "
                   f"and answered \"{v['answer']}\" (confused by: {v.get('confusing') or 'nothing'}). Reviewer: {v['why']} Redesign so the pictures alone make the takeaway obvious.")
        sb = storyboard.load(slug)
        second = review(p, storyboard.design_of(sb), out) if failed else first
        json.dump({"first": first, "after_redraw": second if failed else None}, open(os.path.join(out, "review.json"), "w"), indent=1, ensure_ascii=False)
        for c, v in zip(sb["cards"], second):
            c["review"] = v
        say(f"Viewer test: {sum(v['understood'] for v in first)}/{len(first)} cards understood at first"
            + (f", {sum(v['understood'] for v in second)}/{len(second)} after redrawing {len(failed)}" if failed else ""), "review")
    if job.get("review"):
        storyboard.save(sb)
        say(f"Storyboard ready: {len(sb['cards'])} cards waiting for your approval. Nothing is written until you approve every card.", "review")
        publish()
        return
    for c in sb["cards"]:
        if c["status"] != "approved":
            c.update(status="approved", updated=time.time())
            storyboard.log(slug, "approve", c, "auto: passed the viewer test, no review step")
    storyboard.save(sb)
    say(f"Storyboard ready: {len(sb['cards'])} cards" + (", checked by the viewer test" if p["clear"] else "")
        + ". Choose who draws it: Gemini (API) or Claude Code.", "review")
    publish()


def redraw(slug: str, cid: str, note: str) -> None:
    """one card again, from the creator's note; the other cards are not touched"""
    out, _, _ = begin(slug)
    p = json.load(open(os.path.join(out, "plan.json")))
    vo = json.load(open(os.path.join(out, "voice.json")))
    sb = storyboard.load(slug)
    c = storyboard.card(sb, cid)
    i = c["i"]
    near = lambda j: f"SCENE {j + 1}: {sb['cards'][j]['line']}\n" + design_text({"ground": sb["ground"], "scenes": [sb["cards"][j]["design"]]}) if 0 <= j < len(sb["cards"]) else ""
    ask = (f"TOPIC: {p['topic']}\nGROUND (every scene): {sb['ground']}\n\nTHE WHOLE NARRATION:\n" + "\n".join(f"{k + 1}. {x}" for k, x in enumerate(p["lines"]))
           + f"\n\nTHE SCENE BEFORE:\n{near(i - 1) or 'none (this is the first scene)'}\nTHE SCENE AFTER:\n{near(i + 1) or 'none (this is the last scene)'}"
           + f"\n\nTHIS SCENE ({vo[i]['seconds']:.1f} s): {c['line']}\n  words: {' '.join(w['w'] for w in vo[i]['words'])}"
           + f"\nITS DESIGN NOW:\n{json.dumps(c['design'], ensure_ascii=False)}\n\nTHE CREATOR'S NOTE: {note}")
    cost.stage("redraw")
    say(f"Redrawing card {cid} from your note: {note[:120]}", "redraw", i)
    try:
        new = json.loads(argon.think(ask, REDRAW_SYSTEM + design_extra(p), SceneDesign, max_tokens=8000))
    except Exception as e:  # the card goes back to waiting as it was, never stuck on "redrawing"
        storyboard.update(slug, lambda sb: storyboard.card(sb, cid).update(status="pending"))
        say(f"Card {cid} could not be redrawn ({str(e)[:160]}); it is unchanged. Try the note again.", "error", i)
        raise
    new["scene"] = i + 1

    def put(sb: dict) -> None:
        c = storyboard.card(sb, cid)
        c.update(design=new, status="pending", updated=time.time())
    storyboard.update(slug, put)
    say(f"Card {cid} redrawn: {new['device']} / {new['look']}: {new['idea']}. Waiting for your approval.", "card", i)


def reline(slug: str, cid: str, text: str) -> None:
    """the creator changed a line's words: voice that line again, time its words, then redraw its card"""
    out, gen, _ = begin(slug)
    f = Exp(slug, gen)
    p = json.load(open(os.path.join(out, "plan.json")))
    i = storyboard.card(storyboard.load(slug), cid)["i"]
    p["lines"][i] = " ".join(text.split())
    f.write("plan.json", p)
    if os.path.exists(f.p(f"voice-{i:02d}.wav")):
        os.remove(f.p(f"voice-{i:02d}.wav"))
    f.write("words.json", None)  # the words are timed again (the other lines' voices are kept)
    cost.stage("voice")
    say(f"Line {i + 1} has new words: voicing it again", "voice", i)
    vo = argon.voice(f, p)
    for k, v in enumerate(vo):
        v["audio"] = f"oneshot/{slug}/voice-{k:02d}.wav"
    f.write("voice.json", vo)

    def put(sb: dict) -> None:
        c = storyboard.card(sb, cid)
        c.update(line=p["lines"][i], seconds=round(vo[i]["seconds"], 2), status="redrawing", updated=time.time())
        for k, v in enumerate(vo):  # every line's length may move a little when the words are timed again
            sb["cards"][k]["seconds"] = round(v["seconds"], 2)
    storyboard.update(slug, put)
    redraw(slug, cid, f"The line's words changed. It now says: \"{p['lines'][i]}\". Redesign the scene for these words.")


def writer_system(style: str, cap: int) -> str:
    system = SYSTEM_DRAWN.replace("THE FILE CONTRACT", DESIGNED_RULES + "\n\n" + LAYOUT_KIT + "\n\nTHE FILE CONTRACT")
    extra = look_rules(style)[1]
    if extra:
        system = system.replace("THE FILE CONTRACT", extra + "\n\nTHE FILE CONTRACT")
    return system.replace("CAPTION_SAFE", f"{cap}")


# ---------------- THE DRAWN FILM (job "draw": true) ----------------
# How a careful illustrator makes a film, done by Gemini in small jobs it is good at:
#   1. THE CAST first: the people and things that come back (the vrati, her husband, the soop) are drawn ONCE each with
#      the pen, alone, in all their poses, looked at on a test sheet and improved; every scene then PLACES them, so the
#      film has one family going through it, not a new stranger in every scene;
#   2. a SHOT LIST that never repeats a picture (setting, light, shot size, composition, who is in it);
#   3. every scene drawn ALONE with the pen and the cast, compiled alone;
#   4. a CONTACT SHEET of the whole film looked at at once (repeats, a cast member drawn wrong, an empty scene);
#   5. every scene looked at and fixed with SMALL PATCHES (what works stays), and a patch is kept only when a judge,
#      asked twice with the order swapped, prefers it both times. Every judgement is saved (judge.jsonl) so it can be
#      checked against a person's choice.

class CastPiece(BaseModel):
    name: str = Field(description="PascalCase component name, e.g. Vrati, Husband, Child, Soop, Daura")
    kind: str = Field(description="person | thing")
    what: str = Field(description="how it looks: age, dress and its colours, what it carries; for a thing, its parts")
    poses: list[str] = Field(default_factory=list, description="a person's poses the film needs (2-5 of stand, walk, pray, offer, carry, sit, sing, give, eat, bow); a thing's states (full, empty, lit) or []")


class Cast(BaseModel):
    cast: list[CastPiece]


class Shot(BaseModel):
    scene: int
    setting: str = Field(description="where we are: a specific place (the courtyard of a mud house, the kitchen at the clay chulha, the river ghat, a field, a lane to the river, the night sky...)")
    time: str = Field(description="time of day and light: dawn | morning | noon | afternoon | dusk | night | lamplight")
    shot: str = Field(description="wide | medium | close-up | detail (hands, an object) | top-down | interior | symbolic (a painted emblem, a calendar, a map)")
    subject: str = Field(description="who or what fills the frame and what they do")
    cast: list[str] = Field(default_factory=list, description="the cast in the frame as Name:pose (Vrati:offer, Soop:full)")
    action: str = Field(description="what moves during the line, tied to its words")
    composition: str = Field(description="where things sit in the frame (left third, foreground, low horizon...), different from the scenes next to it")
    words: list[str] = Field(default_factory=list, description="0-3 short words on screen, only if they help; [] is often best")


class Shots(BaseModel):
    shots: list[Shot]


class SheetNote(BaseModel):
    scene: int
    problem: str
    fix: str


class SheetNotes(BaseModel):
    notes: list[SheetNote] = Field(default_factory=list)


class Scores(BaseModel):
    a: int = Field(description="version A's total, 5-25")
    b: int = Field(description="version B's total, 5-25")
    why: str


CAST_PLAN = """You cast a short hand-painted animated film. From its lines, list the RECURRING cast: the 2-4 people and
the 2-4 things that appear in two or more scenes (the main woman, her family, the key objects of the ritual). Each is
drawn once and placed in every scene it is in, so describe each one exactly (dress, colours, what they carry), in the
film's world below, and list the poses or states the film needs."""

SHOT_PLAN = """You are the director of a short hand-painted animated film. Plan ONE SHOT for every line of the narration.
The film must never feel like the same picture repeated: plan it like a real film, a sequence of different shots.
- Neighbouring scenes differ in setting OR shot size; no setting more than 4 times in the whole film.
- A big sun in the middle of the frame at most 3 times in the film; a river with a horizon at most 6 times.
- Use the whole range: close-ups of hands and objects (the soop, the thekua, a diya), faces, interiors (the kitchen,
  the courtyard), people walking, crowds, wide landscapes, night scenes, a symbolic painted emblem or calendar for an idea.
- Each shot SHOWS its line: what the narrator says is what we see, in the story's real order.
- Put THE CAST (below) in the shots where they belong, by name and pose: the same family goes through the whole film.
- People and places are of the film's world (below), in its dress."""

PEN_RULES = """THE PEN (import {{ Shape, Line, Circle, Box, usePen }} from "{pen}"): draw EVERY filled shape with
<Shape d="M ..." fill={{...}} /> and every single stroke (a mouth, a fold, hair, hatching) with <Line d="M ..." />.
Never set stroke, strokeWidth or outlines yourself: the pen inks every shape in the film's look. fill is one of the
look's inks by number (0 loud, 1, 2, 3 quiet), "ink", "paper", or a real colour only where the world needs it (skin,
sky, water, fire). <Circle r cx cy fill /> and <Box x y w h fill /> are shortcuts. Raw svg only for <g> groups and
transforms, <text>, the gradient of a sky."""

DRAW_CAST = """Draw ONE member of a film's cast, once, as a reusable piece: every scene of the film will place it.

""" + PEN_RULES + """

{art}
{world}

THE PIECE: {name} ({kind}): {what}
{contract}

Draw it with care: it appears in many scenes. A person in profile facing right, in the film's art (for Madhubani: the
big fish-shaped eye, double-line dress with its border), with the poses moving the arms (and legs for walk) clearly;
breathing or a small sway with t. Answer with the file only: `import React from "react";`, the pen import, the piece."""

PERSON_CONTRACT = """export const {name}: React.FC<{{ t: number; pose?: {poses} }}> = ({{ t, pose = "{first}" }}) => ( <g> ... </g> );
It is drawn in its own units with its FEET AT (0, 0), about 400 units tall (head at y = -400), facing right; a scene
places it with <g transform="translate(x y) scale(s)">. A <g>, never an <svg>."""

THING_CONTRACT = """export const {name}: React.FC<{{ t: number; state?: {poses} }}> = ({{ t, state = "{first}" }}) => ( <g> ... </g> );
It is drawn in its own units CENTRED AT (0, 0), about 240 units wide; a scene places it with
<g transform="translate(x y) scale(s)">. A <g>, never an <svg>."""

CAST_LOOK = """This is the test sheet of the piece you drew: the piece in each of its poses (or states), side by side.
Look at it like an art director: is it recognisable as {what}? Is it in the film's art? Do the poses read clearly
(arms where they should be, nothing detached or broken, nothing tiny)? List its 3 biggest problems in one line each,
then answer with SMALL PATCHES that fix them, in this exact format, as many as needed:

<<<FIND
exact lines copied from the file
===
the replacement lines
>>>"""

DRAW_SCENE = """Draw and animate ONE scene of a film as one finished painting, with the PEN and the film's CAST.

""" + PEN_RULES + """

THE CAST (import {{ {cast_names} }} from "./cast"): these are drawn already; PLACE them, never draw them again:
{cast_api}
Place one with <g transform={{`translate(${{x}} ${{y}}) scale(${{s}})`}}><Vrati t={{t}} pose="offer" /></g> (a person's feet
are at its (0, 0) and it is 400 tall at scale 1; a thing is centred and 240 wide). Make them move by changing x, y, s
with t (walking across, rising, arriving on their word).

{art}
{world}

THIS SCENE'S SHOT (draw exactly this; it was planned so the film never repeats a picture):
- setting: {setting}; light: {time}; shot: {shot}
- in the frame: {subject}; the cast in it: {cast_here}
- what moves: {action}
- composition: {composition}

THE LINE the narrator says while it plays ({dur:.1f} s): "{text}"
Word times: {words}

Things arrive and move when their words are said (t is seconds into the scene). Fill the WHOLE frame: a complete painted
world, no empty paper, nothing cut by the frame edge. {say}

RULES: export const Scene: React.FC<{{ t: number }}> = ({{ t }}) => ( <svg viewBox="0 0 1920 1080" width={{1920}} height={{1080}}> ... </svg> );
When you use a LIBRARY PIECE (offered below, if any; take one only when the shot needs it), the Scene returns the
painting with the pieces on top, in the same 1920 x 1080 pixels:
  <div style={{{{ position: "absolute", inset: 0 }}}}><svg viewBox="0 0 1920 1080" width={{1920}} height={{1080}}> ... </svg>
    <At x={{...}} y={{...}}><Lib><Fire ... /></Lib></At></div>
Imports ONLY `import React from "react";`, the pen import, the cast import and the library pieces you use (with Lib and At). Answer with the file only."""

SHEET_LOOK = """This is the CONTACT SHEET of a whole film: one still of every scene, numbered, in order. Look at the film
as a whole, like its director. Report only REAL problems, each for one scene:
- the same picture repeated (two scenes that look alike: same setting, same framing, same subject);
- the cast drawn differently from the rest of the film, or a stranger where the cast should be;
- a scene that is empty, broken, cut by the frame, or does not fit its line (THE SHOTS below);
- a jump in style that breaks the film's one look.
For each: the scene number, the problem, and the fix in one line. No problem, no note."""

SCENE_PATCH = """These are two stills of the scene you drew (early, and near its end). The director's notes on it:
{notes}
Look at it like an art director, against its SHOT: does it show the shot and the line, is it a finished painting in the
film's look, are the cast placed well (big enough, in the right pose), is anything broken (cut, overlapping, tiny,
unreadable)? List the 3 biggest problems in one line each, then fix them with SMALL PATCHES (keep what works), in this
exact format, as many as needed:

<<<FIND
exact lines copied from the file
===
the replacement lines
>>>"""

JUDGE = """Two versions (A and B) of the same {what}. Each is shown in its stills. Score EACH from 1 to 5 on:
1. it shows what it should ({should});
2. it is a finished picture in the film's look (no empty paper, nothing broken, cut or tiny);
3. the people and things are well drawn and recognisable;
4. it is clear to a viewer at a glance;
5. it is beautiful.
Add up each version's five scores (5-25) and give one line of why."""

DRAW_SYSTEM = "You are an illustrator and animator who draws in code. You answer with ONE TypeScript React file and nothing else."
PATCH_SYSTEM = "You are an illustrator who improves a drawing in code with small exact patches. Answer with the problems, then the patches."


def scene_file(gen: str, i: int, v: int) -> str:
    return os.path.join(gen, f"scene-{i + 1:02d}-v{v}.tsx")


def file_errors(gen: str, path: str) -> list[str]:
    """tsc on one file alone: one broken scene or cast piece never holds back the others"""
    cfg = os.path.join(gen, f".tsc-{os.path.basename(path)}.json")
    # "include": [] so the base config's "include": ["src"] is not inherited: only this file and what it imports
    json.dump({"extends": "../../../../tsconfig.json", "files": [os.path.basename(path)], "include": []}, open(cfg, "w"))
    try:
        r = subprocess.run([argon.NPX, "tsc", "--noEmit", "-p", cfg], cwd=HERE, capture_output=True, text=True)
    finally:
        os.remove(cfg)
    return [l for l in r.stdout.splitlines() if ": error " in l][:8]


def drawn_code(answer: str) -> str:
    m = re.search(r"import React.*", code_of(answer) if "```" in answer else answer, re.S)
    return (m.group(0) if m else answer).strip()


def scene_imports(code: str, errs: list[str] = ()) -> str:
    """a drawn file's library imports placed by code (argon.lib_imports), and Lib and At when it uses them"""
    missing = {m.group(1) for e in errs if (m := re.search(r"Cannot find name '(\w+)'", e))}
    code, _ = argon.lib_imports(code, "../../../argon/lib/", missing)
    for name, home in (("Lib", "../../../print/bridge"), ("At", "../../../argon/kit")):
        if re.search(rf"<{name}\b", code) and not re.search(rf"import[^;]*\b{name}\b[^;]*from", code):
            code = code.replace('import React from "react";', f'import React from "react";\nimport {{ {name} }} from "{home}";', 1)
    return code


def draw_compiled(gen: str, path: str, code: str, ask: list) -> bool:
    """the file, with up to 2 fix rounds; a file that never compiles is removed (the film keeps what it had)"""
    for k in range(3):
        code = scene_imports(code)
        open(path, "w").write(code)
        errs = file_errors(gen, path)
        if errs and any("Cannot find name" in e for e in errs):
            code = scene_imports(code, errs)
            open(path, "w").write(code)
            errs = file_errors(gen, path)
        if not errs:
            return True
        if k == 2:
            os.replace(path, path.replace(".tsx", ".failed.tsx"))  # kept with its errors in run.log, never thrown away blind
            say(f"{os.path.basename(path)} never compiled: " + " | ".join(e.split(": error ")[-1] for e in errs[:3])[:300], "error")
            return False
        code = drawn_code(argon.think(ask + ["Your file:\n" + code, "It does not compile:\n" + "\n".join(errs) + "\nAnswer with the whole fixed file only."],
                                      DRAW_SYSTEM, max_tokens=60000, tries=4))
    return False


def patched(gen: str, src_path: str, out_path: str, ask: list) -> bool:
    """small patches on a drawn file (what works stays): the patched copy is written to out_path and kept only if it compiles"""
    src = open(src_path).read()
    answer = argon.think(ask + ["Your file:\n" + src], PATCH_SYSTEM, max_tokens=20000, tries=4)
    new, done, _ = apply_patches(src, answer)
    if not done:
        return False
    open(out_path, "w").write(new)
    if file_errors(gen, out_path):
        os.remove(out_path)
        return False
    return True


def drawn_film(gen: str, n: int, pick: dict) -> str:
    """film.tsx for a drawn film: the MOTION table plays each scene's picked version"""
    imp = "\n".join(f'import {{ Scene as S{i + 1} }} from "./scene-{i + 1:02d}-v{pick[i]}";' for i in range(n) if pick.get(i))
    rows = ", ".join(f"{i + 1}: () => <S{i + 1} t={{useCurrentFrame() / 30}} />" for i in range(n) if pick.get(i))
    return ('/* a drawn film: every scene drawn alone with the pen and the cast, looked at and patched (video/oneshot.py draw_rounds) */\n'
            'import React from "react";\nimport { useCurrentFrame } from "remotion";\n' + imp + "\n\n"
            "export const MOTION: Record<number, React.FC> = { " + rows + " };\n")


def cast_index(gen: str, pick: dict[str, int]) -> None:
    """cast.tsx: each cast member's picked version, for the scenes to import"""
    open(os.path.join(gen, "cast.tsx"), "w").write("/* the film's cast, drawn once each (video/oneshot.py draw_rounds) */\n"
                                                   + "".join(f'export {{ {n} }} from "./cast-{n}-v{v}";\n' for n, v in pick.items()))


def cast_sheet(gen: str, cast: list[dict], vers: dict[str, int], dna: dict) -> None:
    """cast-sheet entry: frame k shows cast member k in every pose, side by side, in the film's look (the pen needs the DNA)"""
    imp = "\n".join(f'import {{ {c["name"]} as C{k} }} from "./cast-{c["name"]}-v{vers[c["name"]]}";' for k, c in enumerate(cast) if c["name"] in vers)
    rows = ",\n".join(
        f'  ({{ t }}) => <>{"".join(f"<g transform={{`translate({(j + 0.5) * 1920 / max(1, len(c.get("poses") or ["a"]))} {900 if c["kind"] == "person" else 560}) scale({1.6 if c["kind"] == "person" else 1.8})`}}><C{k} t={{t}} {"pose" if c["kind"] == "person" else "state"}={json.dumps(ps)} /></g>" for j, ps in enumerate(c.get("poses") or [""]))}</>'
        if c["name"] in vers else "  () => null" for k, c in enumerate(cast))
    open(os.path.join(gen, "castsheet.tsx"), "w").write(f'''/* the cast's test sheet (video/oneshot.py draw_rounds): frame k = cast member k in every pose */
import React from "react";
import {{ AbsoluteFill, Composition, registerRoot, useCurrentFrame }} from "remotion";
import {{ WithDNA, type DNA }} from "../../../print/kit";
{imp}
const DNA_ = {json.dumps({k: v for k, v in dna.items() if k != "name"})} as unknown as DNA;
const ROWS: React.FC<{{ t: number }}>[] = [
{rows}
];
const Sheet = () => {{ const f = useCurrentFrame(), t = 2 + f * 0.37, R = ROWS[f] ?? (() => null);
  return <WithDNA dna={{DNA_}}><AbsoluteFill style={{{{ background: DNA_.paper }}}}><svg viewBox="0 0 1920 1080" style={{{{ width: "100%", height: "100%" }}}}><R t={{t}} /></svg></AbsoluteFill></WithDNA>; }};
registerRoot(() => <Composition id="OneShot" component={{Sheet}} durationInFrames={{{max(1, len(cast))}}} fps={{30}} width={{1920}} height={{1080}} />);
''')


def frames_of(gen: str, entry: str, out: str, jobs: list[tuple[str, int]], scale: str = "0.5") -> str:
    os.makedirs(out, exist_ok=True)
    if jobs:
        subprocess.run(["node", os.path.join(HERE, "framecheck.mjs"), os.path.join(gen, entry), out, ",".join(f"{n}:{f}" for n, f in jobs), scale],
                       cwd=HERE, capture_output=True, timeout=2400)
    return out


def scene_jobs(voice: list[dict], scenes: list[int]) -> list[tuple[str, int]]:
    """two stills of each scene: early (40%) and near its end (85%)"""
    starts, at = [], 0
    for v in voice:
        starts.append(at)
        at += round((v["seconds"] + PAD) * 30)
    return [(f"s{i}{k}", starts[i] + round((voice[i]["seconds"] + PAD) * 30 * fr)) for i in scenes for k, fr in (("a", 0.4), ("b", 0.85))]


def contact_sheet(stills: str, n: int, path: str) -> bool:
    from PIL import Image, ImageDraw
    ims = [(i, os.path.join(stills, f"s{i}b.jpg")) for i in range(n) if os.path.exists(os.path.join(stills, f"s{i}b.jpg"))]
    if not ims:
        return False
    cols, w, h = 6, 320, 180
    sheet = Image.new("RGB", (cols * w, -(-len(ims) // cols) * (h + 24)), "white")
    d = ImageDraw.Draw(sheet)
    for k, (i, p) in enumerate(ims):
        x, y = (k % cols) * w, (k // cols) * (h + 24)
        sheet.paste(Image.open(p).resize((w - 6, h)), (x + 3, y + 22))
        d.text((x + 6, y + 4), f"scene {i + 1}", fill="black")
    sheet.save(path, quality=88)
    return True


def judge(out: str, what: str, should: str, a: list[str], b: list[str], tag: str) -> bool:
    """True when B (the patched version) is better: scored twice with the order swapped, B must win both times.
    Every judgement goes to judge.jsonl (to be checked against a person's choice)."""
    from google.genai import types
    img = lambda f: types.Part.from_bytes(data=open(f, "rb").read(), mime_type="image/jpeg")
    def ask(x: list[str], y: list[str]) -> dict:
        parts = [JUDGE.format(what=what, should=should), "VERSION A:"] + [img(f) for f in x] + ["VERSION B:"] + [img(f) for f in y]
        return json.loads(argon.think(parts, "You are an art director. Score fairly; the order of the versions means nothing.", Scores, max_tokens=1200, tries=4))
    try:
        one, two = ask(a, b), ask(b, a)  # B first as A, then swapped
    except Exception:
        return False
    keep = one["b"] > one["a"] and two["a"] > two["b"]
    with open(os.path.join(out, "judge.jsonl"), "a") as fh:
        fh.write(json.dumps({"tag": tag, "a": a, "b": b, "first": one, "swapped": two, "kept_b": keep}) + "\n")
    return keep


def draw_rounds(gen: str, film: str, out: str, report: dict, p: dict, voice: list[dict], d: dict) -> str:
    """THE DRAWN FILM: the cast, a shot list, every scene drawn alone with the pen and the cast, a contact sheet of the
    whole film, small patches kept only when a two-way judge prefers them"""
    from concurrent.futures import ThreadPoolExecutor
    from google.genai import types
    img = lambda f: types.Part.from_bytes(data=open(f, "rb").read(), mime_type="image/jpeg")
    dna = p.get("dna") or {}
    fam = dna.get("family") or "paper"
    art, world = f"{lookmod.FAMILIES[fam]['name']}: {lookmod.FAMILIES[fam]['art']}.", lookmod.world(fam)
    n = len(voice)
    text = lambda i: p["lines"][i]  # the sentence lives in plan.json; voice.json has only the audio and the word times
    lines = "\n".join(f"{i + 1}. \"{text(i)}\" (storyboard idea: {(d['scenes'][i] if i < len(d['scenes']) else {}).get('idea', '')})" for i in range(n))
    film_text = f"THE FILM: {p.get('title') or p['topic']}\n{art}\n{world}\n\nTHE LINES:\n{lines}"

    # 1. THE CAST: drawn once each, alone, on a test sheet, patched, judged
    say("Casting the film: the people and things that come back, drawn once each", "write")
    cast = json.loads(argon.think([film_text], CAST_PLAN, Cast, max_tokens=8000))["cast"]
    cast = [c for c in cast if re.fullmatch(r"[A-Z][A-Za-z0-9]*", c["name"])][:8]
    for c in cast:
        c["poses"] = [re.sub(r"[^a-z_]", "", x.lower()) for x in (c.get("poses") or [])][:5] or (["stand"] if c["kind"] == "person" else ["full"])
    def cast_ask(c: dict) -> list:
        u = " | ".join(json.dumps(x) for x in c["poses"])
        contract = (PERSON_CONTRACT if c["kind"] == "person" else THING_CONTRACT).format(name=c["name"], poses=u, first=c["poses"][0])
        return [DRAW_CAST.format(pen="../../../argon/pen", art=art, world=world, name=c["name"], kind=c["kind"], what=c["what"], contract=contract)]
    def draw_cast(c: dict) -> bool:
        ok = draw_compiled(gen, os.path.join(gen, f"cast-{c['name']}-v1.tsx"), drawn_code(argon.think(cast_ask(c), DRAW_SYSTEM, max_tokens=40000)), cast_ask(c))
        say(f"Cast: {c['name']} drawn ({', '.join(c['poses'])})" + ("" if ok else ": it does not compile, left out"), "write")
        return ok
    with ThreadPoolExecutor(4) as ex:
        ok = list(ex.map(draw_cast, cast))
    if cast and not any(ok):
        raise RuntimeError("no cast piece compiled: the compile check itself is likely broken (see the .failed.tsx files)")
    cast = [c for c, k in zip(cast, ok) if k]
    vers = {c["name"]: 1 for c in cast}
    if cast:
        cast_sheet(gen, cast, vers, dna)
        s1 = frames_of(gen, "castsheet.tsx", os.path.join(out, "frames", "cast-1"), [(f"c{k}", k) for k in range(len(cast))])
        def improve_cast(kc: tuple[int, dict]) -> bool:
            k, c = kc
            sheet = os.path.join(s1, f"c{k}.jpg")
            return os.path.exists(sheet) and patched(gen, os.path.join(gen, f"cast-{c['name']}-v1.tsx"), os.path.join(gen, f"cast-{c['name']}-v2.tsx"),
                                                     cast_ask(c) + [img(sheet), CAST_LOOK.format(what=c["what"])])
        with ThreadPoolExecutor(4) as ex:
            ok2 = list(ex.map(improve_cast, enumerate(cast)))
        if any(ok2):
            cast_sheet(gen, cast, {c["name"]: 2 if k2 else 1 for c, k2 in zip(cast, ok2)}, dna)
            s2 = frames_of(gen, "castsheet.tsx", os.path.join(out, "frames", "cast-2"), [(f"c{k}", k) for k, k2 in enumerate(ok2) if k2])
            for k, (c, k2) in enumerate(zip(cast, ok2)):
                a, b = os.path.join(s1, f"c{k}.jpg"), os.path.join(s2, f"c{k}.jpg")
                if k2 and os.path.exists(b) and judge(out, f"cast member: {c['name']}", c["what"], [a], [b], f"cast-{c['name']}"):
                    vers[c["name"]] = 2
        say("The cast, kept: " + ", ".join(f"{c['name']} (v{vers[c['name']]})" for c in cast), "ok")
    cast_index(gen, vers)
    cast_api = "\n".join(f"- <{c['name']} t={{t}} {'pose' if c['kind'] == 'person' else 'state'}=\"{'|'.join(c['poses'])}\" />: {c['what']}" for c in cast) or "- (no cast)"

    # 2. THE SHOT LIST
    say(f"Planning {n} shots so no two scenes are the same picture", "write")
    shots = json.loads(argon.think([film_text + "\n\nTHE CAST:\n" + cast_api], SHOT_PLAN, Shots, max_tokens=24000))["shots"]
    shots = {s["scene"] - 1: s for s in shots}
    picks = pick_library(p, d, shots)  # the motion library, whole: people, crowds, vehicles, creatures, motions... when a shot needs them
    if picks:
        say(f"The library offers {sum(len(m) for m in picks.values())} piece(s) to {len(picks)} shot(s): " + ", ".join(sorted({x for m in picks.values() for x in m})), "write")
    json.dump({"cast": cast, "shots": shots, "library": {str(i + 1): m for i, m in picks.items()}}, open(os.path.join(out, "shots.json"), "w"), indent=1, ensure_ascii=False)

    # 3. EVERY SCENE, drawn alone with the pen and the cast
    def ask_of(i: int) -> list:
        s, v = shots.get(i) or {}, voice[i]
        words = ", ".join(f'"{w["w"]}" at {w["s"]:.1f}s' for w in v["words"])
        say_ = f"Words on screen, big (60 px or more), only these if any: {', '.join(s.get('words') or [])}." if s.get("words") else "No words on screen."
        return [DRAW_SCENE.format(pen="../../../argon/pen", cast_names=", ".join(vers) or "", cast_api=cast_api, art=art, world=world,
                                  setting=s.get("setting", ""), time=s.get("time", ""), shot=s.get("shot", ""), subject=s.get("subject", ""),
                                  cast_here=", ".join(s.get("cast") or []) or "none", action=s.get("action", ""), composition=s.get("composition", ""),
                                  dur=v["seconds"] + PAD, text=text(i), words=words, say=say_) + library_for_print({i: picks[i]} if picks.get(i) else {})]
    def draw(i: int) -> bool:
        ok = draw_compiled(gen, scene_file(gen, i, 1), drawn_code(argon.think(ask_of(i), DRAW_SYSTEM, max_tokens=60000)), ask_of(i))
        say(f"Scene {i + 1} drawn ({(shots.get(i) or {}).get('shot', '')}, {(shots.get(i) or {}).get('setting', '')[:40]})" + ("" if ok else ": it does not compile"), "write", i)
        return ok
    with ThreadPoolExecutor(4) as ex:
        ok1 = list(ex.map(draw, range(n)))
    pick = {i: 1 for i in range(n) if ok1[i]}
    open(film, "w").write(drawn_film(gen, n, pick))
    say(f"{len(pick)} of {n} scenes drawn. Rendering their stills", "fix")
    s1 = frames_of(gen, "entry.ts", os.path.join(out, "frames", "draw-1"), scene_jobs(voice, list(pick)))

    # 4. THE CONTACT SHEET: the whole film looked at at once
    notes: dict[int, list[str]] = {}
    sheet = os.path.join(out, "contact-sheet.jpg")
    if contact_sheet(s1, n, sheet):
        try:
            shot_text = "\n".join(f"{i + 1}. {s.get('shot', '')} | {s.get('setting', '')} | {s.get('subject', '')}" for i, s in sorted(shots.items()))
            got = json.loads(argon.think([img(sheet), "THE SHOTS:\n" + shot_text + "\n\nTHE CAST:\n" + cast_api], SHEET_LOOK, SheetNotes, max_tokens=6000))["notes"]
            for x in got:
                notes.setdefault(x["scene"] - 1, []).append(f"{x['problem']}: {x['fix']}")
            say(f"The director looked at the whole film: {len(got)} note(s)" + (": " + "; ".join(f"scene {x['scene']} {x['problem']}" for x in got[:4]) if got else ""), "fix")
        except Exception as e:
            say(f"The contact sheet was not read ({str(e)[:60]})", "fix")

    # 5. SMALL PATCHES on every scene, kept only when the two-way judge prefers them
    def improve(i: int) -> bool:
        a, b = os.path.join(s1, f"s{i}a.jpg"), os.path.join(s1, f"s{i}b.jpg")
        if not os.path.exists(b):
            return False
        try:
            look = SCENE_PATCH.format(notes="\n".join(notes.get(i, [])) or "(none)")
            return patched(gen, scene_file(gen, i, 1), scene_file(gen, i, 2), ask_of(i) + [img(a), img(b), look])
        except RuntimeError:
            return False
    with ThreadPoolExecutor(4) as ex:
        ok2 = list(ex.map(improve, list(pick)))
    tried = [i for i, k in zip(list(pick), ok2) if k]
    if tried:
        open(film, "w").write(drawn_film(gen, n, {**pick, **{i: 2 for i in tried}}))
        s2 = frames_of(gen, "entry.ts", os.path.join(out, "frames", "draw-2"), scene_jobs(voice, tried))
        def decide(i: int) -> tuple[int, bool]:
            a = [os.path.join(s1, f"s{i}{k}.jpg") for k in "ab"]
            b = [os.path.join(s2, f"s{i}{k}.jpg") for k in "ab"]
            if not all(os.path.exists(f) for f in a + b):
                return i, False
            return i, judge(out, f"scene {i + 1}", f'the line "{text(i)}" as the shot: {(shots.get(i) or {}).get("subject", "")}', a, b, f"scene-{i + 1}")
        with ThreadPoolExecutor(4) as ex:
            for i, keep in ex.map(decide, tried):
                pick[i] = 2 if keep else 1
    report["drawn"] = {"scenes": n, "drawn": len(pick), "cast": {c["name"]: vers[c["name"]] for c in cast}, "notes": sum(len(v) for v in notes.values()),
                       "patched": len(tried), "kept_patch": sum(v == 2 for v in pick.values())}
    say(f"Patches kept in {report['drawn']['kept_patch']} of {len(tried)} scene(s) (the judge must prefer them both ways)", "fix")
    src = drawn_film(gen, n, pick)
    open(film, "w").write(src)
    return src


def stage_write(slug: str, no_render: bool = False, keep: bool = False) -> None:
    """the film, written once from the approved storyboard, then compiled, word-checked and rendered; keep: a failed
    write goes on from the film.tsx already written (no new model write)"""
    out, gen, film = begin(slug)
    sb = storyboard.load(slug)
    if not storyboard.all_approved(sb):  # the gate (the backend checks it too)
        waiting = [c["id"] for c in (sb or {}).get("cards", []) if c["status"] != "approved"]
        say(f"Not written: the storyboard is not approved yet ({', '.join(waiting) or 'no storyboard'})")
        sys.exit(2)
    p = json.load(open(os.path.join(out, "plan.json")))
    voice = json.load(open(os.path.join(out, "voice.json")))
    W, H, cap = argon.stage(p)
    report: dict = {"slug": slug, "topic": p["topic"], "scenes": len(voice), "method": "storyboard", "style": p.get("style", ""), "seconds": {},
                    "compile_rounds": 0, "render_rounds": 0, "words_rounds": 0}
    write_shell(gen, slug, p, voice, W, H)
    d = storyboard.design_of(sb)
    if p.get("draw") and p.get("print"):  # a drawn film: every scene drawn alone with the pen (draw_rounds)
        cost.stage("write")
        t0 = time.time()
        open(os.path.join(gen, "scenes.tsx"), "w").write(print_scenes(d, voice, p["dna"], slug))  # the sheets the drawn scenes play on (the stills need it)
        src = draw_rounds(gen, film, out, report, p, voice, d)
        report["seconds"]["write"] = round(time.time() - t0)
        report["lines_first_draft"] = len(src.splitlines())
        report["compiles"] = not compile_errors(gen)
        if report["compiles"] and not no_render:
            src = render_rounds(gen, film, src, out, report, slug)
        return finish(slug, out, src, report, no_render, [c["id"] for c in sb["cards"]])
    ask = brief(p, voice, W, H, cap) + "\n" + design_text(d)
    allowed = [w for s in d["scenes"] for w in s.get("words") or []] + [(s.get("chart") or {}).get("values", "") for s in d["scenes"]] + [c["text"] for s in d["scenes"] for c in s.get("callouts") or []]
    system = writer_system("" if p.get("print") else p.get("style", ""), cap)
    if p.get("story"):  # a story film is shot in painted worlds with a camera: no regions
        system = system.replace("\n\n" + LAYOUT_KIT, "")
    if p.get("clear"):
        system = system.replace("THE FILE CONTRACT", CLEAR_WRITE + "\n\nTHE FILE CONTRACT")
    if p.get("print"):
        dna = p["dna"]
        pw = print_write(p)
        system = system.replace("THE FILE CONTRACT", pw + "\n\nTHE FILE CONTRACT").replace(
            "- The player draws the captions and plays the voice: keep the bottom CAPTION_SAFE pixels free of important content.",
            "- The player plays the voice; there are NO captions: use the whole frame.")
        system = re.sub(r"- export const SCENES:.*?the scene shows only the ground\.", lambda m: STORY_CONTRACT if p.get("story") else PRINT_CONTRACT, system, count=1, flags=re.S)
    elif p.get("mix"):
        system = system.replace("THE FILE CONTRACT", MIX_WRITE + "\n\n" + COLLAGE_KIT + "\n\nTHE FILE CONTRACT")
        system = re.sub(r"- export const SCENES:.*?the scene shows only the ground\.", lambda m: MIX_CONTRACT, system, count=1, flags=re.S)
    if p.get("mix"):
        system = re.sub(r"2\. ONE GROUND for the whole film.*?between parts of the film\.", "2. THE GROUND is painted by the player; you never draw one.", system, count=1, flags=re.S)
        motion = [str(i + 1) for i, s in enumerate(d["scenes"]) if (s.get("scene_kind") or "motion") in CODE_KINDS]
        ask += f"\n\nWRITE ONLY THESE SCENES (motion/map), as MOTION: {', '.join(motion)}"
        system = system.replace('Imports ONLY from "react", "remotion" and "./brief".', 'Imports ONLY from "react", "remotion", "./brief" and the ' + ("PRINT KIT." if p.get("print") else "COLLAGE KIT."))
        allowed += [l.lower() for l in p["lines"]]  # a flow or kinetic scene may show the narration's own words
    if sb.get("map"):  # the map scenes stand on the real map; its two imports are allowed besides react, remotion and ./brief
        mk = sb["map"]
        kit = (MAP_KIT.replace("SLUG", slug).replace("{countries}", ", ".join(mk["countries"]))
               .replace("{states}", ", ".join(mk["states"])).replace("{rivers}", ", ".join(mk["rivers"])))
        system = system.replace("THE FILE CONTRACT", kit + f"\nTOWNS: {', '.join(mk['places'])}\n\nTHE FILE CONTRACT")
        system = (system.replace('"remotion" and "./brief".', '"remotion", "./brief" and the REAL MAP KIT\'s two imports.')
                  .replace('"./brief" and the COLLAGE KIT.', '"./brief", the COLLAGE KIT and the REAL MAP KIT\'s two imports.')
                  .replace('"./brief" and the PRINT KIT.', '"./brief", the PRINT KIT and the REAL MAP KIT\'s two imports.'))
        allowed += mk["countries"] + mk["states"] + mk["rivers"] + mk["places"] + [x["name"] for s in d["scenes"] for x in s.get("places") or []]
    drawn = [i for i, s in enumerate(d["scenes"]) if (s.get("scene_kind") or "motion") in CODE_KINDS]
    if p.get("print") and not keep:  # the motion library's things and actors, in the look (src/print/bridge.tsx)
        picks = pick_library(p, d)
        if picks:
            say(f"Picked {sum(len(m) for m in picks.values())} motion-library piece(s) for {len(picks)} scene(s): "
                + ", ".join(sorted({n for m in picks.values() for n in m})), "write")
            ask += library_for_print(picks)
            report["library"] = {str(i + 1): m for i, m in picks.items()}
            system = (system.replace('"./brief" and the PRINT KIT.', '"./brief", the PRINT KIT and the MOTION LIBRARY PIECES listed (with Lib and At).')
                      .replace("the PRINT KIT and the REAL MAP KIT's two imports.", "the PRINT KIT, the REAL MAP KIT's two imports and the MOTION LIBRARY PIECES listed (with Lib and At)."))
    cost.stage("write")
    t0 = time.time()
    if keep and os.path.exists(film):
        say("Going on from the film already written (no new write)", "write")
        answer = "```tsx\n" + open(film).read() + "\n```"
    elif p.get("print") and not drawn:  # every scene is a printed spread or photo: nothing for the model to write
        say("Every scene is a printed spread: no drawn scenes to write", "write")
        answer = "```tsx\nimport React from \"react\";\n\nexport const MOTION: Record<number, React.FC> = {};\n```"
    else:
        say(f"Writing the film from the approved storyboard: {len(drawn) if p.get('mix') else len(voice)} drawn scene(s) in one file", "write")
        live_file("write.json", {"state": "streaming", "text": "", "chars": 0, "lines": 0})
        answer = argon.think(with_refs(ask, p["dna"].get("family", "paper")) if p.get("print") else ask, system, max_tokens=64000, live=streamer("write.json"), waiting=waiter)
    live_file("write.json", {"state": "done", "text": code_of(answer)[-24000:], "chars": len(answer), "lines": code_of(answer).count("\n") + 1})
    report["seconds"]["write"] = round(time.time() - t0)
    open(os.path.join(out, "raw-write.txt"), "w").write(answer)
    src = code_of(answer)
    src, lifted = lift_over_ground(src)
    if lifted:
        report["lifted_over_ground"] = lifted
        say(f"Lifted {lifted} scene wrapper(s) over the ground (they would have been painted under it, blank)", "fix")
    open(film, "w").write(src)
    report["lines_first_draft"] = len(src.splitlines())
    say(f"Wrote film.tsx: {report['lines_first_draft']} lines in {report['seconds']['write']} s", "write")
    if not keep:  # the rules this draft was written under: a check holds a film only to rules it was given
        json.dump({"regions": LAYOUT_KIT in system}, open(os.path.join(out, "rules.json"), "w"))
    if p.get("print"):  # the printed spreads, built from the storyboard (never by the model)
        open(os.path.join(gen, "scenes.tsx"), "w").write(print_scenes(d, voice, p["dna"], slug))
        say(f"Built {len(voice) - len(drawn)} printed spread(s) from the storyboard in this film's print ({p['dna']['name']})", "write")
    elif p.get("mix"):  # the card, flow and kinetic scenes, built from the storyboard (never by the model)
        open(os.path.join(gen, "scenes.tsx"), "w").write(kit_scenes(d, voice, ground_tone(sb["ground"])))
        built = sum((s.get("scene_kind") or "motion") not in CODE_KINDS for s in d["scenes"])
        say(f"Built {built} card/flow/kinetic scene(s) from the storyboard with the collage kit", "write")
    cost.stage("fix")
    t0 = time.time()
    src = compile_rounds(gen, film, src, out, report, "fix")
    if not compile_errors(gen):
        src = words_rounds(gen, film, src, out, report, allowed)
    if p.get("mix") and not compile_errors(gen):
        regions = bool((json.load(open(os.path.join(out, "rules.json"))) if os.path.exists(os.path.join(out, "rules.json")) else {}).get("regions"))
        src = kit_rounds(gen, film, src, out, report, d, bool(sb.get("map")), regions, bool(p.get("story")))
    if p.get("print") and not compile_errors(gen):
        src = frame_rounds(gen, film, src, out, report, voice, d, bool(p.get("story")))
    report["seconds"]["compile_fix"] = round(time.time() - t0)
    report["compiles"] = not compile_errors(gen)
    if report["compiles"] and not no_render:
        src = render_rounds(gen, film, src, out, report, slug)
    finish(slug, out, src, report, no_render, [c["id"] for c in sb["cards"]])


def finish(slug: str, out: str, src: str, report: dict, no_render: bool, written: list[str]) -> None:
    report["lines_final"] = len(src.splitlines())
    costs_into(report, out)
    report["state"] = "done" if report.get("video") else "failed" if not report.get("compiles") or not no_render else "compiled"
    if report.get("video"):  # a film that rendered: what it drew that the library lacked is kept for the next films
        try:
            report["grown"] = grow_library(slug, src)
        except Exception as e:
            say(f"The library was not grown ({str(e)[:120]}): the film is done all the same")
    json.dump(report, open(os.path.join(out, "report.json"), "w"), indent=1)
    if report.get("compiles"):  # what each line said when it went into the film: a later change shows up as "changed"
        def put(sb: dict) -> None:
            for c in sb["cards"]:
                if c["id"] in written:
                    sb.setdefault("written", {})[c["id"]] = storyboard.design_hash(c)
        storyboard.update(slug, put)
    publish()
    say("Report: " + json.dumps(report))


def stage_finish(slug: str, no_render: bool = False) -> None:
    """a film drawn in Claude Code (film.tsx: MOTION, one drawing per scene, the .claude/skills/draw-film steps): set on the
    storyboard's sheets, compiled and rendered with no model call; a scene left out of MOTION plays its printed spread"""
    out, gen, film = begin(slug)
    sb = storyboard.load(slug)
    p = json.load(open(os.path.join(out, "plan.json")))
    voice = json.load(open(os.path.join(out, "voice.json")))
    if not p.get("print") or not os.path.exists(film):
        say("Not finished: a Claude Code film is a look film with its film.tsx drawn first", "error")
        sys.exit(2)
    W, H, _ = argon.stage(p)
    report: dict = {"slug": slug, "topic": p["topic"], "scenes": len(voice), "method": "storyboard", "drawer": "claude", "style": p.get("style", ""),
                    "seconds": {}, "compile_rounds": 0, "render_rounds": 0, "words_rounds": 0}
    write_shell(gen, slug, p, voice, W, H)
    open(os.path.join(gen, "scenes.tsx"), "w").write(print_scenes(storyboard.design_of(sb), voice, p["dna"], slug))
    src = open(film).read()
    report["lines_first_draft"] = len(src.splitlines())
    errs = compile_errors(gen)
    report["compiles"] = not errs
    say(f"Drawn in Claude Code: film.tsx, {len(src.splitlines())} lines" + (f", {len(errs)} compile error(s): " + " | ".join(errs[:3])[:400] if errs else ", compiles"),
        "error" if errs else "write")
    if not errs and not no_render:
        t0 = time.time()
        say("Rendering the film", "render")
        ok, log = render(gen, os.path.join(HERE, "out", f"oneshot-{slug}.mp4"))
        report["seconds"]["render"] = round(time.time() - t0)
        if ok:
            report["video"] = os.path.join(HERE, "out", f"oneshot-{slug}.mp4")
            say(f"DONE {report['video']}", "done")
        else:
            open(os.path.join(out, "render-fail-1.log"), "w").write(log)
            say("The render failed: see render-fail-1.log", "error")
    finish(slug, out, src, report, no_render, [c["id"] for c in sb["cards"]])


def scene_block(src: str, k: int) -> tuple[int, int] | None:
    """where Scene<k> is in the file: from its declaration to the next top-level declaration or comment"""
    lines = src.splitlines()
    start = next((n for n, l in enumerate(lines) if re.match(rf"(export\s+)?(const|function)\s+Scene{k}\b", l)), None)
    if start is None:
        return None
    end = next((n for n in range(start + 1, len(lines)) if re.match(r"(export\s+)?(const|let|function|type|interface|class)\s|//|/\*", lines[n])), len(lines))
    return start, end


def stage_redo(slug: str, ids: list[str], no_render: bool = False) -> None:
    """rewrite only the lines whose cards changed since the film was written; every other line keeps its code"""
    out, gen, film = begin(slug)
    sb = storyboard.load(slug)
    if not storyboard.all_approved(sb):
        say("Not rewritten: approve every card first")
        sys.exit(2)
    p = json.load(open(os.path.join(out, "plan.json")))
    voice = json.load(open(os.path.join(out, "voice.json")))
    W, H, cap = argon.stage(p)
    write_shell(gen, slug, p, voice, W, H)  # a line with new words has a new voice and length
    report = json.load(open(os.path.join(out, "report.json"))) if os.path.exists(os.path.join(out, "report.json")) else {"slug": slug, "seconds": {}}
    report["redo_rounds"] = report.get("redo_rounds", 0) + 1
    src = open(film).read()
    before_all = src
    system = writer_system("" if p.get("print") else p.get("style", ""), cap).replace("ANSWER with the complete file in one ```tsx block and nothing else.", REWRITE_ANSWER)
    if p.get("story"):
        system = system.replace("\n\n" + LAYOUT_KIT, "")
    if p.get("print"):  # a redrawn scene keeps the film's printed theme
        dna = p["dna"]
        pw = print_write(p)
        system = system.replace("THE FILE CONTRACT", pw + "\n\nTHE FILE CONTRACT").replace(
            'Imports ONLY from "react", "remotion" and "./brief".', 'Imports ONLY from "react", "remotion", "./brief" and the PRINT KIT.').replace(
            "- The player draws the captions and plays the voice: keep the bottom CAPTION_SAFE pixels free of important content.",
            "- The player plays the voice; there are NO captions: use the whole frame.")
    cost.stage("redo")
    done = []
    if p.get("print"):  # the spreads are rebuilt from the cards as they are now; only drawn scenes are rewritten
        open(os.path.join(gen, "scenes.tsx"), "w").write(print_scenes(storyboard.design_of(sb), voice, p["dna"], slug))
        done = [cid for cid in ids if (storyboard.card(sb, cid)["design"].get("scene_kind") or "motion") not in CODE_KINDS]
        ids = [cid for cid in ids if cid not in done]
        if done:
            say(f"Rebuilt the printed spread(s) {', '.join(done)} from their cards", "write")
    for cid in ids:
        c = storyboard.card(sb, cid)
        i = c["i"]
        at = scene_block(src, i + 1)
        if not at:
            say(f"Line {cid}: Scene{i + 1} not found in film.tsx; left as it is")
            continue
        lines = src.splitlines()
        head_end = scene_block(src, 1)[0] if scene_block(src, 1) else at[0]
        words = " ".join(f"{w['w']}@{w['s']:.2f}" for w in voice[i]["words"])
        notes = "; ".join(n["note"] for n in c.get("notes") or [])
        ask = (f"THE FILE'S TOP PART (already in the file):\n{chr(10).join(lines[:head_end])}\n\n"
               f"SCENE {i + 1}: duration {voice[i]['seconds'] + PAD:.2f} s\n  voice: {c['line']}\n  word times (s): {words}\n\n"
               + design_text({"ground": sb["ground"], "scenes": [c["design"]]})
               + (f"\nTHE CREATOR'S NOTES ON THIS SCENE: {notes}" if notes else "")
               + f"\n\nTHE SCENE'S CURRENT CODE (replace it whole; keep the name Scene{i + 1}):\n{chr(10).join(lines[at[0]:at[1]])}")
        say(f"Rewriting line {cid} (Scene{i + 1}) from its card", "write", i)
        live_file("write.json", {"state": "streaming", "text": "", "chars": 0, "lines": 0, "scene": i})
        new = code_of(argon.think(with_refs(ask, p["dna"].get("family", "paper")) if p.get("print") else ask, system, max_tokens=16000, live=streamer("write.json"), waiting=waiter)).rstrip("\n")
        live_file("write.json", {"state": "done", "text": new, "chars": len(new), "lines": new.count("\n") + 1, "scene": i})
        src = lift_over_ground("\n".join(lines[:at[0]] + new.splitlines() + [""] + lines[at[1]:]) + "\n")[0]
        open(film, "w").write(src)
        done.append(cid)
    src = compile_rounds(gen, film, src, out, report, f"redo-{report['redo_rounds']}")
    if compile_errors(gen):
        open(film, "w").write(before_all)
        say("The rewritten lines do not compile: the film is back as it was before", "error")
        report["compiles"] = True
        finish(slug, out, before_all, report, True, [])
        return
    report["compiles"] = True
    report.pop("video", None)
    if not no_render:
        src = render_rounds(gen, film, src, out, report, slug)
    finish(slug, out, src, report, no_render, done)


def main() -> None:
    global LOG_PATH
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", help="an argon film's slug: its plan, theme, voice and word times")
    ap.add_argument("--no-render", action="store_true")
    ap.add_argument("--drawn", action="store_true", help="the drawn method: object rigs, puppets, one ground, four looks")
    ap.add_argument("--design", action="store_true", help="the designed method: a design pass (what is on screen), then the drawn writer (how)")
    ap.add_argument("--topic", default="", help="a new film: its own story and voice (instead of --from)")
    ap.add_argument("--minutes", type=float, default=1)
    ap.add_argument("--publish", action="store_true", help="only refresh the app's files (no model call)")
    ap.add_argument("--slug", default="", help="the app's film (public/oneshot/<slug>/job.json), with --stage")
    ap.add_argument("--stage", choices=["plan", "redraw", "reline", "write", "redo", "finish"], help="one step of the app's pipeline")
    ap.add_argument("--card", default="", help="redraw/reline: the card id (L03); redo: ids, comma separated")
    ap.add_argument("--note", default="", help="redraw: the creator's note; reline: the line's new words")
    ap.add_argument("--keep", action="store_true", help="write: go on from the film.tsx already written (after a failed compile)")
    a = ap.parse_args()
    if a.publish:
        publish()
        return
    if a.stage:
        slug = re.sub(r"[^a-z0-9-]", "", a.slug)
        try:
            run_stage(a, slug)
        except SystemExit:
            raise
        except Exception as e:  # the editor shows why it stopped, in one line
            say(f"Stopped with an error: {str(e)[:300]}", "error")
            raise
        return
    if not a.src and not a.topic:
        ap.error("--from <argon slug> or --topic is needed")
    legacy(a)


def run_stage(a, slug: str) -> None:
    {"plan": lambda: stage_plan(slug), "redraw": lambda: redraw(slug, a.card, a.note), "reline": lambda: reline(slug, a.card, a.note),
     "write": lambda: stage_write(slug, a.no_render, a.keep), "finish": lambda: stage_finish(slug, a.no_render), "redo": lambda: stage_redo(slug, [x for x in a.card.split(",") if x], a.no_render)}[a.stage]()


def legacy(a) -> None:
    """the terminal experiments: --from <argon slug> or --topic, with --drawn / --design"""
    global LOG_PATH
    slug = re.sub(r"[^a-z0-9-]", "", a.src) if a.src else re.sub(r"[^a-z0-9]+", "-", a.topic.lower())[:40].strip("-") + time.strftime("-%m%d%H%M")
    gen = os.path.join(HERE, "src", "oneshot", "gen", slug)
    out = os.path.join(HERE, "public", "oneshot", slug)
    os.makedirs(gen, exist_ok=True)
    os.makedirs(out, exist_ok=True)
    for old in ("cost.json", "report.json", "run.log"):  # each run is measured on its own
        if os.path.exists(os.path.join(out, old)):
            os.remove(os.path.join(out, old))
    LOG_PATH = os.path.join(out, "run.log")
    cost.start(out)
    publish()
    t0 = time.time()
    films = out if a.topic else os.path.join(HERE, "public", "argon", slug)  # where the story came from
    if a.topic:
        say(f"Writing and voicing the story of {a.topic!r} (about {a.minutes:g} min)")
        p, voice = story(Exp(slug, gen), a.topic, a.minutes)
    else:
        p, voice = json.load(open(os.path.join(films, "plan.json"))), json.load(open(os.path.join(films, "voice.json")))
    W, H, cap = argon.stage(p)
    film = os.path.join(gen, "film.tsx")
    report: dict = {"slug": slug, "topic": p["topic"], "scenes": len(voice), "seconds": {"story_voice": round(time.time() - t0)} if a.topic else {},
                    "compile_rounds": 0, "render_rounds": 0, "words_rounds": 0}

    write_shell(gen, slug, p, voice, W, H)
    report["method"] = "designed" if a.design else "drawn" if a.drawn else "oneshot"
    system, ask, allowed = (SYSTEM_DRAWN if a.drawn or a.design else SYSTEM), brief(p, voice, W, H, cap), []
    if a.design:
        cost.stage("design")
        t0 = time.time()
        say(f"Designing {len(voice)} scenes: the idea, the device, the actors, every motion on its word")
        d = design(p, voice, out)
        report["seconds"]["design"] = round(time.time() - t0)
        for s in d["scenes"]:  # the design, readable in the run log
            say(f"  scene {s['scene']}: {s['device']} / {s['look']}: {s['idea']} | " + "; ".join(f"\"{m['word']}\" {m['actor']} {m['verb']}" for m in s["moves"])
                + (f" | words: {', '.join(s['words'])}" if s.get("words") else ""))
        system = system.replace("THE FILE CONTRACT", DESIGNED_RULES + "\n\nTHE FILE CONTRACT")
        ask += "\n" + design_text(d)
        allowed = [w for s in d["scenes"] for w in s.get("words") or []] + [(s.get("chart") or {}).get("values", "") for s in d["scenes"]] + [c["text"] for s in d["scenes"] for c in s.get("callouts") or []]
    say(f"One-shot film of {p['topic']!r}: {len(voice)} scenes, one write ({report['method']})")
    cost.stage("write")
    t0 = time.time()
    answer = argon.think(ask, system.replace("CAPTION_SAFE", f"{cap}"), max_tokens=64000)
    report["seconds"]["write"] = round(time.time() - t0)
    open(os.path.join(out, "raw-write.txt"), "w").write(answer)
    src = code_of(answer)
    src, lifted = lift_over_ground(src)
    if lifted:
        report["lifted_over_ground"] = lifted
        say(f"Lifted {lifted} scene wrapper(s) over the ground (they would have been painted under it, blank)", "fix")
    open(film, "w").write(src)
    report["lines_first_draft"] = len(src.splitlines())
    say(f"Wrote film.tsx: {report['lines_first_draft']} lines in {report['seconds']['write']} s")

    cost.stage("fix")
    t0 = time.time()
    src = compile_rounds(gen, film, src, out, report, "fix")
    if a.design and not compile_errors(gen):
        src = words_rounds(gen, film, src, out, report, allowed)
    report["seconds"]["compile_fix"] = round(time.time() - t0)
    report["compiles"] = not compile_errors(gen)
    if report["compiles"] and not a.no_render:
        src = render_rounds(gen, film, src, out, report, slug)

    report["lines_final"] = len(src.splitlines())
    costs_into(report, out)
    report["state"] = "done" if report.get("video") else "failed" if not report["compiles"] or not a.no_render else "compiled"
    base = os.path.join(films, "cost.json")
    if not a.topic and os.path.exists(base):  # the argon film of the same narration: its scene writing and review stages
        b = json.load(open(base))["stages"]
        report["argon_code_and_review"] = {k: sum(b.get(s, {}).get(k, 0) for s in ("code", "review")) for k in ("calls", "usd", "tokens_in", "tokens_out")}
        report["story_and_voice_usd"] = round(sum(b.get(s, {}).get("usd", 0) for s in ("plan", "voice")), 4)  # what the narration cost
    json.dump(report, open(os.path.join(out, "report.json"), "w"), indent=1)
    publish()
    say("Report: " + json.dumps(report))


if __name__ == "__main__":
    main()
