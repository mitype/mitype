'use client';
// Profile banners launch announcement, one-time modal.
//
// Rendered by the dashboard the first time a member lands there
// with `profiles.banner_announced_at IS NULL`.
// Dashboard itself is already hard-gated to subscribers only (anyone
// without an active/trialing subscription gets bounced to
// /subscription before this code ever runs), so there is no
// subscribed/non-subscribed branching here, unlike the Founders 50
// modal.
//
// Whichever button is tapped (or Escape, or the backdrop), we stamp
// banner_announced_at = NOW() and the modal never
// appears again for that account.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { liquidGlass } from '../lib/liquidGlass';

interface Props {
  userId: string;
  onDismiss: () => void;
}

export function BannerAnnouncementModal({ userId, onDismiss }: Props) {
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
      .update({ banner_announced_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  async function handleCheckItOut() {
    setBusy(true);
    await stampAnnouncedAt();
    setBusy(false);
    onDismiss();
    router.push('/edit-profile');
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
      aria-labelledby="banner-announce-title"
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
        animation: 'mitype-banner-announce-fade 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #fff9f2 0%, var(--brand-personal-bg-peach) 100%)',
          border: '1px solid rgba(200,149,108,0.3)',
          borderRadius: 24,
          maxWidth: 480,
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
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="3" y="6" width="26" height="14" rx="3" stroke="#a07a4d" strokeWidth="1.5" fill="#a07a4d" fillOpacity="0.18" /><path d="M5 17l6-6 5 5 3-3 8 8" stroke="#a07a4d" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="22" cy="10.5" r="1.8" fill="#a07a4d" /><rect x="11" y="22" width="10" height="6" rx="2" fill="#a07a4d" fillOpacity="0.35" /></svg>
          </div>
          <h2
            id="banner-announce-title"
            style={{
              color: 'var(--brand-text-primary)',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Make your profile yours with a banner
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
          You can now add a banner photo to the top of your profile. Your profile color fades smoothly into it.
        </p>
        <ul style={{ color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.55, margin: '0 0 14px', paddingLeft: 20 }}>
          <li>Go to Edit Profile and find <strong>Profile banner</strong> at the top.</li>
          <li><strong>Choose from the library</strong>: more than 80 high quality banners, from city skylines to mountains, beaches and night skies.</li>
          <li><strong>Upload your own</strong>: drag to position and zoom, and it stays sharp on phones, tablets and desktops. Photos at least 1600 px wide look best.</li>
          <li>Tap <strong>Save</strong> at the bottom of Edit Profile to publish it. You can change or remove it any time.</li>
        </ul>
        <p
          style={{
            color: 'var(--brand-personal-text-mid)',
            fontSize: 14,
            lineHeight: 1.55,
            margin: '0 0 22px',
          }}
        >
          Want a place that is not in the library yet? Send a direct message to the official <strong>@mitype</strong> profile with your suggestion and we will add it to the catalog.
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
            {busy ? 'Opening...' : 'Add my banner'}
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
          @keyframes mitype-banner-announce-fade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
