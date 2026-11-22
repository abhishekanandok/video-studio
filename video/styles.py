"""Motion styles for the Argon agent (video/argon.py): one STYLE is one visual language (paper cut-out, Vox collage,
documentary 2.5D...). A film is made in one style, and inside that style it gets its own DNA (material, set, palette,
light, camera, motion personality, transitions) picked so that no two films share one: two creators making the same
style must never look alike. Used DNAs are kept in public/argon/_dna.json.

Each style says how its pictures are made (one PLATE per scene: the scene's whole set, plus a few CUT-OUTS of the things
that move, all generated in the same look), how its scenes move (the kit pieces it uses), and what its review checks."""

import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
USED = os.path.join(HERE, "public", "argon", "_dna.json")

STYLES: dict[str, dict] = {
    "paper": {
        "name": "Paper cut-out", "pictures": "draw", "backdrop": "plate",
        "demo": "A short story: a boy goes back to school after a 10-day holiday; his mother waves goodbye, he meets his best friend on the way and they run in together",
        "blurb": "Card, paper and cardboard sets: a card sun, a paper sea, cards that fall and float, cut-out people that walk.",
        "dna": {
            "material": ["kraft paper and corrugated cardboard", "smooth matte coloured card stock", "tissue paper and vellum in translucent layers",
                         "felt and fabric cut-outs with stitched edges", "newsprint and old book pages", "craft foam and construction paper",
                         "watercolour paper painted by hand"],
            "set": ["a pop-up book whose pages fold up into the scene", "a tabletop diorama of stacked paper planes", "a shadow-puppet theatre lit from behind",
                    "a scrapbook page with tape, staples and stitched edges", "a toy theatre stage with a proscenium and side wings",
                    "a layered paper lightbox with deep stacked depth"],
            "palette": ["warm terracotta, mustard and teal", "pastel mint, blush and butter yellow", "deep navy, gold and cream",
                        "forest greens with a single red accent", "monochrome kraft brown with one cobalt accent", "sunset coral, plum and peach",
                        "ink black, bone white and a signal orange"],
            "light": ["soft window daylight with long soft shadows", "a single warm desk lamp with strong cast shadows", "glowing backlight through the paper",
                      "cool overcast light with gentle shadows"],
            "camera": ["a locked-off front view like a stage", "a slow push into the diorama", "a top-down tabletop view", "a gentle sideways dolly past the layers"],
            "motion": ["floaty zero-gravity drift", "bouncy springy landings", "hinged swings and pivots like split-pin puppets", "smooth gliding slides along slots"],
            "transition": ["page", "fold", "rise", "slide"],
        },
        "plate": ("{what}. Built as {set}, made of {material}. Colour palette: {palette}. Lighting: {light}. Seen as {camera}. "
                  "A real handmade paper-craft set photographed: visible paper texture and fibres, cut and torn edges, real cast shadows "
                  "between the layers, shallow depth of field. Leave calm open space in the middle for moving cut-outs. No text, no letters, no people unless asked."),
        "cutout": ("a single paper cut-out made of {material}, colours from {palette}, visible paper texture and cleanly cut edges, "
                   "flat like a real piece of card"),
        "best_for": "stories: history moments, journeys, folk tales and myths, biographies, origin stories, festivals and their legends",
        "plan": """THE STYLE: PAPER CUT-OUT, a storytelling medium. Tell the topic as a STORY told on a paper stage: who, where, what
happened, what changed. Use its strengths: PEOPLE as jointed paper puppets that walk, gesture and meet (a character is
an asset, kind draw, described as a full-body paper puppet in profile); a JOURNEY as a puppet walking a paper road past
layered paper villages and fields; a PLACE revealed as a pop-up book page or a pop-up map; an EMOTIONAL beat (a
decision, a confrontation, a gift, a loss) as silhouette shadow-play: black paper figures against a backlit colour
that shifts with the mood; a CROWD as rows of small paper figures popping up. Keep one hero puppet the same across scenes. List the story's people in `characters` (1-4), each with how they look;
they become jointed puppets the scenes can make walk, run, wave and meet.
Every scene is a handmade paper or cardboard set ("plate", the backdrop: kind paint) with 1-3
CUT-OUTS on it (assets: kind draw) for the things that MOVE: a card sun, paper clouds, a strip of paper sea,
raindrops, a cut-out person. The plate is the world; the cut-outs act in it. Describe in `concept` how each cut-out
moves in paper terms: it falls and bounces, floats in zero gravity, swings on a hinge, pops up from the floor, walks
like a puppet, slides along a slot, rises from behind the set. Keep the THIS FILM'S DNA (below) in every scene.""",
        "code": """STYLE: PAPER CUT-OUT (the scene is a handmade paper set; things are cut-outs that move like real card)
- The story's CHARACTERS are jointed puppets (listed in the brief): <Puppet rig={RIGS.name} y={ground} height={...}
  from={x0} to={x1} at={s.at("word")} dur={seconds} then="wave" />, pose "walk" | "run" | "stand" | "wave" | "cheer";
  face={-1} to face left. Put several characters on the set and let them move to each other, meet, wave. Their feet
  stand on the set's floor line; size them to the set (a child smaller than an adult).
- EVERY appearance of a story character, in EVERY scene, is its <Puppet> (never a sticker, never on a stick, never just a
  head): it is how the audience recognises them. Main characters stand 38-55% of the frame height, feet ON the set's
  floor line (the y where the floor meets the back wall in the plate), a child about 3/4 of an adult.
- People move like people: they walk to a place (from -> to, 2-4 s, then "stand" or "wave"), stop, face each other
  (face={-1}), wave or cheer on the word; two characters walking together walk side by side with `delay` 0.3 apart.
  Never teleport, never slide without walking, never float.
- Objects move like real things: they fall and settle (<Drop>), sway a little in the air (<Loop kind="sway">), swing on a
  hinge, roll; nothing glides in a straight line at a constant speed. Buildings, trees, fences and furniture stand
  UPRIGHT on the floor line and do not move (unless the story moves them).
- Other figures (a crowd, an animal) are paper cut-outs: <Walk> them along the set, turn them to face each other,
  <Hinge> an arm-like gesture (the whole puppet tilting toward the other), <Drop>/<PopUp> crowds of small figures in
  staggered rows. A shadow-play beat: dark backlit ground (scrim) and the puppets as black silhouettes (<Paper silhouette>).
- The plate is <Stage backdrop={s.asset(<the backdrop>)} push={0.03}>: the set itself. Do not cover it.
- Every cut-out goes in <Paper src=... w=... lift=...> (real cast shadow). Never put anything on a visible stick or rod.
- Motion comes from the paper pieces, chosen by the film's motion personality: <Drop> (falls, bounces), <ZeroG> (floats),
  <Hinge> (swings in on a pivot), <PopUp> (folds up from the floor), <Walk> (a puppet walking from A to B), <Travel>
  (slides along a path), <Loop kind="sway"> for idle. Things arrive on their words (s.at).
- Real-world motion stays papery: rain = several small paper raindrop cut-outs dropping (<Drop> with staggered `at`),
  vapour = small paper wisps rising (<ZeroG> drifting upward), water = a paper strip gently sliding left-right.
- Labels: small hand-cut paper tags (a light card label with a thin string line to the thing), 1-3 words.
- No flat vector shapes, no glows, no digital gradients: everything should look like paper on a set.""",
        "review": ("It must look like a handmade paper/cardboard set with cut-outs casting real shadows. Every story character is its jointed "
                   "<Puppet>, big enough to read (38-55% of the frame), feet on the floor line, moving like a person (walking to a place, "
                   "turning, waving); objects move like real things (fall and settle, sway), buildings and furniture stand upright."),
    },
    "papercollage": {
        "name": "Paper collage + cut-out", "pictures": "photo", "backdrop": "none",
        "length": "12-16 short spoken lines, 75-110 seconds in all",
        "demo": "How a 10 rupee coin travels: from the mint to your pocket, a chai stall, a bank and back",
        "blurb": "Paper cut-outs and collage scraps on one calm paper ground: torn photos with tape, card puppets, and the motion library doing the work.",
        "best_for": "explainers that move fast: how things work, money, everyday science, short stories",
        "dna": {
            "ground": ["warm cream card", "pale kraft paper", "soft sky-blue sugar paper", "off-white newsprint", "dusty pink card", "sage green card"],
            "motif": ["one big torn-paper sun low on the right", "one soft torn paper hill along the bottom", "one wide strip of washi tape across the top corner",
                      "one big torn circle of a darker paper behind the middle", "two overlapping torn paper clouds high on the left", "one hand-cut paper moon"],
            "scraps": ["old newspaper clippings", "graph paper and receipts", "brown kraft and masking tape", "glossy magazine cut-outs"],
            "palette": ["terracotta, mustard and teal", "navy, coral and cream", "forest green, ochre and one red", "plum, peach and ink black"],
            "motion": ["slap-in landings with a little shake", "floaty paper drift", "hinged swings like split pins", "sliding paper strips"],
            "transition": ["slide", "page", "wipe", "cut"],
        },
        "cutout": "a single paper cut-out of the thing, colours from {palette}, visible card texture and cleanly cut edges, flat like a real piece of card, on a plain white background",
        "plan": """THE STYLE: PAPER COLLAGE + CUT-OUT. Two paper crafts in one film: COLLAGE (real photos as torn scraps with tape, halftone,
newspaper clippings) and CUT-OUT (card shapes and jointed paper puppets that walk and gesture). The BACKGROUND IS CALM: the
same plain paper ground in every scene with the film's ONE motif (THIS FILM'S DNA); never a busy painted world. Every
backdrop is kind plain. The scene's life comes from the pieces on it and how they move.
PICTURES (assets): real things the line names are real photos (kind photo: they become torn collage scraps); at most
ONE drawn cut-out (kind draw) per scene; anything simple (a coin, an arrow, a chart, a sun, a box, a phone, a map) is
NOT an asset: it is drawn by a LIBRARY block or motion. Characters (0-2) become jointed puppets.
SHOW THE LIBRARY: across the film use as many different LIBRARY motions and blocks as you can; never the same main
motion twice in a row, and give each scene its own one.""",
        "code": """STYLE: PAPER COLLAGE + CUT-OUT (this overrides THE WORLD and LOOK rules above)
- THE GROUND: <Stage> with the theme's ground (no backdrop image), then the film's ONE motif from THIS FILM'S DNA drawn
  once, calmly, behind everything (a <Torn> scrap of darker paper, a torn circle, a strip of tape...). Nothing else in
  the background. Finish with <Grain paper />.
- COLLAGE: real photos land as <Torn> scraps (an <Img> inside, tape on top) with <Halftone> over the photo; hand-drawn
  <Arrow>/<DrawPath> between them; <MarkerCircle> on what matters.
- CUT-OUT: drawn cut-outs go in <Paper src=... lift=...> (a real cast shadow); characters are their <Puppet>; card
  pieces move like card: <Drop>, <Hinge>, <PopUp>, <ZeroG>, <Walk>, <Loop kind="sway">.
- THE LIBRARY does the motion: pick the motions and blocks the beat's concept names. Put a block on a card: inside a
  <Torn> scrap, or with style={{ filter: "drop-shadow(0 6px 0 rgb(0 0 0/0.18))" }} on its wrapper so it sits on the paper.
- Labels are small paper tags (1-3 words) with a thin line to the thing. No glows, no digital gradients.""",
        "review": ("THE STYLE overrides the real-world rules above: here it must look like paper collage and cut-outs on ONE calm paper ground "
                   "with its single motif (a plain background is right, not a fault). Photos are torn taped scraps, cut-outs cast a shadow, "
                   "puppets walk and gesture, and the scene's motion comes from the library pieces."),
    },
    "documentary": {
        "name": "Documentary 2.5D", "pictures": "photo", "backdrop": "photo",
        "blurb": "Real photographs brought to life: split into depth layers, a slow camera push, film grain, marker circles on what matters.",
        "best_for": "true events, history, people, places, science that happened in the real world",
        "demo": "The final 13 minutes of the 1969 Moon landing: how Apollo 11 almost ran out of fuel",
        "dna": {
            "grade": ["warm faded Kodachrome", "cool archival blue-grey", "high-contrast black and white with one colour accent", "sun-bleached 1970s print"],
            "texture": ["fine 16mm film grain", "dusty archive scan with scratches", "paper photo print with soft edges", "clean digital with light grain"],
            "accent": ["safety orange marker", "signal red marker", "electric yellow highlighter", "white chalk pen"],
            "camera": ["slow push into the subject", "slow lateral drift across the layers", "slow pull back to reveal", "gentle tilt up"],
            "labels": ["typewriter tags", "hand-written marker notes", "clean sans caption bars", "stencil labels"],
            "transition": ["fade", "zoom", "cut", "wipe"],
        },
        "plate": "{what}. A real documentary photograph, {grade}, {texture}, natural light, true scale. No text, no logos.",
        "cutout": "a real photograph of the object only, {grade}, isolated on a plain white background",
        "plan": """THE STYLE: DOCUMENTARY 2.5D. Real photographs carry the film: each scene is one real photo of the moment (backdrop kind
photo, a precise search) or, when none exists, a realistic reconstruction; 1-2 real photo cut-outs of people or objects
(assets kind photo). Tell it like a documentary: who, when, the stakes, the turn, the outcome.""",
        "code": """STYLE: DOCUMENTARY 2.5D
- The backdrop photo moves slowly the whole scene: <KenBurns src=... from to> (subtle: 1.05 -> 1.18) or <Parallax> with the
  cut-outs as nearer layers. Real photos of people/objects as <Cutout> (white border, tilt) or full frame.
- Point at what matters: <MarkerCircle> around it on its word, a short label in the film's label style, an <Arrow>.
- Finish with <Grain> and a soft <Vignette strength={0.4}>. No cartoons, no flat shapes, no particles unless real (dust in light).""",
        "review": "It must look like a real documentary: real photos moving slowly with depth, labels pointing at real things, film texture.",
    },
    "collage": {
        "name": "Collage (Vox)", "pictures": "photo", "backdrop": "plate",
        "blurb": "Torn paper, tape, halftone dots, newspaper clippings and cut-out photos slapped onto bold colour, the Vox explainer look.",
        "best_for": "news, politics, economics, money, social issues, 'why does X happen'",
        "demo": "Why onion prices in India keep spiking every few years",
        "dna": {
            "ground": ["bold tomato red", "deep cobalt blue", "mustard yellow", "mint green", "off-white newsprint", "black with cream scraps"],
            "paper": ["old newspaper clippings", "graph paper scraps", "brown kraft and masking tape", "glossy magazine cut-outs", "receipt and ticket stubs"],
            "photo_treatment": ["black-and-white halftone photos", "duotone photos in the ground colour", "full-colour photos with white cut edges"],
            "type": ["big cut-out ransom-note letters", "condensed bold headlines on tape strips", "stamped stencil words"],
            "motion": ["fast slaps and shakes", "sliding paper strips", "smooth drifting layers"],
            "transition": ["slide", "wipe", "cut", "zoom"],
        },
        "plate": "{what}. A flat collage background: {ground} ground with {paper}, torn edges and a little tape, seen straight on, printed texture and halftone dots. Leave the middle open. No text, no letters.",
        "cutout": "a cut-out photograph of the thing, {photo_treatment}, with a rough white paper edge, isolated on a plain white background",
        "plan": """THE STYLE: COLLAGE (Vox). Each scene is a bold coloured collage board (backdrop: kind paint, the board) with 1-3 real photo
cut-outs (assets kind photo) of the people, places and things the line names. Explain cause and effect: what happens,
why, who pays. Numbers only when the line says them, shown as big cut-out figures.""",
        "code": """STYLE: COLLAGE (Vox)
- The board is the backdrop (Stage backdrop). Photos land as <Torn> scraps (children: an <Img> of the photo) that slap in with
  tape; arrows hand-drawn (<Arrow>/<DrawPath>) between causes and effects; <MarkerCircle> on what matters.
- One word or number per scene may be a big cut-out headline on tape (only a label, never the narration).
- Add <Halftone> over the photos and <Grain paper> last.""",
        "review": "It must look like a Vox paper collage: torn scraps with tape, halftone photos, bold colour, hand-drawn arrows.",
    },
    "map": {
        "name": "Map (Johnny Harris)", "pictures": "photo", "backdrop": "plate",
        "blurb": "Textured maps the camera flies over: borders and routes drawing on, pins dropping on places, film grain.",
        "best_for": "geography, trade routes, wars and borders, migrations, 'why is X where it is'",
        "demo": "How the Ever Given got stuck in the Suez Canal in 2021 and held up world trade",
        "dna": {
            "map_look": ["vintage paper atlas with sepia ink", "dark satellite night view with glowing coasts", "clean modern relief map in muted greens", "hand-painted watercolour map"],
            "route": ["glowing red line", "dashed white line", "thick yellow marker line", "animated dotted ant trail"],
            "texture": ["coffee-stained paper", "fine film grain", "folded paper creases", "clean"],
            "labels": ["typewriter tags", "bold condensed caps", "hand-lettered marker"],
            "transition": ["zoom", "fade", "slide"],
        },
        "plate": "{what}. A map seen from above, {map_look}, {texture}, accurate coastlines, rivers and borders, no labels, no text, no letters.",
        "cutout": "a real photograph of the object, isolated on a plain white background",
        "plan": """THE STYLE: MAP. Every scene is a map of the place the line is about (backdrop kind paint: describe the exact region, e.g.
'the Red Sea, the Suez Canal and the Mediterranean'), zoomed for the moment; things happen ON the map: a route draws, a
pin drops on a place, an area lights up. 0-2 real photo cut-outs (a ship, a person) to show what is there. Geography must be accurate.""",
        "code": """STYLE: MAP
- The map is the backdrop and the camera moves over it: <KenBurns> zooming into the place the line names (focus x, y on it).
- Routes draw with <DrawPath> (then <FlowPath> along them for movement); places get <MapPin label="..."> on their word; a ship
  or truck <Travel>s along the route. Real photos as small <Cutout>s near their place.
- <Grain> last. Labels are place names only.""",
        "review": "It must look like a real map the camera flies over, with routes and pins on the right places, nothing abstract.",
    },
    "anime": {
        "name": "Anime painted", "pictures": "draw", "backdrop": "plate",
        "blurb": "Hand-painted anime worlds with soft natural light: rain, wind, water and light moving in every scene.",
        "best_for": "nature, seasons, weather, emotional or calm stories, science of the natural world",
        "demo": "The day the monsoon reaches Kerala",
        "dna": {
            "palette": ["summer blues and greens", "golden hour oranges", "rainy grey-teal", "dusk purples and pinks", "lush emerald and white cloud"],
            "brush": ["detailed painted clouds and light rays", "soft watercolour washes", "crisp cel-shaded shapes with painted backgrounds"],
            "weather": ["bright clear sky", "gathering storm", "light rain", "after-rain glow"],
            "camera": ["slow pan across the landscape", "slow push toward the horizon", "low angle looking up at the sky"],
            "transition": ["fade", "slide", "zoom"],
        },
        "plate": "{what}. A hand-painted anime film background, {brush}, palette {palette}, {weather}, soft natural light, rich detail, cinematic composition. No text.",
        "cutout": "a hand-painted anime illustration of the subject, palette {palette}, soft natural light, isolated on a plain white background",
        "plan": """THE STYLE: ANIME PAINTED. Every scene is a painted anime world (backdrop kind paint) and the weather, water and light
MOVE in it; 0-2 painted cut-outs (a person, an animal, a boat). Calm, sensory, true to nature.""",
        "code": """STYLE: ANIME PAINTED
- The painting fills the screen and drifts (<KenBurns>); nature moves in it: <Particles kind="rain"|"mist"|"dust">, <Water>,
  <Sun> with rays at the real angle, clouds as painted cut-outs drifting (<Loop kind="float">). Characters as <Sticker>s
  that move a little. <Grain opacity={0.06}> last. No flat shapes.""",
        "review": "It must look like a painted anime film frame with nature moving in it (rain, light, water, wind).",
    },
    "horror": {
        "name": "Horror / mystery", "pictures": "photo", "backdrop": "plate",
        "blurb": "Dark, desaturated, grainy and slow: flickering light, a vignette that closes in, evidence photos with red marker.",
        "best_for": "mysteries, unexplained events, true crime (told with care), legends and ghost stories",
        "demo": "The Mary Celeste: the ship found sailing with no one aboard",
        "dna": {
            "grade": ["desaturated green-grey", "cold blue night", "sepia with crushed blacks", "black and white with red accents"],
            "texture": ["heavy film grain and dust", "VHS tape noise", "damp stained paper", "old photo emulsion cracks"],
            "light": ["a single flickering lamp", "moonlight through fog", "a torch beam in the dark"],
            "motion": ["very slow push-ins", "sudden still frames", "slow drift with stutters"],
            "transition": ["fade", "cut"],
        },
        "plate": "{what}. A dark atmospheric scene, {grade}, {texture}, lit by {light}, deep shadows, eerie and quiet, realistic. No text, no gore.",
        "cutout": "an old evidence photograph of the object, {grade}, isolated on a plain white background",
        "plan": """THE STYLE: HORROR / MYSTERY. Tell it as a mystery: the strange fact first, the facts as found, the theories, what is still
unknown. Every scene is a dark atmospheric frame (backdrop kind paint) with 0-2 evidence photo cut-outs (assets kind photo).
Never gore; dread comes from darkness, silence and what is missing.""",
        "code": """STYLE: HORROR / MYSTERY
- Very slow <KenBurns> push into the dark frame; evidence photos as <Cutout> pinned at a tilt; <MarkerCircle color="#c1121f">
  on the detail that matters; labels like typed case notes.
- Atmosphere over everything: <Particles kind="mist"> or "dust", then <Flicker>, <Vignette strength={0.85} close={0.6}>,
  <Grain opacity={0.2}>. Slow and quiet; one sudden change at most.""",
        "review": "It must feel dark and eerie: desaturated, grainy, flickering, slow push-ins, evidence-style photos, no gore.",
    },
    "kinetic": {
        "name": "Kinetic typography", "pictures": "draw", "backdrop": "plate",
        "blurb": "The words are the picture: big type that builds, slams, stretches and moves with the voice.",
        "best_for": "ideas, advice, quotes, lists, motivation, short punchy facts",
        "demo": "Why getting 1% better every day makes you 37 times better in a year",
        "dna": {
            "type": ["huge condensed sans caps", "elegant serif with italics", "rounded friendly sans", "brutalist mono"],
            "palette": ["black on acid yellow", "cream on deep green", "white on ink with a pink accent", "red on off-white"],
            "motion": ["words slam in on the beat", "words slide and stack", "words scale and stretch", "letters drop one by one"],
            "ground": ["flat colour with a subtle paper grain", "a soft gradient", "a grid of thin lines"],
            "transition": ["cut", "slide", "zoom"],
        },
        "plate": "A minimal background for big typography: {ground}, palette {palette}. Nothing else, no text.",
        "cutout": "a small simple icon of the thing, flat, palette {palette}, isolated on a plain white background",
        "plan": """THE STYLE: KINETIC TYPOGRAPHY. The narration's key words ARE the visuals: each scene builds 2-6 words of its line in big moving
type, with at most one small supporting icon. Pick the words that carry the idea (numbers, verbs, the punchline).""",
        "code": """STYLE: KINETIC TYPOGRAPHY (this style overrides the TEXT rule: the words of the line are the picture)
- Build the key words of the line with <Words sync mark=[...]> and your own big type: each word arrives exactly on its
  spoken time (s.at), in the film's type and palette; move them (slam, slide, stack, stretch) and re-arrange as the line goes.
- Never more than 6 big words on screen; the rest of the line stays in the captions. One small icon at most (<Sticker>).""",
        "review": "The words must be the visual: big, readable, moving on the voice, never a static block of text.",
    },
    "whiteboard": {
        "name": "Whiteboard", "pictures": "draw", "backdrop": "plate",
        "blurb": "A hand draws the idea on a whiteboard as it is explained: line drawings appearing stroke by stroke.",
        "best_for": "step-by-step how-tos, processes, school topics, simple science and civics",
        "demo": "How a vaccine trains your immune system",
        "dna": {
            "board": ["a clean white whiteboard", "a cream paper sketchbook page", "a dark green chalkboard", "graph paper"],
            "ink": ["black marker with one blue accent", "black marker with one red accent", "white chalk with yellow accents", "blue ballpoint"],
            "hand": ["marker in a hand", "just the marker", "no hand"],
            "transition": ["slide", "wipe", "fade"],
        },
        "plate": "{board}, empty, seen straight on, even light. No text, no drawings.",
        "cutout": "a simple hand-drawn line drawing of the subject in {ink}, doodle style, clean lines, isolated on a plain white background",
        "plan": """THE STYLE: WHITEBOARD. Each scene draws the idea step by step on the board (backdrop kind paint: the board) with 1-3 line
drawings (assets kind draw: simple doodles of each thing) connected by drawn arrows, like a teacher explaining.""",
        "code": """STYLE: WHITEBOARD
- The board is the backdrop. Each drawing appears with <Sketch src=... at={s.at(word)}> (drawn by hand), arrows draw with
  <DrawPath>/<Arrow> in the ink colour, short labels in a hand font (theme font caveat or permanent_marker).
- Nothing slides or floats: things are DRAWN, in order of the explanation; earlier drawings stay.""",
        "review": "It must look like a hand drawing the explanation on a board, step by step, in line drawings.",
    },
    "isometric": {
        "name": "Isometric", "pictures": "draw", "backdrop": "plate",
        "blurb": "Clean isometric worlds that open up: buildings, machines and systems seen at 30 degrees, parts popping up and data travelling.",
        "best_for": "how technology and systems work inside: payments, the internet, factories, cities, supply chains",
        "demo": "How UPI moves your money in two seconds",
        "dna": {
            "palette": ["soft pastel blues and corals", "dark mode navy with neon accents", "warm sand and terracotta", "mint and lilac"],
            "detail": ["clean flat isometric", "isometric with soft shadows and texture", "low-poly isometric 3D look"],
            "motion": ["pieces pop up from the floor", "pieces drop in from above", "pieces slide in on rails"],
            "transition": ["zoom", "slide", "fade"],
        },
        "plate": "{what}. An isometric illustration seen at 30 degrees, {detail}, palette {palette}, clean and readable, plenty of floor space. No text.",
        "cutout": "an isometric illustration of the object at 30 degrees, {detail}, palette {palette}, isolated on a plain white background",
        "plan": """THE STYLE: ISOMETRIC. Show the system as an isometric world (backdrop kind paint: the base world) with 1-3 isometric pieces
(assets kind draw: the phone, the bank, the server...) and data or goods travelling between them.""",
        "code": """STYLE: ISOMETRIC
- Pieces appear with <PopUp> or <Drop> on their words, sitting on the isometric floor; things travel between them along
  isometric paths (<Travel> / <FlowPath> with 30-degree lines); short labels as tags on the pieces.""",
        "review": "It must look like a clean isometric illustration with pieces appearing and things travelling between them.",
    },
}


