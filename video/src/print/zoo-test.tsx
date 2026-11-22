/* The zoo test sheet: every creature and robot (src/argon/lib/creatures.tsx), a spread of card designs (cards.tsx) and
   motions of the grammar (motion-d.tsx), drawn in the looks of bridge-test.json, to see them in a film's inks.
   Page p of look i is frames (i * PAGES + p) * 300 .. + 299.
   npx remotion still src/print/zoo-test.tsx Zoo out.jpg --frame=150 */
import React from "react";
import { AbsoluteFill, Composition, registerRoot, Sequence, useCurrentFrame } from "remotion";
import { At } from "../argon/kit";
import { Card, CARD_IDS, cardFor } from "../argon/lib/cards";
import { Creature, CREATURE_KINDS, Robot, RobotArm, Swarm, type CreatureKind, type CreatureMove, type RobotAction } from "../argon/lib/creatures";
import { Motion, MOTION_IDS } from "../argon/lib/motion-d";
import { rand } from "../argon/lib/motion";
import { Lib } from "./bridge";
import { DNA, loadPrintFonts, Sheet, Type } from "./kit";
import LOOKS from "./bridge-test.json";

const ALL = LOOKS as unknown as DNA[];
ALL.forEach(loadPrintFonts);
const PAGES = 5;

const Creatures = () => <>{CREATURE_KINDS.map((k, i) => {
  const x = 150 + (i % 7) * 265, y = 230 + Math.floor(i / 7) * 215;
  return <React.Fragment key={k}>
    <Creature kind={k} x={x} y={y} size={150} move={["fly", "bee", "mosquito"].includes(k) ? "hover" : "still"} range={60} />
    <div style={{ position: "absolute", left: x - 120, top: y + 76, width: 240, textAlign: "center" }}><Type size={30}>{k}</Type></div>
  </React.Fragment>;
})}</>;

const ACTIONS: RobotAction[] = ["idle", "wave", "walk", "think", "type", "point", "celebrate", "scan"];
const Robots = () => <>
  {ACTIONS.map((a, i) => <React.Fragment key={a}>
    <At x={60 + (i % 4) * 330} y={140 + Math.floor(i / 4) * 420}><Robot action={a} size={300} /></At>
    <div style={{ position: "absolute", left: 60 + (i % 4) * 330, top: 450 + Math.floor(i / 4) * 420, width: 300, textAlign: "center" }}><Type size={30}>{a}</Type></div>
  </React.Fragment>)}
  <At x={1380} y={120}><RobotArm action="pick" size={460} /></At>
  <At x={1380} y={560}><RobotArm action="weld" size={420} /></At>
  <Swarm kind="bee" x={1000} y={880} w={800} h={160} count={9} size={70} />
</>;

const BOXES = ["card", "rule", "outline", "sticky", "glass", "strip", "tab", "bracket", "solid"];
// an array, not a fragment: each card is its own child of <Lib>, as in a film, so it keeps clean type
const cards = () => Array.from({ length: 12 }, (_, i) => {
  const design = i < 9 ? cardFor(BOXES[i], i + 3) : CARD_IDS[Math.floor(rand(i * 5.3) * CARD_IDS.length)];
  return <At key={i} x={50 + (i % 4) * 470} y={110 + Math.floor(i / 4) * 320}>
    <Card design={design} w={430} h={250} title="Subsea cables" text="They carry 99% of the world's data" seed={i} />
    <div style={{ position: "absolute", top: 262, left: 0 }}><Type size={20}>{(i < 9 ? BOXES[i] + " → " : "") + design}</Type></div>
  </At>;
});

const Motions = () => {
  // a fresh draw of the grammar every few seconds would hide them; one fixed sample of 24, staggered so all are seen moving
  const ids = Array.from({ length: 24 }, (_, i) => MOTION_IDS[Math.floor(rand(i * 9.7) * MOTION_IDS.length)]);
  return <>{ids.map((id, i) => <At key={id + i} x={60 + (i % 6) * 305} y={130 + Math.floor(i / 6) * 230}>
    <Motion id={id} at={id.startsWith("exit") ? 5 + (i % 6) * 0.2 : 0.6 + i * 0.12} dur={1.2}><div style={{ width: 240, height: 120, background: "var(--glass, #cfe6f5)", border: "4px solid currentColor", borderRadius: 14 }} /></Motion>
    <div style={{ position: "absolute", top: 150 }}><Type size={20}>{id}</Type></div>
  </At>)}</>;
};

/** every way a creature moves, each in its own cell */
const MOVES: [CreatureMove, CreatureKind][] = [["still", "ladybug"], ["hover", "bee"], ["wander", "butterfly"], ["dart", "fly"], ["path", "bird"], ["crawl", "ant"],
  ["swim", "fish"], ["hop", "grasshopper"], ["orbit", "dragonfly"], ["land", "moth"], ["flee", "cockroach"], ["dangle", "spider"]];
const Moves = () => <>{MOVES.map(([mv, k], i) => {
  const cx = 60 + (i % 4) * 460, cy = 110 + Math.floor(i / 4) * 320, x = cx + 210, y = cy + 150;
  return <React.Fragment key={mv}>
    <div style={{ position: "absolute", left: cx, top: cy, width: 420, height: 290, border: "2px solid currentColor", opacity: 0.25 }} />
    <div style={{ position: "absolute", left: cx + 14, top: cy + 8 }}><Type size={28}>{`${mv} · ${k}`}</Type></div>
    <Creature kind={k} x={x} y={y} size={110} move={mv} at={mv === "flee" ? 3 : 0.3} range={mv === "dangle" ? 120 : mv === "orbit" ? 120 : 110} loop
      path={["path", "crawl", "swim", "hop"].includes(mv) ? [[cx + 40, y + 40], [x - 60, y - 40], [x + 60, y + 30], [cx + 380, y - 20]] : undefined} />
  </React.Fragment>;
})}</>;

const PAGE = [Creatures, Moves, Robots, () => null, Motions];
const NAMES = ["creatures", "moves", "robots", "cards", "motions"];
const Test = () => {
  const f = useCurrentFrame(), n = Math.floor(f / 300), i = Math.min(ALL.length - 1, Math.floor(n / PAGES)), p = n % PAGES;
  const Page = PAGE[p];
  return <AbsoluteFill><Sheet dna={ALL[i]}>
    <div style={{ position: "absolute", left: 60, top: 26 }}><Type size={44} display>{`${NAMES[p]} · ${ALL[i].family} · ${ALL[i].lib}`}</Type></div>
    <Sequence from={n * 300} durationInFrames={300}><Lib dur={10}>{p === 3 ? cards() : <Page />}</Lib></Sequence>
  </Sheet></AbsoluteFill>;
};

registerRoot(() => <Composition id="Zoo" component={Test} durationInFrames={Math.max(1, ALL.length) * PAGES * 300} fps={30} width={1920} height={1080} />);
