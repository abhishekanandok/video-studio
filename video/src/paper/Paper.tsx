import { loadFont as loadCourier } from "@remotion/google-fonts/CourierPrime";
import { loadFont as loadDisplay } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadNews } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame } from "remotion";

/* The editorial "paper" film: one printed page per scene, a painted host who talks, gestures and points, and evidence
   panels drawn from real numbers. Everything on screen comes from the props; nothing here invents data. */

const { fontFamily: TYPEW } = loadCourier();
const { fontFamily: DISPLAY } = loadDisplay();
const { fontFamily: NEWS } = loadNews();
const { fontFamily: COND } = loadOswald();

export const FPS = 30;
const LEAD = 0.3;
const TAIL = 1.2;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const P = { paper: "#cdc5ba", paper2: "#d9d2c7", ink: "#1b1a18", soft: "#4a4640", accent: "#e8643a", hi: "rgba(242,205,70,0.78)" };

export type Pose = "talk" | "explain" | "point_right" | "point_left" | "count" | "think" | "shrug";
type PoseMeta = { w: number; h: number; mouth: number[] | null; blink: number[] | null };
export type Line = { speech: string; seconds: number; pause?: number; audio: string | null; pose?: Pose };
export type Panel =
  | { kind: "image"; src: string; caption?: string }
  | { kind: "chart"; title: string; bars: { label: string; value: number; display: string }[]; source: string }
  | { kind: "number"; value: string; label: string; source: string }
  | { kind: "document"; outlet: string; date: string; headline: string; quote: string; highlight: string }
  | { kind: "timeline"; title: string; events: { when: string; label: string }[] };
export type Beat =
  | { layout: "host"; display?: string }
  | { layout: "host_panel"; side: "left" | "right"; panel: Panel }
  | { layout: "panel"; panel: Panel }
  | { layout: "image"; src: string; focus?: "left" | "center" | "right" | "zoom"; caption?: string }
  | { layout: "title"; kicker: string; title: string };
/** Collage pieces that pop onto the page while the line is spoken (at = 0..1 through the line). */
export type Callout = { kind: "tag" | "stamp" | "sticky" | "arrow" | "clip"; text: string; at: number };
export type PScene = { beat: Beat; lines: Line[]; callouts?: Callout[]; sfx?: string };
export type PaperProps = {
  channel: string; issue: string; place: string; date: string; speed?: number; backdrops?: string[];
  host: { dir: string; poses: Record<string, PoseMeta> }; scenes: PScene[];
};

export function layoutPaper(p: PaperProps) {
  const speed = p.speed ?? 1;
  let at = 0;
  const scenes = p.scenes.map((s) => {
    let t = s.beat.layout === "title" ? 0 : 0.15;
    const lines = s.lines.map((l) => {
      const from = Math.round(t * FPS);
      const secs = l.seconds / speed;
      t += secs + Math.max(0.1, Math.min(0.9, l.pause ?? 0.2));
      return { ...l, from, frames: Math.max(1, Math.round(secs * FPS)) };
    });
    const frames = Math.max(Math.round(t * FPS), s.beat.layout === "title" ? Math.round(2.2 * FPS) : 1);
    const r = { ...s, start: at, frames, lines };
    at += frames;
    return r;
  });
  return { scenes, total: at + Math.round(TAIL * FPS) };
}
type Laid = ReturnType<typeof layoutPaper>["scenes"][number];

