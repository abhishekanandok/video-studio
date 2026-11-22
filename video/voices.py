"""Record the same Hinglish lines in every Gemini voice so the app can offer them side by side.

Run from backend/:  .venv/bin/python ../video/voices.py   ->  video/public/voices/<model>/<Voice>.wav + voices.json
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, os.path.dirname(__file__))

import pipeline as base  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "public", "voices")

# Google's published character for each prebuilt voice.
VOICES = {
    "Zephyr": "Bright", "Puck": "Upbeat", "Charon": "Informative", "Kore": "Firm", "Fenrir": "Excitable", "Leda": "Youthful",
    "Orus": "Firm", "Aoede": "Breezy", "Callirrhoe": "Easy-going", "Autonoe": "Bright", "Enceladus": "Breathy",
    "Iapetus": "Clear", "Umbriel": "Easy-going", "Algieba": "Smooth", "Despina": "Smooth", "Erinome": "Clear",
    "Algenib": "Gravelly", "Rasalgethi": "Informative", "Laomedeia": "Upbeat", "Achernar": "Soft", "Alnilam": "Firm",
    "Schedar": "Even", "Gacrux": "Mature", "Pulcherrima": "Forward", "Achird": "Friendly", "Zubenelgenubi": "Casual",
    "Vindemiatrix": "Gentle", "Sadachbia": "Lively", "Sadaltager": "Knowledgeable", "Sulafat": "Warm",
}
SAMPLE = ("29 October 1969. UCLA की एक computer lab में, आधी रात को, इतिहास लिखा जा रहा था। "
          "उन्होंने L type किया... फिर O... और system crash हो गया। दोस्तों, यहीं से network की कहानी शुरू होती है।")
MODELS = [base.TTS_MODEL]  # stable only: no preview TTS models


def record(c, model: str, voice: str) -> bool:
    from google.genai import types
    path = os.path.join(OUT, model, f"{voice}.wav")
    if os.path.exists(path):
        return True
    for attempt in range(6):
        try:
            r = c.models.generate_content(model=model, contents="Narrate this like a warm Hindi documentary co-host, natural and "
                                                                 "conversational, not like reading:\n" + SAMPLE,
                                          config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=types.SpeechConfig(
                                              voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)))))
            base._wav(path, r.candidates[0].content.parts[0].inline_data.data)
            return True
        except Exception as e:
            if "404" in str(e) or "NOT_FOUND" in str(e):
                return False
            time.sleep(min(60, 8 * (attempt + 1)))
    return False


def main() -> None:
    c = base.client()
    models = []
    for m in MODELS:
        os.makedirs(os.path.join(OUT, m), exist_ok=True)
        if record(c, m, "Charon"):
            models.append(m)
            print("model available:", m, flush=True)
        else:
            os.rmdir(os.path.join(OUT, m))
    for m in models:
        with ThreadPoolExecutor(5) as ex:
            ok = list(ex.map(lambda v: record(c, m, v), VOICES))
        print(m, sum(ok), "voices recorded", flush=True)
    json.dump({"sample": SAMPLE, "models": models, "voices": [{"name": v, "character": ch} for v, ch in VOICES.items()]},
              open(os.path.join(OUT, "voices.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
