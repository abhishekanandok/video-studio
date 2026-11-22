/** Drishya's product flow film (1920x1080, 60 fps, ~29 s): every step on its own full screen, drawn as the site's
 *  bento cards (white tiles inside a thick dark frame, like "Generic AI edits / Complex Editing"), on a plain light
 *  background. Input (slides, voice, video or an idea; a click) → Research (an empty pop-up that fills: searching the
 *  web, sources, facts) → Script → Edit (preview, inspector, timeline) → Render → Publish (a real Short on a phone).
 *  Preview cut for review before it goes on the landing page. */
import { BarChart3, Captions, Check, ChevronRight, FileText, Globe, Heart, Lightbulb, MessageCircle, Mic, MousePointer2, Network, Landmark, Presentation, Scissors, Search, Send, Smartphone, Video, Wand2 } from "lucide-react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { BACK, FONT, IN, IO, OUT, e, mix, useBeat } from "./common";

export const FLOW_BEATS = 880;
export const FLOW_FRAMES = FLOW_BEATS * 2;
const SC = [0, 130, 290, 440, 620, 710, FLOW_BEATS]; // scene starts (beats)
const STEPS = ["Input", "Research", "Script", "Edit", "Render", "Publish"];
const INK = "#222", GREY = "#777", SOFT = "#f3f3ef", LIME = "#a6f04a", DARK = "#2b2b2b";

/* ---------- the bento language ---------- */
const Frame = ({ w, h, children, style }: { w: number; h?: number; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ width: w, height: h, background: DARK, borderRadius: 30, padding: 5, display: "flex", flexDirection: "column", gap: 5, boxShadow: "0 50px 90px -40px rgba(0,0,0,0.45)", ...style }}>{children}</div>
);
const Tile = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "#fff", borderRadius: 24, padding: 30, position: "relative", ...style }}>{children}</div>
);
const H = ({ children, size = 30 }: { children: React.ReactNode; size?: number }) => <div style={{ fontSize: size, fontWeight: 700, color: INK }}>{children}</div>;
const P = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <div style={{ fontSize: 19, color: GREY, lineHeight: 1.45, ...style }}>{children}</div>;
const Icon = ({ icon: I, bg = SOFT, size = 52 }: { icon: typeof Mic; bg?: string; size?: number }) => (
  <span style={{ width: size, height: size, borderRadius: size * 0.3, background: bg, display: "grid", placeItems: "center", flexShrink: 0 }}><I size={size * 0.48} color={INK} strokeWidth={2} /></span>
);
const Pill = ({ children, bg = SOFT, style }: { children: React.ReactNode; bg?: string; style?: React.CSSProperties }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: bg, fontSize: 17, fontWeight: 600, color: INK, ...style }}>{children}</span>
);
const Bar = ({ w, c = "#ecebe6", h = 12 }: { w: number | string; c?: string; h?: number }) => <div style={{ width: w, height: h, borderRadius: h / 2, background: c }} />;

/** a scene's entrance and exit: rise and settle in, lift and fade out */
function Scene({ t, a, b, z = 1, children }: { t: number; a: number; b: number; z?: number; children: React.ReactNode }) {
  if (t < a - 1 || t > b + 1) return null;
  const inn = e(t, a, 22, OUT), out = e(t, b - 16, 16, IN);
  return (
    <AbsoluteFill style={{ display: "grid", placeItems: "center", opacity: inn * (1 - out), transform: `translateY(${(1 - inn) * 40 - out * 30}px) scale(${0.97 + inn * 0.03})` }}>
      <div style={{ marginTop: 60, transform: `scale(${z})` }}>{children}</div>
    </AbsoluteFill>
  );
}

function Cursor({ x, y, click }: { x: number; y: number; click: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 30, transform: `scale(${1 - click * 0.15})`, filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.3))" }}>
      <MousePointer2 size={46} color="#111" fill="#fff" strokeWidth={1.6} />
      <div style={{ position: "absolute", left: -18, top: -18, width: 60, height: 60, borderRadius: 30, border: "3px solid rgba(166,240,74,0.9)", opacity: click, transform: `scale(${0.4 + click})` }} />
    </div>
  );
}
const clickAt = (t: number, at: number) => Math.max(0, 1 - Math.abs(t - at) / 5);

