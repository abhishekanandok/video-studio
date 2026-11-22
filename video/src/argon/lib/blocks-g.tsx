/* LAYER 2, part G: BLOCKS for INDIA, ELECTIONS, COMPARISONS, SPORTS, the ECONOMY, SOCIAL MEDIA, SELF-HELP, CLIMATE and
   SPACE, DEVICES, and the VOX-style COLLAGE.
   India is drawn from the official (Survey of India based) boundary with every state, the same data the notes films use.
   A collage is built from layers (cut-out photos, torn paper, halftone prints, marker scribbles), so every piece of it can
   move on its own with any motion: that is what makes a Vox-style picture come alive. */

import { geoArea, geoMercator, geoPath } from "d3-geo";
import type { CSSProperties, ReactNode } from "react";
import { Img } from "remotion";
import india from "../../notes/data/india.json";
import { clamp01, family, useScene } from "../kit";
import { ease, rand } from "./motion";
import { shadow, src, useIn } from "./blocks-a";
import { Character, type Emotion } from "./blocks-d";
import { pc } from "./palette";
import { itemSlot, slot, type ItemSlot, type Slot } from "./slots";
import { Background, Part, SvgPart, block } from "./parts";

const num = (v: number, d = 0) => v.toLocaleString("en-IN", { maximumFractionDigits: d });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const usePal = () => { const { theme } = useScene(); return [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8", "#3fb35a", "#e06a8a", "#4ac0c0"]; };

/* ================= INDIA ================= */
type Feat = { type: "Feature"; properties: { name: string; kind?: string }; geometry: { type: string; coordinates: any } };
// the file winds some rings the other way: a ring that would cover more than half the Earth is turned round (as GeoBeats)
const IND: Feat[] = ((india as any).features as Feat[]).map((x) => ({ ...x, geometry: { type: "MultiPolygon", coordinates: x.geometry.coordinates.map((poly: any) => { const r = poly[0]; return [geoArea({ type: "Polygon", coordinates: [r] } as any) > 2 * Math.PI ? [...r].reverse() : r]; }) } }));
export const INDIA_STATES: string[] = IND.filter((x) => x.properties.kind === "state").map((x) => x.properties.name);
export type IndiaView = { w: number; h: number; path: ReturnType<typeof geoPath>; xy: (lon: number, lat: number) => [number, number] };
/** India's map projection, fitted to w x h px (for pins and routes on <IndiaMap>) */
export function makeIndia(w: number, h: number, pad = 30): IndiaView {
  const outline = { type: "FeatureCollection", features: IND.filter((x) => x.properties.kind === "country") } as any;
  const proj = geoMercator().fitExtent([[pad, pad], [w - pad, h - pad]], outline);
  return { w, h, path: geoPath(proj), xy: (lon, lat) => proj([lon, lat]) as [number, number] };
}
/** India with every state: `values` colours states on a scale (a choropleth: literacy, votes, rainfall), `colors` sets a
    state's colour outright (an election result); states fill one by one from `at`; `labels` names them; `lift` raises the
    coloured ones in 3D */
function IndiaMapView({ w = 900, h = 1000, values, colors = {}, at = 0, labels = false, lift = false, scale = ["#fde3b0", "#c0392b"], legend }: {
  w?: number; h?: number; values?: Record<string, number>; colors?: Record<string, string>; at?: number; labels?: boolean; lift?: boolean; scale?: [string, string]; legend?: string;
}) {
  const { t, theme } = useScene();
  const v = makeIndia(w, h), vals = values ? Object.values(values) : [], lo = Math.min(...vals), hi = Math.max(...vals);
  const states = IND.filter((x) => x.properties.kind === "state"), named = Object.keys({ ...colors, ...(values ?? {}) });
  const fillOf = (n: string) => colors[n] ?? (values && values[n] !== undefined ? `color-mix(in srgb, ${scale[0]} ${Math.round(100 - ((values[n] - lo) / (hi - lo || 1)) * 100)}%, ${scale[1]})` : undefined);
  return (
    <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.font) }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        {IND.filter((x) => x.properties.kind === "country").map((f, i) => <path key={"c" + i} d={v.path(f as any) ?? ""} fill={pc("wall", "#f3eee2")} stroke="#8a939d" strokeWidth={2} />)}
        {states.map((f, i) => { const n = f.properties.name, col = fillOf(n), k = col ? ease.out(clamp01((t - at - named.indexOf(n) * 0.08) / 0.5)) : 0, up = lift && col ? -14 * k : 0;
          return <g key={n}>{lift && col && <path d={v.path(f as any) ?? ""} fill="#000" opacity={0.2 * k} transform="translate(6 10)" />}<path d={v.path(f as any) ?? ""} fill={col ?? pc("wall", "#f3eee2")} fillOpacity={col ? 0.3 + 0.7 * k : 1} stroke="#fff" strokeWidth={1.4} transform={`translate(0 ${up})`} /></g>; })}
        {labels && states.map((f) => { const [x, y] = v.path.centroid(f as any), n = f.properties.name; return Number.isFinite(x) && <text key={n} x={x} y={y} textAnchor="middle" fontSize={14} fontWeight={700} fill={theme.ink} opacity={clamp01((t - at - 0.5) / 0.5)}>{n.length > 12 ? n.split(" ")[0] : n}</text>; })}
      </svg>
      {legend && values && <div style={{ position: "absolute", left: 20, bottom: 20, fontSize: 24, color: theme.ink }}>{legend}<div style={{ width: 260, height: 16, borderRadius: 8, background: `linear-gradient(90deg, ${scale[0]}, ${scale[1]})`, marginTop: 6 }} /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: theme.muted }}><span>{num(lo, 1)}</span><span>{num(hi, 1)}</span></div></div>}
    </div>
  );
}
export const IndiaMap = block("IndiaMap", IndiaMapView);

/* ================= ELECTIONS ================= */
/** a parliament seat arc (hemicycle): seats fill party by party; a majority line (e.g. 272 of 543) */
function SeatArcView({ parties, total = 543, majority, w = 1200, at = 0, per = 0.6 }: { parties: { name: string; seats: number; color: string }[]; total?: number; majority?: number; w?: number; at?: number; per?: number }) {
  const { t, theme } = useScene();
  const rows = 9, R = w / 2 - 20, r0 = R * 0.38, seats: { x: number; y: number; a: number }[] = [];
  for (let r = 0; r < rows; r++) { const rr = r0 + ((R - r0) * r) / (rows - 1), n = Math.round((total * rr) / (rows * (r0 + R) / 2)); for (let i = 0; i < n; i++) { const a = Math.PI - (i / Math.max(1, n - 1)) * Math.PI; seats.push({ x: w / 2 + Math.cos(a) * rr, y: R + 10 - Math.sin(a) * rr, a }); } }
  seats.sort((p, q) => q.a - p.a);
  const shown = seats.slice(0, total), owner: number[] = []; parties.forEach((p, i) => { for (let j = 0; j < p.seats; j++) owner.push(i); });
  const filled = (i: number) => { const pi = owner[i]; if (pi === undefined) return 0; const before = parties.slice(0, pi).reduce((a, p) => a + p.seats, 0); return ease.out(clamp01((t - at - pi * per - ((i - before) / parties[pi].seats) * per) / 0.2)); };
  const lead = parties.reduce((a, p) => (p.seats > a.seats ? p : a), parties[0]);
  return (
    <div style={{ position: "relative", width: w, height: R + 160, fontFamily: family(theme.display) }}>
      <svg width={w} height={R + 30}>{shown.map((s, i) => { const k = filled(i); const sr = (R - r0) / rows / 2.6; return <g key={i} transform={`translate(${s.x} ${s.y}) scale(${0.6 + 0.4 * k}) translate(${-s.x} ${-s.y})`}><SvgPart name="seat" item={{ party: k > 0 ? parties[owner[i]] : undefined, filled: k > 0 }} i={i} x={s.x - sr} y={s.y - sr} w={sr * 2} h={sr * 2}><circle cx={s.x} cy={s.y} r={sr} fill={k > 0 ? parties[owner[i]].color : "#e4e8ec"} /></SvgPart></g>; })}
        {majority && <line x1={w / 2} y1={10} x2={w / 2} y2={R - r0 + 20} stroke={theme.ink} strokeWidth={3} strokeDasharray="8 8" />}</svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: R - 70, textAlign: "center", fontSize: 90, fontWeight: 800, color: lead.color }}>{Math.round(lead.seats * clamp01((t - at) / (per * parties.length)))}<div style={{ fontSize: 28, color: theme.muted, fontFamily: family(theme.font) }}>{majority ? `majority ${majority}` : `of ${total}`}</div></div>
      <div style={{ display: "flex", justifyContent: "center", gap: 30, marginTop: 70 }}>{parties.map((p) => <div key={p.name} style={{ fontSize: 30, fontWeight: 800, color: p.color }}>● {p.name} {p.seats}</div>)}</div>
    </div>
  );
}
export const SeatArc = block("SeatArc", SeatArcView);
/** an EVM (electronic voting machine): a finger presses a party's button, its light glows and it beeps */
function EvmView({ candidates, press = 1, pick = 0, at = 0, w = 560 }: { candidates: { name: string; symbol: string }[]; press?: number; pick?: number; at?: number; w?: number }) {
  const { t } = useIn(at);
  const pressed = t >= at + press, beep = pressed && t - at - press < 1.2;
  return (
    <div style={{ width: w, background: "#d8dce2", borderRadius: 20, padding: 24, boxShadow: shadow, fontFamily: "Arial", position: "relative" }}>
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: 24, color: "#333", marginBottom: 14 }}>BALLOT UNIT</div>
      {candidates.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", borderRadius: 10, padding: "10px 16px", marginBottom: 10 }}>
        <span style={{ fontSize: 38, width: 50, height: 50, display: "grid", placeItems: "center" }}>{slot(c.symbol, c.symbol, undefined, "contain")}</span><span style={{ flex: 1, fontSize: 28, fontWeight: 700 }}>{c.name}</span>
        <span style={{ width: 22, height: 22, borderRadius: 11, background: pressed && i === pick ? "#e0453a" : "#7a2a2a", boxShadow: pressed && i === pick && beep ? "0 0 18px 6px #ff6a5a" : undefined }} />
        <span style={{ width: 70, height: 40, borderRadius: 20, background: "#2a5ad4", transform: pressed && i === pick && t - at - press < 0.2 ? "scale(0.9)" : undefined }} />
      </div>)}
      {t > at + press - 0.6 && !pressed && <div style={{ position: "absolute", right: 24, top: 80 + pick * 66 - (1 - clamp01((t - at - press + 0.6) / 0.6)) * 80, fontSize: 70 }}>👆</div>}
    </div>
  );
}
export const Evm = block("Evm", EvmView);
/** two candidates (or teams, or products) face off: photo or initials, name, party and a big VS */
function VersusCardsView({ a, b, at = 0, w = 1500 }: { a: { name: string; sub?: string; image?: string; color?: string }; b: { name: string; sub?: string; image?: string; color?: string }; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const card = (c: typeof a, side: -1 | 1, col: string) => { const k = ease.out(clamp01((t - at - (side > 0 ? 0.15 : 0)) / 0.6)); return <div style={{ flex: 1, height: w * 0.38, background: col, borderRadius: 24, transform: `translateX(${(1 - k) * side * 500}px) skewX(${side * -4}deg)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: shadow, overflow: "hidden" }}>
    {c.image ? <Img src={src(c.image)} style={{ width: w * 0.16, height: w * 0.16, borderRadius: "50%", objectFit: "cover", border: "8px solid #fff" }} /> : <div style={{ width: w * 0.16, height: w * 0.16, borderRadius: "50%", background: "rgb(255 255 255/0.25)", display: "grid", placeItems: "center", fontSize: w * 0.06, fontWeight: 800 }}>{c.name.split(" ").map((x) => x[0]).join("")}</div>}
    <div style={{ fontFamily: family(theme.display), fontSize: w * 0.035, fontWeight: 800, marginTop: 16 }}>{c.name}</div>{c.sub && <div style={{ fontSize: w * 0.018, opacity: 0.85 }}>{c.sub}</div>}</div>; };
  const vs = ease.back(clamp01((t - at - 0.6) / 0.4));
  return <div style={{ position: "relative", display: "flex", gap: 40, width: w, fontFamily: family(theme.font) }}>{card(a, -1, a.color ?? theme.accent)}{card(b, 1, b.color ?? theme.accent2)}<div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%,-50%) scale(${vs}) rotate(-8deg)`, fontFamily: family("bebas"), fontSize: w * 0.09, color: "#fff", WebkitTextStroke: `6px ${theme.ink}`, paintOrder: "stroke" }}>VS</div></div>;
}
export const VersusCards = block("VersusCards", VersusCardsView);
/** a swing meter: the needle swings toward the party that gained (vote swing in % points) */
function SwingMeterView({ swing, left = "A", right = "B", leftColor = "#e0453a", rightColor = "#2a6ad9", at = 0, size = 700 }: { swing: number; left?: string; right?: string; leftColor?: string; rightColor?: string; at?: number; size?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / 1.6)), a = (-swing / 20) * 80 * k * (1 + Math.sin(t * 4) * 0.02);
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 200 124" style={{ fontFamily: family(theme.display) }}>
      <path d="M20 110 A80 80 0 0 1 100 30" fill="none" stroke={leftColor} strokeWidth={16} /><path d="M100 30 A80 80 0 0 1 180 110" fill="none" stroke={rightColor} strokeWidth={16} />
      <line x1={100} y1={110} x2={100 + Math.sin((a * Math.PI) / 180) * 70} y2={110 - Math.cos((a * Math.PI) / 180) * 70} stroke={theme.ink} strokeWidth={5} strokeLinecap="round" /><circle cx={100} cy={110} r={8} fill={theme.ink} />
      <text x={20} y={124} fontSize={12} fontWeight={800} fill={leftColor}>{left}</text><text x={180} y={124} textAnchor="end" fontSize={12} fontWeight={800} fill={rightColor}>{right}</text>
      <text x={100} y={88} textAnchor="middle" fontSize={20} fontWeight={800} fill={theme.ink}>{swing > 0 ? "+" : ""}{(swing * k).toFixed(1)}%</text>
    </svg>
  );
}
export const SwingMeter = block("SwingMeter", SwingMeterView);

