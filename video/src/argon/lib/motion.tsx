/* LAYER 1 of the motion library: MOTIONS, the verbs. How anything on screen moves.

   Two kinds:
   - <Move kind="drop" at={1.2}>…</Move> wraps anything (a picture, a card, a chart) and moves it. The kinds are in MOVES,
     each a small function of the time, so they combine with any block from layer 2.
   - Components for motions that need more than one transform: travel along a path, draw a line on, count a number up,
     move the camera, change from one shot to the next, bend time.

   Every motion takes its time from the scene (useScene().t, in seconds), so `at` can be a spoken word's time: s.at("crash").
   The agent chooses the motion and its settings (amount, speed, mood); how it moves is written once, here. */

import type { CSSProperties, ReactNode } from "react";
import { Freeze, useVideoConfig } from "remotion";
import { clamp01, family, useScene } from "../kit";

/* ---------------- shared helpers ---------------- */
export const ease = {
  out: (k: number) => 1 - Math.pow(1 - clamp01(k), 3),
  inOut: (k: number) => { const x = clamp01(k); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  back: (k: number) => { const x = clamp01(k), c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  bounce: (k: number) => {
    let x = clamp01(k);
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
};
/** a steady random number in 0..1 for a seed (the same every frame) */
export const rand = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
type Pt = [number, number];

/** a smooth curve through points (Catmull-Rom), measured so k = 0..1 moves at an even speed. Points written as {x, y}
 *  are taken too: a film that passes them (cast `as any`) draws its route instead of crashing the render */
export function curve(given: Pt[]) {
  const points = (given ?? []).map((p) => (Array.isArray(p) ? p : [(p as { x: number }).x, (p as unknown as { y: number }).y]) as Pt);
  if (points.length === 1) points.push(points[0]);
  const pts: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < 24; s++) {
      const t = s / 24, t2 = t * t, t3 = t2 * t;
      pts.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as Pt);
    }
  }
  pts.push(points[points.length - 1]);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[len.length - 1] || 1;
  const at = (k: number): { x: number; y: number; angle: number } => {
    const want = clamp01(k) * total;
    let i = 1;
    while (i < len.length - 1 && len[i] < want) i++;
    const f = (want - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
    const a = pts[i - 1], b = pts[i];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
  };
  const d = "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L");
  return { at, d, length: total };
}

/** a torn-paper edge as a clip polygon, revealed from left to right up to u (0..1) */
const tornClip = (u: number, seed: number) => {
  const x = u * 112 - 6, pts: string[] = ["0% 0%"];
  for (let i = 0; i <= 12; i++) pts.push(`${Math.max(0, x + (rand(seed + i) - 0.5) * 9).toFixed(1)}% ${(i / 12) * 100}%`);
  pts.push("0% 100%");
  return `polygon(${pts.join(",")})`;
};

/* ---------------- <Move>: one transform motion on anything ---------------- */
type MoveArgs = { u: number; k: number; t: number; a: number; seed: number; accent: string };
type MoveDef = { group: "enter" | "physics" | "emphasis"; does: string; fn: (m: MoveArgs) => CSSProperties };

/** fall under gravity from `h` px above and bounce to rest: the drop distance still to go at time t (s) */
function gravity(t: number, h: number, bounce = 0.42): { y: number; squash: number } {
  const g = 3200;
  let v = Math.sqrt(2 * g * h), time = Math.sqrt((2 * h) / g);
  if (t < time) return { y: h - 0.5 * g * t * t, squash: 0 };
  let start = time;
  for (let n = 0; n < 8; n++) {
    v *= bounce;
    const flight = (2 * v) / g;
    if (t < start + flight) {
      const s = t - start;
      return { y: v * s - 0.5 * g * s * s, squash: Math.max(0, 1 - s / 0.06) * Math.min(1, v / 900) };
    }
    start += flight;
  }
  return { y: 0, squash: 0 };
}

export const MOVES = {
  /* enter / exit: play forwards to come in (at), backwards to leave (out) */
  fade: { group: "enter", does: "fades in or out", fn: ({ u }) => ({ opacity: u }) },
  slide: { group: "enter", does: "slides in from the side", fn: ({ u, a }) => ({ transform: `translateX(${(1 - u) * -460 * a}px)`, opacity: clamp01(u * 2.5) }) },
  rise: { group: "enter", does: "rises up into place", fn: ({ u, a }) => ({ transform: `translateY(${(1 - u) * 160 * a}px)`, opacity: clamp01(u * 2) }) },
  drop: { group: "enter", does: "drops in from above and bounces", fn: ({ k, a }) => ({ transform: `translateY(${(1 - ease.bounce(k)) * -620 * a}px)`, opacity: k > 0 ? 1 : 0 }) },
  pop: { group: "enter", does: "pops in with an overshoot", fn: ({ k }) => ({ transform: `scale(${ease.back(k)})`, opacity: clamp01(k * 5) }) },
  grow: { group: "enter", does: "grows out of a point (its corner or origin)", fn: ({ u }) => ({ transform: `scale(${u})`, transformOrigin: "0% 100%" }) },
  unfold: { group: "enter", does: "unfolds down like a flap of card", fn: ({ u }) => ({ transformOrigin: "50% 0%", transform: `perspective(1400px) rotateX(${(1 - u) * -92}deg)`, opacity: clamp01(u * 4) }) },
  flip: { group: "enter", does: "flips over like a card", fn: ({ u }) => ({ transform: `perspective(1400px) rotateY(${(1 - u) * 92}deg)`, opacity: u > 0.02 ? 1 : 0 }) },
  tear: { group: "enter", does: "is torn in along a ragged paper edge", fn: ({ u, seed }) => ({ clipPath: tornClip(u, seed) }) },
  wipe: { group: "enter", does: "wipes in from left to right", fn: ({ u }) => ({ clipPath: `inset(0 ${(1 - u) * 100}% 0 0)` }) },
  iris: { group: "enter", does: "opens out of a circle", fn: ({ u }) => ({ clipPath: `circle(${u * 75}% at 50% 50%)` }) },
  focus: { group: "enter", does: "comes into focus from a blur", fn: ({ u }) => ({ filter: `blur(${(1 - u) * 26}px)`, opacity: clamp01(u * 1.6) }) },
  /* physics: real forces, running from `at` */
  fall: { group: "physics", does: "falls under gravity and bounces to rest", fn: ({ t, a }) => { const g = gravity(t, 640 * a); return { transform: `translateY(${-g.y}px) scale(${1 + g.squash * 0.12}, ${1 - g.squash * 0.14})`, transformOrigin: "50% 100%" }; } },
  float: { group: "physics", does: "floats weightless (zero gravity)", fn: ({ t, a, seed }) => ({ transform: `translate(${Math.sin(t * 0.7 + seed) * 22 * a}px, ${Math.sin(t * 0.93 + seed * 2.1) * 26 * a}px) rotate(${Math.sin(t * 0.41 + seed) * 9 * a}deg)` }) },
  pendulum: { group: "physics", does: "swings from the top and slows down", fn: ({ t, a }) => ({ transformOrigin: "50% 0%", transform: `rotate(${32 * a * Math.exp(-0.18 * t) * Math.cos(t * 2.4)}deg)` }) },
  spring: { group: "physics", does: "wobbles like jelly on a spring, then settles", fn: ({ t, a }) => { const w = 0.3 * a * Math.exp(-3.2 * t) * Math.sin(t * 15); return { transform: `scale(${1 + w}, ${1 - w})`, transformOrigin: "50% 100%" }; } },
  roll: { group: "physics", does: "rolls along the floor and slows to a stop", fn: ({ u, a }) => { const x = 620 * a * u; return { transform: `translateX(${x}px) rotate(${(x / 90) * 57.3}deg)` }; } },
  sway: { group: "physics", does: "sways in the wind from its base", fn: ({ t, a, seed }) => ({ transformOrigin: "50% 100%", transform: `rotate(${(Math.sin(t * 1.6 + seed) * 3.4 + Math.sin(t * 3.9 + seed) * 1.2) * a}deg) skewX(${Math.sin(t * 1.6 + seed + 0.5) * 2 * a}deg)` }) },
  /* emphasis: draw the eye to it */
  pulse: { group: "emphasis", does: "pulses like a heartbeat", fn: ({ t, a }) => ({ transform: `scale(${1 + 0.07 * a * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.2)), 3)})` }) },
  shake: { group: "emphasis", does: "shakes (an alarm, a no)", fn: ({ t, a }) => ({ transform: `translateX(${Math.sin(t * 55) * 16 * a * Math.exp(-3 * t)}px) rotate(${Math.sin(t * 47) * 2 * a * Math.exp(-3 * t)}deg)` }) },
  glow: { group: "emphasis", does: "glows", fn: ({ t, a, accent }) => ({ filter: `drop-shadow(0 0 ${(18 + 10 * Math.sin(t * 4)) * a}px ${accent})` }) },
  punch: { group: "emphasis", does: "zoom punch: jumps bigger and settles", fn: ({ t, a }) => ({ transform: `scale(${1 + 0.22 * a * clamp01(t / 0.07) * Math.exp(-5 * Math.max(0, t - 0.07))})` }) },
  tint: { group: "emphasis", does: "changes colour", fn: ({ u, a }) => ({ filter: `hue-rotate(${u * 140 * a}deg) saturate(${1 + u * 0.4})` }) },
} satisfies Record<string, MoveDef>;
export type MoveKind = keyof typeof MOVES;

