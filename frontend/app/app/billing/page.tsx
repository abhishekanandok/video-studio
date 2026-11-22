"use client";

import { Check, IndianRupee } from "lucide-react";
import { AppFrame, Card, Chip, PageTitle } from "@/components/app/kit";
import { useApi } from "@/lib/api";

type Usage = { openrouter: { today_usd?: number; month_usd?: number; limit_usd?: number; remaining_usd?: number; error?: string } | null; films_usd: number };
const usd = (n?: number) => `$${(n ?? 0).toFixed(2)}`;

/* Billing: what the AI really costs us (live from GET /usage), then pay per video by UPI (sample data). */
const PAID = [["Explain UPI in 10 minutes", "21 Oct", "₹199"], ["How NPCI routes a payment", "14 Oct", "₹199"], ["Is your PIN safe? (Short pack)", "9 Oct", "₹199"]];

export default function Billing() {
  const { data: u } = useApi<Usage>("/usage", { refreshInterval: 15000 });
  const or = u?.openrouter;
  const used = or?.limit_usd ? Math.min(1, (or.today_usd ?? 0) / or.limit_usd) : 0;
  return (
    <AppFrame>
      <div className="mx-auto max-w-[980px]">
        <PageTitle title="Pay per" accent="video" sub="No subscription. No card. Pay by UPI when a video is ready." />
        <Card className="mb-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[18px] font-bold">AI spend</span><Chip tone="lime">live</Chip></div>
          {!u ? <div className="mt-3 text-[14.5px] text-[#8a857f]">Loading…</div> : (
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              <div>
                <div className="text-[13px] font-semibold text-[#8a857f]">OpenRouter today</div>
                <div className="text-[30px] font-bold tracking-[-0.03em]">{or?.error ? "—" : usd(or?.today_usd)}</div>
                {or?.limit_usd ? <>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#efeee8]"><div className={`h-full rounded-full ${used > 0.8 ? "bg-[#e0663f]" : "bg-[#a6f04a]"}`} style={{ width: `${Math.max(2, used * 100)}%` }} /></div>
                  <div className="mt-1 text-[12.5px] text-[#8a857f]">{usd(or.remaining_usd)} left of the {usd(or.limit_usd)} daily cap</div>
                </> : null}
              </div>
              <div><div className="text-[13px] font-semibold text-[#8a857f]">OpenRouter this month</div><div className="text-[30px] font-bold tracking-[-0.03em]">{or?.error ? "—" : usd(or?.month_usd)}</div><div className="mt-1 text-[12.5px] text-[#8a857f]">Claude scripts and chat, pictures</div></div>
              <div><div className="text-[13px] font-semibold text-[#8a857f]">All videos, all time</div><div className="text-[30px] font-bold tracking-[-0.03em]">{usd(u.films_usd)}</div><div className="mt-1 text-[12.5px] text-[#8a857f]">Google and OpenRouter, from each video&apos;s ledger</div></div>
            </div>
          )}
        </Card>
        <div className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
          <Card className="p-6">
            <div className="flex items-baseline gap-1"><span className="text-[52px] font-bold tracking-[-0.04em]">₹199</span><span className="text-[16px] text-[#8a857f]">/ video</span></div>
            <div className="mt-4 space-y-2.5">{["The full video, up to 15 min", "Three Shorts, captioned", "Every fact with its source", "Every version saved", "Re-render one scene, free"].map((x) => <div key={x} className="flex items-center gap-2.5 text-[15px]"><span className="grid size-5 place-items-center rounded-full bg-[#a6f04a]"><Check className="size-3" strokeWidth={3} /></span>{x}</div>)}</div>
            <div className="mt-5 flex items-center gap-2 rounded-[14px] bg-[#f6f6f2] p-3 text-[14px]"><IndianRupee className="size-4" />Any UPI app: GPay, PhonePe, Paytm, BHIM</div>
          </Card>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-5"><span className="text-[18px] font-bold">Payments</span><Chip tone="lime">₹597 this month</Chip></div>
            {PAID.map(([t, d, a]) => <div key={t} className="flex items-center gap-4 border-t border-[#ecebe5] px-5 py-3.5 text-[15px]"><span className="flex-1 font-semibold">{t}</span><span className="text-[#8a857f]">{d}</span><span className="w-14 text-right font-semibold">{a}</span><Chip>UPI</Chip></div>)}
          </Card>
        </div>
      </div>
    </AppFrame>
  );
}
