# 0004. Tables are created with create_all; there are no migrations

- **Status:** RECONSTRUCTED — reason inferred, owner to confirm
- **Tree level:** trunk (database)
- **Date:** 2026-10-22 (reconstructed)

## Context
Three small tables, mostly JSON columns, one developer.

## Options
1. **`Base.metadata.create_all` at startup** (chosen): nothing to manage.
2. **Alembic migrations**: versioned, reviewable schema changes.
3. **Schemaless JSON everywhere**: avoids migrations by avoiding columns.

## Decision
Option 1, mixed with 3 (JSON columns).

## Consequences
Any new column on an existing table never reaches an existing database. V1 adds users, projects, orders, jobs:
adopt Alembic first (a trunk leaf).

## How we verify
Add a column locally, restart, inspect the table.
