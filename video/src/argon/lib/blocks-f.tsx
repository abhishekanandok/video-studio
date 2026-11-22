/* LAYER 2, part F: more BLOCKS for the BODY and SCIENCE, MATHS and EDUCATION, TECH, DOCUMENTS, MEDIA, TEXT and
   BACKGROUNDS. Each is drawn (no picture needed) and moves well by itself: give it its data and `at`. */

import type { CSSProperties, ReactNode } from "react";
import { clamp01, family, useScene } from "../kit";
import { ease, rand } from "./motion";
import { shadow, src, useIn } from "./blocks-a";
import { Img } from "remotion";
import { Part, SvgPart, block } from "./parts";

const num = (v: number, d = 0) => v.toLocaleString("en-IN", { maximumFractionDigits: d });

/* ================= BODY and SCIENCE ================= */
/** an organ, drawn and alive: heart (beats), lungs (breathe), brain (sparks), stomach (churns), kidney, liver, eye, tooth */
function OrganView({ kind, size = 340, at = 0, label = true }: { kind: "heart" | "lungs" | "brain" | "stomach" | "kidney" | "liver" | "eye" | "tooth"; size?: number; at?: number; label?: boolean }) {
  const { t, theme, b } = useIn(at, 0.5);
  const beat = 1 + 0.08 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.4)), 6), breath = 1 + Math.sin(t * 1.6) * 0.06;
  const art: Record<string, ReactNode> = {
    heart: <g transform={`translate(50 52) scale(${beat}) translate(-50 -52)`}><path d="M50 88 C10 60 6 30 26 20 C40 13 50 24 50 32 C50 24 60 13 74 20 C94 30 90 60 50 88 Z" fill="#c8303a" /><path d="M40 20 Q42 6 50 4 M58 18 Q64 4 74 6" stroke="#8a1a24" strokeWidth={6} fill="none" strokeLinecap="round" /><path d="M30 40 Q36 30 44 34" stroke="#ff8a8a" strokeWidth={4} fill="none" /></g>,
    lungs: <g transform={`translate(50 55) scale(${breath}) translate(-50 -55)`}><rect x={47} y={6} width={6} height={30} fill="#d8a8a8" /><path d="M47 34 Q36 30 26 40 Q12 60 16 84 Q30 92 44 82 Q48 60 47 34 Z" fill="#e88a9a" /><path d="M53 34 Q64 30 74 40 Q88 60 84 84 Q70 92 56 82 Q52 60 53 34 Z" fill="#e88a9a" /><path d="M47 36 L36 52 M53 36 L64 52" stroke="#c8606a" strokeWidth={3} /></g>,
    brain: <g><path d="M50 16 Q30 8 20 24 Q6 30 12 48 Q6 66 24 72 Q34 86 50 78 Q66 86 76 72 Q94 66 88 48 Q94 30 80 24 Q70 8 50 16 Z" fill="#f2a8b8" /><path d="M50 18 L50 78 M28 32 Q38 40 30 50 M70 32 Q60 40 70 50 M24 60 Q36 58 38 68 M76 60 Q64 58 62 68" stroke="#c8708a" strokeWidth={3} fill="none" />{Array.from({ length: 5 }, (_, i) => { const k = (t * 1.5 + i / 5) % 1; return <circle key={i} cx={25 + rand(i) * 50} cy={25 + rand(i + 3) * 45} r={3 + k * 4} fill="var(--glow, #ffe066)" opacity={1 - k} />; })}</g>,
    stomach: <g transform={`rotate(${Math.sin(t * 2) * 3} 50 50)`}><path d="M40 8 L44 26 Q20 30 22 56 Q26 86 60 84 Q86 80 82 56 Q78 40 62 44 Q52 46 52 30 L50 8 Z" fill="#f0a87a" /><path d="M30 60 Q50 70 72 58" stroke="#c87a4a" strokeWidth={3} fill="none" /></g>,
    kidney: <g><path d="M40 10 Q14 12 14 50 Q14 88 40 88 Q56 88 52 70 Q46 60 54 50 Q62 40 54 26 Q50 10 40 10 Z" fill="#a8404a" /><path d="M54 50 L70 50 L76 90" stroke="#c8a040" strokeWidth={5} fill="none" /></g>,
    liver: <path d="M8 40 Q20 14 60 18 Q92 20 92 40 Q86 60 60 70 Q30 78 14 64 Q4 54 8 40 Z" fill="#8a3a2a" />,
    eye: <g><path d="M4 50 Q50 6 96 50 Q50 94 4 50 Z" fill="#fff" stroke="#333" strokeWidth={3} /><circle cx={50 + Math.sin(t * 0.8) * 10} cy={50} r={20} fill="#4a8ad9" /><circle cx={50 + Math.sin(t * 0.8) * 10} cy={50} r={9} fill="#111" /><circle cx={56 + Math.sin(t * 0.8) * 10} cy={44} r={4} fill="#fff" /></g>,
    tooth: <path d="M20 14 Q34 6 50 14 Q66 6 80 14 Q90 30 80 52 Q74 90 64 90 Q58 90 56 70 Q50 60 44 70 Q42 90 36 90 Q26 90 20 52 Q10 30 20 14 Z" fill="#fbfaf4" stroke="#ccc" strokeWidth={3} />,
  };
  return <div style={{ textAlign: "center", transform: `scale(${b})`, fontFamily: family(theme.display) }}><svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible", filter: "drop-shadow(0 10px 14px rgb(0 0 0/0.2))" }}><SvgPart name="organ" x={0} y={0} w={100} h={100} item={kind}>{art[kind]}</SvgPart></svg>{label && <div style={{ fontSize: size * 0.14, fontWeight: 800, color: theme.ink }}>{kind[0].toUpperCase() + kind.slice(1)}</div>}</div>;
}
export const Organ = block("Organ", OrganView);
/** a body outline with its organs in place; `glow` lights the ones the voice is about (where it hurts, what a food does) */
function BodyMapView({ glow = [], height = 900, at = 0 }: { glow?: ("brain" | "heart" | "lungs" | "stomach" | "liver" | "kidney")[]; height?: number; at?: number }) {
  const { t, u } = useIn(at, 0.6);
  const spots: Record<string, [number, number, string]> = { brain: [50, 9, "#f2a8b8"], lungs: [50, 30, "#e88a9a"], heart: [54, 32, "#c8303a"], liver: [42, 42, "#8a3a2a"], stomach: [57, 44, "#f0a87a"], kidney: [50, 50, "#a8404a"] };
  return (
    <svg width={height * 0.45} height={height} viewBox="0 0 100 220" style={{ opacity: u }}>
      <path d="M50 2 Q64 2 64 18 Q64 32 56 34 L74 40 Q84 44 84 58 L86 110 L78 110 L74 64 L70 120 L72 210 L56 210 L52 130 L48 130 L44 210 L28 210 L30 120 L26 64 L22 110 L14 110 L16 58 Q16 44 26 40 L44 34 Q36 32 36 18 Q36 2 50 2 Z" fill="#dfe8f0" stroke="#9aa8b8" strokeWidth={2} />
      {Object.entries(spots).map(([k, [x, y, c]]) => { const on = glow.includes(k as never); return <g key={k}><ellipse cx={x} cy={y * 2.2} rx={k === "lungs" ? 16 : 7} ry={k === "lungs" ? 14 : 6} fill={c} opacity={on ? 0.95 : 0.35} />{on && <circle cx={x} cy={y * 2.2} r={12 + Math.sin(t * 5) * 3} fill="none" stroke="color-mix(in srgb, var(--glow, #ffe066) 95%, #000)" strokeWidth={2} />}</g>; })}
    </svg>
  );
}
export const BodyMap = block("BodyMap", BodyMapView);
/** a skeleton that idles (its jaw can chatter) for anatomy, ageing, a spooky moment */
function SkeletonView({ height = 700, at = 0, chatter = false }: { height?: number; at?: number; chatter?: boolean }) {
  const { t, u } = useIn(at, 0.6);
  const jaw = chatter ? Math.abs(Math.sin(t * 14)) * 3 : 0, bone = "#f4f1e6";
  return (
    <svg width={height * 0.45} height={height} viewBox="0 0 100 220" style={{ opacity: u, transform: `rotate(${Math.sin(t * 1.2) * 1.5}deg)`, filter: "drop-shadow(0 0 1.5px #6a6458) drop-shadow(0 6px 8px rgb(0 0 0/0.25))" }}>
      <ellipse cx={50} cy={18} rx={14} ry={16} fill={bone} /><circle cx={44} cy={17} r={4} fill="#222" /><circle cx={56} cy={17} r={4} fill="#222" /><rect x={42} y={30 + jaw} width={16} height={6} rx={2} fill={bone} />
      <rect x={48} y={38} width={4} height={74} fill={bone} />{Array.from({ length: 6 }, (_, i) => <path key={i} d={`M50 ${48 + i * 7} Q${30} ${50 + i * 7} ${32} ${56 + i * 7} M50 ${48 + i * 7} Q70 ${50 + i * 7} 68 ${56 + i * 7}`} stroke={bone} strokeWidth={3} fill="none" />)}
      <path d="M30 44 L70 44 M30 44 L20 110 M70 44 L80 110 M36 112 Q50 124 64 112 L64 104 L36 104 Z M40 118 L34 210 M60 118 L66 210" stroke={bone} strokeWidth={5} fill={bone} strokeLinecap="round" />
    </svg>
  );
}
export const Skeleton = block("Skeleton", SkeletonView);
/** a DNA double helix that turns, its base pairs flashing (genes, heredity, biotech) */
function DnaHelixView({ w = 320, h = 760, at = 0, pairs = 18 }: { w?: number; h?: number; at?: number; pairs?: number }) {
  const { t } = useScene();
  const cols = ["var(--bad, #e0453a)", "#3a7ae0", "var(--good, #3fb35a)", "var(--warn, #f0b43a)"];
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>{Array.from({ length: pairs }, (_, i) => {
      const y = (i / (pairs - 1)) * h, a = (t - at) * 2 + i * 0.5, x1 = w / 2 + Math.sin(a) * w * 0.4, x2 = w / 2 - Math.sin(a) * w * 0.4, front = Math.cos(a) > 0, k = clamp01((t - at - i * 0.05) / 0.3);
      return <g key={i} opacity={k}><line x1={x1} y1={y} x2={w / 2} y2={y} stroke={cols[i % 4]} strokeWidth={10} /><line x1={w / 2} y1={y} x2={x2} y2={y} stroke={cols[(i + 2) % 4]} strokeWidth={10} /><circle cx={x1} cy={y} r={front ? 16 : 11} fill="#4a5a8a" /><circle cx={x2} cy={y} r={front ? 11 : 16} fill="#8a4a7a" /></g>;
    })}</svg>
  );
}
export const DnaHelix = block("DnaHelix", DnaHelixView);
/** a microbe: a virus with spikes, a rod bacterium with flagella, or an amoeba that wobbles (disease, immunity) */
function MicrobeView({ kind = "virus", size = 300, at = 0, color }: { kind?: "virus" | "bacteria" | "amoeba"; size?: number; at?: number; color?: string }) {
  const { t, b } = useIn(at, 0.5);
  const C = color ?? { virus: "var(--bad, #e0453a)", bacteria: "var(--good, #3fb35a)", amoeba: "#8a6ad8" }[kind];
  if (kind === "virus") return <svg width={size} height={size} viewBox="-60 -60 120 120" style={{ transform: `scale(${b}) rotate(${t * 20}deg)` }}>{Array.from({ length: 14 }, (_, i) => <g key={i} transform={`rotate(${i * (360 / 14)})`}><line x1={0} y1={-30} x2={0} y2={-48} stroke={C} strokeWidth={4} /><circle cx={0} cy={-50} r={6} fill="#ffb04a" /></g>)}<circle r={32} fill={C} /><circle r={32} fill="url(#vshine)" />{[[-10, -8], [8, 6], [-4, 14], [12, -12]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} fill="rgb(0 0 0/0.2)" />)}</svg>;
  if (kind === "bacteria") return <svg width={size * 1.4} height={size} viewBox="-80 -50 160 100" style={{ transform: `scale(${b}) translateX(${Math.sin(t) * 10}px)` }}>{[-1, 1].map((s) => <path key={s} d={`M${s * 50} 0 Q${s * 66} ${Math.sin(t * 8) * 14} ${s * 78} 0 T${s * 96} 0`} stroke={C} strokeWidth={3} fill="none" />)}<rect x={-52} y={-22} width={104} height={44} rx={22} fill={C} /><rect x={-40} y={-10} width={80} height={20} rx={10} fill="rgb(255 255 255/0.25)" /></svg>;
  const pts = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2, r = 40 + Math.sin(a * 3 + t * 2) * 7 + Math.sin(a * 5 - t * 3) * 4; return `${Math.cos(a) * r},${Math.sin(a) * r}`; }).join(" ");
  return <svg width={size} height={size} viewBox="-60 -60 120 120" style={{ transform: `scale(${b})` }}><polygon points={pts} fill={C} opacity={0.7} /><circle cx={Math.sin(t) * 6} cy={Math.cos(t) * 6} r={12} fill="#4a2a8a" /></svg>;
}
export const Microbe = block("Microbe", MicrobeView);
/** a nerve cell: a body with branching dendrites and an axon, signals running down it (thought, pain, reflex) */
function NeuronView({ w = 900, h = 400, at = 0, color = "#8a6ad8" }: { w?: number; h?: number; at?: number; color?: string }) {
  const { t } = useScene();
  const k = ((t - at) * 0.6) % 1;
  return (
    <svg width={w} height={h} viewBox="0 0 300 130" style={{ overflow: "visible" }}>
      {[[-40, -40], [-50, 10], [-30, 50], [10, -55], [5, 55]].map(([dx, dy], i) => <path key={i} d={`M60 65 Q${60 + dx / 2} ${65 + dy / 2} ${60 + dx} ${65 + dy}`} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" />)}
      <circle cx={60} cy={65} r={22} fill={color} /><circle cx={60} cy={65} r={9} fill="#4a2a8a" />
      <path d="M82 65 Q170 50 260 70" stroke={color} strokeWidth={8} fill="none" />{[110, 140, 170, 200, 230].map((x) => <rect key={x} x={x} y={56 + (x - 110) * 0.05} width={22} height={14} rx={7} fill="color-mix(in srgb, var(--warn, #f0b43a) 97%, #fff)" />)}
      {[0, 1, 2].map((j) => <path key={j} d={`M260 70 L${280} ${50 + j * 20}`} stroke={color} strokeWidth={5} />)}
      {t >= at && <circle cx={82 + k * 178} cy={65 + Math.sin(k * Math.PI) * -8 + k * 5} r={8} fill="var(--glow, #ffe066)" style={{ filter: "drop-shadow(0 0 6px var(--glow, #ffe066))" }} />}
    </svg>
  );
}
export const Neuron = block("Neuron", NeuronView);
/** an atom (Bohr model): a nucleus and electrons orbiting in shells; `element` gives the right number in each shell */
function AtomView({ protons = 6, size = 520, at = 0, label }: { protons?: number; size?: number; at?: number; label?: string }) {
  const { t, theme, b } = useIn(at, 0.5);
  const shells: number[] = []; let left = protons; for (const cap of [2, 8, 18, 32]) { if (left <= 0) break; shells.push(Math.min(cap, left)); left -= cap; }
  const c = size / 2;
  return (
    <div style={{ textAlign: "center", fontFamily: family(theme.display), transform: `scale(${b})` }}>
      <svg width={size} height={size}>
        {shells.map((n, s) => { const r = 70 + s * ((c - 80) / Math.max(1, shells.length)); return <g key={s}><circle cx={c} cy={c} r={r} fill="none" stroke={theme.muted} strokeWidth={2} strokeDasharray="6 8" />{Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + t * (1.2 - s * 0.25); return <circle key={i} cx={c + Math.cos(a) * r} cy={c + Math.sin(a) * r} r={11} fill={theme.accent2} />; })}</g>; })}
        {Array.from({ length: Math.min(protons * 2, 24) }, (_, i) => <circle key={i} cx={c + (rand(i) - 0.5) * 50} cy={c + (rand(i + 9) - 0.5) * 50} r={13} fill={i % 2 ? theme.accent : "color-mix(in srgb, var(--metal, #8a939d) 85%, #fff)"} />)}
      </svg>
      {label && <div style={{ fontSize: 50, fontWeight: 800, color: theme.ink }}>{label}</div>}
    </div>
  );
}
export const Atom = block("Atom", AtomView);
/** a simple circuit: a battery, a switch, a bulb; when the switch closes current flows (dots run) and the bulb lights */
function CircuitView({ w = 900, h = 520, at = 0, close = 1 }: { w?: number; h?: number; at?: number; close?: number }) {
  const { t, theme } = useScene();
  const on = t >= at + close, sw = ease.out(clamp01((t - at - close) / 0.3));
  const path = [[150, 100], [750, 100], [750, 420], [150, 420], [150, 100]] as [number, number][];
  const len = 2 * (600 + 320), pos = (d: number) => { let r = d % len; for (let i = 0; i < 4; i++) { const [a, b2] = [path[i], path[i + 1]], L = Math.hypot(b2[0] - a[0], b2[1] - a[1]); if (r <= L) return [a[0] + ((b2[0] - a[0]) * r) / L, a[1] + ((b2[1] - a[1]) * r) / L]; r -= L; } return path[0]; };
  return (
    <svg width={w} height={h} viewBox="0 0 900 520" style={{ fontFamily: family(theme.font) }}>
      <path d="M150 100 L380 100 M520 100 L750 100 L750 420 L150 420 L150 100" fill="none" stroke={theme.ink} strokeWidth={8} />
      <line x1={380} y1={100} x2={380 + 140 * Math.cos(((1 - sw) * -30 * Math.PI) / 180)} y2={100 + 140 * Math.sin(((1 - sw) * -30 * Math.PI) / 180)} stroke={theme.ink} strokeWidth={8} strokeLinecap="round" /><circle cx={380} cy={100} r={10} fill={theme.ink} /><circle cx={520} cy={100} r={10} fill={theme.ink} />
      <rect x={110} y={210} width={80} height={110} rx={10} fill="#3a3a3a" /><rect x={130} y={196} width={40} height={16} fill="#3a3a3a" /><text x={150} y={276} textAnchor="middle" fill="#fff" fontSize={40} fontWeight={800}>+</text>
      <SvgPart name="bulb" x={694} y={204} w={112} h={112} item={on}><circle cx={750} cy={260} r={56} fill={on ? "var(--glow, #ffe066)" : "#e8e8e8"} stroke="#999" strokeWidth={4} style={on ? { filter: "drop-shadow(0 0 30px color-mix(in srgb, var(--glow, #ffe066) 95%, #000))" } : undefined} /></SvgPart>
      {on && Array.from({ length: 14 }, (_, i) => { const [x, y] = pos((t - at - close) * 300 + (i * len) / 14); return <circle key={i} cx={x} cy={y} r={8} fill="#3a9ae0" />; })}
    </svg>
  );
}
export const Circuit = block("Circuit", CircuitView);
/** a magnet with its field lines curving from pole to pole, iron filings shimmering along them */
function MagnetFieldView({ size = 700, at = 0 }: { size?: number; at?: number }) {
  const { t } = useScene();
  const k = ease.out(clamp01((t - at) / 1));
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 200 140">
      {[20, 35, 50, 65].map((r, i) => <g key={i} opacity={k}><path d={`M60 70 C60 ${70 - r * 1.4} 140 ${70 - r * 1.4} 140 70`} fill="none" stroke="#6a7a9a" strokeWidth={1.4} strokeDasharray="3 3" strokeDashoffset={-t * 10} /><path d={`M60 70 C60 ${70 + r * 1.4} 140 ${70 + r * 1.4} 140 70`} fill="none" stroke="#6a7a9a" strokeWidth={1.4} strokeDasharray="3 3" strokeDashoffset={-t * 10} /></g>)}
      <rect x={60} y={58} width={40} height={24} fill="color-mix(in srgb, var(--bad, #e0453a) 91%, #000)" /><rect x={100} y={58} width={40} height={24} fill="#2a5ad4" /><text x={80} y={75} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={800}>N</text><text x={120} y={75} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={800}>S</text>
    </svg>
  );
}
export const MagnetField = block("MagnetField", MagnetFieldView);
/** a medical monitor: heart rate, oxygen and blood pressure numbers ticking beside a beating line */
function VitalsMonitorView({ bpm = 78, spo2 = 98, bp = "120/80", at = 0, w = 900 }: { bpm?: number; spo2?: number; bp?: string; at?: number; w?: number }) {
  const { t } = useScene();
  const h = w * 0.5, live = Math.round(bpm + Math.sin(t * 0.7) * 2);
  const beat = (x: number) => { const p = ((x / 60 + t * (bpm / 60)) % 1); return p < 0.08 ? -40 : p < 0.12 ? 60 : p < 0.16 ? -10 : 0; };
  return (
    <div style={{ width: w, height: h, background: "#0a0f14", borderRadius: 20, border: "10px solid #2a3038", display: "flex", padding: 24, boxSizing: "border-box", fontFamily: "monospace", gap: 20 }}>
      <svg width={w * 0.6} height={h - 60}><path d={"M0 " + (h / 2 - 30) + Array.from({ length: 120 }, (_, i) => ` L${i * (w * 0.6 / 120)} ${h / 2 - 30 + beat(i * 5)}`).join("")} fill="none" stroke="var(--signal, #3ff28a)" strokeWidth={4} /></svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around" }}><div style={{ color: "var(--signal, #3ff28a)", fontSize: 70, fontWeight: 800 }}>♥ {t >= at ? live : "--"}</div><div style={{ color: "#4ac0ff", fontSize: 50 }}>SpO₂ {spo2}%</div><div style={{ color: "color-mix(in srgb, var(--glow, #ffe066) 95%, #000)", fontSize: 44 }}>BP {bp}</div></div>
    </div>
  );
}
export const VitalsMonitor = block("VitalsMonitor", VitalsMonitorView);
/** an X-ray view: a photo turns into a glowing negative and a scan line sweeps down it (looking inside) */
function XRayView({ image, w = 700, h = 800, at = 0 }: { image: string; w?: number; h?: number; at?: number }) {
  const { t } = useScene();
  const k = ease.inOut(clamp01((t - at) / 1.6));
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 14, overflow: "hidden", background: "#000" }}>
      <Part name="photo"><Img src={src(image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /></Part>
      <Img src={src(image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) invert(1) contrast(1.6) brightness(0.9) sepia(0.3) hue-rotate(160deg)", clipPath: `inset(0 0 ${(1 - k) * 100}% 0)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: `${k * 100}%`, height: 8, background: "#7ae0ff", boxShadow: "0 0 30px #7ae0ff" }} />
    </div>
  );
}
export const XRay = block("XRay", XRayView);
/** a view down a microscope: a round lens with cells drifting and dividing in it (biology, a lab test) */
function MicroscopeViewView({ size = 640, at = 0, color = "#9ad87a" }: { size?: number; at?: number; color?: string }) {
  const { t } = useScene();
  const s = Math.max(0, t - at);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: "radial-gradient(circle, #f8fbf0, #d8e8c8)", position: "relative", boxShadow: "0 0 0 24px #222, 0 20px 50px rgb(0 0 0/0.5)" }}>
      {Array.from({ length: 9 }, (_, i) => { const x = size * (0.2 + rand(i) * 0.6) + Math.sin(s * 0.5 + i) * 30, y = size * (0.2 + rand(i + 5) * 0.6) + Math.cos(s * 0.4 + i) * 30, split = i === 0 ? clamp01((s - 1) / 2) : 0; return <div key={i}>{[0, 1].map((h2) => <Part name="cell" key={h2} item={h2} i={i}><div style={{ position: "absolute", left: x - 45 + (h2 ? 1 : -1) * split * 40, top: y - 45, width: 90, height: 90, borderRadius: "50%", background: color, border: "4px solid color-mix(in srgb, var(--grass, #5a9a3a) 92%, #fff)", opacity: h2 && split === 0 ? 0 : 0.85 }}><div style={{ position: "absolute", left: 30, top: 30, width: 26, height: 26, borderRadius: 13, background: "#4a6a2a" }} /></div></Part>)}</div>; })}
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, transparent 60%, rgb(0 0 0/0.5))" }} />
    </div>
  );
}
export const MicroscopeView = block("MicroscopeView", MicroscopeViewView);
/** a periodic-table tile for an element: number, symbol, name and mass (chemistry) */
function ElementTileView({ n, symbol, name, mass, size = 300, at = 0, color }: { n: number; symbol: string; name: string; mass: string; size?: number; at?: number; color?: string }) {
  const { theme, b } = useIn(at, 0.5);
  return <div style={{ width: size, height: size, background: color ?? theme.accent2, color: "#fff", borderRadius: 18, padding: 20, boxSizing: "border-box", fontFamily: family(theme.font), transform: `scale(${b}) rotate(${(1 - b) * -10}deg)`, boxShadow: shadow, position: "relative" }}><div style={{ fontSize: size * 0.12, fontWeight: 700 }}>{n}</div><div style={{ fontSize: size * 0.4, fontWeight: 800, textAlign: "center", lineHeight: 1, fontFamily: family(theme.display) }}>{symbol}</div><div style={{ fontSize: size * 0.1, textAlign: "center", fontWeight: 700 }}>{name}</div><div style={{ fontSize: size * 0.08, textAlign: "center", opacity: 0.85 }}>{mass}</div></div>;
}
export const ElementTile = block("ElementTile", ElementTileView);

