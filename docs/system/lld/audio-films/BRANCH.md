# BRANCH · audio-films (studio lab) — closest to V1

> DRAFT — not verified by owner · Status: built

## Internal design
An uploaded lecture recording → transcript → planned slides/pictures (creator approves the plan and the pictures) →
built film. API `backend/app/api/audio.py` (384 lines); engine `video/audiofilm.py` (2,559 lines, not surveyed in
depth: internals marked unknown). Stages run as separate invocations: `audiofilm.py --out <slug> --stage
plan|build|picture|label` (`audio.py:26-28`, no `start_new_session`). Uses faster-whisper (`_transcribe`,
`audiofilm.py:135`), ComfyUI Qwen-Image / Wan 2.2 (`backend/app/comfy.py`), layout planning (`plan` `:414`,
`doc_layouts` `:615`).

## Leaves (build order, all built)
1. create-and-plan: `POST /api/audio/films` (audio + ≤ 6 guide images) → `--stage plan` · lld: [create-and-plan.md](create-and-plan.md)
2. plan-edit: `PUT /api/audio/films/{id}/plan` (read-modify-write JSON, `audio.py:205`) · not yet written
3. approve-build: `POST .../approve` → `--stage build` · not yet written
4. picture tools: `POST .../scenes/{n}/picture|upload|zoom|redo`, `.../pictures/approve` · not yet written
5. stop/continue/delete: `audio.py:348,360,369` · not yet written

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| sends | job runner | `audiofilm.py --out --stage` | stage names |
| sends | frontend | status.json (`waiting`, `checkpics` gates) | |
| becomes | record, transcribe-clean, visuals | upload, `_transcribe`, `plan` | reused by V1 |

## OWNERSHIP CARD
- **Purpose:** the lab's "your recording in, visual film out" path: the backbone V1 grows from.
- **Receives:** audio file, guide images, options.
- **Sends:** plan for approval, pictures for approval, film.
- **Promises:** two human gates before money is spent on the build (to confirm).
- **Breaks when:** huge upload (no size limit, `audio.py:113`); concurrent edits to plan JSON while the child writes it;
  ComfyUI not running (no retries).
- **Limits (measured):** unknown
- **Observe via:** `pipeline.log`, status.json
- **Proven by (tests):** none
- **Open questions:** read `audiofilm.py` end to end in an /explain-code session before V1 reuses it.
