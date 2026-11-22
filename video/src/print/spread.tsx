/* Spread kit: whole-frame printed layouts built on the print kit, after editorial data spreads (a pie with its ruled
   legend beside a heat grid, a dark board of glass bars set into the page, a bar + line chart with a callout box).
   Every piece takes a box (x, y, w, h in px on 1920x1080) so a scene composes a spread from pieces instead of
   centring one card in white space. Ornaments (dot grids, arcs, a wire cube, textured half-moons, stacked mono labels)
   are picked from a seeded pool per corner, so no two scenes or films repeat the same furniture.
     <Board/> dark panel · <Pie/> + <Legend/> · <Grid/> heat grid · <GlassBars/> 3D bars · <Combo/> bars + line
     <Num/> printed number · <Stack/> mono label · <Walk/> market line · <Ornaments/> · <Divider/> */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate } from "remotion";
import { useEnter } from "./enter";
import { appear, boardBg, clamp01, fam, onBoard, Type, useDNA } from "./kit";

const lum = (hex: string) => { const n = parseInt(hex.replace("#", "").slice(0, 6), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
/** type that reads on a fill: the darker or lighter of the key ink and the paper, whichever contrasts more */
export const onFill = (fill: string, a: string, b: string) => (Math.abs(lum(fill) - lum(a)) > Math.abs(lum(fill) - lum(b)) ? a : b);
/** the inks that show on a panel (an ink too close to the panel's own lightness is left out) */
export const panelInks = (inks: string[], board: string, fallback: string) => { const ok = inks.filter((c) => Math.abs(lum(c) - lum(board)) > 0.22); return ok.length ? ok : [fallback]; };
const rand = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
const ease = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
export type Box = { x: number; y: number; w: number; h: number };

/** Indian money, short: ₹500, ₹41k, ₹1.2L, ₹5L */
export const inr = (v: number) => (v >= 1e5 ? `₹${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1).replace(/\.0$/, "")}L` : v >= 1e4 ? `₹${Math.round(v / 1e3)}k` : `₹${Math.round(v).toLocaleString("en-IN")}`);
const inrFull = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

/** small printed caps in the mono face, stacked one word per line (DATA / BUILDS / BETTER / DECISIONS) */
export const Stack: React.FC<{ x: number; y: number; lines: string[]; t: number; at: number; color?: string; size?: number; align?: "left" | "right" }> = ({ x, y, lines, t, at, color, size = 22, align = "left" }) => {
  const d = useDNA();
  return (
    <div style={{ position: "absolute", left: align === "left" ? x : undefined, right: align === "right" ? 1920 - x : undefined, top: y, textAlign: align }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: fam(d.mono ?? d.body), fontSize: size, letterSpacing: "0.32em", lineHeight: 1.55, color: color ?? d.ink, opacity: 0.85 * appear(t, at + i * 0.08, 0.3), whiteSpace: "nowrap" }}>{l}</div>))}
    </div>
  );
};

/* ---- panels --------------------------------------------------------------------------------------------------- */
/** A dark printed board set into the page (black ink, not a screen): mono title top left, a tag top right, a footer
 *  rule. It arrives in the film's motion; children are positioned inside it. */
export const Board: React.FC<Box & { t: number; at: number; title?: string[]; tag?: string[]; foot?: string; children?: React.ReactNode }> = ({ x, y, w, h, t, at, title, tag, foot, children }) => {
  const d = useDNA();
  const { style: enter } = useEnter(t, at);
  const fg = onBoard(d);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 14, overflow: "hidden", background: boardBg(d), ...enter,
      boxShadow: "0 18px 40px rgba(0,0,0,0.18)" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "screen", opacity: 0.16 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
      {title && <Stack x={58} y={52} lines={title} t={t} at={at + 0.3} color={fg} />}
      {title && <div style={{ position: "absolute", left: 330, top: 92, width: (w - 700) * appear(t, at + 0.5, 0.6), borderTop: `1px solid ${fg}`, opacity: 0.5 }} />}
      {tag && <Stack x={w - 58} y={52} lines={tag} t={t} at={at + 0.4} color={fg} align="right" />}
      {foot && <>
        <Stack x={58} y={h - 92} lines={foot.split("/")} t={t} at={at + 0.6} color={fg} />
        <div style={{ position: "absolute", left: 360, top: h - 62, width: 300 * appear(t, at + 0.8, 0.6), borderTop: `1px solid ${fg}`, opacity: 0.5 }} />
      </>}
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
};

/** a printed vertical rule dividing the spread, with tick marks */
export const Divider: React.FC<{ x: number; t: number; at: number }> = ({ x, t, at }) => {
  const d = useDNA();
  const k = ease(t, at, at + 0.8);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: 0.7 }}>
      <line x1={x} y1={60} x2={x} y2={60 + 960 * k} stroke={d.ink} strokeWidth={1.5} />
      {[0.42, 0.45, 0.48].map((p, i) => <line key={i} x1={x - 6} x2={x + 6} y1={60 + 960 * p} y2={60 + 960 * p} stroke={d.ink} strokeWidth={2} opacity={k > p ? 1 : 0} />)}
    </svg>
  );
};

/* ---- pie ------------------------------------------------------------------------------------------------------ */
export type Slice = { label: string; value: number; note?: string };

/** A pie in the film's inks, slices sweeping in on their words; thin orbit arcs with dots circle it slowly. */
export const Pie: React.FC<{ cx: number; cy: number; r: number; slices: Slice[]; t: number; at: number[]; dark?: boolean }> = ({ cx, cy, r, slices, t, at, dark }) => {
  const d = useDNA();
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let a0 = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total, a1 = a0 + frac * Math.PI * 2;
    const g = appear(t, at[i] ?? at[0], 0.8);
    const end = a0 + (a1 - a0) * g;
    const path = g <= 0 ? "" : `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${end - a0 > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(end)},${cy + r * Math.sin(end)} Z`;
    const mid = (a0 + a1) / 2;
    const o = { path, g, color: d.inks[i % d.inks.length], lx: cx + r * 0.6 * Math.cos(mid), ly: cy + r * 0.6 * Math.sin(mid), pct: Math.round(frac * 100) };
    a0 = a1;
    return o;
  });
  const spin = t * 6, ok = appear(t, at[0], 1.2), ro = r + 70;
  const arc = (from: number, to: number) => {
    const p = (deg: number) => [cx + ro * Math.cos(((deg + spin) * Math.PI) / 180), cy + ro * Math.sin(((deg + spin) * Math.PI) / 180)];
    const [x1, y1] = p(from), [x2, y2] = p(from + (to - from) * ok);
    return `M${x1},${y1} A${ro},${ro} 0 0 1 ${x2},${y2}`;
  };
  const dot = (deg: number) => [cx + ro * Math.cos(((deg + spin) * Math.PI) / 180), cy + ro * Math.sin(((deg + spin) * Math.PI) / 180)];
  const line = dark ? onBoard(d) : d.ink;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <g opacity={0.65} fill="none" stroke={line} strokeWidth={1.6}><path d={arc(200, 290)} /><path d={arc(330, 395)} /><path d={arc(60, 160)} /></g>
        {ok > 0.95 && [[290, d.inks[0]], [160, d.inks[0]]].map(([deg, c], i) => { const [x, y] = dot(deg as number); return <circle key={i} cx={x} cy={y} r={7} fill={c as string} />; })}
        <g filter="url(#ink)">{arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} stroke={d.paper} strokeWidth={3} />)}</g>
      </svg>
      {arcs.map((a, i) => a.g > 0.85 && (
        <div key={i} style={{ position: "absolute", left: a.lx, top: a.ly, transform: "translate(-50%,-50%)", opacity: appear(t, (at[i] ?? at[0]) + 0.6, 0.3) }}>
          <Type size={Math.max(44, r * 0.2)} display color={onFill(a.color, d.ink, d.paper)}>{a.pct}%</Type></div>))}
    </>
  );
};

