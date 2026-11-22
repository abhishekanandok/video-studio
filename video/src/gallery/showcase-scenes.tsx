/* A look's showcase: what the look is FOR (video/look_showcase.py -> src/print/showcase.json). 10 seconds in three
   parts, each arriving by the transition that matches the look's motion: the title in the look's type (2 s); its
   signature scene (src/gallery/signatures.tsx, 5.5 s), the art or the story the look was made for; then three videos to
   make with it (2.5 s). "Best for" runs along the bottom. Played live in the look studio (src/gallery/specimen.tsx) and
   rendered as the Plan page's hover clips (src/print/showcase.tsx). */
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Transition } from "../argon/film";
import { Card } from "../argon/lib/cards";
import { Lib } from "../print/bridge";
import { Enter } from "../print/enter";
import { appear, DNA, fam, Sheet, Type, useDNA } from "../print/kit";
import { Stack } from "../print/spread";
import { OWN_COLOURS, SIGNATURE } from "./signatures";
import { type Beat, STORY } from "./stories";

export type Show = { use: string; kicker: string; title: string; line: string; ideas: string[] };

export const FPS = 30;
const PARTS = [2 * FPS, 5.5 * FPS, 2.5 * FPS];
export const SHOW = PARTS.reduce((a, b) => a + b, 0);
/** the transition that feels like each look motion (video/looks.py MOTION) */
const CUT: Record<string, string> = { snappy: "slide", drift: "fade", typewriter: "wipe", stamp: "zoom", slide: "slide", draw: "wipe", pop: "zoom",
  wipe: "wipe", zoom: "zoom", flip: "page", parallax: "rise", glitch: "cut", brush: "wipe" };

/** a piece in a box of its own, arriving in the look's motion */
const In: React.FC<{ t: number; at: number; x: number; y: number; w: number; h: number; children: React.ReactNode }> = ({ t, at, x, y, w, h, children }) =>
  <Enter t={t} at={at} style={{ inset: "auto", left: x, top: y, width: w, height: h }}>{children}</Enter>;

const Title: React.FC<{ t: number; s: Show }> = ({ t, s }) => <>
  <Stack x={110} y={250} lines={[s.kicker]} t={t} at={0} size={30} />
  <In t={t} at={0.15} x={110} y={330} w={1700} h={600}>
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <Type size={150} display w={1700}>{s.title}</Type>
      <div style={{ opacity: appear(t, 0.7, 0.4) }}><Type size={46}>{s.line}</Type></div>
    </div>
  </In>
</>;

/** the third part: the videos this look is for, as cards in the look's own box */
const Ideas: React.FC<{ t: number; s: Show }> = ({ t, s }) => {
  const d = useDNA();
  return <>
    <div style={{ position: "absolute", left: 110, top: 150, fontFamily: fam(d.mono ?? d.body), fontSize: 30, letterSpacing: "0.22em", color: d.inks[0], opacity: appear(t, 0, 0.3) }}>MAKE VIDEOS LIKE</div>
    <Lib dur={PARTS[2] / FPS}>{s.ideas.slice(0, 3).map((idea, i) =>
      <In key={i} t={t} at={0.15 + i * 0.2} x={110 + i * 590} y={260} w={540} h={420}>
        <Card w={540} h={420} at={0.15 + i * 0.2} motion="" title={`0${i + 1}`} text={idea} seed={4 + i} />
      </In>)}</Lib>
  </>;
};

/** "Best for": when to choose this look, along the bottom of every part */
const BestFor: React.FC<{ use: string }> = ({ use }) => {
  const d = useDNA(), t = useCurrentFrame() / FPS;
  return <div style={{ position: "absolute", left: 110, right: 110, bottom: 46, display: "flex", alignItems: "center", gap: 18, opacity: appear(t, 0.3, 0.4) }}>
    <span style={{ fontFamily: fam(d.mono ?? d.body), fontSize: 22, letterSpacing: "0.2em", color: d.inks[0], fontWeight: 700 }}>BEST FOR</span>
    <span style={{ height: 2, width: 40, background: d.inks[0] }} />
    <span style={{ fontFamily: fam(d.body), fontSize: 30, color: d.ink, opacity: 0.85 }}>{use}</span>
  </div>;
};

const Part: React.FC<{ dna: DNA; s: Show; i: number; kind: string }> = ({ dna, s, i, kind }) => {
  const t = useCurrentFrame() / FPS, Sig = SIGNATURE[dna.family ?? ""];
  return <Transition kind={kind}><Sheet dna={dna} page={i + 1}>
    {i === 0 ? <Title t={t} s={s} /> : i === 1 ? (Sig ? <Lib dur={PARTS[1] / FPS} look={!OWN_COLOURS.has(dna.family ?? "")}><Sig t={t} /></Lib> : <Title t={t} s={s} />) : <Ideas t={t} s={s} />}
    <BestFor use={s.use} />
  </Sheet></Transition>;
};

/** one beat of a look's own story (src/gallery/stories.tsx), arriving its own way */
const StoryBeat: React.FC<{ dna: DNA; b: Beat; i: number }> = ({ dna, b, i }) => {
  const t = useCurrentFrame() / FPS;
  return <Transition kind={b.enter}><Sheet dna={dna} page={i + 1}><Lib dur={b.len / FPS} look={false}><b.Body t={t} /></Lib></Sheet></Transition>;
};

/** the whole showcase: the look's own story when it has one; else three parts, each entering by the look's transition
    (pinned ones in turn, else the motion's own) */
export const Showcase: React.FC<{ dna: DNA; show: Show }> = ({ dna, show }) => {
  const story = STORY[dna.family ?? ""];
  if (story) { let at = 0;
    return <AbsoluteFill style={{ background: "#111" }}>{story.map((b, i) => { const from = at; at += b.len;
      return <Sequence key={i} from={from} durationInFrames={b.len}><StoryBeat dna={dna} b={b} i={i} /></Sequence>; })}</AbsoluteFill>; }
  const kinds = dna.transitions?.length ? dna.transitions : [CUT[dna.motion ?? "drift"] ?? "fade"];
  let from = 0;
  return <AbsoluteFill style={{ background: "#111" }}>
    {PARTS.map((len, i) => { const at = from; from += len;
      return <Sequence key={i} from={at} durationInFrames={len}><Part dna={dna} s={show} i={i} kind={i === 0 ? "fade" : kinds[(i - 1) % kinds.length]} /></Sequence>; })}
  </AbsoluteFill>;
};
