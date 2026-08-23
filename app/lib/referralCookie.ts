// Persistent referral tracking cookie.
//
// When a visitor lands on Mitype via mitypeapp.com/?ref=<@handle>, we
// drop this cookie so the attribution survives the signup flow.
// Standard 30 day window, same convention as most referral systems.
//
// Reading + writing happens client-side only. The value is a bare
// username (no leading @). We strip anything unsafe just in case.

const COOKIE_NAME = 'mitype_ref';
const MAX_AGE_DAYS = 30;

function sanitizeHandle(raw: string): string | null {
  const trimmed = raw.trim().replace(/^@+/, '');
  // Usernames are lowercase alphanumeric + underscore + hyphen, 2-30 chars.
  if (!/^[a-z0-9_-]{2,30}$/i.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function writeReferralCookie(rawHandle: string): void {
  if (typeof document === 'undefined') return;
  const handle = sanitizeHandle(rawHandle);
  if (!handle) return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(handle)}; max-age=${maxAge};` +
    ` path=/; SameSite=Lax`;
}

export function readReferralCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  return sanitizeHandle(raw);
}

export function clearReferralCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
}
