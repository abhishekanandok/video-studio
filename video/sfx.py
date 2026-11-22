"""Synthesised sound effects + a quiet ambient bed for the documentary (pure Python, no samples to license).

Run once:  python3 video/sfx.py   ->  video/public/sfx/*.wav
"""

import math
import os
import random
import struct
import wave

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "sfx")


def save(name: str, samples: list[float], gain: float = 0.9) -> None:
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(32767 * gain * s / peak)) for s in samples))


def env(i: int, n: int, attack: float, release: float) -> float:
    t = i / n
    return min(1.0, t / attack) if t < attack else max(0.0, (1 - t) / release) if t > 1 - release else 1.0


def lowpass(xs: list[float], cutoff) -> list[float]:
    out, y = [], 0.0
    for i, x in enumerate(xs):
        c = cutoff(i) if callable(cutoff) else cutoff
        a = 1 - math.exp(-2 * math.pi * c / SR)
        y += a * (x - y)
        out.append(y)
    return out


def noise(n: int, seed: int) -> list[float]:
    r = random.Random(seed)
    return [r.uniform(-1, 1) for _ in range(n)]


def whoosh() -> list[float]:
    n = int(0.55 * SR)
    sweep = lambda i: 300 + 5200 * math.sin(math.pi * i / n) ** 2
    return [s * env(i, n, 0.45, 0.5) for i, s in enumerate(lowpass(noise(n, 1), sweep))]


def thud() -> list[float]:
    n = int(0.45 * SR)
    body = [math.sin(2 * math.pi * (70 - 30 * i / n) * i / SR) * math.exp(-i / (0.09 * SR)) for i in range(n)]
    click = lowpass(noise(n, 2), 2500)
    return [b + 0.5 * c * math.exp(-i / (0.012 * SR)) for i, (b, c) in enumerate(zip(body, click))]


def paper() -> list[float]:
    n = int(0.5 * SR)
    r = random.Random(3)
    bursts = [1.0 if r.random() < 0.08 else 0.25 for _ in range(n // 400 + 1)]
    return [s * bursts[i // 400] * env(i, n, 0.05, 0.4) for i, s in enumerate(lowpass(noise(n, 4), 3500))]


def tear() -> list[float]:
    n = int(0.7 * SR)
    r = random.Random(5)
    grit = [r.random() ** 3 for _ in range(n // 120 + 1)]
    return [s * grit[i // 120] * env(i, n, 0.1, 0.3) for i, s in enumerate(lowpass(noise(n, 6), 4500))]


def typewriter() -> list[float]:
    n = int(0.9 * SR)
    out = [0.0] * n
    r = random.Random(7)
    t = 0
    while t < n - 2000:
        for k in range(900):
            out[t + k] += r.uniform(-1, 1) * math.exp(-k / 90) + 0.6 * math.sin(2 * math.pi * 1800 * k / SR) * math.exp(-k / 60)
        t += int(r.uniform(0.07, 0.13) * SR)
    return out


def impact() -> list[float]:
    n = int(2.2 * SR)
    boom = [math.sin(2 * math.pi * (85 - 45 * min(1, i / (0.6 * SR))) * i / SR) * math.exp(-i / (0.55 * SR)) for i in range(n)]
    rumble = lowpass(noise(n, 8), 180)
    return [b + 0.8 * r * math.exp(-i / (0.9 * SR)) for i, (b, r) in enumerate(zip(boom, rumble))]


def riser() -> list[float]:
    n = int(1.6 * SR)
    ph, out = 0.0, []
    for i in range(n):
        ph += 2 * math.pi * (180 + 900 * (i / n) ** 2) / SR
        out.append(math.sin(ph) * (i / n) ** 2)
    hiss = lowpass(noise(n, 9), lambda i: 400 + 6000 * i / n)
    return [o + 0.5 * h * (i / n) ** 2 for i, (o, h) in enumerate(zip(out, hiss))]


def bed(seconds: int = 70) -> list[float]:
    """Soft, slowly breathing minor-chord pad to sit very low under the voices."""
    n = seconds * SR
    notes = [110.0, 164.81, 220.0, 261.63, 329.63]
    out = []
    for i in range(n):
        t = i / SR
        s = sum(math.sin(2 * math.pi * f * t + k) * (0.6 if f < 200 else 0.35) * (1 + 0.003 * math.sin(t * 0.7 + k)) for k, f in enumerate(notes))
        s *= 0.55 + 0.45 * math.sin(2 * math.pi * t / 9.0) ** 2
        out.append(s * env(i, n, 0.05, 0.08))
    return lowpass(out, 900)


def pop() -> list[float]:
    n = int(0.16 * SR)
    return [math.sin(2 * math.pi * (900 - 600 * i / n) * i / SR) * math.exp(-i / (0.03 * SR)) for i in range(n)]


def ding() -> list[float]:
    n = int(1.2 * SR)
    return [sum(math.sin(2 * math.pi * f * i / SR) * a for f, a in [(1320, 1), (2640, 0.4), (3960, 0.15)]) * math.exp(-i / (0.35 * SR)) for i in range(n)]


def click() -> list[float]:
    n = int(0.05 * SR)
    return [s * math.exp(-i / (0.004 * SR)) for i, s in enumerate(lowpass(noise(n, 10), 6000))]


def beep() -> list[float]:
    n = int(0.25 * SR)
    return [math.sin(2 * math.pi * 1000 * i / SR) * env(i, n, 0.02, 0.1) for i in range(n)]


def siren(seconds: float = 2.4) -> list[float]:
    n, ph, out = int(seconds * SR), 0.0, []
    for i in range(n):
        ph += 2 * math.pi * (700 + 350 * math.sin(2 * math.pi * 0.8 * i / SR)) / SR
        out.append((math.sin(ph) + 0.3 * math.sin(3 * ph)) * env(i, n, 0.05, 0.1))
    return out


def steps(count: int = 6, every: float = 0.32) -> list[float]:
    n = int((count * every + 0.2) * SR)
    out, hit = [0.0] * n, lowpass(noise(int(0.08 * SR), 11), 900)
    for c in range(count):
        t = int(c * every * SR)
        for k, h in enumerate(hit):
            out[t + k] += h * math.exp(-k / (0.02 * SR))
    return out


def chime() -> list[float]:
    n = int(1.6 * SR)
    notes = [(0.0, 1046.5), (0.12, 1318.5), (0.24, 1568.0)]
    return [sum(math.sin(2 * math.pi * f * (i / SR - d)) * math.exp(-(i / SR - d) / 0.4) for d, f in notes if i / SR >= d) for i in range(n)]


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn, g in [("whoosh", whoosh, 0.7), ("thud", thud, 0.9), ("paper", paper, 0.5), ("tear", tear, 0.6),
                        ("typewriter", typewriter, 0.45), ("impact", impact, 0.9), ("riser", riser, 0.5),
                        ("pop", pop, 0.6), ("ding", ding, 0.5), ("click", click, 0.5), ("beep", beep, 0.4), ("siren", siren, 0.45),
                        ("steps", steps, 0.6), ("chime", chime, 0.5)]:
        save(name, fn(), g)
        print("sfx", name)
    save("bed", bed(), 0.5)
    print("bed")
