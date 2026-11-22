/* WHERE THE MAIN PIECES GO: chosen, never guessed. A scene picks a <Layout> (named regions inside the frame's safe
   area, clear of the captions) and puts each main piece in a <Region>. A region scales its piece to fit its box and
   centres it, so nothing is cut by the frame and two pieces never land on each other. Inside a region, pieces use the
   region's own px: (0,0) is its top-left and `design` is its size. Labels still go to <Tag>, which finds a region by id. */
import { createContext, useContext, type ReactNode } from "react";
import { useVideoConfig } from "remotion";

type Box = { x: number; y: number; w: number; h: number };
export const LAYOUTS = {
  full: ["main"], "title-main": ["title", "main"],
  split: ["left", "right"], "title-split": ["title", "left", "right"],
  "hero-left": ["main", "side"], "hero-right": ["side", "main"], "title-hero": ["title", "main", "side"],
  "main-footer": ["main", "footer"], "title-main-footer": ["title", "main", "footer"],
  three: ["a", "b", "c"], "title-three": ["title", "a", "b", "c"], quad: ["a", "b", "c", "d"],
} as const;
export type LayoutKind = keyof typeof LAYOUTS;
const GAP = 40;

/** whether the player draws captions over this scene (src/argon/film.tsx ArgonFilm sets it): a look film has none, so
    its regions may use the whole frame. Code decides it; the writer never has to. */
export const CaptionsCtx = createContext(true);

/** the regions' boxes on this frame: a safe margin all round, the captions' strip kept free at the bottom when there are captions */
export function regionBoxes(kind: LayoutKind, W: number, H: number, captions = true): Record<string, Box> {
  const vertical = H > W, cap = captions ? Math.round(H * (vertical ? 0.22 : 0.15)) : vertical ? 120 : 64;  // no captions: the same margin as the top
  const S: Box = { x: vertical ? 60 : 96, y: vertical ? 120 : 64, w: 0, h: 0 };
  S.w = W - 2 * S.x; S.h = H - S.y - cap;
  const out: Record<string, Box> = {};
  let body = S;
  if (kind.startsWith("title")) {
    const th = Math.round(S.h * 0.17);
    out.title = { x: S.x, y: S.y, w: S.w, h: th };
    body = { x: S.x, y: S.y + th + GAP, w: S.w, h: S.h - th - GAP };
  }
  const split = (fr: number[], names: string[], across: boolean) => {
    const tot = fr.reduce((a, b) => a + b, 0), free = (across ? body.w : body.h) - GAP * (fr.length - 1);
    let at = across ? body.x : body.y;
    names.forEach((n, i) => {
      const len = (free * fr[i]) / tot;
      out[n] = across ? { x: at, y: body.y, w: len, h: body.h } : { x: body.x, y: at, w: body.w, h: len };
      at += len + GAP;
    });
  };
  const across = !vertical;  // side by side on a wide frame, stacked on a tall one
  if (kind === "full" || kind === "title-main") out.main = body;
  else if (kind === "split" || kind === "title-split") split([1, 1], ["left", "right"], across);
  else if (kind === "hero-left" || kind === "title-hero") split([62, 38], ["main", "side"], across);
  else if (kind === "hero-right") split([38, 62], ["side", "main"], across);
  else if (kind === "main-footer" || kind === "title-main-footer") split([74, 26], ["main", "footer"], false);
  else if (kind === "three" || kind === "title-three") split([1, 1, 1], ["a", "b", "c"], across);
  else if (kind === "quad") {
    const w = (body.w - GAP) / 2, h = (body.h - GAP) / 2;
    ["a", "b", "c", "d"].forEach((n, i) => { out[n] = { x: body.x + (i % 2) * (w + GAP), y: body.y + Math.floor(i / 2) * (h + GAP), w, h }; });
  }
  return out;
}

const Ctx = createContext<Record<string, Box> | null>(null);
/** the scene's layout: its regions, for the <Region>s inside */
export function Layout({ kind, children }: { kind: LayoutKind; children: ReactNode }) {
  const { width, height } = useVideoConfig(), captions = useContext(CaptionsCtx);
  return <Ctx.Provider value={regionBoxes(kind, width, height, captions)}><div style={{ position: "absolute", inset: 0 }}>{children}</div></Ctx.Provider>;
}
/** one main piece in its region: drawn at its `design` size (region px), scaled to fit the box, centred.
    grow: how much bigger than its design size it may be drawn (so a small piece still fills its region) */
export function Region({ name, design, id, align = "center", grow = 1.4, children }: {
  name: string; design?: [number, number]; id?: string; align?: "center" | "left" | "right"; grow?: number; children: ReactNode;
}) {
  const boxes = useContext(Ctx);
  if (!boxes) throw new Error("<Region> must be inside a <Layout>");
  const b = boxes[name] ?? boxes.main ?? Object.values(boxes)[0];  // a wrong name still lands inside the frame
  const [dw, dh] = design ?? [b.w, b.h];
  const k = Math.min(b.w / dw, b.h / dh, grow), w = dw * k, h = dh * k;
  const x = b.x + (align === "left" ? 0 : align === "right" ? b.w - w : (b.w - w) / 2), y = b.y + (b.h - h) / 2;
  return (
    <div data-piece={id} data-region={name} style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <div style={{ position: "relative", width: dw, height: dh, transform: `scale(${k})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}
