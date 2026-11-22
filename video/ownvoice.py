"""The creator's own voice: one recording read off the teleprompter, cut into the per-line voice files the film expects.

    my-recording.<ext> ─► 24 kHz mono, loudness evened once (ownvoice/voice.wav)
                       ─► transcript with every word's start and end (faster-whisper, the audio film's model and settings)
                       ─► script words ↔ heard words, matched in order (a monotonic alignment on the words' consonants, so
                          Hinglish read off a Latin-script prompter still matches Whisper's Devanagari)
                       ─► one clip per line at voice_path(n, i), from its first heard word to its last

A line the creator skipped (too few of its words heard) gets a short silent clip: its picture stays on screen briefly
(the board builds every line from its clip, so none may be missing).
A misread line keeps what was actually said: words heard between two lines (a slip, an ad lib) stay with the line before,
so nothing the creator said is dropped. No AI voice is called. Everything is cached under public/<slug>/ownvoice/.

The teleprompter order (prompter) is the film's order: the cold open first, then each chapter, without trimmed lines.
backend/app/api/studio.py shows the same list on the page, so what is read is what is matched.
"""

import json
import os
import re
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
OPEN = 99  # archivedoc.OPEN: the cold open's chapter number
RATE = 24000  # archivedoc.props reads every voice file at 24 kHz
SILENT = 2.0  # seconds a skipped line's picture stays on screen
SKIPPED = 0.35  # a line with fewer than this share of its words heard (or fewer than 2) was not read


def _read(path: str, default=None):
    try:
        return json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return default


def prompter(base: str) -> list[dict]:
    """The lines to read, in film order: [{"n", "i", "speech"}]. Locked chapters bring their own audio; trimmed lines
    are left out of the film, so neither is read."""
    cuts = {tuple(c) for c in _read(os.path.join(base, "cuts.json"), []) or []}
    out = [{"n": OPEN, "i": i, "speech": ln["speech"]} for i, ln in enumerate((_read(os.path.join(base, "opener.json"), {}) or {}).get("lines", []))]
    names = sorted(x for x in os.listdir(base) if re.fullmatch(r"chapter\d\d\.json", x)) if os.path.isdir(base) else []
    for x in names:
        n, ch = int(x[7:9]), _read(os.path.join(base, x), {}) or {}
        if ch.get("locked"):
            continue
        out += [{"n": n, "i": i, "speech": ln["speech"]} for i, ln in enumerate(ch.get("lines", [])) if (n, i) not in cuts]
    return [x for x in out if x["speech"].strip()]


# ---------- matching words: consonants only, the same for Latin and Devanagari ----------
DEVA = {**dict.fromkeys("कक़", "k"), **dict.fromkeys("खख़", "k"), **dict.fromkeys("गग़", "g"), "घ": "g", "ङ": "n",
        "च": "c", "छ": "c", **dict.fromkeys("जज़", "j"), "झ": "j", "ञ": "n", "ट": "t", "ठ": "t", **dict.fromkeys("डड़", "d"),
        **dict.fromkeys("ढढ़", "d"), "ण": "n", "त": "t", "थ": "t", "द": "d", "ध": "d", "न": "n", "प": "p", **dict.fromkeys("फफ़", "f"),
        "ब": "b", "भ": "b", "म": "m", "य": "", "र": "r", "ल": "l", "व": "v", "श": "s", "ष": "s", "स": "s", "ह": "", "ं": "n",
        **{d: str(k) for k, d in enumerate("०१२३४५६७८९")}}
LATIN = [("ph", "f"), ("sh", "s"), ("ch", "c"), ("ck", "k"), ("qu", "k"), ("w", "v"), ("z", "j"), ("q", "k"), ("x", "ks"), ("c", "k")]


def skeleton(word: str) -> str:
    """A word's consonants, spelling-blind: "kahaani", "kahani" and "कहानी" are all "kn"; digits are kept."""
    w = "".join(DEVA.get(ch, "") if "ऀ" <= ch <= "ॿ" else ch for ch in word.lower())
    w = re.sub(r"[^a-z0-9]", "", w)
    for a, b in LATIN[:5]:
        w = w.replace(a, b)
    w = re.sub(r"[aeiouyh]", "", w)
    for a, b in LATIN[5:]:
        w = w.replace(a, b)
    return re.sub(r"(.)\1+", r"\1", w)


