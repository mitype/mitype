'use client';
// Word Duel — Scrabble-style head-to-head word game.
//
// Two players share a 15×15 board, draw from a 100-tile bag, and
// take turns placing words. Full standard scoring including premium
// squares (DL/TL/DW/TW), bingo bonus, blanks (with a letter picker),
// and end-game conditions.
//
// State shape:
//   {
//     phase: 'placing' | 'over',
//     board: (Tile | null)[225],
//     racks: { [user_id]: Tile[] },     // 7 tiles each
//     bag: Tile[],
//     scores: { [user_id]: number },
//     currentTurn: string,
//     passCount: number,                 // consecutive passes; 2 ends game
//     winnerId: string | null,
//     lastMove: {
//       playerId: string;
//       words: string[];
//       points: number;
//       bingo: boolean;
//     } | null,
//     isOpening: boolean,                // true until first valid move lands
//   }
//
// End-game: when the bag is empty AND one player's rack is empty, OR
// when both players pass twice in a row.

import { useEffect, useState } from 'react';
import { toast } from '../../lib/toast';
import type { GameSession } from '../GameContainer';
import { freshBag, draw, shuffle, RACK_SIZE, type Tile } from '../../lib/wordDuel/tiles';
import { BOARD_PREMIUMS, BOARD_SIZE, CENTER_INDEX, rowOf } from '../../lib/wordDuel/board';
import { evaluateMove, moveErrorMessage, type Placement } from '../../lib/wordDuel/scoring';
import { loadDictionary } from '../../lib/wordDuel/dictionary';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface WdState {
  phase: 'placing' | 'over';
  board: (Tile | null)[];
  racks: Record<string, Tile[]>;
  bag: Tile[];
  scores: Record<string, number>;
  currentTurn: string;
  passCount: number;
  winnerId: string | null;
  lastMove: {
    playerId: string;
    words: string[];
    points: number;
    bingo: boolean;
  } | null;
  isOpening: boolean;
}

function buildInitialState(inviterId: string, inviteeId: string): WdState {
  const shuffled = shuffle(freshBag());
  const a = draw(shuffled, RACK_SIZE);
  const b = draw(a.remaining, RACK_SIZE);
  return {
    phase: 'placing',
    board: Array(BOARD_SIZE * BOARD_SIZE).fill(null),
    racks: {
      [inviterId]: a.drawn,
      [inviteeId]: b.drawn,
    },
    bag: b.remaining,
    scores: { [inviterId]: 0, [inviteeId]: 0 },
    currentTurn: inviterId,
    passCount: 0,
    winnerId: null,
    lastMove: null,
    isOpening: true,
  };
}

