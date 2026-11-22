/* LAYER 1, part E: CARDS. A box for a title, a line of text or any drawing, in one of 1,536 designs built from four
   parts, painted in the film's inks, with text that shrinks to fit so it never runs out of its box:
     design = shape.frame.fill.head      e.g. "ticket.double.tint.band", "hex.offset.accent.plain", "rect.rule.paper.plain"
   CARD_IDS lists them all; cardFor(box, seed) picks a design that fits a look's box style (video/looks.py BOX), and a
   <Card> with no design does that by itself, so the same card reads as a ruled print box in one film and glass in another. */
import { useId, type CSSProperties, type ReactNode } from "react";
import { family, useScene } from "../kit";
import { motionStyle } from "./motion-d";
import { rand } from "./motion";
import { block } from "./parts";

/* ================= CARDS: the parts ================= */
export const CARD_SHAPES = ["rect", "rounded", "pill", "chamfer", "notch", "ticket", "tab", "speech", "hex", "arrow", "torn", "scallop", "badge", "cut", "leaf", "blob"] as const;
export const CARD_FRAMES = ["outline", "solid", "double", "dashed", "offset", "glass", "inset", "ribbon", "sidebar", "ticks", "rule", "lifted"] as const;
export const CARD_FILLS = ["paper", "tint", "accent", "ink"] as const;
export const CARD_HEADS = ["plain", "band"] as const;
type Shape = (typeof CARD_SHAPES)[number];
type Frame = (typeof CARD_FRAMES)[number];

/** every card design, by name */
export const CARD_IDS: string[] = CARD_SHAPES.flatMap((s) => CARD_FRAMES.flatMap((f) => CARD_FILLS.flatMap((c) => CARD_HEADS.map((h) => `${s}.${f}.${c}.${h}`))));

