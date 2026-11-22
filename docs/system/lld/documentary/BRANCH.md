# BRANCH · documentary (studio lab)

> DRAFT — not verified by owner · Status: built

## Internal design
Topic (+ links, format, minutes 3–45, voices) → researched, illustrated, voiced documentary. API in
`backend/app/api/studio.py` (744 lines); engine `video/doc.py` (`film()` `:872`), archival style hands off to
`video/archivedoc.py` (`doc.py:874`). Stages (each skipped if its output file exists, status via `Status` `doc.py:387`):
1. links → `sources.json` (`:614`) · 2. world bible → `world.json` (`:637`, story mode) · 3. plan → `plan.json` (`:662`)
4. scripts per act → `actNN.json` (`:708`, `:746` plain-words pass, optional dub `:774`) · 5. motion picks (`:920`)
6. images (single painter thread starts during scripts, `:900`; `pipeline.paint`, 16:9) · 7. voices (Gemini TTS;
`converse` `:499` 4 threads, or per line 5 threads; `accent_check` `:1059`) · 8. edit → `film.json` (`:1033`)
9. render (`:1233`, Remotion CLI). `--until scripts|images` pauses; `--task paint|voice|rewrite|dialogue` single edits.

## Leaves (build order, all built)
1. create-film: `POST /api/studio/films` → row + spawn · lld: [create-film.md](create-film.md)
2. live-tracker: `GET /api/studio/films/{id}/live` · lld: not yet written
3. continue/stop: `POST .../continue`, `.../stop` · not yet written
4. line-edit: `PUT .../lines/{key}` (atomic `edits.json`) · not yet written
5. scene-edit: `PUT .../acts/{n}/scenes/{i}` (imports doc.py in-process) · not yet written
6. tasks: `POST .../tasks` (PID not stored) · not yet written
7. pipeline stages 1–9 above · not yet written

## Interface contracts
| Direction | With | Interface | Contract |
|---|---|---|---|
| sends | job runner | `doc.py --out <slug> --config ... [--until]` | CLI args |
| sends | frontend | status.json, `/studio-assets/<slug>/...`, `/studio-out/<slug>.mp4` | stage names, file names |
| becomes | plan-script, render-deliver | `_plan`, `write_act`, `render` | reused by V1 |

## OWNERSHIP CARD
- **Purpose:** the lab's flagship film maker; source of V1's plan/script and render code.
- **Receives:** FilmConfig (`studio.py:246`).
- **Sends:** films, status, media.
- **Promises:** resumable by re-running (cached stages).
- **Breaks when:** a JSON file is half-written (treated as done); config changes with the same slug; Gemini retries forever.
- **Limits (measured):** unknown
- **Observe via:** `pipeline.log`, `status.json`, `cost.json`, `/live`
- **Proven by (tests):** none
- **Open questions:** which stages move into V1 unchanged?
