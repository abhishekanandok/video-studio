import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMukta } from "@remotion/google-fonts/Mukta";
import { loadFont as loadNews } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadTiro } from "@remotion/google-fonts/TiroDevanagariHindi";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { tornClip } from "../explainer/collage";
import { GridPaper } from "../board/Editorial";
import { Canvas, type Visual } from "./Canvas";
import { type Diagram, DiagramSvg } from "./DiagramSvg";
import { Documentary, DocumentaryPicture, type Moment } from "./Documentary";
import { Geography, GeographyPicture } from "./Geography";
import { GeoBeats } from "./GeoBeats";

/* The exam notes film (video/notes.py): text slides on the Vox grid paper, talked through by the hosts.
   Zero-blur rule: text is never scaled, filtered or shadowed; it only slides in by whole pixels and fades. Latin text uses
   Inter / Newsreader, Devanagari falls back to Mukta / Tiro Devanagari Hindi, so mixed Hinglish lines render natively. */

const { fontFamily: INTER } = loadInter("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });
const { fontFamily: MUKTA } = loadMukta("normal", { weights: ["500", "700"], subsets: ["devanagari", "latin"] });
const { fontFamily: NEWS } = loadNews("italic", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: TIRO } = loadTiro("italic", { weights: ["400"], subsets: ["devanagari"] });
export const SANS = `${INTER}, ${MUKTA}, sans-serif`;
const SERIF = `${NEWS}, ${TIRO}, serif`;

export const FPS = 30;
const LEAD = 0.4; // seconds of silence before the voices start (the card lands first)
const TAIL = 0.6;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const C = { ink: "#141414", card: "#f6f1e6", shade: "rgba(0,0,0,0.13)", yellow: "#ffd60a", green: "#6dff4a", dim: "#5b5b5b" };

export type NBullet = { text: string; key?: string[]; green?: string[] };
export type NotesProps = {
  kind: "hook" | "slide" | "picture"; index: number; total: number; title: string; audio: string; seconds: number; speed: number;
  line_at: number[]; bullet_at: number[];
  // audio films (video/audiofilm.py): the voice is one recording laid over the joined film, so a scene has no lead-in
  // silence (lead 0) and an exact length in frames, cut where its words are spoken
  lead?: number; frames?: number;
  // a slide skill (the Skill Tab): only the look around the paper card; the card, its bullets and their timing never change
  look?: Look | null;
  // picture breaks: the scene's visual fills the screen between bullets (frames from the scene start; fades in and out)
  interludes?: { from: number; to: number; image: string; credit?: string; caption?: string; labels?: BreakLabel[]; zoom?: Zoom; image2?: string;
    motion?: { dir: string; n: number; fps: number; start?: number };
    // how the break shows the picture (the agent varies it): zoom = grows, all labels; pen = a red pen goes from part to
    // part; spotlight = the rest dims, a light goes from part to part; tour = the camera glides close to each part;
    // pinned = drops in like a taped paper sheet. points: where the pen / light / camera goes, arriving at frame `at`.
    style?: "zoom" | "pen" | "spotlight" | "tour" | "pinned"; points?: PenPoint[] }[];
  pointer?: PenPoint[];  // a glance: the pen moves over the slide's own picture (no full screen), arriving at frame `at`  // a zoom whose picture moves: n frames dir/0001.jpg.. played at full size
  image2?: string | null;  // a scene's second picture (a canvas slot with fill "scene2")
  bullet_images?: (string | null)[];  // each bullet's own picture (a canvas slot with fill "bullet")
  kicker?: string; headline?: string;  // hook
  section?: string; slide_title?: string; bullets?: NBullet[]; pages?: string | null;  // slide
  image?: string | null; credit?: string;  // an informative picture, only where the slide needs one
  // a long picture scene: more pictures coming in as the narrator talks (at: frame), each with a caption set by code
  montage?: { image: string; at: number; caption?: string }[];
  // the real people the bullets name: their photos in small Vox-style cards under the bullets, each name written under
  // its photo, each arriving with the bullet that names them
  people?: { image: string; name: string; role?: string; bullet: number }[] | null;
  moment?: Moment | null;  // the documentary look: a bullet's steps drawn as a chain of pins
  diagram?: Diagram | null;  // the Diagram card: a still diagram drawn by code, in the picture's place
  // a moving picture: the image is the background, the sprite moves on it (y = where its bottom rests, h = its height)
  sprite?: string | null; motion?: { kind: string; y: number; h: number; cx?: number; cy?: number; r?: number } | null;
  // the explain phase: lines [0, split) are spoken over the animation; the slide (and its bullets) comes after
  split?: number; visual?: { objects: Visual["objects"]; steps: (Omit<Visual["steps"][number], "start"> & { line: number; at?: number })[] } | null;
};

/** A label on a picture break: its words on a paper tag beside the picture (tx, ty: where the tag meets its line; side:
 *  the tag sits left or right of that), and a line to the point it names (px, py). All px on the page, from the pipeline. */
export type PenPoint = { x: number; y: number; at: number; text?: string };
export const TRAVEL = 15;  // frames: the pen (light, camera) glides from one part to the next in half a second

export type BreakLabel = { text: string; px: number; py: number; tx: number; ty: number; side: "left" | "right" | "top" | "bottom" };

/** A zoom break: the slide's own picture grows from its place (s*) to the big frame (t*) and back; radius = its shape. */
export type Zoom = { sx: number; sy: number; sw: number; sh: number; tx: number; ty: number; tw: number; th: number; radius: string; blend?: boolean;
  x2?: number; y2?: number; w2?: number; h2?: number;
  rect?: boolean; sr?: number; tr?: number };  // rect: grows into the whole picture, corners sr -> tr px (a moving zoom)  // x2..h2: a second picture beside it (a fact the first can't show)
export const ZOOM = 24, LABEL_FADE = 12;  // frames: the picture grows (and shrinks) in 0.8 s, easing in and out; its labels fade in after

export type Look = {
  plate?: string | null;  // a painted background instead of the grid paper
  layout?: "card" | "picture_right" | "on_picture" | "documentary" | "geography";  // documentary: Documentary.tsx, every frame moves  // the picture inside the card (classic), beside it, or behind it
  frame?: "print" | "blend" | "blob";  // the side picture: a framed print, painted onto the page, or a soft organic shape
  tape?: string | null;  // washi-tape strips on the card's top corners, in this colour
  canvas?: Canvas | null;  // a free layout (the Skill Tab's agent designs it); when set, layout and frame are not used
  glass?: string | null;  // a backdrop slide: the card is frosted glass in this tint (from the photo), its text white
  bare?: boolean;  // no paper card: the text sits on the background itself (a soft wash behind it keeps it readable)
  text_style?: "brush" | null;  // brush: the title on a dark-green brush stroke in white, key terms in green and blue
  // how a picture break shows its picture: framed (default) = on the skill's background, in a shape; full = full screen
  break_style?: "zoom" | "framed" | "full"; break_shape?: "arch" | "rounded" | "rect" | "oval" | "circle";
  break_caption?: boolean;  // a framed break shows its caption on a paper card beside the picture
  break_text?: "labels" | "caption" | "none";  // the text a framed break shows: labels pointing at the picture (default),
                                               // a caption card beside it, or nothing
};

/** Where a framed picture break's picture sits (px on the 1920x1080 page), by shape (video/slideskill.py BREAK_BOX). */
export const BREAK_BOX: Record<string, { x: number; y: number; w: number; h: number }> = {
  arch: { x: 520, y: 70, w: 880, h: 940 }, rounded: { x: 240, y: 135, w: 1440, h: 810 }, rect: { x: 240, y: 135, w: 1440, h: 810 },
  oval: { x: 410, y: 90, w: 1100, h: 900 }, circle: { x: 510, y: 90, w: 900, h: 900 },
};
/** The same, when the break has a caption: the picture moves right, the caption card sits on the left. */
export const BREAK_BOX_CAPTION: Record<string, { x: number; y: number; w: number; h: number }> = {
  arch: { x: 980, y: 70, w: 820, h: 940 }, rounded: { x: 820, y: 230, w: 1000, h: 620 }, rect: { x: 820, y: 230, w: 1000, h: 620 },
  oval: { x: 900, y: 110, w: 900, h: 860 }, circle: { x: 960, y: 140, w: 800, h: 800 },
};

/** A picture slot on the 1920x1080 page. fill: scene = the scene's picture, scene2 = its second picture, bullet = the
 *  picture of the latest bullet to arrive (it changes as each bullet arrives), fixed = src (a sticker painted once for
 *  the skill, or the creator's own image). */
export type Slot = {
  x: number; y: number; w: number; h: number; fill: "scene" | "scene2" | "bullet" | "fixed"; src?: string | null;
  shape?: "rect" | "rounded" | "oval" | "circle" | "arch" | "blob"; frame?: "none" | "print" | "blend" | "shadow" | "vox";
  rotate?: number; layer?: "behind" | "front";
};
/** The paper card's place (y null = centred) and width, and the picture slots around or behind it. */
export type Canvas = { card: { x: number; y?: number | null; w: number }; slots: Slot[] };

export const notesFrames = (p: NotesProps) =>
  p.frames ? Math.max(1, p.frames) : Math.max(1, Math.ceil((LEAD + (p.seconds || 1) / (p.speed || 1) + TAIL) * FPS));

/** The frame a spoken line starts at (at playback speed, after the lead-in). */
const lineFrame = (p: NotesProps, line: number, at = 0) => {
  const t0 = p.line_at?.[line] ?? 0;
  const t1 = p.line_at?.[line + 1] ?? (p.seconds || t0);
  return Math.round(((p.lead ?? LEAD) + (t0 + (t1 - t0) * at) / (p.speed || 1)) * FPS);
};

export function Notes(p: NotesProps) {
  const lead = Math.round((p.lead ?? LEAD) * FPS);
  const f = useCurrentFrame();
  const explain = p.kind === "slide" && !!p.visual && (p.split ?? 0) > 0;
  const cut = explain ? lineFrame(p, p.split!) - 6 : 0; // the slide arrives just before the first recap line
  const visual: Visual | null = explain ? {
    objects: p.visual!.objects,
    steps: p.visual!.steps.map((s) => ({ ...s, start: lineFrame(p, Math.min(s.line, p.split! - 1), s.at ?? 0) })),
  } : null;
  const fade = explain ? interpolate(f, [cut, cut + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  if (p.look?.layout === "geography") return (  // the World Geography look: Geography.tsx, maps drawn by code
    <AbsoluteFill style={{ background: "#efe3c8" }}>
      {(p as { geo?: { beats_v?: number } }).geo?.beats_v === 2 ? <GeoBeats p={p as never} />
        : p.kind === "picture" ? <GeographyPicture p={p}><FullPicture p={p} /></GeographyPicture> : <Geography p={p} />}
      {p.audio && <Sequence from={lead}><Audio src={staticFile(p.audio)} playbackRate={p.speed || 1} /></Sequence>}
    </AbsoluteFill>
  );
  if (p.look?.layout === "documentary") return (
    <AbsoluteFill style={{ background: "#efe8d8" }}>
      {p.kind === "picture" ? <DocumentaryPicture p={p}><FullPicture p={p} /></DocumentaryPicture> : <Documentary p={p} />}
      {p.audio && <Sequence from={lead}><Audio src={staticFile(p.audio)} playbackRate={p.speed || 1} /></Sequence>}
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ background: "#f2f0ea" }}>
      {visual && f < cut + 10 && <Canvas v={visual} f={f} fps={FPS} />}
      <AbsoluteFill style={{ opacity: fade }}>
        <Sequence from={cut} layout="none">
          {p.look?.plate ? <Img src={staticFile(p.look.plate)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <GridPaper />}
          {p.kind === "slide" && !p.look?.canvas && p.look?.layout === "on_picture" && p.image &&
            <Img src={staticFile(p.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
          {p.kind === "hook" ? <HookCard p={p} /> : p.kind === "picture" ? <FullPicture p={p} />
            : p.look?.canvas ? <CanvasSlide p={p} offset={cut} />
            : p.look?.layout === "picture_right" || p.look?.layout === "on_picture" ? <LookSlide p={p} offset={cut} /> : <SlideCard p={p} offset={cut} />}
          {p.kind === "slide" && (p.pointer ?? []).length > 0 && <SlidePen pts={p.pointer!} f={f - cut} />}
          <Footer p={p} />
          {/* no sound effects and no music: only the voices */}
        </Sequence>
      </AbsoluteFill>
      {(p.interludes ?? []).map((it, i) => {
        const o = interpolate(f, [it.from, it.from + 10, it.to, it.to + 10], [0, 1, 1, 0], clamp);
        if (it.zoom) return <ZoomBreak key={i} it={it} p={p} f={f} />;
        return o > 0 ? <Break key={i} it={it} p={p} o={o} /> : null;
      })}
      {p.audio && <Sequence from={lead}><Audio src={staticFile(p.audio)} playbackRate={p.speed || 1} /></Sequence>}
    </AbsoluteFill>
  );
}

/* ---------- pieces ---------- */
const land = (f: number, at: number, len = 10) => interpolate(f, [at, at + len], [0, 1], clamp);
const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const px = (n: number) => Math.round(n); // whole pixels only: no sub-pixel text

/** The paper card, centred on the page: torn top and bottom, a flat shade behind it instead of a blurred shadow. */
function Card({ children, f, width, lift = 0, left, top, tape }: { children: React.ReactNode; f: number; width: number; lift?: number; left?: number; top?: number | null; tape?: string | null }) {
  const s = ease(land(f, 0, 12));
  const y = px((1 - s) * 60 - lift);
  const placed = top !== undefined && top !== null;
  return (
    <AbsoluteFill style={{ justifyContent: placed ? "flex-start" : "center", alignItems: left === undefined ? "center" : "flex-start",
      paddingLeft: left ?? 0, paddingTop: placed ? top : 0, paddingBottom: placed ? 0 : 40 }}>
      <div style={{ position: "relative", width, transform: `translateY(${y}px)`, opacity: s }}>
        <div style={{ position: "absolute", inset: 0, transform: "translate(14px, 16px)", background: C.shade, clipPath: tornClip(17, 1.0) }} />
        <div style={{ position: "relative", background: C.card, clipPath: tornClip(17, 1.0), padding: "46px 64px 50px" }}>{children}</div>
        {tape && [{ side: "left", rot: -6 }, { side: "right", rot: 5 }].map((t) => (
          <div key={t.side} style={{ position: "absolute", top: -86, [t.side]: 46, width: 70, height: 116, background: tape, opacity: 0.86,
            transform: `rotate(${t.rot}deg)`, borderRadius: 6,
            backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0 6px, transparent 6px 14px)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

/** A backdrop slide's card: frosted glass over the photo (blurred, tinted with the photo's own colour, a thin light
 *  rim), landing the way the paper card does. */
function GlassCard({ children, f, width, left, top, tint }: { children: React.ReactNode; f: number; width: number; left?: number; top?: number | null; tint: string }) {
  const s = ease(land(f, 0, 12));
  const placed = top !== undefined && top !== null;
  return (
    <AbsoluteFill style={{ justifyContent: placed ? "flex-start" : "center", alignItems: left === undefined ? "center" : "flex-start",
      paddingLeft: left ?? 0, paddingTop: placed ? top : 0, paddingBottom: placed ? 0 : 40 }}>
      <div style={{ position: "relative", width, transform: `translateY(${px((1 - s) * 60)}px)`, opacity: s, borderRadius: 36,
        background: `linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04)), ${tint}`,
        backdropFilter: "blur(28px) saturate(160%)", WebkitBackdropFilter: "blur(28px) saturate(160%)",
        border: "1.5px solid rgba(255,255,255,0.32)", boxShadow: "0 30px 80px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.45)",
        padding: "46px 64px 50px" }}>{children}</div>
    </AbsoluteFill>
  );
}

/** A heading on a yellow highlighter stroke that sweeps across once (the stroke moves; the text never does). */
function Swept({ text, f, at, size, light }: { text: string; f: number; at: number; size: number; light?: boolean }) {
  const w = interpolate(f, [at, at + 16], [0, 100], clamp);
  return (
    <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: size, lineHeight: 1.18,
      color: light && w < 100 ? "#ffffff" : C.ink,
      backgroundImage: `linear-gradient(transparent 10%, ${C.yellow} 10%, ${C.yellow} 92%, transparent 92%)`, backgroundRepeat: "no-repeat",
      backgroundSize: `${w}% 100%`, WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone", padding: "0 8px" }}>{text}</span>
  );
}

/** Split a bullet into plain text and highlighted terms (yellow = key term, green = element / formula / example). */
const wc = (ch?: string) => !!ch && /[\p{L}\p{N}\p{M}]/u.test(ch);

export function segments(text: string, key: string[] = [], green: string[] = []) {
  const marks: { s: number; e: number; c: "y" | "g" }[] = [];
  const terms = [...key.map((t) => ({ t, c: "y" as const })), ...green.map((t) => ({ t, c: "g" as const }))].sort((a, b) => b.t.length - a.t.length);
  const low = text.toLowerCase();
  for (const { t, c } of terms) {
    if (!t.trim()) continue;
    let from = 0;
    while (true) {
      const s = low.indexOf(t.toLowerCase(), from);
      if (s < 0) break;
      const e = s + t.length;
      // whole words only: a short term like "T" must never light up inside "Triangle" or "Bottom"
      const inWord = (wc(t[0]) && wc(low[s - 1])) || (wc(t[t.length - 1]) && wc(low[e]));
      if (!inWord && !marks.some((m) => s < m.e && e > m.s)) marks.push({ s, e, c });
      from = e;
    }
  }
  marks.sort((a, b) => a.s - b.s);
  const out: { t: string; c: "y" | "g" | null }[] = [];
  let at = 0;
  for (const m of marks) {
    if (m.s > at) out.push({ t: text.slice(at, m.s), c: null });
    out.push({ t: text.slice(m.s, m.e), c: m.c });
    at = m.e;
  }
  if (at < text.length) out.push({ t: text.slice(at), c: null });
  return out;
}

const BRUSH = { green: "#1d4d2b", key: "#1f7a3a", blue: "#1d4fc4", ink: "#151515" };

function BulletText({ b, size, light, brush }: { b: NBullet; size: number; light?: boolean; brush?: boolean }) {
  if (brush) {  // the Environment look: key terms in bold green, examples and numbers in bold blue, no highlighter
    return (
      <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: size, lineHeight: 1.36, color: BRUSH.ink }}>
        {segments(b.text, b.key, b.green).map((x, i) =>
          x.c ? <span key={i} style={{ color: x.c === "y" ? BRUSH.key : BRUSH.blue, fontWeight: 800 }}>{x.t}</span> : <span key={i}>{x.t}</span>)}
      </span>
    );
  }
  return (
    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: size, lineHeight: 1.42, color: light ? "#ffffff" : C.ink,
      textShadow: light ? "0 1px 10px rgba(0,0,0,0.35)" : undefined }}>
      {segments(b.text, b.key, b.green).map((s, i) =>
        s.c ? <span key={i} style={{ background: s.c === "y" ? C.yellow : C.green, padding: "1px 7px", margin: "0 1px", fontWeight: 800,
                                      color: C.ink, textShadow: "none",
                                      WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}>{s.t}</span>
            : <span key={i}>{s.t}</span>)}
    </span>
  );
}

/** When bullet k appears (frames from the slide's own start): the moment its line starts, after the card has landed. */
export const bulletFrame = (p: NotesProps, k: number, offset = 0) => {
  const line = p.bullet_at?.[k] ?? 0;
  return Math.max(8, lineFrame(p, line) - offset) + (k === 0 ? 8 : 0);
};

/** The slide's heading and bullets: the same in every look (the classic card and every slide skill). */
function SlideText({ p, offset = 0, pic, light }: { p: NotesProps; offset?: number; pic: boolean; light?: boolean }) {
  const f = useCurrentFrame();
  const bullets = p.bullets ?? [];
  const chars = bullets.reduce((n, b) => n + b.text.length, 0);
  if (p.look?.text_style === "brush") return <BrushText p={p} offset={offset} f={f} />;
  // a picture takes the right side: the text column is narrower, so the type steps down a size
  const size = (chars > 340 ? 31 : chars > 260 ? 34 : chars > 190 ? 37 : 40) - (pic ? 4 : 0) - (p.people?.length ? 3 : 0);
  const tsize = ((p.slide_title ?? "").length > 48 ? 50 : 58) - (pic ? 6 : 0);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: SANS, fontWeight: 800, fontSize: 22, letterSpacing: 3, color: light ? "#ffffff" : C.ink }}>
        <span>{(p.section ?? "").toUpperCase()}</span>
        <span style={{ color: light ? "rgba(255,255,255,0.72)" : C.dim, fontWeight: 700 }}>{p.pages ? `PAGE ${p.pages}  ·  ` : ""}{String(p.index).padStart(2, "0")} / {String(p.total - 1).padStart(2, "0")}</span>
      </div>
      <div style={{ marginTop: 18 }}><Swept text={p.slide_title ?? ""} f={f} at={8} size={tsize} light={light} /></div>
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 22 }}>
        {bullets.map((b, k) => {
          const at = bulletFrame(p, k, offset);
          const o = ease(land(f, at, 9));
          return (
            <div key={k} style={{ display: "flex", gap: 22, alignItems: "flex-start", opacity: o, transform: `translateY(${px((1 - o) * 18)}px)` }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, background: C.yellow, flex: "none", marginTop: px(size * 0.5), boxShadow: "0 0 0 3px rgba(0,0,0,0.12)" }} />
              <BulletText b={b} size={size} light={light} />
            </div>
          );
        })}
      </div>
      <PeopleCards p={p} offset={offset} f={f} h={chars > 260 ? 120 : 150} />
    </>
  );
}

/** The real people a slide's bullets name: each photo in a small Vox-style card (white border, tape, a slight tilt)
 *  with the name written just under it and who they were below that, arriving with the bullet that names them. */
function PeopleCards({ p, offset, f, h, brush }: { p: NotesProps; offset: number; f: number; h: number; brush?: boolean }) {
  const people = p.people ?? [];
  if (!people.length) return null;
  const w = Math.round(h * 0.8);
  return (
    <div style={{ marginTop: 34, display: "flex", gap: 34, alignItems: "flex-start" }}>
      {people.map((pe, k) => {
        const o = ease(land(f, bulletFrame(p, pe.bullet, offset), 9));
        return (
          <div key={k} style={{ width: Math.max(w + 40, people.length > 2 ? 200 : 260), display: "flex", flexDirection: "column", alignItems: "center", opacity: o,
            transform: `translateY(${px((1 - o) * 24)}px)` }}>
            <div style={{ position: "relative", width: w, height: h, transform: `rotate(${[-3, 2.5, -2][k % 3]}deg)` }}>
              <div style={{ position: "absolute", inset: 0, background: "#fff", borderRadius: 6, padding: 9,
                boxShadow: "0 14px 30px rgba(0,0,0,0.25), 0 3px 8px rgba(0,0,0,0.12)" }}>
                <Img src={staticFile(pe.image)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%", borderRadius: 3 }} />
              </div>
              <div style={{ position: "absolute", left: "50%", top: -13, width: 80, height: 28, transform: "translateX(-50%) rotate(4deg)",
                background: "rgba(236,222,170,0.85)", backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 6px, transparent 6px 14px)" }} />
            </div>
            <div style={{ marginTop: 14, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: people.length > 2 ? 24 : 28,
              lineHeight: 1.12, color: brush ? BRUSH.green : C.ink }}>{pe.name}</div>
            {pe.role && <div style={{ marginTop: 4, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: people.length > 2 ? 18 : 20,
              color: brush ? BRUSH.blue : C.dim }}>{pe.role}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** The Environment look's text: the section in small green caps, the title in white on a dark-green brush stroke that
 *  sweeps in, the bullets with green dots, arriving as they are said (the same timing as every look). */
function BrushText({ p, offset, f }: { p: NotesProps; offset: number; f: number }) {
  const bullets = p.bullets ?? [];
  const chars = bullets.reduce((n, b) => n + b.text.length, 0);
  const size = (chars > 300 ? 34 : chars > 220 ? 38 : chars > 150 ? 42 : 46) - (p.people?.length ? 4 : 0);
  const title = p.slide_title ?? "";
  const tsize = title.length > 34 ? 52 : title.length > 22 ? 62 : 74;
  const sweep = interpolate(f, [8, 26], [0, 100], clamp);
  return (
    <>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 22, letterSpacing: 4, color: BRUSH.key }}>{(p.section ?? "").toUpperCase()}</div>
      <div style={{ marginTop: 14, position: "relative", display: "inline-block", maxWidth: "100%" }}>
        <div style={{ position: "absolute", left: -26, right: -30, top: -6, bottom: -10, background: BRUSH.green,
          clipPath: `polygon(0% 14%, 3% 4%, 18% 9%, 40% 2%, 63% 8%, 84% 1%, 99% 9%, 100% 52%, 97% 93%, 77% 98%, 52% 91%, 30% 99%, 9% 92%, 1% 97%)`,
          WebkitMaskImage: `linear-gradient(90deg, #000 ${sweep}%, transparent ${Math.min(100, sweep + 6)}%)`,
          maskImage: `linear-gradient(90deg, #000 ${sweep}%, transparent ${Math.min(100, sweep + 6)}%)` }} />
        <div style={{ position: "relative", fontFamily: SANS, fontWeight: 800, fontSize: tsize, lineHeight: 1.12, color: "#ffffff",
          opacity: interpolate(f, [14, 24], [0, 1], clamp), padding: "4px 6px 8px" }}>{title}</div>
      </div>
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 26 }}>
        {bullets.map((b, k) => {
          const o = ease(land(f, bulletFrame(p, k, offset), 9));
          return (
            <div key={k} style={{ display: "flex", gap: 24, alignItems: "flex-start", opacity: o, transform: `translateY(${px((1 - o) * 18)}px)` }}>
              <span style={{ width: 26, height: 26, borderRadius: 13, background: BRUSH.green, flex: "none", marginTop: px(size * 0.4) }} />
              <BulletText b={b} size={size} brush />
            </div>
          );
        })}
      </div>
      <PeopleCards p={p} offset={offset} f={f} h={chars > 230 ? 160 : 190} brush />
    </>
  );
}

/** No paper card: the text lands on the background itself, a soft light wash behind the left half keeps it readable. */
function BareText({ children, f, width, left, top }: { children: React.ReactNode; f: number; width: number; left?: number; top?: number | null }) {
  const s = ease(land(f, 0, 12));
  const placed = top !== undefined && top !== null;
  return (
    <>
      <AbsoluteFill style={{ opacity: s, background: "linear-gradient(90deg, rgba(252,251,246,0.86) 0%, rgba(252,251,246,0.72) 42%, rgba(252,251,246,0) 60%)" }} />
      <AbsoluteFill style={{ justifyContent: placed ? "flex-start" : "center", alignItems: "flex-start", paddingLeft: left ?? 0,
        paddingTop: placed ? top : 0, paddingBottom: placed ? 0 : 40 }}>
        <div style={{ width, transform: `translateY(${px((1 - s) * 40)}px)`, opacity: s }}>{children}</div>
      </AbsoluteFill>
    </>
  );
}

function SlideCard({ p, offset = 0 }: { p: NotesProps; offset?: number }) {
  const f = useCurrentFrame();
  const pic = !!p.image || !!p.diagram?.objects?.length;
  const text = <SlideText p={p} offset={offset} pic={pic} />;
  return (
    <Card f={f} width={pic ? 1780 : 1700} tape={p.look?.tape}>
      {pic ? (
        <div style={{ display: "flex", gap: 52, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>{text}</div>
          {p.diagram?.objects?.length ? <DiagramPrint d={p.diagram} />
            : <Picture src={p.image!} credit={p.credit} sprite={p.sprite} motion={p.motion} offset={offset} />}
        </div>
      ) : text}
    </Card>
  );
}

/** A slide skill's layout: the same card (narrower, on the left) with the picture beside it, or over a picture that
 *  fills the screen behind it. */
function LookSlide({ p, offset = 0 }: { p: NotesProps; offset?: number }) {
  const f = useCurrentFrame();
  const L = p.look!;
  const text = <SlideText p={p} offset={offset} pic />;
  if (L.layout === "on_picture") return (
    <>
      <Card f={f} width={1060} left={100} tape={L.tape}>{text}</Card>
      {/* a real photo's licence asks for its credit: on a paper label, bottom right */}
      {p.credit && <div style={{ position: "absolute", right: 70, bottom: 26, background: C.card, padding: "4px 12px", fontFamily: SANS,
        fontWeight: 600, fontSize: 15, letterSpacing: 1, color: C.dim }}>{p.credit}</div>}
    </>
  );
  const o = ease(land(f, 4, 14));
  const frame = L.frame ?? "print";
  return (
    <>
      <Card f={f} width={1080} left={90} tape={L.tape}>{text}</Card>
      {p.image && (
        <div style={{ position: "absolute", right: 70, top: 150, width: 680, height: 740, opacity: o, transform: `translateY(${px((1 - o) * 30)}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", mixBlendMode: frame === "blend" ? "multiply" : undefined }}>
          {frame === "blend" ? <Img src={staticFile(p.image)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : frame === "blob" ? (
              <div style={{ width: 640, height: 640, overflow: "hidden", borderRadius: "47% 53% 44% 56% / 55% 44% 56% 45%", boxShadow: "14px 16px 0 rgba(0,0,0,0.10)" }}>
                <Img src={staticFile(p.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>)
            : <Picture src={p.image} credit={p.credit} offset={offset} />}
        </div>
      )}
    </>
  );
}

/** A picture break: framed = the skill's background with the picture in a shape (and a real photo's credit), the way
 *  the skill's own slides hold their pictures; full = the picture over the whole screen. */
/** The slide's picture zooms out of its place to fill the page (the background covering the slide as it grows), its
 *  labels point at what it shows, and it shrinks back into its place as the slide returns. Frames: grow [from, from +
 *  ZOOM), labels in [.., + LABEL_FADE), labels out [to - LABEL_FADE, to), shrink [to, to + ZOOM). */
function ZoomBreak({ it, p, f }: { it: NonNullable<NotesProps["interludes"]>[number]; p: NotesProps; f: number }) {
  const z = it.zoom!;
  const smooth = (x: number) => x * x * x * (x * (6 * x - 15) + 10);  // smootherstep: starts and lands gently (the creator: less harsh)
  const grow = smooth(interpolate(f, [it.from, it.from + ZOOM], [0, 1], clamp));
  const shrink = smooth(interpolate(f, [it.to, it.to + ZOOM], [0, 1], clamp));
  const t = grow * (1 - shrink);
  if (t <= 0) return null;
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const lend = it.motion?.start ?? it.to;  // a moving zoom: its labels go before the clip plays
  const lo = interpolate(f, [it.from + ZOOM, it.from + ZOOM + LABEL_FADE, lend - LABEL_FADE, lend], [0, 1, 1, 0], clamp);
  const style = it.style ?? "zoom";
  const pts = it.points ?? [];
  const guided = (style === "pen" || style === "spotlight" || style === "tour") && pts.length > 0;
  const at = guided ? penAt(pts, f, { x: z.tx + z.tw * 0.85, y: z.ty + z.th * 1.05 }) : null;
  // tour: the camera leans in on each part (1.8x), back out before the picture shrinks
  const cam = style === "tour" && at ? smooth(interpolate(f, [pts[0].at, pts[0].at + TRAVEL, it.to - LABEL_FADE * 2, it.to], [0, 1, 1, 0], clamp)) : 0;
  const S = 1 + 0.8 * cam;
  const camT = at ? { x: at.x + (960 - at.x) * cam - at.x * S, y: at.y + (540 - at.y) * cam - at.y * S } : { x: 0, y: 0 };
  // pinned: the sheet drops in from above, tilted, and lifts away the same way
  const drop = style === "pinned" ? 1 - t : 0;
  const box = style === "pinned"
    ? { left: z.tx, top: z.ty - drop * 1150, width: z.tw, height: z.th, transform: `rotate(${-2 - drop * 9}deg)` }
    : { left: lerp(z.sx, z.tx), top: lerp(z.sy, z.ty), width: lerp(z.sw, z.tw), height: lerp(z.sh, z.th) };
  const active = guided ? pts.reduce((a, q, i) => (f >= q.at ? i : a), -1) : -1;
  const labelOn = (i: number) => {  // a guided break shows one label at a time: the part the pen / light / camera is on
    if (!guided) return lo;
    const a = pts[i].at + TRAVEL;
    // out: as the pen leaves for the next part, or (the last) before the picture shrinks; kept strictly increasing
    const o1 = Math.max(a + LABEL_FADE + 1, i + 1 < pts.length ? pts[i + 1].at : lend - LABEL_FADE);
    return interpolate(f, [a, a + LABEL_FADE, o1, o1 + LABEL_FADE], [0, 1, 1, 0], clamp) * (lo > 0 ? 1 : 0);
  };
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: t, background: "#f2f0ea" }}>
        {p.look?.plate ? <Img src={staticFile(p.look.plate)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <GridPaper />}
      </AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: style === "tour" ? `translate(${camT.x}px, ${camT.y}px) scale(${S})` : undefined }}>
      {style === "pinned" && [{ l: z.tx + 40, r: -7 }, { l: z.tx + z.tw - 150, r: 6 }].map((q, i) => (
        <div key={i} style={{ position: "absolute", left: q.l, top: z.ty - 30 - drop * 1150, width: 110, height: 52, zIndex: 2, opacity: 0.85,
          background: p.look?.tape || "#e9d27a", transform: `rotate(${q.r - drop * 9}deg)`,
          backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 6px, transparent 6px 14px)" }} />
      ))}
      <div style={{ position: "absolute", ...box,
        borderRadius: style === "pinned" ? 4 : z.rect ? lerp(z.sr ?? 0, z.tr ?? 28) : z.radius, overflow: z.blend ? undefined : "hidden",
        mixBlendMode: z.blend ? "multiply" : undefined, background: style === "pinned" ? "#fff" : undefined, padding: style === "pinned" ? 16 : 0,
        boxShadow: z.blend ? undefined : style === "pinned" ? "18px 24px 30px rgba(0,0,0,0.22)" : "16px 18px 0 rgba(0,0,0,0.12)" }}>
        <Img src={staticFile(motionFrame(it, f) ?? it.image)} style={{ width: "100%", height: "100%", objectFit: z.blend ? "contain" : "cover" }} />
        {it.motion && f >= it.to && (  /* shrinking back: the clip's last frame fades into the still the slide shows */
          <Img src={staticFile(it.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: z.blend ? "contain" : "cover",
            opacity: interpolate(f, [it.to, it.to + ZOOM], [0, 1], clamp) }} />
        )}
      </div>
      {it.image2 && z.x2 !== undefined && lo > 0 && (
        <div style={{ position: "absolute", left: z.x2, top: z.y2, width: z.w2, height: z.h2, opacity: lo, transform: `scale(${0.85 + 0.15 * lo})`,
          borderRadius: z.radius, overflow: z.blend ? undefined : "hidden", mixBlendMode: z.blend ? "multiply" : undefined,
          boxShadow: z.blend ? undefined : "16px 18px 0 rgba(0,0,0,0.12)" }}>
          <Img src={staticFile(it.image2)} style={{ width: "100%", height: "100%", objectFit: z.blend ? "contain" : "cover" }} />
        </div>
      )}
      {style === "spotlight" && at && (  /* the rest of the page dims; a soft light sits on the part being explained */
        <div style={{ position: "absolute", inset: -400, opacity: lo,
          background: `radial-gradient(circle at ${at.x + 400}px ${at.y + 400}px, transparent 150px, rgba(10,10,20,0.62) 230px)` }} />
      )}
      </AbsoluteFill>
      {style === "tour" && active >= 0 && pts[active].text && (  /* the tour's caption: the part the camera is on */
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", opacity: labelOn(active) }}>
          <div style={{ background: C.card, padding: "12px 28px", boxShadow: "8px 10px 0 rgba(0,0,0,0.13)" }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 50, color: C.ink,
              backgroundImage: `linear-gradient(transparent 12%, ${C.yellow} 12%, ${C.yellow} 90%, transparent 90%)`, padding: "0 6px" }}>{pts[active].text}</span>
          </div>
        </div>
      )}
      {style === "pen" && at && lo > 0 && <Pen x={at.x} y={at.y} o={lo} moving={at.moving} />}
      {style !== "tour" && lo > 0 && (it.labels ?? []).length > 0 && (
        <div style={{ position: "absolute", inset: 0 }}>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            {(it.labels ?? []).map((l, i) => (
              <g key={i} opacity={guided ? labelOn(i) : lo}>
                <line x1={l.tx} y1={l.ty} x2={l.px} y2={l.py} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
                <circle cx={l.px} cy={l.py} r={11} fill={C.yellow} stroke={C.ink} strokeWidth={4} />
              </g>
            ))}
          </svg>
          {(it.labels ?? []).map((l, i) => (
            <div key={i} style={{ position: "absolute", width: "max-content", maxWidth: l.side === "left" || l.side === "right" ? 360 : 420, ...tagAt(l),
              opacity: guided ? labelOn(i) : lo }}>
              <div style={{ position: "absolute", inset: 0, transform: "translate(8px, 10px)", background: C.shade }} />
              <div style={{ position: "relative", background: C.card, padding: "10px 20px 12px", textAlign: l.side === "left" ? "right" : l.side === "right" ? "left" : "center" }}>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: l.text.length > 14 ? 38 : 46, lineHeight: 1.25, color: C.ink,
                  backgroundImage: `linear-gradient(transparent 12%, ${C.yellow} 12%, ${C.yellow} 90%, transparent 90%)`, padding: "0 6px",
                  WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}>{l.text}</span>
              </div>
            </div>
          ))}
          {it.credit && <div style={{ position: "absolute", right: 70, bottom: 26, background: C.card, padding: "4px 12px", fontFamily: SANS,
            fontWeight: 600, fontSize: 15, letterSpacing: 1, color: C.dim }}>{it.credit}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
}

/** Where the pen (light, camera) is at frame f: at point i from its `at` + TRAVEL, gliding there from the one before
 *  (from `start` before the first). moving: still on its way. */
function penAt(pts: PenPoint[], f: number, start: { x: number; y: number }) {
  const smooth = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
  let prev = start;
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i];
    if (f < q.at) return { x: prev.x, y: prev.y, moving: false };
    if (f < q.at + TRAVEL) {
      const k = smooth((f - q.at) / TRAVEL);
      return { x: prev.x + (q.x - prev.x) * k, y: prev.y + (q.y - prev.y) * k, moving: true };
    }
    prev = q;
  }
  return { x: prev.x, y: prev.y, moving: false };
}

/** The red pen, its tip on (x, y): like a note app's pointer, a glowing red dot under the tip. */
function Pen({ x, y, o, moving }: { x: number; y: number; o: number; moving: boolean }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44, borderRadius: 22,
        background: "radial-gradient(circle, rgba(255,40,40,0.55) 0%, rgba(255,40,40,0.18) 55%, transparent 72%)" }} />
      <svg width={190} height={190} viewBox="0 0 190 190" style={{ position: "absolute", left: -6, top: -184, transform: `rotate(${moving ? 4 : 0}deg)`,
        transformOrigin: "6px 184px", filter: "drop-shadow(6px 10px 6px rgba(0,0,0,0.25))" }}>
        <g transform="rotate(35 6 184)">
          <polygon points="6,184 0,160 12,160" fill="#e01e1e" />
          <rect x={0} y={60} width={12} height={100} rx={2} fill="#d42a2a" />
          <rect x={0} y={44} width={12} height={18} rx={2} fill="#262626" />
          <rect x={1} y={70} width={3} height={80} fill="rgba(255,255,255,0.35)" />
        </g>
      </svg>
    </div>
  );
}

/** A glance: no full screen; the pen moves over the slide's own picture to each part as it is explained. */
function SlidePen({ pts, f }: { pts: PenPoint[]; f: number }) {
  const o = interpolate(f, [pts[0].at - 10, pts[0].at], [0, 1], clamp);
  if (o <= 0) return null;
  const at = penAt(pts, f, { x: pts[0].x + 160, y: pts[0].y + 200 });
  return <Pen x={at.x} y={at.y} o={o} moving={at.moving} />;
}

/** A moving zoom's frame at page frame f: the clip plays once it is at full size (its own fps), holding its last frame. */
function motionFrame(it: NonNullable<NotesProps["interludes"]>[number], f: number): string | null {
  const m = it.motion;
  const start = m?.start ?? it.from + ZOOM;
  if (!m || f < start) return null;
  const k = Math.min(m.n - 1, Math.floor(((f - start) * m.fps) / FPS));
  return `${m.dir}/${String(k + 1).padStart(4, "0")}.jpg`;
}

/** Where a zoom label's tag sits: its edge on (tx, ty), on the label's side of the picture. */
function tagAt(l: BreakLabel): React.CSSProperties {
  if (l.side === "top") return { left: l.tx, bottom: 1080 - l.ty, transform: "translateX(-50%)" };
  if (l.side === "bottom") return { left: l.tx, top: l.ty, transform: "translateX(-50%)" };
  return { top: l.ty, transform: "translateY(-50%)", ...(l.side === "left" ? { right: 1920 - l.tx } : { left: l.tx }) };
}

function Break({ it, p, o }: { it: { image: string; credit?: string; caption?: string; labels?: BreakLabel[] }; p: NotesProps; o: number }) {
  if (p.look?.break_style === "full" || !p.look) return (
    <AbsoluteFill style={{ opacity: o, background: "#000" }}>
      <Img src={staticFile(it.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
  const shape = p.look.break_shape ?? "arch";
  const mode = p.look.break_text ?? "labels";
  const caption = mode === "caption" && it.caption ? it.caption : "";
  const labels = mode === "labels" ? it.labels ?? [] : [];
  const b = (caption ? BREAK_BOX_CAPTION : BREAK_BOX)[shape] ?? BREAK_BOX.arch;
  const size = caption.length > 70 ? 46 : caption.length > 44 ? 54 : 62;
  return (
    <AbsoluteFill style={{ opacity: o, background: "#f2f0ea" }}>
      {p.look.plate ? <Img src={staticFile(p.look.plate)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <GridPaper />}
      <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: SHAPES[shape], overflow: "hidden",
        boxShadow: "16px 18px 0 rgba(0,0,0,0.12)", transform: `scale(${0.96 + 0.04 * o})` }}>
        <Img src={staticFile(it.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      {labels.length > 0 && (
        /* labels: a line from each tag to the thing it names, a dot on that thing, the tag on paper */
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {labels.map((l, i) => (
            <g key={i}>
              <line x1={l.tx} y1={l.ty} x2={l.px} y2={l.py} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
              <circle cx={l.px} cy={l.py} r={11} fill={C.yellow} stroke={C.ink} strokeWidth={4} />
            </g>
          ))}
        </svg>
      )}
      {labels.map((l, i) => (
        <div key={i} style={{ position: "absolute", top: l.ty - 40, ...(l.side === "left" ? { right: 1920 - l.tx } : { left: l.tx }) }}>
          <div style={{ position: "absolute", inset: 0, transform: "translate(8px, 10px)", background: C.shade }} />
          <div style={{ position: "relative", background: C.card, padding: "10px 22px 12px", whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 46, lineHeight: 1.2, color: C.ink,
              backgroundImage: `linear-gradient(transparent 12%, ${C.yellow} 12%, ${C.yellow} 90%, transparent 90%)`, padding: "0 6px" }}>{l.text}</span>
          </div>
        </div>
      ))}
      {caption && (
        /* the caption card: the slide's paper, its section label, the caption on a still highlighter (no sweep: a
           break is a still, so the fast export captures it the same) */
        <div style={{ position: "absolute", left: 110, top: "50%", width: b.x - 200, transform: "translateY(-50%)" }}>
          <div style={{ position: "absolute", inset: 0, transform: "translate(12px, 14px)", background: C.shade, clipPath: tornClip(13, 1.0) }} />
          <div style={{ position: "relative", background: C.card, clipPath: tornClip(13, 1.0), padding: "38px 46px 44px" }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 20, letterSpacing: 3, color: C.ink }}>{(p.section ?? "").toUpperCase()}</div>
            <div style={{ marginTop: 16 }}>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: size, lineHeight: 1.22, color: C.ink,
                backgroundImage: `linear-gradient(transparent 10%, ${C.yellow} 10%, ${C.yellow} 92%, transparent 92%)`,
                WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone", padding: "0 8px" }}>{caption}</span>
            </div>
          </div>
        </div>
      )}
      {it.credit && <div style={{ position: "absolute", right: 70, bottom: 26, background: C.card, padding: "4px 12px", fontFamily: SANS,
        fontWeight: 600, fontSize: 15, letterSpacing: 1, color: C.dim }}>{it.credit}</div>}
    </AbsoluteFill>
  );
}

const SHAPES: Record<string, string> = {
  rect: "0", rounded: "28px", oval: "50%", circle: "50%", arch: "999px 999px 22px 22px", blob: "47% 53% 44% 56% / 55% 44% 56% 45%",
};

/** A free layout from a slide skill: picture slots behind the card, the card (the same card, placed and sized), slots in
 *  front of it. A real photo's credit sits on a paper label at the bottom right. */
function CanvasSlide({ p, offset = 0 }: { p: NotesProps; offset?: number }) {
  const f = useCurrentFrame();
  const cv = p.look!.canvas!;
  const slot = (s: Slot, i: number) => <SlotView key={i} s={s} p={p} f={f} offset={offset} />;
  return (
    <>
      {cv.slots.filter((s) => s.layer !== "front").map(slot)}
      {p.look?.bare ? (
        <BareText f={f} width={cv.card.w} left={cv.card.x} top={cv.card.y}>
          <SlideText p={p} offset={offset} pic={cv.card.w < 1500} />
        </BareText>
      ) : p.look?.glass ? (
        <GlassCard f={f} width={cv.card.w} left={cv.card.x} top={cv.card.y} tint={p.look.glass}>
          <SlideText p={p} offset={offset} pic={cv.card.w < 1500} light />
        </GlassCard>
      ) : (
        <Card f={f} width={cv.card.w} left={cv.card.x} top={cv.card.y} tape={p.look?.tape}>
          <SlideText p={p} offset={offset} pic={cv.card.w < 1500} />
        </Card>
      )}
      {cv.slots.filter((s) => s.layer === "front").map(slot)}
      {p.credit && cv.slots.some((s) => s.fill === "scene") && (
        <div style={{ position: "absolute", right: 70, bottom: 26, background: C.card, padding: "4px 12px", fontFamily: SANS,
          fontWeight: 600, fontSize: 15, letterSpacing: 1, color: C.dim }}>{p.credit}</div>
      )}
    </>
  );
}

/** One picture slot: its picture shaped and framed, landing with the card. A "bullet" slot shows the picture of the
 *  latest bullet to arrive, each fading in over the one before as its bullet arrives. */
function SlotView({ s, p, f, offset }: { s: Slot; p: NotesProps; f: number; offset: number }) {
  const o = ease(land(f, 4, 14));
  const w = s.shape === "circle" ? Math.min(s.w, s.h) : s.w;
  const h = s.shape === "circle" ? Math.min(s.w, s.h) : s.h;
  const frame = s.frame ?? "none";
  const layers: { src: string; o: number }[] = [];
  if (s.fill === "bullet") {
    (p.bullet_images ?? []).forEach((src, k) => { if (src) layers.push({ src, o: land(f, bulletFrame(p, k, offset), 10) }); });
  } else {
    const src = s.fill === "scene" ? p.image : s.fill === "scene2" ? p.image2 : s.src;
    if (src) layers.push({ src, o: 1 });
  }
  if (!layers.length) return null;
  const pic = (l: { src: string; o: number }, i: number) => frame === "blend"
    ? <Img key={i} src={staticFile(l.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: l.o }} />
    : <Img key={i} src={staticFile(l.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: l.o }} />;
  return (
    <div style={{ position: "absolute", left: s.x + (s.w - w) / 2, top: s.y + (s.h - h) / 2, width: w, height: h, opacity: o,
      transform: `translateY(${px((1 - o) * 30)}px) rotate(${s.rotate ?? 0}deg)`, mixBlendMode: frame === "blend" ? "multiply" : undefined }}>
      {frame === "vox" ? (  /* a Vox-style collage card: a photo with a thick white border, a soft shadow, tape on top */
        <>
          <div style={{ position: "absolute", inset: 0, background: "#fff", borderRadius: 10, padding: 18,
            boxShadow: "0 22px 46px rgba(0,0,0,0.26), 0 4px 10px rgba(0,0,0,0.12)" }}>
            <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 4 }}>{layers.map(pic)}</div>
          </div>
          <div style={{ position: "absolute", left: "50%", top: -22, width: 150, height: 46, transform: "translateX(-50%) rotate(-3deg)",
            background: "rgba(236,222,170,0.82)", boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 6px, transparent 6px 14px)" }} />
        </>
      ) : frame === "blend" ? layers.map(pic) : (
        <div style={{ position: "absolute", inset: 0, borderRadius: SHAPES[s.shape ?? "rect"], overflow: "hidden",
          background: frame === "print" ? "#fff" : undefined, padding: frame === "print" ? 14 : 0,
          boxShadow: frame === "print" || frame === "shadow" ? "14px 16px 0 rgba(0,0,0,0.12)" : undefined }}>
          <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: frame === "print" ? 0 : SHAPES[s.shape ?? "rect"] }}>
            {layers.map(pic)}
          </div>
        </div>
      )}
    </div>
  );
}

/** The slide's picture as a plain print: white border, a flat shade, the credit underneath. A moving picture is the
 *  same print with its subject travelling on it, looping, the way the fact says (constant speed, speeding up, a circle). */
function Picture({ src, credit, sprite, motion, offset = 0 }: { src: string; credit?: string; sprite?: string | null; motion?: NotesProps["motion"]; offset?: number }) {
  return (
    <div style={{ width: 600, flex: "none" }}>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, transform: "translate(10px, 12px)", background: C.shade }} />
        <div style={{ position: "relative", background: "#fff", padding: 14 }}>
          {sprite && motion ? (
            <div style={{ position: "relative", overflow: "hidden" }}>
              <Img src={staticFile(src)} style={{ display: "block", width: "100%", height: "auto" }} />
              <Mover sprite={sprite} m={motion} offset={offset} />
            </div>
          ) : <Img src={staticFile(src)} style={{ display: "block", width: "100%", height: 460, objectFit: "contain", background: "#fff" }} />}
        </div>
      </div>
      {credit && <div style={{ marginTop: 14, fontFamily: SANS, fontWeight: 600, fontSize: 15, letterSpacing: 1, color: C.dim }}>{credit}</div>}
    </div>
  );
}

/** The Diagram card: the still diagram as a print, the same frame as a photo. */
function DiagramPrint({ d }: { d: Diagram }) {
  return (
    <div style={{ width: 640, flex: "none", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, transform: "translate(10px, 12px)", background: C.shade }} />
      <div style={{ position: "relative", background: "#fff", padding: 20 }}><DiagramSvg d={d} font={SANS} width={600} /></div>
    </div>
  );
}

/** The moving subject on its background (coordinates as fractions of the picture). */
function Mover({ sprite, m, offset }: { sprite: string; m: NonNullable<NotesProps["motion"]>; offset: number }) {
  const f = useCurrentFrame() + offset;
  const loop = 4 * FPS; // one pass every 4 seconds
  const t = (f % loop) / loop;
  const H = `${(m.h || 0.25) * 100}%`;
  let left = 0.5, bottom = 1 - (m.y || 0.8), rot = 0, flip = 1;
  if (m.kind === "across") left = -0.25 + 1.5 * t;                       // equal distance in equal time
  else if (m.kind === "speeding_up") left = -0.25 + 1.5 * t * t;          // more distance every second
  else if (m.kind === "back_and_forth") { const k = (Math.sin(t * 2 * Math.PI - Math.PI / 2) + 1) / 2; left = 0.12 + 0.76 * k; flip = Math.cos(t * 2 * Math.PI - Math.PI / 2) >= 0 ? 1 : -1; }
  else if (m.kind === "circle") { const a = t * 2 * Math.PI; left = (m.cx ?? 0.5) + (m.r ?? 0.3) * Math.cos(a); bottom = 1 - ((m.cy ?? 0.5) + (m.r ?? 0.3) * 0.55 * Math.sin(a)) - (m.h || 0.25) / 2; }
  else if (m.kind === "spin") { left = m.cx ?? 0.5; bottom = 1 - (m.cy ?? 0.5) - (m.h || 0.25) / 2; rot = t * 360; }
  else if (m.kind === "bounce") { const k = Math.abs(Math.sin(t * Math.PI * 2)); bottom = 1 - (m.y || 0.8) + 0.25 * k; }
  return (
    <Img src={staticFile(sprite)} style={{ position: "absolute", height: H, width: "auto", left: `${left * 100}%`, bottom: `${bottom * 100}%`,
      transform: `translateX(-50%) rotate(${rot}deg) scaleX(${flip})`, transformOrigin: "50% 50%" }} />
  );
}

/** A picture scene: the generated image (its words drawn into it by Qwen-Image) fills the frame and slowly pushes in. */
function FullPicture({ p }: { p: NotesProps }) {
  const f = useCurrentFrame();
  const total = notesFrames(p);
  const o = land(f, 0, 10);
  // the scene's picture, then each montage picture fading in over the one before (the fast export pushes each in slowly)
  const shots = [{ image: p.image ?? "", at: 0, caption: "" }, ...(p.montage ?? [])].filter((x) => x.image);
  return (
    <AbsoluteFill style={{ background: "#000", opacity: o, overflow: "hidden" }}>
      {shots.map((x, k) => {
        const end = k + 1 < shots.length ? shots[k + 1].at + 10 : total;
        if (f < x.at || f > end) return null;
        const zoom = interpolate(f, [x.at, end], [1, 1.06], clamp);
        const shown = k === 0 ? 1 : land(f, x.at, 10);
        const cap = x.caption ? land(f, x.at + 2, 8) : 0;
        return (
          <AbsoluteFill key={k} style={{ opacity: shown }}>
            <Img src={staticFile(x.image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
            {x.caption && (
              <div style={{ position: "absolute", left: 110, bottom: 120, opacity: cap, transform: `translateY(${px((1 - cap) * 16)}px)` }}>
                <span style={{ display: "inline-block", background: BRUSH.green, color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 54,
                  padding: "10px 34px 14px", boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  clipPath: "polygon(0% 12%, 4% 3%, 30% 8%, 58% 1%, 86% 7%, 100% 4%, 99% 55%, 100% 95%, 70% 98%, 42% 92%, 12% 99%, 1% 94%)" }}>{x.caption}</span>
              </div>
            )}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

function HookCard({ p }: { p: NotesProps }) {
  const f = useCurrentFrame();
  const h = p.headline ?? "";
  const size = h.length > 110 ? 70 : h.length > 70 ? 84 : 96;
  const tag = land(f, 30, 10);
  return (
    <>
      <Card f={f} width={1560} lift={60}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 26, letterSpacing: 3, color: C.ink }}>{(p.kicker ?? "").toUpperCase()}</div>
        <div style={{ marginTop: 18 }}><Swept text={h} f={f} at={12} size={size} /></div>
      </Card>
      <div style={{ position: "absolute", left: 140, bottom: 120, opacity: tag, transform: `translateY(${px((1 - tag) * 20)}px)` }}>
        <span style={{ background: C.ink, color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 30, padding: "12px 24px", letterSpacing: 1 }}>{p.title}</span>
      </div>
    </>
  );
}

function Footer({ p }: { p: NotesProps }) {
  const done = p.total > 1 ? p.index / (p.total - 1) : 1;
  return (
    <>
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 8, width: `${done * 100}%`, background: C.yellow }} />
      {p.kind === "slide" && <div style={{ position: "absolute", left: 120, bottom: 26, fontFamily: SANS, fontWeight: 700, fontSize: 20, color: C.dim, letterSpacing: 1,
        ...(p.look?.layout === "on_picture" || p.look?.plate || p.look?.canvas ? { background: C.card, padding: "4px 12px" } : {}) }}>{p.title}</div>}
    </>
  );
}
