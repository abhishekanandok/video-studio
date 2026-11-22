"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FilmGrid, type Film } from "@/components/app/film-grid";
import { AppFrame, PageTitle } from "@/components/app/kit";
import type { Look } from "@/components/app/look-studio";
import { useApi } from "@/lib/api";

/* Your films, on their own page (opened from the planning page's "Your films" panel): every film, newest first. */
export default function Films() {
  const { data } = useApi<{ films: Film[] }>("/films", { refreshInterval: 5000 });
  const { data: lk } = useApi<{ looks: Look[] }>("/films/looks");
  const names: Record<string, string> = { auto: "Auto look", ...Object.fromEntries((lk?.looks ?? []).map((x) => [x.id, x.name])) };
  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <PageTitle title="Your" accent="films" sub="Every film you have planned, newest first. Open one to watch it, adjust it, or download it."
          right={<Link href="/app/motion" className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-3 py-1.5 text-[13px] font-semibold hover:border-[#a6f04a]"><ArrowLeft className="size-3.5" />Plan a new film</Link>} />
        {!data ? <p className="text-[15px] text-[#8a857f]">Loading…</p> : data.films.length === 0 ? <p className="text-[15px] text-[#8a857f]">None yet: <Link href="/app/motion" className="font-semibold underline">plan the first one</Link>.</p>
          : <FilmGrid films={data.films} names={names} />}
        <p className="mt-10 text-[13px] text-[#8a857f]">
          Looking for older films? <Link href="/app/motion/classic" className="font-semibold text-[#5f5b57] hover:underline">Classic pipeline (Argon)</Link> · <Link href="/app/motion/oneshot" className="font-semibold text-[#5f5b57] hover:underline">One-shot experiments</Link>
        </p>
      </div>
    </AppFrame>
  );
}
