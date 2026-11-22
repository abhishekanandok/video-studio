"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Label, cx } from "@/components/ui";
import { API } from "@/lib/api";

/* What the archival agent's investigation found (video/archivedoc.py research + investigate): the leads it followed each
   round, every quote word for word, the sources, and the pages that refused to be read. When the film is paused for
   review, the creator approves the research here and the script is written from it alone. */

type Lead = { kind: string; question: string; queries: string[]; facts?: number };
type Research = {
  facts: number; sources: number; rejected: number; approved: boolean; pack: boolean;
  rounds: { round: number; leads: Lead[]; new_facts: number }[];
  quotes: { speaker: string; text: string; site: string; date: string; url: string }[];
  source_list: { site: string; title: string; url: string; tier: number; found_in: string; facts: number }[];
  refused: { url: string; why: string }[];
};

const KIND: Record<string, string> = { gap: "gap", lead: "lead", primary: "original source", other_side: "other side", blocked: "blocked page" };

export function ResearchPanel({ filmId, r, waiting, busy, onApprove }: { filmId: number; r: Research; waiting: boolean; busy: boolean; onApprove: () => void }) {
  const [open, setOpen] = useState<"quotes" | "sources" | "refused" | null>(null);
  const [allQuotes, setAllQuotes] = useState(false);
  const toggle = (k: typeof open) => setOpen(open === k ? null : k);
  // collapsed by default; open on its own while the research is waiting for approval. The choice is remembered per film.
  const key = `research-open-${filmId}`;
  const [shown, setShown] = useState<boolean>(waiting && !r.approved);
  useEffect(() => {
    try { const v = localStorage.getItem(key); if (v !== null) setShown(v === "1"); } catch {}
  }, [key]);
  useEffect(() => { if (waiting && !r.approved) setShown(true); }, [waiting, r.approved]);
  const flip = () => { setShown(!shown); try { localStorage.setItem(key, shown ? "0" : "1"); } catch {} };
  return (
    <section>
      <button onClick={flip} aria-expanded={shown} className="group flex w-full items-center justify-between gap-4 text-left">
        <Label n="RESEARCH" className="text-ink group-hover:text-accent">{r.facts} verified facts · {r.sources} sources · {r.rounds.length} investigation rounds</Label>
        <span className="flex items-center gap-2 text-muted group-hover:text-accent">
          <span className="label">{shown ? "Hide" : "Show"}</span>
          <ChevronDown className={cx("size-4 transition-transform", shown && "rotate-180")} />
        </span>
      </button>
      {shown && <>

      {waiting && !r.approved && (
        <Card className="mt-4 flex flex-wrap items-center gap-4 border-accent px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] text-ink">The research is ready for your review</div>
            <p className="mt-1 text-[13px] text-muted">Read the pack and the quotes below. The script will be written only from these facts. Want another angle? Add it to the notes and run again.</p>
          </div>
          {r.pack && <a href={`${API}/studio/films/${filmId}/research-pack`} target="_blank" rel="noreferrer" className="label text-ink hover:text-accent">Read the full pack ↗</a>}
          <Button size="sm" loading={busy} onClick={onApprove}>Approve &amp; write the script</Button>
        </Card>
      )}

      {r.rounds.length > 0 && (
        <div className="mt-4 border-t border-line">
          {r.rounds.map((rd) => (
            <div key={rd.round} className="border-b border-line py-4">
              <div className="label text-muted">Round {rd.round} · {rd.leads.length} leads · {rd.new_facts} new facts</div>
              <ul className="mt-3 space-y-2">
                {rd.leads.map((l, i) => (
                  <li key={i} className="grid grid-cols-[8.5rem_1fr_auto] items-baseline gap-3 text-[14px]">
                    <span className="label text-accent">{KIND[l.kind] ?? l.kind}</span>
                    <span className="min-w-0 text-ink">{l.question}</span>
                    <span className="label text-muted">{l.facts ?? 0} facts</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button size="sm" variant={open === "quotes" ? "primary" : "secondary"} onClick={() => toggle("quotes")}>Quotes ({r.quotes.length})</Button>
        <Button size="sm" variant={open === "sources" ? "primary" : "secondary"} onClick={() => toggle("sources")}>Sources ({r.source_list.length})</Button>
        <Button size="sm" variant={open === "refused" ? "primary" : "secondary"} onClick={() => toggle("refused")}>Could not read ({r.refused.length})</Button>
        {r.pack && !waiting && <a href={`${API}/studio/films/${filmId}/research-pack`} target="_blank" rel="noreferrer" className="label self-center text-ink hover:text-accent">Full research pack ↗</a>}
      </div>

      {open === "quotes" && (
        <ul className="mt-4 space-y-4 border-t border-line pt-4">
          {(allQuotes ? r.quotes : r.quotes.slice(0, 10)).map((q, i) => (
            <li key={i} className="text-[14px]">
              <span className="text-ink">{q.speaker}</span> <span className="text-muted">· {q.site}{q.date ? `, ${q.date}` : ""}</span>
              <p className="mt-1 font-serif text-[16px] leading-relaxed text-ink">“{q.text}”</p>
              <a href={q.url} target="_blank" rel="noreferrer" className="label text-muted hover:text-accent">source ↗</a>
            </li>
          ))}
          {r.quotes.length > 10 && <Button size="sm" variant="ghost" onClick={() => setAllQuotes(!allQuotes)}>{allQuotes ? "Show fewer" : `Show all ${r.quotes.length}`}</Button>}
        </ul>
      )}
      {open === "sources" && (
        <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto border-t border-line pt-4 pr-2">
          {r.source_list.map((s) => (
            <li key={s.url} className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-3 text-[14px]">
              <span className={cx("label", s.tier === 1 ? "text-accent" : "text-muted")}>{s.tier === 1 ? "primary" : "press"}</span>
              <a href={s.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-ink hover:text-accent">{s.site}: {s.title || s.url}</a>
              <span className="label text-muted">{s.facts} facts · {s.found_in}</span>
            </li>
          ))}
        </ul>
      )}
      {open === "refused" && (
        <ul className="mt-4 max-h-[320px] space-y-2 overflow-y-auto border-t border-line pt-4 pr-2">
          {r.refused.map((x) => (
            <li key={x.url} className="grid grid-cols-[1fr_auto] gap-3 text-[13px]">
              <span className="min-w-0 truncate text-ink">{x.url}</span><span className="text-muted">{x.why}</span>
            </li>
          ))}
        </ul>
      )}
      </>}
    </section>
  );
}