/* ================= MATHS and EDUCATION ================= */
/** a number line with ticks; points hop along it from one value to the next (adding, negative numbers, a jump of +5) */
function NumberLineView({ from = -5, to = 10, hops = [], w = 1500, at = 0, per = 0.8 }: { from?: number; to?: number; hops?: number[]; w?: number; at?: number; per?: number }) {
  const { t, theme } = useScene();
  const x = (v: number) => ((v - from) / (to - from)) * w;
  const n = clamp01((t - at - 0.4) / (per * Math.max(1, hops.length - 1))) * Math.max(0, hops.length - 1), i = Math.floor(n), f = ease.inOut(n - i);
  const cur = hops.length ? hops[i] + ((hops[Math.min(hops.length - 1, i + 1)] - hops[i]) * f) : 0, jump = Math.sin(f * Math.PI) * 90;
  return (
    <svg width={w} height={260} style={{ overflow: "visible", fontFamily: family(theme.font) }}>
      <line x1={-20} y1={180} x2={w + 20} y2={180} stroke={theme.ink} strokeWidth={6} />
      {Array.from({ length: to - from + 1 }, (_, j) => <g key={j}><line x1={x(from + j)} y1={166} x2={x(from + j)} y2={194} stroke={theme.ink} strokeWidth={4} /><text x={x(from + j)} y={234} textAnchor="middle" fontSize={30} fill={theme.ink}>{from + j}</text></g>)}
      {hops.slice(0, i + 1).map((h2, j) => j < hops.length - 1 && j <= i && <path key={j} d={`M${x(h2)} 166 Q${(x(h2) + x(hops[j + 1])) / 2} ${60} ${x(hops[j + 1])} 166`} fill="none" stroke={theme.accent} strokeWidth={4} strokeDasharray="8 8" opacity={j < i ? 1 : f} />)}
      {hops.length > 0 && t >= at && <circle cx={x(cur)} cy={160 - jump} r={20} fill={theme.accent} stroke="#fff" strokeWidth={5} />}
    </svg>
  );
}
export const NumberLine = block("NumberLine", NumberLineView);
/** a graph of a function on axes with a grid: the curve draws itself (y = x², sin x, growth and decay) */
function FunctionGraphView({ fn, xMin = -5, xMax = 5, yMin = -5, yMax = 5, w = 1000, h = 700, at = 0, dur = 2, label, color }: { fn: (x: number) => number; xMin?: number; xMax?: number; yMin?: number; yMax?: number; w?: number; h?: number; at?: number; dur?: number; label?: string; color?: string }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / dur)), X = (x: number) => ((x - xMin) / (xMax - xMin)) * w, Y = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;
  const pts: string[] = [];
  for (let i = 0; i <= 200 * k; i++) { const x = xMin + (i / 200) * (xMax - xMin), y = fn(x); if (y >= yMin - 1 && y <= yMax + 1) pts.push(`${X(x).toFixed(1)} ${Y(y).toFixed(1)}`); }
  return (
    <svg width={w} height={h} style={{ overflow: "visible", fontFamily: family(theme.font), background: theme.paper ?? "#fff", borderRadius: 14 }}>
      {Array.from({ length: xMax - xMin + 1 }, (_, i) => <line key={"x" + i} x1={X(xMin + i)} y1={0} x2={X(xMin + i)} y2={h} stroke="#e4e8ec" strokeWidth={2} />)}
      {Array.from({ length: yMax - yMin + 1 }, (_, i) => <line key={"y" + i} x1={0} y1={Y(yMin + i)} x2={w} y2={Y(yMin + i)} stroke="#e4e8ec" strokeWidth={2} />)}
      <line x1={0} y1={Y(0)} x2={w} y2={Y(0)} stroke={theme.ink} strokeWidth={4} /><line x1={X(0)} y1={0} x2={X(0)} y2={h} stroke={theme.ink} strokeWidth={4} />
      {pts.length > 1 && <path d={"M" + pts.join(" L")} fill="none" stroke={color ?? theme.accent} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
      {label && <text x={w - 20} y={40} textAnchor="end" fontSize={44} fontWeight={800} fill={color ?? theme.accent} fontFamily={family(theme.display)}>{label}</text>}
    </svg>
  );
}
export const FunctionGraph = block("FunctionGraph", FunctionGraphView);
/** a triangle (or polygon) draws itself, then its angles and side lengths appear (geometry, Pythagoras) */
function GeometryView({ points = [[100, 500], [700, 500], [700, 100]], labels = ["A", "B", "C"], sides = ["", "", ""], angles = [], at = 0, w = 800, h = 600, rightAngle }: { points?: [number, number][]; labels?: string[]; sides?: string[]; angles?: string[]; at?: number; w?: number; h?: number; rightAngle?: number }) {
  const { t, theme } = useScene();
  const k = ease.inOut(clamp01((t - at) / 1.4)), lab = clamp01((t - at - 1.4) / 0.5);
  const d = "M" + points.map((p) => p.join(" ")).join(" L") + " Z", cx = points.reduce((a, p) => a + p[0], 0) / points.length, cy = points.reduce((a, p) => a + p[1], 0) / points.length;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", fontFamily: family(theme.display) }}>
      <path d={d} fill={`${theme.accent}22`} stroke={theme.ink} strokeWidth={7} strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 2`} />
      {rightAngle !== undefined && lab > 0 && (() => { const p = points[rightAngle], a = points[(rightAngle + points.length - 1) % points.length], b2 = points[(rightAngle + 1) % points.length], u = (q: [number, number]) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]); return [(q[0] - p[0]) / L * 40, (q[1] - p[1]) / L * 40]; }, [ax, ay] = u(a), [bx, by] = u(b2); return <path d={`M${p[0] + ax} ${p[1] + ay} L${p[0] + ax + bx} ${p[1] + ay + by} L${p[0] + bx} ${p[1] + by}`} fill="none" stroke={theme.accent} strokeWidth={5} />; })()}
      {points.map((p, i) => { const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1, q = points[(i + 1) % points.length]; return <g key={i} opacity={lab}>
        <text x={p[0] + (dx / L) * 40} y={p[1] + (dy / L) * 40 + 14} textAnchor="middle" fontSize={44} fontWeight={800} fill={theme.ink}>{labels[i]}</text>
        {sides[i] && <text x={(p[0] + q[0]) / 2 - ((p[1] + q[1]) / 2 - cy) * 0.15} y={(p[1] + q[1]) / 2 + ((p[0] + q[0]) / 2 - cx) * 0.15 + 12} textAnchor="middle" fontSize={38} fontWeight={700} fill={theme.accent2}>{sides[i]}</text>}
        {angles[i] && <text x={p[0] - (dx / L) * 70} y={p[1] - (dy / L) * 70 + 12} textAnchor="middle" fontSize={30} fill={theme.accent}>{angles[i]}</text>}
      </g>; })}
    </svg>
  );
}
export const Geometry = block("Geometry", GeometryView);
/** a fraction shown as a pie or a bar: parts fill one by one (3/4, sharing a pizza, a share of votes) */
function FractionView({ top, bottom, kind = "pie", size = 420, at = 0, color }: { top: number; bottom: number; kind?: "pie" | "bar"; size?: number; at?: number; color?: string }) {
  const { t, theme } = useScene();
  const col = color ?? theme.accent;
  const filled = (i: number) => i < top && t > at + i * 0.3;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 50, fontFamily: family(theme.display) }}>
      {kind === "pie" ? <svg width={size} height={size} viewBox="-50 -50 100 100">{Array.from({ length: bottom }, (_, i) => { const a0 = (i / bottom) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / bottom) * Math.PI * 2 - Math.PI / 2; return <path key={i} d={`M0 0 L${Math.cos(a0) * 46} ${Math.sin(a0) * 46} A46 46 0 0 1 ${Math.cos(a1) * 46} ${Math.sin(a1) * 46} Z`} fill={filled(i) ? col : "#eef0f3"} stroke="#fff" strokeWidth={2} />; })}</svg>
        : <div style={{ display: "flex", width: size * 1.6, height: size * 0.35, borderRadius: 14, overflow: "hidden", border: `4px solid ${theme.ink}` }}>{Array.from({ length: bottom }, (_, i) => <div key={i} style={{ flex: 1, background: filled(i) ? col : "#eef0f3", borderRight: i < bottom - 1 ? `3px solid ${theme.ink}` : undefined }} />)}</div>}
      <div style={{ fontSize: size * 0.3, fontWeight: 800, color: theme.ink, textAlign: "center", lineHeight: 1 }}><div>{top}</div><div style={{ height: 10, background: theme.ink, borderRadius: 5, margin: "6px 0" }} /><div>{bottom}</div></div>
    </div>
  );
}
export const Fraction = block("Fraction", FractionView);
/** a blackboard or whiteboard: chalk (or marker) lines of working written one after another (a lesson, a proof) */
function BlackboardView({ lines, at = 0, per = 1, kind = "chalk", w = 1500, h = 800 }: { lines: string[]; at?: number; per?: number; kind?: "chalk" | "white"; w?: number; h?: number }) {
  const { t } = useScene();
  const chalk = kind === "chalk";
  return (
    <div style={{ width: w, height: h, background: chalk ? "radial-gradient(circle at 40% 30%, #3a6a4a, #24432e)" : "#fbfcfd", border: `24px solid ${chalk ? "color-mix(in srgb, var(--wood, #8a5a2a) 87%, #000)" : "#c5cad0"}`, borderRadius: 12, boxSizing: "border-box", padding: "40px 60px", fontFamily: family(chalk ? "caveat" : "permanent_marker"), fontSize: 66, lineHeight: 1.35, color: chalk ? "#f4f4ea" : "#1a3a8a", boxShadow: shadow }}>
      {lines.map((l, i) => { const n = Math.floor(clamp01((t - at - i * per) / (per * 0.8)) * l.length); return <div key={i} style={{ textShadow: chalk ? "0 0 2px rgb(255 255 255/0.5)" : undefined }}>{l.slice(0, n)}</div>; })}
    </div>
  );
}
export const Blackboard = block("Blackboard", BlackboardView);
/** a notebook page: ruled lines, a margin, and handwritten notes that appear line by line, with a highlighted line */
function NotebookPageView({ lines, at = 0, per = 0.8, mark, w = 1000, h = 800 }: { lines: string[]; at?: number; per?: number; mark?: number; w?: number; h?: number }) {
  const { t } = useScene();
  return (
    <div style={{ width: w, height: h, background: `repeating-linear-gradient(#fffdf6 0 58px, #b8d4ee 58px 60px)`, borderRadius: 8, position: "relative", boxShadow: shadow, padding: "70px 40px 0 130px", boxSizing: "border-box", fontFamily: family("caveat"), fontSize: 50, lineHeight: "60px", color: "#1a2a6a" }}>
      <div style={{ position: "absolute", left: 100, top: 0, bottom: 0, width: 3, background: "#e88a8a" }} />
      {Array.from({ length: 5 }, (_, i) => <div key={i} style={{ position: "absolute", left: 30, top: 80 + i * 150, width: 30, height: 30, borderRadius: 15, background: "#d8dce2" }} />)}
      {lines.map((l, i) => { const n = Math.floor(clamp01((t - at - i * per) / (per * 0.8)) * l.length); return <div key={i} style={{ background: mark === i && n >= l.length ? "rgb(255 230 80/0.6)" : undefined, display: "inline-block", width: "100%" }}>{l.slice(0, n)}&nbsp;</div>; })}
    </div>
  );
}
export const NotebookPage = block("NotebookPage", NotebookPageView);
/** a flashcard: the question on the front flips over to the answer on the back (revision, a quiz) */
function FlashcardView({ front, back, at = 0, flip = 2, w = 900, h = 560 }: { front: string; back: string; at?: number; flip?: number; w?: number; h?: number }) {
  const { t, theme, b } = useIn(at, 0.5);
  const k = ease.inOut(clamp01((t - at - flip) / 0.6)), side = k < 0.5;
  return (
    <div style={{ width: w, height: h, transform: `scale(${b}) perspective(2000px) rotateY(${k * 180}deg)` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 30, background: side ? theme.paper ?? "#fff" : theme.accent, color: side ? theme.ink : "#fff", display: "grid", placeItems: "center", textAlign: "center", padding: 60, boxSizing: "border-box", fontFamily: family(theme.display), fontSize: 66, fontWeight: 800, boxShadow: shadow, transform: side ? undefined : "rotateY(180deg)" }}>{side ? front : back}</div>
    </div>
  );
}
export const Flashcard = block("Flashcard", FlashcardView);
/** a dictionary-style definition card: the term, how it is said, its kind, the meaning, and an example */
function DefinitionCardView({ term, say, kind = "noun", meaning, example, at = 0, w = 1200 }: { term: string; say?: string; kind?: string; meaning: string; example?: string; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const step = (i: number) => clamp01((t - at - i * 0.45) / 0.4);
  return (
    <div style={{ width: w, background: theme.paper ?? "#fff", borderRadius: 24, padding: "44px 60px", boxShadow: shadow, fontFamily: family(theme.font), color: theme.ink, borderLeft: `16px solid ${theme.accent}`, boxSizing: "border-box" }}>
      <div style={{ fontFamily: family(theme.display), fontSize: 96, fontWeight: 800, opacity: step(0) }}>{term}</div>
      <div style={{ fontSize: 34, color: theme.muted, opacity: step(1) }}>{say && `/${say}/ · `}<i>{kind}</i></div>
      <div style={{ fontSize: 46, marginTop: 20, lineHeight: 1.3, opacity: step(2) }}>{meaning}</div>
      {example && <div style={{ fontSize: 36, marginTop: 20, color: theme.muted, fontStyle: "italic", opacity: step(3) }}>“{example}”</div>}
    </div>
  );
}
export const DefinitionCard = block("DefinitionCard", DefinitionCardView);

/* ================= TECH ================= */
/** a browser window with tabs, an address bar that types the URL, and a page that loads in */
export function BrowserWindow({ url = "drishyya.com", title = "Drishyya", children, at = 0, w = 1400, h = 820 }: { url?: string; title?: string; children?: ReactNode; at?: number; w?: number; h?: number }) {
  const { t, u } = useIn(at, 0.6);
  const n = Math.floor(clamp01((t - at - 0.3) * 18 / Math.max(1, url.length)) * url.length), load = ease.out(clamp01((t - at - 0.3 - url.length / 18) / 0.8));
  return (
    <div style={{ width: w, height: h, borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: "0 30px 60px rgb(0 0 0/0.3)", transform: `translateY(${(1 - u) * 60}px)`, opacity: u, fontFamily: family("inter") }}>
      <div style={{ height: 56, background: "#e8eaed", display: "flex", alignItems: "flex-end", padding: "0 20px", gap: 10 }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c, marginBottom: 20 }} />)}<div style={{ marginLeft: 20, background: "#fff", borderRadius: "12px 12px 0 0", padding: "10px 30px", fontSize: 22 }}>{title}</div></div>
      <div style={{ height: 60, background: "#fff", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", padding: "0 20px" }}><div style={{ flex: 1, height: 40, borderRadius: 20, background: "#f1f3f4", display: "flex", alignItems: "center", padding: "0 20px", fontSize: 24, color: "#333" }}>🔒 {url.slice(0, n)}</div></div>
      <div style={{ height: 4, width: `${load * 100}%`, background: "#4a8ae0", opacity: load < 1 ? 1 : 0 }} />
      <div style={{ position: "relative", height: h - 120, opacity: load }}>{children}</div>
    </div>
  );
}
/** a chat app conversation: bubbles arrive left and right with typing dots before each (WhatsApp-style) */
function ChatAppView({ messages, at = 0, per = 1.2, w = 700, h = 1000, title = "Mom" }: { messages: { from: "me" | "them"; text: string }[]; at?: number; per?: number; w?: number; h?: number; title?: string }) {
  const { t } = useScene();
  const shown = Math.floor(Math.max(0, t - at) / per), typing = (t - at) % per < 0.5 && shown < messages.length;
  return (
    <div style={{ width: w, height: h, borderRadius: 40, overflow: "hidden", background: "color-mix(in srgb, var(--wall, #e8e4dc) 90%, #fff)", fontFamily: family("inter"), boxShadow: "0 30px 60px rgb(0 0 0/0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 110, background: "#075e54", color: "#fff", display: "flex", alignItems: "center", padding: "0 30px", gap: 20, fontSize: 32, fontWeight: 700 }}><div style={{ width: 64, height: 64, borderRadius: 32, background: "#ccc" }} />{title}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 24, gap: 14 }}>
        {messages.slice(0, shown).map((m, i) => <Part name="message" key={i} item={m} i={i}><div style={{ alignSelf: m.from === "me" ? "flex-end" : "flex-start", maxWidth: "78%", background: m.from === "me" ? "#d9fdd3" : "#fff", borderRadius: 18, padding: "16px 22px", fontSize: 30, boxShadow: "0 2px 3px rgb(0 0 0/0.1)", transform: `scale(${ease.back(clamp01((t - at - (i + 1) * per) / 0.3 + 1))})` }}>{m.text}<span style={{ fontSize: 18, color: "#888", marginLeft: 12 }}>{m.from === "me" ? "✓✓" : ""}</span></div></Part>)}
        {typing && <div style={{ alignSelf: messages[shown]?.from === "me" ? "flex-end" : "flex-start", background: "#fff", borderRadius: 18, padding: "16px 22px", display: "flex", gap: 8 }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "#999", transform: `translateY(${Math.sin(t * 10 + i) * 4}px)` }} />)}</div>}
      </div>
    </div>
  );
}
export const ChatApp = block("ChatApp", ChatAppView);
/** a search page: a query typed into a search box, then result cards drop in one by one */
function SearchResultsView({ query, results, at = 0, w = 1200 }: { query: string; results: { title: string; url: string; snippet: string }[]; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const typed = clamp01((t - at) * 16 / Math.max(1, query.length)), n = Math.floor(typed * query.length), done = at + query.length / 16 + 0.4;
  return (
    <div style={{ width: w, fontFamily: family("inter") }}>
      <div style={{ height: 90, borderRadius: 45, background: "#fff", boxShadow: "0 4px 14px rgb(0 0 0/0.15)", display: "flex", alignItems: "center", padding: "0 40px", fontSize: 34, gap: 20 }}>🔍 {query.slice(0, n)}<span style={{ opacity: Math.floor(t * 2.5) % 2 ? 0 : 1, color: theme.accent }}>|</span></div>
      {results.map((r, i) => { const k = ease.out(clamp01((t - done - i * 0.3) / 0.4)); return <div key={i} style={{ marginTop: 30, opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}><div style={{ fontSize: 22, color: "#3a6a3a" }}>{r.url}</div><div style={{ fontSize: 36, color: "#1a0dab" }}>{r.title}</div><div style={{ fontSize: 26, color: "#4d5156" }}>{r.snippet}</div></div>; })}
    </div>
  );
}
export const SearchResults = block("SearchResults", SearchResultsView);
/** a terminal window: commands typed after a prompt and their output lines (hacking, coding, a server) */
function TerminalView({ lines, at = 0, per = 0.7, w = 1300, h = 700, title = "bash" }: { lines: { cmd?: string; out?: string }[]; at?: number; per?: number; w?: number; h?: number; title?: string }) {
  const { t } = useScene();
  return (
    <div style={{ width: w, height: h, borderRadius: 16, background: "#0c0f14", overflow: "hidden", boxShadow: "0 30px 60px rgb(0 0 0/0.4)", fontFamily: "'Courier New', monospace", fontSize: 32 }}>
      <div style={{ height: 50, background: "#1c2128", color: "var(--metal, #8a939d)", display: "flex", alignItems: "center", padding: "0 20px", gap: 10, fontSize: 22 }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}<span style={{ marginLeft: 20 }}>{title}</span></div>
      <div style={{ padding: 26, color: "#d6dde6", lineHeight: 1.5 }}>{lines.map((l, i) => { const s = t - at - i * per; if (s < 0) return null; const c = l.cmd ?? ""; const n = Math.floor(clamp01((s * 22) / Math.max(1, c.length)) * c.length); return <div key={i}>{l.cmd !== undefined && <div><span style={{ color: "var(--signal, #3ff28a)" }}>$ </span>{c.slice(0, n)}</div>}{l.out && n >= c.length && <div style={{ color: "#8ab4f8", whiteSpace: "pre-wrap" }}>{l.out}</div>}</div>; })}<span style={{ opacity: Math.floor(t * 2) % 2 ? 0 : 1, color: "var(--signal, #3ff28a)" }}>█</span></div>
    </div>
  );
}
export const Terminal = block("Terminal", TerminalView);
/** a dashboard: number cards and small sparklines that update (a company's metrics, live results, a control room) */
function DashboardView({ cards, at = 0, w = 1600 }: { cards: { label: string; value: number; unit?: string; trend?: number[] }[]; at?: number; w?: number }) {
  const { t, theme } = useScene();
  return (
    <div style={{ width: w, display: "grid", gridTemplateColumns: `repeat(${Math.min(4, cards.length)}, 1fr)`, gap: 24, fontFamily: family(theme.font) }}>
      {cards.map((c, i) => { const k = ease.out(clamp01((t - at - i * 0.15) / 0.8)), tr = c.trend ?? Array.from({ length: 10 }, (_, j) => 0.4 + rand(i * 10 + j) * 0.6), max = Math.max(...tr); return <Part name="card" key={i} item={c} i={i}><div style={{ background: theme.paper ?? "#fff", borderRadius: 20, padding: 28, boxShadow: shadow, opacity: clamp01(k * 2) }}>
       <div style={{ fontSize: 26, color: theme.muted }}>{c.label}</div>
        <div style={{ fontFamily: family(theme.display), fontSize: 64, fontWeight: 800, color: theme.ink }}>{num(c.value * k, c.value < 10 ? 1 : 0)}{c.unit}</div>
        <svg width="100%" height={70} viewBox="0 0 100 30" preserveAspectRatio="none"><path d={"M" + tr.map((v, j) => `${(j / (tr.length - 1)) * 100 * k} ${30 - (v / max) * 28}`).join(" L")} fill="none" stroke={tr[tr.length - 1] >= tr[0] ? "var(--good, #3fb35a)" : "var(--bad, #e0453a)"} strokeWidth={2.5} /></svg>
      </div></Part>; })}
    </div>
  );
}
export const Dashboard = block("Dashboard", DashboardView);
/** a friendly robot that blinks, waves its arm and has a screen face (AI, automation, a helper) */
function RobotView({ size = 420, at = 0, talks = false, color }: { size?: number; at?: number; talks?: boolean; color?: string }) {
  const { t, theme, b } = useIn(at, 0.6);
  const blink = (t % 3) < 0.12, wave = Math.sin(t * 6) * 25, C = color ?? "#c8d2dc";
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" style={{ transform: `scale(${b}) translateY(${Math.sin(t * 2) * 2}px)` }}>
      <line x1={50} y1={4} x2={50} y2={14} stroke="#888" strokeWidth={3} /><circle cx={50} cy={4} r={4} fill={theme.accent} opacity={0.6 + Math.sin(t * 6) * 0.4} />
      <SvgPart name="head" x={24} y={14} w={52} h={40} item={{ talks, blink }}><rect x={24} y={14} width={52} height={40} rx={12} fill={C} /><rect x={30} y={20} width={40} height={28} rx={8} fill="#1a2a3a" />
      {blink ? <><rect x={36} y={32} width={10} height={3} fill="var(--screen, #4ae0ff)" /><rect x={54} y={32} width={10} height={3} fill="var(--screen, #4ae0ff)" /></> : <><circle cx={41} cy={32} r={5} fill="var(--screen, #4ae0ff)" /><circle cx={59} cy={32} r={5} fill="var(--screen, #4ae0ff)" /></>}
      <rect x={42} y={42} width={16} height={talks ? 2 + Math.abs(Math.sin(t * 12)) * 4 : 2} rx={1} fill="var(--screen, #4ae0ff)" /></SvgPart>
      <SvgPart name="body" x={28} y={58} w={44} h={40}><rect x={28} y={58} width={44} height={40} rx={10} fill={C} /><circle cx={50} cy={74} r={8} fill={theme.accent} /></SvgPart>
      <g transform={`rotate(${-wave - 30} 74 64)`}><rect x={72} y={62} width={8} height={30} rx={4} fill={C} /></g><rect x={20} y={62} width={8} height={30} rx={4} fill={C} />
      <rect x={34} y={98} width={10} height={18} rx={4} fill={C} /><rect x={56} y={98} width={10} height={18} rx={4} fill={C} />
    </svg>
  );
}
export const Robot = block("Robot", RobotView);
/** a database (stacked cylinders) with records flowing in and lighting it up (storage, data, a backend) */
function DatabaseView({ size = 300, at = 0, color }: { size?: number; at?: number; color?: string }) {
  const { t, theme, b } = useIn(at, 0.5);
  const C = color ?? theme.accent2;
  return <svg width={size} height={size * 1.2} viewBox="0 0 100 120" style={{ transform: `scale(${b})` }}>{[0, 1, 2].map((i) => { const y = 80 - i * 30, glow = Math.max(0, Math.sin(t * 3 - i)); return <g key={i}><path d={`M10 ${y} L10 ${y + 22} A40 10 0 0 0 90 ${y + 22} L90 ${y}`} fill={C} /><ellipse cx={50} cy={y} rx={40} ry={10} fill={C} stroke="#fff" strokeWidth={2} /><circle cx={78} cy={y + 14} r={3} fill="var(--signal, #3ff28a)" opacity={glow} /></g>; })}</svg>;
}
export const Database = block("Database", DatabaseView);
/** a shield with a padlock that snaps shut (security, privacy, protection); `broken` cracks it instead (a breach) */
function SecurityShieldView({ size = 320, at = 0, broken = false }: { size?: number; at?: number; broken?: boolean }) {
  const { t, b } = useIn(at, 0.5);
  const lock = ease.back(clamp01((t - at - 0.5) / 0.3)), crack = broken ? ease.out(clamp01((t - at - 0.8) / 0.4)) : 0;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" style={{ transform: `scale(${b})`, filter: broken ? undefined : `drop-shadow(0 0 ${lock * 18}px var(--good, #3fb35a))` }}>
      <SvgPart name="shield" x={10} y={4} w={80} h={106}><path d="M50 4 L90 18 Q92 70 50 110 Q8 70 10 18 Z" fill={broken ? "color-mix(in srgb, var(--bad, #e0453a) 85%, #000)" : "color-mix(in srgb, var(--grass, #5a9a3a) 83%, #000)"} /></SvgPart>
      <rect x={34} y={54} width={32} height={26} rx={4} fill="#fff" /><path d={`M40 54 L40 ${44 - (1 - lock) * 8} A10 10 0 0 1 60 ${44 - (1 - lock) * 8} L60 54`} fill="none" stroke="#fff" strokeWidth={6} />
      {broken && <path d="M50 4 L46 30 L56 46 L44 70 L54 90 L50 110" fill="none" stroke="#111" strokeWidth={4} pathLength={1} strokeDasharray={`${crack} 2`} />}
    </svg>
  );
}
export const SecurityShield = block("SecurityShield", SecurityShieldView);
/** a video call grid: tiles of people (initials or photos), the one who speaks gets a lit border (a meeting, a class) */
function VideoCallView({ people, speaker = 0, at = 0, w = 1500, h = 840 }: { people: { name: string; image?: string; color?: string }[]; speaker?: number; at?: number; w?: number; h?: number }) {
  const { t, theme } = useScene();
  const cols = Math.ceil(Math.sqrt(people.length)), rows = Math.ceil(people.length / cols), tw = w / cols - 16, th = h / rows - 16;
  return (
    <div style={{ width: w, height: h, display: "flex", flexWrap: "wrap", gap: 16, background: "#1a1d22", padding: 8, borderRadius: 20, boxSizing: "border-box", fontFamily: family("inter") }}>
      {people.map((p, i) => { const k = ease.out(clamp01((t - at - i * 0.12) / 0.4)), on = i === speaker; return <Part name="tile" key={i} item={p} i={i}><div style={{ width: tw, height: th, borderRadius: 14, background: p.color ?? ["#3a4a6a", "#5a3a4a", "#3a5a4a", "#5a4a3a"][i % 4], position: "relative", overflow: "hidden", outline: on ? `6px solid ${theme.accent}` : undefined, opacity: k, display: "grid", placeItems: "center" }}>
       {p.image ? <Img src={src(p.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: th * 0.45, height: th * 0.45, borderRadius: "50%", background: "var(--metal, #8a939d)", color: "#fff", fontSize: th * 0.18, fontWeight: 800, display: "grid", placeItems: "center", transform: on ? `scale(${1 + Math.abs(Math.sin(t * 8)) * 0.04})` : undefined }}>{p.name.split(" ").map((x) => x[0]).join("")}</div>}
        <div style={{ position: "absolute", left: 14, bottom: 12, background: "rgb(0 0 0/0.55)", color: "#fff", fontSize: 22, padding: "4px 12px", borderRadius: 8 }}>{on ? "🎙 " : "🔇 "}{p.name}</div>
      </div></Part>; })}
    </div>
  );
}
export const VideoCall = block("VideoCall", VideoCallView);
/** an email arriving: from, subject and the opening lines, with an unread dot (news, a job offer, a scam warning) */
function EmailCardView({ from, subject, body, at = 0, w = 1100, flag }: { from: string; subject: string; body: string; at?: number; w?: number; flag?: "spam" | "important" }) {
  const { t, theme, u } = useIn(at, 0.5);
  return (
    <div style={{ width: w, background: "#fff", borderRadius: 20, padding: "30px 40px", boxShadow: shadow, fontFamily: family("inter"), transform: `translateY(${(1 - u) * -120}px)`, opacity: u, boxSizing: "border-box", borderLeft: flag === "spam" ? "12px solid var(--bad, #e0453a)" : flag === "important" ? `12px solid ${theme.accent2}` : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}><div style={{ width: 70, height: 70, borderRadius: 35, background: theme.accent, color: "#fff", fontSize: 32, fontWeight: 800, display: "grid", placeItems: "center" }}>{from[0]}</div><div style={{ flex: 1 }}><div style={{ fontSize: 30, fontWeight: 800 }}>{from}</div><div style={{ fontSize: 34, color: "#222" }}>{subject}</div></div>{flag && <div style={{ background: flag === "spam" ? "var(--bad, #e0453a)" : theme.accent2, color: "#fff", fontSize: 22, fontWeight: 800, padding: "6px 14px", borderRadius: 8 }}>{flag.toUpperCase()}</div>}<div style={{ width: 18, height: 18, borderRadius: 9, background: "#4a8ae0" }} /></div>
      <div style={{ fontSize: 28, color: "#555", marginTop: 18, lineHeight: 1.4 }}>{body}</div>
    </div>
  );
}
export const EmailCard = block("EmailCard", EmailCardView);

/* ================= DOCUMENTS and NEWS ================= */
/** a breaking-news bar with a red label and a ticker of headlines scrolling along the bottom of the frame */
function NewsTickerView({ label = "BREAKING", items, at = 0, speed = 180 }: { label?: string; items: string[]; at?: number; speed?: number }) {
  const { t, W, H } = useScene();
  const k = ease.out(clamp01((t - at) / 0.5)), text = items.join("   •   "), x = W - (t - at) * speed;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: H - 130, height: 90, transform: `translateY(${(1 - k) * 140}px)`, display: "flex", fontFamily: family("oswald"), overflow: "hidden" }}>
      <div style={{ background: "#c8102e", color: "#fff", fontSize: 46, fontWeight: 700, padding: "0 34px", display: "grid", placeItems: "center", zIndex: 2, letterSpacing: 2 }}>{label}</div>
      <div style={{ flex: 1, background: "#111", color: "#fff", fontSize: 44, position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", left: x, top: 18, whiteSpace: "nowrap" }}>{text}   •   {text}</div></div>
    </div>
  );
}
export const NewsTicker = block("NewsTicker", NewsTickerView);
/** an old television set showing whatever is inside, with scan lines and a power-on flicker (archive news, the 80s) */
export function TvFrame({ children, at = 0, w = 1200, retro = true }: { children: ReactNode; at?: number; w?: number; retro?: boolean }) {
  const { t } = useScene();
  const on = ease.out(clamp01((t - at) / 0.5)), h = w * 0.72;
  return (
    <div style={{ width: w, height: h, borderRadius: retro ? 60 : 20, background: retro ? "linear-gradient(color-mix(in srgb, var(--wood, #8a5a2a) 95%, #000), #4a3420)" : "#111", padding: retro ? 60 : 20, boxSizing: "border-box", boxShadow: "0 30px 60px rgb(0 0 0/0.4)", position: "relative" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: retro ? "40px / 30px" : 8, overflow: "hidden", position: "relative", background: "#000" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scaleY(${on})`, filter: retro ? "saturate(0.7) contrast(1.1)" : undefined }}>{children}</div>
        {retro && <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgb(0 0 0/0.25) 0 2px, transparent 2px 5px)", pointerEvents: "none" }} />}
        {retro && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse, transparent 60%, rgb(0 0 0/0.6))" }} />}
      </div>
    </div>
  );
}
/** a polaroid photo that drops onto the table, with a handwritten caption */
function PolaroidView({ image, caption, at = 0, w = 460, tilt = -4 }: { image: string; caption?: string; at?: number; w?: number; tilt?: number }) {
  const { t } = useScene();
  const k = ease.out(clamp01((t - at) / 0.6)), dev = clamp01((t - at - 0.4) / 1.6);
  return (
    <div style={{ width: w, background: "#fdfdf8", padding: `${w * 0.05}px ${w * 0.05}px ${w * 0.2}px`, boxShadow: "0 18px 34px rgb(0 0 0/0.3)", transform: `translateY(${(1 - k) * -200}px) rotate(${tilt + (1 - k) * 20}deg) scale(${1.2 - 0.2 * k})`, opacity: clamp01(k * 3), position: "relative" }}>
      <Part name="photo"><Img src={src(image)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", filter: `brightness(${0.3 + dev * 0.7}) saturate(${dev})` }} /></Part>
      {caption && <div style={{ position: "absolute", left: 0, right: 0, bottom: w * 0.05, textAlign: "center", fontFamily: family("caveat"), fontSize: w * 0.09, color: "#333" }}>{caption}</div>}
    </div>
  );
}
export const Polaroid = block("Polaroid", PolaroidView);
/** a photo album: pages of photos turn one after another (a life, a family, memories) */
function PhotoAlbumView({ images, captions = [], at = 0, per = 1.6, w = 1300 }: { images: string[]; captions?: string[]; at?: number; per?: number; w?: number }) {
  const { t } = useScene();
  const h = w * 0.62, pages = Math.ceil(images.length / 2), n = clamp01((t - at) / (per * Math.max(1, pages - 1))) * (pages - 1), i = Math.floor(n), f = ease.inOut(n - i);
  const side = (p: number, s: 0 | 1, style?: CSSProperties) => { const img = images[p * 2 + s]; return <div style={{ position: "absolute", top: 0, width: w / 2, height: h, left: s ? w / 2 : 0, background: "color-mix(in srgb, var(--wood, #8a5a2a) 45%, #000)", padding: 40, boxSizing: "border-box", ...style }}>{img && <div style={{ background: "#fff", padding: 14, transform: `rotate(${s ? 2 : -2}deg)` }}><Part name="photo" item={img} i={i}><Img src={src(img)} style={{ width: "100%", height: h * 0.62, objectFit: "cover" }} /></Part><div style={{ fontFamily: family("caveat"), fontSize: 40, textAlign: "center", color: "#333" }}>{captions[p * 2 + s] ?? ""}</div></div>}</div>; };
  return (
    <div style={{ position: "relative", width: w, height: h, boxShadow: "0 30px 60px rgb(0 0 0/0.4)", perspective: 2600 }}>
      {side(Math.min(pages - 1, i + 1), 0)}{side(Math.min(pages - 1, i + 1), 1)}
      {side(i, 0)}
      {i < pages - 1 && side(i, 1, { transformOrigin: "0% 50%", transform: `rotateY(${-f * 180}deg)`, backfaceVisibility: "hidden" })}
      <div style={{ position: "absolute", left: w / 2 - 4, top: 0, width: 8, height: h, background: "#1a120c" }} />
    </div>
  );
}
export const PhotoAlbum = block("PhotoAlbum", PhotoAlbumView);
/** sticky notes slap onto a wall one after another, slightly crooked, with handwritten points (ideas, a plan, a to-do) */
function StickyNotesView({ notes, at = 0, per = 0.5, cols = 4, size = 300 }: { notes: string[]; at?: number; per?: number; cols?: number; size?: number }) {
  const { t } = useScene();
  const cs = ["#fff176", "#ffab91", "#a5d6a7", "#90caf9", "#ce93d8"];
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: 30 }}>{notes.map((n, i) => { const k = ease.back(clamp01((t - at - i * per) / 0.35)); return <Part name="note" key={i} i={i}><div style={{ width: size, height: size, background: cs[i % cs.length], padding: 28, boxSizing: "border-box", fontFamily: family("caveat"), fontSize: size * 0.14, lineHeight: 1.15, color: "#222", boxShadow: "0 12px 20px rgb(0 0 0/0.2)", transform: `rotate(${(rand(i) - 0.5) * 8}deg) scale(${k})`, opacity: k > 0 ? 1 : 0, clipPath: "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)" }}>{n}</div></Part>; })}</div>;
}
export const StickyNotes = block("StickyNotes", StickyNotesView);
/** an evidence board: photos and notes pinned to cork, red string drawn between them one link at a time (a mystery, a case) */
function CorkBoardView({ items, links, at = 0, w = 1700, h = 900 }: { items: { x: number; y: number; image?: string; text?: string }[]; links: [number, number][]; at?: number; w?: number; h?: number }) {
  const { t } = useScene();
  return (
    <div style={{ position: "relative", width: w, height: h, background: "radial-gradient(circle, #c8955a, #a8753a)", border: "24px solid color-mix(in srgb, var(--wood, #8a5a2a) 77%, #000)", borderRadius: 10, boxSizing: "border-box" }}>
      {items.map((it, i) => { const k = ease.out(clamp01((t - at - i * 0.25) / 0.4)); return <div key={i} style={{ position: "absolute", left: it.x * w, top: it.y * h, transform: `translate(-50%,-50%) rotate(${(rand(i) - 0.5) * 10}deg) scale(${k})`, background: "#fff", padding: 10, boxShadow: "0 8px 16px rgb(0 0 0/0.35)", width: it.image ? 240 : 220 }}>
        {it.image && <Part name="photo" item={it} i={i}><Img src={src(it.image)} style={{ width: "100%", height: 180, objectFit: "cover", filter: "grayscale(0.4)" }} /></Part>}
        {it.text && <div style={{ fontFamily: family("caveat"), fontSize: 36, color: "#222", padding: 6 }}>{it.text}</div>}
        <div style={{ position: "absolute", left: "50%", top: -12, width: 24, height: 24, borderRadius: 12, background: "#c8102e", transform: "translateX(-50%)", boxShadow: "0 3px 4px rgb(0 0 0/0.4)" }} />
      </div>; })}
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>{links.map(([a, b2], i) => { const k = ease.inOut(clamp01((t - at - items.length * 0.25 - i * 0.5) / 0.6)), A = items[a], B = items[b2]; if (!A || !B) return null; const x1 = A.x * w, y1 = A.y * h - 80, x2 = B.x * w, y2 = B.y * h - 80; return <path key={i} d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + 40} ${x2} ${y2}`} fill="none" stroke="#c8102e" strokeWidth={5} pathLength={1} strokeDasharray={`${k} 2`} />; })}</svg>
    </div>
  );
}
export const CorkBoard = block("CorkBoard", CorkBoardView);
/** a case file folder: it opens to show a mugshot-style photo, fields and a CONFIDENTIAL stamp (crime, spies, a dossier) */
function CaseFileView({ title = "CASE #1947", image, fields, at = 0, w = 1200 }: { title?: string; image?: string; fields: [string, string][]; at?: number; w?: number }) {
  const { t } = useScene();
  const open = ease.inOut(clamp01((t - at) / 0.8)), stamp = ease.back(clamp01((t - at - 1.6) / 0.3));
  return (
    <div style={{ position: "relative", width: w, height: w * 0.62, perspective: 2400, fontFamily: "'Courier New', monospace" }}>
      <div style={{ position: "absolute", inset: 0, background: "#f4ecd8", borderRadius: 10, padding: 40, boxSizing: "border-box", display: "flex", gap: 40, boxShadow: shadow }}>
        {image && <Part name="photo"><Img src={src(image)} style={{ width: w * 0.28, height: w * 0.36, objectFit: "cover", filter: "grayscale(1) contrast(1.2)", border: "8px solid #fff" }} /></Part>}
        <div style={{ flex: 1, fontSize: 30, color: "#222", lineHeight: 1.7 }}>{fields.map(([k, v], i) => <div key={i} style={{ opacity: clamp01((t - at - 0.8 - i * 0.2) / 0.3) }}><b>{k}:</b> {v}</div>)}</div>
        {stamp > 0 && <div style={{ position: "absolute", right: 60, bottom: 60, color: "#c8102e", border: "8px solid #c8102e", fontSize: 60, fontWeight: 900, padding: "4px 20px", transform: `rotate(-12deg) scale(${2 - stamp})`, opacity: stamp }}>CONFIDENTIAL</div>}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#d4a85a, #c8984a)", borderRadius: 10, transformOrigin: "0% 50%", transform: `rotateY(${-open * 170}deg)`, display: "grid", placeItems: "center", fontSize: 70, fontWeight: 900, color: "color-mix(in srgb, var(--wood, #8a5a2a) 65%, #000)", backfaceVisibility: "hidden" }}>{title}</div>
    </div>
  );
}
export const CaseFile = block("CaseFile", CaseFileView);
/** an identity card or passport page: photo, name, number, a stamp (identity, citizenship, a visa) */
function IdCardView({ kind = "id", name, number, image, country = "INDIA", at = 0, w = 860 }: { kind?: "id" | "passport"; name: string; number: string; image?: string; country?: string; at?: number; w?: number }) {
  const { theme, u } = useIn(at, 0.6);
  const pass = kind === "passport";
  return (
    <div style={{ width: w, height: w * 0.62, borderRadius: 24, background: pass ? "#f4efe0" : `linear-gradient(135deg, #eaf2fb, #cfe0f4)`, padding: 34, boxSizing: "border-box", boxShadow: shadow, display: "flex", gap: 30, fontFamily: family("inter"), transform: `translateY(${(1 - u) * 60}px) rotate(${(1 - u) * -6}deg)`, opacity: u, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 70, background: pass ? "#1a3a6a" : theme.accent, color: "#fff", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", padding: "0 34px", letterSpacing: 3 }}>{pass ? `PASSPORT · ${country}` : `${country} · IDENTITY CARD`}</div>
      <div style={{ marginTop: 80, width: w * 0.26, height: w * 0.32, background: "#ccc", borderRadius: 8, overflow: "hidden" }}>{image && <Part name="photo"><Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></Part>}</div>
      <div style={{ marginTop: 90, fontSize: 30, color: "#333", lineHeight: 1.7 }}><div style={{ fontSize: 22, color: "#777" }}>Name</div><div style={{ fontWeight: 800, fontSize: 38 }}>{name}</div><div style={{ fontSize: 22, color: "#777", marginTop: 10 }}>Number</div><div style={{ fontFamily: "monospace", fontSize: 36, letterSpacing: 4 }}>{number}</div></div>
    </div>
  );
}
export const IdCard = block("IdCard", IdCardView);
/** a certificate with a border, a title, a name written in, a gold seal and signatures (an award, a degree) */
function CertificateView({ title = "Certificate of Achievement", name, reason, at = 0, w = 1400 }: { title?: string; name: string; reason?: string; at?: number; w?: number }) {
  const { t } = useScene();
  const n = Math.floor(clamp01((t - at - 0.6) * 14 / Math.max(1, name.length)) * name.length), seal = ease.back(clamp01((t - at - 1.8) / 0.4));
  return (
    <div style={{ width: w, height: w * 0.68, background: "#fffdf4", border: "20px double #b8963a", boxSizing: "border-box", padding: 60, textAlign: "center", position: "relative", boxShadow: shadow, fontFamily: family("playfair") }}>
      <div style={{ fontSize: 70, color: "#5a4a1c", fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 30, color: "#888", marginTop: 20 }}>presented to</div>
      <div style={{ fontFamily: family("caveat"), fontSize: 110, color: "#1a2a6a", borderBottom: "3px solid #b8963a", display: "inline-block", minWidth: 600, marginTop: 10 }}>{name.slice(0, n)}&nbsp;</div>
      {reason && <div style={{ fontSize: 32, color: "#555", marginTop: 26 }}>{reason}</div>}
      <div style={{ position: "absolute", right: 90, bottom: 60, width: 170, height: 170, borderRadius: 85, background: "radial-gradient(#ffe08a, #c8961c)", transform: `scale(${seal}) rotate(${(1 - seal) * 90}deg)`, boxShadow: "0 8px 16px rgb(0 0 0/0.3)", display: "grid", placeItems: "center", color: "#7a5a0c", fontSize: 40, fontWeight: 900 }}>★</div>
    </div>
  );
}
export const Certificate = block("Certificate", CertificateView);
/** a ticket (train, plane, cinema, concert) with a perforated stub that tears off */
function TicketView({ kind = "train", from = "Delhi", to = "Mumbai", date = "24 Oct 2026", seat = "B4 · 32", at = 0, tear, w = 1100 }: { kind?: "train" | "plane" | "cinema"; from?: string; to?: string; date?: string; seat?: string; at?: number; tear?: number; w?: number }) {
  const { t, theme, u } = useIn(at, 0.5);
  const k = tear !== undefined ? ease.out(clamp01((t - tear) / 0.6)) : 0, icon = { train: "🚆", plane: "✈️", cinema: "🎬" }[kind];
  return (
    <div style={{ display: "flex", width: w, height: w * 0.36, fontFamily: family(theme.font), transform: `scale(${u})` }}>
      <div style={{ flex: 1, background: theme.paper ?? "#fff", borderRadius: "24px 0 0 24px", padding: 34, boxShadow: shadow, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ fontSize: 28, color: theme.muted }}>{icon} {kind.toUpperCase()} TICKET</div>
        <div style={{ fontFamily: family(theme.display), fontSize: 72, fontWeight: 800, color: theme.ink }}>{from} → {to}</div>
        <div style={{ fontSize: 30, color: theme.ink }}>{date}</div>
      </div>
      <div style={{ width: w * 0.25, background: theme.accent, color: "#fff", borderRadius: "0 24px 24px 0", borderLeft: "6px dashed #fff", padding: 30, boxSizing: "border-box", display: "grid", placeItems: "center", textAlign: "center", fontSize: 40, fontWeight: 800, transform: `translate(${k * 120}px, ${k * 60}px) rotate(${k * 16}deg)`, boxShadow: shadow }}>{seat}</div>
    </div>
  );
}
export const Ticket = block("Ticket", TicketView);
/** a WANTED poster: an old paper with a photo, a name and a reward (outlaws, a hunt, a mystery) */
function WantedPosterView({ name, reward, image, at = 0, w = 700 }: { name: string; reward: string; image?: string; at?: number; w?: number }) {
  const { u, t } = useIn(at, 0.6);
  return (
    <div style={{ width: w, background: "radial-gradient(circle, #f4e3b5, #d8b97a)", padding: 40, boxSizing: "border-box", textAlign: "center", fontFamily: "Georgia, serif", color: "color-mix(in srgb, var(--wood, #8a5a2a) 41%, #000)", boxShadow: "0 20px 40px rgb(0 0 0/0.35)", transform: `rotate(${-3 + Math.sin(t) * 0.5}deg) scale(${u})`, clipPath: "polygon(1% 2%, 98% 0, 100% 97%, 3% 100%)" }}>
      <div style={{ fontSize: w * 0.2, fontWeight: 900, letterSpacing: 6 }}>WANTED</div>
      <div style={{ width: w * 0.7, height: w * 0.62, margin: "10px auto", background: "#8a6a4a", border: "6px solid color-mix(in srgb, var(--wood, #8a5a2a) 41%, #000)", overflow: "hidden" }}>{image && <Part name="photo"><Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(1) contrast(1.2)" }} /></Part>}</div>
      <div style={{ fontSize: w * 0.08, fontWeight: 700 }}>{name}</div>
      <div style={{ fontSize: w * 0.065, marginTop: 8 }}>REWARD {reward}</div>
    </div>
  );
}
export const WantedPoster = block("WantedPoster", WantedPosterView);

/* ================= MEDIA ================= */
/** a video player: a frame with a play button that is pressed, a progress bar that runs, the time counting */
export function VideoPlayer({ children, at = 0, play = 0.8, dur = 30, w = 1400 }: { children?: ReactNode; at?: number; play?: number; dur?: number; w?: number }) {
  const { t, theme } = useScene();
  const h = w * 0.5625, s = Math.max(0, t - at - play), on = t > at + play, sec = Math.min(dur, s);
  return (
    <div style={{ width: w, height: h + 60, background: "#000", borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 60px rgb(0 0 0/0.4)", fontFamily: family("inter") }}>
      <div style={{ position: "relative", height: h, overflow: "hidden" }}>{children}{!on && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgb(0 0 0/0.35)" }}><div style={{ width: 160, height: 110, borderRadius: 30, background: "#f00", display: "grid", placeItems: "center", transform: `scale(${t > at + play - 0.15 ? 0.9 : 1})` }}><div style={{ width: 0, height: 0, borderTop: "28px solid transparent", borderBottom: "28px solid transparent", borderLeft: "46px solid #fff", marginLeft: 10 }} /></div></div>}</div>
      <div style={{ height: 60, display: "flex", alignItems: "center", gap: 20, padding: "0 20px", color: "#fff", fontSize: 24 }}>{on ? "❚❚" : "▶"}<div style={{ flex: 1, height: 8, background: "#555", borderRadius: 4 }}><div style={{ width: `${(sec / dur) * 100}%`, height: "100%", background: theme.accent === "#fff" ? "#f00" : "#f00", borderRadius: 4 }} /></div>{`0:${String(Math.floor(sec)).padStart(2, "0")} / 0:${String(dur).padStart(2, "0")}`}</div>
    </div>
  );
}
/** a podcast microphone on a stand with a live sound wave and an ON AIR light (talk shows, interviews) */
function PodcastMicView({ size = 420, at = 0, live = true }: { size?: number; at?: number; live?: boolean }) {
  const { t, b } = useIn(at, 0.5);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, transform: `scale(${b})` }}>
      <Part name="mic"><svg width={size * 0.6} height={size} viewBox="0 0 60 100"><rect x={14} y={4} width={32} height={50} rx={16} fill="#2a2f3a" />{Array.from({ length: 6 }, (_, i) => <line key={i} x1={16} y1={14 + i * 6} x2={44} y2={14 + i * 6} stroke="#4a5060" strokeWidth={1.5} />)}<path d="M8 38 Q8 66 30 66 Q52 66 52 38" fill="none" stroke="var(--metal, #8a939d)" strokeWidth={4} /><rect x={28} y={66} width={4} height={24} fill="var(--metal, #8a939d)" /><rect x={14} y={90} width={32} height={6} rx={3} fill="var(--metal, #8a939d)" /></svg></Part>
      {live && <div style={{ fontFamily: "Arial", fontWeight: 900, fontSize: size * 0.12, color: "#fff", background: Math.floor(t * 1.5) % 2 ? "var(--bad, #e0453a)" : "#a02a20", padding: "10px 24px", borderRadius: 12 }}>● ON AIR</div>}
    </div>
  );
}
export const PodcastMic = block("PodcastMic", PodcastMicView);
/** a strip of film running past with pictures in its frames (cinema, memories, archive footage) */
function FilmStripView({ images, at = 0, speed = 120, h = 380, vertical = false }: { images: string[]; at?: number; speed?: number; h?: number; vertical?: boolean }) {
  const { t, W } = useScene();
  const fw = h * 1.3, s = Math.max(0, t - at) * speed, n = Math.ceil(W / fw) + 2;
  return (
    <div style={{ position: "relative", width: W, height: h, background: "#111", overflow: "hidden", transform: vertical ? "rotate(90deg)" : undefined }}>
      {[0, 1].map((r) => <div key={r} style={{ position: "absolute", left: 0, right: 0, [r ? "bottom" : "top"]: 10, height: 26, backgroundImage: "repeating-linear-gradient(90deg, #ddd 0 30px, transparent 30px 60px)", backgroundPositionX: -s }} />)}
      {Array.from({ length: n }, (_, i) => { const x = i * fw - (s % fw), idx = (i + Math.floor(s / fw)) % images.length; return <div key={i} style={{ position: "absolute", left: x + 14, top: 50, width: fw - 28, height: h - 100, overflow: "hidden", background: "#333" }}><Part name="frame" item={images[idx]} i={i}><Img src={src(images[idx])} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.3)" }} /></Part></div>; })}
    </div>
  );
}
export const FilmStrip = block("FilmStrip", FilmStripView);
/** a camera's viewfinder over the shot: corner marks, REC blinking, a timecode and the battery (found footage, a vlog) */
export function RecFrame({ children, at = 0 }: { children?: ReactNode; at?: number }) {
  const { t, W, H } = useScene();
  const s = Math.max(0, t - at), tc = `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}:${String(Math.floor((s * 30) % 30)).padStart(2, "0")}`;
  const corner = (x: number, y: number, r: number) => <div key={r} style={{ position: "absolute", left: x, top: y, width: 90, height: 90, borderLeft: "6px solid #fff", borderTop: "6px solid #fff", transform: `rotate(${r}deg)` }} />;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {children}
      <div style={{ position: "absolute", inset: 0, fontFamily: "monospace", color: "#fff", fontSize: 40, textShadow: "0 2px 4px #000" }}>
        {corner(50, 50, 0)}{corner(W - 140, 50, 90)}{corner(W - 140, H - 140, 180)}{corner(50, H - 140, 270)}
        <div style={{ position: "absolute", left: 90, top: 80, display: "flex", alignItems: "center", gap: 14 }}><span style={{ width: 28, height: 28, borderRadius: 14, background: "#f00", opacity: Math.floor(t * 2) % 2 ? 1 : 0.2 }} />REC</div>
        <div style={{ position: "absolute", right: 90, top: 80 }}>▮▮▮▯</div>
        <div style={{ position: "absolute", left: 90, bottom: 80 }}>{tc}</div>
        <div style={{ position: "absolute", left: W / 2 - 30, top: H / 2 - 30, width: 60, height: 60, border: "3px solid rgb(255 255 255/0.7)" }} />
      </div>
    </div>
  );
}
/** comic panels: a page of boxes that fill in one by one, each with its own picture or drawing and a caption */
function ComicPanelsView({ panels, at = 0, per = 0.8, w = 1700, h = 900 }: { panels: { node?: ReactNode; image?: string; caption?: string }[]; at?: number; per?: number; w?: number; h?: number }) {
  const { t } = useScene();
  const cols = panels.length <= 2 ? panels.length : panels.length <= 4 ? 2 : 3, rows = Math.ceil(panels.length / cols);
  return (
    <div style={{ width: w, height: h, background: "#fff", padding: 16, boxSizing: "border-box", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 16, boxShadow: shadow }}>
      {panels.map((p, i) => { const k = ease.out(clamp01((t - at - i * per) / 0.4)); return <div key={i} style={{ position: "relative", border: "8px solid #111", overflow: "hidden", background: "color-mix(in srgb, var(--wall, #e8e4dc) 55%, #fff)", opacity: k, transform: `scale(${0.9 + k * 0.1}) rotate(${(rand(i) - 0.5) * 1.5}deg)` }}>
        {p.image && <Part name="panel" item={p} i={i}><Img src={src(p.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /></Part>}{p.node}
        {p.caption && <div style={{ position: "absolute", left: 10, top: 10, background: "#ffe14a", border: "4px solid #111", padding: "6px 14px", fontFamily: family("permanent_marker"), fontSize: 28 }}>{p.caption}</div>}
      </div>; })}
    </div>
  );
}
export const ComicPanels = block("ComicPanels", ComicPanelsView);

/* ================= TEXT ================= */
/** a stat callout: a big number with a short line under it, popping in next to what it describes */
function StatCalloutView({ value, line, at = 0, color, align = "left" }: { value: string; line: string; at?: number; color?: string; align?: "left" | "center" }) {
  const { theme, b, u } = useIn(at, 0.5);
  return <div style={{ textAlign: align, fontFamily: family(theme.display), transform: `scale(${b})`, transformOrigin: align === "left" ? "0% 50%" : "50% 50%" }}><div style={{ fontSize: 150, fontWeight: 800, color: color ?? theme.accent, lineHeight: 1 }}>{value}</div><div style={{ fontFamily: family(theme.font), fontSize: 42, color: theme.ink, maxWidth: 700, opacity: u, marginTop: 10 }}>{line}</div></div>;
}
export const StatCallout = block("StatCallout", StatCalloutView);
/** a small source line in the corner (where a number or a photo comes from): honest documentaries show it */
function SourceNoteView({ text, at = 0, corner = "br" }: { text: string; at?: number; corner?: "bl" | "br" }) {
  const { theme, u } = useIn(at, 0.4);
  return <div style={{ position: "absolute", bottom: 30, [corner === "bl" ? "left" : "right"]: 40, fontFamily: family(theme.font), fontSize: 22, color: theme.muted, background: "rgb(255 255 255/0.7)", padding: "6px 14px", borderRadius: 8, opacity: u }}>Source: {text}</div>;
}
export const SourceNote = block("SourceNote", SourceNoteView);
/** a chapter progress bar across the top: the film's chapters with the current one lit (where we are in the story) */
function ChapterProgressView({ chapters, current, at = 0 }: { chapters: string[]; current: number; at?: number }) {
  const { theme, W, u } = useIn(at, 0.5);
  return <div style={{ position: "absolute", left: 60, right: 60, top: 30, display: "flex", gap: 10, fontFamily: family(theme.font), opacity: u, width: W - 120 }}>{chapters.map((c, i) => <div key={i} style={{ flex: 1 }}><div style={{ height: 10, borderRadius: 5, background: i < current ? theme.accent : i === current ? `linear-gradient(90deg, ${theme.accent} ${u * 100}%, rgb(0 0 0/0.12) ${u * 100}%)` : "rgb(0 0 0/0.12)" }} /><div style={{ fontSize: 22, marginTop: 8, color: i === current ? theme.ink : theme.muted, fontWeight: i === current ? 800 : 400 }}>{c}</div></div>)}</div>;
}
export const ChapterProgress = block("ChapterProgress", ChapterProgressView);
/** an end card: thanks, the channel name, a subscribe button that is pressed, and two "watch next" boxes */
function EndCardView({ channel = "Drishyya", line = "Thanks for watching", next = ["Next video", "Playlist"], at = 0 }: { channel?: string; line?: string; next?: string[]; at?: number }) {
  const { t, theme, W, H } = useScene();
  const k = (i: number) => ease.back(clamp01((t - at - i * 0.25) / 0.5)), pressed = t > at + 1.6, bell = pressed ? Math.sin((t - at - 1.6) * 20) * 15 * Math.exp(-(t - at - 1.6) * 3) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: family(theme.display), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ fontSize: 80, fontWeight: 800, color: theme.ink, transform: `scale(${k(0)})` }}>{line}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 30, transform: `scale(${k(1)})` }}><div style={{ width: 130, height: 130, borderRadius: 65, background: theme.accent, color: "#fff", fontSize: 64, fontWeight: 800, display: "grid", placeItems: "center" }}>{channel[0]}</div><div style={{ fontSize: 60, fontWeight: 800, color: theme.ink }}>{channel}</div><div style={{ background: pressed ? "#909090" : "#e00", color: "#fff", fontSize: 40, fontWeight: 800, padding: "18px 40px", borderRadius: 50, fontFamily: family("inter") }}>{pressed ? "SUBSCRIBED" : "SUBSCRIBE"}</div><div style={{ fontSize: 60, transform: `rotate(${bell}deg)` }}>🔔</div></div>
      <div style={{ display: "flex", gap: 40, marginTop: 30 }}>{next.map((n, i) => <Part name="tile" key={i} i={i}><div style={{ width: W * 0.26, height: H * 0.26, borderRadius: 20, background: "rgb(0 0 0/0.12)", border: `5px solid ${theme.ink}`, display: "grid", placeItems: "center", fontSize: 40, fontWeight: 800, color: theme.ink, transform: `scale(${k(2 + i)})` }}>{n}</div></Part>)}</div>
    </div>
  );
}
export const EndCard = block("EndCard", EndCardView);
/** credits rolling up the screen: roles and names (the end of a film, thanks to sources) */
function CreditsRollView({ credits, at = 0, speed = 90 }: { credits: [string, string][]; at?: number; speed?: number }) {
  const { t, theme, H } = useScene();
  const y = H - Math.max(0, t - at) * speed;
  return <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: family(theme.font), color: theme.ink }}>{credits.map(([r, n], i) => <div key={i} style={{ marginBottom: 46 }}><div style={{ fontSize: 30, color: theme.muted, letterSpacing: 4, textTransform: "uppercase" }}>{r}</div><div style={{ fontFamily: family(theme.display), fontSize: 56, fontWeight: 800 }}>{n}</div></div>)}</div>;
}
export const CreditsRoll = block("CreditsRoll", CreditsRollView);

