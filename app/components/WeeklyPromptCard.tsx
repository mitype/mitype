'use client';
// Compact dashboard card surfacing this week's creative prompt. Encourages
// the user to click through to /weekly to answer or browse community
// responses. The active prompt is derived from the ISO week — no DB
// fetch needed for the card itself, so it renders instantly.

import Link from 'next/link';
import { useMemo } from 'react';
import {
  currentWeekKey,
  getPromptForWeekKey,
  weekRangeLabel,
} from '../lib/weeklyPrompts';

export function WeeklyPromptCard() {
  const weekKey = useMemo(() => currentWeekKey(), []);
  const prompt = useMemo(() => getPromptForWeekKey(weekKey), [weekKey]);
  const label = useMemo(() => weekRangeLabel(weekKey), [weekKey]);

  return (
    <div
      style={{
        background:
          'linear-gradient(135deg, rgba(245,236,255,0.7) 0%, rgba(255,248,236,0.85) 100%)',
        border: '1px solid rgba(200,149,108,0.25)',
        borderRadius: 24,
        padding: '24px 28px',
        marginBottom: 32,
        boxShadow: '0 4px 20px rgba(200,149,108,0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            color: '#c8956c',
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: 0,
          }}
        >
          ✨ Weekly Creative Prompt · {label}
        </p>
      </div>
      <h3
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: '#1a1208',
          letterSpacing: '-0.3px',
          lineHeight: 1.2,
          margin: '0 0 8px',
        }}
      >
        {prompt.text}
      </h3>
      <p style={{ color: '#8a7560', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
        {prompt.tagline}
      </p>
      <Link
        href="/weekly"
        style={{
          display: 'inline-block',
          padding: '10px 22px',
          background: '#c8956c',
          color: 'white',
          borderRadius: 100,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Add your answer →
      </Link>
    </div>
  );
}
