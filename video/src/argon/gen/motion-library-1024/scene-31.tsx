import { Battlefield, Cave, CityNight, Classroom, Courtroom, Desert, Factory, Farm, Hospital, Kitchen, Market, Office } from "../../lib/blocks-d";
import { Showcase, type Item } from "./show";

/* layer 2, part D: sets (1 of 2) */
export default function Scene() {
  const items: Item[] = [
    { name: "Classroom", does: "a board that writes itself", node: <Classroom board="Photosynthesis" at={0.3} /> },
    { name: "Office", does: "a desk, a screen, a city view", node: <Office /> },
    { name: "Hospital", does: "a bed and a beeping monitor", node: <Hospital /> },
    { name: "Courtroom", does: "the bench and a gavel", loop: 3, node: <Courtroom gavel={1.2} /> },
    { name: "Kitchen", does: "a stove with a pot steaming", node: <Kitchen /> },
    { name: "Market", does: "stalls and people passing", node: <Market /> },
    { name: "Factory", does: "chimneys smoking, a gear turning", node: <Factory /> },
    { name: "Farm", does: "fields and a tractor", node: <Farm /> },
    { name: "CityNight", does: "windows light up, traffic streaks", loop: 4, node: <CityNight /> },
    { name: "Battlefield", does: "smoke, a ruined wall", node: <Battlefield /> },
    { name: "Desert", does: "dunes and a blazing sun", node: <Desert /> },
    { name: "Cave", does: "torchlight flickers, water drips", node: <Cave /> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Sets (1 of 2)" count={items.length} items={items} cols={4} />;
}
