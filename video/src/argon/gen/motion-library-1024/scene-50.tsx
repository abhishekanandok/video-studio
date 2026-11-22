import { CartFill, ChaiStall, Diya, GoalStairs, HabitGrid, Iceberg, MoodMeter, RailwayPlatform, Rangoli, SupplyDemand, Thermometer } from "../../lib/blocks-g";
import { Center, Fit, Showcase, type Item } from "./show";

/* layer 2, part G: economy, Indian life, self-help */
export default function Scene() {
  const items: Item[] = [
    { name: "SupplyDemand", does: "demand shifts, the price moves", loop: 4.4, node: <Fit s={0.7}><SupplyDemand shift={1} at={0.2} /></Fit> },
    { name: "Iceberg", does: "what you see, what's beneath", loop: 4.4, node: <Fit s={0.55}><Iceberg above={["Salary"]} below={["Rent", "EMIs", "School fees", "Medical", "Savings"]} at={0.2} /></Fit> },
    { name: "CartFill", does: "the cart fills, the bill adds up", loop: 4.4, node: <Fit s={0.75}><CartFill items={[{ icon: "🍚", price: 420 }, { icon: "🥛", price: 62 }, { icon: "🧅", price: 90 }, { icon: "🍞", price: 45 }, { icon: "🥚", price: 84 }, { icon: "🧈", price: 60 }]} at={0.2} /></Fit> },
    { name: "Thermometer", does: "rises to a temperature", node: <Center><div style={{ transform: "scale(0.7)" }}><Thermometer value={47.5} at={0.2} /></div></Center> },
    { name: "ChaiStall", does: "a kettle steaming, glasses", node: <ChaiStall /> },
    { name: "RailwayPlatform", does: "a train pulls in", loop: 4, node: <RailwayPlatform at={0.2} dur={3} /> },
    { name: "Diya", does: "a flickering lamp", node: <><div style={{ position: "absolute", inset: 0, background: "#1a1020" }} /><Center><div style={{ display: "flex", gap: 30 }}><Diya size={200} /><Diya size={200} /><Diya size={200} /></div></Center></> },
    { name: "Rangoli", does: "draws itself ring by ring", loop: 4, node: <Center><Rangoli size={480} at={0.2} /></Center> },
    { name: "HabitGrid", does: "30 days ticked off, a streak", loop: 4, node: <Fit s={0.7}><HabitGrid missed={[9, 17]} at={0.2} per={0.1} /></Fit> },
    { name: "MoodMeter", does: "from low to great", loop: 3.6, node: <Fit s={0.7}><MoodMeter at={0.2} dur={2.4} /></Fit> },
    { name: "GoalStairs", does: "climbs step by step to the flag", loop: 5, node: <Fit s={0.6}><GoalStairs steps={["Learn", "Practise", "Build", "Ship"]} at={0.2} per={0.9} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Economy, Indian life, self-help" count={items.length} items={items} cols={4} />;
}
