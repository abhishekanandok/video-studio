"use client";

import { ArrowLeft, ChevronDown, PenLine, Play, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/providers";
import { SceneEditor } from "@/components/scene-editor";
import { ScenePlayer } from "@/components/scene-player";
import { CostPanel, MEDIA, Now, Pipeline, PlayButton, VoicePicker, type Voices } from "@/components/studio";
import { Button, Card, Label, Sheet, Skeleton, cx, inputCls } from "@/components/ui";
import { Offline } from "@/components/offline";
import { ResearchPanel } from "@/components/research-panel";
import { post, useApi } from "@/lib/api";

export default function FilmPage() {
  const { id } = useParams<{ id: string }>();
  const { data: f, error, mutate } = useApi<any>(`/studio/films/${id}`, {
    refreshInterval: (d: any) => (d?.running || Object.values(d?.tasks ?? {}).some((t: any) => t.state === "running") ? 3000 : 15000),
  });
  const [player, setPlayer] = useState<{ title: string; scenes: any[] } | null>(null);
  const [editing, setEditing] = useState<{ act: number; index: number; scene: any } | null>(null);
  const [changeVoices, setChangeVoices] = useState(false);
  const [rewrite, setRewrite] = useState<{ act: number; text: string; dialogueOnly?: boolean; allActs?: boolean } | null>(null);
  const [voices, setVoices] = useState<Voices>({});
  const [busy, setBusy] = useState(false);
  const [openAct, setOpenAct] = useState<number | null>(0);
  const toast = useToast();
  useEffect(() => {
    if (f?.roles) setVoices(Object.fromEntries(f.roles.filter((r: any) => r.voice).map((r: any) => [r.name, r.voice])));
  }, [JSON.stringify(f?.roles ?? [])]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Offline message={error.message} />;
  if (!f) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /><Skeleton className="h-96" /></div>;

  const act = async (path: string, body?: any) => {
    setBusy(true);
    try {
      await post(path, body);
      await mutate(); // the action returns a short summary; reload the full detail (acts, log, config)
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't do that", body: e.message });
    } finally {
      setBusy(false);
    }
  };
  const roles: string[] = (f.roles ?? []).map((r: any) => r.name);
  const chosen = { ...Object.fromEntries(roles.map((r) => [r, "Achird"])), ...voices };
  const researchWaiting = f.config?.style === "archival" && f.research && !f.research.approved && f.stage === "paused";
  const needsVoices = !f.running && !researchWaiting;  // the compact voice row is always there when nothing is running (after the research is approved)
  const acts: any[] = f.acts ?? [];
  const tasks: Record<string, any> = f.tasks ?? {};
  const archival = f.config?.style === "archival";
  const voicesChosen = (f.roles ?? []).every((r: any) => r.voice);
  const task = async (body: Record<string, any>) => {
    try {
      await post(`/studio/films/${f.id}/tasks`, body);
      setTimeout(() => mutate(), 800);
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't start that", body: e.message });
    }
  };
  const images = acts.flatMap((a: any) => (a.scenes ?? []).map((s: any) => s.image)).filter(Boolean);

  return (
    <div className="space-y-10">
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Studio</Link>
      <div>
        <Label n={`FILM ${String(f.id).padStart(2, "0")}`} className="text-ink">{f.kind === "lesson" ? "Lesson video" : f.narration} · {f.language} · {f.minutes} min</Label>
        <h1 className="mt-6 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl">{f.title ?? f.topic ?? "Planning…"}</h1>
        {f.story?.logline && <p className="mt-4 max-w-3xl font-serif text-xl italic text-muted">{f.story.logline}</p>}
        {f.config?.premise && <p className="mt-2 text-[13px] text-muted">From your idea: “{f.config.premise}”</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {f.running && <Button variant="secondary" size="sm" icon={<Square />} loading={busy} onClick={() => act(`/studio/films/${f.id}/stop`)}>Stop</Button>}
          {!f.running && voicesChosen && <Button size="sm" loading={busy} onClick={() => act(`/studio/films/${f.id}/continue`)}>Apply changes &amp; render</Button>}
          <span className="label text-muted">Voices: {(f.roles ?? []).map((r: any) => `${r.name} ${r.voice || "not chosen"}`).join(" · ")}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="label text-muted">Pipeline</span>
        <Link href={`/studio/${f.id}/live`} className="label text-ink hover:text-accent">Live tracker: log, every line, every picture ↗</Link>
      </div>
      <Pipeline stage={f.stage} stages={f.stages ?? {}} running={f.running} note={(f.log ?? []).at(-1)?.msg ?? ""} />
      <Now text={f.now} />
      <CostPanel cost={f.cost} />
      {archival && f.research && (
        <ResearchPanel filmId={f.id} r={f.research} waiting={!f.running && f.stage === "paused"} busy={busy}
          onApprove={() => act(`/studio/films/${f.id}/continue`)} />
      )}

      {f.video && (
        <Card className="overflow-hidden">
          <video src={`${MEDIA}${f.video}`} controls className="w-full bg-black" />
          <div className="flex items-center justify-between px-5 py-3">
            <span className="label text-muted">{f.running && f.stage !== "done" ? "Previous render (a new one is being made)" : "The finished film"}</span>
            <div className="flex items-center gap-5">
              {Object.entries(f.audio_tracks ?? {}).map(([lang, url]) => (
                <a key={lang} href={`${MEDIA}${url}`} download className="label text-ink hover:text-accent">{lang} audio track ↓</a>
              ))}
              <a href={`${MEDIA}${f.video}`} download className="label text-ink hover:text-accent">Download ↓</a>
            </div>
          </div>
        </Card>
      )}

      {needsVoices && (
        <Card className="px-5 py-4">
          {/* compact by default: current voices + Record; the full list only opens on demand */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="label text-accent">{f.stage === "paused" ? "Waiting for you" : "Voices"}</span>
            <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{roles.map((r) => `${r}: ${chosen[r]}`).join(" · ")}</span>
            <Button size="sm" variant="secondary" onClick={() => setChangeVoices(!changeVoices)}>{changeVoices ? "Close ▴" : "Choose voices ▾"}</Button>
            <Button size="sm" loading={busy} onClick={async () => { await act(`/studio/films/${f.id}/continue`, { voices: Object.fromEntries(roles.map((r) => [r, chosen[r]])) }); setChangeVoices(false); }}>
              Record with {roles.map((r) => chosen[r]).join(" + ")}
            </Button>
          </div>
          {changeVoices && (
            <div className="mt-4 max-h-[440px] overflow-y-auto border-t border-line pt-4 pr-2">
              <VoicePicker roles={roles} value={chosen} onChange={setVoices} />
            </div>
          )}
        </Card>
      )}

      {images.length > 0 && (
        <section>
          <Label n="IMAGES" className="text-ink">{images.length} painted so far</Label>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {images.slice(-24).map((src: string) => <img key={src} src={`${MEDIA}${src}`} alt="" className="aspect-video w-full border border-line object-cover" />)}
          </div>
        </section>
      )}

      <section>
        <Label n="ACTS" className="text-ink">The script, act by act · play any scene, change anything</Label>
        <div className="mt-4 border-t border-line">
          {acts.map((a: any, i: number) => (
            <div key={i} className="border-b border-line">
              <button onClick={() => setOpenAct(openAct === i ? null : i)} className="group grid w-full grid-cols-[3rem_1fr_auto_auto] items-center gap-x-4 py-5 text-left">
                <span className="label text-muted group-hover:text-accent">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block text-xl font-medium tracking-tight group-hover:text-accent">{a.title.replace(/^Act \d+:\s*/, "")}</span>
                  <span className="mt-1 block truncate text-[13px] text-muted">{a.hook}</span>
                </span>
                <span className="label text-muted">{tasks[`rewrite:${i}`]?.state === "running" || tasks["rewrite:-1"]?.state === "running" ? "rewriting…" : a.written ? `${a.scenes.length} scenes` : "writing…"}</span>
                <ChevronDown className={cx("size-4 text-muted transition-transform", openAct === i && "rotate-180")} />
              </button>
              {openAct === i && a.written && (
                <div className="space-y-8 pb-8 pl-[4rem]">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={<Play />} onClick={() => setPlayer({ title: a.title, scenes: a.scenes })}>Play act</Button>
                    <Button size="sm" variant="secondary" icon={<PenLine />} onClick={() => setRewrite({ act: i, text: "" })}>Rewrite act…</Button>
                  </div>
                  {a.scenes.map((sc: any, j: number) => {
                    const painting = tasks[`paint:${i}:${j}`]?.state === "running";
                    return (
                      <div key={j} className="grid gap-5 md:grid-cols-[240px_1fr]">
                        <div>
                          <div className="relative">
                            {sc.image ? <img src={`${MEDIA}${sc.image}`} alt="" className="aspect-video w-full border border-line object-cover" />
                              : archival ? <div className="flex aspect-video flex-col justify-center border border-line bg-[#121110] p-3 text-[#efe6d2]">
                                  <span className="label text-[#e8643a]">{sc.look}</span>
                                  <span className="mt-1 line-clamp-3 font-display text-[15px] leading-snug">{sc.note_texts[0]}</span>
                                </div>
                              : <div className="grid aspect-video place-items-center border border-dashed border-line text-center text-[12px] text-muted">image not painted yet</div>}
                            {painting && <div className="label absolute inset-0 grid place-items-center bg-black/55 text-white">repainting…</div>}
                          </div>
                          {!archival && <div className="label mt-2 text-muted">{sc.look ? `${sc.look} · ` : ""}{sc.transition} · {sc.sfx}{sc.topology ? ` · ${sc.topology}` : ""}</div>}
                          {sc.note_texts.length > 0 && <div className="mt-1 text-[12px] text-accent">{sc.note_texts.join(" · ")}</div>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" icon={<Play />} onClick={() => setPlayer({ title: `${a.title} · scene ${j + 1}`, scenes: [sc] })}>Play</Button>
                            {!archival && <Button size="sm" variant="secondary" icon={<PenLine />} onClick={() => setEditing({ act: i, index: j, scene: sc })}>Edit</Button>}
                            {!archival && <Button size="sm" variant="secondary" icon={<RefreshCw />} loading={painting} onClick={() => task({ kind: "paint", act: i, scene: j })}>Repaint</Button>}
                            {!archival && roles.length === 2 && voicesChosen && (
                              <Button size="sm" variant="secondary" loading={tasks[`voice:${i}:${j}:0`]?.state === "running"} onClick={() => task({ kind: "voice", act: i, scene: j, line: 0 })}>
                                {sc.audio ? "Re-record" : "Record"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {sc.lines.map((l: any, k: number) => {
                            const recording = tasks[`voice:${i}:${j}:${k}`]?.state === "running";
                            return (
                              <div key={k} className="group flex items-start gap-3">
                                <PlayButton url={l.audio} />
                                <div className="min-w-0 flex-1 pt-1 text-[15px] leading-relaxed">
                                  <span className={cx("label mr-2", roles.indexOf(l.speaker) % 2 ? "text-accent" : "text-ink")}>{l.speaker}</span>{l.speech}
                                </div>
                                {voicesChosen && !archival && (
                                  <button onClick={() => task({ kind: "voice", act: i, scene: j, line: k })} disabled={recording}
                                    className="label shrink-0 border border-line px-2 py-1 text-muted opacity-0 transition-opacity hover:border-ink hover:text-accent group-hover:opacity-100 disabled:opacity-100">
                                    {recording ? "recording…" : "re-record"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <ScenePlayer open={!!player} onClose={() => setPlayer(null)} title={player?.title ?? ""}
        scenes={(player?.scenes ?? []).map((sc: any) => ({ image: sc.image, move: sc.move, notes: sc.notes, lines: sc.lines, audio: sc.audio }))} />
      <SceneEditor open={!!editing} onClose={() => setEditing(null)} filmId={f.id} act={editing?.act ?? 0} index={editing?.index ?? 0}
        scene={editing?.scene} speakers={roles} onSaved={() => mutate()} />
      <Sheet open={!!rewrite} onClose={() => setRewrite(null)} title={`Rewrite act ${(rewrite?.act ?? 0) + 1}`} subtitle="The writer keeps what works and changes what you ask. Unchanged images and voices are kept.">
        <textarea value={rewrite?.text ?? ""} onChange={(e) => setRewrite(rewrite && { ...rewrite, text: e.target.value })} rows={5} className={inputCls}
          placeholder="e.g. slower; explain the terminator with a better everyday example; fewer dramatic pauses" />
        <label className="mt-4 flex items-center gap-3 text-[14px]"><input type="checkbox" checked={!!rewrite?.dialogueOnly} onChange={(e) => setRewrite(rewrite && { ...rewrite, dialogueOnly: e.target.checked })} className="size-4 accent-[var(--accent)]" /> Dialogue only (keep every image and visual exactly)</label>
        <label className="mt-2 flex items-center gap-3 text-[14px]"><input type="checkbox" checked={!!rewrite?.allActs} disabled={!rewrite?.dialogueOnly} onChange={(e) => setRewrite(rewrite && { ...rewrite, allActs: e.target.checked })} className="size-4 accent-[var(--accent)]" /> Apply to every act, in order</label>
        <div className="mt-4 flex justify-end"><Button disabled={!rewrite?.text.trim()} onClick={async () => {
          await task({ kind: rewrite!.dialogueOnly ? "dialogue" : "rewrite", act: rewrite!.dialogueOnly && rewrite!.allActs ? -1 : rewrite!.act, feedback: rewrite!.text });
          setRewrite(null);
        }}>Rewrite</Button></div>
      </Sheet>

      <section>
        <Label n="LOG" className="text-ink">What the agent is doing</Label>
        <div className="mt-4 max-h-72 overflow-y-auto border border-line bg-surface p-4 font-mono text-[12.5px] leading-relaxed">
          {!f.log?.length ? <span className="text-muted">Starting…</span> : f.log.slice().reverse().map((l: any, i: number) => (
            <div key={i}><span className="text-muted">{l.at}</span>  {l.msg}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
