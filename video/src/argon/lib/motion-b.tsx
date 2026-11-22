/* LAYER 1 of the motion library, part B: more MOTIONS (the verbs), for every kind of video, not only the first films.

   - <Move2 kind="jump" at={1}>…</Move2> wraps anything, like <Move>: acting (jump, nod, shrug, tremble…), changes of form
     (inflate, melt, burn away, freeze…), UI presses and beats. Its kinds are in MOVES2.
   - Components for motions that need more than one transform: groups (gather, march, queue, flock), transforms (morph, grow
     a plant, build up, fill a level, fold paper, dissolve to dust), effects (fire, explosion, lightning, confetti, light rays,
     glitch, old film, heat shimmer), signals (heartbeat line, sound wave, radar, signal rings, packets in a pipe), text
     (typewriter, scramble, strike and correct, letters fly, text on a path), camera (dolly zoom, crane, 3D orbit, quake,
     zoom into a screen, split screen, picture in picture), transitions (glitch, shape mask, shutter, spin, light leak,
     film burn), time (time-lapse, seasons, hourglass, slow motion, ageing), UI actions (tap, swipe, scroll, type, drag,
     toggle, spinner, progress) and rhythm (beat pulse, equaliser).
   Rain, snow, bubbles, dust and sparks are kit's <Particles kind=…>; film grain is kit's <Grain>, flicker kit's <Flicker>.
   As in part A, `at` is in seconds from the scene's start and can be a spoken word's time: s.at("boom"). */

import type { CSSProperties, ReactNode } from "react";
import { Freeze } from "remotion";
import { clamp01, family, useScene } from "../kit";
import { curve, ease, rand } from "./motion";

type Pt = [number, number];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/* ---------------- <Move2>: one more transform motion on anything ---------------- */
type MoveArgs = { u: number; k: number; t: number; a: number; seed: number; accent: string };
type MoveDef = { group: "acting" | "change" | "ui" | "rhythm"; does: string; fn: (m: MoveArgs) => CSSProperties };

export const MOVES2 = {
  /* acting: a person (or any thing with a face) shows what it feels */
  jump: { group: "acting", does: "crouches, jumps up and lands (joy, surprise)", fn: ({ t, a }) => { const c = t % 1.1, up = c > 0.15 && c < 0.75 ? Math.sin(((c - 0.15) / 0.6) * Math.PI) : 0, squash = c < 0.15 ? Math.sin((c / 0.15) * Math.PI) : 0; return { transform: `translateY(${-up * 160 * a}px) scale(${1 + squash * 0.08}, ${1 - squash * 0.1})`, transformOrigin: "50% 100%" }; } },
  nod: { group: "acting", does: "nods yes", fn: ({ t, a }) => ({ transform: `rotate(${Math.sin(t * 9) * 7 * a * Math.exp(-0.6 * t)}deg) translateY(${Math.max(0, Math.sin(t * 9)) * 6 * a}px)`, transformOrigin: "50% 100%" }) },
  headShake: { group: "acting", does: "shakes its head no", fn: ({ t, a }) => ({ transform: `rotateY(${Math.sin(t * 10) * 22 * a * Math.exp(-0.5 * t)}deg)` }) },
  turn: { group: "acting", does: "turns to look the other way", fn: ({ u }) => ({ transform: `scaleX(${Math.cos(u * Math.PI)})` }) },
  shrug: { group: "acting", does: "shrugs (who knows?)", fn: ({ t, a }) => { const s = Math.max(0, Math.sin(Math.min(t, 1) * Math.PI)); return { transform: `translateY(${-s * 16 * a}px) scale(${1 + s * 0.04 * a}, ${1 - s * 0.03 * a})`, transformOrigin: "50% 100%" }; } },
  breathe: { group: "acting", does: "breathes slowly (alive, calm)", fn: ({ t, a }) => ({ transform: `scale(${1 + Math.sin(t * 1.8) * 0.015 * a}, ${1 + Math.sin(t * 1.8) * 0.025 * a})`, transformOrigin: "50% 100%" }) },
  tremble: { group: "acting", does: "trembles with fear or cold", fn: ({ t, a }) => ({ transform: `translate(${Math.sin(t * 70) * 4 * a}px, ${Math.cos(t * 63) * 2 * a}px)` }) },
  slump: { group: "acting", does: "slumps down, sad", fn: ({ u, a }) => ({ transform: `translateY(${u * 30 * a}px) rotate(${u * 6 * a}deg) scaleY(${1 - u * 0.06 * a})`, transformOrigin: "50% 100%", filter: `saturate(${1 - u * 0.5})` }) },
  hop: { group: "acting", does: "happy little hops", fn: ({ t, a }) => ({ transform: `translateY(${-Math.abs(Math.sin(t * 6)) * 34 * a}px)` }) },
  lean: { group: "acting", does: "leans in to listen or whisper", fn: ({ u, a }) => ({ transform: `rotate(${u * 9 * a}deg)`, transformOrigin: "50% 100%" }) },
  topple: { group: "acting", does: "topples over and falls flat", fn: ({ k, a }) => ({ transform: `rotate(${ease.bounce(k) * 88 * a}deg)`, transformOrigin: "100% 100%" }) },
  /* change: the thing itself changes form */
  inflate: { group: "change", does: "inflates like a balloon", fn: ({ u, t, a }) => ({ transform: `scale(${1 + u * 0.45 * a + Math.sin(t * 5) * 0.01})` }) },
  deflate: { group: "change", does: "deflates and sags", fn: ({ u, a }) => ({ transform: `scale(${1 - u * 0.35 * a}, ${1 - u * 0.55 * a})`, transformOrigin: "50% 100%" }) },
  melt: { group: "change", does: "melts down into a puddle", fn: ({ u, a }) => ({ transform: `scale(${1 + u * 0.5 * a}, ${1 - u * 0.8 * a}) skewX(${Math.sin(u * 3) * 6}deg)`, transformOrigin: "50% 100%", filter: `blur(${u * 2}px)` }) },
  burn: { group: "change", does: "burns away from the bottom, charring", fn: ({ u }) => ({ clipPath: `polygon(${Array.from({ length: 13 }, (_, i) => `${(i / 12) * 100}% ${100 - u * 110 + Math.sin(i * 2.3) * 6}%`).join(",")}, 100% 0%, 0% 0%)`, filter: `sepia(${u}) brightness(${1 - u * 0.3})` }) },
  freeze: { group: "change", does: "freezes over, turning icy blue", fn: ({ u }) => ({ filter: `saturate(${1 - u * 0.6}) hue-rotate(${u * 160}deg) brightness(${1 + u * 0.25})` }) },
  growUp: { group: "change", does: "grows up from the ground (a plant, a tower)", fn: ({ u }) => ({ transform: `scaleY(${u})`, transformOrigin: "50% 100%" }) },
  shrink: { group: "change", does: "shrinks away to nothing", fn: ({ u }) => ({ transform: `scale(${1 - u})`, opacity: 1 - u * 0.3 }) },
  spin: { group: "change", does: "spins round and round", fn: ({ t, a }) => ({ transform: `rotate(${t * 220 * a}deg)` }) },
  coinFlip: { group: "change", does: "flips like a tossed coin", fn: ({ t, a }) => ({ transform: `rotateX(${t * 900 * a}deg) translateY(${-Math.sin(Math.min(1, t / 1.2) * Math.PI) * 220 * a}px)` }) },
  ghost: { group: "change", does: "turns see-through, a ghost or a memory", fn: ({ u }) => ({ opacity: 1 - u * 0.65, filter: `blur(${u * 2}px) grayscale(${u})` }) },
  age: { group: "change", does: "ages: colour fades to old sepia", fn: ({ u }) => ({ filter: `sepia(${u * 0.9}) contrast(${1 - u * 0.15}) brightness(${1 - u * 0.08})` }) },
  /* ui: a screen element being used */
  press: { group: "ui", does: "is pressed like a button", fn: ({ t }) => ({ transform: `scale(${1 - 0.08 * Math.max(0, Math.sin(Math.min(t, 0.3) / 0.3 * Math.PI))})` }) },
  wiggle: { group: "ui", does: "wiggles to ask for attention (a notification)", fn: ({ t, a }) => ({ transform: `rotate(${Math.sin(t * 24) * 6 * a * Math.max(0, Math.sin((t % 2) * Math.PI)) * (t % 2 < 1 ? 1 : 0)}deg)` }) },
  /* rhythm */
  beat: { group: "rhythm", does: "pulses on the music's beat (amount = strength, seed = beats per second)", fn: ({ t, a, seed }) => { const p = (t * seed) % 1; return { transform: `scale(${1 + 0.08 * a * Math.exp(-p * 7)})` }; } },
} satisfies Record<string, MoveDef>;
export type Move2Kind = keyof typeof MOVES2;

/** moves anything inside it in one of the MOVES2 kinds (acting, change of form, UI, beat), from `at`; `out` plays it backwards */
export function Move2({ kind, at = 0, dur = 0.8, amount = 1, seed = 2, out, children, style }: {
  kind: Move2Kind; at?: number; dur?: number; amount?: number; seed?: number; out?: number; children: ReactNode; style?: CSSProperties;
}) {
  const { t: now, theme } = useScene();
  const m: MoveDef = MOVES2[kind];
  let k = clamp01((now - at) / dur);
  if (out !== undefined && now >= out) k = 1 - clamp01((now - out) / dur);
  const css = now < at ? {} : m.fn({ u: ease.out(k), k, t: Math.max(0, now - at), a: amount, seed, accent: theme.accent ?? "#f5b041" });
  return <div style={{ display: "inline-block", ...css, ...style }}>{children}</div>;
}

