import { Street } from "../../lib/blocks-c";
import { Farm, Village } from "../../lib/blocks-d";
import { Pursuit } from "../../lib/motion-c";
import { Showcase, type Item } from "./show";

/* layer 1, part C: chases */
export default function Scene() {
  const items: Item[] = [
    { name: "Pursuit · foot, caught", does: "a police officer runs down a thief", loop: 5.4, node: <><Village /><Pursuit kind="foot" at={0.2} dur={4} ending="caught" size={220} /></> },
    { name: "Pursuit · car, escaped", does: "the car gets away", loop: 5, node: <><Street /><Pursuit kind="car" at={0.2} dur={4} ending="escaped" size={230} /></> },
    { name: "Pursuit · police", does: "flashing lights, speed lines, dust", loop: 5, node: <><Street /><Pursuit kind="police" at={0.2} dur={4} size={230} /></> },
    { name: "Pursuit · cat and mouse", does: "round and round a loop", loop: 6, node: <><Farm /><Pursuit kind="cat" at={0} dur={3} size={220} lines={false} /></> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Chases" count={items.length} items={items} cols={2} />;
}
