/* A still diagram for a notes slide (the "Diagram card" in Skill 1), drawn from a small spec the Director writes: points,
   arrows, dimension lines, labels, a formula triangle, a fraction, boxes. Drawn by code, so every label and number is
   exactly what the spec says and sharp at any size. No animation.
   Kept identical in frontend/components/diagram-svg.tsx (the review pages show the same drawing). */

export type DObj = {
  kind: "point" | "arrow" | "line" | "label" | "brace" | "triangle" | "fraction" | "box";
  x: number; y: number; x2?: number; y2?: number; w?: number; h?: number;
  text?: string; num?: string; den?: string; size?: "s" | "m" | "l";
  color?: "ink" | "blue" | "green" | "red" | "orange"; dashed?: boolean; bend?: number;
};
export type Diagram = { objects: DObj[] };

const U = 50; // one grid unit in pixels: the grid is 12 x 9 units (600 x 450), y runs down
const COL = { ink: "#141414", blue: "#1d6fd8", green: "#1a8f4c", red: "#d63a2f", orange: "#d97a00" } as const;
const SIZE = { s: 22, m: 28, l: 38 } as const;

export function DiagramSvg({ d, font, width = 600 }: { d: Diagram; font: string; width?: number | string }) {
  const objs = d.objects ?? [];
  return (
    <svg viewBox="0 0 600 450" width={width} style={{ display: "block", background: "#fff" }} fontFamily={font}>
      <defs>
        {Object.entries(COL).map(([k, c]) => (
          <marker key={k} id={`ah-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={c} />
          </marker>
        ))}
      </defs>
      {objs.map((o, i) => <Obj key={i} o={o} />)}
    </svg>
  );
}

function Txt({ x, y, t, size = "m", color = "ink", anchor = "middle", weight = 700 }: { x: number; y: number; t: string; size?: DObj["size"]; color?: DObj["color"]; anchor?: "start" | "middle" | "end"; weight?: number }) {
  return (
    <text x={x} y={y} fontSize={SIZE[size ?? "m"]} fontWeight={weight} fill={COL[color ?? "ink"]} textAnchor={anchor} dominantBaseline="central"
      stroke="#fff" strokeWidth={6} paintOrder="stroke" strokeLinejoin="round">{t}</text>
  );
}

function Obj({ o }: { o: DObj }) {
  const c = COL[o.color ?? "ink"];
  const X = o.x * U, Y = o.y * U, X2 = (o.x2 ?? o.x) * U, Y2 = (o.y2 ?? o.y) * U;
  const dash = o.dashed ? "10 8" : undefined;
  switch (o.kind) {
    case "point":
      return (
        <g>
          <circle cx={X} cy={Y} r={9} fill={c} />
          {o.text && <Txt x={X} y={Y - 30} t={o.text} size={o.size ?? "l"} color={o.color} />}
        </g>
      );
    case "line":
      return <line x1={X} y1={Y} x2={X2} y2={Y2} stroke={c} strokeWidth={4} strokeDasharray={dash} strokeLinecap="round" />;
    case "arrow": {
      // bend: 0 = straight; + bows the arrow up (above the line A-B), - bows it down
      const mx = (X + X2) / 2, my = (Y + Y2) / 2, dx = X2 - X, dy = Y2 - Y, len = Math.hypot(dx, dy) || 1;
      const nx = dy / len, ny = -dx / len, k = (o.bend ?? 0) * len * 0.35;
      const cx = mx + nx * k * (dx >= 0 ? 1 : -1), cy = my + ny * k * (dx >= 0 ? 1 : -1);
      const lx = mx + (cx - mx) * 0.55, ly = my + (cy - my) * 0.55 + (o.bend ? 0 : -24);
      return (
        <g>
          <path d={o.bend ? `M${X} ${Y} Q${cx} ${cy} ${X2} ${Y2}` : `M${X} ${Y} L${X2} ${Y2}`} fill="none" stroke={c} strokeWidth={5}
            strokeDasharray={dash} markerEnd={`url(#ah-${o.color ?? "ink"})`} strokeLinecap="round" />
          {o.text && <Txt x={lx} y={ly + (o.bend ? (o.bend > 0 ? -18 : 18) : 0)} t={o.text} size={o.size ?? "m"} color={o.color} />}
        </g>
      );
    }
    case "brace": // a dimension line: |<--- 50 m --->| with the value under it
      return (
        <g stroke={c} strokeWidth={3}>
          <line x1={X} y1={Y} x2={X2} y2={Y2} markerStart={`url(#ah-${o.color ?? "ink"})`} markerEnd={`url(#ah-${o.color ?? "ink"})`} />
          <line x1={X} y1={Y - 14} x2={X} y2={Y + 14} />
          <line x1={X2} y1={Y2 - 14} x2={X2} y2={Y2 + 14} />
          {o.text && <g stroke="none"><Txt x={(X + X2) / 2} y={(Y + Y2) / 2 + 30} t={o.text} size={o.size ?? "m"} color={o.color} /></g>}
        </g>
      );
    case "label":
      return <Txt x={X} y={Y} t={o.text ?? ""} size={o.size} color={o.color} />;
    case "box": {
      const w = (o.w ?? 3) * U, h = (o.h ?? 1.2) * U;
      return (
        <g>
          <rect x={X - w / 2} y={Y - h / 2} width={w} height={h} rx={10} fill={o.color && o.color !== "ink" ? `${c}1a` : "#f6f1e6"} stroke={c} strokeWidth={3} />
          <Txt x={X} y={Y} t={o.text ?? ""} size={o.size} color={o.color} />
        </g>
      );
    }
    case "triangle": { // the formula triangle: top | bottom-left | bottom-right, split by a bar and a post
      const w = (o.w ?? 6) * U, h = w * 0.82, top = Y - h / 2, bot = Y + h / 2, mid = top + h * 0.56;
      const [a, b, cc] = (o.text ?? "D|S|T").split("|");
      const half = (w / 2) * ((mid - top) / h);
      return (
        <g>
          <path d={`M${X} ${top} L${X + w / 2} ${bot} L${X - w / 2} ${bot} Z`} fill="#fff7d1" stroke={c} strokeWidth={4} strokeLinejoin="round" />
          <line x1={X - half} y1={mid} x2={X + half} y2={mid} stroke={c} strokeWidth={4} />
          <line x1={X} y1={mid} x2={X} y2={bot} stroke={c} strokeWidth={4} />
          <Txt x={X} y={top + (mid - top) * 0.62} t={a ?? ""} size="l" />
          <Txt x={X - w * 0.2} y={mid + (bot - mid) / 2} t={b ?? ""} size="l" />
          <Txt x={X + w * 0.2} y={mid + (bot - mid) / 2} t={cc ?? ""} size="l" />
        </g>
      );
    }
    case "fraction": {
      const fs = SIZE[o.size ?? "l"], lead = o.text ?? "", w = Math.max((o.num ?? "").length, (o.den ?? "").length) * fs * 0.6 + 20;
      const lx = X - (lead.length * fs * 0.3) - 6;
      return (
        <g>
          {lead && <Txt x={lx} y={Y} t={lead} size={o.size ?? "l"} color={o.color} anchor="end" />}
          <Txt x={lx + 12 + w / 2} y={Y - fs * 0.7} t={o.num ?? ""} size={o.size ?? "l"} color={o.color} />
          <line x1={lx + 12} y1={Y} x2={lx + 12 + w} y2={Y} stroke={c} strokeWidth={3.5} />
          <Txt x={lx + 12 + w / 2} y={Y + fs * 0.75} t={o.den ?? ""} size={o.size ?? "l"} color={o.color} />
        </g>
      );
    }
    default:
      return null;
  }
}
