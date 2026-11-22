"use client";

import { Check, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API, post, useApi } from "@/lib/api";
import { Bar, Tabs, cx } from "./ui";

export const MEDIA = API.replace(/\/api$/, "");
export type Voices = Record<string, string>;

/** One shared <audio> so starting a sample stops the previous one. */
function usePlayer() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => ref.current?.pause(), []);
  const toggle = (url: string) => {
    if (playing === url) {
      ref.current?.pause();
      setPlaying(null);
      return;
    }
    ref.current?.pause();
    const a = new Audio(`${MEDIA}${url}`);
    a.onended = () => setPlaying(null);
    a.play();
    ref.current = a;
    setPlaying(url);
  };
  return { playing, toggle };
}

export function PlayButton({ url, className }: { url: string | null; className?: string }) {
  const { playing, toggle } = usePlayer();
  if (!url) return <span className={cx("grid size-8 place-items-center border border-line text-muted/50", className)}><Play className="size-3.5" /></span>;
  return (
    <button onClick={() => toggle(url)} className={cx("grid size-8 shrink-0 place-items-center border transition-colors", playing ? "border-accent bg-accent text-white" : "border-line hover:border-ink hover:text-accent", className)}
      aria-label={playing ? "Pause" : "Play"}>
      {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
    </button>
  );
}

/** Every Gemini voice reading the same Hinglish lines; assign one to each narrator. */
export function VoicePicker({ roles, value, onChange }: { roles: string[]; value: Voices; onChange: (v: Voices) => void }) {
  const { data } = useApi<any>("/studio/voices", { refreshInterval: (d: any) => (d?.ready ? 0 : 5000) });
  const [model, setModel] = useState<string>("");
  const { playing, toggle } = usePlayer();
  const models: string[] = data?.models ?? [];
  const m = model || models[0] || "";
  if (!data?.ready) return <p className="text-sm text-muted">Recording voice samples… they'll appear here in a minute or two.</p>;
  return (
    <div>
      <p className="font-serif text-[16px] italic text-muted">Every voice reads the same lines: “{data.sample}”</p>
      {models.length > 1 && (
        <div className="mt-4">
          <Tabs id="tts-model" value={m} onChange={setModel} tabs={models.map((x) => ({ value: x, label: x.replace("gemini-", "").replace("-preview", "") }))} />
        </div>
      )}
      <div className="mt-4 grid border-t border-line" style={{ gridTemplateColumns: `1fr repeat(${roles.length}, auto)` }}>
        <div className="label grid grid-cols-subgrid border-b border-line py-2 text-muted" style={{ gridColumn: `span ${roles.length + 1}` }}>
          <span>Voice</span>{roles.map((r) => <span key={r} className="w-20 text-center">{r}</span>)}
        </div>
        {data.voices.map((v: any) => {
          const url = v.samples?.[m] ?? null;
          return (
            <div key={v.name} className="grid grid-cols-subgrid items-center border-b border-line py-2" style={{ gridColumn: `span ${roles.length + 1}` }}>
              <div className="flex min-w-0 items-center gap-3">
                <button disabled={!url} onClick={() => url && toggle(url)} aria-label={`Play ${v.name}`}
                  className={cx("grid size-8 shrink-0 place-items-center border transition-colors", playing === url ? "border-accent bg-accent text-white" : "border-line hover:border-ink hover:text-accent", !url && "opacity-40")}>
                  {playing === url ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                </button>
                <span className="text-[15px] font-medium">{v.name}</span>
                <span className="label text-muted">{v.character}</span>
              </div>
              {roles.map((h) => (
                <div key={h} className="flex w-20 justify-center">
                  <button onClick={() => onChange({ ...value, [h]: v.name })} aria-label={`Use ${v.name} for ${h}`}
                    className={cx("grid size-7 place-items-center border transition-colors", value[h] === v.name ? "border-ink bg-ink text-bg" : "border-line hover:border-ink")}>
                    {value[h] === v.name && <Check className="size-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STAGES = [
  ["plan", "Plan", "Split the lesson into acts"],
  ["scripts", "Scripts", "Write each act"],
  ["images", "Images", "An image for every scene"],
  ["motion", "Motion", "Video shots and parallax"],
  ["voices", "Voices", "Every line spoken"],
  ["visuals", "Visuals", "Sticky notes, string, cut-outs, checked"],
  ["render", "Render", "Animate and assemble"],
] as const;
// the archival documentary agent: research first, real sources, real archival images
const ARCHIVAL_STAGES = [
  ["research", "Research", "Search, read and verify sources"],
  ["scripts", "Scripts", "Chapters from verified facts only"],
  ["archive", "Archive", "Real archival images, checked"],
  ["voices", "Voices", "Every line spoken"],
  ["visuals", "Visuals", "Layouts, real photos, cut-outs, checked"],
  ["render", "Render", "Animate and assemble"],
] as const;

/** The pipeline, stage by stage, with live counts. */
/* One plain sentence on what the agent is doing this moment (or what it is waiting on), so a quiet page never looks stuck. */
export function Now({ text }: { text?: string | null }) {
  if (!text) return null;
  const waiting = /waiting and retrying/.test(text);
  return (
    <div className={`flex items-start gap-3 border px-4 py-3 text-sm ${waiting ? "border-red-300 bg-red-50 text-red-900" : "border-line bg-surface text-ink"}`}>
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${waiting ? "bg-red-500" : "animate-pulse bg-green-600"}`} />
      <span><span className="font-mono text-[11px] uppercase tracking-wider text-muted">Right now · </span>{text}</span>
    </div>
  );
}

export function Pipeline({ stage, stages, running, note = "" }: { stage: string; stages: Record<string, { done?: number; total?: number; step?: string | null }>; running: boolean; note?: string }) {
  const list = ("research" in stages ? ARCHIVAL_STAGES : STAGES) as readonly (readonly [string, string, string])[];
  const order = list.map((s) => s[0]) as string[];
  // a pause belongs to the step it waits before: the research review, the hold before the visuals, or the voice choice
  const pausedAt = note.includes("Research ready") ? "scripts" : note.includes("Held before the visuals") ? "visuals" : "voices";
  const at = (k: string) => { const i = order.indexOf(k); return i < 0 ? order.length - 1 : i; };
  const cur = stage === "done" ? order.length : stage === "paused" ? at(pausedAt) : ["failed", "stopped", "queued"].includes(stage) ? at(lastStarted(order, stages)) : at(stage);
  const waitNote = pausedAt === "scripts" ? "Waiting for you to approve the research" : pausedAt === "visuals" ? "Held before the visuals" : "Waiting for your voice choice";
  return (
    <ol className={`grid grid-cols-1 gap-px border border-line bg-line ${list.length > 5 ? "sm:grid-cols-6" : "sm:grid-cols-5"}`}>
      {list.map(([key, label, hint], i) => {
        const c = stages[key] ?? {};
        const pct = c.total ? Math.round(((c.done ?? 0) / c.total) * 100) : 0;
        const state = i < cur || stage === "done" ? "done" : i === cur ? (stage === "paused" ? "waiting" : running ? "active" : "stopped") : "todo";
        return (
          <li key={key} className="bg-bg p-4">
            <div className="flex items-center justify-between">
              <span className={cx("label", state === "active" ? "text-accent" : state === "done" ? "text-ink" : "text-muted")}>{String(i + 1).padStart(2, "0")} {label}</span>
              {state === "done" && <Check className="size-3.5" />}
              {state === "active" && <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" /><span className="relative size-2 rounded-full bg-accent" /></span>}
            </div>
            <div className="mt-3 font-display text-2xl font-medium tracking-tight">{c.total ? `${state === "done" ? c.total : c.done ?? 0}/${c.total}` : state === "done" ? "Done" : "—"}</div>
            <Bar value={state === "done" ? 100 : pct} className="mt-3" />
            {state === "active" && c.step && <div className="mt-2 text-[12px] font-medium text-accent">{c.step}</div>}
            <div className="mt-2 text-[12px] text-muted">{state === "waiting" ? waitNote : state === "todo" ? `Waiting · ${hint}` : hint}</div>
          </li>
        );
      })}
    </ol>
  );
}

/** The furthest step that has started (for a film that stopped or failed part-way). */
function lastStarted(order: string[], stages: Record<string, { done?: number; total?: number }>): string {
  let last = order[0];
  for (const k of order) if (stages[k] && ((stages[k].total ?? 0) > 0 || (stages[k].done ?? 0) > 0)) last = k;
  return last;
}

const STAGE_WORD: Record<string, string> = {
  plan: "Planning", scripts: "Writing the script", images: "Painting the scenes", voices: "Recording the voices",
  render: "Rendering", paused: "Waiting", stopped: "Stopped", failed: "Failed", queued: "Starting",
};

/** The lesson page's one-click video: exam-ready, two co-hosts, Hinglish. No options by design. */
export function LessonVideo({ lessonId }: { lessonId: number }) {
  const { data: f, mutate } = useApi<any>(`/lessons/${lessonId}/video`, { refreshInterval: (d: any) => (d?.running ? 5000 : 0) });
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    try {
      mutate(await post(`/lessons/${lessonId}/video`), false);
    } finally {
      setBusy(false);
    }
  };
  if (f?.video)
    return (
      <div className="mt-8 border border-line bg-surface">
        <video src={`${MEDIA}${f.video}`} controls className="w-full bg-black" />
        <div className="label px-5 py-3 text-muted">This lesson as a film · Kabir &amp; Tara · Hinglish</div>
      </div>
    );
  const order = ["plan", "scripts", "images", "motion", "voices", "render"];
  const i = Math.max(0, order.indexOf(f?.stage));
  const c = f?.stages?.[f?.stage] ?? {};
  const pct = f ? Math.round(((i + (c.total ? (c.done ?? 0) / c.total : 0)) / order.length) * 100) : 0;
  return (
    <div className="mt-8 flex flex-wrap items-center gap-5 border border-line bg-surface px-6 py-5">
      <div className="min-w-0 flex-1">
        <div className="label text-accent">Watch it</div>
        <div className="mt-1 text-lg font-medium tracking-tight">{f ? `${STAGE_WORD[f.stage] ?? f.stage}…` : "Turn this lesson into a film"}</div>
        {f ? <Bar value={pct} className="mt-3 max-w-md" /> : <p className="mt-1 text-sm text-muted">Two narrators explain the whole lesson in Hinglish. About 1.5–2 hours to make.</p>}
      </div>
      {!f && <button onClick={make} disabled={busy} className="label h-10 border border-ink bg-ink px-4 text-bg transition-colors hover:border-accent hover:bg-accent hover:text-white disabled:opacity-40">{busy ? "Starting…" : "Generate video"}</button>}
      {f && !f.running && f.stage !== "done" && <button onClick={make} className="label h-10 border border-line px-4 hover:border-ink hover:text-accent">Resume</button>}
    </div>
  );
}

type Cost = { total_usd: number; stages: Record<string, { calls: number; usd: number }>; models: Record<string, { calls: number; usd: number; tokens_in?: number; tokens_out?: number; seconds?: number }>; unpriced: string[]; updated?: string };
const COST_LABEL: Record<string, string> = { setup: "Setup", plan: "Plan & sources", scripts: "Scripts", images: "Images", motion: "Motion (Veo + parallax)", voices: "Voices", render: "Render", edits: "Edits" };
const usd = (x: number) => (x < 0.01 && x > 0 ? "<$0.01" : `$${x.toFixed(2)}`);

/** What this film has cost so far, from the real usage Google reported for every call (see video/cost.py). */
export function CostPanel({ cost }: { cost: Cost | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!cost) return null;
  const stages = Object.entries(cost.stages).sort((a, b) => b[1].usd - a[1].usd);
  return (
    <div className="border border-line bg-surface">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3 text-left">
        <span className="label text-muted">Cost so far</span>
        <span className="flex items-center gap-3"><span className="text-lg font-medium tracking-tight">{usd(cost.total_usd)}</span>
          <span className="label text-muted">{open ? "Hide ▴" : "Details ▾"}</span></span>
      </button>
      {open && (
        <div className="border-t border-line px-5 py-4 text-[14px]">
          {stages.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1"><span>{COST_LABEL[k] ?? k} <span className="text-muted">· {v.calls} calls</span></span><span>{usd(v.usd)}</span></div>
          ))}
          <div className="mt-3 border-t border-line pt-3">
            {Object.entries(cost.models).map(([m, v]) => (
              <div key={m} className="flex justify-between py-0.5 text-[13px] text-muted">
                <span>{m}</span>
                <span>{v.seconds ? `${v.seconds}s video` : `${((v.tokens_in ?? 0) / 1000).toFixed(0)}k in · ${((v.tokens_out ?? 0) / 1000).toFixed(0)}k out`} · {usd(v.usd)}</span>
              </div>
            ))}
          </div>
          {cost.unpriced.length > 0 && <p className="mt-3 text-[13px] text-accent">No price on file for {cost.unpriced.join(", ")}: counted but not in the total.</p>}
          <p className="mt-3 text-[12px] text-muted">From the usage Google returns with each call, at Vertex list prices. Your Google Cloud bill is the final word.</p>
        </div>
      )}
    </div>
  );
}
