"use client";

import { ArrowLeft, Captions, ChevronDown, Download, Eye, Hand, Image as ImageIcon, Lock, Maximize2, MessageSquare, Mic, MousePointer2, Music, Pause, Play, Redo2, Search, SkipBack, SkipForward, SlidersHorizontal, Sparkles, StickyNote, Type, Undo2, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Film, type ShotName } from "@/components/landing/explainer";
import { LIME, ease } from "./kit";

/* The editor: the layout of a pro video editor (visuals on the left, the preview in the middle, the "ask Drishyya"
   panel on the right, a multi-track timeline below), drawn in Drishyya's theme: white panels on paper, ink, one lime.
   The preview plays the UPI explainer; the playhead runs over the tracks. Prototype only. */

const SHOTS: ShotName[] = ["hook", "coin", "qr", "route", "hub", "paid", "speed", "pin", "recap"];
const LINES = ["Ek chai ke ₹10.", "Aap pay karte ho,", "QR scan kiya,", "paisa aapke bank se nikla,", "NPCI ne raasta dikhaya,", "aur vendor ko mil gaya.", "Sab ek second mein.", "PIN? Sirf aapke phone mein.", "Yahi hai UPI."];
const SHOT_S = 2.7, TOTAL = SHOTS.length * SHOT_S;
const fmt = (s: number) => `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-[#e6e6df] bg-white ${className}`}>{children}</div>;
}

function Slider({ label, title, value, mute }: { label: string; title: string; value: number; mute?: boolean }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between">
        <div><div className="text-[12.5px] text-[#8a857f]">{label}</div><div className="text-[20px] font-bold leading-tight">{title}</div></div>
        <div className="text-[30px] font-bold leading-none tracking-[-0.03em]">{value}%</div>
      </div>
      <div className="relative mt-4 flex gap-1">
        {Array.from({ length: 4 }, (_, i) => <span key={i} className="h-2 flex-1 rounded-full" style={{ background: (i + 1) * 25 <= value ? "#1f1c1b" : (i * 25 < value ? LIME : "#ecebe5") }} />)}
        <span className="absolute top-1/2 grid h-5 w-7 -translate-y-1/2 place-items-center rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a]" style={{ left: `calc(${value}% - 14px)` }} />
      </div>
      {mute !== undefined && <div className="mt-3 flex items-center justify-between text-[12.5px] text-[#8a857f]"><span>Chai Lo-fi · calm</span>{mute ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</div>}
    </Panel>
  );
}

