"use client";

import { ArrowLeft, GraduationCap, ImagePlus, Loader2, RefreshCw, Save, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppFrame, Card, Chip, LimeButton } from "@/components/app/kit";
import { Film, type ShotName } from "@/components/landing/explainer";
import { CapabilityToggles, SkillQuestions, questionsFor, skillNo, type Look, type Question, type VSkill } from "@/components/app/skill-chooser";
import { API, api, post, useApi } from "@/lib/api";

/* One skill's page, laid out like the exam-notes Skill Tab: how it looks (frames rendered with its settings, "New
   sample"), the layout (where the scene, stickers and captions sit), the style (the five choices), backgrounds by
   subject, notes to the agent (kept, and given to the scene director), and what the agent studied (the creator's
   uploads). Its capabilities (captions, numbers, flows, maps, stickers) are listed with what each puts on screen, and
   switched on or off right there. */

type Detail = VSkill & {
  look: Look | null; feedback: { at: string; text: string }[]; backgrounds: { subject: string; notes: string; file: string; url: string }[];
  references: { name: string; url: string; video: boolean }[]; assets: { name: string; url: string }[]; samples: string[]; sampling: boolean;
  questions: Question[]; layout: Question[]; learned: Learned;
};
type Learned = {
  state: string; log: { at: string; msg: string }[]; not_matched: string[]; painted_refs: boolean; references: string[]; plate: string;
  stickers: { name: string; url: string }[]; palettes: { name: string; colors: string[]; ink: string; accent: string }[];
  spec: null | { summary: string; mood: string; motif: string; font: string; picture_source: string; picture_style: string; layout_rules: string; flow_style: string;
    number_style: string; compare_style: string; text_style: string; motion_style: string; card_radius: number; card_outline: number; card_shadow: string };
};

