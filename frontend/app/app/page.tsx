"use client";

import { ArrowRight, ArrowUp, Camera, ChevronRight, GraduationCap, Landmark, Loader2, Paperclip, PenLine, Smartphone, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { AppFrame, ease } from "@/components/app/kit";
import { LookStep, type Look } from "@/components/app/skill-chooser";
import { Film, Ground, type ShotName } from "@/components/landing/explainer";
import { useRouter } from "next/navigation";
import { post } from "@/lib/api";

/* Home: a calm chat. Empty, it shows the Drishyya eye (it blinks and glances), a greeting, four boxes that ask what
   kind of video to make, and the input pinned at the bottom. Once the creator asks, the page reads like an answer
   sheet: their prompt as a pill, "planned in N seconds", a strip of scene previews (real scenes when we have them,
   labelled storyboard sketches when we don't), a heading, and the ideas as cards to tap, always with a "your own"
   option. The planner is /api/brainstorm; without a backend it answers from a short scripted conversation. */

type Brief = { topic: string; minutes: number; language: string; tone: string; audience: string; kind?: string; subtype?: string; logline?: string; focus?: string; angle?: string; materials?: string };
type Answer = { reply: string; suggestions: string[]; brief: Brief; ready: boolean; step?: number; steps?: number };
type Turn = { ask: string; full: string; file?: string; answer?: Answer; secs?: number };

const KINDS = [
  { label: "Explainer", sub: "Concepts, how things work, finance commentary", icon: GraduationCap, bg: "#a6f04a", ink: "#1f1c1b" },
  { label: "Vlog", sub: "Travel, daily life, food, events", icon: Camera, bg: "#f6f39a", ink: "#1f1c1b" },
  { label: "History & documentary", sub: "A real story, told with sources", icon: Landmark, bg: "#1f1c1b", ink: "#a6f04a" },
  { label: "Shorts & reels", sub: "Informative, mind-blowing, unboxing, personal brand", icon: Smartphone, bg: "#ffd2b0", ink: "#1f1c1b" },
];
const OWN = /^(something else|your own)/i;

/** the scripted planner, used when the real one cannot be reached. Ideas are "Title – what it is". */
function mockAnswer(asks: string[]): Answer {
  const kind = KINDS.find((k) => asks[0]?.toLowerCase().includes(k.label.toLowerCase()));
  const rest = kind ? asks.slice(1) : asks;
  const all = asks.join(" ").toLowerCase();
  const mins = all.match(/(\d+)\s*min/)?.[1];
  const brief: Brief = {
    topic: rest[0] ?? "", minutes: mins ? Number(mins) : 0,
    language: /hinglish/.test(all) ? "Hinglish" : /hindi/.test(all) ? "Hindi" : /english/.test(all) ? "English" : "",
    tone: /friendly|conversational/.test(all) ? "Friendly" : /simple/.test(all) ? "Simple" : "", audience: /student/.test(all) ? "College students" : /shopkeeper/.test(all) ? "Shopkeepers" : "",
  };
  const topics: Record<string, string[]> = {
    Explainer: ["Explain UPI in 10 minutes – how money moves in one second", "Why do markets crash? – fear, bubbles and what history says", "Black holes for class 9 – simple, visual, no maths"],
    Vlog: ["My first solo trip – the plan, the mess, the moments", "A day at my chai stall – from 5 am to closing", "Cooking my mom's recipe – step by step, with the story"],
    "History & documentary": ["How Bombay became Mumbai – seven islands to one city", "The story of the Indian rupee – from coins to UPI", "Why the Mughal empire fell – three turning points"],
    "Shorts & reels": ["₹10 in one second – UPI in 60 seconds", "Three chai facts – the history in your cup", "One money myth, busted – fast and punchy"],
  };
  if (kind && rest.length === 0)
    return { reply: `${kind.label}: great. What should it be about?`, suggestions: [...topics[kind.label], "Something else – type your own topic below"], brief, ready: false };
  const n = rest.length;
  const steps: [string, string[]][] = [
    [`Three ways to tell "${rest[0]}"`, [
      "Start with a moment – one everyday scene that makes people ask: how does that work?",
      "Follow one thing through – trace it step by step, so every part has a picture.",
      "Myth vs fact – five things people believe, each one checked against a real source.",
      "Your own angle – tell me how you see it",
    ]],
    ["Who is it for, and how long should it run?", ["College students – 10 minutes, friendly", "Shopkeepers – 5 minutes, simple", "Everyone – a 60-second Short", "Something else – type who and how long"]],
    ["Which language and tone feel like you?", ["Hinglish – conversational, like talking to a friend", "Hindi – simple and clear", "English – crisp and quick", "Something else – tell me in your words"]],
    ["I have enough to plan it. Start the video when you're ready.", ["Start the video – plan, script, then you record", "Make it shorter – tighten to 6 minutes", "Add a quiz at the end – three quick questions"]],
  ];
  const [reply, suggestions] = steps[Math.min(n - 1, steps.length - 1)];
  return { reply, suggestions, brief, ready: n >= 4 };
}

/** the Drishyya eye, glossy: deep glass, a bright rim, a highlight across the top. It stays still; only the pupil
    glances left and right, and now and then the eye blinks. */
function Eye({ size = 220 }: { size?: number }) {
  const EYE = "M1.5 12C4.6 6.2 8.2 4 12 4s7.4 2.2 10.5 8c-3.1 5.8-6.7 8-10.5 8S4.6 17.8 1.5 12Z";
  return (
    <div className="relative" style={{ width: size, height: size * 0.72 }}>
      <div className="absolute left-[18%] right-[18%] top-[86%] h-[10%] rounded-[50%] bg-[#1f1c1b]/20 blur-lg" />
      <svg viewBox="1 3 22 18" className="h-full w-full overflow-visible" style={{ filter: "drop-shadow(0 10px 18px rgba(31,28,27,0.28))" }}>
        <defs>
          <linearGradient id="eye-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#57524d" /><stop offset="0.45" stopColor="#1f1c1b" /><stop offset="1" stopColor="#0b0a0a" /></linearGradient>
          <linearGradient id="eye-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.9" /><stop offset="0.5" stopColor="#ffffff" stopOpacity="0.08" /><stop offset="1" stopColor="#a6f04a" stopOpacity="0.55" /></linearGradient>
          <radialGradient id="iris" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#3a3633" /><stop offset="1" stopColor="#121110" /></radialGradient>
          <linearGradient id="pupil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0ffd6" /><stop offset="0.45" stopColor="#a6f04a" /><stop offset="1" stopColor="#5b9e22" /></linearGradient>
          <clipPath id="eye-clip"><path d={EYE} /></clipPath>
        </defs>
        <g transform="translate(12 12)"><g>
          <animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 0.1;1 1;1 1" keyTimes="0;0.86;0.9;0.94;1" dur="5.5s" repeatCount="indefinite" />
          <g transform="translate(-12 -12)">
            <path d={EYE} fill="url(#eye-body)" />
            <g clipPath="url(#eye-clip)">
              <g>
                <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0.9 0;0.9 0;-0.9 0;-0.9 0;0 0" keyTimes="0;0.2;0.3;0.48;0.58;0.78;1" dur="9s" repeatCount="indefinite" />
                <circle cx="12" cy="12" r="5.4" fill="url(#iris)" />
                <circle cx="12" cy="12" r="5.4" fill="none" stroke="#a6f04a" strokeOpacity="0.35" strokeWidth="0.35" />
                {/* the play button, nudged left so it looks centred (a triangle's weight sits on its flat side) */}
                <path d="M10.6 9 15 12 10.6 15Z" fill="url(#pupil)" stroke="url(#pupil)" strokeWidth="0.9" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 1.2px rgba(166,240,74,0.9))" }} />
                <ellipse cx="11.2" cy="10.4" rx="0.8" ry="0.45" fill="#fff" opacity="0.85" />
              </g>
              <ellipse cx="10.5" cy="6.6" rx="7.5" ry="2.4" fill="#fff" opacity="0.22" />
            </g>
            <path d={EYE} fill="none" stroke="url(#eye-rim)" strokeWidth="0.45" />
          </g>
        </g></g>
      </svg>
    </div>
  );
}

