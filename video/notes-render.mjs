// Render the scenes of an exam notes film one by one (video/notes.py calls this).
//   node notes-render.mjs <slug> <comma-separated scene indexes>
// One bundle for all scenes; its public folder is the film's own folder (public/<slug>), so a scene's props point at
// audio/..., sfx/... inside it. Each scene lands in public/<slug>/render/scene<NNN>.mp4; prints "SCENE_DONE <i>" per scene.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [slug, list] = process.argv.slice(2);
const dir = path.join(HERE, "public", slug);
const which = (list || "").split(",").filter(Boolean).map(Number);

// only the Notes composition (src/notes-entry.tsx): every composition's fonts once ran Windows out of connections
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src", "notes-entry.tsx"), publicDir: dir });
for (const i of which) {
  const name = `scene${String(i).padStart(3, "0")}`;
  const inputProps = JSON.parse(fs.readFileSync(path.join(dir, "render", `${name}.json`), "utf8"));
  const composition = await selectComposition({ serveUrl, id: "Notes", inputProps });
  const tmp = path.join(dir, "render", `${name}.tmp.mp4`);
  let last = 0;
  await renderMedia({
    composition, serveUrl, codec: "h264", crf: 18, outputLocation: tmp, inputProps, concurrency: 6,
    onProgress: ({ progress }) => { if (Date.now() - last > 2000) { last = Date.now(); console.log(`PROGRESS ${i} ${Math.round(progress * 100)}`); } },
  });
  fs.renameSync(tmp, path.join(dir, "render", `${name}.mp4`)); // only a finished render ever has the real name
  console.log(`SCENE_DONE ${i}`);
}
fs.rmSync(serveUrl, { recursive: true, force: true }); // the bundle is a copy of the film's folder: never left on C:
