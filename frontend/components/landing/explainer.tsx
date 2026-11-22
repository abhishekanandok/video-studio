"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* A small motion-graphics film that explains UPI, drawn live in the browser (no video files): grid paper, box-style
   cards with hard ink shadows, sticky notes with tape, a flipping ₹ coin, kinetic words with a lime marker sweep.
   A new shot every ~2 seconds, each with its own camera move and transition, like an edited explainer.

   Every shot is laid out on a 100em x 100em square centred in its frame, where 1em = 1% of the frame's shorter side
   (cqmin), so the same shot works in a 16:9 card, a 9:16 Short or a small review tile. */

const INK = "#1f1c1b", LIME = "#a6f04a", PAPER = "#f7f5ee", STICKY = "#f6f39a", COIN = "#f4c94a", RED = "#e8402c";
const ease = [0.22, 1, 0.36, 1] as const;
const pop = (delay = 0) => ({ initial: { scale: 0, rotate: -10 }, animate: { scale: 1, rotate: 0 }, transition: { delay, type: "spring" as const, stiffness: 420, damping: 15 } });

/** true while a shot sits on a dark background: hard shadows turn lime and words turn white */
const Dark = createContext(false);
const shade = (dark: boolean) => (dark ? LIME : INK);

/* ---------- primitives ---------- */
function At({ x, y, w, h, children, style }: { x: number; y: number; w?: number; h?: number; children: ReactNode; style?: CSSProperties }) {
  return <div className="absolute" style={{ left: `${x}em`, top: `${y}em`, width: w ? `${w}em` : undefined, height: h ? `${h}em` : undefined, ...style }}>{children}</div>;
}

function Box({ children, bg = "#fff", style }: { children?: ReactNode; bg?: string; style?: CSSProperties }) {
  const dark = useContext(Dark);
  return (
    <div className="relative grid h-full w-full place-items-center" style={{ background: bg, border: `0.7em solid ${INK}`, borderRadius: "2.6em", boxShadow: `1.4em 1.4em 0 ${shade(dark)}`, ...style }}>
      {children}
    </div>
  );
}

function Tape({ r = -6, style }: { r?: number; style?: CSSProperties }) {
  return <span className="absolute" style={{ left: "50%", top: "-2.2em", width: "13em", height: "4.4em", marginLeft: "-6.5em", background: "rgba(255,255,255,0.72)", boxShadow: "0 0.2em 0.6em rgb(0 0 0/0.12)", transform: `rotate(${r}deg)`, ...style }} />;
}

function Sticky({ children, bg = STICKY, r = -4, delay = 0, size = 7 }: { children: ReactNode; bg?: string; r?: number; delay?: number; size?: number }) {
  return (
    <motion.div className="relative grid h-full w-full place-items-center text-center font-bold leading-[1.05]" style={{ background: bg, color: INK, boxShadow: "0.8em 1.4em 2em -0.6em rgb(0 0 0/0.35)", padding: "2em" }}
      initial={{ scale: 1.6, opacity: 0, rotate: r - 12 }} animate={{ scale: 1, opacity: 1, rotate: r }} transition={{ delay, type: "spring", stiffness: 300, damping: 14 }}>
      <Tape r={-r * 1.5} />
      <span style={{ fontSize: `${size}em` }}>{children}</span>
    </motion.div>
  );
}

function Words({ words, size = 15, mark = -1, delay = 0, color }: { words: string[]; size?: number; mark?: number; delay?: number; color?: string }) {
  const dark = useContext(Dark);
  color = color ?? (dark ? "#ffffff" : INK);
  return (
    <div className="flex flex-wrap items-center justify-center font-extrabold tracking-[-0.03em]" style={{ fontSize: `${size}em`, gap: "0 0.25em", lineHeight: 1.05, color }}>
      {words.map((w, i) => (
        <motion.span key={i} className="relative inline-block" initial={{ y: "0.6em", opacity: 0, scale: 0.6 }} animate={{ y: "0em", opacity: 1, scale: 1 }}
          transition={{ delay: delay + i * 0.14, type: "spring", stiffness: 380, damping: 16 }}>
          {i === mark && (
            <motion.span className="absolute" style={{ left: "-0.08em", right: "-0.08em", top: "0.22em", bottom: "0.02em", background: LIME, borderRadius: "0.12em", originX: 0 }}
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: delay + i * 0.14 + 0.25, duration: 0.35, ease }} />
          )}
          <span className="relative" style={{ color: i === mark ? INK : undefined }}>{w}</span>
        </motion.span>
      ))}
    </div>
  );
}