/** moves anything inside it in one of the MOVES kinds (enter, physics, emphasis), from `at`; `out` plays an entrance backwards to leave */
export function Move({ kind, at = 0, dur = 0.8, amount = 1, seed = 1, out, origin, children, style }: {
  kind: MoveKind; at?: number; dur?: number; amount?: number; seed?: number; out?: number; origin?: string; children: ReactNode; style?: CSSProperties;
}) {
  const { t: now, theme } = useScene();
  const m: MoveDef = MOVES[kind];
  let k = clamp01((now - at) / dur);
  if (out !== undefined && now >= out) k = 1 - clamp01((now - out) / dur);
  const css = m.fn({ u: ease.out(k), k, t: Math.max(0, now - at), a: amount, seed, accent: theme.accent ?? "#f5b041" });
  const hidden = m.group === "enter" && (now < at || (out !== undefined && k <= 0));
  return <div style={{ ...css, transformOrigin: origin ?? css.transformOrigin, opacity: hidden ? 0 : css.opacity, ...style }}>{children}</div>;
}

/* ---------------- pieces: scatter, assemble, shatter (the same picture cut into a grid of pieces) ---------------- */
function Pieces({ w, h, cols, rows, children, place }: { w: number; h: number; cols: number; rows: number; children: ReactNode; place: (i: number, cx: number, cy: number) => CSSProperties }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, j = (n: number) => (rand(i * 7 + n) - 0.5) * 1.6;  // ragged cuts, so they read as torn pieces
    const x0 = Math.max(0, (c / cols) * 100 + (c ? j(1) : 0)), x1 = Math.min(100, ((c + 1) / cols) * 100 + (c < cols - 1 ? j(2) : 0));
    const y0 = Math.max(0, (r / rows) * 100 + (r ? j(3) : 0)), y1 = Math.min(100, ((r + 1) / rows) * 100 + (r < rows - 1 ? j(4) : 0));
    out.push(<div key={i} style={{ position: "absolute", inset: 0, clipPath: `polygon(${x0}% ${y0}%,${x1}% ${y0}%,${x1}% ${y1}%,${x0}% ${y1}%)`,
      transformOrigin: `${((c + 0.5) / cols) * 100}% ${((r + 0.5) / rows) * 100}%`, ...place(i, (c + 0.5) / cols - 0.5, (r + 0.5) / rows - 0.5) }}>{children}</div>);
  }
  return <div style={{ position: "relative", width: w, height: h }}>{out}</div>;
}
/** many pieces fly in and lock together into the picture */
export function Assemble({ w, h, at = 0, dur = 1.4, cols = 4, rows = 3, children }: { w: number; h: number; at?: number; dur?: number; cols?: number; rows?: number; children: ReactNode }) {
  const { t } = useScene();
  return <Pieces w={w} h={h} cols={cols} rows={rows} place={(i, cx, cy) => {
    const k = ease.out(clamp01((t - at - rand(i) * dur * 0.4) / (dur * 0.6)));
    return { opacity: k > 0 ? 1 : 0, transform: `translate(${(1 - k) * (cx * 900 + (rand(i + 3) - 0.5) * 400)}px, ${(1 - k) * (cy * 700 + (rand(i + 9) - 0.5) * 400)}px) rotate(${(1 - k) * (rand(i + 5) - 0.5) * 220}deg)` };
  }}>{children}</Pieces>;
}
/** the picture breaks into pieces that blow away in every direction and fade (an exit) */
export function Scatter({ w, h, at = 0, dur = 1.2, cols = 4, rows = 3, children }: { w: number; h: number; at?: number; dur?: number; cols?: number; rows?: number; children: ReactNode }) {
  const { t } = useScene();
  return <Pieces w={w} h={h} cols={cols} rows={rows} place={(i, cx, cy) => {
    const k = ease.inOut(clamp01((t - at - rand(i) * 0.25) / dur));
    return { opacity: 1 - k, transform: `translate(${k * (cx * 1300 + (rand(i + 3) - 0.5) * 500)}px, ${k * (cy * 1000 + (rand(i + 9) - 0.5) * 500)}px) rotate(${k * (rand(i + 5) - 0.5) * 360}deg) scale(${1 - 0.3 * k})` };
  }}>{children}</Pieces>;
}
/** it breaks like glass or a plate: the pieces burst a little, then fall under gravity and spin */
export function Shatter({ w, h, at = 0, cols = 5, rows = 4, children }: { w: number; h: number; at?: number; cols?: number; rows?: number; children: ReactNode }) {
  const { t } = useScene();
  const s = Math.max(0, t - at);
  return <Pieces w={w} h={h} cols={cols} rows={rows} place={(i, cx, cy) => {
    const vx = cx * 520 + (rand(i + 1) - 0.5) * 260, vy = cy * 300 - 380 - rand(i + 2) * 260;
    return { transform: `translate(${vx * s}px, ${vy * s + 0.5 * 2600 * s * s}px) rotate(${(rand(i + 4) - 0.5) * 540 * s}deg)`, opacity: s > 1.6 ? clamp01(2.2 - s) : 1 };
  }}>{children}</Pieces>;
}

