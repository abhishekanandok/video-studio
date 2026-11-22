import { Particles } from "../../kit";
import { Confetti, Explosion, Fire, Flock, Gather, Glitch, HeatShimmer, LightRays, Lightning, March, OldFilm, Queue, Sparkle } from "../../lib/motion-b";
import { Animal, Character, Desert } from "../../lib/blocks-d";
import { Img, staticFile } from "remotion";
import { pic } from "./pics";
import { Center, Showcase, Thing, type Item } from "./show";

/* layer 1, part B: groups and effects */
export default function Scene() {
  const dot = (i: number) => <Thing glyph="" size={60} color={["#2563EB", "#F59E0B", "#e0453a", "#3fb35a"][i % 4]} />;
  const photo = <Img src={staticFile(pic("control.jpg"))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  const items: Item[] = [
    { name: "Gather", does: "scattered things come together", loop: 3.6, node: <Gather items={Array.from({ length: 18 }, (_, i) => dot(i))} x={230} y={150} cols={6} gap={100} at={0.3} /> },
    { name: "March", does: "rows march in step", loop: 5, node: <March item={<Character job="soldier" height={150} />} y={360} rows={2} per={6} gap={130} speed={160} at={0} /> },
    { name: "Queue", does: "a line moves up one by one", loop: 5, node: <Queue items={Array.from({ length: 6 }, (_, i) => <Character key={i} height={200} seed={i} job={i % 2 ? "worker" : "none"} />)} x={250} y={470} gap={130} every={1} at={0.4} /> },
    { name: "Flock", does: "a swarm wheels together", loop: 6, node: <><div style={{ position: "absolute", inset: 0, background: "#bfe3f5" }} /><Flock item={<Animal kind="bird" size={70} />} count={22} x={480} y={250} spread={260} /></> },
    { name: "Fire", does: "flames and embers", node: <><div style={{ position: "absolute", inset: 0, background: "#1a1010" }} /><Fire x={480} y={500} w={300} h={380} at={0.2} /></> },
    { name: "Explosion", does: "a blast with debris", loop: 3.4, node: <><div style={{ position: "absolute", inset: 0, background: "#6a7a8a" }} /><Explosion x={480} y={300} at={0.4} size={360} /></> },
    { name: "Lightning", does: "a bolt and a flash", loop: 3, node: <><div style={{ position: "absolute", inset: 0, background: "#1a2033" }} /><Lightning x={480} length={540} at={0.6} every={2.4} /></> },
    { name: "Confetti", does: "a burst that flutters down", loop: 4, node: <Confetti at={0.3} count={90} x={480} y={260} /> },
    { name: "Sparkle", does: "twinkles", node: <><Center><Thing glyph="💎" size={220} /></Center><Sparkle x={250} y={100} w={460} h={340} at={0} /></> },
    { name: "LightRays", does: "rays of light", node: <><div style={{ position: "absolute", inset: 0, background: "#2a3a5a" }} /><LightRays x={480} y={-40} at={0.2} length={900} /></> },
    { name: "Glitch", does: "a digital glitch", loop: 2, node: <div style={{ position: "absolute", inset: 0 }}><Glitch at={0.6} dur={0.7}>{photo}</Glitch></div> },
    { name: "OldFilm", does: "old film look", node: <OldFilm>{photo}</OldFilm> },
    { name: "HeatShimmer", does: "hot air wobbles", node: <HeatShimmer amount={1.5}><Desert /></HeatShimmer> },
    { name: "Particles (kit)", does: "rain, snow, bubbles, dust, sparks", node: <><div style={{ position: "absolute", inset: 0, background: "#3a4a6a" }} /><Particles kind="rain" w={480} h={540} /><Particles kind="snow" x={480} w={480} h={540} /></> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Groups and effects" count={items.length} items={items} cols={5} />;
}
