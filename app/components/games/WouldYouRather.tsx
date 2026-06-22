'use client';
// Would You Rather — the first multiplayer game.
//
// State shape on game_sessions.state:
//   {
//     rounds: [
//       { prompt: { a, b }, answers: { [userId]: 'a' | 'b' } }
//     ],
//     currentRound: number,    // index into rounds
//     totalRounds: number,     // 7
//     matchCount: number,      // how many rounds both picked the same
//     scores: { [userId]: number }
//   }
//
// Game initialises with 7 randomly-picked prompts already loaded. Each
// round, both players pick A or B. When both have submitted, the round
// reveals. After the last round, status flips to 'ended' and a summary
// is shown via the GameContainer's GameOverPanel.

import { useEffect } from 'react';
import { pickRandomPrompts, type WyrPrompt } from '../../lib/wyrPrompts';
import type { GameSession } from '../GameContainer';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (next: any, opts?: { setStatus?: 'active' | 'ended'; reason?: string }) => Promise<void>;
}

interface Round {
  prompt: WyrPrompt;
  answers: Record<string, 'a' | 'b'>;
}

interface WyrState {
  rounds: Round[];
  currentRound: number;
  totalRounds: number;
  matchCount: number;
  scores: Record<string, number>;
}

const TOTAL_ROUNDS = 7;

function emptyState(): WyrState {
  return {
    rounds: pickRandomPrompts(TOTAL_ROUNDS).map((p) => ({ prompt: p, answers: {} })),
    currentRound: 0,
    totalRounds: TOTAL_ROUNDS,
    matchCount: 0,
    scores: {},
  };
}

