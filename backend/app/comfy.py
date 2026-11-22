"""Pictures from Qwen-Image 2.1 on the local ComfyUI (Comfy Desktop): one workflow per picture, PNG bytes back.

Qwen-Image draws legible English text, so a picture scene can carry its own words. ComfyUI must be running
(settings.comfy_url); if it isn't, ComfyDown says so instead of a stack trace.
"""

import json
import random
import time
import urllib.error
import urllib.parse
import urllib.request

from app.config import settings

# about 1 megapixel, multiples of 32
SIZES = {"16:9": (1344, 768), "9:16": (768, 1344), "1:1": (1024, 1024), "4:3": (1152, 864), "3:4": (864, 1152)}
NEGATIVE = "blurry, low quality, distorted, watermark, logo, garbled text, misspelled words"


class ComfyDown(RuntimeError):
    """ComfyUI isn't running."""


def _post(url: str, body: dict, timeout: float) -> dict:
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    return json.loads(raw) if raw else {}


def _get(url: str, timeout: float = 30) -> bytes:
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def alive() -> bool:
    try:
        _get(f"{settings.comfy_url}/system_stats", 5)
        return True
    except Exception:
        return False


def free() -> None:
    """Let go of ComfyUI's models (8 GB of VRAM: Whisper needs the GPU first)."""
    _loaded[0] = None
    try:
        _post(f"{settings.comfy_url}/free", {"unload_models": True, "free_memory": True}, 60)
    except Exception:
        pass  # not running: nothing to free


_loaded = [None]  # the model family this process last ran on ComfyUI: "qwen" | "wan" (None: unknown, e.g. another process)


def _switch(to: str) -> None:
    """One 8 GB card and 32 GB of RAM hold Qwen-Image or Wan 2.2, not both ("bad allocation"): before a workflow of the
    other family, ComfyUI unloads the models it holds (ComfyUI itself keeps running). Same family again: nothing to do."""
    if _loaded[0] != to:
        free()
        _loaded[0] = to


def _run(wf: dict) -> dict:
    """Queue a workflow, wait for it, return its outputs (raises with ComfyUI's own error message)."""
    try:
        pid = _post(f"{settings.comfy_url}/prompt", {"prompt": wf, "client_id": "video-studio"}, 60)["prompt_id"]
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"ComfyUI refused the workflow: {e.read().decode()[:400]}") from e
    except urllib.error.URLError as e:
        raise ComfyDown(f"ComfyUI isn't running at {settings.comfy_url}: open Comfy Desktop and try again.") from e
    deadline = time.time() + settings.comfy_timeout_sec
    while time.time() < deadline:
        time.sleep(2)
        h = json.loads(_get(f"{settings.comfy_url}/history/{pid}"))
        if pid not in h:
            continue
        st = h[pid].get("status", {})
        if st.get("status_str") == "error":
            msg = next((m[1].get("exception_message", "") for m in st.get("messages", []) if m[0] == "execution_error"), "")
            raise RuntimeError(f"ComfyUI failed: {msg[:300]}")
        if st.get("completed") or h[pid].get("outputs"):
            return h[pid]["outputs"]
    raise TimeoutError(f"ComfyUI took longer than {settings.comfy_timeout_sec}s")


def image(prompt: str, aspect: str = "16:9", seed: int | None = None) -> bytes:
    """One picture from Qwen-Image 2.1 (PNG bytes); one film on the GPU at a time (gpulock)."""
    from app import gpulock
    with gpulock.gpu("a picture"):
        return _image(prompt, aspect, seed)


def _image(prompt: str, aspect: str = "16:9", seed: int | None = None) -> bytes:
    """One picture from Qwen-Image 2.1 (PNG bytes)."""
    w, h = SIZES.get(aspect, SIZES["16:9"])
    _switch("qwen")
    wf = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": settings.comfy_unet, "weight_dtype": "default"}},
        "2": {"class_type": "QwenImage21Cache", "inputs": {"model": ["1", 0], "device": "auto", "dtype": "default"}},
        "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": settings.comfy_clip, "type": "qwen_image", "device": "default"}},
        "4": {"class_type": "VAELoader", "inputs": {"vae_name": settings.comfy_vae}},
        "5": {"class_type": "TextEncodeQwenImage21", "inputs": {"clip": ["3", 0], "prompt": prompt, "negative_prompt": NEGATIVE,
                                                                "resolution": 1024}},
        "6": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["2", 0], "positive": ["5", 0], "negative": ["5", 1],
                                                   "latent_image": ["6", 0], "seed": seed if seed is not None else random.randrange(2**48),
                                                   "steps": settings.comfy_steps, "cfg": 1.0, "sampler_name": "euler",
                                                   "scheduler": "simple", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["4", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "video-studio/img"}},
    }
    for out in _run(wf).values():
        for img in out.get("images", []):
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
            return _get(f"{settings.comfy_url}/view?{q}", 120)
    raise RuntimeError("ComfyUI finished without an image")