function Typed({ t, at, text, speed = 1.6 }: { t: number; at: number; text: string; speed?: number }) {
  const n = Math.max(0, Math.min(text.length, Math.floor((t - at) / speed)));
  return <>{text.slice(0, n)}{n < text.length && t >= at && <span style={{ display: "inline-block", width: 3, height: "1em", background: INK, marginLeft: 2, verticalAlign: "-0.15em" }} />}</>;
}

/* ---------- 01 input ---------- */
function Input({ t }: { t: number }) {
  const l = t - SC[0];
  const pick = l > 40;
  const inputs: [typeof Mic, string, string][] = [[Presentation, "Slides", "PPT or PDF"], [Mic, "Voice note", "upload or record"], [Video, "Recording", "MP4, MOV, any length"], [Lightbulb, "Just an idea", "one line is enough"]];
  // the pointer, in screen coordinates: to "Just an idea", then to "Create video"
  const cx = l < 40 ? mix(1720, 1400, e(l, 10, 28, IO)) : mix(1400, 1470, e(l, 82, 16, IO));
  const cy = l < 40 ? mix(1020, 680, e(l, 10, 28, IO)) : mix(680, 505, e(l, 82, 16, IO));
  return (
    <>
      <Frame w={1180}>
        <Tile style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <H size={34}>What do you want to make?</H>
            <div style={{ marginTop: 18, padding: "18px 22px", borderRadius: 16, background: SOFT, fontSize: 26, color: INK, minHeight: 34 }}>
              {pick ? <Typed t={l} at={48} text="How does UPI work?" /> : <span style={{ color: "#aaa" }}>Drop a file, or type an idea…</span>}
            </div>
          </div>
          <div style={{ alignSelf: "flex-end", padding: "18px 30px", borderRadius: 999, background: DARK, color: "#fff", fontSize: 22, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, transform: `scale(${1 - clickAt(l, 100) * 0.08})` }}>
            Create video <ChevronRight size={22} />
          </div>
        </Tile>
        <div style={{ display: "flex", gap: 5 }}>
          {inputs.map(([I, title, sub], i) => {
            const on = i === 3 && pick;
            return (
              <Tile key={title} style={{ flex: 1, padding: 26, outline: on ? `4px solid ${LIME}` : "none", outlineOffset: -4, transform: `scale(${on ? 1 - clickAt(l, 40) * 0.04 : 1})` }}>
                <Icon icon={I} bg={on ? LIME : SOFT} />
                <div style={{ marginTop: 40 }}><H size={24}>{title}</H><P style={{ marginTop: 6 }}>{sub}</P></div>
              </Tile>
            );
          })}
        </div>
      </Frame>
      
    </>
  );
}

function InputCursor({ t }: { t: number }) {
  const l = t - SC[0];
  if (l < 8 || l > 118) return null;
  const cx = l < 40 ? mix(1800, 1545, e(l, 10, 28, IO)) : mix(1545, 1552, e(l, 82, 16, IO));
  const cy = l < 40 ? mix(1040, 700, e(l, 10, 28, IO)) : mix(700, 462, e(l, 82, 16, IO));
  return <div style={{ opacity: e(l, 8, 6) * (1 - e(l, 110, 8)) }}><Cursor x={cx} y={cy} click={Math.max(clickAt(l, 40), clickAt(l, 100))} /></div>;
}

/* ---------- 02 research ---------- */
const SOURCES: [string, string, string][] = [
  ["npci.org.in", "Unified Payments Interface: product overview", "How UPI connects banks and payment apps"],
  ["rbi.org.in", "Payment and settlement systems in India", "Who regulates real-time payments"],
  ["en.wikipedia.org", "Unified Payments Interface", "History, launch in 2016, how a transfer works"],
];
const FACTS = ["UPI is run by NPCI and was launched in 2016", "Money moves bank to bank; the app only sends the request", "A payment settles in a few seconds"];

