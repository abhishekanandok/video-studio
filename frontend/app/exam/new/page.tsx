"use client";

import { ArrowLeft, FileUp, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import { VoicePicker } from "@/components/studio";
import { Button, Chip, Label, Skeleton, inputCls } from "@/components/ui";
import { api, post, useApi } from "@/lib/api";

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

export default function NewNotesFilm() {
  const { data: d } = useApi<any>("/notes/defaults", { revalidateOnFocus: false });
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"paste" | "upload">("upload");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fromPage, setFromPage] = useState("");
  const [toPage, setToPage] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [pace, setPace] = useState("normal");
  const [roles, setRoles] = useState<Role[]>([]);
  const [prompt, setPrompt] = useState("");
  const [skill, setSkill] = useState<"slides" | "motion">("slides");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (d && !roles.length) {
      setRoles(d.roles.map((r: any) => ({ name: r.name, voice: r.voice, style: r.style })));
      setPrompt(d.system_prompt);
    }
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <div className="space-y-4"><Skeleton className="h-12 w-80" /><Skeleton className="h-96" /></div>;
  const pdf = !!file?.name.toLowerCase().endsWith(".pdf");
  const ready = mode === "paste" ? !!text.trim() : !!file;

  const make = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("config", JSON.stringify({ title, subject, language, pace, roles, system_prompt: prompt, skill, text: mode === "paste" ? text : "",
                                           from_page: pdf ? Number(fromPage) || null : null, to_page: pdf ? Number(toPage) || null : null }));
      if (mode === "upload" && file) fd.append("file", file);
      const f = await post("/notes/films", fd);
      router.push(`/exam/${f.id}`);
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't start the film", body: e.message });
      setBusy(false);
    }
  };
  const saveDefault = async () => {
    try {
      await api("/notes/defaults", { method: "PUT", body: JSON.stringify({ text: prompt }) });
      toast({ tone: "good", title: "Saved as the default prompt" });
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't save", body: e.message });
    }
  };

  return (
    <div>
      <Link href="/exam" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Notes films</Link>
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">New notes film</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-muted">
        Every fact in the source becomes a slide, in the source&apos;s order. A cold-open hook comes first, then the hosts talk through each
        slide. There is no length limit: the film runs as long as the content needs.
      </p>

      <div className="mt-10">
        <Section n="01" title="Source" hint="A book is read page by page (scanned pages are read from the picture). Pick a page range for one chapter.">
          <div className="flex gap-2">
            <Chip active={mode === "upload"} onClick={() => setMode("upload")}>Upload a book or notes</Chip>
            <Chip active={mode === "paste"} onClick={() => setMode("paste")}>Paste a script</Chip>
          </div>
          {mode === "upload" ? (
            <>
              <label className="flex cursor-pointer items-center gap-3 border border-dashed border-line px-5 py-6 hover:border-ink">
                <FileUp className="size-5 text-muted" />
                <span className="text-[14px]">{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Choose a PDF, TXT or MD file"}</span>
                <input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              {pdf && (
                <div className="flex flex-wrap items-center gap-3 text-[14px]">
                  <span className="text-muted">Pages</span>
                  <input value={fromPage} onChange={(e) => setFromPage(e.target.value.replace(/\D/g, ""))} placeholder="from (first)" className={`${inputCls} w-32`} />
                  <span className="text-muted">to</span>
                  <input value={toPage} onChange={(e) => setToPage(e.target.value.replace(/\D/g, ""))} placeholder="to (last)" className={`${inputCls} w-32`} />
                  <span className="text-[12.5px] text-muted">Leave empty for the whole book.</span>
                </div>
              )}
            </>
          ) : (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className={inputCls}
              placeholder="Paste the transcript, script or notes. Everything in it is turned into slides, in order." />
          )}
        </Section>

        <Section n="02" title="About the film" hint="The subject tells the note-maker how to read the system prompt (it was written for Chemistry).">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Subject, e.g. Chemistry, Polity, Computer Networks" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Title (optional: the agent writes one from the hook)" />
          <div className="flex flex-wrap gap-2">
            {d.languages.map((l: string) => <Chip key={l} active={language === l} onClick={() => setLanguage(l)}>{l}</Chip>)}
            <span className="mx-2 w-px bg-line" />
            {Object.entries(d.paces as Record<string, string>).map(([k, v]) => <Chip key={k} active={pace === k} onClick={() => setPace(k)}>{v}</Chip>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["slides", "Skill 1 · Text slides", "Crisp bilingual slides with highlights; the hosts talk each one through as its bullets appear. The default."],
               ["motion", "Skill 2 · Motion explainer", "Experimental: a 3Blue1Brown-style animation explains each idea first, then the slide appears as a recap."]] as const).map(([k, t, d]) => (
              <button key={k} type="button" onClick={() => setSkill(k)}
                className={`border px-4 py-3 text-left transition-colors ${skill === k ? "border-ink bg-[#ffd60a]/25" : "border-line hover:border-ink"}`}>
                <div className="text-[14px] font-medium">{t}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-muted">{d}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section n="03" title="Hosts" hint="Two hosts talk it through like the network lesson film (default: Kabir · Enceladus and Tara · Aoede).">
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((r, i) => (
              <input key={i} value={r.name} onChange={(e) => setRoles(roles.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} />
            ))}
          </div>
          <VoicePicker roles={roles.map((r) => r.name)} value={Object.fromEntries(roles.map((r) => [r.name, r.voice]))}
            onChange={(v) => setRoles(roles.map((r) => ({ ...r, voice: v[r.name] ?? r.voice })))} />
        </Section>

        <Section n="04" title="System prompt" hint="How the slides are written. Prefilled with the saved default; edit it for this film, or save your edit as the new default.">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={16} className={`${inputCls} font-mono text-[12.5px] leading-relaxed`} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Save />} onClick={saveDefault}>Save as default</Button>
            <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => setPrompt(d.system_prompt)}>Reset to the default</Button>
          </div>
        </Section>

        <div className="border-t border-line pt-8">
          <Button size="lg" onClick={make} loading={busy} disabled={!ready || roles.some((r) => !r.name.trim() || !r.voice)}>Make the notes film</Button>
        </div>
      </div>
    </div>
  );
}
