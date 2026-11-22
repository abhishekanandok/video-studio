/* The Argon kit: the small library the motion agent (video/argon.py) writes its scenes with. Gemini Argon designs every
   scene itself, as a React component; this kit only gives it timing on the spoken words, the film's theme, and
   primitives that move well (appear, draw on, travel along a path, photos with pointer callouts, stickers, counters,
   charts, kinetic words). The stage is 1920 x 1080 px (1080 x 1920 vertical); every position is in stage px.

   A scene component:  export default function Scene() { const s = useScene(); ... return <Stage>...</Stage>; }
   s.t is the time in seconds since the scene started; s.at("evaporation") is when that word is said. */

import { loadFont as baloo } from "@remotion/google-fonts/Baloo2";
import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as caveat } from "@remotion/google-fonts/Caveat";
import { loadFont as fredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as lora } from "@remotion/google-fonts/Lora";
import { loadFont as newsreader } from "@remotion/google-fonts/Newsreader";
import { loadFont as nunito } from "@remotion/google-fonts/Nunito";
import { loadFont as oswald } from "@remotion/google-fonts/Oswald";
import { loadFont as marker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as poppins } from "@remotion/google-fonts/Poppins";
import { loadFont as grotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { paletteVars } from "./lib/palette";
import { AbsoluteFill, Img, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/* ---------------- the theme and the scene's timing ---------------- */
export type Theme = {
  bg: string[]; ink: string; accent: string; accent2: string; paper: string; muted: string;
  font: string; display: string; plate?: string; radius?: number; outline?: number; shadow?: "hard" | "soft" | "none";
  /* the motion library's palette and look (lib/palette.ts, lib/style.tsx): how far its drawn colours lean toward this
     theme (0-1, default 0.25), colours set outright, and the film's look ("paper", "sketch"…) */
  tint?: number; palette?: Record<string, string>; look?: string;
  /* the film's text-box style (looks.py BOX: card, rule, outline...): a <Card> with no design picks one that fits it */
  box?: string;
  card?: string; enter?: string;  // the film's pinned card design and entrance (looks.py clean_pin): a <Card> with no design or motion takes them
};
export type Word = { w: string; s: number; e: number }; // seconds from the scene's start
type Ctx = { theme: Theme; words: Word[]; dur: number; W: number; H: number; dir: string };
export const SceneCtx = createContext<Ctx>({ theme: {} as Theme, words: [], dur: 5, W: 1920, H: 1080, dir: "" });
/** (was stop-motion timing, held frames "on twos"; it made walks jump, so it is off: every motion is smooth) */
const StepCtx = createContext(0);
export function Steps({ children }: { fps?: number; children: ReactNode }) { return <StepCtx.Provider value={0}>{children}</StepCtx.Provider>; }  // motion is always smooth now: steps are no longer held

type Loader = (style?: string, options?: object) => { fontFamily: string };
const FONTS: Record<string, [Loader, string[]]> = {
  baloo: [baloo as Loader, ["400", "600", "700", "800"]], inter: [inter as Loader, ["400", "600", "800"]], fredoka: [fredoka as Loader, ["400", "600", "700"]],
  playfair: [playfair as Loader, ["400", "700", "800"]], space_grotesk: [grotesk as Loader, ["400", "600", "700"]], caveat: [caveat as Loader, ["400", "700"]],
  oswald: [oswald as Loader, ["400", "600", "700"]], newsreader: [newsreader as Loader, ["400", "600", "800"]], permanent_marker: [marker as Loader, ["400"]],
  poppins: [poppins as Loader, ["400", "600", "800"]], lora: [lora as Loader, ["400", "700"]], bebas: [bebas as Loader, ["400"]], nunito: [nunito as Loader, ["400", "700", "800"]],
};
const loaded: Record<string, string> = {};
/** fonts from outside this list (the print kit's 130, src/print/kit.tsx), registered by src/print/bridge.tsx so the
 *  library's blocks can set type in a look's fonts */
let outside: ((name: string) => string | undefined) | null = null;
export function registerFonts(resolve: (name: string) => string | undefined) { outside = resolve; }
export function family(name: string): string {
  if (!FONTS[name] && outside) { const f = outside(name); if (f) return f; }
  const k = FONTS[name] ? name : "inter";
  if (!loaded[k]) loaded[k] = FONTS[k][0]("normal", { weights: FONTS[k][1], subsets: ["latin"] }).fontFamily;
  return loaded[k];
}

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** everything a scene needs: t (s since the scene began), dur (s), the theme, the stage size, and at(word) */
export function useScene() {
  const c = useContext(SceneCtx);
  const step = useContext(StepCtx);
  const { fps } = useVideoConfig();
  const raw = useCurrentFrame();
  const hold = step > 0 ? Math.max(1, Math.round(fps / step)) : 1;
  const frame = Math.floor(raw / hold) * hold;
  const t = frame / fps;
  /** when a word (or the first word of a phrase, or the i-th word) is said, in seconds from the scene's start; fallback if not found */
  const at = (w: string | number, fallback = 0): number => {
    if (typeof w === "number") return c.words[Math.max(0, Math.min(c.words.length - 1, w))]?.s ?? fallback;
    const first = norm(w.split(/\s+/)[0] ?? "");
    const hit = c.words.find((x) => norm(x.w) === first) ?? c.words.find((x) => first.length > 3 && norm(x.w).startsWith(first.slice(0, 4)));
    return hit ? hit.s : fallback;
  };
  return { t, frame, fps, dur: c.dur, theme: c.theme, W: c.W, H: c.H, words: c.words, at, asset: (name: string) => staticFile(`${c.dir}/${name}`) };
}

/* ---------------- easing ---------------- */
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 0 -> 1 between start and start+dur (seconds), eased out */
export const prog = (t: number, start: number, dur = 0.6) => { const k = clamp01((t - start) / Math.max(0.01, dur)); return 1 - Math.pow(1 - k, 3); };
/** a springy 0 -> ~1 entrance starting at `start` seconds */
export function usePop(start: number, stiffness = 220, damping = 14): number {
  const { frame, fps } = useScene();
  return spring({ frame: frame - start * fps, fps, config: { stiffness, damping } });
}

/* ---------------- the stage ---------------- */
/** the scene's root: the scene's own BACKDROP (its world: a map, a real photo or a painted scene; full screen, slow push),
    else the theme's ground; `scrim` (0-0.7) darkens the backdrop so text reads; `focus` [0-1, 0-1] is where the camera pushes in */
export function Stage({ children, bg, push = 0.04, plate = true, backdrop, scrim = 0, focus = [0.5, 0.5] }: {
  children: ReactNode; bg?: string[]; push?: number; plate?: boolean; backdrop?: string; scrim?: number; focus?: [number, number];
}) {
  const { t, dur, theme, W, H } = useScene();
  const k = clamp01(t / Math.max(0.1, dur));
  const colors = bg ?? theme.bg;
  const ground = colors.length > 1 ? `linear-gradient(160deg, ${colors.join(", ")})` : colors[0];
  return (
    <AbsoluteFill style={{ background: ground, overflow: "hidden", ...paletteVars(theme) }}>
      {backdrop ? <Img src={backdrop} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${1.02 + 0.08 * k})` }} />
        : plate && theme.plate && <Img src={staticFile(theme.plate)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.03 + 0.04 * k})` }} />}
      {scrim > 0 && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgb(0 0 0/${scrim}), rgb(0 0 0/${scrim * 0.4}) 45%, rgb(0 0 0/${scrim}))` }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, fontFamily: family(theme.font), color: theme.ink, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${1 + push * k})` }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}