# Each look as the one-shot writer draws it IN CODE (video/oneshot.py: one file, no images, no kit pieces). The look is
# the skin; what moves comes from the storyboard. A film can mix looks ("whiteboard+map"): each scene names its look.
DRAWN: dict[str, str] = {
    "paper": "PAPER CUT-OUT: everything is layered card: flat fills, a soft cast shadow under each layer, slightly irregular "
             "cut edges, fold lines, hinges and pop-ups that open; people are card puppets on split pins.",
    "papercollage": "PAPER COLLAGE + CUT-OUT: one plain paper ground; torn paper scraps with tape and a halftone texture, "
                    "card cut-outs and puppets on top; marker circles and arrows drawn by hand.",
    "documentary": "DOCUMENTARY 2.5D: layered planes with depth (far, middle, near) that drift apart slowly as the camera "
                   "pushes in; muted, filmic colour with a vignette and grain; a calm, serious pace.",
    "collage": "COLLAGE (VOX): grid or newsprint ground; torn scraps, sticky notes, red string joining things, highlighter "
               "marks, circled numbers; pieces land with a little bounce, on the word that names them.",
    "map": "MAP (JOHNNY HARRIS): a drawn map is the ground (coastlines, rivers, borders as simple paths, paper texture); the "
           "camera flies between places; routes draw on as dashed lines, pins drop, regions fill with colour.",
    "anime": "ANIME PAINTED: soft painted gradients for sky and light, bold clean outlines on people and objects, glowing "
             "highlights, speed lines on fast moves, gentle floating particles.",
    "horror": "HORROR / MYSTERY: near-black ground, one cold light source, fog drawn as soft drifting gradients, slow "
              "creeping camera, things revealed by light; red only for the one thing that matters.",
    "kinetic": "KINETIC TYPOGRAPHY: the key words of the line are the objects: huge type that slams, stacks, stretches, is "
               "crossed out and pushed aside, each word on its spoken time; at most one small icon.",
    "whiteboard": "WHITEBOARD: a white board ground; every drawing is DRAWN stroke by stroke (SVG paths revealed with "
                  "strokeDashoffset) in marker ink with one accent colour, in the order of the explanation; earlier "
                  "drawings stay; arrows draw between them; labels in a hand-written font.",
    "isometric": "ISOMETRIC: the world seen at 30 degrees: floor tiles, boxes and machines drawn with three visible faces "
                 "(top light, sides darker); pieces pop up from the floor on their words; things travel between them "
                 "along 30-degree paths.",
}


