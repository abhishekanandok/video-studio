"""V1 skills for educational creators (docs/system/lld/visuals/skills-v1.md): one look the creator shapes to their needs
(the Board explainer), the moment skills that decide what appears on which kind of line, and the skills creators make
(from their own description, uploaded Shorts or demo videos, images and assets). Every skill has a number (SKILL 01...)
and a page, like the exam-notes Skill Tab: how it looks (sample frames rendered with its settings), its layout, its
style, backgrounds by subject, notes to the agent, and what the agent studied.

A video carries its own copy of the choices (config "skills"); the scene director (video/scenes.py) follows them.
Files live in video/public/vskills/<id>/."""

import json
import os
import re
import subprocess
import sys
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.db import session_scope
from app.models import Setting

router = APIRouter()
VIDEO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "video"))
PUBLIC = os.path.join(VIDEO, "public")
ASSETS = "/studio-assets"
VIDEO_TYPES = (".mp4", ".mov", ".webm", ".m4v")
IMAGE_TYPES = (".png", ".jpg", ".jpeg", ".webp")

# the questions every look answers (the same ones the "Make a skill" chat asks), with the choices
QUESTIONS = [
    {"key": "purpose", "ask": "The video is", "options": [["educational", "Educational: a lesson"], ["informational", "Informational: an explainer"]]},
    {"key": "picture_style", "ask": "Pictures", "options": [["upi_explainer", "The UPI explainer style"], ["motion_graphics", "Motion graphics"], ["real_photos", "Real pictures"], ["cartoon", "Cartoonish"], ["realistic", "Realistic"]]},
    {"key": "motion", "ask": "Pictures move", "options": [["on_words", "With the words, every ~2 s"], ["zoom_per_slide", "One zoom per slide"], ["still", "Stay still"]]},
    {"key": "text", "ask": "Text on screen", "options": [["key_words", "Key words"], ["captions", "Everything I say"], ["bullets", "Bullet points"], ["none", "No text"]]},
    {"key": "background", "ask": "Background", "options": [["per_chapter", "Changes every chapter"], ["topic", "Changes with the topic"], ["one", "One look throughout"], ["own", "My own image"]]},
    {"key": "transition", "ask": "Between scenes", "options": [["soft", "Soft zoom and drift"], ["board", "Move across one board"], ["slide", "Slide"], ["cut", "Hard cut"]]},
    {"key": "show", "ask": "Also show", "multi": True, "options": [["memes", "Memes and reactions"]]},
    {"key": "pace", "ask": "Pace", "options": [["normal", "Normal: something new every 3 s"], ["calm", "Calm: every 5 s"], ["fast", "Fast, for Shorts: every 1.5 s"]]},
]
# where things sit on the frame (the layout section)
LAYOUT = [
    {"key": "sticker_place", "ask": "Stickers sit", "options": [["margins", "In the side margins"], ["corners", "In the corners"], ["none", "Nowhere (off)"]]},
    {"key": "sticker_size", "ask": "Sticker size", "options": [["medium", "Medium"], ["small", "Small"], ["large", "Large"]]},
    {"key": "caption_pos", "ask": "Captions sit", "options": [["bottom", "At the bottom"], ["top", "At the top"]]},
    {"key": "stage", "ask": "The scene sits", "options": [["center", "In the centre"], ["left", "Left (room on the right)"], ["right", "Right (room on the left)"]]},
]

LOOK_DEFAULTS = {"text": "key_words", "background": "per_chapter", "transition": "soft", "show": ["numbers", "flows", "maps", "photos", "stickers"],
                 "pace": "normal", "language": "Hinglish", "paper": "board", "background_image": "", "notes": "",
                 "sticker_place": "margins", "sticker_size": "medium", "caption_pos": "bottom", "stage": "center",
                 "purpose": "educational", "picture_style": "upi_explainer", "motion": "on_words"}

