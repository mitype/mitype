// Word Duel — move validation and scoring engine.
//
// One file, no shared mutable state. Every function takes the current
// board snapshot + a proposed list of pending tile placements and
// returns either a fully-scored move result or a typed error.
//
// Vocab:
//   - "board" is a 225-length array of Tile|null indexed row*15 + col.
//   - "placements" is the list of tiles the active player is dropping
//     this turn (cell index + the tile being placed).
//   - "word" here is any contiguous run of letters along a row or
//     column, including pre-existing letters and the new placements.

import { BOARD_PREMIUMS, BOARD_SIZE, CENTER_INDEX, type Premium, rowOf, colOf } from './board';
import { isValidWord } from './dictionary';
import type { Tile } from './tiles';

const BINGO_BONUS = 50;

export interface Placement {
  cell: number;
  tile: Tile; // tile.assignedLetter is filled for blanks; tile.letter is the canonical
}

export interface FormedWord {
  cells: number[];   // all cells in this word
  word: string;      // uppercase letters
  points: number;
  premiumsUsed: Premium[]; // for debugging / breakdowns
}

export type MoveError =
  | { kind: 'no-tiles' }
  | { kind: 'not-in-line' }
  | { kind: 'has-gap' }
  | { kind: 'must-cover-center' }
  | { kind: 'not-connected' }
  | { kind: 'invalid-word'; word: string };

export interface MoveResult {
  words: FormedWord[];
  totalPoints: number;
  bingo: boolean;
}

// Look up the letter at a board cell, treating a placed blank as its
// assignedLetter. Returns null if the cell is empty.
function letterAt(board: (Tile | null)[], cell: number): string | null {
  const t = board[cell];
  if (!t) return null;
  return (t.assignedLetter ?? t.letter).toUpperCase();
}

// Same as letterAt, but considers a virtual overlay of pending
// placements as well. We use a Map for O(1) overlay lookups.
function letterAtWith(
  board: (Tile | null)[],
  overlay: Map<number, Placement>,
  cell: number,
): string | null {
  const p = overlay.get(cell);
  if (p) return (p.tile.assignedLetter ?? p.tile.letter).toUpperCase();
  return letterAt(board, cell);
}

// Returns the run of contiguous letters along an axis through `cell`.
// dir is +1 (row → cells separated by 1) or BOARD_SIZE (col → separated
// by BOARD_SIZE). Returns the cells in order from low to high.
function runThrough(
  board: (Tile | null)[],
  overlay: Map<number, Placement>,
  cell: number,
  dir: number,
): number[] {
  // Walk backwards.
  let start = cell;
  while (true) {
    const prev = start - dir;
    if (prev < 0 || prev >= BOARD_SIZE * BOARD_SIZE) break;
    if (dir === 1 && rowOf(prev) !== rowOf(start)) break;
    if (letterAtWith(board, overlay, prev) === null) break;
    start = prev;
  }
  // Walk forwards.
  let end = cell;
  while (true) {
    const next = end + dir;
    if (next < 0 || next >= BOARD_SIZE * BOARD_SIZE) break;
    if (dir === 1 && rowOf(next) !== rowOf(end)) break;
    if (letterAtWith(board, overlay, next) === null) break;
    end = next;
  }
  const cells: number[] = [];
  for (let c = start; c <= end; c += dir) cells.push(c);
  return cells;
}

// Score a single word given its cells, the board, the pending overlay,
// and the indices of cells that are NEW this turn (so we apply
// premiums only to fresh tiles).
function scoreWord(
  cells: number[],
  board: (Tile | null)[],
  overlay: Map<number, Placement>,
  newCellSet: Set<number>,
): FormedWord {
  let letterTotal = 0;
  let wordMultiplier = 1;
  const premiumsUsed: Premium[] = [];
  let chars = '';
  for (const c of cells) {
    // Determine the tile contributing the letter.
    const p = overlay.get(c);
    const tile = p?.tile ?? board[c]!;
    const letter = (tile.assignedLetter ?? tile.letter).toUpperCase();
    chars += letter;
    let value = tile.points;
    if (newCellSet.has(c)) {
      const prem = BOARD_PREMIUMS[c];
      if (prem === 'DL') value *= 2;
      if (prem === 'TL') value *= 3;
      if (prem === 'DW') wordMultiplier *= 2;
      if (prem === 'TW') wordMultiplier *= 3;
      if (prem) premiumsUsed.push(prem);
    }
    letterTotal += value;
  }
  return {
    cells,
    word: chars,
    points: letterTotal * wordMultiplier,
    premiumsUsed,
  };
}

