"use client";

import { ArrowLeft, Clapperboard } from "lucide-react";
import Link from "next/link";
import { Button, Label, PageHeader } from "@/components/ui";

/* Every skill the documentary agent has, with a demo of each in motion. Edits are chosen one per film; the stacking skills
   sit on top of any edit. The research investigator runs for every archival documentary. */

type Skill = { n: string; name: string; kind: string; video?: string; what: string; points: string[] };

const SKILLS: Skill[] = [
  { n: "00", name: "Research investigator", kind: "Always on",
    what: "Researches like a journalist before a word is written, and shows you everything before the script.",
    points: ["Searches aimed at primary sources; your own links are read first",
             "A fact is kept only if its sentence is on the page word for word, with its numbers",
             "Investigation rounds follow leads, find the original source, get the other side of every accusation, and check whether a fact has changed since",
             "State media is used only as “X says”; a blocked page is found elsewhere, never bypassed",
             "You read the research pack and approve it before the script is written"] },
  { n: "01", name: "Collage board", kind: "Edit · the default", video: "/demos/skill-board.mp4",
    what: "The Vox paper board: facts on sticky notes, quotes typed on torn scraps, red string, real archival prints, newspaper charts.",
    points: ["About 70% collage, 20% pictures, 10% newspaper", "Each piece lands once and holds while it is read", "Every number on screen is checked against the narration"] },
  { n: "02", name: "Layered backgrounds", kind: "Edit", video: "/demos/skill-layered.mp4",
    what: "The same board, but no background is ever a flat colour.",
    points: ["Behind titles, charts and photos: a faint montage of the chapter's own pictures", "Tinted grey with lifted blacks and soft whites, then paper texture"] },
  { n: "03", name: "Build-up (word-synced)", kind: "Edit", video: "/demos/skill-build.mp4",
    what: "Every line builds its page piece by piece, each piece landing on the exact word that names it.",
    points: ["Photos, cut-outs, stamped labels and notes fly in from the edges and stay", "Word timing is read from the recorded voice", "A line can keep the previous page and add to it"] },
  { n: "04", name: "Modern look for current events", kind: "Stacks on any edit", video: "/demos/skill-era.mp4",
    what: "The film knows which lines are history and which are today, and dresses each for its time.",
    points: ["The past: black-and-white prints and old newspapers", "Today: photos turn to full colour and zoom to fill the screen", "Headlines and charts become clean, modern colour cards"] },
  { n: "05", name: "Vox motion & story", kind: "Stacks on any edit", video: "/demos/skill-vox.mp4",
    what: "The Vox recipe: the story shape, and a picture that never stops moving.",
    points: ["Hook and one central question in the first 30 seconds, a simple answer, the mechanism, why it matters now, a recap",
             "Shots flow into each other: a pan across the board or a zoom through it",
             "Collage backgrounds build themselves: each object flies in and snaps into place before the rest settles",
             "Constant drift, graphics animated “on threes”, name cards for quoted people, a marker sweep on headlines"] },
  { n: "06", name: "Vox editorial (modern + history)", kind: "Edit", video: "/demos/skill-editorial.mp4",
    what: "The modern Vox look for the present day, the paper look for history. The agent picks a layout for every frame.",
    points: ["A real person cut out of their real photo (lifted on this Mac), black and white with a yellow sticker outline, their name on a highlighter stroke",
             "Circle portraits with a year underlined in red; a portrait torn into strips that assemble",
             "Photo cards on a timeline; photos stacked with dashed guide lines; real headlines as newspaper clippings",
             "Every photo is a real, licensed Wikimedia Commons photo that Gemini checked shows the subject"] },
];

export default function Skills() {
  return (
    <>
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Studio</Link>
      <PageHeader eyebrow="06 — Studio" title="Skills" subtitle="What the documentary agent can do, each shown in motion. Pick an edit per film, then stack skills on top."
        action={<Button href="/studio/new" icon={<Clapperboard />}>New film</Button>} />
      <div className="mt-8 border-t border-line">
        {SKILLS.map((s) => (
          <section key={s.n} className="grid gap-6 border-b border-line py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <Label n={s.n} className="text-ink">{s.name}</Label>
              <span className="label mt-3 block text-accent">{s.kind}</span>
              <p className="mt-4 text-[15px] leading-relaxed text-ink">{s.what}</p>
              <ul className="mt-4 space-y-2">
                {s.points.map((p) => <li key={p} className="border-l border-line pl-3 text-[14px] leading-relaxed text-muted">{p}</li>)}
              </ul>
            </div>
            {s.video ? (
              <video src={s.video} controls muted loop playsInline preload="metadata" className="aspect-video w-full border border-line bg-black" />
            ) : (
              <div className="grid aspect-video w-full place-items-center border border-line bg-surface p-8 text-center">
                <p className="max-w-md text-[14px] leading-relaxed text-muted">Open any archival film in the Studio: its Research panel shows every lead the investigator followed, every quote word for word, and every source.</p>
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
