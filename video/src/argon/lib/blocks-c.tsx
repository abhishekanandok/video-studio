/* LAYER 2, part C: BLOCKS for DOCUMENTS, SCIENCE, TECH, OBJECTS, SETS and TEXT. */

import { Img } from "remotion";
import type { ReactNode } from "react";
import { clamp01, family, useScene } from "../kit";
import { curve, ease, rand } from "./motion";
import { shadow, src, useIn } from "./blocks-a";
import { Background, Part, SvgPart, block } from "./parts";

/* ================= DOCUMENTS ================= */
/** a newspaper spins in and lands, with the day's headline */
function HeadlineView({ paper = "THE DAILY CHRONICLE", date = "12 MARCH 1930", headline, sub, image, at = 0, w = 900 }: { paper?: string; date?: string; headline: string; sub?: string; image?: string; at?: number; w?: number }) {
  const { u } = useIn(at, 1);
  return (
    <div style={{ width: w, background: "#f1ead8", padding: 34, boxShadow: "0 20px 50px rgb(0 0 0/0.35)", transform: `rotate(${(1 - u) * 720 - 3}deg) scale(${0.1 + 0.9 * u})`, fontFamily: family("playfair"), color: "#1b1b1b", backgroundImage: "radial-gradient(rgb(0 0 0/0.05) 1px, transparent 1px)", backgroundSize: "6px 6px" }}>
      <div style={{ textAlign: "center", fontSize: 58, fontWeight: 800, borderBottom: "4px double #222", paddingBottom: 8 }}>{paper}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, padding: "6px 0", borderBottom: "2px solid #222", fontFamily: family("lora") }}><span>{date}</span><span>PRICE ONE ANNA</span></div>
      <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, margin: "18px 0 12px", textAlign: "center" }}>{headline}</div>
      {sub && <div style={{ fontSize: 26, fontStyle: "italic", textAlign: "center", fontFamily: family("lora") }}>{sub}</div>}
      <div style={{ display: "flex", gap: 20, marginTop: 18 }}>
        {image && <Part name="photo"><Img src={src(image)} style={{ width: "45%", height: 230, objectFit: "cover", filter: "grayscale(1) contrast(1.2)" }} /></Part>}
        <div style={{ flex: 1 }}>{Array.from({ length: 9 }, (_, i) => <div key={i} style={{ height: 10, margin: "12px 0", background: "#555", opacity: 0.35, width: `${80 + rand(i) * 20}%` }} />)}</div>
      </div>
    </div>
  );
}
export const Headline = block("Headline", HeadlineView);
/** an envelope opens and the letter rises out of it, its lines writing in */
function LetterView({ to = "My dear friend,", lines = 5, at = 0, w = 640 }: { to?: string; lines?: number; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const flap = ease.inOut(clamp01((t - at) / 0.7)), rise = ease.out(clamp01((t - at - 0.6) / 0.8)), write = clamp01((t - at - 1.3) / 1.6);
  const h = w * 0.62;
  return (
    <div style={{ position: "relative", width: w, height: h + 300 }}>
      <Part name="letter"><div style={{ position: "absolute", left: w * 0.06, bottom: h * 0.3 + rise * 260, width: w * 0.88, height: h * 1.1, background: "#fffdf6", boxShadow: shadow, padding: 30, boxSizing: "border-box", fontFamily: family("caveat"), color: theme.ink, zIndex: rise > 0.5 ? 3 : 1 }}>
        <div style={{ fontSize: 44, fontWeight: 700 }}>{to}</div>
        {Array.from({ length: lines }, (_, i) => <div key={i} style={{ height: 6, background: theme.ink, opacity: 0.55, margin: "26px 0", borderRadius: 3, width: `${clamp01(write * lines - i) * (70 + rand(i) * 28)}%` }} />)}
      </div></Part>
      <Part name="envelope"><div style={{ position: "absolute", left: 0, bottom: 0, width: w, height: h, background: "#e9d9b4", zIndex: 2, boxShadow: shadow, clipPath: "polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)" }} /></Part>
      <Part name="flap"><div style={{ position: "absolute", left: 0, bottom: 0, width: w, height: h, background: "#dcc89c", zIndex: flap > 0.5 ? 0 : 4, transformOrigin: "50% 0%", transform: `translateY(${-h}px) perspective(1200px) rotateX(${flap * 180}deg)`, clipPath: "polygon(0 0, 100% 0, 50% 55%)", marginBottom: 0, top: 0 }} /></Part>
    </div>
  );
}
export const Letter = block("Letter", LetterView);
/** old paper: the parchment unrolls and its writing fades up, aged at the edges */
function OldPaperView({ title, text, at = 0, w = 900 }: { title: string; text: string; at?: number; w?: number }) {
  const { t, u } = useIn(at, 1.2);
  const k = clamp01((t - at - 0.8) / 1.5);
  return (
    <div style={{ width: w, padding: "50px 60px", boxSizing: "border-box", background: "radial-gradient(ellipse at center, #f3e2b8 40%, #d6b77a 90%, #a9824a)", clipPath: `inset(0 0 ${(1 - u) * 100}% 0)`, fontFamily: family("playfair"), color: "#3b2a14", boxShadow: "0 20px 40px rgb(0 0 0/0.3)" }}>
      <div style={{ fontSize: 56, fontWeight: 800, textAlign: "center", opacity: k }}>{title}</div>
      <div style={{ fontSize: 32, lineHeight: 1.5, marginTop: 20, fontStyle: "italic", opacity: k, fontFamily: family("lora") }}>{text}</div>
    </div>
  );
}
export const OldPaper = block("OldPaper", OldPaperView);
/** a rubber stamp slams down on a page and leaves its ink */
function StampView({ text = "APPROVED", at = 0, color = "#c0392b", size = 120, angle = -14 }: { text?: string; at?: number; color?: string; size?: number; angle?: number }) {
  const { t } = useScene();
  const s = t - at;
  if (s < 0) return null;
  const k = s < 0.18 ? s / 0.18 : 1, sc = s < 0.18 ? 3 - 2 * k : 1 + 0.06 * Math.exp(-(s - 0.18) * 10);
  return <div style={{ display: "inline-block", border: `${size * 0.08}px solid ${color}`, borderRadius: size * 0.12, padding: `${size * 0.08}px ${size * 0.28}px`, color, fontFamily: family("oswald"), fontWeight: 700, fontSize: size, letterSpacing: size * 0.05, transform: `rotate(${angle}deg) scale(${sc})`, opacity: 0.88 * Math.min(1, k * 1.2), maskImage: "radial-gradient(circle at 30% 40%, #000 60%, rgb(0 0 0/0.6) 75%)", WebkitMaskImage: "radial-gradient(circle at 30% 40%, #000 60%, rgb(0 0 0/0.6) 75%)" }}>{text}</div>;
}
export const Stamp = block("Stamp", StampView);
/** a signature is signed by a pen, stroke by stroke */
function SignatureView({ name = "M. K. Gandhi", at = 0, dur = 1.8, size = 120, color = "#1a3c8c" }: { name?: string; at?: number; dur?: number; size?: number; color?: string }) {
  const { t } = useScene();
  const k = clamp01((t - at) / dur);
  const bw = Math.max(700, name.length * size * 0.62), pts: [number, number][] = Array.from({ length: 30 }, (_, i) => [i * (bw * 0.031), 40 + Math.sin(i * 1.3) * 24 + (rand(i) - 0.5) * 18]);
  return (
    <div style={{ position: "relative", width: bw, height: size * 1.4 }}>
      <div style={{ fontFamily: family("permanent_marker"), fontSize: size, color, clipPath: `inset(-30% ${(1 - k) * 100}% -30% 0)`, transform: "rotate(-6deg)", whiteSpace: "nowrap" }}>{name}</div>
      <svg style={{ position: "absolute", left: 0, top: size * 0.95, overflow: "visible" }} width={bw - 40} height={60}><path d={curve(pts).d} fill="none" stroke={color} strokeWidth={5} pathLength={1} strokeDasharray={`${clamp01(k * 1.4 - 0.4)} 2`} strokeLinecap="round" /></svg>
    </div>
  );
}
export const Signature = block("Signature", SignatureView);
/** a page of a document; one passage is highlighted and pulled out larger */
function DocHighlightView({ title = "REPORT", lines = 12, mark = 5, quote, at = 0, w = 760 }: { title?: string; lines?: number; mark?: number; quote: string; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at - 0.6) / 0.6)), pull = ease.back(clamp01((t - at - 1.4) / 0.6));
  return (
    <div style={{ position: "relative", width: w, fontFamily: family(theme.font) }}>
      <div style={{ background: "#fff", padding: 46, boxShadow: shadow, borderRadius: 6 }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: theme.ink, marginBottom: 20 }}>{title}</div>
        {Array.from({ length: lines }, (_, i) => <div key={i} style={{ position: "relative", height: 12, margin: "20px 0", width: `${84 + rand(i) * 16}%` }}>{i === mark && <div style={{ position: "absolute", left: -8, top: -8, height: 28, width: `${k * 100 + 2}%`, background: "rgb(255 222 60/0.8)" }} />}<div style={{ position: "relative", height: 12, background: "#777", opacity: 0.4, borderRadius: 4 }} /></div>)}
      </div>
      <Part name="quote"><div style={{ position: "absolute", left: w * 0.55, top: 200, width: 560, background: theme.ink, color: "#fff", padding: "26px 32px", borderRadius: 16, fontSize: 34, fontWeight: 700, lineHeight: 1.3, transform: `scale(${pull})`, transformOrigin: "0 50%", boxShadow: shadow }}>“{quote}”</div></Part>
    </div>
  );
}
export const DocHighlight = block("DocHighlight", DocHighlightView);
/** a social media post: it slides up, then likes and shares count up */
function SocialPostView({ name = "Ravi Kumar", handle = "@ravi", text, at = 0, likes = 12400, w = 760 }: { name?: string; handle?: string; text: string; at?: number; likes?: number; w?: number }) {
  const { t, u } = useIn(at, 0.6);
  const n = Math.round(likes * ease.out(clamp01((t - at - 0.8) / 1.8)));
  return (
    <div style={{ width: w, background: "#fff", borderRadius: 24, padding: 32, boxShadow: shadow, fontFamily: family("inter"), color: "#0f1419", opacity: u, transform: `translateY(${(1 - u) * 80}px)` }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center" }}><Part name="avatar"><div style={{ width: 76, height: 76, borderRadius: "50%", background: "linear-gradient(135deg,#6a9bd8,#9b6ad8)" }} /></Part><div><div style={{ fontSize: 30, fontWeight: 800 }}>{name} <span style={{ color: "#1d9bf0" }}>✓</span></div><div style={{ fontSize: 26, color: "#536471" }}>{handle}</div></div></div>
      <div style={{ fontSize: 34, lineHeight: 1.35, margin: "22px 0" }}>{text}</div>
      <div style={{ display: "flex", gap: 50, fontSize: 28, color: "#536471", fontWeight: 600 }}><span>💬 {Math.round(n / 9).toLocaleString()}</span><span>🔁 {Math.round(n / 4).toLocaleString()}</span><span style={{ color: "#f91880", transform: `scale(${1 + 0.2 * Math.max(0, Math.sin((t - at) * 10)) * (n < likes ? 1 : 0)})`, display: "inline-block" }}>♥ {n.toLocaleString()}</span></div>
    </div>
  );
}
export const SocialPost = block("SocialPost", SocialPostView);
/** a legal or secret document where lines are blacked out one by one (redacted) */
function RedactedView({ title = "CLASSIFIED", lines = 10, at = 0, w = 760 }: { title?: string; lines?: number; at?: number; w?: number }) {
  const { t } = useScene();
  return (
    <div style={{ width: w, background: "#fbfaf4", padding: 46, boxShadow: shadow, fontFamily: "monospace", position: "relative" }}>
      <div style={{ fontSize: 36, fontWeight: 800, color: "#222", letterSpacing: 6 }}>{title}</div>
      <div style={{ fontSize: 20, color: "#666", marginBottom: 20 }}>FILE NO. 1947/A-23 · PAGE 1 OF 3</div>
      {Array.from({ length: lines }, (_, i) => { const red = rand(i + 4) > 0.5, k = clamp01((t - at - i * 0.2) / 0.25); return <div key={i} style={{ position: "relative", height: 14, margin: "20px 0", width: `${70 + rand(i) * 30}%` }}><div style={{ height: 14, background: "#666", opacity: 0.35 }} />{red && <div style={{ position: "absolute", left: -6, top: -8, height: 30, width: `${k * 100 + 3}%`, background: "#111" }} />}</div>; })}
      <Part name="stamp"><div style={{ position: "absolute", right: 30, top: 30, border: "5px solid #b22", color: "#b22", fontWeight: 800, fontSize: 30, padding: "4px 12px", transform: "rotate(10deg)", opacity: clamp01((t - at - 2) / 0.2) }}>TOP SECRET</div></Part>
    </div>
  );
}
export const Redacted = block("Redacted", RedactedView);
/** a book opens and its pages turn */
function BookPagesView({ at = 0, w = 1000, title = "Chapter One", pages = 3 }: { at?: number; w?: number; title?: string; pages?: number }) {
  const { t, theme } = useScene();
  const open = ease.inOut(clamp01((t - at) / 0.9)), h = w * 0.62, half = w / 2;
  const page = (k: number, key: number, text?: ReactNode) => <div key={key} style={{ position: "absolute", left: half, top: 0, width: half, height: h, background: "#fffaf0", transformOrigin: "0% 50%", transform: `perspective(2600px) rotateY(${-k * 180}deg)`, boxShadow: "inset 20px 0 30px rgb(0 0 0/0.12)", backfaceVisibility: "hidden", padding: 40, boxSizing: "border-box", fontFamily: family("lora"), color: theme.ink }}>{text}{Array.from({ length: 9 }, (_, i) => <div key={i} style={{ height: 8, margin: "22px 0", background: "#666", opacity: 0.3, width: `${80 + rand(i + key) * 20}%` }} />)}</div>;
  return (
    <div style={{ position: "relative", width: w, height: h, transform: `scale(${0.8 + 0.2 * open})` }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: half, height: h, background: "#fffaf0", opacity: open, boxShadow: "inset -20px 0 30px rgb(0 0 0/0.12)" }} />
      {Array.from({ length: pages }, (_, i) => page(ease.inOut(clamp01((t - at - 1.2 - i * 0.8) / 0.8)), i, <div style={{ fontFamily: family("playfair"), fontSize: 40, fontWeight: 800 }}>{i === pages - 1 ? title : ""}</div>)).reverse()}
      <Part name="cover"><div style={{ position: "absolute", left: half, top: 0, width: half, height: h, background: `linear-gradient(135deg, ${theme.accent}, ${theme.ink})`, transformOrigin: "0% 50%", transform: `perspective(2600px) rotateY(${-open * 180}deg)`, backfaceVisibility: "hidden", display: "grid", placeItems: "center", color: "#fff", fontFamily: family("playfair"), fontSize: 50, fontWeight: 800 }}>{title}</div></Part>
    </div>
  );
}
export const BookPages = block("BookPages", BookPagesView);

/* ================= SCIENCE ================= */
/** a picture with labelled callouts that point to its parts (anatomy, a machine, a plant) */
function LabelledDiagramView({ image, w = 700, h = 700, labels, at = 0 }: { image: string; w?: number; h?: number; labels: { x: number; y: number; text: string; side?: "left" | "right" }[]; at?: number }) {
  const { t, theme, u } = useIn(at);
  return (
    <div style={{ position: "relative", width: w, height: h, fontFamily: family(theme.font) }}>
      <Part name="picture" fit="contain"><Img src={src(image)} style={{ width: w, height: h, objectFit: "contain", opacity: u }} /></Part>
      {labels.map((l, i) => { const k = ease.out(clamp01((t - at - 0.6 - i * 0.35) / 0.5)), left = (l.side ?? (l.x < 0.5 ? "left" : "right")) === "left", lx = left ? -60 : w + 60; return <div key={i}>
        <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={w} height={h}><circle cx={l.x * w} cy={l.y * h} r={10 * k} fill={theme.accent} stroke="#fff" strokeWidth={4} /><line x1={l.x * w} y1={l.y * h} x2={l.x * w + (lx - l.x * w) * k} y2={l.y * h} stroke={theme.ink} strokeWidth={4} /></svg>
        <div style={{ position: "absolute", top: l.y * h - 26, [left ? "right" : "left"]: left ? w + 70 : w + 70, fontSize: 34, fontWeight: 800, color: theme.ink, opacity: k, whiteSpace: "nowrap" }}>{l.text}</div>
      </div>; })}
    </div>
  );
}
export const LabelledDiagram = block("LabelledDiagram", LabelledDiagramView);
/** the Earth (or a fruit, a volcano) cut open: layers peel in from the core, each named */
function CrossSectionView({ layers = [["Crust", "#8d6e4f"], ["Mantle", "#d9772b"], ["Outer core", "#f0a830"], ["Inner core", "#ffe27a"]], size = 640, at = 0 }: { layers?: [string, string][]; size?: number; at?: number }) {
  const { t, theme } = useScene();
  const r = size / 2, n = layers.length;
  return (
    <div style={{ position: "relative", width: size * 1.7, height: size, fontFamily: family(theme.font) }}>
      <svg width={size} height={size}>
        {layers.map(([, c], i) => { const k = ease.out(clamp01((t - at - (n - 1 - i) * 0.35) / 0.6)), rr = r * (1 - i / (n + 0.4)); return <path key={i} d={`M${r} ${r} L${r} ${r - rr} A${rr} ${rr} 0 1 0 ${r + rr} ${r} Z`} fill={c} transform={`rotate(${(1 - k) * -90} ${r} ${r})`} opacity={k} />; })}
        <path d={`M${r} ${r} L${r} 0 A${r} ${r} 0 0 1 ${size} ${r} Z`} fill="#3c6e3c" opacity={0.25} />
      </svg>
      {layers.map(([name], i) => { const k = clamp01((t - at - (n - 1 - i) * 0.35 - 0.4) / 0.4), rr = r * (1 - (i + 0.5) / (n + 0.4)); return <div key={name} style={{ position: "absolute", left: size + 30, top: r - rr - 20, fontSize: 34, fontWeight: 800, color: theme.ink, opacity: k, display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 80, height: 4, background: theme.ink, marginLeft: -180 + i * 0 }} />{name}</div>; })}
    </div>
  );
}
export const CrossSection = block("CrossSection", CrossSectionView);
/** a molecule: atoms joined by bonds, turning slowly in 3D */
function MoleculeView({ atoms = [["O", 0, 0, 0], ["H", -1, 0.8, 0], ["H", 1, 0.8, 0]] as [string, number, number, number][], size = 520, at = 0 }: { atoms?: [string, number, number, number][]; size?: number; at?: number }) {
  const { t } = useScene();
  const a = (t - at) * 0.8, colors: Record<string, string> = { O: "#e74c3c", H: "#ecf0f1", C: "#34495e", N: "#3498db" }, k = ease.back(clamp01((t - at) / 0.7));
  const p = atoms.map(([el, x, y, z]) => { const rx = x * Math.cos(a) - z * Math.sin(a), rz = x * Math.sin(a) + z * Math.cos(a); return { el, x: size / 2 + rx * size * 0.28 * k, y: size / 2 + y * size * 0.28 * k - size * 0.1, z: rz }; });
  return (
    <svg width={size} height={size}>
      {p.slice(1).map((q, i) => <line key={i} x1={p[0].x} y1={p[0].y} x2={q.x} y2={q.y} stroke="#95a5a6" strokeWidth={16} strokeLinecap="round" />)}
      {[...p].sort((m, n) => m.z - n.z).map((q, i) => { const r = (q.el === "H" ? 44 : 72) * (1 + q.z * 0.12); return <g key={i}><defs><radialGradient id={`at${i}`} cx="35%" cy="30%"><stop offset="0%" stopColor="#fff" /><stop offset="45%" stopColor={colors[q.el] ?? "#aaa"} /><stop offset="100%" stopColor="#222" /></radialGradient></defs><circle cx={q.x} cy={q.y} r={r} fill={`url(#at${i})`} /><text x={q.x} y={q.y + 12} textAnchor="middle" fontSize={34} fontWeight={800} fill={q.el === "H" ? "#333" : "#fff"}>{q.el}</text></g>; })}
    </svg>
  );
}
export const Molecule = block("Molecule", MoleculeView);
/** a living cell: the membrane wobbles, things drift inside, the nucleus pulses */
function CellView({ size = 620, at = 0 }: { size?: number; at?: number }) {
  const { t, u } = useIn(at, 0.8);
  const r = size / 2, wob = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2, rr = r * 0.92 * (1 + 0.03 * Math.sin(a * 4 + t * 1.5) + 0.02 * Math.sin(a * 7 - t)); return [r + Math.cos(a) * rr, r + Math.sin(a) * rr] as [number, number]; });
  return (
    <svg width={size} height={size} style={{ transform: `scale(${u})` }}>
      <path d={curve([...wob, wob[0]]).d + "Z"} fill="rgb(150 210 170/0.55)" stroke="#3d8b5a" strokeWidth={10} />
      {Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={r + Math.cos(i * 0.7 + t * 0.3) * r * 0.55} cy={r + Math.sin(i * 1.3 + t * 0.25) * r * 0.5} rx={30} ry={14} fill="#e48a3c" transform={`rotate(${i * 40 + t * 20} ${r + Math.cos(i * 0.7 + t * 0.3) * r * 0.55} ${r + Math.sin(i * 1.3 + t * 0.25) * r * 0.5})`} />)}
      <circle cx={r} cy={r} r={r * 0.3 * (1 + 0.04 * Math.sin(t * 3))} fill="#7b5ea7" />
      <circle cx={r - 18} cy={r - 10} r={r * 0.09} fill="#4b357a" />
    </svg>
  );
}
export const Cell = block("Cell", CellView);
/** planets on their orbits round the Sun, inner ones faster */
function SolarSystemView({ w = 1300, h = 640, at = 0 }: { w?: number; h?: number; at?: number }) {
  const { t, u } = useIn(at, 0.8);
  const planets = [[0.12, "#b1a59a", 10, 4.1], [0.2, "#e8c27a", 16, 1.6], [0.3, "#4f8fd8", 17, 1], [0.4, "#d1603d", 12, 0.53], [0.6, "#d8b48a", 38, 0.084], [0.82, "#e6d3a3", 32, 0.034]] as const;
  return (
    <svg width={w} height={h} style={{ opacity: u, background: "radial-gradient(#0d1530, #050812)", borderRadius: 18 }}>
      {Array.from({ length: 80 }, (_, i) => <circle key={i} cx={rand(i) * w} cy={rand(i + 99) * h} r={1.5} fill="#fff" opacity={0.5} />)}
      {planets.map(([r], i) => <ellipse key={`o${i}`} cx={w / 2} cy={h / 2} rx={r * w * 0.55} ry={r * h * 0.5} fill="none" stroke="#fff" strokeOpacity={0.15} />)}
      <SvgPart name="sun" x={w / 2 - 50} y={h / 2 - 50} w={100} h={100}><circle cx={w / 2} cy={h / 2} r={50} fill="#ffcf4a" style={{ filter: "drop-shadow(0 0 40px #ffb52e)" }} /></SvgPart>
      {planets.map(([r, c, s, sp], i) => { const a = (t - at) * sp * 0.8 + i; return <circle key={i} cx={w / 2 + Math.cos(a) * r * w * 0.55} cy={h / 2 + Math.sin(a) * r * h * 0.5} r={s} fill={c} />; })}
    </svg>
  );
}
export const SolarSystem = block("SolarSystem", SolarSystemView);
/** an equation builds term by term, then the answer lands */
function EquationView({ terms, answer, at = 0, size = 110 }: { terms: string[]; answer: string; at?: number; size?: number }) {
  const { t, theme } = useScene();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3, fontFamily: family("newsreader"), fontSize: size, color: theme.ink, fontStyle: "italic" }}>
      {terms.map((x, i) => { const k = ease.back(clamp01((t - at - i * 0.4) / 0.5)); return <span key={i} style={{ transform: `translateY(${(1 - k) * 60}px)`, opacity: clamp01(k * 2) }}>{x}</span>; })}
      <span style={{ opacity: clamp01((t - at - terms.length * 0.4) / 0.3) }}>=</span>
      <span style={{ color: theme.accent, fontWeight: 800, fontStyle: "normal", transform: `scale(${ease.back(clamp01((t - at - terms.length * 0.4 - 0.4) / 0.5))})`, display: "inline-block" }}>{answer}</span>
    </div>
  );
}
export const Equation = block("Equation", EquationView);
/** a lab flask on a flame, its liquid bubbling */
function FlaskView({ at = 0, size = 420, color = "#3fc1a5" }: { at?: number; size?: number; color?: string }) {
  const { t, u } = useIn(at, 0.6);
  const s = size / 420;
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 420 546" style={{ opacity: u }}>
      <SvgPart name="flask" x={60} y={40} w={300} h={430}><path d="M170 40 L250 40 L250 200 L360 440 Q370 470 340 470 L80 470 Q50 470 60 440 L170 200 Z" fill="rgb(255 255 255/0.25)" stroke="#334" strokeWidth={8} /></SvgPart>
      <path d={`M98 350 Q210 ${340 + Math.sin(t * 4) * 8} 322 350 L352 440 Q360 462 340 462 L80 462 Q60 462 68 440 Z`} fill={color} opacity={0.85} />
      {Array.from({ length: 10 }, (_, i) => { const k = ((t - at) * 0.7 + i / 10) % 1; return <circle key={i} cx={130 + rand(i) * 160 + Math.sin(k * 8 + i) * 8} cy={455 - k * 110} r={6 + rand(i + 2) * 8} fill="#fff" opacity={0.7 * (1 - k)} />; })}
      <path d={`M180 ${520 - Math.sin(t * 9) * 6} Q210 ${470 - Math.sin(t * 11) * 10} 240 ${520 - Math.cos(t * 8) * 6} Z`} fill="#f39c12" />
      <path d={`M195 520 Q210 ${492 - Math.sin(t * 13) * 6} 225 520 Z`} fill="#3498db" />
      <rect x={150} y={520} width={120} height={20} rx={6} fill="#334" />
      <g transform={`scale(${s})`} />
    </svg>
  );
}
export const Flask = block("Flask", FlaskView);
/** a weather system: a cloud drifts in, rain falls, lightning flashes */
function WeatherView({ at = 0, w = 900, h = 640, lightning = true }: { at?: number; w?: number; h?: number; lightning?: boolean }) {
  const { t, u } = useIn(at, 0.8);
  const flash = lightning && ((t - at) % 3.1) > 2.8;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: 18, background: flash ? "#9aa7c0" : "#4a5670" }}>
      {Array.from({ length: 70 }, (_, i) => { const k = ((t - at) * 1.8 + rand(i)) % 1; return <div key={i} style={{ position: "absolute", left: rand(i + 7) * w * 0.8 + w * 0.1 - k * 40, top: 180 + k * (h - 180), width: 3, height: 34, background: "rgb(200 220 255/0.7)", transform: "rotate(12deg)" }} />; })}
      {flash && <svg style={{ position: "absolute", left: w * 0.45, top: 190 }} width={120} height={300}><path d="M60 0 L20 140 L60 140 L30 300 L110 110 L66 110 L96 0 Z" fill="#fff6a8" /></svg>}
      <div style={{ position: "absolute", left: w * 0.15 + (1 - u) * -500 + Math.sin(t * 0.5) * 10, top: 40, width: w * 0.7, height: 200 }}>
        {[[0.1, 0.35, 0.3], [0.32, 0.1, 0.42], [0.58, 0.25, 0.34], [0.25, 0.45, 0.5]].map(([x, y, r], i) => <div key={i} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: r * w, height: r * w * 0.62, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #dfe4ee, #8d97ab)" }} />)}
      </div>
    </div>
  );
}
export const Weather = block("Weather", WeatherView);

