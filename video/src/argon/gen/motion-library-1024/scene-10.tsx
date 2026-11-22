import { AreaStack, BigNumber, ColumnChart, Donut, HBars, LineChart2 } from "../../lib/blocks-a";
import { Center, Showcase, type Item } from "./show";

export default function Scene() {
  const items: Item[] = [
    { name: "BigNumber", does: "one number that says it all", node: <Center><BigNumber value={1.4} decimals={1} suffix=" bn" label="people live in India" at={0.2} size={200} /></Center> },
    { name: "ColumnChart", does: "columns that grow", node: <div style={{ position: "absolute", left: 120, top: 40 }}><ColumnChart data={[{ label: "Q1", value: 22 }, { label: "Q2", value: 35 }, { label: "Q3", value: 31 }, { label: "Q4", value: 48 }]} w={720} h={370} at={0.2} /></div> },
    { name: "LineChart", does: "a trend over time", loop: 4, node: <div style={{ position: "absolute", left: 80, top: 80 }}><LineChart2 values={[100, 104, 98, 112, 120, 117, 131, 142]} w={720} h={360} at={0.2} suffix=" pts" /></div> },
    { name: "Donut", does: "parts of a whole", node: <div style={{ position: "absolute", left: 300, top: 70 }}><Donut slices={[{ label: "Coal", value: 55 }, { label: "Solar", value: 18 }, { label: "Hydro", value: 12 }, { label: "Wind", value: 15 }]} size={330} at={0.2} /></div> },
    { name: "HBars", does: "a sorted ranking", node: <div style={{ position: "absolute", left: 60, top: 70 }}><HBars data={[{ label: "Mumbai", value: 92 }, { label: "Delhi", value: 81 }, { label: "Kolkata", value: 64 }, { label: "Chennai", value: 52 }, { label: "Pune", value: 40 }]} w={840} at={0.2} /></div> },
    { name: "AreaStack", does: "shares changing over the years", node: <div style={{ position: "absolute", left: 60, top: 60 }}><AreaStack series={[{ name: "Rural", values: [70, 66, 62, 58, 54] }, { name: "Urban", values: [30, 34, 38, 42, 46] }]} labels={["1990", "2000", "2010", "2020", "2030"]} w={640} h={360} at={0.2} /></div> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Data (1 of 2)" count={items.length} items={items} cols={3} />;
}
