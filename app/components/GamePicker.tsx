'use client';
// Modal that lets a user build and send a mini-game to their chat partner.
// The composed game is serialized through `encodeGame` and handed to
// `onSend`, which sends it as a normal message using the existing
// conversation + message pipeline. No DB/schema changes.

import { useEffect, useState } from 'react';
import {
  encodeGame,
  WYR_PROMPTS,
  EMOJI_PROMPT_IDEAS,
  type GameStart,
} from '../lib/games';

const PEACH = '#c8956c';
const INK = '#1a1208';
const MUTED = '#8a7560';
const CREAM = '#faf6f0';

type Step = 'pick' | 'ttl' | 'wyr' | 'emoji';

interface GamePickerProps {
  open: boolean;
  onClose: () => void;
  onSend: (encodedContent: string) => Promise<void> | void;
}

export function GamePicker({ open, onClose, onSend }: GamePickerProps) {
  const [step, setStep] = useState<Step>('pick');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state when the modal closes so the next open starts fresh.
      setStep('pick');
      setSending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  async function send(payload: GameStart) {
    if (sending) return;
    setSending(true);
    try {
      await onSend(encodeGame(payload));
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send a mini-game"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,18,8,0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 9400,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 22,
          width: '100%',
          maxWidth: 440,
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 20,
          boxShadow: '0 24px 48px rgba(0,0,0,0.22)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: INK, margin: 0 }}>
            {step === 'pick' ? '🎮 Send a mini-game' : gameTitle(step)}
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {step !== 'pick' && (
              <button
                type="button"
                onClick={() => setStep('pick')}
                aria-label="Back to game list"
                style={smallIconBtn}
              >
                <span aria-hidden="true">←</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close mini-game picker"
              style={smallIconBtn}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        {step === 'pick' && <Picker onPick={setStep} />}
        {step === 'ttl' && <BuildTtl onSend={send} sending={sending} />}
        {step === 'wyr' && <BuildWyr onSend={send} sending={sending} />}
        {step === 'emoji' && <BuildEmoji onSend={send} sending={sending} />}
      </div>
    </div>
  );
}

function gameTitle(step: Step) {
  if (step === 'ttl') return '🎭 Two Truths & a Lie';
  if (step === 'wyr') return '🤔 Would You Rather';
  if (step === 'emoji') return '🎬 Emoji Movie';
  return '';
}

function Picker({ onPick }: { onPick: (s: Step) => void }) {
  const options: Array<{ key: Step; title: string; desc: string; emoji: string }> = [
    { key: 'ttl',   title: 'Two Truths & a Lie', emoji: '🎭', desc: 'Write three things — one is fake. Can they spot it?' },
    { key: 'wyr',   title: 'Would You Rather',   emoji: '🤔', desc: 'Pick a prompt and see what they choose.' },
    { key: 'emoji', title: 'Emoji Movie',        emoji: '🎬', desc: 'Describe a movie in emojis — see if they can guess it.' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.key)}
          style={{
            textAlign: 'left',
            background: CREAM,
            border: `1px solid ${PEACH}22`,
            borderRadius: 16,
            padding: 16,
            cursor: 'pointer',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 30, lineHeight: 1 }}>{o.emoji}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 800, color: INK, fontSize: 15 }}>{o.title}</span>
            <span style={{ display: 'block', color: MUTED, fontSize: 12, marginTop: 2 }}>{o.desc}</span>
          </span>
          <span aria-hidden="true" style={{ color: PEACH, fontSize: 20 }}>→</span>
        </button>
      ))}
    </div>
  );
}

// -- Builders --------------------------------------------------------------

function BuildTtl({
  onSend,
  sending,
}: { onSend: (p: GameStart) => void; sending: boolean }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [lieIndex, setLieIndex] = useState<number | null>(null);

  const statementsReady = a.trim() && b.trim() && c.trim();
  const ready = statementsReady && lieIndex !== null;

  return (
    <div>
      <p style={helperText}>Write three statements about yourself. Pick which one is the lie.</p>
      {[a, b, c].map((val, i) => {
        const setters = [setA, setB, setC];
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Statement {String.fromCharCode(65 + i)}</label>
            <input
              value={val}
              onChange={(e) => setters[i](e.target.value)}
              placeholder={i === 1 ? 'I once met a celebrity at an airport' : 'Something about you…'}
              maxLength={140}
              style={inputStyle}
            />
          </div>
        );
      })}

      <p style={{ ...labelStyle, marginTop: 14 }}>Which one is the lie?</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLieIndex(i)}
            style={chipStyle(lieIndex === i)}
          >
            {String.fromCharCode(65 + i)}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!ready || sending}
        onClick={() =>
          ready &&
          onSend({
            t: 'ttl',
            v: 1,
            statements: [a.trim(), b.trim(), c.trim()],
            lieIndex: lieIndex!,
          })
        }
        style={sendBtnStyle(!ready || sending)}
      >
        {sending ? 'Sending…' : 'Send to chat →'}
      </button>
    </div>
  );
}

