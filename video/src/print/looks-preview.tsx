/* The Plan page's look cards: one sample scene in each look family's current brand, with its set, material, depth,
   card shape and motion. Each family plays for 5 s: family i is frames i*150 .. i*150+149, settled from frame i*150+140.
   python3 -c "import looks, json; ..." writes looks-preview.json;
     still: npx remotion still src/print/looks-preview.tsx LookPreview out.jpg --frame=<i*150+140>
     clip:  npx remotion render src/print/looks-preview.tsx LookPreview out.mp4 --frames=<i*150>-<i*150+149> */
import React from "react";
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame } from "remotion";
import { CubeGrid, HeatTiles, Panel, Pie3D } from "./depth";
import { DNA, loadPrintFonts, Sheet, Type, useDNA } from "./kit";
import { Legend, Plate, Stack } from "./spread";
import LOOKS from "./looks-preview.json";

const ALL = LOOKS as unknown as DNA[];
ALL.forEach(loadPrintFonts);
const SPAN = 150;
// photo-led families show a real Wikimedia photo where the others show the pie
const PHOTO = ["zine", "magazine", "encyclopedia", "pinboard", "fieldjournal", "travelposter", "collage", "gallery", "contactsheet", "constructivist", "stencil", "vaporwave", "diorama", "atlas"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const ROWS = ["A", "B", "C", "D", "E", "F"];
const VALUES = ROWS.map((_, i) => MONTHS.map((__, j) => Math.round(50 + 45 * Math.sin(i * 1.3 + j * 0.7) * Math.cos(j * 0.4 - i * 0.5))));

const Sample: React.FC<{ t: number }> = ({ t }) => {
  const d = useDNA();
  const iso = d.depth === "iso";
  return <>
    <Stack x={110} y={80} lines={["2026", "GPU DEMAND"]} t={t} at={0} size={24} />
    <div style={{ position: "absolute", left: 110, top: 170, width: 720 }}><Type size={80} display w={740}>Who buys AI chips</Type></div>
    {PHOTO.includes(d.family ?? "") ? <Plate x={130} y={400} w={480} h={540} t={t} at={0.2} src={staticFile("print/sample/racks.jpg")} cut={!["magazine", "travelposter"].includes(d.family ?? "")}
      credit="NERSC · CC0 · Wikimedia Commons" /> : <>
      <Pie3D cx={370} cy={600} r={210} t={t} at={[0.3, 0.6, 0.9, 1.2]} donut={d.shape === "pill" || d.shape === "rounded" ? 0.42 : 0}
        slices={[{ label: "Cloud", value: 42 }, { label: "AI labs", value: 28 }, { label: "Enterprise", value: 18 }, { label: "Other", value: 12 }]} />
      <Legend x={110} y={850} w={560} t={t} at={[1.4, 1.5, 1.6, 1.7]} size={28} items={[{ label: "Cloud", value: "42%" }, { label: "AI labs", value: "28%" }, { label: "Enterprise", value: "18%" }]} />
    </>}
    <Panel x={900} y={110} w={930} h={iso ? 860 : 780} t={t} at={0.5} kicker="MONTHLY DEMAND" title="Heatmap">
      {iso ? <CubeGrid x={430} y={290} cell={64} rows={ROWS} cols={MONTHS.slice(0, 8)} values={VALUES} t={t} from={1} to={3.2} />
        : <HeatTiles x={44} y={210} w={850} h={530} rows={ROWS} cols={MONTHS} values={VALUES} t={t} from={1} to={3.2} />}
    </Panel>
  </>;
};

const Preview = () => {
  const f = useCurrentFrame();
  const i = Math.min(ALL.length - 1, Math.floor(f / SPAN));
  return <AbsoluteFill><Sheet dna={ALL[i]}><Sample t={(f % SPAN) / 30} /></Sheet></AbsoluteFill>;
};

registerRoot(() => <Composition id="LookPreview" component={Preview} durationInFrames={Math.max(1, ALL.length) * SPAN} fps={30} width={1920} height={1080} />);
