"use client";

import { ArrowLeft, Clapperboard, ImagePlus, Plus, RefreshCw, Save, Send, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { MEDIA } from "@/components/studio";
import { Button, Chip, Label, Skeleton, cx, inputCls } from "@/components/ui";
import { api, post, useApi } from "@/lib/api";
import { SOURCE_NAMES, describeCanvas } from "@/lib/skills";

const FILL_COLOURS: Record<string, string> = { scene: "#4a90d9", scene2: "#7b61c9", bullet: "#e0884a", sticker: "#5aa05a", asset: "#c9a13b" };

/** The page as the agent laid it out: the card in paper colour, each picture slot outlined and named. */
function LayoutMap({ cv }: { cv: any }) {
  if (!cv) return null;
  const cardY = cv.card.y ?? 190;
  return (
    <svg viewBox="0 0 1920 1080" className="w-full max-w-xl border border-line bg-[#f2f0ea]">
      {cv.slots.filter((s: any) => s.layer !== "front").map((s: any, i: number) => <SlotBox key={`b${i}`} s={s} />)}
      <rect x={cv.card.x} y={cardY} width={cv.card.w} height={640} fill="#f6f1e6" stroke="#141414" strokeWidth={4} />
      <text x={cv.card.x + 40} y={cardY + 90} fontSize={56} fontWeight={700} fill="#141414">Paper card</text>
      {[0, 1, 2].map((k) => <rect key={k} x={cv.card.x + 40} y={cardY + 160 + k * 110} width={cv.card.w * 0.7} height={40} fill="#ffd60a" opacity={0.6} />)}
      {cv.slots.filter((s: any) => s.layer === "front").map((s: any, i: number) => <SlotBox key={`f${i}`} s={s} />)}
    </svg>
  );
}

function SlotBox({ s }: { s: any }) {
  const c = FILL_COLOURS[s.fill] ?? "#888";
  const round = s.shape === "oval" || s.shape === "circle" ? Math.min(s.w, s.h) / 2 : s.shape === "rect" ? 0 : 40;
  return (
    <g transform={`rotate(${s.rotate ?? 0} ${s.x + s.w / 2} ${s.y + s.h / 2})`}>
      <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={round} fill={c} fillOpacity={0.18} stroke={c} strokeWidth={6} strokeDasharray={s.layer === "front" ? undefined : "24 14"} />
      <text x={s.x + 24} y={s.y + 64} fontSize={48} fontWeight={700} fill={c}>{s.fill}{s.sticker ? `: ${s.sticker.slice(0, 18)}` : ""}</text>
    </g>
  );
}

export default function SkillPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: s, error, mutate } = useApi<any>(`/slide-skills/${id}`, {
    refreshInterval: (d: any) => (d?.state === "working" || (d?.demo && !["done", "failed", "stopped"].includes(d.demo.state)) ? 3000 : 0) });
  const [look, setLook] = useState<any>(null);
  const [say, setSay] = useState("");
  const [bgSubject, setBgSubject] = useState("");
  const [bgNotes, setBgNotes] = useState("");
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (s?.look && s.state !== "working") setLook(s.look); }, [s?.state, s?.look]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Offline message={error.message} />;
  if (!s) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;
  const working = s.state === "working";
  const changed = look && s.look && JSON.stringify(look) !== JSON.stringify(s.look);
  const set = (k: string, v: any) => setLook({ ...look, [k]: v });
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await fn(); toast({ tone: "good", title: done }); await mutate(); }
    catch (e: any) { toast({ tone: "bad", title: "Couldn't do that", body: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-10 pb-24">
      <Link href="/skills" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Skill Tab</Link>
      <div>
        <Label n={`SKILL ${String(s.id).padStart(2, "0")}`} className="text-ink">
          {[s.subject, s.extends_name ? `built on ${s.extends_name}` : "built on Paper (classic)"].filter(Boolean).join(" · ")}
        </Label>
        <h1 className="mt-6 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl">{s.name}</h1>
        {s.summary && <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">{s.summary}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className={cx("label px-2 py-1", s.state === "ready" ? "bg-[#ffd60a] text-[#141414]" : s.state === "failed" ? "bg-accent text-white" : "text-muted")}>
            {s.state === "ready" ? "Ready to use in films" : s.state === "failed" ? "Stopped with an error" : "The agent is working…"}
          </span>
          {!working && <Button variant="secondary" size="sm" icon={<RefreshCw />} loading={busy} onClick={() => run(() => post(`/slide-skills/${s.id}/remake?what=sample`), "Making a new sample")}>New sample</Button>}
          {!working && <Button variant="ghost" size="sm" icon={<Sparkles />} loading={busy} onClick={() => run(() => post(`/slide-skills/${s.id}/remake?what=all`), "The agent is studying the references again")}>Learn again</Button>}
          {!working && <Button variant="ghost" size="sm" icon={<Trash2 />} loading={busy}
            onClick={() => confirm(`Delete the skill "${s.name}"?`) && run(async () => { await api(`/slide-skills/${s.id}`, { method: "DELETE" }); router.push("/skills"); }, "Skill deleted")}>Delete</Button>}
        </div>
      </div>

      {(working || s.state === "failed") && (
        <div className="border border-line px-4 py-3">
          <div className="label text-muted">{working ? "Live" : "Last steps"}</div>
          <div className="mt-2 space-y-0.5 font-mono text-[12.5px]">
            {s.log.slice(-7).map((l: any, i: number, a: any[]) => <div key={i} className={i === a.length - 1 ? "text-ink" : "text-muted"}><span className="mr-2 text-muted">{l.at}</span>{l.msg}</div>)}
          </div>
        </div>
      )}

      {(s.samples?.length > 0 || s.demo) && (
        <section>
          <div className="label border-b border-ink pb-2">How it looks</div>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {(s.samples ?? []).map((u: string, i: number) => (
              <figure key={u}>
                <img src={`${MEDIA}${u}`} alt="" className="aspect-video w-full border border-line object-cover" />
                <figcaption className="label mt-2 text-muted">{i === 0 ? "A slide, all bullets in" : "A picture break after a bullet"}</figcaption>
              </figure>
            ))}
            <figure>
              {s.demo?.video ? <video src={`${MEDIA}${s.demo.video}`} controls playsInline className="aspect-video w-full bg-black" />
                : <div className="grid aspect-video place-items-center border border-dashed border-line px-6 text-center text-[13px] text-muted">
                    {s.demo && !["done", "failed", "stopped"].includes(s.demo.state) ? "Making the 1-minute demo film: about 3-6 minutes…"
                      : "A 1-minute film of a real lecture made in this skill, with its sound."}
                  </div>}
              <figcaption className="mt-2 flex items-center gap-3">
                <span className="label text-muted">1-minute demo with audio</span>
                {s.state === "ready" && !(s.demo && !["done", "failed", "stopped"].includes(s.demo.state)) && (
                  <Button variant="secondary" size="sm" icon={<Clapperboard />} loading={busy}
                    onClick={() => run(() => post(`/slide-skills/${s.id}/demo`), "Making the demo film")}>{s.demo ? "Make it again" : "Make the demo"}</Button>
                )}
              </figcaption>
            </figure>
          </div>
        </section>
      )}

      {(s.not_matched?.length > 0 || s.code_notes?.length > 0) && (
        <section className="border border-[#e0884a] px-5 py-4">
          <div className="label text-[#e0884a]">What the agent couldn&apos;t match</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-relaxed">
            {[...(s.not_matched ?? []), ...(s.code_notes ?? [])].map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ul>
        </section>
      )}

      <section>
        <div className="label border-b border-ink pb-2">Tell the agent what to change</div>
        <div className="mt-4 space-y-3">
          {(s.history ?? []).map((h: any, i: number) => (
            <div key={i} className="flex gap-3 text-[14px]"><span className="label mt-0.5 w-24 flex-none text-muted">{h.at}</span><span>{h.text}</span></div>
          ))}
          <div className="flex gap-2">
            <textarea value={say} onChange={(e) => setSay(e.target.value)} rows={2} className={cx(inputCls, "flex-1")} disabled={working}
              placeholder="e.g. Put the picture in an oval on the left and the card on the right. Add a small chalkboard sticker at the bottom right. Make the tape yellow." />
            <Button icon={<Send />} loading={busy} disabled={working || !say.trim()}
              onClick={() => run(async () => { await post(`/slide-skills/${s.id}/feedback`, { text: say }); setSay(""); }, "The agent is changing the skill")}>Send</Button>
          </div>
        </div>
      </section>

      {look?.mix && (
        <section>
          <div className="label border-b border-ink pb-2">The looks it mixes · the agent picks one per slide</div>
          <ul className="mt-4 space-y-2 text-[14px]">
            <li><b>Cartoon</b>: {s.extends_name?.split(" + ")[0] ?? "Picture Breaks"}: a storybook illustration beside the card, for ideas and analogies</li>
            <li><b>Photo</b>: {s.extends_name?.split(" + ")[1] ?? "Photo Breaks"}: a real photo in a round frame, for real, photographable things</li>
            {look.mix?.arch && <li><b>Arch</b>: {s.extends_name?.split(" + ")[2] ?? "Twin Ovals"}: a big painted picture in an arch on the left, for striking scenes worth seeing large</li>}
            {look.backdrop && <li><b>Backdrop</b>: a real photo fills the screen under a frosted glass card tinted from it (white text, black on the yellow), for openings and big scenes, about one slide in four</li>}
            <li className="text-muted">Every look zooms its picture with fact labels; never the same look three slides in a row.</li>
          </ul>
        </section>
      )}

      {s.canvas !== undefined && !look?.mix && (
        <section>
          <div className="label border-b border-ink pb-2">The layout · {describeCanvas(s.canvas)}</div>
          <div className="mt-4 flex flex-wrap items-start gap-6">
            {s.canvas ? <LayoutMap cv={s.canvas} /> : <p className="text-[14px] text-muted">The classic card, its picture inside it.</p>}
            <div className="space-y-1 text-[12.5px] text-muted">
              {Object.entries(FILL_COLOURS).map(([k, c]) => <div key={k} className="flex items-center gap-2"><span className="size-3" style={{ background: c }} />{k}</div>)}
              <div className="pt-2">Dashed: behind the card · solid: in front</div>
            </div>
          </div>
        </section>
      )}

      {look && !look.mix && (
        <section>
          <div className="label border-b border-ink pb-2">Style · change anything, the sample is made again</div>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="label text-muted">Pictures come from</div>
              <div className="flex flex-wrap gap-2">{Object.entries(SOURCE_NAMES).map(([k, v]) => <Chip key={k} active={look.picture_source === k} onClick={() => set("picture_source", k)}>{v}</Chip>)}</div>
            </div>
            <div className="space-y-2">
              <div className="label text-muted">Picture breaks between bullets</div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip active={!look.interlude} onClick={() => set("interlude", false)}>Off</Chip>
                <Chip active={look.interlude && look.interlude_mode !== "until_next"} onClick={() => setLook({ ...look, interlude: true, interlude_mode: "seconds" })}>A few seconds</Chip>
                <Chip active={look.interlude && look.interlude_mode === "until_next"} onClick={() => setLook({ ...look, interlude: true, interlude_mode: "until_next" })}>Until the next bullet</Chip>
                {look.interlude && look.interlude_mode !== "until_next" && <><input type="number" step={0.5} min={1.5} max={4} value={look.interlude_seconds} onChange={(e) => set("interlude_seconds", Number(e.target.value))} className={cx(inputCls, "w-24")} /><span className="text-[13px] text-muted">seconds each</span></>}
              </div>
              {look.interlude && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[12.5px] text-muted">Each bullet stays on the slide for</span>
                  <input type="number" step={0.5} min={1} max={8} value={look.read_seconds ?? 3} onChange={(e) => set("read_seconds", Number(e.target.value))} className={cx(inputCls, "w-20")} />
                  <span className="text-[12.5px] text-muted">seconds before its picture</span>
                </div>
              )}
              {look.interlude && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[12.5px] text-muted">A break</span>
                  <Chip active={(look.break_style ?? "zoom") === "zoom"} onClick={() => set("break_style", "zoom")}>zooms the slide&apos;s picture to full screen</Chip>
                  <span className="text-[12.5px] text-muted">or shows a separate picture</span>
                  {[["arch", "in an arch"], ["rounded", "in a rounded frame"], ["oval", "in an oval"], ["circle", "in a circle"]].map(([k, v]) => (
                    <Chip key={k} active={look.break_style === "framed" && (look.break_shape ?? "arch") === k}
                      onClick={() => setLook({ ...look, break_style: "framed", break_shape: k })}>{v}</Chip>
                  ))}
                  <span className="text-[12.5px] text-muted">on the background, or</span>
                  <Chip active={look.break_style === "full"} onClick={() => set("break_style", "full")}>full screen</Chip>
                </div>
              )}
              {look.interlude && look.break_style !== "full" && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[12.5px] text-muted">Text on the break</span>
                  {[["labels", "1-2 labels pointing at the picture"], ["caption", "a caption card beside it"], ["none", "no text"]].map(([k, v]) => (
                    <Chip key={k} active={(look.break_text ?? "labels") === k} onClick={() => set("break_text", k)}>{v}</Chip>
                  ))}
                </div>
              )}
              {look.interlude && look.interlude_mode === "until_next" && (
                <p className="text-[12.5px] text-muted">Each bullet appears and is read for a moment; then its picture stays on screen until the narrator starts the next bullet. The last picture stays to the end of the scene.</p>
              )}
            </div>
            <div className="space-y-2 lg:col-span-2">
              <div className="label text-muted">Art style Qwen-Image paints in</div>
              <textarea value={look.picture_style} onChange={(e) => set("picture_style", e.target.value)} rows={2} className={inputCls} />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <div className="label text-muted">Background to paint (empty = {look.background_asset ? "your own image" : "the classic grid paper"})</div>
              <textarea value={look.background} onChange={(e) => set("background", e.target.value)} rows={2} className={inputCls} />
              {s.plate && <img src={`${MEDIA}${s.plate}`} alt="" className="w-72 border border-line" />}
            </div>
            <div className="space-y-3 lg:col-span-2">
              <div className="label text-muted">Backgrounds by subject · a film of that subject uses its background; everything else stays the same</div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(s.backgrounds ?? []).map((b: any) => (
                  <figure key={b.subject} className="relative">
                    {b.sample_url ? <img src={`${MEDIA}${b.sample_url}`} alt="" className="aspect-video w-full border border-line object-cover" />
                      : <div className="aspect-video bg-surface" />}
                    <figcaption className="mt-1 flex items-center justify-between">
                      <span className="text-[14px] font-medium">{b.subject}</span>
                      <button aria-label={`Remove the ${b.subject} background`} className="text-muted hover:text-accent"
                        onClick={() => run(() => api(`/slide-skills/${s.id}/backgrounds/${b.subject.toLowerCase().replace(/[^a-z0-9]/g, "")}`, { method: "DELETE" }), `${b.subject} background removed`)}>
                        <X className="size-4" /></button>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={bgSubject} onChange={(e) => setBgSubject(e.target.value)} className={cx(inputCls, "w-48")} placeholder="Subject, e.g. Biology" />
                <input value={bgNotes} onChange={(e) => setBgNotes(e.target.value)} className={cx(inputCls, "min-w-[220px] flex-1")} placeholder="What to show in it (optional), e.g. cells, leaves, a microscope" />
                <label className="flex cursor-pointer items-center gap-1.5 border border-line px-3 py-2 text-[13px] hover:border-ink">
                  <ImagePlus className="size-4" />{bgFile ? bgFile.name : "or your own image"}
                  <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                </label>
                <Button size="sm" icon={<Plus />} loading={busy} disabled={working || !bgSubject.trim()}
                  onClick={() => run(async () => {
                    const fd = new FormData();
                    fd.append("subject", bgSubject); fd.append("notes", bgNotes);
                    if (bgFile) fd.append("file", bgFile);
                    await post(`/slide-skills/${s.id}/backgrounds`, fd);
                    setBgSubject(""); setBgNotes(""); setBgFile(null);
                  }, "Painting the background for this subject")}>Add background</Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="label text-muted">Tape on the card</span>
              <input type="color" value={look.tape || "#8bc34a"} onChange={(e) => set("tape", e.target.value)} className="h-8 w-12" disabled={!look.tape} />
              <Chip active={!!look.tape} onClick={() => set("tape", look.tape ? "" : "#8bc34a")}>{look.tape ? "On" : "Off"}</Chip>
            </div>
          </div>
          {changed && (
            <div className="mt-6">
              <Button icon={<Save />} loading={busy} disabled={working} onClick={() => run(() => api(`/slide-skills/${s.id}`, { method: "PUT", body: JSON.stringify(look) }), "Saved: making the sample again")}>Save and remake the sample</Button>
            </div>
          )}
        </section>
      )}

      {(s.references?.length > 0 || s.assets?.length > 0) && (
        <section>
          <div className="label border-b border-ink pb-2">What the agent studied</div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {s.references.map((u: string) => <img key={u} src={`${MEDIA}${u}`} alt="" className="aspect-video w-full object-cover" />)}
            {(s.assets ?? []).filter((a: any) => a.url).map((a: any) => (
              <figure key={a.name}><img src={`${MEDIA}${a.url}`} alt="" className="aspect-video w-full bg-surface object-contain" />
                <figcaption className="label mt-1 text-muted">Your image · {a.name.replace(/^asset-/, "")}</figcaption></figure>
            ))}
          </div>
          {s.notes && <p className="mt-3 text-[13.5px] leading-relaxed text-muted">Notes: {s.notes}</p>}
        </section>
      )}
    </div>
  );
}
