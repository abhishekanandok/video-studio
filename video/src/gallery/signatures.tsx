/* Each look family's signature scene: the thing the look is FOR, drawn in it, so a creator sees why the look exists and
   when to choose it (Madhubani paints fish, a peacock and the sun; Truck art paints the back of a truck; Mughal miniature
   sets a court under a cusped arch; Rangoli draws itself among diyas). Library blocks are themed by the look through
   <Lib>; a few looks get their own drawing where no block shows their art. 5.5 s each, inside the showcase
   (src/gallery/showcase-scenes.tsx), the third beat of which lists the videos to make with it. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { At } from "../argon/kit";
import * as A from "../argon/lib/blocks-a";
import * as B from "../argon/lib/blocks-b";
import * as C from "../argon/lib/blocks-c";
import * as D from "../argon/lib/blocks-d";
import * as E from "../argon/lib/blocks-e";
import * as F from "../argon/lib/blocks-f";
import * as G from "../argon/lib/blocks-g";
import * as M from "../argon/lib/motion";
import * as MB from "../argon/lib/motion-b";
import * as MC from "../argon/lib/motion-c";
import { MapRoute } from "../argon/lib/blocks-b";
import { OldMap } from "../argon/lib/blocks-e";
import { Creature, Robot, RobotArm, type CreatureKind, type CreatureMove } from "../argon/lib/creatures";
import { Conversation, Person, type AvatarName, type PoseName } from "../argon/lib/people";
import { appear, clamp01, fam, useDNA } from "../print/kit";

/** the whole block library under one name (each block file exports its own) */
export const L = { ...A, ...B, ...C, ...D, ...E, ...F, ...G, ...M, ...MB, ...MC };
const { Blackboard, CorkBoard, Countdown, KineticWords, Lightbulb, OldPaper, Redacted, Stamp, Terminal } = L;
export type Sig = React.FC<{ t: number }>;
export const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const Mid: React.FC<{ y?: number; children: React.ReactNode }> = ({ y = 0, children }) =>
  <AbsoluteFill style={{ display: "grid", placeItems: "center", transform: `translateY(${y}px)` }}>{children}</AbsoluteFill>;
const Fill: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill>{children}</AbsoluteFill>;
export const P = (avatar: string, pose: string, x: number, y: number, size = 520, at = 0.2, flip = false) =>
  <At x={x} y={y}><Person avatar={avatar as AvatarName} pose={pose as PoseName} size={size} at={at} flip={flip} /></At>;
const Cr = (kind: string, move: string, x: number, y: number, size = 200, at = 0.2, path?: [number, number][]) =>
  <Creature kind={kind as CreatureKind} move={move as CreatureMove} x={x} y={y} size={size} at={at} range={220} loop path={path} />;
/** a line drawn on: pathLength 1, dash grows from 0 to 1 between at and at + dur */
export const draw = (t: number, at: number, dur = 1) => ({ pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - ease((t - at) / dur) });
export const fillIn = (t: number, at: number) => ({ fillOpacity: appear(t, at, 0.5) });

/* ---------------- drawn art for the looks no library block shows ---------------- */

/** the bluest of the look's inks (a woodblock wave is Prussian blue whichever ink leads the brand) */
const bluest = (inks: string[]) => [...inks].sort((a, b) => {
  const v = (c: string) => parseInt(c.slice(5, 7), 16) - parseInt(c.slice(1, 3), 16);
  return v(b) - v(a);
})[0];

