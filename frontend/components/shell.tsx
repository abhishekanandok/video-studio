"use client";

import { ArrowUpRight, AudioLines, Clapperboard, Film, FlaskConical, Monitor, Moon, NotebookText, Plus, Sparkles, Sun, Users, BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useTheme } from "./providers";
import { cx } from "./ui";

type NavItem = { href: string; label: string; icon: typeof Film; exact?: boolean };
type Section = { brand: string; tagline: string; home: string; strip: boolean; nav: NavItem[] };

/** Two sections with their own navigation: the documentary Studio, and Exam notes (text-slide films for government
 *  exams), which is kept visibly different so the two never blur together. */
const STUDIO: Section = {
  brand: "Drishyya", tagline: "your idea, our visuals", home: "/studio", strip: false,
  nav: [
    { href: "/studio", label: "My videos", icon: Film, exact: true },
    { href: "/studio/new", label: "New video", icon: Plus },
    { href: "/studio/cinema", label: "Cinema", icon: Clapperboard },
    { href: "/studio/skills", label: "Skills", icon: Sparkles },
    { href: "/exam", label: "Exam notes", icon: NotebookText },
  ],
};
const EXAM: Section = {
  brand: "Exam Notes", tagline: "notes films for government exams", home: "/exam", strip: true,
  nav: [
    { href: "/exam", label: "Notes films", icon: NotebookText, exact: true },
    { href: "/exam/new", label: "New notes film", icon: Plus },
    { href: "/crew", label: "Crew films", icon: Users, exact: true },
    { href: "/audio", label: "Audio films", icon: AudioLines },
    { href: "/skills", label: "Skill Tab", icon: FlaskConical },
    { href: "/rules", label: "Picture rules", icon: BookOpenCheck },
    { href: "/studio", label: "Studio", icon: ArrowUpRight },
  ],
};

function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const opts = [{ v: "light", icon: Sun }, { v: "system", icon: Monitor }, { v: "dark", icon: Moon }] as const;
  return (
    <div className="flex overflow-hidden rounded-full border border-[#e2e1da] bg-white">
      {opts.map(({ v, icon: I }) => (
        <button key={v} onClick={() => setTheme(v)} aria-label={`${v} theme`}
                className={cx("grid h-8 w-8 place-items-center transition-colors", theme === v ? "bg-[#1f1c1b] text-white" : "text-[#8a857f] hover:text-[#1f1c1b]")}>
          <I className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

/** the app's frame: a left sidebar in Drishyya's look (Baloo, ink and lime), the page to its right. On phones the
 *  sidebar folds into a top bar. The landing page brings its own navigation; the new-video chat uses the full width. */
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const sec = path.startsWith("/exam") || path.startsWith("/crew") || path.startsWith("/audio") || path.startsWith("/skills") ? EXAM : STUDIO;
  const on = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
  if (path === "/" || path === "/app" || path.startsWith("/app/")) return <>{children}</>; // the landing page and the product app bring their own frame
  const full = path === "/studio/new";
  const font = { fontFamily: "var(--font-baloo), system-ui, sans-serif" };
  const brand = (
    <Link href="/" className="flex items-center gap-2.5">
      <img src="/icon.svg" alt="" className="size-8" />
      <span className="text-[21px] font-bold tracking-[-0.02em] text-[#1f1c1b]">Drishyya</span>
    </Link>
  );
  const items = sec.nav.filter((n) => !n.href.endsWith("/new"));
  const newHref = sec === EXAM ? "/exam/new" : "/studio/new";
  return (
    <div className="min-h-dvh bg-bg text-ink md:flex">
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-[#e6e6df] bg-[#f6f6f2] px-4 py-5 md:flex" style={font}>
        {brand}
        {sec.strip && <span className="mt-3 w-fit rounded-full bg-[#ffd60a] px-2.5 py-0.5 text-[12px] font-semibold text-[#141414]">{sec.brand}</span>}
        <Link href={newHref} className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[#1f1c1b] px-4 py-2.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-px">
          <span className="grid size-5 place-items-center rounded-full bg-[#a6f04a] text-[#1f1c1b]"><Plus className="size-3.5" strokeWidth={3} /></span>
          New video
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {items.map(({ href, label, icon: I, exact }) => (
            <Link key={href} href={href}
                  className={cx("flex items-center gap-3 rounded-[12px] px-3 py-2 text-[15px] font-medium transition-colors",
                                on(href, exact) ? "bg-[#a6f04a]/35 text-[#1f1c1b]" : "text-[#5f5b57] hover:bg-black/[0.04] hover:text-[#1f1c1b]")}>
              <I className="size-[18px]" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-[12px] text-[#8a857f]">{sec.tagline}</span>
          <ThemeSwitch />
        </div>
      </aside>
      {/* phones: a compact top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 overflow-x-auto border-b border-[#e6e6df] bg-[#f6f6f2] px-4 py-2.5 md:hidden" style={font}>
        {brand}
        <nav className="ml-auto flex items-center gap-1">
          {sec.nav.map(({ href, label, icon: I, exact }) => (
            <Link key={href} href={href} aria-label={label}
                  className={cx("grid size-9 place-items-center rounded-full", on(href, exact) ? "bg-[#a6f04a]/45 text-[#1f1c1b]" : "text-[#5f5b57]")}>
              <I className="size-[18px]" />
            </Link>
          ))}
        </nav>
      </header>
      <main className={cx("min-w-0 flex-1", full ? "" : "mx-auto max-w-6xl px-4 py-8")}>{children}</main>
    </div>
  );
}
