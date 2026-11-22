/* 3D experiment: one minute of a low-poly character, Pip, walking through a village (morning to sunset), all in code
   with @remotion/three (react-three-fiber): real lights and shadows, a jointed body whose walk is driven by the distance
   it travels (so the feet never slide), and a camera that follows. No images, no video model. */

import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Color, Vector3 } from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export const FPS = 30;
export const SECONDS = 60;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const mix = (a: string, b: string, p: number) => "#" + new Color(a).lerp(new Color(b), clamp(p)).getHexString();
const seeded = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ---------------- the ground: flat, a bridge over the river, then a hill ---------------- */
const RIVER = [-6, 2]; // the bridge spans this x range
const HILL = [12, 20]; // the slope rises 2 m over this x range
function groundY(x: number): number {
  if (x > RIVER[0] && x < RIVER[1]) return 0.9 * Math.sin((Math.PI * (x - RIVER[0])) / (RIVER[1] - RIVER[0]));
  if (x >= HILL[0]) return Math.min(2, ((x - HILL[0]) / (HILL[1] - HILL[0])) * 2);
  return 0;
}

/* ---------------- Pip's day: where it is and what it does at second t ---------------- */
type Leg = { t0: number; t1: number; x0: number; x1: number };
const WALKS: Leg[] = [
  { t0: 6, t1: 23, x0: -30, x1: -7.5 }, // down the lane
  { t0: 23, t1: 30, x0: -7.5, x1: 3.5 }, // over the bridge
  { t0: 30, t1: 34, x0: 3.5, x1: 8.6 }, // to the mailbox
  { t0: 47, t1: 56, x0: 8.6, x1: 18 }, // up the hill
];
const STRIDE = 1.1; // metres per full step cycle

function where(t: number) {
  let x = WALKS[0].x0, dist = 0, moving = 0;
  for (const w of WALKS) {
    if (t <= w.t0) break;
    const p = clamp((t - w.t0) / (w.t1 - w.t0));
    const eased = p < 0.08 ? (p * p) / 0.16 : p > 0.92 ? 1 - ((1 - p) * (1 - p)) / 0.16 : p; // ease in and out of each walk
    const span = w.x1 - w.x0;
    x = w.x0 + span * clamp(eased);
    dist += Math.abs(span) * clamp(eased);
    if (t < w.t1) moving = Math.min(1, Math.min(t - w.t0, w.t1 - t) / 0.4);
  }
  return { x, y: groundY(x), dist, moving };
}

/* ---------------- a jointed low-poly body ---------------- */
type Pose = { swing: number; bob: number; wave: number; reach: number; sit: number; turn: number; jump: number };
const SKIN = "#f2c29b", COAT = "#e4572e", PANTS = "#2d3a4a", PACK = "#f3a712", CAP = "#2f6690";