/** absolute placement on the stage, in px */
export function At({ x, y, w, h, z, id, anchor = "topleft", children, style }: { x: number; y: number; w?: number; h?: number; z?: number; id?: string; anchor?: "topleft" | "center"; children: ReactNode; style?: CSSProperties }) {
  // anchor "center": x, y is the piece's centre, not its top-left corner (the equator bug: a globe placed by its corner,
  // its equator drawn as if x, y were its centre); id: labels can point at it (to="id.top", "id.center", or its own points)
  const c = anchor === "center";
  return <div data-piece={id} style={{ position: "absolute", left: x, top: y, width: w, height: h, zIndex: z, ...(c ? { transform: "translate(-50%, -50%)", display: w ? undefined : "inline-block" } : {}), ...style }}>{children}</div>;
}

/** children arrive at `at` seconds: from a direction, scaling, or fading; optionally leave at `out` */
export function Appear({ at, from = "up", dur = 0.5, out, children, style }: { at: number; from?: "up" | "down" | "left" | "right" | "scale" | "fade" | "drop"; dur?: number; out?: number; children: ReactNode; style?: CSSProperties }) {
  const { t } = useScene();
  const p = usePop(at, from === "drop" ? 260 : 200, from === "drop" ? 11 : 16);
  const k = from === "fade" ? prog(t, at, dur) : p;
  const gone = out !== undefined ? prog(t, out, 0.35) : 0;
  const d = 60 * (1 - k);
  const tr = from === "up" ? `translateY(${d}px)` : from === "down" ? `translateY(${-d}px)` : from === "left" ? `translateX(${-d * 2}px)` : from === "right" ? `translateX(${d * 2}px)`
    : from === "drop" ? `translateY(${-140 * (1 - k)}px)` : from === "scale" ? `scale(${0.3 + 0.7 * k})` : "";
  return <div style={{ opacity: t < at ? 0 : Math.min(1, k * 1.4) * (1 - gone), transform: `${tr} scale(${1 - 0.15 * gone})`, ...style }}>{children}</div>;
}

/** an idle motion that keeps a thing alive */
export function Loop({ kind = "bob", amount = 1, children }: { kind?: "bob" | "spin" | "pulse" | "sway" | "float"; amount?: number; children: ReactNode }) {
  const { t } = useScene();
  const tr = kind === "bob" ? `translateY(${Math.sin(t * 3) * 8 * amount}px)` : kind === "spin" ? `rotate(${t * 40 * amount}deg)`
    : kind === "pulse" ? `scale(${1 + Math.sin(t * 4) * 0.05 * amount})` : kind === "sway" ? `rotate(${Math.sin(t * 2) * 5 * amount}deg)` : `translate(${Math.sin(t * 1.3) * 10 * amount}px, ${Math.cos(t * 1.1) * 8 * amount}px)`;
  return <div style={{ transform: tr, transformOrigin: "50% 60%", width: "100%", height: "100%" }}>{children}</div>;
}

/* ---------------- words ---------------- */
/** kinetic words: each word pops in on its own spoken time when `sync` (else staggered from `at`); `mark` words get the accent marker */
export function Words({ text, at, size = 96, color, mark = [], markColor, weight = 800, display = true, sync = false, stagger = 0.12, align = "center", width }: {
  text: string; at: number; size?: number; color?: string; mark?: string[]; markColor?: string; weight?: number; display?: boolean; sync?: boolean; stagger?: number; align?: "left" | "center" | "right"; width?: number;
}) {
  const s = useScene();
  const marked = new Set(mark.map(norm));
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div style={{ fontFamily: family(display ? s.theme.display : s.theme.font), fontSize: size, fontWeight: weight, lineHeight: 1.05, letterSpacing: "-0.01em", textAlign: align, width, color: color ?? s.theme.ink }}>
      {words.map((w, i) => {
        const start = sync ? s.at(w, at + i * stagger) : at + i * stagger;
        const k = spring({ frame: s.frame - start * s.fps, fps: s.fps, config: { stiffness: 380, damping: 18 } });
        const hit = marked.has(norm(w));
        const m = prog(s.t, start + 0.15, 0.3);
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", marginRight: "0.25em", opacity: s.t < start ? 0 : Math.min(1, k * 1.5), transform: `translateY(${(1 - k) * 0.4}em)` }}>
            {hit && <span style={{ position: "absolute", left: "-0.08em", right: "-0.08em", top: "0.18em", bottom: "0.02em", background: markColor ?? s.theme.accent, borderRadius: "0.12em", transform: `scaleX(${m})`, transformOrigin: "left", zIndex: -1 }} />}
            {w}
          </span>
        );
      })}
    </div>
  );
}

/** a label chip / card with the theme's card style */
export function Card({ children, fill, color, pad = 28, style }: { children: ReactNode; fill?: string; color?: string; pad?: number; style?: CSSProperties }) {
  const { theme } = useScene();
  const sh = theme.shadow ?? "soft";
  return (
    <div style={{ background: fill ?? theme.paper, color: color ?? theme.ink, padding: pad, borderRadius: theme.radius ?? 28, border: `${theme.outline ?? 0}px solid ${theme.ink}`,
      boxShadow: sh === "hard" ? `10px 10px 0 ${theme.ink}` : sh === "soft" ? "0 24px 48px -20px rgb(0 0 0/0.45)" : undefined, fontFamily: family(theme.font), ...style }}>
      {children}
    </div>
  );
}

