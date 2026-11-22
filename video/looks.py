"""Look families: what the creator picks on the Plan page (Printed paper, Newspaper, Blueprint, Keynote, Sumi ink and the
rest of FAMILIES). A family is an art direction for Gemini, its reference images (public/print/refs/<family>/) and
pools of values on every axis of the look: ground, ink set, type pair, texture, ornaments, motion, photo treatment,
chart skin, label style.

A creator's BRAND in a family is one pick on every axis, kept from film to film (public/oneshot/brands.json); each film
then varies the small axes (ornaments, motion, photos, charts, labels, headlines, text boxes, lead colour) so no two films are identical, and differs from
the creator's recent films in at least two of them. Every film's look is recorded (public/oneshot/looks.json)."""
import hashlib
import json
import os
import random
import re

HERE = os.path.dirname(os.path.abspath(__file__))
BRANDS = os.path.join(HERE, "public", "oneshot", "brands.json")
HISTORY = os.path.join(HERE, "public", "oneshot", "looks.json")

MOTION = {
    "snappy": "pieces print in fast on their words and settle with a tiny overshoot",
    "drift": "pieces fade and slide in slowly; the whole page floats gently",
    "typewriter": "words type in letter by letter; lines draw at an even pace",
    "stamp": "pieces press onto the page like a stamp: a quick scale-down and a thud",
    "slide": "pieces slide in from the edge like paper pushed across a desk",
    "draw": "lines, outlines and charts draw themselves stroke by stroke before they fill",
    "pop": "pieces pop in with a bouncy scale from nothing, one after another like bubbles",
    "wipe": "pieces are revealed by a straight wipe, as if a mask slides off them",
    "zoom": "the camera pushes slowly into the page; pieces arrive as it travels",
    "flip": "cards and panels flip over like tiles to show their face",
    "parallax": "pieces sit on layers that drift at different speeds, giving the flat page depth",
    "glitch": "pieces arrive with a short digital glitch: a jitter, a colour split, then they lock",
    "brush": "shapes and words are painted on by a brush stroke that sweeps across them",
}
PHOTO = {
    "duotone": "real photos printed as a duotone plate in the loud ink with a fine halftone",
    "halftone": "real photos as coarse black halftone, like a newspaper",
    "cutout": "real photos as paper cut-outs: a paper border, a slight tilt, a soft shadow",
    "mono": "real photos in one tinted monochrome",
    "frame": "real photos in a thin frame, taped or pinned to the page",
    "full": "real photos large, almost full frame, with a slow push in and a caption bar",
    "torn": "real photos with torn paper edges, taped down, slightly overlapping",
    "polaroid": "real photos as polaroids: a thick white border with a hand-written caption, pinned or taped at an angle",
    "engraving": "real photos printed as old sepia plates with a fine line screen and a numbered figure caption",
    "bleed": "a real photo bleeds off the edge of the page; type sits over its calm part",
    "glass": "real photos inside rounded frosted-glass cards with a soft glow behind them",
}
CHART = {
    "flat": "charts in flat mottled ink: solid slices and bars, hairline rules, values printed on them",
    "glass": "charts as glowing translucent 3D glass bars on a dark panel, values above them",
    "hand": "charts drawn by hand: wobbly outlines, hatched fills, hand-lettered values",
    "outline": "charts as precise outlines and thin strokes, no fills, small labels",
    "stacked": "charts built from stacked paper strips and blocks, each a cut-paper piece",
    "iso": "charts as isometric blocks and towers, rising in 3D",
    "pixel": "charts drawn in pixels and ASCII: block characters, bracket bars, monospace numbers",
    "pop": "charts with thick black outlines, flat bold fills and halftone shading",
    "candles": "charts as a trading screen: candlesticks, a ticking line, red and green deltas, a price tag on the last value",
    "brush": "charts painted with a brush: bars as strokes, pies as ink washes, values written beside them",
    "dots": "charts as dot plots and unit grids: one dot per unit, counted out and coloured",
}
HEADLINE = {
    "caps": "headlines in tight all-caps display type, two short stacked lines",
    "sentence": "headlines as one big sentence-case line, calm and editorial",
    "accent": "headlines in the key ink with ONE word printed loud in the first colour ink",
    "outline": "the key word of a headline in hollow outline type, the rest solid",
    "underline": "headlines with a thick ink underline or highlighter bar behind the key word",
    "stepped": "headline words stacked one per line, each a step smaller than the one above",
    "huge": "one or two headline words set enormous, edge to edge, everything else small",
}
SET = {  # what the page sits in (drawn by the player behind every scene, src/print/kit.tsx <Set>)
    "flat": "a plain page: the ground and its texture only",
    "sunlit": "a sunlit wall: soft window light falls across in diagonal bands, a leafy plant's shadow in a corner",
    "studio": "a calm studio: stone plinths, a marble sphere and a stone block stand in the corners, lit softly",
    "wave": "the page is split by one sweeping organic curve: a dark panel flows in on one side with a fine gold edge",
    "blobs": "soft organic discs of colour bleed off the corners, like a calm modern print",
    "desk": "the page lies on a desk, seen from above: a darker surface around it and the page's soft shadow",
    "arch": "an arched window in the wall opens onto a soft sky and far mountains",
}
MATERIAL = {  # what 3D charts and panels are made of (src/print/depth.tsx)
    "ink": "printed in flat mottled ink",
    "stone": "carved from veined marble and stone, lit from the top left",
    "glass": "frosted translucent glass with bright edges and a soft glow",
    "clay": "soft matte clay with a gentle highlight",
    "paper": "stacked paper card with crisp edges and lifted shadows",
    "metal": "brushed metal with a sheen",
}
DEPTH = {
    "flat": "charts lie flat on the page, printed in ink: a flat pie with its ruled legend, ink heat tiles, no 3D",
    "raised": "charts are thick 3D objects tilted toward the viewer: a pie with depth, bars as blocks",
    "iso": "charts are built isometrically: cube grids, towers, blocks seen from 30 degrees",
}
SHAPE = {  # the shape of cards and panels (src/print/depth.tsx <Panel>)
    "sharp": "square-cornered", "rounded": "softly rounded", "pill": "fully rounded, pill-ended", "notched": "with cut-off notched corners",
    "tilted": "set at a slight tilt", "ticket": "ticket-shaped with punched side notches", "torn": "with torn paper edges",
}
SCALE = {
    "hero": "one big hero piece fills most of the frame, everything else tiny",
    "pair": "two pieces side by side, balanced, like a magazine spread",
    "cards": "several small cards in a loose row or grid, each holding one thing",
}
BOX = {
    "card": "text sits on cut-paper cards with a soft lifted shadow",
    "rule": "no boxes: things sit straight on the page, divided by thin ink hairlines (a vertical rule between two halves)",
    "outline": "text sits in thin outlined boxes with square corners",
    "sticky": "short notes sit on sticky notes, slightly turned",
    "glass": "text sits on frosted translucent glass panels with a hairline edge",
    "strip": "text is printed on torn paper strips, taped down",
    "tab": "text sits in a box with a small coloured tab on top that names it",
    "bracket": "text is framed by corner brackets only, no full box",
    "solid": "text is knocked out of solid blocks of the first colour ink",
}
LABEL = {
    "mono": "labels as tiny letter-spaced mono caps, stacked one or two per line",
    "italic": "labels as serif italics, like a magazine caption",
    "tag": "labels as small tags with a thin leader line to what they name",
    "footnote": "labels as numbered footnotes: a small number by the thing, its note in a column",
    "hand": "labels hand-written next to the thing, with a small hand-drawn arrow",
    "bubble": "labels in speech bubbles and caption boxes with thick outlines",
    "lower": "labels as lower-third caption bars: a coloured bar with a short line of type",
    "stamp": "labels as rubber stamps and typed index cards",
}

