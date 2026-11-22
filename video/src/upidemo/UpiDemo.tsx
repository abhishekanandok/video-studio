/* "Explain UPI" demo film: the landing page's motion-graphics explainer (frontend/components/landing/explainer.tsx),
   ported shot for shot to Remotion so it renders frame-exact, with a Hinglish narrator (one line per shot, its length
   sets the shot's length) and animated Noto emoji (Lottie) in the margins beside the stage.

   Every shot is laid out on a 100em x 100em square centred in the 16:9 frame (1em = 1% of the frame's height), the
   same coordinates as the landing page, so the shots are the demo's own. Props: public/upidemo/demo.json. */

import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import { loadFont } from "@remotion/google-fonts/Outfit";
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const { fontFamily } = loadFont("normal", { weights: ["500", "600", "700", "800"] });

export const FPS = 30;
const OVERLAP = 8; // frames each shot cross-fades over the one before
const PAD = 0.5; // seconds of air after each line

export type DemoLine = { shot: ShotName; text: string; audio: string; seconds: number };
export type DemoProps = { lines: DemoLine[] };

const shotFrames = (l: DemoLine) => Math.round((l.seconds + PAD) * FPS);
export const demoFrames = (p: DemoProps) => p.lines.reduce((t, l) => t + shotFrames(l), 0) + OVERLAP;

export const INK = "#1f1c1b", LIME = "#a6f04a", STICKY = "#f6f39a", COIN = "#f4c94a", RED = "#e8402c";

/* ---------- time helpers: every animation is a function of the shot's own frame ---------- */
export function useT() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, t: frame / fps };
}
export const sp = (frame: number, fps: number, delay = 0, stiffness = 380, damping = 16) =>
  spring({ frame: frame - Math.round(delay * fps), fps, config: { stiffness, damping, mass: 1 } });
export const kf = (t: number, times: number[], values: number[]) => interpolate(t, times, values, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export const Dark = createContext(false);
export const shade = (dark: boolean) => (dark ? LIME : INK);
export const abs: CSSProperties = { position: "absolute" };
export const center: CSSProperties = { display: "grid", placeItems: "center" };

export function usePop(delay = 0) {
  const { frame, fps } = useT();
  const p = sp(frame, fps, delay, 420, 15);
  return { transform: `scale(${p}) rotate(${lerp(-10, 0, p)}deg)` } as CSSProperties;
}

/* ---------- primitives (the landing page's, frame-driven) ---------- */
export function At({ x, y, w, h, children, style }: { x: number; y: number; w?: number; h?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...abs, left: `${x}em`, top: `${y}em`, width: w ? `${w}em` : undefined, height: h ? `${h}em` : undefined, ...style }}>{children}</div>;
}

export function Box({ children, bg = "#fff", style }: { children?: ReactNode; bg?: string; style?: CSSProperties }) {
  const dark = useContext(Dark);
  return <div style={{ ...center, position: "relative", width: "100%", height: "100%", background: bg, border: `0.7em solid ${INK}`, borderRadius: "2.6em", boxShadow: `1.4em 1.4em 0 ${shade(dark)}`, boxSizing: "border-box", ...style }}>{children}</div>;
}

export function Tape({ r = -6 }: { r?: number }) {
  return <span style={{ ...abs, left: "50%", top: "-2.2em", width: "13em", height: "4.4em", marginLeft: "-6.5em", background: "rgba(255,255,255,0.72)", boxShadow: "0 0.2em 0.6em rgb(0 0 0/0.12)", transform: `rotate(${r}deg)` }} />;
}

export function Sticky({ children, bg = STICKY, r = -4, delay = 0, size = 7 }: { children: ReactNode; bg?: string; r?: number; delay?: number; size?: number }) {
  const { frame, fps } = useT();
  const p = sp(frame, fps, delay, 300, 14);
  return (
    <div style={{ ...center, position: "relative", width: "100%", height: "100%", textAlign: "center", fontWeight: 700, lineHeight: 1.05, background: bg, color: INK, boxShadow: "0.8em 1.4em 2em -0.6em rgb(0 0 0/0.35)", padding: "2em", boxSizing: "border-box",
      opacity: Math.min(1, p * 1.5), transform: `scale(${lerp(1.6, 1, p)}) rotate(${lerp(r - 12, r, p)}deg)` }}>
      <Tape r={-r * 1.5} />
      <span style={{ fontSize: `${size}em` }}>{children}</span>
    </div>
  );
}

