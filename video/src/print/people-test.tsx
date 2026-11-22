/* The people test (src/argon/lib/people.tsx): avatars in poses, a talk and a meet, in two very different looks, to see
   the figures take each look's ink, paper and body style. Frames: look i, page p = (i * 3 + p) * 120 .. + 119.
   npx remotion still src/print/people-test.tsx PeopleTest out.jpg --frame=100 */
import React from "react";
import { AbsoluteFill, Composition, registerRoot, Sequence, useCurrentFrame } from "remotion";
import { At } from "../argon/kit";
import { Conversation, Person, type AvatarName, type PoseName } from "../argon/lib/people";
import { Lib } from "./bridge";
import { DNA, loadPrintFonts, Sheet, Type } from "./kit";
import LOOKS from "./looks-preview.json";

const ALL = LOOKS as unknown as DNA[];
const PICK = ["encyclopedia", "comic", "synthwave", "kids"].map((f) => ALL.find((d) => d.family === f) ?? ALL[0]);
PICK.forEach(loadPrintFonts);

const GRID: [AvatarName, PoseName][] = [["doctor", "explain"], ["professor", "point"], ["kid", "cheer"], ["chef", "present"], ["business", "think"], ["elder", "shrug"],
  ["scientist", "facepalm"], ["king", "victory"], ["robot", "wave"], ["student", "type"], ["athlete", "run"], ["builder", "carry"]];
const Grid = () => <>{GRID.map(([a, p], i) => <React.Fragment key={i}>
  <At x={90 + (i % 6) * 300} y={120 + Math.floor(i / 6) * 450}><Person avatar={a} pose={p} size={360} /></At>
  <div style={{ position: "absolute", left: 60 + (i % 6) * 300, top: 490 + Math.floor(i / 6) * 450, width: 300, textAlign: "center" }}><Type size={26}>{`${a} · ${p}`}</Type></div>
</React.Fragment>)}</>;

const Talk = () => <Conversation people={[{ avatar: "kid", name: "Riya" }, { avatar: "professor", name: "Dr Rao" }]}
  lines={[{ who: 0, text: "Why is it hotter at the equator?", at: 0.3 }, { who: 1, text: "The sun hits it straight on.", at: 2.0, pose: "point" }]} />;
const Meet = () => <Conversation mode="meet" action="handshake" people={[{ avatar: "business", name: "Seller" }, { avatar: "chef", name: "Buyer" }]}
  lines={[{ who: 0, text: "Deal?", at: 0.6 }, { who: 1, text: "Deal!", at: 2.6 }]} />;

const PAGES = [Grid, Talk, Meet];
const Test = () => {
  const f = useCurrentFrame(), n = Math.floor(f / 120), i = Math.min(PICK.length - 1, Math.floor(n / 3)), p = n % 3, Page = PAGES[p];
  return <AbsoluteFill><Sheet dna={PICK[i]}>
    <div style={{ position: "absolute", left: 60, top: 24 }}><Type size={40} display>{`${["poses", "talk", "meet"][p]} · ${PICK[i].family} · ${PICK[i].lib}`}</Type></div>
    <Sequence from={n * 120} durationInFrames={120}><Lib dur={4}><Page /></Lib></Sequence>
  </Sheet></AbsoluteFill>;
};
registerRoot(() => <Composition id="PeopleTest" component={Test} durationInFrames={PICK.length * 3 * 120} fps={30} width={1920} height={1080} />);
