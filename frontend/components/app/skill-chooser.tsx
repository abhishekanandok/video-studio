"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { LIME } from "./kit";
import { useApi } from "@/lib/api";

/* The V1 skill choices (backend/app/api/vskills.py): ONE built-in skill (SKILL 01, the Board explainer) plus the
   creator's own, each with its capabilities (captions, numbers, flows, maps, stickers) switched on or off in its look,
   and its settings (text on screen, pictures, motion, background, transitions, pace). Used on a skill's page and in
   the "How should it look?" step before a video starts. */

export type Look = { text: string; background: string; transition: string; show: string[]; pace: string; language: string; paper: string; background_image: string; notes: string;
  sticker_place: string; sticker_size: string; caption_pos: string; stage: string; purpose: string; picture_style: string; motion: string };
export type Question = { key: keyof Look; ask: string; multi?: boolean; options: [string, string][] };
export type Capability = { id: string; name: string; about: string; when: string; shows: string[]; ready: boolean; moment: boolean; on?: boolean };
export type VSkill = { id: string; no: number; kind: string; name: string; about: string; includes?: string[]; sample: string[]; ready: boolean; samples?: string[];
  renderer?: "scenes" | "motion"; extends?: string; picture_style?: string; sample_topic?: string;
  describe?: string; look?: Look; capabilities?: Capability[]; topic?: string; how_to_show?: { note: string; searched: boolean; sources: string[] } };
export type VSkills = { skills: VSkill[]; cards: VSkill[]; capabilities: Capability[]; moments: string[]; questions: Question[]; layout: Question[]; look: Look; custom: VSkill[] };
export const skillNo = (n: number) => `SKILL ${String(n).padStart(2, "0")}`;

/** is a capability on in this look (captions: some text on screen; the rest: in look.show) */
export const capOn = (look: Look, id: string) => (id === "captions" ? look.text !== "none" : look.show.includes(id));
export function setCap(look: Look, id: string, on: boolean): Look {
  if (id === "captions") return { ...look, text: on ? (look.text === "none" ? "key_words" : look.text) : "none" };
  return { ...look, show: on ? [...look.show.filter((x) => x !== id), id] : look.show.filter((x) => x !== id) };
}