/* ---------------- more physics ---------------- */
/** liquid pours from above into a glass and fills it, with a moving surface */
export function Pour({ x, y, w = 220, h = 300, at = 0, dur = 3, level = 0.8, color = "#d98a2b" }: { x: number; y: number; w?: number; h?: number; at?: number; dur?: number; level?: number; color?: string }) {
  const { t } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), fill = k * level * h;
  const pouring = t > at && t < at + dur;
  const wave = (ph: number) => Array.from({ length: 21 }, (_, i) => `${(i / 20) * w},${h - fill + Math.sin(i * 0.7 + t * 6 + ph) * (pouring ? 7 : 2)}`).join(" L");
  return (
    <svg style={{ position: "absolute", left: x, top: y - 260, overflow: "visible" }} width={w} height={h + 260}>
      {pouring && <rect x={w / 2 - 9 + Math.sin(t * 20) * 1.5} y={0} width={18} height={260 + h - fill} rx={9} fill={color} opacity={0.9} />}
      <g transform="translate(0 260)">
        <path d={`M0 ${h} L${wave(0)} L${w} ${h} Z`} fill={color} />
        <path d={`M0 ${h} L${wave(2)} L${w} ${h} Z`} fill="#fff" opacity={0.18} />
        <path d={`M-6 -10 L4 ${h} L${w - 4} ${h} L${w + 6} -10`} fill="none" stroke="rgb(255 255 255/0.85)" strokeWidth={6} strokeLinejoin="round" />
      </g>
    </svg>
  );
}
/** rings spread out over water from a point, again and again */
export function Ripple({ x, y, at = 0, size = 360, color = "#ffffff", every = 0.9 }: { x: number; y: number; at?: number; size?: number; color?: string; every?: number }) {
  const { t } = useScene();
  const s = t - at;
  if (s < 0) return null;
  return (
    <svg style={{ position: "absolute", left: x - size, top: y - size / 2.6, overflow: "visible" }} width={size * 2} height={size / 1.3}>
      {[0, 1, 2, 3].map((n) => {
        const k = ((s / every + n / 4) % 1);
        return <ellipse key={n} cx={size} cy={size / 2.6} rx={k * size} ry={(k * size) / 3.2} fill="none" stroke={color} strokeWidth={5 * (1 - k)} opacity={(1 - k) * 0.9} />;
      })}
    </svg>
  );
}
/** soft puffs that rise, spread, drift and fade (smoke, steam) */
export function Smoke({ x, y, at = 0, count = 14, color = "rgb(220 220 220)", rise = 520, size = 120 }: { x: number; y: number; at?: number; count?: number; color?: string; rise?: number; size?: number }) {
  const { t } = useScene();
  const s = t - at;
  if (s < 0) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const life = 3.2, k = ((s + (i / count) * life) % life) / life;
        const d = size * (0.5 + k * 1.6);
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(k * 5 + i) * 40 * k + k * 60 - d / 2, top: y - k * rise - d / 2, width: d, height: d, borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 68%)`, opacity: Math.sin(k * Math.PI) * 0.75, filter: "blur(6px)" }} />;
      })}
    </>
  );
}
/** one thing slides into another and hands over its push (like billiard balls or dominoes) */
export function Collide({ y, at = 0, a, b, gap = 520, size = 160 }: { y: number; at?: number; a: ReactNode; b: ReactNode; gap?: number; size?: number }) {
  const { t, W } = useScene();
  const hit = at + 0.9, s = t - at;
  const ax = s < 0 ? W / 2 - gap - size : t < hit ? W / 2 - gap - size + (gap - size * 0.05) * ease.inOut(s / 0.9) * 1 : W / 2 - size * 1.05;
  const bx = t < hit ? W / 2 : W / 2 + 620 * (1 - Math.exp(-(t - hit) * 2.2));
  const jolt = t >= hit && t < hit + 0.25 ? Math.sin((t - hit) * 60) * 6 * (1 - (t - hit) / 0.25) : 0;
  return (
    <>
      <div style={{ position: "absolute", left: ax + jolt, top: y - size, width: size, height: size }}>{a}</div>
      <div style={{ position: "absolute", left: bx, top: y - size, width: size, height: size, transform: `rotate(${(bx - W / 2) / 3}deg)` }}>{b}</div>
    </>
  );
}

/* ---------------- travel ---------------- */
/** moves its child along a smooth path through points; it can turn to face the way it goes */
export function Along({ points, at = 0, dur = 3, loop = false, turn = false, lag = 0, children }: { points: Pt[]; at?: number; dur?: number; loop?: boolean; turn?: boolean; lag?: number; children: ReactNode }) {
  const { t } = useScene();
  const c = curve(points);
  const raw = (t - at - lag) / dur;
  const p = c.at(loop ? ((raw % 1) + 1) % 1 : ease.inOut(raw));
  return <div style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%,-50%) rotate(${turn ? p.angle : 0}deg)` }}>{children}</div>;
}
/** flies in an arc from one point to another (a ball thrown, a plane hop), turning along the curve, with a dotted trail */
export function FlyArc({ from, to, height = 380, at = 0, dur = 1.8, trail = true, color, children }: { from: Pt; to: Pt; height?: number; at?: number; dur?: number; trail?: boolean; color?: string; children: ReactNode }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  const pos = (u: number): Pt => [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u - height * 4 * u * (1 - u)];
  const [x, y] = pos(k), [x2, y2] = pos(Math.min(1, k + 0.01));
  return (
    <>
      {trail && <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
        <path d={"M" + Array.from({ length: 41 }, (_, i) => pos((i / 40) * k).join(" ")).join(" L")} fill="none" stroke={color ?? theme.accent} strokeWidth={6} strokeDasharray="4 18" strokeLinecap="round" />
      </svg>}
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${(Math.atan2(y2 - y, x2 - x) * 180) / Math.PI}deg)` }}>{children}</div>
    </>
  );
}
/** goes round a centre on a tilted ellipse, bigger in front and smaller behind */
export function Orbit({ cx, cy, rx = 420, ry = 120, period = 6, at = 0, phase = 0, children, ring = true }: { cx: number; cy: number; rx?: number; ry?: number; period?: number; at?: number; phase?: number; children: ReactNode; ring?: boolean }) {
  const { t, theme } = useScene();
  const a = ((t - at) / period) * Math.PI * 2 + phase;
  const depth = Math.sin(a);
  return (
    <>
      {ring && <svg style={{ position: "absolute", left: cx - rx, top: cy - ry, overflow: "visible" }} width={rx * 2} height={ry * 2}><ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill="none" stroke={theme.muted ?? "#888"} strokeWidth={3} strokeDasharray="10 12" opacity={0.6} /></svg>}
      <div style={{ position: "absolute", left: cx + Math.cos(a) * rx, top: cy + depth * ry, transform: `translate(-50%,-50%) scale(${0.75 + 0.25 * (depth + 1) / 2 + 0.1})`, zIndex: depth > 0 ? 3 : 1, opacity: 0.7 + 0.3 * (depth + 1) / 2 }}>{children}</div>
    </>
  );
}
/** a road or route is drawn, and a marker travels it just behind the line (a journey, a delivery, a march) */
export function Route({ points, at = 0, dur = 4, color, width = 10, marker, dashed = false }: { points: Pt[]; at?: number; dur?: number; color?: string; width?: number; marker?: ReactNode; dashed?: boolean }) {
  const { t, theme } = useScene();
  const c = curve(points), k = ease.inOut(clamp01((t - at) / dur)), p = c.at(k);
  const col = color ?? theme.accent;
  return (
    <>
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
        <path d={c.d} fill="none" stroke="rgb(0 0 0/0.25)" strokeWidth={width + 8} strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 2`} />
        <path d={c.d} fill="none" stroke={col} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={dashed ? undefined : `${k} 2`} style={dashed ? { clipPath: "none" } : undefined} />
        <circle cx={points[0][0]} cy={points[0][1]} r={width * 1.3} fill={col} opacity={k > 0 ? 1 : 0} />
      </svg>
      {k > 0 && <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-90%)" }}>{marker ?? <div style={{ width: 34, height: 34, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: col, border: "5px solid #fff", boxShadow: "0 6px 14px rgb(0 0 0/0.35)" }} />}</div>}
    </>
  );
}
/** a belt that carries things along, again and again (a factory line, a supply chain) */
export function Conveyor({ x, y, w = 1100, speed = 160, items, at = 0, gap = 260 }: { x: number; y: number; w?: number; speed?: number; items: ReactNode[]; at?: number; gap?: number }) {
  const { t, theme } = useScene();
  const s = Math.max(0, t - at) * speed;
  const count = Math.ceil(w / gap) + 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 60 }}>
      {Array.from({ length: count }, (_, i) => {
        const px = ((i * gap + s) % (count * gap)) - gap / 2;
        return px > -gap / 2 && px < w ? <div key={i} style={{ position: "absolute", left: px, bottom: 54, transform: "translateX(-50%)" }}>{items[i % items.length]}</div> : null;
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 26, borderRadius: 13, background: `repeating-linear-gradient(90deg, #3a3a3a 0 26px, #2a2a2a 26px 52px)`, backgroundPositionX: s, boxShadow: "0 8px 0 rgb(0 0 0/0.25)" }} />
      {Array.from({ length: Math.floor(w / 110) + 1 }, (_, i) => <div key={i} style={{ position: "absolute", left: i * 110, top: 30, width: 30, height: 30, borderRadius: "50%", border: `5px solid ${theme.muted ?? "#777"}`, borderTopColor: theme.ink, transform: `rotate(${s * 2}deg)` }} />)}
    </div>
  );
}
/** one thing runs along a path and another follows close behind (a chase, a predator and prey) */
export function Chase({ points, at = 0, dur = 4, lead, follow, lag = 0.45 }: { points: Pt[]; at?: number; dur?: number; lead: ReactNode; follow: ReactNode; lag?: number }) {
  return (
    <>
      <Along points={points} at={at} dur={dur} turn lag={lag}>{follow}</Along>
      <Along points={points} at={at} dur={dur} turn>{lead}</Along>
    </>
  );
}

