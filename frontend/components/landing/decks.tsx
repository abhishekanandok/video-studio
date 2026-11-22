"use client";

import { FileCheck2, History, IndianRupee, Languages, Lock, Music, Pencil, Smartphone, Timer, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FEATURE_SCENES } from "./feature-reels";

/** A glossy "app icon" tile like the 3D icons in the reference. */
export function AppIcon({ icon: I, from, to, size = 6.4, img }: { icon?: LucideIcon; from: string; to: string; size?: number; img?: string }) {
  return (
    <div className="relative grid place-items-center overflow-hidden shadow-[0_0.6em_1.2em_-0.3em_rgb(0_0_0/0.45)]"
      style={{ width: `${size}em`, height: `${size}em`, borderRadius: `${size * 0.26}em`, background: `linear-gradient(145deg, ${from}, ${to})` }}>
      {img && <img src={img} alt="" className="absolute inset-[9%] h-[82%] w-[82%] rounded-[18%] object-cover shadow-inner" />}
      {I && <I className="relative text-white drop-shadow-[0_0.1em_0.15em_rgb(0_0_0/0.35)]" style={{ width: `${size * 0.5}em`, height: `${size * 0.5}em` }} strokeWidth={2.2} />}
      <div className="pointer-events-none absolute inset-0" style={{ borderRadius: "inherit", background: "radial-gradient(120% 80% at 25% 10%, rgb(255 255 255 / 0.55), transparent 45%)", boxShadow: "inset 0 -0.3em 0.6em rgb(0 0 0 / 0.25), inset 0 0.15em 0.2em rgb(255 255 255 / 0.5)" }} />
    </div>
  );
}

/* ---------- Supercharge: a reel. Three cards are dealt from the top like taas ke patte; then each one in turn pops
   forward and plays its visual, and is swiped down out of view; when all three are gone the next set is dealt.
   "Next" moves on at once. Layout measured from the reference (1em = 1% of the width). */

/* each card's reel is a small live scene (feature-reels.tsx) that fills the whole card */
const { Grounded, FixLine, Scripts, Fast, Upi, Private, Phone, Versions, Sound } = FEATURE_SCENES;

type Card = { title: string; body: string; icon: LucideIcon; from: string; to: string; visual: ReactNode };
const SETS: [Card, Card, Card][] = [
  [
    { title: "Grounded in Your Notes", body: "Every fact traces back to your notes. Nothing made up.", icon: FileCheck2, from: "#8b6cff", to: "#3d6bff", visual: <Grounded /> },
    { title: "Fix One Line", body: "Change a line; only that scene renders again.", icon: Pencil, from: "#ffb04f", to: "#f0621a", visual: <FixLine /> },
    { title: "Hinglish, Done Right", body: "Roman or देवनागरी, spelled the way your audience reads.", icon: Languages, from: "#3a3a3a", to: "#111", visual: <Scripts /> },
  ],
  [
    { title: "Ready in Under 2 Hours", body: "Record tonight, publish tonight.", icon: Timer, from: "#22c55e", to: "#0f766e", visual: <Fast /> },
    { title: "₹199 by UPI", body: "Pay per video. No subscription, no card.", icon: IndianRupee, from: "#ffb04f", to: "#f0621a", visual: <Upi /> },
    { title: "Your Files Stay Yours", body: "Private by default. Never used to train AI.", icon: Lock, from: "#3a3a3a", to: "#111", visual: <Private /> },
  ],
  [
    { title: "Review on Your Phone", body: "Approve the storyboard from anywhere.", icon: Smartphone, from: "#8b6cff", to: "#3d6bff", visual: <Phone /> },
    { title: "Every Version Saved", body: "Go back to any take or edit, any time.", icon: History, from: "#ffb04f", to: "#f0621a", visual: <Versions /> },
    { title: "Music & Sound", body: "A music bed and sound effects, mixed under your voice.", icon: Music, from: "#3a3a3a", to: "#111", visual: <Sound /> },
  ],
];

