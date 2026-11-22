import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadCourier } from "@remotion/google-fonts/CourierPrime";
import { loadFont as loadDisplay } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadNews } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { Dock } from "../archive/Archive";
import { BrassDefs, K, Pin, StringLine, rnd, tornClip } from "../explainer/collage";
import { Build, type BuildPiece } from "./Build";
import { Editorial, GridPaper, type EdBeat } from "./Editorial";

/* The Vox collage documentary: a paper board where facts land on sticky notes, quotes are typed onto scraps, things get
   joined with red string, real archival prints and collage cut-outs are taped down, and the big moves are printed as a
   newspaper chart. No camera travel: each piece zooms in once as it arrives and then holds still while it is read. */

const { fontFamily: HAND } = loadCaveat();
const { fontFamily: TYPEW } = loadCourier();
const { fontFamily: DISPLAY } = loadDisplay();
const { fontFamily: NEWS } = loadNews();
const { fontFamily: COND } = loadOswald();
const { fontFamily: SANS } = loadInter();

export const FPS = 30;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const C = { board: "#d9ccb4", ink: "#1d1b18", paper: "#f6f1e6", note: "#f3d25a", note2: "#f6c4a8", note3: "#cfe3b0", red: "#c0322a", hi: "rgba(242,205,70,0.85)", dim: "#6f6a60" };

export type BBeat =
  | { kind: "notes"; notes: string[]; source?: string }
  | { kind: "scrap"; text: string; highlight?: string; who?: string; when?: string; heading?: string; sync?: [number, number] }
  | { kind: "connect"; nodes: string[]; shape: "chain" | "star" }
  | { kind: "photo"; src: string; caption?: string; credit?: string; cutout?: boolean }
  | { kind: "newshead"; items: { outlet: string; date: string; headline: string }[] }
  | { kind: "newschart"; outlet: string; title: string; points: { label: string; value: number; display: string }[]; source?: string }
  | { kind: "title"; title: string; kicker?: string }
  | { kind: "plate" }
  | { kind: "build"; pieces: BuildPiece[] }
  | EdBeat;  // the Vox editorial edit: modern layouts for the present day (Editorial.tsx)  // the build-up edit: pieces land on their words (Build.tsx)
export type BLine = { speech?: string; audio?: string | null; seconds: number; pause?: number; beat: BBeat; sfx?: string; plate?: string | null; side?: boolean; rate?: number; layers?: string[];
  era?: "past" | "present"; who?: string };  // who: the person this line quotes (a lower third in the Vox skill)  // era (the "modern look for current events" skill): present = colour, zoom and modern news cards  // rate: a dubbed line sped up to fit the original slot
export type BoardProps = { speed?: number; lines: BLine[]; narrator?: { image: string; name: string } | null;
  vox?: boolean;
  plate_pieces?: Record<string, PlatePiece[]>; blank?: string | null;
  grid?: boolean };  // the editorial edit: present-day frames on the modern grid, paper only for the past  // Vox: a collage background assembles from its pieces
type PlatePiece = { x: number; y: number; w: number; h: number };  // fractions of the frame  // the "Vox motion & story" skill: seamless transitions, constant motion on threes, lower thirds, marked headlines

export function layoutBoard(p: BoardProps) {
  const speed = p.speed ?? 1;
  let at = 0;
  const lines = p.lines.map((l) => {
    const talk = l.audio ? Math.round((l.seconds / speed) * FPS) : Math.round(l.seconds * FPS);
    const frames = talk + Math.round(Math.max(0.12, Math.min(0.9, l.pause ?? 0.3)) * FPS);
    const r = { ...l, start: at, talk, frames };
    at += frames;
    return r;
  });
  return { lines, total: at + 20 };
}

export const Board = (p: BoardProps) => {
  const { lines } = layoutBoard(p);
  const speed = p.speed ?? 1;
  const narrator = p.narrator ?? { image: "hosts/anchor/talk.png", name: "Narrator" };  // same dock as the archival cut
  // how each shot arrives (and the one before leaves): a mix of moves, never the same one twice in a row; a title card
  // always pushes in through the frame
  const moves = lines.map((l, i) => {
    if (i === 0) return null;
    if (l.beat.kind === "title" || lines[i - 1].beat.kind === "title") return "zoom" as Move;
    const pick = MOVES[(i * 7 + 3) % MOVES.length];
    return pick;
  });
  for (let i = 2; i < moves.length; i++) if (moves[i] && moves[i] === moves[i - 1]) moves[i] = MOVES[(MOVES.indexOf(moves[i]!) + 1) % MOVES.length];
  // the present is drawn on the modern grid when the film uses the editorial edit; paper and its collages are for the past
  const grid = (l: BLine) => Boolean(p.grid && l.era === "present" && l.beat.kind !== "title");
  // a collage background builds itself the first time it appears (Vox); a line whose piece is the collage itself does not
  const assembles = (l: BLine, i: number) => Boolean(!grid(l) && p.vox && l.plate && p.plate_pieces?.[l.plate] && l.plate !== lines[i - 1]?.plate && l.beat.kind !== "plate");
  return (
    <AbsoluteFill style={{ background: C.board }}>
      <Audio src={staticFile("sfx/bed.wav")} volume={0.07} loop />
      {lines.map((l, i) => {
        const dur = l.frames + (i === lines.length - 1 ? 20 : 0);
        const scene = (
          <>
            {grid(l) ? <GridPaper />
              : l.layers?.length ? <Layered srcs={l.layers} paper={l.plate ?? undefined} dark={l.beat.kind === "title"} />
              : assembles(l, i)
                ? <Assemble src={l.plate!} pieces={p.plate_pieces![l.plate!]} paper={p.blank ?? undefined} talk={l.talk} />
                : <Plate src={l.plate ?? undefined} dark={l.beat.kind === "title"} close={l.beat.kind === "plate"} />}
            {assembles(l, i)
              ? <Sequence from={assemblyLength(p.plate_pieces![l.plate!].length, l.talk)}>
                  <Piece beat={l.beat} talk={Math.max(30, l.talk - assemblyLength(p.plate_pieces![l.plate!].length, l.talk))} index={i} area={l.side ? SIDE : FULL} now={l.era === "present"} step={3} />
                </Sequence>
              : <Piece beat={l.beat} talk={l.talk} index={i} area={l.side ? SIDE : FULL} now={l.era === "present"} step={p.vox ? 3 : 1} />}
          </>
        );
        if (!p.vox) return (
          <Sequence key={i} from={l.start} durationInFrames={dur}>
            {scene}
            {l.audio && <Audio src={staticFile(l.audio)} playbackRate={l.rate ?? speed} />}
            {l.sfx && <Audio src={staticFile(`sfx/${l.sfx}.wav`)} volume={0.32} />}
            {l.audio && <Dock image={narrator.image} name={narrator.name} audio={l.audio} speed={speed} talk={l.talk} />}
          </Sequence>
        );
        // Vox: the pictures start T frames early and overlap the shot before, so one scene flows into the next; the voice
        // and the pieces keep their exact times
        const lead = i === 0 ? 0 : T;
        return (
          <Sequence key={i} from={l.start - lead} durationInFrames={dur + lead}>
            <Flow into={i === 0 ? null : moves[i]} out={i === lines.length - 1 ? null : moves[i + 1]} lead={lead} dur={dur + lead} pull={i % 2 === 1}>
              <Sequence from={lead}>{scene}</Sequence>
            </Flow>
            <Sequence from={lead}>
              {l.audio && <Audio src={staticFile(l.audio)} playbackRate={l.rate ?? speed} />}
              {l.sfx && <Audio src={staticFile(`sfx/${l.sfx}.wav`)} volume={0.32} />}
              {l.who && l.who !== lines[i - 1]?.who && <LowerThird who={l.who} talk={l.talk} />}
              {l.audio && <Dock image={narrator.image} name={narrator.name} audio={l.audio} speed={speed} talk={l.talk} />}
            </Sequence>
          </Sequence>
        );
      })}
      <Grain />
    </AbsoluteFill>
  );
};

