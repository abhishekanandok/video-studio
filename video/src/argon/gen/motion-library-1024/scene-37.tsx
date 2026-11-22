import { Atom, BodyMap, Circuit, DnaHelix, ElementTile, MagnetField, Microbe, MicroscopeView, Neuron, Organ, Skeleton, VitalsMonitor, XRay } from "../../lib/blocks-f";
import { pic } from "./pics";
import { Center, Fit, Showcase, type Item } from "./show";

/* layer 2, part F: the body and science */
export default function Scene() {
  const row = { position: "absolute" as const, inset: 0, display: "flex", flexWrap: "wrap" as const, justifyContent: "center", alignItems: "center", gap: 10 };
  const items: Item[] = [
    { name: "Organ", does: "8 organs, alive", node: <div style={row}>{(["heart", "lungs", "brain", "stomach", "kidney", "liver", "eye", "tooth"] as const).map((k, i) => <Organ key={k} kind={k} size={170} at={i * 0.1} />)}</div> },
    { name: "BodyMap", does: "organs light up where it matters", node: <Center><BodyMap glow={["heart", "lungs"]} height={500} /></Center> },
    { name: "Skeleton", does: "bones; the jaw can chatter", node: <Center><Skeleton height={500} chatter /></Center> },
    { name: "DnaHelix", does: "a double helix turns", node: <Center><div style={{ transform: "rotate(90deg)" }}><DnaHelix w={260} h={760} /></div></Center> },
    { name: "Microbe", does: "virus, bacteria, amoeba", node: <div style={{ ...row, gap: 40 }}><Microbe kind="virus" size={240} /><Microbe kind="bacteria" size={200} /><Microbe kind="amoeba" size={240} /></div> },
    { name: "Neuron", does: "a signal runs down the axon", node: <Center><Neuron w={860} h={380} /></Center> },
    { name: "Atom", does: "electrons in their shells", node: <Fit s={0.9}><Atom protons={8} label="Oxygen" size={480} /></Fit> },
    { name: "Circuit", does: "the switch closes, the bulb lights", loop: 4, node: <Center><Circuit at={0} close={1.2} w={860} h={500} /></Center> },
    { name: "MagnetField", does: "field lines from pole to pole", node: <Center><MagnetField size={820} /></Center> },
    { name: "VitalsMonitor", does: "heart rate, oxygen, BP", node: <Center><VitalsMonitor w={860} /></Center> },
    { name: "XRay", does: "a scan sweeps into a negative", loop: 3.4, node: <Center><XRay image={pic("gandhi.png")} w={480} h={500} at={0.4} /></Center> },
    { name: "MicroscopeView", does: "cells drift and divide", loop: 5, node: <Center><MicroscopeView size={470} /></Center> },
    { name: "ElementTile", does: "a periodic-table tile", node: <div style={{ ...row, gap: 30 }}><ElementTile n={8} symbol="O" name="Oxygen" mass="15.999" at={0.2} /><ElementTile n={79} symbol="Au" name="Gold" mass="196.97" at={0.4} color="#c8961c" /></div> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Body and science (more)" count={items.length} items={items} cols={5} />;
}
