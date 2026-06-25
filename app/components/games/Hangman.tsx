'use client';
// Hangman — co-op word guessing.
//
// We made one design call up front: BOTH players guess together.
// Neither player "picks" the word — the system picks it from
// hangmanWords.ts so neither has the advantage. Both see the same
// blanks, both can guess letters, and they share the same wrong-guess
// counter. It's collaborative, not adversarial — exactly the vibe
// Mitype messaging is supposed to have. A series is best-of-3 words:
// you win the word if you reveal all letters within 6 wrong guesses,
// you lose if you don't.
//
// State shape:
//   {
//     round: number,               // 1..3
//     totalRounds: number,
//     entry: { word, category, hint },
//     guessedLetters: string[],    // every letter guessed this round
//     wrongCount: number,          // count of wrong guesses this round
//     maxWrong: number,            // 6
//     roundResult: 'won' | 'lost' | null,
//     scores: { [user_id]: number }, // count of rounds each user closed
//     hintRevealed: boolean,
//   }
//
// Co-op scoring nuance: when a round is WON, we credit the player whose
// guess revealed the final letter. When LOST, neither gets the point.
// At the end of the series we show "You won 2 of 3 rounds." If both
// players are tied we celebrate it as a team — "You crushed it together."

import { useEffect } from 'react';
import type { GameSession } from '../GameContainer';
import { pickHangmanWords, type HangmanEntry } from '../../lib/hangmanWords';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface HangmanState {
  round: number;
  totalRounds: number;
  entry: HangmanEntry;
  guessedLetters: string[];
  wrongCount: number;
  maxWrong: number;
  roundResult: 'won' | 'lost' | null;
  scores: Record<string, number>;
  hintRevealed: boolean;
  /** Who just made the last revealing letter — credits the point. */
  lastCorrectBy?: string | null;
}

const MAX_WRONG = 6;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

function emptyState(): HangmanState {
  const [entry] = pickHangmanWords(1);
  return {
    round: 1,
    totalRounds: 3,
    entry,
    guessedLetters: [],
    wrongCount: 0,
    maxWrong: MAX_WRONG,
    roundResult: null,
    scores: {},
    hintRevealed: false,
    lastCorrectBy: null,
  };
}

function nextRound(prev: HangmanState): HangmanState {
  // We deliberately avoid the previous word.
  let entry = pickHangmanWords(1)[0];
  for (let i = 0; i < 8 && entry.word === prev.entry.word; i++) {
    entry = pickHangmanWords(1)[0];
  }
  return {
    ...prev,
    round: prev.round + 1,
    entry,
    guessedLetters: [],
    wrongCount: 0,
    roundResult: null,
    hintRevealed: false,
    lastCorrectBy: null,
  };
}

function isWordSolved(word: string, guessed: string[]): boolean {
  return word
    .split('')
    .every((ch) => !/[a-z]/.test(ch) || guessed.includes(ch));
}

