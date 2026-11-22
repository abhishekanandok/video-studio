/* The SIP film re-made as printed spreads (print kit + spread kit) on its original voice and word timings, no Gemini.
   npx remotion render src/print/sip.tsx SipPrint out/sip-print.mp4 */
import React from "react";
import { AbsoluteFill, Audio, Composition, Easing, interpolate, registerRoot, Sequence, staticFile, useCurrentFrame } from "remotion";
import { appear, DNA, Headline, loadPrintFonts, PrintPhoto, Sheet, Type, useDNA } from "./kit";
import { Board, Combo, GlassBars, Grid, Legend, Num, Ornaments, Pie, Stack, Walk, Watermark } from "./spread";
import VOICE from "../../public/oneshot/how-500-a-month-in-a-sip-becomes-5-lakh-1026200039/voice.json";

const DIR = "oneshot/how-500-a-month-in-a-sip-becomes-5-lakh-1026200039";
const SIP: DNA = { paper: "#d8cebe", fibre: 0.6, ink: "#24211e", inks: ["#c8482d", "#35586f", "#879779", "#c7b9a2"], display: "dmserif", body: "caslon", mono: "spacemono", layout: "open", grain: 0.5, misreg: 2, issue: "Money, Plainly · No. 07" };
loadPrintFonts(SIP);

/** when word `key` starts in line i (exact word, punctuation and case ignored) */
const norm = (s: string) => s.toLowerCase().replace(/[,.;:?!]+$/, "");
const W = (i: number, key: string, after = 0) => VOICE[i].words.find((w) => norm(w.w) === norm(key) && w.s >= after)?.s ?? 0;

/** ₹500 a month at 12% a year (1% a month), invested at the start of each month: value after n months */
const fv = (n: number) => 500 * ((Math.pow(1.01, n) - 1) / 0.01) * 1.01;

type S = React.FC<{ t: number }>;

/* L01 · first paycheck, ₹500 ... something huge */
const S1: S = ({ t }) => {
  const d = useDNA();
  return <>
    <Stack x={110} y={110} lines={["YOUR", "FIRST", "PAYCHECK"]} t={t} at={W(0, "paycheck?") - 0.3} size={26} />
    <Num x={110} y={300} t={t} at={W(0, "₹500")} to={500} prefix="₹" size={300} label="put aside, month one" />
    <div style={{ position: "absolute", left: 110, top: 800, width: 820, opacity: appear(t, W(0, "something")) }}><Type size={58} style={{ fontStyle: "italic" }}>…can begin something <span style={{ color: d.inks[0] }}>huge.</span></Type></div>
    <Board x={1010} y={80} w={830} h={920} t={t} at={0.2} title={["WHERE", "IT CAN", "GO"]} tag={["20", "YEARS"]} foot="AN ILLUSTRATION/AT 12% A YEAR">
      <GlassBars x={80} y={170} w={700} h={620} t={t} max={fv(240)} bars={[
        { label: "TODAY", value: 500, text: "₹500", at: W(0, "₹500") },
        { label: "YEAR 20", value: fv(240), text: "₹5 lakh?", at: W(0, "something"), ghost: true }]} />
    </Board>
    <Ornaments zones={["bl"]} seed={1} t={t} />
  </>;
};

