'use client';
// Profile completeness card — two-step rule.
//
// Sits on the dashboard between the welcome header and the Daily Spark.
// Under the current rule:
//   * If the user has BOTH a profile photo AND has opted in to
//     Founders 50 → card hides entirely.
//   * If either is missing → card shows with the next incomplete step
//     as a focused CTA. Photo step routes to /edit-profile;
//     Founders 50 step routes to /subscription (where subscribed
//     users can toggle opt-in, and non-subscribed users can subscribe
//     first, which unlocks the toggle).
//
// The (i) icon on the Founders 50 step fires the shared philosophy
// toast so users can read the pitch before opting in.
//
// All the other Edit Profile fields (bio, prompts, categories, links,
// ZIP, latest project) stay available but no longer contribute to
// completeness — so users aren't nagged about optional fields.

import Link from 'next/link';
import { scoreProfileCompleteness } from '../lib/profileCompleteness';
import { Founders50InfoIcon } from './Founders50InfoIcon';

interface ProfileCompletenessProps {
  profile: unknown;
}

const RING_SIZE = 88;
const RING_STROKE = 9;

export function ProfileCompleteness({ profile }: ProfileCompletenessProps) {
  const { percent, steps } = scoreProfileCompleteness(
    profile as Parameters<typeof scoreProfileCompleteness>[0]
  );
  const isComplete = percent >= 100;

  // Two-step rule: once BOTH steps are done, hide the card entirely.
  // No celebration state — the card just disappears silently.
  if (isComplete) {
    return null;
  }

  // Prioritize the photo step. If photo missing, that's the CTA.
  // If photo done but founders_50 missing, that becomes the CTA.
  const nextStep = steps.find((s) => !s.done)!;
  const isPhotoStep = nextStep.key === 'avatar';

  // Stroke math for the circular ring.
  // Empty-avatar visual — a soft bronze circle with a camera-plus glyph
  // that reads as "you're missing a photo" without needing extra copy.
  const radius = (RING_SIZE - RING_STROKE) / 2;

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
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {/* Icon disc — camera for photo step, star for Founders 50 step */}
      <div
        style={{
          position: 'relative',
          width: RING_SIZE,
          height: RING_SIZE,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <svg width={RING_SIZE} height={RING_SIZE}>
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            fill="rgba(200,149,108,0.10)"
            stroke="rgba(200,149,108,0.35)"
            strokeWidth={RING_STROKE / 3}
            strokeDasharray="4 4"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            color: 'var(--brand-personal)',
          }}
        >
          {isPhotoStep ? '📷' : '⭐'}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--brand-personal-text-light)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: 0,
            }}
          >
            Profile incomplete
          </p>
          {!isPhotoStep && <Founders50InfoIcon size={16} />}
        </div>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--brand-text-primary)',
            letterSpacing: '-0.3px',
            marginBottom: 6,
          }}
        >
          {isPhotoStep ? 'Add a profile photo' : 'Opt in to Founders 50'}
        </h3>
        <p
          style={{
            color: 'var(--brand-personal-text-mid)',
            fontSize: 13,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          {isPhotoStep
            ? "A profile photo is required to complete your profile. Once it's up, this card will disappear."
            : 'Reserve your spot in the Founders 50 Rewards Program. Subscribed members can opt in directly; non-subscribers will be routed to subscribe first.'}
        </p>

        <Link
          href={nextStep.href ?? '/edit-profile'}
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            background: 'var(--brand-personal)',
            color: 'white',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 800,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(200,149,108,0.3)',
          }}
        >
          {isPhotoStep ? 'Add photo →' : 'Opt in →'}
        </Link>
      </div>
    </div>
  );
}
