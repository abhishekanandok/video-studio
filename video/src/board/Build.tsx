import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadCourier } from "@remotion/google-fonts/CourierPrime";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadNews } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { K, tornClip } from "../explainer/collage";

/* The "build-up" edit (video/build.py): a line's page is built piece by piece, each piece landing on the word that names
   it. A piece flies in from the nearest edge, overshoots a little and settles, then stays; the camera never moves.
   Positions come from build.py, so a piece carried over from the line before keeps its place. */

const { fontFamily: HAND } = loadCaveat();
const { fontFamily: COND } = loadOswald();
const { fontFamily: TYPEW } = loadCourier("normal", { weights: ["400", "700"], subsets: ["latin"] });
const { fontFamily: SANS } = loadInter("normal", { weights: ["500", "700", "800"], subsets: ["latin"] });
const { fontFamily: SERIF } = loadNews("normal", { weights: ["500"], subsets: ["latin"] });
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FPS = 30;
const LEAD = 7; // frames: a piece starts moving just before its word, so it lands on it

export type BuildPiece = {
  kind: "photo" | "cutout" | "stamp" | "note" | "bullets" | "quote" | "trend"; src?: string | null; text?: string;
  caption?: string; bullets?: string[]; bullet_at?: number[]; who?: string;  // what a picture shows; points; who said a quote
  start?: string; end?: string; label?: string; a?: number; z?: number;  // a trend: the line's two numbers and their values
  at: number; // when its word is spoken, as a fraction of the line (-1: already on the page)
  x: number; y: number; w: number; rot: number; frm: "left" | "right" | "top" | "bottom";
};

const AWAY = { left: [-1500, 0], right: [1500, 0], top: [0, -1000], bottom: [0, 1000] } as const;

/** How tall a piece is on screen (roughly), so it can be kept whole inside the frame. */
function heightOf(p: BuildPiece): number {
  switch (p.kind) {
    case "photo": return p.w * 0.72 + (p.caption ? 50 : 0);
    case "cutout": return p.w * 0.9 + (p.caption ? 50 : 0);
    case "trend": return 520;
    case "quote": return 150 + Math.ceil((p.text ?? "").length / 30) * 60;
    case "bullets": return 70 + (p.bullets?.length ?? 1) * 95;
    case "note": return 300;
    default: return (p.text ?? "").length > 16 ? 300 : 190;  // a stamp: one or two lines
  }
}

/** A piece's centre, moved just enough that the whole piece stays inside the frame (a tall chart placed near the top
 * edge, for one, is lowered until its top is on screen). */
function inFrame(p: BuildPiece): { x: number; y: number } {
  const h = Math.min(1000, heightOf(p)), w = p.kind === "trend" ? 700 : p.kind === "quote" ? Math.min(p.w + 80, 860) : p.w;
  const clampTo = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
  return { x: clampTo(p.x, w / 2 + 24, 1920 - w / 2 - 24), y: clampTo(p.y, h / 2 + 24, 1080 - h / 2 - 24) };
}