/** A speaker tag, short: "NAME, ROLE · WHEN", never a photo caption; a long one is cut at a word, not mid-word. */
function tagOf(who: string, when?: string): string {
  const short = (t: string, n: number) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n)).replace(/[,;:]$/, "") + "…");
  const w = short(who.split(/\s+(?:speaking|addressing|during|at the|told)\b/)[0], 48);
  return (w + (when && w.length + when.length < 60 ? ` · ${when}` : "")).toUpperCase();
}

/* ---------------- Vox motion: transitions, drift, lower thirds ---------------- */
const T = 9;  // frames two shots overlap in a transition
const ease = (t: number) => t * t * (3 - 2 * t);

/** One shot's way in and out, plus the constant slow drift that keeps a held frame alive. A "pan" slides across the same
 * board (the next shot comes in from the right as this one leaves left); a "zoom" pushes through this shot into the next. */
type Move = "pan" | "zoom" | "reveal" | "rise" | "whip";
// pan: slide across; zoom: push in through the frame; reveal: arrive from a close-up and pull back (zoom out); rise: the
// next page slides up from below; whip: a fast blurred pan
const MOVES: Move[] = ["pan", "reveal", "zoom", "rise", "whip"];

/** One shot's way in and out, plus a constant slow drift so a held frame is never still: it alternately pushes in and
 * pulls out, so consecutive shots do not all creep the same way. */
