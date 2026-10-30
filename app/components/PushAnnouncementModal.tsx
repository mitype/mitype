'use client';
// Phone notifications announcement, one-time modal.
//
// Rendered by the dashboard the first time a subscriber lands there
// with `profiles.push_announced_at IS NULL`.
// Dashboard itself is already hard-gated to subscribers only (anyone
// without an active/trialing subscription gets bounced to
// /subscription before this code ever runs), so there is no
// subscribed/non-subscribed branching here, unlike the Founders 50
// modal.
//
// Whichever button is tapped (or Escape, or the backdrop), we stamp
// push_announced_at = NOW() and the modal never
// appears again for that account.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { liquidGlass } from '../lib/liquidGlass';

interface Props {
  userId: string;
  onDismiss: () => void;
}

export function PushAnnouncementModal({ userId, onDismiss }: Props) {
  const [busy, setBusy] = useState(false);

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

  async function stampAnnouncedAt() {
    await supabase
      .from('profiles')
      .update({ push_announced_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  async function handleGotIt() {
    setBusy(true);
    await stampAnnouncedAt();
    setBusy(false);
    onDismiss();
  }

  async function handleDismiss(_reason: 'button' | 'escape' | 'backdrop') {
    if (busy) return;
    await stampAnnouncedAt();
    onDismiss();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-announce-title"
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
        animation: 'mitype-push-announce-fade 0.18s ease-out',
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
        <button
          type="button"
          onClick={() => handleDismiss('button')}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
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
          New feature
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: 'rgba(200,149,108,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a07a4d" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          </div>
          <h2
            id="push-announce-title"
            style={{
              color: 'var(--brand-text-primary)',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Notifications are here
          </h2>
        </div>

        <p
          style={{
            color: 'var(--brand-personal-text-mid)',
            fontSize: 15,
            lineHeight: 1.55,
            margin: '0 0 22px',
          }}
        >
          You can now get Mitype notifications on your phone. To turn them on, open the menu, then tap Phone notifications and switch it on.
        </p>

        <p
          style={{
            color: 'var(--brand-personal-text-mid)',
            fontSize: 14,
            lineHeight: 1.55,
            margin: '0 0 22px',
          }}
        >
          On an iPhone, first add Mitype to your Home Screen: tap the Share button in Safari, choose Add to Home Screen, then open Mitype from the new icon. On Android it works right from your browser.
        </p>

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            type="button"
            onClick={handleGotIt}
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
            {busy ? 'Saving...' : 'Got it'}
          </button>
        </div>

        <style>{`
          @keyframes mitype-push-announce-fade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