FAMILIES: dict[str, dict] = {
    "paper": {
        "name": "Printed paper", "blurb": "Editorial print: riso inks on toned paper, dark boards, glass bars, cut-paper photos.",
        "dark": False, "board": "#1b1a18",
        "art": "a printed data magazine: ink on toned paper, editorial serif headlines, tiny letter-spaced mono caps labels, thin ink rules, riso-printed charts (pies with ruled legends, heat grids, bars), dark printed boards with glowing glass 3D bars, cut-paper shapes lifted off the page, small printed ornaments",
        "grounds": [("greige", "#d8cebe", 0.6), ("newsprint", "#dcd6c8", 0.5), ("kraft", "#d2b98f", 0.8), ("sage", "#cbd0bd", 0.5), ("bone", "#e4dccb", 0.4), ("stone", "#c9c4ba", 0.5), ("blush", "#e2cfc4", 0.45), ("mist", "#c9d0d3", 0.45)],
        "inks": [("riso classic", "#24211e", ["#c8482d", "#35586f", "#879779", "#c7b9a2"]), ("black + red", "#1c1a18", ["#c4462b", "#3a3733", "#8a8378", "#bdb4a6"]),
                 ("cobalt + vermilion", "#1d1b19", ["#2b4ea2", "#e2452b", "#d9a521", "#c2b49a"]), ("plum + peach", "#262421", ["#6b3d5c", "#e59a74", "#7c7a3a", "#cdbfae"]),
                 ("teal + mustard", "#1f2422", ["#1f6f6b", "#e0a530", "#b8573f", "#c4bba8"]), ("forest + coral", "#1e211d", ["#2f5d3a", "#e2705a", "#8e8a5c", "#c9bea9"]),
                 ("navy + orange", "#1a1d24", ["#24365c", "#e07a2f", "#7f8fa3", "#c6bba7"])],
        "types": [("dmserif", "caslon", "spacemono"), ("gloock", "sourceserif", "plexmono"), ("bodoni", "garamond", "spacemono"), ("anton", "plexserif", "spacemono"),
                  ("fraunces", "newsreader", "plexmono"), ("abril", "garamond", "chivomono"), ("instrument", "sourceserif", "chivomono"), ("oswald", "plexserif", "plexmono"), ("bebas", "caslon", "spacemono")],
        "textures": ["riso", "letterpress", "offset"], "ornaments": ["vox", "zine", "technical"],
        "motions": ["snappy", "drift", "stamp", "slide", "draw"], "photos": ["duotone", "cutout", "halftone"], "charts": ["flat", "glass", "stacked"], "labels": ["mono", "italic", "tag"],
    },
    "newspaper": {
        "name": "Newspaper", "blurb": "Front-page newsprint: black ink, one spot colour, halftone photos, column rules.",
        "dark": False, "board": "#1c1b19",
        "art": "a broadsheet newspaper page: black ink on newsprint, big serif headlines, column rules and double rules, datelines, coarse halftone photos, charts printed in black with one spot colour, pull quotes",
        "grounds": [("newsprint", "#e9e4d8", 0.5), ("aged", "#ddd3bf", 0.6), ("salmon", "#f2dfd3", 0.4), ("grey", "#e6e4df", 0.4)],
        "inks": [("black + red", "#161514", ["#b8322a", "#161514", "#6f6b66", "#bfb8ab"]), ("black + blue", "#161514", ["#1f4e8c", "#161514", "#6f6b66", "#bfb8ab"]),
                 ("black + ochre", "#161514", ["#b8862a", "#161514", "#6f6b66", "#bfb8ab"]), ("black only", "#161514", ["#161514", "#55514c", "#8e8a83", "#c4beb2"])],
        "types": [("playfair", "lora", "plexmono"), ("oldstandard", "merriweather", "plexmono"), ("bodoni", "garamond", "plexmono"), ("zillaslab", "lora", "jetbrains"), ("robotocond", "merriweather", "plexmono")],
        "textures": ["halftone", "photocopy", "letterpress"], "ornaments": ["newsprint"],
        "motions": ["typewriter", "stamp", "slide", "drift"], "photos": ["halftone", "mono"], "charts": ["flat", "outline"], "labels": ["footnote", "italic", "tag"],
    },
    "swiss": {
        "name": "Swiss poster", "blurb": "International style: heavy grotesk, strict grid, red and black, big numerals.",
        "dark": False, "board": "#141414",
        "art": "a Swiss International Style poster: a strict grid, heavy grotesk type set flush left, huge numerals, solid red and black shapes, circles and bars, generous structure, photos in black and white",
        "grounds": [("white", "#f3f1ec", 0.2), ("cream", "#ece6d8", 0.3), ("grey", "#e2e1dd", 0.25), ("yellow", "#f0d54a", 0.2)],
        "inks": [("black + red", "#111111", ["#d7312a", "#111111", "#8c8c8c", "#cfcac0"]), ("black + blue", "#111111", ["#1f4fd1", "#111111", "#8c8c8c", "#cfcac0"]),
                 ("black + orange", "#111111", ["#ef6a1f", "#111111", "#8c8c8c", "#cfcac0"]), ("black + green", "#111111", ["#1d8a52", "#111111", "#8c8c8c", "#cfcac0"])],
        "types": [("archivoblack", "worksans", "jetbrains"), ("intertight", "intertight", "jetbrains"), ("schibsted", "schibsted", "plexmono"), ("oswald", "worksans", "plexmono"), ("barlowcond", "plexsans", "jetbrains")],
        "textures": ["offset", "halftone"], "ornaments": ["swiss"],
        "motions": ["snappy", "slide", "stamp", "draw"], "photos": ["mono", "halftone", "frame"], "charts": ["flat", "outline"], "labels": ["mono", "footnote"],
    },
    "blueprint": {
        "name": "Blueprint", "blurb": "Technical drawing: white lines on blueprint blue, dimension lines, title blocks.",
        "dark": True, "board": "#0b2547",
        "art": "an engineering blueprint: thin white and cyan line drawings on blueprint blue, a measuring grid, dimension lines with arrows, callouts with leader lines, exploded views and cutaways, title blocks, everything precise and drawn in outline",
        "grounds": [("blueprint", "#173a6b", 0.4), ("deep", "#0f2f57", 0.4), ("steel", "#1d4466", 0.4), ("navy", "#122b4f", 0.4), ("teal print", "#12454f", 0.4)],
        "inks": [("white + cyan", "#eaf2ff", ["#7fd6ff", "#ffd166", "#eaf2ff", "#5b7fa8"]), ("white + yellow", "#eaf2ff", ["#ffd166", "#7fd6ff", "#eaf2ff", "#5b7fa8"]),
                 ("white + coral", "#eaf2ff", ["#ff8a73", "#7fd6ff", "#eaf2ff", "#5b7fa8"]), ("white + green", "#eaf2ff", ["#8ef0b0", "#ffd166", "#eaf2ff", "#5b7fa8"])],
        "types": [("jetbrains", "plexsans", "jetbrains"), ("spacemono", "spacegrotesk", "spacemono"), ("robotocond", "robotoslab", "plexmono"), ("rajdhani", "plexsans", "jetbrains")],
        "textures": ["grid"], "ornaments": ["technical"],
        "motions": ["draw", "typewriter", "snappy", "slide"], "photos": ["mono", "frame"], "charts": ["outline", "flat"], "labels": ["tag", "mono", "footnote"],
    },
    "chalkboard": {
        "name": "Chalkboard", "blurb": "A teacher's board: chalk drawings and hand lettering on slate green.",
        "dark": True, "board": "#1f2a24",
        "art": "a classroom chalkboard: hand-drawn chalk diagrams and arrows, hand-lettered words, coloured chalk for emphasis, slightly rough strokes, smudges, underlines and circled numbers, like a great teacher explaining",
        "grounds": [("slate green", "#2b3a32", 0.5), ("slate", "#263238", 0.5), ("black board", "#2a2827", 0.5), ("brown board", "#3a2f28", 0.5), ("deep green", "#1f3328", 0.5)],
        "inks": [("chalk + yellow", "#eeeae0", ["#f2d675", "#f2a7b6", "#9fd3e8", "#8a948c"]), ("chalk + pink", "#eeeae0", ["#f2a7b6", "#9fd3e8", "#f2d675", "#8a948c"]),
                 ("chalk + blue", "#eeeae0", ["#9fd3e8", "#f2d675", "#f2a7b6", "#8a948c"]), ("chalk + green", "#eeeae0", ["#a8e6a1", "#f2d675", "#9fd3e8", "#8a948c"])],
        "types": [("kalam", "patrickhand", "patrickhand"), ("caveat", "kalam", "patrickhand"), ("architects", "patrickhand", "architects"), ("marker", "kalam", "patrickhand")],
        "textures": ["chalk"], "ornaments": ["chalk"],
        "motions": ["draw", "typewriter", "drift"], "photos": ["frame", "mono"], "charts": ["hand", "outline"], "labels": ["hand", "tag"],
    },
    "darktech": {
        "name": "Dark tech", "blurb": "Neon on black: glowing charts, grids and data, made for AI and GPU stories.",
        "dark": True, "board": "#161b22",
        "art": "a dark tech data visual: near-black ground, glowing neon lines and charts, 3D glass bars, thin grids, corner brackets, mono coordinates and labels, sharp grotesk headlines, light that pulses on the key thing",
        "grounds": [("black", "#0b0d10", 0.2), ("ink", "#0e1116", 0.2), ("navy", "#0f1420", 0.2), ("charcoal", "#141414", 0.2), ("deep green", "#08130f", 0.2), ("plum black", "#140d18", 0.2)],
        "inks": [("cyan + magenta", "#e8edf2", ["#34e1ff", "#ff4fd8", "#b6ff3b", "#4a5566"]), ("lime + orange", "#e8edf2", ["#b6ff3b", "#ff8a3d", "#34e1ff", "#4a5566"]),
                 ("violet + cyan", "#e8edf2", ["#9b7bff", "#34e1ff", "#ff4fd8", "#4a5566"]), ("orange + cyan", "#e8edf2", ["#ff8a3d", "#34e1ff", "#b6ff3b", "#4a5566"]),
                 ("red + cyan", "#e8edf2", ["#ff4a4a", "#34e1ff", "#ffd166", "#4a5566"]), ("gold + teal", "#e8edf2", ["#ffc857", "#2ec4b6", "#ff4fd8", "#4a5566"])],
        "types": [("spacegrotesk", "inter", "jetbrains"), ("orbitron", "rajdhani", "jetbrains"), ("intertight", "intertight", "jetbrains"), ("teko", "plexsans", "jetbrains"),
                  ("archivoblack", "inter", "jetbrains"), ("barlowcond", "plexsans", "jetbrains")],
        "textures": ["glow", "grid"], "ornaments": ["neon", "technical"],
        "motions": ["snappy", "draw", "typewriter", "drift"], "photos": ["mono", "frame", "duotone"], "charts": ["glass", "outline", "flat"], "labels": ["mono", "tag", "footnote"],
    },
    "whiteboard": {
        "name": "Whiteboard", "blurb": "Marker on a whiteboard: drawn as it is explained, arrows, circles, sticky notes.",
        "dark": False, "board": "#1d1d1f",
        "art": "a whiteboard explainer: marker drawings drawn stroke by stroke as they are explained, hand-lettered words, arrows and circles, sticky notes, a few colours of marker, simple icons, clean white space",
        "grounds": [("board", "#f7f7f4", 0.15), ("warm board", "#fbfaf6", 0.15), ("cool board", "#f2f4f3", 0.15), ("glass board", "#eef3f2", 0.15)],
        "inks": [("black + blue", "#1d1d1f", ["#1f5fbf", "#d23a2f", "#2e8b57", "#9a9a9a"]), ("black + red", "#1d1d1f", ["#d23a2f", "#1f5fbf", "#2e8b57", "#9a9a9a"]),
                 ("black + green", "#1d1d1f", ["#2e8b57", "#1f5fbf", "#d23a2f", "#9a9a9a"]), ("blue + orange", "#1d2a44", ["#ef7a1a", "#1f5fbf", "#2e8b57", "#9a9a9a"])],
        "types": [("marker", "patrickhand", "patrickhand"), ("caveat", "kalam", "patrickhand"), ("architects", "kalam", "architects"), ("kalam", "patrickhand", "patrickhand"), ("patrickhand", "kalam", "patrickhand")],
        "textures": ["marker"], "ornaments": ["marker"],
        "motions": ["draw", "typewriter", "snappy"], "photos": ["frame", "cutout"], "charts": ["hand", "outline"], "labels": ["hand", "tag"],
    },
}
FAMILIES.update({
    "collage": {
        "name": "Collage (Vox)", "blurb": "Torn paper, tape, halftone clippings and cut-out photos, layered by hand.",
        "dark": False, "board": "#1f1d1b",
        "art": "a Vox-style explainer collage: torn paper scraps, masking tape, halftone newspaper clippings, cut-out photos with white edges, marker circles and arrows, layered by hand on a paper ground",
        "grounds": [("cream", "#efe7d6", 0.5), ("grey card", "#d9d6cf", 0.5), ("pink", "#efd6cf", 0.4), ("pale blue", "#d5e0e6", 0.4), ("kraft", "#cfb48a", 0.7)],
        "inks": [("red + yellow", "#1d1b19", ["#e0412c", "#f2c230", "#2c5f8a", "#c8bfae"]), ("blue + coral", "#1d1b19", ["#2c5f8a", "#ef7a5a", "#f2c230", "#c8bfae"]),
                 ("green + pink", "#1d1b19", ["#2e7d5b", "#ef8fa4", "#f2c230", "#c8bfae"]), ("black + yellow", "#1d1b19", ["#f2c230", "#1d1b19", "#e0412c", "#c8bfae"])],
        "types": [("anton", "worksans", "jetbrains"), ("archivoblack", "librefranklin", "plexmono"), ("bebas", "lato", "jetbrains"), ("oswald", "dmsans", "plexmono"), ("staatliches", "worksans", "jetbrains")],
        "textures": ["halftone", "photocopy"], "ornaments": ["zine", "vox"],
        "motions": ["slide", "stamp", "snappy"], "photos": ["torn", "cutout", "halftone"], "charts": ["stacked", "flat"], "labels": ["tag", "hand"],
    },
    "kinetic": {
        "name": "Kinetic type", "blurb": "The words are the picture: huge bold type that slams, stacks and stretches.",
        "dark": False, "board": "#111111",
        "art": "kinetic typography: huge bold words fill the frame and ARE the picture; they slam in, stack, stretch, get crossed out and swap colour; numbers are giant; very few other shapes, solid bold colours",
        "grounds": [("off-white", "#f2efe8", 0.15), ("yellow", "#f4d23c", 0.15), ("cobalt", "#2348c8", 0.15), ("red", "#e2402c", 0.15), ("mint", "#bfe8d2", 0.15)],
        "inks": [("black + red", "#111111", ["#e2402c", "#111111", "#f2efe8", "#8c8c8c"]), ("black + blue", "#111111", ["#2348c8", "#111111", "#f2efe8", "#8c8c8c"]),
                 ("white + black", "#111111", ["#f2efe8", "#111111", "#f4d23c", "#8c8c8c"])],
        "types": [("unbounded", "dmsans", "jetbrains"), ("delagothic", "dmsans", "jetbrains"), ("anton", "worksans", "jetbrains"), ("rubikmono", "rubik", "jetbrains"), ("syne", "syne", "jetbrains"), ("bebas", "worksans", "jetbrains")],
        "textures": ["offset"], "ornaments": ["swiss", "bauhaus"],
        "motions": ["snappy", "stamp", "slide", "typewriter"], "photos": ["mono", "frame"], "charts": ["flat"], "labels": ["mono"],
    },
    "isometric": {
        "name": "Isometric", "blurb": "Clean isometric 3D worlds: servers, cities and machines built from blocks.",
        "dark": False, "board": "#26304a",
        "art": "a clean isometric illustration: everything drawn in 30-degree isometric 3D (servers, racks, cities, chips, machines) from flat pastel blocks with three shades per face, tiny people for scale, soft long shadows, small labels on leader lines",
        "grounds": [("cloud", "#eef1f6", 0.1), ("sand", "#f3ede2", 0.1), ("mint", "#e6f2ee", 0.1), ("lilac", "#eeeaf6", 0.1)],
        "inks": [("blue + coral", "#26304a", ["#4a7bf0", "#ff7a6b", "#ffc857", "#c3cbe0"]), ("teal + orange", "#26304a", ["#1fa59a", "#ff9a3d", "#7b6cf0", "#c3cbe0"]),
                 ("violet + mint", "#26304a", ["#7b6cf0", "#3fc7a0", "#ff7a9c", "#c3cbe0"])],
        "types": [("poppins", "dmsans", "jetbrains"), ("manrope", "manrope", "jetbrains"), ("outfit", "outfit", "plexmono"), ("sora", "dmsans", "jetbrains")],
        "textures": ["soft"], "ornaments": ["iso"],
        "motions": ["snappy", "slide", "drift"], "photos": ["frame"], "charts": ["iso", "flat"], "labels": ["tag", "mono"],
    },
    "terminal": {
        "name": "Retro terminal", "blurb": "Green or amber phosphor on black: pixel type, ASCII charts, scanlines.",
        "dark": True, "board": "#0f1a12",
        "art": "a retro computer terminal: phosphor text on a black CRT, monospace and pixel type, ASCII and block-character charts, blinking cursors, boxes drawn with line characters, a faint glow and scanlines; everything types itself in",
        "grounds": [("crt black", "#050806", 0.2), ("green black", "#06100a", 0.2), ("amber black", "#0f0b05", 0.2)],
        "inks": [("phosphor green", "#b8ffcc", ["#39ff7a", "#d8ffe3", "#1f8a45", "#2a4a33"]), ("amber", "#ffe2b0", ["#ffb000", "#ffe2b0", "#a36b00", "#4a3a1a"]),
                 ("ice white", "#e6f4ff", ["#7fd6ff", "#e6f4ff", "#3a7fa8", "#2a3a4a"])],
        "types": [("vt323", "sharetech", "vt323"), ("silkscreen", "sharetech", "sharetech"), ("pressstart", "vt323", "vt323"), ("sharetech", "plexmono", "sharetech")],
        "textures": ["scanline"], "ornaments": ["terminal"],
        "motions": ["typewriter", "snappy"], "photos": ["mono"], "charts": ["pixel", "outline"], "labels": ["mono"],
    },
    "bauhaus": {
        "name": "Bauhaus", "blurb": "Primary red, blue and yellow; circles, triangles and bars; geometric type.",
        "dark": False, "board": "#1a1a1a",
        "art": "a Bauhaus poster: primary red, blue and yellow with black, big circles, triangles, half discs and bars arranged on a strict diagonal grid, geometric sans type, every idea built from simple shapes",
        "grounds": [("cream", "#f1e9d8", 0.3), ("off-white", "#f4f1ea", 0.2), ("warm grey", "#e3ddd2", 0.3)],
        "inks": [("primaries", "#1a1a1a", ["#d93a2b", "#2350a8", "#f2c12e", "#c9c1b2"]), ("blue first", "#1a1a1a", ["#2350a8", "#f2c12e", "#d93a2b", "#c9c1b2"]),
                 ("yellow first", "#1a1a1a", ["#f2c12e", "#d93a2b", "#2350a8", "#c9c1b2"])],
        "types": [("jost", "jost", "jetbrains"), ("josefin", "josefin", "jetbrains"), ("rubik", "rubik", "jetbrains"), ("bebas", "jost", "jetbrains")],
        "textures": ["offset", "riso"], "ornaments": ["bauhaus"],
        "motions": ["snappy", "slide", "draw"], "photos": ["mono", "halftone"], "charts": ["flat", "outline"], "labels": ["mono", "footnote"],
    },
    "comic": {
        "name": "Comic pop", "blurb": "Ben-day dots, bold outlines, bursts and speech bubbles, pop-art colour.",
        "dark": False, "board": "#141414",
        "art": "a pop-art comic page: thick black outlines, flat bold colours, ben-day dot shading, explosive bursts, speed lines, speech bubbles and caption boxes, panels with gutters, big hand-lettered sound words",
        "grounds": [("white", "#f7f3ea", 0.2), ("cream", "#f3e9cf", 0.3), ("pale yellow", "#f7eaa8", 0.2)],
        "inks": [("cmyk", "#141414", ["#e8322b", "#1f6fd0", "#f7c51e", "#d9d2c3"]), ("magenta + cyan", "#141414", ["#e0307a", "#18a8d8", "#f7c51e", "#d9d2c3"])],
        "types": [("bangers", "comicneue", "comicneue"), ("luckiest", "comicneue", "comicneue"), ("bangers", "indieflower", "comicneue")],
        "textures": ["benday"], "ornaments": ["comic"],
        "motions": ["stamp", "snappy", "slide"], "photos": ["halftone", "cutout"], "charts": ["pop"], "labels": ["bubble"],
    },
    "sketchbook": {
        "name": "Sketchbook", "blurb": "Pencil lines and watercolour washes on cream paper, written by hand.",
        "dark": False, "board": "#3a3530",
        "art": "a sketchbook page: pencil drawings with loose construction lines, soft watercolour washes that bleed past the lines, hand-written notes and arrows, small doodles, everything drawn and then washed with colour",
        "grounds": [("cream", "#f4ecdc", 0.6), ("warm white", "#f7f2e7", 0.5), ("grey paper", "#e8e6e0", 0.5)],
        "inks": [("pencil + blue wash", "#3a3530", ["#5b8fc4", "#e58a6b", "#8cb36b", "#c9c0ae"]), ("pencil + rose wash", "#3a3530", ["#e07a8a", "#6ba3c4", "#e6b85c", "#c9c0ae"]),
                 ("pencil + green wash", "#3a3530", ["#6fae7a", "#e6a25c", "#7b8fd4", "#c9c0ae"])],
        "types": [("caveat", "indieflower", "gaegu"), ("reenie", "gaegu", "gaegu"), ("indieflower", "gaegu", "gaegu"), ("architects", "indieflower", "gaegu")],
        "textures": ["watercolor"], "ornaments": ["sketch"],
        "motions": ["draw", "drift"], "photos": ["frame", "torn"], "charts": ["hand"], "labels": ["hand"],
    },
    "documentary": {
        "name": "Documentary", "blurb": "Photo-led: real photographs on dark film grain, lower thirds and timecodes.",
        "dark": True, "board": "#14161a",
        "art": "a documentary film: real photographs are the heroes, large, with slow pushes and pans; dark film grain and a vignette; clean lower-third caption bars, timecodes and location tags; charts are minimal white lines over the dark",
        "grounds": [("film black", "#0d0e10", 0.3), ("warm black", "#12100d", 0.3), ("blue black", "#0b0f15", 0.3)],
        "inks": [("white + yellow", "#f2f0ea", ["#f2c94c", "#f2f0ea", "#8a8f99", "#3a3f48"]), ("white + red", "#f2f0ea", ["#e5533d", "#f2f0ea", "#8a8f99", "#3a3f48"]),
                 ("white + teal", "#f2f0ea", ["#3ec7c0", "#f2f0ea", "#8a8f99", "#3a3f48"])],
        "types": [("librefranklin", "librefranklin", "jetbrains"), ("montserrat", "lato", "jetbrains"), ("cormorant", "lato", "plexmono"), ("oswald", "lato", "jetbrains")],
        "textures": ["film"], "ornaments": ["doc"],
        "motions": ["drift", "slide"], "photos": ["full", "frame"], "charts": ["outline"], "labels": ["lower"],
    },
    "dossier": {
        "name": "Dossier", "blurb": "Case files: manila folders, typewriter text, red stamps and redaction bars.",
        "dark": False, "board": "#2a2620",
        "art": "a secret case file: manila folders and typed index cards, typewriter text, red rubber stamps, paper clips, polaroid photos, red string between evidence, redaction bars, handwritten margin notes",
        "grounds": [("manila", "#e3cf9e", 0.6), ("aged paper", "#e8dcc0", 0.6), ("index card", "#efe8d6", 0.5)],
        "inks": [("typewriter + red", "#2a2620", ["#b8322a", "#2a2620", "#6b6152", "#c9b98f"]), ("typewriter + blue", "#2a2620", ["#2b4a8a", "#b8322a", "#6b6152", "#c9b98f"])],
        "types": [("specialelite", "courierprime", "courierprime"), ("courierprime", "courierprime", "specialelite"), ("staatliches", "specialelite", "courierprime")],
        "textures": ["manila", "photocopy"], "ornaments": ["dossier"],
        "motions": ["typewriter", "stamp", "slide"], "photos": ["frame", "torn", "mono"], "charts": ["outline", "hand"], "labels": ["stamp", "footnote"],
    },
})
FAMILIES.update({
    "zine": {
        "name": "Zine cut-up", "blurb": "Fluorescent riso, photocopied photo cut-outs, tape and scrawled type.",
        "dark": False, "board": "#1a1a1a",
        "art": "a punk riso zine: fluorescent pink and blue riso inks over photocopied real photos cut out with scissors, masking tape, scrawled marker type next to clean stencil type, ransom-note letters, misregistered colour, staples and scribbles",
        "grounds": [("photocopy white", "#f1efe9", 0.5), ("pink stock", "#f5d9dc", 0.4), ("yellow stock", "#f3e9b5", 0.4), ("grey stock", "#dcdad4", 0.5)],
        "inks": [("fluoro pink + blue", "#1a1a1a", ["#ff3d8b", "#2f5bd9", "#ffd23f", "#c9c4ba"]), ("fluoro orange + teal", "#1a1a1a", ["#ff6b2c", "#13968f", "#ff3d8b", "#c9c4ba"]),
                 ("green + purple", "#1a1a1a", ["#2bb24c", "#7a3ec9", "#ff6b2c", "#c9c4ba"]), ("black + fluoro yellow", "#1a1a1a", ["#1a1a1a", "#e8d000", "#ff3d8b", "#c9c4ba"])],
        "types": [("rubikmono", "specialelite", "courierprime"), ("staatliches", "marker", "spacemono"), ("anton", "specialelite", "courierprime"), ("bungee", "worksans", "spacemono")],
        "textures": ["riso", "photocopy"], "ornaments": ["zine"],
        "motions": ["stamp", "slide", "glitch", "snappy"], "photos": ["cutout", "torn", "halftone"], "charts": ["stacked", "hand", "dots"], "labels": ["hand", "stamp", "tag"],
        "headlines": ["caps", "huge", "outline", "underline"], "boxes": ["strip", "solid", "card"],
    },
    "magazine": {
        "name": "Magazine cover", "blurb": "Big Didone serif over a full-bleed real photo, cover lines, an issue number.",
        "dark": False, "board": "#141414",
        "art": "a glossy magazine cover and feature spread: one real photo bleeds full frame, a huge high-contrast Didone masthead-style headline over its calm part, cover lines stacked down one side, issue number and date, elegant thin rules, one accent colour",
        "grounds": [("gloss white", "#f6f3ee", 0.1), ("ivory", "#f1ebe0", 0.15), ("blush", "#f2e1dc", 0.15), ("stone", "#e4e0d8", 0.15)],
        "inks": [("black + red", "#141414", ["#d0242f", "#141414", "#9a9590", "#d8d2c8"]), ("black + gold", "#141414", ["#b88a2e", "#141414", "#9a9590", "#d8d2c8"]),
                 ("navy + coral", "#16213a", ["#f0644d", "#16213a", "#9a9590", "#d8d2c8"]), ("black + cobalt", "#141414", ["#2443c9", "#141414", "#9a9590", "#d8d2c8"])],
        "types": [("bodoni", "montserrat", "dmmono"), ("playfair", "lato", "dmmono"), ("abril", "librefranklin", "dmmono"), ("dmserif", "dmsans", "dmmono"), ("cormorant", "montserrat", "dmmono")],
        "textures": ["offset"], "ornaments": ["newsprint", "swiss"],
        "motions": ["zoom", "drift", "wipe", "slide"], "photos": ["bleed", "full", "duotone"], "charts": ["outline", "flat", "dots"], "labels": ["italic", "mono", "lower"],
        "headlines": ["huge", "sentence", "accent", "stepped"], "boxes": ["rule", "solid", "bracket"],
    },
    "encyclopedia": {
        "name": "Encyclopedia plate", "blurb": "Old engraved plates: sepia photos, numbered figures, fine rules and captions.",
        "dark": False, "board": "#2a2219",
        "art": "a plate from an old encyclopedia or natural-history atlas: sepia real photos and engravings as numbered figures (Fig. 1, Fig. 2), fine double rules, small caps captions, Latin-style labels, cross-hatched diagrams, a plate number in the corner, aged paper",
        "grounds": [("aged paper", "#ece0c6", 0.7), ("parchment", "#e8d9b8", 0.8), ("ivory", "#f0e8d6", 0.6), ("foxed", "#e3d4b4", 0.8)],
        "inks": [("sepia + oxblood", "#2a2219", ["#7a2a1d", "#3f5a6b", "#8a7a52", "#c9b998"]), ("sepia + prussian", "#2a2219", ["#24496b", "#7a2a1d", "#8a7a52", "#c9b998"]),
                 ("sepia + green", "#2a2219", ["#3f6b45", "#7a2a1d", "#8a7a52", "#c9b998"])],
        "types": [("imfell", "garamond", "courierprime"), ("oldstandard", "caslon", "courierprime"), ("cormorant", "garamond", "plexmono"), ("caslon", "oldstandard", "courierprime")],
        "textures": ["letterpress", "offset"], "ornaments": ["technical", "newsprint"],
        "motions": ["draw", "drift", "wipe"], "photos": ["engraving", "mono", "frame"], "charts": ["outline", "hand", "dots"], "labels": ["footnote", "italic", "tag"],
        "headlines": ["sentence", "caps", "stepped"], "boxes": ["rule", "outline", "bracket"],
    },
    "pinboard": {
        "name": "Pinboard", "blurb": "A cork board: real photos as polaroids, push-pins, red string and sticky notes.",
        "dark": False, "board": "#2b241d",
        "art": "an investigation pinboard on cork: real photos as polaroids and clippings pinned at angles, red string running between the evidence, push-pins, sticky notes and index cards with marker writing, circles drawn around the key thing",
        "grounds": [("cork", "#d6b488", 0.6), ("light cork", "#e0c39b", 0.6), ("dark cork", "#c9a272", 0.6)],
        "inks": [("marker + red string", "#1e1a16", ["#c8261e", "#f2d64b", "#2f6fb0", "#efe7d6"]), ("marker + blue", "#1e1a16", ["#2f6fb0", "#c8261e", "#f2d64b", "#efe7d6"]),
                 ("marker + green", "#1e1a16", ["#2c8a4a", "#c8261e", "#f2d64b", "#efe7d6"])],
        "types": [("marker", "patrickhand", "courierprime"), ("caveat", "specialelite", "courierprime"), ("architects", "patrickhand", "specialelite"), ("staatliches", "kalam", "courierprime")],
        "textures": ["cork"], "ornaments": ["pins"],
        "motions": ["stamp", "slide", "pop", "zoom"], "photos": ["polaroid", "frame", "torn"], "charts": ["hand", "stacked"], "labels": ["hand", "tag", "stamp"],
        "headlines": ["caps", "underline", "accent"], "boxes": ["sticky", "card", "strip"],
    },
    "fieldjournal": {
        "name": "Field journal", "blurb": "Graph paper, specimen labels, real photos taped in like samples.",
        "dark": False, "board": "#26302a",
        "art": "a scientist's field journal: graph paper, real photos taped in like specimens with typed specimen labels, measurements and scale bars, hand-written observations with arrows, pressed-leaf style diagrams, numbered entries and dates",
        "grounds": [("graph paper", "#eef0e6", 0.4), ("cream grid", "#f1ebdc", 0.5), ("green grid", "#e6eee2", 0.4), ("blue grid", "#e5ecf0", 0.4)],
        "inks": [("pencil + green", "#26302a", ["#3c7a4a", "#c2562e", "#3b6a9a", "#b9bcae"]), ("pencil + blue", "#26302a", ["#3b6a9a", "#c2562e", "#3c7a4a", "#b9bcae"]),
                 ("pencil + rust", "#26302a", ["#c2562e", "#3b6a9a", "#a8902e", "#b9bcae"])],
        "types": [("specialelite", "caveat", "courierprime"), ("robotoslab", "kalam", "dmmono"), ("zillaslab", "caveat", "courierprime"), ("courierprime", "indieflower", "courierprime")],
        "textures": ["grid"], "ornaments": ["technical", "sketch"],
        "motions": ["draw", "typewriter", "slide"], "photos": ["frame", "cutout", "polaroid"], "charts": ["hand", "dots", "outline"], "labels": ["tag", "hand", "footnote"],
        "headlines": ["sentence", "underline", "caps"], "boxes": ["tab", "outline", "strip"],
    },
    "travelposter": {
        "name": "Travel poster", "blurb": "Screen-printed flat scenes in four colours with big retro type.",
        "dark": False, "board": "#1f2a33",
        "art": "a vintage screen-printed travel poster: flat layered landscapes and machines in four limited colours, long simplified shadows, sun discs and gradient skies built from bands, big retro display type at the top or bottom, real photos turned into duotone plates",
        "grounds": [("poster cream", "#f1e3c4", 0.5), ("sky", "#cfe3e6", 0.4), ("sunset", "#f3d2a6", 0.5), ("sage", "#d6dcc0", 0.5)],
        "inks": [("teal + orange", "#1f2a33", ["#1f7a7a", "#e8792b", "#f2c14e", "#8fb0a8"]), ("navy + red", "#1f2a33", ["#22396b", "#d9452f", "#f2c14e", "#9fb3c8"]),
                 ("green + rust", "#1f2a33", ["#2f6b45", "#c4552c", "#e8c45a", "#a8b88a"]), ("plum + gold", "#2a1f2e", ["#6b2f5c", "#e3a33a", "#e86f5a", "#c8a8b8"])],
        "types": [("bungee", "josefin", "dmmono"), ("rye", "josefin", "dmmono"), ("righteous", "jost", "dmmono"), ("limelight", "josefin", "dmmono"), ("staatliches", "jost", "dmmono")],
        "textures": ["offset", "riso"], "ornaments": ["bauhaus", "vox"],
        "motions": ["parallax", "slide", "wipe", "drift"], "photos": ["duotone", "halftone"], "charts": ["flat", "stacked"], "labels": ["mono", "lower"],
        "headlines": ["caps", "huge", "stepped"], "boxes": ["solid", "rule", "tab"],
    },
    "synthwave": {
        "name": "Synthwave", "blurb": "Retro 80s: neon pink and cyan, chrome type, a sunset over a grid floor.",
        "dark": True, "board": "#1b0f2e",
        "art": "an 80s synthwave poster: deep purple night, a striped neon sun over a glowing perspective grid floor, chrome and neon outlined type, magenta and cyan glow, VHS scan lines, palm and mountain silhouettes, charts as neon lines",
        "grounds": [("night purple", "#140a24", 0.2), ("deep blue", "#0b0b26", 0.2), ("midnight", "#0d0718", 0.2)],
        "inks": [("pink + cyan", "#f6e9ff", ["#ff3fa4", "#2de2ff", "#ffb03a", "#4a3a6b"]), ("cyan + yellow", "#f6e9ff", ["#2de2ff", "#ffe14a", "#ff3fa4", "#4a3a6b"]),
                 ("orange + violet", "#f6e9ff", ["#ff7a3a", "#a35bff", "#2de2ff", "#4a3a6b"])],
        "types": [("monoton", "orbitron", "sharetech"), ("orbitron", "rajdhani", "sharetech"), ("bungee", "rajdhani", "sharetech"), ("righteous", "chakra", "sharetech")],
        "textures": ["glow", "scanline"], "ornaments": ["neon"],
        "motions": ["glitch", "zoom", "snappy", "wipe"], "photos": ["mono", "duotone"], "charts": ["outline", "glass"], "labels": ["mono", "tag"],
        "headlines": ["outline", "huge", "caps"], "boxes": ["bracket", "outline", "glass"],
    },
    "keynote": {
        "name": "Keynote", "blurb": "Dark gradients, frosted glass cards, huge clean numbers, very few words.",
        "dark": True, "board": "#1c1f26",
        "art": "a product keynote slide: a deep dark gradient, one huge clean number or phrase, frosted glass cards with soft glow, smooth gradient-filled charts, tiny grey supporting text, lots of calm empty space, one real photo or object lit softly",
        "grounds": [("graphite", "#0e0f13", 0.1), ("deep navy", "#0a0e1a", 0.1), ("ink violet", "#110d1c", 0.1), ("pure black", "#060606", 0.1)],
        "inks": [("white + blue", "#f4f5f7", ["#4f8bff", "#a855f7", "#22d3a6", "#3a3f4b"]), ("white + orange", "#f4f5f7", ["#ff8a3d", "#ff3d6e", "#ffd23f", "#3a3f4b"]),
                 ("white + green", "#f4f5f7", ["#30d17a", "#4f8bff", "#ffd23f", "#3a3f4b"]), ("white + violet", "#f4f5f7", ["#a855f7", "#4f8bff", "#ff6bd5", "#3a3f4b"])],
        "types": [("inter", "inter", "jetbrains"), ("sora", "inter", "jetbrains"), ("manrope", "manrope", "dmmono"), ("outfit", "dmsans", "dmmono"), ("intertight", "intertight", "jetbrains")],
        "textures": ["gradient"], "ornaments": ["neon"],
        "motions": ["drift", "zoom", "wipe", "parallax"], "photos": ["glass", "full"], "charts": ["glass", "outline", "dots"], "labels": ["mono", "tag"],
        "headlines": ["huge", "sentence", "accent"], "boxes": ["glass", "rule"],
    },
    "marketdesk": {
        "name": "Market desk", "blurb": "A trading screen: tickers, candlesticks, red and green numbers on black.",
        "dark": True, "board": "#11161d",
        "art": "a financial trading terminal: black screen, dense mono numbers, ticker tape running along an edge, candlestick charts, green for up and red for down, amber highlights, thin panel borders with tiny headers, a blinking last price",
        "grounds": [("terminal black", "#07090c", 0.1), ("navy black", "#0a0f17", 0.1), ("graphite", "#101215", 0.1)],
        "inks": [("amber + green", "#e6e8eb", ["#ffb000", "#22c55e", "#ef4444", "#3a4250"]), ("green + red", "#e6e8eb", ["#22c55e", "#ef4444", "#ffb000", "#3a4250"]),
                 ("cyan + amber", "#e6e8eb", ["#38bdf8", "#ffb000", "#ef4444", "#3a4250"])],
        "types": [("robotocond", "plexsans", "jetbrains"), ("barlowcond", "inter", "dmmono"), ("intertight", "plexsans", "plexmono"), ("rajdhani", "plexsans", "jetbrains")],
        "textures": ["scanline", "grid"], "ornaments": ["terminal", "neon"],
        "motions": ["snappy", "typewriter", "flip"], "photos": ["mono", "frame"], "charts": ["candles", "outline", "glass"], "labels": ["mono", "tag"],
        "headlines": ["caps", "accent", "huge"], "boxes": ["outline", "tab", "bracket"],
    },
    "brutalist": {
        "name": "Brutalist", "blurb": "Raw black on white, giant grotesk, hard boxes, no decoration.",
        "dark": False, "board": "#000000",
        "art": "a brutalist web poster: raw black type on plain white or one loud colour, giant grotesk words cropped by the frame edge, hard 4px boxes and rules, default-looking mono text, harsh contrast, no shadows, no decoration, one loud accent colour",
        "grounds": [("white", "#f7f7f5", 0.05), ("grey", "#dcdcdc", 0.05), ("acid yellow", "#e9f542", 0.05), ("signal blue", "#d7e3ff", 0.05)],
        "inks": [("black + red", "#000000", ["#ff2a1a", "#000000", "#7a7a7a", "#c8c8c8"]), ("black + blue", "#000000", ["#1a3cff", "#000000", "#7a7a7a", "#c8c8c8"]),
                 ("black + green", "#000000", ["#00a650", "#000000", "#7a7a7a", "#c8c8c8"])],
        "types": [("archivoblack", "spacemono", "spacemono"), ("intertight", "jetbrains", "jetbrains"), ("unbounded", "dmmono", "dmmono"), ("anton", "courierprime", "courierprime")],
        "textures": ["offset"], "ornaments": ["swiss"],
        "motions": ["snappy", "wipe", "glitch", "stamp"], "photos": ["halftone", "mono", "bleed"], "charts": ["flat", "outline", "dots"], "labels": ["mono", "footnote"],
        "headlines": ["huge", "caps", "outline"], "boxes": ["outline", "solid", "rule"],
    },
    "sumi": {
        "name": "Sumi ink", "blurb": "Rice paper, brush strokes, one red seal and a lot of quiet space.",
        "dark": False, "board": "#1c1a18",
        "art": "a Japanese sumi-e ink painting: soft rice paper, black brush strokes with dry edges, ink washes in grey, one red seal stamp, a brushed enso circle, vertical calm, lots of empty space, charts as single brush strokes",
        "grounds": [("rice paper", "#f1ece0", 0.7), ("warm washi", "#ece2cf", 0.8), ("grey washi", "#e4e2dc", 0.7)],
        "inks": [("sumi + seal red", "#1c1a18", ["#c2272d", "#55524d", "#8a857c", "#cfc8ba"]), ("sumi + indigo", "#1c1a18", ["#2d4a7a", "#c2272d", "#8a857c", "#cfc8ba"]),
                 ("sumi + moss", "#1c1a18", ["#5a6b3a", "#c2272d", "#8a857c", "#cfc8ba"])],
        "types": [("shippori", "shippori", "dmmono"), ("yuji", "cormorant", "dmmono"), ("cormorant", "cormorant", "dmmono"), ("instrument", "garamond", "dmmono")],
        "textures": ["ricepaper"], "ornaments": ["seal"],
        "motions": ["brush", "drift", "draw"], "photos": ["mono", "frame"], "charts": ["brush", "outline"], "labels": ["italic", "footnote"],
        "headlines": ["sentence", "huge", "accent"], "boxes": ["rule", "bracket"],
    },
    "flatvector": {
        "name": "Flat vector", "blurb": "Friendly flat shapes: rounded people, machines and charts in soft colours.",
        "dark": False, "board": "#24283b",
        "art": "a friendly flat-vector explainer: rounded geometric illustrations of people, machines, chips and cities built from simple flat shapes, soft colours with one darker shade per shape, no outlines, rounded charts, cheerful and clear, lots of breathing room",
        "grounds": [("soft white", "#f7f5f0", 0.05), ("peach", "#fbe9dc", 0.05), ("mint", "#e3f4ec", 0.05), ("sky", "#e3eefb", 0.05), ("lavender", "#ece8fa", 0.05)],
        "inks": [("blue + coral", "#24283b", ["#3d6ef5", "#ff7a6b", "#ffc23d", "#c6cde0"]), ("teal + pink", "#24283b", ["#14b8a6", "#f472b6", "#fbbf24", "#c6cde0"]),
                 ("violet + orange", "#24283b", ["#7c5cff", "#ff8c42", "#2ec4b6", "#c6cde0"]), ("green + red", "#24283b", ["#22a06b", "#ef5350", "#fbbf24", "#c6cde0"])],
        "types": [("fredoka", "nunito", "dmmono"), ("poppins", "nunito", "dmmono"), ("outfit", "dmsans", "dmmono"), ("rubik", "nunito", "dmmono"), ("sora", "dmsans", "dmmono")],
        "textures": ["soft"], "ornaments": ["iso", "vox"],
        "motions": ["pop", "snappy", "slide", "flip"], "photos": ["cutout", "frame"], "charts": ["flat", "iso", "dots"], "labels": ["tag", "bubble"],
        "headlines": ["sentence", "accent", "underline"], "boxes": ["card", "tab", "solid"],
    },
})
FAMILIES.update({
    "vaporwave": {
        "name": "Vaporwave", "blurb": "Pastel pink and teal, old computer windows, marble statues, grid sunsets.",
        "dark": False, "board": "#2a1f4a",
        "art": "a vaporwave collage: pastel pink, lilac and teal, old operating-system windows with grey title bars, checkerboard floors, a gradient sunset over a wire grid, real photos of statues and objects cut out and floating, chrome type, a faint VHS scan",
        "grounds": [("pastel pink", "#f6d6e8", 0.1), ("lavender", "#e3d9f7", 0.1), ("mint", "#d4f3ee", 0.1), ("peach", "#fbe0d2", 0.1)],
        "inks": [("pink + teal", "#2a1f4a", ["#ff5fa2", "#1fb5c9", "#9b6bff", "#c8bfe0"]), ("violet + cyan", "#2a1f4a", ["#8a4dff", "#14c4d9", "#ff5fa2", "#c8bfe0"]),
                 ("teal + coral", "#2a1f4a", ["#119fb0", "#ff6f61", "#9b6bff", "#c8bfe0"])],
        "types": [("michroma", "roboto", "vt323"), ("audiowide", "roboto", "vt323"), ("majormono", "overpass", "vt323"), ("poiret", "roboto", "sharetech")],
        "textures": ["scanline", "soft"], "ornaments": ["memphis", "neon"],
        "motions": ["glitch", "drift", "parallax", "zoom"], "photos": ["cutout", "duotone", "glass"], "charts": ["flat", "glass", "outline"], "labels": ["mono", "tag"],
        "headlines": ["outline", "huge", "caps"], "boxes": ["tab", "glass", "outline"],
    },
    "arcade": {
        "name": "Pixel arcade", "blurb": "8-bit sprites, pixel charts, score counters and game screens.",
        "dark": True, "board": "#1a1a33",
        "art": "an 8-bit arcade game: chunky pixel sprites built from squares (chips, servers, people, coins), pixel-block bar charts, score counters and level numbers, health bars as progress, blinking PRESS START style prompts, pixel borders, a starry black ground",
        "grounds": [("arcade black", "#0a0a14", 0.1), ("deep blue", "#0b1033", 0.1), ("purple night", "#160b26", 0.1)],
        "inks": [("yellow + pink", "#ffffff", ["#ffd400", "#ff3b6b", "#28d7ff", "#3a3a5a"]), ("green + orange", "#ffffff", ["#3dff7a", "#ff9a1f", "#28d7ff", "#3a3a5a"]),
                 ("pink + yellow", "#ffffff", ["#ff3b6b", "#ffd400", "#7b5cff", "#3a3a5a"])],
        "types": [("pressstart", "vt323", "vt323"), ("silkscreen", "vt323", "vt323"), ("vt323", "sharetech", "vt323"), ("pressstart", "silkscreen", "vt323")],
        "textures": ["pixel"], "ornaments": ["arcade"],
        "motions": ["pop", "snappy", "flip", "glitch"], "photos": ["mono", "frame"], "charts": ["pixel", "flat"], "labels": ["mono", "bubble"],
        "headlines": ["caps", "huge", "accent"], "boxes": ["outline", "solid", "bracket"],
    },
    "y2k": {
        "name": "Y2K chrome", "blurb": "Glossy chrome type, bubbles and iridescent gradients from the year 2000.",
        "dark": False, "board": "#1b2240",
        "art": "a Y2K web and music-video look: glossy chrome and liquid-metal type, bubble shapes, iridescent pastel gradients, translucent plastic panels, star sparkles, rounded futuristic shapes, a clean silver-white ground",
        "grounds": [("ice", "#e8f1fb", 0.05), ("silver", "#e6e7ec", 0.05), ("lilac", "#efe6fb", 0.05), ("aqua", "#dff6f6", 0.05)],
        "inks": [("blue + pink", "#1b2240", ["#3b6dff", "#ff5ad1", "#14b8a6", "#b9c2d8"]), ("pink + violet", "#1b2240", ["#e83fb8", "#7a5cff", "#14b8a6", "#b9c2d8"]),
                 ("cyan + lime", "#1b2240", ["#0096d6", "#7cc400", "#ff5ad1", "#b9c2d8"])],
        "types": [("michroma", "exo", "sharetech"), ("exo", "exo", "sharetech"), ("comfortaa", "exo", "sharetech"), ("audiowide", "outfit", "sharetech")],
        "textures": ["iridescent"], "ornaments": ["vox", "neon"],
        "motions": ["pop", "zoom", "glitch", "flip"], "photos": ["glass", "cutout"], "charts": ["glass", "flat", "dots"], "labels": ["tag", "bubble"],
        "headlines": ["outline", "huge", "sentence"], "boxes": ["glass", "card", "tab"],
    },
    "artdeco": {
        "name": "Art deco", "blurb": "Black and gold, fan lines, symmetric frames, tall elegant type.",
        "dark": True, "board": "#1c1a14",
        "art": "a 1920s art deco poster: black ground with gold line work, sunbursts and fans, stepped symmetric frames, tall thin elegant capitals, geometric chevrons, everything centred and ceremonial, charts as gold lines and stepped towers",
        "grounds": [("deco black", "#0e0d0b", 0.1), ("emerald black", "#0b1712", 0.1), ("navy", "#0c1222", 0.1)],
        "inks": [("gold", "#f3e7c8", ["#d4a944", "#f3e7c8", "#8a6d2f", "#3a3326"]), ("gold + emerald", "#f3e7c8", ["#d4a944", "#3fae86", "#f3e7c8", "#3a3326"]),
                 ("gold + ruby", "#f3e7c8", ["#e0b85a", "#d0504a", "#f3e7c8", "#3a3326"])],
        "types": [("limelight", "marcellus", "cinzel"), ("cinzel", "marcellus", "cinzel"), ("poiret", "cormorant", "cinzel"), ("marcellus", "cormorant", "cinzel")],
        "textures": ["film"], "ornaments": ["deco"],
        "motions": ["wipe", "drift", "draw", "zoom"], "photos": ["frame", "mono", "engraving"], "charts": ["outline", "flat"], "labels": ["mono", "italic"],
        "headlines": ["caps", "stepped", "sentence"], "boxes": ["bracket", "outline", "rule"],
    },
    "constructivist": {
        "name": "Constructivist", "blurb": "Red and black diagonals, photomontage, bold condensed type.",
        "dark": False, "board": "#121010",
        "art": "a 1920s constructivist poster: bold red and black on cream, everything on strong diagonals, real photos cut out and montaged at angles, huge condensed sans type running along the diagonals, circles, bars and arrows, loud and urgent",
        "grounds": [("cream", "#ecdfc2", 0.5), ("newsprint", "#e6dcc8", 0.5), ("aged", "#e2d3b2", 0.6)],
        "inks": [("red + black", "#121010", ["#d1231b", "#121010", "#7a6a55", "#c4b494"]), ("red + navy", "#121010", ["#d1231b", "#2f4f7a", "#121010", "#c4b494"]),
                 ("black + red", "#121010", ["#121010", "#d1231b", "#7a6a55", "#c4b494"])],
        "types": [("oswald", "robotocond", "spacemono"), ("bebas", "robotocond", "plexmono"), ("anton", "oswald", "spacemono"), ("staatliches", "robotocond", "spacemono")],
        "textures": ["halftone", "letterpress"], "ornaments": ["bauhaus", "swiss"],
        "motions": ["slide", "stamp", "zoom", "wipe"], "photos": ["halftone", "cutout", "mono"], "charts": ["flat", "stacked"], "labels": ["mono", "tag"],
        "headlines": ["caps", "huge", "stepped"], "boxes": ["solid", "strip", "rule"],
    },
    "memphis": {
        "name": "Memphis", "blurb": "Squiggles, confetti, pastel blocks and loud 80s shapes.",
        "dark": False, "board": "#161616",
        "art": "an 80s Memphis design: squiggles, zigzags, confetti, half circles and terrazzo dots in bright pastel and loud colours, thick black outlines, blocks at playful angles, chunky friendly type",
        "grounds": [("white", "#faf7f0", 0.05), ("pink", "#fde2e4", 0.05), ("mint", "#dff7ee", 0.05), ("yellow", "#fff3c4", 0.05)],
        "inks": [("pink + blue", "#161616", ["#ff4d8d", "#1f9fe8", "#ffc21f", "#c9c9c9"]), ("violet + orange", "#161616", ["#7a4dff", "#ff7a2b", "#1fb58f", "#c9c9c9"]),
                 ("red + blue", "#161616", ["#ff4d4d", "#1f6bff", "#ffc21f", "#c9c9c9"])],
        "types": [("bungee", "rubik", "dmmono"), ("syne", "outfit", "dmmono"), ("fredoka", "rubik", "dmmono"), ("unbounded", "dmsans", "dmmono")],
        "textures": ["soft"], "ornaments": ["memphis"],
        "motions": ["pop", "snappy", "flip", "slide"], "photos": ["cutout", "frame"], "charts": ["flat", "dots", "pop"], "labels": ["tag", "bubble"],
        "headlines": ["accent", "outline", "caps"], "boxes": ["solid", "card", "outline"],
    },
    "consulting": {
        "name": "Consulting deck", "blurb": "Clean white pages, navy, one takeaway headline, precise charts.",
        "dark": False, "board": "#14213d",
        "art": "a top consulting firm's slide: white page, the takeaway written as one full-sentence headline at the top, precise clean charts with direct labels and one highlighted bar, thin grey rules, a small source line, numbered exhibits, nothing decorative",
        "grounds": [("white", "#ffffff", 0.0), ("warm white", "#fbfaf7", 0.0), ("cool grey", "#f3f5f8", 0.0)],
        "inks": [("navy + blue", "#14213d", ["#0b5cd6", "#14213d", "#7f8fa6", "#d5dbe5"]), ("navy + teal", "#14213d", ["#00857c", "#14213d", "#7f8fa6", "#d5dbe5"]),
                 ("navy + red", "#14213d", ["#c8102e", "#14213d", "#7f8fa6", "#d5dbe5"])],
        "types": [("baskerville", "sourcesans", "plexmono"), ("sourcesans", "sourcesans", "plexmono"), ("intertight", "inter", "plexmono"), ("bitter", "sourcesans", "plexmono")],
        "textures": ["offset"], "ornaments": ["newsprint"],
        "motions": ["wipe", "snappy", "slide"], "photos": ["frame", "mono"], "charts": ["flat", "outline", "dots"], "labels": ["footnote", "mono"],
        "headlines": ["sentence", "accent"], "boxes": ["rule", "tab", "outline"],
    },
    "patent": {
        "name": "Patent drawing", "blurb": "Black line art, FIG. 1, numbered parts and patent-office text.",
        "dark": False, "board": "#151515",
        "art": "a patent drawing: precise black line art of the machine or idea, FIG. 1 and FIG. 2 titles, every part numbered with a thin leader line (10, 12, 14), cross-hatching for cut surfaces, dashed hidden lines, typed patent-style text, an old patent sheet",
        "grounds": [("patent white", "#f7f6f1", 0.3), ("cream", "#f0ecdf", 0.4), ("photostat", "#e9e8e3", 0.4)],
        "inks": [("black line", "#151515", ["#151515", "#6a6a6a", "#9a9a9a", "#d0d0d0"]), ("black + red pencil", "#151515", ["#b3261e", "#151515", "#6a6a6a", "#d0d0d0"]),
                 ("black + blue pencil", "#151515", ["#1f4fa8", "#151515", "#6a6a6a", "#d0d0d0"])],
        "types": [("courierprime", "garamond", "courierprime"), ("oldstandard", "garamond", "courierprime"), ("specialelite", "caslon", "courierprime")],
        "textures": ["photocopy", "letterpress"], "ornaments": ["technical"],
        "motions": ["draw", "typewriter", "wipe"], "photos": ["engraving", "mono"], "charts": ["outline", "hand"], "labels": ["footnote", "tag"],
        "headlines": ["caps", "sentence"], "boxes": ["outline", "rule", "bracket"],
    },
    "manuscript": {
        "name": "Illuminated manuscript", "blurb": "Vellum, drop caps, gold leaf, vines and marginal notes.",
        "dark": False, "board": "#2a1d14",
        "art": "a medieval illuminated manuscript: vellum page, a big decorated drop capital, red and blue rubrics, gold-leaf accents, vines and flourishes in the margins, small drawings in roundels, blackletter headings over calm book-hand text",
        "grounds": [("vellum", "#efe2c4", 0.7), ("parchment", "#e8d6ae", 0.8), ("aged vellum", "#e3cfa3", 0.8)],
        "inks": [("red + blue", "#2a1d14", ["#9c1f1f", "#1f3f8a", "#b8862a", "#b9a57e"]), ("blue + red", "#2a1d14", ["#1f3f8a", "#9c1f1f", "#3f6b2f", "#b9a57e"]),
                 ("green + red", "#2a1d14", ["#3f6b2f", "#9c1f1f", "#b8862a", "#b9a57e"])],
        "types": [("unifraktur", "garamond", "alegreyasc"), ("medieval", "garamond", "alegreyasc"), ("cinzel", "garamond", "alegreyasc"), ("imfell", "imfell", "alegreyasc")],
        "textures": ["vellum"], "ornaments": ["manuscript"],
        "motions": ["draw", "brush", "drift"], "photos": ["engraving", "frame"], "charts": ["hand", "outline"], "labels": ["italic", "footnote"],
        "headlines": ["accent", "sentence", "stepped"], "boxes": ["rule", "bracket", "outline"],
    },
    "woodcut": {
        "name": "Woodcut", "blurb": "Carved black lines, two colours and rough block-print edges.",
        "dark": False, "board": "#141210",
        "art": "a woodcut and linocut print: bold carved black shapes with gouge-mark texture lines, two flat ink colours, rough block edges, chunky slab type, everything simplified into carved shapes and parallel cut lines",
        "grounds": [("rag paper", "#efe8d8", 0.6), ("kraft", "#d9c29a", 0.8), ("grey stock", "#e3e0d8", 0.6)],
        "inks": [("black + red", "#141210", ["#c0392b", "#141210", "#5a5348", "#c9bfab"]), ("black + blue", "#141210", ["#2a5d8f", "#141210", "#5a5348", "#c9bfab"]),
                 ("black + green", "#141210", ["#2f6b3a", "#141210", "#5a5348", "#c9bfab"])],
        "types": [("alfaslab", "bitter", "courierprime"), ("ultra", "bitter", "courierprime"), ("rye", "bitter", "courierprime"), ("oldstandard", "bitter", "courierprime")],
        "textures": ["letterpress"], "ornaments": ["newsprint", "zine"],
        "motions": ["stamp", "draw", "slide"], "photos": ["engraving", "halftone"], "charts": ["flat", "hand", "stacked"], "labels": ["stamp", "italic"],
        "headlines": ["caps", "huge", "stepped"], "boxes": ["solid", "outline", "rule"],
    },
    "stencil": {
        "name": "Street stencil", "blurb": "Spray stencils, drips and pasted-up photos on concrete.",
        "dark": False, "board": "#151515",
        "art": "street art on a concrete wall: spray-paint stencils with soft overspray and drips, stencil type, real photos pasted up as torn posters, tape and marker tags, bold arrows, one or two loud spray colours",
        "grounds": [("concrete", "#c8c5bf", 0.6), ("light concrete", "#d6d3cc", 0.6), ("warm wall", "#d3cbbf", 0.6)],
        "inks": [("black + red", "#151515", ["#e0281e", "#151515", "#e8b800", "#8e8a83"]), ("black + cyan", "#151515", ["#0088b8", "#151515", "#e0281e", "#8e8a83"]),
                 ("black + green", "#151515", ["#1f9a4a", "#151515", "#e0281e", "#8e8a83"])],
        "types": [("stardos", "robotocond", "allerta"), ("blackops", "oswald", "allerta"), ("allerta", "robotocond", "allerta"), ("marker", "oswald", "spacemono")],
        "textures": ["concrete"], "ornaments": ["zine"],
        "motions": ["stamp", "glitch", "slide", "wipe"], "photos": ["torn", "halftone", "cutout"], "charts": ["stacked", "flat"], "labels": ["stamp", "hand"],
        "headlines": ["caps", "huge", "outline"], "boxes": ["strip", "solid"],
    },
    "neubrutal": {
        "name": "Neubrutalism", "blurb": "Pastel blocks, thick black outlines and hard offset shadows.",
        "dark": False, "board": "#111111",
        "art": "neubrutalist design: flat pastel blocks with thick 4px black outlines and hard offset black shadows (no blur), chunky grotesk type, sticker-like tags, buttons and cards, playful but strict, high contrast",
        "grounds": [("cream", "#fff4e0", 0.0), ("lilac", "#e8dcff", 0.0), ("mint", "#d8f5e0", 0.0), ("yellow", "#fff1a8", 0.0)],
        "inks": [("coral + blue", "#111111", ["#ff6b6b", "#4d7cff", "#ffc21f", "#c9c3b5"]), ("violet + orange", "#111111", ["#7c5cff", "#ff8c1c", "#1fb5a8", "#c9c3b5"]),
                 ("teal + pink", "#111111", ["#00a892", "#ff4f86", "#ffc21f", "#c9c3b5"])],
        "types": [("archivoblack", "spacegrotesk", "spacemono"), ("unbounded", "dmsans", "dmmono"), ("syne", "spacegrotesk", "spacemono"), ("rubikmono", "rubik", "jetbrains")],
        "textures": ["offset"], "ornaments": ["swiss", "memphis"],
        "motions": ["snappy", "pop", "flip", "slide"], "photos": ["frame", "cutout"], "charts": ["flat", "dots", "stacked"], "labels": ["tag", "mono"],
        "headlines": ["caps", "accent", "huge"], "boxes": ["solid", "outline", "tab"],
    },
    "clay": {
        "name": "Clay 3D", "blurb": "Soft rounded clay shapes with gentle shading, like toys.",
        "dark": False, "board": "#2b2a33",
        "art": "soft plasticine clay 3D: chunky rounded shapes with gentle inner shading and soft contact shadows (radial gradients), toy-like chips, servers, coins and little people, cheerful colours, rounded charts like stacked clay blocks",
        "grounds": [("putty", "#f2ebe3", 0.05), ("peach", "#fbe3d6", 0.05), ("sky", "#dfeefb", 0.05), ("sage", "#e3eedc", 0.05)],
        "inks": [("coral + blue", "#2b2a33", ["#ff7a59", "#5b8def", "#ffb92e", "#cbc4bb"]), ("violet + mint", "#2b2a33", ["#8b6cf0", "#2fb58c", "#ff8fa3", "#cbc4bb"]),
                 ("orange + teal", "#2b2a33", ["#ff8a2e", "#1fa5b8", "#f25f7a", "#cbc4bb"])],
        "types": [("baloo", "nunito", "dmmono"), ("fredoka", "nunito", "dmmono"), ("comfortaa", "nunito", "dmmono"), ("rubik", "baloo", "dmmono")],
        "textures": ["soft"], "ornaments": ["iso"],
        "motions": ["pop", "flip", "zoom"], "photos": ["cutout", "frame"], "charts": ["iso", "flat", "dots"], "labels": ["bubble", "tag"],
        "headlines": ["sentence", "accent"], "boxes": ["card", "solid"],
    },
    "diorama": {
        "name": "Paper diorama", "blurb": "Layered cut paper with real depth and shadows between layers.",
        "dark": False, "board": "#23201d",
        "art": "a layered paper diorama: scenes built from several layers of cut coloured paper, each casting a soft shadow on the one behind, hills, buildings, machines and people as paper silhouettes, real photos cut out and set into the layers, gentle parallax",
        "grounds": [("cream", "#f3ead8", 0.4), ("sky paper", "#dce9ee", 0.4), ("rose", "#f1dcd4", 0.4), ("sage", "#dfe4cf", 0.4)],
        "inks": [("orange + blue", "#23201d", ["#e2603f", "#2f6f8f", "#f2b544", "#c9bfae"]), ("green + coral", "#23201d", ["#3f7f5f", "#e88c5a", "#5b7fc4", "#c9bfae"]),
                 ("violet + amber", "#23201d", ["#8a5ab8", "#f0a04b", "#3fa3a0", "#c9bfae"])],
        "types": [("fraunces", "dmsans", "dmmono"), ("dmserif", "worksans", "dmmono"), ("gloock", "outfit", "dmmono"), ("instrument", "dmsans", "dmmono")],
        "textures": ["soft", "riso"], "ornaments": ["vox"],
        "motions": ["parallax", "slide", "zoom"], "photos": ["cutout", "torn"], "charts": ["stacked", "flat"], "labels": ["tag", "italic"],
        "headlines": ["sentence", "stepped", "accent"], "boxes": ["card", "strip"],
    },
    "midcentury": {
        "name": "Mid-century", "blurb": "Atomic shapes, limited flat colours, 1950s film-title style.",
        "dark": False, "board": "#1e1b18",
        "art": "a 1950s mid-century film title and poster: limited flat colours, jagged cut-paper shapes, atomic starbursts and boomerangs, stylised hands and figures as silhouettes, playful script mixed with clean sans, slightly off-register print",
        "grounds": [("warm cream", "#f2e6cc", 0.5), ("mustard paper", "#ead9a8", 0.5), ("teal paper", "#cfe0d8", 0.5)],
        "inks": [("orange + teal", "#1e1b18", ["#e0582b", "#1f6f78", "#e8b33a", "#bfb19a"]), ("red + navy", "#1e1b18", ["#c33f2f", "#2a4f7a", "#e8b33a", "#bfb19a"]),
                 ("green + orange", "#1e1b18", ["#3f7a4a", "#e07a2b", "#2a4f7a", "#bfb19a"])],
        "types": [("pacifico", "josefin", "dmmono"), ("lobster", "josefin", "dmmono"), ("josefin", "jost", "dmmono"), ("bebas", "josefin", "dmmono"), ("fraunces", "jost", "dmmono")],
        "textures": ["riso", "offset"], "ornaments": ["midcentury"],
        "motions": ["slide", "pop", "wipe", "flip"], "photos": ["duotone", "halftone"], "charts": ["flat", "stacked"], "labels": ["italic", "mono"],
        "headlines": ["accent", "caps", "stepped"], "boxes": ["solid", "card"],
    },
    "transit": {
        "name": "Transit map", "blurb": "Metro lines, stations and 45-degree routes to explain flows.",
        "dark": False, "board": "#1d1d1d",
        "art": "a bold metro-map explainer: the idea is a route drawn BIG across most of the frame with THICK coloured lines (20-28 px) at 0, 45 and 90 degrees, stations as big white discs with heavy black rings, interchanges as linked discs; every label sits in its own white or line-coloured box ABOVE or BELOW the line, never on it; each scene also shows ONE big bold number or word in a line-coloured roundel or box; solid shapes (ships, cities, servers) are drawn as bold flat icons on the line, not thin outlines; labels at least 40 px; the route and its labels fill the frame",
        "grounds": [("map white", "#f7f6f2", 0.0), ("light grey", "#eceae5", 0.0), ("cream", "#f3eee2", 0.0)],
        "inks": [("red + blue", "#1d1d1d", ["#e3242b", "#0072ce", "#00a651", "#c8c8c8"]), ("blue + orange", "#1d1d1d", ["#0072ce", "#f07800", "#8e44ad", "#c8c8c8"]),
                 ("green + red", "#1d1d1d", ["#00a651", "#e3242b", "#e0a000", "#c8c8c8"])],
        "types": [("overpass", "overpass", "jetbrains"), ("roboto", "roboto", "plexmono"), ("worksans", "worksans", "plexmono"), ("sourcesans", "sourcesans", "plexmono")],
        "textures": ["offset"], "ornaments": ["transit"],
        "motions": ["draw", "snappy", "wipe"], "photos": ["frame", "mono"], "charts": ["outline", "flat", "dots"], "labels": ["tag", "mono"],
        "headlines": ["sentence", "caps"], "boxes": ["tab", "outline", "rule"],
    },
    "mission": {
        "name": "Mission control", "blurb": "Retro space-agency orange, telemetry, mission patches, countdowns.",
        "dark": True, "board": "#151b21",
        "art": "a retro space mission control: dark console screens, orange and white telemetry, trajectory arcs and orbits, countdown clocks, mission patches, numbered checklists, crosshairs and grid readouts, real photos of hardware in thin frames",
        "grounds": [("console", "#0d1114", 0.1), ("olive console", "#12140e", 0.1), ("navy", "#0b1220", 0.1)],
        "inks": [("orange + white", "#e9ecef", ["#ff7a1a", "#e9ecef", "#3ad1ff", "#3a424a"]), ("red + yellow", "#e9ecef", ["#ff4a3d", "#ffd60a", "#3ad1ff", "#3a424a"]),
                 ("yellow + orange", "#e9ecef", ["#ffd60a", "#ff7a1a", "#7ae582", "#3a424a"])],
        "types": [("exo", "overpass", "sharetech"), ("tomorrow", "roboto", "jetbrains"), ("michroma", "overpass", "sharetech"), ("barlowcond", "roboto", "jetbrains")],
        "textures": ["scanline", "grid"], "ornaments": ["mission"],
        "motions": ["typewriter", "snappy", "zoom", "draw"], "photos": ["mono", "frame", "full"], "charts": ["outline", "glass"], "labels": ["mono", "tag"],
        "headlines": ["caps", "accent"], "boxes": ["bracket", "outline", "tab"],
    },
    "receipt": {
        "name": "Thermal receipt", "blurb": "Receipt paper, itemised lines, totals and barcodes.",
        "dark": False, "board": "#1a1a1a",
        "art": "a thermal shop receipt: long strips of slightly grey receipt paper, mono type, itemised lines with dotted leaders and prices, SUBTOTAL and TOTAL lines, dashes as dividers, barcodes, a torn zig-zag edge, faded print, a rubber stamp now and then",
        "grounds": [("thermal white", "#f6f5f1", 0.2), ("faded", "#efede6", 0.2), ("receipt grey", "#ebe9e4", 0.2)],
        "inks": [("black", "#1a1a1a", ["#1a1a1a", "#d4352b", "#7a7a7a", "#cfcfcf"]), ("black + red", "#1a1a1a", ["#d4352b", "#1a1a1a", "#7a7a7a", "#cfcfcf"]),
                 ("black + blue", "#1a1a1a", ["#2a5bd7", "#1a1a1a", "#7a7a7a", "#cfcfcf"])],
        "types": [("vt323", "courierprime", "courierprime"), ("courierprime", "courierprime", "courierprime"), ("sharetech", "courierprime", "sharetech"), ("specialelite", "courierprime", "courierprime")],
        "textures": ["thermal"], "ornaments": ["receipt"],
        "motions": ["typewriter", "slide", "stamp"], "photos": ["halftone", "mono"], "charts": ["pixel", "flat"], "labels": ["mono", "stamp"],
        "headlines": ["caps", "huge"], "boxes": ["rule", "outline"],
    },
    "spreadsheet": {
        "name": "Spreadsheet", "blurb": "Cells, formulas, highlighted rows and colour scales.",
        "dark": False, "board": "#202124",
        "art": "a spreadsheet: a grid of cells with column letters and row numbers, a formula bar showing the calculation (=SUM, =A2*B2), highlighted rows, a selected cell with a thick outline, conditional colour scales on numbers, small embedded charts",
        "grounds": [("sheet white", "#ffffff", 0.0), ("pale grey", "#f6f7f9", 0.0), ("ledger green", "#eef6ee", 0.0)],
        "inks": [("blue + green", "#202124", ["#1a73e8", "#188038", "#d93025", "#dadce0"]), ("green + amber", "#202124", ["#188038", "#e37400", "#d93025", "#dadce0"]),
                 ("violet + blue", "#202124", ["#9334e6", "#1a73e8", "#e37400", "#dadce0"])],
        "types": [("roboto", "roboto", "jetbrains"), ("inter", "inter", "jetbrains"), ("sourcesans", "sourcesans", "plexmono"), ("intertight", "roboto", "dmmono")],
        "textures": ["cells"], "ornaments": ["technical"],
        "motions": ["snappy", "typewriter", "wipe"], "photos": ["frame"], "charts": ["flat", "outline", "dots"], "labels": ["mono", "tag"],
        "headlines": ["sentence", "accent"], "boxes": ["outline", "tab", "solid"],
    },
    "gallery": {
        "name": "Gallery wall", "blurb": "White walls, framed real photos under spotlights, museum placards.",
        "dark": False, "board": "#1c1c1c",
        "art": "a museum gallery wall: real photos hung in thin frames under soft spotlights, each with a small museum placard (title, year, a one-line note), numbered exhibits, generous wall space, quiet elegant type, charts printed like framed prints",
        "grounds": [("gallery white", "#f4f2ee", 0.05), ("warm wall", "#ece6dc", 0.05), ("grey wall", "#dcdad6", 0.05), ("sage wall", "#d9ded5", 0.05)],
        "inks": [("black + gold", "#1c1c1c", ["#a87a24", "#1c1c1c", "#8a8580", "#cfc9bf"]), ("black + oxblood", "#1c1c1c", ["#8a2e2e", "#1c1c1c", "#8a8580", "#cfc9bf"]),
                 ("black + navy", "#1c1c1c", ["#2e4a6b", "#1c1c1c", "#8a8580", "#cfc9bf"])],
        "types": [("cormorant", "lato", "dmmono"), ("playfair", "montserrat", "dmmono"), ("instrument", "inter", "dmmono"), ("bodoni", "lato", "dmmono")],
        "textures": ["soft"], "ornaments": ["gallery"],
        "motions": ["drift", "zoom", "wipe"], "photos": ["frame", "full", "mono"], "charts": ["outline", "flat"], "labels": ["footnote", "italic"],
        "headlines": ["sentence", "accent"], "boxes": ["rule", "card"],
    },
    "contactsheet": {
        "name": "Contact sheet", "blurb": "Film strips, grease-pencil circles and black-and-white photos.",
        "dark": False, "board": "#141414",
        "art": "a photographer's contact sheet: black film strips with sprocket holes and frame numbers, rows of real black-and-white photos, red grease-pencil circles, ticks and X marks on the chosen frames, a loupe enlarging one frame, stamped edge text",
        "grounds": [("photo paper", "#ecebe7", 0.2), ("warm paper", "#ebe5da", 0.2), ("grey paper", "#dedcd8", 0.2)],
        "inks": [("black + grease red", "#141414", ["#d9261c", "#141414", "#d9a400", "#bdbbb5"]), ("black + yellow", "#141414", ["#d9a400", "#141414", "#d9261c", "#bdbbb5"]),
                 ("black + blue", "#141414", ["#1f6fd0", "#141414", "#d9261c", "#bdbbb5"])],
        "types": [("spacemono", "worksans", "spacemono"), ("jetbrains", "librefranklin", "jetbrains"), ("marker", "worksans", "spacemono"), ("oswald", "worksans", "plexmono")],
        "textures": ["photocopy", "halftone"], "ornaments": ["filmstrip"],
        "motions": ["zoom", "slide", "flip"], "photos": ["mono", "frame", "full"], "charts": ["outline", "hand"], "labels": ["mono", "hand"],
        "headlines": ["caps", "underline"], "boxes": ["outline", "rule"],
    },
    "atlas": {
        "name": "Atlas", "blurb": "Contour lines, a compass rose, coastlines and cartographic labels.",
        "dark": False, "board": "#2b2620",
        "art": "an old atlas and cartography: contour lines, coastlines and rivers, a compass rose, dotted routes with arrows, a decorated cartouche for the title, scale bars, place names in spaced italic capitals, real photos framed as map insets",
        "grounds": [("map paper", "#efe6cf", 0.6), ("sea", "#dbe7e4", 0.5), ("old map", "#e6d7b4", 0.7)],
        "inks": [("rust + blue", "#2b2620", ["#b5452f", "#2f6f8f", "#6b8f3f", "#c9b994"]), ("blue + rust", "#2b2620", ["#2f6f8f", "#b5452f", "#b88a2a", "#c9b994"]),
                 ("green + plum", "#2b2620", ["#5a7f35", "#8a3f6b", "#2f6f8f", "#c9b994"])],
        "types": [("cinzel", "garamond", "alegreyasc"), ("imfell", "garamond", "alegreyasc"), ("oldstandard", "caslon", "plexmono"), ("marcellus", "cormorant", "alegreyasc")],
        "textures": ["topo"], "ornaments": ["atlas"],
        "motions": ["draw", "zoom", "drift"], "photos": ["engraving", "frame", "mono"], "charts": ["outline", "hand", "dots"], "labels": ["italic", "tag"],
        "headlines": ["caps", "sentence"], "boxes": ["bracket", "rule", "outline"],
    },
})
# 16 families from MotionAgent's styles (~/personal/MotionAgent/styles): only the ones no family above already covers
FAMILIES.update({
    "scroll": {
        "name": "Ancient scroll", "blurb": "An old scroll with burnt edges, carved capitals, red marker circles and seals.",
        "dark": False, "board": "#3a2412",
        "art": "an ancient scroll: parchment with burnt, curling edges, carved Roman capitals, red ink circles round the key facts, wax seals, quill lines, maps and portraits drawn in sepia ink",
        "grounds": [("parchment", "#e9d8b0", 0.8), ("old vellum", "#efe2c2", 0.7)],
        "inks": [("sepia + red", "#3a2412", ["#a8321e", "#6b4a26", "#8a6a2a", "#cdb98a"]), ("sepia + gold", "#3a2412", ["#b0802a", "#a8321e", "#6b4a26", "#cdb98a"])],
        "types": [("cinzel", "garamond", "alegreyasc"), ("marcellus", "cormorant", "alegreyasc"), ("imfell", "garamond", "courierprime")],
        "textures": ["scroll"], "ornaments": ["seal", "manuscript"],
        "motions": ["draw", "drift", "stamp", "wipe"], "photos": ["engraving", "torn", "mono"], "charts": ["hand", "outline"], "labels": ["italic", "stamp"],
        "headlines": ["caps", "underline"], "boxes": ["rule", "bracket", "strip"],
    },
    "canvas": {
        "name": "Art canvas", "blurb": "Linen canvas, elegant serif words and terracotta paint strokes under the key words.",
        "dark": False, "board": "#2e2620",
        "art": "a painter's linen canvas: elegant serif words, broad terracotta and ochre paint strokes laid under the key words, framed paintings and photos, a palette-knife texture, loose brush marks",
        "grounds": [("linen", "#e8e0d0", 0.7), ("raw canvas", "#ece4d2", 0.6)],
        "inks": [("terracotta", "#2e2620", ["#c0603a", "#3f6a5a", "#d0a040", "#cdbfa8"]), ("ochre + teal", "#2e2620", ["#c8902a", "#2f6a6a", "#c0603a", "#cdbfa8"])],
        "types": [("playfair", "garamond", "caveat"), ("cormorant", "lora", "kalam"), ("fraunces", "sourceserif", "caveat")],
        "textures": ["linen"], "ornaments": ["gallery", "sketch"],
        "motions": ["brush", "drift", "wipe", "zoom"], "photos": ["frame", "bleed", "full"], "charts": ["brush", "hand"], "labels": ["italic", "hand"],
        "headlines": ["sentence", "accent"], "boxes": ["rule", "card", "strip"],
    },
    "bulletjournal": {
        "name": "Bullet journal", "blurb": "A dot-grid journal: washi-tape key words, pastel circles behind stickers, polaroids.",
        "dark": False, "board": "#3a3440",
        "art": "a bullet journal page: a dot grid, washi tape strips over the key words, pastel highlighter, hand-lettered headings, small doodles and stickers on pastel circles, polaroids taped in",
        "grounds": [("dot grid", "#f7f4ee", 0.4), ("cream page", "#f5efe4", 0.5)],
        "inks": [("pastel pink", "#3a3440", ["#e88aa0", "#7ab8b0", "#f0c060", "#d8d0e0"]), ("sage + lilac", "#3a3440", ["#8aaa7a", "#a890c8", "#e88aa0", "#d8d0e0"])],
        "types": [("patrickhand", "nunito", "caveat"), ("fredoka", "nunito", "indieflower"), ("comfortaa", "outfit", "gaegu")],
        "textures": ["dotgrid"], "ornaments": ["marker", "pins"],
        "motions": ["pop", "drift", "brush", "snappy"], "photos": ["polaroid", "torn", "cutout"], "charts": ["hand", "pop"], "labels": ["hand", "tag"],
        "headlines": ["underline", "sentence", "accent"], "boxes": ["sticky", "strip", "card"],
    },
    "kraft": {
        "name": "Kraft paper", "blurb": "Brown kraft paper, marker titles, white paint strokes, stamps and torn photos.",
        "dark": False, "board": "#2a1e14",
        "art": "a craft project on brown kraft paper: thick marker titles, a white paint-brush stroke under the key word, rubber stamps, twine, stickers on white blobs, torn photos, ruled lines",
        "grounds": [("kraft", "#c8a77c", 0.8), ("light kraft", "#d4b68c", 0.7)],
        "inks": [("ink + white", "#2a1e14", ["#fbf6ec", "#2f5a3a", "#b8322a", "#a88a62"]), ("ink + green", "#2a1e14", ["#2f5a3a", "#fbf6ec", "#c0602a", "#a88a62"])],
        "types": [("marker", "patrickhand", "courierprime"), ("archivoblack", "kalam", "specialelite"), ("bangers", "patrickhand", "courierprime")],
        "textures": ["kraft"], "ornaments": ["marker", "seal"],
        "motions": ["stamp", "pop", "brush", "slide"], "photos": ["torn", "polaroid", "cutout"], "charts": ["hand", "brush"], "labels": ["stamp", "hand"],
        "headlines": ["caps", "underline"], "boxes": ["strip", "sticky", "solid"],
    },
    "cardboard": {
        "name": "Maker cardboard", "blurb": "Corrugated cardboard, heavy die-cut words, icons on cream squares.",
        "dark": False, "board": "#2a1e12",
        "art": "a maker's workshop in corrugated cardboard: heavy words cut out like die-cut stickers, icons on cream squares, tape, rulers and cut lines, parts laid out like a kit",
        "grounds": [("cardboard", "#c39a68", 0.8), ("pale card", "#d2ad7e", 0.7)],
        "inks": [("black + cream", "#1e160e", ["#f6efe0", "#d0502a", "#2a5a8a", "#9a7a50"]), ("black + red", "#1e160e", ["#d0502a", "#f6efe0", "#2a5a8a", "#9a7a50"])],
        "types": [("archivoblack", "outfit", "spacemono"), ("bungee", "worksans", "dmmono"), ("alfaslab", "outfit", "courierprime")],
        "textures": ["corrugated"], "ornaments": ["technical", "marker"],
        "motions": ["pop", "stamp", "snappy", "flip"], "photos": ["cutout", "torn", "frame"], "charts": ["pop", "stacked"], "labels": ["stamp", "tag"],
        "headlines": ["caps", "huge"], "boxes": ["solid", "strip", "card"],
    },
    "clinic": {
        "name": "Clinic clean", "blurb": "Clinic white-to-mint, Lexend-style words underlined in teal, soft teal circles.",
        "dark": False, "board": "#173238",
        "art": "a clean clinic explainer: white to mint gradient with soft dots, calm rounded sans words underlined in teal, icons on soft teal circles, rounded photos, simple medical diagrams",
        "grounds": [("white mint", "#f2f8f6", 0.3), ("soft mint", "#e8f4f0", 0.3)],
        "inks": [("teal", "#173238", ["#1f9a8a", "#3a7ac8", "#e07a5a", "#cfe4de"]), ("blue + teal", "#173238", ["#3a7ac8", "#1f9a8a", "#e0a03a", "#cfe4de"])],
        "types": [("outfit", "outfit", "dmmono"), ("jost", "nunito", "plexmono"), ("manrope", "manrope", "dmmono")],
        "textures": ["clinic"], "ornaments": ["iso"],
        "motions": ["drift", "pop", "zoom", "wipe"], "photos": ["glass", "frame", "cutout"], "charts": ["flat", "glass", "dots"], "labels": ["tag", "lower"],
        "headlines": ["sentence", "underline"], "boxes": ["card", "glass", "rule"],
    },
    "wildlife": {
        "name": "Wildlife film", "blurb": "Deep green, a drifting camera, serif titles, stickers on dark leaf shapes.",
        "dark": True, "board": "#0e1f16",
        "art": "a nature documentary: deep forest green, soft light through leaves, a slowly drifting camera, elegant serif titles, animals and plants as cut-outs on dark leaf shapes, round photos rising",
        "grounds": [("forest", "#14281c", 0.4), ("moss", "#1a3022", 0.4)],
        "inks": [("leaf + sun", "#eef0e0", ["#9acb5a", "#f0c050", "#5aa8a0", "#3a5a40"]), ("fern + amber", "#eef0e0", ["#7ab85a", "#e0903a", "#c8d890", "#3a5a40"])],
        "types": [("playfair", "outfit", "dmmono"), ("cormorant", "sourcesans", "plexmono"), ("fraunces", "worksans", "dmmono")],
        "textures": ["leaves"], "ornaments": ["doc"],
        "motions": ["drift", "parallax", "zoom", "wipe"], "photos": ["full", "cutout", "glass"], "charts": ["flat", "dots"], "labels": ["italic", "lower"],
        "headlines": ["sentence", "caps"], "boxes": ["rule", "glass"],
    },
    "noir": {
        "name": "Film noir", "blurb": "Black-and-white noir with blind-stripe shadows, red outlined key words.",
        "dark": True, "board": "#0c0c0e",
        "art": "a 1940s film noir: black and white, hard light through venetian blinds casting stripes, red outlined key words, typewritten notes, a detective's desk, B&W polaroids dropping in, cigarette smoke",
        "grounds": [("noir", "#121214", 0.5), ("smoke", "#1a1a1c", 0.5)],
        "inks": [("white + red", "#ecebe6", ["#d22a2a", "#bdbab2", "#8a8780", "#3a3a3c"]), ("white + amber", "#ecebe6", ["#e0a030", "#d22a2a", "#8a8780", "#3a3a3c"])],
        "types": [("bebas", "specialelite", "courierprime"), ("oswald", "courierprime", "specialelite"), ("robotocond", "specialelite", "courierprime")],
        "textures": ["blinds"], "ornaments": ["dossier", "filmstrip"],
        "motions": ["zoom", "typewriter", "wipe", "drift"], "photos": ["mono", "polaroid", "full"], "charts": ["outline", "flat"], "labels": ["stamp", "mono"],
        "headlines": ["outline", "caps"], "boxes": ["bracket", "rule", "outline"],
    },
    "ocean": {
        "name": "Deep ocean", "blurb": "Deep sea blue with moving waves, glowing aqua key words, aqua rings.",
        "dark": True, "board": "#06202e",
        "art": "the deep ocean: dark sea blue with slow light rays and waves, glowing aqua key words, sea life and objects in aqua rings, bubbles rising, round photos rising from the depth",
        "grounds": [("deep sea", "#082a3c", 0.4), ("abyss", "#061e2c", 0.4)],
        "inks": [("aqua", "#e6f6f8", ["#3ad6d0", "#f0c060", "#6aa8e0", "#2a5a70"]), ("aqua + coral", "#e6f6f8", ["#3ad6d0", "#f07a5a", "#a0e0c8", "#2a5a70"])],
        "types": [("outfit", "manrope", "dmmono"), ("sora", "outfit", "plexmono"), ("comfortaa", "manrope", "dmmono")],
        "textures": ["waves"], "ornaments": ["neon"],
        "motions": ["drift", "parallax", "zoom", "pop"], "photos": ["glass", "full", "cutout"], "charts": ["glass", "flat", "dots"], "labels": ["lower", "tag"],
        "headlines": ["sentence", "accent"], "boxes": ["glass", "rule"],
    },
    "pastel": {
        "name": "Pastel pop", "blurb": "Soft pink-to-blue pastel with dots, round words on pink blocks, stickers on yellow blobs.",
        "dark": False, "board": "#3a2c48",
        "art": "a soft pastel pop page: pink to baby-blue gradient with little dots, round friendly words on pink blocks, big stickers on yellow blobs, rounded cards, cute simple icons",
        "grounds": [("pastel", "#f8eef4", 0.3), ("baby blue", "#eef4fa", 0.3)],
        "inks": [("pink + yellow", "#3a2c48", ["#f07aa0", "#f6c84a", "#7ab0e8", "#e8d8ea"]), ("lilac + mint", "#3a2c48", ["#a888e0", "#7ad0b0", "#f07aa0", "#e8d8ea"])],
        "types": [("poppins", "poppins", "dmmono"), ("fredoka", "nunito", "dmmono"), ("baloo", "nunito", "plexmono")],
        "textures": ["gradient"], "ornaments": ["memphis", "marker"],
        "motions": ["pop", "snappy", "drift", "zoom"], "photos": ["cutout", "polaroid", "glass"], "charts": ["pop", "flat"], "labels": ["bubble", "tag"],
        "headlines": ["accent", "sentence", "huge"], "boxes": ["card", "solid", "sticky"],
    },
    "cosmos": {
        "name": "Deep space", "blurb": "Deep space blue with stars, glowing words, white icons in blue rings.",
        "dark": True, "board": "#05081a",
        "art": "deep space: a dark blue field of stars and faint nebulae, glowing clean words, planets and spacecraft as white icons in blue rings, orbit lines, round photos zooming out of the dark",
        "grounds": [("space", "#070b22", 0.3), ("nebula", "#0c0a26", 0.3)],
        "inks": [("blue + white", "#eef0ff", ["#6aa0ff", "#f0c060", "#c080ff", "#2a3060"]), ("violet + amber", "#eef0ff", ["#b080ff", "#ffb04a", "#6aa0ff", "#2a3060"])],
        "types": [("exo", "exo", "spacemono"), ("orbitron", "sora", "sharetech"), ("michroma", "outfit", "spacemono")],
        "textures": ["stars"], "ornaments": ["mission", "neon"],
        "motions": ["zoom", "drift", "parallax", "pop"], "photos": ["glass", "full", "cutout"], "charts": ["glass", "dots", "flat"], "labels": ["mono", "lower"],
        "headlines": ["caps", "huge", "accent"], "boxes": ["glass", "bracket", "rule"],
    },
    "sports": {
        "name": "Sports energy", "blurb": "Navy with racing stripes, heavy words on orange blocks, vivid photo strips.",
        "dark": True, "board": "#0a1430",
        "art": "a sports broadcast: navy with diagonal racing stripes, heavy condensed words on orange blocks, scoreboards and stat bars, big stickers on orange bursts, vivid action photo strips",
        "grounds": [("navy", "#0e1a3a", 0.3), ("night field", "#0c1830", 0.3)],
        "inks": [("orange + white", "#f4f6fb", ["#ff7a1a", "#3ad06a", "#ffd23a", "#2a3a6a"]), ("orange + cyan", "#f4f6fb", ["#ff7a1a", "#3ac8f0", "#ffd23a", "#2a3a6a"])],
        "types": [("bebas", "oswald", "robotocond"), ("anton", "barlowcond", "dmmono"), ("teko", "oswald", "robotocond")],
        "textures": ["stripes"], "ornaments": ["arcade"],
        "motions": ["slide", "snappy", "zoom", "wipe"], "photos": ["full", "cutout", "bleed"], "charts": ["stacked", "flat", "pop"], "labels": ["lower", "tag"],
        "headlines": ["huge", "caps", "stepped"], "boxes": ["solid", "strip"],
    },
    "sunrise": {
        "name": "Sunrise", "blurb": "A warm sunrise glow, huge punch words, bouncy stickers on white circles.",
        "dark": False, "board": "#3a1a10",
        "art": "a motivational sunrise: a warm orange-pink glow rising behind the horizon, huge punchy words that land one by one, bouncy icons on white circles, warm photos zooming in",
        "grounds": [("dawn", "#fbe6d4", 0.3), ("peach", "#fde8da", 0.3)],
        "inks": [("sun + plum", "#3a1a10", ["#f06a3a", "#7a3a8a", "#f0b03a", "#f0c8b0"]), ("gold + rose", "#3a1a10", ["#e8a020", "#e04a6a", "#7a3a8a", "#f0c8b0"])],
        "types": [("anton", "outfit", "dmmono"), ("archivoblack", "poppins", "dmmono"), ("unbounded", "outfit", "plexmono")],
        "textures": ["sunrise"], "ornaments": ["deco", "neon"],
        "motions": ["pop", "zoom", "snappy", "drift"], "photos": ["full", "cutout", "glass"], "charts": ["pop", "flat"], "labels": ["lower", "bubble"],
        "headlines": ["huge", "stepped", "accent"], "boxes": ["solid", "card"],
    },
    "warroom": {
        "name": "War room", "blurb": "A dark navy war-room map with glowing borders, HUD corners, condensed headings.",
        "dark": True, "board": "#06101e",
        "art": "a strategy war room: a dark navy map table with glowing borders and grid, HUD corner brackets, condensed headings on colour blocks, unit markers and arrows, intel photos zooming in",
        "grounds": [("war table", "#0a1626", 0.4), ("ops room", "#0c1420", 0.4)],
        "inks": [("cyan + red", "#e6eef8", ["#3ad0f0", "#f04a3a", "#f0c040", "#2a4a6a"]), ("amber + cyan", "#e6eef8", ["#f0b030", "#3ad0f0", "#f04a3a", "#2a4a6a"])],
        "types": [("oswald", "rajdhani", "sharetech"), ("robotocond", "rajdhani", "jetbrains"), ("teko", "chakra", "sharetech")],
        "textures": ["hud"], "ornaments": ["mission", "technical"],
        "motions": ["wipe", "glitch", "zoom", "draw"], "photos": ["duotone", "glass", "mono"], "charts": ["outline", "glass", "flat"], "labels": ["mono", "tag"],
        "headlines": ["caps", "outline"], "boxes": ["bracket", "outline", "glass"],
    },
    "amphora": {
        "name": "Greek amphora", "blurb": "Greek-pottery orange and black, Greek-key bands, black silhouette figures.",
        "dark": False, "board": "#1a120c",
        "art": "ancient Greek pottery: terracotta orange and glossy black, Greek-key (meander) bands framing the page, black-figure silhouettes of people and objects, laurel wreaths, red stamps, carved capitals",
        "grounds": [("terracotta", "#d8834a", 0.6), ("clay", "#cf7a44", 0.6)],
        "inks": [("black + cream", "#160e08", ["#160e08", "#f3e2c4", "#8a2a1a", "#a8582e"]), ("black + red", "#160e08", ["#8a2a1a", "#160e08", "#f3e2c4", "#a8582e"])],
        "types": [("cinzel", "oswald", "alegreyasc"), ("marcellus", "oswald", "alegreyasc"), ("cinzel", "marcellus", "garamond")],
        "textures": ["greekkey"], "ornaments": ["deco", "seal"],
        "motions": ["wipe", "stamp", "drift", "draw"], "photos": ["duotone", "engraving", "cutout"], "charts": ["flat", "outline"], "labels": ["stamp", "italic"],
        "headlines": ["caps", "underline"], "boxes": ["rule", "solid", "bracket"],
    },
    "notebook": {
        "name": "Study notebook", "blurb": "A lined notebook page: handwriting, wavy underlines, line drawings in blue rings.",
        "dark": False, "board": "#1e2a44",
        "art": "a student's lined notebook: blue ruled lines and a red margin, handwritten notes, wavy underlines in blue pen, line drawings in blue rings, highlighter marks, typed-in key words",
        "grounds": [("notebook", "#fbfaf5", 0.3), ("old page", "#f6f2e6", 0.4)],
        "inks": [("blue pen", "#1e2a44", ["#2a5ad0", "#e0453a", "#f0c840", "#c8d4ea"]), ("black + green", "#1e2a44", ["#2a8a5a", "#2a5ad0", "#e0453a", "#c8d4ea"])],
        "types": [("caveat", "patrickhand", "courierprime"), ("kalam", "indieflower", "dmmono"), ("patrickhand", "nunito", "courierprime")],
        "textures": ["lined"], "ornaments": ["marker", "sketch"],
        "motions": ["draw", "typewriter", "brush", "pop"], "photos": ["polaroid", "torn", "cutout"], "charts": ["hand", "outline"], "labels": ["hand", "tag"],
        "headlines": ["underline", "sentence"], "boxes": ["rule", "sticky", "outline"],
    },
})
# ten more (2026-10-27): Indian and folk styles none of the others draw, and three made for geography and history
FAMILIES.update({
    "madhubani": {
        "name": "Madhubani", "blurb": "Mithila folk art: a fish-scale border, bold red and indigo, everything outlined twice.",
        "dark": False, "board": "#1a1410",
        "art": "a Madhubani (Mithila) painting: handmade paper inside a double-line border filled with fish scales, every shape outlined twice in black ink and filled with flat red, indigo, saffron and green, fish, peacocks, suns and trees as motifs, no empty space left unpatterned",
        "grounds": [("handmade paper", "#f1e2c0", 0.7), ("rice paper", "#ecdcb6", 0.7)],
        "inks": [("red + indigo", "#1a1410", ["#c8281e", "#2a3c9a", "#e8a21e", "#1f6a4a"]), ("saffron + green", "#1a1410", ["#e88a1e", "#1f6a4a", "#c8281e", "#2a3c9a"])],
        "types": [("baloo", "kalam", "courierprime"), ("marcellus", "kalam", "dmmono"), ("fraunces", "baloo", "courierprime")],
        "textures": ["madhubani"], "ornaments": ["sketch", "seal"],
        "motions": ["draw", "brush", "pop", "stamp"], "photos": ["cutout", "frame", "engraving"], "charts": ["hand", "flat"], "labels": ["hand", "stamp"],
        "headlines": ["caps", "underline"], "boxes": ["rule", "outline", "bracket"],
    },
    "mughal": {
        "name": "Mughal miniature", "blurb": "A miniature painting's gold and lapis frame, flat perspective, fine calligraphic titles.",
        "dark": False, "board": "#2a1a10",
        "art": "a Mughal miniature: an ivory page inside gold and lapis frames with a dotted floral band, flat tilted perspective, fine detailed figures, gold leaf on the key word, elegant serif titles like calligraphy, courts, gardens and maps of empire",
        "grounds": [("ivory", "#f2e8d0", 0.6), ("rose wash", "#f0e0d4", 0.6)],
        "inks": [("gold + lapis", "#2a1a10", ["#b8862a", "#1f3c8a", "#a8281e", "#2f6a4a"]), ("emerald + gold", "#2a1a10", ["#1f6a4a", "#b8862a", "#8a1f3a", "#c8b48a"])],
        "types": [("cinzel", "cormorant", "alegreyasc"), ("marcellus", "garamond", "alegreyasc"), ("playfair", "cormorant", "imfell")],
        "textures": ["mughal"], "ornaments": ["deco", "manuscript"],
        "motions": ["drift", "wipe", "draw", "zoom"], "photos": ["frame", "engraving", "duotone"], "charts": ["flat", "outline"], "labels": ["italic", "footnote"],
        "headlines": ["caps", "sentence"], "boxes": ["rule", "outline", "tab"],
    },
    "truckart": {
        "name": "Truck art", "blurb": "Indian truck art: a scalloped painted trim, loud red, green and pink, slogans in bold type.",
        "dark": False, "board": "#1a1020",
        "art": "Indian truck art from Punjab and the highways of north India: a painted scalloped trim with mirror dots along the edges, loud red, green, pink and blue, bold painted slogans, flowers, eyes and birds as motifs, chrome stripes, everything joyful and crowded",
        "grounds": [("cream", "#fbf1d8", 0.3), ("pink", "#fbe0ea", 0.3)],
        "inks": [("red + green", "#1a1020", ["#e0262e", "#16a05a", "#2a5ad8", "#f0a81e"]), ("magenta + teal", "#1a1020", ["#d81e8a", "#14a0a0", "#f0a81e", "#e0262e"])],
        "types": [("bungee", "baloo", "courierprime"), ("lobster", "rubik", "dmmono"), ("bangers", "baloo", "spacemono"), ("ultra", "baloo", "courierprime")],
        "textures": ["truckart"], "ornaments": ["memphis", "comic"],
        "motions": ["pop", "stamp", "snappy", "flip"], "photos": ["cutout", "frame", "polaroid"], "charts": ["pop", "flat"], "labels": ["bubble", "stamp"],
        "headlines": ["caps", "huge", "outline"], "boxes": ["solid", "card", "strip"],
    },
    "kolam": {
        "name": "Rangoli & kolam", "blurb": "White rice-flour loops round a dot grid on a dark floor, festive colours in the centre.",
        "dark": True, "board": "#1e0e0a",
        "art": "a kolam or rangoli on a dark floor: a grid of white rice-flour dots with lines looping round them, perfect symmetry, petals and lamps (diyas) in festive yellow, pink and blue powder colours, drawn line by line",
        "grounds": [("red oxide", "#5a2219", 0.4), ("slate floor", "#2a2a2e", 0.4)],
        "inks": [("white + marigold", "#f6efe0", ["#f0c040", "#f07a8a", "#7ad0e0", "#8a4a3a"]), ("white + saffron", "#f6efe0", ["#f6a03a", "#9ad06a", "#f07a8a", "#4a4a52"])],
        "types": [("comfortaa", "nunito", "dmmono"), ("josefin", "nunito", "dmmono"), ("baloo", "jost", "plexmono")],
        "textures": ["kolam"], "ornaments": ["sketch", "midcentury"],
        "motions": ["draw", "drift", "pop", "brush"], "photos": ["cutout", "frame", "mono"], "charts": ["dots", "hand"], "labels": ["hand", "tag"],
        "headlines": ["sentence", "accent"], "boxes": ["rule", "outline"],
    },
    "ncert": {
        "name": "School textbook", "blurb": "The Indian school textbook: a coloured chapter rule, labelled diagrams, boxed 'Do you know?' facts.",
        "dark": False, "board": "#1f3a6a",
        "art": "an Indian school textbook page (NCERT style): white paper with a coloured chapter rule and tab, clear labelled diagrams with numbered parts, 'Fig. 2.1' captions, boxed 'Do you know?' and 'Activity' facts, simple flat colour illustrations",
        "grounds": [("textbook", "#fdfcf7", 0.2), ("off white", "#f8f6ee", 0.3)],
        "inks": [("blue + red", "#1f2430", ["#1f6ad0", "#e0453a", "#2a9a5a", "#d0d8e8"]), ("orange + blue", "#1f2430", ["#d06a1e", "#1f6ad0", "#2a9a5a", "#e4dccc"])],
        "types": [("merriweather", "sourceserif", "plexmono"), ("bitter", "lato", "dmmono"), ("zillaslab", "sourcesans", "plexmono")],
        "textures": ["textbook"], "ornaments": ["technical", "doc"],
        "motions": ["draw", "wipe", "slide", "pop"], "photos": ["frame", "cutout", "full"], "charts": ["flat", "outline", "stacked"], "labels": ["footnote", "tag"],
        "headlines": ["sentence", "underline"], "boxes": ["rule", "tab", "card"],
    },
    "ukiyoe": {
        "name": "Ukiyo-e", "blurb": "A Japanese woodblock print: wave scales, flat indigo and vermilion, washi grain.",
        "dark": False, "board": "#1c2238",
        "art": "a Japanese ukiyo-e woodblock print: washi paper grain, flat areas of Prussian blue and vermilion with no shading, great curling waves with claw-like foam, seigaiha wave scales, a red seal in the corner, mountains and boats in outline",
        "grounds": [("washi", "#efe4cc", 0.7), ("pale indigo", "#e6e2d4", 0.7)],
        "inks": [("indigo + vermilion", "#1c2238", ["#2a4a8a", "#c8402a", "#e8b86a", "#8aa8c0"]), ("vermilion + pine", "#1c2238", ["#c8402a", "#2a4a8a", "#4a7a5a", "#d8c8a8"])],
        "types": [("shippori", "shippori", "yuji"), ("yuji", "cormorant", "dmmono"), ("cormorant", "shippori", "plexmono")],
        "textures": ["seigaiha"], "ornaments": ["seal", "gallery"],
        "motions": ["drift", "wipe", "brush", "parallax"], "photos": ["engraving", "duotone", "bleed"], "charts": ["flat", "brush"], "labels": ["italic", "stamp"],
        "headlines": ["sentence", "caps"], "boxes": ["rule", "strip", "bracket"],
    },
    "topographic": {
        "name": "Topographic survey", "blurb": "A survey sheet: contour lines, elevation colours, grid references and spot heights.",
        "dark": False, "board": "#2a2a20",
        "art": "a topographic survey sheet: wandering brown contour lines with every fifth one bold, hypsometric colours from green lowland to brown highland, a faint grid of eastings and northings, spot heights, blue rivers, condensed map lettering",
        "grounds": [("survey paper", "#f2eee0", 0.4), ("pale green", "#eef0e2", 0.4)],
        "inks": [("brown + green", "#2a2a20", ["#c0602a", "#3a7a4a", "#2a6a9a", "#d8c8a0"]), ("river blue", "#2a2a20", ["#2a6a9a", "#a8782a", "#3a7a4a", "#d8d0b0"])],
        "types": [("barlowcond", "worksans", "dmmono"), ("oswald", "sourcesans", "plexmono"), ("josefin", "lato", "spacemono")],
        "textures": ["contour"], "ornaments": ["atlas", "technical"],
        "motions": ["draw", "drift", "zoom", "wipe"], "photos": ["duotone", "frame", "mono"], "charts": ["outline", "dots", "flat"], "labels": ["mono", "footnote"],
        "headlines": ["caps", "underline"], "boxes": ["rule", "outline", "bracket"],
    },
    "satellite": {
        "name": "Satellite view", "blurb": "Earth from orbit: a graticule, false-colour data layers, coordinates on the frame.",
        "dark": True, "board": "#05090c",
        "art": "an earth-observation feed: the planet from orbit in false colour (vegetation green, heat orange, water blue), a latitude-longitude graticule, coordinate ticks on the frame edges, data layers sliding over the map, scan lines, monospaced readouts",
        "grounds": [("orbit", "#0a1218", 0.4), ("night earth", "#0c0f16", 0.4)],
        "inks": [("green + amber", "#e8f0f0", ["#3ae08a", "#f0a030", "#3aa0f0", "#2a3a40"]), ("thermal", "#e8f0f0", ["#f05a8a", "#3ae0d0", "#f0d040", "#2a3a40"])],
        "types": [("rajdhani", "inter", "sharetech"), ("michroma", "exo", "jetbrains"), ("chakra", "plexsans", "sharetech")],
        "textures": ["satellite"], "ornaments": ["mission", "technical"],
        "motions": ["zoom", "glitch", "wipe", "drift"], "photos": ["duotone", "glass", "full"], "charts": ["glass", "dots", "outline"], "labels": ["mono", "tag"],
        "headlines": ["caps", "outline"], "boxes": ["bracket", "glass", "outline"],
    },
    "stainedglass": {
        "name": "Stained glass", "blurb": "Lead lines round glowing panes of ruby, cobalt and gold, light coming through.",
        "dark": True, "board": "#0c0a10",
        "art": "a cathedral's stained-glass window: thick black lead lines round panes of ruby, cobalt, gold and emerald glass, light glowing through from behind, figures and symbols in flat glass shapes, gothic arches, fine serif or blackletter titles",
        "grounds": [("cathedral", "#14121c", 0.4), ("nave", "#18141a", 0.4)],
        "inks": [("ruby + cobalt", "#f4ecd8", ["#d8302a", "#2a5ad8", "#e8b830", "#2a9a5a"]), ("violet + gold", "#f4ecd8", ["#8a3ac8", "#e8b830", "#2a9ad8", "#d8302a"])],
        "types": [("cinzel", "garamond", "alegreyasc"), ("unifraktur", "garamond", "imfell"), ("medieval", "cormorant", "alegreyasc")],
        "textures": ["leaded"], "ornaments": ["deco", "manuscript"],
        "motions": ["drift", "zoom", "wipe", "draw"], "photos": ["frame", "duotone", "bleed"], "charts": ["flat", "glass"], "labels": ["italic", "stamp"],
        "headlines": ["caps", "sentence"], "boxes": ["outline", "solid", "rule"],
    },
    "papercut": {
        "name": "Papercut layers", "blurb": "Stacked cut-paper layers with real shadows between them, soft coral, teal and sun.",
        "dark": False, "board": "#22202a",
        "art": "a layered papercut scene: shapes cut from coloured card and stacked with soft shadows between the layers, rolling hills along the bottom, a paper sun, every object a flat cut-out lifted off the page, gentle parallax as layers move",
        "grounds": [("paper", "#f4efe6", 0.3), ("sky", "#e4eef4", 0.3)],
        "inks": [("coral + teal", "#22202a", ["#f07a4a", "#2a8a8a", "#f0c048", "#e8dcd0"]), ("cobalt + rose", "#22202a", ["#4a6ad8", "#f07a8a", "#7ac08a", "#dcdce8"])],
        "types": [("fredoka", "nunito", "dmmono"), ("syne", "outfit", "dmmono"), ("righteous", "poppins", "plexmono")],
        "textures": ["papercut"], "ornaments": ["memphis", "pins"],
        "motions": ["pop", "parallax", "slide", "drift"], "photos": ["cutout", "torn", "polaroid"], "charts": ["pop", "stacked", "flat"], "labels": ["tag", "bubble"],
        "headlines": ["sentence", "huge", "accent"], "boxes": ["card", "solid", "strip"],
    },
})
# the existing families' headline and box styles, and the extra motions they suit
for k, (heads, boxes, more) in {
    "paper": (["sentence", "accent", "caps", "stepped"], ["card", "rule", "solid"], ["parallax", "wipe"]),
    "newspaper": (["caps", "sentence", "underline"], ["rule", "outline", "tab"], ["wipe", "zoom"]),
    "swiss": (["huge", "caps", "stepped"], ["solid", "rule", "outline"], ["wipe", "flip"]),
    "blueprint": (["caps", "underline", "outline"], ["outline", "bracket", "tab"], ["wipe", "zoom"]),
    "chalkboard": (["underline", "sentence", "caps"], ["outline", "rule"], ["pop", "brush"]),
    "darktech": (["huge", "accent", "outline", "caps"], ["glass", "bracket", "outline"], ["glitch", "zoom", "wipe"]),
    "whiteboard": (["underline", "sentence", "accent"], ["sticky", "outline", "rule"], ["pop", "wipe"]),
    "collage": (["caps", "huge", "underline", "outline"], ["strip", "card", "solid"], ["pop", "parallax", "zoom"]),
    "kinetic": (["huge", "stepped", "outline", "accent"], ["solid", "rule"], ["wipe", "flip", "glitch"]),
    "isometric": (["sentence", "accent", "caps"], ["card", "tab", "outline"], ["pop", "zoom", "flip"]),
    "terminal": (["caps", "accent", "huge"], ["bracket", "outline"], ["glitch", "wipe"]),
    "bauhaus": (["caps", "huge", "stepped"], ["solid", "rule"], ["wipe", "flip", "pop"]),
    "comic": (["caps", "outline", "stepped"], ["solid", "outline", "card"], ["pop", "zoom", "wipe"]),
    "sketchbook": (["sentence", "underline", "accent"], ["sticky", "rule", "strip"], ["brush", "pop"]),
    "documentary": (["sentence", "caps", "huge"], ["rule", "solid", "bracket"], ["zoom", "wipe", "parallax"]),
    "dossier": (["caps", "underline", "accent"], ["card", "tab", "strip"], ["zoom", "flip"]),
}.items():
    FAMILIES[k]["headlines"], FAMILIES[k]["boxes"] = heads, boxes
    FAMILIES[k]["motions"] = FAMILIES[k]["motions"] + [m for m in more if m not in FAMILIES[k]["motions"]]
