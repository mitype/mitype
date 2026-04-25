// In-chat mini-games for mitype.
//
// To avoid adding a new DB table, game state is encoded as JSON inside
// `messages.content` with a leading `[mitype-game]:` prefix. Regular text
// messages are never affected — they never start with `[`. Anything that
// fails to parse falls through to plain text rendering, so an older client
// will simply see the raw JSON instead of crashing.

export const GAME_PREFIX = '[mitype-game]:';

export type GameType = 'ttl' | 'wyr' | 'emoji';

// Payload sent by the initiator to start a game.
export type GameStart =
  | {
      t: 'ttl';
      v: 1;
      statements: [string, string, string];
      // 0-2 — index of the lie among statements.
      lieIndex: number;
    }
  | {
      t: 'wyr';
      v: 1;
      a: string;
      b: string;
    }
  | {
      t: 'emoji';
      v: 1;
      emoji: string;
      answer: string;
    };

// Payload sent by the recipient to respond.
export type GameReply =
  | {
      t: 'reply';
      v: 1;
      game: 'ttl';
      guess: number;
      correct: boolean;
      // Include the reveal so the initiator doesn't have to do anything.
      lieIndex: number;
      statements: [string, string, string];
    }
  | {
      t: 'reply';
      v: 1;
      game: 'wyr';
      pick: 'a' | 'b';
      a: string;
      b: string;
    }
  | {
      t: 'reply';
      v: 1;
      game: 'emoji';
      guess: string;
      correct: boolean;
      emoji: string;
      answer: string;
    };

export type GamePayload = GameStart | GameReply;

export function encodeGame(payload: GamePayload): string {
  return GAME_PREFIX + JSON.stringify(payload);
}

/**
 * Try to decode a message's content into a game payload. Returns null if
 * the message is plain text, the prefix is missing, or the JSON is malformed.
 */
export function decodeGame(content: string | null | undefined): GamePayload | null {
  if (!content) return null;
  if (!content.startsWith(GAME_PREFIX)) return null;
  const raw = content.slice(GAME_PREFIX.length);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.t !== 'string') return null;
    return parsed as GamePayload;
  } catch {
    return null;
  }
}

/**
 * Normalize an answer string for fuzzy comparison.
 * Strips punctuation, collapses whitespace, and lowercases.
 */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // letters+numbers+space only
    .replace(/\s+/g, ' ')
    .trim();
}

export function emojiAnswerMatches(guess: string, answer: string): boolean {
  const g = normalizeAnswer(guess);
  const a = normalizeAnswer(answer);
  if (!g || !a) return false;
  if (g === a) return true;
  // Allow leaving off "the" at the start.
  if (g === a.replace(/^the /, '')) return true;
  if (a === g.replace(/^the /, '')) return true;
  return false;
}

// Pre-written "Would You Rather" prompts so users who don't feel like
// inventing one can just pick a card.
export const WYR_PROMPTS: Array<[string, string]> = [
  ['Headline a sold-out tour', 'Star in an Oscar-winning film'],
  ['Have unlimited creative inspiration', 'Have unlimited budget for your projects'],
  ['Collaborate with your childhood hero', 'Discover the next big thing and collaborate early'],
  ['Travel back in time for a day', 'See 50 years into the future'],
  ['Live by the beach', 'Live in a creative city downtown'],
  ['Never have writer\'s block', 'Always finish what you start'],
  ['Be best-known for one iconic piece', 'Have a huge body of respected work'],
  ['Only create at sunrise', 'Only create at midnight'],
  ['Be wildly successful but anonymous', 'Be famous but modestly successful'],
  ['Get paid in coffee for life', 'Get paid in free travel for life'],
  ['Always know the perfect thing to say', 'Always know the perfect thing to play'],
  ['Meet your five-years-ago self', 'Meet your five-years-from-now self'],
  ['Write the hit song of the decade', 'Direct the hit film of the decade'],
  ['Read minds for a week', 'Be invisible for a week'],
  ['Sing like Freddie Mercury', 'Dance like Michael Jackson'],
  ['Live somewhere it\'s always autumn', 'Live somewhere it\'s always summer'],
  ['Have perfect pitch', 'Have photographic memory'],
  ['Go viral once a year', 'Have 10 loyal superfans for life'],
  ['Only work in black-and-white', 'Only work in neon colors'],
  ['Have your art in a tiny gallery you love', 'Have it in a giant museum you don\'t'],
];

// Starter prompts for "Emoji Movie" so people have something to riff on.
export const EMOJI_PROMPT_IDEAS: Array<{ emoji: string; hint: string }> = [
  { emoji: '🦁👑', hint: 'Animated, 1994' },
  { emoji: '🚢🧊💔', hint: '1997 epic' },
  { emoji: '🕷️👦', hint: 'Marvel superhero' },
  { emoji: '🧙‍♂️💍🌋', hint: 'Epic trilogy' },
  { emoji: '👻🎮👨‍👩‍👧', hint: 'Suburban horror' },
  { emoji: '🐟🔍👨‍👦', hint: 'Pixar, ocean' },
  { emoji: '💤🌆', hint: 'Inception-adjacent' },
  { emoji: '🐀👨‍🍳🍲', hint: 'Pixar, Paris' },
  { emoji: '🍫🏭🎟️', hint: '2005 remake' },
  { emoji: '🕺🪩💿', hint: '1977 disco' },
];
