# 0008. No authentication: the Studio is a single-user lab

- **Status:** RECONSTRUCTED — reason inferred, owner to confirm
- **Tree level:** trunk (auth)
- **Date:** 2026-10-22 (reconstructed)

## Context
One person on a laptop and home Wi-Fi.

## Options
1. **No auth, LAN-only CORS** (chosen).
2. **A shared API key** for the whole app.
3. **User accounts** (phone OTP, sessions) as the PRD's V1-01 requires.

## Decision
Option 1 (inferred). **Must change before any public deploy** (V1 needs option 3).

## Consequences
RISKS S1, S2. Destructive endpoints are open to anyone who can reach the port.

## How we verify
From another machine, call `DELETE /api/audio/films/{id}` and fetch `/studio-assets/<slug>/config.json`.
