"use client";

import { AlertTriangle, Brush, Check, Clapperboard, Clock, Code2, Eye, Image as ImageIcon, Map as MapIcon, Mic, PenLine, Sparkles, Wrench } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ease } from "./kit";

/* The agent at work, live in the editor (backend/app/api/argon_api.py → /argon/<slug>/live, written by video/argon.py).
   The feed of every step it takes and the stage rail; the agent working the editor itself is agent-director.tsx. */

export type LiveScene = { scene: number; action: string; state: "streaming" | "done"; text: string; prev: string | null; note: string; t: number; since?: number };
export type LiveEvent = { t: number; kind: string; text: string; scene: number | null; url?: string; name?: string; what?: string };
export type Live = { running: boolean; now: number; scenes: Record<string, LiveScene>; events: LiveEvent[]; render: { stage: string; done: number; total: number } | null; busy: number[] };

const ICON: Record<string, [typeof Code2, string]> = {
  plan: [Sparkles, "#3f7d1e"], voice: [Mic, "#24508a"], backdrop: [MapIcon, "#8a5a00"], picture: [ImageIcon, "#8a5a00"], writing: [PenLine, "#3f7d1e"], wrote: [Code2, "#5a3a9a"],
  error: [AlertTriangle, "#9a2f1d"], fixed: [Wrench, "#3f7d1e"], stills: [Brush, "#5a3a9a"], looking: [Eye, "#24508a"], ok: [Check, "#3f7d1e"], redesigned: [Brush, "#5a3a9a"],
  render: [Clapperboard, "#1f1c1b"], done: [Check, "#1f1c1b"], waiting: [Clock, "#8a5a00"],
};

/* ---------------- what the agent is putting in a scene, read from its code as it streams in ---------------- */
export type El = { key: string; kind: "backdrop" | "depth" | "particles" | "water" | "sun" | "flow" | "photo" | "picture" | "label" | "cue" | "marker"; text: string; asset?: string };
const PARTICLE: Record<string, string> = { vapour: "Vapour rising", vapor: "Vapour rising", rain: "Rain falling", drops: "Drops falling", mist: "Mist drifting", snow: "Snow falling", bubbles: "Bubbles rising", dust: "Dust in the light", sparks: "Sparks" };

