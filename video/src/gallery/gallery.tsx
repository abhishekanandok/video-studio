/* The library gallery (frontend /app/library, in an iframe): every motion of the grammar, every card design, every
   creature in every movement and the robots, each in its own tile, drawn LIVE by the real components in any of the 50
   looks (looks-preview.json) through @remotion/player, so the gallery can never show something the code does not do.
   50 tiles at a time, "See more" for the next 50; a click opens one big with the code that draws it.
     node gallery-build.mjs      bundles this into frontend/public/library/gallery.js (run it after changing the library) */
import { Player, Thumbnail } from "@remotion/player";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Card, CARD_FILLS, CARD_FRAMES, CARD_HEADS, CARD_IDS, CARD_SHAPES } from "../argon/lib/cards";
import { Creature, CREATURE_KINDS, CREATURE_MOVES, Robot, RobotArm, Swarm, type CreatureKind, type CreatureMove, type RobotAction } from "../argon/lib/creatures";
import { Motion, MOTION_IDS } from "../argon/lib/motion-d";
import { AVATARS, Conversation, Person, POSES, type AvatarName, type PoseName } from "../argon/lib/people";
import { Lib } from "../print/bridge";
import { Enter } from "../print/enter";
import { DNA, loadPrintFonts, Sheet, Type } from "../print/kit";
import LOOKS_JSON from "../print/looks-preview.json";

const LOOKS = LOOKS_JSON as unknown as DNA[];
const FILM_MOTIONS = ["snappy", "drift", "typewriter", "stamp", "slide", "draw", "pop", "wipe", "zoom", "flip", "parallax", "glitch", "brush"];
const ROBOT_ACTIONS: RobotAction[] = ["idle", "wave", "walk", "think", "type", "point", "celebrate", "scan"];
const ARM_ACTIONS = ["pick", "wave", "weld", "sort"] as const;
const PATHED = new Set(["path", "crawl", "swim", "hop"]);
const PAGE = 50, FPS = 30, LEN = 4 * FPS;
/** the frame a tile starts on: every piece has arrived by then (and an exit is half gone), so a paused tile still shows it */
const SHOWN = 2.5 * FPS;

/* ---------------- what one tile draws ---------------- */
type Item = { tab: Tab; id: string; label: string; code: string; move?: CreatureMove };
type Props = { item: Item; look: number };