GROUPS = {  # the Plan page's category chips
    "Print": ["paper", "newspaper", "magazine", "encyclopedia", "zine", "woodcut", "patent", "manuscript", "receipt", "dossier", "scroll", "noir"],
    "Hand-drawn": ["chalkboard", "whiteboard", "sketchbook", "fieldjournal", "sumi", "pinboard", "bulletjournal", "notebook", "kraft", "cardboard"],
    "Screen & tech": ["satellite", "darktech", "terminal", "keynote", "marketdesk", "synthwave", "blueprint", "arcade", "y2k", "mission", "spreadsheet", "consulting", "clinic", "warroom", "cosmos", "sports"],
    "Photo-led": ["topographic", "documentary", "collage", "gallery", "contactsheet", "constructivist", "stencil", "vaporwave", "diorama", "atlas", "wildlife", "ocean"],
    "Indian & folk": ["madhubani", "mughal", "truckart", "kolam", "ncert"],
    "Poster & art": ["ukiyoe", "stainedglass", "papercut", "swiss", "bauhaus", "kinetic", "comic", "brutalist", "isometric", "flatvector", "artdeco", "memphis", "neubrutal", "clay", "midcentury", "transit", "travelposter", "canvas", "pastel", "sunrise", "amphora"],
}
for g, ks in GROUPS.items():
    for k in ks:
        FAMILIES[k]["group"] = g
