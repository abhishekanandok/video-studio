/* The look studio's live preview (frontend Plan page step 2, in an iframe): four short scenes drawn in the look the app
   sends, so a look shows what a film in it can do. 1 title and numbers (kicker, headline, sentence, counting number, 3D
   pie, a card); 2 charts (a heat-tile panel, glass bars); 3 a map with labels the placer puts on the globe; 4 two people
   talking, a bee. Every piece arrives in the look's MOTION and every card in its BOX, so a change shows at once: the app
   posts {dna, scene} (scene -1 plays all four) and a new motion or box replays the scene from its start. No render, no
   model call.   node gallery-build.mjs      bundles this into frontend/public/library/specimen.{js,html} */
import { Player, type PlayerRef } from "@remotion/player";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Transition, TRANSITIONS } from "../argon/film";
import { At } from "../argon/kit";
import { Globe } from "../argon/lib/blocks-b";
import { Card } from "../argon/lib/cards";
import { Creature } from "../argon/lib/creatures";
import { Conversation } from "../argon/lib/people";
import { Lib } from "../print/bridge";
import { HeatTiles, Panel, Pie3D, Tag } from "../print/depth";
import { Enter } from "../print/enter";
import { DNA, loadPrintFonts, Sheet, Type } from "../print/kit";
import { GlassBars, Num, Stack } from "../print/spread";
import LOOKS_JSON from "../print/looks-preview.json";
import SHOWS from "../print/showcase.json";
import { Showcase, SHOW, type Show } from "./showcase-scenes";

const FPS = 30, SCENE = 5 * FPS, SCENES = 4;

/** a piece in a box of its own, arriving in the look's motion (so a pop or a flip turns about the piece, not the frame) */
const In: React.FC<{ t: number; at: number; x: number; y: number; w: number; h: number; children: React.ReactNode }> = ({ t, at, x, y, w, h, children }) =>
  <Enter t={t} at={at} style={{ inset: "auto", left: x, top: y, width: w, height: h }}>{children}</Enter>;

const Title: React.FC<{ t: number; kicker: string[]; title: string; w?: number }> = ({ t, kicker, title, w = 1100 }) => <>
  <Stack x={110} y={70} lines={kicker} t={t} at={0} size={24} />
  <In t={t} at={0.15} x={110} y={150} w={w} h={240}><Type size={92} display w={w}>{title}</Type></In>
</>;

const Numbers: React.FC<{ t: number }> = ({ t }) => <>
  <Title t={t} kicker={["CHAPTER 3", "THE MONSOON"]} title="How the monsoon reaches India" w={940} />
  <In t={t} at={0.5} x={110} y={400} w={860} h={110}><Type size={34}>Every June, warm wet winds from the Indian Ocean bring most of the year's rain in just four months.</Type></In>
  <In t={t} at={0.9} x={120} y={560} w={420} h={420}>
    <Pie3D cx={210} cy={220} r={175} t={t} at={[1.0, 1.2, 1.4]} slices={[{ label: "Jun–Sep", value: 70 }, { label: "Oct–Dec", value: 18 }, { label: "Rest", value: 12 }]} />
  </In>
  <In t={t} at={1.3} x={600} y={620} w={480} h={300}><Num x={0} y={0} t={t} at={1.4} to={70} size={170} suffix="%" label="of the year's rain" /></In>
  <Lib dur={SCENE / FPS}>
    <In t={t} at={0.7} x={1160} y={110} w={660} h={320}><Card w={660} h={320} at={0.7} motion="" title="Did you know?" text="Kerala gets the first rain of the monsoon, around 1 June." seed={2} /></In>
    <In t={t} at={1.6} x={1160} y={520} w={660} h={320}><Card w={660} h={320} at={1.6} motion="" title="4 months" text="June to September: the season that feeds India's farms." seed={5} /></In>
  </Lib>
</>;

const ROWS = ["Kerala", "Goa", "Mumbai", "Delhi", "Jaipur"], COLS = ["MAY", "JUN", "JUL", "AUG", "SEP", "OCT"];
const RAIN = ROWS.map((_, i) => COLS.map((__, j) => Math.round(Math.max(28, 95 - i * 12 - Math.abs(j - 2) * 24 + (i * 7 + j * 5) % 11))));
const Charts: React.FC<{ t: number }> = ({ t }) => <>
  <Title t={t} kicker={["THE DATA", "RAIN BY MONTH"]} title="Where the rain falls" />
  <Panel x={110} y={330} w={900} h={660} t={t} at={0.5} kicker="MILLIMETRES, AVERAGE" title="Rain by city">
    <HeatTiles x={150} y={180} w={700} h={420} rows={ROWS} cols={COLS} values={RAIN} t={t} from={0.9} to={2.6} />
  </Panel>
  <In t={t} at={0.9} x={1110} y={330} w={700} h={620}>
    <GlassBars onPage x={0} y={40} w={700} h={540} t={t} bars={[{ label: "Cherrapunji", value: 11777, text: "11,777", at: 1.1 }, { label: "Mumbai", value: 2213, text: "2,213", at: 1.3 },
      { label: "Delhi", value: 774, text: "774", at: 1.5 }, { label: "Jaisalmer", value: 209, text: "209", at: 1.7 }]} />
  </In>
