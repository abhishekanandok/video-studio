/* 2D experiment: npx remotion render src/twodemo/entry.tsx Chai2D out/twodemo-chai.mp4 */
import { Composition, registerRoot } from "remotion";
import { Chai2D, FPS, SECONDS } from "./Chai2D";

const Root: React.FC = () => <Composition id="Chai2D" component={Chai2D} durationInFrames={FPS * SECONDS} fps={FPS} width={1920} height={1080} />;

registerRoot(Root);
