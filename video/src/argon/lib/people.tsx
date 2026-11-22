/* LAYER 1, part G: PEOPLE. A person who stands, gestures, walks, talks and wears a costume, and two or three people
   talking or meeting, drawn by the stick-figure engine ported from MotionAgent (./avatar/core.js + stickman.json:
   94 avatars, 46 poses, 15 moves, 41 costume parts, 9 body styles; see ./avatar/THIRD_PARTY_NOTICES.md).
   Every figure is drawn in the film's look: the ink and paper of the theme, the accent on the costume, and the body style
   that suits the library look (a slim line figure in print, rubber hose in comic, scribble in sketch...).
     <Person avatar="doctor" pose="explain" size={560} />          labels point at it: to="id.head", "id.feet", "id.center"
     <Conversation people={[{ avatar: "kid" }, { avatar: "professor" }]} lines={[{ who: 0, text: "Why?", at: 0.4 }]} /> */
import { useScene, clamp01, family } from "../kit";
import { usePiece } from "../place";
import { drawAvatar, VIEWBOX } from "./avatar/core";
import DATA from "./avatar/stickman.json";
import { ease, rand } from "./motion";
import { block } from "./parts";

export type AvatarName = "classic" | "hoodie" | "girl" | "professor" | "business" | "kid" | "elder" | "silhouette" | "doctor" | "student" | "gamer" | "athlete" | "woman" | "king" | "minimal" | "warrior" | "villager" | "tribal" | "adventurer" | "mascot" | "explorer" | "chibi" | "casual" | "executive" | "zeke" | "office" | "exec" | "builder" | "scientist" | "grad" | "chef" | "lady" | "robot" | "agent" | "ink_head" | "basic_stick" | "tshirt" | "hoodie_blue" | "cap_style" | "jacket" | "school_uniform" | "college_student" | "office_worker" | "business_suit" | "teacher" | "doctor_coat" | "nurse" | "lab_scientist" | "engineer" | "police" | "chef_cook" | "mechanic" | "delivery" | "driver" | "pilot" | "flight_attendant" | "sportsperson" | "gamer_pro" | "photographer" | "reporter" | "musician" | "youtuber" | "student_girl" | "professional_woman" | "casual_girl" | "caveman" | "tribal_hunter" | "ancient_indian" | "sage" | "priest" | "maharaja" | "rani" | "spartan" | "samurai" | "roman_soldier" | "knight" | "ninja" | "wizard" | "viking" | "farmer" | "village_man" | "village_woman" | "nomad" | "fisherman" | "traveller" | "mountaineer" | "hiker" | "archer" | "cowboy" | "pirate" | "astronaut" | "rain_outfit" | "snow_outfit" | "firefighter";
export type PoseName = "stand" | "point" | "present" | "happy" | "think" | "shrug" | "sad" | "hold" | "shock" | "facepalm" | "pray" | "confident" | "tired" | "sit" | "victory" | "meditate" | "clasp" | "crouch" | "leap" | "tuck" | "hang" | "sit_edge" | "slump" | "sit_floor" | "relax" | "kneel" | "lie" | "lie_front" | "point_up" | "cheer" | "hands_hips" | "arms_cross" | "surprise" | "scared" | "thumbs_up" | "salute" | "bow" | "push" | "pull" | "carry" | "lift" | "windup" | "throw" | "balance" | "stumble" | "explain_open" | "walk" | "run" | "climb" | "celebrate" | "wave" | "dance" | "jump" | "explain" | "type" | "nod" | "no" | "cry" | "jumping_jacks" | "sneak" | "climb_ladder";
export type FigureStyle = "slim" | "kino" | "geometric" | "rounded" | "mascot" | "scribble" | "rubberhose" | "bold" | "sporty";
export const AVATARS = Object.keys(DATA.avatars) as AvatarName[];
export const POSES = [...Object.keys(DATA.poses), ...Object.keys(DATA.moves)] as PoseName[];
export const COSTUME_PARTS = Object.keys(DATA.parts);

