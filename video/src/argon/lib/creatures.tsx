/* LAYER 1, part F: CREATURES AND ROBOTS. Insects, small animals and robots, drawn in the film's inks, each with its own
   body motion (wings beat, legs walk, tails swish, rotors spin) and a way of moving through the frame:
     <Creature kind="bee" x={900} y={400} size={180} move="wander" at={0.5} />      one, placed by its centre
     <Swarm kind="fly" x={600} y={300} w={700} h={400} count={14} />                  many, buzzing in a box or streaming
     <Robot action="wave" size={420} />   <RobotArm size={520} action="pick" />       robots that act
   Every kind faces right; it turns to face the way it goes (crawlers turn, flyers flip, robots face you). */
import type { ReactNode } from "react";
import { clamp01, useScene } from "../kit";
import { curve, ease, rand } from "./motion";
import { block } from "./parts";

type Pt = [number, number];
/** the colours a creature is drawn in: the film's ink and inks, and natural colours leaning toward the film's accent */
type C = { ink: string; acc: string; acc2: string; paper: string; muted: string; glass: string; n: (natural: string) => string };
/** what a drawing gets: seconds, how much it is moving (0..1), its colours, a seed */
type B = { t: number; m: number; c: C; s: number };

function useColors(): C {
  const { theme } = useScene();
  const k = Math.round(Math.min(0.45, (theme.tint ?? 0.25) * 0.5) * 100);
  return {
    ink: theme.ink, acc: theme.accent, acc2: theme.accent2, paper: theme.paper, muted: theme.muted, glass: "rgb(255 255 255 / 0.62)",
    n: (natural) => (k > 0 ? `color-mix(in srgb, ${natural} ${100 - k}%, ${theme.accent})` : natural),
  };
}
const flap = (t: number, hz = 7.5) => Math.abs(Math.sin(t * Math.PI * 2 * hz));
const SW = 4;  // the ink line every creature is drawn with, in its 220-unit box

