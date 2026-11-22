import { interpolate } from "remotion";

const C = { paper: "#f4f2ee", ink: "#181817", grey: "#7d7971", line: "#bfb9ad", red: "#e5301a" };
const MONO = '"Geist Mono", Menlo, monospace';
const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
type P = { frame: number; frames: number };
type Pt = [number, number];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** 0→1 over a slice of the scene, e.g. at(f, n, 0.1, 0.3). */
const at = (f: number, n: number, a: number, b: number) => interpolate(f / Math.max(n, 1), [a, b], [0, 1], clamp);

function Wire({ a, b, t, dead, dashed }: { a: Pt; b: Pt; t: number; dead?: boolean; dashed?: boolean }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={dead ? C.red : C.ink} strokeWidth={dead ? 4 : 3}
    strokeDasharray={dashed ? "8 8" : `${len}`} strokeDashoffset={dashed ? 0 : len * (1 - t)} opacity={dead ? 0.9 : 1} />;
}

function Node({ p, label, t, dead, hub }: { p: Pt; label?: string; t: number; dead?: boolean; hub?: boolean }) {
  const s = interpolate(t, [0, 1], [0.4, 1]);
  const w = hub ? 70 : 58;
  return (
    <g transform={`translate(${p[0]},${p[1]}) scale(${s})`} opacity={t}>
      <rect x={-w / 2} y={-w / 2 + 6} width={w} height={w - 12} fill={dead ? "#f3d6d0" : hub ? C.ink : C.paper} stroke={dead ? C.red : C.ink} strokeWidth={3} />
      {!hub && <rect x={-w / 2 + 8} y={-w / 2 + 14} width={w - 16} height={w - 30} fill={dead ? C.red : "#dcd8cf"} opacity={dead ? 0.35 : 1} />}
      {hub && <text textAnchor="middle" y={8} fontFamily={MONO} fontSize={16} fill={C.paper}>HUB</text>}
      {dead && <path d="M-18 -18 L18 18 M18 -18 L-18 18" stroke={C.red} strokeWidth={5} />}
      {label && <text textAnchor="middle" y={w / 2 + 22} fontFamily={MONO} fontSize={15} letterSpacing={1.5} fill={C.grey}>{label}</text>}
    </g>
  );
}

/** A paper-bird packet travelling along a path of points, looping. */
function Packet({ path, f, speed = 60, offset = 0, hidden }: { path: Pt[]; f: number; speed?: number; offset?: number; hidden?: boolean }) {
  if (hidden || path.length < 2) return null;
  const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let d = (((f + offset) * speed) / 10) % total;
  let i = 0;
  while (i < segs.length - 1 && d > segs[i]) d -= segs[i++];
  const k = d / segs[i];
  const x = path[i][0] + (path[i + 1][0] - path[i][0]) * k;
  const y = path[i][1] + (path[i + 1][1] - path[i][1]) * k;
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-14 0 L0 -9 L14 0 L0 5 Z" fill={C.red} stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
}

function Title({ children, sub }: { children: string; sub?: string }) {
  return (
    <g>
      <text x={40} y={52} fontFamily={MONO} fontSize={17} letterSpacing={3} fill={C.red}>{children.toUpperCase()}</text>
      {sub && <text x={40} y={86} fontFamily={SANS} fontSize={24} fill={C.ink}>{sub}</text>}
    </g>
  );
}

function Note({ y, text, t, red }: { y: number; text: string; t: number; red?: boolean }) {
  return <text x={40} y={y} fontFamily={SANS} fontSize={22} fill={red ? C.red : C.ink} opacity={t}>{text}</text>;
}

const ring = (n: number, cx: number, cy: number, r: number): Pt[] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2), cy + r * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2)]);

function Network({ frame: f, frames: n }: P) {
  const pts: Pt[] = [[160, 240], [400, 170], [640, 240], [260, 400], [540, 400]];
  const links: [number, number][] = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 2], [1, 4]];
  return (
    <>
      <Title sub="Autonomous computers + links, sharing data">What is a network</Title>
      {links.map(([a, b], i) => <Wire key={i} a={pts[a]} b={pts[b]} t={at(f, n, 0.12 + i * 0.04, 0.3 + i * 0.04)} />)}
      {pts.map((p, i) => <Node key={i} p={p} t={at(f, n, 0.02 + i * 0.03, 0.12 + i * 0.03)} label={`PC${i + 1}`} />)}
      {f / n > 0.45 && <Packet path={[pts[0], pts[1], pts[4], pts[2]]} f={f} />}
      <Note y={520} t={at(f, n, 0.5, 0.6)} text="Each machine has its own CPU and memory: autonomous." />
    </>
  );
}

