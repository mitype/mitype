"""
Renders a Mitype-branded flag on a rippling black cloth against a hazy
city-tower background — the same vibe as the reference photo but as a
standalone brand asset.

Output: ~/Documents/mitypee/marketing/mitype-flag.jpg
"""

from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

# -------------------- constants --------------------------------------------

OUT_PATH = "/sessions/cool-relaxed-lamport/mnt/mitypee/marketing/mitype-flag.jpg"
W, H = 1600, 1200

GOLD_LIGHT = (222, 188, 128)
GOLD_MID   = (176, 138,  84)
GOLD_DEEP  = (120,  84,  40)

# Flag anchor geometry — the flag hangs off a pole on the left and
# streams to the right with wind ripples.
POLE_X   = 380
FLAG_TOP = 340
FLAG_BOT = 1000
FLAG_LEN = 1050

# ---------- background: hazy tower ----------------------------------------

def render_background() -> Image.Image:
    """A soft, atmospheric city tower — hazy blue-grey with a faint
    window pattern, heavily blurred so the flag pops."""
    arr = np.zeros((H, W, 3), dtype=np.float32)
    # Vertical gradient — lighter at top, cooler at bottom.
    for y in range(H):
        t = y / H
        arr[y, :, 0] = 128 - 44 * t
        arr[y, :, 1] = 132 - 42 * t
        arr[y, :, 2] = 138 - 34 * t

    # Add gentle horizontal noise band variation to break up the flat fill.
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 6, size=(H, W)).astype(np.float32)
    for c in range(3):
        arr[..., c] += noise

    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")

    # Subtle window suggestion — very faint darker rectangles, then
    # heavy blur so the tower is a suggestion, not a diagram.
    overlay = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for cy in range(120, H, 78):
        for cx in range(0, W, 56):
            # Random skip so it looks like real windows, not a grid.
            if (cx * 31 + cy * 17) % 100 < 18:
                continue
            d.rectangle(
                [(cx + 6, cy + 6), (cx + 44, cy + 62)],
                fill=(0, 0, 0),
            )

    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=14))
    # Multiply-blend the overlay lightly to darken window areas.
    ov_arr = np.array(overlay, dtype=np.float32) / 255.0
    bg_arr = np.array(img, dtype=np.float32)
    bg_arr *= (1.0 - ov_arr * 0.35)
    img = Image.fromarray(np.clip(bg_arr, 0, 255).astype(np.uint8), "RGB")

    # Final atmospheric blur.
    img = img.filter(ImageFilter.GaussianBlur(radius=8))
    return img


# ---------- flag silhouette ------------------------------------------------

def flag_edges():
    """Returns two arrays: top_y[x] and bot_y[x] for every column of the
    flag, describing the flag's top and bottom edges as functions of x.
    Both edges follow the same wind-driven wave so the flag reads as a
    coherent cloth rippling in one direction."""
    xs = np.arange(POLE_X, POLE_X + FLAG_LEN)
    t = (xs - POLE_X) / FLAG_LEN  # 0 at pole, 1 at free end

    # The flag tilts up-right in a gust — the whole silhouette moves
    # up as x increases.
    tilt = -80 * t

    # A big swell and a smaller ripple.
    swell   = 40 * np.sin(t * 3.4 + 0.8)
    ripple  = 14 * np.sin(t * 9.5 + 1.6)

    # Flag height narrows slightly at the free end (natural taper).
    height = (FLAG_BOT - FLAG_TOP) * (1.0 - 0.08 * t)
    center = (FLAG_TOP + FLAG_BOT) / 2 + tilt + swell + ripple
    top = center - height / 2
    bot = center + height / 2
    return xs, top, bot


def flag_mask() -> Image.Image:
    """Filled silhouette of the flag."""
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    xs, top, bot = flag_edges()
    # Build a polygon: top edge left-to-right, then bottom edge right-to-left.
    pts_top = [(int(x), int(y)) for x, y in zip(xs, top)]
    pts_bot = [(int(x), int(y)) for x, y in zip(xs, bot)][::-1]
    d.polygon(pts_top + pts_bot, fill=255)
    # Soften the fabric edge a hair.
    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.5))
    return mask


