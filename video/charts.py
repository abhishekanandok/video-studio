"""Exact pictures drawn by code: graphs, bar charts and formulas (the creator, 2026-10-06: an image model garbles text
and numbers; a graph must be exact). Gemini writes a small spec from what the slide says; matplotlib draws it in a clean
notebook style: every word spelled as written, every number where it belongs, every line the right shape.
"""

import io
import math

from pydantic import BaseModel, Field


class Line(BaseModel):
    label: str = Field(description="The line's label, short, exactly as the lesson says it (e.g. 'Uniform motion')")
    shape: str = Field(description="straight | curve_up (gets steeper) | curve_down (levels off) | flat | down (falls)")
    points: list[list[float]] = Field(default_factory=list, description="Only if the speaker gives the numbers: [[x, y], ...]")


class Bar(BaseModel):
    label: str
    value: float


class ChartSpec(BaseModel):
    kind: str = Field(description="graph (axes with lines) | bars (a bar chart) | formula (an equation or worked steps)")
    title: str = Field("", description="A short heading, max 6 words")
    x_label: str = Field("", description="graph: the x-axis quantity WITH its unit, e.g. 'Time (s)'")
    y_label: str = Field("", description="graph: the y-axis quantity WITH its unit, e.g. 'Distance (m)'")
    x_max: int = Field(0, description="graph: the last x tick, a whole number (0 = no numbers on the axis)")
    y_max: int = Field(0, description="graph: the last y tick, a whole number (0 = no numbers on the axis)")
    lines: list[Line] = Field(description="graph: REQUIRED, every line or curve the lesson describes (1-4), each with "
                                          "its label and shape; bars or formula: an empty list")
    bars: list[Bar] = Field(description="bars: REQUIRED, each bar's label and value; otherwise an empty list")
    formula: list[str] = Field(description="formula: REQUIRED, each line of the equation or the worked steps as the "
                                           "teacher gives them (e.g. 'Speed = Distance ÷ Time'), plain text with Unicode "
                                           "(², ÷, ×, √, →), 1-6 lines; graph or bars: an empty list")


ASK = """Draw this slide's point as an EXACT chart, for an exam-prep video. Only what the speaker says: never invent
numbers; if no numbers are given, leave x_max and y_max 0 and give each line only its shape. Labels short and exactly as
the lesson words them. A graph shows only the first quadrant from the origin.
Slide: {slide}
What the teacher says: {said}"""

INK, BLUE, RED, GREEN, ORANGE = "#1f1f1f", "#1d5fd1", "#d4322c", "#2e8b57", "#e08a00"
COLORS = [BLUE, RED, GREEN, ORANGE]


def spec_for(s: dict) -> ChartSpec:
    from audiofilm import get_llm
    slide = s["title"] + ": " + "; ".join(b["text"] for b in s.get("bullets") or [])
    for attempt in range(3):  # a reply that breaks (a number written forever) or a formula with no lines: asked again
        try:
            sp = get_llm().structured(ChartSpec, "You turn a lesson slide into an exact chart spec.",
                                      ASK.format(slide=slide, said=(s.get("said") or "")[:1500]), max_tokens=3000)
        except Exception as e:
            print(f"  chart spec, try {attempt + 1}: {str(e)[:80]}", flush=True)
            continue
        if sp.kind == "formula" and not sp.formula:
            continue
        if sp.kind == "graph" and not sp.lines:
            continue
        return sp
    raise RuntimeError("no usable chart spec")


def _font():
    from matplotlib import font_manager
    for name in ("Ink Free", "Comic Sans MS"):  # a hand-written notebook feel, perfectly legible
        try:
            font_manager.findfont(name, fallback_to_default=False)
            return name
        except Exception:
            continue
    return "DejaVu Sans"


def _shape(shape: str, xm: float, ym: float, k: int):
    n = 60
    xs = [xm * i / (n - 1) for i in range(n)]
    top = ym * (0.9 - 0.18 * k)
    f = {"curve_up": lambda t: t * t, "curve_down": lambda t: math.sqrt(t), "flat": lambda t: 0 * t + 0.5,
         "down": lambda t: 1 - t}.get(shape, lambda t: t)
    return xs, [top * f(x / xm) for x in xs]


