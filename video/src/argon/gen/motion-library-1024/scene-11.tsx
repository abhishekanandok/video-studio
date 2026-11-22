import { Bubbles, DataTable, Dial, HeatMap, KpiCard, RankingRace, ScatterPlot, StackedBars, Waffle } from "../../lib/blocks-a";
import { rand } from "../../lib/motion";
import { Center, Showcase, type Item } from "./show";

export default function Scene() {
  const items: Item[] = [
    { name: "StackedBars", does: "how each group splits", node: <div style={{ position: "absolute", left: 40, top: 110 }}><StackedBars rows={[{ label: "2000", parts: [60, 30, 10] }, { label: "2010", parts: [45, 35, 20] }, { label: "2020", parts: [30, 38, 32] }]} w={880} at={0.2} /></div> },
    { name: "ScatterPlot", does: "dots and the trend through them", node: <div style={{ position: "absolute", left: 140, top: 40 }}><ScatterPlot points={Array.from({ length: 22 }, (_, i) => [i, i * 1.5 + rand(i) * 12] as [number, number])} w={700} h={400} at={0.2} xLabel="hours studied" /></div> },
    { name: "Bubbles", does: "sizes you can compare at a glance", node: <div style={{ position: "absolute", left: 0, top: 0 }}><Bubbles items={[{ label: "China", value: 18 }, { label: "USA", value: 27 }, { label: "India", value: 4 }, { label: "Japan", value: 4.2 }, { label: "Germany", value: 4.5 }]} w={960} h={540} at={0.2} /></div> },
    { name: "Waffle", does: "how many out of 100", node: <Center><Waffle value={37} at={0.2} size={420} label="37 in 100" /></Center> },
    { name: "DataTable", does: "rows arrive, one is marked", loop: 4.5, node: <Center><DataTable head={["Planet", "Moons", "Day"]} rows={[["Earth", 1, "24 h"], ["Mars", 2, "24.6 h"], ["Jupiter", 95, "9.9 h"], ["Saturn", 146, "10.7 h"]]} mark={3} at={0.2} w={760} /></Center> },
    { name: "HeatMap", does: "a grid coloured by how much", node: <Center><HeatMap values={Array.from({ length: 84 }, (_, i) => Math.sin(i * 0.4) * 0.5 + 0.5 + rand(i) * 0.4)} cols={14} cell={50} at={0.2} labels={["Mon", "Sun"]} /></Center> },
    { name: "KpiCard", does: "a figure, its change, its sparkline", node: <Center><KpiCard label="Monthly sales" value="₹8.4L" change={12} spark={[3, 4, 3.5, 5, 4.8, 6, 7.1]} at={0.2} /></Center> },
    { name: "Gauge", does: "a dial with a needle", node: <Center y={0.55}><Dial value={68} at={0.2} size={460} label="%" /></Center> },
    { name: "BarRace", does: "a ranking that races through the years", loop: 5.4, node: <div style={{ position: "absolute", left: 40, top: 40 }}><RankingRace frames={[{ label: "2000", values: { Mumbai: 16, Delhi: 13, Kolkata: 13, Chennai: 6, Bengaluru: 5 } }, { label: "2010", values: { Mumbai: 19, Delhi: 21, Kolkata: 14, Chennai: 8, Bengaluru: 8 } }, { label: "2020", values: { Mumbai: 20, Delhi: 30, Kolkata: 15, Chennai: 11, Bengaluru: 12 } }]} w={880} rowH={84} at={0.3} per={2} top={5} /></div> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Data (2 of 2)" count={items.length} items={items} cols={3} />;
}
