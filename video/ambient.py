"""Ambient sound made in code (numpy only, no samples, nothing to license): river water, temple bells, a tanpura-like
drone, birds, wind. A film's ambience is a short score of these, mixed to one WAV the film plays under its voice.

    python ambient.py varanasi   -> public/threedemo/varanasi/ambient.wav
    python ambient.py chai       -> public/twodemo/chai/ambient.wav
"""

import os
import sys
import wave

import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)


def shaped_noise(seconds: float, lo: float, hi: float, tilt: float = 1.0) -> np.ndarray:
    """noise with a 1/f^tilt spectrum, kept between lo and hi Hz (filtered in the frequency domain)"""
    n = int(seconds * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    gain = 1 / np.maximum(f, 20) ** (tilt / 2)
    gain *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    out = np.fft.irfft(spec * gain, n)
    return out / (np.abs(out).max() + 1e-9)


def env(n: int, points: list[tuple[float, float]]) -> np.ndarray:
    """a gain curve through (second, gain) points"""
    t = np.arange(n) / SR
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def reverb(x: np.ndarray, seconds: float = 2.5, wet: float = 0.35) -> np.ndarray:
    ir_n = int(seconds * SR)
    ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 5.5 / seconds)
    ir /= np.abs(ir).sum() ** 0.5 * 6
    m = len(x) + ir_n
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
    return (1 - wet) * x + wet * y


def river(seconds: float) -> np.ndarray:
    """flowing water: low rumble plus a brighter lapping layer that swells and falls"""
    base = shaped_noise(seconds, 60, 900, 1.2)
    lap = shaped_noise(seconds, 300, 3500, 0.6)
    t = np.arange(len(base)) / SR
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * 0.17 * t) * np.sin(2 * np.pi * 0.07 * t + 1)
    return 0.7 * base + 0.35 * lap * np.clip(swell, 0, 1) ** 2


def bell(f0: float, seconds: float = 7.0) -> np.ndarray:
    """a temple bell: inharmonic partials that ring and decay at their own rates"""
    t = np.arange(int(seconds * SR)) / SR
    out = np.zeros_like(t)
    for ratio, amp, decay in ((0.5, 0.5, 1.2), (1.0, 1.0, 0.9), (1.19, 0.6, 1.1), (1.51, 0.45, 1.4), (2.0, 0.35, 1.8), (2.52, 0.25, 2.2), (3.01, 0.18, 2.8)):
        beat = 1 + 0.004 * np.sin(2 * np.pi * 1.3 * t)  # a slow shimmer
        out += amp * np.sin(2 * np.pi * f0 * ratio * t * beat) * np.exp(-t * decay)
    out *= np.minimum(1, t / 0.003)
    return out / np.abs(out).max()


def drone(seconds: float, sa: float = 130.81) -> np.ndarray:
    """a tanpura-like drone: Pa, Sa, Sa, low Sa plucked in a loop, each pluck rich in harmonics"""
    n = int(seconds * SR)
    out = np.zeros(n)
    notes, k, at = [sa * 1.5, sa * 2, sa * 2, sa], 0, 0.0
    while at < seconds:
        f = notes[k % 4]
        m = min(int(4.5 * SR), n - int(at * SR))
        t = np.arange(m) / SR
        tone = sum((0.9 ** h) * np.sin(2 * np.pi * f * h * t + h) for h in range(1, 9)) * np.exp(-t * 0.8)
        out[int(at * SR):int(at * SR) + m] += tone * np.minimum(1, t / 0.02)
        at += 1.15
        k += 1
    return out / np.abs(out).max()


def birds(seconds: float, starts: list[float]) -> np.ndarray:
    """little chirps: quick rising and falling whistles in short clusters"""
    n = int(seconds * SR)
    out = np.zeros(n)
    for s in starts:
        for j in range(int(rng.integers(2, 5))):
            at = s + j * float(rng.uniform(0.09, 0.22))
            m = int(float(rng.uniform(0.05, 0.12)) * SR)
            t = np.arange(m) / SR
            f = float(rng.uniform(2800, 4200)) + 900 * np.sin(np.pi * t / t[-1]) * float(rng.choice([-1, 1]))
            chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / t[-1]) ** 2
            i = int(at * SR)
            if i + m < n:
                out[i:i + m] += chirp * float(rng.uniform(0.4, 1))
    return out


def place(n: int, sound: np.ndarray, at: float, gain: float) -> np.ndarray:
    out = np.zeros(n)
    i = int(at * SR)
    m = min(len(sound), n - i)
    if m > 0:
        out[i:i + m] = sound[:m] * gain
    return out


