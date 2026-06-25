'use client';
// Shared empty-state card. Replaces the 4+ inline copies that lived in
// /home-goods, /home-goods/by/[username], /businesses, edit-profile
// portfolio, etc. One shape, one place to change the styling.
//
// Tone-aware: matches whichever brand family the surrounding page uses.

import React from 'react';

export type EmptyStateTone = 'personal' | 'business' | 'market' | 'neutral';

interface Props {
  /** Big emoji or short SVG character at the top of the card. */
  icon?: React.ReactNode;
  /** Bold one-line summary. */
  title: string;
  /** Optional supporting paragraph. */
  body?: React.ReactNode;
  /** Optional CTA rendered as a soft pill button. */
  action?: React.ReactNode;
  /** Brand tone — controls border + text + dashed border tint. */
  tone?: EmptyStateTone;
  /** Override max-width if the surrounding container is narrow. */
  maxWidth?: number | string;
}

const TONE: Record<EmptyStateTone, {
  borderRgb: string;
  textColor: string;
  titleColor: string;
}> = {
  personal: {
    borderRgb: 'rgba(200,149,108,0.3)',
    textColor: 'var(--brand-personal-text-mid)',
    titleColor: 'var(--brand-personal-text-deep)',
  },
  business: {
    borderRgb: 'rgba(139,92,246,0.3)',
    textColor: 'var(--brand-business-text-mid)',
    titleColor: 'var(--brand-business-deepest)',
  },
  market: {
    borderRgb: 'rgba(21,128,61,0.3)',
    textColor: 'var(--brand-market-text-mid)',
    titleColor: 'var(--brand-market-deep)',
  },
  neutral: {
    borderRgb: 'rgba(0,0,0,0.12)',
    textColor: '#666',
    titleColor: 'var(--brand-text-primary)',
  },
};

export function EmptyState({
  icon,
  title,
  body,
  action,
  tone = 'personal',
  maxWidth,
}: Props) {
  const t = TONE[tone];
  return (
    <div
      role="status"
      style={{
        padding: 40,
        textAlign: 'center',
        background: 'rgba(255,255,255,0.65)',
        border: `1px dashed ${t.borderRgb}`,
        borderRadius: 18,
        color: t.textColor,
        fontSize: 14,
        lineHeight: 1.6,
        maxWidth,
        margin: maxWidth ? '0 auto' : undefined,
      }}
    >
      {icon !== undefined && (
        <div style={{ fontSize: 38, marginBottom: 8 }}>{icon}</div>
      )}
      <p style={{
        margin: '0 0 6px',
        fontWeight: 800,
        color: t.titleColor,
        fontSize: 15,
      }}>
        {title}
      </p>
      {body !== undefined && (
        <div style={{ margin: 0 }}>{body}</div>
      )}
      {action && (
        <div style={{ marginTop: 14 }}>{action}</div>
      )}
    </div>
  );
}