function Research({ t }: { t: number }) {
  const l = t - SC[1];
  const filling = l > 22;
  return (
    <Frame w={1240} h={640}>
      <Tile style={{ padding: "22px 30px", display: "flex", alignItems: "center", gap: 16 }}>
        <Icon icon={Search} bg={LIME} size={46} />
        <H size={28}>Research</H>
        <P style={{ marginLeft: "auto" }}>{l < 120 ? "reading the web…" : "3 sources · cited in the script"}</P>
        {l < 120 && <span style={{ width: 22, height: 22, borderRadius: 11, border: "3px solid #e5e5df", borderTopColor: DARK, transform: `rotate(${l * 18}deg)` }} />}
      </Tile>
      <div style={{ display: "flex", gap: 5, flex: 1 }}>
        <Tile style={{ flex: 1.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14, background: SOFT, fontSize: 21, color: INK }}>
            <Globe size={22} color={GREY} />{filling ? <Typed t={l} at={24} text="how does UPI work NPCI bank transfer" speed={1.1} /> : ""}
          </div>
          {!filling && [0, 1, 2].map((i) => <div key={i} style={{ marginTop: 26 }}><Bar w="40%" /><div style={{ height: 10 }} /><Bar w="85%" /><div style={{ height: 8 }} /><Bar w="70%" /></div>)}
          {filling && SOURCES.map(([d, title, sub], i) => {
            const p = e(l, 60 + i * 14, 14, BACK);
            const read = e(l, 70 + i * 14, 16, IO);
            return (
              <div key={d} style={{ marginTop: 20, padding: "16px 18px", borderRadius: 16, border: "2px solid #ecebe6", opacity: p, transform: `translateY(${(1 - p) * 20}px)`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${read * 100}%`, background: "rgba(166,240,74,0.14)" }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: "#4a7a1c", fontWeight: 600 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, background: SOFT, display: "grid", placeItems: "center", fontSize: 12, color: INK }}>{d[0].toUpperCase()}</span>{d}
                </div>
                <div style={{ position: "relative", fontSize: 22, fontWeight: 700, color: INK, marginTop: 6 }}>{title}</div>
                <div style={{ position: "relative", fontSize: 17, color: GREY, marginTop: 2 }}>{sub}</div>
              </div>
            );
          })}
        </Tile>
        <Tile style={{ flex: 1 }}>
          <H size={24}>What we found</H>
          {!filling && [0, 1, 2].map((i) => <div key={i} style={{ marginTop: 24, display: "flex", gap: 12 }}><Bar w={28} h={28} /><div style={{ flex: 1 }}><Bar w="90%" /><div style={{ height: 8 }} /><Bar w="60%" /></div></div>)}
          {filling && FACTS.map((f, i) => {
            const p = e(l, 104 + i * 12, 12, BACK);
            return (
              <div key={f} style={{ marginTop: 24, display: "flex", gap: 14, alignItems: "flex-start", opacity: p, transform: `translateX(${(1 - p) * 16}px)` }}>
                <span style={{ width: 30, height: 30, borderRadius: 15, background: LIME, display: "grid", placeItems: "center", flexShrink: 0 }}><Check size={18} strokeWidth={3} color="#1f2a10" /></span>
                <div style={{ fontSize: 21, color: INK, lineHeight: 1.35 }}>{f}</div>
              </div>
            );
          })}
        </Tile>
      </div>
    </Frame>
  );
}

/* ---------- 03 script ---------- */
const LINES: [string, string, string?][] = [
  ["label", "Scene 1 · Hook"], ["line", "₹1 bhejne mein sirf 3 second lagte hain."], ["line", "Par peeche kya hota hai? Chalo dekhte hain."],
  ["label", "Scene 2 · How it works"], ["line", "Aapka app NPCI ko request bhejta hai,", "Flowchart"], ["line", "aur NPCI aapke bank se baat karta hai.", "Map"],
];
function Script({ t }: { t: number }) {
  const l = t - SC[2];
  return (
    <Frame w={1240} h={640} style={{ flexDirection: "row" }}>
      <Tile style={{ width: 300 }}>
        <H size={24}>Scenes</H>
        {["Hook", "How it works", "Why it's fast", "Recap"].map((s, i) => {
          const on = i === (l < 70 ? 0 : 1);
          return <div key={s} style={{ marginTop: 18, padding: "14px 16px", borderRadius: 14, background: on ? DARK : SOFT, color: on ? "#fff" : INK, fontSize: 20, fontWeight: 600, display: "flex", gap: 10 }}><span style={{ opacity: 0.5 }}>{i + 1}</span>{s}</div>;
        })}
        <P style={{ position: "absolute", left: 30, bottom: 28 }}>Grounded in 3 sources</P>
      </Tile>
      <Tile style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><Icon icon={FileText} bg={LIME} size={46} /><H size={28}>Script</H><Pill style={{ marginLeft: "auto" }}>Hinglish · 2 min</Pill></div>
        <div style={{ marginTop: 26 }}>
          {LINES.map(([k, s, tag], i) => {
            const at = 10 + i * 18;
            if (l < at) return null;
            return k === "label"
              ? <div key={s} style={{ marginTop: i ? 26 : 0, fontSize: 17, fontWeight: 700, color: "#4a7a1c", letterSpacing: 1.5, textTransform: "uppercase" }}>{s}</div>
              : <div key={s} style={{ marginTop: 10, fontSize: 27, color: INK, display: "flex", alignItems: "center", gap: 14 }}>
                  <span><Typed t={l} at={at} text={s} speed={0.55} /></span>
                  {tag && <Pill bg={tag === "Flowchart" ? "#d9f99d" : "#dbeafe"} style={{ transform: `scale(${e(l, at + 18, 10, BACK)})` }}>{tag === "Flowchart" ? <Network size={16} /> : <Globe size={16} />}{tag}</Pill>}
                </div>;
          })}
        </div>
      </Tile>
    </Frame>
  );
}

/* ---------- 04 edit ---------- */
function FlowDiagram({ t, scale = 1 }: { t: number; scale?: number }) {
  const nodes: [typeof Mic, string, string][] = [[Smartphone, "Your app", "#fde68a"], [Network, "NPCI", LIME], [Landmark, "Your bank", "#dbeafe"]];
  const link = (k: number) => e(t, 14 + k * 12, 14, IO);
  const dot = ((t - 40) % 50) / 50;
  return (
    <div style={{ position: "relative", width: 520, height: 160, transform: `scale(${scale})`, transformOrigin: "center" }}>
      {[0, 1].map((k) => (
        <div key={k} style={{ position: "absolute", top: 52, left: 120 + k * 180, width: 100, height: 5, borderRadius: 3, background: "#e5e5df" }}>
          <div style={{ width: `${link(k) * 100}%`, height: "100%", borderRadius: 3, background: DARK }} />
          {t > 40 && <div style={{ position: "absolute", top: -8, left: `${(k ? Math.max(0, dot * 2 - 1) : Math.min(1, dot * 2)) * 100}%`, width: 20, height: 20, marginLeft: -10, borderRadius: 10, background: LIME, border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />}
        </div>
      ))}
      {nodes.map(([I, label, bg], i) => {
        const p = e(t, 4 + i * 8, 12, BACK);
        return <div key={label} style={{ position: "absolute", left: i * 180, top: 0, width: 120, textAlign: "center", transform: `scale(${p})` }}>
          <span style={{ margin: "0 auto", width: 108, height: 108, borderRadius: 28, background: bg, display: "grid", placeItems: "center", border: `4px solid ${DARK}` }}><I size={46} color={INK} /></span>
          <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: INK }}>{label}</div>
        </div>;
      })}
    </div>
  );
}

function Edit({ t }: { t: number }) {
  const l = t - SC[3];
  const play = e(l, 20, 150, (x) => x);
  const close = e(l, 90, 24, IO);
  const tracks: [string, typeof Mic, string][] = [["Video", Video, "#d4d4cf"], ["Visuals", Wand2, LIME], ["Voice", Mic, "#bcd9ff"], ["Captions", Captions, "#fde68a"]];
  return (
    <Frame w={1320} h={680}>
      <div style={{ display: "flex", gap: 5, height: 400 }}>
        <Tile style={{ flex: 1.7, padding: 0, overflow: "hidden", background: "#fbfbf8", display: "grid", placeItems: "center" }}>
          <div style={{ position: "absolute", left: 22, top: 18 }}><Pill>Preview · 00:{String(14 + Math.floor(play * 20)).padStart(2, "0")}</Pill></div>
          <FlowDiagram t={l} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, textAlign: "center", fontSize: 26, fontWeight: 600, color: "#fff" }}>
            <span style={{ background: "rgba(20,20,20,0.78)", padding: "6px 16px", borderRadius: 8 }}>Aapka app NPCI ko request bhejta hai</span>
          </div>
        </Tile>
        <Tile style={{ flex: 1 }}>
          <H size={24}>Scene 2</H>
          {([["Visual", "Flowchart", Network], ["Captions", "Hinglish, word-timed", Captions], ["Voice", "Natural, Hindi-English", Mic], ["Clean cut", "2:41 removed", Scissors]] as const).map(([k, v, I], i) => (
            <div key={k} style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, opacity: e(l, 10 + i * 8, 10) }}>
              <Icon icon={I} size={40} />
              <div><div style={{ fontSize: 16, color: GREY }}>{k}</div><div style={{ fontSize: 20, fontWeight: 600, color: INK }}>{v}</div></div>
              <span style={{ marginLeft: "auto", width: 26, height: 26, borderRadius: 13, background: LIME, display: "grid", placeItems: "center" }}><Check size={16} strokeWidth={3} /></span>
            </div>
          ))}
        </Tile>
      </div>
      <Tile style={{ flex: 1, padding: "20px 26px" }}>
        <div style={{ position: "absolute", top: 14, bottom: 14, left: `calc(150px + ${play} * (100% - 180px))`, width: 3, background: "#ef4444", zIndex: 2 }} />
        {tracks.map(([name, I, c], r) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 14, height: 46, marginTop: r ? 6 : 0 }}>
            <span style={{ width: 120, display: "flex", alignItems: "center", gap: 8, fontSize: 17, color: GREY }}><I size={18} />{name}</span>
            <div style={{ flex: 1, display: "flex", gap: 6, height: 34 }}>
              {r === 2
                ? Array.from({ length: 60 }, (_, i) => { const cut = i % 15 > 11; return <span key={i} style={{ flex: cut ? 1 - close : 1, minWidth: 0, alignSelf: "center", height: `${cut ? 20 : 30 + ((i * 37) % 70)}%`, borderRadius: 2, background: cut ? "rgba(239,68,68,0.5)" : c, opacity: cut ? 1 - close : 1 }} />; })
                : [3, 2, 4, 2, 3].map((w, i) => <span key={i} style={{ flex: w, borderRadius: 8, background: c, opacity: e(l, 6 + r * 6 + i * 4, 10), border: r === 1 ? `2px solid ${DARK}` : "none" }} />)}
            </div>
          </div>
        ))}
      </Tile>
    </Frame>
  );
}

/* ---------- 05 render ---------- */
function Render({ t }: { t: number }) {
  const l = t - SC[4];
  const p = e(l, 6, 60, IO);
  return (
    <Frame w={760}>
      <Tile>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><Icon icon={p > 0.995 ? Check : Wand2} bg={LIME} size={50} /><H size={30}>{p > 0.995 ? "Ready" : "Rendering"}</H><span style={{ marginLeft: "auto", fontSize: 30, fontWeight: 700, color: INK }}>{Math.round(p * 100)}%</span></div>
        <div style={{ marginTop: 24, height: 16, borderRadius: 8, background: SOFT, overflow: "hidden" }}><div style={{ width: `${p * 100}%`, height: "100%", background: DARK }} /></div>
        {["1080p master video", "3 vertical Shorts", "Thumbnail and title"].map((s, i) => {
          const ok = l > 20 + i * 18;
          return <div key={s} style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, fontSize: 21, color: ok ? INK : "#aaa" }}>
            <span style={{ width: 28, height: 28, borderRadius: 14, background: ok ? LIME : SOFT, display: "grid", placeItems: "center" }}>{ok && <Check size={16} strokeWidth={3} />}</span>{s}
          </div>;
        })}
      </Tile>
    </Frame>
  );
}

/* ---------- 06 publish: a real Short on a phone ---------- */
function Publish({ t }: { t: number }) {
  const l = t - SC[5];
  const views = Math.round(124000 * Math.pow(e(l, 20, 120, IO), 2));
  const phone = e(l, 4, 22, BACK);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
      <Frame w={660}>
        <Tile style={{ padding: 0, overflow: "hidden", height: 371, display: "grid", placeItems: "center", background: "#fbfbf8" }}>
          <FlowDiagram t={l + 60} scale={0.95} />
          <div style={{ position: "absolute", left: 20, top: 16 }}><Pill bg={LIME}><Check size={16} strokeWidth={3} />Published</Pill></div>
        </Tile>
        <Tile style={{ padding: "22px 26px" }}>
          <H size={26}>How does UPI work?</H>
          <P style={{ marginTop: 6 }}>1 video · 3 Shorts · thumbnail · captions in Hinglish</P>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}><Pill><BarChart3 size={16} />Retention tracked</Pill><Pill><Send size={16} />Scheduled</Pill></div>
        </Tile>
      </Frame>
      <div style={{ position: "relative", width: 380, height: 780, borderRadius: 56, background: "#111", padding: 12, boxShadow: "0 60px 100px -40px rgba(0,0,0,0.6)", transform: `translateY(${(1 - phone) * 80}px) scale(${0.9 + phone * 0.1})`, opacity: phone }}>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 46, overflow: "hidden", background: "#000" }}>
          <OffthreadVideo src={staticFile("tile-story.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "55% 50%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25), transparent 25%, transparent 60%, rgba(0,0,0,0.7))" }} />
          <div style={{ position: "absolute", left: "50%", top: 12, width: 110, height: 30, marginLeft: -55, borderRadius: 15, background: "#000" }} />
          <div style={{ position: "absolute", left: 22, right: 70, bottom: 120, color: "#fff", fontSize: 25, fontWeight: 700, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>₹1 bhejne mein sirf 3 second. Par peeche kya hota hai?</div>
          <div style={{ position: "absolute", left: 22, bottom: 74, color: "rgba(255,255,255,0.85)", fontSize: 18, fontWeight: 600 }}>@yourchannel · How UPI works</div>
          <div style={{ position: "absolute", right: 16, bottom: 130, display: "flex", flexDirection: "column", gap: 22, alignItems: "center", color: "#fff", fontSize: 15, fontWeight: 600 }}>
            {[[Heart, "8.2K"], [MessageCircle, "312"], [Send, "Share"]].map(([I, n], i) => { const Ic = I as typeof Heart; return <div key={i} style={{ textAlign: "center" }}><Ic size={34} color="#fff" fill={i === 0 && l > 60 ? "#ef4444" : "none"} />{<div>{n as string}</div>}</div>; })}
          </div>
          <div style={{ position: "absolute", left: 22, bottom: 30, display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 19, fontWeight: 700 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: LIME }} />{views.toLocaleString("en-IN")} views</div>
          <div style={{ position: "absolute", left: 0, bottom: 0, height: 4, width: `${e(l, 0, 160, (x) => x) * 100}%`, background: "#fff" }} />
        </div>
      </div>
    </div>
  );
}

function Steps({ t }: { t: number }) {
  const cur = SC.findIndex((s, i) => t >= s && t < SC[i + 1]);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 54, display: "flex", justifyContent: "center", gap: 10 }}>
      {STEPS.map((s, i) => (
        <span key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 999, fontSize: 19, fontWeight: 600, background: i === cur ? DARK : i < cur ? "#fff" : "transparent", color: i === cur ? "#fff" : i < cur ? INK : "#9a9a94", border: i < cur ? "1px solid #e2e2dc" : "1px solid transparent" }}>
          <span style={{ opacity: 0.6 }}>0{i + 1}</span>{s}{i < cur && <Check size={16} strokeWidth={3} color="#4a7a1c" />}
        </span>
      ))}
    </div>
  );
}

export const Flow = () => {
  const t = useBeat();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: "radial-gradient(90% 80% at 50% 45%, #fafaf7 0%, #f2f2ef 60%, #ebebe6 100%)" }}>
      <Steps t={t} />
      <Scene t={t} a={SC[0]} b={SC[1]} z={1.35}><Input t={t} /></Scene>
      <InputCursor t={t} />
      <Scene t={t} a={SC[1]} b={SC[2]} z={1.3}><Research t={t} /></Scene>
      <Scene t={t} a={SC[2]} b={SC[3]} z={1.3}><Script t={t} /></Scene>
      <Scene t={t} a={SC[3]} b={SC[4]} z={1.24}><Edit t={t} /></Scene>
      <Scene t={t} a={SC[4]} b={SC[5]} z={1.55}><Render t={t} /></Scene>
      <Scene t={t} a={SC[5]} b={SC[6]} z={1.12}><Publish t={t} /></Scene>
    </AbsoluteFill>
  );
};