export function Words({ words, size = 15, mark = -1, delay = 0, color }: { words: string[]; size?: number; mark?: number; delay?: number; color?: string }) {
  const dark = useContext(Dark);
  const { frame, fps, t } = useT();
  const fg = color ?? (dark ? "#ffffff" : INK);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", fontWeight: 800, letterSpacing: "-0.03em", fontSize: `${size}em`, gap: "0 0.25em", lineHeight: 1.05, color: fg }}>
      {words.map((w, i) => {
        const p = sp(frame, fps, delay + i * 0.14, 380, 16);
        const m = kf(t, [delay + i * 0.14 + 0.25, delay + i * 0.14 + 0.6], [0, 1]);
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", opacity: Math.min(1, p), transform: `translateY(${lerp(0.6, 0, p)}em) scale(${lerp(0.6, 1, p)})` }}>
            {i === mark && <span style={{ ...abs, left: "-0.08em", right: "-0.08em", top: "0.22em", bottom: "0.02em", background: LIME, borderRadius: "0.12em", transformOrigin: "left", transform: `scaleX(${ease(m)})` }} />}
            <span style={{ position: "relative", color: i === mark ? INK : undefined }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
}

export function Coin({ size = 16 }: { size?: number }) {
  const dark = useContext(Dark);
  return (
    <div style={{ ...center, borderRadius: "50%", fontWeight: 800, width: `${size}em`, height: `${size}em`, background: `radial-gradient(circle at 35% 30%, #ffe48a, ${COIN} 60%, #d9a425)`, border: `0.6em solid ${INK}`, color: INK, boxShadow: `0.8em 0.8em 0 ${shade(dark)}`, boxSizing: "border-box" }}>
      <span style={{ fontSize: `${size * 0.5}em` }}>₹</span>
    </div>
  );
}

export function Phone({ children, bg = "#fff" }: { children?: ReactNode; bg?: string }) {
  const dark = useContext(Dark);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: bg, border: `0.8em solid ${INK}`, borderRadius: "3.6em", boxShadow: `1.4em 1.4em 0 ${shade(dark)}`, boxSizing: "border-box" }}>
      <span style={{ ...abs, left: "50%", top: "1.6em", width: "8em", height: "1.6em", marginLeft: "-4em", borderRadius: "9em", background: INK }} />
      <div style={{ ...abs, inset: 0, ...center, paddingTop: "3em" }}>{children}</div>
    </div>
  );
}

export function Spark({ x, y, d, lime }: { x: number; y: number; d: number; lime?: boolean }) {
  const { t } = useT();
  return (
    <svg viewBox="0 0 20 20" style={{ ...abs, left: `${x}em`, top: `${y}em`, width: "5em", height: "5em", transform: `scale(${kf(t, [d, d + 0.25, d + 0.5], [0, 1.2, 1])}) rotate(${kf(t, [d, d + 0.5], [0, 90])}deg)` }}>
      <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={lime ? LIME : INK} />
    </svg>
  );
}

/* ---------- the shots ---------- */

function ShotHook() {
  const { frame, fps, t } = useT();
  const aw = sp(frame, fps, 0, 240, 18), kx = sp(frame, fps, 0, 200, 18);
  return (
    <>
      <div style={{ ...abs, left: "-4em", top: "-2em", width: "108em", transform: `translateY(${lerp(-18, 0, aw)}em)` }}>
        <div style={{ height: "11em", background: `repeating-linear-gradient(90deg, ${LIME} 0 9em, #fff 9em 18em)`, borderBottom: `0.7em solid ${INK}` }} />
        <div style={{ display: "flex", marginTop: "-0.7em" }}>
          {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ width: "9em", height: "4.5em", borderRadius: "0 0 4.5em 4.5em", background: i % 2 ? "#fff" : LIME, border: `0.7em solid ${INK}`, borderTop: "none", boxSizing: "border-box" }} />)}
        </div>
      </div>
      <div style={{ ...abs, left: "34em", top: "14em", width: "32em", transformOrigin: "50% 0", opacity: kf(t, [0.25, 0.5], [0, 1]), transform: `rotate(${kf(t, [0.25, 0.6, 0.95, 1.3, 1.65], [12, -8, 4, -2, 0])}deg)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "20em", height: "4em", margin: "0 auto" }}><span style={{ width: "0.5em", background: INK }} /><span style={{ width: "0.5em", background: INK }} /></div>
        <div style={{ ...center, height: "8em", background: INK, color: LIME, borderRadius: "1.6em", fontWeight: 800 }}><span style={{ fontSize: "4.4em", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>CHAI TAPRI</span></div>
      </div>
      <div style={{ ...abs, left: "8em", top: "31em", width: "24em", height: "20em", transformOrigin: "20% 80%", transform: `translateX(${lerp(-30, 0, kx)}em) rotate(${kf(t, [0, 0.4, 1], [0, 0, -24])}deg)` }}>
        <svg viewBox="0 0 60 50" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <path d="M14 18 Q14 8 30 8 Q46 8 46 18 L48 40 Q48 46 40 46 H20 Q12 46 12 40 Z" fill="#d7dcdd" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M46 24 L58 13" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <path d="M14 15 Q1 20 12 34" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <circle cx="30" cy="6" r="3.4" fill={INK} />
          <path d="M18 30 H42" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
      <svg style={{ ...abs, left: 0, top: 0, width: "100em", height: "100em", overflow: "visible" }} viewBox="0 0 100 100">
        <path d="M31.5 33 Q38 30 46 39" fill="none" stroke="#b07436" strokeWidth="2.2" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - kf(t, [0.75, 1.1], [0, 1])} opacity={kf(t, [0.75, 0.85], [0, 1])} />
      </svg>
      <div style={{ ...abs, left: "40em", top: "34em", width: "20em", height: "26em", transformOrigin: "50% 100%", transform: `scale(${kf(t, [0.2, 0.37, 0.53, 0.7], [0, 1.1, 0.94, 1])})` }}>
        <svg viewBox="0 0 60 80" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          {[20, 30, 40].map((x, i) => {
            const u = t < 1 + i * 0.12 ? 0 : (((t - 1 - i * 0.12) % 1) / 0.8);
            return <path key={x} d={`M${x} 14 C${x - 5} 7 ${x + 5} 3 ${x} -4`} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.min(1, u)} opacity={kf(Math.min(1, u), [0, 0.5, 1], [0, 1, 0.4])} />;
          })}
          <path d="M10 20 H50 L45 76 H15 Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M13 38 H47 L45 76 H15 Z" fill="#c98a4b" stroke={INK} strokeWidth="3" strokeLinejoin="round" style={{ transformBox: "fill-box", transformOrigin: "50% 100%", transform: `scaleY(${kf(t, [0.85, 1.45], [0, 1])})` }} />
          <path d="M15 50 H45" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" />
        </svg>
      </div>
      <At x={66} y={30} w={22} h={18}><Sticky r={9} delay={1} size={8.5}>₹10</Sticky></At>
      <div style={{ ...abs, left: "70em", top: "51em", width: "15em", height: "17em", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.8em", background: "#fff", border: `0.6em solid ${INK}`, borderRadius: "1.6em", boxShadow: `0.9em 0.9em 0 ${INK}`, boxSizing: "border-box", ...usePop(1.25) }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 2.2em)", gap: "0.5em" }}>{Array.from({ length: 16 }, (_, i) => <span key={i} style={{ width: "2.2em", height: "2.2em", borderRadius: "0.3em", background: [0, 3, 5, 6, 9, 12, 15, 10].includes(i) ? INK : "transparent" }} />)}</div>
        <span style={{ fontWeight: 700, fontSize: "2.4em", color: INK, lineHeight: 1 }}>scan me</span>
      </div>
      <Spark x={35} y={30} d={1.1} /><Spark x={61} y={39} d={1.22} lime /><Spark x={31} y={58} d={1.34} />
      <At x={4} y={69} w={92}><Words words={["₹10", "ki", "chai"]} size={12.5} mark={0} delay={0.55} /></At>
      <At x={4} y={86} w={92}><div style={{ textAlign: "center", fontWeight: 700, fontSize: "4.4em", color: INK, opacity: kf(t, [1.2, 1.5], [0, 1]), transform: `translateY(${kf(t, [1.2, 1.5], [0.4, 0])}em)` }}>aur payment ek second mein. Kaise?</div></At>
    </>
  );
}

function ShotCoin() {
  const { t } = useT();
  const T = [0.2, 0.7, 1.3];
  return (
    <>
      <At x={10} y={22} w={30} h={58}><Phone><Words words={["Pay"]} size={7} delay={0.9} /></Phone></At>
      <div style={{ ...abs, left: "62em", top: "8em", perspective: "60em", transform: `translate(${kf(t, T, [0, -14, -38])}em, ${kf(t, T, [0, -8, 26])}em) scale(${kf(t, T, [1, 1.15, 0.7])})` }}>
        <div style={{ transform: `rotateY(${kf(t, T, [0, 540, 1080])}deg)` }}><Coin size={18} /></div>
      </div>
      <At x={56} y={58} w={34} h={26}><Sticky r={5} delay={0.5} size={6.2}>You pay</Sticky></At>
      <At x={4} y={86} w={92}><div style={{ textAlign: "center", fontWeight: 700, fontSize: "4.4em", color: INK, opacity: kf(t, [1.4, 1.7], [0, 1]) }}>seedha aapke bank account se</div></At>
    </>
  );
}

export function QRCells({ n = 7, cell = 3.6, gap = 0.5, delay = 0, color = INK }: { n?: number; cell?: number; gap?: number; delay?: number; color?: string }) {
  const { frame, fps } = useT();
  const fin = (i: number, j: number) => (i < 2 && j < 2) || (i < 2 && j > n - 3) || (i > n - 3 && j < 2);
  const on = (i: number, j: number) => fin(i, j) || ((i * 31 + j * 17 + i * j * 7) % 5 < 2);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, ${cell}em)`, gap: `${gap}em` }}>
      {Array.from({ length: n * n }, (_, k) => {
        const i = Math.floor(k / n), j = k % n;
        const p = sp(frame, fps, delay + (i + j) * 0.025, 420, 15);
        return <span key={k} style={{ width: `${cell}em`, height: `${cell}em`, borderRadius: fin(i, j) ? "0.3em" : "50%", background: on(i, j) ? color : "transparent", transform: `scale(${p})` }} />;
      })}
    </div>
  );
}

