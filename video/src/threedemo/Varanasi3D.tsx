/* 3D experiment, a short film: "Subah" (dawn at the Varanasi ghats). Ravi walks down the stone steps before sunrise,
   lights a leaf lamp, sets it on the Ganga and watches the river turn gold. Everything is built in code with
   @remotion/three: the ghats (they face east, so the sun rises over the far bank), the water, the sky, and one jointed
   character who stays the same in every frame. The narration is voice.json in public/threedemo/varanasi. */

import { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { BackSide, BufferAttribute, Color, PlaneGeometry, SphereGeometry, Vector3 } from "three";
import { loadFont } from "@remotion/google-fonts/Lora";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import VOICE from "../../public/threedemo/varanasi/voice.json";

export const FPS = 30;
export const SECONDS = 60;
const { fontFamily } = loadFont("normal", { weights: ["500"] });

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const seeded = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const col = (stops: [number, string][], t: number): Color => { // a colour that moves through the day
  let k = 0;
  while (k + 1 < stops.length && t >= stops[k + 1][0]) k++;
  const [t0, c0] = stops[k], [t1, c1] = stops[Math.min(k + 1, stops.length - 1)];
  return new Color(c0).lerp(new Color(c1), t1 > t0 ? ease((t - t0) / (t1 - t0)) : 0);
};

/* ---------------- the narration: each line starts on its moment, never on top of the one before ---------------- */
type Word = { w: string; s: number; e: number };
type Line = { audio: string; seconds: number; words: Word[]; text: string };
const WANT = [2, 9.5, 16.5, 25.5, 35, 44.5, 53];
const LINES: (Line & { at: number })[] = [];
(VOICE as Line[]).forEach((v, i) => {
  const prev = LINES[i - 1];
  LINES.push({ ...v, at: Math.max(WANT[i] ?? 0, prev ? prev.at + prev.seconds + 0.4 : 0) });
});

/* ---------------- the ghat: a top terrace (y 7), 28 steps down to a landing, then the river ---------------- */
const TOP_Z = -14, STEP_D = 0.5, STEP_H = 0.25, STEPS = 28;
const groundY = (z: number) => (z <= TOP_Z ? 7 : z >= 0 ? 0 : clamp(7 - ((z - TOP_Z) / STEP_D) * STEP_H, 0, 7));
export const WATER_Y = -0.25;

/* ---------------- Ravi's morning ---------------- */
const RX = 1.5;
const WALK = { t0: 8, t1: 21, z0: -15.5, z1: 0.9 };
const STRIDE = 1.0; // two stairs per step cycle
function ravi(t: number) {
  const p = clamp((t - WALK.t0) / (WALK.t1 - WALK.t0));
  const e = p < 0.06 ? (p * p) / 0.12 : p > 0.94 ? 1 - ((1 - p) * (1 - p)) / 0.12 : p;
  const z = lerp(WALK.z0, WALK.z1, clamp(e));
  const moving = t > WALK.t0 && t < WALK.t1 ? Math.min(1, Math.min(t - WALK.t0, WALK.t1 - t) / 0.4) : 0;
  const dist = Math.abs(z - WALK.z0);
  const squat = ease((t - 21.3) / 1.4) * (1 - ease((t - 50.5) / 1.6));
  const place = ease((t - 31) / 1.6) * (1 - ease((t - 34.2) / 1.2));
  const hold = 1 - ease((t - 31.5) / 1.2);
  const namaste = ease((t - 53) / 1.4);
  return { x: RX, y: groundY(z), z, phase: (dist / STRIDE) * Math.PI * 2, moving, squat, place, hold, namaste };
}

/* ---------------- a jointed person (facing +z) ---------------- */
type Look = { skin: string; kurta: string; pants: string; hair: string; scarf: string; scale: number };
type Pose = { phase: number; moving: number; squat: number; hold: number; place: number; namaste: number; row: number; sit: number };
const RAVI: Look = { skin: "#9c6a45", kurta: "#f1e3c6", pants: "#f6f1e6", hair: "#1c1410", scarf: "#e0782c", scale: 1 };
const BOATMAN: Look = { skin: "#7a5136", kurta: "#e9e4d8", pants: "#3a4a5a", hair: "#2a2a2a", scarf: "#b23a2a", scale: 1.12 };

function Seg({ len, r, color, rTop }: { len: number; r: number; color: string; rTop?: number }) {
  return rTop === undefined ? (
    <mesh position={[0, -len / 2, 0]} castShadow><capsuleGeometry args={[r, len, 4, 10]} /><meshStandardMaterial color={color} roughness={0.75} /></mesh>
  ) : (
    <mesh position={[0, -len / 2, 0]} castShadow><cylinderGeometry args={[rTop, r, len, 12]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
  );
}

function Person({ look, pose }: { look: Look; pose: Pose }) {
  const { phase, moving, squat, hold, place, namaste, row, sit } = pose;
  const s = Math.sin(phase) * moving;
  const drop = squat * 0.36 + sit * 0.3;
  const lean = squat * 0.3 + place * 0.35 - row * 0.1;
  const arm = (side: number) => { // side -1 left, +1 right: shoulder (x, z) and elbow x, blended through the poses
    let sx = -side * s * 0.55, sz = side * -0.08, ex = -0.25 - Math.abs(s) * 0.2, ez = 0;
    const to = (w: number, a: number, b: number, c: number, d: number) => { sx = lerp(sx, a, w); sz = lerp(sz, b, w); ex = lerp(ex, c, w); ez = lerp(ez, d, w); };
    to(hold, -0.7, -side * 0.28, -1.25, -side * 0.15);
    to(place, -1.25, -side * 0.18, -0.25, 0);
    to(namaste, -0.3, -side * 0.42, -2.05, -side * 0.42);
    to(row, -0.9 + Math.sin(row * 0 + phase) * 0.45, -side * 0.15, -0.6, 0);
    return { sx, sz, ex, ez };
  };
  const leg = (side: number) => ({
    hx: lerp(lerp(side * s * 0.55, -1.4, squat), -1.5, sit),
    kx: lerp(lerp(Math.max(0, -side * s) * 0.85, 2.15, squat), 1.5, sit),
  });
  return (
    <group scale={look.scale}>
      <group position={[0, 0.74 - drop + Math.abs(s) * 0.035, 0]}>
        {/* legs */}
        {[-1, 1].map((side) => {
          const l = leg(side);
          return (
            <group key={side} position={[side * 0.095, 0, 0]} rotation={[l.hx, 0, 0]}>
              <Seg len={0.3} r={0.07} color={look.pants} />
              <group position={[0, -0.36, 0]} rotation={[l.kx, 0, 0]}>
                <Seg len={0.28} r={0.055} color={look.pants} />
                <mesh position={[0, -0.36, 0.05]} castShadow><boxGeometry args={[0.1, 0.05, 0.22]} /><meshStandardMaterial color={look.skin} roughness={0.8} /></mesh>
              </group>
            </group>
          );
        })}
        {/* torso, leaning from the hips */}
        <group rotation={[lean, 0, 0]}>
          <mesh position={[0, 0.0, 0]} castShadow><cylinderGeometry args={[0.2, 0.25, 0.3, 14]} /><meshStandardMaterial color={look.kurta} roughness={0.85} /></mesh>
          <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.18, 0.2, 0.36, 14]} /><meshStandardMaterial color={look.kurta} roughness={0.85} /></mesh>
          <mesh position={[0.02, 0.3, 0.02]} rotation={[0, 0, 0.75]} castShadow><boxGeometry args={[0.07, 0.52, 0.32]} /><meshStandardMaterial color={look.scarf} roughness={0.9} /></mesh>
          <mesh position={[0, 0.47, 0]}><cylinderGeometry args={[0.05, 0.06, 0.08, 10]} /><meshStandardMaterial color={look.skin} /></mesh>
          {/* head */}
          <group position={[0, 0.61, 0]} rotation={[-lean * 0.5 + squat * 0.15, 0, 0]}>
            <mesh scale={[1, 1.12, 1]} castShadow><sphereGeometry args={[0.115, 22, 18]} /><meshStandardMaterial color={look.skin} roughness={0.7} /></mesh>
            <mesh position={[0, 0.04, -0.015]} scale={[1.06, 0.9, 1.06]} castShadow><sphereGeometry args={[0.115, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshStandardMaterial color={look.hair} roughness={0.95} /></mesh>
            {[-1, 1].map((sd) => (
              <group key={sd}>
                <mesh position={[sd * 0.115, 0, 0]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color={look.skin} /></mesh>
                <mesh position={[sd * 0.042, 0.015, 0.1]}><sphereGeometry args={[0.016, 8, 8]} /><meshStandardMaterial color="#f5f0e8" /></mesh>
                <mesh position={[sd * 0.042, 0.015, 0.112]}><sphereGeometry args={[0.009, 8, 8]} /><meshStandardMaterial color="#1a120c" /></mesh>
                <mesh position={[sd * 0.045, 0.045, 0.105]} rotation={[0, 0, sd * -0.12]}><boxGeometry args={[0.04, 0.008, 0.01]} /><meshStandardMaterial color={look.hair} /></mesh>
              </group>
            ))}
            <mesh position={[0, -0.01, 0.118]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.016, 0.04, 8]} /><meshStandardMaterial color={look.skin} /></mesh>
            <mesh position={[0, -0.055, 0.105]}><boxGeometry args={[0.035, 0.007, 0.01]} /><meshStandardMaterial color="#5a2e22" /></mesh>
          </group>
          {/* arms */}
          {[-1, 1].map((side) => {
            const a = arm(side);
            return (
              <group key={side} position={[side * 0.22, 0.38, 0]} rotation={[a.sx, 0, a.sz]}>
                <Seg len={0.22} r={0.05} color={look.kurta} />
                <group position={[0, -0.27, 0]} rotation={[a.ex, 0, a.ez]}>
                  <Seg len={0.2} r={0.042} color={look.skin} />
                  <mesh position={[0, -0.26, 0]} castShadow><sphereGeometry args={[0.045, 10, 10]} /><meshStandardMaterial color={look.skin} /></mesh>
                </group>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

/* ---------------- a leaf lamp (diya) ---------------- */
export function Diya({ lit, flick, light = false, scale = 1 }: { lit: number; flick: number; light?: boolean; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh scale={[1.6, 0.35, 1]}><sphereGeometry args={[0.09, 14, 10]} /><meshStandardMaterial color="#3f7a35" roughness={0.8} /></mesh>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.045, 0.03, 0.035, 12]} /><meshStandardMaterial color="#b4632e" roughness={0.9} /></mesh>
      {lit > 0 && (
        <group position={[0, 0.07 + flick * 0.004, 0]} scale={[lit * (1 + flick * 0.06), lit * (1 + flick * 0.15), lit * (1 + flick * 0.06)]}>
          <mesh><coneGeometry args={[0.018, 0.07, 10]} /><meshStandardMaterial color="#fff2b0" emissive="#ffb43a" emissiveIntensity={3} /></mesh>
          <mesh><sphereGeometry args={[0.05, 10, 10]} /><meshBasicMaterial color="#ffb347" transparent opacity={0.28} depthWrite={false} /></mesh>
        </group>
      )}
      {light && lit > 0 && <pointLight position={[0, 0.12, 0]} color="#ffad4a" intensity={lit * (1.6 + flick * 0.3)} distance={4.5} decay={2} />}
    </group>
  );
}

/* ---------------- the city above the ghat ---------------- */
export function Ghat({ night }: { night: number }) {
  const steps = Array.from({ length: STEPS }, (_, k) => ({ z: TOP_Z + (k + 0.5) * STEP_D, top: 7 - (k + 1) * STEP_H }));
  const houses = Array.from({ length: 22 }, (_, i) => {
    const x = -46 + i * 4.3 + seeded(i) * 1.2, h = 4 + seeded(i + 4) * 8, w = 3.4 + seeded(i + 7) * 1.4;
    return { x, h, w, d: 5 + seeded(i + 11) * 3, z: -17 - seeded(i + 2) * 3, color: ["#e8c27a", "#d98f6a", "#efe2c4", "#c96f57", "#e3b25e", "#f2d9b0"][i % 6] };
  });
  return (
    <group>
      <mesh position={[0, 3.5, -30]} receiveShadow><boxGeometry args={[110, 7, 32]} /><meshStandardMaterial color="#b98d5a" roughness={1} /></mesh>
      {steps.map((st, k) => (
        <mesh key={k} position={[0, (st.top - 1) / 2, st.z]} receiveShadow castShadow>
          <boxGeometry args={[110, st.top + 1, STEP_D]} />
          <meshStandardMaterial color={k % 2 ? "#c9a06a" : "#bf955f"} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, -0.5, 0.7]} receiveShadow><boxGeometry args={[110, 1, 1.4]} /><meshStandardMaterial color="#b08654" roughness={1} /></mesh>
      {houses.map((hs, i) => (
        <group key={i} position={[hs.x, 7, hs.z]}>
          <mesh position={[0, hs.h / 2, 0]} castShadow receiveShadow><boxGeometry args={[hs.w, hs.h, hs.d]} /><meshStandardMaterial color={hs.color} roughness={0.95} /></mesh>
          {Array.from({ length: Math.floor(hs.h / 2.2) }, (_, r) => [-1, 1].map((c) => (
            <mesh key={`${r}-${c}`} position={[c * hs.w * 0.22, 1.6 + r * 2.1, hs.d / 2 + 0.01]}><boxGeometry args={[0.55, 0.9, 0.04]} />
              <meshStandardMaterial color="#3b2a22" emissive="#ffb35c" emissiveIntensity={seeded(i * 7 + r * 3 + c) > 0.45 ? night * 1.4 : 0} /></mesh>
          )))}
          <mesh position={[0, hs.h + 0.15, 0]}><boxGeometry args={[hs.w + 0.3, 0.3, hs.d + 0.3]} /><meshStandardMaterial color="#a3714a" /></mesh>
        </group>
      ))}
      {[-9, 6, 21].map((tx, i) => ( // temple spires (shikhara) with saffron flags
        <group key={i} position={[tx, 7, -15.8]}>
          <mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[3, 3, 3]} /><meshStandardMaterial color="#f0e6d2" roughness={0.9} /></mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh key={k} position={[0, 3.3 + k * 0.85, 0]} castShadow><cylinderGeometry args={[1.25 - k * 0.2, 1.4 - k * 0.2, 0.85, 8]} /><meshStandardMaterial color={k % 2 ? "#ecdcbc" : "#e2cfa8"} roughness={0.9} /></mesh>
          ))}
          <mesh position={[0, 8.6, 0]}><sphereGeometry args={[0.25, 10, 10]} /><meshStandardMaterial color="#d4a017" metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[0, 9.3, 0]}><cylinderGeometry args={[0.03, 0.03, 1.2, 6]} /><meshStandardMaterial color="#5a3d2b" /></mesh>
          <mesh position={[0.35, 9.65, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.25, 0.7, 3]} /><meshStandardMaterial color="#ff7b1c" side={2} /></mesh>
        </group>
      ))}
      {[-14, -6.5, 9, 16.5].map((ux, i) => ( // chhatris: the big umbrellas on the landing
        <group key={i} position={[ux, 0, 0.6]}>
          <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.04, 0.05, 2.4, 6]} /><meshStandardMaterial color="#6b4a2f" /></mesh>
          <mesh position={[0, 2.35, 0]} castShadow><coneGeometry args={[1.6, 0.6, 14, 1, true]} /><meshStandardMaterial color="#d9b77c" roughness={1} side={2} /></mesh>
          <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[1.4, 0.5, 1.4]} /><meshStandardMaterial color="#a77b4c" /></mesh>
        </group>
      ))}
    </group>
  );
}