/* ================= COMPARISONS ================= */
/** a tier list: S, A, B, C, D rows; items drop into their row one by one */
function TierListView({ tiers, at = 0, per = 0.3, w = 1500 }: { tiers: { tier: string; items: string[]; color?: string }[]; at?: number; per?: number; w?: number }) {
  const { t, theme } = useScene();
  const cols = ["#ff7f7f", "#ffbf7f", "#ffdf7f", "#bfff7f", "#7fbfff"];
  let n = 0;
  return <div style={{ width: w, fontFamily: family(theme.display), boxShadow: shadow }}>{tiers.map((r, i) => <div key={i} style={{ display: "flex", minHeight: 130, borderBottom: "4px solid #222", background: "#2a2d33" }}>
    <div style={{ width: 150, background: r.color ?? cols[i % cols.length], display: "grid", placeItems: "center", fontSize: 72, fontWeight: 800, color: "#222" }}>{r.tier}</div>
    <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 10, padding: 12, alignContent: "center" }}>{r.items.map((it) => { const k = ease.bounce(clamp01((t - at - n++ * per) / 0.5)); return <div key={it} style={{ minWidth: 110, height: 100, padding: "0 14px", borderRadius: 10, background: "#fff", display: "grid", placeItems: "center", fontSize: it.length <= 2 ? 64 : 30, fontWeight: 800, color: "#222", transform: `translateY(${(1 - k) * -300}px)`, opacity: k > 0 ? 1 : 0 }}><Part name="item" item={it}>{slot(it, it, { width: 100, height: 100 }, "contain")}</Part></div>; })}</div>
  </div>)}</div>;
}
export const TierList = block("TierList", TierListView);
/** a podium: second, first and third rise, and each name drops onto its step */
function PodiumView({ first, second, third, at = 0, w = 1100 }: { first: string; second: string; third: string; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const step = (name: string, place: number, h: number, i: number, col: string) => { const k = ease.out(clamp01((t - at - i * 0.35) / 0.6)), nk = ease.bounce(clamp01((t - at - i * 0.35 - 0.5) / 0.5)); return <div style={{ width: w / 3 - 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
    <div style={{ fontSize: 46, fontWeight: 800, color: theme.ink, transform: `translateY(${(1 - nk) * -300}px)`, opacity: nk > 0 ? 1 : 0, textAlign: "center" }}><Part name="winner" item={name} i={place}>{slot(name, name, { width: 200, height: 200, borderRadius: "50%" })}</Part></div>
    <div style={{ width: "100%", height: h * k, background: col, borderRadius: "14px 14px 0 0", display: "grid", placeItems: "start center", paddingTop: 10, fontSize: 90, fontWeight: 800, color: "#fff", overflow: "hidden", position: "relative" }}><Part name="step" item={place} i={place}>{place}</Part></div></div>; };
  return <div style={{ display: "flex", alignItems: "flex-end", gap: 20, width: w, height: 600, fontFamily: family(theme.display) }}>{step(second, 2, 280, 1, "#c0c6cc")}{step(first, 1, 400, 2, "#f0b43a")}{step(third, 3, 200, 0, "#c98a4a")}</div>;
}
export const Podium = block("Podium", PodiumView);
/** pros and cons in two columns: ticks and crosses appear point by point */
function ProsConsView({ pros, cons, at = 0, per = 0.5, w = 1500, title }: { pros: string[]; cons: string[]; at?: number; per?: number; w?: number; title?: string }) {
  const { t, theme } = useScene();
  const col = (items: string[], ok: boolean, off: number) => <div style={{ flex: 1, background: theme.paper ?? "#fff", borderRadius: 22, padding: 30, boxShadow: shadow, borderTop: `14px solid ${ok ? pc("good") : pc("bad")}` }}>
    <div style={{ fontFamily: family(theme.display), fontSize: 52, fontWeight: 800, color: ok ? pc("good") : pc("bad") }}>{ok ? "Pros" : "Cons"}</div>
    {items.map((it, i) => { const k = clamp01((t - at - (off + i) * per) / 0.3); return <div key={i} style={{ display: "flex", gap: 16, fontSize: 36, color: theme.ink, marginTop: 18, opacity: k, transform: `translateX(${(1 - k) * 30}px)` }}><span style={{ color: ok ? pc("good") : pc("bad"), fontWeight: 900 }}>{ok ? "✓" : "✗"}</span>{it}</div>; })}</div>;
  return <div style={{ width: w, fontFamily: family(theme.font) }}>{title && <div style={{ fontFamily: family(theme.display), fontSize: 60, fontWeight: 800, color: theme.ink, textAlign: "center", marginBottom: 20 }}>{title}</div>}<div style={{ display: "flex", gap: 30 }}>{col(pros, true, 0)}{col(cons, false, pros.length)}</div></div>;
}
export const ProsCons = block("ProsCons", ProsConsView);
/** myth vs fact: the myth card is stamped MYTH and crossed out, then flips over to the fact */
function MythFactView({ myth, fact, at = 0, flip = 2, w = 1100 }: { myth: string; fact: string; at?: number; flip?: number; w?: number }) {
  const { t, theme } = useScene();
  const st = ease.back(clamp01((t - at - 0.8) / 0.3)), k = ease.inOut(clamp01((t - at - flip) / 0.7)), front = k < 0.5;
  return (
    <div style={{ width: w, height: w * 0.5, transform: `perspective(2400px) rotateY(${k * 180}deg)`, fontFamily: family(theme.display) }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: front ? "#fbe9e7" : "#e8f6ec", border: `10px solid ${front ? pc("bad") : pc("good")}`, display: "grid", placeItems: "center", textAlign: "center", padding: 50, boxSizing: "border-box", transform: front ? undefined : "rotateY(180deg)", boxShadow: shadow }}>
        <div style={{ fontSize: 30, letterSpacing: 6, fontWeight: 800, color: front ? pc("bad") : pc("good"), position: "absolute", top: 30 }}>{front ? "MYTH" : "FACT"}</div>
        <div style={{ fontSize: w * 0.05, fontWeight: 800, color: theme.ink, textDecoration: front && st > 0.5 ? `line-through ${pc("bad")} 8px` : undefined }}>{front ? myth : fact}</div>
        {front && st > 0 && <div style={{ position: "absolute", right: 40, bottom: 30, fontSize: 70, color: pc("bad"), border: `8px solid ${pc("bad")}`, padding: "0 20px", borderRadius: 12, transform: `rotate(-14deg) scale(${2 - st})`, opacity: st }}>✗ MYTH</div>}
      </div>
    </div>
  );
}
export const MythFact = block("MythFact", MythFactView);
/** a fork in the road: a person walks up to where the path splits; the chosen way lights and the other fades */
function ForkRoadView({ left, right, choose, at = 0, decide = 2.2 }: { left: string; right: string; choose?: "left" | "right"; at?: number; decide?: number }) {
  const { t, W, H, theme } = useScene();
  const walk = ease.inOut(clamp01((t - at) / decide)), d = choose ? ease.inOut(clamp01((t - at - decide) / 1.5)) : 0;
  const end = choose === "left" ? [W * 0.2, H * 0.28] : [W * 0.8, H * 0.28];
  const px = lerp(W / 2, end[0], d), py = lerp(lerp(H * 0.95, H * 0.58, walk), end[1], d);
  const road = (x2: number, lit: boolean) => <path d={`M${W / 2} ${H * 0.6} Q${W / 2} ${H * 0.4} ${x2} ${H * 0.25}`} fill="none" stroke={lit ? theme.accent : "#8a939d"} strokeWidth={90} strokeLinecap="round" opacity={choose && !lit ? 1 - d * 0.6 : 1} />;
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: family(theme.display) }}>
      <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: pc("grass", "#9ccf7a") }} /></Part><Background />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}><path d={`M${W / 2} ${H} L${W / 2} ${H * 0.6}`} stroke="#8a939d" strokeWidth={110} />{road(W * 0.2, choose === "left")}{road(W * 0.8, choose === "right")}</svg>
      <div style={{ position: "absolute", left: W * 0.12, top: H * 0.08, fontSize: 60, fontWeight: 800, color: theme.ink, background: "#fff", padding: "8px 24px", borderRadius: 14 }}>← {left}</div>
      <div style={{ position: "absolute", right: W * 0.12, top: H * 0.08, fontSize: 60, fontWeight: 800, color: theme.ink, background: "#fff", padding: "8px 24px", borderRadius: 14 }}>{right} →</div>
      <div style={{ position: "absolute", left: px, top: py, transform: `translate(-50%,-100%) scale(${1 - (1 - py / H) * 0.6})`, transformOrigin: "50% 100%" }}><Part name="walker" item={{ walking: walk < 1 || (d > 0 && d < 1) }}><Character action={walk < 1 || (d > 0 && d < 1) ? "walk" : choose ? "cheer" : "think"} height={300} face={choose === "left" && d > 0 ? -1 : 1} /></Part></div>
    </div>
  );
}
export const ForkRoad = block("ForkRoad", ForkRoadView);

