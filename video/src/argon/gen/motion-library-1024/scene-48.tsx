import { Evm, IndiaMap, SeatArc, SwingMeter, VersusCards } from "../../lib/blocks-g";
import { Fit, Showcase, type Item } from "./show";

/* layer 2, part G: India and elections */
export default function Scene() {
  const lit: Record<string, number> = { Kerala: 94, Mizoram: 91, Goa: 88, Delhi: 86, Maharashtra: 82, Tamilnadu: 80, Gujarat: 78, "West Bengal": 76, Karnataka: 75, Punjab: 75, Odisha: 73, Assam: 72, "Uttar Pradesh": 67, Rajasthan: 66, Bihar: 61, "Madhya Pradesh": 69, Jharkhand: 66, Telengana: 66, "Andhra Pradesh": 67, Chhattishgarh: 70, Haryana: 75, Uttarakhand: 78, "Himachal Pradesh": 82, "Jammu and Kashmir": 67, Ladakh: 77, Sikkim: 81, Tripura: 87, Manipur: 79, Meghalaya: 74, Nagaland: 79, "Arunachal Pradesh": 65 };
  const result: Record<string, string> = { "Uttar Pradesh": "#ff8a1c", Bihar: "#ff8a1c", Maharashtra: "#ff8a1c", Gujarat: "#ff8a1c", "Madhya Pradesh": "#ff8a1c", Rajasthan: "#ff8a1c", Kerala: "#2a6ad9", Tamilnadu: "#e0453a", Karnataka: "#2a6ad9", "West Bengal": "#3fb35a", Punjab: "#2a6ad9", Telengana: "#e06a8a" };
  const items: Item[] = [
    { name: "IndiaMap · values", does: "every state, coloured by literacy", node: <Fit s={0.5} y={0.52}><IndiaMap values={lit} labels legend="Literacy %" w={900} h={1000} at={0.2} /></Fit> },
    { name: "IndiaMap · colors + lift", does: "a result map; winners rise", node: <Fit s={0.5} y={0.52}><IndiaMap colors={result} lift w={900} h={1000} at={0.2} /></Fit> },
    { name: "SeatArc", does: "the seats fill; the majority line", loop: 5, node: <Fit s={0.7}><SeatArc parties={[{ name: "Alliance A", seats: 293, color: "#ff8a1c" }, { name: "Alliance B", seats: 234, color: "#2a6ad9" }, { name: "Others", seats: 16, color: "#9aa3ad" }]} majority={272} at={0.2} per={0.8} /></Fit> },
    { name: "Evm", does: "a button pressed, the light, the beep", loop: 3.6, node: <Fit s={0.75}><Evm candidates={[{ name: "Party A", symbol: "🪷" }, { name: "Party B", symbol: "✋" }, { name: "Party C", symbol: "🧹" }, { name: "NOTA", symbol: "✖️" }]} pick={2} press={1.4} at={0} /></Fit> },
    { name: "VersusCards", does: "two candidates face off", loop: 3.6, node: <Fit s={0.58}><VersusCards a={{ name: "Asha Rao", sub: "Party A" }} b={{ name: "Vikram Singh", sub: "Party B" }} at={0.2} /></Fit> },
    { name: "SwingMeter", does: "the needle swings to the gainer", node: <Fit s={0.9}><SwingMeter swing={6.4} left="Party A" right="Party B" at={0.2} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="India and elections" count={items.length} items={items} cols={3} />;
}
