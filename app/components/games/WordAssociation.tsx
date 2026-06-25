'use client';
// Word Association — speed-chain game.
//
// Loop:
//   - One player types a starter word.
//   - The other has 8 seconds to type a word associated with it.
//   - You alternate, building a chain, until someone times out, repeats
//     an earlier word, or fumbles input (empty / non-alpha / equals
//     opponent's last word).
//   - Whoever DIDN'T break the chain wins that round + a bonus per
//     5 words of chain length.
//   - Best of 3 chains. Alternating starters across rounds.
//
// Why no "is this actually associated?" check: that's the heart of the
// fun. Cheese → moon → werewolf → Halloween → candy is a perfectly
// good chain even if it would fail any algorithmic check. We trust
// the players and let chains wander.
//
// State shape:
//   {
//     phase: 'playing' | 'round-end' | 'over',
//     currentTurn: string,                // user_id
//     chain: Array<{ word, by, at }>,     // round-scoped, reset each round
//     usedWords: string[],                 // normalized; for repeat detection
//     turnStartedAt: number,
//     roundNumber: number,
//     totalRounds: number,
//     scores: { [user_id]: number },
//     roundResult: { winnerId, reason, chainLength } | null,
//   }

import { useEffect, useState } from 'react';
import { toast } from '../../lib/toast';
import type { GameSession } from '../GameContainer';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface ChainEntry {
  word: string;
  by: string;
  at: number;
}

type LossReason = 'timeout' | 'repeat' | 'invalid' | 'same-as-prev';

interface RoundResult {
  winnerId: string;
  reason: LossReason;
  chainLength: number;
  bonus: number;
}

interface WaState {
  phase: 'playing' | 'round-end' | 'over';
  currentTurn: string;
  chain: ChainEntry[];
  usedWords: string[];
  turnStartedAt: number;
  roundNumber: number;
  totalRounds: number;
  scores: Record<string, number>;
  roundResult: RoundResult | null;
}

const TURN_DURATION_MS = 8_000;
const TOTAL_ROUNDS = 3;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z'-]/g, '');
}

function freshState(inviterId: string): WaState {
  return {
    phase: 'playing',
    currentTurn: inviterId,
    chain: [],
    usedWords: [],
    turnStartedAt: Date.now(),
    roundNumber: 1,
    totalRounds: TOTAL_ROUNDS,
    scores: {},
    roundResult: null,
  };
}

