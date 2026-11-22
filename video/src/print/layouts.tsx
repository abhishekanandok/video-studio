/* Print layouts: whole-frame printed spreads built from DATA (the storyboard's spread spec, with every cue word already
   turned into seconds by video/oneshot.py). The pipeline picks a layout per line; this file draws it in the film's
   print DNA. Every piece appears on its word; the sheet pushes in slowly; ornaments turn in the free corners.
     <Spread spec={...} t={t} dur={...} />   layouts: number | stamps | steps | grid | pie | combo | bars | walk | headline | photo */
import React from "react";
import { AbsoluteFill, Easing, interpolate, staticFile } from "remotion";
import { appear, Headline, InkBars, PrintPhoto, Type, useDNA } from "./kit";
import { Compose, type Piece } from "./compose";
import { Board, Combo, GlassBars, Grid, Legend, Num, Ornaments, Pie, Stack, Walk, Watermark } from "./spread";

export type Item = { label: string; text?: string; note?: string; value?: number | null; value2?: number | null; at: number; effect?: string };
export type Spec = {
  layout: string; seed: number; flip?: boolean;
  kicker?: string[]; title?: string; title_at?: number; watermark?: string;
  number?: { to: number; prefix?: string; suffix?: string; decimals?: number; label?: string; note?: string; at: number; note_at?: number } | null;
  items: Item[];
  board?: { title: string[]; tag: string[]; foot: string } | null;
  token?: { text: string; at: number; go: number; arrive: number } | null;
  grid?: { rows: number; cols: number; col_labels?: string[]; legend?: string; from: number; to: number } | null;
  keys?: string[];
  callout?: { text: string; note: string; at: number } | null;
  photo?: { src: string; w: number; h: number; focus?: [number, number]; caption?: string; credit?: string } | null;
  pieces?: Piece[];
};

