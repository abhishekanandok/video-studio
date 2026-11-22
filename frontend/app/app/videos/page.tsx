"use client";

import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppFrame, Card, Chip, DarkButton, PageTitle } from "@/components/app/kit";
import { Film, Ground, type ShotName } from "@/components/landing/explainer";
import { useApi } from "@/lib/api";

/* My videos: every real video from the backend (GET /studio/films), refreshed every few seconds, with where it is in
   the pipeline; plus one demo video (the UPI explainer prototype). Filters: All, In progress, Ready, Stopped. */

type FilmRow = { id: number; topic: string; stage: string; running: boolean; minutes?: number; language?: string; video?: string | null; now?: string; created_at: string };
type Filter = "All" | "In progress" | "Ready" | "Stopped";

const STAGE: Record<string, string> = { queued: "Queued", plan: "Planning", research: "Researching", paused: "Waiting for you", scripts: "Writing the script", archive: "Finding pictures", images: "Making pictures", visuals: "Making visuals", motion: "Adding motion", voices: "Recording the voice", render: "Rendering", done: "Ready", stopped: "Stopped", failed: "Stopped" };
const groupOf = (f: FilmRow): Filter => (f.stage === "done" ? "Ready" : f.stage === "stopped" || f.stage === "failed" ? "Stopped" : "In progress");
const SKETCH: ShotName[] = ["coin", "recap", "speed", "pin", "qr", "hook"];

export default function MyVideos() {
  const { data, error } = useApi<FilmRow[]>("/studio/films", { refreshInterval: 5000 });
  const [filter, setFilter] = useState<Filter>("All");
  const films = (data ?? []).filter((f) => f.topic.trim() || f.stage !== "stopped"); // untitled, stopped test runs are hidden
  const shown = films.filter((f) => filter === "All" || groupOf(f) === filter);
  const count = (x: Filter) => (x === "All" ? films.length + 1 : films.filter((f) => groupOf(f) === x).length + (x === "Ready" ? 1 : 0));

  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <PageTitle title="My" accent="videos" sub="Everything you've made, and where each one is." right={<DarkButton href="/app"><Plus className="size-4 text-[#a6f04a]" />New video</DarkButton>} />
        <div className="mb-5 flex flex-wrap gap-2">
          {(["All", "In progress", "Ready", "Stopped"] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${filter === f ? "bg-[#1f1c1b] text-white" : "bg-white text-[#5f5b57] ring-1 ring-[#e6e6df] hover:text-[#1f1c1b]"}`}>
              {f} <span className={filter === f ? "text-[#a6f04a]" : "text-[#a8a39c]"}>{count(f)}</span>
            </button>
          ))}
        </div>
        {error && !data && <Card className="mb-4 p-4 text-[14.5px] text-[#9a2f1d]">Couldn't reach the backend, so only the demo is shown. Start it on port 8020 to see your videos.</Card>}
        {!data && !error && <div className="mb-4 flex items-center gap-2 text-[14.5px] text-[#8a857f]"><Loader2 className="size-4 animate-spin" />Loading your videos…</div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => {
            const g = groupOf(f);
            return (
              <Link key={f.id} href={`/app/v/${f.id}`}>
                <Card className="overflow-hidden p-2 transition-transform hover:-translate-y-1">
                  <div className="relative aspect-video overflow-hidden rounded-[16px] bg-[#1f1c1b]">
                    {f.stage === "done" && f.video ? <video src={`${f.video}#t=2`} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : (
                      <>
                        <Ground shot={SKETCH[f.id % SKETCH.length]} />
                        {g === "In progress" && <div className="absolute inset-0 grid place-items-center"><span className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-semibold"><Loader2 className="size-3.5 animate-spin" />{STAGE[f.stage] ?? f.stage}</span></div>}
                      </>
                    )}
                    <span className="absolute right-2 top-2 z-10"><Chip tone={g === "Ready" ? "lime" : g === "Stopped" ? "plain" : f.stage === "paused" ? "warn" : "ink"}>{STAGE[f.stage] ?? f.stage}</Chip></span>
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-2 text-[17px] font-bold leading-tight">{f.topic || `Untitled video #${f.id}`}</div>
                    <div className="mt-0.5 truncate text-[13.5px] text-[#8a857f]">{[f.minutes && `${f.minutes} min`, f.language, new Date(f.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })].filter(Boolean).join(" · ")}</div>
                    {g === "In progress" && f.now && <div className="mt-1 truncate text-[13px] text-[#5f5b57]">{f.now}</div>}
                  </div>
                </Card>
              </Link>
            );
          })}
          {(filter === "All" || filter === "Ready") && (
            <Link href="/app/v/demo?topic=Explain%20UPI%20in%2010%20minutes">
              <Card className="overflow-hidden p-2 transition-transform hover:-translate-y-1">
                <div className="relative aspect-video overflow-hidden rounded-[16px]"><Film shots={["hook", "qr", "route", "hub", "paid"]} ms={3000} /><span className="absolute right-2 top-2 z-10"><Chip tone="lime">Demo</Chip></span></div>
                <div className="p-3"><div className="text-[17px] font-bold leading-tight">Demo video: Explain UPI in 10 minutes</div><div className="mt-0.5 text-[13.5px] text-[#8a857f]">Walk through every step of the pipeline</div></div>
              </Card>
            </Link>
          )}
        </div>
        {data && !shown.length && (filter === "In progress" || filter === "Stopped") && <div className="mt-2 text-[15px] text-[#8a857f]">Nothing here yet.</div>}
      </div>
    </AppFrame>
  );
}
