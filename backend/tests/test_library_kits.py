"""The motion grammar, the card designs and the creatures (video/src/argon/lib/motion-d.tsx, cards.tsx, creatures.tsx)
keep their size and fit every look: read from the TypeScript itself (bundled with esbuild, run with node), so the test
can never disagree with the code. Also checks the catalog lists them, so the writer is told they exist.

    cd backend && .venv/bin/python -m pytest tests/test_library_kits.py -q
"""

import json
import os
import subprocess

VIDEO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "video"))
LIB = os.path.join(VIDEO, "src", "argon", "lib")
LOOK_MOTIONS = ["snappy", "drift", "typewriter", "stamp", "slide", "draw", "pop", "wipe", "zoom", "flip", "parallax", "glitch", "brush"]
LOOK_BOXES = ["card", "rule", "outline", "sticky", "glass", "strip", "tab", "bracket", "solid"]

PROBE = f"""
import {{ MOTION_IDS, isMotion, motionFor, motionStyle }} from "{LIB}/motion-d";
import {{ CARD_IDS, cardFor }} from "{LIB}/cards";
import {{ CREATURE_KINDS, CREATURE_MOVES }} from "{LIB}/creatures";
const seeds = [0, 1, 2, 3, 4, 5];
console.log(JSON.stringify({{
  motions: MOTION_IDS.length, unique: new Set(MOTION_IDS).size, cards: CARD_IDS.length, unique_cards: new Set(CARD_IDS).size,
  kinds: CREATURE_KINDS, moves: CREATURE_MOVES.length,
  bad_fits: {json.dumps(LOOK_MOTIONS)}.flatMap((m) => seeds.flatMap((s) => [motionFor(m, "enter", s), motionFor(m, "exit", s)])).filter((id) => !isMotion(id)),
  bad_cards: {json.dumps(LOOK_BOXES)}.flatMap((b) => seeds.map((s) => cardFor(b, s))).filter((id) => !CARD_IDS.includes(id)),
  not_at_rest: MOTION_IDS.filter((id) => !id.startsWith("loop")).filter((id) => {{
    const s = motionStyle(id, 99, 0);
    return id.startsWith("exit") ? s.opacity !== 0 : Object.keys(s).length !== 0;
  }}),
}}));
"""


def probe(tmp_path) -> dict:
    src, out = tmp_path / "probe.ts", tmp_path / "probe.cjs"
    src.write_text(PROBE)
    subprocess.run([os.path.join(VIDEO, "node_modules", ".bin", "esbuild"), str(src), "--bundle", "--platform=node", "--jsx=automatic",
                    "--log-level=error", f"--outfile={out}"], check=True, cwd=VIDEO)
    return json.loads(subprocess.run(["node", str(out)], check=True, capture_output=True, text=True).stdout)


def test_the_kits_keep_their_size(tmp_path):
    got = probe(tmp_path)
    assert got["motions"] >= 1000 and got["unique"] == got["motions"]
    assert got["cards"] >= 1500 and got["unique_cards"] == got["cards"]
    assert len(got["kinds"]) >= 27 and got["moves"] >= 12
    assert {"bee", "fly", "mosquito", "ant", "spider", "robot", "bot", "drone"} <= set(got["kinds"])


def test_every_look_motion_and_box_has_a_fit(tmp_path):
    got = probe(tmp_path)
    assert got["bad_fits"] == [] and got["bad_cards"] == []


def test_every_motion_ends_at_rest(tmp_path):
    """an entrance ends showing the piece as it is, an emphasis comes back to it, an exit ends hidden"""
    assert probe(tmp_path)["not_at_rest"] == []


def test_the_catalog_tells_the_writer():
    s = open(os.path.join(LIB, "catalog.ts")).read()
    for name in ("Motion", "Card", "Creature", "Swarm", "Robot", "RobotArm"):
        assert f'"name": "{name}"' in s, f"{name} missing from catalog.ts: run python video/catalog.py"
