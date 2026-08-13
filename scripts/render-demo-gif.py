#!/usr/bin/env python3
"""Render docs/demo.gif — not a runtime dependency of canaryfile."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "demo.gif"
FONT_PATH = Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")

BG = (13, 17, 23)
TITLEBAR = (22, 27, 34)
BORDER = (48, 54, 61)
MUTED = (139, 148, 158)
TEXT = (230, 237, 243)
GREEN = (63, 185, 80)
YELLOW = (210, 153, 34)
RED = (248, 81, 73)
PROMPT = (63, 185, 80)
ACCENT = (88, 166, 255)

PAD_X = 28
PAD_Y = 56
LINE_H = 22
WIDTH = 920
HEIGHT = 340


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size)


def draw_window(draw: ImageDraw.ImageDraw, title: str) -> None:
    draw.rounded_rectangle((8, 8, WIDTH - 8, HEIGHT - 8), 12, fill=BG, outline=BORDER, width=1)
    draw.rounded_rectangle((8, 8, WIDTH - 8, 40), 12, fill=TITLEBAR, outline=BORDER, width=1)
    draw.rectangle((8, 28, WIDTH - 8, 40), fill=TITLEBAR)
    for x, color in ((24, RED), (44, YELLOW), (64, GREEN)):
        draw.ellipse((x, 18, x + 10, 28), fill=color)
    draw.text((WIDTH // 2, 16), title, font=font(13), fill=MUTED, anchor="mt")


def draw_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[tuple[str, tuple[int, int, int]]],
) -> None:
    y = PAD_Y
    for text, color in lines:
        draw.text((PAD_X, y), text, font=font(15), fill=color)
        y += LINE_H


def frame(lines: list[tuple[str, tuple[int, int, int]]]) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), (1, 4, 9))
    draw = ImageDraw.Draw(image)
    draw_window(draw, "canaryfile")
    draw_lines(draw, lines)
    return image


HEADER = "TASK                         SNAPSHOT   CURRENT    COST     VERDICT"

PASS = [
    ("$ canaryfile test", PROMPT),
    ("", MUTED),
    ("canaryfile test — 3 tasks, adapter claude-code", TEXT),
    ("snapshot: 2026-08-01T00:00:00Z (model claude-sonnet-W)", MUTED),
    ("current:  model claude-sonnet-W", MUTED),
    ("", MUTED),
    (HEADER, MUTED),
    ("fix-date-off-by-one          5/5        5/5        $0.31    pass", GREEN),
    ("add-health-endpoint          5/5        5/5        $0.42    pass", GREEN),
    ("refactor-logging             4/5        4/5        $0.48    pass", GREEN),
    ("", MUTED),
    ("0 regressions, 0 warnings.", GREEN),
]

FAIL = [
    ("$ canaryfile test", PROMPT),
    ("", MUTED),
    ("canaryfile test — 3 tasks, adapter claude-code", TEXT),
    ("snapshot: 2026-08-01T00:00:00Z (model claude-sonnet-W)", MUTED),
    ("current:  model claude-sonnet-X  ← fingerprint changed", ACCENT),
    ("", MUTED),
    (HEADER, MUTED),
    ("fix-date-off-by-one          5/5        5/5        $0.31    pass", GREEN),
    ("add-health-endpoint          5/5        3/5        $0.44    warn", YELLOW),
    ("refactor-logging             4/5        1/5        $0.52    FAIL", RED),
    ("", MUTED),
    ("1 regression, 1 warning.", RED),
]


def main() -> None:
    images = [frame(PASS), frame(FAIL)]
    palette = images[0].quantize(colors=48, method=Image.Quantize.MEDIANCUT)
    frames = [img.quantize(palette=palette) for img in images]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=[2200, 3200],
        loop=0,
        optimize=True,
    )
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