export function Boat({ x, z, t, rot = 0 }: { x: number; z: number; t: number; rot?: number }) {
  const bob = Math.sin(t * 1.1 + x) * 0.04;
  return (
    <group position={[x, WATER_Y + 0.12 + bob, z]} rotation={[Math.sin(t * 0.9 + z) * 0.03, rot, Math.sin(t * 1.3 + x) * 0.03]}>
      <mesh castShadow><boxGeometry args={[3.2, 0.42, 1.1]} /><meshStandardMaterial color="#7a4a2a" roughness={0.9} /></mesh>
      <mesh position={[1.75, 0.08, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow><coneGeometry args={[0.55, 0.6, 4]} /><meshStandardMaterial color="#6a3f24" /></mesh>
      <mesh position={[-1.75, 0.08, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><coneGeometry args={[0.55, 0.6, 4]} /><meshStandardMaterial color="#6a3f24" /></mesh>
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[3.0, 0.05, 0.95]} /><meshStandardMaterial color="#9a6a3e" /></mesh>
    </group>
  );
}

/* ---------------- water, sky and sun ---------------- */
export function Water({ t, color }: { t: number; color: Color }) {
  const geo = useMemo(() => new PlaneGeometry(260, 160, 130, 80), []);
  const pos = geo.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, 0.05 * Math.sin(x * 0.45 + t * 1.2) + 0.035 * Math.sin(y * 0.8 - t * 0.9) + 0.015 * Math.sin((x + y) * 1.9 + t * 2.1));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 81.4]} receiveShadow><meshStandardMaterial color={color} roughness={0.26} metalness={0.04} /></mesh>;
}

