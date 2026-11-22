"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import { VoicePicker } from "@/components/studio";
import { Button, Chip, Label, Skeleton, inputCls } from "@/components/ui";
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

type Role = { name: string; voice: string; style?: string };

export default function NewCrewFilm() {
  const { data: d } = useApi<any>("/crew/defaults", { revalidateOnFocus: false });
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [pace, setPace] = useState("normal");
  const [roles, setRoles] = useState<Role[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (d && !roles.length) setRoles(d.roles.map((r: any) => ({ name: r.name, voice: r.voice, style: r.style })));
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <div className="space-y-4"><Skeleton className="h-12 w-80" /><Skeleton className="h-96" /></div>;

  const make = async () => {
    setBusy(true);
    try {
      const f = await post("/crew/films", { text, title, subject, language, pace, roles });
      router.push(`/crew/${f.id}`);
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't start the crew", body: e.message });
      setBusy(false);
    }
  };

  return (
    <div>
      <Link href="/crew" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Crew films</Link>
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">New crew film</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-muted">
        The Planner reads your script and plans every slide, then stops for you. Nothing moves to the next step until you approve it.
        Skill 1: text slides with a real photo only where it teaches.
      </p>
      <div className="mt-10">
        <Section n="01" title="Script" hint="Every fact in it becomes part of a slide, in its order. Nothing outside it is added.">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} className={inputCls} placeholder="Paste the script or notes." />
        </Section>
        <Section n="02" title="About the film">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Subject, e.g. Physics" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Title (optional: the Planner writes one)" />
          <div className="flex flex-wrap gap-2">
            {d.languages.map((l: string) => <Chip key={l} active={language === l} onClick={() => setLanguage(l)}>{l}</Chip>)}
            <span className="mx-2 w-px bg-line" />
            {d.paces.map((k: string) => <Chip key={k} active={pace === k} onClick={() => setPace(k)}>{k[0].toUpperCase() + k.slice(1)}</Chip>)}
          </div>
        </Section>
        <Section n="03" title="Hosts" hint="You can change the voices again at the plan gate and the voices gate.">
          <VoicePicker roles={roles.map((r) => r.name)} value={Object.fromEntries(roles.map((r) => [r.name, r.voice]))}
            onChange={(v) => setRoles(roles.map((r) => ({ ...r, voice: v[r.name] ?? r.voice })))} />
        </Section>
        <div className="border-t border-line pt-8">
          <Button size="lg" onClick={make} loading={busy} disabled={text.trim().split(/\s+/).length < 20}>Start the crew</Button>
        </div>
      </div>
    </div>
  );
}
