import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BrassDefs, K, Pin, SANS, Stamp, StringLine, Tag, Tape, Torn, Typed, TYPE, rnd } from "./collage";

export type Visual = {
  kind: string; plate: number; label: string; topology: string | null; fail: string; tags: string[]; nodes: number;
  text: string; lines: string[]; left_title: string; left: string[]; right_title: string; right: string[];
  card?: { q: string; options: string[]; answer: number | null; exam: string } | null;
};
export type Beat = { narration: string; visual: Visual; audio: string; seconds: number };
export type ExProps = { series: string; episode: number; of: number; title: string; takeaway: string; next: string; plates: string[]; beats: Beat[] };

export const FPS = 30;
const INTRO = 3.2 * FPS, OUTRO = 4.5 * FPS, GAP = 0.45;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function layoutEx(p: ExProps) {
  let at = INTRO;
  const beats = p.beats.map((b, i) => {
    const frames = Math.round((b.seconds + GAP) * FPS);
    const prev = p.beats[i - 1]?.visual;
    const continues = !!prev && prev.kind === "string" && b.visual.kind === "string" && prev.topology === b.visual.topology;
    const r = { ...b, from: at, frames, continues };
    at += frames;
    return r;
  });
  return { beats, total: at + OUTRO };
}

export const Explainer = (p: ExProps) => {
  const { beats, total } = layoutEx(p);
  return (
    <AbsoluteFill style={{ background: K.paper }}>
      <Plates plates={p.plates} beats={beats} total={total} />
      <Sequence durationInFrames={INTRO}><Intro {...p} /></Sequence>
      {beats.map((b, i) => (
        <Sequence key={i} from={b.from} durationInFrames={b.frames}>
          <Audio src={staticFile(b.audio)} />
          <BeatVisual beat={b} index={i} />
          <Subtitle text={b.narration} />
        </Sequence>
      ))}
      <Sequence from={total - OUTRO}><Outro {...p} /></Sequence>
      <Grain />
    </AbsoluteFill>
  );
};

/** Plate backgrounds with a slow drift and crossfades whenever the beat switches plate. */
function Plates({ plates, beats, total }: { plates: string[]; beats: ReturnType<typeof layoutEx>["beats"]; total: number }) {
  const f = useCurrentFrame();
  const plateAt = (fr: number) => {
    const b = beats.find((x) => fr >= x.from && fr < x.from + x.frames);
    return b ? b.visual.plate : 0;
  };
  const now = plateAt(f);
  let since = 0;
  while (since < 15 && plateAt(f - since - 1) === now) since++;
  const prevPlate = plateAt(f - since - 1);
  const mix = since >= 15 ? 1 : interpolate(since, [0, 15], [0, 1], clamp);
  const drift = (i: number) => `scale(${1.04 + 0.03 * Math.sin((f / total) * Math.PI + i)}) translateX(${-10 * (f / total) + i * 4}px)`;
  return (
    <AbsoluteFill>
      {mix < 1 && plates[prevPlate] && <Img src={staticFile(plates[prevPlate])} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: drift(prevPlate) }} />}
      {plates[now] && <Img src={staticFile(plates[now])} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: drift(now), opacity: mix }} />}
    </AbsoluteFill>
  );
}

function Grain() {
  return <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(60,40,15,0.22) 100%)" }} />;
}

function Intro(p: ExProps) {
  const f = useCurrentFrame();
  const out = interpolate(f, [INTRO - 10, INTRO], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Tag x={1000} y={200} frame={f} rot={-3} size={30}>EP {String(p.episode).padStart(2, "0")} / {String(p.of).padStart(2, "0")}</Tag>
      <Torn seed={p.episode * 13} x={980} y={290} w={820} frame={f} delay={6} rot={1.5}>
        <div style={{ fontFamily: TYPE, fontSize: 22, letterSpacing: "0.12em", color: K.red, textTransform: "uppercase" }}>{p.series}</div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 78, lineHeight: 1.02, letterSpacing: "-0.02em", color: K.ink, marginTop: 14 }}>{p.title}</div>
      </Torn>
      <Tape x={1060} y={272} frame={f} delay={12} />
    </AbsoluteFill>
  );
}

