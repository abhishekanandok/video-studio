import { Img, staticFile } from "remotion";
import { Crane, DollyZoom, Orbit3D, PictureInPicture, Quake, SplitScreen, ZoomInto } from "../../lib/motion-b";
import { Character, CityNight, Office } from "../../lib/blocks-d";
import { Phone } from "../../lib/blocks-c";
import { Landscape, Street } from "../../lib/blocks-c";
import { pic } from "./pics";
import { Center, Showcase, Thing, type Item } from "./show";

const full = (name: string) => <Img src={staticFile(pic(name))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
/* layer 1, part B: more camera moves */
export default function Scene() {
  const items: Item[] = [
    { name: "DollyZoom", does: "vertigo: the world stretches behind", loop: 4, node: <DollyZoom at={0.3} dur={3} back={<Street />} subject={<Center y={0.62}><Character emotion="scared" height={380} /></Center>} /> },
    { name: "Crane", does: "rises up and looks down", loop: 4.6, node: <Crane at={0.3} dur={3.6}><Landscape /></Crane> },
    { name: "Orbit3D", does: "circles round in 3D", loop: 6, node: <Center><div style={{ width: 300, height: 300 }}><Orbit3D period={5}><Thing glyph="🗿" size={300} /></Orbit3D></div></Center> },
    { name: "Quake", does: "the ground shakes", loop: 3, node: <Quake at={0.3} dur={2.2} amount={1.4}><CityNight /></Quake> },
    { name: "ZoomInto", does: "dives into a screen", loop: 4, node: <ZoomInto rect={{ x: 405, y: 95, w: 150, h: 300 }} at={1} dur={1.6} inside={full("orbit.jpg")}><div style={{ position: "absolute", inset: 0, background: "#e6e9ee" }} /><div style={{ position: "absolute", left: 390, top: 80 }}><Phone h={330} /></div></ZoomInto> },
    { name: "SplitScreen", does: "two shots side by side", loop: 4, node: <SplitScreen at={0.3} shots={[full("control.jpg"), full("surface.jpg")]} /> },
    { name: "PictureInPicture", does: "a small shot in a corner", loop: 4, node: <PictureInPicture at={0.6} main={full("orbit.jpg")} inset={<Office />} /> },
  ];
  return <Showcase layer="LAYER 1 · MOTIONS" group="Camera (more)" count={items.length} items={items} cols={4} />;
}