function Flow({ into, out, lead, dur, pull, children }: { into: Move | null; out: Move | null; lead: number; dur: number; pull: boolean; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const a = into ? ease(interpolate(f, [0, lead], [0, 1], clamp)) : 1;  // 0 -> 1 as it arrives
  const b = out ? ease(interpolate(f, [dur - T, dur], [0, 1], clamp)) : 0;  // 0 -> 1 as it leaves
  const k = interpolate(f, [0, dur], [0, 1], clamp);
  let x = 0, y = 0, sc = pull ? 1.04 - 0.04 * k : 1 + 0.035 * k, op = 1, blur = 0;
  if (into === "pan") x += (1 - a) * 1920;
  if (into === "zoom") { sc *= 0.86 + 0.14 * a; op = a; }
  if (into === "reveal") { sc *= 1.45 - 0.45 * a; op = Math.min(1, a * 1.6); }
  if (into === "rise") y += (1 - a) * 1080;
  if (into === "whip") { x += (1 - a) * 1920; blur += (1 - a) * 18; }
  if (out === "pan") x -= b * 1920;
  if (out === "zoom") { sc *= 1 + 0.55 * b; op *= 1 - b; }
  if (out === "reveal") { sc *= 1 - 0.18 * b; op *= 1 - b; }
  if (out === "rise") y -= b * 1080;
  if (out === "whip") { x -= b * 1920; blur += b * 18; }
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${sc})`, opacity: op, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>;
}

/** Who is speaking, the first time a quoted person appears: a clean name card above the narrator's corner. */
function LowerThird({ who, talk }: { who: string; talk: number }) {
  const f = useCurrentFrame();
  const clean = who.split(/\s+(?:speaking|addressing|during|at the|told)\b/)[0];
  const [name0, ...role0] = clean.split(/,\s*/);
  const name = name0.slice(0, 40), role = role0.join(", ").length > 60 ? [role0.join(", ").slice(0, role0.join(", ").lastIndexOf(" ", 58)) + "…"] : role0;
  const s = spring({ frame: f - 6, fps: FPS, config: { damping: 18, stiffness: 140 } });
  const gone = interpolate(f, [Math.max(60, talk - 12), Math.max(72, talk)], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 440, bottom: 70, opacity: s * gone, transform: `translateX(${(1 - s) * -40}px)`, display: "flex", alignItems: "stretch" }}>
      <div style={{ width: 10, background: C.red }} />
      <div style={{ background: "rgba(255,255,255,0.96)", padding: "16px 30px 16px 22px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, color: "#111318", letterSpacing: -0.5 }}>{name}</div>
        {role.length > 0 && <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 27, color: "#4b5563", marginTop: 2 }}>{role.join(", ")}</div>}
      </div>
    </div>
  );
}

/* ---------------- the board ---------------- */
/** The background never travels. A "close" plate is a still close-up of the collage half (it lands once, like every piece). */
function Plate({ src, dark, close }: { src?: string; dark: boolean; close?: boolean }) {
  const f = useCurrentFrame();
  const k = close ? 1.85 + 0.1 * (1 - spring({ frame: f, fps: FPS, config: { damping: 18 } })) : 1;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {src && <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: "24% 50%", transform: `scale(${k})`,
        filter: dark ? "brightness(0.35) saturate(0.6)" : "saturate(0.85)" }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(40,28,10,0.45) 100%)" }} />
    </AbsoluteFill>
  );
}
/** A layered editorial background instead of a flat one: the chapter's own pictures as a faint, overlapping montage, tinted
 * so black becomes dark grey and white stays soft (low contrast, so it never fights the content), then washed with the paper
 * colour and textured with the paper itself. Still, like every background: nothing moves. */
const LAYOUT = [
  { left: "-4%", top: "-6%", width: "58%", height: "112%", rot: -2 },
  { left: "30%", top: "4%", width: "46%", height: "92%", rot: 1.5 },
  { left: "56%", top: "-8%", width: "50%", height: "116%", rot: -1 },
];
function Layered({ srcs, paper, dark }: { srcs: string[]; paper?: string; dark: boolean }) {
  const fade = "radial-gradient(ellipse at center, #000 45%, transparent 78%)";
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: dark ? "#2b2824" : C.board }}>
      {srcs.slice(0, 3).map((src, i) => {
        const b = LAYOUT[i];
        return (
          <Img key={i} src={staticFile(src)} style={{ position: "absolute", left: b.left, top: b.top, width: b.width, height: b.height,
            objectFit: "cover", transform: `rotate(${b.rot}deg)`, WebkitMaskImage: fade, maskImage: fade,
            // the tint: grey scale, blacks lifted to dark grey, whites pushed a little brighter
            filter: dark ? "grayscale(1) contrast(0.5) brightness(0.55)" : "grayscale(1) contrast(0.45) brightness(1.18) sepia(0.25)",
            opacity: dark ? 0.55 : 0.42 }} />
        );
      })}
      {paper && <Img src={staticFile(paper)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
        mixBlendMode: "multiply", opacity: dark ? 0.5 : 0.75, filter: dark ? "brightness(0.5)" : undefined }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(40,28,10,0.45) 100%)" }} />
    </AbsoluteFill>
  );
}

/** Vox: a collage background the first time it appears is built on screen. The shot opens on empty paper, each object's
 * piece (found by board.py) flies in from its nearest edge with a torn edge and snaps into place, one after another, and
 * then the rest of the collage settles in underneath. On threes, like the rest of the Vox motion. */
function Assemble({ src, pieces, paper, talk }: { src: string; pieces: PlatePiece[]; paper?: string; talk: number }) {
  const f = Math.floor(useCurrentFrame() / 3) * 3;
  const { first } = ASSEMBLY;
  const gap = assemblyGap(pieces.length, talk);
  const done = assemblyLength(pieces.length, talk);
  const rest = interpolate(f, [done, done + 12], [0, 1], clamp);
  const img = <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.85)" }} />;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {paper ? <Img src={staticFile(paper)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.85)" }} /> : <AbsoluteFill style={{ background: C.board }} />}
      <AbsoluteFill style={{ opacity: rest }}>{img}</AbsoluteFill>
      {pieces.map((pc, k) => {
        const at = first + gap * k;
        if (f < at || rest >= 1) return null;
        const s = spring({ frame: f - at, fps: FPS, config: { damping: 15, stiffness: 70, mass: 1 } });
        const cx = pc.x + pc.w / 2, cy = pc.y + pc.h / 2;
        // from the nearest edge: left pieces from the left, top ones from the top, bottom ones from below
        const [dx, dy] = cx < 0.2 ? [-1, 0] : cy < 0.3 ? [0, -1] : cy > 0.7 ? [0, 1] : [cx < 0.5 ? -1 : 1, 0];
        const tx = dx * (1 - s) * 1300, ty = dy * (1 - s) * 900;
        const rot = (k % 2 ? 1 : -1) * 8 * (1 - s);
        const poly = tornRect(pc, k);
        return (
          <AbsoluteFill key={k} style={{ transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`, transformOrigin: `${cx * 100}% ${cy * 100}%`,
            filter: `drop-shadow(0 ${14 * (1 - rest)}px ${18 * (1 - rest)}px rgba(40,30,15,${0.45 * (1 - rest)}))` }}>
            <AbsoluteFill style={{ clipPath: poly }}>{img}</AbsoluteFill>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

// one piece every half second (a beat between them, not everything at once); the words wait until the collage is built
const ASSEMBLY = { gap: 15, first: 4 };
const assemblyLength = (n: number, talk = 9999) => Math.min(ASSEMBLY.first + ASSEMBLY.gap * n + 14, Math.max(24, Math.round(talk * 0.32)));
// the gap between pieces shrinks on a short line, so the collage never holds the words back past a third of the line
const assemblyGap = (n: number, talk = 9999) => Math.max(4, Math.min(ASSEMBLY.gap, Math.floor((assemblyLength(n, talk) - ASSEMBLY.first - 14) / Math.max(1, n))));

/** A rectangle with torn paper edges, as a CSS polygon over the frame. */
function tornRect(p: PlatePiece, seed: number): string {
  const pts: string[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, n: number, k: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n, j = (rnd(seed * 31 + k * 7 + i) - 0.5) * 0.9;  // jitter, in % of the frame
      const x = (x0 + (x1 - x0) * t) * 100, y = (y0 + (y1 - y0) * t) * 100;
      pts.push(`${(x + (y0 === y1 ? 0 : j)).toFixed(2)}% ${(y + (x0 === x1 ? 0 : j)).toFixed(2)}%`);
    }
  };
  const { x, y, w, h } = p;
  edge(x, y, x + w, y, 14, 1); edge(x + w, y, x + w, y + h, 10, 2); edge(x + w, y + h, x, y + h, 14, 3); edge(x, y + h, x, y, 10, 4);
  return `polygon(${pts.join(", ")})`;
}