/* ================= TECH ================= */
/** a phone whose screen shows anything you put in it, scrolling */
export function Phone({ children, at = 0, h = 760, scroll = 0, tilt = 0 }: { children?: ReactNode; at?: number; h?: number; scroll?: number; tilt?: number }) {
  const { t, u } = useIn(at, 0.8);
  const w = h * 0.49;
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.14, background: "#111", padding: w * 0.035, boxSizing: "border-box", boxShadow: "0 30px 60px rgb(0 0 0/0.4)", transform: `translateY(${(1 - u) * 300}px) perspective(1800px) rotateY(${tilt + Math.sin(t * 0.6) * 3}deg)` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: w * 0.11, overflow: "hidden", background: "#f6f7f9", position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: 12, width: w * 0.3, height: 26, borderRadius: 13, background: "#111", transform: "translateX(-50%)", zIndex: 2 }} />
        <div style={{ transform: `translateY(${-Math.max(0, t - at - 1) * scroll}px)` }}>{children}</div>
      </div>
    </div>
  );
}
/** an app screen: grey placeholders load, then the real cards fill in */
function AppScreenView({ title = "Orders", items = ["Rice 5kg · ₹420", "Milk 1L · ₹62", "Onions 2kg · ₹90", "Bread · ₹45", "Eggs ×12 · ₹84"], at = 0 }: { title?: string; items?: string[]; at?: number }) {
  const { t, theme } = useScene();
  const loaded = t > at + 1.2;
  return (
    <div style={{ padding: "70px 22px 22px", fontFamily: family("inter") }}>
      <div style={{ fontSize: 40, fontWeight: 800, color: "#111", marginBottom: 20 }}>{title}</div>
      {items.map((it, i) => <div key={i} style={{ height: 96, borderRadius: 18, marginBottom: 16, background: loaded ? "#fff" : `linear-gradient(90deg, #e6e8ec ${((t * 80) % 100) - 30}%, #f3f4f6 ${(t * 80) % 100}%, #e6e8ec ${((t * 80) % 100) + 30}%)`, boxShadow: loaded ? "0 4px 12px rgb(0 0 0/0.08)" : undefined, display: "flex", alignItems: "center", gap: 16, padding: "0 18px", opacity: loaded ? ease.out(clamp01((t - at - 1.2 - i * 0.1) / 0.3)) : 1 }}>{loaded && <><div style={{ width: 56, height: 56, borderRadius: 14, background: i % 2 ? theme.accent2 : theme.accent }} /><div style={{ fontSize: 26, fontWeight: 600, color: "#222" }}>{it}</div></>}</div>)}
    </div>
  );
}
export const AppScreen = block("AppScreen", AppScreenView);
/** a laptop opens and its screen lights up */
export function Laptop({ children, at = 0, w = 1100 }: { children?: ReactNode; at?: number; w?: number }) {
  const { t } = useScene();
  const k = ease.out(clamp01((t - at) / 1)), on = clamp01((t - at - 0.9) / 0.4), h = w * 0.6;
  return (
    <div style={{ width: w, perspective: 2400 }}>
      <div style={{ width: w * 0.86, height: h, margin: "0 auto", background: "#1a1a1e", borderRadius: "22px 22px 0 0", padding: 22, boxSizing: "border-box", transformOrigin: "50% 100%", transform: `rotateX(${(1 - k) * -88}deg)` }}>
        <div style={{ width: "100%", height: "100%", background: "#fff", opacity: on, overflow: "hidden", borderRadius: 6 }}>{children}</div>
      </div>
      <div style={{ width: w, height: 34, background: "linear-gradient(#d4d6da,#a7aab0)", borderRadius: "0 0 26px 26px" }} />
    </div>
  );
}
/** code typed line by line, with colours and a blinking cursor */
function CodeBlockView({ code, at = 0, w = 1000, speed = 28 }: { code: string; at?: number; w?: number; speed?: number }) {
  const { t } = useScene();
  const n = Math.floor(Math.max(0, t - at) * speed), shown = code.slice(0, n);
  const paint = (line: string) => line.split(/(\b(?:const|let|function|return|if|else|import|from|def|for|in)\b|"[^"]*"|\d+|\/\/.*)/).map((p, i) => <span key={i} style={{ color: /^(const|let|function|return|if|else|import|from|def|for|in)$/.test(p) ? "#ff7b72" : /^"/.test(p) ? "#a5d6ff" : /^\d+$/.test(p) ? "#79c0ff" : /^\/\//.test(p) ? "#8b949e" : "#e6edf3" }}>{p}</span>);
  return (
    <div style={{ width: w, background: "#0d1117", borderRadius: 18, overflow: "hidden", boxShadow: shadow, fontFamily: "Menlo, monospace" }}>
      <div style={{ display: "flex", gap: 10, padding: 18, background: "#161b22" }}>{["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />)}</div>
      <div style={{ padding: "20px 30px", fontSize: 30, lineHeight: 1.55, minHeight: 300, whiteSpace: "pre" }}>
        {shown.split("\n").map((l, i, a) => <div key={i}><span style={{ color: "#6e7681", marginRight: 26 }}>{String(i + 1).padStart(2, " ")}</span>{paint(l)}{i === a.length - 1 && Math.floor(t * 2) % 2 === 0 && <span style={{ background: "#e6edf3" }}> </span>}</div>)}
      </div>
    </div>
  );
}
export const CodeBlock = block("CodeBlock", CodeBlockView);
/** servers and a cloud, with data packets travelling up and down between them */
function CloudServersView({ at = 0, w = 1200 }: { at?: number; w?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / 0.7));
  return (
    <div style={{ position: "relative", width: w, height: 640, opacity: k, fontFamily: family(theme.font) }}>
      <Part name="cloud"><svg width={w} height={260} style={{ position: "absolute", left: 0, top: 0 }}><path d={`M${w * 0.3} 220 Q${w * 0.28} 120 ${w * 0.4} 120 Q${w * 0.45} 40 ${w * 0.55} 80 Q${w * 0.68} 50 ${w * 0.68} 140 Q${w * 0.76} 150 ${w * 0.72} 220 Z`} fill={theme.accent2} opacity={0.9} /></svg></Part>
      {[0.25, 0.5, 0.75].map((x, i) => <div key={i}>
        <Part name="server" item={x} i={i}><div style={{ position: "absolute", left: x * w - 80, top: 400, width: 160, height: 220, background: "#2b2f38", borderRadius: 14, padding: 14, boxSizing: "border-box" }}>{[0, 1, 2, 3].map((r) => <div key={r} style={{ height: 34, marginBottom: 14, background: "#3c424e", borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 10, gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 5, background: Math.sin(t * 6 + r + i * 2) > 0 ? "#3fb950" : "#1e5f2a" }} /></div>)}</div></Part>
        {[0, 1].map((j) => { const p = ((t - at) * 0.7 + j * 0.5 + i * 0.2) % 1, up = (i + j) % 2 === 0, y = up ? 400 - p * 190 : 210 + p * 190; return <div key={j} style={{ position: "absolute", left: x * w - 14 + (j ? 24 : -24), top: y, width: 28, height: 28, borderRadius: 6, background: up ? theme.accent : "#6a9bd8" }} />; })}
      </div>)}
    </div>
  );
}
export const CloudServers = block("CloudServers", CloudServersView);
/** a mouse cursor moves to points and clicks, with a ripple at each click */
function CursorView({ path, at = 0, per = 1 }: { path: [number, number][]; at?: number; per?: number }) {
  const { t } = useScene();
  const pos = clamp01((t - at) / (per * (path.length - 1))) * (path.length - 1), i = Math.floor(pos), f = ease.inOut(pos - i);
  const a = path[i], b = path[Math.min(path.length - 1, i + 1)], x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
  const since = (pos - i) * per, click = f >= 0.98 || pos >= path.length - 1 ? 0 : -1;
  const ring = since > per * 0.85 ? (since - per * 0.85) / (per * 0.15) : click;
  return (
    <>
      {ring > 0 && <div style={{ position: "absolute", left: b[0] - 40 * ring, top: b[1] - 40 * ring, width: 80 * ring, height: 80 * ring, borderRadius: "50%", border: "5px solid #2f81f7", opacity: 1 - ring }} />}
      <Part name="pointer"><svg style={{ position: "absolute", left: x, top: y, filter: "drop-shadow(0 4px 6px rgb(0 0 0/0.35))" }} width={44} height={60} viewBox="0 0 22 30"><path d="M1 1 L1 23 L7 17 L11 27 L15 25 L11 16 L19 16 Z" fill="#fff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" /></svg></Part>
    </>
  );
}
export const Cursor = block("Cursor", CursorView);
/** a notification slides down with a sound-wave wiggle and its badge */
function NotificationView({ app = "Bank", text = "₹25,000 credited to your account", at = 0, w = 760 }: { app?: string; text?: string; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const k = ease.back(clamp01((t - at) / 0.6)), wig = Math.sin((t - at) * 30) * 4 * Math.exp(-(t - at) * 3) * (t > at ? 1 : 0);
  return (
    <div style={{ width: w, background: "rgb(250 250 252/0.96)", borderRadius: 28, padding: "22px 28px", display: "flex", gap: 20, alignItems: "center", boxShadow: shadow, transform: `translateY(${(1 - k) * -220}px) rotate(${wig}deg)`, fontFamily: family("inter") }}>
      <Part name="icon"><div style={{ width: 80, height: 80, borderRadius: 20, background: theme.accent2, display: "grid", placeItems: "center", color: "#fff", fontSize: 40, fontWeight: 800 }}>{app[0]}</div></Part>
      <div><div style={{ fontSize: 26, color: "#666", fontWeight: 600 }}>{app.toUpperCase()} · now</div><div style={{ fontSize: 32, color: "#111", fontWeight: 700 }}>{text}</div></div>
    </div>
  );
}
export const Notification = block("Notification", NotificationView);

/* ================= OBJECTS ================= */
/** any object picture (drawn or a photo cut-out), standing with a soft contact shadow */
function PropView({ image, height = 360, at = 0, float = false }: { image: string; height?: number; at?: number; float?: boolean }) {
  const { t, b } = useIn(at, 0.6);
  const y = float ? Math.sin(t * 1.5) * 12 : 0;
  return (
    <div style={{ position: "relative", display: "inline-block", transform: `scale(${b})`, transformOrigin: "50% 100%" }}>
      <Part name="picture"><Img src={src(image)} style={{ height, transform: `translateY(${y}px)`, filter: "drop-shadow(0 12px 14px rgb(0 0 0/0.3))" }} /></Part>
      <div style={{ position: "absolute", left: "15%", right: "15%", bottom: -14, height: 24, borderRadius: "50%", background: "rgb(0 0 0/0.22)", filter: "blur(6px)", transform: `scale(${1 - y / 60})` }} />
    </div>
  );
}
export const Prop = block("Prop", PropView);
/** a round icon badge (a symbol in a coloured circle) */
function IconBadgeView({ glyph, label, at = 0, size = 170, color }: { glyph: string; label?: string; at?: number; size?: number; color?: string }) {
  const { theme, b } = useIn(at, 0.5);
  return (
    <div style={{ textAlign: "center", transform: `scale(${b})`, fontFamily: family(theme.font) }}>
      <Part name="badge"><div style={{ width: size, height: size, borderRadius: "50%", background: color ?? theme.accent, display: "grid", placeItems: "center", fontSize: size * 0.5, color: "#fff", boxShadow: shadow, margin: "0 auto" }}>{glyph}</div></Part>
      {label && <div style={{ fontSize: 30, fontWeight: 700, color: theme.ink, marginTop: 12 }}>{label}</div>}
    </div>
  );
}
export const IconBadge = block("IconBadge", IconBadgeView);
/** a big emoji sticker with a white border, that wobbles in */
function EmojiView({ char, size = 200, at = 0 }: { char: string; size?: number; at?: number }) {
  const { t, b } = useIn(at, 0.5);
  return <div style={{ fontSize: size, lineHeight: 1, transform: `scale(${b}) rotate(${Math.sin(t * 2) * 6}deg)`, filter: "drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 10px 12px rgb(0 0 0/0.25))" }}>{char}</div>;
}
export const Emoji = block("Emoji", EmojiView);
/** a brand mark: a shape and a word that build up (for a company or a product) */
function LogoMarkView({ name, at = 0, color }: { name: string; at?: number; color?: string }) {
  const { t, theme } = useScene();
  const k = ease.back(clamp01((t - at) / 0.6)), w = clamp01((t - at - 0.4) / 0.6);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26, fontFamily: family(theme.display) }}>
      <Part name="mark"><div style={{ width: 140, height: 140, borderRadius: 34, background: color ?? theme.accent, transform: `scale(${k}) rotate(${(1 - k) * 180}deg)`, display: "grid", placeItems: "center", color: "#fff", fontSize: 80, fontWeight: 800 }}>{name[0]}</div></Part>
      <div style={{ fontSize: 110, fontWeight: 800, color: theme.ink, clipPath: `inset(0 ${(1 - w) * 100}% 0 0)` }}>{name}</div>
    </div>
  );
}
export const LogoMark = block("LogoMark", LogoMarkView);
/** a cardboard parcel whose flaps open and something pops out */
function ParcelView({ at = 0, size = 360, inside = "🎁" }: { at?: number; size?: number; inside?: string }) {
  const { t } = useScene();
  const k = ease.out(clamp01((t - at) / 0.8)), pop = ease.back(clamp01((t - at - 0.7) / 0.6));
  return (
    <div style={{ position: "relative", width: size, height: size * 1.3 }}>
      <Part name="inside"><div style={{ position: "absolute", left: size * 0.2, bottom: size * 0.5 + pop * size * 0.45, fontSize: size * 0.6, transform: `scale(${pop})`, zIndex: 1 }}>{inside}</div></Part>
      <Part name="box"><div style={{ position: "absolute", left: 0, bottom: 0, width: size, height: size * 0.75, background: "#c79a5b", borderRadius: 8, zIndex: 2, boxShadow: shadow }}><div style={{ position: "absolute", left: "45%", width: "10%", top: 0, bottom: 0, background: "#e5cf9d" }} /></div></Part>
      {[-1, 1].map((s) => <div key={s} style={{ position: "absolute", bottom: size * 0.75 - 4, [s < 0 ? "left" : "right"]: 0, width: size / 2, height: size * 0.22, background: "#b88a4c", transformOrigin: s < 0 ? "0% 100%" : "100% 100%", transform: `rotate(${s * k * -130}deg)`, zIndex: 3, borderRadius: 6 }} />)}
    </div>
  );
}
export const Parcel = block("Parcel", ParcelView);

