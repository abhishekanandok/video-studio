"""Make a skill by chatting (replaces the 7-step form): the creator names a topic, the agent asks ONE question at a time
with 3-4 suggested answers (educational or informational, the picture style, how pictures move, text on screen, a
background, their own sources), suggests from its own knowledge, stops when it knows enough, and saves the skill: a look
(api/vskills.py LookIn), the creator's uploads (references and assets) and a short "how to show this topic" note. With
no sources of their own, one web-grounded search of how teachers explain the topic feeds that note.

The conversation lives in the browser; every turn sends it whole, with the state so far."""

import concurrent.futures
import json
import re
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.api import vskills as vs
from app.db import session_scope
from app.llm import get_llm

router = APIRouter()
SEARCH_TIMEOUT_SEC = 25
TURN_TIMEOUT_SEC = 20  # a chat turn that takes longer falls back to the scripted question (Gemini on Vertex can stall for minutes)
NOTE_TIMEOUT_SEC = 30


def _within(secs: int, fn, *args, **kw):
    """Run fn in a worker thread; TimeoutError if it takes longer (the worker is left to finish on its own)."""
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        return pool.submit(fn, *args, **kw).result(timeout=secs)
    finally:
        pool.shutdown(wait=False)

# what the agent may set, the allowed values, and the default when the creator never says
FIELDS = {q["key"]: [o[0] for o in q["options"]] for q in vs.QUESTIONS if not q.get("multi")}
ASKS = ["purpose", "references", "picture_style", "motion", "text", "background", "sources"]


class State(BaseModel):
    """What the creator has told us so far (empty = not known yet)."""
    purpose: str = Field("", description="educational | informational")
    picture_style: str = Field("", description="upi_explainer | motion_graphics | real_photos | cartoon | realistic")
    motion: str = Field("", description="on_words (pictures move with the words, every ~2 s) | zoom_per_slide | still")
    text: str = Field("", description="key_words | captions (everything said) | bullets | none")
    background: str = Field("", description="per_chapter | topic | one | own (their uploaded image)")
    pace: str = Field("", description="normal | calm | fast; only if the creator says")
    has_sources: str = Field("", description="yes (they uploaded or will give sources/pictures) | no (search how teachers explain it) | empty")
    references: str = Field("", description="yes (they uploaded a Short, video or screenshot whose look they like) | no (none) | empty")
    name: str = Field("", description="a short name for the skill, e.g. 'Photosynthesis, motion graphics'")
    notes: str = Field("", description="anything else the creator said about the look, in their words, one line each")


class Turn(BaseModel):
    reply: str = Field(description="one or two short sentences: react to the last answer in a few words, then ask the ONE next question")
    suggestions: list[str] = Field(default_factory=list, description="3-4 short tappable answers to that question, the one you recommend for this topic first")
    asking: str = Field("", description="which thing the question is about: purpose | picture_style | motion | text | background | sources | other; empty when done")
    state: State
    done: bool = Field(False, description="true when enough is known to make the skill (at most 6 questions)")


SYSTEM = """You help an Indian educational creator make a SKILL: how the videos for one topic should look. You speak short,
warm, plain English (Hinglish is fine if they write Hinglish). Ask ONE question per turn, with 3-4 suggested answers.

Things to find out, roughly in this order (skip any the creator already answered or that is obvious from the topic):
- purpose: is it an educational lesson or an informational explainer?
- references: do they have a Short, a video or a screenshot whose LOOK they love? Ask them to upload it (the skill's look
  is learned from it, the way their exam-notes skills learn from reference slides). Suggest "Upload a Short or screenshot"
  and "No, describe it instead". If they uploaded files, references=yes and do not ask again.
- picture_style: real pictures, motion graphics, cartoonish, realistic, or the UPI explainer style (bold box cards, sticky notes, lime highlighter)
- motion: should pictures move every ~2 s with the spoken words, zoom once per slide, or stay still?
- text: text on screen: key words, everything said, bullet points, or none?
- background: changes every chapter, follows the topic, one look throughout, or upload their own image?
- sources: do they have their own sources or pictures to upload, or should we search how teachers usually explain this topic?

Rules:
- Use what you know about the topic to recommend: put your recommended answer FIRST and say in a few words why
  (e.g. for the water cycle, a flowing diagram that moves with the words).
- Suggestions are short (2-7 words), tappable, and match the allowed values above. Never number them.
- If the creator uploaded files, note it ("Got your 2 pictures") and do not ask for them again.
- Keep it short: at most 6 questions. Stop as soon as the six things are known (or have clear defaults).
- Keep `state` complete every turn: carry over everything known, fill what the last answer told you.
- When done: done=true, reply is a 1-2 sentence summary of the skill, suggestions empty, give state.name."""


