import { Composition, registerRoot } from "remotion";
import { Film, SECONDS } from "./Film";

const Root: React.FC = () => <Composition id="Film" component={Film} durationInFrames={Math.round(SECONDS * 30)} fps={30} width={1920} height={1080} />;

registerRoot(Root);
