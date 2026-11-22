"use client";

import { Check, Loader2, Play, RotateCcw, Square, X } from "lucide-react";
import { useState } from "react";
import { post } from "@/lib/api";
import { AnimatePresence, motion } from "motion/react";
import { Chip, ease } from "./kit";

/* The pieces of the motion-agent pages (app/app/motion): the film's state, the pipeline rail, the cost meter and the
   agent's activity feed. */

export type Step = { id: string; label: string; state: "done" | "running" | "pending" | "failed"; at: string };
export type Cost = { total_usd: number; stages: Record<string, number>; models: Record<string, { usd?: number; calls?: number }>; unpriced: string[] } | null;

export function StateChip({ state, queue = 0 }: { state: string; queue?: number }) {
  if (state === "running") return <Chip tone="lime"><span className="size-2 animate-pulse rounded-full bg-[#3f7d1e]" />Making</Chip>;
  if (state === "done") return <Chip tone="ink">Ready</Chip>;
  if (state === "failed") return <Chip tone="warn">Failed</Chip>;
  if (state === "queued") return <Chip>In queue{queue ? ` · #${queue}` : ""}</Chip>;
  if (state === "paused") return <Chip tone="warn">Paused · needs you</Chip>;
  return <Chip>Stopped</Chip>;
}

