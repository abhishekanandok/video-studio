import { Img, staticFile } from "remotion";
import { CaseFile, Certificate, CorkBoard, IdCard, NewsTicker, PhotoAlbum, Polaroid, StickyNotes, Ticket, TvFrame, WantedPoster } from "../../lib/blocks-f";
import { pic } from "./pics";
import { Center, Fit, Showcase, type Item } from "./show";

/* layer 2, part F: documents and news */
export default function Scene() {
  const items: Item[] = [
    { name: "NewsTicker", does: "BREAKING and headlines scroll", node: <><Img src={staticFile(pic("control.jpg"))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /><NewsTicker items={["Eagle has landed", "Fuel at 25 seconds", "Armstrong steps out"]} at={0.2} /></> },
    { name: "TvFrame", does: "an old TV with scan lines", node: <Fit s={0.62}><TvFrame at={0.2}><Img src={staticFile(pic("surface.jpg"))} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></TvFrame></Fit> },
    { name: "Polaroid", does: "drops in and develops", loop: 4, node: <Center><Polaroid image={pic("porch.png")} caption="Summer '98" at={0.2} w={330} /></Center> },
    { name: "PhotoAlbum", does: "pages turn", loop: 5, node: <Fit s={0.66}><PhotoAlbum images={[pic("porch.png"), pic("town.png"), pic("control.jpg"), pic("orbit.jpg")]} captions={["Home", "Town", "Work", "Space"]} at={0.6} per={2.2} /></Fit> },
    { name: "StickyNotes", does: "notes slap onto a wall", loop: 4, node: <Fit s={0.75}><StickyNotes notes={["Buy salt", "March at dawn", "Write letter", "Pack light"]} cols={4} size={240} at={0.2} /></Fit> },
    { name: "CorkBoard", does: "red string joins the clues", loop: 5, node: <Fit s={0.54}><CorkBoard items={[{ x: 0.2, y: 0.35, image: pic("gandhi.png") }, { x: 0.55, y: 0.3, text: "Dandi, 6 April" }, { x: 0.8, y: 0.6, image: pic("salt0.png") }, { x: 0.4, y: 0.72, text: "Salt tax?" }]} links={[[0, 1], [1, 2], [0, 3]]} at={0.1} /></Fit> },
    { name: "CaseFile", does: "opens to a dossier", loop: 5, node: <Fit s={0.7}><CaseFile image={pic("gandhi.png")} fields={[["Name", "M. K. Gandhi"], ["Charge", "Breaking the salt law"], ["Date", "6 April 1930"]]} at={0.2} /></Fit> },
    { name: "IdCard", does: "an ID or a passport", node: <div style={{ position: "absolute", inset: 0, display: "flex", gap: 20, justifyContent: "center", alignItems: "center", transform: "scale(0.5)" }}><IdCard name="Asha Rao" number="4821 7730 1192" at={0.2} /><IdCard kind="passport" name="Asha Rao" number="Z1234567" at={0.4} /></div> },
    { name: "Certificate", does: "a name written in, a seal", loop: 4, node: <Fit s={0.62}><Certificate name="Asha Rao" reason="for topping the class of 2026" at={0.2} /></Fit> },
    { name: "Ticket", does: "the stub tears off", loop: 3.4, node: <Fit s={0.8}><Ticket at={0.2} tear={1.6} /></Fit> },
    { name: "WantedPoster", does: "WANTED, with a reward", node: <Fit s={0.68}><WantedPoster name="The Salt Thief" reward="₹ 500" image={pic("gandhi.png")} at={0.2} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Documents (more)" count={items.length} items={items} cols={4} />;
}
