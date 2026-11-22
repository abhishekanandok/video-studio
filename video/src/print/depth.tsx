/* Depth kit: 3D charts and panels in the film's MATERIAL (ink, stone, glass, clay, paper, metal), DEPTH (flat, raised,
   iso) and card SHAPE (video/looks.py), so the same chart is a marble pie on one film and a glass one on the next.
     <Pie3D cx cy r slices t at donut?/>   a thick pie (or donut) that sweeps in, slices lifted apart, values on them
     <CubeGrid x y cell rows cols values t from to/>   an isometric heatmap of cubes that rise to their value
     <HeatTiles x y w h rows cols values t from to/>   a flat heatmap of tiles with a Low → High scale bar
     <Panel x y w h t at kicker? title?>children</Panel>   a card in the film's shape and material
   Every piece reads useDNA(); px on 1920x1080, t = seconds into the scene. */
import { useLabel, type Side } from "../argon/place";
import React from "react";
import { appear, clamp01, fam, Type, useDNA, type DNA } from "./kit";
import { useEnter } from "./enter";
import { onFill } from "./spread";

const hex = (c: string) => { const n = parseInt(c.replace("#", "").slice(0, 6), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
/** a colour moved toward black (k < 0) or white (k > 0) */
export const shade = (c: string, k: number) => { const [r, g, b] = hex(c); const to = k > 0 ? 255 : 0, a = Math.abs(k); return toHex(r + (to - r) * a, g + (to - g) * a, b + (to - b) * a); };
const mix = (a: string, b: string, k: number) => { const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b); return toHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k); };
/** a value 0..1 on the film's scale: quiet ink → second ink → loud ink */
export const scaleColor = (d: DNA, v: number) => {
  const lo = d.inks[3] ?? shade(d.paper, d.dark ? 0.2 : -0.12), mid = d.inks[1] ?? d.inks[0], hi = d.inks[0];
  return v < 0.5 ? mix(lo, mid, v * 2) : mix(mid, hi, (v - 0.5) * 2);
};
const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

