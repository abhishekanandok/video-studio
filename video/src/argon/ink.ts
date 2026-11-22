/* What the frame check (place.tsx) counts as words meeting: pure box maths, so it is tested without a browser
   (backend/tests/test_ink.py). */
export type Box = { x: number; y: number; w: number; h: number };

const area = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** the letters, not the line box: a line's box carries its leading above and below, so two stacked lines' boxes touch */
export const ink = (t: Box): Box => ({ x: t.x, y: t.y + t.h * 0.2, w: t.w, h: t.h * 0.6 });

/** two pieces of text printed over each other: their letters share more than 8% of the smaller one */
export const textsMeet = (a: Box, b: Box) => area(ink(a), ink(b)) > Math.min(a.w * a.h, b.w * b.h) * 0.08;

/** a thin stroke across most of the words (a strike-through, an underline): meant, not a drawing covering them */
export const strokeAcross = (words: Box, mark: Box) => mark.w >= words.w * 0.6 && mark.h < mark.w * 0.25;
