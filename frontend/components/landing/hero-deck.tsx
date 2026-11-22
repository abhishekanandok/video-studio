"use client";

import { ArrowUp, BarChart3, BookOpen, Captions, Check, Clapperboard, Eye, FileText, Heart, Lightbulb, MessageSquareText, Mic, Palette, PenLine, Play, Quote, Scissors, ScrollText, Search, Sparkles, Type, Video, Wand2, Zap, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* The hero's moving centrepiece: Drishyya's pipeline told in ~12 seconds, in hero coordinates (1em = 1% of the hero).
   A dark prompt bar types an idea → the pointer sends it → the agents' cards rise out of the bar and fan open like a
   hand of teen patti → left to right, each card pops out of the hand and plays its work (sources found, script
   written, visuals planned, captions timed, Shorts cut) while the bar reports progress → the finished hand floats
   apart in zero gravity → the cards fall like cloth (flutter, sway, crumple) and fade → the bar is empty again. */

export type Phase = "type" | "send" | "deal" | "s0" | "s1" | "s2" | "s3" | "s4" | "s5" | "done" | "float" | "fall";
const ORDER: Phase[] = ["type", "send", "deal", "s0", "s1", "s2", "s3", "s4", "s5", "done", "float", "fall"];
const HOLD: Record<Phase, number> = { type: 1700, send: 550, deal: 1200, s0: 3600, s1: 3600, s2: 3600, s3: 3600, s4: 3600, s5: 3800, done: 1800, float: 1500, fall: 2300 };
/** which step card is out (0-4), 5 once all are done, -1 before the agents start */
const STEP: Record<Phase, number> = { type: -1, send: -1, deal: -1, s0: 0, s1: 1, s2: 2, s3: 3, s4: 4, s5: 5, done: 6, float: 6, fall: 6 };
const N = 6; // step cards
const PROMPTS = ["UPI, 10 min, my notes", "Why markets crash", "Black holes, class 9"];
const STATUS: Partial<Record<Phase, string>> = {
  deal: "Reading your plan", s0: "Planning 10 minutes", s1: "Writing your script", s2: "You record, we prompt",
  s3: "Adding 18 visuals", s4: "Editing + captions", s5: "Cutting 3 Shorts", done: "Your video is ready", float: "Your video is ready", fall: "Your video is ready",
};

/** the deck's clock; it holds still while `on` is false (the hero is scrolled away) */
export function useDeckPhase(on = true) {
  const [k, setK] = useState(0);
  const phase = ORDER[k % ORDER.length];
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => setK((v) => v + 1), HOLD[phase]);
    return () => clearTimeout(t);
  }, [k, phase, on]);
  return { phase, loop: Math.floor(k / ORDER.length) };
}

/* ---------- geometry (deck em: the deck is drawn at 1.15x the hero's em) ---------- */
const K = 1.15;
const BAR = { x: 1.8, y: 28.7, w: 25.2, h: 6.6 }; // the prompt bar the cards live in
const PX = 14.8, PY = 32; // the hand's pivot: every card's bottom centre
const CW = 12, CH = 16.5; // a card (playing-card proportions)
const CLIP = 34; // while in the hand, nothing below this line shows (it is behind the bar)
const SHOW_SCALE = 1.15, SHOW_BOTTOM = 30; // the shown card, in the void right of the headline
const STAGE = 100 / K; // the hero's 100em stage, in deck em
// the drag out to the right and the drag back to the hand use the same time and curve
const DRAG_S = 1.6, DRAG_EASE = [0.42, 0, 0.25, 1] as const;
const rad = (d: number) => (d * Math.PI) / 180;

type Kind = "plan" | "script" | "record" | "visuals" | "captions" | "shorts";
type Card = { kind: Kind; step: string; name: string; icon: LucideIcon; bg: string; ink: string; chip: string; chipInk: string; mark: string; r: number };
const CARDS: Card[] = [
  { kind: "plan", step: "01", name: "Plan", icon: Lightbulb, bg: "linear-gradient(150deg,#f8fbb4,#e3ea5c)", ink: "#3b3a12", chip: "#1f1c1b", chipInk: "#f3f79a", mark: "rgba(120,110,0,0.14)", r: -36 },
  { kind: "script", step: "02", name: "Script", icon: FileText, bg: "linear-gradient(150deg,#3d3936,#1c1a19)", ink: "#ffffff", chip: "#a6f04a", chipInk: "#1f1c1b", mark: "rgba(255,255,255,0.07)", r: -23 },
  { kind: "record", step: "03", name: "Record", icon: Mic, bg: "linear-gradient(150deg,#ffffff,#eceee6)", ink: "#2b2725", chip: "#e8402c", chipInk: "#ffffff", mark: "rgba(0,0,0,0.06)", r: -10 },
  { kind: "visuals", step: "04", name: "Visuals", icon: Wand2, bg: "linear-gradient(150deg,#cbfb80,#8fdb31)", ink: "#1f2a10", chip: "#1f1c1b", chipInk: "#c4fb73", mark: "rgba(30,60,0,0.12)", r: 3 },
  { kind: "captions", step: "05", name: "Edit", icon: Scissors, bg: "linear-gradient(150deg,#56a39d,#285c58)", ink: "#ffffff", chip: "rgba(255,255,255,0.92)", chipInk: "#285c58", mark: "rgba(255,255,255,0.1)", r: 16 },
  { kind: "shorts", step: "06", name: "Shorts", icon: Clapperboard, bg: "linear-gradient(150deg,#ffab66,#ee6a12)", ink: "#ffffff", chip: "rgba(255,255,255,0.92)", chipInk: "#d65a08", mark: "rgba(255,255,255,0.14)", r: 29 },
];

/* ---------- the work each agent shows when its card is out ---------- */
const snap = { duration: 0 };

