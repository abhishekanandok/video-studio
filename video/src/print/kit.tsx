/* Print kit: every scene is a printed sheet (ink on paper stock), full frame, never UI cards or stickers. A film's look
   comes from its print DNA (paper stock x ink set x typefaces x layout grammar x texture), picked per film in
   video/printdna.py, so no two films look alike. Pieces are pure functions of t (seconds into the scene).
     <Sheet dna folio? page?>  ...  </Sheet>      the paper, its grain, rules and page marks; everything sits on it
     <BigNumber/> <InkPie/> <InkHeatmap/> <InkBars/> <Steps/> <Headline/> <PrintPhoto/> <Inked>{drawing}</Inked>
   Coordinates: px on a 1920x1080 frame. */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame } from "remotion";
import { loadFont as abril } from "@remotion/google-fonts/AbrilFatface";
import { loadFont as anton } from "@remotion/google-fonts/Anton";
import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as bodoni } from "@remotion/google-fonts/BodoniModa";
import { loadFont as chivoMono } from "@remotion/google-fonts/ChivoMono";
import { loadFont as dmSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as ebGaramond } from "@remotion/google-fonts/EBGaramond";
import { loadFont as fraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as gloock } from "@remotion/google-fonts/Gloock";
import { loadFont as instrument } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as caslon } from "@remotion/google-fonts/LibreCaslonText";
import { loadFont as newsreader } from "@remotion/google-fonts/Newsreader";
import { loadFont as oswald } from "@remotion/google-fonts/Oswald";
import { loadFont as plexSerif } from "@remotion/google-fonts/IBMPlexSerif";
import { loadFont as plexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as sourceSerif } from "@remotion/google-fonts/SourceSerif4";
import { loadFont as spaceMono } from "@remotion/google-fonts/SpaceMono";
import { loadFont as archivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as architects } from "@remotion/google-fonts/ArchitectsDaughter";
import { loadFont as barlowCond } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as caveat } from "@remotion/google-fonts/Caveat";
import { loadFont as ibmPlexSans } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as interTight } from "@remotion/google-fonts/InterTight";
import { loadFont as jetbrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as kalam } from "@remotion/google-fonts/Kalam";
import { loadFont as lora } from "@remotion/google-fonts/Lora";
import { loadFont as merriweather } from "@remotion/google-fonts/Merriweather";
import { loadFont as oldStandard } from "@remotion/google-fonts/OldStandardTT";
import { loadFont as orbitron } from "@remotion/google-fonts/Orbitron";
import { loadFont as patrickHand } from "@remotion/google-fonts/PatrickHand";
import { loadFont as permanentMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as rajdhani } from "@remotion/google-fonts/Rajdhani";
import { loadFont as robotoCond } from "@remotion/google-fonts/RobotoCondensed";
import { loadFont as robotoSlab } from "@remotion/google-fonts/RobotoSlab";
import { loadFont as schibsted } from "@remotion/google-fonts/SchibstedGrotesk";
import { loadFont as spaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as teko } from "@remotion/google-fonts/Teko";
import { loadFont as workSans } from "@remotion/google-fonts/WorkSans";
import { loadFont as zillaSlab } from "@remotion/google-fonts/ZillaSlab";
import { loadFont as f_unbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as f_delagothic } from "@remotion/google-fonts/DelaGothicOne";
import { loadFont as f_rubikmono } from "@remotion/google-fonts/RubikMonoOne";
import { loadFont as f_staatliches } from "@remotion/google-fonts/Staatliches";
import { loadFont as f_syne } from "@remotion/google-fonts/Syne";
import { loadFont as f_poppins } from "@remotion/google-fonts/Poppins";
import { loadFont as f_dmsans } from "@remotion/google-fonts/DMSans";
import { loadFont as f_manrope } from "@remotion/google-fonts/Manrope";
import { loadFont as f_outfit } from "@remotion/google-fonts/Outfit";
import { loadFont as f_sora } from "@remotion/google-fonts/Sora";
import { loadFont as f_vt323 } from "@remotion/google-fonts/VT323";
import { loadFont as f_sharetech } from "@remotion/google-fonts/ShareTechMono";
import { loadFont as f_silkscreen } from "@remotion/google-fonts/Silkscreen";
import { loadFont as f_pressstart } from "@remotion/google-fonts/PressStart2P";
import { loadFont as f_jost } from "@remotion/google-fonts/Jost";
import { loadFont as f_josefin } from "@remotion/google-fonts/JosefinSans";
import { loadFont as f_rubik } from "@remotion/google-fonts/Rubik";
import { loadFont as f_bangers } from "@remotion/google-fonts/Bangers";
import { loadFont as f_luckiest } from "@remotion/google-fonts/LuckiestGuy";
import { loadFont as f_comicneue } from "@remotion/google-fonts/ComicNeue";
import { loadFont as f_indieflower } from "@remotion/google-fonts/IndieFlower";
import { loadFont as f_gaegu } from "@remotion/google-fonts/Gaegu";
import { loadFont as f_reenie } from "@remotion/google-fonts/ReenieBeanie";
import { loadFont as f_librefranklin } from "@remotion/google-fonts/LibreFranklin";
import { loadFont as f_montserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as f_lato } from "@remotion/google-fonts/Lato";
import { loadFont as f_cormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as f_specialelite } from "@remotion/google-fonts/SpecialElite";
import { loadFont as f_courierprime } from "@remotion/google-fonts/CourierPrime";
import { loadFont as f_monoton } from "@remotion/google-fonts/Monoton";
import { loadFont as f_bungee } from "@remotion/google-fonts/Bungee";
import { loadFont as f_imfell } from "@remotion/google-fonts/IMFellEnglish";
import { loadFont as f_dmmono } from "@remotion/google-fonts/DMMono";
import { loadFont as f_rye } from "@remotion/google-fonts/Rye";
import { loadFont as f_righteous } from "@remotion/google-fonts/Righteous";
import { loadFont as f_limelight } from "@remotion/google-fonts/Limelight";
import { loadFont as f_chakra } from "@remotion/google-fonts/ChakraPetch";
import { loadFont as f_shippori } from "@remotion/google-fonts/ShipporiMincho";
import { loadFont as f_yuji } from "@remotion/google-fonts/YujiSyuku";
import { loadFont as f_fredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as f_nunito } from "@remotion/google-fonts/Nunito";
import { loadFont as f_alegreyasc } from "@remotion/google-fonts/AlegreyaSC";
import { loadFont as f_alfaslab } from "@remotion/google-fonts/AlfaSlabOne";
import { loadFont as f_allerta } from "@remotion/google-fonts/AllertaStencil";
import { loadFont as f_audiowide } from "@remotion/google-fonts/Audiowide";
import { loadFont as f_baloo } from "@remotion/google-fonts/Baloo2";
import { loadFont as f_baskerville } from "@remotion/google-fonts/LibreBaskerville";
import { loadFont as f_bitter } from "@remotion/google-fonts/Bitter";
import { loadFont as f_blackops } from "@remotion/google-fonts/BlackOpsOne";
import { loadFont as f_cinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as f_comfortaa } from "@remotion/google-fonts/Comfortaa";
import { loadFont as f_exo } from "@remotion/google-fonts/Exo2";
import { loadFont as f_lobster } from "@remotion/google-fonts/Lobster";
import { loadFont as f_majormono } from "@remotion/google-fonts/MajorMonoDisplay";
import { loadFont as f_marcellus } from "@remotion/google-fonts/Marcellus";
import { loadFont as f_medieval } from "@remotion/google-fonts/MedievalSharp";
import { loadFont as f_michroma } from "@remotion/google-fonts/Michroma";
import { loadFont as f_overpass } from "@remotion/google-fonts/Overpass";
import { loadFont as f_pacifico } from "@remotion/google-fonts/Pacifico";
import { loadFont as f_poiret } from "@remotion/google-fonts/PoiretOne";
import { loadFont as f_roboto } from "@remotion/google-fonts/Roboto";
import { loadFont as f_sourcesans } from "@remotion/google-fonts/SourceSans3";
import { loadFont as f_stardos } from "@remotion/google-fonts/StardosStencil";
import { loadFont as f_tomorrow } from "@remotion/google-fonts/Tomorrow";
import { loadFont as f_ultra } from "@remotion/google-fonts/Ultra";
import { loadFont as f_unifraktur } from "@remotion/google-fonts/UnifrakturMaguntia";
import { Placer } from "../argon/place";
import { Ctx, type DNA, useDNA } from "./dna";
export { useDNA, type DNA };


/* ---- DNA ------------------------------------------------------------------------------------------------------- */

