// Word Duel — dictionary.
//
// We ship an inline starter wordlist of ~2,500 common English words
// (3–8 letters, no proper nouns, no rare scientific Latin). This is
// enough for a casual messaging-app Scrabble game and is small enough
// to keep the JS bundle slim.
//
// To upgrade to a tournament dictionary (TWL or SOWPODS) later, drop
// the word list at /public/word-duel-dictionary.txt (one word per line,
// lowercased) and the loadDictionary() helper below will fetch it on
// first need and replace the starter set in memory. The starter set is
// always available immediately as a fallback so the game never blocks
// on a network round-trip.

import { STARTER_WORDS } from './starterWords';

// Build a Set lazily so the JSON-to-Set cost happens at first use, not
// at module load. Strings are normalized to UPPERCASE so comparisons
// with on-board letters are O(1).
let activeDictionary: Set<string> | null = null;

function buildDictionary(words: Iterable<string>): Set<string> {
  const set = new Set<string>();
  for (const w of words) {
    const norm = w.trim().toUpperCase();
    if (norm.length >= 2 && /^[A-Z]+$/.test(norm)) set.add(norm);
  }
  return set;
}

export function isValidWord(word: string): boolean {
  if (!activeDictionary) activeDictionary = buildDictionary(STARTER_WORDS);
  return activeDictionary.has(word.toUpperCase());
}

/**
 * Best-effort upgrade. Call this once early (e.g. at game mount) to
 * pull /public/word-duel-dictionary.txt and replace the active dict
 * if it loads. Safe to call repeatedly; only the first non-empty
 * response wins. If the file doesn't exist or fails to load, we just
 * keep the starter set.
 */
export async function loadDictionary(): Promise<void> {
  try {
    const res = await fetch('/word-duel-dictionary.txt', { cache: 'force-cache' });
    if (!res.ok) return;
    const text = await res.text();
    if (text.length < 5_000) return; // too small to be a real dictionary
    activeDictionary = buildDictionary(text.split(/\r?\n/));
  } catch {
    // Network failure — keep the starter set silently.
  }
}
