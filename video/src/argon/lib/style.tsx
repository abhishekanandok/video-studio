/* STYLE for the motion library: the same block, the same motion, a different look.

   <Palette colors={{ wall: "#2a2a40", grass: "#7a5" }}>…</Palette>  sets palette colours (lib/palette.ts) for what is
     inside; the film's theme already sets them for every <Stage>.
   <Look kind="paper">…</Look>  draws what is inside in a look, as one SVG filter over its pixels, so it works on every
     block (drawn or a photo) and on a whole scene (`fill`). Without `kind` it takes the film's look (theme.look).
   Looks: flat (as drawn), paper (cut-out with a white edge, fibres and a lifted shadow), sketch (wobbly pencil lines that
   boil, hatching), watercolor (bleeding soft edges, darker rims, paper grain), clay (soft 3D, lit from the top left),
   neon (glowing on dark), chalk (dusty broken strokes), blueprint (white edge lines), comic (flat inks, black outline),
   shaded (gentle light and shadow, film grain), vintage (sepia, grain, faded), print (a two-tone print in the theme's
   ink, accent and paper, mottled), line (ink line-art: outline and inner edges over a paper fill).
   Where each look shows best: paper, clay and comic work at a thing's edges, so wrap each block (a character, a car, a
   chart); sketch, watercolor, shaded and vintage also suit a whole scene (`fill`); neon, chalk and blueprint want a dark
   ground behind them (<Backdrop kind="noir" | "chalkboard" | "blueprint">), with the look round the things on it. */

import type { CSSProperties, ReactNode } from "react";
import { useScene } from "../kit";
import { paletteVars, type PaletteName } from "./palette";

export const LOOKS = ["flat", "paper", "sketch", "watercolor", "clay", "neon", "chalk", "blueprint", "comic", "shaded", "vintage", "print", "line"] as const;
export type LookKind = (typeof LOOKS)[number];

/** palette colours for everything inside (on top of the theme's) */
export function Palette({ colors, children, style }: { colors: Partial<Record<PaletteName, string>>; children: ReactNode; style?: CSSProperties }) {
  const { theme } = useScene();
  return <div style={{ display: "contents", ...paletteVars(theme, colors), ...style }}>{children}</div>;
}

