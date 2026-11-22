/* Print kit check: four film DNAs, three sheets each. npx remotion still src/print/demo.tsx PrintDemo out.png --frame=N */
import React from "react";
import { AbsoluteFill, Composition, registerRoot, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BigNumber, DNA, Headline, InkBars, InkHeatmap, InkPie, loadPrintFonts, PrintPhoto, Sheet, Steps } from "./kit";

const A: DNA = { paper: "#d3cbbd", fibre: 0.6, ink: "#2a2622", inks: ["#c94a2f", "#3e5f78", "#8c9a78", "#cbbfa9"], display: "gloock", body: "caslon", layout: "editorial", grain: 0.55, misreg: 3, issue: "Money Matters · No. 12" };
const B: DNA = { paper: "#bfb8ad", fibre: 0.5, ink: "#1c1a18", inks: ["#c4462b", "#1c1a18", "#8a8378"], display: "bodoni", body: "garamond", layout: "spine", grain: 0.45, misreg: 2, issue: "The Paper Explainer" };
const C: DNA = { paper: "#d6bf95", fibre: 0.8, ink: "#1d1b19", inks: ["#2b4ea2", "#e2452b", "#d9a521"], display: "anton", body: "spacemono", layout: "ledger", grain: 0.7, misreg: 4, issue: "Ledger" };
const D: DNA = { paper: "#cbd0bd", fibre: 0.5, ink: "#262421", inks: ["#6b3d5c", "#e59a74", "#7c7a3a"], display: "dmserif", body: "sourceserif", layout: "poster", grain: 0.5, misreg: 3, issue: "Field Notes" };
[A, B, C, D].forEach(loadPrintFonts);

const useT = () => useCurrentFrame() / 30;
const PHOTO = "oneshot/how-inflation-quietly-eats-your-money-1026165644/photos/L03.jpg";

const pie = [{ label: "Growth", value: 76 }, { label: "Your money", value: 24 }];
const heat = { rows: ["Food", "Fuel", "Rent", "School"], cols: ["2016", "2018", "2020", "2022", "2024", "2026"], values: [[2, 4, 7, 9, 6, 8], [5, 3, 8, 6, 4, 3], [3, 3, 4, 5, 6, 7], [4, 5, 5, 6, 7, 8]] };

const scenes: [DNA, React.FC][] = [
  [A, () => { const t = useT(); return <InkPie t={t} at={0.2} slices={pie} title="Where ₹5 lakh comes from" />; }],
  [A, () => { const t = useT(); return <InkHeatmap t={t} at={0.1} title="Prices rising, year by year" {...heat} legend={["Steep rise", "Mild"]} />; }],
  [A, () => { const t = useT(); return <BigNumber t={t} at={0.1} to={45000} prefix="₹" label="Monthly salary" note="₹500 of it leaves first, on payday, into the fund." />; }],
  [B, () => { const t = useT(); return <Headline t={t} kicker="An explainer in four parts" words={[{ text: "Small money", at: 0.1, effect: "bar" }, { text: "Big time", at: 0.6, effect: "plain" }, { text: "Compounds", at: 1.1, effect: "accent" }]} />; }],
  [B, () => { const t = useT(); return <Steps t={t} title="How a SIP works" steps={[{ label: "Salary", at: 0.1, note: "lands on payday" }, { label: "Auto-debit", at: 0.6, note: "₹500 leaves first" }, { label: "Mutual fund", at: 1.1, note: "buys units" }, { label: "Growth", at: 1.6, note: "growth earns growth" }]} />; }],
  [B, () => { const t = useT(); return <PrintPhoto t={t} at={0.1} dur={4} src={staticFile(PHOTO)} ratio={1.5} caption="Your sabzi mandi" credit="Iijjccoo at Dutch Wikipedia · Public domain · Wikimedia Commons" />; }],
  [C, () => { const t = useT(); return <BigNumber t={t} at={0.1} to={120000} prefix="₹" label="What you put in" note="₹500 × 240 months" />; }],
  [C, () => { const t = useT(); return <InkBars t={t} at={0.1} title="The jar after…" unit="k" bars={[{ label: "Year 5", value: 41 }, { label: "Year 10", value: 116 }, { label: "Year 15", value: 252 }, { label: "Year 20", value: 499 }]} />; }],
  [C, () => { const t = useT(); return <Steps t={t} steps={[{ label: "Prompt", at: 0.1 }, { label: "Prefill", at: 0.5 }, { label: "First token", at: 0.9 }, { label: "Decode", at: 1.3 }, { label: "Answer", at: 1.7 }]} title="How a model answers" />; }],
  [D, () => { const t = useT(); return <Headline t={t} words={[{ text: "Not saved", at: 0.1, effect: "cross" }, { text: "Invested", at: 0.8, effect: "accent" }]} />; }],
  [D, () => { const t = useT(); return <InkPie t={t} at={0.2} slices={[{ label: "Interest", value: 82 }, { label: "Your loan", value: 18 }]} title="Your first EMI" />; }],
  [D, () => { const t = useT(); return <BigNumber t={t} at={0.1} to={2} suffix=" GB" label="KV cache for 4,000 tokens" note="Llama 2 7B, 16-bit" />; }],
];

const PrintDemo = () => (
  <AbsoluteFill>
    {scenes.map(([dna, S], i) => (
      <Sequence key={i} from={i * 120} durationInFrames={120}><Sheet dna={dna} page={i + 1}><S /></Sheet></Sequence>
    ))}
  </AbsoluteFill>
);

registerRoot(() => <Composition id="PrintDemo" component={PrintDemo} durationInFrames={scenes.length * 120} fps={30} width={1920} height={1080} />);
