// Word Duel — 15×15 board layout and premium-square map.
//
// Premium squares (the colored bonuses you remember from Scrabble):
//   DL — Double Letter
//   TL — Triple Letter
//   DW — Double Word
//   TW — Triple Word
//   ★  — Center star, counts as DW for the very first word.
//
// We store the premium for each square as a string in a 225-long
// array, indexed row*15 + col. '' means no premium.

export const BOARD_SIZE = 15;
export const CENTER_INDEX = 7 * BOARD_SIZE + 7;

export type Premium = '' | 'DL' | 'TL' | 'DW' | 'TW';

// Build the standard Scrabble premium-square map. Identical to the
// real board so anyone who knows Scrabble can read it at a glance.
function buildBoard(): Premium[] {
  const board: Premium[] = Array(BOARD_SIZE * BOARD_SIZE).fill('');

  const set = (r: number, c: number, p: Premium) => {
    board[r * BOARD_SIZE + c] = p;
  };

  // Triple Word — 8 squares at the corners and edge midpoints.
  const TW: Array<[number, number]> = [
    [0, 0], [0, 7], [0, 14],
    [7, 0], [7, 14],
    [14, 0], [14, 7], [14, 14],
  ];
  TW.forEach(([r, c]) => set(r, c, 'TW'));

  // Double Word — diagonals from each corner toward the center.
  for (let i = 1; i <= 4; i++) {
    set(i, i, 'DW');
    set(i, BOARD_SIZE - 1 - i, 'DW');
    set(BOARD_SIZE - 1 - i, i, 'DW');
    set(BOARD_SIZE - 1 - i, BOARD_SIZE - 1 - i, 'DW');
  }

  // Triple Letter
  const TL: Array<[number, number]> = [
    [1, 5], [1, 9],
    [5, 1], [5, 5], [5, 9], [5, 13],
    [9, 1], [9, 5], [9, 9], [9, 13],
    [13, 5], [13, 9],
  ];
  TL.forEach(([r, c]) => set(r, c, 'TL'));

  // Double Letter
  const DL: Array<[number, number]> = [
    [0, 3], [0, 11],
    [2, 6], [2, 8],
    [3, 0], [3, 7], [3, 14],
    [6, 2], [6, 6], [6, 8], [6, 12],
    [7, 3], [7, 11],
    [8, 2], [8, 6], [8, 8], [8, 12],
    [11, 0], [11, 7], [11, 14],
    [12, 6], [12, 8],
    [14, 3], [14, 11],
  ];
  DL.forEach(([r, c]) => set(r, c, 'DL'));

  // Center star — treated as DW for the opening play.
  board[CENTER_INDEX] = 'DW';

  return board;
}

export const BOARD_PREMIUMS: Premium[] = buildBoard();

export function premiumAt(cell: number): Premium {
  return BOARD_PREMIUMS[cell] ?? '';
}

export function rowOf(cell: number): number { return Math.floor(cell / BOARD_SIZE); }
export function colOf(cell: number): number { return cell % BOARD_SIZE; }