function Protocol({ frame: f, frames: n }: P) {
  const a: Pt = [170, 280], b: Pt = [630, 280];
  const steps = ["HELLO?", "HELLO! READY", "DATA ▸", "◂ ACK"];
  return (
    <>
      <Title sub="An agreement on how to talk: format, order, meaning">Protocol</Title>
      <Wire a={a} b={b} t={at(f, n, 0.05, 0.2)} />
      <Node p={a} t={at(f, n, 0, 0.1)} label="SENDER" />
      <Node p={b} t={at(f, n, 0, 0.1)} label="RECEIVER" />
      {steps.map((s, i) => {
        const t = at(f, n, 0.2 + i * 0.15, 0.3 + i * 0.15);
        const right = i % 2 === 0;
        return <text key={i} x={right ? 250 + t * 150 : 550 - t * 150} y={200 + i * 44} fontFamily={MONO} fontSize={20} fill={i === 3 ? C.red : C.ink} opacity={t}>{s}</text>;
      })}
      <Note y={500} t={at(f, n, 0.8, 0.9)} text="Same rules on both sides, or no communication." />
    </>
  );
}

function TopologyMeaning({ frame: f, frames: n }: P) {
  const opts = ["Star", "Ring", "Disk", "Mesh"];
  return (
    <>
      <Title sub="Topology = the LAYOUT of devices and links">Topology</Title>
      {opts.map((o, i) => {
        const t = at(f, n, 0.1 + i * 0.08, 0.2 + i * 0.08);
        const cross = o === "Disk" ? at(f, n, 0.6, 0.7) : 0;
        return (
          <g key={o} opacity={t}>
            <rect x={60 + i * 175} y={180} width={150} height={90} fill={C.paper} stroke={o === "Disk" && cross ? C.red : C.ink} strokeWidth={3} />
            <text x={135 + i * 175} y={235} textAnchor="middle" fontFamily={SANS} fontSize={30} fill={C.ink}>{o}</text>
            {o === "Disk" && <path d={`M${70 + i * 175} 190 L${200 + i * 175} 260 M${200 + i * 175} 190 L${70 + i * 175} 260`} stroke={C.red} strokeWidth={6}
              strokeDasharray="200" strokeDashoffset={200 * (1 - cross)} />}
          </g>
        );
      })}
      <Note y={340} t={at(f, n, 0.62, 0.72)} red text="Disk is storage hardware, not a layout." />
      <Note y={400} t={at(f, n, 0.75, 0.85)} text="Layout, not capacity: bandwidth is a different idea." />
    </>
  );
}

function Bus({ frame: f, frames: n, fail }: P & { fail?: boolean }) {
  const xs = [140, 270, 400, 530, 660];
  const snap = fail ? at(f, n, 0.5, 0.56) : 0;
  const dead = snap > 0.5;
  return (
    <>
      <Title sub={fail ? "One break in the backbone = whole network down" : "One shared backbone cable"}>{fail ? "Bus topology · failure" : "Bus topology"}</Title>
      <Wire a={[70, 300]} b={[fail ? 400 - 20 * snap : 730, 300]} t={at(f, n, 0.05, 0.25)} dead={dead} />
      {fail && <Wire a={[400 + 20 * snap, 300]} b={[730, 300]} t={at(f, n, 0.05, 0.25)} dead={dead} />}
      <rect x={52} y={284} width={18} height={32} fill={C.red} opacity={at(f, n, 0.25, 0.3)} />
      <rect x={730} y={284} width={18} height={32} fill={C.red} opacity={at(f, n, 0.25, 0.3)} />
      <text x={30} y={350} fontFamily={MONO} fontSize={14} fill={C.red} opacity={at(f, n, 0.28, 0.34)}>TERMINATOR</text>
      <text x={650} y={350} fontFamily={MONO} fontSize={14} fill={C.red} opacity={at(f, n, 0.28, 0.34)}>TERMINATOR</text>
      {xs.map((x, i) => (
        <g key={i}>
          <Wire a={[x, 300]} b={[x, i % 2 ? 420 : 180]} t={at(f, n, 0.2 + i * 0.03, 0.3 + i * 0.03)} dead={dead} />
          <circle cx={x} cy={300} r={7} fill={C.ink} opacity={at(f, n, 0.3, 0.35)} />
          <Node p={[x, i % 2 ? 450 : 150]} t={at(f, n, 0.15 + i * 0.03, 0.25 + i * 0.03)} dead={dead} />
        </g>
      ))}
      <text x={410} y={285} fontFamily={MONO} fontSize={14} fill={C.grey} opacity={at(f, n, 0.3, 0.36) * (dead ? 0 : 1)}>BACKBONE</text>
      <text x={150} y={330} fontFamily={MONO} fontSize={13} fill={C.grey} opacity={at(f, n, 0.34, 0.4)}>TAP ▸ DROP LINE</text>
      <Packet path={[[70, 300], [730, 300]]} f={f} hidden={dead || f / n < 0.35} />
      {dead && <text x={330} y={530} fontFamily={SANS} fontSize={24} fill={C.red}>Backbone cut → every PC offline</text>}
    </>
  );
}

