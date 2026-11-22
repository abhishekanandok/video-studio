/** The World Geography look (the creator, 2026-10-18: "World Geography Vox Style Documentary", every part of the brief).
 *  Three layers that never move each other: the faded old-paper world map behind (drawn by code from real map data, no
 *  words, panning to the region being spoken about); the focus map (a real map drawn by code: borders that draw
 *  themselves, pins, routes, spotlight, size comparison, border morph, raised blocks, number counters); the paper card
 *  (a real sheet: it unfolds in one of four ways, one corner lifts in a breeze, it folds closed at the end). The card and
 *  the map change sides from slide to slide, the map gliding across in an arc. Each key word lights up and scales to 108%
 *  the moment it is said. The text rows are reserved before the first frame and never move. Rendered every frame
 *  (notes-render.mjs). Text is always the slide's, word for word; a place name or a number is only shown when the
 *  slide or the teacher says it (video/audiofilm.py geo_plan). */
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { geoCentroid, geoDistance, geoEquirectangular, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import w110 from "world-atlas/countries-110m.json";
import w50 from "world-atlas/countries-50m.json";
import india110 from "../argon/lib/data/india-borders.json";
import india50 from "../argon/lib/data/india-borders-50m.json";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { bulletFrame, notesFrames, segments, type NotesProps } from "./Notes";

const { fontFamily: NUNITO } = loadNunito("normal", { weights: ["700", "800", "900"], subsets: ["latin"] });
export const FONT = `${NUNITO}, sans-serif`;
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const OUT = Easing.out(Easing.cubic), IN = Easing.in(Easing.cubic), IO = Easing.inOut(Easing.cubic);
export const BACK = Easing.out(Easing.back(1.4)); // the small overshoot (~4%) at the end of an unfold or a pop
export const BOUNCE = Easing.out(Easing.back(2.2));
export const e = (f: number, a: number, len: number, easing = OUT) => interpolate(f, [a, a + len], [0, 1], { ...clamp, easing });
// navy, mustard, teal, cream, sand, sepia, olive and gray-beige only; no dark green (the brief, section 4)
export const C = { navy: "#1f2f52", mustard: "#e0a526", mustardSoft: "#f3d684", teal: "#3d8c88", tealSoft: "#a7cdc6", cream: "#f6eedc",
  sand: "#dcc9a0", sepia: "#8b6b45", olive: "#7d7b3e", beige: "#d9d0be", ink: "#1f1d1a", water: "#aecbc4", land: "#ebe2cd", landDim: "#ddd4c1" };

/* ---------- the map data (Natural Earth via world-atlas: real borders, never guessed) ---------- */
type Feat = { type: "Feature"; properties: { name: string }; geometry: { type: string; coordinates: any } };
// India with its complete official outline, and Pakistan and China without those parts (see india_borders.mjs)
const feats = (t: any, fix: Record<string, unknown>): Feat[] => ((feature(t, t.objects.countries) as any).features as Feat[]).map((f) =>
  f.properties.name in fix ? { ...f, geometry: fix[f.properties.name] as Feat["geometry"] } : f);
export const C50 = feats(w50, india50), C110 = feats(w110, india110);
export const BY = new Map(C50.map((c) => [c.properties.name, c]));

export type GeoPin = { name: string; lon: number; lat: number; label?: boolean; at?: number | null };
export type GeoShot = { bullet: number; view: "globe" | "country" | "region" | "place"; countries: string[]; compare?: string;
  pins: GeoPin[]; route?: [number, number][]; route_kind?: string; technique: string };
export type Geo = { shots: GeoShot[]; prev?: GeoShot | null; side: "left" | "right"; first?: boolean };
export type Move = "swap" | "brush" | "iris" | "whip" | "none";
type KeyAt = { t: string; at: number };
type P = NotesProps & { geo?: Geo | null; key_at?: KeyAt[][] | null; geo_in?: Move; geo_out?: Move };
type Bullet = NonNullable<NotesProps["bullets"]>[number];

/* ---------- the slots (5% safe margin; the card on one side, the map on the other, never overlapping) ---------- */
export const MX = 96, CARD_W = 780, CARD_Y = 112, GAP = 40;
const MAP = { y: 84, w: 1920 - 2 * MX - CARD_W - GAP, h: 912 };
const cardX = (side: "left" | "right") => (side === "left" ? MX : 1920 - MX - CARD_W);
const mapX = (side: "left" | "right") => (side === "left" ? MX + CARD_W + GAP : MX);
const PAD = 64; // >= 8% of the card: the lifted corner never touches a word
const TEXT_W = CARD_W - 2 * PAD - 44;

/* ---------- the views: where the map looks and how close ---------- */
export type View = { lon: number; lat: number; scale: number };
const EARTH = 6371;
export const rOf = (w: number, h: number) => Math.min(w, h) * 0.42;
const R_GLOBE = rOf(MAP.w, MAP.h);

function shotShapes(s: GeoShot, places: boolean) {
  const out: any[] = [];
  if (!places || !s.pins.length) for (const n of s.countries) { const c = BY.get(n); if (c) out.push(c); }
  for (const p of s.pins) out.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lon, p.lat] } });
  if (s.route && s.route.length > 1) out.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: s.route } });
  return out;
}

const VIEWS = new Map<string, View>();
function viewOf(s: GeoShot, w = MAP.w, h = MAP.h): View {
  const R = rOf(w, h);
  const key = JSON.stringify([w, s.view, s.countries, s.pins.map((p) => [p.lon, p.lat]), s.route]);
  const got = VIEWS.get(key);
  if (got) return got;
  // region / place: fitted to the pins (and route); country / globe: the countries too
  let shapes = shotShapes(s, s.view === "region" || s.view === "place");
  if (!shapes.length) shapes = shotShapes(s, false);
  let v: View = { lon: 78, lat: 22, scale: R };
  if (shapes.length) {
    const coll = { type: "FeatureCollection", features: shapes } as any;
    const [lon, lat] = geoCentroid(coll);
    let scale = R;
    if (s.view !== "globe") {
      const pr = geoOrthographic().rotate([-lon, -lat]).fitExtent([[90, 90], [w - 90, h - 90]], coll);
      const minKm = s.view === "place" ? 420 : s.view === "region" ? 900 : 500; // never closer than this across the map
      scale = Math.max(R, Math.min(pr.scale(), (w * EARTH) / minKm));
    }
    v = { lon: isFinite(lon) ? lon : 78, lat: isFinite(lat) ? lat : 22, scale };
  }
  VIEWS.set(key, v);
  return v;
}

/** From one view to the next like a camera flying: along the great circle, pulling back a little on long trips. */
export function mix(a: View, b: View, t: number, R = R_GLOBE): View {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const [lon, lat] = geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(t);
  const d = geoDistance([a.lon, a.lat], [b.lon, b.lat]);
  let ls = Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * t;
  const dip = Math.min(1, d / 0.6) * Math.max(0, Math.min(ls, Math.log(Math.min(a.scale, b.scale))) - Math.log(R)) * 0.7;
  ls -= dip * Math.sin(Math.PI * t);
  return { lon, lat, scale: Math.exp(ls) };
}

