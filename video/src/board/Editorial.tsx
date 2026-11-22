import { loadFont as loadDisplay } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadNews } from "@remotion/google-fonts/Newsreader";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { rnd, tornClip } from "../explainer/collage";

/* The "Vox editorial" edit (video/editorial.py): the modern Vox look for the present day. White grid paper; real people cut
   out of their real photos, in black and white with a thick yellow sticker outline; yellow highlighter labels; dashed
   arrows and red circles that draw themselves; circle portraits; a portrait torn into strips that assemble; photo cards
   on a timeline; stacked photos with guide lines; newspaper clippings. The director picks the layout for each line. */

const { fontFamily: DISPLAY } = loadDisplay();
const { fontFamily: SANS } = loadInter();
const { fontFamily: NEWS } = loadNews("italic", { weights: ["700"], subsets: ["latin"] });
const FPS = 30;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const E = { paper: "#f2f0ea", grid: "rgba(40,40,40,0.09)", ink: "#141414", yellow: "#ffd60a", hi: "rgba(255,214,10,0.92)", red: "#e2362b", orange: "#f06a2a", dim: "#5b5b5b" };

export type EdItem = { year: string; label: string; src?: string | null };
export type EdBeat = {
  kind: "editorial"; layout: "portrait" | "circle" | "strips" | "timeline" | "stack" | "headline" | "quote" | "scene";
  bullets?: string[]; bullet_at?: number[]; quote?: string; sync?: [number, number];  // points that explain the frame; a person's exact words (the quote layout)
  src?: string | null; cut?: string | null; srcs?: string[]; name?: string; role?: string; label?: string; year?: string;
  items?: EdItem[]; outlet?: string; headline?: string; dek?: string; credit?: string;
};

export function Editorial({ b, talk, step = 1 }: { b: EdBeat; talk: number; step?: number }) {
  const f = Math.floor(useCurrentFrame() / step) * step;
  const L = { portrait: Portrait, circle: Circle, strips: Strips, timeline: Timeline, stack: Stack, headline: Headline, quote: QuoteCard, scene: Scene }[b.layout];
  return (
    <AbsoluteFill>
      <GridPaper />
      {L ? <L b={b} f={f} talk={talk} /> : null}
      {b.credit && <div style={{ position: "absolute", right: 36, bottom: 22, fontFamily: SANS, fontSize: 15, color: E.dim, opacity: 0.8 }}>{b.credit}</div>}
    </AbsoluteFill>
  );
}

/** The modern Vox ground: white paper with a light grid. Every present-day frame sits on it (paper is for the past). */
export function GridPaper() {
  return (
    <AbsoluteFill style={{ background: E.paper }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${E.grid} 1.5px, transparent 1.5px), linear-gradient(90deg, ${E.grid} 1.5px, transparent 1.5px)`, backgroundSize: "54px 54px" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.12) 100%)" }} />
    </AbsoluteFill>
  );
}

/* ---------- small pieces ---------- */
const pop = (f: number, at: number, cfg = { damping: 14, stiffness: 140 }) => (f < at ? 0 : spring({ frame: f - at, fps: FPS, config: cfg }));
const wipe = (f: number, at: number, len = 14) => interpolate(f, [at, at + len], [0, 100], clamp);

/** Text on a yellow highlighter stroke that sweeps in. */
function Hl({ children, f, at, size = 64, font = DISPLAY, style }: { children: React.ReactNode; f: number; at: number; size?: number; font?: string; style?: React.CSSProperties }) {
  const w = wipe(f, at);
  return (
    <span style={{ fontFamily: font, fontSize: size, lineHeight: 1.15, color: E.ink, opacity: w > 0 ? 1 : 0,
      backgroundImage: `linear-gradient(transparent 12%, ${E.hi} 12%, ${E.hi} 90%, transparent 90%)`, backgroundRepeat: "no-repeat",
      backgroundSize: `${w}% 100%`, WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone", padding: "0 10px", ...style }}>{children}</span>
  );
}

/** A black-and-white cut-out of a real photo with a thick yellow sticker outline (the subject was lifted from its photo). */
// the black and white and the yellow outline are baked into the image by editorial.lift (cheap to draw on every frame)
function Sticker({ src, height }: { src: string; height: number }) {
  return (
    <div style={{ position: "relative" }}>
      <Img src={staticFile(src)} style={{ height, width: "auto", display: "block", filter: "drop-shadow(0 18px 20px rgba(0,0,0,0.3))" }} />
      <Tape x="38%" y={-6} rot={-5} w={170} />
    </div>
  );
}

/** A dashed arrow that draws itself from (x1,y1) to (x2,y2), curving. */
function Arrow({ x1, y1, x2, y2, f, at, color = E.orange, bend = -0.35 }: { x1: number; y1: number; x2: number; y2: number; f: number; at: number; color?: string; bend?: number }) {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const d = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
  const t = interpolate(f, [at, at + 18], [0, 1], clamp);
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = (a: number) => `${x2 - 26 * Math.cos(ang + a)},${y2 - 26 * Math.sin(ang + a)}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs><mask id={`m${at}${x1}`}><path d={d} stroke="#fff" strokeWidth={12} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} /></mask></defs>
      <path d={d} stroke={color} strokeWidth={5} fill="none" strokeDasharray="14 12" strokeLinecap="round" mask={`url(#m${at}${x1})`} />
      {t >= 1 && <polygon points={`${x2},${y2} ${head(0.45)} ${head(-0.45)}`} fill={color} />}
    </svg>
  );
}

