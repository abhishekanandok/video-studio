"""The kit check is polish on a film that already compiles (video/oneshot.py kit_rounds): a patch that breaks the compile
is undone at once with no repair rounds, and the rounds stop when one does not cut the problems.

    cd backend && .venv/bin/python -m pytest tests/test_kit_rounds.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import oneshot  # noqa: E402

GOOD = "const Scene1 = () => <Panel />;\nexport const MOTION = { 1: Scene1 };\n"
D = {"scenes": [{"scene_kind": "motion"}]}


def setup(monkeypatch, tmp_path, patched: str, broken: bool, probs):
    film = tmp_path / "film.tsx"
    film.write_text(GOOD)
    calls = {"fix": 0, "repair": 0}

    def fix(film_, src, ask, nos, out, tag, tries=3):
        calls["fix"] += 1
        open(film_, "w").write(patched)
        return patched, 1, 0
    monkeypatch.setattr(oneshot, "fix", fix)
    monkeypatch.setattr(oneshot, "compile_errors", lambda gen: ["film.tsx(1,1): error TS1005"] if broken and open(film).read() == patched else [])
    monkeypatch.setattr(oneshot, "compile_rounds", lambda *a, **k: calls.__setitem__("repair", calls["repair"] + 1) or a[2])
    monkeypatch.setattr(oneshot, "kit_problems", lambda *a, **k: [])
    monkeypatch.setattr(oneshot, "guessed_boxes", lambda src: [])
    monkeypatch.setattr(oneshot, "cast_problems", lambda src: [])
    monkeypatch.setattr(oneshot, "style_problems", probs)
    return film, calls


def test_a_polish_patch_that_breaks_the_compile_is_undone_with_no_repair(monkeypatch, tmp_path):
    film, calls = setup(monkeypatch, tmp_path, "const Scene1 = () => <Panel", True, lambda src, story=False: ["line 1: a colour written in as a fixed value: x"])
    src = oneshot.kit_rounds(str(tmp_path), str(film), GOOD, str(tmp_path), {}, D, False)
    assert src == GOOD and film.read_text() == GOOD
    assert calls == {"fix": 1, "repair": 0}


def test_rounds_stop_when_they_do_not_cut_the_problems(monkeypatch, tmp_path):
    film, calls = setup(monkeypatch, tmp_path, GOOD.replace("Panel", "Board"), False, lambda src, story=False: ["line 1: a: x", "line 2: b: y"])
    oneshot.kit_rounds(str(tmp_path), str(film), GOOD, str(tmp_path), {}, D, False)
    assert calls["fix"] == 1  # the second look found as many problems: no second round


STORY = ('import { Ink } from "../../../print/kit";\nconst Scene1 = () => {\n  const t = useCurrentFrame() / 30;\n'
         '  return <Fire style={{ opacity: Math.min(1, t), color: "#ff8a2a" }} />;\n};\nexport const MOTION = { 1: Scene1 };\n')


def test_a_story_film_keeps_its_own_fades_and_world_colours():
    assert oneshot.style_problems(STORY)  # an explainer would be told to use <Enter> and the look's inks
    assert oneshot.style_problems(STORY, story=True) == []


def test_a_story_film_is_never_sent_patches_for_explainer_style(monkeypatch, tmp_path):
    film, calls = setup(monkeypatch, tmp_path, STORY, False, oneshot.style_problems)
    oneshot.kit_rounds(str(tmp_path), str(film), STORY, str(tmp_path), {}, D, False, story=True)
    assert calls["fix"] == 0