/* ================= SETS (full-frame worlds) ================= */
/** a toy-theatre paper stage: curtains part, wings and a floor */
function PaperStageView({ at = 0, color = "#9b2c2c" }: { at?: number; color?: string }) {
  const { t, W, H } = useScene();
  const k = ease.inOut(clamp01((t - at) / 1.4));
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#f6e7c8, #e7cf9e)" }}><Background />
      <Part name="floor" still><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.24, background: "repeating-linear-gradient(90deg, #a87b4f 0 120px, #9a6f45 120px 240px)", boxShadow: "inset 0 14px 20px rgb(0 0 0/0.25)" }} /></Part>
      {[-1, 1].map((s) => <Part name="curtain" key={s} item={s} i={s < 0 ? 0 : 1}><div style={{ position: "absolute", top: 0, bottom: 0, [s < 0 ? "left" : "right"]: 0, width: W * (0.5 - 0.38 * k), background: `repeating-linear-gradient(90deg, ${color} 0 50px, #7a1f1f 50px 70px)`, boxShadow: "0 0 40px rgb(0 0 0/0.4)" }} /></Part>)}
      <Part name="valance"><div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 120, background: `linear-gradient(${color}, #6e1b1b)`, borderBottom: "10px solid #d8a840", clipPath: "polygon(0 0,100% 0,100% 80%,95% 100%,90% 80%,85% 100%,80% 80%,75% 100%,70% 80%,65% 100%,60% 80%,55% 100%,50% 80%,45% 100%,40% 80%,35% 100%,30% 80%,25% 100%,20% 80%,15% 100%,10% 80%,5% 100%,0 80%)" }} /></Part>
    </div>
  );
}
export const PaperStage = block("PaperStage", PaperStageView);
/** a room: wall, floor, a window whose light moves across the floor */
function RoomView({ at = 0, wall = "#e9dcc6", floor = "#a7835e" }: { at?: number; wall?: string; floor?: string }) {
  const { t, W, H } = useScene();
  const sweep = Math.sin((t - at) * 0.25) * 60;
  return (
    <div style={{ position: "absolute", inset: 0, background: wall }}><Background />
      <Part name="window" still><div style={{ position: "absolute", left: W * 0.62, top: H * 0.14, width: 380, height: 420, background: "linear-gradient(#bfe3f5, #e8f5fb)", border: "18px solid #fff", boxShadow: "inset 0 0 0 8px #ddd" }}><div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 14, background: "#fff" }} /><div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 14, background: "#fff" }} /></div></Part>
      <Part name="floor" still><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.3, background: `linear-gradient(${floor}, #8a6a48)` }} /></Part>
      <div style={{ position: "absolute", left: W * 0.45 + sweep, bottom: 0, width: 560, height: H * 0.3, background: "rgb(255 245 200/0.35)", clipPath: "polygon(20% 0, 70% 0, 100% 100%, 0 100%)", filter: "blur(4px)" }} />
      <Part name="skirting" still><div style={{ position: "absolute", left: 0, right: 0, bottom: H * 0.3, height: 18, background: "#fff", opacity: 0.7 }} /></Part>
    </div>
  );
}
export const Room = block("Room", RoomView);
/** a street: house fronts on two depths sliding past at different speeds, a road */
function StreetView({ at = 0, speed = 80 }: { at?: number; speed?: number }) {
  const { t, W, H } = useScene();
  const s = Math.max(0, t - at) * speed;
  const row = (y: number, hgt: number, depth: number, tone: number) => <div style={{ position: "absolute", left: 0, top: y, width: W * 3, height: hgt, transform: `translateX(${-(s * depth) % (W * 0.6)}px)`, display: "flex", alignItems: "flex-end" }}>{Array.from({ length: 22 }, (_, i) => <Part name="house" key={i} item={tone} i={i} still><div style={{ width: 160 + rand(i + tone) * 120, height: hgt * (0.55 + rand(i * 3 + tone) * 0.45), marginRight: 18, background: `hsl(${20 + rand(i + tone) * 30} ${30 + tone * 4}% ${70 - tone * 12}%)`, position: "relative" }}>{[0, 1].map((w) => <div key={w} style={{ position: "absolute", left: 24 + w * 70, top: 30, width: 40, height: 52, background: "#fbe7a1", opacity: 0.8 }} />)}</div></Part>)}</div>;
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#a9d3ef, #f1e6cf)", overflow: "hidden" }}><Background />
      {row(H * 0.25, H * 0.42, 0.4, 1)}
      {row(H * 0.32, H * 0.48, 1, 2)}
      <Part name="road" still><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.22, background: "#555b63" }}><div style={{ position: "absolute", top: "45%", left: -((s * 1.6) % 200), width: W + 400, height: 12, background: "repeating-linear-gradient(90deg, #f3f3f3 0 100px, transparent 100px 200px)" }} /></div></Part>
    </div>
  );
}
export const Street = block("Street", StreetView);
/** a landscape: layered hills in aerial perspective, drifting clouds, a sun */
function LandscapeView({ at = 0, sky = ["#8ec5e8", "#f5e3c3"] }: { at?: number; sky?: [string, string] }) {
  const { t, W, H } = useScene();
  const hill = (y: number, amp: number, col: string, seed: number, drift: number) => { const pts = Array.from({ length: 13 }, (_, i) => [(i / 12) * (W + 400) - 200 - (t - at) * drift, y + Math.sin(i * 1.3 + seed) * amp + rand(i + seed) * amp * 0.5] as [number, number]); return <Part name="hill" i={seed} still><svg style={{ position: "absolute", inset: 0 }} width={W} height={H}><path d={`${curve(pts).d} L${W + 200} ${H} L-200 ${H} Z`} fill={col} /></svg></Part>; };
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${sky[0]}, ${sky[1]})`, overflow: "hidden" }}><Background />
      <Part name="sun"><div style={{ position: "absolute", left: W * 0.7, top: H * 0.16, width: 150, height: 150, borderRadius: "50%", background: "#fff3c4", boxShadow: "0 0 100px 40px rgb(255 240 190/0.6)" }} /></Part>
      {[0, 1, 2].map((i) => <Part name="cloud" key={i} i={i}><div style={{ position: "absolute", left: ((i * 700 + (t - at) * 20) % (W + 400)) - 300, top: 80 + i * 70, width: 300, height: 70, borderRadius: 40, background: "rgb(255 255 255/0.8)", filter: "blur(2px)" }} /></Part>)}
      {hill(H * 0.55, 40, "#9db8a8", 1, 4)}{hill(H * 0.66, 50, "#6f9a78", 3, 10)}{hill(H * 0.8, 40, "#4b7a50", 6, 20)}
    </div>
  );
}
export const Landscape = block("Landscape", LandscapeView);
/** deep space: stars at three depths drifting, a planet turning */
function SpaceView({ at = 0 }: { at?: number }) {
  const { t, W, H } = useScene();
  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 40%, #1b2650, #04060f 70%)", overflow: "hidden" }}><Background />
      <Part name="stars" still>{[0.2, 0.5, 1].map((d, l) => Array.from({ length: 60 }, (_, i) => <div key={`${l}-${i}`} style={{ position: "absolute", left: ((rand(i + l * 100) * W - (t - at) * 20 * d) % W + W) % W, top: rand(i + l * 100 + 50) * H, width: 1 + d * 3, height: 1 + d * 3, borderRadius: "50%", background: "#fff", opacity: 0.4 + d * 0.5 }} />))}</Part>
      <Part name="planet"><div style={{ position: "absolute", left: W * 0.62, top: H * 0.25, width: 460, height: 460, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #f3c27a, #b3622e 55%, #2b1308 90%)`, boxShadow: "inset -60px -30px 80px rgb(0 0 0/0.6)" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `repeating-linear-gradient(${12}deg, transparent 0 30px, rgb(120 50 10/0.25) 30px 46px)`, backgroundPositionX: (t - at) * 30, mixBlendMode: "multiply" }} />
      </div></Part>
    </div>
  );
}
export const Space = block("Space", SpaceView);
/** a news-studio set: a desk, a big screen behind, sweeping lights */
function StudioView({ at = 0, screen }: { at?: number; screen?: ReactNode }) {
  const { t, W, H, theme } = useScene();
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#0f1a33, #1d2c55)", overflow: "hidden" }}><Background />
      {[0, 1].map((i) => <div key={i} style={{ position: "absolute", left: W * (0.2 + i * 0.5) + Math.sin(t * 0.6 + i * 2) * 200, top: -100, width: 260, height: H * 1.2, background: "linear-gradient(rgb(160 200 255/0.25), transparent)", transform: `rotate(${(i ? -1 : 1) * 15}deg)`, filter: "blur(10px)" }} />)}
      <div style={{ position: "absolute", left: W * 0.2, top: H * 0.1, width: W * 0.6, height: H * 0.5, background: "#0b1222", border: `6px solid ${theme.accent}`, borderRadius: 14, overflow: "hidden" }}><Part name="screen">{screen}</Part></div>
      <Part name="desk"><div style={{ position: "absolute", left: W * 0.15, right: W * 0.15, bottom: 0, height: H * 0.28, background: "linear-gradient(#2a3a6a, #121a33)", borderRadius: "40px 40px 0 0", borderTop: `8px solid ${theme.accent}` }} /></Part>
    </div>
  );
}
export const Studio = block("Studio", StudioView);
/** an abstract colour ground: slow soft blobs of the theme's colours moving */
function GradientGroundView({ at = 0 }: { at?: number }) {
  const { t, W, H, theme } = useScene();
  const blobs = [theme.accent, theme.accent2, "#e0b24a", theme.bg?.[1] ?? "#ddd"];
  return (
    <div style={{ position: "absolute", inset: 0, background: theme.bg?.[0] ?? "#f4f1ea", overflow: "hidden" }}><Background />
      {blobs.map((c, i) => <div key={i} style={{ position: "absolute", left: W * (0.2 + 0.5 * rand(i)) + Math.sin((t - at) * 0.3 + i * 2) * 200 - 400, top: H * (0.2 + 0.5 * rand(i + 4)) + Math.cos((t - at) * 0.25 + i) * 150 - 400, width: 800, height: 800, borderRadius: "50%", background: c, opacity: 0.45, filter: "blur(120px)" }} />)}
    </div>
  );
}
export const GradientGround = block("GradientGround", GradientGroundView);