LIBRARY_LOOK = {  # how the motion library's blocks are redrawn in each family (src/argon/lib/style.tsx): never their own cartoon style
    "print": ["paper", "newspaper", "zine", "woodcut", "constructivist", "bauhaus", "kinetic", "travelposter", "midcentury", "stencil",
              "magazine", "receipt", "dossier", "encyclopedia", "manuscript", "atlas", "contactsheet", "comic", "memphis", "transit", "scroll", "amphora", "kraft",
              "madhubani", "mughal", "truckart", "ncert", "ukiyoe"],
    "line": ["kolam", "topographic", "patent", "consulting", "swiss", "spreadsheet", "brutalist"],
    "paper": ["papercut", "collage", "diorama", "pinboard", "cardboard", "bulletjournal"],
    "sketch": ["sketchbook", "fieldjournal", "whiteboard", "notebook"], "vintage": ["noir"],
    "blueprint": ["blueprint", "chalkboard"], "watercolor": ["sumi", "canvas"],
    "neon": ["satellite", "darktech", "synthwave", "terminal", "mission", "marketdesk", "arcade", "warroom", "cosmos", "ocean", "sports"], "comic": ["neubrutal"],
    "clay": ["clay", "isometric", "flatvector", "y2k", "vaporwave", "pastel"],
    "shaded": ["documentary", "gallery", "keynote", "artdeco", "clinic", "wildlife", "sunrise", "stainedglass"],
}
for look, ks in LIBRARY_LOOK.items():
    for k in ks:
        FAMILIES[k]["lib"] = look
