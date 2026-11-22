"use client";

import { Check, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, LimeButton } from "./kit";
import { API, post } from "@/lib/api";

/* After the voices are recorded the film pauses here: the creator listens (a minute of theirs instead of an AI accent
   check) and continues to make the video, or goes back and picks another voice. Lines play one after another from any
   line, the way they will sound in the film. */

const ORIGIN = API.replace(/\/api\/?$/, "");

export function VoiceReview({ id, lines, onDone, onChange }: { id: number; lines: { speech: string; audio: string | null }[]; onDone: () => void; onChange: () => void }) {
  const [at, setAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audio.current?.pause();
    if (at === null) return;
    const src = lines[at]?.audio;
    if (!src) { setAt(at + 1 < lines.length ? at + 1 : null); return; }
    const a = new Audio(src.startsWith("http") ? src : ORIGIN + src);
    a.onended = () => setAt((k) => (k !== null && k + 1 < lines.length ? k + 1 : null));
    a.play().catch(() => setAt(null));
    audio.current = a;
    return () => a.pause();
  }, [at, lines]);

  const go = async () => {
    setBusy(true);
    try { audio.current?.pause(); await post(`/studio/films/${id}/continue`); onDone(); } finally { setBusy(false); }
  };

  return (
    <Card className="p-6">
      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
        {lines.map((l, i) => (
          <button key={i} type="button" onClick={() => setAt(at === i ? null : i)}
            className={`flex w-full items-start gap-3 rounded-[14px] p-2.5 text-left transition-colors ${at === i ? "bg-[#1f1c1b] text-white" : "hover:bg-[#f6f6f2]"}`}>
            <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${at === i ? "bg-[#a6f04a] text-[#1f1c1b]" : "bg-[#1f1c1b] text-[#a6f04a]"} ${l.audio ? "" : "opacity-30"}`}>
              {at === i ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </span>
            <span className="text-[15px] leading-relaxed">{l.speech}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LimeButton onClick={go}>{busy ? "Starting…" : <><Check className="size-4" strokeWidth={3} />Sounds right: make the video</>}</LimeButton>
        <button type="button" onClick={onChange} className="rounded-full px-4 py-2 text-[14px] font-semibold text-[#5f5b57] hover:bg-black/[0.04]">Change the voice</button>
        <span className="text-[13px] text-[#8a857f]">Tap a line to play from there.</span>
      </div>
    </Card>
  );
}
