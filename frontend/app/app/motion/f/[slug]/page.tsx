"use client";

import { ArrowLeft, Check, Download, Loader2, PanelsTopLeft, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FilmEditor } from "@/components/app/film-editor";
import { Feed, type FilmLive } from "@/components/app/film-live";
import { DrawChoice, FilmState, LookLine, StepDot, StoryCard, type FilmStatus } from "@/components/app/film-parts";
import { AppFrame, Card } from "@/components/app/kit";
import { API, post, useApi } from "@/lib/api";

/* One film in the storyboard pipeline (ADR 0013, PRD V1-14 "Storyboard review: approve or adjust"), in two views:
   the editor (components/app/film-editor.tsx: preview, timeline, the line under the playhead) and the storyboard grid
   (every card at once). Each card is one spoken line and its design. The creator approves a card, writes a note on it
   (only that card is redrawn), or changes its words (only that line is voiced again). "Write the film" works only when
   every card is approved; the backend (/api/films/<slug>/write) refuses it otherwise. After the film is made, a changed
   card is rewritten into the film on its own ("Rewrite changed lines"). */

const ORIGIN = API.replace(/\/api\/?$/, "");

/* A film made in more than one voice (report.versions: one video + one audio file per language). The switch swaps the
   video and keeps the playhead, so the creator hears the same moment in the other language. */