def write(path: str, x: np.ndarray) -> None:
    x = x / (np.abs(x).max() + 1e-9) * 0.89
    fade = int(1.2 * SR)  # no clicks at the ends
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def varanasi() -> None:
    """Dawn at the ghats: the river all along, distant bells in the dark, the drone rising with the sun, birds at sunrise."""
    s = 60.0
    n = int(s * SR)
    mix = river(s) * env(n, [(0, 0.55), (40, 0.5), (60, 0.42)])
    for at, f0, g in ((3.5, 520, 0.22), (9.0, 690, 0.14), (15.5, 520, 0.18), (27.5, 880, 0.10), (36, 610, 0.14), (45, 520, 0.2), (53.5, 690, 0.16)):
        mix += reverb(place(n, bell(f0), at, g), 3.0, 0.45)
    mix += drone(s) * env(n, [(0, 0.0), (10, 0.05), (38, 0.08), (48, 0.2), (60, 0.22)])
    mix += birds(s, [44, 45.6, 47.2, 49, 50.5, 52, 54.2, 56, 57.5]) * 0.16
    write(os.path.join(HERE, "public", "threedemo", "varanasi", "ambient.wav"), mix)


def chai() -> None:
    """The tea's journey: hillside wind and birds, a factory hum, the road, then a busy chai stall's bubbling pot."""
    s = 64.0
    n = int(s * SR)
    wind = shaped_noise(s, 150, 2500, 1.0)
    mix = wind * env(n, [(0, 0.3), (14, 0.3), (16, 0.05), (60, 0.05)])
    mix += birds(s, [1.5, 3.2, 5.0, 7.4, 9.0, 11.5, 13.0]) * 0.18
    t = np.arange(n) / SR
    hum = (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t) + 0.25 * np.sin(2 * np.pi * 300 * t)) * 0.3 + 0.4 * shaped_noise(s, 80, 1200, 1.4)
    mix += hum * env(n, [(0, 0), (14, 0), (16, 0.22), (29, 0.22), (31, 0), (64, 0)])
    road = shaped_noise(s, 40, 600, 1.6)
    mix += road * env(n, [(0, 0), (38, 0), (40, 0.4), (49, 0.4), (51, 0), (64, 0)])
    bubble = shaped_noise(s, 200, 1800, 0.4) * (np.sin(2 * np.pi * 6 * t) > 0.6)
    mix += bubble * env(n, [(0, 0), (49, 0), (51, 0.12), (64, 0.12)])
    mix += drone(s, 146.83) * 0.07
    write(os.path.join(HERE, "public", "twodemo", "chai", "ambient.wav"), mix)


KINDS = ("wind", "river", "hum", "road", "bubble", "crowd", "birds", "bells", "drone")


def layer(kind: str, s: float, start: float, end: float) -> np.ndarray:
    """one kind of sound across the whole film, sounding between start and end"""
    n, t = int(s * SR), np.arange(int(s * SR)) / SR
    if kind == "wind":
        return shaped_noise(s, 150, 2500, 1.0)
    if kind == "river":
        return river(s)
    if kind == "hum":  # machines: mains hum and a motor's rumble
        return (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t) + 0.25 * np.sin(2 * np.pi * 300 * t)) * 0.3 + 0.4 * shaped_noise(s, 80, 1200, 1.4)
    if kind == "road":
        return shaped_noise(s, 40, 600, 1.6)
    if kind == "bubble":  # a pot on the boil
        return shaped_noise(s, 200, 1800, 0.4) * (np.sin(2 * np.pi * 6 * t) > 0.6)
    if kind == "crowd":  # a murmur of voices: speech-band noise that comes and goes
        return shaped_noise(s, 250, 2200, 0.8) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 1.9 * t + 1)))
    if kind == "birds":
        return birds(s, [float(x) for x in np.arange(start, end, 1.7) + rng.uniform(0, 0.8, len(np.arange(start, end, 1.7)))]) * 2
    if kind == "bells":
        out = np.zeros(n)
        for k, at in enumerate(np.arange(start, end, 6.0)):
            out += reverb(place(n, bell((520, 690, 610)[k % 3]), float(at), 1.0), 3.0, 0.45)
        return out
    if kind == "drone":
        return drone(s)
    raise ValueError(f"unknown sound {kind}; known: {', '.join(KINDS)}")


def score(path: str, seconds: float, layers: list[dict]) -> None:
    """A film's ambience from its score: [{"kind": "wind", "start": 0, "end": 14, "gain": 0.3}, ...] (kinds: KINDS);
    each layer fades in and out over a second."""
    n = int(seconds * SR)
    mix = np.zeros(n)
    for L in layers:
        a, b, g = float(L["start"]), float(L["end"]), float(L.get("gain", 0.3))
        mix += layer(L["kind"], seconds, a, b)[:n] * env(n, [(0, 0), (max(0, a - 0.5), 0), (a + 0.5, g), (max(a + 0.6, b - 0.5), g), (b + 0.5, 0), (seconds, 0)])
    write(path, mix)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--score":  # python ambient.py --score score.json out.wav seconds
        import json
        score(sys.argv[3], float(sys.argv[4]), json.load(open(sys.argv[2])))
    else:
        {"varanasi": varanasi, "chai": chai}[sys.argv[1] if len(sys.argv) > 1 else "varanasi"]()
    print("ambient written")
