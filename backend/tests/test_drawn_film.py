"""The drawn film (video/oneshot.py draw_rounds): planned as a shot list that never repeats a picture, every scene drawn
alone with the pen, and film.tsx plays each scene's picked version; a scene that never compiled is left to its spread.

    cd backend && .venv/bin/python -m pytest tests/test_drawn_film.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import oneshot  # noqa: E402


def test_film_plays_each_scenes_picked_version_and_skips_a_broken_one():
    src = oneshot.drawn_film("/x", 3, {0: 1, 2: 2})
    assert 'from "./scene-01-v1"' in src and 'from "./scene-03-v2"' in src and "scene-02" not in src
    assert "1: () => <S1" in src and "3: () => <S3" in src and "2: () =>" not in src


def test_the_shot_plan_forbids_the_same_picture_again():
    assert "never feel like the same picture repeated" in oneshot.SHOT_PLAN and "at most 3 times" in oneshot.SHOT_PLAN


def test_a_scene_is_drawn_with_the_pen_and_places_the_cast():
    brief = oneshot.DRAW_SCENE.format(pen="../../../argon/pen", cast_names="Vrati, Soop", cast_api="- <Vrati ... />", art="A", world="W", setting="s",
                                      time="t", shot="close-up", subject="x", cast_here="Vrati:offer", action="a", composition="c", dur=4.0, text="line", words="", say="")
    assert "<Shape" in brief and 'from "../../../argon/pen"' in brief and "Never set stroke" in brief
    assert 'import { Vrati, Soop } from "./cast"' in brief and "never draw them again" in brief


def test_the_cast_index_plays_each_members_kept_version(tmp_path):
    oneshot.cast_index(str(tmp_path), {"Vrati": 2, "Soop": 1})
    src = (tmp_path / "cast.tsx").read_text()
    assert 'export { Vrati } from "./cast-Vrati-v2";' in src and 'export { Soop } from "./cast-Soop-v1";' in src


def test_a_patch_is_kept_only_when_the_judge_prefers_it_both_ways(monkeypatch, tmp_path):
    import json
    answers = iter([json.dumps({"a": 12, "b": 18, "why": "x"}), json.dumps({"a": 17, "b": 13, "why": "x"})])  # B wins, then wins again swapped
    monkeypatch.setattr(oneshot.argon, "think", lambda *a, **k: next(answers))
    img = tmp_path / "s.jpg"
    img.write_bytes(b"\xff\xd8\xff")
    assert oneshot.judge(str(tmp_path), "scene 1", "x", [str(img)], [str(img)], "t1")
    answers = iter([json.dumps({"a": 12, "b": 18, "why": "x"}), json.dumps({"a": 12, "b": 18, "why": "x"})])  # B wins, then A wins swapped: position bias
    assert not oneshot.judge(str(tmp_path), "scene 1", "x", [str(img)], [str(img)], "t2")
    assert len((tmp_path / "judge.jsonl").read_text().splitlines()) == 2  # every judgement saved


def test_a_drawn_scene_gets_its_library_imports_by_code():
    code = 'import React from "react";\nexport const Scene = ({ t }: { t: number }) => <div><At x={1} y={2}><Lib><Fire at={0} /></Lib></At></div>;\n'
    out = oneshot.scene_imports(code, ["scene-01-v1.tsx(2,60): error TS2304: Cannot find name 'Fire'."])
    assert 'import { Lib } from "../../../print/bridge";' in out and 'import { At } from "../../../argon/kit";' in out
    assert "import { Fire } from \"../../../argon/lib/" in out


def test_a_drawn_film_may_pick_from_the_whole_library(monkeypatch):
    seen = {}
    def think(ask, *a, **k):
        seen["ask"] = ask
        return '{"scenes": [{"line": 0, "motions": ["Fire", "NotAPiece"]}]}'
    monkeypatch.setattr(oneshot.argon, "think", think)
    p = {"lines": ["the chulha is lit"], "dna": {"family": "madhubani"}}
    picks = oneshot.pick_library(p, {"scenes": []}, {0: {"shot": "close-up", "setting": "kitchen", "subject": "a clay chulha", "action": "fire"}})
    assert picks == {0: ["Fire"]}  # a name the library does not have is dropped
    groups = {e["group"] for e in oneshot.argon.library()}
    assert all(f"[{g}]" in seen["ask"] for g in groups)  # every group offered, not only the look's own


def test_the_drawn_step_reads_each_sentence_from_the_plan():
    import inspect
    src = inspect.getsource(oneshot.draw_rounds)
    assert 'p["lines"][i]' in src and "v['text']" not in src and 'voice[i]["text"]' not in src


def test_one_file_check_ignores_a_broken_file_elsewhere_in_src():
    """file_errors checks one file and what it imports; a broken file elsewhere in src must not fail it (it failed all 36
    files of film 1028093342 while another film's file was half written)"""
    gen = os.path.join(oneshot.HERE, "src", "oneshot", "gen", "zz-check-test")
    os.makedirs(gen, exist_ok=True)
    good, broken = os.path.join(gen, "good.tsx"), os.path.join(oneshot.HERE, "src", "oneshot", "gen", "zz-broken.tsx")
    try:
        open(good, "w").write('import React from "react";\nexport const Scene: React.FC<{ t: number }> = ({ t }) => <svg><circle r={t} /></svg>;\n')
        open(broken, "w").write("export const x: number = 'not a number';\n")
        assert oneshot.file_errors(gen, good) == []
        open(good, "a").write("export const y: number = 'wrong';\n")
        assert oneshot.file_errors(gen, good)  # its own errors are still found
    finally:
        os.remove(broken)
        for f in os.listdir(gen):
            os.remove(os.path.join(gen, f))
        os.rmdir(gen)
