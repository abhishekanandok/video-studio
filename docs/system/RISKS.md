# RISKS

> DRAFT — not verified by owner. Found by read-only surveys on 2026-10-22. **Nothing here is fixed yet**: each risk is a
> future leaf. Severity: H = blocks a public V1, M = will hurt soon, L = tidy-up.

## Security and secrets
| # | Risk | Where | Tree | Sev |
|---|---|---|---|---|
| S1 | No authentication or authorization on any endpoint; anyone who reaches :8020 can create films (spend AI money) and delete them | `backend/app/main.py`, all `api/*.py`, e.g. `DELETE /api/audio/films/{id}` `audio.py:369` | trunk/auth | H |
| S2 | `video/public` served statically without auth: uploads, `config.json`, `pipeline.log` (with truncated provider error text) are public | `main.py:46`, `llm.py:150,163` | trunk/media-storage | H |
| S3 | Veo service-account key read from another repo (Tayyari) by absolute path; the credentials path is copied into the process env | README, `video/motion.py:114` | trunk/config | M |
| S4 | Required keys are not validated at startup; a missing key fails deep inside a running pipeline | `backend/app/config.py` | trunk/config | L |
| S5 | CORS allows any private-LAN origin on :3030 (fine locally; meaningless as protection) | `main.py:32-35` | trunk/app-skeleton | L |

## Jobs: idempotency, races, lifecycle
| # | Risk | Where | Tree | Sev |
|---|---|---|---|---|
| J1 | Create endpoints are not idempotent: a double submit makes two films and two processes | `studio.py:284`, `notes.py:111`, `crew.py:92`, `audio.py:88`, `cinema.py:69` | trunk/job-runner | H |
| J2 | `/continue` check-then-spawn without a lock: concurrent clicks start two children | `studio.py:314-325`, `notes.py:203` (and similar) | trunk/job-runner | M |
| J3 | `POST /studio/films/{id}/tasks` spawns without storing the PID: unstoppable, can run beside the main job | `studio.py:699,716` | branch/documentary | M |
| J4 | PID reuse after reboot: a stale `films.pid` can look alive (no start-time check) | `procs.py:32-39` | trunk/job-runner | M |
| J5 | No cap on concurrent jobs or total spend; thread pools of 3–5 per pipeline, Remotion concurrency 6–8 each | `doc.py`, `notes.py`, `cost.py` | trunk/job-runner | H |
| J6 | Audio and slide-skill children are spawned without `start_new_session` (behaviour on API restart unverified) | `audio.py:28`, `slideskills.py:35` | trunk/job-runner | L |

## Timeouts and retries
| # | Risk | Where | Tree | Sev |
|---|---|---|---|---|
| T1 | Gemini retries **forever** on network errors and fast-model 429/5xx; jobs look alive with no progress | `backend/app/llm.py:141-164` | trunk/ai-clients | H |
| T2 | Image painting retries forever on transient errors | `video/pipeline.py:157` | trunk/ai-clients | M |
| T3 | TTS: 8 tries × up to 60 s, ×4 takes per scene; one bad scene can stall ~30 min | `doc.py:434,520` | trunk/ai-clients | M |
| T4 | Remotion and node render subprocesses have no timeout | `doc.py:1241`, `notes.py:946,985` | trunk/render-engine | M |
| T5 | HTTP requests held for minutes by Scout/image calls (and forever with T1) | `skills.py:91,168,226` | branch/crew-films | M |
| T6 | ComfyUI calls have no retries; `comfy._video` mutates a global setting (not thread-safe) | `comfy.py:170-175` | trunk/ai-clients | L |

## Data integrity
| # | Risk | Where | Tree | Sev |
|---|---|---|---|---|
| D1 | Non-atomic JSON writes; a crash leaves a truncated file that the "exists ⇒ done" cache treats as finished | `doc.py:631,649,671,743,1033`, `notes.py:452`, `studio.py:88,687`, `audio.py:205,253,285,312` | trunk/media-storage | H |
| D2 | Cache keyed only on file existence: a new config with the same slug silently reuses old work | `doc.py` stage checks | trunk/media-storage | M |
| D3 | API and child processes read-modify-write the same JSON (`project.json`, plan files, skill rows) without cross-process locks | `cinema.py:133-144`, `audio.py:205-206`, `slideskill.py` | trunk/job-runner | M |
| D4 | No migrations: `create_all` never alters existing tables | `backend/app/db.py:32` | trunk/database | H (before V1 adds tables) |
| D5 | Errors swallowed: a corrupt status.json reads as "queued/stopped" | `studio.py:48`, `comfy.py:41,50`, `gpulock.py:41`, `procs.py:51` | trunk/job-runner | M |
| D6 | File handles left open (`json.dump(open(...))`, log handles passed to Popen) | `studio.py:88` and others | leaf (various) | L |

## Input validation
| # | Risk | Where | Tree | Sev |
|---|---|---|---|---|
| V1 | Uploads without size limits; guide images read whole into memory | `notes.py:144`, `audio.py:113,121,230,265` | branch/record | H |
| V2 | Cinema `PUT` takes a raw dict; `slug` path parameter goes into file paths unchecked (sanitising in `video/cinema.path` unknown) | `cinema.py:27-28,86` | branch/cinema | M |

## Portability and deploy
| # | Risk | Where | Tree | Sev |
|---|---|---|---|---|
| P1 | Windows-only `gpulock.py` (`msvcrt`) and `D:\` defaults; macOS-only `caffeinate` and `tools/lift` | `gpulock.py:8`, `fastrender.py:243`, `procs.py` | trunk/deploy | M |
| P2 | Engine imports the backend (`sys.path` into `../backend`), backend imports the engine (`cinema.py:12`, `picturerules.py:12`): one can't deploy without the other | `video/*.py:28`, `backend/app/api/*` | trunk/deploy | M |
| P3 | Frontend on Vercel needs `NEXT_PUBLIC_API_URL` at build time, HTTPS API (mixed content), CORS for the Vercel origin | `frontend/lib/api.ts`, `main.py:32` | trunk/frontend-shell | H |
| P4 | `@remotion/bundler` and `@remotion/renderer` used but not declared | `video/package.json` | trunk/render-engine | L |
| P5 | Two copies of the frontend (this repo and drishya-frontend) can drift; Vercel not connected to git | ADR 0009 | trunk/deploy | M |

## Observability and tests
| # | Risk | Where | Tree | Sev |
|---|---|---|---|---|
| O1 | No tests anywhere (backend, engine, frontend); no CI | repo | trunk | H |
| O2 | Frontend swallows errors (SWR `onError` no-op, poller `catch {}`); polling never backs off | `frontend/components/providers.tsx` | trunk/frontend-shell | M |
| O3 | `/api/jobs` is a stub returning `[]` though the UI polls it | `main.py:50` | branch/ops | L |
| O4 | Stale code: redirects to `/learn`, `/progress`, `/library`; offline hint says port 8010 | `frontend/next.config.mjs`, `components/offline.tsx` | trunk/frontend-shell | L |
