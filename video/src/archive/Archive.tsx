import { loadFont as loadCourier } from "@remotion/google-fonts/CourierPrime";
import { loadFont as loadDisplay } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadHand } from "@remotion/google-fonts/HomemadeApple";
import { loadFont as loadNews } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame } from "remotion";

/* A fact-driven documentary in the Vox archival register: dark frames, real archival images framed with blurred side
   fills, real documents and headlines, numbers and charts drawn from sourced figures. One beat per spoken line; something
   moves in every frame. Nothing here invents content: every word and number comes from the props. */

const { fontFamily: TYPEW } = loadCourier();
const { fontFamily: DISPLAY } = loadDisplay();
const { fontFamily: HAND } = loadHand();
const { fontFamily: NEWS } = loadNews();
const { fontFamily: COND } = loadOswald();

export const FPS = 30;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const C = { bg: "#121110", card: "#efe9dd", ink: "#1b1a18", cream: "#efe6d2", dim: "#8b8478", accent: "#e8643a", hi: "rgba(242,205,70,0.85)" };

type Headline = { outlet: string; date: string; headline: string };
export type ABeat =
  | { kind: "headline"; items: Headline[]; stamp?: string }
  | { kind: "number"; value: string; label: string; source: string; stamp?: string }
  | { kind: "quote"; text: string; who: string; when: string }
  | { kind: "filing"; company: string; form: string; period: string; quote: string; highlight: string; lead?: string; authority?: string }
  | { kind: "phrase"; text: string }
  | { kind: "chart"; title: string; bars: { label: string; value: number; display: string }[]; source: string }
  | { kind: "archival"; src: string; caption?: string; credit?: string; focus?: "push" | "pan" | "tilt" }
  | { kind: "title"; title: string; kicker?: string };
export type ALine = { speech?: string; audio?: string | null; seconds: number; pause?: number; beat: ABeat; sfx?: string };
export type ArchiveProps = { speed?: number; lines: ALine[]; narrator?: { image: string; name: string } };

// every card sits on a REAL photo (the nearest archival image in the film, darkened and drifting), never on bare black
function backdrops(lines: ALine[]): (string | undefined)[] {
  const srcs = lines.map((l) => (l.beat.kind === "archival" ? l.beat.src : undefined));
  const all = srcs.filter(Boolean) as string[];
  return lines.map((l, i) => {
    if (l.beat.kind === "archival" || l.beat.kind === "title") return undefined;
    // first choice: an image whose file name names what the card is about (Oracle, Stanford, Nasdaq, Keynes...)
    const words = (JSON.stringify(l.beat) + " " + (l.speech ?? "")).match(/\b[A-Z][A-Za-z]{3,}\b/g) ?? [];
    for (const w of words) {
      const hit = all.find((s) => s.toLowerCase().includes(w.toLowerCase()));
      if (hit) return hit;
    }
    for (let d = 0; d < lines.length; d++) {  // nearest before, then after (the same chapter is usually closest)
      if (srcs[i - d]) return srcs[i - d];
      if (srcs[i + d]) return srcs[i + d];
    }
    return undefined;
  });
}

export function layoutArchive(p: ArchiveProps) {
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

export const Archive = (p: ArchiveProps) => {
  const { lines } = layoutArchive(p);
  const speed = p.speed ?? 1;
  const bgs = backdrops(p.lines);
  const narrator = p.narrator ?? { image: "hosts/anchor/talk.png", name: "Narrator" };
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("sfx/bed.wav")} volume={0.07} loop />
      {lines.map((l, i) => (
        <Sequence key={i} from={l.start} durationInFrames={l.frames + (i === lines.length - 1 ? 20 : 0)}>
          {bgs[i] && <Backdrop src={bgs[i]!} seed={i} frames={l.frames} />}
          <BeatView beat={l.beat} frames={l.frames} talk={l.talk} index={i} />
          {l.audio && <Audio src={staticFile(l.audio)} playbackRate={speed} />}
          {l.audio && <Dock image={narrator.image} name={narrator.name} audio={l.audio} speed={speed} talk={l.talk} />}
          {l.sfx && <Audio src={staticFile(`sfx/${l.sfx}.wav`)} volume={0.35} />}
        </Sequence>
      ))}
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};

