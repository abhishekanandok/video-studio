/* written by video/catalog.py from the library's own code: do not edit by hand, run `python catalog.py` instead.
   Every motion (layer 1) and block (layer 2) with its group, what it does and the props it takes; layer 0 is style.
   catalogText() is the short form for the agent's prompt. */

/** parts: the pieces of a block that can be swapped (parts={{ name: picture | node | (item, i, original) => node | null }}, or <Swap parts={{ "Block.name": … }}> from outside); "all" is the whole drawing, "background" a set's backdrop */
export type LibEntry = { layer: 0 | 1 | 2; file: string; name: string; group: string; does: string; props: string; parts: string[] };
export const LIBRARY: LibEntry[] = [
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Move",
  "group": "<Move>",
  "does": "moves anything inside it in one of the MOVES kinds (enter, physics, emphasis), from `at`; `out` plays an entrance backwards to leave",
  "props": "kind: MoveKind, at?: number, dur?: number, amount?: number, seed?: number, out?: number, origin?: string, children: ReactNode, style?: CSSProperties",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Assemble",
  "group": "pieces",
  "does": "many pieces fly in and lock together into the picture",
  "props": "w: number, h: number, at?: number, dur?: number, cols?: number, rows?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Scatter",
  "group": "pieces",
  "does": "the picture breaks into pieces that blow away in every direction and fade (an exit)",
  "props": "w: number, h: number, at?: number, dur?: number, cols?: number, rows?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Shatter",
  "group": "pieces",
  "does": "it breaks like glass or a plate: the pieces burst a little, then fall under gravity and spin",
  "props": "w: number, h: number, at?: number, cols?: number, rows?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Pour",
  "group": "more physics",
  "does": "liquid pours from above into a glass and fills it, with a moving surface",
  "props": "x: number, y: number, w?: number, h?: number, at?: number, dur?: number, level?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Ripple",
  "group": "more physics",
  "does": "rings spread out over water from a point, again and again",
  "props": "x: number, y: number, at?: number, size?: number, color?: string, every?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Smoke",
  "group": "more physics",
  "does": "soft puffs that rise, spread, drift and fade (smoke, steam)",
  "props": "x: number, y: number, at?: number, count?: number, color?: string, rise?: number, size?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Collide",
  "group": "more physics",
  "does": "one thing slides into another and hands over its push (like billiard balls or dominoes)",
  "props": "y: number, at?: number, a: ReactNode, b: ReactNode, gap?: number, size?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Along",
  "group": "travel",
  "does": "moves its child along a smooth path through points; it can turn to face the way it goes",
  "props": "points: Pt[], at?: number, dur?: number, loop?: boolean, turn?: boolean, lag?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "FlyArc",
  "group": "travel",
  "does": "flies in an arc from one point to another (a ball thrown, a plane hop), turning along the curve, with a dotted trail",
  "props": "from: Pt, to: Pt, height?: number, at?: number, dur?: number, trail?: boolean, color?: string, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Orbit",
  "group": "travel",
  "does": "goes round a centre on a tilted ellipse, bigger in front and smaller behind",
  "props": "cx: number, cy: number, rx?: number, ry?: number, period?: number, at?: number, phase?: number, children: ReactNode, ring?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Route",
  "group": "travel",
  "does": "a road or route is drawn, and a marker travels it just behind the line (a journey, a delivery, a march)",
  "props": "points: Pt[], at?: number, dur?: number, color?: string, width?: number, marker?: ReactNode, dashed?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Conveyor",
  "group": "travel",
  "does": "a belt that carries things along, again and again (a factory line, a supply chain)",
  "props": "x: number, y: number, w?: number, speed?: number, items: ReactNode[], at?: number, gap?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Chase",
  "group": "travel",
  "does": "one thing runs along a path and another follows close behind (a chase, a predator and prey)",
  "props": "points: Pt[], at?: number, dur?: number, lead: ReactNode, follow: ReactNode, lag?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "CircleIt",
  "group": "emphasis that draws over things",
  "does": "a marker circle drawn round something, by hand (slightly off, overlapping at the end)",
  "props": "x: number, y: number, w: number, h: number, at?: number, dur?: number, color?: string, width?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Underline",
  "group": "emphasis that draws over things",
  "does": "a hand-drawn wavy underline under a word",
  "props": "x: number, y: number, w: number, at?: number, dur?: number, color?: string, width?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Highlight",
  "group": "emphasis that draws over things",
  "does": "a highlighter pen sweeps across behind a line of text",
  "props": "at?: number, dur?: number, color?: string, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Spotlight",
  "group": "emphasis that draws over things",
  "does": "the rest of the frame goes dark and a soft light falls on one spot (it can move to the next spot)",
  "props": "spots: { x: number; y: number; at: number }[], at?: number, radius?: number, dark?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "DrawOn",
  "group": "drawing",
  "does": "a line or shape draws itself on (any SVG path)",
  "props": "d: string, at?: number, dur?: number, color?: string, width?: number, fill?: string, fillAt?: number, x?: number, y?: number, w?: number, h?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "OutlineFill",
  "group": "drawing",
  "does": "a shape is outlined first, then filled with colour",
  "props": "d: string, at?: number, dur?: number, color?: string, fill?: string, width?: number, x?: number, y?: number, w?: number, h?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Handwrite",
  "group": "drawing",
  "does": "words written by hand, left to right, with the pen's tip moving along",
  "props": "text: string, x: number, y: number, size?: number, at?: number, dur?: number, color?: string, font?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "StrokeText",
  "group": "drawing",
  "does": "big letters drawn as outlines, then filled in",
  "props": "text: string, x: number, y: number, size?: number, at?: number, dur?: number, color?: string, fill?: string, font?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Connector",
  "group": "drawing",
  "does": "an arrow grows from one thing to another, with a dot where it starts",
  "props": "from: Pt, to: Pt, at?: number, dur?: number, bend?: number, color?: string, width?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "CountUp",
  "group": "numbers",
  "does": "a number counts up to its value and lands with a small kick",
  "props": "to: number, from?: number, at?: number, dur?: number, prefix?: string, suffix?: string, decimals?: number, size?: number, color?: string, font?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Ticker",
  "group": "numbers",
  "does": "digits roll into place like an old counter or a stock ticker, each wheel stopping a little after the last",
  "props": "value: string, at?: number, size?: number, color?: string, font?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "BarGrow",
  "group": "numbers",
  "does": "bars grow up from the floor with a springy overshoot, one after another",
  "props": "data: { label: string; value: number; color?: string }[], w?: number, h?: number, at?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "LineTrace",
  "group": "numbers",
  "does": "a line chart traces itself left to right, with a dot and the value riding its tip",
  "props": "values: number[], w?: number, h?: number, at?: number, dur?: number, color?: string, prefix?: string, suffix?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "PieFill",
  "group": "numbers",
  "does": "a pie or donut fills round, slice by slice, with its labels",
  "props": "slices: { label: string; value: number; color?: string }[], size?: number, at?: number, dur?: number, donut?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Gauge",
  "group": "numbers",
  "does": "a dial whose needle swings to the value, overshoots and settles",
  "props": "value: number, max?: number, size?: number, at?: number, label?: string, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "BarRace",
  "group": "numbers",
  "does": "a ranking race: bars grow and swap places year by year",
  "props": "frames: { label: string; values: Record<string, number> }[], w?: number, rowH?: number, at?: number, per?: number, top?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Camera",
  "group": "camera",
  "does": "moves the camera over everything inside: push in, pull out, pan, tilt down onto a table, whip pan, follow a moving thing",
  "props": "kind: \"push\" | \"pull\" | \"pan\" | \"tilt\" | \"whip\" | \"follow\" | \"drift\", at?: number, dur?: number, focus?: Pt, amount?: number, path?: Pt[], children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "RackFocus",
  "group": "camera",
  "does": "focus moves from the thing in front to the thing behind (the other goes soft)",
  "props": "front: ReactNode, back: ReactNode, at?: number, dur?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Depth",
  "group": "camera",
  "does": "layers at different depths move at different speeds as the camera slides (near ones faster)",
  "props": "layers: { node: ReactNode; depth: number }[], at?: number, speed?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Transition",
  "group": "transitions",
  "does": "shows A, then changes to B at `at` the chosen way",
  "props": "kind: \"cut\" | \"dissolve\" | \"push\" | \"page\" | \"fold\" | \"match\" | \"zoom\" | \"mapzoom\" | \"ink\", at: number, dur?: number, a: ReactNode, b: ReactNode, focus?: Pt",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "Speed",
  "group": "time",
  "does": "plays what is inside faster (×speed) from `at`, with a fast-forward mark; speed < 0 rewinds",
  "props": "at?: number, speed?: number, children: ReactNode, mark?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "FreezeFrame",
  "group": "time",
  "does": "the picture stops dead at `at` with a flash (a freeze frame)",
  "props": "at: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "ClockSpin",
  "group": "time",
  "does": "an old clock whose hands spin: hours pass in seconds",
  "props": "size?: number, at?: number, dur?: number, hours?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "CalendarFlip",
  "group": "time",
  "does": "calendar pages tear off one after another (days or months passing)",
  "props": "pages: { top: string; big: string }[], at?: number, every?: number, size?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion.tsx",
  "name": "DayNight",
  "group": "time",
  "does": "the sky goes from day to dusk to night: the sun sets on an arc, the moon and stars come out",
  "props": "at?: number, dur?: number, reverse?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Move2",
  "group": "<Move2>",
  "does": "moves anything inside it in one of the MOVES2 kinds (acting, change of form, UI, beat), from `at`; `out` plays it backwards",
  "props": "kind: Move2Kind, at?: number, dur?: number, amount?: number, seed?: number, out?: number, children: ReactNode, style?: CSSProperties",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Gather",
  "group": "groups",
  "does": "things scattered about come together into a tidy grid (people gather, parts assemble a team); `reverse` disperses them",
  "props": "items: ReactNode[], x: number, y: number, cols?: number, gap?: number, at?: number, dur?: number, reverse?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "March",
  "group": "groups",
  "does": "rows of things march in step across the frame, bobbing on each step (an army, a parade, a protest)",
  "props": "item: ReactNode, rows?: number, per?: number, y: number, gap?: number, speed?: number, at?: number, face?: 1 | -1",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Queue",
  "group": "groups",
  "does": "a queue: things wait in a line and move up one place each time the first leaves (a ticket counter, a bank)",
  "props": "items: ReactNode[], x: number, y: number, gap?: number, every?: number, at?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Flock",
  "group": "groups",
  "does": "a flock or swarm: many small things wheel about a moving centre together (birds, fish, bees, drones)",
  "props": "item: ReactNode, count?: number, x: number, y: number, spread?: number, at?: number, path?: Pt[]",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Morph",
  "group": "transforms",
  "does": "one shape smoothly becomes another, and another (a circle into a heart, a drop into a star); colours blend too",
  "props": "shapes: Parameters<typeof shapePoints>[0][], colors?: string[], x: number, y: number, size?: number, at?: number, every?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "GrowPlant",
  "group": "transforms",
  "does": "a plant grows from a seed: the stem draws up, leaves unfurl, a flower opens",
  "props": "x: number, y: number, height?: number, at?: number, dur?: number, flower?: string, leaf?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "BuildUp",
  "group": "transforms",
  "does": "a building rises floor by floor (a city growing, a company scaling up); each floor drops into place",
  "props": "x: number, y: number, floors?: number, w?: number, floorH?: number, at?: number, every?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "LiquidLevel",
  "group": "transforms",
  "does": "a container whose level rises or falls to a value with a moving surface (a tank, a battery, a dam, savings)",
  "props": "x: number, y: number, w?: number, h?: number, from?: number, to?: number, at?: number, dur?: number, color?: string, label?: boolean, shape?: \"tank\" | \"battery\" | \"glass\"",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "PaperFold",
  "group": "transforms",
  "does": "a sheet folds in half, then in half again, like paper (a letter, a map, a plan folded away); `reverse` unfolds it",
  "props": "w: number, h: number, at?: number, dur?: number, reverse?: boolean, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Disintegrate",
  "group": "transforms",
  "does": "the picture breaks down into dust that drifts away on the wind (gone, forgotten, erased); `reverse` forms it from dust",
  "props": "w: number, h: number, at?: number, dur?: number, reverse?: boolean, children: ReactNode, cols?: number, rows?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Fire",
  "group": "effects",
  "does": "flames that lick and flicker, with rising embers (a fire, a burning house, a forge, a diya with small size)",
  "props": "x: number, y: number, w?: number, h?: number, at?: number, embers?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Explosion",
  "group": "effects",
  "does": "a blast: a flash, a fireball that swells and darkens to smoke, flying debris and a shock ring",
  "props": "x: number, y: number, at?: number, size?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Lightning",
  "group": "effects",
  "does": "lightning: a jagged bolt cracks down with a flash of the whole sky, again and again",
  "props": "x: number, y?: number, length?: number, at?: number, every?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Confetti",
  "group": "effects",
  "does": "a burst of confetti that flutters down (a win, a launch, a celebration)",
  "props": "at?: number, count?: number, x?: number, y?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Sparkle",
  "group": "effects",
  "does": "sparkles twinkle over an area (magic, something new and shiny, a clean result)",
  "props": "x: number, y: number, w?: number, h?: number, count?: number, at?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "LightRays",
  "group": "effects",
  "does": "rays of light fan down from a point and slowly turn (sunlight through clouds, a holy light, a reveal)",
  "props": "x: number, y: number, rays?: number, length?: number, at?: number, color?: string, spread?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Glitch",
  "group": "effects",
  "does": "a digital glitch over anything: colour channels split, slices jump sideways, for a moment (hacked, broken, a twist)",
  "props": "at?: number, dur?: number, every?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "OldFilm",
  "group": "effects",
  "does": "the look of old film over anything: sepia, grain, flicker, scratches, a dark edge and a gate that jitters",
  "props": "children: ReactNode, amount?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "HeatShimmer",
  "group": "effects",
  "does": "heat shimmer: the air wobbles over hot ground, bending what is behind it (a desert, a road at noon, a fever)",
  "props": "children: ReactNode, amount?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "HeartLine",
  "group": "signals",
  "does": "a heartbeat line (ECG) sweeping across a monitor; `bpm` sets the speed, `flat` after a time stops it",
  "props": "w?: number, h?: number, bpm?: number, at?: number, color?: string, flat?: number, glow?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "SoundWave",
  "group": "signals",
  "does": "a sound wave: bars or a line that move with a voice, music or a noise",
  "props": "w?: number, h?: number, bars?: number, at?: number, loud?: number, color?: string, line?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Radar",
  "group": "signals",
  "does": "a radar sweep turning round with blips that light up as it passes (a search, a hunt, air traffic)",
  "props": "size?: number, at?: number, blips?: Pt[], color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "SignalRings",
  "group": "signals",
  "does": "rings of signal spread out from a point again and again (a tower, Wi-Fi, a phone call, news spreading)",
  "props": "x: number, y: number, at?: number, every?: number, size?: number, color?: string, arc?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Packets",
  "group": "signals",
  "does": "packets (dots or small things) stream along a pipe between points (data over the internet, blood in a vein, goods)",
  "props": "points: Pt[], at?: number, count?: number, speed?: number, size?: number, color?: string, pipe?: boolean, item?: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Typewriter",
  "group": "text that moves",
  "does": "letters type out one by one with a blinking caret (a message, a search, a confession, code)",
  "props": "text: string, at?: number, cps?: number, size?: number, color?: string, mono?: boolean, caret?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Scramble",
  "group": "text that moves",
  "does": "random letters flicker and settle, one by one, into the real word (decoding a secret, a reveal, a hacker screen)",
  "props": "text: string, at?: number, dur?: number, size?: number, color?: string, chars?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "StrikeCorrect",
  "group": "text that moves",
  "does": "a word is struck through and the right one is written beside it (a myth corrected, a price changed, a wrong answer)",
  "props": "wrong: string, right: string, at?: number, size?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "LettersFly",
  "group": "text that moves",
  "does": "the letters of a word fly in from everywhere and land in place; `out` sends them flying apart again",
  "props": "text: string, at?: number, dur?: number, out?: number, size?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "TextOnPath",
  "group": "text that moves",
  "does": "words run along a curved path and scroll along it (a road sign, a river's name, a ribbon)",
  "props": "text: string, points: Pt[], at?: number, size?: number, color?: string, scroll?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "DollyZoom",
  "group": "camera",
  "does": "dolly zoom (vertigo): the subject stays the same size while the world behind it stretches away",
  "props": "subject: ReactNode, back: ReactNode, at?: number, dur?: number, amount?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Crane",
  "group": "camera",
  "does": "crane up: the camera rises from low on the ground to high above, looking down more as it goes",
  "props": "at?: number, dur?: number, amount?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Orbit3D",
  "group": "camera",
  "does": "the camera circles round a thing in 3D (a product, a statue, a model of a molecule)",
  "props": "at?: number, period?: number, tilt?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Quake",
  "group": "camera",
  "does": "the ground shakes: an earthquake, a blast nearby, a big impact (strong at first, then dying away)",
  "props": "at?: number, dur?: number, amount?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "ZoomInto",
  "group": "camera",
  "does": "the camera dives into a rectangle (a phone screen, a window, a photo) until it fills the frame, then shows `inside`",
  "props": "rect: { x: number; y: number; w: number; h: number }, at?: number, dur?: number, inside: ReactNode, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "SplitScreen",
  "group": "camera",
  "does": "the frame splits into two or more shots side by side (a call between two people, before and after, two cities)",
  "props": "shots: ReactNode[], at?: number, vertical?: boolean, gap?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "PictureInPicture",
  "group": "camera",
  "does": "a small second picture pops up in a corner over the main one (a reaction, a source, a live feed)",
  "props": "main: ReactNode, inset: ReactNode, at?: number, corner?: \"tl\" | \"tr\" | \"bl\" | \"br\", size?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Transition2",
  "group": "transitions",
  "does": "shows A, then changes to B at `at` the chosen way",
  "props": "kind: \"glitch\" | \"circle\" | \"star\" | \"heart\" | \"shutter\" | \"spin\" | \"lightleak\" | \"filmburn\" | \"blinds\" | \"slide-up\", at: number, dur?: number, a: ReactNode, b: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "TimeLapse",
  "group": "time",
  "does": "a time-lapse: the sun crosses the sky, shadows swing round, clouds race (a day passing in seconds)",
  "props": "at?: number, dur?: number, children?: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Seasons",
  "group": "time",
  "does": "a tree through the seasons: spring blossom, summer green, autumn orange with falling leaves, winter bare with snow",
  "props": "x: number, y: number, size?: number, at?: number, per?: number, labels?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Hourglass",
  "group": "time",
  "does": "an hourglass: sand runs from the top bulb to the bottom (time running out, waiting, a deadline)",
  "props": "size?: number, at?: number, dur?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "SlowMo",
  "group": "time",
  "does": "plays what is inside slower (×speed, e.g. 0.25) from `at`, with a slow-motion mark (a fall, a splash, a key moment)",
  "props": "at?: number, speed?: number, children: ReactNode, mark?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "YearsPass",
  "group": "time",
  "does": "years pass on a face or a place: a counter of years runs while the picture greys and ages (a life, a ruin)",
  "props": "from: number, to: number, at?: number, dur?: number, children: ReactNode, size?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Tap",
  "group": "UI actions",
  "does": "a finger or cursor taps a point: a ripple spreads, the spot dips (a button, a like, an app icon)",
  "props": "x: number, y: number, at?: number, finger?: boolean, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Swipe",
  "group": "UI actions",
  "does": "a finger swipes across a screen, leaving a fading trail (next card, unlock, dismiss)",
  "props": "from: Pt, to: Pt, at?: number, dur?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Scroll",
  "group": "UI actions",
  "does": "a long list or page scrolls up inside a window, easing to a stop (a feed, search results, a long document)",
  "props": "h: number, distance: number, at?: number, dur?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "TypeInto",
  "group": "UI actions",
  "does": "an input box where text is typed in, with a caret, then a send/search button lights (a search, a login, a chat)",
  "props": "text: string, at?: number, w?: number, cps?: number, button?: string, placeholder?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "DragDrop",
  "group": "UI actions",
  "does": "a thing is picked up, carried along a curve and dropped into a target, which flashes (sort, file, add to cart)",
  "props": "from: Pt, to: Pt, at?: number, dur?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Toggle",
  "group": "UI actions",
  "does": "a switch flips from off to on (a setting, a choice, a light)",
  "props": "at?: number, size?: number, label?: string, on?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Spinner",
  "group": "UI actions",
  "does": "a loading spinner that turns until `until`, then becomes a tick (waiting for a result)",
  "props": "size?: number, at?: number, until?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "ProgressBar",
  "group": "UI actions",
  "does": "a progress bar that fills to a value with its percentage (a download, a goal, a project)",
  "props": "to?: number, at?: number, dur?: number, w?: number, h?: number, label?: string, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-b.tsx",
  "name": "Equalizer",
  "group": "rhythm",
  "does": "an equaliser: bars that jump to the music's beat (a song, a party, a podcast)",
  "props": "bars?: number, w?: number, h?: number, at?: number, bps?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "Go",
  "group": "people going places",
  "does": "a drawn person walks (or runs) from one point to another along the ground, facing the way it goes, then stands and does `then` (wave, cheer, sit, talk…); `path` makes it follow a route of points instead of a straight line",
  "props": "from: Pt, to: Pt, path?: Pt[], at?: number, dur?: number, run?: boolean, then?: \"stand\" | \"wave\" | \"point\" | \"think\" | \"facepalm\" | \"cheer\" | \"shrug\" | \"talk\" | \"cross\" | \"hold\" | \"walk\" | \"run\" | \"sit\" | \"jump\" | \"climb\" | \"handshake\" | \"hug\" | \"highfive\" | \"give\", job?: \"none\" | \"doctor\" | \"teacher\" | \"soldier\" | \"farmer\" | \"police\" | \"chef\" | \"worker\" | \"business\" | \"student\" | \"scientist\" | \"judge\" | \"nurse\" | \"elder\" | \"saree\" | \"kurta\" | \"sikh\" | \"kid\" | \"grandma\", emotion?: \"neutral\" | \"happy\" | \"sad\" | \"angry\" | \"scared\" | \"surprised\" | \"thinking\" | \"laughing\" | \"worried\" | \"proud\", height?: number, seed?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "Meet",
  "group": "people going places",
  "does": "two people walk toward each other and meet: they shake hands, hug, high-five, one gives the other something, or they talk or argue (their faces change); `gift` is what is given",
  "props": "kind?: \"handshake\" | \"hug\" | \"highfive\" | \"give\" | \"talk\" | \"argue\", y: number, gap?: number, at?: number, walk?: number, a?: { job?: \"none\" | \"doctor\" | \"teacher\" | \"soldier\" | \"farmer\" | \"police\" | \"chef\" | \"worker\" | \"business\" | \"student\" | \"scientist\" | \"judge\" | \"nurse\" | \"elder\" | \"saree\" | \"kurta\" | \"sikh\" | \"kid\" | \"grandma\"; emotion?: \"neutral\" | \"happy\" | \"sad\" | \"angry\" | \"scared\" | \"surprised\" | \"thinking\" | \"laughing\" | \"worried\" | \"proud\" }, b?: { job?: \"none\" | \"doctor\" | \"teacher\" | \"soldier\" | \"farmer\" | \"police\" | \"chef\" | \"worker\" | \"business\" | \"student\" | \"scientist\" | \"judge\" | \"nurse\" | \"elder\" | \"saree\" | \"kurta\" | \"sikh\" | \"kid\" | \"grandma\"; emotion?: \"neutral\" | \"happy\" | \"sad\" | \"angry\" | \"scared\" | \"surprised\" | \"thinking\" | \"laughing\" | \"worried\" | \"proud\" }, gift?: string, height?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "Pursuit",
  "group": "chases",
  "does": "a chase: `lead` runs along a path and `follow` gains on it; speed lines and dust trail them; the camera can follow. `ending` \"caught\" closes the gap at the end with a pounce, \"escaped\" opens it until the chaser gives up. kind \"foot\" (two people running), \"car\" (two cars), \"police\" (a police car with flashing lights and a siren), \"cat\" (cat and mouse, round and round a loop) — or give your own `lead` and `follow`",
  "props": "path?: Pt[], at?: number, dur?: number, kind?: \"foot\" | \"car\" | \"police\" | \"cat\", ending?: \"caught\" | \"escaped\", lead?: ReactNode, follow?: ReactNode, camera?: boolean, lines?: boolean, size?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "DotGroups",
  "group": "dots",
  "does": "a grid of dots (people, households, votes) that splits into labelled groups, each its own colour and cluster; then `merge` brings them back. A dot is a circle, or `icon` (an emoji)",
  "props": "groups: { label: string; count: number; color?: string }[], at?: number, split?: number, w?: number, h?: number, size?: number, icon?: string, merge?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "OneIn",
  "group": "dots",
  "does": "\"1 in N\": a block of N figures, one of them lights up and steps forward while the others fade (1 in 4 children…)",
  "props": "n?: number, at?: number, rows?: number, icon?: string, size?: number, label?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "ChartMorph",
  "group": "charts that change",
  "does": "a bar chart that changes as the story goes on: bars grow, then re-sort by size (`sortAt`), one is lit and the others dim (`focus` = its label, `focusAt`), and the bars can morph into a pie (`pieAt`)",
  "props": "data: { label: string; value: number; color?: string }[], w?: number, h?: number, at?: number, sortAt?: number, focus?: string, focusAt?: number, pieAt?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "SpreadMap",
  "group": "maps that change",
  "does": "something spreads across a map region by region (a disease, a language, an empire, a flood): each region fills at its time with a pulse ring; `order` is [country name, when (s)]; a counter shows how many",
  "props": "map?: MapView, order: [string, number][], color?: string, label?: string, sea?: string, land?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "LiftCountry",
  "group": "maps that change",
  "does": "one country lifts up out of the map, casts a shadow and turns a little (to look at it alone); `shift` [dx, dy] also moves it aside as it lifts (to pull two neighbours apart)",
  "props": "map?: MapView, name: string, at?: number, color?: string, height?: number, shift?: [number, number]",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "MapFly",
  "group": "maps that change",
  "does": "the camera flies across a map from place to place, zooming in and out (stops: [lon, lat, zoom, when (s)])",
  "props": "map?: MapView, stops: [number, number, number, number][], children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "Dominoes",
  "group": "chain physics",
  "does": "a row of dominoes falls one after another (a chain reaction, one thing leading to the next); `labels` on each",
  "props": "count?: number, x: number, y: number, gap?: number, h?: number, at?: number, every?: number, labels?: string[], color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "RopeSwing",
  "group": "chain physics",
  "does": "a thing swings on a rope from a point above, slowing down (a wrecking ball, a swing, a hanging sign)",
  "props": "x: number, y: number, length?: number, at?: number, amount?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "BalloonRise",
  "group": "chain physics",
  "does": "balloons (or anything) rise and drift, swaying on their strings (hope, a release, prices going up)",
  "props": "count?: number, at?: number, colors?: string[], x?: number, y?: number, items?: ReactNode[]",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "WindBlow",
  "group": "chain physics",
  "does": "a gust of wind: streaks blow across and the things in it are swept away, tumbling (a storm, a crash, money flying)",
  "props": "items: { node: ReactNode; x: number; y: number }[], at?: number, from?: \"left\" | \"right\", strength?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "MagnetPull",
  "group": "chain physics",
  "does": "a magnet pulls things toward it, faster as they get close, and they stick (attraction, money pulled to the rich)",
  "props": "x: number, y: number, items: { node: ReactNode; x: number; y: number }[], at?: number, dur?: number, magnet?: boolean",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "SpokenWords",
  "group": "words as they are said",
  "does": "the narration's words on screen, each lit (or popped, or boxed) exactly as it is said; `keywords` get the accent and a pulse; `lines` words per line. Uses the scene's word times (from the voice)",
  "props": "style?: \"pop\" | \"karaoke\" | \"box\" | \"bounce\", keywords?: string[], size?: number, per?: number, y?: number, color?: string",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "ObjectWipe",
  "group": "transitions that use a thing",
  "does": "an object (a car, a bus, a hand, a train) crosses the frame and wipes A away to B behind it",
  "props": "a: ReactNode, b: ReactNode, wiper: ReactNode, at: number, dur?: number, from?: \"left\" | \"right\", width?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "ShapeMatch",
  "group": "transitions that use a thing",
  "does": "a shape match-cut: A closes down to a shape at a point (a coin, a ball, an eye), and B opens out of the same shape there",
  "props": "a: ReactNode, b: ReactNode, at: number, x: number, y: number, shape?: \"circle\" | \"square\" | \"star\" | \"heart\" | \"drop\", dur?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "RuinRestore",
  "group": "time on a place",
  "does": "a place falls to ruin over time: cracks spread, pieces drop, colour drains, weeds grow; `reverse` rebuilds it",
  "props": "w: number, h: number, at?: number, dur?: number, reverse?: boolean, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "TimelineScrub",
  "group": "time on a place",
  "does": "a timeline with a cursor that moves from event to event; each event's card pops up as the cursor reaches it",
  "props": "events: { year: string; text: string }[], at?: number, per?: number, w?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "Sfx",
  "group": "sound",
  "does": "plays a sound effect at `at` (s) from video/public/sfx (made by `python3 sfx.py`)",
  "props": "kind: SfxKind, at?: number, volume?: number",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-c.tsx",
  "name": "OnBeat",
  "group": "sound",
  "does": "pulses what is inside on the music's beats (`bpm`, from `at`), harder on the first beat of each bar",
  "props": "bpm?: number, at?: number, amount?: number, children: ReactNode",
  "parts": []
 },
 {
  "layer": 1,
  "file": "motion-d.tsx",
  "name": "Motion",
  "group": "MOTION GRAMMAR",
  "does": "anything, moving by one of the 1,284 named motions of the grammar: id = phase.kind.dir.ease (\"enter.swoop.upleft.back\", \"exit.fade.smooth\", \"emph.jello.elastic\", \"loop.float.slow\"); phases enter, exit, emph, loop; travel kinds slide rise fly swoop skid blur peek wipe roll lean (dirs up down left right upleft upright downleft downright); in-place kinds fade zoom grow shrink pop flipx flipy spin swirl iris unfold stretch focus glitch flicker fall; emph kinds pulse shake wobble jello heartbeat flash tada nod swing rubber glow jump squash tilt spin blink; loop kinds float bob sway spin breathe wiggle orbit pendulum hover drift twinkle throb (speeds slow mid fast); eases smooth snappy back elastic bounce linear. Several ids in a row, comma separated, play together (\"enter.pop.back,loop.float.slow\")",
  "props": "id: string, at?: number, dur?: number, amount?: number, children: ReactNode, style?: CSSProperties",
  "parts": []
 },
 {
  "layer": 1,
  "file": "cards.tsx",
  "name": "Card",
  "group": "CARDS",
  "does": "a box for a title and a line of text (or any children), in one of 1,536 designs: design = shape.frame.fill.head (\"ticket.double.tint.band\"); shapes rect rounded pill chamfer notch ticket tab speech hex arrow torn scallop badge cut leaf blob; frames outline solid double dashed offset glass inset ribbon sidebar ticks rule lifted; fills paper tint accent ink; heads plain band (the title in a coloured band). No design: one that fits the film's box style. Text shrinks to fit, never out of the box; motion is a grammar id (motion-d)",
  "props": "design?: string, w?: number, h?: number, at?: number, title?: string, text?: string, children?: ReactNode, seed?: number, motion?: string, align?: \"left\" | \"center\", parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 1,
  "file": "creatures.tsx",
  "name": "Creature",
  "group": "CREATURES",
  "does": "an insect, small animal or robot that lives and moves: kind bee wasp fly (makkhi) mosquito ant beetle ladybug butterfly moth dragonfly spider caterpillar worm snail cockroach grasshopper firefly bird fish bat jellyfish crab mouse robot drone rover bot (a friendly AI assistant head); move still hover wander dart (a fly's dash-and-stop) path crawl swim hop orbit land (flies in and settles) flee (rushes off at `at`) dangle (a spider on its thread); x, y its centre; path the points it follows; range how far it roams; wings beat, legs walk and tails swish by themselves",
  "props": "kind: \"bee\" | \"wasp\" | \"fly\" | \"mosquito\" | \"ant\" | \"beetle\" | \"ladybug\" | \"butterfly\" | \"moth\" | \"dragonfly\" | \"spider\" | \"caterpillar\" | \"worm\" | \"snail\" | \"cockroach\" | \"grasshopper\" | \"firefly\" | \"bird\" | \"fish\" | \"bat\" | \"jellyfish\" | \"crab\" | \"mouse\" | \"robot\" | \"drone\" | \"rover\" | \"bot\", x?: number, y?: number, size?: number, at?: number, move?: \"still\" | \"hover\" | \"wander\" | \"dart\" | \"path\" | \"crawl\" | \"swim\" | \"hop\" | \"orbit\" | \"land\" | \"flee\" | \"dangle\", path?: [number, number][], range?: number, speed?: number, loop?: boolean, seed?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 1,
  "file": "creatures.tsx",
  "name": "Swarm",
  "group": "CREATURES",
  "does": "many of one kind together: buzzing about inside a box (bees round a hive, flies round food), or streaming from the box to `to` (ants in a line, a swarm leaving); each one its own size and timing",
  "props": "kind: \"bee\" | \"wasp\" | \"fly\" | \"mosquito\" | \"ant\" | \"beetle\" | \"ladybug\" | \"butterfly\" | \"moth\" | \"dragonfly\" | \"spider\" | \"caterpillar\" | \"worm\" | \"snail\" | \"cockroach\" | \"grasshopper\" | \"firefly\" | \"bird\" | \"fish\" | \"bat\" | \"jellyfish\" | \"crab\" | \"mouse\" | \"robot\" | \"drone\" | \"rover\" | \"bot\", x: number, y: number, w?: number, h?: number, count?: number, size?: number, at?: number, mode?: \"buzz\" | \"stream\", to?: [number, number], parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 1,
  "file": "creatures.tsx",
  "name": "Robot",
  "group": "ROBOTS",
  "does": "a robot that acts: action idle wave walk think (with thought dots) type (at a keyboard) point celebrate scan (sweeps a beam); its eyes blink and its lights run",
  "props": "action?: \"idle\" | \"wave\" | \"walk\" | \"think\" | \"type\" | \"point\" | \"celebrate\" | \"scan\", size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 1,
  "file": "creatures.tsx",
  "name": "RobotArm",
  "group": "ROBOTS",
  "does": "an industrial robot arm on its base: action pick (lifts a box from the left and sets it down on the right), wave, weld (sparks fly at the tip), sort (taps three spots in turn)",
  "props": "action?: \"pick\" | \"wave\" | \"weld\" | \"sort\", size?: number, at?: number, item?: ReactNode, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 1,
  "file": "people.tsx",
  "name": "Person",
  "group": "PEOPLE",
  "does": "a person who acts: avatar (94 kinds: classic, doctor, professor, kid, elder, business, chef, scientist, king, robot, student, athlete…), pose (46 poses and moves: stand, point, explain, think, shrug, facepalm, happy, sad, shock, victory, cheer, kneel, sit, carry, push, pull, wave, walk, run, climb, dance, jump, type, nod, no, cry…), gestures (pose changes over time, each blended in: [{pose:\"think\",at:1},{pose:\"point\",at:2.5}]), talk (the mouth moves: true, or [[start,end],…] in seconds), wear (extra costume parts: cap, glasses, backpack, hardhat, crown, chef_hat, headphones, beard, tie, coat…), walk (to: px it walks right, or left if negative, over dur s), figure (body style; default: the one that suits the film's look), id (labels point at \"id.head\", \"id.feet\", \"id.center\")",
  "props": "avatar?: \"classic\" | \"hoodie\" | \"girl\" | \"professor\" | \"business\" | \"kid\" | \"elder\" | \"silhouette\" | \"doctor\" | \"student\" | \"gamer\" | \"athlete\" | \"woman\" | \"king\" | \"minimal\" | \"warrior\" | \"villager\" | \"tribal\" | \"adventurer\" | \"mascot\" | \"explorer\" | \"chibi\" | \"casual\" | \"executive\" | \"zeke\" | \"office\" | \"exec\" | \"builder\" | \"scientist\" | \"grad\" | \"chef\" | \"lady\" | \"robot\" | \"agent\" | \"ink_head\" | \"basic_stick\" | \"tshirt\" | \"hoodie_blue\" | \"cap_style\" | \"jacket\" | \"school_uniform\" | \"college_student\" | \"office_worker\" | \"business_suit\" | \"teacher\" | \"doctor_coat\" | \"nurse\" | \"lab_scientist\" | \"engineer\" | \"police\" | \"chef_cook\" | \"mechanic\" | \"delivery\" | \"driver\" | \"pilot\" | \"flight_attendant\" | \"sportsperson\" | \"gamer_pro\" | \"photographer\" | \"reporter\" | \"musician\" | \"youtuber\" | \"student_girl\" | \"professional_woman\" | \"casual_girl\" | \"caveman\" | \"tribal_hunter\" | \"ancient_indian\" | \"sage\" | \"priest\" | \"maharaja\" | \"rani\" | \"spartan\" | \"samurai\" | \"roman_soldier\" | \"knight\" | \"ninja\" | \"wizard\" | \"viking\" | \"farmer\" | \"village_man\" | \"village_woman\" | \"nomad\" | \"fisherman\" | \"traveller\" | \"mountaineer\" | \"hiker\" | \"archer\" | \"cowboy\" | \"pirate\" | \"astronaut\" | \"rain_outfit\" | \"snow_outfit\" | \"firefighter\", pose?: \"stand\" | \"point\" | \"present\" | \"happy\" | \"think\" | \"shrug\" | \"sad\" | \"hold\" | \"shock\" | \"facepalm\" | \"pray\" | \"confident\" | \"tired\" | \"sit\" | \"victory\" | \"meditate\" | \"clasp\" | \"crouch\" | \"leap\" | \"tuck\" | \"hang\" | \"sit_edge\" | \"slump\" | \"sit_floor\" | \"relax\" | \"kneel\" | \"lie\" | \"lie_front\" | \"point_up\" | \"cheer\" | \"hands_hips\" | \"arms_cross\" | \"surprise\" | \"scared\" | \"thumbs_up\" | \"salute\" | \"bow\" | \"push\" | \"pull\" | \"carry\" | \"lift\" | \"windup\" | \"throw\" | \"balance\" | \"stumble\" | \"explain_open\" | \"walk\" | \"run\" | \"climb\" | \"celebrate\" | \"wave\" | \"dance\" | \"jump\" | \"explain\" | \"type\" | \"nod\" | \"no\" | \"cry\" | \"jumping_jacks\" | \"sneak\" | \"climb_ladder\", gestures?: { pose: \"stand\" | \"point\" | \"present\" | \"happy\" | \"think\" | \"shrug\" | \"sad\" | \"hold\" | \"shock\" | \"facepalm\" | \"pray\" | \"confident\" | \"tired\" | \"sit\" | \"victory\" | \"meditate\" | \"clasp\" | \"crouch\" | \"leap\" | \"tuck\" | \"hang\" | \"sit_edge\" | \"slump\" | \"sit_floor\" | \"relax\" | \"kneel\" | \"lie\" | \"lie_front\" | \"point_up\" | \"cheer\" | \"hands_hips\" | \"arms_cross\" | \"surprise\" | \"scared\" | \"thumbs_up\" | \"salute\" | \"bow\" | \"push\" | \"pull\" | \"carry\" | \"lift\" | \"windup\" | \"throw\" | \"balance\" | \"stumble\" | \"explain_open\" | \"walk\" | \"run\" | \"climb\" | \"celebrate\" | \"wave\" | \"dance\" | \"jump\" | \"explain\" | \"type\" | \"nod\" | \"no\" | \"cry\" | \"jumping_jacks\" | \"sneak\" | \"climb_ladder\"; at: number }[], talk?: boolean | [number, number][], wear?: string[], size?: number, at?: number, flip?: boolean, figure?: \"slim\" | \"kino\" | \"geometric\" | \"rounded\" | \"mascot\" | \"scribble\" | \"rubberhose\" | \"bold\" | \"sporty\", accent?: string, walk?: { to: number; dur?: number }, look?: number, id?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 1,
  "file": "people.tsx",
  "name": "Conversation",
  "group": "PEOPLE",
  "does": "two or three people, the whole frame: mode \"talk\" (side by side; each line pops up as a speech bubble on its `at` and only the speaker's mouth moves, the speaker gestures) or \"meet\" (two walk in from the sides, then action: walk_meet, handshake, give, high_five, argue, turn_away); people [{avatar, name?, wear?}], lines [{who: 0|1|2, text, at, pose?}]",
  "props": "people: Who[], lines?: Line[], mode?: \"talk\" | \"meet\", action?: \"walk_meet\" | \"handshake\" | \"give\" | \"high_five\" | \"argue\" | \"turn_away\", floor?: number, size?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 1,
  "file": "people.tsx",
  "name": "Crowd",
  "group": "PEOPLE",
  "does": "a crowd of small people (a town, an audience, a queue): count figures in rows, each a different avatar, gently alive",
  "props": "count?: number, w?: number, rows?: number, size?: number, at?: number, seed?: number, pose?: \"stand\" | \"point\" | \"present\" | \"happy\" | \"think\" | \"shrug\" | \"sad\" | \"hold\" | \"shock\" | \"facepalm\" | \"pray\" | \"confident\" | \"tired\" | \"sit\" | \"victory\" | \"meditate\" | \"clasp\" | \"crouch\" | \"leap\" | \"tuck\" | \"hang\" | \"sit_edge\" | \"slump\" | \"sit_floor\" | \"relax\" | \"kneel\" | \"lie\" | \"lie_front\" | \"point_up\" | \"cheer\" | \"hands_hips\" | \"arms_cross\" | \"surprise\" | \"scared\" | \"thumbs_up\" | \"salute\" | \"bow\" | \"push\" | \"pull\" | \"carry\" | \"lift\" | \"windup\" | \"throw\" | \"balance\" | \"stumble\" | \"explain_open\" | \"walk\" | \"run\" | \"climb\" | \"celebrate\" | \"wave\" | \"dance\" | \"jump\" | \"explain\" | \"type\" | \"nod\" | \"no\" | \"cry\" | \"jumping_jacks\" | \"sneak\" | \"climb_ladder\", parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Silhouette",
  "group": "PEOPLE",
  "does": "a person as a flat filled silhouette in a pose (stand, walk, point, cheer, sit); walking swings the limbs",
  "props": "pose?: \"stand\" | \"walk\" | \"point\" | \"cheer\" | \"sit\", height?: number, color?: string, at?: number, face?: 1 | -1, parts?: { all, head }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "head"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "CutoutPerson",
  "group": "PEOPLE",
  "does": "a real person cut out of a photo, with a white paper border and a soft shadow",
  "props": "image: string, height?: number, at?: number, tilt?: number, parts?: { all, picture }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "picture"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Crowd",
  "group": "PEOPLE",
  "does": "a crowd: rows of people that appear and bob, some cheering (a market, a protest, a stadium)",
  "props": "w?: number, rows?: number, per?: number, at?: number, color?: string, parts?: { all, person }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "person"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Portrait",
  "group": "PEOPLE",
  "does": "a framed portrait with a name and a role under it",
  "props": "image: string, name: string, role?: string, size?: number, at?: number, round?: boolean, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "SpeechQuote",
  "group": "PEOPLE",
  "does": "a person speaking: a round portrait and a speech bubble whose words type out",
  "props": "image: string, text: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Hand",
  "group": "PEOPLE",
  "does": "a hand that points or taps on something",
  "props": "at?: number, tap?: boolean, size?: number, color?: string, parts?: { all, finger, palm }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "finger",
   "palm"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Avatar",
  "group": "PEOPLE",
  "does": "a round avatar with initials (a user, a customer, a voter)",
  "props": "name: string, size?: number, at?: number, color?: string, parts?: { all, face }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "face"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "ChartFrame",
  "group": "DATA",
  "does": "a frame for any chart: a title, the chart, a source line",
  "props": "title: string, source?: string, children: ReactNode, at?: number, w?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "BigNumber",
  "group": "DATA",
  "does": "one big number with what it means under it",
  "props": "value: number, prefix?: string, suffix?: string, label: string, at?: number, size?: number, decimals?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "HBars",
  "group": "DATA",
  "does": "horizontal bars sliding out from a left axis, sorted, with values",
  "props": "data: { label: string; value: number; color?: string }[], w?: number, at?: number, rowH?: number, parts?: { all, bar }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "bar"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "AreaStack",
  "group": "DATA",
  "does": "stacked areas that grow over time (shares that change)",
  "props": "series: { name: string; values: number[]; color?: string }[], labels?: string[], w?: number, h?: number, at?: number, dur?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "StackedBars",
  "group": "DATA",
  "does": "100%-stacked bars: how each group splits",
  "props": "rows: { label: string; parts: number[] }[], w?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "ScatterPlot",
  "group": "DATA",
  "does": "dots on two axes pop in one by one, then a trend line draws through them",
  "props": "points: [number, number][], w?: number, h?: number, at?: number, xLabel?: string, yLabel?: string, trend?: boolean, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Bubbles",
  "group": "DATA",
  "does": "bubbles sized by value float in and settle (markets, countries by size)",
  "props": "items: { label: string; value: number; color?: string }[], w?: number, h?: number, at?: number, parts?: { all, bubble }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "bubble"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Waffle",
  "group": "DATA",
  "does": "100 dots, of which some fill in colour: \"37 out of 100\"",
  "props": "value: number, at?: number, size?: number, color?: string, label?: string, parts?: { all, cell }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "cell"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "DataTable",
  "group": "DATA",
  "does": "a table whose rows slide in; one row can be marked",
  "props": "head: string[], rows: (string | number)[][], at?: number, mark?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "HeatMap",
  "group": "DATA",
  "does": "a grid of cells whose colour shows how much (days, regions, hours)",
  "props": "values: number[], cols: number, at?: number, cell?: number, labels?: string[], parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "KpiCard",
  "group": "DATA",
  "does": "a small KPI card: a number, its change (up or down) and a sparkline",
  "props": "label: string, value: string, change: number, spark: number[], at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Candles",
  "group": "FINANCE",
  "does": "a candlestick price chart drawing in day by day (green up, red down), with the last price",
  "props": "data: [number, number, number, number][], w?: number, h?: number, at?: number, per?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "TickerTape",
  "group": "FINANCE",
  "does": "a ticker tape of prices scrolling past, green and red",
  "props": "items: { sym: string; price: string; change: number }[], at?: number, w?: number, speed?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "CoinStack",
  "group": "FINANCE",
  "does": "coins drop one by one and stack up into piles (savings, how much it costs)",
  "props": "stacks?: number[], at?: number, size?: number, gap?: number, parts?: { all, coin }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "coin"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "MoneyFlow",
  "group": "FINANCE",
  "does": "money moves from one box to others as little coins along arrows (where your salary goes)",
  "props": "from: string, to: { label: string; share: number }[], at?: number, w?: number, h?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "BalanceScale",
  "group": "FINANCE",
  "does": "a balance scale that tips to the heavier side (assets vs debts, cost vs benefit)",
  "props": "left: string, right: string, lw: number, rw: number, at?: number, size?: number, parts?: { all, pivot }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "pivot"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Receipt",
  "group": "FINANCE",
  "does": "a receipt prints out line by line, then the total",
  "props": "title?: string, lines: [string, string][], total: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "BankCard",
  "group": "FINANCE",
  "does": "a bank card slides in, turns a little in 3D and catches the light",
  "props": "name?: string, bank?: string, last?: string, at?: number, w?: number, parts?: { all, chip }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "chip"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Allocation",
  "group": "FINANCE",
  "does": "one long bar split into parts (a portfolio, a budget) whose parts slide in and get their labels",
  "props": "parts: { label: string; value: number; color?: string }[], w?: number, at?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "InflationBasket",
  "group": "FINANCE",
  "does": "a shopping basket: as the year moves on, the same money buys fewer things (inflation)",
  "props": "items?: string[], years?: string[], at?: number, per?: number, parts?: { all, item }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "item"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "ColumnChart",
  "group": "DATA",
  "does": "the same as BarGrow",
  "props": "(as BarGrow)",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "LineChart2",
  "group": "DATA",
  "does": "the same as LineTrace",
  "props": "(as LineTrace)",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Donut",
  "group": "DATA",
  "does": "the same as PieFill",
  "props": "(as PieFill)",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "Dial",
  "group": "DATA",
  "does": "the same as Gauge",
  "props": "(as Gauge)",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-a.tsx",
  "name": "RankingRace",
  "group": "DATA",
  "does": "the same as BarRace",
  "props": "(as BarRace)",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "MapBase",
  "group": "MAPS",
  "does": "the countries, with some filled in colour one after another; the sea and land take the theme",
  "props": "map?: MapView, highlight?: Record<string, string>, at?: number, sea?: string, land?: string, labels?: boolean, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Pin",
  "group": "MAPS",
  "does": "a pin that drops onto a place, with its name",
  "props": "map?: MapView, lon: number, lat: number, label?: string, at?: number, color?: string, parts?: { all, pin }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "pin"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "MapRoute",
  "group": "MAPS",
  "does": "a journey on the map: a great-circle line drawn between places, a marker travelling it",
  "props": "map?: MapView, stops: [number, number][], at?: number, dur?: number, color?: string, width?: number, parts?: { all, traveller }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "traveller"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "ArmyArrow",
  "group": "MAPS",
  "does": "a thick tapering arrow that pushes along a path (an army's advance, a storm's track)",
  "props": "map?: MapView, path: [number, number][], at?: number, dur?: number, color?: string, width?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "FlowLines",
  "group": "MAPS",
  "does": "many curved routes between places with goods moving along them (trade, migration, flights)",
  "props": "map?: MapView, routes: { from: [number, number]; to: [number, number]; weight?: number }[], at?: number, color?: string, parts?: { all, dot }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "dot"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Choropleth",
  "group": "MAPS",
  "does": "countries filled by a value, darker = more, with a legend (a choropleth)",
  "props": "map?: MapView, values: Record<string, number>, at?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "BorderYears",
  "group": "MAPS",
  "does": "borders that change over the years: which countries belong to a group, year by year",
  "props": "map?: MapView, frames: { year: string; in: string[] }[], at?: number, per?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Globe",
  "group": "MAPS",
  "does": "a globe that turns to a place and comes closer, and the place lights up; labels point at its real points by name (id, default \"globe\"): to=\"globe.equator\" (where the equator crosses the middle of the visible face), \"globe.equator.left\" / \".right\" (its visible ends), \"globe.pole.n\" / \"globe.pole.s\", \"globe.center\", or \"globe.LAT,LON\" (\"globe.-33.9,18.4\"); a point on the far side gives nothing",
  "props": "lon: number, lat: number, size?: number, at?: number, dur?: number, highlight?: string[], color?: string, id?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Satellite",
  "group": "MAPS",
  "does": "a satellite photo with a scan line and coordinates, as if seen from orbit",
  "props": "image: string, w?: number, h?: number, at?: number, coords?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Timeline",
  "group": "TIME",
  "does": "a horizontal timeline: the line draws, a playhead moves, and events pop up above and below",
  "props": "events: { year: string; label: string }[], w?: number, at?: number, dur?: number, parts?: { all, event }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "event"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "VTimeline",
  "group": "TIME",
  "does": "a vertical timeline that scrolls up as each event arrives",
  "props": "events: { year: string; label: string }[], at?: number, per?: number, h?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "EraBands",
  "group": "TIME",
  "does": "long eras as coloured bands on a time axis, with a marker sweeping through them",
  "props": "eras: { name: string; from: number; to: number; color?: string }[], start: number, end: number, w?: number, at?: number, dur?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "MonthCalendar",
  "group": "TIME",
  "does": "a month on a calendar; days get crossed off one after another",
  "props": "month?: string, days?: number, startDay?: number, upto?: number, at?: number, size?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "BeforeAfter",
  "group": "TIME",
  "does": "two pictures of the same place, then and now, with a slider that wipes between them",
  "props": "before: string, after: string, w?: number, h?: number, at?: number, labels?: [string, string], parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "FamilyTree",
  "group": "TIME",
  "does": "a family tree: generations connect one row after another",
  "props": "rows: string[][], at?: number, w?: number, parts?: { all, person }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "person"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Countdown",
  "group": "TIME",
  "does": "big digits counting down, with a ring that empties (a deadline, a launch)",
  "props": "from?: number, at?: number, size?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Flowchart",
  "group": "DIAGRAMS",
  "does": "a flowchart: boxes and a yes/no decision appear in order, joined by growing arrows",
  "props": "nodes: { id: string; label: string; x: number; y: number; kind?: \"box\" | \"decision\" | \"end\" }[], edges: [string, string, string?][], at?: number, per?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "ProcessSteps",
  "group": "DIAGRAMS",
  "does": "numbered steps in a row, each lighting up in turn with an arrow to the next",
  "props": "steps: string[], at?: number, per?: number, w?: number, parts?: { all, step }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "step"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "CycleLoop",
  "group": "DIAGRAMS",
  "does": "a cycle: stages round a circle, arrows turning between them for ever (water cycle, business cycle)",
  "props": "stages: string[], size?: number, at?: number, parts?: { all, node }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "node"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "TreeChart",
  "group": "DIAGRAMS",
  "does": "a hierarchy that grows down from the top (an org chart, a family of ideas); `cards` draws people as cards",
  "props": "root: string, children: { label: string; children?: string[] }[], at?: number, w?: number, cards?: boolean, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "MindMap",
  "group": "DIAGRAMS",
  "does": "a mind map: the big idea in the middle, branches curving out to ideas around it",
  "props": "center: string, ideas: string[], size?: number, at?: number, parts?: { all, node }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "node"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Venn",
  "group": "DIAGRAMS",
  "does": "circles slide together and the overlap gets its name",
  "props": "sets: string[], overlap: string, size?: number, at?: number, parts?: { all, circle }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "circle"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Funnel",
  "group": "DIAGRAMS",
  "does": "a funnel: each stage narrower, with how many make it through (the last stays wide enough for its label)",
  "props": "stages: { label: string; value: string }[], w?: number, at?: number, parts?: { all, stage }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "stage"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Pyramid",
  "group": "DIAGRAMS",
  "does": "a pyramid built level by level from the base up (Maslow, food chain, wealth)",
  "props": "levels: string[], w?: number, at?: number, parts?: { all, level }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "level"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Matrix2x2",
  "group": "DIAGRAMS",
  "does": "a 2x2 matrix: two axes, four quadrants, and items that land in their quadrant",
  "props": "x: string, y: string, quads: [string, string, string, string], items: { label: string; x: number; y: number }[], size?: number, at?: number, parts?: { all, quadrant }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "quadrant"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-b.tsx",
  "name": "Network",
  "group": "DIAGRAMS",
  "does": "nodes joined by lines, with signals pulsing along the links (a network, a supply web, friends)",
  "props": "nodes?: number, w?: number, h?: number, at?: number, labels?: string[], parts?: { all, node }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "node"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Headline",
  "group": "DOCUMENTS",
  "does": "a newspaper spins in and lands, with the day's headline",
  "props": "paper?: string, date?: string, headline: string, sub?: string, image?: string, at?: number, w?: number, parts?: { all, photo }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "photo"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Letter",
  "group": "DOCUMENTS",
  "does": "an envelope opens and the letter rises out of it, its lines writing in",
  "props": "to?: string, lines?: number, at?: number, w?: number, parts?: { all, letter, envelope, flap }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "letter",
   "envelope",
   "flap"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "OldPaper",
  "group": "DOCUMENTS",
  "does": "old paper: the parchment unrolls and its writing fades up, aged at the edges",
  "props": "title: string, text: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Stamp",
  "group": "DOCUMENTS",
  "does": "a rubber stamp slams down on a page and leaves its ink",
  "props": "text?: string, at?: number, color?: string, size?: number, angle?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Signature",
  "group": "DOCUMENTS",
  "does": "a signature is signed by a pen, stroke by stroke",
  "props": "name?: string, at?: number, dur?: number, size?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "DocHighlight",
  "group": "DOCUMENTS",
  "does": "a page of a document; one passage is highlighted and pulled out larger",
  "props": "title?: string, lines?: number, mark?: number, quote: string, at?: number, w?: number, parts?: { all, quote }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "quote"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "SocialPost",
  "group": "DOCUMENTS",
  "does": "a social media post: it slides up, then likes and shares count up",
  "props": "name?: string, handle?: string, text: string, at?: number, likes?: number, w?: number, parts?: { all, avatar }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "avatar"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Redacted",
  "group": "DOCUMENTS",
  "does": "a legal or secret document where lines are blacked out one by one (redacted)",
  "props": "title?: string, lines?: number, at?: number, w?: number, parts?: { all, stamp }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "stamp"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "BookPages",
  "group": "DOCUMENTS",
  "does": "a book opens and its pages turn",
  "props": "at?: number, w?: number, title?: string, pages?: number, parts?: { all, cover }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "cover"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "LabelledDiagram",
  "group": "SCIENCE",
  "does": "a picture with labelled callouts that point to its parts (anatomy, a machine, a plant)",
  "props": "image: string, w?: number, h?: number, labels: { x: number; y: number; text: string; side?: \"left\" | \"right\" }[], at?: number, parts?: { all, picture }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "picture"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "CrossSection",
  "group": "SCIENCE",
  "does": "the Earth (or a fruit, a volcano) cut open: layers peel in from the core, each named",
  "props": "layers?: [string, string][], size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Molecule",
  "group": "SCIENCE",
  "does": "a molecule: atoms joined by bonds, turning slowly in 3D",
  "props": "atoms?: [string, number, number, number][], size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Cell",
  "group": "SCIENCE",
  "does": "a living cell: the membrane wobbles, things drift inside, the nucleus pulses",
  "props": "size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "SolarSystem",
  "group": "SCIENCE",
  "does": "planets on their orbits round the Sun, inner ones faster",
  "props": "w?: number, h?: number, at?: number, parts?: { all, sun }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "sun"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Equation",
  "group": "SCIENCE",
  "does": "an equation builds term by term, then the answer lands",
  "props": "terms: string[], answer: string, at?: number, size?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Flask",
  "group": "SCIENCE",
  "does": "a lab flask on a flame, its liquid bubbling",
  "props": "at?: number, size?: number, color?: string, parts?: { all, flask }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "flask"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Weather",
  "group": "SCIENCE",
  "does": "a weather system: a cloud drifts in, rain falls, lightning flashes",
  "props": "at?: number, w?: number, h?: number, lightning?: boolean, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Phone",
  "group": "TECH",
  "does": "a phone whose screen shows anything you put in it, scrolling",
  "props": "children?: ReactNode, at?: number, h?: number, scroll?: number, tilt?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "AppScreen",
  "group": "TECH",
  "does": "an app screen: grey placeholders load, then the real cards fill in",
  "props": "title?: string, items?: string[], at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Laptop",
  "group": "TECH",
  "does": "a laptop opens and its screen lights up",
  "props": "children?: ReactNode, at?: number, w?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "CodeBlock",
  "group": "TECH",
  "does": "code typed line by line, with colours and a blinking cursor",
  "props": "code: string, at?: number, w?: number, speed?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "CloudServers",
  "group": "TECH",
  "does": "servers and a cloud, with data packets travelling up and down between them",
  "props": "at?: number, w?: number, parts?: { all, cloud, server }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "cloud",
   "server"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Cursor",
  "group": "TECH",
  "does": "a mouse cursor moves to points and clicks, with a ripple at each click",
  "props": "path: [number, number][], at?: number, per?: number, parts?: { all, pointer }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "pointer"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Notification",
  "group": "TECH",
  "does": "a notification slides down with a sound-wave wiggle and its badge",
  "props": "app?: string, text?: string, at?: number, w?: number, parts?: { all, icon }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "icon"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Prop",
  "group": "OBJECTS",
  "does": "any object picture (drawn or a photo cut-out), standing with a soft contact shadow",
  "props": "image: string, height?: number, at?: number, float?: boolean, parts?: { all, picture }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "picture"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "IconBadge",
  "group": "OBJECTS",
  "does": "a round icon badge (a symbol in a coloured circle)",
  "props": "glyph: string, label?: string, at?: number, size?: number, color?: string, parts?: { all, badge }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "badge"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Emoji",
  "group": "OBJECTS",
  "does": "a big emoji sticker with a white border, that wobbles in",
  "props": "char: string, size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "LogoMark",
  "group": "OBJECTS",
  "does": "a brand mark: a shape and a word that build up (for a company or a product)",
  "props": "name: string, at?: number, color?: string, parts?: { all, mark }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "mark"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Parcel",
  "group": "OBJECTS",
  "does": "a cardboard parcel whose flaps open and something pops out",
  "props": "at?: number, size?: number, inside?: string, parts?: { all, inside, box }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "inside",
   "box"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "PaperStage",
  "group": "SETS (full-frame worlds)",
  "does": "a toy-theatre paper stage: curtains part, wings and a floor",
  "props": "at?: number, color?: string, parts?: { all, background, floor, curtain, valance }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "floor",
   "curtain",
   "valance"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Room",
  "group": "SETS (full-frame worlds)",
  "does": "a room: wall, floor, a window whose light moves across the floor",
  "props": "at?: number, wall?: string, floor?: string, parts?: { all, background, window, floor, skirting }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "window",
   "floor",
   "skirting"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Street",
  "group": "SETS (full-frame worlds)",
  "does": "a street: house fronts on two depths sliding past at different speeds, a road",
  "props": "at?: number, speed?: number, parts?: { all, background, house, road }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "house",
   "road"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Landscape",
  "group": "SETS (full-frame worlds)",
  "does": "a landscape: layered hills in aerial perspective, drifting clouds, a sun",
  "props": "at?: number, sky?: [string, string], parts?: { all, background, hill, sun, cloud }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "hill",
   "sun",
   "cloud"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Space",
  "group": "SETS (full-frame worlds)",
  "does": "deep space: stars at three depths drifting, a planet turning",
  "props": "at?: number, parts?: { all, background, stars, planet }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "stars",
   "planet"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "Studio",
  "group": "SETS (full-frame worlds)",
  "does": "a news-studio set: a desk, a big screen behind, sweeping lights",
  "props": "at?: number, screen?: ReactNode, parts?: { all, background, screen, desk }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "screen",
   "desk"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "GradientGround",
  "group": "SETS (full-frame worlds)",
  "does": "an abstract colour ground: slow soft blobs of the theme's colours moving",
  "props": "at?: number, parts?: { all, background }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "TitleCard",
  "group": "TEXT",
  "does": "a title card: a line draws, the title rises, the subtitle follows",
  "props": "title: string, sub?: string, at?: number, size?: number, parts?: { all, line }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "line"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "PointerLabel",
  "group": "TEXT",
  "does": "a label pinned to a point with a leader line",
  "props": "x: number, y: number, text: string, dx?: number, dy?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "ChapterHeading",
  "group": "TEXT",
  "does": "a chapter heading: a big number and the chapter's name wipe in",
  "props": "n: number, title: string, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "QuoteCard",
  "group": "TEXT",
  "does": "a quote card with big quotation marks and who said it",
  "props": "text: string, who: string, at?: number, w?: number, parts?: { all, marks }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "marks"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "ListReveal",
  "group": "TEXT",
  "does": "a list whose points come in one by one, each ticked",
  "props": "items: string[], at?: number, per?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "LowerThird",
  "group": "TEXT",
  "does": "a lower third: the name and role of who is on screen",
  "props": "name: string, role?: string, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-c.tsx",
  "name": "KineticWords",
  "group": "TEXT",
  "does": "words slam in one at a time, big, with weight (kinetic type)",
  "props": "words: string[], at?: number, per?: number, size?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Face",
  "group": "CHARACTERS",
  "does": "a face: eyes that blink, brows and a mouth for each feeling; the mouth opens and closes while talking",
  "props": "emotion?: \"neutral\" | \"happy\" | \"sad\" | \"angry\" | \"scared\" | \"surprised\" | \"thinking\" | \"laughing\" | \"worried\" | \"proud\", size?: number, skin?: string, talking?: boolean, gaze?: number, seed?: number, parts?: { all, mouth }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "mouth"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Character",
  "group": "CHARACTERS",
  "does": "a drawn person: a face that shows a feeling, a mouth that talks on the words (its shape follows each sound), arms and legs doing an action (walk, run, sit, jump, climb, wave, point… or with someone: handshake, hug, highfive, give), clothes for a job or a dress (saree, kurta, sikh turban, kid, grandma). `talkFrom`/`talkTo` (s) make it talk then; otherwise it talks whenever the scene's voice speaks if `talks`. Move it about with <Go> or any motion.",
  "props": "emotion?: \"neutral\" | \"happy\" | \"sad\" | \"angry\" | \"scared\" | \"surprised\" | \"thinking\" | \"laughing\" | \"worried\" | \"proud\", action?: \"stand\" | \"wave\" | \"point\" | \"think\" | \"facepalm\" | \"cheer\" | \"shrug\" | \"talk\" | \"cross\" | \"hold\" | \"walk\" | \"run\" | \"sit\" | \"jump\" | \"climb\" | \"handshake\" | \"hug\" | \"highfive\" | \"give\", job?: \"none\" | \"doctor\" | \"teacher\" | \"soldier\" | \"farmer\" | \"police\" | \"chef\" | \"worker\" | \"business\" | \"student\" | \"scientist\" | \"judge\" | \"nurse\" | \"elder\" | \"saree\" | \"kurta\" | \"sikh\" | \"kid\" | \"grandma\", height?: number, skin?: string, hair?: string, at?: number, talks?: boolean, talkFrom?: number, talkTo?: number, face?: 1 | -1, gaze?: number, seed?: number, speed?: number, parts?: { all, legs, armL, torso, hold, head, hat }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "legs",
   "armL",
   "torso",
   "hold",
   "head",
   "hat"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Mascot",
  "group": "CHARACTERS",
  "does": "a host or mascot: a round friendly figure that bobs, blinks and talks with the voice (a channel's presenter)",
  "props": "size?: number, color?: string, emotion?: \"neutral\" | \"happy\" | \"sad\" | \"angry\" | \"scared\" | \"surprised\" | \"thinking\" | \"laughing\" | \"worried\" | \"proud\", at?: number, talks?: boolean, parts?: { all, body, face }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "body",
   "face"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Animal",
  "group": "CHARACTERS",
  "does": "an animal, drawn: dog, cat, bird, cow, elephant, fish, lion, horse; it idles (tail, wings, fins)",
  "props": "kind: \"dog\" | \"cat\" | \"bird\" | \"cow\" | \"elephant\" | \"fish\" | \"lion\" | \"horse\", size?: number, at?: number, face?: 1 | -1, color?: string, parts?: { all, body }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "body"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "ComicBubble",
  "group": "CHARACTERS",
  "does": "a comic speech, thought or shout bubble with words that type out; `tail` says where the speaker is",
  "props": "text: string, kind?: \"speech\" | \"thought\" | \"shout\" | \"whisper\", at?: number, w?: number, tail?: \"bl\" | \"br\" | \"tl\" | \"tr\", size?: number, parts?: { all, bubble }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "bubble"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Classroom",
  "group": "SETS",
  "does": "a classroom: a green board (with `board` text written on it), desks in rows, a window",
  "props": "board?: string, at?: number, parts?: { all, background, ground, board, writing, window, floor, desks }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "board",
   "writing",
   "window",
   "floor",
   "desks"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Office",
  "group": "SETS",
  "does": "an office: a desk with a computer, a window on the city, a plant, a wall clock",
  "props": "at?: number, screen?: ReactNode, parts?: { all, background, ground, window, skyline, clock, floor, desk, monitor, screen, plant }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "window",
   "skyline",
   "clock",
   "floor",
   "desk",
   "monitor",
   "screen",
   "plant"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Hospital",
  "group": "SETS",
  "does": "a hospital: a bed, a heart monitor beeping, a drip stand, pale green walls",
  "props": "at?: number, parts?: { all, background, ground, floor, bed, pillow, monitor, heartbeat, beep, drip }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "floor",
   "bed",
   "pillow",
   "monitor",
   "heartbeat",
   "beep",
   "drip"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Courtroom",
  "group": "SETS",
  "does": "a courtroom: the judge's bench, the scales of justice, wood panels and a gavel",
  "props": "at?: number, gavel?: number, parts?: { all, background, ground, scales, bench, floor, gavel }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "scales",
   "bench",
   "floor",
   "gavel"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Kitchen",
  "group": "SETS",
  "does": "a kitchen: tiles, a stove with a pot steaming, shelves with jars",
  "props": "at?: number, parts?: { all, background, ground, shelf, jars, counter, stove, pot, steam }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "shelf",
   "jars",
   "counter",
   "stove",
   "pot",
   "steam"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Market",
  "group": "SETS",
  "does": "a market: stalls with awnings and goods, people passing (a bazaar, a mandi, a shop street)",
  "props": "at?: number, parts?: { all, background, ground, stalls, street, people }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "stalls",
   "street",
   "people"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Factory",
  "group": "SETS",
  "does": "a factory: sawtooth roofs, chimneys with smoke, a gear turning",
  "props": "at?: number, parts?: { all, background, ground, chimneys, smoke, roof, building, gear, yard }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "chimneys",
   "smoke",
   "roof",
   "building",
   "gear",
   "yard"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Farm",
  "group": "SETS",
  "does": "a farm: fields in rows, a barn, a tractor that drives along, the sun",
  "props": "at?: number, parts?: { all, background, ground, sun, fields, barn, tractor }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "sun",
   "fields",
   "barn",
   "tractor"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Village",
  "group": "SETS",
  "does": "a village: huts with thatched roofs, a well, trees and a dirt path",
  "props": "at?: number, parts?: { all, background, ground, path, huts, trees }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "path",
   "huts",
   "trees"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "CityNight",
  "group": "SETS",
  "does": "a city at night: lit windows that flicker on, a moon, traffic lights streaking along the road",
  "props": "at?: number, parts?: { all, background, ground, moon, buildings, road, traffic }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "moon",
   "buildings",
   "road",
   "traffic"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Battlefield",
  "group": "SETS",
  "does": "a battlefield: smoke drifting, a ruined wall, scorched ground, a dark red sky",
  "props": "at?: number, parts?: { all, background, ground, smoke, ruin, earth, craters }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "smoke",
   "ruin",
   "earth",
   "craters"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Underwater",
  "group": "SETS",
  "does": "underwater: light from the surface, bubbles rising, fish passing, sea plants swaying",
  "props": "at?: number, parts?: { all, background, ground, lightRays, bubbles, fish, plants, seabed }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "lightRays",
   "bubbles",
   "fish",
   "plants",
   "seabed"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Desert",
  "group": "SETS",
  "does": "a desert: dunes, a blazing sun, a cactus, heat in the air",
  "props": "at?: number, parts?: { all, background, ground, sun, dunes, cactus }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "sun",
   "dunes",
   "cactus"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Forest",
  "group": "SETS",
  "does": "a forest: layers of trees in depth, mist, light through the leaves",
  "props": "at?: number, parts?: { all, background, ground, trees, mist }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "trees",
   "mist"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Mountains",
  "group": "SETS",
  "does": "mountains: peaks with snow, layered ranges, a lake below",
  "props": "at?: number, parts?: { all, background, ground, peaks }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "peaks"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Temple",
  "group": "SETS",
  "does": "a temple or monument front: steps, columns, a dome or a shikhara spire; `kind` picks the shape",
  "props": "kind?: \"columns\" | \"dome\" | \"spire\", at?: number, parts?: { all, background, ground, steps, columns, dome, spire }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "steps",
   "columns",
   "dome",
   "spire"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Lab",
  "group": "SETS",
  "does": "a laboratory: benches, flasks bubbling, a microscope, a shelf of bottles",
  "props": "at?: number, parts?: { all, background, ground, shelf, bottles, floor, microscope, flask, bubbles }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "shelf",
   "bottles",
   "floor",
   "microscope",
   "flask",
   "bubbles"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Stadium",
  "group": "SETS",
  "does": "a stadium: stands full of a cheering crowd, floodlights, a green pitch with lines",
  "props": "at?: number, parts?: { all, background, ground, lights, crowd, pitch }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "lights",
   "crowd",
   "pitch"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Cave",
  "group": "SETS",
  "does": "a cave: dark rock walls, a torch's flickering light, drips",
  "props": "at?: number, parts?: { all, background, ground, torchlight, rock, torch, drips }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "torchlight",
   "rock",
   "torch",
   "drips"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "VehicleInside",
  "group": "SETS",
  "does": "inside a vehicle looking out: a car's dashboard, a train's window or a plane's porthole, the world rushing past",
  "props": "kind?: \"car\" | \"train\" | \"plane\", at?: number, speed?: number, parts?: { all, outside }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "outside"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Vehicle",
  "group": "VEHICLES and OBJECTS",
  "does": "a vehicle, drawn, that can drive across (wheels turning, a bounce): car, bus, truck, train, plane, ship, rocket, bike, auto (rickshaw)",
  "props": "kind: \"car\" | \"bus\" | \"truck\" | \"train\" | \"plane\" | \"ship\" | \"rocket\" | \"bike\" | \"auto\", size?: number, color?: string, at?: number, from?: number, to?: number, dur?: number, y?: number, parts?: { all, body }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "body"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Building",
  "group": "VEHICLES and OBJECTS",
  "does": "a building, drawn: house, hut, tower block, skyscraper, shop, school, hospital, bank, factory; windows light up",
  "props": "kind?: \"house\" | \"hut\" | \"tower\" | \"skyscraper\" | \"shop\" | \"school\" | \"hospital\" | \"bank\" | \"factory\", size?: number, color?: string, at?: number, lit?: number, parts?: { all, building }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "building"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "RupeeNotes",
  "group": "VEHICLES and OBJECTS",
  "does": "Indian rupee notes: a stack that grows, a fan, or notes that fly out (money paid, saved, lost)",
  "props": "amount?: 10 | 20 | 50 | 100 | 200 | 500 | 2000, count?: number, mode?: \"stack\" | \"fan\" | \"fly\", at?: number, size?: number, parts?: { all, note }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "note"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "GoldBar",
  "group": "VEHICLES and OBJECTS",
  "does": "a gold bar (or a stack of them) that gleams (gold prices, treasure, a reserve)",
  "props": "count?: number, size?: number, at?: number, parts?: { all, bar }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "bar"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "BigArrow",
  "group": "SYMBOLS",
  "does": "a big bold arrow (straight, curved, up-trend, down-trend, u-turn, circular) that draws itself",
  "props": "kind?: \"right\" | \"left\" | \"up\" | \"down\" | \"curve\" | \"trend-up\" | \"trend-down\" | \"uturn\" | \"cycle\", size?: number, color?: string, at?: number, dur?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "TickCross",
  "group": "SYMBOLS",
  "does": "a tick or a cross that draws itself in a circle (right/wrong, yes/no, done/failed)",
  "props": "ok?: boolean, size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "WarningSign",
  "group": "SYMBOLS",
  "does": "a warning sign that pops in and flashes (danger, caution, stop, no entry, radiation, electricity)",
  "props": "kind?: \"caution\" | \"stop\" | \"no\" | \"radiation\" | \"electric\" | \"fire\", size?: number, at?: number, text?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "StarRating",
  "group": "SYMBOLS",
  "does": "a star rating that fills star by star up to `value` of 5 (reviews, ratings, quality)",
  "props": "value?: number, size?: number, at?: number, label?: string, parts?: { all, star }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "star"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Trophy",
  "group": "SYMBOLS",
  "does": "a trophy or medal that drops in and shines (a winner, first place, an award)",
  "props": "kind?: \"trophy\" | \"gold\" | \"silver\" | \"bronze\", size?: number, at?: number, label?: string, parts?: { all, cup }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "cup"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Flag",
  "group": "SYMBOLS",
  "does": "a country's flag that waves in the wind (India, United States, United Kingdom, France, Germany, Japan, China, Pakistan…)",
  "props": "country: string, w?: number, at?: number, wave?: boolean, parts?: { all, cloth }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "cloth"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Lightbulb",
  "group": "SYMBOLS",
  "does": "a light bulb that switches on with a glow (an idea, an insight, electricity)",
  "props": "size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "QuestionMark",
  "group": "SYMBOLS",
  "does": "a big question mark (or ! or ?!) that wobbles in (a mystery, a question to the viewer)",
  "props": "glyph?: \"?\" | \"!\" | \"?!\", size?: number, at?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-d.tsx",
  "name": "Reactions",
  "group": "SYMBOLS",
  "does": "reaction icons that float up and fade (likes, hearts, laughs, claps) from a point, like a live stream",
  "props": "x: number, y: number, kinds?: string[], at?: number, rate?: number, parts?: { all, reaction }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "reaction"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "Waterfall",
  "group": "DATA",
  "does": "a waterfall: a start value, rises and falls stepping across, to the end total (a profit and loss, a budget gap)",
  "props": "steps: { label: string; value: number; total?: boolean }[], w?: number, h?: number, at?: number, per?: number, unit?: string, parts?: { all, bar }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "bar"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "Treemap",
  "group": "DATA",
  "does": "a treemap: one rectangle split into blocks sized by value (a market by company, a budget by ministry)",
  "props": "items: { label: string; value: number; color?: string }[], w?: number, h?: number, at?: number, parts?: { all, tile }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "tile"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "RadarChart",
  "group": "DATA",
  "does": "a radar (spider) chart: several qualities on spokes, one or two shapes grow out to their scores (a player, a phone)",
  "props": "axes: string[], series: { label: string; values: number[]; color?: string }[], size?: number, at?: number, max?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "Histogram",
  "group": "DATA",
  "does": "a histogram: values counted into ranges, bars rise (marks in an exam, incomes, ages)",
  "props": "values: number[], bins?: number, w?: number, h?: number, at?: number, label?: string, parts?: { all, bar }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "bar"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "PopulationPyramid",
  "group": "DATA",
  "does": "a population pyramid: men on the left, women on the right, by age band; it can morph from one year to another",
  "props": "bands: string[], years: { label: string; men: number[]; women: number[] }[], w?: number, at?: number, per?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "SlopeChart",
  "group": "DATA",
  "does": "a slope chart: each thing's value then and now joined by a line (who rose, who fell between two years)",
  "props": "items: { label: string; a: number; b: number }[], left?: string, right?: string, w?: number, h?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "BumpChart",
  "group": "DATA",
  "does": "a bump chart: ranks over several years, lines cross as places change (league tables, top economies)",
  "props": "periods: string[], series: { label: string; ranks: number[]; color?: string }[], w?: number, h?: number, at?: number, dur?: number, parts?: { all, marker }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "marker"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "Gantt",
  "group": "DATA",
  "does": "a Gantt chart: tasks as bars across a time axis, filling in as they happen (a project plan, a war's campaigns)",
  "props": "tasks: { label: string; start: number; end: number; color?: string }[], periods: string[], w?: number, at?: number, per?: number, parts?: { all, bar }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "bar"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "WordCloud",
  "group": "DATA",
  "does": "a word cloud: words sized by weight pop in around the middle (what people said, the themes of a speech)",
  "props": "words: { text: string; weight: number }[], w?: number, h?: number, at?: number, parts?: { all, word }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "word"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "IconRows",
  "group": "DATA",
  "does": "icon rows (isotype): one icon stands for N; rows fill so amounts compare at a glance (people, trees, cars)",
  "props": "rows: { label: string; value: number; icon?: string }[], icon?: string, per?: number, w?: number, at?: number, size?: number, parts?: { all, icon }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "icon"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "ProgressRing",
  "group": "DATA",
  "does": "a ring that fills round to a percentage with the number in the middle (a goal reached, a share, a battery)",
  "props": "value: number, size?: number, at?: number, dur?: number, label?: string, color?: string, parts?: { all, center }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "center"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "ButterflyBars",
  "group": "DATA",
  "does": "butterfly bars: two groups compared side by side on each row, bars going left and right (men vs women, 2010 vs 2020)",
  "props": "rows: { label: string; a: number; b: number }[], left: string, right: string, w?: number, at?: number, parts?: { all, barA, barB }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "barA",
   "barB"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "EmiTable",
  "group": "FINANCE",
  "does": "an EMI table: a loan's monthly payment worked out, with rows of interest and principal paid down (how a loan works)",
  "props": "principal: number, rate: number, years: number, at?: number, rows?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "CreditScore",
  "group": "FINANCE",
  "does": "a credit score meter: a needle swings to the score on red-to-green bands (a CIBIL score)",
  "props": "score: number, size?: number, at?: number, lo?: number, hi?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "TaxSlabs",
  "group": "FINANCE",
  "does": "income tax slabs: steps of income with their rate, the viewer's income fills them and the tax adds up",
  "props": "slabs: { upto: number | null; rate: number }[], income: number, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "SalarySlip",
  "group": "FINANCE",
  "does": "a salary slip: earnings and deductions line by line, net pay at the bottom (where your salary goes)",
  "props": "name?: string, month?: string, earnings: [string, number][], deductions: [string, number][], at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "Invoice",
  "group": "FINANCE",
  "does": "an invoice or bill: items, quantities and prices, GST, a total and a PAID stamp",
  "props": "items: { item: string; qty: number; price: number }[], gst?: number, at?: number, paid?: number, w?: number, from?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "Cheque",
  "group": "FINANCE",
  "does": "a bank cheque being filled in: payee, the amount in figures and words, then a signature",
  "props": "payee: string, amount: number, words: string, bank?: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "UpiPayment",
  "group": "FINANCE",
  "does": "a UPI payment on a phone screen: amount, scanning, a spinner, then the tick and \"Paid\" (how digital payments work)",
  "props": "amount: number, to?: string, at?: number, h?: number, parts?: { all, qr }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "qr"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "CryptoCoin",
  "group": "FINANCE",
  "does": "a crypto coin that spins in 3D with its price ticking and jumping (bitcoin, volatility)",
  "props": "symbol?: string, price?: number, swing?: number, size?: number, at?: number, color?: string, parts?: { all, coin }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "coin"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "HousePrice",
  "group": "FINANCE",
  "does": "a house with a price tag that climbs year by year (property prices, rent, a home loan)",
  "props": "points: { year: string; price: number }[], at?: number, per?: number, size?: number, parts?: { all, house }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "house"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "MetroMap",
  "group": "MAPS that are not the world map",
  "does": "a metro or rail map: coloured lines with stations, a train dot travels a line (routes, a network, a journey)",
  "props": "lines: { name: string; color: string; stops: { name: string; x: number; y: number }[] }[], at?: number, dur?: number, ride?: number, parts?: { all, station }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "station"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "CityMap",
  "group": "MAPS that are not the world map",
  "does": "a city street grid from above: blocks, roads, a park and a river; a route can be drawn through it",
  "props": "w?: number, h?: number, at?: number, route?: [number, number][], seed?: number, parts?: { all, background, ground, blocks, river, marker }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "blocks",
   "river",
   "marker"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "FloorPlan",
  "group": "MAPS that are not the world map",
  "does": "a floor plan / blueprint: rooms drawn on in white lines on blue, with labels and a door swing",
  "props": "rooms: { name: string; x: number; y: number; w: number; h: number }[], w?: number, h?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "Terrain",
  "group": "MAPS that are not the world map",
  "does": "terrain in profile: the height of the land along a line (a mountain pass, a river valley, a trek), drawn on",
  "props": "heights: number[], labels?: { at: number; text: string }[], w?: number, h?: number, at?: number, unit?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "WeatherMap",
  "group": "MAPS that are not the world map",
  "does": "a weather map: pressure lines, a storm that spins, rain and sun symbols with temperatures over a region",
  "props": "w?: number, h?: number, at?: number, storm?: [number, number], cities?: { name: string; x: number; y: number; temp: number; icon: string }[], parts?: { all, background, ground, icon }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "icon"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "RaisedMap",
  "group": "MAPS that are not the world map",
  "does": "a raised 3D map: the map tilts back and each country rises as a column by its value (GDP, population, emissions)",
  "props": "map?: MapView, values: Record<string, number>, at?: number, color?: string, scale?: number, parts?: { all, column }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "column"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "OldMap",
  "group": "MAPS that are not the world map",
  "does": "an old map look over any map: parchment, sepia, burnt edges, a compass rose and sea monsters' coast (history)",
  "props": "children: ReactNode, w?: number, h?: number, compass?: boolean",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-e.tsx",
  "name": "DistanceRuler",
  "group": "MAPS that are not the world map",
  "does": "a distance ruler drawn between two points with the distance counting up (how far apart two places are)",
  "props": "from: [number, number], to: [number, number], km: number, at?: number, dur?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Organ",
  "group": "BODY and SCIENCE",
  "does": "an organ, drawn and alive: heart (beats), lungs (breathe), brain (sparks), stomach (churns), kidney, liver, eye, tooth",
  "props": "kind: \"heart\" | \"lungs\" | \"brain\" | \"stomach\" | \"kidney\" | \"liver\" | \"eye\" | \"tooth\", size?: number, at?: number, label?: boolean, parts?: { all, organ }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "organ"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "BodyMap",
  "group": "BODY and SCIENCE",
  "does": "a body outline with its organs in place; `glow` lights the ones the voice is about (where it hurts, what a food does)",
  "props": "glow?: (\"brain\" | \"heart\" | \"lungs\" | \"stomach\" | \"liver\" | \"kidney\")[], height?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Skeleton",
  "group": "BODY and SCIENCE",
  "does": "a skeleton that idles (its jaw can chatter) for anatomy, ageing, a spooky moment",
  "props": "height?: number, at?: number, chatter?: boolean, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "DnaHelix",
  "group": "BODY and SCIENCE",
  "does": "a DNA double helix that turns, its base pairs flashing (genes, heredity, biotech)",
  "props": "w?: number, h?: number, at?: number, pairs?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Microbe",
  "group": "BODY and SCIENCE",
  "does": "a microbe: a virus with spikes, a rod bacterium with flagella, or an amoeba that wobbles (disease, immunity)",
  "props": "kind?: \"virus\" | \"bacteria\" | \"amoeba\", size?: number, at?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Neuron",
  "group": "BODY and SCIENCE",
  "does": "a nerve cell: a body with branching dendrites and an axon, signals running down it (thought, pain, reflex)",
  "props": "w?: number, h?: number, at?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Atom",
  "group": "BODY and SCIENCE",
  "does": "an atom (Bohr model): a nucleus and electrons orbiting in shells; `element` gives the right number in each shell",
  "props": "protons?: number, size?: number, at?: number, label?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Circuit",
  "group": "BODY and SCIENCE",
  "does": "a simple circuit: a battery, a switch, a bulb; when the switch closes current flows (dots run) and the bulb lights",
  "props": "w?: number, h?: number, at?: number, close?: number, parts?: { all, bulb }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "bulb"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "MagnetField",
  "group": "BODY and SCIENCE",
  "does": "a magnet with its field lines curving from pole to pole, iron filings shimmering along them",
  "props": "size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "VitalsMonitor",
  "group": "BODY and SCIENCE",
  "does": "a medical monitor: heart rate, oxygen and blood pressure numbers ticking beside a beating line",
  "props": "bpm?: number, spo2?: number, bp?: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "XRay",
  "group": "BODY and SCIENCE",
  "does": "an X-ray view: a photo turns into a glowing negative and a scan line sweeps down it (looking inside)",
  "props": "image: string, w?: number, h?: number, at?: number, parts?: { all, photo }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "photo"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "MicroscopeView",
  "group": "BODY and SCIENCE",
  "does": "a view down a microscope: a round lens with cells drifting and dividing in it (biology, a lab test)",
  "props": "size?: number, at?: number, color?: string, parts?: { all, cell }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "cell"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "ElementTile",
  "group": "BODY and SCIENCE",
  "does": "a periodic-table tile for an element: number, symbol, name and mass (chemistry)",
  "props": "n: number, symbol: string, name: string, mass: string, size?: number, at?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "NumberLine",
  "group": "MATHS and EDUCATION",
  "does": "a number line with ticks; points hop along it from one value to the next (adding, negative numbers, a jump of +5)",
  "props": "from?: number, to?: number, hops?: number[], w?: number, at?: number, per?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "FunctionGraph",
  "group": "MATHS and EDUCATION",
  "does": "a graph of a function on axes with a grid: the curve draws itself (y = x², sin x, growth and decay)",
  "props": "fn: (x: number) => number, xMin?: number, xMax?: number, yMin?: number, yMax?: number, w?: number, h?: number, at?: number, dur?: number, label?: string, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Geometry",
  "group": "MATHS and EDUCATION",
  "does": "a triangle (or polygon) draws itself, then its angles and side lengths appear (geometry, Pythagoras)",
  "props": "points?: [number, number][], labels?: string[], sides?: string[], angles?: string[], at?: number, w?: number, h?: number, rightAngle?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Fraction",
  "group": "MATHS and EDUCATION",
  "does": "a fraction shown as a pie or a bar: parts fill one by one (3/4, sharing a pizza, a share of votes)",
  "props": "top: number, bottom: number, kind?: \"pie\" | \"bar\", size?: number, at?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Blackboard",
  "group": "MATHS and EDUCATION",
  "does": "a blackboard or whiteboard: chalk (or marker) lines of working written one after another (a lesson, a proof)",
  "props": "lines: string[], at?: number, per?: number, kind?: \"chalk\" | \"white\", w?: number, h?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "NotebookPage",
  "group": "MATHS and EDUCATION",
  "does": "a notebook page: ruled lines, a margin, and handwritten notes that appear line by line, with a highlighted line",
  "props": "lines: string[], at?: number, per?: number, mark?: number, w?: number, h?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Flashcard",
  "group": "MATHS and EDUCATION",
  "does": "a flashcard: the question on the front flips over to the answer on the back (revision, a quiz)",
  "props": "front: string, back: string, at?: number, flip?: number, w?: number, h?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "DefinitionCard",
  "group": "MATHS and EDUCATION",
  "does": "a dictionary-style definition card: the term, how it is said, its kind, the meaning, and an example",
  "props": "term: string, say?: string, kind?: string, meaning: string, example?: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "BrowserWindow",
  "group": "TECH",
  "does": "a browser window with tabs, an address bar that types the URL, and a page that loads in",
  "props": "url?: string, title?: string, children?: ReactNode, at?: number, w?: number, h?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "ChatApp",
  "group": "TECH",
  "does": "a chat app conversation: bubbles arrive left and right with typing dots before each (WhatsApp-style)",
  "props": "messages: { from: \"me\" | \"them\"; text: string }[], at?: number, per?: number, w?: number, h?: number, title?: string, parts?: { all, message }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "message"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "SearchResults",
  "group": "TECH",
  "does": "a search page: a query typed into a search box, then result cards drop in one by one",
  "props": "query: string, results: { title: string; url: string; snippet: string }[], at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Terminal",
  "group": "TECH",
  "does": "a terminal window: commands typed after a prompt and their output lines (hacking, coding, a server)",
  "props": "lines: { cmd?: string; out?: string }[], at?: number, per?: number, w?: number, h?: number, title?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Dashboard",
  "group": "TECH",
  "does": "a dashboard: number cards and small sparklines that update (a company's metrics, live results, a control room)",
  "props": "cards: { label: string; value: number; unit?: string; trend?: number[] }[], at?: number, w?: number, parts?: { all, card }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "card"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Robot",
  "group": "TECH",
  "does": "a friendly robot that blinks, waves its arm and has a screen face (AI, automation, a helper)",
  "props": "size?: number, at?: number, talks?: boolean, color?: string, parts?: { all, head, body }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "head",
   "body"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Database",
  "group": "TECH",
  "does": "a database (stacked cylinders) with records flowing in and lighting it up (storage, data, a backend)",
  "props": "size?: number, at?: number, color?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "SecurityShield",
  "group": "TECH",
  "does": "a shield with a padlock that snaps shut (security, privacy, protection); `broken` cracks it instead (a breach)",
  "props": "size?: number, at?: number, broken?: boolean, parts?: { all, shield }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "shield"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "VideoCall",
  "group": "TECH",
  "does": "a video call grid: tiles of people (initials or photos), the one who speaks gets a lit border (a meeting, a class)",
  "props": "people: { name: string; image?: string; color?: string }[], speaker?: number, at?: number, w?: number, h?: number, parts?: { all, tile }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "tile"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "EmailCard",
  "group": "TECH",
  "does": "an email arriving: from, subject and the opening lines, with an unread dot (news, a job offer, a scam warning)",
  "props": "from: string, subject: string, body: string, at?: number, w?: number, flag?: \"spam\" | \"important\", parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "NewsTicker",
  "group": "DOCUMENTS and NEWS",
  "does": "a breaking-news bar with a red label and a ticker of headlines scrolling along the bottom of the frame",
  "props": "label?: string, items: string[], at?: number, speed?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "TvFrame",
  "group": "DOCUMENTS and NEWS",
  "does": "an old television set showing whatever is inside, with scan lines and a power-on flicker (archive news, the 80s)",
  "props": "children: ReactNode, at?: number, w?: number, retro?: boolean",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Polaroid",
  "group": "DOCUMENTS and NEWS",
  "does": "a polaroid photo that drops onto the table, with a handwritten caption",
  "props": "image: string, caption?: string, at?: number, w?: number, tilt?: number, parts?: { all, photo }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "photo"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "PhotoAlbum",
  "group": "DOCUMENTS and NEWS",
  "does": "a photo album: pages of photos turn one after another (a life, a family, memories)",
  "props": "images: string[], captions?: string[], at?: number, per?: number, w?: number, parts?: { all, photo }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "photo"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "StickyNotes",
  "group": "DOCUMENTS and NEWS",
  "does": "sticky notes slap onto a wall one after another, slightly crooked, with handwritten points (ideas, a plan, a to-do)",
  "props": "notes: string[], at?: number, per?: number, cols?: number, size?: number, parts?: { all, note }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "note"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "CorkBoard",
  "group": "DOCUMENTS and NEWS",
  "does": "an evidence board: photos and notes pinned to cork, red string drawn between them one link at a time (a mystery, a case)",
  "props": "items: { x: number; y: number; image?: string; text?: string }[], links: [number, number][], at?: number, w?: number, h?: number, parts?: { all, photo }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "photo"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "CaseFile",
  "group": "DOCUMENTS and NEWS",
  "does": "a case file folder: it opens to show a mugshot-style photo, fields and a CONFIDENTIAL stamp (crime, spies, a dossier)",
  "props": "title?: string, image?: string, fields: [string, string][], at?: number, w?: number, parts?: { all, photo }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "photo"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "IdCard",
  "group": "DOCUMENTS and NEWS",
  "does": "an identity card or passport page: photo, name, number, a stamp (identity, citizenship, a visa)",
  "props": "kind?: \"id\" | \"passport\", name: string, number: string, image?: string, country?: string, at?: number, w?: number, parts?: { all, photo }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "photo"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Certificate",
  "group": "DOCUMENTS and NEWS",
  "does": "a certificate with a border, a title, a name written in, a gold seal and signatures (an award, a degree)",
  "props": "title?: string, name: string, reason?: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Ticket",
  "group": "DOCUMENTS and NEWS",
  "does": "a ticket (train, plane, cinema, concert) with a perforated stub that tears off",
  "props": "kind?: \"train\" | \"plane\" | \"cinema\", from?: string, to?: string, date?: string, seat?: string, at?: number, tear?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "WantedPoster",
  "group": "DOCUMENTS and NEWS",
  "does": "a WANTED poster: an old paper with a photo, a name and a reward (outlaws, a hunt, a mystery)",
  "props": "name: string, reward: string, image?: string, at?: number, w?: number, parts?: { all, photo }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "photo"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "VideoPlayer",
  "group": "MEDIA",
  "does": "a video player: a frame with a play button that is pressed, a progress bar that runs, the time counting",
  "props": "children?: ReactNode, at?: number, play?: number, dur?: number, w?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "PodcastMic",
  "group": "MEDIA",
  "does": "a podcast microphone on a stand with a live sound wave and an ON AIR light (talk shows, interviews)",
  "props": "size?: number, at?: number, live?: boolean, parts?: { all, mic }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "mic"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "FilmStrip",
  "group": "MEDIA",
  "does": "a strip of film running past with pictures in its frames (cinema, memories, archive footage)",
  "props": "images: string[], at?: number, speed?: number, h?: number, vertical?: boolean, parts?: { all, frame }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "frame"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "RecFrame",
  "group": "MEDIA",
  "does": "a camera's viewfinder over the shot: corner marks, REC blinking, a timecode and the battery (found footage, a vlog)",
  "props": "children?: ReactNode, at?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "ComicPanels",
  "group": "MEDIA",
  "does": "comic panels: a page of boxes that fill in one by one, each with its own picture or drawing and a caption",
  "props": "panels: { node?: ReactNode; image?: string; caption?: string }[], at?: number, per?: number, w?: number, h?: number, parts?: { all, panel }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "panel"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "StatCallout",
  "group": "TEXT",
  "does": "a stat callout: a big number with a short line under it, popping in next to what it describes",
  "props": "value: string, line: string, at?: number, color?: string, align?: \"left\" | \"center\", parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "SourceNote",
  "group": "TEXT",
  "does": "a small source line in the corner (where a number or a photo comes from): honest documentaries show it",
  "props": "text: string, at?: number, corner?: \"bl\" | \"br\", parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "ChapterProgress",
  "group": "TEXT",
  "does": "a chapter progress bar across the top: the film's chapters with the current one lit (where we are in the story)",
  "props": "chapters: string[], current: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "EndCard",
  "group": "TEXT",
  "does": "an end card: thanks, the channel name, a subscribe button that is pressed, and two \"watch next\" boxes",
  "props": "channel?: string, line?: string, next?: string[], at?: number, parts?: { all, tile }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "tile"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "CreditsRoll",
  "group": "TEXT",
  "does": "credits rolling up the screen: roles and names (the end of a film, thanks to sources)",
  "props": "credits: [string, string][], at?: number, speed?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-f.tsx",
  "name": "Backdrop",
  "group": "BACKGROUNDS",
  "does": "a full-screen backdrop texture: chalkboard, blueprint grid, sepia paper, neon night, soft bokeh lights, graph paper, dark noir",
  "props": "kind: \"chalkboard\" | \"blueprint\" | \"sepia\" | \"neon\" | \"bokeh\" | \"graph\" | \"noir\" | \"paper\", parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "IndiaMap",
  "group": "INDIA",
  "does": "India with every state: `values` colours states on a scale (a choropleth: literacy, votes, rainfall), `colors` sets a state's colour outright (an election result); states fill one by one from `at`; `labels` names them; `lift` raises the coloured ones in 3D",
  "props": "w?: number, h?: number, values?: Record<string, number>, colors?: Record<string, string>, at?: number, labels?: boolean, lift?: boolean, scale?: [string, string], legend?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "SeatArc",
  "group": "ELECTIONS",
  "does": "a parliament seat arc (hemicycle): seats fill party by party; a majority line (e.g. 272 of 543)",
  "props": "parties: { name: string; seats: number; color: string }[], total?: number, majority?: number, w?: number, at?: number, per?: number, parts?: { all, seat }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "seat"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Evm",
  "group": "ELECTIONS",
  "does": "an EVM (electronic voting machine): a finger presses a party's button, its light glows and it beeps",
  "props": "candidates: { name: string; symbol: string }[], press?: number, pick?: number, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "VersusCards",
  "group": "ELECTIONS",
  "does": "two candidates (or teams, or products) face off: photo or initials, name, party and a big VS",
  "props": "a: { name: string; sub?: string; image?: string; color?: string }, b: { name: string; sub?: string; image?: string; color?: string }, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "SwingMeter",
  "group": "ELECTIONS",
  "does": "a swing meter: the needle swings toward the party that gained (vote swing in % points)",
  "props": "swing: number, left?: string, right?: string, leftColor?: string, rightColor?: string, at?: number, size?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "TierList",
  "group": "COMPARISONS",
  "does": "a tier list: S, A, B, C, D rows; items drop into their row one by one",
  "props": "tiers: { tier: string; items: string[]; color?: string }[], at?: number, per?: number, w?: number, parts?: { all, item }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "item"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Podium",
  "group": "COMPARISONS",
  "does": "a podium: second, first and third rise, and each name drops onto its step",
  "props": "first: string, second: string, third: string, at?: number, w?: number, parts?: { all, winner, step }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "winner",
   "step"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "ProsCons",
  "group": "COMPARISONS",
  "does": "pros and cons in two columns: ticks and crosses appear point by point",
  "props": "pros: string[], cons: string[], at?: number, per?: number, w?: number, title?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "MythFact",
  "group": "COMPARISONS",
  "does": "myth vs fact: the myth card is stamped MYTH and crossed out, then flips over to the fact",
  "props": "myth: string, fact: string, at?: number, flip?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "ForkRoad",
  "group": "COMPARISONS",
  "does": "a fork in the road: a person walks up to where the path splits; the chosen way lights and the other fades",
  "props": "left: string, right: string, choose?: \"left\" | \"right\", at?: number, decide?: number, parts?: { all, background, ground, walker }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "walker"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "useCricketScore",
  "group": "SPORTS",
  "does": "the cricket score's motion: runs, wickets and overs counting up to their values over `dur` from `at`",
  "props": "team?: string, runs: number, wickets: number, overs: number, target?: number, at?: number, dur?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "CricketScore",
  "group": "SPORTS",
  "does": "a cricket scoreboard: runs, wickets, overs ticking up, the run rate and the target. parts: badge (the team's logo or a picture), background; render(s) draws your own board from the live score",
  "props": "team?: string, runs: number, wickets: number, overs: number, target?: number, at?: number, dur?: number, w?: number, parts?: { badge?: Slot; background?: Slot }, render?: (s: CricketState) => ReactNode",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "useWagonWheel",
  "group": "SPORTS",
  "does": "the wagon wheel's motion: each shot's line grows out from the pitch in turn (x, y = where its line has reached)",
  "props": "shots: Shot[], size?: number, at?: number, per?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "WagonWheel",
  "group": "SPORTS",
  "does": "a cricket wagon wheel: each scoring shot is a line from the pitch out to where it went, coloured by runs. parts: ground (a real stadium from above), pitch; shot(s, i) draws each shot's end your way; render(s) draws it all",
  "props": "shots: Shot[], size?: number, at?: number, per?: number, parts?: { ground?: Slot; pitch?: Slot }, shot?: ItemSlot<WagonState[\"shots\"][number]>, render?: (s: WagonState) => ReactNode, colors?: Partial<Record<1 | 2 | 3 | 4 | 6, string>>",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "usePasses",
  "group": "SPORTS",
  "does": "the football pitch's motion: the ball travels pass by pass from player to player, then `scored` (goalK 0..1 after)",
  "props": "passes: [number, number][], at?: number, per?: number, w?: number, goal?: boolean",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "FootballPitch",
  "group": "SPORTS",
  "does": "a football pitch from above: players, passes drawn one after another, the ball travelling them, then GOAL. parts: ground (a real pitch photo), ball (a real ball), goal (your own GOAL card); player(p, i) draws each player (a photo, a shirt); render(s) draws everything from the live ball and players",
  "props": "passes: [number, number][], at?: number, per?: number, w?: number, goal?: boolean, parts?: { ground?: Slot; ball?: Slot; goal?: Slot }, player?: ItemSlot<{ x: number; y: number }>, render?: (s: PitchState) => ReactNode",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "useMedalTable",
  "group": "SPORTS",
  "does": "the medal table's motion: rows sorted by golds come in one after another, their counts ticking up",
  "props": "rows: MedalRow[], at?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "MedalTable",
  "group": "SPORTS",
  "does": "a medal table: rows of countries with gold, silver and bronze counts ticking up, sorted by golds. Each row's `flag` can be an emoji or a picture. parts: background, header; row(r, i) draws each row your way; render(s) draws it all",
  "props": "rows: MedalRow[], at?: number, w?: number, parts?: { background?: Slot; header?: Slot }, row?: ItemSlot<MedalState[\"rows\"][number]>, render?: (s: MedalState) => ReactNode",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "SupplyDemand",
  "group": "ECONOMY",
  "does": "supply and demand: the two curves cross at the price; `shift` moves demand (+ right) or `supplyShift` moves supply, and the new crossing point slides along",
  "props": "shift?: number, supplyShift?: number, at?: number, w?: number, h?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Iceberg",
  "group": "ECONOMY",
  "does": "an iceberg: what you see above the water, and the much bigger part under it, labelled as the water line lowers",
  "props": "above: string[], below: string[], at?: number, w?: number, h?: number, parts?: { all, sky, water, berg }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "sky",
   "water",
   "berg"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "CartFill",
  "group": "ECONOMY",
  "does": "a shopping cart that fills item by item while the bill adds up (spending, the cost of living)",
  "props": "items: { icon: string; price: number }[], at?: number, per?: number, size?: number, parts?: { all, cart }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "cart"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Thermometer",
  "group": "ECONOMY",
  "does": "a thermometer whose level rises to a temperature (heat, a fever, inflation running hot)",
  "props": "value: number, max?: number, at?: number, h?: number, unit?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "ChaiStall",
  "group": "INDIAN LIFE",
  "does": "a chai stall: a kettle steaming on a stove, glasses lined up, a sign, a bench (street life, small business)",
  "props": "at?: number, sign?: string, parts?: { all, background, ground, kettle }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "ground",
   "kettle"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "useTrain",
  "group": "INDIAN LIFE",
  "does": "the train's motion: it slides in to the platform (arrive) or pulls out and away, easing to a stop or speeding up",
  "props": "at?: number, arrive?: boolean, dur?: number, length?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "RailwayPlatform",
  "group": "INDIAN LIFE",
  "does": "a railway platform: a train pulls in (or out), a station board, the platform edge. parts: background (a real station photo behind), train (a real train picture, long and side-on), board (a station sign), platform (the platform floor); render(s) draws your own scene from the train's position",
  "props": "station?: string, at?: number, arrive?: boolean, dur?: number, parts?: { background?: Slot; train?: Slot; board?: Slot; platform?: Slot }, render?: (s: TrainState) => ReactNode, trainLength?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Diya",
  "group": "INDIAN LIFE",
  "does": "a diya (oil lamp) whose flame flickers, with a soft glow (Diwali, hope, a small light)",
  "props": "size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Rangoli",
  "group": "INDIAN LIFE",
  "does": "a rangoli that draws itself petal ring by petal ring in festival colours",
  "props": "size?: number, at?: number, rings?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "PostThread",
  "group": "SOCIAL MEDIA",
  "does": "a thread of posts (tweets): each slides in with its likes and reposts counting up",
  "props": "name?: string, handle?: string, posts: { text: string; likes?: number }[], at?: number, per?: number, w?: number, parts?: { all, avatar }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "avatar"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "ForumPost",
  "group": "SOCIAL MEDIA",
  "does": "a Reddit-style post: the subreddit, title, body, and an upvote count climbing",
  "props": "community?: string, title: string, body?: string, votes?: number, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "ForwardedMessage",
  "group": "SOCIAL MEDIA",
  "does": "a forwarded WhatsApp message: the \"Forwarded many times\" mark, the text, then a FAKE or VERIFIED stamp",
  "props": "text: string, verdict?: \"fake\" | \"true\", at?: number, stampAt?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "ThumbnailGrid",
  "group": "SOCIAL MEDIA",
  "does": "a grid of video thumbnails (a channel page, search results) that load in, one gets the cursor and a hover lift",
  "props": "items: { title: string; image?: string; views?: string }[], at?: number, cols?: number, w?: number, pick?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "HomeScreen",
  "group": "SOCIAL MEDIA",
  "does": "a phone's home screen: app icons pop in, one gets a notification badge and is tapped open",
  "props": "apps?: string[], badge?: number, tap?: number, at?: number, h?: number, parts?: { all, app }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "app"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "PhotoPost",
  "group": "SOCIAL MEDIA",
  "does": "an Instagram-style post: the photo, a double-tap heart that bursts, likes counting, the caption",
  "props": "image?: string, user?: string, caption?: string, likes?: number, heart?: number, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "HabitGrid",
  "group": "SELF-HELP and PSYCHOLOGY",
  "does": "a 30-day habit grid: days tick off one by one, a streak counter grows; `missed` days stay empty",
  "props": "days?: number, missed?: number[], at?: number, per?: number, title?: string, w?: number, parts?: { all, day }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "day"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "useMood",
  "group": "SELF-HELP and PSYCHOLOGY",
  "does": "the mood meter's motion: a value sliding from `from` to `to` (0 low … 1 great) over `dur`",
  "props": "from?: number, to?: number, at?: number, dur?: number, w?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "MoodMeter",
  "group": "SELF-HELP and PSYCHOLOGY",
  "does": "a mood meter: a marker slides along from low to great (or the reverse); the default marker is a face whose smile follows the value. parts: track (your own bar or a picture), marker (a photo, an emoji, a character), low, high; marker can also be a function of the value, e.g. (v) => v > 0.5 ? happyPhoto : sadPhoto; render(s) draws it all",
  "props": "from?: number, to?: number, at?: number, dur?: number, w?: number, parts?: { track?: Slot; low?: Slot; high?: Slot; marker?: Slot }, marker?: (v: number) => ReactNode, render?: (s: MoodState) => ReactNode",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "GoalStairs",
  "group": "SELF-HELP and PSYCHOLOGY",
  "does": "stairs to a goal: a person climbs step by step, each step labelled, to a flag at the top",
  "props": "steps: string[], at?: number, per?: number, w?: number, h?: number, goal?: string, parts?: { all, goal, climber }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "goal",
   "climber"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "SeaLevel",
  "group": "CLIMATE and SPACE",
  "does": "the sea rises on a coast: water creeps up past marked years, a town at the edge goes under (sea-level rise, floods)",
  "props": "marks?: string[], at?: number, dur?: number, rise?: number, parts?: { all, background, sky, coast }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "sky",
   "coast"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Glacier",
  "group": "CLIMATE and SPACE",
  "does": "a glacier melts and shrinks back up its valley, drips falling, years ticking (before and after)",
  "props": "from?: string, to?: string, at?: number, dur?: number, parts?: { all, background, sky, valley }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "sky",
   "valley"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "RocketLaunch",
  "group": "CLIMATE and SPACE",
  "does": "a rocket launch: countdown, ignition smoke, lift-off, and the stages separating as it climbs",
  "props": "at?: number, count?: number, stages?: number, parts?: { all, background, sky, rocket }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "background",
   "sky",
   "rocket"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "StarMap",
  "group": "CLIMATE and SPACE",
  "does": "a star map: stars twinkle, then the constellation's lines draw between them and its name appears",
  "props": "name?: string, stars?: [number, number][], lines?: [number, number][], at?: number, w?: number, h?: number, parts?: { all, sky }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all",
   "sky"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Tablet",
  "group": "DEVICES and FRAMES",
  "does": "a tablet showing whatever is inside (landscape)",
  "props": "children?: ReactNode, at?: number, w?: number",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Watch",
  "group": "DEVICES and FRAMES",
  "does": "a smartwatch on a wrist: the time, a ring filling, a heart rate",
  "props": "size?: number, at?: number, steps?: number, goal?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "TvWall",
  "group": "DEVICES and FRAMES",
  "does": "a wall of TV screens (a control room, a news wall): each screen flickers on with its own picture",
  "props": "screens: ReactNode[], cols?: number, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "MuseumPlacard",
  "group": "DEVICES and FRAMES",
  "does": "a museum placard beside an object: title, date, a short description and the accession number",
  "props": "title: string, date?: string, text: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "MagazineCover",
  "group": "DEVICES and FRAMES",
  "does": "a magazine cover: the masthead, a cover photo, cover lines sliding in",
  "props": "title?: string, image?: string, headline: string, lines?: string[], at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "FrontPage",
  "group": "DEVICES and FRAMES",
  "does": "a newspaper front page: masthead, date line, the lead headline, a photo and columns of text",
  "props": "paper?: string, date?: string, headline: string, sub?: string, image?: string, at?: number, w?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-g.tsx",
  "name": "Collage",
  "group": "VOX-STYLE COLLAGE",
  "does": "a Vox-style collage built from LAYERS, so every piece moves by itself: archive photos printed in halftone, people cut out with a white edge, torn paper strips, sticky notes, red marker circles and scribbles, on paper or grid ground. Each layer drifts by its `depth` (parallax: near ones move more) and comes in its own way at its own time; give any layer a `node` to put a block or a motion there. Wrap the whole thing in <Camera> to push in.",
  "props": "layers: CollageLayer[], ground?: \"grid\" | \"paper\" | \"dark\" | \"kraft\", drift?: number, children?: ReactNode",
  "parts": []
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "MadhubaniFish",
  "group": "MADHUBANI",
  "does": "a Madhubani (Mithila) fish, outlined twice in black ink, then filled flat with scales and a big eye; two make a pair for luck and fertility (Chhath, weddings, Bihar, folk tales)",
  "props": "size?: number, at?: number, color?: string, flip?: boolean, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "MadhubaniSun",
  "group": "MADHUBANI",
  "does": "the Madhubani sun god with a smiling face and sixteen painted rays (Surya: Chhath Puja, Makar Sankranti, morning, life, energy)",
  "props": "size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "MadhubaniPeacock",
  "group": "MADHUBANI",
  "does": "a Madhubani peacock with its tail fanned, each feather an eye, painted in flat blue and green (love, beauty, a wedding, Krishna, monsoon)",
  "props": "size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "PaintedBorder",
  "group": "MADHUBANI",
  "does": "a Madhubani painted border: a double black line drawn round, the band between hatched in red and black, a flower at each corner; what is inside is the painting (frame any Indian folk scene, a festival greeting)",
  "props": "w?: number, h?: number, at?: number, band?: number, children?: ReactNode, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "PaintedWall",
  "group": "MADHUBANI",
  "does": "a mud-plastered village wall with a floor at its foot, the ground Madhubani is painted on; put a <PaintedBorder> and the motifs on it (a home in Mithila, a wedding chamber, a village in Bihar)",
  "props": "w?: number, h?: number, floor?: number, children?: ReactNode, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "PaintedTruck",
  "group": "TRUCK ART",
  "does": "an Indian goods truck painted all over (a crown over the cab, a scalloped trim, flower panels), driving in with its wheels turning (highways, transport, a road trip, truck art)",
  "props": "size?: number, at?: number, from?: number, to?: number, dur?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "TruckBack",
  "group": "TRUCK ART",
  "does": "the painted back of an Indian truck filling the frame: scalloped trim, big watchful eyes, its lettering popping on (\"HORN OK PLEASE\"), a slogan ribbon, blinking lights and swinging chains (road safety, highways, street culture, desi humour)",
  "props": "w?: number, h?: number, at?: number, text?: string, sub?: string, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "MughalArch",
  "group": "MUGHAL MINIATURE",
  "does": "a Mughal miniature's frame: gold rules, a cusped arch drawn on, cypress trees either side and a gold floor; put the court (emperor, rani, courtiers) inside (Mughal history, Akbar, the Taj Mahal, royal stories)",
  "props": "w?: number, h?: number, at?: number, children?: ReactNode, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "blocks-h.tsx",
  "name": "Kolam",
  "group": "KOLAM",
  "does": "a kolam (rangoli) drawn the way it is made at dawn: a grid of dots appears, one white line loops round them, then the loops fill with colour and petals bloom at the four tips (Pongal, Diwali, Onam, festivals, maths in art)",
  "props": "size?: number, at?: number, grid?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "grown.tsx",
  "name": "MadhubaniSoop",
  "group": "GROWN",
  "does": "Hand-drawn Madhubani Bamboo Soop laden with offerings (drawn by the film chhath-puja-why-we-stand-in-the-river-an-1027222029)",
  "props": "size?: number, at?: number, lifted?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "grown.tsx",
  "name": "EarthenChulha",
  "group": "GROWN",
  "does": "Traditional Earthen Mud Stove (Chulha) with clay vessel (drawn by the film chhath-puja-why-we-stand-in-the-river-an-1027222029)",
  "props": "size?: number, at?: number, lit?: boolean, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "grown.tsx",
  "name": "SugarcaneCanopy",
  "group": "GROWN",
  "does": "Sacred Sugarcane Stalks (Ganna) tied as pavillion (drawn by the film chhath-puja-why-we-stand-in-the-river-an-1027222029)",
  "props": "size?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 2,
  "file": "grown.tsx",
  "name": "ChhathSoop",
  "group": "GROWN",
  "does": "Bamboo Soop filled with ritual offerings in Mithila style (drawn by the film chhath-puja-the-festival-of-the-sun-from-1027220710)",
  "props": "size?: number, at?: number, parts?: { all }, render?: (s: { t, local, props }) => node",
  "parts": [
   "all"
  ]
 },
 {
  "layer": 0,
  "file": "style.tsx",
  "name": "Palette",
  "group": "",
  "does": "palette colours for everything inside (on top of the theme's)",
  "props": "colors: Partial<Record<PaletteName, string>>, children: ReactNode, style?: CSSProperties",
  "parts": []
 },
 {
  "layer": 0,
  "file": "style.tsx",
  "name": "Look",
  "group": "",
  "does": "draws what is inside in a look; `fill` makes it cover the whole stage (a scene-wide look); `amount` is the strength; `boil` (frames) is how often a sketch's lines are redrawn",
  "props": "kind?: \"flat\" | \"paper\" | \"sketch\" | \"watercolor\" | \"clay\" | \"neon\" | \"chalk\" | \"blueprint\" | \"comic\" | \"shaded\" | \"vintage\" | \"print\" | \"line\", amount?: number, fill?: boolean, boil?: number, children: ReactNode, style?: CSSProperties",
  "parts": []
 }
];