/** a motion is shown on a card in the film's own box style: entrances arrive, exits leave, emphases play, loops run */
function MotionDemo({ id }: { id: string }) {
  const at = id.startsWith("exit") ? 2.1 : id.startsWith("emph") ? 0.8 : 0.4;
  return <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
    <Motion id={id} at={at} dur={id.startsWith("emph") ? 1.4 : 0.9}>
      {/* a bold solid card, whatever the look's box style: a hairline "rule" box would be too faint to see move in a tile */}
      <Card design="rounded.offset.accent.band" w={1300} h={700} title={id.split(".").slice(0, 2).join(" · ")} text={id} motion="" seed={3} />
    </Motion>
  </AbsoluteFill>;
}
const ItemView: React.FC<Props> = ({ item, look }) => {
  const dna = LOOKS[look] ?? LOOKS[0];
  const [a, b] = item.id.split(":");
  return <AbsoluteFill><Sheet dna={dna}><Lib dur={LEN / FPS}>{[
    item.tab === "motions" ? <MotionDemo key="m" id={item.id} /> : null,
    item.tab === "cards" ? <AbsoluteFill key="c" style={{ display: "grid", placeItems: "center" }}><Card design={item.id} w={1500} h={780} at={0.3} title="Subsea cables carry the internet" text="99% of the world's data travels under the sea, not through the sky" seed={2} /></AbsoluteFill> : null,
    item.tab === "creatures" ? <Creature key="k" kind={a as CreatureKind} x={960} y={560} size={PATHED.has(b) || b === "orbit" ? 480 : 680} move={(b ?? "wander") as CreatureMove} at={b === "flee" ? 1.6 : 0.2} range={b === "dangle" ? 300 : b === "orbit" ? 320 : 260} loop
      path={PATHED.has(b) ? [[260, 760], [760, 420], [1180, 700], [1680, 380]] : undefined} /> : null,
    item.tab === "robots" && a === "robot" ? <AbsoluteFill key="r" style={{ display: "grid", placeItems: "center" }}><Robot action={b as RobotAction} size={760} at={0.2} /></AbsoluteFill> : null,
    item.tab === "robots" && a === "arm" ? <AbsoluteFill key="a" style={{ display: "grid", placeItems: "center" }}><RobotArm action={b as (typeof ARM_ACTIONS)[number]} size={820} at={0.2} /></AbsoluteFill> : null,
    item.tab === "robots" && a === "swarm" ? <Swarm key="s" kind={b as CreatureKind} x={360} y={260} w={1200} h={560} count={14} size={150} /> : null,
    item.tab === "entrances" ? <EnterDemo key="e" kind={item.id} /> : null,
    item.tab === "people" ? <AbsoluteFill key="p" style={{ display: "grid", placeItems: "center" }}><Person avatar={a as AvatarName} pose={b as PoseName} size={820} /></AbsoluteFill> : null,
    item.tab === "talks" && a === "talk" ? <Conversation key="t" people={[{ avatar: "kid", name: "Riya" }, { avatar: "professor", name: "Dr Rao" }]}
      lines={[{ who: 0, text: "Why is it hotter at the equator?", at: 0.3 }, { who: 1, text: "The sun hits it straight on.", at: 1.9, pose: "point" }]} /> : null,
    item.tab === "talks" && a === "meet" ? <Conversation key="m" mode="meet" action={b as "handshake"} people={[{ avatar: "business", name: "Asha" }, { avatar: "chef", name: "Ravi" }]}
      lines={[{ who: 0, text: "Hello!", at: 0.4 }, { who: 1, text: "Hi there!", at: 2.4 }]} /> : null,
  ].filter(Boolean)}</Lib></Sheet></AbsoluteFill>;
};
/** the film's own entrances (src/print/enter.tsx, one per look MOTION): three cards arriving one after another */
function EnterDemo({ kind }: { kind: string }) {
  return <>{[0, 1, 2].map((i) => <Staggered key={i} i={i} kind={kind} />)}</>;
}
function Staggered({ i, kind }: { i: number; kind: string }) {
  const t = useCurrentFrame() / FPS;
  return <Enter t={t} at={0.3 + i * 0.5} kind={kind} style={{ left: 160 + i * 560, top: 300, width: 500, height: 420, inset: undefined }}>
    <Card w={500} h={420} title={["Plan", "Build", "Ship"][i]} text={`${kind} · piece ${i + 1}`} motion="" seed={i + 4} />
  </Enter>;
}

