"""The library grows from the films (video/oneshot.py grow_library): a NEW PIECE a rendered film drew is kept as a block
when it compiles on its own; one that leans on its film, or whose name the library has, is not.

    cd backend && .venv/bin/python -m pytest tests/test_grow_library.py -q
"""

import os
import shutil
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import oneshot  # noqa: E402

FILM = '''import React from "react";
import { useScene, clamp01 } from "../../../argon/kit";

/** NEW PIECE: a bamboo soop of fruit and thekua, rising as it is offered (Chhath, Bihar, a river ghat) */
function TestSoop({ size = 420, at = 0 }: { size?: number; at?: number }) {
  const { t, theme } = useScene();
  const k = clamp01((t - at) / 0.8);
  return <svg width={size} height={size} viewBox="0 0 400 400"><ellipse cx={200} cy={260 - 40 * k} rx={160} ry={60} fill={theme.accent} /></svg>;
}

/** NEW PIECE: leans on its film (SCENE_DATA is the film's), so it cannot stand alone */
function TestLeaner({ size = 300 }: { size?: number }) {
  return <svg width={size} height={size}><text>{SCENE_DATA.title}</text></svg>;
}

/** NEW PIECE: a name the library already has */
function Kolam({ size = 300 }: { size?: number }) { return <svg width={size} height={size} />; }
'''


def test_a_rendered_films_new_pieces_grow_the_library(monkeypatch):
    real = oneshot.GROWN
    tmp = os.path.join(os.path.dirname(real), f"grown-test-{os.getpid()}.tsx")  # one per run: two runs at once never share it
    shutil.copy(real, tmp)
    monkeypatch.setattr(oneshot, "GROWN", tmp)
    try:
        assert oneshot.grow_library("chhath-test", FILM) == ["TestSoop"]
        code = open(tmp).read()
        assert "function TestSoopView({ size = 420, at = 0 }" in code
        assert 'export const TestSoop = block("TestSoop", TestSoopView);' in code
        assert "(drawn by the film chhath-test)" in code
        assert "TestLeaner" not in code and "KolamView" not in code
    finally:
        os.remove(tmp)
        oneshot.argon._HOMES.clear()


PAINTED = '''import React from "react";
import { useScene, clamp01 } from "../../../argon/kit";
import { useDNA } from "../../../print/kit";

// PALETTE
const C = {
  red: "#c8281e",
  gold: "#e8a21e",
};
const RIM = C.gold;

/** NEW PIECE: an earthen chulha painted in the film's own palette (C, and RIM made from it) */
function TestChulha({ size = 300, at = 0 }: { size?: number; at?: number }) {
  const { t } = useScene();
  return <svg width={size} height={size}><rect width={200} height={120 * clamp01((t - at) / 0.6)} fill={C.red} stroke={RIM} /></svg>;
}

/** NEW PIECE: a diya in the look's own inks (useDNA) */
function TestDiya({ size = 200 }: { size?: number }) {
  const dna = useDNA();
  return <svg width={size} height={size}><circle cx={100} cy={100} r={60} fill={dna.inks[0]} /></svg>;
}

const Scene1 = () => <TestChulha />;
'''


def test_a_piece_keeps_its_films_palette_and_the_looks_inks(monkeypatch):
    real = oneshot.GROWN
    tmp = os.path.join(os.path.dirname(real), f"grown-test-{os.getpid()}.tsx")
    shutil.copy(real, tmp)
    monkeypatch.setattr(oneshot, "GROWN", tmp)
    try:
        assert oneshot.grow_library("chhath-test", PAINTED) == ["TestChulha", "TestDiya"]
        code = open(tmp).read()
        body = code[code.index("function TestChulhaView"):]
        assert body.index("const C = {") < body.index("const RIM = C.gold;") < body.index("useScene()")  # its palette, in order, inside it
        assert "Scene1" not in code
    finally:
        os.remove(tmp)
        oneshot.argon._HOMES.clear()
