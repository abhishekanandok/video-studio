/* LAYER 1 of the motion library, part C: motions for STORIES and EXPLAINERS.
   - people who go places (<Go>) and meet (<Meet>: handshake, hug, high five, give, talk, argue), and chases (<Pursuit>:
     on foot, by car, a police chase, cat and mouse; it ends caught or escaped);
   - explainer moves: dots that regroup into groups and "1 in N", charts that morph (bars into a pie) and re-sort with one
     bar lit, a map that spreads region by region with a country lifting out, a camera flying across a map;
   - chain physics: dominoes, a rope swing, balloons rising, wind blowing things away, a magnet pulling;
   - words lit as they are said (<SpokenWords>), an object that wipes to the next shot, a shape that match-cuts,
     a building that falls to ruin or is rebuilt, a cursor scrubbing a timeline;
   - sound: <Sfx kind at> plays one of video/public/sfx (run `python3 sfx.py` once), <OnBeat> pulses on the music's beats.
   Every motion takes its times in seconds from the scene's start, so `at` can be a spoken word: s.at("caught"). */

import type { CSSProperties, ReactNode } from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { clamp01, family, useScene } from "../kit";
import { curve, ease, rand } from "./motion";
import { shapePoints } from "./motion-b";
import { Character, type Action, type Emotion, type Job } from "./blocks-d";
import { useMapView, COUNTRIES, type MapView } from "./blocks-b";

type Pt = [number, number];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/* ---------------- people going places ---------------- */
/** a drawn person walks (or runs) from one point to another along the ground, facing the way it goes, then stands and does
    `then` (wave, cheer, sit, talk…); `path` makes it follow a route of points instead of a straight line */
export function Go({ from, to, path, at = 0, dur = 3, run = false, then = "stand", job = "none", emotion = "neutral", height = 360, seed = 1 }: {
  from: Pt; to: Pt; path?: Pt[]; at?: number; dur?: number; run?: boolean; then?: Action; job?: Job; emotion?: Emotion; height?: number; seed?: number;
}) {
  const { t } = useScene();
  const raw = clamp01((t - at) / dur), k = ease.inOut(raw), moving = t > at && raw < 1;
  const c = path ? curve(path) : null;
  const p = c ? c.at(k) : { x: lerp(from[0], to[0], k), y: lerp(from[1], to[1], k), angle: 0 };
  const ahead = c ? c.at(Math.min(1, k + 0.02)) : { x: to[0], y: to[1] };
  const face: 1 | -1 = (moving ? ahead.x - p.x : to[0] - from[0]) < 0 ? -1 : 1;
  return <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-100%)" }}><Character action={moving ? (run ? "run" : "walk") : then} job={job} emotion={emotion} height={height} face={face} seed={seed} speed={dur > 0 ? 3 / dur : 1} /></div>;
}
/** two people walk toward each other and meet: they shake hands, hug, high-five, one gives the other something, or they talk
    or argue (their faces change); `gift` is what is given */
export function Meet({ kind = "handshake", y, gap = 230, at = 0, walk = 1.6, a = {}, b = {}, gift = "🎁", height = 360 }: {
  kind?: "handshake" | "hug" | "highfive" | "give" | "talk" | "argue"; y: number; gap?: number; at?: number; walk?: number;
  a?: { job?: Job; emotion?: Emotion }; b?: { job?: Job; emotion?: Emotion }; gift?: string; height?: number;
}) {
  const { t, W } = useScene();
  const k = ease.inOut(clamp01((t - at) / walk)), met = t >= at + walk, mx = W / 2;
  const ax = lerp(mx - 600, mx - gap / 2, k), bx = lerp(mx + 600, mx + gap / 2, k);
  const act: Action = !met ? "walk" : kind === "talk" ? "talk" : kind === "argue" ? "point" : kind;
  const ea: Emotion = met ? (kind === "argue" ? "angry" : "happy") : a.emotion ?? "neutral", eb: Emotion = met ? (kind === "argue" ? "angry" : kind === "give" ? "surprised" : "happy") : b.emotion ?? "neutral";
  const close = kind === "hug" ? gap * 0.25 : 0, gk = ease.inOut(clamp01((t - at - walk - 0.3) / 0.8));
  return (
    <>
      <div style={{ position: "absolute", left: ax + close, top: y, transform: "translate(-50%,-100%)" }}><Character action={act} job={a.job} emotion={a.emotion && !met ? a.emotion : ea} height={height} face={1} talkFrom={kind === "talk" || kind === "argue" ? at + walk : undefined} talkTo={at + walk + 4} seed={1} /></div>
      <div style={{ position: "absolute", left: bx - close, top: y, transform: "translate(-50%,-100%)" }}><Character action={kind === "give" ? (met ? "hold" : "walk") : act} job={b.job ?? "kurta"} emotion={b.emotion && !met ? b.emotion : eb} height={height} face={-1} talkFrom={kind === "talk" || kind === "argue" ? at + walk + 0.8 : undefined} talkTo={at + walk + 4} seed={2} /></div>
      {kind === "give" && met && <div style={{ position: "absolute", left: lerp(ax + height * 0.25, bx - height * 0.2, gk), top: y - height * 0.45 - Math.sin(gk * Math.PI) * 40, fontSize: height * 0.2, transform: "translate(-50%,-50%)" }}>{gift}</div>}
      {kind === "argue" && met && <div style={{ position: "absolute", left: mx, top: y - height * 1.15, transform: `translate(-50%,0) scale(${1 + Math.sin(t * 12) * 0.08})`, fontSize: height * 0.2 }}>💢</div>}
      {(kind === "highfive" || kind === "handshake") && met && t - at - walk < 0.6 && <div style={{ position: "absolute", left: mx, top: y - height * (kind === "highfive" ? 0.95 : 0.55), transform: `translate(-50%,-50%) scale(${1 + (t - at - walk) * 3})`, opacity: 1 - (t - at - walk) / 0.6, fontSize: 70 }}>✨</div>}
    </>
  );
}

