"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { MEDIA } from "@/components/studio";
import { Button, Label, PageHeader, Skeleton, cx, inputCls } from "@/components/ui";
import { post, useApi } from "@/lib/api";
import { MediaDrop, STATUS, useAuthor } from "@/components/skills";

/* The Skill Lab: every way the crew can put an idea on screen. The team brainstorms with the Skill Scout (a research
   agent); an approved skill gets built into the renderer, and then the Director can use it in any film. */

export default function SkillLab() {
  const { data, error, mutate } = useApi<any[]>("/crew/skills");
  const [brief, setBrief] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(1);
  const [author, setAuthor] = useAuthor();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<string>("all");
  const router = useRouter();
  const toast = useToast();
  if (error) return <Offline message={error.message} />;

  const scout = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("brief", brief);
      fd.append("author", author || "Team");
      fd.append("count", String(count));
      if (file) fd.append("file", file);
      const r = await post("/crew/skills/scout", fd);
      await mutate();
      router.push(`/crew/skills/${r.ids[0]}`);
    } catch (e: any) {
      toast({ tone: "bad", title: "The Scout couldn't do that", body: e.message });
      setBusy(false);
    }
  };
  const list = (data ?? []).filter((s) => tab === "all" || s.status === tab);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={<Label n="LAB">Skills</Label>} title="Skill Lab"
        subtitle="Every way the crew can put an idea on screen: layouts, diagrams, infographic cards, backgrounds, motion, collage. Brainstorm a new one with the Skill Scout, add example slides, and approve it to get it built." />

      <section className="border border-ink p-5">
        <div className="label flex items-center gap-1.5 text-ink"><Sparkles className="size-3.5" /> Brainstorm a new skill with the Skill Scout</div>
        <p className="mt-2 text-[13.5px] text-muted">Describe what you want students to see, and/or add a reference picture (a slide, a poster, a screenshot of a video).
          The Scout researches how Indian exam students learn from formats like it, then proposes the skill with a prompt you can use to generate a sample slide.</p>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} className={cx(inputCls, "mt-3")}
          placeholder="e.g. A timeline card for history dates: 4-5 events on a line, the year big, one keyword each…" />
        <div className="mt-3">
          {file ? (
            <div className="flex items-center gap-3 border border-line p-2">
              <img src={URL.createObjectURL(file)} alt="" className="h-16 w-28 bg-surface object-contain" />
              <span className="text-[13px]">Reference picture: {file.name}</span>
              <button onClick={() => setFile(null)} className="label ml-auto px-2 text-muted hover:text-accent">Remove</button>
            </div>
          ) : <MediaDrop onFile={setFile} label="Reference picture (optional): paste it (⌘V / Ctrl+V), drop it here, or" />}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={cx(inputCls, "w-auto py-2 text-[13px]")}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n} idea{n > 1 ? "s" : ""}</option>)}
          </select>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" className={cx(inputCls, "w-40 py-2 text-[13px]")} />
          <Button onClick={scout} loading={busy} disabled={!brief.trim() && !file}>{busy ? "Researching… (about a minute)" : "Ask the Scout"}</Button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {["all", "built", "approved", "idea"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("label h-8 border px-3", tab === t ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink")}>
            {t === "all" ? "All" : STATUS[t].label} {data ? `· ${(t === "all" ? data : data.filter((s) => s.status === t)).length}` : ""}
          </button>
        ))}
      </div>

      {!data ? <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div> : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const pic = s.examples?.find((e: any) => e.kind !== "video");
            return (
              <Link key={s.id} href={`/crew/skills/${s.id}`} className="group flex flex-col border border-line hover:border-ink">
                <div className="aspect-video w-full bg-surface">{pic && <img src={`${MEDIA}${pic.url}`} alt="" className="h-full w-full object-cover" />}</div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <span className={cx("label px-1.5 py-0.5", STATUS[s.status]?.cls)}>{STATUS[s.status]?.label}</span>
                    <span className="label text-muted">{s.kind}</span>
                  </div>
                  <div className="mt-2 text-[16px] font-medium">{s.name}</div>
                  <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-muted">{s.summary}</p>
                  <div className="label mt-auto flex items-center justify-between pt-3 text-muted">
                    <span>{s.notes?.length ?? 0} messages · {s.examples?.length ?? 0} examples</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
