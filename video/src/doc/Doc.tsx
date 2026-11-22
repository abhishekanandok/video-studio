import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { K, SANS, SERIF, Stamp, Tag, Torn, Typed, TYPE, rnd, tornClip } from "../explainer/collage";
import { StringDiagram, type Visual } from "../explainer/Explainer";

type Note = { text: string; style: "stamp" | "label" | "typed" | "underline" | "define" | "source" | "chart"; line: number };
type Line = { speaker: string; speech: string; subtitle: string; pause: number; audio: string | null; audio_alt?: string; seconds: number; offset?: number };
type Topo = { topology: string; fail: string; nodes: number; tags: string[] } | null;
// a two-voice scene carries one conversation take (audio + seconds) and each line its offset inside it
// motion (from the director): a Veo clip that plays and then holds on its last frame, or parallax layers (clean plate + subject)
type Scene = { image: string; move: string; transition: string; sfx: string; diagram: Topo; notes: Note[]; lines: Line[]; audio?: string; audio_alt?: string;
  seconds?: number; clip?: string; clip_seconds?: number; clip_last?: string; layers?: { plate: string; fg: string } };
// track "alt": the same timeline with the dubbed voices (the second audio track of a two-language film)
export type DocProps = { title: string; hosts: Record<string, string>; names?: Record<string, string>; speed?: number; subtitles?: boolean; track?: "main" | "alt"; scenes: Scene[] };

export const FPS = 30;
const OVER = 14; // frames a scene's transition overlaps the previous one
const LEAD = 0.25; // seconds before the first line of a scene
const TAIL = 1.2;
const SPEED = 1.1; // default voice speed (pitch preserved); a film can set its own via props.speed
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function layoutDoc(p: DocProps) {
  const speed = p.speed ?? SPEED;
  let at = 0;
  const scenes = p.scenes.map((s) => {
    let t = LEAD;
    const lines = s.lines.map((l) => {
      if (s.audio) {  // conversation take: lines sit at their offsets inside it
        const from = Math.round((LEAD + (l.offset ?? 0) / speed) * FPS);
        return { ...l, from, frames: Math.max(1, Math.round((l.seconds / speed) * FPS)) };
      }
      const from = Math.round(t * FPS);
      const secs = l.seconds / speed;
      t += secs + Math.max(0.1, Math.min(1.6, l.pause ?? 0.2));
      return { ...l, from, frames: Math.max(1, Math.round(secs * FPS)) };
    });
    const last = s.lines[s.lines.length - 1];
    const frames = s.audio ? Math.round((LEAD + (s.seconds ?? 0) / speed + Math.max(0.3, Math.min(1.6, last?.pause ?? 0.4))) * FPS) : Math.round(t * FPS);
    const r = { ...s, start: at, frames, lines };
    at += frames;
    return r;
  });
  return { scenes, total: at + Math.round(TAIL * FPS) };
}

export const Doc = (p: DocProps) => {
  const { scenes: laid, total } = layoutDoc(p);
  // the alt track swaps every voice for its dub; timing is shared (built from the longer of the two takes)
  const scenes = p.track === "alt" ? laid.map((s) => ({ ...s, audio: s.audio_alt ?? s.audio, lines: s.lines.map((l) => ({ ...l, audio: l.audio_alt ?? l.audio })) })) : laid;
  return (
    <AbsoluteFill style={{ background: "#0e0d0b" }}>
      <Audio src={staticFile("sfx/bed.wav")} volume={0.07} loop />
      {scenes.map((s, i) => {
        const from = Math.max(0, s.start - (i ? OVER : 0));
        return (
          <Sequence key={i} from={from} durationInFrames={s.frames + (i ? OVER : 0) + (i === scenes.length - 1 ? Math.round(TAIL * FPS) : 0)}>
            <Shot scene={s} index={i} lead={i ? OVER : 0} />
          </Sequence>
        );
      })}
      <Dock hosts={p.hosts} names={p.names ?? {}} scenes={scenes} />
      {scenes.map((s, i) => s.audio && (
        <Sequence key={`take-${i}`} from={s.start + Math.round(LEAD * FPS)} durationInFrames={Math.max(1, s.frames - Math.round(LEAD * FPS))}>
          <Audio src={staticFile(s.audio)} playbackRate={p.speed ?? SPEED} />
        </Sequence>
      ))}
      {scenes.map((s, i) => s.lines.map((l, j) => (
        <Sequence key={`${i}-${j}`} from={s.start + l.from} durationInFrames={l.frames}>
          {l.audio && <Audio src={staticFile(l.audio)} playbackRate={p.speed ?? SPEED} />}
          <Speaking line={l} take={s.audio ? { src: s.audio, offset: l.from - Math.round(LEAD * FPS) } : undefined} hosts={p.hosts} names={p.names ?? {}} speed={p.speed ?? SPEED} subtitles={p.subtitles !== false} />
        </Sequence>
      )))}
      <Vignette />
    </AbsoluteFill>
  );
};

