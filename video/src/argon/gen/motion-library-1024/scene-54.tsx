import { Img, staticFile } from "remotion";
import { Avatar, HBars } from "../../lib/blocks-a";
import { Landscape, PaperStage, Room } from "../../lib/blocks-c";
import { Character, Flag, Hospital } from "../../lib/blocks-d";
import { Robot } from "../../lib/blocks-f";
import { Swap } from "../../lib/parts";
import { pic } from "./pics";
import { Center, Fit, Showcase, type Item } from "./show";

/* parts: every block's named pieces swapped for real pictures; the motion (curtains, a waving flag, a beeping monitor) stays */
const face = (n: string) => <Img src={staticFile(pic(n))} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />;
export default function Scene() {
  const items: Item[] = [
    { name: "Hospital · background", does: "a real photo; the monitor still beeps", node: <Hospital parts={{ background: pic("control.jpg") }} /> },
    { name: "PaperStage · curtain", does: "picture curtains still part", loop: 4, node: <PaperStage at={0.3} parts={{ curtain: pic("surface.jpg"), background: pic("town.png") }} /> },
    { name: "Room · window", does: "the view out of the window is a photo", node: <Room parts={{ window: pic("orbit.jpg") }} /> },
    { name: "Character · head", does: "a photo head on a moving body", node: <Center y={0.55}><Character height={420} emotion="happy" parts={{ head: () => face("gandhi.png") }} /></Center> },
    { name: "Flag · cloth", does: "any picture, waving", node: <Center><Flag country="IN" w={420} parts={{ cloth: pic("sun.png") }} /></Center> },
    { name: "Robot · head", does: "a screen face swapped in", node: <Center><Robot size={360} talks parts={{ head: <div style={{ width: "100%", height: "100%", borderRadius: 12, background: "#111", display: "grid", placeItems: "center", fontSize: 26 }}>😄</div> }} /></Center> },
    { name: "Avatar · face", does: "a photo instead of initials", node: <Center><div style={{ display: "flex", gap: 30 }}><Avatar name="Ravi Kumar" size={180} parts={{ face: pic("porch.png") }} /><Avatar name="Asha Rao" size={180} /></div></Center> },
    { name: "HBars · bar(item)", does: "each bar drawn your way", loop: 3, node: <Fit s={0.8}><HBars data={[{ label: "Tea", value: 82 }, { label: "Coffee", value: 54 }, { label: "Juice", value: 30 }]} parts={{ bar: (_d, i, original) => <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{original}<span style={{ fontSize: 40 }}>{["🍵", "☕", "🧃"][i]}</span></div> }} /></Fit> },
    { name: "Swap · from outside", does: "one Swap restyles a whole scene", node: <Swap parts={{ "Landscape.sun": face("sun.png"), "Landscape.cloud": <div style={{ fontSize: 70 }}>🕊️</div> }}><Landscape /></Swap> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Every block: swap its parts" count={items.length} items={items} cols={3} />;
}
