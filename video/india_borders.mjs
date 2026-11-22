// Writes src/argon/lib/data/india-borders.json (and -50m.json for the 50m map): India's complete official outline for
// the world map.
//
// The world map (world-atlas, Natural Earth) draws India's de facto borders: Gilgit-Baltistan, PoK and Siachen inside
// Pakistan, Aksai Chin inside China. Our India state map (src/notes/data/india.json) has the complete outline. This
// script makes India = its world-map shape + that outline, and cuts the outline out of Pakistan and China, so every
// map block (MapBase, Choropleth, SpreadMap, LiftCountry, RaisedMap…) and the notes films' Geography look show the whole
// of India.
//
//   npm i --no-save polygon-clipping@0.15.7 && node india_borders.mjs     (run again only if the source data changes)

import fs from "node:fs";
import { createRequire } from "node:module";
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";
import pc from "polygon-clipping";

const require = createRequire(import.meta.url);
const india = require("./src/notes/data/india.json");

const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
// the complete outline: the union of every state and union territory
const states = india.features.filter((f) => f.properties.kind === "state");
const outline = pc.union(...states.map((f) => polys(f.geometry)));

const round = (mp) => mp.map((poly) => poly.map((ring) => {
  const out = [];
  for (const [x, y] of ring) { const p = [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]; const q = out[out.length - 1]; if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p); }
  return out;
}).filter((r) => r.length >= 4));
// d3 wants each polygon to cover less than half the globe: reverse any ring that comes out inverted
const orient = (mp) => mp.map((poly) => poly.map((ring, i) => {
  const a = geoArea({ type: "Polygon", coordinates: [ring] });
  const inverted = a > 2 * Math.PI;
  return (i === 0 ? inverted : !inverted) ? ring.slice().reverse() : ring;
}));
const geom = (mp) => ({ type: "MultiPolygon", coordinates: orient(round(mp)) });

fs.mkdirSync("src/argon/lib/data", { recursive: true });
for (const [res, file] of [["110m", "india-borders.json"], ["50m", "india-borders-50m.json"]]) {
  const world = require(`world-atlas/countries-${res}.json`);
  const countries = feature(world, world.objects.countries).features;
  const get = (name) => countries.find((f) => f.properties.name === name);
  const out = {
    India: geom(pc.union(polys(get("India").geometry), outline)),
    Pakistan: geom(pc.difference(polys(get("Pakistan").geometry), outline)),
    China: geom(pc.difference(polys(get("China").geometry), outline)),
  };
  for (const [k, g] of Object.entries(out)) {
    const area = geoArea(g);
    if (area > 0.5) throw new Error(`${res} ${k} came out inverted (area ${area})`);
    console.log(res.padEnd(5), k.padEnd(9), "polygons", g.coordinates.length, "points", g.coordinates.flat(2).length, "area (sr)", area.toFixed(4));
  }
  fs.writeFileSync(`src/argon/lib/data/${file}`, JSON.stringify(out));
  console.log("wrote", file, fs.statSync(`src/argon/lib/data/${file}`).size, "bytes");
}
