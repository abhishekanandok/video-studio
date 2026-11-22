/* 3D experiments: npx remotion render src/threedemo/entry.tsx <Walk3D|Varanasi3D|RealWalk3D> out/<name>.mp4 --gl=angle */
import { Composition, registerRoot } from "remotion";
import { FPS, SECONDS, Walk3D } from "./Walk3D";
import { Varanasi3D } from "./Varanasi3D";
import { REAL_SECONDS, RealWalk3D } from "./RealWalk3D";

const Root: React.FC = () => (
  <>
    <Composition id="Walk3D" component={Walk3D} durationInFrames={FPS * SECONDS} fps={FPS} width={1920} height={1080} />
    <Composition id="Varanasi3D" component={Varanasi3D} durationInFrames={FPS * 60} fps={FPS} width={1920} height={1080} />
    <Composition id="RealWalk3D" component={RealWalk3D} durationInFrames={FPS * REAL_SECONDS} fps={FPS} width={1920} height={1080} />
  </>
);

registerRoot(Root);
