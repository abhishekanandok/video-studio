"use client";

import { ArrowLeft, Check, Copy, Send, Trash2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { MEDIA } from "@/components/studio";
import { Button, Label, Skeleton, cx, inputCls } from "@/components/ui";
import { api, post, useApi } from "@/lib/api";
import { MediaDrop, STATUS, useAuthor } from "@/components/skills";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <div className="label mb-3 text-muted">{title}</div>
      {children}
    </section>
  );
}

const List = ({ items }: { items?: string[] }) =>
  items?.length ? <ul className="space-y-1.5">{items.map((x, i) => <li key={i} className="border-l border-line pl-3 text-[14px] leading-relaxed">{x}</li>)}</ul>
    : <p className="text-[13px] text-muted">—</p>;

export default function SkillPage() {
  const { id } = useParams<{ id: string }>();
  const { data: s, error, mutate } = useApi<any>(`/crew/skills/${id}`);
  const [msg, setMsg] = useState("");
  const [author, setAuthor] = useAuthor();
  const [busy, setBusy] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const toast = useToast();
  if (error) return <Offline message={error.message} />;
  if (!s) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;

  const run = async (what: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(what);
    try { await fn(); await mutate(); if (ok) toast({ tone: "good", title: ok }); }
    catch (e: any) { toast({ tone: "bad", title: "Couldn't do that", body: e.message }); }
    finally { setBusy(null); }
  };
  const send = () => run("send", async () => { await post(`/crew/skills/${s.id}/notes`, { author: author || "Team", text: msg, ask_scout: true }); setMsg(""); });
  const upload = (f: File) => run("upload", () => {
    const fd = new FormData(); fd.append("file", f); fd.append("caption", caption); fd.append("author", author || "Team");
    return post(`/crew/skills/${s.id}/examples`, fd).then(() => setCaption(""));
  }, "Example added");
  const setStatus = (status: string) => run("status", () => api(`/crew/skills/${s.id}`, { method: "PUT", body: JSON.stringify({ status }) }));
  const st = STATUS[s.status];

  return (
    <div className="space-y-6 pb-20">
      <Link href="/crew/skills" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Skill Lab</Link>
      <div>
        <Label n={`SKILL ${String(s.id).padStart(2, "0")}`} className="text-ink">{[s.kind, s.used_by && `used by the ${s.used_by}`, s.by].filter(Boolean).join(" · ")}</Label>
        <h1 className="mt-5 font-display text-4xl font-medium tracking-tight sm:text-5xl">{s.name}</h1>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed">{s.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className={cx("label px-2 py-1", st?.cls)}>{st?.label}</span>
          <span className="text-[13px] text-muted">{st?.hint}</span>
          {s.status === "idea" && <Button size="sm" icon={<Check />} loading={busy === "status"} onClick={() => setStatus("approved")}>Approve: build this skill</Button>}
          {s.status === "approved" && <Button size="sm" variant="secondary" loading={busy === "status"} onClick={() => setStatus("idea")}>Back to idea</Button>}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <Block title="Examples">
            <div className="grid gap-4 sm:grid-cols-2">
              {(s.examples ?? []).map((e: any) => (
                <figure key={e.file} className="group relative border border-line">
                  {e.kind === "video" ? <video controls preload="none" src={`${MEDIA}${e.url}`} className="aspect-video w-full bg-black" />
                    : <a href={`${MEDIA}${e.url}`} target="_blank" rel="noreferrer"><img src={`${MEDIA}${e.url}`} alt={e.caption} className="aspect-video w-full bg-surface object-contain" /></a>}
                  <figcaption className="px-3 py-2 text-[12px] text-muted"><span className="label mr-1.5">{e.kind}</span>{e.caption} · {e.by}</figcaption>
                  {s.status !== "built" && (
                    <button onClick={() => run("del", () => api(`/crew/skills/${s.id}/examples/${e.file}`, { method: "DELETE" }))} aria-label="Remove example"
                      className="absolute right-2 top-2 hidden size-7 place-items-center bg-bg/90 text-muted hover:text-accent group-hover:grid"><Trash2 className="size-3.5" /></button>
                  )}
                </figure>
              ))}
            </div>
            <div className="mt-4"><MediaDrop video busy={busy === "upload"} onFile={upload}
              label="Add your slide or a video: paste it (⌘V / Ctrl+V), drop it here, or" /></div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption for your example (optional)" className={cx(inputCls, "w-64 py-2 text-[13px]")} />
              {s.image_prompt && <Button size="sm" variant="secondary" icon={<Wand2 />} loading={busy === "sample"}
                onClick={() => run("sample", () => post(`/crew/skills/${s.id}/sample`), "Sample drawn")}>Let Gemini draw a sample</Button>}
            </div>
          </Block>

          {s.image_prompt && (
            <Block title="Prompt to generate a sample slide">
              <p className="whitespace-pre-wrap bg-surface p-4 font-mono text-[12.5px] leading-relaxed">{s.image_prompt}</p>
              <div className="mt-2 flex items-center gap-3">
                <Button size="sm" variant="secondary" icon={<Copy />} onClick={() => { navigator.clipboard.writeText(s.image_prompt); toast({ tone: "good", title: "Prompt copied" }); }}>Copy prompt</Button>
                <span className="text-[12.5px] text-muted">Generate it in any image tool, copy the picture, and paste it above (⌘V / Ctrl+V).</span>
              </div>
            </Block>
          )}

          <Block title="Why it helps students"><p className="text-[14px] leading-relaxed">{s.students || "—"}</p></Block>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <Block title="Use it for"><List items={s.when_to_use} /></Block>
            <Block title="Don't use it for"><List items={s.avoid_when} /></Block>
          </div>
          <Block title="How it looks"><List items={s.look} /></Block>
          <Block title="How it moves"><List items={s.motion} /></Block>
          <Block title="Best practices"><List items={s.best_practices} /></Block>
          {!!s.sources?.length && (
            <Block title="Research the Scout used">
              <div className="space-y-1">{s.sources.map((x: any) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="block truncate text-[13px] text-accent hover:underline">{x.title || x.url}</a>)}</div>
            </Block>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Block title="Brainstorm with the team and the Scout">
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {(s.notes ?? []).length === 0 && <p className="text-[13px] text-muted">No messages yet. Ask the Scout anything: “make it work for history dates”, “simpler colours”…</p>}
              {(s.notes ?? []).map((n: any, i: number) => (
                <div key={i} className={cx("border-l-2 pl-3", n.author === "Skill Scout" ? "border-[#ffd60a]" : "border-line")}>
                  <div className="label text-muted">{n.author} · {n.at}</div>
                  <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed">{n.text}</p>
                  {n.changes && (
                    <div className="mt-2">
                      <details className="text-[12px] text-muted"><summary className="cursor-pointer">Suggested changes: {Object.keys(n.changes).join(", ")}</summary>
                        <pre className="mt-1 whitespace-pre-wrap font-mono text-[11.5px]">{JSON.stringify(n.changes, null, 1)}</pre></details>
                      {n.applied ? <span className="label mt-1 inline-block text-ink">✓ applied</span> :
                        <Button size="sm" variant="secondary" className="mt-1" loading={busy === `apply${i}`}
                          onClick={() => run(`apply${i}`, () => post(`/crew/skills/${s.id}/notes/${i}/apply`), "Changes applied")}>Apply these changes</Button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" className={cx(inputCls, "py-2 text-[13px]")} />
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="Your idea or question (Hinglish is fine)…" className={cx(inputCls, "text-[13.5px]")} />
              <Button icon={<Send />} loading={busy === "send"} disabled={!msg.trim()} onClick={send}>{busy === "send" ? "The Scout is thinking…" : "Send"}</Button>
            </div>
          </Block>
        </aside>
      </div>
    </div>
  );
}