class ChatIn(BaseModel):
    topic: str
    messages: list[dict] = Field(default_factory=list)  # [{"role": "user"|"assistant", "text": ...}]
    state: dict = Field(default_factory=dict)


def _clean(state: dict) -> dict:
    """Keep only allowed values; a paraphrase ("motion graphics", "follows the topic") is read back to its value."""
    out = {k: str(v or "").strip() for k, v in state.items() if k in State.model_fields}
    for k, allowed in FIELDS.items():
        if out.get(k) and out[k] not in allowed:
            out[k] = _match(k, out[k])
    if out.get("references") not in ("yes", "no", None):
        out["references"] = _match("references", out["references"])
    if out.get("has_sources") not in ("yes", "no"):
        out["has_sources"] = _match("sources", out["has_sources"]) if out.get("has_sources") else ""
    return out


def _merge(prev: dict, new: dict, messages: list[dict]) -> dict:
    """What is known: the state so far, what the model added (an empty value never erases a known one), and the
    creator's answer to each question we asked, read directly (the model sometimes forgets to carry a value over)."""
    out = _clean(prev)
    out.update({k: v for k, v in _clean(new).items() if v})
    for q, a in zip(messages, messages[1:]):
        key = q.get("asking") or ""
        if q.get("role") == "assistant" and a.get("role") == "user" and key in SCRIPT:
            field = "has_sources" if key == "sources" else key
            if not out.get(field):
                out[field] = _match(key, a.get("text", ""))
    return out


# a scripted fallback when no model answers: the same questions, one at a time
SCRIPT = {
    "purpose": ("Is this a lesson or an explainer?", ["Educational: a lesson", "Informational: an explainer"]),
    "references": ("Do you have a Short, video or screenshot whose look you love? Upload it and I'll learn the look from it.", ["Upload a Short or screenshot", "No, I'll describe it"]),
    "picture_style": ("What kind of pictures?", ["The UPI explainer style", "Motion graphics", "Real pictures", "Cartoonish"]),
    "motion": ("How should the pictures move?", ["With the words, every ~2 s", "One zoom per slide", "Stay still"]),
    "text": ("What text should be on screen?", ["Key words", "Everything I say", "Bullet points", "No text"]),
    "background": ("And the background?", ["Changes every chapter", "Changes with the topic", "One look throughout", "Upload my own image"]),
    "sources": ("Do you have your own sources or pictures?", ["Search how teachers explain it", "I'll upload my own"]),
}


SYNONYMS = {"on_words": ["with the words", "with my words", "every 2", "every ~2", "every couple", "move with", "every two"],
            "zoom_per_slide": ["zoom"], "still": ["still", "static", "no movement"], "topic": ["topic", "follows", "subject"],
            "per_chapter": ["chapter"], "own": ["upload", "my own", "custom background"], "one": ["one look", "throughout", "same"],
            "captions": ["everything", "captions", "subtitles"], "none": ["no text", "none"], "bullets": ["bullet"], "key_words": ["key word", "keywords"],
            "upi_explainer": ["upi"], "motion_graphics": ["motion graphic", "diagram", "animated graphic"], "real_photos": ["real pic", "real photo", "photo"],
            "cartoon": ["cartoon"], "realistic": ["realistic", "3d"], "educational": ["educational", "lesson", "students"], "informational": ["informational", "explainer", "general"]}


