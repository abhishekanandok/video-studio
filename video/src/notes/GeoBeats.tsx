/** The World Geography look, explained on the visuals (the creator, 2026-10-18): no bullets while the teacher explains.
 *  Each point is a "beat" (video/audiofilm.py geo_beats), starting on the word where it is said:
 *   - map: a real map drawn by code, in 3D when close (the plane tilts back, states and countries rise as blocks).
 *     India is always drawn with its official boundary (Survey of India based: all of J&K and Ladakh) and every state.
 *     Techniques: border, pins, route, spotlight, compare, morph, scribble, extrude, rank, hemispheres, daynight, depth,
 *     lines. A real photo zooms out of a pin, with one pointer line about it.
 *   - scene: a moving illustration drawn by code (mountains, desert, sea, plains, coast, plateau; sun, rain, wind blocked
 *     by mountains, rivers, ships, cities, minerals...).
 *  The topic's notes (the slide's bullets) come at the end, on a paper card at one side, while the map moves aside.
 *  The camera flies from one beat to the next, and from one topic to the next. */
import { geoArea, geoCentroid, geoCircle, geoDistance, geoGraticule10, geoInterpolate, geoNaturalEarth1, geoOrthographic, geoPath, geoTransform } from "d3-geo";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import india from "./data/india.json";
import { BACK, BOUNCE, BY, C, C110, C50, Banner, Cover, FONT, GRAIN, IN, IO, OUT, Parchment, Sheet, area, clamp, e, outerRings, partial,
  resample, whip, type Move } from "./Geography";
import { notesFrames, segments, type NotesProps } from "./Notes";

const W = 1920, H = 1080;
type Feat = { type: "Feature"; properties: { name: string; kind?: string }; geometry: { type: string; coordinates: any } };
// the Survey of India file winds its rings either way: a ring that would cover more than half the Earth is turned round
// (else its fill covers the whole globe); holes are dropped (none of them matters at this scale)
const IND = ((india as any).features as Feat[]).map((x) => ({ ...x, geometry: { type: "MultiPolygon",
  coordinates: x.geometry.coordinates.map((poly: any) => {
    const r = poly[0];
    return [geoArea({ type: "Polygon", coordinates: [r] } as any) > 2 * Math.PI ? [...r].reverse() : r];
  }) } }));
const INDIA_PARTS = IND.filter((x) => x.properties.kind === "country");
const STATES = IND.filter((x) => x.properties.kind === "state");
const STATE = new Map(STATES.map((x) => [x.properties.name, x]));
const INDIA: any = { type: "FeatureCollection", features: INDIA_PARTS };
// the world without Natural Earth's India: the official outline is drawn over it (and over its neighbours' claims)
const WORLD50 = C50.filter((x) => x.properties.name !== "India"), WORLD110 = C110.filter((x) => x.properties.name !== "India");
const shapeOf = (name: string): any => (name === "India" ? INDIA : STATE.get(name) ?? BY.get(name));

export type BPin = { name: string; lon: number; lat: number; label?: boolean; photo_src?: string | null; photo_credit?: string };
export type BLine = { kind: "lat" | "lon"; deg: number; label: string; at?: number | null };
export type Beat = { at: number; kind: "map" | "scene"; pointer?: string; view?: string; tilt?: boolean; technique?: string; countries?: string[];
  states?: string[]; pins?: BPin[]; lines?: BLine[]; route?: [number, number][]; route_kind?: string; compare?: string; setting?: string;
  elements?: string[] };
export type GeoB = { beats: Beat[]; notes_at: number | null; side: "left" | "right"; prev?: Beat | null; beats_v?: number };
type P = NotesProps & { geo?: GeoB | null; geo_in?: Move; geo_out?: Move };

/* ---------- the camera ---------- */
type Cam = { lon: number; lat: number; scale: number; tilt: number; flat: boolean };
const EARTH = 6371, R0 = Math.min(W, H) * 0.42, TILT = 0.6;
const CAMS = new Map<string, Cam>();

function focusShapes(b: Beat, near: boolean): any[] {
  const out: any[] = [];
  const pins = b.pins ?? [];
  if (!near || (!pins.length && !(b.states ?? []).length)) for (const n of b.countries ?? []) { const s = shapeOf(n); if (s) out.push(s); }
  for (const n of b.states ?? []) { const s = STATE.get(n); if (s) out.push(s); }
  for (const p of pins) out.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lon, p.lat] } });
  if ((b.route ?? []).length > 1) out.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: b.route } });
  if (!out.length) out.push(INDIA);
  return out;
}

function camOf(b: Beat): Cam {
  const key = JSON.stringify([b.view, b.tilt, b.technique, b.countries, b.states, (b.pins ?? []).map((p) => [p.lon, p.lat]), b.route]);
  const got = CAMS.get(key);
  if (got) return got;
  const view = b.view ?? "country";
  let cam: Cam;
  if (view === "world" || b.technique === "rank") cam = { lon: 15, lat: 10, scale: 1, tilt: 0, flat: true };
  else {
    const coll: any = { type: "FeatureCollection", features: focusShapes(b, view === "region" || view === "place") };
    let [lon, lat] = geoCentroid(coll);
    if (!isFinite(lon)) [lon, lat] = [80, 22];
    let scale = R0;
    const tilt = b.tilt && view !== "globe" && b.technique !== "hemispheres" && b.technique !== "daynight" ? TILT : 0;
    if (view === "globe" || b.technique === "hemispheres") scale = R0 * 1.05;
    else {
      const padX = 220, padY = tilt ? 120 : 150;
      const pr = geoOrthographic().rotate([-lon, -lat]).fitExtent([[padX, padY], [W - padX, H - padY]], coll);
      const minKm = view === "place" ? 380 : view === "region" ? 750 : 0;
      scale = Math.max(R0 * 1.2, Math.min(pr.scale() * (tilt ? 0.92 : 1), minKm ? (W * EARTH) / minKm : 1e9));
    }
    cam = { lon, lat, scale, tilt, flat: false };
  }
  CAMS.set(key, cam);
  return cam;
}

const START: Cam = { lon: 40, lat: 15, scale: R0 * 0.95, tilt: 0, flat: false };

function fly(a: Cam, b: Cam, t: number): Cam {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const [lon, lat] = geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(t);
  const d = geoDistance([a.lon, a.lat], [b.lon, b.lat]);
  let ls = Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * t;
  const dip = Math.min(1, d / 0.5) * Math.max(0, Math.log(Math.min(a.scale, b.scale)) - Math.log(R0)) * 0.75;
  ls -= dip * Math.sin(Math.PI * t);
  return { lon, lat, scale: Math.exp(ls), tilt: a.tilt + (b.tilt - a.tilt) * t, flat: false };
}

/* ---------- a map frame ---------- */
type Geo = { path: any; pt: (ll: [number, number]) => [number, number] | null; visible: (ll: [number, number]) => boolean; cam: Cam };

