#!/usr/bin/env python3
"""
Mitype social video generator.

Builds four silent 1080x1920 vertical videos (TikTok, Reels, Stories)
plus 1080x1080 square cuts for the feed, using the same brand look as
marketing/generate.py: warm tan to coffee gradient, lowercase Lato
wordmark, serif headlines, amber accents.

Run:  python3 make_videos.py
Out:  marketing/videos/*.mp4
Needs: Pillow, numpy, ffmpeg.
"""
import math
import os
import subprocess
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.abspath(os.path.join(HERE, "..", "videos"))
os.makedirs(OUT, exist_ok=True)

W, H, FPS = 1080, 1920, 30

CREAM = (255, 249, 242)
PAPER = (251, 246, 236)
AMBER = (200, 149, 108)
AMBER_LIGHT = (232, 180, 144)
BRONZE = (160, 122, 77)
INK = (26, 18, 8)
SOFT = (107, 87, 68)

LATO = "/usr/share/fonts/truetype/lato/Lato-{}.ttf"
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif{}.ttf"


@lru_cache(maxsize=None)
def font(kind, size):
    if kind == "serif":
        return ImageFont.truetype(SERIF.format(""), size)
    if kind == "serifb":
        return ImageFont.truetype(SERIF.format("-Bold"), size)
    if kind == "serifi":
        return ImageFont.truetype(SERIF.format("-Italic"), size)
    return ImageFont.truetype(LATO.format(kind), size)


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    return clamp((t - start) / dur)


def ease_out(p):
    return 1 - (1 - p) ** 3


def ease_io(p):
    return 0.5 - 0.5 * math.cos(math.pi * p)


