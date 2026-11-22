/* LAYER 2, part H: BLOCKS of INDIAN FOLK ART: Madhubani (Mithila) painting, truck art, Mughal miniature and kolam, each
   drawn the way the art is made: Madhubani is outlined twice in black ink and then filled flat, its gaps never left bare;
   a truck's back is lettered and scalloped; a miniature sets its court under a cusped arch; a kolam is dots first, then
   one line looping round them. Their colours are the film's own (theme ink, accent, accent2), so they sit in any look,
   and in their own look (looks.py madhubani, truckart, mughal, kolam) they are the art itself. */

import type { CSSProperties, ReactNode } from "react";
import { clamp01, family, useScene } from "../kit";
import { ease, rand } from "./motion";
import { block } from "./parts";

/** the folk palette from the film's theme: ink, then red, blue, yellow, green (the last two fixed earth colours) */
const useFolk = () => {
  const { t, theme } = useScene();
  return { t, ink: theme.ink, paper: theme.paper, red: theme.accent, blue: theme.accent2, yellow: "#e8a21e", green: "#1f6a4a", font: theme.display || theme.font };
};
/** a line drawn on from at to at + dur (svg pathLength 1) */
const drawOn = (t: number, at: number, dur = 1) => ({ pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - ease.out((t - at) / dur) });
const fillOn = (t: number, at: number) => ({ fillOpacity: clamp01((t - at) / 0.5) });
const show = (t: number, at: number, dur = 0.3) => clamp01((t - at) / dur);

/* ================= MADHUBANI: Mithila painting from Bihar ================= */
/** a Madhubani (Mithila) fish, outlined twice in black ink, then filled flat with scales and a big eye; two make a pair for luck and fertility (Chhath, weddings, Bihar, folk tales) */
function MadhubaniFishView({ size = 420, at = 0, color, flip = false }: { size?: number; at?: number; color?: string; flip?: boolean }) {
  const f = useFolk(), t = f.t, c = color ?? f.blue;
  const line = (a: number, w = 5) => ({ stroke: f.ink, strokeWidth: w, ...drawOn(t, at + a, 1.1) });
  return <svg width={size} height={(size * 220) / 420} viewBox="-20 -110 420 220" style={{ overflow: "visible" }}>
    <g transform={flip ? "translate(380 0) scale(-1 1)" : undefined}>
      <path d="M0,0 C70,-95 230,-95 300,0 C230,95 70,95 0,0 Z" fill={c} style={fillOn(t, at + 1)} {...line(0)} />
      <path d="M14,0 C78,-78 222,-78 286,0 C222,78 78,78 14,0 Z" fill="none" {...line(0.2, 2.5)} />
      <path d="M300,0 L370,-60 L360,0 L370,60 Z" fill={f.yellow} style={fillOn(t, at + 1)} {...line(0.3)} />
      {[60, 100, 140, 180, 220].map((x) => <path key={x} d={`M${x},-55 Q${x + 30},0 ${x},55`} fill="none" {...line(0.5, 3)} />)}
      <circle cx={44} cy={-10} r={13} fill="#fff" {...line(0.4, 3)} /><circle cx={44} cy={-10} r={5} fill={f.ink} opacity={show(t, at + 0.6)} />
    </g>
  </svg>;
}
export const MadhubaniFish = block("MadhubaniFish", MadhubaniFishView);

