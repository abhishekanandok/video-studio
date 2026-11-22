# TRUNK · AI clients

> DRAFT — not verified by owner

## Responsibility
One way for every branch to call language, vision, image, speech and video models, with retries and cost tracking.

## Technology and why
Gemini by default, OpenAI as an alternative, Veo for video, faster-whisper locally for transcription, ComfyUI locally
(Qwen-Image, Wan 2.2) for pictures/clips. ADR 0005 (RECONSTRUCTED).

## Where it lives
- `backend/app/llm.py`: `GeminiLLM`, `OpenAILLM`, `get_llm()` singleton (`:28`, `:114`), `set_llm()` for tests (`:234`),
  `USAGE_HOOK` for cost.
  - Gemini: request timeout `llm_timeout_sec` (480 s, `:120-121`); `_generate_once` (`:141-164`) **retries forever** on
    network errors and on the fast model's 429/5xx, backoff 10–60 s with jitter; the smart model falls back to fast after
    6 retries or 2 server errors; images retry 6× (`:198-206`).
  - OpenAI: `max_retries=4`, `timeout=600` (`:31`).
- `video/pipeline.py`: `client()`, `paint()` (image, retries forever on transient errors, `:157`), `speak()` (TTS model
  `gemini-3.8-flash-tts`, `:32`), Gemini client timeout 240 s (`:128`).
- `backend/app/comfy.py`: urllib calls 5–300 s, workflow deadline `comfy_timeout_sec` (1800 s for video), no retries.
- `video/motion.py`: Veo client; `video/cinema.py` Veo shots (~$0.40/s with sound, `cinema.py:806`).
- `video/audiofilm.py:135`: faster-whisper with `word_timestamps=True`.
- `video/cost.py`: writes `cost.json` per film (tracked, not capped).

## How branches depend on it
Every pipeline. Model names come from config (see config.md).

## Failure modes
- Endless retries: a network outage or a quota wall makes a job look alive forever, with no progress and no error.
- TTS: 8 tries × up to 60 s sleep, ×4 takes per scene in `converse` (`doc.py:434,520`): one bad scene can stall ~30 min.
- No global spend cap; Veo is the expensive one.

## Limits (measured)
unknown

## Proven by
None (`set_llm` exists to inject a fake).

## Open questions
- A retry budget per call and per job, then fail loudly?
- A per-job cost cap enforced before each paid call?
