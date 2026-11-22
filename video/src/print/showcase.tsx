/* The Plan page's hover clips: each look family's 9-second showcase (src/gallery/showcase-scenes.tsx) in the creator's
   brand (looks-preview.json), family i at frames i*300 .. i*300+299.
     npx remotion render src/print/showcase.tsx LookShowcase out.mp4 --frames=<i*300>-<i*300+299> */
import React from "react";
import { AbsoluteFill, Composition, registerRoot, Sequence } from "remotion";
import { Showcase, SHOW, type Show } from "../gallery/showcase-scenes";
import { DNA, loadPrintFonts } from "./kit";
import LOOKS from "./looks-preview.json";
import SHOWS from "./showcase.json";

const ALL = LOOKS as unknown as DNA[];
const BY = SHOWS as unknown as Record<string, Show>;
ALL.forEach(loadPrintFonts);

const All = () => <AbsoluteFill>{ALL.map((d, i) => BY[d.family ?? ""] &&
  <Sequence key={i} from={i * SHOW} durationInFrames={SHOW}><Showcase dna={d} show={BY[d.family ?? ""]} /></Sequence>)}</AbsoluteFill>;

registerRoot(() => <Composition id="LookShowcase" component={All} durationInFrames={Math.max(1, ALL.length) * SHOW} fps={30} width={1920} height={1080} />);