/* ---------------- lines that draw, things that travel ---------------- */
/** an SVG path (stage px) that draws itself from `at` over `dur` seconds */
export function DrawPath({ d, at, dur = 0.9, stroke, width = 8, dashed = false, fill = "none", arrow = false, opacity = 1 }: {
  d: string; at: number; dur?: number; stroke?: string; width?: number; dashed?: boolean; fill?: string; arrow?: boolean; opacity?: number;
}) {
  const s = useScene();
  const k = prog(s.t, at, dur);
  const len = getLength(d);
  const color = stroke ?? s.theme.ink;
  let head: ReactNode = null;
  if (arrow && k > 0.02) {
    const p = getPointAtLength(d, len * k) ?? { x: 0, y: 0 }, tg = getTangentAtLength(d, len * k) ?? { x: 1, y: 0 };
    const a = Math.atan2(tg.y, tg.x), r = width * 3.2;
    head = <polygon points={`${p.x},${p.y} ${p.x - r * Math.cos(a - 0.45)},${p.y - r * Math.sin(a - 0.45)} ${p.x - r * Math.cos(a + 0.45)},${p.y - r * Math.sin(a + 0.45)}`} fill={color} />;
  }
  return (
    <svg width={s.W} height={s.H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", opacity }}>
      <path d={d} fill={k >= 1 ? fill : "none"} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={dashed ? `${width * 2} ${width * 2}` : `${len} ${len}`} strokeDashoffset={dashed ? 0 : len * (1 - k)}
        style={dashed ? { clipPath: `inset(0 ${(1 - k) * 100}% 0 0)` } : undefined} />
      {head}
    </svg>
  );
}

/** an arrow from one point to another (curve bends it), drawing itself */
export function Arrow({ from, to, at, dur = 0.6, curve = 0, stroke, width = 8, dashed = false }: { from: [number, number]; to: [number, number]; at: number; dur?: number; curve?: number; stroke?: string; width?: number; dashed?: boolean }) {
  const [x1, y1] = from, [x2, y2] = to;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1;
  const d = `M ${x1} ${y1} Q ${mx + (nx / l) * curve} ${my + (ny / l) * curve} ${x2} ${y2}`;
  return <DrawPath d={d} at={at} dur={dur} stroke={stroke} width={width} dashed={dashed} arrow />;
}

/** a thing that travels along a path (stage px): once from `at` over `dur`, or looping every `dur` seconds; rotate follows the path */
export function Travel({ d, at, dur = 1.6, loop = false, rotate = false, size = 80, children }: { d: string; at: number; dur?: number; loop?: boolean; rotate?: boolean; size?: number; children: ReactNode }) {
  const s = useScene();
  if (s.t < at) return null;
  const raw = (s.t - at) / dur;
  const k = loop ? raw % 1 : clamp01(raw);
  const e = loop ? k : 1 - Math.pow(1 - k, 2);
  const len = getLength(d);
  const p = getPointAtLength(d, len * e) ?? { x: 0, y: 0 };
  const tg = getTangentAtLength(d, len * e) ?? { x: 1, y: 0 };
  const fade = loop ? Math.min(1, k * 8, (1 - k) * 8) : 1;
  return <div style={{ position: "absolute", left: p.x - size / 2, top: p.y - size / 2, width: size, height: size, opacity: fade, transform: rotate ? `rotate(${Math.atan2(tg.y, tg.x)}rad)` : undefined }}>{children}</div>;
}

/* ---------------- pictures ---------------- */
export type Callout = { x: number; y: number; label: string; at: number; side?: "left" | "right" | "up" | "down" };
/** a photo (or drawn picture) placed on the stage: slow push-in, a frame, and pointer callouts that point at parts of it.
    Callout x/y are 0-1 positions INSIDE the picture. */
export function Photo({ src, x, y, w, h, at = 0, frame = "card", push = 0.08, callouts = [], credit, from = "scale" }: {
  src: string; x: number; y: number; w: number; h: number; at?: number; frame?: "card" | "polaroid" | "circle" | "none" | "full"; push?: number; callouts?: Callout[]; credit?: string; from?: "up" | "scale" | "fade" | "left" | "right";
}) {
  const s = useScene();
  const k = prog(s.t, at, Math.max(0.5, s.dur - at));
  const pol = frame === "polaroid";
  const box: CSSProperties = frame === "circle" ? { borderRadius: "50%", border: `10px solid ${s.theme.paper}`, boxShadow: "0 30px 60px -24px rgb(0 0 0/0.5)" }
    : frame === "card" ? { borderRadius: s.theme.radius ?? 24, border: `${Math.max(6, s.theme.outline ?? 0)}px solid ${s.theme.paper}`, boxShadow: "0 30px 60px -24px rgb(0 0 0/0.5)" }
    : pol ? { background: "#fff", padding: "18px 18px 70px", boxShadow: "0 30px 60px -20px rgb(0 0 0/0.5)" } : {};
  return (
    <At x={x} y={y} w={w} h={h}>
      <Appear at={at} from={from}>
        <div style={{ width: w, height: h, position: "relative", ...box, overflow: frame === "none" ? "visible" : "hidden", boxSizing: "border-box" }}>
          {src.includes(".mono.") ? (
            <div style={{ position: "absolute", inset: "12%", background: s.theme.accent, WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: "contain", maskSize: "contain",
              WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", transform: `scale(${1 + push * k})` }} />
          ) : <Img src={src} style={{ width: "100%", height: "100%", objectFit: frame === "none" ? "contain" : "cover", transform: `scale(${1 + push * k})`, transformOrigin: "50% 45%", borderRadius: frame === "circle" ? "50%" : undefined }} />}
          {credit && <div style={{ position: "absolute", right: 10, bottom: pol ? 20 : 8, fontSize: 18, color: pol ? "#666" : "rgb(255 255 255/0.8)", textShadow: pol ? undefined : "0 1px 3px rgb(0 0 0/0.8)" }}>{credit}</div>}
        </div>
      </Appear>
      {callouts.map((c, i) => <CalloutPin key={i} c={c} w={w} h={h} />)}
    </At>
  );
}

function CalloutPin({ c, w, h }: { c: Callout; w: number; h: number }) {
  const s = useScene();
  const px = c.x * w, py = c.y * h;
  const side = c.side ?? (c.x > 0.5 ? "right" : "left");
  const dx = side === "left" ? -230 : side === "right" ? 230 : 0, dy = side === "up" ? -170 : side === "down" ? 170 : -60;
  const k = prog(s.t, c.at, 0.5);
  const pop = usePop(c.at + 0.25);
  if (s.t < c.at) return null;
  return (
    <>
      <div style={{ position: "absolute", left: px - 16, top: py - 16, width: 32, height: 32, borderRadius: "50%", background: s.theme.accent, border: `5px solid ${s.theme.paper}`, transform: `scale(${pop})`, boxShadow: "0 0 0 10px rgb(255 255 255/0.25)" }} />
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <line x1={px} y1={py} x2={px + dx * k} y2={py + dy * k} stroke={s.theme.paper} strokeWidth={5} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: px + dx, top: py + dy, transform: `translate(${side === "left" ? "-100%" : side === "right" ? "0" : "-50%"}, -50%) scale(${pop})`, transformOrigin: "center",
        background: s.theme.paper, color: s.theme.ink, padding: "10px 20px", borderRadius: 14, fontSize: 38, fontWeight: 800, whiteSpace: "nowrap", fontFamily: family(s.theme.font), boxShadow: "0 12px 24px -12px rgb(0 0 0/0.5)" }}>{c.label}</div>
    </>
  );
}

/** a sticker: an image, an SVG icon or an animated Noto emoji (.json Lottie) */
export function Sticker({ src, size = 200, loop, color }: { src: string; size?: number; loop?: "bob" | "spin" | "pulse" | "sway" | "float"; color?: string }) {
  const { theme } = useScene();
  // a one-colour icon (.mono.svg) is painted through its shape in the theme's colour, never as a black glyph
  const body = src.endsWith(".json") ? <Anim src={src} /> : src.includes(".mono.") ? (
    <div style={{ width: "100%", height: "100%", background: color ?? theme.accent, WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: "contain", maskSize: "contain",
      WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
  ) : <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />;
  return <div style={{ width: size, height: size }}>{loop ? <Loop kind={loop}>{body}</Loop> : body}</div>;
}

function Anim({ src }: { src: string }) {
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [handle] = useState(() => delayRender(`lottie ${src}`));
  useEffect(() => {
    fetch(src).then((r) => r.json()).then((j) => { setData(j); continueRender(handle); }).catch((e) => cancelRender(e));
  }, [src, handle]);
  return data ? <Lottie animationData={data} loop style={{ width: "100%", height: "100%" }} /> : null;
}

/* ---------------- numbers and charts ---------------- */
/** a number that counts up to `to` from `at` over `dur` seconds (prefix/suffix e.g. "₹", "%", " crore") */
export function Counter({ to, at, dur = 1.2, prefix = "", suffix = "", decimals = 0, size = 220, color }: { to: number; at: number; dur?: number; prefix?: string; suffix?: string; decimals?: number; size?: number; color?: string }) {
  const s = useScene();
  const v = to * prog(s.t, at, dur);
  return <div style={{ fontFamily: family(s.theme.display), fontSize: size, fontWeight: 800, lineHeight: 1, color: color ?? s.theme.ink, fontVariantNumeric: "tabular-nums", opacity: s.t < at ? 0 : 1 }}>
    {prefix}{v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
  </div>;
}

/** bars that grow one after another (values from the script only) */
export function Bars({ data, at, w, h, gap = 40, labelSize = 34 }: { data: { label: string; value: number; display?: string; color?: string }[]; at: number; w: number; h: number; gap?: number; labelSize?: number }) {
  const s = useScene();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ width: w, height: h, display: "flex", alignItems: "flex-end", gap }}>
      {data.map((d, i) => {
        const k = usePopRaw(s.frame, s.fps, at + i * 0.25);
        return (
          <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
            <div style={{ fontSize: labelSize * 1.2, fontWeight: 800, opacity: k, fontFamily: family(s.theme.display) }}>{d.display ?? d.value}</div>
            <div style={{ width: "100%", height: `${(d.value / max) * 78 * k}%`, background: d.color ?? (i % 2 ? s.theme.accent2 : s.theme.accent), borderRadius: "16px 16px 0 0" }} />
            <div style={{ fontSize: labelSize, fontWeight: 700, marginTop: 12, textAlign: "center", lineHeight: 1.05 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
function usePopRaw(frame: number, fps: number, start: number) {
  return spring({ frame: frame - start * fps, fps, config: { stiffness: 140, damping: 18 } });
}

/** a line chart that draws itself (points are values; labels optional) */
export function LineChart({ values, labels = [], at, w, h, dur = 1.4, stroke }: { values: number[]; labels?: string[]; at: number; w: number; h: number; dur?: number; stroke?: string }) {
  const s = useScene();
  const max = Math.max(...values), min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - ((v - min) / Math.max(1e-9, max - min)) * h * 0.9]);
  const d = pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
  const k = prog(s.t, at, dur);
  const len = getLength(d);
  return (
    <svg width={w} height={h + 60} style={{ overflow: "visible" }}>
      <line x1={0} y1={h} x2={w} y2={h} stroke={s.theme.muted} strokeWidth={4} />
      <path d={d} fill="none" stroke={stroke ?? s.theme.accent} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - k)} />
      {pts.map((p, i) => (i / Math.max(1, pts.length - 1) <= k + 0.001) && <circle key={i} cx={p[0]} cy={p[1]} r={14} fill={s.theme.paper} stroke={stroke ?? s.theme.accent} strokeWidth={6} />)}
      {labels.map((l, i) => <text key={i} x={pts[i]?.[0]} y={h + 48} textAnchor="middle" fontSize={30} fontWeight={700} fill={s.theme.ink} fontFamily={family(s.theme.font)}>{l}</text>)}
    </svg>
  );
}

/** a pie / donut whose slices sweep in */
export function Pie({ slices, at, size = 420, donut = 0.55 }: { slices: { label: string; value: number; color?: string }[]; at: number; size?: number; donut?: number }) {
  const s = useScene();
  const total = slices.reduce((a, b) => a + b.value, 0) || 1;
  const k = prog(s.t, at, 1.2);
  const r = size / 2, c = 2 * Math.PI * (r * 0.75);
  let acc = 0;
  const colors = [s.theme.accent, s.theme.accent2, s.theme.ink, s.theme.muted];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      {slices.map((sl, i) => {
        const frac = (sl.value / total) * k;
        const el = <circle key={i} cx={r} cy={r} r={r * 0.75} fill="none" stroke={sl.color ?? colors[i % 4]} strokeWidth={r * 0.5 * (1 - donut) * 2}
          strokeDasharray={`${frac * c} ${c}`} strokeDashoffset={-acc * c * k} />;
        acc += sl.value / total;
        return el;
      })}
    </svg>
  );
}

/** a point that moves along a list of points: the camera's or a pointer's path; returns [x, y] at time t */
export function along(points: [number, number][], t: number, start: number, dur: number): [number, number] {
  const k = prog(t, start, dur) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(k)), f = k - i;
  const a = points[i] ?? points[0], b = points[i + 1] ?? a;
  return [interpolate(f, [0, 1], [a[0], b[0]]), interpolate(f, [0, 1], [a[1], b[1]])];
}

/* ---------------- the real world, moving ----------------
   Use these to SHOW a phenomenon happening instead of writing about it: water flows, vapour rises, rain falls, light
   streams in, a photo drifts. They are deterministic (same frame, same picture), so stills and the render agree. */

const rnd = (i: number, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** a picture that moves by itself (the documentary / Vox move): a slow zoom and drift across a photo or a painting.
    from/to: [scale, focusX 0-1, focusY 0-1]; fills its box (or the whole stage when no box). */
export function KenBurns({ src, x = 0, y = 0, w, h, from = [1.05, 0.5, 0.5], to = [1.22, 0.55, 0.45], at = 0, dur, radius = 0 }: {
  src: string; x?: number; y?: number; w?: number; h?: number; from?: [number, number, number]; to?: [number, number, number]; at?: number; dur?: number; radius?: number;
}) {
  const s = useScene();
  const k = clamp01((s.t - at) / Math.max(0.5, dur ?? s.dur - at));
  const e = k * k * (3 - 2 * k);
  const sc = from[0] + (to[0] - from[0]) * e, fx = from[1] + (to[1] - from[1]) * e, fy = from[2] + (to[2] - from[2]) * e;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w ?? s.W, height: h ?? s.H, overflow: "hidden", borderRadius: radius }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: `${fx * 100}% ${fy * 100}%`, transform: `scale(${sc})` }} />
    </div>
  );
}

