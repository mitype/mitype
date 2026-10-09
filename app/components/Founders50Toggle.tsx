'use client';
// Founders 50 opt in, shown on /subscription.
//
// The Founders 50 is Mitype's referral program. Opting in turns the
// member's profile share link into a tracked referral link and adds
// Mi Referrals to their burger menu (the database does that when the
// opt in is saved).
//
// States:
//   * Subscribed, not opted in, opt in open -> "Opt in" button.
//   * Subscribed, not opted in, opt in closed -> nothing is shown.
//   * Subscribed, opted in                   -> status and an opt out link.
//   * Not subscribed, removed for a lapse    -> "Removed for subscription
//                                               lapsed payment".
//   * Not subscribed, never joined           -> nothing is shown.
// The subscription requirement and the membership limit are enforced by
// database triggers; this component is only the friendly front. It never
// shows counts or limits.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { Founders50InfoIcon } from './Founders50InfoIcon';

interface Props {
  userId: string;
  isSubscribed: boolean;
  initialOptedIn: boolean;
  /** True when a lapsed subscription removed this member. */
  removedForLapse: boolean;
}

const REMOVAL_NOTE =
  'If you opt out of the Founders 50 or your subscription payment lapses, you are automatically removed from the Founders 50 referral program.';

export function Founders50Toggle({ userId, isSubscribed, initialOptedIn, removedForLapse }: Props) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [busy, setBusy] = useState(false);
  const [canJoin, setCanJoin] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.resolve(supabase.rpc('founders_50_can_join')).then(({ data, error }) => {
      if (alive && !error && typeof data === 'boolean') setCanJoin(data);
    }, () => { /* leave unknown */ });
    return () => { alive = false; };
  }, []);

  async function setOptIn(next: boolean) {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ founders_50_opted_in: next })
      .eq('user_id', userId);
    setBusy(false);
    if (error) {
      toast.error('Could not update right now. Please try again.');
      return;
    }
    setOptedIn(next);
    toast.success(
      next
        ? "You're in. Your share link is now a referral link."
        : 'You opted out of the Founders 50.',
    );
  }

  const card: React.CSSProperties = {
    background: 'white',
    border: '1px solid rgba(200,149,108,0.2)',
    borderRadius: 20,
    padding: '20px 22px',
    marginTop: 28,
    textAlign: 'left',
  };
  const eyebrow: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 900,
    color: 'var(--brand-personal)',
    textTransform: 'uppercase',
    letterSpacing: '1.6px',
    margin: 0,
  };
  const body: React.CSSProperties = {
    fontSize: 14,
    color: 'var(--brand-personal-text-mid)',
    lineHeight: 1.5,
    margin: '0 0 12px',
  };

  // Removed because the subscription lapsed.
  if (!isSubscribed) {
    if (!removedForLapse) return null;
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <p style={eyebrow}>Founders 50</p>
        </div>
        <button
          type="button"
          disabled
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 100,
            border: '1px solid rgba(200,149,108,0.3)',
            background: 'rgba(200,149,108,0.12)',
            color: 'var(--brand-personal-text-mid)',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          Removed for subscription lapsed payment
        </button>
      </div>
    );
  }

  if (optedIn) {
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <p style={eyebrow}>Founders 50</p>
          <Founders50InfoIcon size={18} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand-text-primary)', margin: '0 0 6px' }}>
          You are opted in
        </p>
        <p style={body}>
          Your profile share link is a referral link, and everyone who joins through it is listed on your
          Mi Referrals page in the burger menu.
        </p>
        <p style={{ ...body, fontSize: 12.5, color: 'var(--brand-personal-text-light)' }}>{REMOVAL_NOTE}</p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/mi-referrals"
            style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--brand-personal)', textDecoration: 'none' }}
          >
            Open Mi Referrals
          </Link>
          <button
            type="button"
            onClick={() => setOptIn(false)}
            disabled={busy}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 12.5,
              color: 'var(--brand-personal-text-light)',
              textDecoration: 'underline',
              cursor: busy ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Opt out
          </button>
        </div>
      </div>
    );
  }

  // Not opted in. When opt in is closed, show nothing at all.
  if (canJoin !== true) return null;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <p style={eyebrow}>Founders 50</p>
        <Founders50InfoIcon size={18} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand-text-primary)', margin: '0 0 6px' }}>
        Join the Founders 50 referral program
      </p>
      <p style={body}>
        Opting in turns your profile share link into a tracked referral link, and everyone who joins through
        it is listed on your Mi Referrals page.
      </p>
      <p style={{ ...body, fontSize: 12.5, color: 'var(--brand-personal-text-light)' }}>{REMOVAL_NOTE}</p>
      <button
        type="button"
        onClick={() => setOptIn(true)}
        disabled={busy}
        style={{
          width: '100%',
          padding: '14px 20px',
          borderRadius: 100,
          border: 'none',
          background: 'var(--brand-personal)',
          color: 'white',
          fontSize: 15,
          fontWeight: 800,
          cursor: busy ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: '0 6px 18px rgba(200,149,108,0.3)',
        }}
      >
        {busy ? 'Saving...' : 'Opt in to the Founders 50'}
      </button>
    </div>
  );
}
