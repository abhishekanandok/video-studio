"use client";

import { ArrowUp, FileText, Link2, Mic, Timer } from "lucide-react";
import { AnimatePresence, motion, useTransform, type MotionValue } from "motion/react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Film, filmSeconds, type ShotName } from "./explainer";

/* The "One studio" section: an Apple-style sticky scroll reveal. The section pins while you scroll; the screen holds
   still and only the content changes, five steps from the idea to the finished video. No card, no frame: every scene
   floats on the section's own background, and each one blurs and fades in place (out upward, in from below).
   Sizes are in em. */

export const STEPS = [
  { title: "Your idea", sub: "Type a topic, add your notes. We research it, and every fact keeps its source." },
  { title: "A plan", sub: "The video laid out minute by minute. You approve it." },
  { title: "Your script", sub: "Written in your voice, with a visual marked for every line." },
  { title: "You record", sub: "Read the script off the teleprompter. Or let an AI voice or avatar say it." },
  { title: "Clean cut", sub: "Silences, ums and retakes, gone." },
  { title: "Review", sub: "Watch every scene. Approve it, or ask for a change in plain words." },
  { title: "Publish", sub: "It goes out: the full video and three Shorts cut from it." },
];

/* Video clips: drop <name>.mp4 into public/landing/clips/ and add the name here; until then the photo (with its slow
   camera move) stands in. Prompts for every clip: docs/landing/clip-prompts.md. */
const CLIPS = new Set<string>([]);
function Clip({ name, poster, pos, children }: { name: string; poster: string; pos?: string; children: ReactNode }) {
  if (!CLIPS.has(name)) return <>{children}</>;
  return <video src={`/landing/clips/${name}.mp4`} poster={`/landing/${poster}.jpg`} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} />;
}

const glass = "border border-white/80 bg-white/80 shadow-[0_0.6em_1.6em_-0.8em_rgb(0_0_0/0.25)]";
const ease = [0.22, 1, 0.36, 1] as const;

/* ---------- 1. the idea ---------- */
function IdeaScene() {
  // type the idea → press the arrow → the bar moves up and the research appears under it
  const text = "Explain UPI in 10 minutes, here are my notes";
  const [n, setN] = useState(0);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= text.length ? x : x + 1)), 38);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (n < text.length) return;
    const t = setTimeout(() => setSent(true), 650);
    return () => clearTimeout(t);
  }, [n, text.length]);
  const chips: [ReactNode, string, number, number, number][] = [
    [<FileText key="f" style={{ width: "1.1em", height: "1.1em" }} />, "notes.pdf", 6, 10, -6],
    [<Link2 key="l" style={{ width: "1.1em", height: "1.1em" }} />, "3 links", 30, 6, 5],
    [<Timer key="t" style={{ width: "1.1em", height: "1.1em" }} />, "10 min", 8, 40, 4],
    [<Mic key="m" style={{ width: "1.1em", height: "1.1em" }} />, "Friendly, Hinglish", 26, 43, -4],
  ];
  return (
    <div className="absolute inset-0">
      {chips.map(([icon, label, x, y, r], k) => (
        <motion.div key={label} className="absolute" style={{ left: `${x}em`, top: `${y}em` }}
          initial={{ opacity: 0, y: "2em", rotate: 0 }} animate={sent ? { opacity: 0, y: "-3em", rotate: r, filter: "blur(8px)" } : { opacity: 1, y: "0em", rotate: r }}
          transition={sent ? { duration: 0.5, ease } : { delay: 0.5 + k * 0.15, duration: 0.7, ease }}>
          <motion.span className={`flex items-center rounded-full font-medium text-[#2b2725] ${glass}`} style={{ padding: "0.6em 1.2em", gap: "0.5em", fontSize: "1.25em" }}
            animate={{ y: ["0em", "-0.4em", "0em"] }} transition={{ repeat: Infinity, duration: 3 + k * 0.5, ease: "easeInOut" }}>
            {icon}{label}
          </motion.span>
        </motion.div>
      ))}
      <motion.div className={`absolute z-10 flex items-center rounded-full ${glass}`} style={{ left: "1em", right: "1em", padding: "0 1em 0 2em", gap: "1em" }}
        initial={false} animate={sent ? { top: "0em", height: "5.6em", fontSize: "0.85em" } : { top: "23em", height: "7em", fontSize: "1em" }} transition={{ duration: 0.7, ease }}>
        <span className="flex-1 font-medium text-[#1f1c1b]" style={{ fontSize: "1.7em" }}>
          {text.slice(0, n)}<span className="lp-cursor text-[#5b8f1f]">▍</span>
        </span>
        <motion.span className="grid shrink-0 place-items-center rounded-full bg-[#1f1c1b]" style={{ width: "4.8em", height: "4.8em" }}
          animate={n >= text.length ? { scale: [1, 0.86, 1.06, 1] } : { scale: 1 }} transition={{ duration: 0.5 }}>
          <ArrowUp style={{ width: "2.2em", height: "2.2em", color: "#a6f04a" }} strokeWidth={2.6} />
        </motion.span>
      </motion.div>
      {sent && <div className="absolute inset-x-0" style={{ top: "7em", height: "49em" }}><ResearchScene /></div>}
    </div>
  );
}

