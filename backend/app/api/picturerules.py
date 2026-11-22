"""The picture rules the agent learned from the creator's corrections, by type of picture (video/picrules.py)."""

import os
import sys

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.studio import ASSETS, VIDEO

router = APIRouter()
sys.path.insert(0, VIDEO) if VIDEO not in sys.path else None
import picrules  # noqa: E402


def _out(t: str, v: dict) -> dict:
    return {"type": t, "rules": v.get("rules") or [], "history": list(reversed(v.get("history") or []))[:20],
            "refs": [{**r, "url": f"{ASSETS}/picture-rules/{r['file']}"} for r in v.get("refs") or []],
            "examples": [{**e, "url": f"{ASSETS}/{e['src']}"} for e in reversed(v.get("examples") or [])]}


@router.get("/picture-rules")
def rules():
    d = picrules.load()["types"]
    return {"types": picrules.TYPES, "rules": [_out(t, d[t]) for t in picrules.TYPES if t in d]}


class RulesIn(BaseModel):
    rules: list[str]


@router.put("/picture-rules/{kind}")
def set_rules(kind: str, body: RulesIn):
    if kind not in picrules.TYPES:
        raise HTTPException(404, "no such picture type")
    return _out(kind, picrules.set_rules(kind, body.rules))
