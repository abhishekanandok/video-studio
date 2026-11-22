"use client";

import { ArrowRight, Check, ExternalLink, Loader2, Lock, Play, Square } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Chip, DarkButton, LIME_TEXT, LimeButton, Mark, ease } from "./kit";
import { API, post, useApi } from "@/lib/api";
import { VoiceChoice } from "./voice-choice";
import { VoiceReview } from "./voice-review";

/* A real video, followed live: the research-first pipeline (backend video/archivedoc.py) reports its stage and a log
   into status.json; this page polls the film every few seconds and shows it as Drishyya's one-stage-at-a-time flow.
   The pipeline pauses after research so the creator can read the sources and approve them before anything is written. */

type Film = {
  id: number; topic: string; title?: string; stage: string; running: boolean; now?: string; video?: string | null;
  log?: { at: string; msg: string }[];
  prompter?: { speech: string; audio: string | null }[]; // archival films: the lines in film order (cold open first, trimmed lines left out), each with its voice
  research?: { facts: number; sources: number; rejected: number; approved: boolean; source_list: { site: string; title: string; url: string; facts: number }[]; quotes: { speaker: string; text: string; site: string }[] } | null;
  stages?: Record<string, { done?: number; total?: number }>;
  acts?: { n: number; title: string; seconds: number; hook: string; written: boolean; scenes: { lines: { speech: string }[] }[] }[];
  created_at?: string;
  config?: { own_recording?: string } | null;
  slug?: string;
  cost?: { total_usd?: number; stages?: Record<string, { usd: number; calls: number }>; models?: Record<string, { usd: number; calls: number }> } | null;
};