export function WouldYouRather({ session, currentUserId, updateState }: Props) {
  // First-time initialiser: when state is empty/pending, the INVITER
  // seeds the round list. The other player gets the seeded state via
  // realtime. Doing it in the inviter only avoids both players racing
  // to write rounds and producing different question sets.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.rounds)
    ) {
      void updateState(emptyState(), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.rounds)
    ) {
      // Belt-and-suspenders — safe fallback if state is missing
      if (currentUserId === session.inviter_id) {
        void updateState(emptyState());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  const state = (session.state ?? null) as WyrState | null;

  if (!state || !state.rounds || state.rounds.length === 0) {
    return (
      <div style={{
        marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14,
        textAlign: 'center',
      }}>
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
    if (myPick) return; // can't change
    const updated: WyrState = JSON.parse(JSON.stringify(state));
    const r = updated.rounds[updated.currentRound];
    r.answers = { ...r.answers, [currentUserId]: choice };
    // Update score for this player just for picking (so we have a
    // per-player participation tally) — not used as a winning condition,
    // but persisted for completeness.
    updated.scores[currentUserId] = (updated.scores[currentUserId] ?? 0) + 1;
    await updateState(updated);
  }

  async function nextRound() {
    const updated: WyrState = JSON.parse(JSON.stringify(state));
    const r = updated.rounds[updated.currentRound];
    const answers = Object.values(r.answers);
    // If both players picked the same answer, that's an in-sync match.
    if (answers.length === 2 && answers[0] === answers[1]) {
      updated.matchCount += 1;
    }
    updated.currentRound += 1;
    if (updated.currentRound >= updated.totalRounds) {
      await updateState(updated, { setStatus: 'ended', reason: 'finished' });
    } else {
      await updateState(updated);
    }
  }

  const progressPct = ((state.currentRound) / state.totalRounds) * 100;

  return (
    <div style={{
      width: '100%', maxWidth: 520,
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {/* Round + score header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800,
          color: 'rgba(255,255,255,0.6)',
          textTransform: 'uppercase', letterSpacing: '1.5px',
        }}>
          Round {state.currentRound + 1} of {state.totalRounds}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 800,
          color: '#ffd5a8',
          padding: '4px 12px',
          background: 'rgba(200,149,108,0.18)',
          borderRadius: 100,
        }}>
          🎯 {state.matchCount} match{state.matchCount === 1 ? '' : 'es'}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 100,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progressPct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #c8956c, #ffb37c)',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Prompt */}
      <h2 style={{
        margin: '14px 0 6px',
        fontSize: 24, fontWeight: 900,
        color: 'white',
        textAlign: 'center',
        letterSpacing: '-0.4px',
        lineHeight: 1.25,
      }}>
        Would you rather…
      </h2>

      {/* Choice cards */}
      <ChoiceCard
        label="A"
        text={round.prompt.a}
        picked={myPick === 'a'}
        partnerPicked={bothPicked && partnerPick === 'a'}
        disabled={!!myPick}
        revealed={bothPicked}
        onPick={() => pick('a')}
      />
      <div style={{
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontWeight: 800,
        letterSpacing: 2,
      }}>
        — OR —
      </div>
      <ChoiceCard
        label="B"
        text={round.prompt.b}
        picked={myPick === 'b'}
        partnerPicked={bothPicked && partnerPick === 'b'}
        disabled={!!myPick}
        revealed={bothPicked}
        onPick={() => pick('b')}
      />

      {/* Status / advance */}
      <div style={{ marginTop: 6 }}>
        {!myPick && (
          <p style={{
            textAlign: 'center', fontSize: 14,
            color: 'rgba(255,255,255,0.7)', margin: 0,
          }}>
            Tap your pick. We&rsquo;ll reveal once you&rsquo;ve both chosen.
          </p>
        )}
        {myPick && !partnerPick && (
          <p style={{
            textAlign: 'center', fontSize: 14,
            color: '#ffd5a8', margin: 0,
            fontWeight: 700,
          }}>
            Locked in. Waiting on your partner&hellip;
          </p>
        )}
        {bothPicked && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 14,
            padding: 16,
            background: myPick === partnerPick
              ? 'rgba(255,213,168,0.15)'
              : 'rgba(255,255,255,0.06)',
            border: `1px solid ${myPick === partnerPick ? 'rgba(255,213,168,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 16,
          }}>
            <div style={{
              fontSize: 18, fontWeight: 900,
              color: 'white',
              textAlign: 'center',
            }}>
              {myPick === partnerPick
                ? '🎉 In sync! Both picked ' + (myPick === 'a' ? 'A' : 'B')
                : '🔀 Split — different picks'}
            </div>
            <button
              type="button"
              onClick={nextRound}
              style={{
                padding: '12px 30px',
                background: '#c8956c',
                color: 'white',
                border: 'none', borderRadius: 100,
                fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
              }}
            >
              {state.currentRound + 1 >= state.totalRounds ? 'See the final score' : 'Next round →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceCard({
  label,
  text,
  picked,
  partnerPicked,
  disabled,
  revealed,
  onPick,
}: {
  label: 'A' | 'B';
  text: string;
  picked: boolean;
  partnerPicked: boolean;
  disabled: boolean;
  revealed: boolean;
  onPick: () => void;
}) {
  const bothPicked = picked && partnerPicked;
  const onlyPartnerPicked = partnerPicked && !picked;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      style={{
        position: 'relative',
        padding: '20px 22px',
        background: bothPicked
          ? 'linear-gradient(135deg, #ffb37c 0%, #c8956c 100%)'
          : picked
            ? 'linear-gradient(135deg, #c8956c 0%, #a07452 100%)'
            : 'white',
        color: picked || bothPicked ? 'white' : '#1a1208',
        border: 'none',
        borderRadius: 18,
        textAlign: 'left',
        fontSize: 17,
        fontWeight: 800,
        lineHeight: 1.4,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        boxShadow: picked || bothPicked
          ? '0 12px 32px rgba(200,149,108,0.45)'
          : '0 6px 18px rgba(0,0,0,0.25)',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        opacity: revealed && !picked && !partnerPicked ? 0.45 : 1,
        // touch-action keeps mobile taps responsive
        touchAction: 'manipulation',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 14, left: 18,
        fontSize: 11, fontWeight: 900,
        color: picked || bothPicked ? 'rgba(255,255,255,0.85)' : '#c8956c',
        letterSpacing: '1.5px',
      }}>
        {label}
      </div>
      <div style={{ paddingTop: 14 }}>
        {text}
      </div>
      {bothPicked && (
        <div style={pickPill}>BOTH PICKED THIS</div>
      )}
      {onlyPartnerPicked && (
        <div style={{ ...pickPill, background: 'rgba(0,0,0,0.35)' }}>PARTNER PICKED THIS</div>
      )}
      {picked && !partnerPicked && (
        <div style={pickPill}>YOU PICKED</div>
      )}
    </button>
  );
}

const pickPill: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  background: 'rgba(255,255,255,0.22)',
  color: 'white',
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: '1px',
  padding: '4px 8px',
  borderRadius: 100,
};
