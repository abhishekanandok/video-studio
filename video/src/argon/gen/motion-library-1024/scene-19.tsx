import { Emoji, GradientGround, IconBadge, Landscape, LogoMark, PaperStage, Parcel, Prop, Room, Space, Street, Studio } from "../../lib/blocks-c";
import { pic } from "./pics";
import { Center, Showcase, type Item } from "./show";

export default function Scene() {
  const items: Item[] = [
    { name: "Prop", does: "any object, standing with its shadow", node: <Center><Prop image={pic("saltbowl.png")} height={300} at={0.2} float /></Center> },
    { name: "IconBadge", does: "a symbol in a circle", node: <div style={{ position: "absolute", inset: 0, display: "flex", gap: 40, justifyContent: "center", alignItems: "center" }}><IconBadge glyph="⚡" label="Power" at={0.2} /><IconBadge glyph="💧" label="Water" at={0.4} color="#2A9D8F" /><IconBadge glyph="🌾" label="Food" at={0.6} color="#E0B24A" /></div> },
    { name: "Emoji", does: "a sticker that wobbles in", node: <Center><Emoji char="🧅" size={260} at={0.2} /></Center> },
    { name: "LogoMark", does: "a brand mark builds up", node: <Center><LogoMark name="Drishya" at={0.2} /></Center> },
    { name: "Parcel", does: "a box opens, something pops out", loop: 3.6, node: <Center><Parcel at={0.4} size={300} inside="🎓" /></Center> },
    { name: "PaperStage", does: "SET: curtains part on a paper stage", loop: 4, node: <PaperStage at={0.3} /> },
    { name: "Room", does: "SET: a room, light moving on the floor", node: <Room /> },
    { name: "Street", does: "SET: house fronts sliding past", node: <Street at={0} /> },
    { name: "Landscape", does: "SET: hills in layers, clouds drifting", node: <Landscape /> },
    { name: "Space", does: "SET: stars at depth, a planet turning", node: <Space /> },
    { name: "Studio", does: "SET: a news desk and a big screen", node: <Studio screen={<div style={{ color: "#fff", fontSize: 50, fontWeight: 800, padding: 30 }}>BREAKING</div>} /> },
    { name: "GradientGround", does: "SET: soft colour, slowly moving", node: <GradientGround /> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Objects and sets" count={items.length} items={items} cols={4} />;
}
