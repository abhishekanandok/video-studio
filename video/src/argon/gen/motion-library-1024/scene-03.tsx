import { Puppet, useScene } from "../../kit";
import { Along, Chase, Conveyor, FlyArc, Orbit, Route } from "../../lib/motion";
import { RIGS } from "./rigs";
import { Showcase, Thing, type Item } from "./show";

const ground = (c = "#d8c7a4") => <div style={{ position: "absolute", left: 0, right: 0, top: 460, bottom: 0, background: c }} />;

export default function Scene() {
  const s = useScene();
  const items: Item[] = [
    { name: "Along", does: "moves along a smooth path, turning with it", loop: 4, node: <Along points={[[80, 420], [300, 140], [560, 380], [880, 120]]} at={0.2} dur={3.2} turn><div style={{ fontSize: 110 }}>✈️</div></Along> },
    { name: "Walk", does: "a jointed person walks from A to B, feet planted", loop: 5, node: <>{ground()}<Puppet rig={RIGS.boy} y={470} height={340} from={140} to={780} at={0.3} dur={3.6} /></> },
    { name: "Run", does: "the same person, running", loop: 3.6, node: <>{ground()}<Puppet rig={RIGS.boy} y={470} height={320} pose="run" from={100} to={860} at={0.2} dur={2.4} /></> },
    { name: "FlyArc", does: "thrown in an arc, with its trail", loop: 3.4, node: <>{ground("#9ccf8e")}<FlyArc from={[120, 440]} to={[840, 440]} height={330} at={0.3} dur={2}><div style={{ fontSize: 90 }}>🏏</div></FlyArc></> },
    { name: "Orbit", does: "round a centre, bigger in front", loop: 6, bg: "#0e1530", node: <><div style={{ position: "absolute", left: 420, top: 210, width: 120, height: 120, borderRadius: "50%", background: "#ffcf4a", boxShadow: "0 0 60px #ffb52e" }} /><Orbit cx={480} cy={270} rx={360} ry={110} period={5} at={0}><div style={{ width: 70, height: 70, borderRadius: "50%", background: "#4f8fd8" }} /></Orbit></> },
    { name: "Route", does: "a road is drawn and travelled", loop: 5, bg: "#f1eadb", node: <Route points={[[90, 430], [260, 300], [420, 380], [600, 160], [860, 110]]} at={0.3} dur={3.6} /> },
    { name: "Conveyor", does: "carried along a belt, again and again", node: <Conveyor x={40} y={360} w={880} items={[<Thing key="a" glyph="📦" size={110} />, <Thing key="b" glyph="🥫" size={110} color={s.theme.accent2} />]} at={0} /> },
    { name: "Chase", does: "one runs, another follows close behind", loop: 4.4, bg: "#d9e8c8", node: <Chase points={[[60, 420], [300, 160], [520, 400], [760, 150], [920, 300]]} at={0.2} dur={3.6} lead={<div style={{ fontSize: 80, transform: "scaleX(-1)" }}>🐭</div>} follow={<div style={{ fontSize: 90, transform: "scaleX(-1)" }}>🐈</div>} /> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Travel" count={items.length} items={items} cols={4} />;
}
