// Curated list of "Hinge-style" profile prompts.
//
// Stored as a flat string list — the prompt text itself is the key.
// User answers are saved on profiles.profile_prompts as
//   [{ prompt: string, answer: string }]
// (JSONB, default []). Picking from a fixed list keeps things consistent
// across profiles and lets us add/remove prompts without a migration.

export const PROFILE_PROMPTS: string[] = [
  // Creative & personality
  'A perfect creative day looks like…',
  'The song that always gets me moving is…',
  'My most controversial opinion is…',
  'Two truths and a lie about me…',
  "I'm currently obsessed with…",
  'The last thing that made me cry-laugh was…',
  "I'll never get tired of…",
  'My hidden talent is…',
  'A weirdly specific thing I love is…',
  'The most underrated movie ever is…',
  'My go-to comfort show is…',
  "I'm secretly really good at…",
  'My signature dish (for better or worse) is…',
  'My bucket list trip is…',
  'I geek out hardest about…',

  // Connection-leaning
  "We'll get along if…",
  'The way to my heart is…',
  'Date me if you…',
  "Don't date me if you…",
  'My ideal Sunday is…',
  'A non-negotiable for me is…',
  'I want a partner who…',
  'My love language is…',
  'I make the best…',
  "I'm looking for someone who…",

  // Story-prompts
  "The most spontaneous thing I've ever done is…",
  'My biggest creative win this year was…',
  'My next big project is…',
  'Something that changed me was…',
  'My origin story (short version) is…',
];

export interface ProfilePrompt {
  prompt: string;
  answer: string;
}

export const MAX_PROMPTS = 3;
export const MAX_ANSWER_LENGTH = 180;

/**
 * Validate and normalize a list of prompt answers loaded from the DB.
 * Filters out malformed entries and clamps to MAX_PROMPTS.
 */
export function normalizePrompts(input: unknown): ProfilePrompt[] {
  if (!Array.isArray(input)) return [];
  const out: ProfilePrompt[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const p = (item as Record<string, unknown>).prompt;
    const a = (item as Record<string, unknown>).answer;
    if (typeof p !== 'string' || typeof a !== 'string') continue;
    if (!p.trim() || !a.trim()) continue;
    out.push({ prompt: p, answer: a });
    if (out.length >= MAX_PROMPTS) break;
  }
  return out;
}
