"use client";

import { AlertTriangle, AudioLines, Check, CheckCircle2, Clapperboard, Clock, Code2, Film, Hammer, LayoutGrid, Loader2, MessageSquare, PenLine, ScrollText, Sparkles, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ComponentType } from "react";
import type { FilmStatus } from "./film-parts";
import { ease } from "./kit";

/* What the runner (video/oneshot.py) is doing, as the editor shows it (/api/films/<slug>/live): the steps it took as a
   feed, the code as Gemini types it, the storyboard's cards as they are drawn, the render's frames. */

export type LiveEvent = { t: number; kind: string; text: string; scene?: number | null };
export type FilmLive = { running: string[]; now: number; events: LiveEvent[];
  write: { state: string; text: string; chars: number; lines: number; scene?: number; t: number } | null;
  progress: { what: string; done: number; total: number; t: number } | null;
  render: { stage: string; done: number; total: number; t: number } | null };

const KINDS: Record<string, { icon: ComponentType<{ className?: string }>; tone: string; label: string }> = {
  plan: { icon: Sparkles, tone: "bg-[#efe7ff] text-[#5a3a9a]", label: "Plan" }, planning: { icon: Sparkles, tone: "bg-[#efe7ff] text-[#5a3a9a]", label: "Plan" },
  story: { icon: ScrollText, tone: "bg-[#efe7ff] text-[#5a3a9a]", label: "Story" },
  voice: { icon: AudioLines, tone: "bg-[#e3f1ff] text-[#1f5a8a]", label: "Voice" },
  storyboard: { icon: LayoutGrid, tone: "bg-[#fff3d6] text-[#8a5a00]", label: "Storyboard" }, card: { icon: LayoutGrid, tone: "bg-[#fff3d6] text-[#8a5a00]", label: "Card" },
  review: { icon: Clock, tone: "bg-[#1f1c1b] text-[#a6f04a]", label: "Your turn" },
  redraw: { icon: MessageSquare, tone: "bg-[#fff3d6] text-[#8a5a00]", label: "Your note" },
  write: { icon: PenLine, tone: "bg-[#a6f04a]/40 text-[#2f5a12]", label: "Write" },
  ok: { icon: CheckCircle2, tone: "bg-[#a6f04a]/40 text-[#2f5a12]", label: "Check" },
  fix: { icon: Hammer, tone: "bg-[#fff1ec] text-[#9a4a1d]", label: "Fix" },
  render: { icon: Clapperboard, tone: "bg-[#e3f1ff] text-[#1f5a8a]", label: "Render" },
  done: { icon: Film, tone: "bg-[#1f1c1b] text-[#a6f04a]", label: "Done" },
  waiting: { icon: Clock, tone: "bg-[#f1f0ea] text-[#5f5b57]", label: "Waiting" },
  error: { icon: AlertTriangle, tone: "bg-[#fff1ec] text-[#9a2f1d]", label: "Stopped" },
};
const kindOf = (k: string) => KINDS[k] ?? { icon: Wand2, tone: "bg-[#f1f0ea] text-[#5f5b57]", label: "Step" };
const clock = (t: number) => new Date(t * 1000).toLocaleTimeString("en-GB", { hour12: false });
const ago = (now: number, t: number) => { const s = Math.max(0, Math.round(now - t)); return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`; };
const clean = (x: string) => x.replace(/^DONE \/.*$/, "The film is rendered").replace(/^Report: .*/, "");

/** the one thing happening now, with its progress */
export function nowDoing(film: FilmStatus, live?: FilmLive | null): { text: string; done?: number; total?: number } | null {
  const run = live?.running ?? film.running;
  if (!run.length) return null;
  const n = film.script.length;
  if (run.includes("plan")) {
    if (!n) return { text: "Gemini is writing the story" };
    const voiced = film.voiced.filter(Boolean).length;
    if (voiced < n) return { text: `Voicing the lines`, done: voiced, total: n };
    const p = live?.progress;
    if (p && p.what === "storyboard") return { text: "Drawing the storyboard", done: p.done, total: p.total };
    return { text: "Timing every word, then drawing the storyboard" };
  }
  if (run.includes("write") || run.includes("redo")) {
    const r = live?.render;
    const last = live?.events.at(-1);
    if (last?.kind === "render" && r && r.stage !== "done") return { text: r.stage === "encoded" ? "Encoding the video" : "Rendering frames", done: r.done, total: r.total };
    if (live?.write?.state === "streaming") return { text: `Gemini is writing ${live.write.scene !== undefined ? `Scene${live.write.scene + 1}` : "film.tsx"} · ${live.write.lines} lines so far` };
    return { text: last ? clean(last.text) : "Writing the film" };
  }
  if (run.includes("redraw")) return { text: "Redrawing a card from your note" };
  if (run.includes("reline")) return { text: "Voicing the changed line again" };
  return { text: "Working" };
}

/** the run as a feed: what it is doing now (with progress), then every step, newest first */
export function Feed({ film, live, onLine, max = 60 }: { film: FilmStatus; live?: FilmLive | null; onLine?: (i: number) => void; max?: number }) {
  const now = nowDoing(film, live);
  const events = (live?.events ?? []).filter((e) => clean(e.text)).slice(-max).reverse();
  const tnow = live?.now ?? Date.now() / 1000;
  return (
    <div>
      <AnimatePresence>{now && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 rounded-[14px] bg-[#1f1c1b] p-3 text-white">
          <div className="flex items-center gap-2 text-[13.5px] font-bold"><Loader2 className="size-4 animate-spin text-[#a6f04a]" />{now.text}{now.total ? <span className="ml-auto font-mono text-[12px] text-white/70">{now.done}/{now.total}</span> : null}</div>
          {now.total ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full bg-[#a6f04a]" animate={{ width: `${Math.min(100, ((now.done ?? 0) / Math.max(1, now.total)) * 100)}%` }} transition={{ duration: 0.4 }} /></div>
            : <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full w-1/3 rounded-full bg-[#a6f04a]" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} /></div>}
        </motion.div>)}</AnimatePresence>
      {film.state === "review" && !now && (
        <div className="mb-3 rounded-[14px] border-2 border-[#1f1c1b] bg-[#f6f39a] p-3 text-[13.5px] font-bold">Your turn: review the storyboard. {film.approved} of {film.total} approved.</div>)}
      {!events.length && <p className="px-1 text-[13px] text-[#8a857f]">{now ? "Starting…" : "Nothing yet."}</p>}
      <ol className="relative space-y-1.5">
        <AnimatePresence initial={false}>
          {events.map((e) => {
            const k = kindOf(e.kind);
            const Icon = k.icon;
            return (
              <motion.li key={`${e.t}-${e.text}`} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease }}
                className="flex gap-2.5 rounded-[12px] px-1.5 py-1.5 hover:bg-[#f7f5ee]">
                <span className={`mt-0.5 grid size-7 flex-none place-items-center rounded-[9px] ${k.tone}`}><Icon className="size-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#8a857f]">
                    <span className="font-bold uppercase tracking-[0.05em]">{k.label}</span><span>·</span><span title={clock(e.t)}>{ago(tnow, e.t)}</span>
                    {e.scene !== null && e.scene !== undefined && e.scene >= 0 && <button type="button" onClick={() => onLine?.(e.scene as number)} className="ml-auto rounded-full bg-[#f1f0ea] px-1.5 font-mono text-[10.5px] font-bold text-[#3a3633] hover:bg-[#a6f04a]">L{String((e.scene as number) + 1).padStart(2, "0")}</button>}
                  </div>
                  <div className="text-[12.5px] leading-snug text-[#2a2624]">{clean(e.text)}</div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}

/** the code as Gemini types it, the last lines in view, with a cursor */
export function CodeStream({ write, title }: { write: NonNullable<FilmLive["write"]>; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const lines = write.text.split("\n");
  const first = Math.max(1, write.lines - lines.length + 1);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [write.text]);
  return (
    <div className="absolute inset-0 flex flex-col bg-[#14161b] text-[#e6e3dc]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-[12.5px]">
        <span className="flex gap-1.5"><span className="size-2.5 rounded-full bg-[#ff5f57]" /><span className="size-2.5 rounded-full bg-[#febc2e]" /><span className="size-2.5 rounded-full bg-[#28c840]" /></span>
        <Code2 className="ml-2 size-3.5 text-[#a6f04a]" /><span className="font-semibold">{title}</span>
        <span className="ml-auto font-mono text-white/60">{write.lines.toLocaleString("en-IN")} lines · {(write.chars / 1000).toFixed(1)}k chars</span>
        {write.state === "streaming" ? <span className="flex items-center gap-1 rounded-full bg-[#a6f04a] px-2 py-0.5 text-[11px] font-bold text-[#1f1c1b]"><span className="size-1.5 animate-pulse rounded-full bg-[#1f1c1b]" />Gemini is typing</span>
          : <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold"><Check className="size-3" />written</span>}
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-auto px-2 py-2 font-mono text-[11.5px] leading-[1.55]">
        {lines.slice(-400).map((l, k, a) => (
          <div key={k} className="flex whitespace-pre"><span className="w-12 flex-none select-none pr-3 text-right text-white/25">{first + lines.length - a.length + k}</span>
            <span className={/^\s*(\/\/|\/\*|\*)/.test(l) ? "text-[#8fa37a]" : /^\s*(export|const|function|import|type)\b/.test(l) ? "text-[#a6f04a]" : ""}>{l}</span>
            {k === a.length - 1 && write.state === "streaming" && <motion.span className="ml-0.5 inline-block h-[1.1em] w-[7px] bg-[#a6f04a]" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** before the storyboard exists: the story's lines appear, get voiced, then the cards are drawn */
export function PlanningView({ film, live }: { film: FilmStatus; live?: FilmLive | null }) {
  const now = nowDoing(film, live);
  const p = live?.progress?.what === "storyboard" ? live.progress : null;
  return (
    <div className="absolute inset-0 overflow-auto bg-[#f7f5ee] p-6">
      <div className="mx-auto max-w-[760px]">
        <div className="flex items-center gap-2 text-[15px] font-bold text-[#1f1c1b]"><Loader2 className="size-4 animate-spin" />{now?.text ?? "Planning"}{now?.total ? <span className="font-mono text-[13px] text-[#8a857f]">{now.done}/{now.total}</span> : null}</div>
        {!film.script.length && <div className="mt-4 space-y-2">{[0, 1, 2, 3].map((k) => <motion.div key={k} className="h-9 rounded-[12px] bg-[#1f1c1b]/[0.06]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: k * 0.15 }} />)}</div>}
        <ol className="mt-4 space-y-2">
          {film.script.map((l, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.35, ease }}
              className="flex items-start gap-3 rounded-[12px] border border-[#e6e6df] bg-white px-3 py-2 text-[14px] leading-snug">
              <span className="mt-0.5 font-mono text-[11.5px] font-bold text-[#8a857f]">L{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">{l}</span>
              {film.voiced[i] ? <span className="flex items-center gap-1 rounded-full bg-[#e3f1ff] px-2 py-0.5 text-[11px] font-bold text-[#1f5a8a]"><AudioLines className="size-3" />voiced</span>
                : <span className="rounded-full bg-[#f1f0ea] px-2 py-0.5 text-[11px] font-semibold text-[#8a857f]">waiting</span>}
              {p && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${i < p.done ? "bg-[#fff3d6] text-[#8a5a00]" : "bg-[#f1f0ea] text-[#b5b1aa]"}`}>{i < p.done ? "card drawn" : "card"}</span>}
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** the render's frames, over the preview */
export function RenderProgress({ r, lines }: { r: NonNullable<FilmLive["render"]>; lines: number }) {
  const f = r.stage === "done" ? 1 : r.done / Math.max(1, r.total);
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-[2px]">
      <div className="w-[min(440px,80%)] rounded-[18px] bg-white p-5 text-[#1f1c1b] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]">
        <div className="flex items-center gap-2 text-[17px] font-bold"><Clapperboard className="size-5" />{r.stage === "encoded" ? "Encoding the video" : "Rendering · 1080p"}</div>
        <div className="mt-1 text-[13px] text-[#8a857f]">{lines} lines · voice, captions and motion · on your machine</div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#ecebe5]"><motion.div className="h-full rounded-full bg-[#a6f04a]" animate={{ width: `${f * 100}%` }} transition={{ duration: 0.4 }} /></div>
        <div className="mt-2 flex justify-between font-mono text-[12px] text-[#8a857f]"><span>{r.stage} {r.done}/{r.total} frames</span><span>{Math.round(f * 100)}%</span></div>
      </div>
    </div>
  );
}
