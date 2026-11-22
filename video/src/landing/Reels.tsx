/** The Supercharge cards' reels (designed at 720x1080, rendered at 1080x1620, 60 fps, 5 s each), in the website's
 *  theme: the page's light lime wash or the Platform section's dark green, white cards, benefit pills, SVG icons and
 *  no emoji. The landing page lays the card's title over the bottom quarter, so the action stays in the top 3/4. */
import { BarChart3, Captions as CaptionsIcon, Check, Crown, Eye, Film, Image as ImageIcon, Landmark, ListChecks, MapPin, Network, PenLine, Scissors, Smartphone, TrendingUp, Wand2, Workflow } from "lucide-react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { BACK, C, FONT, IO, PlatformBg, WashBg, card, clamp, e, mix, pill, useBeat } from "./common";

export const REEL_BEATS = 150;
export const REEL_FRAMES = REEL_BEATS * 2;
export type ReelKind = "script" | "plan" | "captions" | "cleancut" | "storyboard" | "shorts" | "exam" | "thumbs" | "analytics";

const Tag = ({ t, icon: I, children, dark }: { t: number; icon: typeof PenLine; children: React.ReactNode; dark?: boolean }) => (
  <div style={{ position: "absolute", left: 40, top: 40, opacity: e(t, 0, 10), display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: dark ? "rgba(255,255,255,0.1)" : "#fff", border: dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.08)", color: dark ? "#fff" : C.ink, fontSize: 24, fontWeight: 600, boxShadow: dark ? "none" : "0 10px 24px -14px rgba(0,0,0,0.3)" }}>
    <I size={22} color={dark ? C.lime : C.limeDeep} />{children}
  </div>
);

function Script({ t }: { t: number }) {
  const lines: [string, boolean][] = [["₹1 bhejne mein 3 second.", false], ["Peeche kya hota hai?", true], ["Chalo, raasta dekhte hain.", false]];
  const tags: [typeof PenLine, string, string, number, number][] = [[Workflow, "Flowchart", "#d9f99d", 80, 640], [Film, "B-roll", "#fde68a", 360, 700], [MapPin, "Map", "#dbeafe", 150, 760]];
  return (
    <>
      <WashBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={PenLine}>Script writer</Tag>
      <div style={{ position: "absolute", left: 60, right: 60, top: 140, ...card(28), border: "3px solid #2b2b2b", padding: "36px 36px 40px", transform: `translateY(${(1 - e(t, 0, 18, BACK)) * 50}px)` }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.limeDeep, letterSpacing: 2 }}>HOOK · SCENE 1</div>
        <div style={{ fontSize: 46, fontWeight: 800, color: C.ink, marginTop: 8 }}>How does UPI work?</div>
        {lines.map(([s, hl], i) => {
          const p = e(t, 16 + i * 14, 14);
          const sweep = e(t, 26 + i * 14, 12);
          return <div key={s} style={{ marginTop: 22, fontSize: 32, fontWeight: 500, color: "#2b2b28", opacity: p, transform: `translateX(${(1 - p) * -16}px)` }}>
            <span style={hl ? { backgroundImage: `linear-gradient(${C.yellow}, ${C.yellow})`, backgroundSize: `${sweep * 100}% 72%`, backgroundRepeat: "no-repeat", backgroundPosition: "0 85%", fontWeight: 700 } : {}}>{s}</span>
          </div>;
        })}
      </div>
      {tags.map(([I, l, bg, x, y], i) => {
        const p = e(t, 72 + i * 10, 14, BACK);
        return <div key={l} style={{ position: "absolute", left: x, top: y, transform: `scale(${p}) rotate(${(i - 1) * 5}deg)`, ...pill(bg), padding: "12px 22px", fontSize: 26, fontWeight: 700, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 14px 26px -12px rgba(0,0,0,0.35)" }}><I size={24} />{l}</div>;
      })}
    </>
  );
}

const NodeBox = ({ icon: I, label, bg, p, x, y }: { icon: typeof PenLine; label: string; bg: string; p: number; x: number; y: number }) => (
  <div style={{ position: "absolute", left: x - 130, top: y - 50, width: 260, height: 100, borderRadius: 24, background: bg, display: "flex", alignItems: "center", gap: 14, padding: "0 22px", transform: `scale(${p})`, opacity: p, boxShadow: "0 22px 36px -16px rgba(0,0,0,0.55)" }}>
    <span style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(255,255,255,0.7)", display: "grid", placeItems: "center" }}><I size={28} color={C.ink} /></span>
    <span style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{label}</span>
  </div>
);

function Plan({ t }: { t: number }) {
  const pts = [[360, 360], [360, 560], [360, 760]] as const;
  const packet = ((t - 70) % 50) / 50;
  return (
    <>
      <PlatformBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={Wand2} dark>Visual planner</Tag>
      <div style={{ position: "absolute", left: 50, right: 50, top: 130, ...card(20), padding: "20px 24px", fontSize: 27, fontWeight: 600, color: C.ink, transform: `scale(${e(t, 0, 16, BACK)})` }}>
        “Paisa seedha bank tak jaata hai.” <span style={{ color: C.limeDeep }}>→ flowchart</span>
      </div>
      {[0, 1].map((k) => {
        const p = e(t, 46 + k * 12, 14, IO);
        const [, y1] = pts[k], [, y2] = pts[k + 1];
        return <div key={k} style={{ position: "absolute", left: 357, top: y1 + 50, width: 6, height: (y2 - y1 - 100) * p, borderRadius: 3, background: C.lime, boxShadow: `0 0 12px ${C.lime}` }}>
          {t > 70 && <div style={{ position: "absolute", left: -15, top: `${(k ? Math.max(0, packet * 2 - 1) : Math.min(1, packet * 2)) * 100}%`, width: 36, height: 36, borderRadius: 18, background: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 20, color: C.ink, boxShadow: `0 0 16px ${C.lime}`, marginTop: -18 }}>₹</div>}
        </div>;
      })}
      {([[Smartphone, "Your phone", C.yellow], [Network, "NPCI", C.lime], [Landmark, "Bank", C.paper]] as const).map(([I, l, bg], i) => (
        <NodeBox key={l} icon={I} label={l} bg={bg} p={e(t, 22 + i * 12, 16, BACK)} x={pts[i][0]} y={pts[i][1]} />
      ))}
    </>
  );
}

function Captions({ t }: { t: number }) {
  const second = t > 78;
  const words = second ? ["पैसा", "सीधा", "बैंक", "तक"] : ["Paisa", "seedha", "bank", "tak"];
  const base = second ? 82 : 16;
  const k = Math.min(3, Math.floor((t - base) / 12));
  return (
    <>
      <PlatformBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={CaptionsIcon} dark>Hinglish captions</Tag>
      <div style={{ position: "absolute", left: 40, right: 40, top: 120, height: 720, borderRadius: 30, overflow: "hidden", border: `5px solid ${C.lime}`, boxShadow: `0 0 40px rgba(166,240,74,0.35)` }}>
        <Img src={staticFile("v-veo2.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "45% 50%", transform: `scale(${1.06 + t * 0.0008})` }} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.6))" }} />
        <div style={{ position: "absolute", left: 20, top: 20, display: "flex", gap: 10 }}>
          {["Roman", "देवनागरी"].map((s, i) => <span key={s} style={{ ...pill((i === 1) === second ? C.lime : "rgba(255,255,255,0.9)"), padding: "6px 16px", fontSize: 20, fontWeight: 700 }}>{s}</span>)}
        </div>
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 50, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
          {words.map((w, i) => {
            const p = e(t, base + i * 12, 8, BACK);
            const on = i === k;
            return <span key={w + second} style={{ fontSize: on ? 64 : 56, fontWeight: 800, color: on ? C.ink : "#fff", background: on ? C.yellow : "rgba(0,0,0,0.45)", padding: "2px 14px", borderRadius: 14, transform: `scale(${p})`, opacity: p }}>{w}</span>;
          })}
        </div>
      </div>
    </>
  );
}

function CleanCut({ t }: { t: number }) {
  const close = e(t, 70, 30, IO);
  return (
    <>
      <WashBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={Scissors}>Clean cut</Tag>
      <div style={{ position: "absolute", left: 50, right: 50, top: 260, height: 300, ...card(28), border: "3px solid #2b2b2b", padding: 30, display: "flex", alignItems: "center", gap: 6 }}>
        {Array.from({ length: 34 }, (_, i) => {
          const cut = i % 9 === 4 || i % 9 === 5;
          const h = cut ? 10 : 28 + ((i * 53) % 70) * (0.85 + 0.15 * Math.sin((t + i * 5) / 6));
          return <div key={i} style={{ flex: cut ? 1 - close : 1, minWidth: 0, height: `${h}%`, borderRadius: 5, background: cut ? `rgba(239,68,68,${0.4 + e(t, 30 + i, 8) * 0.4})` : C.limeDeep, opacity: cut ? 1 - close : 1 }} />;
        })}
      </div>
      <div style={{ position: "absolute", top: 210, left: mix(70, 590, e(t, 26, 44, IO)), width: 64, height: 64, borderRadius: 20, background: C.ink, display: "grid", placeItems: "center", transform: `rotate(${Math.sin(t / 3) * 10}deg)`, boxShadow: "0 12px 20px -8px rgba(0,0,0,0.5)" }}><Scissors size={34} color={C.lime} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 610, display: "flex", justifyContent: "center", gap: 14, opacity: e(t, 96, 14) }}>
        {["silences", "fillers", "retakes"].map((s) => <span key={s} style={{ ...pill("#fff"), padding: "10px 20px", fontSize: 26, textDecoration: "line-through", color: C.red }}>{s}</span>)}
      </div>
      <div style={{ position: "absolute", left: "50%", top: 700, transform: `translateX(-50%) scale(${e(t, 104, 14, BACK)})`, ...pill(C.lime), padding: "14px 32px", fontSize: 44, fontWeight: 800 }}>−2:41 saved</div>
    </>
  );
}