/** A real photo behind a card: darkened, desaturated, slowly drifting, so the frame is never empty and always moving. */
function Backdrop({ src, seed, frames }: { src: string; seed: number; frames: number }) {
  const f = useCurrentFrame();
  const k = Math.min(1, f / Math.max(1, frames));
  const dir = seed % 2 ? 1 : -1;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", inset: -80, width: "calc(100% + 160px)", height: "calc(100% + 160px)", objectFit: "cover",
        filter: "grayscale(0.55) brightness(0.32) blur(2px)", transform: `scale(${1.06 + 0.06 * k}) translateX(${dir * (30 - 60 * k)}px)` }} />
    </AbsoluteFill>
  );
}

/** The narrator, pinned bottom-left like the network film's hosts: a small cut-out that lifts while speaking, with a red
    waveform line driven by the real voice. One narrator, so nothing to switch between. */
export function Dock({ image, name, audio, speed, talk }: { image: string; name: string; audio: string; speed: number; talk: number }) {
  const f = useCurrentFrame();
  const data = useAudioData(staticFile(audio));
  const speaking = f < talk;
  const lift = spring({ frame: speaking ? f : f - talk, fps: FPS, config: { damping: 16 } });
  const up = speaking ? lift : 1 - lift;
  const bars = data && speaking ? visualizeAudio({ fps: FPS, frame: Math.floor(f * speed), audioData: data, numberOfSamples: 32 }).slice(0, 18) : new Array(18).fill(0);
  return (
    <div style={{ position: "absolute", left: 36, bottom: 0, width: 260, height: 250, pointerEvents: "none" }}>
      <Img src={staticFile(image)} style={{ position: "absolute", left: 0, bottom: 0, height: 210 + 14 * up, filter: `grayscale(${1 - 0.7 * up}) drop-shadow(0 10px 18px rgba(0,0,0,0.6))`, opacity: 0.75 + 0.25 * up }} />
      <svg width="220" height="40" style={{ position: "absolute", left: 150, bottom: 70 }}>
        {bars.map((b, i) => {
          const h = 3 + Math.min(34, b * 240) * up;
          return <rect key={i} x={i * 12} y={20 - h / 2} width={6} height={h} fill={C.accent} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: 150, bottom: 40, background: up > 0.5 ? C.accent : "rgba(18,17,16,0.8)", color: C.cream, padding: "3px 12px",
        fontFamily: COND, fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>{name.toUpperCase()}</div>
    </div>
  );
}

function Grain() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.5 }}>
      <svg width="100%" height="100%">
        <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 7} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#n)" opacity="0.35" />
      </svg>
    </AbsoluteFill>
  );
}
const Vignette = () => <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />;

/* ---------------- beats ---------------- */
function BeatView({ beat, frames, talk, index }: { beat: ABeat; frames: number; talk: number; index: number }) {
  const f = useCurrentFrame();
  const k = Math.min(1, f / Math.max(1, frames));
  const inn = spring({ frame: f, fps: FPS, config: { damping: 20, stiffness: 150 } });
  const wrap: React.CSSProperties = { position: "absolute", inset: 0, opacity: Math.min(1, inn * 1.6), transform: `scale(${1 + 0.03 * k})` };
  switch (beat.kind) {
    case "archival": return <div style={wrap}><ArchivalFrame b={beat} k={k} /></div>;
    case "headline": return <div style={wrap}><Headlines b={beat} f={f} talk={talk} index={index} /></div>;
    case "number": return <div style={wrap}><BigNumber b={beat} f={f} /></div>;
    case "quote": return <div style={wrap}><Quote b={beat} f={f} talk={talk} /></div>;
    case "filing": return <div style={wrap}><Filing b={beat} f={f} talk={talk} /></div>;
    case "chart": return <div style={wrap}><Chart b={beat} f={f} /></div>;
    case "title": return <div style={wrap}><Title b={beat} f={f} /></div>;
    case "phrase": return <div style={wrap}><Phrase b={beat} f={f} /></div>;
  }
}