export function WordDuel({ session, currentUserId, updateState }: Props) {
  // Try to upgrade the dictionary on mount. No-op if /public/word-duel-dictionary.txt
  // isn't deployed — we fall back to the in-bundle starter set.
  useEffect(() => {
    void loadDictionary();
  }, []);

  // Inviter seeds initial state.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.phase)
    ) {
      void updateState(buildInitialState(session.inviter_id, session.invitee_id), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.phase) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(buildInitialState(session.inviter_id, session.invitee_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  // Local UI state. We track the source rack slot alongside each
  // pending placement so we know which tiles to remove when the move
  // commits — see PlacementWithIdx below the component.
  const [selectedRackIdx, setSelectedRackIdx] = useState<number | null>(null);
  const [pending, setPending] = useState<PlacementWithIdx[]>([]);
  const [blankPickerFor, setBlankPickerFor] = useState<{ rackIdx: number; cell: number } | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState<Set<number>>(new Set());

  const rawState = (session.state ?? null) as WdState | null;
  if (!rawState || !rawState.phase) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: WdState = rawState;

  const inviterId = session.inviter_id;
  const inviteeId = session.invitee_id;
  const partnerId = currentUserId === inviterId ? inviteeId : inviterId;
  const myRack = state.racks[currentUserId] ?? [];
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;
  const isMyTurn = state.currentTurn === currentUserId && state.phase === 'placing';
  const isOver = state.phase === 'over' || state.winnerId !== null;

  const pendingByCell = new Map<number, PlacementWithIdx>();
  for (const p of pending) pendingByCell.set(p.cell, p);
  const pendingRackIndices = new Set(pending.map((p) => p.rackIdx));

  // ─────────────── Local helpers ───────────────
  function clearLocal() {
    setSelectedRackIdx(null);
    setPending([]);
    setBlankPickerFor(null);
    setSwapMode(false);
    setSwapSelection(new Set());
  }

  function handleRackTap(idx: number) {
    if (!isMyTurn) return;
    if (swapMode) {
      const next = new Set(swapSelection);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      setSwapSelection(next);
      return;
    }
    if (pendingRackIndices.has(idx)) return;
    setSelectedRackIdx((cur) => (cur === idx ? null : idx));
  }

  function handleCellTap(cell: number) {
    if (!isMyTurn) return;
    // Tapping a pending placement → return to rack.
    const existingPending = pendingByCell.get(cell);
    if (existingPending) {
      setPending((prev) => prev.filter((p) => p.cell !== cell));
      return;
    }
    // Tapping an already-locked tile → no-op.
    if (state.board[cell]) return;

    if (selectedRackIdx === null) return;
    const tile = myRack[selectedRackIdx];
    if (!tile) return;

    if (tile.blank) {
      // Open letter picker; finalize the placement once a letter is chosen.
      setBlankPickerFor({ rackIdx: selectedRackIdx, cell });
      return;
    }

    setPending((prev) => [...prev, { cell, tile, rackIdx: selectedRackIdx } as PlacementWithIdx]);
    setSelectedRackIdx(null);
  }

  function chooseBlankLetter(letter: string) {
    if (!blankPickerFor) return;
    const tile = myRack[blankPickerFor.rackIdx];
    if (!tile) return;
    const placed: Tile = { ...tile, assignedLetter: letter.toUpperCase() };
    setPending((prev) => [
      ...prev,
      { cell: blankPickerFor.cell, tile: placed, rackIdx: blankPickerFor.rackIdx } as PlacementWithIdx,
    ]);
    setSelectedRackIdx(null);
    setBlankPickerFor(null);
  }

  function recall() {
    setPending([]);
    setSelectedRackIdx(null);
  }

  // ─────────────── Move actions ───────────────
  async function submitMove() {
    if (pending.length === 0) {
      toast.error('Place at least one tile first.');
      return;
    }
    const evalRes = evaluateMove(state.board, pending, state.isOpening);
    if (!evalRes.ok) {
      toast.error(moveErrorMessage(evalRes.error));
      return;
    }
    // Commit: write tiles to board, deduct from rack, redraw, pass turn.
    const board = [...state.board];
    for (const p of pending) board[p.cell] = p.tile;

    // Remove placed tiles from the player's rack (by rackIdx, careful
    // about index shifts — we filter by indices rather than splicing
    // sequentially).
    const usedIndices = new Set(pending.map((p) => p.rackIdx));
    const remainingRack = myRack.filter((_, i) => !usedIndices.has(i));

    const refill = draw(state.bag, RACK_SIZE - remainingRack.length);
    const newRack = [...remainingRack, ...refill.drawn];

    const updated: WdState = {
      ...state,
      board,
      racks: { ...state.racks, [currentUserId]: newRack },
      bag: refill.remaining,
      scores: {
        ...state.scores,
        [currentUserId]: myScore + evalRes.result.totalPoints,
      },
      currentTurn: partnerId,
      passCount: 0,
      isOpening: false,
      lastMove: {
        playerId: currentUserId,
        words: evalRes.result.words.map((w) => w.word),
        points: evalRes.result.totalPoints,
        bingo: evalRes.result.bingo,
      },
    };

    // End-game: bag empty AND one rack empty → game over.
    const partnerRack = state.racks[partnerId] ?? [];
    const someoneEmpty = newRack.length === 0 || partnerRack.length === 0;
    if (refill.remaining.length === 0 && someoneEmpty) {
      updated.phase = 'over';
      const ourFinal = updated.scores[currentUserId];
      const theirFinal = updated.scores[partnerId];
      if (ourFinal > theirFinal) updated.winnerId = currentUserId;
      else if (theirFinal > ourFinal) updated.winnerId = partnerId;
      else updated.winnerId = null; // tie
      await updateState(updated, { setStatus: 'ended', reason: 'finished' });
      clearLocal();
      return;
    }

    await updateState(updated);
    clearLocal();
    if (evalRes.result.bingo) {
      toast.success(`Bingo! +50 bonus (${evalRes.result.totalPoints} this turn)`);
    } else {
      toast.success(`+${evalRes.result.totalPoints} this turn`);
    }
  }

  async function pass() {
    const newPassCount = state.passCount + 1;
    const updated: WdState = {
      ...state,
      currentTurn: partnerId,
      passCount: newPassCount,
      lastMove: {
        playerId: currentUserId,
        words: [],
        points: 0,
        bingo: false,
      },
    };
    if (newPassCount >= 4) {
      // Both players have passed twice → end. Higher score wins.
      updated.phase = 'over';
      const ourFinal = updated.scores[currentUserId];
      const theirFinal = updated.scores[partnerId];
      if (ourFinal > theirFinal) updated.winnerId = currentUserId;
      else if (theirFinal > ourFinal) updated.winnerId = partnerId;
      else updated.winnerId = null;
      await updateState(updated, { setStatus: 'ended', reason: 'finished' });
      clearLocal();
      return;
    }
    await updateState(updated);
    clearLocal();
  }

  async function swap() {
    if (swapSelection.size === 0) {
      toast.error('Pick at least one tile to swap.');
      return;
    }
    if (state.bag.length < swapSelection.size) {
      toast.error('Not enough tiles in the bag to swap.');
      return;
    }
    const indices = [...swapSelection];
    const toReturn = indices.map((i) => myRack[i]);
    const remainingRack = myRack.filter((_, i) => !swapSelection.has(i));
    const refilledBag = shuffle([...state.bag, ...toReturn]);
    const refill = draw(refilledBag, indices.length);
    const newRack = [...remainingRack, ...refill.drawn];
    const updated: WdState = {
      ...state,
      racks: { ...state.racks, [currentUserId]: newRack },
      bag: refill.remaining,
      currentTurn: partnerId,
      passCount: state.passCount + 1,
      lastMove: {
        playerId: currentUserId,
        words: [],
        points: 0,
        bingo: false,
      },
    };
    await updateState(updated);
    clearLocal();
    toast.success('Tiles swapped.');
  }

  async function finishGame() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  // ─────────────── Render ───────────────
  if (isOver) {
    const won = state.winnerId === currentUserId;
    const tied = state.winnerId === null;
    return (
      <div style={{
        width: '100%', maxWidth: 380,
        display: 'flex', flexDirection: 'column', gap: 16,
        alignItems: 'center',
      }}>
        <div style={{
          padding: 18,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16,
          width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>
            {tied ? '🤝' : won ? '🏆' : '📖'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>
            {tied ? 'A tie!' : won ? 'You win!' : 'Their win.'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
            Final: you {myScore} – them {partnerScore}
          </div>
        </div>
        <button type="button" onClick={finishGame} style={primaryBtn}>See summary →</button>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', maxWidth: 400,
      display: 'flex', flexDirection: 'column', gap: 12,
      alignItems: 'center',
    }}>
      {/* Score row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, width: '100%',
      }}>
        <ScoreCard label="You" value={myScore} highlight={isMyTurn} />
        <ScoreCard label="Them" value={partnerScore} highlight={!isMyTurn} />
      </div>

      {/* Turn pill */}
      <div style={{
        padding: '8px 16px',
        background: isMyTurn ? 'linear-gradient(135deg, #c8956c, #ffb37c)' : 'rgba(255,255,255,0.08)',
        color: isMyTurn ? 'white' : 'rgba(255,255,255,0.7)',
        borderRadius: 100,
        fontSize: 13, fontWeight: 800,
        boxShadow: isMyTurn ? '0 6px 18px rgba(200,149,108,0.4)' : 'none',
      }}>
        {isMyTurn ? 'Your turn' : 'Their turn'}
        <span style={{ marginLeft: 10, opacity: 0.75 }}>
          · bag {state.bag.length}
        </span>
      </div>

      {/* Last move banner */}
      {state.lastMove && state.lastMove.playerId !== currentUserId && state.lastMove.words.length > 0 && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          fontSize: 12, color: 'rgba(255,255,255,0.8)',
        }}>
          They played {state.lastMove.words.join(' / ')} for +{state.lastMove.points}
          {state.lastMove.bingo && <span style={{ color: '#fcd34d', fontWeight: 800 }}> · Bingo!</span>}
        </div>
      )}

      {/* Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
        gap: 1,
        width: '100%',
        maxWidth: 360,
        aspectRatio: '1 / 1',
        background: 'rgba(0,0,0,0.5)',
        padding: 2,
        borderRadius: 8,
        border: '2px solid rgba(255,213,168,0.4)',
      }}>
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
          const prem = BOARD_PREMIUMS[i];
          const fixed = state.board[i];
          const pendingHere = pendingByCell.get(i);
          const tile = fixed ?? pendingHere?.tile ?? null;
          const isCenter = i === CENTER_INDEX;
          const isPending = !!pendingHere;
          const interactive = isMyTurn && !fixed;

          let bg = '#0c1115';
          if (!tile) {
            if (prem === 'TW') bg = '#a93020';
            else if (prem === 'DW') bg = '#c63a4c';
            else if (prem === 'TL') bg = '#1e5d8a';
            else if (prem === 'DL') bg = '#3b88c4';
          } else {
            bg = isPending
              ? 'linear-gradient(135deg, #ffd5a8, #c8956c)'
              : 'linear-gradient(135deg, #fff8ef, #f3e3cd)';
          }

          const letter = tile
            ? (tile.assignedLetter ?? tile.letter).toUpperCase()
            : null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleCellTap(i)}
              disabled={!interactive && !pendingHere}
              aria-label={`Cell ${rowOf(i) + 1}-${(i % BOARD_SIZE) + 1}`}
              style={{
                background: bg,
                border: 'none',
                padding: 0,
                cursor: interactive || pendingHere ? 'pointer' : 'default',
                color: tile ? '#0c0c10' : 'rgba(255,255,255,0.85)',
                fontSize: 11,
                fontWeight: 900,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                touchAction: 'manipulation',
                fontFamily: 'inherit',
                minHeight: 0,
                outline: isPending ? '1.5px solid #ffd5a8' : 'none',
              }}
            >
              {letter ? (
                <span style={{ fontSize: 13, fontWeight: 900 }}>{letter}</span>
              ) : isCenter ? (
                <span style={{ fontSize: 12 }}>★</span>
              ) : prem ? (
                <span style={{
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: '0.3px',
                  opacity: 0.85,
                }}>
                  {prem}
                </span>
              ) : null}
              {tile && tile.points > 0 && (
                <span style={{
                  position: 'absolute',
                  bottom: 1,
                  right: 2,
                  fontSize: 7,
                  fontWeight: 800,
                  color: '#0c0c10',
                  opacity: 0.7,
                }}>
                  {tile.points}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Rack */}
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{
          fontSize: 11, fontWeight: 800,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '1.2px', textTransform: 'uppercase',
          marginBottom: 6, textAlign: 'center',
        }}>
          Your rack
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${RACK_SIZE}, 1fr)`,
          gap: 4,
          width: '100%',
        }}>
          {Array.from({ length: RACK_SIZE }, (_, idx) => {
            const tile = myRack[idx];
            const used = pendingRackIndices.has(idx);
            const selected = selectedRackIdx === idx;
            const inSwap = swapMode && swapSelection.has(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleRackTap(idx)}
                disabled={!tile || (used && !swapMode)}
                style={{
                  position: 'relative',
                  padding: 0,
                  height: 44,
                  borderRadius: 8,
                  background: tile
                    ? used
                      ? 'rgba(255,255,255,0.06)'
                      : (selected || inSwap)
                        ? 'linear-gradient(135deg, #ffd5a8, #c8956c)'
                        : 'linear-gradient(135deg, #fff8ef, #f3e3cd)'
                    : 'rgba(255,255,255,0.04)',
                  border: selected || inSwap
                    ? '2px solid #ffd5a8'
                    : '1px solid rgba(255,255,255,0.12)',
                  color: used ? 'rgba(255,255,255,0.4)' : '#0c0c10',
                  fontSize: 18, fontWeight: 900,
                  fontFamily: 'inherit',
                  cursor: tile && (!used || swapMode) ? 'pointer' : 'default',
                  touchAction: 'manipulation',
                }}
              >
                {tile && (tile.blank ? '·' : tile.letter)}
                {tile && tile.points > 0 && (
                  <span style={{
                    position: 'absolute',
                    bottom: 2, right: 4,
                    fontSize: 9, fontWeight: 800,
                    opacity: used ? 0.5 : 0.7,
                  }}>
                    {tile.points}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      {swapMode ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={() => { setSwapMode(false); setSwapSelection(new Set()); }} style={secondaryBtn}>
            Cancel
          </button>
          <button type="button" onClick={swap} style={primaryBtn}>
            Swap {swapSelection.size}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={recall}
            disabled={!isMyTurn || pending.length === 0}
            style={pending.length === 0 ? disabledBtn : secondaryBtn}
          >
            Recall
          </button>
          <button
            type="button"
            onClick={() => setSwapMode(true)}
            disabled={!isMyTurn || pending.length > 0 || state.bag.length === 0}
            style={!isMyTurn || pending.length > 0 || state.bag.length === 0 ? disabledBtn : secondaryBtn}
          >
            Swap
          </button>
          <button
            type="button"
            onClick={pass}
            disabled={!isMyTurn || pending.length > 0}
            style={!isMyTurn || pending.length > 0 ? disabledBtn : secondaryBtn}
          >
            Pass
          </button>
          <button
            type="button"
            onClick={submitMove}
            disabled={!isMyTurn || pending.length === 0}
            style={!isMyTurn || pending.length === 0 ? disabledBtn : primaryBtn}
          >
            Submit
          </button>
        </div>
      )}

      {/* Blank letter picker overlay */}
      {blankPickerFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 16,
          }}
          onClick={() => setBlankPickerFor(null)}
        >
          <div
            style={{
              maxWidth: 360,
              background: '#1a1208',
              border: '1px solid rgba(255,213,168,0.4)',
              borderRadius: 18,
              padding: 18,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: 13, fontWeight: 800, color: '#ffd5a8',
              textAlign: 'center', marginBottom: 10,
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              Blank tile. Pick a letter
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
            }}>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => chooseBlankLetter(letter)}
                  style={{
                    padding: '8px 0',
                    background: 'rgba(255,213,168,0.12)',
                    border: '1px solid rgba(255,213,168,0.3)',
                    borderRadius: 8,
                    color: '#ffd5a8',
                    fontSize: 14, fontWeight: 900,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PlacementWithIdx — extends Placement so the engine can later refer
// to which rack slot the tile came from. The scoring engine ignores
// the extra field.
type PlacementWithIdx = Placement & { rackIdx: number };

function ScoreCard({ label, value, highlight }: { label: string; value: number; highlight: boolean }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: highlight ? 'linear-gradient(135deg, #c8956c, #ffb37c)' : 'rgba(255,255,255,0.06)',
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
        fontSize: 22, fontWeight: 900, color: 'white',
        marginTop: 2, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 22px',
  background: '#c8956c',
  color: 'white',
  border: 'none', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
};

const secondaryBtn: React.CSSProperties = {
  padding: '10px 18px',
  background: 'transparent',
  color: '#ffd5a8',
  border: '1px solid rgba(255,213,168,0.5)', borderRadius: 100,
  fontSize: 13, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
};

const disabledBtn: React.CSSProperties = {
  padding: '10px 18px',
  background: 'transparent',
  color: 'rgba(255,255,255,0.3)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100,
  fontSize: 13, fontWeight: 800,
  cursor: 'default', fontFamily: 'inherit',
};
