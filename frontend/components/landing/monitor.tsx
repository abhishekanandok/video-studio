"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

/* The monitor on its white block, measured from the reference hero: every size is in em, and the caller sets
   font-size so that 1em = 1% of the hero's width (the box is 40.3em x 47.1em; its bottom sits on the hero's bottom).
   Nothing sits on it: the screen itself shows what Drishyya does. */

/** What the screen types out, one capability after another: everything Drishyya does, for any creator. */
const CAPS: [string, string][] = [
  ["Just an idea?", "That's enough to start."],
  ["No script?", "We'll write it in your voice."],
  ["Camera shy?", "Read along. We'll prompt you."],
  ["Ums and ahs?", "Gone before you blink."],
  ["Boring slides?", "Every line gets a visual."],
  ["Hinglish?", "Captions in Roman + देवनागरी."],
  ["One video?", "Make it four: 3 Shorts free."],
  ["No editor?", "₹199 a video. Pay by UPI."],
  ["Faceless?", "Pick an AI voice. Your call."],
  ["Your idea.", "Your voice. Our visuals."],
]

/** The screen: "Drishyya" glitches in like a broken signal once per round, then each question and its answer are typed out. */
function Screen({ k, brand }: { k: number; brand: boolean }) {
  const [phase, setPhase] = useState<"glitch" | "type">("glitch");
  const [n, setN] = useState(0);
  const [name, sub] = CAPS[k % CAPS.length];
  useEffect(() => {
    setPhase(brand ? "glitch" : "type");
    setN(0);
    if (!brand) return;
    const t = setTimeout(() => setPhase("type"), 1400);
    return () => clearTimeout(t);
  }, [k, brand]);
  useEffect(() => {
    if (phase !== "type" || n >= name.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 70);
    return () => clearTimeout(t);
  }, [phase, n, name]);
  const done = n >= name.length;
  return phase === "glitch" ? (
    <div className="lp-screen-glitch grid h-full place-items-center">
      <span className="lp-glitch font-bold text-white" data-t="Drishyya" style={{ fontSize: "4.4em", lineHeight: 1, letterSpacing: "-0.02em", textShadow: "0 0 0.25em rgb(166 240 74 / 0.55)" }}>Drishyya</span>
      <span className="lp-noise absolute inset-x-0" />
    </div>
  ) : (
    <div className="flex h-full flex-col justify-center" style={{ padding: "0 1.8em" }}>
      <div className="font-mono text-[#a6f04a]/80" style={{ fontSize: "1em", letterSpacing: "0.12em" }}>
        DRISHYYA ▸ {String((k % CAPS.length) + 1).padStart(2, "0")}/{String(CAPS.length).padStart(2, "0")}
      </div>
      <div className="font-semibold text-white" style={{ fontSize: "2.6em", lineHeight: 1.15, whiteSpace: "nowrap", marginTop: "0.2em", textShadow: "0 0 0.35em rgb(166 240 74 / 0.45)" }}>
        {name.slice(0, n)}<span className="lp-cursor text-[#a6f04a]">▍</span>
      </div>
      <motion.div className="text-white/70" style={{ fontSize: "1.9em", lineHeight: 1.25, marginTop: "0.45em", color: "#e2fbc0" }} initial={{ opacity: 0 }} animate={{ opacity: done ? 1 : 0 }}>{sub}</motion.div>
      <div className="overflow-hidden rounded-full bg-white/10" style={{ height: "0.35em", marginTop: "0.8em" }}>
        <motion.div className="h-full rounded-full bg-[#a6f04a]" initial={{ width: "0%" }} animate={{ width: done ? "100%" : "4%" }} transition={{ duration: 1.6 }} />
      </div>
    </div>
  );
}

