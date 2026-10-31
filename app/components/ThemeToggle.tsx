'use client';
// Admin-only switch in the burger menu to preview the new "Signal" design.

import { useState } from 'react';
import { getTheme, setTheme } from '../lib/theme';

interface Props { pillBg: string; pillBorder: string; pillText: string }

export function ThemeToggle({ pillBg, pillBorder, pillText }: Props) {
  const [on, setOn] = useState(() => getTheme() === 'signal');
  function flip() {
    const next = !on;
    setOn(next);
    setTheme(next ? 'signal' : 'default');
  }
  return (
    <button
      type="button"
      onClick={flip}
      style={{
        display: 'flex', alignItems: 'center', padding: '13px 20px', color: pillText, fontSize: 15, fontWeight: 700,
        borderRadius: 100, background: pillBg, border: `1px solid ${pillBorder}`, letterSpacing: '0.1px',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}
    >
      {on ? 'New design preview: On' : 'New design preview: Off'}
    </button>
  );
}
