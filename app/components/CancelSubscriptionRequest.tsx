'use client';
// "Request subscription cancellation" button, shown on /subscription for
// active subscribers. Tapping it (and confirming) sends @mitype a bell
// notification and a message saying "<username> has submitted a request to
// cancel their subscription." The owner then cancels it in PayPal by hand.
// Nothing is cancelled automatically.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

export function CancelSubscriptionRequest({ userId }: { userId: string }) {
  const [sent, setSent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  // Show "request sent" if one went out in the last 24 hours.
  useEffect(() => {
    let alive = true;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    Promise.resolve(
      supabase
        .from('cancellation_requests')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', since)
        .limit(1),
    ).then(({ data }) => {
      if (alive && data && data.length > 0) setSent(true);
    }, () => { /* leave as not sent */ });
    return () => { alive = false; };
  }, [userId]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('request_subscription_cancellation');
    setBusy(false);
    setConfirming(false);
    if (error) {
      toast.error(error.message || 'Could not send your request. Please try again.');
      return;
    }
    setSent(true);
    toast.success(
      data === 'already'
        ? 'Your request was already sent. We will take care of it soon.'
        : 'Request sent. We will take care of it soon.',
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
    margin: '0 0 10px',
  };
  const body: React.CSSProperties = {
    fontSize: 14,
    color: 'var(--brand-personal-text-mid)',
    lineHeight: 1.5,
    margin: '0 0 14px',
  };

  return (
    <div style={card}>
      <p style={eyebrow}>Cancel subscription</p>

      {sent ? (
        <p style={{ ...body, margin: 0 }}>
          Your cancellation request has been sent. We will take care of it and your access continues until
          it is processed.
        </p>
      ) : confirming ? (
        <>
          <p style={body}>Send a request to cancel your subscription?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              style={{
                flex: 1,
                padding: '13px 16px',
                borderRadius: 100,
                border: 'none',
                background: '#b3453a',
                color: 'white',
                fontSize: 14,
                fontWeight: 800,
                cursor: busy ? 'default' : 'pointer',
                fontFamily: 'inherit',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Sending...' : 'Yes, send request'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              style={{
                flex: 1,
                padding: '13px 16px',
                borderRadius: 100,
                border: '1px solid rgba(200,149,108,0.4)',
                background: 'white',
                color: 'var(--brand-personal-text-mid)',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Keep my subscription
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={body}>Need to cancel? Send a request and we will handle it for you.</p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: 100,
              border: '1px solid rgba(179,69,58,0.45)',
              background: 'white',
              color: '#b3453a',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Request subscription cancellation
          </button>
        </>
      )}
    </div>
  );
}