/** the ruled legend under or beside a chart: an ink dot, the label, the value at the right */
export const Legend: React.FC<{ x: number; y: number; w: number; items: { label: string; value: string }[]; t: number; at: number[]; size?: number; dark?: boolean }> = ({ x, y, w, items, t, at, size = 40, dark }) => {
  const d = useDNA();
  const c = dark ? onBoard(d) : d.ink;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, padding: "12px 0", borderBottom: `1px solid ${c}55`, opacity: appear(t, at[i] ?? at[0], 0.4) }}>
          <div style={{ width: size * 0.85, height: size * 0.85, borderRadius: "50%", background: d.inks[i % d.inks.length], filter: "url(#ink)" }} />
          <div style={{ flex: 1 }}><Type size={size} color={c}>{it.label}</Type></div>
          <Type size={size} color={c}>{it.value}</Type>
        </div>))}
    </div>
  );
};

/* ---- heat grid ------------------------------------------------------------------------------------------------ */
/** A printed grid of cells (months x years, regions x weeks...). Cells ink in one by one between `from` and `to`
 *  seconds, in reading order; `tone(i, j)` picks the ink (0..3) and `-1` leaves a cell blank paper. Washes are mottled
 *  like watercolour riso. */
export const Grid: React.FC<Box & { rows: string[]; cols: string[]; t: number; from: number; to: number; tone: (i: number, j: number) => number; dark?: boolean; rowEvery?: number }> = ({ x, y, w, h, rows, cols, t, from, to, tone, dark, rowEvery = 1 }) => {
  const d = useDNA();
  const lab = 70, top = 46;
  const cw = (w - lab) / cols.length, ch = (h - top) / rows.length, gap = Math.max(2, Math.min(6, cw * 0.06));
  const n = rows.length * cols.length;
  const c = dark ? onBoard(d) : d.ink;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {cols.map((cl, j) => <div key={j} style={{ position: "absolute", left: lab + j * cw, width: cw, top: 0, textAlign: "center", fontFamily: fam(d.display), fontSize: Math.min(30, cw * 0.42), color: c, opacity: appear(t, from - 0.3) }}>{cl}</div>)}
      {rows.map((r, i) => (i % rowEvery === 0 || i === rows.length - 1) && <div key={i} style={{ position: "absolute", left: 0, top: top + i * ch + ch / 2 - 16, fontFamily: fam(d.display), fontSize: Math.min(30, ch * 0.75), color: c, opacity: appear(t, from - 0.3) }}>{r}</div>)}
      <div style={{ position: "absolute", inset: 0, filter: "url(#ink)" }}>
        {rows.map((_, i) => cols.map((__, j) => {
          const idx = i * cols.length + j;
          const k = clamp01((t - (from + ((to - from) * idx) / n)) / 0.25);
          const tn = tone(i, j);
          const ink = tn < 0 ? (dark ? "#3a3833" : "#c9bea9") : d.inks[tn % d.inks.length];
          return <div key={idx} style={{ position: "absolute", left: lab + j * cw, top: top + i * ch, width: cw - gap, height: ch - gap, background: ink, opacity: (tn < 0 ? 0.55 : 0.62 + 0.38 * rand(idx * 3.1)) * k, transform: `scale(${0.6 + 0.4 * k})` }} />;
        }))}
      </div>
    </div>
  );
};

/* ---- glass bars ----------------------------------------------------------------------------------------------- */
export type Bar = { label: string; value: number; text: string; at: number; ghost?: boolean };

/** Isometric glass bars on a grid floor, for a dark Board: translucent faces in the film's inks with glowing edges,
 *  growing on their words. `ghost` draws an outline only (a value still to come). Box is inside the board. */
/** onPage: drawn straight on the page, not on a dark board, so its numbers and labels take the page's ink */
export const GlassBars: React.FC<Box & { bars: Bar[]; t: number; max?: number; onPage?: boolean }> = ({ x, y, w, h, bars, t, max, onPage }) => {
  const d = useDNA();
  const txt = onPage ? d.ink : onBoard(d);
  const n = bars.length;
  const top = Math.max(1e-9, max ?? Math.max(...bars.map((b) => b.value)));
  const step = w / (n + 0.6), bw = step * 0.62, dx = bw * 0.55, dy = -bw * 0.32, drop = 34;
  const baseY = y + h - n * drop - 30, H = h - 220;
  const floor = (i: number) => [x + step * 0.3 + i * step, baseY + i * drop];
  const [fx0, fy0] = floor(0), [fx1, fy1] = floor(n);
  const C = panelInks(d.inks, boardBg(d), onBoard(d));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        {bars.map((_, i) => (
          <linearGradient key={i} id={`gb${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C[i % C.length]} stopOpacity={0.75} /><stop offset="1" stopColor={C[i % C.length]} stopOpacity={0.18} />
          </linearGradient>))}
      </defs>
      {/* the floor: an isometric grid running down the diagonal */}
      <g stroke={onBoard(d)} strokeOpacity={0.16} strokeWidth={1} opacity={appear(t, bars[0]?.at - 0.6 || 0, 0.8)}>
        {Array.from({ length: n * 3 + 2 }, (_, i) => { const p = i / (n * 3 + 1); const sx = fx0 - 40 + (fx1 - fx0 + 40) * p, sy = fy0 + 30 + (fy1 - fy0) * p; return <line key={`a${i}`} x1={sx} y1={sy} x2={sx + dx * 2.2} y2={sy + dy * 2.2} />; })}
        {[0, 0.5, 1, 1.5, 2.2].map((q, i) => <line key={`b${i}`} x1={fx0 - 40 + dx * q} y1={fy0 + 30 + dy * q} x2={fx1 + dx * q} y2={fy1 + 30 + dy * q} />)}
      </g>
      {bars.map((b, i) => {
        const k = appear(t, b.at, 0.9);
        if (k <= 0) return null;
        const c = C[i % C.length];
        const [bx, by] = floor(i);
        const hh = Math.max(10, (b.value / top) * H) * k;
        const front = `M${bx},${by} h${bw} v${-hh} h${-bw} Z`;
        const side = `M${bx + bw},${by} l${dx},${dy} v${-hh} l${-dx},${-dy} Z`;
        const lid = `M${bx},${by - hh} h${bw} l${dx},${dy} h${-bw} Z`;
        return (
          <g key={i}>
            {!b.ghost && <g><path d={side} fill={`url(#gb${i})`} opacity={0.7} /><path d={front} fill={`url(#gb${i})`} /><path d={lid} fill={c} opacity={0.55} /></g>}
            <g fill="none" stroke={c} strokeWidth={b.ghost ? 2 : 2.4} strokeDasharray={b.ghost ? "10 8" : undefined} filter="url(#glow)" opacity={b.ghost ? 0.8 : 1}>
              <path d={front} /><path d={side} /><path d={lid} />
              <path d={`M${bx + dx},${by + dy} v${-hh}`} strokeOpacity={0.35} />
            </g>
            <circle cx={bx + bw / 2 + dx / 2} cy={by - hh + dy / 2} r={5} fill="#fff" opacity={0.7 * k} filter="url(#glow)" />
            <text x={bx + bw / 2 + dx / 2} y={by - hh + dy - 26} textAnchor="middle" fontFamily={fam(d.display)} fontSize={44} fill={txt} opacity={appear(t, b.at + 0.5, 0.4)}>{b.text}</text>
            <text x={bx + bw / 2} y={by + 58} textAnchor="middle" fontFamily={fam(d.mono ?? d.body)} fontSize={24} letterSpacing="0.2em" fill={txt} opacity={0.85 * appear(t, b.at, 0.4)}>{b.label}</text>
            <rect x={bx + bw / 2 - 8} y={by + 74} width={16} height={16} fill={c} opacity={appear(t, b.at, 0.4)} />
          </g>
        );
      })}
    </svg>
  );
};

