'use client';
// Trivia Battle — 7 rounds of multiple-choice questions across
// Mitype's creator categories. Both players see the same question and
// privately pick an answer. Round reveals the correct answer and who
// got it right. Score = correct answers. Tie-breakers go to whoever
// answered fastest, but for v1 we keep it simple: both get a point if
// both correct.
//
// State shape:
//   {
//     rounds: [{ q, options, correctIndex, category, answers: { [userId]: number } }],
//     currentRound: number,
//     totalRounds: number,
//     scores: { [userId]: number }
//   }

import { useEffect } from 'react';
import { pickRandomTrivia, TRIVIA_CATEGORIES, type TriviaQuestion, type TriviaCategory } from '../../lib/triviaQuestions';
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
  q: string;
  options: string[];
  correctIndex: number;
  category: TriviaCategory;
  answers: Record<string, number>;
}

interface TrState {
  rounds: Round[];
  currentRound: number;
  totalRounds: number;
  scores: Record<string, number>;
}

const TOTAL_ROUNDS = 7;

function categoryMeta(key: TriviaCategory) {
  return TRIVIA_CATEGORIES.find((c) => c.key === key) ?? { key, label: key, emoji: '💡' };
}

function emptyState(): TrState {
  const questions: TriviaQuestion[] = pickRandomTrivia(TOTAL_ROUNDS);
  return {
    rounds: questions.map((q) => ({
      q: q.q,
      options: q.options.slice(),
      correctIndex: q.correctIndex,
      category: q.category,
      answers: {},
    })),
    currentRound: 0,
    totalRounds: TOTAL_ROUNDS,
    scores: {},
  };
}

export function TriviaBattle({ session, currentUserId, updateState }: Props) {
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

  const rawState = (session.state ?? null) as TrState | null;
  if (!rawState || !rawState.rounds || rawState.rounds.length === 0) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: TrState = rawState;

  const partnerId = currentUserId === session.inviter_id ? session.invitee_id : session.inviter_id;
  const round = state.rounds[state.currentRound];
  const myPick = round?.answers?.[currentUserId];
  const partnerPick = round?.answers?.[partnerId];
  const bothAnswered = myPick !== undefined && partnerPick !== undefined;
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;
  const cat = categoryMeta(round.category);

  async function pick(choice: number) {
    if (myPick !== undefined) return;
    const updated: TrState = JSON.parse(JSON.stringify(state));
    const r = updated.rounds[updated.currentRound];
    r.answers = { ...r.answers, [currentUserId]: choice };
    if (choice === r.correctIndex) {
      updated.scores[currentUserId] = (updated.scores[currentUserId] ?? 0) + 1;
    }
    await updateState(updated);
  }

  async function nextRound() {
    const updated: TrState = JSON.parse(JSON.stringify(state));
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
      {/* Top: round + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
          textTransform: 'uppercase', letterSpacing: '1.5px',
        }}>
          Round {state.currentRound + 1} of {state.totalRounds}
        </div>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <ScorePill label="You" value={myScore} />
          <ScorePill label="Them" value={partnerScore} muted />
        </div>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{
          width: `${progressPct}%`, height: '100%',
          background: 'linear-gradient(90deg, var(--brand-personal), var(--brand-personal-light))',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Category */}
      <div style={{
        display: 'inline-flex', alignSelf: 'center',
        alignItems: 'center', gap: 6,
        padding: '5px 14px',
        background: 'rgba(255,213,168,0.18)',
        border: '1px solid rgba(255,213,168,0.35)',
        borderRadius: 100,
        fontSize: 12, fontWeight: 800,
        color: 'var(--brand-personal-soft)',
        textTransform: 'uppercase', letterSpacing: '1px',
      }}>
        <span aria-hidden="true">{cat.emoji}</span>
        {cat.label}
      </div>

      {/* Question */}
      <h2 style={{
        margin: '4px 0', fontSize: 20, fontWeight: 900,
        color: 'white', textAlign: 'center',
        letterSpacing: '-0.3px', lineHeight: 1.3,
      }}>
        {round.q}
      </h2>

      {/* Options */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {round.options.map((opt, i) => {
          const isMine = myPick === i;
          const isPartner = bothAnswered && partnerPick === i;
          const isCorrect = bothAnswered && i === round.correctIndex;
          const isRevealed = bothAnswered;
          const isWrong = isRevealed && isMine && i !== round.correctIndex;

          let bg = 'white';
          let color = 'var(--brand-text-primary)';
          let border = '1px solid rgba(0,0,0,0.06)';
          if (isCorrect) {
            bg = 'linear-gradient(135deg, #2bbf6c, #1f9d57)';
            color = 'white';
            border = 'none';
          } else if (isWrong) {
            bg = 'linear-gradient(135deg, #e35858, #b91c1c)';
            color = 'white';
            border = 'none';
          } else if (isMine) {
            bg = 'linear-gradient(135deg, var(--brand-personal), #a07452)';
            color = 'white';
            border = 'none';
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={myPick !== undefined}
              style={{
                position: 'relative',
                padding: '14px 16px 14px 50px',
                background: bg,
                color,
                border,
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                textAlign: 'left',
                lineHeight: 1.35,
                cursor: myPick !== undefined ? 'default' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: isMine || isCorrect ? '0 8px 22px rgba(0,0,0,0.25)' : 'none',
                opacity: isRevealed && !isMine && !isCorrect ? 0.5 : 1,
                touchAction: 'manipulation',
              }}
            >
              <span style={{
                position: 'absolute',
                left: 12, top: '50%',
                transform: 'translateY(-50%)',
                width: 28, height: 28,
                borderRadius: '50%',
                background: isMine || isCorrect || isWrong ? 'rgba(255,255,255,0.22)' : 'rgba(200,149,108,0.18)',
                color: isMine || isCorrect || isWrong ? 'white' : 'var(--brand-personal)',
                fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
              {isPartner && isRevealed && (
                <span style={{
                  marginLeft: 8,
                  fontSize: 10, fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 100,
                  background: 'rgba(255,255,255,0.22)',
                  color: 'white',
                  letterSpacing: 0.5,
                }}>
                  THEM
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status / advance */}
      <div style={{ marginTop: 4 }}>
        {myPick === undefined && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            Tap your answer. Reveal once you&rsquo;ve both chosen.
          </p>
        )}
        {myPick !== undefined && !bothAnswered && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--brand-personal-soft)', margin: 0, fontWeight: 700 }}>
            Locked in. Waiting on your partner&hellip;
          </p>
        )}
        {bothAnswered && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12,
            padding: 14,
            background: myPick === round.correctIndex
              ? 'rgba(43,191,108,0.18)'
              : 'rgba(255,255,255,0.06)',
            border: `1px solid ${myPick === round.correctIndex ? 'rgba(43,191,108,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'white', textAlign: 'center' }}>
              {myPick === round.correctIndex && partnerPick === round.correctIndex
                ? '🎉 You both got it!'
                : myPick === round.correctIndex
                  ? '✅ You got it!'
                  : partnerPick === round.correctIndex
                    ? '😬 They got it.'
                    : '🤷 Neither got it!'}
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
              {state.currentRound + 1 >= state.totalRounds ? 'Final score →' : 'Next question →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScorePill({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div style={{
      padding: '5px 12px',
      background: muted ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))',
      borderRadius: 100,
      fontSize: 12, fontWeight: 800,
      color: 'white',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 900, fontSize: 14 }}>{value}</span>
    </div>
  );
}
