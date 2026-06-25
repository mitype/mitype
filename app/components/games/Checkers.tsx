'use client';
// Checkers — 8×8, best of 3 matches.
//
// Rules we ship with (deliberately casual-friendly):
//   - Standard 12 pieces per side, placed on dark squares of rows 0–2
//     (inviter, moves "down" toward row 7) and rows 5–7 (invitee,
//     moves "up" toward row 0).
//   - Diagonal moves only. Regular pieces move forward; kings move
//     in any of the four diagonals.
//   - Captures: jump over an adjacent enemy piece into the empty
//     square beyond it. Multi-jumps with the SAME piece are allowed
//     and supported — you can keep going as long as another capture
//     is legal from your landing square.
//   - We do NOT enforce mandatory captures. This keeps the game
//     friendly for messaging-app vibes; you can always just slide
//     instead of jump if you'd rather.
//   - Promotion: when a piece reaches the far edge it becomes a king.
//   - Win conditions: capture all enemy pieces OR leave the opponent
//     with no legal moves on their turn. Best of 3.
//
// State shape:
//   {
//     board: (Piece | null)[64],         // row*8 + col
//     currentTurn: string,                // user_id
//     mustContinueFrom: number | null,    // square index when a multi-jump
//                                         // is in progress and the same piece
//                                         // must move again
//     matchNumber: number,
//     totalMatches: number,
//     scores: Record<string, number>,
//     matchResult: 'win' | null,          // checkers has no in-game draw here
//     matchWinnerId: string | null,
//   }
//
// Piece: { owner: string; king: boolean }
//
// Color/visual identity: inviter pieces are bronze, invitee pieces are
// cream/white. Kings get a crown notch.

import { useEffect, useState } from 'react';
import type { GameSession } from '../GameContainer';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface Piece {
  owner: string;
  king: boolean;
}

interface CkState {
  board: (Piece | null)[];
  currentTurn: string;
  mustContinueFrom: number | null;
  matchNumber: number;
  totalMatches: number;
  scores: Record<string, number>;
  matchResult: 'win' | null;
  matchWinnerId: string | null;
}

const SIZE = 8;

function idx(row: number, col: number): number {
  return row * SIZE + col;
}

function rowOf(i: number): number { return Math.floor(i / SIZE); }
function colOf(i: number): number { return i % SIZE; }

function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function emptyBoard(inviterId: string, inviteeId: string): (Piece | null)[] {
  const board: (Piece | null)[] = Array(SIZE * SIZE).fill(null);
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!isDark(row, col)) continue;
      if (row < 3) {
        board[idx(row, col)] = { owner: inviterId, king: false };
      } else if (row > 4) {
        board[idx(row, col)] = { owner: inviteeId, king: false };
      }
    }
  }
  return board;
}

function emptyState(inviterId: string, inviteeId: string): CkState {
  return {
    board: emptyBoard(inviterId, inviteeId),
    currentTurn: inviterId,
    mustContinueFrom: null,
    matchNumber: 1,
    totalMatches: 3,
    scores: {},
    matchResult: null,
    matchWinnerId: null,
  };
}

// Which row direction a player moves a non-king piece in. Inviter pieces
// start in low rows and move down (positive). Invitee moves up (negative).
function forwardDir(piece: Piece, inviterId: string): number {
  if (piece.king) return 0; // kings can go either way
  return piece.owner === inviterId ? 1 : -1;
}

// Compute all legal destinations for a given square. If anyMustContinue
// is set, we only return jumps from that square.
function legalMovesFrom(
  board: (Piece | null)[],
  from: number,
  inviterId: string,
): { to: number; captured: number | null }[] {
  const piece = board[from];
  if (!piece) return [];
  const row = rowOf(from);
  const col = colOf(from);
  const dirs: Array<[number, number]> = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.owner === inviterId
      ? [[1, -1], [1, 1]]
      : [[-1, -1], [-1, 1]];

  const moves: { to: number; captured: number | null }[] = [];
  for (const [dr, dc] of dirs) {
    // Step move
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
      const target = board[idx(nr, nc)];
      if (target === null) {
        moves.push({ to: idx(nr, nc), captured: null });
      } else if (target.owner !== piece.owner) {
        // Jump over: landing square
        const lr = row + dr * 2;
        const lc = col + dc * 2;
        if (lr >= 0 && lr < SIZE && lc >= 0 && lc < SIZE) {
          const landing = board[idx(lr, lc)];
          if (landing === null) {
            moves.push({ to: idx(lr, lc), captured: idx(nr, nc) });
          }
        }
      }
    }
  }
  return moves;
}

