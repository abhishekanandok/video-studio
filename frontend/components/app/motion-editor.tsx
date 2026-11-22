"use client";

import { ArrowLeft, Captions, Clapperboard, Code2, Download, Eye, Image as ImageIcon, Layers, Lock, MessageSquare, Mic, MousePointer2, Move, Pause, Play, RotateCcw, Search, Settings2, SkipBack, SkipForward, Sparkles, Type, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LIME, ease } from "./kit";
import { DirectorCursor, useDirector, type Canvas, type DirectorSettings, type Tab } from "./agent-director";
import { AgentFeed, StageRail, WorkingCard, type Live, type Step } from "./motion-live";
import { FilmControls, StateChip } from "./motion-parts";
import { useApi } from "@/lib/api";

/* The editor for a motion film the agent made (backend/app/api/argon_api.py): the same layout as the editor prototype
   (components/app/editor.tsx), filled with the film's real parts. Left: every scene and every picture the agent found.
   Middle: the film (or, before it is rendered, each scene's still with its voice). Right: the scene under the playhead,
   what the agent planned for it, its backdrop, pictures and stills. Below: the timeline, from the real word timings:
   captions, pictures, visuals, voice waveform and backdrops. It refreshes while the agent is still working. */

export type Word = { w: string; s: number; e: number };
export type Asset = { name: string; kind: string; query: string; url: string };
export type EdScene = { i: number; line: string; beat: string; concept: string; backdrop_kind: string; backdrop_query: string; backdrop: string; stills: string[];
  code_lines: number; state: string; start: number; span: number; transition: string; data: string; voice: string; peaks: number[]; words: Word[]; assets: Asset[] };
export type EdFilm = { slug: string; topic: string; title: string; running: boolean; state: string; model: string; total: number; video: string; steps: Step[]; doing?: string; queue?: number;
  theme: { bg?: string[]; ink?: string; accent?: string; accent2?: string; paper?: string; font?: string; display?: string; layout?: string; mood?: string }; scenes: EdScene[] };

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const KIND: Record<string, string> = { photo: "Real photo", draw: "Painted", icon: "Icon", sticker: "Sticker", emoji: "Sticker", meme: "Meme", map: "Map", paint: "Painted", plain: "Plain" };

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-[#e6e6df] bg-white ${className}`}>{children}</div>;
}

/** a picture as the browser can show it: an animated sticker (lottie json) shows as its emoji */
function Pic({ url, origin, className = "" }: { url: string; origin: string; className?: string }) {
  const lottie = url.match(/anim-([0-9a-f_-]+)\.json/i);
  if (lottie) {
    let ch = "✨";
    try { ch = String.fromCodePoint(...lottie[1].split(/[_-]/).map((h) => parseInt(h, 16))); } catch { /* keep the sparkle */ }
    return <span className={`grid place-items-center text-[26px] ${className}`}>{ch}</span>;
  }
  if (!url) return <span className={`grid place-items-center text-[11px] text-[#a29d96] ${className}`}>not found</span>;
  return <img src={origin + url} alt="" className={`object-contain ${className}`} />;
}

