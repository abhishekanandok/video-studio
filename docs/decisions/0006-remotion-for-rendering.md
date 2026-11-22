# 0006. Visuals are React compositions rendered with Remotion

- **Status:** RECONSTRUCTED — reason inferred, owner to confirm
- **Tree level:** trunk (render-engine)
- **Date:** 2026-10-22 (reconstructed)

## Context
The product promise is exact, editable teaching visuals (diagrams, tables, formulas), not generated footage.

## Options
1. **Remotion** (chosen): visuals are code; props in, frames out; re-render one scene.
2. **FFmpeg filter graphs + images**: fast, but complex layouts are hard (kept as `fastrender.py` for stills).
3. **Generative video** (Veo): beautiful, inexact, expensive (kept for cinema only).

## Decision
Option 1, with FFmpeg for joins and fast stills.

## Consequences
Rendering is CPU/GPU-heavy and sizes the V1 machines; check Remotion's commercial license.

## How we verify
Measure frames/s for a 10-minute Doc render on the target machine (HLD capacity table).
