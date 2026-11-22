"use client";

import { ArrowLeft, FileAudio, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import { Button, Chip, Label, inputCls } from "@/components/ui";
import { cx } from "@/components/ui";
import { post, useApi } from "@/lib/api";
import { ClassicChoice, SkillChoice } from "@/components/skillcard";
import { skillSubject } from "@/components/skill-subjects";

function Section({ n, title, hint, children }: { n: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line py-8 lg:grid-cols-[240px_1fr]">
      <div>
        <Label n={n} className="text-ink">{title}</Label>
        {hint && <p className="mt-2 text-[13px] leading-relaxed text-muted">{hint}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

const LANGUAGES = ["Hinglish", "Hindi", "English"];

export default function NewAudioFilm() {
  const router = useRouter();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [style, setStyle] = useState("");
  const [skill, setSkill] = useState<number | null>(null);
  const [guide, setGuide] = useState("");
  const [examples, setExamples] = useState<File[]>([]);
  // the last guide written, offered again for the next film (this browser only)
  useEffect(() => { try { setGuide(localStorage.getItem("audio-guide") ?? ""); } catch {} }, []);
  const { data: skills } = useApi<any[]>("/slide-skills");
  const { data: subjects } = useApi<string[]>("/slide-skill-subjects");
  useEffect(() => { if (!subject && subjects?.length) setSubject(subjects[0]); }, [subjects, subject]);
  const subjectSkills = (skills ?? []).filter((s) => s.state === "ready" && skillSubject(s).toLowerCase() === subject.trim().toLowerCase());
  const [busy, setBusy] = useState(false);

  const make = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("config", JSON.stringify({ subject, title, language, style, skill, guide }));
      fd.append("file", file);
      examples.forEach((x) => fd.append("guide_images", x));
      try { localStorage.setItem("audio-guide", guide); } catch {}
      const f = await post("/audio/films", fd);
      router.push(`/audio/${f.id}`);
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't start the film", body: e.message });
      setBusy(false);
    }
  };

  return (
    <div>
      <Link href="/audio" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Audio films</Link>
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">New audio film</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-muted">
        Your recording stays exactly as it is. Whisper transcribes it on this PC, Gemini splits it into scenes, and you check the scenes
        before any picture is made. Then Qwen-Image draws the pictures, every scene is rendered, and the film is cut to your audio.
      </p>
      <div className="mt-10">
        <Section n="01" title="Recording" hint="MP3, WAV, M4A, AAC, OGG, OPUS, FLAC, WEBM, or an MP4 (its sound is used).">
          <label className="flex cursor-pointer items-center gap-3 border border-dashed border-line px-5 py-6 hover:border-ink">
            <FileAudio className="size-5 text-muted" />
            <span className="text-[14px]">{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Choose the audio file"}</span>
            <input type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.webm,.mp4,audio/*" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </Section>
        <Section n="02" title="About it" hint="The language helps Whisper; the subject helps Gemini pick the scenes and words.">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => <Chip key={l} active={language === l} onClick={() => setLanguage(l)}>{l}</Chip>)}
          </div>
          <select aria-label="Subject" value={subject} onChange={(e) => { setSubject(e.target.value); setSkill(null); }} className={inputCls} disabled={!subjects}>
            {(subjects ?? (subject ? [subject] : [])).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Title (optional: Gemini writes one)" />
        </Section>
        <Section n="03" title="How to write it" hint="Optional. Tell the agent how the slides should read: how bullets are worded, how formulas, dates, terms or examples appear, what must always be shown. Add images of slides or notes done the way you want; the agent follows them. Any subject.">
          <textarea value={guide} onChange={(e) => setGuide(e.target.value)} rows={5} className={inputCls}
            placeholder={"e.g. Whenever the teacher states a formula, give it its own bullet, written like: Speed = Distance ÷ Time (units: m/s).\nWrite every definition as Term: meaning. Keep numbers with their units. Show dates as 1857 (First War of Independence)."} />
          <div className="flex flex-wrap items-start gap-3">
            {examples.map((x, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(x)} alt="" className="h-24 w-36 border border-line object-cover" />
                <button type="button" onClick={() => setExamples(examples.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 grid size-5 place-items-center bg-ink text-white"><X className="size-3" /></button>
              </div>
            ))}
            <label className="grid h-24 w-36 cursor-pointer place-items-center border border-dashed border-line text-center text-[12.5px] text-muted hover:border-ink">
              <span className="flex flex-col items-center gap-1"><ImagePlus className="size-5" />Add example images</span>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { setExamples([...examples, ...Array.from(e.target.files ?? [])].slice(0, 6)); e.target.value = ""; }} />
            </label>
          </div>
        </Section>
        <Section n="04" title="Slide skill" hint="The film's look, from the Skill Tab: background, where the pictures go and how they are painted. The paper card and its bullets are the same in every skill.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ClassicChoice selected={skill === null} onClick={() => setSkill(null)} />
            {subjectSkills.map((s) => (
              <SkillChoice key={s.id} s={s} selected={skill === s.id} onClick={() => setSkill(s.id)} />
            ))}
          </div>
          <p className="text-[12.5px] text-muted">{subjectSkills.length
            ? `${subjectSkills.length} ${subject} skill${subjectSkills.length > 1 ? "s" : ""}: ${subjectSkills.map((s) => s.name).join(" · ")}`
            : `No ${subject} skills yet: the film uses the classic paper look.`}</p>
          <Link href={`/skills?subject=${encodeURIComponent(subject.trim() || "Physics")}`} className="text-sm underline">Manage subject skills or create a subject</Link>
          {skill !== null && <p className="text-[12.5px] text-muted">If the skill has a background for this film&apos;s subject, the film uses it.</p>}
          {skill === null && (
            <input value={style} onChange={(e) => setStyle(e.target.value)} className={inputCls}
              placeholder="Picture style for Qwen-Image (optional), e.g. hand-drawn chalkboard sketch · watercolour storybook" />
          )}
        </Section>
        <div className="border-t border-line pt-8">
          <Button size="lg" onClick={make} loading={busy} disabled={!file}>Transcribe and plan the scenes</Button>
        </div>
      </div>
    </div>
  );
}