/** the SVG defs a material needs (marble veins, clay light, glass sheen), keyed by an id */
const MaterialDefs: React.FC<{ id: string; m: string }> = ({ id, m }) => (
  <defs>
    <filter id={`${id}-vein`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={m === "stone" ? "0.008 0.03" : "0.9"} numOctaves={m === "stone" ? 4 : 2} seed={5} />
      <feColorMatrix type="matrix" values={m === "stone" ? "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -3 1.7" : "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.2 0.7"} />
      <feComposite in2="SourceGraphic" operator="in" />
    </filter>
    <radialGradient id={`${id}-light`} cx="0.3" cy="0.25" r="0.9">
      <stop offset="0" stopColor="#ffffff" stopOpacity={m === "clay" ? 0.35 : m === "metal" ? 0.5 : 0.22} /><stop offset="0.6" stopColor="#ffffff" stopOpacity={0} />
    </radialGradient>
    <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#ffffff" stopOpacity={0.55} /><stop offset="0.35" stopColor="#ffffff" stopOpacity={0.05} /><stop offset="0.6" stopColor="#ffffff" stopOpacity={0.25} /><stop offset="1" stopColor="#ffffff" stopOpacity={0} />
    </linearGradient>
  </defs>
);
/** fill, opacity and edge of a face in a material */
const face = (m: string, c: string, side = 0) => {
  const fill = side ? shade(c, -0.18 * side) : c;
  if (m === "glass") return { fill, fillOpacity: side ? 0.42 : 0.5, stroke: shade(c, 0.6), strokeOpacity: 0.85, strokeWidth: 1.6 };
  if (m === "paper") return { fill, fillOpacity: 1, stroke: "#fffaf0", strokeOpacity: side ? 0 : 0.9, strokeWidth: side ? 0 : 3 };
  if (m === "ink") return { fill, fillOpacity: 1, stroke: side ? "none" : "#00000000", strokeOpacity: 0, strokeWidth: 0, filter: "url(#ink)" };
  return { fill, fillOpacity: 1, stroke: shade(c, -0.3), strokeOpacity: 0.25, strokeWidth: 1 };
};

/* ---- the 3D pie ----------------------------------------------------------------------------------------------- */
export type Slice3 = { label: string; value: number; color?: string; text?: string };
/** A thick pie (or a donut) in the film's material: it tilts toward the viewer (depth raised/iso; flat lies flat), the
 *  slices sweep in one by one on their times and lift apart a little, each value printed on its slice. */
export const Pie3D: React.FC<{ cx: number; cy: number; r: number; slices: Slice3[]; t: number; at: number[]; donut?: number; explode?: number }> = ({ cx, cy, r, slices, t, at, donut = 0, explode = 0.04 }) => {
  const d = useDNA();
  const m = d.material ?? "ink", depth = d.depth ?? "raised";
  const tilt = depth === "flat" ? 1 : depth === "iso" ? 0.55 : 0.68, th = depth === "flat" ? 0 : r * 0.17;
  const total = slices.reduce((n, s) => n + s.value, 0) || 1;
  const cols = slices.map((s, i) => s.color ?? d.inks[i % d.inks.length]);
  const id = `p3-${Math.round(cx)}-${Math.round(cy)}`;
  let a0 = -Math.PI / 2;
  const parts = slices.map((s, i) => {
    const k = ease((t - (at[i] ?? at[at.length - 1] ?? 0)) / 0.6);
    const sweep = (s.value / total) * Math.PI * 2;
    const a = a0, b = a0 + sweep * k, mid = a0 + sweep / 2;
    a0 += sweep;
    const off = r * explode * k;
    return { s, i, a, b, mid, k, ox: Math.cos(mid) * off, oy: Math.sin(mid) * off * tilt };
  });
  const P = (ang: number, rad: number, dy = 0, o = { ox: 0, oy: 0 }) => [cx + o.ox + Math.cos(ang) * rad, cy + o.oy + Math.sin(ang) * rad * tilt + dy];
  const top = (p: (typeof parts)[number], dy = 0) => {
    const [x1, y1] = P(p.a, r, dy, p), [x2, y2] = P(p.b, r, dy, p), large = p.b - p.a > Math.PI ? 1 : 0;
    if (!donut) { const [x0, y0] = P(0, 0, dy, p); return `M${x0},${y0} L${x1},${y1} A${r},${r * tilt} 0 ${large} 1 ${x2},${y2} Z`; }
    const ri = r * donut, [x3, y3] = P(p.b, ri, dy, p), [x4, y4] = P(p.a, ri, dy, p);
    return `M${x1},${y1} A${r},${r * tilt} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${ri},${ri * tilt} 0 ${large} 0 ${x4},${y4} Z`;
  };
  /** the outer wall of a slice: only the part facing the viewer (angles 0..π) */
  const wall = (p: (typeof parts)[number]) => {
    const a = Math.max(p.a, 0), b = Math.min(p.b, Math.PI);
    if (b <= a || !th) return "";
    const [x1, y1] = P(a, r, 0, p), [x2, y2] = P(b, r, 0, p);
    return `M${x1},${y1} A${r},${r * tilt} 0 0 1 ${x2},${y2} L${x2},${y2 + th} A${r},${r * tilt} 0 0 0 ${x1},${y1 + th} Z`;
  };
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <MaterialDefs id={id} m={m} />
      {(th > 0 || m !== "ink") && <ellipse cx={cx + r * 0.12} cy={cy + th + r * tilt * 0.08} rx={r * 1.05} ry={r * tilt * 1.02} fill="#000" opacity={0.14 * ease(t - (at[0] ?? 0))} style={{ filter: "blur(18px)" }} />}
      {parts.map((p) => p.k > 0 && <path key={`w${p.i}`} d={wall(p)} {...face(m, cols[p.i], 1)} />)}
      {parts.map((p) => p.k > 0 && <g key={`t${p.i}`}>
        <path d={top(p)} {...face(m, cols[p.i])} />
        {(m === "stone" || m === "clay") && <path d={top(p)} fill={cols[p.i]} filter={`url(#${id}-vein)`} opacity={m === "stone" ? 0.55 : 0.25} />}
        {m !== "ink" && <path d={top(p)} fill={`url(#${id}-${m === "glass" || m === "metal" ? "sheen" : "light"})`} />}
      </g>)}
      {parts.map((p) => {
        if (p.k < 1) return null;
        const rr = donut ? r * (1 + donut) / 2 : r * 0.62, [x, y] = P(p.mid, rr, 0, p);
        const fg = m === "glass" ? (d.dark ? "#ffffff" : d.ink) : onFill(cols[p.i], d.dark ? d.ink : d.paper, d.dark ? d.paper : d.ink);
        const txt = p.s.text ?? `${Math.round((p.s.value / total) * 100)}%`;
        return <text key={`l${p.i}`} x={x} y={y + r * 0.06} textAnchor="middle" fontFamily={fam(d.display)} fontSize={Math.max(34, r * 0.2)} fill={fg} opacity={ease((t - (at[p.i] ?? 0) - 0.5) / 0.4)}>{txt}</text>;
      })}
    </svg>
  );
};

