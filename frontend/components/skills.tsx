"use client";

import { useEffect, useState } from "react";

/* Shared bits of the Skill Lab pages (/crew/skills). */

export const STATUS: Record<string, { label: string; cls: string; hint: string }> = {
  idea: { label: "Idea", cls: "border border-line text-muted", hint: "being brainstormed" },
  approved: { label: "Approved", cls: "bg-[#ffd60a] text-[#141414]", hint: "the team wants it: to be built" },
  built: { label: "Built", cls: "bg-ink text-bg", hint: "the crew uses it in films" },
};

export function useAuthor(): [string, (v: string) => void] {
  const [a, setA] = useState("");
  useEffect(() => { try { setA(localStorage.getItem("skill-author") || ""); } catch {} }, []);
  return [a, (v: string) => { setA(v); try { localStorage.setItem("skill-author", v); } catch {} }];
}


const IMAGE = ["image/png", "image/jpeg", "image/webp"];
const VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

/** A pasted or dropped file gets a proper name (clipboard pictures often come as "image.png" or with none). */
const named = (f: Blob, type: string) => new File([f], `pasted-${Date.now()}.${EXT[type] ?? "png"}`, { type });

/** Add media three ways: paste it (Cmd/Ctrl+V anywhere on the page, or the Paste button), drop it, or choose a file. */
export function MediaDrop({ onFile, video = false, busy, label }: { onFile: (f: File) => void; video?: boolean; busy?: boolean; label?: string }) {
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");
  const ok = video ? [...IMAGE, ...VIDEO] : IMAGE;
  const take = (f?: File | Blob | null) => {
    if (!f) return;
    if (!ok.includes(f.type)) { setErr(video ? "That isn't a picture or video (PNG, JPG, WEBP, MP4, WEBM, MOV)." : "That isn't a picture (PNG, JPG or WEBP)."); return; }
    setErr("");
    onFile(f instanceof File && f.name && !/^image\.\w+$/.test(f.name) ? f : named(f, f.type));
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => ok.includes(x.type));
      if (f) { e.preventDefault(); take(f); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const pasteButton = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => ok.includes(t));
        if (type) return take(named(await item.getType(type), type));
      }
      setErr("Nothing to paste: copy a picture first (right-click → Copy image, or a screenshot to the clipboard).");
    } catch {
      setErr("The browser blocked reading the clipboard here: press Cmd+V (Ctrl+V on Windows) instead.");
    }
  };
  return (
    <div>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
        className={`flex flex-wrap items-center gap-3 border border-dashed px-4 py-3 text-[13px] transition-colors ${over ? "border-ink bg-[#ffd60a]/20" : "border-line"}`}>
        <span className="text-muted">{busy ? "Adding…" : label ?? `Paste (⌘V / Ctrl+V), drop ${video ? "a picture or video" : "a picture"} here, or`}</span>
        <button type="button" onClick={pasteButton} className="label h-8 border border-line px-3 hover:border-ink">Paste</button>
        <label className="label inline-flex h-8 cursor-pointer items-center border border-line px-3 hover:border-ink">
          Choose a file
          <input type="file" accept={video ? ".png,.jpg,.jpeg,.webp,.mp4,.webm,.mov" : ".png,.jpg,.jpeg,.webp"} className="hidden" onChange={(e) => take(e.target.files?.[0])} />
        </label>
      </div>
      {err && <p className="mt-1.5 text-[12.5px] text-accent">{err}</p>}
    </div>
  );
}
