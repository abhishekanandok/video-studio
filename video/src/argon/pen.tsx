/* THE PEN: what a drawing is (its geometry) is the drawing's; how it is inked is the look's. Every drawing in a film
   (a library piece, a scene the writer draws, a person) draws its shapes with <Shape> and <Line>, and the film's look
   (looks.py PEN, carried in the DNA) decides the ink: Madhubani outlines twice with kachni lines inside, a woodcut
   gouges its edge, chalk breaks up, clay is lit from the top left, neon glows. So one drawing comes out in every look.

   <Shape d="M ..." fill={0} />   a filled shape; fill is a colour, or 0-3 for the look's inks, "ink" or "paper"
   <Line d="M ..." />              one stroke (a mouth, a fold, a hair line), in the look's way
   usePen()                        the pen and the look's colours, for anything custom */
import { useContext, type CSSProperties } from "react";
import { useScene } from "./kit";
import { Ctx, type Pen } from "../print/dna";

const PLAIN: Pen = { outline: "single", w: 5, fill: "flat", pattern: "", wobble: 0 };

/** the film's pen and the colours it inks with (a print film's DNA; otherwise the theme) */
export function usePen() {
  const dna = useContext(Ctx);
  const { theme } = useScene();
  const pen = dna?.pen ?? PLAIN;
  const inks = dna?.inks ?? [theme.accent, theme.accent2, theme.muted, theme.ink];
  return { pen, ink: dna?.ink ?? theme.ink, paper: dna?.paper ?? theme.bg?.[0] ?? "#f4efe4", inks, dark: Boolean(dna?.dark) };
}

type Colour = string | number | "ink" | "paper";
const colourOf = (c: Colour | undefined, p: ReturnType<typeof usePen>) =>
  c === undefined ? p.inks[0] : typeof c === "number" ? p.inks[c % p.inks.length] : c === "ink" ? p.ink : c === "paper" ? p.paper : c;
const key = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");

/** a hex colour made darker (k < 1) or lighter (k > 1) */
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return hex;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
};

