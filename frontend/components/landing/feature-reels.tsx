"use client";

import { Check, FileText, Folder, Lock, Music, Pencil, RotateCcw, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Film, type ShotName } from "./explainer";

/* The Powerful Features reels: what the rest of the page doesn't show. Each one is a small live scene that fills a
   reel card (dark, 23.4em x 35em); the card's own title overlay covers the bottom third, so scenes live in the top
   two thirds. Every scene starts when its card is played. */

const ease = [0.22, 1, 0.36, 1] as const;
const Scene = ({ children }: { children: ReactNode }) => (
  <div className="absolute inset-0 overflow-hidden text-white" style={{ background: "radial-gradient(120% 80% at 30% 0%, #3a3633 0%, #1f1c1b 60%, #151312 100%)" }}>
    <div className="absolute inset-x-0 top-0" style={{ height: "22.5em", padding: "2.2em 1.8em 0" }}>{children}</div>
  </div>
);
const pill = "rounded-full bg-white/10 ring-1 ring-white/15";

/** grounded: a sentence in your notes lights up, and the script line that uses it carries its page */
function Grounded() {
  return (
    <Scene>
      <motion.div className="rounded-[0.9em] bg-[#f4f1e8] text-[#2b2725]" style={{ padding: "1em 1.1em", fontSize: "0.82em", lineHeight: 1.55 }}
        initial={{ opacity: 0, y: "1em" }} animate={{ opacity: 1, y: "0em" }} transition={{ duration: 0.6, ease }}>
        <div className="flex items-center font-semibold" style={{ gap: "0.4em", marginBottom: "0.4em" }}><FileText style={{ width: "1.1em", height: "1.1em" }} />notes.pdf · page 3</div>
        UPI was launched by NPCI in 2016.{" "}
        <motion.span style={{ borderRadius: "0.2em", padding: "0 0.15em" }} initial={{ backgroundColor: "rgba(166,240,74,0)" }} animate={{ backgroundColor: "rgba(166,240,74,1)" }} transition={{ delay: 0.8, duration: 0.5 }}>
          A payment settles between banks in under a second.
        </motion.span>{" "}Limits depend on the bank.
      </motion.div>
      <motion.div className="mx-auto bg-[#a6f04a]" style={{ width: "0.15em", height: "2.2em", originY: 0 }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 1.3, duration: 0.4 }} />
      <motion.div className="rounded-[0.9em] bg-white/10 ring-1 ring-white/15" style={{ padding: "0.9em 1.1em", fontSize: "0.9em" }}
        initial={{ opacity: 0, y: "1em" }} animate={{ opacity: 1, y: "0em" }} transition={{ delay: 1.6, duration: 0.5, ease }}>
        &ldquo;Paisa ek second se kam mein pahunch jaata hai.&rdquo;
        <span className="mt-[0.6em] flex items-center font-semibold text-[#a6f04a]" style={{ gap: "0.35em", fontSize: "0.8em" }}><Check style={{ width: "1.1em", height: "1.1em" }} strokeWidth={3} />Source: your notes, page 3</span>
      </motion.div>
    </Scene>
  );
}