function Limb({ len, r, color }: { len: number; r: number; color: string }) {
  return (
    <mesh position={[0, -len / 2, 0]} castShadow>
      <capsuleGeometry args={[r, len, 4, 10]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

function Pip({ x, y, pose }: { x: number; y: number; pose: Pose }) {
  const { swing, bob, wave, reach, sit, turn, jump } = pose;
  const heading = lerp(Math.PI / 2, 0, turn); // walking toward +x, or turned to the camera
  const s = swing;
  const waveArm = Math.sin(wave * 18) * 0.35 * clamp(wave * 4);
  return (
    <group position={[x, y + bob + jump - sit * 0.42, 0]} rotation={[0, heading, 0]}>
      {/* torso, head, cap, eyes, backpack */}
      <mesh position={[0, 1.08, 0]} castShadow><capsuleGeometry args={[0.27, 0.42, 4, 12]} /><meshStandardMaterial color={COAT} roughness={0.6} /></mesh>
      <mesh position={[0, 1.66, 0]} castShadow><sphereGeometry args={[0.24, 20, 16]} /><meshStandardMaterial color={SKIN} roughness={0.8} /></mesh>
      <mesh position={[0, 1.83, 0]} castShadow><cylinderGeometry args={[0.2, 0.25, 0.13, 18]} /><meshStandardMaterial color={CAP} /></mesh>
      <mesh position={[0, 1.78, 0.17]} rotation={[0.25, 0, 0]} castShadow><boxGeometry args={[0.3, 0.03, 0.18]} /><meshStandardMaterial color={CAP} /></mesh>
      <mesh position={[-0.08, 1.68, 0.21]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
      <mesh position={[0.08, 1.68, 0.21]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
      <mesh position={[0, 1.12, -0.3]} castShadow><boxGeometry args={[0.42, 0.48, 0.2]} /><meshStandardMaterial color={PACK} roughness={0.5} /></mesh>
      {/* arms: shoulder, then elbow; the right arm waves or reaches */}
      <group position={[-0.34, 1.36, 0]} rotation={[s * 0.7, 0, 0.12]}>
        <Limb len={0.32} r={0.075} color={COAT} />
        <group position={[0, -0.4, 0]} rotation={[-0.35 - Math.abs(s) * 0.3, 0, 0]}><Limb len={0.28} r={0.065} color={SKIN} /></group>
      </group>
      <group position={[0.34, 1.36, 0]} rotation={[-s * 0.7 * (1 - wave) * (1 - reach) - reach * 1.35, 0, -0.12 - wave * 2.55]}>
        <Limb len={0.32} r={0.075} color={COAT} />
        <group position={[0, -0.4, 0]} rotation={[-0.35 - wave * 0.4 - reach * 0.2, 0, waveArm]}><Limb len={0.28} r={0.065} color={SKIN} /></group>
      </group>
      {/* legs: hip, then knee; sitting folds both */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.14, 0.8, 0]} rotation={[side * s * 0.65 * (1 - sit) - sit * 1.45, 0, 0]}>
          <Limb len={0.32} r={0.09} color={PANTS} />
          <group position={[0, -0.42, 0]} rotation={[Math.max(0, -side * s) * 0.9 * (1 - sit) + sit * 1.45, 0, 0]}>
            <Limb len={0.28} r={0.08} color={PANTS} />
            <mesh position={[0, -0.4, 0.07]} castShadow><boxGeometry args={[0.16, 0.08, 0.28]} /><meshStandardMaterial color="#3b2f2f" /></mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ---------------- the village ---------------- */
function House({ x, z, color, roof, s = 1 }: { x: number; z: number; color: string; roof: string; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow><boxGeometry args={[3, 2.2, 2.6]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
      <mesh position={[0, 2.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[2.35, 1.3, 4]} /><meshStandardMaterial color={roof} roughness={0.8} /></mesh>
      <mesh position={[0, 0.65, 1.31]}><boxGeometry args={[0.6, 1.3, 0.04]} /><meshStandardMaterial color="#5a3d2b" /></mesh>
      <mesh position={[0.9, 1.4, 1.31]}><boxGeometry args={[0.55, 0.5, 0.04]} /><meshStandardMaterial color="#ffe9a8" emissive="#ffcc66" emissiveIntensity={0.25} /></mesh>
    </group>
  );
}

function Tree({ x, z, h }: { x: number; z: number; h: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h * 0.35, 0]} castShadow><cylinderGeometry args={[0.12, 0.18, h * 0.7, 8]} /><meshStandardMaterial color="#6b4a2f" /></mesh>
      <mesh position={[0, h * 0.85, 0]} castShadow><icosahedronGeometry args={[h * 0.42, 0]} /><meshStandardMaterial color="#4f9d4a" flatShading roughness={0.9} /></mesh>
    </group>
  );
}

function Bridge() {
  const planks = Array.from({ length: 16 }, (_, i) => RIVER[0] - 0.3 + (i + 0.5) * ((RIVER[1] - RIVER[0] + 0.6) / 16));
  return (
    <group>
      {planks.map((px, i) => {
        const dy = (groundY(px + 0.01) - groundY(px - 0.01)) / 0.02;
        return (
          <mesh key={i} position={[px, groundY(px) - 0.06, 0]} rotation={[0, 0, Math.atan(dy)]} castShadow receiveShadow>
            <boxGeometry args={[0.52, 0.1, 1.6]} />
            <meshStandardMaterial color={i % 2 ? "#a0703f" : "#8d5f33"} />
          </mesh>
        );
      })}
      {[-0.85, 0.85].map((z) => planks.filter((_, i) => i % 3 === 0).map((px, i) => (
        <mesh key={`${z}-${i}`} position={[px, groundY(px) + 0.3, z]} castShadow><boxGeometry args={[0.08, 0.6, 0.08]} /><meshStandardMaterial color="#6b4a2f" /></mesh>
      )))}
    </group>
  );
}

function Mailbox({ open }: { open: number }) {
  return (
    <group position={[9.4, 0, -0.45]}>
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.1, 1.1, 0.1]} /><meshStandardMaterial color="#5a3d2b" /></mesh>
      <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[0.55, 0.38, 0.38]} /><meshStandardMaterial color="#c0392b" /></mesh>
      <mesh position={[-0.28, 1.2, 0]} rotation={[0, 0, open * 1.3]}><boxGeometry args={[0.03, 0.36, 0.36]} /><meshStandardMaterial color="#e74c3c" /></mesh>
      <mesh position={[0.1, 1.48, 0.2]} rotation={[0, 0, -open * 1.4]}><boxGeometry args={[0.04, 0.3, 0.05]} /><meshStandardMaterial color="#f1c40f" /></mesh>
    </group>
  );
}

function World({ t }: { t: number }) {
  const houses = [-33, -24, -16].map((hx, i) => ({ x: hx, z: -4.5 - (i % 2), color: ["#f4e1c1", "#cfe3d4", "#f2d0c4"][i], roof: ["#b5523b", "#3f6c8f", "#7a4f9a"][i] }));
  const trees = Array.from({ length: 34 }, (_, i) => ({ x: -42 + i * 2.2 + seeded(i) * 1.2, z: (i % 2 ? 1 : -1) * (5 + seeded(i + 9) * 9), h: 2 + seeded(i + 3) * 2.2 }))
    .filter((tr) => (tr.x < RIVER[0] - 1 || tr.x > RIVER[1] + 1) && !(tr.x > 4 && tr.x < 26 && tr.z > 0 && tr.z < 10)); // keep the mailbox and hill shots clear
  const mailOpen = ease((t - 36) / 0.8) * (1 - ease((t - 42) / 0.8));
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow><planeGeometry args={[220, 120]} /><meshStandardMaterial color="#8cc36b" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-19, 0.01, 0]} receiveShadow><planeGeometry args={[26, 1.8]} /><meshStandardMaterial color="#d9c49a" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(RIVER[0] + RIVER[1]) / 2, 0.02, 0]}><planeGeometry args={[RIVER[1] - RIVER[0] - 0.6, 120]} /><meshStandardMaterial color="#4aa3df" roughness={0.25} metalness={0.1} /></mesh>
      <mesh position={[16, 1, 0]} rotation={[0, 0, Math.atan(2 / (HILL[1] - HILL[0]))]} receiveShadow><boxGeometry args={[Math.hypot(8, 2) + 0.2, 0.4, 40]} /><meshStandardMaterial color="#8cc36b" roughness={1} /></mesh>
      <mesh position={[30, 1, 0]} receiveShadow><boxGeometry args={[20.2, 2, 40]} /><meshStandardMaterial color="#8cc36b" roughness={1} /></mesh>
      {houses.map((h, i) => <House key={i} {...h} />)}
      {trees.map((tr, i) => <Tree key={i} {...tr} />)}
      <Tree x={22} z={-1.6} h={4.4} />
      <Bridge />
      <Mailbox open={mailOpen} />
    </group>
  );
}