const fit = (text: string, width: number, max: number) => Math.min(max, width / Math.max(2, text.length * 0.56));
const numText = (n: NonNullable<Spec["number"]>) => `${n.prefix ?? ""}${n.to.toLocaleString("en-IN", { minimumFractionDigits: n.decimals ?? 0, maximumFractionDigits: n.decimals ?? 0 })}${n.suffix ?? ""}`;
const short = (v: number) => (Math.abs(v) >= 1e7 ? `${+(v / 1e7).toFixed(1)} Cr` : Math.abs(v) >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : Math.abs(v) >= 1e4 ? `${Math.round(v / 1e3)}k` : v.toLocaleString("en-IN"));
const lum = (hex: string) => { const n = parseInt(hex.replace("#", ""), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
/** the ink that reads on the dark board: the lightest colour ink, or the paper when every ink is dark */
const onDark = (inks: string[], paper: string) => { const b = inks.slice(0, 3).reduce((a, c) => (lum(c) > lum(a) ? c : a)); return lum(b) > 0.45 ? b : paper; };
const ZONES = [["bl"], ["br"], ["tr"], ["tr", "bl"], ["br", "tl"]] as const;

/** the spec's printed headline block: mono kicker, display title */
const Head: React.FC<{ s: Spec; t: number; x: number; y: number; w: number; size?: number }> = ({ s, t, x, y, w, size = 80 }) => (
  <>
    {s.kicker && s.kicker.length > 0 && <Stack x={x} y={y} lines={s.kicker} t={t} at={0} size={24} />}
    {s.title && <div style={{ position: "absolute", left: x, top: y + (s.kicker?.length ? s.kicker.length * 38 + 20 : 0), width: w, opacity: appear(t, s.title_at ?? 0.1) }}>
      <Type size={fit(s.title, w * 1.7, size)} display>{s.title}</Type></div>}
  </>
);

/* number: one figure printed huge; with items, glass bars on a dark board beside it */
const NumberSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => {
  const d = useDNA();
  const n = s.number;
  const board = s.items.length > 0;
  const L = board ? (s.flip ? 1010 : 110) : 110, W = board ? 820 : 1700;
  const size = n ? fit(numText(n), W, board ? 300 : 340) : 0;
  return <>
    <Head s={s} t={t} x={L} y={100} w={W} size={70} />
    {n && <Num x={L} y={board ? 300 : 280} t={t} at={n.at} to={n.to} prefix={n.prefix ?? ""} suffix={n.suffix ?? ""} decimals={n.decimals ?? 0} size={size} w={W} label={n.label} />}
    {n?.note && <div style={{ position: "absolute", left: L, top: (board ? 300 : 280) + size * 1.2 + 140, width: W, opacity: appear(t, n.note_at ?? n.at + 1) }}>
      <Type size={54} style={{ fontStyle: "italic" }}>{n.note}</Type></div>}
    {board && <Board x={s.flip ? 80 : 1000} y={70} w={840} h={940} t={t} at={0.15} title={s.board?.title} tag={s.board?.tag} foot={s.board?.foot}>
      <GlassBars x={70} y={170} w={720} h={640} t={t} max={Math.max(...s.items.map((b) => b.value ?? 0))}
        bars={s.items.slice(0, 5).map((b) => ({ label: b.label.toUpperCase(), value: b.value ?? 0, text: b.text ?? short(b.value ?? 0), at: b.at, ghost: b.effect === "ghost" }))} />
    </Board>}
    {!board && s.watermark && <Watermark x={900} y={560} text={s.watermark} t={t} size={300} />}
    <Ornaments zones={[...(board ? (s.flip ? ["br"] : ["bl"]) : ZONES[s.seed % ZONES.length])] as never} seed={s.seed} t={t} />
  </>;
};

/* stamps: a title on one side, a grid of repeated stamps (months, days, payments) printing one by one on the other */
const StampSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => {
  const d = useDNA();
  const items = s.items.slice(0, 12), n = items.length;
  const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4, rows = Math.ceil(n / cols);
  const gx = s.flip ? 110 : 1100, cw = 700 / cols, chh = Math.min(240, 640 / rows);
  const words = (s.title ?? "").split(/\s+/).filter(Boolean);
  const big = words.length >= 2 && words.length <= 4 ? fit(words.reduce((a, b) => (a.length > b.length ? a : b)), 860, 150) : 0;
  const lit = s.callout ? appear(t, s.callout.at, 0.4) : 0;
  const tx = s.flip ? 1000 : 110;
  return <>
    {s.watermark && <Watermark x={s.flip ? 960 : 60} y={40} text={s.watermark} t={t} size={300} />}
    {big ? <div style={{ position: "absolute", left: tx, top: 260 }}>
      {words.map((w, i) => (
        <div key={i} style={{ opacity: appear(t, (s.title_at ?? 0.1) + i * 0.35, 0.35) }}>
          <Type size={big} display><span style={{ color: lit > 0.5 ? d.inks[0] : d.ink }}>{w[0]}</span>{w.slice(1)}</Type></div>))}
    </div> : s.title && <div style={{ position: "absolute", left: tx, top: 300, width: 820, opacity: appear(t, s.title_at ?? 0.1) }}><Type size={fit(s.title, 1500, 110)} display>{s.title}</Type></div>}
    {s.callout?.note && <div style={{ position: "absolute", left: tx, top: 820, width: 860, borderTop: `3px solid ${d.ink}`, paddingTop: 18, opacity: appear(t, s.callout.at) }}><Type size={44}>{s.callout.note}</Type></div>}
    {s.kicker && <Stack x={gx} y={150} lines={s.kicker} t={t} at={(items[0]?.at ?? 0.5) - 0.4} size={24} />}
    {items.map((it, i) => {
      const k = appear(t, it.at, 0.25);
      const x = gx + (i % cols) * cw, y = 240 + Math.floor(i / cols) * chh;
      return (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: cw - 14, height: chh - 14, borderTop: `2px solid ${d.ink}`, opacity: appear(t, (items[0]?.at ?? 0.5) - 0.5, 0.4) }}>
          <div style={{ marginTop: 8 }}><Type size={30} caps>{it.label}</Type></div>
          <div style={{ position: "absolute", left: 0, top: 58, right: 6, bottom: 10, background: d.inks[i % 3], filter: "url(#ink)", opacity: k * 0.92,
            transform: `scale(${1.35 - 0.35 * k}) rotate(${(i % 2 ? 3 : -2) * (1 - k * 0.5)}deg)`, display: "grid", placeItems: "center" }}>
            <Type size={fit(it.text ?? "", cw * 1.2, 44)} display color={d.paper}>{it.text ?? ""}</Type>
          </div>
        </div>);
    })}
    <Ornaments zones={[s.flip ? "br" : "bl"] as never} seed={s.seed} t={t} />
  </>;
};

