'use client';
// Lyric / Movie / TV Quote Guess — race-to-type.
//
// Both players see the same iconic quote or lyric at the same time.
// Both have 25 seconds to type the title (movie / song / show). The
// FIRST correct guess wins the round; if only one is correct, that
// one wins; if both wrong, the round is a draw. Lock-in is immediate —
// you can't take back a wrong guess this round.
//
// We deliberately avoid the "private select + reveal" pattern Trivia
// Battle uses, so this game feels distinct in the lobby. It rewards
// recall + typing speed.
//
// State shape:
//   {
//     phase: 'playing' | 'round-end' | 'over',
//     roundNumber: number,
//     totalRounds: number,
//     remainingClueIds: number[],
//     currentClueId: number | null,
//     roundStartedAt: number,
//     responses: { [user_id]: { text: string; correct: boolean; at: number } | null },
//     scores: { [user_id]: number },
//     lastRoundResult: { ... } | null,
//   }

import { useEffect, useState } from 'react';
import type { GameSession } from '../GameContainer';
import {
  LYRIC_QUOTE_LIBRARY,
  getQuoteById,
  quoteGuessMatches,
  shuffledQuoteIds,
  type LyricQuoteEntry,
} from '../../lib/lyricQuoteLibrary';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface Response {
  text: string;
  correct: boolean;
  at: number; // ms since round start
}

interface RoundResult {
  clueId: number;
  winnerId: string | null;     // null = draw
  drawReason?: 'neither-correct' | 'both-correct-tie';
  responses: Record<string, Response | null>;
}

interface LqState {
  phase: 'playing' | 'round-end' | 'over';
  roundNumber: number;
  totalRounds: number;
  remainingClueIds: number[];
  currentClueId: number | null;
  roundStartedAt: number;
  responses: Record<string, Response | null>;
  scores: Record<string, number>;
  lastRoundResult: RoundResult | null;
}

const TOTAL_ROUNDS = 7;
const ROUND_DURATION_MS = 25_000;

function freshState(): LqState {
  const shuffled = shuffledQuoteIds();
  const [first, ...rest] = shuffled;
  return {
    phase: 'playing',
    roundNumber: 1,
    totalRounds: TOTAL_ROUNDS,
    remainingClueIds: rest,
    currentClueId: first ?? null,
    roundStartedAt: Date.now(),
    responses: {},
    scores: {},
    lastRoundResult: null,
  };
}

