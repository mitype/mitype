'use client';
// Top Friends launch announcement, one-time modal.
//
// Rendered by the dashboard the first time a subscriber lands there with
// `profiles.top_friends_announced_at IS NULL`. The dashboard is already
// gated to subscribers, so only subscribers ever see this. Any way of
// closing it stamps top_friends_announced_at so it never shows again.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { liquidGlass } from '../lib/liquidGlass';

interface Props {
  userId: string;
  onDismiss: () => void;
}

export function TopFriendsAnnouncementModal({ userId, onDismiss }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleDismiss();
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

  async function stamp() {
    await supabase
      .from('profiles')
      .update({ top_friends_announced_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  async function handleOpen() {
    setBusy(true);
    await stamp();
    setBusy(false);
    onDismiss();
    router.push('/top-friends');
  }

  async function handleDismiss() {
    if (busy) return;
    await stamp();
    onDismiss();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="top-friends-announce-title"
      onClick={() => handleDismiss()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
        animation: 'mitype-tf-announce-fade 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #fff9f2 0%, var(--brand-personal-bg-peach) 100%)',
          border: '1px solid rgba(200,149,108,0.3)', borderRadius: 24,
          maxWidth: 480, width: '100%', maxHeight: '92vh', overflowY: 'auto',
          padding: '32px 28px 28px', position: 'relative',
          boxShadow: '0 24px 60px rgba(26,18,8,0.35)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <button
          type="button"
          onClick={() => handleDismiss()}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%',
            border: 'none', background: 'rgba(200,149,108,0.12)', color: 'var(--brand-personal-text-mid)',
            fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, fontFamily: 'inherit', padding: 0,
          }}
        >
          ×
        </button>

        <p style={{ color: 'var(--brand-personal)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.6px', margin: '0 0 12px' }}>
          New feature
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexShrink: 0 }} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 38, height: 38, borderRadius: '50%', marginLeft: i === 0 ? 0 : -12,
                border: '2px solid var(--brand-personal)', background: 'rgba(200,149,108,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>👤</span>
            ))}
          </div>
          <h2 id="top-friends-announce-title" style={{ color: 'var(--brand-text-primary)', fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.2, margin: 0 }}>
            Show off your Top Friends
          </h2>
        </div>

        <p style={{ color: 'var(--brand-personal-text-mid)', fontSize: 15, lineHeight: 1.55, margin: '0 0 14px' }}>
          You can now list up to six of your closest friends on your profile. They show as round photos with their usernames, right above your Positivity Score.
        </p>
        <ul style={{ color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.55, margin: '0 0 14px', paddingLeft: 20 }}>
          <li>Open the menu and tap <strong>Top Friends</strong>, search a username and send a request.</li>
          <li>Your friend has to <strong>approve</strong> before they appear on your profile.</li>
          <li>If they <strong>deny</strong>, you get a notification telling you it was denied.</li>
          <li>Reorder, remove or cancel any time. If you are added to someone&rsquo;s list, you will get a request to approve or deny.</li>
        </ul>
        <p style={{ color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.55, margin: '0 0 22px' }}>
          The full guide is in the Information Center.
        </p>

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            type="button" onClick={handleOpen} disabled={busy}
            style={{
              ...liquidGlass({ tone: 'warm' }), padding: '13px 22px', color: 'var(--brand-text-primary)',
              fontSize: 15, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            {busy ? 'Opening...' : 'Add my Top Friends'}
          </button>
          <button
            type="button" onClick={() => handleDismiss()} disabled={busy}
            style={{
              ...liquidGlass({ tone: 'clear' }), padding: '13px 22px', color: 'var(--brand-personal-text-mid)',
              fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            Maybe later
          </button>
        </div>

        <style>{`
          @keyframes mitype-tf-announce-fade { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}
