"use client";

import { Check, RotateCcw, Search, Shuffle, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api";

/* The look studio, step 2 of Plan with Drishyya: search the look families, pick one, and see it drawn live (headline,
   sentence, 3D pie, counting number, a card, two people, a bee) by the real film kit in the browser
   (public/library/specimen.html, built by video/gallery-build.mjs). The creator may pin its colours, ground, fonts, box
   and motion; the film keeps every pin exactly (video/looks.py clean_pin / apply_pin) and varies only the rest. */

export type Look = { id: string; name: string; blurb: string; group: string; preview: string; clip: string; brand: string; combinations: number; art: string; dark: boolean; use: string };
export type Pin = { paper?: string; ink?: string; inks?: string[]; display?: string; body?: string; mono?: string; box?: string; motion?: string;
  card?: string; enter?: string; transitions?: string[]; texture?: string };
type DNA = Record<string, unknown> & { paper: string; ink: string; inks: string[]; display: string; body: string; mono?: string; dark?: boolean; box?: string; motion?: string };
type Studio = {
  family: string; name: string; dna: DNA; fonts: Record<string, string>;
  palettes: { name: string; from: string; own: boolean; ink: string; inks: string[] }[];
  grounds: { name: string; from: string; own: boolean; paper: string }[];
  textures: { id: string; name: string; own: boolean }[];
  types: { display: string; body: string; mono: string; own: boolean; from: string; label: string }[];
  boxes: { id: string; about: string; own: boolean }[]; motions: { id: string; about: string; own: boolean }[];
  parts: { shapes: string[]; frames: string[]; fills: string[]; heads: string[]; travel: string[]; place: string[]; dirs: string[]; eases: string[] };
  transitions: string[];
};

/** WCAG luminance and contrast of #rrggbb colours (the same sums as video/looks.py _light and contrast) */
const lum = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
  .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const isDark = (c: string) => lum(c) < 0.18;

/** the preview's look: the family's, with the pins laid over (mirrors video/looks.py apply_pin) */
function applyPin(dna: DNA, pin: Pin): DNA {
  const d: DNA = { ...dna, ...pin } as DNA;
  if (pin.paper) { d.dark = isDark(pin.paper); d.boardInk = d.dark ? d.ink : pin.paper; }
  if (pin.inks && pin.inks.length < 4) d.inks = [...pin.inks, ...dna.inks].slice(0, 4);
  return d;
}

const SCENES: [string, number][] = [["Its showcase", -2], ["All scenes", -1], ["Title & numbers", 0], ["Charts", 1], ["Map & labels", 2], ["People talking", 3]];

/** the family's own boxes or motions first, bold; then a thin rule; then every other one the code draws */
function choices(list: { id: string; about: string; own: boolean }[], current: string | undefined, set: (id: string) => void) {
  const one = (x: (typeof list)[number]) => <button key={x.id} type="button" title={x.about} onClick={() => set(x.id)}
    className={`${chip(current === x.id)} ${x.own ? "" : "!font-medium opacity-80"}`}>{x.id}</button>;
  return <>{list.filter((x) => x.own).map(one)}<span className="mx-1 h-5 w-px bg-[#d6d4cc]" />{list.filter((x) => !x.own).map(one)}</>;
}

const chip = (on: boolean) => `rounded-full px-3 py-1 text-[13px] font-semibold ${on ? "bg-[#1f1c1b] text-white" : "border border-[#e2e1da] bg-white text-[#5f5b57] hover:border-[#a6f04a]"}`;

export function LookStudio({ looks, look, setLook, pin, setPin }: { looks: Look[]; look: string; setLook: (id: string) => void; pin: Pin; setPin: (p: Pin) => void }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const [more, setMore] = useState(false);
  const [allGrounds, setAllGrounds] = useState(false);
  const [moreSurfaces, setMoreSurfaces] = useState(false);
  const groups = useMemo(() => ["All", ...Array.from(new Set(looks.map((x) => x.group)))], [looks]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = looks.filter((x) => (group === "All" || x.group === group) &&
    words.every((w) => `${x.id} ${x.name} ${x.blurb} ${x.use} ${x.group} ${x.art} ${x.dark ? "dark night" : "light"}`.toLowerCase().includes(w)));

  const { data: st } = useApi<Studio>(look !== "auto" ? `/films/looks/${look}/studio` : null);
  const studio = st?.family === look ? st : undefined;  // the cache keeps the last family's data while the next one loads
  const dna = studio ? applyPin(studio.dna, pin) : undefined;

  // the live preview: an iframe of the film kit; it says when it is ready, then takes every change of look at once
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.data?.specimenReady) setReady(true); };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const [scene, setScene] = useState(-2);  // -2 the look's own showcase, -1 all four test scenes, 0-3 one of them
  useEffect(() => { if (ready && dna) frame.current?.contentWindow?.postMessage({ dna, scene }, "*"); }, [ready, scene, JSON.stringify(dna)]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string) => { setLook(id); setPin({}); setMore(false); setAllGrounds(false); setMoreSurfaces(false); };
  const warn = dna && [
    contrast(dna.ink, dna.paper) < 4.5 && `Text colour on this ground is hard to read (contrast ${contrast(dna.ink, dna.paper).toFixed(1)}, aim for 4.5+).`,
    contrast(dna.inks[0], dna.paper) < 2 && `The accent colour almost disappears on this ground (contrast ${contrast(dna.inks[0], dna.paper).toFixed(1)}).`,
  ].filter(Boolean) as string[];
  // what the creator fixed, counted as they think of it: the colours, the ground, the fonts, the box, the motion
  const pinned = [pin.ink || pin.inks, pin.paper, pin.texture, pin.display || pin.body, pin.box, pin.motion, pin.card, pin.enter, pin.transitions].filter(Boolean).length;
  const ground = (g: Studio["grounds"][number]) => {
    const on = !!studio && (pin.paper ?? studio.dna.paper) === g.paper;
    return <button key={g.paper} type="button" title={`${g.name}${g.own ? "" : ` · from ${g.from}`}`} onClick={() => setPin({ ...pin, paper: g.paper })}
      className={`size-7 shrink-0 rounded-[8px] border ${on ? "border-[#1f1c1b] ring-2 ring-[#a6f04a]" : "border-[#d6d4cc]"}`} style={{ background: g.paper }} />;
  };
  const swatch = (p: Studio["palettes"][number]) => {
    const on = !!studio && (pin.ink ?? studio.dna.ink) === p.ink && JSON.stringify(pin.inks ?? studio.dna.inks) === JSON.stringify(p.inks);
    return <button key={p.ink + p.inks.join()} type="button" title={`${p.name}${p.own ? "" : ` · from ${p.from}`}`} onClick={() => setPin({ ...pin, ink: p.ink, inks: p.inks })}
      className={`flex items-center gap-0.5 rounded-full border p-1 ${on ? "border-[#1f1c1b] ring-2 ring-[#a6f04a]" : "border-[#e2e1da] bg-white"}`}>
      {[p.ink, ...p.inks].map((c, i) => <span key={i} className="size-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}
    </button>;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
      {/* ---------- the families: search and pick ---------- */}
      <div className="min-w-0">
        <label className="flex items-center gap-2 rounded-[12px] border border-[#e2e1da] bg-white px-3 py-2.5 focus-within:border-[#a6f04a]">
          <Search className="size-4 text-[#8a857f]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search looks: maps, dark, Indian, kids, money, vintage…" className="w-full bg-transparent text-[14.5px] outline-none" />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {groups.map((g) => <button key={g} type="button" onClick={() => setGroup(g)} className={chip(group === g)}>
            {g} <span className="opacity-60">{g === "All" ? looks.length : looks.filter((x) => x.group === g).length}</span></button>)}
        </div>
        <div className="mt-3 grid max-h-[72vh] grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {!q && group === "All" && <button type="button" onClick={() => pick("auto")}
            className={`overflow-hidden rounded-[12px] border text-left ${look === "auto" ? "border-[#1f1c1b] ring-2 ring-[#a6f04a]" : "border-[#e2e1da] bg-white hover:border-[#a6f04a]"}`}>
            <div className="grid aspect-video grid-cols-2 grid-rows-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {looks.filter((_, i) => i % 17 === 3).slice(0, 4).map((x) => <img key={x.id} src={x.preview} alt="" className="h-full w-full object-cover" />)}
            </div>
            <div className="p-2"><div className="flex items-center justify-between text-[13px] font-bold"><span className="inline-flex items-center gap-1"><Sparkles className="size-3.5 text-[#3f7d1e]" />Auto</span>{look === "auto" && <Check className="size-4 text-[#3f7d1e]" />}</div>
              <div className="line-clamp-2 text-[11.5px] leading-snug text-[#8a857f]">Gemini picks the look that suits your topic.</div></div>
          </button>}
          {shown.map((x) => (
            <button key={x.id} type="button" onClick={() => pick(x.id)} title={x.blurb}
              className={`overflow-hidden rounded-[12px] border text-left ${look === x.id ? "border-[#1f1c1b] ring-2 ring-[#a6f04a]" : "border-[#e2e1da] bg-white hover:border-[#a6f04a]"}`}>
              <video src={x.clip} poster={x.preview} muted loop playsInline preload="none" aria-label={`${x.name} sample`} className="aspect-video w-full object-cover"
                onMouseEnter={(e) => { e.currentTarget.currentTime = 0; void e.currentTarget.play().catch(() => {}); }} onMouseLeave={(e) => e.currentTarget.pause()} />
              <div className="p-2">
                <div className="flex items-center justify-between gap-1 text-[13px] font-bold">{x.name}{look === x.id && <Check className="size-4 shrink-0 text-[#3f7d1e]" />}</div>
                <div className="line-clamp-2 text-[11.5px] leading-snug text-[#8a857f]"><b className="font-semibold text-[#5f5b57]">Best for</b> {x.use}</div>
              </div>
            </button>
          ))}
          {shown.length === 0 && <p className="col-span-2 py-6 text-center text-[14px] text-[#8a857f]">No look matches “{q}”.</p>}
        </div>
      </div>

      {/* ---------- the chosen look: live, and what can be changed ---------- */}
      <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
        {look === "auto" ? (
          <div className="grid aspect-video place-items-center rounded-[16px] border border-dashed border-[#d6d4cc] bg-white p-6 text-center">
            <div><Sparkles className="mx-auto size-6 text-[#3f7d1e]" /><div className="mt-2 text-[16px] font-bold">Auto look</div>
              <p className="mt-1 max-w-[420px] text-[13.5px] text-[#5f5b57]">Gemini reads your topic and picks one of {looks.length} families. Pick a family on the left to see it live and set its colours and fonts yourself.</p></div>
          </div>
        ) : <>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SCENES.map(([name, i]) => <button key={i} type="button" onClick={() => setScene(i)} className={chip(scene === i)}>{name}</button>)}
          </div>
          <div className="relative overflow-hidden rounded-[16px] border border-[#e2e1da] bg-[#f1f0ea]">
            <iframe ref={frame} src="/library/specimen.html" title="Live look preview" className="block aspect-video w-full" />
            {!studio && <div className="absolute inset-0 grid place-items-center text-[13px] text-[#8a857f]">Loading the look…</div>}
          </div>
          {studio && dna && <div className="mt-3 space-y-3 text-[13px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 text-[15px] font-bold">{studio.name} <span className="font-normal text-[#8a857f]">· {pinned ? `${pinned} thing${pinned > 1 ? "s" : ""} pinned: your film keeps ${pinned > 1 ? "them" : "it"} exactly` : "every film varies the details; pin what you want kept"}</span></div>
              {pinned > 0 && <button type="button" onClick={() => setPin({})} className="inline-flex items-center gap-1 rounded-full border border-[#e2e1da] bg-white px-2.5 py-1 font-semibold hover:border-[#a6f04a]"><RotateCcw className="size-3.5" />Reset</button>}
            </div>

            <Row label="Colours">
              {studio.palettes.filter((p) => p.own).map((p) => swatch(p))}
              <button type="button" onClick={() => setMore(!more)} className={chip(more)}>{more ? "Fewer" : `More colours (${studio.palettes.length - studio.palettes.filter((p) => p.own).length})`}</button>
            </Row>
            {more && <div className="ml-[80px] flex max-h-[132px] flex-wrap gap-1.5 overflow-y-auto rounded-[12px] border border-[#e2e1da] bg-[#faf9f5] p-2">
              {studio.palettes.filter((p) => !p.own).map((p) => swatch(p))}
            </div>}

            <Row label="Ground">
              {studio.grounds.filter((g) => g.own).map(ground)}
              <button type="button" onClick={() => setAllGrounds(!allGrounds)} className={chip(allGrounds)}>{allGrounds ? "Fewer" : `All grounds (${studio.grounds.length})`}</button>
            </Row>
            {allGrounds && <div className="ml-[80px] max-h-[180px] space-y-2 overflow-y-auto rounded-[12px] border border-[#e2e1da] bg-[#faf9f5] p-2">
              {/* every ground of every look on this side, light to dark: hover one for its name and the look it comes from */}
              {([["Light", (l: number) => l >= 0.6], ["Mid", (l: number) => l >= 0.18 && l < 0.6], ["Dark", (l: number) => l < 0.18]] as const).map(([name, band]) => {
                const gs = studio.grounds.filter((g) => band(lum(g.paper))).sort((a, b) => lum(b.paper) - lum(a.paper));
                return gs.length > 0 && <div key={name} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-10 text-[11px] font-semibold text-[#8a857f]">{name}</span>{gs.map(ground)}</div>;
              })}
            </div>}

            <Row label="Surface">
              {/* the ground's texture (grain, grid, dots, kraft, chalk…): any the kit draws, the look's own first */}
              {studio.textures.filter((x) => x.own || moreSurfaces).map((x) =>
                <button key={x.id} type="button" onClick={() => setPin({ ...pin, texture: x.id })}
                  className={`${chip((pin.texture ?? studio.dna.texture) === x.id)} ${x.own ? "" : "!font-medium"}`}>{x.name}</button>)}
              <button type="button" onClick={() => setMoreSurfaces(!moreSurfaces)} className={chip(false)}>
                {moreSurfaces ? "Fewer" : `More surfaces (${studio.textures.filter((x) => !x.own).length})`}</button>
            </Row>

            <Row label="Your own">
              {([["Ground", "paper"], ["Text", "ink"]] as const).map(([name, k]) => (
                <label key={k} className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white py-1 pl-1 pr-2.5 font-semibold">
                  <input type="color" value={(pin[k] ?? studio.dna[k]) as string} onChange={(e) => setPin({ ...pin, [k]: e.target.value })} className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0" />{name}
                </label>
              ))}
              {[0, 1, 2].map((i) => (
                <label key={i} className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e1da] bg-white py-1 pl-1 pr-2.5 font-semibold">
                  <input type="color" value={(pin.inks ?? dna.inks)[i] ?? "#888888"} className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    onChange={(e) => { const inks = [...(pin.inks ?? dna.inks)]; inks[i] = e.target.value; setPin({ ...pin, inks }); }} />Accent {i + 1}
                </label>
              ))}
            </Row>

            <Row label="Fonts">
              <select value={`${dna.display}|${dna.body}|${dna.mono ?? ""}`} onChange={(e) => { const [display, body, mono] = e.target.value.split("|"); setPin({ ...pin, display, body, mono }); }}
                className="min-w-[260px] rounded-[10px] border border-[#e2e1da] bg-white px-2.5 py-1.5 font-semibold outline-none focus:border-[#a6f04a]">
                <optgroup label={`${studio.name}'s own`}>{studio.types.filter((t) => t.own).map((t) => <option key={t.label + t.mono} value={`${t.display}|${t.body}|${t.mono}`}>{t.label}</option>)}</optgroup>
                <optgroup label="From other looks">{studio.types.filter((t) => !t.own).map((t) => <option key={t.label + t.mono} value={`${t.display}|${t.body}|${t.mono}`}>{t.label} · {t.from}</option>)}</optgroup>
              </select>
            </Row>

            <Row label="Box style">{choices(studio.boxes, dna.box, (id) => setPin({ ...pin, box: id }))}</Row>
            <Row label="Card">
              <CardPicker parts={studio.parts} value={pin.card} set={(card) => setPin({ ...pin, card })} />
            </Row>
            <Row label="Motion">{choices(studio.motions, dna.motion, (id) => setPin({ ...pin, motion: id }))}</Row>
            <Row label="Entrance">
              <EnterPicker parts={studio.parts} value={pin.enter} set={(enter) => setPin({ ...pin, enter })} />
            </Row>
            <Row label="Scene to scene">
              {studio.transitions.map((k) => {
                const on = !!pin.transitions?.includes(k);
                return <button key={k} type="button" className={chip(on)} onClick={() => {
                  const next = on ? (pin.transitions ?? []).filter((x) => x !== k) : [...(pin.transitions ?? []), k];
                  setPin({ ...pin, transitions: next.length ? next : undefined });
                }}>{k}</button>;
              })}
              <span className="text-[12px] text-[#8a857f]">{pin.transitions?.length ? "only these, in turn" : "none picked: Gemini picks one per scene"}</span>
            </Row>
            <p className="ml-[80px] text-[12px] leading-relaxed text-[#8a857f]">
              Bold ones suit this look; the rest work in it too. Every change plays the scene again so you see it arrive; play <b>All scenes</b> to see the transitions.
              {" "}<Link href="/app/library" className="font-semibold text-[#3f7d1e] hover:underline">Browse all 1,536 cards and 1,284 motions in the Library →</Link>
            </p>

            {warn && warn.length > 0 && <div className="space-y-1 rounded-[12px] bg-[#fff4e0] px-3 py-2 text-[#7a4a10]">
              {warn.map((w) => <div key={w} className="flex items-start gap-1.5"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />{w}</div>)}
            </div>}
          </div>}
        </>}
      </div>
    </div>
  );
}