/* ---------------- the catalogue ---------------- */
type Tab = "motions" | "cards" | "creatures" | "robots" | "entrances" | "people" | "talks";
const TABS: { id: Tab; label: string }[] = [{ id: "people", label: "People" }, { id: "talks", label: "Two people" }, { id: "motions", label: "Motions" }, { id: "cards", label: "Boxes & cards" }, { id: "creatures", label: "Creatures" }, { id: "robots", label: "Robots" }, { id: "entrances", label: "Film entrances" }];
const ITEMS: Record<Tab, Item[]> = {
  motions: MOTION_IDS.map((id) => ({ tab: "motions", id, label: id, code: `<Motion id="${id}" at={0.5}>…</Motion>` })),
  cards: CARD_IDS.map((id) => ({ tab: "cards", id, label: id, code: `<Card design="${id}" w={620} h={300} title="…" text="…" at={0.5} />` })),
  creatures: CREATURE_MOVES.flatMap((m) => CREATURE_KINDS.map((k) => ({ tab: "creatures" as Tab, id: `${k}:${m}`, label: `${k} · ${m}`, move: m,
    code: `<Creature kind="${k}" x={960} y={540} size={200} move="${m}"${PATHED.has(m) ? " path={[[200, 700], [900, 400], [1700, 600]]}" : ""} at={0.5} />` }))),
  robots: [
    ...ROBOT_ACTIONS.map((a) => ({ tab: "robots" as Tab, id: `robot:${a}`, label: `Robot · ${a}`, code: `<Robot action="${a}" size={420} at={0.5} />` })),
    ...ARM_ACTIONS.map((a) => ({ tab: "robots" as Tab, id: `arm:${a}`, label: `RobotArm · ${a}`, code: `<RobotArm action="${a}" size={520} at={0.5} />` })),
    ...(["bee", "fly", "ant", "butterfly", "mosquito", "drone"] as CreatureKind[]).map((k) => ({ tab: "robots" as Tab, id: `swarm:${k}`, label: `Swarm · ${k}`, code: `<Swarm kind="${k}" x={300} y={240} w={1200} h={560} count={14} />` })),
  ],
  people: POSES.flatMap((p) => AVATARS.map((av) => ({ tab: "people" as Tab, id: `${av}:${p}`, label: `${av} · ${p}`, code: `<Person avatar="${av}" pose="${p}" size={560} />` }))),
  talks: [{ tab: "talks" as Tab, id: "talk:", label: "talk · speech bubbles", code: `<Conversation people={[{ avatar: "kid", name: "Riya" }, { avatar: "professor", name: "Dr Rao" }]} lines={[{ who: 0, text: "…", at: 0.3 }, { who: 1, text: "…", at: 1.9 }]} />` },
    ...["walk_meet", "handshake", "give", "high_five", "argue", "turn_away"].map((x) => ({ tab: "talks" as Tab, id: `meet:${x}`, label: `meet · ${x}`, code: `<Conversation mode="meet" action="${x}" people={[{ avatar: "business" }, { avatar: "chef" }]} lines={[{ who: 0, text: "…", at: 0.4 }, { who: 1, text: "…", at: 2.4 }]} />` }))],
  entrances: FILM_MOTIONS.map((m) => ({ tab: "entrances", id: m, label: m, code: `<Enter t={t} at={0.5} kind="${m}">…</Enter>   // or useEnter(t, at): every panel of a look with motion "${m}"` })),
};
const NOTES: Record<Tab, string> = {
  motions: "Any piece, moved by name: phase.kind.dir.ease. Entrances arrive, exits leave, emphases draw the eye and settle, loops keep going.",
  cards: "shape · frame · fill · head. Text shrinks to fit; a card with no design takes the look's own box style.",
  creatures: "Every creature in every movement: wings beat, legs walk, crawlers turn to the way they go.",
  robots: "A robot that acts, an industrial arm, and swarms.",
  people: "Every avatar in every pose and move, drawn in the look you pick: the outline takes the film's ink, the body style follows the look.",
  talks: "Two people talking (speech bubbles; only the speaker's mouth moves) or meeting (they walk in, then shake hands, give, high-five, argue or turn away).",
  entrances: "How a look's panels arrive (the look's MOTION): each film picks one, and every box in it enters that way.",
};

/* ---------------- the page ---------------- */
const C = { ink: "#1f1c1b", muted: "#5f5b57", line: "#e2e1da", lime: "#a6f04a", soft: "#f1f0ea" };
const chip = (on: boolean): React.CSSProperties => ({ border: on ? `1px solid ${C.ink}` : `1px solid ${C.line}`, background: on ? C.ink : "#fff", color: on ? "#fff" : C.muted, borderRadius: 999, padding: "5px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" });

