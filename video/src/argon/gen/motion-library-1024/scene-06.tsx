import { Img, staticFile } from "remotion";
import { Puppet, useScene } from "../../kit";
import { Camera, Depth, RackFocus, type CameraKind } from "../../lib/motion";
import { pic } from "./pics";
import { RIGS } from "./rigs";
import { Showcase, type Item } from "./show";

const full = (name: string) => <Img src={staticFile(pic(name))} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />;

export default function Scene() {
  const s = useScene();
  const cam = (kind: CameraKind, name: string, does: string, focus: [number, number] = [0.5, 0.5], extra?: object) => ({ name: kind, does, loop: 4.4, node: <Camera kind={kind} at={0.3} dur={3.6} focus={focus} {...extra}>{full(name)}</Camera> });
  const items: Item[] = [
    cam("push", "control.jpg", "push in towards what matters", [0.3, 0.4]),
    cam("pull", "map.png", "pull out to show the whole"),
    cam("pan", "town.png", "pan across the scene"),
    cam("tilt", "map.png", "tilt down onto a table or map"),
    cam("whip", "porch.png", "a fast whip pan to the next thing"),
    { name: "follow", does: "the camera follows someone moving", loop: 5, node: <Camera kind="follow" at={0.3} dur={3.6} path={[[160, 470], [800, 470]]} amount={0.6}><div style={{ position: "absolute", inset: 0, background: "linear-gradient(#bfe0f2, #f3e7cf)" }} /><div style={{ position: "absolute", left: 0, right: 0, top: 470, bottom: 0, background: "#c9b089" }} />{[100, 330, 560, 790].map((x) => <div key={x} style={{ position: "absolute", left: x, top: 240, width: 90, height: 230, background: "#8a6a4a" }} />)}<Puppet rig={RIGS.mother} y={480} height={300} from={160} to={800} at={0.3} dur={3.6} /></Camera> },
    cam("drift", "window.png", "a slow handheld drift (it feels alive)"),
    { name: "RackFocus", does: "focus moves from the front to the back", loop: 4, node: <RackFocus at={1.4} back={full("surface.jpg")} front={<Img src={staticFile(pic("controller.png"))} style={{ position: "absolute", left: 40, top: 60, height: 460 }} />} /> },
    { name: "Depth", does: "layers move at their own speed (parallax)", node: <Depth at={0} speed={60} layers={[{ depth: 0.2, node: <div style={{ position: "absolute", inset: "-20% -40%", background: "linear-gradient(#f6c48b, #f3e3c3)" }} /> }, { depth: 0.6, node: <div style={{ position: "absolute", left: -100, right: -600, top: 260, height: 300, background: "#9a8f7c", clipPath: "polygon(0 60%,10% 20%,22% 55%,35% 10%,48% 50%,60% 25%,75% 60%,88% 30%,100% 55%,100% 100%,0 100%)" }} /> }, { depth: 1.4, node: <div style={{ position: "absolute", left: -100, right: -1400, top: 400, height: 200, background: "#4d5a3e", clipPath: "polygon(0 40%,8% 10%,16% 45%,24% 5%,32% 40%,40% 15%,48% 45%,56% 0,64% 35%,72% 10%,80% 40%,90% 15%,100% 40%,100% 100%,0 100%)" }} /> }]} /> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Camera" count={items.length} items={items} cols={3} />;
}
