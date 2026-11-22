"use client";

import { ArrowLeft, ChevronDown, PenLine, Play } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Offline } from "@/components/offline";
import { MEDIA, Now, Pipeline, PlayButton } from "@/components/studio";
import { type PlayableScene, ScenePlayer } from "@/components/scene-player";
import { Button, Card, Label, Skeleton, cx, inputCls } from "@/components/ui";
import { api, post, useApi } from "@/lib/api";

/* The live tracker: everything a film is doing, refreshed every few seconds. What step it is on and whether Google is
   refusing requests; the log exactly as the agent writes it; every line of the film with the layout chosen for it and
   its pictures as they arrive; the newest pictures on disk; the cost so far. */

const LAYOUT: Record<string, string> = {
  portrait: "Sticker portrait", circle: "Circle portrait", strips: "Torn strips", timeline: "Timeline", stack: "Photo stack",
  headline: "Clipping", build: "Build-up page", notes: "Sticky notes", scrap: "Quote scrap", connect: "Red string",
  photo: "Photo", newshead: "Headline", newschart: "Chart", archival: "Archive photo", quote: "Quote", number: "Number",
  chart: "Chart", headline_beat: "Headline", phrase: "Phrase", document: "Document", plate: "Collage", title: "Title",
};

export default function Live() {
  const { id } = useParams<{ id: string }>();
  const { data: d, error, mutate } = useApi<any>(`/studio/films/${id}/live`, { refreshInterval: 3000 });
  const [open, setOpen] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [player, setPlayer] = useState<{ title: string; scenes: PlayableScene[] } | null>(null);
  const scene = (l: any): PlayableScene => ({ image: l.pictures[0] ?? null, lines: [{ speaker: "Narrator", text: l.edit?.speech ?? l.speech, speech: l.edit?.speech ?? l.speech, audio: l.audio }] });
  if (error) return <Offline message={error.message} />;
  if (!d) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;
  const h = d.health;
  const alive = d.running && h.log_age !== null && h.log_age < 600;
  const lines = d.chapters.flatMap((c: any) => c.lines);
  const planned = lines.filter((l: any) => l.layout).length;
  return (
    <div className="space-y-10">
      <Link href={`/studio/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Back to the film</Link>
      <div>
        <Label n={`LIVE · FILM ${String(d.id).padStart(2, "0")}`} className="text-ink">Everything the agent is doing, every 3 seconds</Label>
        <h1 className="mt-4 line-clamp-2 font-display text-3xl font-medium tracking-tight">{d.title}</h1>
      </div>

      {/* 1. now */}
      <div className="grid gap-px border border-line bg-line sm:grid-cols-5">
        <Tile label="Status" value={d.stage === "done" ? "Finished" : alive ? "Working" : d.running ? "Quiet" : d.stage === "failed" ? "Failed" : "Stopped"}
          note={d.running ? `last log line ${h.log_age}s ago` : "no process running"} tone={d.stage === "failed" ? "bad" : alive ? "good" : "muted"} />
        <Tile label="Internet drops" value={h.network ?? 0} note="in the last 120 log lines; retried every 10 s" tone={h.network ? "bad" : "muted"} />
        <Tile label="Google quota refusals (429)" value={h.quota} note="in the last 120 log lines; the agent waits and retries" tone={h.quota > 20 ? "bad" : "muted"} />
        <Tile label="Google server errors (500)" value={h.server} note={h.crash ? `${h.crash} crash traces` : "retried automatically"} tone={h.server > 10 || h.crash ? "bad" : "muted"} />
        <Tile label="Cost so far" value={`$${d.cost.usd}`} note={Object.entries(d.cost.stages).map(([k, v]) => `${k} $${v}`).join(" · ")} />
      </div>
      <Pipeline stage={d.stage} stages={d.stages} running={d.running} note={d.timeline.at(-1)?.msg ?? ""} />
      <Now text={d.now} />

      {/* 2. pictures so far */}
      <section>
        <Label n="PICTURES" className="text-ink">{Object.entries(d.counts).map(([k, v]) => `${v} ${k}${v === 1 ? "" : "s"}`).join(" · ")} · newest first</Label>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-10">
          {d.newest.map((p: any) => (
            <figure key={p.name} className="border border-line bg-surface">
              <img src={`${MEDIA}${p.url}`} alt={p.name} className="aspect-video w-full object-cover" loading="lazy" />
              <figcaption className="truncate px-1.5 py-1 text-[11px] text-muted">{p.at} · {p.kind}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 3. the log, as written */}
      <section>
        <Label n="TERMINAL" className="text-ink">The agent's log, exactly as it writes it · errors in red</Label>
        <Terminal lines={d.log} />
      </section>

      {/* 4. every line */}
      <section>
        {(() => {
          const changed = lines.filter((l: any) => l.edit);
          const pending = changed.filter((l: any) => !l.edit.result).length;
          return changed.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-accent/40 bg-surface px-4 py-3 text-sm">
              <span>{changed.length} line{changed.length === 1 ? "" : "s"} changed by you{pending ? ` · ${pending} waiting for the next run` : " · all applied"}.
                {d.running ? " A run is going: changes made before it reaches the visuals step are used in it, later ones in the next run." : " Applying re-records and re-plans only these lines, then renders the film again."}</span>
              {!d.running && pending > 0 && <Button size="sm" loading={applying} onClick={async () => { setApplying(true); try { await post(`/studio/films/${id}/continue`); await mutate(); } finally { setApplying(false); } }}>Apply changes &amp; render</Button>}
            </div>
          );
        })()}
        <Label n="EVERY LINE" className="text-ink">{lines.length} lines · {lines.filter((l: any) => l.voiced).length} voiced · {planned} with visuals planned · {lines.filter((l: any) => l.final).length} final · play any scene, change anything</Label>
        <div className="mt-4 border-t border-line">
          {d.chapters.map((c: any, n: number) => (
            <div key={n} className="border-b border-line">
              <button onClick={() => setOpen(open === n ? null : n)} className="group grid w-full grid-cols-[3rem_1fr_auto_auto] items-center gap-x-4 py-5 text-left">
                <span className={cx("label group-hover:text-accent", c.opener ? "text-accent" : "text-muted")}>{String(d.chapters[0]?.opener ? n : n + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block text-xl font-medium tracking-tight group-hover:text-accent">{c.title}</span>
                  <span className="mt-1 block truncate text-[13px] text-muted">{c.opener ? "Cold open · plays before chapter 1 · " : ""}{c.lines.filter((l: any) => l.pictures.length).length}/{c.lines.length} with pictures · {c.lines.filter((l: any) => l.final).length} final</span>
                </span>
                <span className="label text-muted">{c.lines.length} scenes</span>
                <ChevronDown className={cx("size-4 text-muted transition-transform", open === n && "rotate-180")} />
              </button>
              {open === n && (
                <div className="space-y-8 pb-8 pl-[4rem]">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={<Play />} onClick={() => setPlayer({ title: c.title, scenes: c.lines.filter((l: any) => !l.cut).map(scene) })}>Play chapter</Button>
                  </div>
                  {c.lines.map((l: any, j: number) => (
                    <div key={l.i} className={cx("grid gap-5 md:grid-cols-[240px_1fr]", l.cut && "opacity-50")}>
                      <div>
                        {l.pictures[0] ? <img src={`${MEDIA}${l.pictures[0]}`} alt="" className="aspect-video w-full border border-line object-cover" loading="lazy" />
                          : <div className="flex aspect-video flex-col justify-center border border-line bg-[#121110] p-3 text-[#efe6d2]">
                              <span className="label text-[#e8643a]">{LAYOUT[l.layout] ?? l.layout ?? "not planned yet"}</span>
                              <span className="mt-1 line-clamp-3 font-display text-[15px] leading-snug">{l.speech}</span>
                            </div>}
                        <div className="label mt-2 text-muted">{LAYOUT[l.layout] ?? l.layout ?? "not planned yet"}{l.era ? ` · ${l.era}` : ""}{l.pictures.length > 1 ? ` · ${l.pictures.length} pictures` : ""}{l.cut ? " · skipped" : ""}</div>
                        {l.edit?.result && <div className="mt-1 text-[12px] text-accent">Last run: {l.edit.result}</div>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" icon={<Play />} onClick={() => setPlayer({ title: `${c.title} · scene ${j + 1}`, scenes: [scene(l)] })}>Play</Button>
                          {l.key && <Button size="sm" variant="secondary" icon={<PenLine />} onClick={() => setEditing(editing === l.key ? null : l.key)}>
                            {l.edit ? (l.edit.result ? "Changed ✓" : "Changed · pending") : "Change"}
                          </Button>}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <PlayButton url={l.audio} />
                          <div className="min-w-0 flex-1 pt-1 text-[15px] leading-relaxed">
                            <span className="label mr-2 text-ink">Narrator</span>{l.edit?.speech ?? l.speech}
                          </div>
                        </div>
                        {l.pictures.length > 1 && (
                          <div className="flex gap-1 pl-11">
                            {l.pictures.slice(1, 5).map((u: string) => <img key={u} src={`${MEDIA}${u}`} alt="" className="h-14 w-20 border border-line object-cover" loading="lazy" />)}
                          </div>
                        )}
                        {editing === l.key && <LineEditor film={id} line={l} onDone={() => { setEditing(null); mutate(); }} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <ScenePlayer open={!!player} onClose={() => setPlayer(null)} title={player?.title ?? ""} scenes={player?.scenes ?? []} />

      {/* 5. milestones */}
      <section>
        <Label n="MILESTONES" className="text-ink">What the agent announced, newest first</Label>
        <Card className="mt-4 max-h-[320px] overflow-y-auto p-4 font-mono text-[13px] leading-relaxed">
          {[...d.timeline].reverse().map((e: any, i: number) => <div key={i}><span className="text-muted">{e.at}</span> {e.msg}</div>)}
        </Card>
      </section>
    </div>
  );
}

function Tile({ label, value, note, tone = "muted" }: { label: string; value: React.ReactNode; note?: string; tone?: "good" | "bad" | "muted" }) {
  return (
    <div className="bg-bg p-4">
      <span className="label text-muted">{label}</span>
      <div className={cx("mt-3 font-display text-2xl font-medium tracking-tight", tone === "good" ? "text-ink" : tone === "bad" ? "text-accent" : "text-ink")}>{value}</div>
      {note && <div className="mt-2 text-[12px] text-muted">{note}</div>}
    </div>
  );
}

/** The raw log in a dark terminal that follows the newest line (unless you scroll up to read). */
function Terminal({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => { if (follow && ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines, follow]);
  return (
    <div ref={ref} onScroll={(e) => { const t = e.currentTarget; setFollow(t.scrollHeight - t.scrollTop - t.clientHeight < 40); }}
      className="mt-4 h-[420px] overflow-y-auto border border-line bg-[#121110] p-4 font-mono text-[12.5px] leading-relaxed text-[#e8e2d4]">
      {lines.map((x, i) => (
        <div key={i} className={cx("whitespace-pre-wrap break-all", /429|RESOURCE_EXHAUSTED/.test(x) ? "text-[#f0a35e]" : /500 INTERNAL|Traceback|Error|failed/i.test(x) ? "text-[#ff6b5e]" : "")}>{x}</div>
      ))}
    </div>
  );
}

const CHOICES: [string, string][] = [
  ["auto", "Agent decides"], ["build", "Build-up page"], ["photo", "Full picture"], ["scene", "Raw full-screen scene"],
  ["portrait", "Sticker portrait"], ["circle", "Circle portrait"], ["strips", "Torn strips"], ["timeline", "Timeline"],
  ["stack", "Photo stack"], ["quote", "Quote with the speaker"],
];

/** Full control over one line: its words (re-recorded), its layout, its picture (a real photo, or a painted cut-out),
    a direction for the agent, or skip it. Saved now; used by the next run, which changes only these lines. */
function LineEditor({ film, line, onDone }: { film: string; line: any; onDone: () => void }) {
  const e = line.edit ?? {};
  const [speech, setSpeech] = useState<string>(e.speech ?? line.speech);
  const [layout, setLayout] = useState<string>(e.layout ?? "auto");
  const [picture, setPicture] = useState<string>(e.picture ?? "");
  const [kind, setKind] = useState<string>(e.picture_kind ?? "real");
  const [note, setNote] = useState<string>(e.note ?? "");
  const [rerecord, setRerecord] = useState<boolean>(false);
  const [cut, setCut] = useState<boolean>(e.cut ?? line.cut);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async (clear = false) => {
    setBusy(true); setErr("");
    try {
      const body = clear ? {} : {
        speech: speech.trim() !== line.speech ? speech.trim() : null, rerecord: rerecord || null,
        layout: layout !== "auto" ? layout : null, picture: picture.trim() || null, picture_kind: picture.trim() ? kind : null,
        note: note.trim() || null, cut: cut !== line.cut ? cut : null,
      };
      await api(`/studio/films/${film}/lines/${line.key}`, { method: "PUT", body: JSON.stringify(body) });
      onDone();
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4 border border-line bg-surface p-4 md:grid-cols-2">
      <label className="md:col-span-2">
        <span className="label text-muted">Words (a change is recorded again in the same voice)</span>
        <textarea value={speech} onChange={(x) => setSpeech(x.target.value)} rows={3} className={cx(inputCls, "mt-1.5")} />
      </label>
      <label>
        <span className="label text-muted">Layout</span>
        <select value={layout} onChange={(x) => setLayout(x.target.value)} className={cx(inputCls, "mt-1.5")}>
          {CHOICES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>
      <div>
        <span className="label text-muted">Picture</span>
        <div className="mt-1.5 flex flex-col gap-2 xl:flex-row">
          <select value={kind} onChange={(x) => setKind(x.target.value)} className={cx(inputCls, "xl:w-44 xl:shrink-0")}>
            <option value="real">Real photo of</option>
            <option value="paint">Paint a cut-out of</option>
          </select>
          <input value={picture} onChange={(x) => setPicture(x.target.value)} placeholder={kind === "real" ? "e.g. TSMC fab Hsinchu, Jensen Huang" : "e.g. a silicon wafer on a steel table"} className={cx(inputCls, "min-w-0")} />
        </div>
        <span className="mt-1 block text-[11px] text-muted">{kind === "real" ? "Found on Wikimedia Commons and checked; never used twice in the film." : "An object or anonymous scene: never a real person, no words or numbers."}</span>
      </div>
      <label className="md:col-span-2">
        <span className="label text-muted">Direction for the agent (optional)</span>
        <input value={note} onChange={(x) => setNote(x.target.value)} placeholder="e.g. show the price drop as a falling chart, put Nvidia's photo first" className={cx(inputCls, "mt-1.5")} />
      </label>
      <div className="flex flex-wrap items-center gap-5 md:col-span-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rerecord} onChange={(x) => setRerecord(x.target.checked)} /> Record the voice again</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cut} onChange={(x) => setCut(x.target.checked)} /> Skip this line in the film</label>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <Button size="sm" loading={busy} onClick={() => save()}>Save change</Button>
        {line.edit && <Button size="sm" variant="secondary" loading={busy} onClick={() => save(true)}>Undo my change</Button>}
        {err && <span className="text-[12px] text-accent">{err}</span>}
      </div>
    </div>
  );
}