export const Paper = (p: PaperProps) => {
  const { scenes, total } = layoutPaper(p);
  const speed = p.speed ?? 1;
  return (
    <AbsoluteFill style={{ background: P.paper }}>
      <Audio src={staticFile("sfx/bed.wav")} volume={0.06} loop />
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.start} durationInFrames={s.frames + (i === scenes.length - 1 ? Math.round(TAIL * FPS) : 0)}>
          <Backdrop src={p.backdrops?.length ? p.backdrops[Math.floor(i / 3) % p.backdrops.length] : undefined} seed={i} />
          <Page scene={s} index={i} p={p} />
          {s.lines.map((l, j) => l.audio && (
            <Sequence key={j} from={l.from} durationInFrames={l.frames}><Audio src={staticFile(l.audio)} playbackRate={speed} /></Sequence>
          ))}
          {i > 0 && <Audio src={staticFile(i % 3 ? "sfx/paper.wav" : "sfx/whoosh.wav")} volume={0.3} />}
          {(s.callouts ?? []).map((c, k) => {
            const at = Math.round((s.lines[0]?.from ?? 0) + c.at * (s.lines[0]?.frames ?? 60));
            return <Sequence key={`c${k}`} from={at}><Audio src={staticFile(c.kind === "stamp" ? "sfx/thud.wav" : "sfx/paper.wav")} volume={0.22} /></Sequence>;
          })}
        </Sequence>
      ))}
      <Grain />
      <Masthead p={p} total={total} />
    </AbsoluteFill>
  );
};

/* ---------------- page furniture ---------------- */
function Grain() {
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.55 }}>
      <svg width="100%" height="100%">
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#g)" opacity="0.28" />
      </svg>
    </AbsoluteFill>
  );
}

/** A faint collage of paper scraps behind every page, drifting slowly: the page is never an empty sheet. */
function Backdrop({ src, seed }: { src?: string; seed: number }) {
  const f = useCurrentFrame();
  if (!src) return null;
  const dx = (rnd(seed) - 0.5) * 60, dy = (rnd(seed + 9) - 0.5) * 40;
  return (
    <AbsoluteFill style={{ opacity: 0.32, mixBlendMode: "multiply", overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.6) contrast(0.9)",
        transform: `scale(${1.12 + f * 0.0004}) translate(${dx + f * 0.05}px, ${dy - f * 0.03}px)` }} />
    </AbsoluteFill>
  );
}

