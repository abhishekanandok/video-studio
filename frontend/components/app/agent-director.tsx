"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { elementsFrom, type El, type Live, type LiveEvent, type Stamp } from "./motion-live";

/* The agent as an editor (components/app/motion-editor.tsx). The agent does many things at once (it writes two scenes
   in parallel, finds fourteen pictures in a burst); here every thing it does becomes one TASK in a queue, and the tasks
   play one at a time the way a person edits: open the scene, put the backdrop down, drag each picture in and size it,
   type the words on top, give them motion on a word of the line, play the voice to check it, set the transition,
   then render. The queue comes from the agent's real steps (live/events.jsonl); while the agent is thinking with no
   new step, the editor keeps working the scene the agent is on. "Replay" plays a finished film's making the same way.
   Elements it works on are marked data-agent="..." in the editor. */

export type Tab = "Agent" | "Scene" | "Captions" | "Audio";
export type Layer = { id: string; kind: "pic" | "text" | "fx"; url?: string; text?: string; typed?: number; x: number; y: number; w: number; anim?: string; at?: number; small?: boolean; color?: string;
  fx?: "particles" | "water" | "sun" | "flow" | "marker"; variant?: string };
export type Canvas = { scene: number; backdrop: string; ground: boolean; layers: Layer[]; selected: string | null; play: number; real: string | null; drift?: boolean };
export type Key = { scene: number; at: number; label: string };
export type DirectorUI = {
  on: boolean; search: string; tab: Tab | null; tool: "select" | "text" | "move"; canvas: Canvas | null; keys: Key[];
  audio: { scene: number; from: number; dur: number; key: number } | null; stamp: Stamp; anim: string | null; highlight: string | null;
  render: { done: number; total: number; ready: boolean } | null; task: { n: number; title: string; step: string; scene: number | null } | null; next: string[];
  capWord: string | null;
};
export type DScene = { i: number; line: string; beat: string; start: number; span: number; transition: string; data: string; voice: string; backdrop: string; backdrop_kind: string;
  backdrop_query: string; stills: string[]; words: { w: string; s: number; e: number }[]; assets: { name: string; kind: string; query: string; url: string }[] };
type Cur = { x: number; y: number; label: string; down: boolean; ghost: string | null; ripple: number; lens: boolean; show: boolean };
type Task = { title: string; scene: number | null; run: () => Promise<void> };
export type DirectorSettings = { speed: number; sound: boolean };

