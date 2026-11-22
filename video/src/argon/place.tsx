/* WHERE THINGS ARE, computed instead of guessed (docs/research/labels-that-land.md). The model decides what a label
   says and what it points at; this decides where it goes. A <Placer> (mounted by the print kit's <Sheet> round every
   scene) measures the real frame each time it renders: where every piece of text already is, where every named anchor
   is, and puts every label in the first spot that is clear of other text, of the frame's edge and of other leader lines.
     usePiece("globe", { w, h, at })   a piece publishes named points ("equator", "pole.s", "-33.9,18.4") in its own px
     <Mark id="bar.north.top" x y />   a point in a hand-drawn piece, by name (<SvgMark> inside an <svg>)
     useLabel({ to | tx,ty, x?, y? })  a label asks for its place; the print kit's <Tag> does this
   With inputProps { geom: true } (video/framecheck.mjs) each settled frame also logs what is still wrong, measured:
   text over text, text cut by the frame, a label whose anchor does not exist. */
import React, { createContext, useContext, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getInputProps, useCurrentFrame } from "remotion";
import { strokeAcross, textsMeet } from "./ink";

export type Side = "right" | "left" | "above" | "below" | "upright" | "upleft" | "downright" | "downleft";
type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
/** a piece's named points, in the piece's own px (w × h is its drawn size before any scaling) */
export type Resolver = { w: number; h: number; at: (name: string) => Pt | null };
type LabelReq = { to?: string; tx?: number; ty?: number; x?: number; y?: number; side?: Side; order: number };
/** where a label goes: its box's top-left, its target and where the leader meets the box */
export type Placed = { x: number; y: number; tx?: number; ty?: number; lx?: number; ly?: number; missing?: boolean };
type Reg = { pieces: Map<string, Resolver>; labels: Map<string, LabelReq> };
type Ctx = Reg & { placed: Record<string, Placed> };
const PlaceCtx = createContext<Ctx | null>(null);

const W = 1920, H = 1080, SAFE = 36, GAP = 12;
const PROBE = (() => { try { return Boolean((getInputProps() as { geom?: boolean }).geom); } catch { return false; } })();

/** a piece tells the scene its named points; outside a <Placer> it does nothing */
export function usePiece(id: string | undefined, r: Resolver) {
  const c = useContext(PlaceCtx);
  if (c && id) c.pieces.set(id, r);
}
/** a named point in a hand-drawn piece: a label can point at it by name (to="bar.north.top") */
export const Mark: React.FC<{ id: string; x: number; y: number }> = ({ id, x, y }) =>
  <div data-anchor={id} style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }} />;
/** the same, inside an <svg> */
export const SvgMark: React.FC<{ id: string; x: number; y: number }> = ({ id, x, y }) =>
  <circle data-anchor={id} cx={x} cy={y} r={0.5} fill="none" stroke="none" />;

/** a label asks for its place. It gets null on the first pass (draw it hidden, so its size can be measured), then
 *  its place. Outside a <Placer> it is placed where the writer said (x, y) and points at tx, ty. */
export function useLabel(req: Omit<LabelReq, "order"> & { order?: number }): { id: string; pos: Placed | null } {
  const c = useContext(PlaceCtx);
  const id = useId();
  if (c) c.labels.set(id, { ...req, order: req.order ?? 0 });
  // forget the label only when it leaves the scene (the maps outlive every re-render; the context value does not)
  const labels = c?.labels;
  useLayoutEffect(() => () => { labels?.delete(id); }, [labels, id]);
  if (!c) return { id, pos: { x: req.x ?? 80, y: req.y ?? 80, tx: req.tx, ty: req.ty } };
  return { id, pos: c.placed[id] ?? null };
}

