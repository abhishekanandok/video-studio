import { Img, staticFile } from "remotion";
import { useScene } from "../../kit";
import { Collide, MOVES, Move, Pour, Ripple, Shatter, Smoke, type MoveKind } from "../../lib/motion";
import { pic } from "./pics";
import { Center, Showcase, Thing, type Item } from "./show";

const floor = <div style={{ position: "absolute", left: 0, right: 0, top: 440, height: 100, background: "rgb(0 0 0/0.08)" }} />;

export default function Scene() {
  const s = useScene();
  const phys = (Object.keys(MOVES) as MoveKind[]).filter((k) => MOVES[k].group === "physics");
  const place: Record<string, [number, number, string]> = { fall: [480, 440, "🏀"], float: [480, 270, "🧑‍🚀"], pendulum: [480, 80, "🕰️"], spring: [480, 440, "🍮"], roll: [180, 440, "⚽"], sway: [480, 440, "🌳"] };
  const items: Item[] = [
    ...phys.map((k, i) => {
      const [x, y, g] = place[k];
      const anchor = k === "pendulum" ? "translate(-50%, 0)" : k === "float" ? "translate(-50%,-50%)" : "translate(-50%,-100%)";
      const body = k === "pendulum"
        ? <Move kind="pendulum" at={0.2} amount={1.2}><div style={{ width: 6, height: 260, background: s.theme.ink, margin: "0 auto" }} /><div style={{ fontSize: 120, marginTop: -30 }}>{g}</div></Move>
        : <Move kind={k} at={0.3} dur={k === "roll" ? 2.6 : 0.8} amount={k === "roll" ? 0.95 : 1}><Thing glyph={g} size={k === "float" ? 200 : 170} color={i % 2 ? s.theme.accent2 : s.theme.accent} /></Move>;
      return { name: k, does: MOVES[k].does, loop: k === "fall" ? 3.6 : 4.5, node: <>{floor}<div style={{ position: "absolute", left: x, top: y, transform: anchor }}>{body}</div></> };
    }),
    { name: "Shatter", does: "breaks and falls under gravity", loop: 3.8, node: <Center y={0.45}><Shatter w={460} h={260} at={1}><Img src={staticFile(pic("surface.jpg"))} style={{ width: 460, height: 260, objectFit: "cover" }} /></Shatter></Center> },
    { name: "Pour", does: "liquid pours and fills, with a moving surface", loop: 4.6, node: <Pour x={370} y={190} w={220} h={300} at={0.3} dur={3} color="#d98a2b" />, bg: "#2d3a4a" },
    { name: "Ripple", does: "rings spread out over water", node: <><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#6fa8c9, #2c5f80)" }} /><Ripple x={480} y={300} at={0.2} size={380} /></> },
    { name: "Smoke", does: "puffs rise, spread and fade", node: <><div style={{ position: "absolute", left: 420, top: 380, width: 120, height: 160, background: "#6b4b3a" }} /><Smoke x={480} y={380} at={0} color="rgb(235 235 235)" /></>, bg: "#8fb0c7" },
    { name: "Collide", does: "one hits another and hands over its push", loop: 4, node: <>{floor}<Collide y={440} at={0.3} gap={360} size={140} a={<Thing glyph="🎱" size={140} color={s.theme.ink} />} b={<Thing glyph="🎱" size={140} color={s.theme.accent} />} /></> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Physics" count={items.length} items={items} cols={4} />;
}
