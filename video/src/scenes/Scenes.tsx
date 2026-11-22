/* Scene templates: the "Explain UPI" demo's hand-built shots (src/upidemo) turned into fill-in scenes. The agent never
   places anything: for each narration line it only picks a template and fills its slots (words, numbers, labels, two
   animated Noto emoji), so every film keeps the demo's look. Reveals are spread over the line's length, so a long line
   keeps landing new things instead of holding still.

   Props: public/<slug>/scenes.json, written by video/scenes.py. */

import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import React, { createContext, useContext, useEffect, useState, type CSSProperties } from "react";
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { GeoBeats } from "../notes/GeoBeats";
import { At, Box, Coin, Dark, INK, Phone, Spark, Sticky, Words, abs, center, ease, fontFamily, g, kf, lerp, sp, usePop, useT } from "../upidemo/UpiDemo";

export const FPS = 30;
const OVERLAP = 8;
const PAD = 0.45;
const LIME = "#a6f04a", STICKY = "#f6f39a", RED = "#e8402c", PEACH = "#ffd2b0", SKY = "#cfe8ff";

export type Template = "headline" | "number" | "flow" | "hub" | "timer" | "stamp" | "notes" | "phone" | "quote" | "compare" | "list" | "chapter" | "photos" | "map";
export type Slots = {
  words?: string[]; mark?: number; sub?: string; notes?: string[]; value?: string; label?: string; steps?: string[]; pills?: string[];
  center?: string; spokes?: string[]; stamp?: string; top?: string; big?: string; quote?: string; who?: string;
  left?: { title: string; value: string }; right?: { title: string; value: string }; title?: string; points?: string[];
  pictures?: { src: string; at: number; caption?: string; credit?: string }[];
  geo?: unknown; // map: the geography engine's beats (video/scenes.py place_maps), drawn by src/notes/GeoBeats.tsx
};
export type SceneLine = { template: Template; slots: Slots; emoji: (string | null)[]; audio: string | null; seconds: number; dir: string; chapter?: number; caption?: string };
/** the look's settings the creator chose (backend/app/api/vskills.py), written into scenes.json by video/scenes.py */
export type Style = { text?: string; background?: string; transition?: string; pace?: string; background_image?: string; hue?: number;
  sticker_place?: string; sticker_size?: string; caption_pos?: string; stage?: string };
export type ScenesProps = { lines: SceneLine[]; vertical?: boolean; style?: Style };

const frames = (l: SceneLine) => Math.round((l.seconds + PAD) * FPS);
export const scenesFrames = (p: ScenesProps) => p.lines.reduce((t, l) => t + frames(l), 0) + OVERLAP;

/** the line's length in seconds, so reveals can be spread across it */
const Dur = createContext(5);
const at = (dur: number, k: number, n: number, from = 0.25) => from + (k * Math.max(0.5, dur - from - 1.2)) / Math.max(1, n);

const fit = (s: string | undefined, n: number) => (s || "").length > n ? (s || "").slice(0, n - 1).trimEnd() + "…" : (s || "");
const wordsOf = (s: Slots, fallback = "") => (s.words?.length ? s.words : fallback.split(/\s+/)).filter(Boolean).slice(0, 5).map((w) => fit(w, 14));
const sizeFor = (ws: string[], big: number) => Math.min(big, 150 / Math.max(6, ws.join(" ").length));

/* ---------- templates ---------- */

function Headline({ s }: { s: Slots }) {
  const dur = useContext(Dur);
  const ws = wordsOf(s);
  const notes = (s.notes || []).slice(0, 2);
  const { t } = useT();
  return (
    <>
      {notes.map((n, i) => <At key={i} x={i ? 64 : 6} y={i ? 14 : 10} w={30} h={24}><Sticky bg={i ? LIME : STICKY} r={i ? 5 : -5} delay={at(dur, i + 1, 3, 0.6)} size={Math.min(5.4, 60 / Math.max(8, n.length))}>{fit(n, 40)}</Sticky></At>)}
      <At x={4} y={42} w={92}><Words words={ws} size={sizeFor(ws, 13)} mark={s.mark ?? -1} delay={0.2} /></At>
      {s.sub && <At x={6} y={66} w={88}><div style={{ textAlign: "center", fontWeight: 700, fontSize: "4.6em", lineHeight: 1.15, opacity: kf(t, [0.9, 1.2], [0, 1]), transform: `translateY(${kf(t, [0.9, 1.2], [0.4, 0])}em)` }}>{fit(s.sub, 70)}</div></At>}
      <Spark x={10} y={50} d={0.6} /><Spark x={86} y={44} d={0.8} lime />
    </>
  );
}