/** depth: layers of the same world (sky, hills, a foreground cut-out...) sliding at different speeds as the camera moves.
    depth 0 = far (barely moves), 1 = near (moves most). Use cut-out pictures (transparent) for the nearer layers. */
export function Parallax({ layers, speed = 60, dir = -1 }: { layers: { src: string; depth: number; y?: number; h?: number; w?: number }[]; speed?: number; dir?: 1 | -1 }) {
  const s = useScene();
  return (
    <>
      {layers.map((l, i) => {
        const w = l.w ?? s.W * 1.25, h = l.h ?? s.H;
        return <Img key={i} src={l.src} style={{ position: "absolute", left: (s.W - w) / 2 + dir * s.t * speed * l.depth, top: l.y ?? 0, width: w, height: h, objectFit: "cover" }} />;
      })}
    </>
  );
}

/** particles of the real world in an area: rain (fast streaks), drops (falling round drops), vapour (soft wisps that rise
    and fade: evaporation, steam), mist (big slow drifting haze), snow, bubbles (rising), dust (glinting motes in light),
    sparks. `angle` tilts the fall (wind). They start at `at`. */
export function Particles({ kind, x = 0, y = 0, w, h, count = 60, color, at = 0, speed = 1, angle = 0, size = 1 }: {
  kind: "rain" | "drops" | "vapour" | "mist" | "snow" | "bubbles" | "dust" | "sparks"; x?: number; y?: number; w?: number; h?: number; count?: number; color?: string; at?: number; speed?: number; angle?: number; size?: number;
}) {
  const s = useScene();
  const W = w ?? s.W, H = h ?? s.H, t = Math.max(0, s.t - at);
  if (s.t < at) return null;
  const up = kind === "vapour" || kind === "bubbles" || kind === "sparks";
  const base = { rain: 1400, drops: 700, vapour: 70, mist: 18, snow: 90, bubbles: 120, dust: 14, sparks: 220 }[kind] * speed;
  const fadeIn = clamp01(t / 0.6);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: W, height: H, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const r1 = rnd(i), r2 = rnd(i, 2), r3 = rnd(i, 3);
        const v = base * (0.6 + 0.8 * r2);
        const travel = (r1 * H + t * v) % (H + 120) - 60;
        const py = up ? H - travel : travel;
        const px = (r3 * W + (kind === "mist" || kind === "dust" ? Math.sin(t * 0.4 + i) * 40 : 0) + Math.tan((angle * Math.PI) / 180) * travel) % W;
        const life = up ? clamp01(1 - travel / H) : 1;
        const sz = size * (kind === "rain" ? 3 : kind === "drops" ? 10 + r2 * 10 : kind === "vapour" ? 50 + r2 * 90 : kind === "mist" ? 260 + r2 * 300 : kind === "snow" ? 6 + r2 * 8 : kind === "bubbles" ? 8 + r2 * 18 : kind === "dust" ? 3 + r2 * 4 : 4);
        const c = color ?? (kind === "rain" || kind === "drops" || kind === "bubbles" ? "rgb(210 230 255)" : kind === "sparks" ? "#ffd27a" : "#ffffff");
        const st: CSSProperties = kind === "rain"
          ? { width: sz, height: 60 + r2 * 50, background: `linear-gradient(${c}00, ${c})`, borderRadius: 2, opacity: 0.55, transform: `rotate(${-angle}deg)` }
          : kind === "vapour" || kind === "mist"
          ? { width: sz, height: sz * 0.7, borderRadius: "50%", background: c, filter: `blur(${sz * 0.25}px)`, opacity: (kind === "mist" ? 0.18 : 0.35) * life * (0.5 + 0.5 * Math.sin(t * 1.5 + i)) + 0.05 }
          : kind === "bubbles" ? { width: sz, height: sz, borderRadius: "50%", border: `2px solid ${c}`, opacity: 0.7 * life }
          : kind === "drops" ? { width: sz * 0.7, height: sz, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", background: `radial-gradient(circle at 35% 35%, #fff, ${c})`, opacity: 0.85 }
          : { width: sz, height: sz, borderRadius: "50%", background: c, opacity: (kind === "dust" ? 0.5 + 0.5 * Math.sin(t * 3 + i * 2) : 0.9) * life, boxShadow: kind === "sparks" || kind === "dust" ? `0 0 ${sz * 3}px ${c}` : undefined };
        return <div key={i} style={{ position: "absolute", left: px, top: py, opacity: fadeIn, ...st }} />;
      })}
    </div>
  );
}

