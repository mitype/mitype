// Catalog of real-time multiplayer games available inside a
// conversation. Each entry has presentation metadata + a slug used
// for the game_sessions.game_type column.
//
// Adding a new game = add a row here + add a renderer in
// components/games/<NewGame>.tsx + register it in GameContainer.tsx.

export type GameKey = 'wyr';

export interface GameCatalogEntry {
  key: GameKey;
  name: string;
  emoji: string;
  /** One-liner shown on the picker card. */
  tagline: string;
  /** Full instructions shown in the in-game info modal. */
  howToPlay: string[];
  /** Estimated game length in minutes (range). */
  duration: string;
  /** Difficulty / complexity hint. */
  vibe: 'easy' | 'medium' | 'hard';
}

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    key: 'wyr',
    name: 'Would You Rather',
    emoji: '🤔',
    tagline: 'Two impossible choices. See if you pick the same thing.',
    howToPlay: [
      'Each round, you and your partner see the same "Would you rather" question.',
      'You both privately pick A or B — neither sees the other\'s choice yet.',
      'Once both have picked, the round reveals and you see who picked what.',
      'You score 1 point every time you pick the SAME answer — the higher your score, the more in sync you are.',
      'There are 7 rounds per game. Highest score at the end wins the "in sync" prize.',
      'You can end the game at any time with the End Game button — your partner will be told and you\'ll both be asked if you\'d like to play something else.',
    ],
    duration: '3–5 min',
    vibe: 'easy',
  },
];

export function getGame(key: string): GameCatalogEntry | null {
  return GAME_CATALOG.find((g) => g.key === key) ?? null;
}