/** Madhubani: a fish pair, the sun and a peacock, each outlined twice in black ink, then filled flat and hatched */
export const Madhubani: Sig = ({ t }) => {
  const d = useDNA(), ink = d.ink, [r, b, y, g] = [d.inks[0], d.inks[1], d.inks[2] ?? d.inks[0], d.inks[3] ?? d.inks[1]];
  const line = (at: number, w = 5) => ({ stroke: ink, strokeWidth: w, ...draw(t, at, 1.1) });
  const fish = (flip: boolean, c: string, at: number) => <g transform={`translate(${flip ? 520 : 200} ${flip ? 690 : 470}) scale(${flip ? -1 : 1} 1)`}>
    <path d="M0,0 C70,-95 230,-95 300,0 C230,95 70,95 0,0 Z" fill={c} style={fillIn(t, at + 1)} {...line(at)} />
    <path d="M14,0 C78,-78 222,-78 286,0 C222,78 78,78 14,0 Z" fill="none" {...line(at + 0.2, 2.5)} />
    <path d="M300,0 L370,-60 L360,0 L370,60 Z" fill={y} style={fillIn(t, at + 1)} {...line(at + 0.3)} />
    {[60, 100, 140, 180, 220].map((x) => <path key={x} d={`M${x},-55 Q${x + 30},0 ${x},55`} fill="none" {...line(at + 0.5, 3)} />)}
    <circle cx={44} cy={-10} r={13} fill="#fff" {...line(at + 0.4, 3)} /><circle cx={44} cy={-10} r={5} fill={ink} />
  </g>;
  const rays = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    return <path key={i} d={`M${130 * c},${130 * s} L${200 * Math.cos(a - 0.12)},${200 * Math.sin(a - 0.12)} L${200 * Math.cos(a + 0.12)},${200 * Math.sin(a + 0.12)} Z`}
      fill={i % 2 ? r : y} style={fillIn(t, 1.6 + i * 0.03)} {...line(1 + i * 0.03, 3)} />; });
  return <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    {fish(false, b, 0.2)}{fish(true, r, 0.5)}
    <g transform="translate(900 480)">
      {rays}
      <circle r={125} fill={y} style={fillIn(t, 1.8)} {...line(0.9)} /><circle r={108} fill="none" {...line(1.1, 2.5)} />
      <path d="M-46,-24 q16,-16 32,0 M14,-24 q16,-16 32,0" fill="none" {...line(1.6, 4)} />
      <circle cx={-30} cy={-12} r={7} fill={ink} opacity={appear(t, 1.9, 0.3)} /><circle cx={30} cy={-12} r={7} fill={ink} opacity={appear(t, 1.9, 0.3)} />
      <path d="M-40,40 Q0,70 40,40" fill={r} {...line(1.7, 4)} />
    </g>
    <g transform="translate(1480 470)">
      {Array.from({ length: 7 }, (_, i) => { const a = -150 + i * 20; return <g key={i} transform={`rotate(${a})`}>
        <path d="M0,0 L0,-250" {...line(2 + i * 0.08, 3)} fill="none" />
        <ellipse cx={0} cy={-275} rx={34} ry={46} fill={g} style={fillIn(t, 2.8 + i * 0.05)} {...line(2.2 + i * 0.08, 4)} />
        <circle cx={0} cy={-280} r={13} fill={b} style={fillIn(t, 3 + i * 0.05)} {...line(2.5 + i * 0.08, 3)} />
      </g>; })}
      <path d="M-60,40 C-90,-60 40,-80 60,20 C70,90 -20,130 -60,40 Z" fill={b} style={fillIn(t, 2.6)} {...line(1.9)} />
      <path d="M40,-20 C70,-90 60,-150 100,-170" fill="none" {...line(2.1, 18)} stroke={b} />
      <path d="M40,-20 C70,-90 60,-150 100,-170" fill="none" {...line(2.1, 4)} />
      <circle cx={108} cy={-180} r={22} fill={b} {...line(2.3)} style={fillIn(t, 2.7)} /><path d="M128,-176 L160,-168 L128,-160" fill={y} {...line(2.4, 3)} />
      {[-12, 0, 12].map((x) => <path key={x} d={`M${104 + x},-200 L${110 + x * 1.6},-240`} {...line(2.5, 3)} />)}
      <path d="M-20,120 L-30,190 M20,120 L30,190" {...line(2.6, 5)} />
    </g>
  </svg>;
};

/** Mughal miniature: a gold-framed court under a cusped arch, the emperor between the rani and a courtier, cypress trees in the garden */
export const Mughal: Sig = ({ t }) => {
  const d = useDNA(), gold = d.inks[0], lapis = d.inks[1], k = ease(t / 1.2);
  const arch = "M560,940 L560,460 Q560,330 650,260 Q760,170 960,120 Q1160,170 1270,260 Q1360,330 1360,460 L1360,940 Z";
  return <>
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      <rect x={440} y={60} width={1040} height={920} fill="none" stroke={gold} strokeWidth={16} {...draw(t, 0, 1)} />
      <rect x={470} y={90} width={980} height={860} fill="none" stroke={lapis} strokeWidth={5} {...draw(t, 0.2, 1)} />
      <path d={arch} fill={d.inks[3] ?? "#e8dcc0"} fillOpacity={0.35 * k} stroke={gold} strokeWidth={10} {...draw(t, 0.3, 1.2)} />
      {Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (i / 12), x = 960 - Math.cos(a) * 380, yy = 470 - Math.sin(a) * 330;
        return <circle key={i} cx={x} cy={yy} r={20} fill="none" stroke={gold} strokeWidth={5} opacity={appear(t, 0.9 + i * 0.05, 0.3)} />; })}
      {[620, 1300].map((x) => <g key={x} opacity={appear(t, 1.3, 0.6)}><ellipse cx={x} cy={760} rx={34} ry={130} fill={d.inks[3] && d.dark ? d.inks[3] : "#2f5a3a"} /><rect x={x - 5} y={880} width={10} height={60} fill="#5a3a1a" /></g>)}
      <rect x={560} y={900} width={800} height={40} fill={gold} opacity={0.7 * k} />
    </svg>
    {P("maharaja", "confident", 820, 380, 560, 0.8)}
    {P("rani", "clasp", 600, 450, 460, 1.2)}
    {P("ancient_indian", "salute", 1110, 450, 460, 1.4, true)}
  </>;
};

