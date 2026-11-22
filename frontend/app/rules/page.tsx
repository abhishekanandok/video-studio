"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Offline } from "@/components/offline";
import { useToast } from "@/components/providers";
import { MEDIA } from "@/components/studio";
import { Button, Skeleton, cx, inputCls } from "@/components/ui";
import { api, useApi } from "@/lib/api";

type Rules = {
  type: string; rules: string[]; refs: { url: string; note: string; at: number }[];
  examples: { url: string; prompt: string; at: number }[];
  history: { at: number; note: string; lesson: string; before: string[]; after: string[] }[];
};
const when = (t: number) => new Date(t * 1000).toLocaleString();

/** What the agent learned from your picture corrections, by type of picture. Every later picture of that type, in every
 *  film, follows these rules. */
export default function PictureRules() {
  const { data, error, mutate } = useApi<{ types: string[]; rules: Rules[] }>("/picture-rules");
  if (error) return <Offline message={error.message} />;
  if (!data) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64" /></div>;
  return (
    <div className="space-y-8 pb-24">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Picture rules</h1>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          What the agent learned from your corrections at the picture check. When you redraw a picture and say what was wrong (or
          add a reference image), it writes a rule for that type of picture. Every later picture of that type, in every film,
          follows them. Approved pictures are kept as examples.
        </p>
      </div>
      {data.rules.length === 0 && (
        <p className="border border-dashed border-line px-5 py-8 text-[14px] text-muted">
          Nothing learned yet. At a film&apos;s picture check, redraw a wrong picture and write what is wrong: the rule appears here.
        </p>
      )}
      {data.rules.map((r) => <TypeRules key={r.type} r={r} onSaved={mutate} />)}
    </div>
  );
}

function TypeRules({ r, onSaved }: { r: Rules; onSaved: () => void }) {
  const [rules, setRules] = useState(r.rules);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => setRules(r.rules), [r.rules]);
  const dirty = JSON.stringify(rules) !== JSON.stringify(r.rules);
  const save = async () => {
    setBusy(true);
    try {
      await api(`/picture-rules/${r.type}`, { method: "PUT", body: JSON.stringify({ rules }) });
      toast({ tone: "good", title: `Rules for ${r.type} pictures saved` });
      onSaved();
    } catch (e: any) {
      toast({ tone: "bad", title: "Couldn't save", body: e.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="flex items-end justify-between border-b border-ink pb-2">
        <h2 className="text-2xl font-medium capitalize">{r.type}</h2>
        <span className="label text-muted">{r.rules.length} rules · {r.history.length} corrections · {r.examples.length} approved examples</span>
      </div>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2">
          {rules.map((x, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-3 size-2.5 flex-none rounded-full bg-[#ffd60a]" />
              <textarea value={x} rows={2} onChange={(e) => setRules(rules.map((y, j) => (j === i ? e.target.value : y)))}
                className={cx(inputCls, "min-h-0 flex-1 resize-y text-[14px]")} />
              <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="mt-2 text-muted hover:text-accent" aria-label="Remove rule">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setRules([...rules, ""])}>Add a rule</Button>
            {dirty && <Button size="sm" icon={<Save />} loading={busy} onClick={save}>Save rules</Button>}
          </div>
          {r.history.length > 0 && (
            <details className="pt-3 text-[13px]">
              <summary className="cursor-pointer text-muted">What it learned, correction by correction</summary>
              <div className="mt-3 space-y-3">
                {r.history.map((h, i) => (
                  <div key={i} className="border-l-2 border-line pl-3">
                    <div className="label text-muted">{when(h.at)}</div>
                    {h.note && <div className="mt-1">You said: <span className="italic">{h.note}</span></div>}
                    {h.lesson && <div className="mt-1 text-muted">Learned: {h.lesson}</div>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
        <div className="space-y-4">
          {r.refs.length > 0 && (
            <div>
              <div className="label text-muted">Your reference images</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {r.refs.map((x, i) => <img key={i} src={`${MEDIA}${x.url}`} alt="" title={x.note} className="aspect-[4/3] w-full border border-line object-cover" />)}
              </div>
            </div>
          )}
          {r.examples.length > 0 && (
            <div>
              <div className="label text-muted">Approved {r.type} pictures</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {r.examples.map((x, i) => <img key={i} src={`${MEDIA}${x.url}`} alt="" title={x.prompt} className="aspect-[4/3] w-full border border-line object-cover" />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
