'use client';
// RefBadge — small dismissable pill that appears at the top of the
// landing page when someone arrives via a personal invite URL
// (mitypeapp.com/?ref=<username>). Soft, friendly, on-brand. Auto-
// dismisses if the user has no ?ref= query param.

import { useEffect, useState } from 'react';
import { writeReferralCookie } from '../lib/referralCookie';

export function RefBadge() {
  const [username, setUsername] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('ref');
      if (raw) {
        // Sanitize: only allow safe username characters
        const clean = raw.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 30);
        if (clean) {
          setUsername(clean);
          // Persist the referral so it survives the signup flow. 30
          // day cookie, sanitized inside the helper.
          writeReferralCookie(clean);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  if (!username || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'max(72px, env(safe-area-inset-top, 16px) + 56px)',
        left: 16,
        right: 16,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 90,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(255,243,236,0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(200,149,108,0.35)',
          borderRadius: 100,
          padding: '8px 14px 8px 16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 24px rgba(200,149,108,0.18)',
          pointerEvents: 'auto',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <span style={{ fontSize: 14 }}>👋</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-personal-text-head)' }}>
          Invited by <span style={{ color: 'var(--brand-personal)', fontWeight: 800 }}>@{username}</span>
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--brand-personal-text-mid)',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 4px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