/* ---------------- emphasis that draws over things ---------------- */
/** a marker circle drawn round something, by hand (slightly off, overlapping at the end) */
export function CircleIt({ x, y, w, h, at = 0, dur = 0.7, color, width = 8 }: { x: number; y: number; w: number; h: number; at?: number; dur?: number; color?: string; width?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / dur));
  const pts: Pt[] = Array.from({ length: 40 }, (_, i) => { const a = -2.2 + (i / 39) * Math.PI * 2.15; const r = 1 + Math.sin(i * 0.5) * 0.03; return [w / 2 + Math.cos(a) * (w / 2) * r, h / 2 + Math.sin(a) * (h / 2) * r]; });
  return (
    <svg style={{ position: "absolute", left: x, top: y, overflow: "visible", transform: "rotate(-4deg)" }} width={w} height={h}>
      <path d={curve(pts).d} fill="none" stroke={color ?? theme.accent} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 2`} />
    </svg>
  );
}
/** a hand-drawn wavy underline under a word */
export function Underline({ x, y, w, at = 0, dur = 0.5, color, width = 8 }: { x: number; y: number; w: number; at?: number; dur?: number; color?: string; width?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / dur));
  const d = "M0 6 " + Array.from({ length: 9 }, (_, i) => `Q${(i + 0.5) * (w / 9)} ${i % 2 ? 14 : -2} ${(i + 1) * (w / 9)} 6`).join(" ");
  return <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={w} height={20}><path d={d} fill="none" stroke={color ?? theme.accent} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 2`} /></svg>;
}
/** a highlighter pen sweeps across behind a line of text */
export function Highlight({ at = 0, dur = 0.6, color = "rgb(255 222 60/0.75)", children }: { at?: number; dur?: number; color?: string; children: ReactNode }) {
  const { t } = useScene();
  const k = ease.out(clamp01((t - at) / dur));
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ position: "absolute", left: -8, top: "18%", height: "70%", width: `calc(${k * 100}% + 16px)`, background: color, borderRadius: 6, transform: "skewX(-6deg)" }} />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
}
/** the rest of the frame goes dark and a soft light falls on one spot (it can move to the next spot) */
export function Spotlight({ spots, at = 0, radius = 260, dark = 0.72 }: { spots: { x: number; y: number; at: number }[]; at?: number; radius?: number; dark?: number }) {
  const { t } = useScene();
  const k = ease.out(clamp01((t - at) / 0.6));
  let x = spots[0].x, y = spots[0].y;
  for (let i = 1; i < spots.length; i++) { const m = ease.inOut(clamp01((t - spots[i].at) / 0.8)); x += (spots[i].x - x) * m; y += (spots[i].y - y) * m; }
  return <div style={{ position: "absolute", inset: 0, opacity: k, background: `radial-gradient(circle ${radius}px at ${x}px ${y}px, transparent 0%, transparent 70%, rgb(0 0 0/${dark}) 100%)` }} />;
}