function ShotQR() {
  const { frame, fps, t } = useT();
  const st = t < 0.5 ? 0 : t < 1.05 ? 1 : 2;
  const typed = t < 1.45 ? "" : t < 1.8 ? "1" : "10";
  const drop = sp(frame, fps, 0, 260, 18), slide = sp(frame, fps, 0, 160, 19), amt = sp(frame, fps, 1.05, 320, 22);
  return (
    <>
      <div style={{ ...abs, left: "8em", top: "9em", width: "36em", height: "56em", padding: "2.4em", display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", border: `0.7em solid ${INK}`, borderRadius: "2.6em", boxShadow: `1.4em 1.4em 0 ${INK}`, boxSizing: "border-box", opacity: Math.min(1, drop * 1.5), transform: `translateY(${lerp(-12, 0, drop)}em)` }}>
        <span style={{ fontWeight: 800, fontSize: "3.6em", background: LIME, color: INK, borderRadius: "1em", padding: "0.1em 0.7em", border: `0.16em solid ${INK}` }}>CHAI TAPRI</span>
        <div style={{ marginTop: "3em" }}><QRCells delay={0.1} /></div>
        <span style={{ fontWeight: 700, fontSize: "3.6em", color: INK, marginTop: "0.7em" }}>scan &amp; pay</span>
      </div>
      <svg style={{ ...abs, left: 0, top: 0, width: "100em", height: "100em", overflow: "visible", pointerEvents: "none" }} viewBox="0 0 100 100">
        <polygon points="54,27 22,15 22,50 54,45" fill={LIME} opacity={kf(t, [0.5, 0.65, 0.95, 1.05], [0, 0.45, 0.25, 0])} />
      </svg>
      <div style={{ ...abs, left: "50em", top: "6em", width: "32em", height: "60em", transform: `translateX(${lerp(46, 0, slide)}em) rotate(${lerp(10, -5, slide)}deg)` }}>
        <Phone bg={st === 2 ? "#ffffff" : INK}>
          {st < 2 ? (
            <div style={{ position: "relative", ...center, width: "22em", height: "22em" }}>
              {([[0, 0, "Top", "Left"], [0, 1, "Top", "Right"], [1, 0, "Bottom", "Left"], [1, 1, "Bottom", "Right"]] as const).map(([b, r, v, h], i) => (
                <span key={i} style={{ ...abs, top: b ? undefined : 0, bottom: b ? 0 : undefined, left: r ? undefined : 0, right: r ? 0 : undefined, width: "5em", height: "5em", [`border${v}`]: `0.8em solid ${LIME}`, [`border${h}`]: `0.8em solid ${LIME}`, borderRadius: "0.6em" }} />
              ))}
              <div style={{ opacity: st >= 1 ? 1 : 0.15, transform: `scale(${st >= 1 ? 1 : 0.7})` }}><QRCells cell={1.9} gap={0.3} color="#ffffff" /></div>
              {st === 1 && <span style={{ ...abs, left: "1.5em", right: "1.5em", height: "0.8em", background: LIME, boxShadow: `0 0 2em ${LIME}`, borderRadius: "1em", top: `${kf(t, [0.5, 0.78, 1.05], [1.5, 19.5, 1.5])}em` }} />}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: INK, marginTop: "-2em", opacity: Math.min(1, amt), transform: `translateY(${lerp(6, 0, amt)}em)` }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5em", fontWeight: 700, fontSize: "3em" }}>
                <span style={{ ...center, width: "1.5em", height: "1.5em", borderRadius: "50%", background: LIME, fontWeight: 800 }}>C</span>Chai Tapri
              </span>
              <span style={{ display: "flex", alignItems: "baseline", fontWeight: 800, letterSpacing: "-0.03em", fontSize: "9em", lineHeight: 1.1, marginTop: "0.15em" }}>
                ₹{typed || <span style={{ opacity: 0.25 }}>0</span>}
                <span style={{ width: "0.06em", height: "0.8em", background: LIME, marginLeft: "0.05em", alignSelf: "center", opacity: t % 0.8 < 0.4 ? 1 : 0 }} />
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 7em)", gap: "0.9em", marginTop: "1.6em" }}>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) => {
                  const hit = (d === "1" && typed === "1") || (d === "0" && typed === "10");
                  return <span key={i} style={{ ...center, width: "7em", height: "5em", borderRadius: "1.2em", background: hit ? LIME : d ? "#f1f0ea" : "transparent", fontWeight: 700 }}><span style={{ fontSize: "3.2em" }}>{d}</span></span>;
                })}
              </div>
            </div>
          )}
        </Phone>
      </div>
      <At x={6} y={76} w={88}><Words words={["Scan", "karo"]} size={11} mark={0} delay={0.3} /></At>
    </>
  );
}

