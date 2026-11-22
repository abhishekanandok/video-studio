/* 2D experiment, a short explainer film: "Where your chai comes from". Different scenes for different steps, but ONE
   continuous world (a hillside in Assam, the factory, the Guwahati auction, the highway, a chai stall, laid out on one
   long strip the camera travels along) and ONE jointed character rig, used for Ravi and, in other clothes, for
   everyone else. Motion follows rules: steps come from the distance walked, rollers turn at the belt's speed, wheels at
   the truck's. All drawn in SVG; the narration and the code-made ambience are in public/twodemo/chai. */

import { loadFont } from "@remotion/google-fonts/Baloo2";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import VOICE from "../../public/twodemo/chai/voice.json";

export const FPS = 30;
export const SECONDS = 64;
const W = 1920, H = 1080;
const { fontFamily } = loadFont("normal", { weights: ["600"] });

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const seeded = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const D2R = Math.PI / 180;

/* ---------------- the narration ---------------- */
type Line = { audio: string; seconds: number; text: string };
const WANT = [1.2, 7.6, 16.4, 23.8, 31.4, 39.8, 48.4, 57];
const LINES: (Line & { at: number })[] = [];
(VOICE as Line[]).forEach((v, i) => {
  const prev = LINES[i - 1];
  LINES.push({ ...v, at: Math.max(WANT[i] ?? 0, prev ? prev.at + prev.seconds + 0.35 : 0) });
});

/* ---------------- the world strip: where each station is ---------------- */
const HILL = 1200, FACTORY = 4000, AUCTION = 6900, ROAD0 = 8600, ROAD1 = 10900, STALL = 12100;
const PALETTE = { sky: "#f6e7c8", sky2: "#cfe6ea", ink: "#3b2a22", leaf: "#3f8a3a", leaf2: "#5fae4b", bud: "#cfe8b0", soil: "#a8794c", wall: "#efe2c8", wall2: "#e2d0ad", steel: "#8b97a3", rust: "#b5532a", cream: "#f8f1e2", tea: "#6b3a1f", copper: "#a65a2a" };

/* the camera: where it looks (world x, y) and how close, through the film */
type Shot = { at: number; x: number; y: number; z: number };
const SHOTS: Shot[] = [
  { at: 0, x: HILL - 300, y: -320, z: 0.72 }, // the hillside, wide
  { at: 5.5, x: HILL + 260, y: -170, z: 1.25 }, // the pluckers
  { at: 11.2, x: HILL + 470, y: -300, z: 3.0 }, // close: two leaves and a bud in Ravi's hand
  { at: 15.2, x: HILL + 420, y: -200, z: 1.2 },
  { at: 16.6, x: FACTORY - 450, y: -230, z: 1.05 }, // the factory: wilting, then the rollers
  { at: 21.5, x: FACTORY + 150, y: -230, z: 1.15 },
  { at: 24.5, x: FACTORY + 850, y: -230, z: 1.15 }, // oxidising and drying
  { at: 30.6, x: FACTORY + 900, y: -230, z: 1.1 },
  { at: 32.2, x: AUCTION, y: -250, z: 1.05 }, // the auction
  { at: 38.6, x: AUCTION + 60, y: -250, z: 1.1 },
  { at: 40.3, x: ROAD0 + 200, y: -230, z: 1.0 }, // the highway (the camera follows the truck from here)
  { at: 47.6, x: ROAD1 - 100, y: -230, z: 1.0 },
  { at: 49.2, x: STALL, y: -240, z: 1.15 }, // the chai stall
  { at: 55.5, x: STALL + 120, y: -230, z: 1.9 }, // close on the cup
  { at: 60, x: STALL - 80, y: -300, z: 0.85 }, // pull back
];
function camera(t: number, truckX: number) {
  let k = 0;
  while (k + 1 < SHOTS.length && t >= SHOTS[k + 1].at) k++;
  const a = SHOTS[k], b = SHOTS[Math.min(k + 1, SHOTS.length - 1)];
  const span = k + 1 < SHOTS.length ? b.at - a.at : 1;
  const p = ease((t - a.at - Math.max(0, span - 1.6)) / Math.min(1.6, span)); // hold, then glide into the next shot
  const follow = t > 40.3 && t < 47.6 ? truckX - 40 : null; // on the highway the camera rides with the truck
  return { x: follow ?? lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), z: lerp(a.z, b.z, p) };
}

/* ---------------- one jointed character, side view (facing right; face -1 faces left) ---------------- */
type Look = { skin: string; top: string; bottom: string; hair: string; scarf?: string; saree?: string; lungi?: boolean; mustache?: boolean; basket?: boolean; height: number };
type Pose = { thighF: number; shinF: number; thighB: number; shinB: number; armF: number; foreF: number; armB: number; foreB: number; lean: number; head: number; drop: number };
const STAND: Pose = { thighF: 0, shinF: 0, thighB: 0, shinB: 0, armF: 6, foreF: 10, armB: -6, foreB: 8, lean: 0, head: 0, drop: 0 };
const mixPose = (a: Pose, b: Partial<Pose>, w: number): Pose => {
  const out = { ...a };
  (Object.keys(b) as (keyof Pose)[]).forEach((k) => { out[k] = lerp(a[k], b[k] as number, clamp(w)); });
  return out;
};
const walkPose = (phase: number, moving: number): Pose => {
  const s = Math.sin(phase) * moving;
  return { ...STAND, thighF: 24 * s, shinF: -Math.max(0, -s) * 38, thighB: -24 * s, shinB: -Math.max(0, s) * 38, armF: -20 * s + 4, foreF: 14, armB: 20 * s - 4, foreB: 12, lean: 3 * moving, head: 0, drop: -Math.abs(s) * 4 };
};