/* ================= SPORTS ================= */
export type CricketState = { k: number; runs: number; wickets: number; overs: number; balls: number; oversText: string; runRate: number; need?: number; team: string };
/** the cricket score's motion: runs, wickets and overs counting up to their values over `dur` from `at` */
export function useCricketScore({ team = "IND", runs, wickets, overs, target, at = 0, dur = 2 }: { team?: string; runs: number; wickets: number; overs: number; target?: number; at?: number; dur?: number }): CricketState {
  const { t } = useScene();
  const k = ease.out(clamp01((t - at) / dur)), r = Math.round(runs * k), o = overs * k, balls = Math.round((o % 1) * 6);
  return { k, runs: r, wickets: Math.round(wickets * k), overs: o, balls, oversText: `${Math.floor(o)}.${balls}`, runRate: r / Math.max(0.1, o), need: target !== undefined ? Math.max(0, target - r) : undefined, team };
}
/** a cricket scoreboard: runs, wickets, overs ticking up, the run rate and the target.
    parts: badge (the team's logo or a picture), background; render(s) draws your own board from the live score */
export function CricketScore({ team = "IND", runs, wickets, overs, target, at = 0, dur = 2, w = 1100, parts = {}, render }: {
  team?: string; runs: number; wickets: number; overs: number; target?: number; at?: number; dur?: number; w?: number;
  parts?: { badge?: Slot; background?: Slot }; render?: (s: CricketState) => ReactNode;
}) {
  const s = useCricketScore({ team, runs, wickets, overs, target, at, dur });
  if (render) return <>{render(s)}</>;
  return (
    <div style={{ position: "relative", width: w, display: "flex", fontFamily: family("oswald"), color: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: shadow }}>
      {parts.background !== undefined && <div style={{ position: "absolute", inset: 0 }}>{slot(parts.background, null)}</div>}
      <div style={{ position: "relative", background: parts.background !== undefined ? "rgb(10 20 60/0.75)" : "#1a3a8a", padding: "20px 30px", fontSize: 60, fontWeight: 700, display: "flex", alignItems: "center", gap: 16 }}>{parts.badge !== undefined && <div style={{ width: 70, height: 70, borderRadius: 10, overflow: "hidden" }}>{slot(parts.badge, null, undefined, "contain")}</div>}{s.team}</div>
      <div style={{ position: "relative", flex: 1, background: parts.background !== undefined ? "rgb(10 15 30/0.7)" : "#0e1a33", padding: "20px 30px", display: "flex", alignItems: "center", gap: 40 }}>
        <span style={{ fontSize: 84, fontWeight: 700 }}>{s.runs}/{s.wickets}</span><span style={{ fontSize: 40, opacity: 0.8 }}>{s.oversText} ov</span>
        <span style={{ fontSize: 34, opacity: 0.8 }}>RR {s.runRate.toFixed(2)}</span>
        {s.need !== undefined && <span style={{ marginLeft: "auto", fontSize: 34, background: "#f0b43a", color: "#222", padding: "6px 16px", borderRadius: 8 }}>Need {s.need}</span>}
      </div>
    </div>
  );
}
export type Shot = { angle: number; runs: 1 | 2 | 3 | 4 | 6 };
export type WagonState = { shots: (Shot & { k: number; len: number; x: number; y: number })[]; c: number; size: number };
/** the wagon wheel's motion: each shot's line grows out from the pitch in turn (x, y = where its line has reached) */
export function useWagonWheel({ shots, size = 700, at = 0, per = 0.15 }: { shots: Shot[]; size?: number; at?: number; per?: number }): WagonState {
  const { t } = useScene();
  const c = size / 2;
  return { c, size, shots: shots.map((sh, i) => { const k = ease.out(clamp01((t - at - i * per) / 0.35)), len = (sh.runs >= 4 ? c - 14 : c * (0.3 + sh.runs * 0.15)) * k, a = ((sh.angle - 90) * Math.PI) / 180; return { ...sh, k, len, x: c + Math.cos(a) * len, y: c + Math.sin(a) * len }; }) };
}
/** a cricket wagon wheel: each scoring shot is a line from the pitch out to where it went, coloured by runs.
    parts: ground (a real stadium from above), pitch; shot(s, i) draws each shot's end your way; render(s) draws it all */
export function WagonWheel({ shots, size = 700, at = 0, per = 0.15, parts = {}, shot, render, colors }: {
  shots: Shot[]; size?: number; at?: number; per?: number; parts?: { ground?: Slot; pitch?: Slot }; shot?: ItemSlot<WagonState["shots"][number]>;
  render?: (s: WagonState) => ReactNode; colors?: Partial<Record<1 | 2 | 3 | 4 | 6, string>>;
}) {
  const s = useWagonWheel({ shots, size, at, per });
  if (render) return <>{render(s)}</>;
  const c = s.c, col: Record<number, string> = { 1: "#fff", 2: "#ffd24a", 3: "#4ac0ff", 4: "#3fb35a", 6: "#e0453a", ...colors };
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden" }}>{slot(parts.ground, <svg width={size} height={size}><circle cx={c} cy={c} r={c - 6} fill="#3a8a3a" stroke="#fff" strokeWidth={6} /><circle cx={c} cy={c} r={c * 0.45} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="8 8" /></svg>)}</div>
      <div style={{ position: "absolute", left: c - 10, top: c - 40, width: 20, height: 80 }}>{slot(parts.pitch, <div style={{ width: 20, height: 80, background: "#d9c08a" }} />)}</div>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>{s.shots.map((sh, i) => <line key={i} x1={c} y1={c} x2={sh.x} y2={sh.y} stroke={col[sh.runs]} strokeWidth={sh.runs >= 4 ? 5 : 3} />)}</svg>
      {shot !== undefined && s.shots.map((sh, i) => sh.k > 0 && <div key={i} style={{ position: "absolute", left: sh.x, top: sh.y, transform: "translate(-50%,-50%)" }}>{itemSlot(shot, sh, i, null)}</div>)}
    </div>
  );
}
export type PitchState = { w: number; h: number; players: { x: number; y: number }[]; ball: { x: number; y: number }; pass: number; f: number; scored: boolean; goalK: number };
/** the football pitch's motion: the ball travels pass by pass from player to player, then `scored` (goalK 0..1 after) */
export function usePasses({ passes, at = 0, per = 0.8, w = 1500, goal = true }: { passes: [number, number][]; at?: number; per?: number; w?: number; goal?: boolean }): PitchState {
  const { t } = useScene();
  const h = w * 0.62, n = passes.length, q = clamp01((t - at) / (per * Math.max(1, n - 1))) * (n - 1), i = Math.max(0, Math.min(n - 2, Math.floor(q))), f = ease.inOut(q - i);
  const P = passes.map(([x, y]) => ({ x: x * w, y: y * h }));
  const ball = n > 1 ? { x: lerp(P[i].x, P[i + 1].x, f), y: lerp(P[i].y, P[i + 1].y, f) } : P[0];
  const scored = goal && q >= n - 1 && t > at;
  return { w, h, players: P, ball, pass: i, f, scored, goalK: scored ? clamp01((t - at - per * (n - 1)) / 0.4) : 0 };
}
/** a football pitch from above: players, passes drawn one after another, the ball travelling them, then GOAL.
    parts: ground (a real pitch photo), ball (a real ball), goal (your own GOAL card); player(p, i) draws each player
    (a photo, a shirt); render(s) draws everything from the live ball and players */
export function FootballPitch({ passes, at = 0, per = 0.8, w = 1500, goal = true, parts = {}, player, render }: {
  passes: [number, number][]; at?: number; per?: number; w?: number; goal?: boolean; parts?: { ground?: Slot; ball?: Slot; goal?: Slot };
  player?: ItemSlot<{ x: number; y: number }>; render?: (s: PitchState) => ReactNode;
}) {
  const { theme } = useScene();
  const s = usePasses({ passes, at, per, w, goal });
  if (render) return <>{render(s)}</>;
  const { h } = s;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>{slot(parts.ground, <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, #3a9a3a 0 10%, #348a34 10% 20%)", border: "8px solid #fff", boxSizing: "border-box", borderRadius: 14 }}><svg width={w} height={h} style={{ position: "absolute", inset: 0 }}><line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke="#fff" strokeWidth={4} /><circle cx={w / 2} cy={h / 2} r={h * 0.15} fill="none" stroke="#fff" strokeWidth={4} /><rect x={w - 120} y={h * 0.3} width={120} height={h * 0.4} fill="none" stroke="#fff" strokeWidth={4} /><rect x={0} y={h * 0.3} width={120} height={h * 0.4} fill="none" stroke="#fff" strokeWidth={4} /></svg></div>)}</div>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>{s.players.map((p, j) => j < s.players.length - 1 && j <= s.pass && <line key={j} x1={p.x} y1={p.y} x2={s.players[j + 1].x} y2={s.players[j + 1].y} stroke="#ffe066" strokeWidth={5} strokeDasharray="14 10" opacity={j < s.pass ? 0.8 : s.f} />)}</svg>
      {s.players.map((p, j) => <div key={j} style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)" }}>{itemSlot(player, p, j, <div style={{ width: 40, height: 40, borderRadius: 20, background: theme.accent, border: "4px solid #fff" }} />, { width: 90, height: 90 })}</div>)}
      <div style={{ position: "absolute", left: s.ball.x, top: s.ball.y, width: 26, height: 26, transform: "translate(-50%,-50%)" }}>{slot(parts.ball, <div style={{ width: 26, height: 26, borderRadius: 13, background: "#fff", border: "3px solid #222", boxSizing: "border-box" }} />, undefined, "contain")}</div>
      {s.scored && <div style={{ position: "absolute", left: "50%", top: "40%", transform: `translate(-50%,-50%) scale(${ease.back(s.goalK)})` }}>{slot(parts.goal, <div style={{ fontFamily: family("bebas"), fontSize: w * 0.12, color: "#fff", textShadow: "0 6px 0 #222" }}>GOAL!</div>, { width: w * 0.5, height: h * 0.4 }, "contain")}</div>}
    </div>
  );
}
export type MedalRow = { country: string; gold: number; silver: number; bronze: number; flag?: Slot };
export type MedalState = { rows: (MedalRow & { rank: number; k: number; shown: { gold: number; silver: number; bronze: number } })[] };
/** the medal table's motion: rows sorted by golds come in one after another, their counts ticking up */
export function useMedalTable({ rows, at = 0 }: { rows: MedalRow[]; at?: number }): MedalState {
  const { t } = useScene();
  const sorted = [...rows].sort((a, b) => b.gold - a.gold || b.silver - a.silver);
  return { rows: sorted.map((r, i) => { const k = ease.out(clamp01((t - at - i * 0.2) / 0.8)); return { ...r, rank: i + 1, k, shown: { gold: Math.round(r.gold * k), silver: Math.round(r.silver * k), bronze: Math.round(r.bronze * k) } }; }) };
}
/** a medal table: rows of countries with gold, silver and bronze counts ticking up, sorted by golds. Each row's `flag`
    can be an emoji or a picture. parts: background, header; row(r, i) draws each row your way; render(s) draws it all */
export function MedalTable({ rows, at = 0, w = 1100, parts = {}, row, render }: {
  rows: MedalRow[]; at?: number; w?: number; parts?: { background?: Slot; header?: Slot }; row?: ItemSlot<MedalState["rows"][number]>; render?: (s: MedalState) => ReactNode;
}) {
  const { theme } = useScene();
  const s = useMedalTable({ rows, at });
  if (render) return <>{render(s)}</>;
  const cell: CSSProperties = { width: 120, textAlign: "center", fontSize: 40, fontWeight: 800 };
  return (
    <div style={{ position: "relative", width: w, background: parts.background !== undefined ? "transparent" : theme.paper ?? "#fff", borderRadius: 20, padding: 24, boxShadow: shadow, fontFamily: family(theme.font), color: theme.ink, overflow: "hidden" }}>
      {parts.background !== undefined && <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>{slot(parts.background, null)}</div>}
      <div style={{ position: "relative" }}>{slot(parts.header, <div style={{ display: "flex", padding: "0 20px 12px", fontSize: 30, color: theme.muted }}><span style={{ flex: 1 }}>Country</span><span style={cell}>🥇</span><span style={cell}>🥈</span><span style={cell}>🥉</span></div>)}</div>
      {s.rows.map((r, i) => <div key={r.country} style={{ position: "relative", opacity: clamp01(r.k * 2) }}>{itemSlot(row, r, i, <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderTop: "2px solid #eef0f3", background: parts.background !== undefined ? "rgb(255 255 255/0.85)" : undefined }}>
        <span style={{ flex: 1, fontSize: 38, fontWeight: 700, display: "flex", alignItems: "center", gap: 14 }}>{r.rank}. {r.flag !== undefined && <span style={{ display: "inline-block", width: 60, height: 40, lineHeight: "40px", overflow: "hidden", borderRadius: 4 }}>{slot(r.flag, null)}</span>} {r.country}</span>
        <span style={{ ...cell, color: "#c8961c" }}>{r.shown.gold}</span><span style={{ ...cell, color: "#8a939d" }}>{r.shown.silver}</span><span style={{ ...cell, color: "#a8643a" }}>{r.shown.bronze}</span></div>)}</div>)}
    </div>
  );
}

