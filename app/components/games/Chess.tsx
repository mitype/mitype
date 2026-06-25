'use client';
// Chess — real chess, using the chess.js rules engine.
//
// Why chess.js: chess is deceptively complex (castling rules, en passant,
// "this move would leave my king in check" validation, pawn promotion,
// 50-move draws, threefold repetition…). chess.js handles all of it,
// is MIT-licensed, ~50KB, no native deps, and is the most-used chess
// library on npm by a wide margin. We just lean on it.
//
// We DO ship the rules engine, not just the board:
//   - chess.js validates every move and tells us whose turn it is
//   - chess.js detects check/checkmate/stalemate/draws
//   - chess.js exposes a FEN string we sync to the partner via the
//     session.state.fen field — that's our entire wire format. Tiny.
//
// Network spec:
//   state: {
//     fen: string,            // chess.js Forsyth–Edwards Notation
//     history: string[],      // SAN move strings, for the move log
//     winnerId: string | null,
//     drawReason: string | null,  // human-readable when draw is detected
//   }
//
// Color assignment: inviter plays WHITE, partner plays BLACK. Same
// convention as TicTacToe (inviter opens).
//
// Pawn promotion: we always auto-promote to queen. 99% of the time
// that's what people want, and skipping the picker keeps the UI clean
// on mobile.