/* ---------------- groups: many things moving together ---------------- */
/** things scattered about come together into a tidy grid (people gather, parts assemble a team); `reverse` disperses them */
export function Gather({ items, x, y, cols = 6, gap = 140, at = 0, dur = 1.6, reverse = false }: { items: ReactNode[]; x: number; y: number; cols?: number; gap?: number; at?: number; dur?: number; reverse?: boolean }) {
  const { t, W, H } = useScene();
  return <>{items.map((it, i) => {
    let k = ease.inOut(clamp01((t - at - rand(i) * 0.4) / dur));
    if (reverse) k = 1 - k;
    const gx = x + (i % cols) * gap, gy = y + Math.floor(i / cols) * gap, sx = rand(i + 11) * W, sy = rand(i + 23) * H;
    return <div key={i} style={{ position: "absolute", left: lerp(sx, gx, k), top: lerp(sy, gy, k), transform: `translate(-50%,-50%) rotate(${(1 - k) * (rand(i + 5) - 0.5) * 90}deg)`, opacity: reverse ? 0.3 + 0.7 * k : 1 }}>{it}</div>;
  })}</>;
}
/** rows of things march in step across the frame, bobbing on each step (an army, a parade, a protest) */
export function March({ item, rows = 3, per = 8, y, gap = 120, speed = 140, at = 0, face = 1 }: { item: ReactNode; rows?: number; per?: number; y: number; gap?: number; speed?: number; at?: number; face?: 1 | -1 }) {
  const { t, W } = useScene();
  const s = Math.max(0, t - at), step = Math.abs(Math.sin(s * 6));
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
    const x = face > 0 ? -per * gap + i * gap + s * speed + r * 30 : W + per * gap - i * gap - s * speed - r * 30;
    out.push(<div key={r * per + i} style={{ position: "absolute", left: x, top: y + r * 46 - step * 10, transform: `translate(-50%,-100%) scale(${0.8 + r * 0.1}) scaleX(${face})`, zIndex: r }}>{item}</div>);
  }
  return <>{out}</>;
}
/** a queue: things wait in a line and move up one place each time the first leaves (a ticket counter, a bank) */
export function Queue({ items, x, y, gap = 150, every = 1.2, at = 0 }: { items: ReactNode[]; x: number; y: number; gap?: number; every?: number; at?: number }) {
  const { t } = useScene();
  const n = Math.max(0, (t - at) / every), gone = Math.floor(n), f = ease.inOut(clamp01((n - gone) / 0.5));
  return <>{items.map((it, i) => {
    const place = i - gone - (i >= gone ? f : 0);
    const leaving = i < gone || (i === gone && f > 0);
    const px = leaving ? x - gap - (i === gone ? f : 1) * 400 : x + place * gap;
    return <div key={i} style={{ position: "absolute", left: px, top: y, transform: `translate(-50%,-100%) translateY(${-Math.abs(Math.sin((t - at) * 7)) * (i === gone ? 8 : 0)}px)`, opacity: leaving ? 1 - (i === gone ? f : 1) : 1 }}>{it}</div>;
  })}</>;
}
/** a flock or swarm: many small things wheel about a moving centre together (birds, fish, bees, drones) */
export function Flock({ item, count = 24, x, y, spread = 260, at = 0, path }: { item: ReactNode; count?: number; x: number; y: number; spread?: number; at?: number; path?: Pt[] }) {
  const { t } = useScene();
  const s = Math.max(0, t - at), c = path ? curve(path).at(((s / 6) % 1)) : { x, y };
  return <>{Array.from({ length: count }, (_, i) => {
    const a = s * (0.9 + rand(i) * 0.6) + i, r = spread * (0.3 + rand(i + 3) * 0.7);
    const px = c.x + Math.cos(a) * r, py = c.y + Math.sin(a * 1.3) * r * 0.5;
    return <div key={i} style={{ position: "absolute", left: px, top: py, transform: `translate(-50%,-50%) scale(${0.6 + rand(i + 7) * 0.5}) scaleX(${Math.sin(a) > 0 ? -1 : 1})` }}>{item}</div>;
  })}</>;
}

