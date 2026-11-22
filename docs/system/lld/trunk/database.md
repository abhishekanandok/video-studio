# TRUNK · Database

> DRAFT — not verified by owner

## Responsibility
Durable records of films, skills and global settings. Most pipeline state is NOT here; it lives in files (see
media-storage and job-runner).

## Technology and why
Postgres 17 in Docker (`docker-compose.yml`, host port 5442, db `videostudio`), SQLAlchemy 2.0 **sync** with psycopg.
ADR 0001 and 0004 (both RECONSTRUCTED).

## Where it lives
- `backend/app/db.py:8-9` engine: `pool_pre_ping`, pool 10 + overflow 20, `expire_on_commit=False`.
- `db.py:16-26` `session_scope()`: commit on success, rollback on error. Used directly in handlers (no `Depends`).
- `db.py:32` `init_db()` → `Base.metadata.create_all` at startup. **No migrations.**
- `backend/app/models.py`:
  - `settings` (`:15`): `key` String(100) PK, `value` JSON. Keys in use: `lesson_video_voices`, `notes_system_prompt`, `slide_skill_subjects`.
  - `films` (`:21`): `id`, `slug` (unique, 60), `lesson_id`, `kind` (studio|lesson|notes|crew|audio), `config` JSON,
    `minutes`, `format`, `premise`, `voices` JSON, `pid`, `created_at`.
  - `skills` (`:39`): `id`, `data` JSON, `created_at`. Crew ideas and slide looks (`data.type=="look"`) share it.
- No foreign keys or relationships; links live inside JSON (`skills.data.demo_film`, `data.extends`).
- LangGraph's Postgres checkpointer keeps crew state in its own tables (names unknown).

## How branches depend on it
Every API branch creates `Film` rows (`studio.py:195`, `notes.py:135`, `crew.py:101`, `audio.py:102`,
`slideskills.py:336`) and reads `Film.pid` to decide "running or not". `slideskill.py` (a child process) writes progress
into its `skills` row.

## Failure modes
- Adding a column: `create_all` never alters an existing table, so production silently lacks the column.
- In-place edits of JSON columns are not saved without `flag_modified` (studio's `continue` reassigns whole dicts: fine).
- DB down → every list page fails; running children keep going (they write files, not rows), except slide skills.

## Limits (measured)
unknown (pool 30 connections max per API process).

## Proven by
None.

## Open questions
- Adopt Alembic before V1 adds users, projects, orders?
- Move job state (stage, pid, heartbeat) from files into a `jobs` table?
