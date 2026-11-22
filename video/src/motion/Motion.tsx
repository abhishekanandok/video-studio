import { loadFont } from "@remotion/google-fonts/Baloo2";
import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as caveat } from "@remotion/google-fonts/Caveat";
import { loadFont as fredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as lora } from "@remotion/google-fonts/Lora";
import { loadFont as marker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as newsreader } from "@remotion/google-fonts/Newsreader";
import { loadFont as nunito } from "@remotion/google-fonts/Nunito";
import { loadFont as oswald } from "@remotion/google-fonts/Oswald";
import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as poppins } from "@remotion/google-fonts/Poppins";
import { loadFont as grotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Audio, Img, Sequence, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/* Motion: a general motion-graphics renderer. Nothing here is a fixed shot or a fixed colour: the motion director
   (video/motionfx.py) designs every scene as data (a palette, a background, and the things on screen with where they
   sit and how each one moves) and this draws it, frame by frame.

   Units: 1u = 1% of the frame's shorter side. A landscape stage is 177.8u x 100u, a vertical (9:16) one 100u x 177.8u;
   the bottom of the stage is kept for the captions. Times inside a scene are in seconds from the scene's start. */

const { fontFamily } = loadFont();
export const FPS = 30;

/* A skill's skin (video/vskill_learn.py, learned from the creator's references): its font, a painted background plate
   under every shot, how its cards are drawn, and how heavy its words are. A film without a skin looks as before. */
export type SkinT = { font?: string; plate?: string; plateOpacity?: number; weight?: number; box?: { radius?: number; strokeWidth?: number; shadow?: "hard" | "soft" | "none"; fill?: string } };
type Loader = (style?: string, options?: object) => { fontFamily: string };
const FONTS: Record<string, [Loader, string[]]> = {
  baloo: [loadFont as Loader, ["400", "600", "700", "800"]], inter: [inter as Loader, ["400", "600", "800"]], fredoka: [fredoka as Loader, ["400", "600", "700"]],
  playfair: [playfair as Loader, ["400", "700", "800"]], space_grotesk: [grotesk as Loader, ["400", "600", "700"]], caveat: [caveat as Loader, ["400", "700"]],
  oswald: [oswald as Loader, ["400", "600", "700"]], newsreader: [newsreader as Loader, ["400", "600", "800"]], permanent_marker: [marker as Loader, ["400"]],
  poppins: [poppins as Loader, ["400", "600", "800"]], lora: [lora as Loader, ["400", "700"]], bebas: [bebas as Loader, ["400"]], nunito: [nunito as Loader, ["400", "700", "800"]],
};
const loaded: Record<string, string> = {};
function familyOf(name?: string): string {
  if (!name || !FONTS[name]) return fontFamily;
  if (!loaded[name]) loaded[name] = FONTS[name][0]("normal", { weights: FONTS[name][1], subsets: ["latin"] }).fontFamily;
  return loaded[name];
}
const Skin = createContext<SkinT & { family: string }>({ family: fontFamily });

type Enter = { style?: "pop" | "fade" | "rise" | "drop" | "left" | "right" | "zoom" | "draw" | "flip" | "type" | "stamp" | "count" | "none"; at?: number; dur?: number };
type Move = { x: number; y: number; at: number; dur?: number; spin?: number; scale?: number };
export type El = {
  type: "text" | "box" | "sticky" | "shape" | "arrow" | "icon" | "image" | "counter" | "bars" | "phone";
  x: number; y: number; w?: number; h?: number; r?: number; z?: number; opacity?: number;
  text?: string; size?: number; weight?: number; color?: string; align?: "left" | "center" | "right"; mark?: string; markColor?: string;
  fill?: string; stroke?: string; strokeWidth?: number; radius?: number; shadow?: "hard" | "soft" | "none"; shadowColor?: string;
  shape?: "rect" | "circle" | "pill" | "star" | "ring" | "blob" | "line" | "burst";
  from?: [number, number]; to?: [number, number]; curve?: number; dashed?: boolean; head?: boolean;
  src?: string | null; frame?: "none" | "polaroid" | "circle" | "card"; tape?: boolean;
  value?: string;
  bars?: { label: string; value: number; display?: string; color?: string }[];
  enter?: Enter; loop?: "bob" | "pulse" | "spin" | "float" | "wiggle" | "blink" | "none"; move?: Move; exit?: { at: number; style?: "fade" | "pop" | "drop" };
};
export type Bg = { type?: "solid" | "linear" | "radial"; colors: string[]; angle?: number; pattern?: "dots" | "grid" | "rays" | "stripes" | "paper" | "none"; patternColor?: string };
export type Scene = { bg: Bg; ink?: string; accent?: string; camera?: "push" | "pull" | "drift" | "still"; elements: El[] };
export type MLine = { speech?: string; audio?: string | null; seconds: number; pause?: number; sfx?: string | null; scenes: Scene[]; title?: boolean };
export type MotionProps = { speed?: number; vertical?: boolean; captions?: { fg?: string; bg?: string; hi?: string } | null; lines: MLine[]; skin?: SkinT };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/* text on a card always reads: black on a light fill, white on a dark one (the shot's ink is for the background) */
const lum = (c: string) => {
  const m = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return 1;
  const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const on = (fill: string) => (lum(fill) > 0.55 ? "#161616" : "#ffffff");
/* the largest font (up to the one asked for) at which the words fit the card: about 0.56em per character, 1.1em per line */
const fit = (text: string, size: number, w: number, h: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  for (let s = size; s > 1.5; s -= 0.25) {
    const per = Math.max(1, Math.floor((w * 0.86) / (s * 0.56)));
    if (Math.max(...words.map((x) => x.length)) > per) continue;
    let lines = 1, cur = 0;
    for (const x of words) { if (cur && cur + 1 + x.length > per) { lines += 1; cur = x.length; } else cur += (cur ? 1 : 0) + x.length; }
    if (lines * s * 1.12 <= h * 0.8) return s;
  }
  return 1.5;
};
const frames = (l: MLine, speed: number) => Math.max(8, Math.round(((l.audio ? l.seconds / speed : l.seconds) + (l.pause ?? 0.3)) * FPS));
export const layoutMotion = (p: MotionProps) => {
  let t = 0;
  const at = p.lines.map((l) => { const s = t; t += frames(l, p.speed ?? 1); return s; });
  return { at, total: t };
};

/* an animated emoji (Google's Noto animated emoji, Lottie JSON): loaded before the frame is drawn, then played on a loop */
function Anim({ src }: { src: string }) {
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [handle] = useState(() => delayRender(`lottie ${src}`));
  useEffect(() => {
    fetch(staticFile(src)).then((r) => r.json()).then((j) => { setData(j); continueRender(handle); }).catch((e) => cancelRender(e));
  }, [handle, src]);
  return data ? <Lottie animationData={data} loop style={{ width: "100%", height: "100%" }} /> : null;
}

/* ---------------- one element ---------------- */
function useEl(el: El, f: number) {
  const { fps } = useVideoConfig();
  const e = el.enter ?? {};
  const start = Math.round((e.at ?? 0) * fps);
  const local = f - start;
  const style = e.style ?? "pop";
  const sp = (stiffness = 380, damping = 15) => spring({ frame: local, fps, config: { stiffness, damping } });
  const lin = interpolate(local, [0, Math.max(1, (e.dur ?? 0.45) * fps)], [0, 1], clamp);
  let tx = 0, ty = 0, sc = 1, rot = 0, op = local < 0 ? 0 : 1, rotY = 0;
  if (style === "pop") { const s = sp(); sc = s; rot = (1 - s) * -10; }
  else if (style === "fade") op = lin;
  else if (style === "rise") { const s = sp(260, 18); ty = (1 - s) * 8; op = Math.min(1, s * 1.4); }
  else if (style === "drop") { const s = sp(300, 14); ty = (1 - s) * -40; }
  else if (style === "left") { const s = sp(260, 20); tx = (1 - s) * -60; }
  else if (style === "right") { const s = sp(260, 20); tx = (1 - s) * 60; }
  else if (style === "zoom") { const s = sp(200, 20); sc = 0.3 + 0.7 * s; op = Math.min(1, s * 1.5); }
  else if (style === "flip") { const s = sp(220, 16); rotY = (1 - s) * 180; }
  else if (style === "stamp") { const s = sp(500, 22); sc = 3 - 2 * s; op = Math.min(1, s * 2); rot = (1 - s) * -14; }
  else if (style === "none") op = 1;
  // after it has arrived: the idle motion that keeps the frame alive
  const t = Math.max(0, local) / fps;
  const loop = el.loop ?? "none";
  if (loop === "bob") ty += Math.sin(t * 3) * 0.8;
  if (loop === "float") { ty += Math.sin(t * 1.6) * 1.4; tx += Math.cos(t * 1.1) * 0.8; }
  if (loop === "pulse") sc *= 1 + Math.sin(t * 5) * 0.035;
  if (loop === "spin") rot += t * 40;
  if (loop === "wiggle") rot += Math.sin(t * 9) * 3;
  if (loop === "blink") op *= 0.55 + 0.45 * Math.abs(Math.cos(t * 3));
  // travel
  let mx = 0, my = 0;
  if (el.move) {
    const m = el.move;
    const k = interpolate(f, [m.at * fps, (m.at + (m.dur ?? 0.8)) * fps], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
    mx = (m.x - el.x) * k; my = (m.y - el.y) * k;
    rotY += (m.spin ?? 0) * k;
    sc *= 1 + ((m.scale ?? 1) - 1) * k;
  }
  if (el.exit) {
    const k = interpolate(f, [el.exit.at * fps, (el.exit.at + 0.3) * fps], [0, 1], clamp);
    if (el.exit.style === "pop") sc *= 1 - k; else if (el.exit.style === "drop") { ty += k * 40; op *= 1 - k; } else op *= 1 - k;
  }
  return { tx: tx + mx, ty: ty + my, sc, rot: rot + (el.r ?? 0), op: op * (el.opacity ?? 1), rotY, local, lin, start, style };
}

function Shadow(el: El, ink: string, fallback?: "hard" | "soft" | "none"): string | undefined {
  const sh = el.shadow ?? fallback;
  if (sh === "none") return undefined;
  if (sh === "soft") return "0 1.6u 3.2u -0.8u rgb(0 0 0/0.32)".replace(/u/g, "em");
  return `1.2em 1.2em 0 ${el.shadowColor ?? ink}`;
}

function Words({ text, mark, markColor, local, typing, color }: { text: string; mark?: string; markColor: string; local: number; typing: boolean; color: string }) {
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const marked = new Set((mark ?? "").toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/[^\p{L}\p{N}₹$%]/gu, "")));
  return (
    <>
      {words.map((w, i) => {
        const d = i * (typing ? 0.09 : 0.12) * fps;
        const s = spring({ frame: local - d, fps, config: { stiffness: 380, damping: 16 } });
        const hit = marked.has(w.toLowerCase().replace(/[^\p{L}\p{N}₹$%]/gu, ""));
        const m = interpolate(local - d - 0.22 * fps, [0, 0.3 * fps], [0, 1], clamp);
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", marginRight: "0.25em", transform: `translateY(${(1 - s) * 0.5}em) scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5) }}>
            {hit && <span style={{ position: "absolute", left: "-0.08em", right: "-0.08em", top: "0.2em", bottom: "0.02em", background: markColor, borderRadius: "0.12em", transform: `scaleX(${m})`, transformOrigin: "left" }} />}
            <span style={{ position: "relative", color: hit ? "#111" : color }}>{w}</span>
          </span>
        );
      })}
    </>
  );
}

