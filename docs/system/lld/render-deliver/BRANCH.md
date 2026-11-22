# BRANCH · render-deliver

> DRAFT — not verified by owner · Status: partly built (16:9 render exists; captions and 9:16 Shorts do not)

## Internal design
V1: render a 1080p 16:9 master with Hinglish captions (3 styles, Roman/Devanagari), music and SFX; select 2–3
self-contained 30–60 s segments and reframe to 9:16 with face tracking; deliver downloads (watermark until paid).
Today: `doc.py:1233` render via Remotion CLI; `notes-render.mjs` per-scene renders + `join_film`; `fastrender.py`
stills+FFmpeg; `sfx.py`. Captions are off (`doc.py:597`); no `.srt/.vtt`; no 9:16 composition.

## Leaves (build order)
1. render-master: film.json → 16:9 mp4 with progress + timeout · partly built
2. captions: burned-in styles + .srt export · planned
3. shorts-select: pick 2–3 segments · planned
4. shorts-reframe: 9:16 composition with face tracking · planned
5. deliver: downloads, watermark, re-render up to 3× (V1-19) · planned

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| receives | visuals | approved film.json | |
| receives | payments | order paid event | release once per paid order |
| sends | ops | render status, timings, cost | |

## OWNERSHIP CARD
- **Purpose:** turn the approved plan into files the creator can publish.
- **Receives:** approved film.json, clean take, payment status.
- **Sends:** master mp4, Shorts, captions, status.
- **Promises:** render ≤ 30 min after approval for a 10-min video (PRD performance).
- **Breaks when:** a render hangs (no timeout); several renders share one machine.
- **Limits (measured):** unknown (frames/s is the key number)
- **Observe via:** status.json `render`, Remotion stdout progress
- **Proven by (tests):** none
- **Open questions:** one render box vs Remotion Lambda?
