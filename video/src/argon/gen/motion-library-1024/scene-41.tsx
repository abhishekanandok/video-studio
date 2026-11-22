import { Img, staticFile } from "remotion";
import { ChapterProgress, ComicPanels, CreditsRoll, EndCard, FilmStrip, PodcastMic, RecFrame, SourceNote, StatCallout, VideoPlayer } from "../../lib/blocks-f";
import { Character } from "../../lib/blocks-d";
import { pic } from "./pics";
import { Center, Fit, Showcase, type Item } from "./show";

/* layer 2, part F: media and text */
export default function Scene() {
  const photo = (n: string) => <Img src={staticFile(pic(n))} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  const items: Item[] = [
    { name: "VideoPlayer", does: "play is pressed, the bar runs", loop: 4, node: <Fit s={0.62}><VideoPlayer at={0} play={1}>{photo("orbit.jpg")}</VideoPlayer></Fit> },
    { name: "PodcastMic", does: "a mic and ON AIR", node: <Center><PodcastMic size={380} /></Center> },
    { name: "FilmStrip", does: "film running past", node: <Center><FilmStrip images={[pic("control.jpg"), pic("surface.jpg"), pic("town.png"), pic("porch.png")]} h={300} /></Center> },
    { name: "RecFrame", does: "a camera viewfinder, REC", node: <RecFrame>{photo("town.png")}</RecFrame> },
    { name: "ComicPanels", does: "panels fill one by one", loop: 4, node: <Fit s={0.52}><ComicPanels panels={[{ image: pic("porch.png"), caption: "Morning" }, { node: <Center y={0.6}><Character emotion="surprised" height={360} /></Center>, caption: "Then…" }, { image: pic("town.png"), caption: "Later" }]} at={0.2} /></Fit> },
    { name: "StatCallout", does: "a big number and a line", node: <div style={{ position: "absolute", left: 80, top: 120 }}><StatCallout value="78%" line="of Indians now own a smartphone" at={0.2} /></div> },
    { name: "SourceNote", does: "where a fact comes from", node: <><Center><StatCallout value="₹17L" line="after 30 years" align="center" at={0.2} /></Center><SourceNote text="RBI, 2025" at={0.6} /></> },
    { name: "ChapterProgress", does: "where we are in the story", node: <ChapterProgress chapters={["Salt", "The march", "Dandi", "After"]} current={1} at={0.2} /> },
    { name: "EndCard", does: "subscribe and watch next", loop: 4, node: <EndCard at={0.2} /> },
    { name: "CreditsRoll", does: "credits roll up", loop: 7, node: <CreditsRoll credits={[["Written by", "Raushan"], ["Made with", "Drishyya"], ["Pictures", "Wikimedia Commons"], ["Music", "The Studio"]]} at={0} speed={160} /> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Media and text (more)" count={items.length} items={items} cols={5} />;
}