function Coin({ size = 16 }: { size?: number }) {
  const dark = useContext(Dark);
  return (
    <div className="grid place-items-center rounded-full font-extrabold" style={{ width: `${size}em`, height: `${size}em`, background: `radial-gradient(circle at 35% 30%, #ffe48a, ${COIN} 60%, #d9a425)`, border: `0.6em solid ${INK}`, color: INK, boxShadow: `0.8em 0.8em 0 ${shade(dark)}` }}>
      <span style={{ fontSize: `${size * 0.5}em` }}>₹</span>
    </div>
  );
}

function Phone({ children, bg = "#fff" }: { children?: ReactNode; bg?: string }) {
  const dark = useContext(Dark);
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg, border: `0.8em solid ${INK}`, borderRadius: "3.6em", boxShadow: `1.4em 1.4em 0 ${shade(dark)}` }}>
      <span className="absolute left-1/2 rounded-full" style={{ top: "1.6em", width: "8em", height: "1.6em", marginLeft: "-4em", background: INK }} />
      <div className="absolute inset-0 grid place-items-center" style={{ paddingTop: "3em" }}>{children}</div>
    </div>
  );
}

/* ---------- the shots (each ~2 s) ---------- */

/** ₹10 ki chai: a tapri drops in (striped awning, swinging sign), the kettle pours into the glass, a ₹10 price tag
    slaps on, a QR stand pops up, sparkles, then the words land with ₹10 highlighted */
