/* LAYER 1, part D: THE MOTION GRAMMAR. Every motion here is a name built from four parts, so 1,284 named motions
   come from a few small tables instead of 1,284 hand-made ones, and every one works on any piece in any look:
     id = phase.kind.dir.ease   (dir only for the kinds that travel)
       enter.slide.up.back · enter.zoom.smooth · exit.fly.left.snappy · emph.shake.elastic · loop.float.slow
     phase: enter (arrives) · exit (leaves) · emph (draws the eye, then rests) · loop (keeps going; speed for ease)
   MOTION_IDS lists them all; motionFor(filmMotion, phase, seed) picks one that fits a look's motion (looks.py MOTION). */
import type { CSSProperties, ReactNode } from "react";
import { clamp01, useScene } from "../kit";

/* ================= MOTION GRAMMAR: the parts ================= */
const EASES: Record<string, (x: number) => number> = {
  smooth: (x) => 1 - Math.pow(1 - x, 3),
  snappy: (x) => 1 - Math.pow(1 - x, 5),
  back: (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  elastic: (x) => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  bounce: (x) => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; }
    if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; }
    x -= 2.625 / d; return n * x * x + 0.984375;
  },
  linear: (x) => x,
};
const S = Math.SQRT1_2;
/** the way it travels */
const DIRS: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], upleft: [-S, -S], upright: [S, -S], downleft: [-S, S], downright: [S, S] };
type V = [number, number];
const pct = (n: number) => `${Math.max(0, n).toFixed(2)}%`;

