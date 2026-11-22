import { Cell, CrossSection, Equation, Flask, LabelledDiagram, Molecule, SolarSystem, Weather } from "../../lib/blocks-c";
import { pic } from "./pics";
import { Center, Showcase, type Item } from "./show";

export default function Scene() {
  const items: Item[] = [
    { name: "LabelledDiagram", does: "a picture with parts named", loop: 4.4, node: <div style={{ position: "absolute", left: 300, top: 50 }}><LabelledDiagram image={pic("controller.png")} w={360} h={440} at={0.2} labels={[{ x: 0.5, y: 0.15, text: "Trigger", side: "left" }, { x: 0.62, y: 0.4, text: "Thumb switch" }, { x: 0.5, y: 0.85, text: "Grip", side: "left" }]} /></div> },
    { name: "CrossSection", does: "cut open, layers named", loop: 4.4, node: <div style={{ position: "absolute", left: 120, top: 40, transform: "scale(0.72)", transformOrigin: "0 0" }}><CrossSection size={620} at={0.2} /></div> },
    { name: "Molecule", does: "atoms and bonds turning in 3D", node: <Center><Molecule size={480} at={0.2} /></Center> },
    { name: "Cell", does: "a living cell, moving inside", node: <Center><Cell size={480} at={0.2} /></Center> },
    { name: "SolarSystem", does: "planets on their orbits", bg: "#050812", node: <div style={{ position: "absolute", left: 0, top: 0 }}><SolarSystem w={960} h={540} at={0} /></div> },
    { name: "Equation", does: "built term by term, then the answer", node: <Center><Equation terms={["m", "×", "c²"]} answer="E" at={0.2} size={110} /></Center> },
    { name: "Flask", does: "a flask bubbling on a flame", node: <Center><Flask at={0.2} size={380} /></Center> },
    { name: "Weather", does: "cloud, rain and lightning", bg: "#4a5670", node: <div style={{ position: "absolute", left: 0, top: 0 }}><Weather w={960} h={540} at={0} /></div> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Science" count={items.length} items={items} cols={4} />;
}
