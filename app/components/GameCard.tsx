'use client';
// Renders a single mini-game message inside the chat stream.
// Replaces the normal text bubble when msg.content starts with the
// game-prefix and decodes into a valid payload.

import { useMemo, useState } from 'react';
import {
  decodeGame,
  encodeGame,
  emojiAnswerMatches,
  type GamePayload,
  type GameStart,
  type GameReply,
} from '../lib/games';
import { sanitizeText } from '../lib/sanitize';

interface GameCardProps {
  content: string;
  /** True if the logged-in user sent the message carrying this game. */
  isOwnMessage: boolean;
  /** Called when the recipient answers. The text is the encoded reply content. */
  onReply: (encoded: string) => Promise<void> | void;
  /** Whether this specific card has already been answered (locked). */
  answered?: boolean;
}

const PEACH = '#c8956c';
const INK = '#1a1208';
const MUTED = '#8a7560';
const CARD_BG = '#fff8ef';

export function GameCard({ content, isOwnMessage, onReply, answered }: GameCardProps) {
  const payload = useMemo(() => decodeGame(content), [content]);
  if (!payload) {
    // Shouldn't happen (parent checks), but fall back to plain text.
    return <span>{sanitizeText(content)}</span>;
  }

  // Replies are static — just a result card.
  if (payload.t === 'reply') {
    return <GameReplyCard reply={payload} />;
  }

  return (
    <GameStartCard
      start={payload}
      isOwnMessage={isOwnMessage}
      onReply={onReply}
      answered={!!answered}
    />
  );
}

function GameStartCard({
  start,
  isOwnMessage,
  onReply,
  answered,
}: {
  start: GameStart;
  isOwnMessage: boolean;
  onReply: (encoded: string) => Promise<void> | void;
  answered: boolean;
}) {
  const locked = isOwnMessage || answered;

  switch (start.t) {
    case 'ttl':
      return (
        <TwoTruthsCard start={start} locked={locked} onReply={onReply} />
      );
    case 'wyr':
      return (
        <WouldYouRatherCard start={start} locked={locked} onReply={onReply} />
      );
    case 'emoji':
      return (
        <EmojiMovieCard start={start} locked={locked} onReply={onReply} />
      );
    default:
      return null;
  }
}

function GameReplyCard({ reply }: { reply: GameReply }) {
  if (reply.game === 'ttl') {
    const { guess, correct, lieIndex, statements } = reply;
    const lie = statements[lieIndex];
    return (
      <CardShell game="Two Truths & a Lie">
        <p style={{ fontSize: 14, color: INK, fontWeight: 700, margin: '0 0 6px' }}>
          {correct ? '🎯 Nailed it!' : '😅 So close!'}
        </p>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
          Guessed &quot;{sanitizeText(statements[guess] ?? '')}&quot;.
          The lie was &quot;{sanitizeText(lie)}&quot;.
        </p>
      </CardShell>
    );
  }

  if (reply.game === 'wyr') {
    return (
      <CardShell game="Would You Rather">
        <p style={{ fontSize: 14, color: INK, fontWeight: 700, margin: '0 0 6px' }}>
          Picked: {reply.pick === 'a' ? 'A' : 'B'}
        </p>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
          {reply.pick === 'a' ? sanitizeText(reply.a) : sanitizeText(reply.b)}
        </p>
      </CardShell>
    );
  }

  if (reply.game === 'emoji') {
    return (
      <CardShell game="Emoji Movie">
        <p style={{ fontSize: 14, color: INK, fontWeight: 700, margin: '0 0 6px' }}>
          {reply.correct ? '🎬 Correct!' : '🤔 Close!'}
        </p>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
          Guessed: <strong style={{ color: INK }}>{sanitizeText(reply.guess)}</strong>
          <br />
          Answer: <strong style={{ color: INK }}>{sanitizeText(reply.answer)}</strong>
        </p>
      </CardShell>
    );
  }

  return null;
}

// -- Individual game cards -------------------------------------------------

