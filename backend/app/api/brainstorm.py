"""Brainstorm: the chat on the app's home page. The creator picks a kind of video (or just types an idea); the planner
asks the five or six questions that kind of video needs, one at a time, offers concrete answers to tap and ideas that
would make it better, and keeps a running brief. When every question is answered, the brief starts a real film
(POST /studio/films) and the pipeline takes over."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.llm import NoLLMConfigured, get_llm

router = APIRouter()


class Msg(BaseModel):
    role: str  # "user" or "assistant"
    text: str


class BrainstormIn(BaseModel):
    messages: list[Msg] = Field(min_length=1, max_length=40)


class Brief(BaseModel):
    kind: str = Field("", description="explainer | vlog | history | short; empty until known")
    subtype: str = Field("", description="e.g. finance commentary, travel vlog, unboxing, personal brand; empty until known")
    topic: str = Field("", description="the video's topic in a short phrase, empty until known")
    logline: str = Field("", description="the whole video in one short sentence, once it is clear")
    focus: str = Field("", description="what exactly it covers and leaves out")
    angle: str = Field("", description="how it is told: a story, step by step, myth vs fact, a day in the life…")
    materials: str = Field("", description="what the creator already has: a script, notes, links, footage, sources (their words, summarised)")
    audience: str = Field("", description="who it is for")
    minutes: int = Field(0, description="target length in minutes, 0 until known")
    language: str = Field("", description="Hinglish, Hindi or English; empty until known")
    tone: str = Field("", description="a few words, e.g. friendly and simple; empty until known")


class BrainstormOut(BaseModel):
    reply: str = Field(description="one short sentence reacting to the last answer (or a tip that makes the idea better), then the next question; at most 2 sentences")
    suggestions: list[str] = Field(description="3 or 4 concrete answers to the question just asked, each written 'Short title – one line of detail', specific to this creator's topic")
    brief: Brief
    step: int = Field(description="how many of this kind's questions are answered so far")
    steps: int = Field(description="how many questions this kind needs in total (5 or 6)")
    ready: bool = Field(description="true only when every question for this kind is answered")


SYSTEM = """You are Drishyya's video planner. Drishyya researches a topic, plans the video minute by minute, writes the
script in the creator's voice, the creator records it off a teleprompter (or picks an AI voice), and we add the visuals
and the edit. Your job is to collect everything needed for ONE video, asking ONE question at a time, in this order for
the kind of video (work out the kind from the first message; if it is unclear, ask that first):

EXPLAINER (concepts, how things work; FINANCE COMMENTARY is an explainer subtype):
 1. the topic  2. the focus: what exactly to cover, and what to leave out  3. how to explain it: a story, step by step,
 an analogy, myth vs fact, or the creator's own way  4. do they have a script, notes or links? (if so, ask them to paste
 or attach them)  5. who it is for and their level  6. length, language (Hinglish, Hindi or English) and tone.
 For finance commentary also ask the period or data it covers, and note we never give personal investment advice.
VLOG (travel, daily life, food, events):
 1. what the vlog is about / where they are going  2. the places or sites they are visiting  3. what their day-to-day
 life is like, what makes their days different  4. today's plan, in order  5. what footage they have or will shoot
 6. vibe, length and language. Along the way, suggest better ideas: a hook, a segment, a moment worth filming.
HISTORY & DOCUMENTARY:
 1. the real story, in one or two lines  2. the tone: serious, dramatic, calm, investigative  3. what they have:
 sources, notes, archive material  4. the question the film answers, or its angle  5. who it is for
 6. length and language. Then give the whole film back as ONE short sentence (the logline) and ask if it is right.
SHORTS & REELS:
 1. the category: informative, mind-blowing facts, unboxing, personal brand, finance commentary, or other  2. the one
 idea, in a short sentence  3. the hook for the first two seconds  4. face on camera, or voice-over with visuals
 5. platform (YouTube Shorts, Instagram Reels) and language  6. tone.