/* ---- bars + line ---------------------------------------------------------------------------------------------- */
export type Group = { label: string; a: number; b: number; line: number; lineText: string; at: number };

/** Paired bars per period (a in the quiet ink, b in the loud one) with a line of ratios dotted over them, values
 *  printed above each bar; groups print in turn on their words. */
export const Combo: React.FC<Box & { groups: Group[]; t: number; keys: [string, string, string] }> = ({ x, y, w, h, groups, t, keys }) => {
  const d = useDNA();
  const n = groups.length;
  const max = Math.max(...groups.flatMap((g) => [g.a, g.b]));
  const base = y + h, gw = w / n, bw = gw * 0.26, H = h - 170;
  const pts = groups.map((g, i) => [x + gw * (i + 0.5), base - (Math.max(g.a, g.b) / max) * H - 110]);
  const shown = groups.filter((g) => t >= g.at).length;
  const quiet = "#b9b1a3";
  return (
    <>
      <div style={{ position: "absolute", left: x, top: base, width: w * appear(t, groups[0].at - 0.4, 0.6), borderTop: `3px solid ${d.ink}` }} />
      {groups.map((g, i) => {
        const k = appear(t, g.at, 0.7);
        const cx = x + gw * (i + 0.5);
        const ha = (g.a / max) * H * k, hb = (g.b / max) * H * k;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: cx - bw - 6, top: base - ha, width: bw, height: ha, background: quiet, filter: "url(#ink)" }} />
            <div style={{ position: "absolute", left: cx + 6, top: base - hb, width: bw, height: hb, background: d.inks[0], filter: "url(#ink)" }} />
            <div style={{ position: "absolute", left: cx - bw - 40, width: bw + 68, top: base - ha - 46, textAlign: "center", opacity: appear(t, g.at + 0.5, 0.3) }}><Type size={30}>{inr(g.a)}</Type></div>
            <div style={{ position: "absolute", left: cx - 28, width: bw + 68, top: base - hb - 46, textAlign: "center", opacity: appear(t, g.at + 0.5, 0.3) }}><Type size={30} weight={700}>{inr(g.b)}</Type></div>
            <div style={{ position: "absolute", left: cx - gw / 2, width: gw, top: base + 16, textAlign: "center", opacity: k }}><Type size={32}>{g.label}</Type></div>
          </React.Fragment>
        );
      })}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {pts.slice(0, -1).map(([x1, y1], i) => {
          const [x2, y2] = pts[i + 1];
          const k = clamp01((t - groups[i + 1].at) / 0.5);
          return <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * k} y2={y1 + (y2 - y1) * k} stroke={d.ink} strokeWidth={3} />;
        })}
        {pts.map(([px, py], i) => t >= groups[i].at && <circle key={i} cx={px} cy={py} r={11} fill={d.ink} />)}
      </svg>
      {pts.map(([px, py], i) => t >= groups[i].at && <div key={i} style={{ position: "absolute", left: px - 80, width: 160, top: py - 56, textAlign: "center", opacity: appear(t, groups[i].at + 0.2, 0.3) }}><Type size={32} weight={700}>{groups[i].lineText}</Type></div>)}
      <div style={{ position: "absolute", left: x, top: y - 70, display: "flex", gap: 36, opacity: appear(t, groups[0].at - 0.3) }}>
        {[quiet, d.inks[0]].map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 26, height: 26, background: c }} /><Type size={28}>{keys[i]}</Type></div>)}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><svg width={44} height={20}><line x1={0} y1={10} x2={44} y2={10} stroke={d.ink} strokeWidth={3} /><circle cx={22} cy={10} r={7} fill={d.ink} /></svg><Type size={28}>{keys[2]}</Type></div>
      </div>
    </>
  );
};

/* ---- numbers -------------------------------------------------------------------------------------------------- */
/** A number printed big at a spot, counting up on its word, with a rule and a small caps label under it. */
export const Num: React.FC<{ x: number; y: number; t: number; at: number; to: number; from?: number; dur?: number; size: number; label?: string; color?: string; full?: boolean; prefix?: string; suffix?: string; align?: "left" | "center"; w?: number; dark?: boolean; decimals?: number; linear?: boolean; money?: boolean }> = ({ x, y, t, at, to, from = 0, dur = 1.1, size, label, color, full, prefix, suffix = "", align = "left", w = 900, dark, decimals = 0, linear, money }) => {
  const d = useDNA();
  const v = interpolate(t, [at, at + dur], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: linear ? undefined : Easing.out(Easing.cubic) });
  const k = appear(t, at, 0.4);
  const txt = prefix !== undefined || !(money || full) ? `${prefix ?? ""}${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}` : full ? inrFull(v) : inr(v);
  const c = dark ? onBoard(d) : d.ink;
  return (
    <div style={{ position: "absolute", left: align === "center" ? x - w / 2 : x, top: y, width: w, textAlign: align, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
      <Type size={size} display color={color ?? d.inks[0]} misreg={dark ? undefined : d.inks[1]} style={{ whiteSpace: "nowrap" }}>{txt}</Type>
      {label && <>
        <div style={{ borderTop: `3px solid ${c}`, width: Math.min(w, size * 2.6) * appear(t, at + 0.4, 0.5), margin: `${size * 0.12}px ${align === "center" ? "auto" : "0"} 14px` }} />
        <Type size={34} caps color={c}>{label}</Type>
      </>}
    </div>
  );
};

/* ---- a market line -------------------------------------------------------------------------------------------- */
/** A jagged line that draws across (a random walk with an upward drift): markets go up and down. */
export const Walk: React.FC<Box & { t: number; at: number; dur: number; seed?: number }> = ({ x, y, w, h, t, at, dur, seed = 4 }) => {
  const d = useDNA();
  const N = 90;
  let v = 0;
  const raw = Array.from({ length: N }, (_, i) => (v += (rand(seed * 100 + i) - 0.46) * 0.13));
  const lo = Math.min(...raw), hi = Math.max(...raw);
  const pts = raw.map((r, i) => [x + (w * i) / (N - 1), y + h * (0.92 - 0.84 * ((r - lo) / (hi - lo || 1)))]);
  const k = ease(t, at, at + dur), m = Math.max(2, Math.floor(N * k));
  const p = pts.slice(0, m);
  const dpath = p.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke={d.ink} strokeWidth={2} opacity={0.6} />
      {[0.25, 0.5, 0.75].map((q) => <line key={q} x1={x} x2={x + w} y1={y + h * q} y2={y + h * q} stroke={d.ink} strokeWidth={1} strokeDasharray="4 8" opacity={0.3} />)}
      <path d={`${dpath} L${p[p.length - 1][0]},${y + h} L${x},${y + h} Z`} fill={d.inks[1]} opacity={0.22} filter="url(#ink)" />
      <path d={dpath} fill="none" stroke={d.inks[0]} strokeWidth={5} strokeLinejoin="round" />
      <circle cx={p[p.length - 1][0]} cy={p[p.length - 1][1]} r={10} fill={d.inks[0]} />
    </svg>
  );
};

