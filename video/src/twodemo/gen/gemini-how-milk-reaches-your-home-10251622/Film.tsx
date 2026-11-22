/*
  The Journey of Milk - 65s 2D Explainer Film
  Stations along world-x:
    1. KITCHEN PROLOGUE (x: 1000): Ravi sips milk, wonders where it comes from (1.2s - 7.5s)
    2. DAIRY FARM (x: 3800): Gentle cows in meadow/barn, farmer lovingly milking cow into pail (8.6s - 14.5s)
    3. VILLAGE COLLECTION CENTRE (x: 6600): Farmers arrive with big steel milk cans, pouring into vats (15.5s - 21.0s)
    4. QUALITY TESTING & CHILLING (x: 9400): Worker testing fat with lactometer, chilling unit cooler (21.8s - 27.2s)
    5. HIGHWAY TANKER DRIVE (x: 12200 -> 14800): Insulated shiny silver tanker truck cruising highway to plant (28.0s - 34.8s)
    6. DAIRY PROCESSING PLANT (x: 15200): Pasteuriser heat exchanger & pouch packing machine drops sachets (35.6s - 42.2s)
    7. DELIVERY VAN & BOOTH (x: 18000): Early dawn refrigerated van arrives at neighborhood milk booth (43.0s - 48.8s)
    8. MILKMAN AT DOORSTEP (x: 20600): Milkman on bicycle drops fresh milk pouches at front porch doorstep (49.8s - 54.5s)
    9. KITCHEN BOIL & DRINK (x: 23200): Mother boils milk in stainless pot, Ravi happily holds up steaming mug! (55.4s - 65.0s)
*/

import React from "react";
import { loadFont } from "@remotion/google-fonts/Baloo2";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import VOICE from "../../../../public/twodemo/gemini-how-milk-reaches-your-home-10251622/voice.json";
import {
  W,
  H,
  FPS,
  D2R,
  clamp,
  ease,
  lerp,
  mixHex,
  schedule,
  Narration,
  Person,
  walkPose,
  walkIn,
  mixPose,
  STAND,
  SIT,
  SIP,
  HOLD_UP,
  RAISE,
  CARRY,
  REACH,
  cameraAt,
  view,
  Shot,
  Look,
  Pose,
} from "../../kit2d";

export const SECONDS = 65;
const { fontFamily } = loadFont("normal", { weights: ["600"] });

const WANT = [1.2, 8.6, 15.5, 21.8, 28.0, 35.6, 43.0, 49.8, 55.4];
const SCHEDULED_LINES = schedule(VOICE, WANT);
const AMBIENT_PATH = "twodemo/gemini-how-milk-reaches-your-home-10251622/ambient.wav";

// Station coordinates
const S_KITCHEN_START = 1000;
const S_FARM = 3800;
const S_COLLECTION = 6600;
const S_TESTING = 9400;
const S_ROAD0 = 12000;
const S_ROAD1 = 14600;
const S_PLANT = 15200;
const S_BOOTH = 18000;
const S_DOORSTEP = 20600;
const S_KITCHEN_END = 23200;

// Character Looks
const RAVI: Look = { skin: "#9c6a45", top: "#38bdf8", bottom: "#1e293b", hair: "#1c1917", height: 240 };
const FARMER: Look = { skin: "#854d0e", top: "#ea580c", bottom: "#fef08a", lungi: true, mustache: true, hair: "#292524", height: 295 };
const WORKER: Look = { skin: "#a16207", top: "#0284c7", bottom: "#334155", hair: "#1c1917", mustache: true, height: 300 };
const LAB_TECH: Look = { skin: "#9a3412", top: "#f8fafc", bottom: "#475569", hair: "#0f172a", height: 290 };
const BOOTH_AGENT: Look = { skin: "#854d0e", top: "#16a34a", bottom: "#334155", hair: "#1c1917", height: 295 };
const MILKMAN: Look = { skin: "#78350f", top: "#e11d48", bottom: "#f8fafc", lungi: true, mustache: true, hair: "#1c1917", height: 290 };
const MOTHER: Look = { skin: "#a16207", top: "#f43f5e", bottom: "#f43f5e", saree: "#f59e0b", hair: "#18181b", height: 280 };

// Camera shots timeline
const SHOTS: Shot[] = [
  { at: 0, x: S_KITCHEN_START, y: -220, z: 1.15 },
  { at: 7.2, x: S_FARM + 100, y: -230, z: 0.95 },
  { at: 14.3, x: S_COLLECTION + 50, y: -230, z: 1.0 },
  { at: 20.6, x: S_TESTING + 60, y: -220, z: 1.05 },
  { at: 26.8, x: S_ROAD0 + 100, y: -210, z: 0.92 },
  { at: 34.4, x: S_PLANT + 80, y: -230, z: 1.0 },
  { at: 41.8, x: S_BOOTH + 60, y: -220, z: 0.98 },
  { at: 48.6, x: S_DOORSTEP + 30, y: -210, z: 1.05 },
  { at: 54.2, x: S_KITCHEN_END + 50, y: -220, z: 1.1 },
  { at: 61.5, x: S_KITCHEN_END + 20, y: -210, z: 1.25 },
];