/* ---------------- transforms: one form becomes another ---------------- */
/** points of a named shape round a centre (for morphing): circle, square, triangle, star, heart, arrow, drop */
export function shapePoints(kind: "circle" | "square" | "triangle" | "star" | "heart" | "arrow" | "drop", n = 72, r = 200): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    if (kind === "circle") return [Math.cos(a) * r, Math.sin(a) * r];
    if (kind === "square") { const m = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); return [(Math.cos(a) / m) * r * 0.85, (Math.sin(a) / m) * r * 0.85]; }
    if (kind === "triangle") { const sec = (Math.PI * 2) / 3, b = ((a + Math.PI / 2) % sec + sec) % sec - sec / 2, d = (r * 0.5) / Math.cos(b); return [Math.cos(a) * d * 1.6, Math.sin(a) * d * 1.6]; }
    if (kind === "star") { const rr = i % (n / 5) < n / 10 ? r : r * 0.45; const ph = ((i % (n / 5)) / (n / 10)); const v = ph < 1 ? lerp(r, r * 0.42, ph) : lerp(r * 0.42, r, ph - 1); return [Math.cos(a) * (v || rr), Math.sin(a) * (v || rr)]; }
    if (kind === "heart") { const s = (i / n) * Math.PI * 2; return [16 * Math.pow(Math.sin(s), 3) * (r / 17), -(13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s)) * (r / 17)]; }
    if (kind === "drop") { const s = (i / n) * Math.PI * 2; return [Math.sin(s) * Math.sin(s / 2) * r * 0.9, (-Math.cos(s)) * r]; }
    /* arrow pointing right */
    const ax = Math.cos(a), ay = Math.sin(a), m = Math.max(Math.abs(ax), Math.abs(ay) * 2.4);
    const px = (ax / m) * r, py = (ay / m) * r;
    return px > r * 0.2 ? [px, py * (1 - (px - r * 0.2) / (r * 0.9)) * 2.2] : [px, py * 0.8];
  });
}
/** one shape smoothly becomes another, and another (a circle into a heart, a drop into a star); colours blend too */
export function Morph({ shapes, colors, x, y, size = 200, at = 0, every = 1.6 }: { shapes: Parameters<typeof shapePoints>[0][]; colors?: string[]; x: number; y: number; size?: number; at?: number; every?: number }) {
  const { t, theme } = useScene();
  const pal = colors ?? [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8"];
  const n = clamp01((t - at) / (every * (shapes.length - 1))) * (shapes.length - 1), i = Math.min(shapes.length - 2, Math.floor(n)), f = ease.inOut(n - i);
  const A = shapePoints(shapes[i], 72, size), B = shapePoints(shapes[Math.min(shapes.length - 1, i + 1)], 72, size);
  const d = "M" + A.map((p, j) => `${(x + lerp(p[0], B[j][0], f)).toFixed(1)} ${(y + lerp(p[1], B[j][1], f)).toFixed(1)}`).join(" L") + " Z";
  return <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%"><path d={d} fill={f < 0.5 ? pal[i % pal.length] : pal[(i + 1) % pal.length]} stroke="#fff" strokeWidth={6} strokeLinejoin="round" style={{ filter: "drop-shadow(0 12px 18px rgb(0 0 0/0.25))" }} /></svg>;
}
/** a plant grows from a seed: the stem draws up, leaves unfurl, a flower opens */
export function GrowPlant({ x, y, height = 420, at = 0, dur = 3, flower = "#ff6b8a", leaf = "color-mix(in srgb, var(--grass, #5a9a3a) 96%, #000)" }: { x: number; y: number; height?: number; at?: number; dur?: number; flower?: string; leaf?: string }) {
  const { t } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), sway = Math.sin(t * 1.4) * 6;
  const top: Pt = [x + sway, y - height * k];
  const leaves = [0.3, 0.5, 0.7].map((h, i) => ({ h, side: i % 2 ? 1 : -1, s: ease.back(clamp01((k - h) / 0.2)) }));
  const fk = ease.back(clamp01((k - 0.85) / 0.15));
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
      <ellipse cx={x} cy={y + 6} rx={70} ry={16} fill="color-mix(in srgb, var(--wood, #8a5a2a) 81%, #000)" />
      <path d={`M${x} ${y} Q${x - 30 + sway / 2} ${y - height * k * 0.5} ${top[0]} ${top[1]}`} fill="none" stroke={leaf} strokeWidth={12} strokeLinecap="round" />
      {leaves.map((l, i) => <path key={i} transform={`translate(${x + sway * l.h} ${y - height * l.h}) scale(${l.s * l.side} ${l.s}) rotate(-30)`} d="M0 0 Q50 -40 110 0 Q50 30 0 0 Z" fill={leaf} />)}
      {fk > 0 && <g transform={`translate(${top[0]} ${top[1]}) scale(${fk}) rotate(${t * 10})`}>{Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx={0} cy={-34} rx={22} ry={36} fill={flower} transform={`rotate(${i * 60})`} />)}<circle r={22} fill="color-mix(in srgb, var(--glow, #ffe066) 95%, #000)" /></g>}
    </svg>
  );
}
/** a building rises floor by floor (a city growing, a company scaling up); each floor drops into place */
export function BuildUp({ x, y, floors = 8, w = 260, floorH = 60, at = 0, every = 0.25, color }: { x: number; y: number; floors?: number; w?: number; floorH?: number; at?: number; every?: number; color?: string }) {
  const { t, theme } = useScene();
  return <>{Array.from({ length: floors }, (_, i) => {
    const k = ease.bounce(clamp01((t - at - i * every) / 0.45));
    if (t < at + i * every) return null;
    return <div key={i} style={{ position: "absolute", left: x - w / 2 + (i === floors - 1 ? w * 0.1 : 0), top: y - (i + 1) * floorH - (1 - k) * 400, width: i === floors - 1 ? w * 0.8 : w, height: floorH - 4, background: color ?? theme.accent2, borderRadius: 6, boxShadow: "inset 0 -6px 0 rgb(0 0 0/0.2)", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
      {Array.from({ length: 4 }, (_, j) => <div key={j} style={{ width: w * 0.12, height: floorH * 0.5, background: rand(i * 4 + j) > 0.4 ? "color-mix(in srgb, var(--glow, #ffe066) 59%, #fff)" : "#2d3a4e", borderRadius: 3 }} />)}
    </div>;
  })}</>;
}
/** a container whose level rises or falls to a value with a moving surface (a tank, a battery, a dam, savings) */
export function LiquidLevel({ x, y, w = 240, h = 380, from = 0, to = 0.7, at = 0, dur = 2, color = "#2f8fd8", label = true, shape = "tank" }: { x: number; y: number; w?: number; h?: number; from?: number; to?: number; at?: number; dur?: number; color?: string; label?: boolean; shape?: "tank" | "battery" | "glass" }) {
  const { t, theme } = useScene();
  const v = lerp(from, to, ease.inOut(clamp01((t - at) / dur))), lv = h * (1 - v);
  const wave = Array.from({ length: 21 }, (_, i) => `${(i / 20) * w},${lv + Math.sin(i * 0.8 + t * 4) * 6}`).join(" L");
  const r = shape === "glass" ? 8 : 26;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {shape === "battery" && <div style={{ position: "absolute", left: w * 0.35, top: -30, width: w * 0.3, height: 30, background: theme.ink, borderRadius: "8px 8px 0 0" }} />}
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, borderRadius: r, overflow: "hidden", background: "rgb(255 255 255/0.5)" }}>
        <path d={`M0 ${h} L${wave} L${w} ${h} Z`} fill={shape === "battery" ? (v < 0.2 ? "var(--bad, #e0453a)" : v < 0.5 ? "var(--warn, #f0b43a)" : "var(--good, #3fb35a)") : color} />
      </svg>
      <div style={{ position: "absolute", inset: 0, borderRadius: r, border: `8px solid ${theme.ink}` }} />
      {label && <div style={{ position: "absolute", left: 0, right: 0, top: h / 2 - 40, textAlign: "center", fontFamily: family(theme.display), fontSize: 64, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgb(0 0 0/0.5)" }}>{Math.round(v * 100)}%</div>}
    </div>
  );
}
/** a sheet folds in half, then in half again, like paper (a letter, a map, a plan folded away); `reverse` unfolds it */
export function PaperFold({ w, h, at = 0, dur = 1.4, reverse = false, children }: { w: number; h: number; at?: number; dur?: number; reverse?: boolean; children: ReactNode }) {
  const { t } = useScene();
  let k = clamp01((t - at) / dur);
  if (reverse) k = 1 - k;
  const a = ease.inOut(clamp01(k * 2)), b = ease.inOut(clamp01(k * 2 - 1));
  const half = (side: "l" | "r", style: CSSProperties) => <div style={{ position: "absolute", top: 0, width: w / 2, height: h, overflow: "hidden", left: side === "l" ? 0 : w / 2, ...style }}><div style={{ width: w, height: h, marginLeft: side === "l" ? 0 : -w / 2 }}>{children}</div></div>;
  return (
    <div style={{ position: "relative", width: w, height: h, transformOrigin: "50% 0%", transform: `perspective(2000px) rotateX(${b * 178}deg)` }}>
      {half("l", {})}
      {half("r", { transformOrigin: "0% 50%", transform: `perspective(2000px) rotateY(${-a * 178}deg)`, filter: `brightness(${1 - a * 0.25})` })}
    </div>
  );
}
/** the picture breaks down into dust that drifts away on the wind (gone, forgotten, erased); `reverse` forms it from dust */
export function Disintegrate({ w, h, at = 0, dur = 2, reverse = false, children, cols = 14, rows = 9 }: { w: number; h: number; at?: number; dur?: number; reverse?: boolean; children: ReactNode; cols?: number; rows?: number }) {
  const { t } = useScene();
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    let k = ease.inOut(clamp01((t - at - (c / cols) * dur * 0.5 - rand(i) * 0.3) / (dur * 0.6)));
    if (reverse) k = 1 - k;
    const x0 = (c / cols) * 100, x1 = ((c + 1) / cols) * 100, y0 = (r / rows) * 100, y1 = ((r + 1) / rows) * 100;
    out.push(<div key={i} style={{ position: "absolute", inset: 0, clipPath: `polygon(${x0}% ${y0}%,${x1}% ${y0}%,${x1}% ${y1}%,${x0}% ${y1}%)`, transform: `translate(${k * (300 + rand(i + 1) * 500)}px, ${k * -(rand(i + 2) * 300)}px) rotate(${k * 90}deg) scale(${1 - k * 0.6})`, opacity: 1 - k }}>{children}</div>);
  }
  return <div style={{ position: "relative", width: w, height: h }}>{out}</div>;
}

/* ---------------- effects ---------------- */
/** flames that lick and flicker, with rising embers (a fire, a burning house, a forge, a diya with small size) */
export function Fire({ x, y, w = 260, h = 360, at = 0, embers = true }: { x: number; y: number; w?: number; h?: number; at?: number; embers?: boolean }) {
  const { t } = useScene();
  if (t < at) return null;
  const grow = ease.out(clamp01((t - at) / 0.8));
  const tongue = (i: number, col: string, sc: number) => {
    const ph = t * (5 + i) + i * 2, sway = Math.sin(ph) * 14, top = h * sc * (0.85 + 0.15 * Math.sin(ph * 1.7));
    return <path key={col + i} d={`M${w / 2 - (w / 2) * sc} ${h} Q${w / 2 - w * 0.4 * sc + sway} ${h - top * 0.5} ${w / 2 + sway * 1.5} ${h - top} Q${w / 2 + w * 0.4 * sc + sway} ${h - top * 0.5} ${w / 2 + (w / 2) * sc} ${h} Z`} fill={col} />;
  };
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h, width: w, height: h, transform: `scaleY(${grow})`, transformOrigin: "50% 100%" }}>
      <div style={{ position: "absolute", left: -w * 0.4, right: -w * 0.4, top: h * 0.1, bottom: -h * 0.2, borderRadius: "50%", background: "radial-gradient(circle, rgb(255 160 40/0.45), transparent 65%)", opacity: 0.8 + Math.sin(t * 13) * 0.15 }} />
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "blur(1.5px)" }}>
        {[0, 1, 2].map((i) => tongue(i, "color-mix(in srgb, var(--fire, #ff9a1c) 78%, #000)", 1 - i * 0.08))}{[0, 1].map((i) => tongue(i + 3, "var(--fire, #ff9a1c)", 0.7 - i * 0.08))}{tongue(6, "var(--glow, #ffe066)", 0.4)}
      </svg>
      {embers && Array.from({ length: 12 }, (_, i) => { const life = 1.6, k = ((t - at + (i / 12) * life) % life) / life; return <div key={i} style={{ position: "absolute", left: w / 2 + (rand(i) - 0.5) * w * 0.8 + Math.sin(k * 6 + i) * 20, top: h * (0.7 - k * 1.1), width: 7, height: 7, borderRadius: 4, background: "#ffcf5a", opacity: 1 - k, boxShadow: "0 0 10px var(--fire, #ff9a1c)" }} />; })}
    </div>
  );
}
/** a blast: a flash, a fireball that swells and darkens to smoke, flying debris and a shock ring */
export function Explosion({ x, y, at = 0, size = 420 }: { x: number; y: number; at?: number; size?: number }) {
  const { t } = useScene();
  const s = t - at;
  if (s < 0) return null;
  const k = ease.out(clamp01(s / 0.6)), fade = clamp01((s - 0.8) / 1.4);
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {s < 0.25 && <div style={{ position: "fixed", inset: 0, background: "#fff", opacity: 1 - s / 0.25 }} />}
      <div style={{ position: "absolute", left: -size * k * 1.4, top: -size * k * 0.35, width: size * k * 2.8, height: size * k * 0.7, borderRadius: "50%", border: `${10 * (1 - k)}px solid rgb(255 255 255/0.8)`, opacity: 1 - k }} />
      {Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2, r = size * 0.35 * k * (0.6 + rand(i) * 0.5), d = size * (0.5 + rand(i + 4) * 0.5) * k; return <div key={i} style={{ position: "absolute", left: Math.cos(a) * r - d / 2, top: Math.sin(a) * r * 0.8 - d / 2 - s * 60, width: d, height: d, borderRadius: "50%", background: `radial-gradient(circle, ${fade < 0.3 ? "#fff3b0" : "#9a8a80"}, ${fade < 0.4 ? "color-mix(in srgb, var(--fire, #ff9a1c) 94%, #000)" : "#5a5050"} 55%, transparent 72%)`, opacity: 1 - fade * 0.85, filter: "blur(3px)" }} />; })}
      {Array.from({ length: 16 }, (_, i) => { const a = rand(i + 9) * Math.PI * 2, v = 500 + rand(i + 2) * 700; return <div key={"d" + i} style={{ position: "absolute", left: Math.cos(a) * v * s, top: Math.sin(a) * v * s * 0.7 + 900 * s * s, width: 14, height: 10, background: "var(--hair, #2a2320)", transform: `rotate(${s * 700 + i * 40}deg)`, opacity: 1 - clamp01(s - 1) }} />; })}
    </div>
  );
}
/** lightning: a jagged bolt cracks down with a flash of the whole sky, again and again */
export function Lightning({ x, y = 0, length = 700, at = 0, every = 2.4, color = "#e8f1ff" }: { x: number; y?: number; length?: number; at?: number; every?: number; color?: string }) {
  const { t } = useScene();
  const s = t - at;
  if (s < 0) return null;
  const n = Math.floor(s / every), p = s - n * every;
  if (p > 0.35) return null;
  const pts: Pt[] = [[x, y]];
  for (let i = 1; i <= 10; i++) pts.push([x + (rand(n * 13 + i) - 0.5) * 140, y + (length * i) / 10]);
  const on = p < 0.08 || (p > 0.16 && p < 0.24);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: color, opacity: on ? 0.35 : 0 }} />
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%"><path d={"M" + pts.map((q) => q.join(" ")).join(" L")} fill="none" stroke={color} strokeWidth={on ? 10 : 4} style={{ filter: `drop-shadow(0 0 18px ${color})` }} opacity={on ? 1 : 0.4} /></svg>
    </>
  );
}
/** a burst of confetti that flutters down (a win, a launch, a celebration) */
export function Confetti({ at = 0, count = 120, x, y }: { at?: number; count?: number; x?: number; y?: number }) {
  const { t, W, H, theme } = useScene();
  const s = t - at;
  if (s < 0) return null;
  const cols = [theme.accent, theme.accent2, "color-mix(in srgb, var(--glow, #ffe066) 95%, #000)", "#4ac0ff", "#ff6b8a", "#7bd35a"], ox = x ?? W / 2, oy = y ?? H * 0.35;
  return <>{Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (rand(i) - 0.5) * 2.4, v = 700 + rand(i + 1) * 900, drag = Math.min(s, 0.6);
    const px = ox + Math.cos(a) * v * drag + Math.sin(s * 3 + i) * 40 * s, py = oy + Math.sin(a) * v * drag + Math.max(0, s - 0.6) * (180 + rand(i + 2) * 120);
    return <div key={i} style={{ position: "absolute", left: px, top: py, width: 16, height: 26, background: cols[i % cols.length], borderRadius: 3, transform: `rotate(${s * (300 + rand(i + 3) * 400) + i * 30}deg) rotateX(${s * 600 + i * 20}deg)`, opacity: py > H + 40 ? 0 : 1 }} />;
  })}</>;
}
/** sparkles twinkle over an area (magic, something new and shiny, a clean result) */
export function Sparkle({ x, y, w = 400, h = 300, count = 14, at = 0, color = "#ffe9a0" }: { x: number; y: number; w?: number; h?: number; count?: number; at?: number; color?: string }) {
  const { t } = useScene();
  if (t < at) return null;
  return <>{Array.from({ length: count }, (_, i) => {
    const k = Math.max(0, Math.sin((t - at) * (2 + rand(i) * 2) + i * 1.7)), s = 18 + rand(i + 4) * 30;
    return <svg key={i} width={s * 2} height={s * 2} viewBox="-10 -10 20 20" style={{ position: "absolute", left: x + rand(i + 1) * w - s, top: y + rand(i + 2) * h - s, transform: `scale(${k}) rotate(${t * 60}deg)`, filter: `drop-shadow(0 0 6px ${color})` }}><path d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z" fill={color} /></svg>;
  })}</>;
}
/** rays of light fan down from a point and slowly turn (sunlight through clouds, a holy light, a reveal) */
export function LightRays({ x, y, rays = 10, length = 1400, at = 0, color = "rgb(255 240 200)", spread = 70 }: { x: number; y: number; rays?: number; length?: number; at?: number; color?: string; spread?: number }) {
  const { t } = useScene();
  const k = ease.out(clamp01((t - at) / 1.2));
  return <div style={{ position: "absolute", left: x, top: y, opacity: k, mixBlendMode: "screen" }}>{Array.from({ length: rays }, (_, i) => {
    const a = 90 - spread / 2 + (i / (rays - 1)) * spread + Math.sin(t * 0.3 + i) * 3;
    return <div key={i} style={{ position: "absolute", left: 0, top: 0, width: length, height: 40 + rand(i) * 70, background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.25 + 0.2 * Math.sin(t + i * 2), transformOrigin: "0 50%", transform: `rotate(${a}deg) translateY(-50%)`, filter: "blur(10px)" }} />;
  })}</div>;
}
/** a digital glitch over anything: colour channels split, slices jump sideways, for a moment (hacked, broken, a twist) */
export function Glitch({ at = 0, dur = 0.6, every = 0, children }: { at?: number; dur?: number; every?: number; children: ReactNode }) {
  const { t } = useScene();
  const s = t - at, p = every > 0 ? ((s % every) + every) % every : s;
  const on = s >= 0 && p < dur;
  if (!on) return <>{children}</>;
  const seed = Math.floor(t * 24), off = (rand(seed) - 0.5) * 40;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${off}px)`, filter: "drop-shadow(-8px 0 0 rgb(255 0 80/0.7)) drop-shadow(8px 0 0 rgb(0 220 255/0.7))" }}>{children}</div>
      {Array.from({ length: 5 }, (_, i) => { const y0 = rand(seed + i) * 90, h = 2 + rand(seed + i + 9) * 8; return <div key={i} style={{ position: "absolute", inset: 0, clipPath: `inset(${y0}% 0 ${100 - y0 - h}% 0)`, transform: `translateX(${(rand(seed + i * 3) - 0.5) * 160}px)` }}>{children}</div>; })}
    </div>
  );
}
/** the look of old film over anything: sepia, grain, flicker, scratches, a dark edge and a gate that jitters */
export function OldFilm({ children, amount = 1 }: { children: ReactNode; amount?: number }) {
  const { frame, W, H } = useScene();
  const jitter = (rand(frame) - 0.5) * 4 * amount;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${jitter}px)`, filter: `sepia(${0.75 * amount}) contrast(1.1) brightness(${0.95 + (rand(frame + 3) - 0.5) * 0.12 * amount})` }}>{children}</div>
      {Array.from({ length: 3 }, (_, i) => rand(frame * 3 + i) > 0.5 ? <div key={i} style={{ position: "absolute", left: rand(frame + i * 7) * W, top: 0, width: 2, height: H, background: "rgb(255 255 255/0.35)" }} /> : null)}
      {rand(frame + 11) > 0.85 && <div style={{ position: "absolute", left: rand(frame) * W, top: rand(frame + 1) * H, width: 8, height: 8, borderRadius: 4, background: "#000", opacity: 0.6 }} />}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 55%, rgb(20 10 0/0.7) 100%)", opacity: amount }} />
      <svg style={{ position: "absolute", inset: 0, opacity: 0.35 * amount }} width="100%" height="100%"><filter id="filmgrain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={frame % 50} /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" /></filter><rect width="100%" height="100%" filter="url(#filmgrain)" /></svg>
    </div>
  );
}
/** heat shimmer: the air wobbles over hot ground, bending what is behind it (a desert, a road at noon, a fever) */
export function HeatShimmer({ children, amount = 1 }: { children: ReactNode; amount?: number }) {
  const { t } = useScene();
  const id = "shimmer";
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={0} height={0} style={{ position: "absolute" }}><filter id={id}><feTurbulence type="fractalNoise" baseFrequency={`0.008 ${0.04 + Math.sin(t) * 0.004}`} numOctaves={2} seed={Math.floor(t * 8)} /><feDisplacementMap in="SourceGraphic" scale={14 * amount} /></filter></svg>
      <div style={{ position: "absolute", inset: 0, filter: `url(#${id})` }}>{children}</div>
    </div>
  );
}

