/* Composed pages: the model lays out each printed page itself from pieces on a 12 x 6 grid (video/oneshot.py checks
   the boxes: inside the page, no overlaps except pieces sitting on a dark board, at least half the page used). Every
   piece is drawn in its box in the film's print DNA; pieces inside a board print light-on-dark. Times are seconds,
   already resolved from the narrator's words.
     <Compose pieces={[{ kind, col, row, w, h, ...data }]} t={t} seed={n} /> */
import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { appear, boardBg, fam, onBoard, Type, useDNA } from "./kit";
import { Combo, GlassBars, Grid, Legend, Ornaments, Pie, Stack, Walk } from "./spread";

type It = { label: string; text?: string; note?: string; value?: number | null; value2?: number | null; at: number; effect?: string };
export type Piece = {
  kind: string; col: number; row: number; w: number; h: number; at: number;
  text?: string; lines?: string[]; foot?: string; keys?: string[];
  number?: { to: number; prefix?: string; suffix?: string; decimals?: number; label?: string; note?: string; at: number; note_at?: number } | null;
  items?: It[];
  grid?: { rows: number; cols: number; col_labels?: string[]; legend?: string; from: number; to: number } | null;
  token?: { text: string; at: number; go: number; arrive: number } | null;
  callout?: { text: string; note: string; at: number } | null;
};

