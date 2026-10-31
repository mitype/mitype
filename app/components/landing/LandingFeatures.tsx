'use client';
// "Built different. On purpose." feature grid for the landing page. Every
// card opens a modal with the full pitch and a Create a profile button.

import { useEffect, useState } from 'react';
import Link from 'next/link';

export interface LandingFeature {
  title: string;
  blurb: string;
  body: string;
  bullets?: string[];
  logo?: string;
  tone: 'personal' | 'business' | 'market';
  /** Make the card span two columns on desktop. */
  wide?: boolean;
}

const TONE: Record<LandingFeature['tone'], { color: string; tag: string }> = {
  personal: { color: '#c8956c', tag: 'For creators' },
  business: { color: '#a78bfa', tag: 'For small businesses' },
  market: { color: '#6ee7a1', tag: 'Mi Home Goods' },
};

export function LandingFeatures({ features }: { features: LandingFeature[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenIndex(null);
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [openIndex]);

  const open = openIndex !== null ? features[openIndex] : null;

  return (
    <>
      <div className="lp-grid">
        {features.map((f, i) => (
          <button
            key={f.title}
            type="button"
            className={`lp-tile lp-rv${f.wide ? ' lp-wide' : ''}`}
            style={{ ['--tone' as string]: TONE[f.tone].color, ['--i' as string]: i % 4 }}
            onClick={() => setOpenIndex(i)}
            aria-label={`Learn more about ${f.title}`}
            aria-haspopup="dialog"
          >
            <span className="lp-mono">{TONE[f.tone].tag}</span>
            <h3>
              {f.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.logo} alt="" aria-hidden="true" />
              )}
              {f.title}
            </h3>
            <p>{f.blurb}</p>
            <span className="lp-learn">Learn more →</span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="lp-modal"
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="lp-card"
            style={{ ['--tone' as string]: TONE[open.tone].color }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lp-mh">
              <div style={{ minWidth: 0 }}>
                <span className="lp-tag">{TONE[open.tone].tag}</span>
                <h2>
                  {open.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={open.logo} alt="" aria-hidden="true" />
                  )}
                  {open.title}
                </h2>
              </div>
              <button type="button" className="lp-x" onClick={() => setOpenIndex(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="lp-mb">
              <p>{open.body}</p>
              {open.bullets && open.bullets.length > 0 && (
                <ul>
                  {open.bullets.map((b, i) => (
                    <li key={i}>
                      <span aria-hidden="true">›</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="lp-mf">
              <Link href="/signup" className="lp-btn lp-pri" onClick={() => setOpenIndex(null)}>
                Create a profile →
              </Link>
              <button type="button" className="lp-btn lp-gh" onClick={() => setOpenIndex(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
