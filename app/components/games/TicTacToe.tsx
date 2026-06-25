'use client';
// Tic-Tac-Toe — turn-based 3x3, best of 3 matches.
//
// State shape:
//   {
//     board: (string | null)[9],      // user_id of who claimed each cell
//     currentTurn: string,             // user_id whose turn it is
//     matchNumber: number,             // 1..3
//     scores: { [user_id]: number, draws: number },
//     matchResult: 'win' | 'draw' | null,  // current match result; null while playing
//     matchWinnerId: string | null,    // user_id of winning player when matchResult='win'
//     winningLine: number[] | null,    // 3 cell indices when there's a win
//   }
//
// Symbols: inviter is X, invitee is O. Inviter always opens match 1.

import { useEffect } from 'react';
import type { GameSession } from '../GameContainer';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface TttState {
  board: (string | null)[];
  currentTurn: string;
  matchNumber: number;
  totalMatches: number;
  scores: Record<string, number>;
  matchResult: 'win' | 'draw' | null;
  matchWinnerId: string | null;
  winningLine: number[] | null;
}

const LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
  [0, 4, 8], [2, 4, 6],              // diagonals
];

function detectWin(board: (string | null)[]): { winnerId: string | null; line: number[] | null } {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winnerId: board[a], line };
    }
  }
  return { winnerId: null, line: null };
}

function isBoardFull(board: (string | null)[]): boolean {
  return board.every((c) => c !== null);
}

function emptyState(inviterId: string): TttState {
  return {
    board: Array(9).fill(null),
    currentTurn: inviterId,
    matchNumber: 1,
    totalMatches: 3,
    scores: {},
    matchResult: null,
    matchWinnerId: null,
    winningLine: null,
  };
}

export function TicTacToe({ session, currentUserId, updateState }: Props) {
  // Inviter seeds initial state.
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

  const rawState = (session.state ?? null) as TttState | null;
  if (!rawState || !rawState.board) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  // Capture into a non-null const so callbacks below stay type-safe.
  const state: TttState = rawState;

  // Inviter = X, Invitee = O. Always.
  const mySymbol = currentUserId === session.inviter_id ? 'X' : 'O';
  const partnerSymbol = mySymbol === 'X' ? 'O' : 'X';
  const partnerId = currentUserId === session.inviter_id ? session.invitee_id : session.inviter_id;
  const isMyTurn = state.currentTurn === currentUserId && !state.matchResult;
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;
  const draws = state.scores.draws ?? 0;
  const winsNeeded = Math.floor(state.totalMatches / 2) + 1;
  const seriesOver = myScore >= winsNeeded || partnerScore >= winsNeeded || state.matchNumber > state.totalMatches;
  const seriesWinnerId = myScore >= winsNeeded ? currentUserId
    : partnerScore >= winsNeeded ? partnerId
    : null;

  async function placeMark(idx: number) {
    if (!isMyTurn) return;
    if (state.board[idx] !== null) return;

    const updated: TttState = JSON.parse(JSON.stringify(state));
    updated.board[idx] = currentUserId;

    const { winnerId, line } = detectWin(updated.board);
    if (winnerId) {
      updated.matchResult = 'win';
      updated.matchWinnerId = winnerId;
      updated.winningLine = line;
      updated.scores[winnerId] = (updated.scores[winnerId] ?? 0) + 1;
    } else if (isBoardFull(updated.board)) {
      updated.matchResult = 'draw';
      updated.scores.draws = (updated.scores.draws ?? 0) + 1;
    } else {
      // Pass turn
      updated.currentTurn = partnerId;
    }
    await updateState(updated);
  }

  async function nextMatch() {
    const updated: TttState = JSON.parse(JSON.stringify(state));
    // Alternate who opens each match — loser of previous match starts.
    const nextStarter = state.matchResult === 'win'
      ? (state.matchWinnerId === session.inviter_id ? session.invitee_id : session.inviter_id)
      : (state.currentTurn === session.inviter_id ? session.invitee_id : session.inviter_id);

    updated.board = Array(9).fill(null);
    updated.currentTurn = nextStarter;
    updated.matchNumber += 1;
    updated.matchResult = null;
    updated.matchWinnerId = null;
    updated.winningLine = null;

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

  return (
    <div style={{
      width: '100%', maxWidth: 380,
      display: 'flex', flexDirection: 'column', gap: 16,
      alignItems: 'center',
    }}>
      {/* Score row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8, width: '100%',
      }}>
        <ScoreCard label="You" subLabel={`(${mySymbol})`} value={myScore} highlight={mySymbol === 'X'} />
        <ScoreCard label="Draws" subLabel="" value={draws} highlight={false} dim />
        <ScoreCard label="Them" subLabel={`(${partnerSymbol})`} value={partnerScore} highlight={mySymbol === 'O'} />
      </div>

      <div style={{
        fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase', letterSpacing: '1.4px',
      }}>
        Match {Math.min(state.matchNumber, state.totalMatches)} of {state.totalMatches} · first to {winsNeeded}
      </div>

      {/* Turn indicator */}
      {!state.matchResult && !seriesOver && (
        <div style={{
          padding: '8px 16px',
          background: isMyTurn ? 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))' : 'rgba(255,255,255,0.08)',
          color: isMyTurn ? 'white' : 'rgba(255,255,255,0.7)',
          borderRadius: 100,
          fontSize: 13, fontWeight: 800,
          boxShadow: isMyTurn ? '0 6px 18px rgba(200,149,108,0.4)' : 'none',
        }}>
          {isMyTurn ? `Your turn (${mySymbol})` : `Their turn (${partnerSymbol})`}
        </div>
      )}

      {/* Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        width: '100%',
        maxWidth: 320,
        aspectRatio: '1 / 1',
      }}>
        {state.board.map((cell, i) => {
          const isWinning = state.winningLine?.includes(i) ?? false;
          const symbol = cell === null ? null
            : cell === session.inviter_id ? 'X' : 'O';
          return (
            <button
              key={i}
              type="button"
              onClick={() => placeMark(i)}
              disabled={!isMyTurn || cell !== null || !!state.matchResult}
              aria-label={`Cell ${i + 1}`}
              style={{
                background: isWinning
                  ? 'linear-gradient(135deg, var(--brand-personal-light), var(--brand-personal))'
                  : 'rgba(255,255,255,0.06)',
                border: '2px solid rgba(255,255,255,0.12)',
                borderRadius: 14,
                color: symbol === 'X' ? 'var(--brand-personal-soft)' : symbol === 'O' ? 'white' : 'transparent',
                fontSize: 48,
                fontWeight: 900,
                cursor: !isMyTurn || cell !== null ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s ease',
                touchAction: 'manipulation',
                padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {symbol}
            </button>
          );
        })}
      </div>

      {/* Match result / advance */}
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
          <button
            type="button"
            onClick={nextMatch}
            style={primaryBtn}
          >
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
              "Series complete."}
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

function ScoreCard({ label, subLabel, value, highlight, dim }: {
  label: string;
  subLabel: string;
  value: number;
  highlight: boolean;
  dim?: boolean;
}) {
  return (
    <div style={{
      padding: '10px 8px',
      background: highlight ? 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))' : 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      textAlign: 'center',
      opacity: dim ? 0.7 : 1,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800,
        color: highlight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', letterSpacing: '1.2px',
      }}>
        {label} {subLabel && <span style={{ opacity: 0.75 }}>{subLabel}</span>}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 900,
        color: 'white',
        marginTop: 2,
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