function legalJumpsFrom(
  board: (Piece | null)[],
  from: number,
  inviterId: string,
): { to: number; captured: number }[] {
  return legalMovesFrom(board, from, inviterId)
    .filter((m): m is { to: number; captured: number } => m.captured !== null);
}

function playerHasAnyMove(
  board: (Piece | null)[],
  playerId: string,
  inviterId: string,
): boolean {
  for (let i = 0; i < board.length; i++) {
    const p = board[i];
    if (!p || p.owner !== playerId) continue;
    if (legalMovesFrom(board, i, inviterId).length > 0) return true;
  }
  return false;
}

function applyMove(
  state: CkState,
  from: number,
  to: number,
  captured: number | null,
  inviterId: string,
  inviteeId: string,
): CkState {
  const next: CkState = JSON.parse(JSON.stringify(state));
  const moving = next.board[from];
  if (!moving) return state;
  next.board[from] = null;
  if (captured !== null) {
    next.board[captured] = null;
  }
  // Promotion check: invitee reaches row 0, inviter reaches row 7.
  const promotedRow = moving.owner === inviterId ? SIZE - 1 : 0;
  const reachedEnd = rowOf(to) === promotedRow;
  const willBeKing = moving.king || reachedEnd;
  next.board[to] = { owner: moving.owner, king: willBeKing };

  // After a capture, check if THIS piece can keep jumping. Promotion
  // breaks the chain (standard American rules) — once you king-up, the
  // turn ends.
  if (captured !== null && !(reachedEnd && !moving.king)) {
    const more = legalJumpsFrom(next.board, to, inviterId);
    if (more.length > 0) {
      next.mustContinueFrom = to;
      // currentTurn stays the same player
      return next;
    }
  }

  // Pass turn.
  next.mustContinueFrom = null;
  const partnerId = moving.owner === inviterId ? inviteeId : inviterId;
  next.currentTurn = partnerId;

  // Check end-of-match conditions for the partner.
  // 1) Did they run out of pieces?
  const partnerHasPieces = next.board.some((p) => p?.owner === partnerId);
  if (!partnerHasPieces) {
    next.matchResult = 'win';
    next.matchWinnerId = moving.owner;
    next.scores[moving.owner] = (next.scores[moving.owner] ?? 0) + 1;
    return next;
  }
  // 2) Do they have any legal moves?
  if (!playerHasAnyMove(next.board, partnerId, inviterId)) {
    next.matchResult = 'win';
    next.matchWinnerId = moving.owner;
    next.scores[moving.owner] = (next.scores[moving.owner] ?? 0) + 1;
  }
  return next;
}