/** the film's exact card: shape · frame · fill · head (1,536 designs, src/argon/lib/cards.tsx); unset, each card picks one that fits the box style */
function CardPicker({ parts, value, set }: { parts: Studio["parts"]; value?: string; set: (v?: string) => void }) {
  const cur = (value ?? "").split(".");
  const keys = ["shapes", "frames", "fills", "heads"] as const, names = ["Shape", "Frame", "Fill", "Head"];
  const pickAt = (i: number, v: string) => {
    const base = value ? cur : [parts.shapes[1], parts.frames[0], parts.fills[0], parts.heads[0]];
    const next = [...base]; next[i] = v; set(next.join("."));
  };
  const any = () => set(keys.map((k) => parts[k][Math.floor(Math.random() * parts[k].length)]).join("."));
  return <>
    {keys.map((k, i) => <select key={k} value={value ? cur[i] : ""} onChange={(e) => e.target.value ? pickAt(i, e.target.value) : set(undefined)} title={names[i]}
      className="rounded-[10px] border border-[#e2e1da] bg-white px-2 py-1.5 font-semibold outline-none focus:border-[#a6f04a]">
      <option value="">{names[i]}: any</option>{parts[k].map((v) => <option key={v} value={v}>{v}</option>)}
    </select>)}
    <button type="button" onClick={any} className={chip(false)} title="A random one of the 1,536"><Shuffle className="mr-1 inline size-3.5" />Try one</button>
    {value && <button type="button" onClick={() => set(undefined)} className={chip(false)}>Fit the style</button>}
  </>;
}