# THE PEN: how a shape is inked in each family (src/argon/pen.tsx draws it). Geometry is the drawing's; the ink is the
# look's, so one drawing (a person, a soop, a sun) comes out in every look. outline: single | double (ink, paper gap, ink)
# | none | tone (a darker edge of its own colour) | rough (a wobbly pencil) | chalk (dusty, broken) | carved (a gouged
# woodcut edge) | glow (neon) | cut (a paper cut-out: white edge and a lifted shadow); fill: flat | soft (lit from the top
# left) | wash (watercolour) | hatch (hatched lines) | none (line art); pattern on the fill: kachni (fine lines) | dots |
# gouge (white knife cuts) | scales | ""; w: the outline's width; wobble 0..1
PEN_OUTLINES = ("single", "double", "none", "tone", "rough", "chalk", "carved", "glow", "cut")
PEN_FILLS = ("flat", "soft", "wash", "hatch", "none")
PEN_PATTERNS = ("", "kachni", "dots", "gouge", "scales")
PEN_BY_LIB = {  # the default for each way the library is redrawn (LIBRARY_LOOK)
    "print": {"outline": "single", "w": 5, "fill": "flat", "pattern": ""},
    "line": {"outline": "single", "w": 3, "fill": "none", "pattern": ""},
    "paper": {"outline": "cut", "w": 4, "fill": "flat", "pattern": ""},
    "sketch": {"outline": "rough", "w": 3, "fill": "wash", "pattern": "", "wobble": 0.6},
    "vintage": {"outline": "single", "w": 4, "fill": "flat", "pattern": "dots"},
    "blueprint": {"outline": "chalk", "w": 4, "fill": "hatch", "pattern": ""},
    "watercolor": {"outline": "tone", "w": 3, "fill": "wash", "pattern": ""},
    "neon": {"outline": "glow", "w": 4, "fill": "none", "pattern": ""},
    "comic": {"outline": "single", "w": 8, "fill": "flat", "pattern": ""},
    "clay": {"outline": "none", "w": 0, "fill": "soft", "pattern": ""},
    "shaded": {"outline": "tone", "w": 2, "fill": "soft", "pattern": ""},
}
PEN_OWN = {  # families whose ink is their own
    "madhubani": {"outline": "double", "w": 7, "fill": "flat", "pattern": "kachni"},
    "mughal": {"outline": "single", "w": 2, "fill": "flat", "pattern": "dots"},
    "truckart": {"outline": "double", "w": 6, "fill": "flat", "pattern": "dots"},
    "kolam": {"outline": "chalk", "w": 5, "fill": "none", "pattern": ""},
    "ncert": {"outline": "single", "w": 3, "fill": "flat", "pattern": ""},
    "woodcut": {"outline": "carved", "w": 9, "fill": "flat", "pattern": "gouge"},
    "ukiyoe": {"outline": "tone", "w": 3, "fill": "flat", "pattern": ""},
    "sumi": {"outline": "rough", "w": 6, "fill": "wash", "pattern": "", "wobble": 0.4},
    "chalkboard": {"outline": "chalk", "w": 5, "fill": "hatch", "pattern": ""},
    "whiteboard": {"outline": "rough", "w": 5, "fill": "none", "pattern": "", "wobble": 0.3},
    "comic": {"outline": "single", "w": 8, "fill": "flat", "pattern": "dots"},
    "stainedglass": {"outline": "single", "w": 10, "fill": "soft", "pattern": ""},
    "amphora": {"outline": "none", "w": 0, "fill": "flat", "pattern": ""},
    "manuscript": {"outline": "single", "w": 3, "fill": "flat", "pattern": "dots"},
    "papercut": {"outline": "cut", "w": 5, "fill": "flat", "pattern": ""},
    "patent": {"outline": "single", "w": 2, "fill": "none", "pattern": "kachni"},
    "newspaper": {"outline": "single", "w": 3, "fill": "flat", "pattern": "dots"},
    "blueprint": {"outline": "single", "w": 3, "fill": "none", "pattern": ""},
}
PEN = {k: {"wobble": 0, **PEN_BY_LIB[f["lib"]], **PEN_OWN.get(k, {})} for k, f in FAMILIES.items()}


