'use client';
// Profile completeness card.
//
// Sits on the dashboard between the welcome header and the Daily Spark.
// Renders a circular progress ring + a checklist of remaining steps so the
// user knows exactly what to do next to round out their profile.
//
// Behavior at 100%:
//   - The first time the user lands on the dashboard at 100%, we show a
//     celebratory "Profile 100% complete" card so the moment is rewarded.
//   - We immediately persist a localStorage flag so on the next login the
//     card hides itself entirely and no longer takes up dashboard real estate.
//   - If the user ever drops back below 100% (e.g., they removed a photo),
//     we clear the flag so the celebration replays the next time they
//     re-complete it.
//
// Pure UI — no DB calls. Takes the profile object the dashboard already
// loaded.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { scoreProfileCompleteness } from '../lib/profileCompleteness';

interface ProfileCompletenessProps {
  profile: unknown;
}

const RING_SIZE = 88;
const RING_STROKE = 9;
const SEEN_KEY = 'mitype-profile-complete-seen';

export function ProfileCompleteness({ profile }: ProfileCompletenessProps) {
  const { percent, steps, doneCount, totalCount } = scoreProfileCompleteness(
    profile as Parameters<typeof scoreProfileCompleteness>[0]
  );
  const isComplete = percent >= 100;
  const remaining = steps.filter((s) => !s.done);

  // Track whether the user has already been shown the "complete"
  // celebration on a previous login. Starts as null so we can render
  // a stable first paint on the server (matching the not-yet-seen
  // state) and only hide once the client has read localStorage.
  const [hasSeenComplete, setHasSeenComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.localStorage.getItem(SEEN_KEY) === '1';
      setHasSeenComplete(seen);

      if (isComplete && !seen) {
        // Mark immediately so a second tab / refresh hides the card.
        window.localStorage.setItem(SEEN_KEY, '1');
      } else if (!isComplete && seen) {
        // Dropped back below 100% — clear the flag so the next
        // time they hit 100 the celebration plays again.
        window.localStorage.removeItem(SEEN_KEY);
      }
    } catch {
      // localStorage can throw in privacy mode — fall back to showing
      // the card (treat as not-yet-seen).
      setHasSeenComplete(false);
    }
  }, [isComplete]);

  // At 100% AND the user has already seen the celebration on a prior
  // login — hide entirely. Note: we wait until hasSeenComplete is
  // resolved (non-null) before hiding so the server-rendered version
  // doesn't briefly show something inconsistent.
  if (isComplete && hasSeenComplete === true) {
    return null;
  }

  // Stroke math for the circular ring.
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);

  // Color shifts from soft → strong as the profile fills in.
  const ringColor =
    percent >= 100
      ? '#16a34a'
      : percent >= 75
        ? '#c8956c'
        : percent >= 40
          ? '#d4a882'
          : '#e0bca0';

  return (
    <div
      style={{
        background: isComplete
          ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
          : 'white',
        border: isComplete
          ? '1px solid rgba(22,163,74,0.25)'
          : '1px solid rgba(200,149,108,0.2)',
        borderRadius: 24,
        padding: '24px 28px',
        marginBottom: 24,
        boxShadow: isComplete
          ? '0 4px 20px rgba(22,163,74,0.12)'
          : '0 4px 20px rgba(0,0,0,0.04)',
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      {/* Ring */}
      <div
        style={{
          position: 'relative',
          width: RING_SIZE,
          height: RING_SIZE,
          flexShrink: 0,
        }}
      >
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            stroke={isComplete ? 'rgba(22,163,74,0.18)' : 'rgba(200,149,108,0.15)'}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: ringColor,
          }}
          aria-label={`Profile is ${percent}% complete`}
        >
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>
            {percent}%
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 240 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isComplete ? '#15803d' : '#a89278',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 4,
          }}
        >
          Profile completeness
        </p>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#1a1208',
            letterSpacing: '-0.3px',
            marginBottom: 6,
          }}
        >
          {isComplete
            ? 'Profile 100% complete 🎉'
            : `${doneCount} of ${totalCount} steps done`}
        </h3>
        <p
          style={{
            color: isComplete ? '#15803d' : '#a89278',
            fontSize: 13,
            marginBottom: isComplete ? 0 : 14,
            lineHeight: 1.5,
          }}
        >
          {isComplete
            ? "You're all set — strong profiles get better matches and richer Daily Spark openers. We'll keep this card tucked away from now on."
            : 'Filled-in profiles get better matches. Knock these out to give your Daily Spark openers more to work with.'}
        </p>

        {!isComplete && (
          <>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {remaining.slice(0, 4).map((step) => (
                <li
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#6b5744',
                    fontSize: 14,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '1.5px solid rgba(200,149,108,0.4)',
                      flexShrink: 0,
                    }}
                  />
                  <span>{step.label}</span>
                </li>
              ))}
              {remaining.length > 4 && (
                <li style={{ color: '#a89278', fontSize: 13, marginLeft: 26 }}>
                  + {remaining.length - 4} more
                </li>
              )}
            </ul>

            <Link
              href="/edit-profile"
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                background: '#c8956c',
                color: 'white',
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(200,149,108,0.3)',
              }}
            >
              Finish my profile →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