/* ---------------- SVG Component Sets for Stations ---------------- */

// 1 & 9. Kitchen Room Set
function KitchenSet({ x, isNight }: { x: number; isNight?: boolean }) {
  const wallCol = isNight ? "#f8fafc" : "#fffbeb";
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Wall & Flooring */}
      <rect x={-800} y={-580} width={1600} height={580} fill={wallCol} />
      <rect x={-800} y={-580} width={1600} height={20} fill="#fde68a" />
      {/* Big Window with curtains */}
      <rect x={-260} y={-480} width={260} height={260} rx={16} fill="#bae6fd" stroke="#e2e8f0" strokeWidth={12} />
      <line x1={-130} y1={-480} x2={-130} y2={-220} stroke="#e2e8f0" strokeWidth={6} />
      <line x1={-260} y1={-350} x2={0} y2={-350} stroke="#e2e8f0" strokeWidth={6} />
      <circle cx={-180} cy={-390} r={34} fill="#fef08a" />
      {/* Kitchen Counter & Stove */}
      <rect x={120} y={-230} width={480} height={230} rx={10} fill="#475569" />
      <rect x={110} y={-242} width={500} height={16} rx={6} fill="#1e293b" />
      {/* Overhead cupboards */}
      <rect x={160} y={-540} width={400} height={160} rx={8} fill="#ca8a04" opacity={0.8} />
      <rect x={170} y={-530} width={180} height={140} rx={6} fill="#eab308" opacity={0.5} />
      <rect x={370} y={-530} width={180} height={140} rx={6} fill="#eab308" opacity={0.5} />
      {/* Gas stove & burner */}
      <rect x={200} y={-260} width={120} height={18} rx={6} fill="#0f172a" />
      <ellipse cx={260} cy={-260} rx={32} ry={6} fill="#94a3b8" />
      {/* Table on the left */}
      <rect x={-460} y={-200} width={240} height={16} rx={4} fill="#b45309" />
      <rect x={-440} y={-184} width={16} height={184} fill="#92400e" />
      <rect x={-250} y={-184} width={16} height={184} fill="#92400e" />
    </g>
  );
}

// Cow SVG Rig
function Cow({ x, y, chew, headTilt }: { x: number; y: number; chew: number; headTilt: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Shadow */}
      <ellipse cx={0} cy={2} rx={140} ry={18} fill="rgba(30,20,10,0.18)" />
      {/* Legs (Far) */}
      <rect x={-110} y={-120} width={22} height={120} rx={8} fill="#d1d5db" />
      <rect x={70} y={-120} width={22} height={120} rx={8} fill="#d1d5db" />
      <rect x={-110} y={-14} width={22} height={14} rx={3} fill="#1f2937" />
      <rect x={70} y={-14} width={22} height={14} rx={3} fill="#1f2937" />
      {/* Udder & Teats */}
      <path d="M 20 -90 Q 40 -40 60 -90 Z" fill="#fbcfe8" />
      <line x1={32} y1={-60} x2={30} y2={-45} stroke="#f472b6" strokeWidth={6} strokeLinecap="round" />
      <line x1={48} y1={-60} x2={50} y2={-45} stroke="#f472b6" strokeWidth={6} strokeLinecap="round" />
      {/* Cow Body */}
      <rect x={-130} y={-180} width={240} height={120} rx={45} fill="#f8fafc" />
      {/* Black Spots */}
      <ellipse cx={-60} cy={-130} rx={38} ry={26} fill="#1e293b" />
      <circle cx={40} cy={-140} r={26} fill="#1e293b" />
      <ellipse cx={-10} cy={-100} rx={22} ry={16} fill="#1e293b" />
      {/* Legs (Near) */}
      <rect x={-90} y={-120} width={24} height={120} rx={8} fill="#f8fafc" />
      <rect x={90} y={-120} width={24} height={120} rx={8} fill="#f8fafc" />
      <rect x={-90} y={-14} width={24} height={14} rx={3} fill="#1f2937" />
      <rect x={90} y={-14} width={24} height={14} rx={3} fill="#1f2937" />
      {/* Tail */}
      <path d="M -130 -150 Q -160 -100 -148 -60" stroke="#f8fafc" strokeWidth={8} fill="none" strokeLinecap="round" />
      <ellipse cx={-148} cy={-56} rx={8} ry={14} fill="#1e293b" />
      {/* Cow Head Group */}
      <g transform={`translate(130 -160) rotate(${headTilt})`}>
        <ellipse cx={20} cy={-10} rx={48} ry={36} fill="#f8fafc" />
        <ellipse cx={-8} cy={-18} rx={20} ry={14} fill="#1e293b" />
        {/* Snout with mouth chewing */}
        <ellipse cx={52 + chew * 3} cy={6} rx={26} ry={20} fill="#fbcfe8" />
        <circle cx={46} cy={2} r={4} fill="#475569" />
        <circle cx={58} cy={2} r={4} fill="#475569" />
        {/* Eyes & Horns */}
        <circle cx={14} cy={-22} r={6} fill="#0f172a" />
        <circle cx={16} cy={-24} r={2} fill="#ffffff" />
        <path d="M 0 -38 Q 6 -70 24 -64 Q 16 -46 8 -36 Z" fill="#cbd5e1" stroke="#94a3b8" />
        {/* Ears */}
        <ellipse cx={-16} cy={-16} rx={20} ry={9} fill="#fbcfe8" transform="rotate(-20)" />
      </g>
    </g>
  );
}

