'use client';
// This or That — rapid-fire taste check. Mechanically similar to Would
// You Rather but with shorter prompts and 10 quick rounds. Score = how
// many rounds you both pick the same answer.

import { useEffect } from 'react';
import { pickRandomTot, type TotPrompt } from '../../lib/thisOrThatPrompts';
import type { GameSession } from '../GameContainer';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface Round {
  prompt: TotPrompt;
  answers: Record<string, 'a' | 'b'>;
}

interface TotState {
  rounds: Round[];
  currentRound: number;
  totalRounds: number;
  matchCount: number;
  scores: Record<string, number>;
}

const TOTAL_ROUNDS = 10;

function emptyState(): TotState {
  return {
    rounds: pickRandomTot(TOTAL_ROUNDS).map((p) => ({ prompt: p, answers: {} })),
    currentRound: 0,
    totalRounds: TOTAL_ROUNDS,
    matchCount: 0,
    scores: {},
  };
}

export function ThisOrThat({ session, currentUserId, updateState }: Props) {
  // The inviter seeds the round list so both players see the same prompts.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.rounds)
    ) {
      void updateState(emptyState(), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.rounds) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(emptyState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  const state = (session.state ?? null) as TotState | null;

  if (!state || !state.rounds || state.rounds.length === 0) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }

  const round = state.rounds[state.currentRound];
  const myPick = round?.answers?.[currentUserId];
  const partnerPick = Object.entries(round?.answers ?? {})
    .find(([id]) => id !== currentUserId)?.[1];
  const bothPicked = !!myPick && !!partnerPick;

  async function pick(choice: 'a' | 'b') {
    if (myPick) return;
    const updated: TotState = JSON.parse(JSON.stringify(state));
    const r = updated.rounds[updated.currentRound];
    r.answers = { ...r.answers, [currentUserId]: choice };
    updated.scores[currentUserId] = (updated.scores[currentUserId] ?? 0) + 1;
    await updateState(updated);
  }

  async function nextRound() {
    const updated: TotState = JSON.parse(JSON.stringify(state));
    const r = updated.rounds[updated.currentRound];
    const answers = Object.values(r.answers);
    if (answers.length === 2 && answers[0] === answers[1]) updated.matchCount += 1;
    updated.currentRound += 1;
    if (updated.currentRound >= updated.totalRounds) {
      await updateState(updated, { setStatus: 'ended', reason: 'finished' });
    } else {
      await updateState(updated);
    }
  }

  const progressPct = (state.currentRound / state.totalRounds) * 100;

  return (
    <div style={{
      width: '100%', maxWidth: 540,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Round {state.currentRound + 1} of {state.totalRounds}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 800, color: 'var(--brand-personal-soft)',
          padding: '4px 12px', background: 'rgba(200,149,108,0.18)',
          borderRadius: 100,
        }}>
          🎯 {state.matchCount}
        </div>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{
          width: `${progressPct}%`, height: '100%',
          background: 'linear-gradient(90deg, var(--brand-personal), var(--brand-personal-light))',
          transition: 'width 0.4s ease',
        }} />
      </div>

      <h2 style={{
        margin: '6px 0 4px', fontSize: 22, fontWeight: 900,
        color: 'white', textAlign: 'center',
        letterSpacing: '-0.4px',
      }}>
        Pick one. Fast!
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        gap: 10, alignItems: 'stretch',
      }}>
        <BigPick
          label="A"
          text={round.prompt.a}
          picked={myPick === 'a'}
          partnerPicked={bothPicked && partnerPick === 'a'}
          disabled={!!myPick}
          revealed={bothPicked}
          onPick={() => pick('a')}
        />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)', fontWeight: 900, fontSize: 13,
          letterSpacing: 1.5,
        }}>
          OR
        </div>
        <BigPick
          label="B"
          text={round.prompt.b}
          picked={myPick === 'b'}
          partnerPicked={bothPicked && partnerPick === 'b'}
          disabled={!!myPick}
          revealed={bothPicked}
          onPick={() => pick('b')}
        />
      </div>

      <div style={{ marginTop: 4 }}>
        {!myPick && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            Tap your pick. Reveal once you&rsquo;ve both chosen.
          </p>
        )}
        {myPick && !partnerPick && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--brand-personal-soft)', margin: 0, fontWeight: 700 }}>
            Locked in. Waiting on your partner&hellip;
          </p>
        )}
        {bothPicked && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: 14,
            background: myPick === partnerPick ? 'rgba(255,213,168,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${myPick === partnerPick ? 'rgba(255,213,168,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'white', textAlign: 'center' }}>
              {myPick === partnerPick
                ? '🎉 Match!'
                : '🔀 No match'}
            </div>
            <button
              type="button"
              onClick={nextRound}
              style={{
                padding: '11px 26px',
                background: 'var(--brand-personal)',
                color: 'white',
                border: 'none', borderRadius: 100,
                fontSize: 14, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
              }}
            >
              {state.currentRound + 1 >= state.totalRounds ? 'Final score →' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BigPick({
  label, text, picked, partnerPicked, disabled, revealed, onPick,
}: {
  label: 'A' | 'B';
  text: string;
  picked: boolean;
  partnerPicked: boolean;
  disabled: boolean;
  revealed: boolean;
  onPick: () => void;
}) {
  const both = picked && partnerPicked;
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      style={{
        position: 'relative',
        padding: '24px 14px',
        background: both
          ? 'linear-gradient(135deg, var(--brand-personal-light), var(--brand-personal))'
          : picked
            ? 'linear-gradient(135deg, var(--brand-personal), #a07452)'
            : 'white',
        color: picked || both ? 'white' : 'var(--brand-text-primary)',
        border: 'none',
        borderRadius: 18,
        fontSize: 18,
        fontWeight: 900,
        lineHeight: 1.25,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        boxShadow: picked || both
          ? '0 12px 28px rgba(200,149,108,0.4)'
          : '0 6px 16px rgba(0,0,0,0.25)',
        opacity: revealed && !picked && !partnerPicked ? 0.4 : 1,
        touchAction: 'manipulation',
        minHeight: 110,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        wordBreak: 'break-word',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 10, left: 12,
        fontSize: 10, fontWeight: 900,
        color: picked || both ? 'rgba(255,255,255,0.85)' : 'var(--brand-personal)',
        letterSpacing: 1.5,
      }}>
        {label}
      </span>
      <span>{text}</span>
    </button>
  );
}