function Chapter({ s }: { s: Slots }) {
  const ws = wordsOf(s);
  const { t } = useT();
  return (
    <>
      <At x={30} y={20} w={40} h={14}><div style={{ ...center, height: "100%", background: INK, color: LIME, borderRadius: "2em", fontWeight: 800, ...usePop(0) }}><span style={{ fontSize: "5em", letterSpacing: "0.06em" }}>{fit(s.label || "CHAPTER", 18).toUpperCase()}</span></div></At>
      <At x={4} y={42} w={92}><Words words={ws} size={sizeFor(ws, 12)} mark={s.mark ?? ws.length - 1} delay={0.3} /></At>
      <div style={{ ...abs, left: "20em", top: "72em", width: "60em", height: "0.8em", background: INK, transformOrigin: "left", transform: `scaleX(${ease(kf(t, [0.6, 1.3], [0, 1]))})` }} />
    </>
  );
}

function NumberScene({ s }: { s: Slots }) {
  const { frame, fps, t } = useT();
  const raw = s.value || "";
  const m = raw.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
  const p = ease(kf(t, [0.3, 1.4], [0, 1]));
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const shown = m && isFinite(target) ? `${m[1]}${(target * p).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${m[3]}` : raw;
  const c = ease(kf(t, [1.2, 2.1], [0, 1]));
  const pill = sp(frame, fps, 1.3, 300, 18);
  return (
    <>
      <At x={18} y={10} w={64} h={52}><div style={{ width: "100%", height: "100%", ...usePop(0) }}><Box bg={LIME}>
        <div style={{ textAlign: "center", color: INK }}>
          <div style={{ fontWeight: 800, letterSpacing: "-0.04em", fontSize: `${Math.min(17, 110 / Math.max(3, shown.length))}em`, lineHeight: 1 }}>{fit(shown, 14)}</div>
          <div style={{ fontWeight: 700, fontSize: "4.4em", opacity: kf(t, [0.9, 1.2], [0, 1]) }}>{fit(s.label || (s.words || []).join(" "), 32)}</div>
        </div>
      </Box></div></At>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2, d = 34 + (i % 3) * 7;
        return <span key={i} style={{ ...abs, left: "49em", top: "34em", width: "2.4em", height: "2.4em", borderRadius: i % 2 ? "50%" : "0.5em", background: [LIME, "#f4c94a", RED, INK][i % 4], opacity: c < 1 ? 1 : 0.85,
          transform: `translate(${Math.cos(a) * d * c}em, ${Math.sin(a) * d * c}em) scale(${kf(t, [1.2, 1.6, 2.1], [0, 1.2, 0.8])})` }} />;
      })}
      {s.sub && <div style={{ ...abs, left: "50%", top: "72em", maxWidth: "86em", fontWeight: 800, background: INK, color: "#fff", borderRadius: "10em", padding: "1.4em 3.6em", whiteSpace: "nowrap", opacity: Math.min(1, pill), transform: `translateX(-50%) translateY(${lerp(12, 0, pill)}em)` }}><span style={{ fontSize: "4.6em" }}>{fit(s.sub, 34)}</span></div>}
    </>
  );
}

function Flow({ s }: { s: Slots }) {
  const dur = useContext(Dur);
  const { t } = useT();
  const steps = (s.steps || []).slice(0, 3).map((x) => fit(x, 24));
  while (steps.length < 3) steps.push("");
  const pills = (s.pills || []).slice(0, 3);
  const xs = [2, 37, 72];
  const pops = [usePop(0.1), usePop(at(dur, 1, 3, 0.1)), usePop(at(dur, 2, 3, 0.1))];
  const pillPops = [usePop(0.7), usePop(at(dur, 1, 3, 0.7)), usePop(at(dur, 2, 3, 0.7))];
  const ws = wordsOf(s);
  // the ₹ coin rides the flow only when the line is about money; otherwise a plain marker travels
  const dark = useContext(Dark);
  const money = /₹|\$|rupe|paisa|paise|money|pay|bank|upi|loan|salary|price|cost/i.test([...steps, ...pills, ...ws].join(" "));
  return (
    <>
      <svg style={{ ...abs, left: 0, top: 0, width: "100em", height: "100em", overflow: "visible" }} viewBox="0 0 100 100">
        <clipPath id="flowclip"><rect x="0" y="0" width={26 + 48 * kf(t, [0.3, at(dur, 2, 3, 0.3) + 0.4], [0, 1])} height="100" /></clipPath>
        <path d="M26 46 H37 M63 46 H74" fill="none" stroke={dark ? "#ffffff" : INK} strokeWidth="1.4" strokeDasharray="3 2.4" clipPath="url(#flowclip)" />
      </svg>
      {steps.map((label, i) => label && (
        <At key={i} x={xs[i]} y={32} w={26} h={28}><div style={{ width: "100%", height: "100%", ...pops[i] }}><Box bg={i === 1 ? LIME : "#fff"}><span style={{ textAlign: "center", fontWeight: 800, lineHeight: 1.02, fontSize: `${Math.min(5.6, 46 / Math.max(6, label.length))}em`, color: INK, padding: "0 0.3em" }}>{label}</span></Box></div></At>
      ))}
      <div style={{ ...abs, left: "6em", top: "8em", perspective: "60em", transform: `translateX(${kf(t, [0.6, at(dur, 1, 3, 0.6) + 0.3, at(dur, 2, 3, 0.6) + 0.3], [0, 35, 70])}em)` }}>
        <div style={{ transform: `rotateY(${kf(t, [0.6, dur], [0, 1080])}deg)` }}>{money ? <Coin size={16} /> : <span style={{ display: "block", width: "9em", height: "9em", borderRadius: "50%", background: LIME, border: `0.6em solid ${INK}`, boxSizing: "border-box", marginTop: "3em" }} />}</div>
      </div>
      {pills.length > 0 && <div style={{ ...abs, display: "flex", justifyContent: "center", left: 0, width: "100em", top: "64em", gap: "3em" }}>
        {pills.map((label, i) => <span key={i} style={{ fontWeight: 700, fontSize: "3.6em", background: i === 1 ? LIME : "#fff", color: INK, border: `0.16em solid ${INK}`, borderRadius: "1em", padding: "0.15em 0.7em", whiteSpace: "nowrap", ...pillPops[i] }}>{fit(label, 16)}</span>)}
      </div>}
      {ws.length > 0 && <At x={6} y={78} w={88}><Words words={ws} size={sizeFor(ws, 8.5)} mark={s.mark ?? -1} delay={0.4} /></At>}
    </>
  );
}

