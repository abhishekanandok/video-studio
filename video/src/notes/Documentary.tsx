/** The Living Documentary look (the creator, 2026-10-11): a premium motion-graphics explainer, nothing ever still.
 *  Layers, each moving at its own speed: cream grain paper with faint drifting contour lines and leaves; the picture of
 *  the point being spoken (always zooming or panning, birds and light drifting over it); the bullet's own card; its
 *  text; doodles and highlights. A scene: the title in a dark-green brush banner (letters cascade in), then each bullet
 *  as its OWN card, one at a time, entering and leaving in a different way each time; its words revealed in a rotating
 *  style; each key word lit the moment it is said; at the end the cards shrink into a row; a brush sweep or an iris
 *  wipe carries to the next topic. Rendered every frame (notes-render.mjs). Text is always the slide's, word for word. */
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { bulletFrame, notesFrames, segments, type NotesProps } from "./Notes";

const { fontFamily: NUNITO } = loadNunito("normal", { weights: ["700", "800", "900"], subsets: ["latin"] });
const FONT = `${NUNITO}, sans-serif`;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const OUT = Easing.out(Easing.cubic), IN = Easing.in(Easing.cubic), IO = Easing.inOut(Easing.cubic);
const BACK = Easing.out(Easing.back(1.5)); // the small overshoot (~5%) on pops and slides, then settle
const C = { paper: "#f6eedb", ink: "#1b1d1a", green: "#1d5a32", key: "#1f7a3a", blue: "#1d4fc4", yellow: "#ffd83a", line: "rgba(80,95,60,0.10)" };
// the bullet's big picture on top (a Vox-style paper print), the bullets' cards in a row along the bottom
type Box = { x: number; y: number; w: number; h: number };
const PIC: Box = { x: 410, y: 122, w: 1100, h: 620 };
const ROW = { y: 800, x: 70, w: 1780, gap: 28 };
const ENTER = 20, EXIT = 11, XF = 22; // frames: ~0.65 s in, ~0.35 s out, a picture change

export type Moment = { bullet: number; steps: string[] };
type KeyAt = { t: string; at: number };
type Callout = { text: string; x: number; y: number; kind?: "spotlight" | "circle" | "arrow" | "caption" | "stamp"; ar?: number };
type P = NotesProps & { moment?: Moment | null; key_at?: KeyAt[][] | null; bullet_callouts?: (Callout | null)[] | null };
type Shot = { src: string; from: number; callout?: Callout | null; chips?: string[] };
type Bullet = NonNullable<NotesProps["bullets"]>[number];

const e = (f: number, a: number, len: number, easing = OUT) => interpolate(f, [a, a + len], [0, 1], { ...clamp, easing });
const ENTRANCES = ["slide", "unfold", "brush", "pop", "flip", "border", "drift"] as const;
const GLIDE = 32; // frames: a picture glides out (up a little) and the next glides down into place, like paper
const REVEALS = ["mask", "pop", "side", "blur", "type", "words"] as const;
const MARKS = ["swipe", "flip", "underline", "circle", "glow"] as const;

/* ---------- background layers ---------- */
function Paper({ f }: { f: number }) {
  const rings = [];
  for (const [cx, cy, n] of [[380, 860, 9], [1560, 200, 8]] as const) {
    for (let k = 1; k <= n; k++) {
      const r = 60 + k * 50;
      const pts = Array.from({ length: 49 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const rr = r * (1 + 0.08 * Math.sin(3 * a + k) + 0.05 * Math.sin(5 * a - k * 0.7));
        return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * 0.72 * Math.sin(a)).toFixed(1)}`;
      });
      rings.push(<polygon key={`${cx}-${k}`} points={pts.join(" ")} fill="none" stroke={C.line} strokeWidth={1.6} />);
    }
  }
  const leaves = [0, 1, 2, 3, 4].map((k) => {
    const x = ((k * 431 + f * (0.35 + k * 0.07)) % 2100) - 90, y = 120 + ((k * 263) % 840) + Math.sin(f / 50 + k) * 18;
    return <path key={k} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(f * 0.4 + k * 70) % 360}) scale(${1 + (k % 3) * 0.4})`}
      d="M0 0 C 10 -14, 30 -14, 40 0 C 30 14, 10 14, 0 0 Z M2 0 L 38 0" fill="rgba(60,110,50,0.10)" stroke="rgba(60,110,50,0.12)" strokeWidth={1.2} />;
  });
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} /><feColorMatrix values="0 0 0 0 0.4  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.10 0" /></filter>
        <rect width={1920} height={1080} filter="url(#grain)" />
        <g transform={`translate(${(f * 0.05).toFixed(2)}, ${(Math.sin(f / 200) * 5).toFixed(2)})`}>{rings}</g>
        {leaves}
      </svg>
    </AbsoluteFill>
  );
}

function Globe({ f }: { f: number }) {
  const R = 30;
  return (
    <svg width={96} height={96} style={{ position: "absolute", right: 40, top: 30 }} viewBox="-48 -48 96 96">
      <circle r={R + 5} fill="rgba(29,90,50,0.12)" /><circle r={R} fill={C.green} />
      {[0, 1, 2, 3].map((k) => { const a = ((f / 90 + k / 4) % 1) * Math.PI; return <ellipse key={k} rx={Math.abs(Math.cos(a)) * R} ry={R} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.3} />; })}
      {[-0.5, 0, 0.5].map((t) => <ellipse key={t} cy={t * R} rx={Math.sqrt(1 - t * t) * R} ry={3} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.1} />)}
      <circle cx={9} cy={-7} r={4} fill={C.yellow} stroke="#fff" strokeWidth={1.4} />
    </svg>
  );
}

/** The title on a dark-green brush stroke, white ultra-bold capitals rising letter by letter, an underline drawing
 *  itself; big in the middle first, then it settles top-left as the scene's header. */