export function MotionEditor({ film, origin, back }: { film: EdFilm; origin: string; back: string }) {
  const S = film.scenes;
  const total = Math.max(film.total, 0.1);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userTab, setTab] = useState<Tab>(film.running ? "Agent" : "Scene");
  const [follow, setFollow] = useState(film.running);
  const [settings, setSettings] = useState<DirectorSettings>({ speed: 1, sound: false });
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // what the agent is doing this second: polled fast while it runs
  const { data: live } = useApi<Live>(`/argon/${film.slug}/live`, { refreshInterval: (d) => (d && !d.running ? 0 : 1000) });
  const busy = live?.busy ?? [];
  const [q, setQ] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const voice = useRef<HTMLAudioElement>(null);
  const cur = Math.max(0, S.findIndex((s) => t < s.start + s.span) === -1 ? S.length - 1 : S.findIndex((s) => t < s.start + s.span));
  const sc = S[cur];
  const local = sc ? t - sc.start : 0;
  const word = sc ? sc.words.findIndex((w) => local < w.e) : -1;

  // with the rendered film the video is the clock; before it, a timer and each scene's own voice
  useEffect(() => {
    if (film.video || !playing) return;
    const id = setInterval(() => setT((x) => (x + 0.1 >= total ? 0 : x + 0.1)), 100);
    return () => clearInterval(id);
  }, [film.video, playing, total]);
  useEffect(() => {
    const a = voice.current;
    if (film.video || !a || !sc?.voice) return;
    if (!a.src.endsWith(sc.voice)) { a.src = origin + sc.voice; a.currentTime = Math.max(0, local); }
    if (playing) a.play().catch(() => {}); else a.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, playing, film.video, sc?.voice]);

  const seek = (x: number) => {
    const v = Math.min(Math.max(x, 0), total - 0.05);
    setT(v);
    if (video.current) video.current.currentTime = v;
    const s = S.find((s) => v < s.start + s.span);
    if (voice.current && s && !film.video) { voice.current.src = origin + s.voice; voice.current.currentTime = v - s.start; }
  };
  const toggle = () => {
    if (video.current) { if (video.current.paused) video.current.play(); else video.current.pause(); } else setPlaying(!playing);
  };
  // the agent working the editor, one task at a time (components/app/agent-director.tsx)
  const palette = [...(film.theme.bg ?? []), film.theme.accent, film.theme.accent2].filter(Boolean) as string[];
  const d = useDirector({ root, scenes: S, live, origin, active: follow, settings, onSeek: (x) => seek(x), palette });
  const ui = d.ui;
  const tab: Tab = ui.on && ui.tab ? ui.tab : userTab;
  const stamp = ui.stamp;
  const canvas = ui.on ? ui.canvas : null;
  const all = useMemo(() => S.flatMap((s) => s.assets.map((a) => ({ ...a, scene: s.i }))).filter((a) => ui.on || !q || (a.name + a.query + a.kind).toLowerCase().includes(q.toLowerCase())), [S, q, ui.on]);
  const ticks = Array.from({ length: 9 }, (_, i) => (i / 8) * total);
  // the timeline opens up around the scene in focus (the agent's while it works, else the playhead's): it gets a wide,
  // readable box and the other scenes share what is left; the focus moving on closes it again
  const focus = live?.running && busy.length ? busy[0] : cur;
  const fs = S[focus];
  const share = fs && S.length > 12 ? Math.min(0.5, Math.max(fs.span / total, 0.14)) : fs ? fs.span / total : 0;
  const rest = fs ? Math.max(total - fs.span, 0.1) : total;
  const pos = (x: number) => !fs ? x / total : x < fs.start ? (x / rest) * (1 - share)
    : x <= fs.start + fs.span ? (fs.start / rest) * (1 - share) + ((x - fs.start) / Math.max(fs.span, 0.01)) * share
    : ((x - fs.span) / rest) * (1 - share) + share;
  const unpos = (p: number) => { // a click on the timeline back to a time
    if (!fs) return p * total;
    const a = pos(fs.start), b = pos(fs.start + fs.span);
    return p < a ? (p / (1 - share)) * rest : p <= b ? fs.start + ((p - a) / Math.max(share, 0.0001)) * fs.span : ((p - share) / (1 - share)) * rest + fs.span;
  };
  const at = (x: number) => `${pos(x) * 100}%`;
  const wd = (s: EdScene) => `${(pos(s.start + s.span) - pos(s.start)) * 100}%`;
  const slide = "left .45s ease, width .45s ease";
  const thumb = (s: EdScene) => s.stills[1] ?? s.stills[0] ?? s.backdrop;
  const shown = sc ? (sc.stills.length ? sc.stills[Math.min(sc.stills.length - 1, Math.floor((local / sc.span) * sc.stills.length))] : sc.backdrop) : "";

  return (
    <div ref={root} className="relative flex h-dvh flex-col gap-3 p-3 text-[#1f1c1b]" style={{ background: "#efefea", fontFamily: "var(--font-baloo), system-ui, sans-serif" }}>
      {ui.on && ui.highlight && <style>{`[data-agent="${ui.highlight}"]{outline:3px solid #a6f04a;outline-offset:2px;border-radius:10px;transition:outline-color .2s}`}</style>}
      {/* top bar */}
      <div className="flex items-center gap-2">
        <Link href={back} className="flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-4 py-2 text-[14px] font-semibold"><ArrowLeft className="size-4" />Back</Link>
        <span className="ml-2 hidden truncate text-[16px] font-bold lg:block">{film.title || film.topic}</span>
        <StateChip state={film.state} queue={film.queue} />
        <FilmControls slug={film.slug} state={film.state} />
        <div className="mx-auto hidden min-w-0 md:block" title={`Made by ${film.model || "the agent"} · ${S.length} scenes · ${fmt(total)}`}>{film.steps && <StageRail steps={film.steps} doing={film.doing} />}</div>
        {film.theme.bg && <div className="hidden items-center gap-1 rounded-full border border-[#e2e1da] bg-white px-2 py-1.5 md:flex">
          {palette.map((c, i) => <span key={i} data-agent={`swatch-${i}`} className="size-5 rounded-full border border-black/10" style={{ background: c }} />)}
          <span className="ml-1 text-[12px] font-semibold text-[#5f5b57]">{film.theme.display}</span></div>}
        {!film.running && S.length > 0 && (ui.on
          ? <button type="button" onClick={() => { d.stop(); setFollow(false); }} className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-white px-3.5 py-1.5 text-[13.5px] font-bold"><Pause className="size-4" />Stop replay</button>
          : <button type="button" onClick={() => { setFollow(false); d.replay(); }} className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#f6f39a] px-3.5 py-1.5 text-[13.5px] font-bold shadow-[2px_2px_0_#1f1c1b]"><RotateCcw className="size-4" />Replay how the agent made it</button>)}
        <div className="relative">
          <button type="button" onClick={() => setMenu(!menu)} title="Agent view" className="grid size-9 place-items-center rounded-full border border-[#e2e1da] bg-white"><Settings2 className="size-4" /></button>
          <AnimatePresence>{menu && (
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
              className="absolute right-0 top-11 z-[60] w-[240px] rounded-[16px] border border-[#e2e1da] bg-white p-3 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.45)]">
              <div className="text-[12.5px] font-bold uppercase tracking-[0.06em] text-[#8a857f]">Agent view</div>
              <div className="mt-2 text-[13px] font-semibold">Speed</div>
              <div className="mt-1 flex gap-1">{[0.75, 1, 1.5, 2].map((v) => <button key={v} type="button" onClick={() => setSettings({ ...settings, speed: v })} className={`flex-1 rounded-full py-1 text-[13px] font-bold ${settings.speed === v ? "bg-[#1f1c1b] text-[#a6f04a]" : "bg-[#f1f0ea]"}`}>{v}×</button>)}</div>
              <button type="button" onClick={() => setSettings({ ...settings, sound: !settings.sound })} className="mt-3 flex w-full items-center justify-between rounded-[12px] bg-[#f7f5ee] px-3 py-2 text-[13px] font-semibold">
                <span className="flex items-center gap-2">{settings.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}Play the voice when it checks</span><span className={`h-5 w-9 rounded-full p-0.5 ${settings.sound ? "bg-[#a6f04a]" : "bg-[#d9d8d0]"}`}><span className={`block size-4 rounded-full bg-white transition-transform ${settings.sound ? "translate-x-4" : ""}`} /></span></button>
              <button type="button" onClick={() => { if (follow) d.stop(); setFollow(!follow); }} className="mt-2 flex w-full items-center justify-between rounded-[12px] bg-[#f7f5ee] px-3 py-2 text-[13px] font-semibold">
                <span className="flex items-center gap-2"><Eye className="size-4" />Show the agent working</span><span className={`h-5 w-9 rounded-full p-0.5 ${follow ? "bg-[#a6f04a]" : "bg-[#d9d8d0]"}`}><span className={`block size-4 rounded-full bg-white transition-transform ${follow ? "translate-x-4" : ""}`} /></span></button>
            </motion.div>)}</AnimatePresence>
        </div>
        <button type="button" onClick={toggle} className="grid size-9 place-items-center rounded-full border border-[#e2e1da] bg-white">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
        {film.video ? <a data-agent="render" href={origin + film.video} download className="flex items-center gap-1.5 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-4 py-1.5 text-[14px] font-bold shadow-[2px_2px_0_#1f1c1b]"><Download className="size-4" />Download</a>
          : <span data-agent="render" className="flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white px-4 py-1.5 text-[14px] font-semibold text-[#8a857f]"><Clapperboard className="size-4" />Not rendered yet</span>}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* left: scenes and pictures */}
        <Panel className="hidden w-[260px] shrink-0 flex-col overflow-y-auto p-4 lg:flex">
          <div className="text-[20px] font-bold">Visuals</div>
          <label data-agent="search" className="mt-3 flex items-center gap-2 rounded-full border border-[#e2e1da] px-3 py-1.5 text-[14px]"><Search className="size-4 text-[#8a857f]" />
            <input value={ui.on ? ui.search : q} onChange={(e) => setQ(e.target.value)} placeholder="Search pictures" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8a857f]" /></label>
          <div className="mt-4 text-[13px] font-semibold">This video's scenes</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {S.map((s) => (
              <button key={s.i} data-agent={`thumb-${s.i}`} type="button" onClick={() => seek(s.start + 0.01)} className={`relative h-[64px] overflow-hidden rounded-[12px] bg-[#1a2333] ${s.i === cur ? "ring-2 ring-[#a6f04a] ring-offset-1" : ""}`}>
                {thumb(s) && <img src={origin + thumb(s)} alt="" className="h-full w-full object-cover" />}
                <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 font-mono text-[10px] font-bold text-white">{String(s.i + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[13px] font-semibold"><span>Pictures the agent found</span><span className="text-[#8a857f]">{all.length}</span></div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {all.map((a) => (
              <motion.button key={a.scene + a.name} data-agent={`pic-${a.scene}-${a.name}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 22 }} type="button" title={`${a.name} · ${KIND[a.kind] ?? a.kind} · scene ${a.scene + 1}`} onClick={() => seek(S[a.scene].start + 0.01)}
                className={`relative h-[60px] rounded-[10px] border bg-[#f7f5ee] p-1 ${a.scene === cur ? "border-[#1f1c1b]" : "border-[#e2e1da]"}`}>
                <Pic url={a.url} origin={origin} className="h-full w-full" />
                <span className="absolute -right-1 -top-1 rounded-full bg-[#1f1c1b] px-1 font-mono text-[9px] font-bold text-[#a6f04a]">{a.scene + 1}</span>
              </motion.button>
            ))}
          </div>
          {film.theme.layout && <><div className="mt-4 text-[13px] font-semibold">Layout the agent chose</div><p className="mt-1 text-[12.5px] leading-snug text-[#5f5b57]">{film.theme.layout}</p></>}
        </Panel>

        {/* preview */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-[20px] bg-[#1f1c1b]">
          {/* preview or the agent's code, and what the agent is doing */}
          <div className="absolute inset-x-4 top-3 z-10 flex items-center gap-2">
            <div className="flex flex-none items-center gap-0.5 rounded-full bg-white/10 p-1">
              {([["select", MousePointer2], ["text", Type], ["move", Move], ["comment", MessageSquare]] as const).map(([id, I]) => (
                <span key={id} data-agent={`tool-${id}`} className={`grid size-7 place-items-center rounded-full ${(ui.on ? ui.tool : "select") === id ? "bg-[#a6f04a] text-[#1f1c1b]" : "text-white/70"}`}><I className="size-3.5" /></span>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {ui.on && ui.task && <motion.div key={ui.task.n} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.3, ease }}
                className="flex min-w-0 items-center gap-2 truncate rounded-full bg-black/55 py-1 pl-1 pr-3 text-[12.5px] text-white">
                <span className="rounded-full bg-[#a6f04a] px-2 py-0.5 font-mono text-[11px] font-bold text-[#1f1c1b]">Task {ui.task.n}</span>
                <span className="truncate font-semibold">{ui.task.title}</span>{ui.task.step && <span className="truncate text-white/60">· {ui.task.step}</span>}</motion.div>}
            </AnimatePresence>
            <button type="button" onClick={() => { if (follow) d.stop(); setFollow(!follow); }} className={`ml-auto flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ${ui.on ? "bg-[#a6f04a] text-[#1f1c1b]" : "bg-white/10 text-white/70"}`}>
              <Eye className="size-3.5" />{ui.on ? "Watching the agent" : "Watch the agent"}</button>
          </div>
          <div className="absolute inset-0 bottom-[76px] top-[40px] grid place-items-center p-4">
            <div data-agent="preview" className="relative aspect-video max-h-full w-full overflow-hidden rounded-[14px] bg-black">
              {canvas ? <CanvasView c={canvas} origin={origin} theme={film.theme} words={S[canvas.scene]?.words ?? []} audio={ui.audio} speed={settings.speed} capWord={ui.capWord} />
                : ui.on ? (  // the agent is at work and no scene is open yet: a blank project, not the finished film
                <div data-agent="canvas" className="absolute inset-0 grid place-items-center bg-[#0d1018]" style={{ backgroundImage: "linear-gradient(rgb(255 255 255/0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255/0.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }}>
                  <div className="text-center text-white/55"><div className="text-[18px] font-bold text-white/80">{film.title || film.topic}</div><div className="mt-1 text-[13px]">New project · {S.length} scenes · {fmt(total)}</div></div>
                </div>) : film.video ? (
                <video ref={video} src={origin + film.video} poster={S[0] && thumb(S[0]) ? origin + thumb(S[0]) : undefined} className="h-full w-full" onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle} />
              ) : (<>
                <AnimatePresence mode="popLayout">
                  {shown ? <motion.img key={shown} src={origin + shown} alt="" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease }} className="absolute inset-0 h-full w-full object-cover" />
                    : <motion.div key="wait" className="absolute inset-0 grid place-items-center text-[15px] text-white/60"><span className="flex items-center gap-2"><Sparkles className="size-4" />The agent is still making this scene</span></motion.div>}
                </AnimatePresence>
                {sc && <div className="absolute inset-x-0 bottom-4 flex justify-center px-6"><span className="rounded-[14px] bg-black/70 px-4 py-2 text-center text-[18px] font-bold text-white">
                  {sc.words.length ? sc.words.map((w, k) => <span key={k} style={{ color: k === word ? film.theme.accent || LIME : undefined }}>{w.w} </span>) : sc.line}</span></div>}
                <audio ref={voice} onEnded={() => { const n = S[cur + 1]; if (n) seek(n.start + 0.01); }} />
              </>)}
              <AnimatePresence>
                {stamp && <motion.div key={stamp.key} initial={{ opacity: 0, scale: 1.4, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: -3 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className={`pointer-events-none absolute right-5 top-5 rounded-[12px] border-[3px] px-4 py-2 text-[18px] font-extrabold shadow-[0_10px_30px_-8px_rgb(0_0_0/0.6)] ${stamp.tone === "ok" ? "border-[#1f1c1b] bg-[#a6f04a] text-[#1f1c1b]" : stamp.tone === "bad" ? "border-white bg-[#e8402c] text-white" : "border-[#1f1c1b] bg-white text-[#1f1c1b]"}`}>
                  {stamp.tone === "ok" ? "✓ " : stamp.tone === "bad" ? "! " : ""}{stamp.text}</motion.div>}
              </AnimatePresence>
            </div>
          </div>
          <AnimatePresence>{ui.on && ui.render && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 grid place-items-center bg-black/55 backdrop-blur-[2px]">
              <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-[min(420px,80%)] rounded-[18px] bg-white p-5 text-[#1f1c1b] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]">
                <div className="flex items-center gap-2 text-[17px] font-bold">{ui.render.ready ? <span className="grid size-7 place-items-center rounded-full bg-[#a6f04a]">✓</span> : <Clapperboard className="size-5" />}{ui.render.ready ? "The film is ready" : "Exporting · 1080p"}</div>
                <div className="mt-1 text-[13px] text-[#8a857f]">{S.length} scenes · {fmt(total)} · voice, captions and motion</div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#ecebe5]"><motion.div className="h-full rounded-full bg-[#a6f04a]" animate={{ width: `${(ui.render.ready ? 1 : ui.render.done / Math.max(1, ui.render.total)) * 100}%` }} transition={{ duration: 0.4 }} /></div>
                <div className="mt-2 flex justify-between font-mono text-[12px] text-[#8a857f]"><span>{ui.render.ready ? "done" : "rendering frames"}</span><span>{Math.round((ui.render.ready ? 1 : ui.render.done / Math.max(1, ui.render.total)) * 100)}%</span></div>
                <div className="mt-3 flex gap-1">{S.map((x) => <div key={x.i} className="h-9 flex-1 overflow-hidden rounded-[6px] bg-[#1a2333]" style={{ opacity: (ui.render!.ready ? 1 : ui.render!.done / Math.max(1, ui.render!.total)) * S.length > x.i ? 1 : 0.25 }}>{thumb(x) && <img src={origin + thumb(x)} alt="" className="h-full w-full object-cover" />}</div>)}</div>
              </motion.div>
            </motion.div>)}</AnimatePresence>
          <div className="absolute inset-x-4 bottom-[60px] h-1.5 cursor-pointer rounded-full bg-white/20" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * total); }}>
            <div className="relative h-full rounded-full bg-[#a6f04a]" style={{ width: at(t) }}><span className="absolute -right-2 -top-[5px] size-4 rounded-full border-2 border-[#1f1c1b] bg-white" /></div>
          </div>
          <div className="absolute inset-x-4 bottom-4 flex items-center gap-3">
            <span className="rounded-full bg-black/60 px-3 py-1.5 font-mono text-[13px] text-white">{fmt(t)} / {fmt(total)}</span>
            <span className="grid size-8 place-items-center rounded-full bg-black/60 text-white"><Volume2 className="size-4" /></span>
            <div className="mx-auto flex items-center gap-1.5 rounded-full bg-black/60 p-1">
              <button type="button" onClick={() => seek((S[cur - 1] ?? S[0])?.start ?? 0)} className="grid size-8 place-items-center rounded-full text-white"><SkipBack className="size-4" /></button>
              <button type="button" data-agent="preview-play" onClick={toggle} className="grid size-8 place-items-center rounded-full bg-[#a6f04a] text-[#1f1c1b]">{playing || ui.audio ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
              <button type="button" onClick={() => S[cur + 1] && seek(S[cur + 1].start + 0.01)} className="grid size-8 place-items-center rounded-full text-white"><SkipForward className="size-4" /></button>
            </div>
            {canvas ? <span className="rounded-full bg-black/60 px-3 py-1.5 text-[12px] text-white/70">Editing scene {canvas.scene + 1}</span>
              : !film.video && <span className="rounded-full bg-black/60 px-3 py-1.5 text-[12px] text-white/70">Preview from the agent's stills</span>}
          </div>
        </div>

        {/* right: the scene under the playhead */}
        <div className="hidden w-[310px] shrink-0 flex-col gap-3 overflow-y-auto xl:flex">
          {sc && <Panel className="p-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-[#e2e1da] px-2.5 py-0.5 text-[12.5px] font-semibold">Scene {sc.i + 1} · script</span>
              {sc.beat && <span className="rounded-full bg-[#f1f0ea] px-2.5 py-0.5 text-[12.5px] font-semibold text-[#5f5b57]">{sc.beat}</span>}
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-[#3d3935]">“{sc.line}”</p>
            <p className="mt-2 text-[13px] leading-snug text-[#8a857f]"><b className="text-[#5f5b57]">Visual:</b> {sc.concept || "being planned"}</p>
            {live?.running && live.scenes[String(sc.i)]?.state === "streaming" && (
              <div className="mt-3"><div className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#8a857f]">The agent is on this scene</div>
                <WorkingCard ls={live.scenes[String(sc.i)]} now={live.now} assets={sc.assets} /></div>)}
          </Panel>}
          <div className="flex rounded-full border border-[#e2e1da] bg-white p-1">
            {(["Agent", "Scene", "Captions", "Audio"] as const).map((x) => (
              <button key={x} data-agent={`tab-${x}`} type="button" onClick={() => setTab(x)} className="relative flex-1 rounded-full py-1.5 text-[14px] font-semibold">
                {tab === x && <motion.span layoutId="med-tab" className="absolute inset-0 rounded-full bg-[#1f1c1b]" transition={{ duration: 0.3, ease }} />}
                <span className={`relative ${tab === x ? "text-white" : "text-[#5f5b57]"}`}>{x}</span>
              </button>
            ))}
          </div>
          {tab === "Agent" && (
            <Panel className="p-3">
              <div className="mb-2 flex items-center justify-between px-1"><div className="text-[12.5px] text-[#8a857f]">Every step the agent takes</div>
                {live?.running && <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#3f7d1e]"><span className="size-1.5 animate-pulse rounded-full bg-[#3f7d1e]" />live</span>}</div>
              {ui.on && (ui.task || ui.next.length > 0) && (
                <div className="mb-3 rounded-[14px] bg-[#1f1c1b] p-3 text-white">
                  {ui.task && <div className="flex items-center gap-2 text-[13px] font-bold"><span className="size-2 animate-pulse rounded-full bg-[#a6f04a]" />Now: {ui.task.title}</div>}
                  {ui.task?.step && <div className="mt-0.5 pl-4 text-[12px] text-white/60">{ui.task.step}</div>}
                  {ui.next.length > 0 && <div className="mt-2 border-t border-white/10 pt-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-white/45">Up next</div>}
                  <AnimatePresence initial={false}>{ui.next.map((x, k) => <motion.div key={x + k} layout initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1 - k * 0.13, x: 0 }} exit={{ opacity: 0 }} className="mt-1 truncate text-[12.5px]">{k + 1}. {x}</motion.div>)}</AnimatePresence>
                </div>)}
              <AgentFeed live={live} origin={origin} onScene={(i) => { setFollow(false); d.stop(); if (S[i]) seek(S[i].start + 0.01); }} />
            </Panel>
          )}
          {sc && tab === "Scene" && (<>
            <Panel className="p-4">
              <div className="text-[12.5px] text-[#8a857f]">Selected layer</div>
              <div className="text-[18px] font-bold">Motion</div>
              <div className="mt-2 grid grid-cols-5 gap-1.5">{["Pop", "Slide", "Float", "Draw", "Zoom"].map((m) => (
                <span key={m} data-agent={`anim-${m}`} className={`grid h-10 place-items-center rounded-[10px] text-[12px] font-bold ${ui.on && ui.anim === m ? "border-2 border-[#1f1c1b] bg-[#a6f04a] shadow-[2px_2px_0_#1f1c1b]" : "border border-[#e2e1da] bg-[#f7f5ee]"}`}>{m}</span>
              ))}</div>
              {ui.on && ui.keys.filter((k) => k.scene === sc.i).map((k) => <p key={k.label} className="mt-2 text-[12.5px] text-[#5f5b57]">◆ {k.label} · {k.at.toFixed(1)}s</p>)}
            </Panel>
            <Panel className="p-4">
              <div className="text-[12.5px] text-[#8a857f]">Backdrop</div>
              <div className="text-[18px] font-bold">{KIND[sc.backdrop_kind] ?? (sc.backdrop_kind || "Theme")}</div>
              {sc.backdrop && <img src={origin + sc.backdrop} alt="" className="mt-2 aspect-video w-full rounded-[10px] object-cover" />}
              {sc.backdrop_query && <p className="mt-1.5 text-[12.5px] leading-snug text-[#8a857f]">{sc.backdrop_query}</p>}
            </Panel>
            <Panel className="p-4">
              <div className="text-[12.5px] text-[#8a857f]">On screen</div>
              <div className="text-[18px] font-bold">{sc.assets.length} pictures</div>
              <div className="mt-2 space-y-2">
                {sc.assets.map((a) => (
                  <div key={a.name} className="flex items-center gap-2.5">
                    <span className="size-12 flex-none rounded-[10px] border border-[#ecebe5] bg-[#f7f5ee] p-1"><Pic url={a.url} origin={origin} className="h-full w-full" /></span>
                    <div className="min-w-0"><div className="truncate text-[13px] font-semibold">{a.name.replace(/[_-]/g, " ")}</div><div className="truncate text-[11.5px] text-[#8a857f]">{KIND[a.kind] ?? a.kind} · {a.query}</div></div>
                  </div>
                ))}
              </div>
              {sc.data && <p className="mt-3 rounded-[10px] bg-[#f1fbe3] px-2.5 py-1.5 text-[12.5px] text-[#2f5a12]"><b>Data:</b> {sc.data}</p>}
            </Panel>
            <Panel className="p-4">
              <div className="flex items-center justify-between"><div className="text-[12.5px] text-[#8a857f]">What the agent drew</div>
                {sc.code_lines > 0 && <span className="flex items-center gap-1 text-[11.5px] text-[#8a857f]"><Code2 className="size-3" />{sc.code_lines} lines</span>}</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">{sc.stills.map((u, k) => <img key={u} src={origin + u} alt={["early", "middle", "end"][k]} className="aspect-video w-full rounded-[8px] object-cover" />)}</div>
              {!sc.stills.length && <p className="mt-1 text-[12.5px] text-[#8a857f]">Not drawn yet.</p>}
              <p className="mt-2 text-[12px] text-[#8a857f]">Enters with: <b>{sc.transition || "fade"}</b></p>
            </Panel>
          </>)}
          {sc && tab === "Captions" && (
            <Panel className="p-4">
              <div className="text-[12.5px] text-[#8a857f]">Word timings (from the voice)</div>
              <div className="mt-2 flex flex-wrap gap-1">{sc.words.map((w, k) => (
                <button key={k} data-agent={`word-${k}`} type="button" onClick={() => seek(sc.start + w.s + 0.01)} className={`rounded-[8px] px-1.5 py-0.5 text-[13px] ${k === word || (ui.on && ui.capWord === w.w.replace(/[^\p{L}\p{N}'-]/gu, "").toLowerCase()) ? "bg-[#1f1c1b] text-[#a6f04a]" : "bg-[#f1f0ea]"}`}>
                  {w.w}<span className="ml-1 font-mono text-[10px] opacity-60">{w.s.toFixed(1)}</span></button>
              ))}</div>
            </Panel>
          )}
          {sc && tab === "Audio" && (
            <Panel className="p-4">
              <div className="text-[12.5px] text-[#8a857f]">Voice · scene {sc.i + 1}</div>
              <div className="flex items-center gap-3">
                <span data-agent="audio-play" className={`grid size-10 flex-none place-items-center rounded-full border-2 border-[#1f1c1b] ${ui.audio ? "bg-[#1f1c1b] text-[#a6f04a]" : "bg-[#a6f04a]"}`}>{ui.audio ? <Pause className="size-4" /> : <Play className="size-4" />}</span>
                <div className="relative flex h-10 flex-1 items-center gap-[2px]">
                  {sc.peaks.map((p, k) => <span key={k} className="flex-1 rounded-full bg-[#1f1c1b]" style={{ height: `${14 + p * 80}%`, opacity: 0.25 }} />)}
                  {ui.audio && ui.audio.scene === sc.i && <motion.div key={ui.audio.key} className="absolute inset-y-0 left-0 flex items-center gap-[2px] overflow-hidden" initial={{ width: "0%" }} animate={{ width: `${(ui.audio.dur / Math.max(sc.span, 0.1)) * 100}%` }} transition={{ duration: ui.audio.dur / settings.speed, ease: "linear" }} />}
                </div>
                <span className="font-mono text-[12px] text-[#8a857f]">{sc.span.toFixed(1)}s</span>
              </div>
              {ui.audio && ui.audio.scene === sc.i && <motion.div key={`bar-${ui.audio.key}`} className="mt-2 h-1 rounded-full bg-[#a6f04a]" initial={{ width: "0%" }} animate={{ width: `${(ui.audio.dur / Math.max(sc.span, 0.1)) * 100}%` }} transition={{ duration: ui.audio.dur / settings.speed, ease: "linear" }} />}
              {!ui.on && sc.voice && <audio key={sc.voice} src={origin + sc.voice} controls className="mt-3 w-full" />}
            </Panel>
          )}
        </div>
      </div>

      {/* timeline */}
      <Panel className="flex h-[236px] shrink-0 overflow-hidden">
        <div className="flex w-[118px] shrink-0 flex-col border-r border-[#e6e6df]">
          <div className="grid h-10 place-items-center border-b border-[#e6e6df] font-mono text-[14px] font-semibold">{fmt(t)}</div>
          {[[Captions, "Captions"], [ImageIcon, "Pictures"], [Layers, "Visuals"], [Mic, "Voice"], [Eye, "Backdrop"]].map(([I, n]) => {
            const Icon = I as typeof Captions;
            return <div key={n as string} title={n as string} className="flex flex-1 items-center justify-center gap-2.5 text-[#8a857f]"><Icon className="size-4 text-[#1f1c1b]" /><Lock className="size-3.5" /><Eye className="size-3.5" /></div>;
          })}
        </div>
        <div className="relative min-w-0 flex-1 cursor-pointer overflow-hidden" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(unpos((e.clientX - r.left) / r.width)); }}>
          <div className="relative h-10 border-b border-[#e6e6df] font-mono text-[12px] text-[#8a857f]">
            {S.length > 0 && ticks.map((x, i) => <span key={i} className="absolute top-3" style={{ left: at(x), transform: i === 0 ? "translateX(4px)" : i === 8 ? "translateX(calc(-100% - 4px))" : "translateX(-50%)" }}>{fmt(x)}</span>)}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-10 flex flex-col py-1">
            {/* captions */}
            <div className="relative flex-1">{S.map((s) => <span key={s.i} data-agent={`tl-cap-${s.i}`} title={s.line} className={`absolute inset-y-1 flex items-center truncate rounded-[8px] px-2 text-[12px] font-semibold ${s.i === cur ? "bg-[#1f1c1b] text-[#a6f04a]" : "bg-[#a6f04a]/45 text-[#2f5a12]"}`} style={{ left: `calc(${at(s.start)} + 2px)`, width: `calc(${wd(s)} - 4px)`, transition: slide }}>{s.line}</span>)}</div>
            {/* pictures */}
            <div className="relative flex-1">{S.map((s) => (
              <span key={s.i} data-agent={`tl-pics-${s.i}`} className="absolute inset-y-1 flex items-center gap-1 overflow-hidden rounded-[8px] border border-[#e2e1da] bg-[#f7f5ee] px-1" style={{ left: `calc(${at(s.start)} + 2px)`, width: `calc(${wd(s)} - 4px)`, transition: slide }}>
                {s.assets.filter((a) => a.url).map((a) => <Pic key={a.name} url={a.url} origin={origin} className="size-6 flex-none text-[16px]" />)}
                <span className="truncate text-[11px] font-semibold text-[#5f5b57]">{s.assets.map((a) => a.name.replace(/[_-]/g, " ")).join(", ")}</span>
              </span>))}</div>
            {/* visuals */}
            <div className="relative flex-1">{S.map((s) => (
              <span key={s.i} data-agent={`tl-vis-${s.i}`} className={`absolute inset-y-0.5 flex overflow-hidden rounded-[8px] bg-[#1a2333] ${busy.includes(s.i) ? "ring-2 ring-[#a6f04a]" : ""}`} style={{ left: `calc(${at(s.start)} + 2px)`, width: `calc(${wd(s)} - 4px)`, transition: slide }}>
                {(s.stills.length ? s.stills : s.backdrop ? [s.backdrop] : []).map((u) => <img key={u} src={origin + u} alt="" className="h-full min-w-0 flex-1 object-cover" />)}
                {busy.includes(s.i) && <motion.span className="absolute inset-0 flex items-center justify-center bg-[#a6f04a]/25 text-[11px] font-bold text-white" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5"><Code2 className="size-3" />{live?.scenes[String(s.i)]?.action ?? "working"}</span></motion.span>}
              </span>))}
              {ui.on && ui.keys.map((k) => { const sc2 = S[k.scene]; if (!sc2) return null; return (
                <motion.span key={`${k.scene}-${k.label}`} title={k.label} initial={{ scale: 0, rotate: 45 }} animate={{ scale: 1, rotate: 45 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="absolute top-1/2 z-10 -mt-[7px] size-[14px] border-2 border-[#1f1c1b] bg-[#a6f04a]" style={{ left: `calc(${at(sc2.start + k.at)} - 7px)` }} />); })}
            </div>
            {/* voice */}
            <div className="relative flex-1">{S.map((s) => (
              <span key={s.i} data-agent={`tl-voice-${s.i}`} className="absolute inset-y-1 flex items-center gap-[2px] px-1" style={{ left: `calc(${at(s.start)} + 2px)`, width: `calc(${wd(s)} - 4px)`, transition: slide }}>
                {s.peaks.map((p, k) => <span key={k} className="flex-1 rounded-full bg-[#1f1c1b]" style={{ height: `${12 + p * 80}%`, opacity: s.start + (k / s.peaks.length) * s.span < t ? 0.85 : 0.25 }} />)}
              </span>))}</div>
            {/* backdrops */}
            <div className="relative flex-1">{S.map((s) => (
              <span key={s.i} data-agent={`tl-bd-${s.i}`} className="absolute inset-y-1 flex items-center gap-1.5 truncate rounded-[8px] bg-[#f6f39a] px-2 text-[11.5px] font-semibold" style={{ left: `calc(${at(s.start)} + 2px)`, width: `calc(${wd(s)} - 4px)`, transition: slide }}>
                {KIND[s.backdrop_kind] ?? (s.backdrop_kind || "theme")} · {s.transition || "fade"}</span>))}</div>
          </div>
          <div className="pointer-events-none absolute bottom-0 top-0 w-0 border-l-2 border-dashed border-[#1f1c1b]" style={{ left: at(t) }}>
            <span className="absolute -left-[7px] top-1 h-3.5 w-3 rounded-[3px] bg-[#1f1c1b]" />
          </div>
        </div>
      </Panel>
      <DirectorCursor cur={d.cur} origin={origin} />
    </div>
  );
}

/** the scene on the editor's canvas while the agent builds it: its backdrop, the pictures it drags in (with selection
    handles), the words it types, each with the motion it gave them; "play" re-runs their entrances with the voice */
function CanvasView({ c, origin, theme, words, audio, speed, capWord }: { c: Canvas; origin: string; theme: EdFilm["theme"]; words: Word[]; audio: { scene: number; from: number; dur: number; key: number } | null; speed: number; capWord: string | null }) {
  const [now, setNow] = useState(0);  // where the voice is, while the agent plays the scene: the captions follow it word by word
  useEffect(() => {
    if (!audio) return;
    const id = setInterval(() => setNow(audio.from + ((Date.now() - audio.key) / 1000) * speed), 80);
    return () => clearInterval(id);
  }, [audio, speed]);
  const playing = audio && audio.scene === c.scene;
  let wi = playing ? words.findIndex((w) => now < w.e) : -1;
  if (playing && wi < 0) wi = words.length - 1;
  const from = Math.max(0, Math.floor(Math.max(wi, 0) / 7) * 7);
  const bg = theme.bg?.length ? `linear-gradient(135deg, ${theme.bg.join(", ")})` : "radial-gradient(circle at 50% 40%, #26344a, #10141c)";
  const lum = (h?: string) => { const m = h?.match(/^#?([0-9a-f]{6})$/i); if (!m) return 0; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const light = !c.backdrop && c.ground && lum(theme.bg?.[0]) > 0.6;  // a pale ground: the words go dark, as the film's own ink
  const ink = light ? theme.ink || "#1f1c1b" : "#fff";
  const enter = (anim?: string) => anim === "Slide" ? { x: -80, opacity: 0 } : anim === "Zoom" ? { scale: 1.6, opacity: 0 } : anim === "Draw" ? { clipPath: "inset(0 100% 0 0)" } : anim === "Float" ? { y: 30, opacity: 0 } : { scale: 0.2, opacity: 0 };
  const shown = { x: 0, y: 0, scale: 1, opacity: 1, clipPath: "inset(0 0% 0 0)" };
  return (
    <div data-agent="canvas" className="absolute inset-0 overflow-hidden" style={{ background: c.ground && !c.backdrop ? bg : "#0d1018" }}>
      <AnimatePresence>{c.backdrop && <motion.img key={c.backdrop} src={origin + c.backdrop} alt="" initial={{ opacity: 0, scale: 1.15 }} animate={c.drift ? { opacity: 1, scale: [1.02, 1.12], x: ["0%", "-2%"] } : { opacity: 1, scale: 1.02 }}
        transition={c.drift ? { opacity: { duration: 1 }, scale: { duration: 14, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }, x: { duration: 14, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } } : { duration: 1.1, ease }} className="absolute inset-0 h-full w-full object-cover" />}</AnimatePresence>
      {!c.ground && <div className="absolute inset-0 grid place-items-center text-[14px] text-white/40">Empty scene · {c.scene + 1}</div>}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(rgb(255 255 255/0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255/0.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <AnimatePresence initial={false}>{c.real && <motion.div key={c.real} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease }} className="absolute inset-0">
        <img src={origin + c.real} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-semibold text-white">The agent's real frame · scene {c.scene + 1}</span>
      </motion.div>}</AnimatePresence>
      {c.layers.filter((l) => l.kind === "fx").map((l) => <Fx key={l.id} l={l} accent={theme.accent} />)}
      {c.layers.filter((l) => l.kind !== "fx").map((l) => (
        <motion.div key={l.id} data-agent={`layer-${l.id}`} className="absolute" initial={false} animate={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%` }} transition={{ type: "spring", stiffness: 140, damping: 20 }}>
          <motion.div key={`${l.id}-${c.play}`} initial={c.play ? enter(l.anim) : { scale: 0.5, opacity: 0 }} animate={shown}
            transition={{ duration: c.play ? 0.7 : 0.35, delay: c.play ? Math.min(3.5, l.at ?? 0) : 0, ease }}>
            {l.kind === "pic" && l.url ? <Pic url={l.url} origin={origin} className="aspect-square w-full drop-shadow-[0_10px_18px_rgb(0_0_0/0.45)]" />
              : <div className={l.small ? "inline-block whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[clamp(10px,1.1vw,15px)] font-bold text-[#1f1c1b] shadow-[0_4px_12px_rgb(0_0_0/0.35)]"
                  : `whitespace-nowrap text-[clamp(16px,3.2vw,40px)] font-extrabold leading-tight ${light ? "" : "[text-shadow:0_3px_12px_rgb(0_0_0/0.5)]"}`} style={{ color: l.small ? undefined : l.color ?? ink }}>
                  {(l.text ?? "").slice(0, l.typed ?? 0).split(" ").map((w, k, a) => <span key={k} style={{ color: !l.small && !l.color && k === a.length - 1 && a.length > 1 ? theme.accent : undefined }}>{w}{k < a.length - 1 ? " " : ""}</span>)}
                  {(l.typed ?? 0) < (l.text ?? "").length && <motion.span className="ml-0.5 inline-block h-[0.9em] w-[3px] bg-[#a6f04a] align-middle" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />}
                </div>}
          </motion.div>
          {c.selected === l.id && (<>
            <div className="pointer-events-none absolute -inset-1.5 rounded-[4px] border-2 border-[#a6f04a]" />
            {[["-left-2.5 -top-2.5", ""], ["-right-2.5 -top-2.5", ""], ["-left-2.5 -bottom-2.5", ""], ["-right-2.5 -bottom-2.5", `h-${l.id}`]].map(([pos, id]) => (
              <span key={pos} data-agent={id || undefined} className={`absolute ${pos} size-3.5 rounded-[3px] border-2 border-[#1f1c1b] bg-white`} />))}
            <span className="absolute -top-7 left-0 whitespace-nowrap rounded-[6px] bg-[#a6f04a] px-1.5 py-0.5 text-[10.5px] font-bold text-[#1f1c1b]">{l.kind === "text" ? "Text" : l.id.split("-").slice(1).join(" ").replace(/[_-]/g, " ")}{l.anim ? ` · ${l.anim}` : ""}</span>
          </>)}
        </motion.div>
      ))}

      {playing && words.length > 0 && <div className="absolute inset-x-0 bottom-3 flex justify-center px-6"><span className="rounded-[12px] bg-black/70 px-3 py-1.5 text-center text-[clamp(13px,1.5vw,20px)] font-bold text-white">
        {words.slice(from, from + 7).map((w, k) => { const on = from + k === wi, key = w.w.replace(/[^\p{L}\p{N}'-]/gu, "").toLowerCase() === capWord;
          return <span key={k} className={key ? "rounded-[4px] px-0.5" : ""} style={{ color: on ? theme.accent || LIME : undefined, background: key ? "rgb(166 240 74 / 0.3)" : undefined }}>{w.w} </span>; })}</span></div>}
    </div>
  );
}

/** the moving pieces the agent writes (video/src/argon/kit.tsx: Particles, Water, Sun, FlowPath, MarkerCircle), drawn in the editor */
function Fx({ l, accent }: { l: Canvas["layers"][number]; accent?: string }) {
  const up = /rising|Vapour|Bubbles|Sparks/i.test(l.variant ?? ""), rain = /Rain|Drops/i.test(l.variant ?? ""), mist = /Mist/i.test(l.variant ?? "");
  const seeded = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  if (l.fx === "particles") return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {Array.from({ length: mist ? 8 : 26 }, (_, i) => {
        const x = seeded(i, 1) * 100, d = (rain ? 0.9 : up ? 5 : 9) * (0.6 + seeded(i, 2) * 0.8), sz = rain ? 2 : mist ? 160 : up ? 26 + seeded(i, 3) * 40 : 4;
        return <motion.span key={i} className="absolute" style={{ left: `${x}%`, width: sz, height: rain ? 40 : mist ? sz * 0.6 : sz * (up ? 0.7 : 1), borderRadius: rain ? 2 : "50%",
          background: rain ? "linear-gradient(rgb(210 230 255/0), rgb(210 230 255/0.8))" : "rgb(255 255 255/0.8)", filter: up || mist ? `blur(${sz * 0.25}px)` : undefined, rotate: rain ? 12 : 0 }}
          initial={{ top: up ? "105%" : "-10%", opacity: 0 }} animate={{ top: up ? "-15%" : "110%", opacity: up ? [0, 0.6, 0] : mist ? [0, 0.25, 0] : [0, 0.9, 0.9] }}
          transition={{ duration: d, repeat: Infinity, delay: seeded(i, 4) * d, ease: "linear" }} />;
      })}
    </motion.div>);
  if (l.fx === "water") return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: `${l.y * 100}%` }}>
      {[0, 1, 2].map((k) => <motion.svg key={k} viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute left-0 h-full w-[200%]" style={{ top: k * 10, opacity: 0.45 + k * 0.2 }}
        animate={{ x: ["0%", "-50%"] }} transition={{ duration: 6 - k * 1.5, repeat: Infinity, ease: "linear" }}>
        <path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 T 250 10 T 300 10 T 350 10 T 400 10 V 40 H 0 Z" fill="#2a7fb8" /></motion.svg>)}
    </div>);
  if (l.fx === "sun") { const a = Number(l.variant || 135); return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 7 }, (_, i) => <motion.div key={i} className="absolute h-[60px] origin-left blur-[8px]" style={{ left: `${(l.x + l.w / 2) * 100}%`, top: `${(l.y + l.w / 2) * 100}%`, width: "130%", rotate: a - 24 + i * 8,
        background: "linear-gradient(90deg, rgb(255 210 122/0.45), rgb(255 210 122/0) 70%)" }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }} />)}
      <motion.div className="absolute aspect-square rounded-full" style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%`, background: "radial-gradient(circle at 40% 40%, #fff, #ffd27a)", boxShadow: "0 0 80px #ffd27a" }}
        initial={{ scale: 0 }} animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }} />
    </div>); }
  if (l.fx === "flow") return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 56" preserveAspectRatio="none">
      <motion.path d="M10 46 C 30 40, 40 20, 60 22 S 85 10, 92 8" fill="none" stroke={accent ?? "#a6f04a"} strokeWidth="0.8" strokeLinecap="round" strokeDasharray="3 2.5"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1, strokeDashoffset: [0, -11] }} transition={{ pathLength: { duration: 1 }, strokeDashoffset: { duration: 1, repeat: Infinity, ease: "linear" } }} />
    </svg>);
  if (l.fx === "marker") return (
    <svg className="pointer-events-none absolute" style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%`, height: `${l.w * 180}%` }} viewBox="0 0 100 100" preserveAspectRatio="none">
      <motion.ellipse cx="50" cy="50" rx="47" ry="45" fill="none" stroke={accent ?? "#a6f04a"} strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
    </svg>);
  return null;
}
