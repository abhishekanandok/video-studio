/** Drishya's hero film (designed at 1920x960, rendered at 2560x1280, 60 fps, 16 s seamless loop), in the website's
 *  own design language: the Platform section's dark-green gradient and glowing editor window, white bento cards and
 *  benefit pills, SVG icons, no emoji.
 *  An idea is typed into the editor and Create is pressed; the plan in the sidebar ticks off step by step while four
 *  tiles build (script, a flow diagram, captions, the clean cut); the render preview plays; three Shorts fan out and
 *  their views climb; everything settles back to an empty stage, which is where the loop begins.
 *  The action sits right of centre: the landing page writes its headline over the left. */
import { BarChart3, Captions, Check, Clock, Eye, FileCheck2, Landmark, Mic, MousePointer2, Network, PenLine, Scissors, Search, Smartphone, Wand2 } from "lucide-react";
import { AbsoluteFill } from "remotion";
import { BACK, C, FONT, IN, IO, Mark, PlatformBg, card, e, mix, pill, useBeat } from "./common";

export const HERO_BEATS = 480;
export const HERO_FRAMES = HERO_BEATS * 2;
const WX = 790, WY = 150, WW = 1000, WH = 630; // the editor window (canvas 1920x960: the hero is about 2:1)
const MX = WX + 250, MY = WY + 92, MW = WW - 280; // its main area

const STEPS: [typeof Search, string][] = [[Search, "Research"], [PenLine, "Script"], [Wand2, "Visual plan"], [Mic, "Voice"], [Captions, "Captions"], [Scissors, "Clean cut"], [Smartphone, "Shorts"], [BarChart3, "Analytics"]];
const stepDone = (i: number) => 84 + i * 24;

function Sidebar({ t }: { t: number }) {
  return (
    <div style={{ position: "absolute", left: 22, top: 84, width: 214, bottom: 22, borderRadius: 16, background: C.tile, border: `1px solid ${C.line}`, padding: "18px 16px" }}>
      <div style={{ fontSize: 15, letterSpacing: 2, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>THE PLAN</div>
      {STEPS.map(([I, label], i) => {
        const done = t >= stepDone(i), active = !done && t >= stepDone(i) - 24 && t > 70;
        const born = e(t, 66 + i * 4, 10);
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 15, opacity: born, transform: `translateX(${(1 - born) * -12}px)` }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: done ? C.lime : active ? "rgba(166,240,74,0.18)" : "rgba(255,255,255,0.06)", color: done ? "#1f2a10" : active ? C.lime : "rgba(255,255,255,0.5)", transition: "none" }}>
              {done ? <Check size={18} strokeWidth={3} /> : <I size={16} strokeWidth={2.2} />}
            </span>
            <span style={{ fontSize: 19, fontWeight: 500, color: done ? "#fff" : active ? C.lime : "rgba(255,255,255,0.55)" }}>{label}</span>
            {active && <span style={{ marginLeft: "auto", width: 14, height: 14, borderRadius: 7, border: "2px solid rgba(166,240,74,0.25)", borderTopColor: C.lime, transform: `rotate(${t * 24}deg)` }} />}
          </div>
        );
      })}
    </div>
  );
}

function Prompt({ t }: { t: number }) {
  const out = e(t, 62, 10, IN);
  if (out >= 1) return null;
  const text = "How does UPI work?";
  const n = Math.max(0, Math.min(text.length, Math.floor((t - 12) / 2)));
  const press = t >= 56 && t < 62 ? 0.94 : 1;
  const ripple = e(t, 56, 10);
  const cx = mix(MX + MW - 40, MX + MW - 130, e(t, 30, 24, IO)), cy = mix(MY + 470, MY + 268, e(t, 30, 24, IO));
  return (
    <>
      <div style={{ position: "absolute", left: MX - WX, top: MY - WY, width: MW, opacity: 1 - out, transform: `translateY(${-out * 20}px)` }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: "#fff" }}>What&apos;s your video about?</div>
        <div style={{ marginTop: 22, padding: "22px 24px", borderRadius: 16, background: "#fff", fontSize: 30, fontWeight: 500, color: C.ink, display: "flex", alignItems: "center" }}>
          {text.slice(0, n)}<span style={{ width: 3, height: 34, marginLeft: 3, background: C.limeDeep, opacity: Math.floor(t / 8) % 2 ? 1 : 0 }} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          {["Explainer", "Hinglish", "16:9 + 3 Shorts"].map((c, i) => (
            <span key={c} style={{ ...pill(i === 0 ? C.yellow : i === 1 ? C.lime : C.paper), padding: "8px 18px", fontSize: 19, opacity: e(t, 36 + i * 4, 8), transform: `scale(${e(t, 36 + i * 4, 8, BACK)})` }}>{c}</span>
          ))}
        </div>
        <div style={{ position: "relative", marginTop: 34, marginLeft: "auto", width: "fit-content", padding: "16px 34px", borderRadius: 999, background: `linear-gradient(90deg, ${C.lime}, ${C.yellow})`, color: "#1f2a10", fontSize: 24, fontWeight: 700, transform: `scale(${press})`, overflow: "hidden" }}>
          Create video
          <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#fff", opacity: (1 - ripple) * (t >= 56 ? 0.7 : 0), transform: `scale(${0.2 + ripple * 2})` }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: cx - WX, top: cy - WY, opacity: e(t, 28, 6) * (1 - e(t, 60, 6)), transform: `scale(${press})`, filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.45))" }}>
        <MousePointer2 size={44} color="#111" fill="#fff" strokeWidth={1.6} />
      </div>
    </>
  );
}

