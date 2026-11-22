import { Character } from "../../lib/blocks-d";
import { MOVES2, Move2, type Move2Kind } from "../../lib/motion-b";
import { Center, Showcase, type Item } from "./show";

/* layer 1, part B: acting, on a drawn character */
export default function Scene() {
  const acting = (Object.keys(MOVES2) as Move2Kind[]).filter((k) => MOVES2[k].group === "acting");
  const emo = ["happy", "neutral", "surprised", "neutral", "happy", "neutral", "scared", "sad", "laughing", "thinking", "surprised"] as const;
  const items: Item[] = acting.map((k, i) => ({ name: k, does: MOVES2[k].does, loop: 3.4, node: <Center y={0.55}><Move2 kind={k} at={0.4} dur={1}><Character emotion={emo[i % emo.length]} height={420} seed={i} /></Move2></Center> }));
  return <Showcase layer="LAYER 1 · MOTIONS" group="Acting" count={items.length} items={items} cols={6} />;
}
