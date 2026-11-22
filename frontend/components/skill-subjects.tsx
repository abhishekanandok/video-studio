"use client";

import { useEffect, useState } from "react";
import { Button, inputCls } from "@/components/ui";
import { post, useApi } from "@/lib/api";

export function skillSubject(skill: any): string {
  return skill.collection_subject || "Physics";
}

export function useSkillSubject() {
  const [subject, setSubject] = useState("Physics");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("subject");
    if (requested) setSubject(requested);
  }, []);
  return [subject, setSubject] as const;
}

export function SubjectPicker({ subject, onChange }: { subject: string; onChange: (subject: string) => void }) {
  const { data: subjects, error, mutate } = useApi<string[]>("/slide-skill-subjects");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const create = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await post<{ name: string }>("/slide-skill-subjects", { name });
      await mutate();
      onChange(result.name);
      setAdding(false);
      setName("");
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-48 flex-1 space-y-2">
        <span className="label text-ink">Subject</span>
        <select aria-label="Skill subject" value={subject} onChange={(e) => onChange(e.target.value)} className={inputCls} disabled={!subjects}>
          {(subjects ?? [subject]).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <Button variant="secondary" onClick={() => setAdding(!adding)}>Create subject</Button>
    </div>
    {adding && <div className="flex flex-wrap items-center gap-3">
      <input aria-label="New subject name" autoFocus value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && !busy) { e.preventDefault(); create(); } }}
        maxLength={80} className={`${inputCls} flex-1`} placeholder="e.g. Chemistry, Biology, History" />
      <Button loading={busy} disabled={!name.trim()} onClick={create}>Add subject</Button>
    </div>}
    {(message || error) && <p role="alert" className="text-sm text-red-700">{message || error.message}</p>}
  </div>;
}