const X0 = 80, Y0 = 60, CW = 1760 / 12, RH = 960 / 6, G = 28;
const box = (p: Piece) => ({ x: X0 + p.col * CW + G / 2, y: Y0 + p.row * RH + G / 2, w: p.w * CW - G, h: p.h * RH - G });
type B = ReturnType<typeof box>;
const inside = (a: Piece, b: Piece) => a !== b && a.col >= b.col && a.row >= b.row && a.col + a.w <= b.col + b.w && a.row + a.h <= b.row + b.h;
const fit = (text: string, w: number, max: number) => Math.min(max, w / Math.max(2, text.length * 0.56));
const lum = (hex: string) => { const n = parseInt(hex.replace("#", ""), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const light = (inks: string[], paper: string) => { const b = inks.slice(0, 3).reduce((a, c) => (lum(c) > lum(a) ? c : a)); return lum(b) > 0.45 ? b : paper; };
const short = (v: number) => (Math.abs(v) >= 1e7 ? `${+(v / 1e7).toFixed(1)} Cr` : Math.abs(v) >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : Math.abs(v) >= 1e4 ? `${Math.round(v / 1e3)}k` : (+v.toFixed(1)).toLocaleString("en-IN"));

const P: React.FC<{ p: Piece; b: B; t: number; dark: boolean; seed: number }> = ({ p, b, t, dark, seed }) => {
  const d = useDNA();
  const fg = dark ? onBoard(d) : d.ink, loud = dark ? light(d.inks, onBoard(d)) : d.inks[0];
  const k = appear(t, p.at, 0.5);
  const items = p.items ?? [];
  switch (p.kind) {
    case "board": {
      const kb = appear(t, p.at, 0.7);
      return (
        <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: 14, overflow: "hidden", background: boardBg(d), opacity: kb, transform: `translateY(${(1 - kb) * 50}px)`, boxShadow: "0 18px 40px rgba(0,0,0,0.18)" }}>
          <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "screen", opacity: 0.16 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
          {p.lines && <Stack x={40} y={36} lines={p.lines} t={t} at={p.at + 0.3} color={onBoard(d)} />}
          {p.text && <Stack x={b.w - 40} y={36} lines={p.text.split("/")} t={t} at={p.at + 0.4} color={onBoard(d)} align="right" />}
          {p.foot && <Stack x={40} y={b.h - 80} lines={p.foot.split("/")} t={t} at={p.at + 0.6} color={onBoard(d)} />}
        </div>);
    }
    case "title":
      return <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, display: "flex", alignItems: "flex-end", opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
        <Type size={Math.min(fit(p.text ?? "", b.w * 1.9, 120), b.h * 0.7)} display color={fg}>{p.text}</Type></div>;
    case "text":
      return <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, opacity: k, borderTop: `2px solid ${fg}`, paddingTop: 14 }}>
        <Type size={Math.min(50, Math.max(32, b.h / 3))} color={fg} style={{ fontStyle: "italic" }}>{p.text}</Type></div>;
    case "kicker":
      return <Stack x={b.x} y={b.y} lines={p.lines?.length ? p.lines : (p.text ?? "").split("/")} t={t} at={p.at} color={fg} size={24} />;
    case "watermark":
      return <div style={{ position: "absolute", left: b.x, top: b.y, fontFamily: fam(d.display), fontSize: Math.min(b.h * 1.1, b.w / Math.max(1, (p.text ?? "").length * 0.55)), lineHeight: 0.9, color: fg, opacity: 0.1 * appear(t, 0, 1), filter: "url(#ink)", whiteSpace: "nowrap" }}>{p.text}</div>;
    case "number": {
      const n = p.number;
      if (!n) return null;
      const v = interpolate(t, [n.at, n.at + 1.1], [0, n.to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      const txt = `${n.prefix ?? ""}${v.toLocaleString("en-IN", { minimumFractionDigits: n.decimals ?? 0, maximumFractionDigits: n.decimals ?? 0 })}${n.suffix ?? ""}`;
      const full = `${n.prefix ?? ""}${n.to.toLocaleString("en-IN")}${n.suffix ?? ""}`;
      const size = Math.min(b.h * (n.note ? 0.48 : 0.6), b.w / Math.max(2, full.length * 0.56), 320);
      const kn = appear(t, n.at, 0.4);
      return (
        <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, display: "flex", flexDirection: "column", justifyContent: "center", opacity: kn, transform: `translateY(${(1 - kn) * 24}px)` }}>
          <Type size={size} display color={loud} misreg={dark ? undefined : d.inks[1]} style={{ whiteSpace: "nowrap" }}>{txt}</Type>
          {n.label && <><div style={{ borderTop: `3px solid ${fg}`, width: Math.min(b.w, size * 2.6) * appear(t, n.at + 0.4, 0.5), margin: `${size * 0.1}px 0 12px` }} /><Type size={34} caps color={fg}>{n.label}</Type></>}
          {n.note && <div style={{ marginTop: 16, opacity: appear(t, n.note_at ?? n.at + 1) }}><Type size={Math.min(48, b.w / 18)} color={fg} style={{ fontStyle: "italic" }}>{n.note}</Type></div>}
        </div>);
    }
    case "glassbars": {
      const max = Math.max(1e-9, ...items.map((i) => i.value ?? 0));
      return <GlassBars x={b.x} y={b.y} w={b.w} h={b.h} t={t} max={max} bars={items.slice(0, 5).map((i) => ({ label: i.label.toUpperCase(), value: i.value ?? 0, text: i.text || short(i.value ?? 0), at: i.at, ghost: i.effect === "ghost" }))} />;
    }
    case "pie": {
      const r = Math.max(80, Math.min(b.w, b.h) / 2 - 70);
      return <Pie cx={b.x + b.w / 2} cy={b.y + b.h / 2} r={r} t={t} dark={dark} at={items.map((i) => i.at)} slices={items.slice(0, 4).map((i) => ({ label: i.label, value: i.value ?? 0 }))} />;
    }
    case "legend": {
      const total = items.reduce((a, i) => a + (i.value ?? 0), 0) || 1;
      return <Legend x={b.x} y={b.y} w={b.w} t={t} dark={dark} at={items.map((i) => i.at)} size={Math.min(40, b.h / Math.max(1, items.length) * 0.45)} items={items.slice(0, 5).map((i) => ({ label: i.label, value: i.text || `${Math.round(((i.value ?? 0) / total) * 100)}%` }))} />;
    }
    case "grid": {
      const g = p.grid;
      if (!g) return null;
      const rows = Math.max(1, Math.min(25, g.rows)), cols = Math.max(1, Math.min(24, g.cols));
      const dk = lum(d.inks[0]) < lum(d.inks[1]) ? 0 : 1;
      return <>
        <Grid x={b.x} y={b.y} w={b.w} h={b.h - (g.legend ? 56 : 0)} dark={dark} rows={Array.from({ length: rows }, (_, i) => String(i + 1))} cols={(g.col_labels ?? []).slice(0, cols).concat(Array(Math.max(0, cols - (g.col_labels ?? []).length)).fill(""))}
          t={t} from={g.from} to={g.to} tone={(i, j) => (i === rows - 1 && j === cols - 1 ? 1 - dk : dk)} />
        {g.legend && <div style={{ position: "absolute", left: b.x + 70, top: b.y + b.h - 44, display: "flex", alignItems: "center", gap: 14, opacity: appear(t, g.from) }}>
          <div style={{ width: 30, height: 30, background: d.inks[dk], filter: "url(#ink)" }} /><Type size={30} color={fg}>{g.legend}</Type></div>}
      </>;
    }
    case "combo": {
      const groups = items.slice(0, 6).map((it) => { const a = it.value ?? 0, c = it.value2 ?? 0; return { label: it.label, a, b: c, line: a ? (a + c) / a : 1, lineText: it.text || (a ? `${((a + c) / a).toFixed(1)}×` : ""), at: it.at }; });
      const box2 = p.callout ? appear(t, p.callout.at, 0.5) : 0;
      return <>
        <Combo x={b.x + 30} y={b.y + 110} w={b.w - 60} h={b.h - 170} t={t} groups={groups} keys={[p.keys?.[0] ?? "", p.keys?.[1] ?? "", p.keys?.[2] ?? "Total ÷ first"]} />
        {p.callout && <div style={{ position: "absolute", left: b.x + 40, top: b.y + 130, padding: "14px 24px", background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 20, opacity: box2 }}>
          <Type size={84} display color={d.inks[0]}>{p.callout.text}</Type><Type size={30} style={{ maxWidth: 300 }}>{p.callout.note}</Type></div>}
      </>;
    }
    case "bars": {
      const max = Math.max(1e-9, ...items.map((i) => i.value ?? 0));
      const n = Math.min(6, items.length), slot = b.w / Math.max(1, n), bw = Math.min(220, slot * 0.6), base = b.y + b.h - 56, H = b.h - 150;
      return <>
        <div style={{ position: "absolute", left: b.x, top: base, width: b.w * appear(t, items[0]?.at ?? 0, 0.5), borderTop: `4px solid ${fg}` }} />
        {items.slice(0, 6).map((it, i) => {
          const kk = appear(t, it.at, 0.7), hh = ((it.value ?? 0) / max) * H * kk, x = b.x + slot * (i + 0.5) - bw / 2;
          return <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x, top: base - hh, width: bw, height: hh, background: i === n - 1 ? loud : dark ? "#6f6a62" : d.ink, filter: "url(#ink)" }} />
            <div style={{ position: "absolute", left: x - 60, width: bw + 120, top: base - hh - 66, textAlign: "center", opacity: kk }}><Type size={Math.min(46, slot / 5)} display color={fg}>{it.text || short(it.value ?? 0)}</Type></div>
            <div style={{ position: "absolute", left: x - 60, width: bw + 120, top: base + 12, textAlign: "center", opacity: kk }}><Type size={30} caps color={fg}>{it.label}</Type></div>
          </React.Fragment>;
        })}
      </>;
    }
    case "steps": {
      const n = Math.min(5, items.length), w = b.w / Math.max(1, n);
      const num = Math.min(150, b.h * 0.42, w * 0.55);
      const tok = p.token;
      const go = tok ? interpolate(t, [tok.go, Math.max(tok.go + 0.4, tok.arrive)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : 0;
      const tk = tok ? appear(t, tok.at, 0.4) : 0;
      const body = num + 150 + (tok && b.h >= 420 ? 200 : 0), top = b.y + Math.max(0, (b.h - body) / 2);
      const ty = top + num + 240, x0 = b.x + w * 0.35, x1 = b.x + w * Math.min(n - 1, 1.35);
      return <>
        {items.slice(0, n).map((it, i) => {
          const kk = appear(t, it.at, 0.45), crossed = it.effect === "cross", cross = crossed ? appear(t, it.value ?? it.at + 0.8, 0.35) : 0;
          return <React.Fragment key={i}>
            <div style={{ position: "absolute", left: b.x + i * w, top, width: w - 40, opacity: kk * (crossed ? 0.55 : 1), transform: `translateY(${(1 - kk) * 24}px)` }}>
              <Type size={num} display color={i === n - 1 && !crossed ? loud : fg}>{String(i + 1).padStart(2, "0")}</Type>
              <div style={{ borderTop: `3px solid ${fg}`, margin: "8px 0 12px", width: (w - 60) * kk }} />
              <Type size={fit(it.label, (w - 40) * 1.7, 58)} display color={fg}>{it.label}</Type>
              {it.note && <div style={{ marginTop: 6 }}><Type size={32} color={fg} style={{ fontStyle: "italic" }}>{it.note}</Type></div>}
            </div>
            {crossed && <div style={{ position: "absolute", left: b.x + i * w - 10, top: top + num + 50, height: 12, width: (w - 40) * cross, background: d.inks[0], filter: "url(#ink)", transform: "rotate(-4deg)" }} />}
          </React.Fragment>;
        })}
        {tok && b.h >= 420 && <>
          <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
            <line x1={x0} y1={ty} x2={x1} y2={ty} stroke={fg} strokeWidth={3} strokeDasharray="12 10" opacity={tk} />
            <line x1={x0} y1={ty} x2={x0 + (x1 - x0) * go} y2={ty} stroke={d.inks[0]} strokeWidth={5} />
          </svg>
          <div style={{ position: "absolute", left: x0 + (x1 - x0) * go - 70, top: ty - 70, width: 140, height: 140, borderRadius: "50%", background: d.inks[0], filter: "url(#ink)", display: "grid", placeItems: "center", opacity: tk, transform: `rotate(${go * 360}deg)` }}>
            <Type size={fit(tok.text, 200, 42)} display color={d.paper}>{tok.text}</Type></div>
        </>}
      </>;
    }
    case "stamps": {
      const its = items.slice(0, 12), n = its.length, cols = n <= 4 ? Math.min(n, 4) : n <= 9 ? 3 : 4, rows = Math.ceil(n / Math.max(1, cols));
      const cw = b.w / Math.max(1, cols), ch = b.h / Math.max(1, rows);
      return <>{its.map((it, i) => {
        const kk = appear(t, it.at, 0.25), x = b.x + (i % cols) * cw, y = b.y + Math.floor(i / cols) * ch;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: cw - 14, height: ch - 14, borderTop: `2px solid ${fg}`, opacity: appear(t, (its[0]?.at ?? 0.5) - 0.5, 0.4) }}>
          <div style={{ marginTop: 6 }}><Type size={30} caps color={fg}>{it.label}</Type></div>
          <div style={{ position: "absolute", left: 0, top: 50, right: 6, bottom: 8, background: d.inks[i % 3], filter: "url(#ink)", opacity: kk * 0.92, transform: `scale(${1.35 - 0.35 * kk}) rotate(${(i % 2 ? 3 : -2) * (1 - kk * 0.5)}deg)`, display: "grid", placeItems: "center" }}>
            <Type size={fit(it.text ?? "", cw * 1.2, 44)} display color={d.paper}>{it.text ?? ""}</Type></div>
        </div>;
      })}</>;
    }
    case "walk":
      return <Walk x={b.x} y={b.y} w={b.w} h={b.h} t={t} at={p.token?.go ?? p.at} dur={Math.max(1.2, (p.token?.arrive ?? p.at + 2.5) - (p.token?.go ?? p.at))} seed={seed} />;
    case "headline": {
      const its = items.slice(0, 3), longest = Math.max(4, ...its.map((i) => i.label.length));
      const size = Math.min(220, b.w / (longest * 0.56), (b.h / Math.max(1, its.length)) * 0.82);
      return <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: size * 0.08 }}>
        {its.map((it, i) => {
          if (t < it.at) return <div key={i} style={{ height: size }} />;
          const kk = appear(t, it.at, 0.35), e = it.effect || (i === 0 ? "bar" : i === its.length - 1 ? "accent" : "plain");
          const cross = e === "cross" ? appear(t, it.at + 0.45, 0.35) : 0;
          return <div key={i} style={{ position: "relative", alignSelf: "flex-start", opacity: kk, transform: `translateX(${(1 - kk) * -50}px)` }}>
            {e === "bar" && <div style={{ position: "absolute", left: -14, right: -14, top: size * 0.06, bottom: -size * 0.04, background: dark ? d.paper : d.ink, filter: "url(#ink)", transformOrigin: "left", transform: `scaleX(${kk})` }} />}
            <Type size={size} display color={e === "bar" ? (dark ? d.ink : d.paper) : e === "accent" ? loud : fg} style={{ position: "relative", textTransform: "uppercase", whiteSpace: "nowrap" }}>{it.label}</Type>
            {cross > 0 && <div style={{ position: "absolute", left: -8, top: "50%", height: size * 0.09, width: `calc(${cross * 100}% + 16px)`, background: d.inks[0], filter: "url(#ink)" }} />}
          </div>;
        })}
      </div>;
    }
    default:
      return null;
  }
};