/* ---------- small geometry helpers ---------- */
export function outerRings(f: Feat): [number, number][][] {
  const g = f.geometry;
  if (g.type === "Polygon") return [g.coordinates[0]];
  if (g.type === "MultiPolygon") return g.coordinates.map((p: any) => p[0]);
  return [];
}
export const area = (r: [number, number][]) => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);

/** A projected outline as n evenly spaced points (for the border morph). */
export function resample(pts: [number, number][], n: number): [number, number][] {
  const L = [0];
  for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = L[L.length - 1] || 1, out: [number, number][] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total;
    while (j < pts.length - 1 && L[j + 1] < d) j++;
    const a = pts[j], b = pts[(j + 1) % pts.length], seg = L[j + 1] - L[j] || 1, t = (d - L[j]) / seg;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

function biggestProjected(f: Feat | undefined, proj: any): [number, number][] | null {
  if (!f) return null;
  const ring = outerRings(f).sort((a, b) => area(b) - area(a))[0];
  if (!ring) return null;
  const pts = ring.map((p) => proj(p)).filter(Boolean) as [number, number][];
  return pts.length > 3 ? pts : null;
}

/** A partly drawn line along geographic points (great circles), as a GeoJSON line and the point at its tip. */
export function partial(coords: [number, number][], t: number) {
  const dense: [number, number][] = [];
  for (let i = 1; i < coords.length; i++) {
    const ip = geoInterpolate(coords[i - 1], coords[i]);
    for (let k = 0; k < 12; k++) dense.push(ip(k / 12) as [number, number]);
  }
  dense.push(coords[coords.length - 1]);
  const n = Math.max(2, Math.ceil(dense.length * t));
  const part = dense.slice(0, n);
  return { line: { type: "LineString", coordinates: part } as any, tip: part[part.length - 1], dense };
}

/* ---------- the background: the faded old world map (section 13), drawn once ---------- */
const BW = 2880, BH = 1440;
const BG_PROJ = geoEquirectangular().scale(BW / (2 * Math.PI)).translate([BW / 2, BH / 2]);
const BG_PATH = geoPath(BG_PROJ);
const BG_LAND = C110.map((c) => BG_PATH(c as any) ?? "").join(" ");
const BG_GRID = BG_PATH(geoGraticule10() as any) ?? "";

export function Compass({ x, y, r, o, turn = 0 }: { x: number; y: number; r: number; o: number; turn?: number }) {
  const pts = [0, 90, 180, 270].map((a) => {
    const t = ((a + turn) * Math.PI) / 180, s = t + Math.PI / 4;
    return `M ${x} ${y} L ${x + r * Math.sin(t)} ${y - r * Math.cos(t)} L ${x + r * 0.22 * Math.sin(s)} ${y - r * 0.22 * Math.cos(s)} Z`;
  });
  return (
    <g opacity={o}>
      <circle cx={x} cy={y} r={r * 0.78} fill="none" stroke={C.sepia} strokeWidth={2} />
      <circle cx={x} cy={y} r={r * 0.68} fill="none" stroke={C.sepia} strokeWidth={1} />
      {pts.map((d, i) => <path key={i} d={d} fill={i === 0 ? C.sepia : "none"} stroke={C.sepia} strokeWidth={1.6} />)}
    </g>
  );
}

export function Parchment({ f, total, at, side }: { f: number; total: number; at: [number, number]; side: "left" | "right" }) {
  // the region being spoken about drifts toward the middle (the map's own view, a little behind it: parallax)
  const [px, py] = BG_PROJ(at) ?? [BW / 2, BH / 2];
  const tx = Math.min(0, Math.max(1920 - BW, 960 - px)), ty = Math.min(0, Math.max(1080 - BH, 540 - py));
  const push = 1 + 0.03 * (f / Math.max(1, total));
  const dust = [0, 1, 2, 3, 4, 5, 6].map((k) => ({ x: ((k * 297 + f * (0.25 + k * 0.04)) % 2000) - 40, y: 80 + ((k * 389) % 920) + Math.sin(f / 40 + k) * 14 }));
  return (
    <AbsoluteFill style={{ background: "#efe3c8", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: BW, height: BH, transform: `translate(${tx}px, ${ty}px) scale(${push})`, transformOrigin: `${960 - tx}px ${540 - ty}px` }}>
        <svg width={BW} height={BH}>
          <rect width={BW} height={BH} fill="rgba(61,140,136,0.07)" />
          <path d={BG_GRID} fill="none" stroke="rgba(139,107,69,0.13)" strokeWidth={1.4} />
          <path d={BG_LAND} fill="rgba(160,128,84,0.16)" stroke="rgba(139,107,69,0.22)" strokeWidth={1.2} />
          <Compass x={BW * 0.08} y={BH * 0.78} r={90} o={0.22} />
          <Compass x={BW * 0.93} y={BH * 0.2} r={70} o={0.16} turn={20} />
        </svg>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <filter id="geograin"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={(f >> 2) % 9} />
          <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.10 0" /></filter>
        <rect width={1920} height={1080} filter="url(#geograin)" />
        {/* faint fold creases */}
        <line x1={640} y1={0} x2={640} y2={1080} stroke="rgba(120,90,50,0.07)" strokeWidth={2} />
        <line x1={0} y1={540} x2={1920} y2={540} stroke="rgba(120,90,50,0.06)" strokeWidth={2} />
        {dust.map((d, k) => <circle key={k} cx={d.x} cy={d.y} r={1.6 + (k % 3)} fill="rgba(255,250,235,0.55)" />)}
      </svg>
      {/* the card's side stays calm and light; brown edges and a soft vignette */}
      <AbsoluteFill style={{ background: `linear-gradient(${side === "left" ? 90 : 270}deg, rgba(250,244,228,0.55) 0%, rgba(250,244,228,0.25) 42%, rgba(250,244,228,0) 55%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(120,84,40,0.28) 100%)" }} />
    </AbsoluteFill>
  );
}

/* ---------- the focus map ---------- */
const TECH_LEN = 30; // frames: a border draws itself in about a second

function FocusMap({ shots, ats, f, start, numbers, w, h }: { shots: GeoShot[]; ats: number[]; f: number; start: View;
  numbers: { text: string; at: number; until: number }[]; w?: number; h?: number }) {
  const W = w ?? MAP.w, H = h ?? MAP.h;
  const views = shots.map((s) => viewOf(s, W, H));
  const viewAt = (fr: number, n: number): View => {
    if (n === 0) return start;
    const a = ats[n - 1];
    if (fr < a) return viewAt(fr, n - 1);
    return mix(viewAt(a, n - 1), views[n - 1], e(fr, a, 36, IO), rOf(W, H));
  };
  const cur = ats.reduce((a, s, k) => (f >= s ? k : a), -1);
  let v = viewAt(f, shots.length);
  // every map keeps a slow zoom while it is on screen
  const since = cur >= 0 ? f - ats[cur] : f;
  v = { ...v, scale: v.scale * (1 + 0.025 * Math.min(1, since / 300)) };
  const proj = geoOrthographic().rotate([-v.lon, -v.lat]).scale(v.scale).translate([W / 2, H / 2]).clipAngle(90)
    .clipExtent([[-30, -30], [W + 30, H + 30]]).precision(0.4);
  const path = geoPath(proj);
  const base = v.scale > 700 ? C50 : C110;
  const s = cur >= 0 ? shots[cur] : null;
  const at = cur >= 0 ? ats[cur] : 0;
  const tech = s?.technique ?? "border";
  // the same countries as the shot before: already drawn, not drawn again
  let drawnAt = at;
  for (let k = cur; k > 0 && JSON.stringify(shots[k - 1].countries) === JSON.stringify(shots[k].countries); k--) drawnAt = ats[k - 1];
  const focus = new Set(s?.countries ?? []);
  const fade = e(f, drawnAt, 20, IO); // the neighbours fade to gray-beige
  const spot = tech === "spotlight" ? e(f, at + 10, 18, IO) : 0;
  const visible = (lon: number, lat: number) => geoDistance([lon, lat], [v.lon, v.lat]) < Math.PI / 2 - 0.02;
  const lift = tech === "spotlight" ? -6 * spot : tech === "extrude" ? -10 * e(f, at + 24, 16, BACK) : -3;

  const focusFeats = [...focus].map((n) => BY.get(n)).filter(Boolean) as Feat[];
  const border = e(f, drawnAt + 6, TECH_LEN, IO);
  const fill = e(f, drawnAt + 6 + TECH_LEN - 8, 14);
  const rings = focusFeats.flatMap(outerRings).sort((a, b) => area(b) - area(a)).slice(0, 12);

  // a second country: slid over the first to compare size, or the first's outline morphing into it
  const other = s?.compare ? BY.get(s.compare) : undefined;
  const fc = focusFeats.length ? proj(geoCentroid({ type: "FeatureCollection", features: focusFeats } as any)) : null;
  let compare: React.ReactNode = null;
  if (other && fc && (tech === "compare" || tech === "morph")) {
    const oc = geoCentroid(other as any);
    const proj2 = geoOrthographic().rotate([-oc[0], -oc[1]]).scale(v.scale).translate([fc[0], fc[1]]).clipAngle(90);
    if (tech === "compare") {
      const p = e(f, at + TECH_LEN + 10, 30, IO);
      const d = geoPath(proj2)(other as any) ?? "";
      compare = p > 0 ? (
        <g transform={`translate(${(1 - p) * (W * 0.7)}, ${(1 - p) * -40})`} opacity={Math.min(1, p * 2)}>
          <path d={d} fill="rgba(61,140,136,0.38)" stroke="#fff" strokeWidth={6} />
          <path d={d} fill="none" stroke={C.teal} strokeWidth={3.5} />
        </g>
      ) : null;
    } else {
      const a = biggestProjected(focusFeats.sort((x, y) => area(outerRings(y)[0] ?? []) - area(outerRings(x)[0] ?? []))[0], proj);
      const b = biggestProjected(other, proj2);
      const m = e(f, at + TECH_LEN + 16, 40, IO);
      if (a && b && m > 0) {
        const N = 180, A = resample(a, N), B0 = resample(b, N);
        let best = 0, bestD = Infinity;
        for (let o = 0; o < N; o += 4) { let d = 0; for (let i = 0; i < N; i += 6) { const q = B0[(i + o) % N]; d += Math.hypot(A[i][0] - q[0], A[i][1] - q[1]); } if (d < bestD) { bestD = d; best = o; } }
        const pts = A.map((p, i) => { const q = B0[(i + best) % N]; return [p[0] + (q[0] - p[0]) * m, p[1] + (q[1] - p[1]) * m]; });
        const d = "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L") + "Z";
        compare = (<g>
          <path d={d} fill={`rgba(61,140,136,${0.3 * m})`} stroke="#fff" strokeWidth={7} />
          <path d={d} fill="none" stroke={m < 1 ? C.mustard : C.teal} strokeWidth={4} />
        </g>);
      }
    }
  }

  // pins drop on each place (named only when the slide or the teacher says the name)
  const pins = (s?.pins ?? []).map((p, i) => ({ ...p, t: Math.max(at + 14 + i * 9, p.at ?? at + 18 + i * 12) }));
  const route = s?.route && s.route.length > 1 ? partial(s.route, e(f, at + 16, 44, IO)) : null;
  const scribble = tech === "scribble" ? e(f, at + 28, 22, IO) : 0;
  let box: [[number, number], [number, number]] | null = null;
  if (tech === "scribble") {
    const pts = pins.map((p) => proj([p.lon, p.lat])).filter(Boolean) as [number, number][];
    if (pts.length) box = [[Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))], [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]];
    else if (focusFeats.length) box = path.bounds({ type: "FeatureCollection", features: focusFeats } as any) as any;
  }
  const rk = s?.route_kind ?? "";
  const placed: [number, number, number, number][] = [];
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="cut" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx={4} dy={8} stdDeviation={6} floodColor="#4a3412" floodOpacity={0.35} /></filter>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={5} /></filter>
      </defs>
      <path d={path({ type: "Sphere" } as any) ?? ""} fill={C.water} stroke="rgba(31,47,82,0.25)" strokeWidth={2} />
      <path d={path(geoGraticule10() as any) ?? ""} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
      {base.map((c, i) => {
        const d = path(c as any);
        if (!d) return null;
        const dim = focus.size && !focus.has(c.properties.name);
        return <path key={i} d={d} fill={dim ? (fade > 0.5 ? C.landDim : C.land) : C.land} stroke="#c8baa0" strokeWidth={0.8} />;
      })}
      {spot > 0 && <path d={path({ type: "Sphere" } as any) ?? ""} fill={`rgba(28,32,48,${0.45 * spot})`} />}
      {tech === "extrude" && focusFeats.map((c, i) => {
        const d = path(c as any) ?? "", r = e(f, at + 24, 16, BACK);
        return [8, 6, 4, 2].map((dy) => <path key={`${i}-${dy}`} d={d} transform={`translate(0, ${lift + dy * r * 1.6})`} fill={C.sepia} opacity={0.5} />);
      })}
      {focusFeats.length > 0 && (
        <g filter="url(#cut)" transform={`translate(0, ${lift})`}>
          {focusFeats.map((c, i) => {
            const d = path(c as any) ?? "";
            return <path key={i} d={d} fill={tech === "extrude" ? C.mustard : C.mustardSoft} fillOpacity={fill * (tech === "extrude" ? 1 : 0.92)} stroke="#fff" strokeWidth={6 * fill} />;
          })}
        </g>
      )}
      {focusFeats.length > 0 && (() => {
        // the border draws itself along its real line, a glowing dot at the pen's tip
        const parts = rings.map((r) => partial(r, border));
        const d = parts.map((q) => path(q.line) ?? "").join(" ");
        const tip = border < 1 && parts[0] ? proj(parts[0].tip) : null;
        return (
          <g transform={`translate(0, ${lift})`}>
            <path d={d} fill="none" stroke={C.mustard} strokeWidth={9} opacity={0.55 * (1 - fill * 0.6)} filter="url(#glow)" />
            <path d={d} fill="none" stroke={C.mustard} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
            {tip && <><circle cx={tip[0]} cy={tip[1]} r={14} fill={C.mustard} opacity={0.4} filter="url(#glow)" /><circle cx={tip[0]} cy={tip[1]} r={6} fill="#fff" stroke={C.mustard} strokeWidth={3} /></>}
          </g>
        );
      })()}
      {compare}
      {route && (() => {
        const d = path(route.line) ?? "";
        const tip = proj(route.tip);
        const river = rk === "river", dotted = rk === "route" || !rk;
        const col = river ? C.teal : rk === "range" ? C.sepia : C.navy;
        const heads = dotted ? [0, 1, 2].map((k) => {
          const q = ((f - at) / 90 + k / 3) % 1, n = route.line.coordinates.length;
          const i = Math.min(n - 2, Math.floor(q * (n - 1)));
          if (i < 1) return null;
          const a = proj(route.line.coordinates[i]), b = proj(route.line.coordinates[i + 1]);
          if (!a || !b) return null;
          const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
          return <path key={k} d="M -9 -8 L 7 0 L -9 8 Z" fill={C.navy} transform={`translate(${a[0]}, ${a[1]}) rotate(${ang})`} />;
        }) : null;
        return (
          <g>
            <path d={d} fill="none" stroke="#fff" strokeWidth={river ? 11 : 9} strokeLinecap="round" opacity={0.85} />
            <path d={d} fill="none" stroke={col} strokeWidth={river ? 6 : 5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dotted ? "1 13" : undefined} />
            {heads}
            {tip && <circle cx={tip[0]} cy={tip[1]} r={7} fill="#fff" stroke={col} strokeWidth={3} />}
          </g>
        );
      })()}
      {box && scribble > 0 && (() => {
        const cx = (box[0][0] + box[1][0]) / 2, cy = (box[0][1] + box[1][1]) / 2;
        const rx = Math.max(70, (box[1][0] - box[0][0]) / 2 + 60), ry = Math.max(60, (box[1][1] - box[0][1]) / 2 + 50);
        const pts = Array.from({ length: 60 }, (_, i) => {
          const a = (i / 54) * Math.PI * 2 - 0.4, w = 1 + 0.05 * Math.sin(i * 1.7) + 0.03 * Math.sin(i * 3.1);
          return `${(cx + rx * w * Math.cos(a)).toFixed(1)},${(cy + ry * w * Math.sin(a)).toFixed(1)}`;
        });
        return <polyline points={pts.join(" ")} fill="none" stroke={C.mustard} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - scribble} style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))" }} />;
      })()}
      {(() => { placed.length = 0; return null; })()}
      {pins.map((p, i) => {
        if (!visible(p.lon, p.lat)) return null;
        const q = proj([p.lon, p.lat]);
        if (!q || q[0] < 0 || q[0] > W || q[1] < 0 || q[1] > H) return null;
        const d = e(f, p.t, 16, BOUNCE), rip = e(f, p.t + 12, 26, OUT);
        if (d <= 0) return null;
        const lw = p.name.length * 13.5 + 28;
        const right = q[0] + 22 + lw < W - 20 && (i % 2 === 0 || q[0] - 22 - lw < 20);
        const lx = right ? q[0] + 22 : q[0] - 22 - lw;
        let ly = q[1] - 56;
        for (let tries = 0; tries < 12 && placed.some((b) => lx < b[0] + b[2] && lx + lw > b[0] && ly < b[1] + b[3] + 6 && ly + 40 > b[1] - 6); tries++) ly += 46;
        if (p.label) placed.push([lx, ly, lw, 40]);
        const lab = e(f, p.t + 10, 12, BACK);
        return (
          <g key={i}>
            {rip > 0 && rip < 1 && <circle cx={q[0]} cy={q[1]} r={8 + 40 * rip} fill="none" stroke={C.mustard} strokeWidth={3} opacity={1 - rip} />}
            <ellipse cx={q[0]} cy={q[1]} rx={9 * d} ry={4 * d} fill="rgba(0,0,0,0.28)" />
            <g transform={`translate(${q[0]}, ${q[1] - (1 - d) * 70})`} opacity={Math.min(1, d * 1.5)}>
              <path d="M0 0 C 0 0 -15 -19 -15 -30 A 15 15 0 1 1 15 -30 C 15 -19 0 0 0 0 Z" fill={tech === "extrude" || i === 0 ? C.mustard : C.teal} stroke="#fff" strokeWidth={3} />
              <circle cx={0} cy={-30} r={5.5} fill="#fff" />
            </g>
            {p.label && lab > 0 && (
              <g opacity={Math.min(1, lab * 1.5)}>
                {Math.abs(ly - (q[1] - 56)) > 1 && <line x1={q[0]} y1={q[1] - 30} x2={right ? lx : lx + lw} y2={ly + 20} stroke={C.navy} strokeWidth={2} />}
                <g transform={`translate(${lx}, ${ly}) scale(${0.85 + 0.15 * lab})`} style={{ transformOrigin: right ? "0px 20px" : `${lw}px 20px` }}>
                  <rect x={0} y={0} width={lw} height={40} rx={8} fill={C.navy} />
                  <text x={14} y={28} fontFamily={FONT} fontWeight={900} fontSize={24} fill="#fff">{p.name}</text>
                </g>
              </g>
            )}
          </g>
        );
      })}
      {numbers.map((n, i) => <Counter key={i} n={n} f={f} x={34} y={H - 40 - i * 96} />)}
      <Compass x={W - 70} y={70} r={40} o={0.8} turn={Math.sin(f / 50) * 6 + (v.lon - start.lon) * 0.4} />
    </svg>
  );
}

/** A number the slide says, counting up quickly and landing on exactly that number (with its own suffix: 81st, 18, 1971). */
function Counter({ n, f, x, y }: { n: { text: string; at: number; until: number }; f: number; x: number; y: number }) {
  const o = e(f, n.at, 10, BACK) * (1 - e(f, n.until, 10, IN));
  if (o <= 0) return null;
  const m = n.text.match(/^(\D*)([\d,]*\.?\d+)(.*)$/);
  let shown = n.text;
  if (m) {
    const value = parseFloat(m[2].replace(/,/g, ""));
    const year = value >= 1000 && value <= 2100 && !m[2].includes(",");
    const from = year ? value - 40 : 0;
    const t = e(f, n.at + 4, 26, OUT);
    const dec = (m[2].split(".")[1] ?? "").length;
    let now = (from + (value - from) * t).toFixed(dec);
    if (m[2].includes(",")) now = Number(now).toLocaleString("en-IN");
    shown = m[1] + (t >= 1 ? m[2] : now) + m[3];
  }
  const w = shown.length * 34 + 48;
  return (
    <g transform={`translate(${x}, ${y}) scale(${0.8 + 0.2 * o})`} opacity={Math.min(1, o * 1.4)}>
      <rect x={0} y={-74} width={w} height={84} rx={14} fill={C.navy} stroke="#fff" strokeWidth={4} />
      <text x={24} y={-14} fontFamily={FONT} fontWeight={900} fontSize={60} fill={C.mustardSoft}>{shown}</text>
    </g>
  );
}

/* ---------- the paper card ---------- */
type Word = { t: string; c: "y" | "g" | null; term: number };
export function words(text: string, key: string[] = [], green: string[] = []): { list: Word[]; terms: string[] } {
  const list: Word[] = [], terms: string[] = [];
  for (const sg of segments(text, key, green)) {
    const term = sg.c ? terms.push(sg.t) - 1 : -1;
    for (const w of sg.t.split(/(\s+)/)) if (w) list.push({ t: w, c: sg.c, term });
  }
  return { list, terms };
}

export const MARKS = ["swipe", "flip", "scribble", "circle", "glow"] as const;
/** A key word as it is said: a quick scale-up to 108% with a short underline wipe, then it settles; and a highlight in
 *  mustard or teal that stays (swipe, colour flip, scribble underline, circle, glow). It never moves the row. */
export function Lit({ style, p, colour, children }: { style: string; p: number; colour: string; children: React.ReactNode }) {
  const bump = Math.sin(Math.min(1, p * 1.6) * Math.PI); // 0 -> 1 -> 0 in the first ~0.4 s
  const wrap: React.CSSProperties = { position: "relative", display: "inline-block", isolation: "isolate", transform: `scale(${1 + 0.08 * bump})`, transformOrigin: "50% 70%" };
  const wipe = <span style={{ position: "absolute", left: 0, bottom: -4, height: 4, borderRadius: 2, background: colour, width: `${Math.min(1, p * 2.2) * 100}%`, opacity: 0.9 * bump }} />;
  let mark: React.ReactNode = null;
  if (style === "swipe") mark = <span style={{ position: "absolute", left: -5, right: -5, top: "12%", bottom: "6%", background: colour, opacity: 0.38, borderRadius: 4, zIndex: -1, transform: "skewX(-6deg)", clipPath: `inset(0 ${100 - p * 100}% 0 0)` }} />;
  if (style === "scribble") mark = <svg style={{ position: "absolute", left: 0, bottom: -10, width: "100%", height: 14, overflow: "visible", zIndex: -1 }} viewBox="0 0 100 14" preserveAspectRatio="none">
    <path d="M2 8 C 20 2, 35 13, 52 6 S 82 3, 98 8" fill="none" stroke={colour} strokeWidth={4.5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={0.85} /></svg>;
  if (style === "circle") mark = <svg style={{ position: "absolute", left: "-9%", top: "-20%", width: "118%", height: "140%", overflow: "visible", zIndex: -1 }} viewBox="0 0 100 50" preserveAspectRatio="none">
    <ellipse cx={50} cy={25} rx={48} ry={23} fill="none" stroke={colour} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} transform="rotate(-3 50 25)" opacity={0.9} /></svg>;
  const glow = style === "glow" ? { textShadow: `0 0 ${16 * bump + 4 * p}px ${colour}` } : {};
  const flip = style === "flip" && p > 0.3 ? { color: colour === C.mustard ? "#b07a06" : C.teal } : {};
  return <span style={{ ...wrap, ...glow, ...flip }}>{mark}{wipe}{children}</span>;
}

function Row({ b, f, at, until, k, scene, keyAt, size, active }: { b: Bullet; f: number; at: number; until: number; k: number; scene: number;
  keyAt: KeyAt[]; size: number; active: boolean }) {
  const { list, terms } = words(b.text, (b.key ?? []).slice(0, 2), (b.green ?? []).slice(0, 2));
  const use = terms.slice(0, 2); // 1 or 2 key words a line
  const termAt = use.map((t, i) => {
    const hit = keyAt.find((x) => x.t.toLowerCase() === t.toLowerCase());
    return Math.max(at + 12 + i * 18, hit ? hit.at : at + ((until - at) * (i + 1)) / (use.length + 2));
  });
  const reveal = ["fade", "slide", "mask"][(scene + k) % 3];
  const dot = e(f, at, 10, BOUNCE), tx = e(f, at + 6, 14);
  const dim = active ? 1 : 0.6;
  const textStyle: React.CSSProperties = reveal === "fade" ? { opacity: tx } : reveal === "slide" ? { opacity: tx, transform: `translateX(${(1 - tx) * -36}px)` }
    : { clipPath: `inset(0 ${(1 - tx) * 100}% 0 0)` };
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", opacity: f < at ? 0 : dim }}>
      <span style={{ width: 24, height: 24, borderRadius: 12, background: C.navy, flex: "none", marginTop: size * 0.4, transform: `scale(${dot})` }} />
      <div style={{ width: TEXT_W, fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.34, color: C.ink, ...textStyle }}>
        {list.map((w, i) => {
          const ti = w.term >= 0 ? use.indexOf(terms[w.term]) : -1;
          const inner = <span style={{ color: w.c ? C.navy : C.ink, fontWeight: w.c ? 900 : 800 }}>{w.t}</span>;
          if (ti < 0 || !/\S/.test(w.t)) return <span key={i}>{inner}</span>; // plain words wrap normally
          const colour = (scene + k + ti) % 2 ? C.teal : C.mustard;
          return <Lit key={i} style={MARKS[(scene * 2 + k + ti) % MARKS.length]} p={e(f, termAt[ti], 16, IO)} colour={colour}>{inner}</Lit>;
        })}
      </div>
    </div>
  );
}

/** The type size and the card's height, worked out once before the first frame (the rows never reflow). */
function layoutOf(title: string, bullets: Bullet[]) {
  const T = title.toUpperCase();
  const tSize = T.length > 30 ? 34 : T.length > 22 ? 40 : 46;
  const tLines = Math.ceil((T.length * tSize * 0.7) / (CARD_W - 2 * PAD - 40));
  const titleH = tLines * tSize * 1.18 + tSize * 0.75 + 34;
  for (const size of [44, 41, 38, 35, 32, 30, 28]) {
    const lines = bullets.map((b) => Math.ceil((b.text.length * size * 0.5) / TEXT_W + 0.1));
    const h = lines.reduce((a, n) => a + n * size * 1.34, 0) + (bullets.length - 1) * size * 0.75;
    if (titleH + h + 2 * PAD + 8 <= 1080 - CARD_Y - 60 || size === 28) return { size, tSize, height: Math.round(titleH + h + 2 * PAD + 12) };
  }
  return { size: 28, tSize, height: 900 };
}

/** The title: a deep navy brush stroke, white ultra-bold capitals rising in, after the page has opened. */
export function Banner({ title, f, at, size }: { title: string; f: number; at: number; size: number }) {
  const T = title.toUpperCase();
  const sweep = e(f, at, 16, IO);
  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", padding: `${size * 0.26}px ${size * 0.5}px ${size * 0.32}px`, marginBottom: 34 }}>
      <div style={{ position: "absolute", inset: 0, background: C.navy,
        clipPath: "polygon(0% 12%, 3% 3%, 20% 8%, 42% 1%, 64% 7%, 85% 1%, 99% 8%, 100% 52%, 97% 94%, 76% 99%, 52% 92%, 30% 99%, 8% 93%, 1% 97%)",
        WebkitMaskImage: `linear-gradient(90deg, #000 ${sweep * 100}%, transparent ${Math.min(100, sweep * 100 + 6)}%)`,
        maskImage: `linear-gradient(90deg, #000 ${sweep * 100}%, transparent ${Math.min(100, sweep * 100 + 6)}%)` }} />
      <div style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.18, color: "#fff", letterSpacing: 0.5 }}>
        {T.split(/(\s+)/).map((wd, i) => {
          const l = e(f, at + 6 + i * 1.5, 12, BACK);
          return <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: Math.min(1, l * 1.6), transform: `translateY(${(1 - l) * 0.45}em)` }}>{wd}</span>;
        })}
      </div>
    </div>
  );
}