/* ---- the cube heatmap ----------------------------------------------------------------------------------------- */
/** An isometric heatmap: one cube per cell (rows go back, columns go across), each rising to its value and coloured on
 *  the film's scale, in its material (glass glows, stone is veined). Cells ink in from `from` to `to` seconds. */
export const CubeGrid: React.FC<{ x: number; y: number; cell: number; rows: string[]; cols: string[]; values: number[][]; t: number; from: number; to: number }> = ({ x, y, cell, rows, cols, values, t, from, to }) => {
  const d = useDNA();
  const m = d.material ?? "glass";
  const iso = d.depth !== "flat";
  const cw = cell * 0.866, ch = cell * 0.5, max = Math.max(...values.flat(), 1);
  const n = rows.length * cols.length;
  const cubes: React.ReactNode[] = [];
  for (let s = 0; s <= rows.length + cols.length - 2; s++) {
    for (let i = 0; i < rows.length; i++) {
      const j = s - i;
      if (j < 0 || j >= cols.length) continue;
      const v = values[i]?.[j] ?? 0, k = ease((t - (from + ((to - from) * (i * cols.length + j)) / n)) / 0.35);
      if (k <= 0) continue;
      const c = scaleColor(d, v / max), hgt = iso ? (8 + (v / max) * cell * 1.1) * k : 0;
      const px = x + (j - i) * cw, py = y + (j + i) * ch;
      const top = `M${px},${py - hgt} l${cw},${ch} l${-cw},${ch} l${-cw},${-ch} Z`;
      cubes.push(<g key={`${i}-${j}`} opacity={iso ? 1 : k}>
        {iso && <path d={`M${px - cw},${py + ch - hgt} l${cw},${ch} l0,${hgt} l${-cw},${-ch} Z`} {...face(m, c, 1)} />}
        {iso && <path d={`M${px + cw},${py + ch - hgt} l${-cw},${ch} l0,${hgt} l${cw},${-ch} Z`} {...face(m, c, 2)} />}
        <path d={top} {...face(m, c)} />
      </g>);
    }
  }
  const lab = { fontFamily: fam(d.mono ?? d.body), fontSize: 24, letterSpacing: "0.2em", fill: d.dark ? d.ink : d.ink, opacity: 0.8 * appear(t, from, 0.4) };
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {cols.map((c, j) => j % Math.ceil(28 / cw) === 0 && <text key={c} x={x + (j + 0.5) * cw + 10} y={y + (j + 0.5) * ch - cell * 1.3} {...lab} fontSize={22} letterSpacing="0.06em" textAnchor="middle">{c}</text>)}
      {rows.map((r, i) => <text key={r} x={x - (i + 1) * cw - 16} y={y + (i + 1) * ch + 8} {...lab} textAnchor="end">{r}</text>)}
      {cubes}
    </svg>
  );
};

/* ---- flat heat tiles ------------------------------------------------------------------------------------------ */
/** A flat heatmap of tiles on the film's colour scale, with month/row labels; in a printed (ink) film the tiles are
 *  mottled ink in four steps with a High / Medium / Low / Minimal swatch legend, else a Low → High scale bar. */