# ---------------------------------------------------------------- background
def make_bg(w, h, dark=False):
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    # diagonal gradient: warm tan (top right) to coffee (bottom left)
    d = (xs / w) * -0.55 + (ys / h) * 0.9
    d = (d - d.min()) / (d.max() - d.min())
    stops = [(0.0, (212, 164, 122)), (0.55, (138, 90, 60)), (1.0, (61, 40, 24))]
    if dark:
        stops = [(0.0, (110, 74, 48)), (0.55, (62, 40, 26)), (1.0, (30, 20, 12))]
    out = np.zeros((h, w, 3), np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (d >= p0) & (d <= p1)
        t = ((d - p0) / (p1 - p0))[m][:, None]
        out[m] = np.array(c0) * (1 - t) + np.array(c1) * t
    # soft glow in the middle
    r = np.sqrt(((xs - w * 0.5) / w) ** 2 + ((ys - h * 0.42) / h) ** 2)
    glow = np.clip(1 - r * 2.2, 0, 1) ** 2 * (28 if not dark else 14)
    out += glow[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")


BG_V = make_bg(W, H)
BG_V_DARK = make_bg(W, H, dark=True)


# ---------------------------------------------------------------- drawing
@lru_cache(maxsize=512)
def text_layer(text, kind, size, fill, spacing=0.0):
    f = font(kind, size)
    chars = list(text)
    widths = [f.getlength(c) for c in chars]
    total = int(sum(widths) + spacing * (len(chars) - 1)) + 8
    asc, desc = f.getmetrics()
    img = Image.new("RGBA", (total, asc + desc + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = 4.0
    if spacing == 0:
        d.text((4, 0), text, font=f, fill=fill)
    else:
        for c, wd in zip(chars, widths):
            d.text((x, 0), c, font=f, fill=fill)
            x += wd + spacing
    return img


def paste_alpha(base, layer, x, y, alpha=1.0):
    if alpha <= 0:
        return
    if alpha < 1:
        a = layer.getchannel("A").point(lambda v: int(v * alpha))
        layer = layer.copy()
        layer.putalpha(a)
    base.paste(layer, (int(x), int(y)), layer)


def text_c(base, text, cy, kind, size, fill, alpha=1.0, spacing=0.0, dy=0, cx=None):
    layer = text_layer(text, kind, size, fill, spacing)
    cx = W / 2 if cx is None else cx
    paste_alpha(base, layer, cx - layer.width / 2, cy - layer.height / 2 + dy, alpha)


def rounded(w, h, r, fill, outline=None, width=0, shadow=0):
    pad = shadow * 3
    img = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    if shadow:
        from PIL import ImageFilter
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((pad, pad + shadow, pad + w, pad + h + shadow), r, fill=(30, 16, 6, 110))
        sh = sh.filter(ImageFilter.GaussianBlur(shadow))
        img.alpha_composite(sh)
    ImageDraw.Draw(img).rounded_rectangle((pad, pad, pad + w, pad + h), r, fill=fill, outline=outline, width=width)
    return img


LOGO_BSU = Image.open(os.path.join(ROOT, "public", "black-sheep-university", "logo.png")).convert("RGBA")
SIG = Image.open(os.path.join(ROOT, "public", "black-sheep-university", "founder-signature.png")).convert("RGBA")


def wordmark(base, cy, size, alpha=1.0, scale=1.0):
    layer = text_layer("mitype", "Medium", int(size * scale), CREAM + (255,))
    paste_alpha(base, layer, W / 2 - layer.width / 2, cy - layer.height / 2, alpha)


def eyebrow(base, text, cy, alpha=1.0, size=34, color=AMBER_LIGHT):
    text_c(base, text, cy, "Regular", size, color + (255,), alpha, spacing=size * 0.5)


def cta(base, t0, t, cy=1630):
    """Closing call to action: pill + web address."""
    p = ease_out(prog(t, t0, 0.8))
    text_c(base, "www.mitypeapp.com", cy - 90, "Medium", 40, AMBER_LIGHT + (255,), p, spacing=6, dy=(1 - p) * 30)
    pill = rounded(460, 92, 46, CREAM + (255,))
    paste_alpha(base, pill, W / 2 - pill.width / 2, cy - pill.height / 2 + (1 - p) * 40, p)
    text_c(base, "Find your type  →", cy, "Medium", 42, INK + (255,), p, dy=(1 - p) * 40)


# ---------------------------------------------------------------- cards
def card_face(number, title, line, w=860, h=1020):
    img = rounded(w, h, 48, PAPER + (255,), outline=BRONZE + (255,), width=5, shadow=22)
    pad = 66
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((pad + 24, pad + 24, pad + w - 24, pad + h - 24), 36, outline=AMBER + (255,), width=2)
    cx = img.width // 2
    n = text_layer(number, "Light", 150, AMBER + (255,))
    img.alpha_composite(n, (cx - n.width // 2, pad + 150))
    tsize = 70
    while tsize > 36 and font("serifb", tsize).getlength(title) > w - 200:
        tsize -= 2
    t = text_layer(title, "serifb", tsize, INK + (255,))
    img.alpha_composite(t, (cx - t.width // 2, pad + 400 + (70 - tsize) // 2))
    d.line((cx - 80, pad + 530, cx + 80, pad + 530), fill=AMBER + (255,), width=4)
    # wrapped description
    f = font("Regular", 46)
    words, lines, cur = line.split(), [], ""
    for wd in words:
        test = (cur + " " + wd).strip()
        if f.getlength(test) > w - 220 and cur:
            lines.append(cur)
            cur = wd
        else:
            cur = test
    lines.append(cur)
    y = pad + 590
    for ln in lines:
        lt = text_layer(ln, "Regular", 46, SOFT + (255,))
        img.alpha_composite(lt, (cx - lt.width // 2, y))
        y += 70
    return img


def flip(base, card, cy, angle01, alpha=1.0):
    """angle01 0..1 where 0 is face on and 1 is edge on (90 degrees)."""
    sx = max(0.02, math.cos(angle01 * math.pi / 2))
    w = max(2, int(card.width * sx))
    c = card.resize((w, card.height))
    shade = int(80 * (1 - sx))
    if shade:
        ov = Image.new("RGBA", c.size, (30, 16, 6, shade))
        ov.putalpha(Image.composite(ov.getchannel("A"), Image.new("L", c.size, 0), c.getchannel("A")))
        c = Image.alpha_composite(c, ov)
    paste_alpha(base, c, W / 2 - c.width / 2, cy - c.height / 2, alpha)


# ---------------------------------------------------------------- certificate
def certificate_card(username, course, w=860):
    h = int(w * 0.72)
    img = Image.new("RGBA", (w, h), PAPER + (255,))
    d = ImageDraw.Draw(img)
    d.rectangle((10, 10, w - 10, h - 10), outline=BRONZE + (255,), width=5)
    d.rectangle((24, 24, w - 24, h - 24), outline=AMBER + (255,), width=2)
    lw = 200
    lh = int(lw * LOGO_BSU.height / LOGO_BSU.width)
    img.alpha_composite(LOGO_BSU.resize((lw, lh), Image.LANCZOS), (w // 2 - lw // 2, 38))
    y = 38 + lh + 6
    t = text_layer("CERTIFICATE OF COMPLETION", "Bold", 17, BRONZE + (255,), 5)
    img.alpha_composite(t, (w // 2 - t.width // 2, y))
    t = text_layer("This certifies that", "serif", 19, SOFT + (255,))
    img.alpha_composite(t, (w // 2 - t.width // 2, y + 40))
    t = text_layer(username, "serifi", 46, INK + (255,))
    img.alpha_composite(t, (w // 2 - t.width // 2, y + 68))
    d.line((w // 2 - 190, y + 130, w // 2 + 190, y + 130), fill=AMBER + (255,), width=2)
    t = text_layer("has successfully completed the", "serif", 18, SOFT + (255,))
    img.alpha_composite(t, (w // 2 - t.width // 2, y + 148))
    t = text_layer(course, "serifb", 30, BRONZE + (255,))
    img.alpha_composite(t, (w // 2 - t.width // 2, y + 180))
    sh = 70
    sw = int(sh * SIG.width / (SIG.height * 0.66))
    sig = SIG.crop((0, 0, SIG.width, int(SIG.height * 0.66))).resize((sw, sh), Image.LANCZOS)
    sy = h - 78
    img.alpha_composite(sig, (150, sy - sh + 2))
    d.line((100, sy, 330, sy), fill=BRONZE + (255,), width=2)
    t = text_layer("FOUNDER, MITYPE", "Semibold", 12, SOFT + (255,), 2)
    img.alpha_composite(t, (215 - t.width // 2, sy + 8))
    t = text_layer("MITYPEAPP.COM", "Bold", 14, BRONZE + (255,), 3)
    img.alpha_composite(t, (w - 330 - t.width // 2 + 115, sy - 6))
    return img


# ---------------------------------------------------------------- encoder
def encode(name, frames, w=W, h=H):
    path = os.path.join(OUT, name)
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", path,
    ]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = 0
    for fr in frames:
        pr.stdin.write(fr.convert("RGB").tobytes())
        n += 1
    pr.stdin.close()
    pr.wait()
    print(f"{name}: {n} frames, {n / FPS:.1f}s")
    return path


def square_from_vertical(vpath, name):
    """Center crop of the vertical video for feed posts."""
    out = os.path.join(OUT, name)
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", vpath, "-vf", "crop=1080:1080:0:420",
        "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", out,
    ], check=True)


# ---------------------------------------------------------------- videos
def frames_intro(dur=12.0):
    for i in range(int(dur * FPS)):
        t = i / FPS
        im = BG_V.copy()
        p = ease_out(prog(t, 0.8, 1.4))
        sc = 0.88 + 0.12 * p
        wordmark(im, 700 - 40 * ease_io(prog(t, 4.8, 1.0)), 250, p, sc)
        eyebrow(im, "FIND YOUR TYPE", 860 - 40 * ease_io(prog(t, 4.8, 1.0)), ease_out(prog(t, 2.2, 1.0)))
        lp = ease_io(prog(t, 3.2, 0.9))
        d = ImageDraw.Draw(im)
        d.line((W / 2 - 60 * lp, 930 - 40 * ease_io(prog(t, 4.8, 1.0)), W / 2 + 60 * lp, 930 - 40 * ease_io(prog(t, 4.8, 1.0))), fill=AMBER_LIGHT, width=3)
        for k, line in enumerate(["Connect with people", "who share your world."]):
            q = ease_out(prog(t, 5.2 + k * 0.5, 0.9))
            text_c(im, line, 1100 + k * 110, "serif", 72, CREAM + (255,), q, dy=(1 - q) * 40)
        cta(im, 9.0, t)
        yield im


def frames_explainer(dur=22.0):
    cards = [
        card_face("01", "Wave Feed", "Share short videos and watch what your community is making."),
        card_face("02", "The Current", "Post thoughts and join conversations with people who share your craft."),
        card_face("03", "Discover", "Search for people, rooms, and local businesses by what they love."),
        card_face("04", "Home Goods", "Buy and sell handmade and homemade goods from real local makers."),
        card_face("05", "Black Sheep University", "Masterclasses that help creators grow and earn on other networks."),
    ]
    hold, fl = 3.0, 0.5
    start = 2.6
    for i in range(int(dur * FPS)):
        t = i / FPS
        im = BG_V.copy()
        # header
        hp = ease_out(prog(t, 0.2, 0.9))
        text_c(im, "What is", 330, "serif", 70, CREAM + (255,), hp, dy=(1 - hp) * 30)
        wordmark(im, 470, 190, hp)
        if t < start:
            eyebrow(im, "A PLACE FOR CREATORS", 1000, ease_out(prog(t, 1.2, 0.8)))
        # cards
        idx = int((t - start) // hold)
        if 0 <= idx < len(cards):
            local = (t - start) - idx * hold
            if local < fl:
                flip(im, cards[idx], 1090, 1 - ease_out(local / fl))
            elif local > hold - fl and idx < len(cards) - 1:
                flip(im, cards[idx], 1090, ease_io((local - (hold - fl)) / fl))
            else:
                flip(im, cards[idx], 1090, 0)
            # progress dots
            for k in range(len(cards)):
                col = AMBER_LIGHT if k == idx else (150, 110, 80)
                ImageDraw.Draw(im).ellipse((W / 2 - 100 + k * 50 - 9, 1640 - 9, W / 2 - 100 + k * 50 + 9, 1640 + 9), fill=col)
        if t > start + hold * len(cards) - 0.2:
            q = ease_out(prog(t, start + hold * len(cards), 0.8))
            text_c(im, "Your people are here.", 1000, "serifb", 66, CREAM + (255,), q, dy=(1 - q) * 30)
            cta(im, start + hold * len(cards), t, cy=1700)
        yield im


def frames_university(dur=17.0):
    cert = certificate_card("@yourusername", "Cottage Bakery Masterclass")
    panel = rounded(620, 370, 40, PAPER + (255,), shadow=18)
    lw = 500
    lh = int(lw * LOGO_BSU.height / LOGO_BSU.width)
    logo = LOGO_BSU.resize((lw, lh), Image.LANCZOS)
    for i in range(int(dur * FPS)):
        t = i / FPS
        im = BG_V_DARK.copy()
        p = ease_out(prog(t, 0.4, 1.0))
        paste_alpha(im, panel, W / 2 - panel.width / 2, 120 - (1 - p) * 60, p)
        paste_alpha(im, logo, W / 2 - lw / 2, 140 + (370 - lh) / 2 - (1 - p) * 60, p)
        q = ease_out(prog(t, 1.8, 0.9))
        text_c(im, "Masterclasses included", 690, "serifb", 60, CREAM + (255,), q, dy=(1 - q) * 30)
        text_c(im, "with your membership.", 772, "serifb", 60, CREAM + (255,), q, dy=(1 - q) * 30)
        for k, name in enumerate(["YouTube Masterclass", "Amazon Seller Masterclass", "Cottage Bakery Masterclass"]):
            r = ease_out(prog(t, 3.2 + k * 0.7, 0.7))
            text_c(im, name, 880 + k * 64, "Medium", 42, AMBER_LIGHT + (255,), r, dy=(1 - r) * 24)
        fp = prog(t, 6.0, 1.4)
        if fp > 0:
            text_c(im, "Finish a course. Earn your certificate.", 1130, "Regular", 38, CREAM + (255,), ease_out(prog(t, 6.2, 0.8)))
            ang = 1 - ease_out(fp)
            sx = max(0.02, math.cos(ang * math.pi / 2))
            c = cert.resize((max(2, int(cert.width * sx * 0.88)), int(cert.height * 0.88)))
            paste_alpha(im, c, W / 2 - c.width / 2, 1190, ease_out(prog(t, 6.0, 0.6)))
        cta(im, 12.6, t, cy=1858)
        yield im


def frames_why(dur=18.0):
    beats = [
        ("Show your work.", "Post on the Wave Feed and the Spotlight."),
        ("Find your people.", "Search Discover by craft, city, and interest."),
        ("Collaborate.", "Join Project Rooms and the Collab Board."),
        ("Get hired.", "Respond to Brand Deals from small businesses."),
        ("Meet in person.", "Host or join Meetups near you."),
    ]
    each = 2.6
    for i in range(int(dur * FPS)):
        t = i / FPS
        im = BG_V.copy()
        wordmark(im, 300, 170, 1.0)
        eyebrow(im, "FIND YOUR TYPE", 420, 1.0, size=28)
        idx = int(t // each)
        if idx < len(beats):
            local = t - idx * each
            a_in = ease_out(prog(local, 0.0, 0.6))
            a_out = 1 - ease_io(prog(local, each - 0.45, 0.45))
            a = min(a_in, a_out)
            head, sub = beats[idx]
            text_c(im, head, 900, "serifb", 96, CREAM + (255,), a, dy=(1 - a_in) * 50)
            ImageDraw.Draw(im).line((W / 2 - 70 * a_in, 1000, W / 2 + 70 * a_in, 1000), fill=AMBER_LIGHT, width=4)
            f = font("Regular", 46)
            words, lines, cur = sub.split(), [], ""
            for wd in words:
                test = (cur + " " + wd).strip()
                if f.getlength(test) > 800 and cur:
                    lines.append(cur)
                    cur = wd
                else:
                    cur = test
            lines.append(cur)
            for k, ln in enumerate(lines):
                text_c(im, ln, 1075 + k * 66, "Regular", 46, AMBER_LIGHT + (255,), a, dy=(1 - a_in) * 40)
            for k in range(len(beats)):
                col = AMBER_LIGHT if k == idx else (150, 110, 80)
                ImageDraw.Draw(im).ellipse((W / 2 - 100 + k * 50 - 9, 1560 - 9, W / 2 - 100 + k * 50 + 9, 1560 + 9), fill=col)
        else:
            q = ease_out(prog(t, idx * each, 0.8))
            text_c(im, "Your people are here.", 930, "serifb", 70, CREAM + (255,), q, dy=(1 - q) * 40)
        cta(im, 13.2, t, cy=1730)
        yield im


if __name__ == "__main__":
    jobs = [
        ("mitype_01_brand_intro", frames_intro),
        ("mitype_02_what_is_mitype", frames_explainer),
        ("mitype_03_black_sheep_university", frames_university),
        ("mitype_04_why_creators_join", frames_why),
    ]
    only = os.environ.get("ONLY")
    for base, fn in jobs:
        if only and only not in base:
            continue
        encode(f"{base}_vertical_1080x1920.mp4", fn())