export function WordAssociation({ session, currentUserId, updateState }: Props) {
  // Inviter seeds initial state.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.phase)
    ) {
      void updateState(freshState(session.inviter_id), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.phase) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(freshState(session.inviter_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  const [input, setInput] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // Tick for the countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  // Read raw state up here — every hook below this point must be
  // called UNCONDITIONALLY on every render to keep React's hook-order
  // contract intact. We do all conditional logic with null-safe access
  // and skip the early return until after the last hook.
  const rawState = (session.state ?? null) as WaState | null;

  // Active player's client triggers the timeout to flip phase. Lives
  // ABOVE the early return so the hook count is consistent across the
  // loading and loaded renders.
  useEffect(() => {
    if (!rawState || rawState.phase !== 'playing') return;
    const myTurn = rawState.currentTurn === currentUserId;
    if (!myTurn) return;
    const ms = TURN_DURATION_MS - (now - rawState.turnStartedAt);
    if (ms > 0) return;
    void loseChainCurrent('timeout');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawState?.phase, rawState?.currentTurn, rawState?.turnStartedAt, currentUserId, now]);

  // ─────────────── Below this line: no more hooks ───────────────

  if (!rawState || !rawState.phase) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: WaState = rawState;

  const partnerId = currentUserId === session.inviter_id ? session.invitee_id : session.inviter_id;
  const isMyTurn = state.currentTurn === currentUserId && state.phase === 'playing';
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;
  const msLeft = state.phase === 'playing'
    ? Math.max(0, TURN_DURATION_MS - (now - state.turnStartedAt))
    : 0;
  const seconds = (msLeft / 1000).toFixed(1);

  // Tiny wrapper so the pre-return timer useEffect can call into the
  // loseChain logic without depending on `state` being non-null.
  async function loseChainCurrent(reason: LossReason) {
    if (!rawState || rawState.phase !== 'playing') return;
    await loseChain(reason);
  }

  async function submitWord() {
    if (!isMyTurn || state.phase !== 'playing') return;
    const norm = normalize(input);
    setInput('');
    if (!norm || norm.length < 2) {
      toast.error('Need at least 2 letters.');
      return;
    }
    if (state.usedWords.includes(norm)) {
      void loseChain('repeat', norm);
      return;
    }
    const last = state.chain.length > 0 ? state.chain[state.chain.length - 1].word : null;
    if (last && norm === last) {
      void loseChain('same-as-prev', norm);
      return;
    }
    const updated: WaState = {
      ...state,
      chain: [...state.chain, { word: norm, by: currentUserId, at: Date.now() }],
      usedWords: [...state.usedWords, norm],
      currentTurn: partnerId,
      turnStartedAt: Date.now(),
    };
    await updateState(updated);
  }

  async function loseChain(reason: LossReason, _attempted?: string) {
    // The active player just lost the chain. The PARTNER wins the
    // round. Bonus: +1 per 5 words in the chain (rounded down).
    const chainLength = state.chain.length;
    const bonus = Math.floor(chainLength / 5);
    const points = 1 + bonus;
    const winnerId = partnerId;

    const newScores = { ...state.scores };
    newScores[winnerId] = (newScores[winnerId] ?? 0) + points;

    const updated: WaState = {
      ...state,
      phase: 'round-end',
      scores: newScores,
      roundResult: { winnerId, reason, chainLength, bonus },
    };
    await updateState(updated);
  }

  async function nextRound() {
    if (state.phase !== 'round-end') return;
    const next = state.roundNumber + 1;
    if (next > state.totalRounds) {
      await updateState({ ...state, phase: 'over' }, { setStatus: 'ended', reason: 'finished' });
      return;
    }
    // Alternating starters: inviter starts odd rounds, partner starts even.
    const nextStarter = next % 2 === 1 ? session.inviter_id : session.invitee_id;
    const updated: WaState = {
      ...state,
      phase: 'playing',
      currentTurn: nextStarter,
      chain: [],
      usedWords: [],
      turnStartedAt: Date.now(),
      roundNumber: next,
      roundResult: null,
    };
    await updateState(updated);
  }

  async function finishGame() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  const isOver = state.phase === 'over' || session.status === 'ended';
  const lastWord = state.chain.length > 0 ? state.chain[state.chain.length - 1] : null;

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
        <ScoreCard label="Them" value={partnerScore} highlight={!isMyTurn && state.phase === 'playing'} />
      </div>

      {/* Round + timer */}
      {!isOver && (
        <div style={{
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.85)',
          borderRadius: 100,
          fontSize: 12, fontWeight: 800,
          letterSpacing: '0.4px',
        }}>
          Chain {state.roundNumber} of {state.totalRounds}
          {state.phase === 'playing' && (
            <span style={{ marginLeft: 8, color: msLeft < 3_000 ? '#fca5a5' : 'var(--brand-personal-soft)' }}>
              · {seconds}s
            </span>
          )}
        </div>
      )}

      {/* Playing phase */}
      {state.phase === 'playing' && (
        <>
          {/* Last word callout */}
          {lastWord ? (
            <div style={{
              padding: '14px 20px',
              background: 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))',
              borderRadius: 16,
              boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
              fontSize: 22, fontWeight: 900,
              color: 'white',
              letterSpacing: '0.5px',
              textTransform: 'lowercase',
            }}>
              {lastWord.word}
            </div>
          ) : (
            <div style={{
              padding: '12px 18px',
              background: 'rgba(255,213,168,0.12)',
              border: '1px dashed rgba(255,213,168,0.5)',
              borderRadius: 14,
              fontSize: 13, color: 'var(--brand-personal-soft)',
              textAlign: 'center',
            }}>
              {isMyTurn ? 'Start the chain with any word.' : 'Waiting for them to start the chain…'}
            </div>
          )}

          {/* Input or waiting state */}
          {isMyTurn ? (
            <form
              onSubmit={(e) => { e.preventDefault(); void submitWord(); }}
              style={{ display: 'flex', gap: 8, width: '100%' }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 30))}
                placeholder={lastWord ? 'Associate with that…' : 'Type a starter word…'}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,213,168,0.4)',
                  borderRadius: 100,
                  color: 'white',
                  fontSize: 16,
                  fontFamily: 'inherit',
                  outline: 'none',
                  letterSpacing: '0.3px',
                }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                style={!input.trim() ? disabledBtn : primaryBtn}
              >
                Send
              </button>
            </form>
          ) : (
            <div style={{
              padding: '11px 16px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13, textAlign: 'center', width: '100%',
            }}>
              {lastWord ? 'Their turn. Waiting…' : 'Waiting for them to start…'}
            </div>
          )}

          {/* Chain history */}
          {state.chain.length > 0 && (
            <div style={{
              width: '100%',
              maxHeight: 140,
              overflowY: 'auto',
              padding: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              fontSize: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              {state.chain.map((entry, i) => (
                <span
                  key={i}
                  style={{
                    padding: '3px 9px',
                    background: entry.by === currentUserId
                      ? 'rgba(200,149,108,0.25)'
                      : 'rgba(255,255,255,0.1)',
                    color: entry.by === currentUserId ? 'var(--brand-personal-soft)' : 'rgba(255,255,255,0.85)',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {entry.word}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Round-end phase */}
      {state.phase === 'round-end' && state.roundResult && (
        <div style={{
          padding: 16,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16,
          width: '100%',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
        }}>
          <div style={{ fontSize: 24 }}>
            {state.roundResult.winnerId === currentUserId ? '🎉' : '😬'}
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>
            {state.roundResult.winnerId === currentUserId
              ? 'You took this chain!'
              : 'They took this chain.'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            Reason: {explainReason(state.roundResult.reason)}
            {' · '}
            Chain length: {state.roundResult.chainLength}
            {state.roundResult.bonus > 0 && (
              <> {' · '} +{state.roundResult.bonus} bonus</>
            )}
          </div>
          <button type="button" onClick={nextRound} style={primaryBtn}>
            {state.roundNumber >= state.totalRounds ? 'See final score →' : 'Next chain →'}
          </button>
        </div>
      )}

      {/* Game-over phase */}
      {state.phase === 'over' && (() => {
        const youWon = myScore > partnerScore;
        const tied = myScore === partnerScore;
        return (
          <div style={{
            padding: 18,
            background: 'rgba(255,213,168,0.15)',
            border: '1px solid rgba(255,213,168,0.4)',
            borderRadius: 16,
            width: '100%', textAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
          }}>
            <div style={{ fontSize: 26 }}>{tied ? '🤝' : youWon ? '🏆' : '🥈'}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>
              {tied ? "It's a tie!" : youWon ? 'You win!' : 'Their win.'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              Final: you {myScore} – them {partnerScore}
            </div>
            <button type="button" onClick={finishGame} style={primaryBtn}>See summary →</button>
          </div>
        );
      })()}
    </div>
  );
}

function explainReason(r: LossReason): string {
  if (r === 'timeout') return 'ran out the clock';
  if (r === 'repeat') return 'repeated a word';
  if (r === 'same-as-prev') return 'copied the previous word';
  return 'invalid entry';
}

function ScoreCard({ label, value, highlight }: { label: string; value: number; highlight: boolean }) {
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
  background: 'var(--brand-personal)',
  color: 'white',
  border: 'none', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
};
const disabledBtn: React.CSSProperties = {
  padding: '11px 22px',
  background: 'transparent',
  color: 'rgba(255,255,255,0.3)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'default', fontFamily: 'inherit',
};