/* ---------- 2. the plan ---------- */
function PlanScene() {
  const rows = [["0:00", "The hook", "A ₹10 chai, paid in one second"], ["0:45", "How money moves", "Phone → bank → NPCI → bank"], ["4:10", "Why it's safe", "PIN, limits, what can go wrong"], ["8:30", "Recap", "Three things to remember"]];
  return (
    <div className="absolute inset-0" style={{ padding: "4em 2em" }}>
      <motion.div className="absolute w-[0.25em] rounded-full bg-[#1f1c1b]/15" style={{ left: "4.4em", top: "6em", height: "40em", originY: 0 }}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1.2, ease }} />
      <div className="flex flex-col" style={{ gap: "2.2em", marginTop: "1em" }}>
        {rows.map(([t, h, d], k) => (
          <motion.div key={t} className="flex items-center" style={{ gap: "1.6em" }}
            initial={{ opacity: 0, x: "-1.5em", filter: "blur(6px)" }} animate={{ opacity: 1, x: "0em", filter: "blur(0px)" }} transition={{ delay: 0.3 + k * 0.22, duration: 0.6, ease }}>
            <motion.span className="relative z-10 grid shrink-0 place-items-center rounded-full bg-[#1f1c1b]" style={{ width: "1.6em", height: "1.6em", marginLeft: "1.6em" }}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + k * 0.22, type: "spring", stiffness: 400, damping: 16 }}>
              <span className="rounded-full bg-[#a6f04a]" style={{ width: "0.6em", height: "0.6em" }} />
            </motion.span>
            <div className={`flex flex-1 items-center rounded-[1.4em] ${glass}`} style={{ padding: "1.1em 1.5em", gap: "1.4em" }}>
              <span className="font-mono text-[#777]" style={{ fontSize: "1.15em", width: "3em" }}>{t}</span>
              <span>
                <span className="block font-semibold text-[#1f1c1b]" style={{ fontSize: "1.45em" }}>{h}</span>
                <span className="block text-[#666]" style={{ fontSize: "1.05em" }}>{d}</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 3. the script ---------- */
function ScriptScene() {
  const lines: [string, string][] = [["Ek chai ke ₹10. Aapne QR scan kiya,", "PHOTO"], ["aur paisa ek second mein pahunch gaya.", "COUNTER"], ["Par beech mein hua kya? Chaliye dekhte hain.", "FLOWCHART"]];
  return (
    <div className="absolute inset-0 flex flex-col justify-center" style={{ gap: "2.6em", padding: "0 1.5em" }}>
      <motion.div className="font-mono text-[#777]" style={{ fontSize: "1.05em", letterSpacing: "0.12em" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        SCENE 1 · THE HOOK · IN YOUR VOICE
      </motion.div>
      {lines.map(([l, tag], k) => (
        <div key={tag}>
          <div className="font-semibold leading-snug text-[#1f1c1b]" style={{ fontSize: "2.3em" }}>
            {l.split(" ").map((w, j) => (
              <motion.span key={j} className="inline-block" style={{ marginRight: "0.25em" }} initial={{ opacity: 0, y: "0.4em", filter: "blur(4px)" }} animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
                transition={{ delay: 0.3 + k * 0.7 + j * 0.06, duration: 0.4, ease }}>{w}</motion.span>
            ))}
          </div>
          <motion.span className="mt-[0.7em] inline-flex items-center rounded-full bg-[#1f1c1b] font-mono font-semibold text-[#a6f04a]" style={{ fontSize: "0.95em", padding: "0.35em 0.9em", letterSpacing: "0.08em" }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.75 + k * 0.7, type: "spring", stiffness: 300, damping: 16 }}>
            [{tag}]
          </motion.span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 4. you record (or pick an AI voice or avatar) ---------- */
/* Three hero-style cards, fanned like a hand: You record (the default, with the teleprompter), AI voice, AI avatar.
   One at a time pops out of the hand and plays; the other two wait behind it. */
const SHOW_UP = [
  { key: "record", name: "You record", tag: "Default", note: "Read it off the teleprompter, in your own voice", bg: "#1f1c1b", ink: "#2b2725", chip: "#e8402c", chipInk: "#ffffff" },
  { key: "voice", name: "AI voice", tag: "Optional", note: "Your script, read in a warm Hindi voice", bg: "linear-gradient(150deg,#3d3936,#1c1a19)", ink: "#ffffff", chip: "#a6f04a", chipInk: "#1f1c1b" },
  { key: "avatar", name: "AI avatar", tag: "Optional", note: "A presenter says it for you", bg: "linear-gradient(150deg,#cbfb80,#8fdb31)", ink: "#1f2a10", chip: "#1f1c1b", chipInk: "#c4fb73" },
] as const;
const FAN = [{ x: 0, top: 12, r: -9 }, { x: 14.5, top: 10, r: 0 }, { x: 29, top: 12, r: 9 }];

function Recording({ on }: { on: boolean }) {
  const lines = ["Ek chai ke ₹10.", "Aapne QR scan kiya,", "aur paisa pahunch gaya.", "Par beech mein hua kya?"];
  const [k, setK] = useState(0);
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!on) return;
    setK(0);
    const a = setInterval(() => setK((x) => Math.min(x + 1, lines.length - 1)), 700);
    const b = setInterval(() => setS((x) => x + 1), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [on, lines.length]);
  const corner = (pos: CSSProperties, r: string) => <span className="absolute border-white/80" style={{ ...pos, width: "1.4em", height: "1.4em", borderStyle: "solid", borderWidth: 0, ...Object.fromEntries(r.split(" ").map((x) => [x, "0.18em"])) }} />;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Clip name="record" poster="creator" pos="50% 42%">
        <motion.img src="/landing/creator.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 42%" }}
          animate={{ scale: on ? [1.04, 1.1] : 1.04 }} transition={{ duration: 6, ease: "linear" }} />
      </Clip>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(0 0 0/0.55) 0%, transparent 28%, transparent 48%, rgb(0 0 0/0.88) 100%)" }} />
      {corner({ left: "0.9em", top: "4.2em" }, "borderLeftWidth borderTopWidth")}
      {corner({ right: "0.9em", top: "4.2em" }, "borderRightWidth borderTopWidth")}
      {corner({ left: "0.9em", bottom: "0.9em" }, "borderLeftWidth borderBottomWidth")}
      {corner({ right: "0.9em", bottom: "0.9em" }, "borderRightWidth borderBottomWidth")}
      <div className="absolute flex items-center justify-between text-white" style={{ left: "1.2em", right: "1.2em", top: "1.1em" }}>
        <span className="font-semibold" style={{ fontSize: "1.45em", textShadow: "0 0.1em 0.4em rgb(0 0 0/0.5)" }}>You record</span>
        <span className="flex items-center rounded-full bg-[#e8402c] font-semibold" style={{ padding: "0.3em 0.8em", gap: "0.4em", fontSize: "0.8em" }}>
          <motion.span className="rounded-full bg-white" style={{ width: "0.6em", height: "0.6em" }} animate={on ? { opacity: [1, 0.2, 1] } : { opacity: 0.5 }} transition={{ repeat: Infinity, duration: 1 }} />
          REC 0:{String(s % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="absolute flex flex-col items-end" style={{ right: "1.5em", top: "5.4em", gap: "0.18em" }}>
        {Array.from({ length: 7 }, (_, j) => (
          <motion.span key={j} className="rounded-full" style={{ width: "0.7em", height: "0.28em", background: j < 2 ? "#e8402c" : "#a6f04a" }}
            animate={on ? { opacity: [0.25, 1, 0.25] } : { opacity: 0.25 }} transition={{ repeat: Infinity, duration: 0.5 + j * 0.06, delay: (6 - j) * 0.05 }} />
        ))}
      </div>
      <div className="absolute inset-x-0 overflow-hidden" style={{ bottom: "1.6em", height: "5.6em", maskImage: "linear-gradient(180deg, transparent, #000 35%, #000 70%, transparent)" }}>
        <motion.div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "1.9em", gap: "0.3em" }} animate={{ y: `${-k * 1.9}em` }} transition={{ duration: 0.5, ease }}>
          {lines.map((l, j) => (
            <motion.span key={l} className="whitespace-nowrap font-semibold" style={{ fontSize: "1.2em", lineHeight: 1.3 }}
              animate={{ opacity: j === k ? 1 : 0.4, color: j === k ? "#a6f04a" : "#ffffff" }} transition={{ duration: 0.3 }}>{l}</motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function VoiceWave({ on }: { on: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center" style={{ gap: "1.2em" }}>
      <span className="relative grid place-items-center">
        {[0, 1].map((r) => (
          <motion.span key={r} className="absolute rounded-full border-2 border-[#a6f04a]" style={{ width: "3.6em", height: "3.6em" }}
            animate={on ? { scale: [1, 1.9], opacity: [0.6, 0] } : { opacity: 0 }} transition={{ repeat: Infinity, duration: 1.6, delay: r * 0.8, ease: "easeOut" }} />
        ))}
        <span className="relative grid place-items-center rounded-full bg-[#a6f04a]" style={{ width: "3.6em", height: "3.6em" }}>
          <Mic style={{ width: "1.7em", height: "1.7em", color: "#1f1c1b" }} strokeWidth={2.4} />
        </span>
      </span>
      <div className="flex items-center" style={{ gap: "0.22em", height: "2.6em" }}>
        {Array.from({ length: 18 }, (_, j) => (
          <motion.span key={j} className="rounded-full bg-[#a6f04a]" style={{ width: "0.3em", height: "2.6em" }}
            animate={on ? { scaleY: [0.15, 0.3 + ((j * 37) % 65) / 100, 0.15] } : { scaleY: 0.15 }} transition={{ repeat: Infinity, duration: 0.5 + (j % 5) * 0.1 }} />
        ))}
      </div>
    </div>
  );
}

function AvatarCard({ on }: { on: boolean }) {
  const line = "Script do, video main bana deta hoon.";
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    setN(0);
    const t = setInterval(() => setN((x) => Math.min(x + 1, line.length)), 45);
    return () => clearInterval(t);
  }, [on, line.length]);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "radial-gradient(90% 70% at 50% 30%, #f6ffe9, #c9f38f)" }}>
      <Clip name="avatar" poster="avatar-3d" pos="50% 22%">
        <motion.img src="/landing/avatar-3d.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 22%" }}
          animate={on ? { y: ["0em", "-0.5em", "0em"], scale: 1.06 } : { y: "0em", scale: 1.02 }} transition={{ y: { repeat: Infinity, duration: 2.6, ease: "easeInOut" }, scale: { duration: 0.8 } }} />
      </Clip>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(255 255 255/0.7) 0%, transparent 22%, transparent 62%, rgb(31 42 16/0.75) 100%)" }} />
      <div className="absolute flex items-center justify-between" style={{ left: "1.2em", right: "1.2em", top: "1.1em" }}>
        <span className="font-semibold text-[#1f2a10]" style={{ fontSize: "1.45em" }}>AI avatar</span>
        <span className="rounded-full bg-[#1f1c1b] font-semibold text-[#c4fb73]" style={{ fontSize: "0.7em", padding: "0.25em 0.7em" }}>Optional</span>
      </div>
      <motion.div className="absolute rounded-[1em] rounded-bl-[0.2em] bg-white font-semibold text-[#1f1c1b] shadow-[0_0.6em_1.4em_-0.6em_rgb(0_0_0/0.4)]"
        style={{ left: "1em", right: "1em", bottom: "1.1em", padding: "0.7em 0.9em", fontSize: "0.95em", lineHeight: 1.3 }}
        animate={{ opacity: on ? 1 : 0, y: on ? "0em" : "0.6em" }} transition={{ duration: 0.4 }}>
        {line.slice(0, n)}<span className="lp-cursor text-[#5b8f1f]">▍</span>
      </motion.div>
    </div>
  );
}

