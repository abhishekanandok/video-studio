import { CityMap, DistanceRuler, FloorPlan, MetroMap, OldMap, RaisedMap, Terrain, WeatherMap } from "../../lib/blocks-e";
import { MapBase, makeMap } from "../../lib/blocks-b";
import { Fit, Showcase, type Item } from "./show";

/* layer 2, part E: maps that are not the world map */
export default function Scene() {
  const asia = makeMap(1500, 900, ["India", "China", "Japan", "Indonesia", "Pakistan"]);
  const items: Item[] = [
    { name: "MetroMap", does: "lines with stations; a train rides", loop: 6, node: <MetroMap at={0.2} dur={1.6} ride={2} lines={[{ name: "Blue", color: "#2a6ad9", stops: [{ name: "Dwarka", x: 80, y: 420 }, { name: "Rajiv Chowk", x: 400, y: 260 }, { name: "Noida", x: 860, y: 300 }] }, { name: "Yellow", color: "#f0b41c", stops: [{ name: "Samaypur", x: 380, y: 60 }, { name: " ", x: 400, y: 260 }, { name: "Gurugram", x: 300, y: 500 }] }]} /> },
    { name: "CityMap", does: "a street grid; a route drawn", loop: 4.4, node: <Fit s={0.58}><CityMap at={0} route={[[100, 800], [500, 600], [700, 300], [1400, 150]]} /></Fit> },
    { name: "FloorPlan", does: "a blueprint draws itself", loop: 4.4, node: <Fit s={0.7}><FloorPlan rooms={[{ name: "Living", x: 0.05, y: 0.08, w: 0.5, h: 0.5 }, { name: "Kitchen", x: 0.55, y: 0.08, w: 0.4, h: 0.35 }, { name: "Bed", x: 0.55, y: 0.43, w: 0.4, h: 0.5 }, { name: "Bath", x: 0.05, y: 0.58, w: 0.25, h: 0.35 }]} at={0.2} /></Fit> },
    { name: "Terrain", does: "the land's height along a line", loop: 4.4, node: <Fit s={0.6}><Terrain heights={[200, 400, 900, 2400, 4200, 5300, 4100, 2600, 1200, 600]} labels={[{ at: 0.55, text: "Pass 5,300 m" }]} at={0.2} /></Fit> },
    { name: "WeatherMap", does: "a storm spins; temperatures", node: <Fit s={0.62}><WeatherMap at={0.2} cities={[{ name: "Mumbai", x: 0.25, y: 0.6, temp: 31, icon: "🌧️" }, { name: "Delhi", x: 0.35, y: 0.25, temp: 38, icon: "☀️" }, { name: "Chennai", x: 0.5, y: 0.78, temp: 34, icon: "⛅" }]} /></Fit> },
    { name: "RaisedMap", does: "countries rise by value", loop: 5, node: <Fit s={0.62}><RaisedMap map={asia} values={{ China: 18, India: 4, Japan: 4.2, Indonesia: 1.4, Pakistan: 0.4 }} at={0.2} /></Fit> },
    { name: "OldMap", does: "parchment, sepia, a compass", node: <Fit s={0.6}><OldMap w={1500} h={900}><MapBase map={asia} /></OldMap></Fit> },
    { name: "DistanceRuler", does: "how far apart two places are", loop: 4, node: <DistanceRuler from={[160, 380]} to={[800, 160]} km={1150} at={0.4} /> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Maps (more)" count={items.length} items={items} cols={4} />;
}
