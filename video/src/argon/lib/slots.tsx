/* SLOTS: what a block draws can be swapped, while its motion stays.

   Every block that takes them has three ways in, from small to total:
   1. parts={{ train: "argon/my-film/train.png", ground: <MyGround /> }}  replaces a named part with a picture (a path or
      URL: drawn to fill the part's box) or with any React node. Parts not given keep the default drawing.
   2. an item function, e.g. player={(i, p) => <img … />}, draws each repeated thing (a player, a flag, a row) your way.
   3. render={(s) => …} replaces the whole drawing: `s` is the block's live motion state (where the ball is, the runs so
      far, how far the train has come), so any interface can be driven by the same motion.
   The motion itself lives in a use…() hook next to each block (useTrain, usePasses…), so it can also be used alone. */

import type { CSSProperties, ReactNode } from "react";
import { Img } from "remotion";
import { src } from "./blocks-a";

/** a part: a picture (path or URL) or anything React can draw */
export type Slot = ReactNode | string;
/** the drawing of a repeated thing: a fixed part, or a function of the thing and its index */
export type ItemSlot<T> = Slot | ((item: T, i: number) => ReactNode);

const isPic = (v: unknown): v is string => typeof v === "string" && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(v);

/** draws a part: the given picture (cover-fitted into `style`'s box), the given node, or the default */
export function slot(value: Slot | undefined, fallback: ReactNode, style?: CSSProperties, fit: "cover" | "contain" = "cover"): ReactNode {
  if (value === undefined || value === null || value === false) return fallback;
  if (isPic(value)) return <Img src={src(value)} style={{ width: "100%", height: "100%", objectFit: fit, display: "block", ...style }} />;
  return value as ReactNode;
}
/** draws a repeated thing with its item slot (or the default) */
export function itemSlot<T>(value: ItemSlot<T> | undefined, item: T, i: number, fallback: ReactNode, style?: CSSProperties, fit: "cover" | "contain" = "contain"): ReactNode {
  if (typeof value === "function") return (value as (item: T, i: number) => ReactNode)(item, i);
  return slot(value as Slot | undefined, fallback, style, fit);
}
