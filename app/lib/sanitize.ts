// Simple XSS-safe text rendering helpers.
//
// We don't render user-provided HTML anywhere — React already escapes
// text interpolation — but we defensively strip dangerous characters
// and any accidental HTML tags before displaying bios and messages.
// This avoids the cost (and bundle size) of DOMPurify since we only
// ever render plain text.

// Strip HTML tags entirely (we only show plain text).
const TAG_RE = /<[^>]*>/g;

// Strip javascript:, data:, and vbscript: protocols from anywhere in a string
// in case a tag slips through some future change.
const PROTOCOL_RE = /(javascript|data|vbscript):/gi;

/**
 * Sanitize arbitrary user-provided text before rendering.
 * Safe to run on null/undefined — returns empty string in those cases.
 */
export function sanitizeText(input: unknown): string {
  if (input == null) return '';
  const str = String(input);
  return str
    .replace(TAG_RE, '')
    .replace(PROTOCOL_RE, '')
    // Collapse runs of whitespace that tag-stripping may have introduced,
    // but preserve single newlines (important for bios and long messages).
    .replace(/[ \t\f\v]+/g, ' ')
    .trim();
}

/**
 * Validate a URL is safe to use as an <a href>.
 * Accepts http(s) and relative paths. Returns null for anything that looks
 * like javascript:, data:, or an otherwise unparseable URL.
 */
export function safeUrl(input: unknown): string | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  // Relative path or fragment — safe.
  if (raw.startsWith('/') || raw.startsWith('#')) return raw;
  // If it doesn't include a scheme yet, assume https.
  const candidate = raw.includes('://') ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