const RAVI: Look = { skin: "#9c6a45", top: "#f6ecd6", bottom: "#fbf7ee", hair: "#22170f", scarf: "#e0782c", height: 250 };
const PLUCKER: Look = { skin: "#8a5a3a", top: "#d9493a", bottom: "#2f8f5b", hair: "#1c120c", saree: "#2f8f5b", basket: true, height: 290 };
const TASTER: Look = { skin: "#a8724c", top: "#ffffff", bottom: "#4a5568", hair: "#2a2a2a", height: 300 };
const BUYER: Look = { skin: "#8f6142", top: "#6c8ebf", bottom: "#3d3d4e", hair: "#1e1e1e", height: 295 };
const CHAIWALA: Look = { skin: "#7d5234", top: "#f2f2ea", bottom: "#3f6db5", hair: "#2b2018", lungi: true, mustache: true, height: 300 };

function Limb({ x, y, angle, len, w, color, children }: { x: number; y: number; angle: number; len: number; w: number; color: string; children?: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${-angle})`}>
      <rect x={-w / 2} y={-w / 2} width={w} height={len + w / 2} rx={w / 2} fill={color} />
      <g transform={`translate(0 ${len})`}>{children}</g>
    </g>
  );
}

function Person({ x, y, face = 1, look, pose }: { x: number; y: number; face?: number; look: Look; pose: Pose }) {
  const h = look.height, hip = h * 0.5 + pose.drop, sh = h * 0.79 + pose.drop;
  const thigh = h * 0.245, shin = h * 0.235, up = h * 0.17, fore = h * 0.16, lw = h * 0.072, aw = h * 0.058;
  const legColor = look.saree ? look.skin : look.bottom;
  const leg = (thighA: number, shinA: number, shade: number) => (
    <Limb x={0} y={-hip} angle={thighA} len={thigh} w={lw} color={shadeOf(legColor, shade)}>
      <Limb x={0} y={0} angle={shinA} len={shin} w={lw * 0.9} color={shadeOf(legColor, shade)}>
        <ellipse cx={h * 0.03} cy={lw * 0.25} rx={h * 0.05} ry={h * 0.02} fill={shadeOf("#3b2a22", shade)} />
      </Limb>
    </Limb>
  );
  const arm = (a: number, f: number, shade: number, hand?: React.ReactNode) => (
    <Limb x={0} y={-sh} angle={a} len={up} w={aw} color={shadeOf(look.top, shade)}>
      <Limb x={0} y={0} angle={f} len={fore} w={aw * 0.85} color={shadeOf(look.skin, shade)}>
        <circle r={aw * 0.62} fill={shadeOf(look.skin, shade)} />
        {hand}
      </Limb>
    </Limb>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${face} 1)`}>
      <ellipse cx={0} cy={2} rx={h * 0.17} ry={h * 0.022} fill="rgba(40,25,10,0.18)" />
      {arm(pose.armB, pose.foreB, -0.18)}
      {leg(pose.thighB, pose.shinB, -0.18)}
      {leg(pose.thighF, pose.shinF, 0)}
      <g transform={`translate(0 ${-hip}) rotate(${-pose.lean}) translate(0 ${hip})`}>
        {look.basket && <path d={`M ${-h * 0.2} ${-sh + 6} L ${-h * 0.09} ${-sh + 10} L ${-h * 0.1} ${-hip + 6} L ${-h * 0.24} ${-hip + 2} Z`} fill="#c99a52" stroke="#8a6232" strokeWidth={3} />}
        {look.saree ? (
          <path d={`M ${-h * 0.1} ${-sh} Q ${h * 0.12} ${-sh} ${h * 0.11} ${-hip} L ${h * 0.15} ${-h * 0.04} L ${-h * 0.13} ${-h * 0.04} L ${-h * 0.11} ${-hip} Z`} fill={look.saree} />
        ) : (
          <rect x={-h * 0.095} y={-sh - h * 0.02} width={h * 0.19} height={sh - hip + h * (look.lungi ? 0.05 : 0.14)} rx={h * 0.05} fill={look.top} />
        )}
        {look.lungi && <path d={`M ${-h * 0.1} ${-hip + 4} L ${h * 0.1} ${-hip + 4} L ${h * 0.12} ${-h * 0.12} L ${-h * 0.12} ${-h * 0.12} Z`} fill={look.bottom} />}
        {look.lungi && Array.from({ length: 4 }, (_, i) => <line key={i} x1={-h * 0.1 + i * h * 0.06} y1={-hip + 4} x2={-h * 0.11 + i * h * 0.065} y2={-h * 0.12} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={3} />)}
        {look.scarf && <path d={`M ${-h * 0.09} ${-sh + 2} L ${h * 0.08} ${-sh + 4} L ${-h * 0.04} ${-hip + h * 0.06} Z`} fill={look.scarf} />}
        {look.saree && <path d={`M ${-h * 0.1} ${-sh + 2} Q ${-h * 0.02} ${-sh - h * 0.12} ${h * 0.07} ${-sh - h * 0.04}`} stroke={look.top} strokeWidth={h * 0.05} fill="none" />}
        {/* head */}
        <g transform={`translate(${h * 0.01} ${-sh - h * 0.115}) rotate(${-pose.head})`}>
          <rect x={-h * 0.03} y={h * 0.05} width={h * 0.06} height={h * 0.05} fill={look.skin} />
          <circle r={h * 0.088} fill={look.skin} />
          <path d={`M ${h * 0.085} ${-h * 0.005} q ${h * 0.03} ${h * 0.02} ${-h * 0.005} ${h * 0.03}`} fill={look.skin} />
          <path d={`M ${-h * 0.092} ${h * 0.01} A ${h * 0.092} ${h * 0.092} 0 0 1 ${h * 0.085} ${-h * 0.03} Q ${h * 0.02} ${-h * 0.05} ${-h * 0.03} ${-h * 0.015} Q ${-h * 0.06} ${h * 0.03} ${-h * 0.092} ${h * 0.01} Z`} fill={look.hair} />
          {look.saree && <path d={`M ${-h * 0.11} ${h * 0.07} Q ${-h * 0.12} ${-h * 0.11} ${h * 0.04} ${-h * 0.1} Q ${-h * 0.05} ${-h * 0.03} ${-h * 0.06} ${h * 0.09} Z`} fill={look.top} />}
          <circle cx={h * 0.045} cy={-h * 0.008} r={h * 0.011} fill="#1a120c" />
          <path d={`M ${h * 0.025} ${-h * 0.03} l ${h * 0.035} ${-h * 0.004}`} stroke={look.hair} strokeWidth={h * 0.008} strokeLinecap="round" />
          {look.mustache && <path d={`M ${h * 0.04} ${h * 0.035} q ${h * 0.035} ${-h * 0.012} ${h * 0.055} ${h * 0.006}`} stroke={look.hair} strokeWidth={h * 0.014} fill="none" strokeLinecap="round" />}
          <path d={`M ${h * 0.045} ${h * 0.05} q ${h * 0.02} ${h * 0.01} ${h * 0.035} 0`} stroke="#5a2e22" strokeWidth={h * 0.007} fill="none" strokeLinecap="round" />
          <circle cx={-h * 0.012} cy={h * 0.005} r={h * 0.018} fill={shadeOf(look.skin, -0.1)} />
        </g>
        {arm(pose.armF, pose.foreF, 0)}
      </g>
    </g>
  );
}
function shadeOf(hex: string, k: number): string { // darker (k < 0) for the far limbs
  const n = parseInt(hex.slice(1), 16), f = 1 + k;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/* ---------------- the stations ---------------- */
function TeaBush({ x, y, s = 1, sway = 0 }: { x: number; y: number; s?: number; sway?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={-38} rx={78} ry={44} fill={PALETTE.leaf} />
      <ellipse cx={-30 + sway} cy={-58} rx={42} ry={26} fill={PALETTE.leaf2} />
      <ellipse cx={28 + sway} cy={-60} rx={40} ry={24} fill={PALETTE.leaf2} />
      {Array.from({ length: 7 }, (_, i) => <circle key={i} cx={-60 + i * 20 + sway} cy={-76 + Math.sin(i * 1.7) * 6} r={5} fill={PALETTE.bud} />)}
    </g>
  );
}

function Shoot({ x, y, s = 1, glow = 0 }: { x: number; y: number; s?: number; glow?: number }) { // two leaves and a bud
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 0 0 L 0 -46" stroke="#5d8f3a" strokeWidth={3} />
      <path d="M 0 -18 C -22 -22 -34 -40 -30 -56 C -14 -50 -4 -36 0 -18 Z" fill="#3f8a3a" />
      <path d="M 0 -30 C 20 -34 32 -52 28 -66 C 12 -60 2 -46 0 -30 Z" fill="#4b9a41" />
      <ellipse cx={0} cy={-56} rx={6} ry={13} fill="#cfe8b0" stroke="#a9cf86" strokeWidth={1.5} />
      {glow > 0 && <circle cx={0} cy={-40} r={44} fill="none" stroke="#fff6c8" strokeWidth={3} opacity={glow * 0.8} />}
    </g>
  );
}