function ScriptBody({ on }: { on: boolean }) {
  const rows: [number, boolean][][] = [[[3.4, false], [2.2, true], [3, false]], [[2.6, false], [4.2, false], [1.8, false]], [[3.8, false], [2.8, false]], [[2.4, false], [3, true]]];
  return (
    <div>
      <div className="font-semibold" style={{ fontSize: "0.62em", letterSpacing: "0.14em", color: "#a6f04a" }}>SCENE 1 · THE HOOK</div>
      <div className="flex flex-col" style={{ gap: "0.55em", marginTop: "0.75em" }}>
        {rows.map((row, k) => (
          <motion.div key={k} className="flex items-center" style={{ gap: "0.35em", transformOrigin: "0 50%" }}
            initial={false} animate={{ scaleX: on ? 1 : 0.0001 }} transition={on ? { delay: 0.12 + k * 0.17, duration: 0.3, ease: "easeOut" } : snap}>
            {row.map(([w, hi], j) => <span key={j} className="rounded-full" style={{ height: "0.55em", width: `${w}em`, background: hi ? "#a6f04a" : "rgba(255,255,255,0.32)" }} />)}
            {k === rows.length - 1 && <motion.span style={{ width: "0.14em", height: "1em", background: "#a6f04a" }} animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />}
          </motion.div>
        ))}
      </div>
      <motion.div className="flex items-center font-medium" style={{ marginTop: "0.9em", gap: "0.4em", fontSize: "0.62em", color: "rgba(255,255,255,0.6)" }}
        initial={false} animate={{ opacity: on ? 1 : 0 }} transition={on ? { delay: 0.8 } : snap}>
        <span className="rounded-full" style={{ width: "0.6em", height: "0.6em", background: "#a6f04a" }} />Hook · Story · Payoff
      </motion.div>
    </div>
  );
}

function VisualsBody({ on }: { on: boolean }) {
  const tile = (k: number, child: ReactNode) => (
    <motion.div key={k} className="relative grid place-items-center overflow-hidden" style={{ height: "3.6em", borderRadius: "0.7em", background: "rgba(255,255,255,0.88)", boxShadow: "0 0.3em 0.6em -0.3em rgba(30,60,0,0.45)" }}
      initial={false} animate={on ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.45 }} transition={on ? { delay: 0.1 + k * 0.12, type: "spring", stiffness: 260, damping: 16 } : snap}>
      {child}
    </motion.div>
  );
  const draw = (delay: number) => ({ initial: false as const, animate: { pathLength: on ? 1 : 0 }, transition: on ? { delay, duration: 0.6, ease: "easeOut" as const } : snap });
  return (
    <div className="grid grid-cols-2" style={{ gap: "0.5em" }}>
      {tile(0, (
        <div className="flex items-end" style={{ gap: "0.3em", height: "2.2em" }}>
          {[0.9, 1.5, 1.15, 2.1].map((h, j) => (
            <motion.span key={j} className="rounded-t-[0.2em]" style={{ width: "0.55em", background: j === 3 ? "#5b8f1f" : "#1f1c1b", transformOrigin: "50% 100%", height: `${h}em` }}
              initial={false} animate={{ scaleY: on ? 1 : 0.15 }} transition={on ? { delay: 0.3 + j * 0.08, duration: 0.4 } : snap} />
          ))}
        </div>
      ))}
      {tile(1, (
        <svg viewBox="0 0 40 40" style={{ width: "2.6em", height: "2.6em" }}>
          <circle cx="20" cy="20" r="14" fill="none" stroke="#e4e6dc" strokeWidth="6" />
          <motion.circle cx="20" cy="20" r="14" fill="none" stroke="#2a615d" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 20 20)" {...draw(0.4)} />
        </svg>
      ))}
      {tile(2, (
        <svg viewBox="0 0 60 34" style={{ width: "3.8em", height: "2.2em" }}>
          <motion.path d="M3 28 L16 20 L27 24 L40 10 L57 5" fill="none" stroke="#ee6a12" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" {...draw(0.5)} />
        </svg>
      ))}
      {tile(3, (
        <svg viewBox="0 0 60 30" style={{ width: "3.8em", height: "1.9em" }}>
          <motion.path d="M10 15 H50" stroke="#1f1c1b" strokeWidth="2.5" strokeDasharray="4 3" {...draw(0.55)} />
          <circle cx="8" cy="15" r="6" fill="#1f1c1b" />
          <motion.circle cx="30" cy="15" r="6" fill="#8fdb31" stroke="#1f1c1b" strokeWidth="2" initial={false} animate={{ scale: on ? 1 : 0 }} transition={on ? { delay: 0.7 } : snap} />
          <motion.circle cx="52" cy="15" r="6" fill="#1f1c1b" initial={false} animate={{ scale: on ? 1 : 0 }} transition={on ? { delay: 0.85 } : snap} />
        </svg>
      ))}
    </div>
  );
}

