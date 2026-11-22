"use client";

import { ArrowLeft, ChevronDown, FlaskConical } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { AppFrame, Card, ease } from "@/components/app/kit";
import { API, useApi } from "@/lib/api";

/* One one-shot experiment (video/oneshot.py) next to the argon film of the same narration: the two videos side by
   side, what each cost, the plan the model wrote at the top of its one file, the file itself and the run's log.
   The experiment's files are static (video/public/oneshot/<slug>/), so nothing in the backend changes for it. */

const ORIGIN = API.replace(/\/api\/?$/, "");
type Report = { state?: string; scenes: number; model?: string; model_calls: number; tokens_in: number; tokens_out: number; usd: number; lines_final: number;
  compile_rounds: number; render_rounds: number; compiles: boolean; seconds: Record<string, number>;
  argon_code_and_review?: { calls: number; usd: number; tokens_in: number; tokens_out: number } };
type Argon = { title: string; topic: string; video: string; scenes: { code_lines: number }[] };

const fetchText = (u: string) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.text() : null));
const fetchJson = (u: string) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
const fmt = (n: number | undefined) => (n === undefined || n === null ? "—" : n.toLocaleString("en-IN"));
const usd = (n: number | undefined) => (n === undefined || n === null ? "—" : `$${n.toFixed(n < 0.1 ? 3 : 2)}`);

function Row({ label, a, b, better }: { label: string; a: string; b: string; better?: "a" | "b" }) {
  return (
    <tr className="border-t border-[#ecebe5]">
      <td className="py-2 pr-3 text-[13.5px] text-[#5f5b57]">{label}</td>
      <td className={`py-2 pr-3 text-right font-mono text-[13.5px] ${better === "a" ? "font-bold text-[#3f7d1e]" : ""}`}>{a}</td>
      <td className={`py-2 text-right font-mono text-[13.5px] ${better === "b" ? "font-bold text-[#3f7d1e]" : ""}`}>{b}</td>
    </tr>
  );
}