/** `slim`: a short white block and a taller, wider monitor in the same box (the hero uses it) */
export function AIMonitor({ start = 0, slim = false }: { start?: number; slim?: boolean }) {
  const B = slim ? { top: 43, h: 4.1 } : { top: 33.5, h: 13.6 }; // the white block
  // the monitor and its speaker keep the footer's proportions; slim just draws them f times bigger, sitting on the short block
  const f = slim ? 1.15 : 1;
  const M = slim ? { left: 3.4, top: B.top - 24.5 * f } : { left: 7.8, top: 9 };
  const SP = { left: M.left + 25.6 * f, top: M.top + 5.9 * f };
  const cable = slim ? "M32 38.2 C36 38.5 38.4 40 38.2 42 C38 43.6 37.6 44.6 36.9 45.6" : "M32.6 29.4 C36.5 29.6 38.2 31 37.8 34 C37.4 37.5 36.6 39.5 37.2 42.6 C37.6 44.2 37.4 45 36.9 45.6";
  const [k, setK] = useState(start);
  // the screen only changes while the monitor is on screen
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { margin: "100px" });
  useEffect(() => {
    if (!seen) return;
    const t = setInterval(() => setK((x) => x + 1), 4200);
    return () => clearInterval(t);
  }, [seen]);
  return (
    <div ref={ref} className="relative select-none" style={{ width: "40.3em", height: "47.1em" }} aria-hidden>
      {/* the white block, its top face lit */}
      <div className="absolute" style={{ left: "3.8em", top: `${B.top}em`, width: "36.5em", height: `${B.h}em` }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7f7f5] via-[#ececea] to-[#dcdcd8] shadow-[-1.5em_0_2.5em_-1em_rgb(0_0_0/0.25)]" />
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-white to-[#f1f1ee]" style={{ height: "1.1em" }} />
      </div>

      {/* cable from the back of the monitor down the block's right side */}
      <svg className="absolute left-0 top-0 z-[5] overflow-visible" width="40.3em" height="47.1em" viewBox="0 0 40.3 47.1" fill="none">
        <path d={cable} stroke="#141414" strokeWidth="0.65" strokeLinecap="round" />
        <rect x="36.2" y="45.3" width="1.4" height="1.6" rx="0.3" fill="#2a2a2a" />
      </svg>

      {/* the monitor */}
      <motion.div className="absolute z-10" style={{ fontSize: `${f}em`, left: `${M.left / f}em`, top: `${M.top / f}em`, width: "27.2em", height: "24.5em" }}
        initial={{ y: "4em", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 70, damping: 14 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffae4a] via-[#f7821f] to-[#e2620f] shadow-[inset_-0.9em_-1.1em_1.6em_rgb(120_40_0/0.35),inset_0.8em_0.9em_1.2em_rgb(255_220_160/0.55),0_1.4em_2em_-0.8em_rgb(0_0_0/0.35)]"
          style={{ borderRadius: "3.4em 3.4em 2.2em 2.2em" }} />
        <div className="lp-screen absolute overflow-hidden" style={{ left: "2.2em", right: "2.2em", top: "1.9em", height: "16.6em", borderRadius: "1.8em", boxShadow: "inset 0 0 1.6em rgb(0 0 0 / 0.85), 0 0 0 0.35em #c4550c" }}>
          <Screen k={k} brand={(k - start) % CAPS.length === 0} />
          <div className="lp-scan pointer-events-none absolute inset-x-0 top-0" />
        </div>
        {/* chin: print slot and status lights */}
        <div className="absolute rounded-full bg-[#b9500d]" style={{ left: "5em", top: "20.4em", width: "11em", height: "0.9em" }} />
        <div className="absolute flex" style={{ left: "15.6em", top: "21.4em", gap: "0.3em" }}>
          <span className="rounded-sm bg-[#a6f04a]" style={{ width: "1.4em", height: "0.8em" }} />
          <span className="rounded-sm bg-[#b7eadd]" style={{ width: "1.4em", height: "0.8em" }} />
          <span className="rounded-sm bg-[#ef4444]" style={{ width: "1.4em", height: "0.8em" }} />
        </div>
      </motion.div>

      {/* side speaker / knob */}
      <motion.div className="absolute z-[9] grid place-items-center bg-gradient-to-b from-[#f4f4f2] via-[#d9d9d6] to-[#a9a9a5] shadow-[0_0.6em_1.2em_rgb(0_0_0/0.3)]"
        style={{ fontSize: `${f}em`, left: `${SP.left / f}em`, top: `${SP.top / f}em`, width: "6.2em", height: "10.2em", borderRadius: "0 3em 3em 0" }}
        initial={{ x: "-2em", opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 80, damping: 14 }}>
        <div className="lp-knob grid place-items-center rounded-full bg-[#ff7a1f]" style={{ marginLeft: "1.2em", width: "4em", height: "4em", border: "0.55em solid #c94f0b" }}>
          <div className="rounded-full bg-[#7a2a00]" style={{ width: "1.1em", height: "1.1em" }} />
        </div>
      </motion.div>
    </div>
  );
}
