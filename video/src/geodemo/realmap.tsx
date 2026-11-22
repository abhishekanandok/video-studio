/* Real-map kit: draws a region built by geo.py (real terrain, borders, rivers, towns) full screen, with a camera that
   flies between real places. Positions are always lon/lat, so nothing on the map is invented.
     const m = useRealMap(MAP);                       // MAP = public/geo/<name>/map.json
     <MapStage m={m} cam={cam}> ...layers... </MapStage>  where cam = flyTo(frame, [[f0, view0], [f1, view1], ...])
   Layers inside the stage are SVG in map pixels; labels/callouts sit in screen pixels so text never scales. */
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { geoMercator, geoPath, GeoProjection } from "d3-geo";

export const W = 1920, H = 1080;

type Feature = { type: "Feature"; properties: Record<string, any>; geometry: any };
export type MapData = {
  bbox: [number, number, number, number];
  countries: Feature[]; states: Feature[]; rivers: Feature[];
  places: { name: string; lon: number; lat: number; pop: number; capital: boolean }[];
  relief: { src: string; width: number; height: number };
  low: Record<string, { src: string; below: number }>;
};

export type RealMap = { data: MapData; proj: GeoProjection; path: ReturnType<typeof geoPath>; w: number; h: number; xy: (lon: number, lat: number) => [number, number];
  /** where a real place is on the screen under a camera (for pieces drawn over the map); [lon, lat] */
  toScreen: (cam: Cam, at: [number, number]) => [number, number] };

export const useRealMap = (data: MapData): RealMap => {
  const [w0, , e0, n0] = data.bbox;
  const { width: w, height: h } = data.relief;
  const k = (w * 360) / (e0 - w0);              // world size in px at the relief's zoom (Web Mercator)
  const mx = ((w0 + 180) / 360) * k;
  const my = ((1 - Math.log(Math.tan((n0 * Math.PI) / 180) + 1 / Math.cos((n0 * Math.PI) / 180)) / Math.PI) / 2) * k;
  const proj = geoMercator().scale(k / (2 * Math.PI)).translate([k / 2 - mx, k / 2 - my]);
  const xy = (lon: number, lat: number) => proj([lon, lat]) as [number, number];
  return { data, proj, path: geoPath(proj), w, h, xy, toScreen: (cam, [lon, lat]) => { const [x, y] = xy(lon, lat); return [x * cam.s + cam.tx, y * cam.s + cam.ty]; } };
};

/* ---- camera ---------------------------------------------------------------------------------------------------- */
export type View = { lon: number; lat: number; span: number };   // span = degrees of longitude across the screen
export type Cam = { s: number; tx: number; ty: number };

const camOf = (m: RealMap, v: View): Cam => {
  const [cx, cy] = m.xy(v.lon, v.lat);
  const [ax] = m.xy(v.lon - v.span / 2, v.lat), [bx] = m.xy(v.lon + v.span / 2, v.lat);
  const s = Math.max(W / (bx - ax), W / m.w, H / m.h);           // never zoom out past the map's edge
  const tx = Math.min(0, Math.max(W - m.w * s, W / 2 - cx * s));
  const ty = Math.min(0, Math.max(H - m.h * s, H / 2 - cy * s));
  return { s, tx, ty };
};

/* Keys are [frame, view]; between keys the camera eases, zooming in log space so a fly-in feels even. */
export const flyTo = (m: RealMap, frame: number, keys: [number, View][]): Cam => {
  const cams = keys.map(([f, v]) => [f, camOf(m, v)] as const);
  if (frame <= cams[0][0]) return cams[0][1];
  for (let i = 1; i < cams.length; i++) {
    const [f0, a] = cams[i - 1], [f1, b] = cams[i];
    if (frame <= f1) {
      const t = interpolate(frame, [f0, f1], [0, 1], { easing: Easing.bezier(0.65, 0, 0.35, 1) });
      const s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t);
      // keep the point under the screen centre moving in map space, so the fly does not swing sideways
      const ca = [(W / 2 - a.tx) / a.s, (H / 2 - a.ty) / a.s], cb = [(W / 2 - b.tx) / b.s, (H / 2 - b.ty) / b.s];
      const cx = ca[0] + (cb[0] - ca[0]) * t, cy = ca[1] + (cb[1] - ca[1]) * t;
      return { s, tx: W / 2 - cx * s, ty: H / 2 - cy * s };
    }
  }
  return cams[cams.length - 1][1];
};