const CORNERS = { tl: [0, 0], tr: [10, 0], bl: [0, 5], br: [10, 5] } as const;

/** a page the model composed: boards first (so what sits on them prints over them), then the pieces; ornaments go in
 *  the corners no piece uses; the sheet pushes in slowly */
export const Compose: React.FC<{ pieces: Piece[]; t: number; dur: number; seed: number }> = ({ pieces, t, dur, seed }) => {
  const order = [...pieces].sort((a, b) => (a.kind === "board" ? 0 : a.kind === "watermark" ? 1 : 2) - (b.kind === "board" ? 0 : b.kind === "watermark" ? 1 : 2));
  const boards = pieces.filter((p) => p.kind === "board");
  const free = (Object.keys(CORNERS) as (keyof typeof CORNERS)[]).filter((z) => {
    const [c, r] = CORNERS[z];
    return !pieces.some((p) => p.kind !== "watermark" && c + 2 > p.col && c < p.col + p.w && r + 1 > p.row && r < p.row + p.h);
  }).slice(0, 2);
  const push = 1 + 0.025 * Math.min(1, Math.max(0, t) / Math.max(1, dur));
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      {order.map((p, i) => <P key={i} p={p} b={box(p)} t={t} seed={seed + i} dark={p.kind !== "board" && boards.some((bd) => inside(p, bd))} />)}
      {free.length > 0 && <Ornaments zones={free as never} seed={seed} t={t} />}
    </AbsoluteFill>
  );
};