/* ================= ECONOMY ================= */
/** supply and demand: the two curves cross at the price; `shift` moves demand (+ right) or `supplyShift` moves supply, and
    the new crossing point slides along */
function SupplyDemandView({ shift = 0, supplyShift = 0, at = 0, w = 900, h = 700 }: { shift?: number; supplyShift?: number; at?: number; w?: number; h?: number }) {
  const { t, theme } = useScene();
  const draw = ease.inOut(clamp01((t - at) / 1)), sk = ease.inOut(clamp01((t - at - 1.4) / 1.2)), dS = shift * sk * w * 0.2, sS = supplyShift * sk * w * 0.2;
  const P = 80, X = (q: number) => P + q * (w - P * 2), Y = (p: number) => h - P - p * (h - P * 2);
  const ex = (0.5 + (dS + sS) / (2 * (w - P * 2))), ey = 0.5 + (dS - sS) / (2 * (w - P * 2));
  const line = (off: number, up: boolean, col: string, lab: string) => <g><line x1={X(0) + off} y1={Y(up ? 0.1 : 0.9)} x2={X(0) + off + (X(1) - X(0)) * draw} y2={Y(up ? 0.1 + 0.8 * draw : 0.9 - 0.8 * draw)} stroke={col} strokeWidth={8} strokeLinecap="round" /><text x={X(1) + off + 10} y={Y(up ? 0.9 : 0.1)} fontSize={34} fontWeight={800} fill={col}>{lab}</text></g>;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", fontFamily: family(theme.font) }}>
      <line x1={P} y1={h - P} x2={w - P / 2} y2={h - P} stroke={theme.ink} strokeWidth={4} /><line x1={P} y1={h - P} x2={P} y2={P / 2} stroke={theme.ink} strokeWidth={4} />
      <text x={w - P} y={h - P + 44} fontSize={28} fill={theme.muted}>Quantity</text><text x={P - 20} y={P / 2 - 10} fontSize={28} fill={theme.muted}>Price</text>
      {line(sS, true, theme.accent2, "Supply")}{line(dS, false, theme.accent, "Demand")}
      {draw >= 1 && <><line x1={X(ex)} y1={Y(ey)} x2={X(ex)} y2={h - P} stroke={theme.muted} strokeDasharray="8 8" strokeWidth={3} /><line x1={P} y1={Y(ey)} x2={X(ex)} y2={Y(ey)} stroke={theme.muted} strokeDasharray="8 8" strokeWidth={3} /><circle cx={X(ex)} cy={Y(ey)} r={16} fill={theme.ink} /></>}
    </svg>
  );
}
export const SupplyDemand = block("SupplyDemand", SupplyDemandView);
/** an iceberg: what you see above the water, and the much bigger part under it, labelled as the water line lowers */
function IcebergView({ above, below, at = 0, w = 1100, h = 900 }: { above: string[]; below: string[]; at?: number; w?: number; h?: number }) {
  const { t, theme } = useScene();
  const water = h * 0.32, k = ease.inOut(clamp01((t - at - 0.8) / 1.4));
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: 20, fontFamily: family(theme.font) }}>
      <Part name="sky"><div style={{ position: "absolute", inset: 0, background: pc("sky", "#cfe6f5") }} /></Part><div style={{ position: "absolute", left: 0, right: 0, top: water, bottom: 0 }}><Part name="water"><div style={{ width: "100%", height: "100%", background: `linear-gradient(${pc("water", "#2a7fb8")}, #0a2a4a)` }} /></Part></div>
      <div style={{ position: "absolute", inset: 0 }}><Part name="berg" fit="contain"><svg width={w} height={h} style={{ position: "absolute", inset: 0 }}><path d={`M${w * 0.4} ${water} L${w * 0.47} ${water * 0.35} L${w * 0.52} ${water * 0.5} L${w * 0.58} ${water * 0.25} L${w * 0.64} ${water} Z`} fill="#f4fbff" /><path d={`M${w * 0.4} ${water} L${w * 0.15} ${h * 0.7} L${w * 0.35} ${h * 0.96} L${w * 0.7} ${h * 0.92} L${w * 0.88} ${h * 0.6} L${w * 0.64} ${water} Z`} fill="#bfe3f5" opacity={0.85} /></svg></Part></div>
      <div style={{ position: "absolute", left: w * 0.66, top: 30, fontSize: 32, fontWeight: 800, color: theme.ink }}>{above.map((a, i) => <div key={i} style={{ opacity: clamp01((t - at - i * 0.3) / 0.3) }}>{a}</div>)}</div>
      <div style={{ position: "absolute", left: w * 0.3, top: water + 80, fontSize: 32, fontWeight: 700, color: "#fff", lineHeight: 1.6 }}>{below.map((b, i) => <div key={i} style={{ opacity: clamp01((k * below.length - i)) }}>{b}</div>)}</div>
    </div>
  );
}
export const Iceberg = block("Iceberg", IcebergView);
/** a shopping cart that fills item by item while the bill adds up (spending, the cost of living) */
function CartFillView({ items, at = 0, per = 0.5, size = 520 }: { items: { icon: string; price: number }[]; at?: number; per?: number; size?: number }) {
  const { t, theme } = useScene();
  const n = Math.min(items.length, Math.floor(Math.max(0, t - at) / per) + (t >= at ? 1 : 0)), bill = items.slice(0, n).reduce((a, i) => a + i.price, 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, fontFamily: family(theme.display) }}>
      <div style={{ position: "relative", width: size, height: size * 0.8 }}>
        <div style={{ position: "absolute", left: size * 0.12, top: size * 0.1, width: size * 0.76, height: size * 0.42, display: "flex", flexWrap: "wrap-reverse", alignContent: "flex-start", fontSize: size * 0.12 }}>{items.slice(0, n).map((it, i) => <span key={i} style={{ transform: `translateY(${(1 - ease.bounce(clamp01((t - at - i * per) / 0.4))) * -200}px)` }}>{it.icon}</span>)}</div>
        <div style={{ position: "absolute", inset: 0 }}><Part name="cart" fit="contain"><svg width={size} height={size * 0.8} viewBox="0 0 100 80" style={{ position: "absolute", inset: 0 }}><path d="M2 6 L16 6 L24 52 L86 52 L94 18 L20 18" fill="none" stroke={theme.ink} strokeWidth={4} strokeLinejoin="round" /><circle cx={30} cy={66} r={7} fill={theme.ink} /><circle cx={80} cy={66} r={7} fill={theme.ink} /></svg></Part></div>
      </div>
      <div style={{ fontSize: 90, fontWeight: 800, color: theme.accent }}>₹{num(bill)}</div>
    </div>
  );
}
export const CartFill = block("CartFill", CartFillView);
/** a thermometer whose level rises to a temperature (heat, a fever, inflation running hot) */
function ThermometerView({ value, max = 50, at = 0, h = 700, unit = "°C" }: { value: number; max?: number; at?: number; h?: number; unit?: string }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / 1.8)), v = value * k, f = v / max, hot = f > 0.7;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 30, fontFamily: family(theme.display) }}>
      <svg width={h * 0.3} height={h} viewBox="0 0 60 200"><rect x={20} y={6} width={20} height={160} rx={10} fill="#fff" stroke={theme.ink} strokeWidth={3} /><rect x={25} y={10 + 150 * (1 - f)} width={10} height={150 * f + 10} fill={hot ? pc("bad") : pc("warn")} /><circle cx={30} cy={176} r={20} fill={hot ? pc("bad") : pc("warn")} stroke={theme.ink} strokeWidth={3} />{Array.from({ length: 6 }, (_, i) => <line key={i} x1={42} y1={16 + i * 28} x2={50} y2={16 + i * 28} stroke={theme.ink} strokeWidth={2} />)}</svg>
      <div style={{ fontSize: 120, fontWeight: 800, color: hot ? pc("bad") : theme.ink, marginBottom: 40 }}>{v.toFixed(1)}{unit}</div>
    </div>
  );
}
export const Thermometer = block("Thermometer", ThermometerView);

/* ================= INDIAN LIFE ================= */
/** a chai stall: a kettle steaming on a stove, glasses lined up, a sign, a bench (street life, small business) */
function ChaiStallView({ at = 0, sign = "CHAI ₹10" }: { at?: number; sign?: string }) {
  const { t, W, H } = useScene();
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: `linear-gradient(${pc("sky", "#f8d9a0")}, #fbe7c2)` }} /></Part><Background />
    <div style={{ position: "absolute", left: W * 0.2, top: H * 0.12, width: W * 0.6, height: H * 0.14, background: "repeating-linear-gradient(90deg, #e0453a 0 80px, #fff 80px 160px)", borderRadius: "0 0 30px 30px" }} />
    <div style={{ position: "absolute", left: W * 0.35, top: H * 0.27, background: "#fff", padding: "6px 28px", borderRadius: 10, fontFamily: family("bebas"), fontSize: 70, color: "#c0392b" }}>{sign}</div>
    <div style={{ position: "absolute", left: W * 0.22, top: H * 0.55, width: W * 0.56, height: H * 0.3, background: pc("wood", "#8a5a2a"), borderRadius: 12 }} />
    <div style={{ position: "absolute", left: W * 0.3, top: H * 0.38, fontSize: 170 }}><Part name="kettle" still>🫖</Part></div>
    {Array.from({ length: 6 }, (_, i) => { const k = ((t - at) * 0.5 + i / 6) % 1; return <div key={i} style={{ position: "absolute", left: W * 0.36 + Math.sin(k * 6 + i) * 20, top: H * 0.38 - k * 200, width: 50, height: 50, borderRadius: 25, background: "radial-gradient(#fff, transparent 70%)", opacity: Math.sin(k * Math.PI) * 0.8 }} />; })}
    <div style={{ position: "absolute", left: W * 0.5, top: H * 0.46, display: "flex", gap: 18, fontSize: 70 }}>{Array.from({ length: 4 }, () => "🥛").map((g, i) => <span key={i} style={{ filter: "sepia(0.8) saturate(2)" }}>{g}</span>)}</div>
    <div style={{ position: "absolute", left: W * 0.05, top: H * 0.8, width: W * 0.15, height: 30, background: pc("wood", "#6a4422"), borderRadius: 6 }} />
  </div>;
}
export const ChaiStall = block("ChaiStall", ChaiStallView);
export type TrainState = { k: number; x: number; moving: boolean; arrived: boolean };
/** the train's motion: it slides in to the platform (arrive) or pulls out and away, easing to a stop or speeding up */
export function useTrain({ at = 0, arrive = true, dur = 3, length }: { at?: number; arrive?: boolean; dur?: number; length?: number }): TrainState {
  const { t, W } = useScene();
  const L = length ?? W * 1.6, k = ease.inOut(clamp01((t - at) / dur));
  return { k, x: arrive ? lerp(W, 0, k) : lerp(0, -L, k), moving: k > 0 && k < 1, arrived: arrive && k >= 1 };
}
/** a railway platform: a train pulls in (or out), a station board, the platform edge.
    parts: background (a real station photo behind), train (a real train picture, long and side-on), board (a station
    sign), platform (the platform floor); render(s) draws your own scene from the train's position */
