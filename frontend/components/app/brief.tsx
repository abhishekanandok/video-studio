"use client";

/* The film brief: everything the creator decides about how the film should feel, beyond its topic and look: the kind
   of film, the pace, the tone, the cold open, the chapters, the transitions (100, lib/transitions.ts, previewed here
   exactly as the film engine draws them), the cinematic shots, the music and when it plays, the real maps, photos and
   logos, and the dub. Sent with the topic to POST /films as `brief` (backend films_api.py clean_brief) and kept in the
   film's job.json for whoever draws it. THE LAST CALL v4 is what these defaults make. */

import { Check, ChevronDown, Search, Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TRANSITIONS, framesOf, transitionStyle } from "@/lib/transitions";

export type FilmBrief = {
  kind: "documentary" | "explainer" | "story" | "fiction";
  pace: 1 | 1.15 | 1.25;
  tone: { presets: string[]; words: string };
  cold_open: { on: boolean; style: "3d-night" | "drawn" };
  chapters: { mode: "auto" | "fixed"; count: number; handoff: boolean };
  transitions: { mode: "auto" | "pick"; picks: string[] };
  cinematic: { count: number };
  music: { style: string; moments: string[]; loudness: "quiet" | "clear" | "loud" };
  maps: boolean; photos: boolean; logos: boolean;
  dub: "none" | "hinglish" | "english";
};

/** the THE LAST CALL v4 recipe */
export const DEFAULT_BRIEF: FilmBrief = {
  kind: "documentary", pace: 1.15, tone: { presets: ["curious", "grave"], words: "" },
  cold_open: { on: true, style: "3d-night" }, chapters: { mode: "auto", count: 6, handoff: true },
  transitions: { mode: "auto", picks: [] }, cinematic: { count: 3 },
  music: { style: "documentary pulse", moments: ["cold open", "chapter titles", "big numbers", "the closing question"], loudness: "clear" },
  maps: true, photos: true, logos: true, dub: "none",
};

const KINDS: [FilmBrief["kind"], string, string][] = [
  ["documentary", "Documentary", "Chapters that hand off to each other, real maps and photos, cinematic shots (THE LAST CALL)"],
  ["explainer", "Explainer", "One idea at a time, clear and quick"],
  ["story", "Story film", "An arc in painted worlds, shot with a camera (festivals, history, folk tales)"],
  ["fiction", "Fiction", "An invented story, every scene drawn by hand: the most drawing, the slowest to make"],
];
const TONES = ["curious", "grave", "hopeful", "angry", "warm", "urgent", "playful", "calm"];
const MUSIC = ["none", "soft pad", "documentary pulse", "stings only", "orchestral", "ambient", "electronic"];
const MOMENTS = ["cold open", "chapter titles", "big numbers", "cinematic shots", "the closing question", "the end"];