/** the Madhubani sun god with a smiling face and sixteen painted rays (Surya: Chhath Puja, Makar Sankranti, morning, life, energy) */
function MadhubaniSunView({ size = 420, at = 0 }: { size?: number; at?: number }) {
  const f = useFolk(), t = f.t;
  const line = (a: number, w = 5) => ({ stroke: f.ink, strokeWidth: w, ...drawOn(t, at + a, 1.1) });
  return <svg width={size} height={size} viewBox="-210 -210 420 420" style={{ overflow: "visible" }}>
    {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2;
      return <path key={i} d={`M${130 * Math.cos(a)},${130 * Math.sin(a)} L${200 * Math.cos(a - 0.12)},${200 * Math.sin(a - 0.12)} L${200 * Math.cos(a + 0.12)},${200 * Math.sin(a + 0.12)} Z`}
        fill={i % 2 ? f.red : f.yellow} style={fillOn(t, at + 0.7 + i * 0.03)} {...line(0.1 + i * 0.03, 3)} />; })}
    <circle r={125} fill={f.yellow} style={fillOn(t, at + 0.9)} {...line(0)} /><circle r={108} fill="none" {...line(0.2, 2.5)} />
    <path d="M-46,-24 q16,-16 32,0 M14,-24 q16,-16 32,0" fill="none" {...line(0.7, 4)} />
    <circle cx={-30} cy={-12} r={7} fill={f.ink} opacity={show(t, at + 1)} /><circle cx={30} cy={-12} r={7} fill={f.ink} opacity={show(t, at + 1)} />
    <path d="M-40,40 Q0,70 40,40" fill={f.red} {...line(0.8, 4)} />
  </svg>;
}
export const MadhubaniSun = block("MadhubaniSun", MadhubaniSunView);

/** a Madhubani peacock with its tail fanned, each feather an eye, painted in flat blue and green (love, beauty, a wedding, Krishna, monsoon) */
function MadhubaniPeacockView({ size = 520, at = 0 }: { size?: number; at?: number }) {
  const f = useFolk(), t = f.t;
  const line = (a: number, w = 4) => ({ stroke: f.ink, strokeWidth: w, ...drawOn(t, at + a, 1.1) });
  return <svg width={size} height={(size * 640) / 520} viewBox="-340 -340 520 640" style={{ overflow: "visible" }}>
    {Array.from({ length: 7 }, (_, i) => <g key={i} transform={`rotate(${-150 + i * 20})`}>
      <path d="M0,0 L0,-250" fill="none" {...line(0.1 + i * 0.08, 3)} />
      <ellipse cx={0} cy={-275} rx={34} ry={46} fill={f.green} style={fillOn(t, at + 0.9 + i * 0.05)} {...line(0.3 + i * 0.08)} />
      <circle cx={0} cy={-280} r={13} fill={f.blue} style={fillOn(t, at + 1.1 + i * 0.05)} {...line(0.6 + i * 0.08, 3)} />
    </g>)}
    <path d="M-60,40 C-90,-60 40,-80 60,20 C70,90 -20,130 -60,40 Z" fill={f.blue} style={fillOn(t, at + 0.7)} {...line(0, 5)} />
    <path d="M40,-20 C70,-90 60,-150 100,-170" fill="none" stroke={f.blue} strokeWidth={18} {...drawOn(t, at + 0.2, 1.1)} />
    <path d="M40,-20 C70,-90 60,-150 100,-170" fill="none" {...line(0.2)} />
    <circle cx={108} cy={-180} r={22} fill={f.blue} style={fillOn(t, at + 0.8)} {...line(0.4, 5)} />
    <path d="M128,-176 L160,-168 L128,-160" fill={f.yellow} {...line(0.5, 3)} />
    {[-12, 0, 12].map((x) => <path key={x} d={`M${104 + x},-200 L${110 + x * 1.6},-240`} {...line(0.6, 3)} />)}
    <path d="M-20,120 L-30,190 M20,120 L30,190" {...line(0.7, 5)} />
  </svg>;
}
export const MadhubaniPeacock = block("MadhubaniPeacock", MadhubaniPeacockView);

