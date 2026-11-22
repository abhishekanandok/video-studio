"use client";

import { ArrowLeft, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import { ClassicChoice, SkillChoice } from "@/components/skillcard";
import { SubjectPicker, skillSubject, useSkillSubject } from "@/components/skill-subjects";
import { Button, Label, inputCls } from "@/components/ui";
import { post, useApi } from "@/lib/api";

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

export default function NewSkill() {
  const { data: skills } = useApi<any[]>("/slide-skills");
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [subject, setSubject] = useSkillSubject();
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [own, setOwn] = useState<File[]>([]);
  const [bases, setBases] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const make = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify({ name, subject, notes, extends: bases }));
      files.forEach((f) => fd.append("files", f));
      own.forEach((f) => fd.append("assets", f));
      const s = await post("/slide-skills", fd);
      router.push(`/skills/${s.id}`);
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't make the skill", body: e.message });
      setBusy(false);
    }
  };

  return (
    <div>
      <Link href="/skills" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Skill Tab</Link>
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">New skill</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-muted">
        Show the agent the slides you like. It studies their background, pictures and layout, and makes a look for your films:
        a painted background, pictures in the same art style, placed the same way. Your paper card and its bullets stay exactly as they are.
      </p>
      <div className="mt-10">
        <Section n="01" title="Reference slides" hint="3-8 slides or screenshots in the look you want (PNG, JPG, WEBP).">
          <label className="flex cursor-pointer items-center gap-3 border border-dashed border-line px-5 py-6 hover:border-ink">
            <ImagePlus className="size-5 text-muted" />
            <span className="text-[14px]">{files.length ? `${files.length} images chosen (click to add more)` : "Choose the reference images"}</span>
            <input type="file" multiple accept=".png,.jpg,.jpeg,.webp" className="hidden"
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 8))} />
          </label>
          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} alt="" className="aspect-video w-full object-cover" />
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove"
                    className="absolute right-1 top-1 grid size-6 place-items-center bg-black/60 text-white"><X className="size-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section n="02" title="Your own images" hint="Optional: a background, stickers, a logo or a frame to use exactly as they are (not repainted). Say in the notes where each goes.">
          <label className="flex cursor-pointer items-center gap-3 border border-dashed border-line px-5 py-5 hover:border-ink">
            <ImagePlus className="size-5 text-muted" />
            <span className="text-[14px]">{own.length ? own.map((f) => f.name).join(", ") : "Choose images to use as they are"}</span>
            <input type="file" multiple accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setOwn([...own, ...Array.from(e.target.files ?? [])].slice(0, 8))} />
          </label>
        </Section>
        <Section n="03" title="What you want" hint="Tell the agent what to take from the references, and anything else: where the picture goes, picture breaks between bullets, real photos or painted art.">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Skill name, e.g. Storybook Watercolor" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className={inputCls}
            placeholder="e.g. Card on the right; a big oval cartoon picture on the left; a small chalkboard sticker at the bottom; my logo.png in the top corner; after every bullet show its picture full screen for 2 seconds." />
        </Section>
        <Section n="04" title="Build on skills" hint="Choose a subject to see its styles, or create a subject for a new collection. The first skill you pick is the base; the others add their features.">
          <SubjectPicker subject={subject} onChange={(next) => { setSubject(next); setBases([]); }} />
          <p className="text-sm text-muted">This new skill will belong to {subject}.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ClassicChoice selected={!bases.length} onClick={() => setBases([])} />
            {(skills ?? []).filter((s) => s.state === "ready" && skillSubject(s) === subject).map((s) => (
              <SkillChoice key={s.id} s={s} selected={bases.includes(s.id)} order={bases.includes(s.id) ? bases.indexOf(s.id) + 1 : undefined}
                onClick={() => setBases(bases.includes(s.id) ? bases.filter((x) => x !== s.id) : [...bases, s.id])} />
            ))}
          </div>
          {skills && !skills.some((s) => skillSubject(s) === subject) && <p className="border border-dashed border-line p-5 text-sm text-muted">No skills for {subject} yet. Add references or describe a look above to create the first one.</p>}
        </Section>
        <div className="border-t border-line pt-8">
          <Button size="lg" onClick={make} loading={busy} disabled={!name.trim() || (!files.length && !own.length && !notes.trim() && bases.length < 2)}>Make the skill</Button>
        </div>
      </div>
    </div>
  );
}