/* ---------- one scene: image + camera move + transition + notes + diagram ---------- */
function Shot({ scene, index, lead }: { scene: ReturnType<typeof layoutDoc>["scenes"][number]; index: number; lead: number }) {
  const f = useCurrentFrame();
  const local = f - lead; // frames since the scene "officially" started
  const d = scene.frames;
  const k = Math.max(0, Math.min(1, local / d));
  const cam = {
    push: `scale(${1.03 + 0.1 * k})`,
    pull: `scale(${1.13 - 0.1 * k})`,
    pan_left: `scale(1.12) translateX(${40 - 80 * k}px)`,
    pan_right: `scale(1.12) translateX(${-40 + 80 * k}px)`,
  }[scene.move] ?? `scale(${1.03 + 0.08 * k})`;
  const p = lead ? interpolate(f, [0, lead], [0, 1], clamp) : 1;
  const ease = 1 - Math.pow(1 - p, 3);
  let wrap: React.CSSProperties = {};
  let blackout = 0;
  switch (scene.transition) {
    case "slide":
      wrap = { transform: `translateX(${(1 - ease) * 105}%) rotate(${(1 - ease) * 3}deg)`, boxShadow: "-30px 0 60px rgba(0,0,0,0.45)" };
      break;
    case "tear": {
      const edge = 100 - ease * 112;
      const pts = Array.from({ length: 24 }, (_, i) => `${Math.max(0, edge + (rnd(i + index * 7) - 0.5) * 6).toFixed(1)}% ${(i / 23) * 100}%`);
      wrap = { clipPath: `polygon(100% 0, ${pts.join(",")}, 100% 100%)` };
      break;
    }
    case "zoom":
      wrap = { transform: `scale(${1.35 - 0.35 * ease})`, opacity: ease };
      break;
    case "black":
      blackout = lead ? interpolate(f, [0, 4, lead + 8, lead + 22], [0, 1, 1, 0], clamp) : 0;
      break;
  }
  const hasDiagram = !!scene.diagram;
  const v: Visual | null = scene.diagram ? { kind: "string", plate: 0, label: "", topology: scene.diagram.topology, fail: scene.diagram.fail,
    tags: scene.diagram.tags ?? [], nodes: scene.diagram.nodes, text: "", lines: [], left_title: "", left: [], right_title: "", right: [] } : null;
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...wrap }}>
      {scene.clip ? <Clip scene={scene} frames={d + lead} />
        : scene.layers ? <Parallax layers={scene.layers} move={scene.move} k={k} />
        : <Img src={staticFile(scene.image)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: cam, filter: hasDiagram ? "brightness(1.02)" : undefined }} />}
      {hasDiagram && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "52%", background: "linear-gradient(90deg, rgba(247,242,231,0) 0%, rgba(247,242,231,0.9) 18%)" }} />}
      {v && local >= 0 && <div style={{ position: "absolute", inset: 0 }}><StringDiagram v={v} frame={local} frames={d} continues={false} /></div>}
      {scene.notes.map((n, i) => {
        const at = (scene.lines[Math.min(n.line, scene.lines.length - 1)]?.from ?? 0) + 6;
        return local >= at ? <NoteView key={i} note={n} frame={local - at} slot={i} diagram={hasDiagram} seed={index * 10 + i} /> : null;
      })}
      {scene.sfx !== "none" && <Sequence from={Math.max(0, lead - 6)}><Audio src={staticFile(`sfx/${scene.sfx}.wav`)} volume={0.55} /></Sequence>}
      {blackout > 0 && <AbsoluteFill style={{ background: "#0e0d0b", opacity: blackout }} />}
    </AbsoluteFill>
  );
}

