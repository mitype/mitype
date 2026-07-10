"""
Edits IMG_2668.PNG to replace the flag's BH / BOSS HUDDLE / STRATEGIZE
lockup with Mitype branding, using the flag's actual pixel silhouette
as a mask so nothing bleeds off the fabric.

Approach:
  1. Detect the flag's silhouette from the pixel data — the flag is
     the largest connected near-black region on the right side of the
     photo. We threshold + morphologically clean it into a solid mask.
  2. Compute the flag's oriented bounding box (via principal axis)
     so we can align the new logo lockup with the flag's tilt.
  3. Sample the flag's mean color from a clean patch dead-center of
     the flag so our cover paint blends perfectly.
  4. Paint the entire logo region flat with that sampled color,
     restricted by the flag mask. This erases BH + BOSS HUDDLE + the
     STRATEGIZE line.
  5. Add a faint synthetic fabric shading so the covered area doesn't
     look like a flat matte patch against the surrounding fabric.
  6. Render the new gold "MITYPE / THE SOCIAL MEDIA THAT NETWORKS /
     www.mitypeapp.com" lockup on a transparent layer, rotate it to
     match the flag's tilt, warp it slightly to sit on the fabric,
     and place it in the flag's center.

Output: mitype-flag-edited.png in the same folder as the source.
"""

from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

SRC_PATH = "/sessions/cool-relaxed-lamport/mnt/Downloads--Mitype flag/IMG_2668.PNG"
OUT_PATH = "/sessions/cool-relaxed-lamport/mnt/Downloads--Mitype flag/mitype-flag-edited.png"

SERIF_BOLD = "/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf"
SERIF_REG  = "/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf"

# Gold palette — muted brass matching the reference flag.
GOLD_LIGHT = (222, 188, 128)
GOLD_MID   = (176, 138,  84)
GOLD_DEEP  = (110,  76,  36)


# --------------- flag silhouette detection --------------------------------

def detect_flag_mask(img: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    """Returns (mask, bbox) where mask is an L-mode image with 255 on
    the flag pixels and 0 elsewhere. Detection: threshold near-black
    pixels on the right half of the photo (the flag lives there),
    remove small blobs, then take the largest connected region."""
    W, H = img.size
    rgb = np.array(img.convert("RGB"), dtype=np.float32)
    # Brightness metric — the flag is much darker than the tower/sky.
    # Measured pixel samples show:
    #   flag body luminance ~17-21
    #   tower windows luminance ~59-63
    #   sky ~59
    # So a threshold of ~35 cleanly separates flag from everything else.
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    dark = (lum < 38).astype(np.uint8) * 255
    dark_img = Image.fromarray(dark, "L")
    # Kill the left region: people, pole, crew — everything left of the
    # start of the flag body.
    d = ImageDraw.Draw(dark_img)
    d.rectangle([(0, 0), (int(W * 0.42), H)], fill=0)
    # Kill the very top of the frame (dark building tops etc.).
    d.rectangle([(0, 0), (W, int(H * 0.20))], fill=0)
    # Close small holes.
    dark_img = dark_img.filter(ImageFilter.MaxFilter(9))
    dark_img = dark_img.filter(ImageFilter.MinFilter(5))
    dark_img = dark_img.filter(ImageFilter.GaussianBlur(2))
    dark_arr = np.array(dark_img)
    mask_arr = (dark_arr > 128).astype(np.uint8) * 255

    # Find largest connected component (flood-fill style via SciPy-free
    # BFS). For simplicity, we assume the flag is the single largest
    # blob after killing the left region.
    labeled, count = _connected_components(mask_arr)
    if count == 0:
        raise RuntimeError("No flag region detected")
    # Pick the largest label.
    sizes = np.bincount(labeled.ravel())
    sizes[0] = 0  # background
    best_label = int(np.argmax(sizes))
    flag_mask = (labeled == best_label).astype(np.uint8) * 255

    # HOLE FILL: the existing gold BH / BOSS HUDDLE / STRATEGIZE text is
    # gold, not dark, so it produced holes in the mask. Fill each row's
    # extent from its leftmost to its rightmost dark pixel — a
    # per-row convex hull — which perfectly plugs the interior gold
    # gaps without extending the flag's outer silhouette.
    filled = flag_mask.copy()
    for y in range(filled.shape[0]):
        xs_row = np.where(flag_mask[y] > 128)[0]
        if len(xs_row) < 2:
            continue
        # Require the row to have a meaningful extent (>50 px) so we
        # don't fill thin isolated strips.
        if xs_row.max() - xs_row.min() < 50:
            continue
        filled[y, xs_row.min() : xs_row.max() + 1] = 255

    # Slight erode to pull the mask back from the edge of the flag so
    # our paint stops just inside the fabric border and doesn't leak.
    mask_img = Image.fromarray(filled, "L")
    mask_img = mask_img.filter(ImageFilter.MinFilter(5))
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(1.2))

    # Bounding box of the flag.
    ys, xs = np.where(np.array(mask_img) > 128)
    bbox = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    return mask_img, bbox