/** Truck art: a truck drives in, then its painted back fills the frame: scalloped trim, HORN OK PLEASE, eyes and flowers */
const Truck: Sig = ({ t }) => {
  const d = useDNA(), cs = d.inks, k = ease((t - 1.6) / 0.6);
  return <>
    <At x={0} y={620}><L.Vehicle kind="truck" size={560} from={-700} to={260} dur={1.6} at={0} color={cs[0]} /></At>
    <div style={{ position: "absolute", left: 860, top: 140, width: 960, height: 720, transform: `scale(${0.6 + 0.4 * k})`, opacity: k, transformOrigin: "50% 100%" }}>
      <svg width={960} height={720} style={{ position: "absolute", inset: 0 }}>
        <rect x={0} y={0} width={960} height={720} rx={24} fill={cs[1]} stroke={d.ink} strokeWidth={8} />
        {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${i * 60} 0 h60 v34 a30 30 0 0 1 -60 0 Z`} fill={cs[i % 4]} stroke={d.ink} strokeWidth={3} />)}
        {Array.from({ length: 16 }, (_, i) => <circle key={`m${i}`} cx={i * 60 + 30} cy={30} r={8} fill="#fff" stroke={d.ink} strokeWidth={2} />)}
        {[300, 660].map((x) => <g key={x} transform={`translate(${x} 200)`}><ellipse rx={110} ry={56} fill="#fff" stroke={d.ink} strokeWidth={6} />
          <circle r={36} fill={cs[0]} /><circle r={16} fill={d.ink} /><path d="M-120,-60 Q0,-120 120,-60" fill="none" stroke={d.ink} strokeWidth={8} /></g>)}
        {[[120, 600], [480, 640], [840, 600]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${t * 40})`}>
          {Array.from({ length: 8 }, (_, j) => <ellipse key={j} cx={0} cy={-30} rx={16} ry={30} fill={cs[(i + j) % 4]} stroke={d.ink} strokeWidth={3} transform={`rotate(${j * 45})`} />)}
          <circle r={14} fill="#fff" stroke={d.ink} strokeWidth={3} /></g>)}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", fontFamily: fam(d.display), fontSize: 120, lineHeight: 1, color: "#fff",
        WebkitTextStroke: `6px ${d.ink}`, paintOrder: "stroke", letterSpacing: "0.02em" }}>HORN OK<br />PLEASE</div>
    </div>
  </>;
};

/** Ukiyo-e: the great wave curls over the boats, Fuji small and still behind it */
const Wave: Sig = ({ t }) => {
  const d = useDNA(), blue = bluest(d.inks), sway = Math.sin(t * 1.4) * 12, k = ease(t / 1.4);
  return <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    <path d="M1180,760 L1360,520 L1540,760 Z" fill={d.inks[2] ?? "#c8b48a"} opacity={appear(t, 0.2, 0.6)} />
    <path d="M1310,587 L1360,520 L1410,587 L1385,575 L1360,590 L1335,575 Z" fill="#fff" opacity={appear(t, 0.4, 0.6)} />
    <g transform={`translate(${(1 - k) * -300 + sway} ${(1 - k) * 120})`}>
      <path d="M0,1080 L0,760 C200,700 380,520 520,360 C640,230 820,200 900,300 C960,380 880,470 800,430 C860,520 980,500 1040,440 C1040,640 860,800 600,900 L600,1080 Z" fill={blue} stroke={d.ink} strokeWidth={6} />
      {Array.from({ length: 12 }, (_, i) => { const a = i / 11, x = 560 + a * 360, y = 330 - Math.sin(a * Math.PI) * 120;
        return <path key={i} d={`M${x},${y} q14,-34 34,-8 q-14,-6 -20,14`} fill="#fff" stroke={d.ink} strokeWidth={3} opacity={appear(t, 1 + i * 0.06, 0.3)} />; })}
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${120 + i * 90},${800 + i * 40} q90,-60 180,0`} fill="none" stroke="#fff" strokeWidth={5} opacity={0.8} />)}
    </g>
    {[[700, 860], [980, 900]].map(([x, y], i) => <path key={i} d={`M${x},${y + Math.sin(t * 2 + i) * 14} q120,40 240,0 l-30,30 q-90,20 -180,0 Z`} fill={d.inks[2] ?? "#e8d4a0"} stroke={d.ink} strokeWidth={4} />)}
    <rect x={1700} y={140} width={90} height={300} fill={d.inks[1]} opacity={appear(t, 1.5, 0.4)} />
    <text x={1745} y={200} fill="#fff" fontSize={46} textAnchor="middle" writingMode="tb" fontFamily={fam(d.display)} opacity={appear(t, 1.6, 0.4)}>北斎</text>
  </svg>;
};

/** Stained glass: a rose window lights up pane by pane, light pouring down from it */
const Rose: Sig = ({ t }) => {
  const d = useDNA(), cs = d.inks;
  const petal = (i: number, n: number, r0: number, r1: number) => { const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    return `M${r0 * Math.cos(a0)},${r0 * Math.sin(a0)} L${r1 * Math.cos(a0)},${r1 * Math.sin(a0)} A${r1},${r1} 0 0 1 ${r1 * Math.cos(a1)},${r1 * Math.sin(a1)} L${r0 * Math.cos(a1)},${r0 * Math.sin(a1)} A${r0},${r0} 0 0 0 ${r0 * Math.cos(a0)},${r0 * Math.sin(a0)} Z`; };
  return <>
    <L.LightRays x={960} y={480} rays={9} length={900} at={2.2} color={cs[2]} />
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
      <defs><filter id="rose-glow"><feGaussianBlur stdDeviation={6} /></filter></defs>
      <g transform="translate(960 480)">
        {Array.from({ length: 16 }, (_, i) => <path key={`o${i}`} d={petal(i, 16, 260, 400)} fill={cs[i % 4]} opacity={0.15 + 0.8 * appear(t, 0.2 + i * 0.09, 0.4)} stroke="#06050a" strokeWidth={10} />)}
        {Array.from({ length: 8 }, (_, i) => <path key={`m${i}`} d={petal(i, 8, 110, 260)} fill={cs[(i + 2) % 4]} opacity={0.15 + 0.8 * appear(t, 1.6 + i * 0.08, 0.4)} stroke="#06050a" strokeWidth={10} />)}
        <circle r={110} fill={cs[2]} opacity={0.2 + 0.8 * appear(t, 2.4, 0.5)} stroke="#06050a" strokeWidth={12} />
        <circle r={110} fill={cs[2]} opacity={0.6 * appear(t, 2.4, 0.5)} filter="url(#rose-glow)" />
        <circle r={402} fill="none" stroke={d.ink} strokeOpacity={0.5} strokeWidth={6} />
      </g>
    </svg>
  </>;
};

/** Bauhaus: the three primary shapes arrive and lock into a composition */
const Bauhaus: Sig = ({ t }) => {
  const d = useDNA(), [a, b, c] = d.inks, k = (at: number) => ease((t - at) / 0.6);
  return <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    <circle cx={700} cy={500} r={260 * k(0.2)} fill={a} />
    <rect x={900} y={300 + (1 - k(0.6)) * -500} width={420} height={420} fill={b} />
    <path d={`M${560},${900} L${860},${900} L${710},${900 - 260 * k(1)} Z`} fill={c} />
    <rect x={380} y={880} width={1160 * k(1.4)} height={24} fill={d.ink} />
    <text x={1360} y={860} fontFamily={fam(d.display)} fontSize={120} fill={d.ink} opacity={appear(t, 1.8, 0.4)}>FORM</text>
  </svg>;
};

/** Art deco: a gold sunburst fans open behind the year */
const Deco: Sig = ({ t }) => {
  const d = useDNA(), k = ease(t / 1.4);
  return <><svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    {Array.from({ length: 19 }, (_, i) => { const a = Math.PI + (i / 18) * Math.PI * k; return <line key={i} x1={960} y1={820} x2={960 + Math.cos(a) * 800} y2={820 + Math.sin(a) * 800} stroke={d.inks[0]} strokeWidth={i % 2 ? 3 : 8} />; })}
    {[220, 300, 380].map((r) => <path key={r} d={`M${960 - r},820 A${r},${r} 0 0 1 ${960 + r},820`} fill="none" stroke={d.inks[0]} strokeWidth={4} {...draw(t, 0.6, 1)} />)}
  </svg><Mid y={-80}><L.LettersFly text="1929" size={240} at={1.2} /></Mid></>;
};

/** Canvas: swirls of a night sky painted stroke by stroke, a crescent moon, a dark cypress */
const Swirls: Sig = ({ t }) => {
  const d = useDNA();
  return <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${120 + (i % 3) * 520},${220 + Math.floor(i / 3) * 210} c120,-120 300,-120 360,0 c40,90 -120,140 -200,60`} fill="none" stroke={i % 2 ? d.inks[1] : d.inks[2] ?? d.inks[0]} strokeWidth={26} strokeLinecap="round" {...draw(t, 0.2 + i * 0.2, 0.8)} />)}
    {[[420, 240], [980, 180], [1500, 300]].map(([x, y], i) => <g key={i} opacity={appear(t, 1 + i * 0.3, 0.4)}><circle cx={x} cy={y} r={46} fill={d.inks[2] ?? d.inks[0]} /><circle cx={x} cy={y} r={70} fill="none" stroke={d.inks[2] ?? d.inks[0]} strokeWidth={10} /></g>)}
    <path d="M1650,160 a80,80 0 1 0 60,130 a64,64 0 1 1 -60,-130 Z" fill={d.inks[0]} opacity={appear(t, 0.6, 0.5)} />
    <path d="M260,980 C220,700 300,520 330,360 C360,520 440,700 400,980 Z" fill={d.ink} opacity={appear(t, 1.4, 0.6)} />
  </svg>;
};

