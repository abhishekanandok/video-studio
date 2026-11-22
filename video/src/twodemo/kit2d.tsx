/* The 2D film kit (tested in the chai film, src/twodemo/Chai2D.tsx): one jointed character rig in side view, poses
   and pose blending, walking that comes from the distance travelled, the place of a hand (so held things sit in it),
   a camera that holds and glides between shots over one world strip, and the narration with subtitles.
   A film imports these and draws its own world and set pieces in SVG. World units are px; the ground is y = 0 and up is
   negative y. */

import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";

export const W = 1920, H = 1080, FPS = 30;
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const seeded = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const D2R = Math.PI / 180;

export function mixHex(a: string, b: string, p: number): string {
  const n = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [x, y] = [n(a), n(b)];
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(p)))).join(",")})`;
}
export function shadeOf(hex: string, k: number): string { // darker (k < 0) for the far limbs
  const n = parseInt(hex.slice(1), 16), f = 1 + k;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/* ---------------- the character rig (side view, facing right; face -1 faces left) ---------------- */
/** how a person looks. height in px (a child about 250, an adult about 300). Colours are "#rrggbb". */
export type Look = { skin: string; top: string; bottom: string; hair: string; scarf?: string; saree?: string; lungi?: boolean; mustache?: boolean; basket?: boolean; height: number };
/** joint angles in degrees: 0 hangs straight down, positive swings FORWARD (toward the way the person faces).
    thigh/shin and arm/fore are the front (F) and back (B) limbs; a shin or forearm angle is relative to its upper limb.
    lean tips the body forward, head nods, drop lowers the hips (sitting about 62 for a child, 74 for an adult). */
export type Pose = { thighF: number; shinF: number; thighB: number; shinB: number; armF: number; foreF: number; armB: number; foreB: number; lean: number; head: number; drop: number };
export const STAND: Pose = { thighF: 0, shinF: 0, thighB: 0, shinB: 0, armF: 6, foreF: 10, armB: -6, foreB: 8, lean: 0, head: 0, drop: 0 };
/** a pose part of the way (w 0..1) toward some joint angles: chain these to build any action */
export const mixPose = (a: Pose, b: Partial<Pose>, w: number): Pose => {
  const out = { ...a };
  (Object.keys(b) as (keyof Pose)[]).forEach((k) => { out[k] = lerp(a[k], b[k] as number, clamp(w)); });
  return out;
};
/** the walk cycle at a phase (from walkIn), moving 0..1 */
export const walkPose = (phase: number, moving: number): Pose => {
  const s = Math.sin(phase) * moving;
  return { ...STAND, thighF: 24 * s, shinF: -Math.max(0, -s) * 38, thighB: -24 * s, shinB: -Math.max(0, s) * 38, armF: -20 * s + 4, foreF: 14, armB: 20 * s - 4, foreB: 12, lean: 3 * moving, head: 0, drop: -Math.abs(s) * 4 };
};
/** ready-made actions (use with mixPose): SIT, REACH (forward), RAISE (hand up high), HOLD_UP (an object at eye level), SIP (cup to the mouth), POINT, CARRY (both arms forward) */
export const SIT: Partial<Pose> = { thighF: 80, shinF: -80, thighB: 80, shinB: -80, drop: 62 };
export const REACH: Partial<Pose> = { armF: 70, foreF: 30, lean: 10 };
export const RAISE: Partial<Pose> = { armF: 165, foreF: 10 };
export const HOLD_UP: Partial<Pose> = { armF: 100, foreF: 60, head: 14 };
export const SIP: Partial<Pose> = { armF: 95, foreF: 120, head: 10 };
export const POINT: Partial<Pose> = { armF: 90, foreF: 0 };
export const CARRY: Partial<Pose> = { armF: 55, foreF: 50, armB: 50, foreB: 55 };

/** walking from x0 to x1 between seconds t0 and t1: where the person is, the walk phase (from the distance, so feet do
    not slide) and how much they are moving */
export function walkIn(t: number, t0: number, t1: number, x0: number, x1: number) {
  const p = ease((t - t0) / (t1 - t0));
  const x = lerp(x0, x1, p);
  const moving = t > t0 && t < t1 ? Math.min(1, Math.min(t - t0, t1 - t) / 0.35) : 0;
  return { x, phase: (Math.abs(x - x0) / 120) * Math.PI, moving, face: x1 >= x0 ? 1 : -1 };
}

/** where the FRONT hand of a person standing at (x, y) is, in world px: draw a held thing (a cup, a leaf, a phone) there */
export function handAt(x: number, y: number, face: number, look: Look, pose: Pose): { x: number; y: number } {
  const h = look.height, sh = h * 0.79 + pose.drop, up = h * 0.17, fore = h * 0.16;
  const a = pose.armF * D2R, b = (pose.armF + pose.foreF) * D2R;
  const dx = up * Math.sin(a) + fore * Math.sin(b), dy = up * Math.cos(a) + fore * Math.cos(b);
  return { x: x + face * dx, y: y - sh + dy };
}

function Limb({ x, y, angle, len, w, color, children }: { x: number; y: number; angle: number; len: number; w: number; color: string; children?: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${-angle})`}>
      <rect x={-w / 2} y={-w / 2} width={w} height={len + w / 2} rx={w / 2} fill={color} />
      <g transform={`translate(0 ${len})`}>{children}</g>
    </g>
  );
}

