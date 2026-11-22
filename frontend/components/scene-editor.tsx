"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "./providers";
import { Button, Sheet, inputCls } from "./ui";

const LOOKS = ["collage", "archival", "illustration", "cartoon", "blueprint", "map", "infographic", "photo", "macro"];
const MOVES = ["push", "pull", "pan_left", "pan_right"];
const TRANSITIONS = ["cut", "slide", "tear", "zoom", "black"];
const SFX = ["none", "whoosh", "thud", "paper", "tear", "typewriter", "impact", "riser"];
const NOTE_STYLES = ["label", "stamp", "typed", "underline", "define"];
const TOPOLOGIES = ["", "network", "p2p", "bus", "ring", "star", "mesh", "tree", "hybrid"];
const FAILS = ["none", "backbone", "node", "hub", "cable"];

type Line = { speaker: string; speech: string; subtitle: string; pause: number };
type Note = { text: string; style: string; line: number };

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block"><span className="label text-muted">{label}</span><div className="mt-1.5">{children}</div></label>
);
const Select = ({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>{options.map((o) => <option key={o} value={o}>{o || "none"}</option>)}</select>
);

/** Change anything in one scene. Saving drops only the images/voices the edit touched. */
export function SceneEditor({ open, onClose, filmId, act, index, scene, speakers, onSaved }:
  { open: boolean; onClose: () => void; filmId: number; act: number; index: number; scene: any; speakers: string[]; onSaved: () => void }) {
  const toast = useToast();
  const [look, setLook] = useState("collage");
  const [prompt, setPrompt] = useState("");
  const [move, setMove] = useState("push");
  const [transition, setTransition] = useState("cut");
  const [sfx, setSfx] = useState("none");
  const [topology, setTopology] = useState("");
  const [fail, setFail] = useState("none");
  const [notes, setNotes] = useState<Note[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !scene) return;
    setLook(scene.look || "collage");
    setPrompt(scene.image_prompt ?? "");
    setMove(scene.move ?? "push");
    setTransition(scene.transition ?? "cut");
    setSfx(scene.sfx ?? "none");
    setTopology(scene.diagram?.topology ?? "");
    setFail(scene.diagram?.fail ?? "none");
    setNotes((scene.notes ?? []).map((n: any) => ({ text: n.text, style: n.style, line: n.line ?? 0 })));
    setLines(scene.lines.map((l: any) => ({ speaker: l.speaker, speech: l.speech, subtitle: l.subtitle ?? "", pause: l.pause ?? 0.2 })));
  }, [open, scene]);

  const setLine = (i: number, p: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const moveLine = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    setLines(next);
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await api(`/studio/films/${filmId}/acts/${act}/scenes/${index}`, {
        method: "PUT",
        body: JSON.stringify({ look, image: prompt, reuse: scene.reuse ?? false, move, transition, sfx, notes, lines,
          diagram: topology ? { ...(scene.diagram ?? {}), topology, fail, nodes: scene.diagram?.nodes ?? 5, tags: scene.diagram?.tags ?? [] } : null }),
      });
      const redo: string[] = r.redo ?? [];
      toast({ tone: "good", title: "Scene saved",
        body: redo.length ? `${redo.filter((x) => x.endsWith(".png")).length ? "The image will be repainted. " : ""}${redo.filter((x) => x.endsWith(".wav")).length} voice line(s) will be re-recorded. Press Apply changes & render, or redo them now.` : "Nothing needs redoing." });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't save", body: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Edit scene ${index + 1}`} subtitle={`Act ${act + 1}`} wide>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Look"><Select value={look} options={LOOKS} onChange={setLook} /></Field>
          <Field label="Camera"><Select value={move} options={MOVES} onChange={setMove} /></Field>
          <Field label="Transition"><Select value={transition} options={TRANSITIONS} onChange={setTransition} /></Field>
          <Field label="Sound"><Select value={sfx} options={SFX} onChange={setSfx} /></Field>
        </div>
        <Field label="Image prompt"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className={inputCls} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Diagram"><Select value={topology} options={TOPOLOGIES} onChange={setTopology} /></Field>
          {topology && <Field label="What breaks"><Select value={fail} options={FAILS} onChange={setFail} /></Field>}
        </div>

        <div>
          <span className="label text-muted">Lines</span>
          <div className="mt-2 space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="label w-6 text-muted">{i + 1}</span>
                  <select value={l.speaker} onChange={(e) => setLine(i, { speaker: e.target.value })} className={`${inputCls} w-auto`}>
                    {speakers.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-[13px] text-muted">pause
                    <input type="number" step={0.1} min={0.1} max={1.6} value={l.pause} onChange={(e) => setLine(i, { pause: Number(e.target.value) })} className={`${inputCls} w-20`} />
                  </label>
                  <span className="flex-1" />
                  <button onClick={() => moveLine(i, -1)} className="grid size-8 place-items-center border border-line hover:border-ink" aria-label="Move up"><ArrowUp className="size-3.5" /></button>
                  <button onClick={() => moveLine(i, 1)} className="grid size-8 place-items-center border border-line hover:border-ink" aria-label="Move down"><ArrowDown className="size-3.5" /></button>
                  <button onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length < 2} className="grid size-8 place-items-center border border-line hover:border-ink hover:text-accent disabled:opacity-30" aria-label="Delete line"><X className="size-3.5" /></button>
                </div>
                <textarea value={l.speech} onChange={(e) => setLine(i, { speech: e.target.value })} rows={2} className={`${inputCls} mt-2`} placeholder="What is spoken" />
                <input value={l.subtitle} onChange={(e) => setLine(i, { subtitle: e.target.value })} className={`${inputCls} mt-2`} placeholder="Subtitle" />
              </div>
            ))}
            <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => setLines([...lines, { speaker: speakers[0], speech: "", subtitle: "", pause: 0.2 }])}>Add a line</Button>
          </div>
        </div>

        <div>
          <span className="label text-muted">On-screen notes</span>
          <div className="mt-2 space-y-2">
            {notes.map((n, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_110px_auto]">
                <input value={n.text} onChange={(e) => setNotes(notes.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className={inputCls} placeholder="Text (define: 'TERM: meaning')" />
                <Select value={n.style} options={NOTE_STYLES} onChange={(v) => setNotes(notes.map((x, j) => (j === i ? { ...x, style: v } : x)))} />
                <select value={n.line} onChange={(e) => setNotes(notes.map((x, j) => (j === i ? { ...x, line: Number(e.target.value) } : x)))} className={inputCls}>
                  {lines.map((_, k) => <option key={k} value={k}>at line {k + 1}</option>)}
                </select>
                <button onClick={() => setNotes(notes.filter((_, j) => j !== i))} className="grid size-10 place-items-center border border-line hover:border-ink hover:text-accent" aria-label="Delete note"><X className="size-4" /></button>
              </div>
            ))}
            <Button size="sm" variant="secondary" icon={<Plus />} onClick={() => setNotes([...notes, { text: "", style: "label", line: 0 }])}>Add a note</Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={lines.some((l) => !l.speech.trim())}>Save scene</Button>
        </div>
      </div>
    </Sheet>
  );
}