const SWATCH = ["High", "Medium", "Low", "Minimal"];
export const HeatTiles: React.FC<{ x: number; y: number; w: number; h: number; rows: string[]; cols: string[]; values: number[][]; t: number; from: number; to: number; scale?: [string, string, string] }> = ({ x, y, w, h, rows, cols, values, t, from, to, scale = ["Low", "Medium", "High"] }) => {
  const d = useDNA();
  const max = Math.max(...values.flat(), 1), n = rows.length * cols.length;
  const ink = (d.material ?? "ink") === "ink";  // the classic print: mottled ink tiles in four steps and a swatch legend
  const steps = [shade(d.paper, d.dark ? 0.12 : -0.07), d.inks[2] ?? d.inks[1], d.inks[1] ?? d.inks[0], d.inks[0]];
  const swatch = (v: number) => steps[Math.min(3, Math.floor(v * 4))];
  // the row-name column fits the longest name (22 px mono with 0.14em tracking is about 17 px a letter): "Kerala" is never cut to "Kera"
  const gx = Math.max(60, Math.max(0, ...rows.map((r) => r.length)) * 17 + 18), gy = 44, cw = (w - gx) / cols.length, chh = (h - gy - 110) / rows.length;
  const lab: React.CSSProperties = { position: "absolute", fontFamily: fam(d.mono ?? d.body), fontSize: 22, letterSpacing: "0.14em", color: d.dark ? d.ink : d.ink, opacity: 0.8 };
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {cols.map((c, j) => <div key={c} style={{ ...lab, left: gx + j * cw, width: cw, top: 0, textAlign: "center", opacity: 0.8 * appear(t, from, 0.4) }}>{c}</div>)}
      {rows.map((r, i) => <div key={r} style={{ ...lab, left: 0, top: gy + i * chh + chh / 2 - 12, opacity: 0.8 * appear(t, from, 0.4) }}>{r}</div>)}
      {rows.map((_, i) => cols.map((__, j) => {
        const k = ease((t - (from + ((to - from) * (i * cols.length + j)) / n)) / 0.3);
        const v = (values[i]?.[j] ?? 0) / max;
        return <div key={`${i}-${j}`} style={{ position: "absolute", left: gx + j * cw + (ink ? 3 : 1.5), top: gy + i * chh + (ink ? 3 : 1.5), width: cw - (ink ? 6 : 3), height: chh - (ink ? 6 : 3),
          borderRadius: ink ? 0 : 3, background: ink ? swatch(v) : scaleColor(d, v), filter: ink ? "url(#ink)" : undefined, opacity: k, transform: `scale(${0.6 + 0.4 * k})` }} />;
      }))}
      {ink ? SWATCH.map((name, i) => <div key={name} style={{ position: "absolute", left: i * (w / 4), top: h - 64, display: "flex", alignItems: "center", gap: 12, opacity: appear(t, to + i * 0.1, 0.4) }}>
          <div style={{ width: 30, height: 30, background: swatch(1 - i / 3), filter: "url(#ink)", outline: i === 3 ? `1px solid ${d.ink}55` : undefined }} /><span style={{ fontFamily: fam(d.body), fontSize: 26, color: d.ink }}>{name}</span></div>)
        : <>
          <div style={{ position: "absolute", left: gx, top: h - 80, width: (w - gx) * 0.55 * appear(t, to, 0.6), height: 26, borderRadius: 6,
            background: `linear-gradient(90deg, ${scaleColor(d, 0)}, ${scaleColor(d, 0.5)}, ${scaleColor(d, 1)})` }} />
          {scale.map((s, i) => <div key={s} style={{ ...lab, top: h - 40, left: gx + (w - gx) * 0.55 * (i / 2) - (i === 2 ? 60 : i === 1 ? 40 : 0), fontSize: 24, opacity: 0.85 * appear(t, to + 0.3, 0.4) }}>{s}</div>)}
        </>}
    </div>
  );
};

/** the materials and card shapes this file draws (python looks.py --check compares them with looks.py) */
export const MATERIALS = ["ink", "stone", "glass", "clay", "paper", "metal"];
export const SHAPES = ["sharp", "rounded", "pill", "notched", "tilted", "ticket", "torn"];

