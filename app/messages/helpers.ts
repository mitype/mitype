// Small pure helpers used by the Messages page.

// Re-encodes an arbitrary image (HEIC from iPhones, PNG, WebP, etc.)
// as a normalized JPEG via canvas. This guarantees the recipient can
// view it on any browser. Falls back to the original blob if the
// image can't be decoded (e.g. raw HEIC on a non-Safari browser).
export async function normalizeImage(file: File): Promise<{ blob: Blob; ext: string }> {
  if (file.type === 'image/gif') {
    // Don't re-encode animated GIFs — would lose the animation.
    return { blob: file, ext: 'gif' };
  }
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error('read'));
      r.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('decode'));
      i.src = dataUrl;
    });
    // Cap longest dimension at 2400px for sane file size.
    const cap = 2400;
    const scale = Math.min(1, cap / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, 0, 0, w, h);
    const out: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob')), 'image/jpeg', 0.9);
    });
    return { blob: out, ext: 'jpg' };
  } catch {
    // Re-encoding failed — best effort, send the original.
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    return { blob: file, ext };
  }
}

export function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