const FILL = { position: "absolute", width: "100%", height: "100%", objectFit: "cover" } as const;

/** A Veo shot: plays (slowed down to at most 0.6x if the scene is longer), then holds on its last frame with a slow push. */
function Clip({ scene, frames }: { scene: ReturnType<typeof layoutDoc>["scenes"][number]; frames: number }) {
  const f = useCurrentFrame();
  const secs = scene.clip_seconds ?? 8;
  const rate = Math.max(0.6, Math.min(1, secs / (frames / FPS)));
  const clipFrames = Math.floor((secs / rate) * FPS) - 1;
  const hold = Math.max(0, f - clipFrames) / Math.max(1, frames - clipFrames);
  return (
    <>
      <Sequence durationInFrames={clipFrames}><OffthreadVideo src={staticFile(scene.clip!)} muted playbackRate={rate} style={FILL} /></Sequence>
      {f >= clipFrames && <Img src={staticFile(scene.clip_last ?? scene.image)} style={{ ...FILL, transform: `scale(${1 + 0.05 * hold})` }} />}
    </>
  );
}

/** 2.5D: the clean plate drifts one way, the lifted subject the other and a little closer. */
function Parallax({ layers, move, k }: { layers: { plate: string; fg: string }; move: string; k: number }) {
  const dir = move === "pan_left" ? -1 : 1;
  const zoomIn = move !== "pull";
  const z = zoomIn ? k : 1 - k;
  return (
    <>
      <Img src={staticFile(layers.plate)} style={{ ...FILL, transform: `scale(${1.1 + 0.03 * z}) translateX(${dir * (14 - 28 * k)}px)`, filter: "blur(1.2px)" }} />
      <Img src={staticFile(layers.fg)} style={{ ...FILL, transform: `scale(${1.06 + 0.1 * z}) translateX(${dir * (-26 + 52 * k)}px)`,
        filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.35))" }} />
    </>
  );
}

const SLOTS = [[1120, 150], [1180, 420], [1080, 660], [1320, 250]];
const LEFT_SLOTS = [[110, 120], [140, 330], [90, 560], [160, 760]];