const field = "rounded-[12px] border border-[#e2e1da] bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-[#a6f04a]";
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors ${on ? "border-[#1f1c1b] bg-[#1f1c1b] text-white" : "border-[#e2e1da] bg-white text-[#5f5b57] hover:border-[#a6f04a]"}`;
const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <div className="rounded-[16px] border border-[#ecebe5] bg-[#fbfbf8] p-4">
    <div className="mb-2.5"><div className="text-[14px] font-bold">{title}</div>{hint && <div className="text-[12.5px] text-[#8a857f]">{hint}</div>}</div>
    {children}
  </div>;
}

export function BriefForm({ brief, setBrief, minutes, setMinutes }: { brief: FilmBrief; setBrief: (b: FilmBrief) => void; minutes: number; setMinutes: (m: number) => void }) {
  const set = <K extends keyof FilmBrief>(k: K, v: FilmBrief[K]) => setBrief({ ...brief, [k]: v });
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <Section title="The film" hint="What kind of film, how fast, how long">
        <div className="grid gap-2 sm:grid-cols-2">
          {KINDS.map(([k, name, about]) => (
            <button key={k} type="button" onClick={() => set("kind", k)} title={about}
              className={`rounded-[12px] border p-2.5 text-left ${brief.kind === k ? "border-[#1f1c1b] bg-white shadow-[2px_2px_0_#1f1c1b]" : "border-[#e2e1da] bg-white hover:border-[#a6f04a]"}`}>
              <div className="text-[14px] font-bold">{name}</div><div className="text-[12px] leading-snug text-[#8a857f]">{about}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-[#5f5b57]">Pace</span>
          {([1, 1.15, 1.25] as const).map((p) => <button key={p} type="button" onClick={() => set("pace", p)} className={chip(brief.pace === p)}>{p === 1 ? "Natural" : `${p}×`}</button>)}
          <span className="ml-2 text-[13px] font-semibold text-[#5f5b57]">Length</span>
          <input type="number" min={0.5} max={30} step={0.5} value={minutes} onChange={(e) => setMinutes(Math.max(0.5, Math.min(30, Number(e.target.value) || 1)))} className={`${field} w-[86px] py-1.5`} />
          <span className="text-[13px] text-[#8a857f]">minutes</span>
        </div>
      </Section>

      <Section title="Tone" hint="How it should feel; pick any, add your own words">
        <div className="flex flex-wrap gap-1.5">{TONES.map((t) => <button key={t} type="button" onClick={() => set("tone", { ...brief.tone, presets: toggle(brief.tone.presets, t).slice(-4) })} className={chip(brief.tone.presets.includes(t))}>{t}</button>)}</div>
        <input value={brief.tone.words} onChange={(e) => set("tone", { ...brief.tone, words: e.target.value })} placeholder="In your words: e.g. quiet, then angry; never preachy" className={`${field} mt-2.5 w-full`} />
      </Section>

      <Section title="Cold open and chapters" hint="How it opens, how it is built">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => set("cold_open", { ...brief.cold_open, on: !brief.cold_open.on })} className={chip(brief.cold_open.on)}>{brief.cold_open.on ? "Cold open: on" : "Cold open: off"}</button>
          {brief.cold_open.on && <>
            <button type="button" onClick={() => set("cold_open", { ...brief.cold_open, style: "3d-night" })} className={chip(brief.cold_open.style === "3d-night")}>3D cinematic (like THE LAST CALL)</button>
            <button type="button" onClick={() => set("cold_open", { ...brief.cold_open, style: "drawn" })} className={chip(brief.cold_open.style === "drawn")}>Drawn in the look</button>
          </>}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => set("chapters", { ...brief.chapters, mode: "auto" })} className={chip(brief.chapters.mode === "auto")}>Chapters: auto</button>
          <button type="button" onClick={() => set("chapters", { ...brief.chapters, mode: "fixed" })} className={chip(brief.chapters.mode === "fixed")}>Set the number</button>
          {brief.chapters.mode === "fixed" && <input type="number" min={2} max={15} value={brief.chapters.count} onChange={(e) => set("chapters", { ...brief.chapters, count: Math.max(2, Math.min(15, Number(e.target.value) || 2)) })} className={`${field} w-[70px] py-1.5`} />}
          <button type="button" onClick={() => set("chapters", { ...brief.chapters, handoff: !brief.chapters.handoff })} className={chip(brief.chapters.handoff)} title="Each chapter ends on the question the next one answers">Hand-off line at each chapter end</button>
        </div>
      </Section>

      <Section title="Cinematic shots" hint="3D shots made like the cold open, where the scale matters">
        <div className="flex flex-wrap items-center gap-2">
          <input type="range" min={0} max={20} value={brief.cinematic.count} onChange={(e) => set("cinematic", { count: Number(e.target.value) })} className="w-[220px] accent-[#1f1c1b]" />
          <span className="text-[14px] font-bold">{brief.cinematic.count === 0 ? "None" : `${brief.cinematic.count} shot${brief.cinematic.count > 1 ? "s" : ""}`}</span>
        </div>
        <p className="mt-1.5 text-[12.5px] text-[#8a857f]">Placed where the script needs scale; each new kind of shot is drawn once and joins the library.</p>
      </Section>

      <Section title="Music and sound" hint="What plays, when, and how loud">
        <select value={brief.music.style} onChange={(e) => set("music", { ...brief.music, style: e.target.value })} className={`${field} w-full font-semibold`}>
          {MUSIC.map((m) => <option key={m} value={m}>Music: {m}</option>)}
        </select>
        {brief.music.style !== "none" && <>
          <div className="mt-2.5 flex flex-wrap gap-1.5">{MOMENTS.map((m) => <button key={m} type="button" onClick={() => set("music", { ...brief.music, moments: toggle(brief.music.moments, m) })} className={chip(brief.music.moments.includes(m))}>{m}</button>)}</div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5"><span className="text-[13px] font-semibold text-[#5f5b57]">Loudness</span>
            {(["quiet", "clear", "loud"] as const).map((l) => <button key={l} type="button" onClick={() => set("music", { ...brief.music, loudness: l })} className={chip(brief.music.loudness === l)}>{l}</button>)}</div>
        </>}
      </Section>

      <Section title="Real world, logos, languages" hint="What real material goes in">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => set("maps", !brief.maps)} className={chip(brief.maps)}>Real maps</button>
          <button type="button" onClick={() => set("photos", !brief.photos)} className={chip(brief.photos)}>Real photos (credited)</button>
          <button type="button" onClick={() => set("logos", !brief.logos)} className={chip(brief.logos)}>Logos when a company is named</button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5"><span className="text-[13px] font-semibold text-[#5f5b57]">Second voice</span>
          {([["none", "None"], ["hinglish", "Hinglish dub"], ["english", "English dub"]] as const).map(([v, l]) => <button key={v} type="button" onClick={() => set("dub", v)} className={chip(brief.dub === v)}>{l}</button>)}</div>
      </Section>

      <div className="lg:col-span-2"><TransitionPicker value={brief.transitions} onChange={(v) => set("transitions", v)} /></div>
    </div>
  );
}

/** one transition, shown as the film engine draws it: B arrives over A; it plays while the pointer is on it */
function Preview({ id, playing }: { id: string; playing: boolean }) {
  const n = framesOf(id), [f, setF] = useState(n);
  useEffect(() => {
    if (!playing) { setF(n); return; }
    let raf = 0, t0 = performance.now();
    const loop = (now: number) => { const fr = Math.floor(((now - t0) / 1000) * 30) % (n + 24); setF(Math.min(fr, n)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, n]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-[8px] bg-[#1f1c1b]">
      <div className="absolute inset-0 grid place-items-center text-[13px] font-bold text-white/40">A</div>
      <div className="absolute inset-0 grid place-items-center bg-[#a6f04a] text-[13px] font-bold text-[#1f1c1b]" style={transitionStyle(id, f) as React.CSSProperties}>B</div>
    </div>
  );
}

export function TransitionPicker({ value, onChange }: { value: FilmBrief["transitions"]; onChange: (v: FilmBrief["transitions"]) => void }) {
  const [open, setOpen] = useState(false), [q, setQ] = useState(""), [hover, setHover] = useState("");
  const families = useMemo(() => {
    const m = new Map<string, typeof TRANSITIONS>();
    for (const t of TRANSITIONS) if (!q || `${t.name} ${t.family}`.toLowerCase().includes(q.toLowerCase())) m.set(t.family, [...(m.get(t.family) ?? []), t]);
    return [...m];
  }, [q]);
  return (
    <Section title={`Transitions · ${TRANSITIONS.length} to choose from`} hint="Auto varies them chapter by chapter; or pick the ones this film may use (hover to preview)">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onChange({ ...value, mode: "auto" })} className={chip(value.mode === "auto")}><Shuffle className="mr-1 inline size-3.5" />Auto</button>
        <button type="button" onClick={() => { onChange({ ...value, mode: "pick" }); setOpen(true); }} className={chip(value.mode === "pick")}>Pick{value.picks.length ? ` (${value.picks.length})` : ""}</button>
        <button type="button" onClick={() => setOpen(!open)} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[#5f5b57] hover:underline">
          {open ? "Hide" : "Show"} all {TRANSITIONS.length}<ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>
      </div>
      {open && <>
        <div className="relative mt-3"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#b5b1aa]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: whip, iris, page, blinds…" className={`${field} w-full pl-9`} /></div>
        <div className="mt-3 max-h-[460px] space-y-4 overflow-y-auto pr-1">
          {families.map(([fam, ts]) => (
            <div key={fam}>
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8a857f]">{fam}</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                {ts.map((t) => { const on = value.picks.includes(t.id);
                  return <button key={t.id} type="button" title={t.name} onMouseEnter={() => setHover(t.id)} onMouseLeave={() => setHover("")}
                    onClick={() => onChange({ mode: "pick", picks: toggle(value.picks, t.id) })}
                    className={`relative rounded-[10px] border p-1 text-left ${on ? "border-[#1f1c1b] shadow-[2px_2px_0_#1f1c1b]" : "border-[#e2e1da] hover:border-[#a6f04a]"} bg-white`}>
                    <Preview id={t.id} playing={hover === t.id} />
                    <div className="mt-1 truncate px-0.5 text-[11.5px] font-semibold">{t.name}</div>
                    {on && <Check className="absolute right-1.5 top-1.5 size-4 rounded-full bg-[#a6f04a] p-0.5" />}
                  </button>; })}
              </div>
            </div>
          ))}
        </div>
      </>}
    </Section>
  );
}