const EMPTY: DirectorUI = { on: false, search: "", tab: null, tool: "select", canvas: null, keys: [], audio: null, stamp: null, anim: null, highlight: null, render: null, task: null, next: [], capWord: null };
const SLOTS: [number, number][] = [[0.6, 0.2], [0.1, 0.44], [0.64, 0.52], [0.34, 0.58], [0.08, 0.14]];
const MOTION: Record<string, string> = { process: "Draw", graph: "Draw", cycle: "Float", compare: "Slide", number: "Pop", timeline: "Slide", map: "Zoom", photo: "Zoom" };
const clean = (w: string) => w.replace(/[^\p{L}\p{N}'-]/gu, "");

/** the words to type on top of a scene: its data, else the strongest words of its line */
function headline(sc: DScene) {
  if (sc.data) return sc.data.split(/[|;]/)[0].trim().slice(0, 34);
  const ws = sc.line.split(/\s+/).map(clean).filter((w) => w.length > 3);
  const top = [...ws].sort((a, b) => b.length - a.length).slice(0, 3);
  return ws.filter((w) => top.includes(w)).slice(0, 3).join(" ").replace(/^./, (c) => c.toUpperCase());
}
/** the word the main motion lands on: one that names a picture, else the longest */
function cue(sc: DScene) {
  const names = sc.assets.map((a) => a.name.toLowerCase());
  return sc.words.find((w) => clean(w.w).length > 3 && names.some((n) => n.includes(clean(w.w).toLowerCase()))) ?? [...sc.words].sort((a, b) => clean(b.w).length - clean(a.w).length)[0];
}

export function useDirector({ root, scenes, live, origin, active, settings, onSeek, palette }: {
  root: RefObject<HTMLDivElement | null>; scenes: DScene[]; live: Live | undefined; origin: string; active: boolean; settings: DirectorSettings; onSeek: (t: number) => void; palette: string[];
}) {
  const [ui, setUi] = useState<DirectorUI>(EMPTY);
  const [cur, setCur] = useState<Cur>({ x: 0, y: 0, label: "", down: false, ghost: null, ripple: 0, lens: false, show: false });
  const S = useRef(scenes), L = useRef(live), set = useRef(settings), seekRef = useRef(onSeek);
  S.current = scenes; L.current = live; set.current = settings; seekRef.current = onSeek;
  const queue = useRef<Task[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const built = useRef<Set<number>>(new Set());
  const kept = useRef<Record<number, { backdrop: string; layers: Layer[] }>>({});  // what it placed in each scene: reopening a scene shows it again
  const polish = useRef<Record<number, number>>({});
  const placed = useRef<Record<number, Set<string>>>({});  // the pieces of the agent's code already shown on each scene  // how far through its polishing list each scene is (never the same move twice in a row)
  const pal = useRef(palette);
  pal.current = palette;
  const gen = useRef(0);  // bumped to stop: every wait of an old run throws
  const runningLoop = useRef(false);
  const mode = useRef<"live" | "replay" | "off">("off");
  const taskN = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const uiRef = useRef(ui);
  uiRef.current = ui;
  if (ui.canvas && ui.canvas.layers.length) kept.current[ui.canvas.scene] = { backdrop: ui.canvas.backdrop, layers: ui.canvas.layers };
  const patch = (p: Partial<DirectorUI> | ((u: DirectorUI) => Partial<DirectorUI>)) => setUi((u) => ({ ...u, ...(typeof p === "function" ? p(u) : p) }));
  const patchCanvas = (p: Partial<Canvas> | ((c: Canvas) => Partial<Canvas>)) => setUi((u) => (u.canvas ? { ...u, canvas: { ...u.canvas, ...(typeof p === "function" ? p(u.canvas) : p) } } : u));

  // ---- the hands: wait, find, move, click, drag, type ----
  const wait = (ms: number) => {
    // live: catch up a little when steps pile up, never so fast a person cannot follow what the agent did
    const g = gen.current, burst = mode.current !== "live" ? 1 : queue.current.length > 12 ? 0.6 : queue.current.length > 4 ? 0.8 : 1;
    return new Promise<void>((ok, no) => setTimeout(() => (g === gen.current ? ok() : no(new Error("stopped"))), (ms * burst) / Math.max(0.25, set.current.speed)));
  };
  const rectOf = useCallback((sel: string, scroll = true) => {
    const r = root.current, el = r?.querySelector<HTMLElement>(`[data-agent="${sel}"]`);
    if (!r || !el) return null;
    let b = el.getBoundingClientRect();
    if (!b.width || !b.height) return null;
    const visible = () => { const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!h && (el.contains(h) || h.contains(el)); };
    if (!visible() && scroll) { el.scrollIntoView({ block: "nearest", inline: "nearest" }); b = el.getBoundingClientRect(); }  // scroll the panel to it, as a person would
    if (!visible()) return null;
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
  const type = async (text: string, put: (s: string) => void, per = 55) => { for (let k = 1; k <= text.length; k++) { put(text.slice(0, k)); await wait(per); } };
  const stamp = (text: string, tone: "ok" | "bad" | "info" = "info") => patch({ stamp: { text, tone, key: Date.now() } });
  const playVoice = (sc: DScene, from: number, dur: number) => {
    patch({ audio: { scene: sc.i, from, dur, key: Date.now() } });
    if (set.current.sound && sc.voice) {
      try {
        audio.current ??= new Audio();
        audio.current.src = origin + sc.voice;
        audio.current.currentTime = from;
        audio.current.play().catch(() => {});
      } catch { /* no sound: the picture still plays */ }
    }
  };
  const stopVoice = () => { audio.current?.pause(); patch({ audio: null }); };

  /** a scene as it stands, all at once (opening the editor mid-way: no replay of what already happened) */
  const compose = (sc: DScene): Canvas => sc.stills.length
    // the agent has drawn it: its real frame, nothing made up
    ? { scene: sc.i, backdrop: sc.backdrop, ground: true, selected: null, play: 0, real: sc.stills[1] ?? sc.stills[0], drift: false, layers: [] }
    : { scene: sc.i, backdrop: sc.backdrop, ground: true, selected: null, play: 0, real: null, drift: true,
        layers: sc.assets.filter((a) => a.url).slice(0, 4).map((a, k) => ({ id: `${sc.i}-${a.name}`, kind: "pic" as const, url: a.url, x: SLOTS[k][0], y: SLOTS[k][1], w: 0.2, anim: "Pop", at: 0.3 + k * 0.4 })) };

  /** put one piece the agent just wrote into the scene, the way an editor would add it */
  const enact = async (sc: DScene, e: El) => {
    const fxLayer = (fx: Layer["fx"], x: number, y: number, w: number, variant = "") => patchCanvas((c) => ({ layers: [...c.layers.filter((l) => l.id !== `${sc.i}-${e.key}`), { id: `${sc.i}-${e.key}`, kind: "fx", fx, variant, x, y, w }] }));
    const at = (fx: number, fy: number, label: string) => { const p = canvasXY(fx, fy); return p ? goXY(p.x, p.y, label, 650) : wait(400); };
    step(`Agent wrote: ${e.kind === "cue" ? `a move on “${e.text}”` : e.text}`);
    switch (e.kind) {
      case "backdrop": case "depth": await at(0.5, 0.5, e.text); await click(); patchCanvas({ drift: true }); break;
      case "particles": await at(0.5, /rising|Vapour|Bubbles/i.test(e.text) ? 0.6 : 0.3, e.text); await click(); fxLayer("particles", 0, 0, 1, e.text); break;
      case "water": await at(0.5, 0.85, e.text); await click(); fxLayer("water", 0, 0.72, 1); break;
      case "sun": { const a = Number(e.text.match(/-?\d+/)?.[0] ?? 135); const fx0 = a > 90 && a < 270 ? 0.84 : 0.14; await at(fx0, 0.16, e.text); await click(); fxLayer("sun", fx0 - 0.06, 0.06, 0.12, String(a)); break; }
      case "flow": await at(0.45, 0.5, e.text); await click(); fxLayer("flow", 0.1, 0.25, 0.8); break;
      case "marker": { const l = uiRef.current.canvas?.layers.find((x) => x.kind === "pic"); if (l) { await go([`layer-${l.id}`], e.text); await click(); fxLayer("marker", l.x - 0.02, l.y - 0.03, l.w + 0.04); } break; }
      case "photo": case "picture": {
        if (uiRef.current.canvas?.real) { await at(0.5, 0.5, `Placing ${e.text}`); await click(); break; }  // it is in the real frame already
        const a = sc.assets.find((x) => x.url && x.name.replace(/[_-]/g, " ") === e.text);
        const l = a && uiRef.current.canvas?.layers.find((x) => x.id === `${sc.i}-${a.name}`);
        if (l) { await go([`layer-${l.id}`], `Placing ${e.text}`); await click(); patchCanvas({ selected: l.id }); }
        else if (a) await addPicture(sc, a, uiRef.current.canvas?.layers.filter((x) => x.kind === "pic").length ?? 0);
        break;
      }
      case "label": {
        const pics = uiRef.current.canvas?.layers.filter((x) => x.kind === "pic") ?? [];
        const near = pics[(placed.current[sc.i]?.size ?? 0) % Math.max(1, pics.length)];
        const x = near ? Math.min(0.78, near.x + near.w * 0.6) : 0.4, y = near ? Math.max(0.05, near.y - 0.06) : 0.2;
        await go(["tool-text"]); await click(); patch({ tool: "text" });
        await at(x, y, `Label: ${e.text}`); await click();
        const id = `${sc.i}-${e.key}`;
        patchCanvas((c) => ({ layers: [...c.layers, { id, kind: "text", text: e.text, typed: 0, x, y, w: 0.2, small: true }], selected: id }));
        await type(e.text, (t) => patchCanvas((c) => ({ layers: c.layers.map((l) => (l.id === id ? { ...l, typed: t.length } : l)) })), 45);
        patch({ tool: "select" });
        break;
      }
      case "cue": {
        const w = sc.words.find((x) => clean(x.w).toLowerCase() === e.text.toLowerCase());
        const b = rectOf(`tl-vis-${sc.i}`);
        if (w && b) { await goXY(b.x + Math.min(0.96, w.s / Math.max(sc.span, 0.1)) * b.w, b.y + b.h / 2, `Timing a move to “${e.text}”`, 700); await click();
          patch((u) => ({ keys: [...u.keys, { scene: sc.i, at: w.s, label: `on “${e.text}”` }] })); }
        break;
      }
    }
    await wait(350);
  };

  // ---- the editor's moves, each made of the hands ----
  const openScene = async (sc: DScene, label = `Opening scene ${sc.i + 1}`) => {
    await go([`tl-vis-${sc.i}`, `thumb-${sc.i}`], label);
    await click();
    seekRef.current(sc.start + 0.01);
    if (uiRef.current.canvas?.scene !== sc.i) {
      const k = kept.current[sc.i];
      if (mode.current === "live" && sc.stills.length) patch({ canvas: compose(sc) });  // live: a drawn scene opens as it really is
      else patch({ canvas: { scene: sc.i, backdrop: k?.backdrop ?? "", ground: !!k, layers: k?.layers ?? [], selected: null, play: 0, real: null } });
    }
    await wait(350);
  };
  const putBackdrop = async (sc: DScene) => {
    if (sc.backdrop) {
      step(`Backdrop: ${sc.backdrop_kind === "photo" ? "real photo" : sc.backdrop_kind || "painted"}`);
      await go([`thumb-${sc.i}`, "search"]);
      setCur((c) => ({ ...c, down: true, ghost: sc.backdrop }));
      await wait(200);
      const p = canvasXY(0.5, 0.45);
      if (p) await goXY(p.x, p.y, undefined, 800);
      setCur((c) => ({ ...c, down: false, ghost: null, ripple: c.ripple + 1 }));
      patchCanvas({ backdrop: sc.backdrop, ground: true });
    } else {
      step("Theme ground");
      const p = canvasXY(0.5, 0.45);
      if (p) await goXY(p.x, p.y, undefined, 600);
      await click();
      patchCanvas({ ground: true });
    }
    await wait(450);
  };
  const addPicture = async (sc: DScene, a: DScene["assets"][number], k: number) => {
    const name = a.name.replace(/[_-]/g, " ");
    step(`Adding ${name}`);
    if (!(await go([`pic-${sc.i}-${a.name}`]))) {  // not in view: search for it
      await go(["search"]); await click();
      await type(name.slice(0, 22), (s) => patch({ search: s }), 40);
      await go([`pic-${sc.i}-${a.name}`]);
    }
    patch({ search: "" });
    setCur((c) => ({ ...c, down: true, ghost: a.url }));
    await wait(180);
    const [fx, fy] = SLOTS[k % SLOTS.length], id = `${sc.i}-${a.name}`;
    const p = canvasXY(fx + 0.1, fy + 0.12);
    if (p) await goXY(p.x, p.y, undefined, 800);
    setCur((c) => ({ ...c, down: false, ghost: null, ripple: c.ripple + 1 }));
    patchCanvas((c) => ({ layers: [...c.layers.filter((l) => l.id !== id), { id, kind: "pic", url: a.url, x: fx, y: fy, w: 0.16 }], selected: id }));
    await wait(300);
    step(`Sizing ${name}`);  // grab the corner handle and pull
    const h = center(`h-${id}`);
    if (h) {
      await goXY(h.x, h.y, undefined, 450);
      setCur((c) => ({ ...c, down: true }));
      await goXY(h.x + 34, h.y + 22, undefined, 500);
      patchCanvas((c) => ({ layers: c.layers.map((l) => (l.id === id ? { ...l, w: 0.21 } : l)) }));
      setCur((c) => ({ ...c, down: false }));
      await wait(250);
    }
  };
  const addText = async (sc: DScene) => {
    const text = headline(sc);
    if (!text) return;
    step("Text tool");
    await go(["tool-text"]); await click();
    patch({ tool: "text" });
    const p = canvasXY(0.07, 0.1);
    if (p) await goXY(p.x, p.y, "Typing the words on top", 600);
    await click();
    const id = `${sc.i}-text`;
    patchCanvas((c) => ({ layers: [...c.layers.filter((l) => l.id !== id), { id, kind: "text", text, typed: 0, x: 0.06, y: 0.07, w: 0.5 }], selected: id }));
    await type(text, (s) => patchCanvas((c) => ({ layers: c.layers.map((l) => (l.id === id ? { ...l, typed: s.length } : l)) })), 60);
    patch({ tool: "select" });
    await wait(300);
  };
  const giveMotion = async (sc: DScene) => {
    const anim = MOTION[sc.beat] ?? "Pop", w = cue(sc);
    const first = uiRef.current.canvas?.layers.find((l) => l.kind === "pic") ?? uiRef.current.canvas?.layers[0];
    if (first) { step("Selecting the main picture"); await go([`layer-${first.id}`]); await click(); patchCanvas({ selected: first.id }); }
    step(`Motion: ${anim}`);
    await go(["tab-Scene"]); await click(); patch({ tab: "Scene" });
    await go([`anim-${anim}`]); await click(); patch({ anim });
    if (first) patchCanvas((c) => ({ layers: c.layers.map((l) => (l.id === first.id ? { ...l, anim, at: w?.s ?? 0 } : l.kind === "text" ? { ...l, anim: "Slide", at: 0.1 } : { ...l, anim: l.anim ?? "Pop", at: 0.4 })) }));
    if (w) {  // the keyframe goes on the word it lands on
      const b = rectOf(`tl-vis-${sc.i}`);
      if (b) await goXY(b.x + Math.min(0.96, w.s / Math.max(sc.span, 0.1)) * b.w, b.y + b.h / 2, `Key on “${clean(w.w)}” at ${w.s.toFixed(1)}s`, 800);
      await click();
      patch((u) => ({ keys: [...u.keys.filter((k) => k.scene !== sc.i), { scene: sc.i, at: w.s, label: `${anim} on “${clean(w.w)}”` }] }));
      await wait(300);
    }
  };
  const playCheck = async (sc: DScene) => {
    step(`Playing scene ${sc.i + 1} with its voice`);
    await go(["tab-Audio"]); await click(); patch({ tab: "Audio" });
    await go(["audio-play", "preview-play"]); await click();
    const dur = Math.min(sc.span, 5.5);
    const real = mode.current === "live" && sc.stills.length > 0;  // a drawn scene plays its real frames
    patchCanvas((c) => ({ play: c.play + 1, selected: null, real: real ? sc.stills[0] : null }));
    playVoice(sc, 0, dur);
    const t0 = Date.now();
    while (Date.now() - t0 < dur * 1000 / Math.max(0.25, set.current.speed)) {  // the playhead runs with the voice
      const at = Math.min(dur, ((Date.now() - t0) / 1000) * set.current.speed);
      seekRef.current(sc.start + at);
      if (real) patchCanvas({ real: sc.stills[Math.min(sc.stills.length - 1, Math.floor((at / Math.max(sc.span, 0.1)) * sc.stills.length))] });
      await wait(200);
    }
    stopVoice();
    await wait(250);
  };
  const setTransition = async (sc: DScene) => {
    step(`Transition: ${sc.transition || "fade"}`);
    await go([`tl-bd-${sc.i}`]); await click();
    stamp(`Transition: ${sc.transition || "fade"}`);
    await wait(500);
  };
  const showReal = async (sc: DScene, label = "The agent's frame") => {
    const still = sc.stills[1] ?? sc.stills[0];
    if (!still) return false;
    step(label);
    patchCanvas({ real: still });
    await wait(1400);
    return true;
  };

  // ---- the tasks ----
  const T = {
    plan: (): Task => ({ title: "Planning the film", scene: null, run: async () => {
      await go(["stage-plan"], "Planning the story and the look"); await click();
      step("Laying out the scenes on the timeline");
      for (const sc of S.current) { await go([`tl-cap-${sc.i}`], undefined, 260); }
    } }),
    voice: (i: number): Task => ({ title: `Recording line ${i + 1}`, scene: i, run: async () => {
      const sc = S.current[i]; if (!sc) return;
      await go([`tl-voice-${i}`], `Recording line ${i + 1}`); await click();
      seekRef.current(sc.start + 0.01);
      if (uiRef.current.canvas && uiRef.current.canvas.scene !== i) {  // the player follows to that scene
        const k = kept.current[i];
        patch({ canvas: { scene: i, backdrop: k?.backdrop ?? "", ground: !!k, layers: k?.layers ?? [], selected: null, play: 0, real: null } });
      }
      await go(["tab-Audio"]); await click(); patch({ tab: "Audio" });
      await go(["audio-play"], "Listening back"); await click();
      playVoice(sc, 0, Math.min(2.5, sc.span));
      await wait(2500);
      stopVoice();
    } }),
    find: (i: number, name: string, query: string, backdrop: boolean): Task => ({ title: backdrop ? `Backdrop for scene ${i + 1}` : `Finding ${name.replace(/[_-]/g, " ")}`, scene: i, run: async () => {
      await go(["search"], backdrop ? "Searching a backdrop" : "Searching a picture"); await click();
      await type(query.slice(0, 26), (s) => patch({ search: s }), 35);
      await wait(250);
      if (await go([backdrop ? `thumb-${i}` : `pic-${i}-${name}`], backdrop ? `Backdrop for scene ${i + 1}` : `Found ${name.replace(/[_-]/g, " ")}`)) await click();
      patch({ search: "" });
    } }),
    build: (i: number): Task => ({ title: `Building scene ${i + 1}`, scene: i, run: async () => {
      const sc = S.current[i]; if (!sc) return;
      built.current.add(i);
      await openScene(sc);
      await putBackdrop(sc);
      const pics = sc.assets.filter((a) => a.url).slice(0, 4);
      for (let k = 0; k < pics.length; k++) await addPicture(sc, pics[k], k);
      await addText(sc);
      await giveMotion(sc);
      await playCheck(sc);
      await setTransition(sc);
    } }),
    polish: (i: number): Task => ({ title: `Polishing scene ${i + 1}`, scene: i, run: async () => {  // two different finishing moves per scene
      const sc = S.current[i]; if (!sc) return;
      for (const k of [i % 5, (i + 2) % 5]) await POLISH[k][1](sc);
      polish.current[i] = POLISH.length - 1;
    } }),
    stampTask: (i: number | null, text: string, tone: "ok" | "bad" | "info"): Task => ({ title: text, scene: i, run: async () => {
      if (i != null && S.current[i] && uiRef.current.canvas?.scene !== i) await openScene(S.current[i]);
      await go(["canvas"], text, 450); stamp(text, tone); await wait(900);
    } }),
    fix: (i: number): Task => ({ title: `Fixing scene ${i + 1}`, scene: i, run: async () => {
      const sc = S.current[i]; if (!sc) return;
      if (uiRef.current.canvas?.scene !== i) { await openScene(sc); await putBackdrop(sc); }
      stamp(`Scene ${i + 1} has a problem`, "bad");
      const l = uiRef.current.canvas?.layers[0];
      if (l) {
        step("Finding what broke"); await go([`layer-${l.id}`]); await click(); patchCanvas({ selected: l.id });
        const p = center(`layer-${l.id}`);
        if (p) { setCur((c) => ({ ...c, down: true })); await goXY(p.x - 30, p.y + 16, "Moving it back in place", 600); patchCanvas((c) => ({ layers: c.layers.map((x) => (x.id === l.id ? { ...x, x: Math.max(0.04, x.x - 0.03), y: Math.min(0.7, x.y + 0.03) } : x)) })); setCur((c) => ({ ...c, down: false })); }
      }
      await wait(500);
    } }),
    previews: (): Task => ({ title: "Drawing previews of every scene", scene: null, run: async () => {
      for (const sc of S.current) {
        if (!sc.stills.length) continue;
        await go([`thumb-${sc.i}`, `tl-vis-${sc.i}`], `Preview of scene ${sc.i + 1}`, 450); await click();
        seekRef.current(sc.start + 0.01);
        const k = kept.current[sc.i];
        patch({ canvas: { scene: sc.i, backdrop: k?.backdrop ?? sc.backdrop, ground: true, layers: k?.layers ?? [], selected: null, play: 0, real: sc.stills[1] ?? sc.stills[0] } });
        await wait(700);
      }
      patchCanvas({ real: null });
    } }),
    check: (i: number): Task => ({ title: `Checking scene ${i + 1}`, scene: i, run: async () => {
      const sc = S.current[i]; if (!sc) return;
      await openScene(sc, `Checking scene ${i + 1}`);
      if (!(await showReal(sc, `Looking at scene ${i + 1}`))) await putBackdrop(sc);
      const b = rectOf("canvas", false);
      if (b) {
        setCur((c) => ({ ...c, lens: true }));
        for (const [fx, fy] of [[0.25, 0.3], [0.7, 0.28], [0.72, 0.68], [0.3, 0.66], [0.5, 0.45]]) await goXY(b.x + fx * b.w, b.y + fy * b.h, `Checking scene ${i + 1}`, 420);
        setCur((c) => ({ ...c, lens: false }));
      }
      patchCanvas({ real: null });
    } }),
    render: (): Task => ({ title: "Rendering the film", scene: null, run: async () => {
      await go(["render"], "Export · 1080p"); await click();
      patch({ render: { done: 0, total: 1, ready: false } });
      if (mode.current === "replay") {  // a finished film: the bar runs once
        for (let k = 1; k <= 20; k++) { patch({ render: { done: k, total: 20, ready: false } }); await wait(160); }
      }
    } }),
    done: (): Task => ({ title: "The film is ready", scene: null, run: async () => {
      patch({ render: { done: 1, total: 1, ready: true } });
      await go(["render"], "Done"); await click();
      stamp("The film is ready", "ok");
      await wait(1800);
      patch({ render: null });
    } }),
  };

  const fromEvent = (e: LiveEvent): Task | null => {
    const i = e.scene ?? 0, sc = S.current[i];
    switch (e.kind) {
      case "planning": return T.plan();
      case "voice": return T.voice(i);
      case "backdrop": return e.url ? T.find(i, "backdrop", sc?.backdrop_query || e.text.split(": ")[1] || "backdrop", true) : null;
      case "picture": return T.find(i, e.name ?? "", (e.name ?? "").replace(/[_-]/g, " "), false);
      case "writing": return built.current.has(i) ? null : T.build(i);
      case "wrote": return T.stampTask(i, `Scene ${i + 1} composed`, "ok");
      case "error": return T.fix(i);
      case "fixed": return T.stampTask(i, `Scene ${i + 1} fixed`, "ok");
      case "stills": return T.previews();
      case "looking": return T.check(i);
      case "ok": return T.stampTask(i, `Scene ${i + 1} looks right`, "ok");
      case "played": return T.stampTask(i, `Scene ${i + 1} plays through`, "ok");
      case "drawn": return T.stampTask(i, `Preview of scene ${i + 1} drawn`, "info");
      case "redesigned": return T.stampTask(i, `Scene ${i + 1} redesigned`, "info");
      case "render": return uiRef.current.render ? null : T.render();
      case "done": return T.done();
      default: return null;
    }
  };

  /** the editor's polishing moves on a built scene, each different; a play-through only closes the round */
  const POLISH: [string, (sc: DScene) => Promise<void>][] = [
    ["callout", async (sc) => {  // a small label next to a picture, saying what it is
      const pic = uiRef.current.canvas?.layers.find((l) => l.kind === "pic" && !uiRef.current.canvas?.layers.some((t) => t.id === `${l.id}-label`));
      if (!pic) return;
      const name = pic.id.split("-").slice(1).join(" ").replace(/[_-]/g, " ");
      step(`Labelling ${name}`);
      await go(["tool-text"]); await click(); patch({ tool: "text" });
      const p = canvasXY(Math.min(0.8, pic.x), Math.min(0.85, pic.y + pic.w * 1.55));
      if (p) await goXY(p.x, p.y, `Label: ${name}`, 600);
      await click();
      const id = `${pic.id}-label`;
      patchCanvas((c) => ({ layers: [...c.layers, { id, kind: "text", text: name, typed: 0, x: Math.min(0.8, pic.x), y: Math.min(0.85, pic.y + pic.w * 1.55), w: 0.2, small: true, anim: "Pop", at: (pic.at ?? 0.4) + 0.3 }], selected: id }));
      await type(name, (t) => patchCanvas((c) => ({ layers: c.layers.map((l) => (l.id === id ? { ...l, typed: t.length } : l)) })), 50);
      patch({ tool: "select" });
    }],
    ["grid", async () => {  // snap the pictures to the layout grid
      step("Snapping to the layout grid");
      await go(["tool-move"]); await click(); patch({ tool: "move" });
      for (const l of (uiRef.current.canvas?.layers ?? []).filter((x) => x.kind === "pic").slice(0, 3)) {
        await go([`layer-${l.id}`], "Snapping to the layout grid", 450);
        setCur((c) => ({ ...c, down: true }));
        patchCanvas((c) => ({ selected: l.id, layers: c.layers.map((x) => (x.id === l.id ? { ...x, x: Math.round(x.x * 10) / 10, y: Math.round(x.y * 10) / 10 } : x)) }));
        await wait(350);
        setCur((c) => ({ ...c, down: false, ripple: c.ripple + 1 }));
      }
      patch({ tool: "select" });
    }],
    ["colour", async () => {  // the headline takes the film's accent colour
      const t = uiRef.current.canvas?.layers.find((l) => l.kind === "text" && !l.small);
      if (!t) return;
      step("Headline colour");
      await go([`layer-${t.id}`]); await click(); patchCanvas({ selected: t.id });
      const k = Math.max(0, pal.current.length - 2);  // the palette is the film's grounds, then its accent and second accent
      await go([`swatch-${k}`, `swatch-0`], "Picking the film's accent"); await click();
      patchCanvas((c) => ({ layers: c.layers.map((l) => (l.id === t.id ? { ...l, color: pal.current[k] } : l)) }));
      await wait(300);
    }],
    ["captions", async (sc) => {  // the word the scene turns on gets the caption highlight
      const w = cue(sc);
      if (!w) return;
      step(`Caption highlight on “${clean(w.w)}”`);
      await go(["tab-Captions"]); await click(); patch({ tab: "Captions" });
      const k = sc.words.indexOf(w);
      await go([`word-${k}`]); await click();
      patch({ capWord: clean(w.w).toLowerCase() });
      await wait(400);
    }],
    ["spacing", async (sc) => {  // a close look at the busiest corner
      step("Checking the spacing");
      const b = rectOf("canvas", false);
      if (!b) return;
      setCur((c) => ({ ...c, lens: true }));
      for (const l of (uiRef.current.canvas?.layers ?? []).slice(0, 3)) await goXY(b.x + (l.x + l.w / 2) * b.w, b.y + (l.y + 0.08) * b.h, `Checking the spacing in scene ${sc.i + 1}`, 520);
      setCur((c) => ({ ...c, lens: false }));
    }],
    ["play", async (sc) => { await playCheck(sc); }],
  ];

  /** nothing new from the agent: keep working the scene it is on, the way an editor keeps polishing (no move twice) */
  const idle = async () => {
    const l = L.current, on = uiRef.current.canvas?.scene;
    const b = on != null && l?.busy?.includes(on) ? on : l?.busy?.[0];  // stay on the scene in hand while the agent is still on it
    const r = l?.render;
    if (r && r.stage !== "done") { if (!uiRef.current.render) await T.render().run(); patch({ render: { done: r.done, total: r.total, ready: false } }); await wait(600); return; }
    if (b == null || !S.current[b]) { await go(["canvas", "preview-play"], (l?.events.at(-1)?.text ?? "Working").slice(0, 46), 900); await wait(1500); return; }
    const sc = S.current[b];
    const c = uiRef.current.canvas;
    if (c?.scene !== b || (!c.real && (!c.ground || !c.layers.length))) {  // not open, or nothing on it yet
      if (sc.stills.length || kept.current[b]) await openScene(sc, `Back to scene ${b + 1}`); else await T.build(b).run();
      return;
    }
    if (c.real && sc.stills.length && !sc.stills.includes(c.real)) patchCanvas({ real: sc.stills[1] ?? sc.stills[0] });  // the agent drew it again: its newest frame
    const code = L.current?.scenes[String(b)]?.text ?? "";  // what the agent has written into this scene so far
    const done = (placed.current[b] ??= new Set());
    const next = elementsFrom(code, sc.assets).find((e) => !done.has(e.key));
    if (next) {
      done.add(next.key);
      patch((u) => ({ task: { n: u.task?.n ?? taskN.current, title: `Scene ${b + 1}: adding what the agent writes`, scene: b, step: "" } }));
      await enact(sc, next);
      return;
    }
    const moves = c.real ? POLISH.filter(([n]) => n === "captions" || n === "spacing" || n === "play") : POLISH;  // a real frame is not rearranged
    const k = polish.current[b] ?? 0;
    if (k >= moves.length) {  // a full round done: it waits on the agent, watching the scene, instead of repeating itself
      await go(["canvas"], `Scene ${b + 1} is set · waiting for the agent`, 900);
      await wait(2500);
      return;
    }
    polish.current[b] = k + 1;
    patch((u) => ({ task: { n: u.task?.n ?? taskN.current, title: `Polishing scene ${b + 1}`, scene: b, step: "" } }));
    await moves[k][1](sc);
    await wait(500);
  };

  const loop = async () => {
    if (runningLoop.current) return;
    runningLoop.current = true;
    const g = gen.current;
    try {
      while (g === gen.current && mode.current !== "off") {
        const t = queue.current.shift();
        patch({ next: queue.current.slice(0, 5).map((x) => x.title) });
        if (t) {
          taskN.current += 1;
          patch({ task: { n: taskN.current, title: t.title, scene: t.scene, step: "" } });
          try { await t.run(); } catch (e) { if ((e as Error).message === "stopped") throw e; }
          continue;
        }
        if (mode.current === "replay") { mode.current = "off"; break; }
        if (!L.current?.running) { await wait(1000); if (!L.current?.running) break; continue; }
        patch((u) => ({ task: { n: taskN.current, title: u.canvas ? `Working on scene ${u.canvas.scene + 1}` : "Working", scene: u.canvas?.scene ?? null, step: "" } }));
        try { await idle(); } catch (e) { if ((e as Error).message === "stopped") throw e; }
      }
    } catch { /* stopped */ }
    runningLoop.current = false;
    if (g === gen.current) { setCur((c) => ({ ...c, show: false })); stopVoice(); patch({ on: false, task: null, next: [] }); }
  };

  const stop = useCallback(() => {
    gen.current += 1;
    mode.current = "off";
    queue.current = [];
    audio.current?.pause();
    setCur((c) => ({ ...c, show: false, lens: false, ghost: null }));
    setUi(EMPTY);
    runningLoop.current = false;
  }, []);

  /** a finished film, made again in front of you: every step it took, in order */
  const replay = useCallback(() => {
    stop();
    gen.current += 1;
    mode.current = "replay";
    built.current = new Set();
    taskN.current = 0;
    const sc = S.current;
    queue.current = [T.plan(),  // scene by scene, so the first one is on screen within seconds
      ...sc.flatMap((s) => [T.voice(s.i), ...(s.backdrop ? [T.find(s.i, "backdrop", s.backdrop_query || "backdrop", true)] : []),
        ...s.assets.filter((a) => a.url).slice(0, 1).map((a) => T.find(s.i, a.name, a.name.replace(/[_-]/g, " "), false)),
        T.build(s.i), T.polish(s.i), T.stampTask(s.i, `Scene ${s.i + 1} composed`, "ok")]),
      T.previews(), ...sc.filter((s) => s.stills.length).slice(0, 3).flatMap((s) => [T.check(s.i), T.stampTask(s.i, `Scene ${s.i + 1} looks right`, "ok")]),
      T.render(), T.done()];
    setUi({ ...EMPTY, on: true });
    setTimeout(() => loop(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop]);

  // live: the agent's real steps become tasks, in the order it took them
  useEffect(() => {
    if (!active || !live) { if (mode.current === "live") stop(); return; }
    if (!live.running && mode.current !== "live") return;
    if (mode.current === "replay") return;
    if (mode.current === "off") {
      mode.current = "live";
      gen.current += 1;
      taskN.current = 0;
      for (const e of live.events) seen.current.add(`${e.t}|${e.text}`);  // what happened before opening is never acted out again (that is Replay)
      const b = live.busy?.[0], sc = b != null ? S.current[b] : undefined;
      if (sc) {  // pick up where the agent is: its scene on the canvas as it stands, what it already wrote counted as placed
        const c = compose(sc);
        kept.current[sc.i] = { backdrop: c.backdrop, layers: c.layers };
        built.current.add(sc.i);
        placed.current[sc.i] = new Set(elementsFrom(live.scenes[String(sc.i)]?.text ?? "", sc.assets).map((e) => e.key));
        seekRef.current(sc.start + 0.01);
        setUi({ ...EMPTY, on: true, canvas: c });
      } else setUi({ ...EMPTY, on: true });
      if (live.render && live.render.stage !== "done") queue.current.push(T.render());
    }
    for (const e of live.events) {
      const k = `${e.t}|${e.text}`;
      if (seen.current.has(k)) continue;
      seen.current.add(k);
      const t = fromEvent(e);
      if (t) queue.current.push(t);
    }
    if (live.render && uiRef.current.render && live.render.stage !== "done") patch({ render: { done: live.render.done, total: live.render.total, ready: false } });
    loop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.events, live?.running, live?.render, active]);

  useEffect(() => () => { gen.current += 1; audio.current?.pause(); }, []);
  useEffect(() => { if (!ui.stamp) return; const id = setTimeout(() => patch({ stamp: null }), 2000); return () => clearTimeout(id); }, [ui.stamp]);

  return { ui, cur, replay, stop, replaying: mode.current === "replay" };
}

/** the agent's hand on screen */
export function DirectorCursor({ cur, origin }: { cur: Cur; origin: string }) {
  if (!cur.show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {cur.ghost && <motion.img key="ghost" src={origin + cur.ghost} alt="" initial={{ opacity: 0, scale: 0.6, x: cur.x - 40, y: cur.y - 34 }} animate={{ opacity: 0.95, scale: 1, x: cur.x - 40, y: cur.y - 34 }} exit={{ opacity: 0, scale: 0.4 }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }} className="absolute left-0 top-0 h-[60px] w-[80px] rounded-[10px] border-2 border-white bg-white/80 object-contain shadow-[0_14px_34px_-8px_rgb(0_0_0/0.6)]" />}
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
            <span className="grid size-4 place-items-center rounded-full bg-[#1f1c1b] text-[9px] text-[#a6f04a]">A</span>{cur.label}</motion.span>}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
