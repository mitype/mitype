'use client';
// Profile completeness card.
//
// Sits on the dashboard between the welcome header and the Daily Spark.
// Renders a circular progress ring + a checklist of remaining steps so the
// user knows exactly what to do next to round out their profile. When the
// profile is 100% complete we render a celebratory pill instead of the
// checklist (no need to nag people who are already done).
//
// Pure UI — no DB calls. Takes the profile object the dashboard already
// loaded.

import Link from 'next/link';
import { scoreProfileCompleteness } from '../lib/profileCompleteness';

interface ProfileCompletenessProps {
  profile: unknown;
}

const RING_SIZE = 88;
const RING_STROKE = 9;

export function ProfileCompleteness({ profile }: ProfileCompletenessProps) {
  const { percent, steps, doneCount, totalCount } = scoreProfileCompleteness(
    profile as Parameters<typeof scoreProfileCompleteness>[0]
  );
  const isComplete = percent >= 100;
  const remaining = steps.filter((s) => !s.done);

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
        background: 'white',
        border: '1px solid rgba(200,149,108,0.2)',
        borderRadius: 24,
        padding: '24px 28px',
        marginBottom: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
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
            stroke="rgba(200,149,108,0.15)"
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
            color: '#a89278',
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
            ? 'Your profile looks great ✨'
            : `${doneCount} of ${totalCount} steps done`}
        </h3>
        <p style={{ color: '#a89278', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
          {isComplete
            ? 'Strong profiles get better matches and richer Daily Spark openers — yours is set.'
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
