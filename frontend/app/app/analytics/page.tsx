"use client";

import { motion } from "motion/react";
import { AppFrame, Card, Chip, LIME, PageTitle } from "@/components/app/kit";

/* Analytics: how the published videos are doing. Sample data. */
const STATS = [["Views", "48.2k", "+18%"], ["Watch time", "3,140 h", "+11%"], ["Avg. view", "6:12", "+0:40"], ["Subscribers", "+1,206", "+23%"]];
const WEEK = [12, 18, 15, 24, 31, 27, 38, 35, 44, 41, 52, 60];
const TOP = [["Explain UPI in 10 minutes", "21.4k", "64%", "Published"], ["How NPCI routes a payment", "11.8k", "58%", "Published"], ["UPI Short 1: ₹10 in 1 sec", "9.3k", "81%", "Short"], ["Is your PIN safe? (Short)", "5.7k", "77%", "Short"]];

export default function Analytics() {
  const max = Math.max(...WEEK), pts = WEEK.map((v, i) => `${(i / (WEEK.length - 1)) * 100},${100 - (v / max) * 88}`).join(" ");
  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <PageTitle title="How it's" accent="going" sub="Your channel, last 12 weeks." right={<div className="flex gap-2">{["7 days", "28 days", "12 weeks"].map((r, i) => <span key={r} className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${i === 2 ? "bg-[#1f1c1b] text-white" : "bg-white text-[#5f5b57] ring-1 ring-[#e6e6df]"}`}>{r}</span>)}</div>} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(([k, v, d], i) => (
            <Card key={k} className="p-5"><div className="text-[13.5px] font-semibold text-[#8a857f]">{k}</div><div className="mt-1 text-[34px] font-bold leading-none tracking-[-0.03em]">{v}</div><div className="mt-2"><Chip tone={i === 0 ? "lime" : "plain"}>{d}</Chip></div></Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between"><div className="text-[18px] font-bold">Views per week</div><Chip tone="lime">Best week yet</Chip></div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-[220px] w-full overflow-visible">
              {[25, 50, 75].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#ecebe5" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />)}
              <motion.polygon points={`0,100 ${pts} 100,100`} fill={LIME} fillOpacity="0.25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} />
              <motion.polyline points={pts} fill="none" stroke="#1f1c1b" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
            </svg>
          </Card>
          <Card className="p-5">
            <div className="text-[18px] font-bold">Where viewers drop</div>
            <div className="mt-1 text-[13.5px] text-[#8a857f]">Explain UPI in 10 minutes</div>
            <div className="mt-4 space-y-2.5">
              {[["0:00 Hook", 100], ["0:45 How money moves", 82], ["4:10 Why it's safe", 66], ["8:30 Recap", 58]].map(([k, v]) => (
                <div key={k as string}><div className="flex justify-between text-[14px]"><span>{k}</span><span className="font-semibold">{v}%</span></div>
                  <div className="mt-1 h-2.5 rounded-full bg-[#ecebe5]"><motion.div className="h-full rounded-full bg-[#1f1c1b]" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.8 }} /></div></div>
              ))}
            </div>
            <div className="mt-4 rounded-[14px] bg-[#f1fbe3] p-3 text-[14px] text-[#2f5a12]"><b>Tip:</b> viewers stay longest on the coin and NPCI scenes. Open with a visual next time.</div>
          </Card>
        </div>
        <Card className="mt-4 overflow-hidden">
          <div className="p-5 text-[18px] font-bold">Top videos</div>
          {TOP.map(([t, v, r, k]) => (
            <div key={t} className="flex items-center gap-4 border-t border-[#ecebe5] px-5 py-3 text-[15px]"><span className="flex-1 font-semibold">{t}</span><Chip tone={k === "Short" ? "ink" : "lime"}>{k}</Chip><span className="w-16 text-right">{v}</span><span className="w-14 text-right text-[#8a857f]">{r}</span></div>
          ))}
        </Card>
      </div>
    </AppFrame>
  );
}
