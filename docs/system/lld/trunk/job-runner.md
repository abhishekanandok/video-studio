# TRUNK · Job runner

> DRAFT — not verified by owner

## Responsibility
Start long pipelines (minutes to hours), report their progress, stop them, and let the user resume them.

## Technology and why
Detached child processes, no queue. ADR 0002 (RECONSTRUCTED): simplest thing for a single-user lab on one machine.

## Where it lives
- Spawn sites: `api/studio.py:82-97` (`_spawn` → `doc.py`), `api/notes.py:67-77`, `api/crew.py:28-30`,
  `api/audio.py:26-28`, `api/slideskills.py:35`, `video/cinema.py:198` (step processes).
- Pattern: `subprocess.Popen([sys.executable, "-u", "video/<script>.py", "--out", slug, "--config", ...], cwd=backend/,
  stdout/stderr → video/public/<slug>/pipeline.log, start_new_session=True)` (not for audio and slideskills),
  then `caffeinate -i -w <pid>` (macOS) and `Film.pid = pid`.
- `backend/app/procs.py`: `alive(pid)` (reaps zombies; falls back to `kill(pid,0)` + `ps`, `:32-39`),
  `stop()` → SIGTERM to the process group (`:42-52`), `taskkill /T` on Windows.
- `backend/app/gpulock.py`: one film on the GPU at a time via a file lock, **Windows-only** (`msvcrt`).

## Progress contract (`video/public/<slug>/status.json`)
`stage` (plan / scripts / images / voices / render / join / done / failed / paused / transcribe / checkpics / waiting),
`stages[stage] = {done, total}`, `log = [{at, msg}]` (last 200), `video` (file in `out/`), plus `title`, `slides`,
`story`, `topic`, `audio_tracks`. Siblings: `cost.json`, `crew.json`, `tasks.json`.
`doc.py` writes status.json atomically (tmp + fsync + replace, `doc.py:424-429`); other writers **unknown**.
Readers: `studio.py:148` `_summary`, `_counts` (file counts), `_now` (parses the log tail), `notes.py:79-95`.

## Resume, gates, stop
- Each kind has `POST .../continue`: returns 409 if `alive(pid)`, else spawns again; the child skips files that exist.
- Gates: crew answers = `answer-<ts>.json` + `--resume`; audio "waiting" stage then `--stage build`;
  studio research approval = a marker file.
- Server restart: children survive (own session). Nothing auto-resumes. A dead child shows "stopped".

## Failure modes
- Double POST create → two films, two processes (no idempotency key).
- check-then-spawn on `/continue` has no lock → two concurrent clicks can start two children.
- `POST /studio/films/{id}/tasks` spawns without saving the PID → can run alongside the main job and cannot be stopped.
- PID reuse after a reboot: a stale `pid` may match an unrelated process (no start-time check).
- No limit on concurrent jobs or on spend.

## Limits (measured)
unknown

## Proven by
None.

## Open questions
- V1: a real queue (Postgres-backed, or RQ/Arq/Celery) with a `jobs` table, heartbeats, retries and a concurrency cap?
