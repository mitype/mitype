'use client';
// Shared fallback UI shown when a route segment crashes. Used from each
// route's error.tsx file (Next 16 wraps the segment + children in a React
// error boundary automatically when error.tsx exists). Keeps the page
// chrome alive (nav still renders from the layout) while the broken
// segment is replaced with this card.

import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  error: Error & { digest?: string };
  retry: () => void;
  routeLabel?: string;
}

export function RouteErrorFallback({ error, retry, routeLabel }: Props) {
  useEffect(() => {
    // Always log so it shows up in the browser console + Sentry once wired.
    // eslint-disable-next-line no-console
    console.error('[mitype:route-error]', error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: 24,
          padding: '40px 32px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 12px 32px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>😅</div>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#1a1208',
            marginBottom: 10,
            letterSpacing: '-0.5px',
          }}
        >
          Something went sideways
        </h2>
        <p style={{ color: '#8a7560', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
          {routeLabel ? `The ${routeLabel} page hit an unexpected error.` : 'This page hit an unexpected error.'}{' '}
          Try reloading — if it keeps happening, we&rsquo;ve been notified.
        </p>
        {error?.digest && (
          <p style={{ color: '#a89278', fontSize: 11, fontFamily: 'monospace', marginBottom: 20 }}>
            ref: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={retry}
            style={{
              padding: '12px 24px',
              background: '#c8956c',
              border: 'none',
              borderRadius: 100,
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(200,149,108,0.3)',
              borderRadius: 100,
              color: '#8a7560',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