/** a water surface that moves: layered waves rolling, light glinting on top (a sea, a lake, a river seen from the side) */
export function Water({ x = 0, y, w, h, color = "#2a7fb8", deep = "#0d3b66", at = 0, speed = 1, waves = 3 }: { x?: number; y: number; w?: number; h: number; color?: string; deep?: string; at?: number; speed?: number; waves?: number }) {
  const s = useScene();
  const W = w ?? s.W, t = s.t * speed;
  const k = prog(s.t, at, 0.8);
  const wave = (amp: number, len: number, ph: number, off: number) => {
    let d = `M 0 ${off}`;
    for (let px = 0; px <= W + 20; px += 20) d += ` L ${px} ${off + Math.sin(px / len + ph) * amp}`;
    return d + ` L ${W} ${h} L 0 ${h} Z`;
  };
  return (
    <svg style={{ position: "absolute", left: x, top: y + (1 - k) * h, width: W, height: h, overflow: "visible" }} viewBox={`0 0 ${W} ${h}`}>
      <defs><linearGradient id="argon-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} /><stop offset="1" stopColor={deep} /></linearGradient></defs>
      {Array.from({ length: waves }, (_, i) => <path key={i} d={wave(10 - i * 2, 70 + i * 40, t * (1.6 - i * 0.4) + i, i * 14)} fill="url(#argon-water)" opacity={0.55 + i * 0.2} />)}
      {Array.from({ length: 14 }, (_, i) => <ellipse key={`g${i}`} cx={(rnd(i) * W + t * 30) % W} cy={20 + rnd(i, 2) * h * 0.5} rx={14 + rnd(i, 3) * 26} ry={2} fill="#fff" opacity={0.25 + 0.35 * Math.max(0, Math.sin(t * 2 + i))} />)}
    </svg>
  );
}

/** something flowing along a path: water in a river, vapour going up, air moving, blood in a vein (dashes that travel) */
export function FlowPath({ d, at = 0, color, width = 10, speed = 1, dash = 26, gap = 22, glow = true }: { d: string; at?: number; color?: string; width?: number; speed?: number; dash?: number; gap?: number; glow?: boolean }) {
  const s = useScene();
  if (s.t < at) return null;
  const c = color ?? s.theme.accent;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: s.W, height: s.H, overflow: "visible", pointerEvents: "none" }}>
      {glow && <path d={d} fill="none" stroke={c} strokeWidth={width * 2.4} strokeLinecap="round" opacity={0.18} style={{ filter: "blur(6px)" }} />}
      <path d={d} fill="none" stroke={c} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-(s.t - at) * 120 * speed} opacity={clamp01((s.t - at) / 0.5)} />
    </svg>
  );
}

/** the sun where it really is: a glowing disc at (x, y) with soft rays streaming out at `angle` degrees (0 = right, 90 = down) */
export function Sun({ x, y, size = 160, angle = 135, spread = 50, rays = 9, at = 0, color = "#ffd27a" }: { x: number; y: number; size?: number; angle?: number; spread?: number; rays?: number; at?: number; color?: string }) {
  const s = useScene();
  const k = prog(s.t, at, 1);
  const len = Math.max(s.W, s.H) * 1.3;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: s.W, height: s.H, pointerEvents: "none", opacity: k }}>
      {Array.from({ length: rays }, (_, i) => {
        const a = angle - spread / 2 + (spread * i) / Math.max(1, rays - 1) + Math.sin(s.t * 0.5 + i) * 1.5;
        return <div key={i} style={{ position: "absolute", left: x, top: y - 30, width: len, height: 60 + rnd(i) * 80, transformOrigin: "0 50%", transform: `rotate(${a}deg)`,
          background: `linear-gradient(90deg, ${color}66, ${color}00 70%)`, filter: "blur(10px)", opacity: 0.35 + 0.25 * Math.sin(s.t * 0.8 + i * 1.7) }} />;
      })}
      <div style={{ position: "absolute", left: x - size * 1.5, top: y - size * 1.5, width: size * 3, height: size * 3, borderRadius: "50%", background: `radial-gradient(circle, ${color}cc, ${color}00 65%)` }} />
      <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle at 40% 40%, #fff, ${color})`, boxShadow: `0 0 ${size}px ${color}` }} />
    </div>
  );
}

