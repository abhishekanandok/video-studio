import { family, useScene } from "../../kit";
import { CircleIt, Highlight, MOVES, Move, Spotlight, Underline, type MoveKind } from "../../lib/motion";
import { Center, Showcase, Thing, type Item } from "./show";

export default function Scene() {
  const s = useScene();
  const emph = (Object.keys(MOVES) as MoveKind[]).filter((k) => MOVES[k].group === "emphasis");
  const glyph: Record<string, string> = { pulse: "❤️", shake: "🚨", glow: "💡", punch: "💥", tint: "🎨" };
  const word = (w: string) => <div style={{ fontFamily: family(s.theme.display), fontSize: 110, fontWeight: 800, color: s.theme.ink }}>{w}</div>;
  const items: Item[] = [
    ...emph.map((k, i) => ({ name: k, does: MOVES[k].does, loop: 3.4, node: <Center><Move kind={k} at={0.5} dur={1.4}><Thing glyph={glyph[k]} size={220} color={i % 2 ? s.theme.accent2 : s.theme.accent} /></Move></Center> })),
    { name: "CircleIt", does: "a marker circle drawn round it", loop: 3.4, node: <><Center>{word("₹4,200")}</Center><CircleIt x={230} y={170} w={500} h={200} at={0.5} /></> },
    { name: "Underline", does: "a wavy line drawn under a word", loop: 3.4, node: <><Center>{word("Illegal")}</Center><Underline x={300} y={340} w={360} at={0.6} /></> },
    { name: "Highlight", does: "a highlighter sweeps behind the words", loop: 3.4, node: <Center><div style={{ fontFamily: family(s.theme.font), fontSize: 64, fontWeight: 700, color: s.theme.ink, width: 780, textAlign: "center" }}>The tax was on <Highlight at={0.6}>every pinch of salt</Highlight></div></Center> },
    { name: "Spotlight", does: "light falls on one spot, then moves", loop: 4.4, node: <><div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "center" }}>{["🧑", "👩", "👴", "👧"].map((g) => <div key={g} style={{ fontSize: 130 }}>{g}</div>)}</div><Spotlight spots={[{ x: 120, y: 270, at: 0 }, { x: 600, y: 270, at: 1.6 }]} at={0.3} radius={170} /></> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Emphasis" count={items.length} items={items} cols={5} />;
}
