"use client";

import { Clapperboard } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/providers";
import { VoicePicker, type Voices } from "@/components/studio";
import { Button, Card, Empty, PageHeader, Sheet, Skeleton } from "@/components/ui";
import { Offline } from "@/components/offline";
import { api, useApi } from "@/lib/api";

const STAGE_LABEL: Record<string, string> = {
  plan: "Planning", scripts: "Writing scripts", images: "Painting images", voices: "Recording voices", render: "Rendering",
  done: "Ready", paused: "Waiting for you", stopped: "Stopped", failed: "Failed", queued: "Starting",
};

export default function Studio() {
  const { data: films, error } = useApi<any[]>("/studio/films", { refreshInterval: 4000 });
  if (error) return <Offline message={error.message} />;
  return (
    <>
      <PageHeader eyebrow="06 — Studio" title="Studio" subtitle="Make a documentary about anything: any narration, story, language and look. Every stage of the pipeline is visible."
        action={<div className="flex gap-3"><Button href="/studio/skills" variant="secondary">Skills</Button><Button href="/studio/cinema" variant="secondary">Cinema</Button><Button href="/studio/new" icon={<Clapperboard />}>New film</Button></div>} />
      <HouseVoices />
      <div className="mt-8 border-t border-line">
        {!films ? <Skeleton className="h-24" /> : films.length === 0 ? (
          <Card className="mt-6"><Empty icon={<Clapperboard />} title="No films yet" body="Start a new film, or press Generate video on any lesson." /></Card>
        ) : films.map((f, i) => (
          <Link key={f.id} href={`/studio/${f.id}`} className="group grid grid-cols-[3rem_1fr_auto_1.5rem] items-center gap-x-6 border-b border-line py-6">
            <span className="label text-muted group-hover:text-accent">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0">
              <span className="block truncate font-display text-2xl font-medium tracking-tight group-hover:text-accent">{f.topic}</span>
              <span className="label mt-2 block text-muted">
                {f.kind === "lesson" ? "Lesson video" : f.narration} · {f.language} · {f.minutes} min · {f.roles.map((r: any) => r.voice || "—").join(" + ")}
              </span>
            </span>
            <span className={`label ${f.stage === "done" ? "text-ink" : f.running ? "text-accent" : "text-muted"}`}>{STAGE_LABEL[f.stage] ?? f.stage}</span>
            <span className="text-lg text-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent">↗</span>
          </Link>
        ))}
      </div>
    </>
  );
}

/** The two voices every lesson-page video uses. */
function HouseVoices() {
  const { data, mutate } = useApi<Voices>("/studio/house-voices");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Voices>({});
  const toast = useToast();
  useEffect(() => { if (data) setDraft(data); }, [data]);
  const save = async () => {
    try {
      mutate(await api("/studio/house-voices", { method: "PUT", body: JSON.stringify({ voices: draft }) }), false);
      setOpen(false);
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't save", body: e.message });
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface px-5 py-4">
      <span className="text-[14px] text-muted">Lesson videos use <b className="text-ink">{data?.Kabir ?? "…"}</b> (Kabir) and <b className="text-ink">{data?.Tara ?? "…"}</b> (Tara)</span>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Change</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Voices for lesson videos" subtitle="Used by Generate video on every lesson page." wide>
        <VoicePicker roles={["Kabir", "Tara"]} value={draft} onChange={setDraft} />
        <div className="mt-5 flex justify-end"><Button onClick={save}>Save</Button></div>
      </Sheet>
    </div>
  );
}
