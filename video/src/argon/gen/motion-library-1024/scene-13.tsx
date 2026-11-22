import { ArmyArrow, BorderYears, Choropleth, FlowLines, Globe, MapBase, MapRoute, Pin, Satellite, makeMap } from "../../lib/blocks-b";
import { pic } from "./pics";
import { Center, Showcase, type Item } from "./show";

const india = makeMap(960, 540, ["India"], 30);
const world = makeMap(960, 540, [], 10);
const europe = makeMap(960, 540, ["France", "Germany", "Poland", "Spain", "Italy", "Ukraine"], 30);
const asia = makeMap(960, 540, ["India", "China", "Egypt", "Italy"], 20);

export default function Scene() {
  const items: Item[] = [
    { name: "MapBase", does: "real borders; countries light up", node: <MapBase map={makeMap(960, 540, ["India", "Pakistan", "Bangladesh", "Nepal", "Sri Lanka"], 30)} highlight={{ India: "#E4572E", Pakistan: "#2A9D8F", Bangladesh: "#E0B24A", Nepal: "#6A9BD8" }} at={0.2} /> },
    { name: "Pin", does: "a pin drops on a real place", node: <><MapBase map={india} labels={false} /><Pin map={india} lon={72.8} lat={19.07} label="Mumbai" at={0.3} /><Pin map={india} lon={77.2} lat={28.6} label="Delhi" at={0.8} /><Pin map={india} lon={88.36} lat={22.57} label="Kolkata" at={1.3} /></> },
    { name: "MapRoute", does: "a journey, on the real curve of the Earth", loop: 4.4, node: <><MapBase map={india} labels={false} /><MapRoute map={india} stops={[[72.6, 23.0], [72.9, 21.2], [72.8, 20.9]]} at={0.3} dur={3} /><Pin map={india} lon={72.6} lat={23.0} label="Sabarmati" at={0.2} /><Pin map={india} lon={72.8} lat={20.9} label="Dandi" at={3.2} /></> },
    { name: "ArmyArrow", does: "an advance, pushing across land", loop: 4, node: <><MapBase map={europe} labels={false} /><ArmyArrow map={europe} path={[[13.4, 52.5], [17, 52.3], [21, 52.2]]} at={0.3} /><ArmyArrow map={europe} path={[[8, 50], [4, 49.5], [2.3, 48.9]]} at={0.8} color="#2d4a8a" /></> },
    { name: "FlowLines", does: "trade, flights, migration between places", node: <><MapBase map={world} labels={false} /><FlowLines map={world} at={0.2} routes={[{ from: [77, 28], to: [-74, 40.7], weight: 2 }, { from: [77, 28], to: [55.3, 25.2], weight: 3 }, { from: [77, 28], to: [-0.1, 51.5], weight: 2 }, { from: [77, 28], to: [151, -33.9], weight: 1 }]} /></> },
    { name: "Choropleth", does: "countries shaded by a value", node: <Choropleth map={world} at={0.2} values={{ India: 1.43, China: 1.41, "United States of America": 0.33, Indonesia: 0.27, Pakistan: 0.24, Nigeria: 0.22, Brazil: 0.21, Bangladesh: 0.17, Russia: 0.14, Mexico: 0.13 }} /> },
    { name: "BorderYears", does: "which lands belong, year by year", loop: 5, node: <BorderYears map={asia} at={0.2} per={1.4} frames={[{ year: "100 CE", in: ["Italy"] }, { year: "300 CE", in: ["Italy", "Egypt"] }, { year: "600 CE", in: ["Egypt"] }]} /> },
    { name: "Globe", does: "the Earth turns to a place and comes closer", loop: 4.4, bg: "#0b1222", node: <Center><Globe lon={78} lat={22} size={480} at={0.2} highlight={["India"]} /></Center> },
    { name: "Satellite", does: "a view from orbit, with a scan line", node: <Center><Satellite image={pic("orbit.jpg")} w={900} h={500} at={0.2} coords="0.67°N 23.47°E" /></Center> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Maps" count={items.length} items={items} cols={3} />;
}
