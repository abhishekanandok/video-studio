
import { Collage } from "../../lib/blocks-g";
import { Camera } from "../../lib/motion";
import { Character } from "../../lib/blocks-d";
import { pic } from "./pics";

/* layer 2, part G: a Vox-style collage: every piece is its own layer, so each one moves on its own */
export default function Scene() {

  return (
    <Camera kind="push" at={0} dur={8} focus={[0.5, 0.45]} amount={0.5}>
      <Collage ground="grid" layers={[
        { kind: "halftone", image: pic("map.png"), x: 120, y: 120, w: 760, h: 500, rot: -4, depth: 0.4, at: 0.1 },
        { kind: "photo", image: pic("salt0.png"), x: 1180, y: 90, w: 520, h: 340, rot: 5, depth: 0.6, at: 0.5, text: "Dandi, 6 April 1930" },
        { kind: "cutout", image: pic("gandhi.png"), x: 760, y: 260, w: 420, depth: 1.4, at: 0.9 },
        { kind: "torn", text: "“With this, I am shaking the foundations of the British Empire.”", x: 160, y: 690, w: 900, depth: 0.9, at: 1.4 },
        { kind: "note", text: "385 km in 24 days", x: 1320, y: 560, w: 360, depth: 1.1, at: 1.9 },
        { kind: "marker", x: 1150, y: 520, w: 560, h: 220, depth: 1.1, at: 2.2 },
        { kind: "scribble", x: 200, y: 640, w: 560, h: 40, depth: 0.9, at: 2.6 },
        { kind: "cutout", node: <Character job="kurta" action="walk" height={320} />, x: 1500, y: 680, w: 200, depth: 1.6, at: 2.9 },
      ]} />
      <div style={{ position: "absolute", left: 60, top: 40, fontFamily: "Georgia, serif", fontSize: 30, color: "#333", letterSpacing: 4, zIndex: 100 }}>LAYER 2 · BLOCKS — VOX-STYLE COLLAGE (every piece is a layer)</div>
    </Camera>
  );
}
