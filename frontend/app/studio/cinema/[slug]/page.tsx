"use client";

import { ArrowLeft, Clapperboard, Film, ImageIcon, Mic, RefreshCw, Save, Video } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { MEDIA, PlayButton } from "@/components/studio";
import { Button, Card, Label, Skeleton, cx, inputCls } from "@/components/ui";
import { api, post, useApi } from "@/lib/api";

/* One cinematic film, step by step. The plan (story, characters, props, look, shots, narration) is a draft you edit and
   save; each step's button runs it in the background and the page follows along. */

const BUSY: Record<string, string> = {
  story: "Writing the screenplay", sheets: "Painting character and prop sheets", frames: "Painting keyframes",
  shots: "Veo is making the shots", voice: "Recording the narration", film: "Joining the film",
};

export default function CinemaFilm() {
  const { slug } = useParams<{ slug: string }>();
  const { data: p, error, mutate } = useApi<any>(`/cinema/${slug}`, { refreshInterval: 3000 });
  const [draft, setDraft] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const toast = useToast();
  useEffect(() => { if (p && !dirty) setDraft(p); }, [p, dirty]);
  if (error) return <Offline message={error.message} />;
  if (!p || !draft) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;

  const edit = (fn: (d: any) => void) => { const d = structuredClone(draft); fn(d); setDraft(d); setDirty(true); };
  const save = async () => {
    setBusy("save");
    try { await api(`/cinema/${slug}`, { method: "PUT", body: JSON.stringify(draft) }); setDirty(false); await mutate(); }
    catch (e: any) { toast({ tone: "bad", title: "Couldn't save", body: e.message }); }
    finally { setBusy(""); }
  };
  const run = async (step: string, arg = "", confirmText = "") => {
    if (confirmText && !window.confirm(confirmText)) return;
    if (dirty) await save();
    setBusy(step + arg);
    try { await post(`/cinema/${slug}/run`, { step, arg }); await mutate(); }
    catch (e: any) { toast({ tone: "bad", title: "Couldn't start", body: e.message }); }
    finally { setBusy(""); }
  };
  const retake = async (n: number, note: string, secs: number) => {
    if (!window.confirm(`Make shot ${n} again with Veo? About $${(secs * p.estimate.veo_rate).toFixed(2)}.`)) return;
    if (dirty) await save();
    try { await post(`/cinema/${slug}/shots/${n}/retake`, { note }); await mutate(); }
    catch (e: any) { toast({ tone: "bad", title: "Couldn't start", body: e.message }); }
  };
  const useTake = async (n: number, take: number) => { await post(`/cinema/${slug}/shots/${n}/use`, { take }); await mutate(); };

  const e = p.estimate;
  const running = !!p.busy;
  const st = draft.story;
  const chars = draft.characters ?? [], props = draft.props ?? [];
  const frames = draft.shots.filter((s: any) => s.frame).length, clips = draft.shots.filter((s: any) => s.clip).length;
  const sheets = [...chars, ...props].filter((x: any) => x.sheet).length;
  const voiced = draft.shots.filter((s: any) => s.vo).length, lines = draft.shots.filter((s: any) => s.narration?.trim()).length;
  const missingClips = draft.shots.filter((s: any) => !s.clip).reduce((a: number, s: any) => a + s.seconds, 0);

  return (
    <div className="space-y-10 pb-24">
      <Link href="/studio/cinema" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Cinema Studio</Link>
      <div>
        <Label n="CINEMA" className="text-ink">{p.seconds} s · voice {p.voice} · {p.veo_sound ? "Veo sound on" : "no Veo sound"} · spent ${p.spent}</Label>
        <h1 className="mt-4 font-display text-4xl font-medium tracking-tight">{st?.title ?? "Untitled"}</h1>
        <p className="mt-2 max-w-3xl text-[15px] text-muted">{p.idea}</p>
      </div>

      {/* progress */}
      <ol className="grid gap-px border border-line bg-line sm:grid-cols-6">
        {[["Story", !!st, st ? `${draft.shots.length} shots` : "—"], ["Sheets", sheets > 0 && sheets === chars.length + props.length, `${sheets}/${chars.length + props.length}`],
          ["Look", !!draft.look, draft.look ? "set" : "—"], ["Keyframes", frames > 0 && frames === draft.shots.length, `${frames}/${draft.shots.length}`],
          ["Veo shots", clips > 0 && clips === draft.shots.length, `${clips}/${draft.shots.length}`], ["Film", !!p.film_url, p.film_url ? "ready" : `${voiced}/${lines} lines`]]
          .map(([t, ok, v], i) => (
            <li key={t as string} className="bg-bg p-4">
              <span className={cx("label", ok ? "text-ink" : "text-muted")}>{String(i + 1).padStart(2, "0")} {t as string}{ok ? " ✓" : ""}</span>
              <div className="mt-2 font-display text-2xl font-medium">{v as string}</div>
            </li>
          ))}
      </ol>
      {running && (
        <div className="flex items-center gap-3 border border-accent/40 bg-surface px-4 py-3 text-sm">
          <span className="size-2 animate-pulse rounded-full bg-accent" /><span className="label text-muted">Right now ·</span>
          {BUSY[p.busy] ?? p.busy} — {p.log.at(-1)?.msg}
        </div>
      )}
      {!running && p.log.at(-1)?.msg?.includes("stopped") && <div className="border border-accent bg-surface px-4 py-3 text-sm text-accent">{p.log.at(-1).msg}</div>}

      {/* 1. story */}
      <Section n="01" title="Story" hint="The whole film in at most 20 words: who, what, where, when."
        action={<Button size="sm" variant="secondary" icon={<RefreshCw />} disabled={running} loading={busy === "story"}
          onClick={() => run("story", "", st ? "Write the screenplay again from the idea? Your edits to the plan are replaced." : "")}>{st ? "Rewrite screenplay" : "Write screenplay"}</Button>}>
        {!st ? <p className="text-sm text-muted">{running ? "Gemini is writing the screenplay…" : "No screenplay yet."}</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" value={st.title} onChange={(v) => edit((d) => { d.story.title = v; })} />
            <Field label={`Logline (${st.logline.split(/\s+/).filter(Boolean).length} words)`} value={st.logline} onChange={(v) => edit((d) => { d.story.logline = v; })} />
            <Field label="Where" value={st.where} onChange={(v) => edit((d) => { d.story.where = v; })} />
            <Field label="When (time, weather, era)" value={st.when} onChange={(v) => edit((d) => { d.story.when = v; })} />
          </div>
        )}
      </Section>

      {/* 2. sheets */}
      {st && (
        <Section n="02" title="Characters & props" hint="A sheet for each (portrait, full body front and back) keeps every shot showing the same person and object."
          action={<Button size="sm" icon={<ImageIcon />} disabled={running} loading={busy === "sheets"}
            onClick={() => run("sheets", "", `Paint the sheets? About $${e.sheets_usd} (Gemini images).`)}>Paint sheets</Button>}>
          <div className="grid gap-6 lg:grid-cols-2">
            {chars.map((c: any, i: number) => (
              <Card key={c.id} className="space-y-3 p-4">
                {c.sheet_url ? <img src={`${MEDIA}${c.sheet_url}`} alt="" className="w-full border border-line" /> : <Placeholder text="sheet not painted yet" />}
                <Field label="Name" value={c.name} onChange={(v) => edit((d) => { d.characters[i].name = v; })} />
                <Field label="Look (face, age, hair, build)" value={c.look} area onChange={(v) => edit((d) => { d.characters[i].look = v; })} />
                <Field label="Wardrobe" value={c.wardrobe} onChange={(v) => edit((d) => { d.characters[i].wardrobe = v; })} />
                <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <label className="block"><span className="label text-muted">Their voice (Gemini)</span>
                    <select value={c.tts ?? "Charon"} onChange={(x) => edit((d) => { d.characters[i].tts = x.target.value; })} className={cx(inputCls, "mt-1.5")}>
                      {p.voices.map((v: string) => <option key={v}>{v}</option>)}
                    </select>
                  </label>
                  <Field label="How they sound (for Veo's acting)" value={c.voice ?? ""} onChange={(v) => edit((d) => { d.characters[i].voice = v; })} />
                </div>
                <Button size="sm" variant="secondary" disabled={running} onClick={() => run("sheets", c.id, `Repaint ${c.name}'s sheet? About $0.12.`)}>Repaint {c.name}</Button>
              </Card>
            ))}
            {props.map((x: any, i: number) => (
              <Card key={x.id} className="space-y-3 p-4">
                {x.sheet_url ? <img src={`${MEDIA}${x.sheet_url}`} alt="" className="w-full border border-line" /> : <Placeholder text="prop sheet not painted yet" />}
                <Field label="Prop" value={x.name} onChange={(v) => edit((d) => { d.props[i].name = v; })} />
                <Field label="Look (design, material, colour, wear)" value={x.look} area onChange={(v) => edit((d) => { d.props[i].look = v; })} />
                <Button size="sm" variant="secondary" disabled={running} onClick={() => run("sheets", x.id, `Repaint the ${x.name}? About $0.04.`)}>Repaint {x.name}</Button>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* 3. look */}
      {draft.look && (
        <Section n="03" title="The look" hint="Decisions applied to every shot. Most film shots are shallow or medium depth of field so the eye goes to the subject.">
          <div className="grid gap-4 md:grid-cols-2">
            {([["camera", "Camera & lens"], ["depth_of_field", "Depth of field"], ["lighting", "Lighting (sources, quality, colour, background)"], ["grade", "Colour & contrast"], ["handheld", "Camera feel"]] as const).map(([k, t]) => (
              <Field key={k} label={t} value={draft.look[k]} area onChange={(v) => edit((d) => { d.look[k] = v; })} />
            ))}
          </div>
        </Section>
      )}

      {/* 4-5. shots */}
      {st && (
        <Section n="04" title="Shots" hint="Paint the keyframes and check each one. Only then make the videos: a bad shot is retaken on its own, with your note."
          action={<div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<ImageIcon />} disabled={running} onClick={() => run("frames", "", `Paint the missing keyframes? About $${e.frames_usd}.`)}>Paint keyframes</Button>
            <Button size="sm" icon={<Video />} disabled={running || frames < draft.shots.length || missingClips === 0}
              onClick={() => run("shots", "", `Make ${draft.shots.filter((s: any) => !s.clip).length} shots with Veo (${missingClips} s)? About $${(missingClips * e.veo_rate).toFixed(2)}.`)}>
              Make videos · ${(missingClips * e.veo_rate).toFixed(2)}
            </Button>
          </div>}>
          <div className="space-y-8">
            {draft.shots.map((s: any, i: number) => (
              <ShotCard key={i} s={s} chars={chars} props={props} running={running} rate={e.veo_rate}
                onEdit={(fn) => edit((d) => fn(d.shots[i]))} onFrame={() => run("frames", String(s.n), `Repaint the keyframe of shot ${s.n}? About $0.04. Its video will need making again.`)}
                onRetake={(note) => retake(s.n, note, s.seconds)} onUse={(t) => useTake(s.n, t)}
                onRemove={() => edit((d) => { d.shots.splice(i, 1); })} />
            ))}
            <Button size="sm" variant="secondary" onClick={() => edit((d) => { d.shots.push({ seconds: 6, type: "medium", action: "", performance: "", camera: "static", sound: "", characters: [], props: [], narration: "", n: d.shots.length + 1 }); })}>+ Add a shot</Button>
          </div>
        </Section>
      )}

      {/* 6. voice and film */}
      {st && (
        <Section n="05" title="Voice & film" hint="Each narration line is recorded and starts with its shot; a shot is never shorter than its line."
          action={<div className="flex flex-wrap gap-2">
            <select value={draft.voice} onChange={(x) => edit((d) => { d.voice = x.target.value; })} className={cx(inputCls, "h-8 w-32 py-0")}>
              {p.voices.map((v: string) => <option key={v}>{v}</option>)}
            </select>
            <Button size="sm" variant="secondary" icon={<Mic />} disabled={running || !lines} onClick={() => run("voice")}>Record narration</Button>
            <Button size="sm" icon={<Film />} disabled={running || clips < draft.shots.length} onClick={() => run("film")}>Join the film</Button>
          </div>}>
          {p.film_url ? <video src={`${MEDIA}${p.film_url}`} controls className="w-full max-w-4xl border border-line bg-black" />
            : <p className="text-sm text-muted">{clips < draft.shots.length ? `The film can be joined once every shot has its video (${clips}/${draft.shots.length}).` : "Ready to join."}</p>}
        </Section>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
          <span className="text-sm text-muted">You have unsaved changes to the plan.</span>
          <Button size="sm" icon={<Save />} loading={busy === "save"} onClick={save}>Save changes</Button>
          <Button size="sm" variant="ghost" onClick={() => { setDirty(false); setDraft(p); }}>Discard</Button>
        </div>
      )}

      <section>
        <Label n="LOG" className="text-ink">What happened</Label>
        <Card className="mt-4 max-h-64 overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed">
          {[...p.log].reverse().map((x: any, i: number) => <div key={i}><span className="text-muted">{x.at}</span> {x.msg}</div>)}
        </Card>
      </section>
    </div>
  );
}

function Section({ n, title, hint, action, children }: { n: string; title: string; hint: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Label n={n} className="text-ink">{title}</Label>
          <p className="mt-2 max-w-2xl text-[13px] text-muted">{hint}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label className="block">
      <span className="label text-muted">{label}</span>
      {area ? <textarea value={value ?? ""} rows={2} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, "mt-1.5")} />
        : <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, "mt-1.5")} />}
    </label>
  );
}

