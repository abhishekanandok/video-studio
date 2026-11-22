"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { forwardRef, useEffect, type ComponentProps, type ReactNode } from "react";
import { X } from "lucide-react";

export const cx = clsx;

/* ---------- Button ---------- */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-bg border border-ink hover:bg-accent hover:border-accent hover:text-white",
  secondary: "border border-line text-ink hover:border-ink hover:text-accent",
  ghost: "text-muted hover:text-accent",
  danger: "border border-accent/50 text-accent hover:bg-accent hover:text-white",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 gap-1.5 [&_svg]:size-3.5",
  md: "h-10 px-4 gap-2 [&_svg]:size-3.5",
  lg: "h-12 px-5 gap-2.5 [&_svg]:size-4",
};

type ButtonProps = { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; href?: string } & ComponentProps<"button">;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, href, className, children, disabled, ...rest },
  ref,
) {
  const cls = cx(
    "label inline-flex items-center justify-center whitespace-nowrap transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none select-none",
    variants[variant],
    sizes[size],
    className,
  );
  const inner = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {inner}
    </button>
  );
});

/* ---------- Card ---------- */
export function Card({ className, interactive, children, ...rest }: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cx(
        "border border-line bg-surface",
        interactive && "cursor-pointer transition-colors duration-200 hover:border-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** The portfolio's "mounted print": panel, inset mat frame, dotted field, ghost numeral, red rule. */
export function Plate({ className, ghost, children }: { className?: string; ghost?: ReactNode; children: ReactNode }) {
  return (
    <div className={cx("relative overflow-hidden border border-line bg-surface-2", className)}>
      <div className="pointer-events-none absolute inset-2.5 border border-line/70 sm:inset-3" />
      <div className="dot-field pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-60" />
      {ghost != null && (
        <span aria-hidden className="pointer-events-none absolute -bottom-10 -right-3 select-none font-display text-[11rem] font-medium leading-none tracking-tighter text-ink/[0.045] sm:-bottom-16 sm:text-[15rem]">
          {ghost}
        </span>
      )}
      <span className="absolute left-0 top-0 h-full w-[3px] bg-accent" />
      <div className="relative z-10 p-7 sm:p-10">{children}</div>
    </div>
  );
}

/** Mono micro-label. `n` prefixes an index like "01 —". */
export function Label({ n, className, children }: { n?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <span className={cx("label", className)}>
      {n != null && <span className="text-accent">{n}&nbsp;&nbsp;—&nbsp;&nbsp;</span>}
      {children}
    </span>
  );
}

export function CardHeader({ title, icon, action, subtitle }: { title: ReactNode; icon?: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <h2 className="label flex items-center gap-2 text-ink">
          {icon && <span className="text-muted [&>svg]:size-3.5">{icon}</span>}
          {title}
        </h2>
        {subtitle && <p className="text-sm text-muted mt-1.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
type Tone = "neutral" | "accent" | "good" | "bad" | "warn";
const tones: Record<Tone, string> = {
  neutral: "text-muted border-line",
  accent: "text-accent border-accent/40",
  good: "text-ink border-line-strong",
  bad: "text-accent border-accent/40",
  warn: "text-muted border-line-strong",
};
export function Badge({ tone = "neutral", className, children, icon }: { tone?: Tone; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cx("label inline-flex items-center gap-1.5 border px-2 py-1 !text-[0.62rem] leading-none [&>svg]:size-3", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export const statusTone = (s?: string): Tone => (s === "strong" ? "good" : s === "weak" ? "bad" : s === "okay" ? "warn" : "neutral");
export const accuracyTone = (a: number): Tone => (a >= 80 ? "good" : a >= 60 ? "warn" : "bad");

/* ---------- Progress ---------- */
export function Bar({ value, tone = "accent", className }: { value: number; tone?: Tone; className?: string }) {
  const color = { accent: "var(--accent)", good: "var(--good)", bad: "var(--bad)", warn: "var(--warn)", neutral: "var(--muted)" }[tone];
  return (
    <div className={cx("h-1 w-full overflow-hidden bg-surface-3", className)}>
      <motion.div
        className="h-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function Ring({ value, size = 56, stroke = 6, tone = "accent", children }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = { accent: "var(--accent)", good: "var(--good)", bad: "var(--bad)", warn: "var(--warn)", neutral: "var(--muted)" }[tone];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="butt"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value)) / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-[11px]">{children}</div>
    </div>
  );
}

/* ---------- Skeleton / Empty / Page ---------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx("relative overflow-hidden rounded-xl bg-surface-2", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-[var(--line)] to-transparent" />
    </div>
  );
}

export function Empty({ icon, title, body, action, className }: { icon: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center text-center px-6 py-10", className)}>
      <div className="grid size-12 place-items-center border border-line text-accent [&>svg]:size-5 mb-5">{icon}</div>
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="min-w-0">
          {eyebrow && <div className="label mb-4 text-muted">{eyebrow}</div>}
          <h1 className="font-display text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {action && <div className="flex gap-2">{action}</div>}
      </div>
      <div className="rule-double" />
    </div>
  );
}

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } } }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Tabs (animated pill) ---------- */
export function Tabs<T extends string>({ tabs, value, onChange, id }: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="inline-flex gap-6 border-b border-line">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)} className={cx("label relative h-9 transition-colors", value === t.value ? "text-ink" : "text-muted hover:text-ink")}>
          {value === t.value && <motion.span layoutId={`tab-${id}`} className="absolute inset-x-0 -bottom-px h-px bg-accent" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />}
          <span className="relative">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Sheet (modal) ---------- */
export function Sheet({ open, onClose, title, subtitle, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            className={cx("relative w-full max-h-[92dvh] overflow-y-auto border border-line bg-bg shadow-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-xl")}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-bg/90 backdrop-blur px-6 pt-5 pb-4 border-b border-line">
              <div>
                <h2 className="text-xl font-medium tracking-tight">{title}</h2>
                {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Form bits ---------- */
export const inputCls =
  "w-full border border-line bg-transparent px-3.5 py-2.5 text-sm placeholder:text-muted outline-none transition-colors focus:border-ink";

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid min-w-5 h-5 place-items-center border border-line px-1 font-mono text-[10px] text-muted">{children}</kbd>;
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "label inline-flex items-center gap-1.5 border px-3 h-8 transition-colors",
        active ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
