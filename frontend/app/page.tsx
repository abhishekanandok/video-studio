"use client";

import "./landing.css";
import { Captions, CheckCircle2, Clapperboard, IndianRupee, Lightbulb, ListChecks, Mic, MousePointer2, PenLine, Smartphone, Timer, Upload, Video } from "lucide-react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AppIcon, FeatureDeck, FeedbackDeck } from "@/components/landing/decks";
import { AIMonitor } from "@/components/landing/monitor";
import { HeroDeck, IconTiles, Toggle, useDeckPhase } from "@/components/landing/hero-deck";
import { HeroScene } from "@/components/landing/scene";
import { Film, type ShotName } from "@/components/landing/explainer";
import { FlowStage, ScrollMeter, STEPS as FLOW } from "@/components/landing/platform";

/* Drishyya's landing page. Every section copies the reference layout measured in pixels: each section is a size
   container and sets font-size to 1cqw (1em = 1% of its width) on desktop, so positions written in em match the
   reference at any width. Phones get a stacked layout. Pictures and clips are real output of the Studio pipeline. */

const NAV = [["Features", "#features"], ["Platform", "#platform"], ["How it works", "#how"], ["Benefits", "#benefits"]];
/** the hero's lime text: the key word of every heading */
const LIME = { backgroundImage: "linear-gradient(90deg,#3f7d1e,#6fbf2a 55%,#a6f04a)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } as CSSProperties;
const rise = { initial: { y: 30, opacity: 0 }, whileInView: { y: 0, opacity: 1 }, viewport: { once: true, margin: "-60px" } };

function Logo({ className = "", style, ghost }: { className?: string; style?: CSSProperties; ghost?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path d="M1.5 12C4.6 6.2 8.2 4 12 4s7.4 2.2 10.5 8c-3.1 5.8-6.7 8-10.5 8S4.6 17.8 1.5 12Z" fill="currentColor" />
      {!ghost && <path d="M10 8.6 15.4 12 10 15.4Z" fill="#a6f04a" />}
    </svg>
  );
}

function Chip({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span className="inline-block whitespace-nowrap rounded-full bg-gradient-to-r from-[#a6f04a] to-[#eef99a] font-medium text-[#1f2a10]" style={{ fontSize: "1.25em", padding: "0.4em 1.1em", ...style }}>{children}</span>;
}

/* ---------------- nav + hero (reference: 909 px wide, hero 880 x 577) ---------------- */

/** which nav section the reader is in: the last one whose top has scrolled past 45% of the screen */
function useActiveSection() {
  const [active, setActive] = useState("");
  useEffect(() => {
    const on = () => {
      let cur = "", best = -Infinity;
      for (const [, h] of NAV) {
        const top = document.getElementById(h.slice(1))?.getBoundingClientRect().top;
        if (top !== undefined && top < window.innerHeight * 0.45 && top > best) { best = top; cur = h; }
      }
      setActive(cur);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return active;
}

function Nav() {
  const active = useActiveSection();
  return (
    <div className="@container sticky top-[0.6rem] z-50">
      <motion.nav initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 90, damping: 15 }}
        className="flex items-center justify-between rounded-full border border-white bg-gradient-to-b from-[#f4f4f4]/95 to-[#e3e3e3]/95 shadow-[0_0.4em_1.4em_-0.6em_rgb(0_0_0/0.3)] [font-size:2.6cqw] md:[font-size:min(1cqw,12px)]"
        style={{ height: "4.6em", padding: "0 0.5em" }}>
        <Link href="/" className="flex items-center rounded-full bg-white font-semibold text-[#1f1f1f] shadow-sm" style={{ height: "3.3em", padding: "0 1.2em", gap: "0.5em", fontSize: "1.2em" }}>
          <Logo style={{ width: "1.3em", height: "1.3em" }} /> Drishyya
        </Link>
        <div className="hidden items-center rounded-full bg-white shadow-sm md:flex" style={{ height: "3.3em", padding: "0 2.2em", gap: "2.6em" }}>
          {NAV.map(([l, h]) => (
            <a key={h} href={h} className={`relative font-medium transition-colors hover:text-[#5b8f1f] ${active === h ? "text-[#3f7d1e]" : "text-[#1f1f1f]"}`} style={{ fontSize: "1.3em" }}>
              {l}
              {active === h && <motion.span layoutId="nav-mark" className="absolute inset-x-0 rounded-full bg-gradient-to-r from-[#7fcf2c] to-[#a6f04a]" style={{ bottom: "-0.35em", height: "0.2em" }} transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            </a>
          ))}
        </div>
        <Link href="/app" className="flex items-center rounded-full bg-[#2b2725] font-medium text-white transition-transform hover:-translate-y-px" style={{ height: "3.3em", padding: "0 1.4em", fontSize: "1.2em" }}>Try for Free</Link>
      </motion.nav>
    </div>
  );
}

function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroSeen = useInView(heroRef, { margin: "100px" });
  const { phase, loop } = useDeckPhase(heroSeen);
  const lime = { backgroundImage: "linear-gradient(90deg,#3f7d1e,#6fbf2a 55%,#a6f04a)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } as CSSProperties;
  return (
    <div ref={heroRef} className="@container mt-[0.7rem]">
      <section className="lp-fit relative overflow-hidden text-[#1f1f1d] [font-size:2.3cqw] md:h-[65.6em]" style={{ borderRadius: "2.6em", ["--h" as string]: 65.6, ["--w" as string]: 0.8,
        background: "radial-gradient(60% 70% at 50% 45%, #fbfbf8 0%, #f1f1ed 70%, #e9e9e3 100%)" }}>
        {/* soft colour wash and a gentle shade, in the site's colours */}
        <div className="pointer-events-none absolute rounded-full" style={{ left: "-12em", top: "-14em", width: "50em", height: "50em", background: "radial-gradient(closest-side, rgba(166,240,74,0.32), transparent)" }} />
        <div className="pointer-events-none absolute rounded-full" style={{ right: "-14em", bottom: "-18em", width: "56em", height: "56em", background: "radial-gradient(closest-side, rgba(243,247,154,0.55), transparent)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 8em rgba(0,0,0,0.06)" }} />

        {/* desktop composition */}
        <div className="absolute left-0 top-0 hidden md:block"><HeroDeck phase={phase} loop={loop} showcase /></div>
        {/* the AI monitor, bottom right, centred in the space right of the stage */}
        <div className="absolute z-10 hidden md:block" style={{ right: "max(1em, calc(50% - 50em - 12.1em))", bottom: "1.2em" }}><div style={{ fontSize: "0.6em" }}><AIMonitor start={0} slim /></div></div>
        <h1 className="relative z-10 hidden font-extrabold leading-[0.95] tracking-[-0.045em] md:block" style={{ fontSize: "8.2em" }}>
          <span className="absolute whitespace-nowrap" style={{ left: "3.99em", top: "1.34em" }}>Your idea,</span>
          <span className="absolute whitespace-nowrap" style={{ left: "6.1em", top: "2.6em" }}>your voice,</span>
          <span className="absolute whitespace-nowrap" style={{ left: "3.99em", top: "3.87em", ...lime }}>our visuals</span>
        </h1>
        <div className="absolute z-10 hidden md:block" style={{ left: "79.5em", top: "13em" }}><Toggle on={phase !== "type" && phase !== "send" && phase !== "fall"} /></div>
        <div className="absolute z-10 hidden md:block" style={{ left: "75.5em", top: "31em" }}><div style={{ fontSize: "0.8em" }}><IconTiles phase={phase} /></div></div>
        <p className="absolute z-10 hidden text-center text-[#555] md:block" style={{ left: "27em", width: "46em", top: "44.4em", fontSize: "1em" }}>
          <span style={{ fontSize: "1.6em", lineHeight: 1.45 }}>No recording needed. Bring a topic and your notes: we plan and script it, prompt you while you record, then add every visual.</span>
        </p>
        <div className="absolute z-10 hidden md:block" style={{ left: "50%", top: "53em", transform: "translateX(-50%)" }}><GetStarted /></div>

        {/* phones: the words and Get started first, then the moving pipeline under them */}
        <div className="relative px-[3.5em] pb-[9em] pt-[5em] md:hidden">
          <h1 className="text-center text-[5.4em] font-extrabold leading-[1] tracking-[-0.04em]">Your idea, your voice, <span style={lime}>our visuals</span></h1>
          <p className="mx-auto mt-[1.2em] max-w-[34em] text-center text-[1.75em] leading-[1.45] text-[#555]">No recording needed. Bring a topic and your notes: we plan and script it, prompt you while you record, then add every visual.</p>
          <div className="mt-[2.4em] flex justify-center" style={{ fontSize: "1.05em" }}><GetStarted /></div>
          <div className="relative mx-auto mt-[3em] overflow-visible" style={{ fontSize: "1.1em", width: "29em", height: "33.5em" }}><HeroDeck phase={phase} loop={loop} style={{ position: "absolute", left: "-1.8em", top: "-3.5em" }} /></div>
        </div>
      </section>
    </div>
  );
}

/** Get started, in the site's theme: a dark pill with the lime corner of the Drishyya mark */
function GetStarted() {
  return (
    <Link href="/app" className="group relative flex items-center justify-center overflow-hidden font-semibold text-white transition-transform hover:-translate-y-0.5"
      style={{ width: "30em", height: "5.8em", borderRadius: "1.6em", background: "linear-gradient(180deg,#34302e,#1f1c1b)", fontSize: "1em",
        boxShadow: "0 0 0 0.45em rgba(255,255,255,0.85), 0 0 0 0.55em rgba(0,0,0,0.08), 0 1.6em 2.6em -1.2em rgba(0,0,0,0.5), inset 0 0.12em 0.2em rgba(255,255,255,0.18)" }}>
      <span style={{ fontSize: "1.9em" }}>Get started</span>
      <span className="absolute transition-transform group-hover:scale-110" style={{ right: "0.9em", top: "0.7em", width: "4.2em", height: "4.4em", background: "linear-gradient(135deg,#d6ff8f,#7fcf2c)",
        clipPath: "polygon(0 0, 100% 0, 100% 100%)", borderRadius: "0.5em", filter: "drop-shadow(0 0.2em 0.3em rgba(0,0,0,0.3))" }} />
    </Link>
  );
}

/* ---------------- the problem (reference: 920 x 585) ---------------- */

function Blob() {
  return (
    <motion.div className="absolute z-10" style={{ left: "35em", top: "16em", width: "7.2em", height: "7em" }} animate={{ rotate: [-6, 6, -3, -6], x: ["0em", "2.2em", "0.6em", "0em"], y: ["0em", "-1.6em", "1.8em", "0em"] }} transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#4a68ff] to-[#1f39c9] shadow-[inset_-0.4em_-0.5em_0.8em_rgb(0_0_60/0.45),inset_0.3em_0.3em_0.5em_rgb(255_255_255/0.35)]" style={{ borderRadius: "38% 46% 30% 44%" }} />
      <div className="absolute bg-white" style={{ left: "2.6em", top: "2.4em", width: "3.6em", height: "2.6em", borderRadius: "0.6em 0.6em 0.6em 0.1em" }} />
    </motion.div>
  );
}

function HelpButton() {
  return (
    <motion.div className="grid place-items-center rounded-full font-bold text-white" animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
      style={{ width: "7.6em", height: "7.6em", background: "radial-gradient(circle at 50% 35%, #ff6a5c, #c4140f 60%, #8a0a06)", border: "0.55em solid #b9b9b9", boxShadow: "inset 0 0.5em 0.8em rgb(255 255 255 / 0.4), 0 0.6em 1.2em rgb(0 0 0 / 0.35), 0 0 0 0.15em #8d8d8d" }}>
      <span style={{ fontSize: "1.65em", textShadow: "0 0.08em 0.1em rgb(0 0 0 / 0.4)" }}>HELP</span>
    </motion.div>
  );
}

/** A glossy squircle full of tangled timeline tracks: the "complex editing" icon. */
function ComplexIcon() {
  const tracks = [["#ff5d73", 8, 62], ["#ffb347", 30, 55], ["#ffe14d", 5, 45], ["#7be05a", 40, 52], ["#4ec3ff", 15, 60], ["#8b6cff", 35, 50]] as const;
  return (
    <div className="relative overflow-hidden" style={{ width: "19em", height: "19em", borderRadius: "4.6em", background: "linear-gradient(160deg, #fdfdfd, #d9d9d9)", boxShadow: "0 1.2em 2em -0.6em rgb(0 0 0 / 0.35), inset 0 -0.4em 0.8em rgb(0 0 0 / 0.12)" }}>
      <div className="absolute inset-[2.2em] flex flex-col justify-center" style={{ gap: "0.75em" }}>
        {tracks.map(([c, x, w], i) => (
          <motion.span key={i} className="relative block rounded-full" style={{ height: "1.5em", background: c, opacity: 0.88, boxShadow: "inset 0 0.25em 0.3em rgb(255 255 255 / 0.55)" }}
            animate={{ marginLeft: [`${x}%`, `${x + 12}%`, `${x}%`], width: [`${w}%`, `${w - 14}%`, `${w}%`] }} transition={{ repeat: Infinity, duration: 4 + i * 0.5, ease: "easeInOut" }} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ borderRadius: "inherit", background: "radial-gradient(110% 70% at 25% 5%, rgb(255 255 255 / 0.75), transparent 45%)" }} />
    </div>
  );
}

function Problem() {
  const lines = ["You have the", "idea.", "Showing it is", "the hard part"];
  return (
    <section className="@container mt-[1.2rem] bg-[#f2f2f2]/85">
      <div className="lp-fit lp-stage relative pb-[6em] [font-size:2.2cqw] md:pb-0" style={{ ["--h" as string]: 63.6 } as CSSProperties}>
        <div className="relative px-[4.6em] pt-[8em] md:absolute md:left-[4.6em] md:top-[11.4em] md:p-0">
          <Chip>The Problem</Chip>
          <h2 className="relative font-medium tracking-[-0.03em] text-[#262322]" style={{ fontSize: "5em", marginTop: "0.42em" }}>
            {lines.map((l, i) => (
              <motion.span key={l} className="relative block w-fit" style={{ lineHeight: 1.06, marginBottom: "0.14em" }} {...rise} transition={{ delay: i * 0.12 }}>
                {l === "the hard part" ? <>the <span style={LIME}>hard part</span></> : l}
                <motion.span className="absolute inset-x-0 bottom-[-0.06em] h-px origin-left bg-[#c9c9c9]" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12, duration: 0.6 }} />
              </motion.span>
            ))}
          </h2>
          <div className="hidden md:block"><Blob /></div>
          <p className="mt-[3em] text-[#555] md:absolute md:left-0 md:top-[27.3em] md:mt-0" style={{ fontSize: "1.4em", width: "11em" }}>Knowing your topic is easy. Planning it, scripting it and showing it on screen isn&apos;t.</p>
        </div>
        <div className="absolute inset-y-0 left-[50em] hidden w-px bg-[#d2d2d2] md:block" />
        <motion.div {...rise} transition={{ duration: 0.7 }} className="relative mx-auto mt-[5em] flex flex-col bg-[#2b2b2b] shadow-[0_2em_3em_-1.5em_rgb(0_0_0/0.35)] md:absolute md:left-[56.2em] md:top-[8.7em] md:mt-0"
          style={{ width: "38.7em", height: "47.3em", borderRadius: "1.8em", padding: "0.3em", gap: "0.3em" }}>
          <div className="flex" style={{ height: "11.1em", gap: "0.3em" }}>
            <div className="relative flex-1 bg-white" style={{ borderRadius: "1.5em 0.6em 0.6em 0.6em", padding: "3em 3.4em" }}>
              <div className="font-semibold text-[#222]" style={{ fontSize: "1.85em" }}>Expensive Editors</div>
              <p className="text-[#777]" style={{ fontSize: "0.95em", marginTop: "1em", maxWidth: "21em" }}>A local editor costs ₹500–2,000 for every video and slows down each upload.</p>
            </div>
            <div className="grid place-items-center bg-white" style={{ width: "9.1em", borderRadius: "0.6em 1.5em 0.6em 0.6em" }}><div style={{ fontSize: "0.95em" }}><HelpButton /></div></div>
          </div>
          <div className="flex flex-1" style={{ gap: "0.3em" }}>
            <div className="relative overflow-hidden bg-white" style={{ width: "12.2em", borderRadius: "0.6em 0.6em 0.6em 1.5em" }}>
              <div className="bg-[#efedea]" style={{ height: "10.1em" }} />
              <div className="absolute" style={{ left: "1.8em", top: "17.5em" }}><AppIcon icon={Captions} from="#d8d8d8" to="#9a9a9a" size={2.4} /></div>
              <div className="absolute font-semibold text-[#222]" style={{ left: "1.25em", top: "15.6em", fontSize: "1.4em", lineHeight: 1.15, width: "7.5em" }}>Generic AI edits</div>
              <p className="absolute text-[#777]" style={{ left: "1.8em", top: "29.3em", fontSize: "0.92em", width: "9.4em" }}>AI faces and stock B-roll feel fake. Your audience came to hear you.</p>
            </div>
            <div className="relative flex-1 bg-white" style={{ borderRadius: "0.6em 0.6em 1.5em 0.6em" }}>
              <motion.div className="absolute left-1/2 -translate-x-1/2" style={{ top: "2.6em" }} animate={{ y: ["0em", "-0.7em", "0em"] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
                <ComplexIcon />
              </motion.div>
              <div className="absolute font-semibold text-[#222]" style={{ left: "1.05em", top: "12.9em", fontSize: "2em" }}>Complex Editing</div>
              <p className="absolute text-[#777]" style={{ left: "2.1em", top: "31.6em", fontSize: "0.95em", width: "21em" }}>Diagrams, charts and motion graphics take hours, so most videos stay a talking head.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- one platform (reference: 788 px wide) ---------------- */

/** The One studio section: an Apple-style sticky scroll reveal. On desktop it pins while you scroll; the screen holds
 *  still and the content changes in place, one step per scroll stretch. On phones it doesn't pin; steps change on a timer. */
function Platform() {
  const ref = useRef<HTMLElement>(null);
  const n = FLOW.length;
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setPinned(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const rawProgress = useMotionValue(0);
  const progress = useSpring(rawProgress, { stiffness: 140, damping: 26 });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!pinned) return;
    rawProgress.set(p);
    const k = Math.min(n - 1, Math.max(0, Math.floor(p * n)));
    if (k !== active) setActive(k);
  });
  const seen = useInView(ref, { amount: 0.2 });
  useEffect(() => {
    if (pinned || !seen) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), 4800);
    return () => clearInterval(t);
  }, [pinned, seen, n]);
  useEffect(() => { if (!pinned) rawProgress.set((active + 1) / n); }, [pinned, active, n, rawProgress]);
  return (
    <section ref={ref} id="platform" className="@container relative text-[#262322] md:h-[calc(var(--steps)*55svh+100svh)]" style={{ background: "radial-gradient(70% 90% at 90% 10%, rgba(166,240,74,0.22), transparent 60%), radial-gradient(60% 80% at 5% 90%, rgba(243,247,154,0.45), transparent 60%), #f3f3f0", ["--steps" as string]: FLOW.length } as CSSProperties}>
      <div className="relative overflow-hidden md:sticky md:top-[80px] md:h-[calc(100svh-80px)]">
      <div className="absolute inset-y-0 right-[1.1vw] z-10 hidden md:block"><ScrollMeter progress={progress} /></div>
      <div className="lp-fit lp-stage relative pb-[8em] [font-size:2.4cqw] md:pb-0" style={{ ["--h" as string]: 70 } as CSSProperties}>
        <div className="px-[4.8em] pt-[6em] md:absolute md:left-[calc(58em-(100cqw-100em)*0.1)] md:top-[5.5em] md:p-0">
          <div className="md:w-[40em] md:[font-size:calc(1em+(100cqw-100em)*0.009)]">
          <Chip>All-in-one AI studio</Chip>
          <motion.h2 {...rise} className="font-medium tracking-[-0.03em] md:!text-[4.8em]" style={{ fontSize: "5.3em", lineHeight: 1.06, marginTop: "0.3em", fontWeight: 600 }}>One studio, from plan to <span style={LIME}>publish</span></motion.h2>
          {/* the steps, Apple-style: the one on screen is dark, the others fall back */}
          <ol className="flex flex-col" style={{ marginTop: "2em", gap: "0.75em" }}>
            {FLOW.map((st, i) => {
              const on = i === active;
              return (
                <motion.li key={st.title} animate={{ opacity: on ? 1 : 0.28, x: on ? "0.6em" : "0em" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="flex items-baseline" style={{ gap: "0.7em" }}>
                    <span className="font-mono" style={{ fontSize: "1em", color: on ? "#5b8f1f" : "#777" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontSize: "1.85em", lineHeight: 1.1, fontWeight: on ? 600 : 500 }}>{st.title}</span>
                  </div>
                  <motion.p className="overflow-hidden text-[#555]" style={{ fontSize: "1.25em", marginLeft: "2.2em" }}
                    animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0, marginTop: on ? "0.3em" : "0em" }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>{st.sub}</motion.p>
                </motion.li>
              );
            })}
          </ol>
          </div>
        </div>
        <div className="mx-auto mt-[4em] w-fit [font-size:0.78em] md:absolute md:left-[calc(1.5em-(100cqw-100em)*0.35)] md:top-[5em] md:mt-0 md:[font-size:1.1em]">
          <FlowStage active={active} />
        </div>
      </div>
      </div>
    </section>
  );
}

/* ---------------- supercharge (reference: 920 x 670) ---------------- */

function Features() {
  return (
    <section id="features" className="@container">
      <div className="lp-fit lp-stage relative h-[72.8em] overflow-hidden [font-size:1.05cqw]" style={{ ["--h" as string]: 72.8 } as CSSProperties}>
        <div className="absolute" style={{ left: "4.6em", top: "6.5em" }}><Chip>Powerful Features</Chip></div>
        <motion.h2 {...rise} className="absolute text-right text-[7em] font-medium tracking-[-0.03em] text-[#262322] md:whitespace-nowrap md:text-[5.6em]" style={{ right: "0.87em", left: "2.2em", top: "0.65em" }}>Everything After the <span style={LIME}>Idea</span></motion.h2>
        <div className="absolute" style={{ top: "16.4em", width: "100em", left: "calc(50% - 50em)" }}><FeatureDeck /></div>
      </div>
    </section>
  );
}

/* ---------------- how it works (reference: 924 x 858) ---------------- */

function RetroComputer() {
  return (
    <motion.div className="relative" style={{ width: "17.5em", height: "18.6em" }} animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}>
      <div className="absolute inset-x-0 top-0 bg-gradient-to-br from-[#e3a6f0] via-[#b678d8] to-[#7b4cb6] shadow-[inset_-0.5em_-0.6em_1em_rgb(60_20_90/0.4),inset_0.4em_0.4em_0.6em_rgb(255_255_255/0.45),0_1em_1.6em_-0.6em_rgb(0_0_0/0.35)]" style={{ height: "13.8em", borderRadius: "1.6em", padding: "1.3em 1.4em 1.8em" }}>
        <div className="relative h-full overflow-hidden bg-gradient-to-br from-[#5b8bff] to-[#2443c4] font-mono font-bold text-[#d6e4ff]" style={{ borderRadius: "0.9em", padding: "0.8em", boxShadow: "inset 0 0 1em rgb(0 0 40 / 0.6)" }}>
          <div className="lp-scan absolute inset-x-0 top-0" />
          <div style={{ fontSize: "1.25em", lineHeight: 1.15, letterSpacing: "0.04em" }}>PLAN<br />→ RECORD<br />→ VIDEO<span className="lp-cursor">_</span></div>
          <MousePointer2 className="absolute fill-white text-black" style={{ right: "0.8em", bottom: "0.6em", width: "1.8em", height: "1.8em" }} />
        </div>
      </div>
      <div className="absolute bg-gradient-to-b from-[#e7b9f2] to-[#a874cf] shadow-[0_0.6em_1em_-0.4em_rgb(0_0_0/0.35)]" style={{ left: "0.6em", right: "0.6em", bottom: 0, height: "4.4em", borderRadius: "0.9em", padding: "0.7em 0.9em" }}>
        <div className="grid h-full grid-cols-12" style={{ gap: "0.22em" }}>{Array.from({ length: 36 }, (_, i) => <span key={i} className="rounded-[0.15em] bg-[#f6e3fb] shadow-[0_0.1em_0_#9a62c4]" />)}</div>
      </div>
    </motion.div>
  );
}

const Box = ({ children, dark, style }: { children: ReactNode; dark?: boolean; style?: CSSProperties }) => (
  <span className={`absolute grid place-items-center text-white ${dark ? "bg-[#2b2725]" : "bg-gradient-to-b from-[#a2a2a0] to-[#828280]"} shadow-[inset_0_0.15em_0.2em_rgb(255_255_255/0.35),0_0.4em_0.8em_-0.3em_rgb(0_0_0/0.35)]`}
    style={{ width: "5.2em", height: "5.2em", borderRadius: "1.4em", ...style }}>{children}</span>
);
const Pill = ({ children, style, on, icon: I }: { children: ReactNode; style?: CSSProperties; on?: boolean; icon: typeof Upload }) => (
  <span className={`absolute flex items-center justify-center font-medium text-white shadow-[inset_0_0.15em_0.2em_rgb(255_255_255/0.35),0_0.4em_0.8em_-0.3em_rgb(0_0_0/0.35)] transition-all duration-500 ${on ? "scale-[1.04] bg-gradient-to-b from-[#7fb646] to-[#5b8f1f]" : "bg-gradient-to-b from-[#a2a2a0] to-[#828280]"}`}
    style={{ width: "23em", height: "5.2em", borderRadius: "1.6em", gap: "0.8em", ...style }}>
    <span className="grid place-items-center rounded-[0.7em] bg-white/20" style={{ width: "2.6em", height: "2.6em" }}><I style={{ width: "1.4em", height: "1.4em" }} strokeWidth={2} /></span>
    <span style={{ fontSize: "1.4em" }}>{children}</span></span>
);

// the black pointer's route: from under the heading to step 1, then 2, then 3, then down to the strip of frames
const PATHS = [
  "M27 26.5 C22.5 28 17.5 31.5 21.3 36.3",
  "M21.3 36.3 C14.8 40 14.8 46 21.3 49.3",
  "M21.3 49.3 C14.8 53 14.8 59 21.3 62.3",
  "M21.3 62.3 C15.5 68 19 78 31.5 83",
];
const ROW_Y = [34, 47, 60]; // top of each step row (stage em)

/* each step: its pill, and the card that pops up to the right of it when the pointer arrives */
const STEPS = [
  { n: "01_", label: "Bring your plan", icon: Lightbulb, title: "Your plan", sub: "Topic, notes and tone, read", extra: "chips" as const },
  { n: "02_", label: "Record with the script", icon: Mic, title: "Take 1 · 11:48", sub: "Recorded with the script on screen", extra: "wave" as const },
  { n: "03_", label: "Get the finished video", icon: Clapperboard, title: "Final video", sub: "1080p + 3 Shorts · ready", extra: "thumbs" as const },
];
const SCREEN = { x: 9.4, y: 13.6 }; // the retro computer's screen, where every card flies into

function StepCard({ i }: { i: number }) {
  const S = STEPS[i], I = S.icon;
  return (
    <div className="bg-gradient-to-br from-[#a6f04a] to-[#eef99a] text-[#1f2a10] shadow-[0_1.4em_2.4em_-0.8em_rgb(40_70_20/0.5)]" style={{ width: "27em", borderRadius: "1.5em", padding: "1.4em 1.6em", border: "0.14em solid #84b84a" }}>
      <div className="flex items-center" style={{ gap: "1em" }}>
        <span className="grid shrink-0 place-items-center rounded-[0.8em] bg-[#2b2725] text-[#a6f04a]" style={{ width: "3.4em", height: "3.4em" }}><I style={{ width: "1.7em", height: "1.7em" }} /></span>
        <span className="min-w-0">
          <span className="block font-semibold" style={{ fontSize: "1.55em" }}>{S.title}</span>
          <span className="flex items-center text-[#3a4a20]" style={{ fontSize: "1.05em", gap: "0.35em", marginTop: "0.15em" }}><CheckCircle2 style={{ width: "1em", height: "1em" }} />{S.sub}</span>
        </span>
      </div>
      <div style={{ marginTop: "1.1em" }}>
        {S.extra === "chips" && (
          <div className="flex flex-wrap" style={{ gap: "0.5em" }}>
            {["UPI · 10 min", "notes.pdf", "Friendly tone", "3 sources"].map((c, k) => (
              <motion.span key={c} className="rounded-full bg-white/80 font-medium" style={{ fontSize: "1em", padding: "0.35em 0.9em" }} initial={{ opacity: 0, y: "0.6em" }} animate={{ opacity: 1, y: "0em" }} transition={{ delay: 0.3 + k * 0.12 }}>{c}</motion.span>
            ))}
          </div>
        )}
        {S.extra === "wave" && (
          <div className="flex items-center rounded-[0.8em] bg-white/70" style={{ height: "3em", padding: "0 0.9em", gap: "0.25em" }}>
            <span className="shrink-0 rounded-full bg-[#e8402c]" style={{ width: "0.8em", height: "0.8em", marginRight: "0.5em" }} />
            {Array.from({ length: 30 }, (_, k) => (
              <motion.span key={k} className="flex-1 rounded-full" style={{ height: "1.8em", background: k < 20 ? "#2b2725" : "#9bbf6a" }} animate={{ scaleY: [0.3, 0.4 + ((k * 37) % 60) / 100, 0.3] }} transition={{ repeat: Infinity, duration: 0.7 + (k % 4) * 0.12 }} />
            ))}
          </div>
        )}
        {S.extra === "thumbs" && (
          <div className="flex" style={{ gap: "0.5em" }}>
            {(["hook", "qr", "paid"] as ShotName[]).map((n, k) => (
              <motion.div key={n} className="relative flex-1 overflow-hidden" style={{ height: "4em", minWidth: 0, borderRadius: "0.6em" }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + k * 0.12 }} ><Film shots={[n]} ms={2600 + k * 300} /></motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HowDesktop() {
  // step s: the pointer runs PATHS[s] to step s, its card pops up beside it, then flies into the computer; s = 3 lands on the strip
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { amount: 0.4 });
  const [s, setS] = useState(0);
  const [pop, setPop] = useState<"none" | "up" | "away">("none");
  const anims = useRef<(SVGAnimateMotionElement | null)[]>([]);
  useEffect(() => {
    if (!seen) return;
    anims.current[s]?.beginElement();
    setPop("none");
    const t: ReturnType<typeof setTimeout>[] = [];
    if (s < 3) {
      t.push(setTimeout(() => setPop("up"), 1500));
      t.push(setTimeout(() => setPop("away"), 4600));
      t.push(setTimeout(() => setS(s + 1), 5400));
    } else t.push(setTimeout(() => setS(0), 3000));
    return () => t.forEach(clearTimeout);
  }, [s, seen]);
  const frames: ShotName[] = ["hook", "coin", "qr", "route", "hub", "paid", "speed", "pin", "recap"];
  const cardX = 53;
  return (
    <div ref={ref} className="lp-stage relative hidden overflow-hidden md:block">
      <svg className="absolute left-0 top-0 z-30 overflow-visible" width="100em" height="92.9em" viewBox="0 0 100 92.9" fill="none">
        {PATHS.map((d, i) => <path key={d} className="lp-path-em" d={d} stroke={i === s ? "#7cc23a" : "#b9d69b"} strokeWidth={i === s ? 0.32 : 0.22} strokeLinecap="round" />)}
        {/* the black pointer travels the active path; its tip is on the path */}
        {PATHS.map((d, i) => (
          <g key={d} style={{ opacity: i === s ? 1 : 0 }}>
            <animateMotion ref={(el) => { anims.current[i] = el as SVGAnimateMotionElement | null; }} dur="1.5s" begin="indefinite" fill="freeze" path={d} />
            <g transform="translate(-3.4 -3.4) scale(0.36)"><path d="M9.4 9.4 1 6.2 4.4 5 5.6 1Z" fill="#1d1d1d" stroke="#fff" strokeWidth="0.5" strokeLinejoin="round" /><path d="M9.4 9.4 4.4 5 5.6 1Z" fill="#3a3a3a" /></g>
          </g>
        ))}
      </svg>
      <div className="absolute" style={{ left: "5.4em", top: "9.2em" }}><RetroComputer /></div>
      <div className="absolute" style={{ left: "25.1em", top: "12.4em" }}><Chip>Process</Chip></div>
      <motion.h2 {...rise} className="absolute font-medium tracking-[-0.03em] text-[#262322]" style={{ left: "4.65em", top: "3.05em", fontSize: "5.4em" }}>How it <span style={LIME}>works</span></motion.h2>
      <p className="absolute font-semibold text-[#2b2725]" style={{ left: "17.9em", top: "17.3em", fontSize: "1.4em" }}>From a plan to a finished video in three simple steps</p>

      {STEPS.map((st, i) => (
        <div key={st.n}>
          <Box dark={i === 2} style={{ left: "22em", top: `${ROW_Y[i]}em` }}><span style={{ fontSize: "1.4em" }}>{st.n}</span></Box>
          <Pill on={s === i} icon={st.icon} style={{ left: "27.6em", top: `${ROW_Y[i]}em` }}>{st.label}</Pill>
        </div>
      ))}

      {/* the card for this step: springs up beside it, then flies into the computer's screen */}
      <AnimatePresence>
        {s < 3 && pop !== "none" && (
          <motion.div key={s} className="absolute z-20" style={{ left: `${cardX}em`, top: `${ROW_Y[s] - 2.6}em`, transformOrigin: "left top" }}
            initial={{ opacity: 0, scale: 0.5, x: "-3em" }}
            animate={pop === "up" ? { opacity: 1, scale: 1, x: "0em", y: "0em" } : { opacity: 0, scale: 0.12, x: `${SCREEN.x - cardX}em`, y: `${SCREEN.y - ROW_Y[s] + 2.6}em` }}
            transition={pop === "up" ? { type: "spring", stiffness: 200, damping: 16 } : { duration: 0.75, ease: [0.6, 0, 0.8, 0.6] }}>
            <StepCard i={s} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* where the path lands: real Drishyya frames */}
      <div className="absolute inset-x-0 overflow-hidden" style={{ top: "80em", height: "12.9em" }}>
        <div className="lp-strip flex w-max" style={{ gap: "1em", paddingTop: "1.4em" }}>
          {[...frames, ...frames].map((n, i) => <div key={i} className="relative shrink-0 overflow-hidden shadow-md" style={{ width: "18em", height: "10.1em", borderRadius: "1em" }}><Film shots={[n]} ms={2800 + (i % 9) * 150} /></div>)}
        </div>
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(248 249 245) 0%, rgb(248 249 245 / 0) 45%)" }} />
      </div>
    </div>
  );
}

function How() {
  return (
    <section id="how" className="@container bg-gradient-to-b from-[#efefef]/80 to-[#fbfbfb]/40">
      <div className="lp-fit [font-size:2.4cqw]" style={{ ["--h" as string]: 92.9 } as CSSProperties}>
        <HowDesktop />
        <div className="px-[5em] py-[8em] md:hidden">
          <div className="flex items-start" style={{ gap: "3em" }}>
            <div style={{ fontSize: "0.8em" }}><RetroComputer /></div>
            <div><Chip>Process</Chip><h2 className="font-medium text-[#262322]" style={{ fontSize: "4.4em", marginTop: "0.2em" }}>How it <span style={LIME}>works</span></h2></div>
          </div>
          <div className="mt-[4em] space-y-[2em]">
            {[["01_", "Bring your plan"], ["02_", "Record with the script"], ["03_", "Get the finished video"]].map(([n, t], i) => (
              <motion.div key={n} {...rise} transition={{ delay: i * 0.12 }} className="flex items-center" style={{ gap: "1em" }}>
                <span className={`grid shrink-0 place-items-center rounded-[1.3em] text-white ${i === 2 ? "bg-[#2b2725]" : "bg-[#8f8f8d]"}`} style={{ width: "5em", height: "5em" }}>{n}</span>
                <span className={`flex-1 rounded-[1.6em] font-medium ${i === 2 ? "bg-gradient-to-r from-[#9be83f] to-[#f1f99f] text-[#1f2a10]" : "bg-[#8f8f8d] text-white"}`} style={{ padding: "1.4em 2em", fontSize: "1.5em" }}>{t}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- benefits (reference: 918 x 575) ---------------- */

const PILLS: { t: string; icon: typeof Timer; c: string; l: number; top: number; w: number }[] = [
  { t: "Ready in under 2 hours", icon: Timer, c: "#f3f79a", l: 10.9, top: 37.8, w: 22.1 },
  { t: "₹199 per video, pay by UPI", icon: IndianRupee, c: "#f7f7f5", l: 36.9, top: 37.8, w: 22.5 },
  { t: "Your face, your voice", icon: Mic, c: "#a6f04a", l: 63.4, top: 37.8, w: 22.7 },
  { t: "Hinglish and Devanagari captions", icon: Captions, c: "#a6f04a", l: 23.5, top: 42.9, w: 22.8 },
  { t: "Three Shorts with every video", icon: Smartphone, c: "#f7f7f5", l: 50.1, top: 42.9, w: 22.5 },
];

function BenefitPill({ p, wrap }: { p: (typeof PILLS)[number]; wrap?: boolean }) {
  const I = p.icon;
  return (
    <div className={`flex items-center justify-center border border-black/15 text-[#1f1f1f] ${wrap ? "h-full rounded-[1.4em] text-center" : "whitespace-nowrap rounded-full"}`} style={{ background: p.c, minHeight: "3.7em", padding: wrap ? "0.7em 1em" : "0 1.4em", gap: "0.6em" }}>
      <I style={{ width: "1.35em", height: "1.35em" }} strokeWidth={1.8} /><span style={{ fontSize: "1.2em" }}>{p.t}</span>
    </div>
  );
}

function Benefits() {
  return (
    <section id="benefits" className="@container">
      <div className="lp-fit lp-stage relative pb-[6em] [font-size:2.2cqw] md:pb-0" style={{ ["--h" as string]: 62.6 } as CSSProperties}>
        <div className="px-[1.1em] pt-[1.2em] text-right font-medium text-[#262322] md:absolute md:right-[1.12em] md:top-[1.05em] md:p-0" style={{ fontSize: "4.1em" }}>2026</div>
        <motion.div {...rise} transition={{ duration: 0.8 }} className="relative mx-[3em] mt-[2em] overflow-hidden pb-[2.4em] md:absolute md:left-[4.6em] md:top-[11.1em] md:m-0 md:h-[39.8em] md:w-[90.8em] md:p-0"
          style={{ borderRadius: "2.4em", background: "radial-gradient(120% 120% at 20% 15%, #44543a 0%, #33402c 50%, #2b3625 100%)" }}>
          <h2 className="whitespace-nowrap pt-[0.5em] text-center text-[6em] font-bold leading-none text-white md:pt-0 md:text-[19.5em]" style={{ letterSpacing: "-0.02em", marginTop: "0.17em" }}>
            {"Benefits".split("").map((ch, i) => (
              <motion.span key={i} className="inline-block" initial={{ y: "0.3em", opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 120, damping: 14 }}>{ch}</motion.span>
            ))}
          </h2>
          <div className="mt-[2.4em] grid grid-cols-2 px-[1.6em] md:hidden" style={{ gap: "0.8em", fontSize: "0.82em" }}>
            {PILLS.map((p, i) => <div key={p.t} className={i === PILLS.length - 1 ? "col-span-2 flex justify-center" : ""}><BenefitPill p={p} wrap /></div>)}
          </div>
          <div className="absolute hidden md:block" style={{ left: "73.1em", top: "33.6em", width: "2.4em", height: "2.4em" }}>
            <motion.span className="absolute bg-white" style={{ left: 0, top: 0, width: "0.8em", height: "0.8em" }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />
            <span className="absolute bg-white" style={{ left: 0, top: "0.8em", width: "0.8em", height: "0.8em" }} />
            <span className="absolute bg-white" style={{ left: "0.8em", top: "0.8em", width: "0.8em", height: "0.8em" }} />
            <motion.span className="absolute bg-white" style={{ left: "1.6em", top: "1.6em", width: "0.8em", height: "0.8em" }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.6 }} />
          </div>
        </motion.div>
        {PILLS.map((p, i) => (
          <motion.div key={p.t} className="absolute hidden md:block" style={{ left: `${p.l}em`, top: `${p.top}em`, width: `${p.w}em` }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.12 }}>
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3 + (i % 3) * 0.5, delay: i * 0.3 }}><BenefitPill p={p} /></motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- who it's for (reference: 921 x 614) ---------------- */

function Feedback() {
  return (
    <section id="feedback" className="@container">
      <div className="lp-fit lp-stage relative [font-size:1.6cqw]" style={{ paddingTop: "3em", ["--h" as string]: 67 } as CSSProperties}>
        <div style={{ paddingLeft: "4.1em" }}><Chip>Who it&apos;s for</Chip></div>
        <motion.h2 {...rise} className="font-medium tracking-[-0.03em] text-[#262322]" style={{ fontSize: "5em", paddingLeft: "0.82em", marginTop: "0.25em" }}>Built for India&apos;s <span style={LIME}>creators</span></motion.h2>
        <div style={{ marginTop: "2.4em" }}><FeedbackDeck /></div>
      </div>
    </section>
  );
}

/* ---------------- footer (reference: 914 x 494) ---------------- */

function Footer() {
  return (
    <div className="@container mt-[1.2rem]">
      <footer className="lp-fit relative overflow-hidden bg-[#ecebe6] text-[#1f1f1f] [font-size:2.3cqw] md:h-[54em]" style={{ borderRadius: "2.6em 2.6em 0 0", ["--h" as string]: 54 } as CSSProperties}>
        <HeroScene className="absolute inset-0 h-full w-full" style={{ filter: "blur(3px) saturate(0.55) brightness(1.15)", opacity: 0.55 }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(246 245 240 / 0.9), rgb(240 239 233 / 0.6) 55%, rgb(236 235 230 / 0.25))" }} />
        <div className="relative z-10 px-[4.8em] pt-[5em] md:absolute md:left-[4.8em] md:top-[3.5em] md:p-0">
          <div className="flex items-center font-semibold" style={{ fontSize: "1.5em", gap: "0.35em" }}><Logo style={{ width: "1.2em", height: "1.2em" }} /> Drishyya</div>
          <motion.h2 {...rise} className="font-medium tracking-[-0.03em]" style={{ fontSize: "5em", lineHeight: 1.06, marginTop: "0.25em", maxWidth: "11.5em" }}>You bring the idea. We help you show it.</motion.h2>
          <p className="text-[#555]" style={{ fontSize: "1.4em", marginTop: "3.3em", maxWidth: "22em" }}>Start free: bring a topic, record with our script, and get back a video that explains.</p>
          <div className="mt-[3em] inline-flex flex-wrap items-center rounded-full bg-white shadow-sm md:mt-[7.6em]" style={{ height: "3em", padding: "0 1.2em", gap: "2.6em" }}>
            {NAV.map(([l, h]) => <a key={h} href={h} className="font-medium hover:text-[#5b8f1f]" style={{ fontSize: "1.1em" }}>{l}</a>)}
          </div>
        </div>
        <div className="relative z-0 ml-auto mt-[3em] w-fit md:absolute md:bottom-[4.2em] md:right-[-2em] md:mt-0" style={{ fontSize: "1.08em" }}><AIMonitor start={4} /></div>
        <div className="relative z-10 mx-[1.5em] mb-[1.2em] flex flex-wrap items-center justify-between rounded-full bg-white md:absolute md:inset-x-[4.8em] md:bottom-[2.6em] md:m-0" style={{ minHeight: "2em", padding: "0.4em 1.6em", gap: "1em" }}>
          <span>© 2026 Drishyya. All rights reserved.</span><span>Terms &amp; Conditions</span><span>Privacy Policy</span>
        </div>
      </footer>
    </div>
  );
}

/** smooth, gently eased scrolling for the wheel, the trackpad and the nav links (off for people who ask for reduced motion) */
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, anchors: { offset: -80 } });
    let id = 0;
    const raf = (t: number) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(id); lenis.destroy(); };
  }, []);
}

export default function Landing() {
  useSmoothScroll();
  return (
    <MotionConfig reducedMotion="user">
      <div className="lp relative min-h-dvh px-2.5 pt-2.5 md:px-[1.1vw]">
        <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="lp-blob lp-blob-a" /><div className="lp-blob lp-blob-b" /><div className="lp-blob lp-blob-c" /></div>
        <div className="relative">
        <Nav />
        <Hero />
        <Problem />
        <Platform />
        <Features />
        <How />
        <Benefits />
        <Feedback />
        <Footer />
        </div>
      </div>
    </MotionConfig>
  );
}