function project(cam: Cam, cx: number, cy: number, k: number): Geo {
  if (cam.flat) {
    const pr = geoNaturalEarth1().rotate([-cam.lon, 0]).fitExtent([[120, 150], [W - 120, H - 90]], { type: "Sphere" } as any);
    pr.scale(pr.scale() * k).translate([cx + (pr.translate()[0] - W / 2) * k, cy + (pr.translate()[1] - H / 2) * k]);
    return { path: geoPath(pr), pt: (ll) => pr(ll) as any, visible: () => true, cam };
  }
  const pr = geoOrthographic().rotate([-cam.lon, -cam.lat]).scale(cam.scale * k).translate([cx, cy]).clipAngle(90)
    .clipExtent([[-500, -600], [W + 500, H + 400]]).precision(0.5);
  const th = cam.tilt, P = 1700;
  const T = (x: number, y: number): [number, number] => {
    if (!th) return [x, y];
    const yy = y - cy, z = yy * Math.sin(th), s = P / (P - z);
    return [cx + (x - cx) * s, cy + 60 * Math.sin(th) + yy * Math.cos(th) * s];
  };
  const tilt = geoTransform({ point(this: any, x: number, y: number) { const q = T(x, y); this.stream.point(q[0], q[1]); } });
  const path = geoPath({ stream: (o: any) => pr.stream((tilt as any).stream(o)) } as any);
  return {
    path, cam,
    pt: (ll) => { const q = pr(ll); return q ? T(q[0], q[1]) : null; },
    visible: (ll) => geoDistance(ll, [cam.lon, cam.lat]) < Math.PI / 2 - 0.03,
  };
}

