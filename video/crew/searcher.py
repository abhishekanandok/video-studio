"""Searcher: owns finding real material. Wikimedia Commons photos for the Director's picture requests (licence-checked:
public domain, CC0, CC BY, CC BY-SA only), and web research for new skill ideas where Skill 1 is weak. Never generates
anything and never chooses the final picture (the Verifier checks, the human picks)."""

import os
import urllib.parse

import httpx
from pydantic import BaseModel, Field

import archive
from app.llm import get_llm

from crew.state import p

PER_REQUEST = 6  # candidates fetched per picture request


def candidates(slug: str, searches: list[str], exclude: set[str]) -> list[dict]:
    """Free-licence photos for the searches: small previews only (the full size is fetched once the human picks one)."""
    found, seen = [], set(exclude)
    for q in searches[:3]:
        qs = urllib.parse.urlencode({"action": "query", "list": "search", "srsearch": q + " filetype:bitmap", "srnamespace": 6,
                                     "srlimit": 8, "format": "json"})
        try:
            titles = [x["title"] for x in httpx.get("https://commons.wikimedia.org/w/api.php?" + qs, headers=archive.UA,
                                                    timeout=30).json()["query"]["search"]]
        except Exception:
            continue
        for t in titles:
            if len(found) >= PER_REQUEST:
                return found
            if t in seen or not t.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            seen.add(t)
            try:
                small = archive.commons(t, slug, width=640, preview=True)  # refuses anything not free for commercial reuse
            except Exception:
                continue
            found.append({"title": t, "preview": os.path.relpath(small, p(slug)), "query": q})
    return found


class Searches(BaseModel):
    searches: list[str] = Field(description="3 new short Wikimedia Commons searches (2-5 words), different from the failed ones")


def other_searches(want: str, failed: list[str]) -> list[str]:
    return get_llm().structured(Searches, "You find photos on Wikimedia Commons. Suggest simpler, more common search words "
                                "for a real photo of the thing (an object or scene that is photographed often).",
                                f"THE PHOTO MUST SHOW: {want}\nSEARCHES THAT FOUND NOTHING USABLE: {', '.join(failed)}").searches


# ---------- research for a new skill ----------
class Source(BaseModel):
    title: str
    url: str


class SkillIdea(BaseModel):
    name: str = Field(description="A short name for the skill, e.g. 'Path diagram'")
    scenes: list[str] = Field(description="The scene keys it would help")
    shows: str = Field(description="What it shows on screen, in two plain sentences")
    how_good_teachers_do_it: str = Field(description="What the research found about how good explainers show this, 2-3 sentences")
    pieces: list[str] = Field(description="The drawing pieces it needs, e.g. 'two labelled points', 'a path that draws itself', 'a length label'")
    sources: list[Source] = Field(default_factory=list)


class SkillIdeas(BaseModel):
    ideas: list[SkillIdea]


def skill_research(subject: str, weak: list[dict]) -> list[dict]:
    """weak: [{key, focus, weak_why}]. Searches the web for how strong explainers show these ideas; at most 3 ideas."""
    if not weak:
        return []
    listing = "\n".join(f"- {w['key']}: {w['focus']} (needs: {w['weak_why']})" for w in weak[:12])
    system = ("You research teaching visuals. For the ideas below, search how the best science explainers and Indian exam "
              "teachers SHOW them visually (diagrams, animations, board work). Group them into at most 3 reusable visual skills "
              "a video tool could learn, each covering several scenes. Write in plain, simple English a student would understand: no "
              "jargon. Cite the pages you used.")
    try:
        return [i.model_dump() for i in get_llm().web_search(SkillIdeas, system, f"SUBJECT: {subject}\nIDEAS THAT TEXT SLIDES SHOW BADLY:\n{listing}").ideas[:3]]
    except Exception as e:
        print(f"  skill research failed: {str(e)[:100]}", flush=True)
        return []