# The five built-in skills are five LOOKS, each with its own renderer and theme (no shared house style): SKILL 01 is
# the UPI-demo board (video/src/scenes, fixed templates); 02-05 are drawn by the motion director (video/motionfx.py +
# src/motion/Motion.tsx), which designs a new palette, motif and every shot for each topic, following the look's style
# brief. Each look draws every capability (captions, numbers, flows, maps, photos, stickers) in its own way; what is on
# is switched in the look: captions by look.text ("none" = off), the rest by membership in look.show. A video's config
# "skills" carries {"skill": id, "renderer": ..., "style": brief, "moments": the moment capabilities on, "look": {...}}.
SKILLS = [
    {"id": "board", "no": 1, "kind": "look", "name": "UPI explainer", "renderer": "scenes", "picture_style": "upi_explainer",
     "about": "Bold box cards with hard ink shadows, sticky notes with tape and a lime highlighter, on paper grounds. "
              "The signature Drishyya board: crisp, punchy, made for Hinglish explainers.",
     "includes": ["Kinetic key words, the key one lit in lime", "Box-card flows, counters and compare cards", "Animated Noto stickers in the margins"],
     "sample_topic": "How UPI works", "sample": ["hook", "route", "paid", "recap"], "ready": True},
    {"id": "motion", "no": 2, "kind": "look", "name": "Motion graphics", "renderer": "motion", "picture_style": "motion_graphics",
     "about": "Kurzgesagt-style flat vector motion design: a palette invented for each topic, illustrated icons that travel along "
              "arrows, diagrams that build themselves. No two topics share colours.",
     "includes": ["A new palette and motif per topic", "Objects that move to show cause and effect", "Flows drawn as icons joined by travelling arrows"],
     "style": "Flat vector motion graphics in the Kurzgesagt / Vox explainer tradition. Bold geometric shapes, gradients and "
              "radial grounds with soft patterns (dots, grid, rays). Illustrated flat icons (no photos unless a real person or "
              "place is named). Processes as icon -> arrow -> icon with a thing travelling along the arrow. Numbers as big "
              "counters beside the icon of what they count. Smooth zoom, rise and draw entrances; loops that keep 1-2 things alive. "
              "Clean, modern, no sticky notes, no hard ink shadows (use shadow 'soft' or 'none').",
     "sample_topic": "The water cycle", "sample": ["hook", "route"], "ready": True},
    {"id": "documentary", "no": 3, "kind": "look", "name": "Real pictures", "renderer": "motion", "picture_style": "real_photos",
     "about": "A photo documentary: every scene is built around a real photograph (Wikimedia), framed as prints and polaroids on "
              "warm paper and kraft grounds, with museum-label captions and dashed routes between pictures.",
     "includes": ["A real, checked photo on the word that names it", "Polaroids, tape and museum labels", "Flows as photo -> photo with dashed arrows"],
     "style": "Photo documentary scrapbook. EVERY shot has a real photo (image element, source 'photo', frame 'polaroid' or "
              "'card', tape true) as the hero, 50-70 units wide. Warm grounds: kraft brown, cream paper, sepia (pattern 'paper'). "
              "Supporting words on small typed labels (box with radius 2) like museum captions; key dates and numbers as "
              "counters on a label. Processes and routes as two or three photos joined by dashed arrows. Slow fades and "
              "push-ins, no bouncing, no cartoon icons, no emoji.",
     "sample_topic": "The Mughal empire", "sample": ["route", "hook"], "ready": True},
    {"id": "cartoon", "no": 4, "kind": "look", "name": "Cartoonish", "renderer": "motion", "picture_style": "cartoon",
     "about": "A playful cartoon world: candy colours, thick wobbly outlines, characters and objects with faces, bouncy "
              "entrances. Made for younger classes and fun Shorts.",
     "includes": ["Cartoon characters and objects", "Bouncy, squashy motion", "Flows as a comic strip of panels"],
     "style": "Playful children's cartoon. Bright saturated candy palettes (bubblegum pink, sunshine yellow, sky blue, mint), "
              "thick dark outlines (strokeWidth 1.2+), round blobs and bursts behind everything, hard offset shadows. Cartoon "
              "icons and 3D emoji with faces (people, animals, the sun, a cloud, a drop of water with a face); generate a "
              "cartoon sticker when an object has no icon. Words in big rounded sticky notes and speech bubbles. Entrances "
              "'pop', 'drop' and 'stamp'; loops 'bob' and 'wiggle' on most things. Processes as a comic strip: 3 panels "
              "(boxes) left to right with an arrow between each. Never photos.",
     "sample_topic": "Photosynthesis", "sample": ["hook", "paid"], "ready": True},
    {"id": "realistic", "no": 5, "kind": "look", "name": "Realistic", "renderer": "motion", "picture_style": "realistic",
     "about": "Cinematic and serious: dark, muted grounds, real photographs and 3D objects, thin elegant lines and slow camera "
              "moves. For older students, science and current affairs.",
     "includes": ["Dark cinematic palettes", "Real photos and 3D-style objects", "Thin-line diagrams and data"],
     "style": "Cinematic, realistic, documentary-serious. Dark muted grounds (near-black navy, charcoal, deep teal; 'radial' "
              "or 'linear', no busy patterns). Hero objects are real photos (source 'photo', frame 'card') or 3D-style "
              "objects; no flat cartoon icons, no sticky notes, no emoji faces. Thin elegant outlines (strokeWidth 0.4), "
              "shadow 'soft', one restrained accent colour. Text small and precise, in white or light grey. Processes as "
              "thin lines joining labelled photo cards; numbers as large thin counters with a thin bar chart. Slow 'fade' "
              "and 'zoom' entrances, camera 'push' or 'drift'; almost no loops.",
     "sample_topic": "Black holes", "sample": ["route", "recap"], "ready": True},
]
LOOK_IDS = {x["picture_style"]: x["id"] for x in SKILLS}  # the chat's picture_style answer -> the look it builds on
CAPABILITIES = [
    {"id": "captions", "name": "Captions", "moment": False,
     "about": "What you say appears on screen as you say it, word by word; the key term is marked the moment it is spoken.",
     "when": "every line (key words, everything, or bullets: see Text on screen)", "ready": True,
     "shows": ["Key words: 2-5 big words per line, the key one in lime", "Everything I say: the line under the scene, words lighting up as they are said", "Bullet points: the line's points as a numbered list"]},
    {"id": "numbers", "name": "Numbers that land", "moment": True, "templates": ["number", "compare", "timer"],
     "about": "Counters, compare cards and timers: a figure counts up exactly when you say it, never a number you did not say.",
     "when": "a line that hinges on a figure: a count, a %, money, a time", "ready": True,
     "shows": ["Counter: the figure counts up, with what it counts", "Compare: two cards side by side with 'vs'", "Timer: a ring fills to the time said"]},
    {"id": "flows", "name": "Process and flow", "moment": True, "templates": ["flow", "hub", "list"],
     "about": "Steps, cycles, cause and effect, one hub and its parts: each box appears as you name it.",
     "when": "a line that walks through steps or connects things", "ready": True,
     "shows": ["Flow: three boxes in order, a marker travelling A → B → C", "Hub: one thing in the middle, its parts around it", "List: 3-4 numbered points, one by one"]},
    {"id": "maps", "name": "Map and place", "moment": True, "templates": ["map"],
     "about": "For places, rivers, borders and routes: a real map, the camera flies there, the border draws and pins drop on the word.",
     "when": "a line that names a real place or a route (16:9 films; a vertical film shows a headline instead)", "ready": True,
     "shows": ["Border: the country's border draws itself", "Pins: pins drop on each place as it is named", "Route: a river or route draws along its real course"]},
    {"id": "photos", "name": "Pictures on the words", "moment": True,
     "about": "Real photos from Wikimedia, each checked by a vision model, arriving exactly on the word that names them.",
     "when": "a line that names a real thing, place or person worth seeing", "ready": True,
     "shows": ["A framed print with a slow push-in, timed to the word", "A short caption and the photo's credit"]},
    {"id": "stickers", "name": "Stickers", "moment": False,
     "about": "Animated Noto emoji that pop in beside the scene on the word they belong to (where they sit: see the layout).",
     "when": "a line with a thing, a feeling or a reaction worth a sticker", "ready": True,
     "shows": ["One or two animated stickers per line, in the margins or corners", "A reaction on a surprising fact"]},
]
CAP_SHOW = [c["id"] for c in CAPABILITIES if c["id"] != "captions"]  # the capabilities switched by look.show
MOMENTS = [c["id"] for c in CAPABILITIES if c["moment"]]


