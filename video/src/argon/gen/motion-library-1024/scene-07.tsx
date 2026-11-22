import { Img, staticFile } from "remotion";
import { Transition, type CutKind } from "../../lib/motion";
import { pic } from "./pics";
import { Showcase, type Item } from "./show";

const full = (name: string) => <Img src={staticFile(pic(name))} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />;
const DOES: Record<CutKind, string> = { cut: "a straight cut", dissolve: "one shot melts into the next", push: "the new shot pushes the old one off", page: "the old shot turns like a page", fold: "the old shot folds away", match: "closes to a point and opens on the next", zoom: "zooms through into the next", mapzoom: "dives into a place on the map", ink: "ink spills over into the next" };
const PAIRS: Record<CutKind, [string, string, [number, number]?]> = { cut: ["control.jpg", "surface.jpg"], dissolve: ["porch.png", "town.png"], push: ["salt0.png", "map.png"], page: ["map.png", "porch.png"], fold: ["town.png", "salt0.png"], match: ["sun.png", "window.png"], zoom: ["orbit.jpg", "surface.jpg", [0.3, 0.32]], mapzoom: ["map.png", "salt0.png", [0.32, 0.55]], ink: ["porch.png", "salt0.png", [0.2, 0.8]] };

export default function Scene() {
  const items: Item[] = (Object.keys(DOES) as CutKind[]).map((k) => {
    const [a, b, focus] = PAIRS[k];
    return { name: k, does: DOES[k], loop: 3.4, node: <Transition kind={k} at={1.3} dur={k === "cut" ? 0.1 : 1.1} a={k === "match" ? <div style={{ position: "absolute", inset: 0, background: "#f3e3c3", display: "grid", placeItems: "center" }}><Img src={staticFile(pic(a))} style={{ height: 380 }} /></div> : full(a)} b={full(b)} focus={focus} /> };
  });
  return <Showcase layer="LAYER 1 · MOTIONS" group="Transitions" count={items.length} items={items} cols={3} />;
}
