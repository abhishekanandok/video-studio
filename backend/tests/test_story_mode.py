"""Story films (video/oneshot.py STORY_*): a look film marked story is planned as an arc, storyboarded as sequences of
painted worlds and written with the cinema kit; an explainer keeps the magazine-page rules.

    cd backend && .venv/bin/python -m pytest tests/test_story_mode.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import looks  # noqa: E402
import oneshot  # noqa: E402

FILM = {"print": True, "dna": looks.preview_dna("madhubani")}


def test_a_story_film_is_written_with_worlds_and_a_camera():
    w = oneshot.print_write({**FILM, "story": True})
    assert "CINEMA KIT" in w and "<Camera keys" in w and "WORLDS" in w
    assert "DRAW WHAT THE LIBRARY LACKS" in w  # it still draws what the library lacks
    assert "TEXT BUDGET" not in w and "magazine page" not in w


def test_a_story_film_is_storyboarded_as_sequences():
    d = oneshot.design_extra({**FILM, "story": True})
    assert "SEQUENCES, NOT SLIDES" in d and "Madhubani" in d
    assert "VARIETY: no two scenes composed the same way" not in d


def test_an_explainer_keeps_its_page_rules():
    assert "CINEMA KIT" not in oneshot.print_write(FILM).split("MORE PIECES")[0]
    assert "SEQUENCES, NOT SLIDES" not in oneshot.design_extra(FILM)