/* ---------------- drawing ---------------- */
/** a line or shape draws itself on (any SVG path) */
export function DrawOn({ d, at = 0, dur = 1.2, color, width = 8, fill = "none", fillAt, x = 0, y = 0, w = 1920, h = 1080 }: { d: string; at?: number; dur?: number; color?: string; width?: number; fill?: string; fillAt?: number; x?: number; y?: number; w?: number; h?: number }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  const f = fillAt === undefined ? 0 : ease.out(clamp01((t - fillAt) / 0.6));
  return <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={w} height={h}><path d={d} fill={fill} fillOpacity={fill === "none" ? 0 : f} stroke={color ?? theme.ink} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 2`} /></svg>;
}
/** a shape is outlined first, then filled with colour */
export function OutlineFill({ d, at = 0, dur = 1.2, color, fill, width = 6, x = 0, y = 0, w = 600, h = 600 }: { d: string; at?: number; dur?: number; color?: string; fill?: string; width?: number; x?: number; y?: number; w?: number; h?: number }) {
  const { theme } = useScene();
  return <DrawOn d={d} at={at} dur={dur} color={color ?? theme.ink} width={width} fill={fill ?? theme.accent} fillAt={at + dur} x={x} y={y} w={w} h={h} />;
}
/** words written by hand, left to right, with the pen's tip moving along */
export function Handwrite({ text, x, y, size = 90, at = 0, dur, color, font = "caveat" }: { text: string; x: number; y: number; size?: number; at?: number; dur?: number; color?: string; font?: string }) {
  const { t, theme } = useScene();
  const d = dur ?? Math.max(0.6, text.length * 0.07);
  const k = clamp01((t - at) / d);
  return (
    <div style={{ position: "absolute", left: x, top: y, fontFamily: family(font), fontSize: size, fontWeight: 700, color: color ?? theme.ink, whiteSpace: "nowrap" }}>
      <span style={{ clipPath: `inset(-20% ${(1 - k) * 100}% -20% 0)`, display: "inline-block" }}>{text}</span>
      {k > 0 && k < 1 && <div style={{ position: "absolute", left: `${k * 100}%`, top: size * 0.15 + Math.sin(t * 40) * size * 0.12, width: 10, height: size * 0.9, background: theme.ink, borderRadius: 5, transform: "rotate(28deg)", transformOrigin: "50% 100%" }} />}
    </div>
  );
}
/** big letters drawn as outlines, then filled in */
export function StrokeText({ text, x, y, size = 200, at = 0, dur = 1.6, color, fill, font = "bebas" }: { text: string; x: number; y: number; size?: number; at?: number; dur?: number; color?: string; fill?: string; font?: string }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), f = ease.out(clamp01((t - at - dur) / 0.5));
  return (
    <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={text.length * size * 0.6} height={size}>
      <text x={0} y={size * 0.85} fontFamily={family(font)} fontSize={size} fill={fill ?? theme.accent} fillOpacity={f} stroke={color ?? theme.ink} strokeWidth={4} strokeDasharray={`${k * 900} 900`}>{text}</text>
    </svg>
  );
}
/** an arrow grows from one thing to another, with a dot where it starts */
export function Connector({ from, to, at = 0, dur = 0.7, bend = 0.25, color, width = 7 }: { from: Pt; to: Pt; at?: number; dur?: number; bend?: number; color?: string; width?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / dur));
  const mx = (from[0] + to[0]) / 2 - (to[1] - from[1]) * bend, my = (from[1] + to[1]) / 2 + (to[0] - from[0]) * bend;
  const ang = Math.atan2(to[1] - my, to[0] - mx), col = color ?? theme.ink;
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
      <circle cx={from[0]} cy={from[1]} r={width * 1.3} fill={col} opacity={k > 0 ? 1 : 0} />
      <path d={`M${from[0]} ${from[1]} Q${mx} ${my} ${to[0]} ${to[1]}`} fill="none" stroke={col} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${k * 0.97} 2`} />
      {k > 0.95 && <path d={`M${to[0]} ${to[1]} l${Math.cos(ang + 2.6) * 30} ${Math.sin(ang + 2.6) * 30} M${to[0]} ${to[1]} l${Math.cos(ang - 2.6) * 30} ${Math.sin(ang - 2.6) * 30}`} stroke={col} strokeWidth={width} strokeLinecap="round" />}
    </svg>
  );
}