function BuildWyr({
  onSend,
  sending,
}: { onSend: (p: GameStart) => void; sending: boolean }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  function usePrompt(pair: [string, string]) {
    setA(pair[0]);
    setB(pair[1]);
  }

  const ready = a.trim() && b.trim();
  return (
    <div>
      <p style={helperText}>Write two options, or tap a suggestion.</p>
      <label style={labelStyle}>Option A</label>
      <input value={a} onChange={(e) => setA(e.target.value)} maxLength={120} placeholder="Something fun…" style={inputStyle} />
      <label style={labelStyle}>Option B</label>
      <input value={b} onChange={(e) => setB(e.target.value)} maxLength={120} placeholder="Something equally fun…" style={inputStyle} />

      <p style={{ ...labelStyle, marginTop: 14 }}>Prompt ideas</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 180, overflow: 'auto' }}>
        {WYR_PROMPTS.map((pair, i) => (
          <button
            key={i}
            type="button"
            onClick={() => usePrompt(pair)}
            style={suggestionStyle}
          >
            <span style={{ color: PEACH, fontWeight: 800 }}>A</span> {pair[0]} <span style={{ color: MUTED }}>—</span> <span style={{ color: PEACH, fontWeight: 800 }}>B</span> {pair[1]}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!ready || sending}
        onClick={() =>
          ready && onSend({ t: 'wyr', v: 1, a: a.trim(), b: b.trim() })
        }
        style={sendBtnStyle(!ready || sending)}
      >
        {sending ? 'Sending…' : 'Send to chat →'}
      </button>
    </div>
  );
}

function BuildEmoji({
  onSend,
  sending,
}: { onSend: (p: GameStart) => void; sending: boolean }) {
  const [emoji, setEmoji] = useState('');
  const [answer, setAnswer] = useState('');

  const ready = emoji.trim() && answer.trim();
  return (
    <div>
      <p style={helperText}>Describe a movie in emojis — they&apos;ll guess the title.</p>
      <label style={labelStyle}>Emoji clue</label>
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        maxLength={40}
        placeholder="🦁👑"
        style={{ ...inputStyle, fontSize: 22, textAlign: 'center', letterSpacing: 2 }}
      />
      <label style={labelStyle}>Movie title (answer)</label>
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        maxLength={80}
        placeholder="The Lion King"
        style={inputStyle}
      />

      <p style={{ ...labelStyle, marginTop: 14 }}>Need inspiration?</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {EMOJI_PROMPT_IDEAS.map((idea, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setEmoji(idea.emoji)}
            title={idea.hint}
            aria-label={`Use ${idea.emoji} — ${idea.hint}`}
            style={{
              padding: '6px 12px',
              background: CREAM,
              border: `1px solid ${PEACH}22`,
              borderRadius: 100,
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            {idea.emoji}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!ready || sending}
        onClick={() =>
          ready &&
          onSend({ t: 'emoji', v: 1, emoji: emoji.trim(), answer: answer.trim() })
        }
        style={sendBtnStyle(!ready || sending)}
      >
        {sending ? 'Sending…' : 'Send to chat →'}
      </button>
    </div>
  );
}

// -- Shared styles ---------------------------------------------------------

const helperText: React.CSSProperties = {
  color: MUTED,
  fontSize: 13,
  margin: '0 0 14px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: MUTED,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  border: `1px solid ${PEACH}33`,
  borderRadius: 12,
  fontSize: 14,
  background: 'white',
  color: INK,
  outline: 'none',
  marginBottom: 4,
};

const suggestionStyle: React.CSSProperties = {
  textAlign: 'left',
  background: CREAM,
  border: `1px solid ${PEACH}22`,
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 12,
  color: INK,
  cursor: 'pointer',
  lineHeight: 1.35,
};

const smallIconBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  border: 'none',
  background: CREAM,
  borderRadius: 10,
  fontSize: 16,
  color: MUTED,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 0',
    background: active ? PEACH : 'white',
    color: active ? 'white' : INK,
    border: `1px solid ${PEACH}55`,
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  };
}

function sendBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 16px',
    background: disabled ? '#d8b18f' : PEACH,
    color: 'white',
    border: 'none',
    borderRadius: 100,
    fontWeight: 800,
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 4,
  };
}