export function Editor({ title, onBack, onDone }: { title: string; onBack: () => void; onDone: () => void }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState<"Scene" | "Captions" | "Audio">("Scene");
  const [ask, setAsk] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((x) => (x + 0.1) % TOTAL), 100);
    return () => clearInterval(id);
  }, [playing]);
  const shot = Math.floor(t / SHOT_S);
  const pct = (t / TOTAL) * 100;

  return (
    <div className="flex h-dvh flex-col gap-3 p-3" style={{ background: "#efefea" }}>
      {/* top bar */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-4 py-2 text-[14px] font-semibold"><ArrowLeft className="size-4" />Back</button>
        <button type="button" className="grid size-9 place-items-center rounded-full border border-[#e2e1da] bg-white"><Undo2 className="size-4" /></button>
        <button type="button" className="grid size-9 place-items-center rounded-full border border-[#e2e1da] bg-white"><Redo2 className="size-4" /></button>
        <span className="ml-2 hidden truncate text-[16px] font-bold lg:block">{title}</span>
        <div className="mx-auto flex items-center gap-1 rounded-full border border-[#e2e1da] bg-white p-1">
          {[MousePointer2, Type, StickyNote, MessageSquare].map((I, i) => (
            <span key={i} className={`grid size-8 place-items-center rounded-full ${i === 0 ? "bg-[#1f1c1b] text-[#a6f04a]" : "text-[#5f5b57]"}`}><I className="size-4" /></span>
          ))}
        </div>
        <div className="flex -space-x-2">
          {["R", "A"].map((c, i) => <span key={c} className="grid size-9 place-items-center rounded-full border-2 border-white text-[13px] font-bold" style={{ background: i ? "#f6f39a" : "#1f1c1b", color: i ? "#1f1c1b" : LIME }}>{c}</span>)}
        </div>
        <button type="button" onClick={() => setPlaying(!playing)} className="grid size-9 place-items-center rounded-full border border-[#e2e1da] bg-white">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
        <button type="button" className="flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-3.5 py-2 text-[14px] font-semibold">1080p <ChevronDown className="size-4" /></button>
        <button type="button" onClick={onDone} className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-4 py-1.5 text-[14px] font-bold shadow-[2px_2px_0_#1f1c1b]"><Download className="size-4" />Send to review</button>
      </div>

      {/* the three panels */}
      <div className="flex min-h-0 flex-1 gap-3">
        <Panel className="hidden w-[250px] shrink-0 flex-col overflow-hidden p-4 lg:flex">
          <div className="text-[20px] font-bold">Visuals</div>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-[#e2e1da] px-3 py-1.5 text-[14px] text-[#8a857f]"><Search className="size-4" />Search visuals</div>
          <div className="mt-4 flex items-center justify-between text-[13px] font-semibold"><span>This video's scenes</span><span className="text-[#8a857f]">See all</span></div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SHOTS.slice(0, 6).map((s, i) => (
              <div key={s} className={`relative h-[64px] overflow-hidden rounded-[12px] ${i === shot ? "ring-2 ring-[#a6f04a]" : ""}`}><Film shots={[s]} ms={3000 + i * 200} /></div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[13px] font-semibold"><span>Boxes & stickers</span><span className="text-[#8a857f]">See all</span></div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {["₹10", "SAFE", "NPCI", "✓", "1 s", "QR"].map((x, i) => (
              <span key={x} className="grid h-11 place-items-center rounded-[10px] text-[14px] font-extrabold" style={{ background: ["#f6f39a", "#fff", LIME, "#1f1c1b", "#ffd2b0", "#fff"][i], color: i === 3 ? LIME : i === 1 ? "#e8402c" : "#1f1c1b", border: "2px solid #1f1c1b", boxShadow: "2px 2px 0 #1f1c1b" }}>{x}</span>
            ))}
          </div>
          <div className="mt-4 text-[13px] font-semibold">Music</div>
          {["Chai Lo-fi · calm", "Bright pluck · upbeat", "Soft piano · warm"].map((m, i) => (
            <div key={m} className={`mt-1.5 flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[13.5px] ${i === 0 ? "bg-[#a6f04a]/30 font-semibold" : "text-[#5f5b57]"}`}><Music className="size-3.5" />{m}</div>
          ))}
        </Panel>

        {/* preview */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-[20px] bg-[#1f1c1b]">
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="relative aspect-video w-full max-w-full overflow-hidden rounded-[14px]" style={{ maxHeight: "100%" }}>
              <Film shots={SHOTS} ms={SHOT_S * 1000} captions={LINES} />
            </div>
          </div>
          <div className="absolute inset-x-4 bottom-4 flex items-center gap-3">
            <span className="rounded-full bg-black/60 px-3 py-1.5 font-mono text-[13px] text-white">{fmt(t)}</span>
            <span className="grid size-8 place-items-center rounded-full bg-black/60 text-white"><Volume2 className="size-4" /></span>
            <div className="mx-auto flex items-center gap-1.5 rounded-full bg-black/60 p-1">
              <span className="grid size-8 place-items-center rounded-full text-white"><SkipBack className="size-4" /></span>
              <button type="button" onClick={() => setPlaying(!playing)} className="grid size-8 place-items-center rounded-full bg-[#a6f04a] text-[#1f1c1b]">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
              <span className="grid size-8 place-items-center rounded-full text-white"><SkipForward className="size-4" /></span>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-black/60 text-white"><Hand className="size-4" /></span>
            <span className="grid size-8 place-items-center rounded-full bg-black/60 text-white"><Maximize2 className="size-4" /></span>
          </div>
          <div className="absolute inset-x-4 bottom-[60px] h-1.5 rounded-full bg-white/20"><div className="relative h-full rounded-full bg-[#a6f04a]" style={{ width: `${pct}%` }}><span className="absolute -right-2 -top-[5px] size-4 rounded-full border-2 border-[#1f1c1b] bg-white" /></div></div>
        </div>

        {/* ask Drishyya + controls */}
        <div className="hidden w-[300px] shrink-0 flex-col gap-3 overflow-y-auto xl:flex">
          <Panel className="p-4">
            <span className="rounded-full border border-[#e2e1da] px-2.5 py-0.5 text-[12.5px] font-semibold">Scene {shot + 1} · script</span>
            <p className="mt-3 text-[15px] leading-relaxed text-[#3d3935]">“{LINES[shot]}”</p>
            <p className="mt-2 text-[13px] leading-snug text-[#8a857f]">Visual: {["chai tapri, ₹10 price tag", "coin flips into the phone", "phone scans the tapri QR", "your bank → NPCI → their bank", "NPCI connects every bank", "vendor's phone: +₹10", "stopwatch: 0.8 s", "PIN dots, lock, SAFE", "three sticky notes"][shot]}</p>
            {asked.map((a, i) => <div key={i} className="mt-2 rounded-[12px] bg-[#f1fbe3] px-3 py-1.5 text-[13px] text-[#2f5a12]">Asked: {a} · <span className="font-semibold">updating scene…</span></div>)}
            <div className="mt-3 flex items-center gap-2 rounded-full border border-[#e2e1da] px-3 py-1.5">
              <input value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ask.trim()) { setAsked([...asked, ask.trim()]); setAsk(""); } }}
                placeholder="Tell Drishyya what to change" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#a8a39c]" />
              <Mic className="size-4 text-[#5f5b57]" />
            </div>
          </Panel>
          <div className="flex rounded-full border border-[#e2e1da] bg-white p-1">
            {(["Scene", "Captions", "Audio"] as const).map((x) => (
              <button key={x} type="button" onClick={() => setTab(x)} className="relative flex-1 rounded-full py-1.5 text-[14px] font-semibold">
                {tab === x && <motion.span layoutId="ed-tab" className="absolute inset-0 rounded-full bg-[#1f1c1b]" transition={{ duration: 0.3, ease }} />}
                <span className={`relative ${tab === x ? "text-white" : "text-[#5f5b57]"}`}>{x}</span>
              </button>
            ))}
          </div>
          {tab === "Audio" ? (<><Slider label="Music" title="Volume" value={30} mute={false} /><Slider label="Your voice" title="Level" value={100} /></>)
            : tab === "Captions" ? (
              <Panel className="p-4">
                <div className="text-[12.5px] text-[#8a857f]">Captions</div><div className="text-[20px] font-bold">Word by word</div>
                <div className="mt-3 flex flex-wrap gap-1.5">{["Bold", "Lime highlight", "Bottom", "Hinglish"].map((c, i) => <span key={c} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${i < 2 ? "bg-[#1f1c1b] text-white" : "bg-[#f1f0ea] text-[#5f5b57]"}`}>{c}</span>)}</div>
              </Panel>
            ) : (<>
              <Slider label="Scene" title="Motion" value={70} />
              <Panel className="p-4">
                <div className="text-[12.5px] text-[#8a857f]">Look</div><div className="text-[20px] font-bold">Box style</div>
                <div className="mt-3 grid grid-cols-3 gap-2">{["Boxes", "Paper", "Sticky"].map((c, i) => (
                  <span key={c} className={`grid h-14 place-items-center rounded-[12px] text-[13px] font-bold ${i === 0 ? "border-2 border-[#1f1c1b] bg-[#a6f04a] shadow-[2px_2px_0_#1f1c1b]" : "border border-[#e2e1da] bg-[#f7f5ee]"}`}>{c}</span>
                ))}</div>
              </Panel>
            </>)}
        </div>
      </div>

      {/* timeline */}
      <Panel className="flex h-[236px] shrink-0 overflow-hidden">
        <div className="flex w-[118px] shrink-0 flex-col border-r border-[#e6e6df]">
          <div className="grid h-10 place-items-center border-b border-[#e6e6df] font-mono text-[14px] font-semibold">{fmt(t).slice(3)}</div>
          {[Captions, Type, ImageIcon, Mic, Music].map((I, i) => (
            <div key={i} className="flex flex-1 items-center justify-center gap-2.5 text-[#8a857f]"><I className="size-4 text-[#1f1c1b]" /><Lock className="size-3.5" /><Eye className="size-3.5" /></div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="flex h-10 items-center justify-between border-b border-[#e6e6df] px-3 font-mono text-[12px] text-[#8a857f]">
            {Array.from({ length: 9 }, (_, i) => <span key={i}>00:{String(Math.round(i * SHOT_S)).padStart(2, "0")}</span>)}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-10 flex flex-col py-1">
            {/* captions */}
            <div className="relative flex-1">{LINES.map((l, i) => <span key={i} className={`absolute inset-y-1 flex items-center truncate rounded-[8px] px-2 text-[12px] font-semibold ${i === shot ? "bg-[#1f1c1b] text-[#a6f04a]" : "bg-[#a6f04a]/45 text-[#2f5a12]"}`} style={{ left: `calc(${(i / SHOTS.length) * 100}% + 2px)`, width: `calc(${100 / SHOTS.length}% - 4px)` }}>{l}</span>)}</div>
            {/* text & stickers */}
            <div className="relative flex-1">
              {[["Title: ₹10 ki chai", 0, 2], ["Sticker: You pay", 1, 1], ["Box: NPCI", 4, 1], ["Stamp: SAFE", 7, 1]].map(([x, s, w]) => (
                <span key={x as string} className="absolute inset-y-1 flex items-center gap-1.5 truncate rounded-[8px] border border-[#e2e1da] bg-[#f7f5ee] px-2 text-[12px] font-semibold" style={{ left: `calc(${((s as number) / SHOTS.length) * 100}% + 2px)`, width: `calc(${((w as number) / SHOTS.length) * 100}% - 4px)` }}><Type className="size-3" />{x}</span>
              ))}
            </div>
            {/* visuals */}
            <div className="relative flex flex-1 gap-1 px-0.5">{SHOTS.map((s, i) => <div key={s} className="relative flex-1 overflow-hidden rounded-[8px]"><Film shots={[s]} ms={600000} /></div>)}</div>
            {/* voice */}
            <div className="relative flex flex-1 items-center gap-[2px] px-1">{Array.from({ length: 120 }, (_, i) => <span key={i} className="flex-1 rounded-full bg-[#1f1c1b]" style={{ height: `${20 + ((i * 37) % 70)}%`, opacity: (i / 120) * 100 < pct ? 0.85 : 0.25 }} />)}</div>
            {/* music */}
            <div className="relative flex-1 px-0.5"><span className="absolute inset-y-1 left-0.5 right-0.5 flex items-center gap-1.5 rounded-[8px] bg-[#f6f39a] px-2 text-[12px] font-semibold"><Music className="size-3" />Chai Lo-fi · ducks under your voice</span></div>
          </div>
          <div className="pointer-events-none absolute bottom-0 top-0 w-0 border-l-2 border-dashed border-[#1f1c1b]" style={{ left: `${pct}%` }}>
            <span className="absolute -left-[7px] top-1 h-3.5 w-3 rounded-[3px] bg-[#1f1c1b]" />
          </div>
        </div>
        <div className="hidden w-[46px] shrink-0 flex-col items-center justify-center gap-3 border-l border-[#e6e6df] text-[#5f5b57] md:flex"><Sparkles className="size-4" /><SlidersHorizontal className="size-4" /><VolumeX className="size-4" /></div>
      </Panel>
    </div>
  );
}