function RecordScene() {
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK((x) => (x + 1) % SHOW_UP.length), 2800); return () => clearInterval(t); }, []);
  const c = SHOW_UP[k];
  return (
    <div className="absolute inset-0">
      <motion.div className="absolute inset-x-0 text-center font-mono text-[#777]" style={{ top: "2em", fontSize: "1.15em", letterSpacing: "0.12em" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        HOW DO YOU WANT TO SHOW UP?
      </motion.div>
      {SHOW_UP.map((card, j) => {
        const on = j === k, f = FAN[j];
        return (
          <motion.div key={card.key} className="absolute flex flex-col overflow-hidden rounded-[1.6em]"
            style={{ left: `${f.x}em`, width: "17em", height: "24em", padding: "1.2em", fontSize: "1em", background: card.bg, color: card.ink, transformOrigin: "50% 100%",
              boxShadow: on ? "0 2em 3.4em -1.6em rgb(0 0 0 / 0.55)" : "0 1em 2em -1.2em rgb(0 0 0 / 0.4)", border: "none" }}
            initial={{ opacity: 0, top: "30em", rotate: 0 }}
            animate={{ opacity: 1, top: `${on ? f.top - 4 : f.top}em`, rotate: on ? 0 : f.r, scale: on ? 1.14 : 0.94, zIndex: on ? 10 : 3 - Math.abs(j - k), filter: on ? "saturate(1)" : "saturate(0.7)" }}
            transition={{ type: "spring", stiffness: 170, damping: 19, delay: 0 }}>
            {card.key === "record" ? <Recording on={on} /> : card.key === "avatar" ? <AvatarCard on={on} /> : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ fontSize: "1.45em" }}>{card.name}</span>
                  <span className="rounded-full font-semibold" style={{ background: card.chip, color: card.chipInk, fontSize: "0.7em", padding: "0.25em 0.7em" }}>{card.tag}</span>
                </div>
                <div className="mt-[0.9em] flex flex-1 flex-col" style={{ fontSize: "1.12em" }}>
                  <VoiceWave on={on} />
                </div>
              </>
            )}
          </motion.div>
        );
      })}
      <div className="absolute inset-x-0 flex justify-center" style={{ top: "41.5em" }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={c.key} className={`flex items-center rounded-full font-semibold text-[#1f1c1b] ${glass}`} style={{ padding: "0.6em 1.4em", gap: "0.6em", fontSize: "1.25em" }}
            initial={{ opacity: 0, y: "1em", filter: "blur(6px)" }} animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }} exit={{ opacity: 0, y: "-1em", filter: "blur(6px)" }} transition={{ duration: 0.4, ease }}>
            <span className="rounded-full bg-[#a6f04a]" style={{ width: "0.6em", height: "0.6em" }} />{c.name}: {c.note}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- 5. visuals & publish ---------- */