def _match(key: str, answer: str) -> str:
    """Read an answer (a chip, the creator's words, or a model's paraphrase) back to one allowed value; '' if unclear."""
    a = answer.lower().replace("_", " ")
    if key == "references":
        return "yes" if "uploaded" in a else "no" if any(w in a for w in ("no", "describe")) else ""
    if key == "sources":
        if any(w in a for w in ("search", "no sources", "don't have", "dont have", "no,")):
            return "no"
        return "yes" if any(w in a for w in ("upload", "my own", "uploaded", "yes", "i have", "textbook", "notes")) else ""
    values = FIELDS.get(key, [])
    named = [v for v in values if re.search(rf"\b{v.replace('_', ' ')}\b", a)]  # the value itself, as a word
    if named:
        return named[0]
    return next((v for v in values if any(w in a for w in SYNONYMS.get(v, []))), "")


def _scripted(body: ChatIn) -> Turn:
    state = _merge(body.state, {}, body.messages)
    todo = [k for k in ASKS if not state.get("has_sources" if k == "sources" else k)]
    if not todo or len([m for m in body.messages if m.get("role") == "assistant"]) >= 6:
        state["name"] = state.get("name") or body.topic.strip()[:60]
        return Turn(reply=f"Got it. I'll make a skill for {body.topic}.", suggestions=[], asking="", state=State(**state), done=True)
    q, sug = SCRIPT[todo[0]]
    return Turn(reply=q, suggestions=sug, asking=todo[0], state=State(**state), done=False)


@router.post("/vskills/chat")
def chat(body: ChatIn):
    topic = body.topic.strip()
    if not topic:
        raise HTTPException(400, "Name the topic first.")
    convo = "\n".join(f"{'Creator' if m.get('role') == 'user' else 'You'}: {m.get('text', '')}" for m in body.messages[-16:])
    user = f"Topic: {topic}\nState so far: {json.dumps(_clean(body.state))}\n\nConversation:\n{convo or '(none yet: ask the first question)'}"
    try:
        turn = _within(TURN_TIMEOUT_SEC, get_llm().structured, Turn, SYSTEM, user, max_tokens=1500)
    except Exception as e:
        print(f"  vskill chat: model failed or slow ({type(e).__name__} {str(e)[:120]}); using the scripted questions", flush=True)
        return {**_scripted(body).model_dump(), "fallback": True}
    turn.state = State(**_merge(body.state, turn.state.model_dump(), body.messages))
    turn.suggestions = [s.strip() for s in turn.suggestions if s.strip()][:4]
    if not turn.done and len(turn.suggestions) < 2:  # a question with no answers to tap: the scripted ones for it
        st = turn.state.model_dump()
        todo = [k for k in ASKS if not st.get("has_sources" if k == "sources" else k)] or ["sources"]
        turn.asking = turn.asking if turn.asking in SCRIPT else todo[0]
        turn.suggestions = SCRIPT[turn.asking][1]
    if len([m for m in body.messages if m.get("role") == "assistant"]) >= 7:
        turn.done = True  # never an endless interview
    if turn.done:
        turn.suggestions, turn.asking = [], ""
        turn.state.name = turn.state.name or topic[:60]
    return turn.model_dump()


class HowTo(BaseModel):
    note: str = Field(description="5-7 short bullet lines ('- ...'): the order to explain it in, the analogy teachers use, "
                                  "the diagram or picture that makes it click, a common misconception, what to put on screen")


def _search_how_teachers(topic: str) -> tuple[str, list[str]]:
    """One Google-grounded search (short timeout); ('', []) when it fails or takes too long."""
    llm = get_llm()
    if getattr(llm, "name", "") != "gemini":
        return "", []
    from google.genai import types

    from app.config import settings

    def run():
        return llm.client.models.generate_content(
            model=settings.gemini_model,
            contents=f"How do good teachers usually explain '{topic}' to school students, especially visually? "
                     "The order, the analogies, the diagrams, the common misconceptions, what to show on screen. Be brief.",
            config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]))

    try:
        resp = _within(SEARCH_TIMEOUT_SEC, run)
    except Exception as e:
        print(f"  vskill chat: teacher search failed or slow ({type(e).__name__} {str(e)[:100]}); using the model's own knowledge", flush=True)
        return "", []
    sources = []
    try:
        for ch in resp.candidates[0].grounding_metadata.grounding_chunks or []:
            if ch.web and (ch.web.title or ch.web.domain):
                sources.append(ch.web.title or ch.web.domain)
    except Exception:
        pass
    return (resp.text or "")[:6000], sources[:6]