import { useEffect, useMemo, useState } from 'react';
import { Chess as ChessEngine, type Move, type Square } from 'chess.js';
import type { GameSession } from '../GameContainer';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface ChessState {
  fen: string;
  history: string[];
  winnerId: string | null;
  drawReason: string | null;
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function emptyState(): ChessState {
  return {
    fen: STARTING_FEN,
    history: [],
    winnerId: null,
    drawReason: null,
  };
}

// Map chess.js piece codes to Unicode chess glyphs. We use the
// filled-color glyphs for both sides and rely on CSS color for
// distinction — gives us a clean, consistent typographic feel
// rather than mismatched outline-vs-fill characters.
const PIECE_GLYPH: Record<string, string> = {
  K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

function squareName(rIdx: number, cIdx: number): Square {
  // rIdx 0 = top of view, cIdx 0 = left of view.
  return `${FILES[cIdx]}${RANKS[rIdx]}` as Square;
}

export function Chess({ session, currentUserId, updateState }: Props) {
  // Inviter seeds initial state.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.fen)
    ) {
      void updateState(emptyState(), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.fen) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(emptyState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  // Selected source square (local UI only).
  const [selected, setSelected] = useState<Square | null>(null);

  const rawState = (session.state ?? null) as ChessState | null;

  // Engine — rebuild from FEN every render. chess.js is cheap to
  // construct; this keeps the engine in lockstep with whatever the
  // shared state says without any sync drift.
  const engine = useMemo(() => {
    try {
      return new ChessEngine(rawState?.fen ?? STARTING_FEN);
    } catch {
      return new ChessEngine();
    }
  }, [rawState?.fen]);

  if (!rawState || !rawState.fen) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: ChessState = rawState;

  const inviterId = session.inviter_id;
  const inviteeId = session.invitee_id;
  const partnerId = currentUserId === inviterId ? inviteeId : inviterId;
  const iAmWhite = currentUserId === inviterId;
  const mySide: 'w' | 'b' = iAmWhite ? 'w' : 'b';
  const isMyTurn = engine.turn() === mySide && !engine.isGameOver();

  // Compute the legal destination squares for whatever piece is
  // currently selected — used to highlight target squares.
  //
  // Inlined (not memoized) on purpose: a useMemo *after* the early
  // return above would mean the hook count differs between the
  // loading render and the loaded render, which violates the Rules
  // of Hooks and crashes the route. The chess.js .moves() call is
  // cheap and only runs when something is selected.
  const moveTargets: Set<string> = selected
    ? new Set((engine.moves({ square: selected, verbose: true }) as Move[]).map((m) => m.to))
    : new Set<string>();

  async function clickSquare(square: Square) {
    if (!isMyTurn) return;
    const piece = engine.get(square);

    // If we tap an empty square or an enemy piece with nothing
    // selected: do nothing meaningful.
    if (!selected) {
      if (piece && piece.color === mySide) {
        setSelected(square);
      }
      return;
    }

    // Re-select if we tap another of our own pieces.
    if (piece && piece.color === mySide) {
      setSelected(square);
      return;
    }

    // Try to move.
    if (!moveTargets.has(square)) {
      // Tap on nothing useful — clear selection.
      setSelected(null);
      return;
    }
    try {
      const move = engine.move({ from: selected, to: square, promotion: 'q' });
      if (!move) {
        setSelected(null);
        return;
      }
      // Build the updated state and push.
      const updated: ChessState = {
        fen: engine.fen(),
        history: [...state.history, move.san],
        winnerId: state.winnerId,
        drawReason: state.drawReason,
      };
      let endStatus: 'ended' | undefined;
      if (engine.isCheckmate()) {
        // The PLAYER WHO JUST MOVED won — the opposite of engine.turn()
        // (which is whoever is now stuck).
        updated.winnerId = currentUserId;
        endStatus = 'ended';
      } else if (engine.isStalemate()) {
        updated.drawReason = 'Stalemate. No legal moves.';
        endStatus = 'ended';
      } else if (engine.isInsufficientMaterial()) {
        updated.drawReason = 'Draw. Insufficient material.';
        endStatus = 'ended';
      } else if (engine.isThreefoldRepetition()) {
        updated.drawReason = 'Draw. Threefold repetition.';
        endStatus = 'ended';
      } else if (engine.isDraw()) {
        updated.drawReason = 'Draw. 50-move rule.';
        endStatus = 'ended';
      }
      setSelected(null);
      await updateState(updated, endStatus ? { setStatus: 'ended', reason: 'finished' } : {});
    } catch {
      // chess.js throws if move is illegal. Clear and move on.
      setSelected(null);
    }
  }

  async function finishGame() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  const inCheck = engine.inCheck();
  const isOver = !!state.winnerId || !!state.drawReason;
  const youWon = state.winnerId === currentUserId;
  const youLost = state.winnerId === partnerId;

  // Orient the board for the player. White on bottom for the inviter,
  // black on bottom for the partner — feels natural for both sides.
  const ranks = iAmWhite ? RANKS : [...RANKS].reverse();
  const files = iAmWhite ? FILES : [...FILES].reverse();

  return (
    <div style={{
      width: '100%', maxWidth: 400,
      display: 'flex', flexDirection: 'column', gap: 12,
      alignItems: 'center',
    }}>
      {/* Side label + status */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, width: '100%',
      }}>
        <SideCard label="You" colorLabel={iAmWhite ? 'White' : 'Black'} highlight={isMyTurn} />
        <SideCard label="Them" colorLabel={iAmWhite ? 'Black' : 'White'} highlight={!isMyTurn && !isOver} />
      </div>

      {/* Turn / check pill */}
      {!isOver && (
        <div style={{
          padding: '8px 16px',
          background: isMyTurn
            ? 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))'
            : 'rgba(255,255,255,0.08)',
          color: isMyTurn ? 'white' : 'rgba(255,255,255,0.7)',
          borderRadius: 100,
          fontSize: 13, fontWeight: 800,
          boxShadow: isMyTurn ? '0 6px 18px rgba(200,149,108,0.4)' : 'none',
          textAlign: 'center',
        }}>
          {isMyTurn ? 'Your move' : 'Their move'}
          {inCheck && (engine.turn() === mySide
            ? <span style={{ marginLeft: 8, color: '#fca5a5' }}>- check</span>
            : <span style={{ marginLeft: 8, color: '#fcd34d' }}>- check</span>)}
        </div>
      )}

      {/* Board */}
      <div
        role="grid"
        aria-label="Chess board"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, 1fr)`,
          gap: 0,
          width: '100%',
          maxWidth: 360,
          aspectRatio: '1 / 1',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
          border: '2px solid rgba(255,213,168,0.4)',
        }}
      >
        {ranks.map((rank, rIdx) =>
          files.map((file, cIdx) => {
            const sq = `${file}${rank}` as Square;
            const piece = engine.get(sq);
            const dark = (rIdx + cIdx) % 2 === 1;
            const isSelected = selected === sq;
            const isTarget = moveTargets.has(sq);
            const showLastMove = state.history.length > 0 && (() => {
              const verbose = engine.history({ verbose: true }) as Move[];
              const last = verbose[verbose.length - 1];
              return last && (last.from === sq || last.to === sq);
            })();
            return (
              <button
                key={sq}
                type="button"
                onClick={() => clickSquare(sq)}
                disabled={!isMyTurn && !piece}
                aria-label={`${sq}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
                style={{
                  position: 'relative',
                  background: dark
                    ? (isSelected ? '#a06b3d' : '#3a2a1c')
                    : (isSelected ? '#ead0b3' : '#f5e7d3'),
                  border: 'none',
                  padding: 0,
                  cursor: isMyTurn && (piece?.color === mySide || isTarget) ? 'pointer' : 'default',
                  fontSize: 30,
                  lineHeight: 1,
                  color: piece?.color === 'w' ? '#fff8ef' : '#0c0c10',
                  textShadow: piece?.color === 'w'
                    ? '0 1px 1px rgba(0,0,0,0.5)'
                    : '0 1px 1px rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                  fontFamily: '"Apple Color Emoji", "Segoe UI Symbol", "Noto Sans Symbols2", serif',
                }}
              >
                {piece && (
                  <span aria-hidden="true">
                    {PIECE_GLYPH[piece.color === 'w' ? piece.type.toUpperCase() : piece.type] ?? ''}
                  </span>
                )}
                {/* Move-target dot */}
                {isTarget && !piece && (
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <span style={{
                      width: '30%', height: '30%',
                      borderRadius: '50%',
                      background: 'rgba(200,149,108,0.7)',
                      boxShadow: '0 0 8px rgba(200,149,108,0.6)',
                    }} />
                  </span>
                )}
                {/* Capture ring on enemy targets */}
                {isTarget && piece && (
                  <span style={{
                    position: 'absolute',
                    inset: '8%',
                    border: '3px solid rgba(220, 90, 90, 0.85)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Last move highlight */}
                {showLastMove && !isSelected && (
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255,213,168,0.18)',
                    pointerEvents: 'none',
                  }} />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Move history (last few) */}
      {state.history.length > 0 && !isOver && (
        <div style={{
          width: '100%', maxWidth: 360,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          fontSize: 12, color: 'rgba(255,255,255,0.75)',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          letterSpacing: '0.4px',
          maxHeight: 68,
          overflowY: 'auto',
        }}>
          {pairUpMoves(state.history).map((p, i) => (
            <span key={i} style={{ marginRight: 12, whiteSpace: 'nowrap' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>{i + 1}.</span>{' '}
              {p[0]}{p[1] ? ` ${p[1]}` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Result */}
      {isOver && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
          padding: 16,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16, width: '100%',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'white', textAlign: 'center' }}>
            {state.drawReason
              ? `🤝 ${state.drawReason}`
              : youWon
                ? '🏆 Checkmate. You win!'
                : youLost
                  ? '👑 Checkmate. They win.'
                  : 'Game over.'}
          </div>
          <button type="button" onClick={finishGame} style={primaryBtn}>
            See summary →
          </button>
        </div>
      )}
    </div>
  );
}

// Pair SAN moves into [white, black] tuples for a nicer move log.
function pairUpMoves(history: string[]): Array<[string, string | null]> {
  const pairs: Array<[string, string | null]> = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([history[i], history[i + 1] ?? null]);
  }
  return pairs;
}

function SideCard({ label, colorLabel, highlight }: {
  label: string;
  colorLabel: string;
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
        {label}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 900, color: 'white', marginTop: 2,
      }}>
        {colorLabel}
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