/** a Madhubani painted border: a double black line drawn round, the band between hatched in red and black, a flower at each corner; what is inside is the painting (frame any Indian folk scene, a festival greeting) */
function PaintedBorderView({ w = 1300, h = 740, at = 0, band = 36, children }: { w?: number; h?: number; at?: number; band?: number; children?: ReactNode }) {
  const f = useFolk(), t = f.t, B = band, id = `pb-${w}-${h}-${B}`;
  const ring = `M0,0 h${w} v${h} h${-w} Z M${B},${B} v${h - 2 * B} h${w - 2 * B} v${-(h - 2 * B)} Z`;
  const hatch = Array.from({ length: Math.ceil((w + h) / 16) }, (_, i) => i * 16);
  return <div style={{ position: "relative", width: w, height: h, background: f.paper, borderRadius: 6 }}>
    <div style={{ position: "absolute", inset: B + 8, overflow: "hidden" }}>{children}</div>
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
      <defs><clipPath id={id}><path d={ring} clipRule="evenodd" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>{hatch.map((o, i) =>
        <line key={i} x1={o} y1={0} x2={o - h} y2={h} stroke={i % 3 === 0 ? f.red : f.ink} strokeWidth={4} opacity={show(t, at + 0.9 + i * 0.006, 0.15)} />)}</g>
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={f.ink} strokeWidth={7} {...drawOn(t, at + 0.1, 1.3)} />
      <rect x={B} y={B} width={w - 2 * B} height={h - 2 * B} fill="none" stroke={f.ink} strokeWidth={6} {...drawOn(t, at + 0.3, 1.3)} />
      {[[B, B], [w - B, B], [B, h - B], [w - B, h - B]].map(([cx, cy], i) => <g key={i} transform={`translate(${cx} ${cy})`}>
        {Array.from({ length: 8 }, (_, j) => <ellipse key={j} cx={0} cy={-20} rx={9} ry={20} transform={`rotate(${j * 45})`} fill={j % 2 ? f.yellow : f.red} stroke={f.ink} strokeWidth={2.5} opacity={show(t, at + 1.2 + i * 0.1)} />)}
        <circle r={8} fill={f.blue} stroke={f.ink} strokeWidth={2} opacity={show(t, at + 1.4)} /></g>)}
    </svg>
  </div>;
}
export const PaintedBorder = block("PaintedBorder", PaintedBorderView);

/** a mud-plastered village wall with a floor at its foot, the ground Madhubani is painted on; put a <PaintedBorder> and the motifs on it (a home in Mithila, a wedding chamber, a village in Bihar) */
function PaintedWallView({ w = 1920, h = 1080, floor = 80, children }: { w?: number; h?: number; floor?: number; children?: ReactNode }) {
  return <div style={{ position: "relative", width: w, height: h, overflow: "hidden", background: "radial-gradient(ellipse at 45% 40%, #dcb77c, #b0844a 75%, #8f6636)" }}>
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>{Array.from({ length: 40 }, (_, i) =>
      <ellipse key={i} cx={rand(i) * w} cy={rand(i + 50) * (h - floor)} rx={30 + rand(i + 9) * 90} ry={14 + rand(i + 3) * 30} fill={i % 2 ? "#fff" : "#5a3a1a"} opacity={0.05} />)}</svg>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: floor, background: "#6e4a26" }} />
    {children}
  </div>;
}
export const PaintedWall = block("PaintedWall", PaintedWallView);