export function Hangman({ session, currentUserId, updateState }: Props) {
  // Inviter seeds initial state.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.entry)
    ) {
      void updateState(emptyState(), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.entry) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(emptyState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  const rawState = (session.state ?? null) as HangmanState | null;
  if (!rawState || !rawState.entry) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: HangmanState = rawState;

  const partnerId = currentUserId === session.inviter_id ? session.invitee_id : session.inviter_id;
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;
  const seriesOver =
    state.round >= state.totalRounds &&
    !!state.roundResult;

  // Inlined (not memoized) on purpose — useMemo *after* the early
  // return above would mean the hook count differs between the loading
  // render and the loaded render, which violates the Rules of Hooks
  // and crashes the route. The work is trivial — a couple dozen
  // string-ops per render is fine.
  const wordDisplay = state.entry.word
    .split('')
    .map((ch) => (state.guessedLetters.includes(ch) ? ch : '_'));

  async function guessLetter(letter: string) {
    if (state.roundResult) return;
    if (state.guessedLetters.includes(letter)) return;

    const updated: HangmanState = JSON.parse(JSON.stringify(state));
    updated.guessedLetters = [...updated.guessedLetters, letter];

    const correct = updated.entry.word.includes(letter);
    if (!correct) {
      updated.wrongCount += 1;
    }

    if (isWordSolved(updated.entry.word, updated.guessedLetters)) {
      updated.roundResult = 'won';
      // Credit the player whose guess just revealed the last letter.
      updated.lastCorrectBy = correct ? currentUserId : updated.lastCorrectBy ?? null;
      const credit = updated.lastCorrectBy ?? currentUserId;
      updated.scores[credit] = (updated.scores[credit] ?? 0) + 1;
    } else if (updated.wrongCount >= updated.maxWrong) {
      updated.roundResult = 'lost';
    } else if (correct) {
      updated.lastCorrectBy = currentUserId;
    }

    await updateState(updated);
  }

  async function revealHint() {
    if (state.hintRevealed) return;
    const updated: HangmanState = JSON.parse(JSON.stringify(state));
    updated.hintRevealed = true;
    await updateState(updated);
  }

  async function advanceRound() {
    const updated = nextRound(state);
    await updateState(updated);
  }

  async function finishSeries() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  const remainingWrong = state.maxWrong - state.wrongCount;
  const wrongLetters = state.guessedLetters.filter((l) => !state.entry.word.includes(l));

  return (
    <div style={{
      width: '100%', maxWidth: 420,
      display: 'flex', flexDirection: 'column', gap: 18,
      alignItems: 'center',
    }}>
      {/* Round header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        width: '100%', alignItems: 'center',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
          textTransform: 'uppercase', letterSpacing: '1.4px',
        }}>
          Round {Math.min(state.round, state.totalRounds)} of {state.totalRounds}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 800,
          color: remainingWrong <= 2 ? '#fca5a5' : 'rgba(255,255,255,0.6)',
          textTransform: 'uppercase', letterSpacing: '1.4px',
        }}>
          {remainingWrong} guess{remainingWrong === 1 ? '' : 'es'} left
        </div>
      </div>

      {/* Gallows */}
      <Gallows wrong={state.wrongCount} max={state.maxWrong} />

      {/* Category pill */}
      <div style={{
        padding: '6px 14px',
        background: 'rgba(200,149,108,0.18)',
        border: '1px solid rgba(200,149,108,0.4)',
        borderRadius: 100,
        color: 'var(--brand-personal-soft)',
        fontSize: 12, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '1px',
      }}>
        {state.entry.category}
      </div>

      {/* Word display */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        justifyContent: 'center',
        padding: '14px 4px',
        width: '100%',
      }}>
        {wordDisplay.map((ch, i) => (
          <div key={i} style={{
            minWidth: 24,
            padding: '2px 4px',
            borderBottom: '2px solid rgba(255,255,255,0.4)',
            fontSize: 24, fontWeight: 900,
            color: ch === '_' ? 'transparent' : 'var(--brand-personal-soft)',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {ch === '_' ? '·' : ch}
          </div>
        ))}
      </div>

      {/* Hint */}
      {!state.roundResult && (
        state.hintRevealed ? (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,213,168,0.12)',
            border: '1px solid rgba(255,213,168,0.3)',
            borderRadius: 12,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 320,
          }}>
            Hint: {state.entry.hint}
          </div>
        ) : (
          <button
            type="button"
            onClick={revealHint}
            style={{
              padding: '8px 18px',
              background: 'transparent',
              border: '1px solid rgba(255,213,168,0.45)',
              borderRadius: 100,
              color: 'var(--brand-personal-soft)',
              fontSize: 12, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Need a hint?
          </button>
        )
      )}

      {/* Wrong letters */}
      {wrongLetters.length > 0 && (
        <div style={{
          fontSize: 12,
          color: 'rgba(252,165,165,0.85)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontWeight: 800,
        }}>
          Misses: {wrongLetters.join(' ')}
        </div>
      )}

      {/* Keyboard */}
      {!state.roundResult && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          width: '100%',
          maxWidth: 360,
        }}>
          {ALPHABET.map((letter) => {
            const tried = state.guessedLetters.includes(letter);
            const wasCorrect = tried && state.entry.word.includes(letter);
            const wasWrong = tried && !wasCorrect;
            return (
              <button
                key={letter}
                type="button"
                disabled={tried}
                onClick={() => guessLetter(letter)}
                aria-label={`Guess ${letter.toUpperCase()}`}
                style={{
                  padding: '10px 0',
                  background: wasCorrect
                    ? 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))'
                    : wasWrong
                      ? 'rgba(252,165,165,0.18)'
                      : 'rgba(255,255,255,0.06)',
                  border: wasCorrect
                    ? '1px solid rgba(255,213,168,0.6)'
                    : wasWrong
                      ? '1px solid rgba(252,165,165,0.5)'
                      : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: tried ? 'white' : 'var(--brand-personal-soft)',
                  fontSize: 14, fontWeight: 900,
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  cursor: tried ? 'default' : 'pointer',
                  opacity: wasWrong ? 0.55 : 1,
                  touchAction: 'manipulation',
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}

      {/* Round result */}
      {state.roundResult && !seriesOver && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
          padding: 16,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16, width: '100%',
        }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'white', textAlign: 'center' }}>
            {state.roundResult === 'won' ? '🎉 Got it!' : '😅 Tough one.'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
            The word was <strong style={{ color: 'var(--brand-personal-soft)' }}>{state.entry.word.toUpperCase()}</strong>.
          </div>
          <button type="button" onClick={advanceRound} style={primaryBtn}>
            Next word →
          </button>
        </div>
      )}

      {/* Series over */}
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
            {myScore + partnerScore === 0
              ? "🫠 Tough series. Better luck next time."
              : myScore === partnerScore
                ? "🤝 You crushed it together."
                : myScore > partnerScore
                  ? '🏆 You closed out the most rounds!'
                  : '🥈 They closed out more rounds.'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            Final: you {myScore} – them {partnerScore}
          </div>
          <button type="button" onClick={finishSeries} style={primaryBtn}>
            See summary →
          </button>
        </div>
      )}
    </div>
  );
}

