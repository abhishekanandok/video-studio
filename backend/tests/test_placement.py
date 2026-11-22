"""The placement check (video/oneshot.py placement_problems): a drawn explainer scene places its main pieces in
<Layout>/<Region>, never by frame pixels; and it never cries wolf: not on a story film's painted world, not on a
map, kinetic, flow or card scene, not on a `>` inside a prop.

    cd backend && .venv/bin/python -m pytest tests/test_placement.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import looks  # noqa: E402
import oneshot  # noqa: E402

TAIL = "\nexport const MOTION: Record<number, React.FC> = { 1: Scene1 };"
MOTION = {"scenes": [{"scene_kind": "motion"}]}


def scene(body: str) -> str:
    return "const Scene1: React.FC = () => {\n  const t = useCurrentFrame() / 30;\n  return " + body + ";\n};" + TAIL


def test_a_drawn_scene_with_no_layout_is_caught():
    probs = oneshot.placement_problems(scene('<><Panel x={200} y={100} w={600} h={400} t={t} at={0.2} /></>'), MOTION)
    assert len(probs) == 1 and "no <Layout>" in probs[0]


def test_a_piece_placed_by_frame_pixels_outside_its_region_is_caught():
    src = scene('<Layout kind="split"><Region name="left" design={[800, 600]}><Num x={100} y={80} t={t} at={0.3} to={42} /></Region>'
                '<Panel x={1200} y={100} w={500} h={300} t={t} at={0.5} /></Layout>')
    probs = oneshot.placement_problems(src, MOTION)
    assert len(probs) == 1 and "<Panel>" in probs[0]


def test_pieces_inside_their_regions_pass_even_with_a_greater_than_in_a_prop():
    src = scene('<Layout kind="title-main"><Region name="title"><Type size={64} style={{ opacity: t > 1 ? 1 : 0 }}>Chhath</Type></Region>'
                '<Region name="main" design={[900, 600]}><At x={120} y={40} id="soop"><Lib><Kolam size={300} at={t > 2 ? 1 : 0} /></Lib></At></Region></Layout>')
    assert oneshot.placement_problems(src, MOTION) == []


def test_a_greater_than_in_a_prop_does_not_hide_an_x_after_it():
    src = scene('<Layout kind="full"><Region name="main"><Type size={40}>ok</Type></Region></Layout>'
                '<Num style={{ opacity: t > 1 ? 1 : 0 }} x={300} y={200} t={t} to={5} />')
    assert len(oneshot.placement_problems(src, MOTION)) == 1


def test_map_kinetic_flow_and_card_scenes_are_not_checked():
    for kind in ("map", "kinetic", "flow", "card"):
        assert oneshot.placement_problems(scene('<MapStage t={t} />'), {"scenes": [{"scene_kind": kind}]}) == []


def test_a_story_film_is_never_held_to_regions():
    src = scene('<Camera keys={[[0, 960, 540, 1], [4, 1200, 600, 1.4]]}><GhatWorld light="dusk" />'
                '<Lib><At x={820} y={600}><Person avatar="village_woman" pose="pray" size={420} at={1} /></At></Lib></Camera>')
    assert oneshot.kit_problems(src, MOTION, False) == []  # a story writer is never given the LAYOUT rules
    assert any("no <Layout>" in p for p in oneshot.kit_problems(src, MOTION, False, regions=True))  # an explainer would be told


def test_a_film_written_before_the_layout_rules_is_not_held_to_them():
    """the cable film and the Chhath explainer were written before <Layout> existed: resumed, they must render as written"""
    old = scene('<><Panel x={200} y={100} w={600} h={400} t={t} at={0.2} /></>')
    assert oneshot.kit_problems(old, MOTION, False, regions=False) == []


def test_a_story_writer_gets_no_region_rules():
    w = oneshot.print_write({"print": True, "story": True, "dna": looks.preview_dna("madhubani")})
    assert "<Region" not in w and "placed in the world with <At>" in w
