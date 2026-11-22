import { Img, staticFile } from "remotion";
import { Building, CityNight, Vehicle } from "../../lib/blocks-d";
import { BalloonRise, Dominoes, MagnetPull, ObjectWipe, OnBeat, RopeSwing, RuinRestore, ShapeMatch, TimelineScrub, WindBlow } from "../../lib/motion-c";
import { Temple } from "../../lib/blocks-d";
import { pic } from "./pics";
import { Center, Fit, Showcase, Thing, type Item } from "./show";

/* layer 1, part C: chain physics, transitions that use a thing, time on a place, the beat */
export default function Scene() {
  const photo = (n: string) => <Img src={staticFile(pic(n))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  const coins = Array.from({ length: 8 }, (_, i) => ({ node: <div style={{ fontSize: 60 }}>🪙</div>, x: 100 + (i % 4) * 120, y: 120 + Math.floor(i / 4) * 280 }));
  const items: Item[] = [
    { name: "Dominoes", does: "a chain reaction", loop: 4, node: <Dominoes count={8} x={130} y={440} gap={90} h={220} at={0.4} labels={["rain", "flood", "crops", "prices", "hunger", "", "", ""]} /> },
    { name: "RopeSwing", does: "swings and slows", loop: 6, node: <RopeSwing x={480} y={20} length={320} at={0}><Thing glyph="🏚️" size={150} /></RopeSwing> },
    { name: "BalloonRise", does: "balloons rise and sway", loop: 5, node: <BalloonRise count={6} at={0.2} x={480} y={600} /> },
    { name: "WindBlow", does: "a gust sweeps things away", loop: 3.6, node: <WindBlow at={0.8} items={[{ node: <div style={{ fontSize: 80 }}>💵</div>, x: 200, y: 200 }, { node: <div style={{ fontSize: 80 }}>📄</div>, x: 360, y: 320 }, { node: <div style={{ fontSize: 80 }}>🍂</div>, x: 260, y: 420 }, { node: <div style={{ fontSize: 80 }}>☂️</div>, x: 500, y: 260 }]} /> },
    { name: "MagnetPull", does: "pulled in and stuck", loop: 4, node: <MagnetPull x={720} y={270} at={0.6} items={coins} /> },
    { name: "ObjectWipe", does: "a bus wipes to the next shot", loop: 3.4, node: <ObjectWipe at={1} dur={1.4} a={photo("control.jpg")} b={<CityNight />} wiper={<Vehicle kind="bus" size={420} />} width={420} /> },
    { name: "ShapeMatch", does: "closes to a coin, opens a sun", loop: 3.4, node: <ShapeMatch at={1} x={480} y={270} shape="circle" a={photo("porch.png")} b={photo("sun.png")} /> },
    { name: "RuinRestore", does: "falls to ruin over the years", loop: 5, node: <Center><RuinRestore w={760} h={460} at={0.4} dur={3.6}><div style={{ position: "relative", width: 760, height: 460, overflow: "hidden" }}><Temple kind="dome" /></div></RuinRestore></Center> },
    { name: "TimelineScrub", does: "a cursor moves event to event", loop: 6, node: <Fit s={0.58}><TimelineScrub events={[{ year: "1857", text: "The revolt" }, { year: "1919", text: "Jallianwala Bagh" }, { year: "1930", text: "Salt March" }, { year: "1947", text: "Independence" }]} at={0.2} per={1.3} /></Fit> },
    { name: "OnBeat", does: "pulses on the music's beats", node: <Center><OnBeat bpm={110} amount={2}><Building kind="skyscraper" size={300} /></OnBeat></Center> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Physics, wipes and time" count={items.length} items={items} cols={5} />;
}
