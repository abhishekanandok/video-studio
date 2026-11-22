"use client";

import { ArrowRight, Plus, Wand2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { AppFrame, Card, Chip, DarkButton, PageTitle, ease } from "@/components/app/kit";
import { Film, type ShotName } from "@/components/landing/explainer";
import { skillNo, type VSkills } from "@/components/app/skill-chooser";
import { API, useApi } from "@/lib/api";

/* Skills (V1, docs/system/lld/visuals/skills-v1.md): ONE built-in skill, SKILL 01 the Board explainer, whose
   capabilities (captions, numbers, flows, maps, stickers) are switched on its page, plus the skills the creator made.
   A card opens the skill's page, the way the exam-notes Skill Tab works. "Make a skill" is a short chat. */

const ORIGIN = API.replace(/\/api\/?$/, "");

export default function Skills() {
  const { data } = useApi<VSkills>("/vskills");
  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <PageTitle title="Your" accent="skills" sub="Five looks, each with its own renderer and theme, and the skills you make on them. Open one to see it on your topic."
          right={<DarkButton href="/app/skills/new"><Plus className="size-4 text-[#a6f04a]" />Make a skill</DarkButton>} />
        {!data ? <div className="text-[15px] text-[#8a857f]">Loading skills…</div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.cards.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5, ease }}>
                <Link href={`/app/skills/${s.id}`} className="group block h-full">
                  <Card className="h-full overflow-hidden p-2 transition-transform group-hover:-translate-y-0.5">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-[16px] bg-[#efeee8]">
                      {s.samples?.[0] ? <img src={ORIGIN + s.samples[0]} alt="" className="h-full w-full object-cover" />
                        : s.renderer === "motion" ? <div className="grid h-full place-items-center text-[14px] text-[#8a857f]">Open to render a sample</div>
                        : <Film shots={(s.sample?.length ? s.sample : ["hook"]) as ShotName[]} ms={3000 + i * 200} />}
                      <span className="absolute left-3 top-3 rounded-full bg-[#1f1c1b] px-2.5 py-1 font-mono text-[11.5px] font-bold tracking-[0.06em] text-[#a6f04a]">{skillNo(s.no)}</span>
                    </div>
                    <div className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[17px] font-bold">{s.name}</span>
                        <Chip tone={s.id.startsWith("custom") ? "ink" : "lime"}>{s.id.startsWith("custom") ? "Yours" : "Built in"}</Chip>
                        {!s.ready && <Chip tone="warn">Building</Chip>}
                        {s.id.startsWith("custom") && s.extends && <Chip>on {data.cards.find((c) => c.id === s.extends)?.name}</Chip>}
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[13.5px] leading-snug text-[#5f5b57]">{s.about}</p>
                      {s.capabilities && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">{s.capabilities.map((c) => (
                          <span key={c.id} className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${c.on ? "bg-[#a6f04a]/40 text-[#2f5a12]" : "bg-[#f1f0ea] text-[#a29d96] line-through"}`}>{c.name}</span>
                        ))}</div>
                      )}
                      <div className="mt-3 flex items-center gap-1 text-[13.5px] font-semibold text-[#3f7d1e]">Open<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
            <Link href="/app/skills/new" className="grid min-h-[260px] place-items-center rounded-[22px] border-2 border-dashed border-[#d9d8d0] p-6 text-center hover:border-[#a6f04a]">
              <div><Wand2 className="mx-auto size-7" /><div className="mt-2 text-[17px] font-bold">Make a skill</div><div className="text-[14px] text-[#8a857f]">Name a topic and answer a few quick questions: we make the look for it.</div></div>
            </Link>
          </div>
        )}
      </div>
    </AppFrame>
  );
}