/** A hand-drawn red ring that draws itself around a spot: one ellipse, slightly tilted, overshooting its start. */
function Ring({ cx, cy, rx, ry, f, at }: { cx: number; cy: number; rx: number; ry: number; f: number; at: number }) {
  const t = interpolate(f, [at, at + 16], [0, 1], clamp);
  if (t <= 0) return null;
  const d = `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx - 6} ${cy - 18}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={d} transform={`rotate(-4 ${cx} ${cy})`} stroke={E.red} strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
    </svg>
  );
}

/** A photo printed on paper: torn white border, halftone dots, a strip of tape; every photo on the grid looks like this. */
function Print({ src, w, h, seed, gray = 1 }: { src: string; w: number; h: number; seed: number; gray?: number }) {
  return (
    <div style={{ position: "relative", filter: "drop-shadow(0 16px 22px rgba(0,0,0,0.35))" }}>
      <div style={{ background: "#fbf8f1", clipPath: tornClip(seed, 1.1), padding: 14 }}>
        <div style={{ position: "relative" }}>
          <Img src={staticFile(src)} style={{ width: w, height: h, objectFit: "cover", display: "block", filter: `grayscale(${gray}) contrast(1.15) sepia(${0.12 * gray})` }} />
          <Halftone o={gray} />
        </div>
      </div>
      <Tape x={w / 2 - 70} y={-18} rot={(seed % 7) - 3} />
    </div>
  );
}

/** A strip of translucent tape. */
function Tape({ x, y, rot, w = 150 }: { x: number | string; y: number | string; rot: number; w?: number }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: 40, background: "rgba(236,214,150,0.78)", transform: `rotate(${rot}deg)`,
    boxShadow: "0 2px 4px rgba(0,0,0,0.12)", clipPath: "polygon(2% 0,98% 4%,100% 50%,97% 100%,3% 96%,0 50%)", zIndex: 2 }} />;
}

/** A circle with a torn paper edge (as a CSS polygon). */
function tornCircle(seed: number, r = 50): string {
  const n = 72;
  return `polygon(${Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2, rr = r - rnd(seed * 13 + k) * 1.6;
    return `${(50 + rr * Math.cos(a)).toFixed(2)}% ${(50 + rr * Math.sin(a)).toFixed(2)}%`;
  }).join(", ")})`;
}

/** A halftone dot screen over a photo: the printed-on-paper look. */
const Halftone = ({ o = 0.9 }: { o?: number }) => (
  <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,0,0,0.22) 1px, transparent 1.6px)", backgroundSize: "5px 5px", mixBlendMode: "multiply", opacity: o }} />
);

type P = { b: EdBeat; f: number; talk: number };

/** A font size that keeps a text inside its width (so no word runs off the frame). */
const fit = (text: string | undefined, base: number, width: number, k = 0.55) => Math.min(base, width / (Math.max(1, (text ?? "").length) * k));

/** Points that explain the frame, landing one by one, each on a yellow dotted rule. */
function Points({ items, f, at, x, y, w, size = 34, when, talk = 300 }: { items?: string[]; f: number; at: number; x: number; y: number; w: number; size?: number; when?: number[]; talk?: number }) {
  if (!items?.length) return null;
  const card = interpolate(f, [at - 6, at], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: x - 30, top: y - 26, width: w + 60, padding: "26px 30px 24px", background: "#fbfaf6", boxShadow: "0 16px 30px rgba(0,0,0,0.18)",
      borderLeft: `8px solid ${E.yellow}`, opacity: card, transform: `translateY(${(1 - card) * 20}px)` }}>
      {items.slice(0, 3).map((t, k) => {
        const t0 = when && when[k] !== undefined ? Math.max(at + k * 6, Math.round(when[k] * talk) - 4) : at + k * 12;  // on its words
        const o = interpolate(f, [t0, t0 + 8], [0, 1], clamp);
        return (
          <div key={k} style={{ display: "flex", gap: 14, alignItems: "baseline", marginTop: k ? 18 : 0, opacity: o, transform: `translateX(${(1 - o) * -30}px)` }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: E.yellow, flex: "none", transform: "translateY(2px)", boxShadow: "0 0 0 3px rgba(0,0,0,0.08)" }} />
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: fit(t, size, w - 40, 0.5), lineHeight: 1.25, color: E.ink, borderBottom: `4px dotted ${E.yellow}`, paddingBottom: 4 }}>{t}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- layouts ---------- */
/** A person, cut out of their real photo with a yellow sticker outline, rises into frame; their name lands on a highlighter
 * stroke, the role beneath, and a dashed arrow points from the name to them. */
function Portrait({ b, f, talk }: P) {
  const s = pop(f, 0, { damping: 16, stiffness: 110 });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", right: 120, bottom: -20, transform: `translateY(${(1 - s) * 700}px)` }}>{b.cut && <Sticker src={b.cut} height={960} />}</div>
      <div style={{ position: "absolute", left: 130, top: 300, width: 900 }}>
        <div><Hl f={f} at={8} size={fit(b.name, 104, 860, 0.5)}>{b.name}</Hl></div>
        {b.role && <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 34, color: E.dim, marginTop: 22, letterSpacing: 1, opacity: interpolate(f, [16, 26], [0, 1], clamp) }}>{b.role.toUpperCase()}</div>}
        {b.label && <div style={{ marginTop: 44 }}><Hl f={f} at={30} size={fit(b.label, 50, 860, 0.55)} font={SANS} style={{ fontWeight: 800 }}>{b.label}</Hl></div>}
      </div>
      <Points items={b.bullets} f={f} at={40} x={130} y={640} w={820} when={b.bullet_at} talk={talk} />
      <Arrow x1={760} y1={560} x2={1180} y2={640} f={f} at={24} />
    </AbsoluteFill>
  );
}

/** A photo in a circle frame, a tilted yellow label and a year underlined in red: "ASSASSINATED 1865". */
function Circle({ b, f, talk }: P) {
  const s = pop(f, 0);
  const lab = pop(f, 14, { damping: 13, stiffness: 150 });
  const u = wipe(f, 28, 12);
  return (
    <AbsoluteFill>
      {/* a photo cut out in a torn paper circle, on a slightly larger paper disc, taped to the grid */}
      <div style={{ position: "absolute", left: 1060 - 350, top: 540 - 350, width: 700, height: 700, transform: `scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * -8}deg)`, opacity: s,
        filter: "drop-shadow(0 24px 30px rgba(0,0,0,0.32))" }}>
        <div style={{ position: "absolute", inset: 0, background: "#fbf8f1", clipPath: tornCircle(7) }} />
        <div style={{ position: "absolute", inset: 22, clipPath: tornCircle(11, 49.5), background: "#e9e1cf" }}>
          {b.src && <Img src={staticFile(b.src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) sepia(0.3) contrast(1.12)" }} />}
          <Halftone o={0.8} />
        </div>
        <Tape x={260} y={-8} rot={-6} w={180} />
      </div>
      {b.name && <div style={{ position: "absolute", left: 130, top: 250, width: 560, opacity: interpolate(f, [6, 14], [0, 1], clamp) }}><Hl f={f} at={6} size={fit(b.name, 52, 540, 0.55)} font={SANS} style={{ fontWeight: 800 }}>{b.name}</Hl></div>}
      <Points items={b.bullets} f={f} at={34} x={130} y={380} w={560} size={32} when={b.bullet_at} talk={talk} />
      <Ring cx={1060} cy={540} rx={380} ry={372} f={f} at={Math.max(70, Math.round(talk * 0.55))} />
      {!!b.bullets?.length && <Arrow x1={620} y1={420} x2={760} y2={470} f={f} at={30} color={E.yellow} bend={-0.2} />}
      {b.label && (
        <div style={{ position: "absolute", left: 1250, top: 640, maxWidth: 600, transform: `translateX(${(1 - lab) * 500}px) rotate(-4deg)`, opacity: lab,
          background: E.yellow, padding: "16px 36px", clipPath: "polygon(3% 0, 100% 6%, 97% 100%, 0 92%)" }}>
          <span style={{ fontFamily: DISPLAY, fontSize: fit(b.label, 70, 1060, 0.55), lineHeight: 1.05, color: E.ink, letterSpacing: 2, textTransform: "uppercase" }}>{b.label}</span>
        </div>
      )}
      {b.year && (
        <div style={{ position: "absolute", left: 1290, top: 790, fontFamily: DISPLAY, fontSize: 76, color: E.ink, opacity: u > 0 ? 1 : 0,
          backgroundImage: `linear-gradient(transparent 70%, ${E.red} 70%, ${E.red} 86%, transparent 86%)`, backgroundRepeat: "no-repeat", backgroundSize: `${u}% 100%` }}>{b.year}</div>
      )}
    </AbsoluteFill>
  );
}

/** A portrait torn into strips that fly in one by one and settle, a little out of line, over a yellow sheet. */
function Strips({ b, f, talk }: P) {
  const n = 6, W = 620, H = 820, x0 = 260, y0 = 130;
  const sheet = pop(f, 0);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x0 + 140, top: y0 + 90, width: 360, height: 640, background: E.yellow, transform: `rotate(4deg) scale(${sheet})` }} />
      {Array.from({ length: n }).map((_, k) => {
        const s = pop(f, 4 + k * 6, { damping: 13, stiffness: 120 });
        const dy = (k % 2 ? -1 : 1) * (1 - s) * 900;
        const off = (rnd(k * 7 + 3) - 0.5) * 30, rot = (rnd(k * 5 + 1) - 0.5) * 5;
        const l = (k / n) * 100, r = ((k + 1) / n) * 100;
        const clip = `polygon(${l}% ${rnd(k) * 4}%, ${r}% ${rnd(k + 9) * 4}%, ${r + (rnd(k + 2) - 0.5) * 3}% 100%, ${l + (rnd(k + 4) - 0.5) * 3}% ${96 + rnd(k + 6) * 4}%)`;
        return (
          <div key={k} style={{ position: "absolute", left: x0, top: y0, width: W, height: H, transform: `translate(${off * s}px, ${dy + off * 0.6}px) rotate(${rot * s}deg)`,
            filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.3))" }}>
            {b.src && <Img src={staticFile(b.src)} style={{ width: W, height: H, objectFit: "cover", clipPath: clip, filter: `grayscale(${k % 3 === 1 ? 0.2 : 1}) sepia(${k % 3 === 1 ? 0.6 : 0.25}) contrast(1.1)` }} />}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1040, top: 330, width: 780 }}>
        {b.label && <div><Hl f={f} at={4 + n * 6 + 4} size={fit(b.label, 96, 1500, 0.55)} font={SANS} style={{ fontWeight: 900 }}>{b.label}</Hl></div>}
        {b.name && <div style={{ fontFamily: DISPLAY, fontSize: fit(b.name, 60, 760, 0.5), color: E.ink, marginTop: 30, opacity: interpolate(f, [4 + n * 6 + 10, 4 + n * 6 + 20], [0, 1], clamp) }}>{b.name}</div>}
      </div>
      <Points items={b.bullets} f={f} at={4 + n * 6 + 24} x={1040} y={700} w={780} size={32} when={b.bullet_at} talk={talk} />
    </AbsoluteFill>
  );
}

/** Dated moments on a yellow line: the line draws, and each card drops in on its turn. */
function Timeline({ b, f, talk }: P) {
  const items = (b.items ?? []).slice(0, 4);
  const n = Math.max(1, items.length);
  const line = interpolate(f, [4, 22], [0, 1], clamp);
  const gap = 1500 / n;
  return (
    <AbsoluteFill>
      {b.label && <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center" }}><Hl f={f} at={0} size={80}>{b.label}</Hl></div>}
      <div style={{ position: "absolute", left: 160, top: 860, height: 18, width: 1600 * line, background: E.yellow, boxShadow: "0 0 18px rgba(255,214,10,0.5)" }} />
      {items.map((it, k) => {
        const at = 14 + Math.round((k / n) * talk * 0.55);
        const s = pop(f, at);
        const cx = 210 + gap * k + gap / 2;
        return (
          <div key={k} style={{ position: "absolute", left: cx - 180, top: 230, width: 360, opacity: s, transform: `translateY(${(1 - s) * -80}px)`, textAlign: "center" }}>
            {it.src ? <div style={{ transform: `rotate(${(k % 2 ? 2 : -2)}deg)` }}><Print src={it.src} w={332} h={250} seed={k * 7 + 5} /></div> : <div style={{ height: 286 }} />}
            <div style={{ marginTop: -8, display: "inline-block", background: E.yellow, padding: "10px 18px", fontFamily: SANS, fontWeight: 800, fontSize: 26, color: E.ink, lineHeight: 1.2 }}>{it.label}</div>
            <div style={{ width: 0, height: 0, margin: "14px auto 0", borderLeft: "16px solid transparent", borderRight: "16px solid transparent", borderTop: `22px solid ${E.ink}` }} />
            <div style={{ marginTop: 200, fontFamily: DISPLAY, fontSize: 72, color: E.ink }}>{it.year}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Photos dropped on the grid, overlapping, with dashed guide lines drawing out from the centre and a marker stroke. */
function Stack({ b, f, talk }: P) {
  const srcs = (b.srcs ?? []).slice(0, 3);
  const spots = [[110, 140, -3], [700, 330, 2], [1280, 120, -2]];  // side by side, overlapping only at the edges
  const lines = interpolate(f, [2, 24], [0, 1], clamp);
  const marker = interpolate(f, [30, 44], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[[960, 540, 0, 0], [960, 540, 1920, 0], [960, 540, 0, 1080], [960, 540, 1920, 1080], [0, 540, 1920, 540]].map(([x1, y1, x2, y2], k) => (
          <line key={k} x1={x1} y1={y1} x2={x1 + (x2 - x1) * lines} y2={y1 + (y2 - y1) * lines} stroke="#222" strokeWidth={3} strokeDasharray="16 14" opacity={0.55} />
        ))}
      </svg>
      {/* the marker stroke sits on the paper, under the photos (drawn first), never across them */}
      <div style={{ position: "absolute", left: 640, top: 90, width: 30, height: 640 * marker, background: "rgba(245,140,200,0.75)", transform: "rotate(-62deg)", transformOrigin: "top" }} />
      {srcs.map((src, k) => {
        const [x, y, r] = spots[k];
        const s = pop(f, 6 + k * 8);
        return (
          <div key={k} style={{ position: "absolute", left: x, top: y, transform: `translateY(${(1 - s) * 500}px) rotate(${r * s}deg)`, opacity: s }}>
            <Print src={src} w={560} h={380} seed={k * 11 + 3} />
          </div>
        );
      })}
      {b.label && <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, textAlign: "center" }}><Hl f={f} at={34} size={fit(b.label, 78, 1500, 0.55)}>{b.label}</Hl></div>}
      <Points items={b.bullets} f={f} at={44} x={1240} y={664} w={600} size={30} when={b.bullet_at} talk={talk} />
    </AbsoluteFill>
  );
}

/** A scene: one raw photo of a real place or moment, full screen and unframed (a breath between pages of words). It
 * opens a little wide and pushes in slowly; its caption lands on a kraft label; any points sit on a card at the side. */
function Scene({ b, f, talk }: P) {
  const k = interpolate(f, [0, Math.max(60, talk)], [0, 1], clamp);
  const o = interpolate(f, [0, 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {b.src && <Img src={staticFile(b.src)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: o, transform: `scale(${1.04 + 0.08 * k})`, filter: "saturate(0.92) contrast(1.05)" }} />}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      {b.label && (
        <div style={{ position: "absolute", right: 70, bottom: 70, maxWidth: 900, opacity: interpolate(f, [14, 24], [0, 1], clamp), transform: "rotate(-1.5deg)", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.4))" }}>
          <div style={{ background: "#d8c29d", clipPath: tornClip(41, 2.2), padding: "14px 30px 12px", fontFamily: SANS, fontWeight: 800, fontSize: fit(b.label, 40, 860, 0.55), color: E.ink, textTransform: "uppercase", letterSpacing: 1 }}>{b.label}</div>
        </div>
      )}
      <Points items={b.bullets} f={f} at={30} x={1240} y={140} w={600} size={30} when={b.bullet_at} talk={talk} />
    </AbsoluteFill>
  );
}

/** A person's exact words: the person cut out of their real photo with the yellow sticker outline, their name on a
 * highlighter stroke, and the quote typing itself out in a big serif, the key words swept with the marker. */
function QuoteCard({ b, f, talk }: P) {
  const s = pop(f, 0, { damping: 16, stiffness: 110 });
  const q = b.quote ?? "";
  // typed while the narrator says the quote (found in the recorded voice), else from the moment the card lands
  const [t0, t1] = b.sync ? [Math.round(talk * b.sync[0]) - 4, Math.round(talk * b.sync[1])] : [14, 14 + Math.min(80, q.length * 0.8)];
  const shown = Math.round(interpolate(f, [t0, Math.max(t0 + 10, t1)], [0, q.length], clamp));
  const size = q.length > 150 ? 44 : q.length > 90 ? 54 : 64;
  return (
    <AbsoluteFill>
      {b.cut && <div style={{ position: "absolute", right: 70, bottom: -20, transform: `translateY(${(1 - s) * 700}px)` }}><Sticker src={b.cut} height={860} /></div>}
      <div style={{ position: "absolute", left: 110, top: 150, width: b.cut ? 1060 : 1620 }}>
        <div style={{ position: "relative", filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.25))", transform: `rotate(-1deg) translateY(${(1 - s) * 40}px)` }}>
          <div style={{ background: "#fbf8f1", clipPath: tornClip(21, 1.3), padding: "44px 52px 46px", fontFamily: NEWS, fontStyle: "italic", fontWeight: 700, fontSize: size, lineHeight: 1.22, color: E.ink }}>
            <span style={{ color: E.red, fontSize: size * 1.5, lineHeight: 0 }}>“</span>{q.slice(0, shown)}{shown >= q.length ? "”" : ""}
          </div>
          <Tape x={-24} y={-10} rot={-24} w={170} />
        </div>
        <div style={{ marginTop: 40, opacity: interpolate(f, [10, 18], [0, 1], clamp) }}><Hl f={f} at={10} size={fit(b.name, 56, 900, 0.55)} font={SANS} style={{ fontWeight: 800 }}>{b.name}</Hl></div>
        {b.role && <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: E.dim, marginTop: 16, letterSpacing: 1 }}>{b.role.toUpperCase()}</div>}
      </div>
      {b.cut && <Arrow x1={1000} y1={900} x2={1230} y2={820} f={f} at={30} />}
    </AbsoluteFill>
  );
}

/** A newspaper clipping of a real headline: kicker, italic serif headline swept with the highlighter, the standfirst, and
 * the person it is about cut out beside it when there is one. */
function Headline({ b, f }: P) {
  const s = pop(f, 0, { damping: 16, stiffness: 120 });
  const cut = pop(f, 16, { damping: 16, stiffness: 110 });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 150, width: b.cut ? 960 : 1560, transform: `translateY(${(1 - s) * 80}px) rotate(-1deg)`, opacity: s,
        background: "#f4efe3", clipPath: tornClip(33, 1.1), padding: "44px 50px 40px", filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.25))" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 26, letterSpacing: 3, color: E.ink }}>{(b.outlet || "").toUpperCase()}{b.year ? `  ·  ${b.year}` : ""}</div>
        <div style={{ marginTop: 18, fontFamily: NEWS, fontStyle: "italic", fontWeight: 700, fontSize: b.cut ? 70 : 88, lineHeight: 1.12 }}><Hl f={f} at={14} size={b.cut ? 70 : 88} font={NEWS} style={{ fontStyle: "italic", fontWeight: 700, padding: "0 6px" }}>{b.headline}</Hl></div>
        {b.dek && <div style={{ marginTop: 26, fontFamily: SANS, fontSize: 32, lineHeight: 1.4, color: "#333", opacity: interpolate(f, [26, 36], [0, 1], clamp) }}>{b.dek}</div>}
        <div style={{ marginTop: 34, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26, opacity: 0.35 }}>
          {[0, 1, 2].map((c) => <div key={c}>{Array.from({ length: 7 }).map((_, r) => <div key={r} style={{ height: 9, background: "#888", margin: "11px 0", width: `${70 + rnd(c * 9 + r) * 30}%` }} />)}</div>)}
        </div>
      </div>
      {b.cut && <div style={{ position: "absolute", right: 40, bottom: -20, maxWidth: 780, transform: `translateY(${(1 - cut) * 700}px)` }}><Sticker src={b.cut} height={820} /></div>}
    </AbsoluteFill>
  );
}