/* ---- the panel ------------------------------------------------------------------------------------------------ */
const clipOf = (shape: string, w: number, h: number) => {
  const c = 34;
  if (shape === "notched") return `polygon(${c}px 0, ${w - c}px 0, ${w}px ${c}px, ${w}px ${h - c}px, ${w - c}px ${h}px, ${c}px ${h}px, 0 ${h - c}px, 0 ${c}px)`;
  if (shape === "ticket") return `path('M0,0 H${w} V${h / 2 - 26} A26,26 0 0 0 ${w},${h / 2 + 26} V${h} H0 V${h / 2 + 26} A26,26 0 0 0 0,${h / 2 - 26} Z')`;
  if (shape === "torn") return `polygon(${Array.from({ length: 41 }, (_, i) => `${(i / 40) * w}px ${(i % 2) * 7}px`).join(", ")}, ${w}px ${h}px, ${Array.from({ length: 41 }, (_, i) => `${w - (i / 40) * w}px ${h - (i % 2) * 7}px`).join(", ")})`;
  return undefined;
};
/** A card in the film's shape (sharp, rounded, pill, notched, tilted, ticket, torn) and material (frosted glass, veined
 *  stone, clay, stacked paper, metal, printed ink). It arrives in the film's motion; an optional tiny caps kicker and a display title
 *  sit at its top left; children are positioned inside it (panel-relative px). */
export const Panel: React.FC<{ x: number; y: number; w: number; h: number; t: number; at: number; kicker?: string; title?: string; children?: React.ReactNode }> = ({ x, y, w, h, t, at, kicker, title, children }) => {
  const d = useDNA();
  const m = d.material ?? "ink", shape = d.shape ?? "rounded";
  const { style: enter } = useEnter(t, at);
  const radius = shape === "pill" ? Math.min(w, h) / 2.4 : shape === "rounded" || shape === "tilted" ? 22 : shape === "sharp" ? 2 : 0;
  const base = d.dark ? shade(d.paper, 0.08) : shade(d.paper, 0.35);
  const bg: React.CSSProperties =
    m === "glass" ? { background: d.dark ? "#ffffff12" : "#ffffff59", backdropFilter: "blur(14px)", border: `1.5px solid ${d.dark ? "#ffffff30" : "#ffffffaa"}`, boxShadow: "0 20px 50px rgba(0,0,0,0.14)" }
    : m === "stone" ? { background: `linear-gradient(135deg, ${shade(base, 0.2)}, ${shade(base, -0.06)})`, boxShadow: "0 22px 50px rgba(0,0,0,0.22)" }
    : m === "clay" ? { background: `radial-gradient(ellipse at 30% 20%, ${shade(base, 0.25)}, ${base})`, boxShadow: "0 16px 30px rgba(0,0,0,0.16), inset 0 -6px 12px rgba(0,0,0,0.06)" }
    : m === "metal" ? { background: `linear-gradient(160deg, ${shade(base, 0.3)}, ${shade(base, -0.1)} 50%, ${shade(base, 0.15)})`, boxShadow: "0 14px 30px rgba(0,0,0,0.25)" }
    : m === "paper" ? { background: d.dark ? shade(d.paper, 0.12) : "#fbf8f1", boxShadow: "0 2px 0 rgba(0,0,0,0.06), 0 6px 0 -2px rgba(0,0,0,0.05), 0 18px 30px rgba(0,0,0,0.12)" }
    : { background: d.dark ? shade(d.paper, 0.06) : shade(d.paper, -0.04), border: `2px solid ${d.ink}22` };
  const bare = (d.box ?? "") === "rule";  // the classic print: no card, the piece sits on the page beside a hairline
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...enter, transform: `${enter.transform ?? ""} rotate(${shape === "tilted" && !bare ? -1.6 : 0}deg)` }}>
      {bare ? <div style={{ position: "absolute", left: -40, top: 0, bottom: 0, borderLeft: `1.5px solid ${d.ink}`, opacity: 0.6 }} /> :
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, clipPath: clipOf(shape, w, h), overflow: "hidden", ...bg }}>
        {m === "stone" && <svg width={w} height={h} style={{ position: "absolute", opacity: 0.4 }}><filter id={`pv-${x}-${y}`}><feTurbulence type="fractalNoise" baseFrequency="0.006 0.025" numOctaves={4} seed={8} /><feColorMatrix type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.38  0 0 0 0 0.35  0 0 0 -3 1.6" /></filter><rect width={w} height={h} filter={`url(#pv-${x}-${y})`} /></svg>}
      </div>}
      {kicker && <div style={{ position: "absolute", left: 44, top: 38, fontFamily: fam(d.mono ?? d.body), fontSize: 22, letterSpacing: "0.3em", color: d.ink, opacity: 0.8 }}>{kicker}</div>}
      {title && <div style={{ position: "absolute", left: 44, top: kicker ? 72 : 40, width: w - 88 }}><Type size={64} display w={w - 88}>{title}</Type></div>}
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
};

