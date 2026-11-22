/* LAYER 2 of the motion library, part A: BLOCKS (the nouns) for PEOPLE, DATA and FINANCE.
   A block is a thing on screen that already moves well by itself: give it its data and `at` (when it comes in), and
   place it with <At> or a wrapper. Any layer-1 motion (<Move>) can wrap it too. Every block takes the film's theme. */

import { Img, staticFile } from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { clamp01, family, useScene } from "../kit";
import { BarGrow, BarRace, CountUp, Gauge, LineTrace, PieFill, curve, ease, rand } from "./motion";
import { Part, SvgPart, block } from "./parts";

/** a transparent pixel: what a block shows for a picture it was not given (an empty path would load the public folder
    itself, which no browser can decode, and the whole render stops) */
const BLANK = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
export const src = (p: string) => (!p || !p.trim() || p.endsWith("/") ? BLANK : p.startsWith("http") || p.startsWith("/") || p.startsWith("data:") ? p : staticFile(p));
export function useIn(at: number, dur = 0.6) {
  const s = useScene();
  const k = clamp01((s.t - at) / dur);
  return { ...s, k, u: ease.out(k), b: ease.back(k) };
}
export const shadow = "0 14px 34px rgb(0 0 0/0.22)";

/* ================= PEOPLE ================= */
/** a person as a flat filled silhouette in a pose (stand, walk, point, cheer, sit); walking swings the limbs */
function SilhouetteView({ pose = "stand", height = 420, color, at = 0, face = 1 }: { pose?: "stand" | "walk" | "point" | "cheer" | "sit"; height?: number; color?: string; at?: number; face?: 1 | -1 }) {
  const { t, theme, u } = useIn(at);
  const c = color ?? theme.ink, s = height / 420;
  const sw = pose === "walk" ? Math.sin(t * 6) * 26 : 0;
  const limb = (x: number, y: number, len: number, deg: number, w = 30) => <rect x={x - w / 2} y={y} width={w} height={len} rx={w / 2} fill={c} transform={`rotate(${deg} ${x} ${y})`} />;
  const armL = pose === "point" ? -95 : pose === "cheer" ? 160 : sw, armR = pose === "cheer" ? -160 : -sw;
  const sit = pose === "sit";
  return (
    <svg width={160 * s} height={height} viewBox="-80 0 160 420" style={{ overflow: "visible", transform: `scaleX(${face}) translateY(${(1 - u) * 30}px)`, opacity: u }}>
      {limb(-14, 232, sit ? 90 : 180, sit ? 80 : sw)}{limb(14, 232, sit ? 90 : 180, sit ? 80 : -sw)}
      {sit && <>{limb(-90, 245, 100, 0)}{limb(-62, 245, 100, 0)}</>}
      {limb(-30, 112, 130, armL, 26)}{limb(30, 112, 130, armR, 26)}
      <rect x={-42} y={100} width={84} height={150} rx={36} fill={c} />
      <SvgPart name="head" x={-42} y={14} w={84} h={84} item={pose}><circle cx={0} cy={56} r={42} fill={c} /></SvgPart>
    </svg>
  );
}
export const Silhouette = block("Silhouette", SilhouetteView);
/** a real person cut out of a photo, with a white paper border and a soft shadow */
function CutoutPersonView({ image, height = 520, at = 0, tilt = -2 }: { image: string; height?: number; at?: number; tilt?: number }) {
  const { u, t } = useIn(at, 0.7);
  return <Part name="picture"><Img src={src(image)} style={{ height, transform: `translateY(${(1 - u) * 80}px) rotate(${tilt + Math.sin(t * 0.8) * 0.6}deg)`, opacity: u, filter: "drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 18px 24px rgb(0 0 0/0.35))" }} /></Part>;
}
export const CutoutPerson = block("CutoutPerson", CutoutPersonView);
/** a crowd: rows of people that appear and bob, some cheering (a market, a protest, a stadium) */
function CrowdView({ w = 1200, rows = 3, per = 14, at = 0, color }: { w?: number; rows?: number; per?: number; at?: number; color?: string }) {
  const { t, theme } = useScene();
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
    const n = r * per + i, k = ease.back(clamp01((t - at - rand(n) * 0.8) / 0.5)), h = 110 + r * 26 + rand(n + 3) * 30;
    const bob = Math.abs(Math.sin(t * (3 + rand(n) * 2) + n)) * 10 * (rand(n + 7) > 0.6 ? 1 : 0.2);
    out.push(<Part name="person" key={n} item={r} i={n}><div style={{ position: "absolute", left: (i + (r % 2) * 0.5) * (w / per) + (rand(n + 1) - 0.5) * 20, bottom: (rows - 1 - r) * 34 - 20 + bob, transform: `scale(${k})`, transformOrigin: "50% 100%", opacity: 0.55 + r * 0.2, zIndex: r }}>
     <svg width={h * 0.45} height={h} viewBox="0 0 45 100"><circle cx={22.5} cy={16} r={13} fill={color ?? theme.ink} /><rect x={5} y={32} width={35} height={70} rx={16} fill={color ?? theme.ink} /></svg>
    </div></Part>);
  }
  return <div style={{ position: "relative", width: w, height: rows * 34 + 160 }}>{out}</div>;
}
export const Crowd = block("Crowd", CrowdView);
/** a framed portrait with a name and a role under it */
function PortraitView({ image, name, role, size = 340, at = 0, round = false }: { image: string; name: string; role?: string; size?: number; at?: number; round?: boolean }) {
  const { theme, b, u } = useIn(at, 0.7);
  return (
    <div style={{ width: size, transform: `scale(${b})`, opacity: u, fontFamily: family(theme.font), textAlign: "center" }}>
      <div style={{ width: size, height: round ? size : size * 1.2, borderRadius: round ? "50%" : 14, overflow: "hidden", border: `10px solid ${theme.paper ?? "#fff"}`, boxShadow: shadow }}>
        <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ fontFamily: family(theme.display), fontSize: 46, fontWeight: 800, color: theme.ink, marginTop: 16 }}>{name}</div>
      {role && <div style={{ fontSize: 28, color: theme.muted }}>{role}</div>}
    </div>
  );
}
export const Portrait = block("Portrait", PortraitView);
/** a person speaking: a round portrait and a speech bubble whose words type out */
function SpeechQuoteView({ image, text, at = 0, w = 900 }: { image: string; text: string; at?: number; w?: number }) {
  const { theme, t, u } = useIn(at);
  const n = Math.floor(clamp01((t - at - 0.4) / Math.max(0.5, text.length * 0.035)) * text.length);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 26, width: w, fontFamily: family(theme.font), opacity: u }}>
      <div style={{ width: 190, height: 190, flex: "none", borderRadius: "50%", overflow: "hidden", border: `8px solid ${theme.paper ?? "#fff"}`, boxShadow: shadow }}><Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
      <div style={{ position: "relative", background: theme.paper ?? "#fff", borderRadius: 28, padding: "28px 34px", fontSize: 40, lineHeight: 1.3, color: theme.ink, boxShadow: shadow, transform: `scale(${ease.back(clamp01((t - at - 0.2) / 0.5))})`, transformOrigin: "0% 100%", minHeight: 120 }}>
        {text.slice(0, n)}<span style={{ opacity: 0 }}>{text.slice(n)}</span>
        <div style={{ position: "absolute", left: -22, bottom: 24, width: 0, height: 0, borderTop: "18px solid transparent", borderBottom: "18px solid transparent", borderRight: `26px solid ${theme.paper ?? "#fff"}` }} />
      </div>
    </div>
  );
}
export const SpeechQuote = block("SpeechQuote", SpeechQuoteView);
/** a hand that points or taps on something */
function HandView({ at = 0, tap = true, size = 200, color = "#f2c9a0" }: { at?: number; tap?: boolean; size?: number; color?: string }) {
  const { t, u } = useIn(at);
  const press = tap ? Math.max(0, Math.sin((t - at) * 5)) * 18 : 0;
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 100 130" style={{ transform: `translate(${(1 - u) * 120}px, ${(1 - u) * 120 + press}px)`, opacity: u, filter: "drop-shadow(0 10px 12px rgb(0 0 0/0.3))" }}>
      <SvgPart name="finger" x={38} y={0} w={20} h={64}><rect x={38} y={0} width={20} height={64} rx={10} fill={color} stroke="#b98a62" strokeWidth={2} /></SvgPart>
      <SvgPart name="palm" x={22} y={46} w={68} h={78}><path d="M22 56 Q22 46 32 46 L80 46 Q90 46 90 58 L90 92 Q90 124 58 124 L44 124 Q22 124 22 100 Z" fill={color} stroke="#b98a62" strokeWidth={2} /></SvgPart>
      <path d="M58 52 L58 70 M70 52 L70 72 M80 54 L80 72" stroke="#b98a62" strokeWidth={2} />
      <rect x={30} y={112} width={46} height={18} rx={4} fill="#3b5998" />
    </svg>
  );
}
export const Hand = block("Hand", HandView);
/** a round avatar with initials (a user, a customer, a voter) */
function AvatarView({ name, size = 160, at = 0, color }: { name: string; size?: number; at?: number; color?: string }) {
  const { theme, b } = useIn(at, 0.5);
  const ini = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <Part name="face" item={name}><div style={{ width: size, height: size, borderRadius: "50%", background: color ?? theme.accent2, color: "#fff", display: "grid", placeItems: "center", fontFamily: family(theme.display), fontWeight: 800, fontSize: size * 0.4, transform: `scale(${b})`, boxShadow: shadow, border: "6px solid #fff" }}>{ini}</div></Part>;
}
export const Avatar = block("Avatar", AvatarView);

