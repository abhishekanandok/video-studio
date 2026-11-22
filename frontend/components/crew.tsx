"use client";

import { AlertTriangle, Check, Flag, Pencil, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { DiagramSvg } from "./diagram-svg";
import { Highlighted, type NBullet, SlidePreview } from "./exam";
import { MEDIA, VoicePicker } from "./studio";
import { Button, Sheet, cx, inputCls } from "./ui";

/* The crew (video/crew/): six agents, eight gates. Shared pieces for the /crew pages: the pipeline strip and one review
   panel per gate. At every gate the human approves, edits, or flags items with a note that goes back to the owner. */

export const STEPS: { key: string; label: string; owner: string; checks: string }[] = [
  { key: "plan", label: "The plan", owner: "Planner", checks: "every fact covered, in order" },
  { key: "slides", label: "On-screen text", owner: "Writer", checks: "nothing invented or dropped" },
  { key: "script", label: "The script", owner: "Writer", checks: "every bullet explained, simple words" },
  { key: "voices", label: "Voices", owner: "Producer", checks: "listens: exact words, Indian accent" },
  { key: "direct", label: "Scene plans", owner: "Director", checks: "bullets land on their words, diagrams match the slide" },
  { key: "pictures", label: "Pictures", owner: "Searcher", checks: "free licence, really shows it" },
  { key: "build", label: "Scene by scene", owner: "Producer", checks: "final frame readable on a phone" },
  { key: "final", label: "Final film", owner: "Producer", checks: "you watch the whole film" },
];

export const AGENTS: { name: string; owns: string }[] = [
  { name: "Planner", owns: "The plan: which slides, in what order, where a photo helps, where Skill 1 is weak. Routes your notes on finished scenes." },
  { name: "Writer", owns: "Every word: the on-screen slides, the cold open and what the hosts say." },
  { name: "Director", owns: "How each scene plays: which spoken line reveals each bullet, and whether it shows a photo." },
  { name: "Searcher", owns: "Real material: Wikimedia photos (free licences only) and web research for new skills." },
  { name: "Producer", owns: "Making media: voices, the photo you picked, each scene's render and the final film." },
  { name: "Verifier", owns: "Checks every agent's work and reports. Never fixes, never approves: you do." },
];

export type Crew = any;
type Notes = Record<string, string>;
export type GateProps = { f: Crew; notes: Notes; setNote: (k: string, v: string) => void; edits: any; setEdits: (e: any) => void; readOnly?: boolean };

const media = (f: Crew, path?: string | null, k?: string) => (path ? `${MEDIA}${f.media}${path}${k && f.stamp?.[k] ? `?v=${f.stamp[k]}` : ""}` : "");

/** Where the film is: each gate with its owner, done / waiting / working / to come. */
export function GateStrip({ f, selected, onSelect }: { f: Crew; selected: string; onSelect: (k: string) => void }) {
  const at = f.waiting ?? (f.running ? f.step : null);
  return (
    <div className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-4 lg:grid-cols-8">
      {STEPS.map((s, i) => {
        const ok = (f.approved ?? []).includes(s.key);
        const waiting = f.waiting === s.key;
        const working = f.running && f.step === s.key;
        const reached = ok || waiting || working || (s.key === "plan" && !!f.plan);
        return (
          <button key={s.key} onClick={() => reached && onSelect(s.key)} disabled={!reached}
            className={cx("border-b border-r border-line px-3 py-3 text-left transition-colors", waiting && "bg-[#ffd60a]/30",
                          selected === s.key && "outline outline-2 -outline-offset-2 outline-ink", reached ? "hover:bg-surface" : "opacity-50")}>
            <div className="label flex items-center justify-between text-muted">
              <span>Gate {i}</span>
              {ok && !waiting ? <Check className="size-3.5 text-ink" /> : working ? <span className="size-2 animate-pulse rounded-full bg-accent" /> : null}
            </div>
            <div className="mt-1 text-[14px] font-medium">{s.label}</div>
            <div className="mt-0.5 text-[12px] text-muted">{s.owner}</div>
            <div className={cx("mt-1 font-mono text-[11px]", waiting ? "text-ink" : "text-muted")}>
              {waiting ? "your turn" : working ? "working…" : ok ? "approved" : at === s.key ? "next" : "—"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** The Verifier's report for one item. */
export function Issues({ list }: { list?: string[] }) {
  if (!list?.length) return null;
  return (
    <div className="mt-2 border-l-2 border-accent bg-accent/5 px-3 py-2 text-[12.5px] leading-relaxed">
      <div className="label mb-1 flex items-center gap-1.5 text-accent"><AlertTriangle className="size-3.5" /> Verifier</div>
      {list.map((x, i) => <div key={i}>{x}</div>)}
    </div>
  );
}

/** A flag: the note goes back to the owner of this item. */
export function FlagBox({ id, notes, setNote, readOnly, placeholder }: { id: string; notes: Notes; setNote: (k: string, v: string) => void; readOnly?: boolean; placeholder?: string }) {
  const [open, setOpen] = useState(!!notes[id]);
  if (readOnly) return null;
  return open || notes[id] ? (
    <textarea autoFocus={open && !notes[id]} value={notes[id] ?? ""} onChange={(e) => setNote(id, e.target.value)} rows={2}
      onBlur={() => !notes[id] && setOpen(false)} placeholder={placeholder ?? "What should change? (goes back to the owner)"}
      className={cx(inputCls, "mt-2 border-accent text-[13px]")} />
  ) : (
    <button onClick={() => setOpen(true)} className="label mt-2 inline-flex items-center gap-1.5 text-muted hover:text-accent"><Flag className="size-3.5" /> Flag</button>
  );
}

function Item({ id, title, sub, children, f, step, notes, setNote, readOnly, fresh }: {
  id: string; title: ReactNode; sub?: ReactNode; children?: ReactNode; f: Crew; step: string; notes: Notes; setNote: (k: string, v: string) => void; readOnly?: boolean; fresh?: boolean;
}) {
  return (
    <div className={cx("border-b border-line py-5", notes[id] && "bg-accent/[0.03]")}>
      <div className="flex items-baseline gap-3">
        <span className="w-12 shrink-0 font-mono text-[12px] text-muted">{id === "hook" ? "open" : `#${Number(id.slice(1)) + 1}`}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[15px] font-medium">{title}{fresh && <span className="label bg-[#ffd60a] px-1.5 text-[#141414]">new</span>}</div>
          {sub && <div className="mt-0.5 text-[13px] text-muted">{sub}</div>}
          {children}
          <Issues list={f.checks?.[step]?.[id]} />
          <FlagBox id={id} notes={notes} setNote={setNote} readOnly={readOnly} />
        </div>
      </div>
    </div>
  );
}

// ---------- Gate 0: the plan ----------
export function PlanGate({ f, notes, setNote, edits, setEdits, readOnly }: GateProps) {
  const pl = f.plan;
  const roles = edits.roles ?? f.config.roles;
  return (
    <div className="space-y-8">
      <div>
        <div className="label text-muted">Title</div>
        {readOnly ? <div className="mt-1 text-[18px] font-medium">{pl.title}</div> :
          <input value={edits.title ?? pl.title} onChange={(e) => setEdits({ ...edits, title: e.target.value })} className={cx(inputCls, "mt-1 text-[16px]")} />}
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{pl.summary}</p>
        <p className="mt-2 text-[14px]"><span className="label mr-2 text-muted">Cold open idea</span>{pl.cold_open}</p>
        <p className="mt-2 text-[14px]"><span className="label mr-2 text-muted">Skill</span>Skill 1 · Text slides, with a real photo only where it teaches. No animation, no moving pictures.</p>
      </div>
      <Issues list={f.checks?.plan?.["*"]} />
      <div>
        <div className="label text-muted">{pl.scenes.length} slides, in the script&apos;s order</div>
        <div className="mt-2 border-t border-line">
          {pl.scenes.map((s: any) => (
            <Item key={s.key} id={s.key} f={f} step="plan" notes={notes} setNote={setNote} readOnly={readOnly}
              title={<><span className="label text-muted">{s.section}</span><span>{s.focus}</span></>}
              sub={<>
                {s.picture && s.fit !== "weak" ? <span className="mr-3">Photo idea: {s.picture}</span> : null}
                {s.fit === "weak" ? <span className="label bg-[#ffd60a]/40 px-1.5 text-ink">Diagram card here: {s.weak_why}</span> : null}
              </>}>
              <details className="mt-2"><summary className="cursor-pointer text-[12.5px] text-muted">Source it covers</summary>
                <p className="mt-1 whitespace-pre-wrap border-l border-line pl-3 font-mono text-[12px] leading-relaxed text-muted">{s.source}</p></details>
            </Item>
          ))}
        </div>
      </div>
      {!!f.skill_ideas?.length && (
        <div>
          <div className="label flex items-center gap-1.5 text-muted"><Sparkles className="size-3.5" /> New skill ideas · researched online by the Searcher · not built yet</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {f.skill_ideas.map((s: any) => (
              <div key={s.name} className="border border-line p-4">
                <div className="text-[15px] font-medium">{s.name}</div>
                <div className="label mt-1 text-muted">for {s.scenes.map((k: string) => `#${Number(k.slice(1)) + 1}`).join(", ")}</div>
                <p className="mt-2 text-[13px] leading-relaxed">{s.shows}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{s.how_good_teachers_do_it}</p>
                <div className="mt-2 flex flex-wrap gap-1">{s.pieces.map((x: string) => <span key={x} className="label border border-line px-1.5 text-muted">{x}</span>)}</div>
                {!!s.sources?.length && <div className="mt-2 space-y-0.5">{s.sources.slice(0, 3).map((x: any) => (
                  <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="block truncate text-[12px] text-accent hover:underline">{x.title}</a>))}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="label text-muted">Hosts and voices</div>
        {readOnly ? <p className="mt-2 text-[14px]">{roles.map((r: any) => `${r.name} · ${r.voice}`).join("   ")}</p> : (
          <div className="mt-2">
            <VoicePicker roles={roles.map((r: any) => r.name)} value={Object.fromEntries(roles.map((r: any) => [r.name, r.voice]))}
              onChange={(v) => setEdits({ ...edits, roles: roles.map((r: any) => ({ ...r, voice: v[r.name] ?? r.voice })) })} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Gate 1: the slides ----------
export function SlidesGate({ f, notes, setNote, edits, setEdits, readOnly }: GateProps) {
  const [open, setOpen] = useState<string | null>(null);
  const slide = (k: string) => edits.slides?.[k] ?? f.slides[k];
  const total = f.order.length + 1;
  return (
    <>
      <div className="grid gap-x-6 md:grid-cols-2">
        {f.order.map((k: string, i: number) => {
          const s = slide(k);
          return (
            <div key={k} className={cx("border-b border-line py-5", notes[k] && "bg-accent/[0.03]")}>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[12px] text-muted">#{i + 1}</span>
                {f.fresh?.slides?.includes(k) && f.approved?.includes("slides") && <span className="label bg-[#ffd60a] px-1.5 text-[#141414]">new</span>}
                {edits.slides?.[k] && <span className="label text-accent">edited by you</span>}
                {!readOnly && <button onClick={() => setOpen(k)} className="label ml-auto inline-flex items-center gap-1 text-muted hover:text-accent"><Pencil className="size-3.5" /> Edit text</button>}
              </div>
              <SlidePreview sc={{ index: i + 1, kind: "slide", video: null, voiced: false, section: s.section, title: s.title, bullets: s.bullets, lines: [] }} total={total} />
              <Issues list={f.checks?.slides?.[k]} />
              <FlagBox id={k} notes={notes} setNote={setNote} readOnly={readOnly} placeholder="What should the Writer change on this slide?" />
            </div>
          );
        })}
      </div>
      {open && <SlideEditor s={slide(open)} onClose={() => setOpen(null)} onSave={(s) => { setEdits({ ...edits, slides: { ...(edits.slides ?? {}), [open]: s } }); setOpen(null); }} />}
    </>
  );
}

function SlideEditor({ s, onClose, onSave }: { s: any; onClose: () => void; onSave: (s: any) => void }) {
  const [title, setTitle] = useState(s.title);
  const [bullets, setBullets] = useState<NBullet[]>(s.bullets.map((b: NBullet) => ({ ...b })));
  return (
    <Sheet open onClose={onClose} title="Edit the slide" subtitle="This exact text appears on screen. Highlights stay on the words they name.">
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        {bullets.map((b, i) => (
          <div key={i}>
            <textarea value={b.text} rows={3} onChange={(e) => setBullets(bullets.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className={inputCls} />
            <div className="mt-1 text-[12px] text-muted"><Highlighted b={b} /></div>
          </div>
        ))}
        <Button onClick={() => onSave({ ...s, title, bullets: bullets.filter((b) => b.text.trim()) })}>Keep this text</Button>
      </div>
    </Sheet>
  );
}

// ---------- Gate 2: the script ----------
export function ScriptGate({ f, notes, setNote, edits, setEdits, readOnly }: GateProps) {
  const keys = ["hook", ...f.order];
  const lines = (k: string) => edits.script?.[k]?.lines ?? f.script[k].lines;
  const setLine = (k: string, j: number, speech: string) =>
    setEdits({ ...edits, script: { ...(edits.script ?? {}), [k]: { lines: lines(k).map((l: any, i: number) => (i === j ? { ...l, speech } : l)) } } });
  return (
    <div className="border-t border-line">
      {keys.map((k) => (
        <Item key={k} id={k} f={f} step="script" notes={notes} setNote={setNote} readOnly={readOnly}
          fresh={f.fresh?.script?.includes(k) && f.approved?.includes("script")}
          title={k === "hook" ? <>Cold open · <span className="font-serif italic">{f.script.hook.headline}</span></> : f.slides[k].title}>
          <div className="mt-3 space-y-1.5">
            {lines(k).map((l: any, j: number) => (
              <div key={j} className="flex gap-3 text-[14px] leading-relaxed">
                <span className="label w-14 shrink-0 pt-1 text-muted">{l.speaker}</span>
                {readOnly ? <span>{l.speech}</span> :
                  <textarea value={l.speech} onChange={(e) => setLine(k, j, e.target.value)} rows={Math.max(1, Math.ceil(l.speech.length / 90))}
                    className="w-full resize-none border border-transparent bg-transparent px-1 hover:border-line focus:border-ink focus:outline-none" />}
              </div>
            ))}
          </div>
        </Item>
      ))}
    </div>
  );
}

// ---------- Gate 3: voices ----------
export function VoicesGate({ f, notes, setNote, edits, setEdits, readOnly }: GateProps) {
  const keys = ["hook", ...f.order];
  const roles = edits.roles ?? f.config.roles;
  const secs = keys.reduce((a, k) => a + (f.takes?.[k]?.seconds ?? 0), 0);
  return (
    <div className="space-y-6">
      <p className="text-[14px] text-muted">{Math.round(secs / 60 * 10) / 10} minutes recorded · plays at {f.speed}× · {roles.map((r: any) => `${r.name}: ${r.voice}`).join(" · ")}</p>
      <div className="border-t border-line">
        {keys.map((k) => (
          <Item key={k} id={k} f={f} step="voices" notes={notes} setNote={setNote} readOnly={readOnly}
            fresh={f.fresh?.voices?.includes(k) && f.approved?.includes("voices")}
            title={k === "hook" ? "Cold open" : f.slides[k].title} sub={`${Math.round(f.takes?.[k]?.seconds ?? 0)} s`}>
            <audio controls preload="none" src={media(f, `audio/${k}.wav`, k)} className="mt-2 h-9 w-full max-w-xl" />
          </Item>
        ))}
      </div>
      {!readOnly && (
        <details className="border border-line p-4">
          <summary className="cursor-pointer text-[14px] font-medium">Change a host&apos;s voice (the Producer re-records every scene)</summary>
          <div className="mt-4">
            <VoicePicker roles={roles.map((r: any) => r.name)} value={Object.fromEntries(roles.map((r: any) => [r.name, r.voice]))}
              onChange={(v) => setEdits({ ...edits, roles: f.config.roles.map((r: any) => ({ ...r, voice: v[r.name] ?? r.voice })) })} />
          </div>
        </details>
      )}
    </div>
  );
}

// ---------- Gate 4: scene plans ----------
export function DirectGate({ f, notes, setNote, edits, setEdits, readOnly }: GateProps) {
  const spec = (k: string) => ({ ...f.direction[k], ...(edits.direction?.[k] ?? {}) });
  const set = (k: string, v: any) => setEdits({ ...edits, direction: { ...(edits.direction ?? {}), [k]: { ...(edits.direction?.[k] ?? {}), ...v } } });
  return (
    <div className="border-t border-line">
      {f.order.map((k: string) => {
        const d = spec(k);
        const lines = f.script[k].lines;
        const at = f.takes?.[k]?.line_at ?? [];
        return (
          <Item key={k} id={k} f={f} step="direct" notes={notes} setNote={setNote} readOnly={readOnly}
            fresh={f.fresh?.direct?.includes(k) && f.approved?.includes("direct")} title={f.slides[k].title} sub={d.note}>
            <div className="mt-3 space-y-2">
              {f.slides[k].bullets.map((b: NBullet, i: number) => (
                <div key={i} className="grid gap-2 text-[13px] sm:grid-cols-[1fr_260px]">
                  <span className="leading-relaxed"><Highlighted b={b} /></span>
                  {readOnly ? <span className="text-muted">appears at line {d.bullet_at[i] + 1} ({at[d.bullet_at[i]] ?? 0}s)</span> : (
                    <select value={d.bullet_at[i]} onChange={(e) => set(k, { bullet_at: d.bullet_at.map((x: number, j: number) => (j === i ? Number(e.target.value) : x)) })}
                      className={cx(inputCls, "py-1.5 text-[12.5px]")}>
                      {lines.map((l: any, j: number) => <option key={j} value={j}>{`line ${j + 1} · ${at[j] ?? 0}s · ${l.speech.slice(0, 28)}…`}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
            {d.diagram?.objects?.length ? (
              <div className="mt-3">
                <div className="label text-muted">Diagram card · drawn by code, exactly as it will appear</div>
                <div className="mt-2 max-w-md border border-line p-2"><DiagramSvg d={d.diagram} font="Inter, sans-serif" width="100%" /></div>
                {!readOnly && <p className="mt-1 text-[12px] text-muted">To change it, Flag with what to fix (e.g. &quot;label the arrow 50 m&quot;), or write &quot;no diagram&quot; to use a photo instead.</p>}
              </div>
            ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
              <span className="label text-muted">Photo</span>
              {readOnly ? <span>{d.picture ? d.want : "none"}</span> : (
                <>
                  <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={!!d.picture} onChange={(e) => set(k, { picture: e.target.checked })} /> show a photo</label>
                  {d.picture && <input value={d.want} onChange={(e) => set(k, { want: e.target.value, searches: [e.target.value] })} className={cx(inputCls, "max-w-md py-1.5 text-[13px]")} placeholder="What the photo must show" />}
                </>
              )}
            </div>
            )}
          </Item>
        );
      })}
    </div>
  );
}

// ---------- Gate 5: pictures ----------
export function PicturesGate({ f, notes, setNote, edits, setEdits, readOnly }: GateProps) {
  const keys = f.order.filter((k: string) => f.pictures?.[k]);
  const pick = (k: string) => {
    const v = f.pictures[k];
    if (edits.picks?.[k] !== undefined) return edits.picks[k];
    if (v.pick !== null && v.pick !== undefined) return v.pick;
    return v.candidates.findIndex((c: any) => c.match);
  };
  const choose = (k: string, v: any) => setEdits({ ...edits, picks: { ...(edits.picks ?? {}), [k]: v } });
  if (!keys.length) return <p className="text-[14px] text-muted">No scene needs a photo.</p>;
  return (
    <div className="border-t border-line">
      {keys.map((k: string) => {
        const v = f.pictures[k];
        const cur = pick(k);
        return (
          <Item key={k} id={k} f={f} step="pictures" notes={notes} setNote={setNote} readOnly={readOnly}
            fresh={f.fresh?.pictures?.includes(k) && f.approved?.includes("pictures")} title={f.slides[k].title} sub={`Must show: ${v.want}`}>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {v.drawn && (
                <button disabled={readOnly} onClick={() => choose(k, "drawn")} className={cx("border p-1 text-left", cur === "drawn" ? "border-ink ring-2 ring-ink" : "border-line")}>
                  <img src={media(f, v.drawn.src)} alt="" className="aspect-[4/3] w-full bg-white object-contain" />
                  <div className="label mt-1 text-muted">Drawn</div>
                </button>
              )}
              {v.candidates.map((c: any, i: number) => (
                <button key={c.title} disabled={readOnly} onClick={() => choose(k, i)} title={c.shows}
                  className={cx("border p-1 text-left transition-opacity", cur === i ? "border-ink ring-2 ring-ink" : "border-line", c.match === false && cur !== i && "opacity-45")}>
                  <img src={media(f, c.preview)} alt={c.shows ?? ""} className="aspect-[4/3] w-full bg-white object-cover" />
                  <div className={cx("label mt-1", c.match ? "text-ink" : "text-muted")}>{c.match ? "✓ shows it" : "✗ doesn't"}</div>
                  <div className="line-clamp-2 text-[11px] leading-snug text-muted">{c.shows}</div>
                </button>
              ))}
              <button disabled={readOnly} onClick={() => choose(k, -1)}
                className={cx("grid aspect-[4/3] place-items-center border text-[12.5px] text-muted", cur === -1 ? "border-ink ring-2 ring-ink" : "border-dashed border-line")}>No photo</button>
            </div>
            {!readOnly && !v.drawn && (
              <button onClick={() => setNote(k, notes[k] === "__draw__" ? "" : "__draw__")}
                className={cx("label mt-2 mr-4", notes[k] === "__draw__" ? "text-accent" : "text-muted hover:text-accent")}>
                {notes[k] === "__draw__" ? "✓ The Producer will draw one (static, no text)" : "Draw one instead"}
              </button>
            )}
          </Item>
        );
      })}
    </div>
  );
}

// ---------- Gate 6: scene by scene ----------
export function BuildGate({ f, notes, setNote, readOnly }: GateProps) {
  const keys = ["hook", ...f.order];
  return (
    <div className="grid gap-x-6 md:grid-cols-2">
      {keys.map((k) => {
        const r = f.renders?.[k];
        return (
          <div key={k} className={cx("border-b border-line py-5", notes[k] && "bg-accent/[0.03]")}>
            <div className="mb-2 flex items-center gap-2 text-[14px] font-medium">
              <span className="font-mono text-[12px] text-muted">{k === "hook" ? "open" : `#${Number(k.slice(1)) + 1}`}</span>
              <span className="truncate">{k === "hook" ? "Cold open" : f.slides[k].title}</span>
              {f.fresh?.build?.includes(k) && f.approved?.includes("build") && <span className="label bg-[#ffd60a] px-1.5 text-[#141414]">new</span>}
            </div>
            {r ? <video controls preload="none" src={`${media(f, r.video)}?v=${f.stamp?.[k] ?? 0}`} className="aspect-video w-full bg-black" /> : <div className="aspect-video w-full bg-surface" />}
            <Issues list={f.checks?.build?.[k]} />
            <FlagBox id={k} notes={notes} setNote={setNote} readOnly={readOnly}
              placeholder="What's wrong? The Planner sends it to whoever owns it (words, voice, timing or photo)." />
          </div>
        );
      })}
    </div>
  );
}

// ---------- Gate 7: the final film ----------
export function FinalGate({ f, notes, setNote, readOnly }: GateProps) {
  return (
    <div className="space-y-6">
      {f.video ? <video controls src={f.video.startsWith("http") ? f.video : `${MEDIA}${f.video}`} className="aspect-video w-full bg-black" /> : null}
      {!readOnly && (
        <details className="border border-line p-4">
          <summary className="cursor-pointer text-[14px] font-medium">Something to fix in one scene? Flag it here</summary>
          <div className="mt-2">
            {["hook", ...f.order].map((k: string) => (
              <div key={k} className="flex items-start gap-3 border-b border-line py-2 text-[13.5px]">
                <span className="w-12 shrink-0 font-mono text-[12px] text-muted">{k === "hook" ? "open" : `#${Number(k.slice(1)) + 1}`}</span>
                <div className="min-w-0 flex-1">{k === "hook" ? "Cold open" : f.slides[k].title}
                  <FlagBox id={k} notes={notes} setNote={setNote} /></div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export const GATES: Record<string, (p: GateProps) => ReactNode> = {
  plan: PlanGate, slides: SlidesGate, script: ScriptGate, voices: VoicesGate, direct: DirectGate, pictures: PicturesGate, build: BuildGate, final: FinalGate,
};

/** Is there enough in the state to show this step? */
export const ready = (f: Crew, k: string) =>
  ({ plan: !!f.plan, slides: !!f.slides && !!f.order, script: !!f.script?.hook, voices: !!f.takes, direct: !!f.direction,
     pictures: !!f.direction, build: !!f.renders, final: !!f.video } as Record<string, boolean>)[k];