/* ---------------- the solver ---------------- */
const area = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const grow = (b: Box, g: number): Box => ({ x: b.x - g, y: b.y - g, w: b.w + 2 * g, h: b.h + 2 * g });
const outside = (b: Box) => b.w * b.h - area(b, { x: SAFE, y: SAFE, w: W - 2 * SAFE, h: H - 2 * SAFE });
/** where a leader from the target meets the box: the nearest point of the box (none if the target is inside it) */
function meet(b: Box, t: Pt): Pt | null {
  const x = Math.max(b.x, Math.min(t[0], b.x + b.w)), y = Math.max(b.y, Math.min(t[1], b.y + b.h));
  return x === t[0] && y === t[1] ? null : [x, y];
}
const ccw = (a: Pt, b: Pt, c: Pt) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
const crosses = (a: Pt, b: Pt, c: Pt, d: Pt) => ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
/** does a segment pass through a box (a leader across someone else's words) */
function through(a: Pt, b: Pt, r: Box) {
  const c: Pt[] = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
  return c.some((p, i) => crosses(a, b, p, c[(i + 1) % 4]));
}
const ORDER: Side[] = ["right", "left", "above", "below", "upright", "upleft", "downright", "downleft"];
function around(t: Pt, w: number, h: number, side: Side, d: number): Box {
  const [x, y] = t;
  switch (side) {
    case "right": return { x: x + d, y: y - h / 2, w, h };
    case "left": return { x: x - d - w, y: y - h / 2, w, h };
    case "above": return { x: x - w / 2, y: y - d - h, w, h };
    case "below": return { x: x - w / 2, y: y + d, w, h };
    case "upright": return { x: x + d * 0.7, y: y - d * 0.7 - h, w, h };
    case "upleft": return { x: x - d * 0.7 - w, y: y - d * 0.7 - h, w, h };
    case "downright": return { x: x + d * 0.7, y: y + d * 0.7, w, h };
    case "downleft": return { x: x - d * 0.7 - w, y: y + d * 0.7, w, h };
  }
}

type Text = Box & { text: string; el: Element };
/** every visible piece of text in the scene (labels excluded), as tight boxes in scene px */
function texts(root: HTMLElement, s: number, o: Pt): Text[] {
  const out: Text[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const seen = new Map<Element, { op: number; clip: DOMRect | null }>();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = (n.textContent ?? "").trim();
    const el = n.parentElement;
    if (!text || !el || el.closest("[data-label]") || el.closest("defs, style, script")) continue;
    let vis = seen.get(el);
    if (vis === undefined) {  // how visible it really is: its ancestors' opacity, and the boxes that clip it
      let op = 1, clip: DOMRect | null = null;
      for (let e: Element | null = el; e && e !== root.parentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none") { op = 0; break; }
        op *= Number(cs.opacity || 1);
        if (cs.overflow !== "visible" || cs.clipPath !== "none") {  // a rolling counter's other digits, a masked word
          const r = e.getBoundingClientRect();
          clip = clip ? new DOMRect(Math.max(clip.left, r.left), Math.max(clip.top, r.top),
            Math.max(0, Math.min(clip.right, r.right) - Math.max(clip.left, r.left)), Math.max(0, Math.min(clip.bottom, r.bottom) - Math.max(clip.top, r.top))) : r;
        }
      }
      vis = { op, clip };
      seen.set(el, vis);
    }
    if (vis.op < 0.15) continue;
    range.selectNodeContents(n);
    let r = range.getBoundingClientRect();
    if (vis.clip) {
      const c = vis.clip, L = Math.max(r.left, c.left), T = Math.max(r.top, c.top);
      r = new DOMRect(L, T, Math.max(0, Math.min(r.right, c.right) - L), Math.max(0, Math.min(r.bottom, c.bottom) - T));
    }
    if (r.width < 2 || r.height < 2) continue;
    out.push({ x: (r.left - o[0]) / s, y: (r.top - o[1]) / s, w: r.width / s, h: r.height / s, text, el });
  }
  return out;
}

/** is a painted piece (a bar, a land mass, a photo) under this scene point: the topmost thing there, if it is drawn
 *  (an svg shape with a fill or stroke, or a box with a background or border) and not the page or a label */