const rgb = (hex: string | undefined, fb: string) => { const n = parseInt((hex ?? fb).replace("#", "").slice(0, 6), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/** one look's SVG filter; `seed` changes the noise (a sketch boils), `a` is the strength; `c` the film's colours (print, line) */
function LookFilter({ id, kind, seed, a, c }: { id: string; kind: LookKind; seed: number; a: number; c: { ink?: string; accent?: string; paper?: string } }) {
  const ink = rgb(c.ink, "#1d1d1d"), acc = rgb(c.accent, "#c8482d"), pap = rgb(c.paper, "#f4efe4");
  const shadow = (src: string, dx = 6, dy = 9, blur = 7, o = 0.3) => <>
    <feGaussianBlur in={src} stdDeviation={blur} result={`${src}-sb`} /><feOffset in={`${src}-sb`} dx={dx} dy={dy} result={`${src}-so`} />
    <feFlood floodColor="#000" floodOpacity={o} /><feComposite in2={`${src}-so`} operator="in" result={`${src}-shadow`} />
  </>;
  const grain = (freq: number, lo: number, result: string) => <>
    <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={3} seed={seed} />
    <feColorMatrix type="saturate" values="0" />
    <feComponentTransfer result={result}><feFuncR type="linear" slope={1 - lo} intercept={lo} /><feFuncG type="linear" slope={1 - lo} intercept={lo} /><feFuncB type="linear" slope={1 - lo} intercept={lo} /></feComponentTransfer>
  </>;
  const body: Record<LookKind, ReactNode> = {
    flat: null,
    // print: the thing becomes a two-tone print in the film's inks (dark -> key ink, mid -> loud ink, light -> paper), mottled
    print: <>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" result="lum" />
      <feComponentTransfer in="lum" result="duo">
        <feFuncR type="table" tableValues={`${ink[0]} ${acc[0]} ${pap[0]}`} /><feFuncG type="table" tableValues={`${ink[1]} ${acc[1]} ${pap[1]}`} />
        <feFuncB type="table" tableValues={`${ink[2]} ${acc[2]} ${pap[2]}`} />
      </feComponentTransfer>
      {grain(0.85, 0.8, "pgrain")}
      <feBlend in="duo" in2="pgrain" mode="multiply" /><feComposite in2="SourceAlpha" operator="in" />
    </>,
    // line: the thing becomes ink line-art: its outline and inner edges in the key ink over a paper fill
    line: <>
      <feMorphology in="SourceAlpha" operator="dilate" radius={2.2 * a} result="grown" />
      <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" result="l" />
      <feConvolveMatrix in="l" order={3} kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="edges" />
      <feColorMatrix in="edges" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5 0 0 0 0" result="inner" />
      <feMerge result="lines"><feMergeNode in="ring" /><feMergeNode in="inner" /></feMerge>
      <feFlood floodColor={c.ink ?? "#1d1d1d"} /><feComposite in2="lines" operator="in" result="inkline" />
      <feFlood floodColor={c.paper ?? "#f4efe4"} /><feComposite in2="SourceAlpha" operator="in" result="fill" />
      <feMerge><feMergeNode in="fill" /><feMergeNode in="inkline" /></feMerge>
    </>,
    paper: <>
      <feMorphology in="SourceAlpha" operator="dilate" radius={5 * a} result="grown" />
      <feFlood floodColor="#fffdf6" /><feComposite in2="grown" operator="in" result="edge" />
      <feMerge result="cut"><feMergeNode in="edge" /><feMergeNode in="SourceGraphic" /></feMerge>
      {grain(0.8, 0.82, "fibre")}
      <feBlend in="cut" in2="fibre" mode="multiply" /><feComposite in2="grown" operator="in" result="tex" />
      {shadow("grown")}
      <feMerge><feMergeNode in="grown-shadow" /><feMergeNode in="tex" /></feMerge>
    </>,
    sketch: <>
      <feTurbulence type="turbulence" baseFrequency={0.035} numOctaves={2} seed={seed} result="wn" />
      <feDisplacementMap in="SourceGraphic" in2="wn" scale={5 * a} xChannelSelector="R" yChannelSelector="G" result="wob" />
      <feColorMatrix in="wob" type="saturate" values="0.35" />
      <feComponentTransfer result="pale"><feFuncR type="linear" slope={0.75} intercept={0.25} /><feFuncG type="linear" slope={0.75} intercept={0.25} /><feFuncB type="linear" slope={0.75} intercept={0.25} /></feComponentTransfer>
      <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves={1} seed={seed + 3} />
      <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.2  0 0 0 0 0.25  -9 0 0 0 2.7" />
      <feComponentTransfer><feFuncA type="linear" slope={0.4} /></feComponentTransfer>
      <feComposite in2="wob" operator="in" result="hatch" />
      <feMorphology in="wob" operator="dilate" radius={1.6 * a} result="thick" />
      <feComposite in="thick" in2="wob" operator="out" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.16  0 0 0 0 0.2  0 0 0 0.9 0" result="line" />
      <feMerge><feMergeNode in="pale" /><feMergeNode in="hatch" /><feMergeNode in="line" /></feMerge>
    </>,
    watercolor: <>
      <feTurbulence type="fractalNoise" baseFrequency={0.02} numOctaves={3} seed={seed} result="wn" />
      <feDisplacementMap in="SourceGraphic" in2="wn" scale={9 * a} xChannelSelector="R" yChannelSelector="G" />
      <feGaussianBlur stdDeviation={1.6 * a} result="soft" />
      <feColorMatrix in="soft" type="saturate" values="0.85" />
      <feComponentTransfer result="wash"><feFuncR type="linear" slope={0.85} intercept={0.12} /><feFuncG type="linear" slope={0.85} intercept={0.12} /><feFuncB type="linear" slope={0.85} intercept={0.12} /><feFuncA type="linear" slope={0.9} /></feComponentTransfer>
      <feMorphology in="soft" operator="erode" radius={3 * a} result="inner" />
      <feComposite in="soft" in2="inner" operator="out" />
      <feColorMatrix type="matrix" values="0.6 0 0 0 0  0 0.6 0 0 0  0 0 0.6 0 0  0 0 0 0.5 0" result="rim" />
      {grain(0.6, 0.78, "grainW")}
      <feMerge result="paint"><feMergeNode in="wash" /><feMergeNode in="rim" /></feMerge>
      <feBlend in="paint" in2="grainW" mode="multiply" /><feComposite in2="soft" operator="in" />
    </>,
    clay: <>
      <feGaussianBlur in="SourceAlpha" stdDeviation={6 * a} result="bump" />
      <feDiffuseLighting in="bump" surfaceScale={5} lightingColor="#fff" result="diff"><feDistantLight azimuth={225} elevation={42} /></feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1={1.15} k2={0} k3={0} k4={0} result="lit" />
      <feSpecularLighting in="bump" surfaceScale={5} specularConstant={0.6} specularExponent={18} lightingColor="#fff" result="spec"><feDistantLight azimuth={225} elevation={50} /></feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="shine" />
      {shadow("SourceAlpha", 8, 12, 9, 0.35)}
      <feMerge><feMergeNode in="SourceAlpha-shadow" /><feMergeNode in="lit" /><feMergeNode in="shine" /></feMerge>
    </>,
    neon: <>
      <feColorMatrix in="SourceGraphic" type="saturate" values="1.8" result="hot" />
      <feGaussianBlur in="hot" stdDeviation={6 * a} result="g1" /><feGaussianBlur in="hot" stdDeviation={18 * a} result="g2" />
      <feMerge><feMergeNode in="g2" /><feMergeNode in="g2" /><feMergeNode in="g1" /><feMergeNode in="hot" /></feMerge>
    </>,
    chalk: <>
      <feTurbulence type="turbulence" baseFrequency={0.03} numOctaves={2} seed={seed} result="wn" />
      <feDisplacementMap in="SourceGraphic" in2="wn" scale={3 * a} xChannelSelector="R" yChannelSelector="G" result="wob" />
      <feColorMatrix in="wob" type="matrix" values="0.1 0.1 0.1 0 0.72  0.1 0.1 0.1 0 0.72  0.1 0.1 0.1 0 0.7  0 0 0 1 0" result="dust" />
      <feTurbulence type="fractalNoise" baseFrequency={1.1} numOctaves={2} seed={seed + 1} />
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.2" result="holes" />
      <feComposite in="dust" in2="holes" operator="in" />
    </>,
    blueprint: <>
      <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="grey" />
      <feConvolveMatrix in="grey" order={3} kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="e1" />
      <feMorphology in="SourceAlpha" operator="dilate" radius={1.5} result="g" /><feComposite in="g" in2="SourceAlpha" operator="out" result="outline" />
      <feColorMatrix in="e1" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.5 2.5 2.5 0 0" result="lines" />
      <feFlood floodColor="#fff" floodOpacity={0.12} /><feComposite in2="SourceAlpha" operator="in" result="wash" />
      <feFlood floodColor="#fff" /><feComposite in2="outline" operator="in" result="edge" />
      <feMerge><feMergeNode in="wash" /><feMergeNode in="lines" /><feMergeNode in="edge" /></feMerge>
    </>,
    comic: <>
      <feColorMatrix in="SourceGraphic" type="saturate" values="1.4" />
      <feComponentTransfer result="poster"><feFuncR type="discrete" tableValues="0 0.35 0.7 1" /><feFuncG type="discrete" tableValues="0 0.35 0.7 1" /><feFuncB type="discrete" tableValues="0 0.35 0.7 1" /></feComponentTransfer>
      <feMorphology in="SourceAlpha" operator="dilate" radius={4 * a} result="ink0" />
      <feFlood floodColor="#111" /><feComposite in2="ink0" operator="in" result="ink" />
      <feMerge><feMergeNode in="ink" /><feMergeNode in="poster" /></feMerge>
    </>,
    shaded: <>
      <feGaussianBlur in="SourceAlpha" stdDeviation={14 * a} result="bump" />
      <feDiffuseLighting in="bump" surfaceScale={3} lightingColor="#fff" result="diff"><feDistantLight azimuth={235} elevation={55} /></feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1={0.55} k2={0.5} k3={0} k4={0} result="lit" />
      {grain(0.9, 0.86, "grainS")}
      <feBlend in="lit" in2="grainS" mode="multiply" /><feComposite in2="SourceAlpha" operator="in" result="tex" />
      {shadow("SourceAlpha", 5, 10, 10, 0.28)}
      <feMerge><feMergeNode in="SourceAlpha-shadow" /><feMergeNode in="tex" /></feMerge>
    </>,
    vintage: <>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0.39 0.77 0.19 0 0.02  0.35 0.69 0.17 0 0.01  0.27 0.53 0.13 0 0  0 0 0 1 0" />
      <feComponentTransfer result="faded"><feFuncR type="linear" slope={0.85} intercept={0.1} /><feFuncG type="linear" slope={0.85} intercept={0.08} /><feFuncB type="linear" slope={0.8} intercept={0.06} /></feComponentTransfer>
      {grain(0.85, 0.7, "grainV")}
      <feBlend in="faded" in2="grainV" mode="multiply" /><feComposite in2="SourceAlpha" operator="in" />
    </>,
  };
  if (kind === "flat") return null;
  return <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">{body[kind]}</filter>;
}

/** draws what is inside in a look; `fill` makes it cover the whole stage (a scene-wide look); `amount` is the strength;
    `boil` (frames) is how often a sketch's lines are redrawn */
export function Look({ kind, amount = 1, fill = false, boil = 4, children, style }: { kind?: LookKind; amount?: number; fill?: boolean; boil?: number; children: ReactNode; style?: CSSProperties }) {
  const { theme, frame } = useScene();
  const k: LookKind = kind ?? ((LOOKS as readonly string[]).includes(theme.look ?? "") ? (theme.look as LookKind) : "flat");
  const seed = k === "sketch" || k === "chalk" ? Math.floor(frame / Math.max(1, boil)) % 12 : 3;
  const id = `look-${k}-${seed}-${Math.round(amount * 10)}-${(theme.ink ?? "").slice(1)}${(theme.accent ?? "").slice(1)}`;
  const box: CSSProperties = fill ? { position: "absolute", inset: 0 } : { position: "relative", display: "inline-block" };
  if (k === "flat") return <div style={{ ...box, ...style }}>{children}</div>;
  return (
    <div style={{ ...box, filter: `url(#${id})`, ...style }}>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden><defs><LookFilter id={id} kind={k} seed={seed} a={amount} c={{ ink: theme.ink, accent: theme.accent, paper: theme.bg?.[0] }} /></defs></svg>
      {children}
    </div>
  );
}
