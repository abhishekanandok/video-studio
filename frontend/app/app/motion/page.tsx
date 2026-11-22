"use client";

import { ArrowLeft, ArrowRight, Check, ChevronDown, Clapperboard, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BriefForm, DEFAULT_BRIEF, type FilmBrief } from "@/components/app/brief";
import { FilmGrid, type Film } from "@/components/app/film-grid";
import { AppFrame, Card, PageTitle } from "@/components/app/kit";
import { LookStudio, type Look, type Pin } from "@/components/app/look-studio";
import { post, useApi } from "@/lib/api";

/* Plan with Drishyya (ADR 0013, PRD §8.1), in two steps. 1, the brief: a topic, notes, audience, language, and the
   film brief (components/app/brief.tsx: kind, pace, length, tone, cold open, chapters, transitions, cinematic shots,
   music, maps, photos, logos, dub). 2, the look (components/app/look-studio.tsx): search the families (video/looks.py), see the chosen one live,
   pin its colours, fonts, box and motion (the film keeps pins exactly and varies the rest); Auto, the default, lets
   Gemini pick the family from the topic. The pipeline (video/oneshot.py through /api/films) plans the story, voices it and draws the
   storyboard, checks it with the viewer test, then writes and renders straight on (no review step). Each film opens on
   its storyboard (/app/motion/f/<slug>). The older Argon pipeline lives on /app/motion/classic. */

const IDEAS = ["How milk reaches your home", "How UPI works", "Why the Ganga floods", "Black holes", "How vaccines train the body"];
const STEPS = ["Your brief", "Pick the look", "Plan + storyboard", "Write + check", "Render"];

