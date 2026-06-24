// Word Duel — letter distribution, point values, and bag operations.
//
// Standard 100-tile Scrabble distribution. We keep this in one place
// because the engine, the rack UI, and the bag inspector all touch it.
//
// Tile encoding on the wire:
//   { letter: 'A'-'Z' | '_' (blank), points: number, blank?: boolean,
//     assignedLetter?: 'A'-'Z' }
//
// A blank tile that has been placed becomes a real letter on the board
// (via assignedLetter), but it still scores 0 points.

export interface Tile {
  letter: string;          // canonical letter for non-blanks; '_' for blanks in the bag/rack
  points: number;          // letter value (0 for blanks)
  blank?: boolean;         // true iff this tile is a blank
  assignedLetter?: string; // letter the player chose for a placed blank
}

// Quantity per letter.
export const LETTER_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1,
  L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2,
  W: 2, X: 1, Y: 2, Z: 1, _: 2,
};

// Point value per letter.
export const LETTER_VALUE: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5,
  L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4,
  W: 4, X: 8, Y: 4, Z: 10, _: 0,
};

export const RACK_SIZE = 7;

// Build a fresh full bag of 100 tiles.
export function freshBag(): Tile[] {
  const bag: Tile[] = [];
  for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      bag.push({
        letter,
        points: LETTER_VALUE[letter] ?? 0,
        blank: letter === '_',
      });
    }
  }
  return bag;
}

// Shuffle a bag in-place using Fisher-Yates with Math.random().
// We don't seed because both players' bags are managed by the same
// shared session.state — the inviter shuffles once at game start.
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Draw N tiles from the front of the bag. Returns the drawn tiles
// and the remaining bag. Caller decides how to splice them into a rack.
export function draw(bag: Tile[], n: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = bag.slice(0, n);
  const remaining = bag.slice(n);
  return { drawn, remaining };
}