function Hub({ s }: { s: Slots }) {
  const dur = useContext(Dur);
  const { t } = useT();
  const spokes = (s.spokes || []).slice(0, 4).map((x) => fit(x, 24));  // wraps onto two lines rather than being cut
  const pos: [number, number][] = [[6, 8], [70, 8], [6, 70], [70, 70]];
  const pops = [usePop(0), usePop(at(dur, 1, 4, 0)), usePop(at(dur, 2, 4, 0)), usePop(at(dur, 3, 4, 0))];
  const u = t < 0.8 ? 0 : (t - 0.8) % 1;
  return (
    <>
      <svg style={{ ...abs, left: 0, top: 0, width: "100em", height: "100em", overflow: "visible" }} viewBox="0 0 100 100">
        {spokes.map((_, i) => <line key={i} x1={pos[i][0] + 12} y1={pos[i][1] + 11} x2={50} y2={50} stroke={RED} strokeWidth="0.9" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - kf(t, [at(dur, i, 4, 0) + 0.2, at(dur, i, 4, 0) + 0.7], [0, 1])} />)}
      </svg>
      {spokes.map((label, i) => (
        <At key={i} x={pos[i][0]} y={pos[i][1]} w={24} h={22}><div style={{ width: "100%", height: "100%", ...pops[i] }}><Box><span style={{ textAlign: "center", fontWeight: 800, lineHeight: 1.05, fontSize: `${label.length > 12 ? 3.6 : Math.min(4.8, 40 / Math.max(5, label.length))}em`, color: INK, padding: "0 0.4em" }}>{label}</span></Box></div></At>
      ))}
      <At x={32} y={33} w={36} h={34}>
        {t > 0.8 && <span style={{ ...abs, inset: 0, borderRadius: "3em", border: `0.6em solid ${LIME}`, transform: `scale(${1 + 0.35 * u})`, opacity: 0.9 * (1 - u) }} />}
        <div style={{ width: "100%", height: "100%", transform: `scale(${kf(t, [0.55, 0.8, 1.05], [0, 1.15, 1])})` }}>
          <Box bg={LIME}><span style={{ textAlign: "center", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, fontSize: `${Math.min(9, 60 / Math.max(4, (s.center || "").length))}em`, color: INK }}>{fit(s.center, 14)}</span></Box>
        </div>
      </At>
      {s.label && <At x={58} y={58} w={30} h={20} style={{ zIndex: 5 }}><Sticky r={6} delay={at(dur, 4, 5, 0.6)} size={Math.min(4.6, 50 / Math.max(8, s.label.length))}>{fit(s.label, 30)}</Sticky></At>}
    </>
  );
}

function Timer({ s }: { s: Slots }) {
  const { t } = useT();
  const ws = wordsOf(s);
  return (
    <>
      <At x={24} y={4} w={52} h={52}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <rect x="44" y="-6" width="12" height="9" rx="2" fill={INK} />
          <circle cx="50" cy="52" r="42" fill="#fff" stroke={INK} strokeWidth="5" />
          <circle cx="50" cy="52" r="33" fill="none" stroke={LIME} strokeWidth="14" strokeLinecap="round" transform="rotate(-90 50 52)" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - 0.85 * ease(kf(t, [0, 1.2], [0, 1]))} />
          <text x="50" y="61" textAnchor="middle" fontWeight="800" fontSize={Math.min(26, 120 / Math.max(4, (s.value || "").length))} fill={INK} style={{ fontFamily }}>{fit(s.value, 10)}</text>
        </svg>
      </At>
      <At x={6} y={64} w={88}><Words words={ws} size={sizeFor(ws, 10.5)} mark={s.mark ?? -1} delay={0.5} /></At>
    </>
  );
}

