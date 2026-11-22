"use client";

import { Pause, Play, SkipForward } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MEDIA } from "./studio";
import { Sheet, cx } from "./ui";

type Line = { speaker: string; text: string; speech: string; audio: string | null; pause?: number };
export type PlayableScene = { image: string | null; move?: string; transition?: string; notes?: { text: string; line: number }[]; lines: Line[]; audio?: string | null };

/** Same rule as the film (video/doc.py film_speed): speed a take up to the target words per minute, between 1.0x and 1.3x. */
const TARGET_WPM = 145;
const paceRate = (text: string, seconds: number) =>
  seconds > 0 ? Math.max(1, Math.min(1.3, TARGET_WPM / ((text.split(/\s+/).filter(Boolean).length / seconds) * 60))) : 1.1;

/** Where each line sits inside a scene's single conversation take (same split the renderer uses). */
const offsets = (lines: Line[], total: number) => {
  const w = lines.map((l) => Math.max((l.speech || l.text).length, 10) + 12);
  const sum = w.reduce((a, b) => a + b, 0);
  let at = 0;
  return w.map((x) => { const o = at; at += (total * x) / sum; return o; });
};

/** Preview scenes instantly in the app: image + camera move, notes on cue, subtitles, and the recorded voices in order.
 *  Lines without a recording are paced on screen (~2.6 words a second) so the timing still reads right. */
export function ScenePlayer({ open, onClose, scenes, title }: { open: boolean; onClose: () => void; scenes: PlayableScene[]; title: string }) {
  const [sc, setSc] = useState(0);
  const [ln, setLn] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [t0, setT0] = useState(0);
  const [, tick] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scene = scenes[sc];
  const line = scene?.lines[ln];

  const stop = () => {
    audio.current?.pause();
    if (timer.current) clearTimeout(timer.current);
  };
  const next = useCallback(() => {
    stop();
    if (!scene) return;
    if (ln + 1 < scene.lines.length) setLn(ln + 1);
    else if (sc + 1 < scenes.length) { setSc(sc + 1); setLn(0); setT0(Date.now()); }
    else setPlaying(false);
  }, [sc, ln, scene, scenes.length]);

  useEffect(() => { if (open) { setSc(0); setLn(0); setPlaying(true); setT0(Date.now()); } else stop(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {  // a two-voice scene: play its one conversation take and follow it line by line
    if (!open || !playing || !scene?.audio) return;
    const a = new Audio(`${MEDIA}${scene.audio}`);
    a.onloadedmetadata = () => { a.playbackRate = paceRate(scene.lines.map((l) => l.speech || l.text).join(" "), a.duration); };
    a.ontimeupdate = () => {
      if (!a.duration) return;
      const o = offsets(scene.lines, a.duration);
      let k = 0;
      while (k + 1 < o.length && a.currentTime >= o[k + 1]) k++;
      setLn(k);
    };
    a.onended = () => {
      if (sc + 1 < scenes.length) { setSc(sc + 1); setLn(0); setT0(Date.now()); } else setPlaying(false);
    };
    a.play().catch(() => {});
    audio.current = a;
    return () => a.pause();
  }, [open, playing, sc]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || !playing || !line || scene?.audio) return;
    const gap = (line.pause ?? 0.2) * 1000;
    if (line.audio) {
      const a = new Audio(`${MEDIA}${line.audio}`);
      a.onloadedmetadata = () => { a.playbackRate = paceRate(line.speech || line.text, a.duration); };
      a.onended = () => { timer.current = setTimeout(next, gap); };
      a.play().catch(() => { timer.current = setTimeout(next, 2500); });
      audio.current = a;
    } else {
      timer.current = setTimeout(next, Math.max(1800, (line.speech || line.text).split(/\s+/).length / 2.6 * 1000) + gap);
    }
    return stop;
  }, [open, playing, sc, ln]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // redraw the camera move smoothly
    if (!open || !playing) return;
    const id = setInterval(() => tick((x) => x + 1), 50);
    return () => clearInterval(id);
  }, [open, playing]);

  if (!scene) return null;
  const k = Math.min(1, (Date.now() - t0) / 12000);
  const cam = { push: `scale(${1.03 + 0.1 * k})`, pull: `scale(${1.13 - 0.1 * k})`, pan_left: `scale(1.12) translateX(${3 - 6 * k}%)`,
    pan_right: `scale(1.12) translateX(${-3 + 6 * k}%)` }[scene.move ?? "push"] ?? `scale(${1.03 + 0.08 * k})`;
  const notes = (scene.notes ?? []).filter((n) => n.line <= ln);
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={`Scene ${sc + 1} of ${scenes.length} · line ${ln + 1} of ${scene.lines.length}`} wide>
      <div className="relative aspect-video overflow-hidden bg-black">
        {scene.image ? <img src={`${MEDIA}${scene.image}`} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-100" style={{ transform: cam }} />
          : <div className="absolute inset-0 grid place-items-center text-sm text-white/60">Image not painted yet</div>}
        <div className="absolute right-4 top-4 flex max-w-[55%] flex-col items-end gap-2">
          {notes.map((n, i) => <span key={i} className="label bg-[#f7f2e7] px-3 py-1.5 text-[#1d1b18] shadow">{n.text}</span>)}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => setPlaying(!playing)} className="grid size-10 place-items-center border border-line hover:border-ink hover:text-accent" aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button onClick={next} className="grid size-10 place-items-center border border-line hover:border-ink hover:text-accent" aria-label="Next line"><SkipForward className="size-4" /></button>
        {line && !line.audio && !scene.audio && <span className="label text-muted">Voice not recorded yet</span>}
        <div className="ml-2 flex flex-1 gap-1">
          {scenes.map((_, i) => <button key={i} onClick={() => { stop(); setSc(i); setLn(0); setT0(Date.now()); setPlaying(true); }}
            className={cx("h-1.5 flex-1", i < sc ? "bg-ink" : i === sc ? "bg-accent" : "bg-surface-3")} aria-label={`Scene ${i + 1}`} />)}
        </div>
      </div>
    </Sheet>
  );
}