function ShotRoute() {
  const { t } = useT();
  const boxes: [string, number, string][] = [["Your bank", 2, "#fff"], ["NPCI", 37, LIME], ["Their bank", 72, "#fff"]];
  const pops = [usePop(0.08), usePop(0.2), usePop(0.32)];
  const pills = [usePop(0.7), usePop(1.05), usePop(1.4)];
  return (
    <>
      <svg style={{ ...abs, left: 0, top: 0, width: "100em", height: "100em", overflow: "visible" }} viewBox="0 0 100 100">
        <clipPath id="routeclip"><rect x="0" y="0" width={26 + 48 * kf(t, [0.3, 1.1], [0, 1])} height="100" /></clipPath>
        <path d="M26 50 H37 M63 50 H74" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="3 2.4" clipPath="url(#routeclip)" />
      </svg>
      {boxes.map(([label, x, bg], i) => (
        <At key={label} x={x} y={36} w={26} h={28}><div style={{ width: "100%", height: "100%", ...pops[i] }}><Box bg={bg}><span style={{ textAlign: "center", fontWeight: 800, lineHeight: 1, fontSize: "5.6em", color: INK }}>{label}</span></Box></div></At>
      ))}
      <div style={{ ...abs, left: "6em", top: "10em", perspective: "60em", transform: `translateX(${kf(t, [0.6, 1.25, 1.9], [0, 35, 70])}em)` }}>
        <div style={{ transform: `rotateY(${kf(t, [0.6, 1.9], [0, 720])}deg)` }}><Coin size={18} /></div>
      </div>
      <div style={{ ...abs, display: "flex", justifyContent: "center", left: 0, width: "100em", top: "67em", gap: "3em" }}>
        {["1 · Request", "2 · Debit", "3 · Credit"].map((label, i) => (
          <span key={label} style={{ fontWeight: 700, fontSize: "3.6em", background: i === 1 ? LIME : "#fff", color: INK, border: `0.16em solid ${INK}`, borderRadius: "1em", padding: "0.15em 0.7em", ...pills[i] }}>{label}</span>
        ))}
      </div>
      <At x={6} y={80} w={88}><Words words={["Beech", "mein", "kaun?"]} size={8.5} mark={2} delay={0.4} /></At>
    </>
  );
}

