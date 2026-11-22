"use client";

import { ArrowRight, Check, FileText, Globe, IndianRupee, Link2, Lock, Mic, MessageSquare, Pause, Play, Search, Sparkles, Upload, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { AppFrame, Card, Chip, DarkButton, LIME, LIME_TEXT, LimeButton, Mark, ease } from "@/components/app/kit";
import { Editor } from "@/components/app/editor";
import { LiveWorkspace } from "@/components/app/live";
import { useParams } from "next/navigation";
import { Film, type ShotName } from "@/components/landing/explainer";

/* One video's workspace: the pipeline runs one stage at a time and never skips ahead. Plan (the planning agent at
   work, then the plan to approve) → Script (pick one of three) → Voice (record off the teleprompter, upload, or an AI
   voice) → Edit (the agent cuts and adds visuals, then the full editor) → Review (approve or comment on every scene)
   → Publish (the video and three Shorts, ₹199 by UPI). Prototype on sample data. */

const STAGES = ["Plan", "Script", "Voice", "Edit", "Review", "Publish"] as const;
const SCENES: ShotName[] = ["hook", "qr", "route", "hub", "paid", "pin"];

/** lines that appear one after another, like an agent working; calls onDone after the last one */
function AgentLog({ lines, onDone, step = 750 }: { lines: [ReactNode, string][]; onDone: () => void; step?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= lines.length) { const t = setTimeout(onDone, 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setN(n + 1), step);
    return () => clearTimeout(t);
  }, [n, lines.length, onDone, step]);
  return (
    <div className="space-y-2.5">
      {lines.slice(0, n + 1).map(([icon, text], i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease }} className="flex items-center gap-3">
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${i < n ? "bg-[#a6f04a]" : "bg-[#1f1c1b] text-[#a6f04a]"}`}>{i < n ? <Check className="size-4" strokeWidth={3} /> : icon}</span>
          <span className={`text-[16px] ${i < n ? "text-[#5f5b57]" : "font-semibold"}`}>{text}</span>
          {i === n && <motion.span className="ml-1 flex gap-1">{[0, 1, 2].map((d) => <motion.span key={d} className="size-1.5 rounded-full bg-[#1f1c1b]" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }} />)}</motion.span>}
        </motion.div>
      ))}
    </div>
  );
}

function Stepper({ stage }: { stage: number }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STAGES.map((s, i) => (
        <div key={s} className="flex shrink-0 items-center gap-1.5">
          <span className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${i === stage ? "bg-[#1f1c1b] text-white" : i < stage ? "bg-[#a6f04a]/45 text-[#2f5a12]" : "bg-white text-[#a8a39c] ring-1 ring-[#e6e6df]"}`}>
            {i < stage ? <Check className="size-3.5" strokeWidth={3} /> : i > stage ? <Lock className="size-3.5" /> : <span className="size-2 rounded-full bg-[#a6f04a]" />}{s}
          </span>
          {i < STAGES.length - 1 && <span className={`h-0.5 w-5 rounded-full ${i < stage ? "bg-[#a6f04a]" : "bg-[#e2e1da]"}`} />}
        </div>
      ))}
    </div>
  );
}