function CaptionsBody({ on }: { on: boolean }) {
  const words = ["ideas", "become", "videos"];
  const lime = "rgba(166,240,74,1)", none = "rgba(166,240,74,0)";
  return (
    <div>
      <div className="relative overflow-hidden" style={{ height: "4.9em", borderRadius: "0.8em", background: "radial-gradient(90% 120% at 30% 0%, #3e4a37, #161a14)", boxShadow: "inset 0 0 0 0.08em rgba(255,255,255,0.12)" }}>
        <div className="absolute rounded-full" style={{ left: "6.4em", top: "0.8em", width: "1.6em", height: "1.6em", background: "radial-gradient(circle at 35% 35%, #f3f79a, #c9d43a)" }} />
        <div className="absolute" style={{ left: 0, right: 0, bottom: 0, height: "2em", background: "linear-gradient(180deg, transparent, rgba(143,219,49,0.35))", clipPath: "polygon(0 60%, 30% 20%, 55% 55%, 80% 15%, 100% 45%, 100% 100%, 0 100%)" }} />
        <motion.div className="absolute flex font-semibold" style={{ left: "50%", bottom: "0.55em", x: "-50%", gap: "0.15em", fontSize: "0.72em", padding: "0.25em 0.35em", borderRadius: "0.5em", background: "rgba(0,0,0,0.55)" }}
          initial={false} animate={{ opacity: on ? 1 : 0, y: on ? "0em" : "0.6em" }} transition={on ? { delay: 0.15, duration: 0.3 } : snap}>
          {words.map((w, k) => (
            <motion.span key={w} style={{ padding: "0.05em 0.3em", borderRadius: "0.35em" }}
              animate={on ? { backgroundColor: [0, 1, 2, 3].map((s) => (s % 3 === k ? lime : none)), color: [0, 1, 2, 3].map((s) => (s % 3 === k ? "#1f1c1b" : "#ffffff")) } : { backgroundColor: none, color: "#ffffff" }}
              transition={on ? { repeat: Infinity, duration: 1.5, ease: "linear", times: [0, 0.33, 0.66, 1] } : snap}>{w}</motion.span>
          ))}
        </motion.div>
      </div>
      <div className="flex items-center justify-between" style={{ marginTop: "0.65em", height: "1.6em" }}>
        {Array.from({ length: 16 }, (_, j) => (
          <motion.span key={j} className="rounded-full" style={{ width: "0.28em", height: "1.6em", background: j < 9 ? "#a6f04a" : "rgba(255,255,255,0.4)" }}
            animate={on ? { scaleY: [0.3, 0.5 + ((j * 37) % 50) / 100, 0.3] } : { scaleY: 0.3 }} transition={on ? { repeat: Infinity, duration: 0.7 + (j % 4) * 0.12, ease: "easeInOut" } : snap} />
        ))}
      </div>
    </div>
  );
}

