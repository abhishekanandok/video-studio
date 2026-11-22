/* LAYER 2, part D: BLOCKS for CHARACTERS, SETS, VEHICLES, OBJECTS and SYMBOLS.
   Characters are drawn (no picture needed): a person with a face that shows a feeling, a mouth that talks on the spoken
   words, eyes that blink, an action (wave, point, think, facepalm…) and clothes for a job. Sets are whole backgrounds a
   scene happens in. Like the other parts: give it its data and `at`, place it with <At> or a wrapper, any <Move>/<Move2>. */

import type { CSSProperties, ReactNode } from "react";
import { Img } from "remotion";
import { clamp01, family, useScene } from "../kit";
import { ease, rand } from "./motion";
import { shadow, src, useIn } from "./blocks-a";
import { Background, Part, SvgPart, block, isPicture, usePartValue } from "./parts";

/* ================= CHARACTERS ================= */
export type Emotion = "neutral" | "happy" | "sad" | "angry" | "scared" | "surprised" | "thinking" | "laughing" | "worried" | "proud";
export type Job = "none" | "doctor" | "teacher" | "soldier" | "farmer" | "police" | "chef" | "worker" | "business" | "student" | "scientist" | "judge" | "nurse" | "elder" | "saree" | "kurta" | "sikh" | "kid" | "grandma";
export type Action = "stand" | "wave" | "point" | "think" | "facepalm" | "cheer" | "shrug" | "talk" | "cross" | "hold" | "walk" | "run" | "sit" | "jump" | "climb" | "handshake" | "hug" | "highfive" | "give";

/** is anyone speaking now (a word being said in the scene's voice)? the mouth moves only then */
function useTalking(from?: number, to?: number) {
  const { t, words } = useScene();
  if (from !== undefined) return t >= from && t <= (to ?? from + 3);
  return words.some((w) => t >= w.s && t <= w.e);
}
export type Viseme = "open" | "wide" | "round" | "closed" | "bite" | "mid";
/** the mouth shape for the sound being said now: the letter at this point of the spoken word (from the voice's word
    times), so "Bombay" closes on the b's and m and opens on the a; with no word (talkFrom) it opens and closes */
export function visemeAt(words: { w: string; s: number; e: number }[], t: number, seed = 1): Viseme {
  const w = words.find((x) => t >= x.s && t <= x.e);
  if (!w) return (["mid", "open", "mid", "closed"] as Viseme[])[Math.floor((t * 9 + seed) % 4)];
  const letters = w.w.toLowerCase().replace(/[^a-z]/g, "") || "a", c = letters[Math.min(letters.length - 1, Math.floor(((t - w.s) / Math.max(0.05, w.e - w.s)) * letters.length))];
  return "aá".includes(c) ? "open" : "eiy".includes(c) ? "wide" : "ouw".includes(c) ? "round" : "mbp".includes(c) ? "closed" : "fv".includes(c) ? "bite" : "mid";
}
/** a face: eyes that blink, brows and a mouth for each feeling; the mouth opens and closes while talking */
function FaceView({ emotion = "neutral", size = 220, skin = "var(--skin, #f2c9a0)", talking = false, gaze = 0, seed = 1 }: { emotion?: Emotion; size?: number; skin?: string; talking?: boolean; gaze?: number; seed?: number }) {
  const { t } = useScene();
  const { words } = useScene();
  const blink = ((t + rand(seed) * 3) % 3.4) < 0.12 ? 0.1 : 1;
  const vis = talking ? visemeAt(words, t, seed) : null;
  const ex = gaze * 6;  // where the eyes look: -1 left … 1 right
  const brow: Record<Emotion, [number, number]> = { neutral: [0, 0], happy: [-3, 0], sad: [8, -1], angry: [-10, 1], scared: [10, -1], surprised: [-10, 0], thinking: [-6, 1], laughing: [-4, 0], worried: [7, -1], proud: [-2, 0] };
  const [by, tilt] = brow[emotion];
  const mouth = (): ReactNode => {
    if (vis) {
      const [rx, ry] = { open: [11, 10], wide: [14, 6], round: [7, 8], closed: [11, 1.2], bite: [12, 3], mid: [10, 5] }[vis];
      return <><ellipse cx={50} cy={72} rx={rx} ry={ry} fill="#7a2a2a" />{vis === "bite" && <rect x={42} y={68} width={16} height={4} rx={2} fill="#fff" />}{(vis === "open" || vis === "wide") && <rect x={44} y={72 - ry} width={12} height={3} rx={1} fill="#fff" />}</>;
    }
    switch (emotion) {
      case "happy": case "proud": return <path d="M36 68 Q50 82 64 68" fill="none" stroke="#7a2a2a" strokeWidth={4} strokeLinecap="round" />;
      case "laughing": return <path d="M34 66 Q50 90 66 66 Z" fill="#7a2a2a" />;
      case "sad": return <path d="M38 78 Q50 68 62 78" fill="none" stroke="#7a2a2a" strokeWidth={4} strokeLinecap="round" />;
      case "angry": return <path d="M38 76 L62 76" stroke="#7a2a2a" strokeWidth={5} strokeLinecap="round" />;
      case "scared": case "surprised": return <ellipse cx={50} cy={74} rx={8} ry={10} fill="#7a2a2a" />;
      case "worried": return <path d="M38 76 Q44 72 50 76 Q56 80 62 76" fill="none" stroke="#7a2a2a" strokeWidth={4} strokeLinecap="round" />;
      case "thinking": return <path d="M42 74 L60 72" stroke="#7a2a2a" strokeWidth={4} strokeLinecap="round" />;
      default: return <path d="M40 72 Q50 76 60 72" fill="none" stroke="#7a2a2a" strokeWidth={4} strokeLinecap="round" />;
    }
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
      <ellipse cx={50} cy={50} rx={40} ry={44} fill={skin} />
      <ellipse cx={14} cy={52} rx={6} ry={9} fill={skin} /><ellipse cx={86} cy={52} rx={6} ry={9} fill={skin} />
      {(emotion === "happy" || emotion === "laughing" || emotion === "proud") && <><circle cx={28} cy={62} r={6} fill="#f08a8a" opacity={0.5} /><circle cx={72} cy={62} r={6} fill="#f08a8a" opacity={0.5} /></>}
      {[34, 66].map((x, i) => <g key={x}>
        <ellipse cx={x + ex} cy={46} rx={emotion === "surprised" || emotion === "scared" ? 7 : 5.5} ry={(emotion === "surprised" || emotion === "scared" ? 8 : 6.5) * blink} fill="var(--hair, #2a2320)" />
        <path d={`M${x - 9} ${34 + by * (i ? -tilt || 1 : 1) * (tilt ? 1 : 0) + (tilt ? 0 : by * 0.4)} L${x + 9} ${34 + (tilt ? (i ? by : -by) * 0.4 : by * 0.4)}`} stroke="color-mix(in srgb, var(--hair, #2a2320) 97%, #fff)" strokeWidth={4} strokeLinecap="round" transform={tilt ? `rotate(${(i ? 1 : -1) * tilt * by} ${x} 34)` : undefined} />
      </g>)}
      {emotion === "laughing" && <><path d="M28 46 Q34 40 40 46" fill="none" stroke="var(--hair, #2a2320)" strokeWidth={4} /><path d="M60 46 Q66 40 72 46" fill="none" stroke="var(--hair, #2a2320)" strokeWidth={4} /></>}
      {emotion === "sad" && <ellipse cx={30} cy={56 + ((t * 30) % 20)} rx={2.5} ry={4} fill="#6ab0e8" opacity={1 - ((t * 30) % 20) / 20} />}
      {emotion === "worried" && <ellipse cx={82} cy={30 + ((t * 10) % 8)} rx={3} ry={5} fill="#9fd3f5" />}
      <SvgPart name="mouth" item={vis ?? emotion} x={28} y={58} w={44} h={30}>{mouth()}</SvgPart>
    </svg>
  );
}
export const Face = block("Face", FaceView);
const OUTFIT: Record<Job, { top: string; bottom: string; hat?: ReactNode; extra?: ReactNode; skirt?: string; long?: boolean; shorts?: boolean; white?: boolean }> = {
  none: { top: "#4a7fc1", bottom: "#33415c" },
  doctor: { top: "#f4f6f8", bottom: "#4a6a8a", extra: <path d="M-12 120 Q-12 160 0 165 Q12 160 12 120" fill="none" stroke="#555" strokeWidth={4} /> },
  nurse: { top: "#8fd0d8", bottom: "#8fd0d8", hat: <rect x={-26} y={-6} width={52} height={14} rx={4} fill="#fff" /> },
  teacher: { top: "#b5533c", bottom: "#3d3d4d" },
  soldier: { top: "#5b6b3a", bottom: "#4a5530", hat: <path d="M-46 4 Q0 -40 46 4 Z" fill="#4a5530" /> },
  farmer: { top: "#c98a3a", bottom: "#4a6a9a", hat: <><ellipse cx={0} cy={4} rx={62} ry={12} fill="#d9b35a" /><path d="M-30 4 Q0 -34 30 4 Z" fill="#d9b35a" /></> },
  police: { top: "#2f4a7a", bottom: "#22344f", hat: <><rect x={-40} y={-10} width={80} height={20} rx={6} fill="#22344f" /><rect x={-46} y={6} width={92} height={8} rx={4} fill="#111" /></> },
  chef: { top: "#fafafa", bottom: "#333", hat: <><rect x={-28} y={-30} width={56} height={34} fill="#fff" /><circle cx={-18} cy={-34} r={18} fill="#fff" /><circle cx={18} cy={-34} r={18} fill="#fff" /><circle cx={0} cy={-42} r={20} fill="#fff" /></> },
  worker: { top: "#f08a1c", bottom: "#3a4a6a", hat: <path d="M-42 6 Q0 -44 42 6 Z" fill="var(--warn, #f0b43a)" /> },
  business: { top: "#2a2f3a", bottom: "#2a2f3a", extra: <path d="M-6 95 L6 95 L10 150 L0 160 L-10 150 Z" fill="color-mix(in srgb, var(--bad, #e0453a) 85%, #000)" /> },
  student: { top: "#f4f4f4", bottom: "#2f4a7a", extra: <rect x={30} y={100} width={22} height={70} rx={8} fill="color-mix(in srgb, var(--bad, #e0453a) 85%, #000)" /> },
  scientist: { top: "#fafafa", bottom: "#555", extra: <rect x={-30} y={30} width={60} height={14} rx={7} fill="none" stroke="#333" strokeWidth={4} /> },
  judge: { top: "#1a1a1a", bottom: "#1a1a1a", extra: <path d="M-14 92 L0 110 L14 92" fill="#fff" /> },
  elder: { top: "#e8e2d4", bottom: "#e8e2d4" },
  saree: { top: "#c8302e", bottom: "#c8302e", skirt: "#d9452e", extra: <path d="M-46 84 L40 80 L50 200 L20 200 Z" fill="#f0b43a" opacity={0.9} /> },
  kurta: { top: "#f4e3c3", bottom: "#f4f4f4", long: true, extra: <path d="M0 80 L0 140" stroke="#c9a46a" strokeWidth={3} strokeDasharray="4 8" /> },
  sikh: { top: "#3a6ab9", bottom: "#33415c", hat: <><path d="M-48 10 Q-50 -36 0 -40 Q50 -36 48 10 Q30 -4 0 -4 Q-30 -4 -48 10 Z" fill="#e08a1c" /><path d="M-40 -6 Q0 -30 40 -6" stroke="#c06a0c" strokeWidth={4} fill="none" /></> },
  kid: { top: "#f0b43a", bottom: "#3a7ae0", shorts: true },
  grandma: { top: "#e8e2d4", bottom: "#8a6ad8", skirt: "#7a5ac8", white: true, hat: <circle cx={0} cy={-8} r={16} fill="#e6e6e6" /> },
};
/** a drawn person: a face that shows a feeling, a mouth that talks on the words (its shape follows each sound), arms and
    legs doing an action (walk, run, sit, jump, climb, wave, point… or with someone: handshake, hug, highfive, give),
    clothes for a job or a dress (saree, kurta, sikh turban, kid, grandma). `talkFrom`/`talkTo` (s) make it talk then;
    otherwise it talks whenever the scene's voice speaks if `talks`. Move it about with <Go> or any motion. */