function ShotHub() {
  const { t } = useT();
  const banks: [number, number][] = [[6, 8], [70, 8], [6, 70], [70, 70]];
  const pops = [usePop(0), usePop(0.1), usePop(0.2), usePop(0.3)];
  const u = t < 0.8 ? 0 : (t - 0.8) % 1;
  return (
    <>
      <svg style={{ ...abs, left: 0, top: 0, width: "100em", height: "100em", overflow: "visible" }} viewBox="0 0 100 100">
        {banks.map(([x, y], i) => <line key={i} x1={x + 12} y1={y + 11} x2={50} y2={50} stroke={RED} strokeWidth="0.9" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - kf(t, [0.2 + i * 0.12, 0.7 + i * 0.12], [0, 1])} />)}
      </svg>
      {banks.map(([x, y], i) => (
        <At key={i} x={x} y={y} w={24} h={22}><div style={{ width: "100%", height: "100%", ...pops[i] }}><Box><span style={{ fontWeight: 800, fontSize: "5em", color: INK }}>Bank</span></Box></div></At>
      ))}
      <At x={32} y={33} w={36} h={34}>
        {t > 0.8 && <span style={{ ...abs, inset: 0, borderRadius: "3em", border: `0.6em solid ${LIME}`, transform: `scale(${1 + 0.35 * u})`, opacity: 0.9 * (1 - u) }} />}
        <div style={{ width: "100%", height: "100%", transform: `scale(${kf(t, [0.55, 0.8, 1.05], [0, 1.15, 1])})` }}>
          <Box bg={LIME}><span style={{ fontWeight: 800, letterSpacing: "-0.03em", fontSize: "9em", color: INK }}>NPCI</span></Box>
        </div>
      </At>
      <At x={58} y={58} w={30} h={20} style={{ zIndex: 5 }}><Sticky r={6} delay={1.1} size={4.6}>the switchboard</Sticky></At>
    </>
  );
}