function Outro(p: ExProps) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Torn seed={p.episode * 31} x={960} y={260} w={860} frame={f} rot={-1}>
        <div style={{ fontFamily: TYPE, fontSize: 22, letterSpacing: "0.12em", color: K.red }}>REMEMBER</div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 54, lineHeight: 1.1, color: K.ink, marginTop: 12 }}>{p.takeaway}</div>
      </Torn>
      <Tape x={1500} y={240} rot={10} frame={f} delay={6} />
      {p.next && <Tag x={980} y={640} frame={f} delay={20} size={24} rot={2}>NEXT ▸ {p.next}</Tag>}
    </AbsoluteFill>
  );
}

function Subtitle({ text }: { text: string }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 260, right: 260, bottom: 40, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ background: "rgba(29,27,24,0.82)", color: K.card, fontFamily: SANS, fontSize: 34, lineHeight: 1.3, padding: "12px 26px", textAlign: "center", maxWidth: 1400 }}>{text}</div>
    </div>
  );
}

function BeatVisual({ beat, index }: { beat: ReturnType<typeof layoutEx>["beats"][number]; index: number }) {
  const f = useCurrentFrame();
  const v = beat.visual;
  switch (v.kind) {
    case "string":
      return <StringDiagram v={v} frame={f} frames={beat.frames} continues={beat.continues} />;
    case "stamp":
      return <><Torn seed={index} x={1000} y={330} w={760} h={330} frame={f} rot={-1.5} /><Stamp text={v.text || v.label} x={1060} y={430} frame={f} delay={8} size={v.text.length > 14 ? 50 : 64} /></>;
    case "pyq":
      return v.card ? <PyqCard card={v.card} frame={f} frames={beat.frames} seed={index} /> : null;
    case "formula":
      return (
        <Torn seed={index * 7} x={980} y={260} w={820} frame={f} rot={0.8}>
          {v.lines.map((l, i) => (
            <div key={i} style={{ marginTop: i ? 18 : 0 }}>
              <span style={{ fontFamily: TYPE, fontWeight: 700, fontSize: 50, color: i === v.lines.length - 1 ? K.red : K.ink,
                borderBottom: i === v.lines.length - 1 ? `4px solid ${K.red}` : "none" }}>
                <Typed text={l} frame={f} delay={8 + i * 28} cps={26} />
              </span>
            </div>
          ))}
        </Torn>
      );
    case "compare":
      return (
        <>
          {[[v.left_title, v.left], [v.right_title, v.right]].map(([t, items], k) => (
            <Torn key={k} seed={index * 3 + k} x={960 + k * 440} y={220 + k * 26} w={410} frame={f} delay={k * 10} rot={k ? 1.8 : -1.6}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 40, color: k ? K.red : K.ink }}>{t as string}</div>
              {(items as string[]).map((it, i) => (
                <div key={i} style={{ fontFamily: SANS, fontSize: 27, lineHeight: 1.3, color: K.ink, marginTop: 14, opacity: interpolate(f, [22 + i * 14 + k * 30, 30 + i * 14 + k * 30], [0, 1], clamp) }}>— {it}</div>
              ))}
            </Torn>
          ))}
          <Tape x={1150} y={200} frame={f} delay={14} rot={-6} />
        </>
      );
    case "list":
      return <>{v.lines.map((l, i) => (
        <Torn key={i} seed={index * 11 + i} x={1000 + (i % 2) * 40} y={200 + i * 118} w={760} bg={i % 2 ? K.card : K.kraft} frame={f} delay={i * 16} rot={(rnd(i + index) - 0.5) * 3}
          style={{ padding: "22px 34px" }}>
          <div style={{ fontFamily: TYPE, fontWeight: 700, fontSize: 34, color: K.ink }}>{l}</div>
        </Torn>
      ))}</>;
    case "title":
      return <Tag x={1000} y={430} frame={f} size={60} rot={-2}>{v.label}</Tag>;
    default: // plate
      return v.label ? <Tag x={1020} y={440} frame={f} delay={6} size={46} rot={-2}>{v.label}</Tag> : null;
  }
}

/* ---------- red-string topologies ---------- */
type Pt = [number, number];
const CX = 1380, CY = 470;
const circle = (n: number, r: number, cx = CX, cy = CY): Pt[] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2), cy + r * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2)]);

