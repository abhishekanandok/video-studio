// Render Drishya's landing-page films into the frontend: the hero loop and the nine Supercharge reels.
//   node landing-render.mjs            (everything)    node landing-render.mjs hero    node landing-render.mjs reels
// Pictures come from frontend/public/landing (the bundle's public folder); films land there as hero.mp4, reel-<kind>.mp4.
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "frontend", "public", "landing");
const what = process.argv[2] || "all";
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src", "landing", "index.tsx"), publicDir: OUT });

async function film(id, file, inputProps = {}, crf = 18, scale = 1) {
  const composition = await selectComposition({ serveUrl, id, inputProps });
  const tmp = path.join(OUT, file + ".tmp.mp4");
  await renderMedia({ composition, serveUrl, codec: "h264", crf, outputLocation: tmp, inputProps, concurrency: 8, muted: true, x264Preset: "slow", scale, pixelFormat: "yuv420p" });
  fs.renameSync(tmp, path.join(OUT, file));
  console.log("DONE", file, Math.round(fs.statSync(path.join(OUT, file)).size / 1024), "KB");
}

if (what === "flow") { // the product flow film, for review (lands in video/out)
  const composition = await selectComposition({ serveUrl, id: "Flow", inputProps: {} });
  const out = path.join(HERE, "out", "drishya-flow-preview.mp4");
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 18, outputLocation: out, concurrency: 8, muted: true, x264Preset: "slow", pixelFormat: "yuv420p" });
  console.log("DONE", out, Math.round(fs.statSync(out).size / 1024), "KB");
}
if (what === "all" || what === "hero") {
  await film("Hero", "hero.mp4", {}, 20, 4 / 3); // 2560x1280, 60 fps
  const c = await selectComposition({ serveUrl, id: "Hero", inputProps: {} });
  await renderStill({ composition: c, serveUrl, output: path.join(OUT, "hero.jpg"), frame: 560, imageFormat: "jpeg", jpegQuality: 85, scale: 4 / 3 });
}
if (what === "all" || what === "reels" || what.startsWith("reel:")) {
  const kinds = what.startsWith("reel:") ? [what.slice(5)] : ["script", "plan", "captions", "cleancut", "storyboard", "shorts", "exam", "thumbs", "analytics"];
  for (const kind of kinds) await film("Reel", `reel-${kind}.mp4`, { kind }, 20, 1.5); // 1080x1620, 60 fps
}
fs.rmSync(serveUrl, { recursive: true, force: true });
