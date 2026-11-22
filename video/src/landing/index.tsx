/** Entry for Drishya's landing-page films (landing-render.mjs): the hero loop and the Supercharge reels. */
import { Composition, registerRoot } from "remotion";
import { FLOW_FRAMES, Flow } from "./Flow";
import { HERO_FRAMES, Hero } from "./Hero";
import { REEL_FRAMES, Reel, type ReelKind } from "./Reels";

const Root = () => (
  <>
    <Composition id="Flow" component={Flow} durationInFrames={FLOW_FRAMES} fps={60} width={1920} height={1080} />
    <Composition id="Hero" component={Hero} durationInFrames={HERO_FRAMES} fps={60} width={1920} height={960} />
    <Composition id="Reel" component={Reel as React.ComponentType<Record<string, unknown>>} durationInFrames={REEL_FRAMES} fps={60} width={720} height={1080} defaultProps={{ kind: "script" as ReelKind }} />
  </>
);
registerRoot(Root);
