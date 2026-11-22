// The library page's clips (frontend /app/motion/library): every page of the zoo test sheet (src/print/zoo-test.tsx:
// creatures, moves, robots, cards, motions) in the first LOOKS looks of bridge-test.json, as short looping clips with
// a poster, plus library.json: every motion id, card design and creature kind, read from the code.
//   node library-preview.mjs [looks=3]          run it after adding to src/argon/lib/{motion-d,cards,creatures}.tsx
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "frontend", "public", "library");
const PAGES = ["creatures", "moves", "robots", "cards", "motions"], SPAN = 300;
const LOOKS = JSON.parse(fs.readFileSync(path.join(HERE, "src", "print", "bridge-test.json"), "utf8")).slice(0, Number(process.argv[2] ?? 3));
fs.mkdirSync(OUT, { recursive: true });

// the lists, from the code itself (bundled with esbuild, run with node)
const lib = path.join(HERE, "src", "argon", "lib"), probe = path.join(OUT, ".probe.ts"), cjs = path.join(OUT, ".probe.cjs");
fs.writeFileSync(probe, `import { MOTION_IDS } from "${lib}/motion-d"; import { CARD_IDS, CARD_SHAPES, CARD_FRAMES, CARD_FILLS, CARD_HEADS } from "${lib}/cards";
import { CREATURE_KINDS, CREATURE_MOVES } from "${lib}/creatures";
console.log(JSON.stringify({ motions: MOTION_IDS, cards: CARD_IDS, card_parts: { shapes: CARD_SHAPES, frames: CARD_FRAMES, fills: CARD_FILLS, heads: CARD_HEADS }, creatures: CREATURE_KINDS, moves: CREATURE_MOVES,
  robot_actions: ["idle", "wave", "walk", "think", "type", "point", "celebrate", "scan"], arm_actions: ["pick", "wave", "weld", "sort"] }));`);
execFileSync(path.join(HERE, "node_modules", ".bin", "esbuild"), [probe, "--bundle", "--platform=node", "--jsx=automatic", "--log-level=error", `--outfile=${cjs}`]);
const lists = JSON.parse(execFileSync("node", [cjs], { encoding: "utf8" }));
fs.rmSync(probe); fs.rmSync(cjs);

const serveUrl = await bundle({ entryPoint: path.join(HERE, "src", "print", "zoo-test.tsx"), publicDir: path.join(HERE, "public") });
const composition = await selectComposition({ serveUrl, id: "Zoo", inputProps: {} });
const clips = [];
const write = () => fs.writeFileSync(path.join(OUT, "library.json"), JSON.stringify({ clips, ...lists }));
for (let i = 0; i < LOOKS.length; i++) {
  for (let p = 0; p < PAGES.length; p++) {
    const start = (i * PAGES.length + p) * SPAN, name = `${LOOKS[i].family}-${PAGES[p]}`;
    await renderMedia({ composition, serveUrl, codec: "h264", crf: 26, scale: 0.5, frameRange: [start, start + SPAN - 1], outputLocation: path.join(OUT, `${name}.mp4`), inputProps: {} });
    await renderStill({ composition, serveUrl, frame: start + 150, output: path.join(OUT, `${name}.jpg`), imageFormat: "jpeg", jpegQuality: 80, scale: 0.5, inputProps: {} });
    clips.push({ look: LOOKS[i].family, lib: LOOKS[i].lib, page: PAGES[p], clip: `/library/${name}.mp4`, poster: `/library/${name}.jpg` });
    write();  // after every clip, so the page shows what is ready while the rest render
    console.log(name);
  }
}
console.log(`library.json: ${lists.motions.length} motions, ${lists.cards.length} cards, ${lists.creatures.length} creatures, ${clips.length} clips`);