/** the film's controls: stop it (or take it out of the queue), resume it from where it stopped */
export function FilmControls({ slug, state, onDone }: { slug: string; state: string; onDone?: () => void }) {
  const [busy, setBusy] = useState("");
  const act = async (what: "stop" | "resume" | "redo" | "remove" | "rerender") => {
    setBusy(what);
    try { await post(`/argon/${slug}/${what}`); onDone?.(); } finally { setBusy(""); }
  };
  if (state === "running")
    return <button type="button" disabled={!!busy} onClick={() => act("stop")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold disabled:opacity-50">
      <Square className="size-3.5" />{busy === "stop" ? "Stopping…" : "Stop"}</button>;
  if (state === "queued")
    return <button type="button" disabled={!!busy} onClick={() => act("remove")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold disabled:opacity-50">
      <X className="size-3.5" />{busy === "remove" ? "Removing…" : "Remove from queue"}</button>;
  if (state === "paused")
    return <span className="inline-flex gap-1.5">
      <button type="button" disabled={!!busy} onClick={() => act("resume")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-3.5 py-1.5 text-[13.5px] font-bold shadow-[2px_2px_0_#1f1c1b] disabled:opacity-50"><Play className="size-3.5" />{busy === "resume" ? "Resuming…" : "Resume"}</button>
      <button type="button" disabled={!!busy} onClick={() => act("remove")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold disabled:opacity-50"><X className="size-3.5" />Remove</button></span>;
  if (state === "stopped" || state === "failed")
    return <button type="button" disabled={!!busy} onClick={() => act("resume")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-3.5 py-1.5 text-[13.5px] font-bold shadow-[2px_2px_0_#1f1c1b] disabled:opacity-50">
      <Play className="size-3.5" />{busy === "resume" ? "Resuming…" : "Resume"}</button>;
  if (state === "done")
    return <span className="inline-flex gap-1.5">
      <button type="button" disabled={!!busy} title="Render it again with the newest motion (nothing else is redone)" onClick={() => act("rerender")}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold disabled:opacity-50">
        <Play className="size-3.5" />{busy === "rerender" ? "Starting…" : "Render again"}</button>
      <button type="button" disabled={!!busy} title="Write every scene again with the newest rules and motion (the plan, voice and pictures stay)" onClick={() => act("redo")}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold disabled:opacity-50">
        <RotateCcw className="size-3.5" />{busy === "redo" ? "Queuing…" : "Redo scenes"}</button></span>;
  return null;
}

/** the steps as a rail: done steps lime with a check, the running one pulsing with a flowing connector */
export function PipelineRail({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-start overflow-x-auto pb-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex min-w-[112px] flex-1 items-start">
          <div className="flex w-[92px] flex-none flex-col items-center text-center">
            <div className="relative grid size-11 place-items-center">
              {s.state === "running" && <motion.span className="absolute inset-0 rounded-full bg-[#a6f04a]" animate={{ scale: [1, 1.45], opacity: [0.55, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />}
              <motion.span layout className={`relative grid size-11 place-items-center rounded-full border-2 text-[14px] font-bold transition-colors ${
                s.state === "done" ? "border-[#1f1c1b] bg-[#a6f04a]" : s.state === "running" ? "border-[#1f1c1b] bg-white" : s.state === "failed" ? "border-[#9a2f1d] bg-[#ffe7e2]" : "border-[#d9d8d0] bg-[#f6f5ef] text-[#a29d96]"}`}>
                {s.state === "done" ? <Check className="size-5" strokeWidth={3} /> : s.state === "running" ? <Loader2 className="size-5 animate-spin" /> : s.state === "failed" ? <X className="size-5 text-[#9a2f1d]" /> : i + 1}
              </motion.span>
            </div>
            <div className={`mt-2 text-[12.5px] font-bold leading-tight ${s.state === "pending" ? "text-[#a29d96]" : "text-[#1f1c1b]"}`}>{s.label}</div>
            <div className="font-mono text-[11px] text-[#a29d96]">{s.at}</div>
          </div>
          {i < steps.length - 1 && (
            <div className="relative mt-[21px] h-[4px] flex-1 overflow-hidden rounded-full bg-[#e6e6df]">
              {s.state === "done" && steps[i + 1].state !== "pending" ? <span className="absolute inset-0 bg-[#a6f04a]" />
                : s.state === "done" ? <motion.span className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#a6f04a] to-transparent" animate={{ x: ["-100%", "220%"] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }} /> : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const STAGE_NAMES: Record<string, string> = { plan: "Planning", voice: "Voice", pictures: "Pictures", code: "Writing scenes", review: "Look and fix", setup: "Setup", render: "Render" };

/** what the film has cost so far, from the real token counts Google returns (video/cost.py) */
export function CostMeter({ cost }: { cost: Cost }) {
  if (!cost) return <p className="text-[13.5px] text-[#8a857f]">Cost is tracked from the next film on (this run started before the meter).</p>;
  const stages = Object.entries(cost.stages || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...stages.map(([, v]) => v), 0.0001);
  return (
    <div>
      <motion.div key={cost.total_usd.toFixed(3)} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[34px] font-bold leading-none tracking-[-0.02em]">
        ${cost.total_usd.toFixed(3)}<span className="ml-2 text-[15px] font-semibold text-[#8a857f]">≈ ₹{(cost.total_usd * 84).toFixed(1)}</span>
      </motion.div>
      <div className="mt-3 space-y-2">
        {stages.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-[12.5px] font-semibold"><span>{STAGE_NAMES[k] ?? k}</span><span className="font-mono">${v.toFixed(3)}</span></div>
            <div className="mt-0.5 h-[6px] overflow-hidden rounded-full bg-[#ecebe5]"><motion.div className="h-full rounded-full bg-[#a6f04a]" initial={{ width: 0 }} animate={{ width: `${(v / max) * 100}%` }} transition={{ duration: 0.6, ease }} /></div>
          </div>
        ))}
      </div>
      {cost.unpriced?.length > 0 && <p className="mt-2 text-[12px] text-[#9a5a12]">Not priced yet (no published price): {cost.unpriced.join(", ")}</p>}
    </div>
  );
}

/** the agent's own words about what it is doing, newest on top */
export function ActivityFeed({ log, running }: { log: string[]; running: boolean }) {
  const lines = log.filter((l) => l.startsWith("[")).slice(-9).reverse(); // newest first
  return (
    <div className="space-y-1.5">
      <AnimatePresence initial={false}>
        {lines.map((l, i) => {
          const last = i === 0;
          return (
            <motion.div key={l} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: last ? 1 : 0.62, x: 0 }} transition={{ duration: 0.35, ease }} className="flex gap-2.5 text-[13.5px] leading-snug">
              <span className="w-[62px] flex-none font-mono text-[11.5px] text-[#a29d96]">{l.slice(1, 9)}</span>
              <span className={last ? "font-semibold" : ""}>{l.slice(11)}{last && running && <span className="ml-1 inline-flex gap-0.5 align-middle">{[0, 1, 2].map((d) => <motion.span key={d} className="size-1 rounded-full bg-[#3f7d1e]" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.18 }} />)}</span>}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

type QItem = { slug: string; title: string; style: string; lane: string; state: string; reason: string; position: number };

/** the queue: what is being made now (in parallel), what waits its turn, and what is paused waiting for you */
export function QueuePanel({ data, onChange }: { data?: { queue: QItem[]; blocked: QItem | null }; onChange: () => void }) {
  if (!data || !data.queue.length) return null;
  return (
    <div className="rounded-[20px] border border-[#e6e6df] bg-white p-4">
      <div className="mb-2 flex items-center justify-between"><div className="text-[16px] font-bold">Queue</div>
        <div className="text-[12.5px] text-[#8a857f]">"Now" films are made together; the rest one at a time.</div></div>
      {data.blocked && (
        <div className="mb-3 rounded-[14px] border border-[#f0c4b8] bg-[#fff1ec] p-3 text-[13.5px]">
          <b>The queue is waiting for you.</b> “{data.blocked.title}” stopped: {data.blocked.reason} Resume it or remove it; nothing else starts until you do.
        </div>
      )}
      <div className="space-y-1.5">
        {data.queue.map((q) => (
          <div key={q.slug} className={`flex items-center gap-3 rounded-[12px] px-2.5 py-2 ${q.state === "paused" ? "bg-[#fff1ec]" : q.state === "running" ? "bg-[#f1fbe3]" : "bg-[#f7f5ee]"}`}>
            <span className="w-6 text-center font-mono text-[12px] text-[#8a857f]">{q.position}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${q.lane === "now" ? "bg-[#1f1c1b] text-[#a6f04a]" : "bg-white text-[#5f5b57]"}`}>{q.lane === "now" ? "Now" : "Next"}</span>
            <a href={`/app/motion/${q.slug}`} className="min-w-0 flex-1 truncate text-[13.5px] font-semibold hover:underline">{q.title}</a>
            {q.style && <span className="hidden text-[11.5px] text-[#8a857f] sm:inline">{q.style}</span>}
            <span className={`text-[12px] font-semibold ${q.state === "paused" ? "text-[#9a2f1d]" : q.state === "running" ? "text-[#3f7d1e]" : "text-[#8a857f]"}`}>
              {q.state === "running" ? "Being made" : q.state === "paused" ? "Paused" : "Waiting"}</span>
            <FilmControls slug={q.slug} state={q.state === "paused" ? "paused" : q.state === "running" ? "running" : "queued"} onDone={onChange} />
          </div>
        ))}
      </div>
    </div>
  );
}