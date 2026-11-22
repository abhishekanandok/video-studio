"use client";

import type { CSSProperties } from "react";

/* The sky behind the hero (and, hazy, the footer): the reference's teal sky with soft 3D clouds drifting along the
   horizon and a meadow at the bottom. The product itself is drawn on top of it (hero-cards.tsx). */

function Cloud({ x, y, s, dur, delay, o = 1 }: { x: number; y: number; s: number; dur: number; delay: number; o?: number }) {
  return (
    <g className="lp-cloudx" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s`, opacity: o }}>
      <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#sc-soft)">
        <ellipse cx="0" cy="22" rx="118" ry="26" fill="url(#sc-cloud-base)" />
        <circle cx="-60" cy="4" r="40" fill="url(#sc-cloud)" />
        <circle cx="-8" cy="-22" r="56" fill="url(#sc-cloud)" />
        <circle cx="52" cy="-6" r="46" fill="url(#sc-cloud)" />
        <circle cx="92" cy="12" r="30" fill="url(#sc-cloud)" />
        <ellipse cx="6" cy="30" rx="112" ry="14" fill="#b9d4d2" opacity="0.55" />
      </g>
    </g>
  );
}

export function HeroScene({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 1000 656" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="sc-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3d7a78" /><stop offset="0.45" stopColor="#5c9893" /><stop offset="0.72" stopColor="#8fbdb3" /><stop offset="0.9" stopColor="#c4ddd0" />
        </linearGradient>
        <radialGradient id="sc-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff8d6" stopOpacity="0.8" /><stop offset="1" stopColor="#fff8d6" stopOpacity="0" /></radialGradient>
        <radialGradient id="sc-cloud" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stopColor="#ffffff" /><stop offset="0.7" stopColor="#f1f7f7" /><stop offset="1" stopColor="#d3e5e4" /></radialGradient>
        <linearGradient id="sc-cloud-base" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f4f9f9" /><stop offset="1" stopColor="#c9dddc" /></linearGradient>
        <linearGradient id="sc-grass" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8fcf5c" /><stop offset="1" stopColor="#3f7d24" /></linearGradient>
        <filter id="sc-soft" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#1e4a48" floodOpacity="0.22" /></filter>
      </defs>
      <rect width="1000" height="656" fill="url(#sc-sky)" />
      <circle cx="760" cy="200" r="260" fill="url(#sc-sun)" />
      <Cloud x={160} y={560} s={1.1} dur={120} delay={-30} o={0.95} />
      <Cloud x={520} y={545} s={0.8} dur={95} delay={-60} o={0.9} />
      <Cloud x={820} y={570} s={1.25} dur={140} delay={-100} />
      <path d="M0 615 C200 598 380 604 520 610 C700 618 850 600 1000 604 V656 H0Z" fill="url(#sc-grass)" />
      <path d="M0 615 C200 598 380 604 520 610 C700 618 850 600 1000 604" stroke="#b6ec7e" strokeWidth="3" fill="none" opacity="0.7" />
    </svg>
  );
}
