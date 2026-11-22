import { Cheque, CreditScore, CryptoCoin, EmiTable, HousePrice, Invoice, SalarySlip, TaxSlabs, UpiPayment } from "../../lib/blocks-e";
import { Fit, Showcase, type Item } from "./show";

/* layer 2, part E: more finance */
export default function Scene() {
  const items: Item[] = [
    { name: "EmiTable", does: "a loan paid down year by year", loop: 5, node: <Fit s={0.62}><EmiTable principal={2000000} rate={8.5} years={20} at={0.2} /></Fit> },
    { name: "CreditScore", does: "a needle swings to the score", node: <Fit s={0.85}><CreditScore score={782} at={0.2} /></Fit> },
    { name: "TaxSlabs", does: "income fills the slabs", loop: 5, node: <Fit s={0.6}><TaxSlabs slabs={[{ upto: 400000, rate: 0 }, { upto: 800000, rate: 5 }, { upto: 1200000, rate: 10 }, { upto: 1600000, rate: 15 }, { upto: null, rate: 30 }]} income={1500000} at={0.2} /></Fit> },
    { name: "SalarySlip", does: "earnings, deductions, net pay", loop: 5, node: <Fit s={0.62}><SalarySlip earnings={[["Basic", 40000], ["HRA", 16000], ["Allowance", 8000]]} deductions={[["PF", 4800], ["Tax", 6200]]} at={0.2} /></Fit> },
    { name: "Invoice", does: "items, GST and a PAID stamp", loop: 5, node: <Fit s={0.6}><Invoice items={[{ item: "Rice 25kg", qty: 2, price: 1250 }, { item: "Oil 5L", qty: 3, price: 720 }, { item: "Sugar 10kg", qty: 1, price: 460 }]} at={0.2} paid={2.4} /></Fit> },
    { name: "Cheque", does: "filled in, then signed", loop: 5, node: <Fit s={0.72}><Cheque payee="Asha Rao" amount={25000} words="Twenty five thousand only" at={0.2} /></Fit> },
    { name: "UpiPayment", does: "scan, paying, paid", loop: 4.4, node: <Fit s={0.62}><UpiPayment amount={349} at={0.1} /></Fit> },
    { name: "CryptoCoin", does: "spins; the price jumps", node: <Fit s={0.85}><CryptoCoin at={0.1} /></Fit> },
    { name: "HousePrice", does: "a price tag climbs", loop: 5, node: <Fit s={0.72}><HousePrice points={[{ year: "2005", price: 1800000 }, { year: "2015", price: 4200000 }, { year: "2025", price: 9600000 }]} at={0.2} per={1.6} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Finance (more)" count={items.length} items={items} cols={3} />;
}
