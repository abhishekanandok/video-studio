/* The bridge from a film's look (print DNA, video/looks.py) to the motion library (src/argon/lib: 112 motions, 269
   blocks). The library's blocks paint with a Theme (src/argon/kit.tsx): this turns the DNA into one, so a ship, a
   factory or a character comes out in the film's inks, fonts, corners and shadows, in the library look that suits the
   family (paper cut-out, sketch, chalk, neon...).
     <Lib>{library blocks}</Lib>        inside a <Sheet>: everything in it reads the film's look
     <Lib look={false}>…</Lib>          the same colours and fonts, without the library look's filter */
import React from "react";
import { useVideoConfig } from "remotion";
import { registerFonts, SceneCtx, type Theme } from "../argon/kit";
import { paletteVars } from "../argon/lib/palette";
import { Look, type LookKind } from "../argon/lib/style";
import { printFont, useDNA, type DNA } from "./kit";

registerFonts(printFont);

/** corners, outlines and shadows from the film's text-box style */
const BOX: Record<string, Pick<Theme, "radius" | "outline" | "shadow">> = {
  card: { radius: 8, outline: 0, shadow: "soft" }, rule: { radius: 0, outline: 0, shadow: "none" }, outline: { radius: 0, outline: 3, shadow: "none" },
  sticky: { radius: 2, outline: 0, shadow: "soft" }, glass: { radius: 26, outline: 1, shadow: "soft" }, strip: { radius: 0, outline: 0, shadow: "soft" },
  tab: { radius: 10, outline: 2, shadow: "none" }, bracket: { radius: 0, outline: 2, shadow: "none" }, solid: { radius: 0, outline: 0, shadow: "hard" },
};

export function themeOf(d: DNA): Theme {
  return {
    bg: [d.paper, d.paper], ink: d.ink, accent: d.inks[0], accent2: d.inks[1] ?? d.inks[0], muted: d.inks[3] ?? d.inks[2] ?? d.ink,
    paper: d.dark ? (d.board ?? "#1b1a18") : "#fbf8f1", font: d.body, display: d.display,
    ...(BOX[d.box ?? "card"] ?? BOX.card), tint: d.tint ?? 0.6, look: d.lib ?? "flat", box: d.box ?? "card", card: d.card, enter: d.enter,
  };
}

/** pieces that are mostly text keep clean type: a library look's filter (line art, sketch...) would hollow their letters */
const TEXT_PIECES = new Set(["Card"]);
const nameOf = (n: React.ReactNode) => React.isValidElement(n) && typeof n.type !== "string" ? (n.type as { displayName?: string }).displayName : undefined;
const carriesText = (n: React.ReactNode) => TEXT_PIECES.has(nameOf(n) ?? "") || (React.isValidElement(n) && React.Children.toArray((n.props as { children?: React.ReactNode }).children).some((k) => TEXT_PIECES.has(nameOf(k) ?? "")));
export const Lib: React.FC<{ children: React.ReactNode; look?: boolean; dur?: number }> = ({ children, look = true, dur }) => {
  const d = useDNA();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const theme = themeOf(d);
  // each piece gets its own look layer: one filter over all of them would melt overlapping pieces into one shape
  const styled = look && theme.look && theme.look !== "flat"
    ? React.Children.map(children, (c) => carriesText(c) ? c : <Look kind={theme.look as LookKind} fill>{c}</Look>) : children;
  return (
    <SceneCtx.Provider value={{ theme, words: [], dur: dur ?? durationInFrames / fps, W: width, H: height, dir: "" }}>
      <div style={{ position: "absolute", inset: 0, ...paletteVars(theme) }}>{styled}</div>
    </SceneCtx.Provider>
  );
};
