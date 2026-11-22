/** Slide skills (the Skill Tab): names for the choices a look makes. */
export const LAYOUT_NAMES: Record<string, string> = {
  card: "Picture in the card", picture_right: "Picture beside the card", on_picture: "Card over a full-screen picture",
};
export const FRAME_NAMES: Record<string, string> = {
  print: "Framed print", blend: "Painted onto the page", blob: "Soft rounded shape",
};
export const SOURCE_NAMES: Record<string, string> = {
  qwen: "Painted by Qwen-Image, in the style", wikimedia: "Real photos from Wikimedia (Qwen if none)",
};

const FILL_NAMES: Record<string, string> = { scene: "scene picture", scene2: "second picture", bullet: "bullet picture", sticker: "sticker", asset: "your image" };
/** "Card left · scene picture (oval), 2 stickers" */
export function describeCanvas(cv: any): string {
  if (!cv) return "Picture in the card";
  const side = cv.card.x + cv.card.w / 2 < 860 ? "Card left" : cv.card.x + cv.card.w / 2 > 1060 ? "Card right" : "Card centre";
  const counts: Record<string, number> = {};
  for (const s of cv.slots) counts[s.fill] = (counts[s.fill] ?? 0) + 1;
  const parts = Object.entries(counts).map(([k, n]) => `${n > 1 ? `${n} ` : ""}${FILL_NAMES[k] ?? k}${n > 1 ? "s" : ""}`);
  return [side, ...parts].join(" · ");
}
