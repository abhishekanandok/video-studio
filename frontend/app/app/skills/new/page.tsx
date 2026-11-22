"use client";

import { ArrowLeft, ArrowUp, Loader2, Paperclip, RotateCcw, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppFrame, Card, ease } from "@/components/app/kit";
import { post } from "@/lib/api";

/* Make a skill, by chatting (backend/app/api/vskill_chat.py): the creator names a topic, the agent asks ONE question
   at a time with 3-4 suggested answers (tap one, type your own, or upload pictures), and stops when it knows enough.
   It then saves the skill (the look, the uploads, a "how to show this topic" note, searched from how teachers explain it
   when the creator has no sources), asks for its sample frames and opens the skill's page. */

type Msg = { role: "user" | "assistant"; text: string; asking?: string; suggestions?: string[]; files?: string[] };
type Upload = { file: File; kind: "references" | "assets" | "background" };
type Turn = { reply: string; suggestions: string[]; asking: string; state: Record<string, string>; done: boolean };

const EXAMPLES = ["Photosynthesis", "The water cycle", "How UPI works", "The Mughal empire", "Newton's laws"];
const VIDEO = /\.(mp4|mov|webm|m4v)$/i;

function Bubble({ m }: { m: Msg }) {
  const me = m.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }} className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-[20px] px-4 py-2.5 text-[15.5px] leading-snug ${me ? "rounded-br-[6px] bg-[#1f1c1b] text-white" : "rounded-bl-[6px] bg-white shadow-[0_10px_24px_-20px_rgb(0_0_0/0.45)] ring-1 ring-[#ecebe5]"}`}>
        {!me && <Sparkles className="mb-0.5 mr-1.5 inline size-4 text-[#3f7d1e]" />}{m.text.replace(/\n\(Uploaded \d+: .*\)$/, "")}
        {m.files && m.files.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{m.files.map((f) => <span key={f} className="rounded-full bg-white/15 px-2 py-0.5 text-[12px]">📎 {f.slice(0, 28)}</span>)}</div>}
      </div>
    </motion.div>
  );
}

export default function NewSkill() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [state, setState] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState<"" | "think" | "save">("");
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  const last = [...msgs].reverse().find((m) => m.role === "assistant");
  const started = msgs.length > 0;

  /** the skill is known: save it with the uploads, ask for its sample frames, open its page */
  const save = async (t: string, history: Msg[], st: Record<string, string>, ups: Upload[]) => {
    setBusy("save");
    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify({ topic: t, state: st, messages: history.map(({ role, text, asking }) => ({ role, text, asking })) }));
      ups.forEach((u) => fd.append(u.kind, u.file));
      const s = await post<{ id: string }>("/vskills/chat/save", fd);
      await post(`/vskills/${s.id}/learn`, {}).catch(() => null); // learn the look from the uploads and answers, then a sample
      router.push(`/app/skills/${s.id}`);
    } catch (e) { setErr(String((e as Error).message).slice(0, 200)); setBusy(""); }
  };

  /** one creator turn: their answer (and any files) goes to the agent with the conversation so far */
  const send = async (text: string, t = topic) => {
    const files = pending;
    const body = text.trim() || (files.length ? `Here ${files.length > 1 ? "are my files" : "is my file"}.` : "");
    if (!body || busy) return;
    const asking = last?.asking ?? "";
    // a background is used as it is; everything else is a reference the look is learned from
    const added: Upload[] = files.map((file) => ({ file, kind: asking === "background" && !VIDEO.test(file.name) ? "background" : "references" }));
    const ups = [...uploads, ...added];
    const note = files.length ? `\n(Uploaded ${files.length}: ${files.map((f) => f.name).join(", ")})` : "";
    const history: Msg[] = [...msgs, { role: "user", text: body + note, files: files.map((f) => f.name) }];
    setMsgs(history); setDraft(""); setPending([]); setUploads(ups); setErr(""); setBusy("think");
    try {
      const r = await post<Turn>("/vskills/chat", { topic: t, state, messages: history.map(({ role, text, asking }) => ({ role, text, asking })) });
      const st = ups.length ? { ...r.state, has_sources: r.state.has_sources || (ups.some((u) => u.kind !== "background") ? "yes" : "") } : r.state;
      const next: Msg[] = [...history, { role: "assistant", text: r.reply, asking: r.asking, suggestions: r.done ? [] : r.suggestions }];
      setMsgs(next); setState(st); setBusy("");
      if (r.done) await save(t, next, st, ups);
    } catch (e) { setErr(String((e as Error).message).slice(0, 200)); setBusy(""); }
  };

  const begin = (t: string) => {
    const v = t.trim();
    if (!v) return;
    setTopic(v);
    send(v, v);
  };

  const composer = (
    <div className="rounded-[22px] bg-white p-2 shadow-[0_14px_34px_-26px_rgb(0_0_0/0.35)] ring-1 ring-[#e6e6df] focus-within:ring-[#a6f04a]">
      {pending.length > 0 && <div className="flex flex-wrap gap-1.5 px-2 pt-1">{pending.map((f, i) => (
        <span key={i} className="flex items-center gap-1.5 rounded-full bg-[#f1f0ea] px-3 py-1 text-[13px] font-medium">{f.name.slice(0, 30)}
          <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setPending(pending.filter((_, j) => j !== i))}><X className="size-3.5" /></button></span>
      ))}</div>}
      <div className="flex items-end gap-2">
        <button type="button" aria-label="Upload pictures or videos" onClick={() => fileRef.current?.click()} disabled={!started}
          className="grid size-10 shrink-0 place-items-center rounded-full text-[#5f5b57] hover:bg-[#f1f0ea] disabled:opacity-40"><Paperclip className="size-5" /></button>
        <input ref={fileRef} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.m4v" className="hidden"
          onChange={(e) => { setPending([...pending, ...Array.from(e.target.files ?? [])].slice(0, 8)); e.target.value = ""; }} />
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (started) { send(draft); } else { begin(draft); } } }}
          placeholder={started ? "Type your own answer…" : "The topic, e.g. Photosynthesis"}
          className="min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-[16px] outline-none" />
        <button type="button" aria-label="Send" disabled={!!busy || (!draft.trim() && !pending.length)} onClick={() => (started ? send(draft) : begin(draft))}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1f1c1b] text-[#a6f04a] transition-transform hover:-translate-y-px disabled:bg-[#ecebe5] disabled:text-[#a29d96]"><ArrowUp className="size-5" /></button>
      </div>
    </div>
  );

  return (
    <AppFrame>
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/app/skills" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5f5b57] hover:text-[#1f1c1b]"><ArrowLeft className="size-4" />All skills</Link>
          {started && !busy && <button type="button" onClick={() => { setMsgs([]); setTopic(""); setState({}); setUploads([]); setPending([]); setErr(""); }}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#8a857f] hover:text-[#1f1c1b]"><RotateCcw className="size-3.5" />Start over</button>}
        </div>

        {!started ? (
          <Card className="p-6 sm:p-8">
            <h1 className="text-[34px] font-bold leading-tight tracking-[-0.02em]">Make a skill</h1>
            <p className="mt-1.5 text-[16px] text-[#5f5b57]">What topic is it for? I&apos;ll ask a few quick questions, one at a time, and make the look for it.</p>
            <div className="mt-5">{composer}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">{EXAMPLES.map((x) => (
              <button key={x} type="button" onClick={() => begin(x)} className="rounded-full border border-[#e2e1da] bg-white px-3.5 py-1.5 text-[14px] font-semibold text-[#3a3633] hover:border-[#a6f04a]">{x}</button>
            ))}</div>
          </Card>
        ) : (
          <>
            <div className="flex items-baseline gap-2"><h1 className="text-[28px] font-bold tracking-[-0.02em]">A skill for</h1><span className="text-[28px] font-bold text-[#3f7d1e]">{topic}</span></div>
            <div className="flex flex-col gap-3">
              {msgs.map((m, i) => <Bubble key={i} m={m} />)}
              <AnimatePresence>
                {busy && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[14px] text-[#8a857f]">
                    <Loader2 className="size-4 animate-spin" />
                    {busy === "save" ? `Making your skill${state.has_sources === "yes" || uploads.length ? "" : `, and looking up how teachers explain ${topic}`}…` : "Thinking…"}
                  </motion.div>
                )}
              </AnimatePresence>
              {!busy && last?.suggestions && last.suggestions.length > 0 && msgs[msgs.length - 1] === last && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3, ease }} className="flex flex-wrap gap-2 pl-1">
                  {last.suggestions.map((s, j) => (
                    <button key={s} type="button" onClick={() => (/^upload|i'll upload/i.test(s) ? fileRef.current?.click() : send(s))}
                      className={`rounded-full border-2 px-3.5 py-1.5 text-[14.5px] font-semibold transition-transform hover:-translate-y-px ${j === 0 ? "border-[#1f1c1b] bg-[#a6f04a] shadow-[2px_2px_0_#1f1c1b]" : "border-[#e2e1da] bg-white hover:border-[#a6f04a]"}`}>{s}</button>
                  ))}
                  <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-[#cfcdc4] px-3.5 py-1.5 text-[14.5px] font-semibold text-[#5f5b57] hover:border-[#a6f04a]"><Paperclip className="size-4" />Upload</button>
                </motion.div>
              )}
              {err && <div className="flex items-center gap-3 text-[14px] text-[#9a2f1d]">{err}
                {last?.role === "assistant" && !last.suggestions?.length && <button type="button" className="font-semibold underline" onClick={() => save(topic, msgs, state, uploads)}>Try saving again</button>}</div>}
              <div ref={endRef} />
            </div>
            {busy !== "save" && <div className="sticky bottom-4">{composer}</div>}
          </>
        )}
      </div>
    </AppFrame>
  );
}
