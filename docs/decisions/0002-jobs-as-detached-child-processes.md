# 0002. Long jobs run as detached child processes, progress in status.json

- **Status:** RECONSTRUCTED — reason inferred, owner to confirm
- **Tree level:** trunk (job-runner)
- **Date:** 2026-10-22 (reconstructed)

## Context
Films take minutes to hours and must survive API restarts; one person runs one or two at a time on one machine.

## Options
1. **Detached `subprocess.Popen` per film, PID in the DB, progress in files** (chosen): zero infrastructure; a crashed
   API does not kill films; easy to run a stage by hand from the terminal.
2. **A task queue** (Celery/RQ/Arq with Redis): retries, concurrency limits, visibility; one more service.
3. **A Postgres-backed queue** (`SELECT … FOR UPDATE SKIP LOCKED`, a `jobs` table, workers): queue semantics without Redis.

## Decision
Option 1 (inferred): simplest for a lab.

## Consequences
No idempotency, no concurrency cap, no automatic retry, PID reuse risk, progress only via files (RISKS J1–J5).
V1 with paying users likely needs option 2 or 3: decide in `/design-review trunk job-runner`.

## How we verify
/break-it job-runner: double submit, kill -9 mid-stage, reboot with a stale PID, 5 films at once.