def _how_to_show(topic: str, state: dict, search: bool) -> dict:
    """The skill's "how to show this topic" note: from a web search of how teachers explain it, else the model's own knowledge."""
    found, sources = _search_how_teachers(topic) if search else ("", [])
    look = f"Look: {state.get('purpose') or 'educational'}, {state.get('picture_style') or 'upi_explainer'} pictures, motion {state.get('motion') or 'on_words'}."
    base = f"Topic: {topic}\n{look}\n" + (f"What teachers do (from a web search):\n{found}" if found else "Use your own knowledge of how good teachers explain it.")
    try:
        note = _within(NOTE_TIMEOUT_SEC, get_llm().structured, HowTo, "You write the brief a video's scene director follows to show a topic well. Short, concrete, visual.", base, max_tokens=900).note
    except Exception as e:
        print(f"  vskill chat: how-to note failed or slow ({type(e).__name__} {str(e)[:100]})", flush=True)
        note = found[:1200]
    return {"note": note.strip()[:1500], "searched": bool(found), "sources": sources}


@router.post("/vskills/chat/save")
async def save(data: str = Form(...), references: list[UploadFile] = File(default=[]), assets: list[UploadFile] = File(default=[]),
               background: UploadFile | None = File(default=None)):
    """Save what the chat found: the look, the uploads (references to study, assets to use, a background image) and the
    "how to show this topic" note. Returns the new skill; the page then asks for its sample frames."""
    try:
        d = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(400, "bad data")
    topic = (d.get("topic") or "").strip()[:120]
    if not topic:
        raise HTTPException(400, "Name the topic first.")
    state = _merge(d.get("state") or {}, {}, d.get("messages") or [])
    with session_scope() as s:
        sid, no = vs.next_id(s)
    refs = await vs._save_files(sid, references, vs.VIDEO_TYPES + vs.IMAGE_TYPES, "ref")
    own = await vs._save_files(sid, assets, vs.IMAGE_TYPES, "asset")
    bg = await vs._save_files(sid, [background] if background else [], vs.IMAGE_TYPES, "background")
    has_sources = state.get("has_sources") == "yes" or bool(refs or own)
    how = _how_to_show(topic, state, search=not has_sources)

    look = {**vs.LOOK_DEFAULTS, **{k: v for k, v in state.items() if k in FIELDS and v}}
    if look["background"] == "own" and not bg:
        look["background"] = "per_chapter"  # asked for their own image but never uploaded one
    if bg:
        look["background"], look["background_image"] = "own", f"vskills/{sid}/{bg[0]}"
    # "Pictures on the words" (real photos timed to the word): on for real or realistic pictures, off for cartoons
    if look["picture_style"] in ("real_photos", "realistic") and "photos" not in look["show"]:
        look["show"] = look["show"] + ["photos"]
    elif look["picture_style"] == "cartoon":
        look["show"] = [x for x in look["show"] if x != "photos"]
    look["notes"] = "\n".join(x for x in [state.get("notes", ""), f"How to show {topic}:\n{how['note']}"] if x).strip()[:2000]
    look = vs._check(vs.LookIn(**look))

    said = [m.get("text", "") for m in d.get("messages") or [] if m.get("role") == "user"]
    pretty = {q["key"]: dict(map(tuple, q["options"])) for q in vs.QUESTIONS}
    summary = ", ".join(pretty[k].get(look[k], look[k]) for k in ("purpose", "picture_style", "motion", "text"))
    skill = {"id": sid, "no": no, "kind": "look", "name": (state.get("name") or topic)[:60], "extends": vs.LOOK_IDS.get(look["picture_style"], "board"), "topic": topic,
             "about": f"For {topic}: {summary}.", "describe": "\n".join(f"• {x}" for x in [topic] + said[1:] if x.strip())[:4000],
             "how_to_show": how, "references": refs, "assets": own + bg, "look": look, "sample": ["hook", "route"], "ready": True,
             "made_by": "chat", "created": time.strftime("%Y-%m-%d")}
    with session_scope() as s:
        vs.add_custom(s, skill)
    return skill