def draw(spec: ChartSpec, w: int, h: int) -> bytes:
    """The chart as a PNG of w x h pixels."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    font = _font()
    big = min(w, h) / 1024  # type sized to the picture: legible when it fills the screen
    plt.rcParams.update({"font.family": font, "font.size": 30 * big, "axes.labelsize": 34 * big, "axes.edgecolor": INK, "axes.linewidth": 2.2,
                         "xtick.color": INK, "ytick.color": INK, "text.color": INK, "axes.labelcolor": INK})
    dpi = 100
    fig = plt.figure(figsize=(w / dpi, h / dpi), dpi=dpi, facecolor="#fdfcf8")
    if spec.kind == "formula" and spec.formula:
        ax = fig.add_axes([0, 0, 1, 1])
        ax.axis("off")
        def wrap(t: str) -> list[str]:  # a long equation breaks before its "=" signs, so the type stays big
            if len(t) <= 34 or " = " not in t:
                return [t]
            head, *rest = t.split(" = ")
            return [head + " ="] + ["  = " + r if i else "  " + r for i, r in enumerate(rest)]
        lines = ([spec.title] if spec.title else []) + [x for t in spec.formula[:6] for x in wrap(t)][:8]
        # the longest line fits in 88% of the width (a character is about 0.55 em; 1 pt = dpi/72 px)
        size = max(18, min(56, 0.88 * w / (0.55 * max(len(x) for x in lines) * dpi / 72)))
        n = len(lines)
        gap = min(0.15, 0.9 / max(1, n))
        size = min(size, gap * h * 0.62 * 72 / dpi)  # and the lines never touch each other
        for i, t in enumerate(lines):
            y = 0.5 + (n - 1) / 2 * gap - i * gap
            head = bool(spec.title) and i == 0
            ax.text(0.5, y, t, ha="center", va="center", fontsize=size * (1.05 if head else 1), fontweight="bold" if head else "normal",
                    color=BLUE if head else INK)
        if spec.formula:  # a box around the result, like a student's notebook
            ax.text(0.5, 0.5 - (n - 1) / 2 * 0.15 - 0.02, "", bbox=None)
    else:
        ax = fig.add_axes([0.16, 0.16, 0.78, 0.72 if spec.title else 0.78])
        ax.set_facecolor("#fdfcf8")
        if spec.kind == "bars" and spec.bars:
            names = [b.label for b in spec.bars]
            vals = [b.value for b in spec.bars]
            ax.bar(names, vals, color=COLORS[: len(vals)] * 3, edgecolor=INK, linewidth=2)
            for i, v in enumerate(vals):
                ax.text(i, v, f"{v:g}", ha="center", va="bottom", fontsize=30 * big)
            ax.set_ylabel(spec.y_label)
        else:
            xm = spec.x_max or 5
            ym = spec.y_max or 5
            for k, ln in enumerate(spec.lines[:4]):
                if len(ln.points) >= 2:
                    xs, ys = [p[0] for p in ln.points], [p[1] for p in ln.points]
                else:
                    xs, ys = _shape(ln.shape, xm, ym, k)
                c = COLORS[k % len(COLORS)]
                ax.plot(xs, ys, color=c, linewidth=4, solid_capstyle="round")
                j = int(len(xs) * 0.72)
                ax.annotate(ln.label, (xs[j], ys[j]), xytext=(22, -40) if k % 2 else (-18, 16), textcoords="offset points",
                            color=c, fontsize=32 * big, fontweight="bold", ha="left" if k % 2 else "right")
            ax.set_xlim(0, xm * 1.05)
            ax.set_ylim(0, ym * 1.05)
            if spec.x_max:
                ax.set_xticks([round(xm * i / 5, 2) for i in range(6)])
            else:
                ax.set_xticks([])
            if spec.y_max:
                ax.set_yticks([round(ym * i / 5, 2) for i in range(6)])
            else:
                ax.set_yticks([])
            ax.grid(True, color="#cfd8e6", linewidth=1)
            ax.set_xlabel(spec.x_label)
            ax.set_ylabel(spec.y_label)
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
        ax.plot(1, 0, ">", color=INK, transform=ax.transAxes, clip_on=False, markersize=12)  # arrowheads on the axes
        ax.plot(0, 1, "^", color=INK, transform=ax.transAxes, clip_on=False, markersize=12)
        if spec.title:
            fig.text(0.5, 0.94, spec.title, ha="center", va="center", color=BLUE,
                     fontsize=min(42 * big, 0.9 * w / (0.55 * max(1, len(spec.title)) * dpi / 72)))
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, facecolor=fig.get_facecolor())
    plt.close(fig)
    return buf.getvalue()
