/* LAYER 2, part B: BLOCKS for MAPS, TIME and DIAGRAMS.
   Maps use real borders (Natural Earth via world-atlas), never drawn by guess: makeMap() gives the projection, and
   every map block takes it, so pins, routes and arrows land on the right place. */

import { geoDistance, geoGraticule10, geoInterpolate, geoNaturalEarth1, geoOrthographic, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import w110 from "world-atlas/countries-110m.json";
import indiaBorders from "./data/india-borders.json";
import { Img } from "remotion";
import { createContext, useContext, type ReactNode } from "react";
import { clamp01, family, useScene } from "../kit";
import { Connector, curve, ease, rand } from "./motion";
import { shadow, src, useIn } from "./blocks-a";
import { Part, SvgPart, block } from "./parts";
import { usePiece } from "../place";

/* ================= MAPS ================= */
type Feat = { type: "Feature"; properties: { name: string }; geometry: any };
// India is drawn with its complete official outline (Gilgit-Baltistan, PoK, Siachen and Aksai Chin in India), and Pakistan
// and China without those parts: see india_borders.mjs, which writes data/india-borders.json
export const COUNTRIES: Feat[] = ((feature(w110 as any, (w110 as any).objects.countries) as any).features as Feat[]).map((f) =>
  f.properties.name in indiaBorders ? { ...f, geometry: (indiaBorders as Record<string, unknown>)[f.properties.name] } : f);
const byName = (n: string) => COUNTRIES.find((f) => f.properties.name === n);
export type MapView = { w: number; h: number; proj: GeoProjection; path: ReturnType<typeof geoPath>; xy: (lon: number, lat: number) => [number, number] };

/** the map a piece sits in (OldMap gives one): a Pin or MapRoute written without map= is drawn on it, not dropped */
export const MapCtx = createContext<MapView | null>(null);
const WORLD = new Map<string, MapView>();
/** the map= given (when it really is one: made by makeMap), else the enclosing map's, else the whole world at full frame;
    anything else passed as map= (a made-up { center, zoom }) is ignored rather than stopping the render */
const isMap = (m: unknown): m is MapView => !!m && typeof (m as MapView).xy === "function" && typeof (m as MapView).path === "function";
export const useMapView = (map?: MapView) => {
  const near = useContext(MapCtx);
  if (isMap(map)) return map;
  if (near) return near;
  if (!WORLD.has("1920x1080")) WORLD.set("1920x1080", makeMap(1920, 1080));
  return WORLD.get("1920x1080")!;
};

/** a map fitted to the given countries (or the world), w x h px */
export function makeMap(w: number, h: number, focus: string[] = [], pad = 40): MapView {
  const feats = focus.length ? focus.map(byName).filter(Boolean) : COUNTRIES;
  const proj = geoNaturalEarth1().fitExtent([[pad, pad], [w - pad, h - pad]], { type: "FeatureCollection", features: feats } as any);
  return { w, h, proj, path: geoPath(proj), xy: (lon, lat) => proj([lon, lat]) as [number, number] };
}
/** the countries, with some filled in colour one after another; the sea and land take the theme */
function MapBaseView({ map: given, highlight = {}, at = 0, sea, land, labels = true }: { map?: MapView; highlight?: Record<string, string>; at?: number; sea?: string; land?: string; labels?: boolean }) {
  const map = useMapView(given);
  const { t, theme } = useScene();
  const names = Object.keys(highlight);
  return (
    <svg width={map.w} height={map.h} style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", background: sea ?? "#cfe3ee", borderRadius: 18 }}>
      <path d={map.path(geoGraticule10()) ?? ""} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1} />
      {COUNTRIES.map((f, i) => {
        const hi = names.indexOf(f.properties.name), k = hi < 0 ? 0 : ease.out(clamp01((t - at - hi * 0.25) / 0.6));
        return <path key={i} d={map.path(f as any) ?? ""} fill={hi < 0 ? land ?? "#f3eee2" : highlight[f.properties.name]} fillOpacity={hi < 0 ? 1 : 0.25 + 0.75 * k} stroke="#9aa3ad" strokeWidth={1} />;
      })}
      {labels && names.map((n, i) => { const f = byName(n); if (!f) return null; const [x, y] = map.path.centroid(f as any); return <text key={n} x={x} y={y} textAnchor="middle" fontSize={26} fontWeight={800} fill={theme.ink} opacity={clamp01((t - at - i * 0.25 - 0.4) / 0.4)} fontFamily={family(theme.font)} paintOrder="stroke" stroke="#fff" strokeWidth={6}>{n}</text>; })}
    </svg>
  );
}
export const MapBase = block("MapBase", MapBaseView);
/** a pin that drops onto a place, with its name */
function PinView({ map: given, lon, lat, label, at = 0, color }: { map?: MapView; lon: number; lat: number; label?: string; at?: number; color?: string }) {
  const map = useMapView(given);
  const { t, theme } = useScene();
  const [x, y] = map.xy(lon, lat), k = ease.bounce(clamp01((t - at) / 0.6));
  if (t < at) return null;
  return (
    <>
      <div style={{ position: "absolute", left: x - 30, top: y - 8, width: 60, height: 16, borderRadius: "50%", background: "rgb(0 0 0/0.25)", transform: `scale(${k})` }} />
      <Part name="pin"><div style={{ position: "absolute", left: x - 22, top: y - 60 - (1 - k) * 300, width: 44, height: 44, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: color ?? theme.accent, border: "6px solid #fff", boxShadow: shadow }} /></Part>
      {label && <div style={{ position: "absolute", left: x + 34, top: y - 74, fontFamily: family(theme.font), fontSize: 30, fontWeight: 800, color: theme.ink, background: "#fff", padding: "4px 14px", borderRadius: 10, opacity: clamp01((t - at - 0.4) / 0.3), whiteSpace: "nowrap", boxShadow: shadow }}>{label}</div>}
    </>
  );
}
export const Pin = block("Pin", PinView);
/** a journey on the map: a great-circle line drawn between places, a marker travelling it */
function MapRouteView({ map: given, stops, at = 0, dur = 3, color, width = 8 }: { map?: MapView; stops: [number, number][]; at?: number; dur?: number; color?: string; width?: number }) {
  const map = useMapView(given);
  const { t, theme } = useScene();
  const pts: [number, number][] = [];
  for (let i = 0; i < stops.length - 1; i++) { const g = geoInterpolate(stops[i], stops[i + 1]); for (let s = 0; s <= 20; s++) pts.push(map.xy(...(g(s / 20) as [number, number]))); }
  const c = curve(pts), k = ease.inOut(clamp01((t - at) / dur)), p = c.at(k);
  return (
    <svg width={map.w} height={map.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={c.d} fill="none" stroke={color ?? theme.accent} strokeWidth={width} strokeLinecap="round" strokeDasharray="1 0" pathLength={1} style={{ strokeDasharray: `${k} 2` }} />
      {k > 0 && <SvgPart name="traveller" x={p.x - 40} y={p.y - 40} w={80} h={80} item={p}><circle cx={p.x} cy={p.y} r={width * 1.6} fill="#fff" stroke={color ?? theme.accent} strokeWidth={5} /></SvgPart>}
    </svg>
  );
}
export const MapRoute = block("MapRoute", MapRouteView);
/** a thick tapering arrow that pushes along a path (an army's advance, a storm's track) */
function ArmyArrowView({ map: given, path, at = 0, dur = 2.4, color = "#c0392b", width = 46 }: { map?: MapView; path: [number, number][]; at?: number; dur?: number; color?: string; width?: number }) {
  const map = useMapView(given);  // a missing or made-up map= falls back to a real one
  const { t } = useScene();
  const c = curve(path.map(([lo, la]) => map.xy(lo, la))), k = ease.inOut(clamp01((t - at) / dur));
  if (k <= 0) return null;
  const n = 40, left: string[] = [], right: string[] = [];
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * k, p = c.at(u), a = (p.angle * Math.PI) / 180, w = (width / 2) * (0.35 + 0.65 * (1 - i / n));
    left.push(`${p.x + Math.sin(a) * w} ${p.y - Math.cos(a) * w}`); right.unshift(`${p.x - Math.sin(a) * w} ${p.y + Math.cos(a) * w}`);
  }
  const tip = c.at(k), ta = (tip.angle * Math.PI) / 180, hw = width * 0.9;
  const head = `M${tip.x + Math.cos(ta) * hw} ${tip.y + Math.sin(ta) * hw} L${tip.x + Math.sin(ta) * hw} ${tip.y - Math.cos(ta) * hw} L${tip.x - Math.sin(ta) * hw} ${tip.y + Math.cos(ta) * hw} Z`;
  return <svg width={map.w} height={map.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}><path d={`M${left.join(" L")} L${right.join(" L")} Z`} fill={color} opacity={0.85} /><path d={head} fill={color} /></svg>;
}
export const ArmyArrow = block("ArmyArrow", ArmyArrowView);
/** many curved routes between places with goods moving along them (trade, migration, flights) */
function FlowLinesView({ map: given, routes, at = 0, color }: { map?: MapView; routes: { from: [number, number]; to: [number, number]; weight?: number }[]; at?: number; color?: string }) {
  const map = useMapView(given);  // a missing or made-up map= falls back to a real one
  const { t, theme } = useScene();
  return (
    <svg width={map.w} height={map.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {routes.map((r, i) => {
        const a = map.xy(...r.from), b = map.xy(...r.to), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.3;
        const k = ease.out(clamp01((t - at - i * 0.2) / 0.9)), d = `M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}`;
        const dots = k >= 1 ? [0, 0.33, 0.66].map((o) => { const u = ((t - at) * 0.4 + o) % 1; return [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * mx + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * my + u * u * b[1]]; }) : [];
        return <g key={i}><path d={d} fill="none" stroke={color ?? theme.accent} strokeWidth={3 + (r.weight ?? 1) * 3} strokeOpacity={0.7} pathLength={1} strokeDasharray={`${k} 2`} strokeLinecap="round" />{dots.map(([x, y], j) => <SvgPart name="dot" x={x - 16} y={y - 16} w={32} h={32} key={j} item={r} i={j}><circle cx={x} cy={y} r={8} fill={color ?? theme.accent} stroke="#fff" strokeWidth={3} /></SvgPart>)}<circle cx={a[0]} cy={a[1]} r={9} fill={theme.ink} /></g>;
      })}
    </svg>
  );
}
export const FlowLines = block("FlowLines", FlowLinesView);
/** countries filled by a value, darker = more, with a legend (a choropleth) */
function ChoroplethView({ map: given, values, at = 0, color }: { map?: MapView; values: Record<string, number>; at?: number; color?: string }) {
  const map = useMapView(given);  // a missing or made-up map= falls back to a real one
  const { t, theme } = useScene();
  const max = Math.max(...Object.values(values)), k = ease.out(clamp01((t - at) / 1.2));
  return (
    <>
      <svg width={map.w} height={map.h} style={{ position: "absolute", left: 0, top: 0, background: "#dfe9ef", borderRadius: 18 }}>
        {COUNTRIES.map((f, i) => { const v = values[f.properties.name]; return <path key={i} d={map.path(f as any) ?? ""} fill={v === undefined ? "#f2efe8" : color ?? theme.accent} fillOpacity={v === undefined ? 1 : (0.15 + 0.85 * (v / max)) * k + (1 - k) * 0.05} stroke="#9aa3ad" strokeWidth={1} />; })}
      </svg>
      <div style={{ position: "absolute", left: 30, top: map.h - 70, width: 300, height: 24, borderRadius: 12, background: `linear-gradient(90deg, rgb(255 255 255), ${color ?? theme.accent})`, opacity: k }} />
    </>
  );
}
export const Choropleth = block("Choropleth", ChoroplethView);
/** borders that change over the years: which countries belong to a group, year by year */
function BorderYearsView({ map: given, frames, at = 0, per = 1.4, color }: { map?: MapView; frames: { year: string; in: string[] }[]; at?: number; per?: number; color?: string }) {
  const map = useMapView(given);  // a missing or made-up map= falls back to a real one
  const { t, theme } = useScene();
  const idx = Math.min(frames.length - 1, Math.floor(Math.max(0, t - at) / per)), f = clamp01(((t - at) % per) / 0.5);
  const now = new Set(frames[idx].in), before = new Set(frames[Math.max(0, idx - 1)].in);
  return (
    <>
      <svg width={map.w} height={map.h} style={{ position: "absolute", left: 0, top: 0, background: "#dfe9ef", borderRadius: 18 }}>
        {COUNTRIES.map((c, i) => { const n = c.properties.name, on = now.has(n), was = before.has(n); const o = on && was ? 1 : on ? f : was ? 1 - f : 0; return <path key={i} d={map.path(c as any) ?? ""} fill={o > 0 ? color ?? theme.accent : "#f2efe8"} fillOpacity={o > 0 ? 0.2 + 0.8 * o : 1} stroke="#9aa3ad" strokeWidth={1} />; })}
      </svg>
      <div style={{ position: "absolute", right: 40, bottom: 30, fontFamily: family(theme.display), fontSize: 120, fontWeight: 800, color: theme.ink, opacity: 0.8 }}>{frames[idx].year}</div>
    </>
  );
}
export const BorderYears = block("BorderYears", BorderYearsView);
/** a globe that turns to a place and comes closer, and the place lights up; labels point at its real points by name (id, default "globe"): to="globe.equator" (where the equator crosses the middle of the visible face), "globe.equator.left" / ".right" (its visible ends), "globe.pole.n" / "globe.pole.s", "globe.center", or "globe.LAT,LON" ("globe.-33.9,18.4"); a point on the far side gives nothing */
function GlobeView({ lon, lat, size = 640, at = 0, dur = 2.6, highlight = [], color, id = "globe" }: { lon: number; lat: number; size?: number; at?: number; dur?: number; highlight?: string[]; color?: string; id?: string }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), spin = (1 - k) * 160;
  const proj = geoOrthographic().translate([size / 2, size / 2]).scale((size / 2.05) * (1 + k * 0.35)).rotate([-lon + spin, -lat * k, 0]).clipAngle(90);
  const path = geoPath(proj);
  // the globe's named points, from its own projection on this very frame (only what faces the viewer)
  const face: [number, number] = [lon - spin, lat * k];
  const seen = (p: [number, number]) => (geoDistance(p, face) < Math.PI / 2 - 0.02 ? (proj(p) as [number, number] | null) : null);
  usePiece(id, { w: size, h: size, at: (name) => {
    if (name === "center") return [size / 2, size / 2];
    if (name === "equator") return seen([face[0], 0]);
    if (name === "equator.left" || name === "equator.right") {
      for (let d = 88; d > 0; d -= 4) { const p = seen([face[0] + (name === "equator.left" ? -d : d), 0]); if (p) return p; }
      return null;
    }
    if (name === "pole.n") return seen([0, 90]);
    if (name === "pole.s") return seen([0, -90]);
    const m = name.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
    return m ? seen([Number(m[2]), Number(m[1])]) : null;
  } });
  return (
    <svg data-piece={id} width={size} height={size} style={{ overflow: "visible" }}>
      <defs><radialGradient id="sea" cx="38%" cy="32%"><stop offset="0%" stopColor="#7fb7de" /><stop offset="100%" stopColor="#1f4f7a" /></radialGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={proj.scale()} fill="url(#sea)" />
      <path d={path(geoGraticule10()) ?? ""} fill="none" stroke="#fff" strokeOpacity={0.15} />
      {COUNTRIES.map((f, i) => <path key={i} d={path(f as any) ?? ""} fill={highlight.includes(f.properties.name) && k > 0.7 ? color ?? theme.accent : "#e9e1cc"} stroke="#8c8a7e" strokeWidth={0.8} />)}
      <circle cx={size / 2} cy={size / 2} r={proj.scale()} fill="none" stroke="rgb(255 255 255/0.4)" strokeWidth={4} />
    </svg>
  );
}
export const Globe = block("Globe", GlobeView);
/** a satellite photo with a scan line and coordinates, as if seen from orbit */
function SatelliteView({ image, w = 1100, h = 640, at = 0, coords = "28.61°N 77.20°E" }: { image: string; w?: number; h?: number; at?: number; coords?: string }) {
  const { t, u } = useIn(at, 0.8);
  const scan = ((t - at) * 0.35) % 1;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: 14, opacity: u, boxShadow: shadow }}>
      <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.25 - 0.15 * u + (t - at) * 0.01})`, filter: "saturate(0.8) contrast(1.1)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgb(120 255 160/0.18) 1px, transparent 1px), linear-gradient(90deg, rgb(120 255 160/0.18) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: `${scan * 100}%`, height: 4, background: "rgb(120 255 160/0.8)", boxShadow: "0 0 30px 8px rgb(120 255 160/0.4)" }} />
      <div style={{ position: "absolute", left: w / 2 - 60, top: h / 2 - 60, width: 120, height: 120, border: "4px solid rgb(120 255 160)", borderRadius: 8 }} />
      <div style={{ position: "absolute", left: 20, bottom: 16, fontFamily: "monospace", fontSize: 26, color: "rgb(120 255 160)" }}>{coords}  ·  ALT 412 KM</div>
    </div>
  );
}
export const Satellite = block("Satellite", SatelliteView);

/* ================= TIME ================= */
/** a horizontal timeline: the line draws, a playhead moves, and events pop up above and below */
function TimelineView({ events, w = 1600, at = 0, dur = 4 }: { events: { year: string; label: string }[]; w?: number; at?: number; dur?: number }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur));
  return (
    <div style={{ position: "relative", width: w, height: 400, fontFamily: family(theme.font) }}>
      <div style={{ position: "absolute", left: 0, top: 196, height: 8, width: w * k, background: theme.ink, borderRadius: 4 }} />
      {events.map((e, i) => {
        const x = ((i + 0.5) / events.length) * w, on = ease.back(clamp01((k * w - x) / 120)), up = i % 2 === 0;
        return <Part name="event" key={i} i={i}><div style={{ position: "absolute", left: x, top: 200, transform: "translateX(-50%)" }}>
         <div style={{ position: "absolute", left: -16, top: -16, width: 32, height: 32, borderRadius: "50%", background: theme.accent, border: "6px solid #fff", transform: `scale(${on})`, boxShadow: shadow }} />
          <div style={{ position: "absolute", left: -2, top: up ? -90 : 16, width: 4, height: 74 * on, background: theme.muted }} />
          <div style={{ position: "absolute", left: "50%", top: up ? -190 : 96, transform: `translateX(-50%) scale(${on})`, textAlign: "center", width: 300 }}>
            <div style={{ fontFamily: family(theme.display), fontSize: 46, fontWeight: 800, color: theme.accent }}>{e.year}</div>
            <div style={{ fontSize: 28, color: theme.ink, fontWeight: 600 }}>{e.label}</div>
          </div>
        </div></Part>;
      })}
    </div>
  );
}
export const Timeline = block("Timeline", TimelineView);
/** a vertical timeline that scrolls up as each event arrives */
function VTimelineView({ events, at = 0, per = 0.9, h = 760, w = 900 }: { events: { year: string; label: string }[]; at?: number; per?: number; h?: number; w?: number }) {
  const { t, theme } = useScene();
  const n = clamp01((t - at) / (per * events.length)) * events.length, row = 160;
  const scroll = Math.max(0, n * row - h + row);
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", fontFamily: family(theme.font) }}>
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        <div style={{ position: "absolute", left: 160, top: 0, width: 6, height: n * row, background: theme.ink }} />
        {events.map((e, i) => { const k = ease.out(clamp01(n - i)); return <div key={i} style={{ position: "absolute", top: i * row + 30, left: 0, display: "flex", alignItems: "center", gap: 40, opacity: k, transform: `translateX(${(1 - k) * 60}px)` }}>
          <div style={{ width: 130, textAlign: "right", fontFamily: family(theme.display), fontSize: 44, fontWeight: 800, color: theme.accent }}>{e.year}</div>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: theme.accent, border: "6px solid #fff", flex: "none" }} />
          <div style={{ fontSize: 34, color: theme.ink, fontWeight: 600 }}>{e.label}</div>
        </div>; })}
      </div>
    </div>
  );
}
export const VTimeline = block("VTimeline", VTimelineView);
/** long eras as coloured bands on a time axis, with a marker sweeping through them */
function EraBandsView({ eras, start, end, w = 1600, at = 0, dur = 3 }: { eras: { name: string; from: number; to: number; color?: string }[]; start: number; end: number; w?: number; at?: number; dur?: number }) {
  const { t, theme } = useScene();
  const X = (y: number) => ((y - start) / (end - start)) * w, k = ease.inOut(clamp01((t - at) / dur));
  const palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8"];
  return (
    <div style={{ position: "relative", width: w, height: 260, fontFamily: family(theme.font) }}>
      {eras.map((e, i) => { const o = ease.out(clamp01((t - at - i * 0.2) / 0.5)); return <div key={i} style={{ position: "absolute", left: X(e.from), width: X(e.to) - X(e.from), top: 40, height: 120, background: e.color ?? palette[i % palette.length], opacity: 0.85 * o, borderRadius: 10, color: "#fff", fontSize: 30, fontWeight: 800, display: "grid", placeItems: "center", transform: `scaleY(${o})` }}>{e.name}</div>; })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 180, height: 4, background: theme.ink }} />
      {[start, Math.round((start + end) / 2), end].map((y) => <div key={y} style={{ position: "absolute", left: X(y), top: 196, transform: "translateX(-50%)", fontSize: 28, color: theme.muted }}>{y < 0 ? `${-y} BCE` : y}</div>)}
      <div style={{ position: "absolute", left: k * w - 3, top: 20, width: 6, height: 170, background: theme.ink }} />
    </div>
  );
}
export const EraBands = block("EraBands", EraBandsView);
/** a month on a calendar; days get crossed off one after another */
function MonthCalendarView({ month = "OCTOBER", days = 31, startDay = 3, upto = 24, at = 0, size = 620 }: { month?: string; days?: number; startDay?: number; upto?: number; at?: number; size?: number }) {
  const { t, theme } = useScene();
  const crossed = Math.floor(clamp01((t - at) / 2.5) * upto), cell = size / 7;
  return (
    <div style={{ width: size, background: theme.paper ?? "#fff", borderRadius: 20, overflow: "hidden", boxShadow: shadow, fontFamily: family(theme.font) }}>
      <div style={{ background: theme.accent, color: "#fff", textAlign: "center", fontFamily: family(theme.display), fontSize: 44, fontWeight: 800, padding: 14 }}>{month}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cell}px)`, padding: "10px 0" }}>
        {Array.from({ length: startDay + days }, (_, i) => { const d = i - startDay + 1; return <div key={i} style={{ height: cell * 0.75, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 600, color: theme.ink, position: "relative" }}>{d > 0 ? d : ""}{d > 0 && d <= crossed && <svg style={{ position: "absolute" }} width={cell * 0.7} height={cell * 0.6}><path d={`M6 6 L${cell * 0.7 - 6} ${cell * 0.6 - 6} M${cell * 0.7 - 6} 6 L6 ${cell * 0.6 - 6}`} stroke={theme.accent} strokeWidth={5} strokeLinecap="round" /></svg>}</div>; })}
      </div>
    </div>
  );
}
export const MonthCalendar = block("MonthCalendar", MonthCalendarView);
/** two pictures of the same place, then and now, with a slider that wipes between them */
function BeforeAfterView({ before, after, w = 1200, h = 680, at = 0, labels = ["BEFORE", "AFTER"] }: { before: string; after: string; w?: number; h?: number; at?: number; labels?: [string, string] }) {
  const { t, theme } = useScene();
  const x = 0.5 + 0.38 * Math.sin(Math.max(0, t - at) * 0.9 - Math.PI / 2) * -1;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 16, overflow: "hidden", boxShadow: shadow, fontFamily: family(theme.font) }}>
      <Img src={src(after)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
      <Img src={src(before)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", clipPath: `inset(0 ${(1 - x) * 100}% 0 0)`, filter: "sepia(0.6)" }} />
      <div style={{ position: "absolute", left: x * w - 4, top: 0, bottom: 0, width: 8, background: "#fff" }} />
      <div style={{ position: "absolute", left: x * w - 36, top: h / 2 - 36, width: 72, height: 72, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", fontSize: 30, fontWeight: 800, color: theme.ink }}>⇆</div>
      {labels.map((l, i) => <div key={l} style={{ position: "absolute", top: 24, [i ? "right" : "left"]: 24, background: "rgb(0 0 0/0.6)", color: "#fff", fontSize: 30, fontWeight: 800, padding: "6px 16px", borderRadius: 8 }}>{l}</div>)}
    </div>
  );
}
export const BeforeAfter = block("BeforeAfter", BeforeAfterView);
/** a family tree: generations connect one row after another */
function FamilyTreeView({ rows, at = 0, w = 1400 }: { rows: string[][]; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const rowH = 220, pos = rows.map((r, ri) => r.map((_, i) => [((i + 0.5) / r.length) * w, ri * rowH + 60] as [number, number]));
  return (
    <div style={{ position: "relative", width: w, height: rows.length * rowH, fontFamily: family(theme.font) }}>
      {pos.slice(1).map((r, ri) => r.map((p, i) => { const parent = pos[ri][Math.min(pos[ri].length - 1, Math.floor((i / r.length) * pos[ri].length))]; return <Connector key={`${ri}-${i}`} from={[parent[0], parent[1] + 50]} to={[p[0], p[1] - 50]} at={at + (ri + 1) * 0.8 - 0.4} bend={0} width={4} color={theme.muted} />; }))}
      {rows.map((r, ri) => r.map((name, i) => { const k = ease.back(clamp01((t - at - ri * 0.8 - i * 0.1) / 0.5)); const [x, y] = pos[ri][i]; return <Part name="person" item={name} i={i}><div key={`${ri}-${i}`} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${k})`, background: theme.paper ?? "#fff", border: `4px solid ${ri === 0 ? theme.accent : theme.accent2}`, borderRadius: 14, padding: "12px 22px", fontSize: 28, fontWeight: 700, color: theme.ink, whiteSpace: "nowrap", boxShadow: shadow }}>{name}</div></Part>; }))}
    </div>
  );
}
export const FamilyTree = block("FamilyTree", FamilyTreeView);
/** big digits counting down, with a ring that empties (a deadline, a launch) */
function CountdownView({ from = 10, at = 0, size = 420, color }: { from?: number; at?: number; size?: number; color?: string }) {
  const { t, theme } = useScene();
  const s = Math.max(0, t - at), n = Math.max(0, from - Math.floor(s)), f = s % 1;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}><circle cx={size / 2} cy={size / 2} r={size / 2 - 20} fill="none" stroke={theme.muted} strokeOpacity={0.25} strokeWidth={24} /><circle cx={size / 2} cy={size / 2} r={size / 2 - 20} fill="none" stroke={color ?? theme.accent} strokeWidth={24} pathLength={1} strokeDasharray={`${1 - f} 2`} strokeLinecap="round" /></svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: family(theme.display), fontSize: size * 0.45, fontWeight: 800, color: theme.ink, transform: `scale(${1 + 0.15 * Math.exp(-f * 8)})` }}>{n}</div>
    </div>
  );
}
export const Countdown = block("Countdown", CountdownView);

/* ================= DIAGRAMS ================= */
const boxStyle = (theme: any, k: number, fill?: string) => ({ position: "absolute" as const, transform: `translate(-50%,-50%) scale(${ease.back(k)})`, background: fill ?? theme.paper ?? "#fff", color: fill ? "#fff" : theme.ink, border: `4px solid ${theme.ink}`, borderRadius: 16, padding: "16px 26px", fontSize: 30, fontWeight: 700, whiteSpace: "nowrap" as const, boxShadow: shadow, textAlign: "center" as const });
/** a flowchart: boxes and a yes/no decision appear in order, joined by growing arrows */
function FlowchartView({ nodes, edges, at = 0, per = 0.6 }: { nodes: { id: string; label: string; x: number; y: number; kind?: "box" | "decision" | "end" }[]; edges: [string, string, string?][]; at?: number; per?: number }) {
  const { t, theme } = useScene();
  const pos = Object.fromEntries(nodes.map((n, i) => [n.id, { ...n, i }]));
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: family(theme.font) }}>
      {edges.map(([a, b, label], i) => { const A = pos[a], B = pos[b], when = at + Math.max(A.i, B.i) * per - per * 0.4; return <div key={i}><Connector from={[A.x, A.y]} to={[B.x + (A.x - B.x) * 0.12, B.y + (A.y - B.y) * 0.22]} at={when} bend={0} width={5} />{label && <div style={{ position: "absolute", left: (A.x + B.x) / 2 + 12, top: (A.y + B.y) / 2 - 22, fontSize: 26, fontWeight: 800, color: theme.accent, opacity: clamp01((t - when - 0.5) / 0.3) }}>{label}</div>}</div>; })}
      {nodes.map((n, i) => { const k = clamp01((t - at - i * per) / 0.5); return n.kind === "decision"
        ? <div key={n.id} style={{ ...boxStyle(theme, k, theme.accent), left: n.x, top: n.y, borderRadius: 8, padding: 0, width: 190, height: 190, display: "grid", placeItems: "center", transform: `translate(-50%,-50%) rotate(45deg) scale(${ease.back(k)})` }}><div style={{ transform: "rotate(-45deg)", fontSize: 28 }}>{n.label}</div></div>
        : <div key={n.id} style={{ ...boxStyle(theme, k, n.kind === "end" ? theme.accent2 : undefined), left: n.x, top: n.y, borderRadius: n.kind === "end" ? 50 : 16 }}>{n.label}</div>; })}
    </div>
  );
}
export const Flowchart = block("Flowchart", FlowchartView);
/** numbered steps in a row, each lighting up in turn with an arrow to the next */
function ProcessStepsView({ steps, at = 0, per = 0.7, w = 1600 }: { steps: string[]; at?: number; per?: number; w?: number }) {
  const { t, theme } = useScene();
  const cw = w / steps.length;
  return (
    <div style={{ position: "relative", width: w, height: 300, fontFamily: family(theme.font) }}>
      {steps.map((s, i) => { const k = ease.back(clamp01((t - at - i * per) / 0.5)), lit = t > at + i * per; return <Part name="step" key={i} item={s} i={i}><div style={{ position: "absolute", left: i * cw + cw / 2, top: 120, transform: `translate(-50%,-50%) scale(${k})`, textAlign: "center", width: cw - 60 }}>
       <div style={{ width: 110, height: 110, margin: "0 auto", borderRadius: "50%", background: lit ? theme.accent : theme.muted, color: "#fff", display: "grid", placeItems: "center", fontFamily: family(theme.display), fontSize: 56, fontWeight: 800, boxShadow: shadow }}>{i + 1}</div>
        <div style={{ fontSize: 30, fontWeight: 700, color: theme.ink, marginTop: 18 }}>{s}</div>
      </div></Part>; })}
      {steps.slice(1).map((_, i) => <Connector key={i} from={[i * cw + cw / 2 + 70, 120]} to={[(i + 1) * cw + cw / 2 - 75, 120]} at={at + (i + 1) * per - 0.3} bend={0} width={6} color={theme.muted} />)}
    </div>
  );
}
export const ProcessSteps = block("ProcessSteps", ProcessStepsView);
/** a cycle: stages round a circle, arrows turning between them for ever (water cycle, business cycle) */
function CycleLoopView({ stages, size = 700, at = 0 }: { stages: string[]; size?: number; at?: number }) {
  const { t, theme } = useScene();
  const r = size / 2 - 90, c = size / 2, n = stages.length, spin = Math.max(0, t - at - n * 0.3) * 30;
  return (
    <div style={{ position: "relative", width: size, height: size, fontFamily: family(theme.font) }}>
      <svg width={size} height={size} style={{ position: "absolute", transform: `rotate(${spin}deg)` }}>
        {stages.map((_, i) => { const a0 = (i / n) * Math.PI * 2 + 0.35, a1 = ((i + 1) / n) * Math.PI * 2 - 0.35, k = clamp01((t - at - i * 0.3) / 0.5); return <g key={i} opacity={k}><path d={`M${c + Math.cos(a0) * r} ${c + Math.sin(a0) * r} A${r} ${r} 0 0 1 ${c + Math.cos(a1) * r} ${c + Math.sin(a1) * r}`} fill="none" stroke={theme.accent} strokeWidth={10} strokeLinecap="round" /><circle cx={c + Math.cos(a1) * r} cy={c + Math.sin(a1) * r} r={14} fill={theme.accent} /></g>; })}
      </svg>
      {stages.map((s, i) => { const a = (i / n) * Math.PI * 2, k = ease.back(clamp01((t - at - i * 0.3) / 0.5)); return <Part name="node" key={i} i={i}><div style={{ ...boxStyle(theme, k), left: c + Math.cos(a) * r, top: c + Math.sin(a) * r }}>{s}</div></Part>; })}
    </div>
  );
}
export const CycleLoop = block("CycleLoop", CycleLoopView);
/** a hierarchy that grows down from the top (an org chart, a family of ideas); `cards` draws people as cards */
function TreeChartView({ root, children: kids, at = 0, w = 1400, cards = false }: { root: string; children: { label: string; children?: string[] }[]; at?: number; w?: number; cards?: boolean }) {
  const { t, theme } = useScene();
  const cx = w / 2, y0 = 70, y1 = 300, y2 = 520;
  const node = (label: string, x: number, y: number, k: number, top = false) => <div key={`${label}${x}`} style={{ ...boxStyle(theme, k, top ? theme.ink : undefined), left: x, top: y, padding: cards ? "10px 20px 14px" : "14px 24px", fontSize: top ? 34 : 28 }}>{cards && <div style={{ width: 54, height: 54, borderRadius: "50%", background: top ? theme.accent : theme.accent2, margin: "0 auto 6px" }} />}{label}</div>;
  const items: ReactNode[] = [node(root, cx, y0, clamp01((t - at) / 0.5), true)];
  kids.forEach((c, i) => {
    const x = ((i + 0.5) / kids.length) * w;
    items.push(<Connector key={`e${i}`} from={[cx, y0 + 50]} to={[x, y1 - 60]} at={at + 0.4} bend={0} width={4} color={theme.muted} />, node(c.label, x, y1, clamp01((t - at - 0.8 - i * 0.1) / 0.5)));
    (c.children ?? []).forEach((g, j, all) => { const gx = x + (j - (all.length - 1) / 2) * 190; items.push(<Connector key={`e${i}-${j}`} from={[x, y1 + 40]} to={[gx, y2 - 50]} at={at + 1.3} bend={0} width={3} color={theme.muted} />, node(g, gx, y2, clamp01((t - at - 1.7 - j * 0.1) / 0.5))); });
  });
  return <div style={{ position: "relative", width: w, height: 620, fontFamily: family(theme.font) }}>{items}</div>;
}
export const TreeChart = block("TreeChart", TreeChartView);
export const OrgChart = (p: { root: string; children: { label: string; children?: string[] }[]; at?: number; w?: number }) => <TreeChart {...p} cards />;
/** a mind map: the big idea in the middle, branches curving out to ideas around it */
function MindMapView({ center, ideas, size = 900, at = 0 }: { center: string; ideas: string[]; size?: number; at?: number }) {
  const { t, theme } = useScene();
  const c = size / 2, n = ideas.length, palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8", "#d86a8f"];
  return (
    <div style={{ position: "relative", width: size * 1.6, height: size, fontFamily: family(theme.font) }}>
      <svg width={size * 1.6} height={size} style={{ position: "absolute", overflow: "visible" }}>
        {ideas.map((_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = size * 0.8 + Math.cos(a) * size * 0.62, y = c + Math.sin(a) * size * 0.4, k = ease.out(clamp01((t - at - 0.4 - i * 0.15) / 0.6)); return <path key={i} d={`M${size * 0.8} ${c} Q${size * 0.8 + Math.cos(a) * size * 0.25} ${c + Math.sin(a) * size * 0.05} ${x} ${y}`} fill="none" stroke={palette[i % palette.length]} strokeWidth={12} strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 2`} />; })}
      </svg>
      <div style={{ ...boxStyle(theme, clamp01((t - at) / 0.5), theme.ink), left: size * 0.8, top: c, fontSize: 40, borderRadius: 60, padding: "24px 40px" }}>{center}</div>
      {ideas.map((s, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, k = clamp01((t - at - 0.9 - i * 0.15) / 0.5); return <Part name="node" key={i} i={i}><div style={{ ...boxStyle(theme, k), left: size * 0.8 + Math.cos(a) * size * 0.62, top: c + Math.sin(a) * size * 0.4, borderColor: palette[i % palette.length] }}>{s}</div></Part>; })}
    </div>
  );
}
export const MindMap = block("MindMap", MindMapView);
/** circles slide together and the overlap gets its name */
function VennView({ sets, overlap, size = 420, at = 0 }: { sets: string[]; overlap: string; size?: number; at?: number }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / 1.2)), n = sets.length, palette = [theme.accent, theme.accent2, "#e0b24a"];
  const off = size * (0.95 - 0.6 * k);
  return (
    <div style={{ position: "relative", width: size * 2.4, height: size * 2, fontFamily: family(theme.font) }}>
      {sets.map((s, i) => { const a = n === 2 ? (i ? 0 : Math.PI) : (i / n) * Math.PI * 2 - Math.PI / 2; const x = size * 1.2 + Math.cos(a) * off * 0.6, y = size + (n === 2 ? 0 : Math.sin(a) * off * 0.6); return <Part name="circle" key={s} item={s} i={i}><div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: "50%", background: palette[i], opacity: 0.55, mixBlendMode: "multiply", display: "grid", placeItems: "center" }}><div style={{ fontSize: 36, fontWeight: 800, color: theme.ink, transform: `translate(${Math.cos(a) * size * 0.22}px, ${n === 2 ? 0 : Math.sin(a) * size * 0.22}px)` }}>{s}</div></div></Part>; })}
      <div style={{ position: "absolute", left: size * 1.2, top: size, transform: `translate(-50%,-50%) scale(${ease.back(clamp01((t - at - 1.3) / 0.5))})`, background: theme.ink, color: "#fff", fontSize: 30, fontWeight: 800, padding: "8px 18px", borderRadius: 12 }}>{overlap}</div>
    </div>
  );
}
export const Venn = block("Venn", VennView);
/** a funnel: each stage narrower, with how many make it through (the last stays wide enough for its label) */
function FunnelView({ stages, w = 1000, at = 0 }: { stages: { label: string; value: string }[]; w?: number; at?: number }) {
  const { t, theme } = useScene();
  const n = stages.length, palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8"];
  return (
    <div style={{ width: w, fontFamily: family(theme.font) }}>
      {stages.map((s, i) => { const k = ease.out(clamp01((t - at - i * 0.35) / 0.6)), top = w * (1 - i / (n + 1.6)), bot = w * (1 - (i + 1) / (n + 1.6)); return <Part name="stage" key={i} i={i}><div style={{ position: "relative", height: 110, margin: "6px auto", width: top, clipPath: `polygon(0 0,100% 0,${50 + (bot / top) * 50}% 100%,${50 - (bot / top) * 50}% 100%)`, background: palette[i % palette.length], opacity: k, transform: `scaleX(${0.6 + 0.4 * k})`, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, color: "#fff", fontSize: 32, fontWeight: 800 }}>{s.label}<span style={{ opacity: 0.85 }}>{s.value}</span></div></Part>; })}
    </div>
  );
}
export const Funnel = block("Funnel", FunnelView);
/** a pyramid built level by level from the base up (Maslow, food chain, wealth) */
function PyramidView({ levels, w = 900, at = 0 }: { levels: string[]; w?: number; at?: number }) {
  const { t, theme } = useScene();
  const n = levels.length, lh = 120, palette = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8"];
  return (
    <div style={{ position: "relative", width: w, height: n * lh, fontFamily: family(theme.font) }}>
      {levels.map((l, i) => { const lvl = n - 1 - i, k = ease.bounce(clamp01((t - at - lvl * 0.45) / 0.6)); const tw = (w * i) / n, bw = (w * (i + 1)) / n; return <Part name="level" key={i} i={i}><div style={{ position: "absolute", top: i * lh - (1 - k) * 400, left: 0, width: w, height: lh - 6, opacity: t > at + lvl * 0.45 ? 1 : 0, clipPath: `polygon(${(w - tw) / 2}px 0, ${(w + tw) / 2}px 0, ${(w + bw) / 2}px 100%, ${(w - bw) / 2}px 100%)`, background: palette[lvl % palette.length], display: "grid", placeItems: "center", color: "#fff", fontSize: 30, fontWeight: 800 }}>{i === 0 ? "" : l}{i === 0 && <span style={{ position: "absolute", top: 36, fontSize: 24 }}>{l}</span>}</div></Part>; })}
    </div>
  );
}
export const Pyramid = block("Pyramid", PyramidView);
/** a 2x2 matrix: two axes, four quadrants, and items that land in their quadrant */
function Matrix2x2View({ x, y, quads, items, size = 760, at = 0 }: { x: string; y: string; quads: [string, string, string, string]; items: { label: string; x: number; y: number }[]; size?: number; at?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / 0.8));
  return (
    <div style={{ position: "relative", width: size, height: size, fontFamily: family(theme.font) }}>
      {quads.map((q, i) => <Part name="quadrant" key={q} i={i}><div style={{ position: "absolute", left: (i % 2) * size / 2, top: Math.floor(i / 2) * size / 2, width: size / 2 - 6, height: size / 2 - 6, background: i === 1 ? theme.accent : theme.paper ?? "#fff", opacity: k * (i === 1 ? 0.25 : 1), borderRadius: 12 }} /></Part>)}
      {quads.map((q, i) => <div key={`l${q}`} style={{ position: "absolute", left: (i % 2) * size / 2 + 20, top: Math.floor(i / 2) * size / 2 + 16, fontSize: 28, fontWeight: 800, color: theme.muted, opacity: k }}>{q}</div>)}
      <div style={{ position: "absolute", left: 0, right: 0, top: size / 2 - 3, height: 6, background: theme.ink, transform: `scaleX(${k})` }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: size / 2 - 3, width: 6, background: theme.ink, transform: `scaleY(${k})` }} />
      <div style={{ position: "absolute", bottom: -50, width: "100%", textAlign: "center", fontSize: 30, fontWeight: 700, color: theme.ink }}>{x} →</div>
      <div style={{ position: "absolute", left: -60, top: size / 2, transform: "rotate(-90deg) translate(-50%, 0)", transformOrigin: "0 0", fontSize: 30, fontWeight: 700, color: theme.ink }}>{y} →</div>
      {items.map((it, i) => { const m = ease.back(clamp01((t - at - 1 - i * 0.3) / 0.5)); return <div key={it.label} style={{ position: "absolute", left: it.x * size, top: (1 - it.y) * size, transform: `translate(-50%,-50%) scale(${m})`, background: theme.ink, color: "#fff", fontSize: 26, fontWeight: 700, padding: "8px 16px", borderRadius: 30, whiteSpace: "nowrap" }}>{it.label}</div>; })}
    </div>
  );
}
export const Matrix2x2 = block("Matrix2x2", Matrix2x2View);
/** nodes joined by lines, with signals pulsing along the links (a network, a supply web, friends) */
function NetworkView({ nodes = 12, w = 1200, h = 640, at = 0, labels = [] }: { nodes?: number; w?: number; h?: number; at?: number; labels?: string[] }) {
  const { t, theme } = useScene();
  const pts = Array.from({ length: nodes }, (_, i) => [80 + rand(i * 3) * (w - 160) + Math.sin(t * 0.5 + i) * 8, 60 + rand(i * 3 + 1) * (h - 120) + Math.cos(t * 0.4 + i) * 8] as [number, number]);
  const links: [number, number][] = [];
  pts.forEach((p, i) => { const near = pts.map((q, j) => [j, Math.hypot(q[0] - p[0], q[1] - p[1])] as [number, number]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2); near.forEach(([j]) => { if (i < j) links.push([i, j]); }); });
  return (
    <svg width={w} height={h} style={{ overflow: "visible", fontFamily: family(theme.font) }}>
      {links.map(([a, b], i) => { const k = clamp01((t - at - 0.3 - i * 0.05) / 0.5), u = ((t - at) * 0.6 + i * 0.37) % 1; return <g key={i} opacity={k}><line x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke={theme.muted} strokeWidth={3} /><circle cx={pts[a][0] + (pts[b][0] - pts[a][0]) * u} cy={pts[a][1] + (pts[b][1] - pts[a][1]) * u} r={7} fill={theme.accent} /></g>; })}
      {pts.map((p, i) => { const k = ease.back(clamp01((t - at - i * 0.05) / 0.4)); return <g key={i} transform={`translate(${p[0]} ${p[1]}) scale(${k})`}><SvgPart name="node" x={i === 0 ? -34 : -22} y={i === 0 ? -34 : -22} w={i === 0 ? 68 : 44} h={i === 0 ? 68 : 44} item={labels[i]} i={i}><circle r={i === 0 ? 34 : 22} fill={i === 0 ? theme.accent : theme.accent2} stroke="#fff" strokeWidth={5} /></SvgPart>{labels[i] && <text y={i === 0 ? 70 : 54} textAnchor="middle" fontSize={26} fontWeight={700} fill={theme.ink}>{labels[i]}</text>}</g>; })}
    </svg>
  );
}
export const Network = block("Network", NetworkView);
