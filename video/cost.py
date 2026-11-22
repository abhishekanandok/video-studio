"""What a film costs: every paid call records its real usage (the token counts Google returns with each response, or the
seconds of video Veo made) into public/<slug>/cost.json, priced with the table below.

Only successful calls are billed by Google (429s and errors are free), and only successful calls reach record(). Retakes
that succeed (a voice take that was too long, a repaint) are real spend and are counted.

Prices: USD, Vertex AI global endpoint, from https://cloud.google.com/vertex-ai/generative-ai/pricing (checked 2026-09-28);
TTS from https://ai.google.dev/gemini-api/docs/pricing (not listed on the Vertex page). Update PRICES when Google changes them.
"""

import datetime
import json
import os
import threading

# per 1M tokens: in / out (above 200k prompt tokens: in_long / out_long); Veo: per second of video
PRICES = {
    "gemini-3.1-pro-preview": {"in": 2.00, "out": 12.00, "in_long": 4.00, "out_long": 18.00},
    "gemini-3.8-flash": {"in": 0.75, "out": 3.75, "until": "2026-12-31", "after": {"in": 1.50, "out": 7.50}},
    "gemini-3.1-flash-image": {"in": 0.50, "out": 60.00},  # output is image tokens (1K image = 1120 tokens = $0.067)
    "gemini-3.1-flash-tts-preview": {"in": 1.00, "out": 20.00},  # output is audio tokens (25 per second)
    "veo-3.1-generate-001": {"second": 0.20, "second_audio": 0.40},  # 720p/1080p
    "veo-3.1-generate-preview": {"second": 0.20, "second_audio": 0.40},
    "veo-3.1-fast-generate-001": {"second": 0.10, "second_audio": 0.12},  # 1080p
}

_lock = threading.Lock()
_path = ""
_stage = "setup"


def start(out_dir: str) -> None:
    """Point the ledger at a film's folder and hook the shared LLM client so every text call is counted."""
    global _path
    _path = os.path.join(out_dir, "cost.json")
    try:
        import app.llm as llm
        llm.USAGE_HOOK = lambda model, usage: tokens(model, usage)
        llm.COST_HOOK = lambda model, usd, tin, tout: _add(model, usd, tokens_in=tin, tokens_out=tout)
    except Exception:
        pass


def stage(name: str) -> None:
    global _stage
    if name and name not in ("paused", "failed", "done", "stopped"):
        _stage = name


def _price(model: str) -> dict | None:
    p = PRICES.get(model)
    if p and p.get("until") and datetime.date.today().isoformat() > p["until"]:
        p = {**p, **p["after"]}
    return p


def tokens(model: str, usage) -> None:
    """A Gemini response's usage_metadata: prompt tokens in; answer + thinking tokens out."""
    if usage is None:
        return
    tin = getattr(usage, "prompt_token_count", 0) or 0
    tout = (getattr(usage, "candidates_token_count", 0) or 0) + (getattr(usage, "thoughts_token_count", 0) or 0)
    p = _price(model)
    usd = None
    if p and "in" in p:
        long = tin > 200_000 and "in_long" in p
        usd = (tin * (p["in_long"] if long else p["in"]) + tout * (p["out_long"] if long else p["out"])) / 1_000_000
    _add(model, usd, tokens_in=tin, tokens_out=tout)


def video(model: str, seconds: float, audio: bool) -> None:
    p = _price(model)
    usd = seconds * p["second_audio" if audio else "second"] if p else None
    _add(model, usd, seconds=seconds)


def _add(model: str, usd: float | None, **units) -> None:
    if not _path:
        return
    with _lock:
        d = json.load(open(_path)) if os.path.exists(_path) else {"total_usd": 0.0, "stages": {}, "models": {}, "unpriced": []}
        for bucket in (d["stages"].setdefault(_stage, {}), d["models"].setdefault(model, {})):
            bucket["calls"] = bucket.get("calls", 0) + 1
            bucket["usd"] = round(bucket.get("usd", 0.0) + (usd or 0.0), 6)
            for k, v in units.items():
                bucket[k] = round(bucket.get(k, 0) + v, 3)
        if usd is None and model not in d["unpriced"]:
            d["unpriced"].append(model)  # counted, but no price known: shown so the total is never silently low
        d["total_usd"] = round(d["total_usd"] + (usd or 0.0), 6)
        d["updated"] = datetime.datetime.now().isoformat(timespec="seconds")
        tmp = f"{_path}.{os.getpid()}.{threading.get_ident()}"
        json.dump(d, open(tmp, "w"), indent=1)
        os.replace(tmp, _path)
