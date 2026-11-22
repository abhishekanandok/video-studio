/* PARTS: every block's pieces can be swapped for a real picture or your own component, and the motion stays.

   Inside a block, each piece worth swapping is wrapped in <Part name="bed">…default drawing…</Part> (in SVG:
   <SvgPart name x y w h>). The block takes `parts` (and puts them in scope with <Parts block="Hospital" parts={parts}>):
     <Hospital parts={{ bed: "argon/film/real-bed.png", monitor: <MyMonitor /> }} />
   From outside, <Swap parts={{ "Hospital.bed": …, "Character.face": … }}> swaps pieces of every block inside it (one
   <Swap> around a scene restyles them all). A repeated piece (a seat, a day, a row) is a Part with an
   `item`: give a function, (item, i, original) => node, to draw each one your way; `original` is the default drawing.
   A part can be a picture path or URL (it fills the piece's box), any React node, a function, or null to hide it.
   Blocks also take render={(state) => …}: the block's live motion values, to draw a completely different interface. */

import { createContext, isValidElement, useContext, type CSSProperties, type ReactNode } from "react";
import { slot, type Slot } from "./slots";
import { useScene } from "../kit";

export type PartValue = Slot | null | ((item: any, i: number, original: ReactNode) => ReactNode);
export type PartsMap = Record<string, PartValue>;
type Scope = { block: string; own: PartsMap; outer: PartsMap };
const PartsCtx = createContext<Scope>({ block: "", own: {}, outer: {} });

/** swaps pieces of every block inside, by "Block.part" (or just "part" for any block that has one with that name) */
export function Swap({ parts, children }: { parts: PartsMap; children: ReactNode }) {
  const c = useContext(PartsCtx);
  return <PartsCtx.Provider value={{ ...c, outer: { ...c.outer, ...parts } }}>{children}</PartsCtx.Provider>;
}
/** a block puts its own `parts` in scope for the Parts inside it */
export function Parts({ block, parts, children }: { block: string; parts?: PartsMap; children: ReactNode }) {
  const c = useContext(PartsCtx);
  // "Face.mouth" given to an outer block reaches the Face drawn inside it
  const passOn = Object.fromEntries(Object.entries(c.own).filter(([k]) => k.includes(".")));
  return <PartsCtx.Provider value={{ block, own: parts ?? {}, outer: { ...c.outer, ...passOn } }}>{children}</PartsCtx.Provider>;
}
/** what was swapped in for a part (undefined if nothing): for a block that treats a picture specially (a flag's cloth
    that waves, a view that scrolls past a window) */
export const usePartValue = (name: string) => useValue(name);
export const isPicture = (v: unknown): v is string => typeof v === "string" && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(v);
function useValue(name: string): PartValue | undefined {
  const c = useContext(PartsCtx);
  if (name in c.own) return c.own[name];
  const full = `${c.block}.${name}`;
  if (full in c.outer) return c.outer[full];
  return c.outer[name];
}
/** one swappable piece: the swapped value if there is one (a picture fills this piece's box), else the default.
    `still` marks a piece of a set's painted background: when the set is given a `background` (a real photo), the still
    pieces hide by themselves and only the moving ones (steam, traffic, a beeping monitor) stay on top of it */
export function Part({ name, item, i = 0, fit = "cover", still = false, children }: { name: string; item?: unknown; i?: number; fit?: "cover" | "contain"; still?: boolean; children?: ReactNode }) {
  const v = useValue(name), bg = useValue("background");
  if (v === undefined && still && bg !== undefined && bg !== null) return null;
  if (v === undefined) return <>{children}</>;
  if (v === null) return null;
  if (typeof v === "function") return <>{v(item, i, children)}</>;
  const lay = layout(children);
  return lay ? <div style={lay}>{slot(v, null, undefined, fit)}</div> : <>{slot(v, children, undefined, fit)}</>;
}
// what a swapped picture keeps from the default drawing: where it is, its size, its shape and its motion
const KEEP = ["position", "inset", "left", "right", "top", "bottom", "width", "height", "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "flex", "transform", "transformOrigin", "zIndex", "opacity", "borderRadius", "clipPath", "filter"] as const;
function layout(node: ReactNode): CSSProperties | null {
  if (!isValidElement(node)) return null;
  const st = (node.props as { style?: CSSProperties }).style;
  if (!st) return null;
  const out: Record<string, unknown> = { overflow: "hidden" };
  for (const k of KEEP) if (st[k] !== undefined) out[k] = st[k];
  return out as CSSProperties;
}
/** a swappable piece inside an SVG: a swapped picture or node is drawn in the box x, y, w, h */
export function SvgPart({ name, x, y, w, h, item, i = 0, fit = "contain", children }: { name: string; x: number; y: number; w: number; h: number; item?: unknown; i?: number; fit?: "cover" | "contain"; children?: ReactNode }) {
  const v = useValue(name);
  if (v === undefined) return <>{children}</>;
  if (v === null) return null;
  const inner = typeof v === "function" ? v(item, i, null) : slot(v, null, undefined, fit);
  return <foreignObject x={x} y={y} width={w} height={h} style={{ overflow: "visible" }}><div style={{ width: w, height: h }}>{inner}</div></foreignObject>;
}
/** a box for a Part to fill (absolute, in px) */
/** the bottom layer of a set: a real photo or scene behind everything (nothing by default) */
export function Background({ fit = "cover" }: { fit?: "cover" | "contain" }) {
  const v = useValue("background");
  if (v === undefined || v === null) return null;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>{typeof v === "function" ? v(undefined, 0, null) : slot(v, null, undefined, fit)}</div>;
}
export const box = (x: number, y: number, w: number, h: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: x, top: y, width: w, height: h, ...extra });
export type BlockProps<S = Record<string, unknown>> = { parts?: PartsMap; render?: (s: S) => ReactNode };

/** the state every block's render gets: the scene time, the time since the block began (`at`), and its props */
export type BlockState<P> = { t: number; local: number; props: P };
/** turns a block's drawing into a block that takes `parts` (and a "Block.part" <Swap> from outside) and `render`:
    render={(s) => …} draws your own interface from the scene time and the block's props; parts={{ all: … }} replaces
    the whole drawing, and parts={{ all: (_, _, original) => <Frame>{original}</Frame> }} wraps it */
export function block<P extends object>(name: string, View: (p: P) => ReactNode) {
  function Block(props: P & BlockProps<BlockState<P>>) {
    const { parts, render, ...rest } = props as P & BlockProps<BlockState<P>>;
    const { t } = useScene();
    if (render) return <>{render({ t, local: t - Number((rest as { at?: number }).at ?? 0), props: rest as P })}</>;
    return <Parts block={name} parts={parts}><Part name="all"><View {...(rest as P)} /></Part></Parts>;
  }
  Block.displayName = name;
  return Block;
}