/* ---------------- the camera: four shots, blended ---------------- */
function CameraRig({ t, px, py }: { t: number; px: number; py: number }) {
  const camera = useThree((st) => st.camera);
  const shots: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
    { at: 0, pos: [-24, 9, 18], look: [-30, 1, 0] }, // the village from above
    { at: 6, pos: [px - 2, py + 2.4, 8.5], look: [px + 1.5, py + 1.1, 0] }, // tracking beside Pip
    { at: 23, pos: [px - 5, py + 1.2, 5], look: [px + 1, py + 1.2, 0] }, // low, over the bridge
    { at: 31, pos: [px + 3.5, py + 1.9, 6], look: [px, py + 1.2, 0] }, // at the mailbox, facing Pip
    { at: 47, pos: [px - 3, py + 2.2, 7.5], look: [px + 2, py + 1.3, 0] }, // up the hill
    { at: 55, pos: [px + 6, py + 7, 16], look: [px, py + 1, 0] }, // the wide end
  ];
  let k = 0;
  while (k + 1 < shots.length && t >= shots[k + 1].at) k++;
  const a = shots[k], b = shots[Math.min(k + 1, shots.length - 1)];
  const blend = k + 1 < shots.length ? ease((t - (b.at - 1.6)) / 1.6) : 0; // glide into the next shot over 1.6 s
  const pos = new Vector3(...a.pos).lerp(new Vector3(...b.pos), blend);
  const look = new Vector3(...a.look).lerp(new Vector3(...b.look), blend);
  camera.position.copy(pos);
  camera.lookAt(look);
  return null;
}

