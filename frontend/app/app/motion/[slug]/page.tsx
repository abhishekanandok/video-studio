"use client";

import { ArrowLeft, Code2, PenLine, Image as ImageIcon, Mic, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppFrame, Card, ease } from "@/components/app/kit";
import { ActivityFeed, CostMeter, FilmControls, PipelineRail, StateChip, type Cost, type Step } from "@/components/app/motion-parts";
import { WorkingCard, type Live } from "@/components/app/motion-live";
import { API, useApi } from "@/lib/api";

/* One motion film being made by the agent (backend/app/api/argon_api.py reads its files): the pipeline rail, what it
   has cost, what the agent is doing right now, and the editor: every scene as a card that fills in as it is made
   (its own backdrop, its pictures, the code the agent wrote, the stills it looked at), then the film itself. */

const ORIGIN = API.replace(/\/api\/?$/, "");
type Scene = { i: number; line: string; beat: string; concept: string; backdrop_kind: string; backdrop_query: string; backdrop: string; pictures: string[]; assets?: { name: string; url: string }[];
  seconds: number | null; code_lines: number; stills: string[]; state: string };
type Status = { slug: string; topic: string; title: string; running: boolean; state: string; queue?: number; reason?: string; steps: Step[]; current: string | null; model: string; started: string;
  theme: { bg?: string[]; ink?: string; accent?: string; accent2?: string; paper?: string; muted?: string; font?: string; display?: string; layout?: string; mood?: string };
  scenes: Scene[]; log: string[]; cost: Cost; video: string };

const SCENE_STATE: Record<string, [string, string]> = {
  planned: ["Planned", "bg-[#f1f0ea] text-[#5f5b57]"], voiced: ["Voiced", "bg-[#e8f1ff] text-[#24508a]"], pictures: ["Pictures in", "bg-[#fff3d6] text-[#8a5a00]"],
  writing: ["Agent writing…", "bg-[#a6f04a]/40 text-[#2f5a12]"], written: ["Code written", "bg-[#efe7ff] text-[#5a3a9a]"], drawn: ["Drawn", "bg-[#a6f04a]/40 text-[#2f5a12]"], ready: ["Checked", "bg-[#1f1c1b] text-white"],
};

