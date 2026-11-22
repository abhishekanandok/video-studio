/* Paper collage kit: the pieces a mix film is assembled from, so the collage look and readable text come from code,
   not from the model remembering a rule. Every piece is a pure function of t (seconds into the scene).
     <PaperGround tone="cream" />                         the one ground, with paper fibres
     <Cutout>{any drawing}</Cutout>                       makes any SVG/HTML drawing look cut from paper (white edge + shadow)
     <PaperCard x y w h at t rot? edge? tape?>            a torn/cut card that slides in and is taped down on `at`
     <Tape x y w? rot? />  <Label/>  <Pointer/>  <Highlight/>  <MarkerCircle/>  <Halftone/>
     <FlowTags steps t token? />                          a flow chart: tags pop in, arrows draw on, a token travels
     <KineticWords words t />                             big words that slam / stack / get crossed out on their times
     <CountCard x y at t to />                            a card whose number counts up
   Coordinates are px on a 1920x1080 frame. Text is never smaller than MIN_TEXT. */
import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

loadFont("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });

export const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
export const MIN_TEXT = 34;
export const INK = "#1d1b19", PAPER = "#fbf6ea", SHADOW = "rgba(40,28,10,0.28)";
const txt = (size: number) => Math.max(MIN_TEXT, size);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** 0..1 from `at` over `dur` seconds, eased out */
export const appear = (t: number, at: number, dur = 0.45) => Easing.out(Easing.cubic)(clamp01((t - at) / dur));
/** 0..1 with a small overshoot, for things that land */
export const land = (t: number, at: number, dur = 0.5) => {
  const k = clamp01((t - at) / dur);
  return k === 0 ? 0 : 1 + Math.sin(k * Math.PI) * 0.08 * (1 - k) - Math.pow(1 - k, 3);
};
const rand = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

/* ---- ground and texture ------------------------------------------------------------------------------------------ */
const TONES = { cream: "#f3ead8", kraft: "#d9c19a", grey: "#dcdad3", pink: "#f2dcd6", blue: "#d8e4ea" } as const;

export const PaperGround: React.FC<{ tone?: keyof typeof TONES }> = ({ tone = "cream" }) => (
  <AbsoluteFill style={{ backgroundColor: TONES[tone] }}>
    <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "multiply", opacity: 0.32 }}>
      <filter id="kit-fibre"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={3} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter="url(#kit-fibre)" />
    </svg>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(90,60,20,0.16) 100%)" }} />
  </AbsoluteFill>
);

export const Halftone: React.FC<{ x: number; y: number; w: number; h: number; color?: string; opacity?: number }> = ({ x, y, w, h, color = INK, opacity = 0.18 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity, backgroundImage: `radial-gradient(${color} 22%, transparent 24%)`, backgroundSize: "14px 14px" }} />
);

/* ---- the cut-paper look ------------------------------------------------------------------------------------------ */
/** Wraps any drawing so it reads as a paper cut-out: a white paper edge around its shape and a soft cast shadow. */
export const Cutout: React.FC<{ children: React.ReactNode; edge?: number; lift?: number; style?: React.CSSProperties }> = ({ children, edge = 5, lift = 1, style }) => (
  <div style={{ position: "absolute", inset: 0, ...style,
    filter: `drop-shadow(${edge}px 0 0 #fff) drop-shadow(-${edge}px 0 0 #fff) drop-shadow(0 ${edge}px 0 #fff) drop-shadow(0 -${edge}px 0 #fff) drop-shadow(${4 * lift}px ${9 * lift}px ${7 * lift}px ${SHADOW})` }}>
    {children}
  </div>
);

const torn = (seed: number, n = 22, depth = 1.6) => {
  const pts: string[] = [];
  const edge = (i: number, a: (k: number) => [number, number]) => { for (let k = 0; k < n; k++) { const [x, y] = a(k / n); pts.push(`${x}% ${y}%`); } };
  edge(0, (k) => [k * 100, rand(seed + k * 7) * depth]);
  edge(1, (k) => [100 - rand(seed + 50 + k * 7) * depth, k * 100]);
  edge(2, (k) => [100 - k * 100, 100 - rand(seed + 100 + k * 7) * depth]);
  edge(3, (k) => [rand(seed + 150 + k * 7) * depth, 100 - k * 100]);
  return `polygon(${pts.join(",")})`;
};

