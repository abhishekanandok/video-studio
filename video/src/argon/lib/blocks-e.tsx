/* LAYER 2, part E: more BLOCKS for DATA, FINANCE and MAPS.
   Data charts a documentary needs beyond bars and lines (waterfall, treemap, radar, histogram, population pyramid, slope,
   bump, Gantt, word cloud, icon rows, progress ring, butterfly bars); money things an Indian viewer knows (EMI table,
   credit score, tax slabs, salary slip, invoice, cheque, UPI payment, crypto coin, house price); and maps that are not
   the world map (metro lines, a city grid, a floor plan, terrain, a weather map, a raised 3D map, an old map, a ruler). */

import { useMemo, type ReactNode } from "react";
import { clamp01, family, useScene } from "../kit";
import { curve, ease, rand } from "./motion";
import { shadow, useIn } from "./blocks-a";
import { useMapView, COUNTRIES, MapBase, MapCtx, makeMap, type MapView } from "./blocks-b";
import { Background, Part, SvgPart, block } from "./parts";
import { slot } from "./slots";

const num = (v: number, d = 0) => v.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
const usePalette = () => { const { theme } = useScene(); return [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8", "var(--good, #3fb35a)", "#e06a8a", "#4ac0c0"]; };

/* ================= DATA ================= */
/** a waterfall: a start value, rises and falls stepping across, to the end total (a profit and loss, a budget gap) */
function WaterfallView({ steps, w = 1400, h = 600, at = 0, per = 0.35, unit = "" }: { steps: { label: string; value: number; total?: boolean }[]; w?: number; h?: number; at?: number; per?: number; unit?: string }) {
  const { t, theme } = useScene();
  let run = 0;
  const bars = steps.map((s) => { const from = s.total ? 0 : run, to = s.total ? s.value : run + s.value; run = s.total ? s.value : to; return { ...s, from, to }; });
  const max = Math.max(...bars.map((b) => Math.max(b.from, b.to))), min = Math.min(0, ...bars.map((b) => Math.min(b.from, b.to)));
  const y = (v: number) => h - ((v - min) / (max - min || 1)) * h, bw = w / steps.length;
  return (
    <div style={{ position: "relative", width: w, height: h + 70, fontFamily: family(theme.font) }}>
      {bars.map((b, i) => {
        const k = ease.out(clamp01((t - at - i * per) / 0.5)), top = Math.min(y(b.from), y(b.from + (b.to - b.from) * k)), hh = Math.abs(y(b.from + (b.to - b.from) * k) - y(b.from));
        const col = b.total ? theme.accent2 : b.value >= 0 ? "var(--good, #3fb35a)" : "var(--bad, #e0453a)";
        return <div key={i}>
          {i > 0 && <div style={{ position: "absolute", left: (i - 1) * bw + bw * 0.85, top: y(b.from), width: bw * 0.3, borderTop: "3px dashed color-mix(in srgb, var(--metal, #8a939d) 85%, #fff)", opacity: k }} />}
          <div style={{ position: "absolute", left: i * bw + bw * 0.15, width: bw * 0.7, top, height: Math.max(2, hh), background: col, borderRadius: 6 , overflow: "hidden" }}><Part name="bar" item={b} i={i}>{null}</Part></div>
          <div style={{ position: "absolute", left: i * bw, width: bw, top: top - 44, textAlign: "center", fontSize: 30, fontWeight: 800, color: theme.ink, opacity: k }}>{b.total ? "" : b.value >= 0 ? "+" : ""}{num(b.value)}{unit}</div>
          <div style={{ position: "absolute", left: i * bw, width: bw, top: h + 14, textAlign: "center", fontSize: 26, color: theme.muted }}>{b.label}</div>
        </div>;
      })}
    </div>
  );
}
export const Waterfall = block("Waterfall", WaterfallView);
/** a treemap: one rectangle split into blocks sized by value (a market by company, a budget by ministry) */
function TreemapView({ items, w = 1300, h = 720, at = 0 }: { items: { label: string; value: number; color?: string }[]; w?: number; h?: number; at?: number }) {
  const { t, theme } = useScene();
  const pal = usePalette();
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rects: { x: number; y: number; w: number; h: number; it: (typeof items)[0]; i: number }[] = [];
  const split = (list: typeof sorted, x: number, y: number, ww: number, hh: number, start: number) => {
    if (!list.length) return;
    if (list.length === 1) { rects.push({ x, y, w: ww, h: hh, it: list[0], i: start }); return; }
    const tot = list.reduce((a, b) => a + b.value, 0);
    let acc = 0, cut = 0;
    while (cut < list.length - 1 && acc + list[cut].value < tot / 2) acc += list[cut++].value;
    if (cut === 0) { acc = list[0].value; cut = 1; }
    const f = acc / tot, A = list.slice(0, cut), B = list.slice(cut);
    if (ww >= hh) { split(A, x, y, ww * f, hh, start); split(B, x + ww * f, y, ww * (1 - f), hh, start + cut); }
    else { split(A, x, y, ww, hh * f, start); split(B, x, y + hh * f, ww, hh * (1 - f), start + cut); }
  };
  split(sorted, 0, 0, w, h, 0);
  return <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.font) }}>{rects.map((r) => { const k = ease.back(clamp01((t - at - r.i * 0.12) / 0.5)); return <div key={r.i} style={{ position: "absolute", left: r.x + 4, top: r.y + 4, width: r.w - 8, height: r.h - 8, background: r.it.color ?? pal[r.i % pal.length], borderRadius: 12, transform: `scale(${k})`, color: "#fff", padding: 16, boxSizing: "border-box", fontWeight: 800, fontSize: Math.min(44, Math.sqrt(r.w * r.h) / 7), overflow: "hidden" }}><div style={{ position: "absolute", inset: 0 }}><Part name="tile" item={r.it} i={r.i}>{null}</Part></div><span style={{ position: "relative" }}>{r.it.label}</span><div style={{ fontSize: "0.7em", opacity: 0.85 }}>{num(r.it.value)}</div></div>; })}</div>;
}
export const Treemap = block("Treemap", TreemapView);
/** a radar (spider) chart: several qualities on spokes, one or two shapes grow out to their scores (a player, a phone) */
function RadarChartView({ axes, series, size = 620, at = 0, max = 10 }: { axes: string[]; series: { label: string; values: number[]; color?: string }[]; size?: number; at?: number; max?: number }) {
  const { t, theme } = useScene();
  const pal = usePalette(), r = size * 0.36, c = size / 2, n = axes.length;
  const pt = (i: number, v: number) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v]; };
  return (
    <svg width={size} height={size} style={{ overflow: "visible", fontFamily: family(theme.font) }}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={axes.map((_, i) => pt(i, f).join(",")).join(" ")} fill="none" stroke="#c5cad0" strokeWidth={2} />)}
      {axes.map((a, i) => { const [x, y] = pt(i, 1.18); return <g key={a}><line x1={c} y1={c} x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} stroke="#c5cad0" strokeWidth={2} /><text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={26} fontWeight={700} fill={theme.ink}>{a}</text></g>; })}
      {series.map((s, j) => { const k = ease.out(clamp01((t - at - j * 0.4) / 0.9)), col = s.color ?? pal[j % pal.length]; return <polygon key={j} points={s.values.map((v, i) => pt(i, (v / max) * k).join(",")).join(" ")} fill={col} fillOpacity={0.3} stroke={col} strokeWidth={5} strokeLinejoin="round" />; })}
    </svg>
  );
}
export const RadarChart = block("RadarChart", RadarChartView);
/** a histogram: values counted into ranges, bars rise (marks in an exam, incomes, ages) */
function HistogramView({ values, bins = 10, w = 1300, h = 560, at = 0, label }: { values: number[]; bins?: number; w?: number; h?: number; at?: number; label?: string }) {
  const { t, theme } = useScene();
  const lo = Math.min(...values), hi = Math.max(...values), step = (hi - lo) / bins || 1;
  const counts = Array.from({ length: bins }, (_, i) => values.filter((v) => v >= lo + i * step && (i === bins - 1 ? v <= hi : v < lo + (i + 1) * step)).length), top = Math.max(...counts);
  return (
    <div style={{ position: "relative", width: w, height: h + 70, fontFamily: family(theme.font) }}>
      {counts.map((c, i) => { const k = ease.out(clamp01((t - at - i * 0.06) / 0.6)); return <div key={i} style={{ position: "absolute", left: (i / bins) * w + 2, bottom: 70, width: w / bins - 4, height: (c / top) * h * k, background: theme.accent, borderRadius: "6px 6px 0 0" , overflow: "hidden" }}><Part name="bar" item={{ count: c }} i={i}>{null}</Part></div>; })}
      {Array.from({ length: bins + 1 }, (_, i) => i % 2 === 0 && <div key={i} style={{ position: "absolute", left: (i / bins) * w - 40, width: 80, bottom: 30, textAlign: "center", fontSize: 24, color: theme.muted }}>{num(lo + i * step)}</div>)}
      {label && <div style={{ position: "absolute", left: 0, right: 0, bottom: -10, textAlign: "center", fontSize: 28, color: theme.ink, fontWeight: 700 }}>{label}</div>}
    </div>
  );
}
export const Histogram = block("Histogram", HistogramView);
/** a population pyramid: men on the left, women on the right, by age band; it can morph from one year to another */
function PopulationPyramidView({ bands, years, w = 1100, at = 0, per = 2 }: { bands: string[]; years: { label: string; men: number[]; women: number[] }[]; w?: number; at?: number; per?: number }) {
  const { t, theme } = useScene();
  const n = clamp01((t - at - 0.6) / (per * Math.max(1, years.length - 1))) * (years.length - 1), i0 = Math.floor(n), i1 = Math.min(years.length - 1, i0 + 1), f = ease.inOut(n - i0);
  const grow = ease.out(clamp01((t - at) / 0.8));
  const max = Math.max(...years.flatMap((y) => [...y.men, ...y.women])), half = w / 2 - 90, rowH = 46;
  const val = (key: "men" | "women", j: number) => (years[i0][key][j] + (years[i1][key][j] - years[i0][key][j]) * f) * grow;
  return (
    <div style={{ position: "relative", width: w, height: bands.length * rowH + 80, fontFamily: family(theme.font) }}>
      {[...bands].reverse().map((b, jr) => { const j = bands.length - 1 - jr; return <div key={b} style={{ position: "absolute", top: jr * rowH, left: 0, width: w, height: rowH - 6 }}>
        <div style={{ position: "absolute", right: w / 2 + 50, width: (val("men", j) / max) * half, height: "100%", background: "#4a8ae0", borderRadius: "6px 0 0 6px" }} />
        <div style={{ position: "absolute", left: w / 2 - 50, width: 100, textAlign: "center", fontSize: 22, lineHeight: `${rowH - 6}px`, color: theme.muted }}>{b}</div>
        <div style={{ position: "absolute", left: w / 2 + 50, width: (val("women", j) / max) * half, height: "100%", background: "#e06a8a", borderRadius: "0 6px 6px 0" }} />
      </div>; })}
      <div style={{ position: "absolute", top: bands.length * rowH + 10, left: 0, right: 0, display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 800 }}><span style={{ color: "#4a8ae0" }}>Men</span><span style={{ color: theme.ink, fontFamily: family(theme.display), fontSize: 46 }}>{years[f > 0.5 ? i1 : i0].label}</span><span style={{ color: "#e06a8a" }}>Women</span></div>
    </div>
  );
}
export const PopulationPyramid = block("PopulationPyramid", PopulationPyramidView);
/** a slope chart: each thing's value then and now joined by a line (who rose, who fell between two years) */
function SlopeChartView({ items, left = "Then", right = "Now", w = 900, h = 620, at = 0 }: { items: { label: string; a: number; b: number }[]; left?: string; right?: string; w?: number; h?: number; at?: number }) {
  const { t, theme } = useScene();
  const vals = items.flatMap((i) => [i.a, i.b]), lo = Math.min(...vals), hi = Math.max(...vals), y = (v: number) => 60 + (1 - (v - lo) / (hi - lo || 1)) * (h - 120);
  const x0 = 220, x1 = w - 220;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", fontFamily: family(theme.font) }}>
      <text x={x0} y={24} textAnchor="middle" fontSize={34} fontWeight={800} fill={theme.ink}>{left}</text><text x={x1} y={24} textAnchor="middle" fontSize={34} fontWeight={800} fill={theme.ink}>{right}</text>
      {items.map((it, i) => { const k = ease.inOut(clamp01((t - at - i * 0.2) / 0.8)), col = it.b >= it.a ? "var(--good, #3fb35a)" : "var(--bad, #e0453a)"; return <g key={i}>
        <line x1={x0} y1={y(it.a)} x2={x0 + (x1 - x0) * k} y2={y(it.a) + (y(it.b) - y(it.a)) * k} stroke={col} strokeWidth={6} strokeLinecap="round" />
        <circle cx={x0} cy={y(it.a)} r={10} fill={col} /><circle cx={x0 + (x1 - x0) * k} cy={y(it.a) + (y(it.b) - y(it.a)) * k} r={10} fill={col} />
        <text x={x0 - 24} y={y(it.a) + 9} textAnchor="end" fontSize={26} fill={theme.ink}>{it.label} {num(it.a)}</text>
        <text x={x1 + 24} y={y(it.b) + 9} fontSize={26} fill={theme.ink} opacity={k}>{num(it.b)} {it.label}</text>
      </g>; })}
    </svg>
  );
}
export const SlopeChart = block("SlopeChart", SlopeChartView);
/** a bump chart: ranks over several years, lines cross as places change (league tables, top economies) */
function BumpChartView({ periods, series, w = 1400, h = 620, at = 0, dur = 3 }: { periods: string[]; series: { label: string; ranks: number[]; color?: string }[]; w?: number; h?: number; at?: number; dur?: number }) {
  const { t, theme } = useScene();
  const pal = usePalette(), n = series.length, k = ease.inOut(clamp01((t - at) / dur));
  const px = (i: number) => 160 + (i / (periods.length - 1)) * (w - 360), py = (r: number) => 40 + ((r - 1) / Math.max(1, n - 1)) * (h - 100);
  return (
    <svg width={w} height={h} style={{ overflow: "visible", fontFamily: family(theme.font) }}>
      {periods.map((p, i) => <text key={p} x={px(i)} y={h} textAnchor="middle" fontSize={26} fill={theme.muted}>{p}</text>)}
      {series.map((s, j) => { const c = curve(s.ranks.map((r, i) => [px(i), py(r)] as [number, number])), col = s.color ?? pal[j % pal.length], end = c.at(k); return <g key={j}>
        <path d={c.d} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 2`} />
        <text x={px(0) - 24} y={py(s.ranks[0]) + 9} textAnchor="end" fontSize={26} fontWeight={700} fill={col}>{s.label}</text>
        <SvgPart name="marker" item={s} i={j} x={end.x - 30} y={end.y - 30} w={60} h={60}><circle cx={end.x} cy={end.y} r={14} fill={col} stroke="#fff" strokeWidth={4} /></SvgPart>
      </g>; })}
    </svg>
  );
}
export const BumpChart = block("BumpChart", BumpChartView);
/** a Gantt chart: tasks as bars across a time axis, filling in as they happen (a project plan, a war's campaigns) */
function GanttView({ tasks, periods, w = 1500, at = 0, per = 0.3 }: { tasks: { label: string; start: number; end: number; color?: string }[]; periods: string[]; w?: number; at?: number; per?: number }) {
  const { t, theme } = useScene();
  const pal = usePalette(), lw = 300, cw = (w - lw) / periods.length, rowH = 64;
  return (
    <div style={{ position: "relative", width: w, height: tasks.length * rowH + 60, fontFamily: family(theme.font) }}>
      {periods.map((p, i) => <div key={p} style={{ position: "absolute", left: lw + i * cw, top: 0, width: cw, height: "100%", borderLeft: "2px solid #e0e4e8", fontSize: 24, color: theme.muted, textAlign: "center" }}>{p}</div>)}
      {tasks.map((tk, i) => { const k = ease.out(clamp01((t - at - i * per) / 0.6)); return <div key={i} style={{ position: "absolute", top: 50 + i * rowH, left: 0, width: w, height: rowH - 14 }}>
        <div style={{ position: "absolute", left: 0, width: lw - 20, textAlign: "right", fontSize: 28, fontWeight: 700, color: theme.ink, lineHeight: `${rowH - 14}px` }}>{tk.label}</div>
        <div style={{ position: "absolute", left: lw + tk.start * cw, width: (tk.end - tk.start) * cw * k, height: "100%", borderRadius: 10, background: tk.color ?? pal[i % pal.length] , overflow: "hidden" }}><Part name="bar" item={tk} i={i}>{null}</Part></div>
      </div>; })}
    </div>
  );
}
export const Gantt = block("Gantt", GanttView);
/** a word cloud: words sized by weight pop in around the middle (what people said, the themes of a speech) */
function WordCloudView({ words, w = 1400, h = 700, at = 0 }: { words: { text: string; weight: number }[]; w?: number; h?: number; at?: number }) {
  const { t, theme } = useScene();
  const pal = usePalette(), max = Math.max(...words.map((x) => x.weight));
  const sorted = [...words].sort((a, b) => b.weight - a.weight);
  const placed: { x: number; y: number; bw: number; bh: number }[] = [];
  const spots = sorted.map((x) => {
    const size = 34 + (x.weight / max) * 110, bw = x.text.length * size * 0.56 + 16, bh = size * 1.05;
    for (let i = 0; i < 1500; i++) {
      const a = i * 0.35, r = i * 1.6, cx = w / 2 + Math.cos(a) * r * 1.6, cy = h / 2 + Math.sin(a) * r * 0.8;
      if (cx - bw / 2 < 0 || cx + bw / 2 > w || cy - bh / 2 < 0 || cy + bh / 2 > h) continue;
      if (placed.every((p) => Math.abs(p.x - cx) * 2 > p.bw + bw || Math.abs(p.y - cy) * 2 > p.bh + bh)) { placed.push({ x: cx, y: cy, bw, bh }); return { x: cx, y: cy, size }; }
    }
    return null;
  });
  return <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.display) }}>{sorted.map((x, i) => {
    const p = spots[i]; if (!p) return null;
    const k = ease.back(clamp01((t - at - i * 0.08) / 0.4));
    return <div key={i} style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%,-50%) scale(${k})`, fontSize: p.size, fontWeight: 800, lineHeight: 1, color: pal[i % pal.length], whiteSpace: "nowrap" }}><Part name="word" item={x} i={i}>{x.text}</Part></div>;
  })}</div>;
}
export const WordCloud = block("WordCloud", WordCloudView);
/** icon rows (isotype): one icon stands for N; rows fill so amounts compare at a glance (people, trees, cars) */
function IconRowsView({ rows, icon = "🧍", per = 1, w = 1400, at = 0, size = 60 }: { rows: { label: string; value: number; icon?: string }[]; icon?: string; per?: number; w?: number; at?: number; size?: number }) {
  const { t, theme } = useScene();
  return <div style={{ width: w, fontFamily: family(theme.font) }}>{rows.map((r, j) => {
    const n = Math.round(r.value / per);
    return <div key={j} style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
      <div style={{ width: 260, fontSize: 32, fontWeight: 700, color: theme.ink }}>{r.label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>{Array.from({ length: n }, (_, i) => <span key={i} style={{ fontSize: size, lineHeight: 1, transform: `scale(${ease.back(clamp01((t - at - j * 0.3 - i * 0.04) / 0.3))})` }}><Part name="icon" item={r} i={i}>{slot(r.icon ?? icon, r.icon ?? icon, { width: size, height: size }, "contain")}</Part></span>)}</div>
    </div>;
  })}{per > 1 && <div style={{ fontSize: 24, color: theme.muted, marginTop: 8 }}>{icon} = {num(per)}</div>}</div>;
}
export const IconRows = block("IconRows", IconRowsView);
/** a ring that fills round to a percentage with the number in the middle (a goal reached, a share, a battery) */
function ProgressRingView({ value, size = 360, at = 0, dur = 1.6, label, color }: { value: number; size?: number; at?: number; dur?: number; label?: string; color?: string }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / dur)) * value, r = size / 2 - 24;
  return (
    <div style={{ position: "relative", width: size, height: size, fontFamily: family(theme.display) }}>
      <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(0 0 0/0.08)" strokeWidth={36} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? theme.accent} strokeWidth={36} strokeLinecap="round" pathLength={100} strokeDasharray={`${k} 200`} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg>
      <div style={{ position: "absolute", inset: size * 0.18, display: "grid", placeItems: "center", textAlign: "center", borderRadius: "50%", overflow: "hidden" }}><Part name="center" item={k} fit="cover">{null}</Part></div><div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}><div><div style={{ fontSize: size * 0.24, fontWeight: 800, color: theme.ink }}>{Math.round(k)}%</div>{label && <div style={{ fontSize: size * 0.08, color: theme.muted }}>{label}</div>}</div></div>
    </div>
  );
}
export const ProgressRing = block("ProgressRing", ProgressRingView);
/** butterfly bars: two groups compared side by side on each row, bars going left and right (men vs women, 2010 vs 2020) */
function ButterflyBarsView({ rows, left, right, w = 1300, at = 0 }: { rows: { label: string; a: number; b: number }[]; left: string; right: string; w?: number; at?: number }) {
  const { t, theme } = useScene();
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b])), half = w / 2 - 130;
  return (
    <div style={{ width: w, fontFamily: family(theme.font) }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, fontWeight: 800, marginBottom: 16 }}><span style={{ color: theme.accent }}>{left}</span><span style={{ color: theme.accent2 }}>{right}</span></div>
      {rows.map((r, i) => { const k = ease.out(clamp01((t - at - i * 0.15) / 0.6)); return <div key={i} style={{ position: "relative", height: 60, marginBottom: 12 }}>
        <div style={{ position: "absolute", right: w / 2 + 130, width: (r.a / max) * half * k, height: "100%", background: theme.accent, borderRadius: "10px 0 0 10px", color: "#fff", fontWeight: 800, fontSize: 26, display: "flex", alignItems: "center", paddingLeft: 12, boxSizing: "border-box", overflow: "hidden" }}><div style={{ position: "absolute", inset: 0 }}><Part name="barA" item={r} i={i}>{null}</Part></div><span style={{ position: "relative" }}>{k > 0.6 ? num(r.a) : ""}</span></div>
        <div style={{ position: "absolute", left: w / 2 - 130, width: 260, textAlign: "center", lineHeight: "60px", fontSize: 28, fontWeight: 700, color: theme.ink }}>{r.label}</div>
        <div style={{ position: "absolute", left: w / 2 + 130, width: (r.b / max) * half * k, height: "100%", background: theme.accent2, borderRadius: "0 10px 10px 0", color: "#fff", fontWeight: 800, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, boxSizing: "border-box", overflow: "hidden" }}><div style={{ position: "absolute", inset: 0 }}><Part name="barB" item={r} i={i}>{null}</Part></div><span style={{ position: "relative" }}>{k > 0.6 ? num(r.b) : ""}</span></div>
      </div>; })}
    </div>
  );
}
export const ButterflyBars = block("ButterflyBars", ButterflyBarsView);