def flag_shading(mask: Image.Image) -> Image.Image:
    """Cloth shading with wind folds — a directional light from upper-left
    plus multi-frequency fold pattern that syncs with the ripples."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    t_x = (xx - POLE_X) / FLAG_LEN
    t_y = (yy - FLAG_TOP) / (FLAG_BOT - FLAG_TOP)

    # Main fold — a broad sinusoid aligned with the wind direction.
    fold_a = np.sin(t_x * 3.4 * math.pi + 0.6)
    # Fine ripple.
    fold_b = np.sin(t_x * 12.0 * math.pi + t_y * 0.8)
    # Directional lift from upper left.
    lift = np.clip(1.2 - (t_x + t_y) * 0.5, 0.0, 1.4)

    shade = 0.55 + 0.32 * fold_a * 0.5 + 0.18 * fold_b * 0.5 + 0.10 * lift
    shade = np.clip(shade, 0.15, 1.0)

    # Cloth colors — base is deep near-black, highlights lift to charcoal.
    base_r, base_g, base_b = 6, 4, 4
    hi_r,   hi_g,   hi_b   = 62, 56, 52
    r = base_r + (hi_r - base_r) * shade
    g = base_g + (hi_g - base_g) * shade
    b = base_b + (hi_b - base_b) * shade
    cloth = np.stack([r, g, b], axis=-1)

    # Extra darkening in fold troughs — deepens the low-shade areas so
    # the cloth reads as fabric, not a gradient.
    dark = np.clip(1.0 - fold_a * 0.5, 0.5, 1.2)
    cloth *= dark[..., None]

    cloth_img = Image.fromarray(np.clip(cloth, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    cloth_img.putalpha(mask)

    # Rim highlight — a thin brighter edge along the top of the flag to
    # sell the light source.
    return cloth_img


# ---------- pole -----------------------------------------------------------

def render_pole() -> Image.Image:
    """A simple silver pole with a beacon at the top."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Pole shaft.
    d.rectangle([(POLE_X - 9, 200), (POLE_X + 9, H)], fill=(38, 42, 48, 255))
    d.rectangle([(POLE_X - 3, 200), (POLE_X + 1, H)], fill=(120, 128, 138, 255))
    # Beacon housing.
    d.rectangle([(POLE_X - 34, 330), (POLE_X + 34, 415)], fill=(50, 52, 58, 255))
    # Red beacon glass.
    d.ellipse([(POLE_X - 26, 350), (POLE_X + 26, 405)], fill=(210, 40, 40, 255))
    d.ellipse([(POLE_X - 18, 358), (POLE_X + 18, 395)], fill=(255, 120, 120, 255))
    # Cage bars.
    for i in range(5):
        x = POLE_X - 30 + i * 15
        d.line([(x, 320), (x, 420)], fill=(180, 184, 190, 255), width=1)
    d.line([(POLE_X - 34, 322), (POLE_X + 34, 322)], fill=(180, 184, 190, 255), width=1)
    d.line([(POLE_X - 34, 418), (POLE_X + 34, 418)], fill=(180, 184, 190, 255), width=1)
    # Small blur to sit into the scene.
    layer = layer.filter(ImageFilter.GaussianBlur(radius=0.6))
    return layer


# ---------- logo lockup ----------------------------------------------------

SERIF_BOLD = "/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf"
SERIF_REG  = "/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf"