/** a real photo as a Vox-style cut-out: white border, soft shadow, a slight tilt, it lands and then drifts a little */
export function Cutout({ src, x, y, w, h, at = 0, tilt = -3, border = 12, drift = 1 }: { src: string; x: number; y: number; w: number; h: number; at?: number; tilt?: number; border?: number; drift?: number }) {
  const s = useScene();
  const p = usePop(at, 180, 14);
  if (s.t < at) return null;
  const dx = Math.sin(s.t * 0.6) * 6 * drift, dy = Math.cos(s.t * 0.5) * 4 * drift;
  return (
    <div style={{ position: "absolute", left: x + dx, top: y + dy, width: w, height: h, transform: `rotate(${tilt * p}deg) scale(${0.6 + 0.4 * p})`, opacity: Math.min(1, p * 1.5),
      background: "#fff", padding: border, boxSizing: "border-box", boxShadow: "0 24px 50px -18px rgb(0 0 0/0.55), 0 2px 6px rgb(0 0 0/0.2)" }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + 0.05 * clamp01((s.t - at) / Math.max(1, s.dur - at))})` }} />
    </div>
  );
}

/** a hand-drawn marker circle that draws itself around something (the documentary highlight) */
export function MarkerCircle({ x, y, w, h, at, color, width = 7, dur = 0.7 }: { x: number; y: number; w: number; h: number; at: number; color?: string; width?: number; dur?: number }) {
  const s = useScene();
  const k = prog(s.t, at, dur);
  const d = `M ${x + w * 0.1} ${y + h * 0.15} C ${x + w * 0.5} ${y - h * 0.12}, ${x + w * 1.08} ${y + h * 0.05}, ${x + w * 1.02} ${y + h * 0.55} C ${x + w * 0.98} ${y + h * 1.1}, ${x + w * 0.1} ${y + h * 1.1}, ${x - w * 0.04} ${y + h * 0.6} C ${x - w * 0.1} ${y + h * 0.2}, ${x + w * 0.3} ${y - h * 0.02}, ${x + w * 0.62} ${y + h * 0.02}`;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: s.W, height: s.H, overflow: "visible", pointerEvents: "none" }}>
      <path d={d} fill="none" stroke={color ?? s.theme.accent} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
    </svg>
  );
}

/** film grain and a little paper texture over everything: makes painted and photo scenes feel real (use once, last) */
export function Grain({ opacity = 0.12, paper = false }: { opacity?: number; paper?: boolean }) {
  const s = useScene();
  const seed = Math.floor(s.t * 12) % 8;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: s.W, height: s.H, pointerEvents: "none", opacity, mixBlendMode: paper ? "multiply" : "overlay" }}>
      <filter id={`argon-grain-${seed}`}><feTurbulence type="fractalNoise" baseFrequency={paper ? 0.6 : 0.9} numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#argon-grain-${seed})`} />
    </svg>
  );
}

/* ---------------- paper, card and cut-outs: handmade things that move ----------------
   For the paper / cardboard style: every cut-out is a real piece of card with a soft cast shadow; things fall, float,
   swing on hinges, pop up from the floor and walk like paper puppets. Wrap a scene in <Steps fps={12}> for the
   stop-motion feel. */

/** a paper cut-out (a transparent PNG) lying on the set with a real cast shadow; `lift` raises it off the set (bigger,
    softer shadow); `stick` is ignored (no visible rods: figures stand on the floor); `silhouette` turns it
    into a black shadow-play figure (for a backlit shadow-theatre beat) */
