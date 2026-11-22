"""LLM access for every graph node, via `get_llm()`.

Provider is chosen from the keys in backend/.env: GEMINI_API_KEY (preferred when present) or OPENAI_API_KEY.
Both clients expose the same four methods, so graphs don't care which one is active. Tests swap in a fake via set_llm().
"""

import base64
import random
import threading
import time
from typing import TypeVar

from pydantic import BaseModel

from app.config import settings

T = TypeVar("T", bound=BaseModel)

NO_KEY_MESSAGE = "No AI key configured: add GEMINI_API_KEY or OPENAI_API_KEY to backend/.env and restart the backend."


class NoLLMConfigured(RuntimeError):
    pass


class OpenAILLM:
    name = "openai"

    def __init__(self) -> None:
        from openai import OpenAI

        self.client = OpenAI(api_key=settings.openai_api_key, max_retries=4, timeout=600)

    def _model(self, smart: bool) -> str:
        return settings.openai_model_smart if smart else settings.openai_model

    def structured(self, schema: type[T], system: str, user: str, *, smart: bool = False, max_tokens: int = 24000) -> T:
        resp = self.client.responses.parse(model=self._model(smart), instructions=system, input=user, text_format=schema)
        if resp.output_parsed is None:
            raise ValueError(f"model returned no parsable {schema.__name__}")
        return resp.output_parsed

    def text(self, system: str, user: str, *, smart: bool = False) -> str:
        return self.client.responses.create(model=self._model(smart), instructions=system, input=user).output_text

    def web_search(self, schema: type[T], system: str, user: str) -> T:
        """Structured answer grounded in live web search (used to find missing resources)."""
        resp = self.client.responses.parse(model=settings.openai_model_smart, instructions=system, input=user,
                                           tools=[{"type": "web_search"}], text_format=schema)
        if resp.output_parsed is None:
            raise ValueError("web search returned nothing parsable")
        return resp.output_parsed

    def generate_image(self, prompt: str) -> bytes | None:
        return None  # not used with OpenAI

    def transcribe_image(self, png: bytes, instruction: str) -> str:
        data_url = "data:image/png;base64," + base64.b64encode(png).decode()
        resp = self.client.responses.create(
            model=settings.openai_vision_model,
            input=[{"role": "user", "content": [{"type": "input_text", "text": instruction}, {"type": "input_image", "image_url": data_url}]}],
        )
        return resp.output_text


def _is_rate_limit(e: Exception) -> bool:
    s = str(e)
    if "402" in s or "credits are depleted" in s:
        return False
    if isinstance(e, TimeoutError) or "timed out" in s.lower() or "timeout" in type(e).__name__.lower():
        return True
    return any(x in s for x in ("429", "RESOURCE_EXHAUSTED", "500 INTERNAL", "503", "UNAVAILABLE", "504", "DEADLINE_EXCEEDED"))


def is_network(e: Exception) -> bool:
    """The Mac lost the internet or DNS (not Google's fault): worth waiting for, however long it takes."""
    s = f"{type(e).__name__} {e}".lower()
    return any(x in s for x in ("nodename nor servname", "name or service not known", "connecterror", "connection reset",
                                "connection refused", "network is unreachable", "temporary failure in name resolution",
                                "remoteprotocolerror", "connection aborted", "errno 8", "errno 51", "errno 65"))


def transient(e: Exception) -> bool:
    """A failure that goes away if you wait: the internet dropping, Google's per-minute quota, Google's servers."""
    return is_network(e) or _is_rate_limit(e)


def wait_before_retry(e: Exception, attempt: int) -> float:
    """Every 10 seconds for a dropped internet; 10 seconds rising to at most a minute for Google's quota and servers."""
    return 10.0 if is_network(e) else min(60.0, 10.0 * 1.5 ** min(attempt, 6))


