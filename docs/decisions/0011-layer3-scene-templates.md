# 0011. Layer 3: scene templates own their layout and timing; the agent fills in content

- **Status:** rejected (Raushan, 2026-10-24); the templates were built, then deleted (see "Rejected" below)
- **Tree level:** branch (visuals)
- **Date:** 2026-10-24

## Context
The motion library has three layers. Layer 1 (motions, `lib/motion*.tsx`) says how things move; layer 2 (blocks,
`lib/blocks-*.tsx`) is the things on screen, and every block's pieces can be swapped (`parts`, `render`, `<Swap>`).
Today the agent writes each scene by hand: it chooses every block's position and every `at`. That is a lot of numbers to
get right, things overlap, and no two scenes of the same kind look alike.

## Options
1. **Agent writes every scene** from blocks (today).
2. **Templates own layout and timing** (chosen): a template is a whole scene made of blocks; the agent picks one and
   gives only content (text, numbers, pictures). Its beats are written at a natural pace and stretched to the narration
   (0.75x–1.8x, then it holds).
3. **Templates with cue words from the agent**: as 2, but the agent can tie a beat to a word of the narration.

## Decision
Option 2. Templates are written with `template(name, natural, View)` (`lib/template.tsx`); `beat(x)` is the clock.
Every template takes `parts` (passed to the blocks inside it as `"Block.part"`), `backdrop` and `scrim`. Cue words
(option 3) can be added later without changing a template's props.

Templates come in two kinds:
- **Roles** (`lib/tpl-roles.tsx`, built first): the moments every video needs. 21 now: Hook, Title, BigQuestion,
  OneBigNumber, Tally, Quote, Definition, Versus, TopList, TimelineScene, Steps, CauseEffect, BeforeAfterScene, MapFlyTo,
  Reveal, MythFact, Interview, Recap, CallToAction, End, Bridge.
- **Topics** (next, about 8 each): finance, history, maps, science, process, data, story, news, education, tech,
  biography, lists, health, mystery, and the new 15: sports, elections, personal money, everyday India, climate, space,
  law and crime, self-help, internet culture, careers, food, mythology and culture, kids' stories, war, travel.
  About 250 templates in all.

## Built (2026-10-24)
285 templates in `video/src/argon/lib/tpl-*.tsx`, one file per category: roles 21 · finance 17 · history 15 ·
maps 14 · science 16 · process 12 · data 22 · story 12 · news 13 · education 11 · tech 16 · biography 8 · lists 7 ·
health 9 · mystery 9 · sports 6 · elections 6 · personal money 10 · everyday India 6 · climate 7 · space 5 · law 5 ·
self-help 5 · internet 5 · careers 5 · food 5 · culture 4 · kids 5 · war 4 · travel 5. Every one is rendered in the
motion-library showcase (scenes 55–58 and 59–111) and was checked by eye; rendering them found and fixed block bugs
(Bubbles overlap, DotGroups height, Funnel and Signature clipping, MagazineCover masthead, palette shades collapsing
in 24 sets, India's outline on the world map).

## Consequences
The agent's scene becomes one line (`<OneBigNumber value={140} suffix=" crore" label="people in India" />`), so scenes
are shorter, consistent and harder to get wrong. `catalog.py` lists templates as layer 3 with their props, natural
length and the blocks inside them. A template cannot sync a beat to a spoken word until cues are added.

## How we verify
Each template renders in the motion-library showcase (scenes 55–58) at 9 s, stretched past its natural length; then a
real film is planned with templates only, and no scene needs a hand-written position.

## Rejected (2026-10-24)
Raushan rejected templates after seeing all 285 rendered. His reasons: a template fixes the layout, not only the
colours, so a creator's own style (paper cut, handwriting…) forced into a stock layout looks wrong; and picking from
hundreds of fixed scenes makes every creator's film look alike. Instead the agent designs every scene itself from
layer 1 (motions) and layer 2 (blocks). The `tpl-*.tsx` files, `template.tsx`, the template reel and showcase scenes
55–111 were deleted; `catalog.py` lists layers 0–2 only. The block fixes found while rendering them stay.
The cost problem templates were meant to solve (each scene written from scratch, then rewritten by the fix and review
loops) is still open; the next decision is how the agent plans and writes scenes more cheaply.
