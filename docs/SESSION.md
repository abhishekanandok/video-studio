# SESSION
- **Current:** TRUNK · config (first leaf of the ownership backlog). No code changed during setup (2026-10-22).
- **Last state:** HLD, LLD (10 trunk, 15 branches, 2 leaves), CODEMAP, RISKS (38), ADRs 0001–0010 drafted; all DRAFT, owner-unverified.
- **Next step:** `/explain-code trunk config` on `backend/app/config.py` (setting names only, never `.env`).
- **Blockers:** none. Open: `audiofilm.py` and `archivedoc.py` were not surveyed in depth.

## OWNERSHIP BACKLOG (verify in this order)
1. TRUNK config → `backend/app/config.py`
2. TRUNK database → `db.py`, `models.py` (+ ADR 0004)
3. TRUNK app-skeleton → `main.py` (routers, CORS, static mounts)
4. TRUNK job-runner → `procs.py`, `_spawn` in `api/studio.py:82-97` (+ ADR 0002) · then `/break-it` double submit
5. TRUNK ai-clients → `llm.py` retries (+ ADR 0005) · TRUNK frontend-shell → `frontend/lib/api.ts`, `providers.tsx`
6. BRANCH audio-films (critical path to V1: upload → transcribe → plan → approve → build), leaf by leaf, starting at `create-and-plan`
7. Then `/design-review root` (capacity maths) and `/design-review trunk job-runner` before any V1 code.
