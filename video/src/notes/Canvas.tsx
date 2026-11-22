import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMukta } from "@remotion/google-fonts/Mukta";
import { AbsoluteFill, interpolate } from "remotion";

/* The explain phase of an exam notes scene: a 3Blue1Brown-style animation drawn from a small program the visual director
   writes (video/notes.py): objects on a 16 x 9 grid (x 0..16 left to right, y 0..9 bottom to top) and timed steps, each
   tied to a spoken line. Strokes draw themselves, text writes on, things move with smooth easing. Text is never blurred. */

const { fontFamily: INTER } = loadInter("normal", { weights: ["500", "700"], subsets: ["latin"], ignoreTooManyRequestsWarning: true });
const { fontFamily: MUKTA } = loadMukta("normal", { weights: ["500", "700"], subsets: ["devanagari", "latin"] });
const FONT = `${INTER}, ${MUKTA}, sans-serif`;

export const BG = "#0e0e0e";
const COLORS: Record<string, string> = {
  blue: "#58C4DD", yellow: "#FFFF00", green: "#83C167", red: "#FC6255", teal: "#5CD0B3", white: "#ECECEC", grey: "#888888", orange: "#FF862F",
};
const U = 120; // pixels per grid unit (16 x 9 units = 1920 x 1080)
const X = (x: number) => x * U;
const Y = (y: number) => 1080 - y * U;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)); // manim's "smooth"

export type VObj = {
  id: string; kind: "dot" | "ball" | "box" | "line" | "arrow" | "path" | "circle" | "label" | "brace" | "fraction" | "triangle" | "axis";
  x?: number; y?: number; x2?: number; y2?: number; r?: number; w?: number; h?: number; points?: number[][];
  text?: string; num?: string; den?: string; color?: string; size?: number; dashed?: boolean; fill?: boolean;
};
export type VStep = {
  do: "create" | "write" | "fade_out" | "move" | "along" | "grow" | "count" | "indicate" | "rotate";
  ids: string[]; start: number; secs: number;  // start: frame the step begins (computed from its line by the engine)
  x?: number; y?: number; path?: string; from_v?: number; to_v?: number; prefix?: string; suffix?: string; turns?: number; decimals?: number;
};
export type Visual = { objects: VObj[]; steps: VStep[] };

type State = { shown: number; dx: number; dy: number; rot: number; pulse: number; text?: string; draw: number };

/** Where every object is at frame f: steps applied in time order. */
function stateAt(v: Visual, f: number, fps: number): Record<string, State> {
  const st: Record<string, State> = {};
  const created = new Set(v.steps.filter((s) => s.do === "create" || s.do === "write" || s.do === "grow").flatMap((s) => s.ids));
  for (const o of v.objects) st[o.id] = { shown: created.has(o.id) ? 0 : interpolate(f, [0, 12], [0, 1], clamp), dx: 0, dy: 0, rot: 0, pulse: 0, draw: created.has(o.id) ? 0 : 1 };
  const byId = Object.fromEntries(v.objects.map((o) => [o.id, o]));
  for (const s of [...v.steps].sort((a, b) => a.start - b.start)) {
    const len = Math.max(1, Math.round((s.secs || 1) * fps));
    const p = smooth((f - s.start) / len);
    if (f < s.start) continue;
    for (const id of s.ids) {
      const o = byId[id];
      const S = st[id];
      if (!o || !S) continue;
      if (s.do === "create" || s.do === "write" || s.do === "grow") { S.shown = Math.max(S.shown, Math.min(1, p * 2.5)); S.draw = p; }
      else if (s.do === "fade_out") S.shown = Math.min(S.shown, 1 - p);
      else if (s.do === "move") {
        const bx = (o.x ?? 0) + S.dx, by = (o.y ?? 0) + S.dy;
        S.dx += ((s.x ?? bx) - bx) * p; S.dy += ((s.y ?? by) - by) * p;
      } else if (s.do === "along") {
        const pathObj = s.path ? byId[s.path] : undefined;
        if (pathObj) { const [px, py] = pointAlong(pathObj, p * (s.turns || 1)); S.dx = px - (o.x ?? 0); S.dy = py - (o.y ?? 0); }
      } else if (s.do === "rotate") S.rot += 360 * (s.turns || 1) * p;
      else if (s.do === "indicate") S.pulse = Math.sin(Math.min(1, (f - s.start) / len) * Math.PI);
      else if (s.do === "count") {
        const val = (s.from_v ?? 0) + ((s.to_v ?? 0) - (s.from_v ?? 0)) * p;
        S.text = `${s.prefix ?? ""}${val.toFixed(s.decimals ?? 0)}${s.suffix ?? ""}`;
      }
    }
  }
  return st;
}