export function RailwayPlatform({ station = "NEW DELHI", at = 0, arrive = true, dur = 3, parts = {}, render, trainLength }: {
  station?: string; at?: number; arrive?: boolean; dur?: number; parts?: { background?: Slot; train?: Slot; board?: Slot; platform?: Slot }; render?: (s: TrainState) => ReactNode; trainLength?: number;
}) {
  const { W, H } = useScene();
  const s = useTrain({ at, arrive, dur, length: trainLength });
  if (render) return <>{render(s)}</>;
  const L = trainLength ?? W * 1.6;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0 }}>{slot(parts.background, <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#cfd8e0, #e8edf1)" }} />)}</div>
    <div style={{ position: "absolute", left: W * 0.35, top: H * 0.06 }}>{slot(parts.board, <div style={{ background: "#ffd21c", border: "6px solid #222", padding: "6px 40px", fontFamily: "Arial", fontWeight: 900, fontSize: 64, color: "#222" }}>{station}</div>, { height: 120, width: "auto" }, "contain")}</div>
    <div style={{ position: "absolute", left: s.x, top: H * 0.3, width: L, height: H * 0.36 }}>{slot(parts.train, <div style={{ position: "relative", width: "100%", height: "100%", background: "#1a4a8a", borderRadius: "40px 0 0 40px", display: "flex", gap: 30, padding: "40px 60px", boxSizing: "border-box", overflow: "hidden" }}>{Array.from({ length: 16 }, (_, i) => <div key={i} style={{ width: 120, height: 90, background: "#cfe6f5", borderRadius: 10, flex: "none" }} />)}<div style={{ position: "absolute", left: 0, right: 0, bottom: 30, height: 20, background: "#f0b43a" }} /></div>, undefined, "contain")}</div>
    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.66, height: 16, background: "#333" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.7, bottom: 0 }}>{slot(parts.platform, <div style={{ width: "100%", height: "100%", background: "#b5aea4" }}><div style={{ height: 24, background: "#ffd21c" }} /></div>)}</div>
  </div>;
}
/** a diya (oil lamp) whose flame flickers, with a soft glow (Diwali, hope, a small light) */
function DiyaView({ size = 220, at = 0 }: { size?: number; at?: number }) {
  const { t, b } = useIn(at, 0.5);
  const fl = 1 + Math.sin(t * 17) * 0.06 + Math.sin(t * 7) * 0.05;
  return <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", transform: `scale(${b})` }}><circle cx={50} cy={40} r={34 * fl} fill="rgb(255 190 80/0.35)" /><path d={`M50 ${20 - fl * 6} Q60 38 50 50 Q40 38 50 ${20 - fl * 6} Z`} fill="#ffb02e" /><path d="M50 32 Q55 42 50 50 Q45 42 50 32 Z" fill="#fff6b0" /><path d="M10 56 Q50 92 90 56 Q70 66 50 64 Q30 66 10 56 Z" fill="#c8641c" /><path d="M10 56 Q50 70 90 56" fill="none" stroke="#e8a04a" strokeWidth={3} /></svg>;
}
export const Diya = block("Diya", DiyaView);
/** a rangoli that draws itself petal ring by petal ring in festival colours */
function RangoliView({ size = 600, at = 0, rings = 4 }: { size?: number; at?: number; rings?: number }) {
  const { t } = useScene();
  const cols = ["#e0453a", "#f0b43a", "#3fb35a", "#2a6ad9", "#c83ac8", "#ff8a1c"], c = size / 2;
  return <svg width={size} height={size}>{Array.from({ length: rings }, (_, r) => { const k = ease.back(clamp01((t - at - r * 0.5) / 0.6)), n = 8 + r * 4, rr = (c * (r + 1)) / (rings + 0.5); return <g key={r} transform={`translate(${c} ${c}) scale(${k}) rotate(${r * 11 + t * (r % 2 ? 4 : -4)})`}>{Array.from({ length: n }, (_, i) => <ellipse key={i} cx={0} cy={-rr * 0.75} rx={rr * 0.16} ry={rr * 0.3} fill={cols[(r + i) % cols.length]} transform={`rotate(${(i * 360) / n})`} />)}</g>; })}<circle cx={c} cy={c} r={c * 0.12} fill="#fff" /></svg>;
}
export const Rangoli = block("Rangoli", RangoliView);

