// Tiny per-device "last time I opened this feed" tracker.
//
// Used by the dashboard to decide whether the Wave Feed / The Current
// cards should pulsate a bronze/blue ring — meaning there's new
// content since the last time you looked. Once you visit the feed the
// timestamp updates and the pulse stops.
//
// Storage: localStorage. Works per-device (a new phone starts fresh),
// which is the right tradeoff for a "new content" indicator — this
// isn't a read receipt, it's a nudge. Cross-device sync isn't worth
// the extra round trip.

const KEYS = {
  wave:     'mitype-last-seen-wave',
  currents: 'mitype-last-seen-currents',
} as const;

export type Feed = keyof typeof KEYS;

/** Read the ISO timestamp of the last time this device visited `feed`.
 *  Returns null if never visited (in which case the feed should pulse
 *  the moment any content exists). Safe on the server — returns null. */
export function readLastSeen(feed: Feed): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEYS[feed]);
  } catch {
    return null;
  }
}

/** Stamp the current time as the last-seen for `feed`. Call this from
 *  the feed page's mount effect. */
export function markSeen(feed: Feed): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEYS[feed], new Date().toISOString());
  } catch {
    // Private-mode Safari, quota, etc — non-fatal.
  }
}

/** True if `latestContentIso` is strictly newer than what this device
 *  has seen. Undefined / null latest means "no content", so no pulse. */
export function hasNewSince(feed: Feed, latestContentIso: string | null | undefined): boolean {
  if (!latestContentIso) return false;
  const lastSeen = readLastSeen(feed);
  if (!lastSeen) return true; // never visited → pulse if there's any content
  return new Date(latestContentIso).getTime() > new Date(lastSeen).getTime();
}
