/* The motion library showcase: every motion (layer 1) and block (layer 2) on screen, one group per scene.
   No voice, so no captions: its own short Root instead of ArgonFilm, the same ids (ArgonFilm, Scene0..21) so it renders the same way. */
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig, Composition } from "remotion";
import type { ComponentType, ReactNode } from "react";
import { SceneCtx, type Theme } from "../../kit";
import S0 from "./scene-00";
import S1 from "./scene-01";
import S2 from "./scene-02";
import S3 from "./scene-03";
import S4 from "./scene-04";
import S5 from "./scene-05";
import S6 from "./scene-06";
import S7 from "./scene-07";
import S8 from "./scene-08";
import S9 from "./scene-09";
import S10 from "./scene-10";
import S11 from "./scene-11";
import S12 from "./scene-12";
import S13 from "./scene-13";
import S14 from "./scene-14";
import S15 from "./scene-15";
import S16 from "./scene-16";
import S17 from "./scene-17";
import S18 from "./scene-18";
import S19 from "./scene-19";
import S20 from "./scene-20";
import S21 from "./scene-21";
import S22 from "./scene-22";
import S23 from "./scene-23";
import S24 from "./scene-24";
import S25 from "./scene-25";
import S26 from "./scene-26";
import S27 from "./scene-27";
import S28 from "./scene-28";
import S29 from "./scene-29";
import S30 from "./scene-30";
import S31 from "./scene-31";
import S32 from "./scene-32";
import S33 from "./scene-33";
import S34 from "./scene-34";
import S35 from "./scene-35";
import S36 from "./scene-36";
import S37 from "./scene-37";
import S38 from "./scene-38";
import S39 from "./scene-39";
import S40 from "./scene-40";
import S41 from "./scene-41";
import S42 from "./scene-42";
import S43 from "./scene-43";
import S44 from "./scene-44";
import S45 from "./scene-45";
import S46 from "./scene-46";
import S47 from "./scene-47";
import S48 from "./scene-48";
import S49 from "./scene-49";
import S50 from "./scene-50";
import S51 from "./scene-51";
import S52 from "./scene-52";
import S53 from "./scene-53";
import S54 from "./scene-54";

const SCENES: ComponentType[] = [S0, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S22, S23, S24, S25, S26, S27, S28, S29, S30, S31, S32, S33, S34, S35, S36, S37, S38, S39, S40, S41, S42, S43, S44, S45, S46, S47, S48, S49, S50, S51, S52, S53, S54, S21];  // the finale (scene-21, both layers together) last
const THEME: Theme = {"bg": ["#F8FAFC", "#EEF2F6"], "ink": "#0F172A", "accent": "#2563EB", "accent2": "#F59E0B", "paper": "#FFFFFF", "muted": "#64748B", "font": "inter", "display": "space_grotesk", "radius": 16, "outline": 2, "shadow": "hard"};
const SECONDS = [5, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9];
const FPS = 30, FADE = 12;
const DIR = "argon/motion-library-1024";

function Fade({ children }: { children: ReactNode }) {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(f, [0, FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>;
}

function Showreel({ only }: { only?: number }) {
  const { width, height } = useVideoConfig();
  const idx = only === undefined ? SCENES.map((_, i) => i) : [only];
  let at = 0;
  return (
    <AbsoluteFill style={{ background: THEME.bg[0] }}>
      {idx.map((i) => {
        const S = SCENES[i], dur = SECONDS[i] * FPS, from = at;
        at += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneCtx.Provider value={{ theme: THEME, words: [], dur: SECONDS[i], W: width, H: height, dir: DIR }}>
              <Fade><S /></Fade>
            </SceneCtx.Provider>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

const total = (ids: number[]) => ids.reduce((a, i) => a + SECONDS[i] * FPS, 0);

export const Root = () => (
  <>
    <Composition id="ArgonFilm" component={() => <Showreel />} durationInFrames={total(SCENES.map((_, i) => i))} fps={FPS} width={1920} height={1080} />
    {SCENES.map((_, i) => <Composition key={i} id={`Scene${i}`} component={() => <Showreel only={i} />} durationInFrames={total([i])} fps={FPS} width={1920} height={1080} />)}
  </>
);