/* L02 · Systematic Investment Plan, a fixed amount, every month */
const S2: S = ({ t }) => {
  const d = useDNA();
  const lit = appear(t, W(1, "sip"), 0.4);
  const word = (txt: string, at: number) => (
    <div style={{ opacity: appear(t, at, 0.35), transform: `translateX(${(1 - appear(t, at, 0.35)) * -40}px)` }}>
      <Type size={150} display><span style={{ color: lit > 0.5 ? d.inks[0] : d.ink }}>{txt[0]}</span>{txt.slice(1)}</Type>
    </div>);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const s0 = W(1, "puts"), s1 = W(1, "month.") + 0.2;
  return <>
    <Watermark x={60} y={40} text="SIP" t={t} size={320} />
    <div style={{ position: "absolute", left: 110, top: 270, display: "flex", flexDirection: "column", gap: 4 }}>
      {word("Systematic", W(1, "systematic"))}{word("Investment", W(1, "investment"))}{word("Plan", W(1, "plan,"))}
    </div>
    <div style={{ position: "absolute", left: 110, top: 800, width: 900, borderTop: `3px solid ${d.ink}`, paddingTop: 18, opacity: appear(t, W(1, "mutual")) }}>
      <Type size={46}>a fixed amount into a <b style={{ color: d.inks[1] }}>mutual fund</b>, automatically</Type>
    </div>
    <Stack x={1150} y={130} lines={["AUTO-DEBIT", "EVERY MONTH"]} t={t} at={s0 - 0.3} size={24} />
    {months.map((m, i) => {
      const at = s0 + ((s1 - s0) * i) / 12, k = appear(t, at, 0.25);
      const x = 1150 + (i % 4) * 170, y = 230 + Math.floor(i / 4) * 215;
      return (
        <div key={m} style={{ position: "absolute", left: x, top: y, width: 156, height: 200, borderTop: `2px solid ${d.ink}`, opacity: appear(t, s0 - 0.4, 0.4) }}>
          <div style={{ marginTop: 10 }}><Type size={30} caps>{m}</Type></div>
          <div style={{ position: "absolute", left: 0, top: 70, width: 150, height: 110, background: i % 3 === 0 ? d.inks[0] : i % 3 === 1 ? d.inks[1] : d.inks[2], filter: "url(#ink)",
            opacity: k * 0.9, transform: `scale(${1.35 - 0.35 * k}) rotate(${(i % 2 ? 3 : -2) * (1 - k * 0.5)}deg)`, display: "grid", placeItems: "center" }}>
            <Type size={40} display color={d.paper}>₹500</Type>
          </div>
        </div>);
    })}
    <Ornaments zones={["tr"]} seed={2} t={t} />
  </>;
};

