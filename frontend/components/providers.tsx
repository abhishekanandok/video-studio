"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, RotateCcw, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { api, post, refreshAll, timeAgo } from "@/lib/api";
import { cx } from "./ui";

/* ================= Toasts ================= */
type Toast = { id: number; tone: "good" | "bad" | "info"; title: string; body?: string; action?: { label: string; onClick: () => void } };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

function ToastHost({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-surface/95 p-3.5 shadow-2xl backdrop-blur"
          >
            {t.tone === "good" ? <CheckCircle2 className="mt-0.5 size-5 text-good" /> : t.tone === "bad" ? <AlertTriangle className="mt-0.5 size-5 text-bad" /> : <Loader2 className="mt-0.5 size-5 animate-spin text-accent" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t.title}</div>
              {t.body && <div className="mt-0.5 text-[13px] text-muted">{t.body}</div>}
              {t.action && (
                <button className="mt-2 text-[13px] font-medium text-accent hover:underline" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>
                  {t.action.label}
                </button>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ================= Background tasks ================= */
type Job = { id: string; label: string; status: string; progress: { at: string; msg: string }[]; error: string; friendly_error: string; created_at: string; result: any };
const TasksCtx = createContext<{ jobs: Job[]; track: () => void }>({ jobs: [], track: () => {} });
export const useTasks = () => useContext(TasksCtx);

function useJobPolling(toast: (t: Omit<Toast, "id">) => void) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const seen = useRef<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    let active = false;
    try {
      const list = await api<Job[]>("/jobs?limit=15");
      setJobs(list);
      let finished = false;
      for (const j of list) {
        const prev = seen.current[j.id];
        if (prev && prev !== j.status) {
          if (j.status === "done") {
            finished = true;
            toast({ tone: "good", title: `${j.label} · done`, body: j.progress.at(-1)?.msg });
          } else if (j.status === "failed") {
            toast({ tone: "bad", title: `${j.label} stopped`, body: `${j.friendly_error || "Something went wrong."} Progress is saved, so Resume continues from there.`, action: { label: "Resume", onClick: () => post(`/jobs/${j.id}/resume`).then(poll) } });
          }
        }
        seen.current[j.id] = j.status;
        if (j.status === "running" || j.status === "queued") active = true;
      }
      if (finished) refreshAll();
    } catch {}
    timer.current = setTimeout(poll, active ? 2500 : 15000);
  }, [toast]);

  useEffect(() => {
    poll();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);
  return { jobs, track: poll };
}

function TaskTray({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState(false);
  const running = jobs.filter((j) => j.status === "running" || j.status === "queued");
  const failed = jobs.filter((j) => j.status === "failed");
  const visible = running.length > 0 || failed.length > 0;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 right-4 lg:bottom-5 lg:right-5 z-40 w-[min(360px,calc(100vw-2rem))]"
        >
          <div className="overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-2xl backdrop-blur">
            <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              {running.length ? <Loader2 className="size-4 animate-spin text-accent" /> : <AlertTriangle className="size-4 text-bad" />}
              <span className="flex-1 text-sm font-medium">
                {running.length ? `Agent is working on ${running.length} task${running.length > 1 ? "s" : ""}` : `${failed.length} task${failed.length > 1 ? "s need" : " needs"} a nudge`}
              </span>
              <ChevronDown className={cx("size-4 text-muted transition-transform", open && "rotate-180")} />
            </button>
            {running[0] && !open && <div className="-mt-1 truncate px-4 pb-3 pl-11 text-[12.5px] text-muted">{running[0].progress.at(-1)?.msg ?? running[0].label}</div>}
            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="max-h-80 space-y-1 overflow-y-auto border-t border-line p-2">
                    {[...running, ...failed].map((j) => (
                      <div key={j.id} className="rounded-xl px-3 py-2.5 hover:bg-surface-2">
                        <div className="flex items-center gap-2 text-[13px] font-medium">
                          <span className="flex-1 truncate">{j.label}</span>
                          {j.status === "failed" ? (
                            <button className="inline-flex items-center gap-1 text-accent hover:underline" onClick={() => post(`/jobs/${j.id}/resume`)}>
                              <RotateCcw className="size-3" /> Resume
                            </button>
                          ) : (
                            <span className="text-muted">{timeAgo(j.created_at)}</span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-muted">{j.status === "failed" ? j.friendly_error || j.error : j.progress.at(-1)?.msg ?? "Starting…"}</div>
                        {j.status !== "failed" && (
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                            <div className="h-full w-1/3 animate-[indeterminate_1.3s_ease-in-out_infinite] rounded-full bg-accent" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= Add material sheet (open from anywhere) ================= */
export type AddTab = "papers" | "links" | "syllabus";
const AddCtx = createContext<{ openAdd: (tab?: AddTab, opts?: { examId?: number; subjectId?: number }) => void; state: { open: boolean; tab: AddTab; examId?: number; subjectId?: number }; close: () => void }>({
  openAdd: () => {},
  state: { open: false, tab: "papers" },
  close: () => {},
});
export const useAdd = () => useContext(AddCtx);

/* ================= Theme ================= */
const ThemeCtx = createContext<{ theme: "light" | "dark" | "system"; setTheme: (t: "light" | "dark" | "system") => void }>({ theme: "system", setTheme: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function Providers({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.action ? 9000 : 4500);
  }, []);
  const dismiss = (id: number) => setToasts((x) => x.filter((y) => y.id !== id));
  const { jobs, track } = useJobPolling(toast);

  const [add, setAdd] = useState<{ open: boolean; tab: AddTab; examId?: number; subjectId?: number }>({ open: false, tab: "papers" });
  const openAdd = useCallback((tab: AddTab = "papers", opts?: { examId?: number; subjectId?: number }) => setAdd({ open: true, tab, ...opts }), []);
  const closeAdd = useCallback(() => setAdd((a) => ({ ...a, open: false })), []);

  const [theme, setThemeState] = useState<"light" | "dark" | "system">("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem("theme") as any;
      if (t) setThemeState(t);
    } catch {}
  }, []);
  const setTheme = (t: "light" | "dark" | "system") => {
    setThemeState(t);
    try {
      localStorage.setItem("theme", t);
    } catch {}
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  };

  return (
    <SWRConfig value={{ onError: () => {} }}>
      <MotionConfig reducedMotion="user">
      <ThemeCtx.Provider value={{ theme, setTheme }}>
        <ToastCtx.Provider value={toast}>
          <TasksCtx.Provider value={{ jobs, track }}>
            <AddCtx.Provider value={{ openAdd, state: add, close: closeAdd }}>
              {children}
              <TaskTray jobs={jobs} />
              <ToastHost toasts={toasts} dismiss={dismiss} />
            </AddCtx.Provider>
          </TasksCtx.Provider>
        </ToastCtx.Provider>
      </ThemeCtx.Provider>
      </MotionConfig>
    </SWRConfig>
  );
}