/** Sumi: the ensō, drawn in one breath, over distant ink mountains */
const Enso: Sig = ({ t }) => {
  const d = useDNA();
  return <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    <path d="M0,900 L320,640 L520,780 L780,560 L1040,800 L1300,620 L1600,820 L1920,700 L1920,1080 L0,1080 Z" fill={d.ink} opacity={0.12 * appear(t, 0.2, 1)} />
    <path d="M960,170 a330,330 0 1 1 -250,110" fill="none" stroke={d.ink} strokeWidth={56} strokeLinecap="round" {...draw(t, 0.6, 1.8)} />
    <rect x={1500} y={760} width={110} height={110} fill={d.inks[0]} opacity={appear(t, 2.6, 0.3)} />
  </svg>;
};

/** Contact sheet: a roll of twelve frames, numbered, and the editor circles the one to print */
const Sheet12: Sig = ({ t }) => {
  const d = useDNA();
  return <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    {Array.from({ length: 12 }, (_, i) => { const x = 250 + (i % 4) * 360, y = 180 + Math.floor(i / 4) * 250;
      return <g key={i} opacity={appear(t, 0.1 + i * 0.08, 0.3)}><rect x={x} y={y} width={320} height={210} fill={d.ink} opacity={0.85} />
        <rect x={x + 14} y={y + 14} width={292} height={182} fill={d.inks[(i + 1) % 4]} opacity={0.5} />
        <text x={x} y={y - 8} fontFamily={fam(d.mono ?? d.body)} fontSize={20} fill={d.ink}>{i + 12}A</text></g>; })}
    <ellipse cx={970} cy={535} rx={200} ry={140} fill="none" stroke={d.inks[0]} strokeWidth={10} {...draw(t, 1.6, 0.8)} />
    <text x={1190} y={440} fontFamily={fam(d.mono ?? d.body)} fontSize={44} fill={d.inks[0]} opacity={appear(t, 2.3, 0.3)}>PRINT ✓</text>
  </svg>;
};

