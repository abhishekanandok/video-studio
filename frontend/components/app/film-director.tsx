"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { FilmLive, LiveEvent } from "./film-live";
import { groundCss, type CardT, type FilmStatus, type Line, type Move } from "./film-parts";
import { ease } from "./kit";

/* Gemini as an editor, in the film editor (components/app/film-editor.tsx): the same hand as the classic director
   (components/app/agent-director.tsx), driven by this pipeline's real steps (/api/films/<slug>/live). Every step the
   runner takes becomes one TASK, played one at a time the way a person edits: type the story's lines in, record each
   voice, open a scene and drag its pieces onto the canvas, give each its motion, key it on the word it happens on, play
   it back with the voice, then export. While Gemini writes the film's code, the scene it has reached is built again on
   the canvas; between steps the editor keeps polishing the scene in hand. "Replay" plays a finished film's making.
   Elements it works on are marked data-agent="..." in the editor. */

export type DTab = "Agent" | "Card" | "Captions" | "Code" | "Audio";
export type Piece = { id: string; name: string; draw: string; emoji: string; kind: "piece" | "text" | "callout"; x: number; y: number; w: number; anim?: string; at?: number; typed?: number; target?: string; drawn?: boolean };
export type DCanvas = { scene: number; layers: Piece[]; selected: string | null; play: number; look: string };
export type DKey = { scene: number; at: number; label: string };
export type FilmDirectorUI = {
  on: boolean; tab: DTab | null; tool: "select" | "text" | "move"; anim: string | null; canvas: DCanvas | null; keys: DKey[];
  stamp: { text: string; tone: "ok" | "bad" | "info"; key: number } | null; highlight: string | null;
  render: { done: number; total: number; ready: boolean } | null; task: { n: number; title: string; step: string } | null; next: string[];
  typing: { i: number; n: number } | null; recording: number | null; capWord: string | null;
};
type Cur = { x: number; y: number; label: string; down: boolean; ghost: string | null; ripple: number; lens: boolean; show: boolean };
type Task = { title: string; run: () => Promise<void> };

const EMPTY: FilmDirectorUI = { on: false, tab: null, tool: "select", anim: null, canvas: null, keys: [], stamp: null, highlight: null, render: null, task: null, next: [], typing: null, recording: null, capWord: null };
export const ANIMS = ["Draw", "Pop", "Slide", "Grow", "Path", "Shake"] as const;
const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** a piece's picture in the editor: an emoji for what it names */
const EMOJI: [RegExp, string][] = [[/cow|cattle|buffalo/, "🐄"], [/truck|lorry|tanker/, "🚚"], [/door|gate/, "🚪"], [/milk|pouch|glass|bottle/, "🥛"], [/can\b|cans|churn|bucket|vat/, "🪣"],
  [/farmer|villager|worker|man|woman|tester|person|people|boy|girl|kid|child|crowd/, "🧑"], [/rider|cycle|bike|bicycle/, "🚴"], [/sun|dawn|sunrise/, "☀️"], [/moon|night|star/, "🌙"],
  [/plant|factory|mill|dairy/, "🏭"], [/pipe|tube|valve/, "🧪"], [/river|ganga|flood|water|wave|sea|rain/, "🌊"], [/cloud|monsoon/, "🌧️"], [/house|home|hut|centre|center|booth|shop|stall/, "🏠"],
  [/phone|mobile|app|screen/, "📱"], [/coin|money|rupee|cash|price/, "🪙"], [/bank/, "🏦"], [/chart|graph|bar|line/, "📊"], [/clock|time|timer|hour/, "⏰"], [/gauge|meter|thermo/, "🌡️"],
  [/tree|forest|field|crop|grass/, "🌳"], [/city|town|street|road/, "🏙️"], [/server|computer|laptop|data|chip/, "🖥️"], [/robot|ai\b|machine/, "🤖"], [/ship|boat|port/, "🚢"],
  [/map|route|path|arrow|line/, "🗺️"], [/fire|heat|flame|hot/, "🔥"], [/snow|cold|ice|chill/, "❄️"], [/mountain|hill|himalaya/, "⛰️"], [/dam|wall|embankment/, "🧱"], [/sky|air|wind/, "🌬️"]];
