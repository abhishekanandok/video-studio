"use client";

import { ArrowRight, NotebookText, Plus } from "lucide-react";
import Link from "next/link";
import { Offline } from "@/components/offline";
import { Button, Empty, Label, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/api";

const STAGE_NAMES: Record<string, string> = {
  queued: "Starting", extract: "Reading the book", slides: "Making slides", scripts: "Writing narration", voices: "Recording voices",
  render: "Rendering scenes", join: "Joining the film", done: "Ready", failed: "Stopped with an error", stopped: "Stopped",
};

export default function ExamFilms() {
  const { data, error } = useApi<any[]>("/notes/films", { refreshInterval: (d: any) => (d?.some((f: any) => f.running) ? 4000 : 0) });
  if (error) return <Offline message={error.message} />;
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={<Label n="EXAM">Notes films</Label>} title="Exam notes films"
        subtitle="Give it a script, your notes or a book. It turns every fact into crisp bilingual slides, in order, and two hosts talk you through each one."
        action={<Link href="/exam/new"><Button icon={<Plus />}>New notes film</Button></Link>} />
      {!data ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> :
        data.length === 0 ? (
          <Empty icon={<NotebookText />} title="No notes films yet" body="Upload a chapter or paste a script to make the first one."
            action={<Link href="/exam/new"><Button icon={<Plus />}>New notes film</Button></Link>} />
        ) : (
          <div className="border-t border-line">
            {data.map((f) => (
              <Link key={f.id} href={`/exam/${f.id}`} className="group flex items-center gap-5 border-b border-line py-5 hover:bg-surface">
                <span className="w-10 font-mono text-[13px] text-muted">{String(f.id).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-medium">{f.title}</div>
                  <div className="label mt-1 text-muted">
                    {[f.skill, f.subject, f.language, f.slides ? `${f.slides} slides` : null, f.source?.file].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className={f.stage === "done" ? "label bg-[#ffd60a] px-2 py-1 text-[#141414]" : "label text-muted"}>
                  {STAGE_NAMES[f.stage] ?? f.stage}{f.running ? "…" : ""}
                </span>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