const FILM: ShotName[] = ["hook", "coin", "qr", "route", "hub", "paid", "speed", "pin", "recap"];
const FILM_CAPS = ["Ek chai ke ₹10.", "Aap pay karte ho,", "QR scan kiya,", "paisa aapke bank se nikla,", "NPCI ne raasta dikhaya,", "aur vendor ko mil gaya.", "Sab ek second mein.", "PIN? Sirf aapke phone mein.", "Yahi hai UPI."];
const SHORTS: ShotName[][] = [["hook", "coin", "speed"], ["route", "hub", "paid"], ["qr", "pin", "recap"]];

function PublishScene() {
  return (
    <div className="absolute inset-0">
      <motion.div className="absolute overflow-hidden rounded-[1.6em] shadow-[0_1.6em_3em_-1.4em_rgb(0_0_0/0.5)]" style={{ left: "0em", top: "6em", width: "36em", height: "20.25em" }}
        initial={{ opacity: 0, y: "2em", scale: 0.96 }} animate={{ opacity: 1, y: "0em", scale: 1 }} transition={{ duration: 0.8, ease }}>
        <Film shots={FILM} captions={FILM_CAPS} />
        <div className="absolute inset-x-0 bottom-0 bg-white/25" style={{ height: "0.3em" }}>
          <motion.div className="h-full bg-[#a6f04a]" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: filmSeconds(FILM), ease: "linear", repeat: Infinity }} />
        </div>
        <span className="absolute z-10 rounded-full bg-[#1f1c1b] font-semibold text-white" style={{ left: "1em", top: "1em", fontSize: "0.95em", padding: "0.3em 0.8em" }}>1080p · 16:9</span>
      </motion.div>
      {["short-1", "short-2", "short-3"].map((img, k) => (
        <motion.div key={img} className="absolute overflow-hidden rounded-[1.1em] shadow-[0_1.2em_2.4em_-1em_rgb(0_0_0/0.5)]" style={{ left: `${24 + k * 6.4}em`, top: "22em", width: "9.6em", height: "17em", border: "0.3em solid #fff" }}
          initial={{ opacity: 0, y: "4em", rotate: 0 }} animate={{ opacity: 1, y: "0em", rotate: (k - 1) * 7 }} transition={{ delay: 0.7 + k * 0.15, type: "spring", stiffness: 160, damping: 16 }}>
          <Film shots={SHORTS[k]} ms={2600 + k * 200} />
          <span className="absolute inset-x-0 bottom-0 z-10 bg-[#1f1c1b] text-center font-medium text-white" style={{ fontSize: "0.8em", padding: "0.3em" }}>Short {k + 1} · 9:16</span>
        </motion.div>
      ))}
      <motion.span className={`absolute flex items-center rounded-full font-semibold text-[#1f1c1b] ${glass}`} style={{ left: "0em", top: "31em", padding: "0.6em 1.3em", gap: "0.5em", fontSize: "1.25em" }}
        initial={{ opacity: 0, x: "-1em" }} animate={{ opacity: 1, x: "0em" }} transition={{ delay: 1.3, duration: 0.5 }}>
        <span className="grid place-items-center rounded-full bg-[#a6f04a]" style={{ width: "1.2em", height: "1.2em", fontSize: "0.9em" }}>✓</span>
        Published · video + 3 Shorts
      </motion.span>
    </div>
  );
}

