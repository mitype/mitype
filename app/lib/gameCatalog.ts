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
  | 'battleship'
  | 'chess'
  | 'wordduel'
  | 'pictionary'
  | 'wordassoc'
  | 'lyricquote';

// Lobby grouping. We bucket every game into one of four sections so
// the lobby stays scannable as the catalog grows. Order matters here —
// this is also the rendering order in the lobby.
export type GameCategory = 'quick' | 'strategy' | 'word' | 'creative';

export const GAME_CATEGORY_LABELS: Record<GameCategory, string> = {
  quick:    'Quick & social',
  strategy: 'Strategy & board',
  word:     'Word & trivia',
  creative: 'Creative & collab',
};

export const GAME_CATEGORY_ORDER: GameCategory[] = ['quick', 'strategy', 'word', 'creative'];

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
  /** Lobby section this game lives in. */
  category: GameCategory;
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
    category: 'quick',
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
    category: 'quick',
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
    category: 'strategy',
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
    category: 'strategy',
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
    category: 'word',
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
    category: 'creative',
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
    category: 'word',
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
    category: 'strategy',
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
    category: 'strategy',
  },
  {
    key: 'chess',
    name: 'Chess',
    emoji: '♟️',
    tagline: 'Full chess. Castling, en passant, the works.',
    howToPlay: [
      'Inviter plays White and moves first. Your color\'s pieces sit at the bottom of the board.',
      'Tap one of your pieces to see its legal moves — empty target squares glow with a dot, capturable enemy pieces get a red ring.',
      'Tap a highlighted square to move. All standard chess rules apply: castling (just move the king two squares — the rook teleports), en passant, pawn promotion (we auto-queen for you to keep it simple).',
      'A move that would leave your king in check is automatically blocked. When your king IS in check, the turn pill says so.',
      'Win by checkmate — when the opponent has no legal moves and their king is under attack.',
      'Stalemate, insufficient material, threefold repetition, and the 50-move rule all auto-declare a draw.',
      'A move history strip shows the last few moves in standard notation. Hit End Game at any time to bail out.',
    ],
    duration: '10–25 min',
    vibe: 'hard',
    category: 'strategy',
  },
  {
    key: 'wordduel',
    name: 'Word Duel',
    emoji: '🔤',
    tagline: 'Scrabble, head-to-head. 15×15 board, real scoring.',
    howToPlay: [
      'Both players draw 7 tiles from a 100-tile bag. Inviter plays first.',
      'Tap a tile in your rack, then tap an empty board square to place it. Tap a placed tile again to send it back to your rack.',
      'All your placed tiles each turn must form a single straight line (row or column) with no gaps. Your word must connect to letters already on the board — except the opening word, which has to cover the center star.',
      'When you submit, every word formed (the main line plus any cross-words) is checked against the dictionary and scored, including premium squares: DL/TL double or triple the letter, DW/TW double or triple the whole word.',
      'Use all 7 tiles in one turn for a +50 bingo bonus.',
      'Blank tiles are worth 0 points but you pick which letter they represent when you place them.',
      'You can Pass to skip your turn, or Swap to trade some tiles back into the bag (also uses your turn). Two passes in a row by both players ends the game.',
      'Game ends when the bag is empty AND one player\'s rack is empty. Highest score wins.',
    ],
    duration: '15–35 min',
    vibe: 'hard',
    category: 'word',
  },
  {
    key: 'pictionary',
    name: 'Pictionary',
    emoji: '🎨',
    tagline: 'One draws, one guesses. Live canvas, 4 rounds.',
    howToPlay: [
      'Each round, one player draws and the other guesses. You swap roles every round, so each player draws twice across the 4 rounds.',
      'The drawer picks one of three candidate words at the start of their turn — easy, medium, or hard, each worth more points.',
      'You have 90 seconds per round. The drawer draws on the live canvas; the guesser watches in real time and types guesses.',
      'Correct guess: the round ends immediately. Guesser earns 3/5/8 points (by difficulty) and the drawer earns 2/3/4 points for making it legible.',
      'Time out: nobody scores. The word is revealed before the next round.',
      'After 4 rounds, highest score wins. Hit End Game to bail out any time.',
    ],
    duration: '8–14 min',
    vibe: 'medium',
    category: 'creative',
  },
  {
    key: 'wordassoc',
    name: 'Word Association',
    emoji: '🧠',
    tagline: 'Chain words at speed. 8 seconds per turn.',
    howToPlay: [
      'One player types a starter word. The other has 8 seconds to type a word associated with it.',
      'You alternate — every turn has an 8-second timer. The chain keeps growing as long as both of you keep up.',
      'You break the chain if you: run out the clock, repeat any word that\'s already in the chain, or copy your opponent\'s last word.',
      'Whoever breaks the chain LOSES that round. The other player banks 1 point plus a +1 bonus per 5 words in the chain — so a long, surviving chain is worth a lot.',
      'It\'s a best of 3 chains. Starters alternate between rounds.',
      'No "real" dictionary check — associations are subjective on purpose. Trust the wander.',
      'Hit End Game to bail out at any time.',
    ],
    duration: '4–8 min',
    vibe: 'medium',
    category: 'word',
  },
  {
    key: 'lyricquote',
    name: 'Name That Quote',
    emoji: '🎤',
    tagline: 'Race to ID iconic lyrics, movie lines, and TV moments.',
    howToPlay: [
      'Each round both players see the same iconic quote — a song lyric, a movie line, or a famous TV moment from the 80s through today.',
      'Type the TITLE of the song / movie / show. You don\'t need the artist — just the title is enough.',
      'Race-to-type: the FASTER correct guess wins the round. If only one of you is right, that one wins. If neither is right, it\'s a draw.',
      'Locking in a wrong answer locks you out — you don\'t get a second try in the same round.',
      '25 seconds per clue. 7 rounds total. Highest score wins.',
      'Hit End Game to bail out at any time.',
    ],
    duration: '5–8 min',
    vibe: 'medium',
    category: 'word',
  },
];

export function getGame(key: string): GameCatalogEntry | null {
  return GAME_CATALOG.find((g) => g.key === key) ?? null;
}