function ShotPaid() {
  const { frame, fps, t } = useT();
  const v = Math.min(10, Math.floor(t / 0.055));
  const pill = sp(frame, fps, 0.75, 300, 18);
  const c = ease(kf(t, [0.6, 1.5], [0, 1]));
  return (
    <>
      <At x={33} y={6} w={34} h={66}>
        <Phone bg={LIME}>
          <div style={{ textAlign: "center", color: INK }}>
            <div style={{ fontWeight: 800, letterSpacing: "-0.04em", fontSize: "11em", lineHeight: 1 }}>+₹{v}</div>
            <div style={{ fontWeight: 700, fontSize: "4em", opacity: kf(t, [0.7, 1], [0, 1]) }}>received</div>
          </div>
        </Phone>
      </At>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2, d = 30 + (i % 3) * 8;
        return <span key={i} style={{ ...abs, left: "49em", top: "36em", width: "2.6em", height: "2.6em", borderRadius: i % 2 ? "50%" : "0.5em", background: [LIME, COIN, RED, INK][i % 4],
          transform: `translate(${Math.cos(a) * d * c}em, ${Math.sin(a) * d * c}em) scale(${kf(t, [0.6, 1.05, 1.5], [0, 1.2, 0.8])}) rotate(${180 * c}deg)` }} />;
      })}
      <div style={{ ...abs, left: "50%", top: "78em", display: "flex", alignItems: "center", gap: "1.2em", fontWeight: 800, background: INK, color: "#fff", borderRadius: "10em", padding: "1.6em 4em", opacity: Math.min(1, pill), transform: `translateX(-50%) translateY(${lerp(12, 0, pill)}em)` }}>
        <span style={{ ...center, width: "6em", height: "6em", borderRadius: "50%", background: LIME, color: INK }}><span style={{ fontSize: "4em" }}>✓</span></span>
        <span style={{ fontSize: "5.4em" }}>Paid</span>
      </div>
    </>
  );
}

function ShotSpeed() {
  const { t } = useT();
  const v = Math.min(8, Math.floor(t / 0.11));
  return (
    <>
      <At x={24} y={4} w={52} h={52}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <rect x="44" y="-6" width="12" height="9" rx="2" fill={INK} />
          <circle cx="50" cy="52" r="42" fill="#fff" stroke={INK} strokeWidth="5" />
          <circle cx="50" cy="52" r="33" fill="none" stroke={LIME} strokeWidth="14" strokeLinecap="round" transform="rotate(-90 50 52)" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - 0.8 * ease(kf(t, [0, 0.9], [0, 1]))} />
          <text x="50" y="62" textAnchor="middle" fontWeight="800" fontSize="26" fill={INK} style={{ fontFamily }}>0.{v}s</text>
        </svg>
      </At>
      <At x={6} y={64} w={88}><Words words={["Under", "1", "second"]} size={10.5} mark={1} delay={0.5} /></At>
    </>
  );
}