function Hillside({ t }: { t: number }) {
  const sway = Math.sin(t * 1.3) * 3;
  return (
    <g>
      <path d={`M ${HILL - 1700} 0 C ${HILL - 900} -260 ${HILL - 300} -380 ${HILL + 600} -300 C ${HILL + 1100} -250 ${HILL + 1500} -120 ${HILL + 1900} 0 Z`} fill="#77b85c" />
      {Array.from({ length: 5 }, (_, r) => Array.from({ length: 9 }, (_, c) => {
        const bx = HILL - 1100 + c * 230 + (r % 2) * 110, by = -40 - r * 55 - Math.max(0, 260 - Math.abs(bx - HILL) * 0.22) * (r / 5);
        return bx < HILL + 1400 ? <TeaBush key={`${r}-${c}`} x={bx} y={by} s={0.9 - r * 0.08} sway={sway} /> : null;
      }))}
      {Array.from({ length: 6 }, (_, i) => <TeaBush key={`f${i}`} x={HILL - 700 + i * 300} y={6} s={1.25} sway={sway} />)}
      {/* shade trees, as on Assam estates */}
      {[-900, -150, 700].map((tx, i) => (
        <g key={i} transform={`translate(${HILL + tx} ${-230 - i * 20})`}>
          <rect x={-8} y={-160} width={16} height={160} fill="#7a5a3a" />
          <ellipse cx={0} cy={-170} rx={110} ry={34} fill="#4f9a44" />
          <ellipse cx={-30} cy={-195} rx={70} ry={24} fill="#64ad53" />
        </g>
      ))}
    </g>
  );
}

