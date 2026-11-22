"use client";

import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import useSWR from "swr";
import { AppFrame, Card, PageTitle, ease } from "@/components/app/kit";
import { API } from "@/lib/api";

/* The one-shot experiments (video/oneshot.py): an argon film's narration made again with one plan and one write.
   Read from the static list the script keeps (video/public/oneshot/index.json). */

const ORIGIN = API.replace(/\/api\/?$/, "");
type Experiment = { slug: string; title: string; topic: string; state: string; scenes?: number; lines?: number; calls?: number; usd?: number; video: string; updated: string };

export default function OneShotList() {
  const { data } = useSWR<{ experiments: Experiment[] } | null>(`${ORIGIN}/studio-assets/oneshot/index.json`,
    (u: string) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)), { refreshInterval: 5000 });
  const list = data?.experiments ?? [];

  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <Link href="/app/motion" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5f5b57] hover:text-[#1f1c1b]"><ArrowLeft className="size-4" />Motion videos</Link>
        <PageTitle title="One-shot" accent="experiments" sub="An agent film's narration made again in one model call: plan once with timings, write one file, fix only what breaks. Compare it side by side with the agent's film." />
        {data === undefined ? <p className="text-[15px] text-[#8a857f]">Loading…</p> : list.length === 0 ? (
          <Card className="p-5 text-[14px] text-[#5f5b57]">None yet. From backend/: <code className="rounded bg-[#f1f0ea] px-1.5 py-0.5">.venv/bin/python ../video/oneshot.py --from &lt;argon slug&gt;</code></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((x, i) => (
              <motion.div key={x.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.45, ease }}>
                <Link href={`/app/motion/oneshot/${x.slug}`} className="group block">
                  <Card className="overflow-hidden p-2 transition-transform group-hover:-translate-y-0.5">
                    <div className="relative aspect-video overflow-hidden rounded-[16px] bg-[#0e1a2b]">
                      {x.video && <video src={ORIGIN + x.video} muted preload="metadata" className="h-full w-full object-cover" />}
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#efe7ff] px-2 py-0.5 text-[11.5px] font-bold text-[#5a3a9a]"><FlaskConical className="size-3" />{x.state === "done" ? "Rendered" : x.state === "running" ? "Being made" : x.state}</span>
                    </div>
                    <div className="p-3">
                      <div className="text-[17px] font-bold">{x.title}</div>
                      <div className="text-[13.5px] text-[#8a857f]">{[x.scenes && `${x.scenes} scenes`, x.lines && `${x.lines} lines`, x.calls && `${x.calls} call${x.calls > 1 ? "s" : ""}`, x.usd !== undefined && x.usd !== null && `$${x.usd.toFixed(3)}`, x.updated].filter(Boolean).join(" · ")}</div>
                      <div className="mt-2 flex items-center gap-1 text-[13.5px] font-semibold text-[#3f7d1e]">Compare with the agent&apos;s film<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppFrame>
  );
}
