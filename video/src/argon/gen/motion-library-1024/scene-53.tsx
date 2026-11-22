import { Img, staticFile } from "remotion";
import { CricketScore, FootballPitch, MedalTable, MoodMeter, RailwayPlatform, WagonWheel } from "../../lib/blocks-g";
import { pic } from "./pics";
import { Fit, Showcase, type Item } from "./show";

/* slots: the same motion, with real pictures and your own interface swapped in */
const round = (n: string, size: number) => <Img src={staticFile(pic(n))} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "5px solid #fff", boxShadow: "0 4px 10px rgb(0 0 0/0.4)" }} />;
export default function Scene() {
  const items: Item[] = [
    { name: "RailwayPlatform · parts", does: "a real station and a real train photo", loop: 4, node: <RailwayPlatform at={0.2} dur={3} parts={{ background: pic("town.png"), train: pic("controller.png"), board: <div style={{ background: "#0e3a8a", color: "#fff", padding: "8px 40px", fontSize: 60, fontWeight: 900, fontFamily: "Arial", borderRadius: 10 }}>मुंबई सेंट्रल</div> }} trainLength={1500} /> },
    { name: "MoodMeter · marker(v)", does: "a sad photo becomes a happy one", loop: 3.6, node: <Fit s={0.7}><MoodMeter at={0.2} dur={2.4} parts={{ track: pic("sun.png"), low: "😞", high: "😄" }} marker={(v) => round(v > 0.5 ? "porch.png" : "window.png", 160)} /></Fit> },
    { name: "FootballPitch · parts + player", does: "a real ground, player photos, a real ball", loop: 5, node: <Fit s={0.6}><FootballPitch passes={[[0.2, 0.5], [0.4, 0.3], [0.55, 0.6], [0.75, 0.4], [0.97, 0.5]]} at={0.2} per={0.7} parts={{ ground: pic("surface.jpg"), ball: <div style={{ fontSize: 40 }}>⚽</div> }} player={(_p, i) => round(["gandhi.png", "control.jpg", "porch.png", "town.png", "orbit.jpg"][i], 90)} /></Fit> },
    { name: "WagonWheel · parts + shot", does: "a stadium photo; sixes marked 🔥", loop: 5, node: <Fit s={0.7}><WagonWheel shots={Array.from({ length: 24 }, (_, i) => ({ angle: (i * 137) % 360, runs: ([1, 1, 2, 4, 1, 6, 2, 4, 1, 3] as const)[i % 10] }))} at={0.2} parts={{ ground: pic("orbit.jpg") }} shot={(sh) => (sh.runs === 6 ? <div style={{ fontSize: 40 }}>🔥</div> : null)} /></Fit> },
    { name: "CricketScore · render", does: "the same live score as an LED board", loop: 4, node: <CricketScore runs={187} wickets={4} overs={18.3} target={201} at={0.2} render={(s) => <div style={{ position: "absolute", inset: 0, background: "#050505", display: "grid", placeItems: "center", fontFamily: "'Courier New', monospace", color: "#ffb000", textShadow: "0 0 18px #ff8a00" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 60 }}>{s.team} · {s.oversText} OVERS</div><div style={{ fontSize: 210, fontWeight: 900, letterSpacing: 10 }}>{s.runs}-{s.wickets}</div>{s.need !== undefined && <div style={{ fontSize: 56, color: "#ff4040" }}>NEED {s.need} RUNS</div>}</div></div>} /> },
    { name: "MedalTable · flags + background", does: "picture flags on a photo", node: <Fit s={0.7}><MedalTable at={0.2} parts={{ background: pic("control.jpg") }} rows={[{ country: "USA", gold: 40, silver: 44, bronze: 42, flag: pic("orbit.jpg") }, { country: "China", gold: 40, silver: 27, bronze: 24, flag: pic("salt0.png") }, { country: "India", gold: 1, silver: 5, bronze: 6, flag: pic("sun.png") }]} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Swap anything in, keep the motion" count={items.length} items={items} cols={3} />;
}
