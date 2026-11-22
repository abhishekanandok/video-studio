"use client";

/* The creator's films as cards (video, state, look, lines), shared by the planning page's "Your films" panel and the
   films page (/app/motion/films). */

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { FilmState } from "@/components/app/film-parts";
import { Card, ease } from "@/components/app/kit";
import { API } from "@/lib/api";

const ORIGIN = API.replace(/\/api\/?$/, "");
export type Film = { slug: string; topic: string; title: string; style: string; state: string; approved: number; total: number; video: string; started: string; changed: number };

export function FilmGrid({ films, names }: { films: Film[]; names: Record<string, string> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {films.map((f, i) => (
        <motion.div key={f.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.04, duration: 0.45, ease }}>
          <Link href={`/app/motion/f/${f.slug}`} className="group block">
            <Card className="overflow-hidden p-2 transition-transform group-hover:-translate-y-0.5">
              <div className="relative aspect-video overflow-hidden rounded-[16px] bg-[#0e1a2b]">
                {f.video ? <video src={ORIGIN + f.video} muted preload="metadata" className="h-full w-full object-cover" />
                  : <div className="grid h-full place-items-center px-4 text-center text-[14px] font-semibold text-white/70">{f.state === "review" ? "Storyboard waiting for your review" : f.state === "planning" ? "Planning the story…" : f.state === "writing" ? "Writing the film…" : "No video yet"}</div>}
                <span className="absolute left-3 top-3"><FilmState state={f.state} approved={f.approved} total={f.total} changed={f.changed} /></span>
              </div>
              <div className="p-3">
                <div className="text-[17px] font-bold">{f.title || f.topic}</div>
                <div className="text-[13.5px] text-[#8a857f]">{f.style ? f.style.split("+").map((s) => names[s] ?? s).join(" + ") : "Default look"} · {f.total || "…"} lines · {f.started}</div>
                <div className="mt-2 flex items-center gap-1 text-[13.5px] font-semibold text-[#3f7d1e]">{f.state === "review" ? "Review the storyboard" : f.state === "done" ? "Watch · adjust" : "Open"}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></div>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
