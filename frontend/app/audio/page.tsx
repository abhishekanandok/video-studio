"use client";

import { ArrowRight, AudioLines, Plus } from "lucide-react";
import Link from "next/link";
import { Offline } from "@/components/offline";
import { Button, Empty, Label, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/api";

const AUDIO_STAGES: Record<string, string> = {
  queued: "Starting", transcribe: "Transcribing", plan: "Planning scenes", waiting: "Your turn: check the scenes",
  images: "Making pictures", render: "Rendering scenes", join: "Joining the film", done: "Ready", failed: "Stopped with an error",
  stopped: "Stopped",
};

export default function AudioFilms() {
  const { data, error } = useApi<any[]>("/audio/films", { refreshInterval: (d: any) => (d?.some((f: any) => f.running) ? 4000 : 0) });
  if (error) return <Offline message={error.message} />;
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={<Label n="AUDIO">Audio films</Label>} title="Audio films"
        subtitle="Upload a recorded lecture. It is transcribed, split into scenes, each scene gets a Qwen picture or a bullet slide, and the film is cut to your recording."
        action={<Link href="/audio/new"><Button icon={<Plus />}>New audio film</Button></Link>} />
      {!data ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> :
        data.length === 0 ? (
          <Empty icon={<AudioLines />} title="No audio films yet" body="Upload a recording to make the first one."
            action={<Link href="/audio/new"><Button icon={<Plus />}>New audio film</Button></Link>} />
        ) : (
          <div className="border-t border-line">
            {data.map((f) => (
              <Link key={f.id} href={`/audio/${f.id}`} className="group flex items-center gap-5 border-b border-line py-5 hover:bg-surface">
                <span className="w-10 font-mono text-[13px] text-muted">{String(f.id).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-medium">{f.title}</div>
                  <div className="label mt-1 text-muted">
                    {[f.subject, f.file, f.scenes_count ? `${f.scenes_count} scenes` : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className={f.state === "done" || f.state === "waiting" ? "label bg-[#ffd60a] px-2 py-1 text-[#141414]" : "label text-muted"}>
                  {f.state === "stopped" ? "Stopped" : AUDIO_STAGES[f.stage] ?? f.stage}{f.running ? "…" : ""}
                </span>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
