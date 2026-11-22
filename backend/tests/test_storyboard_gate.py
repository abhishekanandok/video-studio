"""The storyboard gate (ADR 0013): the film is written only when every card is approved, and a note on one card
changes that card only. Runs on a scratch film folder; nothing is launched (no model call).

    cd backend && .venv/bin/python -m pytest tests/test_storyboard_gate.py -q
"""

import json
import os
import shutil

import pytest
from fastapi.testclient import TestClient

import app.api.films_api as fa
from app.main import app

SLUG = "zz-gate-test"


@pytest.fixture()
def film(monkeypatch):
    launched = []
    monkeypatch.setattr(fa, "_launch", lambda slug, stage, *x: launched.append((stage, x)))
    monkeypatch.setattr(fa, "_jobs", lambda slug: [])  # nothing runs: the stages are only recorded
    d = os.path.join(fa.FILMS, SLUG)
    os.makedirs(d, exist_ok=True)
    json.dump({"topic": "gate test"}, open(os.path.join(d, "job.json"), "w"))
    json.dump({"title": "Gate", "lines": ["a", "b", "c"]}, open(os.path.join(d, "plan.json"), "w"))
    cards = [{"id": f"L0{i + 1}", "i": i, "line": x, "seconds": 2, "design": {"scene": i + 1}, "status": "pending", "notes": []} for i, x in enumerate("abc")]
    json.dump({"slug": SLUG, "topic": "gate test", "title": "", "style": "", "ground": "grid", "written": {}, "cards": cards},
              open(os.path.join(d, "storyboard.json"), "w"))
    yield TestClient(app), launched
    shutil.rmtree(d)


def statuses(c: TestClient) -> dict:
    return {x["id"]: x["status"] for x in c.get(f"/api/films/{SLUG}").json()["storyboard"]["cards"]}


def test_write_is_refused_until_every_card_is_approved(film):
    c, launched = film
    r = c.post(f"/api/films/{SLUG}/write")
    assert r.status_code == 409 and "L01, L02, L03" in r.json()["detail"]
    c.post(f"/api/films/{SLUG}/cards/L01/approve")
    assert c.post(f"/api/films/{SLUG}/write").status_code == 409
    c.post(f"/api/films/{SLUG}/approve-all")
    assert c.post(f"/api/films/{SLUG}/write").status_code == 200
    assert launched[-1] == ("write", ())


def test_feedback_changes_one_card_only(film):
    c, launched = film
    c.post(f"/api/films/{SLUG}/cards/L01/approve")
    r = c.post(f"/api/films/{SLUG}/cards/L02/feedback", json={"note": "show a map, not a person"})
    assert r.status_code == 200
    assert statuses(c) == {"L01": "approved", "L02": "redrawing", "L03": "pending"}
    assert launched[-1] == ("redraw", ("--card", "L02", "--note", "show a map, not a person"))
    assert c.post(f"/api/films/{SLUG}/cards/L02/approve").status_code == 409  # not while it is being redrawn
    c.post(f"/api/films/{SLUG}/approve-all")  # approves the waiting card, never the one being redrawn
    assert statuses(c) == {"L01": "approved", "L02": "redrawing", "L03": "approved"}
    assert c.post(f"/api/films/{SLUG}/write").status_code == 409


def test_every_decision_is_logged(film):
    c, _ = film
    c.post(f"/api/films/{SLUG}/cards/L01/approve")
    c.post(f"/api/films/{SLUG}/cards/L02/feedback", json={"note": "more cows"})
    log = [json.loads(l) for l in open(os.path.join(fa.FILMS, SLUG, "feedback.jsonl"))]
    assert [(x["kind"], x["card"]) for x in log] == [("approve", "L01"), ("feedback", "L02")]
    assert log[1]["note"] == "more cows"


def test_claude_code_draws_a_look_film_and_nothing_is_launched(film):
    """drawer "claude": the film waits for Claude Code (state "claude"), no Gemini write is launched; a film without a
    look is refused; choosing Gemini after all launches the write and drops the handoff"""
    c, launched = film
    c.post(f"/api/films/{SLUG}/approve-all")
    assert c.post(f"/api/films/{SLUG}/write", json={"drawer": "claude"}).status_code == 409  # no look: Gemini only
    d = os.path.join(fa.FILMS, SLUG)
    json.dump({"title": "Gate", "lines": ["a", "b", "c"], "print": True}, open(os.path.join(d, "plan.json"), "w"))
    r = c.post(f"/api/films/{SLUG}/write", json={"drawer": "claude"})
    assert r.status_code == 200 and r.json()["ask"] == f"draw film {SLUG}"
    assert launched == [] and os.path.exists(os.path.join(d, "handoff.json"))
    s = c.get(f"/api/films/{SLUG}").json()
    assert s["state"] == "claude" and {x["id"]: x["state"] for x in s["steps"]}["write"] == "waiting"
    assert c.post(f"/api/films/{SLUG}/write", json={"drawer": "gemini"}).status_code == 200
    assert launched[-1] == ("write", ()) and not os.path.exists(os.path.join(d, "handoff.json"))