export function Sky({ zenith, horizon, glow, sunDir, strength }: { zenith: Color; horizon: Color; glow: Color; sunDir: Vector3; strength: number }) {
  const geo = useMemo(() => {
    const g = new SphereGeometry(420, 40, 20);
    g.setAttribute("color", new BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    return g;
  }, []);
  const pos = geo.attributes.position as BufferAttribute, c = geo.attributes.color as BufferAttribute;
  const v = new Vector3(), out = new Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    out.copy(horizon).lerp(zenith, clamp(v.y / 0.55));
    const sun = Math.pow(Math.max(0, v.dot(sunDir)), 6) * strength;
    out.lerp(glow, clamp(sun));
    c.setXYZ(i, out.r, out.g, out.b);
  }
  c.needsUpdate = true;
  return <mesh geometry={geo}><meshBasicMaterial vertexColors side={BackSide} fog={false} /></mesh>;
}

/* ---------------- the camera ---------------- */
function CameraRig({ t, r }: { t: number; r: ReturnType<typeof ravi> }) {
  const camera = useThree((st) => st.camera);
  const y = r.y - r.squat * 0.36;
  const shots: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
    { at: 0, pos: [lerp(9, 4.2, ease(t / 8)), lerp(7, 8.6, ease(t / 8)), lerp(22, -5, ease(t / 8))], look: [r.x, 7.6, -15.5] }, // in from the river to Ravi at the top
    { at: 8, pos: [r.x + 2.4, y + 1.5, r.z + 5.2], look: [r.x, y + 1.0, r.z] }, // in front of Ravi as he comes down
    { at: 21, pos: [r.x + 2.6, 0.9, r.z + 3.2], look: [r.x, 0.6, r.z + 0.3] }, // low at the water's edge
    { at: 26, pos: [r.x + 0.9, 0.85, r.z + 1.9], look: [r.x, 0.55, r.z + 0.35] }, // close: the flame
    { at: 32.5, pos: [r.x - 1.3, 1.6, r.z - 2.3], look: [r.x + 1.2, -0.1, r.z + 7] }, // over his shoulder: the lamp leaves
    { at: 42, pos: [r.x - 3, 3.2, r.z - 5.5], look: [0, 2.5, 60] }, // the river of lights and the sunrise
    { at: 51, pos: [r.x + 5, 3.2, r.z + 8], look: [r.x, 2.2, r.z - 2] }, // turning back: the ghat in gold, Ravi standing
    { at: 56, pos: [r.x + 9, 11, r.z + 24], look: [r.x, 3, r.z - 4] }, // the wide end
  ];
  let k = 0;
  while (k + 1 < shots.length && t >= shots[k + 1].at) k++;
  const a = shots[k], b = shots[Math.min(k + 1, shots.length - 1)];
  const blend = k + 1 < shots.length ? ease((t - (b.at - 2)) / 2) : 0;
  camera.position.copy(new Vector3(...a.pos).lerp(new Vector3(...b.pos), blend));
  camera.lookAt(new Vector3(...a.look).lerp(new Vector3(...b.look), blend));
  return null;
}

