/* The bridge test sheet: the same six motion-library blocks drawn in several look families (frame i = family i of
   bridge-test.json), to see where the library clashes with a look before any film uses it.
   npx remotion still src/print/bridge-test.tsx BridgeTest out.jpg --frame=i */
import React from "react";
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from "remotion";
import { At } from "../argon/kit";
import { CloudServers, DocHighlight } from "../argon/lib/blocks-c";
import { Building, Character, Vehicle } from "../argon/lib/blocks-d";
import { Lib } from "./bridge";
import { DNA, loadPrintFonts, Sheet, Type } from "./kit";
import LOOKS from "./bridge-test.json";

const ALL = LOOKS as unknown as DNA[];
ALL.forEach(loadPrintFonts);

const Pieces: React.FC<{ name: string }> = ({ name }) => <>
  <div style={{ position: "absolute", left: 60, top: 30 }}><Type size={48} display>{name}</Type></div>
  <Lib dur={10}>
    <At x={80} y={140}><CloudServers at={0} w={520} /></At>
    <At x={720} y={170}><Vehicle kind="ship" size={420} at={0} /></At>
    <At x={1400} y={110}><Character emotion="happy" action="point" at={0} /></At>
    <At x={90} y={600}><Building kind="factory" size={380} at={0} /></At>
    <At x={720} y={590}><DocHighlight title="CHIP REPORT" quote="90% of advanced chips" at={0} w={480} /></At>
    <At x={1380} y={560}><Building kind="skyscraper" size={420} at={0} lit={1} /></At>
  </Lib>
</>;

const Test = () => {
  const i = Math.min(ALL.length - 1, Math.floor(useCurrentFrame() / 300));
  return <AbsoluteFill><Sheet dna={ALL[i]}><Pieces name={`${ALL[i].family} · ${ALL[i].lib}`} /></Sheet></AbsoluteFill>;
};

registerRoot(() => <Composition id="BridgeTest" component={Test} durationInFrames={Math.max(1, ALL.length) * 300} fps={30} width={1920} height={1080} />);
