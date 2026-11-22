# TRUNK · Auth and accounts

> DRAFT — not verified by owner · Status: **planned** (nothing exists)

## Responsibility
Know who is calling, which projects and files are theirs, and refuse everything else.

## Technology and why
None chosen yet. PRD V1-01 asks for phone-OTP sign-up. Options to weigh in `/design-review trunk auth`:
a managed provider (Firebase Auth / Supabase / Clerk / MSG91 OTP) vs our own OTP + sessions.

## Where it lives
Nowhere. Today: no users table, no `Depends`, no API key; CORS is the only gate (and it does not stop non-browser
callers). The only identity is a free-text "author" name in localStorage (`frontend/components/skills.tsx`).

## How branches depend on it
Every V1 branch needs `current_user` and project ownership; media URLs need to be private (signed) per user;
payments need a user to bill.

## Failure modes (today)
Anyone who can reach the API can create films (and spend AI money), delete films (`DELETE /api/audio/films/{id}`),
and read every upload and log under `/studio-assets`.

## Limits (measured)
n/a

## Proven by
n/a

## Open questions
- OTP provider and its cost per SMS in India.
- Session cookie (same site) vs bearer token (API on another domain).
