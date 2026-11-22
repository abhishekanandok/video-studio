/* LAYER 2, GROWN: pieces the film writer drew because the motion library had nothing for them, moved here by code
   (video/oneshot.py grow_library) once their film had compiled and rendered, so the next film can place them. Each was
   written as a NEW PIECE (one self-contained component: its own drawing and motion, the film's colours from the
   theme or the look (useDNA), time from `at`) and kept only if it compiles here on its own. Read them like any block; delete one that is
   not good enough, then run `python catalog.py`. */

import type { CSSProperties, ReactNode } from "react";
import { clamp01, family, useScene } from "../kit";
import { ease, rand } from "./motion";
import { block } from "./parts";
import { type DNA, useDNA as lookDNA } from "../../print/dna";

/** the look a piece was drawn in: the print film's DNA, or (in a film with no print look) one made from its theme, so a
    piece that reads useDNA() never breaks in another film */
const useDNA = (): DNA => {
  const dna = lookDNA(), { theme } = useScene();
  return dna ?? { paper: theme.paper, fibre: 0, ink: theme.ink, inks: [theme.accent, theme.accent2, theme.muted, theme.ink], display: theme.display,
    body: theme.font, layout: "open", grain: 0, misreg: 0, issue: "", board: theme.ink, boardInk: theme.paper };
};

export type GrownKit = { css?: CSSProperties; children?: ReactNode; c: typeof clamp01; f: typeof family; e: typeof ease; r: typeof rand; u: typeof useScene; b: typeof block; d: typeof useDNA };  // keeps the imports every grown piece may use