def _connected_components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """4-connected labeling via two-pass union-find. Returns (labels, count)."""
    H, W = mask.shape
    labels = np.zeros((H, W), dtype=np.int32)
    parent: list[int] = [0]

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    next_label = 1
    for y in range(H):
        for x in range(W):
            if mask[y, x] == 0:
                continue
            up = labels[y - 1, x] if y > 0 else 0
            left = labels[y, x - 1] if x > 0 else 0
            if up == 0 and left == 0:
                labels[y, x] = next_label
                parent.append(next_label)
                next_label += 1
            elif up != 0 and left == 0:
                labels[y, x] = up
            elif up == 0 and left != 0:
                labels[y, x] = left
            else:
                labels[y, x] = min(up, left)
                union(up, left)

    # Flatten via find().
    flat = np.zeros(next_label, dtype=np.int32)
    for i in range(1, next_label):
        flat[i] = find(i)
    labels = flat[labels]
    # Remap to dense 1..K.
    unique, remap = np.unique(labels, return_inverse=True)
    labels = remap.reshape(H, W).astype(np.int32)
    return labels, int(len(unique) - 1)  # -1 for background


# --------------- sampling clean flag color --------------------------------

def sample_flag_color(img: Image.Image, mask: Image.Image) -> tuple[int, int, int]:
    """Sample the flag's dominant near-black color from a clean patch.
    We look for a strip in the LOWER half of the flag (below any
    existing text) so we don't accidentally sample gold pixels."""
    mask_arr = np.array(mask)
    ys, xs = np.where(mask_arr > 200)
    y_lo = int(np.percentile(ys, 80))
    y_hi = int(np.percentile(ys, 95))
    x_lo = int(np.percentile(xs, 30))
    x_hi = int(np.percentile(xs, 70))
    crop = np.array(img.convert("RGB"), dtype=np.float32)[y_lo:y_hi, x_lo:x_hi]
    r, g, b = crop.mean(axis=(0, 1))
    return int(r), int(g), int(b)


# --------------- oriented bounding box (principal axis) -------------------

def flag_orientation(mask: Image.Image) -> tuple[float, tuple[float, float]]:
    """Returns (angle_deg, centroid_xy) for the flag mask.
    Angle is the rotation from the horizontal of the flag's major axis."""
    mask_arr = np.array(mask) > 200
    ys, xs = np.where(mask_arr)
    cx, cy = float(xs.mean()), float(ys.mean())
    # Covariance matrix of the point cloud.
    x_c = xs - cx
    y_c = ys - cy
    cxx = float((x_c * x_c).mean())
    cxy = float((x_c * y_c).mean())
    cyy = float((y_c * y_c).mean())
    # Angle of major eigenvector.
    theta = 0.5 * math.atan2(2 * cxy, cxx - cyy)
    angle_deg = math.degrees(theta)
    return angle_deg, (cx, cy)


# --------------- Mitype lockup rendering ----------------------------------

