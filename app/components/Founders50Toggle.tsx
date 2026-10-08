'use client';
// Founders 50 opt in, shown on /subscription to subscribed members.
//
// The Founders 50 is Mitype's referral program and is capped at 50
// members. Opting in turns the member's profile share link into a
// tracked referral link and adds Mi Referrals to their burger menu
// (the database does that part when the opt in is saved).
//
// States:
//   * Not opted in, spots left  -> "Opt in" button with a spots counter.
//   * Not opted in, all taken   -> disabled with a "full" message.
//   * Opted in                  -> confirmation and a small opt out link.
// The 50 member cap and the subscription requirement are both enforced
// by a database trigger, so this component is only the friendly front.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { Founders50InfoIcon } from './Founders50InfoIcon';

const MAX_FOUNDERS = 50;

interface Props {
  userId: string;
  isSubscribed: boolean;
  initialOptedIn: boolean;
}

export function Founders50Toggle({ userId, isSubscribed, initialOptedIn }: Props) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState<number | null>(null);

  async function loadSpots() {
    try {
      const { data, error } = await supabase.rpc('founders_50_spots_taken');
      if (!error && typeof data === 'number') setTaken(data);
    } catch {
      /* the counter is optional */
    }
  }

  useEffect(() => {
    let alive = true;
    Promise.resolve(supabase.rpc('founders_50_spots_taken')).then(({ data, error }) => {
      if (alive && !error && typeof data === 'number') setTaken(data);
    }, () => { /* the counter is optional */ });
    return () => { alive = false; };
  }, []);

  const spotsLeft = taken === null ? null : Math.max(MAX_FOUNDERS - taken, 0);
  const full = spotsLeft === 0 && !optedIn;

  async function setOptIn(next: boolean) {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ founders_50_opted_in: next })
      .eq('user_id', userId);
    setBusy(false);
    if (error) {
      toast.error(error.message || 'Could not update. Try again.');
      loadSpots();
      return;
    }
    setOptedIn(next);
    loadSpots();
    toast.success(
      next
        ? "You're in. Your share link is now a referral link."
        : 'You opted out of the Founders 50.',
    );
  }

  if (!isSubscribed) return null;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(200,149,108,0.2)',
        borderRadius: 20,
        padding: '20px 22px',
        marginTop: 28,
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: 'var(--brand-personal)',
            textTransform: 'uppercase',
            letterSpacing: '1.6px',
            margin: 0,
          }}
        >
          Founders 50
        </p>
        <Founders50InfoIcon size={18} />
      </div>

      {optedIn ? (
        <>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand-text-primary)', margin: '0 0 6px' }}>
            You are a Founders 50 member
          </p>
          <p style={{ fontSize: 14, color: 'var(--brand-personal-text-mid)', lineHeight: 1.5, margin: '0 0 12px' }}>
            Your profile share link is a referral link, and everyone who joins through it is listed on your
            Mi Referrals page in the burger menu.
          </p>
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
        </>
      ) : (
        <>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand-text-primary)', margin: '0 0 6px' }}>
            {full ? 'All 50 founder spots are taken' : 'Join the Founders 50'}
          </p>
          <p style={{ fontSize: 14, color: 'var(--brand-personal-text-mid)', lineHeight: 1.5, margin: '0 0 14px' }}>
            {full
              ? 'The Founders 50 is limited to the first 50 members and every spot has been claimed.'
              : `The Founders 50 is Mitype's referral program, limited to the first 50 members. Opting in turns your profile share link into a tracked referral link.${
                  spotsLeft !== null ? ` ${spotsLeft} of ${MAX_FOUNDERS} spots left.` : ''
                }`}
          </p>
          <button
            type="button"
            onClick={() => setOptIn(true)}
            disabled={busy || full}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 100,
              border: 'none',
              background: full ? 'rgba(200,149,108,0.35)' : 'var(--brand-personal)',
              color: 'white',
              fontSize: 15,
              fontWeight: 800,
              cursor: busy || full ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: full ? 'none' : '0 6px 18px rgba(200,149,108,0.3)',
            }}
          >
            {busy ? 'Saving...' : full ? 'Spots full' : 'Opt in to the Founders 50'}
          </button>
        </>
      )}
    </div>
  );
}
