// Sentry server-side instrumentation for Next.js 16. This file is the
// official Next.js hook for integrating observability tools — Next calls
// `register()` once when a server instance boots, and `onRequestError`
// every time the server catches an unhandled error during render or in a
// route handler. Both runtime branches (Node + Edge) need their own
// Sentry.init() because they execute in different environments and the
// SDK has runtime-specific transports.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Light sampling — we mostly care about errors, not every request.
      tracesSampleRate: 0.1,
      // Don't drown ourselves in dev noise.
      enabled: process.env.NODE_ENV === 'production',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === 'production',
    });
  }
}

// Forward any error Next catches in render / route handlers / server
// actions to Sentry. This is what makes server-side crashes show up in
// the Sentry dashboard (and trigger email alerts) rather than just being
// printed to the Vercel logs.
export const onRequestError = Sentry.captureRequestError;