function Grain() {
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.35 }}>
      <svg width="100%" height="100%">
        <filter id="bg"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#bg)" opacity="0.4" />
      </svg>
    </AbsoluteFill>
  );
}

/** Where the words go: the right 60% when the background carries a collage on the left, else the whole board. */
type Area = { cx: number; w: number; side: boolean };
const SIDE: Area = { cx: 1420, w: 860, side: true };
const FULL: Area = { cx: 960, w: 1600, side: false };

/** Each piece zooms in ONCE as it lands, then holds still: the eye stays on the words, the camera never travels. */
function Piece({ beat, talk, index, area, now = false, step = 1 }: { beat: BBeat; talk: number; index: number; area: Area; now?: boolean; step?: number }) {
  const f = Math.floor(useCurrentFrame() / step) * step;  // step 3: graphics move "on threes" (10 fps), the Vox look
  const land = spring({ frame: f, fps: FPS, config: { damping: 18, stiffness: 120 } });
  const style: React.CSSProperties = { position: "absolute", inset: 0, transformOrigin: `${area.cx}px 500px`, transform: `scale(${1.12 - 0.12 * land})`, opacity: Math.min(1, land * 1.8) };
  switch (beat.kind) {
    case "notes": return <div style={style}><Notes b={beat} f={f} talk={talk} seed={index} area={area} /></div>;
    case "scrap": return <div style={style}><Scrap b={beat} f={f} talk={talk} seed={index} area={area} /></div>;
    case "connect": return <div style={style}><Connect b={beat} f={f} talk={talk} seed={index} /></div>;
    case "photo": return now && !beat.cutout ? <NowPhoto b={beat} f={f} talk={talk} seed={index} /> : <div style={style}><Photo b={beat} f={f} seed={index} /></div>;
    case "newshead": return now ? <NowHead b={beat} f={f} talk={talk} area={area} mark={step > 1} /> : <div style={style}><NewsHead b={beat} f={f} talk={talk} seed={index} area={area} mark={step > 1} /></div>;
    case "newschart": return now ? <NowChart b={beat} f={f} talk={talk} /> : <div style={style}><NewsChart b={beat} f={f} talk={talk} seed={index} /></div>;
    case "title": return <div style={style}><Title b={beat} f={f} /></div>;
    case "plate": return null;
    case "build": return <Build pieces={beat.pieces} talk={talk} now={now} step={step} />;
    case "editorial": return <Editorial b={beat} talk={talk} step={step} />;  // its pieces move, so the page itself does not zoom
  }
}

const TapeStrip = ({ x, y, rot, w = 130 }: { x: number | string; y: number | string; rot: number; w?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: 36, background: K.tape, transform: `rotate(${rot}deg)`, mixBlendMode: "multiply",
    clipPath: "polygon(2% 0,98% 4%,100% 50%,97% 100%,3% 96%,0 50%)" }} />
);

/** A fact, split into sticky notes that land one by one as the narrator reaches each part. A note is "BIG|small". */
function Notes({ b, f, talk, seed, area }: { b: Extract<BBeat, { kind: "notes" }>; f: number; talk: number; seed: number; area: Area }) {
  const n = Math.min(4, b.notes.length);
  const colors = [C.note, C.note2, C.note3, C.note];
  const cols = area.side ? Math.min(2, n) : n;
  const rows = Math.ceil(n / cols);
  const w = area.side ? (cols === 1 ? 560 : 390) : n <= 2 ? 560 : n === 3 ? 470 : 380;
  const h = Math.round(w * (rows > 1 ? 0.7 : 0.82));
  const gap = area.side ? 40 : 56;
  return (
    <AbsoluteFill>
      {b.notes.slice(0, n).map((t, i) => {
        const at = Math.round((i / n) * talk * 0.75);
        const s = spring({ frame: f - at, fps: FPS, config: { damping: 12, stiffness: 170 } });
        if (f < at) return null;
        const r = Math.floor(i / cols), c = i % cols;
        const inRow = Math.min(cols, n - r * cols);
        const x = area.cx - (inRow * w + (inRow - 1) * gap) / 2 + c * (w + gap);
        const y = 500 - (rows * h + (rows - 1) * gap) / 2 + r * (h + gap) + (rows === 1 ? (i % 2) * 50 - 25 : 0);
        const rot = (rnd(seed * 7 + i) - 0.5) * 7;
        const [big, small] = t.split("|");
        const bigSize = Math.min(w * 0.3, (w * 1.5) / Math.max(4, big.length));
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: w, transform: `scale(${1.25 - 0.25 * s}) rotate(${rot}deg)`, opacity: s, filter: "drop-shadow(0 16px 18px rgba(40,30,15,0.35))" }}>
            <div style={{ background: colors[i], height: h, padding: "30px 28px 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: bigSize, lineHeight: 1, color: C.ink, textAlign: "center" }}>{big}</div>
              {small && <div style={{ fontFamily: HAND, fontWeight: 500, fontSize: Math.max(36, w * 0.105), lineHeight: 1.05, color: C.ink, textAlign: "center" }}>{small}</div>}
            </div>
            <TapeStrip x={w / 2 - 65} y={-18} rot={rot * -0.6 - 3} />
          </div>
        );
      })}
      {b.source && <SourceTag text={b.source} f={f - Math.round(talk * 0.5)} />}
    </AbsoluteFill>
  );
}

function SourceTag({ text, f }: { text: string; f: number }) {
  if (f < 0) return null;
  const s = spring({ frame: f, fps: FPS, config: { damping: 14 } });
  return (
    <div style={{ position: "absolute", right: 110, bottom: 110, transform: `scale(${s}) rotate(-2deg)`, transformOrigin: "right center", filter: "drop-shadow(0 6px 8px rgba(40,30,15,0.3))" }}>
      <div style={{ background: K.kraft, clipPath: tornClip(31, 3), padding: "10px 22px 8px", fontFamily: TYPEW, fontWeight: 700, fontSize: 24, letterSpacing: "0.05em", color: C.ink }}>SOURCE: {text.toUpperCase()}</div>
    </div>
  );
}