/* ---------------- chases ---------------- */
/** a chase: `lead` runs along a path and `follow` gains on it; speed lines and dust trail them; the camera can follow.
    `ending` "caught" closes the gap at the end with a pounce, "escaped" opens it until the chaser gives up.
    kind "foot" (two people running), "car" (two cars), "police" (a police car with flashing lights and a siren), "cat"
    (cat and mouse, round and round a loop) — or give your own `lead` and `follow` */
export function Pursuit({ path, at = 0, dur = 4, kind = "foot", ending = "caught", lead, follow, camera = false, lines = true, size = 260 }: {
  path?: Pt[]; at?: number; dur?: number; kind?: "foot" | "car" | "police" | "cat"; ending?: "caught" | "escaped"; lead?: ReactNode; follow?: ReactNode; camera?: boolean; lines?: boolean; size?: number;
}) {
  const { t, W, H } = useScene();
  const pts: Pt[] = path ?? (kind === "cat" ? Array.from({ length: 13 }, (_, i) => [W / 2 + Math.cos((i / 12) * Math.PI * 2) * W * 0.3, H * 0.6 + Math.sin((i / 12) * Math.PI * 2) * H * 0.18] as Pt) : [[-size, H * 0.72], [W * 0.3, H * 0.66], [W * 0.65, H * 0.74], [W + size, H * 0.68]]);
  const c = curve(pts), raw = clamp01((t - at) / dur), k = kind === "cat" ? ((t - at) / dur) % 1 : ease.inOut(raw);
  const gap0 = 0.16, gap = ending === "caught" ? gap0 * (1 - ease.inOut(clamp01((raw - 0.55) / 0.45))) : gap0 * (1 + ease.inOut(clamp01((raw - 0.5) / 0.5)) * 1.6);
  const lp = c.at(kind === "cat" ? k : Math.min(1, k + 0.02)), fp = c.at(Math.max(0, kind === "cat" ? (k - gap + 1) % 1 : k - gap));
  const dir = (lp.angle > 90 || lp.angle < -90) ? -1 : 1, fdir = (fp.angle > 90 || fp.angle < -90) ? -1 : 1;
  const caught = ending === "caught" && raw >= 1, gaveUp = ending === "escaped" && raw > 0.8;
  const siren = Math.floor(t * 6) % 2;
  const L = lead ?? (kind === "car" || kind === "police" ? <div style={{ fontSize: size * 0.55, transform: `scaleX(${-dir})` }}>🚗</div> : kind === "cat" ? <div style={{ fontSize: size * 0.4, transform: `scaleX(${-dir})` }}>🐭</div> : <Character action={caught ? "stand" : "run"} emotion={caught ? "scared" : "scared"} height={size} face={dir as 1 | -1} job="none" />);
  const F = follow ?? (kind === "police" ? <div style={{ position: "relative", fontSize: size * 0.55, transform: `scaleX(${-fdir})` }}>🚓<div style={{ position: "absolute", left: "30%", top: "-10%", width: 26, height: 14, borderRadius: 6, background: siren ? "#e0453a" : "#3a7ae0", boxShadow: `0 0 30px 12px ${siren ? "rgb(224 69 58/0.6)" : "rgb(58 122 224/0.6)"}` }} /></div>
    : kind === "car" ? <div style={{ fontSize: size * 0.55, transform: `scaleX(${-fdir})` }}>🚙</div> : kind === "cat" ? <div style={{ fontSize: size * 0.55, transform: `scaleX(${-fdir})` }}>🐈</div>
    : <Character action={gaveUp ? "stand" : caught ? "cheer" : "run"} emotion={gaveUp ? "sad" : "angry"} height={size} face={fdir as 1 | -1} job="police" />);
  const speedLines = (p: { x: number; y: number }, d: number) => lines && t > at && !caught && Array.from({ length: 5 }, (_, i) => <div key={i} style={{ position: "absolute", left: p.x - d * (size * 0.4 + 60 + ((t * 900 + i * 70) % 160)), top: p.y - size * (0.2 + i * 0.12), width: 70 + rand(i) * 60, height: 5, borderRadius: 3, background: "rgb(0 0 0/0.25)" }} />);
  const dust = (p: { x: number; y: number }, d: number) => t > at && !caught && Array.from({ length: 4 }, (_, i) => { const q = ((t * 3 + i / 4) % 1); return <div key={i} style={{ position: "absolute", left: p.x - d * (30 + q * 120), top: p.y - 10 - q * 40, width: 30 + q * 50, height: 30 + q * 50, borderRadius: "50%", background: "rgb(180 160 130/0.5)", opacity: 1 - q, transform: "translate(-50%,-50%)" }} />; });
  const cam: CSSProperties = camera ? { transform: `translate(${W / 2 - lp.x}px, 0)`, transition: "none" } : {};
  return (
    <div style={{ position: "absolute", inset: 0, ...cam }}>
      {speedLines(lp, dir)}{dust(lp, dir)}{speedLines(fp, fdir)}{dust(fp, fdir)}
      <div style={{ position: "absolute", left: fp.x, top: fp.y, transform: `translate(-50%,-100%) translateY(${caught ? 0 : -Math.abs(Math.sin(t * 14)) * 8}px)` }}>{F}</div>
      <div style={{ position: "absolute", left: lp.x, top: lp.y, transform: `translate(-50%,-100%) translateY(${caught ? 0 : -Math.abs(Math.sin(t * 15 + 1)) * 8}px)` }}>{L}</div>
      {caught && <div style={{ position: "absolute", left: lp.x, top: lp.y - size * 1.1, transform: `translate(-50%,-50%) scale(${ease.back(clamp01((t - at - dur) / 0.4))})`, fontFamily: family("bebas"), fontSize: size * 0.35, color: "#e0453a", textShadow: "0 4px 0 #fff" }}>GOTCHA!</div>}
      {gaveUp && <div style={{ position: "absolute", left: fp.x, top: fp.y - size * 1.1, transform: "translate(-50%,-50%)", fontSize: size * 0.25, opacity: clamp01((raw - 0.85) * 6) }}>😮‍💨</div>}
    </div>
  );
}

