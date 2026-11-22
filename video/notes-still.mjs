// Render single frames of exam notes scenes, for the animation check (video/notes.py check_visuals).
//   node notes-still.mjs <slug> <scene:frame:name,...>   ->  public/<slug>/render/check<NNN>-<name>.png
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [slug, spec] = process.argv.slice(2);
const dir = path.join(HERE, "public", slug);
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src", "index.ts"), publicDir: dir });
// the bundle is a full copy of public/ (gigabytes) in the temp folder: delete it however this script ends
process.on("exit", () => fs.rmSync(serveUrl, { recursive: true, force: true }));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(1));
for (const item of (spec || "").split(",").filter(Boolean)) {
  const [i, frame, name] = item.split(":");
  const n = String(i).padStart(3, "0");
  const inputProps = JSON.parse(fs.readFileSync(path.join(dir, "render", `scene${n}.json`), "utf8"));
  const composition = await selectComposition({ serveUrl, id: "Notes", inputProps });
  const f = Math.min(Number(frame), composition.durationInFrames - 1);
  await renderStill({ composition, serveUrl, inputProps, frame: f, output: path.join(dir, "render", `check${n}-${name}.png`) });
  console.log(`STILL ${i} ${name}`);
}