function SceneCard({ s, open, onOpen, live }: { s: Scene; open: boolean; onOpen: () => void; live?: Live }) {
  const ls = live?.running ? live.scenes[String(s.i)] : undefined;
  const [label, tone] = SCENE_STATE[s.state] ?? [s.state, "bg-[#f1f0ea]"];
  const thumb = s.stills[1] ?? s.stills[0] ?? s.backdrop;
  return (
    <motion.button type="button" layout onClick={onOpen} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
      className={`w-[248px] flex-none overflow-hidden rounded-[18px] border bg-white text-left shadow-[0_14px_30px_-24px_rgb(0_0_0/0.45)] transition-colors ${open ? "border-[#1f1c1b]" : "border-[#e6e6df] hover:border-[#cfe9a8]"}`}>
      <div className="relative aspect-video overflow-hidden bg-[#101826]">
        <AnimatePresence mode="wait">
          {thumb ? <motion.img key={thumb} src={ORIGIN + thumb} alt="" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease }} className="h-full w-full object-cover" />
            : <motion.div key="empty" className="h-full w-full bg-gradient-to-r from-[#1a2333] via-[#26344a] to-[#1a2333] bg-[length:200%_100%]" animate={{ backgroundPositionX: ["0%", "200%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />}
        </AnimatePresence>
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[11px] font-bold text-white">{String(s.i + 1).padStart(2, "0")}{s.seconds ? ` · ${s.seconds}s` : ""}</span>
        {s.state === "writing" && <motion.span className="absolute inset-x-0 bottom-0 h-1 bg-[#a6f04a]" animate={{ scaleX: [0, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "left" }} />}
      </div>
      <div className="space-y-1.5 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${tone}`}>{label}</span>
          {s.beat && <span className="rounded-full bg-[#f1f0ea] px-2 py-0.5 text-[11.5px] font-semibold text-[#5f5b57]">{s.beat}</span>}
          {s.backdrop_kind && <span className="rounded-full bg-[#f1f0ea] px-2 py-0.5 text-[11.5px] font-semibold text-[#5f5b57]">{s.backdrop_kind === "photo" ? "real photo" : s.backdrop_kind}</span>}
        </div>
        <p className="line-clamp-2 text-[13px] leading-snug text-[#3a3633]">{s.line}</p>
        {ls?.state === "streaming" && live && <WorkingCard ls={ls} now={live.now} assets={s.assets} compact />}
        <div className="flex items-center gap-3 text-[11.5px] text-[#8a857f]">
          <span className="flex items-center gap-1"><ImageIcon className="size-3" />{s.pictures.length}</span>
          {s.code_lines > 0 && <span className="flex items-center gap-1"><Code2 className="size-3" />{s.code_lines} lines by the agent</span>}
        </div>
      </div>
    </motion.button>
  );
}

export default function MotionFilm() {
  const { slug } = useParams<{ slug: string }>();
  const { data, mutate } = useApi<Status>(`/argon/${slug}`, { refreshInterval: (d) => (d && (d.state === "done" || d.state === "stopped" || d.state === "failed" || d.state === "paused") ? 0 : 2500) });
  const [open, setOpen] = useState<number | null>(null);
  const { data: live } = useApi<Live>(`/argon/${slug}/live`, { refreshInterval: (d) => (d && !d.running ? 0 : 1000) });
  if (!data) return <AppFrame><div className="mx-auto max-w-[1240px] text-[15px] text-[#8a857f]">Loading the film…</div></AppFrame>;
  const sel = open !== null ? data.scenes[open] : null;
  const t = data.theme;

  return (
    <AppFrame>
      <div className="mx-auto max-w-[1240px] space-y-5">
        <Link href="/app/motion" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5f5b57] hover:text-[#1f1c1b]"><ArrowLeft className="size-4" />All motion videos</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><StateChip state={data.state} queue={data.queue} /><span className="text-[13px] text-[#8a857f]">{data.model || "model: recorded from the next film on"} · started {data.started}</span></div>
            <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-[-0.02em]">{data.title || data.topic}</h1>
            <p className="text-[15px] text-[#5f5b57]">{data.topic}{t.mood ? ` · ${t.mood}` : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <FilmControls slug={slug} state={data.state} onDone={() => mutate()} />
          <Link href={`/app/motion/${slug}/edit`} className="inline-flex items-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-4 py-2 text-[14px] font-bold shadow-[2px_2px_0_#1f1c1b]"><PenLine className="size-4" />Open in editor</Link>
          {t.bg && (
            <div className="flex items-center gap-2 rounded-[14px] border border-[#e6e6df] bg-white px-3 py-2">
              {[...(t.bg ?? []), t.accent, t.accent2, t.paper].filter(Boolean).map((c, i) => <span key={i} className="size-6 rounded-full border border-black/10" style={{ background: c }} />)}
              <span className="ml-1 text-[12.5px] font-semibold text-[#5f5b57]">{t.display} / {t.font}</span>
            </div>
          )}
          </div>
        </div>

        {data.state === "paused" && data.reason && (
          <div className="rounded-[16px] border border-[#f0c4b8] bg-[#fff1ec] px-4 py-3 text-[14px]"><b>Paused, it needs you:</b> {data.reason} Press Resume to go on from where it stopped, or Remove to take it out of the queue.</div>)}
        <Card className="px-5 pb-3 pt-5"><PipelineRail steps={data.steps} /></Card>

        {data.video && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <Card className="overflow-hidden p-2"><video src={ORIGIN + data.video} controls className="aspect-video w-full rounded-[16px] bg-black" /></Card>
          </motion.div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="min-w-0 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">Editor · {data.scenes.length} scenes</div>
              {t.layout && <div className="hidden max-w-[60%] truncate text-[12.5px] text-[#8a857f] md:block">Layout: {t.layout}</div>}
            </div>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {data.scenes.map((s) => <SceneCard key={s.i} s={s} live={live} open={open === s.i} onOpen={() => setOpen(open === s.i ? null : s.i)} />)}
              {data.scenes.length === 0 && <div className="flex items-center gap-2 py-10 text-[14px] text-[#8a857f]"><Sparkles className="size-4" />The agent is planning the scenes…</div>}
            </div>
            <AnimatePresence>
              {sel && (
                <motion.div key={sel.i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
                  <div className="mt-4 border-t border-[#ecebe5] pt-4">
                    <div className="flex items-start gap-2 text-[15px]"><Mic className="mt-0.5 size-4 flex-none text-[#3f7d1e]" /><span>“{sel.line}”</span></div>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#5f5b57]"><b className="text-[#1f1c1b]">What the agent planned:</b> {sel.concept}</p>
                    <p className="mt-1 text-[13px] text-[#8a857f]"><b>Backdrop:</b> {sel.backdrop_kind} · {sel.backdrop_query}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {(sel.stills.length ? sel.stills : sel.backdrop ? [sel.backdrop] : []).map((u, k) => (
                        <figure key={u}><img src={ORIGIN + u} alt="" className="aspect-video w-full rounded-[10px] object-cover" />
                          <figcaption className="mt-1 text-[11.5px] text-[#8a857f]">{sel.stills.length ? ["Early", "Middle", "End"][k] : "Its backdrop"}</figcaption></figure>
                      ))}
                    </div>
                    {sel.pictures.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{sel.pictures.map((u) => <img key={u} src={ORIGIN + u} alt="" className="size-16 rounded-[10px] border border-[#ecebe5] bg-[#f6f5ef] object-contain p-1" />)}</div>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          <div className="space-y-5">
            <Card className="p-5">
              <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">Cost so far</div>
              <CostMeter cost={data.cost} />
            </Card>
            <Card className="p-5">
              <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">What the agent is doing</div>
              <ActivityFeed log={data.log} running={data.running} />
            </Card>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