/** the kinds <Move kind> (motion.tsx) and <Move2 kind> (motion-b.tsx) take */
export const MOVE_KINDS: { kind: string; does: string }[] = [{"kind": "fade", "does": "fades in or out"}, {"kind": "slide", "does": "slides in from the side"}, {"kind": "rise", "does": "rises up into place"}, {"kind": "drop", "does": "drops in from above and bounces"}, {"kind": "pop", "does": "pops in with an overshoot"}, {"kind": "grow", "does": "grows out of a point (its corner or origin)"}, {"kind": "unfold", "does": "unfolds down like a flap of card"}, {"kind": "flip", "does": "flips over like a card"}, {"kind": "tear", "does": "is torn in along a ragged paper edge"}, {"kind": "wipe", "does": "wipes in from left to right"}, {"kind": "iris", "does": "opens out of a circle"}, {"kind": "focus", "does": "comes into focus from a blur"}, {"kind": "fall", "does": "falls under gravity and bounces to rest"}, {"kind": "float", "does": "floats weightless (zero gravity)"}, {"kind": "pendulum", "does": "swings from the top and slows down"}, {"kind": "spring", "does": "wobbles like jelly on a spring, then settles"}, {"kind": "roll", "does": "rolls along the floor and slows to a stop"}, {"kind": "sway", "does": "sways in the wind from its base"}, {"kind": "pulse", "does": "pulses like a heartbeat"}, {"kind": "shake", "does": "shakes (an alarm, a no)"}, {"kind": "glow", "does": "glows"}, {"kind": "punch", "does": "zoom punch: jumps bigger and settles"}, {"kind": "tint", "does": "changes colour"}, {"kind": "jump", "does": "crouches, jumps up and lands (joy, surprise)"}, {"kind": "nod", "does": "nods yes"}, {"kind": "headShake", "does": "shakes its head no"}, {"kind": "turn", "does": "turns to look the other way"}, {"kind": "shrug", "does": "shrugs (who knows?)"}, {"kind": "breathe", "does": "breathes slowly (alive, calm)"}, {"kind": "tremble", "does": "trembles with fear or cold"}, {"kind": "slump", "does": "slumps down, sad"}, {"kind": "hop", "does": "happy little hops"}, {"kind": "lean", "does": "leans in to listen or whisper"}, {"kind": "topple", "does": "topples over and falls flat"}, {"kind": "inflate", "does": "inflates like a balloon"}, {"kind": "deflate", "does": "deflates and sags"}, {"kind": "melt", "does": "melts down into a puddle"}, {"kind": "burn", "does": "burns away from the bottom, charring"}, {"kind": "freeze", "does": "freezes over, turning icy blue"}, {"kind": "growUp", "does": "grows up from the ground (a plant, a tower)"}, {"kind": "shrink", "does": "shrinks away to nothing"}, {"kind": "spin", "does": "spins round and round"}, {"kind": "coinFlip", "does": "flips like a tossed coin"}, {"kind": "ghost", "does": "turns see-through, a ghost or a memory"}, {"kind": "age", "does": "ages: colour fades to old sepia"}, {"kind": "press", "does": "is pressed like a button"}, {"kind": "wiggle", "does": "wiggles to ask for attention (a notification)"}, {"kind": "beat", "does": "pulses on the music's beat (amount = strength, seed = beats per second)"}];

/** the library as plain text, grouped, one line per entry: Name(props): what it does */
export function catalogText(layer?: 0 | 1 | 2): string {
  const out: string[] = [];
  let last = "";
  for (const e of LIBRARY) {
    if (layer !== undefined && e.layer !== layer) continue;
    const g = `LAYER ${e.layer} · ${e.group || e.file}`;
    if (g !== last) { out.push("", g); last = g; }
    out.push(`${e.name}(${e.props}): ${e.does}`);
  }
  if (layer === undefined || layer === 1) out.push("", "<Move kind> / <Move2 kind>: " + MOVE_KINDS.map((m) => `${m.kind} (${m.does})`).join("; "));
  return out.join("\n").trim();
}
