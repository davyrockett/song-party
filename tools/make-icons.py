"""Draws the app icons. Needs Pillow.   python3 tools/make-icons.py  -> ../icons"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
BG = (255, 247, 232)
SUN = (255, 196, 61)
PURPLE = (142, 92, 217)
COLORS = [(255, 122, 26), (232, 78, 138), (46, 139, 216), (59, 170, 92), (43, 168, 154)]


def draw(size: int) -> Image.Image:
    s = 1024  # draw large, then shrink for smooth edges
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img)
    # A sunny circle behind everything...
    d.ellipse([150, 150, 874, 874], fill=SUN)
    # ...party confetti around it...
    dots = [(150, 210, 0), (860, 180, 1), (900, 620, 2), (120, 700, 3), (520, 90, 4), (300, 900, 1), (760, 900, 0)]
    for x, y, c in dots:
        d.ellipse([x - 38, y - 38, x + 38, y + 38], fill=COLORS[c])
    # ...and a big round double music note.
    d.ellipse([290, 600, 480, 740], fill=PURPLE)
    d.ellipse([560, 540, 750, 680], fill=PURPLE)
    d.rectangle([440, 300, 482, 680], fill=PURPLE)
    d.rectangle([708, 240, 750, 620], fill=PURPLE)
    d.polygon([(440, 260), (750, 200), (750, 300), (440, 360)], fill=PURPLE)
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
    draw(size).save(OUT / name, optimize=True)
    print("wrote", OUT / name)