/** kinds that travel: (e = eased progress 0 -> 1, v = direction of travel, a = amount) -> style; e = 1 is at rest */
const TRAVEL: Record<string, (e: number, v: V, a: number) => CSSProperties> = {
  slide: (e, v, a) => ({ opacity: clamp01(e * 3), transform: `translate(${-v[0] * 240 * a * (1 - e)}px, ${-v[1] * 240 * a * (1 - e)}px)` }),
  rise: (e, v, a) => ({ opacity: clamp01(e * 1.4), transform: `translate(${-v[0] * 60 * a * (1 - e)}px, ${-v[1] * 60 * a * (1 - e)}px)` }),
  fly: (e, v, a) => ({ transform: `translate(${-v[0] * 1100 * a * (1 - e)}px, ${-v[1] * 900 * a * (1 - e)}px) rotate(${(v[0] - v[1]) * 18 * (1 - e)}deg)` }),
  swoop: (e, v, a) => { const s = Math.sin(Math.PI * clamp01(1 - e)) * 180 * a; return { opacity: clamp01(e * 2), transform: `translate(${-v[0] * 520 * a * (1 - e) - v[1] * s}px, ${-v[1] * 520 * a * (1 - e) + v[0] * s}px)` }; },
  skid: (e, v, a) => ({ opacity: clamp01(e * 2.5), transform: `translate(${-v[0] * 340 * a * (1 - e)}px, ${-v[1] * 340 * a * (1 - e)}px) skew(${-(v[0] || v[1]) * 24 * Math.sin(Math.PI * clamp01(e))}deg)` }),
  blur: (e, v, a) => ({ opacity: clamp01(e * 2), filter: `blur(${Math.abs(1 - e) * 16}px)`, transform: `translate(${-v[0] * 200 * a * (1 - e)}px, ${-v[1] * 200 * a * (1 - e)}px)` }),
  peek: (e, v) => { const tx = -v[0] * 100 * (1 - e), ty = -v[1] * 100 * (1 - e); return { transform: `translate(${tx}%, ${ty}%)`, clipPath: `inset(${pct(-ty)} ${pct(tx)} ${pct(ty)} ${pct(-tx)})` }; },
  // revealed from the side it travels away from; a diagonal reveals from both sides at once
  wipe: (e, v) => { const k = 100 * clamp01(1 - e), m = Math.max(Math.abs(v[0]), Math.abs(v[1])), f = (c: number) => k * Math.max(0, c) / m;
    return { clipPath: `inset(${pct(f(-v[1]))} ${pct(f(v[0]))} ${pct(f(v[1]))} ${pct(f(-v[0]))})` }; },
  roll: (e, v, a) => ({ opacity: clamp01(e * 3), transform: `translate(${-v[0] * 420 * a * (1 - e)}px, ${-v[1] * 420 * a * (1 - e)}px) rotate(${-((v[0] || v[1]) > 0 ? 1 : -1) * 360 * (1 - e)}deg)` }),
  lean: (e, v, a) => ({ opacity: clamp01(e * 2), transformOrigin: "50% 100%", transform: `translate(${-v[0] * 110 * a * (1 - e)}px, ${-v[1] * 110 * a * (1 - e)}px) rotate(${-(v[0] || v[1] * 0.5) * 12 * (1 - e)}deg)` }),
};
/** kinds that grow, turn or flicker in place */
const PLACE: Record<string, (e: number, a: number, s: number) => CSSProperties> = {
  fade: (e) => ({ opacity: clamp01(e) }),
  zoom: (e, a) => ({ opacity: clamp01(e * 1.5), transform: `scale(${1 + 0.3 * a * (1 - e)})` }),
  grow: (e) => ({ transform: `scale(${Math.max(0, e)})` }),
  shrink: (e, a) => ({ opacity: clamp01(e * 2), transform: `scale(${1 + 1.4 * a * (1 - e)})` }),
  pop: (e) => ({ opacity: clamp01(e * 4), transform: `scale(${Math.max(0, 0.4 + 0.6 * e)})` }),
  flipx: (e) => ({ opacity: e > 0.02 ? 1 : 0, transform: `perspective(1400px) rotateX(${90 * (1 - e)}deg)`, transformOrigin: "50% 0%" }),
  flipy: (e) => ({ opacity: e > 0.02 ? 1 : 0, transform: `perspective(1400px) rotateY(${90 * (1 - e)}deg)`, transformOrigin: "0% 50%" }),
  spin: (e) => ({ opacity: clamp01(e * 2), transform: `rotate(${-180 * (1 - e)}deg) scale(${0.5 + 0.5 * e})` }),
  swirl: (e) => ({ transform: `rotate(${-540 * (1 - e)}deg) scale(${Math.max(0, e)})` }),
  iris: (e) => ({ clipPath: `circle(${Math.max(0, e) * 75}% at 50% 50%)` }),
  unfold: (e) => ({ transform: `scaleY(${Math.max(0, e)})`, transformOrigin: "50% 0%" }),
  stretch: (e) => ({ transform: `scaleX(${Math.max(0, e)})`, transformOrigin: "0% 50%" }),
  focus: (e) => ({ opacity: clamp01(e * 1.5), filter: `blur(${Math.abs(1 - e) * 22}px)` }),
  glitch: (e, a, s) => e >= 1 ? {} : ({ opacity: rnd(s * 7) > 0.3 || e > 0.7 ? 1 : 0.15, transform: `translate(${e < 0.75 ? (rnd(s * 9) - 0.5) * 40 * a : 0}px, ${e < 0.75 ? (rnd(s * 3) - 0.5) * 10 : 0}px)`, filter: e < 0.75 ? "drop-shadow(5px 0 0 #ff2a6a) drop-shadow(-5px 0 0 #2ad4ff)" : undefined }),
  flicker: (e, _, s) => ({ opacity: e >= 1 ? 1 : e > 0.6 ? (rnd(s * 5) > 0.15 ? 1 : 0.3) : rnd(s * 5) > 0.55 ? 0.9 : 0 }),
  fall: (e, a) => ({ transform: `translateY(${-460 * a * (1 - e)}px) rotate(${-6 * (1 - e)}deg)` }),
};
/** draws the eye and comes back to rest: (e = eased progress 0 -> 1, a = amount) -> style */
const EMPH: Record<string, (e: number, a: number) => CSSProperties> = {
  pulse: (e, a) => ({ transform: `scale(${1 + 0.12 * a * Math.sin(Math.PI * e)})` }),
  shake: (e, a) => ({ transform: `translateX(${Math.sin(e * Math.PI * 8) * 18 * a * (1 - e)}px)` }),
  wobble: (e, a) => ({ transform: `translateX(${Math.sin(e * Math.PI * 4) * 30 * a * (1 - e)}px) rotate(${-Math.sin(e * Math.PI * 4) * 6 * a * (1 - e)}deg)` }),
  jello: (e, a) => ({ transform: `skew(${Math.sin(e * Math.PI * 6) * 12 * a * (1 - e)}deg, ${Math.sin(e * Math.PI * 6) * 4 * a * (1 - e)}deg)` }),
  heartbeat: (e, a) => ({ transform: `scale(${1 + 0.14 * a * Math.max(0, Math.sin(e * Math.PI * 4)) * (1 - e * 0.5)})` }),
  flash: (e) => ({ opacity: 1 - 0.8 * Math.abs(Math.sin(e * Math.PI * 3)) }),
  tada: (e, a) => ({ transform: `scale(${1 + 0.1 * a * Math.sin(Math.PI * e)}) rotate(${Math.sin(e * Math.PI * 8) * 4 * a * Math.sin(Math.PI * e)}deg)` }),
  nod: (e, a) => ({ transform: `translateY(${Math.sin(e * Math.PI * 4) * 14 * a * (1 - e)}px)` }),
  swing: (e, a) => ({ transformOrigin: "50% 0%", transform: `rotate(${Math.sin(e * Math.PI * 5) * 14 * a * (1 - e)}deg)` }),
  rubber: (e, a) => ({ transform: `scale(${1 + 0.25 * a * Math.sin(e * Math.PI * 3) * (1 - e)}, ${1 - 0.2 * a * Math.sin(e * Math.PI * 3) * (1 - e)})` }),
  glow: (e, a) => ({ filter: `drop-shadow(0 0 ${Math.sin(Math.PI * clamp01(e)) * 26 * a}px currentColor) brightness(${1 + 0.25 * Math.sin(Math.PI * clamp01(e))})` }),
  jump: (e, a) => ({ transform: `translateY(${-Math.sin(Math.PI * clamp01(e)) * 60 * a}px)` }),
  squash: (e, a) => ({ transformOrigin: "50% 100%", transform: `scale(${1 + 0.2 * a * Math.sin(Math.PI * e)}, ${1 - 0.25 * a * Math.sin(Math.PI * e)})` }),
  tilt: (e, a) => ({ transform: `rotate(${Math.sin(Math.PI * e) * 8 * a}deg)` }),
  spin: (e) => ({ transform: `rotate(${e * 360}deg)` }),
  blink: (e) => ({ opacity: 1 - Math.abs(Math.sin(e * Math.PI * 2)) }),
};
/** keeps going: (s = seconds, p = period, a = amount) -> style */
const LOOP: Record<string, (s: number, p: number, a: number) => CSSProperties> = {
  float: (s, p, a) => ({ transform: `translateY(${Math.sin(s * 2 * Math.PI / p) * 14 * a}px)` }),
  bob: (s, p, a) => ({ transform: `translateY(${-Math.abs(Math.sin(s * Math.PI / p)) * 22 * a}px)` }),
  sway: (s, p, a) => ({ transformOrigin: "50% 100%", transform: `rotate(${Math.sin(s * 2 * Math.PI / p) * 5 * a}deg)` }),
  spin: (s, p) => ({ transform: `rotate(${(s / p) * 360}deg)` }),
  breathe: (s, p, a) => ({ transform: `scale(${1 + 0.04 * a * Math.sin(s * 2 * Math.PI / p)})` }),
  wiggle: (s, p, a) => ({ transform: `rotate(${Math.sin(s * 8 * Math.PI / p) * 3 * a}deg)` }),
  orbit: (s, p, a) => ({ transform: `translate(${Math.cos(s * 2 * Math.PI / p) * 16 * a}px, ${Math.sin(s * 2 * Math.PI / p) * 16 * a}px)` }),
  pendulum: (s, p, a) => ({ transformOrigin: "50% 0%", transform: `rotate(${Math.sin(s * 2 * Math.PI / p) * 18 * a}deg)` }),
  hover: (s, p, a) => ({ transform: `translateY(${Math.sin(s * 2 * Math.PI / p) * 8 * a}px)`, filter: `drop-shadow(0 ${14 + 6 * Math.sin(s * 2 * Math.PI / p)}px 10px rgb(0 0 0 / 0.18))` }),
  drift: (s, p, a) => ({ transform: `translateX(${Math.sin(s * 2 * Math.PI / p) * 20 * a}px)` }),
  twinkle: (s, p) => ({ opacity: 0.6 + 0.4 * Math.sin(s * 2 * Math.PI / p) }),
  throb: (s, p, a) => ({ transform: `scale(${1 + 0.06 * a * Math.pow(Math.max(0, Math.sin(s * 2 * Math.PI / p)), 4)})` }),
};
const SPEEDS: Record<string, number> = { slow: 4, mid: 2.4, fast: 1.2 };
const DUR: Record<string, number> = { enter: 0.7, exit: 0.6, emph: 0.9 };
const rnd = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** every motion of the grammar, by name */
export const MOTION_IDS: string[] = [
  ...["enter", "exit"].flatMap((ph) => [
    ...Object.keys(TRAVEL).flatMap((k) => Object.keys(DIRS).flatMap((d) => Object.keys(EASES).map((e) => `${ph}.${k}.${d}.${e}`))),
    ...Object.keys(PLACE).flatMap((k) => Object.keys(EASES).map((e) => `${ph}.${k}.${e}`)),
  ]),
  ...Object.keys(EMPH).flatMap((k) => Object.keys(EASES).map((e) => `emph.${k}.${e}`)),
  ...Object.keys(LOOP).flatMap((k) => Object.keys(SPEEDS).map((s) => `loop.${k}.${s}`)),
];
const KNOWN = new Set(MOTION_IDS);
export const isMotion = (id: string) => KNOWN.has(id);