# Each look's grounds (the one surface every scene of a film is drawn on). A film gets ONE of them, picked for it, so two
# films in the same style do not look alike and no film falls back to grid paper because the model liked it best.
GROUNDS: dict[str, list[str]] = {
    "paper": ["sky-blue card with a cut-paper sun", "warm kraft card", "pastel layered paper hills", "deep navy card at night"],
    "papercollage": ["plain cream paper with soft fibres", "pale pink sugar paper", "recycled grey card"],
    "documentary": ["deep charcoal with a soft vignette and film grain", "warm sepia haze", "cool blue-grey dusk gradient"],
    "collage": ["newsprint with faint columns", "cork board", "pale yellow legal pad", "off-white grid paper"],
    "map": ["aged parchment with faint contour lines", "dark blue-green relief map", "clean modern pale map with a blue sea"],
    "anime": ["painted dawn sky gradient", "soft purple dusk sky", "bright noon sky with painted clouds"],
    "horror": ["near-black with drifting fog", "cold blue moonlit dark", "dark green murk"],
    "kinetic": ["flat acid yellow", "flat deep green", "ink black", "off-white with paper grain"],
    "whiteboard": ["clean white board", "dark green chalkboard", "cream sketchbook page", "blue graph paper"],
    "isometric": ["soft pastel floor tiles", "dark navy floor with a neon grid", "warm sand floor"],
    "": ["clean off-white", "deep navy", "warm kraft card", "soft sky gradient", "dark dot-grid", "newsprint"],
}