/* ---- ornaments ------------------------------------------------------------------------------------------------ */
type Zone = "tl" | "tr" | "bl" | "br" | "tm" | "bm";
const ZONE: Record<Zone, [number, number]> = { tl: [40, 30], tr: [1660, 30], bl: [40, 830], br: [1660, 830], tm: [860, 24], bm: [860, 950] };
const PACKS: Record<string, string[]> = {
  vox: ["dots", "arcs", "cube", "moon", "disc", "gridpatch", "triangle", "star", "block", "cross"],
  swiss: ["cross", "block", "disc", "gridpatch", "ring", "bars"],
  zine: ["tape", "star", "dots", "moon", "scribble", "block"],
  technical: ["dims", "titleblock", "gridpatch", "crosshair", "cross"],
  newsprint: ["rules", "pilcrow", "block", "dots"],
  chalk: ["hstar", "harrow", "hunder", "swirl"],
  neon: ["brackets", "dots", "crosshair", "floor"],
  marker: ["harrow", "hcircle", "hunder", "sticky"],
  iso: ["isocube", "isostack", "isotile", "dots"],
  terminal: ["prompt", "cursorbox", "asciibar", "brackets"],
  bauhaus: ["bdisc", "btri", "bhalf", "bars", "ring"],
  comic: ["burst", "speed", "bubble", "dots"],
  sketch: ["pencilbox", "hstar", "harrow", "wash"],
  doc: ["lowerthird", "timecode", "reticle"],
  dossier: ["stamp", "clip", "redact", "rules"],
  pins: ["pin", "string", "polaroid", "sticky", "tape"],
  seal: ["seal", "brush", "enso"],
  arcade: ["pixheart", "pixcoin", "invader", "dots"],
  deco: ["fan", "sunburst", "decoframe"],
  memphis: ["squiggle", "confetti", "zigzag", "ring"],
  manuscript: ["vine", "flourish", "hstar"],
  midcentury: ["atom", "starburst", "boomerang"],
  transit: ["route", "interchange"],
  mission: ["patch", "orbit", "crosshair"],
  receipt: ["barcode", "perforation"],
  gallery: ["spot", "placard"],
  filmstrip: ["sprockets", "grease", "loupe"],
  atlas: ["compass", "contour", "dotroute"],
};

/** Printed furniture in the free corners of a spread, picked from a pool by seed: each scene and each film gets a
 *  different set. Everything drifts or turns a little so the page never sits dead still. */