/* ---------------- the film ---------------- */
export const Varanasi3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / FPS;
  const r = ravi(t);
  const flick = Math.sin(t * 23) * 0.5 + Math.sin(t * 37 + 1) * 0.5;
  const lit = ease((t - 27.2) / 0.8);
  const dawn = clamp(t / 60);
  const sunUp = ease((t - 43) / 14); // the sun climbs over the far bank
  const sunPos = new Vector3(-18, lerp(-10, 22, sunUp), 150);
  const sunDir = sunPos.clone().normalize();
  const zenith = col([[0, "#0a1630"], [30, "#1c2f62"], [44, "#4c6fa8"], [60, "#7fb2df"]], t);
  const horizon = col([[0, "#24305a"], [28, "#6a5a7e"], [42, "#f09a62"], [60, "#ffd9a0"]], t);
  const glow = col([[0, "#3a3a6a"], [40, "#ff8a3c"], [60, "#fff0c0"]], t);
  const water = col([[0, "#1d3152"], [38, "#4d628a"], [50, "#c98f55"], [60, "#dcae70"]], t);
  const night = 1 - ease((t - 44) / 8); // the city's windows are lit until the sun is up
  const fogC = horizon.clone().lerp(zenith, 0.35);

  // Ravi's lamp: in his hands, then set down on the water, then drifting away on the current
  const hands = new Vector3(r.x, r.y - r.squat * 0.36 + lerp(1.02, 0.78, r.squat), r.z + lerp(0.3, 0.36, r.squat));
  const onWater = new Vector3(r.x, WATER_Y + 0.08, 2.0);
  const down = ease((t - 31) / 2.2);
  const drift = Math.max(0, t - 33.2);
  const lamp = t < 33.2 ? hands.clone().lerp(onWater, down).setY(lerp(hands.y, onWater.y, down) + Math.sin(down * Math.PI) * 0.15)
    : new Vector3(onWater.x + drift * 0.16, WATER_Y + 0.08 + Math.sin(t * 1.7) * 0.025, onWater.z + drift * 0.32);

  const others = Array.from({ length: 90 }, (_, i) => {
    const born = 33.3 + seeded(i) * 7.5;
    return { i, born, x: -14 + seeded(i + 5) * 30 + (t - born) * (0.2 + seeded(i + 8) * 0.25), z: 2.8 + Math.pow(seeded(i + 13), 1.6) * 22 + (t - born) * 0.12 };
  }).filter((d) => t > d.born);

  const boatX = lerp(-26, 12, clamp((t - 38) / 22));
  const birds = Array.from({ length: 7 }, (_, i) => ({ i, x: lerp(-40, 30, clamp((t - 45 - i * 0.25) / 13)) + i * 0.9, y: 14 + (i % 3) * 0.8, z: 30 + (i % 2) * 2 }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 36, near: 0.05, far: 900 }}>
        <fog attach="fog" args={[fogC, 25, 190]} />
        <Sky zenith={zenith} horizon={horizon} glow={glow} sunDir={sunDir} strength={lerp(0.35, 1, dawn)} />
        <mesh position={sunPos}><sphereGeometry args={[7, 24, 16]} /><meshBasicMaterial color={col([[43, "#ff6a2a"], [60, "#fff3cf"]], t)} fog={false} /></mesh>
        <hemisphereLight args={[col([[0, "#8197d4"], [44, "#ffc89a"], [60, "#ffffff"]], t), col([[0, "#3a3440"], [60, "#8a6a4a"]], t), lerp(1.05, 1.15, dawn)]} />
        <directionalLight position={new Vector3(-18, lerp(4, 40, sunUp), 80)} intensity={lerp(0.25, 2.6, sunUp)} color={col([[0, "#8aa0d8"], [44, "#ff9a50"], [60, "#ffe2b0"]], t)} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={30} shadow-camera-bottom={-30}
          shadow-camera-far={200} shadow-bias={-0.0004} />
        <CameraRig t={t} r={r} />
        <Ghat night={night} />
        <Water t={t} color={water} />
        <mesh position={[0, WATER_Y + 0.4, 158]}><boxGeometry args={[400, 0.8, 8]} /><meshStandardMaterial color={col([[0, "#2b2a3a"], [60, "#d8c39a"]], t)} /></mesh>
        {[[-9, 2.6], [-3.5, 3.1], [12, 2.8], [19, 3.4]].map(([bx, bz], i) => <Boat key={i} x={bx} z={bz} t={t} rot={(i % 2 ? 1 : -1) * 0.06} />)}
        <group position={[boatX, 0, 10]}>
          <Boat x={0} z={0} t={t} />
          <group position={[0.3, WATER_Y + 0.35, 0]} rotation={[0, Math.PI / 2, 0]}>
            <Person look={BOATMAN} pose={{ phase: t * 2.2, moving: 0, squat: 0, hold: 0, place: 0, namaste: 0, row: 1, sit: 1 }} />
          </group>
        </group>
        <group position={[r.x, r.y, r.z]}>
          <Person look={RAVI} pose={{ phase: r.phase, moving: r.moving, squat: r.squat, hold: r.hold, place: r.place, namaste: r.namaste, row: 0, sit: 0 }} />
        </group>
        <group position={lamp}><Diya lit={lit} flick={flick} light /></group>
        {others.map((d) => (
          <group key={d.i} position={[d.x, WATER_Y + 0.08 + Math.sin(t * 1.5 + d.i) * 0.02, d.z]}>
            <Diya lit={ease((t - d.born) / 0.6)} flick={Math.sin(t * 19 + d.i * 3)} light={d.i % 15 === 0} scale={1.5} />
          </group>
        ))}
        {birds.map((b) => {
          const flap = Math.sin(t * 9 + b.i) * 0.5;
          return (
            <group key={b.i} position={[b.x, b.y + Math.sin(t * 2 + b.i) * 0.3, b.z]}>
              <mesh position={[-0.22, 0, 0]} rotation={[0, 0, flap]}><boxGeometry args={[0.45, 0.03, 0.12]} /><meshBasicMaterial color="#2a2018" /></mesh>
              <mesh position={[0.22, 0, 0]} rotation={[0, 0, -flap]}><boxGeometry args={[0.45, 0.03, 0.12]} /><meshBasicMaterial color="#2a2018" /></mesh>
            </group>
          );
        })}
      </ThreeCanvas>
      {/* the ambience made in code (video/ambient.py): river, temple bells, a drone rising with the sun, birds */}
      <Audio src={staticFile("threedemo/varanasi/ambient.wav")} volume={0.38} />
      {/* the narration and its subtitles */}
      {LINES.map((l, i) => (
        <Sequence key={i} from={Math.round(l.at * FPS)} durationInFrames={Math.round((l.seconds + 0.6) * FPS)}>
          <Audio src={staticFile(l.audio)} />
          <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 96 }}>
            <div style={{ fontFamily, fontSize: 40, color: "#fdf6e8", textShadow: "0 2px 12px rgba(0,0,0,0.75)", maxWidth: 1400, textAlign: "center",
              opacity: clamp((t - l.at) / 0.35) * (1 - clamp((t - l.at - l.seconds - 0.2) / 0.35)) }}>{l.text}</div>
          </AbsoluteFill>
        </Sequence>
      ))}
      {/* a letterbox for the film look */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64, background: "#000" }} />
    </AbsoluteFill>
  );
};