const FONTS: Record<string, { family: string; load: () => unknown }> = {
  abril: { family: "Abril Fatface", load: () => abril() },
  anton: { family: "Anton", load: () => anton() },
  bebas: { family: "Bebas Neue", load: () => bebas() },
  bodoni: { family: "Bodoni Moda", load: () => bodoni("normal", { weights: ["500", "800"], subsets: ["latin"] }) },
  chivomono: { family: "Chivo Mono", load: () => chivoMono("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  dmserif: { family: "DM Serif Display", load: () => dmSerif() },
  garamond: { family: "EB Garamond", load: () => ebGaramond("normal", { weights: ["400", "600"], subsets: ["latin"] }) },
  fraunces: { family: "Fraunces", load: () => fraunces("normal", { weights: ["400", "900"], subsets: ["latin"] }) },
  gloock: { family: "Gloock", load: () => gloock() },
  instrument: { family: "Instrument Serif", load: () => instrument() },
  caslon: { family: "Libre Caslon Text", load: () => caslon("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  newsreader: { family: "Newsreader", load: () => newsreader("normal", { weights: ["400", "600"], subsets: ["latin"] }) },
  oswald: { family: "Oswald", load: () => oswald("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  plexserif: { family: "IBM Plex Serif", load: () => plexSerif("normal", { weights: ["400", "600"], subsets: ["latin"] }) },
  plexmono: { family: "IBM Plex Mono", load: () => plexMono("normal", { weights: ["400", "600"], subsets: ["latin"] }) },
  sourceserif: { family: "Source Serif 4", load: () => sourceSerif("normal", { weights: ["400", "600"], subsets: ["latin"] }) },
  spacemono: { family: "Space Mono", load: () => spaceMono("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  archivoblack: { family: "Archivo Black", load: () => archivoBlack() },
  architects: { family: "Architects Daughter", load: () => architects() },
  barlowcond: { family: "Barlow Condensed", load: () => barlowCond("normal", { weights: ["500", "800"], subsets: ["latin"] }) },
  caveat: { family: "Caveat", load: () => caveat("normal", { weights: ["500", "700"], subsets: ["latin"] }) },
  plexsans: { family: "IBM Plex Sans", load: () => ibmPlexSans("normal", { weights: ["400", "600"], subsets: ["latin"] }) },
  inter: { family: "Inter", load: () => inter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }) },
  intertight: { family: "Inter Tight", load: () => interTight("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }) },
  jetbrains: { family: "JetBrains Mono", load: () => jetbrains("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  kalam: { family: "Kalam", load: () => kalam("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  lora: { family: "Lora", load: () => lora("normal", { weights: ["400", "600"], subsets: ["latin"] }) },
  merriweather: { family: "Merriweather", load: () => merriweather("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  oldstandard: { family: "Old Standard TT", load: () => oldStandard("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  orbitron: { family: "Orbitron", load: () => orbitron("normal", { weights: ["500", "800"], subsets: ["latin"] }) },
  patrickhand: { family: "Patrick Hand", load: () => patrickHand() },
  marker: { family: "Permanent Marker", load: () => permanentMarker() },
  playfair: { family: "Playfair Display", load: () => playfair("normal", { weights: ["400", "800"], subsets: ["latin"] }) },
  rajdhani: { family: "Rajdhani", load: () => rajdhani("normal", { weights: ["500", "700"], subsets: ["latin"] }) },
  robotocond: { family: "Roboto Condensed", load: () => robotoCond("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  robotoslab: { family: "Roboto Slab", load: () => robotoSlab("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  schibsted: { family: "Schibsted Grotesk", load: () => schibsted("normal", { weights: ["400", "800"], subsets: ["latin"] }) },
  spacegrotesk: { family: "Space Grotesk", load: () => spaceGrotesk("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  teko: { family: "Teko", load: () => teko("normal", { weights: ["500", "700"], subsets: ["latin"] }) },
  worksans: { family: "Work Sans", load: () => workSans("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  zillaslab: { family: "Zilla Slab", load: () => zillaSlab("normal", { weights: ["400", "700"], subsets: ["latin"] }) },
  unbounded: { family: "Unbounded", load: () => f_unbounded("normal", { subsets: ["latin"] }) },
  delagothic: { family: "Dela Gothic One", load: () => f_delagothic("normal", { subsets: ["latin"] }) },
  rubikmono: { family: "Rubik Mono One", load: () => f_rubikmono("normal", { subsets: ["latin"] }) },
  staatliches: { family: "Staatliches", load: () => f_staatliches("normal", { subsets: ["latin"] }) },
  syne: { family: "Syne", load: () => f_syne("normal", { subsets: ["latin"] }) },
  poppins: { family: "Poppins", load: () => f_poppins("normal", { subsets: ["latin"] }) },
  dmsans: { family: "DM Sans", load: () => f_dmsans("normal", { subsets: ["latin"] }) },
  manrope: { family: "Manrope", load: () => f_manrope("normal", { subsets: ["latin"] }) },
  outfit: { family: "Outfit", load: () => f_outfit("normal", { subsets: ["latin"] }) },
  sora: { family: "Sora", load: () => f_sora("normal", { subsets: ["latin"] }) },
  vt323: { family: "VT323", load: () => f_vt323("normal", { subsets: ["latin"] }) },
  sharetech: { family: "Share Tech Mono", load: () => f_sharetech("normal", { subsets: ["latin"] }) },
  silkscreen: { family: "Silkscreen", load: () => f_silkscreen("normal", { subsets: ["latin"] }) },
  pressstart: { family: "Press Start 2P", load: () => f_pressstart("normal", { subsets: ["latin"] }) },
  jost: { family: "Jost", load: () => f_jost("normal", { subsets: ["latin"] }) },
  josefin: { family: "Josefin Sans", load: () => f_josefin("normal", { subsets: ["latin"] }) },
  rubik: { family: "Rubik", load: () => f_rubik("normal", { subsets: ["latin"] }) },
  bangers: { family: "Bangers", load: () => f_bangers("normal", { subsets: ["latin"] }) },
  luckiest: { family: "Luckiest Guy", load: () => f_luckiest("normal", { subsets: ["latin"] }) },
  comicneue: { family: "Comic Neue", load: () => f_comicneue("normal", { subsets: ["latin"] }) },
  indieflower: { family: "Indie Flower", load: () => f_indieflower("normal", { subsets: ["latin"] }) },
  gaegu: { family: "Gaegu", load: () => f_gaegu("normal", { subsets: ["latin"] }) },
  reenie: { family: "Reenie Beanie", load: () => f_reenie("normal", { subsets: ["latin"] }) },
  librefranklin: { family: "Libre Franklin", load: () => f_librefranklin("normal", { subsets: ["latin"] }) },
  montserrat: { family: "Montserrat", load: () => f_montserrat("normal", { subsets: ["latin"] }) },
  lato: { family: "Lato", load: () => f_lato("normal", { subsets: ["latin"] }) },
  cormorant: { family: "Cormorant Garamond", load: () => f_cormorant("normal", { subsets: ["latin"] }) },
  specialelite: { family: "Special Elite", load: () => f_specialelite("normal", { subsets: ["latin"] }) },
  courierprime: { family: "Courier Prime", load: () => f_courierprime("normal", { subsets: ["latin"] }) },
  monoton: { family: "Monoton", load: () => f_monoton("normal", { subsets: ["latin"] }) },
  bungee: { family: "Bungee", load: () => f_bungee("normal", { subsets: ["latin"] }) },
  imfell: { family: "IM Fell English", load: () => f_imfell("normal", { subsets: ["latin"] }) },
  dmmono: { family: "DM Mono", load: () => f_dmmono("normal", { subsets: ["latin"] }) },
  rye: { family: "Rye", load: () => f_rye("normal", { subsets: ["latin"] }) },
  righteous: { family: "Righteous", load: () => f_righteous("normal", { subsets: ["latin"] }) },
  limelight: { family: "Limelight", load: () => f_limelight("normal", { subsets: ["latin"] }) },
  chakra: { family: "Chakra Petch", load: () => f_chakra("normal", { subsets: ["latin"] }) },
  shippori: { family: "Shippori Mincho", load: () => f_shippori("normal", { subsets: ["latin"] }) },
  yuji: { family: "Yuji Syuku", load: () => f_yuji("normal", { subsets: ["latin"] }) },
  fredoka: { family: "Fredoka", load: () => f_fredoka("normal", { subsets: ["latin"] }) },
  nunito: { family: "Nunito", load: () => f_nunito("normal", { subsets: ["latin"] }) },
  alegreyasc: { family: "Alegreya SC", load: () => f_alegreyasc("normal", { subsets: ["latin"] }) },
  alfaslab: { family: "Alfa Slab One", load: () => f_alfaslab("normal", { subsets: ["latin"] }) },
  allerta: { family: "Allerta Stencil", load: () => f_allerta("normal", { subsets: ["latin"] }) },
  audiowide: { family: "Audiowide", load: () => f_audiowide("normal", { subsets: ["latin"] }) },
  baloo: { family: "Baloo 2", load: () => f_baloo("normal", { subsets: ["latin"] }) },
  baskerville: { family: "Libre Baskerville", load: () => f_baskerville("normal", { subsets: ["latin"] }) },
  bitter: { family: "Bitter", load: () => f_bitter("normal", { subsets: ["latin"] }) },
  blackops: { family: "Black Ops One", load: () => f_blackops("normal", { subsets: ["latin"] }) },
  cinzel: { family: "Cinzel", load: () => f_cinzel("normal", { subsets: ["latin"] }) },
  comfortaa: { family: "Comfortaa", load: () => f_comfortaa("normal", { subsets: ["latin"] }) },
  exo: { family: "Exo 2", load: () => f_exo("normal", { subsets: ["latin"] }) },
  lobster: { family: "Lobster", load: () => f_lobster("normal", { subsets: ["latin"] }) },
  majormono: { family: "Major Mono Display", load: () => f_majormono("normal", { subsets: ["latin"] }) },
  marcellus: { family: "Marcellus", load: () => f_marcellus("normal", { subsets: ["latin"] }) },
  medieval: { family: "MedievalSharp", load: () => f_medieval("normal", { subsets: ["latin"] }) },
  michroma: { family: "Michroma", load: () => f_michroma("normal", { subsets: ["latin"] }) },
  overpass: { family: "Overpass", load: () => f_overpass("normal", { subsets: ["latin"] }) },
  pacifico: { family: "Pacifico", load: () => f_pacifico("normal", { subsets: ["latin"] }) },
  poiret: { family: "Poiret One", load: () => f_poiret("normal", { subsets: ["latin"] }) },
  roboto: { family: "Roboto", load: () => f_roboto("normal", { subsets: ["latin"] }) },
  sourcesans: { family: "Source Sans 3", load: () => f_sourcesans("normal", { subsets: ["latin"] }) },
  stardos: { family: "Stardos Stencil", load: () => f_stardos("normal", { subsets: ["latin"] }) },
  tomorrow: { family: "Tomorrow", load: () => f_tomorrow("normal", { subsets: ["latin"] }) },
  ultra: { family: "Ultra", load: () => f_ultra("normal", { subsets: ["latin"] }) },
  unifraktur: { family: "UnifrakturMaguntia", load: () => f_unifraktur("normal", { subsets: ["latin"] }) },
};

/** call once at module level with the film's DNA: loads only its two typefaces */
export const loadPrintFonts = (dna: DNA) => { FONTS[dna.display]?.load(); FONTS[dna.body]?.load(); if (dna.mono) FONTS[dna.mono]?.load(); };
export const fam = (k: string) => `'${FONTS[k]?.family ?? k}', Georgia, serif`;
/** a print font's CSS family, loaded on first use; undefined when the key is not a print font */
export const printFont = (k: string) => { if (!FONTS[k]) return undefined; FONTS[k].load(); return `'${FONTS[k].family}', Georgia, serif`; };

/** the film's look for a scene that draws its own ground (a real-map scene): its pieces read useDNA() without a Sheet */
export const WithDNA: React.FC<{ dna: DNA; children: React.ReactNode }> = ({ dna, children }) => <Ctx.Provider value={dna}>{children}</Ctx.Provider>;
/** the panel set into the page (a dark board on paper, a lighter panel on a dark ground) and the type printed on it */
export const boardBg = (d: DNA) => d.board ?? "#1b1a18";
export const onBoard = (d: DNA) => d.boardInk ?? d.paper;

/* ---- time helpers --------------------------------------------------------------------------------------------- */
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const appear = (t: number, at: number, dur = 0.5) => Easing.out(Easing.cubic)(clamp01((t - at) / dur));
const rand = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

/* ---- the sheet ------------------------------------------------------------------------------------------------ */
/** The printed page every scene sits on: paper stock with fibres and specks, the ink filters, the layout's rules and
 *  folio. Children are the scene's printed pieces. */
export const Sheet: React.FC<{ dna: DNA; page?: number; children?: React.ReactNode }> = ({ dna, page = 1, children }) => {
  const d = dna;
  const ink = d.ink;
  return (
    <Ctx.Provider value={d}>
      <AbsoluteFill style={{ backgroundColor: d.paper, overflow: "hidden" }}>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          {/* riso ink: the fill is mottled where the ink did not take; a second pass sits slightly off register */}
          <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={7} result="n" />
            <feColorMatrix in="n" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${-1.4 * d.grain} ${1 + 0.55 * d.grain}`} result="m" />
            <feComposite in="SourceGraphic" in2="m" operator="in" />
          </filter>
          <filter id="fibre"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={4} seed={3} /><feColorMatrix type="saturate" values="0" /></filter>
          <filter id="specks"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={1} seed={11} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 18 -15.2" /></filter>
        </svg>
        <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: d.dark ? "screen" : "multiply", opacity: (d.dark ? 0.08 : 0.18) + (d.dark ? 0.1 : 0.25) * d.fibre }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
        {!d.dark && <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.5 }}><rect width="100%" height="100%" filter="url(#specks)" /></svg>}
        <Texture d={d} />
        <Set d={d} />
        {/* the layout's printed furniture: a frame of rules and the folio, like a page of a magazine or a ledger */}
        {d.layout === "editorial" && <>
          <div style={{ position: "absolute", left: 70, right: 70, top: 58, borderTop: `2px solid ${ink}`, opacity: 0.8 }} />
          <div style={{ position: "absolute", left: 70, right: 70, top: 64, borderTop: `1px solid ${ink}`, opacity: 0.5 }} />
          <div style={{ position: "absolute", left: 70, top: 24, fontFamily: fam(d.body), fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", color: ink, opacity: 0.75 }}>{d.issue}</div>
          <div style={{ position: "absolute", right: 70, top: 24, fontFamily: fam(d.body), fontSize: 20, color: ink, opacity: 0.75 }}>{String(page).padStart(2, "0")}</div>
        </>}
        {d.layout === "ledger" && <>
          {Array.from({ length: 18 }, (_, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 60 + i * 56, borderTop: `1px solid ${d.inks[1]}`, opacity: 0.18 }} />)}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 150, borderLeft: `2px solid ${d.inks[0]}`, opacity: 0.35 }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 158, borderLeft: `2px solid ${d.inks[0]}`, opacity: 0.35 }} />
        </>}
        {d.layout === "spine" && <>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 64, borderLeft: `1px solid ${ink}`, opacity: 0.45 }} />
          <div style={{ position: "absolute", left: 18, top: 480, transform: "rotate(-90deg)", transformOrigin: "left top", fontFamily: fam(d.body), fontStyle: "italic", fontSize: 18, color: ink, opacity: 0.7, whiteSpace: "nowrap" }}>{d.issue}</div>
        </>}
        {d.layout === "poster" && <div style={{ position: "absolute", inset: 34, border: `3px solid ${ink}`, opacity: 0.85 }} />}
        {/* registration marks: it was printed */}
        {[[40, 1040], [1880, 1040]].map(([x, y], i) => (
          <svg key={i} width={30} height={30} style={{ position: "absolute", left: x - 15, top: y - 15, opacity: 0.35 }}>
            <circle cx={15} cy={15} r={7} fill="none" stroke={ink} strokeWidth={1.2} /><path d="M15 2V28M2 15H28" stroke={ink} strokeWidth={1.2} />
          </svg>))}
        <AbsoluteFill><Placer page={page}>{children}</Placer></AbsoluteFill>
      </AbsoluteFill>
    </Ctx.Provider>
  );
};

/** filters for drawn scenes: INK = mottled riso ink; CUT = ink plus the soft shadow of a cut-paper piece lifted off the page */
export const INK = "url(#ink)";
export const CUT = "url(#ink) drop-shadow(0 4px 0 rgba(0,0,0,0.10)) drop-shadow(0 12px 16px rgba(0,0,0,0.12))";

/** the ground's texture, by look family: halftone dots, photocopy toner, a blueprint grid, chalk dust and smudges,
 *  a whiteboard's ghost marks, a dark-tech dot grid and vignette. Riso, letterpress and offset live in the ink filter. */
const Texture: React.FC<{ d: DNA }> = ({ d }) => {
  const ink = d.ink;
  switch (d.texture) {
    case "halftone":
      return <AbsoluteFill style={{ opacity: 0.07, backgroundImage: `radial-gradient(${ink} 30%, transparent 32%)`, backgroundSize: "9px 9px", mixBlendMode: "multiply" }} />;
    case "photocopy":
      return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 55%, ${ink}22 100%)` }} />;
    case "grid":
      return <AbsoluteFill style={{ opacity: 0.22, backgroundImage: `linear-gradient(${ink}55 1px, transparent 1px), linear-gradient(90deg, ${ink}55 1px, transparent 1px), linear-gradient(${ink}22 1px, transparent 1px), linear-gradient(90deg, ${ink}22 1px, transparent 1px)`,
        backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px" }} />;
    case "chalk":
      return <>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 40%, ${ink}14, transparent 45%), radial-gradient(ellipse at 75% 70%, ${ink}10, transparent 40%)` }} />
        <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "screen", opacity: 0.12 }}><rect width="100%" height="100%" filter="url(#specks)" /></svg>
      </>;
    case "marker":
      return <AbsoluteFill style={{ background: `linear-gradient(115deg, transparent 30%, #ffffff55 45%, transparent 60%), radial-gradient(ellipse at 70% 30%, ${d.inks[1]}0d, transparent 40%)` }} />;
    case "glow":
      return <>
        <AbsoluteFill style={{ opacity: 0.18, backgroundImage: `radial-gradient(${ink}66 1px, transparent 1.5px)`, backgroundSize: "32px 32px" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, #000000aa 100%)" }} />
      </>;
    case "scanline":
      return <>
        <AbsoluteFill style={{ opacity: 0.16, backgroundImage: `repeating-linear-gradient(0deg, #000000 0px, #000000 2px, transparent 2px, transparent 5px)` }} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${d.inks[0]}14, transparent 60%), radial-gradient(ellipse at 50% 50%, transparent 55%, #000000cc 100%)` }} />
      </>;
    case "soft":
      return <AbsoluteFill style={{ background: `linear-gradient(160deg, #ffffff40, transparent 50%, ${d.inks[1]}14)` }} />;
    case "watercolor":
      return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 20% 25%, ${d.inks[0]}1c, transparent 35%), radial-gradient(ellipse at 80% 70%, ${d.inks[1]}18, transparent 40%), radial-gradient(ellipse at 60% 15%, ${d.inks[2] ?? d.inks[0]}12, transparent 30%)` }} />;
    case "film":
      return <>
        <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "screen", opacity: 0.1 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 45%, #000000d0 100%)" }} />
      </>;
    case "benday":
      return <AbsoluteFill style={{ opacity: 0.12, backgroundImage: `radial-gradient(${d.inks[0]} 28%, transparent 30%)`, backgroundSize: "16px 16px" }} />;
    /* the families from MotionAgent's styles */
    case "scroll":  // burnt, curling edges and age stains round a parchment page
      return <>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 58%, #6b3a1255 80%, #2a140690 100%)` }} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 20% 30%, #8a5a2a1c, transparent 25%), radial-gradient(ellipse at 75% 70%, #8a5a2a18, transparent 22%)` }} />
        <AbsoluteFill style={{ background: `linear-gradient(180deg, #3a1a0a50 0, transparent 4%, transparent 96%, #3a1a0a50 100%)` }} />
      </>;
    case "linen":  // a woven canvas
      return <AbsoluteFill style={{ opacity: 0.18, mixBlendMode: "multiply", backgroundImage: `repeating-linear-gradient(0deg, #6a5a4a 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, #6a5a4a 0 1px, transparent 1px 5px)` }} />;
    case "dotgrid":
      return <AbsoluteFill style={{ opacity: 0.35, backgroundImage: `radial-gradient(${ink} 1.3px, transparent 1.6px)`, backgroundSize: "36px 36px", backgroundPosition: "18px 18px" }} />;
    case "kraft":  // brown fibres and a few ruled lines
      return <>
        <AbsoluteFill style={{ opacity: 0.22, mixBlendMode: "multiply", backgroundImage: `radial-gradient(#5a3a1a 12%, transparent 16%), radial-gradient(#3a2410 8%, transparent 12%)`, backgroundSize: "7px 9px, 13px 11px" }} />
        <AbsoluteFill style={{ opacity: 0.18, backgroundImage: `repeating-linear-gradient(180deg, transparent 0 63px, #3a2410 63px 65px)` }} />
      </>;
    case "corrugated":  // the flutes of corrugated card
      return <>
        <AbsoluteFill style={{ opacity: 0.2, mixBlendMode: "multiply", backgroundImage: `repeating-linear-gradient(90deg, #5a3a18 0 3px, transparent 3px 11px, #fff3 11px 13px, transparent 13px 22px)` }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 60%, #3a240e40 100%)" }} />
      </>;
    case "clinic":  // white to mint with soft dots
      return <>
        <AbsoluteFill style={{ background: `linear-gradient(160deg, #ffffff 0%, ${d.inks[0]}1c 100%)` }} />
        <AbsoluteFill style={{ opacity: 0.25, backgroundImage: `radial-gradient(${d.inks[0]} 1.5px, transparent 2px)`, backgroundSize: "44px 44px" }} />
      </>;
    case "leaves":  // light through leaves on a dark forest ground
      return <>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 20%, ${d.inks[0]}26, transparent 40%), radial-gradient(ellipse at 80% 70%, ${d.inks[1]}18, transparent 35%)` }} />
        <AbsoluteFill style={{ opacity: 0.18, backgroundImage: `radial-gradient(ellipse 60px 26px at 30% 40%, ${d.inks[0]} 50%, transparent 52%), radial-gradient(ellipse 50px 22px at 70% 60%, ${d.inks[0]} 50%, transparent 52%)`, backgroundSize: "260px 200px" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, #000a 100%)" }} />
      </>;
    case "blinds":  // hard light through venetian blinds, across the dark
      return <>
        <AbsoluteFill style={{ background: `repeating-linear-gradient(-32deg, transparent 0 46px, #ffffff10 46px 86px)` }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 70% 30%, #ffffff12, transparent 50%), radial-gradient(ellipse at 50% 50%, transparent 45%, #000c 100%)" }} />
      </>;
    case "waves":  // light rays and slow waves in the deep
      return <>
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${d.inks[0]}24 0%, transparent 45%), radial-gradient(ellipse at 50% 120%, #0008, transparent 60%)` }} />
        <AbsoluteFill style={{ opacity: 0.12, background: `repeating-linear-gradient(100deg, transparent 0 120px, ${d.inks[0]} 120px 150px, transparent 150px 260px)` }} />
        <AbsoluteFill style={{ opacity: 0.16, backgroundImage: `radial-gradient(ellipse 140px 18px at 50% 50%, transparent 60%, ${d.inks[0]} 62%, transparent 66%)`, backgroundSize: "300px 90px" }} />
      </>;
    case "stars":  // a field of stars and a faint nebula
      return <>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 75% 25%, ${d.inks[2] ?? d.inks[0]}30, transparent 40%), radial-gradient(ellipse at 15% 85%, ${d.inks[0]}22, transparent 40%)` }} />
        <AbsoluteFill style={{ opacity: 0.85, backgroundImage: `radial-gradient(#fff 1px, transparent 1.4px), radial-gradient(#fff 0.8px, transparent 1.2px), radial-gradient(#fffc 1.6px, transparent 2px)`,
          backgroundSize: "97px 89px, 53px 61px, 211px 197px", backgroundPosition: "0 0, 23px 37px, 71px 13px" }} />
      </>;
    case "stripes":  // diagonal racing stripes
      return <>
        <AbsoluteFill style={{ background: `linear-gradient(115deg, transparent 0 62%, ${d.inks[0]}30 62% 66%, transparent 66% 68%, ${d.inks[0]}20 68% 70%, transparent 70%)` }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #ffffff10, transparent 55%), radial-gradient(ellipse at 50% 50%, transparent 55%, #0009 100%)" }} />
      </>;
    case "sunrise":  // a warm glow rising behind the horizon
      return <>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 60% at 50% 105%, ${d.inks[0]}66, ${d.inks[0]}22 45%, transparent 70%)` }} />
        <AbsoluteFill style={{ opacity: 0.18, background: `repeating-conic-gradient(from 270deg at 50% 100%, ${d.inks[0]} 0 4deg, transparent 4deg 12deg)` }} />
      </>;
    case "hud":  // a glowing war-table grid with corner brackets
      return <>
        <AbsoluteFill style={{ opacity: 0.16, backgroundImage: `linear-gradient(${d.inks[0]} 1px, transparent 1px), linear-gradient(90deg, ${d.inks[0]} 1px, transparent 1px)`, backgroundSize: "80px 80px" }} />
        {[[40, 40, "M0 40 V0 H40"], [1840, 40, "M0 0 H40 V40"], [40, 1000, "M0 0 V40 H40"], [1840, 1000, "M0 40 H40 V0"]].map(([x, y, dd], i) =>
          <svg key={i} width={40} height={40} style={{ position: "absolute", left: x as number, top: y as number, opacity: 0.6 }}><path d={dd as string} fill="none" stroke={d.inks[0]} strokeWidth={4} /></svg>)}
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, #000b 100%)" }} />
      </>;
    case "greekkey": {  // meander bands along the top and bottom of the pot
      const band = (top: number) => <svg width={1920} height={48} style={{ position: "absolute", left: 0, top }}>
        <defs><pattern id={`gk${top}`} width="48" height="48" patternUnits="userSpaceOnUse"><path d="M4 44 V4 H40 V32 H16 V16 H28 V24" fill="none" stroke={ink} strokeWidth={5} /></pattern></defs>
        <rect width={1920} height={48} fill={`url(#gk${top})`} /></svg>;
      return <>{band(24)}{band(1008)}<AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #ffffff18, transparent 55%), radial-gradient(ellipse at 50% 50%, transparent 60%, #3a140840 100%)" }} /></>;
    }
    case "lined":  // ruled blue lines and a red margin
      return <>
        <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(180deg, transparent 0 52px, #6a8ad044 52px 54px)`, backgroundPosition: "0 30px" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 150, borderLeft: "3px solid #e0453a66" }} />
      </>;
    case "manila":
      return <>
        <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent 0 92%, #00000010 92% 100%)` }} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 85% 15%, #6b4a1a22, transparent 30%), radial-gradient(ellipse at 10% 90%, #6b4a1a1a, transparent 30%)` }} />
      </>;
    case "cork":
      return <>
        <AbsoluteFill style={{ opacity: 0.16, backgroundImage: `radial-gradient(#5a3a1a 18%, transparent 22%), radial-gradient(#f3d9a8 14%, transparent 18%)`, backgroundSize: "11px 13px, 17px 15px", backgroundPosition: "0 0, 6px 8px", mixBlendMode: "multiply" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, #3a220e55 100%)" }} />
      </>;
    case "gradient":
      return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 15% 10%, ${d.inks[0]}30, transparent 45%), radial-gradient(ellipse at 90% 95%, ${d.inks[1]}26, transparent 50%), radial-gradient(ellipse at 50% 50%, transparent 60%, #00000080 100%)` }} />;
    case "ricepaper":
      return <>
        <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "multiply", opacity: 0.25 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 80% 20%, ${ink}0c, transparent 40%), radial-gradient(ellipse at 15% 85%, ${ink}0a, transparent 35%)` }} />
      </>;
    case "pixel":
      return <>
        <AbsoluteFill style={{ opacity: 0.1, backgroundImage: `linear-gradient(${ink}55 2px, transparent 2px), linear-gradient(90deg, ${ink}55 2px, transparent 2px)`, backgroundSize: "12px 12px" }} />
        <AbsoluteFill style={{ opacity: 0.5, backgroundImage: `radial-gradient(${ink} 1px, transparent 1.5px)`, backgroundSize: "97px 83px" }} />
      </>;
    case "iridescent":
      return <AbsoluteFill style={{ background: `linear-gradient(125deg, ${d.inks[0]}1f, transparent 30%, ${d.inks[2] ?? d.inks[1]}1a 55%, transparent 75%, ${d.inks[1]}1f)` }} />;
    case "vellum":
      return <>
        <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "multiply", opacity: 0.22 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, #6b4a1a40 100%)" }} />
      </>;
    case "concrete":
      return <>
        <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "multiply", opacity: 0.35 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
        <AbsoluteFill style={{ opacity: 0.25, backgroundImage: "radial-gradient(#00000055 1px, transparent 2px)", backgroundSize: "23px 19px" }} />
      </>;
    case "thermal":
      return <AbsoluteFill style={{ background: `repeating-linear-gradient(0deg, transparent 0 7px, #00000006 7px 8px), linear-gradient(90deg, transparent 0 15%, #ffffff40 50%, transparent 85%)` }} />;
    case "cells":
      return <>
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${ink}1c 1px, transparent 1px), linear-gradient(90deg, ${ink}1c 1px, transparent 1px)`, backgroundSize: "160px 44px" }} />
        <AbsoluteFill style={{ background: `linear-gradient(90deg, ${ink}0d 0 56px, transparent 56px)` }} />
      </>;
    case "madhubani": {  // a Mithila border: two ink lines with a band of fish scales between, the corners filled
      const edge = (k: number) => <svg key={k} width={1920} height={1080} style={{ position: "absolute", opacity: 0.85 }}>
        <defs><pattern id="mb-scale" width="28" height="18" patternUnits="userSpaceOnUse"><path d="M0 18 A14 14 0 0 1 28 18" fill="none" stroke={d.inks[0]} strokeWidth={3} /></pattern></defs>
        <rect x={18} y={18} width={1884} height={1044} fill="none" stroke={ink} strokeWidth={5} />
        <path d="M30 30 H1890 V1050 H30 Z M58 58 V1022 H1862 V58 Z" fill="url(#mb-scale)" fillRule="evenodd" />
        <rect x={58} y={58} width={1804} height={964} fill="none" stroke={ink} strokeWidth={3} />
        {[[30, 30], [1862, 30], [30, 1022], [1862, 1022]].map(([x, y], i) => <rect key={i} x={x} y={y} width={28} height={28} fill={d.inks[1]} stroke={ink} strokeWidth={2} />)}
      </svg>;
      return <>{edge(0)}<svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "multiply", opacity: 0.2 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg></>;
    }
    case "mughal":  // a miniature's frame: a gold double rule, a floral band, a lapis hairline inside
      return <>
        <AbsoluteFill style={{ boxShadow: `inset 0 0 0 14px ${d.inks[0]}, inset 0 0 0 17px ${ink}, inset 0 0 0 36px ${d.inks[3] ?? d.inks[1]}55, inset 0 0 0 39px ${d.inks[0]}, inset 0 0 0 42px ${d.inks[1]}` }} />
        {[{ left: 17, right: 17, top: 17, height: 19 }, { left: 17, right: 17, bottom: 17, height: 19 }, { left: 17, top: 36, bottom: 36, width: 19 }, { right: 17, top: 36, bottom: 36, width: 19 }].map((st, i) =>
          <div key={i} style={{ position: "absolute", ...st, opacity: 0.8, backgroundImage: `radial-gradient(circle, ${d.inks[0]} 4px, transparent 5px)`, backgroundSize: "26px 19px", backgroundPosition: "center" }} />)}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #ffffff30, transparent 55%), radial-gradient(ellipse at 50% 50%, transparent 62%, #6b3a1a33 100%)` }} />
      </>;
    case "truckart": {  // a painted truck's trim: a scalloped band in the inks along top and bottom, chrome stripes
      const band = (top: number, flip: boolean) => <svg key={top} width={1920} height={70} style={{ position: "absolute", left: 0, top, transform: flip ? "scaleY(-1)" : undefined }}>
        {Array.from({ length: 33 }, (_, i) => <path key={i} d={`M${i * 60} 0 h60 v26 a30 30 0 0 1 -60 0 Z`} fill={d.inks[i % 4] ?? d.inks[0]} />)}
        {Array.from({ length: 33 }, (_, i) => <circle key={`c${i}`} cx={i * 60 + 30} cy={24} r={7} fill="#fff8e6" stroke={ink} strokeWidth={2} />)}
        <rect y={0} width={1920} height={8} fill={ink} />
      </svg>;
      return <>{band(0, false)}{band(1010, true)}
        <AbsoluteFill style={{ background: `linear-gradient(90deg, ${d.inks[1]}18 0 10px, transparent 10px calc(100% - 10px), ${d.inks[1]}18 calc(100% - 10px))` }} /></>;
    }
    case "kolam":  // a pulli grid of rice-flour dots with loops drawn round them, faint across the floor
      return <>
        <AbsoluteFill style={{ opacity: 0.22, backgroundImage: `radial-gradient(${ink} 2.5px, transparent 3.5px)`, backgroundSize: "60px 60px", backgroundPosition: "30px 30px" }} />
        <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.12 }}>
          {[[1700, 180], [210, 900]].map(([cx, cy], k) => <g key={k} fill="none" stroke={ink} strokeWidth={3}>
            {[0, 45, 90, 135].map((r) => <ellipse key={r} cx={cx} cy={cy} rx={150} ry={52} transform={`rotate(${r} ${cx} ${cy})`} />)}
            <circle cx={cx} cy={cy} r={170} /></g>)}
        </svg>
      </>;
    case "textbook":  // a school textbook page: a colour rule at the top with the chapter tab, a page number in the corner
      return <>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 10, background: d.inks[0] }} />
        <div style={{ position: "absolute", left: 0, top: 10, width: 220, height: 34, background: d.inks[0], opacity: 0.85, borderBottomRightRadius: 16 }} />
        <div style={{ position: "absolute", right: 60, bottom: 24, width: 46, height: 46, borderRadius: 99, border: `3px solid ${d.inks[0]}`, opacity: 0.6 }} />
        <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "multiply", opacity: 0.1 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
      </>;
    case "seigaiha": {  // a woodblock print: blue wave scales in the lower corner, a pale washi grain over it all
      return <>
        <svg width={760} height={420} style={{ position: "absolute", right: 0, bottom: 0, opacity: 0.22 }}>
          <defs><pattern id="sg" width="80" height="40" patternUnits="userSpaceOnUse">
            {[36, 26, 16].map((r) => <path key={r} d={`M${40 - r} 40 A${r} ${r} 0 0 1 ${40 + r} 40`} fill="none" stroke={d.inks[0]} strokeWidth={3} />)}
            {[36, 26, 16].map((r) => <path key={`b${r}`} d={`M${-r} 20 A${r} ${r} 0 0 1 ${r} 20 M${80 - r} 20 A${r} ${r} 0 0 1 ${80 + r} 20`} fill="none" stroke={d.inks[0]} strokeWidth={3} />)}
          </pattern><linearGradient id="sgf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={0} /><stop offset="0.5" stopColor="#fff" /></linearGradient>
          <mask id="sgm"><rect width={760} height={420} fill="url(#sgf)" /></mask></defs>
          <rect width={760} height={420} fill="url(#sg)" mask="url(#sgm)" />
        </svg>
        <svg width="100%" height="100%" style={{ position: "absolute", mixBlendMode: "multiply", opacity: 0.3 }}><rect width="100%" height="100%" filter="url(#fibre)" /></svg>
      </>;
    }
    case "contour":  // a survey sheet: wandering contour lines, every fifth one bold, a faint grid of eastings and northings
      return <>
        <AbsoluteFill style={{ opacity: 0.12, backgroundImage: `linear-gradient(${d.inks[2] ?? ink} 1px, transparent 1px), linear-gradient(90deg, ${d.inks[2] ?? ink} 1px, transparent 1px)`, backgroundSize: "240px 240px" }} />
        <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.22 }}>
          {[[1560, 260, -10], [330, 860, 24]].map(([cx, cy, rot], c) => <g key={c} fill="none" stroke={d.inks[0]} transform={`rotate(${rot} ${cx} ${cy})`}>
            {Array.from({ length: 10 }, (_, j) => <path key={j} strokeWidth={j % 5 === 4 ? 2.6 : 1.2}
              d={`M${cx - 50 - j * 48},${cy} C${cx - 50 - j * 48},${cy - 40 - j * 34} ${cx + 30 + j * 40},${cy - 60 - j * 30} ${cx + 60 + j * 52},${cy - 6 + j * 4} S${cx - 20 - j * 30},${cy + 60 + j * 36} ${cx - 50 - j * 48},${cy}`} />)}
          </g>)}
        </svg>
      </>;
    case "satellite":  // an orbit view: a lat/long graticule, frame ticks with coordinates, a slow scan line
      return <>
        <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.18 }}>
          {Array.from({ length: 9 }, (_, i) => <path key={`m${i}`} d={`M${240 + i * 180} 0 Q${960 + (i - 4) * 120} 540 ${240 + i * 180} 1080`} fill="none" stroke={d.inks[0]} strokeWidth={1} />)}
          {Array.from({ length: 6 }, (_, i) => <path key={`p${i}`} d={`M0 ${120 + i * 170} Q960 ${80 + i * 178} 1920 ${120 + i * 170}`} fill="none" stroke={d.inks[0]} strokeWidth={1} />)}
          {Array.from({ length: 48 }, (_, i) => <line key={`t${i}`} x1={i * 40} y1={0} x2={i * 40} y2={i % 5 ? 8 : 18} stroke={ink} strokeWidth={1.5} />)}
          {Array.from({ length: 27 }, (_, i) => <line key={`l${i}`} x1={0} y1={i * 40} x2={i % 5 ? 8 : 18} y2={i * 40} stroke={ink} strokeWidth={1.5} />)}
        </svg>
        <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, transparent 0 3px, #ffffff05 3px 4px), radial-gradient(ellipse at 50% 50%, transparent 55%, #000a 100%)" }} />
      </>;
    case "leaded": {  // a stained-glass window: lead lines round coloured panes, light glowing through from behind
      const panes: [string, number][] = [["M0,0 L300,0 L220,260 L0,200 Z", 0], ["M300,0 L640,0 L520,220 L220,260 Z", 1], ["M0,200 L220,260 L160,560 L0,600 Z", 2], ["M1920,0 L1580,0 L1680,280 L1920,240 Z", 3],
        ["M1580,0 L1300,0 L1420,230 L1680,280 Z", 0], ["M1920,240 L1680,280 L1760,600 L1920,640 Z", 1], ["M0,1080 L0,820 L260,880 L340,1080 Z", 1], ["M1920,1080 L1920,820 L1640,900 L1580,1080 Z", 2]];
      return <svg width="100%" height="100%" style={{ position: "absolute" }}>
        {panes.map(([p, c], i) => <path key={i} d={p} fill={d.inks[c] ?? d.inks[0]} opacity={0.32} stroke="#05040a" strokeWidth={10} strokeLinejoin="round" />)}
        <rect width="100%" height="100%" fill="url(#lg-glow)" /><defs><radialGradient id="lg-glow" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stopColor="#fff2c0" stopOpacity={0.08} /><stop offset="1" stopColor="#000" stopOpacity={0.45} /></radialGradient></defs>
      </svg>;
    }
    case "papercut": {  // stacked cut-paper hills along the bottom, each layer casting a soft shadow on the one behind
      const layers = [0, 1, 2];
      return <svg width="100%" height="100%" style={{ position: "absolute" }}>
        <defs><filter id="pc-sh" x="-5%" y="-30%" width="110%" height="160%"><feDropShadow dx="0" dy="-6" stdDeviation="8" floodOpacity="0.22" /></filter></defs>
        {layers.map((l) => <path key={l} filter="url(#pc-sh)" fill={d.inks[(l + 1) % 4] ?? d.inks[0]} opacity={0.18 + l * 0.08}
          d={`M0 ${930 + l * 45} C320 ${870 + l * 50} 560 ${990 + l * 30} 900 ${940 + l * 40} S1500 ${880 + l * 45} 1920 ${950 + l * 35} V1080 H0 Z`} />)}
        <circle cx={1700} cy={170} r={70} fill={d.inks[2] ?? d.inks[0]} opacity={0.25} filter="url(#pc-sh)" />
      </svg>;
    }
    case "topo":
      return <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.16 }}>
        {[0, 1, 2].map((c) => <g key={c} fill="none" stroke={ink} strokeWidth={1.4}>
          {Array.from({ length: 7 }, (_, j) => <ellipse key={j} cx={[300, 1500, 900][c]} cy={[250, 780, 1100][c]} rx={60 + j * 70} ry={40 + j * 48} transform={`rotate(${[-12, 18, 4][c]} ${[300, 1500, 900][c]} ${[250, 780, 1100][c]})`} />)}
        </g>)}
      </svg>;
    default:
      return null;
  }
};

/** What the page sits in, behind every scene (video/looks.py SET): window light and a plant's shadow, stone plinths, a
 *  sweeping dark panel, soft colour discs, a desk round the page, an arched window. It drifts slowly, never still. */
const Set: React.FC<{ d: DNA }> = ({ d }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const dark = !!d.dark;
  const stone = dark ? "#3a3733" : "#e9e2d6", stone2 = dark ? "#26241f" : "#d6cdbf";
  switch (d.set) {
    case "sunlit":
      return <>
        <AbsoluteFill style={{ background: `repeating-linear-gradient(118deg, transparent 0 140px, ${dark ? "#ffffff0d" : "#ffffff55"} 140px 230px, transparent 230px 330px)`,
          transform: `translateX(${Math.sin(t * 0.15) * 30}px)`, mixBlendMode: dark ? "screen" : "soft-light", opacity: 0.9 }} />
        <AbsoluteFill style={{ background: `linear-gradient(118deg, ${dark ? "#ffd9a01a" : "#fff3dd66"}, transparent 55%, #00000014)` }} />
        <svg width={520} height={620} viewBox="0 0 520 620" style={{ position: "absolute", left: -60, top: -40, opacity: dark ? 0.35 : 0.22, filter: "blur(6px)", transform: `rotate(${Math.sin(t * 0.6) * 1.5}deg)`, transformOrigin: "0 0" }}>
          {Array.from({ length: 11 }, (_, i) => <ellipse key={i} cx={60 + (i % 4) * 95 + (i * 37) % 40} cy={50 + Math.floor(i / 4) * 160 + (i * 53) % 60} rx={70} ry={22}
            transform={`rotate(${-30 + (i * 47) % 70} ${60 + (i % 4) * 95} ${50 + Math.floor(i / 4) * 160})`} fill="#1d2a1a" />)}
          <path d="M40,0 C120,200 180,380 260,620" stroke="#1d2a1a" strokeWidth={8} fill="none" />
        </svg>
      </>;
    case "studio":
      return <>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 20%, ${dark ? "#ffffff10" : "#ffffff60"}, transparent 50%), radial-gradient(ellipse at 50% 120%, #00000030, transparent 60%)` }} />
        <svg width="100%" height="100%" style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="set-cyl" x1="0" x2="1"><stop offset="0" stopColor={stone2} /><stop offset="0.45" stopColor={stone} /><stop offset="1" stopColor={stone2} /></linearGradient>
            <radialGradient id="set-ball" cx="0.35" cy="0.3"><stop offset="0" stopColor="#ffffff" stopOpacity={0.9} /><stop offset="0.5" stopColor={stone} /><stop offset="1" stopColor={stone2} /></radialGradient>
            <filter id="set-vein"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves={3} seed={9} /><feColorMatrix type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.38  0 0 0 0 0.35  0 0 0 -2.2 1.3" /><feComposite in2="SourceGraphic" operator="in" /></filter>
          </defs>
          <ellipse cx={1720} cy={1068} rx={170} ry={26} fill="#000" opacity={0.18} />
          <rect x={1560} y={940} width={320} height={130} fill="url(#set-cyl)" /><ellipse cx={1720} cy={940} rx={160} ry={24} fill={stone} />
          <rect x={1560} y={940} width={320} height={130} filter="url(#set-vein)" opacity={0.35} />
          <circle cx={1735 + Math.sin(t * 0.4) * 4} cy={870} r={62} fill="url(#set-ball)" />
          <rect x={-20} y={910} width={250} height={200} rx={10} fill={stone} transform="rotate(-4 100 1000)" /><rect x={-20} y={910} width={250} height={200} rx={10} filter="url(#set-vein)" opacity={0.5} transform="rotate(-4 100 1000)" />
        </svg>
      </>;
    case "wave": {
      const s = Math.sin(t * 0.25) * 18;
      const path = `M${1080 + s},0 C${960 + s},260 ${1180 - s},420 ${1040 + s},600 S${980 - s},900 ${1120 + s},1080 L1920,1080 L1920,0 Z`;
      return <svg width="100%" height="100%" style={{ position: "absolute" }}>
        <path d={path} fill={dark ? d.inks[3] ?? "#2a2a2a" : d.board ?? "#1b1a18"} opacity={dark ? 0.55 : 1} />
        <path d={path} fill="none" stroke="#d9b36a" strokeWidth={3} opacity={0.75} style={{ filter: "drop-shadow(0 0 6px #d9b36a88)" }} />
      </svg>;
    }
    case "blobs":
      return <svg width="100%" height="100%" style={{ position: "absolute" }}>
        <circle cx={1760 + Math.sin(t * 0.2) * 12} cy={200} r={330} fill={d.inks[1] ?? d.inks[0]} opacity={dark ? 0.16 : 0.2} />
        <circle cx={1860} cy={1000} r={260} fill={d.inks[3] ?? d.inks[0]} opacity={dark ? 0.2 : 0.35} />
        <circle cx={-40} cy={980 + Math.sin(t * 0.25) * 10} r={200} fill={d.inks[0]} opacity={dark ? 0.12 : 0.14} />
      </svg>;
    case "desk":
      return <AbsoluteFill style={{ boxShadow: `inset 0 0 0 28px ${dark ? "#0a0908" : "#6b5440"}, inset 0 0 0 30px #00000040, inset 0 0 60px 30px #00000033` }} />;
    case "arch":
      return <svg width="100%" height="100%" style={{ position: "absolute" }}>
        <defs><linearGradient id="set-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bcd6ea" /><stop offset="0.7" stopColor="#eef2f2" /></linearGradient>
          <clipPath id="set-arch"><path d="M1560,1080 L1560,330 A170,170 0 0 1 1900,330 L1900,1080 Z" /></clipPath></defs>
        <g clipPath="url(#set-arch)">
          <rect x={1540} y={0} width={400} height={1080} fill="url(#set-sky)" />
          <path d={`M1540,${720} L1640,${610} L1720,680 L1820,560 L1940,690 L1940,1080 L1540,1080 Z`} fill="#9aaab4" opacity={0.7} />
          <rect x={1540} y={820} width={400} height={260} fill="#7fa9b8" opacity={0.6} />
          <ellipse cx={1660 + t * 6} cy={260} rx={70} ry={16} fill="#ffffff" opacity={0.7} />
        </g>
        <path d="M1560,1080 L1560,330 A170,170 0 0 1 1900,330 L1900,1080" fill="none" stroke={dark ? "#ffffff30" : "#00000022"} strokeWidth={14} />
      </svg>;
    default:
      return null;
  }
};

/** Ink: whatever is inside reads as printed (mottled fill, the colour pass slightly off register). Wrap any drawing. */
export const Inked: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", inset: 0, filter: "url(#ink)", ...style }}>{children}</div>
);

/** Printed type. display: the film's display face; misreg: a second colour pass offset like a riso print.
 *  w: the width of the box the text lives in; the text then always fits it: it shrinks to one line, or wraps to at most
 *  two lines, and is clipped to the box rather than ever spilling out of it. */
/** average width of a character in each face, in font sizes (mixed case): the fit below needs it, a wide face like
 *  Orbitron is half again as wide as a narrow one like Anton */
const WIDTH: Record<string, number> = {
  orbitron: 0.8, unbounded: 0.76, majormono: 0.82, pressstart: 1.0, rubikmono: 0.86, michroma: 0.8, monoton: 0.9, audiowide: 0.72, bungee: 0.74,
  archivoblack: 0.66, delagothic: 0.76, silkscreen: 0.82, ultra: 0.76, alfaslab: 0.66, blackops: 0.66, allerta: 0.66, cinzel: 0.7, limelight: 0.66,
  syne: 0.62, sora: 0.62, exo: 0.6, montserrat: 0.64, poppins: 0.64, poiret: 0.62, marcellus: 0.62, comfortaa: 0.64, righteous: 0.62, luckiest: 0.64,
  spacemono: 0.62, jetbrains: 0.62, plexmono: 0.62, courierprime: 0.62, dmmono: 0.62, sharetech: 0.56, chivomono: 0.62, specialelite: 0.62, tomorrow: 0.62,
  vt323: 0.48, bangers: 0.48, anton: 0.46, bebas: 0.42, oswald: 0.47, teko: 0.42, staatliches: 0.5, barlowcond: 0.46, robotocond: 0.5, lobster: 0.5,
};

export const Type: React.FC<{ children: React.ReactNode; size: number; display?: boolean; color?: string; weight?: number; style?: React.CSSProperties; caps?: boolean; misreg?: string; w?: number }> = ({ children, size, display, color, weight, style, caps, misreg, w }) => {
  const d = useDNA();
  const c = color ?? d.ink;
  let fs = Math.max(30, size), fit: React.CSSProperties = { maxWidth: "100%", overflowWrap: "anywhere" };  // never wider than its box
  if (w) {
    const text = React.Children.toArray(children).filter((x) => typeof x === "string" || typeof x === "number").join("");
    const upper = caps || (/[A-Z]/.test(text) && text === text.toUpperCase());
    const per = (WIDTH[display ? d.display : d.body] ?? 0.56) * (upper ? 1.18 : 1) * Math.max(1, text.length) + (caps ? 0.12 * text.length : 0);   // one line's width, in font sizes
    const one = w / per;
    fs = one >= size * 0.72 ? Math.min(size, one) : Math.max(30, Math.min(size, (2 * w) / per));
    fit = one >= size * 0.72 ? { whiteSpace: "nowrap", maxWidth: w, overflow: "hidden" } : { maxWidth: w, overflow: "hidden", overflowWrap: "anywhere", maxHeight: fs * (display ? 0.95 : 1.25) * 2 + 4 };
  }
  return (
    <div style={{ fontFamily: fam(display ? d.display : d.body), fontSize: fs, lineHeight: display ? 0.95 : 1.25, color: c, fontWeight: weight,
      textTransform: caps ? "uppercase" : undefined, letterSpacing: caps ? "0.12em" : display ? "-0.01em" : undefined,
      textShadow: misreg ? `${d.misreg}px ${d.misreg * 0.6}px 0 ${misreg}` : undefined, filter: "url(#ink)", ...fit, ...style }}>{children}</div>
  );
};

/* ---- numbers -------------------------------------------------------------------------------------------------- */
const fmt = (v: number, decimals: number) => v.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });

/** A number printed big across the page: it counts up, a rule draws under it, its label and a short note sit in a ruled
 *  column beside it. Fills the frame; the layout changes where things go. */
export const BigNumber: React.FC<{ t: number; at: number; to: number; from?: number; dur?: number; prefix?: string; suffix?: string; label: string; note?: string; decimals?: number }> = ({ t, at, to, from = 0, dur = 1.3, prefix = "", suffix = "", label, note, decimals = 0 }) => {
  const d = useDNA();
  const v = interpolate(t, [at + 0.2, at + 0.2 + dur], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const k = appear(t, at, 0.5);
  const text = `${prefix}${fmt(v, decimals)}${suffix}`;
  const size = Math.min(330, 1500 / Math.max(3, text.length * 0.62));
  if (d.layout === "poster" || d.layout === "spine") {
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 18 }}>
        <div style={{ opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}><Type size={size * 1.1} display color={d.inks[0]} misreg={d.inks[1]}>{text}</Type></div>
        <div style={{ width: 900 * appear(t, at + 0.5, 0.6), borderTop: `4px solid ${d.ink}` }} />
        <div style={{ opacity: appear(t, at + 0.7) }}><Type size={52} caps>{label}</Type></div>
        {note && <div style={{ opacity: appear(t, at + 1.0), maxWidth: 1100, textAlign: "center" }}><Type size={38} style={{ fontStyle: "italic" }}>{note}</Type></div>}
      </AbsoluteFill>
    );
  }
  const y0 = Math.max(150, (1080 - (size + 330)) / 2);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: y0, opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}>
        <Type size={size} display color={d.inks[0]} misreg={d.inks[1]}>{text}</Type>
      </div>
      <div style={{ position: "absolute", left: 110, top: y0 + 30 + size, width: 1700 * appear(t, at + 0.5, 0.7), borderTop: `3px solid ${d.ink}` }} />
      <div style={{ position: "absolute", left: 110, top: y0 + 60 + size, width: 760, opacity: appear(t, at + 0.7) }}><Type size={50} caps>{label}</Type></div>
      {note && <div style={{ position: "absolute", left: 950, top: y0 + 60 + size, width: 860, paddingLeft: 30, borderLeft: `1px solid ${d.ink}`, opacity: appear(t, at + 1.0) }}>
        <Type size={38}>{note}</Type></div>}
    </AbsoluteFill>
  );
};

/* ---- charts --------------------------------------------------------------------------------------------------- */
export type Slice = { label: string; value: number; text?: string };

/** A pie printed in the film's inks: slices sweep in one by one, percentages on them, a ruled legend beside it. */
export const InkPie: React.FC<{ t: number; at: number; slices: Slice[]; title?: string }> = ({ t, at, slices, title }) => {
  const d = useDNA();
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const R = 330, cx = 520, cy = 560;
  let a0 = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total, a1 = a0 + frac * Math.PI * 2;
    const grow = appear(t, at + i * 0.45, 0.6);
    const end = a0 + (a1 - a0) * grow;
    const large = end - a0 > Math.PI ? 1 : 0;
    const path = grow <= 0 ? "" : `M${cx},${cy} L${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 ${large} 1 ${cx + R * Math.cos(end)},${cy + R * Math.sin(end)} Z`;
    const mid = (a0 + a1) / 2;
    const out = { path, color: d.inks[i % d.inks.length], lx: cx + R * 0.62 * Math.cos(mid), ly: cy + R * 0.62 * Math.sin(mid), pct: Math.round(frac * 100), grow };
    a0 = a1;
    return out;
  });
  return (
    <AbsoluteFill>
      {title && <div style={{ position: "absolute", left: 110, top: 100, opacity: appear(t, at) }}><Type size={64} display>{title}</Type></div>}
      <svg width={1920} height={1080} style={{ position: "absolute", filter: "url(#ink)" }}>
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} stroke={d.paper} strokeWidth={4} />)}
      </svg>
      {arcs.map((a, i) => a.grow > 0.9 && (
        <div key={i} style={{ position: "absolute", left: a.lx, top: a.ly, transform: "translate(-50%,-50%)" }}><Type size={56} display color={i === 0 ? d.paper : d.ink}>{a.pct}%</Type></div>))}
      <div style={{ position: "absolute", left: 1010, top: 330, width: 800 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, padding: "18px 0", borderBottom: `1px solid ${d.ink}`, opacity: appear(t, at + i * 0.45 + 0.3) }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: arcs[i].color, filter: "url(#ink)" }} />
            <div style={{ flex: 1 }}><Type size={46}>{s.label}</Type></div>
            <Type size={46}>{arcs[i].pct}%</Type>
          </div>))}
      </div>
    </AbsoluteFill>
  );
};

