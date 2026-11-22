/* An Argon film: the scenes Argon wrote (src/argon/gen/<slug>/scene-NN.tsx) in order, each with its voice, its word
   times, its transition into the next and themed captions with the word being said lit. */

import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneCtx, family, type Theme, type Word } from "./kit";
import { CaptionsCtx } from "./regions";
import { transitionStyle } from "./transitions";

export type FilmScene = { audio: string; seconds: number; words: Word[]; text: string; transition: string };
const FPS = 30, PAD = 0.4;

const framesOf = (s: FilmScene) => Math.round((s.seconds + PAD) * FPS);
export const filmFrames = (data: FilmScene[]) => data.reduce((a, s) => a + framesOf(s), 0);

/** the eight classic ways one scene arrives after another (a storyboard card's "transition"; looks.py TRANSITIONS); all 100 are in transitions.ts */
export const TRANSITIONS = ["cut", "fade", "slide", "zoom", "wipe", "page", "fold", "rise"] as const;
export function Transition({ kind, children }: { kind: string; children: React.ReactNode }) { return <Enter kind={kind}>{children}</Enter>; }

/** the incoming scene, drawn by the transition catalogue (transitions.ts: 100 ways in, the eight above among them) */
function Enter({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <AbsoluteFill style={transitionStyle(kind, useCurrentFrame()) as React.CSSProperties}>{children}</AbsoluteFill>;
}

function Captions({ s, theme, vertical }: { s: FilmScene; theme: Theme; vertical: boolean }) {
  const f = useCurrentFrame();
  const t = f / FPS;
  const words = s.words.length ? s.words : s.text.split(/\s+/).map((w, i, a) => ({ w, s: (i / a.length) * s.seconds, e: ((i + 1) / a.length) * s.seconds }));
  let cur = words.findIndex((w) => t < w.e);
  if (cur < 0) cur = words.length - 1;
  const from = Math.floor(cur / 7) * 7, shown = words.slice(from, from + 7);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: vertical ? 300 : 44, display: "flex", justifyContent: "center", fontFamily: family(theme.font) }}>
      <div style={{ maxWidth: vertical ? 940 : 1500, textAlign: "center", fontSize: vertical ? 58 : 46, fontWeight: 800, lineHeight: 1.2, padding: "10px 28px", borderRadius: 18,
        background: "rgb(10 10 14/0.72)", color: "#fff" }}>
        {shown.map((w, i) => <span key={i} style={{ color: from + i === cur ? theme.accent : undefined }}>{w.w} </span>)}
      </div>
    </div>
  );
}

export function ArgonFilm({ scenes, data, theme, dir, only, captions = true }: { scenes: ComponentType[]; data: FilmScene[]; theme: Theme; dir: string; only?: number; captions?: boolean }) {
  const { width, height } = useVideoConfig();
  const idx = only === undefined ? data.map((_, i) => i) : [only];
  let at = 0;
  return (
    <AbsoluteFill style={{ background: theme.bg[0] ?? "#111" }}>
      {idx.map((i, k) => {
        const S = scenes[i], s = data[i];
        const from = at, dur = framesOf(s);
        at += dur;
        const prev = i > 0 ? data[i - 1].transition : "fade";
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneCtx.Provider value={{ theme, words: s.words, dur: s.seconds + PAD, W: width, H: height, dir }}>
              <CaptionsCtx.Provider value={captions}><Enter kind={k === 0 && only === undefined ? "fade" : prev}><S /></Enter></CaptionsCtx.Provider>
            </SceneCtx.Provider>
            {s.audio && <Audio src={staticFile(s.audio)} />}
            {captions && <Captions s={s} theme={theme} vertical={height > width} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