def _sim(a: str, b: str, cache: dict) -> float:
    """How alike two skeletons are (0-1); below 0.6 they are not the same word."""
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    k = (a, b)
    if k not in cache:
        from difflib import SequenceMatcher
        r = SequenceMatcher(None, a, b).ratio()
        cache[k] = r if r >= 0.6 and min(len(a), len(b)) >= 2 else 0.0
    return cache[k]


def align(script: list[str], heard: list[str]) -> list[int]:
    """For each script word, the index of the heard word it matches (or -1): the in-order pairing with the most total
    likeness (a weighted longest common subsequence). Skipped words, extra words and restarts simply go unpaired."""
    import numpy as np
    a, b = [skeleton(w) for w in script], [skeleton(w) for w in heard]
    S, T, cache = len(a), len(b), {}
    D = np.zeros((S + 1, T + 1), dtype=np.float32)
    for i in range(1, S + 1):
        s = np.array([_sim(a[i - 1], x, cache) for x in b], dtype=np.float32)
        cand = np.maximum(D[i - 1, 1:], np.where(s > 0, D[i - 1, :-1] + s, 0))
        D[i, 1:] = np.maximum.accumulate(np.maximum(cand, D[i, 0]))
    pair, i, j = [-1] * S, S, T
    while i > 0 and j > 0:
        s = _sim(a[i - 1], b[j - 1], cache)
        if s > 0 and abs(D[i, j] - (D[i - 1, j - 1] + s)) < 1e-4:
            pair[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif D[i, j] == D[i - 1, j]:
            i -= 1
        else:
            j -= 1
    return pair


# ---------- hearing the recording ----------
def _words(cfg: dict, src: str, work: str, st) -> list[dict]:
    """Every word heard: [{"w", "start", "end"}]. Cached: a second run (or a crash after it) does not listen again."""
    cached = _read(os.path.join(work, "words.json"))
    if cached is not None:
        return cached
    import audiofilm
    import numpy as np
    from app.config import settings
    wav16 = os.path.join(work, "whisper16k.wav")
    if not os.path.exists(wav16):
        audiofilm._ff("-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav16)
    with wave.open(wav16, "rb") as w:
        samples = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    try:  # one film on the GPU at a time where there is one (the lock is Windows-only)
        from app import gpulock
        lock = gpulock.gpu("transcribing")
    except ImportError:
        import contextlib
        lock = contextlib.nullcontext()
    with lock:
        audiofilm._cuda_dlls()
        from faster_whisper import WhisperModel
        st.update("voices", f"Loading Whisper ({settings.whisper_model}) to hear your recording")
        model = None
        if sys.platform != "darwin":
            try:
                model = WhisperModel(settings.whisper_model, device="cuda", compute_type="float16")
            except Exception as e:  # no usable GPU: slower, same result
                print(f"  Whisper on the GPU failed ({str(e)[:120]}); using the CPU", flush=True)
        model = model or WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")
        lang = {"hinglish": "hi", "hindi": "hi", "english": "en"}.get((cfg.get("language") or "").lower())
        segs, info = model.transcribe(samples, language=lang, vad_filter=True, beam_size=5, word_timestamps=True,
                                      initial_prompt=audiofilm.WHISPER_PROMPT if lang == "hi" else None)
        st.update(msg=f"Hearing {info.duration / 60:.1f} minutes of your recording", done=0, total=max(1, round(info.duration)))
        words = []
        for s in segs:
            words += [{"w": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2)} for w in (s.words or []) if w.word.strip()]
            st.update(done=round(s.end))
    json.dump(words, open(os.path.join(work, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    return words


def _clip(out: str, frames: bytes) -> None:
    with wave.open(out + ".tmp", "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(frames)
    os.replace(out + ".tmp", out)


def voice_lines(base: str, cfg: dict, st, voice_path) -> dict:
    """Cuts the creator's recording into voice_path(n, i) for every line on the teleprompter. Returns the report it saves
    as ownvoice/lines.json: per line, the seconds used and the words heard (or "skipped")."""
    import audiofilm
    src = os.path.join(base, cfg.get("own_recording") or "")
    if not cfg.get("own_recording") or not os.path.exists(src):
        st.update("failed", "Your recording is missing: record the script again on the teleprompter")
        raise SystemExit(1)
    work = os.path.join(base, "ownvoice")
    os.makedirs(work, exist_ok=True)
    stamp = f"{os.path.getsize(src)}-{int(os.path.getmtime(src))}"
    if (_read(os.path.join(work, "source.json"), {}) or {}).get("stamp") != stamp:  # a new take: hear it afresh
        for x in os.listdir(work):
            os.remove(os.path.join(work, x))
        json.dump({"file": cfg["own_recording"], "stamp": stamp}, open(os.path.join(work, "source.json"), "w"))
    lines = prompter(base)
    st.update("voices", f"Matching your recording to {len(lines)} lines", done=0, total=len(lines))
    words = _words(cfg, src, work, st)
    if not words:
        st.update("failed", "No speech was heard in your recording: record the script again on the teleprompter")
        raise SystemExit(1)

    script = [(k, w) for k, ln in enumerate(lines) for w in ln["speech"].split()]
    pair = align([w for _, w in script], [w["w"] for w in words])
    mine: dict[int, list[int]] = {}  # line -> the heard words that are its own
    for (k, _), j in zip(script, pair):
        if j >= 0:
            mine.setdefault(k, []).append(j)
    said = {k for k, js in mine.items() if len(js) >= max(min(2, len(lines[k]["speech"].split())), SKIPPED * len(lines[k]["speech"].split()))}
    # every heard word after the first read line belongs to a read line: its own, or (unmatched: a misread start, a slip,
    # an ad lib) one of the two lines around it, split where a sentence ends (Whisper's punctuation; its word end times
    # often run through the pause) or else where the creator paused longest
    def gap(s: int) -> float:
        end = words[s - 1]["w"][-1:]
        return words[s]["start"] - words[s - 1]["end"] + (2.0 if end in ".?!।" else 1.0 if end in ",:;" else 0.0)

    owner = [-1] * len(words)
    read = sorted(said)
    for k in read:
        for j in range(min(mine[k]), max(mine[k]) + 1):
            owner[j] = k
    for a, b in zip(read, read[1:]):
        p, q = max(mine[a]), min(mine[b])
        cut = max(range(p + 1, q + 1), key=gap)
        for j in range(p + 1, q):
            owner[j] = a if j < cut else b
    if read:
        for j in range(max(mine[read[-1]]) + 1, len(words)):
            owner[j] = read[-1]

    # one evened-out voice track (24 kHz like the AI voices), then each line is a slice of it
    full = os.path.join(work, "voice.wav")
    if not os.path.exists(full):
        audiofilm._ff("-i", src, "-vn", "-ac", "1", "-ar", str(RATE), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                      "-c:a", "pcm_s16le", full)
    with wave.open(full, "rb") as w:
        pcm, total = w.readframes(w.getnframes()), w.getnframes() / RATE
    span = {k: (min(words[j]["start"] for j in range(len(words)) if owner[j] == k),
                max(words[j]["end"] for j in range(len(words)) if owner[j] == k)) for k in said}
    order = sorted(said, key=lambda k: span[k][0])
    report = []
    for k, ln in enumerate(lines):
        out = voice_path(ln["n"], ln["i"])
        if k not in said:
            _clip(out, b"\0\0" * int(SILENT * RATE))
            report.append({"n": ln["n"], "i": ln["i"], "speech": ln["speech"], "skipped": True, "seconds": SILENT})
            continue
        at = order.index(k)
        a, z = span[k]
        prev_end = span[order[at - 1]][1] if at else 0.0
        next_start = span[order[at + 1]][0] if at + 1 < len(order) else total
        # a little air around the words, never into the next or previous line
        a, z = max(prev_end + (a - prev_end) / 2, a - 0.12), min(z + (next_start - z) / 2, z + 0.25, total)
        _clip(out, pcm[int(a * RATE) * 2:int(z * RATE) * 2])
        report.append({"n": ln["n"], "i": ln["i"], "speech": ln["speech"], "seconds": round(z - a, 2),
                       "heard": " ".join(words[j]["w"] for j in range(len(words)) if owner[j] == k)})
        st.update(done=k + 1)
    for n, i in _read(os.path.join(base, "cuts.json"), []) or []:  # trimmed lines are not read, but keep their place
        _clip(voice_path(n, i), b"\0\0" * int(0.5 * RATE))
    json.dump(report, open(os.path.join(work, "lines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    skipped = sum(1 for r in report if r.get("skipped"))
    st.update("voices", f"Your voice is on {len(lines) - skipped} of {len(lines)} lines" +
              (f"; {skipped} not read keep their pictures for {SILENT:.0f} s, silent" if skipped else ""), done=len(lines), total=len(lines))
    return {"lines": report, "skipped": skipped}
