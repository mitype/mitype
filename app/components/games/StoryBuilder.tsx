'use client';
// Story Builder — collaborative creative writing. Players take turns
// adding ONE sentence to a shared story. 8 turns total (4 per player).
// At the end both players see the finished story.
//
// State shape:
//   {
//     opener: string,                  // suggested opening line
//     turns: { authorId: string, text: string }[],
//     currentTurn: string,             // user_id whose turn it is
//     totalTurns: number,              // 8
//   }
//
// No score — it's a collaborative creative exercise. Each turn is
// capped at 200 characters to keep the pace moving.

import { useEffect, useState } from 'react';
import { pickStoryOpener } from '../../lib/storyOpeners';
import type { GameSession } from '../GameContainer';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface Turn {
  authorId: string;
  text: string;
}

interface SbState {
  opener: string;
  turns: Turn[];
  currentTurn: string;
  totalTurns: number;
}

const TOTAL_TURNS = 8;
const MAX_CHARS = 200;

function emptyState(inviterId: string): SbState {
  return {
    opener: pickStoryOpener(),
    turns: [],
    currentTurn: inviterId,
    totalTurns: TOTAL_TURNS,
  };
}

export function StoryBuilder({ session, currentUserId, updateState }: Props) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.turns)
    ) {
      void updateState(emptyState(session.inviter_id), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.turns) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(emptyState(session.inviter_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  const rawState = (session.state ?? null) as SbState | null;
  if (!rawState || !rawState.turns) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: SbState = rawState;

  const isMyTurn = state.currentTurn === currentUserId;
  const partnerId = currentUserId === session.inviter_id ? session.invitee_id : session.inviter_id;
  const turnsLeft = state.totalTurns - state.turns.length;
  const seriesDone = state.turns.length >= state.totalTurns;

  async function submitTurn() {
    const trimmed = draft.trim();
    if (!trimmed || !isMyTurn || submitting) return;
    setSubmitting(true);
    try {
      const updated: SbState = JSON.parse(JSON.stringify(state));
      updated.turns.push({
        authorId: currentUserId,
        text: trimmed.slice(0, MAX_CHARS),
      });
      updated.currentTurn = partnerId;
      if (updated.turns.length >= updated.totalTurns) {
        await updateState(updated, { setStatus: 'ended', reason: 'finished' });
      } else {
        await updateState(updated);
      }
      setDraft('');
    } finally {
      setSubmitting(false);
    }
  }

  async function endStoryNow() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  return (
    <div style={{
      width: '100%', maxWidth: 580,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
          textTransform: 'uppercase', letterSpacing: '1.5px',
        }}>
          Sentence {state.turns.length + (seriesDone ? 0 : 1)} of {state.totalTurns}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: '#ffd5a8',
          padding: '3px 10px',
          background: 'rgba(200,149,108,0.18)',
          borderRadius: 100,
        }}>
          {turnsLeft} left
        </div>
      </div>

      {/* The unfolding story */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: 18,
        maxHeight: '40vh',
        overflowY: 'auto',
      }}>
        <p style={{
          fontSize: 11, fontWeight: 800,
          color: '#ffd5a8',
          textTransform: 'uppercase', letterSpacing: '1.4px',
          margin: '0 0 10px',
        }}>
          Story opener
        </p>
        <p style={{
          fontSize: 15, lineHeight: 1.6,
          color: 'white',
          margin: 0,
          fontStyle: 'italic',
        }}>
          &ldquo;{state.opener}&rdquo;
        </p>

        {state.turns.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{
              fontSize: 15, lineHeight: 1.7,
              color: 'white', margin: 0,
            }}>
              {state.turns.map((t, i) => {
                const isMe = t.authorId === currentUserId;
                return (
                  <span key={i} style={{
                    color: isMe ? '#ffd5a8' : 'white',
                  }}>
                    {' '}{t.text}
                  </span>
                );
              })}
            </p>
            <p style={{
              fontSize: 11, color: 'rgba(255,255,255,0.45)',
              marginTop: 10,
              fontWeight: 600,
            }}>
              <span style={{ color: '#ffd5a8' }}>You</span> · <span style={{ color: 'white' }}>Them</span>
            </p>
          </div>
        )}
      </div>

      {/* Composer (only if game not over) */}
      {!seriesDone && (
        <div>
          {isMyTurn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Add one sentence to the story…"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,213,168,0.4)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 15,
                  lineHeight: 1.5,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {draft.length} / {MAX_CHARS}
                </span>
                <button
                  type="button"
                  onClick={submitTurn}
                  disabled={!draft.trim() || submitting}
                  style={{
                    padding: '10px 22px',
                    background: !draft.trim() ? 'rgba(200,149,108,0.4)' : '#c8956c',
                    color: 'white',
                    border: 'none', borderRadius: 100,
                    fontSize: 14, fontWeight: 800,
                    cursor: !draft.trim() || submitting ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: !draft.trim() ? 'none' : '0 8px 22px rgba(200,149,108,0.4)',
                  }}
                >
                  {submitting ? 'Sending…' : 'Add sentence →'}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: 14, color: '#ffd5a8', fontWeight: 700, margin: '8px 0' }}>
              ✍️ Partner&rsquo;s turn — waiting on them…
            </p>
          )}
        </div>
      )}

      {seriesDone && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12,
          padding: 16,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'white', textAlign: 'center' }}>
            ✨ The end.
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', margin: 0 }}>
            You built a {state.totalTurns}-sentence story together. Save it somewhere if you love it.
          </p>
          <button type="button" onClick={endStoryNow} style={primaryBtn}>
            See summary →
          </button>
        </div>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '11px 26px',
  background: '#c8956c',
  color: 'white',
  border: 'none', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
};