/** A shape raised as a 3D block: its sides stacked below its top, the top in colour with a white paper edge. */
function Block({ d, h, top, side, o = 1 }: { d: string; h: number; top: string; side: string; o?: number }) {
  if (!d) return null;
  const steps = Math.max(1, Math.round(h / 2));
  return (
    <g opacity={o}>
      <path d={d} transform={`translate(6, ${10})`} fill="rgba(40,28,10,0.25)" style={{ filter: "blur(6px)" }} />
      {Array.from({ length: steps }, (_, i) => <path key={i} d={d} transform={`translate(0, ${-i * 2})`} fill={side} />)}
      <path d={d} transform={`translate(0, ${-h})`} fill={top} stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
}

function MapFrame({ b, f, cam, cx, cy, k, until, notesP }: { b: Beat; f: number; cam: Cam; cx: number; cy: number; k: number; until: number; notesP: number }) {
  const at = b.at;
  const lt = f - at;
  const g = project(cam, cx, cy, k);
  const { path, pt } = g;
  const tech = b.technique ?? "pins";
  const zoomed = !cam.flat && cam.scale * k > 900;
  const base = zoomed ? WORLD50 : WORLD110;
  // states named: those rise (India stays flat around them); else the countries
  const focusNames = (b.states ?? []).length && tech !== "rank" ? [...(b.states ?? [])] : [...(b.countries ?? [])];
  const focus = focusNames.map(shapeOf).filter(Boolean);
  const dim = focus.length && tech !== "hemispheres" ? e(f, at + 4, 20, IO) : 0;
  const rise = e(f, at + 10, 22, BACK);
  const sphere = path({ type: "Sphere" }) ?? "";
  const indiaD = path(INDIA) ?? "";
  const hi = tech === "extrude" || tech === "spotlight" || tech === "depth" || ((b.states ?? []).length > 0 && tech !== "border");
  let layer: React.ReactNode = null;

  if (tech === "border" && focus.length) {
    const p = e(f, at + 8, 34, IO), fill = e(f, at + 36, 16);
    const rings = focus.flatMap((s: any) => (s.features ? s.features.flatMap(outerRings) : outerRings(s))).sort((a: any, c: any) => area(c) - area(a)).slice(0, 14);
    const parts = rings.map((r: any) => partial(r, p));
    const tip = p < 1 && parts[0] ? pt(parts[0].tip) : null;
    layer = (<g>
      {focus.map((s: any, i: number) => <path key={i} d={path(s) ?? ""} fill={C.mustardSoft} fillOpacity={0.85 * fill} />)}
      <path d={parts.map((q: any) => path(q.line) ?? "").join(" ")} fill="none" stroke={C.mustard} strokeWidth={10} opacity={0.45} style={{ filter: "blur(5px)" }} />
      <path d={parts.map((q: any) => path(q.line) ?? "").join(" ")} fill="none" stroke={C.mustard} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
      {tip && <><circle cx={tip[0]} cy={tip[1]} r={16} fill={C.mustard} opacity={0.4} style={{ filter: "blur(4px)" }} /><circle cx={tip[0]} cy={tip[1]} r={7} fill="#fff" stroke={C.mustard} strokeWidth={3} /></>}
    </g>);
  }
  if (hi && focus.length) {
    layer = (<g>
      {tech === "spotlight" && <path d={sphere} fill={`rgba(20,26,44,${0.45 * e(f, at + 6, 18, IO)})`} />}
      {focus.map((s: any, i: number) => <Block key={i} d={path(s) ?? ""} h={(tech === "depth" ? 10 : 18) * rise} top={i % 2 ? "#eec35a" : C.mustard} side="#9a6f1e" />)}
    </g>);
  }
  if (tech === "rank") {
    const list = (b.countries ?? []).map(shapeOf).filter(Boolean);
    layer = (<g>
      {list.map((s: any, i: number) => {
        const r = e(f, at + 14 + i * 12, 18, BACK), last = i === list.length - 1;
        const c = pt(geoCentroid(s));
        return (<g key={i}>
          <Block d={path(s) ?? ""} h={(30 - i * 2.5) * r} top={last ? C.mustard : C.teal} side={last ? "#9a6f1e" : "#245a57"} o={Math.min(1, r * 2)} />
          {c && r > 0 && <g transform={`translate(${c[0]}, ${c[1] - 34 - (30 - i * 2.5)}) scale(${r})`}>
            <circle r={26} fill={last ? C.navy : "#fff"} stroke={last ? "#fff" : C.navy} strokeWidth={4} />
            <text y={10} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={28} fill={last ? "#fff" : C.navy}>{i + 1}</text>
          </g>}
        </g>);
      })}
    </g>);
  }
  if (tech === "hemispheres") {
    const l1 = e(f, at + 8, 26, IO), l2 = e(f, at + 26, 26, IO), n = e(f, at + 50, 20), ea = e(f, at + 80, 20);
    const eq = partial([[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]] as any, l1), pm = partial([[0, -89], [0, 0], [0, 89]] as any, l2);
    layer = (<g>
      <path d={path(geoCircle().center([0, 90]).radius(90)()) ?? ""} fill={`rgba(61,140,136,${0.3 * n})`} />
      <path d={path(geoCircle().center([90, 0]).radius(90)()) ?? ""} fill={`rgba(224,165,38,${0.3 * ea})`} />
      <path d={path(eq.line) ?? ""} fill="none" stroke={C.navy} strokeWidth={5} />
      <path d={path(pm.line) ?? ""} fill="none" stroke={C.navy} strokeWidth={5} strokeDasharray="14 8" />
      <path d={indiaD} fill={C.mustard} opacity={e(f, at + 100, 16)} stroke="#fff" strokeWidth={2.5} />
    </g>);
  }
  if (tech === "daynight") {
    // the sun's light sweeps from east to west: it is morning in the east while the west is still in the dark
    const lons = [...(b.pins ?? []).map((p) => p.lon), ...focus.map((s: any) => geoCentroid(s)[0])];
    const east = Math.max(97, ...lons), west = Math.min(68, ...lons);
    const sun = interpolate(f, [at, Math.max(at + 60, until - 20)], [east + 90 + 12, west + 90 - 4], { ...clamp, easing: IO });
    const night = path(geoCircle().center([sun - 180, 0]).radius(90)()) ?? "";
    layer = (<g>
      <path d={night} fill="rgba(14,20,52,0.5)" style={{ filter: "blur(14px)" }} />
      <path d={night} fill="rgba(14,20,52,0.32)" />
    </g>);
  }
  if (tech === "lines") {
    layer = (<g>{(b.lines ?? []).map((ln, i) => {
      const la = Math.max(at + 10 + i * 20, ln.at ?? 0); // drawn the moment its number is said
      const p = e(f, la, 30, IO);
      const coords: [number, number][] = ln.kind === "lat" ? Array.from({ length: 73 }, (_, j) => [-180 + j * 5, ln.deg]) : Array.from({ length: 35 }, (_, j) => [ln.deg, -85 + j * 5]);
      const q = partial(coords, p);
      const scr = q.dense.map((c) => (g.visible(c) ? pt(c) : null)).filter((x): x is [number, number] => !!x && x[0] > 60 && x[0] < W - 60 && x[1] > 80 && x[1] < H - 60);
      const tag = scr.length ? (ln.kind === "lat" ? scr.reduce((a, c) => (c[0] > a[0] ? c : a)) : scr.reduce((a, c) => (c[1] < a[1] ? c : a))) : null;
      const lab = e(f, la + 24, 14, BACK);
      const col = ln.kind === "lat" ? C.teal : C.navy;
      return (<g key={i}>
        <path d={path(q.line) ?? ""} fill="none" stroke="#fff" strokeWidth={8} opacity={0.8} />
        <path d={path(q.line) ?? ""} fill="none" stroke={col} strokeWidth={4} strokeDasharray="16 9" />
        {tag && lab > 0 && <g transform={`translate(${tag[0] + (ln.kind === "lat" ? -20 : 0)}, ${tag[1] + (ln.kind === "lat" ? 0 : 24)}) scale(${lab})`}>
          <rect x={ln.kind === "lat" ? -ln.label.length * 19 - 30 : -(ln.label.length * 19 + 30) / 2} y={-28} width={ln.label.length * 19 + 30} height={52} rx={10} fill={col} stroke="#fff" strokeWidth={3} />
          <text x={ln.kind === "lat" ? -15 : 0} y={10} textAnchor={ln.kind === "lat" ? "end" : "middle"} fontFamily={FONT} fontWeight={900} fontSize={32} fill="#fff">{ln.label}</text>
        </g>}
      </g>);
    })}</g>);
  }
  if (tech === "depth") {
    // arrows come at the country from every side and stop before they get in; rings of depth spread from its heart
    const c = pt(geoCentroid(focus[0] ?? INDIA));
    const bb = path.bounds(focus[0] ?? INDIA) as [[number, number], [number, number]];
    if (c && bb) {
      const rx = (bb[1][0] - bb[0][0]) / 2, ry = (bb[1][1] - bb[0][1]) / 2;
      const extra = (<g>
        {[0, 1, 2].map((k2) => { const q = ((f - at) / 70 + k2 / 3) % 1; return <ellipse key={k2} cx={c[0]} cy={c[1]} rx={rx * 0.9 * q} ry={ry * 0.9 * q} fill="none" stroke={C.navy} strokeWidth={3} opacity={(1 - q) * 0.6 * e(f, at + 30, 20)} />; })}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.3, p = e(f, at + 20 + i * 5, 36, OUT);
          const r1 = 1.7, r2 = 1.7 - 0.62 * p;
          const x1 = c[0] + Math.cos(a) * rx * r1, y1 = c[1] + Math.sin(a) * ry * r1, x2 = c[0] + Math.cos(a) * rx * r2, y2 = c[1] + Math.sin(a) * ry * r2;
          const stop = e(f, at + 56 + i * 5, 12);
          const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
          return (<g key={i} opacity={p > 0 ? 1 - 0.6 * stop : 0}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b4442f" strokeWidth={7} strokeLinecap="round" />
            <path d="M -16 -12 L 6 0 L -16 12 Z" fill="#b4442f" transform={`translate(${x2}, ${y2}) rotate(${ang})`} />
            {stop > 0 && <line x1={x2 + Math.cos(a + Math.PI / 2) * 22} y1={y2 + Math.sin(a + Math.PI / 2) * 22} x2={x2 - Math.cos(a + Math.PI / 2) * 22} y2={y2 - Math.sin(a + Math.PI / 2) * 22} stroke={C.navy} strokeWidth={8} strokeLinecap="round" opacity={stop} />}
          </g>);
        })}
      </g>);
      layer = <>{layer}{extra}</>;
    }
  }
  if ((tech === "compare" || tech === "morph") && b.compare && focus.length) {
    const other = shapeOf(b.compare), fc = pt(geoCentroid(focus[0]));
    if (other && fc && !cam.flat) {
      const oc = geoCentroid(other);
      const pr2 = geoOrthographic().rotate([-oc[0], -oc[1]]).scale(cam.scale * k).translate([fc[0], fc[1]]).clipAngle(90);
      if (tech === "compare") {
        const p = e(f, at + 30, 32, IO);
        const d = geoPath(pr2)(other) ?? "";
        layer = (<g>{layer}<Block d={path(focus[0]) ?? ""} h={10} top={C.mustard} side="#9a6f1e" />
          <g transform={`translate(${(1 - p) * 900}, ${(1 - p) * -60})`} opacity={Math.min(1, p * 2)}><path d={d} fill="rgba(61,140,136,0.45)" stroke="#fff" strokeWidth={6} /><path d={d} fill="none" stroke={C.teal} strokeWidth={4} /></g></g>);
      } else {
        const big = (s: any): [number, number][] | null => { const r = (s.features ? s.features.flatMap(outerRings) : outerRings(s)).sort((a: any, c: any) => area(c) - area(a))[0]; return r ? r.map((q: any) => pt(q)).filter(Boolean) : null; };
        const A0 = big(focus[0]);
        const B0r = outerRings(other).sort((a, c) => area(c) - area(a))[0];
        const B0 = B0r ? (B0r.map((q) => pr2(q)).filter(Boolean) as [number, number][]) : null;
        const m = e(f, at + 34, 46, IO);
        if (A0 && B0 && A0.length > 3 && B0.length > 3) {
          const N = 200, A = resample(A0, N), B = resample(B0, N);
          let best = 0, bestD = Infinity;
          for (let o = 0; o < N; o += 4) { let d = 0; for (let i = 0; i < N; i += 8) { const q = B[(i + o) % N]; d += Math.hypot(A[i][0] - q[0], A[i][1] - q[1]); } if (d < bestD) { bestD = d; best = o; } }
          const d = "M" + A.map((p, i) => { const q = B[(i + best) % N]; return `${(p[0] + (q[0] - p[0]) * m).toFixed(1)},${(p[1] + (q[1] - p[1]) * m).toFixed(1)}`; }).join("L") + "Z";
          layer = <g><path d={d} fill={`rgba(61,140,136,${0.25 + 0.2 * m})`} stroke="#fff" strokeWidth={7} /><path d={d} fill="none" stroke={m < 1 ? C.mustard : C.teal} strokeWidth={4.5} /></g>;
        }
      }
    }
  }
  if (tech === "route" && (b.route ?? []).length > 1) {
    const q = partial(b.route!, e(f, at + 14, 50, IO));
    const tip = pt(q.tip), river = b.route_kind === "river";
    const col = river ? C.teal : C.navy;
    layer = (<g>{layer}
      <path d={path(q.line) ?? ""} fill="none" stroke="#fff" strokeWidth={river ? 12 : 10} strokeLinecap="round" opacity={0.85} />
      <path d={path(q.line) ?? ""} fill="none" stroke={col} strokeWidth={river ? 7 : 5} strokeLinecap="round" strokeDasharray={river ? undefined : "2 14"} />
      {tip && <circle cx={tip[0]} cy={tip[1]} r={9} fill="#fff" stroke={col} strokeWidth={4} />}
    </g>);
  }
  // the states of India, when close enough to see them; the official outline always
  const stateLines = zoomed ? STATES.map((s, i) => <path key={i} d={path(s) ?? ""} fill="none" stroke="#fffaf0" strokeWidth={1.4} opacity={0.9} />) : null;
  // pins: dropped on each place, named; the first with a photo opens it (PhotoCallout, outside the svg)
  const pins = (b.pins ?? []).map((p, i) => ({ ...p, t: at + 16 + i * 12, q: g.visible([p.lon, p.lat]) ? pt([p.lon, p.lat]) : null }));
  const scrib = tech === "scribble" ? e(f, at + 30, 24, IO) : 0;
  const pq = pins.map((p) => p.q).filter(Boolean) as [number, number][];
  const placed: number[][] = [];
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="sea" cx="40%" cy="35%" r="75%"><stop offset="0" stopColor="#c4ddd7" /><stop offset="1" stopColor="#8fb8b1" /></radialGradient>
        <radialGradient id="shade" cx="38%" cy="32%" r="70%"><stop offset="0.55" stopColor="rgba(0,0,0,0)" /><stop offset="1" stopColor="rgba(20,30,55,0.38)" /></radialGradient>
      </defs>
      {!cam.flat && cam.scale * k < 1100 && <circle cx={cx} cy={cy} r={cam.scale * k + 14} fill="none" stroke="rgba(170,210,215,0.55)" strokeWidth={22} style={{ filter: "blur(10px)" }} />}
      <path d={sphere} fill="url(#sea)" />
      <path d={path(geoGraticule10()) ?? ""} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
      {base.map((c, i) => { const d = path(c); return d ? <path key={i} d={d} fill={dim > 0.5 && !focusNames.includes(c.properties.name) ? C.landDim : C.land} stroke="#c3b493" strokeWidth={0.8} /> : null; })}
      <path d={indiaD} fill="#f6ecd3" stroke={C.sepia} strokeWidth={2} />
      {stateLines}
      <path d={indiaD} fill="none" stroke={C.sepia} strokeWidth={2.2} />
      {layer}
      {!cam.flat && cam.scale * k < 1100 && <path d={sphere} fill="url(#shade)" />}
      {pq.length > 0 && scrib > 0 && (() => {
        const x0 = Math.min(...pq.map((p) => p[0])), x1 = Math.max(...pq.map((p) => p[0])), y0 = Math.min(...pq.map((p) => p[1])), y1 = Math.max(...pq.map((p) => p[1]));
        const cx2 = (x0 + x1) / 2, cy2 = (y0 + y1) / 2, rx = Math.max(90, (x1 - x0) / 2 + 80), ry = Math.max(70, (y1 - y0) / 2 + 60);
        const pts = Array.from({ length: 60 }, (_, i) => { const a = (i / 54) * Math.PI * 2 - 0.4, w = 1 + 0.05 * Math.sin(i * 1.7); return `${(cx2 + rx * w * Math.cos(a)).toFixed(1)},${(cy2 + ry * w * Math.sin(a)).toFixed(1)}`; });
        return <polyline points={pts.join(" ")} fill="none" stroke={C.mustard} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - scrib} style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))" }} />;
      })()}
      {pins.map((p, i) => {
        if (!p.q || p.q[0] < 20 || p.q[0] > W - 20 || p.q[1] < 20 || p.q[1] > H - 20) return null;
        const d = e(f, p.t, 16, BOUNCE), rip = e(f, p.t + 12, 26, OUT);
        if (d <= 0) return null;
        const lw = p.name.length * 15 + 32;
        const right = p.q[0] + 26 + lw < W - 30;
        const lx = right ? p.q[0] + 26 : p.q[0] - 26 - lw;
        let ly = p.q[1] - 70;
        for (let tries = 0; tries < 10 && placed.some((r) => lx < r[0] + r[2] && lx + lw > r[0] && ly < r[1] + 50 && ly + 50 > r[1]); tries++) ly += 52;
        placed.push([lx, ly, lw]);
        const lab = e(f, p.t + 10, 12, BACK) * (1 - notesP);
        return (
          <g key={i}>
            {rip > 0 && rip < 1 && <ellipse cx={p.q[0]} cy={p.q[1]} rx={10 + 50 * rip} ry={(10 + 50 * rip) * (cam.tilt ? 0.55 : 1)} fill="none" stroke={C.mustard} strokeWidth={3} opacity={1 - rip} />}
            <ellipse cx={p.q[0]} cy={p.q[1]} rx={11 * d} ry={5 * d} fill="rgba(0,0,0,0.3)" />
            <g transform={`translate(${p.q[0]}, ${p.q[1] - (1 - d) * 90})`} opacity={Math.min(1, d * 1.5)}>
              <path d="M0 0 C 0 0 -19 -24 -19 -38 A 19 19 0 1 1 19 -38 C 19 -24 0 0 0 0 Z" fill={i === 0 ? C.mustard : C.teal} stroke="#fff" strokeWidth={3.5} />
              <circle cx={0} cy={-38} r={7} fill="#fff" />
            </g>
            {p.label !== false && lab > 0 && (
              <g opacity={Math.min(1, lab * 1.5)} transform={`translate(${lx}, ${ly})`}>
                <rect width={lw} height={46} rx={9} fill={C.navy} stroke="#fff" strokeWidth={2.5} />
                <text x={16} y={32} fontFamily={FONT} fontWeight={900} fontSize={27} fill="#fff">{p.name}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** A real photo of the place zooming out of its pin, with one pointer line under it (and its licence credit). */
function PhotoCallout({ b, f, cam, cx, cy, k, until, notesP }: { b: Beat; f: number; cam: Cam; cx: number; cy: number; k: number; until: number; notesP: number }) {
  const pin = (b.pins ?? []).find((p) => p.photo_src);
  if (!pin) return null;
  const g = project(cam, cx, cy, k);
  const q = g.visible([pin.lon, pin.lat]) ? g.pt([pin.lon, pin.lat]) : null;
  const from = q ?? [cx, cy];
  const a = b.at + 40;
  const p = e(f, a, 26, BACK) * (1 - e(f, until - 14, 12, IN)) * (1 - notesP);
  if (p <= 0.01) return null;
  const cw = 640, ch = 420;
  const tx = from[0] < W / 2 ? Math.min(W - cw - 90, Math.max(from[0] + 160, W - cw - 120)) : Math.max(90, Math.min(from[0] - 160 - cw, 120));
  const ty = 150;
  const x = from[0] + (tx - from[0]) * p, y = from[1] + (ty - from[1]) * p, w = 30 + (cw - 30) * p, h = 20 + (ch - 20) * p;
  const t = interpolate(f, [a, until], [0, 1], clamp);
  const near: [number, number] = [tx + (from[0] < tx ? 0 : cw), ty + ch / 2];
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, zIndex: 5 }}>
        {q && <line x1={q[0]} y1={q[1] - 40} x2={from[0] + (near[0] - from[0]) * p} y2={from[1] - 40 + (near[1] - from[1] + 40) * p} stroke="#fff" strokeWidth={5} opacity={p} />}
        {q && <line x1={q[0]} y1={q[1] - 40} x2={from[0] + (near[0] - from[0]) * p} y2={from[1] - 40 + (near[1] - from[1] + 40) * p} stroke={C.navy} strokeWidth={2.5} opacity={p} />}
      </svg>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, zIndex: 6, transform: `rotate(${(from[0] < W / 2 ? 1.2 : -1.2) * p}deg)`, opacity: Math.min(1, p * 2) }}>
        <div style={{ position: "absolute", inset: 0, background: "#fff", padding: 10 * p, boxShadow: "0 28px 60px rgba(30,20,5,0.4), 0 6px 14px rgba(30,20,5,0.25)" }}>
          <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <Img src={staticFile(pin.photo_src!)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.06 + 0.12 * t}) translateX(${(t - 0.5) * -18}px)` }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", background: "linear-gradient(0deg, rgba(0,0,0,0.55), transparent)" }} />
            <div style={{ position: "absolute", left: 18, bottom: 14, fontFamily: FONT, fontWeight: 900, fontSize: 34, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)", opacity: e(f, a + 18, 14) }}>{pin.name}</div>
          </div>
        </div>
        {pin.photo_credit && p > 0.9 && <div style={{ position: "absolute", right: 4, bottom: -22, fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "rgba(40,30,15,0.7)" }}>{pin.photo_credit}</div>}
        {b.pointer && <Pointer text={b.pointer} f={f} at={a + 26} style={{ position: "absolute", left: 0, top: ch + 34 }} />}
      </div>
    </>
  );
}

/** The one line that goes with a visual: white bold words on a navy brush strip, a mustard tick at its start. */
function Pointer({ text, f, at, style }: { text: string; f: number; at: number; style: React.CSSProperties }) {
  const p = e(f, at, 18, IO), wd = e(f, at + 8, 14);
  if (p <= 0) return null;
  return (
    <div style={{ ...style, zIndex: 7 }}>
      <div style={{ position: "relative", display: "inline-block", padding: "14px 30px 16px 40px", maxWidth: 900 }}>
        <div style={{ position: "absolute", inset: 0, background: C.navy, opacity: 0.94,
          clipPath: "polygon(0% 10%, 3% 2%, 30% 7%, 60% 1%, 98% 6%, 100% 55%, 97% 96%, 60% 99%, 30% 93%, 2% 98%)",
          WebkitMaskImage: `linear-gradient(90deg, #000 ${p * 100}%, transparent ${Math.min(100, p * 100 + 5)}%)`, maskImage: `linear-gradient(90deg, #000 ${p * 100}%, transparent ${Math.min(100, p * 100 + 5)}%)` }} />
        <div style={{ position: "absolute", left: 14, top: "22%", bottom: "22%", width: 8, borderRadius: 4, background: C.mustard, transform: `scaleY(${p})` }} />
        <span style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontSize: 38, color: "#fff", opacity: wd, display: "inline-block", transform: `translateY(${(1 - wd) * 10}px)` }}>{text}</span>
      </div>
    </div>
  );
}

