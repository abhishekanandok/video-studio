# TRUNK · Config

> DRAFT — not verified by owner

## Responsibility
One place that reads settings and secrets for the API and for every pipeline process.

## Technology and why
pydantic-settings `Settings` reading `backend/.env` (`backend/app/config.py:5`). ADR 0001 covers the stack.

## Where it lives
`backend/app/config.py:7-43`; imported as `app.config.settings` by the API **and** by `video/*.py` (they add
`../backend` to `sys.path`; cinema runs with `cwd=../backend` so `.env` is found).

## Setting names (values never written here)
- Database: `database_url`.
- Models: `gemini_vertex` (False), `gemini_model` / `gemini_model_smart` (gemini-3.8-flash), `openai_model` (gpt-5-mini),
  `openai_model_smart` (gpt-5), `openai_vision_model`, `gemini_image_model` (gemini-3.1-flash-image),
  `whisper_model` (large-v3-turbo).
- Veo: `veo_project`, `veo_location` (us-central1), `veo_model` (veo-3.1-generate-001), `google_application_credentials` (a path).
- ComfyUI: `comfy_url` (127.0.0.1:8188), `comfy_unet`, `comfy_clip`, `comfy_vae`, `comfy_steps` (25), `comfy_timeout_sec` (1200).
- Behaviour: `llm_rate_limit_retries` (6), `llm_timeout_sec` (480), `frontend_url` (localhost:3030).
- Secrets (empty by default): `gemini_api_key`, `google_api_key`, `openai_api_key`, `veo_api_key`.
- Outside Settings: env `VIDEO_STUDIO_GPU_LOCK` (`gpulock.py`).

## How branches depend on it
All branches and all pipelines. Changing a setting name breaks the engine as well as the API.

## Failure modes
- Missing key → the first AI call fails deep inside a pipeline, not at startup (no validation at boot).
- `comfy._video` mutates `settings.comfy_timeout_sec` at runtime (`comfy.py:170-175`): not thread-safe.
- `motion.py:114` copies the credentials path into the process environment.
- README says the Veo service-account file is read by absolute path from the Tayyari repo: a cross-repo secret dependency.

## Limits (measured)
n/a

## Proven by
None.

## Open questions
- Validate required keys at startup?
- Where do secrets live in production (host env vars, a secret manager)?
