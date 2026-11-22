# 0001. FastAPI with sync handlers, sync SQLAlchemy 2.0 and Postgres

- **Status:** RECONSTRUCTED — reason inferred, owner to confirm
- **Tree level:** trunk (app-skeleton, database)
- **Date:** 2026-10-22 (reconstructed)

## Context
A single-user lab API in front of long-running Python pipelines that already used the same models and settings.
Handlers mostly read files and spawn processes; heavy work happens elsewhere.

## Options
1. **FastAPI, sync `def` handlers, sync SQLAlchemy** (chosen): simple; handlers run in a threadpool; one mental model.
2. **FastAPI fully async** (async SQLAlchemy, httpx): more concurrency per process; every library must be async.
3. **Django + DRF**: batteries (admin, auth, migrations) but heavier, and the pipelines are plain scripts.

## Decision
Option 1 (inferred): fastest to build, matches the scripts that share `app.db`/`app.config`.

## Consequences
Easy: plain Python everywhere. Hard: long calls inside handlers occupy threadpool workers (Scout, images); no
`Depends`-based sessions, so per-request scoping and test overrides are manual.

## How we verify
/break-it app-skeleton: 50 concurrent slow requests; measure when the threadpool saturates.
