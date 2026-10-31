'use client';
// One-time notice (per device) after the new design launches: tells signed-in
// members where to switch back to the classic look. Skips anyone who already
// picked a design themselves.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { getTheme, setTheme, THEME_KEY } from '../lib/theme';

const SEEN_KEY = 'mitype-design-announced';

export function DesignAnnouncement() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pathname || pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')) return;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
      if (window.localStorage.getItem(THEME_KEY)) { // member already chose a design
        window.localStorage.setItem(SEEN_KEY, '1');
        return;
      }
    } catch { return; }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session && getTheme() === 'signal') setShow(true);
    });
    return () => { cancelled = true; };
  }, [pathname]);

  function close(classic: boolean) {
    try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    if (classic) setTheme('default');
    setShow(false);
  }

  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="design-announce-title"
      onClick={() => close(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#2a2621', border: '1px solid rgba(200,149,108,0.4)', borderRadius: 22, maxWidth: 420, width: '100%', padding: '28px 26px', color: '#f6e8d6', fontFamily: "'Helvetica Neue', Arial, sans-serif", boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: '1.6px', textTransform: 'uppercase', color: '#d19f77' }}>New look</p>
        <h2 id="design-announce-title" style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 900, letterSpacing: '-0.4px', color: '#fff' }}>Mitype has a new design</h2>
        <p style={{ margin: '0 0 22px', fontSize: 14, lineHeight: 1.55, color: '#c9b8a2' }}>
          Prefer the classic look? Open the menu and tap the Design button any time to switch back.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => close(false)} style={{ flex: 1, minWidth: 130, padding: '12px 18px', borderRadius: 100, border: 'none', background: 'linear-gradient(135deg, #a8744a, #7d5232)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Got it</button>
          <button type="button" onClick={() => close(true)} style={{ flex: 1, minWidth: 130, padding: '12px 18px', borderRadius: 100, border: '1px solid rgba(200,149,108,0.4)', background: 'transparent', color: '#e0b48a', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Switch to Classic</button>
        </div>
      </div>
    </div>
  );
}