# ---------- motion: a picture brought to life by Wan 2.2 TI2V 5B (a few seconds of video from one still) ----------
WAN = {"unet": "wan2.2_ti2v_5B_fp16.safetensors", "clip": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "vae": "wan2.2_vae.safetensors"}
# Wan's own negative prompt (ComfyUI's template): oversaturated, static, blurry, subtitles, worst quality, extra limbs...
WAN_NEGATIVE = ("色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，"
                "多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走，"
                # an illustration made Wan paint the picture being drawn (a hand with a pencil came in, 2026-10-06)
                "hands, a hand holding a pencil, pen, brush, crayon, drawing tools, someone drawing or painting the picture, art supplies, "
                "paper being drawn on, new objects appearing, the scene changing into another scene, camera shake, jitter, "
                "wobbling, flicker, warping, morphing, melting, camera movement, zooming")


def _upload(png: bytes, name: str) -> str:
    import httpx
    r = httpx.post(f"{settings.comfy_url}/upload/image", files={"image": (name, png, "image/png")}, data={"overwrite": "true"}, timeout=60)
    r.raise_for_status()
    j = r.json()
    return f"{j['subfolder']}/{j['name']}" if j.get("subfolder") else j["name"]


def video(png: bytes, prompt: str, width: int = 832, height: int = 480, frames: int = 121, steps: int = 20,
          seed: int | None = None, timeout: float = 1800) -> bytes:
    """A moving clip from Wan 2.2 (see _video); one film on the GPU at a time (gpulock)."""
    from app import gpulock
    with gpulock.gpu("a moving clip"):
        return _video(png, prompt, width, height, frames, steps, seed, timeout)


def _video(png: bytes, prompt: str, width: int = 832, height: int = 480, frames: int = 121, steps: int = 20,
           seed: int | None = None, timeout: float = 1800) -> bytes:
    """A short clip (24 fps; 121 frames = 5 s) that starts from this picture and moves as the prompt says. MP4 bytes."""
    _switch("wan")
    src = _upload(png, f"motion-{int(time.time() * 1000)}.png")
    wf = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": WAN["unet"], "weight_dtype": "default"}},
        "2": {"class_type": "ModelSamplingSD3", "inputs": {"model": ["1", 0], "shift": 8.0}},
        "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": WAN["clip"], "type": "wan", "device": "default"}},
        "4": {"class_type": "VAELoader", "inputs": {"vae_name": WAN["vae"]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": prompt}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": WAN_NEGATIVE}},
        "7": {"class_type": "LoadImage", "inputs": {"image": src}},
        "8": {"class_type": "Wan22ImageToVideoLatent", "inputs": {"vae": ["4", 0], "start_image": ["7", 0], "width": width,
                                                                 "height": height, "length": frames, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["2", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["8", 0],
                                                   "seed": seed if seed is not None else random.randrange(2**48), "steps": steps,
                                                   "cfg": 5.0, "sampler_name": "uni_pc", "scheduler": "simple", "denoise": 1.0}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["4", 0]}},
        "11": {"class_type": "CreateVideo", "inputs": {"images": ["10", 0], "fps": 24}},
        "12": {"class_type": "SaveVideo", "inputs": {"video": ["11", 0], "filename_prefix": "video-studio/motion", "format": "mp4", "codec": "h264"}},
    }
    old = settings.comfy_timeout_sec
    settings.comfy_timeout_sec = timeout
    try:
        outs = _run(wf)
    finally:
        settings.comfy_timeout_sec = old
    for out in outs.values():
        for key in ("images", "videos", "gifs", "animated"):
            for v in out.get(key, []) if isinstance(out.get(key), list) else []:
                if isinstance(v, dict) and v.get("filename", "").endswith(".mp4"):
                    q = urllib.parse.urlencode({"filename": v["filename"], "subfolder": v.get("subfolder", ""), "type": v.get("type", "output")})
                    return _get(f"{settings.comfy_url}/view?{q}", 300)
    raise RuntimeError(f"ComfyUI finished without a video: {str(outs)[:200]}")