function Composer({ value, onChange, onSend, file, onFile, busy, inputRef }: { value: string; onChange: (v: string) => void; onSend: () => void; file: string; onFile: (f: string) => void; busy: boolean; inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const fi = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = inputRef.current; if (t) { t.style.height = "0px"; t.style.height = `${Math.min(t.scrollHeight, 150)}px`; } }, [value, inputRef]);
  return (
    <div className="rounded-[28px] bg-white/80 p-2.5 pl-5 shadow-[0_16px_40px_-24px_rgb(0_0_0/0.35)] ring-1 ring-white/80 transition-shadow focus-within:shadow-[0_18px_44px_-20px_rgb(63_125_30/0.35)] focus-within:ring-[#cfe9a8]">
      {file && <div className="mb-1.5 mt-1 flex w-fit items-center gap-2 rounded-full bg-[#f1f0ea] px-3 py-1 text-[13px] font-medium"><Paperclip className="size-3.5" />{file}<button type="button" onClick={() => onFile("")} aria-label="Remove file"><X className="size-3.5 text-[#8a857f]" /></button></div>}
      <div className="flex items-center gap-2">
        <textarea ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Ask anything…"
          className="min-w-0 flex-1 resize-none border-0 bg-transparent py-2 text-[16.5px] leading-snug text-[#1f1c1b] outline-none placeholder:text-[#9b968f]" />
        <input ref={fi} type="file" className="hidden" accept=".pdf,.txt,.md,.docx,audio/*,video/*" onChange={(e) => onFile(e.target.files?.[0]?.name ?? "")} />
        <button type="button" onClick={() => fi.current?.click()} aria-label="Attach notes, audio or video" className="grid size-10 shrink-0 place-items-center rounded-full text-[#5f5b57] hover:bg-black/[0.05]"><Paperclip className="size-[18px]" /></button>
        <motion.button type="button" onClick={onSend} disabled={!value.trim() || busy} aria-label="Send" whileTap={{ scale: 0.92 }}
          className="grid h-10 w-14 shrink-0 place-items-center rounded-full disabled:opacity-45" style={{ background: "linear-gradient(135deg, #d9fbab, #a6f04a)", boxShadow: "inset 0 0 0 1px rgba(31,28,27,0.08)" }}>
          <ArrowUp className="size-[18px] text-[#1f1c1b]" strokeWidth={2.6} />
        </motion.button>
      </div>
    </div>
  );
}