/* ---------------- numbers ---------------- */
const num = (v: number, decimals: number) => v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
/** a number counts up to its value and lands with a small kick */
export function CountUp({ to, from = 0, at = 0, dur = 1.6, prefix = "", suffix = "", decimals = 0, size = 200, color, font }: { to: number; from?: number; at?: number; dur?: number; prefix?: string; suffix?: string; decimals?: number; size?: number; color?: string; font?: string }) {
  const { t, theme } = useScene();
  const k = clamp01((t - at) / dur), v = from + (to - from) * ease.out(k);
  const kick = t > at + dur ? 1 + 0.08 * Math.exp(-(t - at - dur) * 7) : 1;
  return <div style={{ fontFamily: family(font ?? theme.display), fontSize: size, fontWeight: 800, color: color ?? theme.ink, fontVariantNumeric: "tabular-nums", transform: `scale(${kick})`, whiteSpace: "nowrap", lineHeight: 1 }}>{prefix}{num(v, decimals)}{suffix}</div>;
}
/** digits roll into place like an old counter or a stock ticker, each wheel stopping a little after the last */
export function Ticker({ value, at = 0, size = 160, color, font }: { value: string; at?: number; size?: number; color?: string; font?: string }) {
  const { t, theme } = useScene();
  return (
    <div style={{ display: "flex", fontFamily: family(font ?? theme.display), fontSize: size, fontWeight: 800, color: color ?? theme.ink, lineHeight: 1, height: size }}>
      {value.split("").map((ch, i) => {
        const d = Number(ch);
        if (Number.isNaN(d)) return <span key={i}>{ch}</span>;
        const k = ease.out(clamp01((t - at - i * 0.12) / 1.4)), spins = 2 + i * 0.5;
        const pos = (d + spins * 10) * k;
        return <div key={i} style={{ height: size, overflow: "hidden", width: size * 0.6 }}><div style={{ transform: `translateY(${-(pos % 10) * size}px)` }}>{Array.from({ length: 11 }, (_, n) => <div key={n} style={{ height: size, textAlign: "center" }}>{n % 10}</div>)}</div></div>;
      })}
    </div>
  );
}
/** bars grow up from the floor with a springy overshoot, one after another */
export function BarGrow({ data, w = 900, h = 520, at = 0, color }: { data: { label: string; value: number; color?: string }[]; w?: number; h?: number; at?: number; color?: string }) {
  const { t, theme } = useScene();
  const max = Math.max(...data.map((d) => d.value)), bw = (w / data.length) * 0.66;
  return (
    <div style={{ position: "relative", width: w, height: h + 70, fontFamily: family(theme.font) }}>
      {data.map((d, i) => {
        const k = ease.back(clamp01((t - at - i * 0.15) / 0.9)), bh = (d.value / max) * h * k;
        return (
          <div key={i} style={{ position: "absolute", left: i * (w / data.length) + (w / data.length - bw) / 2, bottom: 70, width: bw }}>
            <div style={{ position: "absolute", bottom: bh + 10, width: "100%", textAlign: "center", fontSize: 38, fontWeight: 800, color: theme.ink, opacity: clamp01(k * 2) }}>{num(d.value * Math.min(1, k), 0)}</div>
            <div style={{ height: bh, background: d.color ?? color ?? theme.accent, borderRadius: "10px 10px 0 0" }} />
            <div style={{ position: "absolute", top: 12 + bh * 0, transform: `translateY(${0}px)`, width: "100%", textAlign: "center", fontSize: 30, color: theme.muted, marginTop: 6 }}>{""}</div>
            <div style={{ position: "absolute", bottom: -58, width: "100%", textAlign: "center", fontSize: 30, fontWeight: 600, color: theme.muted }}>{d.label}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 68, height: 4, background: theme.ink, opacity: 0.6 }} />
    </div>
  );
}
/** a line chart traces itself left to right, with a dot and the value riding its tip */
export function LineTrace({ values, w = 1000, h = 460, at = 0, dur = 2.4, color, prefix = "", suffix = "" }: { values: number[]; w?: number; h?: number; at?: number; dur?: number; color?: string; prefix?: string; suffix?: string }) {
  const { t, theme } = useScene();
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts: Pt[] = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - lo) / Math.max(1e-6, hi - lo)) * h * 0.9 - h * 0.05]);
  const k = ease.inOut(clamp01((t - at) / dur)), c = curve(pts), tip = c.at(k);
  const idx = Math.min(values.length - 1, Math.round(k * (values.length - 1)));
  const col = color ?? theme.accent;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={w} height={h}>
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke={theme.muted} strokeOpacity={0.25} strokeWidth={2} />)}
        <path d={`${c.d} L${w} ${h} L0 ${h} Z`} fill={col} opacity={0.14} style={{ clipPath: `inset(0 ${(1 - k) * 100}% 0 0)` }} />
        <path d={c.d} fill="none" stroke={col} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 2`} />
        {k > 0 && <circle cx={tip.x} cy={tip.y} r={14} fill={col} stroke="#fff" strokeWidth={5} />}
      </svg>
      {k > 0 && <div style={{ position: "absolute", left: tip.x + 22, top: tip.y - 70, fontFamily: family(theme.display), fontSize: 46, fontWeight: 800, color: theme.ink, whiteSpace: "nowrap" }}>{prefix}{num(values[idx], 0)}{suffix}</div>}
    </div>
  );
}
/** a pie or donut fills round, slice by slice, with its labels */
export function PieFill({ slices, size = 420, at = 0, dur = 1.6, donut = 0.55 }: { slices: { label: string; value: number; color?: string }[]; size?: number; at?: number; dur?: number; donut?: number }) {
  const { t, theme } = useScene();
  const total = slices.reduce((a, s) => a + s.value, 0), k = ease.inOut(clamp01((t - at) / dur));
  const palette = [theme.accent, theme.accent2, theme.ink, theme.muted, "#e0b24a", "#6a9bd8"];
  let acc = 0;
  const stops = slices.map((s, i) => { const a0 = acc; acc += s.value / total; return `${s.color ?? palette[i % palette.length]} ${a0 * 360 * k}deg ${acc * 360 * k}deg`; }).join(",");
  acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, fontFamily: family(theme.font) }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(${stops}, transparent ${360 * k}deg)`, WebkitMask: `radial-gradient(circle, transparent ${donut * 50}%, #000 ${donut * 50 + 0.5}%)`, mask: `radial-gradient(circle, transparent ${donut * 50}%, #000 ${donut * 50 + 0.5}%)` }} />
      {slices.map((s, i) => {
        const mid = (acc + s.value / total / 2) * Math.PI * 2 - Math.PI / 2; acc += s.value / total;
        const show = clamp01((k - acc + s.value / total) * 4);
        return <div key={i} style={{ position: "absolute", left: size / 2 + Math.cos(mid) * size * 0.66, top: size / 2 + Math.sin(mid) * size * 0.66, transform: "translate(-50%,-50%)", fontSize: 30, fontWeight: 700, color: theme.ink, opacity: show, whiteSpace: "nowrap", textAlign: "center" }}>{s.label}<br /><span style={{ color: theme.muted }}>{Math.round((s.value / total) * 100)}%</span></div>;
      })}
    </div>
  );
}
/** a dial whose needle swings to the value, overshoots and settles */
export function Gauge({ value, max = 100, size = 460, at = 0, label, color }: { value: number; max?: number; size?: number; at?: number; label?: string; color?: string }) {
  const { t, theme } = useScene();
  const s = Math.max(0, t - at), target = clamp01(value / max);
  const k = t < at ? 0 : target + (0 - target) * Math.exp(-3.4 * s) * Math.cos(7 * s);
  const ang = -180 + k * 180, r = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: r + 90, fontFamily: family(theme.display) }}>
      <svg width={size} height={r + 10} style={{ overflow: "visible" }}>
        <path d={`M20 ${r} A${r - 20} ${r - 20} 0 0 1 ${size - 20} ${r}`} fill="none" stroke={theme.muted} strokeOpacity={0.3} strokeWidth={34} strokeLinecap="round" />
        <path d={`M20 ${r} A${r - 20} ${r - 20} 0 0 1 ${size - 20} ${r}`} fill="none" stroke={color ?? theme.accent} strokeWidth={34} strokeLinecap="round" pathLength={1} strokeDasharray={`${clamp01(k)} 2`} />
        <line x1={r} y1={r} x2={r + Math.cos((ang * Math.PI) / 180) * (r - 60)} y2={r + Math.sin((ang * Math.PI) / 180) * (r - 60)} stroke={theme.ink} strokeWidth={12} strokeLinecap="round" />
        <circle cx={r} cy={r} r={22} fill={theme.ink} />
      </svg>
      <div style={{ textAlign: "center", fontSize: 64, fontWeight: 800, color: theme.ink }}>{Math.round(clamp01(k) * max)}{label ? <span style={{ fontSize: 34, color: theme.muted }}> {label}</span> : null}</div>
    </div>
  );
}
/** a ranking race: bars grow and swap places year by year */
export function BarRace({ frames, w = 1100, rowH = 74, at = 0, per = 1.2, top = 6 }: { frames: { label: string; values: Record<string, number> }[]; w?: number; rowH?: number; at?: number; per?: number; top?: number }) {
  const { t, theme } = useScene();
  const pos = clamp01((t - at) / (per * (frames.length - 1))) * (frames.length - 1), i0 = Math.floor(pos), i1 = Math.min(frames.length - 1, i0 + 1), f = ease.inOut(pos - i0);
  const names = Object.keys(frames[0].values);
  const val = (n: string) => frames[i0].values[n] + (frames[i1].values[n] - frames[i0].values[n]) * f;
  const rank = (fr: number, n: string) => [...names].sort((a, b) => frames[fr].values[b] - frames[fr].values[a]).indexOf(n);
  const max = Math.max(...names.map(val));
  const palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8", "#d86a8f", "#5bbf8a"];
  return (
    <div style={{ position: "relative", width: w, height: rowH * top + 40, fontFamily: family(theme.font) }}>
      {names.map((n, i) => {
        const r = rank(i0, n) + (rank(i1, n) - rank(i0, n)) * f;
        if (r > top - 0.5) return null;
        const bw = (val(n) / max) * (w - 260);
        return (
          <div key={n} style={{ position: "absolute", top: r * rowH, left: 0, height: rowH - 14, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 200, textAlign: "right", fontSize: 32, fontWeight: 700, color: theme.ink }}>{n}</div>
            <div style={{ width: bw, height: "100%", background: palette[i % palette.length], borderRadius: 8 }} />
            <div style={{ fontSize: 30, fontWeight: 700, color: theme.muted }}>{num(val(n), 0)}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", right: 0, bottom: -10, fontFamily: family(theme.display), fontSize: 110, fontWeight: 800, color: theme.ink, opacity: 0.25 }}>{frames[f > 0.5 ? i1 : i0].label}</div>
    </div>
  );
}

/* ---------------- camera: wraps the whole shot ---------------- */
export type CameraKind = "push" | "pull" | "pan" | "tilt" | "whip" | "follow" | "drift";
/** moves the camera over everything inside: push in, pull out, pan, tilt down onto a table, whip pan, follow a moving thing */
export function Camera({ kind, at = 0, dur = 4, focus = [0.5, 0.5], amount = 1, path, children }: { kind: CameraKind; at?: number; dur?: number; focus?: Pt; amount?: number; path?: Pt[]; children: ReactNode }) {
  const { t, W, H } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  let tr = "", filter = "";
  const ox = focus[0] * 100, oy = focus[1] * 100;
  if (kind === "push") tr = `scale(${1 + 0.35 * amount * k})`;
  else if (kind === "pull") tr = `scale(${1 + 0.35 * amount * (1 - k)})`;
  else if (kind === "pan") tr = `scale(${1 + 0.3 * amount}) translateX(${(0.5 - k) * W * 0.2 * amount}px)`;
  else if (kind === "tilt") tr = `perspective(1600px) rotateX(${(1 - k) * 48 * amount}deg) scale(${1.15 - 0.15 * k})`;
  else if (kind === "drift") tr = `scale(${1.08 + 0.04 * Math.sin(t * 0.3)}) translate(${Math.sin(t * 0.21) * 18}px, ${Math.cos(t * 0.17) * 12}px)`;
  else if (kind === "whip") {
    const w = clamp01((t - at) / 0.5), m = Math.sin(w * Math.PI);
    tr = `translateX(${-ease.inOut(w) * W}px)`;
    filter = `blur(${m * 30}px)`;
  } else if (kind === "follow" && path) {
    const p = curve(path).at(k);
    tr = `scale(${1 + 0.4 * amount}) translate(${(W / 2 - p.x) * 0.9}px, ${(H / 2 - p.y) * 0.9}px)`;
  }
  return <div style={{ position: "absolute", inset: 0, transform: tr, transformOrigin: kind === "tilt" ? "50% 100%" : `${ox}% ${oy}%`, filter }}>{children}</div>;
}
/** focus moves from the thing in front to the thing behind (the other goes soft) */
export function RackFocus({ front, back, at = 0, dur = 0.8 }: { front: ReactNode; back: ReactNode; at?: number; dur?: number }) {
  const { t } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, filter: `blur(${(1 - k) * 14}px)` }}>{back}</div>
      <div style={{ position: "absolute", inset: 0, filter: `blur(${k * 16}px)`, opacity: 1 - k * 0.25 }}>{front}</div>
    </>
  );
}
/** layers at different depths move at different speeds as the camera slides (near ones faster) */
export function Depth({ layers, at = 0, speed = 90 }: { layers: { node: ReactNode; depth: number }[]; at?: number; speed?: number }) {
  const { t } = useScene();
  const s = t - at;
  return <>{layers.map((l, i) => <div key={i} style={{ position: "absolute", inset: 0, transform: `translateX(${-s * speed * l.depth}px) scale(${1 + l.depth * 0.04})` }}>{l.node}</div>)}</>;
}

/* ---------------- transitions: from shot A to shot B ---------------- */
export type CutKind = "cut" | "dissolve" | "push" | "page" | "fold" | "match" | "zoom" | "mapzoom" | "ink";
/** shows A, then changes to B at `at` the chosen way */
export function Transition({ kind, at, dur = 0.8, a, b, focus = [0.5, 0.5] }: { kind: CutKind; at: number; dur?: number; a: ReactNode; b: ReactNode; focus?: Pt }) {
  const { t, W, H } = useScene();
  const k = clamp01((t - at) / dur), e = ease.inOut(k);
  const fx = focus[0] * W, fy = focus[1] * H;
  const full: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
  if (k <= 0) return <div style={full}>{a}</div>;
  if (kind === "cut" || k >= 1) return <div style={full}>{b}</div>;
  let A: CSSProperties = {}, B: CSSProperties = {}, bOnTop = true;
  if (kind === "dissolve") B = { opacity: e };
  else if (kind === "push") { A = { transform: `translateX(${-e * 100}%)` }; B = { transform: `translateX(${(1 - e) * 100}%)` }; }
  else if (kind === "page") { bOnTop = false; A = { transformOrigin: "0% 50%", transform: `perspective(2400px) rotateY(${-e * 100}deg)`, boxShadow: `${30 * e}px 0 60px rgb(0 0 0/${0.5 * e})` }; }
  else if (kind === "fold") { bOnTop = false; A = { transformOrigin: "50% 0%", transform: `perspective(2400px) rotateX(${e * 100}deg)` }; }
  else if (kind === "match") {
    const close = clamp01(k * 2), open = clamp01(k * 2 - 1);
    A = { clipPath: `circle(${(1 - ease.inOut(close)) * 80}% at ${fx}px ${fy}px)` };
    B = { clipPath: `circle(${ease.inOut(open) * 80}% at ${fx}px ${fy}px)` };
  } else if (kind === "zoom") { A = { transform: `scale(${1 + e * 3})`, opacity: 1 - e, transformOrigin: `${fx}px ${fy}px` }; B = { transform: `scale(${0.6 + 0.4 * e})`, opacity: e }; }
  else if (kind === "mapzoom") { A = { transform: `scale(${1 + e * 7})`, transformOrigin: `${fx}px ${fy}px`, filter: `blur(${e * 10}px)` }; B = { opacity: clamp01((k - 0.5) * 2), filter: `blur(${(1 - clamp01((k - 0.5) * 2)) * 12}px)` }; }
  else if (kind === "ink") {
    const r = e * Math.hypot(W, H);
    const blob = Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2; const rr = r * (1 + 0.18 * Math.sin(a * 5 + 1) + 0.1 * Math.sin(a * 11)); return `${fx + Math.cos(a) * rr}px ${fy + Math.sin(a) * rr}px`; });
    B = { clipPath: `polygon(${blob.join(",")})` };
  }
  const nodeA = <div key="a" style={{ ...full, ...A }}>{a}</div>, nodeB = <div key="b" style={{ ...full, ...B }}>{b}</div>;
  return <div style={full}>{bOnTop ? [nodeA, nodeB] : [nodeB, nodeA]}</div>;
}

