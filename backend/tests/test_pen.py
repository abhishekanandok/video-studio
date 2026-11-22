"""The pen (video/looks.py PEN, video/src/argon/pen.tsx): every look family inks shapes its own way, the pen travels in
the film's DNA, and every outline, fill and pattern a family can name is one the pen knows how to draw.

    cd backend && .venv/bin/python -m pytest tests/test_pen.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import looks  # noqa: E402

PEN_TSX = open(os.path.join(os.path.dirname(__file__), "..", "..", "video", "src", "argon", "pen.tsx")).read()


def test_every_family_has_a_valid_pen():
    assert set(looks.PEN) == set(looks.FAMILIES)
    for fam, p in looks.PEN.items():
        assert p["outline"] in looks.PEN_OUTLINES and p["fill"] in looks.PEN_FILLS and p["pattern"] in looks.PEN_PATTERNS, fam
        assert 0 <= p["wobble"] <= 1 and p["w"] >= 0, fam


def test_own_pens_are_real_families():
    assert set(looks.PEN_OWN) <= set(looks.FAMILIES)


def test_the_pen_travels_in_the_dna(monkeypatch, tmp_path):
    monkeypatch.setattr(looks, "HISTORY", str(tmp_path / "history.json"))  # pick records the film it picks for: never in the real history
    assert looks.preview_dna("madhubani")["pen"]["outline"] == "double"
    assert looks.pick("pen-test", "woodcut", "Test")["pen"]["outline"] == "carved"


def test_the_pen_draws_everything_a_family_can_name():
    for name in looks.PEN_OUTLINES + looks.PEN_FILLS + tuple(x for x in looks.PEN_PATTERNS if x):
        assert f'"{name}"' in PEN_TSX, name
