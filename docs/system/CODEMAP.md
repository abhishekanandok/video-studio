# CODEMAP: the CODE TREE

> DRAFT — not verified by owner. One line per folder or important file. **Owner-verified** flips to "yes" only when
> Raushan has explained it without help (/explain-code). Claude never flips it.

## ROOT
| Path | What it is | Owner-verified |
|---|---|---|
| `README.md` | how to run; what was split out of Tayyari | no |
| `CLAUDE.md` | how we work (tree vocabulary, mentor mode, skills) | no |
| `docker-compose.yml` | local Postgres 17 on :5442, db `videostudio` | no |
| `start-all.ps1` | Windows start script | no |
| `docs/` | HLD/LLD, decisions, STYLE.md, landing prompts | no |

## TRUNK (shared code)
| Path | What it is | Owner-verified |
|---|---|---|
| `backend/requirements.txt` | Python dependencies (FastAPI, SQLAlchemy, psycopg, google-genai, openai, faster-whisper, langgraph …) | no |
| `backend/app/main.py` | FastAPI app: lifespan, CORS, 8 routers under `/api`, static `/studio-assets` + `/studio-out`, `/api/jobs` stub, `/health` | no |
| `backend/app/config.py` | pydantic-settings `Settings` from `backend/.env` (names only in lld/trunk/config.md) | no |
| `backend/app/db.py` | sync SQLAlchemy engine, `session_scope()`, `init_db()` = `create_all` | no |
| `backend/app/models.py` | tables `settings`, `films`, `skills` | no |
| `backend/app/procs.py` | process alive / stop (process group) / caffeinate | no |
| `backend/app/gpulock.py` | Windows-only machine-wide GPU file lock | no |
| `backend/app/llm.py` | Gemini + OpenAI clients, `get_llm()`, retries, usage hook | no |
| `backend/app/comfy.py` | ComfyUI HTTP client (Qwen-Image, Wan 2.2) | no |
| `video/pipeline.py` | shared engine base: `client()`, `paint()`, `speak()` (TTS), original lesson episode | no |
| `video/cost.py` | writes `cost.json` per film | no |
| `video/edits.py` | per-line user edits | no |
| `video/linkread.py` | safe URL reader | no |
| `video/package.json` | Remotion 4 + render deps (bundler/renderer missing from the list) | no |
| `video/src/index.ts`, `video/src/Root.tsx` | Remotion entry; registers Notes, Board, Archive, Paper, Doc, Explainer, Episode | no |
| `video/src/timing.ts` | shared timing helpers | no |
| `video/fastrender.py` | stills + FFmpeg fast export (NVENC) | no |
| `video/public/` | per-film working folders (served at `/studio-assets`) | no |
| `video/out/` | final mp4s (served at `/studio-out`) | no |
| `frontend/app/layout.tsx` | fonts, theme script, Providers + Shell | no |
| `frontend/app/globals.css` | app-wide styles and theme tokens | no |
| `frontend/lib/api.ts` | API base URL, `api()`, `post()`, `useApi()` (SWR), `ApiError` | no |
| `frontend/components/providers.tsx` | SWRConfig, toasts, global job poller, task tray, theme | no |
| `frontend/components/shell.tsx` | navigation chrome (none on `/`) | no |
| `frontend/components/ui.tsx` | shared UI pieces | no |
| `frontend/components/offline.tsx` | "backend not running" notice (says port 8010: stale) | no |
| `frontend/next.config.mjs` | dev origins, stale redirects | no |
| `.claude/` | settings (deny .env, test-on-edit hook), skills, launch.json | no |

## BRANCHES (feature folders and files)

