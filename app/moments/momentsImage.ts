// Image helpers for the MI Moments editor.
//
// The editor previews edits with CSS filters; the exported photo is
// rendered on a canvas with the same math applied to the pixels, so the
// result matches the preview on every browser (including Safari, which
// does not support canvas ctx.filter everywhere).

export const OUT_W = 1080;
export const OUT_H = 1920;

export interface Adjust {
  brightness: number; // 1 = unchanged
  contrast: number;   // 1 = unchanged
  saturate: number;   // 1 = unchanged
  sepia: number;      // 0..1
  gray: number;       // 0..1
}

export const NEUTRAL: Adjust = { brightness: 1, contrast: 1, saturate: 1, sepia: 0, gray: 0 };

export interface FilterPreset {
  id: string;
  label: string;
  adjust: Adjust;
}

export const PRESETS: FilterPreset[] = [
  { id: 'original', label: 'Original', adjust: { ...NEUTRAL } },
  { id: 'vivid',    label: 'Vivid',    adjust: { ...NEUTRAL, saturate: 1.4, contrast: 1.08 } },
  { id: 'warm',     label: 'Warm',     adjust: { ...NEUTRAL, sepia: 0.2, saturate: 1.15, brightness: 1.03 } },
  { id: 'fade',     label: 'Fade',     adjust: { ...NEUTRAL, contrast: 0.85, brightness: 1.08, saturate: 0.85 } },
  { id: 'vintage',  label: 'Vintage',  adjust: { ...NEUTRAL, sepia: 0.45, contrast: 0.95, saturate: 0.9 } },
  { id: 'mono',     label: 'Mono',     adjust: { ...NEUTRAL, gray: 1, contrast: 1.05 } },
  { id: 'noir',     label: 'Noir',     adjust: { ...NEUTRAL, gray: 1, contrast: 1.3, brightness: 0.9 } },
];

/** CSS filter string for live preview. Same order as applyAdjust. */
export function cssFilter(a: Adjust): string {
  return `brightness(${a.brightness}) contrast(${a.contrast}) saturate(${a.saturate}) sepia(${a.sepia}) grayscale(${a.gray})`;
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Applies brightness, contrast, saturate, sepia, grayscale (CSS spec math). */
export function applyAdjust(data: Uint8ClampedArray, a: Adjust): void {
  const s = a.saturate;
  const sa = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
  const p = 1 - a.sepia;
  const se = [
    0.393 + 0.607 * p, 0.769 - 0.769 * p, 0.189 - 0.189 * p,
    0.349 - 0.349 * p, 0.686 + 0.314 * p, 0.168 - 0.168 * p,
    0.272 - 0.272 * p, 0.534 - 0.534 * p, 0.131 + 0.869 * p,
  ];
  const g = 1 - a.gray;
  const gr = [
    0.2126 + 0.7874 * g, 0.7152 - 0.7152 * g, 0.0722 - 0.0722 * g,
    0.2126 - 0.2126 * g, 0.7152 + 0.2848 * g, 0.0722 - 0.0722 * g,
    0.2126 - 0.2126 * g, 0.7152 - 0.7152 * g, 0.0722 + 0.9278 * g,
  ];
  const cOffset = 127.5 * (1 - a.contrast);
  for (let i = 0; i < data.length; i += 4) {
    let r = clamp255(data[i] * a.brightness);
    let gg = clamp255(data[i + 1] * a.brightness);
    let b = clamp255(data[i + 2] * a.brightness);
    r = clamp255(r * a.contrast + cOffset);
    gg = clamp255(gg * a.contrast + cOffset);
    b = clamp255(b * a.contrast + cOffset);
    let nr = clamp255(sa[0] * r + sa[1] * gg + sa[2] * b);
    let ng = clamp255(sa[3] * r + sa[4] * gg + sa[5] * b);
    let nb = clamp255(sa[6] * r + sa[7] * gg + sa[8] * b);
    r = clamp255(se[0] * nr + se[1] * ng + se[2] * nb);
    gg = clamp255(se[3] * nr + se[4] * ng + se[5] * nb);
    b = clamp255(se[6] * nr + se[7] * ng + se[8] * nb);
    nr = clamp255(gr[0] * r + gr[1] * gg + gr[2] * b);
    ng = clamp255(gr[3] * r + gr[4] * gg + gr[5] * b);
    nb = clamp255(gr[6] * r + gr[7] * gg + gr[8] * b);
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
}

export interface Crop {
  zoom: number; // 1 = photo just covers the frame
  ox: number;   // offset from center, in preview pixels
  oy: number;
}

/** Loads a File into an HTMLImageElement (EXIF rotation is honored by the browser). */
export function loadImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That photo could not be opened. Try a JPG or PNG.'));
    };
    img.src = url;
  });
}

/**
 * Renders the framed, filtered photo to a 1080x1920 JPEG.
 * fw/fh describe the preview frame the crop offsets were measured in.
 */
export async function exportMoment(
  img: HTMLImageElement,
  crop: Crop,
  adjust: Adjust,
  fw: number,
  fh: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not prepare the photo.');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  const k = OUT_W / fw;
  const base = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
  const dispW = img.naturalWidth * base * crop.zoom * k;
  const dispH = img.naturalHeight * base * crop.zoom * k;
  const left = OUT_W / 2 + crop.ox * k - dispW / 2;
  const top = OUT_H / 2 + crop.oy * k - dispH / 2;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, left, top, dispW, dispH);

  const untouched =
    adjust.brightness === 1 && adjust.contrast === 1 && adjust.saturate === 1 &&
    adjust.sepia === 0 && adjust.gray === 0;
  if (!untouched) {
    const frame = ctx.getImageData(0, 0, OUT_W, OUT_H);
    applyAdjust(frame.data, adjust);
    ctx.putImageData(frame, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not save the photo.'))),
      'image/jpeg',
      0.88,
    );
  });
}
