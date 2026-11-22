// Bundles the library gallery (src/gallery/gallery.tsx) into frontend/public/library/gallery.{js,html}, the page the
// app's /app/library shows in an iframe. Run it after adding to the library:   node gallery-build.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "frontend", "public", "library");
fs.mkdirSync(OUT, { recursive: true });
// the gallery, and the look studio's live preview (src/gallery/specimen.tsx, the Plan page's step 2)
for (const [name, title] of [["gallery", "Library gallery"], ["specimen", "Look preview"]]) {
  await build({
    entryPoints: [path.join(HERE, "src", "gallery", `${name}.tsx`)], bundle: true, minify: true, format: "esm", target: "es2020",
    outfile: path.join(OUT, `${name}.js`), jsx: "automatic", loader: { ".json": "json" }, logLevel: "warning",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  fs.writeFileSync(path.join(OUT, `${name}.html`), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>html,body{margin:0;background:transparent}*{box-sizing:border-box}</style></head>
<body><div id="root"></div><script type="module" src="/library/${name}.js?v=${Date.now()}"></script></body></html>`);
  console.log(`${name}.js ${(fs.statSync(path.join(OUT, `${name}.js`)).size / 1e6).toFixed(1)} MB`);
}
