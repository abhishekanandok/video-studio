export const FPS = 30;
export const INTRO = 5 * FPS;
export const OUTRO = 5 * FPS;
const GAP = 0.3; // seconds of breath between lines
const PAD = 0.8; // seconds held at the end of a scene

export type Line = { speaker: string; subtitle: string; audio: string; seconds: number };
export type Scene = { title: string; diagram: string; caption: string; image: string; lines: Line[] };
export type Props = { title: string; tagline: string; lesson: number; scenes: Scene[] };

/** Frame offsets for every scene and line, derived from the real audio lengths. */
export function layout(p: Props) {
  let at = INTRO;
  const scenes = p.scenes.map((s) => {
    const start = at;
    let t = 0;
    const lines = s.lines.map((l) => {
      const from = Math.round((t + 0.4) * FPS);
      t += l.seconds + GAP;
      return { ...l, from, frames: Math.max(1, Math.round(l.seconds * FPS)) };
    });
    const frames = Math.max(Math.round((t + PAD) * FPS), 4 * FPS);
    at += frames;
    return { ...s, start, frames, lines };
  });
  return { scenes, total: at + OUTRO };
}