function Stamp({ s }: { s: Slots }) {
  const dark = useContext(Dark), fg = dark ? "#ffffff" : INK;
  const dur = useContext(Dur);
  const { frame, fps, t } = useT();
  const when = Math.min(1.6, dur * 0.4);
  const n = Math.min(5, Math.floor((t / when) * 5));
  const done = n >= 5;
  const stamp = sp(frame, fps, when, 500, 22);
  return (
    <>
      <At x={30} y={6} w={40} h={44}>
        <div style={{ width: "100%", height: "100%", ...center, background: done ? LIME : "#ffffff", border: `0.7em solid ${INK}`, borderRadius: "2.6em", boxShadow: `1.4em 1.4em 0 ${dark ? LIME : INK}`, boxSizing: "border-box" }}>
          <svg viewBox="0 0 60 60" style={{ width: "22em", height: "22em" }}>
            {done ? <path d="M14 32 L26 44 L47 18" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - kf(t, [when, when + 0.3], [0, 1])} />
              : <g><path d="M20 28 V20 a10 10 0 0 1 20 0 V28" fill="none" stroke={INK} strokeWidth="5" transform={`translate(0 ${n >= 4 ? 4 : 0})`} /><rect x="13" y="27" width="34" height="26" rx="5" fill={INK} /></g>}
          </svg>
        </div>
      </At>
      <div style={{ ...abs, display: "flex", justifyContent: "center", left: 0, width: "100em", top: "58em", gap: "4em" }}>
        {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: "6em", height: "6em", borderRadius: "50%", border: `0.7em solid ${fg}`, boxSizing: "border-box", background: i < n ? (dark ? LIME : INK) : "transparent" }} />)}
      </div>
      <div style={{ ...abs, left: "58em", top: "74em", fontWeight: 800, fontSize: "7em", color: RED, border: `0.12em solid ${RED}`, borderRadius: "0.18em", padding: "0 0.3em", lineHeight: 1.1, letterSpacing: "0.06em", whiteSpace: "nowrap", opacity: done ? Math.min(1, stamp) : 0, transform: `scale(${lerp(3, 1, stamp)}) rotate(${lerp(-24, -12, stamp)}deg)` }}>{fit(s.stamp || "SAFE", 10).toUpperCase()}</div>
      <At x={4} y={74} w={50}><div style={{ fontWeight: 700, fontSize: "4.4em", color: fg, lineHeight: 1.1, opacity: kf(t, [0.3, 0.6], [0, 1]) }}>{fit(s.label, 50)}</div></At>
    </>
  );
}

function Notes({ s }: { s: Slots }) {
  const dur = useContext(Dur);
  const notes = (s.notes || []).slice(0, 3);
  const spots: [number, number, number, string][] = [[4, 14, -6, STICKY], [36, 8, 4, LIME], [68, 16, -3, PEACH]];
  const ws = wordsOf(s);
  const last = at(dur, notes.length, notes.length + 1, 0.2);
  return (
    <>
      {notes.map((n, i) => <At key={i} x={spots[i][0]} y={spots[i][1]} w={28} h={28}><Sticky bg={spots[i][3]} r={spots[i][2]} delay={at(dur, i, notes.length + 1, 0.2)} size={Math.min(5.4, 56 / Math.max(6, n.length))}>{fit(n, 36)}</Sticky></At>)}
      {ws.length > 0 && <At x={6} y={60} w={88}><Words words={ws} size={sizeFor(ws, 12)} mark={s.mark ?? -1} delay={last} /></At>}
    </>
  );
}