/** the body style that suits each library look (theme.look) */
const FIGURE: Record<string, FigureStyle> = {
  print: "slim", line: "kino", blueprint: "kino", neon: "geometric", clay: "rounded", shaded: "mascot", sketch: "scribble",
  chalk: "scribble", comic: "rubberhose", vintage: "rubberhose", paper: "bold", flat: "bold", watercolor: "slim",
};
const W = 320, H = 470, FEET = 432 / 470;  // the drawing box (VIEWBOX) and where the feet stand in it
/** light or dark ground, from a #rrggbb colour */
const darkGround = (c: string) => { const m = c.match(/^#([0-9a-f]{6})$/i); if (!m) return false; const n = parseInt(m[1], 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 < 0.45; };

/** one figure's SVG, in the scene's theme */
function useFigure({ avatar, pose, from, blend, t, k, talking, figure, wear, accent, look, gait }: { avatar: string; pose: string; from?: string; blend?: number; t: number; k: number;
  talking: boolean; figure?: FigureStyle; wear?: string[]; accent?: string; look?: number; gait?: number }) {
  const { theme } = useScene();
  const base = (DATA.avatars as Record<string, { parts?: string[]; [k: string]: unknown }>)[avatar] ?? DATA.avatars.classic;
  const dark = darkGround(theme.bg?.[0] ?? theme.paper);
  // the costume keeps its own colours (a doctor's coat is white); the outline takes the film's ink. On a light page the
  // body keeps its style's own fill (painting it the page's colour made it vanish); on a dark one it takes the muted ink
  const av = { ...base, parts: [...(base.parts ?? []), ...(wear ?? [])], line: theme.ink, ...(dark ? { fill: theme.muted } : {}) };
  return drawAvatar({ data: DATA, avatar: av, pose, from, blend, t, k, draw: 1, talking, ink: theme.ink, accent: accent ?? theme.accent,
    face: dark ? theme.muted : "#ffffff", style: figure ?? FIGURE[theme.look ?? "flat"] ?? "slim", dark, human: true, look, gaitCycles: gait });
}

/* ================= PEOPLE ================= */
/** a person who acts: avatar (94 kinds: classic, doctor, professor, kid, elder, business, chef, scientist, king, robot, student, athlete…), pose (46 poses and moves: stand, point, explain, think, shrug, facepalm, happy, sad, shock, victory, cheer, kneel, sit, carry, push, pull, wave, walk, run, climb, dance, jump, type, nod, no, cry…), gestures (pose changes over time, each blended in: [{pose:"think",at:1},{pose:"point",at:2.5}]), talk (the mouth moves: true, or [[start,end],…] in seconds), wear (extra costume parts: cap, glasses, backpack, hardhat, crown, chef_hat, headphones, beard, tie, coat…), walk (to: px it walks right, or left if negative, over dur s), figure (body style; default: the one that suits the film's look), id (labels point at "id.head", "id.feet", "id.center") */
function PersonView({ avatar = "classic", pose = "stand", gestures, talk, wear, size = 560, at = 0, flip = false, figure, accent, walk, look, id }: {
  avatar?: AvatarName; pose?: PoseName; gestures?: { pose: PoseName; at: number }[]; talk?: boolean | [number, number][]; wear?: string[]; size?: number; at?: number;
  flip?: boolean; figure?: FigureStyle; accent?: string; walk?: { to: number; dur?: number }; look?: number; id?: string }) {
  const { t } = useScene();
  const u = Math.max(0, t - at);
  // the gesture now, blended 0.35 s in from the last one
  const seq = gestures?.length ? [...gestures].sort((a, b) => a.at - b.at) : null;
  const i = seq ? Math.max(0, seq.reduce((k, g, j) => (g.at <= t ? j : k), -1)) : -1;
  const now = seq ? seq[i].pose : pose, from = seq && i > 0 ? seq[i - 1].pose : undefined;
  const blend = seq && i > 0 ? clamp01((t - seq[i].at) / 0.35) : 1;
  const talking = talk === true ? true : Array.isArray(talk) ? talk.some(([a, b]) => t >= a && t <= b) : false;
  const k = ease.back(clamp01(u / 0.5));
  const wd = walk?.dur ?? 2.4, wk = walk ? clamp01(u / wd) : 0;
  const dx = walk ? walk.to * ease.inOut(wk) : 0;
  const moving = walk && wk > 0 && wk < 1;
  const svg = useFigure({ avatar, pose: moving ? "walk" : now, from, blend, t: u, k, talking, figure, wear, accent, look, gait: walk ? Math.abs(dx) / (size * 0.45) : undefined });
  const w = size * W / H;
  usePiece(id, { w, h: size, at: (n) => ({ head: [w / 2, size * 0.16], top: [w / 2, size * 0.05], feet: [w / 2, size * FEET], center: [w / 2, size * 0.5], hand: [w * (flip ? 0.25 : 0.75), size * 0.5] } as Record<string, [number, number]>)[n] ?? null });
  return (
    <svg data-piece={id} viewBox={VIEWBOX} width={w} height={size} style={{ overflow: "visible", opacity: clamp01(u / 0.2), transform: `translateX(${dx}px) ${flip !== (walk ? walk.to < 0 : false) ? "scaleX(-1)" : ""}` }}
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
export const Person = block("Person", PersonView);

type Line = { who: number; text: string; at: number; pose?: PoseName };
type Who = { avatar: AvatarName; name?: string; wear?: string[]; accent?: string };
const CLOSE: Record<string, number> = { walk_meet: 260, handshake: 170, give: 290, turn_away: 330, argue: 310, high_five: 175 };

/** a speech bubble in the film's look, its tail toward the speaker; its words shrink to fit (never cut) */
function Bubble({ x, bottom, width, text, at, dim }: { x: number; bottom: number; width: number; text: string; at: number; dim: boolean }) {
  const { t, theme } = useScene();
  const p = ease.back(clamp01((t - at) / 0.35));
  if (t < at) return null;
  const size = Math.max(32, Math.min(46, (width * 2.1) / Math.max(8, text.length * 0.55)));
  return (
    <div style={{ position: "absolute", left: x - width / 2, width, bottom: 1080 - bottom, display: "flex", justifyContent: "center", opacity: dim ? 0.5 : 1,
      transform: `scale(${0.6 + 0.4 * p})`, transformOrigin: "50% 100%" }}>
      <div style={{ position: "relative", background: theme.paper, color: theme.ink, border: `3px solid ${theme.ink}`, borderRadius: Math.min(34, (theme.radius ?? 18) + 12), padding: "18px 28px",
        fontFamily: family(theme.font), fontSize: size, lineHeight: 1.15, textAlign: "center", overflowWrap: "anywhere" }}>
        {text}
        <svg width={40} height={30} style={{ position: "absolute", left: "50%", bottom: -27, marginLeft: -20, overflow: "visible" }}>
          <path d="M2 0 L20 26 L38 0" fill={theme.paper} stroke={theme.ink} strokeWidth={3} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
function NameTag({ x, top, text, color }: { x: number; top: number; text: string; color: string }) {
  const { theme } = useScene();
  return <div style={{ position: "absolute", left: x - 200, width: 400, top, display: "flex", justifyContent: "center" }}>
    <span style={{ background: color, color: darkGround(color) ? theme.paper : theme.ink, fontFamily: family(theme.font), fontSize: 34, padding: "4px 16px", borderRadius: 6 }}>{text}</span>
  </div>;
}

/** two or three people, the whole frame: mode "talk" (side by side; each line pops up as a speech bubble on its `at` and only the speaker's mouth moves, the speaker gestures) or "meet" (two walk in from the sides, then action: walk_meet, handshake, give, high_five, argue, turn_away); people [{avatar, name?, wear?}], lines [{who: 0|1|2, text, at, pose?}] */
function ConversationView({ people, lines = [], mode = "talk", action = "walk_meet", floor = 900, size }: { people: Who[]; lines?: Line[]; mode?: "talk" | "meet"; action?: "walk_meet" | "handshake" | "give" | "high_five" | "argue" | "turn_away"; floor?: number; size?: number }) {
  const { t, theme } = useScene();
  const said = [...lines].sort((a, b) => a.at - b.at).filter((l) => l.at <= t);
  const last = said[said.length - 1];
  const inks = [theme.accent, theme.accent2, theme.muted];
  if (mode === "meet") {
    const [A, B] = people;
    const h = size ?? 640;
    const first = lines[0]?.at ?? 0.6;
    const arrive = Math.min(2.6, Math.max(1.3, first + 1.3));
    const w = ease.inOut(clamp01((t - 0.2) / (arrive - 0.2)));
    const gap = CLOSE[action] ?? 210;
    const xa = 230 + (960 - gap - 230) * w, xb = 1690 + (960 + gap - 1690) * w;
    const there = t >= arrive, second = Math.max(lines[1]?.at ?? arrive + 0.6, arrive), late = t >= second;
    const beat = Math.floor((t - arrive) / 0.8) % 2 === 0;
    let pa: PoseName = "walk", pb: PoseName = "walk", fb = true;
    if (there) {
      if (action === "walk_meet") { pa = "wave"; pb = late ? "happy" : "stand"; }
      if (action === "handshake") { pa = "point"; pb = "point"; }
      if (action === "high_five") { pa = late ? "celebrate" : "victory"; pb = late ? "celebrate" : "victory"; }
      if (action === "argue") { pa = beat ? "point" : "shrug"; pb = beat ? "shrug" : "point"; }
      if (action === "turn_away") { pa = late ? "shrug" : "point"; pb = late ? "arms_cross" : "stand"; fb = !late; }
      if (action === "give") { pa = late ? "present" : "hold"; pb = late ? "hold" : "stand"; }
    }
    const spark = action === "high_five" && late ? clamp01((t - second) / 0.5) : 0;
    const fw = h * W / H;
    return <>
      <div style={{ position: "absolute", left: xa - fw / 2, top: floor - h * FEET }}><PersonView avatar={A.avatar} wear={A.wear} accent={A.accent ?? inks[0]} pose={pa} size={h} talk={there && !late} /></div>
      <div style={{ position: "absolute", left: xb - fw / 2, top: floor - h * FEET }}><PersonView avatar={B.avatar} wear={B.wear} accent={B.accent ?? inks[1]} pose={pb} size={h} flip={fb} talk={late} /></div>
      {A.name && <NameTag x={xa} top={floor + 14} text={A.name} color={A.accent ?? inks[0]} />}
      {B.name && <NameTag x={xb} top={floor + 14} text={B.name} color={B.accent ?? inks[1]} />}
      {lines[0] && there && <Bubble x={xa} bottom={floor - h * FEET + h * 0.02} width={560} text={lines[0].text} at={Math.max(arrive, lines[0].at)} dim={late} />}
      {lines[1] && late && <Bubble x={xb} bottom={floor - h * FEET + h * 0.02} width={560} text={lines[1].text} at={second} dim={false} />}
      {spark > 0 && spark < 1 && <div style={{ position: "absolute", left: 870, top: floor - h * 0.62, width: 180, height: 180, borderRadius: "50%", border: `10px solid ${theme.accent}`, transform: `scale(${0.4 + spark})`, opacity: 1 - spark }} />}
    </>;
  }
  const n = Math.min(3, people.length);
  const xs = n === 3 ? [380, 960, 1540] : n === 2 ? [600, 1320] : [960];
  const h = size ?? (n === 3 ? 520 : 580);
  return <>{people.slice(0, n).map((p, i) => {
    const mine = said.filter((l) => l.who === i), line = mine[mine.length - 1];
    const speaking = last?.who === i;
    const next = lines.filter((l) => l.at > (line?.at ?? -1)).sort((a, b) => a.at - b.at)[0];
    const fw = h * W / H;
    return <div key={i}>
      <div style={{ position: "absolute", left: xs[i] - fw / 2, top: floor - h * FEET }}>
        <PersonView avatar={p.avatar} wear={p.wear} accent={p.accent ?? inks[i]} size={h} flip={xs[i] > 960} at={i * 0.15}
          pose={speaking ? line?.pose ?? "explain" : "stand"} talk={speaking ? [[line!.at, next?.at ?? line!.at + 3]] : false} look={xs[i] > 960 ? -0.6 : 0.6} />
      </div>
      {p.name && <NameTag x={xs[i]} top={floor + 14} text={p.name} color={p.accent ?? inks[i]} />}
      {line && <Bubble key={line.at} x={xs[i]} bottom={floor - h * FEET + h * 0.02} width={n === 3 ? 470 : 600} text={line.text} at={line.at} dim={!speaking} />}
    </div>;
  })}</>;
}
export const Conversation = block("Conversation", ConversationView);

/** a crowd of small people (a town, an audience, a queue): count figures in rows, each a different avatar, gently alive */
function CrowdView({ count = 24, w = 1500, rows = 3, size = 170, at = 0, seed = 3, pose = "stand" }: { count?: number; w?: number; rows?: number; size?: number; at?: number; seed?: number; pose?: PoseName }) {
  const per = Math.ceil(count / rows), fw = size * W / H;
  const names = AVATARS.filter((a) => a !== "silhouette");
  return <div style={{ position: "relative", width: w, height: size + (rows - 1) * size * 0.32 }}>
    {Array.from({ length: count }, (_, i) => {
      const r = Math.floor(i / per), c = i % per;
      const x = (c + (r % 2) * 0.5) * (w - fw) / Math.max(1, per - 0.5), y = (rows - 1 - r) * size * 0.32;
      return <div key={i} style={{ position: "absolute", left: x, top: y, zIndex: r }}>
        <PersonView avatar={names[Math.floor(rand(seed * 31 + i) * names.length)] as AvatarName} pose={pose} size={size * (0.9 + rand(i * 7) * 0.2)} at={at + rand(i * 3) * 0.6} />
      </div>;
    })}
  </div>;
}
export const Crowd = block("Crowd", CrowdView);
