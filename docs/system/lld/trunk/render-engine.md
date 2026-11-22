# TRUNK · Render engine

> DRAFT — not verified by owner

## Responsibility
Turns a film's props (`film.json`) into video files.

## Technology and why
Remotion 4 (React compositions rendered frame by frame) plus FFmpeg. ADR 0006 (RECONSTRUCTED): visuals are code,
so they are exact, editable and cheap to re-render.

## Where it lives
- `video/src/index.ts` → `Root.tsx`, compositions at 1920×1080: `Notes`, `Board`, `Archive`, `Paper`, `Doc`,
  `Explainer`, `Episode`. `notes-entry.tsx` (Notes only). `src/landing/index.tsx`: marketing films (not product).
- `video/doc.py:1233` `render`: `npx remotion render src/index.ts Doc out/<slug>.mp4 --props=... --concurrency=6 --crf=21`,
  progress parsed from stdout. **No timeout** (`doc.py:1241`).
- `video/notes-render.mjs`: `bundle` + `renderMedia` per scene, tmp-then-rename write. `notes-still.mjs` /
  `notes-stills.mjs`: check frames and stills.
- `video/fastrender.py`: stills + FFmpeg, NVENC probe (`:229`), default work dir `D:\video-studio-work` (`:243`).
- `@remotion/bundler` and `@remotion/renderer` are used but not listed in `video/package.json`.

## How branches depend on it
render-deliver (V1), documentary, notes-films, audio-films, slide-skills demos.

## Failure modes
- A hung render never times out.
- CPU/GPU contention when several films render at once (concurrency 6–8 each, no global cap).
- Missing 9:16 composition and captions (needed for V1 Shorts and captions).

## Limits (measured)
unknown: frames/s per machine is the number that sizes V1 (HLD capacity table).

## Proven by
None.

## Open questions
- Remotion Lambda / a render worker pool, or one dedicated render machine for Gate 1?
- Remotion's license terms for a commercial product (company size).
