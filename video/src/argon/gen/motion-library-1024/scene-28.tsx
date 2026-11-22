import { Img, staticFile } from "remotion";
import { Equalizer, Hourglass, MOVES2, Move2, Seasons, SlowMo, TimeLapse, YearsPass } from "../../lib/motion-b";
import { Character } from "../../lib/blocks-d";
import { pic } from "./pics";
import { Center, Showcase, Thing, type Item } from "./show";

/* layer 1, part B: more time, and rhythm */
export default function Scene() {
  const items: Item[] = [
    { name: "TimeLapse", does: "a day passes: sun and shadows", loop: 6, node: <TimeLapse at={0} dur={5.5} /> },
    { name: "Seasons", does: "a tree through four seasons", loop: 7, node: <Seasons x={480} y={460} size={420} at={0} per={1.6} /> },
    { name: "Hourglass", does: "sand runs out", loop: 5, node: <Center><Hourglass size={420} at={0.2} dur={4.4} /></Center> },
    { name: "SlowMo", does: "slow motion", loop: 5, node: <SlowMo at={0.8} speed={0.25}><Center><Move2 kind="jump"><Character emotion="happy" height={380} /></Move2></Center></SlowMo> },
    { name: "YearsPass", does: "years count while it ages", loop: 5, node: <YearsPass from={1947} to={2026} at={0.3} dur={4}><Img src={staticFile(pic("town.png"))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /></YearsPass> },
    { name: "beat", does: MOVES2.beat.does, node: <Center><Move2 kind="beat" amount={1.6} seed={2}><Thing glyph="🥁" size={240} /></Move2></Center> },
    { name: "Equalizer", does: "bars jump to the beat", node: <Center><Equalizer w={700} h={300} bps={2} /></Center> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Time and rhythm (more)" count={items.length} items={items} cols={4} />;
}