### documentary
| Path | What it is | Owner-verified |
|---|---|---|
| `backend/app/api/studio.py` | films CRUD, spawn `doc.py`, live tracker, line/scene edits, tasks, house voices | no |
| `video/doc.py` | documentary pipeline: links → world → plan → acts → images → voices → film.json → render | no |
| `video/archivedoc.py` | archival documentary style | no |
| `video/archive.py` | Wikimedia Commons fetch + licence check | no |
| `video/motion.py` | per-scene motion choice (Veo / parallax / camera), Veo client | no |
| `video/board.py`, `build.py`, `editorial.py`, `paper.py`, `explainer.py`, `host.py`, `charts.py`, `textfix.py`, `sfx.py`, `voices.py`, `hinglish.py` | visual "directors", hosts, charts, sound, voices, Hinglish dub | no |
| `video/src/doc/`, `board/`, `archive/`, `paper/`, `explainer/`, `Episode.tsx`, `Diagrams.tsx` | Remotion compositions | no |
| `frontend/app/studio/` (`page`, `new`, `[id]`, `[id]/live`, `skills`) | film list, wizard, film page, live view | no |
| `frontend/components/studio.tsx`, `scene-editor.tsx`, `scene-player.tsx`, `research-panel.tsx` | studio UI | no |

### notes-films
| Path | What it is | Owner-verified |
|---|---|---|
| `backend/app/api/notes.py` | notes films API | no |
| `video/notes.py` | notes pipeline (pages → slides → pictures → scripts → visuals → voices → checks → renders → join) | no |
| `video/notes-render.mjs`, `notes-still.mjs`, `notes-stills.mjs` | per-scene renders and check frames | no |
| `video/src/notes/`, `video/src/notes-entry.tsx` | Notes / Documentary / Geography compositions | no |
| `frontend/app/exam/`, `frontend/components/exam.tsx`, `diagram-svg.tsx` | exam notes UI | no |

### audio-films
| Path | What it is | Owner-verified |
|---|---|---|
| `backend/app/api/audio.py` | upload, plan edit, approve, picture tools, stop/continue/delete | no |
| `video/audiofilm.py` | recording → transcript (faster-whisper) → plan → pictures → film | no |
| `frontend/app/audio/` | audio film pages | no |

### crew-films
| Path | What it is | Owner-verified |
|---|---|---|
| `backend/app/api/crew.py`, `backend/app/api/skills.py` | crew films with gates; Skill Lab | no |
| `video/crew/` (`graph.py`, `run.py`, `director.py`, `planner.py`, `producer.py`, `scout.py`, `searcher.py`, `state.py`, `verifier.py`, `writer.py`) | LangGraph six-agent film | no |
| `frontend/app/crew/`, `frontend/components/crew.tsx` | crew UI | no |

### cinema
| Path | What it is | Owner-verified |
|---|---|---|
| `backend/app/api/cinema.py` | cinema projects API | no |
| `video/cinema.py` | Veo film steps, `project.json` state | no |
| `frontend/app/studio/cinema/` | cinema pages | no |

### slide-skills
| Path | What it is | Owner-verified |
|---|---|---|
| `backend/app/api/slideskills.py`, `backend/app/api/picturerules.py` | slide looks, subjects, demos; picture rules | no |
| `video/slideskill.py`, `video/picrules.py` | look builder; learned picture rules | no |
| `frontend/app/skills/`, `frontend/app/rules/`, `frontend/components/skills.tsx`, `skill-subjects.tsx`, `skillcard.tsx`, `frontend/lib/skills.ts` | skills UI | no |

### landing
| Path | What it is | Owner-verified |
|---|---|---|
| `frontend/app/page.tsx`, `frontend/app/landing.css` | the Drishyya marketing page | no |
| `frontend/components/landing/` (`hero-deck`, `decks`, `monitor`, `platform`, `scene`, `loop-video`) | landing sections | no |
| `frontend/app/icon.svg`, `apple-icon.png` | favicon, home-screen icon | no |
| `video/src/landing/`, `video/landing-render.mjs` | marketing films rendered into `frontend/public/landing` | no |
| `docs/landing/` | video prompts for the hero | no |

### V1 branches not yet in code
accounts, plan-script, record, transcribe-clean, visuals, render-deliver, payments, ops: no folders yet. Each new
folder is added here in the same change that creates it.

## LEAVES
Leaves with an LLD so far: `documentary/create-film`, `audio-films/create-and-plan` (see docs/system/lld/).
