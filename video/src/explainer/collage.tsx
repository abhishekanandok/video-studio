import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring } from "remotion";

export const K = {
  paper: "#f7f2e7", card: "#fbf8f1", kraft: "#d8c29d", ink: "#1d1b18", grey: "#6f6a60",
  red: "#b3261e", string: "#b8322a", tape: "rgba(222,184,79,0.72)", brass: "#b08d3c",
};
export const TYPE = '"Courier New", Courier, monospace';
export const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Deterministic pseudo-random in [0,1). */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** Jagged polygon so a rectangle looks torn by hand. */
export function tornClip(seed: number, depth = 1.4) {
  const pts: string[] = [];
  const edge = (from: [number, number], to: [number, number], n: number, s: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const x = from[0] + (to[0] - from[0]) * t, y = from[1] + (to[1] - from[1]) * t;
      const j = (rnd(s + i) - 0.5) * 2 * depth;
      pts.push(`${(from[1] === to[1] ? x : x + j).toFixed(2)}% ${(from[1] === to[1] ? y + j : y).toFixed(2)}%`);
    }
  };
  edge([0, 0], [100, 0], 22, seed);
  edge([100, 0], [100, 100], 14, seed + 50);
  edge([100, 100], [0, 100], 22, seed + 100);
  edge([0, 100], [0, 0], 14, seed + 150);
  return `polygon(${pts.join(",")})`;
}

/** A torn scrap of paper that drops in with a small rotation. */
export function Torn({ seed, x, y, w, h, bg = K.card, rot = 0, frame, delay = 0, children, style }:
  { seed: number; x: number; y: number; w: number; h?: number; bg?: string; rot?: number; frame: number; delay?: number; children?: ReactNode; style?: CSSProperties }) {
  const inn = spring({ frame: frame - delay, fps: 30, config: { damping: 16, stiffness: 120 } });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `translateY(${(1 - inn) * 40}px) rotate(${rot + (1 - inn) * 4}deg) scale(${0.96 + 0.04 * inn})`,
      opacity: interpolate(frame - delay, [0, 6], [0, 1], clamp), filter: "drop-shadow(0 10px 14px rgba(40,30,15,0.28))" }}>
      <div style={{ width: "100%", height: "100%", background: bg, clipPath: tornClip(seed), padding: "30px 38px", boxSizing: "border-box", ...style }}>{children}</div>
    </div>
  );
}

export function Tape({ x, y, w = 150, rot = -8, frame, delay = 0 }: { x: number; y: number; w?: number; rot?: number; frame: number; delay?: number }) {
  const o = interpolate(frame - delay, [0, 5], [0, 1], clamp);
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: 40, background: K.tape, transform: `rotate(${rot}deg)`, opacity: o,
    clipPath: "polygon(2% 0,98% 4%,100% 50%,97% 100%,3% 96%,0 50%)", mixBlendMode: "multiply" }} />;
}

export function Pin({ x, y, r = 14, t = 1 }: { x: number; y: number; r?: number; t?: number }) {
  return (
    <g opacity={t} transform={`translate(${x},${y}) scale(${0.6 + 0.4 * t})`}>
      <ellipse cx={3} cy={5} rx={r} ry={r * 0.8} fill="rgba(40,30,15,0.28)" />
      <circle r={r} fill="url(#brass)" stroke="#6e5520" strokeWidth={1.2} />
      <circle cx={-r * 0.35} cy={-r * 0.35} r={r * 0.3} fill="rgba(255,248,220,0.8)" />
    </g>
  );
}

/** Red string between two pins, sagging a little, drawn from a→b as t goes 0→1. `snap` splits it and lets both halves droop. */
export function StringLine({ a, b, t, snap = 0, seed = 0 }: { a: [number, number]; b: [number, number]; t: number; snap?: number; seed?: number }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const sag = 10 + len * 0.04 + rnd(seed) * 8;
  if (snap > 0) {
    const m: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const drop = 40 + 120 * snap;
    return (
      <g stroke={K.string} strokeWidth={3.4} fill="none" strokeLinecap="round">
        <path d={`M${a[0]} ${a[1]} Q ${(a[0] + m[0]) / 2} ${m[1] + drop * 0.4} ${m[0] - 18} ${m[1] + drop}`} />
        <path d={`M${b[0]} ${b[1]} Q ${(b[0] + m[0]) / 2} ${m[1] + drop * 0.4} ${m[0] + 18} ${m[1] + drop}`} />
      </g>
    );
  }
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
  const approx = len * 1.03;
  return <path d={`M${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}`} stroke={K.string} strokeWidth={3.4} fill="none" strokeLinecap="round"
    strokeDasharray={approx} strokeDashoffset={approx * (1 - t)} />;
}

/** Kraft-paper label with typewriter text. */
export function Tag({ children, x, y, rot = -2, frame, delay = 0, size = 26 }: { children: ReactNode; x: number; y: number; rot?: number; frame: number; delay?: number; size?: number }) {
  const inn = spring({ frame: frame - delay, fps: 30, config: { damping: 14 } });
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${inn})`, transformOrigin: "left center", filter: "drop-shadow(0 6px 8px rgba(40,30,15,0.3))" }}>
      <div style={{ background: K.kraft, clipPath: tornClip(7 + x, 3), padding: "10px 22px 8px", fontFamily: TYPE, fontWeight: 700, fontSize: size, letterSpacing: "0.06em", color: K.ink, whiteSpace: "nowrap" }}>{children}</div>
    </div>
  );
}

/** Red rubber stamp that slams onto the page. */
export function Stamp({ text, x, y, frame, delay = 0, rot = -9, size = 64 }: { text: string; x: number; y: number; frame: number; delay?: number; rot?: number; size?: number }) {
  const f = frame - delay;
  const s = interpolate(f, [0, 5, 9], [1.7, 0.94, 1], clamp);
  const o = interpolate(f, [0, 4], [0, 0.88], clamp);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${s})`, opacity: o, mixBlendMode: "multiply" }}>
      <div style={{ border: `6px solid ${K.red}`, borderRadius: 10, padding: "8px 26px", color: K.red, fontFamily: TYPE, fontWeight: 700, fontSize: size, letterSpacing: "0.08em",
        textTransform: "uppercase", maskImage: "radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,0.75) 100%)" }}>{text}</div>
    </div>
  );
}

/** Text that types itself in. */
export function Typed({ text, frame, delay = 0, cps = 32 }: { text: string; frame: number; delay?: number; cps?: number }) {
  const n = Math.max(0, Math.floor(((frame - delay) / 30) * cps));
  return <>{text.slice(0, n)}</>;
}

export function BrassDefs() {
  return (
    <defs>
      <radialGradient id="brass" cx="35%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#f1d98a" />
        <stop offset="55%" stopColor={K.brass} />
        <stop offset="100%" stopColor="#6e5520" />
      </radialGradient>
    </defs>
  );
}