/* steps: 01 02 03 across the page, each on its word; a token can travel from one to the next; a crossed step is struck */
const StepSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => {
  const d = useDNA();
  const items = s.items.slice(0, 4), n = items.length;
  const span = 1700, w = span / n, X = items.map((_, i) => 110 + i * w);
  const tok = s.token;
  const go = tok ? interpolate(t, [tok.go, Math.max(tok.go + 0.4, tok.arrive)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : 0;
  const tk = tok ? appear(t, tok.at, 0.4) : 0;
  const x0 = X[0] + 220, x1 = (X[1] ?? X[0]) + 220;
  return <>
    {s.kicker && <Stack x={110} y={100} lines={s.kicker} t={t} at={0} size={26} />}
    {items.map((it, i) => {
      const k = appear(t, it.at, 0.45);
      const crossed = it.effect === "cross";
      const cross = crossed ? appear(t, it.value ?? it.at + 0.8, 0.35) : 0;  // value carries the time of the striking word
      return (
        <React.Fragment key={i}>
          <div style={{ position: "absolute", left: X[i], top: 250, width: w - 90, opacity: k * (crossed ? 0.55 : 1), transform: `translateY(${(1 - k) * 24}px)` }}>
            <Type size={170} display color={i === 1 && tok ? d.inks[0] : i === n - 1 && !crossed && !tok ? d.inks[0] : d.ink}>{String(i + 1).padStart(2, "0")}</Type>
            <div style={{ borderTop: `3px solid ${d.ink}`, margin: "10px 0 16px", width: (w - 130) * k }} />
            <Type size={fit(it.label, (w - 90) * 1.6, 64)} display>{it.label}</Type>
            {it.note && <div style={{ marginTop: 8 }}><Type size={34} style={{ fontStyle: "italic" }}>{it.note}</Type></div>}
          </div>
          {crossed && <div style={{ position: "absolute", left: X[i] - 20, top: 520, height: 14, width: (w - 60) * cross, background: d.inks[0], filter: "url(#ink)", transform: "rotate(-4deg)" }} />}
          {!tok && i < n - 1 && <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: appear(t, items[i + 1].at - 0.3, 0.3) }}>
            <path d={`M${X[i] + w - 150},${340} h60 m-16,-14 l16,14 l-16,14`} stroke={d.ink} strokeWidth={4} fill="none" /></svg>}
        </React.Fragment>);
    })}
    {tok && <>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <line x1={x0} y1={800} x2={x1} y2={800} stroke={d.ink} strokeWidth={3} strokeDasharray="12 10" opacity={tk} />
        <line x1={x0} y1={800} x2={x0 + (x1 - x0) * go} y2={800} stroke={d.inks[0]} strokeWidth={5} />
      </svg>
      <div style={{ position: "absolute", left: x0 + (x1 - x0) * go - 95, top: 705, width: 190, height: 190, borderRadius: "50%", background: d.inks[0], filter: "url(#ink)", display: "grid", placeItems: "center",
        opacity: tk, transform: `scale(${0.6 + 0.4 * tk}) rotate(${go * 360}deg)` }}>
        <Type size={fit(tok.text, 260, 52)} display color={d.paper}>{tok.text}</Type>
      </div>
    </>}
    <Ornaments zones={[tok ? "br" : "bl"] as never} seed={s.seed} t={t} />
  </>;
};

/* grid: N squares (rows x cols) filling one by one while the total counts up beside them */
const GridSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => {
  const d = useDNA();
  const g = s.grid!;
  const rows = Math.max(1, Math.min(25, g.rows)), cols = Math.max(1, Math.min(24, g.cols));
  const gx = s.flip ? 760 : 90, rx = s.flip ? 110 : 1270;
  const n = s.number;
  return <>
    {s.title && <div style={{ position: "absolute", left: gx, top: 60, opacity: appear(t, s.title_at ?? g.from - 0.3) }}><Type size={fit(s.title, 1900, 52)} display>{s.title}</Type></div>}
    <Grid x={gx} y={150} w={1080} h={880} rows={Array.from({ length: rows }, (_, i) => String(i + 1))} cols={(g.col_labels ?? []).slice(0, cols).concat(Array(Math.max(0, cols - (g.col_labels ?? []).length)).fill(""))}
      t={t} from={g.from} to={g.to} tone={(i, j) => { const dark = lum(d.inks[0]) < lum(d.inks[1]) ? 0 : 1; return i === rows - 1 && j === cols - 1 ? 1 - dark : dark; }} />
    {s.kicker && <Stack x={rx} y={150} lines={s.kicker} t={t} at={0.1} size={26} />}
    {n && <Num x={rx} y={300} t={t} at={g.from} dur={Math.max(0.6, g.to - g.from)} linear to={n.to} prefix={n.prefix ?? ""} suffix={n.suffix ?? ""} decimals={n.decimals ?? 0} size={fit(numText(n), 600, 130)} w={600} label={n.label} />}
    {n?.note && <div style={{ position: "absolute", left: rx, top: 570, width: 560, opacity: appear(t, n.note_at ?? g.from + 0.5) }}><Type size={50} display>{n.note}</Type></div>}
    {g.legend && <div style={{ position: "absolute", left: rx, top: 680, display: "flex", alignItems: "center", gap: 16, opacity: appear(t, g.from) }}>
      <div style={{ width: 34, height: 34, background: lum(d.inks[0]) < lum(d.inks[1]) ? d.inks[0] : d.inks[1], filter: "url(#ink)" }} /><Type size={32}>{g.legend}</Type></div>}
    <Ornaments zones={[s.flip ? "bl" : "br"] as never} seed={s.seed} t={t} />
  </>;
};

