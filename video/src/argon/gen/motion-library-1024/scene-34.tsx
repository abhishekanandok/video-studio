import { BumpChart, ButterflyBars, Gantt, Histogram, IconRows, PopulationPyramid, ProgressRing, RadarChart, SlopeChart, Treemap, Waterfall, WordCloud } from "../../lib/blocks-e";
import { rand } from "../../lib/motion";
import { Fit, Showcase, type Item } from "./show";

/* layer 2, part E: more data */
export default function Scene() {
  const items: Item[] = [
    { name: "Waterfall", does: "rises and falls to a total", loop: 5, node: <Fit s={0.58}><Waterfall steps={[{ label: "Revenue", value: 100, total: true }, { label: "Costs", value: -42 }, { label: "Tax", value: -14 }, { label: "Other", value: 9 }, { label: "Profit", value: 53, total: true }]} w={1400} h={560} at={0.2} /></Fit> },
    { name: "Treemap", does: "blocks sized by value", node: <Fit s={0.62}><Treemap items={[{ label: "Reliance", value: 19 }, { label: "TCS", value: 14 }, { label: "HDFC", value: 12 }, { label: "Infosys", value: 8 }, { label: "ITC", value: 6 }, { label: "Airtel", value: 5 }, { label: "SBI", value: 5 }]} w={1300} h={720} at={0.2} /></Fit> },
    { name: "RadarChart", does: "qualities on spokes", node: <Fit s={0.75}><RadarChart axes={["Speed", "Power", "Skill", "Stamina", "Luck"]} series={[{ label: "A", values: [8, 6, 9, 5, 7] }, { label: "B", values: [5, 9, 6, 8, 4] }]} size={620} at={0.2} /></Fit> },
    { name: "Histogram", does: "values counted into ranges", node: <Fit s={0.62}><Histogram values={Array.from({ length: 300 }, (_, i) => 40 + (rand(i) + rand(i + 1) + rand(i + 2)) * 20)} bins={12} w={1300} h={560} at={0.2} label="Marks out of 100" /></Fit> },
    { name: "PopulationPyramid", does: "age bands; it morphs over years", loop: 6, node: <Fit s={0.62}><PopulationPyramid bands={["0-14", "15-29", "30-44", "45-59", "60-74", "75+"]} years={[{ label: "1980", men: [20, 15, 10, 7, 4, 1], women: [19, 15, 10, 7, 4, 1.3] }, { label: "2030", men: [11, 12, 12, 10, 7, 3], women: [10, 12, 12, 10, 8, 4] }]} w={1100} at={0.2} per={2.4} /></Fit> },
    { name: "SlopeChart", does: "then and now joined by a line", node: <Fit s={0.75}><SlopeChart items={[{ label: "China", a: 12, b: 18 }, { label: "India", a: 3, b: 4 }, { label: "Japan", a: 6, b: 4.2 }, { label: "Germany", a: 3.4, b: 4.4 }]} left="2010" right="2025" at={0.2} /></Fit> },
    { name: "BumpChart", does: "ranks change over years", loop: 5, node: <Fit s={0.6}><BumpChart periods={["2000", "2005", "2010", "2015", "2020", "2025"]} series={[{ label: "USA", ranks: [1, 1, 1, 1, 1, 1] }, { label: "China", ranks: [6, 4, 2, 2, 2, 2] }, { label: "Japan", ranks: [2, 2, 3, 3, 3, 4] }, { label: "India", ranks: [13, 12, 9, 7, 5, 5] }, { label: "UK", ranks: [4, 5, 6, 5, 6, 6] }]} w={1400} h={620} at={0.2} /></Fit> },
    { name: "Gantt", does: "tasks across time", node: <Fit s={0.58}><Gantt periods={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]} tasks={[{ label: "Research", start: 0, end: 1.5 }, { label: "Script", start: 1, end: 2.5 }, { label: "Shoot", start: 2.5, end: 4 }, { label: "Edit", start: 3.5, end: 5.5 }, { label: "Launch", start: 5.5, end: 6 }]} w={1500} at={0.2} /></Fit> },
    { name: "WordCloud", does: "words sized by weight", node: <Fit s={0.62}><WordCloud words={[["freedom", 10], ["salt", 9], ["march", 8], ["Gandhi", 8], ["tax", 6], ["Dandi", 6], ["truth", 5], ["empire", 5], ["satyagraha", 4], ["sea", 3], ["crowd", 3], ["law", 3]].map(([text, weight]) => ({ text: text as string, weight: weight as number }))} w={1400} h={700} at={0.2} /></Fit> },
    { name: "IconRows", does: "one icon stands for N", node: <Fit s={0.6}><IconRows rows={[{ label: "Doctors", value: 7, icon: "🩺" }, { label: "Teachers", value: 14, icon: "📚" }, { label: "Farmers", value: 21, icon: "🌾" }]} w={1400} at={0.2} size={70} /></Fit> },
    { name: "ProgressRing", does: "a ring fills to a share", node: <Fit s={0.9}><ProgressRing value={72} label="literacy" at={0.2} size={420} /></Fit> },
    { name: "ButterflyBars", does: "two groups side by side", node: <Fit s={0.62}><ButterflyBars left="2011" right="2021" rows={[{ label: "Kerala", a: 94, b: 96 }, { label: "Bihar", a: 61, b: 70 }, { label: "Delhi", a: 86, b: 89 }, { label: "UP", a: 67, b: 73 }]} w={1300} at={0.2} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Data (more)" count={items.length} items={items} cols={4} />;
}