/* ---------- the four tiles ---------- */

function Tile({ t, at, icon: I, title, children }: { t: number; at: number; icon: typeof Search; title: string; children: React.ReactNode }) {
  const p = e(t, at, 18, BACK), out = e(t, 296, 12, IN);
  return (
    <div style={{ height: 250, borderRadius: 16, background: C.tile, border: `1px solid ${C.line}`, padding: "16px 18px", opacity: Math.min(1, p * 1.4) * (1 - out), transform: `translateY(${(1 - p) * 24}px) scale(${0.96 + p * 0.04 - out * 0.06})`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18, color: "rgba(255,255,255,0.85)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}><I size={18} color="#8f8bd9" />{title}</span>
        <span style={{ width: 54, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${e(t, at + 4, 50, IO) * 100}%`, background: C.violet }} /></span>
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

const Node = ({ icon: I, label, bg, p }: { icon: typeof Search; label: string; bg: string; p: number }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transform: `scale(${p})`, opacity: p }}>
    <span style={{ width: 62, height: 62, borderRadius: 18, background: bg, display: "grid", placeItems: "center", boxShadow: "0 10px 18px -8px rgba(0,0,0,0.5)" }}><I size={30} color="#1f1f1d" strokeWidth={2} /></span>
    <span style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{label}</span>
  </div>
);

function Flow({ t, at, scale = 1 }: { t: number; at: number; scale?: number }) {
  const nodes: [typeof Search, string, string][] = [[Smartphone, "Your phone", C.yellow], [Network, "NPCI", C.lime], [Landmark, "Bank", C.paper]];
  const link = (k: number) => e(t, at + 18 + k * 10, 12, IO);
  const packet = ((t - at - 40) % 40) / 40;
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 6px", transform: `scale(${scale})`, transformOrigin: "left top" }}>
      {[0, 1].map((k) => (
        <div key={k} style={{ position: "absolute", top: 37, left: `${18 + k * 37}%`, width: "27%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }}>
          <div style={{ height: "100%", width: `${link(k) * 100}%`, borderRadius: 2, background: C.lime, boxShadow: `0 0 10px ${C.lime}` }} />
          {t > at + 40 && <div style={{ position: "absolute", top: -7, left: `${(k ? Math.max(0, packet * 2 - 1) : Math.min(1, packet * 2)) * 100}%`, width: 18, height: 18, borderRadius: 9, background: "#fff", boxShadow: `0 0 12px ${C.lime}`, fontSize: 11, fontWeight: 800, color: C.ink, display: "grid", placeItems: "center", marginLeft: -9 }}>₹</div>}
        </div>
      ))}
      {nodes.map(([I, l, bg], i) => <Node key={l} icon={I} label={l} bg={bg} p={e(t, at + 4 + i * 8, 12, BACK)} />)}
    </div>
  );
}

function Tiles({ t }: { t: number }) {
  if (t < 66 || t > 312) return null;
  const words = ["Paisa", "seedha", "bank", "tak"];
  const deva = ["पैसा", "सीधा", "बैंक", "तक"];
  const k = Math.floor((t - 160) / 8);
  return (
    <div style={{ position: "absolute", left: MX - WX, top: MY - WY - 8, width: MW, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <Tile t={t} at={70} icon={PenLine} title="Script">
        {[["UPI: ₹1 bhejne mein 3 second.", 90], ["Peeche kya hota hai?", 66], ["Chalo, raasta dekhte hain.", 78]].map(([s, w], i) => {
          const p = e(t, 82 + i * 10, 10);
          return <div key={String(s)} style={{ fontSize: 20, color: i === 1 ? C.ink : "rgba(255,255,255,0.9)", background: i === 1 ? C.yellow : "transparent", width: i === 1 ? "fit-content" : "auto", padding: i === 1 ? "0 8px" : 0, borderRadius: 6, marginTop: 10, opacity: p, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>{s}</div>;
        })}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>{["Flowchart", "B-roll", "Map"].map((c, i) => <span key={c} style={{ ...pill(["#d9f99d", "#fde68a", "#dbeafe"][i]), fontSize: 15, padding: "3px 12px", transform: `scale(${e(t, 112 + i * 5, 8, BACK)})` }}>{c}</span>)}</div>
      </Tile>
      <Tile t={t} at={106} icon={Wand2} title="Visual plan"><Flow t={t} at={110} /></Tile>
      <Tile t={t} at={142} icon={Captions} title="Captions">
        <div style={{ height: 160, borderRadius: 12, background: "linear-gradient(160deg,#2f3c29,#141922)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10 }}>
          {[words, deva].map((row, r) => (
            <div key={r} style={{ display: "flex", gap: 8 }}>
              {row.map((w, i) => {
                const p = e(t, 152 + r * 34 + i * 7, 8, BACK);
                const on = (r === 0 ? k : k - 4) === i;
                return <span key={w} style={{ fontSize: 24, fontWeight: 800, padding: "2px 10px", borderRadius: 8, color: on ? C.ink : "#fff", background: on ? C.yellow : "rgba(0,0,0,0.35)", transform: `scale(${p})`, opacity: p }}>{w}</span>;
              })}
            </div>
          ))}
        </div>
      </Tile>
      <Tile t={t} at={178} icon={Scissors} title="Voice + clean cut">
        <div style={{ display: "flex", alignItems: "center", gap: 4, height: 120 }}>
          {Array.from({ length: 30 }, (_, i) => {
            const cut = i % 8 === 4 || i % 8 === 5;
            const close = e(t, 220, 24, IO);
            const h = cut ? 14 : 30 + ((i * 53) % 60) * (0.85 + 0.15 * Math.sin((t + i * 5) / 5));
            return <span key={i} style={{ flex: cut ? 1 - close : 1, minWidth: 0, height: `${h}%`, borderRadius: 3, background: cut ? "rgba(239,68,68,0.55)" : C.lime, opacity: cut ? 1 - close : 1 }} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 17, color: "rgba(255,255,255,0.6)" }}><span>silences · fillers · retakes</span><span style={{ color: C.lime, fontWeight: 700, opacity: e(t, 240, 10) }}>−2:41</span></div>
      </Tile>
    </div>
  );
}

function Preview({ t }: { t: number }) {
  const p = e(t, 300, 22, BACK), out = e(t, 336, 14, IN);
  if (p <= 0 || out >= 1) return null;
  return (
    <div style={{ position: "absolute", left: MX - WX, top: MY - WY - 8, width: MW, height: 520, opacity: p * (1 - out * 0.6) }}>
      <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", display: "flex", justifyContent: "space-between" }}><span>Preview</span><span style={{ color: C.lime }}>Rendering 1440p · {Math.round(e(t, 302, 34, IO) * 100)}%</span></div>
      <div style={{ marginTop: 12, height: 404, borderRadius: 18, overflow: "hidden", background: "radial-gradient(120% 90% at 15% 0%, #445338, #29331f)", position: "relative", transform: `scale(${0.94 + p * 0.06})` }}>
        <div style={{ position: "absolute", left: 40, top: 30, ...pill(C.yellow), padding: "6px 18px", fontSize: 22, fontWeight: 700 }}>How UPI works</div>
        <div style={{ position: "absolute", left: 60, right: 60, top: 120 }}><Flow t={t} at={300} /></div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, display: "flex", justifyContent: "center" }}>
          <span style={{ background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 30, fontWeight: 800, padding: "8px 20px", borderRadius: 12 }}>Paisa seedha <span style={{ background: C.yellow, color: C.ink, padding: "0 8px", borderRadius: 6 }}>bank</span> tak</span>
        </div>
        <div style={{ position: "absolute", left: 0, bottom: 0, height: 8, width: `${e(t, 302, 34, IO) * 100}%`, background: C.lime }} />
      </div>
    </div>
  );
}

/* ---------- around the window ---------- */

function Float({ t, x, y, at, ph, children }: { t: number; x: number; y: number; at: number; ph: number; children: React.ReactNode }) {
  const p = e(t, at, 20, BACK), out = e(t, 436, 22, IN);
  if (p <= 0 || out >= 1) return null;
  const dx = 10 * Math.sin((t + ph) / 26), dy = 8 * Math.cos((t + ph) / 30);
  return <div style={{ position: "absolute", left: x + dx, top: y + dy + (1 - p) * 40 + out * 50, opacity: Math.min(1, p * 1.3) * (1 - out), transform: `scale(${0.9 + p * 0.1})`, zIndex: 5 }}>{children}</div>;
}

const Bento = ({ icon: I, tint, title, sub, children }: { icon: typeof Search; tint: string; title: string; sub: string; children?: React.ReactNode }) => (
  <div style={{ ...card(20), border: "3px solid #2b2b2b", padding: "16px 20px", width: 300, fontFamily: FONT }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 44, height: 44, borderRadius: 13, background: tint, display: "grid", placeItems: "center" }}><I size={22} color="#1f1f1d" /></span>
      <div><div style={{ fontSize: 21, fontWeight: 700, color: C.ink }}>{title}</div><div style={{ fontSize: 15, color: C.muted }}>{sub}</div></div>
    </div>
    {children}
  </div>
);

function Around({ t }: { t: number }) {
  return (
    <>
      <Float t={t} x={WX + 40} y={22} at={150} ph={0}>
        <Bento icon={FileCheck2} tint={C.yellow} title="Script ready" sub="Hinglish · 2 min">
          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>{[92, 70, 84].map((w, i) => <span key={i} style={{ height: 7, width: `${w}%`, borderRadius: 4, background: i === 1 ? C.yellow : "#ecebe6" }} />)}</div>
        </Bento>
      </Float>
      <Float t={t} x={WX + WW - 250} y={44} at={196} ph={40}>
        <Bento icon={Wand2} tint={C.lime} title="12 visuals planned" sub="diagrams · maps · charts">
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            {[C.yellow, C.lime, "#dbeafe", C.lime].map((c, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 34, height: 22, borderRadius: 6, background: c, border: "1px solid rgba(0,0,0,0.12)" }} />{i < 3 && <span style={{ width: 16, height: 2, background: "#bbb" }} />}</span>)}
          </div>
        </Bento>
      </Float>
      <Float t={t} x={WX - 30} y={WY + WH - 70} at={226} ph={80}>
        <Bento icon={Captions} tint="#dbeafe" title="Captions" sub="Roman + देवनागरी, word-timed" />
      </Float>
      {([["Ready in under 2 hours", C.yellow, Clock, WX + 210, 818, 250], ["Grounded in your script", C.lime, FileCheck2, WX + 560, 862, 270], ["Three Shorts with every video", C.paper, Smartphone, WX + 640, 800, 352]] as const).map(([l, bg, I, x, y, at], i) => (
        <Float key={l} t={t} x={x} y={y} at={at} ph={i * 30}>
          <div style={{ ...pill(bg), display: "flex", alignItems: "center", gap: 10, padding: "12px 22px", fontSize: 20, fontFamily: FONT, boxShadow: "0 16px 30px -14px rgba(0,0,0,0.45)" }}><I size={20} />{l}</div>
        </Float>
      ))}
    </>
  );
}

const SHORTS = [
  { dx: -270, dy: 30, r: -8, views: 240000, bg: "radial-gradient(120% 90% at 20% 0%, #445338, #29331f)", cap: "3 second ka safar" },
  { dx: 0, dy: -10, r: 0, views: 1240000, bg: `linear-gradient(160deg, ${C.lime}, ${C.yellow})`, cap: "Paisa seedha bank tak" },
  { dx: 270, dy: 30, r: 8, views: 610000, bg: "linear-gradient(160deg, #f7f7f5, #e7ecdc)", cap: "NPCI kya karta hai?" },
];

function Shorts({ t }: { t: number }) {
  const fan = e(t, 344, 26, BACK), out = e(t, 440, 22, IN);
  if (fan <= 0 || out >= 1) return null;
  const cx = WX + WW / 2 + 40, cy = WY + WH / 2 + 10;
  return (
    <>
      {SHORTS.map((s, i) => {
        const v = Math.round(s.views * Math.pow(e(t, 362 + i * 5, 60, IO), 2));
        const dark = i === 0;
        return (
          <div key={i} style={{ position: "absolute", left: cx + s.dx * fan - 140, top: cy + s.dy * fan - 248 + out * 60, width: 280, height: 498, borderRadius: 32, overflow: "hidden", background: s.bg, zIndex: i === 1 ? 12 : 11,
            transform: `rotate(${s.r * fan}deg) scale(${0.6 + fan * 0.4})`, opacity: Math.min(1, fan * 1.5) * (1 - out), boxShadow: "0 50px 80px -24px rgba(0,0,0,0.7), 0 0 0 7px #111", fontFamily: FONT }}>
            <div style={{ position: "absolute", left: 22, top: 26, display: "flex", alignItems: "center", gap: 8, color: dark ? "#fff" : C.ink, fontSize: 18, fontWeight: 700 }}><Mark size={24} color={dark ? "#fff" : C.ink} />Drishya</div>
            <div style={{ position: "absolute", left: 24, right: 24, top: 110 }}>
              {[Smartphone, Network, Landmark].map((I, k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: k ? 14 : 0, opacity: e(t, 356 + k * 6, 10), transform: `translateX(${(1 - e(t, 356 + k * 6, 10)) * -16}px)` }}>
                  <span style={{ width: 46, height: 46, borderRadius: 13, background: dark ? [C.yellow, C.lime, C.paper][k] : "#fff", display: "grid", placeItems: "center", border: "1px solid rgba(0,0,0,0.1)" }}><I size={24} color={C.ink} /></span>
                  <span style={{ height: 8, flex: 1, borderRadius: 4, background: dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)" }} />
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 84, textAlign: "center", padding: "10px 8px", borderRadius: 12, background: dark ? C.yellow : C.ink, color: dark ? C.ink : "#fff", fontWeight: 800, fontSize: 22 }}>{s.cap}</div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#fff", fontWeight: 700, fontSize: 24 }}>
              <Eye size={24} color={C.lime} />{v.toLocaleString("en-IN")}
            </div>
          </div>
        );
      })}
    </>
  );
}

function Window({ t }: { t: number }) {
  const inn = e(t, 0, 28, BACK), out = e(t, 452, 26, IN);
  const dim = e(t, 338, 14) * (1 - e(t, 436, 14));
  const status = t < 64 ? "Draft" : t < 296 ? "Planning" : t < 340 ? "Rendering" : "Published";
  return (
    <div style={{ position: "absolute", left: WX, top: WY, width: WW, height: WH, borderRadius: 26, background: C.win, border: `6px solid ${C.lime}`,
      boxShadow: `0 0 ${40 + 20 * Math.sin(t / 20)}px 4px rgba(166,240,74,0.35), 0 60px 100px -30px rgba(0,0,0,0.7)`, overflow: "hidden",
      opacity: Math.min(1, inn * 1.4) * (1 - out) * (1 - dim * 0.45), transform: `translateY(${(1 - inn) * 70 + out * 70}px) scale(${1 - dim * 0.04})` }}>
      <div style={{ position: "absolute", left: 26, top: 26, display: "flex", gap: 10 }}>{["#ef4444", "#eab308", "#22c55e"].map((c) => <span key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}</div>
      <div style={{ position: "absolute", left: 120, top: 18, display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.85)", fontSize: 20, fontWeight: 600 }}><Mark size={26} />Drishya · New video</div>
      <div style={{ position: "absolute", right: 24, top: 16, ...pill(status === "Published" ? C.lime : "rgba(255,255,255,0.08)"), border: "1px solid rgba(255,255,255,0.12)", color: status === "Published" ? "#1f2a10" : "#fff", padding: "6px 16px", fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 5, background: C.lime, boxShadow: `0 0 8px ${C.lime}` }} />{status}
      </div>
      <Sidebar t={t} />
      <Prompt t={t} />
      <Tiles t={t} />
      <Preview t={t} />
    </div>
  );
}

export const Hero = () => {
  const t = useBeat();
  const cam = 1 + 0.03 * (1 - Math.cos((t / HERO_BEATS) * Math.PI * 2)) / 2; // a slow push in and out, seamless
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: FONT }}>
      <PlatformBg t={t} loop={HERO_BEATS} />
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${WX + WW / 2}px ${WY + WH / 2}px` }}>
        <Window t={t} />
        <Around t={t} />
        <Shorts t={t} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