/* ---------------- dots: the explainer's favourite ---------------- */
/** a grid of dots (people, households, votes) that splits into labelled groups, each its own colour and cluster; then
    `merge` brings them back. A dot is a circle, or `icon` (an emoji) */
export function DotGroups({ groups, at = 0, split = 1, w = 1500, h = 700, size = 22, icon, merge }: {
  groups: { label: string; count: number; color?: string }[]; at?: number; split?: number; w?: number; h?: number; size?: number; icon?: string; merge?: number;
}) {
  const { t, theme } = useScene();
  const pal = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8", "#3fb35a"];
  const total = groups.reduce((a, g) => a + g.count, 0), cols = Math.ceil(Math.sqrt((total * w) / h)), gap = Math.min(w / cols, h / Math.ceil(total / cols));
  let k = ease.inOut(clamp01((t - at - split) / 1.2));
  if (merge !== undefined) k *= 1 - ease.inOut(clamp01((t - merge) / 1.2));
  const n = groups.length, gw = w / n;
  const out: ReactNode[] = [];
  let idx = 0;
  groups.forEach((g, gi) => {
    // a group's own spacing: as the full grid's, closer if its column would not fit the height
    let gg = gap, gcols = Math.max(1, Math.floor((gw * 0.8) / gg));
    while (Math.ceil(g.count / gcols) * gg > h - 70 && gg > 6) { gg *= 0.92; gcols = Math.max(1, Math.floor((gw * 0.8) / gg)); }
    for (let j = 0; j < g.count; j++, idx++) {
      const x0 = (idx % cols) * gap + gap / 2, y0 = Math.floor(idx / cols) * gap + gap / 2;
      const x1 = gi * gw + gw * 0.1 + (j % gcols) * gg + gg / 2, y1 = h - Math.floor(j / gcols) * gg - gg / 2 - 60;
      const appear = ease.back(clamp01((t - at - (idx / total) * 0.6) / 0.3)), col = g.color ?? pal[gi % pal.length];
      out.push(<div key={idx} style={{ position: "absolute", left: lerp(x0, x1, k), top: lerp(y0, y1, k), width: size, height: size, transform: `translate(-50%,-50%) scale(${appear})`, borderRadius: "50%", background: icon ? undefined : k > 0.02 ? col : theme.ink, fontSize: size, lineHeight: 1, textAlign: "center" }}>{icon}</div>);
    }
  });
  return (
    <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.font) }}>
      {out}
      {groups.map((g, gi) => <div key={gi} style={{ position: "absolute", left: gi * gw, width: gw, bottom: 0, textAlign: "center", fontSize: 34, fontWeight: 800, color: g.color ?? pal[gi % pal.length], opacity: k }}>{g.label} · {g.count}</div>)}
    </div>
  );
}
/** "1 in N": a block of N figures, one of them lights up and steps forward while the others fade (1 in 4 children…) */
export function OneIn({ n = 4, at = 0, rows = 1, icon = "🧍", size = 140, label }: { n?: number; at?: number; rows?: number; icon?: string; size?: number; label?: string }) {
  const { t, theme } = useScene();
  const k = ease.back(clamp01((t - at - 0.6) / 0.5)), per = Math.ceil(n / rows);
  const pick = Math.floor(rand(n) * n);
  return (
    <div style={{ textAlign: "center", fontFamily: family(theme.display) }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${per}, ${size}px)`, gap: 10, justifyContent: "center" }}>{Array.from({ length: n }, (_, i) => <div key={i} style={{ fontSize: size * 0.8, lineHeight: 1, opacity: i === pick ? 1 : 1 - k * 0.7, filter: i === pick ? `drop-shadow(0 0 ${k * 20}px ${theme.accent})` : `grayscale(${k})`, transform: i === pick ? `translateY(${-k * 30}px) scale(${1 + k * 0.2})` : undefined }}>{icon}</div>)}</div>
      <div style={{ fontSize: size * 0.55, fontWeight: 800, color: theme.accent, marginTop: 20, opacity: clamp01(k) }}>1 in {n}{label ? ` ${label}` : ""}</div>
    </div>
  );
}

/* ---------------- charts that change ---------------- */
/** a bar chart that changes as the story goes on: bars grow, then re-sort by size (`sortAt`), one is lit and the others dim
    (`focus` = its label, `focusAt`), and the bars can morph into a pie (`pieAt`) */
export function ChartMorph({ data, w = 1100, h = 560, at = 0, sortAt, focus, focusAt, pieAt }: { data: { label: string; value: number; color?: string }[]; w?: number; h?: number; at?: number; sortAt?: number; focus?: string; focusAt?: number; pieAt?: number }) {
  const { t, theme } = useScene();
  const pal = [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#9b6ad8", "#3fb35a"];
  const max = Math.max(...data.map((d) => d.value)), total = data.reduce((a, d) => a + d.value, 0), n = data.length, bw = w / n;
  const grow = ease.out(clamp01((t - at) / 0.9)), sk = sortAt !== undefined ? ease.inOut(clamp01((t - sortAt) / 0.9)) : 0;
  const fk = focusAt !== undefined ? ease.out(clamp01((t - focusAt) / 0.5)) : 0, pk = pieAt !== undefined ? ease.inOut(clamp01((t - pieAt) / 1.2)) : 0;
  const order = [...data.keys()].sort((a, b) => data[b].value - data[a].value), rank = data.map((_, i) => order.indexOf(i));
  const R = Math.min(w, h) * 0.42, cx = w / 2, cy = h / 2;
  let acc = 0;
  return (
    <svg width={w} height={h + 60} style={{ overflow: "visible", fontFamily: family(theme.font) }}>
      {data.map((d, i) => {
        const slot = lerp(i, rank[i], sk), x = slot * bw + bw * 0.15, bh = (d.value / max) * h * grow, col = d.color ?? pal[i % pal.length];
        const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2; acc += d.value; const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
        // each bar is 24 points round its outline; in the pie they sit on the slice's outline
        const bar: Pt[] = [], pie: Pt[] = [];
        for (let j = 0; j <= 11; j++) { bar.push([x + (bw * 0.7 * j) / 11, h - bh]); pie.push([cx + Math.cos(lerp(a0, a1, j / 11)) * R, cy + Math.sin(lerp(a0, a1, j / 11)) * R]); }
        for (let j = 0; j <= 11; j++) { bar.push([x + bw * 0.7 - (bw * 0.7 * j) / 11, h]); pie.push([cx + Math.cos(lerp(a1, a0, j / 11)) * R * 0.02, cy + Math.sin(lerp(a1, a0, j / 11)) * R * 0.02]); }
        const d2 = "M" + bar.map((p, j) => `${lerp(p[0], pie[j][0], pk).toFixed(1)} ${lerp(p[1], pie[j][1], pk).toFixed(1)}`).join(" L") + " Z";
        const lit = focus === undefined || d.label === focus, mid = (a0 + a1) / 2;
        const lx = lerp(x + bw * 0.35, cx + Math.cos(mid) * R * 1.18, pk), ly = lerp(h + 36, cy + Math.sin(mid) * R * 1.18, pk);
        return <g key={i} opacity={lit ? 1 : 1 - fk * 0.7}><path d={d2} fill={col} stroke="#fff" strokeWidth={pk > 0 ? 3 : 0} transform={lit && fk > 0 ? `translate(0 ${-fk * 10 * (1 - pk)})` : undefined} />
          <text x={lx} y={ly} textAnchor="middle" fontSize={28} fontWeight={700} fill={theme.ink}>{d.label}</text>
          <text x={lerp(x + bw * 0.35, cx + Math.cos(mid) * R * 0.65, pk)} y={lerp(h - bh - 14, cy + Math.sin(mid) * R * 0.65 + 10, pk)} textAnchor="middle" fontSize={30} fontWeight={800} fill={pk > 0.5 ? "#fff" : theme.ink} opacity={grow}>{pk > 0.5 ? `${Math.round((d.value / total) * 100)}%` : d.value}</text></g>;
      })}
    </svg>
  );
}

/* ---------------- maps that change ---------------- */
/** something spreads across a map region by region (a disease, a language, an empire, a flood): each region fills at its
    time with a pulse ring; `order` is [country name, when (s)]; a counter shows how many */
export function SpreadMap({ map: given, order, color = "#e0453a", label = "regions", sea = "#cfe3ee", land = "#f3eee2" }: { map?: MapView; order: [string, number][]; color?: string; label?: string; sea?: string; land?: string }) {
  const map = useMapView(given);  // a made-up map= falls back to a real one
  const { t, theme } = useScene();
  const when = new Map(order), done = order.filter(([, s]) => t >= s).length;
  return (
    <div style={{ position: "relative", width: map.w, height: map.h }}>
      <svg width={map.w} height={map.h} style={{ position: "absolute", inset: 0, background: sea, borderRadius: 18 }}>
        {COUNTRIES.map((f, i) => { const s = when.get(f.properties.name), k = s === undefined ? 0 : ease.out(clamp01((t - s) / 0.6)); return <path key={i} d={map.path(f as any) ?? ""} fill={k > 0 ? color : land} fillOpacity={k > 0 ? 0.35 + 0.65 * k : 1} stroke="#9aa3ad" strokeWidth={1} />; })}
        {order.map(([name, s]) => { const f = COUNTRIES.find((c) => c.properties.name === name), q = t - s; if (!f || q < 0 || q > 1.2) return null; const [x, y] = map.path.centroid(f as any); return <circle key={name} cx={x} cy={y} r={20 + q * 120} fill="none" stroke={color} strokeWidth={6 * (1 - q / 1.2)} opacity={1 - q / 1.2} />; })}
      </svg>
      <div style={{ position: "absolute", left: 30, bottom: 24, fontFamily: family(theme.display), fontSize: 60, fontWeight: 800, color }}>{done} <span style={{ fontSize: 30, color: theme.ink }}>{label}</span></div>
    </div>
  );
}
/** one country lifts up out of the map, casts a shadow and turns a little (to look at it alone); `shift` [dx, dy] also moves it
    aside as it lifts (to pull two neighbours apart) */
export function LiftCountry({ map: given, name, at = 0, color, height = 60, shift = [0, 0] }: { map?: MapView; name: string; at?: number; color?: string; height?: number; shift?: [number, number] }) {
  const map = useMapView(given);  // a made-up map= falls back to a real one
  const { t, theme } = useScene();
  const f = COUNTRIES.find((c) => c.properties.name === name);
  if (!f) return null;
  const k = ease.back(clamp01((t - at) / 0.8)), d = map.path(f as any) ?? "", [cx, cy] = map.path.centroid(f as any);
  return (
    <svg width={map.w} height={map.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={d} fill="#000" opacity={0.25 * k} transform={`translate(${(12 + shift[0]) * k} ${(height * 0.4 + shift[1]) * k})`} style={{ filter: "blur(6px)" }} />
      <g transform={`translate(${shift[0] * k} ${(shift[1] - height) * k}) rotate(${Math.sin(t * 0.8) * 2 * k} ${cx} ${cy}) translate(${cx} ${cy}) scale(${1 + 0.15 * k}) translate(${-cx} ${-cy})`}><path d={d} fill={color ?? theme.accent} stroke="#fff" strokeWidth={4} /></g>
    </svg>
  );
}
/** the camera flies across a map from place to place, zooming in and out (stops: [lon, lat, zoom, when (s)]) */
export function MapFly({ map: given, stops, children }: { map?: MapView; stops: [number, number, number, number][]; children: ReactNode }) {
  const map = useMapView(given);  // a made-up map= falls back to a real one
  const { t } = useScene();
  let i = 0;
  while (i < stops.length - 1 && t > stops[i + 1][3]) i++;
  const a = stops[i], b = stops[Math.min(stops.length - 1, i + 1)], k = b === a ? 1 : ease.inOut(clamp01((t - a[3]) / Math.max(0.1, b[3] - a[3])));
  const [ax, ay] = map.xy(a[0], a[1]), [bx, by] = map.xy(b[0], b[1]);
  const hop = Math.sin(k * Math.PI) * 0.35, z = lerp(a[2], b[2], k) * (1 - hop * (a !== b ? 1 : 0)), x = lerp(ax, bx, k), y = lerp(ay, by, k);
  return <div style={{ position: "relative", width: map.w, height: map.h, overflow: "hidden" }}><div style={{ position: "absolute", left: 0, top: 0, width: map.w, height: map.h, transformOrigin: "0 0", transform: `translate(${map.w / 2 - x * z}px, ${map.h / 2 - y * z}px) scale(${z})` }}>{children}</div></div>;
}

/* ---------------- chain physics ---------------- */
/** a row of dominoes falls one after another (a chain reaction, one thing leading to the next); `labels` on each */
export function Dominoes({ count = 10, x, y, gap = 90, h = 200, at = 0, every = 0.18, labels = [], color }: { count?: number; x: number; y: number; gap?: number; h?: number; at?: number; every?: number; labels?: string[]; color?: string }) {
  const { t, theme } = useScene();
  return <>{Array.from({ length: count }, (_, i) => {
    const k = Math.pow(clamp01((t - at - i * every) / 0.35), 2), ang = i === count - 1 ? k * 85 : k * Math.min(70, (Math.atan2(gap, h) * 180) / Math.PI + 8);
    return <div key={i} style={{ position: "absolute", left: x + i * gap, top: y - h, width: h * 0.22, height: h, background: color ?? (i % 2 ? theme.accent : theme.ink), borderRadius: 6, transformOrigin: "100% 100%", transform: `rotate(${ang}deg)`, boxShadow: "4px 4px 0 rgb(0 0 0/0.2)", color: "#fff", fontSize: h * 0.11, fontWeight: 800, writingMode: "vertical-rl", textAlign: "center", fontFamily: family(theme.font), display: "grid", placeItems: "center" }}>{labels[i] ?? ""}</div>;
  })}</>;
}
/** a thing swings on a rope from a point above, slowing down (a wrecking ball, a swing, a hanging sign) */
export function RopeSwing({ x, y, length = 400, at = 0, amount = 1, children }: { x: number; y: number; length?: number; at?: number; amount?: number; children: ReactNode }) {
  const { t } = useScene();
  const s = Math.max(0, t - at), a = 40 * amount * Math.exp(-0.25 * s) * Math.cos(s * Math.sqrt(9.8 / (length / 300)) * 1.2);
  return <div style={{ position: "absolute", left: x, top: y, transformOrigin: "0 0", transform: `rotate(${a}deg)` }}><div style={{ position: "absolute", left: -3, top: 0, width: 6, height: length, background: "#6a5040", borderRadius: 3 }} /><div style={{ position: "absolute", left: 0, top: length, transform: "translate(-50%,0)" }}>{children}</div><div style={{ position: "absolute", left: -10, top: -10, width: 20, height: 20, borderRadius: 10, background: "#333" }} /></div>;
}
/** balloons (or anything) rise and drift, swaying on their strings (hope, a release, prices going up) */
export function BalloonRise({ count = 6, at = 0, colors, x, y, items }: { count?: number; at?: number; colors?: string[]; x?: number; y?: number; items?: ReactNode[] }) {
  const { t, W, H, theme } = useScene();
  const cols = colors ?? [theme.accent, theme.accent2, "#e0b24a", "#6a9bd8", "#e06a8a", "#3fb35a"];
  return <>{Array.from({ length: count }, (_, i) => {
    const s = Math.max(0, t - at - i * 0.25), px = (x ?? W / 2) + (i - count / 2) * 90 + Math.sin(s * 1.4 + i) * 30, py = (y ?? H * 0.85) - s * (120 + rand(i) * 80);
    return <div key={i} style={{ position: "absolute", left: px, top: py, transform: `translate(-50%,-100%) rotate(${Math.sin(s * 2 + i) * 6}deg)`, transformOrigin: "50% 100%" }}>{items?.[i] ?? <div><div style={{ width: 90, height: 110, borderRadius: "50% 50% 46% 46%", background: `radial-gradient(circle at 35% 30%, #fff9, ${cols[i % cols.length]} 40%)` }} /><div style={{ width: 2, height: 140, background: "#777", margin: "0 auto" }} /></div>}</div>;
  })}</>;
}
/** a gust of wind: streaks blow across and the things in it are swept away, tumbling (a storm, a crash, money flying) */
export function WindBlow({ items, at = 0, from = "left", strength = 1 }: { items: { node: ReactNode; x: number; y: number }[]; at?: number; from?: "left" | "right"; strength?: number }) {
  const { t, W } = useScene();
  const d = from === "left" ? 1 : -1, s = Math.max(0, t - at);
  return (
    <>
      {t >= at && Array.from({ length: 14 }, (_, i) => { const q = (s * 1.5 + rand(i)) % 1; return <div key={"w" + i} style={{ position: "absolute", left: from === "left" ? q * W * 1.2 - 200 : W - q * W * 1.2, top: rand(i + 3) * 900, width: 160 + rand(i) * 200, height: 4, borderRadius: 2, background: "rgb(120 140 160/0.4)", opacity: Math.sin(q * Math.PI) }} />; })}
      {items.map((it, i) => { const go = Math.max(0, s - rand(i) * 0.5) * strength, dx = d * go * go * 700, dy = -Math.sin(go * 2.5 + i) * 80 * go; return <div key={i} style={{ position: "absolute", left: it.x + dx, top: it.y + dy, transform: `translate(-50%,-50%) rotate(${d * go * go * 400}deg)` }}>{it.node}</div>; })}
    </>
  );
}
/** a magnet pulls things toward it, faster as they get close, and they stick (attraction, money pulled to the rich) */
export function MagnetPull({ x, y, items, at = 0, dur = 1.6, magnet = true }: { x: number; y: number; items: { node: ReactNode; x: number; y: number }[]; at?: number; dur?: number; magnet?: boolean }) {
  const { t } = useScene();
  return (
    <>
      {magnet && <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${Math.sin(t * 30) * (t > at && t < at + dur ? 3 : 0)}deg)`, fontSize: 160 }}>🧲</div>}
      {items.map((it, i) => { const k = Math.pow(clamp01((t - at - i * 0.08) / dur), 2.4), a = Math.atan2(it.y - y, it.x - x), stick = 90 + i * 8; return <div key={i} style={{ position: "absolute", left: lerp(it.x, x + Math.cos(a) * stick, k), top: lerp(it.y, y + Math.sin(a) * stick, k), transform: `translate(-50%,-50%) scale(${1 - k * 0.3})` }}>{it.node}</div>; })}
    </>
  );
}

/* ---------------- words as they are said ---------------- */
/** the narration's words on screen, each lit (or popped, or boxed) exactly as it is said; `keywords` get the accent and a
    pulse; `lines` words per line. Uses the scene's word times (from the voice) */
export function SpokenWords({ style = "pop", keywords = [], size = 74, per = 5, y, color }: { style?: "pop" | "karaoke" | "box" | "bounce"; keywords?: string[]; size?: number; per?: number; y?: number; color?: string }) {
  const { t, words, theme, H } = useScene();
  if (!words.length) return null;
  let cur = words.findIndex((w) => t < w.e);
  if (cur < 0) cur = words.length - 1;
  const from = Math.floor(cur / per) * per, line = words.slice(from, from + per);
  const key = new Set(keywords.map((k) => k.toLowerCase()));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y ?? H * 0.72, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 22px", fontFamily: family(theme.display), fontSize: size, fontWeight: 800, textTransform: style === "bounce" || style === "pop" ? "uppercase" : undefined }}>
      {line.map((w, i) => {
        const j = from + i, said = t >= w.s, now = t >= w.s && t <= w.e, isKey = key.has(w.w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
        const pop = said ? ease.back(clamp01((t - w.s) / 0.18)) : 0;
        const css: CSSProperties = style === "karaoke" ? { color: said ? (isKey ? theme.accent : color ?? theme.ink) : theme.muted }
          : style === "box" ? { color: now ? "#fff" : color ?? theme.ink, background: now ? theme.accent : "transparent", padding: "0 14px", borderRadius: 12 }
          : style === "bounce" ? { color: isKey ? theme.accent : color ?? theme.ink, transform: `translateY(${now ? -18 * Math.sin(clamp01((t - w.s) / 0.25) * Math.PI) : 0}px)`, opacity: said ? 1 : 0.25 }
          : { color: isKey ? theme.accent : color ?? theme.ink, transform: `scale(${said ? pop * (isKey && now ? 1.15 : 1) : 0.6})`, opacity: said ? 1 : 0 };
        return <span key={j} style={{ display: "inline-block", WebkitTextStroke: style === "pop" || style === "bounce" ? `3px ${theme.paper ?? "#fff"}` : undefined, paintOrder: "stroke", ...css }}>{w.w}</span>;
      })}
    </div>
  );
}

/* ---------------- transitions that use a thing ---------------- */
/** an object (a car, a bus, a hand, a train) crosses the frame and wipes A away to B behind it */
export function ObjectWipe({ a, b, wiper, at, dur = 1.2, from = "left", width = 400 }: { a: ReactNode; b: ReactNode; wiper: ReactNode; at: number; dur?: number; from?: "left" | "right"; width?: number }) {
  const { t, W } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), edge = from === "left" ? lerp(-width, W + width, k) : lerp(W + width, -width, k);
  const full: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
  return (
    <div style={full}>
      <div style={full}>{a}</div>
      <div style={{ ...full, clipPath: from === "left" ? `inset(0 ${Math.max(0, W - edge)}px 0 0)` : `inset(0 0 0 ${Math.max(0, edge)}px)` }}>{b}</div>
      {k > 0 && k < 1 && <div style={{ position: "absolute", left: edge, top: "50%", transform: `translate(-50%,-50%) scaleX(${from === "left" ? 1 : -1})` }}>{wiper}</div>}
    </div>
  );
}
/** a shape match-cut: A closes down to a shape at a point (a coin, a ball, an eye), and B opens out of the same shape there */
export function ShapeMatch({ a, b, at, x, y, shape = "circle", dur = 1.2 }: { a: ReactNode; b: ReactNode; at: number; x: number; y: number; shape?: "circle" | "square" | "star" | "heart" | "drop"; dur?: number }) {
  const { t, W, H } = useScene();
  const k = clamp01((t - at) / dur), close = ease.inOut(clamp01(k * 2)), open = ease.inOut(clamp01(k * 2 - 1)), big = Math.hypot(W, H) / 200;
  const poly = (f: number) => `polygon(${shapePoints(shape, 60, 200).map(([px, py]) => `${x + px * f}px ${y + py * f}px`).join(",")})`;
  const full: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
  if (k <= 0) return <div style={full}>{a}</div>;
  if (k >= 1) return <div style={full}>{b}</div>;
  return <div style={{ ...full, background: "#000" }}>{k < 0.5 ? <div style={{ ...full, clipPath: poly(lerp(big, 0.35, close)) }}>{a}</div> : <div style={{ ...full, clipPath: poly(lerp(0.35, big, open)) }}>{b}</div>}</div>;
}

/* ---------------- time on a place ---------------- */
/** a place falls to ruin over time: cracks spread, pieces drop, colour drains, weeds grow; `reverse` rebuilds it */
export function RuinRestore({ w, h, at = 0, dur = 4, reverse = false, children }: { w: number; h: number; at?: number; dur?: number; reverse?: boolean; children: ReactNode }) {
  const { t } = useScene();
  let k = ease.inOut(clamp01((t - at) / dur));
  if (reverse) k = 1 - k;
  const cracks = Array.from({ length: 6 }, (_, i) => { const pts: string[] = []; let x = rand(i) * w, y = rand(i + 9) * h * 0.4; for (let j = 0; j < 8; j++) { pts.push(`${x} ${y}`); x += (rand(i * 9 + j) - 0.5) * 80; y += 30 + rand(i * 7 + j) * 30; } return "M" + pts.join(" L"); });
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", inset: 0, filter: `grayscale(${k * 0.8}) sepia(${k * 0.5}) brightness(${1 - k * 0.25})`, clipPath: `polygon(0 ${k * 18}%, 15% ${k * 8}%, 30% ${k * 22}%, 50% ${k * 6}%, 70% ${k * 26}%, 85% ${k * 10}%, 100% ${k * 20}%, 100% 100%, 0 100%)` }}>{children}</div>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>{cracks.map((d, i) => <path key={i} d={d} fill="none" stroke="#2a2018" strokeWidth={3} pathLength={1} strokeDasharray={`${clamp01(k * 1.6 - i * 0.08)} 2`} />)}</svg>
      {Array.from({ length: 10 }, (_, i) => { const q = clamp01(k * 2 - rand(i)); return q > 0 && <div key={i} style={{ position: "absolute", left: rand(i + 2) * w, top: h * 0.1 + q * h * 0.85, width: 24 + rand(i) * 30, height: 18 + rand(i + 1) * 20, background: "#8a7a6a", transform: `rotate(${q * 300}deg)`, opacity: q < 1 ? 1 : 0.85 }} />; })}
      {Array.from({ length: 12 }, (_, i) => <div key={"g" + i} style={{ position: "absolute", left: (i / 12) * w + rand(i) * 30, bottom: 0, width: 10, height: 70 * clamp01(k * 1.5 - 0.5) * (0.5 + rand(i + 4)), background: "#4a7a3a", borderRadius: "10px 10px 0 0", transformOrigin: "50% 100%", transform: `rotate(${(rand(i) - 0.5) * 30}deg)` }} />)}
    </div>
  );
}
/** a timeline with a cursor that moves from event to event; each event's card pops up as the cursor reaches it */
export function TimelineScrub({ events, at = 0, per = 1.4, w = 1500 }: { events: { year: string; text: string }[]; at?: number; per?: number; w?: number }) {
  const { t, theme } = useScene();
  const n = events.length, pos = clamp01((t - at) / (per * Math.max(1, n - 1))) * (n - 1), i = Math.min(n - 1, Math.floor(pos + 0.001));
  const x = (j: number) => (j / Math.max(1, n - 1)) * w;
  return (
    <div style={{ position: "relative", width: w, height: 400, fontFamily: family(theme.font) }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, height: 8, borderRadius: 4, background: "rgb(0 0 0/0.12)" }}><div style={{ width: x(pos), height: "100%", borderRadius: 4, background: theme.accent }} /></div>
      {events.map((e, j) => <div key={j} style={{ position: "absolute", left: x(j), top: 292, width: 24, height: 24, borderRadius: 12, transform: "translateX(-50%)", background: j <= pos + 0.01 ? theme.accent : "#fff", border: `4px solid ${theme.accent}` }}><div style={{ position: "absolute", top: 34, left: "50%", transform: "translateX(-50%)", fontSize: 26, fontWeight: 700, color: theme.muted, whiteSpace: "nowrap" }}>{e.year}</div></div>)}
      <div style={{ position: "absolute", left: x(pos), top: 250, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderTop: `28px solid ${theme.ink}` }} />
      <div key={i} style={{ position: "absolute", left: Math.min(w - 220, Math.max(220, x(i))), top: 30, transform: `translateX(-50%) scale(${ease.back(clamp01((t - at - i * per) / 0.4))})`, width: 440, background: theme.paper ?? "#fff", borderRadius: 18, padding: "20px 26px", boxShadow: "0 12px 28px rgb(0 0 0/0.2)", textAlign: "center" }}>
        <div style={{ fontFamily: family(theme.display), fontSize: 56, fontWeight: 800, color: theme.accent }}>{events[i].year}</div><div style={{ fontSize: 30, color: theme.ink }}>{events[i].text}</div>
      </div>
    </div>
  );
}

/* ---------------- sound ---------------- */
export const SFX = ["whoosh", "thud", "paper", "tear", "typewriter", "impact", "riser", "pop", "ding", "click", "beep", "siren", "steps", "chime"] as const;
export type SfxKind = (typeof SFX)[number];
/** which sound goes with which motion (the agent can add the sound when it uses the motion) */
export const SFX_FOR: Record<string, SfxKind> = {
  pop: "pop", drop: "thud", fall: "thud", slide: "whoosh", whip: "whoosh", Transition: "whoosh", Transition2: "whoosh", tear: "tear", Typewriter: "typewriter",
  Explosion: "impact", Quake: "impact", Tap: "click", Toggle: "click", Spinner: "ding", TickCross: "ding", Pursuit: "steps", Go: "steps", Confetti: "chime",
  Trophy: "chime", PaperFold: "paper", Stamp: "thud", Dominoes: "click", HeartLine: "beep", Lightning: "impact",
};
/** plays a sound effect at `at` (s) from video/public/sfx (made by `python3 sfx.py`) */
export function Sfx({ kind, at = 0, volume = 0.6 }: { kind: SfxKind; at?: number; volume?: number }) {
  const { fps } = useScene();
  return <Sequence from={Math.max(0, Math.round(at * fps))} layout="none"><Audio src={staticFile(`sfx/${kind}.wav`)} volume={volume} /></Sequence>;
}
/** pulses what is inside on the music's beats (`bpm`, from `at`), harder on the first beat of each bar */
export function OnBeat({ bpm = 100, at = 0, amount = 1, children }: { bpm?: number; at?: number; amount?: number; children: ReactNode }) {
  const { t } = useScene();
  const b = Math.max(0, t - at) * (bpm / 60), p = b % 1, bar = Math.floor(b) % 4 === 0 ? 1.6 : 1;
  return <div style={{ display: "inline-block", transform: `scale(${1 + 0.06 * amount * bar * Math.exp(-p * 6) * (t >= at ? 1 : 0)})` }}>{children}</div>;
}