/* ---------- a drawn scene (a moving illustration for an idea a map can't show) ---------- */
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function ridgePts(seed: number, y0: number, amp: number, n = 70): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const v = 0.55 * Math.sin(i * 0.31 + seed) + 0.3 * Math.sin(i * 0.83 + seed * 2.3) + 0.15 * Math.sin(i * 2.1 + seed * 0.7) + 0.18 * (rnd(seed * 31 + i) - 0.5);
    return [-100 + (i * (W + 200)) / n, y0 - amp * (0.5 + 0.5 * v)] as [number, number];
  });
}
function ridge(seed: number, y0: number, amp: number): string {
  return `M -100 ${H} ` + ridgePts(seed, y0, amp).map(([x, y]) => `L ${x.toFixed(0)} ${y.toFixed(0)}`).join(" ") + ` L ${W + 100} ${H} Z`;
}
/** A mountain range with snow on everything above its snowline (the same ridge, clipped). */
function Range({ id, seed, y0, amp, fill, snow, shift }: { id: string; seed: number; y0: number; amp: number; fill: string; snow: number; shift: string }) {
  const d = ridge(seed, y0, amp), line = y0 - amp * snow;
  return (
    <g style={{ transform: shift }}>
      <clipPath id={id}><rect x={-200} y={0} width={W + 400} height={line} /></clipPath>
      <path d={d} fill={fill} />
      <path d={d} fill="#fbfbf7" clipPath={`url(#${id})`} />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
    </g>
  );
}