export function Paper({ src, w, h, lift = 10, tilt = 0, color, silhouette = false }: { src: string; w: number; h?: number; lift?: number; stick?: number; tilt?: number; color?: string; silhouette?: boolean }) {
  return (
    <div style={{ position: "relative", width: w, height: h ?? w, transform: `rotate(${tilt}deg)` }}>
      {src.includes(".mono.") ? <div style={{ position: "absolute", inset: 0, background: color ?? "#333", WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
        : <Img src={src} style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", filter: `${silhouette ? "brightness(0) " : ""}drop-shadow(${lift * 0.5}px ${lift}px ${lift * 0.9}px rgb(0 0 0/${0.18 + lift / 120}))` }} />}
    </div>
  );
}

/** floats in zero gravity from `at`: drifts slowly on its own path, turns, and never quite settles */
export function ZeroG({ at = 0, drift = 1, spin = 1, seed = 1, children }: { at?: number; drift?: number; spin?: number; seed?: number; children: ReactNode }) {
  const { t } = useScene();
  const k = clamp01((t - at) / 0.8);
  if (t < at) return null;
  const u = t - at, r = (n: number) => rnd(seed, n);
  const x = Math.sin(u * (0.35 + r(1) * 0.3) + r(2) * 6) * 40 * drift, y = Math.cos(u * (0.3 + r(3) * 0.25) + r(4) * 6) * 30 * drift - u * 6 * drift;
  return <div style={{ opacity: k, transform: `translate(${x}px, ${y}px) rotate(${Math.sin(u * 0.4 + r(5) * 6) * 14 * spin + u * 4 * spin * (r(6) > 0.5 ? 1 : -1)}deg) scale(${0.85 + 0.15 * k})` }}>{children}</div>;
}

/** falls in at `at` from above with gravity, lands with a bounce and a little wobble, like a card dropped on the table */
export function Drop({ at, from = 700, bounce = 0.35, children }: { at: number; from?: number; bounce?: number; children: ReactNode }) {
  const { t } = useScene();
  if (t < at) return null;
  const u = t - at, g = 2 * from;  // reaches the floor in ~1 s
  const tLand = Math.sqrt((2 * from) / g);
  let y: number, rot: number;
  if (u < tLand) { y = -from + 0.5 * g * u * u; rot = (1 - u / tLand) * -18; }
  else { const v = u - tLand, b = from * bounce * 0.25; y = -Math.abs(Math.sin(v * 7) * b * Math.exp(-v * 4)); rot = Math.sin(v * 9) * 6 * Math.exp(-v * 3); }
  return <div style={{ transform: `translateY(${y}px) rotate(${rot}deg)` }}>{children}</div>;
}

/** swings into place around a pivot at `at` (like a paper flap on a split pin), then keeps a small sway */
export function Hinge({ at, from = -80, to = 0, pivot = "50% 100%", sway = 3, children }: { at: number; from?: number; to?: number; pivot?: string; sway?: number; children: ReactNode }) {
  const { t } = useScene();
  const p = usePop(at, 140, 9);
  const a = t < at ? from : from + (to - from) * p + Math.sin((t - at) * 2.2) * sway * clamp01(t - at - 0.6);
  return <div style={{ transformOrigin: pivot, transform: `rotate(${a}deg)`, opacity: t < at ? 0 : 1 }}>{children}</div>;
}

/** pops up from the floor at `at`, folding up like a pop-up book page */
export function PopUp({ at, children }: { at: number; children: ReactNode }) {
  const { t } = useScene();
  const p = usePop(at, 160, 11);
  return <div style={{ perspective: 900, opacity: t < at ? 0 : 1 }}><div style={{ transformOrigin: "50% 100%", transform: `rotateX(${(1 - p) * 88}deg)` }}>{children}</div></div>;
}

/** a single-picture cut-out (a figure, a boat, a cart) moving from one point to another: it glides forward, eased in
    and out, facing the way it goes, with the faintest sway (no hopping). For a person, prefer a jointed <Puppet>. */
export function Walk({ from, to, at, dur = 3, step = 0.32, bob = 14, rock = 6, children }: { from: [number, number]; to: [number, number]; at: number; dur?: number; step?: number; bob?: number; rock?: number; children: ReactNode }) {
  const { t } = useScene();
  const k = clamp01((t - at) / dur), e = k * k * (3 - 2 * k), moving = t > at && k < 1;
  // a gentle, continuous gait: the bob and the rock fade in and out with the walk (no snap at the start or the end)
  const ramp = Math.sin(Math.PI * k) ** 0.5;
  const ph = (Math.abs(to[0] - from[0]) * e) / Math.max(40, bob * 9) * Math.PI;  // steps follow the distance walked
  // a single-picture figure glides forward: no up-and-down hop (that read as jumping), only the faintest sway
  const x = from[0] + (to[0] - from[0]) * e, y = from[1] + (to[1] - from[1]) * e;
  const face = to[0] < from[0] ? -1 : 1;
  return <div style={{ position: "absolute", left: x, top: y, transform: `scaleX(${face}) rotate(${moving ? Math.sin(ph) * Math.min(rock, 4) * 0.3 * ramp : 0}deg)`, transformOrigin: "50% 100%" }}>{children}</div>;
}

/* ---------------- jointed paper puppets (video/puppet.py makes their rigs) ----------------
   A character cut from card in pieces and pinned at the joints. Its arms and legs swing at the pins: it walks, runs,
   waves, stands breathing. `rig` is the character's rig (its piece files and pin points); x, y is where its feet stand. */

export type Rig = { dir: string; pieces: Record<string, { file: string; w: number; h: number }>; neck: number[]; shoulder: number[]; hip: number[]; head_neck?: number[] };
export type Pose = "walk" | "run" | "stand" | "wave" | "cheer" | "sit";

/** a jointed paper puppet at (x, y = the ground under its feet), `height` px tall. Moving: from -> to between at and at+dur
    (it walks, or runs with pose "run"), then holds `then` (stand, wave, cheer). `face` -1 turns it to the left. */
export function Puppet({ rig, x, y, height = 420, pose = "stand", from, to, at = 0, dur = 3, then = "stand", face = 1, speed = 1, delay = 0 }: {
  rig: Rig; x?: number; y: number; height?: number; pose?: Pose; from?: number; to?: number; at?: number; dur?: number; then?: Pose; face?: 1 | -1; speed?: number; delay?: number;
}) {
  const { t } = useScene();
  const P = rig.pieces, src = (k: string) => staticFile(`${rig.dir}/${P[k].file}`);
  const torso = P.torso0, head = P.head0, arm = P.arm0, thigh = P.thigh0, shin = P.shin0;
  const natural = head.h * (rig.head_neck?.[1] ?? 0.82) + torso.h * (rig.hip[1] - rig.neck[1]) + thigh.h * 0.86 + shin.h * 0.92;
  const k = height / natural;
  const travel = from !== undefined && to !== undefined;
  const moving = travel && t >= at && t < at + dur;
  const done = travel && t >= at + dur;
  // the body speeds up from rest and slows to a stop (no instant start), and the steps follow the distance walked, so
  // the feet stay planted on the floor instead of sliding
  const u = travel ? clamp01((t - at) / dur) : 0;
  const eased = u < 0.15 ? (u * u) / 0.3 : u > 0.85 ? 1 - ((1 - u) * (1 - u)) / 0.3 : (u - 0.075) / 0.85;
  const cx = travel ? from! + (to! - from!) * clamp01(eased) : x ?? 0;
  const p: Pose = moving ? (pose === "run" ? "run" : "walk") : done ? then : pose;
  const dir = travel && to! < from! ? -1 : face;
  const amp = p === "run" ? 34 : p === "walk" ? 24 : 0;
  const k0 = height / (rig.pieces.head0.h * (rig.head_neck?.[1] ?? 0.82) + rig.pieces.torso0.h * (rig.hip[1] - rig.neck[1]) + rig.pieces.thigh0.h * 0.86 + rig.pieces.shin0.h * 0.92);
  const stride = 2 * (rig.pieces.thigh0.h * 0.86 + rig.pieces.shin0.h * 0.92) * k0 * Math.sin((Math.max(amp, 1) * Math.PI) / 180) * 1.1;  // one step's length
  const ph = travel && (moving || done) ? (Math.abs(cx - from!) / Math.max(1, stride)) * Math.PI : (t - delay) * Math.PI * 2 * speed * 0.95;
  const settle = done ? Math.exp(-(t - at - dur) * 6) * Math.sin((t - at - dur) * 18) * 3 : 0;  // a small settle when it stops
  const leg = (o: number) => ({ th: -amp * Math.sin(ph + o), sh: p === "walk" || p === "run" ? Math.max(0, -Math.cos(ph + o)) * (p === "run" ? 70 : 42) : 0 });
  const L0 = leg(0), L1 = leg(Math.PI);
  const breathe = Math.sin(t * 2.2 + delay) * 1.2 + settle;
  const armA = p === "wave" ? -150 + Math.sin(t * 9) * 18 : p === "cheer" ? -165 + Math.sin(t * 7) * 10 : p === "walk" || p === "run" ? amp * 0.9 * Math.sin(ph) : 4 + breathe;
  const armB = p === "cheer" ? -160 + Math.sin(t * 7 + 1) * 10 : p === "walk" || p === "run" ? -amp * 0.9 * Math.sin(ph) : -2 - breathe;
  const bob = p === "walk" ? -Math.abs(Math.cos(ph)) * 9 * k * 4 : p === "run" ? -Math.abs(Math.cos(ph)) * 16 * k * 4 : breathe * 2;
  const legLen = (thigh.h * 0.86 + shin.h * 0.92) * k;
  const tw = torso.w * k, th = torso.h * k;
  // everything is placed from the hip pin (0, 0)
  const pin = (pt: number[]) => [(pt[0] - rig.hip[0]) * tw, (pt[1] - rig.hip[1]) * th];
  const [nx, ny] = pin(rig.neck), [sx, sy] = pin(rig.shoulder);
  const img = (key: string, w: number, h: number, dark = false): CSSProperties => ({ position: "absolute", width: w, height: h, filter: `${dark ? "brightness(0.78) " : ""}drop-shadow(${3 * k * 4}px ${5 * k * 4}px ${4 * k * 4}px rgb(0 0 0/0.25))` });
  const limb = (key: string, a: number, child?: ReactNode, dark = false) => {
    const pc = P[key], w = pc.w * k, h = pc.h * k;
    return (
      <div style={{ position: "absolute", left: -w / 2, top: -h * 0.07, width: w, height: h, transformOrigin: `50% ${h * 0.07}px`, transform: `rotate(${a}deg)` }}>
        <Img src={src(key)} style={{ ...img(key, w, h, dark), left: 0, top: 0 }} />
        {child && <div style={{ position: "absolute", left: w / 2, top: h * 0.88 }}>{child}</div>}
      </div>
    );
  };
  const hw = head.w * k, hh = head.h * k;
  const hn = rig.head_neck ?? [0.45, 0.9];  // the head's own pin, under the chin (it sits a little into the collar: no gap)
  return (
    <div style={{ position: "absolute", left: cx, top: y - legLen + bob, transform: `scaleX(${dir})` }}>
      {/* far arm, far leg, torso, near leg, head, near arm */}
      <div style={{ position: "absolute", left: sx, top: sy }}>{limb("arm1", armB, undefined, true)}</div>
      <div style={{ position: "absolute", left: -tw * 0.04, top: 0 }}>{limb("thigh1", L1.th, limb("shin1", L1.sh, undefined, true), true)}</div>
      <Img src={src("torso0")} style={{ ...img("torso0", tw, th), left: -rig.hip[0] * tw, top: -rig.hip[1] * th, transform: `rotate(${p === "run" ? 8 : p === "walk" ? 3 : 0}deg)`, transformOrigin: `${rig.hip[0] * 100}% ${rig.hip[1] * 100}%` }} />
      <div style={{ position: "absolute", left: tw * 0.04, top: 0 }}>{limb("thigh0", L0.th, limb("shin0", L0.sh))}</div>
      <Img src={src("head0")} style={{ ...img("head0", hw, hh), left: nx - hw * hn[0], top: ny - hh * hn[1] + th * 0.03, transformOrigin: `${hn[0] * 100}% ${hn[1] * 100}%`, transform: `rotate(${p === "walk" ? Math.sin(ph * 2) * 2 : p === "wave" || p === "cheer" ? -6 + breathe * 2 : breathe}deg)` }} />
      <div style={{ position: "absolute", left: sx, top: sy }}>{limb("arm0", armA)}</div>
    </div>
  );
}

/* ---------------- pieces for the other styles (collage, map, horror, whiteboard) ---------------- */

/** collage: a picture (or anything) on a torn scrap of paper with a rough edge, a strip of tape on top, landing with a slap */
export function Torn({ x, y, w, h, at = 0, tilt = -2, paper = "#f4efe3", tape = true, seed = 3, children }: { x: number; y: number; w: number; h: number; at?: number; tilt?: number; paper?: string; tape?: boolean; seed?: number; children?: ReactNode }) {
  const s = useScene();
  const p = usePop(at, 260, 16);
  if (s.t < at) return null;
  const edge = (n: number, side: number) => Array.from({ length: n + 1 }, (_, i) => i / n).map((f, i) => [f, (rnd(seed + side, i) - 0.5) * 0.035] as const);
  const pts = [...edge(14, 1).map(([f, j]) => `${f * 100}% ${(0.02 + j) * 100}%`), ...edge(10, 2).map(([f, j]) => `${(0.98 + j) * 100}% ${f * 100}%`),
    ...edge(14, 3).reverse().map(([f, j]) => `${f * 100}% ${(0.98 + j) * 100}%`), ...edge(10, 4).reverse().map(([f, j]) => `${(0.02 + j) * 100}% ${f * 100}%`)];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `rotate(${tilt}deg) scale(${1.3 - 0.3 * p})`, opacity: Math.min(1, p * 2), filter: "drop-shadow(0 14px 18px rgb(0 0 0/0.35))" }}>
      <div style={{ position: "absolute", inset: 0, background: paper, clipPath: `polygon(${pts.join(", ")})`, padding: 18, boxSizing: "border-box" }}>
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>{children}</div>
      </div>
      {tape && <div style={{ position: "absolute", left: "38%", top: -16, width: "24%", height: 34, background: "rgb(240 230 190/0.75)", transform: "rotate(-4deg)", boxShadow: "0 2px 4px rgb(0 0 0/0.15)" }} />}
    </div>
  );
}

