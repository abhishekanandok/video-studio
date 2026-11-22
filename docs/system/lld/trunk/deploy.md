# TRUNK · Deploy

> DRAFT — not verified by owner · Status: partial

## Responsibility
Where each part runs, how it is started, and how code gets there.

## Today
- Everything runs on a laptop: `uvicorn app.main:app --port 8020` from `backend/` (README), `npm run dev` in
  `frontend/` (:3030; :3031 when Langfuse holds :3030), Postgres in Docker (:5442), pipelines as child processes.
- Platform assumptions: macOS (`caffeinate`, `tools/lift` Swift binary) **and** Windows (`gpulock.py` `msvcrt`,
  `D:\video-studio-work` defaults, NVENC), i.e. the code expects a Mac and a Windows GPU box at different times.
- Landing page: copied to `github.com/Raushan0303/drishya-frontend` and deployed to Vercel **by CLI** (`npx vercel --prod`);
  Vercel is not connected to the repo, so pushes do not deploy (2026-10-22).
- `start-all.ps1` (Windows start script) exists at the repo root.

## V1 needs (not decided)
- API host (Render / Railway / Fly / a VM), worker host(s) with GPU or strong CPU for renders, managed Postgres,
  object storage, a domain with HTTPS for the API (to avoid mixed content), secrets in the host's env.
- CI: build + tests on push.

## Failure modes
- The frontend on Vercel cannot reach a laptop API (see frontend-shell.md).
- Two copies of the frontend (this repo and drishya-frontend) can drift.

## Open questions
- One repo or two for the frontend? (ADR 0009)
- Single render machine vs Remotion Lambda for Gate 1 numbers?