// where each card rests (centre x, top, tilt) and the order it is dealt in
// the fan rests on the left; a card plays its reel on the empty right side, 30% bigger, above everything
const REST = [{ x: 49.5, top: 2.7, r: 12, z: 1 }, { x: 32.5, top: 0, r: 0, z: 3 }, { x: 15.5, top: 2.8, r: -12, z: 2 }];
const PLAY = { x: 79, top: -3.6, scale: 1.3 };
// the y that puts a scaled card's top at PLAY.top (cards are 35em tall, scaled about their centre)
const playY = (top: number) => PLAY.top + 17.5 * PLAY.scale - (top + 1 + 17.5);
const DEAL_ORDER = [0, 2, 1];
// 0 dealt; then for each card: it plays, it flows down, and only then does the next one lift; 7 = all gone
const STEP_MS = [1700, 3400, 3400, 3400, 1000];
const GONE_S = 0.7; // how long a card takes to flow down; the next one waits for it

export function FeatureDeck() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const [k, setK] = useState(0);
  const [s, setS] = useState(0); // 0 dealt and resting, 1-3 card s-1 is playing, 4 all gone
  useEffect(() => {
    if (!seen) return;
    const t = setTimeout(() => (s >= 4 ? (setK((x) => x + 1), setS(0)) : setS(s + 1)), STEP_MS[s] + (s >= 1 && s <= 3 ? GONE_S * 1000 : 0));
    return () => clearTimeout(t);
  }, [seen, s, k]);
  const set = SETS[k % SETS.length];
  return (
    <div ref={ref} className="relative" style={{ height: "48em" }}>
      {seen && set.map((c, i) => {
        const p = REST[i];
        const active = s >= 1 && i === s - 1;
        const gone = s >= 1 && i < s - 1;
        const lift = s >= 2 ? GONE_S + 0.05 : 0.1; // the previous card flows down first
        const I = c.icon;
        const dark = i === 1;
        return (
          <motion.div key={`${k}-${i}`} className="absolute"
            style={{ left: `${p.x - 11.7}em`, top: `${p.top + 1}em`, width: "23.4em", height: "35em", zIndex: active ? 20 : gone ? 25 : p.z }}
            initial={{ y: "-26em", x: "0em", rotate: p.r + 25 - i * 12, scale: 1, opacity: 0 }}
            animate={gone
              ? { y: "52em", x: `${PLAY.x - p.x}em`, rotate: 6, scale: 1.1, opacity: 0, transition: { duration: GONE_S, ease: [0.55, 0, 0.85, 0.45] } }
              : active
                ? { y: `${playY(p.top)}em`, x: `${PLAY.x - p.x}em`, rotate: 0, scale: PLAY.scale, opacity: 1, transition: { delay: lift, type: "spring", stiffness: 110, damping: 16 } }
                : { y: "0em", x: "0em", rotate: p.r, scale: 1, opacity: 1, transition: { type: "spring", stiffness: 70, damping: 13, mass: 1.1, delay: s === 0 ? DEAL_ORDER.indexOf(i) * 0.22 : 0 } }}>
            <div className={`relative h-full w-full overflow-hidden ${active ? "shadow-[0_2.4em_4em_-1em_rgb(0_0_0/0.5)]" : "shadow-[0_1.6em_3em_-1em_rgb(0_0_0/0.35)]"}`}
              style={{ borderRadius: "2.4em", background: ["#f6f88f", "#2b2725", "#9ef241"][i], color: dark ? "#fff" : "#1f1f1f", padding: "2.2em" }}>
              <AppIcon icon={I} from={c.from} to={c.to} />
              <div className="absolute" style={{ left: "2.2em", right: "2.2em", bottom: "2.6em" }}>
                <div className="font-semibold" style={{ fontSize: "1.6em" }}>{c.title}</div>
                <p className="opacity-70" style={{ fontSize: "0.95em", marginTop: "0.6em" }}>{c.body}</p>
              </div>
              {/* the reel: once the card has lifted, its visual fills the whole card */}
              <AnimatePresence>
                {active && (
                  <motion.div key="reel" className="absolute inset-0 overflow-hidden bg-black text-white" style={{ borderRadius: "inherit" }}
                    initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: lift + 0.35, duration: 0.45 }}>
                    {c.visual}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" style={{ padding: "4em 1.6em 1.8em" }}>
                      <div className="font-semibold" style={{ fontSize: "1.5em" }}>{c.title}</div>
                      <p className="text-white/75" style={{ fontSize: "0.95em", marginTop: "0.4em" }}>{c.body}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
      <NextBar onNext={() => setS((x) => Math.min(x + 1, 4))} />
    </div>
  );
}

function NextBar({ onNext }: { onNext: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between" style={{ padding: "0 max(0.4em, calc(50em - 50cqw + 0.4em))" }}>
      <p className="text-[#1f1f1f]" style={{ fontSize: "1.55em" }}>Everything between your idea and a finished video</p>
      <button onClick={onNext} className="rounded-full bg-[#2b2725] font-medium text-white transition-transform hover:-translate-y-0.5" style={{ fontSize: "1.25em", padding: "0.75em 1.9em" }}>Next</button>
    </div>
  );
}

/* ---------- who it's for: ID cards drop in from the top under the binder clip and leave through the bottom.
   Personas from the PRD, not testimonials: Drishyya has no customers yet, so there are no names. */

const PERSONAS = [
  { tag: "YouTube Creator", quote: "I know my topic. Planning, scripting and editing eat my whole week.", role: "Tech · finance · vlogs", want: "A script to read, visuals added", img: "/landing/s-travel.jpg" },
  { tag: "Educator", quote: "Give me a script I can teach from, and a visual for every concept.", role: "Teachers · coaching channels", want: "Lesson plan to finished video", img: "/landing/v-veo1.jpg" },
  { tag: "Brand & Agency", quote: "We need many videos in many languages, all looking like one brand.", role: "D2C brands · agencies · institutes", want: "Brand kit, dubbing, seats", img: "/landing/s-cook.jpg" },
]

function Barcode() {
  const bars = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3];
  return <div className="flex items-stretch bg-white" style={{ height: "3em", gap: "0.18em", padding: "0.3em" }}>{bars.map((w, i) => <span key={i} className="bg-[#111]" style={{ width: `${w * 0.16}em` }} />)}</div>;
}

export function FeedbackDeck() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setK((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);
  const f = PERSONAS[k % PERSONAS.length];
  return (
    <div className="relative overflow-hidden" style={{ height: "52em" }}>
      {/* binder clip: the card slides in under it */}
      <div className="absolute left-1/2 z-20 -translate-x-1/2" style={{ top: "1em", width: "15em" }}>
        <div className="mx-auto rounded-full bg-gradient-to-br from-[#fafafa] via-[#9d9d9d] to-[#4a4a4a] shadow-lg" style={{ width: "6.4em", height: "6.4em", padding: "1.2em" }}>
          <div className="h-full w-full rounded-full bg-gradient-to-br from-[#3a3a3a] to-[#cfcfcf]" style={{ padding: "0.5em" }}><div className="h-full w-full rounded-full bg-white" /></div>
        </div>
        <div className="relative mx-auto bg-gradient-to-b from-[#f0f0f0] via-[#9e9e9e] to-[#3d3d3d] shadow-[0_0.8em_1.2em_rgb(0_0_0/0.35)]" style={{ marginTop: "-1.8em", width: "15em", height: "4.2em", borderRadius: "0.8em" }} />
      </div>
      <AnimatePresence initial={false}>
        <motion.div key={k} className="absolute left-1/2 flex text-white"
          style={{ top: "11.5em", width: "56.3em", height: "31.4em", marginLeft: "-28.15em", borderRadius: "1.6em", background: "#312d2b", padding: "2.2em", gap: "3.5em", boxShadow: "0 2.4em 4em -1.6em rgb(0 0 0 / 0.55)" }}
          initial={{ y: "-46em", rotate: -6, opacity: 1 }} animate={{ y: "0em", rotate: 0 }}
          exit={{ y: "60em", rotate: 8, transition: { duration: 0.9, ease: [0.5, 0, 0.9, 0.5] } }}
          transition={{ type: "spring", stiffness: 65, damping: 13, mass: 1.2 }}>
          <div className="lp-kb relative h-full shrink-0" style={{ width: "22em", borderRadius: "1.1em" }}><img src={f.img} alt="" /></div>
          <div className="min-w-0" style={{ paddingTop: "2.4em" }}>
            <span className="inline-block rounded-full bg-gradient-to-r from-[#a6f04a] to-[#eef99a] font-medium text-[#1f1f1f]" style={{ fontSize: "1.25em", padding: "0.25em 0.8em" }}>{f.tag}</span>
            <p className="font-medium leading-snug" style={{ fontSize: "1.85em", marginTop: "1em" }}>{f.quote}</p>
            <div className="space-y-[0.6em] text-white/80" style={{ fontSize: "1.2em", marginTop: "1.6em" }}>
              <div>Role : <span className="text-white">{f.role}</span></div>
              <div>Wants : <span className="text-white">{f.want}</span></div>
            </div>
            <div style={{ width: "9.2em", marginTop: "2em" }}><Barcode /></div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