function Banner({ title, f, settle }: { title: string; f: number; settle: number }) {
  const T = title.toUpperCase();
  const big = T.length > 26 ? 64 : 80, small = T.length > 26 ? 34 : 40;
  const s = e(f, settle, 22, IO);
  const size = big + (small - big) * s;
  const sweep = e(f, 0, 16);
  return (
    <div style={{ position: "absolute", left: 960 + (70 - 960) * s, top: 470 + (52 - 470) * s, transform: `translateX(${-50 * (1 - s)}%)`, zIndex: 5 }}>
      <div style={{ position: "relative", display: "inline-block", padding: `${size * 0.22}px ${size * 0.5}px ${size * 0.3}px` }}>
        <div style={{ position: "absolute", inset: 0, background: C.green,
          clipPath: "polygon(0% 14%, 3% 4%, 18% 9%, 40% 2%, 63% 8%, 84% 1%, 99% 9%, 100% 52%, 97% 93%, 77% 98%, 52% 91%, 30% 99%, 9% 92%, 1% 97%)",
          WebkitMaskImage: `linear-gradient(90deg, #000 ${sweep * 100}%, transparent ${Math.min(100, sweep * 100 + 6)}%)`,
          maskImage: `linear-gradient(90deg, #000 ${sweep * 100}%, transparent ${Math.min(100, sweep * 100 + 6)}%)` }} />
        <div style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontSize: size, color: "#fff", letterSpacing: 1, whiteSpace: "nowrap" }}>
          {[...T].map((ch, i) => {
            const l = interpolate(f, [8 + i * 1.2, 8 + i * 1.2 + 12], [0, 1], { ...clamp, easing: BACK });
            return <span key={i} style={{ display: "inline-block", opacity: Math.min(1, l * 1.6), transform: `translateY(${(1 - l) * 0.5}em)`, whiteSpace: "pre" }}>{ch}</span>;
          })}
        </div>
        <div style={{ position: "absolute", left: size * 0.5, bottom: size * 0.12, height: Math.max(4, size * 0.07), borderRadius: 4, background: C.yellow,
          width: `${e(f, 14 + T.length * 1.2, 16, IO) * 38}%` }} />
      </div>
    </div>
  );
}

/* ---------- the picture ---------- */
function Birds({ f, box }: { f: number; box: { w: number; h: number } }) {
  return (
    <svg width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0 }}>
      {[0, 1, 2].map((k) => {
        const x = ((f * (1.3 + k * 0.25) + k * 260) % (box.w + 160)) - 80, y = box.h * (0.14 + k * 0.07) + Math.sin(f / 18 + k) * 6;
        const flap = Math.sin(f / 4 + k * 2) * 5;
        return <path key={k} d={`M ${x - 12} ${y + flap} Q ${x - 5} ${y - 4} ${x} ${y} Q ${x + 5} ${y - 4} ${x + 12} ${y + flap}`} fill="none" stroke="rgba(30,30,30,0.7)" strokeWidth={2.4} strokeLinecap="round" />;
      })}
    </svg>
  );
}

/* ---------- the bullet's card ---------- */
type Word = { t: string; c: "y" | "g" | null; term: number };

function words(text: string, key: string[] = [], green: string[] = []): { list: Word[]; terms: string[] } {
  const list: Word[] = [], terms: string[] = [];
  for (const sg of segments(text, key, green)) {
    const term = sg.c ? terms.push(sg.t) - 1 : -1;
    for (const w of sg.t.split(/(\s+)/)) if (w) list.push({ t: w, c: sg.c, term });
  }
  return { list, terms };
}

function Mark({ style, p, children }: { style: string; p: number; children: React.ReactNode }) {
  // one key word lit as it is said; once done it stays, still
  const wrap: React.CSSProperties = { position: "relative", display: "inline-block", isolation: "isolate" };
  if (style === "swipe") return <span style={wrap}><span style={{ position: "absolute", left: -6, right: -6, top: "8%", bottom: "4%", background: C.yellow, borderRadius: 5,
    zIndex: -1, transform: "skewX(-6deg)", clipPath: `inset(0 ${100 - p * 100}% 0 0)` }} />{children}</span>;
  if (style === "flip") return <span style={{ ...wrap, transform: `scale(${1 + 0.1 * Math.sin(Math.min(1, p) * Math.PI)})` }}>{children}</span>;
  if (style === "underline") return <span style={wrap}>{children}<svg style={{ position: "absolute", left: 0, bottom: -8, width: "100%", height: 14, overflow: "visible" }} viewBox="0 0 100 14" preserveAspectRatio="none">
    <path d="M2 9 C 30 3, 60 13, 98 6" fill="none" stroke={C.yellow} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} /></svg></span>;
  if (style === "circle") return <span style={wrap}>{children}<svg style={{ position: "absolute", left: "-10%", top: "-22%", width: "120%", height: "144%", overflow: "visible" }} viewBox="0 0 100 50" preserveAspectRatio="none">
    <ellipse cx={50} cy={25} rx={48} ry={23} fill="none" stroke="#e8a400" strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} transform="rotate(-3 50 25)" /></svg></span>;
  const g = Math.sin(Math.min(1, p) * Math.PI); // glow: a soft pulse, then rest
  return <span style={{ ...wrap, textShadow: `0 0 ${18 * g}px rgba(255,214,58,${0.9 * g})` }}>{children}</span>;
}

