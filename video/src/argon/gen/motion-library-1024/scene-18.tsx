import { AppScreen, CloudServers, CodeBlock, Cursor, Laptop, Notification, Phone } from "../../lib/blocks-c";
import { Center, Showcase, type Item } from "./show";

const scale = (k: number, x = 0, y = 0) => ({ position: "absolute" as const, left: x, top: y, transform: `scale(${k})`, transformOrigin: "0 0" });

export default function Scene() {
  const items: Item[] = [
    { name: "Phone", does: "a phone; any screen inside it", loop: 4.4, node: <div style={scale(0.62, 360, 20)}><Phone at={0.1} h={780}><AppScreen at={0.6} /></Phone></div> },
    { name: "AppScreen", does: "placeholders load, then real cards", loop: 4, node: <div style={scale(1, 280, 0)}><div style={{ width: 400, height: 540, background: "#f6f7f9" }}><AppScreen at={0.2} title="Cart" /></div></div> },
    { name: "Laptop", does: "a laptop opens and lights up", loop: 4, node: <div style={scale(0.7, 95, 50)}><Laptop at={0.2} w={1100}><div style={{ padding: 40, fontSize: 60, fontWeight: 800 }}>Dashboard</div></Laptop></div> },
    { name: "CodeBlock", does: "code typed line by line, coloured", loop: 5, node: <div style={scale(0.86, 50, 30)}><CodeBlock at={0.2} code={'const total = items\n  .map((i) => i.price)\n  .reduce((a, b) => a + b, 0)\n// 894\nreturn total'} /></div> },
    { name: "CloudServers", does: "data going up and down to the cloud", node: <div style={scale(0.78, 10, -20)}><CloudServers at={0.2} /></div> },
    { name: "Cursor", does: "a mouse moves and clicks", loop: 4.4, node: <><div style={{ position: "absolute", left: 120, top: 140, width: 300, height: 90, borderRadius: 16, background: "#2f81f7", color: "#fff", fontSize: 40, fontWeight: 800, display: "grid", placeItems: "center" }}>Buy now</div><div style={{ position: "absolute", left: 560, top: 320, width: 300, height: 90, borderRadius: 16, background: "#1f9d55", color: "#fff", fontSize: 40, fontWeight: 800, display: "grid", placeItems: "center" }}>Pay ₹894</div><Cursor at={0.2} per={1.1} path={[[800, 60], [260, 180], [700, 360]]} /></> },
    { name: "Notification", does: "a message drops in with a wiggle", loop: 3.4, bg: "#2b2f38", node: <Center y={0.4}><Notification at={0.4} /></Center> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Tech" count={items.length} items={items} cols={4} />;
}