/** mounts its children once they first come near the screen and keeps them, so a page of tiles draws a few at a time */
function InView({ children, h }: { children: React.ReactNode; h: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: "200px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ minHeight: h }}>{on ? children : null}</div>;
}

function Tile({ item, look, onOpen }: { item: Item; look: number; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  return <button type="button" onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    style={{ all: "unset", cursor: "pointer", display: "block", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
    <InView h={124}>
      {/* a still frame until the pointer is on it, then a player: only the tile under the mouse ever plays */}
      <div style={{ position: "relative" }}>
        {hover
          ? <Player component={ItemView} inputProps={{ item, look }} durationInFrames={LEN} fps={FPS} compositionWidth={1920} compositionHeight={1080}
              style={{ width: "100%", aspectRatio: "16 / 9", pointerEvents: "none" }} autoPlay loop numberOfSharedAudioTags={0} acknowledgeRemotionLicense />
          : <Thumbnail component={ItemView} inputProps={{ item, look }} frameToDisplay={SHOWN} durationInFrames={LEN} fps={FPS} compositionWidth={1920} compositionHeight={1080}
              style={{ width: "100%", aspectRatio: "16 / 9", pointerEvents: "none" }} />}
        {!hover && <div style={{ position: "absolute", right: 8, bottom: 8, width: 26, height: 26, borderRadius: 99, background: "rgba(31,28,27,.75)", color: "#fff", fontSize: 11, display: "grid", placeItems: "center" }}>▶</div>}
      </div>
    </InView>
    <div style={{ padding: "8px 10px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
  </button>;
}

/** the part of this page the viewer can see, in page coordinates: the gallery sits in an iframe (/app/library) that
    may scroll itself or be scrolled by the app around it, so the overlay goes over the slice that is on screen */
function visible(): { top: number; height: number } {
  let top = window.scrollY, height = window.innerHeight;
  try {
    const fr = window.frameElement?.getBoundingClientRect(), ph = window.parent.innerHeight;
    if (fr) { top += Math.max(0, -fr.top); height = Math.min(height, Math.min(fr.bottom, ph) - Math.max(fr.top, 0)); }
  } catch { /* another origin: this window alone */ }
  return { top, height: Math.max(300, height) };
}

function Big({ item, look, onClose, onStep }: { item: Item; look: number; onClose: () => void; onStep: (d: number) => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") onStep(1); if (e.key === "ArrowLeft") onStep(-1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, onStep]);
  const [view, setView] = useState(visible);
  useEffect(() => {
    const on = () => setView(visible());
    const wins = [window, ...(window.parent !== window ? [window.parent] : [])];
    try { wins.forEach((w) => { w.addEventListener("scroll", on, true); w.addEventListener("resize", on); }); } catch { /* another origin */ }
    return () => { try { wins.forEach((w) => { w.removeEventListener("scroll", on, true); w.removeEventListener("resize", on); }); } catch { /* */ } };
  }, []);
  return <div onClick={onClose} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, background: "rgb(20 18 17 / 0.72)", zIndex: 10 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: "50%", top: view.top + 20, transform: "translateX(-50%)", maxHeight: view.height - 40, overflowY: "auto",
      width: `min(1100px, calc(100% - 40px), ${Math.round((view.height - 200) * 16 / 9)}px)`, background: "#fff", borderRadius: 20 }}>
      <Player key={item.id + look} component={ItemView} inputProps={{ item, look }} durationInFrames={LEN} fps={FPS} compositionWidth={1920} compositionHeight={1080}
        style={{ width: "100%", aspectRatio: "16 / 9" }} initialFrame={SHOWN} autoPlay loop controls numberOfSharedAudioTags={0} acknowledgeRemotionLicense />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <b style={{ fontSize: 18, fontFamily: "ui-monospace, Menlo, monospace" }}>{item.label}</b>
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" style={chip(false)} onClick={() => onStep(-1)}>← prev</button>
            <button type="button" style={chip(false)} onClick={() => onStep(1)}>next →</button>
            <button type="button" style={chip(true)} onClick={onClose}>close</button>
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          <code style={{ flex: 1, background: C.soft, borderRadius: 10, padding: "10px 12px", fontSize: 13, overflowX: "auto", whiteSpace: "nowrap" }}>{item.code}</code>
          <button type="button" style={chip(true)} onClick={() => { navigator.clipboard?.writeText(item.code); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{copied ? "copied" : "copy code"}</button>
        </div>
      </div>
    </div>
  </div>;
}

const hash = new URLSearchParams(window.location.hash.slice(1));
function Gallery() {
  const [tab, setTab] = useState<Tab>((TABS.find((t) => t.id === hash.get("tab"))?.id) ?? "people");
  const [look, setLook] = useState(Number(hash.get("look") ?? 0) || 0);
  const [q, setQ] = useState(hash.get("q") ?? "");
  const [facet, setFacet] = useState("all");
  const [n, setN] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(hash.has("open") ? Number(hash.get("open")) : null);
  useEffect(() => { loadPrintFonts(LOOKS[look]); }, [look]);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setN(PAGE); setOpen(null); }, [tab, q, facet]);
  // the iframe tells the app page how tall it is, so the page scrolls as one
  useEffect(() => {
    const send = () => window.parent?.postMessage({ galleryHeight: document.documentElement.scrollHeight }, "*");
    const ro = new ResizeObserver(send); ro.observe(document.body); send();
    return () => ro.disconnect();
  }, []);

  const facets: Record<Tab, string[]> = {
    motions: ["all", "enter", "exit", "emph", "loop"], cards: ["all", ...CARD_SHAPES], creatures: ["all", ...CREATURE_MOVES],
    robots: ["all", "robot", "arm", "swarm"], entrances: ["all"], people: ["all", "stand", "explain", "point", "think", "walk", "wave", "cheer", "shrug"], talks: ["all", "talk", "meet"],
  };
  const list = useMemo(() => ITEMS[tab].filter((it) => {
    const f = facet === "all" || (tab === "motions" ? it.id.startsWith(facet + ".") : tab === "cards" ? it.id.startsWith(facet + ".") : tab === "creatures" ? it.move === facet : tab === "people" ? it.id.endsWith(":" + facet) : it.id.startsWith(facet + ":"));
    return f && q.trim().toLowerCase().split(/\s+/).every((w) => it.label.toLowerCase().includes(w));
  }), [tab, q, facet]);
  const shown = list.slice(0, n);

  return <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: C.ink, padding: "4px 2px 24px" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
      {TABS.map((t) => <button key={t.id} type="button" style={chip(tab === t.id)} onClick={() => { setTab(t.id); setFacet("all"); setQ(""); }}>{t.label} <span style={{ opacity: 0.6 }}>{ITEMS[t.id].length.toLocaleString()}</span></button>)}
      <span style={{ flex: 1 }} />
      <label style={{ fontSize: 13, color: C.muted, display: "flex", gap: 6, alignItems: "center" }}>Look
        <select value={look} onChange={(e) => setLook(Number(e.target.value))} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "6px 8px", fontSize: 13, background: "#fff" }}>
          {LOOKS.map((d, i) => <option key={i} value={i}>{d.family} · {d.box} box · {d.motion}</option>)}
        </select>
      </label>
    </div>
    <p style={{ margin: "0 0 10px", fontSize: 14, color: C.muted }}>{NOTES[tab]}</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      {facets[tab].length > 1 && facets[tab].map((f) => <button key={f} type="button" style={chip(facet === f)} onClick={() => setFacet(f)}>{f}</button>)}
    </div>
    {tab === "cards" && <p style={{ margin: "0 0 10px", fontSize: 12.5, color: C.muted }}>frames: {CARD_FRAMES.join(" · ")} — fills: {CARD_FILLS.join(" · ")} — heads: {CARD_HEADS.join(" · ")} (type any of them to filter)</p>}
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "cards" ? "Filter: glass band, ticket double…" : tab === "creatures" ? "Filter: bee, fly dart…" : "Filter: swoop elastic, upleft…"}
        style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 12, padding: "9px 12px", fontSize: 14, outline: "none" }} />
      <span style={{ fontSize: 13, color: "#8a8580", whiteSpace: "nowrap" }}>{shown.length} of {list.length.toLocaleString()}</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
      {shown.map((it, i) => <Tile key={it.id + look} item={it} look={look} onOpen={() => setOpen(i)} />)}
    </div>
    {n < list.length && <div style={{ textAlign: "center", marginTop: 18 }}>
      <button type="button" style={{ ...chip(true), padding: "10px 22px", fontSize: 14 }} onClick={() => setN(n + PAGE)}>See more · {Math.min(PAGE, list.length - n)} of {(list.length - n).toLocaleString()} left</button>
    </div>}
    {open !== null && list[open] && <Big item={list[open]} look={look} onClose={() => setOpen(null)}
      onStep={(d) => setOpen((o) => { const k = Math.max(0, Math.min(list.length - 1, (o ?? 0) + d)); if (k >= n) setN(k + 1); return k; })} />}
  </div>;
}

createRoot(document.getElementById("root")!).render(<Gallery />);