export const Ornaments: React.FC<{ zones: Zone[]; seed: number; t: number; words?: string[]; pack?: string }> = ({ zones, seed, t, words = [], pack }) => {
  const d = useDNA();
  const ink = d.ink;
  const POOL = PACKS[pack ?? d.ornaments ?? "vox"] ?? PACKS.vox;
  // the top band belongs to titles: an ornament asked for up there moves to the matching bottom corner
  zones = [...new Set(zones.map((z) => (z === "tl" ? "bl" : z === "tr" ? "br" : z === "tm" ? "bm" : z)))] as Zone[];
  const hand = { fill: "none", stroke: ink, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, opacity: 0.75 };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {zones.map((z, i) => {
        const kind = POOL[Math.floor(rand(seed * 13 + i * 7) * POOL.length)];
        const [x, y] = ZONE[z];
        const k = appear(t, 0.1 + i * 0.12, 0.8);
        const words = ["prompt", "asciibar", "timecode", "stamp", "pilcrow", "bubble"].includes(kind);  // ornaments with text are never mirrored
        const S = 220, flipX = z.endsWith("r") && !words ? -1 : 1, flipY = z.startsWith("b") && !words ? -1 : 1;
        const drift = Math.sin(t * 0.8 + i) * 4;
        const body = (() => {
          switch (kind) {
            case "dots": return <g fill={ink} opacity={0.55}>{Array.from({ length: 64 }, (_, j) => <circle key={j} cx={20 + (j % 8) * 24} cy={20 + Math.floor(j / 8) * 24} r={2.2} opacity={0.5 + 0.5 * Math.sin(t * 2 + j * 0.7)} />)}</g>;
            case "arcs": return <g fill="none" stroke={ink} strokeWidth={1.4} opacity={0.6} transform={`rotate(${t * 4} 110 0)`}>{[50, 75, 100, 125].map((r) => <circle key={r} cx={110} cy={0} r={r} />)}</g>;
            case "cube": return <g fill="none" stroke={ink} strokeWidth={1.4} opacity={0.6} transform={`translate(${drift},0)`}><rect x={40} y={70} width={110} height={110} /><rect x={90} y={30} width={110} height={110} /><path d="M40,70 L90,30 M150,70 L200,30 M40,180 L90,140 M150,180 L200,140" /></g>;
            case "moon": return <g><defs><clipPath id={`mc${i}`}><rect x={0} y={110} width={220} height={110} /></clipPath></defs><circle cx={110} cy={210} r={150} fill={ink} opacity={0.32} filter="url(#ink)" clipPath={`url(#mc${i})`} /><g fill="none" stroke={ink} strokeWidth={1} opacity={0.4} clipPath={`url(#mc${i})`}>{[90, 110, 130].map((r) => <circle key={r} cx={110} cy={210} r={r} />)}</g></g>;
            case "disc": return <circle cx={110 + drift} cy={110} r={88} fill={d.inks[0]} opacity={0.5} filter="url(#ink)" />;
            case "gridpatch": return <g stroke={ink} strokeWidth={0.8} opacity={0.4}>{Array.from({ length: 11 }, (_, j) => <g key={j}><line x1={20 + j * 18} x2={20 + j * 18} y1={20} y2={200} /><line y1={20 + j * 18} y2={20 + j * 18} x1={20} x2={200} /></g>)}</g>;
            case "triangle": return <path d={`M30,20 L190,20 L110,170 Z`} fill={ink} opacity={0.18} filter="url(#ink)" transform={`translate(0,${drift})`} />;
            case "star": return <g transform={`translate(60,80) rotate(${t * 10})`}><path d="M0,-46 L9,-9 L46,0 L9,9 L0,46 L-9,9 L-46,0 L-9,-9 Z" fill={ink} /></g>;
            case "block": return <g><rect x={20} y={20} width={120} height={120} fill={ink} filter="url(#ink)" opacity={0.92} /><rect x={160} y={70} width={16} height={16} fill={ink} /></g>;
            case "cross": return <g stroke={ink} strokeWidth={1.5} opacity={0.7}><path d="M20,60 h24 M32,48 v24" /><line x1={64} y1={60} x2={64 + 150 * k} y2={60} /><circle cx={20} cy={140} r={6} fill={ink} /><line x1={40} y1={140} x2={40 + 120 * k} y2={140} opacity={0.5} /></g>;
            case "ring": return <circle cx={110} cy={110} r={80} fill="none" stroke={d.inks[0]} strokeWidth={22} opacity={0.85} filter="url(#ink)" />;
            case "bars": return <g fill={ink} opacity={0.85}>{[0, 1, 2, 3].map((j) => <rect key={j} x={30} y={40 + j * 38} width={160 * k * (1 - j * 0.2)} height={18} />)}</g>;
            case "tape": return <g opacity={0.55} transform={`rotate(${-12 + drift} 110 110)`}><rect x={30} y={90} width={160} height={40} fill={d.inks[3] ?? d.inks[1]} /><path d="M30,90 l6,6 l-6,6 l6,6 l-6,6 l6,6 l-6,4 M190,90 l-6,6 l6,6 l-6,6 l6,6 l-6,6 l6,4" stroke={d.paper} strokeWidth={2} fill="none" /></g>;
            case "scribble": return <path d="M30,120 C60,60 90,180 120,110 S170,60 190,130" {...hand} strokeDasharray={600} strokeDashoffset={600 * (1 - k)} />;
            case "dims": return <g stroke={ink} strokeWidth={1.5} fill={ink} opacity={0.7}><line x1={30} y1={60} x2={190} y2={60} /><path d="M30,60 l12,-6 v12 Z M190,60 l-12,-6 v12 Z" /><line x1={30} y1={40} x2={30} y2={80} /><line x1={190} y1={40} x2={190} y2={80} /><line x1={60} y1={110} x2={60} y2={200} /><path d="M60,110 l-6,12 h12 Z M60,200 l-6,-12 h12 Z" /></g>;
            case "titleblock": return <g stroke={ink} strokeWidth={1.4} fill="none" opacity={0.65}><rect x={20} y={110} width={190} height={90} /><line x1={20} y1={140} x2={210} y2={140} /><line x1={110} y1={140} x2={110} y2={200} /><line x1={20} y1={170} x2={110} y2={170} /></g>;
            case "crosshair": return <g stroke={ink} strokeWidth={1.4} fill="none" opacity={0.7} transform={`rotate(${t * 8} 110 110)`}><circle cx={110} cy={110} r={46} /><circle cx={110} cy={110} r={14} /><path d="M110,40 v40 M110,140 v40 M40,110 h40 M140,110 h40" /></g>;
            case "rules": return <g stroke={ink} opacity={0.75}><line x1={20} y1={60} x2={20 + 190 * k} y2={60} strokeWidth={4} /><line x1={20} y1={70} x2={20 + 190 * k} y2={70} strokeWidth={1} /><line x1={20} y1={170} x2={20 + 190 * k} y2={170} strokeWidth={1} /></g>;
            case "pilcrow": return <text x={60} y={170} fontFamily={fam(d.display)} fontSize={150} fill={ink} opacity={0.18}>¶</text>;
            case "hstar": return <path d="M110,40 L128,95 L185,95 L139,128 L157,183 L110,150 L63,183 L81,128 L35,95 L92,95 Z" {...hand} strokeDasharray={700} strokeDashoffset={700 * (1 - k)} />;
            case "harrow": return <path d="M30,170 C80,150 120,110 170,60 M140,58 L172,58 L170,92" {...hand} strokeDasharray={400} strokeDashoffset={400 * (1 - k)} />;
            case "hunder": return <path d="M20,140 C70,128 130,150 200,132 M40,160 C90,150 150,166 190,152" {...hand} strokeDasharray={500} strokeDashoffset={500 * (1 - k)} />;
            case "swirl": return <path d="M110,110 m0,-10 a10,10 0 1,1 -10,10 a22,22 0 1,1 22,22 a36,36 0 1,1 -36,-36 a52,52 0 1,1 52,52" {...hand} strokeDasharray={900} strokeDashoffset={900 * (1 - k)} />;
            case "hcircle": return <path d="M150,60 C200,90 190,170 120,180 C50,190 20,130 50,80 C75,40 140,40 170,70" {...hand} stroke={d.inks[1]} strokeDasharray={600} strokeDashoffset={600 * (1 - k)} />;
            case "sticky": return <g transform={`rotate(${4 + drift * 0.5} 110 110)`}><rect x={40} y={40} width={140} height={140} fill={d.inks[2] ?? d.inks[1]} opacity={0.75} /><path d="M60,90 h90 M60,115 h70 M60,140 h80" stroke={ink} strokeWidth={3} strokeLinecap="round" opacity={0.5} /></g>;
            case "brackets": return <g stroke={d.inks[0]} strokeWidth={3} fill="none" opacity={0.85}><path d="M30,70 V30 H70 M150,30 H190 V70 M190,150 V190 H150 M70,190 H30 V150" /><circle cx={110} cy={110} r={4} fill={d.inks[0]} opacity={0.5 + 0.5 * Math.sin(t * 3)} /></g>;
            case "floor": return <g stroke={d.inks[0]} strokeWidth={1} opacity={0.45}>{Array.from({ length: 7 }, (_, j) => <line key={j} x1={110} y1={60} x2={-40 + j * 50} y2={210} />)}{[120, 150, 185].map((y) => <line key={y} x1={0} y1={y} x2={220} y2={y} />)}</g>;
            case "isocube": { const c = (x: number, y: number, f: string) => <g transform={`translate(${x},${y})`}><path d="M0,0 L40,-22 L80,0 L40,22 Z" fill={f} opacity={0.9} /><path d="M0,0 L40,22 V68 L0,46 Z" fill={f} opacity={0.65} /><path d="M80,0 L40,22 V68 L80,46 Z" fill={f} opacity={0.45} /></g>;
              return <g transform={`translate(0,${drift})`}>{c(60, 90, d.inks[0])}{c(100, 112, d.inks[1])}{c(20, 112, d.inks[2] ?? d.inks[1])}</g>; }
            case "isostack": return <g>{[0, 1, 2].map((j) => <g key={j} transform={`translate(70,${150 - j * 30 * k})`}><path d="M0,0 L50,-26 L100,0 L50,26 Z" fill={d.inks[j % 3]} opacity={0.85} /><path d="M0,0 L50,26 V40 L0,14 Z M100,0 L50,26 V40 L100,14 Z" fill={d.inks[j % 3]} opacity={0.55} /></g>)}</g>;
            case "isotile": return <g stroke={ink} strokeWidth={1} opacity={0.35} fill="none">{Array.from({ length: 6 }, (_, j) => <path key={j} d={`M${20 + j * 30},${180 - j * 17} l60,34 M${20 + j * 30},${180 + j * 0} l60,-34`} />)}</g>;
            case "prompt": return <text x={20} y={120} fontFamily={fam(d.mono ?? d.body)} fontSize={34} fill={d.inks[0]} opacity={0.85}>{">_"}<tspan opacity={Math.sin(t * 6) > 0 ? 1 : 0}>█</tspan></text>;
            case "cursorbox": return <g stroke={d.inks[0]} fill="none" opacity={0.7}><rect x={30} y={50} width={160} height={110} strokeDasharray="6 6" /><rect x={42} y={62} width={18} height={26} fill={d.inks[0]} opacity={Math.sin(t * 6) > 0 ? 0.9 : 0.1} /></g>;
            case "asciibar": return <text x={10} y={120} fontFamily={fam(d.mono ?? d.body)} fontSize={26} fill={d.inks[0]} opacity={0.75}>{"[" + "#".repeat(Math.round(10 * k)) + ".".repeat(10 - Math.round(10 * k)) + "]"}</text>;
            case "bdisc": return <circle cx={110} cy={110} r={90 * k} fill={d.inks[0]} filter="url(#ink)" />;
            case "btri": return <path d="M20,200 L110,30 L200,200 Z" fill={d.inks[2] ?? d.inks[1]} opacity={0.95} transform={`rotate(${drift} 110 110)`} filter="url(#ink)" />;
            case "bhalf": return <path d="M20,140 A90,90 0 0,1 200,140 Z" fill={d.inks[1]} filter="url(#ink)" />;
            case "burst": return <path d={Array.from({ length: 24 }, (_, j) => { const r = j % 2 ? 50 : 100, a = (j / 24) * Math.PI * 2 + t * 0.3; return `${j ? "L" : "M"}${110 + r * Math.cos(a)},${110 + r * Math.sin(a)}`; }).join(" ") + "Z"} fill={d.inks[2] ?? d.inks[0]} stroke={ink} strokeWidth={4} />;
            case "speed": return <g stroke={ink} strokeWidth={3} strokeLinecap="round" opacity={0.6}>{[40, 70, 100, 130, 160].map((y, j) => <line key={y} x1={20 + j * 8} y1={y} x2={20 + j * 8 + 150 * k} y2={y} />)}</g>;
            case "bubble": return <g><path d="M30,40 H190 Q200,40 200,50 V130 Q200,140 190,140 H90 L60,180 L66,140 H30 Q20,140 20,130 V50 Q20,40 30,40 Z" fill="#ffffff" stroke={ink} strokeWidth={4} /><text x={110} y={102} textAnchor="middle" fontFamily={fam(d.display)} fontSize={36} fill={ink}>!</text></g>;
            case "pencilbox": return <g {...hand} strokeWidth={2} opacity={0.6}><path d="M30,40 L190,44 L186,180 L34,176 Z" /><path d="M36,60 L180,62" strokeDasharray="4 6" /></g>;
            case "wash": return <ellipse cx={110} cy={110} rx={95} ry={70} fill={d.inks[1]} opacity={0.18} filter="url(#ink)" />;
            case "lowerthird": return <g opacity={k}><rect x={10} y={150} width={200 * k} height={8} fill={d.inks[0]} /><rect x={10} y={164} width={140 * k} height={3} fill={ink} opacity={0.6} /></g>;
            case "timecode": return <text x={10} y={120} fontFamily={fam(d.mono ?? d.body)} fontSize={24} fill={ink} opacity={0.7}>{`00:${String(Math.floor(t)).padStart(2, "0")}:${String(Math.floor((t % 1) * 24)).padStart(2, "0")}`}</text>;
            case "reticle": return <g stroke={ink} strokeWidth={2} fill="none" opacity={0.55}><path d="M30,60 V30 H60 M160,30 H190 V60 M190,160 V190 H160 M60,190 H30 V160" /></g>;
            case "stamp": return <g transform={`rotate(-12 110 110)`} opacity={0.75 * k}><rect x={20} y={70} width={180} height={70} fill="none" stroke={d.inks[0]} strokeWidth={6} /><text x={110} y={118} textAnchor="middle" fontFamily={fam(d.display)} fontSize={34} fill={d.inks[0]} letterSpacing="4">FILED</text></g>;
            case "clip": return <path d="M90,20 V150 Q90,180 115,180 Q140,180 140,150 V50 Q140,35 125,35 Q110,35 110,50 V140" fill="none" stroke="#8a8a8a" strokeWidth={6} strokeLinecap="round" />;
            case "pin": return <g><circle cx={110} cy={100} r={22 * k} fill={d.inks[0]} /><circle cx={103} cy={93} r={7 * k} fill="#ffffff" opacity={0.6} /><path d="M110,122 L114,170" stroke="#555" strokeWidth={4} opacity={k} /></g>;
            case "string": return <path d={`M20,40 Q110,${120 + drift * 3} 200,${180 - drift * 2}`} fill="none" stroke={d.inks[0]} strokeWidth={4} strokeDasharray="400" strokeDashoffset={400 * (1 - k)} />;
            case "polaroid": return <g transform={`rotate(${-6 + drift * 0.4} 110 110)`} opacity={k}><rect x={40} y={30} width={140} height={165} fill="#f7f4ec" /><rect x={52} y={42} width={116} height={112} fill={d.inks[1]} opacity={0.55} /></g>;
            case "seal": return <g opacity={0.9 * k} transform="rotate(-3 110 110)"><rect x={70} y={70} width={80} height={80} rx={6} fill={d.inks[0]} filter="url(#ink)" /><path d="M86,90 h48 M86,110 h48 M86,130 h48 M110,84 v52" stroke={d.paper} strokeWidth={6} /></g>;
            case "brush": return <path d="M20,140 C70,100 140,95 205,120" fill="none" stroke={ink} strokeWidth={22} strokeLinecap="round" strokeDasharray="260" strokeDashoffset={260 * (1 - k)} opacity={0.7} filter="url(#ink)" />;
            case "enso": return <path d="M150,48 A72,72 0 1 0 172,92" fill="none" stroke={ink} strokeWidth={14} strokeLinecap="round" strokeDasharray="460" strokeDashoffset={460 * (1 - k)} opacity={0.75} filter="url(#ink)" />;
            case "pixheart": return <g fill={d.inks[0]} opacity={k} transform="translate(0,10)"><rect x={54} y={40} width={14} height={14} /><rect x={68} y={40} width={14} height={14} /><rect x={96} y={40} width={14} height={14} /><rect x={110} y={40} width={14} height={14} /><rect x={40} y={54} width={14} height={14} /><rect x={54} y={54} width={14} height={14} /><rect x={68} y={54} width={14} height={14} /><rect x={82} y={54} width={14} height={14} /><rect x={96} y={54} width={14} height={14} /><rect x={110} y={54} width={14} height={14} /><rect x={124} y={54} width={14} height={14} /><rect x={40} y={68} width={14} height={14} /><rect x={54} y={68} width={14} height={14} /><rect x={68} y={68} width={14} height={14} /><rect x={82} y={68} width={14} height={14} /><rect x={96} y={68} width={14} height={14} /><rect x={110} y={68} width={14} height={14} /><rect x={124} y={68} width={14} height={14} /><rect x={54} y={82} width={14} height={14} /><rect x={68} y={82} width={14} height={14} /><rect x={82} y={82} width={14} height={14} /><rect x={96} y={82} width={14} height={14} /><rect x={110} y={82} width={14} height={14} /><rect x={68} y={96} width={14} height={14} /><rect x={82} y={96} width={14} height={14} /><rect x={96} y={96} width={14} height={14} /><rect x={82} y={110} width={14} height={14} /></g>;
            case "pixcoin": return <g opacity={k} transform={`translate(0,${drift})`}><rect x={80} y={50} width={60} height={110} fill={d.inks[0]} /><rect x={66} y={64} width={88} height={82} fill={d.inks[0]} /><rect x={102} y={76} width={16} height={58} fill={d.paper} opacity={0.6} /></g>;
            case "invader": return <g fill={d.inks[1]} opacity={k}><rect x={68} y={40} width={14} height={14} /><rect x={124} y={40} width={14} height={14} /><rect x={82} y={54} width={14} height={14} /><rect x={110} y={54} width={14} height={14} /><rect x={68} y={68} width={14} height={14} /><rect x={82} y={68} width={14} height={14} /><rect x={96} y={68} width={14} height={14} /><rect x={110} y={68} width={14} height={14} /><rect x={124} y={68} width={14} height={14} /><rect x={54} y={82} width={14} height={14} /><rect x={68} y={82} width={14} height={14} /><rect x={96} y={82} width={14} height={14} /><rect x={124} y={82} width={14} height={14} /><rect x={138} y={82} width={14} height={14} /><rect x={40} y={96} width={14} height={14} /><rect x={54} y={96} width={14} height={14} /><rect x={68} y={96} width={14} height={14} /><rect x={82} y={96} width={14} height={14} /><rect x={96} y={96} width={14} height={14} /><rect x={110} y={96} width={14} height={14} /><rect x={124} y={96} width={14} height={14} /><rect x={138} y={96} width={14} height={14} /><rect x={152} y={96} width={14} height={14} /><rect x={40} y={110} width={14} height={14} /><rect x={68} y={110} width={14} height={14} /><rect x={82} y={110} width={14} height={14} /><rect x={96} y={110} width={14} height={14} /><rect x={110} y={110} width={14} height={14} /><rect x={124} y={110} width={14} height={14} /><rect x={152} y={110} width={14} height={14} /><rect x={40} y={124} width={14} height={14} /><rect x={68} y={124} width={14} height={14} /><rect x={124} y={124} width={14} height={14} /><rect x={152} y={124} width={14} height={14} /><rect x={82} y={138} width={14} height={14} /><rect x={110} y={138} width={14} height={14} /></g>;
            case "fan": return <g fill="none" stroke={d.inks[0]} strokeWidth={2} opacity={0.8 * k}>{Array.from({ length: 9 }, (_, j) => { const a = Math.PI * (j / 8); return <line key={j} x1={110} y1={200} x2={110 - Math.cos(a) * 160} y2={200 - Math.sin(a) * 160} />; })}<path d="M-50,200 A160,160 0 0 1 270,200" /><path d="M10,200 A100,100 0 0 1 210,200" /></g>;
            case "sunburst": return <g stroke={d.inks[0]} strokeWidth={3} opacity={0.75 * k}>{Array.from({ length: 24 }, (_, j) => { const a = (j / 24) * Math.PI * 2 + t * 0.05; return <line key={j} x1={110 + Math.cos(a) * 30} y1={110 + Math.sin(a) * 30} x2={110 + Math.cos(a) * (j % 2 ? 70 : 100)} y2={110 + Math.sin(a) * (j % 2 ? 70 : 100)} />; })}</g>;
            case "decoframe": return <g fill="none" stroke={d.inks[0]} strokeWidth={3} opacity={0.8 * k}><path d="M20,200 V60 H60 V20 H200" /><path d="M40,200 V80 H80 V40 H200" /><path d="M60,200 V100 H100 V60 H200" /></g>;
            case "squiggle": return <path d={`M10,${120 + drift} q25,-50 50,0 t50,0 t50,0 t50,0`} fill="none" stroke={d.inks[0]} strokeWidth={10} strokeLinecap="round" opacity={k} />;
            case "confetti": return <g opacity={k}>{Array.from({ length: 14 }, (_, j) => <rect key={j} x={20 + rand(j * 3) * 170} y={20 + rand(j * 5 + 1) * 170} width={18} height={7} rx={2} fill={d.inks[j % 3]} transform={`rotate(${rand(j) * 180 + t * 10} ${30 + rand(j * 3) * 170} ${25 + rand(j * 5 + 1) * 170})`} />)}</g>;
            case "zigzag": return <path d="M10,140 l25,-40 l25,40 l25,-40 l25,40 l25,-40 l25,40 l25,-40" fill="none" stroke={d.inks[1]} strokeWidth={9} strokeLinejoin="round" opacity={k} transform={`translate(0,${drift})`} />;
            case "vine": return <g fill="none" stroke={d.inks[2] ?? d.inks[0]} strokeWidth={4} opacity={0.8 * k}><path d="M20,210 C40,150 10,110 60,80 S120,40 110,10" />{[[42, 160], [35, 112], [75, 72], [108, 40]].map(([x, y], j) => <path key={j} d={`M${x},${y} q${j % 2 ? 22 : -22},-6 ${j % 2 ? 28 : -28},-24 q-${j % 2 ? 4 : -4},16 -${j % 2 ? 28 : -28},24`} fill={d.inks[2] ?? d.inks[0]} opacity={0.6} />)}</g>;
            case "flourish": return <path d="M20,120 C60,60 90,180 130,110 S190,60 205,110 M130,110 c-10,-30 20,-40 25,-15" fill="none" stroke={d.inks[0]} strokeWidth={4} strokeLinecap="round" opacity={0.8 * k} />;
            case "atom": return <g fill="none" stroke={ink} strokeWidth={3} opacity={0.75 * k} transform={`rotate(${t * 6} 110 110)`}>{[0, 60, 120].map((r) => <ellipse key={r} cx={110} cy={110} rx={90} ry={30} transform={`rotate(${r} 110 110)`} />)}<circle cx={110} cy={110} r={12} fill={d.inks[0]} stroke="none" /></g>;
            case "starburst": return <path d={Array.from({ length: 16 }, (_, j) => { const a = (j / 16) * Math.PI * 2, r = j % 2 ? 40 : 95; return `${j ? "L" : "M"}${110 + Math.cos(a) * r * k},${110 + Math.sin(a) * r * k}`; }).join(" ") + "Z"} fill={d.inks[1]} opacity={0.85} />;
            case "boomerang": return <path d="M30,170 Q60,40 190,50 Q90,80 70,180 Z" fill={d.inks[0]} opacity={0.85 * k} transform={`rotate(${drift} 110 110)`} />;
            case "route": return <g opacity={k}><path d="M10,190 H90 L150,130 V20" fill="none" stroke={d.inks[0]} strokeWidth={14} strokeLinejoin="round" strokeDasharray="420" strokeDashoffset={420 * (1 - k)} />{[[10, 190], [90, 190], [150, 130], [150, 20]].map(([x, y], j) => <circle key={j} cx={x} cy={y} r={11} fill="#ffffff" stroke={ink} strokeWidth={5} />)}</g>;
            case "interchange": return <g opacity={k}><path d="M20,110 H200" stroke={d.inks[0]} strokeWidth={14} /><path d="M110,20 V200" stroke={d.inks[1]} strokeWidth={14} /><rect x={88} y={88} width={44} height={44} rx={22} fill="#ffffff" stroke={ink} strokeWidth={6} /></g>;
            case "patch": return <g opacity={k}><circle cx={110} cy={110} r={88} fill={d.inks[0]} opacity={0.85} /><circle cx={110} cy={110} r={88} fill="none" stroke={d.ink} strokeWidth={6} /><path d="M60,140 Q110,40 165,85" fill="none" stroke={d.ink} strokeWidth={5} /><path d="M110,70 l8,20 h20 l-16,12 6,20 -18,-12 -18,12 6,-20 -16,-12 h20z" fill={d.ink} /></g>;
            case "orbit": return <g fill="none" stroke={d.inks[0]} strokeWidth={2.5} opacity={0.8 * k}><ellipse cx={110} cy={110} rx={95} ry={45} strokeDasharray="6 6" /><circle cx={110} cy={110} r={18} fill={d.inks[1]} stroke="none" /><circle cx={110 + Math.cos(t) * 95} cy={110 + Math.sin(t) * 45} r={8} fill={d.inks[0]} stroke="none" /></g>;
            case "barcode": return <g fill={ink} opacity={0.85 * k}>{Array.from({ length: 30 }, (_, j) => <rect key={j} x={20 + j * 6} y={60} width={rand(j * 7) > 0.5 ? 4 : 2} height={100} />)}</g>;
            case "perforation": return <path d={"M0,110 " + Array.from({ length: 11 }, (_, j) => `l10,-12 l10,12`).join(" ")} fill="none" stroke={ink} strokeWidth={3} opacity={0.6 * k} />;
            case "spot": return <path d="M90,0 H130 L210,220 H10 Z" fill="#ffffff" opacity={0.22 * k} />;
            case "placard": return <g opacity={k}><rect x={50} y={70} width={120} height={80} fill="#ffffff" stroke={ink} strokeWidth={1.5} opacity={0.9} /><path d="M62,92 h70 M62,108 h90 M62,122 h60 M62,136 h80" stroke={ink} strokeWidth={3} opacity={0.5} /></g>;
            case "sprockets": return <g opacity={k}><rect x={0} y={70} width={220} height={80} fill="#141414" />{Array.from({ length: 9 }, (_, j) => <g key={j}><rect x={8 + j * 24} y={76} width={12} height={9} rx={2} fill={d.paper} /><rect x={8 + j * 24} y={135} width={12} height={9} rx={2} fill={d.paper} /></g>)}</g>;
            case "grease": return <ellipse cx={110} cy={110} rx={85} ry={62} fill="none" stroke={d.inks[0]} strokeWidth={7} strokeLinecap="round" strokeDasharray="480" strokeDashoffset={480 * (1 - k)} transform="rotate(-8 110 110)" opacity={0.85} />;
            case "loupe": return <g fill="none" stroke={ink} strokeWidth={6} opacity={0.75 * k}><circle cx={95} cy={95} r={60} /><path d="M140,140 L200,200" strokeWidth={14} strokeLinecap="round" /></g>;
            case "compass": return <g opacity={0.8 * k} transform={`rotate(${drift} 110 110)`}><circle cx={110} cy={110} r={80} fill="none" stroke={ink} strokeWidth={2} /><path d="M110,20 L124,110 L110,200 L96,110 Z" fill={d.inks[0]} /><path d="M20,110 L110,96 L200,110 L110,124 Z" fill={ink} opacity={0.6} /></g>;
            case "contour": return <g fill="none" stroke={ink} strokeWidth={1.6} opacity={0.5 * k}>{[30, 50, 70, 90].map((r, j) => <path key={r} d={`M${110 - r},110 C${110 - r},${110 - r * 0.8} ${110 + r * 0.9},${110 - r} ${110 + r},${110 + j * 4} S${110 - r * 0.6},${110 + r} ${110 - r},110`} />)}</g>;
            case "dotroute": return <g opacity={k}><path d="M20,190 C60,120 120,170 190,40" fill="none" stroke={d.inks[0]} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" /><path d="M175,30 l30,30 M205,30 l-30,30" stroke={d.inks[0]} strokeWidth={6} /></g>;
            case "redact": return <g fill={ink}>{[60, 100, 140].map((y, j) => <rect key={y} x={20} y={y} width={(170 - j * 30) * k} height={22} />)}</g>;
            default: return null;
          }
        })();
        return (
          <svg key={i} width={S} height={S} style={{ position: "absolute", left: x, top: y, opacity: k, transform: `scale(${flipX},${flipY})` }}>{body}</svg>
        );
      })}
      {words.length > 0 && <Stack x={zones.includes("bl") ? 1700 : 70} y={zones.includes("bl") ? 900 : 900} lines={words} t={t} at={0.4} size={18} />}
    </AbsoluteFill>
  );
};

