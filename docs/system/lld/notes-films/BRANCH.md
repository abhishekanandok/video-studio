# BRANCH · notes-films (studio lab)

> DRAFT — not verified by owner · Status: built

## Internal design
Notes / PDF / book (page range) → bilingual Hinglish slides → two-host narration → per-scene renders → joined film.
API `backend/app/api/notes.py` (255 lines); engine `video/notes.py` (`run` `:1036`) + `notes-render.mjs`.
Stages: pages (`pymupdf`, scanned pages via `transcribe_image`) → slides → pictures (Wikimedia, httpx 30 s, Gemini
verify, else generate) → hook → scripts → visual programs (3 threads, `:664`) → voices (4 threads, each take checked,
≤ 4 retries, `:697`) → `check_visuals` (render frames, Gemini judges, one fix round, `:970`) → `film.json` + per-scene
props (re-render only changed, `:1074`) → renders → `join_film` → `out/<slug>.mp4`.

## Leaves
create (`POST /api/notes/films`, multipart, no size limit `notes.py:144`), defaults (system prompt), stop/continue,
slide edit, scene redo · lld files not yet written.

## OWNERSHIP CARD
- **Purpose:** exam-notes films; its source reader and per-scene render are reusable in V1.
- **Breaks when:** non-atomic writes (`notes.py:452`); render subprocesses without timeout (`:946`, `:985`).
- **Limits (measured):** unknown · **Proven by:** none · **Observe via:** status.json, pipeline.log
