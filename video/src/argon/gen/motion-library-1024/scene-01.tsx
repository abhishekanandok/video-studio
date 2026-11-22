import { Img, staticFile } from "remotion";
import { useScene } from "../../kit";
import { Assemble, MOVES, Move, Scatter, type MoveKind } from "../../lib/motion";
import { pic } from "./pics";
import { Center, Showcase, Thing, type Item } from "./show";

const GLYPH = ["🌍", "📦", "🧭", "💡", "📰", "🎯", "🪙", "📌", "🗝️", "🎈", "🧩", "⭐"];

export default function Scene() {
  const s = useScene();
  const enter = (Object.keys(MOVES) as MoveKind[]).filter((k) => MOVES[k].group === "enter");
  const photo = <Img src={staticFile(pic("porch.png"))} style={{ width: 560, height: 315, objectFit: "cover", borderRadius: 10 }} />;
  const items: Item[] = [
    ...enter.map((k, i) => ({ name: k, does: MOVES[k].does.replace(/^\w+ /, (w) => w), node: <Center><Move kind={k} at={0.3} dur={k === "drop" ? 1.1 : 0.8} out={3.1}><Thing glyph={GLYPH[i]} size={220} color={i % 2 ? s.theme.accent2 : s.theme.accent} /></Move></Center> })),
    { name: "Assemble", does: "pieces fly in and lock together", node: <Center><Assemble w={560} h={315} at={0.2} dur={1.6}>{photo}</Assemble></Center>, loop: 4.2 },
    { name: "Scatter", does: "breaks into pieces that blow away", node: <Center><Scatter w={560} h={315} at={1.6} dur={1.4}>{photo}</Scatter></Center>, loop: 4.2 },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Enter and exit" count={items.length} items={items} cols={5} />;
}