function Storyboard({ t }: { t: number }) {
  const frames = ["v-diagram.jpg", "v-slide.jpg", "v-pyq.jpg", "v-formula.jpg", "v-collage.jpg", "v-numerical.jpg"];
  const swap = e(t, 78, 20, IO);
  return (
    <>
      <WashBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={ListChecks}>Storyboard review</Tag>
      <div style={{ position: "absolute", left: 44, right: 44, top: 130, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {frames.map((src, i) => {
          const p = e(t, 6 + i * 7, 14, BACK);
          const flip = i === 3 ? swap : 0;
          const ok = e(t, 104 + i * 4, 10, BACK);
          return <div key={src} style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: 18, overflow: "hidden", transform: `scale(${p}) rotateY(${Math.sin(flip * Math.PI) * 80}deg)`, boxShadow: "0 18px 30px -16px rgba(0,0,0,0.45)", border: i === 3 && swap > 0.5 ? `5px solid ${C.lime}` : "5px solid #fff" }}>
            <Img src={staticFile(i === 3 && swap > 0.5 ? "v-veo1.jpg" : src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", left: 10, top: 10, ...pill("#fff"), padding: "2px 10px", fontSize: 17, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ position: "absolute", right: 10, bottom: 10, width: 40, height: 40, borderRadius: 20, background: C.lime, display: "grid", placeItems: "center", transform: `scale(${ok})` }}><Check size={24} strokeWidth={3} color="#1f2a10" /></div>
          </div>;
        })}
      </div>
      <div style={{ position: "absolute", left: 44, top: 810, ...card(16), padding: "12px 20px", fontSize: 24, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center", gap: 10, opacity: e(t, 74, 10) * (1 - e(t, 104, 10)) }}><ImageIcon size={22} color={C.limeDeep} />Swap shot 04 → a real photo</div>
    </>
  );
}

function ShortsReel({ t }: { t: number }) {
  const crop = e(t, 26, 36, IO);
  const v = Math.round(1240000 * Math.pow(e(t, 70, 66, IO), 2));
  return (
    <>
      <PlatformBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={Smartphone} dark>Auto-Shorts</Tag>
      <div style={{ position: "absolute", left: mix(24, 160, crop), top: mix(330, 120, crop), width: mix(672, 400, crop), height: mix(378, 711, crop), borderRadius: mix(20, 38, crop), overflow: "hidden", boxShadow: `0 40px 70px -20px rgba(0,0,0,0.7), 0 0 0 6px ${crop > 0.5 ? C.lime : "#111"}` }}>
        <Img src={staticFile("v-veo1.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "42% 40%" }} />
        <div style={{ position: "absolute", left: "50%", top: "40%", width: 170, height: 200, transform: "translate(-50%,-50%)", border: `4px solid ${C.lime}`, borderRadius: 18, opacity: 1 - crop }} />
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 90, textAlign: "center", padding: 8, borderRadius: 12, background: C.yellow, fontWeight: 800, fontSize: 28, color: C.ink, opacity: e(t, 64, 10) }}>3 second ka safar</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#fff", fontSize: 30, fontWeight: 800, opacity: e(t, 68, 10) }}><Eye size={28} color={C.lime} />{v.toLocaleString("en-IN")}</div>
      </div>
      <div style={{ position: "absolute", left: 40, top: 110, ...pill(C.yellow), padding: "8px 18px", fontSize: 22, fontWeight: 700 }}>{crop < 0.5 ? "16:9" : "9:16"} · face tracked</div>
    </>
  );
}

function Exam({ t }: { t: number }) {
  const circle = e(t, 66, 24, IO);
  return (
    <>
      <WashBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={ListChecks}>Exam callouts</Tag>
      <div style={{ position: "absolute", left: 50, right: 50, top: 140, ...card(28), border: "3px solid #2b2b2b", padding: 34, transform: `rotate(1deg) scale(${e(t, 0, 18, BACK)})` }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.limeDeep, letterSpacing: 2 }}>PREVIOUS YEAR QUESTION</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.ink, marginTop: 10, lineHeight: 1.2 }}>Which of these is NOT a network topology?</div>
        {["Star", "Ring", "Disk", "Mesh"].map((o, i) => {
          const p = e(t, 18 + i * 8, 10);
          const right = i === 2;
          return <div key={o} style={{ position: "relative", marginTop: 16, padding: "15px 22px", borderRadius: 16, fontSize: 30, fontWeight: 600, background: right && circle > 0.9 ? "#d9f99d" : "#f3f3ef", opacity: p, transform: `translateX(${(1 - p) * 24}px)`, display: "flex", justifyContent: "space-between" }}>
            ({String.fromCharCode(97 + i)}) {o}{right && circle > 0.9 && <Check size={30} color={C.limeDeep} strokeWidth={3} />}
            {right && <svg width={250} height={86} style={{ position: "absolute", left: -12, top: -10 }}><ellipse cx={125} cy={43} rx={116} ry={36} fill="none" stroke={C.red} strokeWidth={5} strokeDasharray={740} strokeDashoffset={740 * (1 - circle)} strokeLinecap="round" /></svg>}
          </div>;
        })}
      </div>
      <div style={{ position: "absolute", left: "50%", top: 770, transform: `translateX(-50%) scale(${e(t, 96, 14, BACK)})`, ...pill(C.lime), padding: "12px 26px", fontSize: 30, fontWeight: 700, whiteSpace: "nowrap" }}>Disk is storage, not a layout</div>
    </>
  );
}

function Thumbs({ t }: { t: number }) {
  const rows: [string, string, number, string][] = [["How UPI works", "radial-gradient(120% 90% at 20% 0%, #445338, #29331f)", 8.4, "#fff"], ["₹1 · 3 seconds", `linear-gradient(135deg, ${C.lime}, ${C.yellow})`, 5.1, C.ink], ["Behind your payment", "linear-gradient(135deg, #ffffff, #e7ecdc)", 6.2, C.ink]];
  const win = e(t, 96, 16, BACK);
  return (
    <>
      <WashBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={ImageIcon}>Thumbnails</Tag>
      {rows.map(([x, bg, ctr, ink], i) => {
        const p = e(t, 10 + i * 12, 16, BACK);
        const lose = i !== 0 ? e(t, 96, 16) * 0.5 : 0;
        return <div key={x} style={{ position: "absolute", left: 50, right: 50, top: 140 + i * 215, height: 190, display: "flex", gap: 20, alignItems: "center", transform: `scale(${p})`, opacity: 1 - lose }}>
          <div style={{ position: "relative", width: 340, height: 190, borderRadius: 20, background: bg, display: "grid", placeItems: "center", padding: 16, textAlign: "center", boxShadow: "0 18px 30px -14px rgba(0,0,0,0.45)", border: i === 0 && win > 0.5 ? `5px solid ${C.lime}` : "5px solid #fff" }}>
            <span style={{ fontSize: 38, fontWeight: 800, color: ink, lineHeight: 1.05 }}>{x}</span>
            {i === 0 && <span style={{ position: "absolute", right: -18, top: -18, width: 54, height: 54, borderRadius: 27, background: C.lime, display: "grid", placeItems: "center", transform: `scale(${win})`, boxShadow: "0 8px 16px rgba(0,0,0,0.3)" }}><Crown size={28} color="#1f2a10" /></span>}
          </div>
          <div><div style={{ fontSize: 22, fontWeight: 600, color: C.muted }}>click-through</div><div style={{ fontSize: 48, fontWeight: 800, color: C.ink }}>{(ctr * e(t, 46 + i * 6, 30, IO)).toFixed(1)}%</div></div>
        </div>;
      })}
    </>
  );
}

function Analytics({ t }: { t: number }) {
  const draw = e(t, 8, 40, IO), fix = e(t, 82, 30, IO);
  const y = (x: number) => 110 + x * 0.3 + 120 * Math.exp(-((x - 300) ** 2) / 2600) * (1 - fix);
  const pts = Array.from({ length: 61 }, (_, i) => i * 10).map((x) => `${x},${y(x)}`).join(" ");
  return (
    <>
      <PlatformBg t={t} loop={REEL_BEATS} />
      <Tag t={t} icon={BarChart3} dark>Retention analytics</Tag>
      <div style={{ position: "absolute", left: 40, right: 40, top: 140, ...card(28), padding: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 28, fontWeight: 700, color: C.ink }}>Audience retention</span><TrendingUp size={30} color={C.limeDeep} /></div>
        <svg width={580} height={420} viewBox="0 0 600 420" style={{ marginTop: 14 }}>
          <defs><clipPath id="d"><rect width={600 * draw} height={420} /></clipPath></defs>
          <g clipPath="url(#d)">
            <polygon points={`0,420 ${pts} 600,420`} fill="rgba(166,240,74,0.25)" />
            <polyline points={pts} fill="none" stroke={C.limeDeep} strokeWidth={6} strokeLinejoin="round" />
          </g>
          <circle cx={300} cy={y(300)} r={14 * e(t, 46, 10, BACK)} fill={fix > 0.5 ? C.lime : C.red} />
        </svg>
        <div style={{ fontSize: 26, fontWeight: 600, marginTop: 6, color: fix > 0.5 ? C.limeDeep : C.red }}>{fix > 0.5 ? "Visual added at 2:14 · viewers stay" : "Dip at 2:14 · viewers leave"}</div>
      </div>
      <div style={{ position: "absolute", left: 300, top: 470, ...pill(C.yellow), padding: "10px 18px", fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, transform: `scale(${e(t, 78, 14, BACK) * (1 - e(t, 118, 10))})` }}><Workflow size={22} />+ flowchart</div>
    </>
  );
}

const MAP: Record<ReelKind, (p: { t: number }) => React.ReactElement> = {
  script: Script, plan: Plan, captions: Captions, cleancut: CleanCut, storyboard: Storyboard, shorts: ShortsReel, exam: Exam, thumbs: Thumbs, analytics: Analytics,
};

export const Reel = ({ kind }: { kind: ReelKind }) => {
  const t = useBeat();
  const R = MAP[kind];
  const o = interpolate(t, [0, 4, REEL_BEATS - 4, REEL_BEATS], [0.5, 1, 1, 0.5], clamp); // soft at the loop point
  return <AbsoluteFill style={{ fontFamily: FONT, overflow: "hidden", background: "#000" }}><AbsoluteFill style={{ opacity: o }}><R t={t} /></AbsoluteFill></AbsoluteFill>;
};