function Factory({ t }: { t: number }) {
  const belt = t * 140; // the belt's travel in px: everything on it, and the rollers, move by this
  const rollerA = (belt / 46) / D2R; // a roller of radius 46 turns by distance / radius
  const x0 = FACTORY - 700;
  return (
    <g>
      <rect x={FACTORY - 1100} y={-640} width={2600} height={640} fill={PALETTE.wall} />
      <rect x={FACTORY - 1100} y={-640} width={2600} height={40} fill={PALETTE.wall2} />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={FACTORY - 1000 + i * 290} y={-560} width={150} height={110} rx={8} fill="#cfe3ea" stroke={PALETTE.wall2} strokeWidth={8} />)}
      {/* 1. wilting trough with a slow fan */}
      <rect x={x0 - 260} y={-150} width={360} height={110} rx={10} fill="#9a7a56" />
      {Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx={x0 - 230 + i * 24} cy={-152 + Math.sin(i) * 4} rx={16} ry={9} fill={i % 2 ? "#6f9a48" : "#7da650"} />)}
      <g transform={`translate(${x0 - 330} -95) rotate(${t * 220})`}>{[0, 120, 240].map((a) => <ellipse key={a} cx={0} cy={-22} rx={9} ry={22} fill={PALETTE.steel} transform={`rotate(${a})`} />)}</g>
      {/* 2. the conveyor into the rollers (crush, tear, curl) */}
      <rect x={x0 + 120} y={-118} width={780} height={22} rx={11} fill="#55606b" />
      {Array.from({ length: 26 }, (_, i) => {
        const px = x0 + 120 + ((i * 60 + belt) % 1560);
        if (px > x0 + 880) return null; // the rollers take them
        return <ellipse key={i} cx={px} cy={-128} rx={14} ry={8} fill={PALETTE.leaf2} />;
      })}
      <g transform={`translate(${x0 + 920} -150)`}>
        <rect x={-90} y={-120} width={180} height={230} rx={14} fill={PALETTE.steel} />
        {[-1, 1].map((sd) => (
          <g key={sd} transform={`translate(0 ${sd * 44}) rotate(${sd * rollerA})`}>
            <circle r={46} fill="#c7cfd6" stroke="#55606b" strokeWidth={6} />
            {Array.from({ length: 10 }, (_, k) => <rect key={k} x={-5} y={-50} width={10} height={14} fill="#55606b" transform={`rotate(${k * 36})`} />)}
          </g>
        ))}
      </g>
      {/* 3. the oxidising bed: beads turn from green to copper as they travel */}
      <rect x={x0 + 1030} y={-118} width={560} height={22} rx={11} fill="#55606b" />
      {Array.from({ length: 40 }, (_, i) => {
        const px = x0 + 1030 + ((i * 28 + belt * 0.5) % 1120);
        if (px > x0 + 1590) return null;
        const p = (px - (x0 + 1030)) / 560;
        const c = p < 0.5 ? mixHex("#6f9a48", PALETTE.copper, p * 2) : mixHex(PALETTE.copper, "#7a3f1e", (p - 0.5) * 2);
        return <circle key={i} cx={px} cy={-126 - (i % 3) * 5} r={6} fill={c} />;
      })}
      {/* 4. the dryer: heat shimmering out, dark beads into the sack */}
      <g transform={`translate(${x0 + 1720} -170)`}>
        <rect x={-110} y={-150} width={220} height={250} rx={16} fill={PALETTE.rust} />
        <rect x={-80} y={-110} width={160} height={70} rx={10} fill="#ffb15c" opacity={0.75 + Math.sin(t * 6) * 0.1} />
        {Array.from({ length: 4 }, (_, k) => <path key={k} d={`M ${-60 + k * 40} -160 q 10 -18 0 -36 q -10 -18 0 -36`} stroke="#f6b26b" strokeWidth={5} fill="none" opacity={0.6} transform={`translate(0 ${-((t * 40 + k * 20) % 50)})`} />)}
      </g>
      <path d={`M ${x0 + 1860} -40 L ${x0 + 1880} -150 L ${x0 + 2000} -150 L ${x0 + 2020} -40 Z`} fill="#d9c3a0" stroke="#a88a60" strokeWidth={5} />
      {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={x0 + 1900 + (i % 4) * 26} cy={-150 - Math.floor(i / 4) * 10} r={6} fill={PALETTE.tea} />)}
      <rect x={FACTORY - 1100} y={0} width={2600} height={260} fill="#c9b08a" />
    </g>
  );
}
function mixHex(a: string, b: string, p: number): string {
  const n = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [x, y] = [n(a), n(b)];
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(p)))).join(",")})`;
}

function Auction({ t }: { t: number }) {
  const strike = t > 36.2 && t < 36.7 ? Math.sin(((t - 36.2) / 0.5) * Math.PI) : 0;
  return (
    <g>
      <rect x={AUCTION - 1100} y={-660} width={2200} height={660} fill="#e9dcc2" />
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={AUCTION - 1000 + i * 380} y={-600} width={20} height={600} fill="#d8c6a2" />)}
      {/* the tasting table with its row of white cups and little heaps of tea */}
      <rect x={AUCTION - 760} y={-170} width={620} height={26} rx={8} fill="#8a5a36" />
      <rect x={AUCTION - 740} y={-144} width={20} height={144} fill="#7a4e2e" /><rect x={AUCTION - 180} y={-144} width={20} height={144} fill="#7a4e2e" />
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i} transform={`translate(${AUCTION - 720 + i * 100} -170)`}>
          <path d="M -20 0 L -16 -30 L 16 -30 L 20 0 Z" fill="#ffffff" stroke="#d6d0c4" strokeWidth={2} />
          <ellipse cx={0} cy={-30} rx={16} ry={4} fill="#9a5a2a" />
          <ellipse cx={36} cy={-4} rx={14} ry={5} fill={PALETTE.tea} />
          <path d={`M -4 -36 q 6 -14 0 -26`} stroke="#ffffff" strokeWidth={3} fill="none" opacity={0.5} transform={`translate(0 ${-((t * 20 + i * 8) % 16)})`} />
        </g>
      ))}
      {/* the auctioneer's desk, and the gavel striking on "auction" */}
      <rect x={AUCTION + 280} y={-240} width={300} height={240} rx={10} fill="#7a4e2e" />
      <g transform={`translate(${AUCTION + 470} -244) rotate(${-40 + strike * 40})`}>
        <rect x={-6} y={-70} width={12} height={70} fill="#5a3a22" /><rect x={-26} y={-92} width={52} height={28} rx={6} fill="#5a3a22" />
      </g>
      {/* rows of buyers' benches */}
      <rect x={AUCTION - 60} y={-120} width={300} height={22} rx={8} fill="#9a6a42" />
      <rect x={AUCTION + 85} y={-64} width={60} height={14} rx={5} fill="#8a5a36" /><rect x={AUCTION + 92} y={-50} width={10} height={50} fill="#6b4329" /><rect x={AUCTION + 128} y={-50} width={10} height={50} fill="#6b4329" />
      <rect x={AUCTION + 700} y={-120} width={360} height={22} rx={8} fill="#9a6a42" />
      <rect x={AUCTION - 1100} y={0} width={2200} height={260} fill="#bfa47c" />
    </g>
  );
}

function Highway({ t, truckX, wheelA }: { t: number; truckX: number; wheelA: number }) {
  const city = clamp((truckX - ROAD0) / (ROAD1 - ROAD0));
  return (
    <g>
      <rect x={ROAD0 - 900} y={-40} width={ROAD1 - ROAD0 + 1800} height={40} fill="#d6c7a6" />
      <rect x={ROAD0 - 900} y={0} width={ROAD1 - ROAD0 + 1800} height={150} fill="#5c5c62" />
      {Array.from({ length: 40 }, (_, i) => <rect key={i} x={ROAD0 - 900 + i * 110} y={68} width={60} height={10} rx={5} fill="#f2e9d0" />)}
      {Array.from({ length: 12 }, (_, i) => { // milestones: one every few hundred px
        const mx = ROAD0 - 700 + i * 300;
        return <g key={i} transform={`translate(${mx} -40)`}><rect x={-14} y={-52} width={28} height={52} rx={12} fill="#f4f1e8" /><rect x={-14} y={-52} width={28} height={18} rx={12} fill="#e8a33c" /></g>;
      })}
      {/* the land changes from hills to plains to the city as the truck goes (behind the truck) */}
      <g opacity={1 - city}>{Array.from({ length: 8 }, (_, i) => <path key={i} d={`M ${ROAD0 - 600 + i * 420} -40 q 120 -${140 + (i % 3) * 40} 260 0 Z`} fill="#8fbf74" />)}</g>
      <g opacity={city}>{Array.from({ length: 14 }, (_, i) => <rect key={i} x={ROAD0 + 300 + i * 190} y={-40 - (120 + seeded(i) * 220)} width={150} height={120 + seeded(i) * 220} fill={["#d9b28a", "#c98f6c", "#e6cfa6", "#b98466"][i % 4]} />)}</g>
      {/* the truck: cab with Ravi at the window, the load of tea sacks; wheels turn by distance / radius */}
      <g transform={`translate(${truckX} 40)`}>
        <rect x={-300} y={-210} width={330} height={170} rx={10} fill="#e46a2e" />
        {Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx={-260 + (i % 3) * 100} cy={-226 - Math.floor(i / 3) * 34} rx={52} ry={24} fill="#d9c3a0" stroke="#a88a60" strokeWidth={3} />)}
        <path d="M 40 -40 L 40 -190 L 150 -190 L 200 -120 L 200 -40 Z" fill="#2f6db5" />
        <path d="M 60 -175 L 140 -175 L 182 -122 L 60 -122 Z" fill="#cfe6f2" />
        <g transform="translate(110 -120)">
          <circle cx={0} cy={-26} r={22} fill={RAVI.skin} />
          <path d="M -22 -24 A 22 22 0 0 1 20 -34 Q 4 -38 -6 -30 Q -14 -20 -22 -24 Z" fill={RAVI.hair} />
          <circle cx={11} cy={-28} r={3} fill="#1a120c" />
          <path d={`M 8 -16 q 5 3 9 0`} stroke="#5a2e22" strokeWidth={2} fill="none" />
        </g>
        <rect x={-310} y={-50} width={520} height={18} rx={6} fill="#3b3b40" />
        {[-220, -60, 150].map((wx) => (
          <g key={wx} transform={`translate(${wx} -28) rotate(${wheelA})`}>
            <circle r={36} fill="#2b2b2f" /><circle r={16} fill="#9aa3ab" />
            {[0, 60, 120].map((a) => <rect key={a} x={-3} y={-30} width={6} height={60} fill="#55606b" transform={`rotate(${a})`} />)}
          </g>
        ))}
        {Array.from({ length: 5 }, (_, k) => <circle key={k} cx={-320 - k * 26 - ((t * 120) % 26)} cy={-50 - k * 6} r={10 + k * 4} fill="#bdb5a6" opacity={0.35 - k * 0.06} />)}
      </g>
    </g>
  );
}

function Stall({ t }: { t: number }) {
  const boil = Math.sin(t * 9) * 0.5 + 0.5;
  return (
    <g>
      <rect x={STALL - 1200} y={0} width={2400} height={260} fill="#c9b08a" />
      {/* the stall: a striped tarp, the counter, the stove and the pot */}
      <rect x={STALL - 420} y={-420} width={16} height={420} fill="#6b4a2f" /><rect x={STALL + 300} y={-420} width={16} height={420} fill="#6b4a2f" />
      <path d={`M ${STALL - 470} -400 L ${STALL + 360} -400 L ${STALL + 320} -470 L ${STALL - 430} -470 Z`} fill="#2f8f5b" />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M ${STALL - 450 + i * 100} -400 l 50 0 l -6 -70 l -50 0 Z`} fill="#f2e9d0" opacity={0.85} />)}
      <rect x={STALL - 400} y={-190} width={520} height={190} rx={8} fill="#8a5a36" />
      <rect x={STALL - 400} y={-200} width={520} height={20} rx={6} fill="#6b4329" />
      <g transform={`translate(${STALL - 120} -200)`}>
        <rect x={-60} y={-30} width={120} height={30} rx={6} fill="#3b3b40" />
        {Array.from({ length: 5 }, (_, k) => <path key={k} d={`M ${-40 + k * 20} -30 q 6 -${18 + Math.sin(t * 14 + k) * 8} 0 -${30 + Math.sin(t * 11 + k * 2) * 10}`} fill="#ff9f2e" opacity={0.85} />)}
        <path d="M -70 -40 L -60 -120 L 60 -120 L 70 -40 Z" fill="#9aa3ab" stroke="#6f7881" strokeWidth={4} />
        <ellipse cx={0} cy={-120} rx={62} ry={12} fill="#c8854a" />
        {Array.from({ length: 4 }, (_, k) => <circle key={k} cx={-30 + k * 20} cy={-122 - boil * 4} r={4 + boil * 2} fill="#e0b07a" />)}
        {Array.from({ length: 4 }, (_, k) => <path key={k} d={`M ${-30 + k * 22} -140 q 12 -24 0 -48 q -12 -24 0 -48`} stroke="#ffffff" strokeWidth={6} fill="none" opacity={0.35} transform={`translate(0 ${-((t * 30 + k * 18) % 40)})`} />)}
      </g>
      {/* glasses on the counter */}
      {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M ${STALL + 20 + i * 40} -200 l 4 -40 l 24 0 l 4 40 Z`} fill="#e9d2b0" stroke="#bfa47c" strokeWidth={2} />)}
      {/* a few customers' bicycles and a bench */}
      <rect x={STALL + 420} y={-90} width={300} height={16} rx={6} fill="#7a4e2e" />
      <rect x={STALL + 440} y={-74} width={14} height={74} fill="#6b4329" /><rect x={STALL + 690} y={-74} width={14} height={74} fill="#6b4329" />
    </g>
  );
}

/* ---------------- the film ---------------- */
export const Chai2D: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  // the truck drives from the start of the highway to its end between 39.8 s and 48 s; its wheels turn by the distance
  const drive = (tt: number) => lerp(ROAD0 - 200, ROAD1 + 100, ease((tt - 39.8) / 8.2));
  const truckX = drive(t);
  const wheelA = ((truckX - drive(0)) / 36) / D2R;
  const cam = camera(t, truckX);

  // Ravi in each station: walking in (steps from distance), then a pose that does the scene's verb
  const walkIn = (tt: number, t0: number, t1: number, x0: number, x1: number) => {
    const p = ease((tt - t0) / (t1 - t0));
    const x = lerp(x0, x1, p);
    const moving = tt > t0 && tt < t1 ? Math.min(1, Math.min(tt - t0, t1 - tt) / 0.35) : 0;
    return { x, phase: (Math.abs(x - x0) / 120) * Math.PI, moving };
  };
  let ravi: { x: number; pose: Pose; face: number; visible: boolean; holding?: "shoot" | "cup" };
  if (t < 16) { // the hillside: walks up to the plucker, picks a shoot and lifts it
    const w = walkIn(t, 3.2, 8.4, HILL - 120, HILL + 420);
    const reach = ease((t - 9) / 0.8) * (1 - ease((t - 10.6) / 0.6));
    const lift = ease((t - 10.6) / 0.8);
    let pose = walkPose(w.phase, w.moving);
    pose = mixPose(pose, { armF: 70, foreF: 30, lean: 10 }, reach);
    pose = mixPose(pose, { armF: 100, foreF: 60, head: 14 }, lift);
    ravi = { x: w.x, pose, face: 1, visible: true, holding: lift > 0.2 ? "shoot" : undefined };
  } else if (t < 31.5) { // the factory: walks along the line, watching
    const w = walkIn(t, 16.2, 29.5, FACTORY - 750, FACTORY + 760);
    let pose = walkPose(w.phase, w.moving);
    pose = mixPose(pose, { head: 12 }, ease((t - 21) / 0.6) * (1 - ease((t - 23) / 0.6)));
    ravi = { x: w.x, pose, face: 1, visible: true };
  } else if (t < 40) { // the auction: walks to the bench, sits, and raises his hand with the buyers
    const w = walkIn(t, 32, 34.4, AUCTION - 260, AUCTION + 110);
    let pose = walkPose(w.phase, w.moving);
    const sit = ease((t - 34.5) / 0.6);
    pose = mixPose(pose, { thighF: 80, shinF: -80, thighB: 80, shinB: -80, drop: 62 }, sit);
    pose = mixPose(pose, { armF: 165, foreF: 10 }, ease((t - 35.4) / 0.5) * (1 - ease((t - 37.8) / 0.5)));
    ravi = { x: w.x, pose, face: 1, visible: true };
  } else if (t < 48.6) { // in the truck
    ravi = { x: 0, pose: STAND, face: 1, visible: false };
  } else { // the stall: walks up, takes the cup, sips
    const w = walkIn(t, 48.8, 52, STALL - 30, STALL + 230);
    let pose = walkPose(w.phase, w.moving);
    const take = ease((t - 53.8) / 0.6);
    const sip = ease((t - 56) / 0.8) * (1 - ease((t - 58.6) / 0.7));
    pose = mixPose(pose, { armF: 60, foreF: 70 }, take);
    pose = mixPose(pose, { armF: 95, foreF: 120, head: 10 }, sip);
    ravi = { x: w.x, pose, face: 1, visible: true, holding: take > 0.6 ? "cup" : undefined };
  }

  // the people of each station
  const pluckPhase = t * 2.2;
  const plucker = mixPose(STAND, { armF: 60 + Math.sin(pluckPhase) * 28, foreF: 40 + Math.sin(pluckPhase) * 20, lean: 12, head: 8 }, 1);
  const pluckerB = mixPose(STAND, { armF: 60 + Math.sin(pluckPhase + 2) * 28, foreF: 40 + Math.sin(pluckPhase + 2) * 20, lean: 14, head: 10 }, 1);
  const sip = Math.max(0, Math.sin(((t - 32) / 3) * Math.PI));
  const taster = mixPose(STAND, { armF: 70 + sip * 40, foreF: 80 + sip * 40, head: sip * 12 }, 1);
  const bid = (k: number) => ease((t - 35 - k * 0.3) / 0.4) * (1 - ease((t - 37.6) / 0.5));
  const buyerPose = (k: number) => mixPose(mixPose(STAND, { thighF: 80, shinF: -80, thighB: 80, shinB: -80, drop: 74 }, 1), { armF: 160, foreF: 12 }, bid(k));
  const pour = Math.sin(t * 2.4);
  const chaiwala = mixPose(STAND, { armF: 95 + pour * 25, foreF: 40, armB: 40 - pour * 20, foreB: 30, head: -6 }, 1);
  const hand = mixPose(chaiwala, { armF: 75, foreF: 20 }, ease((t - 53) / 0.6) * (1 - ease((t - 54.4) / 0.5)));

  // parallax: the far hills and the sky move slower than the world
  const sky = t < 31 ? PALETTE.sky2 : mixHex(PALETTE.sky2, "#f6dcb4", (t - 31) / 30);
  // the camera looks at (cam.x, cam.y): that world point sits at the centre of the frame
  const tr = `translate(${W / 2} ${H / 2}) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`;
  const far = `translate(${W / 2} ${H / 2}) scale(${cam.z * 0.7 + 0.3}) translate(${-cam.x * 0.25} ${-cam.y * 0.7})`;
  const shootGlow = ease((t - 11.6) / 0.5) * (1 - ease((t - 15) / 0.5));
  const sipW = ease((t - 56) / 0.8) * (1 - ease((t - 58.6) / 0.7));

  return (
    <AbsoluteFill style={{ backgroundColor: sky }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill={sky} />
        <g transform={far}>
          {Array.from({ length: 30 }, (_, i) => <path key={i} d={`M ${-2000 + i * 600} 0 q 300 -${300 + seeded(i) * 260} 600 0 L ${-1400 + i * 600} 900 L ${-2000 + i * 600} 900 Z`} fill={i % 2 ? "#b9d3c2" : "#a9c9b4"} opacity={0.75} />)}
          <circle cx={1600} cy={-700} r={90} fill="#ffe7a8" opacity={0.8} />
        </g>
        <g transform={tr}>
          <rect x={-4000} y={0} width={24000} height={600} fill="#c7b089" />
          <Hillside t={t} />
          <Factory t={t} />
          <Auction t={t} />
          <Highway t={t} truckX={truckX} wheelA={wheelA} />
          <Stall t={t} />
          {/* the hillside's pluckers */}
          <Person x={HILL + 620} y={-14} face={-1} look={PLUCKER} pose={plucker} />
          <Person x={HILL + 980} y={-6} face={1} look={{ ...PLUCKER, saree: "#c4572f", top: "#e9b23c" }} pose={pluckerB} />
          {/* the auction's taster and buyers */}
          <Person x={AUCTION - 420} y={-4} face={1} look={TASTER} pose={taster} />
          {[0, 1].map((k) => <Person key={k} x={AUCTION + 20 + k * 170} y={-60} face={1} look={{ ...BUYER, top: k ? "#c46a4a" : BUYER.top }} pose={buyerPose(k)} />)}
          {[0, 1].map((k) => <Person key={`r${k}`} x={AUCTION + 760 + k * 180} y={-60} face={-1} look={{ ...BUYER, top: k ? "#5f9a6a" : "#8a6cbf" }} pose={buyerPose(k + 2)} />)}
          {/* the chaiwala pours from high up, the long "pulled" stream, then hands over the cup */}
          <Person x={STALL + 470} y={-4} face={-1} look={CHAIWALA} pose={t < 53 ? chaiwala : hand} />
          {t > 49 && t < 53 && <path d={`M ${STALL + 380} ${-330 + pour * 30} Q ${STALL + 370} -260 ${STALL + 372} -205`} stroke="#c8854a" strokeWidth={8} fill="none" opacity={0.9} />}
          {ravi.visible && <Person x={ravi.x} y={t < 16 ? -10 : 0} face={ravi.face} look={RAVI} pose={ravi.pose} />}
          {/* held things sit in the hand: its place worked out from the pose (shoulder, upper arm, forearm) */}
          {ravi.holding === "shoot" && <Shoot x={ravi.x + 56} y={-250} s={1.1} glow={shootGlow} />}
          {ravi.holding === "cup" && (
            <g transform={`translate(${lerp(ravi.x + 67, ravi.x + 19, sipW)} ${lerp(-198, -230, sipW)})`}>
              <path d="M -16 0 l 3 -34 l 26 0 l 3 34 Z" fill="#c8854a" stroke="#8a5a2a" strokeWidth={3} />
              {Array.from({ length: 3 }, (_, k) => <path key={k} d={`M ${-6 + k * 6} -40 q 8 -16 0 -32`} stroke="#ffffff" strokeWidth={4} fill="none" opacity={0.6} transform={`translate(0 ${-((t * 24 + k * 10) % 20)})`} />)}
            </g>
          )}
          {/* the leaves travel with the story: a basket of them goes from the hillside toward the factory */}
          {t > 13.8 && t < 17.4 && <g transform={`translate(${lerp(HILL + 700, FACTORY - 900, ease((t - 13.8) / 3.4))} -60)`}><path d="M -60 0 L -50 -70 L 50 -70 L 60 0 Z" fill="#c99a52" stroke="#8a6232" strokeWidth={4} />{Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx={-40 + i * 16} cy={-76} rx={14} ry={8} fill={PALETTE.leaf2} />)}</g>}
        </g>
      </svg>
      <Audio src={staticFile("twodemo/chai/ambient.wav")} volume={0.32} />
      {LINES.map((l, i) => (
        <Sequence key={i} from={Math.round(l.at * FPS)} durationInFrames={Math.round((l.seconds + 0.6) * FPS)}>
          <Audio src={staticFile(l.audio)} />
          <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54 }}>
            <div style={{ fontFamily, fontSize: 40, color: "#3b2a22", background: "rgba(255,250,238,0.88)", padding: "8px 22px", borderRadius: 14, maxWidth: 1500, textAlign: "center",
              opacity: clamp((t - l.at) / 0.3) * (1 - clamp((t - l.at - l.seconds - 0.2) / 0.3)) }}>{l.text}</div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