function Scene({ b, f, until }: { b: Beat; f: number; until: number }) {
  const lt = f - b.at, set = b.setting ?? "plains", el = new Set(b.elements ?? []);
  const night = el.has("moon");
  const push = 1 + 0.06 * interpolate(f, [b.at, until], [0, 1], clamp);
  const px = (k: number) => `translate(${(-lt * 0.25 * k).toFixed(1)}px, 0)`;
  const groundY = set === "sea" || set === "coast" ? 640 : set === "mountains" ? 760 : 700;
  const sunY = interpolate(lt, [0, 70], [520, 230], { ...clamp, easing: OUT });
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#1c2747" : "#9fc9cf"} /><stop offset="1" stopColor={night ? "#46557e" : "#f5e6c8"} />
        </linearGradient>
        <linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fa7a6" /><stop offset="1" stopColor="#2f6f74" /></linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stopColor="rgba(255,250,240,0)" /><stop offset="0.75" stopColor="rgba(255,250,240,0.22)" /><stop offset="1" stopColor="rgba(255,250,240,0)" /></linearGradient>
        <radialGradient id="sunG"><stop offset="0" stopColor="#fff6c8" /><stop offset="0.4" stopColor="#ffd769" /><stop offset="1" stopColor="rgba(255,200,90,0)" /></radialGradient>
      </defs>
      <g transform={`translate(${W / 2}, ${H / 2}) scale(${push}) translate(${-W / 2}, ${-H / 2})`}>
        <rect width={W} height={H} fill="url(#sky)" />
        {el.has("sun") && <g transform={`translate(1450, ${sunY})`}>
          <circle r={260} fill="url(#sunG)" opacity={0.8} />
          <g transform={`rotate(${lt * 0.3})`}>{Array.from({ length: 12 }, (_, i) => <line key={i} x1={0} y1={110} x2={0} y2={150} stroke="#ffd769" strokeWidth={6} strokeLinecap="round" transform={`rotate(${i * 30})`} opacity={0.7} />)}</g>
          <circle r={80} fill="#ffd25a" />
        </g>}
        {el.has("moon") && <g transform={`translate(${el.has("sun") ? 380 : 1480}, 220)`}><circle r={70} fill="#f3ecd2" /><circle cx={28} cy={-14} r={62} fill="#1c2747" /></g>}
        {(el.has("clouds") || el.has("rain")) && [0, 1, 2, 3].map((i) => {
          const x = ((i * 560 + lt * (0.6 + i * 0.25)) % (W + 500)) - 250, y = 150 + (i % 2) * 90 + i * 20;
          const dark = el.has("rain");
          return <g key={i} transform={`translate(${x}, ${y}) scale(${1 + (i % 3) * 0.3})`} opacity={0.92}>
            {[[-70, 10, 70], [0, -20, 90], [80, 8, 70], [20, 25, 80]].map(([cx2, cy2, r], j) => <ellipse key={j} cx={cx2} cy={cy2} rx={r} ry={r * 0.62} fill={dark ? "#8f99a8" : "#fffaf0"} />)}
          </g>;
        })}
        {el.has("plane") && (() => { const x = -200 + ((lt * 7) % (W + 400)); return <g transform={`translate(${x}, ${300 - lt * 0.4 % 120})`}>
          <line x1={-500} y1={0} x2={-30} y2={0} stroke="rgba(255,255,255,0.7)" strokeWidth={5} strokeLinecap="round" />
          <path d="M -40 -6 L 40 -4 Q 56 0 40 4 L -40 6 Z M -6 -4 L -26 -36 L -14 -36 L 14 -4 Z M -6 4 L -26 36 L -14 36 L 14 4 Z M -40 -4 L -50 -20 L -42 -20 L -30 -4 Z" fill="#f2f2f2" stroke="#55606e" strokeWidth={2} /></g>; })()}
        {set === "mountains" && <>
          <Range id="rg1" seed={3} y0={560} amp={330} fill="#a7b8c8" snow={0.62} shift={px(0.2)} />
          <Range id="rg2" seed={11} y0={690} amp={260} fill="#7d92a5" snow={0.75} shift={px(0.45)} />
          <g style={{ transform: px(0.8) }}><path d={ridge(41, 830, 150)} fill="#5c6f5c" /></g>
          <rect y={0} width={W} height={H} fill="url(#haze)" />
        </>}
        {set === "plateau" && [0, 1, 2].map((i) => <g key={i} style={{ transform: px(0.3 + i * 0.3) }}>
          <path d={`M -100 ${H} L -100 ${560 + i * 110} L ${300 + i * 200} ${560 + i * 110} L ${380 + i * 200} ${500 + i * 110} L ${1100 + i * 120} ${500 + i * 110} L ${1180 + i * 120} ${560 + i * 110} L ${W + 100} ${560 + i * 110} L ${W + 100} ${H} Z`} fill={["#c9a27a", "#b07f55", "#8b5e3c"][i]} />
          {[1, 2, 3].map((j) => <line key={j} x1={-100} y1={560 + i * 110 + j * 22} x2={W + 100} y2={560 + i * 110 + j * 22} stroke="rgba(80,50,25,0.18)" strokeWidth={3} />)}
        </g>)}
        {set === "desert" && [0, 1, 2].map((i) => <path key={i} style={{ transform: px(0.3 + i * 0.35) }}
          d={`M -100 ${H} L -100 ${640 + i * 120} Q ${300} ${560 + i * 120} ${700} ${640 + i * 120} T ${1500} ${630 + i * 120} T ${W + 300} ${640 + i * 120} L ${W + 100} ${H} Z`} fill={["#ecc98b", "#e0b06a", "#c98f4b"][i]} />)}
        {set === "plains" && <>
          <path style={{ transform: px(0.25) }} d={ridge(9, 640, 70)} fill="#9fb486" />
          <rect y={660} width={W} height={H - 660} fill="#a9c26f" />
          {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M ${W / 2 + (i - 7) * 30} 660 L ${W / 2 + (i - 7) * 330} ${H}`} stroke={i % 2 ? "#93b05a" : "#bcd27c"} strokeWidth={34} opacity={0.7} />)}
        </>}
        {(set === "sea" || set === "coast") && <>
          <rect y={groundY - 20} width={W} height={H} fill="url(#seaG)" />
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={Array.from({ length: 13 }, (_, j) => `${j ? "L" : "M"} ${j * 170 - 170 + ((lt * (1 + i * 0.3)) % 170)} ${groundY + 20 + i * 62 + Math.sin(j + i) * 6}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={3} />)}
          {set === "coast" && <path d={`M ${W} ${groundY - 40} C 1500 ${groundY - 10}, 1300 ${groundY + 120}, 1200 ${H} L ${W} ${H} Z`} fill="#e7cf98" />}
          {set === "coast" && <path d={`M ${W} ${groundY - 60} C 1560 ${groundY - 30}, 1400 ${groundY + 120}, 1320 ${H} L ${W} ${H} Z`} fill="#8fae6d" />}
        </>}
        {el.has("river") && <g>
          <path d={`M 860 ${groundY - 20} C 760 ${groundY + 80}, 1040 ${groundY + 160}, 900 ${groundY + 230} S 700 ${H - 40}, 820 ${H + 20}`} fill="none" stroke="#5f9fb3" strokeWidth={38} strokeLinecap="round" />
          <path d={`M 860 ${groundY - 20} C 760 ${groundY + 80}, 1040 ${groundY + 160}, 900 ${groundY + 230} S 700 ${H - 40}, 820 ${H + 20}`} fill="none" stroke="#cfe8ee" strokeWidth={6} strokeDasharray="30 40" strokeDashoffset={-lt * 3} strokeLinecap="round" />
        </g>}
        {el.has("fields") && Array.from({ length: 6 }, (_, i) => <rect key={i} x={200 + i * 260} y={H - 190 + (i % 2) * 30} width={220} height={120} rx={10} fill={i % 2 ? "#c9d36a" : "#9cbc59"} transform={`skewX(-18)`} opacity={e(lt, 10 + i * 6, 14)} />)}
        {el.has("trees") && Array.from({ length: 9 }, (_, i) => { const x = 80 + i * 220 + (i % 2) * 40, y = H - 60 - (i % 3) * 18, s = Math.sin(lt / 20 + i) * 2;
          return <g key={i} transform={`translate(${x}, ${y}) rotate(${s})`}><rect x={-7} y={-40} width={14} height={50} fill="#6b4a2b" /><circle cy={-80} r={52} fill={i % 2 ? "#4f7a43" : "#5f8d4c"} /><circle cx={-26} cy={-58} r={34} fill="#6a9a54" /></g>; })}
        {el.has("city") && <g>
          <rect y={groundY} width={W} height={H - groundY} fill={night ? "#2b3550" : "#b9b39a"} />
          {Array.from({ length: 16 }, (_, i) => {
            const w = 70 + rnd(i + 3) * 90, x = 40 + i * 118 + rnd(i) * 20, h = (110 + rnd(i) * 300) * e(lt, 6 + i * 2, 18, BACK), top = groundY - h;
            const col = night ? ["#3b4767", "#33405e", "#44527a"][i % 3] : ["#8c9bb0", "#7d8ca3", "#9aa7b9"][i % 3];
            return <g key={i}>
              <rect x={x} y={top} width={w} height={h} fill={col} />
              {i % 4 === 0 && <rect x={x + w * 0.4} y={top - 30} width={6} height={30} fill={col} />}
              {i % 3 === 1 && <path d={`M ${x} ${top} L ${x + w / 2} ${top - 26} L ${x + w} ${top} Z`} fill={col} />}
              {Array.from({ length: Math.max(0, Math.floor(h / 34) - 1) }, (_, j) => Array.from({ length: Math.floor(w / 26) }, (_, c) =>
                <rect key={`${j}-${c}`} x={x + 8 + c * 26} y={top + 14 + j * 34} width={12} height={16}
                  fill={night ? (rnd(i * 50 + j * 7 + c) > 0.35 ? "#ffd769" : "#2a3350") : "rgba(255,255,255,0.45)"} />))}
            </g>;
          })}
        </g>}
        {el.has("port") && [0, 1, 2].map((i) => <g key={i} transform={`translate(${260 + i * 360}, ${groundY - 10})`}>
          <rect x={-8} y={-260} width={16} height={260} fill="#c4502f" /><rect x={-8} y={-260} width={220} height={14} fill="#c4502f" />
          <line x1={150 + Math.sin(lt / 30 + i) * 30} y1={-246} x2={150 + Math.sin(lt / 30 + i) * 30} y2={-120} stroke="#333" strokeWidth={3} />
          <rect x={120 + Math.sin(lt / 30 + i) * 30} y={-120} width={64} height={34} fill={["#2f6f74", "#e0a526", "#1f2f52"][i]} /></g>)}
        {el.has("ship") && (() => { const x = -300 + ((lt * 3.2) % (W + 600)), y = (set === "sea" || set === "coast" ? groundY : 900) + 70 + Math.sin(lt / 12) * 4;
          return <g transform={`translate(${x}, ${y})`}><path d="M -160 0 L 160 0 L 120 50 L -130 50 Z" fill="#1f2f52" />
            {[0, 1, 2, 3].map((j) => <rect key={j} x={-120 + j * 60} y={-44} width={54} height={44} fill={["#e0a526", "#3d8c88", "#c4502f", "#e0a526"][j]} stroke="#fff" strokeWidth={2} />)}
            <rect x={100} y={-80} width={36} height={80} fill="#f2efe6" /></g>; })()}
        {el.has("minerals") && <g>
          <rect y={H - 230} width={W} height={230} fill="#6b4b33" />
          {[0, 1, 2, 3].map((j) => <path key={j} d={`M 0 ${H - 200 + j * 50} Q ${W / 2} ${H - 230 + j * 50 + 30} ${W} ${H - 200 + j * 50}`} stroke="rgba(0,0,0,0.18)" strokeWidth={10} fill="none" />)}
          {Array.from({ length: 16 }, (_, i) => { const x = 60 + rnd(i + 7) * (W - 120), y = H - 190 + rnd(i + 3) * 160, r = e(lt, 10 + i * 4, 12, BOUNCE);
            return <g key={i} transform={`translate(${x}, ${y}) scale(${r}) rotate(${i * 30})`}><path d="M 0 -22 L 18 -6 L 10 18 L -12 18 L -18 -6 Z" fill={["#e0a526", "#9fb6c9", "#c4502f", "#3d8c88"][i % 4]} stroke="#fff" strokeWidth={2.5} /></g>; })}
        </g>}
        {(el.has("wind") || el.has("wind_blocked")) && Array.from({ length: 6 }, (_, i) => {
          const blocked = el.has("wind_blocked"), y = 260 + i * 60;
          const stopX = blocked ? 1180 : W + 200;
          const head = interpolate(((lt * 6 + i * 140) % 1700), [0, 1700], [-200, stopX], clamp);
          const curl = blocked && head > stopX - 40;
          const d = curl ? `M ${head - 360} ${y} C ${head - 200} ${y - 30}, ${head - 60} ${y + 20}, ${head} ${y - 10} C ${head + 40} ${y - 70}, ${head - 40} ${y - 110}, ${head - 90} ${y - 80}` : `M ${head - 360} ${y} C ${head - 240} ${y - 30}, ${head - 120} ${y + 30}, ${head} ${y}`;
          return <path key={i} d={d} fill="none" stroke={blocked ? "#dfe9f2" : "#fffaf0"} strokeWidth={6} strokeLinecap="round" opacity={0.85} />;
        })}
        {el.has("wind_blocked") && <g transform="translate(1180, 400)" opacity={e(lt, 40, 16)}><circle r={46} fill="none" stroke="#b4442f" strokeWidth={9} /><line x1={-32} y1={32} x2={32} y2={-32} stroke="#b4442f" strokeWidth={9} /></g>}
        {el.has("rain") && Array.from({ length: 90 }, (_, i) => { const x = rnd(i) * (W + 200) - 100, y = ((lt * 26 + rnd(i + 99) * H) % (H + 100)) - 50;
          return <line key={i} x1={x} y1={y} x2={x - 10} y2={y + 34} stroke="rgba(220,235,245,0.75)" strokeWidth={2.5} />; })}
        {el.has("snow") && Array.from({ length: 70 }, (_, i) => { const x = (rnd(i) * W + Math.sin(lt / 20 + i) * 20), y = ((lt * 2.5 + rnd(i + 5) * H) % H);
          return <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill="#fff" opacity={0.85} />; })}
      </g>
      <rect width={W} height={H} fill="url(#vig)" />
      <defs><radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="0.6" stopColor="rgba(0,0,0,0)" /><stop offset="1" stopColor="rgba(40,25,10,0.35)" /></radialGradient></defs>
    </svg>
  );
}