def inline_schema(schema: type[BaseModel]) -> dict:
    """Pydantic JSON schema with every $ref inlined and titles dropped (Gemini supports a narrower JSON-schema subset)."""
    raw = schema.model_json_schema()
    defs = raw.pop("$defs", {})

    def walk(node, in_properties=False):
        if isinstance(node, dict):
            if "$ref" in node and not in_properties:
                return walk(defs[node["$ref"].split("/")[-1]])
            # keys inside "properties" are field names (a field may be called "title"); elsewhere "title" is annotation
            return {k: walk(v, in_properties=(k == "properties" and not in_properties))
                    for k, v in node.items() if in_properties or k != "title"}
        if isinstance(node, list):
            return [walk(x) for x in node]
        return node

    return walk(raw)


class GeminiLLM:
    name = "gemini"

    def __init__(self) -> None:
        from google import genai

        from google.genai import types

        # A request that never answers must not hang a job forever: time out and let the retry logic take over.
        self.client = genai.Client(vertexai=settings.gemini_vertex, api_key=settings.gemini_key,
                                   http_options=types.HttpOptions(timeout=settings.llm_timeout_sec * 1000))

    def _model(self, smart: bool) -> str:
        return settings.gemini_model_smart if smart else settings.gemini_model

    def _generate(self, model: str, contents, config) -> str:
        """Call Gemini, riding out per-minute rate limits; if the smart model stays limited, use the fast one."""
        models = [model] + ([settings.gemini_model] if model != settings.gemini_model else [])
        for i, m in enumerate(models):
            try:
                return self._generate_once(m, contents, config)
            except Exception as e:
                if not _is_rate_limit(e) or i == len(models) - 1:
                    raise

    def _generate_once(self, model: str, contents, config) -> str:
        """Retries forever while the failure is one that waiting fixes (no internet, Google's quota, Google's servers on the
        fast model); a strong model that keeps failing on Google's side hands over to the fast one; anything else raises."""
        server_errors = 0
        attempt = -1
        while True:
            attempt += 1
            try:
                resp = self.client.models.generate_content(model=model, contents=contents, config=config)
                break
            except Exception as e:
                if not transient(e):
                    raise
                if is_network(e):
                    print(f"  no internet ({str(e)[:60]}): waiting 10s and trying again (attempt {attempt + 1})", flush=True)
                    time.sleep(10)
                    continue
                if model != settings.gemini_model and attempt >= settings.llm_rate_limit_retries:
                    raise  # the strong model stays limited: hand over to the fast one (which, having no fallback, retries forever)
                # a model that keeps failing on Google's side (500/503/504, timeouts) is not going to recover in time:
                # after two such errors, give up on it so the caller falls back to the fast model instead of stalling
                if not ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)):
                    server_errors += 1
                    if server_errors >= 2 and model != settings.gemini_model:
                        print(f"  gemini {model} failing on Google's side; falling back to {settings.gemini_model}", flush=True)
                        raise
                # visible in a film's pipeline.log (and the backend log): a stall must never be silent
                print(f"  gemini {model} busy or slow (attempt {attempt + 1}): {str(e)[:90]}; retrying", flush=True)
                time.sleep(wait_before_retry(e, attempt) * random.uniform(0.8, 1.2))
        if USAGE_HOOK:
            USAGE_HOOK(model, getattr(resp, "usage_metadata", None))
        if not resp.text:
            raise ValueError(f"Gemini returned no text (finish reason: {resp.candidates[0].finish_reason if resp.candidates else 'none'})")
        return resp.text

    def structured(self, schema: type[T], system: str, user: str, *, smart: bool = False, max_tokens: int = 24000) -> T:
        from google.genai import types

        # capped: a reply that loops ("...Next. Valid. Fine" for 200,000 characters) is cut off in seconds, not minutes, and
        # the caller treats it as a failed draft
        # no thinking: left unbounded, Gemini 3.8 Flash thought until an 8-minute 504 on an 8-line scene pick that "low"
        # answered in 37 s, and under queue contention "low" still took 453 s where budget 0 took 27 s (2026-10-22)
        config = types.GenerateContentConfig(system_instruction=system, response_mime_type="application/json",
                                             response_json_schema=inline_schema(schema), max_output_tokens=max_tokens,
                                             # a judgement call (smart: plans, scene picks) thinks a little; with no thinking at
                                             # all, scene picks repeated the first line and leaked "wait, ..." into fields
                                             thinking_config=types.ThinkingConfig(thinking_level="low") if smart else types.ThinkingConfig(thinking_budget=0))
        return schema.model_validate_json(self._generate(self._model(smart), user, config))

    def text(self, system: str, user: str, *, smart: bool = False) -> str:
        from google.genai import types

        return self._generate(self._model(smart), user, types.GenerateContentConfig(system_instruction=system))

    def web_search(self, schema: type[T], system: str, user: str) -> T:
        # Search grounding and JSON output can't be combined in one call: search first, then structure the findings.
        from google.genai import types

        found = self._generate(settings.gemini_model_smart, user, types.GenerateContentConfig(
            system_instruction=system + "\nList each resource with its exact URL, title, topic and whether it is a YouTube video, playlist or web page.",
            tools=[types.Tool(google_search=types.GoogleSearch())]))
        return self.structured(schema, "Convert these search findings into the schema. Keep only URLs that appear in the text.", found)

    def generate_image(self, prompt: str, refs: list[bytes] | None = None, aspect: str | None = None) -> bytes | None:
        return vertex_image(prompt, refs, aspect)

    def transcribe_image(self, png: bytes, instruction: str) -> str:
        from google.genai import types

        return self._generate(settings.gemini_model, [types.Part.from_bytes(data=png, mime_type="image/png"), instruction], None)

    def look(self, schema: type[T], image: bytes, instruction: str, mime: str = "image/jpeg", model: str | None = None) -> T:
        """Gemini looks at one picture and answers in the schema (photo checks, a shot's self-review, collage pieces).
        `model` names an OpenRouter model and is ignored here: Gemini is the model."""
        from google.genai import types

        config = types.GenerateContentConfig(response_mime_type="application/json", response_json_schema=inline_schema(schema), max_output_tokens=10000)
        return schema.model_validate_json(self._generate(settings.gemini_model, [types.Part.from_bytes(data=image, mime_type=mime), instruction], config))


