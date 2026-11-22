"use client";

import { ArrowLeft, ChevronDown, Mic, PenLine, Play, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { type NScene, SlidePreview, StageStrip } from "@/components/exam";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { CostPanel, MEDIA } from "@/components/studio";
import { Button, Label, Sheet, Skeleton, cx, inputCls } from "@/components/ui";
import { api, post, useApi } from "@/lib/api";

const STAGE_NAMES: Record<string, string> = {
  queued: "Starting", extract: "Reading the book", slides: "Making slides", scripts: "Writing narration", voices: "Recording voices",
  render: "Rendering scenes", join: "Joining the film", done: "Ready", failed: "Stopped with an error", stopped: "Stopped",
};

export default function NotesFilm() {
  const { id } = useParams<{ id: string }>();
  const { data: f, error, mutate } = useApi<any>(`/notes/films/${id}`, { refreshInterval: (d: any) => (d?.running ? 3000 : 0) });
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<NScene | null>(null);
  const [redo, setRedo] = useState<NScene | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const toast = useToast();

  if (error) return <Offline message={error.message} />;
  if (!f) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-28" /><Skeleton className="h-96" /></div>;

  const call = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast({ tone: "good", title: ok });
      await mutate();
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't do that", body: e.message });
    } finally {
      setBusy(false);
    }
  };
  const scenes: NScene[] = f.scenes ?? [];
  const rendered = scenes.filter((s) => s.video).length;

  return (
    <div className="space-y-10">
      <Link href="/exam" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Notes films</Link>
      <div>
        <Label n={`NOTES ${String(f.id).padStart(2, "0")}`} className="text-ink">
          {[f.skill, f.subject, f.language, f.source?.file, f.slides ? `${f.slides} slides` : null].filter(Boolean).join(" · ")}
        </Label>
        <h1 className="mt-6 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl">{f.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className={cx("label px-2 py-1", f.stage === "done" ? "bg-[#ffd60a] text-[#141414]" : f.stage === "failed" ? "bg-accent text-white" : "text-muted")}>
            {STAGE_NAMES[f.stage] ?? f.stage}{f.running ? "…" : ""}
          </span>
          {f.running ? <Button variant="secondary" size="sm" icon={<Square />} loading={busy} onClick={() => call(() => post(`/notes/films/${f.id}/stop`))}>Stop</Button>
            : f.stage !== "done" ? <Button size="sm" icon={<Play />} loading={busy} onClick={() => call(() => post(`/notes/films/${f.id}/continue`))}>Continue</Button>
            : <Button variant="secondary" size="sm" icon={<RefreshCw />} loading={busy} onClick={() => call(() => post(`/notes/films/${f.id}/continue`))}>Apply edits &amp; render</Button>}
          <span className="label text-muted">Hosts: {(f.roles ?? []).map((r: any) => `${r.name} · ${r.voice}`).join("  ")}</span>
        </div>
      </div>

      <StageStrip stage={f.stage} stages={f.stages ?? {}} running={f.running} />
      {!!f.log?.length && (
        <div className="border border-line bg-surface px-5 py-4 font-mono text-[12.5px] leading-relaxed text-muted">
          {f.log.slice(-4).map((l: any, i: number) => <div key={i}><span className="text-ink-2">{l.at}</span>  {l.msg}</div>)}
        </div>
      )}

      {f.video && (
        <section>
          <Label n="FILM" className="text-ink">The whole film</Label>
          <video key={f.video} src={`${MEDIA}${f.video}`} controls className="mt-4 w-full border border-line bg-black" />
        </section>
      )}

      <section>
        <div className="flex items-end justify-between gap-4">
          <Label n="SCENES" className="text-ink">Scene by scene</Label>
          <span className="label text-muted">{rendered} / {scenes.length} rendered</span>
        </div>
        {scenes.length <= 1 && !scenes[0]?.headline ? (
          <p className="mt-6 text-[14px] text-muted">The scenes appear here as the slides are made.</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {scenes.map((sc) => <SceneCard key={sc.index} sc={sc} total={scenes.length} locked={f.running}
              onEdit={() => setEdit(sc)} onRedo={() => setRedo(sc)}
              onRender={() => call(() => post(`/notes/films/${f.id}/scenes/${sc.index}/redo`, { what: "render" }), `Re-rendering scene ${sc.index}`)} />)}
          </div>
        )}
      </section>

      <section className="border-t border-line pt-6">
        <button onClick={() => setShowPrompt(!showPrompt)} className="label flex items-center gap-2 text-muted hover:text-ink">
          <ChevronDown className={cx("size-4 transition-transform", showPrompt && "rotate-180")} /> System prompt used for the slides
        </button>
        {showPrompt && <pre className="mt-4 whitespace-pre-wrap border border-line bg-surface p-5 font-mono text-[12.5px] leading-relaxed text-ink-2">{f.system_prompt}</pre>}
      </section>
      <CostPanel cost={f.cost} />

      <EditSlide scene={edit} onClose={() => setEdit(null)} onSave={(body) => call(async () => {
        await api(`/notes/films/${f.id}/slides/${edit!.index}`, { method: "PUT", body: JSON.stringify(body) });
        setEdit(null);
      }, "Slide saved. Press “Apply edits & render” to re-render it.")} />
      <RedoNarration scene={redo} onClose={() => setRedo(null)} onRedo={(feedback) => call(async () => {
        await post(`/notes/films/${f.id}/scenes/${redo!.index}/redo`, { what: "narration", feedback });
        setRedo(null);
      }, "Rewriting this scene's narration")} />
    </div>
  );
}