# what each capability looks like when the motion director draws it (the board's own descriptions are in CAPABILITIES)
MOTION_SHOWS = {"captions": ["The line under the scene, the key word lit in the look's accent colour"],
                "numbers": ["A big counter beside the icon or photo of what it counts", "A small bar chart, only with figures said"],
                "flows": ["Icons or photos joined by arrows that draw themselves, a thing travelling along them"],
                "maps": ["The geography engine (border, pins, routes) is wired to the board look first; this look shows a photo of the place for now"],
                "photos": ["A real photo (Wikimedia) framed in the look's style, on the word that names it"],
                "stickers": ["Illustrated icons and 3D emoji in the look's style, moving with the story"]}


def renderer_of(s, skill: dict) -> str:
    if skill.get("renderer"):
        return skill["renderer"]
    base = next((x for x in SKILLS if x["id"] == skill.get("extends")), SKILLS[0])
    return base["renderer"]


def capabilities(look: dict, renderer: str = "scenes") -> list[dict]:
    """The skill's capabilities with whether this look has each one on, described the way this look's renderer draws them."""
    show = look.get("show") or []
    out = []
    for c in CAPABILITIES:
        c = {**c, "on": look.get("text") != "none" if c["id"] == "captions" else c["id"] in show}
        if renderer == "motion":
            c = {**c, "shows": MOTION_SHOWS[c["id"]], "ready": c["id"] != "maps"}
        out.append(c)
    return out


