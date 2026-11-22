# TRUNK · Media storage

> DRAFT — not verified by owner

## Responsibility
Holds every input, intermediate and output file of every film, and serves them to the browser.

## Technology and why
Plain folders on the local disk. ADR 0003 (RECONSTRUCTED): file-per-asset makes caching ("exists ⇒ done") and
hand-inspection easy.

## Where it lives
- `video/public/<slug>/`: `config.json`, `status.json`, `pipeline.log`, `cost.json`, `plan.json`, `actNN.json`,
  `world.json`, `sources.json`, images `aNNsII.png`, voices `*.wav`, `film.json`, `render/sceneNNN.json`, uploads.
- `video/public/cinema/<slug>/project.json` (cinema keeps all state there).
- `video/out/<slug>.mp4` final renders.
- Served by the API at `/studio-assets/` and `/studio-out/` (`backend/app/main.py:46-47`); the frontend builds URLs from
  `MEDIA = API without /api` (`frontend/components/studio.tsx`).

## How branches depend on it
Every pipeline reads and writes here; the API reads it to build summaries; the frontend loads media from it.

## Failure modes
- Caching by existence only: a truncated JSON from a crash is treated as done; changing the config with the same
  slug reuses old work (no content hash).
- Non-atomic writes in most places (`doc.py:631,649,671,743,1033`, `notes.py:452`, `audio.py:205,253,285,312`).
- No auth on the static mounts: configs, uploads and logs are public to anyone who reaches the port.
- Disk fills up: no retention or cleanup (V1 needs ≈ 0.7 TB at 30-day retention, see HLD).

## Limits (measured)
unknown

## Proven by
None.

## Open questions
- V1: object storage (S3 / R2 / GCS) with signed URLs, and a retention policy?
