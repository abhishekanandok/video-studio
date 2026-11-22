"use client";

import { MEDIA } from "./studio";
import { cx } from "./ui";

/* Exam notes films: shared pieces for the /exam pages. The slide preview mirrors the film's card (video/src/notes/Notes.tsx)
   so a scene can be read the moment its slide exists, long before it is rendered. */

export type NBullet = { text: string; key?: string[]; green?: string[] };
export type NScene = {
  index: number; kind: "hook" | "slide"; video: string | null; voiced: boolean;
  kicker?: string; headline?: string; section?: string; title?: string; pages?: string | null; bullets?: NBullet[];
  picture?: string; image?: string | null; credit?: string;
  lines: { speaker: string; speech: string }[]; bullet_at?: number[];
  explain?: { speaker: string; speech: string }[]; animated?: boolean;
};

export const STAGES: { key: string; label: string }[] = [
  { key: "extract", label: "Read the book" },
  { key: "slides", label: "Slides" },
  { key: "images", label: "Pictures" },
  { key: "scripts", label: "Narration" },
  { key: "visuals", label: "Animations" },
  { key: "voices", label: "Voices" },
  { key: "render", label: "Scenes rendered" },
  { key: "join", label: "Film joined" },
];

/** Same split as the film: highlighted terms (yellow = key term, green = element / formula / example) and plain text. */
const wc = (ch?: string) => !!ch && /[\p{L}\p{N}\p{M}]/u.test(ch);

export function segments(text: string, key: string[] = [], green: string[] = []) {
  const marks: { s: number; e: number; c: "y" | "g" }[] = [];
  const terms = [...key.map((t) => ({ t, c: "y" as const })), ...green.map((t) => ({ t, c: "g" as const }))].sort((a, b) => b.t.length - a.t.length);
  const low = text.toLowerCase();
  for (const { t, c } of terms) {
    if (!t.trim()) continue;
    let from = 0;
    for (;;) {
      const s = low.indexOf(t.toLowerCase(), from);
      if (s < 0) break;
      const e = s + t.length;
      // whole words only: a short term like "T" must never light up inside "Triangle" or "Bottom"
      const inWord = (wc(t[0]) && wc(low[s - 1])) || (wc(t[t.length - 1]) && wc(low[e]));
      if (!inWord && !marks.some((m) => s < m.e && e > m.s)) marks.push({ s, e, c });
      from = e;
    }
  }
  marks.sort((a, b) => a.s - b.s);
  const out: { t: string; c: "y" | "g" | null }[] = [];
  let at = 0;
  for (const m of marks) {
    if (m.s > at) out.push({ t: text.slice(at, m.s), c: null });
    out.push({ t: text.slice(m.s, m.e), c: m.c });
    at = m.e;
  }
  if (at < text.length) out.push({ t: text.slice(at), c: null });
  return out;
}

export function Highlighted({ b }: { b: NBullet }) {
  return (
    <>
      {segments(b.text, b.key, b.green).map((s, i) =>
        s.c ? <mark key={i} className={cx("px-1 font-bold text-[#141414]", s.c === "y" ? "bg-[#ffd60a]" : "bg-[#6dff4a]")}>{s.t}</mark> : <span key={i}>{s.t}</span>)}
    </>
  );
}

/** The scene as the film shows it, drawn in HTML (16:9, grid paper, torn-paper card). */
export function SlidePreview({ sc, total }: { sc: NScene; total: number }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-[#f2f0ea]"
         style={{ backgroundImage: "linear-gradient(rgba(40,40,40,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(40,40,40,0.08) 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
      <div className="absolute inset-0 flex items-center justify-center p-[4%]">
        <div className="w-full bg-[#f6f1e6] px-[4%] py-[3%] text-[#141414] shadow-[6px_7px_0_rgba(0,0,0,0.12)]">
          {sc.kind === "hook" ? (
            <>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.18em]">{sc.kicker || "Cold open"}</div>
              <div className="mt-1.5 font-serif text-[17px] italic leading-snug"><span className="bg-[#ffd60a] px-1 [box-decoration-break:clone]">{sc.headline || "The hook is being written…"}</span></div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-[8px] font-extrabold uppercase tracking-[0.16em]">
                <span>{sc.section}</span><span className="text-[#5b5b5b]">{sc.pages ? `Page ${sc.pages} · ` : ""}{String(sc.index).padStart(2, "0")} / {String(total - 1).padStart(2, "0")}</span>
              </div>
              <div className="flex items-center gap-[3%]">
                <div className="min-w-0 flex-1">
                  <div className="mt-1 font-serif text-[13px] italic leading-snug"><span className="bg-[#ffd60a] px-1 [box-decoration-break:clone]">{sc.title}</span></div>
                  <ul className="mt-1.5 space-y-1">
                    {(sc.bullets ?? []).map((b, k) => (
                      <li key={k} className="flex gap-1.5 text-[9.5px] font-semibold leading-[1.45]">
                        <span className="mt-[4px] size-1.5 shrink-0 rounded-full bg-[#ffd60a] ring-1 ring-black/10" />
                        <span><Highlighted b={b} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
                {sc.image ? <img src={`${MEDIA}${sc.image}`} alt={sc.picture ?? ""} className="w-[34%] shrink-0 bg-white object-contain p-1 shadow-[3px_4px_0_rgba(0,0,0,0.12)]" style={{ aspectRatio: "4 / 3" }} />
                  : sc.picture ? <div className="flex w-[34%] shrink-0 items-center justify-center bg-white p-2 text-center text-[8px] text-[#5b5b5b]" style={{ aspectRatio: "4 / 3" }}>Picture: {sc.picture}</div> : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type Stages = Record<string, { done?: number; total?: number }>;

/** Where the film is: each stage with its count; the current one marked. */
export function StageStrip({ stage, stages, running }: { stage: string; stages: Stages; running: boolean }) {
  const cur = STAGES.findIndex((s) => s.key === stage);
  return (
    <div className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-4 lg:grid-cols-8">
      {STAGES.map((s, i) => {
        const c = stages[s.key] ?? {};
        const done = stage === "done" || (cur >= 0 && i < cur) || (!!c.total && c.done === c.total);
        const now = s.key === stage;
        return (
          <div key={s.key} className={cx("border-b border-r border-line px-4 py-3", now && "bg-[#ffd60a]/25")}>
            <div className="label text-muted">{String(i + 1).padStart(2, "0")}</div>
            <div className={cx("mt-1 text-[14px] font-medium", done ? "text-ink" : now ? "text-ink" : "text-muted")}>
              {s.label}{now && running && <span className="ml-2 inline-block size-2 animate-pulse rounded-full bg-accent align-middle" />}
            </div>
            <div className="mt-0.5 font-mono text-[12px] text-muted">{c.total ? `${c.done ?? 0} / ${c.total}` : done ? "done" : "—"}</div>
          </div>
        );
      })}
    </div>
  );
}