const Ctx = createContext<{ m: RealMap; cam: Cam } | null>(null);
// labels written after </MapStage> (not in its `screen` slot) use the stage drawn just before them in the same scene
let LAST: { m: RealMap; cam: Cam } | null = null;
const useStage = () => useContext(Ctx) ?? LAST!;

/* Screen position of a real place under the current camera. */
export const useScreen = () => {
  const { m, cam } = useStage();
  return (lon: number, lat: number): [number, number] => { const [x, y] = m.xy(lon, lat); return [x * cam.s + cam.tx, y * cam.s + cam.ty]; };
};

/* Children: <MapLayer> blocks (map pixels) and then screen-space pieces (labels, callouts) after `screen`. */
/* skin "paper": the real terrain printed on warm paper (sepia, soft contrast, paper fibres), for paper and collage styles */
export const MapStage: React.FC<{ m: RealMap; cam: Cam; children?: React.ReactNode; screen?: React.ReactNode; grade?: number; skin?: "real" | "paper" }> = ({ m, cam, children, screen, grade = 0, skin = "real" }) => {
  LAST = { m, cam };
  const paper = skin === "paper";
  const tone = paper ? "sepia(0.5) saturate(0.65) contrast(0.82) brightness(1.1)" : "";
  return (
  <Ctx.Provider value={{ m, cam }}>
    <AbsoluteFill style={{ backgroundColor: paper ? "#d9cdb4" : "#9abed6", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: m.w, height: m.h, transformOrigin: "0 0", transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})` }}>
        <Img src={staticFile(m.data.relief.src)} style={{ position: "absolute", width: m.w, height: m.h, filter: `${tone} saturate(${1 - grade * 0.5}) brightness(${1 - grade * 0.12})` }} />
        {children}
      </div>
      {paper && (
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, mixBlendMode: "multiply", opacity: 0.35 }}>
          <filter id="paper-fibre"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={7} /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width={W} height={H} filter="url(#paper-fibre)" />
        </svg>
      )}
      {/* soft lens vignette, like a real documentary map (warm on paper) */}
      <AbsoluteFill style={{ background: paper ? "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(90,60,30,0.28) 100%)" : "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(10,20,30,0.38) 100%)" }} />
      <AbsoluteFill>{screen}</AbsoluteFill>
    </AbsoluteFill>
  </Ctx.Provider>
  );
};

/* An SVG layer in map pixels. Strokes stay the same width on screen whatever the zoom. */
export const MapLayer: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const { m } = useStage();
  return <svg width={m.w} height={m.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}>{children}</svg>;
};

export const Borders: React.FC<{ kind: "countries" | "states"; only?: string[]; stroke: string; width: number; dash?: string; opacity?: number; fill?: string }> = ({ kind, only, stroke, width, dash, opacity = 1, fill = "none" }) => {
  const { m } = useStage();
  const fs = m.data[kind].filter((f) => !only || only.includes(f.properties.name));
  return <g opacity={opacity}>{fs.map((f, i) => <path key={i} d={m.path(f) || ""} fill={fill} stroke={stroke} strokeWidth={width} strokeDasharray={dash} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />)}</g>;
};

/* A real river drawn from source to mouth as `progress` goes 0 → 1 (only its longest run, which geo.py chains). */
export const River: React.FC<{ name: string; progress: number; color?: string; width?: number; glow?: boolean }> = ({ name, progress, color = "#1f6fb5", width = 4, glow = true }) => {
  const { m } = useStage();
  const f = m.data.rivers.find((r) => r.properties.name === name);
  if (!f) return null;
  const line = { type: "LineString", coordinates: f.geometry.coordinates[0] };
  const d = m.path(line as any) || "";
  const dash = { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - Math.max(0, Math.min(1, progress)) };
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {glow && <path d={d} stroke="#e8f6ff" strokeWidth={width + 5} opacity={0.55} vectorEffect="non-scaling-stroke" {...dash} />}
      <path d={d} stroke={color} strokeWidth={width} vectorEffect="non-scaling-stroke" {...dash} />
    </g>
  );
};

/* A point a fraction t along a river's main run (for a moving river label or a callout target). */
export const alongRiver = (m: RealMap, name: string, t: number): [number, number] => {
  const c: [number, number][] = m.data.rivers.find((r) => r.properties.name === name)!.geometry.coordinates[0];
  return c[Math.max(0, Math.min(c.length - 1, Math.round(t * (c.length - 1))))];
};

/* ---- screen-space text ------------------------------------------------------------------------------------------ */
export const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

export const PlaceDot: React.FC<{ lon: number; lat: number; name: string; show: number; side?: "r" | "l"; big?: boolean }> = ({ lon, lat, name, show, side = "r", big }) => {
  const at = useScreen();
  const [x, y] = at(lon, lat);
  if (show <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: show, transform: `scale(${0.6 + 0.4 * show})` }}>
      <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: 7, background: "#fff", border: "3px solid #1d2b36", boxSizing: "border-box" }} />
      <div style={{ position: "absolute", top: -17, [side === "r" ? "left" : "right"]: 16, whiteSpace: "nowrap", fontFamily: FONT, fontWeight: big ? 800 : 600, fontSize: big ? 30 : 25, color: "#16222b", textShadow: "0 0 6px #fff, 0 0 3px #fff, 0 0 2px #fff" } as React.CSSProperties}>{name}</div>
    </div>
  );
};

export const AreaLabel: React.FC<{ lon: number; lat: number; text: string; show: number; size?: number; color?: string; spacing?: number }> = ({ lon, lat, text, show, size = 34, color = "rgba(30,40,50,0.75)", spacing = 0.35 }) => {
  const at = useScreen();
  const [x, y] = at(lon, lat);
  return <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", opacity: show, fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: `${spacing}em`, color, whiteSpace: "nowrap", textShadow: "0 0 10px rgba(255,255,255,0.7)" }}>{text}</div>;
};

/* A label card with a leader line to a real point: dot on the place, line drawn out, card fades up at its end. */
export const Callout: React.FC<{ lon: number; lat: number; dx: number; dy: number; title: string; sub?: string; t: number; accent?: string }> = ({ lon, lat, dx, dy, title, sub, t, accent = "#e4572e" }) => {
  const at = useScreen();
  const [x, y] = at(lon, lat);
  if (t <= 0) return null;
  // keep the card inside the frame: flip it to the other side of its line if it would run off an edge
  const right = dx >= 0 ? x + dx < W - 560 : x + dx < 560;
  const cx = Math.max(24, Math.min(W - 24, x + dx)), cy = Math.max(90, Math.min(H - 90, y + dy));
  dx = cx - x; dy = cy - y;
  const line = Math.min(1, t * 2), card = Math.max(0, Math.min(1, t * 2 - 1));
  const ex = x + dx * line, ey = y + dy * line;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <circle cx={x} cy={y} r={9} fill={accent} stroke="#fff" strokeWidth={3} />
        <circle cx={x} cy={y} r={9 + 18 * line} fill="none" stroke={accent} strokeWidth={2} opacity={1 - line} />
        <line x1={x} y1={y} x2={ex} y2={ey} stroke="#16222b" strokeWidth={3} />
      </svg>
      <div style={{ position: "absolute", left: x + dx, top: y + dy, transform: `translate(${right ? "0" : "-100%"}, -50%) translateY(${(1 - card) * 12}px)`, opacity: card,
        background: "rgba(255,255,255,0.96)", borderLeft: `8px solid ${accent}`, padding: "14px 22px", borderRadius: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", fontFamily: FONT, color: "#16222b", maxWidth: 520 }}>
        <div style={{ fontWeight: 800, fontSize: 36, lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontWeight: 500, fontSize: 24, marginTop: 6, color: "#3c4b56" }}>{sub}</div>}
      </div>
    </>
  );
};

export const Credit: React.FC<{ text?: string }> = ({ text = "Terrain: Mapzen / AWS Open Data · Map data: Natural Earth" }) => (
  <div style={{ position: "absolute", right: 24, bottom: 18, fontFamily: FONT, fontSize: 16, color: "rgba(20,30,40,0.6)", textShadow: "0 0 4px #fff" }}>{text}</div>
);
