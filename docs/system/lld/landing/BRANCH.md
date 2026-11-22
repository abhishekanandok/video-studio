# BRANCH · landing

> DRAFT — not verified by owner · Status: built

## Internal design
The marketing site at `/`: `frontend/app/page.tsx` (sections: Hero, Problem, Platform, Features, How, Benefits,
Feedback, Footer), `frontend/app/landing.css`, `frontend/components/landing/` (`hero-deck.tsx`, `decks.tsx`,
`monitor.tsx`, `platform.tsx`, `scene.tsx`, `loop-video.tsx`), media in `frontend/public/landing/` (Remotion renders
from `video/src/landing/` via `video/landing-render.mjs`). Smooth scroll via Lenis; font Baloo 2.
Mirrored to `github.com/Raushan0303/drishya-frontend` (ADR 0009).

## Leaves (build order)
All built: nav, hero deck, problem, platform editor, features deck, how-it-works, benefits, personas, footer, favicon.

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| sends | product | links to `/studio/new` | Get started leads to sign-up once accounts exist |

## OWNERSHIP CARD
- **Purpose:** explain Drishyya and get sign-ups.
- **Receives:** nothing from the API.
- **Sends:** visitors to the app.
- **Promises:** every section fits one desktop viewport; works on phones; respects reduced motion.
- **Breaks when:** the two frontend copies drift; media files missing in the mirror.
- **Limits (measured):** n/a
- **Observe via:** Vercel analytics (not set up)
- **Proven by (tests):** `tsc --noEmit`, `next build`
- **Open questions:** keep one frontend repo?