/* ---------------- time ---------------- */
/** plays what is inside faster (×speed) from `at`, with a fast-forward mark; speed < 0 rewinds */
export function Speed({ at = 0, speed = 6, children, mark = true }: { at?: number; speed?: number; children: ReactNode; mark?: boolean }) {
  const { frame, fps, t, theme } = useScene();
  const a = Math.round(at * fps), f = frame < a ? frame : Math.max(0, a + (frame - a) * speed);
  const on = t >= at;
  return (
    <>
      <Freeze frame={f}>{children}</Freeze>
      {mark && on && <div style={{ position: "absolute", right: 60, top: 50, fontFamily: family(theme.display), fontSize: 56, fontWeight: 800, color: "#fff", background: "rgb(0 0 0/0.55)", padding: "6px 22px", borderRadius: 12 }}>{speed > 0 ? "▶▶" : "◀◀"} ×{Math.abs(speed)}</div>}
      {on && speed < 0 && <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgb(255 255 255/0.05) 0 2px, transparent 2px 6px)", transform: `translateY(${(t * 400) % 6}px)` }} />}
    </>
  );
}
/** the picture stops dead at `at` with a flash (a freeze frame) */
export function FreezeFrame({ at, children }: { at: number; children: ReactNode }) {
  const { frame, fps, t } = useScene();
  const a = Math.round(at * fps), on = frame >= a;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, filter: on ? "saturate(0.55) contrast(1.1)" : undefined }}><Freeze frame={on ? a : frame}>{children}</Freeze></div>
      {on && <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: Math.max(0, 0.8 - (t - at) * 4) }} />}
    </>
  );
}
/** an old clock whose hands spin: hours pass in seconds */
export function ClockSpin({ size = 360, at = 0, dur = 3, hours = 12, color }: { size?: number; at?: number; dur?: number; hours?: number; color?: string }) {
  const { t, theme } = useScene();
  const h = ease.inOut(clamp01((t - at) / dur)) * hours, r = size / 2;
  const hand = (deg: number, len: number, w: number) => <line x1={r} y1={r} x2={r + Math.sin((deg * Math.PI) / 180) * len} y2={r - Math.cos((deg * Math.PI) / 180) * len} stroke={color ?? theme.ink} strokeWidth={w} strokeLinecap="round" />;
  return (
    <svg width={size} height={size}>
      <circle cx={r} cy={r} r={r - 8} fill={theme.paper ?? "#fff"} stroke={color ?? theme.ink} strokeWidth={12} />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={r} y1={22} x2={r} y2={i % 3 ? 40 : 56} stroke={theme.ink} strokeWidth={i % 3 ? 5 : 9} transform={`rotate(${i * 30} ${r} ${r})`} />)}
      {hand((h + 10) * 30, r * 0.5, 14)}
      {hand((h * 360) % 360, r * 0.75, 8)}
      <circle cx={r} cy={r} r={14} fill={theme.accent} />
    </svg>
  );
}
/** calendar pages tear off one after another (days or months passing) */
export function CalendarFlip({ pages, at = 0, every = 0.45, size = 340 }: { pages: { top: string; big: string }[]; at?: number; every?: number; size?: number }) {
  const { t, theme } = useScene();
  const n = clamp01((t - at) / (every * (pages.length - 1))) * (pages.length - 1), i = Math.floor(n), f = n - i;
  const Page = ({ p, style }: { p: { top: string; big: string }; style?: CSSProperties }) => (
    <div style={{ position: "absolute", inset: 0, background: theme.paper ?? "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 30px rgb(0 0 0/0.25)", fontFamily: family(theme.display), ...style }}>
      <div style={{ background: theme.accent, color: "#fff", fontSize: size * 0.13, fontWeight: 800, textAlign: "center", padding: 10 }}>{p.top}</div>
      <div style={{ fontSize: size * 0.42, fontWeight: 800, textAlign: "center", color: theme.ink, marginTop: size * 0.04 }}>{p.big}</div>
    </div>
  );
  return (
    <div style={{ position: "relative", width: size, height: size * 1.05 }}>
      <Page p={pages[Math.min(pages.length - 1, i + 1)]} />
      {i < pages.length - 1 && <Page p={pages[i]} style={{ transformOrigin: "50% 0%", transform: `perspective(1200px) rotateX(${ease.inOut(f) * 110}deg) translateY(${ease.inOut(f) * -40}px)`, opacity: 1 - clamp01((f - 0.7) * 3) }} />}
      {i >= pages.length - 1 && <Page p={pages[pages.length - 1]} />}
    </div>
  );
}
/** the sky goes from day to dusk to night: the sun sets on an arc, the moon and stars come out */
export function DayNight({ at = 0, dur = 6, reverse = false }: { at?: number; dur?: number; reverse?: boolean }) {
  const { t, W, H } = useScene();
  let k = ease.inOut(clamp01((t - at) / dur));
  if (reverse) k = 1 - k;
  const mix = (a: number[], b: number[], c: number[]) => { const m = k < 0.5 ? k * 2 : (k - 0.5) * 2, x = k < 0.5 ? a : b, y = k < 0.5 ? b : c; return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * m)).join(" ")})`; };
  const top = mix([92, 170, 230], [70, 60, 120], [8, 14, 38]), low = mix([200, 230, 250], [250, 140, 80], [24, 34, 70]);
  const sa = Math.PI * (1.15 + k * 0.85), ma = Math.PI * (2.0 - k * 0.85 + 0.85);
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${top}, ${low})`, overflow: "hidden" }}>
      {Array.from({ length: 70 }, (_, i) => <div key={i} style={{ position: "absolute", left: rand(i) * W, top: rand(i + 50) * H * 0.6, width: 4, height: 4, borderRadius: 2, background: "#fff", opacity: clamp01((k - 0.6) * 3) * (0.5 + 0.5 * Math.sin(t * 3 + i)) }} />)}
      <div style={{ position: "absolute", left: W / 2 + Math.cos(sa) * W * 0.42 - 70, top: H * 0.82 + Math.sin(sa) * H * 0.62 - 70, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, #fff6c8, #ffc44d 60%, #ff9a3c)", boxShadow: "0 0 120px 40px rgb(255 190 80/0.5)" }} />
      <div style={{ position: "absolute", left: W / 2 + Math.cos(ma) * W * 0.42 - 50, top: H * 0.82 + Math.sin(ma) * H * 0.62 - 50, width: 100, height: 100, borderRadius: "50%", background: "#f4f1e6", boxShadow: "inset -26px -8px 0 #cfcab8, 0 0 60px rgb(255 255 240/0.4)", opacity: clamp01((k - 0.4) * 2.5) }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.22, background: mix([70, 120, 60], [60, 70, 50], [14, 20, 22]) }} />
    </div>
  );
}