/* ================= DATA ================= */
/** a frame for any chart: a title, the chart, a source line */
export function ChartFrame({ title, source, children, at = 0, w }: { title: string; source?: string; children: ReactNode; at?: number; w?: number }) {
  const { theme, u } = useIn(at);
  return (
    <div style={{ width: w, background: theme.paper ?? "#fff", borderRadius: 22, padding: "30px 40px", boxShadow: shadow, fontFamily: family(theme.font), transform: `translateY(${(1 - u) * 40}px)`, opacity: u }}>
      <div style={{ fontFamily: family(theme.display), fontSize: 44, fontWeight: 800, color: theme.ink, marginBottom: 20 }}>{title}</div>
      {children}
      {source && <div style={{ fontSize: 22, color: theme.muted, marginTop: 14 }}>Source: {source}</div>}
    </div>
  );
}
/** one big number with what it means under it */
function BigNumberView({ value, prefix = "", suffix = "", label, at = 0, size = 240, decimals = 0 }: { value: number; prefix?: string; suffix?: string; label: string; at?: number; size?: number; decimals?: number }) {
  const { theme, u } = useIn(at + 1.2, 0.5);
  return (
    <div style={{ textAlign: "center", fontFamily: family(theme.font) }}>
      <CountUp to={value} at={at} prefix={prefix} suffix={suffix} size={size} decimals={decimals} color={theme.accent} />
      <div style={{ fontSize: size * 0.17, color: theme.ink, opacity: u, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
export const BigNumber = block("BigNumber", BigNumberView);
export const ColumnChart = BarGrow;
export const LineChart2 = LineTrace;
export const Donut = PieFill;
export const Dial = Gauge;
export const RankingRace = BarRace;
/** horizontal bars sliding out from a left axis, sorted, with values */
function HBarsView({ data, w = 1000, at = 0, rowH = 80 }: { data: { label: string; value: number; color?: string }[]; w?: number; at?: number; rowH?: number }) {
  const { t, theme } = useScene();
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ width: w, fontFamily: family(theme.font) }}>
      {data.map((d, i) => {
        const k = ease.out(clamp01((t - at - i * 0.12) / 0.8));
        return <div key={i} style={{ display: "flex", alignItems: "center", height: rowH, gap: 16 }}>
          <div style={{ width: 210, textAlign: "right", fontSize: 32, fontWeight: 700, color: theme.ink }}>{d.label}</div>
          <Part name="bar" item={d} i={i}><div style={{ height: rowH * 0.62, width: ((d.value / max) * (w - 360)) * k, background: d.color ?? (i === 0 ? theme.accent : theme.accent2), borderRadius: "0 10px 10px 0" }} /></Part>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme.ink, opacity: k }}>{Math.round(d.value * k)}</div>
        </div>;
      })}
    </div>
  );
}
export const HBars = block("HBars", HBarsView);
/** stacked areas that grow over time (shares that change) */
function AreaStackView({ series, labels = [], w = 1000, h = 440, at = 0, dur = 2 }: { series: { name: string; values: number[]; color?: string }[]; labels?: string[]; w?: number; h?: number; at?: number; dur?: number }) {
  const { t, theme } = useScene();
  const n = series[0].values.length, k = ease.inOut(clamp01((t - at) / dur));
  const tot = Array.from({ length: n }, (_, i) => series.reduce((a, s) => a + s.values[i], 0)), max = Math.max(...tot);
  const palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", theme.muted];
  let base = Array(n).fill(0);
  const paths = series.map((s, si) => {
    const top = base.map((b, i) => b + s.values[i]);
    const X = (i: number) => (i / (n - 1)) * w, Y = (v: number) => h - (v / max) * h * k;
    const d = `M${top.map((v, i) => `${X(i)} ${Y(v)}`).join(" L")} L${[...base].reverse().map((v, i) => `${X(n - 1 - i)} ${Y(v)}`).join(" L")} Z`;
    base = top;
    return <path key={si} d={d} fill={s.color ?? palette[si % palette.length]} opacity={0.9} />;
  });
  return (
    <div style={{ position: "relative", width: w, height: h + 50, fontFamily: family(theme.font) }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>{paths}</svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: theme.muted, marginTop: 10 }}>{labels.map((l) => <span key={l}>{l}</span>)}</div>
      <div style={{ position: "absolute", top: 0, right: -10, transform: "translateX(100%)", display: "flex", flexDirection: "column", gap: 10 }}>{series.map((s, i) => <div key={s.name} style={{ fontSize: 28, fontWeight: 700, color: s.color ?? palette[i % palette.length] }}>■ {s.name}</div>)}</div>
    </div>
  );
}
export const AreaStack = block("AreaStack", AreaStackView);
/** 100%-stacked bars: how each group splits */
function StackedBarsView({ rows, w = 1000, at = 0 }: { rows: { label: string; parts: number[] }[]; w?: number; at?: number }) {
  const { t, theme } = useScene();
  const palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8"];
  return (
    <div style={{ width: w, fontFamily: family(theme.font), display: "flex", flexDirection: "column", gap: 22 }}>
      {rows.map((r, i) => {
        const k = ease.out(clamp01((t - at - i * 0.15) / 0.9)), tot = r.parts.reduce((a, b) => a + b, 0);
        return <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 160, fontSize: 30, fontWeight: 700, color: theme.ink, textAlign: "right" }}>{r.label}</div>
          <div style={{ display: "flex", width: (w - 180) * k, height: 64, borderRadius: 10, overflow: "hidden" }}>{r.parts.map((p, j) => <div key={j} style={{ width: `${(p / tot) * 100}%`, background: palette[j % palette.length], color: "#fff", fontSize: 26, fontWeight: 700, display: "grid", placeItems: "center" }}>{Math.round((p / tot) * 100)}%</div>)}</div>
        </div>;
      })}
    </div>
  );
}
export const StackedBars = block("StackedBars", StackedBarsView);
/** dots on two axes pop in one by one, then a trend line draws through them */
function ScatterPlotView({ points, w = 900, h = 520, at = 0, xLabel = "", yLabel = "", trend = true }: { points: [number, number][]; w?: number; h?: number; at?: number; xLabel?: string; yLabel?: string; trend?: boolean }) {
  const { t, theme } = useScene();
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const X = (v: number) => ((v - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs) || 1)) * (w - 40) + 20, Y = (v: number) => h - ((v - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys) || 1)) * (h - 40) - 20;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const slope = points.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / (points.reduce((a, p) => a + (p[0] - mx) ** 2, 0) || 1);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), kt = ease.inOut(clamp01((t - at - points.length * 0.06) / 1));
  return (
    <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.font) }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <path d={`M0 0 L0 ${h} L${w} ${h}`} fill="none" stroke={theme.ink} strokeWidth={4} />
        {points.map((p, i) => { const k = ease.back(clamp01((t - at - i * 0.06) / 0.4)); return <circle key={i} cx={X(p[0])} cy={Y(p[1])} r={14 * k} fill={theme.accent2} opacity={0.85} />; })}
        {trend && <line x1={X(x0)} y1={Y(my + slope * (x0 - mx))} x2={X(x0 + (x1 - x0) * kt)} y2={Y(my + slope * (x0 + (x1 - x0) * kt - mx))} stroke={theme.accent} strokeWidth={7} strokeLinecap="round" />}
      </svg>
      <div style={{ position: "absolute", bottom: -50, width: "100%", textAlign: "center", fontSize: 28, color: theme.muted }}>{xLabel}</div>
      <div style={{ position: "absolute", left: -70, top: h / 2, transform: "rotate(-90deg) translateX(-50%)", transformOrigin: "0 0", fontSize: 28, color: theme.muted }}>{yLabel}</div>
    </div>
  );
}
export const ScatterPlot = block("ScatterPlot", ScatterPlotView);
/** bubbles sized by value float in and settle (markets, countries by size) */
function BubblesView({ items, w = 1000, h = 560, at = 0 }: { items: { label: string; value: number; color?: string }[]; w?: number; h?: number; at?: number }) {
  const { t, theme } = useScene();
  const max = Math.max(...items.map((i) => i.value)), palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8"];
  return (
    <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.font) }}>
      {items.map((it, i) => {
        // side by side, each spaced by its own size and scaled to fit the width, zigzagging a little: never overlapping
        const rs = items.map((d) => Math.sqrt(d.value / max) * 170), fit = Math.min(1, (w * 0.96) / (rs.reduce((a, b) => a + 2 * b + 16, 0) || 1), (h * 0.9) / 340);
        const r = rs[i] * fit, k = ease.back(clamp01((t - at - i * 0.12) / 0.6)), before = rs.slice(0, i).reduce((a, b) => a + 2 * b + 16, 0) * fit, total = rs.reduce((a, b) => a + 2 * b + 16, 0) * fit;
        const x = (w - total) / 2 + before + r + Math.sin(t * 0.6 + i) * 6, y = h / 2 + (i % 2 ? -1 : 1) * Math.max(0, h / 2 - r - 20) * 0.35 + Math.cos(t * 0.5 + i) * 6;
        return <Part name="bubble" key={i} item={it} i={i}><div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: it.color ?? palette[i % palette.length], transform: `scale(${k})`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: Math.max(20, r * 0.3), textAlign: "center", boxShadow: shadow }}>{it.label}</div></Part>;
      })}
    </div>
  );
}
export const Bubbles = block("Bubbles", BubblesView);
/** 100 dots, of which some fill in colour: "37 out of 100" */
function WaffleView({ value, at = 0, size = 520, color, label }: { value: number; at?: number; size?: number; color?: string; label?: string }) {
  const { t, theme } = useScene();
  const cell = size / 10;
  return (
    <div style={{ fontFamily: family(theme.font), textAlign: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(10, ${cell}px)`, gap: 0 }}>
        {Array.from({ length: 100 }, (_, i) => { const on = i < value && t > at + i * 0.02; return <Part name="cell" key={i} item={on} i={i}><div style={{ width: cell - 10, height: cell - 10, margin: 5, borderRadius: "50%", background: on ? color ?? theme.accent : theme.muted, opacity: on ? 1 : 0.25, transform: `scale(${on ? 1 : 0.8})` }} /></Part>; })}
      </div>
      {label && <div style={{ fontSize: 36, color: theme.ink, marginTop: 16, fontWeight: 700 }}>{label}</div>}
    </div>
  );
}
export const Waffle = block("Waffle", WaffleView);
/** a table whose rows slide in; one row can be marked */
function DataTableView({ head, rows, at = 0, mark = -1, w = 1000 }: { head: string[]; rows: (string | number)[][]; at?: number; mark?: number; w?: number }) {
  const { t, theme } = useScene();
  return (
    <div style={{ width: w, fontFamily: family(theme.font), background: theme.paper ?? "#fff", borderRadius: 18, overflow: "hidden", boxShadow: shadow }}>
      <div style={{ display: "flex", background: theme.ink, color: "#fff", fontSize: 30, fontWeight: 800 }}>{head.map((h) => <div key={h} style={{ flex: 1, padding: "18px 24px" }}>{h}</div>)}</div>
      {rows.map((r, i) => { const k = ease.out(clamp01((t - at - i * 0.18) / 0.5)); return <div key={i} style={{ display: "flex", fontSize: 30, color: theme.ink, background: i === mark && t > at + rows.length * 0.18 + 0.4 ? "rgb(255 222 60/0.55)" : i % 2 ? "rgb(0 0 0/0.04)" : undefined, opacity: k, transform: `translateX(${(1 - k) * 60}px)` }}>{r.map((c, j) => <div key={j} style={{ flex: 1, padding: "16px 24px", fontWeight: j === 0 ? 700 : 400 }}>{c}</div>)}</div>; })}
    </div>
  );
}
export const DataTable = block("DataTable", DataTableView);
/** a grid of cells whose colour shows how much (days, regions, hours) */
function HeatMapView({ values, cols, at = 0, cell = 54, labels }: { values: number[]; cols: number; at?: number; cell?: number; labels?: string[] }) {
  const { t, theme } = useScene();
  const max = Math.max(...values);
  return (
    <div style={{ fontFamily: family(theme.font) }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: 6 }}>
        {values.map((v, i) => { const k = clamp01((t - at - ((i % cols) + Math.floor(i / cols)) * 0.03) / 0.3); return <div key={i} style={{ width: cell, height: cell, borderRadius: 8, background: theme.accent, opacity: (0.12 + 0.88 * (v / max)) * k }} />; })}
      </div>
      {labels && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: theme.muted, marginTop: 10 }}>{labels.map((l) => <span key={l}>{l}</span>)}</div>}
    </div>
  );
}
export const HeatMap = block("HeatMap", HeatMapView);
/** a small KPI card: a number, its change (up or down) and a sparkline */
function KpiCardView({ label, value, change, spark, at = 0 }: { label: string; value: string; change: number; spark: number[]; at?: number }) {
  const { theme, u, t } = useIn(at);
  const up = change >= 0, col = up ? "#1f9d55" : "#d64545";
  const lo = Math.min(...spark), hi = Math.max(...spark);
  const pts = spark.map((v, i) => [(i / (spark.length - 1)) * 300, 80 - ((v - lo) / (hi - lo || 1)) * 70] as [number, number]);
  const k = ease.inOut(clamp01((t - at - 0.3) / 1.2));
  return (
    <div style={{ width: 380, background: theme.paper ?? "#fff", borderRadius: 20, padding: 28, boxShadow: shadow, fontFamily: family(theme.font), opacity: u, transform: `translateY(${(1 - u) * 30}px)` }}>
      <div style={{ fontSize: 26, color: theme.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}><div style={{ fontFamily: family(theme.display), fontSize: 64, fontWeight: 800, color: theme.ink }}>{value}</div><div style={{ fontSize: 28, fontWeight: 800, color: col }}>{up ? "▲" : "▼"} {Math.abs(change)}%</div></div>
      <svg width={300} height={86} style={{ overflow: "visible" }}><path d={curve(pts).d} fill="none" stroke={col} strokeWidth={5} pathLength={1} strokeDasharray={`${k} 2`} /></svg>
    </div>
  );
}
export const KpiCard = block("KpiCard", KpiCardView);

/* ================= FINANCE ================= */
/** a candlestick price chart drawing in day by day (green up, red down), with the last price */
function CandlesView({ data, w = 1100, h = 500, at = 0, per = 0.08 }: { data: [number, number, number, number][]; w?: number; h?: number; at?: number; per?: number }) {
  const { t, theme } = useScene();
  const lo = Math.min(...data.map((d) => d[2])), hi = Math.max(...data.map((d) => d[1]));
  const Y = (v: number) => h - ((v - lo) / (hi - lo)) * h, cw = w / data.length;
  const shown = Math.floor(clamp01((t - at) / (per * data.length)) * data.length);
  const last = data[Math.max(0, shown - 1)];
  return (
    <div style={{ position: "relative", width: w + 160, height: h, fontFamily: family(theme.font) }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke={theme.muted} strokeOpacity={0.2} strokeWidth={2} />)}
        {data.slice(0, shown).map(([o, hh, l, c], i) => { const up = c >= o, col = up ? "#1f9d55" : "#d64545"; return <g key={i}><line x1={i * cw + cw / 2} x2={i * cw + cw / 2} y1={Y(hh)} y2={Y(l)} stroke={col} strokeWidth={3} /><rect x={i * cw + cw * 0.18} width={cw * 0.64} y={Y(Math.max(o, c))} height={Math.max(3, Math.abs(Y(o) - Y(c)))} fill={col} rx={2} /></g>; })}
      </svg>
      {last && shown > 0 && <div style={{ position: "absolute", left: w + 14, top: Y(last[3]) - 26, background: last[3] >= last[0] ? "#1f9d55" : "#d64545", color: "#fff", fontWeight: 800, fontSize: 30, padding: "6px 14px", borderRadius: 8 }}>{last[3].toFixed(0)}</div>}
    </div>
  );
}
export const Candles = block("Candles", CandlesView);
/** a ticker tape of prices scrolling past, green and red */
function TickerTapeView({ items, at = 0, w = 1920, speed = 160 }: { items: { sym: string; price: string; change: number }[]; at?: number; w?: number; speed?: number }) {
  const { t, theme } = useScene();
  const s = Math.max(0, t - at) * speed, row = [...items, ...items, ...items];
  return (
    <div style={{ width: w, overflow: "hidden", background: "#0e1117", padding: "16px 0", fontFamily: family("space_grotesk") }}>
      <div style={{ display: "flex", gap: 60, transform: `translateX(${-(s % (items.length * 330))}px)`, whiteSpace: "nowrap" }}>
        {row.map((it, i) => <div key={i} style={{ fontSize: 36, fontWeight: 700, color: "#fff", minWidth: 270 }}>{it.sym} <span style={{ color: "#c9d1d9" }}>{it.price}</span> <span style={{ color: it.change >= 0 ? "#3fb950" : "#f85149" }}>{it.change >= 0 ? "▲" : "▼"}{Math.abs(it.change)}%</span></div>)}
      </div>
    </div>
  );
}
export const TickerTape = block("TickerTape", TickerTapeView);
/** coins drop one by one and stack up into piles (savings, how much it costs) */
function CoinStackView({ stacks = [4, 7, 11], at = 0, size = 120, gap = 170 }: { stacks?: number[]; at?: number; size?: number; gap?: number }) {
  const { t } = useScene();
  const ch = size * 0.22;
  let n = 0;
  return (
    <div style={{ position: "relative", width: stacks.length * gap, height: Math.max(...stacks) * ch + size }}>
      {stacks.map((count, s) => Array.from({ length: count }, (_, i) => {
        const at0 = at + (n++) * 0.08, k = ease.bounce(clamp01((t - at0) / 0.45));
        return <Part name="coin" item={s} i={i}><div key={`${s}-${i}`} style={{ position: "absolute", left: s * gap, bottom: i * ch + (1 - k) * 500, opacity: t > at0 ? 1 : 0, width: size, height: size * 0.32, borderRadius: "50%", background: "linear-gradient(#ffe08a, #e0a526)", border: "4px solid #b07d12", boxShadow: "inset 0 -6px 0 #c48b16" }} /></Part>;
      }))}
    </div>
  );
}
export const CoinStack = block("CoinStack", CoinStackView);
/** money moves from one box to others as little coins along arrows (where your salary goes) */
function MoneyFlowView({ from, to, at = 0, w = 1300, h = 560 }: { from: string; to: { label: string; share: number }[]; at?: number; w?: number; h?: number }) {
  const { t, theme } = useScene();
  const box = (label: string, x: number, y: number, k: number, big = false) => <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${ease.back(k)})`, background: big ? theme.ink : theme.paper ?? "#fff", color: big ? "#fff" : theme.ink, borderRadius: 16, padding: "18px 28px", fontSize: 32, fontWeight: 800, boxShadow: shadow, whiteSpace: "nowrap" }}>{label}</div>;
  return (
    <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.font) }}>
      <svg width={w} height={h} style={{ position: "absolute", overflow: "visible" }}>
        {to.map((d, i) => { const y = ((i + 0.5) / to.length) * h, k = ease.out(clamp01((t - at - 0.4 - i * 0.15) / 0.6)); return <path key={i} d={`M200 ${h / 2} C${w / 2} ${h / 2} ${w / 2} ${y} ${w - 260} ${y}`} fill="none" stroke={theme.accent} strokeWidth={6 + d.share * 0.5} strokeOpacity={0.35} pathLength={1} strokeDasharray={`${k} 2`} />; })}
      </svg>
      {to.map((d, i) => { const y = ((i + 0.5) / to.length) * h; return Array.from({ length: 3 }, (_, j) => { const p = ((t - at - 1 + j * 0.4 + i * 0.2) % 1.2) / 1.2; if (t < at + 1) return null; const u = clamp01(p); const bx = (1 - u) ** 3 * 200 + 3 * (1 - u) ** 2 * u * (w / 2) + 3 * (1 - u) * u * u * (w / 2) + u ** 3 * (w - 260); const by = (1 - u) ** 3 * (h / 2) + 3 * (1 - u) ** 2 * u * (h / 2) + 3 * (1 - u) * u * u * y + u ** 3 * y; return <div key={`${i}-${j}`} style={{ position: "absolute", left: bx - 16, top: by - 16, width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(#ffe08a,#e0a526)", border: "3px solid #b07d12" }} />; }); })}
      {box(from, 160, h / 2, clamp01((t - at) / 0.5), true)}
      {to.map((d, i) => box(`${d.label} · ${d.share}%`, w - 130, ((i + 0.5) / to.length) * h, clamp01((t - at - 0.6 - i * 0.15) / 0.5)))}
    </div>
  );
}
export const MoneyFlow = block("MoneyFlow", MoneyFlowView);
/** a balance scale that tips to the heavier side (assets vs debts, cost vs benefit) */
function BalanceScaleView({ left, right, lw, rw, at = 0, size = 760 }: { left: string; right: string; lw: number; rw: number; at?: number; size?: number }) {
  const { t, theme } = useScene();
  const s = Math.max(0, t - at), target = Math.max(-16, Math.min(16, (rw - lw) * 3));
  const ang = target * (1 - Math.exp(-2.4 * s) * Math.cos(5 * s));
  const r = size / 2, rad = (ang * Math.PI) / 180;
  const pan = (side: -1 | 1, label: string) => { const x = r + side * (r - 40) * Math.cos(rad), y = 120 + side * (r - 40) * Math.sin(rad); return <g><line x1={x} y1={y} x2={x - 70} y2={y + 150} stroke={theme.ink} strokeWidth={3} /><line x1={x} y1={y} x2={x + 70} y2={y + 150} stroke={theme.ink} strokeWidth={3} /><path d={`M${x - 100} ${y + 150} Q${x} ${y + 210} ${x + 100} ${y + 150} Z`} fill={side < 0 ? theme.accent : theme.accent2} /><text x={x} y={y + 250} textAnchor="middle" fontSize={34} fontWeight={800} fill={theme.ink} fontFamily={family(theme.font)}>{label}</text></g>; };
  return (
    <svg width={size} height={520} style={{ overflow: "visible" }}>
      <rect x={r - 12} y={120} width={24} height={330} fill={theme.ink} /><rect x={r - 110} y={440} width={220} height={26} rx={10} fill={theme.ink} />
      <line x1={r - (r - 40) * Math.cos(rad)} y1={120 - (r - 40) * Math.sin(rad)} x2={r + (r - 40) * Math.cos(rad)} y2={120 + (r - 40) * Math.sin(rad)} stroke={theme.ink} strokeWidth={14} strokeLinecap="round" />
      <SvgPart name="pivot" x={r - 20} y={100} w={40} h={40}><circle cx={r} cy={120} r={20} fill={theme.accent} /></SvgPart>
      {pan(-1, left)}{pan(1, right)}
    </svg>
  );
}
export const BalanceScale = block("BalanceScale", BalanceScaleView);
/** a receipt prints out line by line, then the total */
function ReceiptView({ title = "RECEIPT", lines, total, at = 0, w = 460 }: { title?: string; lines: [string, string][]; total: string; at?: number; w?: number }) {
  const { t } = useScene();
  const n = clamp01((t - at) / (0.25 * (lines.length + 2))) * (lines.length + 2);
  const shown = Math.floor(n);
  return (
    <div style={{ width: w, overflow: "hidden", fontFamily: "monospace", filter: "drop-shadow(0 12px 18px rgb(0 0 0/0.25))" }}>
      <div style={{ background: "#fbfaf6", padding: "26px 30px", transform: `translateY(${-(lines.length + 2 - n) * 6}px)`, clipPath: "polygon(0 0,100% 0,100% calc(100% - 12px),95% 100%,90% calc(100% - 12px),85% 100%,80% calc(100% - 12px),75% 100%,70% calc(100% - 12px),65% 100%,60% calc(100% - 12px),55% 100%,50% calc(100% - 12px),45% 100%,40% calc(100% - 12px),35% 100%,30% calc(100% - 12px),25% 100%,20% calc(100% - 12px),15% 100%,10% calc(100% - 12px),5% 100%,0 calc(100% - 12px))" }}>
        <div style={{ textAlign: "center", fontSize: 34, fontWeight: 800, letterSpacing: 4, color: "#222" }}>{title}</div>
        <div style={{ borderTop: "3px dashed #999", margin: "14px 0" }} />
        {lines.map(([a, b], i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#333", opacity: i < shown ? 1 : 0, height: 40 }}><span>{a}</span><span>{b}</span></div>)}
        <div style={{ borderTop: "3px dashed #999", margin: "14px 0", opacity: shown > lines.length ? 1 : 0 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 800, color: "#111", opacity: shown > lines.length + 1 ? 1 : 0, paddingBottom: 18 }}><span>TOTAL</span><span>{total}</span></div>
      </div>
    </div>
  );
}
export const Receipt = block("Receipt", ReceiptView);
/** a bank card slides in, turns a little in 3D and catches the light */
function BankCardView({ name = "R KUMAR", bank = "NATIONAL BANK", last = "4821", at = 0, w = 560 }: { name?: string; bank?: string; last?: string; at?: number; w?: number }) {
  const { t, theme, u } = useIn(at, 0.9);
  const shine = ((t - at) * 0.5) % 1.4;
  return (
    <div style={{ width: w, height: w * 0.63, borderRadius: 30, background: `linear-gradient(135deg, ${theme.ink}, ${theme.accent2})`, color: "#fff", padding: 36, boxSizing: "border-box", position: "relative", overflow: "hidden", fontFamily: family("space_grotesk"), transform: `perspective(1400px) rotateY(${(1 - u) * -50 + Math.sin(t * 0.8) * 6}deg) rotateX(${Math.cos(t * 0.6) * 4}deg) translateX(${(1 - u) * -300}px)`, opacity: u, boxShadow: "0 30px 60px rgb(0 0 0/0.35)" }}>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>{bank}</div>
      <Part name="chip"><div style={{ width: 86, height: 64, borderRadius: 12, background: "linear-gradient(135deg,#f7d98b,#c9a14a)", marginTop: 36 }} /></Part>
      <div style={{ fontSize: 40, letterSpacing: 6, marginTop: 30 }}>•••• •••• •••• {last}</div>
      <div style={{ fontSize: 26, marginTop: 18, opacity: 0.85 }}>{name}</div>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(115deg, transparent ${shine * 100 - 30}%, rgb(255 255 255/0.35) ${shine * 100 - 15}%, transparent ${shine * 100}%)` }} />
    </div>
  );
}
export const BankCard = block("BankCard", BankCardView);
/** one long bar split into parts (a portfolio, a budget) whose parts slide in and get their labels */
export function Allocation({ parts, w = 1200, at = 0 }: { parts: { label: string; value: number; color?: string }[]; w?: number; at?: number }) {
  const { t, theme } = useScene();
  const tot = parts.reduce((a, p) => a + p.value, 0), palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8"];
  return (
    <div style={{ width: w, fontFamily: family(theme.font) }}>
      <div style={{ display: "flex", height: 110, borderRadius: 18, overflow: "hidden", boxShadow: shadow }}>
        {parts.map((p, i) => { const k = ease.out(clamp01((t - at - i * 0.2) / 0.6)); return <div key={i} style={{ width: `${(p.value / tot) * 100 * k}%`, background: p.color ?? palette[i % palette.length], color: "#fff", fontWeight: 800, fontSize: 36, display: "grid", placeItems: "center", overflow: "hidden" }}>{Math.round((p.value / tot) * 100)}%</div>; })}
      </div>
      <div style={{ display: "flex", marginTop: 16 }}>{parts.map((p, i) => <div key={i} style={{ width: `${(p.value / tot) * 100}%`, fontSize: 28, fontWeight: 700, color: theme.ink, opacity: clamp01((t - at - 0.4 - i * 0.2) / 0.4) }}>{p.label}</div>)}</div>
    </div>
  );
}
/** a shopping basket: as the year moves on, the same money buys fewer things (inflation) */
function InflationBasketView({ items = ["🍚", "🥛", "🧅", "🍞", "🥚", "🍅", "🧈", "🍌"], years = ["2015", "2020", "2025"], at = 0, per = 1.6 }: { items?: string[]; years?: string[]; at?: number; per?: number }) {
  const { t, theme } = useScene();
  const step = clamp01((t - at) / (per * (years.length - 1))) * (years.length - 1);
  const keep = items.length - Math.round(step * (items.length / (years.length + 1)));
  return (
    <div style={{ textAlign: "center", fontFamily: family(theme.display) }}>
      <div style={{ fontSize: 60, fontWeight: 800, color: theme.ink }}>₹1,000 in {years[Math.round(step)]}</div>
      <div style={{ display: "flex", flexWrap: "wrap", width: 640, justifyContent: "center", gap: 10, margin: "20px auto", minHeight: 260 }}>
        {items.map((e, i) => <Part name="item" key={i} item={e} i={i}><div style={{ fontSize: 100, opacity: i < keep ? 1 : 0.1, transform: `scale(${i < keep ? 1 : 0.6}) translateY(${i < keep ? 0 : 40}px)`, filter: i < keep ? undefined : "grayscale(1)" }}>{e}</div></Part>)}
      </div>
      <svg width={640} height={90}><path d="M30 10 L610 10 L560 85 L80 85 Z" fill={theme.accent} /></svg>
    </div>
  );
}
export const InflationBasket = block("InflationBasket", InflationBasketView);
export const _blockStyle: CSSProperties = {};
