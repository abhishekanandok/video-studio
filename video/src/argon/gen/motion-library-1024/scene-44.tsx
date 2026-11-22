import { useContext } from "react";
import { SceneCtx } from "../../kit";
import { Character, Village } from "../../lib/blocks-d";
import { Go, Meet } from "../../lib/motion-c";
import { Center, Showcase, type Item } from "./show";

/* layer 1, part C: people that go places and meet; layer 2: the new clothes and actions; lips that follow the words */
const SAID = "Bombay became Mumbai in nineteen ninety five".split(" ").map((w, i) => ({ w, s: 0.3 + i * 0.45, e: 0.3 + i * 0.45 + 0.4 }));
function Talker() {
  const c = useContext(SceneCtx);
  return <SceneCtx.Provider value={{ ...c, words: SAID }}><Center y={0.55}><Character talks action="talk" emotion="happy" job="saree" height={420} /></Center><div style={{ position: "absolute", left: 0, right: 0, bottom: 20, textAlign: "center", fontSize: 30, fontFamily: "Inter" }}>“Bombay became Mumbai in 1995”</div></SceneCtx.Provider>;
}
export default function Scene() {
  const ground = <div style={{ position: "absolute", left: 0, right: 0, top: 470, bottom: 0, background: "#d8c7a4" }} />;
  const items: Item[] = [
    { name: "Go", does: "walks from A to B, then waves", loop: 5, node: <>{ground}<Go from={[120, 480]} to={[760, 480]} at={0.3} dur={3} then="wave" job="kurta" /></> },
    { name: "Go · run on a path", does: "runs along a route", loop: 4, node: <><Village /><Go from={[0, 0]} to={[0, 0]} path={[[80, 500], [380, 440], [620, 520], [900, 470]]} at={0.2} dur={3} run then="cheer" job="kid" height={240} /></> },
    { name: "Meet · handshake", does: "walk up and shake hands", loop: 4.6, node: <>{ground}<Meet kind="handshake" y={480} at={0.2} a={{ job: "business" }} b={{ job: "business" }} height={300} /></> },
    { name: "Meet · hug", does: "walk up and hug", loop: 4.6, node: <>{ground}<Meet kind="hug" y={480} at={0.2} a={{ job: "grandma" }} b={{ job: "kid" }} height={300} /></> },
    { name: "Meet · highfive", does: "a high five", loop: 4.6, node: <>{ground}<Meet kind="highfive" y={480} at={0.2} a={{ job: "student" }} b={{ job: "student" }} height={300} /></> },
    { name: "Meet · give", does: "one hands the other a gift", loop: 5, node: <>{ground}<Meet kind="give" y={480} at={0.2} gift="📜" a={{ job: "sikh" }} b={{ job: "saree" }} height={300} /></> },
    { name: "Meet · argue", does: "faces turn angry, they point", loop: 5, node: <>{ground}<Meet kind="argue" y={480} at={0.2} a={{ job: "judge" }} b={{ job: "police" }} height={300} /></> },
    { name: "Character · new actions", does: "walk, run, sit, jump, climb", node: <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "flex-end", paddingBottom: 40 }}>{(["walk", "run", "sit", "jump", "climb"] as const).map((a, i) => <Character key={a} action={a} height={300} seed={i} emotion={a === "jump" ? "laughing" : "neutral"} />)}</div> },
    { name: "Character · Indian dress", does: "saree, kurta, sikh, kid, grandma", node: <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "flex-end", paddingBottom: 30 }}>{(["saree", "kurta", "sikh", "kid", "grandma"] as const).map((j, i) => <Character key={j} job={j} height={j === "kid" ? 250 : 360} seed={i} emotion="happy" />)}</div> },
    { name: "Lip-sync", does: "the mouth shape follows each sound", loop: 4.4, node: <Talker /> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="People in motion" count={items.length} items={items} cols={5} />;
}
