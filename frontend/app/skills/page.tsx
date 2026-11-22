"use client";

import { ArrowRight, Palette, Plus } from "lucide-react";
import Link from "next/link";
import { Offline } from "@/components/offline";
import { SkillPreview } from "@/components/skillcard";
import { SubjectPicker, skillSubject, useSkillSubject } from "@/components/skill-subjects";
import { Button, Empty, Label, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/api";
import { describeCanvas } from "@/lib/skills";


export default function SkillTab() {
  const [subject, setSubject] = useSkillSubject();
  const { data, error } = useApi<any[]>("/slide-skills", { refreshInterval: (d: any) => (d?.some((s: any) => s.state === "working") ? 4000 : 0) });
  if (error) return <Offline message={error.message} />;
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={<Label n="SKILLS">Skill Tab</Label>} title="Slide skills"
        subtitle="Each subject has its own collection of slide styles. Choose a subject to explore its skills, or create a subject and build new looks from references."
        action={<Link href={`/skills/new?subject=${encodeURIComponent(subject)}`}><Button icon={<Plus />}>New {subject} skill</Button></Link>} />
      <SubjectPicker subject={subject} onChange={setSubject} />
      {!data ? <div className="grid gap-5 md:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div> : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="border border-line">
            <div className="grid aspect-video place-items-center bg-[#f2f0ea] text-[13px] text-[#5b5b5b]">The grid paper and the paper card</div>
            <div className="p-4">
              <div className="text-[17px] font-medium">Paper (classic)</div>
              <div className="label mt-1 text-muted">Built in · every skill keeps its card and bullets</div>
            </div>
          </div>
          {data.filter((s) => skillSubject(s) === subject).map((s) => (
            <Link key={s.id} href={`/skills/${s.id}`} className="group border border-line hover:border-ink">
              <SkillPreview s={s} />
              <div className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-medium">{s.name}</div>
                  <div className="label mt-1 text-muted">
                    {[s.subject, s.look ? describeCanvas(s.canvas) : null, s.look?.interlude ? "picture breaks" : null,
                      s.backgrounds?.length ? `${s.backgrounds.length + 1} backgrounds` : null,
                      s.extends_name ? `built on ${s.extends_name}` : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <ArrowRight className="mt-1 size-4 text-muted transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
          {!data.some((s) => skillSubject(s) === subject) && (
            <Empty icon={<Palette />} title={`No ${subject} skills yet`} body="Create your first style with reference slides or a description."
              action={<Link href={`/skills/new?subject=${encodeURIComponent(subject)}`}><Button icon={<Plus />}>Create {subject} skill</Button></Link>} />
          )}
        </div>
      )}
      <p className="text-[13px] text-muted">The crew&apos;s older idea library is still at <Link href="/crew/skills" className="underline">Crew skill ideas</Link>.</p>
    </div>
  );
}