function painted(el: Element): boolean {
  if (el instanceof SVGElement) {
    if (el.tagName === "svg" || el.tagName === "g" || el.tagName === "text" || el.tagName === "tspan") return false;
    const cs = getComputedStyle(el);
    return !((cs.fill === "none" || cs.fillOpacity === "0") && (cs.stroke === "none" || cs.strokeOpacity === "0"));
  }
  const cs = getComputedStyle(el);
  const bg = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
  return bg || cs.backgroundImage !== "none" || el.tagName === "IMG" || el.tagName === "CANVAS";
}
function drawnAt(root: HTMLElement, cx: number, cy: number): boolean {
  const rr = root.getBoundingClientRect();
  for (const el of document.elementsFromPoint(cx, cy)) {
    if (!root.contains(el) || el === root) return false;
    if (el.closest("[data-label]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height > rr.width * rr.height * 0.5) continue;  // a full-frame layer, not a piece
    if (painted(el)) return true;
  }
  return false;
}

function solve(root: HTMLElement, reg: Reg): { placed: Record<string, Placed>; problems: string[] } {
  const rr = root.getBoundingClientRect(), s = rr.width / W || 1, o: Pt = [rr.left, rr.top];
  const local = (x: number, y: number): Pt => [(x - o[0]) / s, (y - o[1]) / s];
  /** a named point: a <Mark>, a piece's own named point ("globe.equator"), or a side of a piece's box ("globe.top") */
  const resolve = (name: string): Pt | null => {
    const m = root.querySelector(`[data-anchor="${CSS.escape(name)}"]`);
    if (m) { const r = m.getBoundingClientRect(); return local(r.left + r.width / 2, r.top + r.height / 2); }
    const dot = name.indexOf("."), id = dot < 0 ? name : name.slice(0, dot), rest = dot < 0 ? "center" : name.slice(dot + 1);
    const el = root.querySelector(`[data-piece="${CSS.escape(id)}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect(), res = reg.pieces.get(id);
    const p = res?.at(rest);
    if (res && p) return local(r.left + p[0] * (r.width / res.w), r.top + p[1] * (r.height / res.h));
    const b = { center: [0.5, 0.5], top: [0.5, 0], bottom: [0.5, 1], left: [0, 0.5], right: [1, 0.5], topleft: [0, 0], topright: [1, 0], bottomleft: [0, 1], bottomright: [1, 1] }[rest];
    return b ? local(r.left + r.width * b[0], r.top + r.height * b[1]) : null;
  };
  const words = texts(root, s, o);
  /** how much of a box sits on a drawn piece: 15 sample points, edges included (a label on a bar or a land mass is hard to read) */
  const covered = (b: Box) => {
    let n = 0;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 2; j++) if (drawnAt(root, o[0] + (b.x + b.w * i / 4) * s, o[1] + (b.y + b.h * j / 2) * s)) n++;
    return n / 15;
  };
  const placed: Record<string, Placed> = {}, problems: string[] = [];
  const taken: Box[] = [], leaders: [Pt, Pt][] = [];
  const labels = [...reg.labels.entries()].sort((a, b) => a[1].order - b[1].order);
  for (const [id, q] of labels) {
    const el = root.querySelector(`[data-label="${CSS.escape(id)}"]`) as HTMLElement | null;
    if (!el) continue;
    const w = el.offsetWidth, h = el.offsetHeight;
    const T: Pt | null = q.to ? resolve(q.to) : q.tx !== undefined && q.ty !== undefined ? [q.tx, q.ty] : null;
    if (q.to && !T) problems.push(`the label "${(el.textContent ?? "").trim()}" points at "${q.to}", which is not in the scene: name a piece's id (globe.equator) or a <Mark id>`);
    const P: Pt | null = q.x !== undefined && q.y !== undefined ? [q.x, q.y] : null;
    const cands: Box[] = [];
    if (P) cands.push({ x: P[0], y: P[1], w, h });
    if (T) {
      const sides = q.side ? [q.side, ...ORDER.filter((x) => x !== q.side)] : ORDER;
      for (const d of [40, 90, 150, 230, 320, 430, 560]) for (const sd of sides) cands.push(around(T, w, h, sd, d));
    }
    if (P) for (const k of [1, 2, 3, 4]) for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [-1, 1], [1, 1], [-1, -1]]) cands.push({ x: P[0] + dx * k * 70, y: P[1] + dy * k * (h + GAP), w, h });
    if (!cands.length) for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 4; gx++) cands.push({ x: 120 + gx * 440, y: 80 + gy * 160, w, h });
    let best: Box = cands[0], bestScore = Infinity;
    for (const b of cands) {
      const g = grow(b, GAP);
      const over = words.reduce((n, t) => n + area(g, t), 0) + taken.reduce((n, t) => n + area(g, t), 0);
      const out = outside(b);
      const end = T ? meet(b, T) : null;
      const cross = T && end ? leaders.filter(([a, c]) => crosses(T, end, a, c)).length + words.filter((t) => through(T, end, grow(t, 2))).length : 0;
      const far = T ? Math.hypot(b.x + b.w / 2 - T[0], b.y + b.h / 2 - T[1]) : P ? Math.hypot(b.x - P[0], b.y - P[1]) : 0;
      // drawings are checked only where the words are clear (it is the slow part)
      const cov = over === 0 && out === 0 && cross === 0 ? covered(grow(b, 8)) : 1;
      if (over === 0 && out === 0 && cross === 0 && cov === 0) { best = b; bestScore = 0; break; }  // the first clean spot, in order of preference
      const score = over * 10 + out * 10 + cross * 5000 + cov * b.w * b.h * 2 + far;
      if (score < bestScore) { best = b; bestScore = score; }
    }
    if (bestScore > 0) problems.push(`the label "${(el.textContent ?? "").trim()}" found no clear spot (best at ${Math.round(best.x)},${Math.round(best.y)}): the scene is too crowded there; make other text smaller or move it`);
    const end = T ? meet(best, T) : null;
    taken.push(best);
    if (T && end) leaders.push([T, end]);
    placed[id] = { x: Math.round(best.x), y: Math.round(best.y), tx: T?.[0], ty: T?.[1], lx: end?.[0], ly: end?.[1], missing: Boolean(q.to && !T) };
  }
  if (PROBE) {  // what the writer still got wrong, measured: text over text, text cut by the frame
    // only words count (a "●" or "★" is a drawing), and a word printed over its own copy is the ink's misregistration
    const real = words.filter((w) => /[\p{L}\p{N}]/u.test(w.text));
    const twin = (a: Text, b: Text) => a.text === b.text && Math.abs(a.x - b.x) < 12 && Math.abs(a.y - b.y) < 12;
    const words2 = real.filter((w, i) => !real.slice(0, i).some((v) => twin(v, w)));
    for (let i = 0; i < words2.length; i++) {
      const a = words2[i];
      if (a.x < -2 || a.y < -2 || a.x + a.w > W + 2 || a.y + a.h > H + 2) problems.push(`the text "${a.text}" is cut by the frame (its box ${Math.round(a.x)},${Math.round(a.y)} ${Math.round(a.w)}×${Math.round(a.h)})`);
      // a drawing on the words (an icon over a headline, above or below them): a painted piece SMALLER than the words
      // that sits on them. One larger than the words is their backing (a card, a badge, a bar the label sits in).
      const hit = [0.15, 0.35, 0.5, 0.65, 0.85].some((fx) => [0.35, 0.65].some((fy) =>
        document.elementsFromPoint(o[0] + (a.x + a.w * fx) * s, o[1] + (a.y + a.h * fy) * s).some((e) => {
          if (!root.contains(e) || e === root || e.closest("[data-label]") || e.contains(a.el) || a.el.contains(e) || !painted(e)) return false;
          const r = e.getBoundingClientRect();
          if (strokeAcross({ x: 0, y: 0, w: a.w * s, h: a.h * s }, { x: 0, y: 0, w: r.width, h: r.height })) return false;
          return r.width * r.height < a.w * a.h * s * s && r.width > 4 * s && r.height > 4 * s;
        })));
      if (hit) problems.push(`the text "${a.text}" (at ${Math.round(a.x)},${Math.round(a.y)}) has a drawing on it: move the drawing or the text`);
      for (let j = i + 1; j < words2.length; j++) {
        const b = words2[j];
        if (textsMeet(a, b)) problems.push(`the text "${a.text}" (at ${Math.round(a.x)},${Math.round(a.y)}, ${Math.round(a.w)}×${Math.round(a.h)}) overlaps "${b.text}" (at ${Math.round(b.x)},${Math.round(b.y)}, ${Math.round(b.w)}×${Math.round(b.h)})`);
      }
    }
  }
  return { placed, problems };
}

/** round a scene: measures the frame and places its labels (the print kit's <Sheet> mounts it) */
export function Placer({ page = 0, children }: { page?: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLDivElement>(null);
  const reg = useRef<Reg>({ pieces: new Map(), labels: new Map() });
  const [placed, setPlaced] = useState<Record<string, Placed>>({});
  const logged = useRef(-1);
  useLayoutEffect(() => {
    if (!ref.current || (!reg.current.labels.size && !PROBE)) return;
    const { placed: next, problems } = solve(ref.current, reg.current);
    if (JSON.stringify(next) !== JSON.stringify(placed)) { setPlaced(next); return; }
    if (PROBE && logged.current !== frame) { logged.current = frame; console.log("__GEOM__" + JSON.stringify({ page, frame, problems })); }
  });
  const value = useMemo<Ctx>(() => ({ ...reg.current, placed }), [placed]);
  return <PlaceCtx.Provider value={value}><div ref={ref} style={{ position: "absolute", inset: 0 }}>{children}</div></PlaceCtx.Provider>;
}
