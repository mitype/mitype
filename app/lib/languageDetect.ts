// Light client-side language detector.
//
// Purpose: decide whether a piece of user-written text needs a "See
// translation" button. We only need "is this English?" — not the exact
// source language.
//
// Two-step check:
//   1. Any non-Latin script character (CJK, Arabic, Cyrillic, Devanagari,
//      Thai, Greek, Hebrew, etc.) = not English, translate button shows.
//   2. For Latin script text: count the ratio of common English function
//      words. If less than 15% of the words are common English, we treat
//      it as non-English and show the button.
//
// This isn't a professional NLP detector. It's a fast heuristic tuned
// for social media posts (short, casual, code-mixed). False positives
// on very short posts are ignored (posts under 8 characters don't get
// a translation button at all).
//
// The actual translation happens in app/lib/translate.ts using Google
// Translate's public endpoint, which auto-detects the source language.

const NON_LATIN_SCRIPT_RE = /[぀-ゟ゠-ヿ一-龯가-힯؀-ۿЀ-ӿऀ-ॿ฀-๿֐-׿Ͱ-Ͽἀ-῿]/;

// Top 60 or so English function words. Any post where at least 15% of
// the words are in this set is treated as English.
const COMMON_ENGLISH = new Set([
  'the','a','an','is','are','was','were','be','been','being',
  'to','of','in','on','at','for','with','by','from','about','into','over','after','before',
  'and','or','but','not','no','yes','so','if','than','then','because','while','when','where','why','how','what','who','which','that','this','these','those',
  'i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their',
  'have','has','had','do','does','did','can','could','should','would','will','shall','may','might','must',
  'get','got','make','made','go','went','come','came','see','saw','know','knew','think','thought','say','said','take','took',
  'up','down','out','off','over','again','just','now','only','also','very','more','most','some','any','all','one','two','other',
]);

/** Returns true if the text is short enough or English enough that we
 *  should NOT show a translation button. */
export function looksLikeEnglish(text: string | null | undefined): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 8) return true;                 // too short to bother
  if (NON_LATIN_SCRIPT_RE.test(trimmed)) return false; // definite non-English

  // Latin script: word ratio test
  const words = trimmed
    .toLowerCase()
    .replace(/[.,!?;:"'()[\]{}\-–—]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length < 3) return true; // one or two Latin words — inconclusive
  const englishHits = words.filter((w) => COMMON_ENGLISH.has(w)).length;
  return englishHits / words.length >= 0.15;
}