function ShotHook() {
  return (
    <>
      {/* awning */}
      <motion.div className="absolute" style={{ left: "-4em", top: "-2em", width: "108em", height: "15em" }} initial={{ y: "-18em" }} animate={{ y: "0em" }} transition={{ type: "spring", stiffness: 240, damping: 18 }}>
        <div style={{ height: "11em", background: `repeating-linear-gradient(90deg, ${LIME} 0 9em, #fff 9em 18em)`, borderBottom: `0.7em solid ${INK}` }} />
        <div className="flex" style={{ marginTop: "-0.7em" }}>
          {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ width: "9em", height: "4.5em", borderRadius: "0 0 4.5em 4.5em", background: i % 2 ? "#fff" : LIME, border: `0.7em solid ${INK}`, borderTop: "none" }} />)}
        </div>
      </motion.div>
      {/* swinging sign */}
      <motion.div className="absolute" style={{ left: "34em", top: "14em", width: "32em", originY: 0, originX: 0.5 }} initial={{ rotate: 0, opacity: 0 }} animate={{ rotate: [12, -8, 4, -2, 0], opacity: 1 }} transition={{ delay: 0.25, duration: 1.4 }}>
        <div className="mx-auto flex justify-between" style={{ width: "20em", height: "4em" }}><span style={{ width: "0.5em", background: INK }} /><span style={{ width: "0.5em", background: INK }} /></div>
        <div className="grid place-items-center font-extrabold" style={{ height: "8em", background: INK, color: LIME, borderRadius: "1.6em" }}><span className="whitespace-nowrap" style={{ fontSize: "4.4em", letterSpacing: "0.04em" }}>CHAI TAPRI</span></div>
      </motion.div>
      {/* kettle, pouring */}
      <motion.div className="absolute" style={{ left: "8em", top: "31em", width: "24em", height: "20em", originX: 0.2, originY: 0.8 }} initial={{ x: "-30em", rotate: 0 }} animate={{ x: "0em", rotate: [0, 0, -24] }}
        transition={{ x: { type: "spring", stiffness: 200, damping: 18 }, rotate: { duration: 1, times: [0, 0.4, 1] } }}>
        <svg viewBox="0 0 60 50" className="h-full w-full overflow-visible">
          <path d="M14 18 Q14 8 30 8 Q46 8 46 18 L48 40 Q48 46 40 46 H20 Q12 46 12 40 Z" fill="#d7dcdd" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M46 24 L58 13" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <path d="M14 15 Q1 20 12 34" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <circle cx="30" cy="6" r="3.4" fill={INK} />
          <path d="M18 30 H42" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </motion.div>
      <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: "100em", height: "100em" }} viewBox="0 0 100 100">
        <motion.path d="M31.5 33 Q38 30 46 39" fill="none" stroke="#b07436" strokeWidth="2.2" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.75, duration: 0.35 }} />
      </svg>
      {/* the glass */}
      <motion.div className="absolute" style={{ left: "40em", top: "34em", width: "20em", height: "26em", originY: 1 }} initial={{ scale: 0 }} animate={{ scale: [0, 1.1, 0.94, 1] }} transition={{ delay: 0.2, duration: 0.5 }}>
        <svg viewBox="0 0 60 80" className="h-full w-full overflow-visible">
          {[20, 30, 40].map((x, i) => (
            <motion.path key={x} d={`M${x} 14 C${x - 5} 7 ${x + 5} 3 ${x} -4`} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0.4] }} transition={{ delay: 1 + i * 0.12, duration: 0.8, repeat: Infinity, repeatDelay: 0.2 }} />
          ))}
          <path d="M10 20 H50 L45 76 H15 Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <motion.path d="M13 38 H47 L45 76 H15 Z" fill="#c98a4b" stroke={INK} strokeWidth="3" strokeLinejoin="round" style={{ originY: 1 }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.85, duration: 0.6 }} />
          <path d="M15 50 H45" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" />
        </svg>
      </motion.div>
      {/* ₹10 price tag */}
      <At x={66} y={30} w={22} h={18}><Sticky bg={STICKY} r={9} delay={1} size={8.5}>₹10</Sticky></At>
      {/* QR stand */}
      <motion.div className="absolute flex flex-col items-center justify-center" style={{ left: "70em", top: "51em", width: "15em", height: "17em", background: "#fff", border: `0.6em solid ${INK}`, borderRadius: "1.6em", boxShadow: `0.9em 0.9em 0 ${INK}`, gap: "0.8em" }} {...pop(1.25)}>
        <div className="grid grid-cols-4" style={{ gap: "0.5em" }}>{Array.from({ length: 16 }, (_, i) => <span key={i} style={{ width: "2.2em", height: "2.2em", borderRadius: "0.3em", background: [0, 3, 5, 6, 9, 12, 15, 10].includes(i) ? INK : "transparent" }} />)}</div>
        <span className="font-bold" style={{ fontSize: "2.4em", color: INK, lineHeight: 1 }}>scan me</span>
      </motion.div>
      {/* sparkles */}
      {[[35, 30], [61, 39], [31, 58]].map(([x, y], i) => (
        <motion.svg key={i} viewBox="0 0 20 20" className="absolute" style={{ left: `${x}em`, top: `${y}em`, width: "5em", height: "5em" }} initial={{ scale: 0, rotate: 0 }} animate={{ scale: [0, 1.2, 1], rotate: 90 }} transition={{ delay: 1.1 + i * 0.12, duration: 0.5 }}>
          <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={i === 1 ? LIME : INK} />
        </motion.svg>
      ))}
      <At x={4} y={69} w={92}><Words words={["₹10", "ki", "chai"]} size={12.5} mark={0} delay={0.55} /></At>
      <At x={4} y={86} w={92}><motion.div className="text-center font-bold" style={{ fontSize: "4.4em", color: INK }} initial={{ opacity: 0, y: "0.4em" }} animate={{ opacity: 1, y: "0em" }} transition={{ delay: 1.2 }}>aur payment ek second mein. Kaise?</motion.div></At>
    </>
  );
}

/** you pay: the coin flips through the air into your phone */
function ShotCoin() {
  return (
    <>
      <At x={10} y={22} w={30} h={58}><Phone><Words words={["Pay"]} size={7} delay={0.9} /></Phone></At>
      <motion.div className="absolute" style={{ left: "62em", top: "8em" }}
        initial={{ x: "0em", y: "0em", rotateY: 0 }} animate={{ x: ["0em", "-14em", "-38em"], y: ["0em", "-8em", "26em"], rotateY: [0, 540, 1080], scale: [1, 1.15, 0.7] }}
        transition={{ duration: 1.1, ease: "easeInOut", times: [0, 0.45, 1] }}>
        <Coin size={18} />
      </motion.div>
      <At x={56} y={58} w={34} h={26}><Sticky r={5} delay={0.5} size={6.2}>You pay</Sticky></At>
    </>
  );
}

