/* Kit check: npx remotion still src/collage/demo.tsx KitDemo out.png --frame=N (4 parts of 4 s each) */
import React from "react";
import { AbsoluteFill, Composition, registerRoot, Sequence, useCurrentFrame } from "remotion";
import { CountCard, Cutout, FlowTags, KineticWords, Label, MarkerCircle, PaperCard, PaperGround, Pointer, Words, appear } from "./kit";

const useT = () => useCurrentFrame() / 30;

const Flow = () => {
  const t = useT();
  return <AbsoluteFill><PaperGround /><FlowTags t={t} token="🦠" steps={[{ label: "Vaccine", at: 0.2, icon: "💉" }, { label: "Cells learn", at: 1.0, icon: "🧫" }, { label: "Antibodies", at: 1.8, icon: "🛡️" }, { label: "Memory", at: 2.6, icon: "🧠" }]} /></AbsoluteFill>;
};

const Kinetic = () => {
  const t = useT();
  return <AbsoluteFill><PaperGround tone="kraft" /><KineticWords t={t} words={[{ text: "Not sick", at: 0.2, effect: "cross" }, { text: "Just trained", at: 1.2, effect: "slam" }]} /></AbsoluteFill>;
};

const Count = () => {
  const t = useT();
  return <AbsoluteFill><PaperGround tone="blue" /><CountCard x={730} y={330} at={0.2} t={t} to={154} suffix=" million" label="lives saved since 1974" w={620} /></AbsoluteFill>;
};

const Cell = () => {
  const t = useT();
  const k = appear(t, 0.2, 0.6);
  return (
    <AbsoluteFill>
      <PaperGround />
      <Cutout>
        <svg width={1920} height={1080}>
          <circle cx={960} cy={520} r={230 * k} fill="#f4a3a8" />
          <circle cx={1000} cy={500} r={80 * k} fill="#c0485a" />
          {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={960 + Math.cos(i) * 330} cy={520 + Math.sin(i) * 330} r={36 * appear(t, 1 + i * 0.1)} fill="#4f7cac" />)}
        </svg>
      </Cutout>
      <Pointer from={[1500, 230]} to={[1180, 420]} text="Immune cell" at={1.6} t={t} />
      <MarkerCircle x={1290} y={520 + Math.sin(0) * 330} r={60} at={2.4} t={t} />
      <PaperCard x={150} y={760} w={520} h={170} at={2.8} t={t}><Words size={44}>Antibodies lock on</Words></PaperCard>
      <Label text="Germ" x={1330} y={440} at={3.0} t={t} />
    </AbsoluteFill>
  );
};

const KitDemo = () => (
  <AbsoluteFill>
    <Sequence durationInFrames={120}><Flow /></Sequence>
    <Sequence from={120} durationInFrames={120}><Kinetic /></Sequence>
    <Sequence from={240} durationInFrames={120}><Count /></Sequence>
    <Sequence from={360} durationInFrames={120}><Cell /></Sequence>
  </AbsoluteFill>
);

registerRoot(() => <Composition id="KitDemo" component={KitDemo} durationInFrames={480} fps={30} width={1920} height={1080} />);
