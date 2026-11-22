"""Every look is fully built: each motion, set, texture, ornament pack, material, card shape, font and library look a
look family can pick is drawn by the code (video/looks.py check()), and the check really catches a value that is not.

    cd backend && .venv/bin/python -m pytest tests/test_looks_compatible.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import looks  # noqa: E402


def test_every_look_is_drawn_by_the_code():
    assert looks.check() == []


def test_check_catches_an_unbuilt_value(monkeypatch):
    fam = dict(looks.FAMILIES["paper"], motions=looks.FAMILIES["paper"]["motions"] + ["spin"], sets=["flat", "underwater"])
    monkeypatch.setitem(looks.FAMILIES, "paper", fam)
    monkeypatch.setitem(looks.MOTION, "spin", "spins in")
    bad = looks.check()
    assert "paper: motions 'spin' is not drawn by the code" in bad
    assert "paper: sets 'underwater' is not drawn by the code" in bad


def test_every_film_look_carries_every_axis():
    for fam in looks.FAMILIES:
        d = looks.preview_dna(fam)
        assert all(d.get(k) for k in ("set", "material", "depth", "shape", "box", "lib", "motion")), fam