function geometry(topology: string, n: number) {
  n = Math.max(2, Math.min(6, n || 5));
  const nodes: Pt[] = [];
  const links: [number, number][] = [];
  let hub: number | null = null;
  let backbone: [Pt, Pt] | null = null;
  if (topology === "p2p") {
    nodes.push([1060, CY], [1700, CY]);
    links.push([0, 1]);
  } else if (topology === "bus") {
    backbone = [[990, CY + 40], [1770, CY + 40]];
    for (let i = 0; i < n; i++) nodes.push([1060 + (i * 640) / (n - 1), i % 2 ? CY + 250 : CY - 170]);
  } else if (topology === "ring") {
    nodes.push(...circle(n, 270));
    for (let i = 0; i < n; i++) links.push([i, (i + 1) % n]);
  } else if (topology === "star") {
    nodes.push([CX, CY], ...circle(n, 300));
    hub = 0;
    for (let i = 1; i <= n; i++) links.push([0, i]);
  } else if (topology === "mesh") {
    nodes.push(...circle(n, 280));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) links.push([i, j]);
  } else if (topology === "tree") {
    nodes.push([CX, 190], [1150, 430], [1610, 430], [1040, 690], [1260, 690], [1500, 690], [1720, 690]);
    links.push([0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]);
    hub = 0;
  } else if (topology === "hybrid") {
    nodes.push([1150, CY], ...circle(3, 190, 1150, CY), ...circle(4, 190, 1620, CY));
    hub = 0;
    links.push([0, 1], [0, 2], [0, 3], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4]);
  } else { // network
    nodes.push([1060, 330], [1400, 230], [1730, 380], [1200, 660], [1600, 690]);
    links.push([0, 1], [1, 2], [0, 3], [3, 4], [4, 2], [1, 4]);
  }
  return { nodes, links, hub, backbone };
}