_VERTEX_IMAGES = None  # the Vertex image client, made once
_VERTEX_LOCK = threading.Lock()  # pictures are drawn in parallel: one thread makes the client, the rest wait for it
# Google's image quota is per minute: a picture keeps trying this long (a quota that does not come back by then is a
# daily limit or billing, and the error is raised)
IMAGE_RETRY_SEC = 600


def vertex_image(prompt: str, refs: list[bytes] | None = None, aspect: str | None = None) -> bytes | None:
    """Every picture the app draws: Google's image model on Vertex AI (whatever writes the text), optionally guided by
    reference pictures and drawn at an aspect ratio ("16:9"); None if the model returns no image."""
    from google import genai
    from google.genai import types

    global _VERTEX_IMAGES
    # made under a lock: two threads that each made one would replace each other's, and the SDK closes a replaced
    # client's connection in __del__ while the other thread is still sending on it ("the client has been closed")
    with _VERTEX_LOCK:
        if _VERTEX_IMAGES is None:
            _VERTEX_IMAGES = genai.Client(vertexai=True, api_key=settings.gemini_key or None,
                                          http_options=types.HttpOptions(timeout=settings.llm_timeout_sec * 1000))
    contents = [types.Part.from_bytes(data=r, mime_type="image/png") for r in refs or []] + [prompt] if refs else prompt
    config = types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"], **({"image_config": types.ImageConfig(aspect_ratio=aspect)} if aspect else {}))
    start, attempt, empty = time.time(), -1, 0
    while True:
        attempt += 1
        try:
            resp = _VERTEX_IMAGES.models.generate_content(model=settings.gemini_image_model, contents=contents, config=config)
            if USAGE_HOOK:  # images are priced too (a film's cost.json)
                USAGE_HOOK(settings.gemini_image_model, getattr(resp, "usage_metadata", None))
        except Exception as e:
            if not transient(e) or time.time() - start > IMAGE_RETRY_SEC:
                raise
            pause = wait_before_retry(e, attempt) * random.uniform(0.8, 1.2)
            # visible in the film's log: a picture waiting on Google's quota must never look like a hang
            print(f"  image model busy (attempt {attempt + 1}): {str(e)[:80]}; trying again in {pause:.0f}s", flush=True)
            time.sleep(pause)
            continue
        for c in resp.candidates or []:
            for part in (c.content.parts if c.content else []) or []:
                if part.inline_data and part.inline_data.data:
                    return part.inline_data.data
        # an answer with no picture (a safety block, or the model replied in words): say why, and ask twice more
        cand = (resp.candidates or [None])[0]
        why = getattr(cand, "finish_reason", None) or getattr(resp, "prompt_feedback", None) or "no candidates"
        said = " ".join(p.text for p in ((cand.content.parts if cand and cand.content else []) or []) if p.text)[:120]
        empty += 1
        print(f"  image model returned no picture ({why}){': ' + said if said else ''}"
              f"{'; asking again' if empty < 3 else '; giving up on this one'}", flush=True)
        if empty >= 3:
            return None