/** fix one line: edit the words, and only that scene renders again */
function FixLine() {
  const [step, setStep] = useState(0);
  useEffect(() => { const t = [setTimeout(() => setStep(1), 900), setTimeout(() => setStep(2), 1900)]; return () => t.forEach(clearTimeout); }, []);
  return (
    <Scene>
      <div className="flex flex-col" style={{ gap: "0.55em" }}>
        {["Scene 1 · The hook", "Scene 2 · The QR scan", "Scene 3 · Bank to bank", "Scene 4 · The PIN", "Scene 5 · Recap"].map((t, k) => {
          const edit = k === 2;
          return (
            <motion.div key={t} className={`flex items-center justify-between rounded-[0.7em] ${edit ? "bg-white/15 ring-1 ring-[#a6f04a]" : "bg-white/[0.07]"}`} style={{ padding: "0.6em 0.9em", fontSize: "0.85em" }}
              initial={{ opacity: 0, x: "-1em" }} animate={{ opacity: 1, x: "0em" }} transition={{ delay: k * 0.08, duration: 0.4, ease }}>
              <span className="flex items-center" style={{ gap: "0.5em" }}>
                {edit && <Pencil style={{ width: "1em", height: "1em", color: "#a6f04a" }} />}
                {edit && step >= 1 ? <span>Scene 3 · <span className="text-[#a6f04a]">How banks talk</span></span> : t}
              </span>
              {edit && step === 1 ? (
                <motion.span className="rounded-full" style={{ width: "1.1em", height: "1.1em", border: "0.15em solid rgba(255,255,255,0.25)", borderTopColor: "#a6f04a" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
              ) : (
                <Check style={{ width: "1.1em", height: "1.1em", color: edit && step === 2 ? "#a6f04a" : "rgba(255,255,255,0.45)" }} strokeWidth={3} />
              )}
            </motion.div>
          );
        })}
      </div>
      <motion.div className="text-white/60" style={{ fontSize: "0.78em", marginTop: "0.9em" }} animate={{ opacity: step === 2 ? 1 : 0 }}>Only scene 3 rendered again · 40 s</motion.div>
    </Scene>
  );
}

/** Hinglish, done right: the same caption flips between Roman and Devanagari */
function Scripts() {
  const [dev, setDev] = useState(false);
  useEffect(() => { const t = setInterval(() => setDev((d) => !d), 1600); return () => clearInterval(t); }, []);
  return (
    <Scene>
      <div className="flex justify-center">
        <div className={`flex ${pill}`} style={{ padding: "0.25em", fontSize: "0.85em" }}>
          {["Roman", "देवनागरी"].map((s, i) => (
            <span key={s} className="relative" style={{ padding: "0.35em 1em" }}>
              {(i === 1) === dev && <motion.span layoutId="scripts-pill" className="absolute inset-0 rounded-full bg-[#a6f04a]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
              <span className="relative" style={{ color: (i === 1) === dev ? "#1f1c1b" : "#fff" }}>{s}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="relative grid place-items-center" style={{ height: "11em" }}>
        <motion.div key={String(dev)} className="text-center font-bold leading-tight" style={{ fontSize: "2em" }}
          initial={{ opacity: 0, y: "0.5em", filter: "blur(6px)" }} animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }} transition={{ duration: 0.45, ease }}>
          {dev ? "पैसा सीधा बैंक तक" : "Paisa seedha bank tak"}
        </motion.div>
      </div>
      <div className="text-center text-white/55" style={{ fontSize: "0.8em" }}>Spelled the way your audience reads</div>
    </Scene>
  );
}

/** ready in under 2 hours: a clock that fills through the stages */
function Fast() {
  const stages = ["Clean cut", "Visuals", "Captions", "Render", "Shorts"];
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK((x) => Math.min(x + 1, stages.length)), 520); return () => clearInterval(t); }, [stages.length]);
  const C = 2 * Math.PI * 42;
  return (
    <Scene>
      <div className="flex items-center" style={{ gap: "1.4em" }}>
        <div className="relative shrink-0" style={{ width: "9em", height: "9em" }}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
            <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#a6f04a" strokeWidth="8" strokeLinecap="round" strokeDasharray={C}
              initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - k / stages.length) }} transition={{ duration: 0.5, ease }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <span><span className="block font-bold" style={{ fontSize: "1.6em" }}>1h 52m</span><span className="text-white/55" style={{ fontSize: "0.7em" }}>start to finish</span></span>
          </div>
        </div>
        <div className="flex flex-col" style={{ gap: "0.45em", fontSize: "0.85em" }}>
          {stages.map((s, i) => (
            <span key={s} className="flex items-center" style={{ gap: "0.45em", opacity: i < k ? 1 : 0.35, transition: "opacity 0.3s" }}>
              <Check style={{ width: "1em", height: "1em", color: i < k ? "#a6f04a" : "#777" }} strokeWidth={3} />{s}
            </span>
          ))}
        </div>
      </div>
      <div className="text-white/55" style={{ fontSize: "0.8em", marginTop: "1.2em" }}>Record tonight. Publish tonight.</div>
    </Scene>
  );
}

