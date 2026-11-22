import { Puppet, useScene } from "../../kit";
import { Avatar, CutoutPerson, Crowd, Hand, Portrait, Silhouette, SpeechQuote } from "../../lib/blocks-a";
import { pic } from "./pics";
import { RIGS } from "./rigs";
import { Center, Showcase, type Item } from "./show";

export default function Scene() {
  const s = useScene();
  const items: Item[] = [
    { name: "Puppet", does: "a jointed character: walk, run, wave, cheer, sit", loop: 5, node: <><div style={{ position: "absolute", left: 0, right: 0, top: 480, bottom: 0, background: "#d8c7a4" }} /><Puppet rig={RIGS.mother} x={300} y={490} height={380} pose="wave" /><Puppet rig={RIGS.boy} y={490} height={300} from={900} to={560} at={0.3} dur={2.6} then="cheer" /></> },
    { name: "Silhouette", does: "a flat person in any pose", node: <div style={{ position: "absolute", left: 60, right: 60, top: 70, display: "flex", justifyContent: "space-around", alignItems: "flex-end" }}>{(["stand", "walk", "point", "cheer"] as const).map((p, i) => <Silhouette key={p} pose={p} height={380} at={0.2 + i * 0.2} color={i % 2 ? s.theme.accent2 : s.theme.ink} />)}</div> },
    { name: "CutoutPerson", does: "a real person cut out of a photo or painting", node: <Center><CutoutPerson image={pic("gandhi.png")} height={440} at={0.2} /></Center> },
    { name: "Crowd", does: "rows of people that gather and bob", node: <div style={{ position: "absolute", left: 60, bottom: 40 }}><Crowd w={840} rows={3} per={12} at={0.2} /></div> },
    { name: "Portrait", does: "a framed photo with a name and a role", node: <Center><Portrait image={pic("control.jpg")} name="Mission Control" role="Houston, 20 July 1969" size={300} at={0.2} /></Center> },
    { name: "SpeechQuote", does: "a person speaks; the words type out", loop: 5, node: <Center><SpeechQuote image={pic("control.jpg")} text="We're go for landing. Thirty seconds." at={0.2} w={820} /></Center> },
    { name: "Hand", does: "a hand points or taps", node: <Center><Hand at={0.2} size={240} /></Center> },
    { name: "Avatar", does: "round faces for users, voters, customers", node: <div style={{ position: "absolute", inset: 0, display: "flex", gap: 30, justifyContent: "center", alignItems: "center" }}>{["Asha Rao", "Vikram S", "Meera K", "John D"].map((n, i) => <Avatar key={n} name={n} at={0.2 + i * 0.15} size={170} color={i % 2 ? s.theme.accent : s.theme.accent2} />)}</div> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="People" count={items.length} items={items} cols={4} />;
}