/* ================= FINANCE ================= */
/** an EMI table: a loan's monthly payment worked out, with rows of interest and principal paid down (how a loan works) */
function EmiTableView({ principal, rate, years, at = 0, rows = 6 }: { principal: number; rate: number; years: number; at?: number; rows?: number }) {
  const { t, theme } = useScene();
  const r = rate / 12 / 100, n = years * 12, emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const yearly: { y: number; interest: number; principal: number; left: number }[] = [];
  let bal = principal;
  for (let y = 1; y <= years; y++) { let i = 0, p = 0; for (let m = 0; m < 12; m++) { const im = bal * r; i += im; p += emi - im; bal -= emi - im; } yearly.push({ y, interest: i, principal: p, left: Math.max(0, bal) }); }
  const shown = yearly.length > rows ? [...yearly.slice(0, rows - 1), yearly[yearly.length - 1]] : yearly;
  const cell = { padding: "12px 20px", fontSize: 28, textAlign: "right" as const };
  return (
    <div style={{ background: theme.paper ?? "#fff", borderRadius: 20, padding: 30, boxShadow: shadow, fontFamily: family(theme.font), color: theme.ink }}>
      <div style={{ fontFamily: family(theme.display), fontSize: 42, fontWeight: 800 }}>EMI ₹{num(Math.round(emi))} <span style={{ fontSize: 26, color: theme.muted, fontWeight: 400 }}>for ₹{num(principal)} at {rate}% · {years} yrs</span></div>
      <table style={{ borderCollapse: "collapse", marginTop: 16 }}><thead><tr style={{ color: theme.muted }}>{["Year", "Interest", "Principal", "Still owed"].map((h) => <th key={h} style={{ ...cell, fontSize: 24 }}>{h}</th>)}</tr></thead><tbody>{shown.map((row, i) => { const k = clamp01((t - at - 0.5 - i * 0.3) / 0.3); return <tr key={row.y} style={{ opacity: k, transform: `translateX(${(1 - k) * 40}px)`, borderTop: "2px solid #eef0f3" }}><td style={cell}>{row.y}</td><td style={{ ...cell, color: "var(--bad, #e0453a)" }}>₹{num(Math.round(row.interest))}</td><td style={{ ...cell, color: "var(--good, #3fb35a)" }}>₹{num(Math.round(row.principal))}</td><td style={{ ...cell, fontWeight: 800 }}>₹{num(Math.round(row.left))}</td></tr>; })}</tbody></table>
    </div>
  );
}
export const EmiTable = block("EmiTable", EmiTableView);
/** a credit score meter: a needle swings to the score on red-to-green bands (a CIBIL score) */
function CreditScoreView({ score, size = 600, at = 0, lo = 300, hi = 900 }: { score: number; size?: number; at?: number; lo?: number; hi?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / 1.6)), v = lo + (score - lo) * k, a = Math.PI * (1 - (v - lo) / (hi - lo)), r = size * 0.4, c = size / 2;
  const bands = ["var(--bad, #e0453a)", "#f08a1c", "color-mix(in srgb, var(--warn, #f0b43a) 97%, #fff)", "#9bd35a", "var(--good, #3fb35a)"];
  const arc = (f0: number, f1: number) => { const a0 = Math.PI * (1 - f0), a1 = Math.PI * (1 - f1); return `M${c + Math.cos(a0) * r} ${c - Math.sin(a0) * r} A${r} ${r} 0 0 1 ${c + Math.cos(a1) * r} ${c - Math.sin(a1) * r}`; };
  const word = v < 550 ? "Poor" : v < 650 ? "Fair" : v < 750 ? "Good" : "Excellent";
  return (
    <svg width={size} height={size * 0.72} style={{ overflow: "visible", fontFamily: family(theme.display) }}>
      {bands.map((b, i) => <path key={i} d={arc(i / 5 + 0.005, (i + 1) / 5 - 0.005)} fill="none" stroke={b} strokeWidth={46} />)}
      <line x1={c} y1={c} x2={c + Math.cos(a) * r * 0.85} y2={c - Math.sin(a) * r * 0.85} stroke={theme.ink} strokeWidth={12} strokeLinecap="round" /><circle cx={c} cy={c} r={22} fill={theme.ink} />
      <text x={c} y={c + 100} textAnchor="middle" fontSize={size * 0.15} fontWeight={800} fill={theme.ink}>{Math.round(v)}</text>
      <text x={c} y={c + 150} textAnchor="middle" fontSize={size * 0.06} fill={theme.muted}>{word}</text>
    </svg>
  );
}
export const CreditScore = block("CreditScore", CreditScoreView);
/** income tax slabs: steps of income with their rate, the viewer's income fills them and the tax adds up */
function TaxSlabsView({ slabs, income, at = 0, w = 1400 }: { slabs: { upto: number | null; rate: number }[]; income: number; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / 2.5)), fill = income * k;
  let prev = 0, tax = 0;
  const parts = slabs.map((s) => { const top = s.upto ?? Math.max(income, prev * 1.5), inSlab = Math.max(0, Math.min(fill, top) - prev); tax += (inSlab * s.rate) / 100; const p = { from: prev, to: top, rate: s.rate, inSlab }; prev = top; return p; });
  const total = parts[parts.length - 1].to;
  return (
    <div style={{ width: w, fontFamily: family(theme.font), color: theme.ink }}>
      <div style={{ display: "flex", height: 130, borderRadius: 16, overflow: "hidden", boxShadow: shadow }}>{parts.map((p, i) => <div key={i} style={{ position: "relative", width: `${((p.to - p.from) / total) * 100}%`, background: "#eef0f3", borderRight: "3px solid #fff" }}>
        <div style={{ position: "absolute", inset: 0, width: `${(p.inSlab / (p.to - p.from)) * 100}%`, background: `hsl(${120 - p.rate * 3.5} 60% 50%)` }} />
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 40, fontWeight: 800 }}>{p.rate}%</div>
      </div>)}</div>
      <div style={{ display: "flex", marginTop: 10 }}>{parts.map((p, i) => <div key={i} style={{ width: `${((p.to - p.from) / total) * 100}%`, fontSize: 22, color: theme.muted }}>₹{num(p.from / 100000, 1)}L</div>)}</div>
      <div style={{ marginTop: 24, fontFamily: family(theme.display), fontSize: 50, fontWeight: 800 }}>Income ₹{num(Math.round(fill))} → Tax ₹{num(Math.round(tax))}</div>
    </div>
  );
}
export const TaxSlabs = block("TaxSlabs", TaxSlabsView);
/** a salary slip: earnings and deductions line by line, net pay at the bottom (where your salary goes) */
function SalarySlipView({ name = "R. Kumar", month = "March 2026", earnings, deductions, at = 0, w = 760 }: { name?: string; month?: string; earnings: [string, number][]; deductions: [string, number][]; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const gross = earnings.reduce((a, e) => a + e[1], 0), ded = deductions.reduce((a, e) => a + e[1], 0);
  const line = (l: string, v: number, i: number, neg = false) => <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 28, padding: "6px 0", opacity: clamp01((t - at - 0.3 - i * 0.2) / 0.3), color: neg ? "color-mix(in srgb, var(--bad, #e0453a) 85%, #000)" : theme.ink }}><span>{l}</span><span>{neg ? "−" : ""}₹{num(v)}</span></div>;
  return (
    <div style={{ width: w, background: "#fff", borderRadius: 14, padding: "34px 40px", boxShadow: shadow, fontFamily: family("inter"), color: "#222", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #222", paddingBottom: 12 }}><b style={{ fontSize: 34 }}>PAY SLIP</b><span style={{ fontSize: 26 }}>{month}</span></div>
      <div style={{ fontSize: 26, color: "#666", margin: "10px 0 16px" }}>{name}</div>
      {earnings.map((e, i) => line(e[0], e[1], i))}
      {deductions.map((e, i) => line(e[0], e[1], earnings.length + i, true))}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, fontWeight: 800, borderTop: "3px solid #222", marginTop: 12, paddingTop: 14, opacity: clamp01((t - at - 0.4 - (earnings.length + deductions.length) * 0.2) / 0.4) }}><span>Net pay</span><span style={{ color: "color-mix(in srgb, var(--good, #3fb35a) 74%, #000)" }}>₹{num(gross - ded)}</span></div>
    </div>
  );
}
export const SalarySlip = block("SalarySlip", SalarySlipView);
/** an invoice or bill: items, quantities and prices, GST, a total and a PAID stamp */
function InvoiceView({ items, gst = 18, at = 0, paid, w = 820, from = "Sharma Traders" }: { items: { item: string; qty: number; price: number }[]; gst?: number; at?: number; paid?: number; w?: number; from?: string }) {
  const { t } = useScene();
  const sub = items.reduce((a, i) => a + i.qty * i.price, 0), tax = (sub * gst) / 100, ps = paid !== undefined ? ease.back(clamp01((t - paid) / 0.3)) : 0;
  return (
    <div style={{ position: "relative", width: w, background: "#fff", padding: "34px 40px", borderRadius: 10, boxShadow: shadow, fontFamily: "inter, Arial", color: "#222", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ fontSize: 38 }}>INVOICE</b><span style={{ fontSize: 24, color: "#666" }}>{from}</span></div>
      <div style={{ marginTop: 18 }}>{items.map((it, i) => <div key={i} style={{ display: "flex", fontSize: 28, padding: "8px 0", borderBottom: "1px solid #eee", opacity: clamp01((t - at - i * 0.2) / 0.3) }}><span style={{ flex: 1 }}>{it.item}</span><span style={{ width: 90 }}>×{it.qty}</span><span style={{ width: 160, textAlign: "right" }}>₹{num(it.qty * it.price)}</span></div>)}</div>
      <div style={{ textAlign: "right", fontSize: 26, marginTop: 12, color: "#666" }}>GST {gst}%: ₹{num(Math.round(tax))}</div>
      <div style={{ textAlign: "right", fontSize: 42, fontWeight: 800, marginTop: 6 }}>Total ₹{num(Math.round(sub + tax))}</div>
      {paid !== undefined && t > paid && <div style={{ position: "absolute", right: 60, top: 110, fontSize: 90, fontWeight: 900, color: "color-mix(in srgb, var(--good, #3fb35a) 74%, #000)", border: "10px solid color-mix(in srgb, var(--good, #3fb35a) 74%, #000)", borderRadius: 16, padding: "0 24px", transform: `rotate(-14deg) scale(${2 - ps})`, opacity: ps }}>PAID</div>}
    </div>
  );
}
export const Invoice = block("Invoice", InvoiceView);
/** a bank cheque being filled in: payee, the amount in figures and words, then a signature */
function ChequeView({ payee, amount, words, bank = "STATE BANK", at = 0, w = 1200 }: { payee: string; amount: number; words: string; bank?: string; at?: number; w?: number }) {
  const { t } = useScene();
  const type = (s: string, from: number, cps = 16) => s.slice(0, Math.floor(clamp01((t - from) * cps / Math.max(1, s.length)) * s.length));
  const hand = { fontFamily: family("caveat"), fontSize: 52, color: "#1a3a8a" };
  return (
    <div style={{ width: w, height: w * 0.45, background: "linear-gradient(135deg, #e8f1f8, #d4e6f4)", border: "3px solid #9ab8d4", borderRadius: 12, position: "relative", padding: 34, boxSizing: "border-box", fontFamily: "Arial", color: "#3a5a7a", boxShadow: shadow }}>
      <b style={{ fontSize: 34 }}>{bank}</b><span style={{ position: "absolute", right: 40, top: 34, fontSize: 24 }}>Date: 24/10/2026</span>
      <div style={{ marginTop: 30, fontSize: 26, borderBottom: "2px solid #9ab8d4" }}>Pay <span style={hand}>{type(payee, at)}</span></div>
      <div style={{ marginTop: 20, fontSize: 26, borderBottom: "2px solid #9ab8d4", width: "70%" }}>Rupees <span style={{ ...hand, fontSize: 42 }}>{type(words, at + 1)}</span></div>
      <div style={{ position: "absolute", right: 40, top: w * 0.2, border: "3px solid #9ab8d4", padding: "6px 20px", fontSize: 26, background: "#fff" }}>₹ <span style={hand}>{type(num(amount), at + 0.6)}</span></div>
      <div style={{ position: "absolute", right: 60, bottom: 40, ...hand, opacity: clamp01((t - at - 2.5) / 0.4) }}>R. Kumar</div>
      <div style={{ position: "absolute", left: 34, bottom: 24, fontFamily: "monospace", fontSize: 26, letterSpacing: 4, color: "#555" }}>⑈123456⑈ 000111222⑉ 08</div>
    </div>
  );
}
export const Cheque = block("Cheque", ChequeView);
/** a UPI payment on a phone screen: amount, scanning, a spinner, then the tick and "Paid" (how digital payments work) */
function UpiPaymentView({ amount, to = "Sharma General Store", at = 0, h = 760 }: { amount: number; to?: string; at?: number; h?: number }) {
  const { t, theme } = useScene();
  const s = t - at, stage = s < 1 ? 0 : s < 2.2 ? 1 : 2, k = ease.back(clamp01((s - 2.2) / 0.4));
  const w = h * 0.49;
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.14, background: "#111", padding: w * 0.035, boxSizing: "border-box", boxShadow: "0 30px 60px rgb(0 0 0/0.4)" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: w * 0.11, overflow: "hidden", background: stage === 2 ? "color-mix(in srgb, var(--good, #3fb35a) 84%, #000)" : "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: family("inter"), color: stage === 2 ? "#fff" : "#222", textAlign: "center", padding: 20 }}>
        {stage === 0 && <><div style={{ width: w * 0.6, height: w * 0.6, background: "repeating-conic-gradient(#222 0 25%, #fff 0 50%) 0 0/24px 24px", border: "10px solid #fff", outline: "4px solid #222", position: "relative" }}><div style={{ position: "absolute", inset: 0 }}><Part name="qr" fit="contain">{null}</Part></div><div style={{ position: "absolute", left: 0, right: 0, top: `${(s % 1) * 100}%`, height: 6, background: theme.accent, boxShadow: `0 0 14px ${theme.accent}` }} /></div><div style={{ fontSize: 26, marginTop: 20 }}>Scan & pay</div></>}
        {stage === 1 && <><div style={{ fontSize: 26, color: "#666" }}>Paying {to}</div><div style={{ fontSize: 70, fontWeight: 800, margin: "16px 0" }}>₹{num(amount)}</div><div style={{ width: 70, height: 70, borderRadius: 35, border: `8px solid ${theme.accent}`, borderTopColor: "transparent", transform: `rotate(${s * 400}deg)` }} /></>}
        {stage === 2 && <><div style={{ width: 140, height: 140, borderRadius: 70, background: "#fff", color: "color-mix(in srgb, var(--good, #3fb35a) 84%, #000)", fontSize: 100, display: "grid", placeItems: "center", transform: `scale(${k})` }}>✓</div><div style={{ fontSize: 44, fontWeight: 800, marginTop: 20 }}>₹{num(amount)} paid</div><div style={{ fontSize: 24, marginTop: 8, opacity: 0.85 }}>to {to}</div></>}
      </div>
    </div>
  );
}
export const UpiPayment = block("UpiPayment", UpiPaymentView);
/** a crypto coin that spins in 3D with its price ticking and jumping (bitcoin, volatility) */
function CryptoCoinView({ symbol = "₿", price = 5600000, swing = 0.12, size = 300, at = 0, color = "#f7931a" }: { symbol?: string; price?: number; swing?: number; size?: number; at?: number; color?: string }) {
  const { t, theme, b } = useIn(at, 0.5);
  const v = price * (1 + Math.sin(t * 2.1) * swing * 0.6 + Math.sin(t * 5.3) * swing * 0.4), up = Math.cos(t * 2.1) > 0;
  return (
    <div style={{ textAlign: "center", fontFamily: family(theme.display), transform: `scale(${b})` }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #ffd48a, ${color} 60%, #b8650a)`, display: "grid", placeItems: "center", fontSize: size * 0.55, color: "#fff", fontWeight: 800, transform: `rotateY(${(t * 120) % 360}deg)`, boxShadow: "0 20px 40px rgb(0 0 0/0.3), inset 0 0 0 12px rgb(255 255 255/0.25)", margin: "0 auto", overflow: "hidden" }}><Part name="coin" fit="cover">{symbol}</Part></div>
      <div style={{ fontSize: 60, fontWeight: 800, color: up ? "var(--good, #3fb35a)" : "var(--bad, #e0453a)", marginTop: 20 }}>₹{num(Math.round(v))} {up ? "▲" : "▼"}</div>
    </div>
  );
}
export const CryptoCoin = block("CryptoCoin", CryptoCoinView);
/** a house with a price tag that climbs year by year (property prices, rent, a home loan) */
function HousePriceView({ points, at = 0, per = 0.9, size = 420 }: { points: { year: string; price: number }[]; at?: number; per?: number; size?: number }) {
  const { t, theme } = useScene();
  const n = clamp01((t - at) / (per * Math.max(1, points.length - 1))) * (points.length - 1), i = Math.floor(n), f = n - i;
  const v = points[i].price + ((points[Math.min(points.length - 1, i + 1)].price - points[i].price) * ease.inOut(f));
  const grow = 1 + (v / points[0].price - 1) * 0.08;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, fontFamily: family(theme.display) }}>
      <div style={{ width: size, height: size, transform: `scale(${Math.min(1.5, grow)})`, transformOrigin: "50% 100%" }}><Part name="house" fit="contain"><svg width={size} height={size} viewBox="0 0 100 100"><path d="M8 48 L50 10 L92 48 Z" fill="var(--roof, #b5332a)" /><rect x={18} y={48} width={64} height={48} fill="#f4e3c3" /><rect x={44} y={66} width={14} height={30} fill="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" /><rect x={24} y={56} width={14} height={12} fill="color-mix(in srgb, var(--glass, #cfe6f5) 87%, #000)" /><rect x={62} y={56} width={14} height={12} fill="color-mix(in srgb, var(--glass, #cfe6f5) 87%, #000)" /></svg></Part></div>
      <div style={{ position: "relative", background: theme.accent, color: "#fff", padding: "20px 40px 20px 60px", fontSize: 70, fontWeight: 800, clipPath: "polygon(12% 0, 100% 0, 100% 100%, 12% 100%, 0 50%)" }}>₹{num(v / 100000, 1)}L<div style={{ fontSize: 30, opacity: 0.85 }}>{points[Math.round(n)].year}</div></div>
    </div>
  );
}
export const HousePrice = block("HousePrice", HousePriceView);