/** the style of a piece moving by `id` at scene time t, the motion starting at `at` (seconds); an unknown id rests */
export function motionStyle(id: string, t: number, at = 0, dur?: number, amount = 1): CSSProperties {
  const [ph, kind, a3, a4] = id.split(".");
  const s = t - at;
  if (ph === "loop") return s < 0 || !LOOP[kind] ? {} : LOOP[kind](s, SPEEDS[a3] ?? 2.4, amount);
  const dirName = TRAVEL[kind] ? a3 : undefined, easeName = TRAVEL[kind] ? a4 : a3;
  const ez = EASES[easeName] ?? EASES.smooth;
  const x = clamp01(s / (dur ?? DUR[ph] ?? 0.7));
  if (ph === "emph") return s <= 0 || x >= 1 || !EMPH[kind] ? {} : EMPH[kind](ez(x), amount);
  if (ph !== "enter" && ph !== "exit") return {};
  if (ph === "enter" && s < 0) return { opacity: 0 };
  if (ph === "enter" && x >= 1) return {};
  if (ph === "exit" && s <= 0) return {};
  if (ph === "exit" && x >= 1) return { opacity: 0 };
  // an exit is its entrance played backwards, leaving the way it would have come from
  const e = ph === "enter" ? ez(x) : 1 - ez(x);
  const v = DIRS[dirName ?? ""] ?? [0, -1];
  const w: V = ph === "enter" ? v : [-v[0], -v[1]];
  if (TRAVEL[kind]) return TRAVEL[kind](e, w, amount);
  if (PLACE[kind]) return PLACE[kind](e, amount, Math.floor(s * 30));
  return {};
}