export const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0.09 0'/></filter><rect width='220' height='220' filter='url(%23n)'/></svg>\")";
const OPENS = ["letter", "tri", "flip", "corner"] as const;
const CLOSES = ["fold", "peel", "slide"] as const;
const CORNERS = ["br", "tr", "bl"] as const;

/** The paper itself (no text): cream with grain, a soft edge, the crease left by how it was folded, one corner lifted. */
export function Sheet({ w, h, curl, corner, crease, light }: { w: number; h: number; curl: number; corner: string; crease: string; light: number }) {
  const s = curl;
  const cut = corner === "br" ? `polygon(0 0, ${w}px 0, ${w}px ${h - s}px, ${w - s}px ${h}px, 0 ${h}px)`
    : corner === "tr" ? `polygon(0 0, ${w - s}px 0, ${w}px ${s}px, ${w}px ${h}px, 0 ${h}px)`
      : `polygon(0 0, ${w}px 0, ${w}px ${h}px, ${s}px ${h}px, 0 ${h - s}px)`;
  // the flap: the cut-off corner folded back over the page
  const flap = corner === "br" ? [[w - s, h], [w, h - s], [w - s, h - s]] : corner === "tr" ? [[w - s, 0], [w, s], [w - s, s]] : [[s, h], [0, h - s], [s, h - s]];
  const creaseLines = crease === "letter" ? [[0, h / 2, w, h / 2]] : crease === "tri" ? [[w / 3, 0, w / 3, h], [(2 * w) / 3, 0, (2 * w) / 3, h]]
    : crease === "flip" ? [[w / 2, 0, w / 2, h]] : [[0, 0, w, h]];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 16px 22px rgba(70,48,18,0.26)) drop-shadow(0 2px 3px rgba(70,48,18,0.2))" }}>
        <div style={{ position: "absolute", inset: 0, clipPath: s > 0 ? cut : undefined, borderRadius: 3,
          background: `radial-gradient(ellipse at ${corner === "bl" ? 15 : 85}% ${corner === "tr" ? 10 : 90}%, rgba(255,250,236,${0.5 + 0.25 * light}), transparent 55%), ${GRAIN}, linear-gradient(160deg, #fbf5e6, #f3e9d2)` }} />
      </div>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {creaseLines.map(([x1, y1, x2, y2], i) => (
          <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(120,92,50,0.16)" strokeWidth={1.5} />
            <line x1={x1 + 1.5} y1={y1 + 1.5} x2={x2 + 1.5} y2={y2 + 1.5} stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} /></g>
        ))}
        {s > 0 && <>
          <polygon points={flap.map((p) => p.join(",")).join(" ")} transform="translate(-3, -3)" fill="rgba(70,48,18,0.22)" style={{ filter: "blur(4px)" }} />
          <linearGradient id={`flap${corner}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#d8caa6" /></linearGradient>
          <polygon points={flap.map((p) => p.join(",")).join(" ")} fill={`url(#flap${corner})`} stroke="rgba(120,92,50,0.25)" strokeWidth={1} />
        </>}
      </svg>
    </div>
  );
}