/* ================= SOCIAL MEDIA ================= */
const card: CSSProperties = { background: "#fff", borderRadius: 22, boxShadow: shadow, fontFamily: "Inter, Arial, sans-serif", color: "#0f1419", boxSizing: "border-box" };
/** a thread of posts (tweets): each slides in with its likes and reposts counting up */
function PostThreadView({ name = "Drishyya", handle = "@drishyya", posts, at = 0, per = 1, w = 1000 }: { name?: string; handle?: string; posts: { text: string; likes?: number }[]; at?: number; per?: number; w?: number }) {
  const { t } = useScene();
  return <div style={{ width: w, display: "flex", flexDirection: "column", gap: 0 }}>{posts.map((p, i) => { const k = ease.out(clamp01((t - at - i * per) / 0.5)), c = clamp01((t - at - i * per - 0.4) / 1.2); return <div key={i} style={{ ...card, borderRadius: i === 0 ? "22px 22px 0 0" : i === posts.length - 1 ? "0 0 22px 22px" : 0, padding: "24px 30px", borderBottom: "1px solid #eee", opacity: k, transform: `translateY(${(1 - k) * 30}px)`, display: "flex", gap: 20 }}>
    <div style={{ width: 70, height: 70, borderRadius: 35, background: "#1d9bf0", flex: "none", overflow: "hidden" }}><Part name="avatar">{null}</Part></div><div style={{ flex: 1 }}><div style={{ fontSize: 26 }}><b>{name}</b> <span style={{ color: "#536471" }}>{handle} · {i + 1}/{posts.length}</span></div><div style={{ fontSize: 32, lineHeight: 1.35, margin: "8px 0 12px" }}>{p.text}</div><div style={{ display: "flex", gap: 60, fontSize: 24, color: "#536471" }}><span>💬 {Math.round((p.likes ?? 1200) * 0.04 * c)}</span><span>🔁 {Math.round((p.likes ?? 1200) * 0.2 * c)}</span><span style={{ color: "#f91880" }}>♥ {num(Math.round((p.likes ?? 1200) * c))}</span></div></div></div>; })}</div>;
}
export const PostThread = block("PostThread", PostThreadView);
/** a Reddit-style post: the subreddit, title, body, and an upvote count climbing */
function ForumPostView({ community = "r/india", title, body, votes = 12400, at = 0, w = 1000 }: { community?: string; title: string; body?: string; votes?: number; at?: number; w?: number }) {
  const { t, u } = useIn(at, 0.5);
  const v = Math.round(votes * clamp01((t - at - 0.3) / 2));
  return <div style={{ ...card, width: w, padding: 30, display: "flex", gap: 24, opacity: u }}><div style={{ textAlign: "center", fontSize: 30, fontWeight: 800, color: "#ff4500" }}>▲<div style={{ fontSize: 26, color: "#1a1a1b" }}>{v > 999 ? `${(v / 1000).toFixed(1)}k` : v}</div><span style={{ color: "#878a8c" }}>▼</span></div><div><div style={{ fontSize: 22, color: "#787c7e" }}><b style={{ color: "#1a1a1b" }}>{community}</b> · Posted by u/curious_mind</div><div style={{ fontSize: 40, fontWeight: 700, margin: "10px 0" }}>{title}</div>{body && <div style={{ fontSize: 28, color: "#1a1a1b", lineHeight: 1.4 }}>{body}</div>}</div></div>;
}
export const ForumPost = block("ForumPost", ForumPostView);
/** a forwarded WhatsApp message: the "Forwarded many times" mark, the text, then a FAKE or VERIFIED stamp */
function ForwardedMessageView({ text, verdict, at = 0, stampAt = 2, w = 820 }: { text: string; verdict?: "fake" | "true"; at?: number; stampAt?: number; w?: number }) {
  const { t, u } = useIn(at, 0.5);
  const s = verdict ? ease.back(clamp01((t - at - stampAt) / 0.3)) : 0;
  return <div style={{ position: "relative", width: w, background: "#d9fdd3", borderRadius: 20, padding: "22px 28px", boxShadow: shadow, fontFamily: "Inter, Arial", opacity: u, transform: `translateY(${(1 - u) * 30}px)` }}><div style={{ fontSize: 22, color: "#667781", fontStyle: "italic" }}>↪↪ Forwarded many times</div><div style={{ fontSize: 32, color: "#111b21", lineHeight: 1.4, marginTop: 8 }}>{text}</div><div style={{ textAlign: "right", fontSize: 20, color: "#667781" }}>9:41 PM ✓✓</div>
    {verdict && s > 0 && <div style={{ position: "absolute", right: 30, top: "35%", fontSize: 72, fontWeight: 900, color: verdict === "fake" ? "#d42a2a" : "#2a8a3a", border: `8px solid ${verdict === "fake" ? "#d42a2a" : "#2a8a3a"}`, padding: "0 20px", borderRadius: 12, transform: `rotate(-12deg) scale(${2 - s})`, opacity: s, background: "rgb(255 255 255/0.7)" }}>{verdict === "fake" ? "FAKE" : "TRUE"}</div>}</div>;
}
export const ForwardedMessage = block("ForwardedMessage", ForwardedMessageView);
/** a grid of video thumbnails (a channel page, search results) that load in, one gets the cursor and a hover lift */
function ThumbnailGridView({ items, at = 0, cols = 3, w = 1600, pick }: { items: { title: string; image?: string; views?: string }[]; at?: number; cols?: number; w?: number; pick?: number }) {
  const { t, theme } = useScene();
  const tw = (w - (cols - 1) * 24) / cols;
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tw}px)`, gap: 24, fontFamily: "Roboto, Inter, Arial" }}>{items.map((it, i) => { const k = ease.out(clamp01((t - at - i * 0.12) / 0.4)), lift = pick === i ? ease.out(clamp01((t - at - items.length * 0.12 - 0.3) / 0.4)) : 0; return <div key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 30 - lift * 14}px) scale(${1 + lift * 0.04})` }}>
    <div style={{ width: tw, height: tw * 0.5625, borderRadius: 14, background: it.image ? "#222" : [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8"][i % 4], overflow: "hidden", position: "relative", boxShadow: lift ? "0 16px 30px rgb(0 0 0/0.3)" : undefined }}>{it.image && <Img src={src(it.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}<span style={{ position: "absolute", right: 8, bottom: 8, background: "rgb(0 0 0/0.8)", color: "#fff", fontSize: 18, padding: "2px 8px", borderRadius: 4 }}>{8 + i}:{String(10 + i * 7).slice(-2)}</span></div>
    <div style={{ fontSize: 26, fontWeight: 700, color: theme.ink, marginTop: 10, lineHeight: 1.25 }}>{it.title}</div><div style={{ fontSize: 20, color: theme.muted }}>{it.views ?? `${(i + 1) * 120}K views`} · 2 days ago</div></div>; })}</div>;
}
export const ThumbnailGrid = block("ThumbnailGrid", ThumbnailGridView);
/** a phone's home screen: app icons pop in, one gets a notification badge and is tapped open */
function HomeScreenView({ apps = ["📷", "💬", "🗺️", "🎵", "📺", "🛒", "🏦", "📚", "⚙️", "📞", "📧", "☀️"], badge = 1, tap, at = 0, h = 900 }: { apps?: string[]; badge?: number; tap?: number; at?: number; h?: number }) {
  const { t } = useScene();
  const w = h * 0.49, opened = tap !== undefined && t > tap, ok = tap !== undefined ? ease.out(clamp01((t - tap) / 0.5)) : 0;
  return <div style={{ width: w, height: h, borderRadius: w * 0.14, background: "#111", padding: w * 0.035, boxSizing: "border-box", boxShadow: "0 30px 60px rgb(0 0 0/0.4)" }}><div style={{ position: "relative", width: "100%", height: "100%", borderRadius: w * 0.11, overflow: "hidden", background: "linear-gradient(160deg, #4a3ad8, #d83a8a)" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: w * 0.05, padding: w * 0.08, paddingTop: w * 0.2 }}>{apps.map((a, i) => <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: "24%", background: "rgb(255 255 255/0.92)", display: "grid", placeItems: "center", overflow: "visible", fontSize: w * 0.1, transform: `scale(${ease.back(clamp01((t - at - i * 0.05) / 0.3))})` }}><Part name="app" item={a} i={i}>{slot(a, a, { width: "100%", height: "100%", borderRadius: "24%" })}</Part>{i === badge && <span style={{ position: "absolute", right: -6, top: -6, minWidth: 30, height: 30, borderRadius: 15, background: "#ff3b30", color: "#fff", fontSize: 18, fontWeight: 800, display: "grid", placeItems: "center", fontFamily: "Arial" }}>3</span>}</div>)}</div>
    {opened && <div style={{ position: "absolute", inset: 0, background: "#fff", transform: `scale(${ok})`, transformOrigin: `${((badge % 4) + 0.5) * 25}% 25%`, display: "grid", placeItems: "center", fontSize: w * 0.25 }}>{apps[badge]}</div>}
  </div></div>;
}
export const HomeScreen = block("HomeScreen", HomeScreenView);
/** an Instagram-style post: the photo, a double-tap heart that bursts, likes counting, the caption */
function PhotoPostView({ image, user = "drishyya", caption = "", likes = 24800, heart, at = 0, w = 760 }: { image?: string; user?: string; caption?: string; likes?: number; heart?: number; at?: number; w?: number }) {
  const { t, theme, u } = useIn(at, 0.5);
  const hk = heart !== undefined ? clamp01((t - heart) / 0.8) : 0, c = clamp01((t - (heart ?? at) ) / 1.5);
  return <div style={{ ...card, width: w, overflow: "hidden", opacity: u }}><div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, fontSize: 26, fontWeight: 700 }}><span style={{ width: 50, height: 50, borderRadius: 25, background: "linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)" }} />{user}</div>
    <div style={{ position: "relative", width: w, height: w, background: theme.accent2 }}>{image && <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}{hk > 0 && hk < 1 && <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%,-50%) scale(${ease.back(clamp01(hk * 3)) * (1 - Math.max(0, hk - 0.7) * 2)})`, fontSize: w * 0.3, opacity: 1 - Math.max(0, hk - 0.6) * 2.5 }}>❤️</div>}</div>
    <div style={{ padding: 18, fontSize: 26 }}><div style={{ fontSize: 34 }}>{hk > 0 ? "❤️" : "♡"} 💬 ↗</div><b>{num(Math.round(likes * c))} likes</b><div style={{ marginTop: 6 }}><b>{user}</b> {caption}</div></div></div>;
}
export const PhotoPost = block("PhotoPost", PhotoPostView);

/* ================= SELF-HELP and PSYCHOLOGY ================= */
/** a 30-day habit grid: days tick off one by one, a streak counter grows; `missed` days stay empty */
function HabitGridView({ days = 30, missed = [], at = 0, per = 0.08, title = "Read 10 pages", w = 1100 }: { days?: number; missed?: number[]; at?: number; per?: number; title?: string; w?: number }) {
  const { t, theme } = useScene();
  const done = Math.floor(Math.max(0, t - at) / per), miss = new Set(missed);
  let streak = 0; for (let d = 0; d < Math.min(done, days); d++) streak = miss.has(d + 1) ? 0 : streak + 1;
  return <div style={{ width: w, fontFamily: family(theme.font) }}><div style={{ display: "flex", justifyContent: "space-between", fontFamily: family(theme.display), fontSize: 50, fontWeight: 800, color: theme.ink, marginBottom: 20 }}><span>{title}</span><span style={{ color: theme.accent }}>🔥 {streak}</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 12 }}>{Array.from({ length: days }, (_, d) => { const on = d < done, m = miss.has(d + 1); return <div key={d} style={{ aspectRatio: "1", borderRadius: 14, background: on && !m ? pc("good") : "rgb(0 0 0/0.06)", border: on && m ? `4px dashed ${pc("bad")}` : undefined, color: "#fff", display: "grid", placeItems: "center", fontSize: 30, fontWeight: 800, transform: on && d === done - 1 ? "scale(1.12)" : undefined }}><Part name="day" item={{ day: d + 1, done: on && !m, missed: on && m }} i={d}>{on && !m ? "✓" : <span style={{ color: theme.muted, fontSize: 20 }}>{d + 1}</span>}</Part></div>; })}</div></div>;
}
export const HabitGrid = block("HabitGrid", HabitGridView);
export type MoodState = { v: number; x: number; w: number };
/** the mood meter's motion: a value sliding from `from` to `to` (0 low … 1 great) over `dur` */
export function useMood({ from = 0.15, to = 0.85, at = 0, dur = 2, w = 1200 }: { from?: number; to?: number; at?: number; dur?: number; w?: number }): MoodState {
  const { t } = useScene();
  const v = lerp(from, to, ease.inOut(clamp01((t - at) / dur)));
  return { v, x: v * w, w };
}
/** a mood meter: a marker slides along from low to great (or the reverse); the default marker is a face whose smile
    follows the value. parts: track (your own bar or a picture), marker (a photo, an emoji, a character), low, high;
    marker can also be a function of the value, e.g. (v) => v > 0.5 ? happyPhoto : sadPhoto; render(s) draws it all */
export function MoodMeter({ from = 0.15, to = 0.85, at = 0, dur = 2, w = 1200, parts = {}, marker, render }: {
  from?: number; to?: number; at?: number; dur?: number; w?: number; parts?: { track?: Slot; low?: Slot; high?: Slot; marker?: Slot };
  marker?: (v: number) => ReactNode; render?: (s: MoodState) => ReactNode;
}) {
  const { theme } = useScene();
  const s = useMood({ from, to, at, dur, w }), v = s.v;
  if (render) return <>{render(s)}</>;
  const face = <div style={{ width: 160, height: 160, borderRadius: 80, background: "#f2c9a0", overflow: "hidden" }}><svg width={160} height={160} viewBox="0 0 100 100"><circle cx={35} cy={42} r={6} fill="#2a2320" /><circle cx={65} cy={42} r={6} fill="#2a2320" /><path d={`M30 ${70 - (v - 0.5) * 12} Q50 ${70 + (v - 0.5) * 40} 70 ${70 - (v - 0.5) * 12}`} fill="none" stroke="#7a2a2a" strokeWidth={6} strokeLinecap="round" /></svg></div>;
  return <div style={{ width: w, position: "relative", height: 300, fontFamily: family(theme.font) }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 200, height: 40, borderRadius: 20, overflow: "hidden" }}>{slot(parts.track, <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #6a7ad8, #9aa3ad, #f0c43a, #3fb35a)" }} />)}</div>
    <div style={{ position: "absolute", left: s.x, top: 40, width: 160, height: 160, transform: "translateX(-50%)" }}>{marker ? marker(v) : slot(parts.marker, face, undefined, "contain")}</div>
    <div style={{ position: "absolute", left: 0, top: 250, fontSize: 28, color: theme.muted }}>{slot(parts.low, "low", { height: 60, width: "auto" }, "contain")}</div><div style={{ position: "absolute", right: 0, top: 250, fontSize: 28, color: theme.muted }}>{slot(parts.high, "great", { height: 60, width: "auto" }, "contain")}</div></div>;
}
/** stairs to a goal: a person climbs step by step, each step labelled, to a flag at the top */
function GoalStairsView({ steps, at = 0, per = 0.9, w = 1400, h = 800, goal = "🏁" }: { steps: string[]; at?: number; per?: number; w?: number; h?: number; goal?: string }) {
  const { t, theme } = useScene();
  const n = steps.length, sw = w / (n + 1), sh = (h - 200) / n, q = clamp01((t - at) / (per * n)) * n, i = Math.min(n - 1, Math.floor(q)), f = ease.inOut(q - i);
  const px = sw * (i + 0.5 + f), py = h - sh * (i + Math.min(1, f * 1.4)) - 10;
  return <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.font) }}>
    {steps.map((s, j) => <div key={j} style={{ position: "absolute", left: sw * j, top: h - sh * (j + 1), width: sw * (n - j + 1), height: sh * (j + 1), background: j <= q ? theme.accent : "#d5dae0", borderTop: "6px solid rgb(0 0 0/0.15)" }}><div style={{ padding: 14, fontSize: 26, fontWeight: 800, color: j <= q ? "#fff" : theme.muted, width: sw - 20 }}>{s}</div></div>)}
    <div style={{ position: "absolute", left: sw * n + sw * 0.3, top: h - sh * n - 150, fontSize: 120, width: 140, height: 140 }}><Part name="goal" fit="contain">{slot(goal, goal, undefined, "contain")}</Part></div>
    <div style={{ position: "absolute", left: px, top: py, transform: "translate(-50%,-100%)" }}><Part name="climber" item={{ done: q >= n }}><Character action={q >= n ? "cheer" : "climb"} emotion={q >= n ? "laughing" : "proud"} height={200} /></Part></div>
  </div>;
}
export const GoalStairs = block("GoalStairs", GoalStairsView);

/* ================= CLIMATE and SPACE ================= */
/** the sea rises on a coast: water creeps up past marked years, a town at the edge goes under (sea-level rise, floods) */
function SeaLevelView({ marks = ["2000", "2050", "2100"], at = 0, dur = 4, rise = 0.35 }: { marks?: string[]; at?: number; dur?: number; rise?: number }) {
  const { t, W, H, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), level = H * (0.72 - rise * k);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: family(theme.font) }}>
    <Part name="sky" still><div style={{ position: "absolute", inset: 0, background: pc("sky", "#bfe3f5") }} /></Part><Background />
    <Part name="coast" still><svg width={W} height={H} style={{ position: "absolute", inset: 0 }}><path d={`M${W * 0.45} ${H} L${W * 0.55} ${H * 0.55} L${W} ${H * 0.4} L${W} ${H} Z`} fill={pc("sand", "#d9b37a")} /></svg></Part>
    {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: W * (0.62 + i * 0.08), top: H * (0.42 - i * 0.015), width: 90, height: 110, background: "#f4e3c3", border: "4px solid #8a5a2a" }}><div style={{ width: 0, height: 0, margin: "-60px -10px 0", borderLeft: "55px solid transparent", borderRight: "55px solid transparent", borderBottom: "50px solid #b5332a" }} /></div>)}
    <div style={{ position: "absolute", left: 0, right: 0, top: level, bottom: 0, background: `linear-gradient(${pc("water", "#2a7fb8")}, #0a2a4a)`, opacity: 0.9 }}><svg width={W} height={30} style={{ position: "absolute", top: -14 }}><path d={`M0 15 ${Array.from({ length: 30 }, (_, i) => `Q${i * 70 + 35} ${15 + Math.sin(t * 3 + i) * 10} ${(i + 1) * 70} 15`).join(" ")}`} fill="none" stroke="#fff" strokeWidth={4} opacity={0.6} /></svg></div>
    {marks.map((m, i) => { const y = H * (0.72 - (rise * i) / Math.max(1, marks.length - 1)); return <div key={m} style={{ position: "absolute", left: 40, top: y - 20, fontSize: 30, fontWeight: 800, color: theme.ink, borderBottom: "3px dashed " + theme.ink, width: W * 0.4 }}>{m}</div>; })}
  </div>;
}
export const SeaLevel = block("SeaLevel", SeaLevelView);
/** a glacier melts and shrinks back up its valley, drips falling, years ticking (before and after) */
function GlacierView({ from = "1990", to = "2025", at = 0, dur = 4 }: { from?: string; to?: string; at?: number; dur?: number }) {
  const { t, W, H, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), tip = lerp(H * 0.95, H * 0.5, k);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: family(theme.display) }}>
    <Part name="sky" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#9ccbe8, #e4f1fb)" }} /></Part><Background />
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}><Part name="valley" still><path d={`M0 ${H * 0.3} L${W * 0.35} ${H * 0.1} L${W * 0.5} ${H * 0.25} L${W * 0.65} ${H * 0.08} L${W} ${H * 0.3} L${W} ${H} L${W * 0.62} ${H} L${W * 0.55} ${H * 0.4} L${W * 0.45} ${H * 0.4} L${W * 0.38} ${H} L0 ${H} Z`} fill="#6a7a8a" /></Part>
      <path d={`M${W * 0.42} ${H * 0.2} Q${W * 0.5} ${H * 0.15} ${W * 0.58} ${H * 0.2} L${W * 0.56} ${tip} Q${W * 0.5} ${tip + 40} ${W * 0.44} ${tip} Z`} fill="#eaf6fd" stroke="#9ccbe8" strokeWidth={4} />
      <path d={`M${W * 0.44} ${tip} L${W * 0.38} ${H} L${W * 0.62} ${H} L${W * 0.56} ${tip} Z`} fill="#8a7a6a" opacity={k} /></svg>
    {Array.from({ length: 6 }, (_, i) => { const q = ((t - at) * 0.8 + i / 6) % 1; return <div key={i} style={{ position: "absolute", left: W * (0.45 + rand(i) * 0.1), top: tip + q * 160, width: 8, height: 16, borderRadius: 4, background: "#4a9ad8", opacity: 1 - q }} />; })}
    <div style={{ position: "absolute", right: 60, top: 40, fontSize: 90, fontWeight: 800, color: theme.ink }}>{k < 0.5 ? from : to}</div>
  </div>;
}
export const Glacier = block("Glacier", GlacierView);
/** a rocket launch: countdown, ignition smoke, lift-off, and the stages separating as it climbs */
function RocketLaunchView({ at = 0, count = 3, stages = 2 }: { at?: number; count?: number; stages?: number }) {
  const { t, W, H } = useScene();
  const s = t - at, lift = Math.max(0, s - count), y = H * 0.55 - lift * lift * 120, sep = (i: number) => Math.max(0, lift - 1.5 - i * 1.2);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: family("bebas") }}>
    <Part name="sky" still><div style={{ position: "absolute", inset: 0, background: `linear-gradient(${lift > 2 ? "#0a1030" : "#7ab4e8"}, #e4f1fb)` }} /></Part><Background />
    {s < count && s >= 0 && <div style={{ position: "absolute", left: 80, top: 60, fontSize: 200, color: "#fff", textShadow: "0 6px 0 #222" }}>{Math.ceil(count - s)}</div>}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.12, background: "#6a737d" }} />
    {Array.from({ length: stages }, (_, i) => sep(i) > 0 && <div key={i} style={{ position: "absolute", left: W / 2 - 40 + sep(i) * 40 * (i % 2 ? 1 : -1), top: y + 260 - i * 90 + sep(i) * sep(i) * 160, width: 80, height: 90, background: "#c0c6cc", borderRadius: 8, transform: `rotate(${sep(i) * 60 * (i % 2 ? 1 : -1)}deg)` }} />)}
    <div style={{ position: "absolute", left: W / 2 - 40, top: y, width: 80, height: 260 - Array.from({ length: stages }, (_, i) => i).filter((i) => sep(i) > 0).length * 90 }}>
      <div style={{ position: "absolute", left: -40, top: -70, width: 160, height: "calc(100% + 70px)" }}><Part name="rocket" fit="contain"><div style={{ paddingLeft: 40 }}><div style={{ width: 0, height: 0, borderLeft: "40px solid transparent", borderRight: "40px solid transparent", borderBottom: "70px solid #e0453a" }} /><div style={{ width: 80, height: 260, background: "#f4f6f8" }} /></div></Part></div>
      {s > count - 0.6 && <div style={{ position: "absolute", left: 10, top: "100%", width: 60, height: 120 + Math.sin(t * 40) * 20, background: "linear-gradient(#fff6b0, #ff9a1c, transparent)", borderRadius: "0 0 50% 50%" }} />}
    </div>
    {s > count - 0.8 && Array.from({ length: 12 }, (_, i) => { const q = ((s - count + 0.8) * 0.6 + i / 12) % 1; return <div key={i} style={{ position: "absolute", left: W / 2 + (rand(i) - 0.5) * 600 * q, bottom: H * 0.1 + q * 120, width: 140 + q * 200, height: 140 + q * 200, borderRadius: "50%", background: "radial-gradient(#eee, transparent 70%)", opacity: (1 - q) * (lift < 3 ? 1 : 0.3), transform: "translate(-50%, 50%)" }} />; })}
  </div>;
}
export const RocketLaunch = block("RocketLaunch", RocketLaunchView);
/** a star map: stars twinkle, then the constellation's lines draw between them and its name appears */
function StarMapView({ name = "Orion", stars = [[0.3, 0.2], [0.65, 0.25], [0.45, 0.48], [0.5, 0.5], [0.55, 0.52], [0.32, 0.8], [0.7, 0.78]], lines = [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]], at = 0, w = 1100, h = 800 }: { name?: string; stars?: [number, number][]; lines?: [number, number][]; at?: number; w?: number; h?: number }) {
  const { t, theme } = useScene();
  return <div style={{ position: "relative", width: w, height: h, borderRadius: 20, overflow: "hidden" }}>
    <Part name="sky"><div style={{ position: "absolute", inset: 0, background: "radial-gradient(#1a2a5a, #050818)" }} /></Part>
    {Array.from({ length: 120 }, (_, i) => <div key={i} style={{ position: "absolute", left: rand(i) * w, top: rand(i + 200) * h, width: 3, height: 3, borderRadius: 2, background: "#fff", opacity: 0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i)) }} />)}
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>{lines.map(([a, b], i) => { const k = ease.inOut(clamp01((t - at - 0.6 - i * 0.25) / 0.5)); return <line key={i} x1={stars[a][0] * w} y1={stars[a][1] * h} x2={lerp(stars[a][0], stars[b][0], k) * w} y2={lerp(stars[a][1], stars[b][1], k) * h} stroke="#9cc4ff" strokeWidth={3} opacity={0.8} />; })}
      {stars.map(([x, y], i) => <circle key={i} cx={x * w} cy={y * h} r={10 + Math.sin(t * 3 + i) * 2} fill="#fff" style={{ filter: "drop-shadow(0 0 10px #9cc4ff)" }} />)}</svg>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, textAlign: "center", fontFamily: family(theme.display), fontSize: 70, color: "#fff", opacity: clamp01((t - at - 0.6 - lines.length * 0.25) / 0.5) }}>{name}</div>
  </div>;
}
export const StarMap = block("StarMap", StarMapView);

