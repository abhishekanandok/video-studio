// Stills of a film for the frame check (video/oneshot.py frame_rounds): bundles the film's entry once, renders every
// asked frame small, so the checker can see each scene empty (its first frame) and settled (late in the scene).
// It also writes geom.json: for each still, what the scene measured as still wrong (src/argon/place.tsx, inputProps
// { geom: true }): text over text, text cut by the frame, a label pointing at a name that is not in the scene.
//   node framecheck.mjs <entry.ts> <out-dir> <name:frame,name:frame,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [entry, outDir, list, scale = "0.25"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve(HERE, entry), publicDir: path.join(HERE, "public") });
// the bundle is a full copy of public/ (gigabytes) in the temp folder: delete it however this script ends
process.on("exit", () => fs.rmSync(serveUrl, { recursive: true, force: true }));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(1));
const inputProps = { geom: true };
const composition = await selectComposition({ serveUrl, id: "OneShot", inputProps });
const geom = {};
for (const job of list.split(",")) {
  const [name, frame] = job.split(":");
  const seen = [];
  await renderStill({ composition, serveUrl, frame: Math.min(Number(frame), composition.durationInFrames - 1), output: path.join(outDir, `${name}.jpg`),
    imageFormat: "jpeg", jpegQuality: 80, scale: Number(scale), inputProps,
    onBrowserLog: (log) => { const t = log.text ?? ""; if (t.startsWith("__GEOM__")) try { seen.push(JSON.parse(t.slice(8))); } catch {} } });
  geom[name] = [...new Set(seen.flatMap((g) => g.problems))];
  console.log(name);
}
fs.writeFileSync(path.join(outDir, "geom.json"), JSON.stringify(geom, null, 1));
