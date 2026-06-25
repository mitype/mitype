'use client';
// Connect Four — drop pieces in columns, first to get 4 in a row wins.
//
// State shape:
//   {
//     board: (string | null)[6][7]   // [row][col], row 0 = top, row 5 = bottom
//     currentTurn: string             // user_id whose turn it is
//     matchNumber: number             // 1..3
//     totalMatches: number            // 3
//     scores: { [user_id]: number, draws: number }
//     matchResult: 'win' | 'draw' | null
//     matchWinnerId: string | null
//     winningCells: { row: number, col: number }[] | null
//   }
//
// Colors: inviter is red, invitee is yellow.

import { useEffect } from 'react';
import type { GameSession } from '../GameContainer';

const ROWS = 6;
const COLS = 7;

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface Cell { row: number; col: number; }

interface CfState {
  board: (string | null)[][];
  currentTurn: string;
  matchNumber: number;
  totalMatches: number;
  scores: Record<string, number>;
  matchResult: 'win' | 'draw' | null;
  matchWinnerId: string | null;
  winningCells: Cell[] | null;
}

function emptyBoard(): (string | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function emptyState(inviterId: string): CfState {
  return {
    board: emptyBoard(),
    currentTurn: inviterId,
    matchNumber: 1,
    totalMatches: 3,
    scores: {},
    matchResult: null,
    matchWinnerId: null,
    winningCells: null,
  };
}

// Returns the lowest free row in a column, or -1 if the column is full.
function dropRow(board: (string | null)[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

// Walks in (dr,dc) from (row,col) — returns matching cells INCLUDING start.
function walk(board: (string | null)[][], row: number, col: number, dr: number, dc: number, who: string): Cell[] {
  const out: Cell[] = [];
  let r = row, c = col;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === who) {
    out.push({ row: r, col: c });
    r += dr; c += dc;
  }
  return out;
}

function detectWin(board: (string | null)[][], row: number, col: number, who: string): Cell[] | null {
  const directions: [number, number][] = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];
  for (const [dr, dc] of directions) {
    const forward  = walk(board, row, col, dr, dc, who);
    const backward = walk(board, row, col, -dr, -dc, who).slice(1); // skip start to avoid dupe
    const line = [...backward.reverse(), ...forward];
    if (line.length >= 4) return line.slice(0, 4);
  }
  return null;
}

function boardFull(board: (string | null)[][]): boolean {
  return board[0].every((c) => c !== null);
}

export function ConnectFour({ session, currentUserId, updateState }: Props) {
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.board)
    ) {
      void updateState(emptyState(session.inviter_id), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.board) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(emptyState(session.inviter_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  const rawState = (session.state ?? null) as CfState | null;
  if (!rawState || !rawState.board) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  // Capture into a non-null const so callbacks below stay type-safe.
  const state: CfState = rawState;

  const isInviter = currentUserId === session.inviter_id;
  const partnerId = isInviter ? session.invitee_id : session.inviter_id;
  const isMyTurn = state.currentTurn === currentUserId && !state.matchResult;
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;
  const draws = state.scores.draws ?? 0;
  const winsNeeded = Math.floor(state.totalMatches / 2) + 1;
  const seriesOver = myScore >= winsNeeded || partnerScore >= winsNeeded || state.matchNumber > state.totalMatches;
  const seriesWinnerId = myScore >= winsNeeded ? currentUserId
    : partnerScore >= winsNeeded ? partnerId
    : null;

  // Colors
  const myColor = isInviter ? '#e74c3c' : '#f1c40f';
  const partnerColor = isInviter ? '#f1c40f' : '#e74c3c';
  const myColorName = isInviter ? 'Red' : 'Yellow';
  const partnerColorName = isInviter ? 'Yellow' : 'Red';

  function colorFor(cell: string | null) {
    if (!cell) return null;
    return cell === session.inviter_id ? '#e74c3c' : '#f1c40f';
  }

  async function dropInColumn(col: number) {
    if (!isMyTurn) return;
    const row = dropRow(state.board, col);
    if (row < 0) return;

    const updated: CfState = JSON.parse(JSON.stringify(state));
    updated.board[row][col] = currentUserId;

    const winLine = detectWin(updated.board, row, col, currentUserId);
    if (winLine) {
      updated.matchResult = 'win';
      updated.matchWinnerId = currentUserId;
      updated.winningCells = winLine;
      updated.scores[currentUserId] = (updated.scores[currentUserId] ?? 0) + 1;
    } else if (boardFull(updated.board)) {
      updated.matchResult = 'draw';
      updated.scores.draws = (updated.scores.draws ?? 0) + 1;
    } else {
      updated.currentTurn = partnerId;
    }
    await updateState(updated);
  }

  async function nextMatch() {
    const updated: CfState = JSON.parse(JSON.stringify(state));
    const nextStarter = state.matchResult === 'win'
      ? (state.matchWinnerId === session.inviter_id ? session.invitee_id : session.inviter_id)
      : (state.currentTurn === session.inviter_id ? session.invitee_id : session.inviter_id);

    updated.board = emptyBoard();
    updated.currentTurn = nextStarter;
    updated.matchNumber += 1;
    updated.matchResult = null;
    updated.matchWinnerId = null;
    updated.winningCells = null;

    const willFinishSeries =
      (updated.scores[currentUserId] ?? 0) >= winsNeeded ||
      (updated.scores[partnerId] ?? 0) >= winsNeeded ||
      updated.matchNumber > updated.totalMatches;

    if (willFinishSeries) {
      await updateState(updated, { setStatus: 'ended', reason: 'finished' });
    } else {
      await updateState(updated);
    }
  }

  async function endSeries() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  // Highlight winning cells for visual feedback
  function isWinningCell(r: number, c: number): boolean {
    if (!state.winningCells) return false;
    return state.winningCells.some((wc) => wc.row === r && wc.col === c);
  }

  return (
    <div style={{
      width: '100%', maxWidth: 460,
      display: 'flex', flexDirection: 'column', gap: 14,
      alignItems: 'center',
    }}>
      {/* Score row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8, width: '100%',
      }}>
        <ScoreCard label="You" subColor={myColor} value={myScore} />
        <ScoreCard label="Draws" value={draws} dim />
        <ScoreCard label="Them" subColor={partnerColor} value={partnerScore} />
      </div>

      <div style={{
        fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase', letterSpacing: '1.4px',
      }}>
        Match {Math.min(state.matchNumber, state.totalMatches)} of {state.totalMatches} · first to {winsNeeded}
      </div>

      {!state.matchResult && !seriesOver && (
        <div style={{
          padding: '8px 16px',
          background: isMyTurn ? 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))' : 'rgba(255,255,255,0.08)',
          color: isMyTurn ? 'white' : 'rgba(255,255,255,0.7)',
          borderRadius: 100,
          fontSize: 13, fontWeight: 800,
        }}>
          {isMyTurn ? `Your turn (${myColorName})` : `Their turn (${partnerColorName})`}
        </div>
      )}

      {/* Board */}
      <div style={{
        background: '#1f4ba0',
        padding: 10,
        borderRadius: 16,
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        width: '100%',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 6,
        }}>
          {state.board.map((row, r) =>
            row.map((cell, c) => {
              const fill = colorFor(cell);
              const canDrop = isMyTurn && !state.matchResult && dropRow(state.board, c) >= 0;
              const winning = isWinningCell(r, c);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => dropInColumn(c)}
                  disabled={!canDrop}
                  aria-label={`Column ${c + 1}`}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    background: fill ?? '#0e3478',
                    border: winning ? '3px solid white' : '2px solid rgba(0,0,0,0.15)',
                    cursor: canDrop ? 'pointer' : 'default',
                    boxShadow: fill ? 'inset 0 6px 12px rgba(0,0,0,0.35)' : 'none',
                    padding: 0,
                    touchAction: 'manipulation',
                    transition: 'transform 0.1s ease',
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Match result */}
      {state.matchResult && !seriesOver && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
          padding: 16,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16, width: '100%',
        }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>
            {state.matchResult === 'draw' ? '🤝 Draw' :
              state.matchWinnerId === currentUserId ? '🎉 You won this match!' :
              '😬 They won this match'}
          </div>
          <button type="button" onClick={nextMatch} style={primaryBtn}>
            Next match →
          </button>
        </div>
      )}

      {seriesOver && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
          padding: 16,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16, width: '100%',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'white', textAlign: 'center' }}>
            {seriesWinnerId === currentUserId ? '🏆 You won the series!' :
              seriesWinnerId === partnerId ? '🥈 They won the series.' :
              'Series complete.'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
            Final: {myScore} – {partnerScore} ({draws} draw{draws === 1 ? '' : 's'})
          </div>
          <button type="button" onClick={endSeries} style={primaryBtn}>
            See summary →
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, subColor, value, dim }: {
  label: string;
  subColor?: string;
  value: number;
  dim?: boolean;
}) {
  return (
    <div style={{
      padding: '10px 8px',
      background: 'rgba(255,255,255,0.06)',
      border: subColor ? `2px solid ${subColor}` : '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      textAlign: 'center',
      opacity: dim ? 0.7 : 1,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800,
        color: 'rgba(255,255,255,0.65)',
        textTransform: 'uppercase', letterSpacing: '1.2px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 900,
        color: 'white', marginTop: 2,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '11px 26px',
  background: 'var(--brand-personal)',
  color: 'white',
  border: 'none', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
};
