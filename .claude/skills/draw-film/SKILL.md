---
name: draw-film
description: Draw a waiting film in Claude Code (the creator chose "Draw with Claude Code" in the app). Use when Raushan says "draw film <slug>".
---

The film's plan, voice and storyboard were made by Gemini; the film waits in the app as "Waiting for Claude Code"
(public/oneshot/<slug>/handoff.json). You draw every scene; the pipeline sets them on the look's sheets and renders
with no model call. No Gemini API call anywhere in these steps.

Folders: `F = video/public/oneshot/<slug>/`, `G = video/src/oneshot/gen/<slug>/`.

1. **Read the film**: `F/plan.json` (title, `lines`, `dna`: the look, its inks, paper and `pen`), `F/voice.json` (each
   line's `seconds` and word times `words: [{w, s, e}]`), `F/storyboard.json` (each card's design: idea, actors, moves).
   `video/looks.py`: the look family's `art` and `world(fam)` (whose people, dress and places to draw).
2. **The contract**: write `G/film.tsx` exporting `MOTION: Record<number, React.FC>`, one drawing per scene (1-based).
   Each scene reads its time with `useCurrentFrame() / 30` (seconds into that scene) and moves things when their words
   are said. `G/scenes.tsx` (built by the pipeline) plays `MOTION[n]` on the look's sheet; a scene left out plays its
   printed spread. Shared pieces go in `G/cast.tsx` (or any file in G) and are imported by film.tsx.
3. **The cast first**: the people and things that come back, drawn once each with the pen (`video/src/argon/pen.tsx`:
   Shape, Line, Circle, Box, usePen) so the look inks them, with poses/states as props. Render a cast sheet still and
   look at it before any scene.
4. **The motion library, whenever a scene needs it**: people, crowds, vehicles, creatures, robots, motions, props.
   Look in `video/src/argon/lib/catalog.ts` (what exists) before drawing a thing from scratch. Library pieces are HTML:
   place them with `<At x y w h>` (video/src/argon/kit) inside `<Lib>` (video/src/print/bridge) in a scene that returns
   `<div style={{position:"absolute",inset:0}}><svg .../>...<At><Lib>piece</Lib></At></div>`, never inside the svg.
   A thing you draw that the library lacks gets `/** NEW PIECE: what it is */` above its function: the library grows from it.
5. **Every scene different**: a shot list first (wide, medium, close-up, top-down, symbolic; setting; who is in it), so
   no two scenes are the same picture. Fill the frame; at most 3 big words on screen; keep the bottom 140 px for captions.
6. **Look at it**: `cd video && npx tsc --noEmit -p G/tsconfig.json`, then stills of each scene at 40% and 85% of its time
   (`npx remotion still G/entry.ts OneShot out.jpg --frame=N --scale=0.4`), seen as a contact sheet; fix what is broken,
   cut off, empty or unreadable.
7. **Finish**: `cd backend && .venv/bin/python -u ../video/oneshot.py --slug <slug> --stage finish` (compile, render,
   report, the library grows). Then `rm F/handoff.json` is not needed: the report makes the film "done" in the app.
8. Tell Raushan: the UI link (`http://localhost:3030/app/motion/f/<slug>`), the video path, what was drawn, and what
   you would improve. Never claim it rendered without the command's output.
