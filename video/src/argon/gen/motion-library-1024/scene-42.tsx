import type { ReactNode } from "react";
import { Character, Vehicle, Village } from "../../lib/blocks-d";
import { Backdrop } from "../../lib/blocks-f";
import { Look, LOOKS, type LookKind } from "../../lib/style";
import { BarGrow } from "../../lib/motion";
import { Showcase, type Item } from "./show";

/* layer 0, style: the same little scene in every look: the set gets the look as a whole (fill), each thing on it its own */
const DARK: Partial<Record<LookKind, ReactNode>> = { neon: <Backdrop kind="noir" />, chalk: <Backdrop kind="chalkboard" />, blueprint: <Backdrop kind="blueprint" /> };
export default function Scene() {
  const tile = (k: LookKind) => <>
    {DARK[k] ?? <Look kind={k} fill><Village /></Look>}
    <div style={{ position: "absolute", left: 120, top: 150 }}><Look kind={k}><Character emotion="happy" action="wave" height={360} /></Look></div>
    <div style={{ position: "absolute", left: 470, top: 330 }}><Look kind={k}><Vehicle kind="auto" size={260} /></Look></div>
    <div style={{ position: "absolute", left: 620, top: 40 }}><Look kind={k}><div style={{ background: "#fff", borderRadius: 18, padding: 16 }}><BarGrow data={[{ label: "A", value: 3 }, { label: "B", value: 5 }, { label: "C", value: 8 }]} w={260} h={170} at={0} /></div></Look></div>
  </>;
  const items: Item[] = LOOKS.map((k) => ({ name: k, does: k === "flat" ? "as drawn" : `<Look kind="${k}">`, node: tile(k) }));
  return <Showcase layer="LAYER 0 · STYLE" group="Looks" count={items.length} items={items} cols={4} />;
}