function Card({ p, f, total, starts, cur, side, open0 }: { p: P; f: number; total: number; starts: number[]; cur: number; side: "left" | "right"; open0: number }) {
  const scene = p.index ?? 0;
  const bullets = p.bullets ?? [];
  const L = layoutOf(p.slide_title ?? "", bullets);
  const W = CARD_W, H = L.height;
  const style = OPENS[scene % OPENS.length], close = CLOSES[scene % CLOSES.length], corner = CORNERS[scene % CORNERS.length];
  const OPEN = 26, CLOSE = 18;
  const pOpen = e(f, open0, OPEN, BACK);
  const opened = f >= open0 + OPEN;
  const c0 = total - CLOSE - 2;
  const q = e(f, c0, CLOSE, IN);
  if (f < open0) return null;
  // once open: one corner lifts and falls in a 3.5 s breeze; the page and its text stay flat and still
  const breeze = Math.sin((2 * Math.PI * (f - open0)) / 105);
  const curl = opened ? (34 + 9 * breeze) * e(f, open0 + OPEN, 12) : 0;
  const shade = (a: number) => <div style={{ position: "absolute", inset: 0, background: `rgba(70,48,18,${Math.min(0.45, Math.abs(a) / 200)})` }} />;
  const persp = "perspective(1700px)";
  let pieces: React.ReactNode;
  if (opened) pieces = <Sheet w={W} h={H} curl={curl} corner={corner} crease={style} light={(breeze + 1) / 2} />;
  else if (style === "letter") { // a letter opening from its middle crease, both halves unfolding toward you
    const a = (1 - pOpen) * 88;
    pieces = (<>
      <div style={{ position: "absolute", inset: 0, clipPath: "inset(0 0 50% 0)", transformOrigin: "50% 50%", transform: `${persp} rotateX(${-a}deg)` }}><Sheet w={W} h={H} curl={0} corner={corner} crease={style} light={0} />{shade(a)}</div>
      <div style={{ position: "absolute", inset: 0, clipPath: "inset(50% 0 0 0)", transformOrigin: "50% 50%", transform: `${persp} rotateX(${a}deg)` }}><Sheet w={W} h={H} curl={0} corner={corner} crease={style} light={0} />{shade(a * 0.6)}</div>
    </>);
  } else if (style === "tri") { // a tri-fold: the panels open one after another, left to right
    pieces = [0, 1, 2].map((i) => {
      const pi = e(f, open0 + i * 6, OPEN - 10, BACK), a = (1 - pi) * (i === 0 ? 70 : 100);
      return <div key={i} style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - (i + 1) * 33.34}% 0 ${i * 33.33}%)`, transformOrigin: `${i * 33.33}% 50%`,
        transform: `${persp} rotateY(${-a}deg)`, opacity: pi > 0 ? 1 : 0 }}><Sheet w={W} h={H} curl={0} corner={corner} crease={style} light={0} />{shade(a)}</div>;
    });
  } else if (style === "flip") { // a page of an atlas swinging in from its edge
    const a = (1 - pOpen) * 100;
    pieces = <div style={{ position: "absolute", inset: 0, transformOrigin: side === "left" ? "0% 50%" : "100% 50%", transform: `${persp} rotateY(${side === "left" ? -a : a}deg)` }}>
      <Sheet w={W} h={H} curl={0} corner={corner} crease={style} light={0} />{shade(a)}</div>;
  } else { // opening diagonally from one corner, the folded part sliding back along the fold
    const u = pOpen * (W + H) * 1.01, k = Math.min(110, Math.max(0, W + H - u)) * (1 - pOpen * 0.3);
    const band = (from: number, to: number) => {
      const pt = (d: number) => [[0, 0], [Math.min(d, W), 0], [Math.min(d, W), Math.max(0, d - W)], [Math.max(0, d - H), Math.min(d, H)], [0, Math.min(d, H)]];
      return [...pt(to)].map(([x, y]) => `${x}px ${y}px`).join(", ") + (from > 0 ? "" : "");
    };
    const flapPts = (() => { // the strip just inside the fold line, shaded like the back of the paper
      const a = Math.max(0, u - k), pts: [number, number][] = [];
      const edge = (d: number) => [[Math.min(d, W), Math.max(0, d - W)], [Math.max(0, d - H), Math.min(d, H)]] as [number, number][];
      const [p1, p2] = edge(u), [p3, p4] = edge(a);
      pts.push(p1, p2, p4, p3);
      return pts.map(([x, y]) => `${x},${y}`).join(" ");
    })();
    pieces = (<div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, clipPath: `polygon(${band(0, u)})` }}><Sheet w={W} h={H} curl={0} corner={corner} crease={style} light={0} /></div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}><polygon points={flapPts} fill="#e2d4b2" stroke="rgba(120,92,50,0.3)" strokeWidth={1.5} style={{ filter: "drop-shadow(-4px -4px 6px rgba(70,48,18,0.25))" }} /></svg>
    </div>);
  }
  // the fold-close at the end: the page and its text go together, as one sheet
  let shut = "", shutO = 1, shutOrigin = "50% 50%";
  if (q > 0) {
    if (close === "fold") shut = `${persp} rotateX(${q * 88}deg) scale(${1 - 0.1 * q})`;
    if (close === "peel") { shut = `${persp} rotate3d(1, 1, 0, ${-q * 100}deg)`; shutOrigin = "0% 0%"; shutO = 1 - e(f, c0 + 8, 10); }
    if (close === "slide") { shut = `scale(${1 - 0.55 * q}) translateX(${(side === "left" ? -1 : 1) * q * 700}px)`; shutO = 1 - q; }
  }
  const textAt = open0 + OPEN + 2;
  return (
    <div style={{ position: "absolute", left: cardX(side), top: CARD_Y, width: W, height: H, zIndex: 8, transform: shut || undefined, transformOrigin: shutOrigin, opacity: shutO }}>
      <div style={{ position: "absolute", inset: 0, transform: opened ? undefined : `scale(${0.94 + 0.06 * Math.min(1, pOpen)})` }}>{pieces}</div>
      {opened && (
        <div style={{ position: "absolute", left: PAD, top: PAD - 6, right: PAD }}>
          <Banner title={p.slide_title ?? ""} f={f} at={textAt} size={L.tSize} />
          <div style={{ display: "flex", flexDirection: "column", gap: L.size * 0.75 }}>
            {bullets.map((b, k) => (
              <Row key={k} b={b} f={f} at={starts[k]} until={starts[k + 1] ?? total - 30} k={k} scene={scene} keyAt={p.key_at?.[k] ?? []} size={L.size} active={k === cur} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- doodles (max 2 a scene, ~2 s each, never over the text) ---------- */
function Doodle({ kind, at, f, x, y }: { kind: string; at: number; f: number; x: number; y: number }) {
  const p = e(f, at, 18, IO), out = e(f, at + 50, 12, IN);
  if (f < at || out >= 1) return null;
  const st = { fill: "none", stroke: C.mustard, strokeWidth: 5, strokeLinecap: "round" as const, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p };
  const box = { position: "absolute" as const, left: x, top: y, opacity: 1 - out, zIndex: 9, overflow: "visible" as const };
  if (kind === "star") return <svg width={80} height={80} style={box}>{[0, 45, 90, 135].map((a) => { const r = (a * Math.PI) / 180; return <line key={a} x1={40 - 30 * Math.cos(r)} y1={40 - 30 * Math.sin(r)} x2={40 + 30 * Math.cos(r)} y2={40 + 30 * Math.sin(r)} {...st} />; })}</svg>;
  if (kind === "tick") return <svg width={80} height={70} style={box}><path d="M10 38 L 30 58 L 70 12" {...st} stroke={C.teal} strokeWidth={7} /></svg>;
  return <svg width={150} height={100} style={box}><path d="M140 15 C 100 80, 55 90, 12 62" {...st} /><path d="M12 62 L 34 52 M12 62 L 28 82" {...st} /></svg>;
}

/* ---------- transitions between topics ---------- */
export function Cover({ f, total, tin, tout }: { f: number; total: number; tin: Move; tout: Move }) {
  const a = interpolate(f, [0, 16], [1, 0], { ...clamp, easing: IO });
  const b = interpolate(f, [total - 16, total - 1], [0, 1], { ...clamp, easing: IO });
  const brush = (cover: number, leaving: boolean) => (
    <div style={{ position: "absolute", top: -80, bottom: -80, width: 2500, background: C.navy, transform: "skewX(-12deg)",
      left: leaving ? 1920 - cover * 2700 : -2600 + cover * 2700, clipPath: "polygon(3% 0%, 97% 2%, 100% 20%, 98% 45%, 100% 70%, 97% 100%, 2% 98%, 0% 75%, 2% 50%, 0% 25%)" }} />
  );
  const iris = (cover: number) => (
    <AbsoluteFill style={{ background: C.navy, WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent ${(1 - cover) * 75}%, #000 ${(1 - cover) * 75 + 0.5}%)`,
      maskImage: `radial-gradient(circle at 50% 50%, transparent ${(1 - cover) * 75}%, #000 ${(1 - cover) * 75 + 0.5}%)` }} />
  );
  return (
    <AbsoluteFill style={{ zIndex: 20, pointerEvents: "none" }}>
      {a > 0 && (tin === "brush" ? brush(a, true) : tin === "iris" ? iris(a) : null)}
      {b > 0 && (tout === "brush" ? brush(b, false) : tout === "iris" ? iris(b) : null)}
    </AbsoluteFill>
  );
}