/* what one unit of work is called at each stage, for "23 of 36 sources read" */
const UNIT: Record<string, string> = { research: "sources read", archive: "pictures found", images: "pictures made", scripts: "chapters written", visuals: "pictures made", motion: "shots animated", voices: "lines voiced", render: "parts rendered" };
const usd = (n?: number) => `$${(n ?? 0).toFixed(2)}`;
const ago = (ms: number) => { const m = Math.floor(ms / 60000); return m < 1 ? "under a minute" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
/* who is working at each stage, and what that stage is for */
const AGENT: Record<string, string> = { queued: "Queue", plan: "Research agent", research: "Research agent", paused: "Research agent", scripts: "Script writer", archive: "Picture researcher", images: "Visual designer", visuals: "Visual designer", motion: "Motion designer", voices: "Voice", render: "Editor", done: "Editor" };
const ABOUT: Record<string, string> = { queued: "Your video is next in line.", plan: "Planning what to look up.", research: "Searching, reading primary sources, and keeping only facts it can quote.", scripts: "Writing the script from the approved sources.", archive: "Finding real photos for the script, and checking each one fits.", images: "Drawing the pictures for every scene.", visuals: "Drawing the pictures for every scene.", motion: "Adding movement to the pictures.", voices: "Recording the voiceover.", render: "Putting it all together." };
const modelName = (m: string) => m.replace(/^.*\//, "").replace(/-/g, " ");

const STEPS = [
  { key: "Research", stages: ["queued", "plan", "research"] },
  { key: "Approve sources", stages: ["paused"] },
  { key: "Script", stages: ["scripts"] },
  { key: "Visuals", stages: ["archive", "images", "visuals", "motion"] },
  { key: "Voice", stages: ["voices"] },
  { key: "Render", stages: ["render"] },
  { key: "Ready", stages: ["done"] },
];
const stepOf = (stage: string) => { const i = STEPS.findIndex((s) => s.stages.includes(stage)); return i >= 0 ? i : stage === "stopped" || stage === "failed" ? 0 : 2; };

export function LiveWorkspace({ id }: { id: string }) {
  const { data: f, error, mutate } = useApi<Film>(`/studio/films/${id}`, { refreshInterval: 4000 });
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [changing, setChanging] = useState(false); // "Change the voice" at the voice review: back to the voice choice
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (error && !f) return <Card className="p-6 text-[15px]">Couldn't load this video: {String(error.message)}. Is the backend running?</Card>;
  if (!f) return <div className="flex items-center gap-2 text-[15px] text-[#8a857f]"><Loader2 className="size-4 animate-spin" />Loading your video…</div>;

  const failed = f.stage === "failed" || f.stage === "stopped";
  const lastMsg = f.log?.length ? f.log[f.log.length - 1].msg : "";
  // paused for the creator's voice: the script and pictures are done, nothing is recorded until they choose
  // paused after the voices are recorded: the creator listens and approves them before the video is made
  const reviewVoices = f.stage === "paused" && lastMsg.startsWith("Voices ready") && !changing;
  const awaitingVoice = (f.stage === "paused" && /Choose your voice|Your recording is saved/.test(lastMsg + " " + (f.log ?? []).slice(-3).map((l) => l.msg).join(" "))) || (changing && f.stage === "paused");
  // after the voice, the pipeline lays out the final pages under the stage name "visuals" again: that is the edit, so it
  // belongs to Render, not back at Visuals
  const assembling = (f.log ?? []).some((l) => l.msg.startsWith("Assembling the film")) && ["visuals", "motion", "images"].includes(f.stage);
  const step = awaitingVoice || reviewVoices ? 4 : assembling ? 5 : stepOf(f.stage);
  const awaiting = !awaitingVoice && !reviewVoices && f.stage === "paused" && f.research && !f.research.approved;
  const act = async (path: string) => { setBusy(true); try { await post(path); await mutate(); } finally { setBusy(false); } };
  // the same line logged several times in a row ("www.bls.gov would not let the agent read it" x3) shows once, with a count
  const log = (f.log ?? []).reduce<{ at: string; msg: string; n: number }[]>((acc, l) => {
    const last = acc[acc.length - 1];
    if (last && last.msg === l.msg) last.n += 1; else acc.push({ ...l, n: 1 });
    return acc;
  }, []).slice(-8).reverse();
  const prog = f.stages?.[f.stage];
  const frac = prog?.total ? Math.min(1, (prog.done ?? 0) / prog.total) : 0;
  const overall = f.stage === "done" ? 1 : (step + frac) / STEPS.length;
  const doing = (f.now || "").replace(/\s*\(\d+s ago\)\s*$/, "")
    .replace(/^photo ✓ .*?->\s*(.*?)(\s*\(\d+.*)?$/, "Picked a photo: $1").replace(/^photo ✗ (.*?)(\s*->.*)?$/, "Skipped a photo that didn't fit: $1");
  const unit = /search/i.test(doing) ? "searches done" : /review/i.test(doing) ? "lines reviewed" : /redesign/i.test(doing) ? "shots redesigned"
    : /designing .*motion shots/i.test(doing) ? "shots designed" : /icon|picture|photo|fetching/i.test(doing) ? "pictures and icons" : UNIT[f.stage] ?? "done";
  const lastAt = f.log?.length ? f.log[f.log.length - 1].at : null;
  const elapsed = f.created_at ? now - new Date(f.created_at).getTime() : 0;
  const cost = f.cost?.total_usd ?? 0;
  const researching = ["queued", "plan", "research"].includes(f.stage) || (f.stage === "paused" && !awaitingVoice && !reviewVoices);
  const scriptLines = f.prompter?.length ? f.prompter.map((p) => p.speech) : (f.acts ?? []).flatMap((a) => a.scenes.flatMap((sc) => sc.lines.map((l) => l.speech))).filter(Boolean);
  const acts = f.acts ?? [];
  const sources = [...new Map((f.research?.source_list ?? []).map((s) => [s.url, s])).values()].sort((a, b) => b.facts - a.facts);

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><div className="text-[13px] font-semibold text-[#8a857f]">Video · live</div><div className="truncate text-[20px] font-bold">{f.title || f.topic}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[#8a857f]">
            <Chip tone="lime">AI cost {usd(cost)}</Chip>
            {f.created_at && <span>{f.running ? "Running for" : "Started"} {ago(elapsed)}{f.running ? "" : " ago"}</span>}
          </div></div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex shrink-0 items-center gap-1.5">
              <span className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${i === step && !failed ? "bg-[#1f1c1b] text-white" : i < step ? "bg-[#a6f04a]/45 text-[#2f5a12]" : "bg-white text-[#a8a39c] ring-1 ring-[#e6e6df]"}`}>
                {i < step ? <Check className="size-3.5" strokeWidth={3} /> : i > step ? <Lock className="size-3.5" /> : <span className="size-2 rounded-full bg-[#a6f04a]" />}{s.key}
              </span>
              {i < STEPS.length - 1 && <span className={`h-0.5 w-4 rounded-full ${i < step ? "bg-[#a6f04a]" : "bg-[#e2e1da]"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e9e8e1]">
        <motion.div className="h-full rounded-full bg-[#a6f04a]" initial={{ width: 0 }} animate={{ width: `${Math.max(3, overall * 100)}%` }} transition={{ duration: 0.8, ease }} />
      </div>
      <div className="mt-1 text-right text-[12.5px] font-semibold text-[#8a857f]">{Math.round(overall * 100)}% of the whole video</div>

      <motion.div key={f.stage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }} className="mt-8">
        <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] sm:text-[42px]">
          {reviewVoices ? <>Listen to the <span style={LIME_TEXT}>voice</span></> : awaitingVoice ? <>Choose your <span style={LIME_TEXT}>voice</span></> : failed ? "Stopped" : awaiting ? <>Approve the <span style={LIME_TEXT}>sources</span></> : f.stage === "done" ? <>Your video is <span style={LIME_TEXT}>ready</span></> : <>{STEPS[step].key} <span style={LIME_TEXT}>in progress</span></>}
        </h1>
        <p className="mb-7 mt-2 text-[17px] text-[#5f5b57]">
          {reviewVoices ? "Every line is recorded. Play them; if they sound right, make the video. Nothing else is built until you say so." : awaitingVoice ? "Your script and pictures are ready. Read it yourself off the teleprompter, or pick an AI voice. Nothing is recorded until you choose." : failed ? "The pipeline stopped. Check the log, then continue from where it left off." : awaiting ? "Read what the research found. Approve it and the script is written from these sources alone." : f.stage === "done" ? "Watch it, then publish." : ABOUT[f.stage] ?? "The agents are working. This page updates by itself."}
        </p>

        {reviewVoices && (
          <div className="mb-5">
            <VoiceReview id={f.id} lines={f.prompter ?? []} onDone={() => mutate()} onChange={() => setChanging(true)} />
          </div>
        )}
        {awaitingVoice && (
          <div className="mb-5">
            <VoiceChoice id={f.id} lines={scriptLines} saved={f.config?.own_recording && f.slug ? `/studio-assets/${f.slug}/${f.config.own_recording}` : null} onDone={() => { setChanging(false); mutate(); }} />
          </div>
        )}
        <div className={`grid items-start gap-5 ${awaitingVoice ? "lg:grid-cols-2" : "lg:grid-cols-[minmax(0,1fr)_360px]"}`}>
          {/* left: what is happening now, then what it found (while the voice is chosen, the voice card above is all of it) */}
          <div className={awaitingVoice ? "hidden" : "min-w-0 space-y-5"}>
            {awaitingVoice ? null : f.stage === "done" && f.video ? (
              <Card className="overflow-hidden p-3"><video src={/^https?:/.test(f.video) ? f.video : API.replace(/\/api\/?$/, "") + f.video} controls className="aspect-video w-full rounded-[16px] bg-black" /></Card>
            ) : (
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <Mark />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[#8a857f]">{AGENT[f.stage] ?? "The agents"}{f.running ? " · working now" : ""}</div>
                    <div className={`mt-0.5 flex items-start gap-2 font-bold leading-snug ${doing.length > 70 ? "text-[16px]" : "text-[18px]"}`}>
                      <span className="min-w-0">{awaiting ? "Waiting for you to approve the sources" : failed ? "Stopped" : doing || "Starting up…"}</span>
                      {f.running && <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-[#8a857f]" />}
                    </div>
                  </div>
                </div>

                {prog?.total && !awaiting && !(frac >= 1 && f.running) ? (
                  <div className="mt-5">
                    <div className="flex items-baseline justify-between text-[14px]"><span className="font-semibold">{prog.done ?? 0} of {prog.total} {unit}</span><span className="text-[22px] font-bold">{Math.round(frac * 100)}%</span></div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#efeee8]">
                      <motion.div className="h-full rounded-full bg-[#1f1c1b]" initial={{ width: 0 }} animate={{ width: `${Math.max(2, frac * 100)}%` }} transition={{ duration: 0.8, ease }} />
                    </div>
                  </div>
                ) : f.running ? (
                  <div className="mt-5">
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#efeee8]">
                    <motion.div className="h-full w-1/3 rounded-full bg-[#a6f04a]" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
                  </div>
                  </div>
                ) : null}

                {f.research && !researching && (
                  <div className="mt-4 text-[13.5px] text-[#8a857f]">Built from {f.research.facts} verified facts across {f.research.sources} sources</div>
                )}
                {f.research && researching && (
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[[f.research.facts, "facts kept", "bg-[#a6f04a]/35"], [f.research.sources, "sources", "bg-[#f1f0ea]"], [f.research.rejected, "rejected", "bg-[#fde9d9]"]].map(([n, l, bg]) => (
                      <div key={String(l)} className={`rounded-[14px] px-3 py-2.5 ${bg}`}><div className="text-[24px] font-bold leading-none">{n}</div><div className="mt-1 text-[12.5px] font-semibold text-[#5f5b57]">{l}</div></div>
                    ))}
                  </div>
                )}

                {awaiting && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <LimeButton onClick={() => act(`/studio/films/${f.id}/continue`)}>{busy ? "Starting…" : "Approve sources and write the script"}</LimeButton>
                    <a href={`${process.env.NEXT_PUBLIC_API_URL ?? `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8020/api`}/studio/films/${f.id}/research-pack`} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2.5 text-[15px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]">Read the full pack</a>
                  </div>
                )}
              </Card>
            )}

            {!researching && !awaitingVoice && acts.length > 0 && (
              <Card className="p-6">
                <div className="flex items-baseline justify-between"><span className="text-[18px] font-bold">Script</span><span className="text-[13px] text-[#8a857f]">{acts.filter((a) => a.written).length} of {acts.length} chapters written · about {Math.round(acts.reduce((t, a) => t + (a.seconds || 0), 0) / 60 * 10) / 10} min</span></div>
                <div className="mt-4 space-y-3">
                  {acts.map((a, i) => {
                    const lines = a.scenes.flatMap((sc) => sc.lines.map((l) => l.speech)).filter(Boolean);
                    return (
                      <div key={`${a.n}-${a.title}`} className={`rounded-[16px] border p-4 ${a.written ? "border-[#ecebe5]" : "border-dashed border-[#dcdbd3]"}`}>
                        <div className="flex items-start gap-3">
                          <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold ${a.written ? "bg-[#a6f04a] text-[#1f1c1b]" : "bg-[#f1f0ea] text-[#8a857f]"}`}>{a.written ? <Check className="size-4" strokeWidth={3} /> : i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3"><span className="text-[16px] font-bold leading-snug">{a.title.replace(/ \(locked\)$/, "")}</span>{a.seconds ? <span className="text-[12.5px] text-[#8a857f]">{a.seconds} s</span> : null}</div>
                            {a.hook && <div className="mt-0.5 text-[13.5px] text-[#8a857f]">{a.hook}</div>}
                          </div>
                          {!a.written && f.running && f.stage === "scripts" && <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-[#8a857f]" />}
                        </div>
                        {lines.length > 0 ? (
                          <div className="mt-3 space-y-1.5 border-l-2 border-[#a6f04a] pl-4">
                            {lines.map((l, k) => <p key={k} className="text-[15px] leading-relaxed text-[#2a2725]">{l}</p>)}
                          </div>
                        ) : !a.written && f.stage === "scripts" ? (
                          <div className="mt-3 space-y-2 pl-11">{[90, 75, 60].map((w) => <div key={w} className="h-2.5 animate-pulse rounded-full bg-[#efeee8]" style={{ width: `${w}%` }} />)}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {researching && f.research && f.research.source_list.length > 0 && (
              <Card className="p-6">
                <div className="flex items-baseline justify-between"><span className="text-[18px] font-bold">Sources</span><span className="text-[13px] text-[#8a857f]">sorted by facts used</span></div>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {sources.slice(0, showAll ? undefined : 8).map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-start gap-3 rounded-[14px] border border-[#ecebe5] p-3 transition-colors hover:border-[#cfe9a8] hover:bg-[#fbfdf6]">
                      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#1f1c1b] text-[14px] font-bold uppercase text-[#a6f04a]">{s.site.replace(/^www\./, "")[0]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[14px] font-semibold leading-snug">{s.title || s.site}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#8a857f]"><span className="truncate">{s.site}</span><span className="shrink-0 rounded-full bg-[#a6f04a]/35 px-1.5 font-semibold text-[#2f5a12]">{s.facts} facts</span></span>
                      </span>
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-[#c4c0b8] group-hover:text-[#5f5b57]" />
                    </a>
                  ))}
                </div>
                {sources.length > 8 && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 rounded-full px-3 py-1.5 text-[14px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]">
                    {showAll ? "Show fewer" : `Show all ${sources.length} sources`}
                  </button>
                )}
              </Card>
            )}
          </div>

          {/* right: the agents' timeline, controls, and what it has cost */}
          <div className={awaitingVoice ? "contents" : "space-y-5 lg:sticky lg:top-6"}>
            <Card className="p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[17px] font-bold">Activity</div>
                {f.running ? <Chip tone="lime"><span className="size-1.5 animate-pulse rounded-full bg-[#2f5a12]" />running</Chip> : <Chip>{f.stage}</Chip>}
              </div>
              <div className="relative mt-4">
                {log.length ? log.map((l, i) => (
                  <motion.div key={`${(f.log?.length ?? 0) - i}-${l.at}-${l.msg}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < log.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-[#e6e6df]" />}
                    <span className={`relative mt-1.5 size-[11px] shrink-0 rounded-full ${i === 0 && f.running ? "bg-[#a6f04a] ring-4 ring-[#a6f04a]/25" : "bg-[#d9d8d0]"}`} />
                    <div className="min-w-0">
                      <div className={`text-[14px] leading-snug ${i === 0 ? "font-semibold" : "text-[#5f5b57]"}`}>{l.msg}{l.n > 1 && <span className="ml-1.5 rounded-full bg-[#f1f0ea] px-1.5 text-[11.5px] font-semibold text-[#8a857f]">×{l.n}</span>}</div>
                      <div className="mt-0.5 font-mono text-[11.5px] text-[#a8a39c]">{l.at}</div>
                    </div>
                  </motion.div>
                )) : <div className="text-[14px] text-[#8a857f]">Waiting for the first step…</div>}
              </div>
              <div className="mt-5 flex gap-2 border-t border-[#ecebe5] pt-4">
                {f.running && <button type="button" onClick={() => act(`/studio/films/${f.id}/stop`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[14px] font-semibold text-[#5f5b57] ring-1 ring-[#e6e6df] hover:bg-black/[0.04]"><Square className="size-3.5" />Stop</button>}
                {failed && <DarkButton onClick={() => act(`/studio/films/${f.id}/continue`)}><Play className="size-4 text-[#a6f04a]" />Continue</DarkButton>}
                <Link href={`/studio/${f.id}/live`} className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full py-2 text-[14px] font-semibold text-[#5f5b57] ring-1 ring-[#e6e6df] hover:bg-black/[0.04]">Detailed tracker <ArrowRight className="size-4" /></Link>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-baseline justify-between"><span className="text-[17px] font-bold">AI cost so far</span><span className="text-[26px] font-bold tracking-[-0.02em]">{usd(cost)}</span></div>
              {Object.entries(f.cost?.stages ?? {}).length > 0 ? (
                <div className="mt-3 space-y-1.5 text-[13.5px]">
                  {Object.entries(f.cost?.stages ?? {}).map(([k, v]) => <div key={k} className="flex justify-between text-[#5f5b57]"><span className="capitalize">{k} <span className="text-[#a8a39c]">· {v.calls} calls</span></span><span className="font-semibold">{usd(v.usd)}</span></div>)}
                  <div className="flex flex-wrap gap-1.5 pt-2">{Object.entries(f.cost?.models ?? {}).map(([m, v]) => <Chip key={m}>{modelName(m)} {usd(v.usd)}</Chip>)}</div>
                </div>
              ) : <div className="mt-2 text-[13.5px] text-[#8a857f]">Nothing spent yet.</div>}
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
