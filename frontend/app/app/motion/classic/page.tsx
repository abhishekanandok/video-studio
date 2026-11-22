"use client";

import { ArrowRight, Clapperboard, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { AppFrame, Card, PageTitle, ease } from "@/components/app/kit";
import { QueuePanel, StateChip } from "@/components/app/motion-parts";
import { API, post, useApi } from "@/lib/api";

/* CLASSIC: motion videos made by the older Argon motion agent (video/argon.py), kept behind this page until the new
   pipeline (/app/motion, ADR 0013) has made three approved films. Type a topic, and the agent plans the film, voices it,
   finds and paints its pictures, writes every scene's animation itself, checks it and renders it. Open a film to watch
   each step live (/app/motion/<slug>). */

const ORIGIN = API.replace(/\/api\/?$/, "");
type Film = { slug: string; topic: string; title: string; state: string; queue?: number; started: string; video: string; scenes: number; cover: string };
type Demo = { slug: string; title: string; state: string; video: string; cover: string; dna: Record<string, string> };
type Style = { id: string; name: string; blurb: string; ready: boolean; demos: Demo[]; best_for?: string; demo?: string };
const IDEAS = ["The water cycle", "How UPI works", "Why the Ganga floods", "Black holes", "How vaccines train the body"];

function FilmCard({ f, i }: { f: Film; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.45, ease }}>
      <Link href={`/app/motion/${f.slug}`} className="group block">
        <Card className="overflow-hidden p-2 transition-transform group-hover:-translate-y-0.5">
          <div className="relative aspect-video overflow-hidden rounded-[16px] bg-[#0e1a2b]">
            {f.cover && <img src={ORIGIN + f.cover} alt="" className="h-full w-full object-cover" />}
            <span className="absolute left-3 top-3"><StateChip state={f.state} queue={f.queue} /></span>
          </div>
          <div className="p-3">
            <div className="text-[17px] font-bold">{f.title || f.topic}</div>
            <div className="text-[13.5px] text-[#8a857f]">{f.topic} · {f.scenes} scenes · {f.started}</div>
            <div className="mt-2 flex items-center gap-1 text-[13.5px] font-semibold text-[#3f7d1e]">{f.state === "running" ? "Watch it being made" : f.state === "queued" ? "Waiting its turn" : f.state === "stopped" ? "Open · Resume" : "Open"}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function MotionHome() {
  const { data } = useApi<{ films: Film[] }>("/argon", { refreshInterval: 5000 });
  const { data: st } = useApi<{ styles: Style[] }>("/argon/styles", { refreshInterval: 8000 });
  const [style, setStyle] = useState("");
  const { data: qd, mutate: remq } = useApi<{ queue: { slug: string; title: string; style: string; lane: string; state: string; reason: string; position: number }[]; blocked: null | { slug: string; title: string; style: string; lane: string; state: string; reason: string; position: number } }>("/argon/queue", { refreshInterval: 4000 });
  // films written the Claude way (video/argon.py claude_style): one plan, the film's own small library, the kit only
  const { data: cl } = useSWR<{ films: string[] } | null>(`${ORIGIN}/studio-assets/argon/_claude.json`,
    (u: string) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)), { refreshInterval: 8000 });
  const claude = new Set(cl?.films ?? []);
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  const [vertical, setVertical] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const start = async (t = topic, sty = style) => {
    if (!t.trim() || busy) return;
    setBusy(true); setErr("");
    try { const r = await post<{ slug: string }>("/argon", { topic: t, language, vertical, style: sty }); router.push(`/app/motion/${r.slug}`); }
    catch (e) { setErr(String((e as Error).message)); setBusy(false); }
  };

  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <Link href="/app/motion" className="mb-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#3f7d1e] hover:underline">← Back to the new pipeline (storyboard review)</Link>
        <PageTitle title="Classic" accent="motion agent" sub="The older Argon pipeline, kept for comparison: it writes every scene without a storyboard review. New films are made from the Motion page." />
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-[#3f7d1e]" />
            <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && start()} placeholder="What is the video about? e.g. The water cycle"
              className="min-w-[260px] flex-1 rounded-[14px] border border-[#e2e1da] bg-white px-4 py-3 text-[16px] outline-none focus:border-[#a6f04a]" />
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-[12px] border border-[#e2e1da] bg-white px-3 py-3 text-[14px] font-semibold">
              <option>English</option><option>Hinglish</option><option>Hindi</option>
            </select>
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded-[12px] border border-[#e2e1da] bg-white px-3 py-3 text-[14px] font-semibold">
              <option value="">Style: agent decides</option>
              {st?.styles.filter((x) => x.ready).map((x) => <option key={x.id} value={x.id}>Style: {x.name}</option>)}
            </select>
            <button type="button" onClick={() => setVertical(!vertical)} className={`rounded-[12px] border px-3 py-3 text-[14px] font-semibold ${vertical ? "border-[#1f1c1b] bg-[#1f1c1b] text-white" : "border-[#e2e1da] bg-white"}`}>{vertical ? "9:16 Short" : "16:9 Video"}</button>
            <button type="button" onClick={() => start()} disabled={busy || !topic.trim()}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-5 py-2.5 text-[15px] font-bold shadow-[3px_3px_0_#1f1c1b] transition-transform hover:-translate-y-px disabled:opacity-50">
              {busy ? <><Loader2 className="size-4 animate-spin" />Starting…</> : <><Clapperboard className="size-4" />Make it</>}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{IDEAS.map((x) => <button key={x} type="button" onClick={() => setTopic(x)} className="rounded-full border border-[#e2e1da] bg-white px-3 py-1 text-[13px] font-semibold text-[#5f5b57] hover:border-[#a6f04a]">{x}</button>)}</div>
          {err && <p className="mt-2 text-[14px] text-[#9a2f1d]">{err}</p>}
        </Card>

        <div className="mt-6"><QueuePanel data={qd} onChange={() => remq()} /></div>

        <h2 className="mb-1 mt-8 text-[20px] font-bold">Styles</h2>
        <p className="mb-3 text-[14px] text-[#8a857f]">One style at a time. Inside a style, every film gets its own DNA (material, set, palette, light, camera, motion), so no two look alike.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(st?.styles ?? []).map((x, i) => {
            const next = !x.ready && (st?.styles ?? []).findIndex((y) => !y.ready) === i;
            return (
              <Card key={x.id} className={`p-4 ${x.ready ? "" : "opacity-70"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[16px] font-bold">{i + 1}. {x.name}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${x.demos.some((d) => d.state === "done") ? "bg-[#a6f04a]" : x.ready ? "bg-[#fff3d6] text-[#8a5a00]" : next ? "bg-[#1f1c1b] text-white" : "bg-[#f1f0ea] text-[#8a857f]"}`}>
                    {x.demos.some((d) => d.state === "done") ? "Demo ready" : x.ready ? (x.demos.length ? "Demo being made" : "Ready to try") : next ? "Next up" : "Planned"}</span>
                </div>
                {x.blurb && <p className="mt-1 text-[13px] leading-snug text-[#5f5b57]">{x.blurb}</p>}
                {x.best_for && <p className="mt-1.5 text-[12px] leading-snug text-[#8a857f]"><b className="text-[#5f5b57]">Best for:</b> {x.best_for}</p>}
                {x.ready && x.demo && !x.demos.length && (
                  <button type="button" onClick={() => start(x.demo!, x.id)} className="mt-2 rounded-full border border-[#1f1c1b] px-3 py-1 text-[12.5px] font-semibold hover:bg-[#a6f04a]">Make its demo: {x.demo.length > 48 ? x.demo.slice(0, 48) + "…" : x.demo}</button>)}
                {x.demos.map((dm) => (
                  <Link key={dm.slug} href={`/app/motion/${dm.slug}`} className="mt-3 flex gap-3 rounded-[12px] border border-[#ecebe5] p-2 hover:border-[#a6f04a]">
                    <div className="h-14 w-24 flex-none overflow-hidden rounded-[8px] bg-[#1a2333]">{dm.cover && <img src={ORIGIN + dm.cover} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold">{dm.title}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">{["material", "set", "motion"].filter((k) => dm.dna[k]).map((k) => <span key={k} className="max-w-full truncate rounded-full bg-[#f1f0ea] px-1.5 text-[10.5px] text-[#5f5b57]">{dm.dna[k]}</span>)}</div>
                    </div>
                  </Link>
                ))}
              </Card>
            );
          })}
        </div>

        {data && data.films.some((f) => claude.has(f.slug)) && (
          <>
            <h2 className="mb-1 mt-8 text-[20px] font-bold">Claude-style films</h2>
            <p className="mb-3 text-[14px] text-[#8a857f]">Planned once with timings, each film writes its own small library and builds every scene as a short timeline on the kit: no motion-library guessing, so it compiles first time far more often.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.films.filter((f) => claude.has(f.slug)).map((f, i) => <FilmCard key={f.slug} f={f} i={i} />)}</div>
          </>
        )}

        <div className="mb-3 mt-8 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[20px] font-bold">Your motion videos</h2>
          <Link href="/app/motion/oneshot" className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#5a3a9a] hover:underline">One-shot experiments<ArrowRight className="size-3.5" /></Link>
        </div>
        {!data ? <p className="text-[15px] text-[#8a857f]">Loading…</p> : data.films.length === 0 ? <p className="text-[15px] text-[#8a857f]">None yet: make the first one above.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.films.filter((f) => !claude.has(f.slug)).map((f, i) => <FilmCard key={f.slug} f={f} i={i} />)}
          </div>
        )}
      </div>
    </AppFrame>
  );
}
