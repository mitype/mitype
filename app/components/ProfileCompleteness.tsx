'use client';
// Profile completeness card — photo-only rule.
//
// Sits on the dashboard between the welcome header and the Daily Spark.
// Under the new photo-only rule (per user request):
//   * If the user has a profile photo → card hides entirely, no ring,
//     no celebration, no dashboard real estate consumed. Ever.
//   * If the user has no profile photo → card shows with a single,
//     focused "Add a profile photo" CTA and a link straight to
//     Edit Profile.
//
// All the other fields (bio, prompts, categories, links, ZIP) are still
// available in Edit Profile but no longer contribute to completeness —
// so users who don't have a portfolio or don't want to share their ZIP
// aren't nagged forever.
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
  const { percent } = scoreProfileCompleteness(
    profile as Parameters<typeof scoreProfileCompleteness>[0]
  );
  const isComplete = percent >= 100;

  // Photo-only rule: once complete, hide the card entirely and forever
  // (until the user removes their photo, in which case it comes back).
  // No celebration state, no localStorage flag — much simpler than the
  // old weighted-score version.
  if (isComplete) {
    return null;
  }

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
      {/* Empty avatar disc with a camera-plus glyph */}
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
          📷
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 220 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--brand-personal-text-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 4,
          }}
        >
          Profile incomplete
        </p>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--brand-text-primary)',
            letterSpacing: '-0.3px',
            marginBottom: 6,
          }}
        >
          Add a profile photo
        </h3>
        <p
          style={{
            color: 'var(--brand-personal-text-mid)',
            fontSize: 13,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          A profile photo is required to complete your profile. Once it's up, this card will disappear.
        </p>

        <Link
          href="/edit-profile"
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
          Add photo →
        </Link>
      </div>
    </div>
  );
}
