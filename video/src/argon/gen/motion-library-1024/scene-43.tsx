import { Character, Hospital } from "../../lib/blocks-d";
import { paletteVars } from "../../lib/palette";
import { Showcase, type Item } from "./show";

/* layer 0, style: the same blocks under four themes; the palette leans every drawn colour toward the theme */
const THEMES = [
  { name: "no theme", does: "the natural colours", theme: undefined },
  { name: "dark neon", does: "accent #ff2ad4, ink #f0f0ff", theme: { bg: ["#0a0420"], ink: "#f0f0ff", accent: "#ff2ad4", accent2: "#22d3ee", paper: "#1a1033", muted: "#6b5b9a", tint: 0.6 } },
  { name: "warm paper", does: "accent #c85a32, paper #fffbf2", theme: { bg: ["#f4ead4"], ink: "#2d2622", accent: "#c85a32", accent2: "#2b6e74", paper: "#fffbf2", muted: "#8a7968", tint: 0.5 } },
  { name: "set outright", does: "palette: { wall: '#ffd6e0', floor: '#8a5a9a' }", theme: { tint: 0, palette: { wall: "#ffd6e0", floor: "#8a5a9a", signal: "#ffe066" } } },
];
export default function Scene() {
  const items: Item[] = THEMES.map((t) => ({ name: t.name, does: t.does, node: <div style={{ position: "absolute", inset: 0, ...(t.theme ? paletteVars(t.theme) : {}) }}><Hospital /><div style={{ position: "absolute", left: 300, top: 150 }}><Character emotion="worried" job="nurse" height={360} /></div></div> }));
  return <Showcase layer="LAYER 0 · STYLE" group="One palette, many themes" count={items.length} items={items} cols={2} />;
}
