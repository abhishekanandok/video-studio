import { Img, staticFile } from "remotion";
import { ForumPost, ForwardedMessage, FrontPage, Glacier, HomeScreen, MagazineCover, MuseumPlacard, PhotoPost, PostThread, RocketLaunch, SeaLevel, StarMap, Tablet, ThumbnailGrid, TvWall, Watch } from "../../lib/blocks-g";
import { pic } from "./pics";
import { Fit, Showcase, type Item } from "./show";

/* layer 2, part G: social media, climate and space, devices and frames */
export default function Scene() {
  const photo = (n: string) => <Img src={staticFile(pic(n))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  const items: Item[] = [
    { name: "PostThread", does: "a thread; likes count up", loop: 4.4, node: <Fit s={0.62}><PostThread posts={[{ text: "Why is the rupee falling? A thread 🧵", likes: 12400 }, { text: "1/ It starts with oil.", likes: 3200 }]} at={0.2} per={1} /></Fit> },
    { name: "ForumPost", does: "upvotes climb", node: <Fit s={0.7}><ForumPost title="TIL the Salt March covered 385 km in 24 days" body="Gandhi walked from Sabarmati to Dandi…" at={0.2} /></Fit> },
    { name: "ForwardedMessage", does: "forwarded many times → FAKE", loop: 3.6, node: <Fit s={0.8}><ForwardedMessage text="Drinking hot water kills the virus!!" verdict="fake" at={0.2} stampAt={1.6} /></Fit> },
    { name: "ThumbnailGrid", does: "videos load; one is picked", loop: 4, node: <Fit s={0.55}><ThumbnailGrid items={[{ title: "The Salt March", image: pic("salt0.png") }, { title: "Apollo 11", image: pic("surface.jpg") }, { title: "Mission Control", image: pic("control.jpg") }, { title: "A town", image: pic("town.png") }, { title: "Back to school", image: pic("porch.png") }, { title: "Orbit", image: pic("orbit.jpg") }]} pick={1} at={0.2} /></Fit> },
    { name: "HomeScreen", does: "apps pop in, one is opened", loop: 4, node: <Fit s={0.55}><HomeScreen tap={2.4} at={0.2} /></Fit> },
    { name: "PhotoPost", does: "a double-tap heart bursts", loop: 4, node: <Fit s={0.62}><PhotoPost image={pic("town.png")} caption="Morning in the old town" heart={1.4} at={0.2} /></Fit> },
    { name: "SeaLevel", does: "the sea rises on a coast", loop: 5, node: <SeaLevel at={0.3} dur={4} /> },
    { name: "Glacier", does: "melts back up its valley", loop: 5, node: <Glacier at={0.3} dur={4} /> },
    { name: "RocketLaunch", does: "countdown, lift-off, stages", loop: 6.6, node: <RocketLaunch at={0} count={3} /> },
    { name: "StarMap", does: "a constellation draws itself", loop: 4.4, node: <Fit s={0.66}><StarMap at={0.2} /></Fit> },
    { name: "Tablet", does: "a tablet with anything on it", node: <Fit s={0.75}><Tablet at={0.2}>{photo("orbit.jpg")}</Tablet></Fit> },
    { name: "Watch", does: "steps ring fills", loop: 3.6, node: <Fit s={0.9}><Watch at={0.2} /></Fit> },
    { name: "TvWall", does: "screens flicker on", loop: 3, node: <Fit s={0.6}><TvWall at={0.3} screens={["control.jpg", "surface.jpg", "orbit.jpg", "town.png", "porch.png", "salt0.png"].map((n) => photo(n))} /></Fit> },
    { name: "MuseumPlacard", does: "title, date, the story", node: <Fit s={0.8}><MuseumPlacard title="Charkha" date="c. 1930" text="A spinning wheel of the kind Gandhi used, a symbol of self-reliance." at={0.2} /></Fit> },
    { name: "MagazineCover", does: "masthead, photo, cover lines", loop: 4, node: <Fit s={0.38}><MagazineCover image={pic("gandhi.png")} headline="Man of the Year" lines={["The march that shook an empire", "Inside the salt law"]} at={0.2} /></Fit> },
    { name: "FrontPage", does: "a whole newspaper front page", node: <Fit s={0.38}><FrontPage headline="India wins freedom" sub="Midnight session hails a new dawn" image={pic("gandhi.png")} at={0.2} /></Fit> },
  ];
  return <Showcase layer="LAYER 2 · BLOCKS" group="Social, climate, devices" count={items.length} items={items} cols={4} />;
}