/* ---------- 1. plan ---------- */
function PlanStage({ next }: { next: () => void }) {
  const [done, setDone] = useState(false);
  const rows = [["0:00", "The hook", "A ₹10 chai, paid in one second"], ["0:45", "How money moves", "Phone → your bank → NPCI → their bank"], ["4:10", "Why it's safe", "PIN, limits, what can go wrong"], ["8:30", "Recap", "Three things to remember"]];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <Card className="p-6">
        <div className="flex items-center gap-3"><Mark /><div><div className="text-[18px] font-bold">Planning agent</div><div className="text-[13.5px] text-[#8a857f]">Reads, researches, then lays the video out</div></div></div>
        <div className="mt-5">
          <AgentLog onDone={() => setDone(true)} lines={[
            [<FileText key="f" className="size-4" />, "Reading your notes (notes.pdf, 6 pages)"],
            [<Search key="s" className="size-4" />, "Searching 12 sources: npci.org.in, rbi.org.in…"],
            [<Check key="c" className="size-4" />, "18 facts verified, each with its source"],
            [<Sparkles key="w" className="size-4" />, "Finding the hook and the story arc"],
            [<Wand2 key="p" className="size-4" />, "Laying out 10 minutes, scene by scene"],
          ]} />
        </div>
      </Card>
      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <Card className="p-6">
              <div className="flex items-center justify-between"><div className="text-[22px] font-bold">The plan</div><Chip tone="lime">10 min · Hinglish · friendly</Chip></div>
              <div className="relative mt-5 space-y-3">
                <span className="absolute bottom-3 left-[13px] top-3 w-0.5 bg-[#e2e1da]" />
                {rows.map(([tm, h, d], i) => (
                  <motion.div key={tm} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12 }} className="relative flex items-center gap-4">
                    <span className="relative z-10 grid size-7 place-items-center rounded-full bg-[#1f1c1b]"><span className="size-2.5 rounded-full bg-[#a6f04a]" /></span>
                    <div className="flex flex-1 items-center gap-4 rounded-[16px] border border-[#e6e6df] bg-[#fafaf7] px-4 py-3">
                      <span className="w-10 font-mono text-[13px] text-[#8a857f]">{tm}</span>
                      <span><span className="block text-[16px] font-semibold">{h}</span><span className="block text-[13.5px] text-[#8a857f]">{d}</span></span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2"><DarkButton onClick={next}>Approve plan <ArrowRight className="size-4 text-[#a6f04a]" /></DarkButton><button type="button" className="rounded-full px-4 py-2.5 text-[15px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]">Change something</button></div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- 2. script ---------- */
function ScriptStage({ next }: { next: () => void }) {
  const [pick, setPick] = useState(0);
  const opts = [
    { name: "Story-led", tag: "Recommended", lines: ["Ek chai ke ₹10. Aapne QR scan kiya,", "aur paisa ek second mein pahunch gaya.", "Par beech mein hua kya? Chaliye dekhte hain."] },
    { name: "Straight explainer", tag: "Clear", lines: ["UPI ka matlab hai Unified Payments Interface.", "Ek app se, kisi bhi bank account mein,", "turant paisa bhej sakte ho. Kaise? Dekhiye."] },
    { name: "Fast and punchy", tag: "For Shorts", lines: ["1 second. ₹10. Zero cash.", "Ye hai UPI ka jaadu.", "Aur iske peeche ek switchboard hai."] },
  ];
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {opts.map((o, i) => (
          <motion.button key={o.name} type="button" onClick={() => setPick(i)} whileHover={{ y: -4 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.5, ease }}
            className={`rounded-[22px] border-2 bg-white p-5 text-left transition-shadow ${pick === i ? "border-[#1f1c1b] shadow-[5px_5px_0_#a6f04a]" : "border-[#e6e6df]"}`}>
            <div className="flex items-center justify-between"><span className="text-[19px] font-bold">{o.name}</span><Chip tone={i === 0 ? "lime" : "plain"}>{o.tag}</Chip></div>
            <div className="mt-1 font-mono text-[12px] tracking-[0.1em] text-[#8a857f]">SCENE 1 · THE HOOK</div>
            <div className="mt-3 space-y-2">{o.lines.map((l) => <p key={l} className="text-[15.5px] font-semibold leading-snug">{l}</p>)}</div>
            <div className="mt-4 flex flex-wrap gap-1.5">{["PHOTO", "COUNTER", "DIAGRAM"].map((v) => <span key={v} className="rounded-full bg-[#1f1c1b] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#a6f04a]">[{v}]</span>)}</div>
            <div className="mt-4 text-[13px] text-[#8a857f]">{["~10 min · 1,480 words", "~9 min · 1,350 words", "~6 min · 900 words"][i]}</div>
          </motion.button>
        ))}
      </div>
      <div className="mt-6 flex gap-2"><DarkButton onClick={next}>Use the {opts[pick].name.toLowerCase()} script <ArrowRight className="size-4 text-[#a6f04a]" /></DarkButton></div>
    </div>
  );
}

/* ---------- 3. voice ---------- */
function VoiceStage({ next }: { next: () => void }) {
  const [mode, setMode] = useState(0);
  const [rec, setRec] = useState<"idle" | "on" | "done">("idle");
  const [s, setS] = useState(0);
  const [voice, setVoice] = useState("Aditi · warm");
  const lines = ["Ek chai ke ₹10.", "Aapne QR scan kiya,", "aur paisa pahunch gaya.", "Par beech mein hua kya?", "Chaliye dekhte hain."];
  useEffect(() => { if (rec !== "on") return; const t = setInterval(() => setS((x) => x + 1), 1000); return () => clearInterval(t); }, [rec]);
  const k = Math.min(Math.floor(s / 1.2), lines.length - 1);
  const ready = (mode === 0 && rec === "done") || mode > 0;
  const opts = [{ t: "Record yourself", d: "Read it off the teleprompter", i: Mic }, { t: "Upload audio", d: "A take you already have", i: Upload }, { t: "AI voice", d: "Optional · pick a voice", i: Sparkles }];
  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        {opts.map((o, i) => (
          <button key={o.t} type="button" onClick={() => setMode(i)} className={`flex w-full items-center gap-3 rounded-[18px] border-2 bg-white p-4 text-left ${mode === i ? "border-[#1f1c1b] shadow-[4px_4px_0_#a6f04a]" : "border-[#e6e6df]"}`}>
            <span className="grid size-10 place-items-center rounded-[12px]" style={{ background: i === 0 ? "#1f1c1b" : i === 1 ? "#f6f39a" : LIME }}><o.i className="size-5" style={{ color: i === 0 ? LIME : "#1f1c1b" }} /></span>
            <span><span className="block text-[16px] font-semibold">{o.t}</span><span className="block text-[13px] text-[#8a857f]">{o.d}</span></span>
            {i === 0 && <span className="ml-auto"><Chip tone="ink">Default</Chip></span>}
          </button>
        ))}
      </div>
      <Card className="relative min-h-[360px] overflow-hidden p-6">
        {mode === 0 && (
          <div className="flex h-full flex-col items-center">
            <span className="flex items-center gap-2 rounded-full bg-[#1f1c1b] px-3 py-1 text-[13px] font-semibold text-white">
              <motion.span className="size-2 rounded-full bg-[#e8402c]" animate={rec === "on" ? { opacity: [1, 0.2, 1] } : { opacity: 0.4 }} transition={{ repeat: Infinity, duration: 1 }} />
              {rec === "done" ? `Recorded 0:${String(s).padStart(2, "0")}` : `REC 0:${String(s).padStart(2, "0")}`}
            </span>
            <div className="relative mt-4 h-[190px] w-full overflow-hidden rounded-[18px] bg-[#1f1c1b]">
              <div className="absolute inset-0" style={{ maskImage: "linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)" }}>
                <motion.div className="absolute inset-x-0 flex flex-col items-center gap-2" style={{ top: 72 }} animate={{ y: rec === "idle" ? 0 : -k * 40 }} transition={{ duration: 0.5, ease }}>
                  {lines.map((l, j) => <span key={l} className="text-[24px] font-semibold" style={{ color: rec !== "idle" && j === k ? LIME : "rgba(255,255,255,0.45)" }}>{l}</span>)}
                </motion.div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              {rec !== "on" ? <button type="button" onClick={() => { setS(0); setRec("on"); }} className="flex items-center gap-2 rounded-full bg-[#e8402c] px-5 py-2.5 text-[15px] font-semibold text-white"><span className="size-2.5 rounded-full bg-white" />{rec === "done" ? "Record again" : "Start recording"}</button>
                : <button type="button" onClick={() => setRec("done")} className="flex items-center gap-2 rounded-full bg-[#1f1c1b] px-5 py-2.5 text-[15px] font-semibold text-white"><Pause className="size-4" />Stop</button>}
              <span className="text-[13.5px] text-[#8a857f]">The script scrolls as you speak. Retakes are fine, we cut them.</span>
            </div>
          </div>
        )}
        {mode === 1 && (
          <div className="grid h-full min-h-[300px] place-items-center rounded-[18px] border-2 border-dashed border-[#d9d8d0] bg-[#fafaf7] text-center">
            <div><Upload className="mx-auto size-8 text-[#5f5b57]" /><div className="mt-2 text-[18px] font-bold">Drop your audio or video here</div><div className="text-[14px] text-[#8a857f]">mp3, wav, m4a, mp4 · up to 1 hour</div><div className="mt-3"><Chip tone="lime">take-01.m4a · 9:42 · added</Chip></div></div>
          </div>
        )}
        {mode === 2 && (
          <div>
            <div className="text-[18px] font-bold">Pick a voice</div><div className="text-[14px] text-[#8a857f]">An AI voice reads your script. Your own voice stays the default.</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Aditi · warm", "Kabir · calm", "Meera · bright", "Arjun · deep"].map((v) => (
                <button key={v} type="button" onClick={() => setVoice(v)} className={`flex items-center gap-3 rounded-[16px] border-2 p-3 text-left ${voice === v ? "border-[#1f1c1b] bg-[#f1fbe3]" : "border-[#e6e6df] bg-white"}`}>
                  <span className="grid size-9 place-items-center rounded-full bg-[#1f1c1b]"><Play className="size-4 text-[#a6f04a]" /></span>
                  <span className="text-[15px] font-semibold">{v}</span>
                  <span className="ml-auto flex h-5 items-center gap-[2px]">{Array.from({ length: 10 }, (_, j) => <span key={j} className="w-[3px] rounded-full bg-[#1f1c1b]" style={{ height: `${30 + ((j * 37) % 70)}%` }} />)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
      <div className="lg:col-start-2"><DarkButton onClick={next} disabled={!ready}>Continue to editing <ArrowRight className="size-4 text-[#a6f04a]" /></DarkButton></div>
    </div>
  );
}

/* ---------- 4. edit: the agent works first, then the editor opens ---------- */
function EditStage({ title, next, back }: { title: string; next: () => void; back: () => void }) {
  const [open, setOpen] = useState(false);
  if (open) return <div className="fixed inset-0 z-50" style={{ fontFamily: "var(--font-baloo), system-ui, sans-serif" }}><Editor title={title} onBack={() => setOpen(false)} onDone={next} /></div>;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <Card className="p-6">
        <div className="flex items-center gap-3"><Mark /><div><div className="text-[18px] font-bold">Editing agent</div><div className="text-[13.5px] text-[#8a857f]">Cuts your take, then builds every scene</div></div></div>
        <div className="mt-5">
          <AgentLog step={850} onDone={() => {}} lines={[
            [<Mic key="a" className="size-4" />, "Clean cut: 2:14 of silences, ums and retakes removed"],
            [<Wand2 key="b" className="size-4" />, "18 visuals: boxes, sticky notes, the coin, the QR"],
            [<FileText key="c" className="size-4" />, "Captions timed word by word"],
            [<Sparkles key="d" className="size-4" />, "Music under your voice, sound on every pop"],
            [<Check key="e" className="size-4" />, "First cut ready: 9:46"],
          ]} />
        </div>
      </Card>
      <Card className="overflow-hidden p-3">
        <div className="relative aspect-video overflow-hidden rounded-[16px]"><Film shots={["hook", "coin", "qr", "route", "hub", "paid"]} /></div>
        <div className="flex items-center justify-between p-3">
          <div><div className="text-[17px] font-bold">First cut</div><div className="text-[13.5px] text-[#8a857f]">Open the editor to change anything, scene by scene</div></div>
          <LimeButton onClick={() => setOpen(true)}>Open editor</LimeButton>
        </div>
      </Card>
      <div className="flex gap-2 lg:col-span-2"><DarkButton onClick={next}>Looks good, send to review <ArrowRight className="size-4 text-[#a6f04a]" /></DarkButton><button type="button" onClick={back} className="rounded-full px-4 py-2.5 text-[15px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]">Back to voice</button></div>
    </div>
  );
}

/* ---------- 5. review ---------- */
function ReviewStage({ next, edit }: { next: () => void; edit: () => void }) {
  const [ok, setOk] = useState<boolean[]>(SCENES.map(() => false));
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const all = ok.every(Boolean);
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENES.map((s, i) => (
          <Card key={s} className={`overflow-hidden p-2 ${ok[i] ? "ring-2 ring-[#a6f04a]" : ""}`}>
            <div className="relative aspect-video overflow-hidden rounded-[14px]"><Film shots={[s]} ms={3000 + i * 200} /><span className="absolute left-2 top-2 z-10 rounded-full bg-white/90 px-2 font-mono text-[12px] font-semibold">{String(i + 1).padStart(2, "0")}</span></div>
            {notes[i] && <div className="mx-1 mt-2 rounded-[12px] bg-[#fff4e0] px-3 py-1.5 text-[13px] text-[#9a5a12]">Change asked: {notes[i]}</div>}
            {open === i && (
              <div className="mx-1 mt-2 flex gap-2">
                <input autoFocus placeholder="What should change?" className="min-w-0 flex-1 rounded-full border border-[#e2e1da] px-3 py-1.5 text-[14px] outline-none"
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) setNotes({ ...notes, [i]: v }); setOpen(null); } }} />
              </div>
            )}
            <div className="flex items-center gap-2 p-2">
              <button type="button" onClick={() => setOk(ok.map((x, j) => (j === i ? !x : x)))} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${ok[i] ? "bg-[#a6f04a]" : "bg-[#1f1c1b] text-white"}`}><Check className="size-4" />{ok[i] ? "Approved" : "Approve"}</button>
              <button type="button" onClick={() => setOpen(i)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]"><MessageSquare className="size-4" />Comment</button>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-[16px]"><b className="text-[24px]">{ok.filter(Boolean).length}</b> of {SCENES.length} scenes approved</span>
        <button type="button" onClick={() => setOk(SCENES.map(() => true))} className="rounded-full px-4 py-2 text-[15px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]">Approve all</button>
        <button type="button" onClick={edit} className="rounded-full px-4 py-2 text-[15px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]">Fix it myself in the editor</button>
        <span className="ml-auto"><DarkButton onClick={next} disabled={!all}>{Object.keys(notes).length ? "Send changes, then publish" : "Publish"} <ArrowRight className="size-4 text-[#a6f04a]" /></DarkButton></span>
      </div>
    </div>
  );
}

/* ---------- 6. publish ---------- */
function PublishStage({ title }: { title: string }) {
  const [paid, setPaid] = useState(false);
  const [where, setWhere] = useState<string[]>(["YouTube", "Shorts"]);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <Card className="overflow-hidden p-3">
        <div className="relative aspect-video overflow-hidden rounded-[16px]"><Film shots={["hook", "coin", "qr", "route", "hub", "paid", "speed", "pin", "recap"]} captions={["Ek chai ke ₹10.", "Aap pay karte ho,", "QR scan kiya,", "paisa aapke bank se nikla,", "NPCI ne raasta dikhaya,", "aur vendor ko mil gaya.", "Sab ek second mein.", "PIN? Sirf aapke phone mein.", "Yahi hai UPI."]} /></div>
        <div className="mt-3 grid grid-cols-3 gap-3 px-1 pb-1">
          {([["hook", "coin", "speed"], ["route", "hub", "paid"], ["qr", "pin", "recap"]] as ShotName[][]).map((s, i) => (
            <div key={i}><div className="relative aspect-[9/16] overflow-hidden rounded-[14px]"><Film shots={s} ms={2800 + i * 200} /></div><div className="mt-1 text-center text-[13px] font-semibold text-[#5f5b57]">Short {i + 1} · 9:16</div></div>
          ))}
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <div className="text-[13px] font-semibold text-[#8a857f]">Title</div>
          <div className="mt-1 rounded-[14px] border border-[#e2e1da] px-3 py-2 text-[16px] font-semibold">{title} | ₹10 ki chai se samjho</div>
          <div className="mt-3 text-[13px] font-semibold text-[#8a857f]">Description</div>
          <div className="mt-1 rounded-[14px] border border-[#e2e1da] px-3 py-2 text-[14px] leading-relaxed text-[#5f5b57]">UPI kaise kaam karta hai? Ek chai ke ₹10 se samjhiye: QR, banks, NPCI aur PIN. Sources in the pinned comment.</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[["YouTube", Play], ["Shorts", Play], ["Instagram", Globe], ["Download", Link2]].map(([w, I]: any) => (
              <button key={w} type="button" onClick={() => setWhere(where.includes(w) ? where.filter((x) => x !== w) : [...where, w])}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${where.includes(w) ? "bg-[#1f1c1b] text-white" : "bg-[#f1f0ea] text-[#5f5b57]"}`}><I className="size-3.5" />{w}</button>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <AnimatePresence mode="wait">
            {paid ? (
              <motion.div key="paid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#a6f04a]"><Check className="size-7" strokeWidth={3} /></span>
                <div className="mt-3 text-[22px] font-bold">Published</div>
                <div className="text-[14px] text-[#8a857f]">Going out to {where.join(", ")}. Every version is saved.</div>
              </motion.div>
            ) : (
              <motion.div key="pay" exit={{ opacity: 0 }}>
                <div className="flex items-baseline justify-between"><span className="text-[18px] font-bold">This video</span><span className="text-[30px] font-bold tracking-[-0.03em]">₹199</span></div>
                <div className="text-[14px] text-[#8a857f]">The full video + 3 Shorts. Pay once, by UPI.</div>
                <button type="button" onClick={() => setPaid(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] py-3 text-[16px] font-bold shadow-[3px_3px_0_#1f1c1b]"><IndianRupee className="size-4" />Pay ₹199 by UPI and publish</button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}

export default function VideoWorkspace() {
  const { id } = useParams<{ id: string }>();
  if (/^\d+$/.test(id)) return <AppFrame><LiveWorkspace id={id} /></AppFrame>; // a real film, followed live
  return <PrototypeWorkspace />;
}

function PrototypeWorkspace() {
  const [stage, setStage] = useState(0);
  const [title, setTitle] = useState("Explain UPI in 10 minutes");
  useEffect(() => { const q = new URLSearchParams(window.location.search).get("topic"); if (q) setTitle(q); }, []);
  const go = (n: number) => { setStage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const heads = [
    ["The planning agent is at work", "It reads your notes, checks every fact, and lays the video out minute by minute."],
    ["Pick a script", "Three takes on your plan, in your voice. Every line already has its visual."],
    ["Add your voice", "Record off the teleprompter, upload a take, or pick an AI voice."],
    ["Editing", "The agent cuts and builds every scene. Then it's yours to change."],
    ["Review every scene", "Approve it, or say what should change. Or fix it yourself."],
    ["Publish", "The video and three Shorts, ready to go."],
  ];
  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><div className="text-[13px] font-semibold text-[#8a857f]">Video</div><div className="truncate text-[20px] font-bold">{title}</div></div>
          <Stepper stage={stage} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={stage} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease }} className="mt-8">
            <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] sm:text-[42px]">{heads[stage][0].split(" ").slice(0, -1).join(" ")} <span style={LIME_TEXT}>{heads[stage][0].split(" ").slice(-1)}</span></h1>
            <p className="mb-7 mt-2 text-[17px] text-[#5f5b57]">{heads[stage][1]}</p>
            {stage === 0 && <PlanStage next={() => go(1)} />}
            {stage === 1 && <ScriptStage next={() => go(2)} />}
            {stage === 2 && <VoiceStage next={() => go(3)} />}
            {stage === 3 && <EditStage title={title} next={() => go(4)} back={() => go(2)} />}
            {stage === 4 && <ReviewStage next={() => go(5)} edit={() => go(3)} />}
            {stage === 5 && <PublishStage title={title} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppFrame>
  );
}