def pen_of(fam: str) -> dict:
    """the pen a family inks its shapes with (src/argon/pen.tsx)"""
    return dict(PEN.get(fam or "paper", PEN["paper"]))


QUIET = {"sumi", "patent", "receipt", "newspaper", "terminal", "blueprint", "chalkboard", "manuscript", "woodcut", "contactsheet"}  # few inks: blocks lean hard to them
for k, f in FAMILIES.items():
    f["tint"] = 0.85 if k in QUIET else 0.6
# more grounds for the families born with two or three: each from the family's own world, on its own side (light or
# dark) so its inks stay readable; the fibre (texture strength) is the family's first ground's
MORE_GROUNDS = {
    "madhubani": [("cow-dung plaster", "#d9b98a"), ("lime-wash white", "#f6f1e6"), ("turmeric wash", "#f3dc9a"), ("pale indigo wash", "#dfe3ee")],
    "mughal": [("gold leaf", "#ead9a6"), ("pale lapis", "#e2e6f0"), ("pistachio", "#e6ecd6")],
    "truckart": [("mint", "#e0f4e8"), ("sky", "#ddeefa"), ("marigold", "#fde2a6")],
    "kolam": [("wet earth", "#3a2a20"), ("night stone", "#1e1f24"), ("green floor", "#1f2b24")],
    "ncert": [("newsprint", "#f3efe2"), ("pale blue", "#f1f5fa"), ("old copy", "#f2e9d2")],
    "scroll": [("smoked parchment", "#dcc89c"), ("pale scroll", "#f2e8cc")],
    "canvas": [("primed white", "#f1ede4"), ("grey canvas", "#dcd8ce")],
    "bulletjournal": [("white page", "#fbfaf6"), ("sage page", "#eef1e6"), ("blush page", "#f6ebe6")],
    "kraft": [("dark kraft", "#b8956a"), ("grey kraft", "#c9b89c")],
    "cardboard": [("brown card", "#b88c5a"), ("grey board", "#c4b8a4")],
    "clinic": [("clean white", "#fafcfb"), ("pale blue", "#eef4f8"), ("soft grey", "#f1f3f2")],
    "wildlife": [("dusk savanna", "#2a2416"), ("deep jungle", "#0f2216"), ("night river", "#0f1e22")],
    "noir": [("ink black", "#0b0b0c"), ("rain grey", "#202326")],
    "ocean": [("lagoon", "#0a3440"), ("midnight sea", "#06182a")],
    "pastel": [("mint", "#eaf6f0"), ("lemon", "#faf6e2"), ("lilac", "#f1ecf8")],
    "cosmos": [("deep violet", "#120a2a"), ("black hole", "#050508")],
    "sports": [("stadium night", "#101a24"), ("dark pitch", "#0c2418")],
    "sunrise": [("golden hour", "#fde3c0"), ("rose dawn", "#fbe2e2")],
    "warroom": [("radar green", "#0a1a14"), ("steel night", "#11161c")],
    "amphora": [("ochre clay", "#d9944e"), ("sienna", "#c9703e")],
    "notebook": [("yellow pad", "#fbf3c8"), ("graph white", "#f7f9f7")],
    "ukiyoe": [("cherry", "#f3e2dc"), ("straw", "#efe2b8")],
    "topographic": [("pale sand", "#f3ead6"), ("pale blue", "#e8eef0")],
    "satellite": [("deep ocean", "#06121e"), ("dark land", "#11140e")],
    "stainedglass": [("crypt", "#0e0c12"), ("midnight blue", "#0e1222")],
    "papercut": [("peach", "#f8e6d8"), ("mint", "#e4f2ea")],
    "terminal": [("blue black", "#05080f")],
    "bauhaus": [("bauhaus yellow", "#f1d77a"), ("pale blue", "#dfe6ec")],
    "comic": [("pale blue", "#e0eef8"), ("pink", "#f9e0e6")],
    "sketchbook": [("toned tan", "#e6d7bc"), ("grey-blue", "#e2e6ea")],
    "documentary": [("charcoal", "#18191b"), ("olive black", "#121410")],
    "dossier": [("pink carbon", "#f0dcdc"), ("grey file", "#d9d6cc")],
    "pinboard": [("grey felt", "#bfb8ad"), ("green felt", "#a9b89a")],
    "synthwave": [("magenta night", "#1a0820"), ("teal night", "#06161c")],
    "marketdesk": [("deep green", "#06120c"), ("plum", "#100a12")],
    "sumi": [("white washi", "#f6f3ec"), ("tea stained", "#e6d9be")],
    "arcade": [("arcade green", "#06140a"), ("maroon night", "#1a0810")],
    "artdeco": [("burgundy", "#1c0a10"), ("onyx", "#121214")],
    "constructivist": [("grey card", "#d8d2c4"), ("pale red", "#ecd2c4")],
    "consulting": [("pale navy", "#eef1f7"), ("warm grey", "#f2f0ec")],
    "patent": [("blueprint white", "#eef2f4")],
    "manuscript": [("pale vellum", "#f3eacf")],
    "woodcut": [("rice", "#f2ecdc"), ("ochre", "#e3cfa0")],
    "stencil": [("pale wall", "#e0ddd6"), ("grey block", "#bdbab3")],
    "midcentury": [("pink paper", "#f0d8d0"), ("olive paper", "#dcdcb8")],
    "transit": [("pale yellow", "#f6f0d4"), ("pale blue", "#e8eef4")],
    "mission": [("deep teal", "#081416")],
    "receipt": [("pink slip", "#f7e8ea"), ("yellow slip", "#f8f3d8")],
    "spreadsheet": [("ledger blue", "#eef3fa"), ("cream", "#fbf8ef")],
    "contactsheet": [("cool grey", "#e4e6e8")],
    "atlas": [("pale green", "#e4eadb"), ("sand", "#efe2c4")],
}
for k, gs in MORE_GROUNDS.items():
    FAMILIES[k]["grounds"] = FAMILIES[k]["grounds"] + [(n, c, FAMILIES[k]["grounds"][0][2]) for n, c in gs]