def _dir(skill_id: str) -> str:
    d = os.path.join(PUBLIC, "vskills", re.sub(r"[^a-z0-9-]", "", skill_id))
    os.makedirs(d, exist_ok=True)
    return d


def _url(skill_id: str, name: str) -> str:
    p = os.path.join(_dir(skill_id), name)
    return f"{ASSETS}/vskills/{skill_id}/{name}?v={int(os.path.getmtime(p))}" if os.path.exists(p) else ""


def _get(s, key: str, default):
    row = s.get(Setting, key)
    return (row.value if row else None) or default


def _put(s, key: str, value) -> None:
    row = s.get(Setting, key) or Setting(key=key, value={})
    row.value = value
    s.add(row)


def _custom(s, raw: bool = False) -> list[dict]:
    """The creator's skills. Shown numbered after the five built-in looks, each built on the look its picture style
    names (skills made before the five looks said "board" whatever they chose)."""
    mine = list(_get(s, "vskill_custom", {}).get("skills", []))
    if raw:
        return mine
    return [{**x, "no": len(SKILLS) + k + 1, "extends": LOOK_IDS.get((x.get("look") or {}).get("picture_style", ""), x.get("extends") or "board")}
            for k, x in enumerate(mine)]


def _find(s, skill_id: str) -> dict:
    if any(c["id"] == skill_id for c in CAPABILITIES):  # the old moment-skill pages are now capabilities of SKILL 01
        skill_id = "board"
    skill = next((x for x in SKILLS if x["id"] == skill_id), None) or next((x for x in _custom(s) if x["id"] == skill_id), None)
    if not skill:
        raise HTTPException(404, "No such skill")
    return skill


def _look_key(skill_id: str) -> str:
    return "vskill_look" if skill_id == "board" else f"vskill_look:{skill_id}"


def _look_of(s, skill: dict) -> dict:
    if skill in SKILLS or any(x["id"] == skill["id"] for x in SKILLS):  # a built-in look: its defaults, then the creator's changes
        return {**LOOK_DEFAULTS, "picture_style": skill["picture_style"], **_get(s, _look_key(skill["id"]), {})}
    return {**LOOK_DEFAULTS, **(skill.get("look") or {})}


def _detail(s, skill: dict) -> dict:
    meta = _get(s, f"vskill:{skill['id']}", {})
    sid = skill["id"]
    look = _look_of(s, skill) if skill["kind"] == "look" else None
    renderer = renderer_of(s, skill)
    return {**skill, "renderer": renderer, "look": look, "capabilities": capabilities(look, renderer) if look else [],
            "sample_topic": meta.get("sample_topic") or skill.get("topic") or skill.get("sample_topic", ""),
            "feedback": meta.get("feedback", []), "backgrounds": [{**b, "url": _url(sid, b["file"]) if b.get("file") else ""} for b in meta.get("backgrounds", [])],
            "references": [{"name": n, "url": _url(sid, n), "video": n.lower().endswith(VIDEO_TYPES)} for n in skill.get("references", [])],
            "assets": [{"name": n, "url": _url(sid, n)} for n in skill.get("assets", [])],
            "samples": [u for u in (_url(sid, f"sample-{k}.png") for k in range(3)) if u],
            "learned": _learned_view(sid, meta.get("learned") or {}),
            "sampling": meta.get("sampling", False)}