export default function MotionHome() {
  const { data } = useApi<{ films: Film[] }>("/films", { refreshInterval: 5000 });
  const { data: lk } = useApi<{ looks: Look[] }>("/films/looks");
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [audience, setAudience] = useState("");
  const [language, setLanguage] = useState("English");
  const [accent, setAccent] = useState("");
  const [brief, setBrief] = useState<FilmBrief>(DEFAULT_BRIEF);
  const [filmsOpen, setFilmsOpen] = useState(false);
  // the "Your films" panel stays as the creator left it
  useEffect(() => { try { setFilmsOpen(localStorage.getItem("drishyya.filmsOpen") === "1"); } catch {} }, []);
  const openFilms = (v: boolean) => { setFilmsOpen(v); try { localStorage.setItem("drishyya.filmsOpen", v ? "1" : "0"); } catch {} };
  const [vertical, setVertical] = useState(false);
  const [minutes, setMinutes] = useState(8);
  const [look, setLook] = useState("auto");
  const [pin, setPin] = useState<Pin>({});
  const [step, setStep] = useState<0 | 1>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const names: Record<string, string> = { auto: "Auto look", ...Object.fromEntries((lk?.looks ?? []).map((x) => [x.id, x.name])) };
  const start = async () => {
    if (!topic.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const tone = [...brief.tone.presets, brief.tone.words.trim()].filter(Boolean).join(", ");
      const story = brief.kind === "story" || brief.kind === "fiction";
      const r = await post<{ slug: string }>("/films", { topic, notes, audience, tone, language, accent, story, vertical, minutes, look, pin: look === "auto" ? {} : pin, brief });
      router.push(`/app/motion/f/${r.slug}`);
    } catch (e) { setErr(String((e as Error).message)); setBusy(false); }
  };
  const field = "rounded-[12px] border border-[#e2e1da] bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-[#a6f04a]";

  return (
    <AppFrame>
      <div className="mx-auto max-w-[1180px]">
        <PageTitle title="Plan with" accent="Drishyya" sub="Bring a topic and your notes, pick a style. Drishyya plans, draws, checks and renders the whole film; you watch it and adjust." />

        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-[#5f5b57]">
          {STEPS.map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-1 ${i === step ? "bg-[#1f1c1b] text-white" : "bg-white ring-1 ring-[#e2e1da]"}`}>{i + 1}. {s}</span>
              {i < STEPS.length - 1 && <ArrowRight className="size-3 text-[#b5b1aa]" />}
            </span>
          ))}
        </div>

        {step === 0 && <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-[#3f7d1e]" />
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What is the video about? e.g. How milk reaches your home"
              className="min-w-[260px] flex-1 rounded-[14px] border border-[#e2e1da] bg-white px-4 py-3 text-[16px] outline-none focus:border-[#a6f04a]" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{IDEAS.map((x) => <button key={x} type="button" onClick={() => setTopic(x)} className="rounded-full border border-[#e2e1da] bg-white px-3 py-1 text-[13px] font-semibold text-[#5f5b57] hover:border-[#a6f04a]">{x}</button>)}</div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Your notes (optional): facts, numbers, an outline, a link's key points. The story is built on these, and nothing is invented beyond them."
            className={`${field} mt-4 w-full resize-y`} />

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience: e.g. class 10 students" className={field} />
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`${field} font-semibold`}><option>English</option><option>Hinglish</option><option>Hindi</option></select>
            {/* the voice's accent is its locale (video/argon.py accent_of): Hinglish and Hindi are voiced the Indian way by themselves */}
            <select value={accent} onChange={(e) => setAccent(e.target.value)} className={`${field} font-semibold`}>
              <option value="">Accent: {language === "English" ? "neutral" : "Indian"}</option><option value="en-IN">Accent: Indian English</option>
              <option value="en-GB">Accent: British</option><option value="en-US">Accent: American</option>
            </select>
            <button type="button" onClick={() => setVertical(!vertical)} className={`rounded-[12px] border px-3 py-2.5 text-[14px] font-semibold ${vertical ? "border-[#1f1c1b] bg-[#1f1c1b] text-white" : "border-[#e2e1da] bg-white"}`}>{vertical ? "9:16 Short" : "16:9 Video"}</button>
          </div>

          <BriefForm brief={brief} setBrief={setBrief} minutes={minutes} setMinutes={setMinutes} />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setStep(1)} disabled={!topic.trim()}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-5 py-2.5 text-[15px] font-bold shadow-[3px_3px_0_#1f1c1b] transition-transform hover:-translate-y-px disabled:opacity-50">
              Next: pick the look<ArrowRight className="size-4" />
            </button>
          </div>
        </Card>}

        {step === 1 && <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><div className="text-[13px] font-semibold text-[#8a857f]">Your film</div><div className="truncate text-[17px] font-bold">{topic}</div></div>
            <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-3 py-1.5 text-[13px] font-semibold hover:border-[#a6f04a]"><ArrowLeft className="size-3.5" />Edit the brief</button>
          </div>
          <LookStudio looks={lk?.looks ?? []} look={look} setLook={setLook} pin={pin} setPin={setPin} />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={start} disabled={busy || !topic.trim()}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-5 py-2.5 text-[15px] font-bold shadow-[3px_3px_0_#1f1c1b] transition-transform hover:-translate-y-px disabled:opacity-50">
              {busy ? <><Loader2 className="size-4 animate-spin" />Starting…</> : <><Clapperboard className="size-4" />Plan it{look !== "auto" && lk ? ` in ${lk.looks.find((x) => x.id === look)?.name ?? look}` : ""}</>}
            </button>
            <span className="inline-flex items-center gap-1 text-[13px] text-[#8a857f]"><Check className="size-3.5" />It plans, checks and renders straight through; you can adjust it after.</span>
          </div>
          {err && <p className="mt-2 text-[14px] text-[#9a2f1d]">{err}</p>}
        </Card>}

        <Card className="mt-8 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => openFilms(!filmsOpen)} className="inline-flex items-center gap-2 text-[20px] font-bold" aria-expanded={filmsOpen}>
              Your films{data ? <span className="text-[15px] font-semibold text-[#8a857f]">({data.films.length})</span> : null}
              <ChevronDown className={`size-5 transition-transform ${filmsOpen ? "rotate-180" : ""}`} />
            </button>
            <Link href="/app/motion/films" className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#3f7d1e] hover:underline">Open all films<ArrowRight className="size-3.5" /></Link>
          </div>
          {filmsOpen && <div className="mt-4">
            {!data ? <p className="text-[15px] text-[#8a857f]">Loading…</p> : data.films.length === 0 ? <p className="text-[15px] text-[#8a857f]">None yet: plan the first one above.</p>
              : <FilmGrid films={data.films.slice(0, 6)} names={names} />}
          </div>}
        </Card>

        <p className="mt-10 text-[13px] text-[#8a857f]">
          Looking for older films? <Link href="/app/motion/classic" className="font-semibold text-[#5f5b57] hover:underline">Classic pipeline (Argon)</Link> · <Link href="/app/motion/oneshot" className="font-semibold text-[#5f5b57] hover:underline">One-shot experiments</Link>
        </p>
      </div>
    </AppFrame>
  );
}