// The full evaluator: given a snapshot board + a pending list of
// placements + whether this is the very first move of the game,
// return either an error or the scored move result.
export function evaluateMove(
  board: (Tile | null)[],
  placements: Placement[],
  isOpeningMove: boolean,
): { ok: true; result: MoveResult } | { ok: false; error: MoveError } {
  if (placements.length === 0) {
    return { ok: false, error: { kind: 'no-tiles' } };
  }

  // 1) Geometry: all placements share a row OR all share a column.
  const rows = new Set(placements.map((p) => rowOf(p.cell)));
  const cols = new Set(placements.map((p) => colOf(p.cell)));
  const horizontal = rows.size === 1;
  const vertical = cols.size === 1;
  if (!horizontal && !vertical) {
    return { ok: false, error: { kind: 'not-in-line' } };
  }
  // Single-tile placement is treated as horizontal by default; we'll
  // check both axes for cross-words below either way.

  // Build overlay map
  const overlay = new Map<number, Placement>();
  for (const p of placements) overlay.set(p.cell, p);
  // None of the placements can collide with an existing board tile.
  for (const p of placements) {
    if (board[p.cell]) return { ok: false, error: { kind: 'not-in-line' } };
  }

  // 2) The MAIN axis run (the line the player placed along) must
  //    contain every placement with no gaps. We compute the main run
  //    by walking through the first placement and capturing the
  //    contiguous letter run on the chosen axis.
  const mainDir = horizontal ? 1 : BOARD_SIZE;
  const mainRun = runThrough(board, overlay, placements[0].cell, mainDir);
  for (const p of placements) {
    if (!mainRun.includes(p.cell)) {
      return { ok: false, error: { kind: 'has-gap' } };
    }
  }

  // 3) Connectivity:
  //    - Opening move: must touch the center.
  //    - Otherwise: at least one new tile must be adjacent to (or share
  //      its position with) an existing board letter.
  const newCells = new Set(placements.map((p) => p.cell));
  if (isOpeningMove) {
    if (!newCells.has(CENTER_INDEX)) {
      return { ok: false, error: { kind: 'must-cover-center' } };
    }
  } else {
    let touches = false;
    for (const p of placements) {
      const r = rowOf(p.cell);
      const c = colOf(p.cell);
      const neighbors = [
        r > 0 ? p.cell - BOARD_SIZE : -1,
        r < BOARD_SIZE - 1 ? p.cell + BOARD_SIZE : -1,
        c > 0 ? p.cell - 1 : -1,
        c < BOARD_SIZE - 1 ? p.cell + 1 : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && letterAt(board, n) !== null) {
          touches = true;
          break;
        }
      }
      if (touches) break;
    }
    if (!touches) return { ok: false, error: { kind: 'not-connected' } };
  }

  // 4) Collect every word formed: the main run + cross-runs through
  //    each new placement on the OTHER axis (only counts if length > 1).
  const formedWords: FormedWord[] = [];
  if (mainRun.length >= 2) {
    formedWords.push(scoreWord(mainRun, board, overlay, newCells));
  }
  const crossDir = horizontal ? BOARD_SIZE : 1;
  for (const p of placements) {
    const cross = runThrough(board, overlay, p.cell, crossDir);
    if (cross.length >= 2) {
      formedWords.push(scoreWord(cross, board, overlay, newCells));
    }
  }

  // If only the main axis had a single tile and no cross-words were
  // formed, the move technically only placed one letter with no
  // dictionary word — that's only legal in the impossible "one new
  // tile that's already part of an existing word" case. We guard:
  if (formedWords.length === 0) {
    return { ok: false, error: { kind: 'has-gap' } };
  }

  // 5) Dictionary check on every formed word.
  for (const w of formedWords) {
    if (!isValidWord(w.word)) {
      return { ok: false, error: { kind: 'invalid-word', word: w.word } };
    }
  }

  // 6) Total + bingo bonus (all 7 rack tiles placed in one turn).
  let total = formedWords.reduce((acc, w) => acc + w.points, 0);
  const bingo = placements.length === 7;
  if (bingo) total += BINGO_BONUS;

  return {
    ok: true,
    result: { words: formedWords, totalPoints: total, bingo },
  };
}

// Human-readable error message for the toast.
export function moveErrorMessage(err: MoveError): string {
  switch (err.kind) {
    case 'no-tiles':
      return 'Place at least one tile before submitting.';
    case 'not-in-line':
      return 'All your tiles must form a single row or column.';
    case 'has-gap':
      return 'Your line has a gap. Tiles must form one connected run.';
    case 'must-cover-center':
      return 'The opening word has to cover the center star.';
    case 'not-connected':
      return 'Your word has to touch a tile that\'s already on the board.';
    case 'invalid-word':
      return `"${err.word}" isn\'t in the dictionary.`;
  }
}