function SceneCard({ sc, total, locked, onEdit, onRedo, onRender }: { sc: NScene; total: number; locked: boolean; onEdit: () => void; onRedo: () => void; onRender: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-line">
      {sc.video ? <video src={`${MEDIA}${sc.video}`} controls preload="metadata" className="aspect-video w-full bg-black" /> : <SlidePreview sc={sc} total={total} />}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="label text-ink">{String(sc.index).padStart(2, "0")} · {sc.kind === "hook" ? "Cold open" : sc.section}</span>
          <span className="label text-muted">{sc.animated ? "animation + " : ""}{sc.video ? "rendered" : sc.voiced ? "voiced" : sc.lines.length ? "narrated" : "slide"}</span>
        </div>
        {sc.kind === "slide" && <div className="mt-1 text-[14px] font-medium">{sc.title}</div>}
        {!!sc.lines.length && (
          <button onClick={() => setOpen(!open)} className="label mt-3 flex items-center gap-1.5 text-muted hover:text-ink">
            <ChevronDown className={cx("size-3.5 transition-transform", open && "rotate-180")} /> Narration · {(sc.explain?.length ?? 0) + sc.lines.length} lines
          </button>
        )}
        {open && (
          <div className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed">
            {!!sc.explain?.length && <div className="label text-muted">Over the animation</div>}
            {(sc.explain ?? []).map((l, i) => <p key={`e${i}`}><span className="font-semibold">{l.speaker}:</span> {l.speech}</p>)}
            {!!sc.explain?.length && <div className="label pt-2 text-muted">While the bullets appear</div>}
            {sc.lines.map((l, i) => <p key={i}><span className="font-semibold">{l.speaker}:</span> {l.speech}</p>)}
          </div>
        )}
        {!locked && (
          <div className="mt-3 flex flex-wrap gap-1">
            {sc.kind === "slide" && <Button variant="ghost" size="sm" icon={<PenLine />} onClick={onEdit}>Edit slide</Button>}
            {!!sc.lines.length && <Button variant="ghost" size="sm" icon={<Mic />} onClick={onRedo}>Redo narration</Button>}
            {sc.voiced && <Button variant="ghost" size="sm" icon={<RefreshCw />} onClick={onRender}>Re-render</Button>}
          </div>
        )}
      </div>
    </div>
  );
}

type SlideBody = { section: string; title: string; bullets: { text: string; key: string[]; green: string[] }[] };
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function EditSlide({ scene, onClose, onSave }: { scene: NScene | null; onClose: () => void; onSave: (b: SlideBody) => void }) {
  const [draft, setDraft] = useState<{ section: string; title: string; bullets: { text: string; key: string; green: string }[] } | null>(null);
  const key = scene ? `${scene.index}` : "";
  const [seen, setSeen] = useState("");
  if (scene && seen !== key) {
    setSeen(key);
    setDraft({ section: scene.section ?? "", title: scene.title ?? "",
               bullets: (scene.bullets ?? []).map((b) => ({ text: b.text, key: (b.key ?? []).join(", "), green: (b.green ?? []).join(", ") })) });
  }
  if (!scene && seen) setSeen("");
  return (
    <Sheet open={!!scene} onClose={onClose} title={`Edit slide ${scene?.index ?? ""}`} subtitle="The narration stays as it is; the scene re-renders with the new text." wide>
      {draft && (
        <div className="space-y-4">
          <input value={draft.section} onChange={(e) => setDraft({ ...draft, section: e.target.value })} className={inputCls} placeholder="Section" />
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} placeholder="Title" />
          {draft.bullets.map((b, i) => (
            <div key={i} className="space-y-2 border-t border-line pt-4">
              <textarea value={b.text} rows={2} onChange={(e) => setDraft({ ...draft, bullets: draft.bullets.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} className={inputCls} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={b.key} onChange={(e) => setDraft({ ...draft, bullets: draft.bullets.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) })} className={inputCls} placeholder="Yellow terms, comma-separated" />
                <input value={b.green} onChange={(e) => setDraft({ ...draft, bullets: draft.bullets.map((x, j) => (j === i ? { ...x, green: e.target.value } : x)) })} className={inputCls} placeholder="Green terms, comma-separated" />
              </div>
            </div>
          ))}
          <Button onClick={() => onSave({ section: draft.section, title: draft.title, bullets: draft.bullets.map((b) => ({ text: b.text, key: list(b.key), green: list(b.green) })) })}>Save slide</Button>
        </div>
      )}
    </Sheet>
  );
}

function RedoNarration({ scene, onClose, onRedo }: { scene: NScene | null; onClose: () => void; onRedo: (feedback: string) => void }) {
  const [text, setText] = useState("");
  return (
    <Sheet open={!!scene} onClose={onClose} title={`Redo the narration of scene ${scene?.index ?? ""}`} subtitle="The hosts' lines are rewritten, re-recorded and the scene re-rendered; the film is rejoined.">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className={inputCls} placeholder="What should change? (optional) e.g. slower, explain the formula with an example" />
      <div className="mt-4"><Button icon={<Mic />} onClick={() => { onRedo(text); setText(""); }}>Redo narration</Button></div>
    </Sheet>
  );
}