export default function OneShotExperiment() {
  const { slug } = useParams<{ slug: string }>();
  const base = `${ORIGIN}/studio-assets/oneshot/${slug}`;
  const { data: report } = useSWR<Report | null>(`${base}/report.json`, fetchJson, { refreshInterval: (d) => (d ? 0 : 3000) });
  const running = !report;
  const { data: log } = useSWR<string | null>(`${base}/run.log`, fetchText, { refreshInterval: running ? 2000 : 0 });
  const { data: code } = useSWR<string | null>(report ? `${base}/film.tsx.txt` : null, fetchText);
  const { data: argon } = useApi<Argon>(`/argon/${slug}`);
  const [showCode, setShowCode] = useState(false);
  const plan = code?.match(/^\s*\/\*([\s\S]*?)\*\//)?.[1]?.replace(/^\s*\* ?/gm, "").trim();
  const video = report?.state === "done" ? `${ORIGIN}/studio-out/oneshot-${slug}.mp4?v=${report.seconds?.render ?? 0}` : "";
  const a = report?.argon_code_and_review;
  const argonLines = argon?.scenes.reduce((n, s) => n + (s.code_lines || 0), 0);
  const writeSec = report ? (report.seconds.write ?? 0) + (report.seconds.compile_fix ?? 0) : undefined;

  return (
    <AppFrame>
      <div className="mx-auto max-w-[1240px] space-y-5">
        <Link href="/app/motion/oneshot" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5f5b57] hover:text-[#1f1c1b]"><ArrowLeft className="size-4" />All one-shot experiments</Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#efe7ff] px-2.5 py-0.5 text-[12px] font-bold text-[#5a3a9a]"><FlaskConical className="size-3.5" />Experiment · one plan, one write</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${running ? "bg-[#a6f04a]/40 text-[#2f5a12]" : report.state === "done" ? "bg-[#1f1c1b] text-white" : "bg-[#fff1ec] text-[#9a2f1d]"}`}>
              {running ? "Being made…" : report.state === "done" ? "Rendered" : report.state === "compiled" ? "Compiled, not rendered" : "Failed"}</span>
            {report?.model && <span className="text-[13px] text-[#8a857f]">{report.model}</span>}
          </div>
          <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-[-0.02em]">{argon?.title || argon?.topic || slug}</h1>
          <p className="text-[15px] text-[#5f5b57]">The same voice, captions and timing as the agent&apos;s film: only the scene code is different.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[["Argon agent (the current pipeline)", argon?.video ? ORIGIN + argon.video : ""], ["One-shot (one model call)", video]].map(([label, src], i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.45, ease }}>
              <Card className="overflow-hidden p-2">
                <div className="px-2 pb-2 pt-1 text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">{label}</div>
                {src ? <video src={src} controls className="aspect-video w-full rounded-[14px] bg-black" />
                  : <div className="grid aspect-video w-full place-items-center rounded-[14px] bg-[#101826] text-[14px] text-white/70">{i === 1 && running ? "Writing and rendering…" : "No video yet"}</div>}
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">What each cost (writing and checking the scenes)</div>
            {report ? (
              <table className="w-full">
                <thead><tr><th /><th className="pb-1 text-right text-[12px] font-bold text-[#8a857f]">Argon</th><th className="pb-1 text-right text-[12px] font-bold text-[#8a857f]">One-shot</th></tr></thead>
                <tbody>
                  <Row label="Model calls" a={fmt(a?.calls)} b={fmt(report.model_calls)} better={a && report.model_calls < a.calls ? "b" : undefined} />
                  <Row label="Tokens in" a={fmt(a?.tokens_in)} b={fmt(report.tokens_in)} better={a && report.tokens_in < a.tokens_in ? "b" : undefined} />
                  <Row label="Tokens out" a={fmt(a?.tokens_out)} b={fmt(report.tokens_out)} />
                  <Row label="Cost" a={usd(a?.usd)} b={usd(report.usd)} better={a && report.usd < a.usd ? "b" : undefined} />
                  <Row label="Lines of scene code" a={fmt(argonLines)} b={fmt(report.lines_final)} />
                  <Row label="Fix rounds (compile / render)" a="—" b={`${report.compile_rounds} / ${report.render_rounds}`} />
                  <Row label="Write + check time" a="—" b={writeSec !== undefined ? `${writeSec} s` : "—"} />
                </tbody>
              </table>
            ) : <p className="text-[14px] text-[#8a857f]">Filled in when the run ends.</p>}
            <p className="mt-3 text-[12px] leading-snug text-[#8a857f]">Argon&apos;s numbers are its code and review stages for this film (from its cost.json); planning, voice and pictures are left out of both sides.</p>
          </Card>

          <Card className="p-5">
            <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">{running ? "What it is doing" : "The run"}</div>
            <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded-[12px] bg-[#f6f5ef] p-3 font-mono text-[12px] leading-relaxed text-[#3a3633]">
              {(log ?? "Starting…").split("\n").filter((l) => l.trim() && !l.includes("automatic function calling") && !l.includes("] Report: ")).join("\n")}</pre>
          </Card>
        </div>

        {plan && (
          <Card className="p-5">
            <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">The plan the model wrote first (top of its file)</div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-[#3a3633]">{plan}</pre>
          </Card>
        )}

        {code && (
          <Card className="p-5">
            <button type="button" onClick={() => setShowCode(!showCode)} className="flex w-full items-center justify-between text-left">
              <span className="text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">The one file it wrote · film.tsx · {code.split("\n").length} lines</span>
              <ChevronDown className={`size-4 transition-transform ${showCode ? "rotate-180" : ""}`} />
            </button>
            {showCode && <pre className="mt-3 max-h-[640px] overflow-auto rounded-[12px] bg-[#16181d] p-4 font-mono text-[12px] leading-relaxed text-[#e6e3dc]">{code}</pre>}
          </Card>
        )}
      </div>
    </AppFrame>
  );
}
