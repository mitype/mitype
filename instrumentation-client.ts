// Sentry client-side instrumentation for Next.js 16. This file runs
// after HTML loads but before React hydration, which is the right
// moment to wire up error tracking — we want to catch errors that
// happen during the very first render too.
//
// `onRouterTransitionStart` lets the SDK record App Router navigations
// as breadcrumbs so when something blows up we can see what path the
// user was on right before it happened.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Capture replays only when something actually breaks (free tier friendly).
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
