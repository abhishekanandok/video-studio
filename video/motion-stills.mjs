// One still per designed shot of a Motion film, so the motion director can look at what it designed and fix it.
//   node motion-stills.mjs public/<slug>/motion.json <out-dir> [line,line,...]
// Each still is taken late in its shot (when everything has arrived), at half size. Bundles once, renders them all.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [propsPath, outDir, only] = process.argv.slice(2);
const props = JSON.parse(fs.readFileSync(path.resolve(HERE, propsPath), "utf8"));
const want = only ? new Set(only.split(",").map(Number)) : null;
fs.mkdirSync(outDir, { recursive: true });

const FPS = 30;
const frames = (l) => Math.max(8, Math.round(((l.audio ? l.seconds / (props.speed || 1) : l.seconds) + (l.pause ?? 0.3)) * FPS));
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src", "index.ts"), publicDir: path.join(HERE, "public") });
// the bundle is a full copy of public/ (gigabytes) in the temp folder: delete it however this script ends
process.on("exit", () => fs.rmSync(serveUrl, { recursive: true, force: true }));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(1));
const id = props.vertical ? "MotionVertical" : "Motion";
const composition = await selectComposition({ serveUrl, id, inputProps: props });
let at = 0;
const jobs = [];
props.lines.forEach((l, i) => {
  const dur = frames(l), n = Math.max(1, l.scenes.length);
  l.scenes.forEach((_, j) => {
    const s0 = Math.round((j * dur) / n), s1 = Math.round(((j + 1) * dur) / n);
    if (!want || want.has(i)) jobs.push({ i, j, frame: at + s0 + Math.round((s1 - s0) * 0.85) });
  });
  at += dur;
});
for (const { i, j, frame } of jobs) {
  const output = path.join(outDir, `${i}-${j}.png`);
  await renderStill({ composition, serveUrl, output, inputProps: props, frame: Math.min(frame, composition.durationInFrames - 1), scale: 0.5 });
  console.log("STILL", i, j);
}