function Masthead({ p }: { p: PaperProps; total: number }) {
  return (
    <div style={{ position: "absolute", left: 56, right: 56, top: 0, height: 92, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${P.ink}`, background: P.paper }}>
      <span style={{ fontFamily: NEWS, fontSize: 26, color: P.ink }}>{p.place} · {p.date}</span>
      <span style={{ fontFamily: DISPLAY, fontSize: 44, color: P.ink, letterSpacing: 1 }}>{p.channel}</span>
      <span style={{ fontFamily: NEWS, fontSize: 26, color: P.ink }}>{p.issue}</span>
    </div>
  );
}

const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

/* ---------------- one page (one spoken line) ---------------- */
function Page({ scene, index, p }: { scene: Laid; index: number; p: PaperProps }) {
  const f = useCurrentFrame();
  const inn = spring({ frame: f, fps: FPS, config: { damping: 20, stiffness: 140 } });
  const dir = index % 3; // vary how pages arrive: from the right, from below, a quick cut-in
  const enter = index === 0 ? "none" : dir === 0 ? `translateX(${(1 - inn) * 90}px)` : dir === 1 ? `translateY(${(1 - inn) * 70}px)` : `scale(${1.04 - 0.04 * inn})`;
  const push = 1 + Math.min(1, f / Math.max(1, scene.frames)) * 0.022; // a slow push on every page: always moving
  const line = scene.lines[0];
  const b = scene.beat;
  const body: React.CSSProperties = { position: "absolute", left: 56, right: 56, top: 118, bottom: 48, transform: `${enter} scale(${push})`, opacity: Math.min(1, inn * 1.6) };
  if (b.layout === "title") return <div style={body}><TitleCard kicker={b.kicker} title={b.title} frame={f} /></div>;
  const pose = (line?.pose ?? "talk") as Pose;
  let content: React.ReactNode;
  if (b.layout === "host") {
    content = (
      <>
        {b.display && <Knockout text={b.display} frame={f} />}
        <Host p={p} pose={pose} frame={f} box={{ left: "center", height: b.display ? 640 : 860, bottom: -48 }} />
      </>
    );
  } else if (b.layout === "host_panel") {
    const right = b.side === "right";
    // always point TOWARDS the board, whatever pose the script asked for (a pointing pose, or plain talking)
    const point: Pose = pose === "talk" || pose === "explain" || pose.startsWith("point") ? (right ? "point_right" : "point_left") : pose;
    content = (
      <>
        <div style={{ position: "absolute", top: 0, bottom: 0, [right ? "left" : "right"]: 740, width: 2, background: P.ink, opacity: 0.8 }} />
        <Host p={p} pose={f < 10 ? pose : point} frame={f} box={{ [right ? "left" : "right"]: 0, height: 780, bottom: -48 }} />
        <div style={{ position: "absolute", top: 10, bottom: 30, [right ? "left" : "right"]: 760, [right ? "right" : "left"]: 0, background: P.paper2,
          boxShadow: "0 24px 50px rgba(0,0,0,0.22)", border: `2px solid ${P.ink}`, padding: b.panel.kind === "image" ? 0 : 36 }}>
          <div style={{ position: "relative", width: "100%", height: "100%" }}><PanelView panel={b.panel} frame={f - 6} /></div>
        </div>
      </>
    );
  } else if (b.layout === "image") {
    content = <FullPainting src={b.src} focus={b.focus ?? "center"} caption={b.caption} frame={f} frames={scene.frames} />;
  } else {
    content = <PanelView panel={b.panel} frame={f} full />;
  }
  return (
    <div style={body}>
      {content}
      <Callouts items={scene.callouts ?? []} layout={b.layout} side={b.layout === "host_panel" ? b.side : "right"} start={line?.from ?? 0} span={line?.frames ?? 90} frame={f} seed={index * 7} />
    </div>
  );
}

function FullPainting({ src, focus, caption, frame, frames }: { src: string; focus: string; caption?: string; frame: number; frames: number }) {
  const k = Math.min(1, frame / Math.max(1, frames));
  const move = { left: `scale(1.14) translateX(${4 - 5 * k}%)`, right: `scale(1.14) translateX(${-4 + 5 * k}%)`, zoom: `scale(${1.05 + 0.16 * k})`, center: `scale(${1.1 - 0.06 * k})` }[focus] ?? "scale(1.08)";
  return (
    <div style={{ position: "absolute", inset: 0, border: `2px solid ${P.ink}`, overflow: "hidden", background: P.paper2 }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: move, filter: "saturate(0.9)" }} />
      {caption && <div style={{ position: "absolute", left: 0, bottom: 0, background: P.ink, color: P.paper, padding: "10px 22px", fontFamily: COND, fontWeight: 700, fontSize: 30, letterSpacing: 1 }}>{caption.toUpperCase()}</div>}
    </div>
  );
}

/* ---------------- collage callouts ---------------- */
// free spots (page coordinates, 1808 x 914) that don't cover the host or the heart of the panel
const SLOTS: Record<string, number[][]> = {
  host: [[70, 420], [1330, 400], [110, 690], [1290, 680]],
  host_panel_right: [[820, 20], [1470, 600], [40, 30], [1500, 30]],
  host_panel_left: [[40, 20], [620, 600], [1380, 30], [60, 620]],
  panel: [[30, 30], [1420, 40], [60, 650], [1380, 640]],
  image: [[40, 40], [1400, 50], [70, 640], [1360, 620]],
};

function Callouts({ items, layout, side, start, span, frame, seed }: { items: Callout[]; layout: string; side: string; start: number; span: number; frame: number; seed: number }) {
  const slots = SLOTS[layout === "host_panel" ? `host_panel_${side}` : layout] ?? SLOTS.panel;
  return (
    <>
      {items.slice(0, 4).map((c, i) => {
        const at = start + Math.round(c.at * span);
        const t = frame - at;
        if (t < 0) return null;
        const pop = spring({ frame: t, fps: FPS, config: { damping: 11, stiffness: 170 } });
        const [x, y] = slots[i % slots.length];
        const rot = (rnd(seed + i) - 0.5) * 9 + Math.sin((frame + i * 20) / 40) * 0.6;
        const style: React.CSSProperties = { position: "absolute", left: x, top: y, transform: `scale(${1.35 - 0.35 * pop}) rotate(${rot}deg)`, opacity: Math.min(1, pop * 1.5), transformOrigin: "50% 50%" };
        return <div key={i} style={style}><CalloutView c={c} seed={seed + i} t={t} /></div>;
      })}
    </>
  );
}

function torn(seed: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 20; i++) pts.push(`${i * 5}% ${(rnd(seed + i) * 6).toFixed(1)}%`);
  for (let i = 20; i >= 0; i--) pts.push(`${i * 5}% ${(100 - rnd(seed + 40 + i) * 6).toFixed(1)}%`);
  return `polygon(${pts.join(",")})`;
}

function CalloutView({ c, seed, t }: { c: Callout; seed: number; t: number }) {
  const shadow = "drop-shadow(0 10px 14px rgba(40,30,15,0.28))";
  switch (c.kind) {
    case "stamp":
      return <div style={{ padding: "12px 24px", border: `5px solid ${P.accent}`, color: P.accent, fontFamily: COND, fontWeight: 700, fontSize: 46, letterSpacing: 3, background: "rgba(205,197,186,0.6)" }}>{c.text.toUpperCase()}</div>;
    case "sticky":
      return (
        <div style={{ filter: shadow }}>
          <div style={{ width: 300, minHeight: 200, background: "#f1d46a", padding: "34px 26px 24px", fontFamily: COND, fontWeight: 700, fontSize: 48, lineHeight: 1.05, color: P.ink }}>{c.text}</div>
          <div style={{ position: "absolute", left: 100, top: -16, width: 110, height: 34, background: "rgba(236,228,210,0.8)", transform: "rotate(-4deg)" }} />
        </div>
      );
    case "arrow": {
      const d = interpolate(t, [0, 12], [0, 1], clamp);
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: NEWS, fontStyle: "italic", fontSize: 40, color: P.ink, background: "rgba(205,197,186,0.75)", padding: "2px 10px" }}>{c.text}</span>
          <svg width="150" height="80" style={{ overflow: "visible" }}>
            <path d="M5 60 Q 70 0 140 30" stroke={P.accent} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="200" strokeDashoffset={200 * (1 - d)} />
            <path d="M120 14 L142 31 L118 44" stroke={P.accent} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={d > 0.9 ? 1 : 0} />
          </svg>
        </div>
      );
    }
    case "clip":
      return (
        <div style={{ filter: shadow }}>
          <div style={{ width: 460, background: "#efe9dd", clipPath: torn(seed), padding: "30px 30px 34px" }}>
            <div style={{ height: 2, background: P.ink, marginBottom: 12, opacity: 0.7 }} />
            <div style={{ fontFamily: DISPLAY, fontSize: 40, lineHeight: 1.1, color: P.ink }}>{c.text}</div>
          </div>
        </div>
      );
    default:
      return (
        <div style={{ filter: shadow }}>
          <div style={{ background: "#efe9dd", clipPath: torn(seed), padding: "20px 30px", fontFamily: COND, fontWeight: 700, fontSize: 44, letterSpacing: 1, color: P.ink, whiteSpace: "nowrap" }}>{c.text.toUpperCase()}</div>
        </div>
      );
  }
}

/* ---------------- the host (poses, blink, a natural sway; no mouth animation) ---------------- */
function Host({ p, pose, frame, box }: { p: PaperProps; pose: Pose; frame: number; box: React.CSSProperties }) {
  const meta = p.host.poses[pose] ?? p.host.poses.talk;
  const name = p.host.poses[pose] ? pose : "talk";
  const blink = frame % 104 < 4 || (frame + 37) % 173 < 4;
  const sway = Math.sin(frame / 45) * 0.7;
  const bob = Math.sin(frame / 30) * 3;
  const scale = (box.height as number) / meta.h;
  return (
    <div style={{ position: "absolute", ...box, ...(box.left === "center" ? { left: `calc(50% - ${(meta.w * scale) / 2}px)` } : {}), width: meta.w * scale,
      transform: `translateY(${bob}px) rotate(${sway}deg)`, transformOrigin: "50% 100%", filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.18))" }}>
      <Img src={staticFile(`${p.host.dir}/${name}.png`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {meta.blink && blink && <Img src={staticFile(`${p.host.dir}/${name}-blink.png`)} style={{ position: "absolute", left: meta.blink[0] * scale, top: meta.blink[1] * scale, width: meta.blink[2] * scale, height: meta.blink[3] * scale }} />}
    </div>
  );
}

/* ---------------- typography ---------------- */
function Knockout({ text, frame }: { text: string; frame: number }) {
  const w = interpolate(frame, [4, 16], [0, 100], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 10, height: 330, background: P.ink, clipPath: `inset(0 ${100 - w}% 0 0)`, overflow: "hidden",
      display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: Math.min(300, 1680 / (0.56 * Math.max(1, text.length))), lineHeight: 0.9, color: P.paper, transform: "scaleY(1.35)", transformOrigin: "50% 100%", letterSpacing: -4, whiteSpace: "nowrap", marginBottom: -22 }}>
        {text.toUpperCase()}
      </div>
    </div>
  );
}

function TitleCard({ kicker, title, frame }: { kicker: string; title: string; frame: number }) {
  const t = spring({ frame, fps: FPS, config: { damping: 20 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: TYPEW, fontSize: 30, letterSpacing: 8, color: P.accent, marginBottom: 30, opacity: t }}>{kicker.toUpperCase()}</div>
      <div style={{ background: P.ink, padding: "90px 70px 40px", transform: `scaleX(${0.6 + 0.4 * t})`, overflow: "hidden" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 170, lineHeight: 1.12, color: P.paper, transform: "scaleY(1.25)", transformOrigin: "50% 100%", textAlign: "center", maxWidth: 1600 }}>
          {title.toUpperCase()}
        </div>
      </div>
      <div style={{ width: 1400 * t, height: 2, background: P.ink, marginTop: 36 }} />
    </AbsoluteFill>
  );
}

/* ---------------- evidence panels ---------------- */
function PanelView({ panel, frame, full }: { panel: Panel; frame: number; full?: boolean }) {
  switch (panel.kind) {
    case "image": return <ImagePanel panel={panel} frame={frame} full={full} />;
    case "chart": return <ChartPanel panel={panel} frame={frame} />;
    case "number": return <NumberPanel panel={panel} frame={frame} />;
    case "document": return <DocPanel panel={panel} frame={frame} />;
    case "timeline": return <TimelinePanel panel={panel} frame={frame} />;
  }
}

function ImagePanel({ panel, frame, full }: { panel: Extract<Panel, { kind: "image" }>; frame: number; full?: boolean }) {
  const k = interpolate(frame, [0, 400], [0, 1], clamp);
  const o = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", opacity: o }}>
      <div style={{ flex: 1, border: `2px solid ${P.ink}`, overflow: "hidden", position: "relative", background: P.paper2 }}>
        <Img src={staticFile(panel.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.02 + 0.06 * k})`, filter: "saturate(0.88) contrast(1.02)" }} />
      </div>
      {panel.caption && (
        <div style={{ display: "flex", gap: 18, alignItems: "baseline", marginTop: 14 }}>
          <span style={{ fontFamily: COND, fontWeight: 700, fontSize: full ? 30 : 26, letterSpacing: 1, color: P.ink }}>{panel.caption.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

function SourceStamp({ text, frame, x = 0, y = 0 }: { text: string; frame: number; x?: number; y?: number }) {
  const s = spring({ frame: frame - 18, fps: FPS, config: { damping: 11, stiffness: 160 } });
  if (!text) return null;
  return (
    <div style={{ position: "absolute", right: x, bottom: y, transform: `scale(${1.6 - 0.6 * s}) rotate(-4deg)`, opacity: s, padding: "12px 20px", border: `3px solid ${P.accent}`,
      fontFamily: TYPEW, fontWeight: 700, fontSize: 21, letterSpacing: 2, color: P.accent, background: "rgba(217,210,199,0.85)", maxWidth: 520, textAlign: "center" }}>
      SOURCE: {text.toUpperCase()}
    </div>
  );
}

function ChartPanel({ panel, frame }: { panel: Extract<Panel, { kind: "chart" }>; frame: number }) {
  const max = Math.max(...panel.bars.map((b) => Math.abs(b.value)), 1e-9);
  if (panel.bars.some((b) => b.value < 0)) return <DivergingChart panel={panel} frame={frame} max={max} />;
  return (
    <div style={{ position: "absolute", inset: 0, padding: "10px 10px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 56, color: P.ink, letterSpacing: 1 }}>{panel.title.toUpperCase()}</div>
      <div style={{ height: 3, background: P.ink, margin: "14px 0 44px" }} />
      {panel.bars.map((b, i) => {
        const g = interpolate(frame, [10 + i * 8, 34 + i * 8], [0, 1], clamp);
        const last = i === panel.bars.length - 1;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 40 }}>
            <div style={{ width: 300, fontFamily: NEWS, fontSize: 40, color: P.ink, lineHeight: 1.1 }}>{b.label}</div>
            <div style={{ flex: 1, height: 96, borderBottom: `1px solid ${P.soft}` }}>
              <div style={{ width: `${Math.max(1, (Math.abs(b.value) / max) * 100) * g}%`, height: "100%", background: last ? P.accent : P.ink }} />
            </div>
            <div style={{ width: 210, textAlign: "right", fontFamily: DISPLAY, fontSize: 80, color: P.ink, opacity: g }}>{b.display}</div>
          </div>
        );
      })}
      <SourceStamp text={panel.source} frame={frame} />
    </div>
  );
}

/** Falls go left of the centre line in the accent colour, rises go right in ink: a decline never looks like a big bar. */
function DivergingChart({ panel, frame, max }: { panel: Extract<Panel, { kind: "chart" }>; frame: number; max: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, padding: "10px 10px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 56, color: P.ink, letterSpacing: 1 }}>{panel.title.toUpperCase()}</div>
      <div style={{ height: 3, background: P.ink, margin: "14px 0 60px" }} />
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: -16, bottom: -16, width: 2, background: P.ink }} />
        {panel.bars.map((b, i) => {
          const g = interpolate(frame, [10 + i * 8, 34 + i * 8], [0, 1], clamp);
          const w = (Math.abs(b.value) / max) * 42 * g;
          const neg = b.value < 0;
          return (
            <div key={i} style={{ position: "relative", height: 210 }}>
              <div style={{ position: "absolute", top: 0, [neg ? "right" : "left"]: "calc(50% + 24px)", fontFamily: NEWS, fontSize: 40, color: P.ink }}>{b.label}</div>
              <div style={{ position: "absolute", top: 64, height: 96, [neg ? "right" : "left"]: "50%", width: `${w}%`, background: neg ? P.accent : P.ink }} />
              <div style={{ position: "absolute", top: 66, [neg ? "right" : "left"]: `calc(50% + ${w}% + 22px)`, fontFamily: DISPLAY, fontSize: 84, color: P.ink, opacity: g }}>{b.display}</div>
            </div>
          );
        })}
      </div>
      <SourceStamp text={panel.source} frame={frame} />
    </div>
  );
}

function NumberPanel({ panel, frame }: { panel: Extract<Panel, { kind: "number" }>; frame: number }) {
  const m = panel.value.match(/^([^0-9-]*)(-?[0-9][0-9,.]*)(.*)$/);
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
  const t = interpolate(frame, [4, 34], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const shown = m && !isNaN(target) ? `${m[1]}${(target * t).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${m[3]}` : panel.value;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 330, lineHeight: 0.9, color: P.ink, transform: "scaleY(1.25)" }}>{shown}</div>
      <div style={{ width: 900, height: 3, background: P.ink, margin: "46px 0 22px" }} />
      <div style={{ fontFamily: NEWS, fontSize: 46, color: P.ink, maxWidth: 1100, textAlign: "center", opacity: interpolate(frame, [20, 32], [0, 1], clamp) }}>{panel.label}</div>
      <SourceStamp text={panel.source} frame={frame} x={60} y={40} />
    </AbsoluteFill>
  );
}

