# BRANCH · visuals

> DRAFT — not verified by owner · Status: partly built (several planners exist; no shared template registry or V1 review UI)

## Internal design
V1: for each line, pick a template (Appendix B of the PRD) or "face only", fill its slots from the transcript/script,
record why; apply pacing rules (≤ 1 visual / 4 s, ≥ 30% face time, none over the first 5 s hook); then a **storyboard
review** gate where the creator approves all, swaps a template, edits text or asks in chat.
Today: `audiofilm.plan` / `doc_layouts` (`audiofilm.py:414,615`), `editorial.py`, `paper.py`, `board.py`,
`motion.decide` (doc), notes visual programs (`notes.py:664`), picture rules (`picrules.py`), slide skills (looks).
Gates exist in audio films ("waiting" stage, `checkpics`) and crew (8 gates).
**Motion films (ADR 0013, 2026-10-26):** `video/oneshot.py --stage plan|redraw|reline|write|redo`, run by
`backend/app/api/films_api.py`, shown at `/app/motion`: plan → voice → storyboard (one card per line) → **gate** →
one film file → compile/words checks → render. Cards live in `video/storyboard.py` (`storyboard.json`, locked writes);
looks drawn in code come from `styles.DRAWN`. The older argon pipeline is at `/app/motion/classic`.

## Leaves (build order)
1. template-registry: one list of templates with slot schemas + Remotion components · planned
2. visual-plan: line → template + filled slots + reason · partly built
3. pacing-rules: enforce V1-12 · planned
4. storyboard-api: GET plan, PUT swap/edit, POST approve · built for motion films (`/api/films/<slug>/cards/<id>/approve|feedback|line`, `approve-all`, `write`, `redo`); audio has `PUT /plan`, `POST /approve`
5. storyboard-ui: per-line review screen · built for motion films (`/app/motion/f/<slug>`); audio film page
6. feedback-log: per-visual approve/reject with reason (V1-20) · built for motion films (`feedback.jsonl`)

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| receives | plan-script | visual tags per line | |
| receives | transcribe-clean | line id → time range | |
| sends | render-deliver | `film.json` props (approved) | props match the composition's schema; approved = frozen |
| owns | app (motion films) | `public/oneshot/<slug>/storyboard.json` `{slug, topic, title, style, ground, written{id: hash}, cards[{id "L01", i, line, seconds, design, status pending\|approved\|redrawing, notes[]}]}` | the write runs only when every card is `approved` (checked in `films_api.write` and in `oneshot.stage_write`); card ids are stable; a redraw changes one card only |

## OWNERSHIP CARD
- **Purpose:** a visual that explains each line, approved by the creator before rendering.
- **Receives:** script tags, aligned transcript, creator's slides/notes.
- **Sends:** approved `film.json`.
- **Promises:** every text slot traces to a transcript/script span; review takes ≤ 10 min (PRD G2).
- **Breaks when:** the planner picks distracting visuals; a template's slot overflows; facts not in the source.
- **Limits (measured):** unknown
- **Observe via:** status.json, feedback log (planned)
- **Proven by (tests):** gate check through the API on a scratch film (2026-10-26, by hand: write refused with pending/redrawing cards; feedback changes one card); no automated test yet
- **Open questions:** which existing planner becomes the V1 planner?