function Text({ b, f, at, reveal, keyAt, size, from, to }: { b: Bullet; f: number; at: number; reveal: string; keyAt: KeyAt[]; size: number;
  from: number; to: number }) {
  const { list, terms } = words(b.text, b.key, b.green);
  // when each key term is said: the transcript's own word time, else spread through the bullet as it is spoken
  const termAt = terms.map((t, i) => {
    const hit = keyAt.find((k) => k.t.toLowerCase() === t.toLowerCase());
    return Math.max(at + 14 + i * 16, hit ? hit.at : from + ((to - from) * (i + 1)) / (terms.length + 1));
  });
  const chars = list.reduce((n, w) => n + w.t.length, 0);
  const typeLen = Math.min(46, Math.max(18, chars * 0.5));
  let shown = 0;
  return (
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.32, color: C.ink, position: "relative",
      ...(reveal === "mask" ? { transform: `translateY(${(1 - e(f, at, 16)) * 110}%)` } : {}),
      ...(reveal === "pop" ? { transform: `scale(${0.86 + 0.14 * e(f, at, 16, BACK)})`, transformOrigin: "left center", opacity: e(f, at, 8) } : {}),
      ...(reveal === "blur" ? { filter: `blur(${(1 - e(f, at, 16)) * 12}px)`, opacity: e(f, at, 12) } : {}) }}>
      {list.map((w, i) => {
        const start = shown;
        shown += w.t.length;
        let o = 1, tr = "";
        if (reveal === "side") { const p = e(f, at + i * 1.5, 12, BACK); o = p; tr = `translateX(${(1 - p) * -40}px)`; }
        if (reveal === "words") { const p = e(f, at + i * 2, 10, BACK); o = Math.min(1, p * 1.5); tr = `scale(${0.6 + 0.4 * p})`; }
        if (reveal === "type") o = ((f - at) / typeLen) * chars >= start ? 1 : 0;
        const colour = w.c === "y" ? C.key : w.c === "g" ? C.blue : C.ink;
        const inner = <span style={{ color: colour, fontWeight: w.c ? 900 : 800 }}>{w.t}</span>;
        const marked = w.term >= 0 && /\S/.test(w.t) ? <Mark style={MARKS[w.term % MARKS.length]} p={e(f, termAt[w.term], 14, IO)}>{inner}</Mark> : inner;
        return <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: o, transform: tr }}>{marked}</span>;
      })}
      {reveal === "type" && f - at < typeLen + 30 && <span style={{ display: "inline-block", width: 4, height: size, background: C.ink, marginLeft: 4,
        verticalAlign: "-0.1em", opacity: Math.floor(f / 8) % 2 ? 0 : 1 }} />}
    </div>
  );
}

/** The bullet's big picture: a Vox-style paper print (white border, tape, a slight tilt, a soft shadow), always slowly
 *  zooming inside. When the next bullet starts, it glides up a little and fades away, and the next one glides down
 *  from above into place, slowly, like paper (the creator, 2026-10-11). */
/** What the picture shows, pointed out once it has landed (the creator, 2026-10-11): the rest of the picture dims around
 *  the spot that shows the bullet's point, a dot pops on it, a line draws out to a paper tag beside the picture with the
 *  point in a few of the bullet's own words; numbers of the bullet pop up as chips in the corner. */
type Room = { l: boolean; r: boolean }; // whether a tag may sit outside the picture, on its left / right

