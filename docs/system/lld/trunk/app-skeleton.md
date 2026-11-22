# TRUNK · App skeleton (FastAPI)

> DRAFT — not verified by owner

## Responsibility
Receives every HTTP request from the frontend, routes it to a branch's handler, serves media files, and answers health
checks. It is the front door every branch shares.

## Technology and why
FastAPI + Uvicorn, sync `def` handlers (run in Starlette's threadpool). See ADR 0001 (RECONSTRUCTED).

## Where it lives
- `backend/app/main.py:24-28` lifespan: `init_db()` then `init_subjects()` (`api/slideskills.py:109`).
- `main.py:32-35` CORS: `frontend_url`, `localhost:3030`, `127.0.0.1:3030`, any private LAN IP on :3030; all methods/headers.
- `main.py:36-43` 8 routers mounted under `/api`: studio, cinema, notes, crew, skills, audio, slideskills, picturerules.
- `main.py:44-47` static mounts: `/studio-assets` → `video/public`, `/studio-out` → `video/out` (folders created at import).
- `main.py:50` `GET /api/jobs` always returns `[]` (a stub the frontend poller still calls).
- `main.py:56` `GET /health`.
- No other middleware. No auth. No request id or structured logging.

## How branches depend on it
Every branch is an `APIRouter` in `backend/app/api/*.py`. Branches open DB sessions themselves with
`session_scope()` (no `Depends`). Two routers change `sys.path` at import (`cinema.py:12`, `picturerules.py:12`), so
starting the app imports `video/` modules too.

## Configuration
`frontend_url` (CORS). Port 8020 is chosen on the command line, not in config.

## Failure modes
- A slow sync handler holds a threadpool worker (default 40). Skill Scout and image calls hold a request for minutes
  (`skills.py:91,168,226`); with Gemini's endless retry they can hold it forever.
- Static mounts expose everything under `video/public` (configs, uploads, `pipeline.log`) to anyone who can reach the port.
- Importing the app fails on macOS if anything imports `gpulock.py` (Windows-only `msvcrt`).

## Limits (measured)
unknown

## Proven by
No tests. `GET /health` is the only check.

## Open questions
- Do we keep sync handlers, or move I/O-heavy endpoints to `async`?
- Which endpoints survive into V1 and which stay "lab only" behind a flag?