function Ring({ frame: f, frames: n, fail }: P & { fail?: boolean }) {
  const pts = ring(6, 400, 300, 170);
  const dead = fail && f / n > 0.5;
  return (
    <>
      <Title sub={fail ? "One device or link fails = the loop breaks" : "Closed loop, data travels one way with a token"}>{fail ? "Ring topology · failure" : "Ring topology"}</Title>
      {pts.map((p, i) => <Wire key={i} a={p} b={pts[(i + 1) % pts.length]} t={at(f, n, 0.1 + i * 0.04, 0.25 + i * 0.04)} dead={dead && (i === 1 || i === 2)} />)}
      {pts.map((p, i) => <Node key={i} p={p} t={at(f, n, 0.02 + i * 0.03, 0.12 + i * 0.03)} dead={dead && i === 2} />)}
      <Packet path={[...pts, pts[0]]} f={f} speed={45} hidden={dead || f / n < 0.35} />
      {dead && <text x={250} y={540} fontFamily={SANS} fontSize={24} fill={C.red}>One teller PC down → token stops</text>}
    </>
  );
}

function Star({ frame: f, frames: n, fail }: P & { fail?: boolean }) {
  const hub: Pt = [400, 310];
  const pts = ring(6, 400, 310, 200);
  const hubDead = fail && f / n > 0.62;
  const cut = fail && f / n > 0.35 ? 4 : -1;
  return (
    <>
      <Title sub={fail ? "Cable cut: 1 PC lost · Hub dies: everyone lost" : "Every device has its own cable to a central hub/switch"}>{fail ? "Star topology · failure" : "Star topology"}</Title>
      {pts.map((p, i) => <Wire key={i} a={hub} b={p} t={at(f, n, 0.1 + i * 0.04, 0.25 + i * 0.04)} dead={hubDead || i === cut} />)}
      <Node p={hub} hub t={at(f, n, 0, 0.1)} dead={hubDead} />
      {pts.map((p, i) => <Node key={i} p={p} t={at(f, n, 0.05 + i * 0.03, 0.15 + i * 0.03)} dead={hubDead || i === cut} />)}
      <Packet path={[pts[0], hub, pts[3]]} f={f} hidden={hubDead || f / n < 0.3} />
      {!fail && <text x={40} y={545} fontFamily={SANS} fontSize={22} fill={C.ink} opacity={at(f, n, 0.5, 0.6)}>Each device needs just 1 port. Easy to add, easy to fault-find.</text>}
    </>
  );
}

function Mesh({ frame: f, frames: n }: P) {
  const k = 5;
  const pts = ring(k, 400, 300, 180);
  const pairs: [number, number][] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) pairs.push([i, j]);
  const drawn = Math.round(at(f, n, 0.15, 0.55) * pairs.length);
  return (
    <>
      <Title sub="Every device wired to every other device">Mesh topology</Title>
      {pairs.map(([a, b], i) => <Wire key={i} a={pts[a]} b={pts[b]} t={i < drawn ? 1 : 0} />)}
      {pts.map((p, i) => <Node key={i} p={p} t={at(f, n, 0.02 + i * 0.03, 0.12 + i * 0.03)} />)}
      <text x={600} y={130} fontFamily={MONO} fontSize={22} fill={C.ink}>cables {drawn}</text>
      <Note y={500} t={at(f, n, 0.6, 0.7)} text="Cables = n(n−1)/2 = 5×4/2 = 10" />
      <Note y={538} t={at(f, n, 0.72, 0.82)} red text="Ports per device = n − 1 = 4" />
    </>
  );
}

