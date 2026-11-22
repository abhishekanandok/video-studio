/** Shared pieces for Drishya's landing-page films (Hero, Reels), in the website's own theme: the Platform section's
 *  dark-green gradient and glowing editor window, the page's light lime wash, white cards, benefit pills, Outfit.
 *  Films run at 60 fps; timings are written in "beats" of 1/30 s (t = frame / 2) so motion stays smooth. */
import { loadFont } from "@remotion/google-fonts/Outfit";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
export const FONT = `${fontFamily}, sans-serif`;

export const C = {
  ink: "#1f1f1d", lime: "#a6f04a", limeDeep: "#5b8f1f", yellow: "#f3f79a", white: "#ffffff", paper: "#f7f7f5",
  win: "#11161f", tile: "#1a1f29", line: "rgba(255,255,255,0.07)", violet: "#7b6cf0", red: "#ef4444", muted: "#6f6b66",
};

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const OUT = Easing.out(Easing.cubic), IN = Easing.in(Easing.cubic), IO = Easing.inOut(Easing.cubic);
export const BACK = Easing.out(Easing.back(1.4));
/** 0 → 1 between beats a and a+len */
export const e = (t: number, a: number, len: number, easing = OUT) => interpolate(t, [a, a + len], [0, 1], { ...clamp, easing });
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
/** the current time in beats (1/30 s) at 60 fps */
export const useBeat = () => useCurrentFrame() / 2;

/** The Platform section's background: dark-green radial gradient, a soft light drifting, a faint grid, a vignette. */
export const PlatformBg = ({ t, loop }: { t: number; loop: number }) => {
  const a = (t / loop) * Math.PI * 2;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 15% 0%, #445338 0%, #303c29 55%, #29331f 100%)" }}>
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(70% 70% at 65% 50%, #000 20%, transparent 80%)" }} />
      <div style={{ position: "absolute", left: `${58 + 6 * Math.sin(a)}%`, top: `${38 + 8 * Math.cos(a)}%`, width: 1100, height: 1100, marginLeft: -550, marginTop: -550, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(166,240,74,0.16), transparent)" }} />
      <div style={{ position: "absolute", left: `${80 + 5 * Math.cos(a)}%`, top: `${80 + 5 * Math.sin(a)}%`, width: 800, height: 800, marginLeft: -400, marginTop: -400, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(243,247,154,0.08), transparent)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 120% at 60% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)" }} />
    </AbsoluteFill>
  );
};

/** The page's light wash: off-white with soft lime, yellow and teal light drifting. */
export const WashBg = ({ t, loop }: { t: number; loop: number }) => {
  const a = (t / loop) * Math.PI * 2;
  const blob = (x: number, y: number, s: number, c: string) => <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: s, height: s, marginLeft: -s / 2, marginTop: -s / 2, borderRadius: "50%", background: c, filter: "blur(90px)", opacity: 0.55 }} />;
  return (
    <AbsoluteFill style={{ background: "#fbfbf7", overflow: "hidden" }}>
      {blob(15 + 8 * Math.sin(a), 20 + 6 * Math.cos(a), 640, "#a6f04a")}
      {blob(85 + 6 * Math.cos(a), 75 + 6 * Math.sin(a), 600, "#f3f79a")}
      {blob(70 + 6 * Math.sin(a + 2), 15, 420, "#9fd0c8")}
    </AbsoluteFill>
  );
};

/** The Drishya mark: an eye with a play button for its pupil. */
export const Mark = ({ size, color = "#fff", accent = C.lime }: { size: number; color?: string; accent?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M1.5 12C4.6 6.2 8.2 4 12 4s7.4 2.2 10.5 8c-3.1 5.8-6.7 8-10.5 8S4.6 17.8 1.5 12Z" fill={color} />
    <path d="M10 8.6 15.4 12 10 15.4Z" fill={accent} />
  </svg>
);

/** A white card in the site's style. */
export const card = (r = 22) => ({ background: "#fff", borderRadius: r, boxShadow: "0 30px 60px -24px rgba(10,25,10,0.45), 0 0 0 1px rgba(0,0,0,0.06)" });
/** A benefit pill (yellow / white / lime), as in the Benefits section. */
export const pill = (bg: string) => ({ background: bg, borderRadius: 999, border: "1px solid rgba(0,0,0,0.15)", color: C.ink, fontWeight: 500 as const });