export const emojiOf = (name: string, draw = "") =>  // its name first ("sky" whose drawing mentions a door is still the sky), then its drawing
  (EMOJI.find(([re]) => re.test(name.toLowerCase())) ?? EMOJI.find(([re]) => re.test(draw.toLowerCase().split(/[:;(]/)[0])))?.[1] ?? "✏️";
const animOf = (m: Move, look: string) => {
  const v = `${m.verb} ${m.motion}`.toLowerCase();
  if (/draw|sketch|write|trace/.test(v) || (look === "whiteboard" && /appear|show/.test(v))) return "Draw";
  if (/grow|rise|climb|fill|swell|increase/.test(v)) return "Grow";
  if (/connect|send|travel|carr|drive|move|flow|route|race|walk/.test(v)) return "Path";
  if (/break|crack|shake|flicker|fail|stop|freeze/.test(v)) return "Shake";
  if (/slide|replace|take|enter|leave/.test(v)) return "Slide";
  return "Pop";
};
/** when a card's word is spoken in its line (the first matching word) */
export function wordAt(line: Line | undefined, word: string): number {
  if (!line) return 0;
  const want = norm(word.split(/\s+/)[0] ?? "");
  const hit = line.words.find((w) => norm(w.w) === want) ?? line.words.find((w) => want.length > 2 && (norm(w.w).startsWith(want) || want.startsWith(norm(w.w))) && norm(w.w).length > 2);
  return hit ? hit.s : 0;
}
/** where the n pieces of a scene sit on the canvas (fractions), in a row or two, clear of the captions */
function slot(k: number, n: number): [number, number] {
  const cols = n <= 3 ? Math.max(n, 1) : Math.ceil(n / 2), row = Math.floor(k / cols), col = k % cols, rows = Math.ceil(n / cols);
  return [0.08 + (col + 0.5) * (0.84 / cols) - 0.09, (rows === 1 ? 0.34 : 0.16 + row * 0.34)];
}

export function useFilmDirector({ root, film, live, active, speed, onSeek }: {
  root: RefObject<HTMLDivElement | null>; film: FilmStatus; live: FilmLive | undefined; active: boolean; speed: number; onSeek: (t: number) => void;
}) {
  const [ui, setUi] = useState<FilmDirectorUI>(EMPTY);
  const [cur, setCur] = useState<Cur>({ x: 0, y: 0, label: "", down: false, ghost: null, ripple: 0, lens: false, show: false });
  const F = useRef(film), Lv = useRef(live), sp = useRef(speed), seekRef = useRef(onSeek);
  F.current = film; Lv.current = live; sp.current = speed; seekRef.current = onSeek;
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const queue = useRef<Task[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const built = useRef<Set<number>>(new Set());
  const wroteUpTo = useRef(0);  // the scenes of film.tsx Gemini has reached while writing
  const polish = useRef<Record<number, number>>({});
  const gen = useRef(0);
  const looping = useRef(false);
  const mode = useRef<"live" | "replay" | "off">("off");
  const taskN = useRef(0);
  const patch = (p: Partial<FilmDirectorUI> | ((u: FilmDirectorUI) => Partial<FilmDirectorUI>)) => setUi((u) => ({ ...u, ...(typeof p === "function" ? p(u) : p) }));
  const patchCanvas = (p: Partial<DCanvas> | ((c: DCanvas) => Partial<DCanvas>)) => setUi((u) => (u.canvas ? { ...u, canvas: { ...u.canvas, ...(typeof p === "function" ? p(u.canvas) : p) } } : u));

  // ---- the hands ----
  const wait = (ms: number) => {
    const g = gen.current, hurry = mode.current !== "live" ? 1 : queue.current.length > 10 ? 0.55 : queue.current.length > 4 ? 0.8 : 1;
    return new Promise<void>((ok, no) => setTimeout(() => (g === gen.current ? ok() : no(new Error("stopped"))), (ms * hurry) / Math.max(0.25, sp.current)));
  };
  const rectOf = useCallback((sel: string, scroll = true) => {
    const r = root.current, el = r?.querySelector<HTMLElement>(`[data-agent="${sel}"]`);
    if (!r || !el) return null;
    let b = el.getBoundingClientRect();
    if (!b.width || !b.height) return null;
    const visible = () => { const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!h && (el.contains(h) || h.contains(el)); };
    if (!visible() && scroll) { el.scrollIntoView({ block: "nearest", inline: "nearest" }); b = el.getBoundingClientRect(); }
    const a = r.getBoundingClientRect();
    return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
  }, [root]);
  const center = (sel: string) => { const b = rectOf(sel); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null; };
  const say = (label: string) => setCur((c) => ({ ...c, label }));
  const step = (s: string) => { patch((u) => ({ task: u.task ? { ...u.task, step: s } : null })); say(s); };
  const goXY = async (x: number, y: number, label?: string, ms = 650) => { setCur((c) => ({ ...c, x, y, show: true, label: label ?? c.label })); await wait(ms); };
  const go = async (sels: string[], label?: string, ms = 650) => {
    for (const s of sels) { const p = center(s); if (p) { patch({ highlight: s }); await goXY(p.x + 4, p.y + 4, label, ms); return true; } }
    if (label) say(label);
    return false;
  };
  const click = async () => { setCur((c) => ({ ...c, down: true, ripple: c.ripple + 1 })); await wait(150); setCur((c) => ({ ...c, down: false })); await wait(170); };
  const canvasXY = (fx: number, fy: number) => { const b = rectOf("canvas", false); return b ? { x: b.x + fx * b.w, y: b.y + fy * b.h } : null; };
  const type = async (text: string, put: (n: number) => void, per = 40) => { for (let k = 1; k <= text.length; k += 1 + Math.floor(text.length / 60)) { put(k); await wait(per); } put(text.length); };
  const stamp = (text: string, tone: "ok" | "bad" | "info" = "info") => patch({ stamp: { text, tone, key: Date.now() } });
  const cards = () => F.current.storyboard?.cards ?? [];
  const lineOf = (i: number) => F.current.lines[i];
  const cardOf = async (i: number) => {  // a card the runner just drew may reach the page a poll later
    for (let k = 0; k < 12 && !cards()[i]; k++) await wait(500);
    return cards()[i];
  };
  const playVoice = (i: number) => patch({ recording: i });  // the voice track lights up (silent: the page never plays sound by itself)

  // ---- the editor's moves ----
  const openScene = async (i: number, label = `Opening scene ${i + 1}`) => {
    await go([`line-${i}`, `tl-cap-${i}`], label); await click();
    const l = lineOf(i);
    if (l) seekRef.current(l.start + 0.01);
    if (uiRef.current.canvas?.scene !== i) patch({ canvas: { scene: i, layers: [], selected: null, play: 0, look: cards()[i]?.design.look ?? "" } });
    await wait(300);
  };
  const addPiece = async (i: number, c: CardT, k: number) => {
    const a = c.design.actors[k];
    const id = `${i}-${a.name}`, em = emojiOf(a.name, a.draw);
    step(`Adding ${a.name}`);
    await go([`piece-${norm(a.name)}`, "pieces"], `Adding ${a.name}`);
    setCur((cu) => ({ ...cu, down: true, ghost: em }));
    await wait(160);
    const [fx, fy] = slot(k, c.design.actors.length);
    const p = canvasXY(fx + 0.09, fy + 0.12);
    if (p) await goXY(p.x, p.y, undefined, 750);
    setCur((cu) => ({ ...cu, down: false, ghost: null, ripple: cu.ripple + 1 }));
    patchCanvas((cv) => ({ layers: [...cv.layers.filter((l) => l.id !== id), { id, name: a.name, draw: a.draw, emoji: em, kind: "piece", x: fx, y: fy, w: 0.15 }], selected: id }));
    await wait(260);
    const h = center(`h-${id}`);  // pull the corner handle: the piece takes its size
    if (h) {
      step(`Sizing ${a.name}`);
      await goXY(h.x, h.y, undefined, 380);
      setCur((cu) => ({ ...cu, down: true }));
      await goXY(h.x + 26, h.y + 18, undefined, 420);
      patchCanvas((cv) => ({ layers: cv.layers.map((l) => (l.id === id ? { ...l, w: 0.18 } : l)) }));
      setCur((cu) => ({ ...cu, down: false }));
    }
  };
  const keyMove = async (i: number, c: CardT, m: Move) => {
    const l = lineOf(i), at = wordAt(l, m.word), anim = animOf(m, c.design.look), id = `${i}-${m.actor}`;
    if (uiRef.current.canvas?.layers.some((x) => x.id === id)) {
      step(`Selecting ${m.actor}`);
      await go([`layer-${id}`]); await click(); patchCanvas({ selected: id });
    }
    step(`Motion: ${anim}`);
    await go([`anim-${anim}`], `Motion: ${anim}`); await click(); patch({ anim });
    patchCanvas((cv) => ({ layers: cv.layers.map((x) => (x.id === id ? { ...x, anim, at } : x)) }));
    const b = rectOf(`tl-move-${i}`);
    if (b && l) {
      await goXY(b.x + Math.min(0.97, at / Math.max(l.span, 0.1)) * b.w, b.y + b.h / 2, `Key on “${m.word}” at ${at.toFixed(1)}s`, 650);
      await click();
    }
    patch((u) => ({ keys: [...u.keys.filter((k) => !(k.scene === i && k.label === `${anim} · ${m.word}`)), { scene: i, at, label: `${anim} · ${m.word}` }] }));
    await wait(200);
  };
  const addWords = async (i: number, c: CardT) => {
    for (const w of (c.design.words ?? []).slice(0, 2)) {
      step("Text tool");
      await go(["tool-text"]); await click(); patch({ tool: "text" });
      const id = `${i}-text-${w}`, x = 0.72, y = 0.07 + (uiRef.current.canvas?.layers.filter((l) => l.kind === "text").length ?? 0) * 0.1;
      const p = canvasXY(x, y);
      if (p) await goXY(p.x, p.y, `Typing “${w}”`, 550);
      await click();
      patchCanvas((cv) => ({ layers: [...cv.layers.filter((l) => l.id !== id), { id, name: w, draw: "", emoji: "", kind: "text", x, y, w: 0.2, typed: 0, anim: "Pop" }], selected: id }));
      await type(w, (n) => patchCanvas((cv) => ({ layers: cv.layers.map((l) => (l.id === id ? { ...l, typed: n } : l)) })), 70);
      patch({ tool: "select" });
    }
  };
  const addCallouts = async (i: number, c: CardT) => {
    for (const co of (c.design.callouts ?? []).slice(0, 2)) {
      const tid = `${i}-${co.target}`;
      const tgt = uiRef.current.canvas?.layers.find((l) => l.id === tid);
      if (!tgt) continue;
      step(`Callout: “${co.text}”`);
      await go(["tool-text"]); await click(); patch({ tool: "text" });
      const x = Math.min(0.78, tgt.x + tgt.w + 0.03), y = Math.max(0.06, tgt.y - 0.1);  // empty space beside its target
      const p = canvasXY(x, y);
      if (p) await goXY(p.x, p.y, `Labelling ${co.target}${co.part ? `'s ${co.part}` : ""}`, 600);
      await click();
      const id = `${i}-callout-${co.text}`;
      patchCanvas((cv) => ({ layers: [...cv.layers.filter((l) => l.id !== id), { id, name: co.text, draw: co.part ?? "", emoji: "", kind: "callout", x, y, w: 0.18, typed: 0, target: tid, drawn: false, at: wordAt(lineOf(i), co.word) }], selected: id }));
      await type(co.text, (n) => patchCanvas((cv) => ({ layers: cv.layers.map((l) => (l.id === id ? { ...l, typed: n } : l)) })), 60);
      step("Drawing the leader line");  // from the label down onto the part it names
      setCur((cu) => ({ ...cu, down: true }));
      const q = canvasXY(tgt.x + tgt.w / 2, tgt.y + 0.08);
      if (q) await goXY(q.x, q.y, `Pointing at ${co.target}`, 700);
      patchCanvas((cv) => ({ layers: cv.layers.map((l) => (l.id === id ? { ...l, drawn: true } : l)) }));
      setCur((cu) => ({ ...cu, down: false, ripple: cu.ripple + 1 }));
      patch({ tool: "select" });
      await wait(250);
    }
  };
  const playBack = async (i: number, label = `Playing scene ${i + 1} with its voice`) => {
    const l = lineOf(i);
    if (!l) return;
    step(label);
    await go(["preview-play"]); await click();
    patchCanvas((cv) => ({ play: cv.play + 1, selected: null }));
    playVoice(i);
    const dur = Math.min(l.span, 6), t0 = Date.now();
    while (Date.now() - t0 < (dur * 1000) / Math.max(0.25, sp.current)) {
      seekRef.current(l.start + Math.min(dur, ((Date.now() - t0) / 1000) * sp.current));
      await wait(200);
    }
    patch({ recording: null });
    await wait(200);
  };
  /** a whole scene from its card: open it, drag its pieces in, give each move its motion and key, type its words */
  const buildScene = async (i: number, from: "card" | "code") => {
    const c = await cardOf(i);
    if (!c) return;
    built.current.add(i);
    await openScene(i, from === "code" ? `Gemini reached scene ${i + 1}` : `Storyboard card ${c.id}`);
    patchCanvas({ layers: [], look: c.design.look });
    await go(["tab-Card"]); await click(); patch({ tab: "Card" });
    for (let k = 0; k < Math.min(c.design.actors.length, 6); k++) await addPiece(i, c, k);
    for (const m of c.design.moves.slice(0, 5)) await keyMove(i, c, m);
    await addWords(i, c);
    await addCallouts(i, c);
    if (c.design.technique && c.design.technique !== "none") stamp(`Technique: ${c.design.technique}`, "info");
    if (from === "code") await playBack(i);
    stamp(from === "code" ? `Scene ${i + 1} written` : `Card ${c.id} drawn`, "ok");
    await wait(500);
  };

  // ---- the tasks, from the runner's steps ----
  const T = {
    plan: (): Task => ({ title: "Planning the film", run: async () => {
      await go(["step-plan"], "Plan + script"); await click();
      step("Gemini is writing the story");
      await go(["lines"], "Gemini is writing the story", 900);
    } }),
    story: (): Task => ({ title: "Typing the story in", run: async () => {
      const script = F.current.script;
      for (let i = 0; i < script.length; i++) {
        await go([`line-${i}`], `Line ${i + 1}`, 380); await click();
        await type(script[i], (n) => patch({ typing: { i, n } }), 14);
      }
      patch({ typing: null });
    } }),
    voice: (i: number): Task => ({ title: `Recording line ${i + 1}`, run: async () => {
      await go([`tl-voice-${i}`, `line-${i}`], `Recording line ${i + 1}`); await click();
      patch({ recording: i });
      await go(["tab-Audio"]); await click(); patch({ tab: "Audio" });
      await wait(1100);
      patch({ recording: null });
    } }),
    storyboard: (): Task => ({ title: "Drawing the storyboard", run: async () => {
      await go(["step-storyboard"], "Storyboard"); await click();
      await go(["canvas"], "Drawing the storyboard, card by card", 800);
    } }),
    card: (i: number): Task => ({ title: `Card L${String(i + 1).padStart(2, "0")}`, run: () => buildScene(i, "card") }),
    review: (): Task => ({ title: "Your turn", run: async () => {
      await go(["approve-all", "write"], "Your turn: approve the storyboard", 900);
      stamp("Your turn: approve the storyboard", "info");
      await wait(1600);
    } }),
    write: (): Task => ({ title: "Writing the film", run: async () => {
      await go(["step-write"], "Write the film"); await click();
      await go(["tab-Code"], "Gemini is writing film.tsx"); await click(); patch({ tab: "Code" });
      await wait(1200);
    } }),
    build: (i: number): Task => ({ title: `Building scene ${i + 1}`, run: () => buildScene(i, "code") }),
    stampT: (text: string, tone: "ok" | "bad" | "info", sel = "canvas"): Task => ({ title: text, run: async () => { await go([sel, "canvas"], text, 500); stamp(text, tone); await wait(1000); } }),
    fix: (text: string): Task => ({ title: "Fixing", run: async () => {
      stamp("A problem to fix", "bad");
      const l = uiRef.current.canvas?.layers[0];
      if (l) {
        step(text.slice(0, 60)); await go([`layer-${l.id}`]); await click(); patchCanvas({ selected: l.id });
        const p = center(`layer-${l.id}`);
        if (p) { setCur((c) => ({ ...c, down: true })); await goXY(p.x - 24, p.y + 12, "Putting it right", 550); setCur((c) => ({ ...c, down: false })); }
      }
      await wait(400);
    } }),
    render: (): Task => ({ title: "Rendering the film", run: async () => {
      await go(["render"], "Export · 1080p"); await click();
      patch({ render: { done: 0, total: 1, ready: false } });
      if (mode.current === "replay") for (let k = 1; k <= 20; k++) { patch({ render: { done: k, total: 20, ready: false } }); await wait(140); }
    } }),
    done: (): Task => ({ title: "The film is ready", run: async () => {
      patch({ render: { done: 1, total: 1, ready: true } });
      await go(["render"], "Done"); await click();
      stamp("The film is ready", "ok");
      await wait(1800);
      patch({ render: null });
    } }),
  };

  const fromEvent = (e: LiveEvent): Task | null => {
    const i = e.scene ?? 0;
    switch (e.kind) {
      case "plan": case "planning": return T.plan();
      case "story": return T.story();
      case "voice": return T.voice(i);
      case "storyboard": return T.storyboard();
      case "card": return T.card(i);
      case "review": return T.review();
      case "redraw": return T.stampT(`Your note on L${String(i + 1).padStart(2, "0")}`, "info", `line-${i}`);
      case "write": return /^Writing the film/.test(e.text) ? T.write() : null;
      case "ok": return T.stampT(/compiles/.test(e.text) ? "Compiles ✓" : "Only the storyboard's words ✓", "ok");
      case "fix": return T.fix(e.text);
      case "error": return T.stampT("Stopped: see the Agent tab", "bad");
      case "render": return uiRef.current.render ? null : T.render();
      case "done": return T.done();
      default: return null;
    }
  };

  /** between steps: keep working the scene in hand, a different move each time, then wait watching */
  const POLISH: ((i: number) => Promise<void>)[] = [
    async (i) => {  // snap the pieces to the grid
      step("Snapping to the grid");
      await go(["tool-move"]); await click(); patch({ tool: "move" });
      for (const l of (uiRef.current.canvas?.layers ?? []).filter((x) => x.kind === "piece").slice(0, 3)) {
        await go([`layer-${l.id}`], `Snapping scene ${i + 1} to the grid`, 420);
        setCur((c) => ({ ...c, down: true }));
        patchCanvas((cv) => ({ selected: l.id, layers: cv.layers.map((x) => (x.id === l.id ? { ...x, x: Math.round(x.x * 20) / 20, y: Math.round(x.y * 20) / 20 } : x)) }));
        await wait(300);
        setCur((c) => ({ ...c, down: false, ripple: c.ripple + 1 }));
      }
      patch({ tool: "select" });
    },
    async (i) => {  // the word the scene turns on gets the caption highlight
      const c = cards()[i], l = lineOf(i), m = c?.design.moves[0];
      if (!c || !l || !m) return;
      step(`Caption highlight on “${m.word}”`);
      await go(["tab-Captions"]); await click(); patch({ tab: "Captions" });
      const k = l.words.findIndex((w) => norm(w.w) === norm(m.word.split(/\s+/)[0] ?? ""));
      if (k >= 0) { await go([`word-${k}`]); await click(); }
      patch({ capWord: norm(m.word.split(/\s+/)[0] ?? "") });
    },
    async (i) => {  // a close look at the spacing
      const b = rectOf("canvas", false);
      if (!b) return;
      setCur((c) => ({ ...c, lens: true }));
      for (const l of (uiRef.current.canvas?.layers ?? []).slice(0, 3)) await goXY(b.x + (l.x + l.w / 2) * b.w, b.y + (l.y + 0.1) * b.h, `Checking the spacing in scene ${i + 1}`, 520);
      setCur((c) => ({ ...c, lens: false }));
    },
    async (i) => { await playBack(i, `Playing scene ${i + 1} again`); },
  ];
  const idle = async () => {
    const lv = Lv.current;
    const r = lv?.render;
    if (r && r.stage !== "done" && lv?.events.at(-1)?.kind === "render") {
      if (!uiRef.current.render) await T.render().run();
      patch({ render: { done: r.done, total: r.total, ready: false } });
      await wait(600);
      return;
    }
    const on = uiRef.current.canvas?.scene;
    if (on == null) { await go(["canvas"], (lv?.events.at(-1)?.text ?? "Working").slice(0, 48), 900); await wait(1500); return; }
    const k = polish.current[on] ?? 0;
    if (k >= POLISH.length) { await go(["canvas"], `Scene ${on + 1} is set · Gemini is still writing`, 900); await wait(2500); return; }
    polish.current[on] = k + 1;
    patch((u) => ({ task: { n: u.task?.n ?? taskN.current, title: `Polishing scene ${on + 1}`, step: "" } }));
    await POLISH[k](on);
    await wait(400);
  };

  const loop = async () => {
    if (looping.current) return;
    looping.current = true;
    const g = gen.current;
    try {
      while (g === gen.current && mode.current !== "off") {
        const t = queue.current.shift();
        patch({ next: queue.current.slice(0, 5).map((x) => x.title) });
        if (t) {
          taskN.current += 1;
          patch({ task: { n: taskN.current, title: t.title, step: "" } });
          try { await t.run(); } catch (e) { if ((e as Error).message === "stopped") throw e; }
          continue;
        }
        if (mode.current === "replay") { mode.current = "off"; break; }
        if (!Lv.current?.running.length) { await wait(1200); if (!Lv.current?.running.length) break; continue; }
        try { await idle(); } catch (e) { if ((e as Error).message === "stopped") throw e; }
      }
    } catch { /* stopped */ }
    looping.current = false;
    if (g === gen.current) { setCur((c) => ({ ...c, show: false })); patch({ on: false, task: null, next: [], highlight: null }); mode.current = "off"; }
  };

  const stop = useCallback(() => {
    gen.current += 1;
    mode.current = "off";
    queue.current = [];
    setCur((c) => ({ ...c, show: false, lens: false, ghost: null }));
    setUi(EMPTY);
    looping.current = false;
  }, []);

  /** a finished film, made again in front of you: the story, the voices, the cards, each scene, the export */
  const replay = useCallback(() => {
    stop();
    gen.current += 1;
    mode.current = "replay";
    built.current = new Set();
    polish.current = {};
    taskN.current = 0;
    const n = F.current.storyboard?.cards.length ?? 0;
    queue.current = [T.plan(), T.story(), ...Array.from({ length: Math.min(n, 3) }, (_, i) => T.voice(i)), T.storyboard(),
      ...Array.from({ length: n }, (_, i) => T.card(i)), T.write(), ...Array.from({ length: n }, (_, i) => T.build(i)),
      T.stampT("Compiles ✓", "ok"), T.render(), T.done()];
    setUi({ ...EMPTY, on: true });
    setTimeout(() => loop(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop]);

  // live: the runner's real steps become tasks, in order; the code reaching a new scene builds that scene
  useEffect(() => {
    if (!active || !live) { if (mode.current === "live") stop(); return; }
    if (mode.current === "replay") return;
    if (!live.running.length && mode.current !== "live") return;
    if (mode.current === "off") {
      mode.current = "live";
      gen.current += 1;
      taskN.current = 0;
      for (const e of live.events) seen.current.add(`${e.t}|${e.text}`);  // what happened before you opened it is Replay's, not acted again
      wroteUpTo.current = live.write?.state === "streaming" ? sceneCount(live.write.text) : 0;
      setUi({ ...EMPTY, on: true });
    }
    for (const e of live.events) {
      const k = `${e.t}|${e.text}`;
      if (seen.current.has(k)) continue;
      seen.current.add(k);
      const t = fromEvent(e);
      if (t) queue.current.push(t);
    }
    const w = live.write;
    if (w && w.state === "streaming" && live.running.some((r) => r === "write" || r === "redo")) {
      if (w.scene !== undefined) {  // a rewrite of one line
        if (!built.current.has(1000 + w.scene)) { built.current.add(1000 + w.scene); queue.current.push(T.build(w.scene)); }
      } else {
        const n = sceneCount(w.text);  // a scene is built once Gemini has moved past it (its code is complete)
        for (let k = wroteUpTo.current; k < n - 1; k++) queue.current.push(T.build(k));
        wroteUpTo.current = Math.max(wroteUpTo.current, n - 1);
      }
    }
    if (w && w.state === "done" && w.scene === undefined && wroteUpTo.current > 0) {
      const total = F.current.storyboard?.cards.length ?? 0;
      for (let k = wroteUpTo.current; k < total; k++) queue.current.push(T.build(k));
      wroteUpTo.current = total;
    }
    if (live.render && uiRef.current.render && live.render.stage !== "done") patch({ render: { done: live.render.done, total: live.render.total, ready: false } });
    loop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.events, live?.running, live?.write?.lines, live?.write?.state, live?.render, active]);

  useEffect(() => () => { gen.current += 1; }, []);
  useEffect(() => { if (!ui.stamp) return; const id = setTimeout(() => patch({ stamp: null }), 2000); return () => clearTimeout(id); }, [ui.stamp]);

  return { ui, cur, replay, stop };
}

/** how many scene components the streamed code has declared so far */
function sceneCount(code: string): number {
  let n = 0;
  for (const m of code.matchAll(/^(?:export\s+)?(?:const|function)\s+Scene(\d+)\b/gm)) n = Math.max(n, Number(m[1]));
  return n;
}

/** the scene on the editor's canvas as the director builds it: the film's ground, its pieces with their motion */
export function DirectorCanvas({ c, ground, words, local, capWord }: { c: DCanvas; ground: string; words: { w: string; s: number; e: number }[]; local: number; capWord: string | null }) {
  const g = groundCss(ground);
  const dark = g.dark;
  const ink = dark ? "#f1efe8" : "#1f1c1b";
  const enter = (a?: string) => a === "Slide" ? { x: -60, opacity: 0 } : a === "Grow" ? { scaleY: 0, opacity: 0 } : a === "Draw" ? { clipPath: "inset(0 100% 0 0)" } : a === "Path" ? { x: -120, opacity: 0 } : a === "Shake" ? { rotate: -8, opacity: 0 } : { scale: 0.2, opacity: 0 };
  const shown = { x: 0, scale: 1, scaleY: 1, rotate: 0, opacity: 1, clipPath: "inset(0 0% 0 0)" };
  const look = c.look;
  const card = look === "paper" || look === "papercollage" ? "bg-[#fff7e8] shadow-[4px_6px_0_rgb(31_28_27/0.18)] rounded-[14px]" : look === "collage" ? "bg-white shadow-[0_8px_18px_-6px_rgb(0_0_0/0.35)] rotate-[-2deg]" : look === "kinetic" ? "bg-transparent" : "bg-white/90 rounded-[12px]";
  const wi = words.findIndex((w) => local < w.e);
  const from = Math.max(0, Math.floor(Math.max(wi, 0) / 8) * 8);
  return (
    <div data-agent="canvas" className="absolute inset-0 overflow-hidden" style={g.style}>
      <span className="absolute left-3 top-3 rounded-full bg-[#1f1c1b] px-2.5 py-1 font-mono text-[11px] font-bold text-[#a6f04a]">Scene {c.scene + 1}{look ? ` · ${look}` : ""} · {ground}</span>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {c.layers.filter((l) => l.kind === "callout" && l.drawn).map((l) => {
          const t = c.layers.find((x) => x.id === l.target);
          if (!t) return null;
          const x1 = (l.x + 0.01) * 100, y1 = (l.y + 0.05) * 100, x2 = (t.x + t.w / 2) * 100, y2 = (t.y + 0.1) * 100;
          return <motion.path key={`${l.id}-${c.play}`} d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 6} ${x2} ${y2}`} fill="none" stroke={dark ? "#f6f39a" : "#e0a400"} strokeWidth="0.45" strokeDasharray="1.4 1"
            vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2.5 }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: c.play ? Math.min(5, l.at ?? 0) : 0 }} />;
        })}
      </svg>
      {c.layers.map((l) => (
        <motion.div key={l.id} data-agent={`layer-${l.id}`} className="absolute" initial={false} animate={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%` }} transition={{ type: "spring", stiffness: 140, damping: 20 }}>
          <motion.div key={`${l.id}-${c.play}`} initial={c.play ? enter(l.anim) : { scale: 0.4, opacity: 0 }} animate={shown} transition={{ duration: c.play ? 0.7 : 0.35, delay: c.play ? Math.min(5, l.at ?? 0) : 0, ease }}
            style={{ transformOrigin: "bottom center" }}>
            {l.kind === "callout" ? (
              <div className="inline-block whitespace-nowrap bg-[#ffd400] px-2 py-0.5 text-[clamp(12px,1.4vw,19px)] font-extrabold text-[#1f1c1b] shadow-[0_4px_10px_-4px_rgb(0_0_0/0.4)]">
                {l.name.slice(0, l.typed ?? l.name.length)}{(l.typed ?? l.name.length) < l.name.length && <motion.span className="ml-0.5 inline-block h-[0.9em] w-[3px] bg-[#1f1c1b] align-middle" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />}
              </div>
            ) : l.kind === "piece" ? (
              <div className={`border-2 p-2 text-center ${card}`} style={{ borderColor: ink, color: ink }}>
                <div className="text-[clamp(24px,3.6vw,52px)] leading-none">{l.emoji}</div>
                <div className="mt-1 truncate text-[clamp(10px,1vw,14px)] font-extrabold">{l.name}</div>
              </div>
            ) : (
              <div className="inline-block whitespace-nowrap rounded-[8px] border-2 border-[#1f1c1b] bg-[#f6f39a] px-2 py-0.5 text-[clamp(13px,1.6vw,22px)] font-extrabold text-[#1f1c1b]">
                {l.name.slice(0, l.typed ?? l.name.length)}{(l.typed ?? l.name.length) < l.name.length && <motion.span className="ml-0.5 inline-block h-[0.9em] w-[3px] bg-[#1f1c1b] align-middle" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />}
              </div>
            )}
          </motion.div>
          {l.anim && l.kind !== "callout" && <span className="absolute -bottom-6 left-0 rounded-full bg-[#1f1c1b] px-1.5 py-0.5 text-[10px] font-bold text-[#a6f04a]">{l.anim}{l.at ? ` @ ${l.at.toFixed(1)}s` : ""}</span>}
          {c.selected === l.id && (<>
            <div className="pointer-events-none absolute -inset-1.5 rounded-[6px] border-2 border-[#a6f04a]" />
            {["-left-2 -top-2", "-right-2 -top-2", "-left-2 -bottom-2"].map((p) => <span key={p} className={`absolute ${p} size-3 rounded-[3px] border-2 border-[#1f1c1b] bg-white`} />)}
            <span data-agent={`h-${l.id}`} className="absolute -bottom-2 -right-2 size-3 rounded-[3px] border-2 border-[#1f1c1b] bg-white" />
          </>)}
        </motion.div>
      ))}
      {words.length > 0 && <div className="absolute inset-x-0 bottom-3 flex justify-center px-6"><span className="rounded-[12px] bg-black/75 px-3 py-1.5 text-center text-[clamp(12px,1.4vw,18px)] font-bold text-white">
        {words.slice(from, from + 8).map((w, k) => { const on = from + k === wi, key = capWord && norm(w.w) === capWord;
          return <span key={k} className={key ? "rounded-[4px] px-0.5" : ""} style={{ color: on ? "#a6f04a" : undefined, background: key ? "rgb(166 240 74 / 0.3)" : undefined }}>{w.w} </span>; })}</span></div>}
    </div>
  );
}

/** the editor's hand on screen: the cursor, its label, and the piece it is dragging */
export function FilmCursor({ cur }: { cur: Cur }) {
  if (!cur.show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {cur.ghost && <motion.div key="ghost" initial={{ opacity: 0, scale: 0.6, x: cur.x - 30, y: cur.y - 30 }} animate={{ opacity: 0.95, scale: 1, x: cur.x - 30, y: cur.y - 30 }} exit={{ opacity: 0, scale: 0.4 }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }} className="absolute left-0 top-0 grid size-[60px] place-items-center rounded-[12px] border-2 border-[#1f1c1b] bg-white text-[32px] shadow-[0_14px_34px_-8px_rgb(0_0_0/0.6)]">{cur.ghost}</motion.div>}
      </AnimatePresence>
      <motion.div className="absolute left-0 top-0" initial={false} animate={{ x: cur.x, y: cur.y }} transition={{ type: "spring", stiffness: 120, damping: 19, mass: 0.9 }}>
        <AnimatePresence>{cur.lens && <motion.span key="lens" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
          className="absolute -left-[50px] -top-[50px] size-[100px] rounded-full border-[3px] border-white bg-white/10 shadow-[0_0_0_2px_#a6f04a,0_10px_30px_-6px_rgb(0_0_0/0.5)]" />}</AnimatePresence>
        <motion.span className="absolute -left-5 -top-5 size-10 rounded-full bg-[#a6f04a]/35 blur-[6px]" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
        <motion.span key={cur.ripple} initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.6 }} className="absolute -left-4 -top-4 size-8 rounded-full border-[3px] border-[#a6f04a]" />
        <motion.svg width="34" height="39" viewBox="0 0 26 30" animate={{ scale: cur.down ? 0.84 : 1 }} className="relative drop-shadow-[0_6px_10px_rgb(0_0_0/0.45)]">
          <path d="M3 2 L3 24 L9 18.5 L13 27.5 L17 25.8 L13 17 L21 17 Z" fill="#1f1c1b" stroke="#a6f04a" strokeWidth="2" strokeLinejoin="round" />
        </motion.svg>
        <AnimatePresence mode="wait">
          {cur.label && <motion.span key={cur.label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="absolute left-[28px] top-[32px] flex items-center gap-1.5 whitespace-nowrap rounded-full rounded-tl-[4px] bg-[#a6f04a] px-2.5 py-1 text-[12.5px] font-bold text-[#1f1c1b] shadow-[0_6px_16px_-6px_rgb(0_0_0/0.4)]">
            <span className="grid size-4 place-items-center rounded-full bg-[#1f1c1b] text-[9px] text-[#a6f04a]">G</span>{cur.label}</motion.span>}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/** the director's stamp and the export dialog, over the preview */
export function DirectorOverlays({ ui, lines }: { ui: FilmDirectorUI; lines: number }) {
  const f = ui.render ? (ui.render.ready ? 1 : ui.render.done / Math.max(1, ui.render.total)) : 0;
  return (<>
    <AnimatePresence>
      {ui.stamp && <motion.div key={ui.stamp.key} initial={{ opacity: 0, scale: 1.4, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: -3 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className={`pointer-events-none absolute right-5 top-5 z-20 rounded-[12px] border-[3px] px-4 py-2 text-[17px] font-extrabold shadow-[0_10px_30px_-8px_rgb(0_0_0/0.6)] ${ui.stamp.tone === "ok" ? "border-[#1f1c1b] bg-[#a6f04a] text-[#1f1c1b]" : ui.stamp.tone === "bad" ? "border-white bg-[#e8402c] text-white" : "border-[#1f1c1b] bg-white text-[#1f1c1b]"}`}>
        {ui.stamp.tone === "ok" ? "✓ " : ui.stamp.tone === "bad" ? "! " : ""}{ui.stamp.text}</motion.div>}
    </AnimatePresence>
    <AnimatePresence>{ui.render && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 grid place-items-center bg-black/55 backdrop-blur-[2px]">
        <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-[min(420px,80%)] rounded-[18px] bg-white p-5 text-[#1f1c1b] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]">
          <div className="text-[17px] font-bold">{ui.render.ready ? "✓ The film is ready" : "Exporting · 1080p"}</div>
          <div className="mt-1 text-[13px] text-[#8a857f]">{lines} scenes · voice, captions and motion</div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#ecebe5]"><motion.div className="h-full rounded-full bg-[#a6f04a]" animate={{ width: `${f * 100}%` }} transition={{ duration: 0.4 }} /></div>
          <div className="mt-2 flex justify-between font-mono text-[12px] text-[#8a857f]"><span>{ui.render.ready ? "done" : "rendering frames"}</span><span>{Math.round(f * 100)}%</span></div>
        </motion.div>
      </motion.div>)}</AnimatePresence>
  </>);
}
