// Render many single frames of Notes scenes in one browser (video/audiofilm.py fast export).
//   node notes-stills.mjs <slug> <spec.json>
//   spec = [{ "props": "render/fast/scene003.json", "scene": 3, "frame": 41, "out": "render/fast/s003-01.png" }, ...]
// Paths are inside public/<slug>; prints "STILL <n>" after each frame.
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [slug, specPath] = process.argv.slice(2);
const dir = path.join(HERE, "public", slug);
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src", "notes-entry.tsx"), publicDir: dir });
const browser = await openBrowser("chrome");
const comps = new Map();
let n = 0;
for (const item of spec) {
  const inputProps = JSON.parse(fs.readFileSync(path.join(dir, item.props), "utf8"));
  // one composition per props file (not per scene number): two prop sets of one scene, e.g. a skill's slide and its
  // picture break, must not share the first one's resolved props
  if (!comps.has(item.props)) comps.set(item.props, await selectComposition({ serveUrl, id: "Notes", inputProps, puppeteerInstance: browser }));
  const composition = comps.get(item.props);
  const out = path.isAbsolute(item.out) ? item.out : path.join(dir, item.out);  // the fast export keeps its stills on D:
  const propsAt = fs.statSync(path.join(dir, item.props)).mtimeMs;
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs > propsAt) {  // a retry resumes: stills made from these props are kept
    console.log(`STILL ${++n}`);
    continue;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await renderStill({ composition, serveUrl, inputProps, frame: Math.min(item.frame, composition.durationInFrames - 1), output: out,
                      puppeteerInstance: browser });
  console.log(`STILL ${++n}`);
}
await browser.close({ silent: true });
// the bundle is a full copy of the film's folder in %TEMP%: left behind, 76 of them filled C: (2026-10-06)
fs.rmSync(serveUrl, { recursive: true, force: true });