export function LyricQuoteGuess({ session, currentUserId, updateState }: Props) {
  // Inviter seeds initial state.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.phase)
    ) {
      void updateState(freshState(), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.phase) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(freshState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  const [input, setInput] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // Timer tick.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  // Read state up here so every hook below can stay above the early
  // return — same Rules-of-Hooks shape we settled on for Pictionary
  // and Word Association.
  const rawState = (session.state ?? null) as LqState | null;

  // Round-timeout effect lives ABOVE the early return. Either player
  // can flip the phase when the timer hits zero — both have the same
  // state and will race on the update. Whoever wins lands, the other
  // sees the new phase via realtime and stops.
  useEffect(() => {
    if (!rawState || rawState.phase !== 'playing') return;
    const ms = ROUND_DURATION_MS - (Date.now() - rawState.roundStartedAt);
    if (ms > 0) return;
    // Only fire if BOTH players haven't answered yet — once both have
    // responded, finalizeRound auto-fires from a separate effect.
    const meResp = rawState.responses[currentUserId];
    const partnerId = currentUserId === session.inviter_id ? session.invitee_id : session.inviter_id;
    const partnerResp = rawState.responses[partnerId];
    if (meResp && partnerResp) return;
    // Inviter is the canonical timeout trigger to avoid both players
    // racing to flip the phase.
    if (currentUserId !== session.inviter_id) return;
    void finalizeWith(rawState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawState?.phase, rawState?.roundStartedAt, rawState?.responses, currentUserId, session.inviter_id, session.invitee_id, now]);

  // ─────────────── Below this line: no more hooks ───────────────
  if (!rawState || !rawState.phase) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: LqState = rawState;
  const clue = state.currentClueId ? getQuoteById(state.currentClueId) : null;

  const partnerId = currentUserId === session.inviter_id ? session.invitee_id : session.inviter_id;
  const myResponse = state.responses[currentUserId] ?? null;
  const partnerResponse = state.responses[partnerId] ?? null;
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;
  const msLeft = state.phase === 'playing'
    ? Math.max(0, ROUND_DURATION_MS - (now - state.roundStartedAt))
    : 0;
  const seconds = (msLeft / 1000).toFixed(1);
  const isOver = state.phase === 'over' || session.status === 'ended';

  // ─────────────── Round flow ───────────────
  async function submitGuess() {
    const text = input.trim();
    if (!text || !clue || state.phase !== 'playing' || myResponse) return;
    setInput('');
    const correct = quoteGuessMatches(text, clue);
    const ms = Date.now() - state.roundStartedAt;
    const myResp: Response = { text, correct, at: ms };

    // Optimistically merge our own response into a fresh state snapshot.
    const responses = { ...state.responses, [currentUserId]: myResp };
    const partnerR = responses[partnerId] ?? null;

    // If both have responded, finalize the round right away.
    if (partnerR) {
      await finalizeWith({ ...state, responses });
      return;
    }
    // Otherwise just push our response so the partner sees it.
    await updateState({ ...state, responses });
  }

  // Finalize the round and push the resulting state. Determine winner
  // by: (1) if both correct → fastest wins; (2) if one correct → they
  // win; (3) if neither → draw.
  async function finalizeWith(snapshot: LqState) {
    if (!snapshot.currentClueId) return;
    const inviter = session.inviter_id;
    const invitee = session.invitee_id;
    const r1 = snapshot.responses[inviter] ?? null;
    const r2 = snapshot.responses[invitee] ?? null;

    let winnerId: string | null = null;
    let drawReason: RoundResult['drawReason'] | undefined;

    if (r1?.correct && r2?.correct) {
      if (r1.at < r2.at) winnerId = inviter;
      else if (r2.at < r1.at) winnerId = invitee;
      else { winnerId = null; drawReason = 'both-correct-tie'; }
    } else if (r1?.correct) {
      winnerId = inviter;
    } else if (r2?.correct) {
      winnerId = invitee;
    } else {
      winnerId = null;
      drawReason = 'neither-correct';
    }

    const newScores = { ...snapshot.scores };
    if (winnerId) {
      newScores[winnerId] = (newScores[winnerId] ?? 0) + 1;
    }

    const result: RoundResult = {
      clueId: snapshot.currentClueId,
      winnerId,
      drawReason,
      responses: snapshot.responses,
    };
    const updated: LqState = {
      ...snapshot,
      phase: 'round-end',
      scores: newScores,
      lastRoundResult: result,
    };
    await updateState(updated);
  }

  async function nextRound() {
    if (state.phase !== 'round-end') return;
    const next = state.roundNumber + 1;
    if (next > state.totalRounds || state.remainingClueIds.length === 0) {
      await updateState({ ...state, phase: 'over' }, { setStatus: 'ended', reason: 'finished' });
      return;
    }
    const [nextId, ...rest] = state.remainingClueIds;
    const updated: LqState = {
      ...state,
      phase: 'playing',
      roundNumber: next,
      currentClueId: nextId,
      remainingClueIds: rest,
      roundStartedAt: Date.now(),
      responses: {},
      lastRoundResult: null,
    };
    await updateState(updated);
  }

  async function finishGame() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  // ─────────────── Render ───────────────
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
        <ScoreCard label="You" value={myScore} highlight={state.phase === 'playing' && !myResponse} />
        <ScoreCard label="Them" value={partnerScore} highlight={state.phase === 'playing' && !partnerResponse} />
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
          Round {state.roundNumber} of {state.totalRounds}
          {state.phase === 'playing' && (
            <span style={{ marginLeft: 8, color: msLeft < 5_000 ? '#fca5a5' : 'var(--brand-personal-soft)' }}>
              · {seconds}s
            </span>
          )}
        </div>
      )}

      {/* Playing phase */}
      {state.phase === 'playing' && clue && (
        <>
          {/* Kind chip */}
          <div style={{
            padding: '4px 12px',
            background: kindBg(clue.kind),
            color: 'white',
            borderRadius: 100,
            fontSize: 10, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '1.2px',
          }}>
            {kindLabel(clue.kind)} · {clue.decade}
          </div>

          {/* Quote */}
          <div style={{
            padding: '16px 18px',
            background: 'linear-gradient(135deg, rgba(255,213,168,0.15), rgba(200,149,108,0.08))',
            border: '1px solid rgba(255,213,168,0.3)',
            borderRadius: 16,
            color: 'white',
            fontSize: 17,
            lineHeight: 1.4,
            fontStyle: 'italic',
            textAlign: 'center',
            width: '100%',
            letterSpacing: '0.1px',
          }}>
            {clue.quote}
          </div>

          {/* Input or locked-in state */}
          {myResponse ? (
            <div style={{
              padding: '11px 16px',
              background: myResponse.correct
                ? 'rgba(34,197,94,0.18)'
                : 'rgba(252,165,165,0.12)',
              border: `1px solid ${myResponse.correct ? 'rgba(34,197,94,0.4)' : 'rgba(252,165,165,0.35)'}`,
              borderRadius: 14,
              color: 'white',
              fontSize: 14,
              textAlign: 'center', width: '100%',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontWeight: 800 }}>
                {myResponse.correct ? '✓ Locked in correct!' : '× Locked in wrong'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                You guessed: <strong>{myResponse.text}</strong> at {(myResponse.at / 1000).toFixed(1)}s
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {partnerResponse ? 'Calculating winner…' : 'Waiting for them…'}
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); void submitGuess(); }}
              style={{ display: 'flex', gap: 8, width: '100%' }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 60))}
                placeholder="Title (movie / song / show)…"
                autoFocus
                autoCapitalize="words"
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
                }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                style={!input.trim() ? disabledBtn : primaryBtn}
              >
                Lock in
              </button>
            </form>
          )}

          {/* Partner status */}
          {!myResponse && partnerResponse && (
            <div style={{
              fontSize: 12, color: '#fcd34d', fontWeight: 700,
            }}>
              ⚡ They locked in at {(partnerResponse.at / 1000).toFixed(1)}s
            </div>
          )}
        </>
      )}

      {/* Round-end phase */}
      {state.phase === 'round-end' && state.lastRoundResult && (() => {
        const result = state.lastRoundResult;
        const youWon = result.winnerId === currentUserId;
        const theyWon = result.winnerId === partnerId;
        const tied = result.winnerId === null;
        const clueEntry = getQuoteById(result.clueId);
        if (!clueEntry) return null;
        return (
          <div style={{
            padding: 16,
            background: 'rgba(255,213,168,0.15)',
            border: '1px solid rgba(255,213,168,0.4)',
            borderRadius: 16, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center',
          }}>
            <div style={{ fontSize: 24 }}>
              {youWon ? '🏁' : theyWon ? '😬' : tied ? '🤝' : '⏱️'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>
              {youWon ? 'You got it first!' :
               theyWon ? 'They beat you to it.' :
               result.drawReason === 'both-correct-tie' ? 'A photo finish!' :
               'Neither of you cracked it.'}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
              Answer: <strong style={{ color: 'var(--brand-personal-soft)' }}>{clueEntry.title}</strong>
              {clueEntry.artist && (
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>. {clueEntry.artist}</span>
              )}
              {' · '}
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{clueEntry.year}</span>
            </div>
            <ResponseBreakdown
              result={result}
              currentUserId={currentUserId}
              partnerId={partnerId}
              inviterId={session.inviter_id}
            />
            <button type="button" onClick={nextRound} style={primaryBtn}>
              {state.roundNumber >= state.totalRounds || state.remainingClueIds.length === 0
                ? 'See final score →'
                : 'Next clue →'}
            </button>
          </div>
        );
      })()}

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

function ResponseBreakdown({ result, currentUserId, partnerId, inviterId }: {
  result: RoundResult;
  currentUserId: string;
  partnerId: string;
  inviterId: string;
}) {
  const myResp = result.responses[currentUserId] ?? null;
  const partnerResp = result.responses[partnerId] ?? null;
  return (
    <div style={{
      width: '100%',
      display: 'flex', flexDirection: 'column', gap: 6,
      fontSize: 12, color: 'rgba(255,255,255,0.8)',
    }}>
      <ResponseLine label="You" resp={myResp} highlight={result.winnerId === currentUserId} />
      <ResponseLine label="Them" resp={partnerResp} highlight={result.winnerId === partnerId} />
    </div>
  );
}

function ResponseLine({ label, resp, highlight }: {
  label: string; resp: Response | null; highlight: boolean;
}) {
  return (
    <div style={{
      padding: '6px 10px',
      background: highlight ? 'rgba(255,213,168,0.12)' : 'rgba(255,255,255,0.04)',
      borderRadius: 8,
      display: 'flex', justifyContent: 'space-between', gap: 6,
    }}>
      <span style={{ fontWeight: 700, color: highlight ? 'var(--brand-personal-soft)' : 'rgba(255,255,255,0.7)' }}>
        {label}
      </span>
      <span>
        {resp ? (
          <>
            <span style={{ color: resp.correct ? '#86efac' : '#fca5a5', marginRight: 6 }}>
              {resp.correct ? '✓' : '×'}
            </span>
            "{resp.text}" · {(resp.at / 1000).toFixed(1)}s
          </>
        ) : (
          <span style={{ opacity: 0.55 }}>no answer</span>
        )}
      </span>
    </div>
  );
}

function kindLabel(kind: 'lyric' | 'movie' | 'tv'): string {
  if (kind === 'lyric') return 'Song';
  if (kind === 'movie') return 'Movie';
  return 'TV';
}
function kindBg(kind: 'lyric' | 'movie' | 'tv'): string {
  if (kind === 'lyric') return 'linear-gradient(135deg, var(--brand-business), var(--brand-business-light))';
  if (kind === 'movie') return 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))';
  return 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
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

// Reference unused to silence dead-import warnings if any helper goes
// untouched after refactors.
void LYRIC_QUOTE_LIBRARY;
