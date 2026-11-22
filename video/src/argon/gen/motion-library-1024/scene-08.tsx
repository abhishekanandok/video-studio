import { Img, staticFile } from "remotion";
import { Puppet } from "../../kit";
import { CalendarFlip, ClockSpin, DayNight, FreezeFrame, Speed } from "../../lib/motion";
import { pic } from "./pics";
import { RIGS } from "./rigs";
import { Center, Showcase, type Item } from "./show";

const walker = <><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#cde6f5, #f4ead6)" }} /><div style={{ position: "absolute", left: 0, right: 0, top: 470, bottom: 0, background: "#c9b089" }} /><Puppet rig={RIGS.boy} y={480} height={300} from={120} to={840} at={0.2} dur={4} /></>;

export default function Scene() {
  const items: Item[] = [
    { name: "Speed ×", does: "fast-forward: the same walk, 3 times faster", loop: 4.4, node: <Speed at={0.8} speed={3}>{walker}</Speed> },
    { name: "Speed −", does: "rewind: it plays backwards", loop: 4.4, node: <Speed at={2.4} speed={-2}>{walker}</Speed> },
    { name: "FreezeFrame", does: "it stops dead, with a flash", loop: 4.4, node: <FreezeFrame at={2}>{walker}</FreezeFrame> },
    { name: "ClockSpin", does: "hours pass in seconds", loop: 4, node: <Center><ClockSpin size={400} at={0.3} dur={3.2} hours={12} /></Center> },
    { name: "CalendarFlip", does: "days tear off one by one", loop: 4, node: <Center><CalendarFlip at={0.3} every={0.5} size={330} pages={["12", "13", "14", "15", "16", "17"].map((d) => ({ top: "MARCH 1930", big: d }))} /></Center> },
    { name: "DayNight", does: "day turns to dusk, then night", loop: 5.4, node: <><DayNight at={0.3} dur={4.4} /><Img src={staticFile(pic("sun.png"))} style={{ display: "none" }} /></> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Time" count={items.length} items={items} cols={3} />;
}
