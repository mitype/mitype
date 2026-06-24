// Pictionary — drawable word library.
//
// Three difficulty tiers. Drawer picks one of three candidates per
// round; we surface choices weighted toward "easy" early in the game
// and harder words later. Words are short, concrete, and drawable
// without any technical/cultural specificity that would feel unfair.

export type PictionaryDifficulty = 'easy' | 'medium' | 'hard';

export interface PictionaryWord {
  word: string;            // lowercased; we display capitalized
  difficulty: PictionaryDifficulty;
}

const EASY = [
  // Animals
  'cat', 'dog', 'fish', 'cow', 'duck', 'pig', 'bird', 'horse', 'rabbit',
  'mouse', 'frog', 'snake', 'turtle', 'bee', 'spider', 'shark', 'whale',
  'owl', 'crab',
  // Food
  'apple', 'pizza', 'banana', 'cake', 'donut', 'cookie', 'ice cream',
  'burger', 'taco', 'egg', 'cheese', 'bread', 'fries', 'pretzel',
  'sandwich', 'lollipop', 'cupcake',
  // Things at home
  'house', 'door', 'chair', 'bed', 'lamp', 'window', 'cup', 'fork',
  'spoon', 'plate', 'phone', 'tv', 'book', 'pencil', 'key', 'clock',
  'mirror', 'broom', 'pillow', 'soap',
  // Outside / nature
  'sun', 'moon', 'star', 'cloud', 'rain', 'tree', 'flower', 'leaf',
  'mountain', 'river', 'rock', 'bush',
  // Vehicles / transport
  'car', 'bus', 'train', 'plane', 'boat', 'bike',
  // Body / clothes
  'hat', 'shoe', 'sock', 'shirt', 'pants', 'glove', 'eye', 'nose',
  'ear', 'hand', 'foot', 'mouth', 'tooth',
  // Sports / play
  'ball', 'kite', 'swing', 'slide', 'drum', 'flag',
  // Misc
  'cake', 'gift', 'crown', 'umbrella', 'snowman', 'pumpkin',
  'ghost', 'rainbow', 'heart',
];

const MEDIUM = [
  // Compound objects
  'lighthouse', 'fire truck', 'roller coaster', 'helicopter', 'submarine',
  'spaceship', 'castle', 'pyramid', 'igloo', 'treehouse', 'windmill',
  'campfire', 'bonfire', 'hammock', 'fountain', 'lawn mower', 'forklift',
  'tractor', 'bulldozer', 'crane', 'parachute', 'hot air balloon',
  'jet ski', 'sailboat',
  // Activities / verbs to act out
  'dancing', 'sneeze', 'sleeping', 'jumping', 'cooking', 'painting',
  'reading', 'fishing', 'surfing', 'skiing', 'skating', 'swimming',
  'climbing', 'crying', 'laughing', 'whispering', 'kissing', 'hugging',
  // Animals trickier to draw
  'octopus', 'kangaroo', 'penguin', 'flamingo', 'giraffe', 'elephant',
  'unicorn', 'dragon', 'dinosaur', 'panda', 'koala', 'sloth', 'lobster',
  'jellyfish', 'porcupine', 'hedgehog', 'platypus',
  // Around-the-world
  'eiffel tower', 'statue of liberty', 'great wall', 'big ben',
  'pyramids', 'leaning tower',
  // Pop-culture-friendly
  'superhero', 'cowboy', 'astronaut', 'pirate', 'mermaid', 'wizard',
  'vampire', 'zombie', 'robot',
  // Slightly abstract
  'birthday', 'wedding', 'concert', 'parade', 'circus', 'haircut',
  'graduation', 'picnic', 'sunset', 'sunrise', 'earthquake', 'tornado',
  'volcano', 'shipwreck', 'avalanche', 'thunderstorm',
  // Sports / gear
  'tennis', 'football', 'basketball', 'baseball', 'bowling', 'boxing',
  'karate', 'yoga', 'golf', 'archery',
];

const HARD = [
  // Abstract concepts
  'jealousy', 'freedom', 'gravity', 'silence', 'echo', 'memory',
  'gossip', 'patience', 'dream', 'imagination', 'nostalgia', 'awkward',
  'sarcasm', 'shyness', 'embarrassed', 'bored', 'confused', 'curious',
  'exhausted',
  // Phrases / idioms
  'cold feet', 'spill the beans', 'piece of cake', 'on cloud nine',
  'break the ice', 'cat got your tongue', 'butterflies in stomach',
  'tip of the iceberg', 'raining cats and dogs', 'put your foot down',
  // Pop culture metaphors
  'going viral', 'doom scrolling', 'plot twist', 'main character',
  'red carpet', 'side quest',
  // Tricky compounds
  'glow stick', 'time machine', 'gingerbread house', 'crystal ball',
  'magic wand', 'snow globe', 'dream catcher', 'voodoo doll',
  // Animals + behaviour
  'cat nap', 'puppy love', 'lone wolf', 'social butterfly',
  // Anatomy / nature edge cases
  'iris', 'eyebrow', 'whirlpool', 'tidal wave', 'mirage', 'silhouette',
  'shadow', 'reflection', 'hologram',
];

export const PICTIONARY_EASY: PictionaryWord[] =
  EASY.map((w) => ({ word: w, difficulty: 'easy' as const }));
export const PICTIONARY_MEDIUM: PictionaryWord[] =
  MEDIUM.map((w) => ({ word: w, difficulty: 'medium' as const }));
export const PICTIONARY_HARD: PictionaryWord[] =
  HARD.map((w) => ({ word: w, difficulty: 'hard' as const }));

export const PICTIONARY_WORDS: PictionaryWord[] = [
  ...PICTIONARY_EASY,
  ...PICTIONARY_MEDIUM,
  ...PICTIONARY_HARD,
];

/**
 * Draw 3 candidates for the drawer to pick from. Mix of difficulties:
 * one easy, one medium, one hard. Round number influences the bias —
 * earlier rounds skew easier so the game starts approachable.
 */
export function pickPictionaryChoices(roundNumber: number): PictionaryWord[] {
  const pick = (pool: PictionaryWord[]) =>
    pool[Math.floor(Math.random() * pool.length)];

  // Round 1-2: mostly easy/medium; rounds 3+: lean harder.
  if (roundNumber <= 2) {
    return shuffleSmall([pick(PICTIONARY_EASY), pick(PICTIONARY_EASY), pick(PICTIONARY_MEDIUM)]);
  }
  return shuffleSmall([pick(PICTIONARY_EASY), pick(PICTIONARY_MEDIUM), pick(PICTIONARY_HARD)]);
}

function shuffleSmall<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Loose match for guesses — case-insensitive, ignores extra spaces and
 * minor punctuation. Returns true if the guess matches the target.
 */
export function guessMatches(guess: string, target: string): boolean {
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
  return normalize(guess) === normalize(target);
}

/**
 * Point award when the guess lands. Drawer also gets points so they're
 * motivated to make their drawing legible.
 */
export function pointsFor(difficulty: PictionaryDifficulty): { guesser: number; drawer: number } {
  if (difficulty === 'easy') return { guesser: 3, drawer: 2 };
  if (difficulty === 'medium') return { guesser: 5, drawer: 3 };
  return { guesser: 8, drawer: 4 };
}
