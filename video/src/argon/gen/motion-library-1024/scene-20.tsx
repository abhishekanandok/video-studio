import { Img, staticFile } from "remotion";
import { ChapterHeading, KineticWords, ListReveal, LowerThird, PointerLabel, QuoteCard, TitleCard } from "../../lib/blocks-c";
import { pic } from "./pics";
import { Center, Showcase, type Item } from "./show";

const scale = (k: number, x = 0, y = 0) => ({ position: "absolute" as const, left: x, top: y, transform: `scale(${k})`, transformOrigin: "0 0" });

export default function Scene() {
  const items: Item[] = [
    { name: "TitleCard", does: "the film's title", node: <Center><TitleCard title="Salt" sub="How a pinch of it shook an empire" at={0.2} size={140} /></Center> },
    { name: "PointerLabel", does: "a label pinned to a spot", node: <><Img src={staticFile(pic("control.jpg"))} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} /><PointerLabel x={300} y={200} text="Flight director" at={0.3} dx={180} dy={-110} /></> },
    { name: "ChapterHeading", does: "a chapter starts", node: <div style={scale(0.75, 70, 120)}><ChapterHeading n={3} title="The March" at={0.2} /></div> },
    { name: "QuoteCard", does: "words someone said, and who", loop: 5, node: <div style={scale(0.68, 80, 130)}><QuoteCard text="With this, I am shaking the foundations of the British Empire." who="M. K. Gandhi, 1930" at={0.2} /></div> },
    { name: "ListReveal", does: "points arrive, each ticked", node: <div style={scale(0.8, 120, 60)}><ListReveal items={["Cheap to make", "Needed by all", "Taxed by the Raj"]} at={0.2} /></div> },
    { name: "LowerThird", does: "who is on screen", node: <><Img src={staticFile(pic("control.jpg"))} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} /><div style={{ position: "absolute", left: 40, bottom: 60 }}><LowerThird name="Gene Kranz" role="Flight Director, Apollo 11" at={0.3} /></div></> },
    { name: "KineticWords", does: "words slam in, one by one", node: <Center><KineticWords words={["Sixty", "seconds", "of", "fuel", "left"]} at={0.2} size={110} /></Center> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Text" count={items.length} items={items} cols={4} />;
}