function ShotPin() {
  const dark = useContext(Dark), fg = dark ? "#ffffff" : INK;
  const { frame, fps, t } = useT();
  const n = Math.min(5, Math.floor(t / 0.22));
  const done = n >= 5;
  const stamp = sp(frame, fps, 1.1, 500, 22);
  return (
    <>
      <At x={30} y={6} w={40} h={44}>
        <div style={{ width: "100%", height: "100%", ...center, background: done ? LIME : "#ffffff", border: `0.7em solid ${INK}`, borderRadius: "2.6em", boxShadow: `1.4em 1.4em 0 ${shade(dark)}`, boxSizing: "border-box" }}>
          <svg viewBox="0 0 60 60" style={{ width: "22em", height: "22em" }}>
            {done ? (
              <path d="M14 32 L26 44 L47 18" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - kf(t, [1.1, 1.4], [0, 1])} />
            ) : (
              <g>
                <path d="M20 28 V20 a10 10 0 0 1 20 0 V28" fill="none" stroke={INK} strokeWidth="5" transform={`translate(0 ${n >= 4 ? 4 : 0})`} />
                <rect x="13" y="27" width="34" height="26" rx="5" fill={INK} />
              </g>
            )}
          </svg>
        </div>
      </At>
      <div style={{ ...abs, display: "flex", justifyContent: "center", left: 0, width: "100em", top: "60em", gap: "4em" }}>
        {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: "7em", height: "7em", borderRadius: "50%", border: `0.7em solid ${fg}`, boxSizing: "border-box", background: i < n ? (dark ? LIME : INK) : "transparent" }} />)}
      </div>
      <div style={{ ...abs, left: "60em", top: "76em", fontWeight: 800, fontSize: "8em", color: RED, border: `0.12em solid ${RED}`, borderRadius: "0.18em", padding: "0 0.3em", lineHeight: 1.1, letterSpacing: "0.06em", opacity: done ? Math.min(1, stamp) : 0, transform: `scale(${lerp(3, 1, stamp)}) rotate(${lerp(-24, -12, stamp)}deg)` }}>SAFE</div>
      <At x={4} y={76} w={46}><div style={{ fontWeight: 700, fontSize: "4.6em", color: fg, lineHeight: 1.1, opacity: kf(t, [0.3, 0.6], [0, 1]), transform: `translateX(${kf(t, [0.3, 0.6], [-1, 0])}em)` }}>PIN never leaves your phone</div></At>
    </>
  );
}

function ShotRecap() {
  const notes: [string, number, number, number, string][] = [["Scan", 4, 18, -6, STICKY], ["NPCI routes it", 36, 10, 4, LIME], ["Paid in 1 s", 68, 20, -3, "#ffd2b0"]];
  return (
    <>
      {notes.map(([label, x, y, r, bg], i) => <At key={label} x={x} y={y} w={28} h={28}><Sticky bg={bg} r={r} delay={i * 0.25} size={5.4}>{label}</Sticky></At>)}
      <At x={6} y={62} w={88}><Words words={["That's", "UPI."]} size={12} mark={1} delay={0.9} /></At>
    </>
  );
}

/* every shot gets its own ground, all in the theme (the landing page's) */
export const g = (c: string, size: string) => ({ backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: `${size} ${size}` });
const GROUND: Record<string, { style: CSSProperties; dark?: boolean }> = {
  hook: { style: { background: "repeating-conic-gradient(from 0deg at 50% 46%, #fff3d6 0deg 9deg, #fde7b6 9deg 18deg)" } },
  coin: { style: { backgroundColor: "#f4f2ea", backgroundImage: "radial-gradient(rgb(31 28 27/0.2) 1.3px, transparent 1.6px)", backgroundSize: "4.5cqmin 4.5cqmin" } },
  qr: { style: { backgroundColor: "#fdecca", backgroundImage: "linear-gradient(180deg, transparent 72%, #9a5f2c 72%, #9a5f2c 73.6%, transparent 73.6%), linear-gradient(180deg, transparent 73.6%, #e2ae73 73.6%), repeating-linear-gradient(90deg, rgb(150 90 30/0.07) 0 0.5cqmin, transparent 0.5cqmin 9cqmin), radial-gradient(circle at 30% 30%, rgb(255 255 255/0.7), transparent 50%)" } },
  route: { style: { backgroundColor: "#1d3a2a", ...g("rgb(166 240 74/0.14)", "6cqmin") }, dark: true },
  hub: { style: { backgroundColor: INK, backgroundImage: "radial-gradient(circle at 50% 50%, rgb(166 240 74/0.22), transparent 55%), radial-gradient(rgb(255 255 255/0.09) 1px, transparent 1.4px)", backgroundSize: "100% 100%, 3.6cqmin 3.6cqmin" }, dark: true },
  paid: { style: { background: "repeating-conic-gradient(from 0deg at 50% 40%, #d2f7a0 0deg 10deg, #bdf27c 10deg 20deg)" } },
  speed: { style: { background: "repeating-linear-gradient(135deg, #f8f5b4 0 3cqmin, #f2ed92 3cqmin 6cqmin)" } },
  pin: { style: { backgroundColor: "#171918", backgroundImage: "radial-gradient(circle at 50% 30%, rgb(166 240 74/0.2), transparent 45%), repeating-radial-gradient(circle at 50% 30%, rgb(166 240 74/0.12) 0 1.5px, transparent 1.5px 5cqmin)" }, dark: true },
  recap: { style: { backgroundColor: "#e6d2aa", backgroundImage: "radial-gradient(rgb(120 80 30/0.14) 1px, transparent 1.5px), radial-gradient(rgb(255 255 255/0.3) 1px, transparent 1.5px)", backgroundSize: "3cqmin 3cqmin, 5cqmin 5cqmin", backgroundPosition: "0 0, 1.5cqmin 2cqmin" } },
};

