"use client";

import { ArrowLeft, Check, Play, Send, Square } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GATES, GateStrip, STEPS, ready } from "@/components/crew";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { CostPanel } from "@/components/studio";
import { Button, Label, Skeleton, cx, inputCls } from "@/components/ui";
import { post, useApi } from "@/lib/api";

export default function CrewFilm() {
  const { id } = useParams<{ id: string }>();
  const { data: f, error, mutate } = useApi<any>(`/crew/films/${id}`, { refreshInterval: (d: any) => (d?.running ? 3000 : 0) });
  const [sel, setSel] = useState<string>("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<any>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const current = f ? f.waiting ?? (f.running ? f.step : null) : null;
  useEffect(() => { // follow the film to the gate it's waiting at
    if (f?.waiting) setSel(f.waiting);
    else if (f && !sel) setSel([...STEPS].reverse().find((s) => ready(f, s.key))?.key ?? "plan");
  }, [f?.waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Offline message={error.message} />;
  if (!f) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-28" /><Skeleton className="h-96" /></div>;

  const step = STEPS.find((s) => s.key === sel);
  const Gate = GATES[sel];
  const live = f.waiting === sel;
  const flagged = Object.entries(notes).filter(([, v]) => v.trim());
  const edited = Object.values(edits).some((v: any) => v && (typeof v !== "object" || Object.keys(v).length));
  const send = async (action: "approve" | "revise") => {
    setBusy(true);
    try {
      await post(`/crew/films/${f.id}/gate`, { gate: sel, action, edits, notes: Object.fromEntries(flagged), note });
      toast({ tone: "good", title: action === "approve" ? `${step?.label} approved` : `Sent back to the ${f.waiting === "build" || f.waiting === "final" ? "Planner" : step?.owner}` });
      setNotes({}); setEdits({}); setNote("");
      await mutate();
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't send that", body: e.message });
    } finally {
      setBusy(false);
    }
  };
  const call = async (path: string) => {
    setBusy(true);
    try { await post(path); await mutate(); } catch (e: any) { toast({ tone: "bad", title: "Couldn't do that", body: e.message }); } finally { setBusy(false); }
  };
  const voicesChanged = sel === "voices" && edits.roles;

  return (
    <div className="space-y-8 pb-40">
      <Link href="/crew" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Crew films</Link>
      <div>
        <Label n={`CREW ${String(f.id).padStart(2, "0")}`} className="text-ink">
          {["Skill 1 · Text slides", f.subject, f.config?.language, f.order ? `${f.order.length} slides` : null].filter(Boolean).join(" · ")}
        </Label>
        <h1 className="mt-6 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl">{f.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className={cx("label px-2 py-1", f.state === "waiting" ? "bg-[#ffd60a] text-[#141414]" : f.state === "failed" ? "bg-accent text-white" : "text-muted")}>
            {f.state === "waiting" ? `Your turn: ${STEPS.find((s) => s.key === f.waiting)?.label}` : f.state === "running" ? "The crew is working…" : f.state === "done" ? "Finished" : f.state === "failed" ? "Stopped with an error" : "Stopped"}
          </span>
          {f.running ? <Button variant="secondary" size="sm" icon={<Square />} loading={busy} onClick={() => call(`/crew/films/${f.id}/stop`)}>Stop</Button>
            : (f.state === "failed" || f.state === "stopped") ? <Button size="sm" icon={<Play />} loading={busy} onClick={() => call(`/crew/films/${f.id}/continue`)}>Carry on</Button> : null}
        </div>
        {f.error && <p className="mt-3 font-mono text-[12.5px] text-accent">{f.error}</p>}
      </div>

      <GateStrip f={f} selected={sel} onSelect={setSel} />

      {f.running && (
        <div className="border border-line px-4 py-3">
          <div className="label text-muted">Live · {STEPS.find((s) => s.key === current)?.owner ?? "Crew"}{f.counts?.total ? ` · ${f.counts.done ?? 0} / ${f.counts.total}` : ""}</div>
          <div className="mt-2 space-y-0.5 font-mono text-[12.5px]">
            {f.log.slice(-6).map((l: any, i: number) => <div key={i} className={i === f.log.slice(-6).length - 1 ? "text-ink" : "text-muted"}><span className="mr-2 text-muted">{l.at}</span>{l.msg}</div>)}
          </div>
        </div>
      )}

      {step && Gate && ready(f, sel) && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
            <div>
              <div className="label text-muted">Gate {STEPS.indexOf(step)} · made by the {step.owner} · Verifier checked: {step.checks}</div>
              <h2 className="mt-1 text-2xl font-medium">{step.label}</h2>
            </div>
            {!live && <span className="label text-muted">{f.approved.includes(sel) ? "Approved · read only" : "Read only"}</span>}
          </div>
          <div className="mt-4"><Gate f={f} notes={notes} setNote={(k, v) => setNotes({ ...notes, [k]: v })} edits={edits} setEdits={setEdits} readOnly={!live} /></div>
        </section>
      )}

      {f.cost && <CostPanel cost={f.cost} />}

      {live && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink bg-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={cx(inputCls, "min-w-[240px] flex-1")}
              placeholder={`A note on the whole step for the ${sel === "build" || sel === "final" ? "Planner" : step?.owner} (optional)`} />
            <span className="label text-muted">{flagged.length ? `${flagged.length} flagged` : "nothing flagged"}{edited ? " · your edits kept" : ""}</span>
            {flagged.length || note.trim() || voicesChanged ? (
              <Button icon={<Send />} loading={busy} onClick={() => send("revise")}>
                {voicesChanged ? "Re-record with the new voices" : `Send back to the ${sel === "build" || sel === "final" ? "Planner" : step?.owner}`}
              </Button>
            ) : (
              <Button icon={<Check />} loading={busy} onClick={() => send("approve")}>{sel === "final" ? "Approve the film" : "Approve and continue"}</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