/* ---------- research ---------- */
function ResearchScene() {
  const sources: [string, string, number, number, number][] = [["notes.pdf", "your notes · page 3", 1, 4, -3], ["npci.org.in", "how UPI settles", 17, 1, 2], ["rbi.org.in", "limits and safety", 31, 6, -2]];
  const facts = ["Launched in 2016", "Settles in under 1 s", "₹1 lakh per day", "PIN never leaves your phone"];
  const found = useTick(18, 2200, 300);
  return (
    <div className="absolute inset-0">
      {sources.map(([n, d, x, y, r], k) => (
        <motion.div key={n} className={`absolute overflow-hidden rounded-[1.2em] ${glass}`} style={{ left: `${x}em`, top: `${y}em`, width: "13.5em", height: "15em", padding: "1em 1.1em" }}
          initial={{ opacity: 0, y: "2em", rotate: 0 }} animate={{ opacity: 1, y: "0em", rotate: r }} transition={{ delay: k * 0.18, duration: 0.7, ease }}>
          <div className="font-semibold text-[#1f1c1b]" style={{ fontSize: "1.1em" }}>{n}</div>
          <div className="text-[#777]" style={{ fontSize: "0.8em" }}>{d}</div>
          <div className="flex flex-col" style={{ gap: "0.55em", marginTop: "1em" }}>
            {[90, 70, 84, 60, 78, 50].map((w, j) => <span key={j} className="rounded-full bg-[#1f1c1b]/15" style={{ height: "0.45em", width: `${w}%` }} />)}
          </div>
          <motion.div className="absolute inset-x-0 h-[2.2em]" style={{ background: "linear-gradient(180deg, transparent, rgba(166,240,74,0.55), transparent)" }}
            initial={{ top: "-2em" }} animate={{ top: "15em" }} transition={{ repeat: Infinity, duration: 1.6, delay: k * 0.3, ease: "easeInOut" }} />
        </motion.div>
      ))}
      <div className="absolute flex flex-wrap" style={{ left: "1em", right: "1em", top: "25em", gap: "0.7em" }}>
        {facts.map((f, k) => (
          <motion.span key={f} className="flex items-center rounded-full bg-[#1f1c1b] font-medium text-white" style={{ padding: "0.55em 1.1em", gap: "0.5em", fontSize: "1.15em" }}
            initial={{ opacity: 0, scale: 0.6, y: "1em" }} animate={{ opacity: 1, scale: 1, y: "0em" }} transition={{ delay: 0.9 + k * 0.3, type: "spring", stiffness: 260, damping: 16 }}>
            <span className="rounded-full bg-[#a6f04a]" style={{ width: "0.55em", height: "0.55em" }} />{f}
          </motion.span>
        ))}
      </div>
      <div className="absolute flex items-baseline text-[#1f1c1b]" style={{ left: "1em", top: "38em", gap: "0.5em" }}>
        <span className="font-bold tabular-nums" style={{ fontSize: "4.2em", lineHeight: 1 }}>{found}</span>
        <span className="text-[#555]" style={{ fontSize: "1.3em" }}>facts found, every one with its source</span>
      </div>
    </div>
  );
}