const SHOTS = { hook: ShotHook, coin: ShotCoin, qr: ShotQR, route: ShotRoute, hub: ShotHub, paid: ShotPaid, speed: ShotSpeed, pin: ShotPin, recap: ShotRecap };
export type ShotName = keyof typeof SHOTS;

/* animated Noto emoji (Lottie) beside the stage, one or two per shot, in the frame's side margins */
const EMOJI: Record<ShotName, [string, string | null]> = {
  hook: ["2615", "1f914"], coin: ["1f4b8", null], qr: ["1f60e", null], route: ["26a1", null], hub: ["26a1", null],
  paid: ["1f389", "2705"], speed: ["1f680", null], pin: ["1f512", null], recap: ["1f44d", "2705"],
};

function Emoji({ code, side, delay }: { code: string; side: "left" | "right"; delay: number }) {
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [handle] = useState(() => delayRender(`emoji ${code}`));
  useEffect(() => {
    fetch(staticFile(`upidemo/${code}.json`)).then((r) => r.json()).then((j) => { setData(j); continueRender(handle); }).catch(() => continueRender(handle));
  }, [code, handle]);
  const { frame, fps } = useT();
  const p = sp(frame, fps, delay, 260, 14);
  if (!data) return null;
  return (
    <div style={{ ...abs, top: "34em", [side]: "4.5em", width: "26em", height: "26em", opacity: Math.min(1, p * 1.4), transform: `scale(${lerp(0.4, 1, p)}) rotate(${lerp(side === "left" ? -14 : 14, 0, p)}deg)` }}>
      <Lottie animationData={data} loop style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

const CUTS = [(p: number) => `translateX(${lerp(8, 0, p)}%)`, (p: number) => `scale(${lerp(1.06, 1, p)})`, (p: number) => `translateY(${lerp(6, 0, p)}%)`];

function Shot({ line, k, frames }: { line: DemoLine; k: number; frames: number }) {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const Comp = SHOTS[line.shot];
  const ground = GROUND[line.shot];
  const p = k === 0 ? 1 : ease(frame / 10);
  const drift = interpolate(frame, [0, frames], [1, 1.035]);
  const [left, right] = EMOJI[line.shot];
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, p), transform: CUTS[k % 3](p), fontFamily, fontSize: height / 100 }}>
      <AbsoluteFill style={{ containerType: "size" }}><AbsoluteFill style={ground.style} /></AbsoluteFill>
      <Dark.Provider value={!!ground.dark}>
        <AbsoluteFill style={{ transform: `scale(${drift})` }}>
          <div style={{ ...abs, left: "50%", top: 0, width: "100em", height: "100em", marginLeft: "-50em" }}><Comp /></div>
          {left && <Emoji code={left} side="left" delay={0.35} />}
          {right && <Emoji code={right} side="right" delay={0.6} />}
        </AbsoluteFill>
      </Dark.Provider>
      <Sequence from={Math.round(0.15 * FPS)}><Audio src={staticFile(line.audio)} /></Sequence>
    </AbsoluteFill>
  );
}

export function UpiDemo({ lines }: DemoProps) {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: "#f7f5ee" }}>
      {lines.map((line, k) => {
        const frames = shotFrames(line);
        const from = at;
        at += frames;
        return (
          <Sequence key={k} from={from} durationInFrames={frames + OVERLAP}>
            <Shot line={line} k={k} frames={frames + OVERLAP} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
