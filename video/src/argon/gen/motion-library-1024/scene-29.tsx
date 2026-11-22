import { DragDrop, MOVES2, Move2, ProgressBar, Scroll, Spinner, Swipe, Tap, Toggle, TypeInto } from "../../lib/motion-b";
import { Center, Showcase, Thing, type Item } from "./show";

/* layer 1, part B: a person using a screen */
export default function Scene() {
  const btn = <div style={{ background: "#2563EB", color: "#fff", fontSize: 50, fontWeight: 800, padding: "26px 60px", borderRadius: 24 }}>Buy now</div>;
  const items: Item[] = [
    { name: "press", does: MOVES2.press.does, loop: 2, node: <Center><Move2 kind="press" at={0.8}>{btn}</Move2></Center> },
    { name: "wiggle", does: MOVES2.wiggle.does, node: <Center><Move2 kind="wiggle" at={0.2}><Thing glyph="🔔" size={200} /></Move2></Center> },
    { name: "Tap", does: "a tap with a ripple", loop: 2.4, node: <><Center>{btn}</Center><Tap x={470} y={260} at={1} /></> },
    { name: "Swipe", does: "a swipe across", loop: 2.4, node: <><Center><Thing glyph="🃏" size={260} /></Center><Swipe from={[700, 300]} to={[200, 280]} at={0.6} /></> },
    { name: "Scroll", does: "a page scrolls", loop: 4.4, node: <Center><Scroll h={420} distance={700} at={0.5} dur={3}><div style={{ width: 520 }}>{Array.from({ length: 12 }, (_, i) => <div key={i} style={{ height: 80, margin: 10, borderRadius: 14, background: i % 2 ? "#dbe5f5" : "#f5e6cf", fontSize: 34, padding: 20, boxSizing: "border-box", fontFamily: "Inter, Arial" }}>Post {i + 1}</div>)}</div></Scroll></Center> },
    { name: "TypeInto", does: "typed into a box", loop: 4, node: <Center><TypeInto text="cheapest flights to Goa" at={0.3} w={820} /></Center> },
    { name: "DragDrop", does: "dragged and dropped", loop: 3, node: <DragDrop from={[220, 300]} to={[720, 280]} at={0.5}><Thing glyph="📄" size={150} /></DragDrop> },
    { name: "Toggle", does: "a switch flips on", loop: 2.4, node: <Center><Toggle at={0.8} size={240} label="Dark mode" /></Center> },
    { name: "Spinner", does: "loading, then a tick", loop: 3.4, node: <Center><Spinner size={260} at={0.2} until={2} /></Center> },
    { name: "ProgressBar", does: "a bar fills up", loop: 4, node: <Center><ProgressBar to={0.86} at={0.3} w={760} label="Downloading" /></Center> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="UI actions" count={items.length} items={items} cols={5} />;
}