function ShortsBody({ on }: { on: boolean }) {
  const tints = ["linear-gradient(170deg,#c4fb73,#3f7d1e)", "linear-gradient(170deg,#7fd1c8,#285c58)", "linear-gradient(170deg,#f6f9a8,#d0a21c)"];
  return (
    <div>
      <div className="flex justify-center" style={{ gap: "0.5em" }}>
        {tints.map((t, k) => (
          <motion.div key={k} className="relative overflow-hidden" style={{ width: "2.9em", height: "5.1em", borderRadius: "0.6em", background: "#1f1c1b", boxShadow: "0 0 0 0.12em rgba(255,255,255,0.9), 0 0.5em 0.9em -0.4em rgba(0,0,0,0.5)" }}
            initial={false} animate={on ? { y: "0em", opacity: 1, rotate: (k - 1) * 4 } : { y: "1em", opacity: 0.4, rotate: 0 }} transition={on ? { delay: 0.1 + k * 0.14, type: "spring", stiffness: 260, damping: 16 } : snap}>
            <div className="absolute" style={{ inset: "0.25em", borderRadius: "0.4em", background: t }} />
            <Play className="absolute" style={{ left: "50%", top: "45%", width: "1em", height: "1em", transform: "translate(-50%,-50%)", color: "#fff" }} fill="#fff" />
            <div className="absolute overflow-hidden rounded-full" style={{ left: "0.45em", right: "0.45em", bottom: "0.45em", height: "0.22em", background: "rgba(255,255,255,0.35)" }}>
              <motion.div className="h-full rounded-full bg-white" style={{ transformOrigin: "0 50%" }} initial={false} animate={{ scaleX: on ? 1 : 0 }} transition={on ? { delay: 0.35 + k * 0.14, duration: 0.6 } : snap} />
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div className="flex items-center justify-center font-semibold" style={{ marginTop: "0.7em", gap: "0.35em", fontSize: "0.7em" }}
        initial={false} animate={{ opacity: on ? 1 : 0 }} transition={on ? { delay: 0.7 } : snap}>
        3 Shorts · 9:16 · ready
      </motion.div>
    </div>
  );
}

/** your plan: the topic, what you bring (notes, tone, sources), and the outline Drishyya makes of it */
function PlanBody({ on }: { on: boolean }) {
  const outline = ["Hook: a ₹10 chai", "How money moves", "Why it's safe"];
  return (
    <div>
      <motion.div className="font-semibold" style={{ fontSize: "0.68em", letterSpacing: "0.1em", color: "#6b6a1c" }} initial={false} animate={{ opacity: on ? 1 : 0.4 }} transition={on ? { delay: 0.1 } : snap}>YOUR TOPIC · 10 MIN</motion.div>
      <div className="flex flex-wrap" style={{ gap: "0.3em", marginTop: "0.45em" }}>
        {["My notes", "Friendly tone", "3 sources"].map((t, k) => (
          <motion.span key={t} className="rounded-full font-medium" style={{ fontSize: "0.62em", padding: "0.3em 0.7em", background: "rgba(255,255,255,0.75)", color: "#3b3a12" }}
            initial={false} animate={on ? { opacity: 1, y: "0em" } : { opacity: 0.35, y: "0.4em" }} transition={on ? { delay: 0.15 + k * 0.15 } : snap}>{t}</motion.span>
        ))}
      </div>
      <div className="flex flex-col" style={{ gap: "0.4em", marginTop: "0.7em" }}>
        {outline.map((t, k) => (
          <motion.div key={t} className="flex items-center" style={{ gap: "0.5em", padding: "0.42em 0.55em", borderRadius: "0.65em", background: "#fff", boxShadow: "0 0.3em 0.6em -0.35em rgba(0,0,0,0.3)" }}
            initial={false} animate={on ? { opacity: 1, x: "0em" } : { opacity: 0.4, x: "-0.5em" }} transition={on ? { delay: 0.6 + k * 0.18, duration: 0.3 } : snap}>
            <span className="grid shrink-0 place-items-center rounded-full font-bold" style={{ width: "1.3em", height: "1.3em", background: "#1f1c1b", color: "#f3f79a", fontSize: "0.7em" }}>{k + 1}</span>
            <span className="font-medium" style={{ fontSize: "0.7em", color: "#2b2725" }}>{t}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** you record yourself: the script rolls on screen like a teleprompter, the line you are on lit up */
function RecordBody({ on }: { on: boolean }) {
  const lines = ["Ek chai ke ₹10,", "QR scan kiya,", "aur paisa pahunch gaya.", "Par kaise?"];
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setK((x) => Math.min(x + 1, lines.length - 1)), 650);
    return () => { clearInterval(t); setK(0); };
  }, [on, lines.length]);
  return (
    <div>
      <div className="relative overflow-hidden" style={{ height: "6.6em", borderRadius: "0.8em", background: "radial-gradient(90% 120% at 50% 0%, #3a3634, #161413)" }}>
        <motion.div className="absolute inset-x-0 flex flex-col items-center font-semibold" style={{ top: "1.6em", gap: "0.35em", fontSize: "0.7em" }}
          animate={{ y: `${-k * 1.75}em` }} transition={{ duration: 0.4, ease: "easeOut" }}>
          {lines.map((l, j) => <span key={l} style={{ color: j === k && on ? "#a6f04a" : "rgba(255,255,255,0.45)", transition: "color 0.3s", whiteSpace: "nowrap" }}>{l}</span>)}
        </motion.div>
        <div className="absolute inset-x-0 top-0" style={{ height: "1.4em", background: "linear-gradient(180deg,#2c2826,transparent)" }} />
        <span className="absolute flex items-center rounded-full bg-black/50 font-semibold text-white" style={{ left: "0.45em", top: "0.45em", fontSize: "0.55em", padding: "0.2em 0.6em", gap: "0.35em" }}>
          <motion.span className="rounded-full" style={{ width: "0.6em", height: "0.6em", background: "#e8402c" }} animate={on ? { opacity: [1, 0.2, 1] } : { opacity: 0.4 }} transition={{ repeat: on ? Infinity : 0, duration: 0.9 }} />REC
        </span>
      </div>
      <div className="flex" style={{ gap: "0.3em", marginTop: "0.55em" }}>
        {["Camera", "Audio only", "AI voice"].map((t, j) => (
          <span key={t} className="rounded-full font-medium" style={{ fontSize: "0.6em", padding: "0.3em 0.65em", background: j === 0 ? "#1f1c1b" : "#ecede6", color: j === 0 ? "#a6f04a" : "#555" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

const BODY: Record<Kind, (p: { on: boolean }) => ReactNode> = { plan: PlanBody, script: ScriptBody, record: RecordBody, visuals: VisualsBody, captions: CaptionsBody, shorts: ShortsBody };

function StepCard({ c, state, lag }: { c: Card; state: "idle" | "active" | "done"; lag: number }) {
  const I = c.icon, Body = BODY[c.kind];
  // the work starts playing once the card has arrived where it is shown
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (state !== "active") return;
    const t = setTimeout(() => setArrived(true), lag);
    return () => { clearTimeout(t); setArrived(false); };
  }, [state, lag]);
  const on = state === "done" || (state === "active" && arrived);
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: "1.4em", background: c.bg, color: c.ink, border: "0.08em solid rgba(255,255,255,0.5)",
      boxShadow: "0 1.4em 2.6em -1em rgba(20,30,10,0.45), inset 0 0.12em 0.2em rgba(255,255,255,0.55), inset 0 -0.3em 0.6em rgba(0,0,0,0.12)" }}>
      <div className="absolute flex items-center" style={{ left: "0.85em", top: "0.85em", gap: "0.5em" }}>
        <span className="grid place-items-center" style={{ width: "2.1em", height: "2.1em", borderRadius: "0.65em", background: c.chip, boxShadow: "inset 0 0.08em 0.12em rgba(255,255,255,0.3)" }}>
          <I style={{ width: "1.15em", height: "1.15em", color: c.chipInk }} strokeWidth={2.4} />
        </span>
        <span className="font-semibold" style={{ fontSize: "1.05em" }}>{c.name}</span>
      </div>
      <div className="absolute grid place-items-center" style={{ right: "0.85em", top: "1em", width: "1.6em", height: "1.6em" }}>
        <AnimatePresence initial={false} mode="popLayout">
          {state === "done" ? (
            <motion.span key="ok" className="grid h-full w-full place-items-center rounded-full" style={{ background: "#a6f04a", boxShadow: "0 0.2em 0.4em rgba(0,0,0,0.25)" }}
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>
              <Check style={{ width: "1em", height: "1em", color: "#1f1c1b" }} strokeWidth={3.4} />
            </motion.span>
          ) : (
            <motion.span key="n" className="font-medium opacity-60" style={{ fontSize: "0.72em" }} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}>{c.step}</motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="absolute" style={{ left: "1em", right: "1em", top: "3.75em" }}><Body on={on} /></div>
      <div className="absolute whitespace-nowrap font-extrabold italic leading-none" style={{ left: "0.55em", bottom: "-0.1em", fontSize: "2.5em", letterSpacing: "-0.04em", color: c.mark }}>{c.name}</div>
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 30%, transparent 42%, transparent 72%, rgba(255,255,255,0.1) 100%)" }} />
    </div>
  );
}

/** where a card is in each phase, relative to sitting upright on the pivot */
function pose(phase: Phase, i: number, show: { x: number; y: number } | null) {
  const r = CARDS[i].r, s = STEP[phase];
  const flat = { rotateX: 0, rotateY: 0, skewX: 0, opacity: 1, filter: "blur(0px)" };
  // tucked inside the bar
  if (phase === "type" || phase === "send") return { x: "3em", y: `${CH}em`, rotate: 0, scale: 0.95, ...flat, transition: snap };
  // out of the hand, playing its work
  if (s === i && show) // dragged smoothly across to the empty space on the right, and shown there bigger
    return { x: `${show.x}em`, y: `${show.y}em`, rotate: i % 2 ? 3 : -3, scale: SHOW_SCALE, ...flat, transition: { duration: DRAG_S, ease: DRAG_EASE } };
  if (s === i) {
    const out = 7.5;
    return { x: `${out * Math.sin(rad(r))}em`, y: `${-out * Math.cos(rad(r))}em`, rotate: r * 0.3, scale: 1.12, ...flat, transition: { type: "spring" as const, stiffness: 170, damping: 17 } };
  }
  // in the hand (dealt like teen patti)
  if (phase === "deal" || (s >= 0 && s <= 4) || phase === "done")
    return { x: "0em", y: "0em", rotate: r, scale: 1, ...flat, transition: phase === "deal" ? { type: "spring" as const, stiffness: 95, damping: 13, delay: 0.1 + i * 0.12 } : { duration: DRAG_S, ease: DRAG_EASE } };
  // zero gravity: lift off and drift apart, turning slowly in space
  const dx = (i - 2.5) * 3, dy = -(6 + (i % 3) * 2.2);
  if (phase === "float") return {
    x: ["0em", `${dx * 0.6}em`, `${dx}em`], y: ["0em", `${dy * 0.7}em`, `${dy}em`], rotate: [r, r * 0.7 + (i % 2 ? 8 : -8), r * 0.5 + (i % 2 ? 12 : -10)],
    rotateX: [0, 14, 22], rotateY: [0, i % 2 ? -18 : 18, i % 2 ? -10 : 12], skewX: 0, scale: [1, 1.03, 1.02], opacity: 1, filter: "blur(0px)",
    transition: { duration: 1.5, ease: [0.37, 0, 0.63, 1] as const, delay: i * 0.05 },
  };
  // cloth falling: gravity takes it, it flutters, sways side to side, crumples a little, and fades away
  const r0 = r * 0.5 + (i % 2 ? 12 : -10);
  const sway = (k: number) => `${dx + (k % 2 ? 2.6 : -2.2) * (1 - k * 0.12)}em`;
  return {
    x: [`${dx}em`, sway(1), sway(2), sway(3), sway(4)], y: [`${dy}em`, `${dy + 6}em`, `${dy + 18}em`, `${dy + 34}em`, `${dy + 54}em`],
    rotate: [r0, r0 - 22, r0 + 6, r0 - 18, r0 + 12], rotateX: [22, 58, 18, 66, 80], rotateY: [10, -24, 20, -14, 6], skewX: [0, 9, -7, 11, 4],
    scale: [1.02, 0.98, 0.94, 0.88, 0.82], opacity: [1, 1, 1, 0.75, 0], filter: ["blur(0px)", "blur(0px)", "blur(0.4px)", "blur(1.2px)", "blur(3px)"],
    transition: { duration: 2.2, ease: [0.45, 0, 0.75, 0.6] as const, delay: (N - 1 - i) * 0.09 },
  };
}

/** the typed prompt; remounted for every loop */
function Typed({ text, run }: { text: string; run: boolean }) {
  const [n, setN] = useState(run ? 0 : text.length);
  useEffect(() => {
    if (!run) return;
    let k = 0;
    const id = setInterval(() => { k += 1; setN(k); if (k >= text.length) clearInterval(id); }, 1050 / text.length);
    return () => clearInterval(id);
  }, [run, text]);
  return (
    <span className="flex items-center whitespace-nowrap">
      {text.slice(0, n)}
      <motion.span style={{ width: "0.08em", height: "1.1em", marginLeft: "0.08em", background: "#a6f04a" }} animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
    </span>
  );
}

function PromptBar({ phase, loop }: { phase: Phase; loop: number }) {
  const s = STEP[phase], status = STATUS[phase], ready = s === N;
  const pct = phase === "deal" ? 0.06 : s < 0 ? 0 : Math.min(1, (s + 1) / N);
  return (
    <div className="absolute flex items-center overflow-hidden" style={{ left: `${BAR.x}em`, top: `${BAR.y}em`, width: `${BAR.w}em`, height: `${BAR.h}em`, borderRadius: `${BAR.h / 2}em`,
      background: "linear-gradient(180deg,#36322f,#1f1c1b)", color: "#fff", paddingLeft: "1.1em", gap: "0.8em",
      boxShadow: "0 1.4em 2.4em -1em rgba(0,0,0,0.5), inset 0 0.12em 0.2em rgba(255,255,255,0.16), 0 0 0 0.4em rgba(255,255,255,0.85), 0 0 0 0.5em rgba(0,0,0,0.06)" }}>
      {/* the Drishyya mark: an eye with a play button for its pupil */}
      <span className="grid shrink-0 place-items-center rounded-full" style={{ width: "3.8em", height: "3.8em", background: "rgba(255,255,255,0.08)" }}>
        <svg viewBox="0 0 24 24" style={{ width: "2.2em", height: "2.2em" }}>
          <path d="M1.5 12C4.6 6.2 8.2 4 12 4s7.4 2.2 10.5 8c-3.1 5.8-6.7 8-10.5 8S4.6 17.8 1.5 12Z" fill="#fff" />
          <path d="M10 8.6 15.4 12 10 15.4Z" fill="#7fcf2c" />
        </svg>
      </span>
      <div className="relative flex-1 overflow-hidden" style={{ height: "2.6em" }}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div key={status ?? `p${loop}`} className="absolute inset-0 flex items-center whitespace-nowrap font-medium" style={{ fontSize: "1.3em", gap: "0.45em", lineHeight: 1.1, paddingTop: "0.1em" }}
            initial={{ y: "0.9em", opacity: 0 }} animate={{ y: "0em", opacity: 1 }} exit={{ y: "-0.9em", opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            {status ? (
              <>
                {ready
                  ? <span className="grid shrink-0 place-items-center rounded-full" style={{ width: "1em", height: "1em", background: "#a6f04a" }}><Check style={{ width: "0.7em", height: "0.7em", color: "#1f1c1b" }} strokeWidth={3.4} /></span>
                  : <motion.span className="shrink-0 rounded-full" style={{ width: "0.85em", height: "0.85em", border: "0.14em solid rgba(166,240,74,0.25)", borderTopColor: "#a6f04a" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />}
                <span className={ready ? "" : "text-white/85"}>{status}</span>
              </>
            ) : <Typed key={loop} text={PROMPTS[loop % PROMPTS.length]} run={phase === "type"} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* send */}
      <motion.span className="relative grid shrink-0 place-items-center rounded-full" style={{ width: "4.4em", height: "4.4em", marginRight: "1.1em", background: "linear-gradient(135deg,#d6ff8f,#7fcf2c)", boxShadow: "inset 0 0.15em 0.2em rgba(255,255,255,0.6), 0 0.3em 0.6em rgba(0,0,0,0.35)" }}
        animate={phase === "send" ? { scale: [1, 0.84, 1.06, 1] } : { scale: 1 }} transition={{ duration: 0.45 }}>
        <ArrowUp style={{ width: "2.2em", height: "2.2em", color: "#1f1c1b" }} strokeWidth={2.8} />
        {phase === "send" && <motion.span className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 0.3em #a6f04a" }} initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 0.55 }} />}
      </motion.span>
      {/* progress along the bar */}
      <motion.div className="absolute bottom-0 left-0 rounded-full" style={{ height: "0.32em", background: "linear-gradient(90deg,#7fcf2c,#d6ff8f)", boxShadow: "0 0 0.6em #a6f04a" }}
        initial={false} animate={{ width: `${pct * 100}%`, opacity: pct ? 1 : 0 }} transition={pct ? { duration: 0.5, ease: "easeOut" } : snap} />
    </div>
  );
}

/** a glossy 3D pointer that comes in, clicks send, and steps aside */
function Pointer({ phase }: { phase: Phase }) {
  const at = phase === "type" || phase === "send";
  return (
    <motion.div className="absolute" style={{ left: "28.1em", top: "19.5em", width: "5.5em", height: "5.5em" }}
      animate={{ x: at ? "-5.1em" : "0em", y: at ? "12.4em" : "0em", scale: phase === "send" ? [1, 0.82, 1] : 1 }}
      transition={phase === "type" ? { duration: 1.1, delay: 0.4, ease: [0.3, 0, 0.2, 1] } : phase === "send" ? { duration: 0.45 } : { duration: 0.9, ease: "easeInOut" }}>
      <svg viewBox="0 0 64 64" className="h-full w-full" style={{ filter: "drop-shadow(0 0.8em 0.9em rgba(0,0,0,0.3))" }}>
        <defs><linearGradient id="hd-ptr" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#4a4644" /><stop offset="1" stopColor="#1c1a19" /></linearGradient></defs>
        <path d="M10 6 L54 30 L34 34 L26 54 Z" fill="url(#hd-ptr)" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
        <path d="M14 12 L46 30 L31 32" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

/* ---------- stickers: while a card is shown, glossy stickers about its work pop out from behind it, bob, and go ---------- */
type Sticker = { icon?: LucideIcon; text?: string; shape: "tile" | "circle" | "bubble" | "pill"; bg: string; fg: string; x: number; y: number; r: number; size: number };
const STICKERS: Sticker[][] = [
  [ // plan
    { icon: Lightbulb, shape: "circle", bg: "linear-gradient(140deg,#f8fbb4,#e3ea5c)", fg: "#3b3a12", x: -8.6, y: -6.2, r: -12, size: 5.6 },
    { icon: BookOpen, shape: "tile", bg: "linear-gradient(140deg,#3d3936,#1c1a19)", fg: "#f3f79a", x: 7.8, y: -2, r: 10, size: 5.2 },
    { icon: Search, text: "Your notes + 3 sources", shape: "pill", bg: "linear-gradient(140deg,#ffffff,#eceee6)", fg: "#2b2725", x: -6.6, y: 6.8, r: -5, size: 3.2 },
  ],
  [ // script
    { icon: PenLine, shape: "circle", bg: "linear-gradient(140deg,#cbfb80,#8fdb31)", fg: "#1f2a10", x: 7.6, y: -6, r: 14, size: 5.4 },
    { icon: Quote, shape: "bubble", bg: "linear-gradient(140deg,#ffffff,#eceee6)", fg: "#2b2725", x: -8.8, y: -3.4, r: -10, size: 5.4 },
    { icon: FileText, text: "Hook · 8s", shape: "pill", bg: "linear-gradient(140deg,#3d3936,#1c1a19)", fg: "#a6f04a", x: 7.4, y: 6.4, r: 6, size: 3.2 },
  ],
  [ // record
    { icon: Mic, shape: "circle", bg: "linear-gradient(140deg,#ff8a7a,#e8402c)", fg: "#ffffff", x: 7.8, y: -6, r: 12, size: 5.4 },
    { icon: Video, shape: "tile", bg: "linear-gradient(140deg,#3d3936,#1c1a19)", fg: "#ffffff", x: -8.8, y: -3, r: -10, size: 5.2 },
    { icon: ScrollText, text: "Script on screen", shape: "pill", bg: "linear-gradient(140deg,#cbfb80,#8fdb31)", fg: "#1f2a10", x: 6.8, y: 6.8, r: 5, size: 3.2 },
  ],
  [ // visuals
    { icon: BarChart3, shape: "tile", bg: "linear-gradient(140deg,#3d3936,#1c1a19)", fg: "#a6f04a", x: -8.8, y: -5.6, r: -12, size: 5.4 },
    { icon: Palette, shape: "circle", bg: "linear-gradient(140deg,#ffab66,#ee6a12)", fg: "#ffffff", x: 7.8, y: -4.2, r: 12, size: 5.2 },
    { icon: Sparkles, text: "18 visuals", shape: "pill", bg: "linear-gradient(140deg,#ffffff,#eceee6)", fg: "#3f7d1e", x: -7.2, y: 6.8, r: -5, size: 3.2 },
  ],
  [ // captions
    { icon: MessageSquareText, shape: "bubble", bg: "linear-gradient(140deg,#cbfb80,#8fdb31)", fg: "#1f2a10", x: -8.8, y: -5.4, r: -10, size: 5.6 },
    { text: "CC", shape: "tile", bg: "linear-gradient(140deg,#3d3936,#1c1a19)", fg: "#ffffff", x: 7.8, y: -2.6, r: 10, size: 4.8 },
    { icon: Type, text: "Hinglish", shape: "pill", bg: "linear-gradient(140deg,#f6f9a8,#e3ea5c)", fg: "#3b3a12", x: -7.4, y: 6.8, r: -6, size: 3.2 },
  ],
  [ // shorts
    { icon: Heart, shape: "circle", bg: "linear-gradient(140deg,#ff8a7a,#e8402c)", fg: "#ffffff", x: 7.6, y: -6, r: 12, size: 5.2 },
    { icon: Play, shape: "tile", bg: "linear-gradient(140deg,#56a39d,#285c58)", fg: "#ffffff", x: -8.8, y: -2.4, r: -10, size: 5.2 },
    { icon: Eye, text: "12.4K views", shape: "pill", bg: "linear-gradient(140deg,#ffffff,#eceee6)", fg: "#2b2725", x: 7, y: 6.8, r: 5, size: 3.2 },
  ],
];
const GLOW = ["rgba(243,247,154,0.6)", "rgba(60,56,52,0.25)", "rgba(232,64,44,0.3)", "rgba(166,240,74,0.5)", "rgba(86,163,157,0.45)", "rgba(255,138,60,0.45)"];

function StickerBit({ t }: { t: Sticker }) {
  const I = t.icon;
  const radius = t.shape === "circle" ? "50%" : t.shape === "pill" ? "999em" : t.shape === "bubble" ? "1.6em 1.6em 1.6em 0.3em" : "1.3em";
  const box: CSSProperties = t.shape === "pill"
    ? { height: `${t.size}em`, padding: "0 1.1em", gap: "0.45em" }
    : { width: `${t.size}em`, height: `${t.size}em` };
  return (
    <div className="flex items-center justify-center whitespace-nowrap font-bold" style={{ ...box, borderRadius: radius, background: t.bg, color: t.fg, border: "0.32em solid #fff",
      boxShadow: "0 1em 1.8em -0.6em rgba(20,30,10,0.45), inset 0 0.15em 0.25em rgba(255,255,255,0.55), inset 0 -0.35em 0.6em rgba(0,0,0,0.14)" }}>
      {I && <I style={{ width: t.shape === "pill" ? "1.35em" : `${t.size * 0.46}em`, height: t.shape === "pill" ? "1.35em" : `${t.size * 0.46}em` }} strokeWidth={2.4} />}
      {t.text && <span style={{ fontSize: t.shape === "pill" ? "1.15em" : "1.9em", letterSpacing: "-0.02em" }}>{t.text}</span>}
    </div>
  );
}

/** layer "back": the glow and the picture stickers, behind the shown card; layer "front": the text tags, on top of it so they can be read */
function Stickers({ step, at, layer }: { step: number; at: { x: number; y: number }; layer: "back" | "front" }) {
  return (
    <div className="absolute" style={{ left: `${at.x}em`, top: `${at.y}em`, width: 0, height: 0 }}>
      <AnimatePresence>
        {step >= 0 && step < N && (
          <motion.div key={step} className="absolute left-0 top-0" exit={{ opacity: 0, transition: { duration: 0.35 } }}>
            {/* a soft glow in the step's colour */}
            {layer === "back" && <motion.div className="absolute rounded-full" style={{ left: "-15em", top: "-15em", width: "30em", height: "30em", background: `radial-gradient(closest-side, ${GLOW[step]}, transparent)` }}
              initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.9, 1.05, 0.9], opacity: 1 }} transition={{ scale: { repeat: Infinity, duration: 2.4 }, opacity: { duration: 0.5, delay: 0.4 } }} />}
            {STICKERS[step].map((t, k) => (layer === "front") !== (t.shape === "pill") ? null : (
              <motion.div key={k} className="absolute left-0 top-0"
                initial={{ x: "-50%", y: "-50%", left: "0em", top: "0em", scale: 0.2, rotate: 0, opacity: 0 }}
                animate={{ x: "-50%", y: "-50%", left: `${t.x}em`, top: `${t.y}em`, scale: 1, rotate: t.r, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0, transition: { duration: 0.3 } }}
                transition={{ type: "spring", stiffness: 140, damping: 14, delay: 1.1 + k * 0.15 }}>
                <motion.div animate={{ y: ["0em", "-0.7em", "0em"], rotate: [0, k % 2 ? 4 : -4, 0] }} transition={{ repeat: Infinity, duration: 2 + k * 0.4, ease: "easeInOut" }}>
                  <StickerBit t={t} />
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** the whole piece, in hero coordinates: place its top-left at the hero's top-left (52em x 34em of content).
 *  `showcase`: on desktop, each card is dragged out to the empty space right of the headline and shown there. */
export function HeroDeck({ phase, loop, style, showcase = false }: { phase: Phase; loop: number; style?: CSSProperties; showcase?: boolean }) {
  const loose = phase === "float" || phase === "fall";
  const s = STEP[phase];
  const ref = useRef<HTMLDivElement>(null);
  // the empty space right of the 100em stage, measured in deck em: where the shown card goes
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current, sec = el?.closest("section");
    if (!showcase || !el || !sec) return;
    const measure = () => {
      const em = parseFloat(getComputedStyle(el).fontSize);
      const width = sec.clientWidth / em, room = width - STAGE;
      setSpot(room >= 15 ? { x: STAGE + room / 2 - 0.8, y: SHOW_BOTTOM } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sec);
    return () => ro.disconnect();
  }, [showcase]);
  const show = spot && { x: spot.x - PX, y: spot.y - PY };
  return (
    <div ref={ref} className="pointer-events-none relative" style={{ fontSize: `${K}em`, width: "46em", height: "42em", ...style }} aria-hidden>
      {spot && <Stickers layer="back" step={s} at={{ x: spot.x, y: spot.y - (CH * SHOW_SCALE) / 2 }} />}
      {/* cards: hidden below the bar's middle while they live in it, free once they float */}
      <motion.div className="absolute left-0 top-0" style={{ width: "200em", height: "100em", perspective: "80em" }}
        initial={false} animate={{ clipPath: loose ? "inset(0em 0em 0em 0em)" : `inset(0em 0em ${100 - CLIP}em 0em)` }} transition={loose ? { duration: 0.6 } : snap}>
        {CARDS.map((c, i) => (
          <motion.div key={c.kind} className="absolute" style={{ left: `${PX - CW / 2}em`, top: `${PY - CH}em`, width: `${CW}em`, height: `${CH}em`, zIndex: s === i ? 20 : i, transformOrigin: "50% 100%", transformStyle: "preserve-3d" }}
            initial={pose("type", i, show)} animate={pose(phase, i, show)}>
            <StepCard c={c} state={s === i ? "active" : s > i ? "done" : "idle"} lag={show ? 1400 : 150} />
          </motion.div>
        ))}
      </motion.div>
      {spot && <div className="absolute left-0 top-0" style={{ zIndex: 30 }}><Stickers layer="front" step={s} at={{ x: spot.x, y: spot.y - (CH * SHOW_SCALE) / 2 }} /></div>}
      <PromptBar phase={phase} loop={loop} />
      <Pointer phase={phase} />
    </div>
  );
}

/** the lime toggle that flips on while the agents work */
export function Toggle({ on }: { on: boolean }) {
  return (
    <div className="relative" style={{ width: "13em", height: "6.6em", borderRadius: "3.3em", background: on ? "linear-gradient(180deg,#b9f765,#7fcf2c)" : "linear-gradient(180deg,#e9e9e4,#d3d3cc)", transition: "background 0.5s",
      boxShadow: "inset 0 0.4em 0.8em rgba(0,0,0,0.18), 0 1em 2em -0.8em rgba(40,80,10,0.45), 0 0 0 0.35em #fff" }}>
      <motion.div className="absolute rounded-full bg-white" style={{ top: "0.7em", width: "5.2em", height: "5.2em", boxShadow: "0 0.4em 0.8em rgba(0,0,0,0.25), inset 0 -0.3em 0.5em rgba(0,0,0,0.08)" }}
        animate={{ left: on ? "7.1em" : "0.7em" }} transition={{ type: "spring", stiffness: 300, damping: 22 }} />
    </div>
  );
}

/** glossy 3D app tiles: speed, captions, play (they stay still) */
export function IconTiles(_: { phase: Phase }) {
    const tiles: { I: LucideIcon; bg: string; fg: string; x: number; y: number; r: number; s: number; fill?: boolean }[] = [
    { I: Zap, bg: "linear-gradient(140deg,#3a3634,#1a1817)", fg: "#f3e94a", x: 0, y: 0, r: -8, s: 12, fill: true },
    { I: Captions, bg: "linear-gradient(140deg,rgba(255,255,255,0.95),rgba(232,234,226,0.8))", fg: "#5b8f1f", x: 9, y: 4.5, r: 10, s: 11 },
    { I: Play, bg: "linear-gradient(140deg,#4f9a95,#2a615d)", fg: "#ffffff", x: 16.5, y: 9, r: -6, s: 12, fill: true },
  ];
  return (
    <div className="pointer-events-none relative" style={{ width: "30em", height: "22em" }} aria-hidden>
      {tiles.map(({ I, bg, fg, x, y, r, s, fill }, i) => (
        <motion.div key={i} className="absolute grid place-items-center" style={{ left: `${x}em`, top: `${y}em`, width: `${s}em`, height: `${s}em`, borderRadius: `${s * 0.24}em`, background: bg, zIndex: i,
          boxShadow: "0 1.4em 2.4em -1em rgba(0,0,0,0.45), inset 0 0.15em 0.25em rgba(255,255,255,0.5), inset 0 -0.4em 0.7em rgba(0,0,0,0.18)" }}
          initial={false} animate={{ rotate: r }}>
          <I style={{ width: `${s * 0.48}em`, height: `${s * 0.48}em`, color: fg, filter: "drop-shadow(0 0.3em 0.4em rgba(0,0,0,0.35))" }} fill={fill ? fg : "none"} strokeWidth={fill ? 1.2 : 2.4} />
          <div className="pointer-events-none absolute inset-0" style={{ borderRadius: "inherit", background: "linear-gradient(120deg, rgba(255,255,255,0.35), transparent 40%)" }} />
        </motion.div>
      ))}
    </div>
  );
}
