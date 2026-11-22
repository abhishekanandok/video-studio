# TRUNK · Frontend shell

> DRAFT — not verified by owner

## Responsibility
The pages, navigation, the API client, live polling and notifications that every branch's screens use.

## Technology and why
Next.js 16 app router (all pages `"use client"`), React 19, SWR 2.5, Tailwind 4, motion, lenis. ADR 0007 (RECONSTRUCTED).

## Where it lives
- `frontend/app/layout.tsx`: fonts, theme script (localStorage), `<Providers><Shell>`.
- `frontend/lib/api.ts`: `API` = `NEXT_PUBLIC_API_URL` or `${location.protocol}//${location.hostname}:8020/api`
  (browser) / `http://localhost:8020/api` (server). `api()` sets JSON headers, `cache: no-store`; network failure →
  `ApiError(…, 0)` "Is it running on port 8020?"; non-2xx → `ApiError(detail, status)`. `useApi()` = SWR.
- `frontend/components/providers.tsx`: `SWRConfig onError: () => {}` (errors swallowed), toasts, global job poller
  (2.5 s while jobs run, else 15 s) calling `GET /api/jobs` (a stub that returns `[]`), task tray, theme.
- `frontend/components/shell.tsx`: nav; no chrome on `/` (landing).
- `frontend/components/studio.tsx`: `MEDIA` base URL for every `<img>/<video>/<audio>`.
- Routes: `/studio`, `/studio/new`, `/studio/[id]`, `/studio/[id]/live`, `/studio/cinema[/slug]`, `/studio/skills`,
  `/exam[...]`, `/crew[...]`, `/audio[...]`, `/skills[...]`, `/rules`, `/` (landing).

## How branches depend on it
Every branch's screens use `useApi`, `post`, `MEDIA`, toasts and the poller.

## Failure modes
- On Vercel without `NEXT_PUBLIC_API_URL` (set before the build), every call goes to `https://<vercel-host>:8020/api` and fails.
- `http` API from an `https` page → blocked as mixed content.
- Errors are silent (global `onError` no-op, poller `catch {}`); 6 `*/new` pages ignore `error`.
- Polling never backs off when the backend is down; idle pages poll every 3–5 s.
- `next.config.mjs` redirects to `/learn`, `/progress`, `/library`, which do not exist.

## Limits (measured)
n/a

## Proven by
`tsc --noEmit` (the test-on-edit hook). No tests, no ESLint config, no CI.

## Open questions
- SSE for live progress instead of polling?
- One app (landing + product) on Vercel, or landing alone with the product on its own domain?