/** the filters and patterns a pen uses, each with an id made from what it is, so a frame defines each once however many shapes use it */
function Defs({ pen, ink, paper, fill }: { pen: Pen; ink: string; paper: string; fill: string }) {
  const wob = Math.max(pen.wobble, pen.outline === "carved" ? 0.5 : pen.outline === "chalk" ? 0.35 : pen.outline === "rough" ? 0.4 : 0);
  return (
    <defs>
      {wob > 0 && <filter id={`pen-wob-${Math.round(wob * 10)}`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency={pen.outline === "carved" ? 0.09 : 0.03} numOctaves={2} seed={4} />
        <feDisplacementMap in="SourceGraphic" scale={2 + wob * 10} xChannelSelector="R" yChannelSelector="G" />
      </filter>}
      {pen.outline === "chalk" && <filter id="pen-chalk" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={7} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6" result="holes" />
        <feComposite in="SourceGraphic" in2="holes" operator="in" />
      </filter>}
      {pen.outline === "glow" && <filter id="pen-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={6} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>}
      {pen.outline === "cut" && <filter id="pen-cut" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx={5} dy={8} stdDeviation={5} floodColor="#000" floodOpacity={0.28} />
      </filter>}
      {pen.fill === "wash" && <filter id="pen-wash" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency={0.02} numOctaves={3} seed={2} />
        <feDisplacementMap in="SourceGraphic" scale={9} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation={1.2} />
      </filter>}
      {pen.fill === "soft" && <radialGradient id={`pen-soft-${key(fill)}`} cx="30%" cy="25%" r="85%">
        <stop offset="0%" stopColor={shade(fill, 1.35)} /><stop offset="55%" stopColor={fill} /><stop offset="100%" stopColor={shade(fill, 0.62)} />
      </radialGradient>}
      {pen.fill === "hatch" && <pattern id={`pen-hatch-${key(fill)}`} width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1={0} y1={0} x2={0} y2={14} stroke={fill} strokeWidth={5} />
      </pattern>}
      {pen.pattern === "kachni" && <pattern id={`pen-kachni-${key(ink)}`} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <line x1={0} y1={0} x2={0} y2={12} stroke={ink} strokeWidth={1.6} opacity={0.55} />
      </pattern>}
      {pen.pattern === "dots" && <pattern id={`pen-dots-${key(ink)}`} width={16} height={16} patternUnits="userSpaceOnUse">
        <circle cx={8} cy={8} r={2.2} fill={ink} opacity={0.5} />
      </pattern>}
      {pen.pattern === "scales" && <pattern id={`pen-scales-${key(ink)}`} width={24} height={14} patternUnits="userSpaceOnUse">
        <path d="M 0 14 Q 12 0 24 14" fill="none" stroke={ink} strokeWidth={1.6} opacity={0.5} />
      </pattern>}
      {pen.pattern === "gouge" && <pattern id={`pen-gouge-${key(paper)}`} width={34} height={22} patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
        <path d="M 2 11 Q 17 4 32 11" fill="none" stroke={paper} strokeWidth={2.4} strokeLinecap="round" opacity={0.85} />
      </pattern>}
    </defs>
  );
}

/** the stroke a pen draws: its colour, width and filter */
function strokeOf(pen: Pen, ink: string, fill: string, w?: number) {
  const width = w ?? pen.w;
  const wob = Math.max(pen.wobble, pen.outline === "carved" ? 0.5 : pen.outline === "chalk" ? 0.35 : pen.outline === "rough" ? 0.4 : 0);
  const filter = pen.outline === "chalk" ? "url(#pen-chalk)" : pen.outline === "glow" ? "url(#pen-glow)" : wob > 0 ? `url(#pen-wob-${Math.round(wob * 10)})` : undefined;
  const colour = pen.outline === "tone" ? shade(fill, 0.55) : pen.outline === "glow" ? fill : pen.outline === "cut" ? "#ffffff" : ink;
  return { stroke: colour, strokeWidth: width, filter };
}

/** a filled shape, inked the film's way */
export function Shape({ d, fill, style, w }: { d: string; fill?: Colour; style?: CSSProperties; w?: number }) {
  const p = usePen(), { pen } = p, colour = colourOf(fill, p);
  const s = strokeOf(pen, p.ink, colour, w);
  const outline = pen.outline !== "none" && s.strokeWidth > 0;
  const body = pen.fill === "none" ? "none" : pen.fill === "soft" ? `url(#pen-soft-${key(colour)})` : colour;
  return (
    <g style={style}>
      <Defs pen={pen} ink={p.ink} paper={p.paper} fill={colour} />
      <g filter={pen.outline === "cut" ? "url(#pen-cut)" : undefined}>
        {pen.fill === "hatch" ? <>
          <path d={d} fill={colour} opacity={0.25} />
          <path d={d} fill={`url(#pen-hatch-${key(colour)})`} />
        </> : <path d={d} fill={body} filter={pen.fill === "wash" ? "url(#pen-wash)" : undefined} opacity={pen.fill === "wash" ? 0.85 : 1} />}
        {pen.pattern && pen.fill !== "none" && <path d={d} fill={`url(#pen-${pen.pattern}-${key(pen.pattern === "gouge" ? p.paper : p.ink)})`} />}
        {outline && <path d={d} fill="none" stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinejoin="round" strokeLinecap="round" filter={s.filter} />}
        {outline && pen.outline === "double" && <path d={d} fill="none" stroke={p.paper} strokeWidth={s.strokeWidth * 0.36} strokeLinejoin="round" strokeLinecap="round" />}
        {pen.outline === "glow" && <path d={d} fill="none" stroke="#ffffff" strokeWidth={Math.max(1.5, s.strokeWidth * 0.35)} strokeLinejoin="round" />}
      </g>
    </g>
  );
}

/** one stroke, inked the film's way (an open path: a mouth, a fold, a line of hatching) */
export function Line({ d, colour, w }: { d: string; colour?: Colour; w?: number }) {
  const p = usePen(), { pen } = p;
  const c = colour === undefined ? (pen.outline === "glow" ? p.inks[0] : p.ink) : colourOf(colour, p);
  const s = strokeOf(pen.outline === "double" || pen.outline === "tone" || pen.outline === "cut" || pen.outline === "none" ? { ...pen, outline: "single" } : pen, c, c, w ?? Math.max(2, pen.w * 0.45));
  return (
    <g>
      <Defs pen={pen} ink={p.ink} paper={p.paper} fill={c} />
      <path d={d} fill="none" stroke={c} strokeWidth={s.strokeWidth} strokeLinecap="round" strokeLinejoin="round" filter={s.filter} />
    </g>
  );
}

/** a circle, as a Shape */
export const Circle = ({ cx = 0, cy = 0, r, fill }: { cx?: number; cy?: number; r: number; fill?: Colour }) => (
  <Shape d={`M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`} fill={fill} />
);
/** a box, as a Shape */
export const Box = ({ x = 0, y = 0, w, h, fill }: { x?: number; y?: number; w: number; h: number; fill?: Colour }) => (
  <Shape d={`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`} fill={fill} />
);
