# BRANCH · ops

> DRAFT — not verified by owner · Status: planned (cost tracking exists; dashboard does not)

## Internal design
An internal dashboard (PRD V1-21): job queue, failure reasons, cost per job, manual override (retry a stage, cancel).
Today: `video/cost.py` writes `cost.json` per film; the frontend task tray polls `GET /api/jobs`, which returns `[]`
(`backend/app/main.py:50`).

## Leaves (build order)
1. jobs-endpoint (real data) · planned (stub exists)
2. failure-reasons (structured errors from pipelines) · planned
3. cost-per-job view · partly built (cost.json)
4. manual override (retry stage, cancel) · partly built (continue/stop endpoints)

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| receives | job runner / all pipelines | status.json, cost.json (later a jobs table) | |

## OWNERSHIP CARD
- **Purpose:** let the operator see and fix every job.
- **Receives:** job states, costs, errors.
- **Sends:** retry/cancel commands.
- **Promises:** no job fails silently.
- **Breaks when:** pipelines swallow errors (`studio.py:48` returns defaults on any exception).
- **Limits (measured):** n/a
- **Observe via:** itself
- **Proven by (tests):** none
- **Open questions:** admin auth.