/* ================= GROWN: drawn by a film, kept for the next ================= */
/** Hand-drawn Madhubani Bamboo Soop laden with offerings (drawn by the film chhath-puja-why-we-stand-in-the-river-an-1027222029) */
function MadhubaniSoopView({ size = 320, at = 0, lifted = 0 }: { size?: number; at?: number; lifted?: number }) {
  const C = {
    ground: "#ecdcb6",
    ink: "#1a1410",
    red: "#c8281e",
    indigo: "#2a3c9a",
    gold: "#e8a21e",
    green: "#1f6a4a",
    panel: "#1a1410",
    panelText: "#ecdcb6",
  };
  const { t } = useScene();
  const k = clamp01((t - at) / 0.8);
  const liftOffset = lifted * -40;

  return (
    <div style={{ transform: `translateY(${liftOffset}px)`, transition: "transform 0.4s ease" }}>
      <svg width={size} height={size * 0.75} viewBox="0 0 400 300" style={{ overflow: "visible" }}>
        {/* Bamboo woven soop tray */}
        <path
          d="M 50 180 Q 200 260 350 180 L 320 100 Q 200 130 80 100 Z"
          fill="#d4a359"
          stroke={C.ink}
          strokeWidth="6"
        />
        {/* Woven pattern lines */}
        <path d="M 90 120 L 310 120 M 70 150 L 330 150 M 60 175 L 340 175" stroke={C.ink} strokeWidth="2.5" strokeDasharray="6,4" />
        <path d="M 120 105 L 100 190 M 160 110 L 150 205 M 200 115 L 200 215 M 240 110 L 250 205 M 280 105 L 300 190" stroke={C.ink} strokeWidth="2.5" strokeDasharray="6,4" />
        
        {/* Offerings: Thekua, Banana, Coconut, Sugarcane tips */}
        {k > 0.3 && (
          <g transform={`scale(${k})`} style={{ transformOrigin: "200px 150px" }}>
            {/* Thekua biscuits */}
            <circle cx="160" cy="155" r="22" fill={C.red} stroke={C.ink} strokeWidth="4" />
            <circle cx="160" cy="155" r="14" fill="none" stroke={C.gold} strokeWidth="2" strokeDasharray="3,3" />
            <circle cx="210" cy="165" r="24" fill={C.red} stroke={C.ink} strokeWidth="4" />
            <circle cx="210" cy="165" r="15" fill="none" stroke={C.gold} strokeWidth="2" strokeDasharray="3,3" />
            <circle cx="255" cy="150" r="20" fill={C.red} stroke={C.ink} strokeWidth="4" />

            {/* Bananas */}
            <path d="M 110 140 Q 140 120 170 135" fill="none" stroke={C.gold} strokeWidth="10" strokeLinecap="round" />
            <path d="M 115 148 Q 145 128 175 143" fill="none" stroke={C.gold} strokeWidth="10" strokeLinecap="round" />

            {/* Coconut with vermilion mark */}
            <circle cx="200" cy="130" r="26" fill="#6d4c41" stroke={C.ink} strokeWidth="4" />
            <circle cx="200" cy="130" r="10" fill={C.red} />

            {/* Glowing Clay Diya at tip */}
            <path d="M 180 185 Q 200 200 220 185 Z" fill={C.red} stroke={C.ink} strokeWidth="3" />
            <path d="M 195 185 Q 200 165 205 185 Z" fill={C.gold} />
          </g>
        )}
      </svg>
    </div>
  );
}
export const MadhubaniSoop = block("MadhubaniSoop", MadhubaniSoopView);
/** Traditional Earthen Mud Stove (Chulha) with clay vessel (drawn by the film chhath-puja-why-we-stand-in-the-river-an-1027222029) */
function EarthenChulhaView({ size = 300, at = 0, lit = true }: { size?: number; at?: number; lit?: boolean }) {
  const C = {
    ground: "#ecdcb6",
    ink: "#1a1410",
    red: "#c8281e",
    indigo: "#2a3c9a",
    gold: "#e8a21e",
    green: "#1f6a4a",
    panel: "#1a1410",
    panelText: "#ecdcb6",
  };
  const { t } = useScene();
  const k = clamp01((t - at) / 0.6);

  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 350 280" style={{ overflow: "visible" }}>
      {/* Mud stove frame */}
      <path
        d="M 50 240 Q 40 140 120 120 Q 175 110 230 120 Q 310 140 300 240 Z"
        fill="#8d6e63"
        stroke={C.ink}
        strokeWidth="6"
      />
      {/* Hearth opening */}
      <path
        d="M 110 240 C 110 170 240 170 240 240 Z"
        fill="#3e2723"
        stroke={C.ink}
        strokeWidth="5"
      />
      {/* Decorative Mithila fish & dots on clay rim */}
      <circle cx="90" cy="180" r="6" fill={C.gold} stroke={C.ink} strokeWidth="2" />
      <circle cx="80" cy="205" r="6" fill={C.red} stroke={C.ink} strokeWidth="2" />
      <circle cx="260" cy="180" r="6" fill={C.gold} stroke={C.ink} strokeWidth="2" />
      <circle cx="270" cy="205" r="6" fill={C.red} stroke={C.ink} strokeWidth="2" />

      {/* Kadahi (iron wok) on stove */}
      <path
        d="M 90 120 Q 175 155 260 120 Q 240 85 175 85 Q 110 85 90 120 Z"
        fill="#263238"
        stroke={C.ink}
        strokeWidth="5"
      />
      {/* Wok handles */}
      <circle cx="85" cy="115" r="12" fill="none" stroke={C.ink} strokeWidth="4" />
      <circle cx="265" cy="115" r="12" fill="none" stroke={C.ink} strokeWidth="4" />

      {/* Bubbling ghee and thekua */}
      {lit && (
        <g opacity={k}>
          <ellipse cx="175" cy="110" rx="65" ry="16" fill={C.gold} opacity={0.85} />
          <circle cx="150" cy="110" r="8" fill={C.red} stroke={C.ink} strokeWidth="2" />
          <circle cx="185" cy="112" r="9" fill={C.red} stroke={C.ink} strokeWidth="2" />
          <circle cx="205" cy="108" r="7" fill={C.red} stroke={C.ink} strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
export const EarthenChulha = block("EarthenChulha", EarthenChulhaView);
/** Sacred Sugarcane Stalks (Ganna) tied as pavillion (drawn by the film chhath-puja-why-we-stand-in-the-river-an-1027222029) */
function SugarcaneCanopyView({ size = 400 }: { size?: number }) {
  const C = {
    ground: "#ecdcb6",
    ink: "#1a1410",
    red: "#c8281e",
    indigo: "#2a3c9a",
    gold: "#e8a21e",
    green: "#1f6a4a",
    panel: "#1a1410",
    panelText: "#ecdcb6",
  };
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 300 450" style={{ overflow: "visible" }}>
      {/* Cane 1 */}
      <line x1="60" y1="420" x2="140" y2="60" stroke={C.green} strokeWidth="12" strokeLinecap="round" />
      <line x1="60" y1="420" x2="140" y2="60" stroke={C.ink} strokeWidth="3" strokeDasharray="14,14" />
      
      {/* Cane 2 */}
      <line x1="240" y1="420" x2="160" y2="60" stroke={C.green} strokeWidth="12" strokeLinecap="round" />
      <line x1="240" y1="420" x2="160" y2="60" stroke={C.ink} strokeWidth="3" strokeDasharray="14,14" />

      {/* Cane 3 (center behind) */}
      <line x1="150" y1="430" x2="150" y2="40" stroke="#1b5e20" strokeWidth="10" />

      {/* Tied red fabric knot at apex */}
      <circle cx="150" cy="65" r="18" fill={C.red} stroke={C.ink} strokeWidth="4" />
      {/* Palm leaf plumes at top */}
      <path d="M 150 50 Q 100 10 70 30 M 150 50 Q 200 10 230 30 M 150 40 Q 150 -10 130 -20" stroke={C.green} strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
export const SugarcaneCanopy = block("SugarcaneCanopy", SugarcaneCanopyView);
/** Bamboo Soop filled with ritual offerings in Mithila style (drawn by the film chhath-puja-the-festival-of-the-sun-from-1027220710) */
function ChhathSoopView({ size = 420, at = 0 }: { size?: number; at?: number }) {
  const { t } = useScene();
  const dna = useDNA();
  const { ink, inks, paper, board } = dna;
  const k = clamp01((t - at) / 0.8);
  const saffron = inks[1];
  const red = inks[2];

  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 400 320" style={{ overflow: "visible" }}>
      <g transform={`scale(${0.9 + 0.1 * k})`} transform-origin="200 160">
        {/* Bamboo weave tray */}
        <path
          d="M 60 260 L 40 80 Q 200 40 360 80 L 340 260 Q 200 290 60 260 Z"
          fill={board}
          stroke={ink}
          strokeWidth="6"
        />
        {/* Double border fish pattern */}
        <path
          d="M 75 245 L 58 95 Q 200 60 342 95 L 325 245 Q 200 270 75 245 Z"
          fill="none"
          stroke={ink}
          strokeWidth="3"
          strokeDasharray="8 6"
        />
        {/* Sindoor sacred lines */}
        <line x1="80" y1="130" x2="320" y2="130" stroke={red} strokeWidth="10" strokeLinecap="round" />
        <line x1="100" y1="170" x2="300" y2="170" stroke={saffron} strokeWidth="8" strokeLinecap="round" />
        <line x1="120" y1="210" x2="280" y2="210" stroke={red} strokeWidth="10" strokeLinecap="round" />
        {/* Thekua cookies and fruits inside */}
        <circle cx="160" cy="180" r="30" fill={inks[0]} stroke={ink} strokeWidth="4" />
        <circle cx="240" cy="180" r="30" fill={inks[0]} stroke={ink} strokeWidth="4" />
        <circle cx="200" cy="150" r="34" fill={inks[0]} stroke={ink} strokeWidth="4" />
        {/* Banana & Coconut */}
        <ellipse cx="140" cy="140" rx="26" ry="14" fill={inks[1]} stroke={ink} strokeWidth="3" transform="rotate(-25 140 140)" />
        <ellipse cx="260" cy="140" rx="26" ry="14" fill={inks[1]} stroke={ink} strokeWidth="3" transform="rotate(25 260 140)" />
        <circle cx="200" cy="205" r="28" fill={ink} stroke={ink} strokeWidth="4" />
        <circle cx="200" cy="205" r="16" fill={paper} stroke={ink} strokeWidth="2" />
      </g>
    </svg>
  );
}
export const ChhathSoop = block("ChhathSoop", ChhathSoopView);