export const Walk3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / FPS;
  const w = where(t);
  const wave = ease((t - 2) / 0.6) * (1 - ease((t - 5) / 0.6)) + ease((t - 43) / 0.6) * (1 - ease((t - 46.4) / 0.6));
  const reach = ease((t - 36.2) / 0.7) * (1 - ease((t - 41.5) / 0.7));
  const turn = ease((t - 1.2) / 0.8) * (1 - ease((t - 5.6) / 0.5)) + ease((t - 42) / 0.7) * (1 - ease((t - 46.6) / 0.6));
  const hop = t > 44.6 && t < 45.4 ? Math.sin(((t - 44.6) / 0.8) * Math.PI) * 0.45 : 0;
  const sit = ease((t - 56.4) / 1.2);
  const phase = (w.dist / STRIDE) * Math.PI * 2;
  const pose: Pose = { swing: Math.sin(phase) * w.moving, bob: Math.abs(Math.sin(phase)) * 0.06 * w.moving, wave, reach, sit, turn: Math.max(turn, sit * 0.6), jump: hop };
  const day = clamp((t - 30) / 28); // morning light to sunset
  const sky = mix("#9fd3f5", "#f6a96b", day);
  const sun = new Vector3(lerp(-20, 30, t / SECONDS), lerp(26, 6, day), 14);
  return (
    <AbsoluteFill style={{ backgroundColor: sky }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 38, near: 0.1, far: 300 }}>
        <color attach="background" args={[sky]} />
        <fog attach="fog" args={[sky, 30, 95]} />
        <hemisphereLight args={[mix("#ffffff", "#ffd1a8", day), "#6b8f4e", lerp(0.75, 1.15, day)]} />
        <directionalLight position={sun} intensity={lerp(2.4, 1.7, day)} color={mix("#fff6e5", "#ff9a5a", day)} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-40} shadow-camera-right={40}
          shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={120} shadow-bias={-0.0004} />
        <CameraRig t={t} px={w.x} py={w.y} />
        <World t={t} />
        <Pip x={w.x} y={w.y} pose={pose} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