/* ---- the tag ------------------------------------------------------------------------------------------------- */
/** A label or callout: its box grows with its text (never clipped, never guessed from the text's length), a leader line
 *  runs from it to what it names, and it arrives in the film's motion. WHAT it names: `to` (a named point: "globe.equator",
 *  "globe.pole.s", "globe.-33.9,18.4", a <Mark id>, or any piece's "id.top" / "id.center"), or tx, ty in px. WHERE it sits
 *  is worked out by the scene (src/argon/place.tsx): x, y (and side) are only a wish, kept when that spot is clear;
 *  otherwise it moves to the nearest spot clear of other text, the frame's edge and other leader lines.
 *  tone: "dark" a board-coloured tag, "ink" the key ink, "accent" the loud ink, "plain" type alone over a hairline. */
export const Tag: React.FC<{ x?: number; y?: number; tx?: number; ty?: number; to?: string; side?: Side; t: number; at: number; size?: number; tone?: "dark" | "ink" | "accent" | "plain"; children: React.ReactNode }> = ({ x, y, tx, ty, to, side, t, at, size = 34, tone = "dark", children }) => {
  const d = useDNA();
  const { style: enter } = useEnter(t, at);
  const { id, pos } = useLabel({ to, tx, ty, x, y, side, order: at });
  const bg = tone === "dark" ? d.board ?? d.ink : tone === "ink" ? d.ink : tone === "accent" ? d.inks[0] : "transparent";
  const fg = tone === "plain" ? d.ink : onFill(bg, d.dark ? d.ink : d.paper, d.dark ? d.paper : d.ink);
  const line = tone === "plain" ? d.ink : tone === "accent" ? d.inks[0] : d.ink;
  // first pass: drawn hidden where it wished to be, so the scene can measure it; then drawn where the scene put it
  const px = pos?.x ?? x ?? 0, py = pos?.y ?? y ?? 0;
  const T = pos?.tx !== undefined && pos?.ty !== undefined ? [pos.tx, pos.ty] : null, L = pos?.lx !== undefined && pos?.ly !== undefined ? [pos.lx, pos.ly] : null;
  return <>
    {T && L && <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: appear(t, at, 0.4), overflow: "visible", pointerEvents: "none" }}>
      <path d={Math.abs(L[1] - T[1]) < 4 || Math.abs(L[0] - T[0]) < 4 ? `M${T[0]},${T[1]} L${L[0]},${L[1]}` : `M${T[0]},${T[1]} L${(L[0] + T[0]) / 2},${T[1]} L${L[0]},${L[1]}`}
        stroke={line} strokeWidth={2} fill="none" strokeDasharray="5 5" />
      <circle cx={T[0]} cy={T[1]} r={6} fill={line} />
    </svg>}
    <div data-label={id} style={{ position: "absolute", left: px, top: py, display: "inline-block", whiteSpace: "nowrap", visibility: pos ? undefined : "hidden",
      padding: tone === "plain" ? "0 0 6px" : `${size * 0.22}px ${size * 0.45}px`,
      background: bg, borderBottom: tone === "plain" ? `1.5px solid ${d.ink}` : undefined, borderRadius: d.shape === "pill" ? 999 : d.shape === "rounded" ? 10 : 2, ...enter }}>
      <Type size={size} color={fg} style={{ whiteSpace: "nowrap" }}>{children}</Type>
    </div>
  </>;
};
