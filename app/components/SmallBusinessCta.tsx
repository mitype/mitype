'use client';
// SmallBusinessCta — a small pill button on the landing page that
// opens the SmallBusinessInfoModal. Combined into one client component
// so the parent landing page (`app/page.tsx`) can stay a server
// component.

import { useState } from 'react';
import { SmallBusinessInfoModal } from './SmallBusinessInfoModal';

export function SmallBusinessCta() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 20px',
          background: 'white',
          border: '1px solid rgba(139,92,246,0.35)',
          borderRadius: 100,
          color: 'var(--brand-business-deep)',
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: '0 8px 22px rgba(139,92,246,0.15)',
          letterSpacing: '0.2px',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16 }}>🏪</span>
        Own a small business? See how Mitype helps
        <span aria-hidden="true" style={{ fontSize: 16 }}>→</span>
      </button>
      <SmallBusinessInfoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
