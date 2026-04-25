// Profile photo gallery — `profiles.photos` is a JSONB array of
// `{ url: string }` objects. Order in the array IS the display order, and
// `photos[0].url` is mirrored into `profiles.avatar_url` so existing
// places that use the avatar (Discover cards, Daily Spark, conversation
// header, etc.) keep working without any changes.

export interface ProfilePhoto {
  url: string;
}

export const MAX_PHOTOS = 6;

export function normalizePhotos(input: unknown): ProfilePhoto[] {
  if (!Array.isArray(input)) return [];
  const out: ProfilePhoto[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const url = (item as Record<string, unknown>).url;
    if (typeof url !== 'string' || !url.trim()) continue;
    out.push({ url: url.trim() });
    if (out.length >= MAX_PHOTOS) break;
  }
  return out;
}