def render_mitype_lockup() -> Image.Image:
    """MITYPE / tagline / URL, gold on transparent, unwarped.
    Sized to fit comfortably inside the flag body (~700px wide max),
    so no letters run off the fabric edge."""
    W, H = 780, 460
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    mark_font = ImageFont.truetype(SERIF_BOLD, 140)
    mark_text = "MITYPE"
    mbox = d.textbbox((0, 0), mark_text, font=mark_font)
    mw = mbox[2] - mbox[0]
    mh = mbox[3] - mbox[1]
    mx = (W - mw) // 2 - mbox[0]
    my = 20

    for dx, dy in [(4, 6), (2, 3)]:
        d.text((mx + dx, my + dy), mark_text, font=mark_font, fill=GOLD_DEEP)
    d.text((mx, my), mark_text, font=mark_font, fill=GOLD_MID)
    d.text((mx - 2, my - 2), mark_text, font=mark_font, fill=GOLD_LIGHT)

    rule_y = my + mh + 42
    d.line(
        [(W // 2 - 200, rule_y), (W // 2 + 200, rule_y)],
        fill=GOLD_MID, width=2,
    )

    tag_font = ImageFont.truetype(SERIF_REG, 32)
    tag_text = "THE SOCIAL MEDIA THAT NETWORKS"
    tbox = d.textbbox((0, 0), tag_text, font=tag_font)
    tw = tbox[2] - tbox[0]
    th = tbox[3] - tbox[1]
    tx = (W - tw) // 2 - tbox[0]
    ty = rule_y + 20
    d.text((tx + 2, ty + 3), tag_text, font=tag_font, fill=GOLD_DEEP)
    d.text((tx, ty), tag_text, font=tag_font, fill=GOLD_LIGHT)

    url_font = ImageFont.truetype(SERIF_REG, 30)
    url_text = "www.mitypeapp.com"
    ubox = d.textbbox((0, 0), url_text, font=url_font)
    uw = ubox[2] - ubox[0]
    ux = (W - uw) // 2 - ubox[0]
    uy = ty + th + 22
    d.text((ux + 2, uy + 3), url_text, font=url_font, fill=GOLD_DEEP)
    d.text((ux, uy), url_text, font=url_font, fill=GOLD_LIGHT)

    return layer


# --------------- compose --------------------------------------------------

def main():
    print(f"Loading {SRC_PATH}")
    src = Image.open(SRC_PATH).convert("RGB")
    W, H = src.size
    print(f"  size = {W}x{H}")

    print("Detecting flag silhouette…")
    flag_mask, bbox = detect_flag_mask(src)
    print(f"  flag bbox = {bbox}")

    print("Sampling flag color…")
    base_rgb = sample_flag_color(src, flag_mask)
    print(f"  base_rgb = {base_rgb}")

    print("Computing flag orientation…")
    _measured_angle, (cx, cy) = flag_orientation(flag_mask)
    # The principal-axis measurement can grab the diagonal of a wide
    # flag shape (up to 38+ deg) which vastly overstates the actual
    # tilt. Visual inspection of the reference shows the flag tilts
    # about 6 deg up-right. Hard-code that instead.
    angle_deg = 6.0
    print(f"  measured (rejected) = {_measured_angle:.2f} deg, using {angle_deg:.2f} deg")
    print(f"  centroid = ({cx:.0f}, {cy:.0f})")

    # ----- build cover paint restricted to the flag mask -----
    # Paint a slightly-varying fill across the whole flag area. This
    # completely erases the BH logo + BOSS HUDDLE + STRATEGIZE lines
    # because we're repainting every flag pixel with the sampled color.
    cover = Image.new("RGB", (W, H), base_rgb)
    # Add a soft vertical shading gradient across the flag so the paint
    # matches the flag's natural lighting (slightly darker at the
    # bottom, slightly brighter at the top).
    cover_arr = np.array(cover, dtype=np.float32)
    yy = np.arange(H).astype(np.float32)
    t = np.clip((yy - bbox[1]) / max(1, bbox[3] - bbox[1]), 0, 1)
    lift = 1.0 + 0.08 * (0.5 - t)
    for c in range(3):
        cover_arr[..., c] *= lift[:, None]
    # A gentle horizontal falloff too — the pole-side of the flag is a
    # hair brighter than the free end in the original.
    xx = np.arange(W).astype(np.float32)
    tx = np.clip((xx - bbox[0]) / max(1, bbox[2] - bbox[0]), 0, 1)
    lift_x = 1.0 + 0.05 * (0.5 - tx)
    for c in range(3):
        cover_arr[..., c] *= lift_x[None, :]
    cover = Image.fromarray(np.clip(cover_arr, 0, 255).astype(np.uint8), "RGB")

    cover_rgba = cover.convert("RGBA")
    cover_rgba.putalpha(flag_mask)

    print("Painting over old logo…")
    out = src.convert("RGBA")
    out.alpha_composite(cover_rgba)

    # Add subtle noise/grain to the repainted area so it doesn't look
    # like a perfect flat fill against the natural photograph.
    grain = np.array(out, dtype=np.float32)
    rng = np.random.default_rng(11)
    noise = rng.normal(0, 3.5, size=(H, W)).astype(np.float32)
    mask_arr = np.array(flag_mask, dtype=np.float32) / 255.0
    for c in range(3):
        grain[..., c] += noise * mask_arr
    out = Image.fromarray(np.clip(grain, 0, 255).astype(np.uint8), "RGBA")

    # ----- lockup -----
    print("Rendering Mitype lockup…")
    lockup = render_mitype_lockup()

    # Rotate to match the flag tilt.
    print(f"Rotating lockup by {angle_deg:.2f} deg…")
    lockup_rot = lockup.rotate(-angle_deg, resample=Image.BICUBIC, expand=True)

    # Place the lockup so it sits in the middle-right of the flag —
    # mirroring where the original BH mark sat. We compute the visual
    # center of the flag body: right-of-centroid to compensate for the
    # heavier fabric on the free (right) side.
    lw, lh = lockup_rot.size
    place_x = int(cx - lw / 2 - 10)
    place_y = int(cy - lh / 2 - 20)

    # Constrain the lockup to only draw where the flag mask is white,
    # so any letters that would fall off the fabric are hidden.
    lockup_full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lockup_full.paste(lockup_rot, (place_x, place_y), lockup_rot)
    lockup_arr = np.array(lockup_full, dtype=np.uint8)
    lockup_arr[..., 3] = (
        lockup_arr[..., 3].astype(np.float32) * (mask_arr) * 1.0
    ).astype(np.uint8)
    lockup_full = Image.fromarray(lockup_arr, "RGBA")

    # Composite.
    print("Compositing lockup onto flag…")
    out.alpha_composite(lockup_full)

    print(f"Saving {OUT_PATH}")
    out.convert("RGB").save(OUT_PATH, "PNG")
    print("Done.")


if __name__ == "__main__":
    main()