/** A printed heat grid (rows x columns), cells inking in row by row; the hottest cells in the first ink. */
export const InkHeatmap: React.FC<{ t: number; at: number; rows: string[]; cols: string[]; values: number[][]; title?: string; legend?: [string, string] }> = ({ t, at, rows, cols, values, title, legend }) => {
  const d = useDNA();
  const max = Math.max(1e-9, ...values.flat());
  const left = 330, top = 260, w = 1480 / cols.length, h = Math.min(150, 640 / rows.length);
  const tone = (v: number) => (v / max > 0.75 ? d.inks[0] : v / max > 0.45 ? d.inks[1] : v / max > 0.2 ? d.inks[2] ?? d.inks[1] : d.ink);
  return (
    <AbsoluteFill>
      {title && <div style={{ position: "absolute", left: 110, top: 90, opacity: appear(t, at) }}><Type size={60} display>{title}</Type></div>}
      {cols.map((c, j) => <div key={j} style={{ position: "absolute", left: left + j * w, top: top - 56, width: w - 8, textAlign: "center", opacity: appear(t, at) }}><Type size={34} caps>{c}</Type></div>)}
      {rows.map((r, i) => <div key={i} style={{ position: "absolute", left: 110, top: top + i * h + h / 2 - 22, opacity: appear(t, at) }}><Type size={42}>{r}</Type></div>)}
      <div style={{ position: "absolute", inset: 0, filter: "url(#ink)" }}>
        {values.map((row, i) => row.map((v, j) => {
          const k = appear(t, at + 0.3 + i * 0.12 + j * 0.03, 0.35);
          const low = v / max <= 0.2;
          return <div key={`${i}-${j}`} style={{ position: "absolute", left: left + j * w, top: top + i * h, width: w - 8, height: h - 8, background: tone(v), opacity: k * (low ? 0.12 : 0.35 + 0.65 * (v / max)) }} />;
        }))}
      </div>
      {legend && <div style={{ position: "absolute", left, top: top + rows.length * h + 30, display: "flex", gap: 60, opacity: appear(t, at + 1) }}>
        <Type size={32} caps color={d.inks[0]}>■ {legend[0]}</Type><Type size={32} caps>■ {legend[1]}</Type></div>}
    </AbsoluteFill>
  );
};

