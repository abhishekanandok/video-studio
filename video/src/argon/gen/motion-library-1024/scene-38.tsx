import { Blackboard, DefinitionCard, Flashcard, Fraction, FunctionGraph, Geometry, NotebookPage, NumberLine } from "../../lib/blocks-f";
import { Center, Fit, Showcase, type Item } from "./show";

/* layer 2, part F: maths and education */
export default function Scene() {
  const items: Item[] = [
    { name: "NumberLine", does: "points hop along it", loop: 5, node: <Fit s={0.58}><NumberLine from={-3} to={10} hops={[-2, 3, 8]} at={0.2} w={1500} /></Fit> },
    { name: "FunctionGraph", does: "a curve draws itself", loop: 4, node: <Fit s={0.7}><FunctionGraph fn={(x) => x * x - 3} label="y = x² − 3" at={0.2} /></Fit> },
    { name: "Geometry", does: "a triangle with sides and angles", loop: 4, node: <Fit s={0.78}><Geometry sides={["4", "3", "5"]} rightAngle={1} at={0.2} /></Fit> },
    { name: "Fraction", does: "a pie or a bar fills", loop: 4, node: <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 30, transform: "scale(0.7)" }}><Fraction top={3} bottom={4} size={320} at={0.2} /><Fraction top={2} bottom={5} kind="bar" size={300} at={0.4} /></div> },
    { name: "Blackboard", does: "chalk lines of working", loop: 5, node: <Fit s={0.6}><Blackboard lines={["a² + b² = c²", "3² + 4² = 9 + 16", "= 25 = 5²"]} at={0.2} per={1.2} /></Fit> },
    { name: "NotebookPage", does: "handwritten notes, a line marked", loop: 5, node: <Fit s={0.62}><NotebookPage lines={["Causes of the revolt:", "1. Cartridges", "2. Annexation", "3. High taxes"]} mark={1} at={0.2} /></Fit> },
    { name: "Flashcard", does: "flips to the answer", loop: 4, node: <Center><div style={{ transform: "scale(0.8)" }}><Flashcard front="Capital of Australia?" back="Canberra" at={0.2} flip={1.8} /></div></Center> },
    { name: "DefinitionCard", does: "a term and its meaning", loop: 4, node: <Fit s={0.7}><DefinitionCard term="Inflation" say="in-flay-shun" meaning="When prices rise and the same money buys less." example="Inflation was 6% last year." at={0.2} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Maths and education" count={items.length} items={items} cols={4} />;
}