function PhoneScene({ s }: { s: Slots }) {
  const dur = useContext(Dur);
  const { frame, fps } = useT();
  const slide = sp(frame, fps, 0, 160, 19);
  return (
    <>
      <div style={{ ...abs, left: "12em", top: "6em", width: "34em", height: "64em", transform: `translateX(${lerp(-40, 0, slide)}em) rotate(${lerp(-10, -4, slide)}deg)` }}>
        <Phone>
          <div style={{ textAlign: "center", color: INK, padding: "0 2em" }}>
            {s.top && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5em", fontWeight: 700, fontSize: "3em" }}><span style={{ ...center, width: "1.5em", height: "1.5em", borderRadius: "50%", background: LIME, fontWeight: 800 }}>{(s.top || "?")[0].toUpperCase()}</span>{fit(s.top, 16)}</div>}
            <div style={{ fontWeight: 800, letterSpacing: "-0.03em", fontSize: `${Math.min(9, 50 / Math.max(3, (s.big || "").length))}em`, lineHeight: 1.05, marginTop: "0.3em" }}><Words words={[fit(s.big, 18)]} size={1} delay={0.6} /></div>
          </div>
        </Phone>
      </div>
      {s.label && <At x={54} y={18} w={36} h={30}><Sticky r={5} delay={at(dur, 1, 2, 0.8)} size={Math.min(6, 64 / Math.max(6, s.label.length))}>{fit(s.label, 36)}</Sticky></At>}
      {s.sub && <At x={50} y={58} w={46}><div style={{ fontWeight: 800, fontSize: "5em", lineHeight: 1.1, color: INK, ...usePop(at(dur, 2, 3, 1)) }}>{fit(s.sub, 40)}</div></At>}
    </>
  );
}

function Quote({ s }: { s: Slots }) {
  const dur = useContext(Dur);
  const { t } = useT();
  const q = fit(s.quote, 150);
  const shown = Math.round(q.length * ease(kf(t, [0.4, Math.max(1.2, dur * 0.7)], [0, 1])));
  return (
    <>
      <At x={8} y={10} w={84} h={58}><div style={{ width: "100%", height: "100%", ...usePop(0) }}><Box style={{ padding: "4em", placeItems: "start" }}>
        <div style={{ fontWeight: 800, fontSize: "14em", lineHeight: 0.6, color: LIME, WebkitTextStroke: `0.04em ${INK}` }}>“</div>
        <div style={{ fontWeight: 700, fontSize: `${Math.min(7, 360 / Math.max(40, q.length))}em`, lineHeight: 1.2, color: INK, marginTop: "0.4em" }}>{q.slice(0, shown)}<span style={{ opacity: 0.12 }}>{q.slice(shown)}</span></div>
      </Box></div></At>
      {s.who && <At x={54} y={64} w={36} h={18}><Sticky r={-4} delay={0.8} size={Math.min(4.6, 50 / Math.max(8, s.who.length))}>— {fit(s.who, 34)}</Sticky></At>}
    </>
  );
}

function Compare({ s }: { s: Slots }) {
  const dur = useContext(Dur);
  const sides = [s.left, s.right];
  const pops = [usePop(0.1), usePop(at(dur, 1, 2, 0.3))];
  const ws = wordsOf(s);
  return (
    <>
      {sides.map((x, i) => x && (
        <At key={i} x={i ? 54 : 6} y={10} w={40} h={50}><div style={{ width: "100%", height: "100%", ...pops[i] }}><Box bg={i ? LIME : "#fff"}>
          <div style={{ textAlign: "center", color: INK, padding: "0 1.5em" }}>
            <div style={{ fontWeight: 700, fontSize: "4.2em", lineHeight: 1.1 }}>{fit(x.title, 22)}</div>
            <div style={{ fontWeight: 800, letterSpacing: "-0.03em", fontSize: `${Math.min(11, 60 / Math.max(3, (x.value || "").length))}em`, lineHeight: 1, marginTop: "0.25em" }}>{fit(x.value, 12)}</div>
          </div>
        </Box></div></At>
      ))}
      <div style={{ ...abs, left: "44em", top: "28em", width: "12em", height: "12em", ...center, borderRadius: "50%", background: INK, color: LIME, fontWeight: 800, ...usePop(at(dur, 1, 2, 0.2)) }}><span style={{ fontSize: "5em" }}>vs</span></div>
      {ws.length > 0 && <At x={6} y={70} w={88}><Words words={ws} size={sizeFor(ws, 9)} mark={s.mark ?? -1} delay={at(dur, 2, 3, 0.6)} /></At>}
    </>
  );
}

function List({ s }: { s: Slots }) {
  const dur = useContext(Dur);
  const pts = (s.points || []).slice(0, 4);
  const { t } = useT();
  return (
    <>
      {s.title && <At x={6} y={6} w={88}><div style={{ textAlign: "center", fontWeight: 800, fontSize: `${Math.min(8, 140 / Math.max(10, s.title.length))}em`, letterSpacing: "-0.03em", lineHeight: 1.05, opacity: kf(t, [0, 0.3], [0, 1]) }}>{fit(s.title, 40)}</div></At>}
      {pts.map((p, i) => {
        const d = at(dur, i, pts.length, 0.5);
        return (
          <At key={i} x={10} y={26 + i * 17} w={80} h={13}>
            <div style={{ display: "flex", alignItems: "center", gap: "2.4em", height: "100%", opacity: kf(t, [d, d + 0.25], [0, 1]), transform: `translateX(${kf(t, [d, d + 0.4], [-6, 0])}em)` }}>
              <span style={{ ...center, flexShrink: 0, width: "10em", height: "10em", borderRadius: "1.8em", background: [LIME, STICKY, PEACH, SKY][i], border: `0.6em solid ${INK}`, boxShadow: `0.8em 0.8em 0 ${INK}`, fontWeight: 800, boxSizing: "border-box" }}><span style={{ fontSize: "5em" }}>{i + 1}</span></span>
              <span style={{ fontWeight: 700, fontSize: `${Math.min(5.4, 220 / Math.max(30, p.length))}em`, lineHeight: 1.15 }}>{fit(p, 60)}</span>
            </div>
          </At>
        );
      })}
    </>
  );
}

/** pictures on the words: each real photo lands as a framed print exactly when its word is said, the newest on top with
    a slow push-in, the earlier ones left beneath it at an angle; its caption and credit under it */
function Photos({ s }: { s: Slots }) {
  const { frame, fps, t } = useT();
  const pics = (s.pictures || []).slice(0, 3);
  const cur = pics.reduce((k, p, i) => (t >= p.at ? i : k), 0);
  const tilt = [-4, 3.5, -2];
  const ws = wordsOf(s);
  return (
    <>
      {pics.map((p, i) => {
        if (t < p.at) return null;
        const q = sp(frame, fps, p.at, 220, 18);
        const top = i === cur;
        const since = t - p.at;
        const kb = 1 + 0.08 * Math.min(1, since / 4);  // the slow push-in while it is the one on top
        const off = (cur - i) * 7;                      // older prints step back and aside
        return (
          <div key={i} style={{ ...abs, left: `${12 + off * (i % 2 ? 1 : -1)}em`, top: `${6 + off * 0.4}em`, width: "76em", height: "54em", zIndex: i + 1,
            opacity: Math.min(1, q * 1.4) * (top ? 1 : 0.92), transform: `translateY(${lerp(30, 0, q)}em) rotate(${lerp(tilt[i] * 3, tilt[i], q)}deg) scale(${top ? 1 : 0.9})`,
            background: "#fff", padding: "1.6em 1.6em 5em", boxSizing: "border-box", border: `0.5em solid ${INK}`, boxShadow: `1.4em 1.4em 0 ${INK}` }}>
            <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#ddd" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${top ? kb : 1})`, transformOrigin: i % 2 ? "30% 40%" : "70% 45%" }} />
            </div>
            <div style={{ ...abs, left: "1.6em", right: "1.6em", bottom: "1em", display: "flex", justifyContent: "space-between", gap: "2em", fontSize: "2.6em", fontWeight: 600, color: INK }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fit(p.caption, 70)}</span>
              <span style={{ flexShrink: 0, opacity: 0.55, fontSize: "0.8em" }}>{fit(p.credit, 40)}</span>
            </div>
          </div>
        );
      })}
      {ws.length > 0 && <At x={4} y={80} w={92} style={{ zIndex: 9 }}><Words words={ws} size={sizeFor(ws, 9)} mark={s.mark ?? -1} delay={0.3} /></At>}
    </>
  );
}

const TEMPLATES: Record<Template, (p: { s: Slots }) => React.ReactElement> = {
  headline: Headline, chapter: Chapter, number: NumberScene, flow: Flow, hub: Hub, timer: Timer, stamp: Stamp, notes: Notes,
  phone: PhoneScene, quote: Quote, compare: Compare, list: List, photos: Photos, map: Headline,
};

/* the demo's grounds, one per template */
const GROUND: Record<Template, { style: CSSProperties; dark?: boolean }> = {
  headline: { style: { background: "repeating-conic-gradient(from 0deg at 50% 46%, #fff3d6 0deg 9deg, #fde7b6 9deg 18deg)" } },
  chapter: { style: { background: "repeating-linear-gradient(135deg, #f8f5b4 0 3cqmin, #f2ed92 3cqmin 6cqmin)" } },
  number: { style: { background: "repeating-conic-gradient(from 0deg at 50% 40%, #d2f7a0 0deg 10deg, #bdf27c 10deg 20deg)" } },
  flow: { style: { backgroundColor: "#1d3a2a", ...g("rgb(166 240 74/0.14)", "6cqmin") }, dark: true },
  hub: { style: { backgroundColor: INK, backgroundImage: "radial-gradient(circle at 50% 50%, rgb(166 240 74/0.22), transparent 55%), radial-gradient(rgb(255 255 255/0.09) 1px, transparent 1.4px)", backgroundSize: "100% 100%, 3.6cqmin 3.6cqmin" }, dark: true },
  timer: { style: { background: "repeating-linear-gradient(135deg, #f8f5b4 0 3cqmin, #f2ed92 3cqmin 6cqmin)" } },
  stamp: { style: { backgroundColor: "#171918", backgroundImage: "radial-gradient(circle at 50% 30%, rgb(166 240 74/0.2), transparent 45%), repeating-radial-gradient(circle at 50% 30%, rgb(166 240 74/0.12) 0 1.5px, transparent 1.5px 5cqmin)" }, dark: true },
  notes: { style: { backgroundColor: "#e6d2aa", backgroundImage: "radial-gradient(rgb(120 80 30/0.14) 1px, transparent 1.5px), radial-gradient(rgb(255 255 255/0.3) 1px, transparent 1.5px)", backgroundSize: "3cqmin 3cqmin, 5cqmin 5cqmin", backgroundPosition: "0 0, 1.5cqmin 2cqmin" } },
  phone: { style: { backgroundColor: "#fdecca", backgroundImage: "linear-gradient(180deg, transparent 72%, #9a5f2c 72%, #9a5f2c 73.6%, transparent 73.6%), linear-gradient(180deg, transparent 73.6%, #e2ae73 73.6%), repeating-linear-gradient(90deg, rgb(150 90 30/0.07) 0 0.5cqmin, transparent 0.5cqmin 9cqmin)" } },
  quote: { style: { backgroundColor: "#f4f2ea", backgroundImage: "radial-gradient(rgb(31 28 27/0.2) 1.3px, transparent 1.6px)", backgroundSize: "4.5cqmin 4.5cqmin" } },
  compare: { style: { backgroundColor: "#f4f2ea", ...g("rgb(31 28 27/0.08)", "5cqmin") } },
  list: { style: { backgroundColor: "#f7f5ee", backgroundImage: "radial-gradient(rgb(31 28 27/0.16) 1.2px, transparent 1.5px)", backgroundSize: "4cqmin 4cqmin" } },
  map: { style: { backgroundColor: "#efe3c8" } },
  photos: { style: { backgroundColor: "#e6d2aa", backgroundImage: "radial-gradient(rgb(120 80 30/0.14) 1px, transparent 1.5px)", backgroundSize: "3cqmin 3cqmin" } },
};

const STICKER_EM: Record<string, number> = { small: 18, medium: 26, large: 34 };

/** where a sticker sits: the frame's side margins (beside the stage), its corners, or, when the stage is moved to one
    side, stacked in the room it leaves */
function stickerSpot(side: "left" | "right", size: number, vertical?: boolean, style?: Style): CSSProperties {
  if (vertical) return { left: side === "left" ? "8em" : "66em", top: side === "left" ? "9em" : "150em" };
  const stage = style?.stage ?? "center";
  if (stage !== "center") {  // both stickers go to the free side, one above the other
    const free = stage === "left" ? "right" : "left";
    return { [free]: "8em", top: side === "left" ? "14em" : `${20 + size}em` };
  }
  if (style?.sticker_place === "corners") return { [side]: "3em", top: side === "left" ? "3em" : `${97 - size}em` };
  return { top: `${50 - size / 2}em`, [side]: "4.5em" };
}

function Emoji({ src, side, delay, vertical, style }: { src: string; side: "left" | "right"; delay: number; vertical?: boolean; style?: Style }) {
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [handle] = useState(() => delayRender(`emoji ${src}`));
  useEffect(() => {
    fetch(staticFile(src)).then((r) => r.json()).then((j) => { setData(j); continueRender(handle); }).catch(() => continueRender(handle));
  }, [src, handle]);
  const { frame, fps } = useT();
  const p = sp(frame, fps, delay, 260, 14);
  if (!data) return null;
  return (
    <div style={{ ...abs, ...stickerSpot(side, STICKER_EM[style?.sticker_size ?? "medium"] ?? 26, vertical, style), width: `${STICKER_EM[style?.sticker_size ?? "medium"] ?? 26}em`, height: `${STICKER_EM[style?.sticker_size ?? "medium"] ?? 26}em`, opacity: Math.min(1, p * 1.4), transform: `scale(${lerp(0.4, 1, p)}) rotate(${lerp(side === "left" ? -14 : 14, 0, p)}deg)` }}>
      <Lottie animationData={data} loop style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

const CUTS = [(p: number) => `translateX(${lerp(8, 0, p)}%)`, (p: number) => `scale(${lerp(1.06, 1, p)})`, (p: number) => `translateY(${lerp(6, 0, p)}%)`];
/** how one scene arrives, by the creator's "Between scenes" choice */
const ENTER: Record<string, (p: number, k: number) => string> = {
  soft: (p, k) => CUTS[k % 3](p),
  slide: (p) => `translateX(${lerp(100, 0, p)}%)`,
  board: (p, k) => `translate(${lerp(k % 2 ? -55 : 55, 0, p)}%, ${lerp(k % 3 ? 20 : -20, 0, p)}%) scale(${lerp(0.9, 1, p)})`, // the camera moves along one board
  cut: () => "none",
};
const PACE: Record<string, number> = { calm: 1, normal: 0.8, fast: 0.45 }; // the share of a line its reveals are spread over
const LIGHT: Template[] = ["headline", "notes", "quote", "compare", "list", "timer", "number", "chapter"];

/** the scene's ground, by the creator's "Background" choice: per template (films without a style), per chapter, one
    throughout, tinted to the topic, or their own image */
function groundOf(line: SceneLine, style?: Style): { style: CSSProperties; dark?: boolean } {
  const mode = style?.background;
  if (!mode) return GROUND[line.template] ?? GROUND.headline;
  if (mode === "one") return GROUND.list;
  if (mode === "per_chapter") return GROUND[LIGHT[(line.chapter ?? 0) % LIGHT.length]];
  if (mode === "topic") {
    const h = style?.hue ?? 90;
    return { style: { backgroundColor: `hsl(${h} 55% 93%)`, ...g(`hsl(${h} 35% 55% / 0.18)`, "5cqmin") } };
  }
  if (mode === "own" && style?.background_image) {
    return { style: { backgroundImage: `linear-gradient(rgb(255 255 255/0.55), rgb(255 255 255/0.55)), url(${/^https?:/.test(style.background_image) ? style.background_image : staticFile(style.background_image.replace(/^\/?(studio-assets\/)?/, "").replace(/\?.*$/, ""))})`, backgroundSize: "cover", backgroundPosition: "center" } };
  }
  return GROUND[line.template] ?? GROUND.headline;
}

/** "Everything I say": the line under the scene, each word lighting up as it is reached */
function Caption({ text, dur, top }: { text: string; dur: number; top?: boolean }) {
  const { t } = useT();
  const words = text.split(/\s+/).filter(Boolean);
  const reached = Math.floor((t / Math.max(0.5, dur)) * words.length);
  return (
    <div style={{ ...abs, left: "50%", ...(top ? { top: "4em" } : { bottom: "4em" }), transform: "translateX(-50%)", maxWidth: "150em", background: "rgb(31 28 27/0.88)", color: "#fff", borderRadius: "1.6em", padding: "1.2em 2.4em", fontWeight: 700, fontSize: "3.4em", lineHeight: 1.3, textAlign: "center", opacity: kf(t, [0, 0.25], [0, 1]) }}>
      {words.map((w, i) => <span key={i} style={{ color: i < reached ? LIME : "#fff" }}>{w} </span>)}
    </div>
  );
}

function Scene({ line, k, n, vertical, style }: { line: SceneLine; k: number; n: number; vertical?: boolean; style?: Style }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 100; // 1em = 1% of the frame's shorter side, in both shapes
  const Comp = TEMPLATES[line.template] ?? Headline;
  const ground = groundOf(line, style);
  const enter = ENTER[style?.transition ?? "soft"] ?? ENTER.soft;
  const p = k === 0 || style?.transition === "cut" ? 1 : ease(frame / (style?.transition === "board" ? 14 : 10));
  const drift = interpolate(frame, [0, n], [1, 1.035]);
  const [left, right] = line.emoji;
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, p), transform: enter(p, k), fontFamily, fontSize: unit, color: ground.dark ? "#fff" : INK }}>
      <AbsoluteFill style={{ containerType: "size" }}><AbsoluteFill style={ground.style} /></AbsoluteFill>
      {line.template === "map" && line.slots?.geo && !vertical ? (
        // Map and place: the geography engine draws the whole frame (real borders, the camera flying on the words)
        <GeoBeats p={{ seconds: line.seconds, frames: n, geo: line.slots.geo, slide_title: (line.slots.words || []).join(" "), geo_in: "none", geo_out: "none" } as never} />
      ) : <Dark.Provider value={!!ground.dark}>
        <Dur.Provider value={line.seconds * (style ? PACE[style.pace ?? "normal"] ?? 0.8 : 1)}>
          <AbsoluteFill style={{ transform: `scale(${drift})` }}>
            <div style={{ ...abs, top: vertical ? (height - width) / 2 : 0, width: "100em", height: "100em",
              ...(vertical || !style?.stage || style.stage === "center" ? { left: "50%", marginLeft: "-50em" } : style.stage === "left" ? { left: "6em" } : { right: "6em" }) }}><Comp s={line.slots || {}} /></div>
            {left && style?.sticker_place !== "none" && <Emoji src={`${line.dir}/${left}.json`} side="left" delay={0.35} vertical={vertical} style={style} />}
            {right && style?.sticker_place !== "none" && <Emoji src={`${line.dir}/${right}.json`} side="right" delay={0.6} vertical={vertical} style={style} />}
          </AbsoluteFill>
        </Dur.Provider>
      </Dark.Provider>}
      {style?.text === "captions" && line.caption && <Caption text={line.caption} dur={line.seconds} top={style.caption_pos === "top"} />}
      {line.audio && <Sequence from={Math.round(0.15 * FPS)}><Audio src={staticFile(line.audio)} /></Sequence>}
    </AbsoluteFill>
  );
}

export function Scenes({ lines, vertical, style }: ScenesProps) {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "#f7f5ee" }}>
      {lines.map((line, k) => {
        const n = frames(line);
        const start = from;
        from += n;
        return <Sequence key={k} from={start} durationInFrames={n + OVERLAP}><Scene line={line} k={k} n={n + OVERLAP} vertical={vertical} style={style} /></Sequence>;
      })}
    </AbsoluteFill>
  );
}
