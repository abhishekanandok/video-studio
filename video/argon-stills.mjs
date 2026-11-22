// Stills of an Argon film's scenes, so the agent can look at what it wrote (video/argon.py).
//   node argon-stills.mjs <entry.ts> <jobs.json> <out-dir>      jobs: [{ id: "Scene0", frames: [..], prefix: "00", scale?: 0.5 }]
// Bundles once; a scene that fails to render is reported and skipped, never stops the others.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [entry, jobsPath, outDir] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve(entry), publicDir: path.join(HERE, "public") });
// the bundle is a full copy of public/ (gigabytes) in the temp folder: delete it however this script ends
process.on("exit", () => fs.rmSync(serveUrl, { recursive: true, force: true }));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(1));
for (const job of jobs) {
  try {
    const composition = await selectComposition({ serveUrl, id: job.id, inputProps: {} });
    for (const [k, frame] of job.frames.entries()) {
      const output = path.join(outDir, `${job.prefix}-${k}.png`);
      await renderStill({ composition, serveUrl, output, frame: Math.min(frame, composition.durationInFrames - 1), scale: job.scale ?? 0.5 });
    }
    console.log("STILL", job.id);
  } catch (e) {
    console.log("FAILED", job.id, String(e).slice(0, 300));
  }
}