/** a rounded rectangle with its own radius at each corner (top-left, top-right, bottom-right, bottom-left) */
function rr(w: number, h: number, [a, b, c, d]: number[]) {
  return `M${a} 0 H${w - b}${b ? ` A${b} ${b} 0 0 1 ${w} ${b}` : ""} V${h - c}${c ? ` A${c} ${c} 0 0 1 ${w - c} ${h}` : ""} H${d}${d ? ` A${d} ${d} 0 0 1 0 ${h - d}` : ""} V${a}${a ? ` A${a} ${a} 0 0 1 ${a} 0` : ""} Z`;
}
/** the outline of a shape at w × h, and how far its content keeps in from each side (top, right, bottom, left) */
function outline(s: Shape, w: number, h: number, seed: number): { d: string; pad: [number, number, number, number] } {
  const r = Math.min(28, h / 4);
  switch (s) {
    case "rect": return { d: rr(w, h, [0, 0, 0, 0]), pad: [0, 0, 0, 0] };
    case "rounded": return { d: rr(w, h, [r, r, r, r]), pad: [0, 0, 0, 0] };
    case "pill": { const p = Math.min(h / 2, w / 2); return { d: rr(w, h, [p, p, p, p]), pad: [0, p * 0.45, 0, p * 0.45] }; }
    case "chamfer": { const c = Math.min(26, h / 4); return { d: `M${c} 0 H${w - c} L${w} ${c} V${h - c} L${w - c} ${h} H${c} L0 ${h - c} V${c} Z`, pad: [0, 0, 0, 0] }; }
    case "notch": return { d: `M${r} 0 H${w - r} A${r} ${r} 0 0 0 ${w} ${r} V${h - r} A${r} ${r} 0 0 0 ${w - r} ${h} H${r} A${r} ${r} 0 0 0 0 ${h - r} V${r} A${r} ${r} 0 0 0 ${r} 0 Z`, pad: [0, 0, 0, 0] };
    case "ticket": { const b = Math.min(22, h / 6); return { d: `M0 0 H${w} V${h / 2 - b} A${b} ${b} 0 0 0 ${w} ${h / 2 + b} V${h} H0 V${h / 2 + b} A${b} ${b} 0 0 0 0 ${h / 2 - b} Z`, pad: [0, b, 0, b] }; }
    case "tab": { const T = Math.min(44, h * 0.2), tw = Math.min(w * 0.4, 280); return { d: `M0 8 Q0 0 8 0 H${tw - 8} L${tw + T * 0.8} ${T} H${w} V${h} H0 Z`, pad: [T, 0, 0, 0] }; }
    case "speech": { const hb = h - 34, tx = w * 0.18; return { d: `M${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w} ${r} V${hb - r} A${r} ${r} 0 0 1 ${w - r} ${hb} H${tx + 44} L${tx + 4} ${h} L${tx + 14} ${hb} H${r} A${r} ${r} 0 0 1 0 ${hb - r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`, pad: [0, 0, 34, 0] }; }
    case "hex": { const i = Math.min(h * 0.3, 44); return { d: `M${i} 0 H${w - i} L${w} ${h / 2} L${w - i} ${h} H${i} L0 ${h / 2} Z`, pad: [0, i * 0.7, 0, i * 0.7] }; }
    case "arrow": { const a = Math.min(h * 0.45, 70); return { d: `M0 0 H${w - a} L${w} ${h / 2} L${w - a} ${h} H0 Z`, pad: [0, a * 0.8, 0, 0] }; }
    case "torn": {
      const pts: string[] = [];
      for (let x = w, i = 0; x > 0; x -= 22, i++) pts.push(`L${Math.max(0, x)} ${h - 4 - rand(seed * 31 + i) * 12}`);
      return { d: `M0 0 H${w} V${h - 6} ${pts.join(" ")} L0 ${h - 8} Z`, pad: [0, 0, 10, 0] };
    }
    case "scallop": {
      const n = Math.max(4, Math.round(w / 48)), st = w / n, b = st / 2;
      const top = Array.from({ length: n }, (_, i) => `A${b} ${b} 0 0 1 ${(i + 1) * st} ${b}`).join(" ");
      const bot = Array.from({ length: n }, (_, i) => `A${b} ${b} 0 0 1 ${w - (i + 1) * st} ${h - b}`).join(" ");
      return { d: `M0 ${b} ${top} V${h - b} ${bot} Z`, pad: [b, 0, b, 0] };
    }
    case "badge": return { d: `M0 ${h / 2} A${w / 2} ${h / 2} 0 1 1 ${w} ${h / 2} A${w / 2} ${h / 2} 0 1 1 0 ${h / 2} Z`, pad: [h * 0.12, w * 0.13, h * 0.12, w * 0.13] };
    case "cut": { const c = Math.min(h * 0.35, 64); return { d: `M0 0 H${w - c} L${w} ${c} V${h} H0 Z`, pad: [0, 0, 0, 0] }; }
    case "leaf": { const R = Math.min(56, h / 3); return { d: rr(w, h, [R, 0, R, 0]), pad: [0, 0, 0, 0] }; }
    case "blob": {
      const q = (i: number) => 24 + rand(seed * 17 + i) * 36, b = (i: number) => 6 + rand(seed * 23 + i) * 12;
      const [r0, r1, r2, r3] = [q(0), q(1), q(2), q(3)];
      return { d: `M${r0} 0 Q${w / 2} ${-b(0)} ${w - r1} 0 Q${w} 0 ${w} ${r1} Q${w + b(1)} ${h / 2} ${w} ${h - r2} Q${w} ${h} ${w - r2} ${h} Q${w / 2} ${h + b(2)} ${r3} ${h} Q0 ${h} 0 ${h - r3} Q${-b(3)} ${h / 2} 0 ${r0} Q0 0 ${r0} 0 Z`, pad: [0, 0, 0, 0] };
    }
  }
}

/** light or dark: a colour's luminance, from #rgb / #rrggbb (anything else counts as light) */
function dark(c: string) {
  const m = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}

/** how many lines a text wraps to at a size in a width, word by word, by an average glyph width (in ems) */
function wrap(s: string, size: number, width: number, glyph: number) {
  let n = 1, cur = 0;
  for (const w of s.split(/\s+/)) {
    const ww = w.length * size * glyph, sp = size * 0.28;
    if (cur && cur + sp + ww > width) { n++; cur = ww; } else cur += (cur ? sp : 0) + ww;
  }
  return n;
}

/** the frames that keep the page showing through (no fill): the fill part colours their lines and title instead */
const BARE: Frame[] = ["ticks", "rule"];