/* ================= TRUCK ART: the painted trucks of India's highways ================= */
/** an Indian goods truck painted all over (a crown over the cab, a scalloped trim, flower panels), driving in with its wheels turning (highways, transport, a road trip, truck art) */
function PaintedTruckView({ size = 830, at = 0, from = 0, to = 0, dur = 2.2 }: { size?: number; at?: number; from?: number; to?: number; dur?: number }) {
  const f = useFolk(), t = f.t, cs = [f.red, f.green, f.blue, f.yellow], ink = f.ink, spin = (t - at) * 720;
  const x = from + (to - from) * ease.out((t - at) / dur);
  const wheel = (cx: number) => <g key={cx} transform={`translate(${cx} 380)`}><circle r={56} fill="#222" stroke={ink} strokeWidth={4} /><circle r={24} fill="#bbb" />
    <g transform={`rotate(${spin})`}>{[0, 60, 120].map((a) => <rect key={a} x={-3} y={-22} width={6} height={44} fill="#555" transform={`rotate(${a})`} />)}</g></g>;
  return <svg width={size} height={(size * 460) / 840} viewBox="0 0 840 460" style={{ overflow: "visible", transform: `translate(${x}px, ${Math.sin(t * 22) * 2}px)` }}>
    <rect x={0} y={330} width={830} height={26} fill="#333" />
    <rect x={0} y={60} width={560} height={280} rx={8} fill={cs[3]} stroke={ink} strokeWidth={6} />
    {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${i * 40} 60 h40 v22 a20 20 0 0 1 -40 0 Z`} fill={cs[i % 3]} stroke={ink} strokeWidth={2.5} />)}
    {[0, 1, 2].map((i) => <g key={i}><rect x={24 + i * 176} y={110} width={160} height={200} rx={10} fill={cs[(i + 1) % 3]} stroke={ink} strokeWidth={4} />
      <g transform={`translate(${104 + i * 176} 210)`}>{Array.from({ length: 8 }, (_, j) => <ellipse key={j} cx={0} cy={-34} rx={14} ry={32} fill={j % 2 ? "#fff" : cs[3]} stroke={ink} strokeWidth={3} transform={`rotate(${j * 45})`} />)}
        <circle r={14} fill={cs[0]} stroke={ink} strokeWidth={3} /></g></g>)}
    <path d="M560,150 h170 l100,110 v80 h-270 Z" fill={cs[0]} stroke={ink} strokeWidth={6} />
    <path d="M598,168 h118 l70,78 h-188 Z" fill="#cfe8f4" stroke={ink} strokeWidth={4} />
    <path d="M556,150 L556,78 Q700,20 800,96 L742,150 Z" fill={cs[2]} stroke={ink} strokeWidth={5} />
    {[600, 650, 700, 745].map((cx, i) => <circle key={cx} cx={cx} cy={[104, 86, 84, 104][i]} r={8} fill="#fff" stroke={ink} strokeWidth={2} />)}
    <rect x={540} y={340} width={300} height={26} rx={6} fill={cs[1]} stroke={ink} strokeWidth={4} />
    {[110, 230, 700].map(wheel)}
  </svg>;
}
export const PaintedTruck = block("PaintedTruck", PaintedTruckView);

/** the painted back of an Indian truck filling the frame: scalloped trim, big watchful eyes, its lettering popping on ("HORN OK PLEASE"), a slogan ribbon, blinking lights and swinging chains (road safety, highways, street culture, desi humour) */
function TruckBackView({ w = 1920, h = 1080, at = 0, text = "HORN OK PLEASE", sub = "Buri nazar wale, tera muh kala" }: { w?: number; h?: number; at?: number; text?: string; sub?: string }) {
  const f = useFolk(), t = f.t, cs = [f.red, f.green, f.blue, f.yellow], ink = f.ink, look = Math.sin(t * 2.2) * 26, s = w / 1920;
  const pop = (a: number): CSSProperties => ({ display: "inline-block", transform: `scale(${t > at + a ? ease.back((t - at - a) / 0.45) : 0})` });
  const words = text.split(" ");
  return <div style={{ position: "relative", width: w, height: h, overflow: "hidden", background: cs[1] }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: "0 0" }}>
      {[0, 1830].map((x) => <div key={x} style={{ position: "absolute", left: x, top: 0, width: 90, height: 1080, borderLeft: `6px solid ${ink}`, borderRight: `6px solid ${ink}`, boxSizing: "border-box",
        background: `repeating-linear-gradient(45deg, ${cs[0]} 0 30px, #fff 30px 60px)`, backgroundPosition: `0 ${t * 80}px` }} />)}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 29 }, (_, i) => <path key={i} d={`M${90 + i * 60} 0 h60 v40 a30 30 0 0 1 -60 0 Z`} fill={cs[(i + 2) % 4]} stroke={ink} strokeWidth={3} />)}
        {[640, 1280].map((x, i) => <g key={x} transform={`translate(${x} 300) scale(${clamp01((t - at - 0.2 - i * 0.15) / 0.3)})`}>
          <path d="M-200,0 Q0,-150 200,0 Q0,150 -200,0 Z" fill="#fff" stroke={ink} strokeWidth={8} />
          <circle cx={look} r={66} fill={cs[2]} stroke={ink} strokeWidth={5} /><circle cx={look} r={28} fill={ink} /><circle cx={look + 14} cy={-14} r={9} fill="#fff" />
          <path d="M-220,-60 Q0,-210 220,-60" fill="none" stroke={ink} strokeWidth={12} strokeLinecap="round" /></g>)}
        {[230, 1690].map((x) => <circle key={x} cx={x} cy={880} r={70} fill={Math.sin(t * 6) > 0 ? "#ff3a2e" : "#8a1a14"} stroke={ink} strokeWidth={6} />)}
        {[700, 960, 1220].map((x, i) => <g key={x} transform={`translate(${x} 1000) rotate(${Math.sin(t * 3 + i) * 14})`}>
          {Array.from({ length: 4 }, (_, j) => <ellipse key={j} cx={0} cy={j * 22} rx={8} ry={12} fill="none" stroke="#d8d0c0" strokeWidth={5} />)}</g>)}
      </svg>
      <div style={{ position: "absolute", left: 90, right: 90, top: 470, textAlign: "center", fontFamily: family(f.font), fontSize: 148, lineHeight: 1, color: "#fff", WebkitTextStroke: `8px ${ink}`, paintOrder: "stroke" }}>
        {words.map((wd, i) => <span key={i}><span style={pop(0.6 + i * 0.25)}>{wd}</span>{i < words.length - 1 ? " " : ""}</span>)}</div>
      {sub && <div style={{ position: "absolute", left: 460, right: 460, top: 690, padding: "10px 0", background: cs[3], border: `5px solid ${ink}`, borderRadius: 40, textAlign: "center",
        fontFamily: family(f.font), fontWeight: 800, fontSize: 44, color: ink, ...pop(0.6 + words.length * 0.25 + 0.3), display: "block" }}>{sub}</div>}
    </div>
  </div>;
}
export const TruckBack = block("TruckBack", TruckBackView);

/* ================= MUGHAL MINIATURE: the court painting of the Mughal empire ================= */
/** a Mughal miniature's frame: gold rules, a cusped arch drawn on, cypress trees either side and a gold floor; put the court (emperor, rani, courtiers) inside (Mughal history, Akbar, the Taj Mahal, royal stories) */
function MughalArchView({ w = 1040, h = 920, at = 0, children }: { w?: number; h?: number; at?: number; children?: ReactNode }) {
  const f = useFolk(), t = f.t, gold = "#b8862a", lapis = f.blue, k = ease.out((t - at) / 1.2);
  const ax = w * 0.115, aw = w - 2 * ax, top = h * 0.065, cx = w / 2;
  const arch = `M${ax},${h * 0.95} L${ax},${h * 0.43} Q${ax},${h * 0.29} ${ax + aw * 0.11},${h * 0.22} Q${ax + aw * 0.25},${h * 0.12} ${cx},${top} Q${w - ax - aw * 0.25},${h * 0.12} ${w - ax - aw * 0.11},${h * 0.22} Q${w - ax},${h * 0.29} ${w - ax},${h * 0.43} L${w - ax},${h * 0.95} Z`;
  return <div style={{ position: "relative", width: w, height: h }}>
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={gold} strokeWidth={16} {...drawOn(t, at, 1)} />
      <rect x={30} y={30} width={w - 60} height={h - 60} fill="none" stroke={lapis} strokeWidth={5} {...drawOn(t, at + 0.2, 1)} />
      <path d={arch} fill="#e8dcc0" fillOpacity={0.35 * k} stroke={gold} strokeWidth={10} {...drawOn(t, at + 0.3, 1.2)} />
      {Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (i / 12);
        return <circle key={i} cx={cx - Math.cos(a) * aw * 0.47} cy={h * 0.45 - Math.sin(a) * h * 0.36} r={20} fill="none" stroke={gold} strokeWidth={5} opacity={show(t, at + 0.9 + i * 0.05)} />; })}
      {[ax + 60, w - ax - 60].map((x) => <g key={x} opacity={show(t, at + 1.3, 0.6)}><ellipse cx={x} cy={h * 0.76} rx={34} ry={130} fill="#2f5a3a" /><rect x={x - 5} y={h * 0.89} width={10} height={60} fill="#5a3a1a" /></g>)}
      <rect x={ax} y={h * 0.91} width={aw} height={40} fill={gold} opacity={0.7 * k} />
    </svg>
    <div style={{ position: "absolute", left: ax, right: ax, top: top, bottom: h * 0.06 }}>{children}</div>
  </div>;
}
export const MughalArch = block("MughalArch", MughalArchView);

