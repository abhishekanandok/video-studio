/* How pieces arrive, in the film's motion (video/looks.py MOTION, picked per film as dna.motion). Every panel, board,
   card and photo plate enters through useEnter, so a motion added here works on every piece of every look.
     const { style } = useEnter(t, at)        style for the piece's outer box (opacity, transform, clip-path, filter)
     <Enter t at>{anything}</Enter>           the same, as a wrapper for drawn pieces
   ENTER must have one entry for every MOTION in looks.py: `python looks.py --check` fails otherwise. */
import React from "react";
import { motionStyle } from "../argon/lib/motion-d";
import { clamp01, useDNA } from "./kit";

const out3 = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const back = (x: number) => { const c = 1.9, p = clamp01(x) - 1; return 1 + (c + 1) * p * p * p + c * p * p; };
const rand = (s: number) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };

/** motion name -> (raw progress 0..1, seconds since it began) -> CSS for the arriving piece */
export const ENTER: Record<string, (x: number, s: number) => React.CSSProperties> = {
  snappy: (x) => ({ opacity: out3(x * 2), transform: `scale(${0.9 + 0.1 * back(x)})` }),
  drift: (x) => ({ opacity: out3(x), transform: `translateY(${(1 - out3(x)) * 34}px)` }),
  typewriter: (x) => ({ clipPath: `inset(0 ${100 - Math.floor(out3(x) * 12) * (100 / 12)}% 0 0)` }),
  stamp: (x) => ({ opacity: x > 0 ? 1 : 0, transform: `scale(${1 + 0.28 * (1 - out3(x * 1.6))}) rotate(${-2 * (1 - out3(x * 1.6))}deg)` }),
  slide: (x) => ({ opacity: out3(x * 1.5), transform: `translateX(${(1 - out3(x)) * -90}px)` }),
  draw: (x) => ({ clipPath: `inset(0 ${100 - out3(x) * 100}% 0 0)` }),
  pop: (x) => ({ opacity: out3(x * 3), transform: `scale(${Math.max(0, back(x))})` }),
  wipe: (x) => ({ clipPath: `inset(${100 - out3(x) * 100}% 0 0 0)` }),
  zoom: (x) => ({ opacity: out3(x), transform: `scale(${1.12 - 0.12 * out3(x)})`, filter: `blur(${(1 - out3(x)) * 8}px)` }),
  flip: (x) => ({ opacity: x > 0.05 ? 1 : 0, transform: `perspective(1400px) rotateY(${(1 - out3(x)) * 80}deg)`, transformOrigin: "left center" }),
  parallax: (x) => ({ opacity: out3(x), transform: `translateY(${(1 - out3(x * 0.8)) * 80}px)` }),
  glitch: (x, s) => x >= 1 ? {} : ({ opacity: x > 0 ? (rand(Math.floor(s * 30)) > 0.25 || x > 0.6 ? 1 : 0.2) : 0,
    transform: `translateX(${x < 0.6 ? (rand(Math.floor(s * 30) + 7) - 0.5) * 30 : 0}px)`, filter: x < 0.6 ? "drop-shadow(4px 0 0 #ff2a6a) drop-shadow(-4px 0 0 #2ad4ff)" : undefined }),
  brush: (x) => ({ clipPath: `polygon(0 0, ${out3(x) * 125}% 0, ${out3(x) * 125 - 25}% 100%, 0 100%)` }),
};
/** how long each motion takes to arrive, in seconds */
const DUR: Record<string, number> = { snappy: 0.45, drift: 1.1, typewriter: 0.9, stamp: 0.35, slide: 0.6, draw: 0.9, pop: 0.5, wipe: 0.7, zoom: 0.9, flip: 0.7, parallax: 1.2, glitch: 0.5, brush: 0.8 };

/** the film's entrance for a piece that arrives at `at` (seconds); kind overrides the film's motion */
export function useEnter(t: number, at: number, kind?: string): { style: React.CSSProperties; k: number } {
  const d = useDNA();
  if (!kind && d.enter?.startsWith("enter.")) {  // an exact entrance pinned in the look studio: every piece arrives that way
    const k = clamp01((t - at) / 0.7);
    return { style: motionStyle(d.enter, t, at, 0.7), k };
  }
  const m = kind ?? d.motion ?? "drift";
  const fn = ENTER[m] ?? ENTER.drift, dur = DUR[m] ?? 0.8;
  const x = clamp01((t - at) / dur);
  return { style: t < at ? { opacity: 0 } : x >= 1 ? {} : fn(x, t - at), k: x };
}

/** any piece, arriving in the film's motion */
export const Enter: React.FC<{ t: number; at: number; kind?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ t, at, kind, style, children }) => {
  const { style: s } = useEnter(t, at, kind);
  return <div style={{ position: "absolute", inset: 0, ...s, ...style }}>{children}</div>;
};