/** anything, moving by one of the 1,284 named motions of the grammar: id = phase.kind.dir.ease ("enter.swoop.upleft.back", "exit.fade.smooth", "emph.jello.elastic", "loop.float.slow"); phases enter, exit, emph, loop; travel kinds slide rise fly swoop skid blur peek wipe roll lean (dirs up down left right upleft upright downleft downright); in-place kinds fade zoom grow shrink pop flipx flipy spin swirl iris unfold stretch focus glitch flicker fall; emph kinds pulse shake wobble jello heartbeat flash tada nod swing rubber glow jump squash tilt spin blink; loop kinds float bob sway spin breathe wiggle orbit pendulum hover drift twinkle throb (speeds slow mid fast); eases smooth snappy back elastic bounce linear. Several ids in a row, comma separated, play together ("enter.pop.back,loop.float.slow") */
export function Motion({ id, at = 0, dur, amount = 1, children, style }: { id: string; at?: number; dur?: number; amount?: number; children: ReactNode; style?: CSSProperties }) {
  const { t } = useScene();
  const ids = id.split(",").map((x) => x.trim()).filter(Boolean);
  // each motion gets its own wrapper so their transforms add up instead of replacing each other
  return <>{ids.reduceRight<ReactNode>((inner, one, i) => <div style={{ ...(i === 0 ? style : {}), ...motionStyle(one, t, at, dur, amount) }}>{inner}</div>, children)}</>;
}

/* ================= MOTION GRAMMAR: fitting a look ================= */
/** the grammar's kinds and eases that feel like each look motion (video/looks.py MOTION) */
const FITS: Record<string, [string[], string[], string[]]> = {  // kinds, eases, dirs
  snappy: [["pop", "zoom", "slide"], ["snappy", "back"], ["up", "right"]],
  drift: [["rise", "fade", "lean"], ["smooth"], ["up"]],
  typewriter: [["wipe"], ["linear"], ["right"]],
  stamp: [["shrink", "pop"], ["snappy", "bounce"], ["down"]],
  slide: [["slide", "skid"], ["smooth", "snappy"], ["right", "left", "up"]],
  draw: [["wipe", "peek"], ["smooth"], ["right", "up"]],
  pop: [["pop", "grow"], ["back", "elastic"], ["up"]],
  wipe: [["wipe"], ["smooth"], ["right", "down"]],
  zoom: [["zoom", "focus"], ["smooth"], ["up"]],
  flip: [["flipx", "flipy"], ["smooth", "back"], ["up"]],
  parallax: [["rise", "fly"], ["smooth"], ["up", "upright"]],
  glitch: [["glitch", "flicker"], ["linear", "snappy"], ["right"]],
  brush: [["wipe", "peek"], ["smooth"], ["right"]],
};
/** a grammar motion that fits a film's look motion, chosen by seed: motionFor("pop", "enter", 3) -> "enter.grow.elastic" */
export function motionFor(film: string | undefined, phase: "enter" | "exit" = "enter", seed = 0): string {
  const [kinds, eases, dirs] = FITS[film ?? ""] ?? FITS.drift;
  const k = kinds[seed % kinds.length], e = eases[Math.floor(seed / kinds.length) % eases.length];
  return TRAVEL[k] ? `${phase}.${k}.${dirs[seed % dirs.length]}.${e}` : `${phase}.${k}.${e}`;
}
