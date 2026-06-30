'use client';
// PositivityScore — anonymous peer-rating bar on user profiles.
//
// 8 stars total. Each vote = half a star fill (so 16 votes fills the bar).
// Anyone authenticated can tap once on someone else's profile to add
// their vote. Votes are anonymous — the renderer never sees voter ids,
// only an aggregate count via a SECURITY DEFINER RPC.
//
// When count >= 16 the bar reads "Voted highly positive."
// On own profile the bar is read-only.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { checkRateLimit, LIMITS, rateLimitMessage } from '../lib/rateLimit';

const TOTAL_STARS = 8;
const VOTES_PER_FULL_BAR = TOTAL_STARS * 2; // 16 votes = fully filled
const HIGHLY_POSITIVE_THRESHOLD = VOTES_PER_FULL_BAR;

interface Props {
  /** The profile being rated. */
  profileUserId: string;
  /** The viewer's user id, or null if signed out. */
  viewerId: string | null;
  /** True when this profile is the viewer's own — disables voting. */
  isOwnProfile: boolean;
}

export function PositivityScore({ profileUserId, viewerId, isOwnProfile }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: c }, voted] = await Promise.all([
          supabase.rpc('get_positivity_count', { target_user_id: profileUserId }),
          viewerId
            ? supabase.rpc('has_voted_positivity', { target_user_id: profileUserId })
            : Promise.resolve({ data: false }),
        ]);
        if (cancelled) return;
        setCount(typeof c === 'number' ? c : Number(c ?? 0));
        setHasVoted(Boolean(voted.data));
      } catch (e) {
        console.error('[positivity] load failed:', e);
        if (!cancelled) setCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [profileUserId, viewerId]);

  async function castVote() {
    if (busy || !viewerId || isOwnProfile || hasVoted) return;
    setBusy(true);
    try {
      // Cap how fast a single user can vote-bomb the platform.
      const allowed = await checkRateLimit(LIMITS.POSITIVITY_VOTE);
      if (!allowed) {
        toast.error(rateLimitMessage(LIMITS.POSITIVITY_VOTE));
        return;
      }
      const { error } = await supabase
        .from('positivity_votes')
        .insert({ voter_id: viewerId, voted_user_id: profileUserId });
      if (error) {
        toast.error(error.message ?? 'Could not register vote.');
        return;
      }
      setHasVoted(true);
      setCount((c) => (c ?? 0) + 1);
      toast.success('Vote sent. Stays anonymous.');
    } catch (e: any) {
      console.error('[positivity] vote failed:', e);
      toast.error(e?.message ?? 'Could not vote.');
    } finally {
      setBusy(false);
    }
  }

  if (count === null) {
    return (
      <div style={shellStyle}>
        <p style={eyebrowStyle}>Positivity Score</p>
        <div style={{ color: 'var(--brand-personal-text-light)', fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  const filledHalves = Math.min(count, VOTES_PER_FULL_BAR);
  const highlyPositive = count >= HIGHLY_POSITIVE_THRESHOLD;
  const interactive = !!viewerId && !isOwnProfile && !hasVoted;

  return (
    <div style={shellStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 10,
      }}>
        <p style={eyebrowStyle}>Positivity Score</p>
        <span style={{
          fontSize: 11,
          color: 'var(--brand-personal-text-light)',
          fontWeight: 700,
        }}>
          {count} {count === 1 ? 'vote' : 'votes'}
        </span>
      </div>

      <button
        type="button"
        onClick={castVote}
        disabled={!interactive || busy}
        aria-label={
          isOwnProfile
            ? `Your positivity score: ${count} votes`
            : hasVoted
              ? 'You voted positively for this user'
              : 'Vote positively for this user'
        }
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: '100%',
          padding: '8px 4px',
          background: 'transparent',
          border: 'none',
          cursor: interactive ? 'pointer' : 'default',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: TOTAL_STARS }, (_, i) => {
            // Each star has two halves. Half i*2 is the left, i*2+1 is right.
            const leftFilled = filledHalves > i * 2;
            const rightFilled = filledHalves > i * 2 + 1;
            return <Star key={i} leftFilled={leftFilled} rightFilled={rightFilled} />;
          })}
        </div>
        {/* Tap-to-vote / status hint */}
        <p style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 700,
          color: highlyPositive ? '#16a34a' : 'var(--brand-personal-text-mid)',
        }}>
          {highlyPositive
            ? 'This user was voted highly positive.'
            : isOwnProfile
              ? 'Members can vote anonymously to raise your score.'
              : hasVoted
                ? 'Thanks for voting. Stays anonymous.'
                : 'Tap to send an anonymous positivity vote.'}
        </p>
      </button>
    </div>
  );
}

function Star({ leftFilled, rightFilled }: { leftFilled: boolean; rightFilled: boolean }) {
  // Star path centered in a 32x32 viewBox.
  const PATH = 'M16 3 L20 12 L29.5 12.5 L22 19 L24 28 L16 23 L8 28 L10 19 L2.5 12.5 L12 12 Z';
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 32 32"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Half fills via a clipped gradient — left half on, right half off. */}
        <linearGradient id="pstar-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="var(--brand-personal)" />
          <stop offset="50%"  stopColor="var(--brand-personal)" />
          <stop offset="50%"  stopColor="rgba(200,149,108,0.15)" />
          <stop offset="100%" stopColor="rgba(200,149,108,0.15)" />
        </linearGradient>
      </defs>
      <path
        d={PATH}
        fill={
          leftFilled && rightFilled
            ? 'var(--brand-personal)'
            : leftFilled
              ? 'url(#pstar-left)'
              : 'rgba(200,149,108,0.15)'
        }
        stroke="var(--brand-personal)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const shellStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(200,149,108,0.20)',
  borderRadius: 18,
  padding: '16px 20px',
  marginBottom: 24,
  boxShadow: '0 4px 16px rgba(200,149,108,0.06)',
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  color: 'var(--brand-personal)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};