export const Tape: React.FC<{ x: number; y: number; w?: number; rot?: number; show?: number }> = ({ x, y, w = 150, rot = -8, show = 1 }) => (
  <div style={{ position: "absolute", left: x - w / 2, top: y - 20, width: w, height: 40, transform: `rotate(${rot}deg) scaleX(${show})`, opacity: show,
    background: "rgba(246,231,170,0.82)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", clipPath: "polygon(2% 8%,98% 0,100% 92%,0 100%)" }} />
);

/** A paper card that slides in from below, lands with a small overshoot, then gets taped down. */
/** h is optional: without it the card grows to fit what is on it (so text never spills out). */
export const PaperCard: React.FC<{ x: number; y: number; w: number; h?: number; at: number; t: number; rot?: number; edge?: "torn" | "cut"; tape?: boolean; color?: string; seed?: number; children?: React.ReactNode }> = ({ x, y, w, h, at, t, rot = -1.5, edge = "torn", tape = true, color = PAPER, seed = 1, children }) => {
  const k = land(t, at);
  if (t < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `translateY(${(1 - k) * 60}px) rotate(${rot * k}deg)`, opacity: clamp01(k * 2), filter: `drop-shadow(5px 10px 8px ${SHADOW})` }}>
      <div style={{ position: h ? "absolute" : "relative", inset: 0, minHeight: h ?? 140, background: color, clipPath: edge === "torn" ? torn(seed) : undefined, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "36px 32px", boxSizing: "border-box", textAlign: "center" }}>{children}</div>
      {tape && <Tape x={w / 2} y={0} w={Math.min(180, w * 0.4)} rot={-6 + rand(seed) * 12} show={appear(t, at + 0.35, 0.25)} />}
    </div>
  );
};

/** Text on a card or a tag, never below MIN_TEXT. mark: a highlighter swipes under it as `mark` goes 0 -> 1. */
export const Words: React.FC<{ children: React.ReactNode; size?: number; weight?: number; color?: string; style?: React.CSSProperties; mark?: number }> = ({ children, size = 48, weight = 800, color = INK, style, mark }) => (
  <div style={{ fontFamily: FONT, fontSize: txt(size), fontWeight: weight, color, lineHeight: 1.1, ...style }}>
    {mark === undefined ? children : (
      <span style={{ backgroundImage: "linear-gradient(rgba(255,214,10,0.6), rgba(255,214,10,0.6))", backgroundRepeat: "no-repeat",
        backgroundPosition: "0 88%", backgroundSize: `${clamp01(mark) * 100}% 38%`, padding: "0 6px" }}>{children}</span>
    )}
  </div>
);

/** A real photo pasted in as a torn paper cut-out: it lands and gets taped, the camera pushes slowly toward its subject
 *  (focus, 0..1), a marker circles the subject and a caption tag points at it. The credit sits on the photo's edge. */
export const PhotoCut: React.FC<{ src: string; ratio: number; at: number; t: number; dur: number; focus?: [number, number]; caption?: string; captionAt?: number; credit?: string; seed?: number }> = ({ src, ratio, at, t, dur, focus = [0.5, 0.5], caption, captionAt, credit, seed = 2 }) => {
  if (t < at) return null;
  const k = land(t, at, 0.6);
  const W0 = 1920, H0 = 1080;
  const w = Math.min(1340, 780 * ratio), h = w / ratio;
  const x = (W0 - w) / 2 - 60, y = (H0 - h) / 2 - 70;
  const push = 1 + 0.14 * clamp01((t - at) / Math.max(1, dur - at));
  const [fx, fy] = focus;
  const ca = captionAt ?? at + 1.2;
  const cx = x + fx * w, cy = y + fy * h;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `translateY(${(1 - k) * 80}px) rotate(${(-2 + rand(seed) * 3) * k}deg) scale(${0.92 + 0.08 * k})`,
        opacity: clamp01(k * 2), filter: `drop-shadow(6px 14px 10px ${SHADOW})` }}>
        <div style={{ position: "absolute", inset: -14, background: "#fff", clipPath: torn(seed + 11, 26, 1.2) }} />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: torn(seed, 26, 0.8) }}>
          <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: `${fx * 100}% ${fy * 100}%`, transform: `scale(${push})`, filter: "saturate(0.85) contrast(1.05) sepia(0.12)" }} />
          <div style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: `radial-gradient(${INK} 22%, transparent 24%)`, backgroundSize: "6px 6px", mixBlendMode: "multiply" }} />
        </div>
        <Tape x={w * 0.12} y={-6} w={170} rot={-18} show={appear(t, at + 0.45, 0.25)} />
        <Tape x={w * 0.88} y={h + 4} w={170} rot={-14} show={appear(t, at + 0.55, 0.25)} />
        {credit && <div style={{ position: "absolute", right: 10, bottom: -34, fontFamily: FONT, fontSize: 17, color: "rgba(40,30,20,0.7)", whiteSpace: "nowrap" }}>{credit}</div>}
      </div>
      {caption && <MarkerCircle x={cx} y={cy} r={Math.min(w, h) * 0.16} at={ca} t={t} />}
      {caption && <Pointer from={[Math.min(1700, x + w + 120), Math.max(140, y + 60)]} to={[cx + Math.min(w, h) * 0.16, cy - Math.min(w, h) * 0.1]} text={caption} at={ca + 0.3} t={t} size={44} />}
    </>
  );
};