/* ================= TEXT ================= */
/** a title card: a line draws, the title rises, the subtitle follows */
function TitleCardView({ title, sub, at = 0, size = 130 }: { title: string; sub?: string; at?: number; size?: number }) {
  const { t, theme } = useScene();
  const a = ease.out(clamp01((t - at) / 0.6)), b = ease.out(clamp01((t - at - 0.3) / 0.7)), c = ease.out(clamp01((t - at - 0.7) / 0.6));
  return (
    <div style={{ textAlign: "center", fontFamily: family(theme.display) }}>
      <Part name="line"><div style={{ width: 240 * a, height: 10, background: theme.accent, margin: "0 auto 30px", borderRadius: 5 }} /></Part>
      <div style={{ fontSize: size, fontWeight: 800, color: theme.ink, lineHeight: 1, overflow: "hidden" }}><div style={{ transform: `translateY(${(1 - b) * 100}%)` }}>{title}</div></div>
      {sub && <div style={{ fontFamily: family(theme.font), fontSize: size * 0.3, color: theme.muted, marginTop: 24, opacity: c, transform: `translateY(${(1 - c) * 20}px)` }}>{sub}</div>}
    </div>
  );
}
export const TitleCard = block("TitleCard", TitleCardView);
/** a label pinned to a point with a leader line */
function PointerLabelView({ x, y, text, dx = 160, dy = -120, at = 0 }: { x: number; y: number; text: string; dx?: number; dy?: number; at?: number }) {
  const { t, theme } = useScene();
  const k = ease.out(clamp01((t - at) / 0.5)), m = ease.back(clamp01((t - at - 0.4) / 0.4));
  return (
    <>
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%"><circle cx={x} cy={y} r={12 * k} fill={theme.accent} stroke="#fff" strokeWidth={4} /><path d={`M${x} ${y} L${x + dx * k} ${y + dy * k}`} stroke={theme.ink} strokeWidth={4} /></svg>
      <div style={{ position: "absolute", left: x + dx, top: y + dy, transform: `translate(${dx > 0 ? 0 : -100}%, -50%) scale(${m})`, background: theme.ink, color: "#fff", fontFamily: family(theme.font), fontSize: 32, fontWeight: 700, padding: "10px 20px", borderRadius: 10, whiteSpace: "nowrap" }}>{text}</div>
    </>
  );
}
export const PointerLabel = block("PointerLabel", PointerLabelView);
/** a chapter heading: a big number and the chapter's name wipe in */
function ChapterHeadingView({ n, title, at = 0 }: { n: number; title: string; at?: number }) {
  const { t, theme } = useScene();
  const a = ease.out(clamp01((t - at) / 0.6)), b = ease.out(clamp01((t - at - 0.35) / 0.7));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, fontFamily: family(theme.display) }}>
      <div style={{ fontSize: 260, fontWeight: 800, color: theme.accent, lineHeight: 0.9, transform: `translateX(${(1 - a) * -80}px)`, opacity: a }}>{String(n).padStart(2, "0")}</div>
      <div style={{ borderLeft: `8px solid ${theme.ink}`, paddingLeft: 36, clipPath: `inset(0 ${(1 - b) * 100}% 0 0)` }}><div style={{ fontSize: 34, letterSpacing: 8, color: theme.muted, fontFamily: family(theme.font), fontWeight: 700 }}>CHAPTER</div><div style={{ fontSize: 100, fontWeight: 800, color: theme.ink, lineHeight: 1 }}>{title}</div></div>
    </div>
  );
}
export const ChapterHeading = block("ChapterHeading", ChapterHeadingView);
/** a quote card with big quotation marks and who said it */
function QuoteCardView({ text, who, at = 0, w = 1200 }: { text: string; who: string; at?: number; w?: number }) {
  const { t, theme } = useScene();
  const a = ease.back(clamp01((t - at) / 0.6)), words = text.split(" "), shown = Math.floor(clamp01((t - at - 0.4) / (words.length * 0.12)) * words.length);
  return (
    <div style={{ width: w, position: "relative", fontFamily: family("playfair"), color: theme.ink }}>
      <Part name="marks"><div style={{ position: "absolute", left: -40, top: -150, fontSize: 340, color: theme.accent, opacity: 0.35, transform: `scale(${a})`, lineHeight: 1 }}>“</div></Part>
      <div style={{ fontSize: 66, lineHeight: 1.25, fontStyle: "italic", position: "relative" }}>{words.map((wd, i) => <span key={i} style={{ opacity: i < shown ? 1 : 0.08 }}>{wd} </span>)}</div>
      <div style={{ fontFamily: family(theme.font), fontSize: 36, fontWeight: 700, color: theme.muted, marginTop: 30, opacity: clamp01((t - at - 0.4 - words.length * 0.12) / 0.4) }}>— {who}</div>
    </div>
  );
}
export const QuoteCard = block("QuoteCard", QuoteCardView);
/** a list whose points come in one by one, each ticked */
function ListRevealView({ items, at = 0, per = 0.6, w = 1000 }: { items: string[]; at?: number; per?: number; w?: number }) {
  const { t, theme } = useScene();
  return (
    <div style={{ width: w, fontFamily: family(theme.font) }}>
      {items.map((it, i) => { const k = ease.out(clamp01((t - at - i * per) / 0.5)), tick = ease.back(clamp01((t - at - i * per - 0.3) / 0.4)); return <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, margin: "22px 0", opacity: k, transform: `translateX(${(1 - k) * 80}px)` }}><div style={{ width: 66, height: 66, borderRadius: 16, background: theme.accent, color: "#fff", fontSize: 44, fontWeight: 800, display: "grid", placeItems: "center", transform: `scale(${tick})` }}>✓</div><div style={{ fontSize: 48, fontWeight: 700, color: theme.ink }}>{it}</div></div>; })}
    </div>
  );
}
export const ListReveal = block("ListReveal", ListRevealView);
/** a lower third: the name and role of who is on screen */
function LowerThirdView({ name, role, at = 0 }: { name: string; role?: string; at?: number }) {
  const { t, theme } = useScene();
  const a = ease.out(clamp01((t - at) / 0.5)), b = ease.out(clamp01((t - at - 0.2) / 0.5));
  return (
    <div style={{ fontFamily: family(theme.font) }}>
      <div style={{ display: "inline-block", background: theme.accent, color: "#fff", fontSize: 48, fontWeight: 800, padding: "12px 30px", clipPath: `inset(0 ${(1 - a) * 100}% 0 0)` }}>{name}</div><br />
      {role && <div style={{ display: "inline-block", background: theme.ink, color: "#fff", fontSize: 32, fontWeight: 600, padding: "8px 30px", clipPath: `inset(0 ${(1 - b) * 100}% 0 0)` }}>{role}</div>}
    </div>
  );
}
export const LowerThird = block("LowerThird", LowerThirdView);
/** words slam in one at a time, big, with weight (kinetic type) */
function KineticWordsView({ words, at = 0, per = 0.35, size = 150 }: { words: string[]; at?: number; per?: number; size?: number }) {
  const { t, theme } = useScene();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 36px", justifyContent: "center", maxWidth: 1600, fontFamily: family(theme.display) }}>
      {words.map((w, i) => { const s = t - at - i * per, k = clamp01(s / 0.12), sc = s < 0 ? 0 : s < 0.12 ? 2.4 - 1.4 * k : 1 + 0.06 * Math.exp(-(s - 0.12) * 9); return <div key={i} style={{ fontSize: size, fontWeight: 800, lineHeight: 1.05, color: i % 3 === 2 ? theme.accent : theme.ink, transform: `scale(${sc})`, opacity: s < 0 ? 0 : 1, textTransform: "uppercase" }}>{w}</div>; })}
    </div>
  );
}
export const KineticWords = block("KineticWords", KineticWordsView);
