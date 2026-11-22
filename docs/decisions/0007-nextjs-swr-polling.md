# 0007. Next.js app router with SWR polling for live progress

- **Status:** RECONSTRUCTED — reason inferred, owner to confirm
- **Tree level:** trunk (frontend-shell)
- **Date:** 2026-10-22 (reconstructed)

## Context
Pages need to show live pipeline progress; there is no push channel from the backend.

## Options
1. **SWR polling every 2.5–15 s** (chosen): no server changes; works through any proxy.
2. **Server-Sent Events** from the API: instant updates, one connection per page.
3. **WebSockets**: two-way, more moving parts.

## Decision
Option 1 (inferred).

## Consequences
Constant requests even when idle; no backoff when the API is down; errors swallowed (RISKS O2).

## How we verify
Count requests per minute with three pages open; stop the API and watch the network tab.
