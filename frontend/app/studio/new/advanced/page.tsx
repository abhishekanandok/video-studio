"use client";

import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers";
import { PlayButton, VoicePicker } from "@/components/studio";
import { Button, Chip, Label, Skeleton, inputCls } from "@/components/ui";
import { post, useApi } from "@/lib/api";

type Role = { name: string; style: string; voice: string; look?: string };

function Section({ n, title, hint, children }: { n: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line py-8 lg:grid-cols-[240px_1fr]">
      <div>
        <Label n={n} className="text-ink">{title}</Label>
        {hint && <p className="mt-2 text-[13px] leading-relaxed text-muted">{hint}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

const Chips = ({ items, value, onChange }: { items: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-2">{items.map((x) => <Chip key={x.key} active={value === x.key} onClick={() => onChange(x.key)}>{x.label}</Chip>)}</div>
);

// how an archival documentary is edited (video/board.py + the Remotion "Board"): shown so the creator knows the look up front
const DOC_EDIT = [
  ["70%", "Collage board", "Facts split onto sticky notes, quotes typed on torn paper scraps, ideas joined with red string"],
  ["20%", "Pictures", "Real archival photos, credited, plus painted black-and-white cut-outs taped to the board"],
  ["10%", "Newspaper", "Real headlines, and rising or falling charts for the dramatic numbers"],
] as const;

// how the archival agent researches (video/archivedoc.py research + investigate), shown so the creator knows what to expect
const RESEARCH_STEPS = [
  ["01", "Search", "Plans up to 20 searches aimed at primary sources, and reads your own links first"],
  ["02", "Verify", "Keeps a fact only if its sentence is found word for word on the page; quotes keep who said them and when"],
  ["03", "Investigate", "Two more rounds: follows leads, chases the original source, finds the other side of every accusation"],
  ["04", "Replace blocked pages", "A site that refuses to be read is searched for elsewhere, never bypassed"],
  ["05", "You review", "A research pack with every quote, fact and source; approve it and the script is written from it alone"],
] as const;

function HowItResearches() {
  return (
    <div className="border border-line bg-surface p-4">
      <span className="label text-muted">How it researches</span>
      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        {RESEARCH_STEPS.map(([n, name, what]) => (
          <div key={n} className="border-t border-line pt-2">
            <div className="flex items-baseline gap-2"><span className="font-mono text-[13px] text-accent">{n}</span><span className="text-[14px] text-ink">{name}</span></div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{what}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// the edits an archival documentary can be cut in; each shows a demo of the same two shots so the difference is plain
const EDITS = [
  { key: "board", label: "Collage board", demo: "/demos/edit-board.jpg",
    what: "The classic cut: titles, charts and photos sit on clean paper, so nothing competes with the content." },
  { key: "layered", label: "Collage board + layered backgrounds", demo: "/demos/edit-layered.jpg",
    what: "Everything in the classic cut, plus no flat backgrounds: behind titles, charts and photos sits a faint, tinted layer of the chapter's own pictures (blacks lifted to grey, soft whites, paper texture), for a Vox-style editorial feel." },
  { key: "build", label: "Build-up (word-synced)", demo: "/demos/edit-build.jpg",
    what: "Every line builds its page piece by piece: photos, cut-outs, stamped labels and notes fly in from the edges and land on the exact word that names them, then stay while the page fills up. Charts, headlines and title cards stay as in the classic cut." },
  { key: "editorial", label: "Vox editorial (modern + history)", demo: "/demos/edit-editorial.jpg",
    what: "The modern Vox look for today, the paper look for history. For each present-day line the agent picks a layout: a person cut out of their real photo with a yellow sticker outline, a circle portrait with a year, a portrait torn into strips, photo cards on a timeline, stacked photos with guide lines, or a newspaper clipping, each with its own animation (highlighter sweeps, dashed arrows, red circles). History lines keep the build-up paper pages." },
] as const;

// the skills that stack on top of any edit, each with a demo of what it does
const EXTRAS = [
  { key: "era", label: "Modern look for current events", demo: "/demos/era-look.jpg",
    alt: "An old black-and-white print for 1811, a modern chart card, and a 2025 photo turning to colour and filling the frame",
    what: "The film knows which lines are about the past and which about today. History keeps the old-school paper look: black-and-white prints, old newspapers. Today's events look current: a photo lands in black and white, turns to full colour and zooms until it fills the screen; headlines and charts become clean, modern colour cards; new cut-outs are painted in colour." },
  { key: "vox", label: "Vox motion & story", demo: "/demos/vox.jpg",
    alt: "A headline with a marker sweep, a quote with a name card, a zoom transition mid-way, and a modern chart",
    what: "The Vox recipe on top: the story opens on a hook and asks one central question in the first 30 seconds, answers it simply, adds the mechanism and why it matters now, and ends with a recap. On screen, one shot flows into the next (a pan across the board, or a zoom through it), nothing ever sits still, graphics move 'on threes' like classic Vox animation, quoted people get a name card, and headlines get a marker sweep." },
] as const;

function DocumentaryEdit({ value, onChange, era, onEra, vox, onVox }: { value: string; onChange: (v: string) => void; era: boolean; onEra: (v: boolean) => void; vox: boolean; onVox: (v: boolean) => void }) {
  return (
    <div className="border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-4"><span className="label text-muted">How it's edited</span>
        <a href="/studio/skills" target="_blank" rel="noreferrer" className="label text-ink hover:text-accent">See every skill in motion ↗</a></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {DOC_EDIT.map(([share, name, what]) => (
          <div key={name} className="border-t border-line pt-2">
            <div className="flex items-baseline gap-2"><span className="font-mono text-[13px] text-accent">{share}</span><span className="text-[14px] text-ink">{name}</span></div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{what}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        No camera movement: each piece lands once and holds while the narrator reads. Every number on screen is checked against
        the narration. Chapters open on a paper collage background with a title card.
      </p>
      <span className="label mt-5 block text-muted">Edit</span>
      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        {EDITS.map((e) => (
          <button key={e.key} type="button" onClick={() => onChange(e.key)} aria-pressed={value === e.key}
            className={`border p-3 text-left transition-colors ${value === e.key ? "border-ink" : "border-line hover:border-ink/50"}`}>
            <img src={e.demo} alt={`${e.label}: a chart and a title card in this edit`} className="aspect-[32/9] w-full border border-line object-cover" />
            <div className="mt-2 flex items-center gap-2">
              <span className={`size-2.5 border ${value === e.key ? "border-accent bg-accent" : "border-line"}`} />
              <span className="text-[14px] text-ink">{e.label}</span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{e.what}</p>
          </button>
        ))}
      </div>
      <span className="label mt-5 block text-muted">Skills that stack on any edit</span>
      <div className="mt-2 space-y-3">
        {EXTRAS.map((x) => {
          const on = x.key === "era" ? era : vox;
          return (
            <button key={x.key} type="button" onClick={() => (x.key === "era" ? onEra(!era) : onVox(!vox))} aria-pressed={on}
              className={`grid w-full gap-4 border p-3 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] ${on ? "border-ink" : "border-line hover:border-ink/50"}`}>
              <img src={x.demo} alt={x.alt} className="aspect-video w-full border border-line object-cover" />
              <div>
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 border ${on ? "border-accent bg-accent" : "border-line"}`} />
                  <span className="text-[14px] text-ink">{x.label}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{x.what}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NewFilm() {
  const { data: opt } = useApi<any>("/studio/options");
  const { data: lessons } = useApi<any[]>("/studio/lessons");
  const { data: voiceData } = useApi<any>("/studio/voices");
  const router = useRouter();
  const toast = useToast();

  const [topic, setTopic] = useState("");
  const [lessonId, setLessonId] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [audience, setAudience] = useState("Indian competitive-exam aspirants");
  const [narration, setNarration] = useState("documentary");
  const [roles, setRoles] = useState<Role[]>([]);
  const [storyMode, setStoryMode] = useState("none");
  const [premise, setPremise] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [otherLang, setOtherLang] = useState("");
  const subtitles = "off";
  const [secondLang, setSecondLang] = useState("");
  const [cinematic, setCinematic] = useState("few");
  const [accent, setAccent] = useState("Indian English");
  const [style, setStyle] = useState("archival");
  const [regions, setRegions] = useState("India");
  const [edit, setEdit] = useState("board");
  const [questions, setQuestions] = useState("");
  const [reviewResearch, setReviewResearch] = useState(true);
  const [eraLook, setEraLook] = useState(false);
  const [vox, setVox] = useState(false);
  const [looks, setLooks] = useState<string[]>([]);
  const [direction, setDirection] = useState("");
  const [diagrams, setDiagrams] = useState(true);
  const [tone, setTone] = useState("");
  const [pace, setPace] = useState("normal");
  const [minutes, setMinutes] = useState(10);
  const [instructions, setInstructions] = useState("");
  const [facts, setFacts] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  // prefill from the brainstorm chat (/studio/new): ?topic=…&minutes=…&language=…&tone=…&audience=…
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("topic")) setTopic(q.get("topic")!);
    if (Number(q.get("minutes")) > 0) setMinutes(Number(q.get("minutes")));
    if (q.get("tone")) setTone(q.get("tone")!);
    if (q.get("audience")) setAudience(q.get("audience")!);
    const l = q.get("language");
    if (l) { if (["Hinglish", "Hindi", "English"].includes(l)) setLanguage(l); else { setLanguage("Other"); setOtherLang(l); } }
  }, []);

  const preset = opt?.narrations.find((n: any) => n.key === narration);
  // choosing a narration loads its roles and story mode; everything stays editable afterwards
  useEffect(() => {
    if (!preset) return;
    setRoles(preset.roles.map((r: any) => ({ name: r.name, style: r.style, voice: r.voice, look: r.look })));
    setStoryMode(preset.story_mode ?? "none");
  }, [preset?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => {
    const g: Record<string, any[]> = {};
    (lessons ?? []).forEach((l) => (g[l.subject] ??= []).push(l));
    return g;
  }, [lessons]);
  const sample = (v: string) => voiceData?.voices?.find((x: any) => x.name === v)?.samples?.[voiceData.models[0]] ?? null;
  const setRole = (i: number, patch: Partial<Role>) => setRoles(roles.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const lang = language === "Other" ? otherLang.trim() || "English" : language;

  const make = async () => {
    setBusy(true);
    try {
      const f = await post("/studio/films", {
        topic, lesson_id: lessonId || null, source_text: notes, audience, narration, roles, story_mode: storyMode, premise,
        language: lang, subtitles, second_language: secondLang, cinematic, accent, style, regions, edit, questions, review_research: reviewResearch, era_look: eraLook, vox, looks, visual_direction: direction, diagrams, tone, pace, minutes, instructions, facts,
      });
      router.push(`/studio/${f.id}`);
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't start the film", body: e.message });
      setBusy(false);
    }
  };

  if (!opt) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;
  return (
    <div>
      <Link href="/studio/new" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Back to the chat</Link>
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">New film</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-muted">Everything is optional except what the film is about. Defaults are sensible; change only what you care about.</p>

      <div className="mt-8">
        <Section n="00" title="Kind of film" hint="Archival documentary: the agent researches first, uses only verified facts from real sources, and shows real archival images, documents, headlines and data. Illustrated: painted scenes and a presenter.">
          <Chips items={[{ key: "archival", label: "Archival documentary (research-first)" }, { key: "illustrated", label: "Illustrated" }]} value={style} onChange={setStyle} />
          {style === "archival" && <input value={regions} onChange={(e) => setRegions(e.target.value)} className={inputCls} placeholder="Regions to cover alongside the world view, e.g. India" />}
          {style === "archival" && <DocumentaryEdit value={edit} onChange={setEdit} era={eraLook} onEra={setEraLook} vox={vox} onVox={setVox} />}
        </Section>

        <Section n="01" title="What it's about" hint="A topic in your words. Add your own notes as source material, or leave both empty and the AI writes from its own general knowledge, using only well-known facts.">
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} className={inputCls} placeholder="e.g. How the internet actually reaches your phone" />
          {Object.keys(groups).length > 0 && <select value={lessonId} onChange={(e) => setLessonId(Number(e.target.value) || "")} className={inputCls}>
            <option value="">No lesson as source</option>
            {Object.entries(groups).map(([sub, ls]) => <optgroup key={sub} label={sub}>{ls.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</optgroup>)}
          </select>}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Or paste your own notes / source text (optional). Any links here are opened and read by the agent." />
          <input value={audience} onChange={(e) => setAudience(e.target.value)} className={inputCls} placeholder="Audience" />
          {style === "archival" && <>
            <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={3} className={inputCls}
              placeholder="Questions the film must answer and sides it must cover (optional), e.g. Why does the US restrict chips to China? What does Anthropic say, and what do its critics say?" />
            <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" checked={reviewResearch} onChange={(e) => setReviewResearch(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              Pause after research so I can read and approve it before the script is written</label>
            <HowItResearches />
          </>}
        </Section>

        <Section n="02" title="Who tells it" hint="Pick a narration, then edit any role: its name, persona and voice. Add or remove roles freely.">
          <Chips items={opt.narrations.map((n: any) => ({ key: n.key, label: n.label }))} value={narration} onChange={setNarration} />
          {preset && <p className="text-[14px] text-muted">{preset.description}</p>}
          <div className="space-y-3">
            {roles.map((r, i) => (
              <div key={i} className="grid gap-3 border border-line bg-surface p-4 sm:grid-cols-[160px_1fr_220px_auto]">
                <input value={r.name} onChange={(e) => setRole(i, { name: e.target.value })} className={inputCls} placeholder="Name" />
                <input value={r.style} onChange={(e) => setRole(i, { style: e.target.value })} className={inputCls} placeholder="Persona: who they are and how they talk" />
                <div className="flex gap-2">
                  <select value={r.voice} onChange={(e) => setRole(i, { voice: e.target.value })} className={inputCls}>
                    {(voiceData?.voices ?? []).map((v: any) => <option key={v.name} value={v.name}>{v.name} · {v.character}</option>)}
                  </select>
                  <PlayButton url={sample(r.voice)} className="size-10" />
                </div>
                <button onClick={() => setRoles(roles.filter((_, j) => j !== i))} disabled={roles.length < 2} aria-label="Remove role"
                  className="grid size-10 place-items-center border border-line text-muted hover:border-ink hover:text-accent disabled:opacity-30"><X className="size-4" /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => setRoles([...roles, { name: `Voice ${roles.length + 1}`, style: "", voice: "Achird" }])}>Add a role</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAll(!showAll)}>{showAll ? "Hide" : "Compare all 30 voices"}</Button>
            </div>
            {showAll && <div className="max-h-[480px] overflow-y-auto border border-line p-4">
              <VoicePicker roles={roles.map((r) => r.name)} value={Object.fromEntries(roles.map((r) => [r.name, r.voice]))}
                onChange={(v) => setRoles(roles.map((r) => ({ ...r, voice: v[r.name] ?? r.voice })))} />
            </div>}
          </div>
        </Section>

        <Section n="03" title="Story" hint="Where a story appears. Describe the world in your own words: any genre, any vibe. Existing franchises become an original world with that vibe.">
          <Chips items={opt.story_modes} value={storyMode} onChange={setStoryMode} />
          {storyMode !== "none" && (
            <textarea value={premise} onChange={(e) => setPremise(e.target.value)} rows={3} className={inputCls}
              placeholder="e.g. a rain-soaked cyber city where data is smuggled across rooftops… leave empty and the agent invents a world" />
          )}
        </Section>

        <Section n="04" title="Language" hint="The language the film is spoken in. No captions are burned in; YouTube adds them.">
          <Chips items={[...opt.languages, "Other"].map((l: string) => ({ key: l, label: l }))} value={language} onChange={setLanguage} />
          {language === "Other" && <input value={otherLang} onChange={(e) => setOtherLang(e.target.value)} className={inputCls} placeholder="Any language: Tamil, Bengali, Marathi, Spanish…" />}
          <div>
            <span className="label text-muted">Accent</span>
            <div className="mt-2"><Chips items={[{ key: "Indian English", label: "Indian" }, { key: "", label: "Voice's own" }, { key: "British English", label: "British" }, { key: "American English", label: "American" }]} value={accent} onChange={setAccent} /></div>
          </div>
          <div>
            <span className="label text-muted">Second audio track</span>
            <p className="mt-1 text-[13px] text-muted">Same pictures, dubbed narration, exported as its own audio file for YouTube's multi-language audio.</p>
            <div className="mt-2"><Chips items={[{ key: "", label: "None" }, ...opt.languages.filter((l: string) => l !== lang).map((l: string) => ({ key: l, label: l }))]} value={secondLang} onChange={setSecondLang} /></div>
          </div>
        </Section>

        <Section n="05" title="Look" hint="Which image styles scenes may use (none selected = the agent picks per scene), and your own visual direction.">
          <div className="flex flex-wrap gap-2">
            {opt.looks.map((l: any) => <Chip key={l.key} active={looks.includes(l.key)} onClick={() => setLooks(looks.includes(l.key) ? looks.filter((x) => x !== l.key) : [...looks, l.key])}>{l.label}</Chip>)}
          </div>
          <textarea value={direction} onChange={(e) => setDirection(e.target.value)} rows={2} className={inputCls}
            placeholder="e.g. archival photos for history, blueprints for how things are wired, warm sepia tones" />
          <div>
            <span className="label text-muted">Motion</span>
            <p className="mt-1 text-[13px] text-muted">A director picks per scene: a cinematic video shot (Veo), a parallax move, or a camera move.
              {!opt.veo_ready && " Veo isn't connected yet, so video shots become parallax until it is."}</p>
            <div className="mt-2"><Chips items={opt.cinematic} value={cinematic} onChange={setCinematic} /></div>
          </div>
          <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" checked={diagrams} onChange={(e) => setDiagrams(e.target.checked)} className="size-4 accent-[var(--accent)]" /> Animated network diagrams when relevant</label>
        </Section>

        <Section n="06" title="Tone, pace, length">
          <div className="flex flex-wrap gap-2">
            {opt.tones.map((t: string) => <Chip key={t} active={tone === t} onClick={() => setTone(tone === t ? "" : t)}>{t}</Chip>)}
          </div>
          <input value={opt.tones.includes(tone) ? "" : tone} onChange={(e) => setTone(e.target.value)} className={inputCls} placeholder="…or describe the tone yourself" />
          <div className="flex flex-wrap gap-8">
            <div><span className="label text-muted">Pace</span><div className="mt-2"><Chips items={opt.paces} value={pace} onChange={setPace} /></div></div>
            <div><span className="label text-muted">Length</span><div className="mt-2"><Chips items={[3, 5, 10, 15, 20, 30, 40].map((m) => ({ key: String(m), label: `${m} min` }))} value={String(minutes)} onChange={(v) => setMinutes(Number(v))} /></div></div>
          </div>
        </Section>

        <Section n="07" title="Anything else" hint="Free instructions for the writer, and facts it may cite (dates, names, numbers you have verified).">
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className={inputCls} placeholder="e.g. end every act with a one-line recap; mention Indian examples" />
          <textarea value={facts} onChange={(e) => setFacts(e.target.value)} rows={3} className={inputCls} placeholder="Verified facts the film may cite, with links (optional). Every link is opened and read." />
        </Section>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-4 border-t border-line bg-bg/95 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
        <span className="label text-muted">{preset?.label} · {lang} · {minutes} min · {roles.map((r) => `${r.name} (${r.voice})`).join(", ")}</span>
        <Button size="lg" onClick={make} loading={busy} disabled={!topic.trim() && !lessonId && !notes.trim()}>Make the film</Button>
      </div>
    </div>
  );
}