export function StringDiagram({ v, frame: f, frames, continues }: { v: Visual; frame: number; frames: number; continues: boolean }) {
  const g = geometry(v.topology ?? "network", v.nodes);
  const draw = (i: number, total: number) => continues ? 1 : interpolate(f, [8 + (i / Math.max(total, 1)) * frames * 0.4, 20 + (i / Math.max(total, 1)) * frames * 0.4], [0, 1], clamp);
  const failAt = Math.round(frames * 0.35);
  const snap = v.fail !== "none" ? interpolate(f, [failAt, failAt + 14], [0, 1], clamp) : 0;
  const failed = snap > 0.2;
  const deadNode = (i: number) => failed && (
    v.fail === "backbone" || v.fail === "hub" ||  // backbone or hub down takes every device with it
    (v.fail === "node" && i === 1) || (v.fail === "cable" && i === g.nodes.length - 1));
  const snappedLink = (a: number, b: number) => failed && (
    (v.fail === "cable" && b === g.nodes.length - 1) || (v.fail === "node" && (a === 1 || b === 1)));
  const iconFor = (i: number) => (g.hub === i ? "style/icon-hub-a.png" : "style/icon-pc-a.png");
  const total = g.links.length + (g.backbone ? g.nodes.length + 1 : 0);
  return (
    <AbsoluteFill>
      {g.nodes.map((p, i) => {
        const t = continues ? 1 : interpolate(f, [2 + i * 3, 10 + i * 3], [0, 1], clamp);
        const dead = deadNode(i);
        // the cutout art fills ~45% of its canvas, so the image is drawn large and centred just above the pin
        const w = g.hub === i ? 440 : 360;
        return (
          <div key={i} style={{ position: "absolute", left: p[0] - w / 2, top: p[1] - w * 0.56 / 2 - 52, width: w, opacity: t, transform: `scale(${0.7 + 0.3 * t}) rotate(${(rnd(i + 3) - 0.5) * 6}deg)`,
            filter: dead ? "grayscale(1) brightness(0.8)" : "none" }}>
            <Img src={staticFile(iconFor(i))} style={{ width: "100%" }} />
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <BrassDefs />
        {g.backbone && (
          <>
            <StringLine a={g.backbone[0]} b={g.backbone[1]} t={draw(0, total)} snap={v.fail === "backbone" ? snap : 0} seed={1} />
            {g.nodes.map((p, i) => <StringLine key={i} a={p} b={[p[0], g.backbone![0][1]]} t={draw(i + 1, total)} seed={i + 5} />)}
            {[g.backbone[0], g.backbone[1]].map((p, i) => <rect key={i} x={p[0] - 14} y={p[1] - 22} width={28} height={44} fill={K.ink} opacity={draw(total, total)} />)}
          </>
        )}
        {g.links.map(([a, b], i) => <StringLine key={i} a={g.nodes[a]} b={g.nodes[b]} t={draw(i, total)} snap={snappedLink(a, b) ? snap : 0} seed={i} />)}
        {g.nodes.map((p, i) => <Pin key={i} x={p[0]} y={p[1]} t={continues ? 1 : interpolate(f, [4 + i * 3, 12 + i * 3], [0, 1], clamp)} />)}
        {g.backbone && g.nodes.map((p, i) => <Pin key={`t${i}`} x={p[0]} y={g.backbone![0][1]} r={9} t={draw(i + 1, total)} />)}
        {g.nodes.map((p, i) => deadNode(i) && (
          <path key={`x${i}`} d={`M${p[0] - 40} ${p[1] - 70} L${p[0] + 40} ${p[1] + 10} M${p[0] + 40} ${p[1] - 70} L${p[0] - 40} ${p[1] + 10}`} stroke={K.red} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={240} strokeDashoffset={240 * (1 - interpolate(f, [failAt + 8 + i * 3, failAt + 18 + i * 3], [0, 1], clamp))} opacity={0.85} />
        ))}
      </svg>
      {v.tags.slice(0, 3).map((t, i) => <Tag key={t} x={960} y={130 + i * 72} frame={f} delay={continues ? 0 : 20 + i * 10} size={24} rot={-2 + i * 1.5}>{t}</Tag>)}
    </AbsoluteFill>
  );
}

/* ---------- exam index card ---------- */
function PyqCard({ card, frame: f, frames, seed }: { card: NonNullable<Visual["card"]>; frame: number; frames: number; seed: number }) {
  const reveal = Math.round(frames * 0.6);
  const circleT = interpolate(f, [reveal, reveal + 16], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 960, top: 140, width: 860, height: 700, transform: `rotate(${(rnd(seed) - 0.5) * 2}deg)`, filter: "drop-shadow(0 14px 18px rgba(40,30,15,0.3))",
      opacity: interpolate(f, [0, 8], [0, 1], clamp) }}>
      <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(180deg, #fffdf6 0 43px, #b9cde0 43px 45px)`, backgroundPosition: "0 90px" }} />
      <div style={{ position: "absolute", left: 70, top: 0, bottom: 0, width: 3, background: "#e38b8b" }} />
      <div style={{ position: "absolute", left: 100, top: 30, right: 40, fontFamily: TYPE }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", color: K.red }}>PYQ · {card.exam.toUpperCase()}</div>
        <div style={{ fontSize: 31, lineHeight: "45px", color: K.ink, marginTop: 26, fontWeight: 700 }}><Typed text={card.q} frame={f} delay={6} cps={60} /></div>
        {card.options.map((o, i) => (
          <div key={i} style={{ position: "relative", fontSize: 30, lineHeight: "45px", color: K.ink, marginTop: i ? 0 : 18, opacity: interpolate(f, [30 + i * 8, 38 + i * 8], [0, 1], clamp) }}>
            ({"abcd"[i]}) {o}
            {card.answer === i && (
              <svg style={{ position: "absolute", left: -24, top: -8, overflow: "visible" }} width={Math.min(640, 90 + o.length * 20)} height={62}>
                <ellipse cx={Math.min(640, 90 + o.length * 20) / 2} cy={31} rx={Math.min(640, 90 + o.length * 20) / 2} ry={28} fill="none" stroke={K.red} strokeWidth={5}
                  strokeDasharray={2000} strokeDashoffset={2000 * (1 - circleT)} strokeLinecap="round" transform={`rotate(-2 ${Math.min(640, 90 + o.length * 20) / 2} 31)`} />
              </svg>
            )}
          </div>
        ))}
      </div>
      <Tape x={330} y={-18} frame={f} delay={4} rot={-4} />
    </div>
  );
}