/* ---------- clean cut ---------- */
function CleanScene() {
  const N = 44, SIL: [number, number][] = [[7, 12], [20, 24], [31, 36]];
  const h = (i: number) => 22 + ((i * 47) % 75);
  const items: ReactNode[] = [];
  for (let i = 0; i < N; ) {
    const s = SIL.findIndex(([a, b]) => i >= a && i < b);
    if (s < 0) { items.push(<span key={i} className="shrink-0 rounded-full bg-[#1f1c1b]" style={{ width: "0.5em", marginRight: "0.35em", height: `${h(i)}%` }} />); i++; continue; }
    const [a, b] = SIL[s];
    items.push(
      <motion.div key={`s${s}`} className="flex h-full shrink-0 items-center overflow-hidden rounded-[0.5em]" style={{ background: "repeating-linear-gradient(135deg, rgba(232,64,44,0.16) 0 0.4em, rgba(232,64,44,0.05) 0.4em 0.8em)" }}
        initial={{ width: `${(b - a) * 0.85}em` }} animate={{ width: "0em" }} transition={{ delay: 0.6 + (2.4 * a) / N + 0.3, duration: 0.5, ease: "easeInOut" }}>
        {Array.from({ length: b - a }, (_, k) => <span key={k} className="shrink-0 rounded-full bg-[#1f1c1b]/25" style={{ width: "0.5em", marginRight: "0.35em", height: "10%" }} />)}
      </motion.div>,
    );
    i = b;
  }
  const saved = useTick(134, 2600, 600);
  return (
    <div className="absolute inset-0 flex flex-col justify-center" style={{ gap: "2.4em" }}>
      <div className={`relative rounded-[1.4em] ${glass}`} style={{ height: "13em", padding: "1.4em 1.2em" }}>
        <div className="flex h-full items-center">{items}</div>
        <motion.div className="absolute" style={{ top: "0.6em", bottom: "0.6em", width: "0.2em", background: "#5b8f1f", boxShadow: "0 0 0.8em #a6f04a" }}
          initial={{ left: "1.2em" }} animate={{ left: "calc(100% - 1.4em)" }} transition={{ delay: 0.6, duration: 2.4, ease: "linear" }} />
      </div>
      <div className="flex items-end justify-between">
        <div className="text-[#1f1c1b]">
          <div className="font-bold tabular-nums" style={{ fontSize: "4.2em", lineHeight: 1 }}>−{Math.floor(saved / 60)}:{String(saved % 60).padStart(2, "0")}</div>
          <div className="text-[#555]" style={{ fontSize: "1.3em" }}>of silence and ums, gone</div>
        </div>
        <div className="flex flex-col items-end" style={{ gap: "0.5em" }}>
          {["11 filler words", "3 retakes", "4 long pauses"].map((t, k) => (
            <motion.span key={t} className={`rounded-full font-medium text-[#1f1c1b] ${glass}`} style={{ padding: "0.4em 1em", fontSize: "1.05em" }}
              initial={{ opacity: 0, x: "1em" }} animate={{ opacity: 1, x: "0em" }} transition={{ delay: 1.2 + k * 0.25 }}>{t}</motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- review ---------- */
function ReviewScene() {
  const frames: ShotName[] = ["hook", "qr", "route", "hub", "pin", "paid"];
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK((x) => Math.min(x + 1, frames.length)), 380); return () => clearInterval(t); }, [frames.length]);
  return (
    <div className="absolute inset-0 flex flex-col justify-center" style={{ gap: "1.6em" }}>
      <div className="grid grid-cols-3" style={{ gap: "1em" }}>
        {frames.map((f, i) => (
          <motion.div key={f} className="relative overflow-hidden rounded-[1em] shadow-[0_0.8em_1.6em_-1em_rgb(0_0_0/0.5)]" style={{ height: "9em" }}
            initial={{ opacity: 0, y: "1.5em", scale: 0.92 }} animate={{ opacity: 1, y: "0em", scale: 1 }} transition={{ delay: i * 0.08, duration: 0.5, ease }}>
            <Film shots={[f]} ms={3000 + i * 200} />
            <span className="absolute z-10 font-mono font-semibold text-[#1f1c1b]/60" style={{ left: "0.6em", top: "0.5em", fontSize: "0.85em" }}>{String(i + 1).padStart(2, "0")}</span>
            <motion.span className="absolute grid place-items-center rounded-full bg-[#a6f04a]" style={{ right: "0.5em", bottom: "0.5em", width: "1.8em", height: "1.8em" }}
              animate={{ scale: i < k ? 1 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
              <span className="font-bold text-[#1f1c1b]" style={{ fontSize: "1em" }}>✓</span>
            </motion.span>
            {i === 4 && (
              <motion.span className="absolute z-10 rounded-[0.8em] rounded-br-none bg-[#1f1c1b] font-medium text-white shadow" style={{ right: "0.6em", top: "0.5em", fontSize: "0.8em", padding: "0.3em 0.7em" }}
                initial={{ opacity: 0, y: "0.5em" }} animate={{ opacity: k >= 5 ? 1 : 0, y: "0em" }} transition={{ duration: 0.3 }}>Slower, please</motion.span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[#1f1c1b]"><span className="font-bold tabular-nums" style={{ fontSize: "3.2em" }}>{k}</span><span className="text-[#555]" style={{ fontSize: "1.3em" }}> of 6 scenes approved</span></span>
        <motion.span className="rounded-full font-semibold" style={{ padding: "0.6em 1.4em", fontSize: "1.15em" }}
          animate={{ backgroundColor: k >= frames.length ? "#a6f04a" : "#1f1c1b", color: k >= frames.length ? "#1f1c1b" : "#ffffff" }}>
          {k >= frames.length ? "Approved ✓" : "Approve all"}
        </motion.span>
      </div>
    </div>
  );
}

/** counts 0 → to over ms after delay (restarts on mount) */
function useTick(to: number, ms: number, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => { const k = Math.min(1, Math.max(0, (t - t0) / ms)); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay]);
  return v;
}

const SCENES = [IdeaScene, PlanScene, ScriptScene, RecordScene, CleanScene, ReviewScene, PublishScene];

/** the stage: 46em x 56em, transparent; the scene for `active` blurs and fades in place */
export function FlowStage({ active }: { active: number }) {
  const Scene = SCENES[active];
  return (
    <div className="relative" style={{ width: "46em", height: "56em" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={active} className="absolute inset-0"
          initial={{ opacity: 0, y: "3em", scale: 0.98 }}
          animate={{ opacity: 1, y: "0em", scale: 1 }}
          exit={{ opacity: 0, y: "-3em", scale: 0.98 }}
          transition={{ duration: 0.7, ease }}>
          <Scene />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- a small scroll meter at the far right: a hairline that fills, with the percentage riding on it ---------- */

export function ScrollMeter({ progress }: { progress: MotionValue<number> }) {
  const clamp = (p: number) => Math.min(1, Math.max(0, p));
  const fill = useTransform(progress, (p) => clamp(p));
  const top = useTransform(progress, (p) => `${clamp(p) * 100}%`);
  const pct = useTransform(progress, (p) => `${Math.round(clamp(p) * 100)}%`);
  return (
    <div className="relative" style={{ top: "18%", height: "64%", width: "2.6rem" }}>
      <div className="absolute inset-y-0 right-0 w-px bg-[#1f1c1b]/15" />
      <motion.div className="absolute right-0 top-0 h-full w-px origin-top bg-[#5b8f1f]" style={{ scaleY: fill }} />
      <motion.div className="absolute right-0 flex items-center" style={{ top, y: "-50%", gap: "0.45rem" }}>
        <motion.span className="font-mono text-[11px] tabular-nums text-[#5b8f1f]">{pct}</motion.span>
        <span className="block rounded-full bg-[#a6f04a]" style={{ width: 7, height: 7, marginRight: -3, boxShadow: "0 0 0 3px rgba(166,240,74,0.25)" }} />
      </motion.div>
    </div>
  );
}
