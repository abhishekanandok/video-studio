/* The cinema kit: what turns a look film into a film (story films, video/oneshot.py STORY_WRITE). A scene paints its
   whole world (sky, land, water, people) and is shot like a film: a camera that pushes in, pans and pulls back over the
   world, light that changes with the time of day, water that moves, a warm or cool cast over everything. Taken from the
   look showcases (src/gallery/stories.tsx: the Madhubani wall's pull-back, the kolam doorstep going from 5:30 to sunrise).
   Every time here is in seconds from the scene's start. */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp01 } from "./kit";

const inOut = (x: number) => { const k = clamp01(x); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const useT = () => { const f = useCurrentFrame(), { fps } = useVideoConfig(); return f / fps; };

/** THE CAMERA over the scene's world (drawn inside it in world px, 1920x1080): keys are [seconds, focus x, focus y, zoom], eased from one to the next; zoom 1 shows the whole world, 1.6 is closer. Wide to close is a push in, close to wide a pull-back reveal, a moving focus a pan. In a sequence, start each scene's first key where the scene before ended, so the shot never jumps */
export const Camera: React.FC<{ keys: [number, number, number, number][]; children?: React.ReactNode }> = ({ keys, children }) => {
  const t = useT(), ks = keys.length ? keys : [[0, 960, 540, 1] as [number, number, number, number]];
  const i = ks.findIndex((k) => t < k[0]);
  const [, fx, fy, s] = i === 0 ? ks[0] : i < 0 ? ks[ks.length - 1]
    : (() => { const a = ks[i - 1], b = ks[i], k = inOut((t - a[0]) / (b[0] - a[0])); return [0, lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; })();
  return <AbsoluteFill style={{ overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${960 - fx * s}px, ${540 - fy * s}px) scale(${s})` }}>{children}</div>
  </AbsoluteFill>;
};

const SKIES: Record<string, { top: string; low: string; sun: string; sunY: number; glow: number }> = {
  night: { top: "#0b1430", low: "#23305a", sun: "#f4f1e0", sunY: 0.18, glow: 0.15 },
  predawn: { top: "#1c2550", low: "#b06a6a", sun: "#ffd9a0", sunY: 1.02, glow: 0.3 },
  sunrise: { top: "#5a7ac0", low: "#ffb46a", sun: "#ffcf5a", sunY: 0.82, glow: 0.8 },
  day: { top: "#5aa8e0", low: "#cfe8f4", sun: "#fff6c8", sunY: 0.2, glow: 0.5 },
  golden: { top: "#e8a85a", low: "#ffe0a0", sun: "#ffd27a", sunY: 0.6, glow: 0.8 },
  dusk: { top: "#3a2a5a", low: "#f08a4a", sun: "#ff8a3a", sunY: 0.86, glow: 0.9 },
  lamplight: { top: "#140c08", low: "#3a2210", sun: "#ffb050", sunY: 2, glow: 0 },
};
/** THE SKY of a time of day, painted edge to edge above the horizon (night, predawn, sunrise, day, golden, dusk, lamplight), with its sun (or moon at night) glowing where it really is; give `to` with `at` and `dur` and the light changes during the scene (dusk going dark, predawn breaking into sunrise: the sun rises) */
export const Sky: React.FC<{ time: string; to?: string; at?: number; dur?: number; horizon?: number; sunX?: number; sun?: boolean }> = ({ time, to, at = 0, dur = 3, horizon = 700, sunX = 1380, sun = true }) => {
  const t = useT(), a = SKIES[time] ?? SKIES.day, b = SKIES[to ?? time] ?? a, k = to ? inOut((t - at) / dur) : 0;
  const mix = (x: string, y: string) => `color-mix(in srgb, ${y} ${Math.round(k * 100)}%, ${x})`;
  const sy = lerp(a.sunY, b.sunY, k) * horizon, glow = lerp(a.glow, b.glow, k);
  return <div style={{ position: "absolute", left: -400, top: -400, width: 2720, height: horizon + 400, background: `linear-gradient(${mix(a.top, b.top)}, ${mix(a.low, b.low)})`, overflow: "hidden" }}>
    {sun && <div style={{ position: "absolute", left: sunX + 400 - 260, top: sy + 400 - 260, width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, ${mix(a.sun, b.sun)} 0 22%, transparent 60%)`, opacity: 0.35 + glow * 0.65 }} />}
    {sun && <div style={{ position: "absolute", left: sunX + 400 - 70, top: sy + 400 - 70, width: 140, height: 140, borderRadius: "50%", background: mix(a.sun, b.sun) }} />}
  </div>;
};