# every surface (texture) the kit draws (src/print/kit.tsx Texture), each named as a creator would say it
TEXTURES = sorted({x for f in FAMILIES.values() for x in f["textures"]})
SURFACE_NAMES = {"dotgrid": "dot grid", "ricepaper": "rice paper", "benday": "Ben-Day dots", "hud": "HUD", "greekkey": "Greek key", "riso": "riso grain",
                 "offset": "offset print", "topo": "map contours", "contour": "survey contours", "leaded": "leaded glass", "seigaiha": "seigaiha waves",
                 "madhubani": "Madhubani hatch", "mughal": "Mughal gold", "truckart": "truck paint", "kolam": "kolam floor", "textbook": "textbook page",
                 "scanline": "scan lines", "corrugated": "corrugated card", "thermal": "thermal paper", "lined": "lined paper", "cells": "spreadsheet cells"}
# sets, materials, depths and shapes per family: the group's defaults, then the families that want their own
_BY_GROUP = {
    "Print": (["flat", "sunlit", "desk", "blobs"], ["ink", "paper", "stone"], ["flat", "raised"], ["sharp", "rounded", "torn", "tilted"]),
    "Hand-drawn": (["flat", "desk", "sunlit"], ["ink", "paper", "clay"], ["flat", "raised"], ["rounded", "tilted", "torn"]),
    "Screen & tech": (["flat", "studio", "wave"], ["glass", "metal", "ink"], ["flat", "raised", "iso"], ["rounded", "sharp", "notched", "pill"]),
    "Photo-led": (["flat", "sunlit", "arch", "studio"], ["ink", "paper", "glass", "stone"], ["flat", "raised"], ["sharp", "rounded", "tilted"]),
    "Indian & folk": (["flat", "desk", "sunlit"], ["ink", "paper"], ["flat", "raised"], ["sharp", "rounded", "tilted"]),
    "Poster & art": (["flat", "blobs", "wave", "sunlit"], ["ink", "clay", "paper", "stone"], ["flat", "raised", "iso"], ["sharp", "rounded", "pill", "notched", "ticket"]),
}
_OWN = {
    "terminal": (["flat"], ["ink", "glass"], ["flat", "iso"], ["sharp", "notched"]),
    "arcade": (["flat"], ["ink", "metal"], ["flat", "iso"], ["sharp", "notched"]),
    "receipt": (["flat", "desk"], ["ink", "paper"], ["flat"], ["ticket", "torn", "sharp"]),
    "spreadsheet": (["flat", "desk"], ["ink", "glass"], ["flat", "iso"], ["sharp", "rounded"]),
    "keynote": (["flat", "studio", "wave"], ["glass", "metal", "stone"], ["flat", "raised", "iso"], ["rounded", "pill"]),
    "sumi": (["flat", "sunlit", "arch"], ["ink", "stone", "paper"], ["flat", "raised"], ["sharp", "torn"]),
    "gallery": (["sunlit", "studio", "arch", "flat"], ["stone", "paper", "glass", "ink"], ["flat", "raised"], ["sharp", "rounded"]),
    "clay": (["flat", "blobs", "studio"], ["clay", "glass", "stone"], ["raised", "iso"], ["rounded", "pill"]),
    "isometric": (["flat", "blobs"], ["clay", "glass", "ink"], ["iso", "raised"], ["rounded", "sharp"]),
    "chalkboard": (["flat"], ["ink"], ["flat", "raised"], ["sharp", "rounded", "tilted"]),
    "whiteboard": (["flat", "sunlit"], ["ink", "paper"], ["flat", "raised"], ["rounded", "tilted"]),
    "blueprint": (["flat"], ["ink", "glass"], ["flat", "raised", "iso"], ["sharp", "notched"]),
    "darktech": (["flat", "studio", "wave"], ["glass", "metal", "ink"], ["flat", "raised", "iso"], ["rounded", "notched", "sharp"]),
    "manuscript": (["flat", "desk"], ["ink", "paper"], ["flat"], ["sharp", "torn"]),
    "consulting": (["flat", "blobs", "wave"], ["ink", "glass", "stone"], ["flat", "raised"], ["sharp", "rounded"]),
    "transit": (["flat", "blobs"], ["ink", "paper"], ["flat"], ["rounded", "pill", "sharp"]),  # a clean map page: no dark sets
}
# the 3D looks: thick pies, cube grids and glass or stone cards suit them; every other family keeps the classic print
# (a flat ink pie with a ruled legend, ink heat tiles, a hairline divider instead of a box), its first box being "rule"
DEEP = {"darktech", "keynote", "clay", "isometric", "y2k", "synthwave", "mission", "gallery", "artdeco", "vaporwave", "flatvector",
        "memphis", "neubrutal", "marketdesk", "spreadsheet", "arcade", "terminal", "blueprint"}
for k, f in FAMILIES.items():
    f["sets"], f["materials"], f["depths"], f["shapes"] = _OWN.get(k) or _BY_GROUP[f["group"]]
    if k in DEEP:  # 3D first (the preview card shows the first pick)
        f["depths"] = sorted(f["depths"], key=lambda x: x == "flat")
        f["materials"] = sorted(f["materials"], key=lambda x: x == "ink")
    else:
        f["depths"], f["materials"] = ["flat"], ["ink"] + [m for m in f["materials"] if m in ("paper",)]
        f["boxes"] = ["rule"] + [b for b in f["boxes"] if b != "rule"]
        f["sets"] = ["flat"] + [x for x in f["sets"] if x != "flat"]
    f["scales"] = ["hero", "pair", "cards"]
# the motion library's block groups (src/argon/lib/catalog.ts) a family may use: things and actors, never the library's
# own charts, texts and full-frame sets (the print kit draws those in the look); quiet looks leave out the loud groups
LIB_GROUPS = ["TECH", "FINANCE", "BODY and SCIENCE", "SCIENCE", "DOCUMENTS and NEWS", "DOCUMENTS", "DIAGRAMS", "MAPS",
              "MAPS that are not the world map", "SYMBOLS", "MATHS and EDUCATION", "SPORTS", "PEOPLE", "TIME", "SOCIAL MEDIA",
              "DEVICES and FRAMES", "OBJECTS", "CHARACTERS", "MEDIA", "COMPARISONS", "INDIAN LIFE", "VEHICLES and OBJECTS",
              "ELECTIONS", "ECONOMY", "SELF-HELP and PSYCHOLOGY", "CLIMATE and SPACE", "INDIA"]
LOUD = {"SOCIAL MEDIA", "CHARACTERS", "PEOPLE", "SPORTS", "SELF-HELP and PSYCHOLOGY", "INDIAN LIFE"}
for k, f in FAMILIES.items():
    f["blocks"] = [g for g in LIB_GROUPS if not (g in LOUD and (k in QUIET or k in {"artdeco", "consulting", "patent", "gallery"}))]
for f in FAMILIES.values():
    f["leads"] = [0, 1]   # which ink leads: as listed, or the second ink first
IDENTITY = ("ground", "inks", "types", "texture")   # the brand: kept from film to film
VARY = ("ornaments", "motion", "photo", "chart", "label", "headline", "box", "lead", "set", "material", "depth", "shape", "scale")  # varied per film
POOL = {"ground": "grounds", "inks": "inks", "types": "types", "texture": "textures", "ornaments": "ornaments", "motion": "motions",
        "photo": "photos", "chart": "charts", "label": "labels", "headline": "headlines", "box": "boxes", "lead": "leads",
        "set": "sets", "material": "materials", "depth": "depths", "shape": "shapes", "scale": "scales"}


def _load(path: str, empty):
    try:
        return json.load(open(path))
    except (OSError, ValueError):
        return empty


def check() -> list[str]:
    """every value a look can pick must be drawn by the code: motions (src/print/enter.tsx ENTER), sets and textures
    (kit.tsx <Set>, <Texture>), ornament packs (spread.tsx PACKS), materials and shapes (depth.tsx), fonts (kit.tsx
    FONTS), library looks (src/argon/lib/style.tsx LOOKS), and every described axis value. Empty list = all compatible.
    Run `python looks.py --check` after adding a look, a motion, a set, a box, anything."""
    import re
    src = lambda *p: open(os.path.join(HERE, "src", *p)).read()
    kit, spread, depth, enter, style = src("print", "kit.tsx"), src("print", "spread.tsx"), src("print", "depth.tsx"), src("print", "enter.tsx"), src("argon", "lib", "style.tsx")
    body = lambda s, start: s[s.index(start):s.index("\n};", s.index(start))]
    have = {
        "motions": set(re.findall(r"^  (\w+): \(", body(enter, "export const ENTER"), re.M)),
        "sets": set(re.findall(r'case "(\w+)"', body(kit, "const Set: React.FC"))) | {"flat"},
        "textures": set(re.findall(r'case "(\w+)"', body(kit, "const Texture: React.FC"))) | {"riso", "letterpress", "offset"},
        "ornaments": set(re.findall(r"^  (\w+): \[", body(spread, "const PACKS"), re.M)),
        "materials": set(re.findall(r'"(\w+)"', re.search(r"export const MATERIALS = \[(.*?)\]", depth).group(1))),
        "shapes": set(re.findall(r'"(\w+)"', re.search(r"export const SHAPES = \[(.*?)\]", depth).group(1))),
        "fonts": set(re.findall(r"^  (\w+): \{ family:", kit, re.M)),
        "lib": set(re.findall(r'"(\w+)"', re.search(r"export const LOOKS = \[(.*?)\]", style).group(1))),
    }
    described = {"motions": MOTION, "photos": PHOTO, "charts": CHART, "labels": LABEL, "headlines": HEADLINE, "boxes": BOX,
                 "sets": SET, "materials": MATERIAL, "depths": DEPTH, "shapes": SHAPE, "scales": SCALE}
    bad = []
    for k, f in FAMILIES.items():
        for axis, d in described.items():
            bad += [f"{k}: {axis} '{v}' has no description in looks.py" for v in f[axis] if v not in d]
        for axis in ("motions", "sets", "textures", "ornaments", "materials", "shapes"):
            bad += [f"{k}: {axis} '{v}' is not drawn by the code" for v in f[axis] if v not in have[axis]]
        bad += [f"{k}: font '{x}' is not in kit.tsx FONTS" for t in f["types"] for x in t if x not in have["fonts"]]
        groups = set(re.findall(r'"group": "([^"]+)"', src("argon", "lib", "catalog.ts")))
        bad += [f"{k}: library group '{g}' is not in src/argon/lib/catalog.ts" for g in f.get("blocks", []) if g not in groups]
        if f.get("lib") not in have["lib"]:
            bad.append(f"{k}: library look '{f.get('lib')}' is not in src/argon/lib/style.tsx LOOKS")
        for need in ("name", "blurb", "art", "group", "dark", "board"):
            if need not in f:
                bad.append(f"{k}: missing '{need}'")
    bad += [f"motion '{m}' is described but has no entrance in enter.tsx" for m in MOTION if m not in have["motions"]]
    bad += [f"set '{x}' is described but not drawn in kit.tsx <Set>" for x in SET if x not in have["sets"]]
    return bad


