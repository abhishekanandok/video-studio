# Making films: the guide

Everything someone new needs to plan, build and extend Drishyya films without asking. Setup and ports are in the
[README](../README.md#run); this page starts once the backend (:8020) and the app (:3030) are running.

## 1. Plan a film (the app)

Open **Motion** (`/app/motion`). Write the topic and your notes, then fill the **film brief**:

| Part | What you choose |
|---|---|
| The film | Documentary, Explainer, Story film, or Fiction; the pace (natural, 1.15×, 1.25×); the length in minutes (up to 30) |
| Tone | Any of the presets, plus your own words |
| Cold open, chapters | Cold open on or off, 3D cinematic or drawn; chapters auto or a set number; a hand-off line at each chapter end |
| Cinematic shots | How many 3D shots (0 to 20), made like the cold open |
| Music and sound | The style, the moments it plays (cold open, chapter titles, big numbers...), and how loud |
| Real world | Real maps, credited photos, logos when a company is named; a second voice (Hinglish or English dub) |
| Transitions | Auto, or pick from the 100 (hover a tile to preview it) |

Then **pick the look** (every family in `video/looks.py`, previewed live) and press **Plan it**. The brief is kept in
the film's `video/public/oneshot/<slug>/job.json` under `"brief"` (cleaned by `backend/app/api/films_api.py clean_brief`).
Your films are under **Your films** on the same page, or on their own page at `/app/motion/films`.

## 2. Build a film the way THE LAST CALL was built

THE LAST CALL is the reference documentary (its own files stay with the creator, not in git): eight chapters, each
ending on the question the next one answers; a 3D cold open; three cinematic shots; real maps, photos and logos;
1.15× pace; English and Hinglish. The brief's defaults are this recipe.

- The order it was made in: script, voice, word timing, render, score, assemble, subtitles.
- Editing: one camera glide and one transition per beat; no punch-in cuts; text never blinks.
- Drawing a waiting film with Claude Code: say `draw film <slug>` (the `draw-film` skill in `.claude/skills/`); it reads
  the film's `job.json`, brief included.

## 3. Extend the system

**A transition.** Add it to `video/src/argon/transitions.ts` (a family entry: id, name, frames, and its style at progress
`e`), then run `node transitions-sync.mjs` in `video/` so the app's picker gets it. Any id in the catalogue works
wherever a transition name is accepted (`<Transition kind="iris-from-top-left">`).

**A look.** Add the family to `video/looks.py`, render its preview and clip into `frontend/public/looks/<id>.jpg`,
`<id>.mp4` (and `<id>-show.mp4` for its showcase), and commit them so others see it after a pull.

**A cinematic shot.** Write it as a component in the film's `cine.tsx` (a `ThreeCanvas` world, a camera rig that reads
the time, grain and a vignette over it), like the cold open. A shot that
proves itself moves into a shared library so the next film can use it.

**A library piece** (people, creatures, vehicles, props): look in `video/src/argon/lib/catalog.ts` before drawing
anything new; mark new drawings `/** NEW PIECE: what it is */` so the library grows from them.

**Music cues.** The score is written in code: stings on big numbers, a rise
into each chapter title, a whoosh on cinematic snaps, a pad under the closing question.

## 4. Before publishing

- Check every number against a source; put the sources and each photo's credit and licence in the description.
- Subtitles with timing, from the voice's word times.
- A second-language voice goes in YouTube Studio under **Languages → Add language → Dub**, not under Subtitles.

## 5. What is in git, and what is not

In git: all code (the pipeline, the app, the backend), the motion library, the look previews (`frontend/public/looks/`)
and the library previews (`frontend/public/library/`). Not in git: any one film's own files (its generated code in
`video/src/oneshot/gen/`, its scripts in `video/oneshot/`), renders (`video/out/`), voice clips, `.env` and anything
under `secrets/`.