/* ================= CARDS ================= */
/** a box for a title and a line of text (or any children), in one of 1,536 designs: design = shape.frame.fill.head ("ticket.double.tint.band"); shapes rect rounded pill chamfer notch ticket tab speech hex arrow torn scallop badge cut leaf blob; frames outline solid double dashed offset glass inset ribbon sidebar ticks rule lifted; fills paper tint accent ink; heads plain band (the title in a coloured band). No design: one that fits the film's box style. Text shrinks to fit, never out of the box; motion is a grammar id (motion-d) */
function CardView({ design, w = 620, h = 300, at = 0, title, text, children, seed = 1, motion: motionProp, align = "left" }: { design?: string; w?: number; h?: number; at?: number; title?: string; text?: string; children?: ReactNode; seed?: number; motion?: string; align?: "left" | "center" }) {
  const { t, theme } = useScene();
  const uid = useId().replace(/:/g, "");
  const [s0, f0, c0, h0] = (design ?? theme.card ?? cardFor(theme.box, seed)).split(".");
  const motion = motionProp ?? theme.enter ?? "enter.rise.up.smooth";  // "" keeps a card still
  const shape = (CARD_SHAPES as readonly string[]).includes(s0) ? (s0 as Shape) : "rect";
  const frame = (CARD_FRAMES as readonly string[]).includes(f0) ? (f0 as Frame) : "outline";
  const fill = (CARD_FILLS as readonly string[]).includes(c0) ? c0 : "paper";
  const band = h0 === "band" && !!title;
  const bare = BARE.includes(frame);
  const tint = `color-mix(in srgb, ${theme.accent} 18%, ${theme.paper})`;
  const bg = bare ? "none" : fill === "tint" ? tint : fill === "accent" ? theme.accent : fill === "ink" ? theme.ink : theme.paper;
  const line = bare ? (fill === "tint" ? theme.accent2 : fill === "accent" ? theme.accent : theme.ink) : fill === "ink" ? theme.accent : fill === "accent" ? theme.ink : fill === "tint" ? theme.accent : theme.ink;
  const text0 = bare ? theme.ink : dark(bg) ? theme.paper : theme.ink;
  const bandC = fill === "ink" ? theme.accent : theme.ink;
  const onBand = dark(bandC) ? theme.paper : theme.ink;
  const titleC = bare && fill === "ink" ? theme.accent : bare ? line : text0;
  const { d, pad } = outline(shape, w, h, seed);
  const P = 30;
  const iw = w - pad[1] - pad[3] - 2 * P;
  // the sizes that fit: title and text shrink together, word-wrapped, until both sit inside the box
  const H = h - pad[0] - pad[2] - 2 * P;
  let ts = 0, xs = 0, bandH = 0;
  for (let k = 1; k >= 0.4; k -= 0.04) {
    ts = title ? Math.max(26, 64 * k) : 0;
    xs = text ? Math.max(26, 42 * k) : 0;
    const tL = title ? wrap(title, ts, iw, 0.56) : 0, xL = text ? wrap(text, xs, iw, 0.5) : 0;
    bandH = band ? tL * ts * 1.12 + 28 : 0;
    if ((band ? bandH - P + 14 : tL * ts * 1.12) + (title && text ? 14 : 0) + xL * xs * 1.3 <= H) break;
  }
  const clip = `clip-${uid}`;
  const cl = pad[3] + P + (frame === "sidebar" ? 10 : 0), ct = pad[0] + (band ? 14 : P) + (frame === "ribbon" && !band ? 10 : 0), cw = iw - (frame === "sidebar" ? 10 : 0);
  const tilt = frame === "lifted" ? (rand(seed * 7) - 0.5) * 2.4 : 0;
  const stroke = (extra: object = {}) => ({ fill: "none", stroke: line, strokeWidth: 4, strokeLinejoin: "round" as const, ...extra });
  const inner = <path d={d} transform={`translate(10 10) scale(${(w - 20) / w} ${(h - 20) / h})`} vectorEffect="non-scaling-stroke" {...stroke({ strokeWidth: 2 })} />;
  const L = Math.min(44, w / 5, h / 3);
  const svgStyle: CSSProperties = { position: "absolute", left: 0, top: 0, overflow: "visible", filter: frame === "lifted" ? "drop-shadow(0 16px 22px rgb(0 0 0 / 0.22))" : frame === "glass" ? "drop-shadow(0 18px 30px rgb(0 0 0 / 0.16))" : undefined };
  return (
    <div style={{ position: "relative", width: w, height: h, transform: tilt ? `rotate(${tilt}deg)` : undefined, ...motionStyle(motion, t, at) }}>
      {frame === "glass" && <div style={{ position: "absolute", inset: 0, clipPath: `path('${d}')`, backdropFilter: "blur(14px)" }} />}
      <svg width={w} height={h} style={svgStyle}>
        <defs>
          <clipPath id={clip}><path d={d} /></clipPath>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={0.55} /><stop offset="0.5" stopColor="#fff" stopOpacity={0} /></linearGradient>
        </defs>
        {frame === "offset" && <path d={d} transform="translate(12 12)" fill={line} />}
        {!bare && <path d={d} fill={bg} fillOpacity={frame === "glass" ? 0.55 : 1} />}
        {frame === "ribbon" && !band && <rect x={0} y={0} width={w} height={16} fill={theme.accent2} clipPath={`url(#${clip})`} />}
        {frame === "sidebar" && <rect x={0} y={0} width={18} height={h} fill={band ? theme.accent2 : theme.accent} clipPath={`url(#${clip})`} />}
        {frame === "glass" && <path d={d} fill={`url(#g-${uid})`} />}
        {(frame === "outline" || frame === "offset") && <path d={d} {...stroke(frame === "offset" ? { strokeWidth: 3 } : {})} />}
        {frame === "double" && <><path d={d} {...stroke({ strokeWidth: 3 })} />{inner}</>}
        {frame === "dashed" && <path d={d} {...stroke({ strokeDasharray: "16 10" })} />}
        {frame === "inset" && inner}
        {frame === "glass" && <path d={d} fill="none" stroke="rgb(255 255 255 / 0.85)" strokeWidth={2} />}
        {frame === "ticks" && <path d={`M0 ${L} V0 H${L} M${w - L} 0 H${w} V${L} M${w} ${h - L} V${h} H${w - L} M${L} ${h} H0 V${h - L}`} {...stroke({ strokeWidth: 5, strokeLinecap: "square" })} />}
        {frame === "rule" && <><line x1={0} y1={0} x2={w} y2={0} stroke={line} strokeWidth={4} /><line x1={0} y1={h} x2={w} y2={h} stroke={line} strokeWidth={1.5} /></>}
      </svg>
      {/* the band is the title's own background, cut to the card's shape, so it is always as tall as the title really is */}
      <div style={{ position: "absolute", inset: 0, clipPath: band ? `path('${d}')` : undefined }}>
      <div style={{ position: "absolute", left: cl, top: ct, width: cw, bottom: pad[2] + P, textAlign: align, display: "flex", flexDirection: "column", gap: 14 }}>
        {title && <div style={{ fontFamily: family(theme.display), fontSize: ts, lineHeight: 1.12, fontWeight: 700, color: band ? onBand : titleC, overflowWrap: "anywhere",
          ...(band ? { background: bandC, margin: `${-ct}px ${cl + cw - w}px 0 ${-cl}px`, padding: `${ct}px ${w - cl - cw}px 14px ${cl}px`, borderBottom: frame === "ribbon" ? `16px solid ${theme.accent2}` : undefined } : {}) }}>{title}</div>}
        {text && <div style={{ fontFamily: family(theme.font), fontSize: xs, lineHeight: 1.3, color: text0, marginTop: band ? 14 : 0, overflowWrap: "anywhere" }}>{text}</div>}
        {children}
      </div>
      </div>
    </div>
  );
}
export const Card = block("Card", CardView);

