import { useScene } from "../../kit";
import { BarGrow, BarRace, Connector, CountUp, DrawOn, Gauge, Handwrite, LineTrace, OutlineFill, PieFill, StrokeText, Ticker } from "../../lib/motion";
import { Center, Showcase, Thing, type Item } from "./show";

const india = "M120 40 L230 30 L300 90 L360 70 L420 120 L380 170 L330 190 L300 250 L250 330 L220 400 L190 330 L150 260 L110 220 L60 200 L80 140 Z";

export default function Scene() {
  const s = useScene();
  const items: Item[] = [
    { name: "DrawOn", does: "a line draws itself", node: <DrawOn d="M80 420 C 240 100, 420 500, 560 220 S 820 120, 880 360" at={0.3} dur={1.8} color={s.theme.accent} width={14} /> },
    { name: "Handwrite", does: "words written by hand", node: <Handwrite text="Dandi, 6 April" x={150} y={190} size={120} at={0.3} /> },
    { name: "StrokeText", does: "letters outlined, then filled", node: <StrokeText text="1930" x={240} y={130} size={260} at={0.2} dur={1.8} /> },
    { name: "Connector", does: "an arrow grows from one thing to another", node: <><div style={{ position: "absolute", left: 90, top: 200 }}><Thing glyph="🏭" size={140} /></div><div style={{ position: "absolute", left: 720, top: 200 }}><Thing glyph="🏪" size={140} color={s.theme.accent2} /></div><Connector from={[250, 270]} to={[700, 270]} at={0.5} bend={0.25} width={9} /></> },
    { name: "OutlineFill", does: "outlined, then coloured in", node: <OutlineFill d={india} x={260} y={60} w={500} h={440} at={0.2} dur={1.6} /> },
    { name: "CountUp", does: "a number counts up and lands", node: <Center><CountUp to={240} at={0.3} suffix=" miles" size={150} /></Center> },
    { name: "Ticker", does: "digits roll in like a counter", node: <Center><Ticker value="78,392" at={0.3} size={150} /></Center> },
    { name: "BarGrow", does: "bars grow with a springy overshoot", node: <div style={{ position: "absolute", left: 120, top: 40 }}><BarGrow data={[{ label: "2019", value: 40 }, { label: "2020", value: 65 }, { label: "2021", value: 52 }, { label: "2022", value: 90 }]} w={720} h={360} at={0.3} /></div> },
    { name: "LineTrace", does: "a line chart traces, value on its tip", loop: 4, node: <div style={{ position: "absolute", left: 80, top: 80 }}><LineTrace values={[20, 26, 22, 34, 31, 46, 52, 49, 63, 70]} w={700} h={360} at={0.3} prefix="₹" /></div> },
    { name: "PieFill", does: "a donut fills round, slice by slice", node: <div style={{ position: "absolute", left: 300, top: 60 }}><PieFill slices={[{ label: "Rent", value: 40 }, { label: "Food", value: 25 }, { label: "Fun", value: 15 }, { label: "Save", value: 20 }]} size={340} at={0.3} /></div> },
    { name: "Gauge", does: "a needle swings, overshoots, settles", node: <Center y={0.55}><Gauge value={82} at={0.3} size={480} label="km/h" /></Center> },
    { name: "BarRace", does: "a ranking race, bars swap places", loop: 5.4, node: <div style={{ position: "absolute", left: 40, top: 40 }}><BarRace frames={[{ label: "1990", values: { USA: 60, Japan: 30, Germany: 18, China: 4, India: 3 } }, { label: "2005", values: { USA: 130, Japan: 47, Germany: 28, China: 23, India: 8 } }, { label: "2020", values: { USA: 210, Japan: 50, Germany: 38, China: 147, India: 27 } }]} w={880} rowH={84} at={0.3} per={2} top={5} /></div> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Drawing and numbers" count={items.length} items={items} cols={4} />;
}