function Callouts({ s, f, at, t, dir, B, room }: { s: Shot; f: number; at: number; t: number; dir: number; B: Box; room: Room }) {
  // each picture points out its bullet in its own way, chosen for what it shows (the creator, 2026-10-11)
  const iw = B.w - 32, ih = B.h - 32, sc = 1.04 + 0.08 * t;
  const c = s.callout;
  const kind = c?.kind ?? "spotlight";
  // the spot on the picture as the frame crops it (object-fit cover: the picture's own shape, c.ar = width / height)
  const ar = c?.ar ?? iw / ih;
  const dw = ar > iw / ih ? ih * ar : iw, dh = ar > iw / ih ? ih : iw / ar;
  const fx = c ? (c.x * dw - (dw - iw) / 2) : 0, fy = c ? (c.y * dh - (dh - ih) / 2) : 0;
  const px = c ? 16 + iw / 2 + (Math.min(iw - 30, Math.max(30, fx)) - iw / 2) * sc + dir * (t - 0.5) * 24 * sc : 0;
  const py = c ? 16 + ih / 2 + (Math.min(ih - 30, Math.max(30, fy)) - ih / 2) * sc + (0.5 - t) * 10 * sc : 0;
  // outside the picture on the spot's side when the layout leaves room there, else inside it beside the spot
  const outside: "left" | "right" | null = !c ? null : c.x < 0.5 ? (room.l ? "left" : room.r ? "right" : null) : (room.r ? "right" : room.l ? "left" : null);
  const left = outside ? outside === "left" : c ? c.x < 0.5 : true;
  const inSide: "left" | "right" = px < B.w / 2 ? "right" : "left";
  const serif: React.CSSProperties = { fontFamily: "Newsreader, Georgia, serif", fontStyle: "italic", fontWeight: 800, color: C.ink };
  const hl = (p: number): React.CSSProperties => ({ // the words land, then a highlighter sweeps behind them
    background: `linear-gradient(90deg, ${C.yellow} ${p * 100}%, transparent ${p * 100}%)`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", padding: "0 6px" });
  const Tag = ({ x, y, side, a }: { x: number; y: number; side: "left" | "right"; a: number }) => {
    const inner = x > 0 && x < B.w; // anchored inside the picture: as wide as the room up to its edge
    const cap = inner ? Math.max(180, Math.min(330, side === "left" ? x - 24 : B.w - x - 24)) : 330;
    const p = e(f, a, 14, BACK), sw = e(f, a + 10, 16, IO);
    return p > 0 ? (
      <div style={{ position: "absolute", top: y, [side === "left" ? "right" : "left"]: side === "left" ? B.w - x : x, transform: `translateY(-50%) scale(${0.85 + 0.15 * p})`,
        transformOrigin: side === "left" ? "right center" : "left center", opacity: Math.min(1, p * 1.4), width: "max-content", maxWidth: cap,
        background: "#fbf6e9", padding: "14px 18px", boxShadow: "6px 8px 0 rgba(0,0,0,0.18)", textAlign: side === "left" ? "right" : "left" }}>
        <span style={{ ...serif, fontSize: 34, lineHeight: 1.32, ...hl(sw) }}>{c!.text}</span>
      </div>
    ) : null;
  };
  let mark: React.ReactNode = null;
  if (c && kind === "spotlight") {
    // the rest dims around the spot, a dot pops on it, a line draws out to a tag beside the picture
    const spot = e(f, at, 16, IO), dot = e(f, at + 6, 12, Easing.out(Easing.back(2.2))), line = e(f, at + 12, 14, IO);
    const side = outside ?? inSide;
    const tx = outside ? (outside === "left" ? -30 : B.w + 30) : px + (inSide === "right" ? 60 : -60);
    const ty = Math.min(B.h - 90, Math.max(60, outside ? py : py + (py < B.h / 2 ? 120 : -120)));
    mark = (<>
      <div style={{ position: "absolute", left: 16, top: 16, width: iw, height: ih, opacity: spot,
        background: `radial-gradient(circle at ${px - 16}px ${py - 16}px, transparent 0, transparent 150px, rgba(0,0,0,0.5) 290px)` }} />
      <svg width={B.w} height={B.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {line > 0 && <line x1={px} y1={py} x2={tx + (px - tx) * (1 - line)} y2={ty + (py - ty) * (1 - line)} stroke={C.ink} strokeWidth={3} />}
        <circle cx={px} cy={py} r={11 * dot} fill={C.yellow} stroke={C.ink} strokeWidth={3} />
      </svg>
      <Tag x={tx} y={ty} side={side} a={at + 22} />
    </>);
  }
  if (c && kind === "circle") {
    // a hand-drawn ring draws itself around the detail; a short note is written beside it
    const ring = e(f, at, 22, IO), rw = 170, rh = 120;
    const roomR = B.w - (px + rw * 0.5) - 28, roomL = px - rw * 0.5 - 28;
    const noteSide: "left" | "right" = roomR >= roomL ? "right" : "left";
    const nx = noteSide === "right" ? px + rw * 0.5 : px - rw * 0.5, ny = Math.max(70, py - rh - 10);
    const noteW = Math.max(200, Math.min(360, noteSide === "right" ? roomR : roomL));
    const note = e(f, at + 18, 14, BACK), sw = e(f, at + 26, 16, IO);
    mark = (<>
      <svg width={B.w} height={B.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <ellipse cx={px} cy={py} rx={rw} ry={rh} fill="none" stroke={C.yellow} strokeWidth={7} strokeLinecap="round" pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - ring} transform={`rotate(-8 ${px} ${py})`} style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))" }} />
      </svg>
      {note > 0 && <div style={{ position: "absolute", top: ny, [noteSide === "right" ? "left" : "right"]: noteSide === "right" ? nx : B.w - nx, transform: `scale(${0.8 + 0.2 * note}) rotate(-3deg)`,
        transformOrigin: noteSide === "right" ? "left center" : "right center", opacity: Math.min(1, note * 1.4), maxWidth: noteW, width: "max-content",
        textAlign: noteSide === "right" ? "left" : "right" }}>
        <span style={{ ...serif, fontSize: 36, lineHeight: 1.3, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          background: `linear-gradient(90deg, rgba(29,90,50,0.92) ${sw * 100}%, transparent ${sw * 100}%)`, boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone", padding: "2px 10px" }}>{c.text}</span>
      </div>}
    </>);
  }
  if (c && kind === "arrow") {
    // a thick hand-drawn arrow sweeps in from outside the picture to the spot; its words wait at the tail
    const draw = e(f, at, 20, IO), head = e(f, at + 18, 8);
    const sx = outside ? (outside === "left" ? -60 : B.w + 60) : Math.min(B.w - 60, Math.max(60, px + (inSide === "right" ? 280 : -280))), sy = Math.max(70, py - 200);
    const mx = (sx + px) / 2 + (left ? -10 : 10), my = Math.min(sy, py) - 90;
    const ang = Math.atan2(py - my, px - mx);
    const hx = (d: number) => px - 28 * Math.cos(ang + d), hy = (d: number) => py - 28 * Math.sin(ang + d);
    mark = (<>
      <svg width={B.w} height={B.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={`M ${sx} ${sy} Q ${mx} ${my} ${px} ${py}`} fill="none" stroke={C.yellow} strokeWidth={8} strokeLinecap="round" pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - draw} style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.55))" }} />
        {head > 0 && <path d={`M ${hx(0.5)} ${hy(0.5)} L ${px} ${py} L ${hx(-0.5)} ${hy(-0.5)}`} fill="none" stroke={C.yellow} strokeWidth={8}
          strokeLinecap="round" strokeLinejoin="round" opacity={head} />}
      </svg>
      <Tag x={outside ? (outside === "left" ? -30 : B.w + 30) : sx} y={sy} side={outside ?? inSide} a={at + 10} />
    </>);
  }
  if (c && kind === "caption") {
    // the whole picture is the point: a dark-green brush stroke sweeps across its lower part, the words on it in white
    const sweep = e(f, at, 18, IO), words = e(f, at + 12, 14);
    mark = (
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 46, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", padding: "16px 46px 20px" }}>
          <div style={{ position: "absolute", inset: 0, background: C.green, opacity: 0.94,
            clipPath: "polygon(0% 14%, 3% 4%, 18% 9%, 40% 2%, 63% 8%, 84% 1%, 99% 9%, 100% 52%, 97% 93%, 77% 98%, 52% 91%, 30% 99%, 9% 92%, 1% 97%)",
            WebkitMaskImage: `linear-gradient(90deg, #000 ${sweep * 100}%, transparent ${Math.min(100, sweep * 100 + 6)}%)`,
            maskImage: `linear-gradient(90deg, #000 ${sweep * 100}%, transparent ${Math.min(100, sweep * 100 + 6)}%)` }} />
          <span style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontSize: 44, color: "#fff", opacity: words,
            letterSpacing: 0.5, whiteSpace: "nowrap", display: "inline-block", transform: `translateY(${(1 - words) * 12}px)` }}>{c.text}</span>
        </div>
      </div>
    );
  }
  if (c && kind === "stamp") {
    // a number or a time: a round stamp thumps onto the picture, slightly turned
    const p = interpolate(f, [at, at + 8, at + 14], [2.2, 0.92, 1], { ...clamp, easing: OUT });
    const o = e(f, at, 6);
    const sx = Math.min(B.w - 200, Math.max(200, px)), sy = Math.min(B.h - 170, Math.max(170, py));
    mark = o > 0 ? (
      <div style={{ position: "absolute", left: sx - 140, top: sy - 140, width: 280, height: 280, borderRadius: "50%", opacity: o,
        transform: `scale(${p}) rotate(-12deg)`, border: `9px solid ${C.blue}`, boxShadow: `inset 0 0 0 6px #fffdf6, inset 0 0 0 10px ${C.blue}`,
        background: "rgba(255,253,246,0.9)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 36 }}>
        <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: c.text.length > 12 ? 38 : 48, lineHeight: 1.05, color: C.blue, textTransform: "uppercase" }}>{c.text}</span>
      </div>
    ) : null;
  }
  const chips = kind === "stamp" ? [] : s.chips ?? []; // a stamp already carries the number
  return (
    <>
      {mark}
      {chips.length > 0 && (
        <div style={{ position: "absolute", left: 42, bottom: kind === "caption" ? 150 : 40, display: "flex", gap: 12 }}>
          {chips.map((tx2, i) => {
            const pp = e(f, at + 34 + i * 8, 14, Easing.out(Easing.back(2)));
            return pp > 0 ? <span key={i} style={{ transform: `scale(${pp})`, transformOrigin: "left center", background: "#fffdf6",
              border: `3px solid ${C.ink}`, borderRadius: 999, padding: "8px 24px", fontFamily: FONT, fontWeight: 900, fontSize: 32, color: C.blue,
              boxShadow: "0 8px 18px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>{tx2}</span> : null;
          })}
        </div>
      )}
    </>
  );
}

function VoxPicture({ shots, f, total, enter, B = PIC, room = { l: true, r: true } }: { shots: Shot[]; f: number; total: number; enter: number;
  B?: Box; room?: Room }) {
  return (
    <>
      {shots.map((s, k) => {
        const next = k + 1 < shots.length ? shots[k + 1].from : null;
        const from = k === 0 ? enter : s.from + 8; // the next one starts down just as the last one lifts away
        if (f < from - 1 || (next !== null && f > next + GLIDE + 2)) return null;
        const inn = interpolate(f, [from, from + GLIDE], [0, 1], { ...clamp, easing: IO });
        const out = next === null ? 0 : interpolate(f, [next, next + GLIDE], [0, 1], { ...clamp, easing: IO });
        const tilt = (k % 2 ? 1.4 : -1.4) + (1 - inn) * (k % 2 ? 2 : -2);
        const y = (1 - inn) * -220 + out * -90 + Math.sin(f / 55) * 5; // down from above; out: a little up
        const t = interpolate(f, [from, next ?? total], [0, 1], clamp);
        return (
          <div key={k} style={{ position: "absolute", left: B.x, top: B.y, width: B.w, height: B.h, zIndex: 1 + k,
            opacity: Math.min(inn * 1.6, 1) * (1 - out), transform: `translateY(${y}px) rotate(${tilt}deg)` }}>
            <div style={{ position: "absolute", inset: 0, background: "#fff", padding: 16, borderRadius: 4,
              boxShadow: "0 26px 50px rgba(40,40,20,0.26), 0 5px 12px rgba(40,40,20,0.14)" }}>
              <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 2 }}>
                <Img src={staticFile(s.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
                  transform: `scale(${1.04 + 0.08 * t}) translate(${(k % 2 ? -1 : 1) * (t - 0.5) * 24}px, ${(0.5 - t) * 10}px)` }} />
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at ${30 + 40 * ((f / 300) % 1)}% 10%, rgba(255,245,200,0.24), transparent 45%)` }} />
                <Birds f={f} box={{ w: B.w - 32, h: B.h - 32 }} />
              </div>
            </div>
            <Callouts s={s} f={f} at={from + GLIDE + 14} t={t} dir={k % 2 ? -1 : 1} B={B} room={room} />
            {[{ l: "8%", r: -6 }, { l: "78%", r: 5 }].map((q, i) => (
              <div key={i} style={{ position: "absolute", left: q.l, top: -18, width: 150, height: 40, transform: `rotate(${q.r}deg)`,
                background: "rgba(236,222,170,0.85)", backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 6px, transparent 6px 14px)" }} />
            ))}
          </div>
        );
      })}
    </>
  );
}

/** A bullet's card in the row along the bottom: it enters (a different way each time) when the bullet is spoken and
 *  stays; the one being spoken is bright, the others dim to about half. */
function RowCard({ b, k, n, f, at, until, entrance, keyAt, scene, active, pos }: { b: Bullet; k: number; n: number; f: number; at: number;
  until: number | null; entrance: string; keyAt: KeyAt[]; scene: number; active: boolean; pos?: { x: number; y: number; w: number } }) {
  if (f < at - 1) return null;
  const w = pos ? pos.w : (ROW.w - (n - 1) * ROW.gap) / n;
  const size = pos ? (b.text.length > 90 ? 28 : 31) : n >= 4 ? 27 : n === 3 ? (b.text.length > 90 ? 29 : 32) : 36;
  const len = entrance === "drift" ? 30 : ENTER;
  const p = e(f, at, len, entrance === "slide" || entrance === "pop" ? BACK : OUT);
  let tf = "", clip: string | undefined, op = 1, origin = "center";
  if (entrance === "slide") tf = `translateY(${(1 - p) * 260}px)`;
  if (entrance === "unfold") { tf = `perspective(1200px) rotateX(${(1 - p) * 90}deg)`; origin = "bottom center"; }
  if (entrance === "brush") clip = `inset(0 ${(1 - p) * 100}% 0 0 round 16px)`;
  if (entrance === "pop") { tf = `scale(${0.5 + 0.5 * p})`; op = Math.min(1, p * 2); }
  if (entrance === "flip") { tf = `perspective(1200px) rotateY(${(1 - p) * 90}deg)`; origin = "left center"; }
  if (entrance === "drift") { tf = `translateY(${(1 - p) * 140}px)`; op = p; }
  const border = entrance === "border" ? e(f, at, 14, IO) : 1;
  const fill = entrance === "border" ? e(f, at + 10, 10) : 1;
  const textAt = at + (entrance === "border" ? 20 : len - 4);
  const dim = active ? 1 : 0.5 + 0.5 * (1 - e(f, until ?? at, 14, IO)); // the one being spoken bright, the others at half
  const float = 0; // the bullet blocks stay perfectly still (the creator, 2026-10-11)
  return (
    <div style={{ position: "absolute", left: pos ? pos.x : ROW.x + k * (w + ROW.gap), top: (pos ? pos.y : ROW.y) + float, width: w, zIndex: 8 }}>
      <div style={{ position: "relative", transform: tf, transformOrigin: origin, clipPath: clip, opacity: op * dim }}>
        <svg style={{ position: "absolute", left: -3, top: -3, width: "calc(100% + 6px)", height: "calc(100% + 6px)", overflow: "visible", zIndex: 2 }}>
          <rect x={1.5} y={1.5} width="99.4%" height="98.6%" rx={16} fill="none" stroke={C.ink} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - border} />
        </svg>
        <div style={{ background: `rgba(255,251,242,${fill})`, borderRadius: 16, padding: "20px 24px 24px",
          boxShadow: fill > 0.5 ? `${active ? 10 : 6}px ${active ? 12 : 8}px 0 rgba(27,29,26,0.14)` : undefined, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <span style={{ width: 22, height: 22, borderRadius: 11, background: C.green, flex: "none", marginTop: size * 0.36, transform: `scale(${e(f, textAt - 6, 10, BACK)})` }} />
          <div style={{ overflow: "hidden", paddingBottom: 4, flex: 1 }}>
            <Text b={b} f={f} at={textAt} reveal={REVEALS[(scene * 2 + k) % REVEALS.length]} keyAt={keyAt} size={size} from={at} to={until ?? at + 240} />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- moments, doodles, summary, transitions ---------- */
function Chain({ m, from, to, f, B = PIC }: { m: Moment; from: number; to: number; f: number; B?: Box }) {
  // each step: a pin dropping on a line that draws itself, with its own small paper card (the creator's frame, 2026-10-11)
  const n = m.steps.length;
  if (!n || f < from || f > to + 16) return null;
  const o = interpolate(f, [from, from + 14, to, to + 14], [0, 1, 1, 0], clamp);
  const x0 = B.x + 130, x1 = B.x + B.w - 130, y = B.y + B.h * 0.42;
  const xs = m.steps.map((_, k) => (n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * k) / (n - 1)));
  const ys = m.steps.map((_, k) => y + (n > 4 ? (k % 2 ? 55 : -55) : 0));
  const span = Math.max(8, Math.min(64, (to - from - 30) / n)); // every step lands before the moment ends, however short
  const at = (k: number) => from + 16 + k * span;
  const len = xs.slice(1).reduce((a, x, k) => a + Math.hypot(x - xs[k], ys[k + 1] - ys[k]), 0);
  const drawn = interpolate(f, [at(0), at(n - 1)], [0, 1], { ...clamp, easing: IO });
  const cw = Math.min(230, n > 1 ? (x1 - x0) / (n - 1) - 14 : 260);
  return (
    <AbsoluteFill style={{ opacity: o, zIndex: 2 }}>
      <div style={{ position: "absolute", left: B.x + 8, top: B.y + 8, width: B.w - 16, height: B.h - 16, borderRadius: 6, background: "rgba(14,30,18,0.7)" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <polyline points={xs.map((x, k) => `${x},${ys[k]}`).join(" ")} fill="none" stroke={C.yellow} strokeWidth={6} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - drawn)} />
      </svg>
      {m.steps.map((s, k) => {
        const d = e(f, at(k), 16, Easing.out(Easing.back(2.2)));
        const c = e(f, at(k) + 6, 14, BACK);
        return (
          <div key={k}>
            <div style={{ position: "absolute", left: xs[k] - 22, top: ys[k] - 60 - (1 - d) * 60, opacity: Math.min(1, d * 1.5) }}>
              <svg width={44} height={56} viewBox="0 0 44 56"><path d="M22 54 C22 54 4 32 4 20 A18 18 0 1 1 40 20 C40 32 22 54 22 54 Z" fill={C.yellow} stroke="#fff" strokeWidth={3} />
                <text x={22} y={26} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={17} fill={C.ink}>{k + 1}</text></svg>
            </div>
            <div style={{ position: "absolute", left: xs[k] - cw / 2, top: ys[k] + 22, width: cw, opacity: c, transform: `translateY(${(1 - c) * 24}px) scale(${0.85 + 0.15 * c})`,
              background: "#fffaf0", border: `3px solid ${C.ink}`, borderRadius: 14, padding: "12px 10px", textAlign: "center",
              boxShadow: "6px 8px 0 rgba(0,0,0,0.25)", fontFamily: FONT, fontWeight: 900, fontSize: n > 4 ? 22 : 26, color: C.green, lineHeight: 1.15 }}>{s}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function Doodle({ kind, at, f, B = PIC }: { kind: string; at: number; f: number; B?: Box }) {
  // drawn by itself, ~2 s, then gone
  const p = e(f, at, 18, IO), out = e(f, at + 48, 12, IN);
  if (f < at || out >= 1) return null;
  const st = { fill: "none", stroke: C.ink, strokeWidth: 4, strokeLinecap: "round" as const, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p };
  const box = { position: "absolute" as const, opacity: 1 - out, zIndex: 4, overflow: "visible" as const };
  if (kind === "arrow") return <svg width={170} height={110} style={{ ...box, left: B.x + B.w + 4, top: B.y + B.h - 190 }}>
    <path d="M150 20 C 110 90, 60 100, 12 70" {...st} /><path d="M12 70 L 34 58 M12 70 L 30 88" {...st} /></svg>;
  if (kind === "sparkle") return <svg width={90} height={90} style={{ ...box, left: B.x + B.w - 70, top: B.y - 40 }}>
    {[0, 45, 90, 135].map((a) => <line key={a} x1={45 - 36 * Math.cos((a * Math.PI) / 180)} y1={45 - 36 * Math.sin((a * Math.PI) / 180)} x2={45 + 36 * Math.cos((a * Math.PI) / 180)} y2={45 + 36 * Math.sin((a * Math.PI) / 180)} {...st} stroke="#e8a400" />)}</svg>;
  if (kind === "sprout") return <svg width={110} height={110} style={{ ...box, left: B.x - 130, top: B.y + B.h - 120 }}>
    <path d="M55 100 C 55 70, 52 50, 56 30" {...st} stroke={C.green} /><path d="M56 52 C 30 46, 22 28, 30 18 C 46 22, 56 34, 56 52" {...st} stroke={C.green} />
    <path d="M56 40 C 78 34, 88 18, 82 8 C 66 10, 56 24, 56 40" {...st} stroke={C.green} /></svg>;
  if (kind === "sun") return <svg width={130} height={130} style={{ ...box, left: B.x - 46, top: B.y - 52 }}>
    <circle cx={65} cy={65} r={22} {...st} stroke="#e8a400" />{[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k * Math.PI) / 4; return <line key={k} x1={65 + 32 * Math.cos(a)} y1={65 + 32 * Math.sin(a)} x2={65 + 50 * Math.cos(a)} y2={65 + 50 * Math.sin(a)} {...st} stroke="#e8a400" />; })}</svg>;
  return <svg width={80} height={70} style={{ ...box, left: B.x + B.w + 30, top: B.y + 30 }}><path d="M10 38 L 30 58 L 70 12" {...st} stroke={C.key} strokeWidth={7} /></svg>;
}

/** Between topics: a big dark-green brush stroke sweeps across the whole screen (or an iris closes and opens). */
function Sweep({ f, total, index }: { f: number; total: number; index: number }) {
  const inStyle = index % 2 ? "iris" : "brush", outStyle = (index + 1) % 2 ? "iris" : "brush";
  const a = interpolate(f, [0, 16], [1, 0], { ...clamp, easing: IO });           // revealing this scene
  const b = interpolate(f, [total - 16, total - 1], [0, 1], { ...clamp, easing: IO }); // covering it for the next
  const brush = (cover: number, leaving: boolean) => (
    <div style={{ position: "absolute", top: -80, bottom: -80, width: 2500, background: C.green, transform: "skewX(-12deg)",
      left: leaving ? 1920 - cover * 2700 : -2600 + cover * 2700,
      clipPath: "polygon(3% 0%, 97% 2%, 100% 20%, 98% 45%, 100% 70%, 97% 100%, 2% 98%, 0% 75%, 2% 50%, 0% 25%)" }} />
  );
  const iris = (cover: number) => (
    <AbsoluteFill style={{ background: C.green,
      WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent ${(1 - cover) * 75}%, #000 ${(1 - cover) * 75 + 0.5}%)`,
      maskImage: `radial-gradient(circle at 50% 50%, transparent ${(1 - cover) * 75}%, #000 ${(1 - cover) * 75 + 0.5}%)` }} />
  );
  return (
    <AbsoluteFill style={{ zIndex: 20, pointerEvents: "none" }}>
      {a > 0 && (inStyle === "brush" ? brush(a, true) : iris(a))}
      {b > 0 && (outStyle === "brush" ? brush(b, false) : iris(b))}
    </AbsoluteFill>
  );
}