/** pay per video by UPI: a pay sheet, then paid */
function Upi() {
  const [paid, setPaid] = useState(false);
  useEffect(() => { const t = setTimeout(() => setPaid(true), 1500); return () => clearTimeout(t); }, []);
  return (
    <Scene>
      <motion.div className="mx-auto rounded-[1.2em] bg-white text-[#1f1c1b]" style={{ width: "15em", padding: "1.2em" }}
        initial={{ opacity: 0, y: "2em" }} animate={{ opacity: 1, y: "0em" }} transition={{ duration: 0.6, ease }}>
        <div className="text-[#777]" style={{ fontSize: "0.75em" }}>Drishyya · 1 video</div>
        <div className="font-bold" style={{ fontSize: "2.2em", lineHeight: 1.1 }}>₹199</div>
        <div className="relative mx-auto grid place-items-center" style={{ width: "7.5em", height: "7.5em", marginTop: "0.7em" }}>
          {!paid ? (
            <div className="grid h-full w-full grid-cols-6 gap-[0.15em] rounded-[0.4em] bg-white p-[0.4em] ring-1 ring-black/10">
              {Array.from({ length: 36 }, (_, i) => <span key={i} className="rounded-[0.08em]" style={{ background: (i * 7 + (i % 5) * 3) % 3 === 0 ? "#fff" : "#1f1c1b" }} />)}
            </div>
          ) : (
            <motion.span className="grid h-full w-full place-items-center rounded-full bg-[#a6f04a]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
              <Check style={{ width: "3.6em", height: "3.6em", color: "#1f1c1b" }} strokeWidth={3} />
            </motion.span>
          )}
        </div>
        <div className="text-center font-semibold" style={{ fontSize: "0.85em", marginTop: "0.6em" }}>{paid ? "Paid by UPI" : "Scan with any UPI app"}</div>
      </motion.div>
    </Scene>
  );
}

/** your files stay yours: private folder, nothing trained on it, deleted after 30 days unless you keep it */
function Private() {
  return (
    <Scene>
      <div className="flex flex-col items-center">
        <motion.div className="relative grid place-items-center" style={{ width: "7em", height: "7em" }} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease }}>
          <Folder style={{ width: "7em", height: "7em", color: "rgba(255,255,255,0.2)" }} strokeWidth={1.2} />
          <motion.span className="absolute grid place-items-center rounded-full bg-[#a6f04a]" style={{ width: "3em", height: "3em", bottom: "0.6em", right: "0.4em" }}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 14 }}>
            <Lock style={{ width: "1.5em", height: "1.5em", color: "#1f1c1b" }} />
          </motion.span>
        </motion.div>
        <div className="flex w-full flex-col" style={{ gap: "0.5em", marginTop: "1em", fontSize: "0.85em" }}>
          {["Only you can see your uploads", "Never used to train AI", "Deleted after 30 days, unless you keep it"].map((t, k) => (
            <motion.span key={t} className="flex items-center" style={{ gap: "0.5em" }} initial={{ opacity: 0, x: "-0.8em" }} animate={{ opacity: 1, x: "0em" }} transition={{ delay: 0.9 + k * 0.2 }}>
              <Check style={{ width: "1em", height: "1em", color: "#a6f04a" }} strokeWidth={3} />{t}
            </motion.span>
          ))}
        </div>
      </div>
    </Scene>
  );
}

/** review on your phone: the storyboard in your pocket, approved with a tap */
function Phone() {
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK((x) => Math.min(x + 1, 4)), 450); return () => clearInterval(t); }, []);
  return (
    <Scene>
      <motion.div className="mx-auto rounded-[1.6em] bg-[#0d0c0c] ring-[0.3em] ring-white/15" style={{ width: "11.5em", height: "19.5em", padding: "1em 0.7em" }}
        initial={{ y: "3em", opacity: 0 }} animate={{ y: "0em", opacity: 1 }} transition={{ duration: 0.6, ease }}>
        <div className="flex items-center justify-between text-white/60" style={{ fontSize: "0.6em", marginBottom: "0.8em" }}><Smartphone style={{ width: "1.2em", height: "1.2em" }} /><span>Storyboard</span></div>
        {(["hook", "qr", "hub", "paid"] as ShotName[]).map((img, i) => (
          <div key={img} className="flex items-center" style={{ gap: "0.4em", marginBottom: "0.45em" }}>
            <div className="relative shrink-0 overflow-hidden rounded-[0.3em]" style={{ width: "4.2em", height: "2.4em" }}><Film shots={[img]} ms={2800 + i * 250} /></div>
            <span className="flex-1 rounded-full bg-white/15" style={{ height: "0.4em" }} />
            <span className="grid place-items-center rounded-full" style={{ width: "1.1em", height: "1.1em", background: i < k ? "#a6f04a" : "rgba(255,255,255,0.15)", transition: "background 0.3s" }}>
              {i < k && <Check style={{ width: "0.75em", height: "0.75em", color: "#1f1c1b" }} strokeWidth={3.4} />}
            </span>
          </div>
        ))}
        <motion.div className="text-center font-semibold" style={{ marginTop: "0.8em", fontSize: "0.75em", padding: "0.5em", borderRadius: "999em", background: k >= 4 ? "#a6f04a" : "rgba(255,255,255,0.12)", color: k >= 4 ? "#1f1c1b" : "#fff" }}>
          {k >= 4 ? "Approved" : "Approve all"}
        </motion.div>
      </motion.div>
    </Scene>
  );
}

