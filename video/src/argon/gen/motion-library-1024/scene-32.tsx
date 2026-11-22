import { Forest, Lab, Mountains, Stadium, Temple, Underwater, VehicleInside, Village } from "../../lib/blocks-d";
import { Backdrop } from "../../lib/blocks-f";
import { Showcase, type Item } from "./show";

/* layer 2, part D: sets (2 of 2), and backdrops */
export default function Scene() {
  const items: Item[] = [
    { name: "Village", does: "huts, trees, a dirt path", node: <Village /> },
    { name: "Underwater", does: "light rays, bubbles, fish", node: <Underwater /> },
    { name: "Forest", does: "trees in depth and mist", node: <Forest /> },
    { name: "Mountains", does: "snowy peaks and a lake", node: <Mountains /> },
    { name: "Temple", does: "columns, dome or spire", node: <div style={{ position: "absolute", inset: 0, display: "flex" }}>{(["columns", "dome", "spire"] as const).map((k) => <div key={k} style={{ position: "relative", flex: 1, overflow: "hidden" }}><div style={{ position: "absolute", left: "50%", top: 0, width: 960, height: 540, transform: "translateX(-50%) scale(0.6)", transformOrigin: "50% 60%" }}><Temple kind={k} /></div></div>)}</div> },
    { name: "Lab", does: "benches and bubbling flasks", node: <Lab /> },
    { name: "Stadium", does: "a cheering crowd, a pitch", node: <Stadium /> },
    { name: "VehicleInside", does: "car, train or plane window", node: <div style={{ position: "absolute", inset: 0, display: "flex" }}>{(["car", "train", "plane"] as const).map((k) => <div key={k} style={{ position: "relative", flex: 1, overflow: "hidden" }}><div style={{ position: "absolute", left: "50%", top: 0, width: 960, height: 540, transform: "translateX(-50%) scale(0.42)", transformOrigin: "50% 40%" }}><VehicleInside kind={k} /></div></div>)}</div> },
    ...(["chalkboard", "blueprint", "sepia", "neon", "bokeh", "graph", "noir", "paper"] as const).map((k) => ({ name: `Backdrop · ${k}`, does: "a full-screen texture", node: <Backdrop kind={k} /> })),
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Sets (2 of 2) and backdrops" count={items.length} items={items} cols={4} />;
}