function Placeholder({ text }: { text: string }) {
  return <div className="grid aspect-video w-full place-items-center border border-dashed border-line text-[12px] text-muted">{text}</div>;
}

function ShotCard({ s, chars, props, running, rate, onEdit, onFrame, onRetake, onUse, onRemove }: {
  s: any; chars: any[]; props: any[]; running: boolean; rate: number; onEdit: (fn: (s: any) => void) => void;
  onFrame: () => void; onRetake: (note: string) => void; onUse: (take: number) => void; onRemove: () => void;
}) {
  const [note, setNote] = useState(s.fix ?? "");
  const words = (s.narration ?? "").split(/\s+/).filter(Boolean).length;
  const fits = words <= Math.floor(s.seconds * 2.4);
  const toggle = (key: "characters" | "props", id: string) => onEdit((x) => { x[key] = x[key]?.includes(id) ? x[key].filter((y: string) => y !== id) : [...(x[key] ?? []), id]; });
  return (
    <div className="grid gap-5 border-b border-line pb-8 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <div className="space-y-3">
        {s.clip_url ? <video src={`${MEDIA}${s.clip_url}`} controls loop className="aspect-video w-full border border-line bg-black" />
          : s.frame_url ? <img src={`${MEDIA}${s.frame_url}`} alt="" className="aspect-video w-full border border-line object-cover" />
          : <Placeholder text="keyframe not painted yet" />}
        <div className="flex flex-wrap items-center gap-2">
          <span className="label text-ink">Shot {s.n}</span>
          <span className="label text-muted">· {s.clip_url ? "video" : s.frame_url ? "keyframe" : "planned"}</span>
          <Button size="sm" variant="secondary" disabled={running || !s.n} onClick={onFrame}>{s.frame_url ? "Repaint frame" : "Paint frame"}</Button>
        </div>
        {(s.takes?.length ?? 0) > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {s.takes.map((t: any, k: number) => (
              <button key={k} onClick={() => onUse(k)} className={cx("label border px-2 py-1", t.clip === s.clip ? "border-ink text-ink" : "border-line text-muted hover:text-accent")}>take {k + 1}</button>
            ))}
          </div>
        )}
        {s.frame_url && (
          <div className="space-y-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Correction for Veo, e.g. the bag changes colour; hair and clothes must move in the wind"
              className={inputCls} />
            <Button size="sm" icon={<Clapperboard />} disabled={running} onClick={() => onRetake(note)}>{s.clip_url ? "Retake" : "Make"} this shot · ${(s.seconds * rate).toFixed(2)}</Button>
          </div>
        )}
      </div>
      <div className="grid content-start gap-3 md:grid-cols-2">
        <label className="block"><span className="label text-muted">Length</span>
          <select value={s.seconds} onChange={(e) => onEdit((x) => { x.seconds = +e.target.value; })} className={cx(inputCls, "mt-1.5")}>
            {[4, 6, 8].map((d) => <option key={d} value={d}>{d} seconds</option>)}
          </select>
        </label>
        <Field label="Shot type" value={s.type} onChange={(v) => onEdit((x) => { x.type = v; })} />
        <div className="md:col-span-2"><Field label="What happens" value={s.action} area onChange={(v) => onEdit((x) => { x.action = v; })} /></div>
        <div className="md:col-span-2"><Field label="Performance (what they feel, the small signs)" value={s.performance} area onChange={(v) => onEdit((x) => { x.performance = v; })} /></div>
        <Field label="Camera" value={s.camera} onChange={(v) => onEdit((x) => { x.camera = v; })} />
        <Field label="Sound (no music)" value={s.sound} onChange={(v) => onEdit((x) => { x.sound = v; })} />
        <div className="md:col-span-2">
          <span className="label text-muted">In the shot</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chars.map((c) => <button key={c.id} onClick={() => toggle("characters", c.id)} className={cx("label border px-2 py-1", s.characters?.includes(c.id) ? "border-ink text-ink" : "border-line text-muted")}>{c.name}</button>)}
            {props.map((x) => <button key={x.id} onClick={() => toggle("props", x.id)} className={cx("label border px-2 py-1", s.props?.includes(x.id) ? "border-ink text-ink" : "border-line text-muted")}>{x.name}</button>)}
          </div>
        </div>
        <div className="md:col-span-2">
          <span className="label text-muted">Dialogue on screen (Hinglish, 3-8 words; spoken by Veo with lip-sync)</span>
          {(s.dialogue ?? []).map((d: any, j: number) => (
            <div key={j} className="mt-1.5 flex gap-2">
              <select value={d.who} onChange={(e) => onEdit((x) => { x.dialogue[j].who = e.target.value; })} className={cx(inputCls, "w-36")}>
                {chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={d.line} onChange={(e) => onEdit((x) => { x.dialogue[j].line = e.target.value; })} className={inputCls} />
              <button onClick={() => onEdit((x) => { x.dialogue.splice(j, 1); })} className="label px-2 text-muted hover:text-accent">×</button>
            </div>
          ))}
          {chars.length > 0 && <button onClick={() => onEdit((x) => { x.dialogue = [...(x.dialogue ?? []), { who: chars[0].id, line: "" }]; })} className="label mt-1.5 text-muted hover:text-accent">+ a line</button>}
          {s.takes?.at(-1)?.heard && <p className="mt-1.5 text-[12px] text-muted">Veo said: “{s.takes.at(-1).heard}” · {Math.round((s.takes.at(-1).match ?? 0) * 100)}% of our words</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block">
            <span className={cx("label", fits ? "text-muted" : "text-accent")}>Narration · {words} words {fits ? "" : `(too long for ${s.seconds} s: max ${Math.floor(s.seconds * 2.4)})`}</span>
            <textarea value={s.narration ?? ""} rows={2} onChange={(e) => onEdit((x) => { x.narration = e.target.value; })} className={cx(inputCls, "mt-1.5")} />
          </label>
          <div className="mt-2 flex items-center gap-3">
            {s.vo_url && <PlayButton url={s.vo_url} />}
            {s.vo_seconds && <span className="text-[12px] text-muted">recorded: {s.vo_seconds} s</span>}
            {s.warn && <span className="text-[12px] text-accent">{s.warn}</span>}
            <button onClick={onRemove} className="label ml-auto text-muted hover:text-accent">remove shot</button>
          </div>
        </div>
      </div>
    </div>
  );
}