/** a person standing with their feet at (x, y) */
export function Person({ x, y, face = 1, look, pose }: { x: number; y: number; face?: number; look: Look; pose: Pose }) {
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
  const arm = (a: number, f: number, shade: number) => (
    <Limb x={0} y={-sh} angle={a} len={up} w={aw} color={shadeOf(look.top, shade)}>
      <Limb x={0} y={0} angle={f} len={fore} w={aw * 0.85} color={shadeOf(look.skin, shade)}>
        <circle r={aw * 0.62} fill={shadeOf(look.skin, shade)} />
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

/* ---------------- the camera over one world strip ---------------- */
/** a shot: from second `at`, look at world point (x, y) at zoom z. The camera holds each shot, then glides (1.6 s) into the next. */
export type Shot = { at: number; x: number; y: number; z: number };
export function cameraAt(shots: Shot[], t: number): { x: number; y: number; z: number } {
  let k = 0;
  while (k + 1 < shots.length && t >= shots[k + 1].at) k++;
  const a = shots[k], b = shots[Math.min(k + 1, shots.length - 1)];
  const span = k + 1 < shots.length ? b.at - a.at : 1;
  const p = ease((t - a.at - Math.max(0, span - 1.6)) / Math.min(1.6, span));
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), z: lerp(a.z, b.z, p) };
}
/** the SVG transform that puts the camera's point at the centre of the frame (parallax: depth 1 = the world, 0.25 = far away) */
export const view = (cam: { x: number; y: number; z: number }, depth = 1) =>
  `translate(${W / 2} ${H / 2}) scale(${depth === 1 ? cam.z : cam.z * 0.7 + 0.3}) translate(${-cam.x * depth} ${-cam.y * (depth === 1 ? 1 : 0.7)})`;

/* ---------------- the narration ---------------- */
export type Line = { audio: string; seconds: number; text: string };
/** each line starts at its wanted second, never on top of the one before */
export function schedule(lines: Line[], want: number[]): (Line & { at: number })[] {
  const out: (Line & { at: number })[] = [];
  lines.forEach((v, i) => { const prev = out[i - 1]; out.push({ ...v, at: Math.max(want[i] ?? 0, prev ? prev.at + prev.seconds + 0.35 : 0) }); });
  return out;
}
/** the voice of every line and its subtitle at the bottom, plus the ambience under it */
export function Narration({ lines, t, ambient, font }: { lines: (Line & { at: number })[]; t: number; ambient?: string; font: string }) {
  return (
    <>
      {ambient && <Audio src={staticFile(ambient)} volume={0.32} />}
      {lines.map((l, i) => (
        <Sequence key={i} from={Math.round(l.at * FPS)} durationInFrames={Math.round((l.seconds + 0.6) * FPS)}>
          <Audio src={staticFile(l.audio)} />
          <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54 }}>
            <div style={{ fontFamily: font, fontSize: 40, color: "#3b2a22", background: "rgba(255,250,238,0.88)", padding: "8px 22px", borderRadius: 14, maxWidth: 1500, textAlign: "center",
              opacity: clamp((t - l.at) / 0.3) * (1 - clamp((t - l.at - l.seconds - 0.2) / 0.3)) }}>{l.text}</div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </>
  );
}
