import { BigArrow, Building, Flag, GoldBar, Lightbulb, QuestionMark, Reactions, RupeeNotes, StarRating, TickCross, Trophy, Vehicle, WarningSign } from "../../lib/blocks-d";
import { Center, Showcase, type Item } from "./show";

/* layer 2, part D: vehicles, objects and symbols */
export default function Scene() {
  const row = { position: "absolute" as const, inset: 0, display: "flex", flexWrap: "wrap" as const, justifyContent: "center", alignItems: "center", gap: 10 };
  const items: Item[] = [
    { name: "Vehicle", does: "9 kinds; wheels turn as it drives", node: <div style={row}>{(["car", "bus", "truck", "train", "plane", "ship", "rocket", "bike", "auto"] as const).map((k, i) => <Vehicle key={k} kind={k} size={250} at={i * 0.1} />)}</div> },
    { name: "Vehicle · drives", does: "from one point to another", loop: 4, node: <><div style={{ position: "absolute", left: 0, right: 0, top: 380, height: 80, background: "#555" }} /><Vehicle kind="bus" size={340} from={-360} to={960} y={200} at={0.2} dur={3.4} /></> },
    { name: "Building", does: "9 kinds; windows light up", node: <div style={{ ...row, alignItems: "flex-end" }}>{(["house", "hut", "tower", "skyscraper", "shop", "school", "hospital", "bank", "factory"] as const).map((k, i) => <Building key={k} kind={k} size={180} at={i * 0.1} />)}</div> },
    { name: "RupeeNotes", does: "a stack, a fan, or flying away", loop: 4, node: <div style={{ ...row, gap: 40 }}><RupeeNotes mode="stack" amount={500} size={240} at={0.2} /><RupeeNotes mode="fan" amount={2000} size={240} count={6} at={0.2} /><RupeeNotes mode="fly" amount={100} size={160} count={6} at={0.8} /></div> },
    { name: "GoldBar", does: "gleaming gold", node: <Center><GoldBar count={6} size={240} at={0.2} /></Center> },
    { name: "BigArrow", does: "9 arrows that draw themselves", node: <div style={row}>{(["right", "up", "curve", "trend-up", "trend-down", "uturn", "cycle"] as const).map((k, i) => <BigArrow key={k} kind={k} size={200} at={0.2 + i * 0.15} />)}</div> },
    { name: "TickCross", does: "right or wrong", node: <div style={{ ...row, gap: 60 }}><TickCross ok at={0.3} size={240} /><TickCross ok={false} at={0.8} size={240} /></div> },
    { name: "WarningSign", does: "caution, stop, no, radiation…", node: <div style={row}>{(["caution", "stop", "no", "radiation", "electric", "fire"] as const).map((k, i) => <WarningSign key={k} kind={k} size={190} at={0.2 + i * 0.12} />)}</div> },
    { name: "StarRating", does: "stars fill to a score", node: <Center><StarRating value={4.3} size={110} at={0.2} label="4.3" /></Center> },
    { name: "Trophy", does: "a trophy or medals drop in", loop: 4, node: <div style={{ ...row, gap: 30, alignItems: "flex-end" }}><Trophy kind="silver" size={200} at={0.6} /><Trophy size={300} at={0.2} label="Winner" /><Trophy kind="bronze" size={200} at={0.9} /></div> },
    { name: "Flag", does: "25 countries, waving", node: <div style={{ ...row, gap: 30 }}>{["India", "United States", "United Kingdom", "Japan", "France", "Germany", "Brazil", "China"].map((c, i) => <Flag key={c} country={c} w={180} at={i * 0.1} />)}</div> },
    { name: "Lightbulb", does: "switches on: an idea", loop: 3, node: <Center><Lightbulb size={260} at={1} /></Center> },
    { name: "QuestionMark", does: "?, ! or ?!", node: <div style={{ ...row, gap: 60 }}><QuestionMark size={280} at={0.2} /><QuestionMark glyph="!" size={280} at={0.4} /><QuestionMark glyph="?!" size={280} at={0.6} /></div> },
    { name: "Reactions", does: "likes and hearts float up", node: <Reactions x={480} y={480} at={0} /> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Vehicles, objects, symbols" count={items.length} items={items} cols={5} />;
}