// Gallows — pure SVG drawing that fills in as wrong guesses pile up.
// 0  = bare gallows
// 1  = head
// 2  = body
// 3  = left arm
// 4  = right arm
// 5  = left leg
// 6  = right leg (game over)
function Gallows({ wrong, max }: { wrong: number; max: number }) {
  // Normalize across max in case we ever change it.
  const stage = Math.min(wrong, 6);
  const stroke = 'var(--brand-personal-soft)';
  return (
    <svg
      width={140}
      height={160}
      viewBox="0 0 140 160"
      aria-label={`${wrong} of ${max} wrong guesses`}
    >
      {/* Base */}
      <line x1="10" y1="150" x2="110" y2="150" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {/* Pole */}
      <line x1="30" y1="150" x2="30" y2="10" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {/* Top */}
      <line x1="30" y1="10" x2="90" y2="10" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      {/* Rope */}
      <line x1="90" y1="10" x2="90" y2="30" stroke={stroke} strokeWidth="3" strokeLinecap="round" />

      {/* Head */}
      {stage >= 1 && (
        <circle cx="90" cy="42" r="12" fill="none" stroke={stroke} strokeWidth="3" />
      )}
      {/* Body */}
      {stage >= 2 && (
        <line x1="90" y1="54" x2="90" y2="100" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Left arm */}
      {stage >= 3 && (
        <line x1="90" y1="68" x2="72" y2="84" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Right arm */}
      {stage >= 4 && (
        <line x1="90" y1="68" x2="108" y2="84" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Left leg */}
      {stage >= 5 && (
        <line x1="90" y1="100" x2="74" y2="124" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      )}
      {/* Right leg */}
      {stage >= 6 && (
        <line x1="90" y1="100" x2="106" y2="124" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
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