/* ---------------- the catalogue: what the agent can choose from (names, what each does) ---------------- */
export const MOTIONS_CATALOG: { group: string; items: [string, string][] }[] = [
  { group: "Enter / exit", items: Object.entries(MOVES).filter(([, m]) => m.group === "enter").map(([k, m]) => [k, m.does] as [string, string]).concat([["Assemble", "pieces fly in and lock together"], ["Scatter", "breaks into pieces that blow away"]]) },
  { group: "Physics", items: Object.entries(MOVES).filter(([, m]) => m.group === "physics").map(([k, m]) => [k, m.does] as [string, string]).concat([["Shatter", "breaks and falls"], ["Pour", "liquid fills a glass"], ["Ripple", "rings on water"], ["Smoke", "puffs rise and fade"], ["Collide", "one hits another and hands over its push"]]) },
  { group: "Travel", items: [["Along", "along a smooth path"], ["Puppet walk", "a person walks from A to B"], ["Puppet run", "a person runs"], ["FlyArc", "thrown or flown in an arc"], ["Orbit", "round a centre"], ["Route", "a road drawn and travelled"], ["Conveyor", "carried on a belt"], ["Chase", "one follows another"]] },
  { group: "Emphasis", items: Object.entries(MOVES).filter(([, m]) => m.group === "emphasis").map(([k, m]) => [k, m.does] as [string, string]).concat([["CircleIt", "marker circle round it"], ["Underline", "wavy underline"], ["Highlight", "highlighter sweep"], ["Spotlight", "light on one spot"]]) },
  { group: "Drawing", items: [["DrawOn", "a line draws itself"], ["Handwrite", "words written by hand"], ["StrokeText", "letters outlined then filled"], ["Connector", "an arrow grows between two things"], ["OutlineFill", "outlined, then coloured in"]] },
  { group: "Numbers", items: [["CountUp", "a number counts up"], ["Ticker", "digits roll in"], ["BarGrow", "bars grow"], ["LineTrace", "a line chart traces"], ["PieFill", "a pie fills round"], ["Gauge", "a needle swings"], ["BarRace", "a ranking race"]] },
  { group: "Camera", items: [["push", "push in"], ["pull", "pull out"], ["pan", "pan across"], ["tilt", "tilt down onto it"], ["whip", "whip pan"], ["follow", "follow a moving thing"], ["drift", "a slow handheld drift"], ["RackFocus", "focus moves front to back"], ["Depth", "parallax layers"]] },
  { group: "Transitions", items: [["cut", "a straight cut"], ["dissolve", "cross-dissolve"], ["push", "one shot pushes the other off"], ["page", "a page turns"], ["fold", "folds away"], ["match", "closes to a point and opens on the next"], ["zoom", "zooms through"], ["mapzoom", "dives into a place"], ["ink", "ink spills over"]] },
  { group: "Time", items: [["Speed ×", "fast-forward"], ["Speed −", "rewind"], ["FreezeFrame", "stops dead"], ["ClockSpin", "hours pass"], ["CalendarFlip", "days pass"], ["DayNight", "day turns to night"]] },
];
export const useStage = () => useVideoConfig();
