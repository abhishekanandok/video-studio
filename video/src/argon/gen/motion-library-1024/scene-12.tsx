import { Allocation, BalanceScale, BankCard, Candles, CoinStack, InflationBasket, MoneyFlow, Receipt, TickerTape } from "../../lib/blocks-a";
import { rand } from "../../lib/motion";
import { Center, Showcase, type Item } from "./show";

const candles = (() => { let p = 100; return Array.from({ length: 34 }, (_, i) => { const o = p, c = p + (rand(i) - 0.42) * 8; p = c; return [o, Math.max(o, c) + rand(i + 50) * 3, Math.min(o, c) - rand(i + 90) * 3, c] as [number, number, number, number]; }); })();

export default function Scene() {
  const items: Item[] = [
    { name: "Candles", does: "a stock's price, day by day", loop: 4.4, node: <div style={{ position: "absolute", left: 40, top: 30 }}><Candles data={candles} w={740} h={460} at={0.2} /></div> },
    { name: "TickerTape", does: "prices scrolling past", bg: "#0e1117", node: <div style={{ position: "absolute", left: 0, top: 230 }}><TickerTape w={960} at={0} items={[{ sym: "NIFTY", price: "24,310", change: 0.8 }, { sym: "TCS", price: "4,120", change: -1.2 }, { sym: "INFY", price: "1,890", change: 2.1 }, { sym: "HDFC", price: "1,640", change: -0.4 }]} /></div> },
    { name: "CoinStack", does: "coins drop and pile up", node: <div style={{ position: "absolute", left: 230, bottom: 40 }}><CoinStack stacks={[3, 6, 10]} at={0.2} size={130} gap={180} /></div> },
    { name: "MoneyFlow", does: "where the money goes", loop: 5, node: <div style={{ position: "absolute", left: 0, top: 0, transform: "scale(0.72)", transformOrigin: "0 0" }}><MoneyFlow from="Salary ₹50,000" to={[{ label: "Rent", share: 35 }, { label: "Food", share: 25 }, { label: "EMI", share: 20 }, { label: "Savings", share: 20 }]} w={1320} h={740} at={0.2} /></div> },
    { name: "BalanceScale", does: "it tips to the heavier side", node: <div style={{ position: "absolute", left: 120, top: 10 }}><BalanceScale left="Debt" right="Assets" lw={3} rw={7} at={0.3} size={720} /></div> },
    { name: "Receipt", does: "a bill prints out, then its total", loop: 4.6, node: <Center><Receipt lines={[["Rice 5kg", "₹420"], ["Onions 2kg", "₹90"], ["Milk 2L", "₹124"], ["Tea 500g", "₹260"]]} total="₹894" at={0.2} w={420} /></Center> },
    { name: "BankCard", does: "a card turns and catches the light", node: <Center><BankCard at={0.2} w={540} /></Center> },
    { name: "Allocation", does: "a budget or portfolio split", node: <Center><Allocation parts={[{ label: "Equity", value: 60 }, { label: "Debt", value: 25 }, { label: "Gold", value: 15 }]} w={820} at={0.2} /></Center> },
    { name: "InflationBasket", does: "the same money buys less", loop: 4.6, node: <Center><InflationBasket at={0.4} per={1.6} /></Center> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Finance" count={items.length} items={items} cols={3} />;
}