function NoteView({ note, frame, slot, diagram, seed }: { note: Note; frame: number; slot: number; diagram: boolean; seed: number }) {
  const [x, y] = (diagram ? LEFT_SLOTS : SLOTS)[slot % 4];
  const rot = (rnd(seed) - 0.5) * 6;
  switch (note.style) {
    case "source": { // a real source, shown like a clipping: OUTLET | DATE | finding
      const [outlet = "", date = "", ...rest] = note.text.split("|").map((t) => t.trim());
      const finding = rest.join(" | ");
      return (
        <Torn seed={seed} x={Math.min(x, 1100)} y={y} w={720} frame={frame} rot={rot * 0.4} style={{ padding: "22px 32px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: TYPE, fontSize: 19, fontWeight: 700, letterSpacing: "0.12em", color: K.red }}>
            <span>{outlet.toUpperCase()}</span><span style={{ color: K.ink, opacity: 0.6 }}>{date.toUpperCase()}</span>
          </div>
          <div style={{ height: 2, background: K.ink, opacity: 0.8, margin: "10px 0 12px" }} />
          <div style={{ fontFamily: SERIF, fontSize: 38, lineHeight: 1.18, color: K.ink, opacity: interpolate(frame, [4, 14], [0, 1], clamp) }}>{finding}</div>
        </Torn>
      );
    }
    case "chart": { // real numbers as bars: TITLE | label=number | label=number
      const [title = "", ...pairs] = note.text.split("|").map((t) => t.trim());
      const bars = pairs.map((p) => { const [l, v] = p.split("="); return { l: (l ?? "").trim(), v: parseFloat((v ?? "").replace(/[^0-9.\-]/g, "")) || 0, raw: (v ?? "").trim() }; }).slice(0, 4);
      const max = Math.max(...bars.map((b) => Math.abs(b.v)), 1e-9);
      return (
        <Torn seed={seed} x={Math.min(x, 1080)} y={y} w={740} frame={frame} rot={rot * 0.3} style={{ padding: "22px 32px 28px" }}>
          <div style={{ fontFamily: TYPE, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", color: K.red }}>{title.toUpperCase()}</div>
          {bars.map((b, i) => {
            const grow = interpolate(frame, [8 + i * 6, 26 + i * 6], [0, 1], clamp);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
                <div style={{ width: 150, fontFamily: SANS, fontSize: 26, fontWeight: 600, color: K.ink }}>{b.l}</div>
                <div style={{ flex: 1, height: 34, background: "rgba(0,0,0,0.06)" }}>
                  <div style={{ width: `${Math.max(1.5, (Math.abs(b.v) / max) * 100) * grow}%`, height: "100%", background: i === bars.length - 1 ? K.red : K.ink }} />
                </div>
                <div style={{ width: 110, textAlign: "right", fontFamily: SANS, fontSize: 28, fontWeight: 700, color: K.ink, opacity: grow }}>{b.raw}</div>
              </div>
            );
          })}
        </Torn>
      );
    }
    case "define": {
      const [term, ...rest] = note.text.split(":");
      return (
        <Torn seed={seed} x={x} y={y} w={700} frame={frame} rot={rot * 0.5} style={{ padding: "22px 34px 26px" }}>
          <div style={{ fontFamily: TYPE, fontSize: 20, fontWeight: 700, letterSpacing: "0.14em", color: K.red }}>NEW TERM</div>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 50, lineHeight: 1.05, color: K.ink, marginTop: 6 }}>{term.trim()}</div>
          {rest.length > 0 && <div style={{ fontFamily: SANS, fontSize: 30, lineHeight: 1.25, color: K.ink, marginTop: 10, opacity: interpolate(frame, [10, 18], [0, 1], clamp) }}>{rest.join(":").trim()}</div>}
        </Torn>
      );
    }
    case "stamp":
      return <Stamp text={note.text} x={x} y={y} frame={frame} rot={rot - 4} size={note.text.length > 16 ? 46 : 60} />;
    case "typed":
      return (
        <Torn seed={seed} x={x} y={y} w={Math.min(760, 140 + note.text.length * 30)} frame={frame} rot={rot} style={{ padding: "20px 30px" }}>
          <div style={{ fontFamily: TYPE, fontWeight: 700, fontSize: 44, color: K.ink }}><Typed text={note.text} frame={frame} delay={4} cps={22} /></div>
        </Torn>
      );
    case "underline": {
      const w = Math.min(780, 80 + note.text.length * 34);
      const t = interpolate(frame, [8, 22], [0, 1], clamp);
      return (
        <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg)`, filter: "drop-shadow(0 8px 10px rgba(40,30,15,0.28))" }}>
          <div style={{ background: K.card, clipPath: tornClip(seed, 2.5), padding: "16px 30px 24px", fontFamily: SANS, fontWeight: 700, fontSize: 52, color: K.ink,
            opacity: interpolate(frame, [0, 5], [0, 1], clamp) }}>{note.text}</div>
          <svg width={w} height={24} style={{ position: "absolute", left: 20, bottom: 6, overflow: "visible" }}>
            <path d={`M4 14 Q ${w / 2} ${4} ${w - 30} 12`} stroke={K.red} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={w * 1.1} strokeDashoffset={w * 1.1 * (1 - t)} opacity={0.85} />
          </svg>
        </div>
      );
    }
    default:
      return <Tag x={x} y={y} frame={frame} rot={rot} size={34}>{note.text}</Tag>;
  }
}

/* ---------- the two hosts, pinned to the page ---------- */
const HOST_W = 300;
/** Dock slots along the bottom-left, one per on-screen role (formats with no dock pass no hosts). */
const dockPos = (hosts: Record<string, string>) =>
  Object.fromEntries(Object.keys(hosts).map((name, i) => [name, [20 + i * 250, 770] as [number, number]]));

/** Both hosts always on the page; whoever is speaking lifts up with a red name tag. */
function Dock({ hosts, names, scenes }: { hosts: Record<string, string>; names: Record<string, string>; scenes: ReturnType<typeof layoutDoc>["scenes"] }) {
  const f = useCurrentFrame();
  let active = "", since = 0;
  for (const s of scenes) for (const l of s.lines) {
    const at = s.start + l.from;
    if (f >= at && f < at + l.frames + 6) { active = l.speaker; since = f - at; }
  }
  const DOCK = dockPos(hosts);
  return (
    <>
      {Object.entries(DOCK).map(([name, [x, y]]) => {
        const on = name === active;
        const lift = on ? spring({ frame: since, fps: FPS, config: { damping: 14 } }) : 0;
        return (
          <div key={name} style={{ position: "absolute", left: x, top: y - 26 * lift, width: HOST_W, transform: `scale(${0.92 + 0.1 * lift})`, transformOrigin: "50% 100%",
            opacity: 0.6 + 0.4 * lift, filter: `grayscale(${1 - lift}) drop-shadow(0 ${6 + 8 * lift}px ${8 + 8 * lift}px rgba(0,0,0,0.4))` }}>
            <Img src={staticFile(hosts[name])} style={{ width: "100%" }} />
            <div style={{ position: "absolute", left: 92, bottom: 30, background: on ? K.red : K.kraft, padding: "3px 12px", fontFamily: TYPE, fontWeight: 700, fontSize: 20,
              color: on ? K.card : K.ink }}>{(names[name] ?? name).toUpperCase()}</div>
          </div>
        );
      })}
    </>
  );
}

const SPEAKER_TINT = ["#e0b44f", "#e0b44f", "#ff8a7a", "#9fd3c7"]; // narrator/first role, then the rest

/** Waveform over the speaking host, driven by the real audio. No captions: YouTube adds them. */
function Speaking({ line, take, hosts, names, speed, subtitles }: { line: Line; take?: { src: string; offset: number }; hosts: Record<string, string>; names: Record<string, string>; speed: number; subtitles: boolean }) {
  const f = useCurrentFrame();
  // waveform from the line's own take, or from its stretch of the scene's conversation take
  const audio = useAudioData(staticFile(take?.src ?? line.audio ?? "sfx/paper.wav"));
  const at = Math.round(((take?.offset ?? 0) + f) * speed);
  const bars = audio ? visualizeAudio({ fps: FPS, frame: at, audioData: audio, numberOfSamples: 16 }) : new Array(16).fill(0);
  const pos = dockPos(hosts)[line.speaker];
  return (
    <>
      {pos && <svg width={200} height={70} style={{ position: "absolute", left: pos[0] + 60, top: pos[1] - 60 }}>
        {bars.slice(0, 12).map((b, i) => {
          const h = 6 + Math.min(60, b * 320);
          return <rect key={i} x={i * 16} y={35 - h / 2} width={9} height={h} fill={K.red} opacity={0.9} />;
        })}
      </svg>}
    </>
  );
}

function Vignette() {
  return <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(40,25,10,0.3) 100%)" }} />;
}

