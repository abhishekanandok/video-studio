import { CycleLoop, Flowchart, Funnel, Matrix2x2, MindMap, Network, OrgChart, ProcessSteps, Pyramid, TreeChart, Venn } from "../../lib/blocks-b";
import { Center, Showcase, type Item } from "./show";

const scale = (k: number, x = 0, y = 0) => ({ position: "absolute" as const, left: x, top: y, transform: `scale(${k})`, transformOrigin: "0 0" });

export default function Scene() {
  const items: Item[] = [
    { name: "Flowchart", does: "steps and a yes/no decision", loop: 5, node: <Flowchart at={0.2} per={0.55} nodes={[{ id: "a", label: "Order placed", x: 160, y: 120 }, { id: "b", label: "In stock?", x: 480, y: 120, kind: "decision" }, { id: "c", label: "Ship it", x: 800, y: 120, kind: "end" }, { id: "d", label: "Restock", x: 480, y: 420 }]} edges={[["a", "b"], ["b", "c", "yes"], ["b", "d", "no"]]} /> },
    { name: "ProcessSteps", does: "1, 2, 3, 4 in order", node: <div style={{ position: "absolute", left: 30, top: 130 }}><ProcessSteps steps={["Sow", "Water", "Grow", "Harvest"]} w={900} at={0.2} per={0.6} /></div> },
    { name: "CycleLoop", does: "stages that go round for ever", node: <div style={scale(0.78, 230, 5)}><CycleLoop stages={["Evaporate", "Condense", "Rain", "Collect"]} size={680} at={0.2} /></div> },
    { name: "TreeChart", does: "a hierarchy that grows down", node: <div style={scale(0.68, 0, 40)}><TreeChart root="Parliament" w={1400} at={0.2} children={[{ label: "Lok Sabha", children: ["MPs", "Speaker"] }, { label: "Rajya Sabha", children: ["MPs", "Chair"] }]} /></div> },
    { name: "OrgChart", does: "who reports to whom", node: <div style={scale(0.68, 0, 40)}><OrgChart root="CEO" w={1400} at={0.2} children={[{ label: "CTO", children: ["Dev", "Ops"] }, { label: "CFO", children: ["Tax"] }, { label: "CMO", children: ["Brand"] }]} /></div> },
    { name: "MindMap", does: "one idea, branches round it", node: <div style={scale(0.6, 30, 0)}><MindMap center="Climate" ideas={["Heat", "Floods", "Crops", "Cities", "Health", "Migration"]} size={880} at={0.2} /></div> },
    { name: "Venn", does: "circles meet; the overlap is named", node: <div style={scale(0.52, 200, 10)}><Venn sets={["Skill", "Passion", "Paid"]} overlap="Career" size={420} at={0.2} /></div> },
    { name: "Funnel", does: "fewer at every stage", node: <Center><Funnel w={760} at={0.2} stages={[{ label: "Visitors", value: "10,000" }, { label: "Sign-ups", value: "2,400" }, { label: "Buyers", value: "300" }]} /></Center> },
    { name: "Pyramid", does: "built level by level from the base", node: <Center><Pyramid w={640} at={0.2} levels={["Self", "Esteem", "Belonging", "Safety"]} /></Center> },
    { name: "Matrix2x2", does: "two axes, four boxes, items placed", loop: 5, node: <div style={scale(0.6, 270, 20)}><Matrix2x2 x="Effort" y="Impact" quads={["Big bets", "Quick wins", "Avoid", "Fill-ins"]} items={[{ label: "Solar", x: 0.75, y: 0.8 }, { label: "LED bulbs", x: 0.2, y: 0.7 }, { label: "New dam", x: 0.85, y: 0.3 }]} size={760} at={0.2} /></div> },
    { name: "Network", does: "nodes and links, signals running", node: <Network nodes={13} w={960} h={540} at={0.2} labels={["You"]} /> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Diagrams" count={items.length} items={items} cols={4} />;
}