/* ================= DEVICES and FRAMES ================= */
/** a tablet showing whatever is inside (landscape) */
export function Tablet({ children, at = 0, w = 1100 }: { children?: ReactNode; at?: number; w?: number }) {
  const { u } = useIn(at, 0.7);
  return <div style={{ width: w, height: w * 0.7, borderRadius: 40, background: "#1a1a1a", padding: 28, boxSizing: "border-box", boxShadow: "0 30px 60px rgb(0 0 0/0.4)", transform: `translateY(${(1 - u) * 200}px) perspective(2000px) rotateX(${(1 - u) * 20}deg)` }}><div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 16, overflow: "hidden", background: "#f6f7f9" }}>{children}</div></div>;
}
/** a smartwatch on a wrist: the time, a ring filling, a heart rate */
function WatchView({ size = 360, at = 0, steps = 8420, goal = 10000 }: { size?: number; at?: number; steps?: number; goal?: number }) {
  const { t, b } = useIn(at, 0.5);
  const k = ease.out(clamp01((t - at - 0.3) / 1.5)), f = (steps / goal) * k;
  return <div style={{ position: "relative", width: size, height: size * 1.6, display: "flex", alignItems: "center", transform: `scale(${b})` }}><div style={{ position: "absolute", left: size * 0.25, right: size * 0.25, top: 0, bottom: 0, background: "#333", borderRadius: 20 }} /><div style={{ position: "relative", width: size, height: size, borderRadius: size * 0.28, background: "#000", border: "14px solid #555", boxSizing: "border-box", display: "grid", placeItems: "center", color: "#fff", fontFamily: "Arial" }}>
    <svg width={size * 0.8} height={size * 0.8} style={{ position: "absolute" }}><circle cx={size * 0.4} cy={size * 0.4} r={size * 0.34} fill="none" stroke="#333" strokeWidth={18} /><circle cx={size * 0.4} cy={size * 0.4} r={size * 0.34} fill="none" stroke="#3ff28a" strokeWidth={18} strokeLinecap="round" pathLength={100} strokeDasharray={`${f * 100} 200`} transform={`rotate(-90 ${size * 0.4} ${size * 0.4})`} /></svg>
    <div style={{ textAlign: "center" }}><div style={{ fontSize: size * 0.16, fontWeight: 700 }}>{num(Math.round(steps * k))}</div><div style={{ fontSize: size * 0.07, color: "#3ff28a" }}>steps</div><div style={{ fontSize: size * 0.07, color: "#ff5a5a" }}>♥ {72 + Math.round(Math.sin(t) * 3)}</div></div></div></div>;
}
export const Watch = block("Watch", WatchView);
/** a wall of TV screens (a control room, a news wall): each screen flickers on with its own picture */
function TvWallView({ screens, cols = 3, at = 0, w = 1500 }: { screens: ReactNode[]; cols?: number; at?: number; w?: number }) {
  const { t } = useScene();
  const sw = w / cols - 12, sh = sw * 0.5625;
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${sw}px)`, gap: 12, background: "#111", padding: 12, borderRadius: 12 }}>{screens.map((s, i) => { const on = t > at + i * 0.15, fl = on && t - at - i * 0.15 < 0.2 ? Math.floor(t * 30) % 2 : 1; return <div key={i} style={{ width: sw, height: sh, background: "#000", position: "relative", overflow: "hidden", opacity: on ? fl : 0.15, border: "3px solid #333" }}>{s}<div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgb(0 0 0/0.18) 0 2px, transparent 2px 4px)" }} /></div>; })}</div>;
}
export const TvWall = block("TvWall", TvWallView);
/** a museum placard beside an object: title, date, a short description and the accession number */
function MuseumPlacardView({ title, date, text, at = 0, w = 640 }: { title: string; date?: string; text: string; at?: number; w?: number }) {
  const { u } = useIn(at, 0.6);
  return <div style={{ width: w, background: "#f6f2ea", padding: "34px 40px", boxShadow: "0 8px 20px rgb(0 0 0/0.2)", fontFamily: family("playfair"), color: "#2a2620", opacity: u, transform: `translateY(${(1 - u) * 20}px)`, borderLeft: "8px solid #8a6a3a" }}><div style={{ fontSize: 46, fontWeight: 700 }}>{title}</div>{date && <div style={{ fontSize: 26, fontStyle: "italic", color: "#6a5a4a", marginTop: 4 }}>{date}</div>}<div style={{ fontFamily: family("lora"), fontSize: 26, lineHeight: 1.5, marginTop: 16 }}>{text}</div><div style={{ fontFamily: "monospace", fontSize: 18, color: "#8a7a6a", marginTop: 18 }}>Acc. no. 1947.08.15</div></div>;
}
export const MuseumPlacard = block("MuseumPlacard", MuseumPlacardView);
/** a magazine cover: the masthead, a cover photo, cover lines sliding in */
function MagazineCoverView({ title = "TIME", image, headline, lines = [], at = 0, w = 640 }: { title?: string; image?: string; headline: string; lines?: string[]; at?: number; w?: number }) {
  const { t, theme, u } = useIn(at, 0.6);
  return <div style={{ position: "relative", width: w, height: w * 1.32, background: image ? "#222" : theme.accent2, overflow: "hidden", boxShadow: "0 20px 40px rgb(0 0 0/0.35)", opacity: u, border: `${w * 0.03}px solid #e0101e` }}>
    {image && <Img src={src(image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", fontFamily: "Georgia, serif", fontSize: Math.min(w * 0.26, (w * 1.55) / Math.max(1, title.length)), fontWeight: 900, color: "#e0101e", lineHeight: 1, whiteSpace: "nowrap" }}>{title}</div>
    <div style={{ position: "absolute", left: w * 0.06, right: w * 0.06, bottom: w * 0.08, fontFamily: family(theme.display), fontSize: w * 0.1, fontWeight: 800, color: "#fff", textShadow: "0 4px 12px rgb(0 0 0/0.6)" }}>{headline}</div>
    <div style={{ position: "absolute", left: w * 0.06, top: w * 0.32, fontSize: w * 0.04, color: "#fff", fontWeight: 700, textShadow: "0 2px 6px #000" }}>{lines.map((l, i) => <div key={i} style={{ opacity: clamp01((t - at - 0.5 - i * 0.3) / 0.3), marginBottom: 10 }}>{l}</div>)}</div>
  </div>;
}
export const MagazineCover = block("MagazineCover", MagazineCoverView);
/** a newspaper front page: masthead, date line, the lead headline, a photo and columns of text */
function FrontPageView({ paper = "The Daily Chronicle", date = "Thursday, 15 August 1947", headline, sub, image, at = 0, w = 1100 }: { paper?: string; date?: string; headline: string; sub?: string; image?: string; at?: number; w?: number }) {
  const { u } = useIn(at, 0.7);
  return <div style={{ width: w, height: w * 1.25, background: "#f1ead8", padding: w * 0.04, boxSizing: "border-box", fontFamily: "Georgia, serif", color: "#1a1610", boxShadow: "0 24px 50px rgb(0 0 0/0.35)", transform: `rotate(${(1 - u) * 12 - 1.5}deg) scale(${0.7 + 0.3 * u})`, opacity: u }}>
    <div style={{ textAlign: "center", fontSize: w * 0.075, fontWeight: 900, fontFamily: "'Old English Text MT', Georgia, serif", borderBottom: "4px double #1a1610" }}>{paper}</div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: w * 0.016, borderBottom: "2px solid #1a1610", padding: "6px 0" }}><span>{date}</span><span>Price: 2 Annas</span></div>
    <div style={{ fontSize: w * 0.075, fontWeight: 900, lineHeight: 1.05, textAlign: "center", margin: "18px 0 8px", textTransform: "uppercase" }}>{headline}</div>
    {sub && <div style={{ fontSize: w * 0.026, textAlign: "center", fontStyle: "italic", marginBottom: 14 }}>{sub}</div>}
    <div style={{ display: "flex", gap: 20 }}>
      <div style={{ flex: 1.4 }}>{image ? <Img src={src(image)} style={{ width: "100%", height: w * 0.42, objectFit: "cover", filter: "grayscale(1) contrast(1.2)" }} /> : <div style={{ height: w * 0.42, background: "#cfc6b0" }} />}</div>
      <div style={{ flex: 1, display: "grid", gap: 8 }}>{Array.from({ length: 14 }, (_, i) => <div key={i} style={{ height: 8, background: "#9a907c", width: `${70 + rand(i) * 30}%` }} />)}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 20 }}>{Array.from({ length: 3 }, (_, c) => <div key={c} style={{ display: "grid", gap: 7 }}>{Array.from({ length: 12 }, (_, i) => <div key={i} style={{ height: 7, background: "#a89e8a", width: `${75 + rand(c * 20 + i) * 25}%` }} />)}</div>)}</div>
  </div>;
}
export const FrontPage = block("FrontPage", FrontPageView);

