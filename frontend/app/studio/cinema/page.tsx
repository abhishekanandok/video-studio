"use client";

import { Film, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { MEDIA } from "@/components/studio";
import { Button, Card, Chip, Label, PageHeader, Skeleton, cx, inputCls } from "@/components/ui";
import { post, useApi } from "@/lib/api";

/* Cinema Studio: short cinematic AI films (about a minute) made like a director works: story, character and prop
   sheets, the look, a shot breakdown, keyframes, Veo shots, narration in sync, the film. */

const STEPS: [string, string, string][] = [
  ["Story", "An idea in 20 words: who, what, where, when", "Gemini writes the screenplay"],
  ["Sheets", "Every character and prop, front and back", "So each shot shows the same people and things"],
  ["Look", "Camera, depth of field, light, grade", "The decisions applied to every shot"],
  ["Shots", "Each shot: what happens, the acting, the camera", "One keyframe per shot, approved before any video"],
  ["Veo", "Each keyframe comes alive, 4-8 s", "A bad shot is retaken on its own, with your note"],
  ["Voice & film", "Narration in sync, shots joined", "Gemini TTS, one line per shot"],
];

const IDEAS: [string, string][] = [
  ["Chaiwala topper", "Outside an IIT campus gate, a chaiwala has overheard students argue about algorithms and operating systems over his chai for twenty years, answering their doubts while he pours; on GATE result morning the students crowd his stall to check the toppers list, and the AIR 1 name on the phone is his."],
  ["GATE morning dash", "Bengaluru, GATE exam morning: a student wakes up late and the whole city helps him race to the centre, an auto driver, a delivery boy on a scooter, a traffic cop who stops a junction; he bursts into the centre at 9:29, and the guard tells him the exam is tomorrow."],
  ["Papa's first code", "A Bihar farmer who never went to college secretly learns programming on his son's old phone in the fields between harvests, to understand what his son studies; at the son's convocation he hands him an app he built himself."],
  ["Library sprint", "Delhi, 7 a.m.: every day hundreds of aspirants sprint for library seats; one boy always loses the window seat to the same girl; on result day both their names are on the same selection list, and she has been saving him the seat next to hers all along."],
  ["Mess uncle", "In an engineering hostel mess, the cook quizzes every student on DBMS and networks while serving parathas, and nobody gets extra ghee without a right answer; on placement day, every selected student comes back to the mess first."],
];

export default function Cinema() {
  const { data: films, error } = useApi<any[]>("/cinema", { refreshInterval: 5000 });
  const [idea, setIdea] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  if (error) return <Offline message={error.message} />;
  const start = async () => {
    setBusy(true);
    try {
      const f = await post("/cinema", { idea, seconds, veo_sound: sound });
      router.push(`/studio/cinema/${f.slug}`);
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't start", body: e.message });
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader eyebrow="06 — Studio · Cinema" title="Cinema Studio"
        subtitle="Short cinematic AI films, made the way a director works. You approve every step; nothing costly runs without its price shown first."
        action={<Button href="/studio" variant="secondary">Documentaries</Button>} />

      <ol className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map(([t, a, b], i) => (
          <li key={t} className="bg-bg p-4">
            <span className="label text-accent">{String(i + 1).padStart(2, "0")} {t}</span>
            <p className="mt-2 text-[13px] leading-snug text-ink">{a}</p>
            <p className="mt-1 text-[12px] leading-snug text-muted">{b}</p>
          </li>
        ))}
      </ol>

      <Card className="mt-8 p-6">
        <Label n="NEW FILM" className="text-ink">The idea: who, what, where, when, in a sentence or two</Label>
        <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} className={cx(inputCls, "mt-4")}
          placeholder="e.g. An old Indian man skydives from a helicopter with his cat on a cloudy afternoon." />
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="label self-center text-muted"><Sparkles className="mr-1 inline size-3" />sci-fi ideas</span>
          {IDEAS.map(([t, x]) => <Chip key={t} active={idea === x} onClick={() => setIdea(x)}>{t}</Chip>)}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm">Length
            <select value={seconds} onChange={(e) => setSeconds(+e.target.value)} className={cx(inputCls, "w-28")}>
              {[30, 60, 90].map((s) => <option key={s} value={s}>{s} s</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Veo sound effects under the narration (2× the video price)</label>
          <Button loading={busy} disabled={idea.trim().length < 10} icon={<Film />} onClick={start}>Write the screenplay</Button>
        </div>
        <p className="mt-3 text-[12px] text-muted">Fictional people only: never a real or famous person, never footage that could pass for a real event.</p>
      </Card>

      <section className="mt-10">
        <Label n="FILMS" className="text-ink">{films?.length ?? 0} so far</Label>
        <div className="mt-4 border-t border-line">
          {!films ? <Skeleton className="h-24" /> : films.map((f, i) => (
            <Link key={f.slug} href={`/studio/cinema/${f.slug}`} className="group grid grid-cols-[3rem_8rem_1fr_auto] items-center gap-x-6 border-b border-line py-5">
              <span className="label text-muted group-hover:text-accent">{String(i + 1).padStart(2, "0")}</span>
              {f.poster ? <img src={`${MEDIA}/studio-assets/${f.poster}`} alt="" className="aspect-video w-32 border border-line object-cover" /> : <span className="aspect-video w-32 border border-dashed border-line" />}
              <span className="min-w-0">
                <span className="block truncate font-display text-xl font-medium tracking-tight group-hover:text-accent">{f.title}</span>
                <span className="mt-1 block truncate text-[13px] text-muted">{f.idea}</span>
              </span>
              <span className={cx("label", f.busy ? "text-accent" : f.film ? "text-ink" : "text-muted")}>
                {f.busy ? `${f.busy}…` : f.film ? "Film ready" : `${f.made}/${f.shots} shots`}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
