# LEAF · audio-films / create-and-plan

> DRAFT — not verified by owner · Status: built

## Files and functions
- `backend/app/api/audio.py:88` `POST /api/audio/films`: multipart (audio + up to 6 guide images + options).
- `audio.py:102` inserts a `Film` (`kind="audio"`); `audio.py:113` saves the audio (no size limit);
  `audio.py:121` reads guide images whole into memory.
- `audio.py:26-28` spawn: `Popen([python, -u, video/audiofilm.py, --out, slug, --stage, plan])`, **without**
  `start_new_session` (dies with the API process group? to verify).
- `video/audiofilm.py:135` `_transcribe` (faster-whisper, `word_timestamps=True`); `:414` `plan`; `:615` `doc_layouts`.

## Data model
`films` row; `video/public/<slug>/` holds the upload, guide images, config, transcript and plan files (names unknown),
`status.json`, `pipeline.log`.

## Walkthrough
Browser `/audio/new` → POST multipart → row + files → child `--stage plan` → transcribe → plan → status `waiting`
→ the creator reviews the plan (`PUT .../plan`) → `POST .../approve` → `--stage build`.

## Concurrency and idempotency
Not idempotent (double submit = two films). The plan JSON is read-modify-written by the API (`audio.py:205-206`)
without an atomic write while the child may also write: last writer wins.

## Errors and timeouts
No upload size or type validation; no timeout on the child; Whisper on CPU may be slow (unknown).

## Tests that prove it
None. First tests: rejects files over the size limit; plan edit is atomic; second submit with the same idempotency key
returns the first film.
