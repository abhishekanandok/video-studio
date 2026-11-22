/* The library's colour palette: named colours for the things the drawn blocks are made of (sky, grass, wood, a wall,
   a good or a bad number…). Blocks paint with var(--name, natural), so with no palette set they keep their natural
   colour. A film's theme sets the palette for every scene: each colour is mixed a little (theme.tint, default 0.25)
   toward the theme colour it belongs with, so a dark neon theme gives a dark neon hospital. theme.palette, or a
   <Palette colors={{ wall: "#..." }}> round any block, sets a colour outright. No imports: kit.tsx uses it too. */

type ThemeLike = { bg?: string[]; ink?: string; accent?: string; accent2?: string; paper?: string; muted?: string; tint?: number; palette?: Record<string, string> };
type Target = "bg" | "ink" | "accent" | "accent2" | "paper" | "muted" | null;

/** name: [the natural colour, the theme colour it leans toward, how far (× tint)] */
export const PALETTE: Record<string, [string, Target, number]> = {
  sky: ["#9cd0f0", "bg", 1], glass: ["#cfe6f5", "bg", 0.6], night: ["#0e1a33", "ink", 0.6],
  grass: ["#5a9a3a", "accent2", 0.6], water: ["#2a7fb8", "accent2", 0.6], sand: ["#d9a85a", "paper", 0.6],
  wood: ["#8a5a2a", "ink", 0.5], stone: ["#e0d2b4", "paper", 1], wall: ["#e8e4dc", "paper", 1], floor: ["#c4c8cc", "muted", 1],
  metal: ["#8a939d", "muted", 1], roof: ["#b5332a", "accent", 0.8],
  good: ["#3fb35a", null, 0], bad: ["#e0453a", null, 0], warn: ["#f0b43a", null, 0],
  skin: ["#f2c9a0", null, 0], hair: ["#2a2320", null, 0], fire: ["#ff9a1c", null, 0], glow: ["#ffe066", null, 0],
  signal: ["#3ff28a", "accent", 0.4], screen: ["#4ae0ff", "accent", 0.4],
};
export type PaletteName = keyof typeof PALETTE;

/** a colour of the palette, for a block to paint with: var(--name, natural) */
export const pc = (name: PaletteName, natural?: string) => `var(--${name}, ${natural ?? PALETTE[name][0]})`;

/** the CSS variables for a theme (and any colours set outright), to put on a wrapper's style */
export function paletteVars(theme: ThemeLike | undefined, colors: Partial<Record<PaletteName, string>> = {}): Record<string, string> {
  const tint = theme?.tint ?? 0.25, out: Record<string, string> = {};
  for (const [name, [natural, target, far]] of Object.entries(PALETTE)) {
    const set = colors[name] ?? theme?.palette?.[name];
    const to = target === "bg" ? theme?.bg?.[0] : target ? theme?.[target] : undefined;
    const k = Math.round(Math.min(1, tint * far) * 100);
    out[`--${name}`] = set ?? (to && k > 0 ? `color-mix(in srgb, ${natural} ${100 - k}%, ${to})` : natural);
  }
  return out;
}