/* ---------------- signals: lines and waves that carry meaning ---------------- */
/** a heartbeat line (ECG) sweeping across a monitor; `bpm` sets the speed, `flat` after a time stops it */
export function HeartLine({ w = 900, h = 260, bpm = 72, at = 0, color = "var(--signal, #3ff28a)", flat, glow = true }: { w?: number; h?: number; bpm?: number; at?: number; color?: string; flat?: number; glow?: boolean }) {
  const { t } = useScene();
  const s = Math.max(0, t - at), per = 60 / bpm, speed = w / 3;
  const beat = (u: number) => { const p = (u % per) / per; return p < 0.1 ? Math.sin((p / 0.1) * Math.PI) * 0.12 : p < 0.16 ? 0 : p < 0.19 ? -0.25 : p < 0.23 ? 1 : p < 0.27 ? -0.4 : p < 0.45 ? Math.sin(((p - 0.27) / 0.18) * Math.PI) * 0.2 : 0; };
  const head = (s * speed) % w;
  const pts = Array.from({ length: 181 }, (_, i) => { const x = (i / 180) * w, ago = (head - x + w) % w, when = s - ago / speed; const v = when < 0 || (flat !== undefined && when > flat - at) ? 0 : beat(when); return `${x.toFixed(1)} ${(h / 2 - v * h * 0.42).toFixed(1)}`; });
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <path d={"M" + pts.join(" L")} fill="none" stroke={color} strokeWidth={5} strokeLinejoin="round" style={glow ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined} />
      <rect x={head} y={0} width={40} height={h} fill="#000" opacity={0.85} />
      <circle cx={head} cy={pts[Math.round((head / w) * 180)]?.split(" ")[1] ?? h / 2} r={8} fill={color} />
    </svg>
  );
}
/** a sound wave: bars or a line that move with a voice, music or a noise */
export function SoundWave({ w = 800, h = 220, bars = 48, at = 0, loud = 1, color, line = false }: { w?: number; h?: number; bars?: number; at?: number; loud?: number; color?: string; line?: boolean }) {
  const { t, theme } = useScene();
  const s = Math.max(0, t - at), on = t >= at ? 1 : 0.08;
  const v = (i: number) => on * loud * (0.25 + 0.75 * Math.abs(Math.sin(s * 7 + i * 0.6) * Math.sin(s * 3.1 + i * 0.23)));
  const col = color ?? theme.accent;
  if (line) return <svg width={w} height={h}><path d={"M" + Array.from({ length: 121 }, (_, i) => `${(i / 120) * w} ${h / 2 + Math.sin(i * 0.35 + s * 9) * v(i) * h * 0.4 * Math.sin((i / 120) * Math.PI)}`).join(" L")} fill="none" stroke={col} strokeWidth={6} /></svg>;
  return <svg width={w} height={h}>{Array.from({ length: bars }, (_, i) => { const bh = Math.max(8, v(i) * h); return <rect key={i} x={(i / bars) * w} y={h / 2 - bh / 2} width={(w / bars) * 0.6} height={bh} rx={4} fill={col} />; })}</svg>;
}
/** a radar sweep turning round with blips that light up as it passes (a search, a hunt, air traffic) */
export function Radar({ size = 560, at = 0, blips = [[0.3, 0.4], [0.7, 0.3], [0.6, 0.75]], color = "#3ff28a" }: { size?: number; at?: number; blips?: Pt[]; color?: string }) {
  const { t } = useScene();
  const a = ((t - at) * 120) % 360, r = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: "50%", background: "#04170c", overflow: "hidden", boxShadow: `0 0 0 8px #0b2a18, 0 0 40px ${color}55` }}>
      {[0.33, 0.66, 1].map((f) => <div key={f} style={{ position: "absolute", left: r - r * f, top: r - r * f, width: size * f, height: size * f, borderRadius: "50%", border: `2px solid ${color}55` }} />)}
      <div style={{ position: "absolute", left: 0, top: r, width: size, height: 2, background: `${color}55` }} /><div style={{ position: "absolute", top: 0, left: r, height: size, width: 2, background: `${color}55` }} />
      <div style={{ position: "absolute", inset: 0, background: `conic-gradient(from ${a}deg, ${color}aa, transparent 60deg, transparent)`, transform: "scaleX(-1)" }} />
      {blips.map(([bx, by], i) => { const ba = ((Math.atan2(by - 0.5, bx - 0.5) * 180) / Math.PI + 90 + 360) % 360, since = ((a - ba + 360) % 360) / 360; return <div key={i} style={{ position: "absolute", left: bx * size - 10, top: by * size - 10, width: 20, height: 20, borderRadius: 10, background: color, opacity: t < at ? 0 : 1 - since, boxShadow: `0 0 16px ${color}` }} />; })}
    </div>
  );
}
/** rings of signal spread out from a point again and again (a tower, Wi-Fi, a phone call, news spreading) */
export function SignalRings({ x, y, at = 0, every = 0.8, size = 300, color, arc = false }: { x: number; y: number; at?: number; every?: number; size?: number; color?: string; arc?: boolean }) {
  const { t, theme } = useScene();
  const s = t - at;
  if (s < 0) return null;
  return <svg style={{ position: "absolute", left: x - size, top: y - size, overflow: "visible" }} width={size * 2} height={size * 2}>{[0, 1, 2].map((n) => {
    const k = ((s / every + n / 3) % 1), r = 20 + k * size;
    return arc ? <path key={n} d={`M${size - r * 0.7} ${size - r * 0.7} A${r} ${r} 0 0 1 ${size + r * 0.7} ${size - r * 0.7}`} fill="none" stroke={color ?? theme.accent} strokeWidth={10 * (1 - k) + 2} opacity={1 - k} strokeLinecap="round" />
      : <circle key={n} cx={size} cy={size} r={r} fill="none" stroke={color ?? theme.accent} strokeWidth={8 * (1 - k) + 2} opacity={1 - k} />;
  })}</svg>;
}
/** packets (dots or small things) stream along a pipe between points (data over the internet, blood in a vein, goods) */
export function Packets({ points, at = 0, count = 8, speed = 0.35, size = 26, color, pipe = true, item }: { points: Pt[]; at?: number; count?: number; speed?: number; size?: number; color?: string; pipe?: boolean; item?: ReactNode }) {
  const { t, theme } = useScene();
  const c = curve(points), s = Math.max(0, t - at), col = color ?? theme.accent;
  return (
    <>
      {pipe && <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%"><path d={c.d} fill="none" stroke="rgb(0 0 0/0.12)" strokeWidth={size * 2.2} strokeLinecap="round" /><path d={c.d} fill="none" stroke={theme.paper ?? "#fff"} strokeWidth={size * 1.6} strokeLinecap="round" /></svg>}
      {t >= at && Array.from({ length: count }, (_, i) => { const p = c.at(((s * speed + i / count) % 1)); return <div key={i} style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%,-50%) rotate(${item ? p.angle : 0}deg)` }}>{item ?? <div style={{ width: size, height: size, borderRadius: size / 4, background: col, boxShadow: `0 0 12px ${col}` }} />}</div>; })}
    </>
  );
}

/* ---------------- text that moves ---------------- */
/** letters type out one by one with a blinking caret (a message, a search, a confession, code) */
export function Typewriter({ text, at = 0, cps = 18, size = 64, color, mono = true, caret = true }: { text: string; at?: number; cps?: number; size?: number; color?: string; mono?: boolean; caret?: boolean }) {
  const { t, theme } = useScene();
  const n = Math.floor(clamp01((t - at) * cps / Math.max(1, text.length)) * text.length);
  return <div style={{ fontFamily: mono ? "'Courier New', monospace" : family(theme.font), fontSize: size, fontWeight: 700, color: color ?? theme.ink, whiteSpace: "pre-wrap", lineHeight: 1.3 }}>{text.slice(0, n)}{caret && <span style={{ opacity: Math.floor(t * 2.5) % 2 ? 0 : 1, color: theme.accent }}>▍</span>}<span style={{ opacity: 0 }}>{text.slice(n)}</span></div>;
}
/** random letters flicker and settle, one by one, into the real word (decoding a secret, a reveal, a hacker screen) */
export function Scramble({ text, at = 0, dur = 1.4, size = 110, color, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@" }: { text: string; at?: number; dur?: number; size?: number; color?: string; chars?: string }) {
  const { t, frame, theme } = useScene();
  const k = clamp01((t - at) / dur);
  return <div style={{ fontFamily: family(theme.display), fontSize: size, fontWeight: 800, color: color ?? theme.ink, letterSpacing: "0.04em", opacity: t < at ? 0 : 1 }}>{text.split("").map((c, i) => {
    const done = k > (i + 1) / (text.length + 1);
    return <span key={i} style={{ color: done ? undefined : theme.accent }}>{done || c === " " ? c : chars[Math.floor(rand(frame * 31 + i) * chars.length)]}</span>;
  })}</div>;
}
/** a word is struck through and the right one is written beside it (a myth corrected, a price changed, a wrong answer) */
export function StrikeCorrect({ wrong, right, at = 0, size = 90, color }: { wrong: string; right: string; at?: number; size?: number; color?: string }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / 0.5)), r = ease.back(clamp01((t - at - 0.5) / 0.5));
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 40, fontFamily: family(theme.display), fontSize: size, fontWeight: 800 }}>
      <span style={{ position: "relative", color: theme.muted }}>{wrong}<span style={{ position: "absolute", left: -10, top: "52%", height: size * 0.1, width: `calc(${k * 100}% + 20px)`, background: "var(--bad, #e0453a)", borderRadius: 6, transform: "rotate(-4deg)" }} /></span>
      <span style={{ color: color ?? theme.accent, transform: `scale(${r}) rotate(${(1 - r) * -12}deg)`, display: "inline-block", fontFamily: family("permanent_marker") }}>{right}</span>
    </div>
  );
}
/** the letters of a word fly in from everywhere and land in place; `out` sends them flying apart again */
export function LettersFly({ text, at = 0, dur = 1, out, size = 130, color }: { text: string; at?: number; dur?: number; out?: number; size?: number; color?: string }) {
  const { t, theme } = useScene();
  return <div style={{ display: "flex", fontFamily: family(theme.display), fontSize: size, fontWeight: 800, color: color ?? theme.ink }}>{text.split("").map((c, i) => {
    let k = ease.out(clamp01((t - at - rand(i) * 0.3) / dur));
    if (out !== undefined && t > out) k = 1 - ease.inOut(clamp01((t - out - rand(i + 3) * 0.2) / dur));
    return <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translate(${(1 - k) * (rand(i + 1) - 0.5) * 1600}px, ${(1 - k) * (rand(i + 2) - 0.5) * 1000}px) rotate(${(1 - k) * (rand(i + 4) - 0.5) * 540}deg)`, opacity: k > 0.02 ? 1 : 0 }}>{c}</span>;
  })}</div>;
}
/** words run along a curved path and scroll along it (a road sign, a river's name, a ribbon) */
export function TextOnPath({ text, points, at = 0, size = 54, color, scroll = 0 }: { text: string; points: Pt[]; at?: number; size?: number; color?: string; scroll?: number }) {
  const { t, theme } = useScene();
  const c = curve(points), k = ease.out(clamp01((t - at) / 0.8));
  return <svg style={{ position: "absolute", inset: 0, overflow: "visible", opacity: k }} width="100%" height="100%"><defs><path id="textpath" d={c.d} /></defs><text fontFamily={family(theme.display)} fontSize={size} fontWeight={800} fill={color ?? theme.ink}><textPath href="#textpath" startOffset={`${(Math.max(0, t - at) * scroll) % 100}%`}>{text}</textPath></text></svg>;
}