/** the strip under "planned in N seconds": real scenes for the UPI demo; for anything else, labelled storyboard
    sketches that say what each scene will be, because nothing has been drawn yet */
function Previews({ topic, ideas }: { topic: string; ideas: string[] }) {
  const upi = /upi|₹10|payment/i.test(topic);
  const shots: ShotName[] = ["hook", "qr", "route", "hub"];
  const sketches: ShotName[] = ["coin", "recap", "speed"];
  const labels = ideas.filter((s) => !OWN.test(s)).map((s) => s.split(" – ")[0]);
  return (
    <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {(upi ? shots : labels.slice(0, 3)).map((x, j) => (
        <motion.div key={j} initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.08 * j, duration: 0.5, ease }}
          className="relative h-[150px] w-[190px] shrink-0 overflow-hidden rounded-[20px] shadow-[0_12px_28px_-18px_rgb(0_0_0/0.45)]">
          {upi ? <Film shots={[x as ShotName]} ms={3200 + j * 300} /> : (
            <>
              <Ground shot={sketches[j]} />
              <div className="absolute inset-0 flex flex-col justify-between p-3.5">
                <span className="w-fit rounded-full bg-white/85 px-2 py-0.5 font-mono text-[11px] font-semibold">SKETCH {j + 1}</span>
                <div className="space-y-1.5">{[80, 62, 70].map((w, k) => <span key={k} className="block h-1.5 rounded-full bg-[#1f1c1b]/15" style={{ width: `${w}%` }} />)}</div>
                <span className="text-[15px] font-bold leading-tight text-[#1f1c1b]">{x}</span>
              </div>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default function AppHome() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [skills, setSkills] = useState<{ moments: string[]; look: Look } | null>(null); // the "How should it look?" step
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, busy]);

  const last = [...turns].reverse().find((t) => t.answer)?.answer;
  const topicTurn = turns.find((t) => !KINDS.some((k) => t.ask.toLowerCase().includes(k.label.toLowerCase())));
  const startHref = `/app/v/new?${new URLSearchParams({ topic: last?.brief.topic || topicTurn?.ask || "My video" }).toString()}`;
  const started = turns.length > 0;

  const send = async (raw: string) => {
    const ask = raw.split(" – ")[0].trim(), full = raw.trim();
    if (!ask || busy) return;
    const t0 = performance.now();
    const next = [...turns, { ask, full, file: file || undefined }];
    setTurns(next); setDraft(""); setFile(""); setBusy(true);
    const messages = next.flatMap((t) => [{ role: "user", text: t.file ? `${t.full}\nAttached: ${t.file}` : t.full }, ...(t.answer ? [{ role: "assistant", text: t.answer.reply }] : [])]);
    let a: Answer;
    try { a = await post<Answer>("/brainstorm", { messages }); }
    catch { await new Promise((r) => setTimeout(r, 1100)); a = mockAnswer(next.map((t) => t.ask)); }
    if (!a.ready && !a.suggestions.some((s) => OWN.test(s))) a = { ...a, suggestions: [...a.suggestions, "Something else – type it in your own words"] };
    const secs = Math.max(1, Math.round((performance.now() - t0) / 1000));
    setTurns(next.map((t, i) => (i === next.length - 1 ? { ...t, answer: a, secs } : t)));
    setBusy(false);
  };
  /** a finished brief starts a real film (the research-first pipeline); without a backend, the prototype pipeline */
  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const r = await post<{ id: number }>("/brainstorm/start", { brief: { ...last?.brief, topic: last?.brief.topic || topicTurn?.ask || "" }, skills: skills ?? {} });
      router.push(`/app/v/${r.id}`);
    } catch { router.push(startHref); }
  };
  const pick = (s: string, head: string) => {
    if (/^start the video/i.test(head)) { start(); return; }
    if (OWN.test(head)) { inputRef.current?.focus(); return; }
    send(s);
  };

  return (
    <AppFrame bleed>
      <div className="relative flex min-h-dvh flex-col" style={{ background: "linear-gradient(180deg, #e4ecdc 0%, #eef1e8 38%, #f3f3f0 100%)" }}>
        <div className="mx-auto flex w-full max-w-[780px] flex-1 flex-col px-5">
          <AnimatePresence mode="wait">
            {!started ? (
              /* ---------- empty: the eye, a greeting, and what kind of video ---------- */
              <motion.div key="hello" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="flex flex-1 flex-col items-center justify-center pb-6 pt-12 text-center">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }}><Eye /></motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease }} className="mt-7">
                  <div className="font-serif text-[28px] font-light leading-tight text-[#3d3935] sm:text-[34px]">Hey there,</div>
                  <div className="text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">what kind of video shall we make?</div>
                </motion.div>
                <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                  {KINDS.map((k, i) => (
                    <motion.button key={k.label} type="button" onClick={() => send(`I want to make: ${k.label}`)}
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.07, duration: 0.5, ease }} whileHover={{ y: -4 }}
                      className="group flex flex-col rounded-[20px] bg-white/80 p-4 text-left shadow-[0_12px_28px_-22px_rgb(0_0_0/0.45)] ring-1 ring-white transition-colors hover:bg-white hover:ring-[#cfe9a8]">
                      <span className="flex items-center justify-between">
                        <span className="grid size-10 place-items-center rounded-[13px]" style={{ background: k.bg }}><k.icon className="size-5" style={{ color: k.ink }} /></span>
                        <ChevronRight className="size-4 text-[#b5b0a8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1f1c1b]" />
                      </span>
                      <span className="mt-3 text-[15.5px] font-semibold leading-tight">{k.label}</span>
                      <span className="mt-0.5 text-[12.5px] leading-snug text-[#8a857f]">{k.sub}</span>
                    </motion.button>
                  ))}
                </div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-4 text-[13.5px] text-[#8a857f]">Or just type your idea below.</motion.p>
              </motion.div>
            ) : (
              /* ---------- the answer sheet ---------- */
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex-1 space-y-12 pb-8 pt-10">
                {turns.map((t, i) => {
                  const live = i === turns.length - 1 && !busy;
                  const showStrip = !!t.answer && (t.answer.ready || /three ways/i.test(t.answer.reply));
                  return (
                    <section key={i}>
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
                        className="ml-auto flex w-fit max-w-full items-center gap-2.5 rounded-full bg-white/70 py-2 pl-2 pr-5 text-[15px] font-medium ring-1 ring-white">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white"><img src="/icon.svg" alt="" className="size-[18px]" /></span>
                        <span className="truncate">{t.ask}</span>{t.file && <span className="flex items-center gap-1 text-[13px] text-[#8a857f]"><Paperclip className="size-3.5" />{t.file}</span>}
                      </motion.div>
                      {!t.answer ? (
                        <div className="mt-6 flex items-center gap-2 text-[14px] text-[#8a857f]"><Loader2 className="size-4 animate-spin" />Thinking it through…</div>
                      ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                          <div className="mt-6 flex flex-wrap items-center gap-2 text-[13.5px] text-[#8a857f]"><span className="size-3.5 rounded-full border-2 border-dashed border-[#9bbf6a]" />Planned in {t.secs} second{t.secs === 1 ? "" : "s"}
                            {!!t.answer.steps && !t.answer.ready && <span className="ml-1 flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 font-semibold text-[#1f1c1b] ring-1 ring-white">
                              {Array.from({ length: t.answer.steps }, (_, k) => <span key={k} className="size-1.5 rounded-full" style={{ background: k < (t.answer!.step ?? 0) ? "#5b9e22" : "#d9d8d0" }} />)}
                              Question {Math.min((t.answer.step ?? 0) + 1, t.answer.steps)} of {t.answer.steps}</span>}
                          </div>
                          {showStrip && <Previews topic={t.answer.brief.topic || topicTurn?.ask || t.ask} ideas={t.answer.ready ? ["The hook", t.answer.brief.focus || "The core idea", t.answer.brief.angle || "The recap"] : t.answer.suggestions} />}
                          <h2 className="mt-6 text-[25px] font-semibold leading-tight tracking-[-0.02em]">{t.answer.reply}</h2>
                          {live && <p className="mt-1 text-[14px] text-[#8a857f]">Pick one, or write your own.</p>}
                          <ol className="mt-4 space-y-2.5">
                            {t.answer.suggestions.map((s, j) => {
                              const [head, rest] = s.includes(" – ") ? s.split(" – ") : [s, ""];
                              const own = OWN.test(head);
                              return (
                                <motion.li key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + j * 0.07 }}>
                                  <button type="button" disabled={!live} onClick={() => pick(s, head)}
                                    className={`group flex w-full items-center gap-3.5 rounded-[18px] px-4 py-3 text-left transition-all ${own ? "border-2 border-dashed border-[#cfcdc4] bg-transparent" : "bg-white/85 shadow-[0_10px_24px_-20px_rgb(0_0_0/0.45)] ring-1 ring-white"} ${live ? "hover:-translate-y-0.5 hover:bg-white hover:ring-[#cfe9a8]" : "opacity-60"}`}>
                                    <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold ${own ? "bg-[#ecebe5]" : "bg-[#a6f04a]"}`}>{own ? <PenLine className="size-4" /> : j + 1}</span>
                                    <span className="min-w-0 flex-1 text-[15.5px] leading-snug text-[#5f5b57]"><b className="font-semibold text-[#1f1c1b]">{head}</b>{rest && <> – {rest}</>}</span>
                                    {live && <ChevronRight className="size-5 shrink-0 text-[#b5b0a8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1f1c1b]" />}
                                  </button>
                                </motion.li>
                              );
                            })}
                          </ol>
                          {i === turns.length - 1 && t.answer.ready && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.45, ease }}
                              className="mt-5 rounded-[22px] bg-white/85 p-5 ring-1 ring-white">
                              <div className="text-[19px] font-bold">How should it look?</div>
                              <div className="mb-4 text-[14px] text-[#5f5b57]">Your look, ready to change for this video. Change anything later in the scene plan.</div>
                              <LookStep onChange={setSkills} />
                            </motion.div>
                          )}
                          {i === turns.length - 1 && t.answer.ready && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.45, ease }}
                              className="mt-5 flex flex-wrap items-center gap-4 rounded-[22px] bg-white/85 p-4 ring-1 ring-white">
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-semibold text-[#8a857f]">Ready when you are</div>
                                <div className="truncate text-[18px] font-semibold">{t.answer.brief.topic || topicTurn?.ask}</div>
                                {t.answer.brief.logline && <div className="text-[14.5px] italic text-[#3d3935]">“{t.answer.brief.logline}”</div>}
                                <div className="text-[14px] text-[#5f5b57]">{[t.answer.brief.minutes ? `${t.answer.brief.minutes} min` : "", t.answer.brief.language, t.answer.brief.tone, t.answer.brief.audience].filter(Boolean).join(" · ") || "We'll fill in the rest as we plan"}</div>
                              </div>
                              <button type="button" onClick={start} disabled={starting} className="flex items-center gap-2 rounded-full bg-[#1f1c1b] px-5 py-2.5 text-[15px] font-semibold text-white hover:-translate-y-px disabled:opacity-60">{starting ? <><Loader2 className="size-4 animate-spin" />Starting…</> : <>Start the video <ArrowRight className="size-4 text-[#a6f04a]" /></>}</button>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </section>
                  );
                })}
                <div ref={endRef} />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="sticky bottom-0 pb-6 pt-3" style={{ background: "linear-gradient(180deg, rgba(243,243,240,0), #f3f3f0 40%)" }}>
            <Composer value={draft} onChange={setDraft} onSend={() => send(draft)} file={file} onFile={setFile} busy={busy} inputRef={inputRef} />
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