/* L03 · salary account → ₹500 → the fund, before it gets spent */
const S3: S = ({ t }) => {
  const d = useDNA();
  const cols = [
    { n: "01", label: "Salary account", note: "your pay lands here", at: W(2, "salary") },
    { n: "02", label: "Mutual fund", note: "₹500 goes in first", at: W(2, "fund") },
    { n: "03", label: "Spending", note: "only what's left", at: W(2, "before") },
  ];
  const X = [110, 710, 1310];
  const go = interpolate(t, [W(2, "moves"), W(2, "fund")], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const tk = appear(t, W(2, "₹500"), 0.4);
  const cross = appear(t, W(2, "spent."), 0.35);
  return <>
    <Stack x={110} y={100} lines={["ON PAYDAY,", "BEFORE ANYTHING ELSE"]} t={t} at={0} size={26} />
    {cols.map((c, i) => {
      const k = appear(t, c.at, 0.45);
      return (
        <div key={i} style={{ position: "absolute", left: X[i], top: 250, width: 500, opacity: k * (i === 2 ? 0.55 : 1), transform: `translateY(${(1 - k) * 24}px)` }}>
          <Type size={170} display color={i === 1 ? d.inks[0] : d.ink}>{c.n}</Type>
          <div style={{ borderTop: `3px solid ${d.ink}`, margin: "10px 0 16px", width: 460 * k }} />
          <Type size={64} display>{c.label}</Type>
          <div style={{ marginTop: 8 }}><Type size={34} style={{ fontStyle: "italic" }}>{c.note}</Type></div>
        </div>);
    })}
    <div style={{ position: "absolute", left: 1290, top: 520, height: 14, width: 520 * cross, background: d.inks[0], filter: "url(#ink)", transform: "rotate(-4deg)" }} />
    <svg width={1920} height={1080} style={{ position: "absolute" }}>
      <line x1={330} y1={800} x2={930} y2={800} stroke={d.ink} strokeWidth={3} strokeDasharray="12 10" opacity={tk} />
      <line x1={330} y1={800} x2={330 + 600 * go} y2={800} stroke={d.inks[0]} strokeWidth={5} />
    </svg>
    <div style={{ position: "absolute", left: 330 + 600 * go - 95, top: 705, width: 190, height: 190, borderRadius: "50%", background: d.inks[0], filter: "url(#ink)", display: "grid", placeItems: "center",
      opacity: tk, transform: `scale(${0.6 + 0.4 * tk}) rotate(${go * 360}deg)` }}>
      <Type size={52} display color={d.paper}>₹500</Type>
    </div>
    <Ornaments zones={["br"]} seed={3} t={t} />
  </>;
};

/* L04 · India's growing companies, the Bombay Stock Exchange */
const S4: S = ({ t }) => <>
  <PrintPhoto t={t} at={0} dur={6} src={staticFile(`${DIR}/photos/L04.jpg`)} ratio={1920 / 1607} focus={[0.5, 0.4]} caption="Bombay Stock Exchange, Mumbai" credit="Niyantha Shekhar · CC BY 2.0 · Wikimedia Commons" />
  <Stack x={1140} y={600} lines={["THE FUND OWNS", "SLICES OF", "INDIA'S GROWING", "COMPANIES"]} t={t} at={W(3, "india's")} size={28} />
  <Ornaments zones={["br"]} seed={4} t={t} />
</>;

/* L05 · 240 months in a row, ₹1,20,000 put in */
const S5: S = ({ t }) => {
  const d = useDNA();
  const a = W(4, "240"), b = W(4, "₹1,20,000.");
  return <>
    <div style={{ position: "absolute", left: 90, top: 60, opacity: appear(t, a - 0.3) }}><Type size={48} display>240 months: one square, one ₹500</Type></div>
    <Grid x={90} y={150} w={1080} h={880} rows={Array.from({ length: 20 }, (_, i) => String(i + 1))} cols={["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]} t={t} from={a} to={b} tone={(i, j) => (i === 19 && j === 11 ? 0 : 1)} />
    <Stack x={1270} y={150} lines={["OVER", "20 YEARS"]} t={t} at={W(4, "20")} size={26} />
    <Num x={1270} y={300} t={t} at={a} dur={b - a} linear to={120000} prefix="₹" size={112} w={600} label="you actually put in" />
    <div style={{ position: "absolute", left: 1270, top: 560, opacity: appear(t, W(4, "total")) }}><Type size={50} display>₹500 × 240</Type></div>
    <div style={{ position: "absolute", left: 1270, top: 660, display: "flex", alignItems: "center", gap: 16, opacity: appear(t, a) }}>
      <div style={{ width: 34, height: 34, background: d.inks[1], filter: "url(#ink)" }} /><Type size={32}>= one month's ₹500</Type></div>
    <Ornaments zones={["br"]} seed={5} t={t} />
  </>;
};

/* L06 · 12% a year → about ₹5 lakh */
const S6: S = ({ t }) => {
  const d = useDNA();
  const five = W(5, "₹5");
  return <>
    <Stack x={110} y={110} lines={["IF THE FUND", "GROWS"]} t={t} at={0} size={26} />
    <Num x={110} y={230} t={t} at={W(5, "12%")} to={12} prefix="" suffix="%" size={280} label="a year, on average" />
    <div style={{ position: "absolute", left: 110, top: 700, opacity: appear(t, five), transform: `translateY(${(1 - appear(t, five)) * 20}px)` }}>
      <Type size={120} display color={d.inks[0]} misreg={d.inks[1]}>≈ ₹5 lakh</Type>
      <div style={{ marginTop: 14 }}><Type size={34} caps>after 20 years</Type></div>
    </div>
    <Board x={960} y={70} w={890} h={940} t={t} at={0.1} title={["WHAT ₹500", "A MONTH", "BECOMES"]} tag={["12%", "A YEAR"]} foot="AN ILLUSTRATION,/NOT A PROMISE">
      <GlassBars x={70} y={170} w={780} h={640} t={t} bars={[
        { label: "YEAR 5", value: fv(60), text: "₹41k", at: 0.7 },
        { label: "YEAR 10", value: fv(120), text: "₹1.2L", at: 1.5 },
        { label: "YEAR 15", value: fv(180), text: "₹2.5L", at: W(5, "that") },
        { label: "YEAR 20", value: fv(240), text: "₹5L", at: five }]} />
    </Board>
  </>;
};

/* L07 · the split: ₹3.8 lakh is growth */
const S7: S = ({ t }) => {
  const d = useDNA();
  const g = W(6, "₹3.8"), sp = W(6, "split:");
  const share = appear(t, W(6, "not"), 0.6);
  return <>
    <Pie cx={480} cy={420} r={290} t={t} at={[g, sp]} slices={[{ label: "Growth", value: fv(240) - 120000 }, { label: "Your money", value: 120000 }]} />
    <Legend x={170} y={800} w={640} t={t} at={[g + 0.4, sp + 0.4]} items={[{ label: "Growth", value: "₹3.8 lakh" }, { label: "Your money", value: "₹1.2 lakh" }]} />
    <Board x={1000} y={70} w={850} h={940} t={t} at={0.1} title={["THE", "FINAL", "PILE"]} tag={["YEAR", "20"]} foot="NOT FROM/YOUR POCKET">
      <Num x={60} y={250} t={t} at={g} to={3.8} prefix="₹" suffix=" lakh" decimals={1} size={160} w={760} label="pure growth" dark color={d.inks[0]} />
      <div style={{ position: "absolute", left: 60, top: 600, width: 730, height: 70, display: "flex", opacity: appear(t, W(6, "pile")) }}>
        <div style={{ flex: 76, background: d.inks[0], filter: "url(#ink)" }} />
        <div style={{ flex: 24, background: d.inks[1], filter: "url(#ink)", opacity: 0.4 + 0.6 * share }} />
      </div>
      <div style={{ position: "absolute", left: 60, top: 700, width: 730, opacity: share }}><Type size={42} color={d.paper}>Only ₹1.2 lakh came from you.</Type></div>
    </Board>
  </>;
};

/* L08 · compounding: returns earn returns, surging at the end */
const S8: S = ({ t }) => {
  const d = useDNA();
  const ats = [W(7, "compounding"), W(7, "returns"), W(7, "earning"), W(7, "own"), W(7, "surging")];
  const groups = [4, 8, 12, 16, 20].map((y, i) => { const put = 6000 * y, v = fv(y * 12); return { label: `Year ${y}`, a: put, b: v - put, line: v / put, lineText: `${(v / put).toFixed(1)}×`, at: ats[i] }; });
  const box = appear(t, W(7, "final"), 0.5);
  return <>
    <div style={{ position: "absolute", left: 110, top: 80, opacity: appear(t, 0) }}><Type size={80} display>Growth earns growth</Type></div>
    <Stack x={1810} y={90} lines={["COMPOUNDING", "AT WORK"]} t={t} at={0.2} size={24} align="right" />
    <Combo x={180} y={360} w={1560} h={560} t={t} groups={groups} keys={["You put in", "Growth", "Total ÷ put in"]} />
    <div style={{ position: "absolute", left: 200, top: 400, padding: "18px 28px", background: "#cfc4b1", display: "flex", alignItems: "center", gap: 24, opacity: box, transform: `scale(${0.9 + 0.1 * box})`, transformOrigin: "left top" }}>
      <Type size={96} display color={d.inks[0]}>4.2×</Type>
      <Type size={30} style={{ maxWidth: 330 }}>your money by year 20; most of it in the last years</Type>
    </div>
  </>;
};

/* L09 · 12% is an illustration, not a promise; markets go up and down */
const S9: S = ({ t }) => {
  const d = useDNA();
  return <>
    <Watermark x={1080} y={30} text="12%" t={t} size={400} />
    <div style={{ position: "absolute", left: 110, top: 120, opacity: appear(t, W(8, "illustration,")) }}><Type size={120} display>An illustration,</Type></div>
    <div style={{ position: "absolute", left: 110, top: 250, opacity: appear(t, W(8, "not")) }}><Type size={120} display color={d.inks[0]} misreg={d.inks[1]}>not a promise.</Type></div>
    <Walk x={110} y={500} w={1700} h={380} t={t} at={W(8, "markets")} dur={2.4} seed={7} />
    <Stack x={110} y={930} lines={["MARKETS FLUCTUATE · RETURNS ARE NEVER GUARANTEED"]} t={t} at={W(8, "guaranteed.")} size={26} />
  </>;
};

/* L10 · start small, stay consistent, let time do the heavy lifting */
const S10: S = ({ t }) => <>
  <Headline t={t} words={[{ text: "Start small", at: 0, effect: "bar" }, { text: "Stay consistent", at: W(9, "stay"), effect: "plain" }, { text: "Let time work", at: W(9, "time"), effect: "accent" }]} />
  <Ornaments zones={["tr", "br"]} seed={10} t={t} />
</>;

/* ---- the film: one printed sheet per line; the next sheet slides, wipes, rises or folds in over the last ---------- */
const SCENES: S[] = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
const FPS = 30, OVER = 14;
const LEN = VOICE.map((v) => Math.round((v.seconds + 0.35) * FPS));
const START = LEN.map((_, i) => LEN.slice(0, i).reduce((a, b) => a + b, 0));
const KINDS = ["slide", "wipe", "rise", "fold"] as const;

const Page: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const lead = i ? OVER : 0;
  const t = (f - lead) / FPS;
  const p = i ? Easing.inOut(Easing.cubic)(Math.min(1, f / OVER)) : 1;
  const kind = KINDS[(i - 1 + KINDS.length) % KINDS.length];
  const enter: React.CSSProperties = kind === "slide" ? { transform: `translateX(${(1 - p) * 1920}px)` } : kind === "rise" ? { transform: `translateY(${(1 - p) * 1080}px)` }
    : kind === "wipe" ? { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` } : { transform: `perspective(2400px) rotateY(${(1 - p) * -70}deg)`, transformOrigin: "left center" };
  const S = SCENES[i];
  const push = 1 + 0.025 * Math.min(1, Math.max(0, t) / (LEN[i] / FPS));
  return (
    <AbsoluteFill style={{ ...enter, boxShadow: p < 1 ? "-30px 0 60px rgba(0,0,0,0.25)" : undefined }}>
      <Sheet dna={SIP} page={i + 1}><AbsoluteFill style={{ transform: `scale(${push})` }}><S t={t} /></AbsoluteFill></Sheet>
    </AbsoluteFill>
  );
};

const SipPrint = () => (
  <AbsoluteFill style={{ background: "#111" }}>
    {SCENES.map((_, i) => (
      <Sequence key={i} from={START[i] - (i ? OVER : 0)} durationInFrames={LEN[i] + (i ? OVER : 0) + OVER}><Page i={i} /></Sequence>))}
    {VOICE.map((v, i) => <Sequence key={`a${i}`} from={START[i]} durationInFrames={LEN[i]}><Audio src={staticFile(v.audio)} /></Sequence>)}
  </AbsoluteFill>
);

registerRoot(() => <Composition id="SipPrint" component={SipPrint} durationInFrames={LEN.reduce((a, b) => a + b, 0)} fps={FPS} width={1920} height={1080} />);