def pick_ground(style: str, seed: str) -> str:
    """the film's ground: one of its first look's grounds, picked from the film's slug (the same film keeps it)"""
    first = (style or "").split("+")[0]
    options = GROUNDS.get(first) or GROUNDS[""]
    return random.Random(seed).choice(options)


def drawn(style: str) -> dict[str, str]:
    """the film's looks in code, from a style id or a mix ("whiteboard+map"); unknown ids are dropped"""
    return {k: DRAWN[k] for k in (style or "").split("+") if k in DRAWN}


def options() -> list[dict]:
    return [{"id": k, "name": v["name"], "blurb": v["blurb"], "best_for": v.get("best_for", ""), "demo": v.get("demo", "")} for k, v in STYLES.items()]


def pick_dna(style: str, seed: str = "") -> dict:
    """A DNA for a new film in this style that no film has used yet (its core, the first three axes, is new)."""
    st = STYLES[style]
    axes = list(st["dna"])[:3]  # the first three axes are the style's core look: that combination is never reused
    used = json.load(open(USED)) if os.path.exists(USED) else []
    cores = {tuple(u.get(k) for k in axes) for u in used if u.get("style") == style}
    rng = random.Random(seed or None)
    for _ in range(500):
        dna = {k: rng.choice(v) for k, v in st["dna"].items()}
        if tuple(dna[k] for k in axes) not in cores:
            return dna
    return {k: rng.choice(v) for k, v in st["dna"].items()}


def remember(style: str, slug: str, dna: dict) -> None:
    used = json.load(open(USED)) if os.path.exists(USED) else []
    used = [u for u in used if u.get("slug") != slug] + [{"style": style, "slug": slug, **dna}]
    os.makedirs(os.path.dirname(USED), exist_ok=True)
    json.dump(used, open(USED, "w"), indent=1)


def dna_text(dna: dict) -> str:
    return "; ".join(f"{k}: {v}" for k, v in dna.items())
