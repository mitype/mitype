// Client-side translation to English.
//
// Uses Google Translate's public endpoint (client=gtx). Auto-detects
// the source language and returns English. No API key required. Same
// endpoint the browser Chrome "Translate this page" feature uses.
//
// Fallback behavior:
//   * If the network call fails or returns malformed JSON, we throw so
//     the caller can render a friendly "Translation unavailable" message.
//   * In-memory cache keyed by the source text keeps repeat requests
//     free during a session.
//
// If Google's endpoint is ever blocked or rate-limited, swap this one
// function for another provider (MyMemory, LibreTranslate, DeepL, etc.).

const cache = new Map<string, string>();

export async function translateToEnglish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const cached = cache.get(trimmed);
  if (cached !== undefined) return cached;

  // Google Translate public endpoint. `sl=auto` = source language auto
  // detect. `tl=en` = target English. `dt=t` = translation only. `q=`
  // the source text.
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' +
    encodeURIComponent(trimmed);

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Translation failed (${res.status})`);
  }

  // Response shape: [[[translatedSegment, originalSegment, null, null, ...], ...], ...]
  // We concatenate all the translated segments.
  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Translation response malformed');
  }
  const translated: string = (data[0] as unknown[])
    .map((row) => (Array.isArray(row) ? String(row[0] ?? '') : ''))
    .join('');
  cache.set(trimmed, translated);
  return translated;
}