/** what the agent learned from the references: the look it wrote, painted and checked, and its progress while working */
function LearnedView({ l }: { l: Learned }) {
  const working = l.state === "working";
  return (
    <div className="space-y-4">
      {(working || l.state === "failed") && (
        <div className="rounded-[12px] bg-[#f6f5ef] p-3 text-[13.5px]">
          {l.log.slice(-6).map((x, i) => <div key={i} className="flex gap-3"><span className="w-16 flex-none font-mono text-[12px] text-[#8a857f]">{x.at}</span><span>{x.msg}</span></div>)}
          {working && <div className="mt-1 flex items-center gap-2 text-[#8a857f]"><Loader2 className="size-3.5 animate-spin" />working…</div>}
        </div>
      )}
      {l.spec && (
        <>
          <p className="text-[15px]"><b>{l.spec.summary}</b> <span className="text-[#5f5b57]">{l.spec.mood} Motif: {l.spec.motif}.</span></p>
          <div className="flex flex-wrap gap-3">
            {l.palettes.map((p) => (
              <div key={p.name} className="w-[132px] overflow-hidden rounded-[10px] border border-[#ecebe5]">
                <div className="flex h-12">{[...p.colors, p.ink, p.accent].map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}</div>
                <div className="truncate px-2 py-1 text-[12px] text-[#5f5b57]">{p.name}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <dl className="grid gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[150px_1fr]">
              <dt className="font-bold">Lettering</dt><dd>{l.spec.font.replace(/_/g, " ")}</dd>
              <dt className="font-bold">Cards</dt><dd>radius {l.spec.card_radius}, outline {l.spec.card_outline}, {l.spec.card_shadow} shadow</dd>
              <dt className="font-bold">Pictures</dt><dd>{l.spec.picture_source}: {l.spec.picture_style}</dd>
              <dt className="font-bold">A frame</dt><dd>{l.spec.layout_rules}</dd>
              <dt className="font-bold">Flowcharts</dt><dd>{l.spec.flow_style}</dd>
              <dt className="font-bold">Numbers</dt><dd>{l.spec.number_style}</dd>
              <dt className="font-bold">Comparisons</dt><dd>{l.spec.compare_style}</dd>
              <dt className="font-bold">Words</dt><dd>{l.spec.text_style}</dd>
              <dt className="font-bold">Motion</dt><dd>{l.spec.motion_style}</dd>
            </dl>
            <div className="space-y-2">
              {l.plate && <figure><img src={ORIGIN + l.plate} alt="" className="aspect-video w-[220px] rounded-[10px] object-cover" /><figcaption className="text-[12px] text-[#8a857f]">Painted background</figcaption></figure>}
              {l.stickers.length > 0 && <div className="flex w-[220px] flex-wrap gap-1.5">{l.stickers.map((s) => <img key={s.name} src={ORIGIN + s.url} alt={s.name} title={s.name} className="size-12 object-contain" />)}</div>}
            </div>
          </div>
          {l.not_matched.length > 0 && <p className="text-[13.5px] text-[#9a5a12]"><b>Could not match yet:</b> {l.not_matched.join(" · ")}</p>}
        </>
      )}
    </div>
  );
}
const ORIGIN = API.replace(/\/api\/?$/, "");

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 border-b border-[#ecebe5] pb-2 text-[13px] font-bold uppercase tracking-[0.07em] text-[#8a857f]">{title}</div>
      {children}
    </Card>
  );
}

/** the frame as the skill lays it out: the scene, the stickers, the captions */
function LayoutMap({ look }: { look: Look }) {
  const stage = look.stage === "left" ? 120 : look.stage === "right" ? 720 : 420;
  const st = { small: 190, medium: 280, large: 360 }[look.sticker_size] ?? 280;
  const stickers = look.sticker_place === "none" ? [] : look.stage !== "center"
    ? [[look.stage === "left" ? 1920 - 90 - st : 90, 150], [look.stage === "left" ? 1920 - 90 - st : 90, 230 + st]]
    : look.sticker_place === "corners" ? [[30, 30], [1920 - 30 - st, 1050 - st]] : [[50, 540 - st / 2], [1920 - 50 - st, 540 - st / 2]];
  return (
    <svg viewBox="0 0 1920 1080" className="w-full rounded-[12px] border border-[#ecebe5] bg-[#f6f5ef]">
      <rect x={stage} y={0} width={1080} height={1080} fill="#fff" stroke="#1f1c1b" strokeWidth={6} strokeDasharray="24 14" />
      <text x={stage + 40} y={90} fontSize={58} fontWeight={700} fill="#1f1c1b">The scene</text>
      <rect x={stage + 240} y={330} width={600} height={330} rx={40} fill="#a6f04a" stroke="#1f1c1b" strokeWidth={8} />
      {stickers.map(([x, y], i) => <g key={i}><circle cx={x + st / 2} cy={y + st / 2} r={st / 2} fill="#f6f39a" stroke="#1f1c1b" strokeWidth={5} /><text x={x + st / 2} y={y + st / 2 + 18} textAnchor="middle" fontSize={44} fontWeight={700}>sticker</text></g>)}
      {look.text === "captions" && <g><rect x={360} y={look.caption_pos === "top" ? 40 : 900} width={1200} height={130} rx={60} fill="#1f1c1b" /><text x={960} y={look.caption_pos === "top" ? 122 : 982} textAnchor="middle" fontSize={50} fontWeight={700} fill="#a6f04a">captions: everything you say</text></g>}
    </svg>
  );
}

export default function SkillPage() {
  const { id } = useParams<{ id: string }>();
  const { data, mutate } = useApi<Detail>(`/vskills/${id}`, { refreshInterval: (d) => (d?.sampling || d?.learned?.state === "working" ? 3000 : 0) });
  const [look, setLook] = useState<Look | null>(null);
  const [say, setSay] = useState("");
  const [bg, setBg] = useState<{ subject: string; notes: string; file: File | null }>({ subject: "", notes: "", file: null });
  const [busy, setBusy] = useState("");
  const [topic, setTopic] = useState("");
  const router = useRouter();
  useEffect(() => { if (data?.look && !look) setLook(data.look); }, [data, look]);
  if (!data) return <AppFrame><div className="mx-auto max-w-[1100px] text-[15px] text-[#8a857f]">Loading the skill…</div></AppFrame>;
  const run = async (what: string, f: () => Promise<unknown>) => { setBusy(what); try { await f(); await mutate(); } finally { setBusy(""); } };
  const isLook = data.kind === "look";
  const mine = data.id.startsWith("custom");
  const motion = data.renderer === "motion";
  const sample = (t = topic) => run("sample", () => post(`/vskills/${id}/sample`, { topic: t }));
  /** a capability switched: saved at once (with the rest of the look as it stands) */
  const toggle = (l: Look) => { setLook(l); run("cap", () => api(`/vskills/${id}/look`, { method: "PUT", body: JSON.stringify(l) })); };

  return (
    <AppFrame>
      <div className="mx-auto max-w-[1100px] space-y-5">
        <Link href="/app/skills" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#5f5b57] hover:text-[#1f1c1b]"><ArrowLeft className="size-4" />All skills</Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[13px] font-bold tracking-[0.08em] text-[#3f7d1e]">{skillNo(data.no)}</div>
            <h1 className="text-[36px] font-bold leading-tight tracking-[-0.02em]">{data.name}</h1>
            <div className="mt-1 flex flex-wrap gap-2"><Chip tone={mine ? "ink" : "lime"}>{mine ? "Your skill" : "Built in"}</Chip>{data.topic && <Chip>{data.topic}</Chip>}{data.ready ? <Chip tone="lime">Ready</Chip> : <Chip tone="warn">Building</Chip>}</div>
          </div>
          <LimeButton onClick={() => sample()}>{data.sampling || busy === "sample" ? <><Loader2 className="size-4 animate-spin" />Rendering samples…</> : <><RefreshCw className="size-4" />New sample</>}</LimeButton>
        </div>
        <p className="max-w-[760px] text-[15.5px] leading-relaxed text-[#5f5b57]">{data.about}</p>
        <p className="text-[13.5px] text-[#8a857f]">{motion ? "Drawn by the motion director: a new palette, motif and every shot designed for each topic, in this look's style." : "Drawn with the board templates, in the look's settings below."}</p>

        {motion && (
          <Section title="What it learned from the references">
            {data.learned.spec || data.learned.state ? <LearnedView l={data.learned} /> : <p className="text-[14px] text-[#8a857f]">Not learned yet.</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <LimeButton onClick={() => run("learn", () => post(`/vskills/${id}/learn`, { topic }))}>
                {data.learned.state === "working" || busy === "learn" ? <><Loader2 className="size-4 animate-spin" />Learning…</> : <><GraduationCap className="size-4" />{data.learned.spec ? "Learn again" : "Learn this look"}</>}
              </LimeButton>
              <span className="text-[13px] text-[#8a857f]">Studies the references, paints the background and stickers, draws a sample, compares it with the references and fixes it (a few minutes).</span>
            </div>
          </Section>
        )}

        <Section title={`How it looks${data.sample_topic ? ` · on “${data.sample_topic}”` : ""}`}>
          {data.samples.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">{data.samples.map((u, i) => <img key={u} src={ORIGIN + u} alt={`Sample ${i + 1}`} className="aspect-video w-full rounded-[12px] border border-[#ecebe5] object-cover" />)}</div>
          ) : motion ? (
            <div className="grid aspect-[16/4] place-items-center rounded-[12px] border border-dashed border-[#d9d8d0] text-[14px] text-[#8a857f]">No sample yet: press <b className="mx-1">New sample</b> to see this look on a topic.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="relative aspect-video overflow-hidden rounded-[12px]"><Film shots={(data.sample?.length ? data.sample : ["hook"]) as ShotName[]} ms={2700} /></div>
              <p className="max-w-[260px] text-[14px] text-[#8a857f]">A preview of the look. Press <b>New sample</b> to render three frames of a sample lesson with this skill&apos;s own settings.</p>
            </div>
          )}
          {data.sampling && <p className="mt-3 text-[13.5px] text-[#8a857f]">Writing a short lesson on {data.sample_topic || "the topic"} and drawing it in this look{motion ? " (the motion director designs it: about a minute)" : ""}…</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && topic.trim()) sample(); }}
              placeholder="See it on your topic, e.g. The French Revolution" className="min-w-[240px] flex-1 rounded-[10px] border border-[#e2e1da] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#a6f04a]" />
            <LimeButton onClick={() => topic.trim() && sample()}><RefreshCw className="size-4" />Show it on this topic</LimeButton>
          </div>
        </Section>

        {isLook && look && data.capabilities && (
          <Section title={`Capabilities · what it puts on screen${busy === "cap" ? " · saving…" : ""}`}>
            <CapabilityToggles caps={data.capabilities} look={look} onChange={toggle} detail />
            <p className="mt-3 text-[13.5px] text-[#8a857f]">Switched off here, a capability is off in every new video; you can still switch it per video in the “How should it look?” step. The agent only uses words and numbers you actually say.</p>
          </Section>
        )}

        {data.how_to_show?.note && (
          <Section title={`How to show ${data.topic ?? "this topic"}${data.how_to_show.searched ? " · from how teachers explain it" : ""}`}>
            <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed">{data.how_to_show.note}</p>
            {data.how_to_show.sources.length > 0 && <p className="mt-3 text-[12.5px] text-[#8a857f]">Searched: {data.how_to_show.sources.join(" · ")}</p>}
            <p className="mt-2 text-[13px] text-[#8a857f]">Given to the scene director with the skill&apos;s notes.</p>
          </Section>
        )}

        {isLook && look && (
          <>
            {!motion && <Section title="The layout · where things sit">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                <LayoutMap look={look} />
                <SkillQuestions questions={data.layout} look={look} onChange={setLook} extras={false} />
              </div>
            </Section>}
            <Section title="Style · change anything, then save and make a new sample">
              <SkillQuestions questions={questionsFor(data.questions, data.renderer, !mine)} look={look} onChange={setLook} extras={!motion} />
              {motion && <textarea value={look.notes} onChange={(e) => setLook({ ...look, notes: e.target.value })} rows={2} placeholder="Anything else, in your words: “warmer colours”, “more arrows”, “a meme after every surprising fact”…"
                className="mt-4 w-full resize-none rounded-[12px] border border-[#e2e1da] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#a6f04a]" />}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <LimeButton onClick={() => run("save", async () => { await api(`/vskills/${id}/look`, { method: "PUT", body: JSON.stringify(look) }); await post(`/vskills/${id}/sample`, { topic }); })}>
                  {busy === "save" ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save and make a new sample</>}
                </LimeButton>
                <span className="text-[13px] text-[#8a857f]">{id === "board" ? "These are your defaults: every new video starts from them." : "Saved with this skill."}</span>
              </div>
            </Section>
            <Section title="Backgrounds by subject · a video of that subject uses its background">
              <div className="grid gap-3 sm:grid-cols-3">
                {data.backgrounds.map((b) => (
                  <div key={b.subject} className="rounded-[12px] border border-[#ecebe5] p-2">
                    {b.url ? <img src={ORIGIN + b.url} alt="" className="aspect-video w-full rounded-[8px] object-cover" /> : <div className="grid aspect-video place-items-center rounded-[8px] bg-[#f6f5ef] p-2 text-center text-[13px] text-[#8a857f]">To paint: {b.notes || "a background for this subject"}</div>}
                    <div className="mt-2 flex items-center justify-between"><span className="text-[14px] font-bold">{b.subject}</span>
                      <button type="button" aria-label={`Remove the ${b.subject} background`} onClick={() => run("bg", () => api(`/vskills/${id}/backgrounds/${encodeURIComponent(b.subject)}`, { method: "DELETE" }))} className="text-[#8a857f] hover:text-[#9a2f1d]"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input value={bg.subject} onChange={(e) => setBg({ ...bg, subject: e.target.value })} placeholder="Subject, e.g. Biology" className="w-44 rounded-[10px] border border-[#e2e1da] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#a6f04a]" />
                <input value={bg.notes} onChange={(e) => setBg({ ...bg, notes: e.target.value })} placeholder="What to show in it (optional): leaves, cells, a microscope" className="min-w-[220px] flex-1 rounded-[10px] border border-[#e2e1da] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#a6f04a]" />
                <label className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#e2e1da] bg-white px-3 py-2 text-[13.5px] font-semibold hover:border-[#a6f04a]">
                  <ImagePlus className="size-4" />{bg.file ? bg.file.name.slice(0, 18) : "Your image"}
                  <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setBg({ ...bg, file: e.target.files?.[0] ?? null })} />
                </label>
                <LimeButton onClick={() => run("bg", async () => {
                  const fd = new FormData(); fd.append("subject", bg.subject); fd.append("notes", bg.notes); if (bg.file) fd.append("file", bg.file);
                  await post(`/vskills/${id}/backgrounds`, fd); setBg({ subject: "", notes: "", file: null });
                })}>Add background</LimeButton>
              </div>
            </Section>
          </>
        )}

        <Section title="Tell the agent what to change">
          <div className="space-y-2">{data.feedback.map((h, i) => <div key={i} className="flex gap-3 text-[14px]"><span className="w-24 flex-none font-mono text-[12px] text-[#8a857f]">{h.at}</span><span>{h.text}</span></div>)}</div>
          <div className="mt-3 flex gap-2">
            <textarea value={say} onChange={(e) => setSay(e.target.value)} rows={2} placeholder="e.g. Bigger text on the cards. A meme reaction after every surprising fact. Use my school's colours: navy and gold."
              className="min-w-0 flex-1 resize-none rounded-[12px] border border-[#e2e1da] bg-white px-3 py-2 text-[14.5px] outline-none focus:border-[#a6f04a]" />
            <LimeButton onClick={() => run("say", async () => { await post(`/vskills/${id}/feedback`, { text: say }); setSay(""); })}><Send className="size-4" />Send</LimeButton>
          </div>
          <p className="mt-2 text-[13px] text-[#8a857f]">Your notes stay with the skill and go to the scene director in every video that uses it.</p>
        </Section>

        {(data.references.length > 0 || data.assets.length > 0 || data.describe || data.learned.references.length > 0) && (
          <Section title="What the agent studied">
            {data.learned.references.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[13.5px] text-[#8a857f]">{data.learned.painted_refs ? "Reference frames painted from what you described (upload your own Shorts or screenshots to learn from them instead):" : "The reference frames it learned from:"}</p>
                <div className="grid gap-2 sm:grid-cols-4">{data.learned.references.map((u) => <img key={u} src={ORIGIN + u} alt="" className="aspect-video w-full rounded-[8px] object-cover" />)}</div>
              </div>
            )}
            {data.describe && <p className="mb-3 whitespace-pre-wrap text-[14.5px]">{data.describe}</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {data.references.map((r) => r.video
                ? <video key={r.name} src={ORIGIN + r.url} controls className="aspect-video w-full rounded-[10px] bg-black" />
                : <img key={r.name} src={ORIGIN + r.url} alt="" className="aspect-video w-full rounded-[10px] object-cover" />)}
              {data.assets.map((a) => <figure key={a.name}><img src={ORIGIN + a.url} alt="" className="aspect-video w-full rounded-[10px] bg-[#f6f5ef] object-contain" /><figcaption className="mt-1 text-[12.5px] text-[#8a857f]">Your image · {a.name.replace(/^asset\d+-/, "")}</figcaption></figure>)}
            </div>
          </Section>
        )}
        {mine && (
          <div className="pb-4">
            <button type="button" onClick={() => { if (confirm(`Remove ${data.name}?`)) run("del", async () => { await api(`/vskills/${id}`, { method: "DELETE" }); router.push("/app/skills"); }); }}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#8a857f] hover:text-[#9a2f1d]"><Trash2 className="size-4" />Remove this skill</button>
          </div>
        )}
      </div>
    </AppFrame>
  );
}