function star(n = 5, inner = 0.45) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n - Math.PI / 2, r = i % 2 ? 50 * inner : 50; pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`); }
  return pts.join(" ");
}

function Element({ el, f, ink, accent }: { el: El; f: number; ink: string; accent: string }) {
  const { fps } = useVideoConfig();
  const a = useEl(el, f);
  const skin = useContext(Skin);
  const w = el.w ?? 20, h = el.h ?? 20;
  const wrap: CSSProperties = {
    position: "absolute", left: `${el.x}em`, top: `${el.y}em`, width: `${w}em`, height: el.type === "text" ? undefined : `${h}em`, zIndex: el.z ?? 1,
    opacity: a.op, transform: `translate(${a.tx}em, ${a.ty}em) perspective(80em) rotateY(${a.rotY}deg) rotate(${a.rot}deg) scale(${a.sc})`,
  };
  const color = el.color ?? ink;
  let body: ReactNode = null;

  if (el.type === "text") {
    body = (
      <div style={{ fontSize: `${el.size ?? 8}em`, fontWeight: el.weight ?? skin.weight ?? 800, lineHeight: 1.05, letterSpacing: "-0.02em", textAlign: el.align ?? "center", color }}>
        <Words text={el.text ?? ""} mark={el.mark} markColor={el.markColor ?? accent} local={a.local} typing={a.style === "type"} color={color} />
      </div>
    );
    if (a.style === "type") wrap.opacity = el.opacity ?? 1;
  } else if (el.type === "box" || el.type === "sticky") {
    const sticky = el.type === "sticky";
    const fill = el.fill ?? (sticky ? "#f6f39a" : skin.box?.fill ?? "#fff");
    const tc = el.color && Math.abs(lum(el.color) - lum(fill)) > 0.4 ? el.color : on(fill);
    const edge = el.stroke ?? (lum(fill) > 0.55 ? "#161616" : ink);
    body = (
      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", position: "relative", padding: "1.6em", textAlign: "center",
        background: fill, border: sticky ? undefined : `${el.strokeWidth ?? skin.box?.strokeWidth ?? 0.6}em solid ${edge}`,
        borderRadius: sticky ? "0.4em" : `${el.radius ?? skin.box?.radius ?? 2.4}em`, boxShadow: sticky ? "0.8em 1.4em 2em -0.6em rgb(0 0 0/0.35)" : Shadow(el, ink, skin.box?.shadow) }}>
        {(sticky || el.tape) && <span style={{ position: "absolute", left: "50%", top: "-2em", width: "12em", height: "4em", marginLeft: "-6em", background: "rgba(255,255,255,0.72)", boxShadow: "0 0.2em 0.6em rgb(0 0 0/0.12)", transform: `rotate(${-(el.r ?? 0) * 1.5 - 4}deg)` }} />}
        {el.text && <span style={{ fontSize: `${fit(el.text, el.size ?? 5, w - 3.2, h - 3.2)}em`, fontWeight: el.weight ?? skin.weight ?? 800, lineHeight: 1.05, color: tc }}>{el.text}</span>}
      </div>
    );
  } else if (el.type === "shape") {
    const fill = el.fill ?? accent, stroke = el.stroke ?? "none", sw = el.strokeWidth ?? 0;
    const s = el.shape ?? "circle";
    body = (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        {s === "rect" && <rect x="0" y="0" width="100" height="100" rx={el.radius ?? 0} fill={fill} stroke={stroke} strokeWidth={sw} />}
        {s === "pill" && <rect x="0" y="0" width="100" height="100" rx="50" fill={fill} stroke={stroke} strokeWidth={sw} />}
        {s === "circle" && <ellipse cx="50" cy="50" rx="50" ry="50" fill={fill} stroke={stroke} strokeWidth={sw} />}
        {s === "ring" && <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke={el.stroke ?? fill} strokeWidth={sw || 8} />}
        {s === "star" && <polygon points={star()} fill={fill} stroke={stroke} strokeWidth={sw} />}
        {s === "burst" && <polygon points={star(12, 0.7)} fill={fill} stroke={stroke} strokeWidth={sw} />}
        {s === "blob" && <path d="M50 2 C78 2 98 22 96 50 C94 80 74 98 48 97 C20 96 3 76 4 48 C5 20 24 2 50 2 Z" fill={fill} stroke={stroke} strokeWidth={sw} />}
        {s === "line" && <line x1="0" y1="50" x2="100" y2="50" stroke={el.stroke ?? fill} strokeWidth={sw || 6} strokeLinecap="round" />}
      </svg>
    );
  } else if (el.type === "arrow") {
    const [x1, y1] = el.from ?? [el.x, el.y], [x2, y2] = el.to ?? [el.x + w, el.y];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, c = el.curve ?? 0;
    const nx = -(y2 - y1), ny = x2 - x1, len = Math.hypot(nx, ny) || 1;
    const cx = mx + (nx / len) * c, cy = my + (ny / len) * c;
    const k = interpolate(a.local, [0, (el.enter?.dur ?? 0.6) * fps], [0, 1], clamp);
    const ang = Math.atan2(y2 - cy, x2 - cx);
    const sw = el.strokeWidth ?? 1;
    return (
      <svg style={{ position: "absolute", left: 0, top: 0, width: "1em", height: "1em", overflow: "visible", zIndex: el.z ?? 1, opacity: a.local < 0 ? 0 : el.opacity ?? 1 }} viewBox="0 0 1 1">
        <path d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} fill="none" stroke={el.stroke ?? ink} strokeWidth={sw} strokeLinecap="round" pathLength={1}
          strokeDasharray={el.dashed ? `${0.03} ${0.025}` : "1 1"} strokeDashoffset={el.dashed ? undefined : 1 - k}
          style={el.dashed ? { clipPath: `inset(0 ${(1 - k) * 100}% 0 0)` } : undefined} />
        {(el.head ?? true) && k > 0.95 && (
          <polygon points={`${x2},${y2} ${x2 - 3 * sw * Math.cos(ang - 0.5)},${y2 - 3 * sw * Math.sin(ang - 0.5)} ${x2 - 3 * sw * Math.cos(ang + 0.5)},${y2 - 3 * sw * Math.sin(ang + 0.5)}`} fill={el.stroke ?? ink} />
        )}
      </svg>
    );
  } else if (el.type === "icon" || el.type === "image") {
    const frame = el.frame ?? (el.type === "icon" ? "none" : "card");
    const mono = !!el.src && el.src.includes(".mono.");
    const lottie = !!el.src && el.src.endsWith(".json");
    // a one-colour glyph is painted through its own shape in the element's colour (or the shot's ink)
    const img = el.src && lottie ? <Anim src={el.src} /> : el.src && mono ? (
      <div style={{ width: "100%", height: "100%", background: el.color ?? ink, WebkitMaskImage: `url(${staticFile(el.src)})`, maskImage: `url(${staticFile(el.src)})`,
        WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
    ) : el.src ? <Img src={staticFile(el.src)} style={{ width: "100%", height: "100%", objectFit: el.type === "icon" || frame === "none" ? "contain" : "cover", borderRadius: frame === "circle" ? "50%" : frame === "card" ? "1.6em" : 0 }} /> : null;
    body = frame === "polaroid" ? (
      <div style={{ width: "100%", height: "100%", background: "#fff", padding: "1.4em 1.4em 5em", boxShadow: "0.8em 1.4em 2.4em -0.6em rgb(0 0 0/0.4)", position: "relative" }}>
        <span style={{ position: "absolute", left: "50%", top: "-2em", width: "12em", height: "4em", marginLeft: "-6em", background: "rgba(255,255,255,0.75)", transform: "rotate(-4deg)" }} />
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>{img}</div>
        {el.text && <div style={{ position: "absolute", left: 0, right: 0, bottom: "1em", textAlign: "center", fontSize: "3em", fontWeight: 700, color: "#222" }}>{el.text}</div>}
      </div>
    ) : frame === "card" || frame === "circle" ? (
      <div style={{ width: "100%", height: "100%", border: `0.6em solid ${el.stroke ?? ink}`, borderRadius: frame === "circle" ? "50%" : "2.2em", overflow: "hidden", boxShadow: Shadow(el, ink, skin.box?.shadow), background: "#fff" }}>{img}</div>
    ) : img;
  } else if (el.type === "counter") {
    const m = (el.value ?? "").match(/^(\D*?)([\d,]*\.?\d+)(.*)$/);
    let shown = el.value ?? "";
    if (m) {
      const target = parseFloat(m[2].replace(/,/g, "")), dec = (m[2].split(".")[1] ?? "").length;
      const k = interpolate(a.local, [0, (el.enter?.dur ?? 0.9) * fps], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
      shown = m[1] + (target * k).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3];
    }
    body = <div style={{ fontSize: `${el.size ?? 16}em`, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color, textAlign: el.align ?? "center", fontVariantNumeric: "tabular-nums" }}>{shown}</div>;
    wrap.height = undefined;
  } else if (el.type === "bars") {
    const bars = el.bars ?? [];
    const max = Math.max(...bars.map((b) => b.value), 1);
    body = (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", gap: "2.4em" }}>
        {bars.map((b, i) => {
          const k = spring({ frame: a.local - i * 0.15 * fps, fps, config: { stiffness: 160, damping: 18 } });
          return (
            <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
              <div style={{ fontSize: "3.6em", fontWeight: 800, color, opacity: k }}>{b.display ?? b.value}</div>
              <div style={{ width: "100%", height: `${(b.value / max) * 70 * k}%`, background: b.color ?? accent, border: `0.5em solid ${ink}`, borderRadius: "1em 1em 0 0" }} />
              <div style={{ fontSize: "3em", fontWeight: 700, color, marginTop: "0.6em", textAlign: "center", lineHeight: 1.05 }}>{b.label}</div>
            </div>
          );
        })}
      </div>
    );
  } else if (el.type === "phone") {
    body = (
      <div style={{ width: "100%", height: "100%", position: "relative", background: el.fill ?? "#fff", border: `0.8em solid ${el.stroke ?? ink}`, borderRadius: "3.4em", boxShadow: Shadow(el, ink), overflow: "hidden" }}>
        <span style={{ position: "absolute", left: "50%", top: "1.4em", width: "8em", height: "1.6em", marginLeft: "-4em", borderRadius: 99, background: el.stroke ?? ink }} />
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: "4em 2em 2em", textAlign: "center", fontSize: `${el.size ?? 6}em`, fontWeight: 800, lineHeight: 1.05, color: el.color && Math.abs(lum(el.color) - lum(el.fill ?? "#fff")) > 0.4 ? el.color : on(el.fill ?? "#fff") }}>{el.text}</div>
      </div>
    );
  }
  return <div style={wrap}>{body}</div>;
}

/* ---------------- backgrounds ---------------- */
function background(bg: Bg, u: number): CSSProperties {
  const c = bg.colors?.length ? bg.colors : ["#f7f5ee"];
  const base = bg.type === "linear" ? `linear-gradient(${bg.angle ?? 160}deg, ${c.join(", ")})`
    : bg.type === "radial" ? `radial-gradient(circle at 50% 40%, ${c.join(", ")})` : c[0];
  const pc = bg.patternColor ?? "rgb(0 0 0/0.12)";
  const p = bg.pattern ?? "none";
  const layer = p === "dots" ? { img: `radial-gradient(${pc} ${u * 0.14}px, transparent ${u * 0.17}px)`, size: `${u * 4.5}px ${u * 4.5}px` }
    : p === "grid" ? { img: `linear-gradient(${pc} 1px, transparent 1px), linear-gradient(90deg, ${pc} 1px, transparent 1px)`, size: `${u * 6}px ${u * 6}px` }
    : p === "stripes" ? { img: `repeating-linear-gradient(135deg, ${pc} 0 ${u * 3}px, transparent ${u * 3}px ${u * 6}px)`, size: "auto" }
    : p === "rays" ? { img: `repeating-conic-gradient(from 0deg at 50% 45%, ${pc} 0deg 9deg, transparent 9deg 18deg)`, size: "auto" }
    : p === "paper" ? { img: `radial-gradient(${pc} 1px, transparent 1.5px)`, size: `${u * 3}px ${u * 3}px` } : null;
  return layer
    ? { backgroundImage: `${layer.img}, ${base.startsWith("#") || base.startsWith("rgb") ? `linear-gradient(${base}, ${base})` : base}`, backgroundSize: `${layer.size}, 100% 100%` }
    : { background: base };
}

function SceneView({ scene, f, dur, u, vertical }: { scene: Scene; f: number; dur: number; u: number; vertical: boolean }) {
  const skin = useContext(Skin);
  const ink = scene.ink ?? "#1f1c1b", accent = scene.accent ?? "#ffd23f";
  const k = f / Math.max(1, dur);
  const cam = scene.camera ?? "push";
  const s = cam === "push" ? 1 + 0.05 * k : cam === "pull" ? 1.05 - 0.05 * k : 1;
  const dx = cam === "drift" ? (k - 0.5) * 2 : 0;
  const enter = interpolate(f, [0, 7], [0, 1], clamp); // every cut lands with a small settle
  return (
    <AbsoluteFill style={background(scene.bg, u)}>
      {skin.plate && <Img src={staticFile(skin.plate)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: skin.plateOpacity ?? 1,
        transform: `scale(${1.02 + 0.03 * k})` }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: vertical ? `${100 * u}px` : `${177.8 * u}px`, height: vertical ? `${177.8 * u}px` : `${100 * u}px`,
        fontSize: `${u}px`, fontFamily: skin.family, transformOrigin: "50% 45%", transform: `translateX(${dx}em) scale(${s * (1.04 - 0.04 * enter)})` }}>
        {[...scene.elements].sort((a, b) => (a.z ?? 1) - (b.z ?? 1)).map((el, i) => <Element key={i} el={el} f={f} ink={ink} accent={accent} />)}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- captions: the line being said, the current word lit ---------------- */
function Captions({ text, f, dur, u, vertical, style }: { text: string; f: number; dur: number; u: number; vertical: boolean; style: { fg?: string; bg?: string; hi?: string } }) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const weights = words.map((w) => w.length + 2), sum = weights.reduce((a, b) => a + b, 0);
  const k = Math.min(0.999, f / Math.max(1, dur * 0.94));
  let acc = 0, cur = 0;
  for (let i = 0; i < words.length; i++) { acc += weights[i] / sum; if (k < acc) { cur = i; break; } }
  const chunk = 6, from = Math.floor(cur / chunk) * chunk, shown = words.slice(from, from + chunk);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: vertical ? `${22 * u}px` : `${5 * u}px`, display: "flex", justifyContent: "center", fontFamily: useContext(Skin).family }}>
      <div style={{ maxWidth: `${(vertical ? 88 : 140) * u}px`, textAlign: "center", fontSize: `${(vertical ? 6.2 : 4.6) * u}px`, fontWeight: 800, lineHeight: 1.15, padding: `${0.6 * u}px ${1.6 * u}px`, borderRadius: `${1.4 * u}px`, background: style.bg ?? "rgb(17 17 17/0.82)", color: style.fg ?? "#fff" }}>
        {shown.map((w, i) => <span key={i}><span style={{ color: from + i === cur ? style.hi ?? "#ffd23f" : undefined }}>{w}</span>{" "}</span>)}
      </div>
    </div>
  );
}

export function Motion(p: MotionProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 100;
  const vertical = height > width;
  const speed = p.speed ?? 1;
  const { at } = layoutMotion(p);
  const skin = { ...(p.skin ?? {}), family: familyOf(p.skin?.font) };
  return (
    <Skin.Provider value={skin}>
    <AbsoluteFill style={{ background: "#111" }}>
      {p.lines.map((l, i) => {
        const dur = frames(l, speed);
        const n = Math.max(1, l.scenes.length);
        return (
          <Sequence key={i} from={at[i]} durationInFrames={dur}>
            {l.scenes.map((sc, j) => {
              const s0 = Math.round((j * dur) / n), s1 = Math.round(((j + 1) * dur) / n);
              return (
                <Sequence key={j} from={s0} durationInFrames={s1 - s0}>
                  <SceneAt scene={sc} dur={s1 - s0} u={u} vertical={vertical} />
                </Sequence>
              );
            })}
            {l.audio && <Audio src={staticFile(l.audio)} playbackRate={speed} />}
            {l.sfx && <Audio src={staticFile(`sfx/${l.sfx}.wav`)} volume={0.22} />}
            {l.speech && p.captions !== null && <CaptionsAt text={l.speech} dur={dur} u={u} vertical={vertical} style={p.captions ?? {}} />}
          </Sequence>
        );
      })}
      {frame < 0 && null}
    </AbsoluteFill>
    </Skin.Provider>
  );
}

function SceneAt(props: { scene: Scene; dur: number; u: number; vertical: boolean }) {
  const f = useCurrentFrame();
  return <SceneView {...props} f={f} />;
}
function CaptionsAt(props: { text: string; dur: number; u: number; vertical: boolean; style: { fg?: string; bg?: string; hi?: string } }) {
  const f = useCurrentFrame();
  return <Captions {...props} f={f} />;
}