/* ---------- the layouts a slide can take (the creator, 2026-10-11: everything tried since the Environment skill, mixed) ---------- */
// row: the bullet's paper print on top, the cards in a row along the bottom
// landscape: the Environment skill's coloured-pencil landscape, brush title, bullets on the left, the print on the right
// focus: a big print on the left, one paper card on the right with every bullet (the spoken one lit, the rest dim)
// quad: four bullets: the print on the left, the four cards in a 2x2 grid on the right
const BOXES: Record<string, Box> = {
  row: PIC, landscape: { x: 1010, y: 190, w: 840, h: 640 }, focus: { x: 70, y: 160, w: 1000, h: 760 }, quad: { x: 70, y: 170, w: 880, h: 700 },
};
const ROOMS: Record<string, Room> = { row: { l: true, r: true }, landscape: { l: false, r: false }, focus: { l: false, r: false }, quad: { l: false, r: false } };

/** focus: one paper card holding every bullet; each rises in as it is said, the spoken one bright with a green bar, the
 *  others at half. */
function FocusCard({ p, f, starts, cur, total }: { p: P; f: number; starts: number[]; cur: number; total: number }) {
  const bullets = p.bullets ?? [];
  const chars = bullets.reduce((a, b) => a + b.text.length, 0);
  const size = chars > 300 ? 31 : chars > 220 ? 34 : chars > 150 ? 37 : 40;
  const inn = interpolate(f, [Math.max(0, (starts[0] ?? 30) - 20), (starts[0] ?? 30) + 4], [1, 0], { ...clamp, easing: IO });
  const out = interpolate(f, [total - 18, total], [0, 1], { ...clamp, easing: IO });
  return (
    <div style={{ position: "absolute", left: 1120, top: 0, height: 1080, width: 740, display: "flex", alignItems: "center", zIndex: 6,
      transform: `translateX(${(inn + out) * 900}px)` }}>
      <div style={{ width: "100%", background: "#fffbf2", borderRadius: 18, padding: "40px 40px 44px", border: `3px solid ${C.ink}`,
        boxShadow: "12px 14px 0 rgba(27,29,26,0.14), 0 24px 46px rgba(40,40,20,0.18)", display: "flex", flexDirection: "column", gap: 26 }}>
        {bullets.map((b, k) => {
          const a = starts[k];
          const o = e(f, a, 14, IO);
          if (o <= 0) return null;
          const lit = k === cur;
          return (
            <div key={k} style={{ display: "flex", gap: 18, opacity: o * (lit ? 1 : 0.5), transform: `translateY(${(1 - o) * 24}px)` }}>
              <span style={{ width: 8, borderRadius: 4, flex: "none", background: lit ? C.green : "transparent", transition: "none" }} />
              <span style={{ width: 20, height: 20, borderRadius: 10, background: lit ? C.green : "#9aa79c", flex: "none", marginTop: size * 0.38 }} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <Text b={b} f={f} at={a + 4} reveal="mask" keyAt={p.key_at?.[k] ?? []} size={size} from={a} to={starts[k + 1] ?? a + 240} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** landscape: the Environment skill's look, no card: the bullets on the coloured-pencil landscape itself, a soft light
 *  wash behind them, green dots, the spoken one bright. */
function LandscapeText({ p, f, starts, cur }: { p: P; f: number; starts: number[]; cur: number }) {
  const bullets = p.bullets ?? [];
  const chars = bullets.reduce((a, b) => a + b.text.length, 0);
  const size = chars > 300 ? 34 : chars > 220 ? 38 : chars > 150 ? 42 : 46;
  const wash = e(f, 0, 14);
  return (
    <>
      <AbsoluteFill style={{ opacity: wash, background: "linear-gradient(90deg, rgba(252,251,246,0.9) 0%, rgba(252,251,246,0.78) 44%, rgba(252,251,246,0) 54%)" }} />
      <div style={{ position: "absolute", left: 100, top: 190, width: 860, display: "flex", flexDirection: "column", gap: 30, zIndex: 6 }}>
        {bullets.map((b, k) => {
          const a = starts[k];
          const o = e(f, a, 14, IO);
          if (o <= 0) return null;
          return (
            <div key={k} style={{ display: "flex", gap: 24, alignItems: "flex-start", opacity: o * (k === cur ? 1 : 0.55), transform: `translateX(${(1 - o) * -40}px)` }}>
              <span style={{ width: 26, height: 26, borderRadius: 13, background: C.green, flex: "none", marginTop: size * 0.38, transform: `scale(${e(f, a, 10, BACK)})` }} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <Text b={b} f={f} at={a + 6} reveal={REVEALS[(k + 2) % REVEALS.length]} keyAt={p.key_at?.[k] ?? []} size={size} from={a} to={starts[k + 1] ?? a + 240} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- a slide ---------- */
export function Documentary({ p }: { p: P & { doc_layout?: string | null } }) {
  const f = useCurrentFrame();
  const total = notesFrames(p);
  const scene = p.index ?? 0;
  const bullets = p.bullets ?? [];
  const n = bullets.length;
  const layout = p.doc_layout && BOXES[p.doc_layout] ? p.doc_layout : n >= 4 ? "quad" : "row";
  const B = BOXES[layout];
  const titleEnd = Math.max(40, Math.min(75, n ? bulletFrame(p, 0) : 75));
  const starts = bullets.map((_, k) => Math.max(titleEnd + 6 + k * 24, bulletFrame(p, k)));
  const cur = starts.reduce((a, s, k) => (f >= s ? k : a), -1);
  const entr = bullets.map((_, k) => ENTRANCES[(scene * 3 + k) % ENTRANCES.length]);
  // the picture of the bullet being spoken: one paper print at a time
  const shots: Shot[] = [];
  const nums = (k: number) => [...new Set((bullets[k]?.green ?? []).filter((t) => /\d/.test(t)))].slice(0, 2); // numbers: chips
  const first = p.bullet_images?.[0] || p.image;
  if (first) shots.push({ src: first, from: 0, callout: p.bullet_callouts?.[0], chips: nums(0) });
  bullets.forEach((_, k) => {
    const src = p.bullet_images?.[k];
    if (k > 0 && src && src !== shots[shots.length - 1]?.src) shots.push({ src, from: starts[k], callout: p.bullet_callouts?.[k], chips: nums(k) });
  });
  const m = p.moment;
  const mFrom = m ? starts[m.bullet] + (m.bullet + 1 < n ? 26 : 12) : 0;
  const mTo = m ? (m.bullet + 1 < n ? starts[m.bullet + 1] - 16 : total - 30) : 0;
  const doodles = ["arrow", "sparkle", "sprout", "sun", "tick"] as const;
  const d1 = doodles[scene % doodles.length], d2 = doodles[(scene + 2) % doodles.length];
  // the camera: a slow push-in, a 1-2 px handheld drift, and every third scene a bigger move in (zoom-through, whip-pan)
  const push = 1 + 0.035 * (f / total);
  const big = scene % 3 === 0 ? "zoom" : scene % 3 === 1 ? "whip" : "none";
  const bz = big === "zoom" ? interpolate(f, [0, 20], [1.22, 1], { ...clamp, easing: OUT }) : 1;
  const bx = big === "whip" ? interpolate(f, [0, 14], [380, 0], { ...clamp, easing: OUT }) : 0;
  const blur = big === "whip" ? interpolate(f, [0, 14], [14, 0], clamp) : big === "zoom" ? interpolate(f, [0, 20], [8, 0], clamp) : 0;
  const plate = layout === "landscape" ? (p.look as { alt_plate?: string | null } | null | undefined)?.alt_plate : null;
  const quadPos = (k: number) => ({ x: 1000 + (k % 2) * 436, y: 190 + Math.floor(k / 2) * 380, w: 412 });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {plate ? <Img src={staticFile(plate)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${1.02 + 0.03 * (f / total)})` }} /> : <Paper f={f} />}
      {layout === "landscape" && <AbsoluteFill><LandscapeText p={p} f={f} starts={starts} cur={cur} /></AbsoluteFill>}
      <AbsoluteFill style={{ transform: `translate(${bx + Math.sin(f / 23) * 1.4}px, ${Math.cos(f / 31) * 1.4}px) scale(${push * bz})`, filter: blur ? `blur(${blur}px)` : undefined }}>
        <VoxPicture shots={shots} f={f} total={total} enter={n ? starts[0] : titleEnd - 10} B={B} room={ROOMS[layout]} />
        {m && <Chain m={m} from={mFrom} to={mTo} f={f} B={B} />}
        {layout === "row" && n > 0 && <Doodle kind={d1} at={starts[0] + ENTER + 30} f={f} B={B} />}
        {layout === "row" && n > 1 && <Doodle kind={d2} at={starts[Math.min(n - 1, 2)] + ENTER + 40} f={f} B={B} />}
        <Banner title={p.slide_title ?? ""} f={f} settle={Math.max(titleEnd, n ? starts[0] : titleEnd) - 18} />
        <Globe f={f} />
      </AbsoluteFill>
      <AbsoluteFill>{/* the bullet blocks: still, outside the camera's push-in and drift */}
        {(layout === "row" || layout === "quad") && bullets.map((b, k) => (
          <RowCard key={k} b={b} k={k} n={n} f={f} at={starts[k]} until={k + 1 < n ? starts[k + 1] : null} entrance={entr[k]}
            keyAt={p.key_at?.[k] ?? []} scene={scene} active={k === cur} pos={layout === "quad" ? quadPos(k) : undefined} />
        ))}
        {layout === "focus" && <FocusCard p={p} f={f} starts={starts} cur={cur} total={total} />}
      </AbsoluteFill>
      <Sweep f={f} total={total} index={scene} />
    </AbsoluteFill>
  );
}

/** A picture scene in this look: the picture full screen, always moving, birds across it, the brush or iris between. */
export function DocumentaryPicture({ p, children }: { p: NotesProps; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const total = notesFrames(p);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${Math.sin(f / 23) * 1.4}px, ${Math.cos(f / 31) * 1.4}px)` }}>{children}</AbsoluteFill>
      <Birds f={f} box={{ w: 1920, h: 1080 }} />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.42), transparent 22%)" }} />
      <div style={{ position: "absolute", left: 70, bottom: 56, fontFamily: FONT, fontWeight: 900, fontSize: 26, letterSpacing: 5, color: "#fff",
        opacity: e(f, 4, 16) }}>ENVIRONMENT · {(p.section ?? "").toUpperCase()}</div>
      <Globe f={f} />
      <Sweep f={f} total={total} index={p.index ?? 0} />
    </AbsoluteFill>
  );
}