def _learned_view(sid: str, l: dict) -> dict:
    """What the learning agent made, for the skill's page: its state and log, the look it wrote, the plate, the
    stickers, the reference frames it studied, and what it could not match."""
    spec = l.get("spec") or {}
    return {"state": l.get("state", ""), "log": (l.get("log") or [])[-14:], "not_matched": l.get("not_matched") or [],
            "painted_refs": bool(l.get("painted_refs")), "references": [u for u in (_url(sid, r) for r in l.get("references") or []) if u],
            "plate": _url(sid, "plate.png") if spec.get("plate") else "",
            "stickers": [{"name": n, "url": _url(sid, os.path.basename(p))} for n, p in (l.get("stickers") or {}).items()],
            "spec": {k: spec.get(k) for k in ("summary", "mood", "motif", "font", "picture_source", "picture_style", "layout_rules", "flow_style",
                                              "number_style", "compare_style", "text_style", "motion_style", "card_radius", "card_outline", "card_shadow")} if spec else None,
            "palettes": [{"name": p["name"], "colors": p["colors"], "ink": p["ink"], "accent": p["accent"]} for p in spec.get("palettes") or []]}


@router.get("/vskills")
def list_skills():
    with session_scope() as s:
        cards = [{**c, "look": _look_of(s, c), "samples": [u for u in (_url(c["id"], f"sample-{k}.png") for k in range(1)) if u]} for c in SKILLS + _custom(s)]
        cards = [{**c, "renderer": renderer_of(s, c), "capabilities": capabilities(c["look"], renderer_of(s, c))} for c in cards]
        return {"skills": SKILLS, "cards": cards, "capabilities": CAPABILITIES, "moments": MOMENTS,
                "questions": QUESTIONS, "layout": LAYOUT, "look": {**LOOK_DEFAULTS, **_get(s, "vskill_look", {})}, "custom": _custom(s)}


@router.get("/vskills/{skill_id}")
def get_skill(skill_id: str):
    with session_scope() as s:
        return {**_detail(s, _find(s, skill_id)), "questions": QUESTIONS, "layout": LAYOUT}


class LookIn(BaseModel):
    text: str = "key_words"
    background: str = "per_chapter"
    transition: str = "soft"
    show: list[str] = Field(default_factory=list)
    pace: str = "normal"
    language: str = "Hinglish"
    paper: str = "board"
    background_image: str = ""
    notes: str = ""
    sticker_place: str = "margins"
    sticker_size: str = "medium"
    caption_pos: str = "bottom"
    stage: str = "center"
    purpose: str = "educational"
    picture_style: str = "upi_explainer"
    motion: str = "on_words"  # pictures move with the spoken words | zoom once per slide | stay still


def _check(look: LookIn) -> dict:
    for q in QUESTIONS + LAYOUT:
        allowed = {o[0] for o in q["options"]} | (set(CAP_SHOW) if q["key"] == "show" else set())
        v = getattr(look, q["key"])
        if (q.get("multi") and not set(v) <= allowed) or (not q.get("multi") and v not in allowed):
            raise HTTPException(400, f"{q['ask']}: not one of the choices")
    return look.model_dump()


@router.put("/vskills/look")
def save_look(body: LookIn):
    """The creator's defaults for the Board explainer (each new video starts from them, and can change them)."""
    return save_skill_look("board", body)


@router.put("/vskills/{skill_id}/look")
def save_skill_look(skill_id: str, body: LookIn):
    with session_scope() as s:
        skill = _find(s, skill_id)
        if skill["kind"] != "look":
            raise HTTPException(400, "Only a look has these settings")
        look = _check(body)
        if any(x["id"] == skill_id for x in SKILLS):
            _put(s, _look_key(skill_id), look)
        else:
            _put(s, "vskill_custom", {"skills": [{**x, "look": look} if x["id"] == skill_id else x for x in _custom(s, raw=True)]})
        return {"look": look}