/* pie: the split with a ruled legend; a dark board beside it carries the one number that matters */
const PieSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => {
  const d = useDNA();
  const items = s.items.slice(0, 4);
  const px = s.flip ? 1440 : 480, lx = s.flip ? 1130 : 170, bx = s.flip ? 70 : 1000;
  const n = s.number;
  const total = items.reduce((a, b) => a + (b.value ?? 0), 0) || 1;
  return <>
    <Pie cx={px} cy={420} r={290} t={t} at={items.map((i) => i.at)} slices={items.map((i) => ({ label: i.label, value: i.value ?? 0 }))} />
    <Legend x={lx} y={790} w={640} t={t} at={items.map((i) => i.at + 0.4)} size={items.length > 2 ? 34 : 40} items={items.map((i) => ({ label: i.label, value: i.text ?? `${Math.round(((i.value ?? 0) / total) * 100)}%` }))} />
    <Board x={bx} y={70} w={850} h={940} t={t} at={0.1} title={s.board?.title} tag={s.board?.tag} foot={s.board?.foot}>
      {n && <Num x={60} y={250} t={t} at={n.at} to={n.to} prefix={n.prefix ?? ""} suffix={n.suffix ?? ""} decimals={n.decimals ?? 0} size={fit(numText(n), 760, 170)} w={760} label={n.label} dark color={onDark(d.inks, d.paper)} />}
      <div style={{ position: "absolute", left: 60, top: 600, width: 730, height: 70, display: "flex", opacity: appear(t, (items[0]?.at ?? 0) + 0.6) }}>
        {items.map((it, i) => <div key={i} style={{ flex: it.value ?? 0, background: d.inks[i % d.inks.length], filter: "url(#ink)" }} />)}
      </div>
      {n?.note && <div style={{ position: "absolute", left: 60, top: 700, width: 730, opacity: appear(t, n.note_at ?? n.at + 1.2) }}><Type size={42} color={d.paper}>{n.note}</Type></div>}
    </Board>
  </>;
};

/* combo: paired bars per period with a ratio line over them and a callout box */
const ComboSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => {
  const d = useDNA();
  const groups = s.items.slice(0, 6).map((it) => {
    const a = it.value ?? 0, b = it.value2 ?? 0;
    return { label: it.label, a, b, line: a ? (a + b) / a : 1, lineText: it.text || (a ? `${((a + b) / a).toFixed(1)}×` : ""), at: it.at };
  });
  const box = s.callout ? appear(t, s.callout.at, 0.5) : 0;
  return <>
    {s.title && <div style={{ position: "absolute", left: 110, top: 80, opacity: appear(t, s.title_at ?? 0) }}><Type size={fit(s.title, 2600, 80)} display>{s.title}</Type></div>}
    {s.kicker && <Stack x={1810} y={90} lines={s.kicker} t={t} at={0.2} size={24} align="right" />}
    <Combo x={180} y={360} w={1560} h={560} t={t} groups={groups} keys={[s.keys?.[0] ?? "", s.keys?.[1] ?? "", s.keys?.[2] ?? "Total ÷ first"]} />
    {s.callout && <div style={{ position: "absolute", left: 200, top: 400, padding: "18px 28px", background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 24, opacity: box, transform: `scale(${0.9 + 0.1 * box})`, transformOrigin: "left top" }}>
      <Type size={96} display color={d.inks[0]}>{s.callout.text}</Type>
      <Type size={30} style={{ maxWidth: 330 }}>{s.callout.note}</Type>
    </div>}
  </>;
};

