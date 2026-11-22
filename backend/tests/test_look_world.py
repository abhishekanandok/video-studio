"""A look shows its own people and places (video/looks.py world): every look draws people in its own art, dressed true
to the topic's place; a culture's look brings its home world, to the planner, the storyboard and the writer.

    cd backend && .venv/bin/python -m pytest tests/test_look_world.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import looks  # noqa: E402
import oneshot  # noqa: E402


def test_madhubani_brings_mithila_dress():
    w = looks.world("madhubani")
    assert "Mithila" in w and "dhoti" in w and "saree" in w and "NEW PIECE" in w


def test_truck_art_is_punjabi():
    text = looks.world("truckart") + looks.FAMILIES["truckart"]["art"] + looks.FAMILIES["truckart"]["blurb"]
    assert "Punjab" in text and "Pakistan" not in text


def test_a_look_with_no_home_world_still_draws_people_in_its_art():
    w = looks.world("clay")
    assert "Clay 3D" in w and "true to the topic's own place" in w and "HOME WORLD" not in w


def test_the_writer_and_the_storyboard_get_the_world():
    dna = looks.preview_dna("madhubani")
    assert "Mithila" in looks.art_direction(dna)
    assert "Mithila" in oneshot.design_extra({"print": True, "clear": True, "dna": dna})


def test_the_planner_gets_the_world_before_it_plans(monkeypatch, tmp_path):
    seen = {}
    class Stop(Exception): pass
    def plan(f, brief, *a, **k):
        seen["brief"] = brief
        raise Stop
    out = tmp_path / "out"; out.mkdir()
    (out / "job.json").write_text('{"topic": "Chhath Puja", "look": "madhubani", "mix": true}')
    monkeypatch.setattr(oneshot, "begin", lambda slug: (str(out), str(tmp_path), None))
    monkeypatch.setattr(oneshot.argon, "plan", plan)
    monkeypatch.setattr(oneshot, "say", lambda *a, **k: None)
    try:
        oneshot.stage_plan("x")
    except Stop:
        pass
    assert "THE FILM'S LOOK: Madhubani" in seen["brief"] and "gamchha" in seen["brief"]
