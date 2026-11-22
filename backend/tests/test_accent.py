"""The narration's accent is the voice's locale (video/argon.py accent_of), never an instruction in the spoken line.

    cd backend && .venv/bin/python -m pytest tests/test_accent.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import argon  # noqa: E402


def test_hinglish_and_hindi_are_voiced_the_indian_way_by_themselves():
    assert argon.accent_of({"language": "Hinglish"}) == "en-IN"
    assert argon.accent_of({"language": "Hindi"}) == "hi-IN"


def test_the_creators_pick_wins():
    assert argon.accent_of({"language": "English", "accent": "en-IN"}) == "en-IN"
    assert argon.accent_of({"language": "Hinglish", "accent": "en-GB"}) == "en-GB"


def test_english_with_no_pick_is_left_to_the_model():
    assert argon.accent_of({"language": "English"}) == ""
    assert argon.accent_of({}) == ""
