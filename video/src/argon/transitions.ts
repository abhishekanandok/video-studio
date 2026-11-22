/* Every way a scene can arrive over the one before: the transition catalogue (100), shared by the film engine
   (film.tsx Transition) and the app's transition picker (frontend/lib/transitions.ts is a copy, written by
   video/transitions-sync.mjs: edit this file, then run `node transitions-sync.mjs` in video/).
   Pure data and arithmetic, no imports, so both sides can use it. The first eight ids are the original transitions and
   keep their exact look (looks.py TRANSITIONS, storyboard cards). */

export type TStyle = Record<string, string | number>;
export type TransitionDef = { id: string; name: string; family: string; frames: number };

const NORMAL = 12, FAST = 8, SLOW = 20;  // frames at 30 fps
type Dir = "right" | "left" | "top" | "bottom";
const DIRS: Dir[] = ["right", "left", "top", "bottom"];
const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const out3 = (k: number) => 1 - Math.pow(1 - clamp(k), 3);
const inOut = (k: number) => { const x = clamp(k); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (k: number) => { const x = clamp(k), c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };  // overshoots, then settles
const from = (d: Dir, amount: number): string => d === "right" ? `translateX(${amount}%)` : d === "left" ? `translateX(${-amount}%)` : d === "top" ? `translateY(${-amount}%)` : `translateY(${amount}%)`;
const mask = (m: string): TStyle => ({ WebkitMaskImage: m, maskImage: m });

/** one family: how it looks at eased progress e (0 = just starting, 1 = arrived) for one variant */
type Fam = { family: string; ease: (k: number) => number; variants: { id: string; name: string; frames: number; style: (e: number) => TStyle }[] };
const F: Fam[] = [];
const add = (family: string, ease: (k: number) => number, variants: Fam["variants"]) => F.push({ family, ease, variants });

/* ---------- the eight originals, unchanged ---------- */
add("Classic", out3, [
  { id: "cut", name: "Cut", frames: 1, style: () => ({}) },
  { id: "fade", name: "Fade", frames: NORMAL, style: (e) => ({ opacity: e }) },
  { id: "slide", name: "Slide in from the right", frames: NORMAL, style: (e) => ({ transform: from("right", (1 - e) * 100) }) },
  { id: "zoom", name: "Zoom in", frames: NORMAL, style: (e) => ({ transform: `scale(${1.25 - 0.25 * e})`, opacity: e }) },
  { id: "wipe", name: "Wipe from the left", frames: NORMAL, style: (e) => ({ clipPath: `inset(0 ${(1 - e) * 100}% 0 0)` }) },
  { id: "page", name: "Page turn", frames: NORMAL, style: (e) => ({ transformOrigin: "0% 50%", transform: `perspective(2400px) rotateY(${(1 - e) * -75}deg)`, opacity: Math.min(1, e * 2) }) },
  { id: "fold", name: "Unfold from the top", frames: NORMAL, style: (e) => ({ transformOrigin: "50% 0%", transform: `perspective(2400px) rotateX(${(1 - e) * 80}deg)` }) },
  { id: "rise", name: "Rise from the floor", frames: NORMAL, style: (e) => ({ transformOrigin: "50% 100%", transform: `perspective(2400px) rotateX(${(1 - e) * -80}deg)` }) },
]);

/* ---------- fades, slides, pushes ---------- */
add("Fade", out3, [
  { id: "fade-slow", name: "Slow fade", frames: SLOW, style: (e) => ({ opacity: e }) },
  { id: "fade-fast", name: "Quick fade", frames: FAST, style: (e) => ({ opacity: e }) },
]);
add("Slide", out3, [
  ...DIRS.filter((d) => d !== "right").map((d) => ({ id: `slide-from-${d}`, name: `Slide in from the ${d}`, frames: NORMAL, style: (e: number) => ({ transform: from(d, (1 - e) * 100) }) })),
  ...DIRS.map((d) => ({ id: `slide-from-${d}-fast`, name: `Fast slide from the ${d}`, frames: FAST, style: (e: number) => ({ transform: from(d, (1 - e) * 100) }) })),
]);
add("Soft push", out3, DIRS.map((d) => ({ id: `soft-from-${d}`, name: `Soft drift from the ${d}`, frames: NORMAL, style: (e: number) => ({ transform: from(d, (1 - e) * 18), opacity: e }) })));

/* ---------- wipes: straight, diagonal, iris, box, split, blinds, clock ---------- */
const insetFrom = (d: Dir, r: number) => d === "left" ? `inset(0 ${r}% 0 0)` : d === "right" ? `inset(0 0 0 ${r}%)` : d === "top" ? `inset(0 0 ${r}% 0)` : `inset(${r}% 0 0 0)`;
add("Wipe", out3, [
  ...(["right", "top", "bottom"] as Dir[]).map((d) => ({ id: `wipe-from-${d}`, name: `Wipe from the ${d}`, frames: NORMAL, style: (e: number) => ({ clipPath: insetFrom(d, (1 - e) * 100) }) })),
  ...DIRS.map((d) => ({ id: `wipe-from-${d}-slow`, name: `Slow wipe from the ${d}`, frames: SLOW, style: (e: number) => ({ clipPath: insetFrom(d, (1 - e) * 100) }) })),
]);
add("Diagonal wipe", inOut, CORNERS.map((c) => ({ id: `diagonal-from-${c}`, name: `Diagonal wipe from the ${c.replace("-", " ")}`, frames: NORMAL, style: (e: number) => {
  const r = e * 200, [x0, y0] = [c.includes("left") ? 0 : 100, c.includes("top") ? 0 : 100], sx = x0 ? -1 : 1, sy = y0 ? -1 : 1;
  return { clipPath: `polygon(${x0}% ${y0}%, ${x0 + sx * r}% ${y0}%, ${x0}% ${y0 + sy * r}%)` }; } })));
const irisAt = (p: string) => p === "center" ? "50% 50%" : `${p.includes("left") ? "0%" : "100%"} ${p.includes("top") ? "0%" : "100%"}`;
add("Iris", out3, [
  { id: "iris", name: "Iris open", frames: NORMAL, style: (e) => ({ clipPath: `circle(${e * 75}% at 50% 50%)` }) },
  { id: "iris-slow", name: "Slow iris open", frames: SLOW, style: (e) => ({ clipPath: `circle(${e * 75}% at 50% 50%)` }) },
  ...CORNERS.map((c) => ({ id: `iris-from-${c}`, name: `Iris from the ${c.replace("-", " ")}`, frames: NORMAL, style: (e: number) => ({ clipPath: `circle(${e * 145}% at ${irisAt(c)})` }) })),
  { id: "iris-diamond", name: "Diamond open", frames: NORMAL, style: (e) => { const r = e * 100; return { clipPath: `polygon(50% ${50 - r}%, ${50 + r}% 50%, 50% ${50 + r}%, ${50 - r}% 50%)` }; } },
]);
add("Box", out3, [
  { id: "box", name: "Box open", frames: NORMAL, style: (e) => { const r = (1 - e) * 50; return { clipPath: `inset(${r}% ${r}% ${r}% ${r}%)` }; } },
  { id: "box-slow", name: "Slow box open", frames: SLOW, style: (e) => { const r = (1 - e) * 50; return { clipPath: `inset(${r}% ${r}% ${r}% ${r}%)` }; } },
]);
add("Split", inOut, [
  { id: "split-vertical", name: "Barn doors (side to side)", frames: NORMAL, style: (e) => ({ clipPath: `inset(0 ${(1 - e) * 50}% 0 ${(1 - e) * 50}%)` }) },
  { id: "split-horizontal", name: "Barn doors (top and bottom)", frames: NORMAL, style: (e) => ({ clipPath: `inset(${(1 - e) * 50}% 0 ${(1 - e) * 50}% 0)` }) },
  { id: "split-vertical-slow", name: "Slow barn doors (side to side)", frames: SLOW, style: (e) => ({ clipPath: `inset(0 ${(1 - e) * 50}% 0 ${(1 - e) * 50}%)` }) },
  { id: "split-horizontal-slow", name: "Slow barn doors (top and bottom)", frames: SLOW, style: (e) => ({ clipPath: `inset(${(1 - e) * 50}% 0 ${(1 - e) * 50}% 0)` }) },
]);
const blinds = (angle: number, n: number) => (e: number) => { const w = 100 / n; return mask(`repeating-linear-gradient(${angle}deg, #000 0 ${e * w}%, transparent ${e * w}% ${w}%)`); };
add("Blinds", out3, [
  { id: "blinds-vertical", name: "Vertical blinds", frames: NORMAL, style: blinds(90, 8) },
  { id: "blinds-horizontal", name: "Horizontal blinds", frames: NORMAL, style: blinds(180, 6) },
  { id: "blinds-vertical-fine", name: "Fine vertical blinds", frames: NORMAL, style: blinds(90, 16) },
  { id: "blinds-horizontal-fine", name: "Fine horizontal blinds", frames: NORMAL, style: blinds(180, 12) },
]);
const clock = (ccw: boolean) => (e: number) => { const a = e * 360; return mask(ccw ? `conic-gradient(from 0deg, transparent 0 ${360 - a}deg, #000 ${360 - a}deg 360deg)` : `conic-gradient(from 0deg, #000 0 ${a}deg, transparent ${a}deg 360deg)`); };
add("Clock", (k) => clamp(k), [
  { id: "clock", name: "Clock wipe", frames: NORMAL, style: clock(false) },
  { id: "clock-ccw", name: "Clock wipe, anticlockwise", frames: NORMAL, style: clock(true) },
  { id: "clock-fast", name: "Fast clock wipe", frames: FAST, style: clock(false) },
  { id: "clock-ccw-fast", name: "Fast clock wipe, anticlockwise", frames: FAST, style: clock(true) },
]);

/* ---------- zooms, blurs, whips ---------- */
add("Zoom", out3, [
  { id: "zoom-deep", name: "Deep zoom in", frames: NORMAL, style: (e) => ({ transform: `scale(${2 - e})`, opacity: e }) },
  { id: "zoom-out", name: "Zoom out", frames: NORMAL, style: (e) => ({ transform: `scale(${0.8 + 0.2 * e})`, opacity: e }) },
  { id: "zoom-out-deep", name: "Deep zoom out", frames: NORMAL, style: (e) => ({ transform: `scale(${0.5 + 0.5 * e})`, opacity: e }) },
  { id: "zoom-fast", name: "Punch zoom", frames: FAST, style: (e) => ({ transform: `scale(${1.25 - 0.25 * e})`, opacity: e }) },
  { id: "zoom-blur", name: "Zoom through a blur", frames: NORMAL, style: (e) => ({ transform: `scale(${1.15 - 0.15 * e})`, filter: `blur(${(1 - e) * 16}px)`, opacity: e }) },
  { id: "zoom-through", name: "Dive through", frames: 14, style: (e) => ({ transform: `scale(${1.7 - 0.7 * e})`, filter: `blur(${(1 - e) * 10}px)`, opacity: Math.min(1, e * 1.6) }) },
]);
add("Blur", out3, [
  { id: "blur-in", name: "Blur in", frames: NORMAL, style: (e) => ({ filter: `blur(${(1 - e) * 24}px)`, opacity: e }) },
  { id: "blur-in-slow", name: "Slow blur in", frames: SLOW, style: (e) => ({ filter: `blur(${(1 - e) * 24}px)`, opacity: e }) },
]);
add("Whip", inOut, DIRS.map((d) => ({ id: `whip-from-${d}`, name: `Whip pan from the ${d}`, frames: 10, style: (e: number) => ({ transform: from(d, (1 - e) * 75), filter: `blur(${(1 - e) * 26}px)` }) })));

/* ---------- turns in space: page, fold, rise, flip, spin, tilt ---------- */
add("Page", out3, [
  { id: "page-from-right", name: "Page turn from the right", frames: NORMAL, style: (e) => ({ transformOrigin: "100% 50%", transform: `perspective(2400px) rotateY(${(1 - e) * 75}deg)`, opacity: Math.min(1, e * 2) }) },
  { id: "page-slow", name: "Slow page turn", frames: SLOW, style: (e) => ({ transformOrigin: "0% 50%", transform: `perspective(2400px) rotateY(${(1 - e) * -75}deg)`, opacity: Math.min(1, e * 2) }) },
  { id: "page-from-right-slow", name: "Slow page turn from the right", frames: SLOW, style: (e) => ({ transformOrigin: "100% 50%", transform: `perspective(2400px) rotateY(${(1 - e) * 75}deg)`, opacity: Math.min(1, e * 2) }) },
  { id: "fold-slow", name: "Slow unfold from the top", frames: SLOW, style: (e) => ({ transformOrigin: "50% 0%", transform: `perspective(2400px) rotateX(${(1 - e) * 80}deg)` }) },
  { id: "rise-slow", name: "Slow rise from the floor", frames: SLOW, style: (e) => ({ transformOrigin: "50% 100%", transform: `perspective(2400px) rotateX(${(1 - e) * -80}deg)` }) },
]);
add("Flip", out3, [
  { id: "flip-x", name: "Flip (left to right)", frames: NORMAL, style: (e) => ({ transform: `perspective(2400px) rotateY(${(1 - e) * 90}deg)`, opacity: e > 0.05 ? 1 : 0 }) },
  { id: "flip-y", name: "Flip (top to bottom)", frames: NORMAL, style: (e) => ({ transform: `perspective(2400px) rotateX(${(1 - e) * 90}deg)`, opacity: e > 0.05 ? 1 : 0 }) },
  { id: "flip-x-slow", name: "Slow flip (left to right)", frames: SLOW, style: (e) => ({ transform: `perspective(2400px) rotateY(${(1 - e) * 90}deg)`, opacity: e > 0.05 ? 1 : 0 }) },
  { id: "flip-y-slow", name: "Slow flip (top to bottom)", frames: SLOW, style: (e) => ({ transform: `perspective(2400px) rotateX(${(1 - e) * 90}deg)`, opacity: e > 0.05 ? 1 : 0 }) },
]);
add("Spin", out3, [
  { id: "spin-in", name: "Spin in", frames: NORMAL, style: (e) => ({ transform: `rotate(${(1 - e) * -20}deg) scale(${0.7 + 0.3 * e})`, opacity: e }) },
  { id: "spin-in-ccw", name: "Spin in, anticlockwise", frames: NORMAL, style: (e) => ({ transform: `rotate(${(1 - e) * 20}deg) scale(${0.7 + 0.3 * e})`, opacity: e }) },
  { id: "spin-in-fast", name: "Fast spin in", frames: FAST, style: (e) => ({ transform: `rotate(${(1 - e) * -20}deg) scale(${0.7 + 0.3 * e})`, opacity: e }) },
  { id: "spin-in-ccw-fast", name: "Fast spin in, anticlockwise", frames: FAST, style: (e) => ({ transform: `rotate(${(1 - e) * 20}deg) scale(${0.7 + 0.3 * e})`, opacity: e }) },
]);
add("Tilt", out3, [
  { id: "tilt-up", name: "Tilt up into place", frames: NORMAL, style: (e) => ({ transformOrigin: "50% 100%", transform: `perspective(2400px) rotateX(${(1 - e) * 25}deg) translateY(${(1 - e) * 10}%)`, opacity: e }) },
  { id: "tilt-down", name: "Tilt down into place", frames: NORMAL, style: (e) => ({ transformOrigin: "50% 0%", transform: `perspective(2400px) rotateX(${(1 - e) * -25}deg) translateY(${(1 - e) * -10}%)`, opacity: e }) },
]);

/* ---------- bouncy, stretchy, skewed ---------- */
add("Drop and pop", back, [
  { id: "drop", name: "Drop in", frames: NORMAL, style: (e) => ({ transform: `translateY(${(1 - e) * -100}%)` }) },
  { id: "drop-slow", name: "Slow drop in", frames: SLOW, style: (e) => ({ transform: `translateY(${(1 - e) * -100}%)` }) },
  { id: "pop", name: "Pop in", frames: NORMAL, style: (e) => ({ transform: `scale(${0.6 + 0.4 * e})`, opacity: clamp(e * 3) }) },
  { id: "pop-big", name: "Big pop in", frames: NORMAL, style: (e) => ({ transform: `scale(${0.2 + 0.8 * e})`, opacity: clamp(e * 3) }) },
]);
add("Stretch", out3, [
  { id: "stretch-x", name: "Stretch open sideways", frames: NORMAL, style: (e) => ({ transform: `scaleX(${Math.max(0.001, e)})` }) },
  { id: "stretch-y", name: "Stretch open upwards", frames: NORMAL, style: (e) => ({ transform: `scaleY(${Math.max(0.001, e)})` }) },
  { id: "stretch-from-left", name: "Stretch from the left edge", frames: NORMAL, style: (e) => ({ transformOrigin: "0% 50%", transform: `scaleX(${Math.max(0.001, e)})` }) },
  { id: "stretch-from-top", name: "Stretch from the top edge", frames: NORMAL, style: (e) => ({ transformOrigin: "50% 0%", transform: `scaleY(${Math.max(0.001, e)})` }) },
]);
add("Skew", out3, DIRS.map((d) => ({ id: `skew-from-${d}`, name: `Skewed slide from the ${d}`, frames: NORMAL, style: (e: number) => ({ transform: `${from(d, (1 - e) * 100)} ${d === "left" || d === "right" ? "skewX" : "skewY"}(${(1 - e) * (d === "right" || d === "bottom" ? -20 : 20)}deg)` }) })));
add("Dolly", out3, (["right", "left"] as Dir[]).map((d) => ({ id: `dolly-from-${d}`, name: `Dolly in from the ${d}`, frames: NORMAL, style: (e: number) => ({ transform: `${from(d, (1 - e) * 40)} scale(${1.2 - 0.2 * e})`, opacity: e }) })));

/* ---------- light and texture ---------- */
add("Light", out3, [
  { id: "flash-white", name: "Flash of light", frames: NORMAL, style: (e) => ({ filter: `brightness(${3 - 2 * e})` }) },
  { id: "flash-dark", name: "Rise from black", frames: NORMAL, style: (e) => ({ filter: `brightness(${e})` }) },
  { id: "ken-in", name: "Slow push in", frames: SLOW, style: (e) => ({ transform: `scale(${1.12 - 0.12 * e})`, opacity: e }) },
  { id: "ken-out", name: "Slow pull out", frames: SLOW, style: (e) => ({ transform: `scale(${0.92 + 0.08 * e})`, opacity: e }) },
]);
const jitter = (amp: number) => (e: number) => { const s = Math.floor(e * 9); return { transform: `translateX(${e >= 1 ? 0 : ((s * 37) % 7 - 3) * amp}%)`, opacity: e < 0.15 ? 0 : 1 }; };
add("Glitch", (k) => clamp(k), [
  { id: "glitch", name: "Glitch in", frames: NORMAL, style: jitter(1.2) },
  { id: "glitch-strong", name: "Hard glitch in", frames: NORMAL, style: jitter(3) },
]);

/** the catalogue, in the order the picker shows it */
export const TRANSITIONS: TransitionDef[] = F.flatMap((f) => f.variants.map((v) => ({ id: v.id, name: v.name, family: f.family, frames: v.frames })));
const BY: Record<string, { ease: (k: number) => number; frames: number; style: (e: number) => TStyle }> =
  Object.fromEntries(F.flatMap((f) => f.variants.map((v) => [v.id, { ease: f.ease, frames: v.frames, style: v.style }])));

/** how many frames a transition takes (30 fps); unknown ids fade */
export const framesOf = (id: string) => (BY[id] ?? BY.fade).frames;
/** the incoming scene's style `frame` frames into the transition; unknown ids fade, as the engine always did */
export function transitionStyle(id: string, frame: number): TStyle {
  const t = BY[id] ?? BY.fade;
  if (id === "cut") return {};
  return t.style(t.ease(frame / t.frames));
}
