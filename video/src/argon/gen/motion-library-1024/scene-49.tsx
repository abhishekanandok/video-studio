import { CricketScore, FootballPitch, ForkRoad, MedalTable, MythFact, Podium, ProsCons, TierList, WagonWheel } from "../../lib/blocks-g";
import { Fit, Showcase, type Item } from "./show";

/* layer 2, part G: comparisons and sports */
export default function Scene() {
  const items: Item[] = [
    { name: "TierList", does: "items drop into S, A, B, C", loop: 5, node: <Fit s={0.55}><TierList tiers={[{ tier: "S", items: ["🍛", "🥭"] }, { tier: "A", items: ["🍕", "🍜", "🌮"] }, { tier: "B", items: ["🥗"] }, { tier: "C", items: ["🥦"] }]} at={0.2} per={0.3} /></Fit> },
    { name: "Podium", does: "the steps rise, names drop on", loop: 4, node: <Fit s={0.75}><Podium first="India" second="China" third="Japan" at={0.2} /></Fit> },
    { name: "ProsCons", does: "point by point", loop: 5, node: <Fit s={0.55}><ProsCons title="Work from home?" pros={["No commute", "Flexible hours"]} cons={["Lonely", "Blurry boundaries"]} at={0.2} /></Fit> },
    { name: "MythFact", does: "stamped MYTH, flips to the fact", loop: 4.4, node: <Fit s={0.75}><MythFact myth="We use only 10% of our brain" fact="We use all of it, just not all at once" at={0.2} flip={2} /></Fit> },
    { name: "ForkRoad", does: "walks up and chooses a way", loop: 5, node: <ForkRoad left="Job" right="Startup" choose="right" at={0.2} decide={2} /> },
    { name: "CricketScore", does: "runs, wickets, overs, target", loop: 4, node: <Fit s={0.8}><CricketScore runs={187} wickets={4} overs={18.3} target={201} at={0.2} /></Fit> },
    { name: "WagonWheel", does: "where every shot went", loop: 5, node: <Fit s={0.7}><WagonWheel shots={Array.from({ length: 24 }, (_, i) => ({ angle: (i * 137) % 360, runs: ([1, 1, 2, 4, 1, 6, 2, 4, 1, 3] as const)[i % 10] }))} at={0.2} /></Fit> },
    { name: "FootballPitch", does: "passes, the ball, GOAL", loop: 5, node: <Fit s={0.6}><FootballPitch passes={[[0.2, 0.5], [0.4, 0.3], [0.55, 0.6], [0.75, 0.4], [0.97, 0.5]]} at={0.2} per={0.7} /></Fit> },
    { name: "MedalTable", does: "medals tick up, sorted", node: <Fit s={0.7}><MedalTable rows={[{ country: "USA", gold: 40, silver: 44, bronze: 42, flag: "🇺🇸" }, { country: "China", gold: 40, silver: 27, bronze: 24, flag: "🇨🇳" }, { country: "India", gold: 1, silver: 5, bronze: 6, flag: "🇮🇳" }]} at={0.2} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Comparisons and sports" count={items.length} items={items} cols={3} />;
}
