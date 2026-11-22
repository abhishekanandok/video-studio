"use client";

import { ArrowLeft, Check, ImageIcon, Play, Plus, RefreshCw, Save, Square, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { CostPanel, MEDIA } from "@/components/studio";
import { Button, Chip, Label, Skeleton, cx, inputCls } from "@/components/ui";
import { api, post, useApi } from "@/lib/api";

const STAGES: Record<string, string> = {
  queued: "Starting", transcribe: "Transcribing the recording", plan: "Gemini is planning the scenes", waiting: "Your turn: check the scenes",
  checkpics: "Your turn: check the pictures", motion: "Bringing pictures to life",
  images: "Making the pictures", render: "Rendering the scenes", join: "Joining the film", done: "Finished", failed: "Stopped with an error",
  stopped: "Stopped",
};
const PIC_TYPES = ["graph", "diagram", "chart", "formula", "timeline", "map", "cycle", "scene", "object", "person", "other"];
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

type Bullet = { text: string; key: string[]; green: string[]; line: number; picture?: string; picture_break?: boolean };
type Scene = {
  key: string; kind: "picture" | "slide"; section: string; title: string; bullets: Bullet[]; picture: string; image_text: string;
  search: string[]; t0: number; t1: number; first: number; last: number; said: string; image?: string | null; credit?: string;
  drawn?: boolean; video?: string | null; picture_break?: boolean; prompt?: string; precise?: boolean; own?: boolean; picture_type?: string;
  labels?: string[]; image2?: string | null; off_point?: string;
};

export default function AudioFilm() {
  const { id } = useParams<{ id: string }>();
  const { data: f, error, mutate } = useApi<any>(`/audio/films/${id}`, { refreshInterval: (d: any) => (d?.running ? 3000 : 0) });
  const [draft, setDraft] = useState<{ title: string; scenes: Scene[] } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { // a fresh copy of the scenes to edit, whenever the film comes back to the gate
    if (f?.state === "waiting" && f.scenes && !dirty) setDraft({ title: f.title, scenes: f.scenes });
  }, [f?.state, f?.scenes?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Offline message={error.message} />;
  if (!f) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-28" /><Skeleton className="h-96" /></div>;

  const gate = f.state === "waiting" && draft;
  const picgate = f.state === "checkpics";  // the picture check: redraw any picture from your own prompt, then approve
  const repaint = (n: number, fd: FormData) =>
    run(() => post(`/audio/films/${f.id}/scenes/${n}/picture`, fd), `Scene ${n}: learning from it and redrawing the picture`);
  const edit = (k: number, patch: Partial<Scene>) => {
    setDraft((d) => d && { ...d, scenes: d.scenes.map((s, i) => (i === k ? { ...s, ...patch } : s)) });
    setDirty(true);
  };
  const save = async () => {
    await api(`/audio/films/${f.id}/plan`, { method: "PUT", body: JSON.stringify(draft) });
    setDirty(false);
  };
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) toast({ tone: "good", title: done });
      await mutate();
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't do that", body: e.message });
    } finally {
      setBusy(false);
    }
  };
  const scenes: Scene[] = gate ? draft!.scenes : f.scenes ?? [];
  const rendered = scenes.filter((s) => s.video).length;

  return (
    <div className="space-y-8 pb-40">
      <Link href="/audio" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Audio films</Link>
      <div>
        <Label n={`AUDIO ${String(f.id).padStart(2, "0")}`} className="text-ink">
          {[f.subject, f.file, f.duration ? `${mmss(f.duration)} min` : null, scenes.length ? `${scenes.length} scenes` : null].filter(Boolean).join(" · ")}
        </Label>
        {gate ? (
          <input value={draft!.title} onChange={(e) => { setDraft({ ...draft!, title: e.target.value }); setDirty(true); }}
            className="mt-6 w-full bg-transparent font-display text-4xl font-medium leading-[1.04] tracking-tight outline-none sm:text-5xl" />
        ) : <h1 className="mt-6 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl">{f.title}</h1>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className={cx("label px-2 py-1", f.state === "waiting" || f.state === "checkpics" || f.state === "done" ? "bg-[#ffd60a] text-[#141414]" : f.state === "failed" ? "bg-accent text-white" : "text-muted")}>
            {f.state === "stopped" ? "Stopped" : STAGES[f.stage] ?? f.stage}{f.running ? "…" : ""}
          </span>
          {f.running ? <Button variant="secondary" size="sm" icon={<Square />} loading={busy} onClick={() => run(() => post(`/audio/films/${f.id}/stop`))}>Stop</Button>
            : (f.state === "failed" || f.state === "stopped") ? <Button size="sm" icon={<Play />} loading={busy} onClick={() => run(() => post(`/audio/films/${f.id}/continue`))}>Carry on</Button> : null}
          {!f.running && <Button variant="ghost" size="sm" icon={<Trash2 />} loading={busy}
            onClick={() => confirm(`Delete "${f.title}"? Its video, pictures and scenes are removed.`) && run(async () => { await api(`/audio/films/${f.id}`, { method: "DELETE" }); router.push("/audio"); })}>Delete</Button>}
        </div>
      </div>

      {(f.running || f.state === "failed") && (
        <div className="border border-line px-4 py-3">
          <div className="label text-muted">{f.running ? "Live" : "Last steps"}{f.counts?.total ? ` · ${f.counts.done ?? 0} / ${f.counts.total}` : ""}</div>
          <div className="mt-2 space-y-0.5 font-mono text-[12.5px]">
            {f.log.slice(-6).map((l: any, i: number, a: any[]) => (
              <div key={i} className={i === a.length - 1 ? "text-ink" : "text-muted"}><span className="mr-2 text-muted">{l.at}</span>{l.msg}</div>
            ))}
          </div>
        </div>
      )}

      {f.video && (
        <section>
          <div className="label border-b border-ink pb-2">The film</div>
          <video controls src={`${MEDIA}${f.video}`} className="mt-4 aspect-video w-full bg-black" />
        </section>
      )}

      {scenes.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
            <div>
              <div className="label text-muted">{gate ? "Check every scene: what it shows while your recording plays"
                : picgate ? "Check every picture: a wrong one? change its prompt and redraw it" : rendered ? `Rendered ${rendered} of ${scenes.length}` : "Scenes"}</div>
              <h2 className="mt-1 text-2xl font-medium">Scenes</h2>
            </div>
            {gate && <span className="label text-muted">Click any text to change it · switch a scene between picture and slide</span>}
          </div>
          <div className="divide-y divide-line">
            {scenes.map((s, k) => (
              <SceneRow key={s.key} s={s} n={k + 1} breaks={!!f.look?.interlude && f.look?.break_style !== "zoom"}
                zoom={!!f.look?.interlude && f.look?.break_style === "zoom"} edit={gate ? (p) => edit(k, p) : undefined}
                repaint={picgate ? (fd) => repaint(k + 1, fd) : undefined} busy={busy}
                setZoom={picgate ? (zoom, second) => run(() => post(`/audio/films/${f.id}/scenes/${k + 1}/zoom`, { zoom, second })) : undefined}
                upload={(picgate || (!gate && !f.running && f.state !== "queued")) && s.kind !== undefined ? (file) => {
                  const fd = new FormData();
                  fd.append("file", file);
                  return run(() => post(`/audio/films/${f.id}/scenes/${k + 1}/upload`, fd),
                    picgate ? `Scene ${k + 1}: your picture is in` : `Scene ${k + 1}: your picture is in, the film is being remade`);
                } : undefined}
                redo={!gate && !picgate && !f.running && f.state !== "queued" ? () => run(() => post(`/audio/films/${f.id}/scenes/${k + 1}/redo`), `Scene ${k + 1}: new picture on its way`) : undefined} />
            ))}
          </div>
        </section>
      )}

      {f.cost && <CostPanel cost={f.cost} />}

      {picgate && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink bg-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3 px-4 py-3">
            <span className="label mr-auto text-muted">{scenes.filter((s) => s.image).length} pictures · redraw any that are wrong, as often as you like</span>
            <Button icon={<Check />} loading={busy} onClick={() => run(() => post(`/audio/films/${f.id}/pictures/approve`), "Pictures approved: making the film")}>
              Approve pictures and make the film
            </Button>
          </div>
        </div>
      )}

      {gate && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink bg-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3 px-4 py-3">
            <span className="label mr-auto text-muted">{scenes.filter((s) => s.kind === "picture").length} pictures · {scenes.filter((s) => s.kind === "slide").length} slides{dirty ? " · unsaved edits" : ""}</span>
            {dirty && <Button variant="secondary" icon={<Save />} loading={busy} onClick={() => run(save, "Edits saved")}>Save edits</Button>}
            <Button icon={<Check />} loading={busy} onClick={() => run(async () => { if (dirty) await save(); await post(`/audio/films/${f.id}/approve`); }, "Approved: making the pictures")}>
              Approve and make the film
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SceneRow({ s, n, edit, redo, breaks, zoom, repaint, busy, setZoom, upload }: { s: Scene; n: number; edit?: (p: Partial<Scene>) => void; redo?: () => void;
  breaks?: boolean; zoom?: boolean; repaint?: (fd: FormData) => void; busy?: boolean; setZoom?: (zoom: boolean, second: boolean) => void;
  upload?: (file: File) => void }) {
  const [prompt, setPrompt] = useState(s.prompt ?? "");
  const [exact, setExact] = useState(!!s.precise);
  const [note, setNote] = useState("");
  const [ref, setRef] = useState<File | null>(null);
  const [kind, setKind] = useState(s.picture_type || "other");
  useEffect(() => { setPrompt(s.prompt ?? ""); setExact(!!s.precise); setNote(""); setRef(null); setKind(s.picture_type || "other"); },
    [s.prompt, s.precise, s.picture_type]);
  const send = () => {
    const fd = new FormData();
    fd.append("prompt", prompt === (s.prompt ?? "") ? "" : prompt);  // unchanged: the agent writes the corrected prompt
    fd.append("exact", String(exact));
    fd.append("note", note);
    fd.append("kind", kind);
    if (ref) fd.append("ref", ref);
    repaint!(fd);
  };
  const ro = !edit;
  const field = (v: string, on: (x: string) => void, ph: string, cls = "") => ro
    ? <div className={cls}>{v || <span className="text-muted">{ph}</span>}</div>
    : <input value={v} onChange={(e) => on(e.target.value)} placeholder={ph} className={cx(inputCls, cls)} />;
  return (
    <div className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[13px] text-muted">#{n} · {mmss(s.t0)}–{mmss(s.t1)}</span>
          {ro ? <span className="label text-muted">{s.kind === "picture" ? "Picture" : "Slide"}</span> : (
            <div className="flex gap-1.5">
              <Chip active={s.kind === "slide"} onClick={() => edit!({ kind: "slide", bullets: s.bullets.length ? s.bullets : [{ text: s.title, key: [], green: [], line: s.first }] })}>Slide</Chip>
              <Chip active={s.kind === "picture"} onClick={() => edit!({ kind: "picture", image_text: s.image_text || s.title, picture: s.picture || s.title })}>Picture</Chip>
            </div>
          )}
          {zoom && s.kind === "slide" && (ro ? (s.picture_break ? <span className="label text-muted">Picture zooms to full screen</span> : null) : (
            <label className="flex items-center gap-1.5 text-[13px]">
              <input type="checkbox" checked={!!s.picture_break} onChange={(e) => edit!({ picture_break: e.target.checked })} />
              Zoom its picture to full screen
            </label>
          ))}
          {redo && <Button variant="ghost" size="sm" icon={<RefreshCw />} onClick={redo}>{s.kind === "picture" || s.picture ? "Redo picture" : "Re-render"}</Button>}
        </div>
        {field(s.title, (x) => edit!({ title: x }), "Title", "text-[18px] font-medium")}
        {s.kind === "slide" ? (
          <div className="space-y-2">
            {s.bullets.map((b, j) => (
              <div key={j}>
              <div className="flex items-start gap-2">
                <span className="mt-3 size-2.5 flex-none rounded-full bg-[#ffd60a]" />
                {ro ? <div className="text-[15px] leading-relaxed">{b.text}</div> : (
                  <>
                    <textarea value={b.text} rows={2} onChange={(e) => edit!({ bullets: s.bullets.map((x, i) => (i === j ? { ...x, text: e.target.value } : x)) })}
                      className={cx(inputCls, "min-h-0 flex-1 resize-y text-[15px]")} />
                    <button onClick={() => edit!({ bullets: s.bullets.filter((_, i) => i !== j) })} className="mt-2 text-muted hover:text-accent" aria-label="Remove bullet"><Trash2 className="size-4" /></button>
                  </>
                )}
              </div>
              {breaks && (
                <div className="ml-5 mt-1 flex items-center gap-2 text-[12.5px] text-muted">
                  <ImageIcon className="size-3.5 flex-none" />
                  {ro ? <span>{b.picture_break !== false ? `Picture break: ${b.picture}` : "No picture break"}</span> : (
                    <>
                      <label className="flex flex-none items-center gap-1.5">
                        <input type="checkbox" checked={b.picture_break !== false}
                          onChange={(e) => edit!({ bullets: s.bullets.map((y, i) => (i === j ? { ...y, picture_break: e.target.checked } : y)) })} />
                        Picture break
                      </label>
                      {b.picture_break !== false && field(b.picture ?? "", (x) => edit!({ bullets: s.bullets.map((y, i) => (i === j ? { ...y, picture: x } : y)) }), "What the picture shows", "flex-1 text-[12.5px]")}
                    </>
                  )}
                </div>
              )}
              </div>
            ))}
            {!ro && s.bullets.length < 5 && (
              <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => edit!({ bullets: [...s.bullets, { text: "", key: [], green: [], line: s.bullets.at(-1)?.line ?? s.first }] })}>Add a bullet</Button>
            )}
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <ImageIcon className="size-4 flex-none" />
              {field(s.picture, (x) => edit!({ picture: x }), "No picture (or describe the real thing to show, e.g. 'a speedometer')", "flex-1 text-[13px]")}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="label text-muted">Words drawn in the picture</div>
            {field(s.image_text, (x) => edit!({ image_text: x }), "2-6 English words", "text-[15px] font-medium")}
            <div className="label text-muted">What the picture shows</div>
            {ro ? <div className="text-[14px] leading-relaxed">{s.picture}</div> :
              <textarea value={s.picture} rows={2} onChange={(e) => edit!({ picture: e.target.value })} className={cx(inputCls, "text-[14px]")} />}
          </div>
        )}
        <details className="text-[13px] text-muted">
          <summary className="cursor-pointer">What is said here</summary>
          <p className="mt-2 leading-relaxed">{s.said}</p>
        </details>
      </div>
      <div>
        {s.video ? <video controls preload="metadata" src={`${MEDIA}${s.video}`} className="aspect-video w-full bg-black" />
          : s.image ? <img src={`${MEDIA}${s.image}`} alt="" className="aspect-video w-full bg-black object-contain" />
          : <div className="grid aspect-video w-full place-items-center border border-dashed border-line text-[13px] text-muted">
              {s.kind === "picture" || s.picture ? "Picture comes after you approve" : "Bullet slide"}
            </div>}
        {s.credit && <div className="label mt-2 text-muted">{s.credit}</div>}
        {upload && (s.image || s.kind === "picture" || s.picture) && (
          <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 border border-dashed border-line px-2 py-1 text-[13px] hover:border-ink">
            <Upload className="size-3.5" /> Use my own picture
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) upload(x); }} />
          </label>
        )}
        {setZoom && s.kind === "slide" && s.image && (
          <div className="mt-3 space-y-2 border border-line px-3 py-2">
            <label className="flex items-center gap-1.5 text-[13px]">
              <input type="checkbox" checked={!!s.picture_break} onChange={(e) => setZoom(e.target.checked, !!s.image2)} />
              Zoom this picture to full screen
            </label>
            {s.picture_break && s.off_point && (
              <div className="bg-accent/10 px-2 py-1 text-[12.5px] text-accent">This picture doesn&apos;t show the slide&apos;s point ({s.off_point}). Redraw it below.</div>
            )}
            {s.picture_break && (s.labels?.length ?? 0) > 0 && (
              <div className="text-[12.5px] text-muted">Zoom labels: {s.labels!.map((l) => `“${l}”`).join(" · ")}</div>
            )}
            {s.picture_break && s.image2 && (
              <div className="flex items-start gap-3">
                <img src={`${MEDIA}${s.image2}`} alt="" className="h-20 w-28 border border-line object-cover" />
                <div className="space-y-1 text-[12.5px] text-muted">
                  <div>Second picture, shown beside it in the zoom</div>
                  <Button size="sm" variant="ghost" icon={<Trash2 />} loading={busy} onClick={() => setZoom(true, false)}>Remove second picture</Button>
                </div>
              </div>
            )}
          </div>
        )}
        {repaint && s.image && (
          <div className="mt-3 space-y-2">
            <div className="label text-muted">{s.own ? "Your prompt" : s.drawn ? "The prompt that drew it" : "A real photo (write a prompt to draw one instead)"}</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} className={cx(inputCls, "text-[12.5px] leading-relaxed")}
              placeholder="Describe exactly what to draw: every axis, label, number, line and colour, and 'nothing else'." />
            <div className="label text-muted">What is wrong? (the agent learns it for every {kind} picture)</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={cx(inputCls, "text-[12.5px]")}
              placeholder="e.g. A graph shows only the first quadrant, origin at the bottom-left, both axes labelled with units." />
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-muted">Type</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="border border-line bg-transparent px-2 py-1 text-[13px]">
                {PIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="flex cursor-pointer items-center gap-1.5 border border-dashed border-line px-2 py-1 hover:border-ink">
                <ImageIcon className="size-3.5" />{ref ? ref.name.slice(0, 24) : "Reference image (looks like this)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setRef(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-[13px]">
                <input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} />
                Exact diagram (clean notebook style)
              </label>
              <Button size="sm" variant="secondary" icon={<RefreshCw />} loading={busy}
                disabled={!prompt.trim() && !note.trim() && !ref} onClick={send}>Redraw</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
