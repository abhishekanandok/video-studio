/* A look's story: its showcase told as its own short film, not a shared template. Each look is shot the way its art
   is made and lived with, and says when to choose it inside that world (painted on the wall, on the truck's mudflaps,
   in the textbook's exercise). A story is its beats, each with its own length and the way it arrives; together they run
   SHOW frames (src/gallery/showcase-scenes.tsx), and a look with no story yet keeps the template there.
     madhubani  one shot: a border is painted, the motifs fill it, no gap is left, the camera pulls back to the wall
     truckart   a truck on the highway, its painted back, then its mudflaps
     mughal     a manuscript: a folio of script, a page turns to the court, then to the closing medallion
     kolam      one doorstep from 5:30 to sunrise: dots, one line around them, colour and diyas
     ncert      a textbook: chapter page, Fig. 7.1, then the exercise that asks when to use the look */
import React from "react";
import { AbsoluteFill } from "remotion";
import { At } from "../argon/kit";
import { appear, clamp01, fam, useDNA } from "../print/kit";
import { MadhubaniFish, MadhubaniPeacock, MadhubaniSun, PaintedTruck } from "../argon/lib/blocks-h";
import { draw, ease, fillIn, L, Mughal, P, type Sig } from "./signatures";

export type Beat = { len: number; enter: string; Body: Sig };

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const inOut = (x: number) => { const k = clamp01(x); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
/** a pop that overshoots and settles (truck lettering, stamps) */
const pop = (t: number, at: number) => { const k = clamp01((t - at) / 0.45); return k === 0 ? 0 : 1 + Math.sin(k * Math.PI) * 0.18 * (1 - k) + (ease(k) - 1); };

/** a camera over a 1920x1080 world: keys are [time, focus x, focus y, zoom], eased between */
const Cam: React.FC<{ t: number; keys: [number, number, number, number][]; children: React.ReactNode }> = ({ t, keys, children }) => {
  const i = keys.findIndex((k) => t < k[0]);
  const [, fx, fy, s] = i === 0 ? keys[0] : i < 0 ? keys[keys.length - 1]
    : (() => { const a = keys[i - 1], b = keys[i], k = inOut((t - a[0]) / (b[0] - a[0])); return [0, lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; })();
  return <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${960 - fx * s}px, ${540 - fy * s}px) scale(${s})` }}>{children}</div>;
};
const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) =>
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}>{children}</svg>;

/* ================= Madhubani: a wedding wall comes alive (one shot) ================= */
const MadhubaniWall: Sig = ({ t }) => {
  const d = useDNA(), ink = d.ink, [red, blue, yel, grn] = d.inks;
  const X = 200, Y = 110, W = 1300, H = 740, B = 36;  // the painting on the wall, and its border band
  const band = `M${X},${Y} h${W} v${H} h${-W} Z M${X + B},${Y + B} v${H - 2 * B} h${W - 2 * B} v${-(H - 2 * B)} Z`;
  const hatch = Array.from({ length: Math.ceil((W + H) / 16) }, (_, i) => i * 16);
  // the gaps between motifs, in the motif drawing's own 1920x1080: Madhubani leaves none of them bare
  const gaps: [number, number][] = [[120, 190], [330, 240], [640, 250], [640, 880], [1130, 860], [1200, 230], [380, 960], [120, 960], [1780, 960], [1780, 190], [1160, 690], [620, 140], [1000, 980], [1840, 560], [70, 600]];
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 45% 40%, #dcb77c, #b0844a 75%, #8f6636)" }}>
    <Cam t={t} keys={[[0, 330, 250, 2.5], [1.3, 330, 250, 2.5], [3.3, 850, 480, 1.45], [6.4, 850, 480, 1.45], [8, 960, 540, 1]]}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1000, bottom: 0, background: "#6e4a26" }} />
      <div style={{ position: "absolute", left: X, top: Y, width: W, height: H, background: d.paper, borderRadius: 6 }} />
      <Svg>
        <defs><clipPath id="mb-band"><path d={band} clipRule="evenodd" /></clipPath></defs>
        <g clipPath="url(#mb-band)">{hatch.map((o, i) =>
          <line key={i} x1={X + o} y1={Y} x2={X + o - H} y2={Y + H} stroke={i % 3 === 0 ? red : ink} strokeWidth={4} opacity={appear(t, 0.9 + i * 0.006, 0.15)} />)}</g>
        <rect x={X} y={Y} width={W} height={H} fill="none" stroke={ink} strokeWidth={7} {...draw(t, 0.1, 1.3)} />
        <rect x={X + B} y={Y + B} width={W - 2 * B} height={H - 2 * B} fill="none" stroke={ink} strokeWidth={6} {...draw(t, 0.3, 1.3)} />
        {[[X + B, Y + B], [X + W - B, Y + B], [X + B, Y + H - B], [X + W - B, Y + H - B]].map(([cx, cy], i) => <g key={i} transform={`translate(${cx} ${cy})`}>
          {Array.from({ length: 8 }, (_, j) => <ellipse key={j} cx={0} cy={-20} rx={9} ry={20} transform={`rotate(${j * 45})`} fill={j % 2 ? yel : red} stroke={ink} strokeWidth={2.5} opacity={appear(t, 1.2 + i * 0.1, 0.3)} />)}
          <circle r={8} fill={blue} stroke={ink} strokeWidth={2} opacity={appear(t, 1.4, 0.3)} /></g>)}
      </Svg>
      <div style={{ position: "absolute", left: 274, top: 156, width: 1920, height: 1080, transformOrigin: "0 0", transform: "scale(0.6)", opacity: t > 1.4 ? 1 : 0 }}>
        {/* the motifs are the motion library's own (lib/blocks-h.tsx): the same pieces a film's writer can place */}
        <At x={180} y={360}><MadhubaniFish size={420} at={1.6} /></At>
        <At x={120} y={580}><MadhubaniFish size={420} at={1.9} color={red} flip /></At>
        <At x={690} y={270}><MadhubaniSun size={420} at={2.3} /></At>
        <At x={1140} y={130}><MadhubaniPeacock size={520} at={3.3} /></At>
        <Svg>{gaps.map(([x, y], i) => { const at = 4.4 + i * 0.1, c = [red, blue, grn, yel][i % 4];
          return <g key={i} transform={`translate(${x} ${y}) rotate(${i * 47}) scale(1.7)`}>
            <path d="M0,0 C14,-30 40,-30 52,0 C40,30 14,30 0,0 Z" fill={c} stroke={ink} strokeWidth={4} style={fillIn(t, at + 0.3)} {...draw(t, at, 0.4)} />
            <path d="M-34,0 L0,0" stroke={ink} strokeWidth={4} {...draw(t, at, 0.3)} />
            {[-18, 0, 18].map((o) => <circle key={o} cx={-50} cy={o} r={6} fill={ink} opacity={appear(t, at + 0.4, 0.2)} />)}
          </g>; })}</Svg>
      </div>
      {/* pulled back: it is a wall in a home, a painter beside it, and what it is for painted underneath */}
      <div style={{ position: "absolute", left: X, top: 878, width: W, height: 100, background: yel, border: `6px double ${ink}`, boxSizing: "border-box", display: "grid", placeItems: "center",
        fontFamily: fam(d.display), fontSize: 46, fontWeight: 700, color: ink, opacity: appear(t, 7.6, 0.5) }}>Paint it for folk tales · festivals · mythology</div>
      {P("village_woman", "point", 1560, 300, 600, 6.9, true)}
      <At x={1640} y={880}><L.Diya size={130} at={7.4} /></At>
    </Cam>
  </AbsoluteFill>;
};

/* ================= Truck art: a truck rolls in, its back, its mudflaps ================= */
const Highway: Sig = ({ t }) => {
  const d = useDNA(), cs = d.inks;
  return <>
    <AbsoluteFill style={{ background: `linear-gradient(${cs[3]}, ${d.paper} 70%)` }} />
    <Svg>
      <circle cx={1520} cy={300} r={120} fill="#fff4c8" opacity={0.9} />
      <path d="M0,760 L0,600 Q200,520 420,610 T860,580 T1340,620 T1920,560 L1920,760 Z" fill={cs[0]} opacity={0.25} />
      <rect x={0} y={760} width={1920} height={320} fill="#3a3632" />
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 260 - ((t * 900) % 260)} y={910} width={130} height={14} fill="#f4e7c0" />)}
      <rect x={1430} y={330} width={14} height={430} fill="#4a3a2a" />
    </Svg>
    <div style={{ position: "absolute", left: 1240, top: 300, width: 540, height: 130, whiteSpace: "nowrap", background: cs[1], border: `6px solid ${d.ink}`, borderRadius: 10, display: "grid", placeItems: "center",
      fontFamily: fam(d.display), fontSize: 54, color: "#fff", WebkitTextStroke: `2px ${d.ink}`, transform: `rotate(-3deg) scale(${pop(t, 0.3)})` }}>DHABA 24 HRS</div>
    <At x={0} y={470}><PaintedTruck size={840} from={-950} to={420} dur={2.2} /></At>
    <div style={{ position: "absolute", left: 110, top: 110, fontFamily: fam(d.display), fontSize: 96, color: cs[0], WebkitTextStroke: `3px ${d.ink}`, opacity: appear(t, 1.6, 0.4) }}>A PAINTING ON WHEELS</div>
  </>;
};

const TruckBack: Sig =({ t }) => {
  const d = useDNA(), cs = d.inks, ink = d.ink, look = Math.sin(t * 2.2) * 26;
  const word = (at: number): React.CSSProperties => ({ transform: `scale(${pop(t, at)})`, opacity: t > at ? 1 : 0 });
  return <>
    <AbsoluteFill style={{ background: cs[1] }} />
    {[0, 1830].map((x) => <div key={x} style={{ position: "absolute", left: x, top: 0, width: 90, height: 1080, borderLeft: `6px solid ${ink}`, borderRight: `6px solid ${ink}`, boxSizing: "border-box",
      background: `repeating-linear-gradient(45deg, ${cs[0]} 0 30px, #fff 30px 60px)`, backgroundPosition: `0 ${t * 80}px`, filter: `brightness(${1 + Math.max(0, Math.sin(t * 5 + x)) * 0.35})` }} />)}
    <Svg>
      {Array.from({ length: 29 }, (_, i) => <g key={i}><path d={`M${90 + i * 60} 0 h60 v40 a30 30 0 0 1 -60 0 Z`} fill={cs[(i + 2) % 4]} stroke={ink} strokeWidth={3} />
        <circle cx={120 + i * 60} cy={34} r={9} fill="#fff" stroke={ink} strokeWidth={2} opacity={0.6 + 0.4 * Math.sin(t * 8 + i)} /></g>)}
      {[640, 1280].map((x, i) => <g key={x} transform={`translate(${x} 300) scale(${appear(t, 0.2 + i * 0.15, 0.3)})`}>
        <path d="M-200,0 Q0,-150 200,0 Q0,150 -200,0 Z" fill="#fff" stroke={ink} strokeWidth={8} />
        <circle cx={look} r={66} fill={cs[2]} stroke={ink} strokeWidth={5} /><circle cx={look} r={28} fill={ink} /><circle cx={look + 14} cy={-14} r={9} fill="#fff" />
        <path d="M-220,-60 Q0,-210 220,-60" fill="none" stroke={ink} strokeWidth={12} strokeLinecap="round" />
        {Array.from({ length: 7 }, (_, j) => <line key={j} x1={-150 + j * 50} y1={-95 + Math.abs(j - 3) * 9} x2={-162 + j * 54} y2={-135 + Math.abs(j - 3) * 12} stroke={ink} strokeWidth={6} strokeLinecap="round" />)}
      </g>)}
      {[[230, 880], [1690, 880]].map(([x, y], i) => <g key={i}>
        <circle cx={x} cy={y} r={70} fill={Math.sin(t * 6) > 0 ? "#ff3a2e" : "#8a1a14"} stroke={ink} strokeWidth={6} />
        <g transform={`translate(${x + (i ? -220 : 220)} ${y}) rotate(${t * 60})`}>{Array.from({ length: 8 }, (_, j) =>
          <ellipse key={j} cx={0} cy={-36} rx={18} ry={36} fill={cs[(i + j) % 4]} stroke={ink} strokeWidth={3} transform={`rotate(${j * 45})`} />)}<circle r={16} fill="#fff" stroke={ink} strokeWidth={3} /></g>
      </g>)}
      {[700, 960, 1220].map((x, i) => <g key={x} transform={`translate(${x} 1000) rotate(${Math.sin(t * 3 + i) * 14})`}>
        {Array.from({ length: 4 }, (_, j) => <ellipse key={j} cx={0} cy={j * 22} rx={8} ry={12} fill="none" stroke="#d8d0c0" strokeWidth={5} />)}
        <circle cy={100} r={14} fill={cs[3]} stroke={ink} strokeWidth={3} /></g>)}
    </Svg>
    <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", fontFamily: fam(d.display), fontSize: 148, lineHeight: 1, color: "#fff", WebkitTextStroke: `8px ${ink}`, paintOrder: "stroke" }}>
      <span style={{ display: "inline-block", ...word(0.6) }}>HORN</span> <span style={{ display: "inline-block", ...word(0.85) }}>OK</span> <span style={{ display: "inline-block", ...word(1.1) }}>PLEASE</span></div>
    <div style={{ position: "absolute", left: 460, right: 460, top: 690, padding: "10px 0", background: cs[3], border: `5px solid ${ink}`, borderRadius: 40, textAlign: "center",
      fontFamily: fam(d.body), fontWeight: 800, fontSize: 44, color: ink, ...word(1.7) }}>Buri nazar wale, tera muh kala</div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center", fontFamily: fam(d.mono ?? d.body), fontSize: 34, letterSpacing: "0.2em", color: "#fff", opacity: appear(t, 2.4, 0.3) }}>USE DIPPER AT NIGHT</div>
  </>;
};

const Mudflaps: Sig = ({ t }) => {
  const d = useDNA(), cs = d.inks, ink = d.ink;
  const flap = (x: number, words: string[], c: string, ph: number) => <div style={{ position: "absolute", left: x, top: 170, width: 560, height: 700, background: "#1c1a1e", borderRadius: "0 0 40px 40px",
    border: `6px solid ${ink}`, transformOrigin: "50% 0", transform: `rotate(${Math.sin(t * 3.2 + ph) * 4 * Math.exp(-t * 0.4)}deg)`, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
    <svg width={220} height={110} viewBox="-110 -55 220 110"><path d="M-100,0 Q0,-60 100,0 Q0,60 -100,0 Z" fill="#fff" /><circle r={30} fill={c} /><circle r={13} fill={ink} /></svg>
    {words.map((w, i) => <div key={w} style={{ fontFamily: fam(d.display), fontSize: 92, lineHeight: 1, color: c, WebkitTextStroke: "3px #fff", paintOrder: "stroke", transform: `scale(${pop(t, 0.5 + i * 0.25 + ph * 0.2)})` }}>{w}</div>)}
    <div style={{ width: 380, height: 18, background: `repeating-linear-gradient(90deg, ${cs[0]} 0 30px, #fff 30px 60px)` }} />
  </div>;
  return <>
    <AbsoluteFill style={{ background: "linear-gradient(#5a5652, #2e2b28)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 170, background: `repeating-linear-gradient(90deg, ${cs[0]} 0 80px, ${cs[3]} 80px 160px, ${cs[2]} 160px 240px)`, borderBottom: `8px solid ${ink}`,
      display: "grid", placeItems: "center", fontFamily: fam(d.display), fontSize: 92, color: "#fff", WebkitTextStroke: `5px ${ink}`, paintOrder: "stroke" }}>PHIR MILENGE!</div>
    {flap(250, ["INDIAN", "ROADS"], cs[3], 0)}
    {flap(1110, ["STREET", "CULTURE"], cs[0], 1)}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", fontFamily: fam(d.body), fontSize: 40, fontWeight: 700, color: "#f4e7c0", opacity: appear(t, 1.4, 0.4) }}>festivals · transport · life on the highway</div>
  </>;
};

/* ================= Mughal miniature: a manuscript, page by page ================= */
/** the folio's margin: gold rules, a vine drawn round it, leaves and buds along the vine */
const Margin: React.FC<{ t: number }> = ({ t }) => {
  const d = useDNA(), gold = d.inks[0], lapis = d.inks[1], red = d.inks[2];
  const O = [300, 40, 1620, 1040], I = [380, 120, 1540, 960], m = (a: number, b: number) => (a + b) / 2;
  const side = (x1: number, y1: number, x2: number, y2: number) => { const n = 9, dx = (x2 - x1) / n, dy = (y2 - y1) / n, nx = dy === 0 ? 0 : 1, ny = dy === 0 ? 1 : 0;
    return `M${x1},${y1} ` + Array.from({ length: n }, (_, i) => `q${dx / 2 + nx * (i % 2 ? -22 : 22)},${dy / 2 + ny * (i % 2 ? -22 : 22)} ${dx},${dy}`).join(" "); };
  const vine = [side(m(O[0], I[0]), m(O[1], I[1]), m(O[2], I[2]), m(O[1], I[1])), side(m(O[2], I[2]), m(O[1], I[1]), m(O[2], I[2]), m(O[3], I[3])),
    side(m(O[2], I[2]), m(O[3], I[3]), m(O[0], I[0]), m(O[3], I[3])), side(m(O[0], I[0]), m(O[3], I[3]), m(O[0], I[0]), m(O[1], I[1]))];
  const buds: [number, number][] = [];
  for (let i = 0; i < 12; i++) { buds.push([O[0] + 120 + i * 100, m(O[1], I[1])], [O[0] + 120 + i * 100, m(O[3], I[3])]); }
  for (let i = 0; i < 8; i++) { buds.push([m(O[0], I[0]), I[1] + 50 + i * 110], [m(O[2], I[2]), I[1] + 50 + i * 110]); }
  return <Svg>
    <rect x={O[0]} y={O[1]} width={O[2] - O[0]} height={O[3] - O[1]} fill={gold} fillOpacity={0.12} stroke={gold} strokeWidth={6} {...draw(t, 0, 0.9)} />
    <rect x={I[0]} y={I[1]} width={I[2] - I[0]} height={I[3] - I[1]} fill={d.paper} stroke={gold} strokeWidth={10} {...draw(t, 0.1, 0.9)} />
    <rect x={I[0] + 14} y={I[1] + 14} width={I[2] - I[0] - 28} height={I[3] - I[1] - 28} fill="none" stroke={lapis} strokeWidth={3} {...draw(t, 0.25, 0.9)} />
    {vine.map((p, i) => <path key={i} d={p} fill="none" stroke={gold} strokeWidth={4} {...draw(t, 0.3 + i * 0.25, 0.8)} />)}
    {buds.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`} opacity={appear(t, 0.8 + (i % 20) * 0.05, 0.3)}>
      <ellipse cx={-14} cy={-10} rx={14} ry={6} fill={gold} transform="rotate(-30)" /><ellipse cx={14} cy={10} rx={14} ry={6} fill={gold} transform="rotate(-30)" />
      <circle r={7} fill={i % 3 ? red : lapis} /></g>)}
  </Svg>;
};

const Folio: Sig = ({ t }) => {
  const d = useDNA(), gold = d.inks[0], lapis = d.inks[1], ink = d.ink;
  // Persian script runs right to left: each line is drawn from its right end
  const line = (x: number, y: number, w: number, i: number) => {
    const segs = Array.from({ length: 7 }, (_, j) => `q${-w / 14},${(j + i) % 2 ? -14 : 10} ${-w / 7},0`).join(" ");
    return <g key={`${x}-${y}`}><path d={`M${x + w},${y} ${segs}`} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" {...draw(t, 1 + i * 0.12, 0.5)} />
      {[0.2, 0.5, 0.8].map((f) => <circle key={f} cx={x + w * (1 - f)} cy={y - 22} r={4} fill={ink} opacity={appear(t, 1.3 + i * 0.12, 0.2)} />)}</g>;
  };
  return <>
    <AbsoluteFill style={{ background: "#d9c9a0" }} />
    <Margin t={t} />
    <Svg>
      <path d="M560,170 h800 l40,65 l-40,65 h-800 l-40,-65 Z" fill={lapis} stroke={gold} strokeWidth={6} opacity={appear(t, 0.5, 0.4)} />
      <line x1={960} y1={340} x2={960} y2={900} stroke={gold} strokeWidth={4} {...draw(t, 0.9, 0.6)} />
      {Array.from({ length: 7 }, (_, i) => line(1000, 400 + i * 74, 460, i))}
      {Array.from({ length: 7 }, (_, i) => line(460, 400 + i * 74, 460, i + 7))}
    </Svg>
    <div style={{ position: "absolute", left: 560, top: 170, width: 800, height: 130, display: "grid", placeItems: "center", fontFamily: fam(d.display), fontSize: 58, fontStyle: "italic", color: gold, opacity: appear(t, 0.7, 0.4) }}>The Chronicle of the Court</div>
  </>;
};

const Court: Sig = ({ t }) => <>
  <AbsoluteFill style={{ background: "#d9c9a0" }} />
  <Mughal t={t} />
  <At x={40} y={640}><L.Animal kind="elephant" size={330} at={1.6} face={-1} /></At>
  <At x={1520} y={640}><L.Animal kind="elephant" size={330} at={1.8} /></At>
</>;

const Medallion: Sig = ({ t }) => {
  const d = useDNA(), gold = d.inks[0], lapis = d.inks[1], red = d.inks[2];
  const x = Math.min(1100, 420 + t * 200);
  return <>
    <AbsoluteFill style={{ background: "#d9c9a0" }} />
    <Margin t={9} />
    <Svg>
      <g transform="translate(960 470)">
        {Array.from({ length: 24 }, (_, i) => <path key={i} d="M-26,-230 Q0,-300 26,-230 Z" transform={`rotate(${i * 15})`} fill={i % 2 ? gold : red} opacity={appear(t, 0.2 + i * 0.03, 0.2)} />)}
        <circle r={232} fill={gold} {...fillIn(t, 0.1)} />
        <circle r={210} fill={lapis} stroke={gold} strokeWidth={6} {...fillIn(t, 0.3)} />
      </g>
    </Svg>
    <div style={{ position: "absolute", left: 790, top: 340, width: 340, height: 260, display: "grid", placeItems: "center", textAlign: "center", fontFamily: fam(d.display), fontSize: 46, lineHeight: 1.15, fontStyle: "italic", color: gold, opacity: appear(t, 0.8, 0.5) }}>For history, empires and royal stories</div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 740, textAlign: "center", fontFamily: fam(d.body), fontSize: 38, fontStyle: "italic", color: d.ink, opacity: appear(t, 1.2, 0.5) }}>Mughal miniature · 16th to 18th century</div>
    <At x={x} y={800}><L.Animal kind="elephant" size={150} at={0.4} face={-1} /></At>
    <At x={x - 190} y={800}><L.Animal kind="horse" size={140} at={0.6} face={-1} /></At>
  </>;
};

/* ================= Kolam: one doorstep, 5:30 am to sunrise (one shot) ================= */
const Doorstep: Sig = ({ t }) => {
  const d = useDNA(), ink = d.ink, [gold, pink, cyan] = d.inks, S = 72, N = 3;
  const dawn = clamp01((t - 4.6) / 2.4);
  const cells: [number, number][] = [];
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) cells.push([i, j]);
  cells.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  const clock = dawn < 0.5 ? "5:30 am" : "6:12 am";
  return <>
    <AbsoluteFill style={{ background: `linear-gradient(${dawn > 0 ? `color-mix(in srgb, #f4a25a ${dawn * 100}%, ${d.paper})` : d.paper}, ${d.paper} 75%)` }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 880, bottom: 0, background: "#3a3430" }} />
    <div style={{ position: "absolute", left: 1720, top: 70, fontFamily: fam(d.mono ?? d.body), fontSize: 34, color: ink, opacity: 0.8 }}>{clock}</div>
    <div style={{ position: "absolute", left: 110, top: 70, fontFamily: fam(d.mono ?? d.body), fontSize: 26, letterSpacing: "0.2em", color: ink, opacity: appear(t, 0.2, 0.4) * (1 - appear(t, 7.6, 0.4)) }}>THE MONTH OF MARGAZHI · EVERY DOORSTEP</div>
    <Svg>
      <g transform="translate(960 470) rotate(45)">
        {cells.map(([i, j], n) => <rect key={`c${n}`} x={i * S - S * 0.42} y={j * S - S * 0.42} width={S * 0.84} height={S * 0.84} rx={S * 0.32}
          fill={[gold, pink, cyan][(Math.abs(i) + Math.abs(j)) % 3]} style={{ fillOpacity: 0.85 * appear(t, 4.8 + n * 0.02, 0.4) }}
          stroke={ink} strokeWidth={6} {...draw(t, 1.6 + n * 0.055, 0.45)} />)}
        <rect x={-N * S - S * 0.75} y={-N * S - S * 0.75} width={(2 * N + 1.5) * S} height={(2 * N + 1.5) * S} rx={S * 1.2} fill="none" stroke={ink} strokeWidth={6} {...draw(t, 4.3, 0.8)} />
        {[0, 90, 180, 270].map((r) => <path key={r} transform={`rotate(${r - 45})`} d={`M${-S * 0.6},-340 C${-S},${-340 - S * 1.4} ${S},${-340 - S * 1.4} ${S * 0.6},-340`} fill={pink} style={{ fillOpacity: appear(t, 5.4, 0.4) }} stroke={ink} strokeWidth={6} {...draw(t, 4.8, 0.5)} />)}
        {cells.map(([i, j], n) => <circle key={`d${n}`} cx={i * S} cy={j * S} r={7} fill={ink} opacity={appear(t, 0.1 + n * 0.03, 0.15)} />)}
      </g>
    </Svg>
    {[[180, 760], [420, 830], [1400, 830], [1620, 760]].map(([x, y], i) => <At key={i} x={x} y={y}><L.Diya size={150} at={5.6 + i * 0.15} /></At>)}
    <L.Handwrite text="for Pongal, Diwali, Onam, and every festival morning" x={440} y={960} size={58} at={7.6} dur={1.6} color="#f6efe0" />
  </>;
};

/* ================= NCERT: a textbook, chapter page to exercise ================= */
const Chapter: Sig = ({ t }) => {
  const d = useDNA(), [orange, blue] = d.inks, ink = d.ink;
  return <>
    <AbsoluteFill style={{ background: "#e9e4d8" }} />
    <div style={{ position: "absolute", left: 360, top: 30, width: 1200, height: 1020, background: d.paper, boxShadow: "0 20px 50px rgb(0 0 0/0.18)" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 150, background: orange, color: "#fff", display: "flex", alignItems: "center", gap: 30, padding: "0 60px", fontFamily: fam(d.display), clipPath: `inset(0 ${(1 - ease(t / 0.6)) * 100}% 0 0)` }}>
        <span style={{ fontSize: 100, fontWeight: 800 }}>7</span><span style={{ fontSize: 30, letterSpacing: "0.25em" }}>CHAPTER</span></div>
      <div style={{ position: "absolute", left: 60, top: 190, fontFamily: fam(d.display), fontSize: 84, fontWeight: 800, color: ink, opacity: appear(t, 0.4, 0.4) }}>Photosynthesis</div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 320, fontFamily: fam(d.body), fontSize: 34, lineHeight: 1.55, color: ink, opacity: appear(t, 0.8, 0.4) }}>
        You have learnt that all living organisms need food. Plants make their own food. But how? Let us find out.</div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 520, padding: "26px 34px", border: `4px solid ${blue}`, borderRadius: 14, background: "rgb(31 106 208/0.07)", fontFamily: fam(d.body), fontSize: 32, lineHeight: 1.45, color: ink,
        transform: `translateY(${(1 - ease((t - 1.3) / 0.5)) * 40}px)`, opacity: appear(t, 1.3, 0.4) }}>
        <div style={{ fontFamily: fam(d.display), fontWeight: 800, color: blue, marginBottom: 8 }}>Activity 7.1</div>
        Keep a potted plant in the dark for three days. Then test one of its leaves for starch. What do you find?</div>
      {[790, 840, 890].map((y, i) => <div key={y} style={{ position: "absolute", left: 60, top: y, height: 14, width: `${[88, 80, 60][i]}%`, background: ink, opacity: 0.18 * appear(t, 1.8 + i * 0.1, 0.3), borderRadius: 7 }} />)}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, textAlign: "center", fontFamily: fam(d.body), fontSize: 26, color: ink, opacity: 0.6 }}>Science · Class VII · 87</div>
    </div>
  </>;
};

const Figure: Sig = ({ t }) => {
  const d = useDNA(), [orange, blue, green] = d.inks, ink = d.ink;
  const arrow = (dd: string, c: string, at: number) => <path d={dd} fill="none" stroke={c} strokeWidth={8} strokeLinecap="round" markerEnd={`url(#ah-${c.slice(1)})`} {...draw(t, at, 0.6)} />;
  const label = (x: number, y: number, text: string, c: string, at: number) => <div style={{ position: "absolute", left: x, top: y, fontFamily: fam(d.body), fontWeight: 700, fontSize: 36, color: c, opacity: appear(t, at, 0.3) }}>{text}</div>;
  return <>
    <AbsoluteFill style={{ background: d.paper }} />
    <Svg>
      <defs>{[orange, blue, green, "#e0a800"].map((c) => <marker key={c} id={`ah-${c.slice(1)}`} viewBox="0 0 10 10" refX={6} refY={5} markerWidth={4} markerHeight={4} orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill={c} /></marker>)}</defs>
      <g opacity={appear(t, 0.9, 0.3)}><circle cx={290} cy={200} r={70} fill="#ffd23a" stroke={ink} strokeWidth={4} />
        {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <line key={i} x1={290 + Math.cos(a) * 90} y1={200 + Math.sin(a) * 90} x2={290 + Math.cos(a) * 120} y2={200 + Math.sin(a) * 120} stroke="#e0a800" strokeWidth={6} strokeLinecap="round" />; })}</g>
      <path d="M560,560 C640,300 1040,230 1360,360 C1200,650 840,760 560,560 Z" fill={green} stroke={ink} strokeWidth={6} style={fillIn(t, 0.6)} {...draw(t, 0, 0.8)} />
      <path d="M560,560 C800,480 1100,420 1360,360" fill="none" stroke={ink} strokeWidth={5} {...draw(t, 0.5, 0.6)} />
      {[0.25, 0.45, 0.65].map((f, i) => <g key={f}><path d={`M${560 + 800 * f},${520 - 160 * f} l60,-110`} stroke={ink} strokeWidth={3} {...draw(t, 0.7 + i * 0.1, 0.4)} /><path d={`M${560 + 800 * f},${520 - 160 * f} l40,110`} stroke={ink} strokeWidth={3} {...draw(t, 0.75 + i * 0.1, 0.4)} /></g>)}
      <path d="M560,560 L420,760" stroke={ink} strokeWidth={10} {...draw(t, 0.3, 0.4)} />
      {arrow("M360,250 L620,400", "#e0a800", 1.1)}{arrow("M400,180 L760,320", "#e0a800", 1.2)}
      {arrow("M1680,640 L1290,520", blue, 1.6)}
      {arrow("M1120,330 L1430,150", orange, 2)}
      {arrow("M300,900 L430,780", blue, 2.4)}
    </Svg>
    {label(140, 300, "Sunlight", "#b07800", 1.3)}
    {label(1400, 660, "Carbon dioxide (CO₂) in", blue, 1.9)}
    {label(1450, 110, "Oxygen (O₂) out", orange, 2.3)}
    {label(110, 920, "Water from the roots", blue, 2.7)}
    <L.PointerLabel x={940} y={470} text="Food (glucose) is made here" dx={200} dy={260} at={3} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 990, textAlign: "center", fontFamily: fam(d.body), fontStyle: "italic", fontSize: 34, color: ink, opacity: appear(t, 0.4, 0.4) }}>
      <b style={{ fontStyle: "normal" }}>Fig. 7.1</b> Photosynthesis in a leaf</div>
  </>;
};

const Exercise: Sig = ({ t }) => {
  const d = useDNA(), [orange] = d.inks, ink = d.ink;
  const opts = ["School lessons", "CBSE topics", "Labelled diagrams", "All of these"];
  return <>
    <AbsoluteFill style={{ background: d.paper }} />
    <div style={{ position: "absolute", left: 260, top: 130, display: "flex", alignItems: "center", gap: 24 }}>
      <div style={{ width: 22, height: 70, background: orange }} />
      <div style={{ fontFamily: fam(d.display), fontSize: 64, fontWeight: 800, letterSpacing: "0.12em", color: orange }}>EXERCISES</div></div>
    <div style={{ position: "absolute", left: 260, right: 260, top: 280, fontFamily: fam(d.body), fontSize: 50, fontWeight: 700, color: ink, opacity: appear(t, 0.2, 0.3) }}>1. When should you choose this look for your video?</div>
    {opts.map((o, i) => <div key={o} style={{ position: "absolute", left: 320, top: 420 + i * 110, fontFamily: fam(d.body), fontSize: 46, color: ink, opacity: appear(t, 0.5 + i * 0.15, 0.3) }}>({"abcd"[i]}) {o}</div>)}
    <Svg>
      <ellipse cx={462} cy={772} rx={172} ry={46} fill="none" stroke="#d0281e" strokeWidth={6} transform="rotate(-3 420 772)" {...draw(t, 1.5, 0.5)} />
      <path d="M760,760 l30,34 l70,-90" fill="none" stroke="#d0281e" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" {...draw(t, 1.9, 0.4)} />
    </Svg>
    <div style={{ position: "absolute", left: 920, top: 720, fontFamily: fam("caveat"), fontSize: 64, color: "#d0281e", transform: "rotate(-4deg)", opacity: appear(t, 2.2, 0.3) }}>Correct! Full marks.</div>
  </>;
};

/** every look with a story of its own; each list adds up to SHOW (300 frames) */
export const STORY: Record<string, Beat[]> = {
  madhubani: [{ len: 300, enter: "fade", Body: MadhubaniWall }],
  truckart: [{ len: 95, enter: "fade", Body: Highway }, { len: 120, enter: "slide", Body: TruckBack }, { len: 85, enter: "zoom", Body: Mudflaps }],
  mughal: [{ len: 90, enter: "fade", Body: Folio }, { len: 120, enter: "page", Body: Court }, { len: 90, enter: "page", Body: Medallion }],
  kolam: [{ len: 300, enter: "fade", Body: Doorstep }],
  ncert: [{ len: 90, enter: "fade", Body: Chapter }, { len: 125, enter: "rise", Body: Figure }, { len: 85, enter: "wipe", Body: Exercise }],
};