</>;

const MapScene: React.FC<{ t: number }> = ({ t }) => <>
  <Title t={t} kicker={["THE ROUTE", "1 JUNE TO 15 JULY"]} title="The rain moves north" w={900} />
  <Lib dur={SCENE / FPS}>
    <In t={t} at={0.3} x={420} y={300} w={640} h={640}><At x={320} y={320} anchor="center"><Globe lon={78} lat={14} size={560} at={0.4} dur={1.6} /></At></In>
    <In t={t} at={1.0} x={1220} y={380} w={600} h={330}><Card w={600} h={330} at={1.0} motion="" title="About six weeks" text="From Kerala's coast the rain sweeps north until it covers all of India." seed={7} /></In>
  </Lib>
  {/* labels name what they point at; the placer finds the spot (src/argon/place.tsx) */}
  <Tag to="globe.8.5,76.9" t={t} at={2.0} tone="accent">KERALA · 1 JUNE</Tag>
  <Tag to="globe.28.6,77.2" t={t} at={2.4} tone="ink">DELHI · 30 JUNE</Tag>
  <Tag to="globe.equator" t={t} at={2.8} tone="plain">EQUATOR</Tag>
</>;

const Talk: React.FC<{ t: number }> = ({ t }) => <>
  <Title t={t} kicker={["ASK A SCIENTIST"]} title="Why does the wind turn?" w={1000} />
  <Lib dur={SCENE / FPS}>
    <In t={t} at={0.4} x={0} y={0} w={1920} h={1080}>
      <Conversation size={430} people={[{ avatar: "kid", name: "Riya" }, { avatar: "scientist", name: "Dr Rao" }]}
        lines={[{ who: 0, text: "Why does the wind come from the sea?", at: 0.6 }, { who: 1, text: "The land heats up faster and pulls it in.", at: 2.4, pose: "explain" }]} />
    </In>
    <Creature kind="bee" x={1500} y={260} size={90} move="wander" at={1.2} range={160} loop />
  </Lib>
</>;

const PAGES = [Numbers, Charts, MapScene, Talk];
/** one scene, arriving by the transition the look allows (pinned in the studio, else each in turn) */
const Page: React.FC<{ dna: DNA; i: number; kinds: readonly string[] }> = ({ dna, i, kinds }) => {
  const P = PAGES[i], t = useCurrentFrame() / FPS;
  return <Transition kind={kinds[i % kinds.length]}><Sheet dna={dna} page={i + 1}><P t={t} /></Sheet></Transition>;
};
const Scene: React.FC<{ dna: DNA; scene: number }> = ({ dna, scene }) => {
  const show = (SHOWS as unknown as Record<string, Show>)[dna.family ?? ""];
  if (scene === -2 && show) return <Showcase dna={dna} show={show} />;  // the look's own 9 s showcase: its topic, its vibe, when to use it
  const kinds = dna.transitions?.length ? dna.transitions : TRANSITIONS.filter((k) => k !== "cut");
  const shown = scene >= 0 ? [scene] : PAGES.map((_, i) => i);
  return <AbsoluteFill style={{ background: "#111" }}>
    {shown.map((i, k) => <Sequence key={i} from={k * SCENE} durationInFrames={SCENE}>
      <Page dna={dna} i={i} kinds={kinds} />
    </Sequence>)}
  </AbsoluteFill>;
};

function Specimen() {
  const [dna, setDna] = useState<DNA>((LOOKS_JSON as unknown as DNA[])[0]);
  const [scene, setScene] = useState(-2);
  const [replay, setReplay] = useState(0);
  const player = useRef<PlayerRef>(null);
  const last = useRef<{ dna?: DNA; scene: number }>({ scene: -2 });
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const m = e.data;
      if (!m || typeof m !== "object" || !m.dna) return;
      const was = last.current, sc = typeof m.scene === "number" ? m.scene : -2;
      loadPrintFonts(m.dna); setDna(m.dna); setScene(sc);
      // a new motion, box, card, entrance or transition is only seen as a piece arrives: play the scene again from its start
      const how = (d: DNA) => JSON.stringify([d.motion, d.box, d.card, d.enter, d.transitions]);
      if (was.dna && (how(was.dna) !== how(m.dna) || was.scene !== sc)) setReplay((r) => r + 1);
      last.current = { dna: m.dna, scene: sc };
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ specimenReady: true }, "*");  // the app sends the look as soon as the preview can take it
    return () => window.removeEventListener("message", on);
  }, []);
  useEffect(() => {
    const p = player.current;
    if (!replay || !p) return;
    p.seekTo(scene === -1 ? Math.floor(p.getCurrentFrame() / SCENE) * SCENE : 0);
    p.play();
  }, [replay, scene]);
  return <Player ref={player} component={Scene} inputProps={{ dna, scene }} durationInFrames={scene === -2 ? SHOW : scene >= 0 ? SCENE : SCENE * SCENES} fps={FPS}
    compositionWidth={1920} compositionHeight={1080} style={{ width: "100%", aspectRatio: "16 / 9" }} autoPlay loop controls numberOfSharedAudioTags={0} acknowledgeRemotionLicense />;
}

createRoot(document.getElementById("root")!).render(<Specimen />);
