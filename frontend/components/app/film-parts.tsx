"use client";

import { Check, Copy, Loader2, MessageSquare, Palette, Pencil, RefreshCw, Shuffle, Sparkles, Terminal } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Chip } from "@/components/app/kit";
import { post } from "@/lib/api";

/* The pieces of a film in the storyboard pipeline (/api/films, ADR 0013), shared by the review grid
   (app/app/motion/f/[slug]) and the editor (components/app/film-editor.tsx). */

export type Word = { w: string; s: number; e: number };
export type Actor = { name: string; kind: string; draw: string; states?: string[] };
export type Move = { word: string; actor: string; verb: string; motion: string };
export type Callout = { text: string; target: string; part?: string; word: string };
export type Design = { scene: number; idea: string; device: string; look: string; actors: Actor[]; start: string; moves: Move[];
  links?: { source: string; target: string; meaning: string }[]; chart?: { kind: string; values?: string; highlight?: string }; words?: string[]; end: string; camera?: string;
  callouts?: Callout[]; technique?: string };

/** the film's ground (storyboard.ground, picked per film from its style: video/styles.py GROUNDS) as the editor paints it */
export function groundCss(ground: string): { style: CSSProperties; dark: boolean } {
  const g = (ground || "").toLowerCase();
  const lines = (c: string, n = 36) => ({ backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: `${n}px ${n}px` });
  const dots = (c: string) => ({ backgroundImage: `radial-gradient(${c} 1.2px, transparent 1.4px)`, backgroundSize: "22px 22px" });
  if (/chalk/.test(g)) return { style: { background: "#1f3b2d" }, dark: true };
  if (/neon/.test(g)) return { style: { background: "#0f1630", ...lines("rgb(90 220 255/0.18)", 44) }, dark: true };
  if (/fog|near-black|murk|moonlit/.test(g)) return { style: { background: /murk/.test(g) ? "radial-gradient(circle at 50% 40%, #1d2a22, #0a0f0c)" : /moon/.test(g) ? "radial-gradient(circle at 70% 20%, #2a3a55, #0b1020)" : "radial-gradient(circle at 50% 40%, #2a2a2e, #0b0b0d)" }, dark: true };
  if (/charcoal|ink black|deep navy|navy card|dark blue|dark dot/.test(g)) return { style: { background: /blue|navy/.test(g) ? "#13213a" : "#16181c", ...(/dot/.test(g) ? dots("rgb(255 255 255/0.12)") : {}) }, dark: true };
  if (/parchment|aged/.test(g)) return { style: { background: "radial-gradient(circle at 50% 45%, #f3e6c8, #dcc79c)", ...lines("rgb(120 90 40/0.08)", 60) }, dark: false };
  if (/relief/.test(g)) return { style: { background: "linear-gradient(135deg, #1f4a52, #2f5f3e)" }, dark: true };
  if (/sea|modern pale map/.test(g)) return { style: { background: "linear-gradient(180deg, #eef3f0, #dbe9ef)" }, dark: false };
  if (/kraft/.test(g)) return { style: { background: "#c9a77a" }, dark: false };
  if (/cork/.test(g)) return { style: { background: "#b98b5a", ...dots("rgb(80 50 20/0.25)") }, dark: false };
  if (/newsprint/.test(g)) return { style: { background: "#ece7da", backgroundImage: "repeating-linear-gradient(90deg, transparent 0 180px, rgb(0 0 0/0.05) 180px 181px)" }, dark: false };
  if (/legal pad|acid yellow/.test(g)) return { style: { background: /acid/.test(g) ? "#e8f03a" : "#fbf3b0", ...(/legal/.test(g) ? { backgroundImage: "repeating-linear-gradient(transparent 0 30px, rgb(60 120 200/0.25) 30px 31px)" } : {}) }, dark: false };
  if (/deep green/.test(g)) return { style: { background: "#1d4a35" }, dark: true };
  if (/sky|dawn|dusk|noon/.test(g)) return { style: { background: /dusk|purple/.test(g) ? "linear-gradient(180deg, #4b3f7a, #f2a07b)" : /noon/.test(g) ? "linear-gradient(180deg, #5aa9e6, #d8eefc)" : /dawn/.test(g) ? "linear-gradient(180deg, #f7b38a, #fde7c6)" : "linear-gradient(180deg, #8ec5ef, #e8f4fc)" }, dark: false };
  if (/sepia/.test(g)) return { style: { background: "radial-gradient(circle at 50% 45%, #d9c3a0, #8f7553)" }, dark: false };
  if (/blue-grey|dusk gradient/.test(g)) return { style: { background: "linear-gradient(180deg, #5c6b80, #2c3442)" }, dark: true };
  if (/graph paper/.test(g)) return { style: { background: "#f4f8ff", ...lines("rgb(60 110 200/0.14)", 24) }, dark: false };
  if (/grid/.test(g)) return { style: { background: "#fbfaf5", ...lines("rgb(31 28 27/0.07)") }, dark: false };
  if (/pink/.test(g)) return { style: { background: "#f4d9d6" }, dark: false };
  if (/grey card|recycled/.test(g)) return { style: { background: "#c9c7c0" }, dark: false };
  if (/pastel|tiles|sand floor/.test(g)) return { style: { background: /sand/.test(g) ? "#ead7b5" : "linear-gradient(135deg, #e3eefc, #fbe3dc)" }, dark: false };
  if (/white board|clean white|off-white|sketchbook|cream/.test(g)) return { style: { background: /sketch|cream/.test(g) ? "#fbf5e6" : "#ffffff" }, dark: false };
  return { style: { background: "#fbfaf5" }, dark: false };
}
export type CardT = { id: string; i: number; line: string; seconds: number; design: Design; status: "pending" | "approved" | "redrawing"; notes: { at: number; note: string }[]; changed?: boolean };
export type Step = { id: string; label: string; state: string };
export type Line = { i: number; start: number; span: number; voice: string; peaks: number[]; words: Word[] };
export type FilmStatus = { slug: string; topic: string; title: string; style: string; language: string; state: string; running: string[]; steps: Step[];
  storyboard: { ground: string; cards: CardT[] } | null; approved: number; total: number; changed: string[]; log: string[]; error: string;
  lines: Line[]; length: number; code: string; script: string[]; voiced: boolean[];
  cost: { total_usd: number; stages: Record<string, { usd: number; calls: number }> } | null; report: { usd?: number; lines_final?: number; versions?: { label: string; slug: string; video: string; audio: string }[] } | null; video: string;
  look: { family: string; summary: string; auto: boolean } | null };