/** Memphis: squiggles, dots and triangles bounce in round the words */
const Memphis: Sig = ({ t }) => {
  const d = useDNA(), b = (at: number) => Math.max(0, 1 + Math.sin((t - at) * 9) * Math.exp(-(t - at) * 3) * 0.3) * (t > at ? 1 : 0);
  return <><svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
    <path d="M200,260 q60,-60 120,0 t120,0 t120,0" fill="none" stroke={d.inks[0]} strokeWidth={18} strokeLinecap="round" {...draw(t, 0.1, 0.6)} />
    <g transform={`translate(1500 260) scale(${b(0.3)})`}><path d="M0,-90 L90,70 L-90,70 Z" fill={d.inks[1]} /></g>
    <g transform={`translate(360 820) scale(${b(0.5)})`}><circle r={90} fill={d.inks[2] ?? d.inks[0]} /></g>
    <g transform={`translate(1600 820) scale(${b(0.7)}) rotate(20)`}><rect x={-70} y={-70} width={140} height={140} fill="none" stroke={d.ink} strokeWidth={14} /></g>
    {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={1100 + (i % 6) * 40} cy={760 + Math.floor(i / 6) * 40} r={8} fill={d.ink} opacity={appear(t, 0.8 + i * 0.02, 0.2)} />)}
  </svg><Mid><KineticWords words={["SNACK", "TIME", "!"]} at={0.9} size={170} /></Mid></>;
};

/** signatures drawn in their own colours: folk art, glass and paint must not be tinted to the look's ink like a library block */
export const OWN_COLOURS = new Set(["madhubani", "mughal", "truckart", "kolam", "ukiyoe", "stainedglass", "bauhaus", "artdeco", "canvas", "sumi", "contactsheet", "memphis"]);