// 2. Dairy Farm Set
function DairyFarmSet({ x, t }: { x: number; t: number }) {
  const chew = Math.sin(t * 8);
  const headTilt = Math.sin(t * 1.5) * 4;
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Barn Shed */}
      <rect x={-600} y={-420} width={1200} height={420} fill="#fef3c7" />
      <polygon points="-640,-420 0,-560 640,-420" fill="#dc2626" />
      {/* Wooden Beams */}
      <rect x={-520} y={-420} width={30} height={420} fill="#b45309" />
      <rect x={-20} y={-420} width={30} height={420} fill="#b45309" />
      <rect x={480} y={-420} width={30} height={420} fill="#b45309" />
      <line x1={-600} y1={-260} x2={600} y2={-260} stroke="#b45309" strokeWidth={16} />
      {/* Hay Feeder Trough */}
      <rect x={-500} y={-140} width={320} height={120} rx={8} fill="#78350f" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M ${-490 + i * 36} -140 Q ${-475 + i * 36} -180 ${-460 + i * 36} -140`} stroke="#facc15" strokeWidth={8} fill="none" />
      ))}
      {/* Cows */}
      <Cow x={-180} y={-10} chew={chew} headTilt={headTilt} />
      {/* Milk Pail / Bucket with milk spray */}
      <g transform="translate(180 -10)">
        <polygon points="-24,0 24,0 20,-50 -20,-50" fill="#cbd5e1" stroke="#64748b" strokeWidth={3} />
        <ellipse cx={0} cy={-50} rx={20} ry={6} fill="#f8fafc" />
        {/* Milking stream animation */}
        {t > 8.8 && t < 14.8 && (
          <path
            d={`M -30 -140 Q ${-5 + Math.sin(t * 20) * 4} -90 0 -50`}
            stroke="#ffffff"
            strokeWidth={4}
            fill="none"
            strokeDasharray="8 4"
          />
        )}
      </g>
    </g>
  );
}

// Milk Cans Helper
function MilkCan({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={0} rx={22} ry={6} fill="rgba(30,20,10,0.2)" />
      {/* Bottom body */}
      <path d="M -22 -10 L 22 -10 L 20 -70 L -20 -70 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={3} />
      {/* Neck & Lid */}
      <path d="M -20 -70 L -12 -90 L 12 -90 L 20 -70 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth={3} />
      <rect x={-14} y={-98} width={28} height={9} rx={3} fill="#94a3b8" />
      {/* Steel ring & handles */}
      <line x1={-20} y1={-40} x2={20} y2={-40} stroke="#94a3b8" strokeWidth={4} />
      <path d="M -20 -60 Q -30 -50 -18 -40" stroke="#64748b" strokeWidth={4} fill="none" />
      <path d="M 20 -60 Q 30 -50 18 -40" stroke="#64748b" strokeWidth={4} fill="none" />
    </g>
  );
}

// 3. Village Collection Centre Set
function CollectionSet({ x, t }: { x: number; t: number }) {
  const isPouring = t > 17 && t < 20.8;
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Centre Building */}
      <rect x={-600} y={-480} width={1200} height={480} fill="#f1f5f9" />
      <rect x={-600} y={-480} width={1200} height={36} fill="#0284c7" />
      <rect x={-520} y={-380} width={180} height={140} rx={8} fill="#bae6fd" stroke="#38bdf8" strokeWidth={6} />
      {/* Big Weighing Vat */}
      <rect x={-40} y={-160} width={280} height={160} rx={20} fill="#cbd5e1" stroke="#64748b" strokeWidth={5} />
      <rect x={-60} y={-174} width={320} height={18} rx={6} fill="#94a3b8" />
      <ellipse cx={100} cy={-170} rx={140} ry={20} fill="#f8fafc" />
      {/* Scale dial stand */}
      <rect x={180} y={-320} width={16} height={150} fill="#475569" />
      <circle cx={188} cy={-340} r={46} fill="#ffffff" stroke="#475569" strokeWidth={6} />
      <line
        x1={188}
        y1={-340}
        x2={188 + Math.cos(t * 3) * 30}
        y2={-340 + Math.sin(t * 3) * 30}
        stroke="#ef4444"
        strokeWidth={4}
      />
      {/* Poured milk cascade */}
      {isPouring && (
        <path
          d={`M -50 -190 Q -20 -150 20 -160`}
          stroke="#ffffff"
          strokeWidth={14}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Lineup of Cans */}
      <MilkCan x={-360} y={-4} scale={1.2} />
      <MilkCan x={-290} y={-4} scale={1.15} />
      <MilkCan x={-220} y={-4} scale={1.2} />
      <MilkCan x={340} y={-4} scale={1.15} />
      <MilkCan x={410} y={-4} scale={1.2} />
    </g>
  );
}

// 4. Quality Testing & Chilling Set
function TestingChillingSet({ x, t }: { x: number; t: number }) {
  const bubbleY = (t * 80) % 180;
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Lab Room wall */}
      <rect x={-600} y={-500} width={1200} height={500} fill="#f8fafc" />
      <rect x={-600} y={-500} width={1200} height={18} fill="#10b981" />
      {/* Lab Testing Bench */}
      <rect x={-480} y={-220} width={420} height={220} rx={8} fill="#334155" />
      <rect x={-490} y={-230} width={440} height={14} rx={4} fill="#e2e8f0" />
      {/* Test Tubes & Gerber Centrifuge */}
      <rect x={-420} y={-280} width={50} height={50} rx={6} fill="#64748b" />
      <rect x={-412} y={-310} width={10} height={60} rx={4} fill="#ffffff" stroke="#94a3b8" strokeWidth={2} />
      <rect x={-396} y={-310} width={10} height={60} rx={4} fill="#ffffff" stroke="#94a3b8" strokeWidth={2} />
      <circle cx={-300} cy={-255} r={32} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={4} />
      <circle cx={-300} cy={-255} r={8} fill="#0284c7" />
      {/* Bulk Milk Chiller (BMC) Silo */}
      <rect x={60} y={-440} width={360} height={430} rx={40} fill="#cbd5e1" stroke="#64748b" strokeWidth={6} />
      <ellipse cx={240} cy={-440} rx={180} ry={24} fill="#e2e8f0" />
      {/* Glass view column showing cold milk & bubbles */}
      <rect x={200} y={-380} width={80} height={260} rx={12} fill="#0284c7" opacity={0.3} />
      <rect x={204} y={-376} width={72} height={252} rx={8} fill="#f8fafc" opacity={0.8} />
      <circle cx={230} cy={-160 - bubbleY} r={6} fill="#38bdf8" />
      <circle cx={250} cy={-130 - bubbleY} r={8} fill="#38bdf8" />
      {/* Digital Temperature Gauge (shows 4°C chilled) */}
      <rect x={280} y={-340} width={100} height={50} rx={6} fill="#0f172a" />
      <circle cx={305} cy={-315} r={8} fill="#22c55e" />
      <rect x={325} y={-322} width={40} height={14} rx={3} fill="#22c55e" opacity={0.8} />
      {/* Pipe system leading outward */}
      <path d="M 420 -200 L 580 -200" stroke="#94a3b8" strokeWidth={24} fill="none" />
    </g>
  );
}

// 5. Insulated Tanker Highway Truck
function HighwayTruck({ x, truckX, wheelA }: { x: number; truckX: number; wheelA: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Highway Landscape */}
      <rect x={-800} y={0} width={3400} height={180} fill="#475569" />
      {/* Road Markings */}
      {Array.from({ length: 32 }, (_, i) => (
        <rect key={i} x={-800 + i * 110} y={70} width={65} height={12} rx={6} fill="#fef08a" />
      ))}
      {/* Guardrails */}
      <line x1={-800} y1={-15} x2={2600} y2={-15} stroke="#cbd5e1" strokeWidth={10} />
      {/* Moving Shiny Insulated Milk Tanker Truck */}
      <g transform={`translate(${truckX} 0)`}>
        {/* Shadow */}
        <ellipse cx={-100} cy={-6} rx={360} ry={16} fill="rgba(15,23,42,0.3)" />
        {/* Tanker Body (Elliptical Cylindrical Tank) */}
        <rect x={-360} y={-230} width={440} height={180} rx={60} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={4} />
        {/* Shiny reflective chrome highlights */}
        <rect x={-340} y={-210} width={400} height={20} rx={10} fill="#ffffff" opacity={0.65} />
        <rect x={-340} y={-170} width={400} height={8} rx={4} fill="#ffffff" opacity={0.35} />
        {/* Ladder & Top hatch */}
        <rect x={-160} y={-255} width={70} height={26} rx={8} fill="#64748b" />
        <line x1={-240} y1={-225} x2={-240} y2={-60} stroke="#64748b" strokeWidth={6} />
        <line x1={-250} y1={-225} x2={-250} y2={-60} stroke="#64748b" strokeWidth={6} />
        {/* Front Truck Cabin */}
        <path d="M 80 -60 L 80 -210 L 190 -210 L 250 -130 L 250 -60 Z" fill="#0284c7" />
        <path d="M 110 -195 L 180 -195 L 230 -135 L 110 -135 Z" fill="#bae6fd" />
        {/* Driver silhouette */}
        <circle cx={145} cy={-160} r={18} fill="#1e293b" />
        {/* Headlights beam */}
        <polygon points="250,-110 480,-160 480,-40 250,-80" fill="#fef08a" opacity={0.25} />
        {/* Wheels (turning with wheelA) */}
        {[-280, -180, -60, 180].map((wx, i) => (
          <g key={i} transform={`translate(${wx} -36) rotate(${wheelA})`}>
            <circle r={36} fill="#1e293b" />
            <circle r={20} fill="#94a3b8" />
            <circle r={6} fill="#e2e8f0" />
            <line x1={-18} y1={0} x2={18} y2={0} stroke="#475569" strokeWidth={4} />
            <line x1={0} y1={-18} x2={0} y2={18} stroke="#475569" strokeWidth={4} />
          </g>
        ))}
      </g>
    </g>
  );
}

// 6. Dairy Processing Plant Set
function DairyPlantSet({ x, t }: { x: number; t: number }) {
  const beltMove = (t * 120) % 360;
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Factory Interior Walls */}
      <rect x={-650} y={-560} width={1300} height={560} fill="#f1f5f9" />
      <rect x={-650} y={-560} width={1300} height={24} fill="#2563eb" />
      {/* Pasteurisation Plate Heat Exchanger Towers */}
      <rect x={-520} y={-420} width={260} height={380} rx={16} fill="#94a3b8" stroke="#475569" strokeWidth={6} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={-500} y={-400 + i * 38} width={220} height={20} rx={4} fill={i % 2 ? "#ef4444" : "#3b82f6"} />
      ))}
      {/* Temperature Pipes */}
      <path d="M -390 -420 L -390 -480 L -120 -480 L -120 -380" stroke="#cbd5e1" strokeWidth={18} fill="none" />
      {/* Automatic Form-Fill-Seal Pouch Packing Machine */}
      <rect x={-180} y={-460} width={220} height={420} rx={14} fill="#cbd5e1" stroke="#64748b" strokeWidth={6} />
      {/* Film roll on top */}
      <circle cx={-70} cy={-480} r={38} fill="#f8fafc" stroke="#3b82f6" strokeWidth={6} />
      {/* Vertical funnel & sealing jaws */}
      <polygon points="-90,-380 -50,-380 -60,-280 -80,-280" fill="#94a3b8" />
      {/* Sealer bar pulsating */}
      <rect x={-110} y={-240} width={80} height={16} rx={4} fill="#dc2626" opacity={0.8 + Math.sin(t * 12) * 0.2} />
      {/* Conveyor Belt carrying sealed milk pouches */}
      <rect x={-60} y={-120} width={520} height={22} rx={10} fill="#1e293b" />
      {/* Rollers */}
      {[-40, 100, 240, 380, 440].map((rx, i) => (
        <circle key={i} cx={rx} cy={-109} r={12} fill="#64748b" />
      ))}
      {/* Pouches on conveyor */}
      {Array.from({ length: 5 }, (_, i) => {
        const px = -20 + ((i * 90 + beltMove) % 460);
        return (
          <g key={i} transform={`translate(${px} -135)`}>
            <rect x={-18} y={-10} width={36} height={22} rx={6} fill="#f8fafc" stroke="#2563eb" strokeWidth={2} />
            <path d="M -18 1 L 18 1" stroke="#3b82f6" strokeWidth={4} />
          </g>
        );
      })}
      {/* Crates accumulating pouches */}
      <rect x={380} y={-80} width={140} height={80} rx={8} fill="#ea580c" />
      <line x1={380} y1={-50} x2={520} y2={-50} stroke="#9a3412" strokeWidth={4} />
    </g>
  );
}

// 7. Neighbourhood Milk Booth Set
function MilkBoothSet({ x, t }: { x: number; t: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Early Morning Dawn Sky Background */}
      <rect x={-650} y={-540} width={1300} height={540} fill="#fef3c7" opacity={0.6} />
      {/* Booth Kiosk */}
      <rect x={-180} y={-360} width={380} height={360} rx={14} fill="#15803d" />
      <polygon points="-220,-360 -190,-420 230,-420 200,-360" fill="#166534" />
      {/* Window Counter */}
      <rect x={-120} y={-270} width={260} height={150} rx={8} fill="#dcfce7" stroke="#14532d" strokeWidth={8} />
      <rect x={-140} y={-125} width={300} height={18} rx={6} fill="#f59e0b" />
      {/* Stacks of blue & green milk crates */}
      {Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 2 }, (_, col) => (
          <g key={`${row}-${col}`} transform={`translate(${160 + col * 90} ${-40 - row * 38})`}>
            <rect x={0} y={0} width={80} height={34} rx={6} fill={row % 2 ? "#0284c7" : "#16a34a"} />
            {Array.from({ length: 4 }, (_, p) => (
              <rect key={p} x={8 + p * 16} y={4} width={12} height={8} rx={2} fill="#ffffff" />
            ))}
          </g>
        ))
      )}
      {/* Refrigerated delivery mini-van parked on left */}
      <g transform="translate(-460 0)">
        <rect x={-80} y={-180} width={220} height={140} rx={16} fill="#f8fafc" stroke="#94a3b8" strokeWidth={4} />
        {/* Blue cooling stripe */}
        <rect x={-80} y={-120} width={220} height={20} fill="#0284c7" />
        <path d="M 140 -40 L 140 -150 L 190 -150 L 230 -90 L 230 -40 Z" fill="#0284c7" />
        <path d="M 160 -135 L 185 -135 L 215 -95 L 160 -95 Z" fill="#bae6fd" />
        {/* Wheels */}
        <circle cx={-20} cy={-28} r={28} fill="#1e293b" />
        <circle cx={-20} cy={-28} r={12} fill="#cbd5e1" />
        <circle cx={180} cy={-28} r={28} fill="#1e293b" />
        <circle cx={180} cy={-28} r={12} fill="#cbd5e1" />
      </g>
    </g>
  );
}

// 8. Doorstep Set
function DoorstepSet({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* House Front Wall */}
      <rect x={-600} y={-520} width={1200} height={520} fill="#fdf4ff" />
      {/* Front Door */}
      <rect x={100} y={-380} width={220} height={380} rx={10} fill="#854d0e" stroke="#581c87" strokeWidth={6} />
      <rect x={120} y={-360} width={80} height={140} rx={4} fill="#a16207" />
      <rect x={220} y={-360} width={80} height={140} rx={4} fill="#a16207" />
      <circle cx={130} cy={-180} r={8} fill="#facc15" />
      {/* Doorstep steps */}
      <rect x={60} y={-40} width={300} height={20} rx={4} fill="#e2e8f0" />
      <rect x={30} y={-20} width={360} height={20} rx={4} fill="#cbd5e1" />
      {/* Flower pot beside door */}
      <polygon points="340,0 380,0 395,-60 325,-60" fill="#ea580c" />
      <ellipse cx={360} cy={-85} rx={36} ry={36} fill="#22c55e" />
      <ellipse cx={345} cy={-110} rx={22} ry={22} fill="#4ade80" />
    </g>
  );
}

// Milk Delivery Bicycle
function Bicycle({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Shadow */}
      <ellipse cx={0} cy={2} rx={110} ry={8} fill="rgba(30,20,10,0.18)" />
      {/* Wheels */}
      <circle cx={-90} cy={-40} r={38} stroke="#1e293b" strokeWidth={6} fill="none" />
      <circle cx={90} cy={-40} r={38} stroke="#1e293b" strokeWidth={6} fill="none" />
      {/* Spokes */}
      <line x1={-90} y1={-78} x2={-90} y2={-2} stroke="#94a3b8" strokeWidth={2} />
      <line x1={-128} y1={-40} x2={-52} y2={-40} stroke="#94a3b8" strokeWidth={2} />
      <line x1={90} y1={-78} x2={90} y2={-2} stroke="#94a3b8" strokeWidth={2} />
      <line x1={52} y1={-40} x2={128} y2={-40} stroke="#94a3b8" strokeWidth={2} />
      {/* Frame */}
      <polygon points="-90,-40 0,-40 -30,-95" stroke="#0284c7" strokeWidth={6} fill="none" />
      <polygon points="0,-40 90,-40 60,-105" stroke="#0284c7" strokeWidth={6} fill="none" />
      <line x1={-30} y1={-95} x2={60} y2={-105} stroke="#0284c7" strokeWidth={6} />
      {/* Handlebar & Saddle */}
      <line x1={60} y1={-105} x2={50} y2={-130} stroke="#334155" strokeWidth={6} />
      <line x1={38} y1={-130} x2={68} y2={-130} stroke="#1e293b" strokeWidth={8} strokeLinecap="round" />
      <ellipse cx={-32} cy={-102} rx={16} ry={6} fill="#1e293b" />
      {/* Side carrier cloth bags with milk packets */}
      <rect x={-115} y={-85} width={45} height={50} rx={6} fill="#f59e0b" stroke="#b45309" strokeWidth={3} />
      <rect x={-105} y={-95} width={26} height={16} rx={4} fill="#ffffff" stroke="#0284c7" strokeWidth={2} />
    </g>
  );
}

// Mug Helper
function GlassMug({ x, y, steam, milkColor = "#ffffff" }: { x: number; y: number; steam?: boolean; milkColor?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0} rx={16} ry={4} fill="rgba(0,0,0,0.15)" />
      {/* Tumbler / Mug Body */}
      <polygon points="-16,0 16,0 20,-45 -20,-45" fill="#f8fafc" stroke="#94a3b8" strokeWidth={2.5} />
      {/* Milk Content */}
      <polygon points="-14,-2 14,-2 17,-40 -17,-40" fill={milkColor} />
      <ellipse cx={0} cy={-40} rx={17} ry={5} fill={milkColor} stroke="#e2e8f0" strokeWidth={1} />
      {/* Mug Handle */}
      <path d="M 18 -36 Q 32 -25 15 -10" stroke="#94a3b8" strokeWidth={4} fill="none" />
      {/* Steam trails */}
      {steam && (
        <>
          <path d="M -6 -50 Q -12 -70 -4 -85" stroke="#cbd5e1" strokeWidth={3} fill="none" opacity={0.6} />
          <path d="M 6 -50 Q 14 -72 6 -90" stroke="#cbd5e1" strokeWidth={3} fill="none" opacity={0.6} />
        </>
      )}
    </g>
  );
}

/* ---------------- Main Film Component ---------------- */
export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  // Camera tracking
  const cam = cameraAt(SHOTS, t);

  // Background sky tint dynamically changing along morning journey
  const skyColor =
    t < 8
      ? "#fef08a" // Morning room
      : t < 28
      ? "#bae6fd" // Bright rural day
      : t < 43
      ? "#e0f2fe" // Plant & day drive
      : t < 50
      ? "#fed7aa" // Dawn milk booth
      : "#fef9c3"; // Warm cozy home

  // Tanker drive animation (between 27.5s and 35.0s)
  const truckDriveP = ease((t - 27.5) / 7.2);
  const truckX = lerp(S_ROAD0 - 200, S_ROAD1 - 1000, truckDriveP);
  const wheelA = ((truckX - S_ROAD0) / 36) / D2R;

  // Characters actions per scene

  // 1. Scene 1 (0 to 8s): Ravi at kitchen table, holding cup, drinking, then curious
  let raviS1Pose = STAND;
  if (t < 8) {
    const sipW = ease((t - 1.5) / 0.8) * (1 - ease((t - 4.5) / 0.8));
    const pointW = ease((t - 4.8) / 0.7);
    raviS1Pose = mixPose(STAND, SIP, sipW);
    raviS1Pose = mixPose(raviS1Pose, { armF: 65, foreF: 40, head: 12 }, pointW);
  }

  // 2. Scene 2 (8.6 to 15s): Farmer milking cow
  const milkPump = Math.sin(t * 10);
  const farmerMilkingPose: Pose = mixPose(
    mixPose(STAND, SIT, 1),
    { armF: 60 + milkPump * 15, foreF: 50 - milkPump * 10, armB: 60 - milkPump * 15, foreB: 50 + milkPump * 10, lean: 14, head: 12 },
    1
  );

  // 3. Scene 3 (15.5 to 21.5s): Worker carrying and pouring milk can
  const workerWalk = walkIn(t, 15.0, 18.0, S_COLLECTION - 260, S_COLLECTION - 60);
  let workerPose = walkPose(workerWalk.phase, workerWalk.moving);
  const pourCan = ease((t - 18.0) / 0.8) * (1 - ease((t - 21.2) / 0.6));
  workerPose = mixPose(workerPose, { ...CARRY, armF: 80, foreF: 60, lean: 16 }, pourCan);

  // 4. Scene 4 (21.8 to 27.5s): Lab technician testing quality
  const labTechPose = mixPose(
    STAND,
    { armF: 85 + Math.sin(t * 3) * 10, foreF: 70, head: 16, lean: 8 },
    1
  );

  // 6. Scene 6 (35.6 to 42.5s): Plant worker monitoring packing machine
  const plantWorkerPose = mixPose(
    STAND,
    { armF: 45 + Math.sin(t * 2) * 15, foreF: 40, head: 8 },
    1
  );

  // 7. Scene 7 (43.0 to 49.5s): Delivery agent handing crates at milk booth
  const boothAgentPose = mixPose(
    STAND,
    { armF: 70 + Math.sin(t * 2) * 20, foreF: 40, lean: 6 },
    1
  );

  // 8. Scene 8 (49.8 to 55s): Milkman with bicycle dropping pouches at door
  const milkmanWalk = walkIn(t, 49.4, 52.4, S_DOORSTEP - 180, S_DOORSTEP + 20);
  let milkmanPose = walkPose(milkmanWalk.phase, milkmanWalk.moving);
  const bendDrop = ease((t - 52.5) / 0.6) * (1 - ease((t - 54.8) / 0.6));
  milkmanPose = mixPose(milkmanPose, { thighF: 60, shinF: -60, lean: 30, armF: 80, foreF: 20 }, bendDrop);

  // 9. Scene 9 (55.4 to 65s): Mother boiling milk, Ravi taking steaming glass
  const motherStir = Math.sin(t * 4);
  const motherPose = mixPose(
    STAND,
    { armF: 60 + motherStir * 15, foreF: 50, head: 10, lean: 6 },
    1
  );
  const raviEndWalk = walkIn(t, 55.0, 58.0, S_KITCHEN_END - 220, S_KITCHEN_END - 60);
  let raviEndPose = walkPose(raviEndWalk.phase, raviEndWalk.moving);
  const happyHold = ease((t - 58.2) / 0.8);
  raviEndPose = mixPose(raviEndPose, HOLD_UP, happyHold);

  return (
    <AbsoluteFill style={{ backgroundColor: skyColor }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Sky Background */}
        <rect width={W} height={H} fill={skyColor} />

        {/* Far Background Parallax (Distant hills, sun, trees) */}
        <g transform={view(cam, 0.25)}>
          {Array.from({ length: 40 }, (_, i) => (
            <path
              key={i}
              d={`M ${-2000 + i * 800} 0 Q ${-1600 + i * 800} -${260 + (i % 5) * 40} ${-1200 + i * 800} 0 Z`}
              fill={i % 2 === 0 ? "#86efac" : "#6ee7b7"}
              opacity={0.5}
            />
          ))}
          <circle cx={4000} cy={-600} r={100} fill="#fde047" opacity={0.7} />
          <circle cx={14000} cy={-620} r={120} fill="#fde047" opacity={0.6} />
        </g>

        {/* Midground & Foreground World Strip */}
        <g transform={view(cam, 1)}>
          {/* Continuous Ground Plane */}
          <rect x={-2000} y={0} width={28000} height={600} fill="#84cc16" />
          <rect x={-2000} y={0} width={28000} height={16} fill="#65a30d" />

          {/* 1. Kitchen Prologue */}
          <KitchenSet x={S_KITCHEN_START} />
          <Person x={S_KITCHEN_START - 290} y={0} face={1} look={RAVI} pose={raviS1Pose} />
          <GlassMug
            x={S_KITCHEN_START - 240}
            y={-196}
            steam={t < 4}
            milkColor="#ffffff"
          />

          {/* 2. Dairy Farm */}
          <DairyFarmSet x={S_FARM} t={t} />
          <Person x={S_FARM + 120} y={0} face={-1} look={FARMER} pose={farmerMilkingPose} />

          {/* 3. Village Collection Centre */}
          <CollectionSet x={S_COLLECTION} t={t} />
          <Person
            x={workerWalk.x}
            y={0}
            face={workerWalk.face}
            look={WORKER}
            pose={workerPose}
          />
          {t < 18.2 && <MilkCan x={workerWalk.x + 24} y={-50} scale={0.9} />}

          {/* 4. Quality Testing & Chilling */}
          <TestingChillingSet x={S_TESTING} t={t} />
          <Person x={S_TESTING - 200} y={0} face={1} look={LAB_TECH} pose={labTechPose} />

          {/* 5. Highway Tanker Drive */}
          <HighwayTruck x={S_ROAD0} truckX={truckX - S_ROAD0} wheelA={wheelA} />

          {/* 6. Dairy Processing Plant */}
          <DairyPlantSet x={S_PLANT} t={t} />
          <Person x={S_PLANT + 220} y={0} face={-1} look={WORKER} pose={plantWorkerPose} />

          {/* 7. Neighbourhood Milk Booth */}
          <MilkBoothSet x={S_BOOTH} t={t} />
          <Person x={S_BOOTH + 20} y={0} face={-1} look={BOOTH_AGENT} pose={boothAgentPose} />

          {/* 8. Doorstep Delivery */}
          <DoorstepSet x={S_DOORSTEP} />
          <Bicycle x={S_DOORSTEP - 160} y={0} />
          <Person
            x={milkmanWalk.x}
            y={0}
            face={milkmanWalk.face}
            look={MILKMAN}
            pose={milkmanPose}
          />
          {/* Milk packets sitting at doorstep */}
          {t > 53.2 && (
            <g transform={`translate(${S_DOORSTEP + 80} -24)`}>
              <rect x={-14} y={-10} width={28} height={16} rx={4} fill="#ffffff" stroke="#0284c7" strokeWidth={2} />
              <rect x={10} y={-10} width={28} height={16} rx={4} fill="#ffffff" stroke="#16a34a" strokeWidth={2} />
            </g>
          )}

          {/* 9. Final Kitchen - Boiling & Drinking */}
          <KitchenSet x={S_KITCHEN_END} />
          {/* Mother near gas stove */}
          <Person x={S_KITCHEN_END + 160} y={0} face={1} look={MOTHER} pose={motherPose} />
          {/* Boiling Pot on stove with milk foaming & rising */}
          <g transform={`translate(${S_KITCHEN_END + 260} -260)`}>
            <polygon points="-28,0 28,0 32,-45 -32,-45" fill="#cbd5e1" stroke="#475569" strokeWidth={3} />
            {/* Milk foaming inside */}
            <ellipse
              cx={0}
              cy={-45 + Math.sin(t * 8) * 3}
              rx={30}
              ry={8}
              fill="#ffffff"
            />
            {/* Steam clouds */}
            {Array.from({ length: 3 }, (_, k) => (
              <path
                key={k}
                d={`M ${-16 + k * 16} -55 Q ${-24 + k * 16} -80 ${-12 + k * 16} -110`}
                stroke="#cbd5e1"
                strokeWidth={5}
                fill="none"
                opacity={0.7}
              />
            ))}
          </g>

          {/* Ravi holding cup happily */}
          <Person
            x={raviEndWalk.x}
            y={0}
            face={raviEndWalk.face}
            look={RAVI}
            pose={raviEndPose}
          />
          {happyHold > 0.4 && (
            <GlassMug
              x={raviEndWalk.x + 36}
              y={-180}
              steam={true}
              milkColor="#ffffff"
            />
          )}
        </g>
      </svg>

      {/* Synchronized Voice & Ambience Audio Tracks */}
      <Narration
        lines={SCHEDULED_LINES}
        t={t}
        ambient={AMBIENT_PATH}
        font={fontFamily}
      />
    </AbsoluteFill>
  );
};
