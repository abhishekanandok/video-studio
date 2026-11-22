/* The motion library showcase: a grid of small screens, each playing one motion or block again and again with its name.
   Each tile is its own 960 x 540 stage (the blocks lay out as if full screen), shrunk into the grid. */

import { useContext, type ReactNode } from "react";
import { AbsoluteFill, Freeze } from "remotion";
import { SceneCtx, clamp01, family, useScene } from "../../kit";
import { ease } from "../../lib/motion";

export type Item = { name: string; does: string; node: ReactNode; bg?: string; vw?: number; vh?: number; loop?: number };

/** one small screen: its own stage size, its time looping every `loop` s so the motion plays again */
export function Tile({ item, w, at, index }: { item: Item; w: number; at: number; index: number }) {
  const c = useContext(SceneCtx);
  const { frame, fps, t, theme } = useScene();
  const vw = item.vw ?? 960, vh = item.vh ?? 540, h = (w * vh) / vw;
  const start = Math.round(at * fps), period = Math.round((item.loop ?? 4.2) * fps);
  const local = frame < start ? 0 : (frame - start) % period;  // each tile's own clock starts at 0 and loops
  const k = ease.back(clamp01((t - at + 0.35 - index * 0.06) / 0.5));
  return (
    <div style={{ width: w, transform: `scale(${k})`, opacity: clamp01(k * 3) }}>
      <div style={{ width: w, height: h, borderRadius: 16, overflow: "hidden", position: "relative", background: item.bg ?? theme.paper, boxShadow: "0 10px 26px rgb(0 0 0/0.16)", border: "2px solid rgb(0 0 0/0.06)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: vw, height: vh, transform: `scale(${w / vw})`, transformOrigin: "0 0" }}>
          <SceneCtx.Provider value={{ ...c, W: vw, H: vh }}>
            <Freeze frame={local}><AbsoluteFill>{item.node}</AbsoluteFill></Freeze>
          </SceneCtx.Provider>
        </div>
      </div>
      <div style={{ marginTop: 8, fontFamily: family(theme.font), lineHeight: 1.15 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: theme.ink }}>{item.name}</span>
        <span style={{ fontSize: 18, color: theme.muted }}>  {item.does}</span>
      </div>
    </div>
  );
}

/** the whole scene: the layer and group as a header, then the tiles in a grid that fits the frame */
export function Showcase({ layer, group, count, items, cols, at = 0.4 }: { layer: string; group: string; count?: number; items: Item[]; cols: number; at?: number }) {
  const { theme, t } = useScene();
  const rows = Math.ceil(items.length / cols), gap = 26;
  const byCols = (1800 - gap * (cols - 1)) / cols;
  const byRows = ((800 - gap * (rows - 1)) / rows - 46) * (16 / 9);
  const w = Math.min(byCols, byRows);
  const head = ease.out(clamp01(t / 0.6));
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${theme.bg[0]}, ${theme.bg[1]})` }}>
      <div style={{ position: "absolute", left: 60, top: 34, display: "flex", alignItems: "baseline", gap: 22, fontFamily: family(theme.display), opacity: head, transform: `translateY(${(1 - head) * -20}px)` }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: "#fff", background: layer.startsWith("LAYER 1") ? theme.accent : theme.accent2, padding: "6px 16px", borderRadius: 8 }}>{layer}</div>
        <div style={{ fontSize: 58, fontWeight: 800, color: theme.ink }}>{group}</div>
        {count !== undefined && <div style={{ fontSize: 30, fontWeight: 700, color: theme.muted }}>{count}</div>}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 128, display: "flex", flexWrap: "wrap", justifyContent: "center", gap, padding: "0 60px" }}>
        {items.map((it, i) => <Tile key={i} item={it} w={w} at={at + i * 0.06} index={i} />)}
      </div>
    </AbsoluteFill>
  );
}

/** a sample card to move about: a coloured card with a picture or an emoji on it */
export function Thing({ label = "", glyph = "📦", size = 200, color }: { label?: string; glyph?: string; size?: number; color?: string }) {
  const { theme } = useScene();
  return (
    <div style={{ width: size, height: size, borderRadius: 26, background: color ?? theme.accent, display: "grid", placeItems: "center", boxShadow: "0 12px 24px rgb(0 0 0/0.25)", fontSize: size * 0.46, color: "#fff", fontFamily: family(theme.display), fontWeight: 800 }}>{glyph}{label}</div>
  );
}
/** centres its child on the tile's stage */
export const Center = ({ children, y = 0.5 }: { children: ReactNode; y?: number }) => <div style={{ position: "absolute", left: "50%", top: `${y * 100}%`, transform: "translate(-50%,-50%)" }}>{children}</div>;
/** centres its child and scales it down (for blocks sized for the full 1920 x 1080 frame) */
export const Fit = ({ s = 0.5, y = 0.5, children }: { s?: number; y?: number; children: ReactNode }) => <Center y={y}><div style={{ transform: `scale(${s})` }}>{children}</div></Center>;
