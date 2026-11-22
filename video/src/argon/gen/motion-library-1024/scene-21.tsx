import { Puppet, Stage, useScene } from "../../kit";
import { Landscape, PointerLabel } from "../../lib/blocks-c";
import { Camera, Move, Smoke } from "../../lib/motion";
import { RIGS } from "./rigs";

/* the two layers together: a set, two characters, a motion, a label and a camera move, all chosen, nothing written by hand */
export default function Scene() {
  const s = useScene();
  return (
    <Stage plate={false}>
      <Camera kind="push" at={0.5} dur={7} focus={[0.55, 0.7]} amount={0.6}>
        <Landscape />
        <div style={{ position: "absolute", left: s.W * 0.12, top: s.H * 0.5, width: 240, height: 200, background: "#8a5a3c", clipPath: "polygon(0 40%, 50% 0, 100% 40%, 100% 100%, 0 100%)" }} />
        <Smoke x={s.W * 0.19} y={s.H * 0.5} at={0} rise={300} size={80} />
        <Puppet rig={RIGS.mother} x={s.W * 0.28} y={s.H * 0.9} height={400} pose="wave" />
        <Puppet rig={RIGS.boy} y={s.H * 0.9} height={330} from={s.W * 0.34} to={s.W * 0.8} at={1} dur={5} />
        <div style={{ position: "absolute", left: s.W * 0.62, top: s.H * 0.18 }}><Move kind="drop" at={2.2}><div style={{ fontSize: 120 }}>🎒</div></Move></div>
        <PointerLabel x={s.W * 0.66} y={s.H * 0.3} text="First day back" at={2.8} dx={160} dy={-80} />
      </Camera>
    </Stage>
  );
}
