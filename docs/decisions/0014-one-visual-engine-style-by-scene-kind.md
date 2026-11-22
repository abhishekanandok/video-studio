# 0014. One visual engine: the creator picks the STYLE, the script picks the SCENE KIND per line; visuals first, creator voice in phase 2

- **Status:** proposed (Raushan to confirm after the phase 1 benchmark films)
- **Tree level:** root (scope) and branch (visuals)
- **Date:** 2026-10-26

## Context
Drishyya's product is "your idea, your voice, our visuals" (HLD ROOT): the creator records; Drishyya adds a visual
for every line. Recent work drifted: every new idea became its own pipeline (argon, oneshot, gemini2d, documentary,
notes, audio films, crew films, Veo), films were fully AI-made, and styles that need painted pictures (anime) were
added. The best films so far (How milk reaches your home, How UPI works, Why Bihar floods every year) worked because
each line got the KIND of picture it needed (a flow, a cutaway, a real map, kinetic words), not because of one look.

## Options
1. One pipeline per style (what we were drifting into).
2. "Full Motion" as one more style next to the others.
3. **One visual engine with two separate choices: STYLE (the creator, once per film, followed strictly by every scene)
   and SCENE KIND (the script, line by line)** (chosen).

## Decision
- **The creator records.** That does not change. The AI voice is a lab tool for phase 1 experiments and previews only.
- **Phase 1 (now): the visual engine only.** Prove the visuals are good enough to show investors and creators, on the
  AI-voiced lab films. No new product pipeline work (upload, recording, cut, Shorts) until phase 1 passes.
- **Phase 2 (after):** the creator's input decides the plan: recorded video (face on screen: where to cut to visuals,
  where to zoom, where the person stays), audio only (visuals carry every second), or plan-first with the
  teleprompter. The editor joins here.
- **V1 styles (7):** Paper cut-out (`paper`), Paper collage + cut-out (`papercollage`), Documentary 2.5D
  (`documentary`), Collage / Vox (`collage`), Map / Johnny Harris (`map`), Kinetic typography (`kinetic`),
  Whiteboard (`whiteboard`). **Removed from V1:** Anime painted, Horror / mystery (they need painted pictures or are out of
  scope). Isometric: open, owner to decide (the UPI film used it).
- **A chosen style is followed strictly by every scene of the film:** one ground, one paper, one palette, one type, one
  transition family. No scene switches to another look (the Bihar lab film's map/dark/beige switching is the bug).
- **Scene kinds (picked per line by the director, from what the line explains):** card (a number, quote, definition),
  flow (steps, process, money or code flow, cause and effect), photo (real people, places, things), map (where), motion
  (a mechanism, drawn in code, only where needed), kinetic words. The style skins every kind. A rhythm rule stops the
  same kind repeating; transitions carry meaning (continue, contrast, new chapter, zoom into detail, next item).
- **Pictures, in this order:** Wikimedia Commons (free, licence checked, credited), the creator's uploads (an option,
  never required), and only when neither has it, a generated ELEMENT (a cut-out object, a texture, a background) for
  the paper/collage layout. Never a whole generated picture as a scene.
- **Comprehension rules** (the clear-film contract: takeaway, question, view by kind, one focus, word sync, attention
  budget) apply to every film; the viewer test runs on rendered frames.
- **No new standalone pipelines.** A new idea becomes a style or a scene kind inside this engine, or it waits.

## Consequences
- Fewer things to own: one engine, seven skins, six scene kinds, instead of eight pipelines.
- Cards, flows, photos and maps are filled-in blocks (cheap, reliable); only motion scenes are written as code, so a
  film should cost less and crash less than today's all-code films (to be measured).
- The older pipelines stay in the repo until the engine replaces them; they are not extended.
- Phase 2 (the creator's voice) is blocked on phase 1 passing; that is deliberate.

## How we verify (phase 1 passes when)
1. The three benchmark topics (milk, UPI, Bihar floods) are remade in the engine in at least three of the seven styles,
   and the owner rates each as good enough to show an investor.
2. In every film, every scene follows the chosen style (checked on a frame sheet: one ground, one look).
3. Each film uses at least three scene kinds, with no kind more than twice in a row.
4. The frame-based viewer test answers each scene's question correctly for at least 80% of scenes.
5. `cost.json` shows each film's cost per minute (target: below today's ~₹12 per AI-voiced minute).