/** the visible pieces in a scene's code: the backdrop's move, particles, water, the sun and its angle, pictures, labels, word cues */
export function elementsFrom(code: string, assets: { name: string; url: string }[] = []): El[] {
  const out: El[] = [], seen = new Set<string>();
  const add = (kind: El["kind"], text: string, asset?: string) => { const key = `${kind}:${text}`; if (!seen.has(key)) { seen.add(key); out.push({ key, kind, text, asset }); } };
  const named = (file: string) => {
    const base = file.split("/").pop() ?? file;
    const a = assets.find((x) => x.url && x.url.split("?")[0].endsWith(base));
    return a ? a.name.replace(/[_-]/g, " ") : base.replace(/\.(png|svg|jpg|jpeg|json)$/, "").replace(/^(draw|photo|icon|anim)-/, "").replace(/[_-]/g, " ").slice(0, 22);
  };
  const tags = [...code.matchAll(/<(KenBurns|Parallax|Particles|Water|Sun|FlowPath|Cutout|Sticker|Photo|MarkerCircle|Stage)\b([^>]*)/g)];
  for (const [, tag, attrs] of tags) {
    const file = attrs.match(/asset\(\s*["'`]([^"'`]+)/)?.[1];
    if (tag === "KenBurns" || (tag === "Stage" && file)) add("backdrop", "Backdrop drifting");
    else if (tag === "Parallax") add("depth", "Layers sliding for depth");
    else if (tag === "Particles") { const k = attrs.match(/kind=\{?["'`](\w+)/)?.[1] ?? "dust"; add("particles", PARTICLE[k] ?? k); }
    else if (tag === "Water") add("water", "Water moving");
    else if (tag === "Sun") { const a = attrs.match(/angle=\{?\s*(-?\d+)/)?.[1]; add("sun", a ? `Sun, rays at ${a}°` : "The sun"); }
    else if (tag === "FlowPath") add("flow", "Flow along a path");
    else if (tag === "MarkerCircle") add("marker", "Marker circle");
    else if (file) add(tag === "Cutout" ? "photo" : "picture", named(file), file);
  }
  for (const m of code.matchAll(/>\s*([A-Z0-9°][A-Za-z0-9°'%.\- ]{1,24}?)\s*<\//g)) if (/[A-Za-z]/.test(m[1]) && !/[{}=;]/.test(m[1])) add("label", m[1].trim());
  for (const m of code.matchAll(/\.at\(\s*["'`]([^"'`]+)["'`]/g)) add("cue", m[1]);
  return out;
}

const fmtS = (x: number) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
const EL_ICON: Record<El["kind"], string> = { backdrop: "🎞", depth: "🗻", particles: "💨", water: "🌊", sun: "☀️", flow: "〰", photo: "🖼", picture: "🖼", label: "🏷", cue: "◆", marker: "◯" };

/** the agent at work on a scene: how long, what it is doing right now (thinking, writing, waiting on Google), and every
    piece it has put in so far, popping in as its code streams */
export function WorkingCard({ ls, now, assets, compact = false }: { ls: LiveScene; now: number; assets?: { name: string; url: string }[]; compact?: boolean }) {
  const els = elementsFrom(ls.text, assets);
  const lines = ls.text ? ls.text.split("\n").length : 0;
  const elapsed = Math.max(0, now - (ls.since ?? ls.t));
  const waitingOn = /Google/.test(ls.action);
  const phase = waitingOn ? ls.action : ls.state === "done" ? ls.action : lines ? `${ls.action}: ${lines} lines so far` : `${ls.action}: thinking about the layout`;
  return (
    <div className={`rounded-[14px] ${compact ? "bg-[#f7f5ee] p-2" : "bg-[#1f1c1b] p-3 text-white"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex min-w-0 items-center gap-2 text-[12.5px] font-bold ${waitingOn ? "text-[#e0a030]" : ""}`}>
          {ls.state === "streaming" && <span className={`size-2 flex-none animate-pulse rounded-full ${waitingOn ? "bg-[#e0a030]" : "bg-[#a6f04a]"}`} />}<span className="truncate">{phase}</span></span>
        <span className="flex-none font-mono text-[11.5px] opacity-70">{fmtS(elapsed)}</span>
      </div>
      {ls.state === "streaming" && !lines && !waitingOn && (
        <div className="mt-2 flex gap-1">{[0, 1, 2, 3, 4].map((k) => <motion.span key={k} className={`h-1.5 flex-1 rounded-full ${compact ? "bg-[#1f1c1b]" : "bg-[#a6f04a]"}`} animate={{ opacity: [0.15, 0.9, 0.15] }} transition={{ duration: 1.4, repeat: Infinity, delay: k * 0.18 }} />)}</div>
      )}
      {els.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <AnimatePresence initial={false}>
            {els.slice(0, compact ? 6 : 18).map((e) => (
              <motion.span key={e.key} layout initial={{ opacity: 0, scale: 0.6, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${compact ? "bg-white text-[#3a3633]" : e.kind === "label" ? "bg-white text-[#1f1c1b]" : e.kind === "cue" ? "bg-[#a6f04a] text-[#1f1c1b]" : "bg-white/10"}`}>
                <span>{EL_ICON[e.kind]}</span>{e.kind === "cue" ? `on “${e.text}”` : e.text}</motion.span>
            ))}
          </AnimatePresence>
          {compact && els.length > 6 && <span className="text-[11px] text-[#8a857f]">+{els.length - 6}</span>}
        </div>
      )}
    </div>
  );
}

/** every action the agent takes, newest on top; a picture it finds shows itself */
export function AgentFeed({ live, origin, onScene }: { live: Live | undefined; origin: string; onScene: (i: number) => void }) {
  const ev = (live?.events ?? []).slice(-40).reverse();
  const r = live?.render;
  return (
    <div className="space-y-2">
      {r && r.stage !== "done" && (
        <div className="rounded-[12px] bg-[#1f1c1b] p-3 text-white">
          <div className="flex justify-between text-[12.5px] font-semibold"><span>{r.stage === "encoded" ? "Encoding" : "Rendering"} the film</span><span className="font-mono">{r.done}/{r.total}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full bg-[#a6f04a]" animate={{ width: `${(r.done / Math.max(r.total, 1)) * 100}%` }} transition={{ duration: 0.5, ease }} /></div>
        </div>
      )}
      {!ev.length && <p className="text-[13px] text-[#8a857f]">{live?.running ? "Waiting for the agent's first step…" : "No live steps were recorded for this film (it was made before the live feed)."}</p>}
      <AnimatePresence initial={false}>
        {ev.map((e, i) => {
          const [I, c] = ICON[e.kind] ?? [Sparkles, "#5f5b57"];
          return (
            <motion.button key={`${e.t}-${e.text}`} type="button" layout onClick={() => e.scene != null && onScene(e.scene)} initial={{ opacity: 0, x: 16, scale: 0.97 }} animate={{ opacity: i === 0 ? 1 : 0.75, x: 0, scale: 1 }}
              transition={{ duration: 0.35, ease }} className={`flex w-full items-start gap-2.5 rounded-[12px] p-2 text-left ${i === 0 && live?.running ? "bg-[#f1fbe3]" : "hover:bg-[#f7f5ee]"}`}>
              <span className="grid size-7 flex-none place-items-center rounded-full bg-white shadow-[0_0_0_1px_#ecebe5]"><I className="size-3.5" style={{ color: c }} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-snug">{e.text}</span>
                <span className="font-mono text-[10.5px] text-[#a29d96]">{new Date(e.t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}{e.scene != null ? ` · scene ${e.scene + 1}` : ""}</span>
              </span>
              {e.url && !e.url.includes(".json") && <img src={origin + e.url} alt="" className="size-10 flex-none rounded-[8px] border border-[#ecebe5] bg-[#f6f5ef] object-cover" />}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export type Stamp = { text: string; tone: "ok" | "bad" | "info"; key: number } | null;

/* ---------------- the stages ---------------- */
export type Step = { id: string; label: string; state: "done" | "running" | "pending" | "failed" };

/** "Stage 5 of 8": the pipeline as a compact rail in the editor's top bar */
export function StageRail({ steps, doing }: { steps: Step[]; doing?: string }) {
  const k = steps.findIndex((s) => s.state === "running" || s.state === "failed");
  const now = k >= 0 ? steps[k] : null;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-full border border-[#e2e1da] bg-white px-3 py-1.5">
      <div className="flex items-center gap-1">
        {steps.map((s) => (
          <span key={s.id} data-agent={`stage-${s.id}`} title={s.label} className="relative grid size-[18px] place-items-center">
            {s.state === "running" && <motion.span className="absolute inset-0 rounded-full bg-[#a6f04a]" animate={{ scale: [1, 1.8], opacity: [0.6, 0] }} transition={{ duration: 1.3, repeat: Infinity }} />}
            <span className={`relative grid size-[14px] place-items-center rounded-full border-2 ${s.state === "done" ? "border-[#1f1c1b] bg-[#a6f04a]" : s.state === "running" ? "border-[#1f1c1b] bg-white" : s.state === "failed" ? "border-[#9a2f1d] bg-[#ffe7e2]" : "border-[#d9d8d0] bg-[#f6f5ef]"}`}>
              {s.state === "done" && <Check className="size-2" strokeWidth={4} />}</span>
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.span key={now?.id ?? "x"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="truncate text-[13px] font-semibold">
          {now ? <>Stage {k + 1} of {steps.length}: {now.label}{doing && <span className="font-normal text-[#8a857f]"> · {doing}</span>}</> : steps.every((s) => s.state === "done") ? "All stages done" : "Waiting"}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