export function SkillQuestions({ questions, look, onChange, extras = true }: { questions: Question[]; look: Look; onChange: (l: Look) => void; extras?: boolean }) {
  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.key}>
          <div className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-[#8a857f]">{q.ask}{q.multi ? " · pick any" : ""}</div>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map(([v, label]) => {
              const cur = look[q.key];
              const on = q.multi ? (cur as string[]).includes(v) : cur === v;
              const set = () => onChange({ ...look, [q.key]: q.multi ? (on ? (cur as string[]).filter((x) => x !== v) : [...(cur as string[]), v]) : v });
              return (
                <button key={v} type="button" onClick={set}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${on ? "border-[#1f1c1b] bg-[#1f1c1b] text-white" : "border-[#e2e1da] bg-white text-[#3a3633] hover:border-[#cfe9a8]"}`}>
                  {on && <Check className="size-3.5" strokeWidth={3} style={{ color: LIME }} />}{label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {extras && look.background === "own" && (
        <input value={look.background_image} onChange={(e) => onChange({ ...look, background_image: e.target.value })} placeholder="Link to your background image (your logo, your classroom board…)"
          className="w-full rounded-[12px] border border-[#e2e1da] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#a6f04a]" />
      )}
      {extras && <textarea value={look.notes} onChange={(e) => onChange({ ...look, notes: e.target.value })} rows={2}
        placeholder="Anything else, in your words: “use my school colours”, “a meme after every surprising fact”, “bigger text”…"
        className="w-full resize-none rounded-[12px] border border-[#e2e1da] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#a6f04a]" />}
    </div>
  );
}

/** the skill's capabilities as switches: what each puts on screen, on or off */
export function CapabilityToggles({ caps, look, onChange, detail = false }: { caps: Capability[]; look: Look; onChange: (l: Look) => void; detail?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {caps.map((c) => {
        const on = capOn(look, c.id);
        return (
          <button key={c.id} type="button" role="switch" aria-checked={on} aria-label={`${c.name}: ${on ? "on" : "off"}`} onClick={() => onChange(setCap(look, c.id, !on))}
            className={`flex items-start gap-3 rounded-[14px] border p-3 text-left transition-colors ${on ? "border-[#1f1c1b] bg-[#fbfdf6]" : "border-[#ecebe5] bg-white hover:border-[#cfe9a8]"}`}>
            <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-[#1f1c1b] px-0.5 transition-colors ${on ? "justify-end bg-[#a6f04a]" : "justify-start bg-[#ecebe5]"}`}>
              <span className="size-3 rounded-full bg-[#1f1c1b]" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[15px] font-bold">{c.name}{!c.ready && <span className="rounded-full bg-[#f6f39a] px-2 py-0.5 text-[11px] font-bold">BUILDING</span>}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-[#8a857f]">{detail ? c.about : <>On: {c.when}</>}</span>
              {detail && <span className="mt-1.5 block text-[13px] leading-snug text-[#5f5b57]"><b>Used on:</b> {c.when}</span>}
              {detail && <span className="mt-1 block space-y-0.5">{c.shows.map((x) => <span key={x} className="block text-[13px] leading-snug text-[#3a3633]">• {x}</span>)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** the settings a renderer actually follows: the board draws every one; the motion director takes the look's brief,
    so layout, background and transitions are its own (it designs them per shot) */
export const questionsFor = (qs: Question[], renderer: string | undefined, builtIn: boolean) =>
  qs.filter((q) => (renderer === "motion" ? ["purpose", "picture_style", "motion", "text", "show", "pace"].includes(q.key) : true) && !(builtIn && q.key === "picture_style"));

/** the "How should it look?" step before a video starts: which skill (SKILL 01 or one of the creator's), its
    capabilities on or off, and its choices, prefilled from that skill; what they choose travels with the video
    (config "skills": {"moments": the moment capabilities on, "look": {...}}) */
export function LookStep({ onChange }: { onChange: (v: { moments: string[]; look: Look; skill: string }) => void }) {
  const { data } = useApi<VSkills>("/vskills");
  const [skill, setSkill] = useState("board");
  const [look, setLook] = useState<Look | null>(null);
  useEffect(() => { if (data && !look) setLook(data.cards.find((c) => c.id === "board")?.look ?? data.look); }, [data, look]);
  useEffect(() => { if (look && data) onChange({ moments: data.moments.filter((m) => look.show.includes(m)), look, skill }); }, [look, data, skill, onChange]);
  if (!data || !look) return <div className="text-[14px] text-[#8a857f]">Loading your skills…</div>;
  const looks = data.cards.filter((c) => c.kind === "look");
  return (
    <div className="space-y-5">
      {looks.length > 1 && (
        <div>
          <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-[#8a857f]">Skill</div>
          <div className="flex flex-wrap gap-1.5">{looks.map((c) => (
            <button key={c.id} type="button" onClick={() => { setSkill(c.id); if (c.look) setLook(c.look); }}
              className={`rounded-full border px-3.5 py-1.5 text-[14px] font-semibold ${skill === c.id ? "border-[#1f1c1b] bg-[#1f1c1b] text-white" : "border-[#e2e1da] bg-white"}`}>
              <span className="mr-1.5 font-mono text-[11px] opacity-70">{skillNo(c.no)}</span>{c.name}
            </button>
          ))}</div>
        </div>
      )}
      <div>
        <div className="mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-[#8a857f]">What it puts on screen · switch any off for this video</div>
        <CapabilityToggles caps={data.capabilities} look={look} onChange={setLook} />
      </div>
      <SkillQuestions questions={questionsFor(data.questions, looks.find((c) => c.id === skill)?.renderer, !skill.startsWith("custom"))} look={look} onChange={setLook} />
    </div>
  );
}