/* ---------------- camera: more moves over the whole shot ---------------- */
/** dolly zoom (vertigo): the subject stays the same size while the world behind it stretches away */
export function DollyZoom({ subject, back, at = 0, dur = 2.5, amount = 1 }: { subject: ReactNode; back: ReactNode; at?: number; dur?: number; amount?: number }) {
  const { t } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.6 * amount * k})`, filter: `blur(${k * 1.5}px)` }}>{back}</div>
      <div style={{ position: "absolute", inset: 0 }}>{subject}</div>
    </>
  );
}
/** crane up: the camera rises from low on the ground to high above, looking down more as it goes */
export function Crane({ at = 0, dur = 4, amount = 1, children }: { at?: number; dur?: number; amount?: number; children: ReactNode }) {
  const { t, H } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  return <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%", transform: `translateY(${k * H * 0.25 * amount}px) perspective(1800px) rotateX(${k * 28 * amount}deg) scale(${1.1 - k * 0.15})` }}>{children}</div>;
}
/** the camera circles round a thing in 3D (a product, a statue, a model of a molecule) */
export function Orbit3D({ at = 0, period = 8, tilt = 10, children }: { at?: number; period?: number; tilt?: number; children: ReactNode }) {
  const { t } = useScene();
  const a = ((t - at) / period) * 360;
  return <div style={{ perspective: 1600, width: "100%", height: "100%" }}><div style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", transform: `rotateX(${-tilt}deg) rotateY(${a}deg)` }}>{children}</div></div>;
}
/** the ground shakes: an earthquake, a blast nearby, a big impact (strong at first, then dying away) */
export function Quake({ at = 0, dur = 2, amount = 1, children }: { at?: number; dur?: number; amount?: number; children: ReactNode }) {
  const { t } = useScene();
  const s = t - at, e = s < 0 || s > dur ? 0 : (1 - s / dur) * amount;
  return <div style={{ position: "absolute", inset: 0, transform: `translate(${Math.sin(s * 63) * 24 * e}px, ${Math.cos(s * 51) * 18 * e}px) rotate(${Math.sin(s * 37) * 1.2 * e}deg)`, filter: e > 0.4 ? `blur(${e}px)` : undefined }}>{children}</div>;
}
/** the camera dives into a rectangle (a phone screen, a window, a photo) until it fills the frame, then shows `inside` */
export function ZoomInto({ rect, at = 0, dur = 1.4, inside, children }: { rect: { x: number; y: number; w: number; h: number }; at?: number; dur?: number; inside: ReactNode; children: ReactNode }) {
  const { t, W, H } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), sc = lerp(1, Math.max(W / rect.w, H / rect.h), k);
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${W / 2 - cx * sc + (cx - W / 2) * (1 - k)}px, ${H / 2 - cy * sc + (cy - H / 2) * (1 - k)}px) scale(${sc})` }}>
        {children}
        <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, overflow: "hidden", opacity: clamp01(k * 1.4 - 0.2) }}><div style={{ width: W, height: H, transform: `scale(${rect.w / W}, ${rect.h / H})`, transformOrigin: "0 0" }}>{inside}</div></div>
      </div>
    </div>
  );
}
/** the frame splits into two or more shots side by side (a call between two people, before and after, two cities) */
export function SplitScreen({ shots, at = 0, vertical = false, gap = 10 }: { shots: ReactNode[]; at?: number; vertical?: boolean; gap?: number }) {
  const { t, W, H } = useScene();
  const n = shots.length;
  return <div style={{ position: "absolute", inset: 0, background: "#000" }}>{shots.map((s, i) => {
    const k = ease.out(clamp01((t - at - i * 0.2) / 0.6)), size = ((vertical ? H : W) - gap * (n - 1)) / n;
    const pos: CSSProperties = vertical ? { left: 0, width: W, top: i * (size + gap), height: size, transform: `translateX(${(1 - k) * (i % 2 ? 1 : -1) * W}px)` } : { top: 0, height: H, left: i * (size + gap), width: size, transform: `translateY(${(1 - k) * (i % 2 ? 1 : -1) * H}px)` };
    return <div key={i} style={{ position: "absolute", overflow: "hidden", ...pos }}><div style={{ position: "absolute", left: vertical ? 0 : -(W - size) / 2, top: vertical ? -(H - size) / 2 : 0, width: W, height: H }}>{s}</div></div>;
  })}</div>;
}
/** a small second picture pops up in a corner over the main one (a reaction, a source, a live feed) */
export function PictureInPicture({ main, inset, at = 0, corner = "br", size = 0.3 }: { main: ReactNode; inset: ReactNode; at?: number; corner?: "tl" | "tr" | "bl" | "br"; size?: number }) {
  const { t, W, H } = useScene();
  const k = ease.back(clamp01((t - at) / 0.6)), w = W * size, h = H * size;
  const pos: CSSProperties = { [corner[0] === "t" ? "top" : "bottom"]: 50, [corner[1] === "l" ? "left" : "right"]: 50 };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {main}
      <div style={{ position: "absolute", ...pos, width: w, height: h, borderRadius: 18, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 18px 40px rgb(0 0 0/0.4)", transform: `scale(${k})`, transformOrigin: `${corner[1] === "l" ? 0 : 100}% ${corner[0] === "t" ? 0 : 100}%` }}>
        <div style={{ width: W, height: H, transform: `scale(${size})`, transformOrigin: "0 0" }}>{inset}</div>
      </div>
    </div>
  );
}

/* ---------------- transitions: more ways from shot A to shot B ---------------- */
export type Cut2Kind = "glitch" | "circle" | "star" | "heart" | "shutter" | "spin" | "lightleak" | "filmburn" | "blinds" | "slide-up";
/** shows A, then changes to B at `at` the chosen way */
export function Transition2({ kind, at, dur = 0.8, a, b }: { kind: Cut2Kind; at: number; dur?: number; a: ReactNode; b: ReactNode }) {
  const { t, frame, W, H } = useScene();
  const k = clamp01((t - at) / dur), e = ease.inOut(k);
  const full: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
  if (k <= 0) return <div style={full}>{a}</div>;
  if (k >= 1) return <div style={full}>{b}</div>;
  const mask = (pts: Pt[]) => `polygon(${pts.map(([x, y]) => `${W / 2 + x * e * 6}px ${H / 2 + y * e * 6}px`).join(",")})`;
  let B: CSSProperties = {}, A: CSSProperties = {}, over: ReactNode = null;
  if (kind === "glitch") { const on = k > 0.5; B = { opacity: on ? 1 : 0, transform: `translateX(${(rand(frame) - 0.5) * 80 * (1 - k)}px)` }; A = { transform: `translateX(${(rand(frame + 1) - 0.5) * 80 * k}px)`, filter: "drop-shadow(-10px 0 0 rgb(255 0 80/0.7)) drop-shadow(10px 0 0 rgb(0 220 255/0.7))" }; }
  else if (kind === "circle") B = { clipPath: `circle(${e * 80}% at 50% 50%)` };
  else if (kind === "star" || kind === "heart") B = { clipPath: mask(shapePoints(kind, 60, 200)) };
  else if (kind === "shutter") { over = Array.from({ length: 8 }, (_, i) => <div key={i} style={{ position: "absolute", left: (i / 8) * W, top: 0, width: W / 8 + 1, height: H, background: "#111", transform: `scaleY(${Math.sin(k * Math.PI)})`, transformOrigin: i % 2 ? "50% 0%" : "50% 100%" }} />); B = { opacity: k > 0.5 ? 1 : 0 }; }
  else if (kind === "blinds") B = { clipPath: `polygon(${Array.from({ length: 10 }, (_, i) => { const y0 = (i / 10) * H, y1 = y0 + (H / 10) * e; return `0 ${y0}px, ${W}px ${y0}px, ${W}px ${y1}px, 0 ${y1}px, 0 ${y0}px`; }).join(",")})` };
  else if (kind === "spin") { A = { transform: `rotate(${e * 180}deg) scale(${1 - e})`, opacity: 1 - e }; B = { transform: `rotate(${(e - 1) * 180}deg) scale(${e})`, opacity: e }; }
  else if (kind === "slide-up") { A = { transform: `translateY(${-e * 100}%)` }; B = { transform: `translateY(${(1 - e) * 100}%)` }; }
  else if (kind === "lightleak") { B = { opacity: clamp01((k - 0.4) * 2.5) }; over = <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at ${30 + k * 50}% 40%, rgb(255 200 120/0.95), rgb(255 90 60/0.6) 40%, transparent 75%)`, opacity: Math.sin(k * Math.PI), mixBlendMode: "screen" }} />; }
  else if (kind === "filmburn") { B = { opacity: clamp01((k - 0.5) * 3) }; over = <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 60% 50%, #fff ${e * 30}%, #ffb347 ${e * 50}%, #8b2a00 ${e * 70}%, transparent ${e * 95}%)`, opacity: Math.sin(k * Math.PI), mixBlendMode: "screen" }} />; }
  return <div style={full}><div style={{ ...full, ...A }}>{a}</div><div style={{ ...full, ...B }}>{b}</div>{over}</div>;
}