/* ================= BACKGROUNDS ================= */
/** a full-screen backdrop texture: chalkboard, blueprint grid, sepia paper, neon night, soft bokeh lights, graph paper, dark noir */
function BackdropView({ kind }: { kind: "chalkboard" | "blueprint" | "sepia" | "neon" | "bokeh" | "graph" | "noir" | "paper" }) {
  const { t, W, H } = useScene();
  const base: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
  if (kind === "chalkboard") return <div style={{ ...base, background: "radial-gradient(circle at 40% 30%, #3a6a4a, #1e3a28)" }}><svg style={{ ...base }} width="100%" height="100%"><filter id="chalkdust"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.12 0" /></filter><rect width="100%" height="100%" filter="url(#chalkdust)" /></svg></div>;
  if (kind === "blueprint") return <div style={{ ...base, background: "#1d4e8a", backgroundImage: "linear-gradient(rgb(255 255 255/0.12) 2px, transparent 2px), linear-gradient(90deg, rgb(255 255 255/0.12) 2px, transparent 2px), linear-gradient(rgb(255 255 255/0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255/0.05) 1px, transparent 1px)", backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px" }} />;
  if (kind === "sepia") return <div style={{ ...base, background: "radial-gradient(circle, #f1e2c0, #c9a86a)" }}><div style={{ ...base, boxShadow: "inset 0 0 200px rgb(90 50 10/0.6)" }} /></div>;
  if (kind === "neon") return <div style={{ ...base, background: "linear-gradient(#0a0420, #20083a)" }}><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.45, backgroundImage: "linear-gradient(#ff2ad4 2px, transparent 2px), linear-gradient(90deg, #ff2ad4 2px, transparent 2px)", backgroundSize: "120px 60px", transform: "perspective(500px) rotateX(60deg)", transformOrigin: "50% 100%", backgroundPositionY: (t * 60) % 60, opacity: 0.7 }} /><div style={{ position: "absolute", left: W / 2 - 220, top: H * 0.15, width: 440, height: 440, borderRadius: "50%", background: "linear-gradient(#ffd84a, #ff2a8a)", clipPath: "polygon(0 0, 100% 0, 100% 55%, 0 55%, 0 62%, 100% 62%, 100% 68%, 0 68%, 0 74%, 100% 74%, 100% 78%, 0 78%)" }} /></div>;
  if (kind === "bokeh") return <div style={{ ...base, background: "linear-gradient(#1a2440, #3a2a4a)" }}>{Array.from({ length: 24 }, (_, i) => <div key={i} style={{ position: "absolute", left: rand(i) * W + Math.sin(t * 0.3 + i) * 30, top: rand(i + 5) * H + Math.cos(t * 0.25 + i) * 20, width: 60 + rand(i + 2) * 160, height: 60 + rand(i + 2) * 160, borderRadius: "50%", background: ["#ffd27a", "#ff8a8a", "#8ad4ff", "#c8a0ff"][i % 4], opacity: 0.18 + rand(i + 3) * 0.2, filter: "blur(8px)" }} />)}</div>;
  if (kind === "graph") return <div style={{ ...base, background: "#fbfdfb", backgroundImage: "linear-gradient(#cfe6d4 1px, transparent 1px), linear-gradient(90deg, #cfe6d4 1px, transparent 1px)", backgroundSize: "40px 40px" }} />;
  if (kind === "noir") return <div style={{ ...base, background: "radial-gradient(circle at 60% 40%, #3a3a3a, #050505)" }}><div style={{ ...base, background: "repeating-linear-gradient(100deg, transparent 0 90px, rgb(0 0 0/0.5) 90px 140px)", transform: `translateX(${Math.sin(t * 0.2) * 20}px)` }} /></div>;
  return <div style={{ ...base, background: "#f4efe3", backgroundImage: "radial-gradient(rgb(0 0 0/0.05) 1px, transparent 1px)", backgroundSize: "6px 6px" }} />;
}
export const Backdrop = block("Backdrop", BackdropView);