/** The Vox archival frame: the real image centred, the same image blurred and darkened filling the sides. */
function ArchivalFrame({ b, k }: { b: Extract<ABeat, { kind: "archival" }>; k: number }) {
  const move = b.focus === "pan" ? `scale(1.12) translateX(${3 - 6 * k}%)` : b.focus === "tilt" ? `scale(1.12) translateY(${3 - 6 * k}%)` : `scale(${1.02 + 0.1 * k})`;
  return (
    <AbsoluteFill>
      <Img src={staticFile(b.src)} style={{ position: "absolute", inset: -60, width: "calc(100% + 120px)", height: "calc(100% + 120px)", objectFit: "cover", filter: "blur(28px) brightness(0.35) grayscale(0.4)" }} />
      <div style={{ position: "absolute", top: 60, bottom: 60, left: "50%", transform: "translateX(-50%)", aspectRatio: "auto", height: 960, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <Img src={staticFile(b.src)} style={{ height: "100%", transform: move, filter: "grayscale(0.2) contrast(1.05)" }} />
      </div>
      {b.caption && <div style={{ position: "absolute", left: 90, bottom: 70, maxWidth: 520, fontFamily: NEWS, fontStyle: "italic", fontSize: 30, color: C.cream, lineHeight: 1.3 }}>{b.caption}</div>}
      {b.credit && <div style={{ position: "absolute", right: 60, bottom: 30, fontFamily: TYPEW, fontSize: 16, color: C.dim, letterSpacing: 1 }}>{b.credit}</div>}
    </AbsoluteFill>
  );
}

/** Real headlines, cascading in across the line (a montage when there are several). */
/* ---------------- paper and the reading camera ---------------- */
const PAPER = "#efe8da";

/** Newsprint: fibre texture, a faint yellowing at the edges, torn top and bottom edges. */
function Paper({ children, seed, style }: { children: React.ReactNode; seed: number; style?: React.CSSProperties }) {
  const pts: string[] = [];
  for (let i = 0; i <= 24; i++) pts.push(`${(i / 24) * 100}% ${((Math.sin(seed * 7 + i * 3.1) + 1) * 0.6).toFixed(2)}%`);
  for (let i = 24; i >= 0; i--) pts.push(`${(i / 24) * 100}% ${(100 - (Math.sin(seed * 5 + i * 2.3) + 1) * 0.6).toFixed(2)}%`);
  return (
    <div data-card="" style={{ position: "relative", filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.6))", ...style }}>
      <div style={{ position: "relative", background: PAPER, clipPath: `polygon(${pts.join(",")})`, overflow: "hidden" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "multiply", opacity: 0.55, pointerEvents: "none" }}>
          <filter id={`p${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" seed={seed} /><feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0.35 0" /></filter>
          <rect width="100%" height="100%" filter={`url(#p${seed})`} />
        </svg>
        <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 120px rgba(150,120,70,0.28)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>{children}</div>
      </div>
    </div>
  );
}

type Rect = { x: number; y: number; w: number; h: number };
/** Reading progress 0..1 across the line: starts after the camera has zoomed in, ends just before the line does. */
const reading = (f: number, talk: number) => interpolate(f, [talk * 0.14, talk * 0.9], [0, 1], clamp);

/** The camera reads with the narrator: it starts on the whole page, zooms into the exact words being read (measured on
    the page, not guessed) and glides along them, smoothed so it never jerks. Elements marked data-cam are what it reads. */
function ReadCam({ f, talk, zoom, children }: { f: number; talk: number; zoom: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Rect[] | null>(null);
  const [handle] = useState(() => delayRender("measuring text for the reading camera"));
  const at = (t: number): { z: number; x: number; y: number } => {
    const zin = interpolate(t, [0, talk * 0.12], [1, zoom], { ...clamp, easing: (v) => 1 - Math.pow(1 - v, 3) });
    if (!rects || !rects.length) return { z: zin, x: 960, y: 540 };
    const total = rects.reduce((a, r) => a + r.w, 0);
    let s = reading(t, talk) * total, i = 0;
    while (i < rects.length - 1 && s > rects[i].w) { s -= rects[i].w; i++; }
    const r = rects[i];
    const tx = r.x + Math.min(s, r.w), ty = r.y + r.h / 2;
    const w = interpolate(t, [0, talk * 0.12], [0, 1], clamp);  // drift from the page centre to the words while zooming
    return { z: zin, x: 960 + (tx - 960) * w, y: 540 + (ty - 540) * w };
  };
  let z = 0, x = 0, y = 0;
  for (let k = 0; k < 10; k++) { const c = at(Math.max(0, f - k)); z += c.z / 10; x += c.x / 10; y += c.y / 10; }  // smoothing
  const tx = 960 - z * x, ty = 540 - z * y;
  useLayoutEffect(() => {
    if (rects || !ref.current) return;
    // Measured against the PAPER, not the camera layer: while measuring, Remotion may lay the page out off-screen, so
    // absolute positions are meaningless, but positions relative to the paper are exact. The paper is centred in the
    // 1920x1080 frame, so its frame position is known from its layout size.
    const card = ref.current.querySelector("[data-card]") as HTMLElement | null;
    const out: Rect[] = [];
    if (card) {
      const cr = card.getBoundingClientRect();
      const scale = cr.width / card.offsetWidth || 1;
      const ox = (1920 - card.offsetWidth) / 2, oy = (1080 - card.offsetHeight) / 2;
      ref.current.querySelectorAll("[data-cam]").forEach((el) => {
        for (const r of Array.from(el.getClientRects())) {
          out.push({ x: ox + (r.left - cr.left) / scale, y: oy + (r.top - cr.top) / scale, w: r.width / scale, h: r.height / scale });
        }
      });
    }
    setRects(out);
    continueRender(handle);
  }, [rects]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AbsoluteFill ref={ref} style={{ transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
      {children}
    </AbsoluteFill>
  );
}

/** A highlighter sweeping across the words in step with the narration. */
const Marker = ({ text, progress }: { text: string; progress: number }) => (
  <span data-cam="" style={{ backgroundImage: `linear-gradient(${C.hi}, ${C.hi})`, backgroundRepeat: "no-repeat", backgroundSize: `${progress * 100}% 100%` }}>{text}</span>
);

/** Real headlines. One: a newspaper page the camera reads. Several: clippings dropping in one after another. */
function Headlines({ b, f, talk, index }: { b: Extract<ABeat, { kind: "headline" }>; f: number; talk: number; index: number }) {
  const n = b.items.length;
  if (n === 1) {
    const h = b.items[0];
    return (
      <ReadCam f={f} talk={talk} zoom={1.45}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Paper seed={index + 3} style={{ width: 1380, transform: `rotate(${(index % 3) - 1}deg)` }}>
            <div style={{ padding: "40px 70px 50px" }}>
              <div style={{ textAlign: "center", fontFamily: DISPLAY, fontSize: 64, color: C.ink, letterSpacing: 1 }}>{h.outlet}</div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `3px solid ${C.ink}`, borderBottom: `1px solid ${C.ink}`, margin: "12px 0 26px", padding: "6px 0",
                fontFamily: TYPEW, fontSize: 20, color: C.ink, letterSpacing: 2 }}><span>{h.date.toUpperCase()}</span><span>WORLD · BUSINESS · TECHNOLOGY</span></div>
              <div style={{ fontFamily: DISPLAY, fontSize: 84, lineHeight: 1.08, color: C.ink }}><Marker text={h.headline} progress={reading(f, talk)} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 30, marginTop: 34, opacity: 0.35 }}>
                {[0, 1, 2].map((c) => <div key={c}>{Array.from({ length: 6 }, (_, i) => <div key={i} style={{ height: 9, background: C.ink, margin: "0 0 13px", width: `${70 + ((c * 7 + i * 13) % 30)}%` }} />)}</div>)}
              </div>
            </div>
          </Paper>
        </AbsoluteFill>
      </ReadCam>
    );
  }
  return (
    <AbsoluteFill>
      {b.items.map((h, i) => {
        const at = Math.round((i / n) * talk * 0.85);
        const s = spring({ frame: f - at, fps: FPS, config: { damping: 16, stiffness: 150 } });
        if (f < at) return null;
        const rot = ((index * 13 + i * 7) % 5) - 2;
        return (
          <div key={i} style={{ position: "absolute", left: 150 + (i % 2) * 520 + i * 40, top: 110 + i * 195, width: 1100, transform: `translateY(${(1 - s) * 60}px) scale(${1.15 - 0.15 * s}) rotate(${rot * 0.6}deg)`, opacity: s }}>
            <Paper seed={index * 5 + i}>
              <div style={{ padding: "24px 40px 30px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: COND, fontWeight: 700, fontSize: 24, letterSpacing: 2, color: C.accent }}>
                  <span>{h.outlet.toUpperCase()}</span><span style={{ color: C.dim }}>{h.date.toUpperCase()}</span>
                </div>
                <div style={{ height: 3, background: C.ink, margin: "10px 0 14px" }} />
                <div style={{ fontFamily: DISPLAY, fontSize: 50, lineHeight: 1.08, color: C.ink }}>{h.headline}</div>
              </div>
            </Paper>
          </div>
        );
      })}
      {b.stamp && <Stamp text={b.stamp} f={f - Math.round(talk * 0.55)} />}
    </AbsoluteFill>
  );
}

function Stamp({ text, f }: { text: string; f: number }) {
  if (f < 0) return null;
  const s = spring({ frame: f, fps: FPS, config: { damping: 10, stiffness: 180 } });
  return (
    <div style={{ position: "absolute", right: 150, bottom: 150, transform: `scale(${1.8 - 0.8 * s}) rotate(-7deg)`, opacity: s, border: `7px solid ${C.accent}`, color: C.accent,
      padding: "14px 30px", fontFamily: COND, fontWeight: 700, fontSize: 64, letterSpacing: 4, background: "rgba(18,17,16,0.5)" }}>{text.toUpperCase()}</div>
  );
}

function BigNumber({ b, f }: { b: Extract<ABeat, { kind: "number" }>; f: number }) {
  const m = b.value.match(/^([^0-9-]*)(-?[0-9][0-9,.]*)(.*)$/);
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
  const t = interpolate(f, [4, 38], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  const dec = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const shown = m && !isNaN(target) ? `${m[1]}${Math.round(target * t * 10 ** dec) / 10 ** dec > 0 ? (target * t).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : 0}${m[3]}` : b.value;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 340, lineHeight: 0.9, color: C.cream, transform: "scaleY(1.2)" }}>{shown}</div>
      <div style={{ width: 1000 * t, height: 3, background: C.accent, margin: "54px 0 26px" }} />
      <div style={{ fontFamily: NEWS, fontSize: 48, color: C.cream, maxWidth: 1300, textAlign: "center", opacity: interpolate(f, [18, 30], [0, 1], clamp) }}>{b.label}</div>
      <div style={{ fontFamily: TYPEW, fontSize: 24, color: C.dim, marginTop: 22, letterSpacing: 2, opacity: interpolate(f, [26, 38], [0, 1], clamp) }}>SOURCE: {b.source.toUpperCase()}</div>
      {b.stamp && <Stamp text={b.stamp} f={f - 40} />}
    </AbsoluteFill>
  );
}

/** A quote printed on a clipping: words ink in as they are spoken, a marker follows them, and the camera reads along. */
function Quote({ b, f, talk }: { b: Extract<ABeat, { kind: "quote" }>; f: number; talk: number }) {
  const words = b.text.split(" ");
  const p = reading(f, talk);
  const shown = p * words.length;
  return (
    <ReadCam f={f} talk={talk} zoom={1.3}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Paper seed={words.length + 11} style={{ width: 1400, transform: "rotate(-0.8deg)" }}>
          <div style={{ padding: "50px 80px 56px" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 180, color: C.accent, lineHeight: 0.5, height: 70 }}>“</div>
            <div style={{ fontFamily: NEWS, fontSize: 66, lineHeight: 1.3, color: C.ink }}>
              <span data-cam="">
                {words.map((w, i) => {
                  const ink = Math.max(0.14, Math.min(1, shown - i + 1));
                  const hot = i < shown && i >= shown - 4;
                  return <span key={i} style={{ opacity: ink, backgroundColor: hot ? C.hi : "transparent" }}>{w} </span>;
                })}
              </span>
            </div>
            <div style={{ marginTop: 34, borderTop: `2px solid ${C.ink}`, paddingTop: 16, fontFamily: COND, fontWeight: 700, fontSize: 32, letterSpacing: 2, color: C.ink }}>
              {b.who.toUpperCase()} <span style={{ color: C.dim }}>{b.when ? `· ${b.when.toUpperCase()}` : ""}</span>
            </div>
          </div>
        </Paper>
      </AbsoluteFill>
    </ReadCam>
  );
}

/** A real document on paper: the camera zooms into the key sentence and follows the highlighter across it. */
function Filing({ b, f, talk }: { b: Extract<ABeat, { kind: "filing" }>; f: number; talk: number }) {
  const hl = b.highlight && b.quote.includes(b.highlight) ? b.highlight : b.quote;
  const idx = b.quote.indexOf(hl);
  return (
    <ReadCam f={f} talk={talk} zoom={1.65}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Paper seed={b.quote.length} style={{ width: 1340, transform: "rotate(-0.6deg)" }}>
          <div style={{ padding: "54px 80px 64px" }}>
            <div style={{ textAlign: "center", fontFamily: TYPEW, fontSize: 22, color: C.ink, letterSpacing: 3 }}>{b.authority ?? "UNITED STATES SECURITIES AND EXCHANGE COMMISSION"}</div>
            <div style={{ textAlign: "center", fontFamily: DISPLAY, fontSize: 60, color: C.ink, margin: "16px 0 4px" }}>{b.form}</div>
            <div style={{ textAlign: "center", fontFamily: TYPEW, fontSize: 22, color: C.ink }}>{b.company.toUpperCase()}{b.period ? ` · ${b.period}` : ""}</div>
            <div style={{ height: 2, background: C.ink, margin: "26px 0 28px" }} />
            {b.lead && <div style={{ fontFamily: TYPEW, fontSize: 22, color: C.dim, marginBottom: 14 }}>{b.lead}</div>}
            <div style={{ fontFamily: NEWS, fontSize: 44, lineHeight: 1.5, color: C.ink }}>
              {b.quote.slice(0, idx)}<Marker text={hl} progress={reading(f, talk)} />{b.quote.slice(idx + hl.length)}
            </div>
          </div>
        </Paper>
      </AbsoluteFill>
    </ReadCam>
  );
}

function Chart({ b, f }: { b: Extract<ABeat, { kind: "chart" }>; f: number }) {
  const max = Math.max(...b.bars.map((x) => Math.abs(x.value)));
  const min = Math.min(...b.bars.map((x) => x.value));
  // a fall between close values is invisible from zero: start the axis just below the smallest value, and say so
  const floor = min > 0 && (max - min) / max < 0.3 ? Math.floor((min * 0.8) / 10 ** Math.floor(Math.log10(min))) * 10 ** Math.floor(Math.log10(min)) : 0;
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 200px" }}>
      <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 60, color: C.cream, letterSpacing: 1 }}>{b.title.toUpperCase()}</div>
      <div style={{ height: 3, background: C.cream, margin: "16px 0 60px", opacity: 0.8 }} />
      {b.bars.map((x, i) => {
        const g = interpolate(f, [8 + i * 10, 34 + i * 10], [0, 1], clamp);
        const w = ((x.value - floor) / (max - floor)) * 100;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, marginBottom: 50 }}>
            <div style={{ width: 300, fontFamily: NEWS, fontSize: 44, color: C.cream }}>{x.label}</div>
            <div style={{ flex: 1, height: 110 }}><div style={{ width: `${w * g}%`, height: "100%", background: i === b.bars.length - 1 ? C.accent : C.cream }} /></div>
            <div style={{ width: 300, textAlign: "right", fontFamily: DISPLAY, fontSize: 90, color: C.cream, opacity: g }}>{x.display}</div>
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: TYPEW, fontSize: 22, color: C.dim, letterSpacing: 2 }}>
        <span>SOURCE: {b.source.toUpperCase()}</span>{floor > 0 && <span>AXIS STARTS AT {floor.toLocaleString("en-US")}</span>}
      </div>
    </AbsoluteFill>
  );
}