/** A whip-pan in or out: the whole scene slides fast with a motion blur (the text moves with its card, as one unit). */
export const whip = (f: number, total: number, tin: Move, tout: Move) => {
  const a = tin === "whip" ? interpolate(f, [0, 14], [1, 0], { ...clamp, easing: OUT }) : 0;
  const b = tout === "whip" ? interpolate(f, [total - 14, total - 1], [0, 1], { ...clamp, easing: IN }) : 0;
  return { x: a * 420 - b * 420, blur: (a + b) * 16 };
};

/* ---------- a slide ---------- */
const MAP_IN = ["pop", "up", "side", "point", "circle", "drop"] as const;
const MAP_OUT = ["slide", "shrink", "circle"] as const;
const NUMBER = /\d[\d,]*(?:\.\d+)?(?:st|nd|rd|th|%)?/g;

export function Geography({ p }: { p: P }) {
  const f = useCurrentFrame();
  const total = notesFrames(p);
  const scene = p.index ?? 0;
  const bullets = p.bullets ?? [];
  const n = bullets.length;
  const geo: Geo = p.geo ?? { shots: [], side: "left" };
  const side = geo.side;
  const tin: Move = p.geo_in ?? "brush", tout: Move = p.geo_out ?? "brush";
  const open0 = tin === "swap" ? 20 : tin === "none" ? 4 : 12;
  const textAt = open0 + 28;
  const starts = bullets.map((_, k) => Math.max(textAt + 24 + k * 20, bulletFrame(p, k)));
  const cur = starts.reduce((a, s, k) => (f >= s ? k : a), -1);
  const shots = geo.shots.filter((s) => s.bullet < n);
  const ats = shots.map((s, i) => (i === 0 ? Math.max(open0 + 6, Math.min(starts[s.bullet], 40)) : starts[s.bullet]));
  // where the map starts: the last view of the slide before, or (the film's first map) a slowly turning globe
  const v0 = shots.length ? viewOf(shots[0]) : { lon: 78, lat: 22, scale: R_GLOBE };
  const start: View = geo.prev ? viewOf(geo.prev) : { lon: v0.lon - 40 + Math.min(f, ats[0] ?? 0) * 0.25, lat: v0.lat * 0.4, scale: R_GLOBE * 0.96 };
  // numbers the bullets say, counting up as they are said
  const numbers: { text: string; at: number; until: number }[] = [];
  bullets.forEach((b, k) => {
    const got = [...new Set(b.text.match(NUMBER) ?? [])].slice(0, 2);
    got.forEach((t, i) => {
      const hit = (p.key_at?.[k] ?? []).find((x) => x.t.includes(t) || t.includes(x.t));
      numbers.push({ text: t, at: Math.max(starts[k] + 10 + i * 14, hit ? hit.at : starts[k] + 24 + i * 20), until: starts[k + 1] ?? total - 20 });
    });
  });
  const shown = numbers.filter((x) => f >= x.at - 2 && f <= x.until + 12);
  // the map panel: in with one of six moves (or across from the other side in an arc), always drifting a little
  const mx = mapX(side), my = MAP.y;
  let tf = "", clip: string | undefined, op = 1;
  if (tin === "swap") {
    const s = e(f, 0, 32, IO), from = mapX(side === "left" ? "right" : "left");
    tf = `translate(${(from - mx) * (1 - s)}px, ${-80 * Math.sin(Math.PI * s)}px) scale(${1 - 0.08 * Math.sin(Math.PI * s)})`;
  } else {
    const kind = MAP_IN[scene % MAP_IN.length], a = open0 - 2, pp = e(f, a, 20, kind === "pop" || kind === "drop" ? BACK : OUT);
    if (kind === "pop") { tf = `scale(${0.7 + 0.3 * pp})`; op = Math.min(1, pp * 2); }
    if (kind === "up") tf = `translateY(${(1 - pp) * 700}px)`;
    if (kind === "side") tf = `translateX(${(1 - pp) * (side === "left" ? 1100 : -1100)}px)`;
    if (kind === "point") { tf = `scale(${pp})`; op = Math.min(1, pp * 3); }
    if (kind === "circle") clip = `circle(${pp * 75}% at 50% 50%)`;
    if (kind === "drop") { tf = `translateY(${(1 - pp) * -500}px)`; op = Math.min(1, pp * 2); }
  }
  if (tout !== "swap") {
    const kind = MAP_OUT[scene % MAP_OUT.length], q = e(f, total - 16, 14, IN);
    if (q > 0) {
      if (kind === "slide") tf += ` translateX(${q * (side === "left" ? 1100 : -1100)}px)`;
      if (kind === "shrink") { tf += ` scale(${1 - 0.6 * q})`; op *= 1 - q; }
      if (kind === "circle") clip = `circle(${(1 - q) * 75}% at 50% 50%)`;
    }
  }
  const drift = `translate(${Math.sin(f / 61) * 2}px, ${Math.cos(f / 47) * 2}px)`;
  const cv = shots.length ? (() => { const k = Math.max(0, ats.reduce((a, s, i) => (f - 10 >= s ? i : a), 0)); return viewOf(shots[k]); })() : start;
  const w = whip(f, total, tin, tout);
  const doodleAt = n > 1 ? starts[1] + 40 : (starts[0] ?? 60) + 70;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateX(${w.x}px)`, filter: w.blur ? `blur(${w.blur}px)` : undefined }}>
        <Parchment f={f} total={total} at={[cv.lon, cv.lat]} side={side} />
        <div style={{ position: "absolute", left: mx, top: my, width: MAP.w, height: MAP.h, transform: tf, opacity: op, zIndex: 4 }}>
          <div style={{ position: "absolute", inset: 0, transform: drift, clipPath: clip, borderRadius: 26, overflow: "hidden", background: "#efe4cc",
            boxShadow: "0 28px 50px rgba(70,48,18,0.28), 0 4px 10px rgba(70,48,18,0.18)", border: "6px solid #fffaf0" }}>
            <FocusMap shots={shots} ats={ats} f={f} start={start} numbers={shown} />
          </div>
        </div>
        {shots.some((s) => s.pins.length) && <Doodle kind={scene % 2 ? "star" : "arrow"} at={doodleAt} f={f} x={side === "left" ? mx - 30 : mx + MAP.w - 110} y={MAP.y + MAP.h - 150} />}
        <Card p={p} f={f} total={total} starts={starts} cur={cur} side={side} open0={open0} />
      </AbsoluteFill>
      <Cover f={f} total={total} tin={tin} tout={tout} />
    </AbsoluteFill>
  );
}

/** A picture scene in this look: the picture full screen, slowly moving, a film grain, the navy brush or iris between. */
export function GeographyPicture({ p, children }: { p: P; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const total = notesFrames(p);
  const tin: Move = p.geo_in ?? "brush", tout: Move = p.geo_out ?? "brush";
  const w = whip(f, total, tin, tout);
  const shots = p.geo?.shots ?? [];
  if (shots.length) { // a scene about where things are: the real map, full screen (never a painted one)
    const at = [Math.min(40, Math.max(20, total - 70))];
    const v0 = viewOf(shots[0], 1920, 1080);
    const start: View = p.geo?.prev ? viewOf(p.geo.prev, 1920, 1080)
      : { lon: v0.lon - 50 + Math.min(f, at[0]) * 0.3, lat: v0.lat * 0.4, scale: rOf(1920, 1080) * 0.9 };
    return (
      <AbsoluteFill style={{ overflow: "hidden", background: "#efe4cc" }}>
        <AbsoluteFill style={{ transform: `translateX(${w.x}px) scale(${1 + 0.03 * (f / total)})`, filter: w.blur ? `blur(${w.blur}px)` : undefined }}>
          <FocusMap shots={shots.slice(0, 1)} ats={at} f={f} start={start} numbers={[]} w={1920} h={1080} />
        </AbsoluteFill>
        <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.5 }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(60,40,15,0.32) 100%)" }} />
        <div style={{ position: "absolute", left: MX, bottom: 70, maxWidth: 1100, zIndex: 6 }}>
          <Banner title={p.slide_title ?? p.section ?? ""} f={f} at={14} size={52} />
        </div>
        <Cover f={f} total={total} tin={tin === "swap" ? "brush" : tin} tout={tout === "swap" ? "brush" : tout} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${w.x + Math.sin(f / 23) * 1.4}px, ${Math.cos(f / 31) * 1.4}px)`, filter: w.blur ? `blur(${w.blur}px)` : undefined }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.6 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(60,40,15,0.35) 100%)" }} />
      <Cover f={f} total={total} tin={tin === "swap" ? "brush" : tin} tout={tout === "swap" ? "brush" : tout} />
    </AbsoluteFill>
  );
}