/** A point at fraction t along a path or circle (t may exceed 1 for circles: more turns). */
function pointAlong(o: VObj, t: number): [number, number] {
  if (o.kind === "circle") {
    const a = Math.PI / 2 - 2 * Math.PI * t; // start at the top, go clockwise
    return [(o.x ?? 0) + (o.r ?? 1) * Math.cos(a), (o.y ?? 0) + (o.r ?? 1) * Math.sin(a)];
  }
  const pts = o.kind === "path" ? o.points ?? [] : [[o.x ?? 0, o.y ?? 0], [o.x2 ?? 0, o.y2 ?? 0]];
  if (pts.length < 2) return [pts[0]?.[0] ?? 0, pts[0]?.[1] ?? 0];
  const segs = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let d = Math.min(1, Math.max(0, t)) * segs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? Math.min(1, d / segs[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    d -= segs[i];
  }
  return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
}

const polyLen = (pts: number[][]) => pts.slice(1).reduce((n, q, i) => n + Math.hypot(X(q[0]) - X(pts[i][0]), Y(q[1]) - Y(pts[i][1])), 0);

function Text({ x, y, text, size, color, shown, draw, anchor = "middle" }: { x: number; y: number; text: string; size: number; color: string; shown: number; draw: number; anchor?: "middle" | "start" }) {
  // "write": the text is revealed left to right by a clip that moves; the glyphs themselves never move or scale
  const px = size * U;
  const w = Math.max(40, text.length * px * 0.62);
  const left = anchor === "middle" ? X(x) - w / 2 : X(x);
  const id = `c${Math.round(x * 100)}_${Math.round(y * 100)}_${text.length}`;
  return (
    <g opacity={shown}>
      <clipPath id={id}><rect x={left - 20} y={Y(y) - px} width={(w + 40) * Math.min(1, draw * 1.2)} height={px * 2} /></clipPath>
      <text x={X(x)} y={Y(y)} fill={color} fontFamily={FONT} fontWeight={600} fontSize={px} textAnchor={anchor} dominantBaseline="middle" clipPath={`url(#${id})`}>{text}</text>
    </g>
  );
}

function Obj({ o, s }: { o: VObj; s: State }) {
  const c = COLORS[o.color ?? "white"] ?? COLORS.white;
  const sw = 6;
  const glow = s.pulse ? COLORS.yellow : c;
  const scale = 1 + 0.18 * s.pulse;
  const cx = X((o.x ?? 0) + s.dx), cy = Y((o.y ?? 0) + s.dy);
  const tf = `translate(${cx} ${cy}) rotate(${s.rot}) scale(${scale}) translate(${-cx} ${-cy})`;
  const dash = (len: number) => ({ strokeDasharray: o.dashed ? "18 14" : `${len} ${len}`, strokeDashoffset: o.dashed ? 0 : len * (1 - s.draw) });
  switch (o.kind) {
    case "dot":
    case "ball": {
      const r = (o.r ?? (o.kind === "dot" ? 0.1 : 0.4)) * U * Math.min(1, s.draw * 1.4 || s.shown);
      // a ball rolls: it turns by the distance it has travelled along the ground (clockwise when moving right)
      const roll = o.kind === "ball" && r > 0 ? ((s.dx * U) / r) * (180 / Math.PI) : 0;
      const tfr = `translate(${cx} ${cy}) rotate(${s.rot + roll}) scale(${scale}) translate(${-cx} ${-cy})`;
      return <g opacity={s.shown} transform={tfr}><circle cx={cx} cy={cy} r={r} fill={o.kind === "ball" ? c : glow} stroke={o.kind === "ball" ? "#fff" : "none"} strokeWidth={o.kind === "ball" ? 3 : 0} />
        {o.kind === "ball" && <line x1={cx} y1={cy} x2={cx} y2={cy - r} stroke={BG} strokeWidth={4} />}</g>;
    }
    case "box": {
      const w = (o.w ?? 1.6) * U, h = (o.h ?? 0.9) * U;
      return <g opacity={s.shown} transform={tf}><rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={10} fill={c} fillOpacity={0.25 * Math.min(1, s.draw * 2)} stroke={glow} strokeWidth={sw} {...dash(2 * (w + h))} />
        {o.text && <Text x={(o.x ?? 0) + s.dx} y={(o.y ?? 0) + s.dy} text={o.text} size={o.size ?? 0.32} color="#fff" shown={1} draw={s.draw} />}</g>;
    }
    case "line":
    case "arrow": {
      const x1 = X((o.x ?? 0) + s.dx), y1 = Y((o.y ?? 0) + s.dy), x2 = X((o.x2 ?? 0) + s.dx), y2 = Y((o.y2 ?? 0) + s.dy);
      const L = Math.hypot(x2 - x1, y2 - y1);
      const k = o.kind === "arrow" ? s.draw : 1; // arrows grow from the tail; lines draw on
      const ex = x1 + (x2 - x1) * k, ey = y1 + (y2 - y1) * k;
      const a = Math.atan2(ey - y1, ex - x1), hl = 30;
      return (
        <g opacity={s.shown} transform={tf}>
          <line x1={x1} y1={y1} x2={o.kind === "arrow" ? ex - Math.cos(a) * 18 : x2} y2={o.kind === "arrow" ? ey - Math.sin(a) * 18 : y2} stroke={glow} strokeWidth={sw} strokeLinecap="round"
                {...(o.kind === "line" ? dash(L) : { strokeDasharray: o.dashed ? "18 14" : undefined })} />
          {o.kind === "arrow" && L * k > 8 && <polygon points={`${ex},${ey} ${ex - hl * Math.cos(a - 0.4)},${ey - hl * Math.sin(a - 0.4)} ${ex - hl * Math.cos(a + 0.4)},${ey - hl * Math.sin(a + 0.4)}`} fill={glow} />}
          {o.text && <Text x={((o.x ?? 0) + (o.x2 ?? 0)) / 2 + s.dx} y={((o.y ?? 0) + (o.y2 ?? 0)) / 2 + s.dy + 0.45} text={o.text} size={o.size ?? 0.34} color={c} shown={1} draw={s.draw} />}
        </g>
      );
    }
    case "path": {
      const pts = o.points ?? [];
      const L = polyLen(pts);
      return <g opacity={s.shown}><polyline points={pts.map((q) => `${X(q[0])},${Y(q[1])}`).join(" ")} fill="none" stroke={glow} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" {...dash(L)} />
        {o.text && pts.length > 0 && <Text x={pts[Math.floor(pts.length / 2)][0]} y={pts[Math.floor(pts.length / 2)][1] + 0.45} text={o.text} size={o.size ?? 0.34} color={c} shown={1} draw={s.draw} />}</g>;
    }
    case "circle": {
      const r = (o.r ?? 1) * U, L = 2 * Math.PI * r;
      return <g opacity={s.shown} transform={tf}><circle cx={cx} cy={cy} r={r} fill="none" stroke={glow} strokeWidth={sw} {...dash(L)} transform={`rotate(-90 ${cx} ${cy})`} /></g>;
    }
    case "label":
      return <g transform={tf}><Text x={(o.x ?? 0) + s.dx} y={(o.y ?? 0) + s.dy} text={s.text ?? o.text ?? ""} size={o.size ?? 0.42} color={glow} shown={s.shown} draw={s.draw} /></g>;
    case "brace": {
      // a measurement bar between two points, |<- text ->|, drawn outward from the middle
      const x1 = X(o.x ?? 0), y1 = Y(o.y ?? 0), x2 = X(o.x2 ?? 0), y2 = Y(o.y2 ?? 0);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, k = s.draw;
      const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * 18, ny = Math.cos(a) * 18;
      const ax = mx + (x1 - mx) * k, ay = my + (y1 - my) * k, bx = mx + (x2 - mx) * k, by = my + (y2 - my) * k;
      return (
        <g opacity={s.shown}>
          <line x1={ax} y1={ay} x2={bx} y2={by} stroke={c} strokeWidth={4} />
          <line x1={ax - nx} y1={ay - ny} x2={ax + nx} y2={ay + ny} stroke={c} strokeWidth={4} />
          <line x1={bx - nx} y1={by - ny} x2={bx + nx} y2={by + ny} stroke={c} strokeWidth={4} />
          {o.text && <Text x={((o.x ?? 0) + (o.x2 ?? 0)) / 2} y={((o.y ?? 0) + (o.y2 ?? 0)) / 2 - 0.42} text={o.text} size={o.size ?? 0.36} color={c} shown={1} draw={s.draw} />}
        </g>
      );
    }
    case "fraction": {
      // lhs = num / den, written on
      const px = (o.size ?? 0.6) * U, x = X(o.x ?? 0), y = Y(o.y ?? 0);
      const lhs = o.text ?? "";
      const lw = lhs ? (lhs.length * px * 0.6 + 30) : 0;
      const fw = Math.max((o.num ?? "").length, (o.den ?? "").length) * px * 0.62 + 40;
      const left = x - (lw + fw) / 2;
      return (
        <g opacity={s.shown}>
          {lhs && <text x={left} y={y} fill={c} fontFamily={FONT} fontWeight={600} fontSize={px} dominantBaseline="middle">{lhs}</text>}
          <text x={left + lw + fw / 2} y={y - px * 0.62} fill={c} fontFamily={FONT} fontWeight={600} fontSize={px} textAnchor="middle" dominantBaseline="middle" opacity={interpolate(s.draw, [0.2, 0.5], [0, 1], clamp)}>{o.num}</text>
          <line x1={left + lw} y1={y} x2={left + lw + fw * interpolate(s.draw, [0, 0.4], [0, 1], clamp)} y2={y} stroke={c} strokeWidth={5} />
          <text x={left + lw + fw / 2} y={y + px * 0.68} fill={c} fontFamily={FONT} fontWeight={600} fontSize={px} textAnchor="middle" dominantBaseline="middle" opacity={interpolate(s.draw, [0.5, 0.8], [0, 1], clamp)}>{o.den}</text>
        </g>
      );
    }
    case "triangle": {
      // the formula triangle: top | bottom-left | bottom-right, with the dividing lines (D over S x T)
      const [top, bl, br] = (o.text ?? "D|S|T").split("|");
      const R = (o.r ?? 1.6) * U, x = X(o.x ?? 0), y = Y(o.y ?? 0);
      const p1 = [x, y - R], p2 = [x - R * 0.95, y + R * 0.6], p3 = [x + R * 0.95, y + R * 0.6];
      const L = 3 * Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const fs = R * 0.36;
      return (
        <g opacity={s.shown}>
          <polygon points={`${p1} ${p2} ${p3}`} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" {...dash(L)} />
          <line x1={x - R * 0.55} y1={y} x2={x + R * 0.55} y2={y} stroke={c} strokeWidth={4} opacity={interpolate(s.draw, [0.5, 0.7], [0, 1], clamp)} />
          <line x1={x} y1={y} x2={x} y2={y + R * 0.6} stroke={c} strokeWidth={4} opacity={interpolate(s.draw, [0.6, 0.8], [0, 1], clamp)} />
          {[[top, x, y - R * 0.38], [bl, x - R * 0.42, y + R * 0.33], [br, x + R * 0.42, y + R * 0.33]].map(([t, tx, ty], i) => (
            <text key={i} x={tx as number} y={ty as number} fill={i ? COLORS.white : COLORS.yellow} fontFamily={FONT} fontWeight={700} fontSize={fs} textAnchor="middle" dominantBaseline="middle"
                  opacity={interpolate(s.draw, [0.6 + i * 0.1, 0.8 + i * 0.1], [0, 1], clamp)}>{t}</text>
          ))}
        </g>
      );
    }
    case "axis": {
      const x1 = X(o.x ?? 1), x2 = X(o.x2 ?? 15), y = Y(o.y ?? 1);
      const n = Math.max(1, Math.round((o.x2 ?? 15) - (o.x ?? 1)));
      const labels = (o.text ?? "").split(",").map((t) => t.trim());
      return (
        <g opacity={s.shown}>
          <line x1={x1} y1={y} x2={x1 + (x2 - x1) * s.draw} y2={y} stroke={COLORS.grey} strokeWidth={4} />
          {Array.from({ length: n + 1 }).map((_, i) => (
            <g key={i} opacity={interpolate(s.draw, [i / (n + 1), (i + 1) / (n + 1)], [0, 1], clamp)}>
              <line x1={x1 + ((x2 - x1) * i) / n} y1={y - 12} x2={x1 + ((x2 - x1) * i) / n} y2={y + 12} stroke={COLORS.grey} strokeWidth={4} />
              {labels[i] && <text x={x1 + ((x2 - x1) * i) / n} y={y + 46} fill={COLORS.grey} fontFamily={FONT} fontSize={30} textAnchor="middle">{labels[i]}</text>}
            </g>
          ))}
        </g>
      );
    }
  }
  return null;
}

/** The explain phase: the program at frame f, with a caption-free 3b1b canvas. */
export function Canvas({ v, f, fps }: { v: Visual; f: number; fps: number }) {
  const st = stateAt(v, f, fps);
  // paint order: lines and shapes first, moving things above them, text on top
  const order = { axis: 0, path: 1, circle: 1, line: 2, brace: 2, triangle: 2, box: 3, arrow: 4, dot: 5, ball: 5, fraction: 6, label: 6 } as Record<string, number>;
  const objs = [...v.objects].sort((a, b) => (order[a.kind] ?? 3) - (order[b.kind] ?? 3));
  return (
    <AbsoluteFill style={{ background: BG }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {objs.map((o) => <Obj key={o.id} o={o} s={st[o.id]} />)}
      </svg>
    </AbsoluteFill>
  );
}
