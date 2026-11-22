"use client";

import { ArrowLeft, Captions, Check, Clapperboard, Code2, Diamond, Download, Eye, LayoutGrid, Loader2, Mic, MousePointer2, Move, Pause, Play, RefreshCw, RotateCcw, SkipBack, SkipForward, Square, Type } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import useSWR from "swr";
import { ANIMS, DirectorCanvas, DirectorOverlays, FilmCursor, emojiOf, useFilmDirector, wordAt, type DTab } from "./film-director";
import { CodeStream, Feed, PlanningView, RenderProgress, nowDoing, type FilmLive } from "./film-live";
import { DrawChoice, FilmState, LookLine, StepDot, StoryCard, groundCss, statusTone, type CardT, type FilmStatus, type Line } from "./film-parts";
import { LIME, ease } from "./kit";
import { post, useApi } from "@/lib/api";

/* The editor for a film in the storyboard pipeline (/api/films, ADR 0013), laid out like the classic editor
   (components/app/motion-editor.tsx). While Gemini makes the film, an editor's hand works the editor in front of you
   (components/app/film-director.tsx): it types the story in, records each voice, opens each scene, drags its pieces onto
   the canvas, gives them motion keyed on their words, plays them back, and exports. A finished film can be replayed the
   same way. Left: the lines and the film's pieces. Middle: the canvas (the director's scene, the animatic of a card, or
   the rendered film). Right: what Gemini is doing, the line under the playhead (its card: approve, request a change,
   edit words), captions, its code, its voice. Below: the timeline from the real word timings. */

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Scene<k>'s code in the film file: from its declaration to the next top-level declaration (as video/oneshot.py scene_block) */
function sceneCode(src: string, k: number): string {
  const lines = src.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^(export\\s+)?(const|function)\\s+Scene${k}\\b`).test(l));
  if (start < 0) return "";
  let end = lines.findIndex((l, n) => n > start && /^((export\s+)?(const|let|function|type|interface|class)\s|\/\/|\/\*)/.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start, end).join("\n").trimEnd();
}

function Panel({ children, className = "", agent }: { children: ReactNode; className?: string; agent?: string }) {
  return <div data-agent={agent} className={`rounded-[20px] border border-[#e6e6df] bg-white ${className}`}>{children}</div>;
}

/** the card in time: pieces appear on their first move's word (or at the start), each move flashes on its word */
function Animatic({ c, line, local, ground }: { c: CardT; line: Line; local: number; ground: string }) {
  const d = c.design;
  const moves = d.moves.map((m) => ({ ...m, at: wordAt(line, m.word) }));
  const firstAt = (name: string) => {
    const own = moves.filter((m) => m.actor === name).map((m) => m.at);
    return own.length ? Math.min(...own) : 0.15 * (1 + d.actors.findIndex((a) => a.name === name));
  };
  const now = [...moves].reverse().find((m) => local >= m.at);
  const g = groundCss(ground);
  const n = d.actors.length;
  const cols = n <= 3 ? n : Math.ceil(n / 2);
  return (
    <div data-agent="canvas" className="absolute inset-0 overflow-hidden" style={g.style}>
      <div className="absolute left-3 top-3 flex gap-1.5">
        <span className="rounded-full bg-[#1f1c1b] px-2.5 py-1 font-mono text-[11px] font-bold text-[#a6f04a]">{c.id} · animatic</span>
        <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11.5px] font-semibold text-[#5f5b57]">{d.device} · {d.look}{d.technique && d.technique !== "none" ? ` · ${d.technique}` : ""}</span>
      </div>
      <div className="absolute inset-x-8 bottom-[22%] top-[16%] grid place-items-center gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(cols, 1)}, minmax(0, 1fr))` }}>
        {d.actors.map((a) => {
          const on = local >= firstAt(a.name);
          const acting = now && now.actor === a.name && local - now.at < 1.2;
          const labels = (d.callouts ?? []).filter((co) => co.target === a.name && local >= wordAt(line, co.word));  // its callouts, from their word on
          return (
            <motion.div key={a.name} initial={false} animate={{ opacity: on ? 1 : 0, scale: on ? (acting ? 1.08 : 1) : 0.6, y: on ? 0 : 16 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`relative w-full max-w-[200px] rounded-[16px] border-2 p-3 text-center ${acting ? "border-[#1f1c1b] bg-[#a6f04a] shadow-[3px_3px_0_#1f1c1b]" : "border-[#1f1c1b]/70 bg-white"}`}>
              <div className="text-[clamp(22px,3vw,40px)] leading-none">{emojiOf(a.name, a.draw)}</div>
              <div className="mt-1 text-[clamp(12px,1.2vw,16px)] font-extrabold">{a.name}</div>
              {labels.map((co, k) => (
                <motion.div key={co.text} initial={{ opacity: 0, y: 6, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  className="absolute -top-9 left-1/2 flex flex-col items-center" style={{ transform: `translateX(${-50 + k * 60}%)` }}>
                  <span className="whitespace-nowrap bg-[#ffd400] px-2 py-0.5 text-[13px] font-extrabold text-[#1f1c1b] shadow-[0_4px_10px_-4px_rgb(0_0_0/0.4)]">{co.text}{co.part ? <span className="font-semibold opacity-60"> · {co.part}</span> : null}</span>
                  <svg width="14" height="16" viewBox="0 0 14 16"><path d="M7 0 L7 11 M3 8 L7 13 L11 8" stroke="#e0a400" strokeWidth="2.2" fill="none" strokeDasharray="3 2" /></svg>
                </motion.div>
              ))}
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {now && <motion.div key={now.word + now.at} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}
          className="absolute inset-x-6 top-12 mx-auto max-w-[80%] rounded-[12px] bg-[#1f1c1b]/90 px-3 py-1.5 text-center text-[12.5px] text-white">
          <b className="text-[#a6f04a]">&ldquo;{now.word}&rdquo;</b> {now.actor} {now.verb}: {now.motion}</motion.div>}
      </AnimatePresence>
      {(d.words ?? []).length > 0 && <div className="absolute right-3 top-3 flex gap-1">{(d.words ?? []).map((w) => <span key={w} className="rounded-[8px] border-2 border-[#1f1c1b] bg-[#f6f39a] px-2 py-0.5 text-[13px] font-extrabold">{w}</span>)}</div>}
    </div>
  );
}

export function FilmEditor({ film, origin, onChange, onGrid }: { film: FilmStatus; origin: string; onChange: () => void; onGrid: () => void }) {
  const cards = film.storyboard?.cards ?? [];
  const L = film.lines ?? [];
  const total = Math.max(film.length ?? 0, 0.1);
  const root = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userTab, setTab] = useState<DTab>(film.running.length || film.state === "planning" ? "Agent" : "Card");
  const [follow, setFollow] = useState(true);
  const [speed, setSpeed] = useState(1);
  // what the runner is doing this second: polled fast while it works
  const { data: live } = useApi<FilmLive>(`/films/${film.slug}/live`, { refreshInterval: (d) => (!d || d.running.length ? 1000 : 8000) });
  const working = (live?.running ?? film.running).length > 0;
  const now = nowDoing(film, live);
  const streaming = live?.write && working && (live.running.includes("write") || live.running.includes("redo")) && live.write.state === "streaming" ? live.write : null;
  const rendering = working && live?.render && live.events.at(-1)?.kind === "render" && live.render.stage !== "done" ? live.render : null;
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const voice = useRef<HTMLAudioElement>(null);
  const curI = L.findIndex((l) => t < l.start + l.span);
  const cur = curI < 0 ? Math.max(L.length - 1, 0) : curI;
  const ln = L[cur];
  const c = cards[cur];
  const local = ln ? t - ln.start : 0;
  const word = ln ? ln.words.findIndex((w) => local < w.e) : -1;
  const { data: code } = useSWR<string | null>(film.code ? origin + film.code : null, (u: string) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.text() : null)));
  const locked = film.state === "planning" || film.state === "writing";
  const written = !!film.report?.lines_final;
  const allApproved = cards.length > 0 && film.approved === film.total;
  const pending = cards.filter((x) => x.status === "pending").length;
  const pieces = useMemo(() => {  // every piece the storyboard names, once: the editor's library
    const seen = new Map<string, { name: string; draw: string }>();
    for (const x of cards) for (const a of x.design.actors) if (!seen.has(norm(a.name))) seen.set(norm(a.name), { name: a.name, draw: a.draw });
    return [...seen.values()];
  }, [cards]);

  // with the rendered film the video is the clock; before it, a timer and each line's own voice
  useEffect(() => {
    if (film.video || !playing) return;
    const id = setInterval(() => setT((x) => (x + 0.1 >= total ? 0 : x + 0.1)), 100);
    return () => clearInterval(id);
  }, [film.video, playing, total]);
  useEffect(() => {
    const a = voice.current;
    if (film.video || !a || !ln?.voice) return;
    if (!a.src.endsWith(ln.voice)) { a.src = origin + ln.voice; a.currentTime = Math.max(0, local); }
    if (playing) a.play().catch(() => {}); else a.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, playing, film.video, ln?.voice]);

  const seek = (x: number) => {
    const v = Math.min(Math.max(x, 0), total - 0.05);
    setT(v);
    if (video.current) video.current.currentTime = v;
    const l = L.find((l) => v < l.start + l.span);
    if (voice.current && l && !film.video) { voice.current.src = origin + l.voice; voice.current.currentTime = v - l.start; }
  };
  const toggle = () => { if (video.current) { if (video.current.paused) video.current.play(); else video.current.pause(); } else setPlaying(!playing); };
  const act = async (what: "approve-all" | "write" | "redo" | "stop") => {
    setBusy(what); setErr("");
    try { await post(`/films/${film.slug}/${what}`); onChange(); }
    catch (e) { setErr(String((e as Error).message)); }
    finally { setBusy(""); }
  };
  // Gemini's hand in the editor (components/app/film-director.tsx)
  const d = useFilmDirector({ root, film, live, active: follow, speed, onSeek: seek });
  const ui = d.ui;
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || working || !cards.length || !L.length) return;
    if (new URLSearchParams(window.location.search).get("replay") === "1") { asked.current = true; setTimeout(() => d.replay(), 600); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working, cards.length, L.length]);
  const tab: DTab = ui.on && ui.tab ? ui.tab : userTab;
  const at = (x: number) => `${(x / total) * 100}%`;
  const wd = (l: Line) => `${(l.span / total) * 100}%`;
  const ticks = Array.from({ length: 9 }, (_, i) => (i / 8) * total);
  const label = ui.on ? "Gemini at work in the editor" : !cards.length && working ? "The story, as it is planned" : film.video && !working ? "The rendered film" : "Animatic from the storyboard";

  return (
    <div ref={root} className="relative flex h-dvh flex-col gap-3 p-3 text-[#1f1c1b]" style={{ background: "#efefea", fontFamily: "var(--font-baloo), system-ui, sans-serif" }}>
      {ui.on && ui.highlight && <style>{`[data-agent="${ui.highlight}"]{outline:3px solid #a6f04a;outline-offset:2px;border-radius:10px;transition:outline-color .2s}`}</style>}
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/app/motion" className="flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-4 py-2 text-[14px] font-semibold"><ArrowLeft className="size-4" />Films</Link>
        <span className="ml-1 hidden max-w-[260px] truncate text-[16px] font-bold lg:block">{film.title || film.topic}</span>
        <FilmState state={film.state} approved={film.approved} total={film.total} changed={film.changed.length} />
        <div className="mx-auto hidden min-w-0 gap-1 overflow-x-auto md:flex">{film.steps.map((s) => <span key={s.id} data-agent={`step-${s.id}`}><StepDot s={s} /></span>)}</div>
        {!working && cards.length > 0 && (ui.on
          ? <button type="button" onClick={() => d.stop()} className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold"><Pause className="size-4" />Stop replay</button>
          : <button type="button" onClick={() => d.replay()} className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#f6f39a] px-3.5 py-1.5 text-[13.5px] font-bold shadow-[2px_2px_0_#1f1c1b]"><RotateCcw className="size-4" />Replay how it was made</button>)}
        <button type="button" onClick={onGrid} className="flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-3.5 py-1.5 text-[13.5px] font-semibold"><LayoutGrid className="size-4" />Grid</button>
        {film.running.length > 0 && <button type="button" disabled={!!busy} onClick={() => act("stop")} className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold disabled:opacity-50"><Square className="size-3.5" />Stop</button>}
        {pending > 0 && !locked && <button type="button" data-agent="approve-all" disabled={!!busy} onClick={() => act("approve-all")} className="flex items-center gap-1.5 rounded-full border border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-semibold disabled:opacity-50"><Check className="size-4" />Approve all {pending}</button>}
        {!written ? (
          <DrawChoice film={film} compact disabled={!allApproved || locked || !!busy || film.running.length > 0} onChange={onChange} />
        ) : film.changed.length > 0 ? (
          <button type="button" data-agent="write" disabled={!allApproved || locked || !!busy || film.running.length > 0} onClick={() => act("redo")}
            className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-4 py-1.5 text-[14px] font-bold shadow-[2px_2px_0_#1f1c1b] disabled:opacity-40 disabled:shadow-none">
            <RefreshCw className="size-4" />Rewrite changed lines ({film.changed.length})</button>
        ) : null}
        {film.video && !working ? <a data-agent="render" href={origin + film.video} download className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-4 py-1.5 text-[14px] font-bold shadow-[2px_2px_0_#1f1c1b]"><Download className="size-4" />Download</a>
          : <span data-agent="render" className="flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-4 py-1.5 text-[14px] font-semibold text-[#8a857f]"><Clapperboard className="size-4" />{working && written ? "Exporting…" : "Export"}</span>}
      </div>
      {(err || film.error) && <p className="rounded-[12px] bg-[#fff1ec] px-3 py-2 text-[13px] text-[#9a2f1d]">{err || `It stopped with an error: ${film.error}`}</p>}
      <LookLine film={film} onChange={onChange} />

      <div className="flex min-h-0 flex-1 gap-3">
        {/* left: the lines, and the film's pieces */}
        <Panel className="hidden w-[260px] shrink-0 flex-col overflow-y-auto p-4 lg:flex">
          <div className="text-[20px] font-bold">Lines</div>
          <div className="mt-0.5 text-[12.5px] text-[#8a857f]">{cards.length ? `${film.approved} of ${film.total} approved` : `${film.script.length} lines`}{film.style ? ` · ${film.style.split("+").join(" + ")}` : ""}</div>
          <div data-agent="lines" className="mt-3 space-y-2">
            {(cards.length ? cards.map((x) => x.line) : film.script).map((text, k) => {
              const x = cards[k];
              const typing = ui.typing && ui.typing.i === k ? ui.typing.n : null;
              const shown = typing !== null ? text.slice(0, typing) : ui.typing && k > ui.typing.i ? "" : text;
              return (
                <button key={k} type="button" data-agent={`line-${k}`} onClick={() => L[k] && seek(L[k].start + 0.01)}
                  className={`block w-full rounded-[14px] border p-2.5 text-left ${x && k === cur ? "border-[#1f1c1b] bg-[#f7f5ee]" : ui.recording === k ? "border-[#7fb2df] bg-[#e3f1ff]" : "border-[#ecebe5] bg-white hover:border-[#a6f04a]"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 flex-none rounded-full ${x ? statusTone(x) : film.voiced[k] ? "bg-[#7fb2df]" : "bg-[#d9d8d0]"}`} />
                    <span className="font-mono text-[11.5px] font-bold">L{String(k + 1).padStart(2, "0")}</span>
                    <span className="truncate text-[11.5px] text-[#8a857f]">{x ? `${x.design.device} · ${x.design.look}` : film.voiced[k] ? "voiced" : "waiting for its voice"}</span>
                    {x?.changed && <span className="ml-auto rounded-full bg-[#efe7ff] px-1.5 text-[10px] font-bold text-[#5a3a9a]">changed</span>}
                  </div>
                  <div className="mt-1 line-clamp-2 min-h-[1.2em] text-[12.5px] leading-snug text-[#3a3633]">{shown}{typing !== null && <span className="ml-0.5 inline-block h-[0.9em] w-[2px] animate-pulse bg-[#1f1c1b] align-middle" />}</div>
                </button>
              );
            })}
            {!cards.length && !film.script.length && <p className="text-[13px] text-[#8a857f]">{film.state === "planning" ? "Gemini is writing the story…" : "No storyboard yet."}</p>}
          </div>
          <div className="mt-5 text-[13px] font-semibold">Pieces in this film</div>
          <div data-agent="pieces" className="mt-2 grid grid-cols-3 gap-2">
            {pieces.map((p) => (
              <div key={p.name} data-agent={`piece-${norm(p.name)}`} title={p.draw} className="flex h-[62px] flex-col items-center justify-center rounded-[10px] border border-[#e2e1da] bg-[#f7f5ee] px-1">
                <span className="text-[22px] leading-none">{emojiOf(p.name, p.draw)}</span>
                <span className="mt-0.5 w-full truncate text-center text-[10.5px] font-semibold text-[#5f5b57]">{p.name}</span>
              </div>
            ))}
            {!pieces.length && <p className="col-span-3 text-[12px] text-[#8a857f]">They appear when the storyboard is drawn.</p>}
          </div>
          {film.storyboard && <p className="mt-4 text-[12px] leading-snug text-[#8a857f]"><b className="text-[#5f5b57]">Ground:</b> {film.storyboard.ground}</p>}
        </Panel>

        {/* preview */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-[20px] bg-[#1f1c1b]">
          <div className="absolute inset-x-4 top-3 z-10 flex items-center gap-2">
            <div className="flex flex-none items-center gap-0.5 rounded-full bg-white/10 p-1">
              {([["select", MousePointer2], ["text", Type], ["move", Move]] as const).map(([id, I]) => (
                <span key={id} data-agent={`tool-${id}`} className={`grid size-7 place-items-center rounded-full ${(ui.on ? ui.tool : "select") === id ? "bg-[#a6f04a] text-[#1f1c1b]" : "text-white/70"}`}><I className="size-3.5" /></span>))}
            </div>
            <div className="flex flex-none items-center gap-0.5 rounded-full bg-white/10 p-1">
              {ANIMS.map((a) => <span key={a} data-agent={`anim-${a}`} className={`rounded-full px-2 py-1 text-[11.5px] font-bold ${ui.on && ui.anim === a ? "bg-[#a6f04a] text-[#1f1c1b]" : "text-white/70"}`}>{a}</span>)}
            </div>
            <AnimatePresence mode="wait">
              {ui.on && ui.task && <motion.div key={ui.task.n} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.3, ease }}
                className="hidden min-w-0 items-center gap-2 truncate rounded-full bg-black/55 py-1 pl-1 pr-3 text-[12.5px] text-white 2xl:flex">
                <span className="rounded-full bg-[#a6f04a] px-2 py-0.5 font-mono text-[11px] font-bold text-[#1f1c1b]">Task {ui.task.n}</span><span className="truncate font-semibold">{ui.task.title}</span></motion.div>}
            </AnimatePresence>
            <button type="button" onClick={() => { if (follow) d.stop(); setFollow(!follow); }} className={`ml-auto flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ${ui.on ? "bg-[#a6f04a] text-[#1f1c1b]" : "bg-white/10 text-white/70"}`}>
              <Eye className="size-3.5" />{ui.on ? "Watching Gemini work" : follow ? "Watch Gemini work · on" : "Watch Gemini work · off"}</button>
            <div className="flex flex-none gap-0.5 rounded-full bg-white/10 p-1">{[1, 1.5, 2].map((v) => <button key={v} type="button" onClick={() => setSpeed(v)} className={`rounded-full px-1.5 text-[11px] font-bold ${speed === v ? "bg-white text-[#1f1c1b]" : "text-white/70"}`}>{v}×</button>)}</div>
          </div>
          <div className="absolute inset-0 bottom-[76px] top-[46px] grid place-items-center p-4">
            <div className="relative aspect-video max-h-full w-full overflow-hidden rounded-[14px] bg-black">
              {ui.on && ui.canvas ? (
                <DirectorCanvas c={ui.canvas} ground={film.storyboard?.ground ?? ""} words={L[ui.canvas.scene]?.words ?? []} local={L[ui.canvas.scene] ? t - L[ui.canvas.scene].start : 0} capWord={ui.capWord} />
              ) : !cards.length && working ? (
                <div data-agent="canvas" className="absolute inset-0"><PlanningView film={film} live={live} /></div>
              ) : film.video && !working ? (
                <video ref={video} src={origin + film.video} className="h-full w-full" onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle} />
              ) : c && ln ? (<>
                <Animatic c={c} line={ln} local={local} ground={film.storyboard?.ground ?? ""} />
                <div className="absolute inset-x-0 bottom-4 flex justify-center px-6"><span className="rounded-[14px] bg-black/75 px-4 py-2 text-center text-[clamp(13px,1.5vw,18px)] font-bold text-white">
                  {ln.words.length ? ln.words.map((w, k) => <span key={k} style={{ color: k === word ? LIME : undefined }}>{w.w} </span>) : c.line}</span></div>
                <audio ref={voice} onEnded={() => { const n = L[cur + 1]; if (n) seek(n.start + 0.01); else setPlaying(false); }} />
              </>) : (
                <div data-agent="canvas" className="grid h-full place-items-center text-[15px] text-white/60"><span className="flex items-center gap-2">{working && <Loader2 className="size-4 animate-spin" />}{now?.text ?? "Nothing to show yet"}</span></div>
              )}
              {ui.on ? <DirectorOverlays ui={ui} lines={L.length} /> : rendering && <RenderProgress r={rendering} lines={L.length} />}
            </div>
          </div>
          <div className="absolute inset-x-4 bottom-[60px] h-1.5 cursor-pointer rounded-full bg-white/20" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * total); }}>
            <div className="relative h-full rounded-full bg-[#a6f04a]" style={{ width: at(t) }}><span className="absolute -right-2 -top-[5px] size-4 rounded-full border-2 border-[#1f1c1b] bg-white" /></div>
          </div>
          <div className="absolute inset-x-4 bottom-4 flex items-center gap-3">
            <span className="rounded-full bg-black/60 px-3 py-1.5 font-mono text-[13px] text-white">{fmt(t)} / {fmt(total)}</span>
            <div className="mx-auto flex items-center gap-1.5 rounded-full bg-black/60 p-1">
              <button type="button" onClick={() => seek((L[cur - 1] ?? L[0])?.start ?? 0)} className="grid size-8 place-items-center rounded-full text-white"><SkipBack className="size-4" /></button>
              <button type="button" data-agent="preview-play" onClick={toggle} disabled={!L.length} className="grid size-8 place-items-center rounded-full bg-[#a6f04a] text-[#1f1c1b]">{playing || ui.recording !== null ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
              <button type="button" onClick={() => L[cur + 1] && seek(L[cur + 1].start + 0.01)} className="grid size-8 place-items-center rounded-full text-white"><SkipForward className="size-4" /></button>
            </div>
            <span className="rounded-full bg-black/60 px-3 py-1.5 text-[12px] text-white/70">{label}</span>
          </div>
        </div>

        {/* right: what Gemini is doing, and the line under the playhead */}
        <div className="hidden w-[340px] shrink-0 flex-col gap-3 overflow-y-auto xl:flex">
          <div className="flex rounded-full border border-[#e2e1da] bg-white p-1">
            {(["Agent", "Card", "Captions", "Code", "Audio"] as const).map((x) => (
              <button key={x} type="button" data-agent={`tab-${x}`} onClick={() => setTab(x)} className="relative flex-1 rounded-full py-1.5 text-[13px] font-semibold">
                {tab === x && <motion.span layoutId="fed-tab" className="absolute inset-0 rounded-full bg-[#1f1c1b]" transition={{ duration: 0.3, ease }} />}
                <span className={`relative ${tab === x ? "text-white" : "text-[#5f5b57]"}`}>{x}</span>
              </button>
            ))}
          </div>
          {tab === "Agent" && (
            <Panel className="p-3">
              {ui.on && (ui.task || ui.next.length > 0) && (
                <div className="mb-3 rounded-[14px] bg-[#1f1c1b] p-3 text-white">
                  {ui.task && <div className="flex items-center gap-2 text-[13px] font-bold"><span className="size-2 animate-pulse rounded-full bg-[#a6f04a]" />Now: {ui.task.title}</div>}
                  {ui.task?.step && <div className="mt-0.5 pl-4 text-[12px] text-white/60">{ui.task.step}</div>}
                  {ui.next.length > 0 && <div className="mt-2 border-t border-white/10 pt-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-white/45">Up next</div>}
                  {ui.next.map((x, k) => <div key={x + k} className="mt-1 truncate text-[12.5px]" style={{ opacity: 1 - k * 0.13 }}>{k + 1}. {x}</div>)}
                </div>)}
              <div className="mb-2 flex items-center justify-between px-1"><div className="text-[12.5px] text-[#8a857f]">Every step, as Gemini makes the film</div>
                {working && <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#3f7d1e]"><span className="size-1.5 animate-pulse rounded-full bg-[#3f7d1e]" />live</span>}</div>
              <Feed film={film} live={live} onLine={(i) => { if (L[i]) seek(L[i].start + 0.01); setTab("Card"); }} />
              {film.cost && <p className="mt-2 border-t border-[#ecebe5] px-1 pt-2 text-[11.5px] text-[#8a857f]">Cost so far ${film.cost.total_usd.toFixed(3)}</p>}
            </Panel>
          )}
          {!c && tab === "Card" && <Panel className="p-4 text-[13px] text-[#8a857f]">The cards appear here once the storyboard is drawn.</Panel>}
          {c && tab === "Card" && <Panel className="p-4"><StoryCard key={c.id + c.status} slug={film.slug} c={c} locked={locked || ui.on} onChange={onChange} flat /></Panel>}
          {ln && tab === "Captions" && (
            <Panel className="p-4">
              <div className="text-[12.5px] text-[#8a857f]">Word timings (from the voice) · click to jump</div>
              <div className="mt-2 flex flex-wrap gap-1">{ln.words.map((w, k) => (
                <button key={k} type="button" data-agent={`word-${k}`} onClick={() => seek(ln.start + w.s + 0.01)} className={`rounded-[8px] px-1.5 py-0.5 text-[13px] ${k === word || (ui.on && ui.capWord === norm(w.w)) ? "bg-[#1f1c1b] text-[#a6f04a]" : "bg-[#f1f0ea]"}`}>
                  {w.w}<span className="ml-1 font-mono text-[10px] opacity-60">{w.s.toFixed(1)}</span></button>
              ))}</div>
            </Panel>
          )}
          {tab === "Code" && (
            <Panel className="p-4">
              {streaming ? (<>
                <div className="text-[12.5px] text-[#8a857f]">Gemini is writing it now</div>
                <div className="relative mt-2 h-[56vh] overflow-hidden rounded-[12px]"><CodeStream write={streaming} title={streaming.scene !== undefined ? `Scene${streaming.scene + 1}` : "film.tsx"} /></div>
              </>) : (<>
                <div className="flex items-center justify-between"><div className="text-[12.5px] text-[#8a857f]">Scene{cur + 1} in film.tsx</div>{code && <span className="flex items-center gap-1 text-[11.5px] text-[#8a857f]"><Code2 className="size-3" />{code.split("\n").length} lines in the file</span>}</div>
                {code ? <pre className="mt-2 max-h-[60vh] overflow-auto rounded-[12px] bg-[#16181d] p-3 font-mono text-[11.5px] leading-relaxed text-[#e6e3dc]">{sceneCode(code, cur + 1) || "This scene was not found in the file."}</pre>
                  : <p className="mt-2 text-[13px] text-[#8a857f]">No code yet: the film is written after every card is approved.</p>}
              </>)}
            </Panel>
          )}
          {tab === "Audio" && (
            <Panel className="p-4">
              {ln ? (<>
                <div className="flex items-center justify-between text-[12.5px] text-[#8a857f]"><span>Voice · line {cur + 1} · {ln.span.toFixed(1)} s</span>{ui.recording !== null && <span className="flex items-center gap-1 font-bold text-[#c0392b]"><span className="size-2 animate-pulse rounded-full bg-[#e8402c]" />REC</span>}</div>
                <div className="mt-2 flex h-10 items-center gap-[2px]">{ln.peaks.map((p, k) => <span key={k} className="flex-1 rounded-full bg-[#1f1c1b]" style={{ height: `${14 + p * 80}%`, opacity: k / ln.peaks.length < local / ln.span ? 0.85 : 0.25 }} />)}</div>
                {ln.voice && <audio key={ln.voice} src={origin + ln.voice} controls className="mt-3 w-full" />}
                <p className="mt-2 text-[12px] text-[#8a857f]">To change what is said, use <b>Edit words</b> on the card: only this line is voiced again.</p>
              </>) : <div className="flex items-center gap-2 text-[13px] text-[#8a857f]">{ui.recording !== null && <span className="size-2 animate-pulse rounded-full bg-[#e8402c]" />}{ui.recording !== null ? `Recording line ${ui.recording + 1}…` : "The voices appear once the lines are recorded."}</div>}
            </Panel>
          )}
          {tab !== "Agent" && now && (
            <button type="button" onClick={() => setTab("Agent")} className="flex items-center gap-2 rounded-[14px] bg-[#1f1c1b] px-3 py-2.5 text-left text-[12.5px] font-semibold text-white">
              <Loader2 className="size-3.5 flex-none animate-spin text-[#a6f04a]" /><span className="truncate">{now.text}{now.total ? ` · ${now.done}/${now.total}` : ""}</span></button>)}
        </div>
      </div>

      {/* timeline */}
      <Panel className="flex h-[196px] shrink-0 overflow-hidden">
        <div className="flex w-[118px] shrink-0 flex-col border-r border-[#e6e6df]">
          <div className="grid h-10 place-items-center border-b border-[#e6e6df] font-mono text-[14px] font-semibold">{fmt(t)}</div>
          {[[Captions, "Lines"], [Diamond, "Moves"], [Mic, "Voice"], [Check, "Approval"]].map(([I, n]) => {
            const Icon = I as typeof Captions;
            return <div key={n as string} className="flex flex-1 items-center gap-2 pl-4 text-[12px] font-semibold text-[#5f5b57]"><Icon className="size-4 text-[#1f1c1b]" />{n as string}</div>;
          })}
        </div>
        <div className="relative min-w-0 flex-1 cursor-pointer overflow-hidden" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * total); }}>
          <div className="relative h-10 border-b border-[#e6e6df] font-mono text-[12px] text-[#8a857f]">
            {L.length > 0 && ticks.map((x, i) => <span key={i} className="absolute top-3" style={{ left: at(x), transform: i === 0 ? "translateX(4px)" : i === 8 ? "translateX(calc(-100% - 4px))" : "translateX(-50%)" }}>{fmt(x)}</span>)}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-10 flex flex-col py-1">
            <div className="relative flex-1">{L.map((l) => <span key={l.i} data-agent={`tl-cap-${l.i}`} title={cards[l.i]?.line} className={`absolute inset-y-1 flex items-center truncate rounded-[8px] px-2 text-[12px] font-semibold ${l.i === cur ? "bg-[#1f1c1b] text-[#a6f04a]" : "bg-[#a6f04a]/45 text-[#2f5a12]"}`} style={{ left: `calc(${at(l.start)} + 2px)`, width: `calc(${wd(l)} - 4px)` }}>{cards[l.i]?.id} {cards[l.i]?.line ?? film.script[l.i]}</span>)}</div>
            <div className="relative flex-1">
              {L.map((l) => <span key={l.i} data-agent={`tl-move-${l.i}`} className="absolute inset-y-1 rounded-[8px] bg-[#f6f39a]/25" style={{ left: `calc(${at(l.start)} + 2px)`, width: `calc(${wd(l)} - 4px)` }} />)}
              {(ui.on ? ui.keys.map((k) => ({ x: (L[k.scene]?.start ?? 0) + k.at, label: k.label, key: `${k.scene}-${k.label}` }))
                : L.flatMap((l) => (cards[l.i]?.design.moves ?? []).map((m, k) => ({ x: l.start + wordAt(l, m.word), label: `"${m.word}" ${m.actor} ${m.verb}`, key: `${l.i}-${k}` })))).map((k) => (
                <motion.span key={k.key} title={k.label} initial={ui.on ? { scale: 0, rotate: 45 } : false} animate={{ scale: 1, rotate: 45 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="absolute top-1/2 -mt-[6px] size-3 border-2 border-[#1f1c1b] bg-[#f6f39a]" style={{ left: `calc(${at(k.x)} - 6px)` }} />))}
            </div>
            <div className="relative flex-1">{L.map((l) => (
              <span key={l.i} data-agent={`tl-voice-${l.i}`} className={`absolute inset-y-1 flex items-center gap-[2px] rounded-[6px] px-1 ${ui.recording === l.i ? "bg-[#e3f1ff]" : ""}`} style={{ left: `calc(${at(l.start)} + 2px)`, width: `calc(${wd(l)} - 4px)` }}>
                {l.peaks.map((p, k) => <span key={k} className={`flex-1 rounded-full ${ui.recording === l.i ? "bg-[#1f5a8a]" : "bg-[#1f1c1b]"}`} style={{ height: `${12 + p * 80}%`, opacity: l.start + (k / l.peaks.length) * l.span < t ? 0.85 : 0.25 }} />)}
              </span>))}</div>
            <div className="relative flex-1">{L.map((l) => cards[l.i] && (
              <span key={l.i} className={`absolute inset-y-1.5 flex items-center truncate rounded-[8px] px-2 text-[11px] font-bold ${statusTone(cards[l.i])}`} style={{ left: `calc(${at(l.start)} + 2px)`, width: `calc(${wd(l)} - 4px)` }}>
                {cards[l.i].status === "approved" ? "approved" : cards[l.i].status === "redrawing" ? "redrawing…" : "waiting"}{cards[l.i].changed ? " · changed" : ""}</span>))}</div>
          </div>
          <div className="pointer-events-none absolute bottom-0 top-0 w-0 border-l-2 border-dashed border-[#1f1c1b]" style={{ left: at(t) }}>
            <span className="absolute -left-[7px] top-1 h-3.5 w-3 rounded-[3px] bg-[#1f1c1b]" />
          </div>
        </div>
      </Panel>
      <FilmCursor cur={d.cur} />
    </div>
  );
}
