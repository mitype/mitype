#!/usr/bin/env python3
"""
Mitype marketing asset generator.
Outputs 5 PNG files: profile pic, square ad, vertical story ad, landscape ad, business card.
Includes a from-scratch QR code encoder so we don't need any external library.
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ==============================================================
# Configuration
# ==============================================================

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
URL_FOR_QR = "https://mitypeapp.com"
URL_DISPLAY = "www.mitypeapp.com"
TAGLINE = "Connect with people who share your world."
EYEBROW = "FIND YOUR TYPE"
WORDMARK = "mitype"

# Brand palette (option C gradient + option B typography accents)
GRADIENT_STOPS = [
    (0.00, (212, 164, 122)),   # warm tan
    (0.55, (138, 90, 60)),     # mid brown
    (1.00, (61, 40, 24)),      # dark coffee
]
CREAM = (255, 249, 242)
AMBER = (200, 149, 108)
AMBER_LIGHT = (232, 180, 144)
INK = (26, 18, 8)

FONT_SANS_REG = "/usr/share/fonts/truetype/lato/Lato-Regular.ttf"
FONT_SANS_MED = "/usr/share/fonts/truetype/lato/Lato-Medium.ttf"
FONT_SANS_LIGHT = "/usr/share/fonts/truetype/lato/Lato-Light.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"

# ==============================================================
# QR Code encoder (pure Python, no deps)
# Based on ISO/IEC 18004:2015. Implements byte mode for short URLs.
# ==============================================================

GF_EXP = [0] * 512
GF_LOG = [0] * 256
_x = 1
for _i in range(255):
    GF_EXP[_i] = _x
    GF_LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11d
for _i in range(255, 512):
    GF_EXP[_i] = GF_EXP[_i - 255]


def _gf_mul(a, b):
    if a == 0 or b == 0:
        return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]


def _rs_generator_poly(degree):
    poly = [1]
    for i in range(degree):
        new_poly = [0] * (len(poly) + 1)
        for j, c in enumerate(poly):
            new_poly[j] ^= c
            new_poly[j + 1] ^= _gf_mul(c, GF_EXP[i])
        poly = new_poly
    return poly


def _rs_encode(data_bytes, ec_count):
    gen = _rs_generator_poly(ec_count)
    msg = list(data_bytes) + [0] * ec_count
    for i in range(len(data_bytes)):
        coef = msg[i]
        if coef != 0:
            for j, gc in enumerate(gen):
                msg[i + j] ^= _gf_mul(gc, coef)
    return msg[len(data_bytes):]


# Version 3 (29x29) parameters with EC level M:
# - Total codewords: 70
# - Data codewords: 44
# - Error correction codewords: 26 (1 block)
QR_VERSION = 3
QR_SIZE = 17 + QR_VERSION * 4  # 29
QR_DATA_BYTES = 44
QR_EC_BYTES = 26


def _bits_to_bytes(bits):
    while len(bits) % 8 != 0:
        bits.append(0)
    out = []
    for i in range(0, len(bits), 8):
        b = 0
        for j in range(8):
            b = (b << 1) | bits[i + j]
        out.append(b)
    return out


def _encode_data(text):
    data = text.encode("iso-8859-1")
    bits = []

    def push(value, n):
        for i in range(n - 1, -1, -1):
            bits.append((value >> i) & 1)

    push(0b0100, 4)               # byte mode
    push(len(data), 8)            # char count (8 bits for v1-9 byte mode)
    for byte in data:
        push(byte, 8)

    # Terminator (up to 4 bits) and pad to byte boundary
    needed = QR_DATA_BYTES * 8
    push(0, min(4, needed - len(bits)))
    while len(bits) % 8 != 0:
        bits.append(0)

    out_bytes = _bits_to_bytes(bits)
    pad_alt = [0xEC, 0x11]
    while len(out_bytes) < QR_DATA_BYTES:
        out_bytes.append(pad_alt[(len(out_bytes) - len(_bits_to_bytes(bits))) % 2])
    out_bytes = out_bytes[:QR_DATA_BYTES]

    ec = _rs_encode(out_bytes, QR_EC_BYTES)
    return out_bytes + ec


def _new_matrix():
    return [[None] * QR_SIZE for _ in range(QR_SIZE)]


def _place_finder(m, r, c):
    for dr in range(-1, 8):
        for dc in range(-1, 8):
            rr, cc = r + dr, c + dc
            if 0 <= rr < QR_SIZE and 0 <= cc < QR_SIZE:
                if dr in (-1, 7) or dc in (-1, 7):
                    m[rr][cc] = 0
                elif dr in (0, 6) or dc in (0, 6):
                    m[rr][cc] = 1
                elif 2 <= dr <= 4 and 2 <= dc <= 4:
                    m[rr][cc] = 1
                else:
                    m[rr][cc] = 0


def _place_alignment(m, r, c):
    for dr in range(-2, 3):
        for dc in range(-2, 3):
            rr, cc = r + dr, c + dc
            if dr in (-2, 2) or dc in (-2, 2):
                m[rr][cc] = 1
            elif dr == 0 and dc == 0:
                m[rr][cc] = 1
            else:
                m[rr][cc] = 0


def _place_timing(m):
    for i in range(QR_SIZE):
        if m[6][i] is None:
            m[6][i] = 1 if i % 2 == 0 else 0
        if m[i][6] is None:
            m[i][6] = 1 if i % 2 == 0 else 0


def _reserve_format(m):
    for i in range(9):
        if m[8][i] is None:
            m[8][i] = 0
        if m[i][8] is None:
            m[i][8] = 0
    for i in range(QR_SIZE - 8, QR_SIZE):
        if m[8][i] is None:
            m[8][i] = 0
        if m[i][8] is None:
            m[i][8] = 0
    m[QR_SIZE - 8][8] = 1  # dark module


def _data_bit_path():
    path = []
    upward = True
    col = QR_SIZE - 1
    while col > 0:
        if col == 6:
            col -= 1
        for i in range(QR_SIZE):
            row = (QR_SIZE - 1 - i) if upward else i
            for c in (col, col - 1):
                yield row, c
        col -= 2
        upward = not upward


def _apply_data(m, codewords):
    bits = []
    for cw in codewords:
        for i in range(7, -1, -1):
            bits.append((cw >> i) & 1)
    bi = 0
    for r, c in _data_bit_path():
        if m[r][c] is None:
            if bi < len(bits):
                m[r][c] = bits[bi]
                bi += 1
            else:
                m[r][c] = 0


MASKS = [
    lambda r, c: (r + c) % 2 == 0,
    lambda r, c: r % 2 == 0,
    lambda r, c: c % 3 == 0,
    lambda r, c: (r + c) % 3 == 0,
    lambda r, c: ((r // 2) + (c // 3)) % 2 == 0,
    lambda r, c: (r * c) % 2 + (r * c) % 3 == 0,
    lambda r, c: ((r * c) % 2 + (r * c) % 3) % 2 == 0,
    lambda r, c: ((r + c) % 2 + (r * c) % 3) % 2 == 0,
]


def _is_function_module(r, c):
    # Finders + separators
    if r < 9 and c < 9:
        return True
    if r < 9 and c >= QR_SIZE - 8:
        return True
    if r >= QR_SIZE - 8 and c < 9:
        return True
    # Timing
    if r == 6 or c == 6:
        return True
    # Alignment (v3 has one at (22,22))
    if 20 <= r <= 24 and 20 <= c <= 24:
        return True
    return False


def _apply_mask(m, mask_idx):
    fn = MASKS[mask_idx]
    out = [row[:] for row in m]
    for r in range(QR_SIZE):
        for c in range(QR_SIZE):
            if not _is_function_module(r, c) and fn(r, c):
                out[r][c] ^= 1
    return out


def _format_bits(ec_level, mask):
    # ec_level encoding: L=01, M=00, Q=11, H=10
    levels = {"L": 0b01, "M": 0b00, "Q": 0b11, "H": 0b10}
    data = (levels[ec_level] << 3) | mask
    rem = data
    for _ in range(10):
        rem = (rem << 1) ^ ((rem >> 9) * 0b10100110111)
    bits = ((data << 10) | rem) ^ 0b101010000010010
    return [(bits >> i) & 1 for i in range(14, -1, -1)]


def _place_format(m, ec_level, mask):
    """Place 15-bit format info around the three finder patterns.
    fb[0] is the most significant bit of the 15-bit codeword.
    Per ISO/IEC 18004 figure 25 the placement pattern is:
      Strip 1 (around top-left finder):
        (8, 0..5) = bits 0..5
        (8, 7)    = bit 6     (col 6 is timing, skipped)
        (8, 8)    = bit 7
        (7, 8)    = bit 8     (row 6 is timing, skipped)
        (5..0, 8) = bits 9..14
      Strip 2 (split between top-right and bottom-left):
        (N-1..N-7, 8) = bits 0..6   (vertical, going up from bottom)
        (8, N-8..N-1) = bits 7..14  (horizontal, going right)
    """
    fb = _format_bits(ec_level, mask)
    n = QR_SIZE

    # Strip 1
    for i in range(6):
        m[8][i] = fb[i]
    m[8][7] = fb[6]
    m[8][8] = fb[7]
    m[7][8] = fb[8]
    for i in range(6):
        m[5 - i][8] = fb[9 + i]

    # Strip 2 - bottom-left vertical (bits 0..6)
    for i in range(7):
        m[n - 1 - i][8] = fb[i]
    # Strip 2 - top-right horizontal (bits 7..14)
    for i in range(8):
        m[8][n - 8 + i] = fb[7 + i]

    # Dark module is fixed at (4V+9, 8). For V=3 that's (21, 8).
    m[n - 8][8] = 1


def _penalty(matrix):
    score = 0
    n = QR_SIZE
    # Rule 1: runs of 5+ same color
    for i in range(n):
        rl, rc = 1, 1
        for j in range(1, n):
            if matrix[i][j] == matrix[i][j - 1]:
                rl += 1
            else:
                if rl >= 5:
                    score += 3 + (rl - 5)
                rl = 1
            if matrix[j][i] == matrix[j - 1][i]:
                rc += 1
            else:
                if rc >= 5:
                    score += 3 + (rc - 5)
                rc = 1
        if rl >= 5:
            score += 3 + (rl - 5)
        if rc >= 5:
            score += 3 + (rc - 5)
    # Rule 2: 2x2 blocks
    for r in range(n - 1):
        for c in range(n - 1):
            v = matrix[r][c]
            if matrix[r][c + 1] == v and matrix[r + 1][c] == v and matrix[r + 1][c + 1] == v:
                score += 3
    return score


def encode_qr(text, ec_level="M"):
    codewords = _encode_data(text)
    m = _new_matrix()
    _place_finder(m, 0, 0)
    _place_finder(m, 0, QR_SIZE - 7)
    _place_finder(m, QR_SIZE - 7, 0)
    _place_alignment(m, 22, 22)
    _place_timing(m)
    _reserve_format(m)
    _apply_data(m, codewords)

    best = None
    best_score = None
    for mask in range(8):
        candidate = _apply_mask(m, mask)
        _place_format(candidate, ec_level, mask)
        score = _penalty(candidate)
        if best is None or score < best_score:
            best = candidate
            best_score = score
    return best


def render_qr_pil(text, px_per_module=20, fg=INK, bg=CREAM, quiet=4):
    matrix = encode_qr(text)
    n = len(matrix)
    side = (n + quiet * 2) * px_per_module
    img = Image.new("RGB", (side, side), bg)
    draw = ImageDraw.Draw(img)
    for r in range(n):
        for c in range(n):
            if matrix[r][c] == 1:
                x0 = (c + quiet) * px_per_module
                y0 = (r + quiet) * px_per_module
                draw.rectangle(
                    [x0, y0, x0 + px_per_module - 1, y0 + px_per_module - 1],
                    fill=fg,
                )
    return img


# ==============================================================
# Design helpers
# ==============================================================

def _interp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def _gradient_color(t):
    for i in range(len(GRADIENT_STOPS) - 1):
        t1, c1 = GRADIENT_STOPS[i]
        t2, c2 = GRADIENT_STOPS[i + 1]
        if t1 <= t <= t2:
            local = (t - t1) / (t2 - t1) if t2 > t1 else 0
            return _interp(c1, c2, local)
    return GRADIENT_STOPS[-1][1]


def _gradient_lookup(n=256):
    """Build a 256-step lookup table for the configured gradient stops."""
    out = np.zeros((n, 3), dtype=np.float32)
    for i in range(n):
        t = i / (n - 1)
        out[i] = _gradient_color(t)
    return out


def gradient_bg(w, h, angle_deg=135):
    """Vectorized diagonal gradient. Default 135deg = top-left to bottom-right."""
    a = math.radians(angle_deg)
    dx, dy = math.cos(a), math.sin(a)
    # Coordinate grids
    xs = np.arange(w, dtype=np.float32)
    ys = np.arange(h, dtype=np.float32)
    proj = np.add.outer(ys * dy, xs * dx)  # shape (h, w)
    corners = np.array([0 * dx + 0 * dy, w * dx + 0 * dy, 0 * dx + h * dy, w * dx + h * dy])
    pmin, pmax = corners.min(), corners.max()
    span = pmax - pmin if pmax > pmin else 1.0
    t = (proj - pmin) / span
    # Lookup
    lut = _gradient_lookup(256)
    idx = np.clip((t * 255).astype(np.int32), 0, 255)
    arr = lut[idx]  # (h, w, 3)
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def add_spotlight(img, center=None, radius_ratio=0.45, intensity=42):
    """Vectorized soft radial highlight."""
    w, h = img.size
    if center is None:
        center = (w // 2, h // 2)
    cx, cy = center
    rmax = max(w, h) * radius_ratio
    xs = np.arange(w, dtype=np.float32)
    ys = np.arange(h, dtype=np.float32)
    dx = xs[None, :] - cx
    dy = ys[:, None] - cy
    d = np.sqrt(dx * dx + dy * dy)
    falloff = np.clip(1 - d / rmax, 0, 1) ** 2
    add = (falloff * intensity).astype(np.float32)
    base = np.array(img, dtype=np.float32)
    base[..., 0] += add
    base[..., 1] += add
    base[..., 2] += add
    base = np.clip(base, 0, 255).astype(np.uint8)
    return Image.fromarray(base, "RGB")


def grain(img, amount=4):
    """Vectorized subtle noise to avoid flat banding."""
    rng = np.random.default_rng(42)
    arr = np.array(img, dtype=np.int16)
    noise = rng.integers(-amount, amount + 1, size=arr.shape, dtype=np.int16)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def load_font(path, size):
    return ImageFont.truetype(path, size)


def draw_text_centered(draw, xy, text, font, fill, letter_spacing=0):
    """Draw text horizontally centered on xy with optional letter spacing."""
    x, y = xy
    if letter_spacing == 0:
        tw = draw.textlength(text, font=font)
        draw.text((x - tw / 2, y), text, font=font, fill=fill)
        return tw
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + letter_spacing * max(0, len(text) - 1)
    cx = x - total / 2
    for ch, wi in zip(text, widths):
        draw.text((cx, y), ch, font=font, fill=fill)
        cx += wi + letter_spacing
    return total


def wrap_text(text, font, draw, max_width):
    words = text.split()
    lines = []
    cur = ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# ==============================================================
# Asset generators
# ==============================================================

def make_profile_picture():
    """1080x1080. Just the wordmark — readable at any avatar size."""
    w, h = 1080, 1080
    img = gradient_bg(w, h, 135)
    img = add_spotlight(img, center=(w // 2, h // 2 - 60), radius_ratio=0.55, intensity=55)
    img = grain(img, 3)
    draw = ImageDraw.Draw(img)

    # Wordmark
    wf = load_font(FONT_SANS_MED, 280)
    draw_text_centered(draw, (w / 2, h / 2 - 200), WORDMARK, wf, AMBER_LIGHT, letter_spacing=-6)

    # Eyebrow
    ef = load_font(FONT_SANS_REG, 28)
    draw_text_centered(draw, (w / 2, h / 2 + 80), EYEBROW, ef, AMBER, letter_spacing=10)

    # Underline accent
    line_y = h / 2 + 160
    draw.rectangle([w / 2 - 60, line_y, w / 2 + 60, line_y + 2], fill=AMBER)

    img.save(os.path.join(OUT_DIR, "01_profile_picture.png"), "PNG", optimize=True)
    return "01_profile_picture.png"


def make_square_ad():
    """1080x1080. Instagram feed."""
    w, h = 1080, 1080
    img = gradient_bg(w, h, 135)
    img = add_spotlight(img, center=(w // 2, h // 2 - 80), radius_ratio=0.6, intensity=50)
    img = grain(img, 3)
    draw = ImageDraw.Draw(img)

    # Wordmark top
    wf = load_font(FONT_SANS_MED, 110)
    draw_text_centered(draw, (w / 2, 110), WORDMARK, wf, CREAM, letter_spacing=-3)
    # Eyebrow
    ef = load_font(FONT_SANS_REG, 22)
    draw_text_centered(draw, (w / 2, 240), EYEBROW, ef, AMBER_LIGHT, letter_spacing=8)

    # Tagline serif
    tf = load_font(FONT_SERIF, 64)
    lines = wrap_text(TAGLINE, tf, draw, w - 200)
    base_y = 410
    for i, line in enumerate(lines):
        draw_text_centered(draw, (w / 2, base_y + i * 80), line, tf, CREAM)

    # Bottom URL
    uf = load_font(FONT_SANS_REG, 26)
    draw_text_centered(draw, (w / 2, h - 90), URL_DISPLAY, uf, AMBER_LIGHT, letter_spacing=4)

    # Divider line
    draw.rectangle([w / 2 - 30, h - 130, w / 2 + 30, h - 128], fill=AMBER)

    img.save(os.path.join(OUT_DIR, "02_ad_square_instagram.png"), "PNG", optimize=True)
    return "02_ad_square_instagram.png"


def make_vertical_ad():
    """1080x1920. Stories / TikTok / Reels."""
    w, h = 1080, 1920
    img = gradient_bg(w, h, 145)
    img = add_spotlight(img, center=(w // 2, h // 2 - 200), radius_ratio=0.55, intensity=50)
    img = grain(img, 3)
    draw = ImageDraw.Draw(img)

    # Wordmark
    wf = load_font(FONT_SANS_MED, 130)
    draw_text_centered(draw, (w / 2, 280), WORDMARK, wf, CREAM, letter_spacing=-4)
    ef = load_font(FONT_SANS_REG, 26)
    draw_text_centered(draw, (w / 2, 440), EYEBROW, ef, AMBER_LIGHT, letter_spacing=10)

    # Tagline
    tf = load_font(FONT_SERIF, 78)
    lines = wrap_text(TAGLINE, tf, draw, w - 180)
    base_y = 760
    for i, line in enumerate(lines):
        draw_text_centered(draw, (w / 2, base_y + i * 100), line, tf, CREAM)

    # Bottom URL block
    uf = load_font(FONT_SANS_REG, 32)
    draw_text_centered(draw, (w / 2, h - 180), URL_DISPLAY, uf, AMBER_LIGHT, letter_spacing=5)

    # CTA-ish pill (visual only)
    cf = load_font(FONT_SANS_MED, 28)
    cta_text = "Find your type →"
    ctw = draw.textlength(cta_text, font=cf)
    pad_x, pad_y = 36, 18
    px0 = w / 2 - ctw / 2 - pad_x
    py0 = h - 110 - pad_y
    px1 = w / 2 + ctw / 2 + pad_x
    py1 = h - 110 + 30 + pad_y - 18
    draw.rounded_rectangle([px0, py0, px1, py1], radius=80, fill=CREAM)
    draw.text((w / 2 - ctw / 2, h - 120), cta_text, font=cf, fill=INK)

    img.save(os.path.join(OUT_DIR, "03_ad_vertical_story.png"), "PNG", optimize=True)
    return "03_ad_vertical_story.png"


def make_landscape_ad():
    """1200x630. Facebook / X / LinkedIn."""
    w, h = 1200, 630
    img = gradient_bg(w, h, 135)
    img = add_spotlight(img, center=(int(w * 0.35), h // 2), radius_ratio=0.55, intensity=55)
    img = grain(img, 3)
    draw = ImageDraw.Draw(img)

    # Left column: wordmark + eyebrow stacked
    wf = load_font(FONT_SANS_MED, 100)
    draw.text((80, 200), WORDMARK, font=wf, fill=CREAM)
    # measure wordmark
    ww = draw.textlength(WORDMARK, font=wf)
    ef = load_font(FONT_SANS_REG, 20)
    draw.text((84, 320), EYEBROW, font=ef, fill=AMBER_LIGHT)

    # Vertical divider
    draw.rectangle([w // 2 - 1, 130, w // 2 + 1, h - 130], fill=(200, 149, 108, 180) if False else AMBER)

    # Right column: tagline
    tf = load_font(FONT_SERIF, 44)
    lines = wrap_text(TAGLINE, tf, draw, w / 2 - 120)
    base_y = h / 2 - (len(lines) * 56) / 2 - 10
    for i, line in enumerate(lines):
        draw.text((w // 2 + 60, base_y + i * 56), line, font=tf, fill=CREAM)

    # Bottom URL
    uf = load_font(FONT_SANS_REG, 22)
    uw = draw.textlength(URL_DISPLAY, font=uf)
    draw.text((w / 2 - uw / 2, h - 50), URL_DISPLAY, font=uf, fill=AMBER_LIGHT)

    img.save(os.path.join(OUT_DIR, "04_ad_landscape_facebook.png"), "PNG", optimize=True)
    return "04_ad_landscape_facebook.png"


def make_business_card():
    """3.5"x2" at 300 DPI = 1050x600. Front of card with QR."""
    w, h = 1050, 600
    img = gradient_bg(w, h, 135)
    img = add_spotlight(img, center=(int(w * 0.32), h // 2), radius_ratio=0.55, intensity=45)
    img = grain(img, 2)
    draw = ImageDraw.Draw(img)

    # Left side: brand + tagline
    wf = load_font(FONT_SANS_MED, 96)
    draw.text((60, 100), WORDMARK, font=wf, fill=CREAM)
    ef = load_font(FONT_SANS_REG, 18)
    draw.text((64, 220), EYEBROW, font=ef, fill=AMBER_LIGHT)

    # Tagline
    tf = load_font(FONT_SERIF, 28)
    lines = wrap_text(TAGLINE, tf, draw, w * 0.55)
    for i, line in enumerate(lines):
        draw.text((60, 290 + i * 38), line, font=tf, fill=CREAM)

    # Bottom URL
    uf = load_font(FONT_SANS_REG, 22)
    draw.text((60, h - 60), URL_DISPLAY, font=uf, fill=AMBER_LIGHT)

    # QR code on right side, on a cream tile so it scans reliably
    qr_img = render_qr_pil(URL_FOR_QR, px_per_module=10, fg=INK, bg=CREAM, quiet=2)
    qr_target = 360
    qr_resized = qr_img.resize((qr_target, qr_target), Image.LANCZOS)
    # White tile under QR for scan reliability
    tile_pad = 16
    tile_x = w - qr_target - tile_pad - 50
    tile_y = (h - qr_target) // 2
    draw.rounded_rectangle(
        [tile_x - tile_pad, tile_y - tile_pad, tile_x + qr_target + tile_pad, tile_y + qr_target + tile_pad],
        radius=12,
        fill=CREAM,
    )
    img.paste(qr_resized, (tile_x, tile_y))

    # Small caption under QR
    cf = load_font(FONT_SANS_REG, 14)
    cap = "scan to visit"
    cw = draw.textlength(cap, font=cf)
    draw.text((tile_x + qr_target / 2 - cw / 2, tile_y + qr_target + 22), cap, font=cf, fill=AMBER_LIGHT)

    img.save(os.path.join(OUT_DIR, "05_business_card_front.png"), "PNG", optimize=True, dpi=(300, 300))
    return "05_business_card_front.png"


def make_business_card_back():
    """3.5"x2" at 300 DPI = 1050x600. Back of card.
    Layout: large 'mitype' wordmark centered, descriptive blurb below,
    website URL across the bottom. Mirrors the warm gradient and
    typographic system of the front."""
    w, h = 1050, 600
    img = gradient_bg(w, h, 135)
    # Centered spotlight to lift the wordmark off the gradient
    img = add_spotlight(img, center=(w // 2, h // 2 - 30), radius_ratio=0.55, intensity=55)
    img = grain(img, 2)
    draw = ImageDraw.Draw(img)

    # Top decorative hairline divider
    draw.rectangle([w / 2 - 80, 80, w / 2 + 80, 81], fill=AMBER)

    # Wordmark — slightly larger than front since this side has more room
    wf = load_font(FONT_SANS_MED, 168)
    draw_text_centered(draw, (w / 2, 130), WORDMARK, wf, CREAM, letter_spacing=-7)

    # Small accent under the wordmark
    line_y = 320
    draw.rectangle([w / 2 - 35, line_y, w / 2 + 35, line_y + 2], fill=AMBER)

    # Description blurb (small print, wrapped, centered)
    blurb = (
        "Mitype connects creative professionals, hobbyists, and passionate "
        "people based on what they actually love doing — not just how they look."
    )
    bf = load_font(FONT_SANS_REG, 22)
    blurb_lines = wrap_text(blurb, bf, draw, w - 220)
    base_y = line_y + 30
    line_height = 30
    for i, line in enumerate(blurb_lines):
        draw_text_centered(draw, (w / 2, base_y + i * line_height), line, bf, CREAM)

    # Bottom hairline divider
    draw.rectangle([w / 2 - 80, h - 88, w / 2 + 80, h - 87], fill=AMBER)

    # URL across bottom — letter-spaced to match the typographic feel
    uf = load_font(FONT_SANS_REG, 24)
    draw_text_centered(draw, (w / 2, h - 60), URL_DISPLAY, uf, AMBER_LIGHT, letter_spacing=4)

    img.save(os.path.join(OUT_DIR, "06_business_card_back.png"), "PNG", optimize=True, dpi=(300, 300))
    return "06_business_card_back.png"


# ==============================================================
# Run
# ==============================================================

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    files = []
    print("Generating profile picture...")
    files.append(make_profile_picture())
    print("Generating square ad...")
    files.append(make_square_ad())
    print("Generating vertical story ad...")
    files.append(make_vertical_ad())
    print("Generating landscape ad...")
    files.append(make_landscape_ad())
    print("Generating business card front...")
    files.append(make_business_card())
    print("Generating business card back...")
    files.append(make_business_card_back())
    print()
    print("Done. Files in:", OUT_DIR)
    for f in files:
        print("  -", f)
