"""Derive animation layers from the scene illustrations (sources stay untouched).

Run from the repo root:  python3 scripts/make-scene-fx.py
Writes public/scenes/fx/*.png. Coordinates are in source pixels (1536x1024).
"""
import math
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC = "public/scenes"
OUT = "public/scenes/fx"
W, H = 1536, 1024
MASK_SCALE = 0.5  # masks are stretched to the image box, half res is plenty


def rounded_rect(x0, y0, x1, y1, top, bottom, steps=24):
    """Polygon of a rect with elliptical corners. top/bottom = (rx, ry)."""
    pts = []
    def arc(cx, cy, rx, ry, a0, a1):
        for i in range(steps + 1):
            a = math.radians(a0 + (a1 - a0) * i / steps)
            pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
    (trx, try_), (brx, bry) = top, bottom
    arc(x1 - trx, y0 + try_, trx, try_, -90, 0)    # top-right
    arc(x1 - brx, y1 - bry, brx, bry, 0, 90)       # bottom-right
    arc(x0 + brx, y1 - bry, brx, bry, 90, 180)     # bottom-left
    arc(x0 + trx, y0 + try_, trx, try_, 180, 270)  # top-left
    return pts


def mask(draw_fn, feather):
    s = 4  # supersample for smooth edges
    m = Image.new("L", (W * s // 2, H * s // 2), 0)
    d = ImageDraw.Draw(m)
    k = s / 2
    draw_fn(d, lambda pts: [(x * k, y * k) for x, y in pts])
    m = m.resize((int(W * MASK_SCALE), int(H * MASK_SCALE)), Image.LANCZOS)
    return m.filter(ImageFilter.GaussianBlur(feather)) if feather else m


def save_alpha(m, name):
    rgba = Image.new("RGBA", m.size, (255, 255, 255, 0))
    rgba.putalpha(m)
    rgba.save(f"{OUT}/{name}", optimize=True)


# Plane: glass of the porthole.
FLIGHTS_GLASS = (612, 366, 920, 830)
save_alpha(mask(lambda d, sc: d.polygon(sc(rounded_rect(*FLIGHTS_GLASS, (125, 150), (115, 135))), fill=255), 1),
           "flights-view-mask.png")

# Hotel: the view between the open casements, minus the flower pot and the handles.
def hotel(d, sc):
    d.polygon(sc(rounded_rect(474, 186, 1056, 784, (70, 70), (42, 42))), fill=255)
    # flower pot + flowers on the sill
    d.polygon(sc([(430, 700), (452, 655), (500, 640), (560, 645), (600, 668), (608, 720),
                  (595, 790), (430, 800)]), fill=0)
save_alpha(mask(hotel, 3), "hotels-view-mask.png")

# Hotel: the curtain on the right, picked by colour (white tulle over the blue wall).
img = np.asarray(Image.open(f"{SRC}/hotels.png").convert("RGB")).astype(np.float32)
blueness = img[..., 2] - img[..., 0]
alpha = np.clip((42 - blueness) / 22, 0, 1)
# keep clear of the right casement frame (ends at x≈1210): ramp in from 1215 to 1245
ramp = np.clip((np.arange(W) - 1215) / 30, 0, 1)
alpha *= ramp[None, :]
alpha[900:, :] = 0
cm = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))
cm = cm.resize((int(W * MASK_SCALE), int(H * MASK_SCALE)), Image.LANCZOS)
save_alpha(cm, "hotels-curtain-mask.png")

print("ok")