def combinations(fam: str) -> int:
    f = FAMILIES[fam]
    n = 1
    for k in POOL.values():
        n *= len(f[k])
    return n


def brand(fam: str, creator: str = "default", shuffle: bool = False) -> dict:
    """the creator's brand in this family: one pick on every identity axis, kept until they shuffle it"""
    brands = _load(BRANDS, {})
    key = f"{creator}:{fam}"
    if key not in brands or shuffle:
        f, rng = FAMILIES[fam], random.Random()
        old = brands.get(key)
        for _ in range(20):  # a shuffle lands on a different brand
            pick = {a: rng.randrange(len(f[POOL[a]])) for a in IDENTITY}
            if pick != old:
                break
        brands[key] = pick
        os.makedirs(os.path.dirname(BRANDS), exist_ok=True)
        json.dump(brands, open(BRANDS, "w"), indent=1)
    return brands[key]


def brand_name(fam: str, creator: str = "default") -> str:
    f, b = FAMILIES[fam], brand(fam, creator)
    return f"{f['grounds'][b['ground']][0]} · {f['inks'][b['inks']][0]} · {f['types'][b['types']][0]}/{f['types'][b['types']][1]} · {f['textures'][b['texture']]}"


def pick(slug: str, fam: str, title: str = "", creator: str = "default") -> dict:
    """the film's look: the creator's brand plus small axes varied so it differs from their recent films in two of
    them; the same slug always gets its look back"""
    hist = _load(HISTORY, [])
    for h in hist:
        if h.get("slug") == slug:
            return h["dna"]
    f, b = FAMILIES[fam], brand(fam, creator)
    recent = [h["vary"] for h in hist if h.get("family") == fam and h.get("creator") == creator][-10:]
    rng = random.Random(int(hashlib.sha1(slug.encode()).hexdigest(), 16))
    best, best_d = None, -1
    for _ in range(200):
        v = {a: rng.randrange(len(f[POOL[a]])) for a in VARY}
        d = min([sum(v[a] != r.get(a) for a in VARY) for r in recent] or [len(VARY)])
        if d > best_d:
            best, best_d = v, d
        if d >= 2:
            break
    dna = _dna(fam, b, best, title, rng.randrange(1000))
    os.makedirs(os.path.dirname(HISTORY), exist_ok=True)
    json.dump(hist + [{"slug": slug, "family": fam, "creator": creator, "vary": best, "dna": dna}], open(HISTORY, "w"), indent=1)
    return dna


def reroll(slug: str, creator: str = "default") -> dict:
    """a new pick on the film's varied axes (the creator pressed Re-roll look before the film is written): it differs
    from the film's current look in at least three of them; the brand stays"""
    hist = _load(HISTORY, [])
    h = next((h for h in hist if h.get("slug") == slug), None)
    if not h:
        raise KeyError(slug)
    fam, rng = h["family"], random.Random()
    f, b = FAMILIES[fam], brand(fam, creator)
    for _ in range(200):
        v = {a: rng.randrange(len(f[POOL[a]])) for a in VARY}
        if sum(v[a] != h["vary"].get(a) for a in VARY) >= 3:
            break
    h["vary"], h["dna"] = v, _dna(fam, b, v, h["dna"].get("issue", ""), rng.randrange(1000))
    json.dump(hist, open(HISTORY, "w"), indent=1)
    return h["dna"]


def summary(dna: dict) -> str:
    """the film's look in one line for the creator: family, headline, boxes, motion"""
    f = FAMILIES.get(dna.get("family") or "", {})
    bits = [f.get("name", ""), dna.get("headline") and f"{dna['headline']} headlines", dna.get("box") and f"{dna['box']} boxes",
            dna.get("motion") and f"{dna['motion']} motion", dna.get("set") and f"{dna['set']} set", dna.get("material") and f"{dna['material']} {dna.get('depth', '')}",
            dna.get("shape") and f"{dna['shape']} cards", dna.get("photo") and f"{dna['photo']} photos", dna.get("chart") and f"{dna['chart']} charts"]
    return " · ".join(b for b in bits if b)


def menu() -> str:
    """every family in one line each, for Gemini to choose the look that suits a topic (look 'auto')"""
    return "\n".join(f"- {k}: {f['name']}: {f['blurb']}" for k, f in FAMILIES.items())


def _dna(fam: str, b: dict, v: dict, title: str, seed: int) -> dict:
    f = FAMILIES[fam]
    g, ink, ty = f["grounds"][b["ground"]], f["inks"][b["inks"]], f["types"][b["types"]]
    texture = f["textures"][b["texture"]]
    inks = ink[2][1::-1] + ink[2][2:] if f["leads"][v["lead"]] else ink[2]   # lead 1: the second ink leads this film
    dna = {"family": fam, "dark": f["dark"], "paper": g[1], "fibre": g[2], "ink": ink[1], "inks": inks, "display": ty[0], "body": ty[1], "mono": ty[2],
           "layout": "open", "texture": texture, "ornaments": f["ornaments"][v["ornaments"]],
           "grain": {"riso": 0.6, "letterpress": 0.75, "offset": 0.2, "halftone": 0.35, "photocopy": 0.5}.get(texture, 0.3),
           "misreg": {"riso": 2 + seed % 3, "letterpress": 1}.get(texture, 0), "issue": title[:40],
           "board": f["board"], "boardInk": ink[1] if f["dark"] else g[1],
           "motion": f["motions"][v["motion"]], "photo": f["photos"][v["photo"]], "chart": f["charts"][v["chart"]], "label": f["labels"][v["label"]],
           "headline": f["headlines"][v["headline"]], "box": f["boxes"][v["box"]], "lib": f["lib"], "tint": f["tint"],
           "set": f["sets"][v["set"]], "material": f["materials"][v["material"]], "depth": f["depths"][v["depth"]],
           "shape": f["shapes"][v["shape"]], "scale": f["scales"][v["scale"]],
           "pen": pen_of(fam), "name": f"{f['name']}: {g[0]} · {ink[0]} · {ty[0]}/{ty[1]} · {texture}"}
    return dna


WORLDS = {  # a culture's own look: its people, dress, places and things (used whenever a film is set in that world)
    "madhubani": "Mithila, north Bihar: women in a red, yellow or green saree with a broad contrasting border, sindoor in the parting, "
                 "a big bindi, bangles and a nose ring; men in a white dhoti and kurta with a red-checked gamchha on the shoulder, "
                 "elders in a paag (the Mithila cap); faces in profile with a large fish-shaped eye; mud houses with painted walls, "
                 "ponds with fish and lotus, the river ghat, banana and bamboo groves; bamboo soop and daura, clay diyas, kalash",
    "mughal": "the Mughal court: nobles in a flared jama with a patka sash and a turban with a jewelled sarpech and pearls; women in "
              "peshwaz and dupatta; soldiers with shields and talwars; caparisoned elephants; marble arches, jharokhas, charbagh gardens",
    "truckart": "the Punjabi highway: Sikh and Punjabi drivers in a pagg or patka, kurta-pyjama and a kada; dhabas with charpais and "
                "tea in glasses; a painted truck with 'Horn OK Please', mudflaps, nazar-battu charms, marigold garlands",
    "kolam": "a Tamil home at dawn: women in silk or cotton sarees with Kanchipuram borders, jasmine in braided hair; men in a white "
             "veshti and angavastram; the kolam at the threshold, brass kuthuvilakku lamps, banana leaves, gopurams, Pongal pots",
    "ncert": "today's India as a textbook draws it: students in school uniform, teachers in a saree or shirt and trousers, flat colours",
    "ukiyoe": "Edo Japan: kimono with obi, hakama, straw hats and geta; fishermen and samurai; wooden houses, bridges, Fuji, boats",
    "sumi": "East Asian ink painting: scholars in robes, fishermen in straw capes; mountains, bamboo, pines and mist",
    "amphora": "ancient Greece: chiton and himation, hoplites with round shields and crested helmets, as black figures in profile",
    "manuscript": "medieval Europe: monks in habits, kings in crowns and robes, knights, castles and cloisters",
}


def world(fam: str) -> str:
    """how this look shows people and places: every look draws them in its own art, dressed true to the topic's place;
    a culture's own look also brings its home world"""
    f = FAMILIES[fam or "paper"]
    out = (f"PEOPLE AND PLACES: draw every person, place and thing in this look's own art ({f['name']}), never anime, photoreal "
           "or a generic cartoon; dress people true to the topic's own place, time and culture.")
    if fam in WORLDS:
        out += (f"\nTHIS LOOK'S HOME WORLD (use it whenever the film is set there): {WORLDS[fam]}. When a person must wear "
                "this dress, which the <Person> avatars cannot (no saree, dhoti, turban, kimono), draw them once as a NEW PIECE "
                "in this look's art and reuse it in every scene they appear in.")
    return out


def art_direction(dna: dict) -> str:
    """the film's look in words for Gemini: the family's art direction and this film's pick on every axis"""
    f = FAMILIES[dna.get("family") or "paper"]
    return (f"THIS FILM'S LOOK: {f['name']}: {f['art']}.\n"
            f"- ground: {'a DARK ground' if dna.get('dark') else 'a light ground'} {dna['paper']}; key ink {dna['ink']}; colour inks {', '.join(dna['inks'])} (first = loud, last = quiet); "
            f"panels set into the page are {dna.get('board')} with type in {dna.get('boardInk')}\n"
            f"- texture: {dna.get('texture')} (the player adds it to the ground)\n"
            f"- motion personality: {MOTION.get(dna.get('motion', ''), '')}\n"
            f"- photos: {PHOTO.get(dna.get('photo', ''), '')}\n"
            f"- charts: {CHART.get(dna.get('chart', ''), '')}\n"
            f"- labels: {LABEL.get(dna.get('label', ''), '')}\n"
            f"- headlines: {HEADLINE.get(dna.get('headline', ''), '')}\n"
            f"- text boxes: {BOX.get(dna.get('box', ''), '')}\n"
            f"- the set: {SET.get(dna.get('set', ''), '')} (the player draws it behind every scene: leave it visible, never cover it with a full-frame fill)\n"
            f"- material: 3D charts and panels are {MATERIAL.get(dna.get('material', ''), '')}; depth: {DEPTH.get(dna.get('depth', ''), '')} (<Pie3D>, <CubeGrid>, <Panel> do this by themselves)\n"
            f"- cards and panels are {SHAPE.get(dna.get('shape', ''), '')}; composition: {SCALE.get(dna.get('scale', ''), '')}\n"
            f"- ornaments: the {dna.get('ornaments')} pack (<Ornaments> draws it in free corners)"
            + (f"\n- the creator pinned this film's card design ({dna['card']}): write <Card> WITHOUT a design prop, the kit uses it" if dna.get("card") else "")
            + (f"\n- the creator pinned this film's entrance ({dna['enter']}): leave motion props off <Card> and <Motion> entrances, the kit uses it" if dna.get("enter") else "")
            + "\n" + world(dna.get("family") or "paper"))


def options(creator: str = "default") -> list[dict]:
    from look_showcase import SHOWCASE
    clips = os.path.join(os.path.dirname(HERE), "frontend", "public", "looks")
    clip = lambda k: f"/looks/{k}-show.mp4" if os.path.exists(os.path.join(clips, f"{k}-show.mp4")) else f"/looks/{k}.mp4"  # its showcase, once rendered
    return [{"id": k, "name": f["name"], "blurb": f["blurb"], "group": f["group"], "preview": f"/looks/{k}.jpg", "clip": clip(k),
             "brand": brand_name(k, creator), "combinations": combinations(k), "art": f["art"], "dark": f["dark"], "use": SHOWCASE.get(k, {}).get("use", "")}
            for k, f in FAMILIES.items()]


# ---- the look studio (Plan page step 2): the creator sees the look live and may pin its colours, fonts, box and motion
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def fonts() -> dict[str, str]:
    """every font the print kit loads (src/print/kit.tsx FONTS): key -> its name"""
    return dict(re.findall(r'^  (\w+): \{ family: "([^"]+)"', open(os.path.join(HERE, "src", "print", "kit.tsx")).read(), re.M))


TRANSITIONS = ["cut", "fade", "slide", "zoom", "wipe", "page", "fold", "rise"]  # src/argon/film.tsx TRANSITIONS


def kit_parts() -> dict:
    """the card designs and entrance motions the library draws, read from its TypeScript so the studio can never offer
    one it does not: card = shape.frame.fill.head (src/argon/lib/cards.tsx, 1,536), entrance = enter.kind[.dir].ease
    (src/argon/lib/motion-d.tsx: a travelling kind takes a direction, a kind in place does not)"""
    src = lambda *p: open(os.path.join(HERE, "src", "argon", "lib", *p)).read()
    cards, md = src("cards.tsx"), src("motion-d.tsx")
    arr = lambda name: re.findall(r'"(\w+)"', re.search(rf"export const {name} = \[(.*?)\] as const", cards).group(1))
    keys = lambda name: re.findall(r"^  (\w+): ", md[md.index(f"const {name}"):md.index("\n};", md.index(f"const {name}"))], re.M)
    dirs = re.findall(r"(\w+): \[", re.search(r"const DIRS[^\n]*", md).group(0))
    return {"shapes": arr("CARD_SHAPES"), "frames": arr("CARD_FRAMES"), "fills": arr("CARD_FILLS"), "heads": arr("CARD_HEADS"),
            "travel": keys("TRAVEL"), "place": keys("PLACE"), "dirs": dirs, "eases": keys("EASES")}


def _light(c: str) -> float:
    """relative luminance (WCAG) of a #rrggbb colour"""
    ch = [int(c[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    ch = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in ch]
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]


def contrast(a: str, b: str) -> float:
    la, lb = sorted((_light(a), _light(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def studio(fam: str, creator: str = "default") -> dict:
    """what the studio offers in one family: its own palettes, grounds and font pairings first, then every other family's
    on the same side (light or dark), so a colour or font from anywhere can be tried; every box and motion, its own first"""
    f, names = FAMILIES[fam], fonts()
    same = [g for g in FAMILIES.values() if g["dark"] == f["dark"]]
    seen, palettes, grounds, types = set(), [], [], []
    for g in [f] + [g for g in same if g is not f]:
        for name, ink, inks in g["inks"]:
            if (ink, tuple(inks)) not in seen:
                seen.add((ink, tuple(inks)))
                palettes.append({"name": name, "from": g["name"], "own": g is f, "ink": ink, "inks": inks})
        for name, paper, fibre in g["grounds"]:
            if paper not in seen:
                seen.add(paper)
                grounds.append({"name": name, "from": g["name"], "own": g is f, "paper": paper, "fibre": fibre})
    for g in [f] + [g for g in FAMILIES.values() if g is not f]:
        for ty in g["types"]:
            if ty not in seen:
                seen.add(ty)
                types.append({"display": ty[0], "body": ty[1], "mono": ty[2], "own": g is f, "from": g["name"],
                              "label": f"{names.get(ty[0], ty[0])} / {names.get(ty[1], ty[1])}"})
    textures = [{"id": x, "name": SURFACE_NAMES.get(x, x), "own": x in f["textures"]} for x in f["textures"] + [x for x in TEXTURES if x not in f["textures"]]]
    return {"family": fam, "name": f["name"], "dna": preview_dna(fam, creator), "palettes": palettes, "grounds": grounds, "textures": textures, "types": types,
            # every box and motion the code draws; the family's own first, marked, since they are what suit it
            "boxes": [{"id": b, "about": BOX[b], "own": b in f["boxes"]} for b in f["boxes"] + [b for b in BOX if b not in f["boxes"]]],
            "motions": [{"id": m, "about": MOTION[m], "own": m in f["motions"]} for m in f["motions"] + [m for m in MOTION if m not in f["motions"]]],
            "fonts": names, "parts": kit_parts(), "transitions": TRANSITIONS}


def clean_pin(fam: str, pin: dict) -> dict:
    """keep only what the code can draw: colours as #rrggbb, fonts the kit loads, boxes and motions the kit draws"""
    if fam not in FAMILIES or not isinstance(pin, dict):
        return {}
    f, ok = FAMILIES[fam], set(fonts())
    out: dict = {}
    for k in ("paper", "ink"):
        if isinstance(pin.get(k), str) and HEX.match(pin[k]):
            out[k] = pin[k].lower()
    inks = pin.get("inks")
    if isinstance(inks, list) and 2 <= len(inks) <= 4 and all(isinstance(c, str) and HEX.match(c) for c in inks):
        out["inks"] = [c.lower() for c in inks]
    for k in ("display", "body", "mono"):
        if pin.get(k) in ok:
            out[k] = pin[k]
    if pin.get("box") in BOX:  # any box and motion the code draws (looks.py check keeps BOX and MOTION drawn)
        out["box"] = pin["box"]
    if pin.get("motion") in MOTION:
        out["motion"] = pin["motion"]
    if pin.get("texture") in TEXTURES:  # the ground's surface: any the kit draws
        out["texture"] = pin["texture"]
    k = kit_parts()
    card = str(pin.get("card", "")).split(".")
    if len(card) == 4 and card[0] in k["shapes"] and card[1] in k["frames"] and card[2] in k["fills"] and card[3] in k["heads"]:
        out["card"] = pin["card"]
    enter = str(pin.get("enter", "")).split(".")
    if enter[0] == "enter" and ((len(enter) == 4 and enter[1] in k["travel"] and enter[2] in k["dirs"] and enter[3] in k["eases"])
                                or (len(enter) == 3 and enter[1] in k["place"] and enter[2] in k["eases"])):
        out["enter"] = pin["enter"]
    tr = pin.get("transitions")
    if isinstance(tr, list) and tr and all(x in TRANSITIONS for x in tr):
        out["transitions"] = list(dict.fromkeys(tr))
    return out


def apply_pin(dna: dict, pin: dict) -> dict:
    """the film's look with the creator's pins laid over it: a pinned ground decides light or dark, the panels follow"""
    if not pin:
        return dna
    d = {**dna, **{k: v for k, v in pin.items()}}
    if "paper" in pin:
        d["dark"] = _light(pin["paper"]) < 0.18
        d["boardInk"] = d["ink"] if d["dark"] else d["paper"]
    if "inks" in pin and len(d["inks"]) < 4:
        d["inks"] = (d["inks"] + dna["inks"])[:4]
    f = FAMILIES.get(d.get("family") or "", {})
    d["name"] = f"{f.get('name', '')}: your colours · {d['display']}/{d['body']}" if {"paper", "ink", "inks"} & set(pin) else d.get("name", "")
    d["pinned"] = sorted(pin)
    return d


def preview_dna(fam: str, creator: str = "default") -> dict:
    """the creator's brand in a family, with the family's first pick on the small axes, for the Plan page preview (not
    recorded as a film)"""
    f, b = FAMILIES[fam], brand(fam, creator)
    g, ink, ty, tex = f["grounds"][b["ground"]], f["inks"][b["inks"]], f["types"][b["types"]], f["textures"][b["texture"]]
    return {"family": fam, "dark": f["dark"], "paper": g[1], "fibre": g[2], "ink": ink[1], "inks": ink[2], "display": ty[0], "body": ty[1], "mono": ty[2],
            "layout": "open", "texture": tex, "ornaments": f["ornaments"][0], "grain": 0.5 if tex in ("riso", "letterpress") else 0.3,
            "misreg": 2 if tex == "riso" else 0, "issue": "", "board": f["board"], "boardInk": ink[1] if f["dark"] else g[1],
            "box": f["boxes"][0], "lib": f["lib"], "tint": f["tint"], "set": f["sets"][0],
            "material": f["materials"][0], "depth": f["depths"][0], "shape": f["shapes"][0], "scale": "pair",
            "motion": f["motions"][0], "pen": pen_of(fam)}


if __name__ == "__main__":  # python looks.py --check
    import sys
    if "--check" in sys.argv:
        bad = check()
        print("\n".join(bad) if bad else f"All {len(FAMILIES)} looks are compatible: every value they can pick is drawn by the code "
              f"({sum(combinations(k) for k in FAMILIES):,} looks).")
        sys.exit(1 if bad else 0)