/** every version saved: go back to any take or edit */
function Versions() {
  const vs: [string, string, ShotName][] = [["v1", "First take", "coin"], ["v2", "Warmer intro", "qr"], ["v3", "New opening", "hook"]];
  const [k, setK] = useState(2);
  useEffect(() => { const t = setTimeout(() => setK(1), 1500); return () => clearTimeout(t); }, []);
  return (
    <Scene>
      <div className="relative flex justify-between" style={{ marginTop: "1em" }}>
        <motion.div className="absolute inset-x-[1.5em] bg-white/20" style={{ top: "1.1em", height: "0.15em", originX: 0 }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease }} />
        {vs.map(([v, t, img], i) => (
          <motion.div key={v} className="relative flex flex-col items-center" style={{ width: "6.2em", gap: "0.5em" }} initial={{ opacity: 0, y: "1em" }} animate={{ opacity: 1, y: "0em" }} transition={{ delay: 0.2 + i * 0.15 }}>
            <span className="grid place-items-center rounded-full font-mono font-bold" style={{ width: "2.3em", height: "2.3em", fontSize: "0.85em", background: i === k ? "#a6f04a" : "#3a3633", color: i === k ? "#1f1c1b" : "#fff", transition: "all 0.3s" }}>{v}</span>
            <div className="relative overflow-hidden rounded-[0.5em]" style={{ width: "6.2em", height: "3.5em", outline: i === k ? "0.15em solid #a6f04a" : "none", transition: "outline 0.3s" }} ><Film shots={[img]} ms={3000 + i * 250} /></div>
            <span className="text-center text-white/70" style={{ fontSize: "0.7em" }}>{t}</span>
          </motion.div>
        ))}
      </div>
      <motion.div className={`mx-auto flex w-fit items-center ${pill}`} style={{ marginTop: "1.6em", padding: "0.4em 1em", gap: "0.4em", fontSize: "0.8em" }} animate={{ opacity: k === 1 ? 1 : 0 }}>
        <RotateCcw style={{ width: "1em", height: "1em" }} />Restored v2
      </motion.div>
    </Scene>
  );
}

/** music and sound: a bed under your voice, ducked when you speak, with sound effects on the cuts */
function Sound() {
  return (
    <Scene>
      {[["Your voice", "#ffffff", 0.9], ["Music bed", "#a6f04a", 0.45], ["Sound effects", "#f3f79a", 0.3]].map(([t, c, amp], k) => (
        <motion.div key={t as string} style={{ marginBottom: "1em" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.2 }}>
          <div className="flex items-center text-white/70" style={{ gap: "0.4em", fontSize: "0.75em", marginBottom: "0.35em" }}>{k === 1 && <Music style={{ width: "1em", height: "1em" }} />}{t as string}</div>
          <div className="flex items-center" style={{ gap: "0.18em", height: "2.6em" }}>
            {Array.from({ length: 30 }, (_, j) => (
              <motion.span key={j} className="flex-1 rounded-full" style={{ height: "100%", background: c as string, opacity: k === 2 && j % 6 ? 0.15 : 0.9 }}
                animate={{ scaleY: [0.15, 0.2 + (((j * 41 + k * 13) % 70) / 100) * (amp as number), 0.15] }} transition={{ repeat: Infinity, duration: 0.7 + (j % 4) * 0.15 }} />
            ))}
          </div>
        </motion.div>
      ))}
      <div className="text-white/55" style={{ fontSize: "0.8em" }}>Music dips when you speak</div>
    </Scene>
  );
}

export const FEATURE_SCENES = { Grounded, FixLine, Scripts, Fast, Upi, Private, Phone, Versions, Sound };