function VoiceVideo({ s }: { s: FilmStatus }) {
  const versions = s.report?.versions ?? [];
  const router = useRouter();
  const ref = useRef<HTMLVideoElement>(null);
  const [saving, setSaving] = useState("");
  const swap = (slug: string) => {
    const t = ref.current?.currentTime ?? 0, playing = ref.current ? !ref.current.paused : false;
    try { sessionStorage.setItem("film-resume", JSON.stringify({ slug, t, playing })); } catch { /* the switch works without it */ }
    router.replace(`/app/motion/f/${slug}`);
  };
  const resume = () => {
    const v = ref.current; if (!v) return;
    try {
      const r = JSON.parse(sessionStorage.getItem("film-resume") || "null"); sessionStorage.removeItem("film-resume");
      if (r && r.slug === s.slug) { v.currentTime = r.t; if (r.playing) void v.play(); }
    } catch { /* start from the top */ }
  };
  const save = async (url: string, name: string) => {
    setSaving(name);
    try {
      const blob = await (await fetch(ORIGIN + url)).blob(), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
    } finally { setSaving(""); }
  };
  return (
    <Card className="overflow-hidden p-2">
      <video ref={ref} key={s.video} src={ORIGIN + s.video} controls onLoadedMetadata={resume} className="aspect-video w-full rounded-[14px] bg-black" />
      {versions.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-[#1f1c1b] bg-white p-1" role="group" aria-label="Voice">
            {versions.map((v) => (
              <button key={v.slug} type="button" onClick={() => v.slug !== s.slug && swap(v.slug)} aria-pressed={v.slug === s.slug}
                className={`rounded-full px-4 py-1.5 text-[13.5px] font-bold ${v.slug === s.slug ? "bg-[#a6f04a]" : "text-[#5f5b57] hover:bg-[#f3f0ea]"}`}>{v.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-[#8a857f]">Download audio</span>
            {versions.map((v) => (
              <button key={v.slug} type="button" disabled={!!saving} onClick={() => save(v.audio, v.audio.split("/").pop() || "audio.m4a")}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-semibold disabled:opacity-50">
                {saving === v.audio.split("/").pop() ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{v.label}</button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function FilmPage() {
  const { slug } = useParams<{ slug: string }>();
  const [view, setView] = useState<"editor" | "grid">("grid");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const { data: s, mutate } = useApi<FilmStatus>(`/films/${slug}`, {
    refreshInterval: (d) => (!d || d.running.length || d.state === "planning" || d.state === "writing" ? 2500 : 10000) });
  const { data: live } = useApi<FilmLive>(view === "grid" ? `/films/${slug}/live` : null, { refreshInterval: (d) => (!d || d.running.length ? 1500 : 10000) });
  const act = async (what: "approve-all" | "write" | "redo" | "stop") => {
    setBusy(what); setErr("");
    try { await post(`/films/${slug}/${what}`); await mutate(); }
    catch (e) { setErr(String((e as Error).message)); }
    finally { setBusy(""); }
  };
  if (!s) return <AppFrame><p className="text-[15px] text-[#8a857f]">Loading…</p></AppFrame>;
  if (view === "editor") return <FilmEditor film={s} origin={ORIGIN} onChange={() => mutate()} onGrid={() => setView("grid")} />;
  const cards = s.storyboard?.cards ?? [];
  const allApproved = cards.length > 0 && s.approved === s.total;
  const locked = s.state === "planning" || s.state === "writing";
  const written = !!s.report?.lines_final;
  const pending = cards.filter((c) => c.status === "pending").length;

  return (
    <AppFrame>
      <div className="mx-auto max-w-[1240px] space-y-5">
        <div className="flex items-center justify-between gap-2">
          <Link href="/app/motion" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5f5b57] hover:text-[#1f1c1b]"><ArrowLeft className="size-4" />All films</Link>
          <button type="button" onClick={() => setView("editor")} className="inline-flex items-center gap-1.5 rounded-full border border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-semibold"><PanelsTopLeft className="size-4" />Open the editor</button>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FilmState state={s.state} approved={s.approved} total={s.total} changed={s.changed.length} />
              <span className="text-[13px] text-[#8a857f]">{s.style ? s.style.split("+").join(" + ") : "default looks"} · {s.language}{s.cost ? ` · $${s.cost.total_usd.toFixed(3)} so far` : ""}</span>
            </div>
            <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-[-0.02em]">{s.title || s.topic}</h1>
          </div>
          {s.running.length > 0 && <button type="button" disabled={!!busy} onClick={() => act("stop")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold disabled:opacity-50"><Square className="size-3.5" />Stop</button>}
        </div>

        <div className="flex flex-wrap gap-1.5">{s.steps.map((x) => <StepDot key={x.id} s={x} />)}</div>
        {s.error && <p className="rounded-[12px] bg-[#fff1ec] px-3 py-2 text-[13.5px] text-[#9a2f1d]">It stopped with an error: {s.error}</p>}

        {s.video && <VoiceVideo s={s} />}

        {cards.length > 0 && (
          <Card className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-[16px] font-bold">Storyboard review: approve or adjust</div>
              <div className="text-[13.5px] text-[#5f5b57]">{s.approved} of {s.total} cards approved. {written ? "Change a card and rewrite only that line into the film." : "Nothing is written until every card is approved."}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pending > 0 && !locked && <button type="button" disabled={!!busy} onClick={() => act("approve-all")} className="inline-flex items-center gap-1.5 rounded-full border border-[#1f1c1b] bg-white px-4 py-2 text-[14px] font-semibold disabled:opacity-50"><Check className="size-4" />Approve all {pending} waiting</button>}
              {!written ? (
                <DrawChoice film={s} disabled={!allApproved || locked || !!busy || s.running.length > 0} onChange={() => mutate()} />
              ) : (
                <button type="button" disabled={!s.changed.length || !allApproved || locked || !!busy || s.running.length > 0} onClick={() => act("redo")}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-5 py-2 text-[14.5px] font-bold shadow-[3px_3px_0_#1f1c1b] disabled:opacity-40 disabled:shadow-none">
                  {s.state === "writing" ? <><Loader2 className="size-4 animate-spin" />Rewriting…</> : <><RefreshCw className="size-4" />Rewrite changed lines ({s.changed.length})</>}</button>
              )}
            </div>
            <div className="w-full"><LookLine film={s} onChange={() => mutate()} /></div>
            {err && <p className="w-full text-[13.5px] text-[#9a2f1d]">{err}</p>}
          </Card>
        )}

        {s.storyboard && <p className="text-[13px] text-[#8a857f]"><b className="text-[#5f5b57]">Ground for every scene:</b> {s.storyboard.ground}</p>}
        <div className="grid gap-3 lg:grid-cols-2">{cards.map((c) => <StoryCard key={c.id} slug={slug} c={c} locked={locked} onChange={() => mutate()} />)}</div>

        <Card className="p-5">
          <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">{s.running.length ? "What Gemini is doing" : "How it was made"}</div>
          <Feed film={s} live={live} max={30} />
          {s.cost && <p className="mt-3 text-[12.5px] text-[#8a857f]">Cost by stage: {Object.entries(s.cost.stages).map(([k, v]) => `${k} $${v.usd.toFixed(4)}`).join(" · ")}</p>}
        </Card>
      </div>
    </AppFrame>
  );
}