/** A small paper tag with words, popping in on `at`. */
export const Label: React.FC<{ text: string; x: number; y: number; at: number; t: number; size?: number; color?: string; rot?: number }> = ({ text, x, y, at, t, size = 38, color = PAPER, rot = -2 }) => {
  const k = land(t, at, 0.35);
  if (t < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${k}) rotate(${rot}deg)`, filter: `drop-shadow(3px 6px 5px ${SHADOW})` }}>
      <div style={{ background: color, padding: "10px 22px", clipPath: "polygon(0 6%,100% 0,98% 100%,2% 94%)", whiteSpace: "nowrap" }}><Words size={size}>{text}</Words></div>
    </div>
  );
};

/** A leader line drawn from a label to the thing it names (the label pops in when the line arrives). */
export const Pointer: React.FC<{ from: [number, number]; to: [number, number]; text: string; at: number; t: number; size?: number }> = ({ from, to, text, at, t, size = 36 }) => {
  const k = appear(t, at, 0.4);
  if (t < at) return null;
  const [x1, y1] = from, [x2, y2] = to;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={`M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - 40} ${x2},${y2}`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
        <circle cx={x2} cy={y2} r={9 * k} fill="#e4572e" stroke="#fff" strokeWidth={3} />
      </svg>
      <Label text={text} x={x1} y={y1} at={at + 0.3} t={t} size={size} />
    </>
  );
};

/** A marker highlighter swiping across a word or a region. */
export const Highlight: React.FC<{ x: number; y: number; w: number; h: number; at: number; t: number; color?: string }> = ({ x, y, w, h, at, t, color = "rgba(255,214,10,0.55)" }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w * appear(t, at, 0.4), height: h, background: color, mixBlendMode: "multiply", borderRadius: 6, transform: "rotate(-1deg)" }} />
);

/** A hand-drawn marker circle drawing around something. */
export const MarkerCircle: React.FC<{ x: number; y: number; r: number; at: number; t: number; color?: string }> = ({ x, y, r, at, t, color = "#e4572e" }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    <ellipse cx={x} cy={y} rx={r * 1.15} ry={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" transform={`rotate(-8 ${x} ${y})`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - appear(t, at, 0.6)} />
  </svg>
);

/* ---- flow chart --------------------------------------------------------------------------------------------------- */
export type Step = { label: string; at: number; icon?: string };

/** A flow chart: each tag pops in on its time, the arrow to the next DRAWS ON, a token travels along it; the current tag
 *  is lit and done ones dim. layout "row" (left to right) or "arc" (a gentle curve). */
export const FlowTags: React.FC<{ steps: Step[]; t: number; token?: string; layout?: "row" | "arc"; y?: number; x0?: number; x1?: number; size?: number; accent?: string }> = ({ steps, t, token = "●", layout = "row", y = 470, x0 = 260, x1 = 1660, size = 44, accent = "#e4572e" }) => {
  const n = steps.length;
  const pos = steps.map((_, i) => {
    const x = n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1);
    const yy = layout === "arc" ? y + Math.sin((i / Math.max(1, n - 1)) * Math.PI) * -150 : y;
    return [x, yy] as [number, number];
  });
  const cur = steps.reduce((c, s, i) => (t >= s.at ? i : c), -1);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs><marker id="kit-head" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={INK} /></marker></defs>
        {pos.slice(0, -1).map(([ax, ay], i) => {
          const [bx, by] = pos[i + 1];
          const at = steps[i + 1].at - 0.35;
          const k = appear(t, at, 0.35);
          const sx = ax + 160, ex = bx - 170;
          const d = `M${sx},${ay} C${(sx + ex) / 2},${ay - 30} ${(sx + ex) / 2},${by - 30} ${ex},${by}`;
          const tk = clamp01((t - steps[i + 1].at) / 0.9);
          const tx = sx + (ex - sx) * tk, ty = ay + (by - ay) * tk - Math.sin(tk * Math.PI) * 22;
          return (
            <g key={i}>
              {k > 0 && <path d={d} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} markerEnd={k > 0.95 ? "url(#kit-head)" : undefined} />}
              {tk > 0 && tk < 1 && <text x={tx} y={ty + 12} fontSize={34} textAnchor="middle" fill={accent}>{token}</text>}
            </g>
          );
        })}
      </svg>
      {steps.map((s, i) => {
        const k = land(t, s.at, 0.4);
        if (t < s.at) return null;
        const on = i === cur;
        const [x, yy] = pos[i];
        return (
          <div key={i} style={{ position: "absolute", left: x, top: yy, transform: `translate(-50%,-50%) scale(${k * (on ? 1.06 : 1)}) rotate(${(rand(i + 3) - 0.5) * 4}deg)`, opacity: on || cur < 0 ? 1 : 0.6,
            filter: `drop-shadow(4px 8px 6px ${SHADOW})` }}>
            <div style={{ background: on ? "#fff3c4" : PAPER, padding: "26px 28px", width: 290, minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              clipPath: torn(i * 13 + 5, 12, 3), border: on ? `5px solid ${accent}` : "none", boxSizing: "border-box", textAlign: "center" }}>
              {s.icon && <div style={{ fontSize: 96, lineHeight: 1 }}>{s.icon}</div>}
              <Words size={size}>{s.label}</Words>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ---- kinetic words ------------------------------------------------------------------------------------------------ */
export type KWord = { text: string; at: number; effect?: "slam" | "stack" | "cross" | "stretch" | "fall" };

/** Big words that ARE the scene: slam in, stack up, get crossed out, stretch, or fall away, each on its own time. */
export const KineticWords: React.FC<{ words: KWord[]; t: number; size?: number; color?: string; accent?: string; y?: number }> = ({ words, t, size = 150, color = INK, accent = "#e4572e", y = 300 }) => (
  <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: y - size * 0.6, gap: 8 }}>
    {words.map((w, i) => {
      if (t < w.at) return <div key={i} style={{ height: size * 1.05 }} />;
      const k = land(t, w.at, 0.3);
      const e = w.effect ?? "slam";
      const tr = e === "slam" ? `scale(${2.2 - 1.2 * k})` : e === "stack" ? `translateY(${(1 - k) * -240}px)` : e === "stretch" ? `scaleX(${1 + appear(t, w.at, 0.8) * 0.5})`
        : e === "fall" ? `translateY(${appear(t, w.at + 0.5, 0.6) * 14}px) rotate(${appear(t, w.at + 0.5, 0.6) * 4}deg)` : "none";
      const fade = e === "fall" ? 1 - 0.65 * appear(t, w.at + 0.5, 0.6) : 1;  // it sinks and greys out, never off screen
      const cross = e === "cross" ? appear(t, w.at + 0.4, 0.35) : 0;
      return (
        <div key={i} style={{ position: "relative", transform: tr, opacity: clamp01(k * 1.5) * fade, filter: `drop-shadow(5px 9px 0 rgba(0,0,0,0.12))` }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.05, color: i === words.length - 1 ? accent : color, letterSpacing: "-0.02em", whiteSpace: "nowrap", textTransform: "uppercase" }}>{w.text}</div>
          {cross > 0 && <div style={{ position: "absolute", left: -10, top: "52%", height: 16, width: `calc(${cross * 100}% + 20px)`, background: accent, transform: "rotate(-4deg)" }} />}
        </div>
      );
    })}
  </AbsoluteFill>
);

/* ---- numbers ------------------------------------------------------------------------------------------------------ */
/** A paper card whose number counts up from `from` to `to` (over `dur` s from `at`), with a short label under it. */
export const CountCard: React.FC<{ x: number; y: number; at: number; t: number; to: number; from?: number; dur?: number; prefix?: string; suffix?: string; label?: string; decimals?: number; w?: number }> = ({ x, y, at, t, to, from = 0, dur = 1.2, prefix = "", suffix = "", label, decimals = 0, w = 720 }) => {
  const v = interpolate(t, [at + 0.3, at + 0.3 + dur], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <PaperCard x={x} y={y} w={w} at={at} t={t} rot={-2}>
      <Words size={110} weight={900} color="#e4572e" style={{ whiteSpace: "nowrap" }}>{prefix}{v.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}</Words>
      {label && <Words size={36} weight={700} style={{ marginTop: 10 }}>{label}</Words>}
    </PaperCard>
  );
};