function TwoTruthsCard({
  start,
  locked,
  onReply,
}: {
  start: Extract<GameStart, { t: 'ttl' }>;
  locked: boolean;
  onReply: (encoded: string) => Promise<void> | void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pick(idx: number) {
    if (locked || submitting) return;
    setChosen(idx);
    setSubmitting(true);
    const correct = idx === start.lieIndex;
    const reply: GameReply = {
      t: 'reply',
      v: 1,
      game: 'ttl',
      guess: idx,
      correct,
      lieIndex: start.lieIndex,
      statements: start.statements,
    };
    try {
      await onReply(encodeGame(reply));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CardShell game="Two Truths & a Lie">
      <p style={{ fontSize: 13, color: MUTED, margin: '0 0 10px' }}>
        {locked ? 'Waiting for a guess…' : 'Which one is the lie?'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {start.statements.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => pick(i)}
            disabled={locked || submitting}
            aria-label={`Guess statement ${i + 1} is the lie`}
            style={{
              padding: '10px 14px',
              textAlign: 'left',
              background: chosen === i ? PEACH : 'white',
              color: chosen === i ? 'white' : INK,
              border: `1px solid ${PEACH}33`,
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 600,
              cursor: locked ? 'default' : submitting ? 'wait' : 'pointer',
              opacity: locked && chosen !== i ? 0.85 : 1,
              lineHeight: 1.4,
            }}
          >
            <span aria-hidden="true" style={{ fontWeight: 800, marginRight: 8 }}>
              {String.fromCharCode(65 + i)}.
            </span>
            {sanitizeText(s)}
          </button>
        ))}
      </div>
    </CardShell>
  );
}

function WouldYouRatherCard({
  start,
  locked,
  onReply,
}: {
  start: Extract<GameStart, { t: 'wyr' }>;
  locked: boolean;
  onReply: (encoded: string) => Promise<void> | void;
}) {
  const [pick, setPick] = useState<'a' | 'b' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function choose(which: 'a' | 'b') {
    if (locked || submitting) return;
    setPick(which);
    setSubmitting(true);
    const reply: GameReply = {
      t: 'reply',
      v: 1,
      game: 'wyr',
      pick: which,
      a: start.a,
      b: start.b,
    };
    try {
      await onReply(encodeGame(reply));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CardShell game="Would You Rather">
      <p style={{ fontSize: 13, color: MUTED, margin: '0 0 10px' }}>
        {locked ? 'Thinking it over…' : 'Which one?'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(['a', 'b'] as const).map((k) => {
          const label = k === 'a' ? start.a : start.b;
          const active = pick === k;
          return (
            <button
              key={k}
              type="button"
              disabled={locked || submitting}
              onClick={() => choose(k)}
              aria-label={`Pick option ${k.toUpperCase()}: ${label}`}
              style={{
                padding: '12px 14px',
                textAlign: 'left',
                background: active ? PEACH : 'white',
                color: active ? 'white' : INK,
                border: `1px solid ${PEACH}33`,
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                cursor: locked ? 'default' : submitting ? 'wait' : 'pointer',
                lineHeight: 1.4,
              }}
            >
              <span aria-hidden="true" style={{ marginRight: 8 }}>
                {k.toUpperCase()}.
              </span>
              {sanitizeText(label)}
            </button>
          );
        })}
      </div>
    </CardShell>
  );
}

function EmojiMovieCard({
  start,
  locked,
  onReply,
}: {
  start: Extract<GameStart, { t: 'emoji' }>;
  locked: boolean;
  onReply: (encoded: string) => Promise<void> | void;
}) {
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || submitting || !guess.trim()) return;
    setSubmitting(true);
    const correct = emojiAnswerMatches(guess, start.answer);
    const reply: GameReply = {
      t: 'reply',
      v: 1,
      game: 'emoji',
      guess: guess.trim(),
      correct,
      emoji: start.emoji,
      answer: start.answer,
    };
    try {
      await onReply(encodeGame(reply));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CardShell game="Emoji Movie">
      <div style={{
        fontSize: 44,
        textAlign: 'center',
        margin: '4px 0 12px',
        lineHeight: 1.2,
        letterSpacing: 2,
      }}>
        {sanitizeText(start.emoji)}
      </div>
      {locked ? (
        <p style={{ fontSize: 13, color: MUTED, margin: 0, textAlign: 'center' }}>
          Waiting for a guess…
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Movie title…"
            aria-label="Your guess"
            maxLength={80}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: `1px solid ${PEACH}33`,
              borderRadius: 100,
              fontSize: 13,
              background: 'white',
              color: INK,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={submitting || !guess.trim()}
            style={{
              padding: '10px 16px',
              background: PEACH,
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontWeight: 700,
              fontSize: 13,
              cursor: submitting || !guess.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !guess.trim() ? 0.6 : 1,
            }}
          >
            Guess
          </button>
        </form>
      )}
    </CardShell>
  );
}

// -- Shared shell ----------------------------------------------------------

function CardShell({ game, children }: { game: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-label={`${game} game card`}
      style={{
        background: CARD_BG,
        border: `1px solid ${PEACH}33`,
        borderRadius: 18,
        padding: 14,
        minWidth: 240,
      }}
    >
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        color: PEACH,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        🎮 {game}
      </div>
      {children}
    </div>
  );
}

/** Decide whether a message should render as a game card. */
export function isGameMessage(content: string | null | undefined): boolean {
  return decodeGame(content) !== null;
}
