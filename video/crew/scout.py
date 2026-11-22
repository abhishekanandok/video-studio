"""Skill Scout: the crew's research agent for new skills. Brainstorms with the team in the Skill Lab: reads a brief and/or a
reference picture, researches online how Indian government-exam students actually learn (the cards, notes and videos they
use), and proposes skills: what each looks like, when the Director should use it, best practices, sources, and a prompt
to generate a sample slide. It never builds a skill: an approved skill is built into the renderer, then the crew uses it."""

import json

from pydantic import BaseModel, Field

from app.llm import get_llm


class Source(BaseModel):
    title: str
    url: str


class Proposal(BaseModel):
    name: str = Field(description="Short skill name, e.g. 'Fact stack card'")
    kind: str = Field(description="One of: layout, background, motion, transition, collage, diagram, infographic, typography")
    summary: str = Field(description="What it is, in two plain sentences")
    students: str = Field(description="Why it helps an Indian government-exam aspirant learn or remember, in plain words")
    when_to_use: list[str] = Field(description="The kinds of content the Director should use it for (e.g. 'current-affairs facts with 3-5 numbers')")
    avoid_when: list[str] = Field(description="When NOT to use it")
    look: list[str] = Field(description="Exactly how the slide is laid out, piece by piece (what sits where, sizes, colours)")
    motion: list[str] = Field(description="How it moves, if at all (what appears when, transitions); empty for a still")
    best_practices: list[str] = Field(description="Rules that make it work (readable on a phone, one idea per row, ...)")
    image_prompt: str = Field(description="A complete prompt for an image model to draw ONE sample slide of this skill on a real "
                                          "exam topic, 16:9, with the exact text it should show")
    sources: list[Source] = Field(default_factory=list, description="Pages the research used")


class Proposals(BaseModel):
    skills: list[Proposal]


RESEARCH = """You are the SKILL SCOUT of a team that makes exam-prep videos for Indian government-exam aspirants (SSC, RRB,
Banking, UPSC, state PSCs; many study on phones, in Hindi and Hinglish). A "skill" is a reusable way of putting an idea
on screen: a slide layout, a background, a motion or transition, a paper collage, a diagram, an infographic card.

Research online how these students actually learn and revise: the visual formats of the best Indian exam-prep material
(current-affairs one-liner cards, infographic posters, Lucent-style tables, mind maps, mnemonic cards, flowcharts, maps
with pins, timelines, comparison tables, PYQ cards) and the channels and apps they use. Note what makes a format easy to
read and remember on a phone. Cite the pages you used."""

PROPOSE = """You are the SKILL SCOUT. From the brief, the reference picture (if any) and the research, propose skills the
video crew could learn. Each must be concrete enough that a designer can build it and the Director knows when to use it.
Write in plain, simple English. The image_prompt must describe one finished 16:9 slide with its exact text, clean and
legible, no watermark. FACTS IN THE IMAGE PROMPT: never invent a number, rank, name or date. Use the facts shown in the
reference picture if one was shared; otherwise only facts stated in the research notes; if neither has enough, write
clear placeholders like "[State name]" and "[Score]". Propose {n}."""


def describe(image: bytes, mime: str) -> str:
    """What a reference picture shows, as a designer would describe it."""
    from google.genai import types
    import pipeline as base
    from app.config import settings
    c = base.client()
    r = c.models.generate_content(model=settings.gemini_model, contents=[types.Part.from_bytes(data=image, mime_type=mime),
        "Describe this slide as a designer would, so it can be rebuilt: the layout piece by piece (what sits where), the "
        "text hierarchy and sizes, colours, icons, pictures, and what makes it easy to learn from. Then say what kind of "
        "exam content this format suits. Plain text, no preamble."])
    return (r.text or "").strip()


def propose(brief: str, image: bytes | None = None, mime: str = "image/png", n: int = 1) -> tuple[list[dict], str]:
    """Returns (proposals, the description of the reference picture)."""
    seen = describe(image, mime) if image else ""
    ask = f"BRIEF FROM THE TEAM:\n{brief or '(none)'}" + (f"\n\nTHE REFERENCE PICTURE THEY SHARED:\n{seen}" if seen else "")
    research = get_llm().web_search(_Notes, RESEARCH, ask + "\n\nFind what is relevant to this brief.")
    user = f"{ask}\n\nRESEARCH NOTES:\n{json.dumps(research.model_dump(), ensure_ascii=False)[:12000]}"
    out = get_llm().structured(Proposals, PROPOSE.format(n=f"exactly {n} skill" if n == 1 else f"{n} different skills"), user, smart=True)
    return [p.model_dump() for p in out.skills[:n]], seen


class _Finding(BaseModel):
    point: str
    source_title: str = ""
    source_url: str = ""


class _Notes(BaseModel):
    findings: list[_Finding]


REPLY = """You are the SKILL SCOUT, brainstorming one skill with the team in the Skill Lab. Answer the latest message
helpfully and concretely, in plain words (the team may write in Hinglish; answer in the same language). If they ask for
changes, say exactly what you would change in the skill (look, motion, when to use, the image prompt). If a change is
worth making, also return the updated skill fields; leave a field empty to keep it. Never invent facts or numbers in an
image prompt: use the reference picture's facts or clear placeholders like "[Score]"."""


class Reply(BaseModel):
    reply: str
    summary: str = ""
    look: list[str] = Field(default_factory=list)
    motion: list[str] = Field(default_factory=list)
    when_to_use: list[str] = Field(default_factory=list)
    best_practices: list[str] = Field(default_factory=list)
    image_prompt: str = ""


def discuss(skill: dict, thread: list[dict]) -> dict:
    fields = {k: skill.get(k) for k in ("name", "kind", "summary", "students", "when_to_use", "avoid_when", "look", "motion",
                                        "best_practices", "image_prompt")}
    talk = "\n".join(f"{m['author']}: {m['text']}" for m in thread[-20:])
    return get_llm().structured(Reply, REPLY, f"THE SKILL:\n{json.dumps(fields, ensure_ascii=False)}\n\nTHE CONVERSATION:\n{talk}").model_dump()


def sample(prompt: str) -> bytes | None:
    """A sample slide for the skill from its image prompt (Gemini's image model). Text in it may be imperfect: it is a reference."""
    return get_llm().generate_image(prompt + "\n16:9 widescreen slide. Text must be spelled exactly as given, large and legible.")