/* ================= CARDS: fitting a look ================= */
/** the shapes, frames, fills and heads that read as each look box style (video/looks.py BOX) */
const FITS: Record<string, [Shape[], Frame[], string[], string[]]> = {
  card: [["rect", "rounded", "cut", "leaf", "ticket", "notch"], ["lifted"], ["paper", "tint"], ["plain", "band"]],
  rule: [["rect"], ["rule"], ["paper", "tint", "accent"], ["plain"]],
  outline: [["rect", "chamfer", "cut", "notch", "ticket", "hex", "arrow"], ["outline", "double", "dashed"], ["paper", "tint"], ["plain", "band"]],
  sticky: [["rect", "cut"], ["lifted"], ["tint", "accent"], ["plain"]],
  glass: [["rounded", "pill", "leaf", "blob"], ["glass"], ["paper", "tint"], ["plain"]],
  strip: [["torn", "rect"], ["lifted"], ["paper", "tint"], ["plain"]],
  tab: [["tab"], ["outline", "ribbon", "sidebar"], ["paper", "tint"], ["band", "plain"]],
  bracket: [["rect"], ["ticks"], ["paper", "tint", "accent"], ["plain"]],
  solid: [["rect", "chamfer", "arrow", "pill", "hex"], ["solid", "offset"], ["accent", "ink"], ["plain", "band"]],
};
/** a card design that fits a look's box style, chosen by seed: cardFor("outline", 2) -> "chamfer.dashed.paper.plain" */
export function cardFor(box: string | undefined, seed = 0): string {
  const [ss, fs, cs, hs] = FITS[box ?? ""] ?? FITS.card;
  const p = (xs: string[], k: number) => xs[Math.floor(rand(seed * 13 + k) * xs.length) % xs.length];
  return `${p(ss, 1)}.${p(fs, 2)}.${p(cs, 3)}.${p(hs, 4)}`;
}