/** a wing that beats: drawn above its root (x, y), squashed toward it by k (0..1) */
const Wing = ({ x, y, rx, ry, rot = 0, k, c }: { x: number; y: number; rx: number; ry: number; rot?: number; k: number; c: C }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(1 ${0.18 + 0.82 * k})`}>
    <ellipse cx={0} cy={-ry} rx={rx} ry={ry} fill={c.glass} stroke={c.ink} strokeWidth={3} />
    <path d={`M0 0 Q${rx * 0.2} ${-ry} 0 ${-ry * 1.9}`} fill="none" stroke={c.ink} strokeWidth={1.5} opacity={0.5} />
  </g>
);
/** legs seen from above: n per side along the body, swinging as it walks */
const TopLegs = ({ xs, r, len, t, m, c, hz = 3 }: { xs: number[]; r: number; len: number; t: number; m: number; c: C; hz?: number }) => <>
  {xs.flatMap((x, i) => [-1, 1].map((side) => {
    const sw = Math.sin(t * Math.PI * 2 * hz + i * Math.PI + (side > 0 ? Math.PI : 0)) * 14 * m;
    const kx = x + sw * 0.5 + (i - (xs.length - 1) / 2) * 8, ky = side * (r + len * 0.55);
    return <path key={`${i}${side}`} d={`M${x} ${side * r * 0.6} L${kx} ${ky} L${kx + sw + (i - 1) * 14} ${side * (r + len)}`} fill="none" stroke={c.ink} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />;
  }))}
</>;
/** legs seen from the side: n under the body, stepping */
const SideLegs = ({ xs, y, len, t, m, c, hz = 3 }: { xs: number[]; y: number; len: number; t: number; m: number; c: C; hz?: number }) => <>
  {xs.map((x, i) => { const sw = Math.sin(t * Math.PI * 2 * hz + i * 2.1) * 12 * m; return <path key={i} d={`M${x} ${y} L${x + 8 + sw * 0.4} ${y + len * 0.55} L${x + sw} ${y + len}`} fill="none" stroke={c.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />; })}
</>;
const Eye = ({ x, y, r = 6, c }: { x: number; y: number; r?: number; c: C }) => <><circle cx={x} cy={y} r={r} fill="#fff" /><circle cx={x + r * 0.3} cy={y} r={r * 0.5} fill={c.ink} /></>;

/* ---------------- the drawings: each faces right in a box from -110 to 110 ---------------- */
/** a stripe across an oval body, cut to the body's height at that x */
const Stripe = ({ x, cx, cy, rx, ry, w, c }: { x: number; cx: number; cy: number; rx: number; ry: number; w: number; c: C }) => {
  const h = ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)) - 2;
  return <path d={`M${x} ${cy - h} Q${x + 6} ${cy} ${x} ${cy + h}`} fill="none" stroke={c.ink} strokeWidth={w} />;
};
const DRAW: Record<string, (b: B) => ReactNode> = {
  bee: ({ t, c, m }) => { const k = flap(t), Y = c.n("#f5c21b"); return <>
    <Wing x={-6} y={-24} rx={20} ry={30} rot={-25} k={k} c={c} />
    <path d="M-60 8 L-82 12 L-60 18 Z" fill={c.ink} />
    <SideLegs xs={[-18, 0, 18]} y={36} len={18} t={t} m={m} c={c} />
    <ellipse cx={-10} cy={10} rx={52} ry={34} fill={Y} stroke={c.ink} strokeWidth={SW} />
    {[-30, -8, 14].map((x) => <Stripe key={x} x={x} cx={-10} cy={10} rx={52} ry={34} w={11} c={c} />)}
    <circle cx={46} cy={2} r={22} fill={c.ink} /><Eye x={54} y={-4} r={6} c={c} />
    <path d="M48 -18 Q54 -46 70 -50 M38 -18 Q38 -46 50 -54" fill="none" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
    <Wing x={6} y={-22} rx={22} ry={34} rot={10} k={1 - k * 0.6} c={c} />
  </>; },
  wasp: ({ t, c, m }) => { const k = flap(t, 8), Y = c.n("#f2b705"); return <>
    <Wing x={4} y={-18} rx={14} ry={36} rot={-30} k={k} c={c} />
    <SideLegs xs={[0, 14, 26]} y={14} len={30} t={t} m={m} c={c} />
    <ellipse cx={-40} cy={12} rx={42} ry={24} fill={Y} stroke={c.ink} strokeWidth={SW} />
    {[-58, -38, -18].map((x) => <Stripe key={x} x={x} cx={-40} cy={12} rx={42} ry={24} w={9} c={c} />)}
    <path d="M-82 12 L-100 14 L-82 18 Z" fill={c.ink} />
    <ellipse cx={18} cy={2} rx={22} ry={16} fill={c.ink} />
    <circle cx={52} cy={-4} r={16} fill={Y} stroke={c.ink} strokeWidth={SW} /><Eye x={58} y={-8} r={5} c={c} />
    <path d="M56 -18 Q64 -44 80 -46" fill="none" stroke={c.ink} strokeWidth={3} />
    <Wing x={14} y={-14} rx={14} ry={38} rot={12} k={1 - k * 0.6} c={c} />
  </>; },
  fly: ({ t, c, m }) => { const k = flap(t, 9), a = 18 + 22 * k; return <>
    <TopLegs xs={[-6, 10, 26]} r={18} len={34} t={t} m={m} c={c} hz={4} />
    <g transform={`rotate(${-a} 4 -6)`}><ellipse cx={-36} cy={-6} rx={46} ry={17} fill={c.glass} stroke={c.ink} strokeWidth={3} /><path d="M2 -6 L-70 -10 M-10 -6 L-60 4" stroke={c.ink} strokeWidth={1.5} opacity={0.5} /></g>
    <g transform={`rotate(${a} 4 6)`}><ellipse cx={-36} cy={6} rx={46} ry={17} fill={c.glass} stroke={c.ink} strokeWidth={3} /><path d="M2 6 L-70 10 M-10 6 L-60 -4" stroke={c.ink} strokeWidth={1.5} opacity={0.5} /></g>
    <ellipse cx={-30} cy={0} rx={36} ry={24} fill={c.n("#4a4f45")} stroke={c.ink} strokeWidth={SW} />
    {[-48, -32, -16].map((x) => <path key={x} d={`M${x} -20 Q${x + 5} 0 ${x} 20`} fill="none" stroke={c.ink} strokeWidth={2} opacity={0.5} />)}
    <ellipse cx={12} cy={0} rx={22} ry={20} fill={c.ink} />
    <circle cx={34} cy={0} r={14} fill={c.ink} />
    <circle cx={40} cy={-13} r={11} fill={c.n("#c0302a")} stroke={c.ink} strokeWidth={2} /><circle cx={40} cy={13} r={11} fill={c.n("#c0302a")} stroke={c.ink} strokeWidth={2} />
    <circle cx={43} cy={-16} r={3} fill="#fff" opacity={0.8} /><circle cx={43} cy={10} r={3} fill="#fff" opacity={0.8} />
  </>; },
  mosquito: ({ t, c, m }) => { const k = flap(t, 10); return <>
    <Wing x={0} y={-6} rx={9} ry={40} rot={-58} k={k} c={c} />
    {[-14, 0, 14].map((x, i) => { const sw = Math.sin(t * 6 + i) * 6 * m; return <path key={x} d={`M${x} 6 L${x - 14 + sw} 50 L${x - 30 + sw} 96`} fill="none" stroke={c.ink} strokeWidth={2.5} strokeLinecap="round" />; })}
    <path d="M-12 0 Q-60 4 -96 20" fill="none" stroke={c.n("#6b5a4a")} strokeWidth={14} strokeLinecap="round" />
    <path d="M-12 0 Q-60 4 -96 20" fill="none" stroke={c.ink} strokeWidth={2} strokeDasharray="4 8" />
    <ellipse cx={4} cy={-2} rx={20} ry={14} fill={c.ink} />
    <circle cx={30} cy={-6} r={11} fill={c.ink} />
    <path d="M40 -4 L94 18" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
    <path d="M36 -14 Q50 -34 62 -30" fill="none" stroke={c.ink} strokeWidth={2} />
  </>; },
  ant: ({ t, c, m }) => <>
    <TopLegs xs={[-2, 10, 22]} r={8} len={34} t={t} m={m} c={c} hz={4} />
    <ellipse cx={-50} cy={0} rx={36} ry={26} fill={c.n("#2c1f1a")} stroke={c.ink} strokeWidth={SW} />
    <ellipse cx={10} cy={0} rx={22} ry={13} fill={c.n("#2c1f1a")} stroke={c.ink} strokeWidth={SW} />
    <ellipse cx={52} cy={0} rx={20} ry={18} fill={c.n("#2c1f1a")} stroke={c.ink} strokeWidth={SW} />
    {[-1, 1].map((s) => <path key={s} d={`M64 ${s * 8} L84 ${s * 22} L104 ${s * 12 + Math.sin(t * 5 + s) * 6}`} fill="none" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />)}
  </>,
  beetle: ({ t, c, m }) => <>
    <TopLegs xs={[-26, 0, 22]} r={30} len={30} t={t} m={m} c={c} />
    <ellipse cx={-10} cy={0} rx={58} ry={44} fill={c.n("#2e7d4f")} stroke={c.ink} strokeWidth={SW} />
    <path d="M-68 0 H34" stroke={c.ink} strokeWidth={3} />
    <ellipse cx={-26} cy={-18} rx={20} ry={8} fill="#fff" opacity={0.25} />
    <path d="M40 -26 Q60 -30 62 0 Q60 30 40 26 Z" fill={c.ink} />
    <circle cx={70} cy={0} r={14} fill={c.ink} />
    {[-1, 1].map((s) => <path key={s} d={`M78 ${s * 8} Q96 ${s * 18} 100 ${s * 34}`} fill="none" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />)}
  </>,
  ladybug: ({ t, c, m }) => <>
    <TopLegs xs={[-18, 2, 22]} r={32} len={24} t={t} m={m} c={c} />
    <circle cx={-6} cy={0} r={52} fill={c.n("#d7262b")} stroke={c.ink} strokeWidth={SW} />
    <path d="M-58 0 H40" stroke={c.ink} strokeWidth={4} />
    {[[-30, -22, 10], [-30, 22, 10], [-4, -32, 9], [-4, 32, 9], [-40, 0, 7], [18, -18, 8], [18, 18, 8]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={c.ink} />)}
    <path d="M34 -34 Q66 -30 66 0 Q66 30 34 34 Q44 0 34 -34" fill={c.ink} />
    <circle cx={56} cy={-12} r={5} fill="#fff" /><circle cx={56} cy={12} r={5} fill="#fff" />
  </>,
  butterfly: ({ t, c }) => { const k = 0.18 + 0.82 * Math.abs(Math.cos(t * Math.PI * 2 * 2.6)), O = c.n("#f08a24"), P = c.acc2; return <>
    <g transform={`scale(1 ${k})`}>
      {[-1, 1].map((s) => <g key={s} transform={`scale(1 ${s})`}>
        <path d="M0 -4 C-10 -60 -70 -100 -88 -70 C-100 -46 -60 -18 0 -4 Z" fill={O} stroke={c.ink} strokeWidth={SW} />
        <path d="M0 -4 C30 -40 74 -76 84 -52 C92 -30 50 -10 0 -4 Z" fill={O} stroke={c.ink} strokeWidth={SW} />
        <circle cx={-56} cy={-62} r={10} fill={P} stroke={c.ink} strokeWidth={2} /><circle cx={56} cy={-48} r={7} fill={c.paper} stroke={c.ink} strokeWidth={2} />
      </g>)}
    </g>
    <ellipse cx={0} cy={0} rx={50} ry={8} fill={c.ink} />
    <circle cx={54} cy={0} r={9} fill={c.ink} />
    {[-1, 1].map((s) => <path key={s} d={`M58 ${s * 4} Q80 ${s * 14} 92 ${s * 30}`} fill="none" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />)}
  </>; },
  moth: ({ t, c }) => { const k = 0.2 + 0.8 * Math.abs(Math.cos(t * Math.PI * 2 * 3)), G = c.n("#a89a82"); return <>
    <g transform={`scale(1 ${k})`}>
      {[-1, 1].map((s) => <g key={s} transform={`scale(1 ${s})`}>
        <path d="M20 -4 C0 -70 -80 -96 -86 -50 C-90 -22 -40 -8 20 -4 Z" fill={G} stroke={c.ink} strokeWidth={SW} />
        <path d="M-20 -46 Q-40 -60 -60 -52" fill="none" stroke={c.ink} strokeWidth={2} opacity={0.6} />
        <circle cx={-40} cy={-38} r={7} fill="none" stroke={c.ink} strokeWidth={2.5} />
      </g>)}
    </g>
    <ellipse cx={-6} cy={0} rx={44} ry={12} fill={c.n("#6d6252")} stroke={c.ink} strokeWidth={3} />
    <circle cx={42} cy={0} r={11} fill={c.ink} />
    {[-1, 1].map((s) => <g key={s}><path d={`M48 ${s * 4} Q70 ${s * 20} 74 ${s * 40}`} fill="none" stroke={c.ink} strokeWidth={3} />{[0, 1, 2, 3].map((i) => <path key={i} d={`M${54 + i * 5} ${s * (8 + i * 8)} l8 ${s * -4}`} stroke={c.ink} strokeWidth={2} />)}</g>)}
  </>; },
  dragonfly: ({ t, c }) => { const a = Math.sin(t * Math.PI * 2 * 5) * 10; return <>
    {[-1, 1].map((s) => <g key={s}>
      <ellipse cx={12} cy={s * 46} rx={13} ry={46} fill={c.glass} stroke={c.ink} strokeWidth={3} transform={`rotate(${s * (-14 + a)} 14 0)`} />
      <ellipse cx={-10} cy={s * 42} rx={12} ry={42} fill={c.glass} stroke={c.ink} strokeWidth={3} transform={`rotate(${s * (16 - a)} -8 0)`} />
    </g>)}
    <path d="M0 0 L-104 0" stroke={c.n("#1f8a8a")} strokeWidth={12} strokeLinecap="round" />
    {[-30, -50, -70, -90].map((x) => <path key={x} d={`M${x} -6 V6`} stroke={c.ink} strokeWidth={2} />)}
    <ellipse cx={12} cy={0} rx={20} ry={12} fill={c.n("#1f8a8a")} stroke={c.ink} strokeWidth={3} />
    <circle cx={40} cy={-10} r={11} fill={c.n("#2b5e9e")} stroke={c.ink} strokeWidth={2} /><circle cx={40} cy={10} r={11} fill={c.n("#2b5e9e")} stroke={c.ink} strokeWidth={2} />
  </>; },
  spider: ({ t, c, m }) => <>
    {[-1, 1].flatMap((s) => [0, 1, 2, 3].map((i) => {
      // four legs a side, fanned from front to back, each bent at a high knee
      const sw = Math.sin(t * 8 + i * 1.7 + (s > 0 ? 1.4 : 0)) * 9 * m, f = i - 1.5;
      return <path key={`${s}${i}`} d={`M${4 + f * 6} ${s * 14} Q${4 + f * 34 + sw} ${s * 74} ${4 + f * 58 + sw * 1.4} ${s * 96}`} fill="none" stroke={c.ink} strokeWidth={SW} strokeLinecap="round" />;
    }))}
    <ellipse cx={-34} cy={0} rx={42} ry={36} fill={c.n("#3a2e2a")} stroke={c.ink} strokeWidth={SW} />
    <path d="M-50 -10 L-34 0 L-50 10 M-34 0 L-18 0" stroke={c.n("#d7262b")} strokeWidth={4} />
    <circle cx={22} cy={0} r={22} fill={c.n("#3a2e2a")} stroke={c.ink} strokeWidth={SW} />
    {[[36, -8], [36, 8], [42, -2], [42, 4]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.5} fill="#fff" />)}
  </>,
  caterpillar: ({ t, c, m }) => { const G = c.n("#7cb342"); return <>
    {[0, 1, 2, 3, 4, 5, 6].map((i) => { const x = -84 + i * 26, y = -Math.max(0, Math.sin(t * 5 - i * 0.7)) * 16 * m; return <g key={i}>
      <path d={`M${x} ${y + 20} v12`} stroke={c.ink} strokeWidth={4} strokeLinecap="round" />
      <circle cx={x} cy={y} r={20} fill={i % 2 ? G : c.n("#9ccc65")} stroke={c.ink} strokeWidth={3} />
    </g>; })}
    <circle cx={96} cy={-8 - Math.max(0, Math.sin(t * 5 - 7 * 0.7)) * 16 * m} r={24} fill={G} stroke={c.ink} strokeWidth={SW} />
    <Eye x={104} y={-14} r={7} c={c} />
    <path d="M88 -30 L80 -50 M102 -30 L108 -52" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
  </>; },
  worm: ({ t, c, m }) => { const pts = Array.from({ length: 13 }, (_, i) => [-96 + i * 16, Math.sin(t * 4 - i * 0.6) * 12 * (0.4 + 0.6 * m)] as Pt); const d = "M" + pts.map((p) => p.join(" ")).join(" L"); return <>
    <path d={d} fill="none" stroke={c.ink} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} fill="none" stroke={c.n("#e58a8a")} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
    {pts.slice(2, 11).map((p, i) => <path key={i} d={`M${p[0]} ${p[1] - 9} v18`} stroke={c.ink} strokeWidth={1.5} opacity={0.4} />)}
    <circle cx={pts[12][0] - 2} cy={pts[12][1] - 4} r={3} fill={c.ink} />
  </>; },
  snail: ({ t, c, m }) => { const st = Math.sin(t * 3) * 4; return <>
    <path d="M-92 44 Q-90 26 -50 24 H44 Q74 22 84 -4 Q96 10 92 40 Q60 52 -92 44 Z" fill={c.n("#b9b47a")} stroke={c.ink} strokeWidth={SW} />
    <path d={`M80 -4 L${90 + st} -44 M70 0 L${70 + st} -40`} stroke={c.ink} strokeWidth={4} strokeLinecap="round" />
    <circle cx={90 + st} cy={-46} r={6} fill={c.ink} /><circle cx={70 + st} cy={-42} r={6} fill={c.ink} />
    <circle cx={-14} cy={-14} r={46} fill={c.n("#c47a3a")} stroke={c.ink} strokeWidth={SW} />
    <path d="M-14 -14 m0 -6 a6 6 0 1 1 -6 6 a12 12 0 1 1 12 12 a20 20 0 1 1 -20 -20 a30 30 0 1 1 30 30" fill="none" stroke={c.ink} strokeWidth={3} />
    {m > 0 && <path d="M-110 46 H-94" stroke={c.muted} strokeWidth={4} opacity={0.5} />}
  </>; },
  cockroach: ({ t, c, m }) => <>
    <TopLegs xs={[-30, -4, 22]} r={22} len={42} t={t} m={m} c={c} hz={5} />
    <ellipse cx={-14} cy={0} rx={66} ry={34} fill={c.n("#7a3b16")} stroke={c.ink} strokeWidth={SW} />
    <path d="M-80 0 H30" stroke={c.ink} strokeWidth={2.5} />
    <ellipse cx={-30} cy={-12} rx={26} ry={6} fill="#fff" opacity={0.2} />
    <ellipse cx={46} cy={0} rx={20} ry={24} fill={c.n("#5a2a10")} stroke={c.ink} strokeWidth={3} />
    {[-1, 1].map((s) => <path key={s} d={`M64 ${s * 6} Q100 ${s * 4 + Math.sin(t * 4 + s) * 8} 110 ${s * 50}`} fill="none" stroke={c.ink} strokeWidth={2.5} />)}
  </>,
  grasshopper: ({ t, c, m }) => { const G = c.n("#6aa84f"), kick = Math.max(0, Math.sin(t * 6)) * m, leg = `M-24 2 L${-4 + kick * 10} ${-46 + kick * 10} L${-74 - kick * 30} ${34 + kick * 8}`; return <>
    <path d={leg} fill="none" stroke={c.ink} strokeWidth={18} strokeLinejoin="round" strokeLinecap="round" />
    <path d={leg} fill="none" stroke={G} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
    <SideLegs xs={[18, 34]} y={14} len={30} t={t} m={m} c={c} />
    <path d="M-98 6 Q-74 -26 18 -24 Q46 -20 46 4 Q40 26 0 26 Q-62 26 -98 6 Z" fill={G} stroke={c.ink} strokeWidth={SW} />
    <path d="M-84 0 Q-40 -30 22 -18 Q-20 -4 -84 0 Z" fill={c.n("#4f8a3a")} stroke={c.ink} strokeWidth={2.5} />
    <ellipse cx={56} cy={-2} rx={20} ry={18} fill={G} stroke={c.ink} strokeWidth={SW} />
    <Eye x={62} y={-6} r={6} c={c} />
    <path d="M60 -18 Q80 -70 108 -80 M54 -18 Q60 -70 84 -92" fill="none" stroke={c.ink} strokeWidth={2.5} />
  </>; },
  firefly: ({ t, c }) => { const k = flap(t, 8), glow = 0.45 + 0.55 * Math.max(0, Math.sin(t * 3)); return <>
    <circle cx={-44} cy={8} r={60} fill={c.n("#ffe066")} opacity={0.35 * glow} />
    <Wing x={0} y={-14} rx={14} ry={30} rot={-30} k={k} c={c} />
    <ellipse cx={-44} cy={8} rx={30} ry={22} fill={`color-mix(in srgb, ${c.n("#ffe066")} ${Math.round(glow * 100)}%, #6a6a3a)`} stroke={c.ink} strokeWidth={SW} />
    <ellipse cx={0} cy={0} rx={26} ry={18} fill={c.ink} />
    <circle cx={32} cy={-2} r={13} fill={c.n("#d7262b")} stroke={c.ink} strokeWidth={3} />
    <path d="M38 -12 Q50 -34 64 -34" fill="none" stroke={c.ink} strokeWidth={2.5} />
    <Wing x={8} y={-12} rx={14} ry={32} rot={14} k={1 - 0.6 * k} c={c} />
  </>; },
  bird: ({ t, c, m }) => { const w = Math.sin(t * Math.PI * 2 * (m > 0.3 ? 3 : 0.6)) * (m > 0.3 ? 50 : 6), B = c.n("#3a7bd5"); return <>
    <path d="M-60 0 L-104 -18 L-96 8 L-104 26 Z" fill={B} stroke={c.ink} strokeWidth={SW} strokeLinejoin="round" />
    <ellipse cx={-6} cy={6} rx={64} ry={38} fill={B} stroke={c.ink} strokeWidth={SW} />
    <ellipse cx={4} cy={22} rx={40} ry={18} fill={c.paper} opacity={0.6} />
    <circle cx={52} cy={-24} r={28} fill={B} stroke={c.ink} strokeWidth={SW} />
    <path d="M76 -28 L104 -18 L76 -12 Z" fill={c.n("#f2a33a")} stroke={c.ink} strokeWidth={3} strokeLinejoin="round" />
    <Eye x={60} y={-30} r={7} c={c} />
    <path d={`M-20 0 Q-10 ${-20 - w} 30 ${-6 - w * 0.6} Q10 14 -20 0 Z`} fill={c.n("#2a5fa8")} stroke={c.ink} strokeWidth={SW} strokeLinejoin="round" />
    {m < 0.3 && <path d="M-10 42 V60 M12 42 V60 M-16 60 H-2 M6 60 H20" stroke={c.ink} strokeWidth={4} strokeLinecap="round" />}
  </>; },
  fish: ({ t, c, m }) => { const sw = Math.sin(t * Math.PI * 2 * (1.2 + 1.8 * m)) * 18, O = c.n("#f07a2a"); return <>
    <path d={`M-58 0 L-100 ${-34 + sw} L-92 ${sw * 0.3} L-100 ${34 + sw} Z`} fill={O} stroke={c.ink} strokeWidth={SW} strokeLinejoin="round" />
    <path d="M-10 -40 Q10 -70 40 -36 Z" fill={O} stroke={c.ink} strokeWidth={3} strokeLinejoin="round" />
    <path d="M-70 0 Q-30 -54 40 -40 Q90 -20 96 0 Q90 22 40 40 Q-30 54 -70 0 Z" fill={O} stroke={c.ink} strokeWidth={SW} />
    {[-30, -6, 18].map((x) => <path key={x} d={`M${x} -34 Q${x + 12} 0 ${x} 34`} fill="none" stroke={c.paper} strokeWidth={8} opacity={0.75} />)}
    <path d={`M20 10 Q34 ${24 + sw * 0.3} 14 30 Z`} fill={c.n("#d85a1a")} stroke={c.ink} strokeWidth={2.5} />
    <Eye x={64} y={-8} r={9} c={c} />
    <path d="M90 8 Q82 12 88 16" fill="none" stroke={c.ink} strokeWidth={2.5} />
  </>; },
  bat: ({ t, c }) => { const k = Math.sin(t * Math.PI * 2 * 3), D = c.n("#3b3247"); return <>
    {[-1, 1].map((s) => <path key={s} transform={`scale(${s} 1) rotate(${k * 22} 14 0)`} d="M14 -6 Q50 -50 104 -30 Q90 -16 92 4 Q74 -6 64 12 Q50 0 38 16 Q28 4 14 12 Z" fill={D} stroke={c.ink} strokeWidth={SW} strokeLinejoin="round" />)}
    <ellipse cx={0} cy={6} rx={20} ry={30} fill={D} stroke={c.ink} strokeWidth={SW} />
    <path d="M-14 -16 L-18 -44 L-4 -24 M14 -16 L18 -44 L4 -24" fill={D} stroke={c.ink} strokeWidth={3} strokeLinejoin="round" />
    <circle cx={-7} cy={-8} r={4} fill={c.n("#ffcf3f")} /><circle cx={7} cy={-8} r={4} fill={c.n("#ffcf3f")} />
    <path d="M-5 4 L-3 9 L-1 4 M1 4 L3 9 L5 4" fill="#fff" />
  </>; },
  jellyfish: ({ t, c }) => { const P = c.n("#e88ad5"), pul = Math.sin(t * 3) * 0.08; return <>
    {[-36, -18, 0, 18, 36].map((x, i) => <path key={x} d={`M${x} 0 Q${x + Math.sin(t * 3 + i) * 16} 50 ${x} 80 T${x + Math.sin(t * 2 + i) * 14} 110`} fill="none" stroke={P} strokeWidth={6} strokeLinecap="round" opacity={0.8} />)}
    <g transform={`scale(${1 + pul} ${1 - pul})`}>
      <path d="M-62 4 Q-66 -70 0 -76 Q66 -70 62 4 Q46 14 30 4 Q16 16 0 4 Q-16 16 -30 4 Q-46 14 -62 4 Z" fill={P} fillOpacity={0.75} stroke={c.ink} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M-34 -40 Q-20 -60 6 -60" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
    </g>
  </>; },
  crab: ({ t, c, m }) => { const R = c.n("#e0503a"), snap = Math.max(0, Math.sin(t * 5)) * 18; return <>
    {[-1, 1].flatMap((s) => [0, 1, 2].map((i) => { const sw = Math.sin(t * 8 + i * 2 + s) * 8 * m; return <path key={`${s}${i}`} d={`M${s * (30 + i * 12)} 14 L${s * (60 + i * 14)} ${30 + sw} L${s * (70 + i * 14)} ${62 + sw}`} fill="none" stroke={c.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />; }))}
    {[-1, 1].map((s) => <g key={s} transform={`scale(${s} 1)`}>
      <path d="M40 -10 L66 -44" stroke={c.ink} strokeWidth={7} strokeLinecap="round" />
      <path d="M58 -40 Q60 -84 92 -80 Q104 -62 84 -52 Z" fill={R} stroke={c.ink} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M62 -42 Q${70 + snap * 0.4} ${-58 + snap * 0.6} ${88} ${-50 + snap * 0.3}`} fill={R} stroke={c.ink} strokeWidth={SW} strokeLinejoin="round" />
    </g>)}
    <ellipse cx={0} cy={8} rx={58} ry={38} fill={R} stroke={c.ink} strokeWidth={SW} />
    <path d="M-12 -28 V-48 M12 -28 V-48" stroke={c.ink} strokeWidth={4} /><Eye x={-12} y={-50} r={8} c={c} /><Eye x={12} y={-50} r={8} c={c} />
    <path d="M-16 20 Q0 30 16 20" fill="none" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
  </>; },
  mouse: ({ t, c, m }) => { const G = c.n("#9e9e9e"); return <>
    <path d={`M-60 10 Q-96 ${10 + Math.sin(t * 4) * 14} -108 -20`} fill="none" stroke={c.n("#e9a2a2")} strokeWidth={5} strokeLinecap="round" />
    <SideLegs xs={[-30, 20]} y={30} len={16} t={t} m={m} c={c} hz={6} />
    <path d="M-66 30 Q-74 -36 0 -34 Q50 -32 92 14 Q80 32 -66 30 Z" fill={G} stroke={c.ink} strokeWidth={SW} strokeLinejoin="round" />
    <circle cx={30} cy={-34} r={20} fill={G} stroke={c.ink} strokeWidth={SW} /><circle cx={30} cy={-34} r={11} fill={c.n("#e9a2a2")} />
    <circle cx={94} cy={14} r={6} fill={c.ink} /><Eye x={60} y={-6} r={6} c={c} />
    <path d="M86 8 L110 0 M86 14 L112 16" stroke={c.ink} strokeWidth={1.5} />
  </>; },
  robot: ({ t, c, m }) => <RobotBody t={t} c={c} action={m > 0.3 ? "walk" : "idle"} />,
  drone: ({ t, c }) => { const M = c.n("#4a5560"); return <>
    {[-1, 1].map((s) => <g key={s}>
      <path d={`M0 0 L${s * 70} -18`} stroke={c.ink} strokeWidth={8} strokeLinecap="round" />
      <rect x={s * 70 - 5} y={-30} width={10} height={14} fill={c.ink} />
      <ellipse cx={s * 70} cy={-32} rx={40 * Math.abs(Math.cos(t * 40 + s))} ry={5} fill={c.muted} stroke={c.ink} strokeWidth={2} />
      <ellipse cx={s * 70} cy={-32} rx={40} ry={5} fill="none" stroke={c.ink} strokeWidth={1} opacity={0.3} />
    </g>)}
    <rect x={-40} y={-16} width={80} height={36} rx={14} fill={M} stroke={c.ink} strokeWidth={SW} />
    <circle cx={0} cy={30} r={14} fill={c.ink} /><circle cx={4} cy={28} r={5} fill={c.acc} />
    <circle cx={-24} cy={0} r={4} fill={Math.sin(t * 6) > 0 ? c.n("#3fb35a") : c.ink} /><circle cx={24} cy={0} r={4} fill={Math.sin(t * 6) > 0 ? c.ink : c.n("#e0453a")} />
    <path d="M-20 34 L-32 52 H-12 M20 34 L32 52 H12" fill="none" stroke={c.ink} strokeWidth={4} strokeLinejoin="round" />
  </>; },
  rover: ({ t, c, m }) => { const M = c.n("#d9d2c0"), spin = t * 300 * m; return <>
    <path d="M-20 -30 V-74 H0" fill="none" stroke={c.ink} strokeWidth={6} />
    <rect x={-6} y={-90} width={34} height={22} rx={4} fill={M} stroke={c.ink} strokeWidth={3} /><circle cx={20} cy={-79} r={6} fill={c.ink} /><circle cx={21} cy={-80} r={2.5} fill={c.acc} />
    <rect x={-84} y={-34} width={168} height={46} rx={8} fill={M} stroke={c.ink} strokeWidth={SW} />
    <rect x={-60} y={-46} width={80} height={14} fill={c.acc} stroke={c.ink} strokeWidth={3} />
    <path d="M-70 12 L-60 30 M0 12 V30 M70 12 L60 30" stroke={c.ink} strokeWidth={5} />
    {[-66, 0, 66].map((x) => <g key={x} transform={`translate(${x} 44) rotate(${spin})`}><circle r={22} fill={c.ink} /><circle r={9} fill={c.muted} /><path d="M-22 0 H22 M0 -22 V22" stroke={c.muted} strokeWidth={3} /></g>)}
  </>; },
  bot: ({ t, c }) => { const blink = (t % 3.2) < 0.12 ? 0.15 : 1, look = Math.sin(t * 0.9) * 8, talk = Math.abs(Math.sin(t * 9)) ; return <>
    <path d="M0 -70 V-90" stroke={c.ink} strokeWidth={5} /><circle cx={0} cy={-96} r={9} fill={Math.sin(t * 4) > 0 ? c.acc : c.paper} stroke={c.ink} strokeWidth={3} />
    <rect x={-84} y={-70} width={168} height={130} rx={44} fill={c.paper} stroke={c.ink} strokeWidth={SW} />
    <rect x={-66} y={-52} width={132} height={88} rx={30} fill={c.ink} />
    {[-28, 28].map((x) => <ellipse key={x} cx={x + look} cy={-12} rx={13} ry={17 * blink} fill={c.acc} />)}
    <rect x={-20} y={14} width={40} height={4 + 10 * talk} rx={4} fill={c.acc} />
    <path d="M-84 -10 H-96 V20 H-84 M84 -10 H96 V20 H84" fill={c.muted} stroke={c.ink} strokeWidth={3} />
    <path d={`M-26 64 Q0 ${80 + Math.sin(t * 20) * 4} 26 64`} fill={c.n("#ffb347")} opacity={0.8} />
  </>; },
};
/** how each kind turns to the way it goes: crawlers seen from above turn, side views flip, front views do not turn */
const TURN: Record<string, "rotate" | "flip" | "none"> = {
  ant: "rotate", beetle: "rotate", ladybug: "rotate", spider: "rotate", cockroach: "rotate", fly: "rotate", dragonfly: "rotate",
  butterfly: "none", moth: "none", bat: "none", jellyfish: "none", crab: "none", robot: "none", drone: "none", bot: "none",
};
/** the kinds that fly or swim: their body keeps moving even when they hold still */
const AIRBORNE = new Set(["bee", "wasp", "fly", "mosquito", "butterfly", "moth", "dragonfly", "firefly", "bat", "jellyfish", "drone", "bot", "fish"]);
/** how fast each kind goes along a path, px per second at size 180 */
const SPEED: Record<string, number> = { snail: 40, worm: 50, caterpillar: 60, ladybug: 120, beetle: 120, ant: 180, spider: 200, cockroach: 300, mouse: 320, crab: 160, rover: 140, robot: 130, jellyfish: 80, fish: 260, bird: 420, bat: 380 };

export type CreatureKind = "bee" | "wasp" | "fly" | "mosquito" | "ant" | "beetle" | "ladybug" | "butterfly" | "moth" | "dragonfly" | "spider" | "caterpillar" | "worm" | "snail" | "cockroach" | "grasshopper" | "firefly" | "bird" | "fish" | "bat" | "jellyfish" | "crab" | "mouse" | "robot" | "drone" | "rover" | "bot";
export type CreatureMove = "still" | "hover" | "wander" | "dart" | "path" | "crawl" | "swim" | "hop" | "orbit" | "land" | "flee" | "dangle";
export const CREATURE_KINDS = Object.keys(DRAW) as CreatureKind[];
export const CREATURE_MOVES: CreatureMove[] = ["still", "hover", "wander", "dart", "path", "crawl", "swim", "hop", "orbit", "land", "flee", "dangle"];

/** where a mover is at u seconds into its move: centre, heading (deg), how much it is moving (0..1), how visible */
function place(move: CreatureMove, u: number, x: number, y: number, range: number, path: Pt[] | undefined, speed: number, seed: number, loop: boolean): { x: number; y: number; a: number; m: number; o: number; thread?: number } {
  const ph = rand(seed) * 6.28;
  const along = (pts: Pt[], wave = 0, hop = 0) => {
    const cv = curve(pts), k = u * speed / cv.length, kk = loop ? k % 1 : clamp01(k), p = cv.at(kk), q = cv.at(Math.min(1, kk + 0.01));
    const nx = -(q.y - p.y), ny = q.x - p.x, nl = Math.hypot(nx, ny) || 1, wv = Math.sin(u * 5 + ph) * wave;
    const hp = hop ? -Math.abs(Math.sin(u * Math.PI * 1.6)) * hop : 0;
    return { x: p.x + nx / nl * wv, y: p.y + ny / nl * wv + hp, a: p.angle, m: kk < 1 || loop ? 1 : 0, o: 1 };
  };
  const pts = path && path.length > 1 ? path : ([[x - range, y], [x + range, y]] as Pt[]);
  switch (move) {
    case "still": return { x, y, a: 0, m: 0, o: 1 };
    case "hover": return { x: x + Math.sin(u * 1.3 + ph) * range * 0.12, y: y + Math.sin(u * 2.1 + ph) * range * 0.08, a: 0, m: 0.6, o: 1 };
    case "wander": {
      const f = (v: number) => ({ x: x + range * (0.6 * Math.sin(v * 0.7 + ph) + 0.4 * Math.sin(v * 1.9 + ph * 2)), y: y + range * 0.6 * (0.6 * Math.sin(v * 0.9 + ph * 3) + 0.4 * Math.sin(v * 2.3 + ph)) });
      const p = f(u), q = f(u + 0.05);
      return { ...p, a: Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI, m: 1, o: 1 };
    }
    case "dart": {
      // a fly's flight: a quick dash to a new spot, then a still moment there
      const hop = 0.7, i = Math.floor(u / hop), f = ease.out(clamp01((u - i * hop) / 0.18));
      const spot = (j: number) => j <= 0 ? { x, y } : { x: x + (rand(seed * 7 + j) - 0.5) * 2 * range, y: y + (rand(seed * 11 + j) - 0.5) * 1.2 * range };
      const a = spot(i), b = spot(i + 1);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, m: f < 1 ? 1 : 0.4, o: 1 };
    }
    case "path": case "crawl": return along(pts);
    case "swim": return along(pts, 16);
    case "hop": return along(pts, 0, 70);
    case "orbit": { const v = u * speed / Math.max(60, range) + ph; return { x: x + Math.cos(v) * range, y: y + Math.sin(v) * range * 0.55, a: (v * 180 / Math.PI) + 90, m: 1, o: 1 }; }
    case "land": { const f = ease.out(clamp01(u / 1.6)); return { x: x - 900 * (1 - f), y: y - 420 * (1 - f) + Math.sin(f * Math.PI) * -60, a: f < 1 ? 20 : 0, m: f < 1 ? 1 : 0, o: 1 }; }
    case "flee": { const f = Math.pow(clamp01(u / 1.4), 2); return { x: x + 1600 * f, y: y - 500 * f, a: u > 0 ? -18 : 0, m: u > 0 ? 1 : 0, o: 1 }; }
    case "dangle": { const f = ease.out(clamp01(u / 1.4)); return { x: x + Math.sin(u * 1.4) * 10, y: y - range * (1 - f) + Math.sin(u * 2) * 6, a: 0, m: 0.3, o: 1, thread: y - range * 1.8 }; }  // thread: where it hangs from
  }
}

/* ================= CREATURES ================= */
/** an insect, small animal or robot that lives and moves: kind bee wasp fly (makkhi) mosquito ant beetle ladybug butterfly moth dragonfly spider caterpillar worm snail cockroach grasshopper firefly bird fish bat jellyfish crab mouse robot drone rover bot (a friendly AI assistant head); move still hover wander dart (a fly's dash-and-stop) path crawl swim hop orbit land (flies in and settles) flee (rushes off at `at`) dangle (a spider on its thread); x, y its centre; path the points it follows; range how far it roams; wings beat, legs walk and tails swish by themselves */
function CreatureView({ kind, x = 0, y = 0, size = 180, at = 0, move = "still", path, range = 220, speed, loop = false, seed = 1, color }: { kind: CreatureKind; x?: number; y?: number; size?: number; at?: number; move?: CreatureMove; path?: [number, number][]; range?: number; speed?: number; loop?: boolean; seed?: number; color?: string }) {
  const { t } = useScene();
  const c0 = useColors();
  const c = color ? { ...c0, n: () => color } : c0;
  const u = Math.max(0, t - at);
  const sp = (speed ?? SPEED[kind] ?? 240) * size / 180;
  const p = move === "flee" ? place(move, t - at < 0 ? 0 : u, x, y, range, path, sp, seed, loop) : place(move, u, x, y, range, path, sp, seed, loop);
  const show = move === "flee" ? 1 : clamp01((t - at) / 0.3);
  const m = AIRBORNE.has(kind) ? Math.max(0.6, p.m) : p.m;
  const turn = TURN[kind] ?? "flip";
  const back = Math.cos(p.a * Math.PI / 180) < -0.2;
  const tf = turn === "rotate" && p.m > 0 ? `rotate(${p.a}deg)` : turn === "flip" && back && move !== "still" ? "scaleX(-1)" : "";
  const draw = DRAW[kind] ?? DRAW.bee;
  return <>
    {p.thread !== undefined && <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}><line x1={x + (p.x - x) * 0.3} y1={p.thread} x2={p.x} y2={p.y - size * 0.25} stroke={c.ink} strokeWidth={2} opacity={0.7} /></svg>}
    <svg width={size} height={size} viewBox="-110 -110 220 220" style={{ position: "absolute", left: p.x - size / 2, top: p.y - size / 2, overflow: "visible", opacity: show, transform: `${tf} scale(${0.6 + 0.4 * show})` }}>
      {draw({ t: t + rand(seed) * 3, m, c, s: seed })}
    </svg>
  </>;
}
export const Creature = block("Creature", CreatureView);

/** many of one kind together: buzzing about inside a box (bees round a hive, flies round food), or streaming from the box to `to` (ants in a line, a swarm leaving); each one its own size and timing */
function SwarmView({ kind, x, y, w = 600, h = 360, count = 12, size = 90, at = 0, mode = "buzz", to }: { kind: CreatureKind; x: number; y: number; w?: number; h?: number; count?: number; size?: number; at?: number; mode?: "buzz" | "stream"; to?: [number, number] }) {
  return <>{Array.from({ length: count }, (_, i) => {
    const s = 0.75 + rand(i * 3.1) * 0.5, cx = x + rand(i * 7.3) * w, cy = y + rand(i * 5.9) * h;
    if (mode === "stream" && to) {
      const lag = i * 0.35;
      return <CreatureView key={i} kind={kind} size={size * s} at={at + lag} move="path" path={[[x + rand(i) * 40, y + h / 2 + (rand(i * 2) - 0.5) * 30], [(x + to[0]) / 2 + (rand(i * 9) - 0.5) * 60, (y + h / 2 + to[1]) / 2 + (rand(i * 4) - 0.5) * 60], to]} seed={i + 1} />;
    }
    return <CreatureView key={i} kind={kind} x={cx} y={cy} size={size * s} at={at + rand(i * 1.7) * 0.6} move={AIRBORNE.has(kind) ? (kind === "fly" ? "dart" : "wander") : "wander"} range={Math.min(w, h) * 0.3} seed={i + 1} />;
  })}</>;
}
export const Swarm = block("Swarm", SwarmView);

/* ================= ROBOTS ================= */
export type RobotAction = "idle" | "wave" | "walk" | "think" | "type" | "point" | "celebrate" | "scan";
/** the robot's body, front view in -110..110: head with screen eyes, chest lights, arms and legs that act */
function RobotBody({ t, c, action }: { t: number; c: C; action: RobotAction }) {
  const M = c.n("#cfd6dd"), blink = (t % 2.8) < 0.12 ? 0.2 : 1;
  const step = action === "walk" ? Math.sin(t * 6) : 0;
  const bob = action === "celebrate" ? -Math.abs(Math.sin(t * 5)) * 14 : action === "walk" ? -Math.abs(step) * 4 : Math.sin(t * 2) * 1.5;
  const arm: Record<RobotAction, [number, number]> = {
    idle: [8 + Math.sin(t * 2) * 3, -8 - Math.sin(t * 2) * 3], walk: [step * 24, -step * 24], wave: [10, -150 + Math.sin(t * 8) * 22], think: [10, -140],
    type: [-55 + Math.sin(t * 14) * 6, 55 + Math.cos(t * 14) * 6], point: [10, -90], celebrate: [150 + Math.sin(t * 6) * 10, -150 - Math.sin(t * 6) * 10], scan: [8, -8],
  };
  const [l, r] = arm[action];
  const look = action === "scan" ? Math.sin(t * 2) * 12 : action === "think" ? 8 : 0;
  return <g transform={`translate(0 ${bob})`}>
    {[-1, 1].map((s) => <g key={s} transform={`translate(${s * 22} 52) rotate(${s * step * 18})`}>
      <rect x={-9} y={0} width={18} height={40} rx={6} fill={c.muted} stroke={c.ink} strokeWidth={3} />
      <rect x={-16} y={38} width={32} height={12} rx={5} fill={c.ink} />
    </g>)}
    <g transform={`translate(-54 -6) rotate(${l})`}><rect x={-10} y={0} width={20} height={56} rx={9} fill={c.muted} stroke={c.ink} strokeWidth={3} /><circle cx={0} cy={60} r={11} fill={c.ink} /></g>
    <g transform={`translate(54 -6) rotate(${r})`}><rect x={-10} y={0} width={20} height={56} rx={9} fill={c.muted} stroke={c.ink} strokeWidth={3} /><circle cx={0} cy={60} r={11} fill={c.ink} /></g>
    <rect x={-48} y={-14} width={96} height={70} rx={14} fill={M} stroke={c.ink} strokeWidth={SW} />
    <rect x={-26} y={0} width={52} height={30} rx={6} fill={c.ink} />
    {[0, 1, 2].map((i) => <circle key={i} cx={-14 + i * 14} cy={15} r={5} fill={Math.sin(t * 5 + i * 2) > 0 ? c.acc : c.acc2} />)}
    <rect x={-8} y={-26} width={16} height={14} fill={c.muted} stroke={c.ink} strokeWidth={3} />
    <rect x={-44} y={-90} width={88} height={66} rx={18} fill={M} stroke={c.ink} strokeWidth={SW} />
    <rect x={-34} y={-80} width={68} height={42} rx={10} fill={c.ink} />
    {[-14, 14].map((x) => <ellipse key={x} cx={x + look} cy={-60} rx={7} ry={9 * blink} fill={c.acc} />)}
    <path d="M0 -90 V-104" stroke={c.ink} strokeWidth={4} /><circle cx={0} cy={-108} r={6} fill={Math.sin(t * 5) > 0 ? c.acc : c.paper} stroke={c.ink} strokeWidth={2} />
    {action === "think" && [0, 1, 2].map((i) => <circle key={i} cx={56 + i * 16} cy={-96 - i * 8} r={4 + i * 2} fill={c.paper} stroke={c.ink} strokeWidth={2} opacity={clamp01(Math.sin(t * 3 - i) + 0.5)} />)}
    {action === "type" && <rect x={-70} y={64} width={140} height={14} rx={3} fill={c.ink} />}
    {action === "scan" && <path d={`M0 -60 L${200 + look * 4} -${90 - look * 2} L${200 + look * 4} -${30 + look * 2} Z`} fill={c.acc} opacity={0.25} />}
  </g>;
}
/** a robot that acts: action idle wave walk think (with thought dots) type (at a keyboard) point celebrate scan (sweeps a beam); its eyes blink and its lights run */
function RobotView({ action = "idle", size = 360, at = 0 }: { action?: RobotAction; size?: number; at?: number }) {
  const { t } = useScene();
  const c = useColors();
  const k = ease.back(clamp01((t - at) / 0.6));
  return <svg width={size} height={size} viewBox="-110 -120 220 230" style={{ overflow: "visible", opacity: clamp01((t - at) / 0.2), transform: `scale(${0.4 + 0.6 * k})` }}><RobotBody t={Math.max(0, t - at)} c={c} action={action} /></svg>;
}
export const Robot = block("Robot", RobotView);

/** an industrial robot arm on its base: action pick (lifts a box from the left and sets it down on the right), wave, weld (sparks fly at the tip), sort (taps three spots in turn) */
function RobotArmView({ action = "pick", size = 480, at = 0, item }: { action?: "pick" | "wave" | "weld" | "sort"; size?: number; at?: number; item?: ReactNode }) {
  const { t } = useScene();
  const c = useColors();
  const u = Math.max(0, t - at), cyc = (u % 4) / 4;
  // shoulder and elbow angles over one 4 s cycle
  const pose = (): [number, number, number] => {
    if (action === "wave") return [-60 + Math.sin(u * 2) * 10, -40 + Math.sin(u * 6) * 30, 0];
    if (action === "weld") return [-35 + Math.sin(u * 0.8) * 6, 70 + Math.sin(u * 1.3) * 8, 1];
    if (action === "sort") { const i = Math.floor(u / 1.2) % 3, f = ease.inOut(clamp01((u % 1.2) / 0.6)); const S = [-20, -45, -70], E = [70, 60, 40]; const j = (i + 2) % 3; return [S[j] + (S[i] - S[j]) * f, E[j] + (E[i] - E[j]) * f, 0]; }
    const k = cyc < 0.25 ? 0 : cyc < 0.5 ? ease.inOut((cyc - 0.25) * 4) : cyc < 0.75 ? 1 : 1 - ease.inOut((cyc - 0.75) * 4);
    const lift = Math.sin(Math.PI * (cyc < 0.25 ? 0 : cyc < 0.5 ? (cyc - 0.25) * 4 : 0)) * 20;
    return [-150 + k * 120 - lift * 0.2, 80 - lift, cyc > 0.2 && cyc < 0.55 ? 2 : 0];
  };
  const [sh, el, hold] = pose();
  const L1 = 80, L2 = 70;
  const a1 = sh * Math.PI / 180, a2 = (sh + el) * Math.PI / 180;
  const ex = Math.cos(a1) * L1, ey = Math.sin(a1) * L1, tx = ex + Math.cos(a2) * L2, ty = ey + Math.sin(a2) * L2;
  const M = c.n("#f2a33a");
  return <svg width={size} height={size} viewBox="-120 -150 240 240" style={{ overflow: "visible", opacity: clamp01((t - at) / 0.3) }}>
    <rect x={-60} y={64} width={120} height={20} rx={4} fill={c.ink} />
    <path d="M-34 64 L-24 30 H24 L34 64 Z" fill={c.muted} stroke={c.ink} strokeWidth={SW} />
    <g transform="translate(0 26)">
      <line x1={0} y1={0} x2={ex} y2={ey} stroke={c.ink} strokeWidth={26} strokeLinecap="round" />
      <line x1={0} y1={0} x2={ex} y2={ey} stroke={M} strokeWidth={18} strokeLinecap="round" />
      <line x1={ex} y1={ey} x2={tx} y2={ty} stroke={c.ink} strokeWidth={20} strokeLinecap="round" />
      <line x1={ex} y1={ey} x2={tx} y2={ty} stroke={M} strokeWidth={13} strokeLinecap="round" />
      {[[0, 0, 15], [ex, ey, 12]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={c.paper} stroke={c.ink} strokeWidth={SW} />)}
      <g transform={`translate(${tx} ${ty})`}>
        <path d={`M-10 0 V16 M10 0 V16 M-12 0 H12`} stroke={c.ink} strokeWidth={6} strokeLinecap="round" />
        {hold === 2 && (item ?? <rect x={-18} y={16} width={36} height={30} rx={3} fill={c.acc} stroke={c.ink} strokeWidth={3} />)}
        {hold === 1 && Array.from({ length: 7 }, (_, i) => { const a = rand(i + Math.floor(u * 12)) * 6.28, r = 10 + rand(i * 3 + Math.floor(u * 12)) * 30; return <line key={i} x1={0} y1={18} x2={Math.cos(a) * r} y2={18 + Math.sin(a) * r} stroke={c.n("#ffcf3f")} strokeWidth={3} strokeLinecap="round" />; })}
      </g>
    </g>
    {action === "pick" && cyc <= 0.2 && <rect x={-110} y={60} width={36} height={30} rx={3} fill={c.acc} stroke={c.ink} strokeWidth={3} transform="translate(0 -26)" />}
    {action === "pick" && cyc >= 0.55 && <rect x={74} y={34} width={36} height={30} rx={3} fill={c.acc} stroke={c.ink} strokeWidth={3} />}
  </svg>;
}
export const RobotArm = block("RobotArm", RobotArmView);