/* ---------- the notes at the end of a topic ---------- */
function Notes({ p, f, from, total, side }: { p: P; f: number; from: number; total: number; side: "left" | "right" }) {
  const bullets = p.bullets ?? [];
  const chars = bullets.reduce((a, b) => a + b.text.length, 0);
  const size = chars > 260 ? 32 : chars > 190 ? 35 : chars > 130 ? 38 : 42;
  const open = e(f, from, 24, BACK), shut = e(f, total - 18, 16, IN);
  if (open <= 0) return null;
  const x = side === "left" ? 96 : W - 96 - 780;
  const a = (1 - open) * 100;
  const curl = open >= 1 ? 30 + 8 * Math.sin((f - from) / 17) : 0;
  return (
    <>
      <AbsoluteFill style={{ background: `linear-gradient(${side === "left" ? 90 : 270}deg, rgba(246,238,220,0.9) 0%, rgba(246,238,220,0.6) 40%, rgba(246,238,220,0) 52%)`, opacity: open * (1 - shut), zIndex: 7 }} />
      <div style={{ position: "absolute", left: x, top: 120, width: 780, height: 840, zIndex: 8, transformOrigin: side === "left" ? "0% 50%" : "100% 50%",
        transform: `perspective(1700px) rotateY(${side === "left" ? -a : a}deg) ${shut ? `rotateX(${shut * 88}deg)` : ""}` }}>
        <Sheet w={780} h={840} curl={curl} corner="br" crease="flip" light={0.5} />
        <div style={{ position: "absolute", left: 64, top: 58, right: 64, opacity: e(f, from + 16, 10) }}>
          <Banner title={p.slide_title ?? ""} f={f} at={from + 14} size={(p.slide_title ?? "").length > 26 ? 36 : 44} />
          <div style={{ display: "flex", flexDirection: "column", gap: size * 0.7 }}>
            {bullets.map((b, k) => {
              const t = from + 30 + k * 12, d = e(f, t, 10, BOUNCE), m = e(f, t + 4, 16);
              return (
                <div key={k} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                  <span style={{ width: 24, height: 24, borderRadius: 12, background: C.navy, flex: "none", marginTop: size * 0.4, transform: `scale(${d})` }} />
                  <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.3, color: C.ink, clipPath: `inset(0 ${(1 - m) * 100}% 0 0)` }}>
                    {segments(b.text, b.key ?? [], b.green ?? []).map((sg, i) => <span key={i} style={{ color: sg.c ? C.navy : C.ink, fontWeight: sg.c ? 900 : 800,
                      background: sg.c ? `linear-gradient(90deg, rgba(224,165,38,0.35) ${e(f, t + 18, 14) * 100}%, transparent 0)` : undefined }}>{sg.t}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- a topic ---------- */
export function GeoBeats({ p }: { p: P }) {
  const f = useCurrentFrame();
  const total = notesFrames(p);
  const geo = p.geo!;
  const beats = geo.beats;
  const tin: Move = p.geo_in ?? "brush", tout: Move = p.geo_out ?? "brush";
  const cur = Math.max(0, beats.reduce((a, b, k) => (f >= b.at ? k : a), 0));
  const b = beats[cur];
  const until = beats[cur + 1]?.at ?? total;
  const notesAt = geo.notes_at ?? null;
  const notesP = notesAt !== null ? e(f, notesAt - 8, 30, IO) : 0;
  const side = geo.side;
  // the camera: from the last map of the topic before (it flies on), else from a slowly turning globe
  const prevMap = [...beats.slice(0, cur)].reverse().find((x) => x.kind === "map");
  const startCam = geo.prev ? camOf(geo.prev) : { ...START, lon: START.lon + f * 0.15 };
  const fromCam = prevMap ? camOf(prevMap) : startCam;
  const flyT = e(f, b.at, 42, IO);
  const cx = W / 2 + notesP * (side === "left" ? 420 : -420), cy = H / 2 + 10, kk = 1 - 0.3 * notesP;
  const drift = 1 + 0.03 * interpolate(f, [b.at, until], [0, 1], clamp); // every map keeps a slow push-in
  const w = whip(f, total, tin, tout);
  let stage: React.ReactNode;
  if (b.kind === "map") {
    const to = camOf(b);
    const cam = to.flat || fromCam.flat ? to : fly(fromCam, to, flyT);
    const cross = (to.flat !== fromCam.flat || beats[cur - 1]?.kind === "scene") && cur > 0 ? e(f, b.at, 20, IO) : 1;
    const before = beats[cur - 1];
    stage = (<>
      {cross < 1 && before && (before.kind === "scene" ? <Scene b={before} f={f} until={b.at} /> : <MapFrame b={before} f={f} cam={camOf(before)} cx={cx} cy={cy} k={kk} until={b.at} notesP={notesP} />)}
      <AbsoluteFill style={{ opacity: cross }}><MapFrame b={b} f={f} cam={{ ...cam, scale: cam.scale * drift }} cx={cx} cy={cy} k={kk} until={until} notesP={notesP} /></AbsoluteFill>
      <PhotoCallout b={b} f={f} cam={{ ...cam, scale: cam.scale * drift }} cx={cx} cy={cy} k={kk} until={until} notesP={notesP} />
    </>);
  } else {
    const before = beats[cur - 1];
    const cross = cur > 0 ? e(f, b.at, 20, IO) : 1;
    stage = (<>
      {cross < 1 && before && (before.kind === "scene" ? <Scene b={before} f={f} until={b.at} /> : <MapFrame b={before} f={f} cam={camOf(before)} cx={cx} cy={cy} k={kk} until={b.at} notesP={notesP} />)}
      <AbsoluteFill style={{ opacity: cross, transform: `translateX(${notesP * (side === "left" ? 420 : -420)}px) scale(${1 - 0.25 * notesP})` }}><Scene b={b} f={f} until={until} /></AbsoluteFill>
    </>);
  }
  const hasPhoto = b.kind === "map" && (b.pins ?? []).some((x) => x.photo_src);
  const titleO = 1 - notesP;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#efe3c8" }}>
      <AbsoluteFill style={{ transform: `translateX(${w.x}px)`, filter: w.blur ? `blur(${w.blur}px)` : undefined }}>
        <Parchment f={f} total={total} at={[b.kind === "map" ? camOf(b).lon : 80, b.kind === "map" ? camOf(b).lat : 22]} side={side} />
        {stage}
        <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.45, pointerEvents: "none" }} />
        {titleO > 0 && <div style={{ position: "absolute", left: 70, top: 46, opacity: titleO * e(f, 6, 12), zIndex: 6, transform: "scale(0.82)", transformOrigin: "0 0" }}>
          <Banner title={p.slide_title ?? ""} f={f} at={8} size={40} />
        </div>}
        {b.pointer && !hasPhoto && notesP < 1 && <Pointer key={cur} text={b.pointer} f={f} at={b.at + 22} style={{ position: "absolute", left: 70, bottom: 64, opacity: 1 - notesP }} />}
        {notesAt !== null && <Notes p={p} f={f} from={notesAt} total={total} side={side} />}
      </AbsoluteFill>
      <Cover f={f} total={total} tin={tin === "swap" ? "none" : tin} tout={tout === "swap" ? "none" : tout} />
    </AbsoluteFill>
  );
}
