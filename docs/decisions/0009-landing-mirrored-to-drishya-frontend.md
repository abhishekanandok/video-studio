# 0009. The landing page is mirrored to a separate repo for Vercel

- **Status:** accepted (Raushan, 2026-10-21)
- **Tree level:** trunk (deploy) and branch (landing)
- **Date:** 2026-10-21

## Context
The marketing page had to be hosted quickly on Vercel while the product app still depends on a local API.

## Options
1. **Copy `frontend/` into `Raushan0303/drishya-frontend` and deploy that** (chosen by Raushan).
2. Deploy this repo on Vercel with Root Directory = `frontend`.
3. Split the landing into its own small Next.js app.

## Decision
Option 1.

## Consequences
Every change is synced by copying; the two copies can drift (RISKS P5). Vercel is deployed by CLI and is not connected
to git yet, so pushes don't deploy.

## How we verify
`diff -rq frontend ../drishya-frontend` shows no differences after each sync; the Vercel deployment shows the latest commit.