/** the film's look in one line (video/looks.py: family, headline, boxes, motion, photos, charts) and, until the film is
 *  written, a Re-roll that picks the varied axes again (/api/films/<slug>/look/reroll); the family and brand stay */
export function LookLine({ film, onChange }: { film: FilmStatus; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!film.look) return null;
  const can = !film.report?.lines_final && !film.running.length;
  const reroll = async () => {
    setBusy(true); setErr("");
    try { await post(`/films/${film.slug}/look/reroll`); onChange(); }
    catch (e) { setErr(String((e as Error).message)); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#5f5b57]">
      <Palette className="size-4 text-[#3f7d1e]" />
      <span>This film&apos;s look{film.look.auto ? " (picked by Auto)" : ""}: <b className="text-[#1f1c1b]">{film.look.summary}</b></span>
      {can && <button type="button" onClick={reroll} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-[#e2e1da] bg-white px-2.5 py-1 text-[12.5px] font-semibold hover:border-[#a6f04a] disabled:opacity-50">
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Shuffle className="size-3.5" />}Re-roll look</button>}
      {err && <span className="text-[#9a2f1d]">{err}</span>}
    </div>
  );
}

/** a film's state: planning, review (with approvals), writing, ready, failed */
export function FilmState({ state, approved = 0, total = 0, changed = 0 }: { state: string; approved?: number; total?: number; changed?: number }) {
  if (state === "planning") return <Chip tone="lime"><span className="size-2 animate-pulse rounded-full bg-[#3f7d1e]" />Planning</Chip>;
  if (state === "review") return <Chip tone="warn">Storyboard review · {approved}/{total} approved</Chip>;
  if (state === "writing") return <Chip tone="lime"><span className="size-2 animate-pulse rounded-full bg-[#3f7d1e]" />Writing</Chip>;
  if (state === "claude") return <Chip tone="warn">Waiting for Claude Code</Chip>;
  if (state === "done") return <Chip tone="ink">{changed ? `Ready · ${changed} line(s) changed` : "Ready"}</Chip>;
  if (state === "failed") return <Chip tone="warn">Failed</Chip>;
  return <Chip>Stopped</Chip>;
}

/** who draws the film once the storyboard is approved: Gemini through the API (it runs now), or Claude Code (the film
    waits; the creator asks Claude Code to "draw film <slug>", .claude/skills/draw-film). Look films only for Claude Code. */
export function DrawChoice({ film, disabled, compact, onChange }: { film: FilmStatus; disabled: boolean; compact?: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const ask = `draw film ${film.slug}`;
  const pick = async (drawer: "gemini" | "claude") => {
    setBusy(drawer); setErr("");
    try { await post(`/films/${film.slug}/write`, { drawer }); onChange(); }
    catch (e) { setErr(String((e as Error).message)); }
    finally { setBusy(""); }
  };
  const pad = compact ? "px-3.5 py-1.5 text-[13.5px]" : "px-5 py-2 text-[14.5px]";
  if (film.state === "writing") return <span className={`inline-flex items-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] font-bold ${pad}`}><Loader2 className="size-4 animate-spin" />Writing…</span>;
  if (film.state === "claude") return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-2 rounded-full border-2 border-dashed border-[#1f1c1b] bg-white font-semibold ${pad}`}>
        <Terminal className="size-4" />In Claude Code, say: <code className="rounded bg-[#efefea] px-1.5 font-mono text-[12.5px]">{ask}</code>
        <button type="button" title="Copy" onClick={() => { navigator.clipboard?.writeText(ask); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button>
      </span>
      <button type="button" disabled={disabled || !!busy} onClick={() => pick("gemini")} className="text-[13px] font-semibold text-[#5f5b57] underline disabled:opacity-40">Draw with Gemini instead</button>
      {err && <span className="text-[13px] text-[#9a2f1d]">{err}</span>}
    </span>
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" data-agent="write" disabled={disabled || !!busy} onClick={() => pick("gemini")} title={disabled ? "Approve every card first" : "Gemini draws it now, through the API (paid per film)"}
        className={`inline-flex items-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] font-bold shadow-[2px_2px_0_#1f1c1b] disabled:opacity-40 disabled:shadow-none ${pad}`}>
        {busy === "gemini" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Draw with Gemini</button>
      <button type="button" disabled={disabled || !!busy || !film.look} onClick={() => pick("claude")}
        title={!film.look ? "Claude Code draws look films only" : disabled ? "Approve every card first" : "The film waits; Claude Code draws it with you (no API cost)"}
        className={`inline-flex items-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-white font-bold shadow-[2px_2px_0_#1f1c1b] disabled:opacity-40 disabled:shadow-none ${pad}`}>
        {busy === "claude" ? <Loader2 className="size-4 animate-spin" /> : <Terminal className="size-4" />}Draw with Claude Code</button>
      {err && <span className="text-[13px] text-[#9a2f1d]">{err}</span>}
    </span>
  );
}

export function StepDot({ s }: { s: Step }) {
  const tone = s.state === "done" ? "bg-[#1f1c1b] text-white" : s.state === "running" ? "bg-[#a6f04a]" : s.state === "waiting" ? "bg-[#fff3d6] text-[#8a5a00] ring-1 ring-[#f0d38a]" : s.state === "failed" ? "bg-[#fff1ec] text-[#9a2f1d]" : "bg-white text-[#8a857f] ring-1 ring-[#e2e1da]";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${tone}`}>
    {s.state === "running" && <Loader2 className="size-3 animate-spin" />}{s.state === "done" && <Check className="size-3" />}{s.label}{s.state === "waiting" && " · needs you"}</span>;
}

export const statusTone = (c: CardT) => (c.status === "approved" ? "bg-[#a6f04a]" : c.status === "redrawing" ? "bg-[#f0d38a]" : "bg-[#d9d8d0]");

/** one storyboard card: the line, its design, and the creator's three actions (approve, request a change, edit words) */
export function StoryCard({ slug, c, locked, onChange, flat = false }: { slug: string; c: CardT; locked: boolean; onChange: () => void; flat?: boolean }) {
  const [mode, setMode] = useState<"" | "note" | "line">("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const d = c.design;
  const act = async (path: string, body?: unknown) => {
    setBusy(true); setErr("");
    try { await post(`/films/${slug}/cards/${c.id}/${path}`, body); setMode(""); setText(""); onChange(); }
    catch (e) { setErr(String((e as Error).message)); }
    finally { setBusy(false); }
  };
  const ring = flat ? "" : c.status === "approved" ? "ring-2 ring-[#a6f04a]" : c.status === "redrawing" ? "ring-2 ring-[#f0d38a]" : "";
  return (
    <div className={`rounded-[18px] bg-white ${flat ? "" : "p-4 shadow-[0_1px_0_#e6e6df]"} ${ring}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[8px] bg-[#1f1c1b] px-2 py-0.5 font-mono text-[12px] font-bold text-white">{c.id}</span>
          <span className="text-[12px] text-[#8a857f]">{c.seconds.toFixed(1)} s · {d.device} · {d.look}</span>
          {c.changed && <span className="rounded-full bg-[#efe7ff] px-2 py-0.5 text-[11px] font-bold text-[#5a3a9a]">changed since the film</span>}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${c.status === "approved" ? "bg-[#a6f04a]" : c.status === "redrawing" ? "bg-[#fff3d6] text-[#8a5a00]" : "bg-[#f1f0ea] text-[#5f5b57]"}`}>
          {c.status === "approved" ? "Approved" : c.status === "redrawing" ? "Redrawing…" : "Waiting for you"}</span>
      </div>

      <p className="mt-2 text-[15.5px] font-semibold leading-snug">&ldquo;{c.line}&rdquo;</p>
      <p className="mt-1 text-[13.5px] text-[#3f7d1e]"><b>Idea:</b> {d.idea}</p>

      <div className="mt-2 space-y-1 text-[13px] leading-snug text-[#3a3633]">
        <div><b className="text-[#8a857f]">Opens on:</b> {d.start}</div>
        <div><b className="text-[#8a857f]">On screen:</b> {d.actors.map((a) => `${a.name} (${a.draw})`).join("; ")}</div>
        {d.moves.length > 0 && <ul className="ml-1 space-y-0.5">{d.moves.map((m, k) => <li key={k}><span className="rounded bg-[#f6f5ef] px-1 font-mono text-[12px]">&ldquo;{m.word}&rdquo;</span> {m.actor} {m.verb}: {m.motion}</li>)}</ul>}
        {(d.links ?? []).length > 0 && <div><b className="text-[#8a857f]">Links:</b> {(d.links ?? []).map((l) => `${l.source} → ${l.target} (${l.meaning})`).join("; ")}</div>}
        {d.chart && d.chart.kind !== "none" && <div><b className="text-[#8a857f]">Chart:</b> {d.chart.kind}: {d.chart.values}{d.chart.highlight ? `, lights up ${d.chart.highlight}` : ""}</div>}
        {(d.callouts ?? []).length > 0 && <div><b className="text-[#8a857f]">Callouts:</b> {(d.callouts ?? []).map((co, k) => <span key={k} className="mr-1 inline-block rounded-[6px] bg-[#f6f39a] px-1.5 font-semibold">“{co.text}” → {co.target}{co.part ? `.${co.part}` : ""} on “{co.word}”</span>)}</div>}
        {d.technique && d.technique !== "none" && <div><b className="text-[#8a857f]">Technique:</b> <span className="rounded-full bg-[#efe7ff] px-2 py-0.5 text-[12px] font-bold text-[#5a3a9a]">{d.technique}</span></div>}
        <div><b className="text-[#8a857f]">Words on screen:</b> {(d.words ?? []).join(", ") || "none"}</div>
        <div><b className="text-[#8a857f]">Ends on:</b> {d.end}</div>
      </div>

      {c.notes.length > 0 && <div className="mt-2 space-y-1">{c.notes.map((n, k) => <div key={k} className="rounded-[10px] bg-[#f6f5ef] px-2.5 py-1.5 text-[12.5px] text-[#5f5b57]"><MessageSquare className="mr-1 inline size-3" />{n.note}</div>)}</div>}

      {mode && (
        <div className="mt-3">
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={mode === "line" ? 2 : 3}
            placeholder={mode === "note" ? "What should change? e.g. show cows at the farm, not a factory; the farmer stays in frame" : "The line's new words"}
            className="w-full resize-y rounded-[12px] border border-[#e2e1da] px-3 py-2 text-[14px] outline-none focus:border-[#a6f04a]" />
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !text.trim()} onClick={() => act(mode === "note" ? "feedback" : "line", mode === "note" ? { note: text } : { text })}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-3.5 py-1.5 text-[13px] font-bold disabled:opacity-50">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}{mode === "note" ? "Redraw this card" : "Save words · voice it again"}</button>
            <button type="button" onClick={() => { setMode(""); setText(""); }} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#5f5b57]">Cancel</button>
          </div>
        </div>
      )}

      {!mode && !locked && c.status !== "redrawing" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {c.status === "pending" && <button type="button" disabled={busy} onClick={() => act("approve")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-3.5 py-1.5 text-[13px] font-bold disabled:opacity-50"><Check className="size-3.5" />Approve</button>}
          <button type="button" onClick={() => setMode("note")} className="inline-flex items-center gap-1.5 rounded-full border border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13px] font-semibold"><MessageSquare className="size-3.5" />Request a change</button>
          <button type="button" onClick={() => { setMode("line"); setText(c.line); }} className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-3.5 py-1.5 text-[13px] font-semibold"><Pencil className="size-3.5" />Edit words</button>
        </div>
      )}
      {err && <p className="mt-2 text-[13px] text-[#9a2f1d]">{err}</p>}
    </div>
  );
}