export function Checkers({ session, currentUserId, updateState }: Props) {
  // Inviter seeds initial state.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.board)
    ) {
      void updateState(emptyState(session.inviter_id, session.invitee_id), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.board) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(emptyState(session.inviter_id, session.invitee_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  // Local UI selection (which of my pieces is highlighted). NOT synced
  // to the partner — they don't care which square I'm hovering.
  const [selected, setSelected] = useState<number | null>(null);

  const rawState = (session.state ?? null) as CkState | null;
  if (!rawState || !rawState.board) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: CkState = rawState;

  const inviterId = session.inviter_id;
  const inviteeId = session.invitee_id;
  const partnerId = currentUserId === inviterId ? inviteeId : inviterId;
  const isMyTurn = state.currentTurn === currentUserId && !state.matchResult;
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;
  const winsNeeded = Math.floor(state.totalMatches / 2) + 1;
  const seriesOver =
    myScore >= winsNeeded ||
    partnerScore >= winsNeeded ||
    state.matchNumber > state.totalMatches;
  const seriesWinnerId =
    myScore >= winsNeeded ? currentUserId :
    partnerScore >= winsNeeded ? partnerId : null;

  // If we're in a forced multi-jump chain, the selected square is fixed.
  const effectiveSelected =
    state.mustContinueFrom !== null && isMyTurn
      ? state.mustContinueFrom
      : selected;

  const myMovesFromSelected = effectiveSelected === null
    ? []
    : (() => {
        const moves = legalMovesFrom(state.board, effectiveSelected, inviterId);
        // If we're chained mid-jump, only jumps from this square count.
        if (state.mustContinueFrom !== null) {
          return moves.filter((m) => m.captured !== null);
        }
        return moves;
      })();
  const moveTargets = new Set(myMovesFromSelected.map((m) => m.to));

  async function handleSquareClick(square: number) {
    if (!isMyTurn) return;
    const piece = state.board[square];

    // If we're in a forced chain, only allow continuing-piece moves.
    if (state.mustContinueFrom !== null) {
      if (square === state.mustContinueFrom) return; // selection is fixed
      if (!moveTargets.has(square)) return;
      const move = myMovesFromSelected.find((m) => m.to === square);
      if (!move) return;
      const next = applyMove(state, state.mustContinueFrom, square, move.captured, inviterId, inviteeId);
      await updateState(next, next.matchResult === 'win' ? {} : {});
      return;
    }

    // First click: select one of my pieces.
    if (piece && piece.owner === currentUserId) {
      setSelected(square);
      return;
    }
    // Second click: try to move into this square.
    if (effectiveSelected !== null && moveTargets.has(square)) {
      const move = myMovesFromSelected.find((m) => m.to === square);
      if (!move) return;
      const next = applyMove(state, effectiveSelected, square, move.captured, inviterId, inviteeId);
      // Clear local selection unless the engine kept us in a chain.
      if (next.mustContinueFrom === null) {
        setSelected(null);
      } else {
        setSelected(next.mustContinueFrom);
      }
      await updateState(next);
      return;
    }
    // Tapping nothing useful — clear selection.
    setSelected(null);
  }

  async function nextMatch() {
    // Alternate opener: loser of previous match starts.
    const nextStarter = state.matchWinnerId === inviterId ? inviteeId : inviterId;
    const fresh = emptyState(inviterId, inviteeId);
    fresh.matchNumber = state.matchNumber + 1;
    fresh.scores = state.scores;
    fresh.currentTurn = nextStarter;

    const willFinishSeries =
      (fresh.scores[currentUserId] ?? 0) >= winsNeeded ||
      (fresh.scores[partnerId] ?? 0) >= winsNeeded ||
      fresh.matchNumber > state.totalMatches;

    if (willFinishSeries) {
      await updateState(fresh, { setStatus: 'ended', reason: 'finished' });
    } else {
      await updateState(fresh);
    }
    setSelected(null);
  }

  async function endSeries() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  const myPieceCount = state.board.filter((p) => p?.owner === currentUserId).length;
  const partnerPieceCount = state.board.filter((p) => p?.owner === partnerId).length;
  const iAmInviter = currentUserId === inviterId;

  return (
    <div style={{
      width: '100%', maxWidth: 400,
      display: 'flex', flexDirection: 'column', gap: 14,
      alignItems: 'center',
    }}>
      {/* Score row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8, width: '100%',
      }}>
        <ScoreCard
          label="You"
          colorLabel={iAmInviter ? 'Bronze' : 'Cream'}
          score={myScore}
          pieces={myPieceCount}
          highlight={isMyTurn}
        />
        <ScoreCard
          label="Them"
          colorLabel={iAmInviter ? 'Cream' : 'Bronze'}
          score={partnerScore}
          pieces={partnerPieceCount}
          highlight={!isMyTurn && !state.matchResult}
        />
      </div>

      <div style={{
        fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase', letterSpacing: '1.4px',
      }}>
        Match {Math.min(state.matchNumber, state.totalMatches)} of {state.totalMatches} · first to {winsNeeded}
      </div>

      {/* Turn / chain indicator */}
      {!state.matchResult && !seriesOver && (
        <div style={{
          padding: '8px 16px',
          background: isMyTurn ? 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))' : 'rgba(255,255,255,0.08)',
          color: isMyTurn ? 'white' : 'rgba(255,255,255,0.7)',
          borderRadius: 100,
          fontSize: 13, fontWeight: 800,
          boxShadow: isMyTurn ? '0 6px 18px rgba(200,149,108,0.4)' : 'none',
          textAlign: 'center',
        }}>
          {state.mustContinueFrom !== null && isMyTurn
            ? 'Chain jump. Keep going'
            : isMyTurn ? 'Your turn' : 'Their turn'}
        </div>
      )}

      {/* Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
        gap: 0,
        width: '100%',
        maxWidth: 360,
        aspectRatio: '1 / 1',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        border: '2px solid rgba(255,213,168,0.4)',
      }}>
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const row = rowOf(i);
          const col = colOf(i);
          const dark = isDark(row, col);
          const piece = state.board[i];
          const isSelected = effectiveSelected === i;
          const isTarget = moveTargets.has(i);

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSquareClick(i)}
              disabled={!isMyTurn && !piece}
              aria-label={`Square ${row + 1}-${col + 1}${piece ? `, ${piece.owner === inviterId ? 'bronze' : 'cream'} piece` : ''}`}
              style={{
                background: dark
                  ? (isTarget ? 'rgba(255,213,168,0.45)' : '#3a2a1c')
                  : '#f5e7d3',
                border: 'none',
                padding: 0,
                position: 'relative',
                cursor: isMyTurn && (piece?.owner === currentUserId || isTarget) ? 'pointer' : 'default',
                touchAction: 'manipulation',
              }}
            >
              {piece && (
                <CheckerPiece
                  piece={piece}
                  isInviter={piece.owner === inviterId}
                  selected={isSelected}
                />
              )}
              {/* Move-target dot for empty target squares */}
              {isTarget && !piece && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    width: '30%',
                    height: '30%',
                    borderRadius: '50%',
                    background: 'rgba(255,213,168,0.85)',
                    boxShadow: '0 0 12px rgba(255,213,168,0.7)',
                  }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Match result */}
      {state.matchResult === 'win' && !seriesOver && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
          padding: 16,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16, width: '100%',
        }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>
            {state.matchWinnerId === currentUserId ? '🎉 You won this match!' : '😬 They won this match'}
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
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            Final: {myScore} – {partnerScore}
          </div>
          <button type="button" onClick={endSeries} style={primaryBtn}>
            See summary →
          </button>
        </div>
      )}
    </div>
  );
}

