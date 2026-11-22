"use client";

import { BarChart3, Clapperboard, Film, Home, IndianRupee, Plus, Settings, Sparkles, Shapes } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

/* Drishyya's product app, in the landing page's theme: off-white paper, ink, one lime, Baloo, soft white cards.
   Everything here is a front-end prototype on sample data. */

export const INK = "#1f1c1b", LIME = "#a6f04a", PAPER = "#f3f3f0", MUTED = "#8a857f", LINE = "#e6e6df";
export const ease = [0.22, 1, 0.36, 1] as const;
export const LIME_TEXT = { backgroundImage: "linear-gradient(90deg,#3f7d1e,#6fbf2a 55%,#a6f04a)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } as CSSProperties;
export const FONT = { fontFamily: "var(--font-baloo), system-ui, sans-serif" } as CSSProperties;
export const WASH = "radial-gradient(60% 50% at 85% 0%, rgba(166,240,74,0.18), transparent 60%), radial-gradient(50% 45% at 0% 100%, rgba(243,247,154,0.42), transparent 60%), #f3f3f0";

const NAV = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/videos", label: "My videos", icon: Film },
  { href: "/app/motion", label: "Motion", icon: Clapperboard },
  { href: "/app/library", label: "Library", icon: Shapes },
  { href: "/app/skills", label: "Skills", icon: Sparkles },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/billing", label: "Billing", icon: IndianRupee },
];

export function Mark({ size = 34 }: { size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full border border-[#e6e6df] bg-white" style={{ width: size, height: size }}><img src="/icon.svg" alt="" style={{ width: size * 0.62 }} /></span>;
}

/** the app frame: a slim left sidebar (icons + labels), the page to its right; a top bar on phones */
export function AppFrame({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  const path = usePathname();
  const on = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <div className="dr-app min-h-dvh text-[#1f1c1b] md:flex" style={{ ...FONT, background: WASH }}>
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-[#e6e6df] bg-[#f7f7f3]/90 px-3.5 py-5 md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-1.5">
          <img src="/icon.svg" alt="" className="size-8" />
          <span className="text-[21px] font-bold tracking-[-0.02em]">Drishyya</span>
        </Link>
        <Link href="/app" className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[#1f1c1b] px-4 py-2.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-px">
          <span className="grid size-5 place-items-center rounded-full bg-[#a6f04a] text-[#1f1c1b]"><Plus className="size-3.5" strokeWidth={3} /></span>New video
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: I, exact }) => (
            <Link key={href} href={href} className={`relative flex items-center gap-3 rounded-[12px] px-3 py-2 text-[15px] font-medium transition-colors ${on(href, exact) ? "text-[#1f1c1b]" : "text-[#5f5b57] hover:bg-black/[0.04] hover:text-[#1f1c1b]"}`}>
              {on(href, exact) && <motion.span layoutId="app-nav" className="absolute inset-0 rounded-[12px] bg-[#a6f04a]/35" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <I className="relative size-[18px]" /><span className="relative">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-[18px] border border-[#e6e6df] bg-white p-3.5">
          <div className="text-[13px] font-semibold">₹199 per video</div>
          <div className="text-[12.5px] leading-snug text-[#8a857f]">Pay by UPI when it's ready. No subscription.</div>
        </div>
        <div className="mt-3 flex items-center gap-2.5 px-1.5">
          <span className="grid size-8 place-items-center rounded-full bg-[#1f1c1b] text-[13px] font-bold text-[#a6f04a]">R</span>
          <span className="text-[14px] font-medium">My studio</span>
          <Settings className="ml-auto size-4 text-[#8a857f]" />
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#e6e6df] bg-[#f7f7f3]/95 px-4 py-2.5 md:hidden">
        <Link href="/" className="flex items-center gap-2"><img src="/icon.svg" alt="" className="size-7" /><span className="text-[18px] font-bold">Drishyya</span></Link>
        <nav className="ml-auto flex gap-1">
          {NAV.map(({ href, label, icon: I, exact }) => (
            <Link key={href} href={href} aria-label={label} className={`grid size-9 place-items-center rounded-full ${on(href, exact) ? "bg-[#a6f04a]/45" : "text-[#5f5b57]"}`}><I className="size-[18px]" /></Link>
          ))}
        </nav>
      </header>
      <main className={`min-w-0 flex-1 ${bleed ? "" : "px-5 py-8 md:px-10"}`}>{children}</main>
    </div>
  );
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`rounded-[22px] border border-[#e6e6df] bg-white shadow-[0_14px_34px_-26px_rgb(0_0_0/0.35)] ${className}`} style={style}>{children}</div>;
}

export function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "lime" | "ink" | "warn" }) {
  const t = { plain: "bg-[#f1f0ea] text-[#5f5b57]", lime: "bg-[#a6f04a]/40 text-[#2f5a12]", ink: "bg-[#1f1c1b] text-white", warn: "bg-[#ffe7c7] text-[#9a5a12]" }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${t}`}>{children}</span>;
}

export function PageTitle({ title, accent, sub, right }: { title: string; accent?: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] sm:text-[40px]">{title} {accent && <span style={LIME_TEXT}>{accent}</span>}</h1>
        {sub && <p className="mt-2 text-[16px] text-[#5f5b57]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function DarkButton({ children, onClick, href, disabled }: { children: ReactNode; onClick?: () => void; href?: string; disabled?: boolean }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-transform ${disabled ? "pointer-events-none bg-[#ecebe5] text-[#a29d96]" : "bg-[#1f1c1b] text-white hover:-translate-y-px"}`;
  return href ? <Link href={href} className={cls}>{children}</Link> : <button type="button" onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function LimeButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#1f1c1b] bg-[#a6f04a] px-5 py-2 text-[15px] font-bold text-[#1f1c1b] shadow-[3px_3px_0_#1f1c1b] transition-transform hover:-translate-y-px">{children}</button>;
}
