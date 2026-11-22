import { BuildUp, Disintegrate, GrowPlant, LiquidLevel, MOVES2, Morph, Move2, PaperFold, type Move2Kind } from "../../lib/motion-b";
import { Center, Showcase, Thing, type Item } from "./show";
import { Img, staticFile } from "remotion";
import { pic } from "./pics";

/* layer 1, part B: changes of form */
export default function Scene() {
  const kinds = (Object.keys(MOVES2) as Move2Kind[]).filter((k) => MOVES2[k].group === "change");
  const glyphs = ["🎈", "🎈", "🍦", "📜", "💧", "🌱", "🧊", "🌀", "🪙", "👻", "🖼️"];
  const items: Item[] = kinds.map((k, i) => ({ name: k, does: MOVES2[k].does, loop: 3.6, node: <Center><Move2 kind={k} at={0.4} dur={1.4}><Thing glyph={glyphs[i % glyphs.length]} size={230} /></Move2></Center> }));
  items.push(
    { name: "Morph", does: "one shape becomes another", loop: 6, node: <Morph shapes={["circle", "heart", "star", "drop", "square"]} x={480} y={270} size={170} at={0.3} every={1.1} /> },
    { name: "GrowPlant", does: "a plant grows and flowers", loop: 4.4, node: <GrowPlant x={480} y={480} height={380} at={0.2} dur={2.6} /> },
    { name: "BuildUp", does: "a building rises floor by floor", loop: 4.4, node: <BuildUp x={480} y={510} floors={7} at={0.2} /> },
    { name: "LiquidLevel", does: "a level rises (tank, battery, glass)", loop: 4, node: <><LiquidLevel x={220} y={90} w={200} h={360} to={0.75} at={0.3} /><LiquidLevel x={560} y={120} w={180} h={330} from={0.9} to={0.15} at={0.3} shape="battery" /></> },
    { name: "PaperFold", does: "folds away like paper", loop: 3.6, node: <Center><PaperFold w={600} h={400} at={0.6} dur={1.6}><Img src={staticFile(pic("map.png"))} style={{ width: 600, height: 400, objectFit: "cover" }} /></PaperFold></Center> },
    { name: "Disintegrate", does: "turns to dust and blows away", loop: 4, node: <Center><Disintegrate w={600} h={400} at={0.6} dur={2}><Img src={staticFile(pic("gandhi.png"))} style={{ width: 600, height: 400, objectFit: "contain" }} /></Disintegrate></Center> },
  );
  return <Showcase layer="LAYER 1 · MOTIONS" group="Change of form" count={items.length} items={items} cols={6} />;
}
