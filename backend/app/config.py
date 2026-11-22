from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://prep:prep@localhost:5442/videostudio"

    # Set either key. If both are present Gemini is used.
    gemini_api_key: str = ""
    google_api_key: str = ""  # accepted as an alias for gemini_api_key
    # true = call Gemini through Vertex AI (billed to Google Cloud credits, e.g. the free trial);
    # false = AI Studio's Gemini API (billed to AI Studio prepaid credits)
    gemini_vertex: bool = False
    # "gemini" | "openrouter" | "openai": use this provider even when other keys are set (e.g. OpenRouter credits ran
    # out: LLM_PROVIDER_OVERRIDE=gemini GEMINI_VERTEX=true sends every call to Gemini on Vertex AI)
    llm_provider_override: str = ""
    gemini_model: str = "gemini-3.8-flash"
    gemini_model_smart: str = "gemini-3.8-flash"  # stable models only (user, 2026-10-03): previews hit low rate limits

    openai_api_key: str = ""
    openai_model: str = "gpt-5-mini"
    openai_model_smart: str = "gpt-5"
    openai_vision_model: str = "gpt-5-mini"

    gemini_image_model: str = "gemini-3.1-flash-image"

    # OpenRouter (one key, many models). When set, it writes every chat turn, plan and script; pictures never come from
    # it (always Google on Vertex, llm.vertex_image); Gemini, if its key is also set, keeps search grounding, voices, picture checks.
    openrouter_api_key: str = ""
    # GLM 5.3 (user, 2026-10-22: no Claude Sonnet, too costly). Tested against DeepSeek V4 Pro/Flash on a Hinglish chapter
    # and a chat turn: GLM was the fastest (7 s / 2.6 s), wrote the most natural Hinglish and is the cheapest ($0.08/$1.40 per 1M)
    openrouter_model: str = "z-ai/glm-5.3"  # chat turns and quick rewrites
    openrouter_model_smart: str = "z-ai/glm-5.3"  # plans and scripts
    openrouter_vision_model: str = "z-ai/glm-5.3-flash"  # checks a found photo fits its line (GLM 5.3 itself can't see)
    # audio films (video/audiofilm.py): Qwen-Image on the local ComfyUI draws the pictures, faster-whisper transcribes
    comfy_url: str = "http://127.0.0.1:8188"
    comfy_unet: str = "qwen_image_2.1_int8_convrot.safetensors"
    comfy_clip: str = "qwen3vl_8b_int8_convrot.safetensors"
    comfy_vae: str = "qwen_image_2.1_vae_bf16.safetensors"
    comfy_steps: int = 25
    comfy_timeout_sec: int = 1200
    whisper_model: str = "large-v3-turbo"
    # Veo (cinematic video shots in films). The Vertex express key can't reach it: give either an AI Studio key on a billed
    # project (veo_api_key) or a Vertex project with a service-account JSON (veo_project + google_application_credentials).
    veo_api_key: str = ""
    veo_project: str = ""
    veo_location: str = "us-central1"
    veo_model: str = "veo-3.1-generate-001"
    google_application_credentials: str = ""
    # rate-limit handling: retries with exponential backoff (seconds), then fall back to the fast model
    llm_rate_limit_retries: int = 6
    llm_timeout_sec: int = 480

    frontend_url: str = "http://localhost:3030"


    @property
    def gemini_key(self) -> str:
        return self.gemini_api_key or self.google_api_key

    @property
    def llm_provider(self) -> str | None:
        """'openrouter' if an OpenRouter key is set, else 'gemini', else 'openai', else None (llm_provider_override wins)."""
        if self.llm_provider_override:
            return self.llm_provider_override
        if self.openrouter_api_key:
            return "openrouter"
        if self.gemini_key:
            return "gemini"
        if self.openai_api_key:
            return "openai"
        return None


settings = Settings()