function DocPanel({ panel, frame }: { panel: Extract<Panel, { kind: "document" }>; frame: number }) {
  const idx = panel.highlight ? panel.quote.indexOf(panel.highlight) : -1;
  const sweep = interpolate(frame, [24, 44], [0, 100], clamp);
  const drop = spring({ frame, fps: FPS, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "min(1180px, 94%)", background: "#f3efe6", padding: "46px 56px 54px", boxShadow: "0 30px 60px rgba(0,0,0,0.22)", transform: `translateY(${(1 - drop) * 80}px) rotate(-0.8deg)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: TYPEW, fontSize: 24, color: P.soft, letterSpacing: 2 }}>
          <span style={{ fontFamily: COND, fontWeight: 700, fontSize: 30, color: P.ink, letterSpacing: 2 }}>{panel.outlet.toUpperCase()}</span><span>{panel.date.toUpperCase()}</span>
        </div>
        <div style={{ height: 3, background: P.ink, margin: "14px 0 26px" }} />
        <div style={{ fontFamily: DISPLAY, fontSize: 64, lineHeight: 1.05, color: P.ink }}>{panel.headline}</div>
        <div style={{ fontFamily: NEWS, fontSize: 36, lineHeight: 1.45, color: P.ink, marginTop: 26 }}>
          {idx < 0 ? panel.quote : (
            <>
              {panel.quote.slice(0, idx)}
              <span style={{ backgroundImage: `linear-gradient(${P.hi}, ${P.hi})`, backgroundRepeat: "no-repeat", backgroundSize: `${sweep}% 100%` }}>{panel.highlight}</span>
              {panel.quote.slice(idx + panel.highlight.length)}
            </>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TimelinePanel({ panel, frame }: { panel: Extract<Panel, { kind: "timeline" }>; frame: number }) {
  const n = panel.events.length;
  const draw = interpolate(frame, [4, 20 + n * 10], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 44, color: P.ink }}>{panel.title.toUpperCase()}</div>
      <div style={{ position: "absolute", left: 20, right: 20, top: 430, height: 4, background: P.ink, transform: `scaleX(${draw})`, transformOrigin: "0 50%" }} />
      {panel.events.map((e, i) => {
        const x = 20 + ((i + 0.5) / n) * 100;
        const on = interpolate(frame, [10 + i * 10, 22 + i * 10], [0, 1], clamp);
        return (
          <div key={i} style={{ position: "absolute", left: `calc(${((i + 0.5) / n) * 100}% - 170px)`, top: i % 2 ? 470 : 150, width: 340, textAlign: "center", opacity: on, marginLeft: x * 0 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 70, color: i === n - 1 ? P.accent : P.ink }}>{e.when}</div>
            <div style={{ fontFamily: NEWS, fontSize: 30, color: P.ink, lineHeight: 1.2 }}>{e.label}</div>
          </div>
        );
      })}
    </div>
  );
}
