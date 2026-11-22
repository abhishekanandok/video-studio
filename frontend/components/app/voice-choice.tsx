"use client";

import { Check, Mic, Pause, Play, RotateCcw, Sparkles, Square, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Chip, DarkButton, LimeButton } from "./kit";
import { API, post, useApi } from "@/lib/api";

/* The voice is the creator's call, never the pipeline's: after the script and pictures the film pauses here.
   Either they read the script off a teleprompter and record it in the browser (their own voice, the default), or they
   pick an AI voice after hearing samples. Nothing is recorded until they choose. */

type Voice = { name: string; character: string; samples: Record<string, string> };
const ORIGIN = API.replace(/\/api\/?$/, "");

export function VoiceChoice({ id, lines, saved, onDone }: { id: number; lines: string[]; saved?: string | null; onDone: () => void }) {
  const [mode, setMode] = useState<"own" | "ai">("own");
  return (
    <Card className="p-6">
      <div className="grid gap-2 sm:grid-cols-2">
        {([["own", Mic, "Record it yourself", "Read your script off the teleprompter"], ["ai", Sparkles, "Use an AI voice", "Hear the voices, pick one"]] as const).map(([m, Icon, t, d]) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`flex items-start gap-3 rounded-[16px] p-4 text-left transition-colors ${mode === m ? "bg-[#1f1c1b] text-white" : "bg-[#f6f6f2] hover:bg-[#efeee8]"}`}>
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${mode === m ? "bg-[#a6f04a] text-[#1f1c1b]" : "bg-white"}`}><Icon className="size-4" /></span>
            <span><span className="block text-[16px] font-bold">{t}</span><span className={`block text-[13px] ${mode === m ? "text-white/70" : "text-[#8a857f]"}`}>{d}</span></span>
          </button>
        ))}
      </div>
      <div className="mt-5">{mode === "own" ? <Teleprompter id={id} lines={lines} saved={saved} onDone={onDone} /> : <AiVoices id={id} onDone={onDone} />}</div>
    </Card>
  );
}

/* ---- teleprompter ----
   "Follow my voice": the browser's own speech recognition (free; Chrome, Edge, Safari) listens while you record and
   the highlight moves to the word you just said. Hinglish is heard as Indian English, so matching is forgiving: each
   heard word is looked for a few words ahead (same word, same start, or one letter off), a missed word is skipped,
   and a pause simply waits. "Steady pace" moves the highlight word by word at a set speed, with a breath after commas
   and a longer one after full stops, for browsers without speech recognition or a noisy room. */

type Tok = { w: string; key: string; line: number; end: "" | "," | "." };
const norm = (w: string) => w.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
const close = (a: string, b: string) => {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 3) return false;
  let i = 0, j = 0, miss = 0; // one letter added, dropped or changed
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++miss > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return miss + (a.length - i) + (b.length - j) <= 1;
};
const SKIP = 2; // how far a clearly heard long word may move the highlight past a missed one

function Teleprompter({ id, lines, saved, onDone }: { id: number; lines: string[]; saved?: string | null; onDone: () => void }) {
  const toks = useMemo<Tok[]>(() => lines.flatMap((l, line) => l.split(/\s+/).filter(Boolean).map((w) => ({
    w, key: norm(w), line, end: /[.?!:]["”']?$/.test(w) ? "." : /[,;—–-]$/.test(w) ? "," : "",
  } as Tok))), [lines.join("\n")]); // by content: the page re-renders every second with a new (equal) array, which reset the pace timer
  const canFollow = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const [mode, setMode] = useState<"follow" | "pace">(canFollow ? "follow" : "pace");
  const [state, setState] = useState<"idle" | "recording" | "review" | "uploading" | "saved">(saved ? "saved" : "idle");
  const [pos, setPos] = useState(0); // the word to say next
  const [heard, setHeard] = useState("");
  const [speed, setSpeed] = useState(1);
  const [url, setUrl] = useState<string | null>(saved ? ORIGIN + saved : null);
  const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const sr = useRef<any>(null);
  const live = useRef(false);
  const posRef = useRef(0);
  const blob = useRef<Blob | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const curLine = toks[Math.min(pos, toks.length - 1)]?.line ?? 0;
  const move = (p: number) => { posRef.current = p; setPos(p); };

  // steady pace: one word at a time, a breath after commas, a longer one after full stops
  useEffect(() => {
    if (state !== "recording" || mode !== "pace" || pos >= toks.length) return;
    const t = toks[pos];
    const ms = (60000 / 150 + (t.end === "." ? 650 : t.end === "," ? 300 : 0)) / speed;
    const h = setTimeout(() => move(pos + 1), ms);
    return () => clearTimeout(h);
  }, [state, mode, pos, speed, toks]);

  // keep the line being read a third of the way down the prompter
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-line="${curLine}"]`);
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 3, behavior: "smooth" });
  }, [curLine]);

  const follow = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    // Every heard word is used once. The highlight moves when you say the highlighted word; it may skip ahead (at most
    // SKIP words) only on a long word you clearly said, so a missed word can't strand it. Short words ("ka", "hai",
    // "aur") that aren't the highlighted one never move it: they occur everywhere and made it race ahead.
    let used: number[] = []; // per result: how many of its words are already used
    const hear = (w: string) => {
      const p = posRef.current;
      if (p >= toks.length) return;
      if (close(w, toks[p].key)) { move(p + 1); return; }
      if (w.length < 5) return;
      for (let j = p + 1; j <= Math.min(toks.length - 1, p + SKIP); j++) if (close(w, toks[j].key)) { move(j + 1); return; }
    };
    r.onstart = () => { used = []; }; // a restarted recogniser numbers its results from 0 again
    r.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const words = String(e.results[i][0].transcript).split(/\s+/).map(norm).filter(Boolean);
        text = words.slice(-6).join(" ");
        const final = e.results[i].isFinal;
        let k = used[i] ?? 0;
        // a guess still being spoken can change its last word: use it early only if it is exactly the highlighted word
        const upto = final ? words.length : words.length - 1;
        for (; k < upto; k++) hear(words[k]);
        if (!final && k === words.length - 1 && posRef.current < toks.length && words[k] === toks[posRef.current].key) { hear(words[k]); k++; }
        used[i] = Math.max(used[i] ?? 0, k);
      }
      if (text) setHeard(text);
    };
    r.onerror = (e: any) => { if (e.error === "not-allowed") { setErr("The browser blocked speech recognition. Switch to Steady pace."); live.current = false; } };
    r.onend = () => { if (live.current) { try { r.start(); } catch { /* already restarting */ } } }; // Chrome stops after a silence
    sr.current = r;
    try { r.start(); } catch { /* ignore */ }
  };

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const r = new MediaRecorder(stream);
      const parts: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        blob.current = new Blob(parts, { type: r.mimeType || "audio/webm" });
        setUrl(URL.createObjectURL(blob.current));
        setState("review");
      };
      rec.current = r;
      move(0); setHeard("");
      r.start();
      setState("recording");
      if (mode === "follow") { live.current = true; follow(); }
    } catch {
      setErr("The browser couldn't use your microphone. Allow microphone access and try again.");
    }
  };
  const stop = () => {
    live.current = false;
    try { sr.current?.stop(); } catch { /* ignore */ }
    if (rec.current?.state === "recording") rec.current.stop();
  };
  useEffect(() => () => { live.current = false; try { sr.current?.stop(); } catch { /* ignore */ } }, []);
  // reaching the last word ends the take by itself
  useEffect(() => { if (state === "recording" && pos >= toks.length && toks.length) { const t = setTimeout(stop, 1200); return () => clearTimeout(t); } }, [pos, state, toks.length]);

  const upload = async () => {
    if (!blob.current) return;
    setState("uploading");
    const fd = new FormData();
    fd.append("file", blob.current, blob.current.type.includes("mp4") ? "take.m4a" : "take.webm");
    try {
      const r = await fetch(`${API}/studio/films/${id}/recording`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      setState("saved");
    } catch (e) {
      setErr(`Couldn't save the recording: ${String((e as Error).message).slice(0, 120)}`);
      setState("review");
    }
  };
  const again = () => { setState("idle"); move(0); setHeard(""); };
  // the film goes on with this recording: cut line by line to the script, then rendered (no AI voice)
  const [making, setMaking] = useState(false);
  const make = async () => {
    setMaking(true);
    setErr("");
    try { await post(`/studio/films/${id}/continue`); onDone(); }
    catch (e) { setErr(`Couldn't start the video: ${String((e as Error).message).slice(0, 120)}`); }
    finally { setMaking(false); }
  };

  let k = -1;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-[#f1f0ea] p-1 text-[13px] font-semibold">
          {([["follow", "Follow my voice"], ["pace", "Steady pace"]] as const).map(([m, l]) => (
            <button key={m} type="button" disabled={state === "recording" || (m === "follow" && !canFollow)} onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 disabled:opacity-40 ${mode === m ? "bg-white shadow-sm" : "text-[#8a857f]"}`}>{l}</button>
          ))}
        </div>
        {mode === "pace" && (
          <div className="flex items-center gap-1 rounded-full bg-[#f1f0ea] p-1 text-[13px] font-semibold">
            {[[0.8, "Slow"], [1, "Normal"], [1.25, "Fast"]].map(([v, l]) => (
              <button key={l} type="button" onClick={() => setSpeed(v as number)} className={`rounded-full px-3 py-1 ${speed === v ? "bg-white shadow-sm" : "text-[#8a857f]"}`}>{l}</button>
            ))}
          </div>
        )}
        <span className="text-[13px] text-[#8a857f]">{mode === "follow" ? "Moves as you speak. Pause whenever you like; it waits." : "Read the highlighted word; it moves at a steady pace."}</span>
      </div>

      <div ref={box} className="relative h-[360px] overflow-y-auto rounded-[18px] bg-[#1f1c1b] px-6 py-[130px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {lines.map((l, i) => (
          <p key={i} data-line={i} className={`py-2 text-[24px] font-semibold leading-snug transition-opacity duration-300 sm:text-[28px] ${i === curLine ? "opacity-100" : "opacity-50"}`}>
            {l.split(/\s+/).filter(Boolean).map((w, j) => {
              k += 1;
              const n = k;
              const cls = n < pos ? "text-white/35" : n === pos ? "rounded-md bg-[#a6f04a] px-1 text-[#1f1c1b]" : "text-white";
              return <span key={j}><span onClick={() => move(n)} className={`cursor-pointer transition-colors duration-150 ${cls}`}>{w}</span>{" "}</span>;
            })}
          </p>
        ))}
      </div>

      {state === "recording" && mode === "follow" && (
        <div className="mt-2 truncate text-[13px] text-[#8a857f]">Heard: <span className="font-mono text-[#5f5b57]">{heard || "…"}</span></div>
      )}
      {err && <div className="mt-3 text-[14px] text-[#9a2f1d]">{err}</div>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {state === "idle" && <LimeButton onClick={start}><Mic className="size-4" />Start recording</LimeButton>}
        {state === "recording" && <>
          <DarkButton onClick={stop}><Square className="size-4 text-[#ff6b5b]" />Stop</DarkButton>
          <span className="flex items-center gap-2 text-[14px] font-semibold"><span className="size-2.5 animate-pulse rounded-full bg-[#ff6b5b]" />Recording · line {curLine + 1} of {lines.length}</span>
        </>}
        {(state === "review" || state === "uploading" || state === "saved") && url && <Take src={url} />}
        {state === "review" && <>
          <LimeButton onClick={upload}><Upload className="size-4" />Use this recording</LimeButton>
          <button type="button" onClick={again} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]"><RotateCcw className="size-4" />Record again</button>
        </>}
        {state === "uploading" && <span className="text-[14px] text-[#8a857f]">Saving…</span>}
        {state === "saved" && <>
          <Chip tone="lime"><Check className="size-3.5" strokeWidth={3} />Your recording is saved</Chip>
          <LimeButton onClick={make}>{making ? "Starting…" : <><Sparkles className="size-4" />Make my video with this recording</>}</LimeButton>
          <button type="button" onClick={again} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]"><RotateCcw className="size-4" />Record again</button>
        </>}
      </div>
      <p className="mt-3 text-[13px] text-[#8a857f]">Tap any word to jump there. The take ends by itself after the last word.</p>
    </div>
  );
}

/* Chrome's recorder writes no total length into its webm, so a plain <audio> shows a few seconds of a 5-minute take.
   Seeking far past the end makes the browser scan the file and learn the real length; then it jumps back to the start. */
function Take({ src }: { src: string }) {
  const el = useRef<HTMLAudioElement>(null);
  const [len, setLen] = useState<number | null>(null);
  useEffect(() => { setLen(null); }, [src]);
  const known = () => { const d = el.current?.duration; if (d && isFinite(d)) setLen(d); };
  const meta = () => {
    const a = el.current;
    if (!a) return;
    if (isFinite(a.duration) && a.duration > 0) { setLen(a.duration); return; }
    const back = () => { a.removeEventListener("timeupdate", back); a.currentTime = 0; known(); };
    a.addEventListener("timeupdate", back);
    a.currentTime = 1e101;
  };
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;
  return (
    <span className="flex items-center gap-2">
      <audio ref={el} src={src} controls preload="metadata" onLoadedMetadata={meta} onDurationChange={known} className="h-10 max-w-full" />
      {len != null && <span className="text-[13px] font-semibold text-[#5f5b57]">{fmt(len)} recorded</span>}
    </span>
  );
}

function AiVoices({ id, onDone }: { id: number; onDone: () => void }) {
  const { data } = useApi<{ ready: boolean; voices: Voice[] }>("/studio/voices");
  const [pick, setPick] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const play = (v: Voice) => {
    const src = Object.values(v.samples)[0];
    if (!src) return;
    audio.current?.pause();
    if (playing === v.name) { setPlaying(null); return; }
    audio.current = new Audio(ORIGIN + src);
    audio.current.onended = () => setPlaying(null);
    audio.current.play();
    setPlaying(v.name);
  };
  useEffect(() => () => audio.current?.pause(), []);
  const go = async () => {
    if (!pick) return;
    setBusy(true);
    try { await post(`/studio/films/${id}/continue`, { voices: { Narrator: pick } }); onDone(); } finally { setBusy(false); }
  };
  if (!data) return <div className="text-[14px] text-[#8a857f]">Loading voices…</div>;
  return (
    <div>
      <div className="grid max-h-[340px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {data.voices.map((v) => (
          <div key={v.name} onClick={() => setPick(v.name)} className={`flex cursor-pointer items-center gap-3 rounded-[14px] border p-3 transition-colors ${pick === v.name ? "border-[#1f1c1b] bg-[#fbfdf6]" : "border-[#ecebe5] hover:border-[#cfe9a8]"}`}>
            <button type="button" onClick={(e) => { e.stopPropagation(); play(v); }} className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1f1c1b] text-[#a6f04a]" aria-label={`Play ${v.name}`}>
              {playing === v.name ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{v.name}</span><span className="block truncate text-[12.5px] text-[#8a857f]">{v.character}</span></span>
            {pick === v.name && <Check className="size-4 shrink-0" strokeWidth={3} />}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LimeButton onClick={go}>{busy ? "Starting…" : pick ? `Record the script with ${pick}` : "Pick a voice first"}</LimeButton>
        <span className="text-[13px] text-[#8a857f]">Nothing is recorded until you press this.</span>
      </div>
    </div>
  );
}
