import { Animal, Character, ComicBubble, Face, Mascot, type Action, type Emotion, type Job } from "../../lib/blocks-d";
import { Center, Showcase, type Item } from "./show";

/* layer 2, part D: characters */
export default function Scene() {
  const emotions: Emotion[] = ["neutral", "happy", "sad", "angry", "scared", "surprised", "thinking", "laughing", "worried", "proud"];
  const jobs: Job[] = ["doctor", "teacher", "soldier", "farmer", "police", "chef", "worker", "business", "student", "scientist", "judge", "nurse", "elder"];
  const actions: Action[] = ["wave", "point", "think", "facepalm", "cheer", "shrug", "talk", "cross"];
  const row = (n: number) => ({ position: "absolute" as const, inset: 0, display: "flex", flexWrap: "wrap" as const, justifyContent: "center", alignItems: "center", gap: n });
  const items: Item[] = [
    { name: "Face", does: "10 feelings, eyes blink", node: <div style={row(16)}>{emotions.map((e, i) => <div key={e} style={{ textAlign: "center", fontSize: 22, fontFamily: "Inter, Arial" }}><Face emotion={e} size={150} seed={i} />{e}</div>)}</div> },
    { name: "Character · jobs", does: "clothes for 13 jobs", node: <div style={{ ...row(0), alignItems: "flex-end", paddingBottom: 20 }}>{jobs.map((j, i) => <Character key={j} job={j} height={230} seed={i} emotion={i % 3 ? "happy" : "neutral"} />)}</div> },
    { name: "Character · actions", does: "wave, point, think, facepalm, cheer…", node: <div style={{ ...row(10), alignItems: "flex-end", paddingBottom: 30 }}>{actions.map((a, i) => <Character key={a} action={a} height={300} seed={i} at={0.2} emotion={a === "facepalm" ? "worried" : a === "cheer" ? "laughing" : "neutral"} />)}</div> },
    { name: "Character · talks", does: "the mouth moves while it speaks", loop: 5, node: <Center y={0.55}><Character action="talk" emotion="happy" job="teacher" height={460} talkFrom={0.3} talkTo={4} /></Center> },
    { name: "Mascot", does: "a host that bobs and talks", loop: 5, node: <Center><Mascot size={360} talks={false} /></Center> },
    { name: "Animal", does: "dog, cat, bird, cow, elephant, fish, lion, horse", node: <div style={row(0)}>{(["dog", "cat", "bird", "cow", "elephant", "fish", "lion", "horse"] as const).map((k, i) => <Animal key={k} kind={k} size={200} at={0.1 + i * 0.1} />)}</div> },
    { name: "ComicBubble", does: "speech, thought, shout, whisper", loop: 5, node: <div style={{ ...row(24), padding: 20 }}><ComicBubble text="Hello there!" w={380} at={0.2} size={36} /><ComicBubble text="Hmm…" kind="thought" w={300} at={0.5} tail="br" size={36} /><ComicBubble text="STOP!" kind="shout" w={330} at={0.8} size={36} /><ComicBubble text="psst, over here" kind="whisper" w={360} at={1.1} tail="br" size={36} /></div> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Characters" count={items.length} items={items} cols={4} />;
}
