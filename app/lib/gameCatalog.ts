// Catalog of real-time multiplayer games available inside a
// conversation. Each entry has presentation metadata + a slug used
// for the game_sessions.game_type column.
//
// Adding a new game = add a row here + add a renderer in
// components/games/<NewGame>.tsx + register it in GameContainer.tsx.

export type GameKey =
  | 'wyr'
  | 'tot'
  | 'ttt'
  | 'c4'
  | 'trivia'
  | 'story'
  | 'hangman'
  | 'checkers'
  | 'battleship';

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
  {
    key: 'tot',
    name: 'This or That',
    emoji: '⚡',
    tagline: 'Snap choices. 10 rapid-fire rounds. How aligned are you?',
    howToPlay: [
      'Each round you both see a quick A-or-B choice — like Pizza vs Tacos, or Beach vs Mountains.',
      'You both privately pick. Once both have chosen, the round reveals.',
      'You score 1 match every round you BOTH pick the same answer.',
      'There are 10 quick rounds per game.',
      'The more matches at the end, the more aligned your tastes are.',
      'Hit End Game at any time to bail out — your partner will be asked if they want to try a different game.',
    ],
    duration: '2–4 min',
    vibe: 'easy',
  },
  {
    key: 'ttt',
    name: 'Tic-Tac-Toe',
    emoji: '⭕',
    tagline: 'Three in a row. Classic. Best of 3.',
    howToPlay: [
      'Two players take turns marking the 3×3 grid — the inviter plays X, the partner plays O.',
      'Get three of your marks in a row (horizontal, vertical, or diagonal) to win the match.',
      'A full board with no three-in-a-row is a draw — counted but doesn\'t award a win.',
      'It\'s a best-of-3 series — first player to win 2 matches takes the series.',
      'The loser of each match opens the next one.',
      'Hit End Game at any time to bail out.',
    ],
    duration: '3–6 min',
    vibe: 'easy',
  },
  {
    key: 'c4',
    name: 'Connect Four',
    emoji: '🔴',
    tagline: 'Drop, stack, line up four. Best of 3.',
    howToPlay: [
      'Players take turns dropping a colored disc into one of the 7 columns — the inviter plays red, the partner plays yellow.',
      'The disc falls to the lowest open slot in that column.',
      'First player to get FOUR of their discs in a row (horizontal, vertical, or diagonal) wins the match.',
      'It\'s a best-of-3 series — first to 2 wins takes it.',
      'A full board with no four-in-a-row is a draw.',
      'The loser of each match opens the next one.',
      'Hit End Game at any time to bail out.',
    ],
    duration: '5–10 min',
    vibe: 'medium',
  },
  {
    key: 'trivia',
    name: 'Trivia Battle',
    emoji: '🧠',
    tagline: '7 rounds, 12 categories, head-to-head. Sharpest mind wins.',
    howToPlay: [
      'Each round both players see the same multiple-choice trivia question — pulled from 345+ questions across 12 categories (Music, Film/TV, Art, Sports, Food, Tech, Pop Culture, History, Science, and more).',
      'You both privately tap one of four answers. The round reveals as soon as both have answered.',
      'You score 1 point for every correct answer. Both right? You both get the point.',
      '7 rounds per game. Questions rotate across categories so every game feels fresh.',
      'Highest score at the end wins.',
      'Hit End Game at any time to bail out.',
    ],
    duration: '4–7 min',
    vibe: 'medium',
  },
  {
    key: 'story',
    name: 'Story Builder',
    emoji: '✍️',
    tagline: 'Build a story together, one sentence at a time.',
    howToPlay: [
      'You\'ll see a one-line story opener — that\'s the starting point.',
      'Players take turns adding ONE sentence to the story. The inviter goes first.',
      'Each sentence is capped at 200 characters to keep the rhythm tight.',
      '8 sentences total — 4 from each player. After the last sentence, you\'ll both see the finished story.',
      'No score — it\'s pure collaborative writing. Save it somewhere if you love it.',
      'Hit End Game at any time to cut the story short.',
    ],
    duration: '5–10 min',
    vibe: 'easy',
  },
  {
    key: 'hangman',
    name: 'Hangman',
    emoji: '🪢',
    tagline: 'Crack the word together — 3 rounds, 6 wrong guesses each.',
    howToPlay: [
      'Mitype picks a word from a category — you both see the blanks at the same time.',
      'Either of you can tap a letter to guess. Both players share the same guesses and the same wrong-count.',
      'Wrong letters fill in the gallows. Six wrong guesses and the round is lost.',
      'Stuck? Tap "Need a hint?" to reveal a vague nudge — using it doesn\'t cost anything.',
      'Best of 3 rounds. Whoever closes out the most words (by guessing the final letter) wins the series.',
      'Hit End Game at any time to bail out.',
    ],
    duration: '4–7 min',
    vibe: 'easy',
  },
  {
    key: 'checkers',
    name: 'Checkers',
    emoji: '🟤',
    tagline: 'Diagonals, jumps, kings. Best of 3.',
    howToPlay: [
      'Inviter plays bronze pieces, partner plays cream. Bronze moves down the board, cream moves up.',
      'Tap one of your pieces to select it — its legal landing squares glow with a dot.',
      'Move diagonally to an empty dark square, OR jump diagonally over an adjacent enemy piece into the empty square beyond to capture it.',
      'You can chain multi-jumps with the same piece — the board will keep prompting you until no more jumps are possible.',
      'When one of your pieces reaches the far edge it gets crowned a king and can move in any of the four diagonals.',
      'Win the match by capturing all of the opponent\'s pieces or leaving them with no legal moves. Best of 3 wins the series.',
      'Hit End Game at any time to bail out.',
    ],
    duration: '6–12 min',
    vibe: 'medium',
  },
  {
    key: 'battleship',
    name: 'Battleship',
    emoji: '🚢',
    tagline: 'Place your fleet. Sink theirs. Classic.',
    howToPlay: [
      'Both players start in placement mode. Tap "Roll fleet" to auto-place your five ships (Carrier, Battleship, Cruiser, Submarine, Destroyer). Re-roll as many times as you like, then "Lock in" when you\'re happy.',
      'Once both fleets are locked, the inviter fires first. Tap any unmarked cell on "Their waters" to fire a shot.',
      'Direct hit: the cell turns red and you take ANOTHER shot. Splash (miss): turn passes to your opponent.',
      'Sink an enemy ship by hitting every one of its cells. The game announces the sinking and what kind it was.',
      'Sink all 17 enemy cells across all 5 ships to win.',
      'Your fleet shows below — when they hit it, you\'ll see the damage in real time.',
      'Hit End Game at any time to bail out.',
    ],
    duration: '6–14 min',
    vibe: 'medium',
  },
];

export function getGame(key: string): GameCatalogEntry | null {
  return GAME_CATALOG.find((g) => g.key === key) ?? null;
}
