import { Img, staticFile } from "remotion";
import { Transition2, type Cut2Kind } from "../../lib/motion-b";
import { pic } from "./pics";
import { Showcase, type Item } from "./show";

/* layer 1, part B: more transitions */
export default function Scene() {
  const shot = (name: string) => <Img src={staticFile(pic(name))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  const kinds: [Cut2Kind, string][] = [["glitch", "a glitch cut"], ["circle", "a circle opens"], ["star", "a star-shaped mask"], ["heart", "a heart-shaped mask"], ["shutter", "shutter slices close and open"], ["blinds", "blinds open"], ["spin", "spins away"], ["slide-up", "slides up"], ["lightleak", "a warm light leak"], ["filmburn", "a film burn"]];
  const items: Item[] = kinds.map(([k, does], i) => ({ name: k, does, loop: 3, node: <Transition2 kind={k} at={1} dur={1} a={shot(i % 2 ? "town.png" : "control.jpg")} b={shot(i % 2 ? "surface.jpg" : "porch.png")} /> }));
  return <Showcase layer="LAYER 1 · MOTIONS" group="Transitions (more)" count={items.length} items={items} cols={5} />;
}
