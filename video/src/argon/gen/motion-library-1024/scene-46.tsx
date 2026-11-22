import { useContext } from "react";
import { SceneCtx } from "../../kit";
import { MapBase, makeMap } from "../../lib/blocks-b";
import { ChartMorph, DotGroups, LiftCountry, MapFly, OneIn, SpokenWords, SpreadMap } from "../../lib/motion-c";
import { Fit, Showcase, type Item } from "./show";

/* layer 1, part C: explainer moves */
const SAID = "Only one in four children finish school".split(" ").map((w, i) => ({ w, s: 0.3 + i * 0.4, e: 0.3 + i * 0.4 + 0.35 }));
function Spoken({ style }: { style: "pop" | "karaoke" | "box" | "bounce" }) {
  const c = useContext(SceneCtx);
  return <SceneCtx.Provider value={{ ...c, words: SAID }}><SpokenWords style={style} keywords={["one", "four"]} size={64} y={220} per={7} /></SceneCtx.Provider>;
}
export default function Scene() {
  const world = makeMap(1500, 820), asia = makeMap(1500, 820, ["India", "China", "Pakistan", "Myanmar", "Thailand"]);
  const spread: [string, number][] = [["China", 0.4], ["Mongolia", 0.9], ["Kazakhstan", 1.4], ["Iran", 1.9], ["Russia", 2.2], ["Turkey", 2.5], ["Ukraine", 2.8], ["Poland", 3.0], ["Germany", 3.2], ["France", 3.4], ["Egypt", 3.1]];
  const items: Item[] = [
    { name: "DotGroups", does: "100 dots split into groups", loop: 5, node: <Fit s={0.58}><DotGroups groups={[{ label: "Farming", count: 42 }, { label: "Services", count: 33 }, { label: "Industry", count: 25 }]} at={0.1} split={1} /></Fit> },
    { name: "OneIn", does: "1 in 4, picked out", loop: 3.6, node: <Fit s={0.9}><OneIn n={4} at={0.2} icon="🧒" label="children" /></Fit> },
    { name: "ChartMorph · sort + focus", does: "bars re-sort, one lit", loop: 5, node: <Fit s={0.72}><ChartMorph data={[{ label: "UP", value: 24 }, { label: "Kerala", value: 3.5 }, { label: "Bihar", value: 13 }, { label: "MH", value: 12.5 }]} at={0.2} sortAt={1.4} focus="Bihar" focusAt={2.6} /></Fit> },
    { name: "ChartMorph · bars to pie", does: "the bars become a pie", loop: 5, node: <Fit s={0.72}><ChartMorph data={[{ label: "Coal", value: 55 }, { label: "Solar", value: 18 }, { label: "Hydro", value: 12 }, { label: "Wind", value: 15 }]} at={0.2} pieAt={1.6} /></Fit> },
    { name: "SpreadMap", does: "spreads country by country", loop: 5, node: <Fit s={0.6}><SpreadMap map={world} order={spread} label="countries" /></Fit> },
    { name: "LiftCountry", does: "India lifts out of the map", loop: 4, node: <Fit s={0.6}><div style={{ position: "relative", width: 1500, height: 820 }}><MapBase map={asia} labels={false} /><LiftCountry map={asia} name="India" at={0.5} /></div></Fit> },
    { name: "MapFly", does: "flies Delhi → Tokyo → London", loop: 6, node: <Fit s={0.6}><MapFly map={world} stops={[[77, 28, 2.4, 0.3], [139, 35, 2.4, 2.2], [0, 51, 2.4, 4.2]]}><MapBase map={world} /></MapFly></Fit> },
    { name: "SpokenWords · pop", does: "words pop as they are said", loop: 4, node: <Spoken style="pop" /> },
    { name: "SpokenWords · karaoke", does: "lit as they are said", loop: 4, node: <Spoken style="karaoke" /> },
    { name: "SpokenWords · box", does: "the word being said is boxed", loop: 4, node: <Spoken style="box" /> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Explainer moves" count={items.length} items={items} cols={5} />;
}
