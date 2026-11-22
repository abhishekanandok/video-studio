/* THE LOOK a print film is made in (its DNA), and the hook every piece reads it with. Kept apart from the print kit
   (./kit re-exports both) so a library piece can follow the look without loading the kit's typefaces. */
import { createContext, useContext } from "react";

export type DNA = {
  paper: string; fibre: number;            // stock colour, fibre strength 0..1
  ink: string; inks: string[];             // key ink (type, lines) and 3-4 colour inks, in order of use
  display: string; body: string;           // typeface keys (FONTS)
  mono?: string;                           // typeface for small printed labels (spread ornaments, board captions)
  layout: "editorial" | "poster" | "ledger" | "spine" | "open";
  grain: number; misreg: number;           // ink mottling 0..1, colour misregistration px
  issue: string;                           // the folio line printed on every sheet ("Vol. 3 · Money")
  // look families (video/looks.py): the ground can be dark, with its own texture and ornament pack
  family?: string; dark?: boolean;
  texture?: string;                        // riso | letterpress | offset | halftone | photocopy | grid | chalk | marker | glow | scanline | soft | watercolor | film | benday | manila | cork | gradient | ricepaper | pixel | iridescent | vellum | concrete | thermal | cells | topo
  ornaments?: string;                      // vox | swiss | zine | technical | newsprint | chalk | neon | marker
  board?: string; boardInk?: string;       // the panel colour set into the page and the type printed on it
  box?: string;                            // the film's text-box style (video/looks.py BOX): sets the library's corners, outlines, shadows
  lib?: string; tint?: number;             // the motion library's look for this family (src/argon/lib/style.tsx) and how far its colours lean to the inks
  set?: string;                            // what the page sits in: flat | sunlit | studio | wave | blobs | desk | arch (<Set>)
  material?: string; depth?: string;       // 3D charts and panels (src/print/depth.tsx): ink | stone | glass | clay | paper | metal; flat | raised | iso
  shape?: string; scale?: string;          // cards: sharp | rounded | pill | notched | tilted | ticket | torn; composition: hero | pair | cards
  motion?: string;
  // pinned in the look studio (video/looks.py clean_pin): the film's card design (src/argon/lib/cards.tsx id), its exact
  // entrance (a motion-grammar id from src/argon/lib/motion-d.tsx) and the scene transitions it may use (src/argon/film.tsx)
  card?: string; enter?: string; transitions?: string[];
  pen?: Pen;                               // how this look inks a shape (looks.py PEN; src/argon/pen.tsx)
};

/** the look's pen (looks.py PEN_OUTLINES, PEN_FILLS, PEN_PATTERNS) */
export type Pen = { outline: string; w: number; fill: string; pattern: string; wobble: number };

export const Ctx = createContext<DNA | null>(null);
export const useDNA = () => useContext(Ctx)!;  // null outside a print film: the grown library falls back to the theme
