"""The look studio's pins (video/looks.py studio, clean_pin, apply_pin): only what the code can draw gets through, and a
pinned colour, ground, font, box or motion lands in the film's look exactly; what is not pinned stays the family's.

    cd backend && .venv/bin/python -m pytest tests/test_look_pins.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "video"))
import looks  # noqa: E402


def test_clean_pin_keeps_only_what_can_be_drawn():
    pin = looks.clean_pin("madhubani", {
        "paper": "#102030", "ink": "white", "inks": ["#ff0000", "#00ff00"], "display": "bebas", "body": "comic-sans",
        "box": "glass", "motion": "glitch", "evil": "<script>"})
    assert pin == {"paper": "#102030", "inks": ["#ff0000", "#00ff00"], "display": "bebas", "box": "glass", "motion": "glitch"}
    assert looks.clean_pin("madhubani", {"box": "bubble-wrap", "motion": "teleport"}) == {}
    assert looks.clean_pin("no-such-look", {"paper": "#ffffff"}) == {}
    assert looks.clean_pin("madhubani", "not a dict") == {}


def test_pins_land_exactly_and_the_rest_stays():
    base = looks.preview_dna("ukiyoe")
    d = looks.apply_pin(base, {"ink": "#111111", "inks": ["#ff0000", "#00ff00"], "display": "bebas", "box": "strip"})
    assert d["ink"] == "#111111" and d["display"] == "bebas" and d["box"] == "strip"
    assert d["inks"][:2] == ["#ff0000", "#00ff00"] and len(d["inks"]) == 4  # two pinned, the family fills the rest
    assert d["body"] == base["body"] and d["paper"] == base["paper"] and d["texture"] == base["texture"]
    assert looks.apply_pin(base, {}) == base


def test_a_dark_pinned_ground_makes_the_look_dark():
    d = looks.apply_pin(looks.preview_dna("notebook"), {"paper": "#0a0a12", "ink": "#f0f0f0"})
    assert d["dark"] is True and d["boardInk"] == "#f0f0f0"
    assert looks.apply_pin(looks.preview_dna("noir"), {"paper": "#fbfaf5"})["dark"] is False


def test_studio_offers_the_familys_own_choices_first():
    s = looks.studio("kolam")
    assert s["palettes"][0]["own"] and s["types"][0]["own"] and s["grounds"][0]["own"]
    assert all(p["ink"].startswith("#") for p in s["palettes"])
    fonts = looks.fonts()
    assert all(t["display"] in fonts and t["body"] in fonts for t in s["types"])  # every pairing offered is loadable
    own = looks.FAMILIES["kolam"]["boxes"]
    assert [b["id"] for b in s["boxes"]][:len(own)] == own and all(b["own"] for b in s["boxes"][:len(own)])
    assert {b["id"] for b in s["boxes"]} == set(looks.BOX) and {m["id"] for m in s["motions"]} == set(looks.MOTION)


def test_the_ten_new_families_exist_and_are_searchable():
    new = ["madhubani", "mughal", "truckart", "kolam", "ncert", "ukiyoe", "topographic", "satellite", "stainedglass", "papercut"]
    ids = {o["id"]: o for o in looks.options()}
    for k in new:
        assert k in ids and ids[k]["art"] and ids[k]["group"]
    assert sum(1 for o in ids.values() if o["group"] == "Indian & folk") == 5


def test_card_entrance_and_transitions_pins():
    k = looks.kit_parts()
    assert len(k["shapes"]) * len(k["frames"]) * len(k["fills"]) * len(k["heads"]) == 1536  # every card design is offered
    ok = looks.clean_pin("noir", {"card": "ticket.double.tint.band", "enter": "enter.slide.left.snappy", "transitions": ["page", "zoom", "page"]})
    assert ok == {"card": "ticket.double.tint.band", "enter": "enter.slide.left.snappy", "transitions": ["page", "zoom"]}
    assert looks.clean_pin("noir", {"enter": "enter.pop.back"}) == {"enter": "enter.pop.back"}  # a kind in place takes no direction
    bad = looks.clean_pin("noir", {"card": "ticket.double.tint", "enter": "exit.slide.left.snappy", "transitions": ["teleport"]})
    assert bad == {}
    d = looks.apply_pin(looks.preview_dna("noir"), ok)
    assert "WITHOUT a design prop" in looks.art_direction({**d, "photo": "mono", "chart": "flat", "label": "mono", "headline": "caps"})


def test_a_surface_the_kit_draws_can_be_pinned_and_lands_in_the_look():
    assert looks.clean_pin("madhubani", {"texture": "linen"}) == {"texture": "linen"}
    assert looks.clean_pin("madhubani", {"texture": "lava"}) == {}  # not drawn by the kit: dropped
    assert looks.apply_pin(looks.preview_dna("madhubani"), {"texture": "linen"})["texture"] == "linen"


def test_the_studio_offers_every_surface_and_more_grounds_the_looks_own_first():
    s = looks.studio("madhubani")
    assert [x["id"] for x in s["textures"] if x["own"]] == ["madhubani"] == [s["textures"][0]["id"]]
    assert len(s["textures"]) == len(looks.TEXTURES)
    assert sum(g["own"] for g in s["grounds"]) >= 4  # cow-dung plaster, lime wash … not two
    assert all(len(f["grounds"]) >= 4 for f in looks.FAMILIES.values())