function Tree({ frame: f, frames: n }: P) {
  const root: Pt = [400, 150];
  const mids: Pt[] = [[220, 290], [580, 290]];
  const leaves: Pt[] = [[130, 440], [310, 440], [490, 440], [670, 440]];
  return (
    <>
      <Title sub="Stars connected in a hierarchy">Tree topology</Title>
      {mids.map((m, i) => <Wire key={i} a={root} b={m} t={at(f, n, 0.15, 0.3)} />)}
      {leaves.map((l, i) => <Wire key={i} a={mids[i < 2 ? 0 : 1]} b={l} t={at(f, n, 0.3, 0.45)} />)}
      <Node p={root} hub t={at(f, n, 0, 0.1)} />
      {mids.map((m, i) => <Node key={i} p={m} hub t={at(f, n, 0.1, 0.2)} />)}
      {leaves.map((l, i) => <Node key={i} p={l} t={at(f, n, 0.25, 0.35)} />)}
      <Packet path={[leaves[0], mids[0], root, mids[1], leaves[3]]} f={f} hidden={f / n < 0.45} />
    </>
  );
}

function Hybrid({ frame: f, frames: n }: P) {
  const hubA: Pt = [230, 300], hubB: Pt = [570, 300];
  const a = ring(4, 230, 300, 120), b = ring(4, 570, 300, 120);
  return (
    <>
      <Title sub="Two or more topologies combined">Hybrid topology</Title>
      <Wire a={hubA} b={hubB} t={at(f, n, 0.3, 0.45)} />
      {a.map((p, i) => <Wire key={`a${i}`} a={hubA} b={p} t={at(f, n, 0.1, 0.25)} />)}
      {b.map((p, i) => <Wire key={`b${i}`} a={p} b={b[(i + 1) % 4]} t={at(f, n, 0.15, 0.3)} />)}
      <Node p={hubA} hub t={at(f, n, 0, 0.1)} />
      {[...a, ...b].map((p, i) => <Node key={i} p={p} t={at(f, n, 0.05, 0.15)} />)}
      <Note y={520} t={at(f, n, 0.5, 0.6)} text="Star on the left + ring on the right = hybrid" />
    </>
  );
}

function Recap({ frame: f, frames: n }: P) {
  const rows = [["Bus", "1 backbone · cheap · backbone cut = all down"], ["Ring", "loop + token · one break = all down"],
    ["Star", "1 port per device · hub down = all down"], ["Mesh", "n(n−1)/2 cables · n−1 ports · most reliable"]];
  return (
    <>
      <Title sub="What the exam asks">Recap</Title>
      {rows.map(([k, v], i) => (
        <g key={k} opacity={at(f, n, 0.1 + i * 0.12, 0.2 + i * 0.12)}>
          <line x1={40} x2={760} y1={150 + i * 95} y2={150 + i * 95} stroke={C.line} strokeWidth={2} />
          <text x={40} y={200 + i * 95} fontFamily={SANS} fontSize={34} fill={C.ink}>{k}</text>
          <text x={200} y={200 + i * 95} fontFamily={SANS} fontSize={22} fill={C.grey}>{v}</text>
        </g>
      ))}
    </>
  );
}

export function Diagram({ kind, frame, frames }: { kind: string; frame: number; frames: number }) {
  const p = { frame, frames };
  const body = {
    network: <Network {...p} />, protocol: <Protocol {...p} />, topology_meaning: <TopologyMeaning {...p} />,
    bus: <Bus {...p} />, bus_failure: <Bus {...p} fail />, ring: <Ring {...p} />, ring_failure: <Ring {...p} fail />,
    star: <Star {...p} />, star_failure: <Star {...p} fail />, mesh: <Mesh {...p} />, tree: <Tree {...p} />,
    hybrid: <Hybrid {...p} />, recap: <Recap {...p} />,
  }[kind];
  return <svg viewBox="0 0 800 560" width="100%" height="100%">{body}</svg>;
}