/* walk: two printed lines of headline over a market line that zig-zags across */
const WalkSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => {
  const d = useDNA();
  const lines = s.items.slice(0, 2);
  const longest = Math.max(...lines.map((l) => l.label.length), 6);
  const size = Math.min(120, 1100 / (longest * 0.5));
  return <>
    {s.watermark && <Watermark x={1080} y={30} text={s.watermark} t={t} size={400} />}
    {lines.map((l, i) => <div key={i} style={{ position: "absolute", left: 110, top: 120 + i * size * 1.08, opacity: appear(t, l.at) }}>
      <Type size={size} display color={i === 1 ? d.inks[0] : d.ink} misreg={i === 1 ? d.inks[1] : undefined}>{l.label}</Type></div>)}
    <Walk x={110} y={500} w={1700} h={380} t={t} at={s.token?.go ?? 1} dur={Math.max(1.2, (s.token?.arrive ?? 3) - (s.token?.go ?? 1))} seed={s.seed} />
    {s.kicker && <Stack x={110} y={930} lines={[s.kicker.join(" · ")]} t={t} at={s.callout?.at ?? 2} size={26} />}
  </>;
};

/* headline: 2-3 printed lines (reversed out of a bar, plain, struck through, in the first ink) */
const HeadlineSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => <>
  <Headline t={t} kicker={s.kicker?.join(" · ")} words={s.items.slice(0, 3).map((it, i) => ({ text: it.label, at: it.at, effect: (["bar", "plain", "cross", "accent"].includes(it.effect ?? "") ? it.effect : i === 0 ? "bar" : i === s.items.length - 1 ? "accent" : "plain") as never }))} />
  <Ornaments zones={[...ZONES[(s.seed + 2) % ZONES.length]].filter((z) => z !== "tl" && z !== "bl") as never} seed={s.seed} t={t} />
</>;

/* bars: plain printed bars on a ruled baseline (a comparison of 2-6 values) */
const BarsSpread: React.FC<{ s: Spec; t: number }> = ({ s, t }) => <>
  <InkBars t={t} at={s.items[0]?.at ?? 0.3} title={s.title} bars={s.items.slice(0, 6).map((b) => ({ label: b.label, value: b.value ?? 0, text: b.text }))} />
  {s.kicker && <Stack x={1810} y={100} lines={s.kicker} t={t} at={0.2} size={24} align="right" />}
</>;

/* photo: a real photograph printed as a duotone plate, caption and credit beside it */
const PhotoSpread: React.FC<{ s: Spec; t: number; dur: number }> = ({ s, t, dur }) => {
  const p = s.photo!;
  return <>
    <PrintPhoto t={t} at={0} dur={dur} src={staticFile(p.src)} ratio={p.w / p.h} focus={p.focus} caption={p.caption} credit={p.credit} />
    {s.kicker && <Stack x={110 + Math.min(1180, 820 * (p.w / p.h)) + 50} y={600} lines={s.kicker} t={t} at={s.title_at ?? 1} size={28} />}
    <Ornaments zones={["br"] as never} seed={s.seed} t={t} />
  </>;
};

const LAYOUTS: Record<string, React.FC<{ s: Spec; t: number; dur: number }>> = {
  number: NumberSpread, stamps: StampSpread, steps: StepSpread, grid: GridSpread, pie: PieSpread, combo: ComboSpread,
  walk: WalkSpread, headline: HeadlineSpread, bars: BarsSpread, photo: PhotoSpread,
};

/** one printed spread; the sheet pushes in slowly over the scene */
export const Spread: React.FC<{ spec: Spec; t: number; dur: number }> = ({ spec, t, dur }) => {
  if (spec.layout === "compose" && spec.pieces?.length) return <Compose pieces={spec.pieces} t={t} dur={dur} seed={spec.seed} />;
  const L = (spec.layout === "photo" && !spec.photo) || (spec.layout === "grid" && !spec.grid) ? HeadlineSpread : LAYOUTS[spec.layout] ?? HeadlineSpread;
  const push = 1 + 0.025 * Math.min(1, Math.max(0, t) / Math.max(1, dur));
  return <AbsoluteFill style={{ transform: `scale(${push})` }}><L s={spec} t={t} dur={dur} /></AbsoluteFill>;
};