class OpenRouterLLM:
    """OpenRouter's text model (GLM 5.3) writes; Google on Vertex draws (vertex_image). Everything Google-only (search grounding, voices,
    reading pictures, and code that reaches for `.client`) goes to Gemini when its key is set."""

    name = "openrouter"

    def __init__(self) -> None:
        from openai import OpenAI

        self.client_or = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=settings.openrouter_api_key,
                                max_retries=4, timeout=settings.llm_timeout_sec)
        self.gemini = GeminiLLM() if settings.gemini_key else None

    def __getattr__(self, attr):  # .client, ._generate, ... used directly by the pipeline
        gemini = self.__dict__.get("gemini")
        if gemini is None:
            raise AttributeError(f"{attr} needs Google: add GEMINI_API_KEY to backend/.env")
        return getattr(gemini, attr)

    def _model(self, smart: bool) -> str:
        return settings.openrouter_model_smart if smart else settings.openrouter_model

    def _chat(self, model: str, messages: list, **kw):
        for attempt in range(settings.llm_rate_limit_retries + 1):
            try:
                extra = {**kw.pop("extra_body", {}), "usage": {"include": True}}  # OpenRouter then returns the exact USD cost
                resp = self.client_or.chat.completions.create(model=model, messages=messages, extra_body=extra, **kw)
                if not resp.choices:  # OpenRouter reports a provider's error as a 200 with an error object and no choices
                    err = resp.model_dump().get("error") or {}
                    code = err.get("code") if isinstance(err, dict) else None
                    msg = err.get("message", "") if isinstance(err, dict) else str(err)
                    # only a busy or failing provider is worth waiting for; a refused request ("Schema is too complex") is not
                    busy = code in (408, 429, 500, 502, 503, 504) or code is None and not msg
                    raise RuntimeError(f"{'503' if busy else 'refused'} {model}: {msg[:150]}")
                u = resp.model_dump().get("usage") or {}
                if COST_HOOK:
                    COST_HOOK(model, u.get("cost"), u.get("prompt_tokens") or 0, u.get("completion_tokens") or 0)
                return resp
            except Exception as e:
                if not (transient(e) or "502" in str(e)) or attempt == settings.llm_rate_limit_retries:
                    raise
                print(f"  openrouter {model} busy (attempt {attempt + 1}): {str(e)[:90]}; retrying", flush=True)
                time.sleep(wait_before_retry(e, attempt))

    def structured(self, schema: type[T], system: str, user: str, *, smart: bool = False, max_tokens: int = 24000) -> T:
        import json

        js = inline_schema(schema)
        msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        try:
            if self._model(smart).startswith("anthropic/"):
                # Claude's structured output stalls for minutes and then refuses most of our schemas ("Schema is too
                # complex"); it follows a schema given in the prompt reliably, so go straight to that
                raise RuntimeError("refused: schema given in the prompt for Claude")
            resp = self._chat(self._model(smart), msgs, max_tokens=max_tokens,
                              response_format={"type": "json_schema", "json_schema": {"name": schema.__name__, "strict": False, "schema": js}})
        except Exception as e:
            if "refused" not in str(e) and "schema" not in str(e).lower():
                raise
            # Claude's structured output refuses big schemas ("Schema is too complex"): give it the schema in words instead,
            # and let pydantic check the answer
            if not self._model(smart).startswith("anthropic/"):
                print(f"  {self._model(smart)}: schema too complex for structured output, asking for plain JSON", flush=True)
            msgs[0]["content"] = (system + "\n\nReply with ONLY one JSON object (no prose, no code fences) that matches this JSON "
                                  "schema exactly:\n" + json.dumps(js, ensure_ascii=False))
            resp = self._chat(self._model(smart), msgs, max_tokens=max_tokens)
        try:
            return schema.model_validate_json(self._json(resp))
        except Exception as e:
            if "content" in msgs[0] and "Reply with ONLY one JSON object" in msgs[0]["content"]:
                raise
            # constrained JSON can loop ('"# # # # ...' for a colour) or break off: once more, with the schema in the prompt
            print(f"  {self._model(smart)}: broken JSON ({str(e)[:60]}), asking again with the schema in the prompt", flush=True)
            msgs[0]["content"] = (system + "\n\nReply with ONLY one JSON object (no prose, no code fences) that matches this JSON "
                                  "schema exactly:\n" + json.dumps(js, ensure_ascii=False))
            return schema.model_validate_json(self._json(self._chat(self._model(smart), msgs, max_tokens=max_tokens)))

    @staticmethod
    def _json(resp) -> str:
        raw = (resp.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        if not raw.startswith("{"):  # a sentence before the object
            raw = raw[raw.find("{"): raw.rfind("}") + 1]
        return raw

    def text(self, system: str, user: str, *, smart: bool = False) -> str:
        resp = self._chat(self._model(smart), [{"role": "system", "content": system}, {"role": "user", "content": user}])
        return resp.choices[0].message.content or ""

    def web_search(self, schema: type[T], system: str, user: str) -> T:
        if self.gemini:
            return self.gemini.web_search(schema, system, user)
        found = self._chat(settings.openrouter_model + ":online", [{"role": "system", "content": system + "\nList each resource with its exact URL."},
                                                                   {"role": "user", "content": user}]).choices[0].message.content or ""
        return self.structured(schema, "Convert these search findings into the schema. Keep only URLs that appear in the text.", found)

    def generate_image(self, prompt: str, refs: list[bytes] | None = None, aspect: str | None = None) -> bytes | None:
        return vertex_image(prompt, refs, aspect)  # pictures always come from Google on Vertex, never OpenRouter

    def look(self, schema: type[T], image: bytes, instruction: str, mime: str = "image/jpeg", model: str | None = None) -> T:
        """The vision model looks at one picture and answers in the schema (used to check a found photo fits its line)."""
        import json

        data_url = f"data:{mime};base64," + base64.b64encode(image).decode()
        ask = instruction + "\n\nReply with ONLY one JSON object matching this schema:\n" + json.dumps(inline_schema(schema))
        raw = (self._chat(model or settings.openrouter_vision_model, [{"role": "user", "content": [{"type": "image_url", "image_url": {"url": data_url}},
                                                                                   {"type": "text", "text": ask}]}],
                          max_tokens=4000).choices[0].message.content or "").strip()  # room to think before answering
        return schema.model_validate_json(raw[raw.find("{"): raw.rfind("}") + 1])

    def transcribe_image(self, png: bytes, instruction: str) -> str:
        if self.gemini:
            return self.gemini.transcribe_image(png, instruction)
        data_url = "data:image/png;base64," + base64.b64encode(png).decode()
        resp = self._chat(settings.openrouter_vision_model, [{"role": "user", "content": [{"type": "text", "text": instruction},
                                                                                    {"type": "image_url", "image_url": {"url": data_url}}]}])
        return resp.choices[0].message.content or ""


_llm = None
# Called with (model, usage_metadata) after every successful Gemini call; the film pipeline uses it to track cost.
USAGE_HOOK = None
# Called with (model, usd, tokens_in, tokens_out) after every OpenRouter call: OpenRouter reports the exact price itself.
COST_HOOK = None


def get_llm():
    global _llm
    if _llm is None:
        provider = settings.llm_provider
        if provider is None:
            raise NoLLMConfigured(NO_KEY_MESSAGE)
        _llm = OpenRouterLLM() if provider == "openrouter" else GeminiLLM() if provider == "gemini" else OpenAILLM()
    return _llm


def set_llm(llm) -> None:
    global _llm
    _llm = llm
