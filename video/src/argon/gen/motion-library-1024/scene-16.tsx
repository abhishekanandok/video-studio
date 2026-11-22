import { BookPages, DocHighlight, Headline, Letter, OldPaper, Redacted, Signature, SocialPost, Stamp } from "../../lib/blocks-c";
import { pic } from "./pics";
import { Center, Showcase, type Item } from "./show";

const scale = (k: number, x = 0, y = 0) => ({ position: "absolute" as const, left: x, top: y, transform: `scale(${k})`, transformOrigin: "0 0" });

export default function Scene() {
  const items: Item[] = [
    { name: "Headline", does: "a newspaper spins in with the day's news", loop: 4.4, bg: "#3b3b3b", node: <div style={scale(0.6, 210, 10)}><Headline headline="GANDHI BREAKS THE SALT LAW" sub="Thousands follow him to the sea at Dandi" image={pic("salt0.png")} at={0.2} /></div> },
    { name: "Letter", does: "an envelope opens, the letter rises", loop: 4.4, node: <div style={scale(0.6, 290, 0)}><Letter at={0.3} /></div> },
    { name: "OldPaper", does: "aged parchment, its writing fades up", node: <div style={scale(0.85, 100, 60)}><OldPaper title="Charter of 1600" text="Granted unto the Governor and Company of Merchants of London trading into the East Indies…" at={0.2} /></div> },
    { name: "Stamp", does: "a rubber stamp slams down", loop: 3, node: <Center><Stamp text="APPROVED" at={0.6} size={130} /></Center> },
    { name: "Signature", does: "signed by hand, stroke by stroke", node: <div style={{ position: "absolute", left: 150, top: 160 }}><Signature at={0.3} /></div> },
    { name: "DocHighlight", does: "a passage marked and pulled out", loop: 4.4, node: <div style={scale(0.62, 30, 10)}><DocHighlight quote="Profits rose 40% while wages stayed flat." at={0.2} /></div> },
    { name: "SocialPost", does: "a post slides up; likes count up", loop: 4.4, node: <Center><SocialPost text="The monsoon just reached Kerala, three days early 🌧️" at={0.2} /></Center> },
    { name: "Redacted", does: "lines are blacked out, one by one", loop: 4.4, node: <div style={scale(0.62, 240, 10)}><Redacted at={0.2} /></div> },
    { name: "BookPages", does: "a book opens, pages turn", loop: 4.6, node: <Center><BookPages at={0.2} w={820} title="Chapter One" /></Center> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Documents" count={items.length} items={items} cols={3} />;
}