function CharacterView({ emotion = "neutral", action = "stand", job = "none", height = 560, skin = "var(--skin, #f2c9a0)", hair = "var(--hair, #2a2320)", at = 0, talks = false, talkFrom, talkTo, face = 1, gaze = 0, seed = 1, speed = 1 }: {
  emotion?: Emotion; action?: Action; job?: Job; height?: number; skin?: string; hair?: string; at?: number; talks?: boolean; talkFrom?: number; talkTo?: number; face?: 1 | -1; gaze?: number; seed?: number; speed?: number;
}) {
  const { t, u } = useIn(at, 0.6);
  const talkingNow = useTalking(talkFrom, talkTo);
  const talking = (talks || talkFrom !== undefined) && talkingNow;
  const o = OUTFIT[job], kid = job === "kid", s = height / (kid ? 330 : 400), k = clamp01((t - at) / 0.6);
  const ph = (t - at) * (action === "run" ? 11 : 7) * speed, swing = Math.sin(ph);
  const wave = Math.sin(t * 8) * 20, gest = talking ? Math.sin(t * 3) * 10 : 0;
  const arms: Record<Action, [number, number]> = { stand: [8, -8], wave: [8, -150 + wave], point: [8, -95], think: [8, -140], facepalm: [8, -160], cheer: [160, -160], shrug: [70, -70], talk: [20 + gest, -30 - gest], cross: [60, -60], hold: [-40, 40],
    walk: [swing * 28, swing * 28], run: [swing * 60 + 20, swing * 60 - 20], sit: [30, -30], jump: [150, -150], climb: [140 + swing * 30, -140 + swing * 30],
    handshake: [8, 78 + Math.sin(t * 9) * 6], hug: [70, 85], highfive: [8, 150], give: [8, 70] };
  const [aL, aR] = arms[action].map((a) => a * ease.out(k)) as [number, number];
  const legs = action === "walk" ? swing * 24 : action === "run" ? swing * 46 : action === "climb" ? swing * 30 : 0;
  const hop = action === "jump" ? Math.max(0, Math.sin(((t - at) % 1.1) / 1.1 * Math.PI)) * 120 : action === "walk" || action === "run" ? Math.abs(Math.sin(ph)) * (action === "run" ? 12 : 6) : 0;
  const sit = action === "sit", lean = action === "run" ? 8 : action === "hug" ? 6 : 0;
  const white = job === "elder" || o.white, legLen = o.shorts ? 120 : 120;
  const leg = (x: number, a: number) => <g transform={`rotate(${a} ${x + 14} 190)`}>
    <rect x={x} y={190} width={28} height={sit ? 60 : legLen} rx={12} fill={o.shorts ? skin : o.bottom} />{o.shorts && <rect x={x - 2} y={188} width={32} height={50} rx={10} fill={o.bottom} />}
    <ellipse cx={x + 14} cy={sit ? 252 : 312} rx={22} ry={10} fill="#222" />
  </g>;
  return (
    <svg width={200 * s} height={height} viewBox={kid ? "-100 -80 200 330" : "-100 -80 200 400"} style={{ overflow: "visible", transform: `scaleX(${face}) translateY(${(1 - u) * 40 - hop * s + (sit ? 60 * s : 0)}px) rotate(${lean}deg)`, transformOrigin: "50% 100%", opacity: u }}>
      <g transform={kid ? "translate(0 -10) scale(1 0.8)" : undefined}>
        <SvgPart name="legs" item={{ action, swing: legs }} x={-62} y={184} w={124} h={136}>
        {!o.skirt && <>{leg(-34, legs)}{leg(6, -legs)}</>}
        {o.skirt && <><path d={`M-48 180 L48 180 L${60 + legs * 0.6} 306 L${-60 + legs * 0.6} 306 Z`} fill={o.skirt} /><ellipse cx={-22 + legs * 0.8} cy={312} rx={20} ry={9} fill="#222" /><ellipse cx={22 - legs * 0.8} cy={312} rx={20} ry={9} fill="#222" /></>}
        </SvgPart>
        <g transform={`rotate(${-aL} -46 92)`}><SvgPart name="armL" x={-60} y={88} w={28} h={128}><rect x={-58} y={90} width={24} height={110} rx={12} fill={o.top} /><circle cx={-46} cy={202} r={13} fill={skin} /></SvgPart></g>
        <SvgPart name="torso" item={{ job }} x={-56} y={76} w={112} h={o.long ? 188 : 126}>
        <path d={o.long ? "M-50 86 Q-52 80 -40 78 L40 78 Q52 80 50 86 L56 262 L-56 262 Z" : "M-50 86 Q-52 80 -40 78 L40 78 Q52 80 50 86 L46 200 L-46 200 Z"} fill={o.top} />
        {o.extra}
        </SvgPart>
        <g transform={`rotate(${-aR} 46 92)`}><rect x={34} y={90} width={24} height={110} rx={12} fill={o.top} /><circle cx={46} cy={202} r={13} fill={skin} />{action === "point" && <rect x={42} y={208} width={8} height={26} rx={4} fill={skin} />}<SvgPart name="hold" x={16} y={186} w={64} h={64}>{null}</SvgPart></g>
      </g>
      <rect x={-10} y={58} width={20} height={24} fill={skin} />
      <g transform={`translate(-55 ${kid ? -84 : -64}) scale(${kid ? 1.12 : 1}) rotate(${action === "think" ? -8 : action === "shrug" ? 6 : Math.sin(t * 1.2 + seed) * 2} 55 120)`}>
        <SvgPart name="head" item={{ emotion, talking }} x={0} y={0} w={110} h={120}>
        <Face emotion={emotion} size={110} skin={skin} talking={talking} gaze={gaze} seed={seed} />
        <path d={white && job !== "grandma" ? "M14 30 Q55 6 96 30 Q90 18 55 14 Q20 18 14 30 Z" : job === "saree" || job === "grandma" ? "M10 46 Q10 2 55 2 Q100 2 100 46 Q92 16 55 16 Q18 16 10 46 Z" : "M12 40 Q14 4 55 4 Q96 4 98 40 Q88 18 55 18 Q22 18 12 40 Z"} fill={white ? "#e6e6e6" : hair} />
        {job === "elder" && <path d="M30 88 Q55 112 80 88" fill="none" stroke="#e6e6e6" strokeWidth={10} strokeLinecap="round" />}
        {(job === "saree" || job === "grandma") && <circle cx={55} cy={40} r={4} fill="#c8102e" />}
        <g transform="translate(55 6)"><SvgPart name="hat" x={-55} y={-60} w={110} h={66}>{o.hat}</SvgPart></g>
        </SvgPart>
      </g>
      {action === "think" && <g transform={`translate(70 -70) scale(${ease.back(k)})`}><circle cx={0} cy={30} r={6} fill="#fff" stroke="#999" strokeWidth={2} /><circle cx={14} cy={10} r={10} fill="#fff" stroke="#999" strokeWidth={2} /><ellipse cx={40} cy={-24} rx={34} ry={26} fill="#fff" stroke="#999" strokeWidth={2} /><text x={40} y={-14} textAnchor="middle" fontSize={30}>?</text></g>}
    </svg>
  );
}
export const Character = block("Character", CharacterView);
/** a host or mascot: a round friendly figure that bobs, blinks and talks with the voice (a channel's presenter) */
function MascotView({ size = 380, color, emotion = "happy", at = 0, talks = true }: { size?: number; color?: string; emotion?: Emotion; at?: number; talks?: boolean }) {
  const { t, theme, b } = useIn(at, 0.6);
  const talking = useTalking() && talks;
  return (
    <div style={{ width: size, height: size * 1.1, position: "relative", transform: `scale(${b}) translateY(${Math.sin(t * 2.4) * 10}px)` }}>
      <div style={{ position: "absolute", left: size * 0.47, top: -size * 0.12, width: 10, height: size * 0.16, background: theme.ink, borderRadius: 5, transform: `rotate(${Math.sin(t * 3) * 10}deg)`, transformOrigin: "50% 100%" }}><div style={{ position: "absolute", left: -10, top: -18, width: 30, height: 30, borderRadius: 15, background: theme.accent2 }} /></div>
      <div style={{ position: "absolute", inset: 0 }}><Part name="body" fit="contain"><div style={{ position: "absolute", inset: 0, borderRadius: "48% 48% 44% 44%", background: `radial-gradient(circle at 35% 30%, #fff8, transparent 40%), ${color ?? theme.accent}`, boxShadow: shadow }} /></Part></div>
      <div style={{ position: "absolute", left: size * 0.18, top: size * 0.2, width: size * 0.64, height: size * 0.64 }}><Part name="face" item={{ emotion, talking }} fit="contain"><Face emotion={emotion} size={size * 0.64} skin="transparent" talking={talking} /></Part></div>
    </div>
  );
}
export const Mascot = block("Mascot", MascotView);
/** an animal, drawn: dog, cat, bird, cow, elephant, fish, lion, horse; it idles (tail, wings, fins) */
function AnimalView({ kind, size = 300, at = 0, face = 1, color }: { kind: "dog" | "cat" | "bird" | "cow" | "elephant" | "fish" | "lion" | "horse"; size?: number; at?: number; face?: 1 | -1; color?: string }) {
  const { t, b } = useIn(at, 0.5);
  const wag = Math.sin(t * 10) * 18, flap = Math.sin(t * 14) * 30, swim = Math.sin(t * 4) * 10;
  const C = color ?? { dog: "#c98a4a", cat: "#8a8a8a", bird: "#3a9ad9", cow: "#f4f4f4", elephant: "color-mix(in srgb, var(--metal, #8a939d) 85%, #fff)", fish: "#f08a1c", lion: "#d9a34a", horse: "color-mix(in srgb, var(--wood, #8a5a2a) 87%, #000)" }[kind];
  const eye = (x: number, y: number) => <circle cx={x} cy={y} r={4} fill="#111" />;
  const body: Record<string, ReactNode> = {
    dog: <><g transform={`rotate(${wag} 80 40)`}><rect x={78} y={10} width={10} height={34} rx={5} fill={C} /></g><ellipse cx={45} cy={50} rx={42} ry={22} fill={C} />{[14, 30, 60, 76].map((x) => <rect key={x} x={x} y={62} width={10} height={30} rx={5} fill={C} />)}<circle cx={-2} cy={32} r={22} fill={C} /><ellipse cx={-12} cy={18} rx={8} ry={16} fill="var(--wood, #8a5a2a)" />{eye(-8, 30)}<circle cx={-22} cy={38} r={4} fill="#111" /></>,
    cat: <><path d={`M80 50 Q${110 + wag} 20 ${96 + wag} 0`} fill="none" stroke={C} strokeWidth={8} strokeLinecap="round" /><ellipse cx={45} cy={52} rx={38} ry={20} fill={C} />{[18, 32, 58, 72].map((x) => <rect key={x} x={x} y={62} width={8} height={26} rx={4} fill={C} />)}<circle cx={0} cy={34} r={20} fill={C} /><path d="M-16 20 L-12 2 L-4 16 Z M4 16 L12 2 L16 20 Z" fill={C} />{eye(-6, 32)}{eye(6, 32)}</>,
    bird: <><ellipse cx={40} cy={40} rx={34} ry={22} fill={C} /><g transform={`rotate(${-flap} 40 34)`}><path d="M30 34 Q40 -10 70 20 Z" fill="#2a7ab9" /></g><circle cx={8} cy={28} r={16} fill={C} /><path d="M-6 28 L-22 32 L-6 36 Z" fill="var(--warn, #f0b43a)" />{eye(4, 25)}<path d="M72 40 L96 30 L96 50 Z" fill="#2a7ab9" /></>,
    cow: <><ellipse cx={45} cy={46} rx={46} ry={26} fill={C} /><ellipse cx={30} cy={40} rx={12} ry={9} fill="#333" /><ellipse cx={64} cy={52} rx={10} ry={8} fill="#333" />{[12, 28, 62, 78].map((x) => <rect key={x} x={x} y={62} width={11} height={32} rx={4} fill={C} />)}<ellipse cx={-6} cy={34} rx={18} ry={22} fill={C} /><ellipse cx={-10} cy={50} rx={14} ry={9} fill="#f2b5b5" />{eye(-12, 28)}<path d="M-20 14 L-26 4 M4 14 L10 4" stroke="#bbb" strokeWidth={5} strokeLinecap="round" /><g transform={`rotate(${wag / 2} 90 36)`}><path d="M90 36 L104 70" stroke={C} strokeWidth={5} /></g></>,
    elephant: <><ellipse cx={50} cy={44} rx={50} ry={34} fill={C} />{[14, 34, 64, 84].map((x) => <rect key={x} x={x} y={62} width={16} height={34} rx={6} fill={C} />)}<circle cx={0} cy={36} r={28} fill={C} /><ellipse cx={14} cy={30} rx={18} ry={24} fill="var(--metal, #8a939d)" /><path d={`M-24 44 Q-34 ${80 + swim} -${20 - swim / 2} 96`} fill="none" stroke={C} strokeWidth={13} strokeLinecap="round" />{eye(-8, 30)}<path d="M-16 52 Q-24 58 -30 52" stroke="#fff" strokeWidth={5} fill="none" /></>,
    fish: <><g transform={`rotate(${swim * 2} 70 40)`}><path d="M70 40 L100 18 L100 62 Z" fill={C} /></g><ellipse cx={36} cy={40} rx={40} ry={24} fill={C} /><path d="M30 20 Q40 6 54 18" fill={C} />{eye(10, 34)}<path d="M40 24 Q48 40 40 56" fill="none" stroke="#fff6" strokeWidth={4} /></>,
    lion: <><path d={`M84 46 Q${110 + wag / 2} 50 ${108 + wag / 2} 26`} fill="none" stroke={C} strokeWidth={6} /><ellipse cx={48} cy={50} rx={40} ry={22} fill={C} />{[18, 32, 62, 76].map((x) => <rect key={x} x={x} y={62} width={11} height={30} rx={5} fill={C} />)}<circle cx={0} cy={36} r={34} fill="#a8641c" /><circle cx={0} cy={36} r={22} fill={C} />{eye(-8, 32)}{eye(8, 32)}<path d="M-6 44 L0 48 L6 44" fill="none" stroke="#111" strokeWidth={3} /></>,
    horse: <><ellipse cx={46} cy={44} rx={44} ry={22} fill={C} />{[12, 26, 66, 80].map((x) => <rect key={x} x={x} y={58} width={10} height={40} rx={4} fill={C} />)}<path d="M8 40 L-10 0 L-30 4 L-16 44 Z" fill={C} /><path d="M-10 0 Q0 10 4 34" fill="none" stroke="#3a2010" strokeWidth={8} />{eye(-18, 10)}<g transform={`rotate(${wag / 2} 90 34)`}><path d="M90 34 Q104 50 98 80" fill="none" stroke="#3a2010" strokeWidth={8} /></g></>,
  };
  return <svg width={size} height={size} viewBox="-40 -20 150 120" style={{ overflow: "visible", transform: `scale(${b}) scaleX(${face})` }}><SvgPart name="body" item={{ kind }} x={-40} y={-20} w={150} h={120}>{body[kind]}</SvgPart></svg>;
}
export const Animal = block("Animal", AnimalView);
/** a comic speech, thought or shout bubble with words that type out; `tail` says where the speaker is */
function ComicBubbleView({ text, kind = "speech", at = 0, w = 600, tail = "bl", size = 44 }: { text: string; kind?: "speech" | "thought" | "shout" | "whisper"; at?: number; w?: number; tail?: "bl" | "br" | "tl" | "tr"; size?: number }) {
  const { t, theme, b } = useIn(at, 0.4);
  const n = Math.floor(clamp01((t - at - 0.2) / Math.max(0.4, text.length * 0.03)) * text.length);
  const left = tail[1] === "l", bottom = tail[0] === "b";
  const base: CSSProperties = { position: "relative", width: w, padding: "30px 40px", background: "#fff", color: "#111", fontFamily: family(kind === "shout" ? theme.display : theme.font), fontSize: kind === "shout" ? size * 1.3 : kind === "whisper" ? size * 0.85 : size, fontWeight: kind === "shout" ? 800 : 600, lineHeight: 1.25, transform: `scale(${b})`, transformOrigin: `${left ? 10 : 90}% ${bottom ? 100 : 0}%`, boxShadow: shadow, boxSizing: "border-box", fontStyle: kind === "whisper" ? "italic" : undefined };
  const shape: CSSProperties = kind === "thought" ? { borderRadius: "50%", padding: "50px 60px", border: "4px solid #333" } : kind === "shout" ? { clipPath: "polygon(0 12%, 8% 0, 22% 10%, 36% 0, 50% 8%, 64% 0, 78% 10%, 92% 0, 100% 14%, 94% 34%, 100% 52%, 94% 70%, 100% 88%, 86% 100%, 70% 90%, 54% 100%, 38% 90%, 22% 100%, 8% 90%, 0 76%, 6% 56%, 0 36%)", padding: "60px 70px", background: "#ffe14a" } : { borderRadius: 40, border: kind === "whisper" ? "4px dashed #777" : "4px solid #333" };
  return (
    <div style={{ ...base, ...shape }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", zIndex: -1 }}><Part name="bubble">{null}</Part></div>
      {text.slice(0, n)}<span style={{ opacity: 0 }}>{text.slice(n)}</span>
      {kind === "speech" || kind === "whisper" ? <div style={{ position: "absolute", [left ? "left" : "right"]: 60, [bottom ? "bottom" : "top"]: -34, width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "20px solid transparent", [bottom ? "borderTop" : "borderBottom"]: "36px solid #333" }} /> : null}
      {kind === "thought" && <><div style={{ position: "absolute", [left ? "left" : "right"]: 40, [bottom ? "bottom" : "top"]: -40, width: 30, height: 30, borderRadius: 15, background: "#fff", border: "4px solid #333" }} /><div style={{ position: "absolute", [left ? "left" : "right"]: 14, [bottom ? "bottom" : "top"]: -70, width: 18, height: 18, borderRadius: 9, background: "#fff", border: "4px solid #333" }} /></>}
    </div>
  );
}
export const ComicBubble = block("ComicBubble", ComicBubbleView);

/* ================= SETS: whole backgrounds a scene happens in (each fills the stage) ================= */
const fill: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
const Box = ({ x, y, w, h, c, r = 0, style }: { x: number; y: number; w: number; h: number; c: string; r?: number; style?: CSSProperties }) => <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: c, borderRadius: r, ...style }} />;
/** a classroom: a green board (with `board` text written on it), desks in rows, a window */
function ClassroomView({ board = "", at = 0 }: { board?: string; at?: number }) {
  const { t, W, H } = useScene();
  const n = Math.floor(clamp01((t - at) / Math.max(0.5, board.length * 0.06)) * board.length);
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--wall, #e8e4dc) 99%, #000)" }} /></Part>
    <Background />
    <Part name="board" still>
    <Box x={W * 0.18} y={H * 0.1} w={W * 0.5} h={H * 0.42} c="#2f5a3c" r={8} style={{ border: "18px solid var(--wood, #8a5a2a)" }} />
    </Part>
    <Part name="writing">
    <div style={{ position: "absolute", left: W * 0.2, top: H * 0.14, width: W * 0.46, fontFamily: family("caveat"), fontSize: 64, color: "#f4f4ea", lineHeight: 1.2 }}>{board.slice(0, n)}</div>
    </Part>
    <Part name="window" still>
    <Box x={W * 0.76} y={H * 0.12} w={300} h={340} c="linear-gradient(color-mix(in srgb, var(--sky, #9cd0f0) 64%, #fff),color-mix(in srgb, var(--sky, #9cd0f0) 23%, #fff))" style={{ border: "14px solid #fff" }} />
    </Part>
    <Part name="floor" still>
    <Box x={0} y={H * 0.68} w={W} h={H * 0.32} c="color-mix(in srgb, var(--wood, #8a5a2a) 73%, #fff)" />
    </Part>
    <Part name="desks" still>
    {[0, 1, 2, 3].map((i) => <Box key={i} x={W * (0.08 + i * 0.23)} y={H * 0.72} w={W * 0.17} h={40} c="var(--wood, #8a5a2a)" r={6} style={{ boxShadow: "0 30px 0 -10px color-mix(in srgb, var(--wood, #8a5a2a) 77%, #000)" }} />)}
    </Part>
  </div>;
}
export const Classroom = block("Classroom", ClassroomView);
/** an office: a desk with a computer, a window on the city, a plant, a wall clock */
function OfficeView({ at = 0, screen }: { at?: number; screen?: ReactNode }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--wall, #e8e4dc) 71%, #fff)" }} /></Part>
    <Background />
    <Part name="window" still>
    <Box x={W * 0.08} y={H * 0.08} w={W * 0.4} h={H * 0.46} c="linear-gradient(color-mix(in srgb, var(--sky, #9cd0f0) 96%, #000),color-mix(in srgb, var(--sky, #9cd0f0) 39%, #fff))" style={{ border: "16px solid #fff" }} />
    </Part>
    <Part name="skyline" still>
    {Array.from({ length: 7 }, (_, i) => <Box key={i} x={W * 0.1 + i * 100} y={H * (0.3 + rand(i) * 0.12)} w={80} h={H * 0.24} c="var(--metal, #8a939d)" />)}
    </Part>
    <Part name="clock">
    <div style={{ position: "absolute", right: W * 0.1, top: H * 0.08, width: 120, height: 120, borderRadius: 60, background: "#fff", border: "8px solid #333" }}><div style={{ position: "absolute", left: 52, top: 16, width: 6, height: 46, background: "#333", transformOrigin: "50% 100%", transform: `rotate(${(t - at) * 30}deg)` }} /></div>
    </Part>
    <Part name="floor" still>
    <Box x={0} y={H * 0.62} w={W} h={H * 0.38} c="color-mix(in srgb, var(--floor, #c4c8cc) 92%, #fff)" />
    </Part>
    <Part name="desk" still>
    <Box x={W * 0.3} y={H * 0.6} w={W * 0.5} h={30} c="color-mix(in srgb, var(--wood, #8a5a2a) 95%, #000)" r={6} />
    </Part>
    <Part name="monitor" still>
    <Box x={W * 0.45} y={H * 0.3} w={W * 0.2} h={H * 0.28} c="#111" r={14} style={{ padding: 10, boxSizing: "border-box" }} />
    </Part>
    <Part name="screen">
    <div style={{ position: "absolute", left: W * 0.45 + 14, top: H * 0.3 + 14, width: W * 0.2 - 28, height: H * 0.28 - 28, background: "color-mix(in srgb, var(--water, #2a7fb8) 97%, #000)", overflow: "hidden" }}>{screen}</div>
    </Part>
    <Part name="plant" still>
    <div style={{ position: "absolute", left: W * 0.82, top: H * 0.42, fontSize: 160 }}>🪴</div>
    </Part>
  </div>;
}
export const Office = block("Office", OfficeView);
/** a hospital: a bed, a heart monitor beeping, a drip stand, pale green walls */
function HospitalView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  const beep = ((t - at) % 0.9) < 0.1;
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--wall, #e8e4dc) 82%, #fff)" }} /></Part>
    <Background />
    <Part name="floor" still>
    <Box x={0} y={H * 0.7} w={W} h={H * 0.3} c="color-mix(in srgb, var(--floor, #c4c8cc) 99%, #000)" />
    </Part>
    <Part name="bed" still>
    <Box x={W * 0.2} y={H * 0.52} w={W * 0.45} h={60} c="#fff" r={20} style={{ boxShadow: "0 30px 0 -6px color-mix(in srgb, var(--floor, #c4c8cc) 86%, #000)" }} />
    </Part>
    <Part name="pillow" still>
    <Box x={W * 0.2} y={H * 0.42} w={W * 0.12} h={70} c="#f4f4f4" r={30} />
    </Part>
    <Part name="monitor" still>
    <Box x={W * 0.72} y={H * 0.18} w={300} h={200} c="#111" r={16} />
    </Part>
    <Part name="heartbeat">
    <svg style={{ position: "absolute", left: W * 0.72 + 20, top: H * 0.18 + 40 }} width={260} height={120}><path d={"M0 60 " + Array.from({ length: 13 }, (_, i) => { const x = i * 20 + ((t * 120) % 20); return `L${x} ${i % 4 === 2 ? 10 : i % 4 === 3 ? 100 : 60}`; }).join(" ")} fill="none" stroke="var(--signal, #3ff28a)" strokeWidth={4} /></svg>
    </Part>
    <Part name="beep">
    <div style={{ position: "absolute", left: W * 0.72 + 230, top: H * 0.18 + 14, width: 18, height: 18, borderRadius: 9, background: beep ? "#ff4a4a" : "#552222" }} />
    </Part>
    <Part name="drip" still>
    <Box x={W * 0.12} y={H * 0.12} w={8} h={H * 0.6} c="#999" /><Box x={W * 0.1} y={H * 0.12} w={70} h={110} c="rgb(200 230 255/0.8)" r={20} />
    </Part>
  </div>;
}
export const Hospital = block("Hospital", HospitalView);
/** a courtroom: the judge's bench, the scales of justice, wood panels and a gavel */
function CourtroomView({ at = 0, gavel }: { at?: number; gavel?: number }) {
  const { t, W, H } = useScene();
  const g = gavel !== undefined ? Math.max(0, Math.sin(clamp01((t - gavel) / 0.3) * Math.PI)) : 0;
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, color-mix(in srgb, var(--wood, #8a5a2a) 77%, #000) 0 120px, color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000) 120px 128px)" }} /></Part>
    <Background />
    <Part name="scales" still>
    <div style={{ position: "absolute", left: W / 2 - 80, top: H * 0.06, fontSize: 160 }}>⚖️</div>
    </Part>
    <Part name="bench" still>
    <Box x={W * 0.2} y={H * 0.45} w={W * 0.6} h={H * 0.3} c="color-mix(in srgb, var(--wood, #8a5a2a) 53%, #000)" r={10} style={{ boxShadow: "inset 0 10px 0 #7a5030" }} />
    </Part>
    <Part name="floor" still>
    <Box x={0} y={H * 0.75} w={W} h={H * 0.25} c="color-mix(in srgb, var(--wood, #8a5a2a) 41%, #000)" />
    </Part>
    <Part name="gavel">
    <div style={{ position: "absolute", left: W * 0.62, top: H * 0.36, fontSize: 120, transformOrigin: "80% 80%", transform: `rotate(${-30 + g * 40}deg)` }}>🔨</div>
    </Part>
  </div>;
}
export const Courtroom = block("Courtroom", CourtroomView);
/** a kitchen: tiles, a stove with a pot steaming, shelves with jars */
function KitchenView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "repeating-conic-gradient(color-mix(in srgb, var(--wall, #e8e4dc) 55%, #fff) 0 25%, #e4ded2 0 50%) 0 0/80px 80px" }} /></Part>
    <Background />
    <Part name="shelf" still>
    <Box x={W * 0.1} y={H * 0.15} w={W * 0.3} h={16} c="var(--wood, #8a5a2a)" />
    </Part>
    <Part name="jars" still>
    {["🫙", "🧂", "🫙", "🍯"].map((e, i) => <div key={i} style={{ position: "absolute", left: W * 0.11 + i * 130, top: H * 0.04, fontSize: 90 }}>{e}</div>)}
    </Part>
    <Part name="counter" still>
    <Box x={0} y={H * 0.6} w={W} h={H * 0.4} c="color-mix(in srgb, var(--wood, #8a5a2a) 91%, #fff)" />
    </Part>
    <Part name="stove" still>
    <Box x={W * 0.45} y={H * 0.5} w={W * 0.3} h={60} c="#333" r={8} />
    </Part>
    <Part name="pot" still>
    <div style={{ position: "absolute", left: W * 0.53, top: H * 0.3, fontSize: 180 }}>🍲</div>
    </Part>
    <Part name="steam">
    {Array.from({ length: 6 }, (_, i) => { const k = ((t - at) * 0.5 + i / 6) % 1; return <div key={i} style={{ position: "absolute", left: W * 0.6 + Math.sin(k * 6 + i) * 30, top: H * 0.3 - k * 260, width: 60, height: 60, borderRadius: 30, background: "radial-gradient(#fff, transparent 70%)", opacity: Math.sin(k * Math.PI) * 0.8 }} />; })}
    </Part>
  </div>;
}
export const Kitchen = block("Kitchen", KitchenView);
/** a market: stalls with awnings and goods, people passing (a bazaar, a mandi, a shop street) */
function MarketView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  const goods = ["🍅", "🥭", "🧅", "🍌", "🥕", "🍆"];
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#fbe3b5, #f4c98a)" }} /></Part>
    <Background />
    <Part name="stalls" still>
    {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: W * (0.04 + i * 0.33), top: H * 0.2, width: W * 0.3 }}>
      <div style={{ height: 90, background: `repeating-linear-gradient(90deg, ${["var(--bad, #e0453a)", "#3a7ae0", "var(--good, #3fb35a)"][i]} 0 60px, #fff 60px 120px)`, clipPath: "polygon(0 0, 100% 0, 100% 70%, 95% 100%, 90% 70%, 85% 100%, 80% 70%, 75% 100%, 70% 70%, 65% 100%, 60% 70%, 55% 100%, 50% 70%, 45% 100%, 40% 70%, 35% 100%, 30% 70%, 25% 100%, 20% 70%, 15% 100%, 10% 70%, 5% 100%, 0 70%)" }} />
      <div style={{ height: 260, background: "var(--wood, #8a5a2a)", marginTop: 160, borderRadius: 10, display: "flex", flexWrap: "wrap", justifyContent: "center", alignContent: "flex-start", padding: 10, fontSize: 70 }}>{goods.slice(i * 2, i * 2 + 2).flatMap((g) => [g, g, g])}</div>
    </div>)}
    </Part>
    <Part name="street" still>
    <Box x={0} y={H * 0.84} w={W} h={H * 0.16} c="color-mix(in srgb, var(--wood, #8a5a2a) 73%, #fff)" />
    </Part>
    <Part name="people">
    {Array.from({ length: 4 }, (_, i) => <div key={i} style={{ position: "absolute", top: H * 0.68, left: ((i * 520 + (t - at) * (60 + i * 20)) % (W + 200)) - 100, width: 50, height: 150, borderRadius: "25px 25px 6px 6px", background: "#3a3a4a", opacity: 0.85 }} />)}
    </Part>
  </div>;
}
export const Market = block("Market", MarketView);
/** a factory: sawtooth roofs, chimneys with smoke, a gear turning */
function FactoryView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(color-mix(in srgb, var(--metal, #8a939d) 70%, #fff), color-mix(in srgb, var(--metal, #8a939d) 25%, #fff))" }} /></Part>
    <Background />
    <Part name="chimneys" still>
    {[0.62, 0.72].map((x, i) => <Box key={i} x={W * x} y={H * 0.12} w={70} h={H * 0.4} c="color-mix(in srgb, var(--wood, #8a5a2a) 92%, #000)" />)}
    </Part>
    <Part name="smoke">
    {[0.62, 0.72].map((x, i) => Array.from({ length: 5 }, (_, j) => { const k = ((t - at) * 0.35 + j / 5 + i * 0.3) % 1; return <div key={i + "-" + j} style={{ position: "absolute", left: W * x + 10 + k * 120, top: H * 0.1 - k * 260, width: 80 + k * 80, height: 80 + k * 80, borderRadius: "50%", background: "radial-gradient(#777, transparent 70%)", opacity: 1 - k }} />; }))}
    </Part>
    <Part name="roof" still>
    <div style={{ position: "absolute", left: W * 0.1, top: H * 0.4, width: W * 0.8, height: 140, background: "var(--metal, #8a939d)", clipPath: "polygon(0 100%, 0 40%, 12% 0, 12% 40%, 24% 0, 24% 40%, 36% 0, 36% 40%, 48% 0, 48% 40%, 60% 0, 60% 40%, 72% 0, 72% 40%, 84% 0, 84% 40%, 100% 0, 100% 100%)" }} />
    </Part>
    <Part name="building" still>
    <Box x={W * 0.1} y={H * 0.53} w={W * 0.8} h={H * 0.3} c="color-mix(in srgb, var(--metal, #8a939d) 78%, #000)" />
    </Part>
    <Part name="gear">
    <div style={{ position: "absolute", left: W * 0.2, top: H * 0.58, fontSize: 160, transform: `rotate(${(t - at) * 60}deg)` }}>⚙️</div>
    </Part>
    <Part name="yard" still>
    <Box x={0} y={H * 0.83} w={W} h={H * 0.17} c="color-mix(in srgb, var(--metal, #8a939d) 63%, #000)" />
    </Part>
  </div>;
}
export const Factory = block("Factory", FactoryView);
/** a farm: fields in rows, a barn, a tractor that drives along, the sun */
function FarmView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(color-mix(in srgb, var(--sky, #9cd0f0) 99%, #000), color-mix(in srgb, var(--sky, #9cd0f0) 38%, #fff))" }} /></Part>
    <Background />
    <Part name="sun" still>
    <div style={{ position: "absolute", right: W * 0.12, top: H * 0.08, width: 150, height: 150, borderRadius: 75, background: "color-mix(in srgb, var(--glow, #ffe066) 95%, #000)", boxShadow: "0 0 80px color-mix(in srgb, var(--glow, #ffe066) 95%, #000)" }} />
    </Part>
    <Part name="fields" still>
    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.45, bottom: 0, background: "repeating-linear-gradient(170deg, color-mix(in srgb, var(--grass, #5a9a3a) 85%, #fff) 0 40px, var(--grass, #5a9a3a) 40px 80px)" }} />
    </Part>
    <Part name="barn" still>
    <div style={{ position: "absolute", left: W * 0.1, top: H * 0.22, width: 300, height: 260, background: "var(--roof, #b5332a)", clipPath: "polygon(0 35%, 50% 0, 100% 35%, 100% 100%, 0 100%)" }}><Box x={110} y={150} w={80} h={110} c="#fff" /></div>
    </Part>
    <Part name="tractor">
    <div style={{ position: "absolute", top: H * 0.6, left: ((t - at) * 120) % (W + 300) - 300, fontSize: 170, transform: "scaleX(-1)" }}>🚜</div>
    </Part>
  </div>;
}
export const Farm = block("Farm", FarmView);
/** a village: huts with thatched roofs, a well, trees and a dirt path */
function VillageView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#ffd9a0, #fff1d6)" }} /></Part>
    <Background />
    <Part name="ground" still>
    <Box x={0} y={H * 0.62} w={W} h={H * 0.38} c="color-mix(in srgb, var(--sand, #d9a85a) 97%, #000)" />
    </Part>
    <Part name="path" still>
    <div style={{ position: "absolute", left: W * 0.35, top: H * 0.62, width: W * 0.3, height: H * 0.38, background: "color-mix(in srgb, var(--sand, #d9a85a) 72%, #fff)", clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }} />
    </Part>
    <Part name="huts" still>
    {[0.08, 0.62, 0.8].map((x, i) => <div key={i} style={{ position: "absolute", left: W * x, top: H * 0.34 }}>
      <div style={{ width: 260, height: 120, background: "color-mix(in srgb, var(--sand, #d9a85a) 76%, #000)", clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} /><div style={{ width: 210, marginLeft: 25, height: 140, background: "color-mix(in srgb, var(--sand, #d9a85a) 83%, #fff)" }}><Box x={80} y={50} w={50} h={90} c="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" style={{ position: "relative" }} /></div>
    </div>)}
    </Part>
    <Part name="trees">
    {[0.3, 0.52].map((x, i) => <div key={i} style={{ position: "absolute", left: W * x, top: H * 0.2, fontSize: 220, transformOrigin: "50% 100%", transform: `rotate(${Math.sin(t * 1.2 + i) * 2}deg)` }}>🌳</div>)}
    </Part>
  </div>;
}
export const Village = block("Village", VillageView);
/** a city at night: lit windows that flicker on, a moon, traffic lights streaking along the road */
function CityNightView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(color-mix(in srgb, var(--night, #0e1a33) 86%, #000), color-mix(in srgb, var(--night, #0e1a33) 88%, #fff))" }} /></Part>
    <Background />
    <Part name="moon" still>
    <div style={{ position: "absolute", right: W * 0.12, top: H * 0.1, width: 110, height: 110, borderRadius: 55, background: "#f4f1e6", boxShadow: "0 0 60px #fff8" }} />
    </Part>
    <Part name="buildings">
    {Array.from({ length: 14 }, (_, i) => { const bw = 110 + rand(i) * 60, bh = H * (0.25 + rand(i + 2) * 0.4); return <div key={i} style={{ position: "absolute", left: i * (W / 14), bottom: H * 0.14, width: bw, height: bh, background: "color-mix(in srgb, var(--night, #0e1a33) 99%, #fff)", display: "flex", flexWrap: "wrap", gap: 10, padding: 12, boxSizing: "border-box", alignContent: "flex-start" }}>
      {Array.from({ length: 24 }, (_, j) => <div key={j} style={{ width: 18, height: 22, background: rand(i * 31 + j) < clamp01((t - at) / 2) * 0.7 ? "#ffd97a" : "color-mix(in srgb, var(--night, #0e1a33) 91%, #fff)" }} />)}
    </div>; })}
    </Part>
    <Part name="road" still>
    <Box x={0} y={H * 0.86} w={W} h={H * 0.14} c="#111" />
    </Part>
    <Part name="traffic">
    {Array.from({ length: 6 }, (_, i) => <div key={i} style={{ position: "absolute", top: H * (0.89 + (i % 2) * 0.04), left: ((i * 400 + (t - at) * (500 + i * 80) * (i % 2 ? -1 : 1)) % W + W) % W, width: 140, height: 8, borderRadius: 4, background: i % 2 ? "linear-gradient(90deg, #ff4a4a, transparent)" : "linear-gradient(90deg, transparent, #fff6c8)" }} />)}
    </Part>
  </div>;
}
export const CityNight = block("CityNight", CityNightView);
/** a battlefield: smoke drifting, a ruined wall, scorched ground, a dark red sky */
function BattlefieldView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#5a2a1c, #b5643a)" }} /></Part>
    <Background />
    <Part name="smoke">
    {Array.from({ length: 8 }, (_, i) => <div key={i} style={{ position: "absolute", left: (((t - at) * 30 + i * 300) % (W + 400)) - 300, top: H * (0.2 + rand(i) * 0.4), width: 500, height: 200, borderRadius: "50%", background: "radial-gradient(rgb(60 50 50/0.7), transparent 70%)" }} />)}
    </Part>
    <Part name="ruin" still>
    <div style={{ position: "absolute", left: W * 0.55, bottom: H * 0.25, width: 500, height: 260, background: "#6a5a4a", clipPath: "polygon(0 100%, 0 30%, 12% 30%, 12% 0, 28% 0, 28% 40%, 45% 40%, 55% 70%, 70% 20%, 80% 20%, 80% 50%, 100% 50%, 100% 100%)" }} />
    </Part>
    <Part name="earth" still>
    <Box x={0} y={H * 0.75} w={W} h={H * 0.25} c="color-mix(in srgb, var(--wood, #8a5a2a) 45%, #000)" />
    </Part>
    <Part name="craters" still>
    {Array.from({ length: 5 }, (_, i) => <div key={i} style={{ position: "absolute", left: W * (0.1 + i * 0.18), top: H * 0.72, width: 120, height: 30, borderRadius: "50%", background: "#1a120c" }} />)}
    </Part>
  </div>;
}
export const Battlefield = block("Battlefield", BattlefieldView);
/** underwater: light from the surface, bubbles rising, fish passing, sea plants swaying */
function UnderwaterView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(var(--water, #2a7fb8), color-mix(in srgb, var(--water, #2a7fb8) 37%, #000))" }} /></Part>
    <Background />
    <Part name="lightRays">
    {Array.from({ length: 6 }, (_, i) => <div key={i} style={{ position: "absolute", left: W * (0.1 + i * 0.15), top: -100, width: 120, height: H, background: "linear-gradient(rgb(255 255 255/0.18), transparent)", transform: `rotate(${10 + Math.sin(t * 0.5 + i) * 4}deg)`, filter: "blur(8px)" }} />)}
    </Part>
    <Part name="bubbles">
    {Array.from({ length: 20 }, (_, i) => { const k = ((t - at) * 0.2 + rand(i)) % 1; return <div key={i} style={{ position: "absolute", left: rand(i + 3) * W + Math.sin(k * 10 + i) * 20, top: H * (1 - k), width: 10 + rand(i) * 14, height: 10 + rand(i) * 14, borderRadius: "50%", border: "2px solid rgb(255 255 255/0.6)" }} />; })}
    </Part>
    <Part name="fish">
    {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", top: H * (0.3 + i * 0.15), left: ((i * 700 + (t - at) * (90 + i * 30)) % (W + 300)) - 150, fontSize: 90, transform: "scaleX(-1)" }}>{["🐟", "🐠", "🐡"][i]}</div>)}
    </Part>
    <Part name="plants">
    {Array.from({ length: 8 }, (_, i) => <div key={i} style={{ position: "absolute", left: W * (0.05 + i * 0.12), bottom: 0, width: 26, height: 200 + rand(i) * 160, borderRadius: 13, background: "color-mix(in srgb, var(--grass, #5a9a3a) 83%, #000)", transformOrigin: "50% 100%", transform: `rotate(${Math.sin(t * 1.5 + i) * 8}deg)` }} />)}
    </Part>
    <Part name="seabed" still>
    <Box x={0} y={H * 0.92} w={W} h={H * 0.08} c="color-mix(in srgb, var(--sand, #d9a85a) 84%, #fff)" />
    </Part>
  </div>;
}
export const Underwater = block("Underwater", UnderwaterView);
/** a desert: dunes, a blazing sun, a cactus, heat in the air */
function DesertView({ at = 0 }: { at?: number }) {
  const { W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(color-mix(in srgb, var(--sand, #d9a85a) 83%, #fff), color-mix(in srgb, var(--sand, #d9a85a) 43%, #fff))" }} /></Part>
    <Background />
    <Part name="sun" still>
    <div style={{ position: "absolute", left: W * 0.7, top: H * 0.1, width: 200, height: 200, borderRadius: 100, background: "#fff2b0", boxShadow: "0 0 140px 40px #ffb84a" }} />
    </Part>
    <Part name="dunes" still>
    <svg style={{ position: "absolute", inset: 0 }} width={W} height={H}><path d={`M0 ${H * 0.6} Q${W * 0.25} ${H * 0.45} ${W * 0.5} ${H * 0.62} T${W} ${H * 0.55} L${W} ${H} L0 ${H} Z`} fill="color-mix(in srgb, var(--sand, #d9a85a) 98%, #fff)" /><path d={`M0 ${H * 0.78} Q${W * 0.3} ${H * 0.66} ${W * 0.6} ${H * 0.8} T${W} ${H * 0.74} L${W} ${H} L0 ${H} Z`} fill="color-mix(in srgb, var(--sand, #d9a85a) 89%, #000)" /></svg>
    </Part>
    <Part name="cactus" still>
    <div style={{ position: "absolute", left: W * 0.15, top: H * 0.42, fontSize: 200 }}>🌵</div>
    </Part>
  </div>;
}
export const Desert = block("Desert", DesertView);
/** a forest: layers of trees in depth, mist, light through the leaves */
function ForestView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(color-mix(in srgb, var(--grass, #5a9a3a) 28%, #fff), color-mix(in srgb, var(--grass, #5a9a3a) 69%, #fff))" }} /></Part>
    <Background />
    <Part name="trees">
    {[0.35, 0.6, 0.85].map((d, j) => Array.from({ length: 9 }, (_, i) => <div key={j + "-" + i} style={{ position: "absolute", left: (i / 8) * W - 100 + ((t - at) * 6 * (j + 1)) % 40, bottom: H * (0.2 - j * 0.08), width: 200, height: H * d, background: ["color-mix(in srgb, var(--grass, #5a9a3a) 79%, #fff)", "color-mix(in srgb, var(--grass, #5a9a3a) 82%, #000)", "color-mix(in srgb, var(--grass, #5a9a3a) 57%, #000)"][j], clipPath: "polygon(50% 0, 85% 40%, 70% 40%, 100% 75%, 60% 75%, 60% 100%, 40% 100%, 40% 75%, 0 75%, 30% 40%, 15% 40%)" }} />))}
    </Part>
    <Part name="mist">
    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.5, height: 200, background: "linear-gradient(transparent, rgb(255 255 255/0.4), transparent)", transform: `translateX(${Math.sin(t * 0.3) * 60}px)` }} />
    </Part>
  </div>;
}
export const Forest = block("Forest", ForestView);
/** mountains: peaks with snow, layered ranges, a lake below */
function MountainsView({ at = 0 }: { at?: number }) {
  const { W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(color-mix(in srgb, var(--sky, #9cd0f0) 90%, #000), color-mix(in srgb, var(--sky, #9cd0f0) 28%, #fff))" }} /></Part>
    <Background />
    <Part name="peaks" still>
    <svg style={{ position: "absolute", inset: 0 }} width={W} height={H}>
      <path d={`M0 ${H * 0.65} L${W * 0.2} ${H * 0.25} L${W * 0.35} ${H * 0.5} L${W * 0.55} ${H * 0.15} L${W * 0.75} ${H * 0.45} L${W * 0.9} ${H * 0.3} L${W} ${H * 0.45} L${W} ${H} L0 ${H} Z`} fill="#6a7a9a" />
      <path d={`M${W * 0.2} ${H * 0.25} L${W * 0.16} ${H * 0.33} L${W * 0.24} ${H * 0.33} Z M${W * 0.55} ${H * 0.15} L${W * 0.5} ${H * 0.25} L${W * 0.6} ${H * 0.25} Z`} fill="#fff" />
      <path d={`M0 ${H * 0.75} L${W * 0.3} ${H * 0.5} L${W * 0.6} ${H * 0.72} L${W} ${H * 0.55} L${W} ${H} L0 ${H} Z`} fill="#4a5a7a" />
      <rect x={0} y={H * 0.82} width={W} height={H * 0.18} fill="color-mix(in srgb, var(--water, #2a7fb8) 97%, #000)" opacity={0.8} />
    </svg>
    </Part>
  </div>;
}
export const Mountains = block("Mountains", MountainsView);
/** a temple or monument front: steps, columns, a dome or a shikhara spire; `kind` picks the shape */
function TempleView({ kind = "columns", at = 0 }: { kind?: "columns" | "dome" | "spire"; at?: number }) {
  const { W, H } = useScene();
  const stone = "color-mix(in srgb, var(--stone, #e0d2b4) 81%, #fff)";
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#ffd9a0, #fff4dc)" }} /></Part>
    <Background />
    <Part name="steps" still>
    <Box x={W * 0.2} y={H * 0.78} w={W * 0.6} h={H * 0.22} c="color-mix(in srgb, var(--stone, #e0d2b4) 89%, #000)" />
    </Part>
    <Part name="columns" still>
    {kind === "columns" && <><div style={{ position: "absolute", left: W * 0.25, top: H * 0.18, width: W * 0.5, height: H * 0.14, background: stone, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />{Array.from({ length: 6 }, (_, i) => <Box key={i} x={W * (0.27 + i * 0.085)} y={H * 0.33} w={W * 0.04} h={H * 0.45} c={stone} style={{ boxShadow: "inset -10px 0 0 color-mix(in srgb, var(--stone, #e0d2b4) 93%, #000)" }} />)}</>}
    </Part>
    <Part name="dome" still>
    {kind === "dome" && <><div style={{ position: "absolute", left: W * 0.35, top: H * 0.12, width: W * 0.3, height: H * 0.34, borderRadius: "50% 50% 10% 10%", background: "color-mix(in srgb, var(--wall, #e8e4dc) 55%, #fff)" }} /><Box x={W * 0.3} y={H * 0.42} w={W * 0.4} h={H * 0.36} c="color-mix(in srgb, var(--wall, #e8e4dc) 55%, #fff)" /><Box x={W * 0.46} y={H * 0.55} w={W * 0.08} h={H * 0.23} c="color-mix(in srgb, var(--stone, #e0d2b4) 93%, #000)" r={60} /></>}
    </Part>
    <Part name="spire" still>
    {kind === "spire" && <><div style={{ position: "absolute", left: W * 0.4, top: H * 0.05, width: W * 0.2, height: H * 0.5, background: "#d9a86a", clipPath: "polygon(50% 0, 75% 40%, 85% 100%, 15% 100%, 25% 40%)" }} /><Box x={W * 0.32} y={H * 0.52} w={W * 0.36} h={H * 0.26} c="#c9935a" /><Box x={W * 0.46} y={H * 0.6} w={W * 0.08} h={H * 0.18} c="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" r={40} /></>}
    </Part>
  </div>;
}
export const Temple = block("Temple", TempleView);
/** a laboratory: benches, flasks bubbling, a microscope, a shelf of bottles */
function LabView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--wall, #e8e4dc) 52%, #fff)" }} /></Part>
    <Background />
    <Part name="shelf" still>
    <Box x={W * 0.05} y={H * 0.15} w={W * 0.4} h={14} c="color-mix(in srgb, var(--metal, #8a939d) 85%, #fff)" />
    </Part>
    <Part name="bottles" still>
    {["🧪", "⚗️", "🧫", "🧴"].map((e, i) => <div key={i} style={{ position: "absolute", left: W * 0.06 + i * 160, top: H * 0.03, fontSize: 100 }}>{e}</div>)}
    </Part>
    <Part name="floor" still>
    <Box x={0} y={H * 0.62} w={W} h={H * 0.38} c="color-mix(in srgb, var(--floor, #c4c8cc) 85%, #fff)" /><Box x={W * 0.1} y={H * 0.58} w={W * 0.8} h={40} c="color-mix(in srgb, var(--metal, #8a939d) 58%, #000)" r={6} />
    </Part>
    <Part name="microscope" still>
    <div style={{ position: "absolute", left: W * 0.2, top: H * 0.34, fontSize: 170 }}>🔬</div>
    </Part>
    <Part name="flask" still>
    <div style={{ position: "absolute", left: W * 0.6, top: H * 0.32, fontSize: 170 }}>⚗️</div>
    </Part>
    <Part name="bubbles">
    {Array.from({ length: 5 }, (_, i) => { const k = ((t - at) * 0.8 + i / 5) % 1; return <div key={i} style={{ position: "absolute", left: W * 0.66 + Math.sin(k * 8) * 10, top: H * 0.34 - k * 120, width: 20, height: 20, borderRadius: 10, background: "#7ae0b5", opacity: 1 - k }} />; })}
    </Part>
  </div>;
}
export const Lab = block("Lab", LabView);
/** a stadium: stands full of a cheering crowd, floodlights, a green pitch with lines */
function StadiumView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "var(--night, #0e1a33)" }} /></Part>
    <Background />
    <Part name="lights" still>
    {[0.15, 0.85].map((x, i) => <div key={i} style={{ position: "absolute", left: W * x - 60, top: 30, width: 120, height: 60, borderRadius: 10, background: "#fff", boxShadow: "0 0 120px 60px rgb(255 255 230/0.5)" }} />)}
    </Part>
    <Part name="crowd">
    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.2, height: H * 0.32, background: "#2a3350", overflow: "hidden" }}>{Array.from({ length: 160 }, (_, i) => <div key={i} style={{ position: "absolute", left: (i % 40) * (W / 40), top: Math.floor(i / 40) * 60 + 10 - Math.abs(Math.sin(t * 6 + i)) * (rand(i) > 0.7 ? 10 : 0), width: 26, height: 40, borderRadius: "13px 13px 4px 4px", background: ["var(--bad, #e0453a)", "#f4f4f4", "#3a7ae0", "color-mix(in srgb, var(--glow, #ffe066) 95%, #000)"][i % 4] }} />)}</div>
    </Part>
    <Part name="pitch" still>
    <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.52, bottom: 0, background: "repeating-linear-gradient(90deg, color-mix(in srgb, var(--grass, #5a9a3a) 92%, #000) 0 120px, color-mix(in srgb, var(--grass, #5a9a3a) 80%, #000) 120px 240px)", transform: "perspective(900px) rotateX(35deg)", transformOrigin: "50% 0%" }}><div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 8, background: "#fff" }} /><div style={{ position: "absolute", left: "50%", top: "40%", width: 260, height: 260, borderRadius: "50%", border: "8px solid #fff", transform: "translate(-50%,-50%)" }} /></div>
    </Part>
  </div>;
}
export const Stadium = block("Stadium", StadiumView);
/** a cave: dark rock walls, a torch's flickering light, drips */
function CaveView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  const fl = 0.85 + Math.sin(t * 17) * 0.08 + Math.sin(t * 7) * 0.07;
  return <div style={{ ...fill }}>
    <Part name="ground" still><div style={{ position: "absolute", inset: 0, background: "#1a1410" }} /></Part>
    <Background />
    <Part name="torchlight">
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 30% 60%, rgb(255 170 80/${0.45 * fl}), transparent 55%)` }} />
    </Part>
    <Part name="rock" still>
    <svg style={{ position: "absolute", inset: 0 }} width={W} height={H}><path d={`M0 0 L${W} 0 L${W} ${H * 0.3} Q${W * 0.8} ${H * 0.15} ${W * 0.6} ${H * 0.25} Q${W * 0.4} ${H * 0.1} ${W * 0.2} ${H * 0.22} Q${W * 0.1} ${H * 0.3} 0 ${H * 0.2} Z`} fill="#2a2018" /><path d={`M0 ${H} L0 ${H * 0.8} Q${W * 0.3} ${H * 0.7} ${W * 0.5} ${H * 0.82} Q${W * 0.8} ${H * 0.72} ${W} ${H * 0.85} L${W} ${H} Z`} fill="#2a2018" /></svg>
    </Part>
    <Part name="torch">
    <div style={{ position: "absolute", left: W * 0.27, top: H * 0.45, fontSize: 120 }}>🔥</div>
    </Part>
    <Part name="drips">
    {Array.from({ length: 4 }, (_, i) => { const k = ((t - at) * 0.6 + i / 4) % 1; return <div key={i} style={{ position: "absolute", left: W * (0.5 + i * 0.1), top: H * (0.2 + k * 0.6), width: 6, height: 14, borderRadius: 3, background: "color-mix(in srgb, var(--sky, #9cd0f0) 90%, #000)", opacity: 1 - k }} />; })}
    </Part>
  </div>;
}
export const Cave = block("Cave", CaveView);
/** inside a vehicle looking out: a car's dashboard, a train's window or a plane's porthole, the world rushing past */
function VehicleInsideView({ kind = "car", at = 0, speed = 600 }: { kind?: "car" | "train" | "plane"; at?: number; speed?: number }) {
  const { t, W, H } = useScene();
  const s = (t - at) * speed;
  const view = usePartValue("outside");
  const scrolling = isPicture(view) ? <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>{[0, 1].map((j) => <Img key={j} src={src(view)} style={{ position: "absolute", top: 0, height: "100%", width: W, objectFit: "cover", left: j * W - ((kind === "plane" ? s * 0.3 : s) % W) }} />)}</div> : null;
  const drawn = <div style={{ position: "absolute", inset: 0, background: kind === "plane" ? "linear-gradient(color-mix(in srgb, var(--sky, #9cd0f0) 82%, #000), color-mix(in srgb, var(--sky, #9cd0f0) 55%, #fff))" : "linear-gradient(var(--sky, #9cd0f0), color-mix(in srgb, var(--sky, #9cd0f0) 31%, #fff))" }}>
    {kind !== "plane" && Array.from({ length: 10 }, (_, i) => <div key={i} style={{ position: "absolute", bottom: H * 0.3, left: ((i * 300 - s) % (W + 300) + W + 300) % (W + 300) - 300, width: 160, height: 160 + rand(i) * 140, background: "color-mix(in srgb, var(--grass, #5a9a3a) 89%, #000)", borderRadius: "50% 50% 10% 10%" }} />)}
    {kind === "plane" && Array.from({ length: 6 }, (_, i) => <div key={i} style={{ position: "absolute", top: H * (0.3 + rand(i) * 0.4), left: ((i * 500 - s * 0.3) % (W + 500) + W + 500) % (W + 500) - 500, width: 500, height: 140, borderRadius: 70, background: "rgb(255 255 255/0.85)", filter: "blur(6px)" }} />)}
    {kind !== "plane" && <Box x={0} y={H * 0.7} w={W} h={H * 0.3} c="color-mix(in srgb, var(--grass, #5a9a3a) 85%, #fff)" />}
  </div>;
  const outside = scrolling ?? <Part name="outside" item={{ offset: s }}>{drawn}</Part>;
  if (kind === "plane") return <div style={{ ...fill, background: "#d8dce2" }}><div style={{ position: "absolute", left: W / 2 - 260, top: H / 2 - 340, width: 520, height: 680, borderRadius: 260, overflow: "hidden", border: "40px solid #eef0f3", boxShadow: "inset 0 0 40px rgb(0 0 0/0.3)" }}>{outside}</div></div>;
  if (kind === "train") return <div style={{ ...fill, background: "color-mix(in srgb, var(--wood, #8a5a2a) 82%, #000)" }}>{[0, 1].map((i) => <div key={i} style={{ position: "absolute", left: W * (0.08 + i * 0.47), top: H * 0.15, width: W * 0.38, height: H * 0.45, borderRadius: 30, overflow: "hidden", border: "18px solid color-mix(in srgb, var(--wood, #8a5a2a) 45%, #000)" }}>{outside}</div>)}<Box x={0} y={H * 0.72} w={W} h={H * 0.28} c="#4a3a5a" /></div>;
  return <div style={fill}>{outside}<div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.38, background: "#222", borderRadius: "50% 50% 0 0 / 30% 30% 0 0" }} /><div style={{ position: "absolute", left: W * 0.2, bottom: H * 0.05, width: 300, height: 300, borderRadius: 150, border: "30px solid #111", transform: `rotate(${Math.sin(t) * 10}deg)` }} /><div style={{ position: "absolute", left: W * 0.62, bottom: H * 0.18, display: "flex", gap: 30 }}>{[0, 1].map((i) => <div key={i} style={{ width: 120, height: 120, borderRadius: 60, background: "#111", border: "4px solid #444", color: "#ff6a3a", fontSize: 30, display: "grid", placeItems: "center", fontFamily: "monospace" }}>{i ? "km/h" : Math.round(60 + Math.sin(t) * 5)}</div>)}</div></div>;
}
export const VehicleInside = block("VehicleInside", VehicleInsideView);

/* ================= VEHICLES and OBJECTS ================= */
/** a vehicle, drawn, that can drive across (wheels turning, a bounce): car, bus, truck, train, plane, ship, rocket, bike, auto (rickshaw) */
function VehicleView({ kind, size = 360, color, at = 0, from, to, dur = 3, y = 0 }: { kind: "car" | "bus" | "truck" | "train" | "plane" | "ship" | "rocket" | "bike" | "auto"; size?: number; color?: string; at?: number; from?: number; to?: number; dur?: number; y?: number }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), moving = from !== undefined && to !== undefined;
  const x = moving ? (from as number) + ((to as number) - (from as number)) * k : 0;
  const going = moving && k > 0 && k < 1, spin = (t - at) * 720, bump = going ? Math.abs(Math.sin(t * 14)) * 3 : 0;
  const C = color ?? theme.accent;
  const wheel = (cx: number, cy: number, r = 12) => <g key={cx} transform={`rotate(${spin} ${cx} ${cy})`}><circle cx={cx} cy={cy} r={r} fill="#222" /><circle cx={cx} cy={cy} r={r * 0.45} fill="#bbb" /><rect x={cx - 1.5} y={cy - r} width={3} height={r * 2} fill="#555" /></g>;
  const body: Record<string, ReactNode> = {
    car: <><path d="M5 50 L10 32 L30 30 L42 14 L78 14 L92 30 L112 34 L115 50 Z" fill={C} /><path d="M46 18 L58 18 L58 30 L36 30 Z M62 18 L76 18 L88 30 L62 30 Z" fill="var(--glass, #cfe6f5)" />{wheel(30, 52)}{wheel(92, 52)}</>,
    bus: <><rect x={4} y={8} width={116} height={46} rx={8} fill={C} />{[10, 30, 50, 70, 90].map((x) => <rect key={x} x={x} y={14} width={16} height={16} rx={2} fill="var(--glass, #cfe6f5)" />)}<rect x={106} y={14} width={10} height={26} fill="var(--glass, #cfe6f5)" />{wheel(26, 56)}{wheel(96, 56)}</>,
    truck: <><rect x={4} y={6} width={78} height={44} rx={4} fill="#e8e8e8" stroke="#bbb" /><path d="M84 50 L84 20 L104 20 L116 34 L116 50 Z" fill={C} /><rect x={92} y={24} width={12} height={10} fill="var(--glass, #cfe6f5)" />{wheel(22, 52)}{wheel(46, 52)}{wheel(100, 52)}</>,
    train: <><rect x={2} y={10} width={118} height={40} rx={10} fill={C} /><path d="M100 10 L120 26 L120 50 L100 50 Z" fill={theme.accent2} />{[10, 34, 58, 82].map((x) => <rect key={x} x={x} y={18} width={18} height={14} rx={3} fill="var(--glass, #cfe6f5)" />)}{[20, 50, 80, 106].map((x) => wheel(x, 52, 8))}</>,
    plane: <><path d="M6 34 Q6 26 18 26 L100 26 Q118 28 120 34 Q118 40 100 42 L18 42 Q6 42 6 34 Z" fill="#f4f4f4" stroke="#bbb" /><path d="M50 30 L30 4 L44 4 L72 30 Z M50 38 L30 64 L44 64 L72 38 Z" fill={C} /><path d="M10 28 L2 10 L12 10 L22 26 Z" fill={C} />{[60, 70, 80, 90].map((x) => <circle key={x} cx={x} cy={32} r={2.5} fill="#4a7ab9" />)}</>,
    ship: <><path d="M2 36 L118 36 L104 56 L14 56 Z" fill={C} /><rect x={30} y={18} width={56} height={18} fill="#f4f4f4" /><rect x={50} y={4} width={12} height={14} fill="#333" />{[36, 50, 64, 78].map((x) => <circle key={x} cx={x} cy={27} r={3} fill="#4a7ab9" />)}<path d={`M0 ${58 + Math.sin(t * 3) * 2} Q30 54 60 58 T120 58`} stroke="color-mix(in srgb, var(--water, #2a7fb8) 89%, #fff)" strokeWidth={4} fill="none" /></>,
    rocket: <><path d="M60 2 Q78 20 78 50 L42 50 Q42 20 60 2 Z" fill="#f4f4f4" stroke="#bbb" /><circle cx={60} cy={26} r={7} fill="#4a7ab9" /><path d="M42 36 L30 56 L42 50 Z M78 36 L90 56 L78 50 Z" fill={C} />{t >= at && <path d={`M46 50 Q60 ${80 + Math.sin(t * 30) * 8} 74 50 Z`} fill="var(--fire, #ff9a1c)" />}</>,
    bike: <>{wheel(24, 44, 16)}{wheel(96, 44, 16)}<path d="M24 44 L50 20 L80 20 L96 44 M50 20 L60 44 L80 20 M60 44 L24 44" fill="none" stroke={C} strokeWidth={5} /><path d="M76 12 L88 12 M46 14 L56 14" stroke="#333" strokeWidth={5} strokeLinecap="round" /></>,
    auto: <><path d="M10 50 L14 18 Q20 8 50 8 L90 8 Q104 10 108 30 L112 50 Z" fill="color-mix(in srgb, var(--good, #3fb35a) 74%, #000)" /><path d="M14 18 Q20 8 50 8 L70 8 L70 34 L12 34 Z" fill="var(--warn, #f0b43a)" /><path d="M76 14 L96 14 L104 32 L76 32 Z" fill="var(--glass, #cfe6f5)" />{wheel(26, 52)}{wheel(96, 52)}</>,
  };
  const lift = kind === "rocket" && moving ? 0 : 0;
  return <svg width={size} height={size * 0.6} viewBox="-2 -2 124 74" style={{ position: moving ? "absolute" : undefined, left: moving ? x : undefined, top: moving ? y : undefined, overflow: "visible", transform: `translateY(${-bump - lift}px) scaleX(${moving && (to as number) < (from as number) ? -1 : 1})` }}><SvgPart name="body" item={{ kind }} x={-2} y={-2} w={124} h={74}>{body[kind]}</SvgPart></svg>;
}
export const Vehicle = block("Vehicle", VehicleView);
/** a building, drawn: house, hut, tower block, skyscraper, shop, school, hospital, bank, factory; windows light up */
function BuildingView({ kind = "house", size = 320, color, at = 0, lit = 0.5 }: { kind?: "house" | "hut" | "tower" | "skyscraper" | "shop" | "school" | "hospital" | "bank" | "factory"; size?: number; color?: string; at?: number; lit?: number }) {
  const { theme, b } = useIn(at, 0.5);
  const C = color ?? theme.accent2;
  const win = (x: number, y: number, i: number) => <rect key={i} x={x} y={y} width={10} height={12} rx={1} fill={rand(i) < lit ? "color-mix(in srgb, var(--glow, #ffe066) 59%, #fff)" : "#2d3a4e"} />;
  const shapes: Record<string, ReactNode> = {
    house: <><path d="M10 50 L50 14 L90 50 Z" fill="var(--roof, #b5332a)" /><rect x={18} y={50} width={64} height={50} fill={C} /><rect x={44} y={70} width={14} height={30} fill="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" />{win(24, 60, 1)}{win(66, 60, 2)}</>,
    hut: <><path d="M6 56 L50 14 L94 56 Z" fill="color-mix(in srgb, var(--sand, #d9a85a) 76%, #000)" /><rect x={18} y={56} width={64} height={44} fill="color-mix(in srgb, var(--sand, #d9a85a) 83%, #fff)" /><path d="M42 100 L42 74 Q50 66 58 74 L58 100 Z" fill="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" /></>,
    tower: <><rect x={22} y={10} width={56} height={90} fill={C} />{Array.from({ length: 18 }, (_, i) => win(28 + (i % 3) * 16, 16 + Math.floor(i / 3) * 14, i + 3))}</>,
    skyscraper: <><rect x={30} y={4} width={40} height={96} fill={C} /><rect x={46} y={-8} width={8} height={12} fill={C} />{Array.from({ length: 24 }, (_, i) => win(34 + (i % 2) * 18, 10 + Math.floor(i / 2) * 7.5, i + 7))}</>,
    shop: <><rect x={10} y={30} width={80} height={70} fill="color-mix(in srgb, var(--wall, #e8e4dc) 55%, #fff)" /><path d="M6 30 L94 30 L90 46 L10 46 Z" fill="var(--bad, #e0453a)" /><rect x={18} y={56} width={40} height={30} fill="var(--glass, #cfe6f5)" /><rect x={64} y={56} width={18} height={44} fill="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" /></>,
    school: <><rect x={8} y={36} width={84} height={64} fill="#e8c88a" /><path d="M30 36 L50 14 L70 36 Z" fill="var(--roof, #b5332a)" /><rect x={47} y={4} width={3} height={14} fill="#333" /><path d="M50 4 L60 8 L50 12 Z" fill="var(--bad, #e0453a)" />{[14, 30, 62, 78].map((x, i) => win(x, 50, i + 30))}<rect x={44} y={74} width={12} height={26} fill="color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)" /></>,
    hospital: <><rect x={14} y={20} width={72} height={80} fill="#f4f6f8" stroke="#ccc" /><rect x={44} y={28} width={12} height={28} fill="var(--bad, #e0453a)" /><rect x={36} y={36} width={28} height={12} fill="var(--bad, #e0453a)" />{[22, 38, 54, 70].map((x, i) => win(x, 66, i + 40))}</>,
    bank: <><path d="M6 34 L50 8 L94 34 Z" fill="color-mix(in srgb, var(--stone, #e0d2b4) 89%, #000)" /><rect x={10} y={34} width={80} height={8} fill="color-mix(in srgb, var(--stone, #e0d2b4) 81%, #fff)" />{[16, 32, 48, 64, 80].map((x) => <rect key={x} x={x - 3} y={42} width={8} height={48} fill="color-mix(in srgb, var(--stone, #e0d2b4) 81%, #fff)" />)}<rect x={6} y={90} width={88} height={10} fill="color-mix(in srgb, var(--stone, #e0d2b4) 89%, #000)" /><text x={50} y={30} textAnchor="middle" fontSize={14} fontWeight={800} fill="#6a5a3a">₹</text></>,
    factory: <><path d="M6 100 L6 50 L26 36 L26 50 L46 36 L46 50 L66 36 L66 100 Z" fill="var(--metal, #8a939d)" /><rect x={70} y={14} width={12} height={86} fill="color-mix(in srgb, var(--wood, #8a5a2a) 92%, #000)" /><rect x={66} y={56} width={30} height={44} fill="color-mix(in srgb, var(--metal, #8a939d) 78%, #000)" /></>,
  };
  return <svg width={size} height={size} viewBox="0 -10 100 112" style={{ overflow: "visible", transform: `scale(${b})`, transformOrigin: "50% 100%" }}><SvgPart name="building" item={{ kind }} x={0} y={-10} w={100} h={112}>{shapes[kind]}</SvgPart></svg>;
}
export const Building = block("Building", BuildingView);
/** Indian rupee notes: a stack that grows, a fan, or notes that fly out (money paid, saved, lost) */
function RupeeNotesView({ amount = 500, count = 8, mode = "stack", at = 0, size = 300 }: { amount?: 10 | 20 | 50 | 100 | 200 | 500 | 2000; count?: number; mode?: "stack" | "fan" | "fly"; at?: number; size?: number }) {
  const { t } = useScene();
  const col: Record<number, string> = { 10: "#b58a5a", 20: "#c8d86a", 50: "#6ac8d8", 100: "#a89ad8", 200: "#f0b43a", 500: "#9aa38a", 2000: "#d86aa8" };
  const note = (i: number, style: CSSProperties) => <div key={i} style={{ position: "absolute", width: size, height: size * 0.45, ...style }}><Part name="note" item={amount} i={i} fit="contain"><div style={{ width: "100%", height: "100%", borderRadius: 8, background: `linear-gradient(90deg, ${col[amount]}, ${col[amount]}cc 60%, ${col[amount]})`, border: "3px solid rgb(0 0 0/0.15)", boxShadow: "0 4px 8px rgb(0 0 0/0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", boxSizing: "border-box", fontFamily: "Georgia, serif", fontWeight: 800, fontSize: size * 0.13, color: "#2a2a2a" }}><span>₹{amount}</span><span style={{ width: size * 0.22, height: size * 0.3, borderRadius: "50%", background: "rgb(255 255 255/0.35)" }} /><span>{amount}</span></div></Part></div>;
  return <div style={{ position: "relative", width: size, height: size }}>{Array.from({ length: count }, (_, i) => {
    const k = ease.out(clamp01((t - at - i * 0.12) / 0.4));
    if (mode === "stack") return note(i, { left: 0, top: size * 0.5 - i * 8 - (1 - k) * 200, opacity: k > 0 ? 1 : 0 });
    if (mode === "fan") return note(i, { left: 0, top: size * 0.3, transformOrigin: "10% 90%", transform: `rotate(${(i - count / 2) * 8 * k}deg)` });
    const s = Math.max(0, t - at - i * 0.15);
    return note(i, { left: s * (200 + rand(i) * 300) * (rand(i + 1) > 0.5 ? 1 : -1), top: size * 0.4 - s * 300 + s * s * 260, transform: `rotate(${s * (200 + rand(i + 2) * 300)}deg) rotateX(${s * 300}deg)` });
  })}</div>;
}
export const RupeeNotes = block("RupeeNotes", RupeeNotesView);
/** a gold bar (or a stack of them) that gleams (gold prices, treasure, a reserve) */
function GoldBarView({ count = 1, size = 260, at = 0 }: { count?: number; size?: number; at?: number }) {
  const { t, b } = useIn(at, 0.5);
  const shine = ((t - at) * 0.5) % 1.5;
  const bar = (i: number) => {
    const row = i < 3 ? 0 : 1, col = row ? i - 3 : i, x = row ? 0.5 + col : col;
    return <div key={i} style={{ position: "absolute", left: x * size * 0.82, top: -row * size * 0.32, width: size, height: size * 0.4 }}><Part name="bar" i={i} fit="contain"><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#ffe08a, #d4a01c 60%, #a87a0c)", clipPath: "polygon(12% 0, 88% 0, 100% 100%, 0 100%)", overflow: "hidden" }}><div style={{ position: "absolute", inset: 0, background: `linear-gradient(110deg, transparent ${shine * 100 - 25}%, rgb(255 255 255/0.7) ${shine * 100 - 12}%, transparent ${shine * 100}%)` }} /><div style={{ position: "absolute", left: "30%", top: "30%", fontFamily: "Georgia", fontWeight: 800, color: "#8a6a0c", fontSize: size * 0.1 }}>999.9</div></div></Part></div>;
  };
  return <div style={{ position: "relative", width: size * Math.min(3, count) * 0.82 + size * 0.2, height: size * 0.75, transform: `scale(${b})` }}><div style={{ position: "absolute", left: 0, top: size * 0.32 }}>{Array.from({ length: Math.min(6, count) }, (_, i) => bar(i))}</div></div>;
}
export const GoldBar = block("GoldBar", GoldBarView);

/* ================= SYMBOLS ================= */
/** a big bold arrow (straight, curved, up-trend, down-trend, u-turn, circular) that draws itself */
function BigArrowView({ kind = "right", size = 300, color, at = 0, dur = 0.6 }: { kind?: "right" | "left" | "up" | "down" | "curve" | "trend-up" | "trend-down" | "uturn" | "cycle"; size?: number; color?: string; at?: number; dur?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / dur)), col = color ?? theme.accent;
  const paths: Record<string, [string, number]> = { right: ["M10 50 L80 50", 0], left: ["M90 50 L20 50", 180], up: ["M50 90 L50 20", -90], down: ["M50 10 L50 80", 90], curve: ["M10 80 Q30 10 85 30", -20], "trend-up": ["M8 85 L35 55 L55 68 L88 20", -55], "trend-down": ["M8 15 L35 45 L55 32 L88 80", 55], uturn: ["M20 90 L20 40 Q20 12 50 12 Q80 12 80 40 L80 70", 90], cycle: ["M50 12 A38 38 0 1 1 14 40", -120] };
  const [d, ang] = paths[kind];
  const end = d.split(/[ LQA]/).filter(Boolean).slice(-2).map(Number);
  return <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}><path d={d} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 2`} />{k > 0.9 && <path d="M-12 -12 L6 0 L-12 12" fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${end[0]} ${end[1]}) rotate(${ang})`} />}</svg>;
}
export const BigArrow = block("BigArrow", BigArrowView);
/** a tick or a cross that draws itself in a circle (right/wrong, yes/no, done/failed) */
function TickCrossView({ ok = true, size = 200, at = 0 }: { ok?: boolean; size?: number; at?: number }) {
  const { t } = useScene();
  const c = ease.back(clamp01((t - at) / 0.4)), k = ease.out(clamp01((t - at - 0.2) / 0.4));
  return <svg width={size} height={size} viewBox="-50 -50 100 100"><circle r={44 * c} fill={ok ? "var(--good, #3fb35a)" : "var(--bad, #e0453a)"} />{ok ? <path d="M-20 0 L-6 14 L22 -16" fill="none" stroke="#fff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 2`} /> : <path d="M-16 -16 L16 16 M16 -16 L-16 16" fill="none" stroke="#fff" strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 2`} />}</svg>;
}
export const TickCross = block("TickCross", TickCrossView);
/** a warning sign that pops in and flashes (danger, caution, stop, no entry, radiation, electricity) */
function WarningSignView({ kind = "caution", size = 260, at = 0, text }: { kind?: "caution" | "stop" | "no" | "radiation" | "electric" | "fire"; size?: number; at?: number; text?: string }) {
  const { t, b } = useIn(at, 0.4);
  const flash = Math.floor((t - at) * 3) % 2 ? 1 : 0.8;
  const glyph: Record<string, string> = { caution: "!", stop: "STOP", no: "", radiation: "☢", electric: "⚡", fire: "🔥" };
  const inner = kind === "stop" ? <svg viewBox="0 0 100 100" width={size} height={size}><path d="M30 2 L70 2 L98 30 L98 70 L70 98 L30 98 L2 70 L2 30 Z" fill="color-mix(in srgb, var(--bad, #e0453a) 91%, #000)" stroke="#fff" strokeWidth={4} /><text x={50} y={62} textAnchor="middle" fontSize={28} fontWeight={900} fill="#fff" fontFamily="Arial">{text ?? "STOP"}</text></svg>
    : kind === "no" ? <svg viewBox="0 0 100 100" width={size} height={size}><circle cx={50} cy={50} r={44} fill="#fff" stroke="color-mix(in srgb, var(--bad, #e0453a) 91%, #000)" strokeWidth={10} /><path d="M20 80 L80 20" stroke="color-mix(in srgb, var(--bad, #e0453a) 91%, #000)" strokeWidth={10} /></svg>
    : <svg viewBox="0 0 100 100" width={size} height={size}><path d="M50 6 L96 90 L4 90 Z" fill="var(--warn, #f0b43a)" stroke="#111" strokeWidth={6} strokeLinejoin="round" /><text x={50} y={78} textAnchor="middle" fontSize={44} fontWeight={900} fill="#111" fontFamily="Arial">{glyph[kind]}</text></svg>;
  return <div style={{ transform: `scale(${b})`, opacity: flash, textAlign: "center" }}>{inner}{text && kind !== "stop" && <div style={{ fontFamily: "Arial", fontWeight: 900, fontSize: size * 0.16, color: "#111", background: "var(--warn, #f0b43a)", marginTop: 8, padding: "4px 12px", borderRadius: 8 }}>{text}</div>}</div>;
}
export const WarningSign = block("WarningSign", WarningSignView);
/** a star rating that fills star by star up to `value` of 5 (reviews, ratings, quality) */
function StarRatingView({ value = 4.5, size = 90, at = 0, label }: { value?: number; size?: number; at?: number; label?: string }) {
  const { t, theme } = useScene();
  return <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: family(theme.display) }}>{Array.from({ length: 5 }, (_, i) => {
    const f = clamp01(value - i) * ease.out(clamp01((t - at - i * 0.15) / 0.3)), id = `st${i}${Math.round(f * 100)}`;
    return <div key={i} style={{ width: size, height: size }}><Part name="star" item={f} i={i} fit="contain"><svg width={size} height={size} viewBox="0 0 24 24"><defs><linearGradient id={id}><stop offset={`${f * 100}%`} stopColor="#ffc21c" /><stop offset={`${f * 100}%`} stopColor="#d5dae0" /></linearGradient></defs><path d="M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9 Z" fill={`url(#${id})`} /></svg></Part></div>;
  })}{label && <span style={{ fontSize: size * 0.6, fontWeight: 800, color: theme.ink, marginLeft: 16 }}>{label}</span>}</div>;
}
export const StarRating = block("StarRating", StarRatingView);
/** a trophy or medal that drops in and shines (a winner, first place, an award) */
function TrophyView({ kind = "trophy", size = 300, at = 0, label }: { kind?: "trophy" | "gold" | "silver" | "bronze"; size?: number; at?: number; label?: string }) {
  const { t, theme } = useScene();
  const k = ease.bounce(clamp01((t - at) / 0.7)), shine = ((t - at) * 0.6) % 1.4;
  const col = { trophy: "var(--warn, #f0b43a)", gold: "var(--warn, #f0b43a)", silver: "#c0c6cc", bronze: "#c98a4a" }[kind];
  return (
    <div style={{ textAlign: "center", transform: `translateY(${(1 - k) * -500}px)`, fontFamily: family(theme.display) }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 ${20 * Math.max(0, 1 - Math.abs(shine - 0.7) * 2)}px ${col})` }}>
        <SvgPart name="cup" item={{ kind }} x={0} y={0} w={100} h={100}>
        {kind === "trophy" ? <><path d="M28 10 L72 10 L68 46 Q50 62 32 46 Z" fill={col} /><path d="M28 16 Q8 16 12 32 Q16 42 30 40 M72 16 Q92 16 88 32 Q84 42 70 40" fill="none" stroke={col} strokeWidth={6} /><rect x={44} y={56} width={12} height={18} fill={col} /><rect x={30} y={74} width={40} height={14} rx={3} fill="#6a4a2a" /></>
          : <><path d="M30 0 L44 40 L56 40 L70 0 Z" fill="color-mix(in srgb, var(--water, #2a7fb8) 97%, #000)" /><circle cx={50} cy={64} r={30} fill={col} stroke="#fff" strokeWidth={4} /><text x={50} y={74} textAnchor="middle" fontSize={28} fontWeight={900} fill="#fff">{kind === "gold" ? 1 : kind === "silver" ? 2 : 3}</text></>}
        </SvgPart>
      </svg>
      {label && <div style={{ fontSize: size * 0.16, fontWeight: 800, color: theme.ink }}>{label}</div>}
    </div>
  );
}
export const Trophy = block("Trophy", TrophyView);
const FLAGS: Record<string, { stripes: string[]; dir?: "h" | "v"; mark?: ReactNode }> = {
  India: { stripes: ["#ff9933", "#ffffff", "#138808"], mark: <g transform="translate(75 50)"><circle r={13} fill="none" stroke="#000080" strokeWidth={2.5} />{Array.from({ length: 24 }, (_, i) => <line key={i} x1={0} y1={0} x2={0} y2={-13} stroke="#000080" strokeWidth={0.8} transform={`rotate(${i * 15})`} />)}</g> },
  "United States": { stripes: Array.from({ length: 13 }, (_, i) => (i % 2 ? "#fff" : "#b22234")), mark: <rect x={0} y={0} width={66} height={54} fill="#3c3b6e" /> },
  "United Kingdom": { stripes: ["#012169"], mark: <><path d="M0 0 L150 100 M150 0 L0 100" stroke="#fff" strokeWidth={18} /><path d="M0 0 L150 100 M150 0 L0 100" stroke="#c8102e" strokeWidth={6} /><path d="M75 0 V100 M0 50 H150" stroke="#fff" strokeWidth={30} /><path d="M75 0 V100 M0 50 H150" stroke="#c8102e" strokeWidth={16} /></> },
  France: { stripes: ["#0055a4", "#ffffff", "#ef4135"], dir: "v" }, Italy: { stripes: ["#009246", "#ffffff", "#ce2b37"], dir: "v" }, Ireland: { stripes: ["#169b62", "#ffffff", "#ff883e"], dir: "v" },
  Germany: { stripes: ["#000000", "#dd0000", "#ffce00"] }, Russia: { stripes: ["#ffffff", "#0039a6", "#d52b1e"] }, Netherlands: { stripes: ["#ae1c28", "#ffffff", "#21468b"] },
  Japan: { stripes: ["#ffffff"], mark: <circle cx={75} cy={50} r={28} fill="#bc002d" /> }, Bangladesh: { stripes: ["#006a4e"], mark: <circle cx={66} cy={50} r={28} fill="#f42a41" /> },
  China: { stripes: ["#de2910"], mark: <text x={14} y={42} fontSize={36} fill="#ffde00">★</text> }, Vietnam: { stripes: ["#da251d"], mark: <text x={52} y={68} fontSize={50} fill="#ffcd00">★</text> },
  Pakistan: { stripes: ["#01411c"], mark: <><rect x={0} y={0} width={38} height={100} fill="#fff" /><circle cx={92} cy={50} r={24} fill="#fff" /><circle cx={100} cy={44} r={21} fill="#01411c" /></> },
  "Sri Lanka": { stripes: ["#ffb700"], mark: <rect x={50} y={8} width={92} height={84} fill="#8d153a" /> }, Nepal: { stripes: ["#ffffff"], mark: <path d="M0 0 L100 50 L40 50 L100 100 L0 100 Z" fill="#dc143c" stroke="#003893" strokeWidth={6} /> },
  Brazil: { stripes: ["#009c3b"], mark: <><path d="M75 10 L140 50 L75 90 L10 50 Z" fill="#ffdf00" /><circle cx={75} cy={50} r={22} fill="#002776" /></> },
  Canada: { stripes: ["#ff0000", "#ffffff", "#ff0000"], dir: "v", mark: <text x={52} y={68} fontSize={48} fill="#ff0000">🍁</text> },
  Indonesia: { stripes: ["#ce1126", "#ffffff"] }, Ukraine: { stripes: ["#0057b7", "#ffd700"] }, Poland: { stripes: ["#ffffff", "#dc143c"] },
  "South Africa": { stripes: ["#de3831", "#ffffff", "#002395"], mark: <path d="M0 0 L60 50 L0 100 Z" fill="#007a4d" /> }, Egypt: { stripes: ["#ce1126", "#ffffff", "#000000"] },
};
/** a country's flag that waves in the wind (India, United States, United Kingdom, France, Germany, Japan, China, Pakistan…) */
function FlagView({ country, w = 300, at = 0, wave = true }: { country: string; w?: number; at?: number; wave?: boolean }) {
  const { t, b } = useIn(at, 0.5);
  const f = FLAGS[country] ?? { stripes: ["#ccc"] }, n = f.stripes.length, h = w * (100 / 150);
  const cloth = usePartValue("cloth");
  const strips = Array.from({ length: 12 }, (_, i) => {
    const y = wave ? Math.sin(t * 4 - i * 0.6) * 6 * (i / 12) : 0, shade = wave ? 0.9 + Math.sin(t * 4 - i * 0.6) * 0.1 : 1;
    return <div key={i} style={{ position: "absolute", left: (i / 12) * w, top: y, width: w / 12 + 1, height: h, overflow: "hidden", filter: `brightness(${shade})` }}>{isPicture(cloth) ? <Img src={src(cloth)} style={{ width: w, height: h, objectFit: "cover", marginLeft: -(i / 12) * w, display: "block" }} /> : <svg width={w} height={h} viewBox="0 0 150 100" preserveAspectRatio="none" style={{ marginLeft: -(i / 12) * w }}>
      {f.stripes.map((c, j) => f.dir === "v" ? <rect key={j} x={(j / n) * 150} y={0} width={150 / n + 0.5} height={100} fill={c} /> : <rect key={j} x={0} y={(j / n) * 100} width={150} height={100 / n + 0.5} fill={c} />)}{f.mark}
    </svg>}</div>;
  });
  return <div style={{ position: "relative", width: w + 14, height: h + 40, transform: `scale(${b})`, transformOrigin: "0% 100%" }}><div style={{ position: "absolute", left: -10, top: -10, width: 10, height: h * 2, background: "#777", borderRadius: 5 }} /><div style={{ position: "relative", width: w, height: h, boxShadow: "0 8px 20px rgb(0 0 0/0.25)" }}>{strips}</div></div>;
}
export const Flag = block("Flag", FlagView);
/** a light bulb that switches on with a glow (an idea, an insight, electricity) */
function LightbulbView({ size = 260, at = 0 }: { size?: number; at?: number }) {
  const { t } = useScene();
  const on = t > at, fl = on ? (t - at < 0.3 ? (Math.floor((t - at) * 20) % 2 ? 1 : 0.3) : 1) : 0;
  return <svg width={size} height={size * 1.3} viewBox="0 0 100 130" style={{ overflow: "visible", filter: fl ? `drop-shadow(0 0 ${30 * fl}px color-mix(in srgb, var(--glow, #ffe066) 95%, #000))` : undefined }}>{fl > 0 && Array.from({ length: 8 }, (_, i) => <line key={i} x1={50} y1={-4} x2={50} y2={-18} stroke="color-mix(in srgb, var(--glow, #ffe066) 95%, #000)" strokeWidth={5} strokeLinecap="round" transform={`rotate(${-70 + i * 20} 50 48)`} opacity={fl} />)}<path d="M50 6 Q86 6 86 44 Q86 64 66 80 L66 94 L34 94 L34 80 Q14 64 14 44 Q14 6 50 6 Z" fill={fl ? "var(--glow, #ffe066)" : "#e8e8e8"} stroke="#999" strokeWidth={3} /><path d="M40 80 L44 52 L50 60 L56 52 L60 80" fill="none" stroke={fl ? "#f08a1c" : "#aaa"} strokeWidth={3} /><rect x={34} y={94} width={32} height={22} rx={4} fill="var(--metal, #8a939d)" /><rect x={40} y={116} width={20} height={8} rx={3} fill="#555" /></svg>;
}
export const Lightbulb = block("Lightbulb", LightbulbView);
/** a big question mark (or ! or ?!) that wobbles in (a mystery, a question to the viewer) */
function QuestionMarkView({ glyph = "?", size = 300, at = 0, color }: { glyph?: "?" | "!" | "?!"; size?: number; at?: number; color?: string }) {
  const { t, theme, b } = useIn(at, 0.5);
  return <div style={{ fontFamily: family(theme.display), fontSize: size, fontWeight: 900, color: color ?? theme.accent, lineHeight: 1, transform: `scale(${b}) rotate(${Math.sin(t * 3) * 8}deg)`, textShadow: "0 12px 24px rgb(0 0 0/0.25)" }}>{glyph}</div>;
}
export const QuestionMark = block("QuestionMark", QuestionMarkView);
/** reaction icons that float up and fade (likes, hearts, laughs, claps) from a point, like a live stream */
function ReactionsView({ x, y, kinds = ["❤️", "👍", "😂", "👏"], at = 0, rate = 6 }: { x: number; y: number; kinds?: string[]; at?: number; rate?: number }) {
  const { t } = useScene();
  const s = t - at;
  if (s < 0) return null;
  const n = Math.floor(s * rate);
  return <>{Array.from({ length: Math.min(n, 40) }, (_, j) => { const i = n - 1 - j, age = s - i / rate, k = clamp01(age / 2.2); if (k >= 1) return null; return <div key={i} style={{ position: "absolute", left: x + Math.sin(age * 3 + i) * 40 + (rand(i) - 0.5) * 60, top: y - k * 420, fontSize: 56 + rand(i + 1) * 30, opacity: 1 - k, transform: `scale(${ease.back(clamp01(age / 0.3))})` }}><Part name="reaction" item={kinds[i % kinds.length]} i={i}>{kinds[i % kinds.length]}</Part></div>; })}</>;
}
export const Reactions = block("Reactions", ReactionsView);
