'use client';
// Landing-page category showcase.
//
// Shows the first 20 categories by default with a "+N more" toggle to
// expand the full list. Keeps the page tight on mobile while still
// communicating the breadth of creators on Mitype. Client component so
// the expand-state can live in React.

import { useState } from 'react';

interface Props {
  categories: string[];
  /** How many to show before collapsing. Default 20. */
  initialCount?: number;
}

export function CategoryShowcase({ categories, initialCount = 20 }: Props) {
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
            background: 'white',
            border: '1px solid rgba(200,149,108,0.2)',
            borderRadius: 100,
            padding: '9px 18px',
            fontSize: 13,
            color: '#6b5744',
            fontWeight: 500,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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
              padding: '10px 22px',
              background: expanded ? 'transparent' : 'linear-gradient(135deg, #c8956c, #ffb37c)',
              color: expanded ? '#8a7560' : 'white',
              border: expanded ? '1px solid rgba(200,149,108,0.4)' : 'none',
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.3px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: expanded ? 'none' : '0 8px 22px rgba(200,149,108,0.28)',
            }}
          >
            {expanded ? 'Show fewer' : `+ ${remaining} more`}
          </button>
        </div>
      )}
    </>
  );
}