/** A small torn scrap of paper, typed as it is read; the key words get a highlighter once typed. */
function Scrap({ b, f, talk, seed, area }: { b: Extract<BBeat, { kind: "scrap" }>; f: number; talk: number; seed: number; area: Area }) {
  // typed while the narrator says the quote (sync: when its first and last words are spoken), else across the line
  const [s0, s1] = b.sync ?? [0.05, 0.72];
  const shown = Math.floor(interpolate(f, [talk * s0 - 4, Math.max(talk * s0 + 10, talk * s1)], [0, b.text.length], clamp));
  const hi = b.highlight && b.text.includes(b.highlight) ? b.highlight : "";
  const i0 = hi ? b.text.indexOf(hi) : -1;
  const sweep = hi ? interpolate(shown, [i0, i0 + hi.length], [0, 100], clamp) : 0;
  const typed = b.text.slice(0, shown);
  const size = (b.text.length > 170 ? 50 : b.text.length > 110 ? 58 : 66) * (area.side ? 0.86 : 1);
  const width = area.side ? 860 : 1320;
  return (
    <AbsoluteFill style={{ justifyContent: "center" }}>
      <div style={{ position: "relative", width, marginLeft: area.cx - width / 2, transform: `rotate(${(rnd(seed) - 0.5) * 3}deg)`, filter: "drop-shadow(0 22px 26px rgba(40,30,15,0.4))" }}>
        <div style={{ background: C.paper, clipPath: tornClip(seed + 3, 1.6), padding: area.side ? "54px 60px 56px" : "64px 80px 60px" }}>
          {b.heading && <div style={{ fontFamily: TYPEW, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: C.red, marginBottom: 18 }}>{b.heading.toUpperCase()}</div>}
          <div style={{ fontFamily: b.who ? NEWS : TYPEW, fontSize: size, lineHeight: 1.32, color: C.ink, minHeight: size * 2.6 }}>
            {b.who && <span style={{ fontFamily: DISPLAY, color: C.red }}>“</span>}
            {i0 < 0 || shown <= i0 ? typed : (<>
              {typed.slice(0, i0)}
              <span style={{ backgroundImage: `linear-gradient(${C.hi}, ${C.hi})`, backgroundRepeat: "no-repeat", backgroundSize: `${sweep}% 100%` }}>{typed.slice(i0, i0 + hi.length)}</span>
              {typed.slice(i0 + hi.length)}
            </>)}
            {b.who && shown >= b.text.length && <span style={{ fontFamily: DISPLAY, color: C.red }}>”</span>}
          </div>
        </div>
        <svg width="60" height="60" style={{ position: "absolute", left: "50%", top: -14, overflow: "visible" }}><BrassDefs /><Pin x={0} y={20} /></svg>
        {b.who && (
          <div style={{ position: "absolute", right: 40, top: "100%", marginTop: -14, maxWidth: "80%", transform: "rotate(-2deg)", filter: "drop-shadow(0 6px 8px rgba(40,30,15,0.3))" }}>
            <div style={{ background: K.kraft, clipPath: tornClip(seed + 9, 3), padding: "10px 24px 8px", fontFamily: COND, fontWeight: 700, fontSize: 30, letterSpacing: 2, color: C.ink }}>
              {tagOf(b.who, b.when)}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

/** Things joined with red string, pin by pin, like the topology films: a chain, or a hub with spokes. */
function Connect({ b, f, talk, seed }: { b: Extract<BBeat, { kind: "connect" }>; f: number; talk: number; seed: number }) {
  const n = Math.min(6, b.nodes.length);
  let pts: [number, number][];
  if (b.shape === "star" && n >= 3) {
    const r = 330;
    pts = [[960, 540], ...Array.from({ length: n - 1 }, (_, i) => {
      const a = -Math.PI / 2 + (i / (n - 1)) * Math.PI * 2;
      return [960 + Math.cos(a) * r * 1.55, 540 + Math.sin(a) * r] as [number, number];
    })];
  } else {
    pts = Array.from({ length: n }, (_, i) => [260 + (i * 1400) / Math.max(1, n - 1), 540 + (i % 2 ? 120 : -120)] as [number, number]);
  }
  const links: [number, number][] = b.shape === "star" && n >= 3 ? pts.slice(1).map((_, i) => [0, i + 1]) : pts.slice(1).map((_, i) => [i, i + 1]);
  const per = (talk * 0.8) / Math.max(1, links.length);
  const nodeAt = (i: number) => (b.shape === "star" && n >= 3 ? (i === 0 ? 0 : per * i) : per * Math.max(0, i - 0.5));
  return (
    <AbsoluteFill>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <BrassDefs />
        {links.map(([a, c], k) => <StringLine key={k} a={pts[a]} b={pts[c]} t={interpolate(f, [k * per + 6, k * per + per * 0.9], [0, 1], clamp)} seed={seed + k} />)}
      </svg>
      {b.nodes.slice(0, n).map((t, i) => {
        const s = spring({ frame: f - nodeAt(i), fps: FPS, config: { damping: 13, stiffness: 160 } });
        if (f < nodeAt(i)) return null;
        const hub = b.shape === "star" && i === 0;
        return (
          <div key={i} style={{ position: "absolute", left: pts[i][0], top: pts[i][1], transform: `translate(-50%, -50%) scale(${s}) rotate(${(rnd(seed + i) - 0.5) * 6}deg)`,
            filter: "drop-shadow(0 10px 12px rgba(40,30,15,0.35))" }}>
            <div style={{ background: hub ? C.note : C.paper, clipPath: tornClip(seed + i * 5, 2.5), padding: hub ? "26px 40px" : "18px 30px", fontFamily: hub ? HAND : COND,
              fontWeight: 700, fontSize: hub ? 64 : 40, color: C.ink, whiteSpace: "nowrap", letterSpacing: hub ? 0 : 1 }}>{hub ? t : t.toUpperCase()}</div>
          </div>
        );
      })}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <BrassDefs />
        {pts.map((p, i) => f >= nodeAt(i) && <Pin key={i} x={p[0]} y={p[1] - 40} t={spring({ frame: f - nodeAt(i), fps: FPS, config: { damping: 14 } })} />)}
      </svg>
    </AbsoluteFill>
  );
}

/** A real archival photo printed as a halftone and taped to the board, or a collage cut-out laid on it. */
function Photo({ b, f, seed }: { b: Extract<BBeat, { kind: "photo" }>; f: number; seed: number }) {
  const rot = (rnd(seed) - 0.5) * 4;
  const push = 1 + Math.min(1, f / 400) * 0.03;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {b.cutout ? (
        <Img src={staticFile(b.src)} style={{ width: 1100, height: 760, objectFit: "contain", transform: `rotate(${rot}deg) scale(${push})`, filter: "drop-shadow(0 22px 26px rgba(40,30,15,0.45))" }} />
      ) : (
        <div style={{ position: "relative", transform: `rotate(${rot}deg) scale(${push})`, filter: "drop-shadow(0 24px 30px rgba(0,0,0,0.5))" }}>
          <div style={{ background: "#fbf8f1", clipPath: tornClip(seed + 2, 1.2), padding: 26 }}>
            <div style={{ position: "relative", overflow: "hidden" }}>
              <Img src={staticFile(b.src)} style={{ display: "block", maxWidth: 1240, maxHeight: 760, filter: "grayscale(1) contrast(1.25) brightness(1.02)" }} />
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,0,0,0.22) 1px, transparent 1.6px)", backgroundSize: "5px 5px", mixBlendMode: "multiply" }} />
            </div>
          </div>
          <TapeStrip x={-30} y={-14} rot={-28} w={160} />
          <TapeStrip x={"calc(100% - 130px)"} y={-10} rot={24} w={160} />
        </div>
      )}
      {b.caption && (
        <div style={{ position: "absolute", right: 90, bottom: 70, maxWidth: 620, transform: "rotate(-1.5deg)", filter: "drop-shadow(0 6px 8px rgba(40,30,15,0.3))" }}>
          <div style={{ background: K.kraft, clipPath: tornClip(seed + 17, 2.5), padding: "12px 24px 10px", fontFamily: TYPEW, fontWeight: 700, fontSize: 24, color: C.ink, lineHeight: 1.3 }}>
            {b.caption}{b.credit && <div style={{ fontSize: 15, color: C.dim, marginTop: 4, fontWeight: 400 }}>{b.credit}</div>}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

/** A newspaper clipping with a real headline, pinned to the board. */
/** A marker pen sweeps under a headline once it has landed (the Vox skill): the proof, highlighted. */
const marked = (on: boolean, f: number, at: number, color = "rgba(250,204,21,0.75)"): React.CSSProperties => on ? {
  backgroundImage: `linear-gradient(transparent 58%, ${color} 58%, ${color} 92%, transparent 92%)`, backgroundRepeat: "no-repeat",
  backgroundSize: `${interpolate(f, [at + 16, at + 34], [0, 100], clamp)}% 100%`, WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" } : {};

function NewsHead({ b, f, talk, seed, area, mark = false }: { b: Extract<BBeat, { kind: "newshead" }>; f: number; talk: number; seed: number; area: Area; mark?: boolean }) {
  const n = b.items.length;
  return (
    <AbsoluteFill>
      {b.items.map((h, i) => {
        const at = Math.round((i / Math.max(1, n)) * talk * 0.8);
        const s = spring({ frame: f - at, fps: FPS, config: { damping: 15, stiffness: 150 } });
        if (f < at) return null;
        const w = n === 1 ? (area.side ? 860 : 1300) : 960;
        const x = n === 1 ? area.cx - w / 2 : 160 + (i % 2) * 640;
        const y = n === 1 ? 250 : 110 + i * 205;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: w, transform: `scale(${1.15 - 0.15 * s}) rotate(${(rnd(seed + i) - 0.5) * 4}deg)`, opacity: s,
            filter: "drop-shadow(0 18px 22px rgba(40,30,15,0.4))" }}>
            <div style={{ background: "#efe9dc", clipPath: tornClip(seed + i * 3, 1.3), padding: n === 1 ? "36px 56px 44px" : "22px 34px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `3px double ${C.ink}`, paddingBottom: 8, marginBottom: 14 }}>
                <span style={{ fontFamily: DISPLAY, fontSize: n === 1 ? 40 : 28, color: C.ink }}>{h.outlet}</span>
                <span style={{ fontFamily: TYPEW, fontSize: n === 1 ? 20 : 16, color: C.dim, alignSelf: "flex-end" }}>{h.date.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: n === 1 ? (area.side ? 64 : 76) : 44, lineHeight: 1.06, color: C.ink }}><span style={marked(mark, f, at)}>{h.headline}</span></div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** The big moves, printed as a newspaper chart: the line draws itself, and a red stamp calls the rise or fall. */
function NewsChart({ b, f, talk, seed }: { b: Extract<BBeat, { kind: "newschart" }>; f: number; talk: number; seed: number }) {
  const pts = b.points.slice(0, 5);
  const vals = pts.map((p) => p.value);
  // the scale hugs the data (not zero-based), so a 13% fall reads as a fall; the printed numbers keep it honest
  const span = Math.max(...vals) - Math.min(...vals) || Math.abs(vals[0]) || 1;
  const lo = Math.min(...vals) - span * 0.55, hi = Math.max(...vals) + span * 0.3;
  const W = 1040, H = 400;
  const xy = pts.map((p, i) => [60 + (i * (W - 120)) / Math.max(1, pts.length - 1), H - 40 - ((p.value - lo) / (hi - lo)) * (H - 90)] as [number, number]);
  const draw = interpolate(f, [talk * 0.12, talk * 0.7], [0, 1], clamp);
  const path = xy.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const len = xy.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - xy[i][0], p[1] - xy[i][1]), 0);
  const first = vals[0], last = vals[vals.length - 1];
  const up = last >= first;
  const pct = first ? Math.round(((last - first) / Math.abs(first)) * 100) : 0;
  const stampS = interpolate(f, [talk * 0.72, talk * 0.72 + 8], [1.8, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 1240, transform: `rotate(${(rnd(seed) - 0.5) * 2.5}deg)`, filter: "drop-shadow(0 22px 26px rgba(40,30,15,0.42))" }}>
        <div style={{ background: "#efe9dc", clipPath: tornClip(seed + 5, 1.2), padding: "34px 60px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `3px double ${C.ink}`, paddingBottom: 8 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 34, color: C.ink }}>{b.outlet || "The Ledger"}</span>
            <span style={{ fontFamily: TYPEW, fontSize: 18, color: C.dim, alignSelf: "flex-end" }}>DATA</span>
          </div>
          <div style={{ fontFamily: DISPLAY, fontSize: 60, lineHeight: 1.05, color: C.ink, margin: "16px 0 8px" }}>{b.title}</div>
          <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
            <line x1={40} y1={H - 40} x2={W - 30} y2={H - 40} stroke={C.ink} strokeWidth={2} />
            <path d={`${path} L${xy[xy.length - 1][0]},${H - 40} L${xy[0][0]},${H - 40} Z`} fill={up ? "rgba(29,27,24,0.08)" : "rgba(192,50,42,0.1)"} opacity={draw} />
            <path d={path} fill="none" stroke={up ? C.ink : C.red} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
            {xy.map((p, i) => {
              const on = draw * (pts.length - 1) >= i - 0.01;
              return on && (
                <g key={i}>
                  <circle cx={p[0]} cy={p[1]} r={10} fill={i === pts.length - 1 ? (up ? C.ink : C.red) : C.paper} stroke={C.ink} strokeWidth={3} />
                  <text x={p[0]} y={p[1] - 22} textAnchor="middle" fontFamily={COND} fontWeight={700} fontSize={36} fill={C.ink}>{pts[i].display}</text>
                  <text x={p[0]} y={H - 10} textAnchor="middle" fontFamily={TYPEW} fontSize={22} fill={C.dim}>{pts[i].label}</text>
                </g>
              );
            })}
          </svg>
          {b.source && <div style={{ fontFamily: TYPEW, fontSize: 18, color: C.dim, textAlign: "right", marginTop: 6 }}>SOURCE: {b.source.toUpperCase()}</div>}
        </div>
        {f > talk * 0.72 && pct !== 0 && (
          <div style={{ position: "absolute", right: -30, top: 30, transform: `rotate(-10deg) scale(${stampS})`, border: `6px solid ${C.red}`, color: C.red, padding: "8px 22px",
            fontFamily: COND, fontWeight: 700, fontSize: 64, letterSpacing: 2, background: "rgba(239,233,220,0.85)" }}>{up ? "▲" : "▼"} {Math.abs(pct)}%</div>
        )}
      </div>
    </AbsoluteFill>
  );
}

/* ---------------- the present: colour, zoom and modern news cards ---------------- */
const NOW = { card: "#ffffff", ink: "#111318", dim: "#6b7280", line: "#e5e7eb", up: "#16a34a", down: "#dc2626", accent: "#2563eb" };

/** A photo of the present: it lands as a black-and-white print, turns to full colour, then grows until it fills the frame. */
function NowPhoto({ b, f, talk, seed }: { b: Extract<BBeat, { kind: "photo" }>; f: number; talk: number; seed: number }) {
  const land = spring({ frame: f, fps: FPS, config: { damping: 18, stiffness: 120 } });
  const gray = interpolate(f, [10, 34], [1, 0], clamp);
  const fill = interpolate(f, [Math.max(40, talk * 0.3), Math.max(62, talk * 0.3 + 26)], [0, 1], { ...clamp, easing: (t) => t * t * (3 - 2 * t) });
  const push = 1 + interpolate(f, [talk * 0.3 + 26, talk + 30], [0, 0.05], clamp);
  const rot = (rnd(seed) - 0.5) * 4;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - fill }}>
        <div style={{ transform: `rotate(${rot}deg) scale(${1.12 - 0.12 * land})`, opacity: Math.min(1, land * 1.8), filter: "drop-shadow(0 24px 30px rgba(0,0,0,0.5))" }}>
          <div style={{ background: "#fbf8f1", clipPath: tornClip(seed + 2, 1.2), padding: 26 }}>
            <Img src={staticFile(b.src)} style={{ display: "block", maxWidth: 1240, maxHeight: 760, filter: `grayscale(${gray}) contrast(${1 + 0.2 * gray})` }} />
          </div>
        </div>
      </AbsoluteFill>
      {fill > 0 && (
        <AbsoluteFill style={{ opacity: Math.min(1, fill * 1.6), transform: `scale(${(0.64 + 0.36 * fill) * push})` }}>
          <Img src={staticFile(b.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)" }} />
        </AbsoluteFill>
      )}
      {b.caption && (
        <div style={{ position: "absolute", left: 300, right: 90, bottom: 54, fontFamily: SANS, fontWeight: 600, fontSize: 26, lineHeight: 1.3,
          color: fill > 0.5 ? "#fff" : NOW.ink, textShadow: fill > 0.5 ? "0 2px 8px rgba(0,0,0,0.6)" : "none", opacity: interpolate(f, [20, 36], [0, 1], clamp) }}>
          {b.caption}{b.credit && <span style={{ fontWeight: 400, fontSize: 18, opacity: 0.8 }}>  ·  {b.credit}</span>}
        </div>
      )}
    </AbsoluteFill>
  );
}

/** A headline of the present, as a clean news card (outlet pill, date, bold sans headline) that slides up into place. */
function NowHead({ b, f, talk, area, mark = false }: { b: Extract<BBeat, { kind: "newshead" }>; f: number; talk: number; area: Area; mark?: boolean }) {
  const n = b.items.length;
  return (
    <AbsoluteFill>
      {b.items.map((h, i) => {
        const at = Math.round((i / Math.max(1, n)) * talk * 0.8);
        if (f < at) return null;
        const s = spring({ frame: f - at, fps: FPS, config: { damping: 16, stiffness: 140 } });
        const w = n === 1 ? (area.side ? 860 : 1300) : 960;
        const x = n === 1 ? area.cx - w / 2 : 160 + (i % 2) * 640;
        const y = n === 1 ? 250 : 110 + i * 205;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: w, transform: `translateY(${(1 - s) * 60}px)`, opacity: s,
            background: NOW.card, borderRadius: 20, padding: n === 1 ? "34px 44px 40px" : "20px 28px 24px", boxShadow: "0 24px 60px rgba(17,19,24,0.22)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <span style={{ background: NOW.down, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: n === 1 ? 24 : 18, padding: "6px 14px", borderRadius: 999 }}>{h.outlet}</span>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: n === 1 ? 22 : 17, color: NOW.dim }}>{h.date}</span>
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: n === 1 ? (area.side ? 54 : 64) : 36, lineHeight: 1.1, letterSpacing: -1, color: NOW.ink }}><span style={marked(mark, f, at, "rgba(250,204,21,0.6)")}>{h.headline}</span></div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** A chart of the present: a clean card, light grid, a coloured line that draws itself, and a rise/fall badge. */
function NowChart({ b, f, talk }: { b: Extract<BBeat, { kind: "newschart" }>; f: number; talk: number }) {
  const pts = b.points.slice(0, 5);
  const vals = pts.map((p) => p.value);
  const span = Math.max(...vals) - Math.min(...vals) || Math.abs(vals[0]) || 1;
  const lo = Math.min(...vals) - span * 0.55, hi = Math.max(...vals) + span * 0.3;
  const W = 1100, H = 420;
  const xy = pts.map((p, i) => [70 + (i * (W - 140)) / Math.max(1, pts.length - 1), H - 50 - ((p.value - lo) / (hi - lo)) * (H - 100)] as [number, number]);
  const draw = interpolate(f, [talk * 0.12, talk * 0.7], [0, 1], clamp);
  const path = xy.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const len = xy.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - xy[i][0], p[1] - xy[i][1]), 0);
  const first = vals[0], last = vals[vals.length - 1];
  const up = last >= first, col = up ? NOW.up : NOW.down;
  const pct = first ? Math.round(((last - first) / Math.abs(first)) * 100) : 0;
  const s = spring({ frame: f, fps: FPS, config: { damping: 18, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1240, background: NOW.card, borderRadius: 24, padding: "36px 60px 34px", boxShadow: "0 30px 70px rgba(17,19,24,0.25)", transform: `translateY(${(1 - s) * 70}px)`, opacity: s }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 22, color: NOW.accent, letterSpacing: 1 }}>{(b.outlet || "Data").toUpperCase()}</span>
          {f > talk * 0.72 && pct !== 0 && (
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: "#fff", background: col, borderRadius: 999, padding: "6px 22px",
              transform: `scale(${interpolate(f, [talk * 0.72, talk * 0.72 + 8], [1.4, 1], clamp)})` }}>{up ? "▲" : "▼"} {Math.abs(pct)}%</span>
          )}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, lineHeight: 1.08, letterSpacing: -1, color: NOW.ink, margin: "10px 0 10px" }}>{b.title}</div>
        <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
          <defs><linearGradient id="nowfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity={0.28} /><stop offset="1" stopColor={col} stopOpacity={0} /></linearGradient></defs>
          {[0.25, 0.5, 0.75, 1].map((k) => <line key={k} x1={40} x2={W - 30} y1={H - 50 - k * (H - 100)} y2={H - 50 - k * (H - 100)} stroke={NOW.line} strokeWidth={2} />)}
          <line x1={40} y1={H - 50} x2={W - 30} y2={H - 50} stroke="#cbd0d8" strokeWidth={2} />
          <path d={`${path} L${xy[xy.length - 1][0]},${H - 50} L${xy[0][0]},${H - 50} Z`} fill="url(#nowfill)" opacity={draw} />
          <path d={path} fill="none" stroke={col} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
          {xy.map((p, i) => draw * (pts.length - 1) >= i - 0.01 && (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={11} fill="#fff" stroke={col} strokeWidth={5} />
              <text x={p[0]} y={p[1] - 24} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={34} fill={NOW.ink}>{pts[i].display}</text>
              <text x={p[0]} y={H - 14} textAnchor="middle" fontFamily={SANS} fontWeight={500} fontSize={22} fill={NOW.dim}>{pts[i].label}</text>
            </g>
          ))}
        </svg>
        {b.source && <div style={{ fontFamily: SANS, fontSize: 18, color: NOW.dim, textAlign: "right", marginTop: 4 }}>Source: {b.source}</div>}
      </div>
    </AbsoluteFill>
  );
}

/** A title as a crisp headline: only its first sentence ("Compute: the race for the world's most powerful machines"),
 * never a paragraph, sized to fit two lines. */
const headline = (t: string) => (t.length > 70 ? t.split(/(?<=[.?!])\s/)[0].replace(/\.$/, "") : t);

function Title({ b, f }: { b: Extract<BBeat, { kind: "title" }>; f: number }) {
  const t = spring({ frame: f - 4, fps: FPS, config: { damping: 20 } });
  const title = headline(b.title);
  const size = Math.min(118, (2 * 1500) / (Math.max(1, title.length) * 0.5));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `rotate(-1.5deg) scale(${1.1 - 0.1 * t})`, opacity: t, filter: "drop-shadow(0 22px 26px rgba(0,0,0,0.5))" }}>
        <div style={{ background: C.paper, clipPath: tornClip(99, 1.4), padding: "50px 90px 56px", textAlign: "center" }}>
          {b.kicker && <div style={{ fontFamily: TYPEW, fontWeight: 700, fontSize: 28, letterSpacing: 8, color: C.red, marginBottom: 16 }}>{b.kicker.toUpperCase()}</div>}
          <div style={{ fontFamily: DISPLAY, fontSize: size, lineHeight: 1.04, color: C.ink, maxWidth: 1500 }}>{title}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
