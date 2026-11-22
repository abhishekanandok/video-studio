"use client";

import { Check } from "lucide-react";
import { MEDIA } from "@/components/studio";
import { cx } from "@/components/ui";
import { describeCanvas } from "@/lib/skills";

/** A slide skill as the real thing: its sample slide, as rendered. */
export function SkillPreview({ s, className }: { s: any; className?: string }) {
  const img = s?.samples?.[0];
  if (!img) return <div className={cx("grid aspect-video place-items-center bg-surface text-[12px] text-muted", className)}>
    {s?.state === "working" ? "The agent is making this skill…" : "No sample yet"}</div>;
  return <img src={`${MEDIA}${img}`} alt="" className={cx("aspect-video w-full object-cover", className)} />;
}

/** A choosable skill: preview, name, what it does; selected = yellow ring and a tick. */
export function SkillChoice({ s, selected, onClick, order }: { s: any; selected: boolean; onClick: () => void; order?: number }) {
  return (
    <button type="button" onClick={onClick}
      className={cx("relative border text-left transition-colors", selected ? "border-ink ring-2 ring-[#ffd60a]" : "border-line hover:border-ink")}>
      <SkillPreview s={s} />
      {selected && <span className="absolute left-2 top-2 grid size-6 place-items-center bg-[#ffd60a] text-[12px] font-bold text-[#141414]">{order ?? <Check className="size-4" />}</span>}
      <div className="px-3 py-2">
        <div className="text-[14px] font-medium">{s.name}</div>
        <div className="label mt-0.5 text-muted">{[describeCanvas(s.canvas), s.look?.interlude ? (s.look.interlude_mode === "until_next" ? "breaks until next bullet" : "picture breaks") : null].filter(Boolean).join(" · ")}</div>
      </div>
    </button>
  );
}

/** The built-in look, as a card like the others. */
export function ClassicChoice({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cx("border text-left transition-colors", selected ? "border-ink ring-2 ring-[#ffd60a]" : "border-line hover:border-ink")}>
      <div className="grid aspect-video place-items-center bg-[#f2f0ea] text-[12px] text-[#5b5b5b]">Grid paper and the paper card</div>
      <div className="px-3 py-2"><div className="text-[14px] font-medium">Paper (classic)</div><div className="label mt-0.5 text-muted">Built in</div></div>
    </button>
  );
}