export function Build({ pieces, talk, now = false, step = 1 }: { pieces: BuildPiece[]; talk: number; now?: boolean; step?: number }) {
  const raw = useCurrentFrame();
  const f = Math.floor(raw / step) * step;  // step 3: pieces move "on threes" (the Vox skill); their sounds keep exact time
  // the first new piece never waits: it lands within the first beat, so a page is never empty for long
  const firstNew = pieces.findIndex((p) => p.at >= 0);
  // a bullet card explains the whole line, so it lands at the start and reveals its points while the narrator speaks
  const startOf = (p: BuildPiece, i: number) => p.at < 0 ? -60 : (i === firstNew || p.kind === "bullets") ? Math.min(Math.max(0, Math.round(p.at * talk) - LEAD), 10) : Math.max(0, Math.round(p.at * talk) - LEAD);
  // the view leans gently toward the newest piece as it lands, so the eye is always led somewhere
  let fx = 0, fy = 0;
  pieces.forEach((p, i) => {
    const st = startOf(p, i);
    if (p.at < 0 || f < st) return;
    const s = spring({ frame: f - st, fps: FPS, config: { damping: 20, stiffness: 60 } });
    fx += (960 - p.x) * 0.05 * s - fx * s;
    fy += (540 - p.y) * 0.05 * s - fy * s;
  });
  return (
    <AbsoluteFill style={{ transform: `translate(${fx}px, ${fy}px)` }}>
      {pieces.map((p, i) => {
        const start = startOf(p, i);
        if (f < start) return null;
        const s = spring({ frame: f - start, fps: FPS, config: { damping: 13, stiffness: 120, mass: 0.9 } });
        const [dx, dy] = AWAY[p.frm];
        const { x, y } = inFrame(p);
        const spin = (p.frm === "left" || p.frm === "bottom" ? -1 : 1) * 9;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: p.w, opacity: interpolate(s, [0, 0.15], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translate(-50%, -50%) translate(${dx * (1 - s)}px, ${dy * (1 - s)}px) rotate(${p.rot + spin * (1 - s)}deg)` }}>
            <Face p={p} seed={i + Math.round(p.x)} t={f - start} talk={talk - start} lineTalk={talk} landed={start} gray={now ? interpolate(f - start, [14, 36], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1} />
            {p.at >= 0 && <Sequence from={start} durationInFrames={20}><Audio src={staticFile(`sfx/${p.kind === "stamp" ? "thud" : "paper"}.wav`)} volume={0.22} /></Sequence>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** What a picture shows, typed on a kraft label taped under it. */
function Caption({ text, t, seed }: { text: string; t: number; seed: number }) {
  const o = interpolate(t, [10, 18], [0, 1], clamp);
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: -18, opacity: o, transform: `translateY(${(1 - o) * 14}px) rotate(${(seed % 5) - 2}deg)` }}>
      <div style={{ background: K.kraft, clipPath: tornClip(seed + 7, 2.2), padding: "10px 22px 8px", fontFamily: TYPEW, fontWeight: 700, fontSize: 26, color: K.ink, letterSpacing: 0.5, maxWidth: "92%", textAlign: "center" }}>{text}</div>
    </div>
  );
}

// gray: 1 = a black-and-white print; a photo of the present turns to colour once it has landed (0). t: frames since it landed
function Face({ p, seed, gray, t, talk = 300, lineTalk = 300, landed = 0 }: { p: BuildPiece; seed: number; gray: number; t: number; talk?: number; lineTalk?: number; landed?: number }) {
  const shadow = "drop-shadow(0 18px 22px rgba(40,30,15,0.45))";
  if (p.kind === "bullets") return <Bullets items={p.bullets ?? []} w={p.w} t={t} seed={seed} span={talk} at={p.bullet_at} lineTalk={lineTalk} landed={landed} />;
  if (p.kind === "quote") return <Quote text={p.text ?? ""} who={p.who ?? ""} w={p.w} t={t} seed={seed} />;
  if (p.kind === "trend") return <Trend p={p} t={t} seed={seed} />;
  if (p.kind === "cutout" && p.src)
    return <div><Img src={staticFile(p.src)} style={{ width: "100%", maxHeight: p.w * 0.9, objectFit: "contain", filter: shadow }} />{p.caption && <Caption text={p.caption} t={t} seed={seed} />}</div>;
  if (p.kind === "photo" && p.src)
    return (
      <div>
      <div style={{ filter: shadow }}>
        <div style={{ background: "#fbf8f1", clipPath: tornClip(seed, 1.4), padding: Math.round(p.w * 0.03) }}>
          <div style={{ position: "relative", overflow: "hidden", height: Math.round(p.w * 0.66) }}>
            <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `grayscale(${gray}) contrast(${1 + 0.2 * gray}) sepia(${0.15 * gray})` }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,0,0,0.2) 1px, transparent 1.6px)", backgroundSize: "5px 5px", mixBlendMode: "multiply", opacity: gray }} />
          </div>
        </div>
      </div>
      {p.caption && <Caption text={p.caption} t={t} seed={seed} />}
      </div>
    );
  const [big, small] = (p.text ?? "").split("|");
  if (p.kind === "note")
    return (
      <div style={{ filter: shadow, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "#f3d25a", width: Math.min(p.w, 520), padding: "40px 34px 34px", textAlign: "center", clipPath: tornClip(seed, 0.8) }}>
          <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: big.length > 9 ? 84 : 116, lineHeight: 1, color: K.ink }}>{big}</div>
          {small && <div style={{ fontFamily: HAND, fontSize: 46, lineHeight: 1.1, color: K.ink, marginTop: 10 }}>{small}</div>}
        </div>
      </div>
    );
  // stamp: big condensed letters, printed in faded red-brown on a torn scrap of kraft paper; a long one takes two lines
  const two = big.length > 16;
  const len = two ? Math.ceil(big.length / 2) + 2 : big.length;
  return (
    <div style={{ filter: shadow, display: "flex", justifyContent: "center" }}>
      <div style={{ background: K.kraft, clipPath: tornClip(seed, 2.6), padding: "22px 46px 16px", position: "relative" }}>
        <div style={{ fontFamily: COND, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, lineHeight: 1,
          fontSize: Math.min(len <= 6 ? 190 : len <= 11 ? 150 : len <= 16 ? 118 : 96, (p.w - 100) / (Math.max(1, len) * 0.5))  /* always fits its region */, color: "#6e1c16", opacity: 0.9, whiteSpace: two ? "normal" : "nowrap", maxWidth: p.w - 90, textAlign: "center" }}>{big}</div>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,250,235,0.35) 1px, transparent 2px)", backgroundSize: "7px 9px", mixBlendMode: "screen" }} />
      </div>
    </div>
  );
}

/** Points that spell out what the line says: an index card, each point landing in turn on a yellow dotted rule. */
function Bullets({ items, w, t, seed, span = 300, at, lineTalk = 300, landed = 0 }: { items: string[]; w: number; t: number; seed: number; span?: number; at?: number[]; lineTalk?: number; landed?: number }) {
  // each point appears as the narrator reaches its words (at: when, as a share of the line); without that, spread evenly
  const step = Math.max(12, Math.round((span * 0.7) / Math.max(1, items.length)));
  const when = (k: number) => (at && at[k] !== undefined ? Math.max(k ? 4 + k * 8 : 4, Math.round(at[k] * lineTalk) - landed - 4) : 4 + k * step);
  return (
    <div style={{ filter: "drop-shadow(0 16px 20px rgba(40,30,15,0.4))", display: "flex", justifyContent: "center" }}>
      {/* the one bullet card of the whole film (the same as the editorial layouts'): white card, yellow dots, dotted rules */}
      <div style={{ background: "#fbfaf6", padding: "28px 34px 26px", width: Math.min(w, 760), boxShadow: "0 16px 30px rgba(0,0,0,0.18)", borderLeft: "8px solid #ffd60a" }}>
        {items.map((x, k) => {
          const o = interpolate(t, [when(k), when(k) + 8], [0, 1], clamp);
          return (
            <div key={k} style={{ display: "flex", gap: 14, alignItems: "baseline", opacity: o, transform: `translateX(${(1 - o) * -24}px)`, marginTop: k ? 16 : 0 }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, background: "#ffd60a", flex: "none", transform: "translateY(3px)", boxShadow: "0 0 0 3px rgba(0,0,0,0.08)" }} />
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, lineHeight: 1.25, color: K.ink,
                borderBottom: "4px dotted #ffd60a", paddingBottom: 4 }}>{x}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A person's exact words, typed out on a paper scrap, with their name on a kraft tag. */
function Quote({ text, who, w, t, seed }: { text: string; who: string; w: number; t: number; seed: number }) {
  const shown = Math.round(interpolate(t, [4, 4 + Math.min(70, text.length * 0.9)], [0, text.length], clamp));
  const size = text.length > 110 ? 36 : text.length > 70 ? 42 : 50;
  return (
    <div style={{ filter: "drop-shadow(0 16px 20px rgba(40,30,15,0.4))", width: Math.min(w + 80, 860) }}>
      <div style={{ background: "#fbf8f1", clipPath: tornClip(seed + 5, 1.2), padding: "34px 42px 30px" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: size, lineHeight: 1.3, color: K.ink }}>
          <span style={{ color: "#c0322a", fontSize: size * 1.4, lineHeight: 0 }}>“</span>{text.slice(0, shown)}{shown >= text.length ? "”" : ""}
        </div>
      </div>
      {who && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -14, marginRight: 24, opacity: interpolate(t, [20, 30], [0, 1], clamp) }}>
        <div style={{ background: K.kraft, clipPath: tornClip(seed + 9, 2.4), padding: "10px 22px 8px", fontFamily: COND, fontWeight: 700, fontSize: 28, letterSpacing: 1, color: K.ink, textTransform: "uppercase" }}>{who}</div>
      </div>}
    </div>
  );
}

/** A number going up or down, drawn: two bars grow, an arrow draws from one to the other, the new number counts up,
 * and a red or green badge gives the change. Both numbers are shown exactly as the line says them. */
function Trend({ p, t, seed }: { p: BuildPiece; t: number; seed: number }) {
  const a = p.a ?? 0, z = p.z ?? 0;
  const up = z >= a;
  const top = Math.max(a, z) || 1;
  const H = 260, grow = interpolate(t, [4, 26], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const second = interpolate(t, [16, 38], [0, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  const col = up ? "#1f8a4c" : "#c0322a";
  const pct = a ? Math.round(((z - a) / Math.abs(a)) * 100) : 0;
  const count = Math.round(a + (z - a) * second);
  const shownEnd = second >= 1 ? p.end : count.toLocaleString("en-US");
  const arrow = interpolate(t, [24, 40], [0, 1], clamp);
  return (
    <div style={{ filter: "drop-shadow(0 16px 20px rgba(40,30,15,0.4))", display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#fbf8f1", clipPath: tornClip(seed + 2, 1.0), padding: "26px 40px 22px", width: 620 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, color: K.ink, textTransform: "uppercase", letterSpacing: 1 }}>{p.label}</div>
          {pct !== 0 && <div style={{ flex: "none", background: col, color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 32, padding: "5px 16px", borderRadius: 999,
            transform: `scale(${interpolate(t, [38, 46], [1.5, 1], clamp)})`, opacity: t >= 38 ? 1 : 0 }}>{up ? "▲" : "▼"} {Math.abs(pct)}%</div>}
        </div>
        <div style={{ position: "relative", height: H + 90, marginTop: 14 }}>
          {[[a, p.start, grow, "#9a9285"], [z, shownEnd, second, col]].map(([v, txt, g, c], k) => (
            <div key={k} style={{ position: "absolute", bottom: 40, left: k ? 330 : 60, width: 150, textAlign: "center" }}>
              <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 44, color: k ? (c as string) : K.ink, marginBottom: 8, opacity: (g as number) > 0.05 ? 1 : 0 }}>{txt as string}</div>
              <div style={{ height: ((v as number) / top) * H * (g as number), background: c as string, borderRadius: "6px 6px 0 0" }} />
            </div>
          ))}
          <div style={{ position: "absolute", left: 40, right: 40, bottom: 40, height: 3, background: K.ink }} />
          <svg width={540} height={H + 90} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <path d={`M 210 ${up ? H * 0.75 : H * 0.25} C 270 ${up ? H * 0.7 : H * 0.3}, 290 ${up ? H * 0.3 : H * 0.7}, 320 ${up ? H * 0.2 : H * 0.8}`}
              stroke={col} strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arrow} />
            {arrow >= 1 && <text x={322} y={up ? H * 0.2 + 12 : H * 0.8 + 14} fontSize={34} fill={col} textAnchor="middle">{up ? "▲" : "▼"}</text>}
          </svg>
        </div>
      </div>
    </div>
  );
}
