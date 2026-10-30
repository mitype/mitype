'use client';
// Burger menu switch for quiet haptics and soft sounds (on by default).

import { useState } from 'react';
import { feedback, feedbackEnabled, setFeedbackEnabled } from '../lib/feedback';

interface Props { pillBg: string; pillBorder: string; pillText: string }

export function FeedbackToggle({ pillBg, pillBorder, pillText }: Props) {
  const [on, setOn] = useState(() => feedbackEnabled());
  function flip() {
    const next = !on;
    setOn(next);
    setFeedbackEnabled(next);
    if (next) feedback.like();
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
      {on ? 'Sounds and haptics: On' : 'Sounds and haptics: Off'}
    </button>
  );
}