/** Printed bars on a ruled baseline, growing in turn; the one that matters in the first ink. */
export const InkBars: React.FC<{ t: number; at: number; bars: Slice[]; unit?: string; highlight?: number; title?: string }> = ({ t, at, bars, unit = "", highlight = -1, title }) => {
  const d = useDNA();
  const max = Math.max(1e-9, ...bars.map((b) => b.value));
  const base = 900, left = 200, span = 1520, bw = Math.min(260, (span / bars.length) * 0.62);
  return (
    <AbsoluteFill>
      {title && <div style={{ position: "absolute", left: 110, top: 90, opacity: appear(t, at) }}><Type size={60} display>{title}</Type></div>}
      <div style={{ position: "absolute", left: 140, right: 140, top: base, borderTop: `4px solid ${d.ink}` }} />
      {bars.map((b, i) => {
        const k = appear(t, at + 0.2 + i * 0.35, 0.7);
        const hgt = (b.value / max) * 600 * k;
        const x = left + (span / bars.length) * (i + 0.5) - bw / 2;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x, top: base - hgt, width: bw, height: hgt, background: i === highlight || (highlight < 0 && i === bars.length - 1) ? d.inks[0] : d.inks[1], filter: "url(#ink)" }} />
            <div style={{ position: "absolute", left: x - 40, width: bw + 80, top: base - hgt - 78, textAlign: "center", opacity: k }}><Type size={48} display>{b.text && k > 0.95 ? b.text : `${fmt(b.value * k, b.value < 10 ? 1 : 0)}${unit}`}</Type></div>
            <div style={{ position: "absolute", left: x - 60, width: bw + 120, top: base + 18, textAlign: "center", opacity: k }}><Type size={34} caps>{b.label}</Type></div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---- steps (the printed flow chart) --------------------------------------------------------------------------- */
export type Step = { label: string; at: number; note?: string };

/** Numbered steps printed across the page (01, 02, 03 ...): each prints on its word, a ruled arrow draws to the next,
 *  the current one is in the first ink. No stickers, no emoji. */
export const Steps: React.FC<{ t: number; steps: Step[]; title?: string }> = ({ t, steps, title }) => {
  const d = useDNA();
  const n = steps.length, left = 110, span = 1700, w = span / n;
  const cur = steps.reduce((c, s, i) => (t >= s.at ? i : c), -1);
  return (
    <AbsoluteFill>
      {title && <div style={{ position: "absolute", left, top: 110, opacity: appear(t, steps[0]?.at ?? 0) }}><Type size={64} display>{title}</Type></div>}
      {steps.map((s, i) => {
        const k = appear(t, s.at, 0.5);
        const x = left + i * w, on = i === cur;
        const arrow = i < n - 1 ? appear(t, steps[i + 1].at - 0.35, 0.35) : 0;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x, top: 380, width: w - 50, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
              <Type size={160} display color={on ? d.inks[0] : d.ink} misreg={on ? d.inks[1] : undefined} style={{ opacity: on || cur < 0 ? 1 : 0.45 }}>{String(i + 1).padStart(2, "0")}</Type>
              <div style={{ borderTop: `3px solid ${on ? d.inks[0] : d.ink}`, margin: "14px 0 18px", width: (w - 70) * k }} />
              <Type size={n > 4 ? 44 : 54} display style={{ opacity: on || cur < 0 ? 1 : 0.6 }}>{s.label}</Type>
              {s.note && <div style={{ marginTop: 12 }}><Type size={32} style={{ opacity: 0.8 }}>{s.note}</Type></div>}
            </div>
            {arrow > 0 && <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
              <path d={`M${x + w - 60},${470} l${-26 + 40 * arrow},0`} stroke={d.ink} strokeWidth={4} fill="none" />
              <path d={`M${x + w - 46 + 40 * arrow - 26},${458} l14,12 l-14,12`} stroke={d.ink} strokeWidth={4} fill="none" opacity={arrow} />
            </svg>}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---- headline (kinetic print) --------------------------------------------------------------------------------- */
export type Word = { text: string; at: number; effect?: "bar" | "plain" | "cross" | "accent" };

/** Words printed huge, stacked like a magazine opener: "bar" sets them reversed out of a black ink bar (like FEATURED
 *  WORK), "cross" strikes them through in the first ink, "accent" prints them in the first ink. */
export const Headline: React.FC<{ t: number; words: Word[]; kicker?: string }> = ({ t, words, kicker }) => {
  const d = useDNA();
  const longest = Math.max(...words.map((w) => w.text.length));
  const size = Math.min(230, 1650 / Math.max(4, longest * 0.58));
  return (
    <AbsoluteFill style={{ padding: "110px 110px 170px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
      {kicker && <div style={{ opacity: appear(t, words[0]?.at ?? 0) }}><Type size={34} caps>{kicker}</Type></div>}
      {words.map((w, i) => {
        if (t < w.at) return null;
        const k = appear(t, w.at, 0.35);
        const e = w.effect ?? (i === 0 ? "bar" : "plain");
        const cross = e === "cross" ? appear(t, w.at + 0.45, 0.35) : 0;
        return (
          <div key={i} style={{ position: "relative", alignSelf: "flex-start", transform: `translateX(${(1 - k) * -60}px)`, opacity: k }}>
            {e === "bar" && <div style={{ position: "absolute", left: -18, right: -18, top: size * 0.06, bottom: -size * 0.04, background: d.ink, filter: "url(#ink)", transformOrigin: "left", transform: `scaleX(${k})` }} />}
            <Type size={size} display color={e === "bar" ? d.paper : e === "accent" ? d.inks[0] : d.ink} misreg={e === "accent" ? d.inks[1] : undefined} style={{ position: "relative", textTransform: "uppercase", whiteSpace: "nowrap" }}>{w.text}</Type>
            {cross > 0 && <div style={{ position: "absolute", left: -10, top: "50%", height: size * 0.09, width: `calc(${cross * 100}% + 20px)`, background: d.inks[0], filter: "url(#ink)" }} />}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---- photo ---------------------------------------------------------------------------------------------------- */
/** A real photo printed as a duotone in the film's inks, set into the page like a magazine plate with a caption and its
 *  credit; the camera pushes slowly toward the subject. */
export const PrintPhoto: React.FC<{ t: number; at: number; dur: number; src: string; ratio: number; focus?: [number, number]; caption?: string; credit?: string }> = ({ t, at, dur, src, ratio, focus = [0.5, 0.5], caption, credit }) => {
  const d = useDNA();
  const k = appear(t, at, 0.7);
  const h = 820, w = Math.min(1180, h * ratio);
  const push = 1 + 0.12 * clamp01((t - at) / Math.max(1, dur));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 150, width: w, height: h, overflow: "hidden", opacity: k, background: d.paper }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${push})`,
          filter: "grayscale(1) contrast(1.15) brightness(1.12)", mixBlendMode: "multiply" }} />
        <div style={{ position: "absolute", inset: 0, background: d.inks[0], mixBlendMode: "multiply", opacity: 0.32 }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.22, backgroundImage: `radial-gradient(${d.ink} 24%, transparent 26%)`, backgroundSize: "7px 7px", mixBlendMode: "multiply" }} />
      </div>
      <div style={{ position: "absolute", left: 110 + w + 50, top: 150, width: 1810 - (110 + w + 50), borderTop: `3px solid ${d.ink}`, paddingTop: 22, opacity: appear(t, at + 0.6) }}>
        {caption && <Type size={58} display>{caption}</Type>}
        {credit && <div style={{ marginTop: 20 }}><Type size={30} style={{ fontStyle: "italic", opacity: 0.75 }}>{credit}</Type></div>}
      </div>
    </AbsoluteFill>
  );
};
