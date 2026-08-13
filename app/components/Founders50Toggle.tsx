'use client';
// Founders 50 opt-in section — rendered on /subscription.
//
// Shows the user's current opt-in state as a toggle switch, an (i) info
// icon that fires the shared philosophy toast, and a one-line status.
// Non-subscribed users see the section too but the toggle is disabled
// with clear "Subscribe to unlock" copy.
//
// Toggle behavior:
//   * Subscribed + not opted in → tapping the toggle opts in (writes
//     to profiles). Success toast confirms.
//   * Subscribed + opted in → tapping the toggle opts out. Confirm toast.
//   * Non-subscribed → toggle is visually disabled + reads-only. The
//     surrounding CTA says "Subscribe to unlock the Founders 50 Rewards
//     Program." Tapping the toggle is a no-op with a friendly toast.

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { Founders50InfoIcon } from './Founders50InfoIcon';

interface Props {
  userId: string;
  isSubscribed: boolean;
  initialOptedIn: boolean;
}

export function Founders50Toggle({ userId, isSubscribed, initialOptedIn }: Props) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    if (busy) return;
    if (!isSubscribed) {
      toast.info('Subscribe first to unlock the Founders 50 Rewards Program.');
      return;
    }
    const next = !optedIn;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        founders_50_opted_in: next,
        founders_50_prompted_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    setBusy(false);
    if (error) {
      toast.error(error.message || 'Could not update — try again.');
      return;
    }
    setOptedIn(next);
    toast.success(next ? "You're in. Welcome to the Founders 50." : 'Opted out of the Founders 50.');
  }

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(200,149,108,0.2)',
        borderRadius: 20,
        padding: '20px 22px',
        marginTop: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: 'var(--brand-personal)',
            textTransform: 'uppercase',
            letterSpacing: '1.6px',
            margin: 0,
          }}
        >
          Founders 50 Rewards Program
        </p>
        <Founders50InfoIcon size={18} />
      </div>
      <p
        style={{
          fontSize: 14,
          color: 'var(--brand-personal-text-mid)',
          lineHeight: 1.5,
          margin: '0 0 14px',
        }}
      >
        {isSubscribed
          ? optedIn
            ? "You're opted in. The moment we cross 50,000 members, you'll start earning."
            : 'Opt in below to reserve your spot before we cross 50,000 members.'
          : 'Available to subscribed members only. Subscribe below to unlock the option to opt in.'}
      </p>

      {/* Toggle row */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        role="switch"
        aria-checked={optedIn}
        aria-label={optedIn ? 'Opt out of Founders 50' : 'Opt in to Founders 50'}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          background: !isSubscribed
            ? 'rgba(200,149,108,0.06)'
            : optedIn
              ? 'rgba(22,163,74,0.08)'
              : 'rgba(200,149,108,0.06)',
          border: !isSubscribed
            ? '1px solid rgba(200,149,108,0.22)'
            : optedIn
              ? '1px solid rgba(22,163,74,0.30)'
              : '1px solid rgba(200,149,108,0.30)',
          borderRadius: 12,
          cursor: isSubscribed && !busy ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          opacity: !isSubscribed ? 0.75 : 1,
        }}
      >
        {/* Switch UI */}
        <span
          aria-hidden="true"
          style={{
            width: 44,
            height: 26,
            borderRadius: 100,
            background: optedIn && isSubscribed
              ? 'var(--brand-market)'
              : 'rgba(200,149,108,0.35)',
            position: 'relative',
            transition: 'background 0.18s ease',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: optedIn && isSubscribed ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'left 0.18s ease',
            }}
          />
        </span>
        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <p style={{
            fontSize: 14,
            fontWeight: 800,
            color: 'var(--brand-text-primary)',
            margin: 0,
            letterSpacing: '-0.2px',
          }}>
            {isSubscribed
              ? optedIn ? "You're opted in" : 'Not opted in'
              : 'Subscribe to unlock'}
          </p>
          <p style={{
            fontSize: 12,
            color: 'var(--brand-personal-text-light)',
            margin: '2px 0 0',
          }}>
            {isSubscribed
              ? 'Tap to toggle your status.'
              : 'Only subscribed members can opt in.'}
          </p>
        </div>
      </button>
    </div>
  );
}