/** A short phrase from the line, when there is nothing real to show: type does the work, never an invented picture. */
function Phrase({ b, f }: { b: Extract<ABeat, { kind: "phrase" }>; f: number }) {
  const words = b.text.split(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 200px" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 130, lineHeight: 1.08, color: C.cream, textAlign: "center" }}>
        {words.map((w, i) => {
          const s = spring({ frame: f - 4 - i * 4, fps: FPS, config: { damping: 16 } });
          return <span key={i} style={{ display: "inline-block", marginRight: 28, opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>{w}</span>;
        })}
      </div>
      <div style={{ width: 600 * interpolate(f, [10, 30], [0, 1], clamp), height: 3, background: C.accent, marginTop: 40 }} />
    </AbsoluteFill>
  );
}

function Title({ b, f }: { b: Extract<ABeat, { kind: "title" }>; f: number }) {
  const t = spring({ frame: f - 6, fps: FPS, config: { damping: 22 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {b.kicker && <div style={{ fontFamily: TYPEW, fontSize: 30, letterSpacing: 10, color: C.accent, marginBottom: 30, opacity: t }}>{b.kicker.toUpperCase()}</div>}
      <div style={{ fontFamily: DISPLAY, fontSize: 150, lineHeight: 1.05, color: C.cream, textAlign: "center", maxWidth: 1600, transform: `scale(${1.08 - 0.08 * t})`, opacity: t }}>{b.title}</div>
      <div style={{ fontFamily: HAND, fontSize: 40, color: C.dim, marginTop: 40, opacity: interpolate(f, [30, 50], [0, 1], clamp) }}>a documentary</div>
    </AbsoluteFill>
  );
}