def render_logo_block() -> Image.Image:
    """Gold MITYPE wordmark + tagline + URL, transparent RGBA."""
    W_, H_ = 1200, 520
    layer = Image.new("RGBA", (W_, H_), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Wordmark.
    mark_font = ImageFont.truetype(SERIF_BOLD, 240)
    mark_text = "MITYPE"
    mbox = d.textbbox((0, 0), mark_text, font=mark_font)
    mw, mh = mbox[2] - mbox[0], mbox[3] - mbox[1]
    mx = (W_ - mw) // 2 - mbox[0]
    my = 20

    # Bevel shadow (offset down-right, deep gold).
    for dx, dy in [(6, 8), (3, 4)]:
        d.text((mx + dx, my + dy), mark_text, font=mark_font, fill=GOLD_DEEP)
    # Base gold.
    d.text((mx, my), mark_text, font=mark_font, fill=GOLD_MID)
    # Highlight sweep (offset up-left, lighter gold).
    d.text((mx - 2, my - 2), mark_text, font=mark_font, fill=GOLD_LIGHT)

    # Rule.
    rule_y = my + mh + 42
    d.line(
        [(W_ // 2 - 260, rule_y), (W_ // 2 + 260, rule_y)],
        fill=GOLD_MID, width=2,
    )

    # Tagline.
    tag_font = ImageFont.truetype(SERIF_REG, 50)
    tag_text = "THE SOCIAL MEDIA THAT NETWORKS"
    tbox = d.textbbox((0, 0), tag_text, font=tag_font)
    tw = tbox[2] - tbox[0]
    tx = (W_ - tw) // 2 - tbox[0]
    ty = rule_y + 30
    d.text((tx + 2, ty + 3), tag_text, font=tag_font, fill=GOLD_DEEP)
    d.text((tx, ty), tag_text, font=tag_font, fill=GOLD_LIGHT)

    # URL.
    url_font = ImageFont.truetype(SERIF_REG, 42)
    url_text = "www.mitypeapp.com"
    ubox = d.textbbox((0, 0), url_text, font=url_font)
    uw = ubox[2] - ubox[0]
    ux = (W_ - uw) // 2 - ubox[0]
    uy = ty + (tbox[3] - tbox[1]) + 28
    d.text((ux + 2, uy + 3), url_text, font=url_font, fill=GOLD_DEEP)
    d.text((ux, uy), url_text, font=url_font, fill=GOLD_LIGHT)

    return layer


def warp_logo_to_flag(logo: Image.Image) -> Image.Image:
    """Warps each row of the logo horizontally to match the flag's ripple
    so the type looks printed on the cloth."""
    lw, lh = logo.size
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    logo_arr = np.array(logo, dtype=np.uint8)

    # Place the logo centered on the flag body.
    center_x = POLE_X + FLAG_LEN // 2 + 40
    center_y = (FLAG_TOP + FLAG_BOT) // 2 - 40
    place_x = center_x - lw // 2
    place_y = center_y - lh // 2

    warped = np.zeros((lh, lw, 4), dtype=np.uint8)
    for row in range(lh):
        t = row / max(1, lh - 1)
        # Vertical position within the flag → same warp phase as the
        # flag ripples so the type moves with the fabric.
        shift = int(22 * math.sin(t * 3.4 + 1.2) + 8 * math.sin(t * 9.5 + 0.4))
        src = logo_arr[row]
        rolled = np.roll(src, shift, axis=0)
        if shift > 0:
            rolled[:shift] = 0
        elif shift < 0:
            rolled[shift:] = 0
        warped[row] = rolled

    warped_img = Image.fromarray(warped, "RGBA")

    # Also apply shading to the logo — darken it where the flag would
    # be in shadow (troughs of the fold). This is what makes it feel
    # printed, not stuck on.
    yy, xx = np.mgrid[0:lh, 0:lw].astype(np.float32)
    t_col = xx / lw
    shade = 0.7 + 0.3 * (np.sin(t_col * 3.4 * math.pi + 0.6) * 0.5 + 0.5)
    shade = np.clip(shade, 0.6, 1.0)
    warped_rgba = np.array(warped_img, dtype=np.float32)
    warped_rgba[..., :3] *= shade[..., None]
    warped_img = Image.fromarray(np.clip(warped_rgba, 0, 255).astype(np.uint8), "RGBA")

    canvas.paste(warped_img, (place_x, place_y), warped_img)
    return canvas


# ---------- compose --------------------------------------------------------

def compose() -> Image.Image:
    print("Background…")
    bg = render_background().convert("RGBA")

    print("Flag silhouette…")
    mask = flag_mask()

    print("Cloth shading…")
    cloth = flag_shading(mask)

    print("Pole…")
    pole = render_pole()

    print("Logo lockup…")
    logo = render_logo_block()

    print("Warping logo onto flag…")
    warped_logo = warp_logo_to_flag(logo)
    # Only show the logo where the flag actually is.
    warped_arr = np.array(warped_logo, dtype=np.uint8)
    mask_arr = np.array(mask, dtype=np.uint8)
    # Multiply alpha by mask so the logo can't spill off the fabric.
    warped_arr[..., 3] = (warped_arr[..., 3].astype(np.float32) * mask_arr / 255.0).astype(np.uint8)
    warped_logo = Image.fromarray(warped_arr, "RGBA")

    final = bg.copy()
    final.alpha_composite(pole)
    final.alpha_composite(cloth)
    final.alpha_composite(warped_logo)

    # Vignette.
    vignette = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse([(-400, -300), (W + 400, H + 300)], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=250))
    v_arr = np.array(vignette, dtype=np.float32) / 255.0
    f_arr = np.array(final.convert("RGB"), dtype=np.float32)
    for c in range(3):
        f_arr[..., c] *= 0.5 + 0.5 * v_arr
    f_arr = np.clip(f_arr, 0, 255).astype(np.uint8)

    return Image.fromarray(f_arr, "RGB")


def main():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    out = compose()
    out.save(OUT_PATH, "JPEG", quality=93)
    print(f"Saved {OUT_PATH}")


if __name__ == "__main__":
    main()
