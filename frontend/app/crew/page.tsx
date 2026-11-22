"use client";

import { ArrowRight, Plus, Users } from "lucide-react";
import Link from "next/link";
import { AGENTS, STEPS } from "@/components/crew";
import { Offline } from "@/components/offline";
import { Button, Empty, Label, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/api";

const STATE: Record<string, string> = { running: "Working", waiting: "Your turn", done: "Finished", failed: "Stopped with an error", stopped: "Stopped" };

export default function CrewFilms() {
  const { data, error } = useApi<any[]>("/crew/films", { refreshInterval: (d: any) => (d?.some((f: any) => f.running) ? 4000 : 0) });
  if (error) return <Offline message={error.message} />;
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={<Label n="CREW">Six agents, eight gates</Label>} title="Crew films"
        subtitle="A notes film made by a team of agents that stops at every step for you: the plan, the text, the script, the voices, the scene plans, the pictures, every scene and the final film."
        action={<Link href="/crew/new"><Button icon={<Plus />}>New crew film</Button></Link>} />

      <div className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => (
          <div key={a.name} className="border-b border-r border-line px-4 py-4">
            <div className="text-[15px] font-medium">{a.name}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{a.owns}</p>
          </div>
        ))}
      </div>

      {!data ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div> :
        data.length === 0 ? (
          <Empty icon={<Users />} title="No crew films yet" body="Paste a script to start one."
            action={<Link href="/crew/new"><Button icon={<Plus />}>New crew film</Button></Link>} />
        ) : (
          <div className="border-t border-line">
            {data.map((f) => (
              <Link key={f.id} href={`/crew/${f.id}`} className="group flex items-center gap-5 border-b border-line py-5 hover:bg-surface">
                <span className="w-10 font-mono text-[13px] text-muted">{String(f.id).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-medium">{f.title}</div>
                  <div className="label mt-1 text-muted">
                    {[f.subject, `${f.approved.length} of ${STEPS.length} gates approved`, f.waiting ? `waiting at: ${STEPS.find((s) => s.key === f.waiting)?.label}` : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className={f.state === "waiting" ? "label bg-[#ffd60a] px-2 py-1 text-[#141414]" : "label text-muted"}>{STATE[f.state] ?? f.state}</span>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
