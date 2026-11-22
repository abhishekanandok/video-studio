import { Stage, useScene } from "../../kit";
import { GradientGround, TitleCard } from "../../lib/blocks-c";
import { Move } from "../../lib/motion";
import { Thing } from "./show";

export default function Scene() {
  const s = useScene();
  const things = [["📈", 0.14, 0.22], ["🗺️", 0.84, 0.2], ["⏳", 0.1, 0.74], ["🧪", 0.88, 0.72], ["💬", 0.3, 0.86], ["🎬", 0.7, 0.86]] as const;
  return (
    <Stage plate={false}>
      <GradientGround />
      {things.map(([g, x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x * s.W - 70, top: y * s.H - 70 }}>
          <Move kind="pop" at={0.8 + i * 0.15}><Move kind="float" at={0} seed={i + 1} amount={1.4}><Thing glyph={g} size={140} color={i % 2 ? s.theme.accent2 : s.theme.accent} /></Move></Move>
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: s.H * 0.3, display: "flex", justifyContent: "center" }}>
        <TitleCard title="The Motion Library" sub="Layer 1 · motions (the verbs)      Layer 2 · blocks (the nouns)" at={0.2} size={150} />
      </div>
    </Stage>
  );
}