/* ================= KOLAM: the rice-flour pattern drawn at the door at dawn ================= */
/** a kolam (rangoli) drawn the way it is made at dawn: a grid of dots appears, one white line loops round them, then the loops fill with colour and petals bloom at the four tips (Pongal, Diwali, Onam, festivals, maths in art) */
function KolamView({ size = 760, at = 0, grid = 7 }: { size?: number; at?: number; grid?: number }) {
  const f = useFolk(), t = f.t - at, N = Math.floor(grid / 2), S = size / (grid * 1.414 + 2.2), R = (N + 0.75) * S * 1.414 - S * 0.5;
  const cells: [number, number][] = [];
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) cells.push([i, j]);
  cells.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  const line = f.ink, cols = [f.yellow, f.red, "#7ad0e0"];  // the ink: white rice flour on a dark floor, dark on a light one
  const per = Math.min(0.055, 2.6 / cells.length), done = 1.6 + cells.length * per;
  return <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{ overflow: "visible" }}>
    <g transform="rotate(45)">
      {cells.map(([i, j], n) => <rect key={`c${n}`} x={i * S - S * 0.42} y={j * S - S * 0.42} width={S * 0.84} height={S * 0.84} rx={S * 0.32}
        fill={cols[(Math.abs(i) + Math.abs(j)) % 3]} style={{ fillOpacity: 0.85 * show(t, done + 0.5 + n * 0.02, 0.4) }} stroke={line} strokeWidth={S * 0.08} {...drawOn(t, 1.6 + n * per, 0.45)} />)}
      <rect x={-N * S - S * 0.75} y={-N * S - S * 0.75} width={(2 * N + 1.5) * S} height={(2 * N + 1.5) * S} rx={S * 1.2} fill="none" stroke={line} strokeWidth={S * 0.08} {...drawOn(t, done, 0.8)} />
      {[0, 90, 180, 270].map((r) => <path key={r} transform={`rotate(${r - 45})`} d={`M${-S * 0.6},${-R} C${-S},${-R - S * 1.4} ${S},${-R - S * 1.4} ${S * 0.6},${-R}`}
        fill={f.red} style={{ fillOpacity: show(t, done + 1.1, 0.4) }} stroke={line} strokeWidth={S * 0.08} {...drawOn(t, done + 0.5, 0.5)} />)}
      {cells.map(([i, j], n) => <circle key={`d${n}`} cx={i * S} cy={j * S} r={S * 0.1} fill={line} opacity={show(t, 0.1 + n * (1.4 / cells.length), 0.15)} />)}
    </g>
  </svg>;
}
export const Kolam = block("Kolam", KolamView);