/* ================= VOX-STYLE COLLAGE ================= */
export type CollageLayer = { image?: string; node?: ReactNode; x: number; y: number; w: number; h?: number; rot?: number; depth?: number;
  kind?: "cutout" | "photo" | "torn" | "halftone" | "note" | "scribble" | "marker"; enter?: "drop" | "slide" | "pop" | "none"; at?: number; text?: string; color?: string };
/** a Vox-style collage built from LAYERS, so every piece moves by itself: archive photos printed in halftone, people cut
    out with a white edge, torn paper strips, sticky notes, red marker circles and scribbles, on paper or grid ground.
    Each layer drifts by its `depth` (parallax: near ones move more) and comes in its own way at its own time; give any
    layer a `node` to put a block or a motion there. Wrap the whole thing in <Camera> to push in. */
export function Collage({ layers, ground = "grid", drift = 1, children }: { layers: CollageLayer[]; ground?: "grid" | "paper" | "dark" | "kraft"; drift?: number; children?: ReactNode }) {
  const { t, W, H, theme } = useScene();
  const bg: Record<string, CSSProperties> = {
    grid: { background: "#f1ede4", backgroundImage: "linear-gradient(rgb(0 0 0/0.06) 2px, transparent 2px), linear-gradient(90deg, rgb(0 0 0/0.06) 2px, transparent 2px)", backgroundSize: "60px 60px" },
    paper: { background: "radial-gradient(circle, #f6f1e4, #e4dac4)" }, dark: { background: "radial-gradient(circle, #2a2a30, #0e0e12)" }, kraft: { background: "radial-gradient(circle, #c9a878, #a8875a)" },
  };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...bg[ground] }}>
      {layers.map((l, i) => {
        const at = l.at ?? i * 0.25, k = clamp01((t - at) / 0.6), e = l.enter ?? (l.kind === "cutout" ? "pop" : l.kind === "torn" ? "slide" : "drop");
        const d = (l.depth ?? 1) * drift, dx = Math.sin(t * 0.25 + i) * 14 * d - t * 6 * d, dy = Math.cos(t * 0.21 + i * 2) * 8 * d;
        const ent = e === "drop" ? `translateY(${(1 - ease.bounce(k)) * -400}px)` : e === "slide" ? `translateX(${(1 - ease.out(k)) * -W}px)` : e === "pop" ? `scale(${ease.back(k)})` : "";
        const box: CSSProperties = { position: "absolute", left: l.x, top: l.y, width: l.w, height: l.h, transform: `translate(${dx}px, ${dy}px) rotate(${l.rot ?? (rand(i) - 0.5) * 8}deg) ${ent}`, opacity: t < at ? 0 : 1, zIndex: Math.round((l.depth ?? 1) * 10) };
        const img = l.image ? <Img src={src(l.image)} style={{ display: "block", width: "100%", height: l.h ?? "auto", objectFit: "cover" }} /> : null;
        switch (l.kind) {
          case "cutout": return <div key={i} style={{ ...box, filter: "drop-shadow(0 0 0 #fff) drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #fff) drop-shadow(0 -6px 0 #fff) drop-shadow(0 14px 18px rgb(0 0 0/0.35))" }}>{img ?? l.node}</div>;
          case "halftone": return <div key={i} style={{ ...box, background: "#fff", padding: 10, boxShadow: "0 10px 20px rgb(0 0 0/0.3)" }}><div style={{ position: "relative", filter: "grayscale(1) contrast(1.4)" }}>{img ?? l.node}<div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgb(0 0 0/0.55) 1.6px, transparent 2px)", backgroundSize: "7px 7px", mixBlendMode: "multiply" }} /><div style={{ position: "absolute", inset: 0, background: l.color ?? theme.accent, mixBlendMode: "screen", opacity: 0.35 }} /></div></div>;
          case "torn": return <div key={i} style={{ ...box, background: l.color ?? "#fdfbf4", padding: "18px 26px", clipPath: "polygon(0 6%, 4% 0, 9% 5%, 15% 1%, 22% 6%, 30% 0, 38% 4%, 46% 0, 54% 5%, 62% 1%, 70% 6%, 78% 0, 86% 5%, 93% 1%, 100% 5%, 100% 94%, 95% 100%, 88% 95%, 80% 100%, 72% 94%, 64% 99%, 56% 94%, 48% 100%, 40% 95%, 32% 100%, 24% 94%, 16% 99%, 8% 94%, 0 100%)", fontFamily: family("newsreader"), fontSize: 34, color: "#222", boxShadow: "0 6px 12px rgb(0 0 0/0.2)" }}>{img ?? l.node ?? l.text}</div>;
          case "note": return <div key={i} style={{ ...box, background: l.color ?? "#fff176", padding: 24, fontFamily: family("caveat"), fontSize: 40, color: "#222", boxShadow: "0 10px 18px rgb(0 0 0/0.25)" }}>{l.text}{l.node}</div>;
          case "marker": return <svg key={i} style={{ ...box, overflow: "visible" }} width={l.w} height={l.h ?? l.w}><ellipse cx={l.w / 2} cy={(l.h ?? l.w) / 2} rx={l.w / 2 - 6} ry={(l.h ?? l.w) / 2 - 6} fill="none" stroke={l.color ?? "#e0201e"} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={`${ease.out(k) * 1.1} 2`} transform={`rotate(-8 ${l.w / 2} ${(l.h ?? l.w) / 2})`} /></svg>;
          case "scribble": return <svg key={i} style={{ ...box, overflow: "visible" }} width={l.w} height={l.h ?? 120}><path d={`M0 ${(l.h ?? 120) / 2} ` + Array.from({ length: 10 }, (_, j) => `Q${(j + 0.5) * (l.w / 10)} ${j % 2 ? 0 : l.h ?? 120} ${(j + 1) * (l.w / 10)} ${(l.h ?? 120) / 2}`).join(" ")} fill="none" stroke={l.color ?? "#e0201e"} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={`${ease.out(k)} 2`} /></svg>;
          default: return <div key={i} style={{ ...box, background: "#fff", padding: 12, boxShadow: "0 12px 24px rgb(0 0 0/0.3)" }}>{img ?? l.node}{l.text && <div style={{ fontFamily: family("caveat"), fontSize: 30, color: "#333", marginTop: 6 }}>{l.text}</div>}</div>;
        }
      })}
      {children}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse, transparent 60%, rgb(0 0 0/0.25))", pointerEvents: "none", zIndex: 99 }} />
    </div>
  );
}
