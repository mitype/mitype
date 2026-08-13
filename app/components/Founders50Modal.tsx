'use client';
// Founders 50 Rewards Program — one-time opt-in modal.
//
// Rendered by the dashboard the first time a user lands there with
// `profiles.founders_50_prompted_at IS NULL`. Whichever button they
// tap (opt-in or dismiss), we stamp `founders_50_prompted_at = NOW()`
// and the modal never appears again.
//
// Copy varies by subscription state:
//   * Subscribed user   → "Yes, opt me in" / "No thanks"
//   * Non-subscribed    → "Subscribe to opt in" (routes to /subscription)
//                          / "Maybe later"
//
// Server-side, the profile update trigger enforces the same rule: a
// non-subscriber trying to write opted_in = TRUE will be rejected.
//
// The (i) info icon fires the shared philosophy toast.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { liquidGlass } from '../lib/liquidGlass';
import { Founders50InfoIcon } from './Founders50InfoIcon';

interface Props {
  userId: string;
  isSubscribed: boolean;
  onDismiss: () => void;
}

export function Founders50Modal({ userId, isSubscribed, onDismiss }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleDismiss('escape');
    }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any dismissal — whether they opted in, declined, or hit escape —
  // stamps the "we've asked" timestamp so we don't show the modal again.
  async function stampPromptedAt() {
    await supabase
      .from('profiles')
      .update({ founders_50_prompted_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  async function handleOptIn() {
    setBusy(true);
    // Server-side trigger enforces subscription; we also short-circuit
    // client-side for a nicer error path.
    const { error } = await supabase
      .from('profiles')
      .update({
        founders_50_opted_in: true,
        founders_50_prompted_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    setBusy(false);
    if (error) {
      toast.error(error.message || 'Could not opt in — try again.');
      return;
    }
    toast.success("You're in. Welcome to the Founders 50.");
    onDismiss();
  }

  async function handleSubscribeAndOptIn() {
    setBusy(true);
    // Stamp the "asked" timestamp so the modal doesn't come back after
    // they land on the subscription page, but leave opt_in FALSE.
    await stampPromptedAt();
    setBusy(false);
    router.push('/subscription');
    onDismiss();
  }

  async function handleDismiss(_reason: 'button' | 'escape' | 'backdrop') {
    if (busy) return;
    await stampPromptedAt();
    onDismiss();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="founders-50-title"
      onClick={() => handleDismiss('backdrop')}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,18,8,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
        animation: 'mitype-founders50-fade 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #fff9f2 0%, var(--brand-personal-bg-peach) 100%)',
          border: '1px solid rgba(200,149,108,0.3)',
          borderRadius: 24,
          maxWidth: 460,
          width: '100%',
          padding: '32px 28px 28px',
          position: 'relative',
          boxShadow: '0 24px 60px rgba(26,18,8,0.35)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        {/* Top-right controls: info icon + close X */}
        <div style={{
          position: 'absolute',
          top: 14,
          right: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}>
          <Founders50InfoIcon size={26} />
          <button
            type="button"
            onClick={() => handleDismiss('button')}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(200,149,108,0.12)',
              color: 'var(--brand-personal-text-mid)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <p
          style={{
            color: 'var(--brand-personal)',
            fontSize: 11,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '1.6px',
            margin: '0 0 12px',
          }}
        >
          New Program
        </p>

        <h2
          id="founders-50-title"
          style={{
            color: 'var(--brand-text-primary)',
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: '-0.5px',
            marginBottom: 12,
            lineHeight: 1.2,
          }}
        >
          Founders 50 Rewards Program
        </h2>

        <p
          style={{
            color: 'var(--brand-personal-text-mid)',
            fontSize: 15,
            lineHeight: 1.55,
            margin: '0 0 16px',
          }}
        >
          Mitype's early users get first access to our upcoming Creator Rewards program. The moment we cross 50,000 members, opted-in subscribers start earning.
        </p>

        {/* Subscription requirement callout — varies by state */}
        <div
          style={{
            padding: '12px 14px',
            background: isSubscribed
              ? 'rgba(22,163,74,0.10)'
              : 'rgba(200,149,108,0.14)',
            border: isSubscribed
              ? '1px solid rgba(22,163,74,0.28)'
              : '1px solid rgba(200,149,108,0.32)',
            borderRadius: 12,
            marginBottom: 22,
            fontSize: 13,
            color: isSubscribed
              ? 'var(--brand-market)'
              : 'var(--brand-personal-text-head)',
            lineHeight: 1.5,
          }}
        >
          {isSubscribed
            ? "You're a subscribed member — you're eligible to opt in right now."
            : 'Only subscribed members can participate. Subscribe to unlock the option to opt in.'}
        </div>

        {/* Actions — subscribed users get direct opt-in; non-subscribed
            users get a subscribe-first CTA that routes to /subscription. */}
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          {isSubscribed ? (
            <button
              type="button"
              onClick={handleOptIn}
              disabled={busy}
              style={{
                ...liquidGlass({ tone: 'warm' }),
                padding: '13px 22px',
                color: 'var(--brand-text-primary)',
                fontSize: 15,
                fontWeight: 800,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {busy ? 'Opting in…' : 'Yes, opt me in'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubscribeAndOptIn}
              disabled={busy}
              style={{
                ...liquidGlass({ tone: 'warm' }),
                padding: '13px 22px',
                color: 'var(--brand-text-primary)',
                fontSize: 15,
                fontWeight: 800,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              Opt in to Founders 50
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDismiss('button')}
            disabled={busy}
            style={{
              ...liquidGlass({ tone: 'clear' }),
              padding: '13px 22px',
              color: 'var(--brand-personal-text-mid)',
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {isSubscribed ? 'No thanks' : 'Maybe later'}
          </button>
        </div>

        <style>{`
          @keyframes mitype-founders50-fade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
