/* 3D experiment: a realistic rigged human (Soldier.glb from the three.js examples: a Mixamo character with motion-capture
   Idle and Walk clips) walking along the Varanasi ghat at sunrise. The clips are played by time (deterministic for
   rendering), blended by weight, and the body moves at the speed the walk's own planted foot travels, so feet never slide.
   Licence note: Mixamo characters and animations may be used in rendered work; the raw file must not be redistributed. */

import { useEffect, useMemo, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AnimationAction, AnimationMixer, Box3, Mesh, Object3D, Vector3 } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Boat, Ghat, Sky, Water, WATER_Y, clamp, col, ease, lerp } from "./Varanasi3D";

export const REAL_SECONDS = 20;
const FPS = 30;
const T0 = 44; // the Varanasi film's clock: this clip happens during the sunrise

type Rig = { scene: Object3D; mixer: AnimationMixer; idle: AnimationAction; walk: AnimationAction; walkLen: number; idleLen: number; speed: number; scale: number };

function useSoldier(): Rig | null {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => delayRender("loading the character"));
  useEffect(() => {
    new GLTFLoader().load(staticFile("threedemo/models/Soldier.glb"), (g) => { setGltf(g); continueRender(handle); }, undefined, (e) => cancelRender(e));
  }, [handle]);
  return useMemo(() => {
    if (!gltf) return null;
    const scene = gltf.scene;
    scene.traverse((o) => { if ((o as Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const mixer = new AnimationMixer(scene);
    const clip = (name: string) => gltf.animations.find((a) => a.name === name)!;
    const idle = mixer.clipAction(clip("Idle")), walk = mixer.clipAction(clip("Walk"));
    for (const a of [idle, walk]) { a.play(); a.setEffectiveWeight(0); }
    const height = new Box3().setFromObject(scene).getSize(new Vector3()).y;
    // the walk is "in place": measure how fast the planted foot moves back, which is how fast the body must move forward
    walk.setEffectiveWeight(1);
    const feet = ["mixamorigLeftFoot", "mixamorigRightFoot"].map((n) => scene.getObjectByName(n)!);
    const samples: { y: number; z: number }[][] = [[], []];
    const N = 62, len = walk.getClip().duration;
    for (let k = 0; k <= N; k++) {
      walk.time = (k / N) * len;
      mixer.update(0);
      scene.updateMatrixWorld(true);
      feet.forEach((f, i) => { const p = f.getWorldPosition(new Vector3()); samples[i].push({ y: p.y, z: p.z }); });
    }
    let travel = 0, count = 0;
    for (const s of samples) {
      const low = Math.min(...s.map((p) => p.y));
      for (let k = 1; k < s.length; k++) if (s[k].y < low + height * 0.02) { travel += Math.abs(s[k].z - s[k - 1].z); count++; }
    }
    const speed = count ? (travel / count) / (len / N) : 1.3 * height / 1.8; // metres per second in model units
    walk.setEffectiveWeight(0);
    return { scene, mixer, idle, walk, walkLen: len, idleLen: idle.getClip().duration, speed, scale: 1.78 / height };
  }, [gltf]);
}

function CameraRig({ t, x }: { t: number; x: number }) {
  const camera = useThree((st) => st.camera);
  const shots: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
    { at: 0, pos: [x + 3.2, 1.55, 5.2], look: [x, 1.0, 0.6] }, // beside him as he walks
    { at: 8, pos: [x + 1.8, 1.45, 3.0], look: [x, 1.25, 0.6] }, // closer as he slows
    { at: 13, pos: [x - 1.5, 1.8, -2.4], look: [x + 1.4, 1.1, 12] }, // behind his shoulder, looking at the river and the sun
  ];
  let k = 0;
  while (k + 1 < shots.length && t >= shots[k + 1].at) k++;
  const a = shots[k], b = shots[Math.min(k + 1, shots.length - 1)];
  const blend = k + 1 < shots.length ? ease((t - (b.at - 1.8)) / 1.8) : 0;
  camera.position.copy(new Vector3(...a.pos).lerp(new Vector3(...b.pos), blend));
  camera.lookAt(new Vector3(...a.look).lerp(new Vector3(...b.look), blend));
  return null;
}

export const RealWalk3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / FPS;
  const rig = useSoldier();
  // walk from x -5.4 to about x 8 along the landing (between the chhatris), then stop and turn to the river
  const going = ease((t - 1.5) / 0.8) * (1 - ease((t - 10.4) / 0.9)); // 0 standing .. 1 walking
  let x = -5.4;
  const STEPS = Math.round(t * FPS);
  for (let k = 1; k <= STEPS; k++) { // integrate the speed frame by frame (deterministic)
    const tk = k / FPS;
    const g = ease((tk - 1.5) / 0.8) * (1 - ease((tk - 10.4) / 0.9));
    x += g * (rig ? rig.speed * rig.scale : 1.3) / FPS;
  }
  const turn = ease((t - 11.6) / 1.2); // from facing along the ghat to facing the river
  if (rig) {
    rig.walk.time = (t * 1.0) % rig.walkLen;
    rig.idle.time = t % rig.idleLen;
    rig.walk.setEffectiveWeight(going);
    rig.idle.setEffectiveWeight(1 - going);
    rig.mixer.update(0);
  }
  const tc = T0 + t * 0.7; // the sunrise moves on through the clip
  const sunUp = ease((tc - 43) / 14);
  const sunPos = new Vector3(-18, lerp(-10, 22, sunUp), 150);
  const zenith = col([[0, "#0a1630"], [44, "#4c6fa8"], [60, "#7fb2df"]], tc), horizon = col([[28, "#6a5a7e"], [42, "#f09a62"], [60, "#ffd9a0"]], tc);
  const glow = col([[40, "#ff8a3c"], [60, "#fff0c0"]], tc), water = col([[38, "#4d628a"], [50, "#c98f55"], [60, "#dcae70"]], tc);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 36, near: 0.05, far: 900 }}>
        <fog attach="fog" args={[horizon.clone().lerp(zenith, 0.35), 25, 190]} />
        <Sky zenith={zenith} horizon={horizon} glow={glow} sunDir={sunPos.clone().normalize()} strength={1} />
        <mesh position={sunPos}><sphereGeometry args={[7, 24, 16]} /><meshBasicMaterial color={col([[43, "#ff6a2a"], [60, "#fff3cf"]], tc)} fog={false} /></mesh>
        <hemisphereLight args={[col([[44, "#ffc89a"], [60, "#ffffff"]], tc), "#6a5040", 1.1]} />
        <directionalLight position={new Vector3(-18, lerp(4, 40, sunUp), 80)} intensity={lerp(1.2, 2.6, sunUp)} color={col([[44, "#ff9a50"], [60, "#ffe2b0"]], tc)} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-camera-far={200} shadow-bias={-0.0004} />
        <CameraRig t={t} x={x} />
        <Ghat night={clamp(1 - (tc - 44) / 8)} />
        <Water t={tc} color={water} />
        {[[-9, 2.6], [-3.5, 3.1], [12, 2.8], [19, 3.4]].map(([bx, bz], i) => <Boat key={i} x={bx} z={bz} t={tc} rot={(i % 2 ? 1 : -1) * 0.06} />)}
        {rig && (
          <group position={[x, 0, 0.6]} rotation={[0, lerp(-Math.PI / 2, -Math.PI, turn), 0]} scale={rig.scale}>
            <primitive object={rig.scene} />
          </group>
        )}
      </ThreeCanvas>
      <Audio src={staticFile("threedemo/varanasi/ambient.wav")} volume={0.45} startFrom={Math.round(T0 * FPS)} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64, background: "#000" }} />
    </AbsoluteFill>
  );
};