/** WATER (a river, a pond, the sea) from the horizon line to the bottom of the world: its colour follows the sky's time, ripple lines drift across it and the sun lays a shimmering path on it; draw people standing in it before it, and their reflections are implied by the shimmer */
export const Water: React.FC<{ y?: number; time?: string; to?: string; at?: number; dur?: number; sunX?: number; color?: string }> = ({ y = 700, time = "day", to, at = 0, dur = 3, sunX = 1380, color }) => {
  const t = useT(), a = SKIES[time] ?? SKIES.day, b = SKIES[to ?? time] ?? a, k = to ? inOut((t - at) / dur) : 0;
  const tint = `color-mix(in srgb, ${b.low} ${Math.round(k * 100)}%, ${a.low})`, deep = color ?? "#1f4a6a";
  return <div style={{ position: "absolute", left: -400, top: y, width: 2720, height: 1080 - y + 400, overflow: "hidden", background: `linear-gradient(color-mix(in srgb, ${tint} 55%, ${deep}), ${deep})` }}>
    <svg width={2720} height={1080 - y + 400} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 26 }, (_, i) => { const yy = 10 + i * i * 1.6, x = ((i * 397 + t * (30 + i * 6)) % 2900) - 200;
        return <line key={i} x1={x} y1={yy} x2={x + 120 + i * 8} y2={yy} stroke="#fff" strokeOpacity={0.35 - i * 0.008} strokeWidth={2 + i * 0.15} strokeLinecap="round" />; })}
      {Array.from({ length: 14 }, (_, i) => <rect key={`s${i}`} x={sunX + 400 - 60 - i * 6 + Math.sin(t * 3 + i) * 14} y={8 + i * 22} width={120 + i * 12} height={6} rx={3}
        fill="#ffe2a0" opacity={(0.55 - i * 0.03) * lerp(a.glow, b.glow, k)} />)}
    </svg>
  </div>;
};

/** A CAST OF LIGHT over the whole scene: warm (lamplight, sunset, a diya-lit night), cool (night, moonlight) or gold (a sacred moment); `to` with `at` and `dur` fades it in; draw it last, over everything */
export const Light: React.FC<{ tone?: "warm" | "cool" | "gold"; amount?: number; at?: number; dur?: number }> = ({ tone = "warm", amount = 0.25, at = 0, dur = 1.5 }) => {
  const t = useT(), k = inOut((t - at) / dur) * amount, c = { warm: "#ff9a3a", cool: "#2a3a8a", gold: "#ffd27a" }[tone];
  return <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 60%, transparent 30%, ${c})`, opacity: k, mixBlendMode: tone === "cool" ? "multiply" : "soft-light" }} />;
};

/** DRIFT: whatever is inside moves slowly sideways forever (clouds, a boat, birds, smoke), `speed` px per second, wrapping round the world so it never runs out */
export const Drift: React.FC<{ speed?: number; y?: number; children?: React.ReactNode }> = ({ speed = 20, y = 0, children }) => {
  const t = useT(), x = ((t * speed) % 2400 + 2400) % 2400 - 240;
  return <div style={{ position: "absolute", left: x, top: y }}>{children}</div>;
};