/** a huge faded word printed behind the spread, like a masthead (VOX) */
export const Watermark: React.FC<{ x: number; y: number; text: string; t: number; size?: number }> = ({ x, y, text, t, size = 260 }) => {
  const d = useDNA();
  return <div style={{ position: "absolute", left: x + Math.sin(t * 0.4) * 6, top: y, fontFamily: fam(d.display), fontSize: size, lineHeight: 0.85, color: d.ink, opacity: 0.1 * appear(t, 0, 1), letterSpacing: "-0.02em", filter: "url(#ink)", whiteSpace: "nowrap" }}>{text}</div>;
};

/** a real photo printed as a duotone plate in a box (grayscale, multiplied with the loud ink, a halftone screen), the
 *  camera pushing slowly toward its subject; caption and credit printed under it */
export const Plate: React.FC<Box & { t: number; at: number; src: string; focus?: [number, number]; caption?: string; credit?: string; cut?: boolean }> = ({ x, y, w, h, t, at, src, focus = [0.5, 0.5], caption, credit, cut }) => {
  const d = useDNA();
  const { style: enter } = useEnter(t, at);
  const foot = (caption ? 50 : 0) + (credit ? 30 : 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...enter, transform: `${enter.transform ?? ""} rotate(${cut ? -1.5 : 0}deg)` }}>
      <div style={{ position: "relative", width: w, height: h - foot, overflow: "hidden", background: d.paper, border: cut ? "12px solid #f7f2e8" : undefined, boxSizing: "border-box", filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.08)) drop-shadow(0 12px 16px rgba(0,0,0,0.12))" }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${1 + 0.08 * clamp01((t - at) / 6)})`,
          filter: "grayscale(1) contrast(1.15) brightness(1.12)", mixBlendMode: "multiply" }} />
        <div style={{ position: "absolute", inset: 0, background: d.inks[0], mixBlendMode: "multiply", opacity: 0.32 }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.2, backgroundImage: `radial-gradient(${d.ink} 24%, transparent 26%)`, backgroundSize: "7px 7px", mixBlendMode: "multiply" }} />
      </div>
      {caption && <div style={{ marginTop: 10 }}><Type size={36} display>{caption}</Type></div>}
      {credit && <div style={{ fontFamily: fam(d.mono ?? d.body), fontSize: 18, letterSpacing: "0.12em", color: d.ink, opacity: 0.7, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{credit}</div>}
    </div>
  );
};
