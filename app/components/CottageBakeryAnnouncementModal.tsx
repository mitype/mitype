'use client';
// Cottage Bakery Masterclass launch announcement, one-time modal.
//
// Rendered by the dashboard the first time a subscriber lands there
// with `profiles.cottage_bakery_announced_at IS NULL`.
// Dashboard itself is already hard-gated to subscribers only (anyone
// without an active/trialing subscription gets bounced to
// /subscription before this code ever runs), so there is no
// subscribed/non-subscribed branching here, unlike the Founders 50
// modal.
//
// Whichever button is tapped (or Escape, or the backdrop), we stamp
// cottage_bakery_announced_at = NOW() and the modal never
// appears again for that account.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { liquidGlass } from '../lib/liquidGlass';

interface Props {
  userId: string;
  onDismiss: () => void;
}

export function CottageBakeryAnnouncementModal({ userId, onDismiss }: Props) {
  const router = useRouter();
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
      .update({ cottage_bakery_announced_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  async function handleCheckItOut() {
    setBusy(true);
    await stampAnnouncedAt();
    setBusy(false);
    onDismiss();
    router.push('/black-sheep-university/cottage-bakery');
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
      aria-labelledby="cottage-announce-title"
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
        animation: 'mitype-cottage-announce-fade 0.18s ease-out',
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
          New Masterclass
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: 'rgba(200,149,108,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M4 12 6.5 5h19L28 12Z" fill="#a07a4d" opacity="0.25" stroke="#a07a4d" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M4 12c0 2 2 3 4 3s4-1 4-3c0 2 2 3 4 3s4-1 4-3c0 2 2 3 4 3s4-1 4-3" stroke="#a07a4d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 15v13M25 15v13" stroke="#a07a4d" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5 21h22v2H5z" fill="#a07a4d" />
              <path d="M11 21c0-2 1.2-3.5 3-3.5s3 1.5 3 3.5" stroke="#a07a4d" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="21" cy="19" r="1.8" fill="#a07a4d" />
            </svg>
          </div>
          <h2
            id="cottage-announce-title"
            style={{
              color: 'var(--brand-text-primary)',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            New masterclass: Cottage Bakery
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
          The Cottage Bakery Masterclass is now live inside Black Sheep University, included with your membership. 15 modules covering the cottage food rules for all 50 states, food safety, packaging and where to buy supplies, labels, pricing, selling, and a 90 day launch plan, with a label builder, price calculator, and printable checklists. Finish the course to earn your certificate.
        </p>

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            type="button"
            onClick={handleCheckItOut}
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
            {busy ? 'Opening...' : 'Check it out'}
          </button>
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
            Maybe later
          </button>
        </div>

        <style>{`
          @keyframes mitype-cottage-announce-fade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
