# 0012. The agent designs every scene from the motion library; first style: paper collage + cut-out

- **Status:** proposed (Raushan to confirm after the first film)
- **Tree level:** branch (visuals)
- **Date:** 2026-10-24

## Context
Templates were rejected (ADR 0011). The agent (`video/argon.py`) wrote every scene from `kit.tsx` alone: it never saw
the 112 motions and 269 blocks of `lib/`, so it drew everything from scratch, wrote long code, and the fix and review
loops rewrote it. Raushan wants the agent to design each scene itself, but from the library's pieces.

## Decision
- The scene writer's prompt carries THE LIBRARY (layers 1 and 2 from `lib/catalog.ts`, about 23k tokens) with each
  file's import path; `ensure_imports` adds a forgotten library import, as it already did for the kit.
- The planner sees the library's names (about 10k tokens) and writes each beat's `concept` as a timed shot list naming
  the pieces ("1.2 s CountUp to 40 on 'forty'"); "make:" marks what no piece does.
- A style can set its own `length` and `backdrop: "none"` (a calm ground drawn in code, no plate image).
- First style for it: `papercollage` (Paper collage + cut-out): collage photo scraps and card cut-outs and puppets on
  one plain paper ground with the film's one motif; at most one drawn cut-out a scene; simple things are library
  blocks, not pictures; 12-16 lines (75-110 s).

## Consequences
Scenes should be shorter and reuse tested pieces, and a style film makes fewer pictures (no plates). The prompt is
larger (about 38k tokens a scene, input only). Not yet changed: one call per scene, the full-rewrite fix loops and the
screenshot review (the cost leaves that follow).

## How we verify
One papercollage film (1-2 minutes) made from the app; its `cost.json` per stage, and how many scenes import from
`lib/`, compared with an earlier film.