/* ================= MAPS that are not the world map ================= */
/** a metro or rail map: coloured lines with stations, a train dot travels a line (routes, a network, a journey) */
function MetroMapView({ lines, at = 0, dur = 2, ride }: { lines: { name: string; color: string; stops: { name: string; x: number; y: number }[] }[]; at?: number; dur?: number; ride?: number }) {
  const { t, theme } = useScene();
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", fontFamily: family(theme.font) }} width="100%" height="100%">
      {lines.map((l, j) => { const d = "M" + l.stops.map((s) => `${s.x} ${s.y}`).join(" L"), k = ease.inOut(clamp01((t - at - j * 0.4) / dur)); return <g key={l.name}>
        <path d={d} fill="none" stroke={l.color} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 2`} />
        {l.stops.map((s, i) => { const show = k >= i / Math.max(1, l.stops.length - 1) - 0.01; return show && <g key={i}><SvgPart name="station" item={{ ...s, line: l.name }} i={i} x={s.x - 26} y={s.y - 26} w={52} h={52}><circle cx={s.x} cy={s.y} r={18} fill="#fff" stroke={l.color} strokeWidth={8} /></SvgPart><text x={s.x + 26} y={s.y - 22} fontSize={26} fontWeight={700} fill={theme.ink}>{s.name}</text></g>; })}
      </g>; })}
      {ride !== undefined && lines[0] && (() => { const pts = lines[0].stops.map((s) => [s.x, s.y] as [number, number]); const k = ease.inOut(clamp01((t - ride) / 3)); const seg = k * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(seg)), f = seg - i; const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f; return <circle cx={x} cy={y} r={16} fill={theme.ink} stroke="#fff" strokeWidth={6} />; })()}
    </svg>
  );
}
export const MetroMap = block("MetroMap", MetroMapView);
/** a city street grid from above: blocks, roads, a park and a river; a route can be drawn through it */
function CityMapView({ w = 1600, h = 900, at = 0, route, seed = 3 }: { w?: number; h?: number; at?: number; route?: [number, number][]; seed?: number }) {
  const { t, theme } = useScene();
  const cols = 10, rows = 6, bw = w / cols, bh = h / rows, k = ease.inOut(clamp01((t - at - 0.5) / 2.5));
  const c = route ? curve(route) : null;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: 18 }}>
      <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "#d8d4cc" }} /></Part><Background />
      <Part name="blocks" still>{Array.from({ length: cols * rows }, (_, i) => { const c2 = i % cols, r = Math.floor(i / cols), park = rand(i + seed) > 0.88; return <div key={i} style={{ position: "absolute", left: c2 * bw + 14, top: r * bh + 14, width: bw - 28, height: bh - 28, borderRadius: 8, background: park ? "color-mix(in srgb, var(--grass, #5a9a3a) 62%, #fff)" : "color-mix(in srgb, var(--wall, #e8e4dc) 55%, #fff)", boxShadow: "inset 0 -6px 0 rgb(0 0 0/0.06)" }} />; })}</Part>
      <Part name="river" still><div style={{ position: "absolute", left: 0, right: 0, top: h * 0.62, height: 60, background: "color-mix(in srgb, var(--water, #2a7fb8) 60%, #fff)", transform: "rotate(-6deg)" }} /></Part>
      {c && <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}><path d={c.d} fill="none" stroke={theme.accent} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 2`} />{k > 0 && <SvgPart name="marker" x={c.at(k).x - 30} y={c.at(k).y - 30} w={60} h={60}><circle cx={c.at(k).x} cy={c.at(k).y} r={18} fill="#fff" stroke={theme.accent} strokeWidth={8} /></SvgPart>}</svg>}
    </div>
  );
}
export const CityMap = block("CityMap", CityMapView);
/** a floor plan / blueprint: rooms drawn on in white lines on blue, with labels and a door swing */
function FloorPlanView({ rooms, w = 1300, h = 800, at = 0 }: { rooms: { name: string; x: number; y: number; w: number; h: number }[]; w?: number; h?: number; at?: number }) {
  const { t } = useScene();
  return (
    <div style={{ position: "relative", width: w, height: h, background: "#1d4e8a", backgroundImage: "linear-gradient(rgb(255 255 255/0.08) 2px, transparent 2px), linear-gradient(90deg, rgb(255 255 255/0.08) 2px, transparent 2px)", backgroundSize: "40px 40px", borderRadius: 12 }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, fontFamily: "monospace" }}>{rooms.map((r, i) => { const k = ease.inOut(clamp01((t - at - i * 0.35) / 0.8)); return <g key={i}><rect x={r.x * w} y={r.y * h} width={r.w * w} height={r.h * h} fill="none" stroke="#fff" strokeWidth={6} pathLength={1} strokeDasharray={`${k} 2`} /><text x={(r.x + r.w / 2) * w} y={(r.y + r.h / 2) * h} textAnchor="middle" fontSize={28} fill="#fff" opacity={clamp01(k * 2 - 1)}>{r.name}</text><text x={(r.x + r.w / 2) * w} y={(r.y + r.h / 2) * h + 32} textAnchor="middle" fontSize={20} fill="#b8d4f4" opacity={clamp01(k * 2 - 1)}>{Math.round(r.w * 40)}′ × {Math.round(r.h * 30)}′</text></g>; })}</svg>
    </div>
  );
}
export const FloorPlan = block("FloorPlan", FloorPlanView);
/** terrain in profile: the height of the land along a line (a mountain pass, a river valley, a trek), drawn on */
function TerrainView({ heights, labels = [], w = 1500, h = 500, at = 0, unit = "m" }: { heights: number[]; labels?: { at: number; text: string }[]; w?: number; h?: number; at?: number; unit?: string }) {
  const { t, theme } = useScene();
  const max = Math.max(...heights), k = ease.inOut(clamp01((t - at) / 2));
  const pts = heights.map((v, i) => [(i / (heights.length - 1)) * w, h - (v / max) * h * 0.9] as [number, number]), c = curve(pts);
  return (
    <svg width={w} height={h + 40} style={{ overflow: "visible", fontFamily: family(theme.font) }}>
      <defs><linearGradient id="terr" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="0.25" stopColor="#9a8a6a" /><stop offset="0.6" stopColor="color-mix(in srgb, var(--grass, #5a9a3a) 92%, #fff)" /><stop offset="1" stopColor="#3a6a2a" /></linearGradient><clipPath id="terrclip"><rect x={0} y={-50} width={w * k} height={h + 100} /></clipPath></defs>
      <path d={`${c.d} L${w} ${h} L0 ${h} Z`} fill="url(#terr)" clipPath="url(#terrclip)" />
      <path d={c.d} fill="none" stroke={theme.ink} strokeWidth={5} pathLength={1} strokeDasharray={`${k} 2`} />
      {labels.map((l, i) => { const p = c.at(l.at), on = k > l.at; return on && <g key={i}><line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 60} stroke={theme.ink} strokeWidth={3} /><text x={p.x} y={p.y - 70} textAnchor="middle" fontSize={28} fontWeight={800} fill={theme.ink}>{l.text}</text></g>; })}
      <text x={0} y={h + 36} fontSize={22} fill={theme.muted}>0 {unit}</text><text x={w} y={14} textAnchor="end" fontSize={22} fill={theme.muted}>{num(max)} {unit}</text>
    </svg>
  );
}
export const Terrain = block("Terrain", TerrainView);
/** a weather map: pressure lines, a storm that spins, rain and sun symbols with temperatures over a region */
function WeatherMapView({ w = 1500, h = 850, at = 0, storm = [0.6, 0.45], cities = [] }: { w?: number; h?: number; at?: number; storm?: [number, number]; cities?: { name: string; x: number; y: number; temp: number; icon: string }[] }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / 0.8));
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 18, overflow: "hidden", fontFamily: family(theme.font) }}>
      <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #cfe6c8, #a8cfa0)" }} /></Part><Background />
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>{[1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx={storm[0] * w} cy={storm[1] * h} rx={i * 120 * k} ry={i * 80 * k} fill="none" stroke="#fff" strokeWidth={3} opacity={0.7} />)}</svg>
      <div style={{ position: "absolute", left: storm[0] * w - 90, top: storm[1] * h - 90, width: 180, height: 180, fontSize: 160, lineHeight: "180px", textAlign: "center", transform: `rotate(${-(t - at) * 200}deg)`, opacity: k }}>🌀</div>
      {cities.map((c, i) => <div key={i} style={{ position: "absolute", left: c.x * w, top: c.y * h, transform: `translate(-50%,-50%) scale(${ease.back(clamp01((t - at - 0.5 - i * 0.2) / 0.4))})`, textAlign: "center", background: "rgb(255 255 255/0.85)", borderRadius: 16, padding: "8px 18px" }}><div style={{ fontSize: 60 }}><Part name="icon" item={c} i={i}>{slot(c.icon, c.icon, { width: 80, height: 80, margin: "0 auto" }, "contain")}</Part></div><div style={{ fontSize: 34, fontWeight: 800, color: theme.ink }}>{c.temp}°</div><div style={{ fontSize: 22, color: theme.muted }}>{c.name}</div></div>)}
    </div>
  );
}
export const WeatherMap = block("WeatherMap", WeatherMapView);
/** a raised 3D map: the map tilts back and each country rises as a column by its value (GDP, population, emissions) */
function RaisedMapView({ map: given, values, at = 0, color, scale = 1 }: { map?: MapView; values: Record<string, number>; at?: number; color?: string; scale?: number }) {
  const map = useMapView(given);  // a made-up map= falls back to a real one
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / 1.2)), max = Math.max(...Object.values(values));
  const tilt = 50 * k;
  return (
    <div style={{ position: "relative", width: map.w, height: map.h }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 80%", transform: `perspective(1800px) rotateX(${tilt}deg)` }}><MapBase map={map} highlight={Object.fromEntries(Object.keys(values).map((n) => [n, color ?? theme.accent]))} labels={false} /></div>
      {Object.entries(values).map(([n, v], i) => {
        const f = COUNTRIES.find((c) => c.properties.name === n); if (!f) return null;
        const [cx, cy] = map.path.centroid(f as any), y = map.h * 0.8 + (cy - map.h * 0.8) * Math.cos((tilt * Math.PI) / 180);
        const hh = (v / max) * 360 * scale * ease.out(clamp01((t - at - 1 - i * 0.12) / 0.8));
        return <div key={n} style={{ position: "absolute", left: cx - 18, top: y - hh, width: 36, height: hh, background: `linear-gradient(90deg, ${color ?? theme.accent}, ${theme.accent2})`, borderRadius: "6px 6px 0 0", boxShadow: "6px 0 0 rgb(0 0 0/0.2)" }}><div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "6px 6px 0 0" }}><Part name="column" item={{ country: n, value: v }} i={i}>{null}</Part></div><div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", fontSize: 22, fontWeight: 800, whiteSpace: "nowrap", color: theme.ink, fontFamily: family(theme.font) }}>{n}</div></div>;
      })}
    </div>
  );
}
export const RaisedMap = block("RaisedMap", RaisedMapView);
/** an old map look over any map: parchment, sepia, burnt edges, a compass rose and sea monsters' coast (history) */
export function OldMap({ children, w = 1600, h = 900, compass = true }: { children: ReactNode; w?: number; h?: number; compass?: boolean }) {
  const { t } = useScene();
  const world = useMemo(() => makeMap(w, h), [w, h]);  // a Pin or MapRoute inside with no map= lands on the world at this size
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 12, overflow: "hidden", background: "#e8d4a8" }}>
      <div style={{ position: "absolute", inset: 0, filter: "sepia(0.9) contrast(1.5) brightness(0.85) saturate(0.8)" }}><MapCtx.Provider value={world}>{children}</MapCtx.Provider></div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 50%, rgb(120 70 20/0.55) 100%)", boxShadow: "inset 0 0 80px rgb(80 40 10/0.6)" }} />
      {compass && <svg width={220} height={220} viewBox="-50 -50 100 100" style={{ position: "absolute", right: 40, bottom: 40, transform: `rotate(${Math.sin(t * 0.5) * 3}deg)` }}><circle r={44} fill="none" stroke="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" strokeWidth={2} /><path d="M0 -42 L8 0 L0 42 L-8 0 Z" fill="#8a2a1c" /><path d="M-42 0 L0 8 L42 0 L0 -8 Z" fill="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" /><text y={-30} textAnchor="middle" fontSize={14} fill="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" fontFamily="Georgia">N</text></svg>}
    </div>
  );
}
/** a distance ruler drawn between two points with the distance counting up (how far apart two places are) */
function DistanceRulerView({ from, to, km, at = 0, dur = 1.4, color }: { from: [number, number]; to: [number, number]; km: number; at?: number; dur?: number; color?: string }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k;
  const ang = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI, col = color ?? theme.ink;
  return (
    <>
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%"><line x1={from[0]} y1={from[1]} x2={x} y2={y} stroke={col} strokeWidth={6} strokeDasharray="20 12" /><circle cx={from[0]} cy={from[1]} r={12} fill={col} />{k > 0.98 && <circle cx={to[0]} cy={to[1]} r={12} fill={col} />}</svg>
      <div style={{ position: "absolute", left: (from[0] + x) / 2, top: (from[1] + y) / 2, transform: `translate(-50%,-140%) rotate(${Math.abs(ang) > 90 ? ang + 180 : ang}deg)`, background: col, color: "#fff", fontFamily: family(theme.display), fontSize: 40, fontWeight: 800, padding: "6px 20px", borderRadius: 12, whiteSpace: "nowrap" }}>{num(Math.round(km * k))} km</div>
    </>
  );
}
export const DistanceRuler = block("DistanceRuler", DistanceRulerView);
