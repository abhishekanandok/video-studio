/* The placement test (src/argon/place.tsx): the three failures of docs/research/labels-that-land.md drawn again with
   labels that name what they point at. Frame 0-89: a globe with EQUATOR and SOUTH POLE; 90-179: two bars where the
   "≈ 2/3" tag asks for the very spot "68% NORTH" sits on.   npx remotion still src/print/place-test.tsx PlaceTest out.jpg --frame=80 */
import React from "react";
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from "remotion";
import { At } from "../argon/kit";
import { Globe } from "../argon/lib/blocks-b";
import { Mark } from "../argon/place";
import { Lib } from "./bridge";
import { Tag } from "./depth";
import { DNA, loadPrintFonts, Sheet, Type } from "./kit";
import LOOKS from "./looks-preview.json";

const dna = (LOOKS as unknown as DNA[]).find((d) => d.family === "encyclopedia") ?? (LOOKS as unknown as DNA[])[0];
loadPrintFonts(dna);

const Globes = ({ t }: { t: number }) => <>
  <Lib><At x={1180} y={560} anchor="center"><Globe lon={10} lat={15} size={620} at={0} dur={1.5} /></At></Lib>
  <Tag to="globe.equator" side="left" x={1260} y={510} t={t} at={1.6} tone="accent">EQUATOR</Tag>
  <Tag to="globe.equator.left" t={t} at={1.9} tone="plain">0°</Tag>
  <Tag to="globe.-33.9,18.4" t={t} at={2.1} tone="ink">CAPE TOWN</Tag>
  <Tag to="globe.nowhere" t={t} at={2.2} tone="dark">MISSING</Tag>
</>;

const Bars = ({ t }: { t: number }) => {
  const base = 760, col = 520;
  return <>
    {[[690, 0.68], [1100, 0.32]].map(([x, f], i) => <div key={i} style={{ position: "absolute", left: x, top: base - col * f, width: 170, height: col * f, background: i ? dna.inks[2] : dna.inks[0] }} />)}
    <Mark id="bar.north.top" x={775} y={base - col * 0.68} />
    <div style={{ position: "absolute", left: 690, top: base - col * 0.68 - 64 }}><Type size={52} display color={dna.inks[0]}>68% NORTH</Type></div>
    <div style={{ position: "absolute", left: 1040, top: base - col * 0.32 - 54 }}><Type size={42} display color={dna.inks[2]}>32% SOUTH</Type></div>
    {/* the writer asked for the spot "68% NORTH" is on: the scene moves it */}
    <Tag x={640} y={base - col * 0.68 - 60} to="bar.north.top" t={t} at={0.3} tone="accent">≈ 2/3 of all land</Tag>
  </>;
};

const Test = () => {
  const f = useCurrentFrame(), t = (f % 90) / 30;
  return <AbsoluteFill><Sheet dna={dna} page={f < 90 ? 1 : 2}>{f < 90 ? <Globes t={t} /> : <Bars t={t} />}</Sheet></AbsoluteFill>;
};
registerRoot(() => <Composition id="PlaceTest" component={Test} durationInFrames={180} fps={30} width={1920} height={1080} />);