function CheckerPiece({ piece, isInviter, selected }: {
  piece: Piece;
  isInviter: boolean;
  selected: boolean;
}) {
  // Inviter = bronze, invitee = cream. Kings get a notch ring.
  const fill = isInviter
    ? 'linear-gradient(135deg, var(--brand-personal-light) 0%, var(--brand-personal) 50%, #8a5a32 100%)'
    : 'linear-gradient(135deg, #fff8ef 0%, #f3e3cd 50%, #c9b393 100%)';
  return (
    <div style={{
      position: 'absolute',
      inset: '12%',
      borderRadius: '50%',
      background: fill,
      border: selected
        ? '2px solid var(--brand-personal-soft)'
        : isInviter ? '1px solid rgba(0,0,0,0.45)' : '1px solid rgba(0,0,0,0.18)',
      boxShadow: selected
        ? '0 0 0 3px rgba(255,213,168,0.55), 0 6px 14px rgba(0,0,0,0.4)'
        : '0 4px 10px rgba(0,0,0,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 900,
      fontSize: 16,
      color: isInviter ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.45)',
    }}>
      {piece.king && (
        <span aria-label="king" style={{ fontSize: 14, letterSpacing: '-1px' }}>♛</span>
      )}
    </div>
  );
}

function ScoreCard({ label, colorLabel, score, pieces, highlight }: {
  label: string;
  colorLabel: string;
  score: number;
  pieces: number;
  highlight: boolean;
}) {
  return (
    <div style={{
      padding: '10px 12px',
      background: highlight ? 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))' : 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800,
        color: highlight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', letterSpacing: '1.2px',
      }}>
        {label} <span style={{ opacity: 0.75 }}>({colorLabel})</span>
      </div>
      <div style={{
        fontSize: 22, fontWeight: 900, color: 'white',
        marginTop: 2,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {score}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 1,
        letterSpacing: '0.5px',
      }}>
        {pieces} piece{pieces === 1 ? '' : 's'} left
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