async def _save_files(skill_id: str, files: list[UploadFile], types: tuple, prefix: str) -> list[str]:
    names = []
    for f in files:
        ext = os.path.splitext(f.filename or "")[1].lower()
        if not f.filename or ext not in types:
            continue
        name = f"{prefix}{len(names) + 1}-{re.sub(r'[^a-zA-Z0-9]+', '-', os.path.splitext(f.filename)[0])[:40]}{ext}"
        with open(os.path.join(_dir(skill_id), name), "wb") as out:
            out.write(await f.read())
        names.append(name)
    return names


@router.post("/vskills/custom")
async def make_skill(data: str = Form(...), references: list[UploadFile] = File(default=[]), assets: list[UploadFile] = File(default=[])):
    """A skill the creator makes: a name, their description, Shorts / demo videos / images they like (references), their own
    images (logo, background), what it builds on, and their choices. It is a look built on the Board explainer."""
    try:
        d = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(400, "bad data")
    name = (d.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Give the skill a name.")
    look = _check(LookIn(**(d.get("look") or {})))
    with session_scope() as s:
        sid, no = next_id(s)
        refs = await _save_files(sid, references, VIDEO_TYPES + IMAGE_TYPES, "ref")
        own = await _save_files(sid, assets, IMAGE_TYPES, "asset")
        if not refs and not (d.get("describe") or "").strip():
            raise HTTPException(400, "Upload a Short or demo video you like, or describe the video you want.")
        skill = {"id": sid, "no": no, "kind": "look", "name": name[:60], "extends": d.get("extends") or "board",
                 "about": (d.get("describe") or "").strip()[:600] or "Your own look.", "describe": (d.get("describe") or "").strip()[:4000],
                 "references": refs, "assets": own, "look": look, "sample": ["hook", "route"], "ready": True, "created": time.strftime("%Y-%m-%d")}
        add_custom(s, skill)
        return skill


def next_id(s) -> tuple[str, int]:
    """The next custom skill's id and number (after every skill so far, so a deleted one never reuses a folder)."""
    taken = {x["id"] for x in _custom(s, raw=True)}
    k = len(taken) + 1
    while f"custom-{k}" in taken or os.path.exists(os.path.join(PUBLIC, "vskills", f"custom-{k}")):
        k += 1
    return f"custom-{k}", len(SKILLS) + len(taken) + 1


def add_custom(s, skill: dict) -> None:
    _put(s, "vskill_custom", {"skills": _custom(s, raw=True) + [skill]})


@router.delete("/vskills/{skill_id}")
def delete_skill(skill_id: str):
    """Remove one of the creator's own skills (the built-in one stays), with its files."""
    if not skill_id.startswith("custom-"):
        raise HTTPException(400, "Only your own skills can be removed")
    with session_scope() as s:
        _find(s, skill_id)
        _put(s, "vskill_custom", {"skills": [x for x in _custom(s, raw=True) if x["id"] != skill_id]})
        row = s.get(Setting, f"vskill:{skill_id}")
        if row:
            s.delete(row)
    import shutil
    shutil.rmtree(_dir(skill_id), ignore_errors=True)
    return {"deleted": skill_id}


class NoteIn(BaseModel):
    text: str


@router.post("/vskills/{skill_id}/feedback")
def feedback(skill_id: str, body: NoteIn):
    """Tell the agent what to change, in words. Kept with the skill and given to the scene director with its notes."""
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Say what to change.")
    with session_scope() as s:
        skill = _find(s, skill_id)
        meta = _get(s, f"vskill:{skill_id}", {})
        meta["feedback"] = meta.get("feedback", []) + [{"at": time.strftime("%d %b %H:%M"), "text": text[:1000]}]
        _put(s, f"vskill:{skill_id}", meta)
        if skill["kind"] == "look":  # the look's notes carry every instruction the creator gave
            look = _look_of(s, skill)
            look["notes"] = (look.get("notes", "") + "\n" + text).strip()[-2000:]
            save_skill_look(skill_id, LookIn(**look))
        learned = renderer_of(s, skill) == "motion" and (meta.get("learned") or {}).get("spec")
    if learned:  # the agent changes the learned look as asked, repaints what changed and draws a new sample
        _learn(skill_id, "feedback", note=text)
    with session_scope() as s:
        return _detail(s, _find(s, skill_id))


@router.post("/vskills/{skill_id}/backgrounds")
async def add_background(skill_id: str, subject: str = Form(...), notes: str = Form(""), file: UploadFile | None = File(default=None)):
    """A background for one subject: a video of that subject uses it (the creator's own image, or what to paint)."""
    subject = " ".join(subject.split())[:40]
    if not subject:
        raise HTTPException(400, "Name the subject.")
    with session_scope() as s:
        _find(s, skill_id)
        meta = _get(s, f"vskill:{skill_id}", {})
        files = await _save_files(skill_id, [file] if file else [], IMAGE_TYPES, f"bg-{re.sub(r'[^a-z0-9]', '', subject.lower())}-")
        bgs = [b for b in meta.get("backgrounds", []) if b["subject"].lower() != subject.lower()]
        meta["backgrounds"] = bgs + [{"subject": subject, "notes": notes.strip()[:300], "file": files[0] if files else ""}]
        _put(s, f"vskill:{skill_id}", meta)
        return _detail(s, _find(s, skill_id))


@router.delete("/vskills/{skill_id}/backgrounds/{subject}")
def remove_background(skill_id: str, subject: str):
    with session_scope() as s:
        meta = _get(s, f"vskill:{skill_id}", {})
        meta["backgrounds"] = [b for b in meta.get("backgrounds", []) if b["subject"].lower() != subject.lower()]
        _put(s, f"vskill:{skill_id}", meta)
        return _detail(s, _find(s, skill_id))


class SampleIn(BaseModel):
    topic: str = ""  # the topic to show the look on (default: the skill's own topic, or its sample topic)


def style_of(s, skill: dict) -> str:
    """The style brief the motion director follows for this skill: its look's brief, plus the creator's own words."""
    base = skill if skill.get("style") else next((x for x in SKILLS if x["id"] == skill.get("extends")), SKILLS[0])
    look = _look_of(s, skill)
    notes = (look.get("notes") or "").strip()
    return " ".join(x for x in [base.get("style") or "", *settings_said(look), f"The creator's own words about the look: {notes[:700]}" if notes else ""] if x).strip()


def settings_said(look: dict) -> list[str]:
    """The look's settings (motion, text on screen, pace, purpose, capabilities) as sentences for the motion director."""
    show = look.get("show") or []
    said = [SAY.get(k, {}).get(look.get(k, ""), "") for k in ("motion", "text", "pace", "purpose")]
    said += ["Some shots may use a meme-style reaction (a big emoji face or a burst with a short reaction word)." if "memes" in show else "",
             "Never use real photos." if "photos" not in show else "",
             "No decorative stickers beyond what the line needs." if "stickers" not in show else ""]
    return [x for x in said if x]


# the look's settings, said to the motion director in its own terms
SAY = {"motion": {"on_words": "Things arrive on the spoken words: something new every 1.5-2 s, each entrance timed through the line.",
                  "zoom_per_slide": "Calm: place the shot's things early, then ONE slow camera push for the whole shot; few entrances, no loops.",
                  "still": "Still: everything is in place from the start ('none' or 'fade' entrances at 0), camera 'still', no loops."},
       "text": {"key_words": "On-screen words: 2-5 key words per shot, the key one marked.",
                "captions": "Few words on the stage (the captions carry the line); let the pictures speak.",
                "bullets": "On-screen words as a short numbered list of the line's points (2-4 boxes stacked).",
                "none": "No words on the stage at all: only pictures, icons, arrows and numbers."},
       "pace": {"calm": "Pace calm: fewer, bigger things.", "fast": "Pace fast, Shorts energy: quick pops, lots happening."},
       "purpose": {"informational": "Informational explainer for a general audience: story first, less like a classroom.",
                   "educational": "A lesson for students: clear steps, labelled diagrams, the key term always visible."}}


@router.post("/vskills/{skill_id}/sample")
def make_sample(skill_id: str, body: SampleIn | None = None):
    """Three frames of a short lesson ON THE SKILL'S TOPIC, drawn by the skill's own renderer with its own settings
    (video/vskill_sample.py), so the creator sees what it really does."""
    with session_scope() as s:
        skill = _find(s, skill_id)
        look = _look_of(s, skill)
        meta = _get(s, f"vskill:{skill_id}", {})
        topic = " ".join(((body.topic if body else "") or meta.get("sample_topic") or skill.get("topic") or skill.get("sample_topic") or "Photosynthesis").split())[:120]
        meta["sampling"], meta["sample_topic"] = True, topic
        _put(s, f"vskill:{skill_id}", meta)
        spec_data = {"skill": skill_id, "kind": skill["kind"], "renderer": renderer_of(s, skill), "style": style_of(s, skill), "topic": topic, "look": look}
    if spec_data["renderer"] == "motion":  # a look learned from references: the learning agent draws its sample
        return _learn(skill_id, "sample", topic=topic)
    spec = os.path.join(_dir(skill_id), "sample-spec.json")
    json.dump(spec_data, open(spec, "w"))
    backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    subprocess.Popen([sys.executable, "-u", os.path.join(VIDEO, "vskill_sample.py"), spec], cwd=backend,
                     stdout=open(os.path.join(_dir(skill_id), "sample.log"), "w"), stderr=subprocess.STDOUT, start_new_session=True)
    return {"started": True}


def _learn(skill_id: str, do: str, topic: str = "", note: str = "") -> dict:
    """Start video/vskill_learn.py for a skill (a detached process; it writes its progress into the skill's meta)."""
    with session_scope() as s:
        meta = _get(s, f"vskill:{skill_id}", {})
        meta["sampling"] = True
        meta["learned"] = {**(meta.get("learned") or {}), "state": "working", "log": ((meta.get("learned") or {}).get("log") or [])[-20:]}
        _put(s, f"vskill:{skill_id}", meta)
    backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    args = [sys.executable, "-u", os.path.join(VIDEO, "vskill_learn.py"), skill_id, "--do", do] + (["--topic", topic] if topic else []) + (["--note", note] if note else [])
    subprocess.Popen(args, cwd=backend, stdout=open(os.path.join(_dir(skill_id), "learn.log"), "a"), stderr=subprocess.STDOUT, start_new_session=True)
    return {"started": True}


@router.post("/vskills/{skill_id}/learn")
def learn(skill_id: str, body: SampleIn | None = None):
    """Learn (or learn again) the skill's look from its references and the creator's words: understand, paint, a sample,
    a comparison with the references. The UPI explainer has its own renderer: it just renders a new sample."""
    with session_scope() as s:
        skill = _find(s, skill_id)
        renderer = renderer_of(s, skill)
    if renderer != "motion":
        return make_sample(skill_id, body)
    return _learn(skill_id, "all", topic=(body.topic if body else "").strip()[:120])


def learned_get(skill_id: str) -> dict:
    """What video/vskill_learn.py learned for a skill (its state, log, spec, skin, look, stickers, not_matched)."""
    with session_scope() as s:
        return dict(_get(s, f"vskill:{skill_id}", {}).get("learned") or {})


def learned_update(skill_id: str, **changes) -> dict:
    with session_scope() as s:
        meta = _get(s, f"vskill:{skill_id}", {})
        meta["learned"] = {**(meta.get("learned") or {}), **changes}
        _put(s, f"vskill:{skill_id}", meta)
        return meta["learned"]


def learn_say(skill_id: str, msg: str, state: str | None = None) -> None:
    """One line of the agent's progress, shown live on the skill's page."""
    l = learned_get(skill_id)
    log = (l.get("log") or []) + [{"at": time.strftime("%H:%M:%S"), "msg": msg[:300]}]
    learned_update(skill_id, log=log[-40:], **({"state": state} if state else {}))
    print(msg, flush=True)


def skill_info(skill_id: str) -> dict:
    """The skill as the learning agent needs it: name, topic, notes, references, assets, look settings, its seed."""
    with session_scope() as s:
        sk = _find(s, skill_id)
        look = _look_of(s, sk)
        base = sk if sk.get("style") else next((x for x in SKILLS if x["id"] == sk.get("extends")), SKILLS[0])
        seed = sk.get("style") or " ".join(x for x in [sk.get("describe", ""), f"In the spirit of: {base.get('style', '')}"] if x)
        return {**sk, "look": look, "settings_said": " ".join(settings_said(look)), "seed": seed}


def sample_done(skill_id: str) -> None:
    """Called by video/vskill_sample.py when the frames are written."""
    with session_scope() as s:
        meta = _get(s, f"vskill:{skill_id}", {})
        meta["sampling"] = False
        _put(s, f"vskill:{skill_id}", meta)
