import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Diagram } from "./Diagrams";
import { FPS, INTRO, OUTRO, layout, type Props } from "./timing";

export const C = { paper: "#f4f2ee", panel: "#ebe8e1", ink: "#181817", grey: "#7d7971", line: "#d9d5cb", red: "#e5301a" };
export const F = {
  display: '"Inter Tight", "Helvetica Neue", Arial, sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
  mono: '"Geist Mono", Menlo, monospace',
};
const label = { fontFamily: F.mono, fontSize: 22, letterSpacing: "0.18em", textTransform: "uppercase" as const };

export const Episode = (p: Props) => {
  const { scenes, total } = layout(p);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence durationInFrames={INTRO}><TitleCard {...p} /></Sequence>
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.start} durationInFrames={s.frames}>
          <Shot scene={s} index={i} count={scenes.length} />
          {s.lines.map((l, j) => (
            <Sequence key={j} from={l.from} durationInFrames={l.frames}>
              <Audio src={staticFile(l.audio)} />
            </Sequence>
          ))}
        </Sequence>
      ))}
      <Sequence from={total - OUTRO}><EndCard {...p} /></Sequence>
    </AbsoluteFill>
  );
};

function TitleCard(p: Props) {
  const f = useCurrentFrame();
  const inn = spring({ frame: f, fps: FPS, config: { damping: 200 } });
  const out = interpolate(f, [INTRO - 15, INTRO], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.paper, opacity: out, padding: 140, justifyContent: "center" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: C.red }} />
      <div style={{ ...label, color: C.ink }}>Tayyari <span style={{ color: C.grey }}>·</span> <span style={{ color: C.red }}>Lesson {String(p.lesson).padStart(2, "0")}</span></div>
      <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 54, color: C.grey, marginTop: 70, opacity: inn }}>{p.tagline}</div>
      <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 132, lineHeight: 1.02, letterSpacing: "-0.03em", color: C.ink, marginTop: 16, transform: `translateY(${(1 - inn) * 40}px)`, opacity: inn }}>
        {p.title}
      </div>
    </AbsoluteFill>
  );
}

function EndCard(p: Props) {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.paper, opacity: inn, padding: 140, justifyContent: "center" }}>
      <div style={{ ...label, color: C.red }}>To be continued</div>
      <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 96, letterSpacing: "-0.03em", color: C.ink, marginTop: 24 }}>Now practise the PYQs.</div>
      <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 46, color: C.grey, marginTop: 18 }}>Lesson {p.lesson} is waiting in Tayyari.</div>
    </AbsoluteFill>
  );
}

function Shot({ scene, index, count }: { scene: ReturnType<typeof layout>["scenes"][number]; index: number; count: number }) {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const d = scene.frames;
  const fade = interpolate(f, [0, 12, d - 12, d], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // slow documentary drift: alternate push-in / pull-out and pan direction per scene
  const k = f / Math.max(d, 1);
  const scale = index % 2 ? 1.14 - 0.08 * k : 1.04 + 0.1 * k;
  const pan = (index % 3 === 0 ? -1 : 1) * 30 * k;
  const current = scene.lines.find((l) => f >= l.from && f < l.from + l.frames + 9);
  const hasDiagram = !!scene.diagram && scene.diagram !== "none";
  void durationInFrames;
  return (
    <AbsoluteFill style={{ opacity: fade, overflow: "hidden" }}>
      <Img src={staticFile(scene.image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateX(${pan}px)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(11,10,8,0.55) 0%, rgba(11,10,8,0) 22%, rgba(11,10,8,0) 58%, rgba(11,10,8,0.82) 100%)" }} />

      {/* scene index + title, top-left */}
      <div style={{ position: "absolute", left: 72, top: 56, ...label, color: C.paper }}>
        <span style={{ color: C.red }}>{String(index + 1).padStart(2, "0")}</span> / {String(count).padStart(2, "0")}&nbsp;&nbsp;—&nbsp;&nbsp;{scene.title}
      </div>

      {hasDiagram && (
        <div style={{ position: "absolute", right: 64, top: 120, width: 800, height: 560, background: "rgba(244,242,238,0.95)", border: `2px solid ${C.line}`, boxShadow: "0 30px 80px rgba(0,0,0,0.35)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: C.red }} />
          <Diagram kind={scene.diagram} frame={f} frames={d} />
        </div>
      )}

      {scene.caption && (
        <FactChip text={scene.caption} frame={f} right={hasDiagram} />
      )}

      {current && <Subtitle speaker={current.speaker} text={current.subtitle} frame={f - current.from} />}
    </AbsoluteFill>
  );
}

function FactChip({ text, frame, right }: { text: string; frame: number; right: boolean }) {
  const inn = spring({ frame: frame - 25, fps: FPS, config: { damping: 200 } });
  return (
    <div style={{ position: "absolute", left: right ? 1920 - 64 - 800 : 72, top: right ? 700 : 120, width: right ? 800 : 900, opacity: inn, transform: `translateY(${(1 - inn) * 20}px)`,
      background: C.ink, borderLeft: `6px solid ${C.red}`, padding: "18px 26px" }}>
      <div style={{ ...label, fontSize: 18, color: C.red }}>Exam fact</div>
      <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 34, lineHeight: 1.2, color: C.paper, marginTop: 8 }}>{text}</div>
    </div>
  );
}

const SPEAKER_COLOR: Record<string, string> = { Narrator: C.grey, Setu: C.red, Ravi: C.paper, Meera: C.paper };

function Subtitle({ speaker, text, frame }: { speaker: string; text: string; frame: number }) {
  const inn = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 160, right: 160, bottom: 70, textAlign: "center", opacity: inn }}>
      <div style={{ ...label, fontSize: 20, color: SPEAKER_COLOR[speaker] ?? C.paper }}>{speaker}</div>
      <div style={{ fontFamily: speaker === "Narrator" ? F.serif : F.display, fontStyle: speaker === "Narrator" ? "italic" : "normal",
        fontSize: speaker === "Narrator" ? 48 : 44, lineHeight: 1.25, color: C.paper, marginTop: 10, textShadow: "0 2px 18px rgba(0,0,0,0.85)" }}>
        {text}
      </div>
    </div>
  );
}