/* ---------------- time ---------------- */
/** a time-lapse: the sun crosses the sky, shadows swing round, clouds race (a day passing in seconds) */
export function TimeLapse({ at = 0, dur = 6, children }: { at?: number; dur?: number; children?: ReactNode }) {
  const { t, W, H } = useScene();
  const k = clamp01((t - at) / dur), a = Math.PI * (1 - k), sx = W / 2 + Math.cos(a) * W * 0.45, sy = H * 0.75 - Math.sin(a) * H * 0.6;
  const light = Math.sin(k * Math.PI);
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(rgb(${40 + light * 70} ${60 + light * 120} ${110 + light * 130}), rgb(${120 + light * 110} ${110 + light * 110} ${120 + light * 110}))`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: sx - 60, top: sy - 60, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(#fff7d0, #ffc84a)", boxShadow: "0 0 100px 40px rgb(255 200 90/0.45)" }} />
      {Array.from({ length: 5 }, (_, i) => <div key={i} style={{ position: "absolute", left: ((rand(i) * W + (t - at) * 500 * (0.6 + rand(i + 2))) % (W + 400)) - 300, top: H * (0.08 + rand(i + 4) * 0.25), width: 300, height: 80, borderRadius: 60, background: "rgb(255 255 255/0.75)", filter: "blur(4px)" }} />)}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.25, background: `rgb(${50 + light * 60} ${80 + light * 70} ${50 + light * 30})` }} />
      <div style={{ position: "absolute", left: W / 2 - 20, bottom: H * 0.25, width: 40, height: 220, background: "#5a4030" }} />
      <div style={{ position: "absolute", left: W / 2, bottom: H * 0.25 - 10, width: 380, height: 20, borderRadius: 10, background: "rgb(0 0 0/0.3)", transformOrigin: "0 50%", transform: `rotate(${180 - k * 180}deg) scaleX(${0.4 + (1 - light) * 0.8})`, filter: "blur(3px)" }} />
      {children}
    </div>
  );
}
/** a tree through the seasons: spring blossom, summer green, autumn orange with falling leaves, winter bare with snow */
export function Seasons({ x, y, size = 520, at = 0, per = 1.8, labels = true }: { x: number; y: number; size?: number; at?: number; per?: number; labels?: boolean }) {
  const { t, theme } = useScene();
  const n = clamp01((t - at) / (per * 4)) * 3.999, i = Math.floor(n), f = n - i;
  const cols = ["#f7b5cf", "#4caa4a", "#e88a2a", "#e8eef2"], names = ["Spring", "Summer", "Autumn", "Winter"];
  const mixC = (a: string, b: string) => { const pa = [1, 3, 5].map((j) => parseInt(a.slice(j, j + 2), 16)), pb = [1, 3, 5].map((j) => parseInt(b.slice(j, j + 2), 16)); return `rgb(${pa.map((v, j) => Math.round(lerp(v, pb[j], ease.inOut(clamp01((f - 0.7) / 0.3))))).join(" ")})`; };
  const crown = mixC(cols[i], cols[Math.min(3, i + 1)]);
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size }}>
      <svg width={size} height={size} style={{ overflow: "visible" }}>
        <rect x={size / 2 - 22} y={size * 0.5} width={44} height={size * 0.5} rx={10} fill="#6b4a2f" />
        {[[0.5, 0.32, 0.3], [0.3, 0.42, 0.22], [0.7, 0.42, 0.22], [0.5, 0.18, 0.2]].map(([cx, cy, r], j) => <circle key={j} cx={cx * size} cy={cy * size} r={r * size * (i === 3 ? 0.7 : 1)} fill={crown} opacity={i === 3 ? 0.55 : 1} />)}
        {i === 2 && Array.from({ length: 10 }, (_, j) => { const k = ((t * 0.4 + j / 10) % 1); return <ellipse key={j} cx={size * (0.25 + rand(j) * 0.5) + Math.sin(k * 8 + j) * 30} cy={size * 0.4 + k * size * 0.6} rx={9} ry={5} fill="#d4621c" />; })}
        {i === 3 && Array.from({ length: 24 }, (_, j) => { const k = ((t * 0.25 + j / 24) % 1); return <circle key={j} cx={rand(j) * size + Math.sin(k * 6 + j) * 20} cy={k * size} r={4} fill="#fff" />; })}
      </svg>
      {labels && <div style={{ textAlign: "center", fontFamily: family(theme.display), fontSize: 58, fontWeight: 800, color: theme.ink }}>{names[i]}</div>}
    </div>
  );
}
/** an hourglass: sand runs from the top bulb to the bottom (time running out, waiting, a deadline) */
export function Hourglass({ size = 380, at = 0, dur = 6, color = "#e0b24a" }: { size?: number; at?: number; dur?: number; color?: string }) {
  const { t, theme } = useScene();
  const k = clamp01((t - at) / dur), w = size * 0.6, h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 60 100">
      <defs><clipPath id="hgtop"><path d="M8 8 L52 8 L32 48 L28 48 Z" /></clipPath><clipPath id="hgbot"><path d="M28 52 L32 52 L52 92 L8 92 Z" /></clipPath></defs>
      <rect x={8} y={8 + 40 * k} width={44} height={40} fill={color} clipPath="url(#hgtop)" />
      <path d={`M8 92 L52 92 L${30 + 22 * k} ${92 - 30 * k} L${30 - 22 * k} ${92 - 30 * k} Z`} fill={color} clipPath="url(#hgbot)" />
      {k > 0 && k < 1 && <rect x={29.2} y={48} width={1.6} height={44 - 30 * k} fill={color} />}
      <path d="M8 8 L52 8 L32 50 L52 92 L8 92 L28 50 Z" fill="rgb(255 255 255/0.25)" stroke={theme.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <rect x={2} y={2} width={56} height={7} rx={3} fill={theme.ink} /><rect x={2} y={91} width={56} height={7} rx={3} fill={theme.ink} />
    </svg>
  );
}
/** plays what is inside slower (×speed, e.g. 0.25) from `at`, with a slow-motion mark (a fall, a splash, a key moment) */
export function SlowMo({ at = 0, speed = 0.25, children, mark = true }: { at?: number; speed?: number; children: ReactNode; mark?: boolean }) {
  const { frame, fps, t, theme } = useScene();
  const a = Math.round(at * fps), f = frame < a ? frame : Math.round(a + (frame - a) * speed);
  return (
    <>
      <Freeze frame={f}>{children}</Freeze>
      {mark && t >= at && <div style={{ position: "absolute", right: 60, top: 50, fontFamily: family(theme.display), fontSize: 50, fontWeight: 800, color: "#fff", background: "rgb(0 0 0/0.55)", padding: "6px 22px", borderRadius: 12 }}>SLOW ×{speed}</div>}
    </>
  );
}
/** years pass on a face or a place: a counter of years runs while the picture greys and ages (a life, a ruin) */
export function YearsPass({ from, to, at = 0, dur = 4, children, size = 90 }: { from: number; to: number; at?: number; dur?: number; children: ReactNode; size?: number }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, filter: `sepia(${k * 0.7}) grayscale(${k * 0.4}) contrast(${1 - k * 0.1})` }}>{children}</div>
      <div style={{ position: "absolute", left: 50, bottom: 40, fontFamily: family(theme.display), fontSize: size, fontWeight: 800, color: "#fff", textShadow: "0 4px 14px rgb(0 0 0/0.6)" }}>{Math.round(lerp(from, to, k))}</div>
    </div>
  );
}

/* ---------------- UI actions: a person using a screen ---------------- */
/** a finger or cursor taps a point: a ripple spreads, the spot dips (a button, a like, an app icon) */
export function Tap({ x, y, at = 0, finger = true, color }: { x: number; y: number; at?: number; finger?: boolean; color?: string }) {
  const { t, theme } = useScene();
  const s = t - at, come = ease.out(clamp01((s + 0.5) / 0.5)), r = clamp01(s / 0.5);
  if (s < -0.5) return null;
  return (
    <>
      {s > 0 && <div style={{ position: "absolute", left: x - 70 * r, top: y - 70 * r, width: 140 * r, height: 140 * r, borderRadius: "50%", border: `6px solid ${color ?? theme.accent}`, opacity: 1 - r }} />}
      <div style={{ position: "absolute", left: x + (1 - come) * 160, top: y + (1 - come) * 200, transform: `scale(${s > 0 && s < 0.2 ? 0.9 : 1})`, fontSize: 90, lineHeight: 1, filter: "drop-shadow(0 8px 10px rgb(0 0 0/0.3))" }}>{finger ? "👆" : "🖱️"}</div>
    </>
  );
}
/** a finger swipes across a screen, leaving a fading trail (next card, unlock, dismiss) */
export function Swipe({ from, to, at = 0, dur = 0.6 }: { from: Pt; to: Pt; at?: number; dur?: number }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), x = lerp(from[0], to[0], k), y = lerp(from[1], to[1], k);
  if (t < at - 0.3 || t > at + dur + 0.6) return null;
  return (
    <>
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%"><line x1={from[0]} y1={from[1]} x2={x} y2={y} stroke={theme.accent} strokeWidth={22} strokeLinecap="round" opacity={0.35 * (1 - clamp01((t - at - dur) / 0.5))} /></svg>
      <div style={{ position: "absolute", left: x - 30, top: y - 20, fontSize: 90, lineHeight: 1 }}>👆</div>
    </>
  );
}
/** a long list or page scrolls up inside a window, easing to a stop (a feed, search results, a long document) */
export function Scroll({ h, distance, at = 0, dur = 2.5, children }: { h: number; distance: number; at?: number; dur?: number; children: ReactNode }) {
  const { t } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  return <div style={{ height: h, overflow: "hidden", position: "relative" }}><div style={{ transform: `translateY(${-k * distance}px)` }}>{children}</div></div>;
}
/** an input box where text is typed in, with a caret, then a send/search button lights (a search, a login, a chat) */
export function TypeInto({ text, at = 0, w = 900, cps = 16, button = "Search", placeholder = "Type here…" }: { text: string; at?: number; w?: number; cps?: number; button?: string; placeholder?: string }) {
  const { t, theme } = useScene();
  const n = Math.floor(clamp01((t - at) * cps / Math.max(1, text.length)) * text.length), done = n >= text.length;
  return (
    <div style={{ display: "flex", gap: 16, width: w, fontFamily: family(theme.font) }}>
      <div style={{ flex: 1, height: 100, borderRadius: 50, background: "#fff", border: `4px solid ${done ? theme.accent : "#d5dae0"}`, display: "flex", alignItems: "center", padding: "0 40px", fontSize: 40, color: n ? "#222" : "color-mix(in srgb, var(--metal, #8a939d) 85%, #fff)", boxShadow: "0 10px 26px rgb(0 0 0/0.12)" }}>{n ? text.slice(0, n) : placeholder}{!done && <span style={{ opacity: Math.floor(t * 2.5) % 2 ? 0 : 1, color: theme.accent }}>|</span>}</div>
      <div style={{ height: 100, padding: "0 40px", borderRadius: 50, background: done ? theme.accent : "#c5cad0", color: "#fff", fontSize: 38, fontWeight: 800, display: "grid", placeItems: "center", transform: `scale(${done ? 1 + 0.05 * Math.exp(-(t - at - text.length / cps) * 5) : 1})` }}>{button}</div>
    </div>
  );
}
/** a thing is picked up, carried along a curve and dropped into a target, which flashes (sort, file, add to cart) */
export function DragDrop({ from, to, at = 0, dur = 1.2, children }: { from: Pt; to: Pt; at?: number; dur?: number; children: ReactNode }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), lift = Math.sin(k * Math.PI);
  const x = lerp(from[0], to[0], k), y = lerp(from[1], to[1], k) - lift * 120, landed = t > at + dur;
  return (
    <>
      <div style={{ position: "absolute", left: to[0] - 110, top: to[1] - 110, width: 220, height: 220, borderRadius: 30, border: `6px dashed ${landed ? theme.accent : "#b5bcc4"}`, background: landed ? `${theme.accent}22` : undefined }} />
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${1 + lift * 0.12}) rotate(${lift * 6}deg)`, filter: `drop-shadow(0 ${10 + lift * 30}px ${12 + lift * 14}px rgb(0 0 0/0.3))` }}>{children}</div>
    </>
  );
}
/** a switch flips from off to on (a setting, a choice, a light) */
export function Toggle({ at = 0, size = 200, label, on: onColor }: { at?: number; size?: number; label?: string; on?: string }) {
  const { t, theme } = useScene();
  const k = ease.back(clamp01((t - at) / 0.4)), w = size, h = size * 0.55;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 30, fontFamily: family(theme.font), fontSize: 46, fontWeight: 700, color: theme.ink }}>
      <div style={{ width: w, height: h, borderRadius: h, background: k > 0.5 ? onColor ?? "var(--good, #3fb35a)" : "#c5cad0", position: "relative", boxShadow: "inset 0 4px 8px rgb(0 0 0/0.2)" }}>
        <div style={{ position: "absolute", top: h * 0.08, left: h * 0.08 + k * (w - h), width: h * 0.84, height: h * 0.84, borderRadius: "50%", background: "#fff", boxShadow: "0 4px 10px rgb(0 0 0/0.3)" }} />
      </div>
      {label}
    </div>
  );
}
/** a loading spinner that turns until `until`, then becomes a tick (waiting for a result) */
export function Spinner({ size = 180, at = 0, until, color }: { size?: number; at?: number; until?: number; color?: string }) {
  const { t, theme } = useScene();
  const col = color ?? theme.accent, done = until !== undefined && t > until, k = done ? ease.back(clamp01((t - (until ?? 0)) / 0.4)) : 0;
  if (t < at) return null;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100">
      {!done && <circle r={40} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" strokeDasharray="70 200" transform={`rotate(${(t - at) * 360})`} />}
      {done && <><circle r={44 * k} fill={col} /><path d="M-18 0 L-5 13 L20 -14" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 2`} /></>}
    </svg>
  );
}
/** a progress bar that fills to a value with its percentage (a download, a goal, a project) */
export function ProgressBar({ to = 1, at = 0, dur = 2.5, w = 1000, h = 56, label, color }: { to?: number; at?: number; dur?: number; w?: number; h?: number; label?: string; color?: string }) {
  const { t, theme } = useScene();
  const v = to * ease.inOut(clamp01((t - at) / dur));
  return (
    <div style={{ width: w, fontFamily: family(theme.font) }}>
      {label && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 700, color: theme.ink, marginBottom: 12 }}><span>{label}</span><span>{Math.round(v * 100)}%</span></div>}
      <div style={{ width: w, height: h, borderRadius: h, background: "rgb(0 0 0/0.1)", overflow: "hidden" }}><div style={{ width: `${v * 100}%`, height: "100%", borderRadius: h, background: `repeating-linear-gradient(45deg, ${color ?? theme.accent} 0 24px, ${color ?? theme.accent}cc 24px 48px)`, backgroundPositionX: t * 60 }} /></div>
    </div>
  );
}

/* ---------------- rhythm ---------------- */
/** an equaliser: bars that jump to the music's beat (a song, a party, a podcast) */
export function Equalizer({ bars = 16, w = 600, h = 260, at = 0, bps = 2, color }: { bars?: number; w?: number; h?: number; at?: number; bps?: number; color?: string }) {
  const { t, theme } = useScene();
  const s = Math.max(0, t - at), kick = Math.exp(-((s * bps) % 1) * 5);
  return <div style={{ display: "flex", alignItems: "flex-end", gap: 8, width: w, height: h }}>{Array.from({ length: bars }, (_, i) => { const v = t < at ? 0.05 : 0.2 + 0.8 * clamp01(kick * (0.6 + 0.4 * rand(i + Math.floor(s * bps) * 17)) * (1 - Math.abs(i - bars / 2) / bars)); return <div key={i} style={{ flex: 1, height: v * h, borderRadius: 6, background: `linear-gradient(${color ?? theme.accent}, ${theme.accent2})` }} />; })}</div>;
}

/* ---------------- the catalogue: what the agent can choose from (names, what each does) ---------------- */
export const MOTIONS_CATALOG_B: { group: string; items: [string, string][] }[] = [
  { group: "Acting", items: Object.entries(MOVES2).filter(([, m]) => m.group === "acting").map(([k, m]) => [k, m.does] as [string, string]) },
  { group: "Change of form", items: Object.entries(MOVES2).filter(([, m]) => m.group === "change").map(([k, m]) => [k, m.does] as [string, string]).concat([["Morph", "one shape becomes another"], ["GrowPlant", "a plant grows and flowers"], ["BuildUp", "a building rises floor by floor"], ["LiquidLevel", "a level rises or falls"], ["PaperFold", "folds up like paper"], ["Disintegrate", "turns to dust and blows away"]]) },
  { group: "Groups", items: [["Gather", "scattered things come together (reverse: disperse)"], ["March", "rows march in step"], ["Queue", "a line moves up one by one"], ["Flock", "a swarm wheels together"]] },
  { group: "Effects", items: [["Fire", "flames and embers"], ["Explosion", "a blast with debris"], ["Lightning", "a bolt and a flash"], ["Confetti", "a burst that flutters down"], ["Sparkle", "twinkles"], ["LightRays", "rays of light"], ["Glitch", "a digital glitch"], ["OldFilm", "old film look"], ["HeatShimmer", "hot air wobbles"], ["Particles (kit)", "rain, snow, bubbles, dust, sparks, vapour, mist"], ["Grain / Flicker (kit)", "film grain, flicker"]] },
  { group: "Signals", items: [["HeartLine", "a heartbeat line (ECG)"], ["SoundWave", "bars or a wave move with sound"], ["Radar", "a sweep with blips"], ["SignalRings", "rings spread from a point"], ["Packets", "dots flow along a pipe"]] },
  { group: "Text motion", items: [["Typewriter", "letters type out"], ["Scramble", "random letters decode into the word"], ["StrikeCorrect", "struck out and corrected"], ["LettersFly", "letters fly in or apart"], ["TextOnPath", "words run along a curve"]] },
  { group: "Camera (more)", items: [["DollyZoom", "vertigo: the world stretches behind"], ["Crane", "rises up and looks down"], ["Orbit3D", "circles round in 3D"], ["Quake", "the ground shakes"], ["ZoomInto", "dives into a screen or window"], ["SplitScreen", "two or more shots side by side"], ["PictureInPicture", "a small shot in a corner"], ["Globe (block)", "fly to a place on the globe"]] },
  { group: "Transitions (more)", items: [["glitch", "a glitch cut"], ["circle", "a circle opens"], ["star", "a star-shaped mask"], ["heart", "a heart-shaped mask"], ["shutter", "shutter slices close and open"], ["blinds", "blinds open"], ["spin", "spins away"], ["slide-up", "slides up"], ["lightleak", "a warm light leak"], ["filmburn", "a film burn"]] },
  { group: "Time (more)", items: [["TimeLapse", "a day passes, sun and shadows"], ["Seasons", "a tree through four seasons"], ["Hourglass", "sand runs out"], ["SlowMo", "slow motion"], ["YearsPass", "years count while it ages"]] },
  { group: "UI actions", items: Object.entries(MOVES2).filter(([, m]) => m.group === "ui").map(([k, m]) => [k, m.does] as [string, string]).concat([["Tap", "a tap with a ripple"], ["Swipe", "a swipe across"], ["Scroll", "a page scrolls"], ["TypeInto", "typed into a box"], ["DragDrop", "dragged and dropped"], ["Toggle", "a switch flips on"], ["Spinner", "loading, then a tick"], ["ProgressBar", "a bar fills up"]]) },
  { group: "Rhythm", items: Object.entries(MOVES2).filter(([, m]) => m.group === "rhythm").map(([k, m]) => [k, m.does] as [string, string]).concat([["Equalizer", "bars jump to the beat"]]) },
];
