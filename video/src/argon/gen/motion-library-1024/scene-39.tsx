import { BrowserWindow, ChatApp, Dashboard, Database, EmailCard, Robot, SearchResults, SecurityShield, Terminal, VideoCall } from "../../lib/blocks-f";
import { Center, Fit, Showcase, type Item } from "./show";

/* layer 2, part F: tech */
export default function Scene() {
  const items: Item[] = [
    { name: "BrowserWindow", does: "a URL types, the page loads", loop: 4, node: <Fit s={0.6}><BrowserWindow url="india.gov.in/budget" title="Budget 2026" at={0.1}><div style={{ padding: 60, fontSize: 70, fontWeight: 800 }}>Union Budget 2026</div></BrowserWindow></Fit> },
    { name: "ChatApp", does: "bubbles with typing dots", loop: 5, node: <Fit s={0.5}><ChatApp messages={[{ from: "them", text: "Did you eat?" }, { from: "me", text: "Yes Ma 😊" }, { from: "them", text: "Call me tonight" }]} at={0.2} per={1.1} /></Fit> },
    { name: "SearchResults", does: "a query, then results", loop: 5, node: <Fit s={0.7}><SearchResults query="why is the sky blue" results={[{ title: "Rayleigh scattering", url: "physics.org", snippet: "Blue light is scattered more than red…" }, { title: "Why is the sky blue? | NASA", url: "nasa.gov", snippet: "Sunlight reaches Earth's atmosphere…" }]} at={0.1} /></Fit> },
    { name: "Terminal", does: "commands and output", loop: 5, node: <Fit s={0.66}><Terminal lines={[{ cmd: "ping drishyya.com", out: "64 bytes: time=12 ms" }, { cmd: "git push", out: "main -> main" }, { cmd: "echo done", out: "done" }]} at={0.2} per={1.2} /></Fit> },
    { name: "Dashboard", does: "metric cards and sparklines", node: <Fit s={0.55}><Dashboard cards={[{ label: "Users", value: 12840 }, { label: "Revenue", value: 4.2, unit: " Cr" }, { label: "Churn", value: 2.1, unit: "%", trend: [5, 4, 4, 3, 3, 2] }, { label: "NPS", value: 64 }]} at={0.2} /></Fit> },
    { name: "Robot", does: "a robot that waves and talks", node: <Center><Robot size={360} talks /></Center> },
    { name: "Database", does: "storage that lights up", node: <Center><Database size={320} /></Center> },
    { name: "SecurityShield", does: "locks shut, or cracks (a breach)", loop: 3, node: <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 60 }}><SecurityShield size={260} at={0.2} /><SecurityShield size={260} at={0.2} broken /></div> },
    { name: "VideoCall", does: "a meeting grid; the speaker lit", node: <Fit s={0.58}><VideoCall people={[{ name: "Asha Rao" }, { name: "Vikram S" }, { name: "Meera K" }, { name: "John D" }]} speaker={1} /></Fit> },
    { name: "EmailCard", does: "an email arrives", node: <Fit s={0.75}><EmailCard from="HR Team" subject="Your offer letter" body="We are happy to offer you the role of…" at={0.3} flag="important" /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Tech (more)" count={items.length} items={items} cols={5} />;
}