/** collage: a halftone dot screen over everything (or a box), like printed newspaper */
export function Halftone({ x = 0, y = 0, w, h, color = "rgb(0 0 0/0.18)", size = 9 }: { x?: number; y?: number; w?: number; h?: number; color?: string; size?: number }) {
  const s = useScene();
  return <div style={{ position: "absolute", left: x, top: y, width: w ?? s.W, height: h ?? s.H, pointerEvents: "none", mixBlendMode: "multiply",
    backgroundImage: `radial-gradient(${color} 32%, transparent 34%)`, backgroundSize: `${size}px ${size}px` }} />;
}

/** map: a pin that drops onto a place at `at`, with a pulsing ring and a short label */
export function MapPin({ x, y, at, label, color }: { x: number; y: number; at: number; label?: string; color?: string }) {
  const s = useScene();
  const p = usePop(at, 300, 12);
  if (s.t < at) return null;
  const c = color ?? s.theme.accent, ring = ((s.t - at) % 1.6) / 1.6;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ position: "absolute", left: -40 * (0.4 + ring), top: -14 * (0.4 + ring), width: 80 * (0.4 + ring), height: 28 * (0.4 + ring), borderRadius: "50%", border: `3px solid ${c}`, opacity: 1 - ring }} />
      <div style={{ position: "absolute", left: -18, top: -52 - (1 - p) * 120, width: 36, height: 52, transform: `scale(${p})`, transformOrigin: "50% 100%" }}>
        <svg viewBox="0 0 36 52" width={36} height={52}><path d="M18 52 C 18 52 2 30 2 18 A 16 16 0 0 1 34 18 C 34 30 18 52 18 52 Z" fill={c} stroke="#fff" strokeWidth={3} /><circle cx={18} cy={18} r={6} fill="#fff" /></svg>
      </div>
      {label && <div style={{ position: "absolute", left: 26, top: -64, whiteSpace: "nowrap", padding: "6px 14px", borderRadius: 8, background: "rgb(15 15 18/0.82)", color: "#fff", fontSize: 30, fontWeight: 700, opacity: prog(s.t, at + 0.25, 0.4) }}>{label}</div>}
    </div>
  );
}

/** horror / mystery: the light stutters (an old bulb, a failing projector); use over the whole scene */
export function Flicker({ amount = 0.35, seed = 7 }: { amount?: number; seed?: number }) {
  const s = useScene();
  const f = Math.floor(s.t * 24);
  const dip = rnd(f, seed) > 0.9 ? amount : rnd(f, seed + 1) > 0.97 ? amount * 1.8 : 0;
  return <div style={{ position: "absolute", left: 0, top: 0, width: s.W, height: s.H, background: "#000", opacity: dip, pointerEvents: "none" }} />;
}

/** a dark vignette closing in from the edges (`close` 0-1 tightens it over the scene) */
export function Vignette({ strength = 0.75, close = 0.2 }: { strength?: number; close?: number }) {
  const s = useScene();
  const k = clamp01(s.t / Math.max(1, s.dur));
  const r = 75 - close * 30 * k;
  return <div style={{ position: "absolute", left: 0, top: 0, width: s.W, height: s.H, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 50%, transparent ${r - 35}%, rgb(0 0 0/${strength}) ${r}%)` }} />;
}

/** whiteboard: a drawing (a line-art picture) revealed as if drawn by hand from left to right, a marker following the line */
export function Sketch({ src, x, y, w, h, at, dur = 1.6, marker = true }: { src: string; x: number; y: number; w: number; h: number; at: number; dur?: number; marker?: boolean }) {
  const s = useScene();
  if (s.t < at) return null;
  const k = clamp01((s.t - at) / dur);
  const wave = Math.sin((s.t - at) * 14) * h * 0.18;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain", clipPath: `inset(0 ${(1 - k) * 100}% 0 0)` }} />
      {marker && k < 1 && <div style={{ position: "absolute", left: k * w - 10, top: h / 2 + wave - 90, width: 30, height: 120, borderRadius: "6px 6px 14px 14px", background: "linear-gradient(90deg, #222, #555)", transform: "rotate(28deg)", transformOrigin: "50% 100%", boxShadow: "6px 10px 16px rgb(0 0 0/0.3)" }} />}
    </div>
  );
}