/* ---------------- every family: its signature ---------------- */
export const SIGNATURE: Record<string, Sig> = {
  // print
  paper: ({ t }) => <><At x={260} y={260}><Robot action="think" size={560} at={0.1} /></At><At x={980} y={280}><Lightbulb size={240} at={1} /></At>
    <At x={900} y={600}><L.Typewriter text="What is a neural network?" at={1.4} size={64} /></At></>,
  newspaper: () => <Mid><L.Headline paper="THE DAILY" date="5 JUNE 2024" headline="INDIA HAS VOTED" sub="The biggest election in history ends" at={0.1} w={1100} /></Mid>,
  magazine: () => <Mid><L.MagazineCover title="BREW" headline="The coffee issue" lines={["Ethiopia's first cup", "Why Finland drinks the most", "The perfect filter"]} at={0.1} w={620} /></Mid>,
  encyclopedia: () => <><At x={180} y={200}><L.BookPages title="Encyclopedia · Vol. III" at={0.1} w={760} pages={4} /></At>
    <At x={1080} y={300}><L.MuseumPlacard title="The Great Wall" date="7th century BC – 1644" text="Walls built over two thousand years to guard the north." at={1.2} w={660} /></At></>,
  zine: () => <><Mid y={-80}><KineticWords words={["PUNK'S", "NOT", "DEAD"]} at={0.2} size={190} /></Mid><At x={1350} y={680}><Stamp text="DIY" at={1.6} size={220} angle={-12} /></At></>,
  woodcut: () => <><Fill><L.Village at={0} /></Fill>{P("farmer", "carry", 820, 440, 460, 0.6)}</>,
  patent: () => <><At x={240} y={240}><Lightbulb size={460} at={0.2} /></At><At x={860} y={260}><L.Circuit w={860} h={520} at={0.8} close={1.6} /></At></>,
  manuscript: () => <Mid><OldPaper title="Liber Kells" text="In principio erat verbum, et verbum erat apud Deum. Painted by monks on calfskin, about 800 AD." at={0.1} w={1100} /></Mid>,
  receipt: () => <><At x={260} y={140}><L.Receipt title="MONTHLY BILL" lines={[["Rent", "₹18,000"], ["Groceries", "₹6,500"], ["Phone", "₹499"], ["Savings", "₹5,000"]]} total="₹29,999" at={0.1} w={560} /></At>
    <At x={1000} y={300}><L.CoinStack stacks={[2, 4, 8, 16]} at={1} size={90} /></At></>,
  dossier: () => <><At x={200} y={150}><L.CaseFile title="OPERATION MINCEMEAT" fields={[["Date", "30 April 1943"], ["Place", "Huelva, Spain"], ["Status", "Declassified"]]} at={0.1} w={760} /></At>
    <At x={1080} y={200}><Redacted title="SECRET · 1943" lines={8} at={1} w={620} /></At></>,
  scroll: () => <><Fill><L.Temple kind="columns" at={0} /></Fill>{P("roman_soldier", "salute", 760, 420, 480, 0.6)}{P("spartan", "hands_hips", 1080, 420, 480, 0.9, true)}</>,
  noir: () => <><Fill><L.CityNight at={0} /></Fill>{P("silhouette", "think", 260, 330, 620, 0.3)}
    <At x={940} y={380}><div style={{ background: "rgb(0 0 0 / 0.78)", padding: "34px 44px", width: 840 }}><L.Typewriter text="The ship was sailing. Nobody was on it." at={0.8} size={52} mono color="#ecebe6" /></div></At></>,
  contactsheet: Sheet12,
  // hand-drawn
  chalkboard: () => <Mid><Blackboard lines={["a² + b² = c²", "3² + 4² = 5²", "9 + 16 = 25  ✓"]} at={0.1} per={1.1} w={1500} h={760} /></Mid>,
  whiteboard: () => <Mid><L.ProcessSteps steps={["Idea", "Seed round", "Product", "Series A"]} at={0.2} per={0.6} w={1600} /></Mid>,
  sketchbook: () => <><At x={300} y={300}><L.Animal kind="bird" size={420} at={0.2} /></At>{Cr("bird", "path", 0, 0, 150, 0.6, [[900, 700], [1200, 400], [1500, 520], [1800, 260]])}
    <L.Handwrite text="studies of flight, 1505" x={900} y={820} size={64} at={1} /></>,
  fieldjournal: () => <><Fill><L.Forest at={0} /></Fill>{Cr("butterfly", "path", 0, 0, 160, 0.4, [[200, 700], [600, 400], [1000, 600], [1500, 300]])}<L.Handwrite text="Day 12: a swallowtail" x={1100} y={860} size={60} at={1.2} /></>,
  sumi: Enso,
  pinboard: () => <Mid><CorkBoard w={1500} h={760} at={0.1} items={[{ x: 120, y: 120, text: "3000 BC: the ditch" }, { x: 620, y: 80, text: "Bluestones: Wales" }, { x: 1100, y: 160, text: "2500 BC: sarsens" }, { x: 420, y: 460, text: "Who moved them?" }, { x: 980, y: 480, text: "240 km" }]}
    links={[[0, 1], [1, 2], [1, 4], [3, 4]]} /></Mid>,
  bulletjournal: () => <><At x={200} y={180}><L.HabitGrid title="Read 10 pages" days={28} missed={[5, 13]} at={0.1} w={760} /></At><At x={1060} y={220}><L.StickyNotes notes={["2-minute rule", "Start tiny", "Never miss twice"]} at={0.8} cols={1} size={44} /></At></>,
  notebook: () => <Mid><L.NotebookPage lines={["Ohm's law:", "V = I × R", "double R → half I", "unit of R: ohm (Ω)"]} at={0.1} per={0.8} mark={1} w={1300} h={760} /></Mid>,
  kraft: () => <>{P("village_woman", "present", 300, 300, 600, 0.2)}<At x={980} y={260}><L.Receipt title="HANDMADE" lines={[["Khadi scarf", "₹650"], ["Clay cup", "₹120"]]} total="₹770" at={0.8} w={520} /></At><At x={1350} y={640}><Stamp text="MADE BY HAND" at={1.8} size={150} angle={-8} /></At></>,
  cardboard: () => <><At x={260} y={260}><RobotArm action="weld" size={620} at={0.1} /></At><At x={1000} y={280}><L.Parcel size={420} at={0.8} inside="♻" /></At></>,
  // screen & tech
  darktech: () => <><At x={200} y={180}><L.CloudServers at={0.1} w={900} /></At><At x={1200} y={300}><Robot action="scan" size={520} at={0.5} /></At></>,
  terminal: () => <Mid><Terminal title="mark-ii@harvard" lines={[{ cmd: "run relay-test", out: "ERROR: relay #70 stuck" }, { cmd: "inspect relay 70", out: "found: 1 moth" }, { cmd: "log 'first actual case of bug'", out: "saved 9-SEP-1947 15:45" }]} at={0.1} per={0.9} w={1400} h={700} /></Mid>,
  keynote: () => <><Mid y={-120}><L.LettersFly text="Introducing" size={160} at={0.2} /></Mid><L.Sparkle x={560} y={560} w={800} h={260} count={30} at={1} /><At x={860} y={600}><L.Phone at={1.2} /></At></>,
  marketdesk: () => <><At x={200} y={160}><L.Candles data={[[100, 104, 99, 103], [103, 106, 101, 105], [105, 105, 98, 99], [99, 102, 97, 101], [101, 108, 100, 107], [107, 111, 106, 110], [110, 112, 104, 105], [105, 109, 104, 108]]} w={1500} h={620} at={0.1} per={0.25} /></At>
    <At x={0} y={860}><L.TickerTape items={[{ sym: "SENSEX", price: "80,050", change: 1.2 }, { sym: "NIFTY", price: "24,320", change: 0.8 }, { sym: "INR/USD", price: "83.4", change: -0.1 }, { sym: "GOLD", price: "71,900", change: 0.4 }]} at={0.3} w={1920} /></At></>,
  synthwave: () => <><Fill><L.CityNight at={0} /></Fill><At x={0} y={720}><L.Vehicle kind="car" size={420} from={-500} to={1500} dur={3} at={0.4} /></At><Mid y={-200}><L.LettersFly text="1985" size={200} at={0.6} /></Mid></>,
  blueprint: () => <><At x={260} y={200}><L.Building kind="tower" size={700} at={0.1} /></At><At x={1000} y={260}><L.Circuit w={760} h={480} at={0.8} close={1.8} /></At></>,
  arcade: () => <><At x={560} y={160}><L.Podium first="PAC-MAN" second="GALAGA" third="DIG DUG" at={0.1} w={800} /></At><At x={1460} y={260}><L.Trophy kind="gold" size={300} at={1.2} label="HIGH SCORE" /></At></>,
  y2k: () => <><Mid y={-60}><Countdown from={5} at={0.2} size={320} /></Mid><L.Confetti at={3.5} count={80} x={960} y={300} /></>,
  mission: () => <Fill><L.RocketLaunch at={0} count={3} stages={2} /></Fill>,
  spreadsheet: () => <><At x={200} y={120}><L.IndiaMap w={760} h={820} at={0.1} values={{ "Uttar Pradesh": 199.8, Maharashtra: 112.4, Bihar: 104.1, "West Bengal": 91.3, "Madhya Pradesh": 72.6, Rajasthan: 68.5, "Tamil Nadu": 72.1 }} legend="Population, millions (2011)" /></At>
    <At x={1060} y={260}><L.HBars data={[{ label: "Uttar Pradesh", value: 199.8 }, { label: "Maharashtra", value: 112.4 }, { label: "Bihar", value: 104.1 }, { label: "West Bengal", value: 91.3 }]} w={700} at={0.8} /></At></>,
  consulting: () => <Mid><L.Matrix2x2 x="Ease of use" y="Reach" quads={["Niche", "Winners", "Dead ends", "Promising"]} items={[{ label: "UPI", x: 0.85, y: 0.9 }, { label: "Cards", x: 0.4, y: 0.55 }, { label: "Cash", x: 0.7, y: 0.3 }, { label: "Wallets", x: 0.55, y: 0.65 }]} at={0.1} size={760} /></Mid>,
  clinic: () => <>{P("doctor_coat", "point", 240, 280, 600, 0.1)}<At x={940} y={260}><L.VitalsMonitor bpm={72} spo2={98} bp="120/80" at={0.6} w={800} /></At></>,
  warroom: () => <Mid><OldMap w={1500} h={820}><MapRoute stops={[[-1.2, 50.7], [-0.9, 49.4]]} at={0.4} dur={2} /><MapRoute stops={[[-0.1, 50.8], [-0.3, 49.35]]} at={0.8} dur={2} /></OldMap></Mid>,
  cosmos: () => <><Fill><L.Space at={0} /></Fill><Mid><L.SolarSystem w={1500} h={820} at={0.2} /></Mid></>,
  sports: () => <><Fill><L.Stadium at={0} /></Fill><At x={560} y={620}><L.CricketScore team="INDIA" runs={326} wickets={5} overs={50} at={0.6} w={800} /></At></>,
  satellite: () => <><At x={260} y={130}><L.WeatherMap w={1400} h={800} at={0.1} storm={[900, 420]} cities={[{ name: "Mumbai", x: 380, y: 520, temp: 31, icon: "rain" }, { name: "Kolkata", x: 1040, y: 380, temp: 33, icon: "storm" }, { name: "Delhi", x: 620, y: 180, temp: 38, icon: "sun" }]} /></At></>,
  // photo-led
  documentary: () => <><At x={0} y={420}><L.Crowd w={1920} rows={4} at={0.1} /></At><At x={160} y={160}><L.Typewriter text="August 1947. Fifteen million people on the move." at={0.6} size={58} /></At></>,
  collage: () => <>{P("musician", "cheer", 260, 260, 640, 0.1)}<At x={940} y={320}><L.Equalizer bars={24} w={820} h={420} at={0.4} /></At><Mid y={360}><KineticWords words={["BRONX", "1973"]} at={1.2} size={110} /></Mid></>,
  gallery: () => <><svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}><rect x={300} y={140} width={620} height={760} fill="none" stroke="#b8862a" strokeWidth={34} /></svg>
    <L.Seasons x={610} y={760} size={520} at={0.2} per={1} /><At x={1080} y={360}><L.MuseumPlacard title="Mona Lisa" date="c. 1503–1519" text="Oil on poplar. 77 × 53 cm. Stolen in 1911, found in 1913." at={1} w={640} /></At></>,
  constructivist: () => <><Mid y={-120}><KineticWords words={["ALL", "POWER", "TO", "THE", "PEOPLE"]} at={0.2} size={150} /></Mid><At x={0} y={720}><L.Crowd w={1920} rows={2} at={1.4} /></At></>,
  stencil: () => <><Mid y={-80}><KineticWords words={["ART", "IS", "NOT", "FOR", "SALE"]} at={0.2} size={160} /></Mid><At x={1400} y={660}><Stamp text="SHREDDED" at={2.2} size={170} angle={-10} /></At></>,
  vaporwave: () => <><Fill><L.Landscape at={0} /></Fill><Mid y={-120}><L.LettersFly text="A E S T H E T I C" size={130} at={0.4} /></Mid><L.Sparkle x={300} y={500} w={1300} h={300} count={40} at={1} /></>,
  diorama: () => <><Fill><L.Forest at={0} /></Fill><L.GrowPlant x={560} y={900} height={420} at={0.2} />{Cr("dragonfly", "dart", 1200, 420, 200, 0.5)}{Cr("snail", "crawl", 0, 0, 120, 0.8, [[1000, 900], [1500, 900]])}</>,
  atlas: () => <Mid><OldMap w={1500} h={820}><MapRoute stops={[[31.2, 30.0], [32.5, 15.6], [33.0, -1.0]]} at={0.3} dur={3} /></OldMap></Mid>,
  wildlife: () => <><Fill><L.Forest at={0} /></Fill><At x={520} y={460}><L.Animal kind="elephant" size={560} at={0.3} /></At><At x={1200} y={540}><L.Animal kind="lion" size={420} at={0.8} face={-1} /></At></>,
  ocean: () => <><Fill><L.Underwater at={0} /></Fill>{Cr("jellyfish", "swim", 0, 0, 260, 0.4, [[400, 800], [700, 500], [1100, 640], [1500, 380]])}{Cr("fish", "swim", 0, 0, 160, 0.8, [[1700, 300], [1200, 420], [800, 300], [200, 460]])}</>,
  topographic: () => <><Fill><L.Mountains at={0} /></Fill><At x={260} y={560}><L.Terrain heights={[1200, 2600, 4100, 5300, 6400, 8849, 7200, 5600]} labels={[{ at: 5, text: "Everest 8,849 m" }]} w={1400} h={380} at={0.6} unit=" m" /></At></>,
  // poster & art
  swiss: () => <Mid><KineticWords words={["FORM", "FOLLOWS", "FUNCTION"]} at={0.2} size={190} /></Mid>,
  bauhaus: Bauhaus,
  kinetic: () => <Mid><KineticWords words={["START.", "SHIP.", "REPEAT."]} at={0.2} per={0.5} size={220} /></Mid>,
  comic: () => <Conversation size={560} people={[{ avatar: "kid", name: "Riya" }, { avatar: "lab_scientist", name: "Dr Rao" }]}
    lines={[{ who: 0, text: "Why is the sky blue?", at: 0.3 }, { who: 1, text: "Air scatters blue light the most!", at: 1.8 }]} />,
  brutalist: () => <><At x={220} y={180}><L.Building kind="tower" size={720} at={0.1} /></At><At x={980} y={300}><KineticWords words={["RAW.", "CONCRETE.", "HONEST."]} at={0.8} size={120} /></At></>,
  isometric: () => <><At x={0} y={760}><L.Vehicle kind="truck" size={420} from={-500} to={1500} dur={3.2} at={0.4} /></At><At x={700} y={140}><RobotArm action="sort" size={600} at={0.2} /></At></>,
  flatvector: () => <><At x={300} y={120}><L.UpiPayment amount={250} to="Chai Point" at={0.2} h={820} /></At>{P("casual_girl", "thumbs_up", 1040, 280, 600, 1.4)}</>,
  artdeco: Deco,
  memphis: Memphis,
  neubrutal: () => <><Mid y={-100}><KineticWords words={["SHIP", "UGLY.", "SHIP", "FAST."]} at={0.2} size={170} /></Mid><At x={1480} y={640}><Lightbulb size={260} at={1.8} /></At></>,
  clay: () => <>{P("kid", "happy", 260, 300, 620, 0.2)}<At x={1000} y={300}><L.Microbe kind="bacteria" size={260} at={0.6} /></At><At x={1360} y={420}><L.Microbe kind="virus" size={220} at={0.9} /></At></>,
  midcentury: () => <><Fill><L.Space at={0} /></Fill><Mid><L.StarMap name="SPUTNIK · 1957" at={0.2} w={1400} h={760} stars={[[200, 300], [420, 220], [640, 360], [900, 260], [1150, 420], [1300, 200]]} lines={[[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]} /></Mid></>,
  transit: () => <Mid><L.MetroMap at={0.1} dur={1.5} ride={0} lines={[{ name: "Yellow", color: "#f0c030", stops: [{ name: "Samaypur Badli", x: 200, y: 200 }, { name: "Kashmere Gate", x: 700, y: 360 }, { name: "Rajiv Chowk", x: 900, y: 560 }, { name: "Huda City Centre", x: 1300, y: 820 }] },
    { name: "Blue", color: "#2a6ad9", stops: [{ name: "Dwarka", x: 150, y: 640 }, { name: "Rajiv Chowk", x: 900, y: 560 }, { name: "Noida City Centre", x: 1600, y: 480 }] }]} /></Mid>,
  travelposter: () => <><Fill><L.Landscape at={0} /></Fill><At x={0} y={240}><L.Vehicle kind="plane" size={360} from={-400} to={1700} dur={3.4} at={0.3} /></At><Mid y={200}><L.LettersFly text="KERALA" size={220} at={0.8} /></Mid></>,
  canvas: Swirls,
  pastel: () => <>{P("girl", "meditate", 760, 300, 600, 0.2)}<L.GrowPlant x={420} y={940} height={380} at={0.4} flower="#f07aa0" /><L.GrowPlant x={1500} y={940} height={320} at={0.8} flower="#7ab0e8" />{Cr("butterfly", "wander", 1300, 360, 160, 1)}</>,
  sunrise: () => <><Fill><L.Landscape at={0} /></Fill><L.LightRays x={960} y={760} rays={12} length={900} at={0.4} />{P("hiker", "victory", 820, 360, 520, 1)}</>,
  amphora: () => <><Fill><L.Temple kind="columns" at={0} /></Fill>{P("spartan", "leap", 760, 340, 560, 0.6)}<Mid y={380}><KineticWords words={["MARATHON", "→", "ATHENS"]} at={1.4} size={90} /></Mid></>,
  ukiyoe: Wave,
  stainedglass: Rose,
  papercut: () => <><Fill><L.Landscape at={0} /></Fill><L.Seasons x={960} y={900} size={620} at={0.2} per={1} labels />{Cr("butterfly", "path", 0, 0, 140, 0.8, [[200, 400], [700, 260], [1300, 380], [1800, 200]])}</>,
  // Indian & folk
  madhubani: Madhubani,
  mughal: Mughal,
  truckart: Truck,
  kolam: () => <><Mid y={40}><L.Rangoli size={600} at={0.1} rings={5} /></Mid>
    {[[300, 760], [560, 840], [1300, 840], [1560, 760]].map(([x, y], i) => <At key={i} x={x - 80} y={y - 120}><L.Diya size={170} at={1 + i * 0.2} /></At>)}
    <L.Handwrite text="Happy Pongal" x={760} y={110} size={80} at={2} /></>,
  ncert: () => <><Fill><L.Classroom board="Ch. 7 · Photosynthesis" at={0} /></Fill><L.GrowPlant x={1400} y={900} height={460} at={0.6} />
    <L.PointerLabel x={1400} y={560} text="Fig. 7.1: leaf makes food" dx={-260} dy={-120} at={2} /></>,
};
