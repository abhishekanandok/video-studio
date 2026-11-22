import { HeartLine, LettersFly, Packets, Radar, Scramble, SignalRings, SoundWave, StrikeCorrect, TextOnPath, Typewriter } from "../../lib/motion-b";
import { Center, Showcase, Thing, type Item } from "./show";

/* layer 1, part B: signals and text that moves */
export default function Scene() {
  const items: Item[] = [
    { name: "HeartLine", does: "a heartbeat line (ECG)", node: <><div style={{ position: "absolute", inset: 0, background: "#000" }} /><Center><HeartLine w={820} h={300} /></Center></> },
    { name: "SoundWave", does: "bars or a wave move with sound", node: <Center><div style={{ display: "grid", gap: 20 }}><SoundWave w={760} h={180} /><SoundWave w={760} h={120} line /></div></Center> },
    { name: "Radar", does: "a sweep with blips", node: <Center><Radar size={440} /></Center> },
    { name: "SignalRings", does: "rings spread from a point", node: <><SignalRings x={300} y={290} size={240} /><SignalRings x={680} y={330} size={200} arc /><div style={{ position: "absolute", left: 250, top: 240, fontSize: 90 }}>📡</div><div style={{ position: "absolute", left: 640, top: 310, fontSize: 80 }}>📱</div></> },
    { name: "Packets", does: "dots flow along a pipe", node: <><Packets points={[[100, 400], [300, 150], [600, 380], [860, 140]]} count={9} /><div style={{ position: "absolute", left: 40, top: 380 }}><Thing glyph="💻" size={120} /></div><div style={{ position: "absolute", left: 800, top: 60 }}><Thing glyph="☁️" size={120} /></div></> },
    { name: "Typewriter", does: "letters type out", loop: 4.6, node: <div style={{ position: "absolute", left: 80, top: 160, width: 800 }}><Typewriter text={"Dear Sir,\nThe salt tax must go."} at={0.2} size={60} /></div> },
    { name: "Scramble", does: "random letters decode", loop: 3.6, node: <Center><Scramble text="TOP SECRET" at={0.3} size={110} /></Center> },
    { name: "StrikeCorrect", does: "struck out and corrected", loop: 3.4, node: <Center><StrikeCorrect wrong="Flat Earth" right="Round!" at={0.4} size={90} /></Center> },
    { name: "LettersFly", does: "letters fly in, then apart", loop: 4.6, node: <Center><LettersFly text="FREEDOM" at={0.2} out={2.8} size={130} /></Center> },
    { name: "TextOnPath", does: "words run along a curve", node: <TextOnPath text="The river Ganga flows to the sea ~ ~ ~" points={[[60, 420], [300, 220], [600, 380], [900, 160]]} at={0.2} size={50} scroll={8} /> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Signals and moving text" count={items.length} items={items} cols={5} />;
}
