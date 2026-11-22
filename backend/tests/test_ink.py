"""The frame check's text rules (video/src/argon/ink.ts): it catches words printed over words, and it never cries wolf
on two stacked headline lines or on a strike-through. The boxes are the ones measured in the cable film.

    cd backend && .venv/bin/python -m pytest tests/test_ink.py -q
"""

import json
import os
import subprocess

INK = os.path.join(os.path.dirname(__file__), "..", "..", "video", "src", "argon", "ink.ts")


def run(expr: str):
    js = f'import * as k from {json.dumps(os.path.abspath(INK))}; console.log(JSON.stringify({expr}));'
    out = subprocess.run(["node", "--input-type=module", "-e", js], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def test_text_printed_over_a_label_is_caught():
    assert run("k.textsMeet({x: 586, y: 364, w: 542, h: 72}, {x: 884, y: 404, w: 83, h: 38})")


def test_two_stacked_headline_lines_are_not_an_overlap():
    assert not run("k.textsMeet({x: 480, y: 253, w: 786, h: 104}, {x: 480, y: 340, w: 204, h: 104})")


def test_a_strike_through_is_meant_but_an_icon_on_the_words_is_not():
    words = "{x: 0, y: 0, w: 300, h: 50}"
    assert run(f"k.strokeAcross({words}, {{x: 0, y: 0, w: 290, h: 14}})")      # the red line through THE CLOUD
    assert not run(f"k.strokeAcross({words}, {{x: 0, y: 0, w: 48, h: 48}})")   # an icon dropped on the headline
