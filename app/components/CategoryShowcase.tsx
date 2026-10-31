'use client';
// Landing-page category showcase.
//
// Shows the first 20 categories by default with a "+N more" toggle to
// expand the full list. Keeps the page tight on mobile while still
// communicating the breadth of creators on Mitype. Client component so
// the expand-state can live in React.

import { useState } from 'react';
import { liquidGlass } from '../lib/liquidGlass';

interface Props {
  categories: string[];
  /** How many to show before collapsing. Default 20. */
  initialCount?: number;
  /** Dark landing-page styling. */
  dark?: boolean;
}

export function CategoryShowcase({ categories, initialCount = 20, dark = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const remaining = Math.max(0, categories.length - initialCount);
  const visible = expanded || remaining === 0
    ? categories
    : categories.slice(0, initialCount);

  return (
    <>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
      }}>
        {visible.map((cat) => (
          <div key={cat} style={{
            // `lite` variant — same visual glass language (gradient
            // border shine + inset shadows) but NO backdrop-filter, so
            // scrolling 140 of these at once stays smooth on mobile.
            ...(dark
              ? {
                  border: '1px solid rgba(200,149,108,0.24)',
                  borderRadius: 100,
                  background: 'rgba(255,255,255,0.04)',
                  color: '#f6e8d6',
                }
              : { ...liquidGlass({ tone: 'clear', variant: 'lite' }), color: 'var(--brand-personal-text-head)' }),
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {cat}
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Show fewer categories' : `Show ${remaining} more categories`}
            style={{
              ...(dark
                ? expanded
                  ? { border: '1px solid rgba(246,232,214,0.3)', borderRadius: 100, background: 'rgba(255,255,255,0.05)' }
                  : { border: '1px solid transparent', borderRadius: 100, background: 'linear-gradient(180deg, #f5d6b0, #cf9a6b)' }
                : liquidGlass({ tone: expanded ? 'clear' : 'warm' })),
              padding: '10px 22px',
              color: dark ? (expanded ? '#f6e8d6' : '#25180e') : 'var(--brand-text-primary)',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.3px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {expanded ? 'Show fewer' : `+ ${remaining} more`}
          </button>
        </div>
      )}
    </>
  );
}