/** the film's exact entrance: enter.kind[.direction].ease (576 of the 1,284 grammar motions, src/argon/lib/motion-d.tsx) */
function EnterPicker({ parts, value, set }: { parts: Studio["parts"]; value?: string; set: (v?: string) => void }) {
  const [, kind = "", a = "", b = ""] = (value ?? "").split(".");
  const travel = parts.travel.includes(kind), dir = travel ? a : "", ease = travel ? b : a;
  const make = (k: string, d: string, e: string) => parts.travel.includes(k) ? `enter.${k}.${d || "up"}.${e || "smooth"}` : `enter.${k}.${e || "smooth"}`;
  const any = () => { const ks = [...parts.travel, ...parts.place], k = ks[Math.floor(Math.random() * ks.length)];
    set(make(k, parts.dirs[Math.floor(Math.random() * parts.dirs.length)], parts.eases[Math.floor(Math.random() * parts.eases.length)])); };
  const sel = "rounded-[10px] border border-[#e2e1da] bg-white px-2 py-1.5 font-semibold outline-none focus:border-[#a6f04a]";
  return <>
    <select value={kind} onChange={(e) => e.target.value ? set(make(e.target.value, dir, ease)) : set(undefined)} className={sel}>
      <option value="">Kind: fits the motion</option>
      <optgroup label="Travels in">{parts.travel.map((k) => <option key={k} value={k}>{k}</option>)}</optgroup>
      <optgroup label="Appears in place">{parts.place.map((k) => <option key={k} value={k}>{k}</option>)}</optgroup>
    </select>
    {travel && <select value={dir} onChange={(e) => set(make(kind, e.target.value, ease))} className={sel}>{parts.dirs.map((d) => <option key={d} value={d}>from {d}</option>)}</select>}
    {kind && <select value={ease} onChange={(e) => set(make(kind, dir, e.target.value))} className={sel}>{parts.eases.map((x) => <option key={x} value={x}>{x}</option>)}</select>}
    <button type="button" onClick={any} className={chip(false)}><Shuffle className="mr-1 inline size-3.5" />Try one</button>
  </>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5"><span className="w-[74px] shrink-0 font-bold leading-tight text-[#5f5b57]">{label}</span>{children}</div>;
}