Rules: never ask about something already answered. Keep the brief updated with everything agreed. Suggestions answer the
question you just asked and are specific to their topic, not generic. Never invent facts about the topic. Reply in the
language the creator writes in. When everything is answered, set ready=true and say you are ready to start.
The reply is plain text (no markdown, no asterisks) and NEVER lists the options: they are shown as the tappable
suggestions under it. One short reaction, then the one question."""


def tidy(reply: str, has_options: bool) -> str:
    """the reply as the page shows it: no markdown, no options written out (they are the buttons), two sentences at most"""
    import re
    t = re.sub(r"\*\*|__|`", "", reply).strip()
    if has_options:  # cut where the model starts listing choices: "a) …", "1. …", "- …", "To spark some ideas…"
        m = re.search(r"(\s(?:[a-dA-D]|[1-4])[).]\s|\n\s*[-•]\s|\s(?:To spark|Pick (?:a|one)|Here are|Some ideas|Options?:|Choose))", t)
        if m and m.start() > 40:
            t = t[: m.start()].rstrip(" :,—-")
    parts = re.split(r"(?<=[.!?])\s+", t)
    if len(parts) > 2:  # keep the reaction and the question (the last sentence that asks)
        q = next((x for x in reversed(parts) if x.endswith("?")), parts[1])
        t = parts[0] + " " + q if q != parts[0] else parts[0]
    return t.strip()


@router.post("/brainstorm", response_model=BrainstormOut)
def brainstorm(body: BrainstormIn) -> BrainstormOut:
    transcript = "\n".join(f"{'Creator' if m.role == 'user' else 'Planner'}: {m.text.strip()}" for m in body.messages[-24:])
    try:
        llm = get_llm()
        if getattr(llm, "name", "") == "gemini":  # a chat turn needs no "thinking": ~3 s instead of 10-25 s
            from google.genai import types
            from app.config import settings
            from app.llm import inline_schema
            cfg = types.GenerateContentConfig(system_instruction=SYSTEM, response_mime_type="application/json", response_json_schema=inline_schema(BrainstormOut),
                                              max_output_tokens=2500, thinking_config=types.ThinkingConfig(thinking_budget=0))
            out = BrainstormOut.model_validate_json(llm.client.models.generate_content(model=settings.gemini_model, contents=transcript, config=cfg).text)
            out.reply = tidy(out.reply, bool(out.suggestions))
            out.suggestions = [tidy(x, False) for x in out.suggestions]
            return out
        out = llm.structured(BrainstormOut, SYSTEM, transcript, max_tokens=2500)
        if not out.ready and len(out.suggestions) < 3:  # GLM sometimes skips the tappable answers: ask once more (~$0.001)
            again = llm.structured(BrainstormOut, SYSTEM + "\n\nYou MUST give 3 or 4 suggestions, each 'Short title – one line of detail'.",
                                   transcript, max_tokens=2500)
            if len(again.suggestions) > len(out.suggestions):
                out = again
        out.reply = tidy(out.reply, bool(out.suggestions))
        out.suggestions = [tidy(x, False) for x in out.suggestions]
        return out
    except NoLLMConfigured as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # a dead key, quota, a refusal: tell the page instead of hanging
        msg = str(e)
        if "401" in msg or "UNAUTHENTICATED" in msg or "API key" in msg or "PERMISSION_DENIED" in msg:
            raise HTTPException(502, "The AI key in backend/.env is not working (Google rejects it). Put a working key there and restart the backend.")
        raise HTTPException(502, f"The planner could not answer: {msg[:160]}")


class StartIn(BaseModel):
    brief: Brief
    skills: dict = {}  # the "How should it look?" step: {"moments": [...], "look": {...}} (api/vskills.py)


@router.post("/brainstorm/start")
def start_film(body: StartIn):
    """Turn a finished brief into a real film: the research-first documentary pipeline, one narrator (the creator's
    voice slot), pausing after research so the creator approves the sources before anything is written."""
    from app.api.studio import FilmConfig, Role, _presets, create_film

    b = body.brief
    if not b.topic.strip():
        raise HTTPException(400, "The brief has no topic yet.")
    narrator = _presets()["documentary"]["roles"][0]
    kind = (b.kind or "explainer").lower()
    notes = [f"Kind of video: {b.kind}{f' ({b.subtype})' if b.subtype else ''}.",
             b.logline and f"In one sentence: {b.logline}", b.focus and f"Focus: {b.focus}", b.angle and f"How to tell it: {b.angle}",
             "Finance commentary: explain, never give personal investment advice." if "finance" in (b.subtype or "").lower() else ""]
    cfg = FilmConfig(
        topic=b.topic.strip(), source_text=b.materials, audience=b.audience or "curious Indian viewers",
        narration="documentary", roles=[Role(name=narrator["name"], style=narrator.get("style", ""), voice="")],
        language=b.language if b.language in ("Hinglish", "Hindi", "English") else "Hinglish", tone=b.tone,
        minutes=b.minutes or (3 if kind.startswith("short") else 8), instructions="\n".join(x for x in notes if x),
        questions=b.focus, style="archival", review_research=not kind.startswith("short"),
        investigate_rounds=0 if kind.startswith("short") else 2, vox=kind != "history", edit="scenes",
        aspect="9:16" if kind.startswith("short") else "16:9", skills=body.skills,
    )
    f = create_film(cfg)
    return {"id": f.id if hasattr(f, "id") else f["id"]}


@router.get("/usage")
def usage():
    """What the AI has cost: today's and this month's OpenRouter spend against the key's daily cap (live from OpenRouter),
    and every video's own ledger (public/<slug>/cost.json, which counts Google and OpenRouter calls alike)."""
    import glob
    import json
    import os

    import httpx

    from app.api.studio import PUBLIC
    from app.config import settings

    out: dict = {"openrouter": None, "films_usd": 0.0}
    if settings.openrouter_api_key:
        try:
            d = httpx.get("https://openrouter.ai/api/v1/key", headers={"Authorization": f"Bearer {settings.openrouter_api_key}"}, timeout=10).json()["data"]
            out["openrouter"] = {"today_usd": d.get("usage_daily"), "month_usd": d.get("usage_monthly"), "limit_usd": d.get("limit"),
                                 "remaining_usd": d.get("limit_remaining"), "resets": d.get("limit_reset")}
        except Exception as e:
            out["openrouter"] = {"error": str(e)[:120]}
    for p in glob.glob(os.path.join(PUBLIC, "*", "cost.json")):
        try:
            out["films_usd"] += json.load(open(p)).get("total_usd", 0)
        except Exception:
            pass
    out["films_usd"] = round(out["films_usd"], 2)
    return out