function QRCells({ n = 7, cell = 3.6, gap = 0.5, delay = 0, color = INK }: { n?: number; cell?: number; gap?: number; delay?: number; color?: string }) {
  const fin = (i: number, j: number) => (i < 2 && j < 2) || (i < 2 && j > n - 3) || (i > n - 3 && j < 2);
  const on = (i: number, j: number) => fin(i, j) || ((i * 31 + j * 17 + i * j * 7) % 5 < 2);
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, ${cell}em)`, gap: `${gap}em` }}>
      {Array.from({ length: n * n }, (_, k) => {
        const i = Math.floor(k / n), j = k % n;
        return <motion.span key={k} style={{ width: `${cell}em`, height: `${cell}em`, borderRadius: fin(i, j) ? "0.3em" : "50%", background: on(i, j) ? color : "transparent" }} {...pop(delay + (i + j) * 0.025)} />;
      })}
    </div>
  );
}

/** scan: the tapri's QR stand stands on the counter (left); the phone slides in from the right, its camera finds the
    code, a lime line scans it, and the screen flips to "₹10 · Chai Tapri" with a tick */
function ShotQR() {
  const [st, setSt] = useState(0); // 0 sliding in, 1 scanning, 2 enter the amount (typed on the keypad: "1", then "10")
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const t = [setTimeout(() => setSt(1), 500), setTimeout(() => setSt(2), 1050), setTimeout(() => setTyped("1"), 1450), setTimeout(() => setTyped("10"), 1800)];
    return () => t.forEach(clearTimeout);
  }, []);
  return (
    <>
      {/* the QR stand on the counter */}
      <motion.div className="absolute flex flex-col items-center" style={{ left: "8em", top: "9em", width: "36em", height: "56em", padding: "2.4em", background: "#fff", border: `0.7em solid ${INK}`, borderRadius: "2.6em", boxShadow: `1.4em 1.4em 0 ${INK}` }}
        initial={{ y: "-12em", opacity: 0 }} animate={{ y: "0em", opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
        <span className="font-extrabold" style={{ fontSize: "3.6em", background: LIME, color: INK, borderRadius: "1em", padding: "0.1em 0.7em", border: `0.16em solid ${INK}` }}>CHAI TAPRI</span>
        <div style={{ marginTop: "3em" }}><QRCells delay={0.1} /></div>
        <span className="font-bold" style={{ fontSize: "3.6em", color: INK, marginTop: "0.7em" }}>scan &amp; pay</span>
      </motion.div>
      {/* the camera beam, while scanning */}
      <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0, width: "100em", height: "100em" }} viewBox="0 0 100 100">
        <motion.polygon points="54,27 22,15 22,50 54,45" fill={LIME} initial={{ opacity: 0 }} animate={{ opacity: st === 1 ? [0, 0.45, 0.25] : 0 }} transition={{ duration: 0.4 }} />
      </svg>
      {/* the phone */}
      <motion.div className="absolute" style={{ left: "50em", top: "6em", width: "32em", height: "60em" }} initial={{ x: "46em", rotate: 10 }} animate={{ x: "0em", rotate: -5 }} transition={{ type: "spring", stiffness: 160, damping: 19 }}>
        <Phone bg={st === 2 ? "#ffffff" : INK}>
          <AnimatePresence mode="wait" initial={false}>
            {st < 2 ? (
              <motion.div key="cam" className="relative grid place-items-center" style={{ width: "22em", height: "22em" }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.2 }}>
                {[["0", "0", "Top", "Left"], ["0", "auto", "Top", "Right"], ["auto", "0", "Bottom", "Left"], ["auto", "auto", "Bottom", "Right"]].map(([t, l, v, h], i) => (
                  <span key={i} className="absolute" style={{ top: t === "0" ? 0 : undefined, bottom: t === "auto" ? 0 : undefined, left: l === "0" ? 0 : undefined, right: l === "auto" ? 0 : undefined, width: "5em", height: "5em", [`border${v}`]: `0.8em solid ${LIME}`, [`border${h}`]: `0.8em solid ${LIME}`, borderRadius: "0.6em" }} />
                ))}
                <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: st >= 1 ? 1 : 0.15, scale: st >= 1 ? 1 : 0.7 }} transition={{ duration: 0.3 }}>
                  <QRCells cell={1.9} gap={0.3} color="#ffffff" />
                </motion.div>
                {st === 1 && (
                  <motion.span className="absolute inset-x-[1.5em]" style={{ height: "0.8em", background: LIME, boxShadow: `0 0 2em ${LIME}`, borderRadius: "1em" }} initial={{ top: "1.5em" }} animate={{ top: ["1.5em", "19.5em", "1.5em"] }} transition={{ duration: 0.7, ease: "easeInOut" }} />
                )}
              </motion.div>
            ) : (
              <motion.div key="amount" className="flex flex-col items-center" style={{ color: INK, marginTop: "-2em" }} initial={{ y: "6em", opacity: 0 }} animate={{ y: "0em", opacity: 1 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
                <span className="flex items-center font-bold" style={{ gap: "0.5em", fontSize: "3em" }}>
                  <span className="grid place-items-center rounded-full font-extrabold" style={{ width: "1.5em", height: "1.5em", background: LIME, fontSize: "1em" }}>C</span>Chai Tapri
                </span>
                <span className="flex items-baseline font-extrabold tabular-nums tracking-[-0.03em]" style={{ fontSize: "9em", lineHeight: 1.1, marginTop: "0.15em" }}>
                  ₹{typed || <span style={{ opacity: 0.25 }}>0</span>}
                  <motion.span style={{ width: "0.06em", height: "0.8em", background: LIME, marginLeft: "0.05em", alignSelf: "center" }} animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                </span>
                <div className="grid grid-cols-3" style={{ gap: "0.9em", marginTop: "1.6em" }}>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) => {
                    const hit = (d === "1" && typed === "1") || (d === "0" && typed === "10");
                    return (
                      <motion.span key={i} className="grid place-items-center font-bold" style={{ width: "7em", height: "5em", borderRadius: "1.2em", background: d ? "#f1f0ea" : "transparent", fontSize: "1em" }}
                        animate={{ backgroundColor: hit ? LIME : d ? "#f1f0ea" : "rgba(0,0,0,0)", scale: hit ? [1, 0.86, 1] : 1 }} transition={{ duration: 0.25 }}>
                        <span style={{ fontSize: "3.2em" }}>{d}</span>
                      </motion.span>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Phone>
      </motion.div>
      <At x={6} y={76} w={88}><Words words={["Scan", "karo"]} size={11} mark={0} delay={0.3} /></At>
    </>
  );
}

/** the route: your bank → NPCI → their bank, a dashed path draws and the coin rides it */
function ShotRoute() {
  const boxes: [string, number, string][] = [["Your bank", 2, "#fff"], ["NPCI", 37, LIME], ["Their bank", 72, "#fff"]];
  return (
    <>
      <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: "100em", height: "100em" }} viewBox="0 0 100 100">
        <motion.path d="M26 50 H37 M63 50 H74" fill="none" stroke={INK} strokeWidth="1.4" strokeDasharray="3 2.4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.8 }} />
      </svg>
      {boxes.map(([t, x, bg], i) => (
        <At key={t} x={x} y={36} w={26} h={28}>
          <motion.div className="h-full w-full" {...pop(0.08 + i * 0.12)}><Box bg={bg}><span className="text-center font-extrabold leading-none" style={{ fontSize: "5.6em", color: INK }}>{t}</span></Box></motion.div>
        </At>
      ))}
      <motion.div className="absolute" style={{ left: "6em", top: "10em" }} initial={{ x: "0em" }} animate={{ x: ["0em", "35em", "70em"] }} transition={{ delay: 0.6, duration: 1.3, ease: "easeInOut" }}>
        <motion.div animate={{ rotateY: [0, 720] }} transition={{ delay: 0.6, duration: 1.3 }}><Coin size={18} /></motion.div>
      </motion.div>
      <div className="absolute flex justify-center" style={{ left: 0, width: "100em", top: "67em", gap: "3em" }}>
        {["1 · Request", "2 · Debit", "3 · Credit"].map((t, i) => (
          <motion.span key={t} className="font-bold" style={{ fontSize: "3.6em", background: i === 1 ? LIME : "#fff", color: INK, border: `0.16em solid ${INK}`, borderRadius: "1em", padding: "0.15em 0.7em" }} {...pop(0.7 + i * 0.35)}>{t}</motion.span>
        ))}
      </div>
      <At x={6} y={80} w={88}><Words words={["Beech", "mein", "kaun?"]} size={8.5} mark={2} delay={0.4} /></At>
    </>
  );
}

/** NPCI, the switchboard: red strings pull four banks into the hub, which pulses */
function ShotHub() {
  const banks: [number, number][] = [[6, 8], [70, 8], [6, 70], [70, 70]];
  return (
    <>
      <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: "100em", height: "100em" }} viewBox="0 0 100 100">
        {banks.map(([x, y], i) => (
          <motion.line key={i} x1={x + 12} y1={y + 11} x2={50} y2={50} stroke={RED} strokeWidth="0.9" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }} />
        ))}
      </svg>
      {banks.map(([x, y], i) => (
        <At key={i} x={x} y={y} w={24} h={22}><motion.div className="h-full w-full" {...pop(i * 0.1)}><Box><span className="font-extrabold" style={{ fontSize: "5em", color: INK }}>Bank</span></Box></motion.div></At>
      ))}
      <At x={32} y={33} w={36} h={34}>
        <motion.span className="absolute inset-0 rounded-[3em]" style={{ border: `0.6em solid ${LIME}` }} animate={{ scale: [1, 1.35], opacity: [0.9, 0] }} transition={{ delay: 0.8, duration: 1, repeat: Infinity }} />
        <motion.div className="h-full w-full" initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }} transition={{ delay: 0.55, duration: 0.5 }}>
          <Box bg={LIME}><span className="font-extrabold tracking-[-0.03em]" style={{ fontSize: "9em", color: INK }}>NPCI</span></Box>
        </motion.div>
      </At>
      <At x={58} y={58} w={30} h={20} style={{ zIndex: 5 }}><Sticky r={6} delay={1.1} size={4.6}>the switchboard</Sticky></At>
    </>
  );
}

/** paid: the vendor's phone counts up to +₹10, confetti, a "Paid" pill slides in */
function ShotPaid() {
  const [v, setV] = useState(0);
  useEffect(() => { let n = 0; const t = setInterval(() => { n += 1; setV(n); if (n >= 10) clearInterval(t); }, 55); return () => clearInterval(t); }, []);
  return (
    <>
      <At x={33} y={6} w={34} h={66}>
        <Phone bg={LIME}>
          <div className="text-center" style={{ color: INK }}>
            <div className="font-extrabold tabular-nums tracking-[-0.04em]" style={{ fontSize: "11em", lineHeight: 1 }}>+₹{v}</div>
            <motion.div className="font-bold" style={{ fontSize: "4em" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>received</motion.div>
          </div>
        </Phone>
      </At>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2, d = 30 + (i % 3) * 8;
        return <motion.span key={i} className="absolute" style={{ left: "49em", top: "36em", width: "2.6em", height: "2.6em", borderRadius: i % 2 ? "50%" : "0.5em", background: [LIME, COIN, RED, INK][i % 4] }}
          initial={{ x: 0, y: 0, scale: 0 }} animate={{ x: `${Math.cos(a) * d}em`, y: `${Math.sin(a) * d}em`, scale: [0, 1.2, 0.8], rotate: 180 }} transition={{ delay: 0.6, duration: 0.9, ease: "easeOut" }} />;
      })}
      <motion.div className="absolute flex items-center font-extrabold" style={{ left: "50%", top: "78em", x: "-50%", gap: "1.2em", background: INK, color: "#fff", borderRadius: "10em", padding: "1.6em 4em" }}
        initial={{ y: "12em", opacity: 0 }} animate={{ y: "0em", opacity: 1 }} transition={{ delay: 0.75, type: "spring", stiffness: 300, damping: 18 }}>
        <span className="grid place-items-center rounded-full" style={{ width: "6em", height: "6em", background: LIME, color: INK, fontSize: "1em" }}><span style={{ fontSize: "4em" }}>✓</span></span>
        <span style={{ fontSize: "5.4em" }}>Paid</span>
      </motion.div>
    </>
  );
}

/** speed: a stopwatch ring draws and the counter stops at 0.8 s */
function ShotSpeed() {
  const [v, setV] = useState(0);
  useEffect(() => { let n = 0; const t = setInterval(() => { n += 1; setV(n); if (n >= 8) clearInterval(t); }, 110); return () => clearInterval(t); }, []);
  return (
    <>
      <At x={24} y={4} w={52} h={52}>
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
          <rect x="44" y="-6" width="12" height="9" rx="2" fill={INK} />
          <circle cx="50" cy="52" r="42" fill="#fff" stroke={INK} strokeWidth="5" />
          <motion.circle cx="50" cy="52" r="33" fill="none" stroke={LIME} strokeWidth="14" strokeLinecap="round" transform="rotate(-90 50 52)" initial={{ pathLength: 0 }} animate={{ pathLength: 0.8 }} transition={{ duration: 0.9, ease: "easeOut" }} />
          <text x="50" y="62" textAnchor="middle" fontWeight="800" fontSize="26" fill={INK} style={{ fontFamily: "inherit" }}>0.{v}s</text>
        </svg>
      </At>
      <At x={6} y={64} w={88}><Words words={["Under", "1", "second"]} size={10.5} mark={1} delay={0.5} /></At>
    </>
  );
}

/** safe: four PIN dots fill, the lock turns into a tick, a SAFE stamp slams down */
function ShotPin() {
  const dark = useContext(Dark), fg = dark ? "#ffffff" : INK;
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN((x) => Math.min(x + 1, 5)), 220); return () => clearInterval(t); }, []);
  const done = n >= 5;
  return (
    <>
      <At x={30} y={6} w={40} h={44}>
        <motion.div className="h-full w-full" animate={{ backgroundColor: done ? LIME : "#ffffff" }} style={{ border: `0.7em solid ${INK}`, borderRadius: "2.6em", boxShadow: `1.4em 1.4em 0 ${shade(dark)}`, display: "grid", placeItems: "center" }}>
          <svg viewBox="0 0 60 60" style={{ width: "22em", height: "22em" }}>
            <AnimatePresence mode="wait">
              {done ? (
                <motion.path key="tick" d="M14 32 L26 44 L47 18" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
              ) : (
                <motion.g key="lock" exit={{ scale: 0, opacity: 0 }}>
                  <motion.path d="M20 28 V20 a10 10 0 0 1 20 0 V28" fill="none" stroke={INK} strokeWidth="5" animate={{ y: n >= 4 ? 4 : 0 }} />
                  <rect x="13" y="27" width="34" height="26" rx="5" fill={INK} />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </motion.div>
      </At>
      <div className="absolute flex justify-center" style={{ left: 0, width: "100em", top: "60em", gap: "4em" }}>
        {[0, 1, 2, 3].map((i) => (
          <motion.span key={i} className="rounded-full" style={{ width: "7em", height: "7em", border: `0.7em solid ${fg}` }} animate={{ backgroundColor: i < n ? (dark ? LIME : INK) : "rgba(0,0,0,0)", scale: i === n - 1 ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.2 }} />
        ))}
      </div>
      <motion.div className="absolute font-extrabold" style={{ left: "60em", top: "76em", fontSize: "8em", color: RED, border: `0.12em solid ${RED}`, borderRadius: "0.18em", padding: "0 0.3em", lineHeight: 1.1, letterSpacing: "0.06em" }}
        initial={{ scale: 3, opacity: 0, rotate: -24 }} animate={done ? { scale: 1, opacity: 1, rotate: -12 } : { scale: 3, opacity: 0, rotate: -24 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
        SAFE
      </motion.div>
      <At x={4} y={76} w={46}><motion.div className="font-bold" style={{ fontSize: "4.6em", color: fg, lineHeight: 1.1 }} initial={{ opacity: 0, x: "-1em" }} animate={{ opacity: 1, x: "0em" }} transition={{ delay: 0.3 }}>PIN never leaves your phone</motion.div></At>
    </>
  );
}

/** recap: three sticky notes slap onto the board */
function ShotRecap() {
  const notes: [string, number, number, number, string][] = [["Scan", 4, 18, -6, STICKY], ["NPCI routes it", 36, 10, 4, LIME], ["Paid in 1 s", 68, 20, -3, "#ffd2b0"]];
  return (
    <>
      {notes.map(([t, x, y, r, bg], i) => <At key={t} x={x} y={y} w={28} h={28}><Sticky bg={bg} r={r} delay={i * 0.25} size={5.4}>{t}</Sticky></At>)}
      <At x={6} y={62} w={88}><Words words={["That's", "UPI."]} size={12} mark={1} delay={0.9} /></At>
    </>
  );
}

/* every shot gets its own ground, all in the theme: warm rays, dot paper, a tapri counter, a dark blueprint, ink with
   a lime glow, lime sunburst, yellow stripes, a dark vault, kraft board */
const g = (c: string, size: string) => ({ backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: `${size} ${size}` });
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

/** just a shot's background, for a card that has nothing drawn on it yet */
export function Ground({ shot }: { shot: ShotName }) {
  return <div className="absolute inset-0" style={{ containerType: "size" }}><div className="absolute inset-0" style={GROUND[shot].style} /></div>;
}

export const SHOTS = { hook: ShotHook, coin: ShotCoin, qr: ShotQR, route: ShotRoute, hub: ShotHub, paid: ShotPaid, speed: ShotSpeed, pin: ShotPin, recap: ShotRecap };
export type ShotName = keyof typeof SHOTS;

/* every cut uses a different move, like an edit, kept gentle: a short drift, a soft zoom or a small rise, each
   with a cross-fade, so the film flows instead of snapping */
const CUTS = [
  { initial: { x: "8%", opacity: 0 }, exit: { x: "-8%", opacity: 0 } }, // drift
  { initial: { scale: 1.06, opacity: 0 }, exit: { scale: 0.96, opacity: 0 } }, // soft zoom
  { initial: { y: "6%", opacity: 0 }, exit: { y: "-6%", opacity: 0 } }, // rise
];

/** plays shots one after another (a single shot replays), each with a slow camera drift; optional caption per shot */
/** shots that need longer than one beat */
const STRETCH: Partial<Record<ShotName, number>> = { qr: 1.15 };
export const filmSeconds = (shots: ShotName[], ms = 2700) => shots.reduce((t, s) => t + (ms * (STRETCH[s] ?? 1)) / 1000, 0);

export function Film({ shots, ms = 2700, captions, paper = true, style }: { shots: ShotName[]; ms?: number; captions?: string[]; paper?: boolean; style?: CSSProperties }) {
  // a film only plays while it is on screen; off screen it keeps just its background and stops every timer
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { margin: "120px" });
  const [k, setK] = useState(0);
  const cur = shots[k % shots.length];
  useEffect(() => {
    if (!seen) return;
    const t = setTimeout(() => setK((x) => x + 1), ms * Math.max(1, STRETCH[cur] ?? 1));
    return () => clearTimeout(t);
  }, [k, ms, cur, seen]);
  const i = k % shots.length, Shot = SHOTS[shots[i]], cut = CUTS[k % CUTS.length], ground = GROUND[shots[i]];
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" style={{ containerType: "size", background: paper ? PAPER : undefined,
      backgroundImage: paper ? `linear-gradient(rgb(31 28 27/0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(31 28 27/0.06) 1px, transparent 1px)` : undefined, backgroundSize: "7cqmin 7cqmin", ...style }}>
      <AnimatePresence initial={false}>
        <motion.div key={k} className="absolute inset-0" style={paper ? ground.style : undefined} initial={cut.initial} animate={{ x: "0%", y: "0%", scale: 1, opacity: 1 }} exit={cut.exit} transition={{ duration: 0.75, ease: [0.45, 0, 0.25, 1] }}>
          <motion.div className="absolute left-1/2" style={captions
              ? { top: "4cqmin", width: "78cqmin", height: "78cqmin", marginLeft: "-39cqmin", fontSize: "0.78cqmin" }
              : { top: "50%", width: "100cqmin", height: "100cqmin", marginLeft: "-50cqmin", marginTop: "-50cqmin", fontSize: "1cqmin" }}
            initial={{ scale: 1 }} animate={{ scale: 1.07 }} transition={{ duration: ms / 1000 + 0.5, ease: "linear" }}>
            <Dark.Provider value={paper && !!ground.dark}>{seen && <Shot />}</Dark.Provider>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      {captions && (
        <div className="absolute inset-x-0 flex justify-center" style={{ bottom: "6cqmin" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={i} className="font-bold" style={{ fontSize: "5cqmin", background: INK, color: "#fff", padding: "0.3em 0.8em", borderRadius: "0.4em" }}
              initial={{ opacity: 0, y: "0.4em" }} animate={{ opacity: 1, y: "0em" }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>{captions[i]}</motion.span>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
