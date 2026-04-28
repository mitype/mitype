'use client';
// Braintree Drop-in checkout component.
//
// Replaces the redirect-to-Stripe flow with an embedded card form that
// renders directly on the subscription page. Flow:
//
//   1. On mount, ask the server for a client token (binds to a Braintree
//      customer that we look up or create from the supabase user id)
//   2. Mount the Drop-in UI into a div using that token
//   3. When the user clicks "Start Now", request the payment method
//      nonce from the Drop-in instance
//   4. POST the nonce + customer id to /api/braintree/create-subscription
//   5. On success, call onSuccess() so the parent can flip the page to
//      the "subscribed" state
//
// We dynamically import braintree-web-drop-in inside useEffect so it
// only loads on the client and never gets pulled into the server bundle.

import { useEffect, useRef, useState } from 'react';
import { toast } from '../lib/toast';

interface Props {
  userId: string;
  email: string;
  onSuccess: () => void;
}

// Minimal type sketch for the Drop-in instance — we only use a couple
// of its methods, so we don't need the full type surface.
interface DropinInstance {
  requestPaymentMethod(): Promise<{ nonce: string }>;
  teardown(): Promise<void>;
}

export function BraintreeCheckout({ userId, email, onSuccess }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropinRef = useRef<DropinInstance | null>(null);

  const [loadingDropin, setLoadingDropin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mount the Drop-in once on first render. The teardown effect cleans
  // it up if the component unmounts mid-flow (e.g. user navigates away).
  useEffect(() => {
    let cancelled = false;

    async function mount() {
      try {
        // 1. Fetch a client token from our API.
        const tokRes = await fetch('/api/braintree/client-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, email }),
        });
        const tokJson = await tokRes.json();
        if (!tokRes.ok || !tokJson.clientToken) {
          throw new Error(tokJson.error ?? 'Could not get client token');
        }

        if (cancelled) return;
        setCustomerId(tokJson.customerId);

        // 2. Lazy-import the Drop-in SDK on the client only.
        const dropin = (await import('braintree-web-drop-in')).default;

        if (!containerRef.current) return;

        const instance = (await dropin.create({
          authorization: tokJson.clientToken,
          container: containerRef.current,
          // Note: PayPal as a payment option is intentionally disabled
          // here. To enable it, link a PayPal Business account to your
          // Braintree merchant account in the Braintree dashboard
          // (Settings → Processing → PayPal), then add a paypal: {}
          // config block back to this create() call.
          card: {
            cardholderName: {
              required: false,
            },
          },
        })) as unknown as DropinInstance;

        if (cancelled) {
          // Component already torn down — clean up the instance we
          // just created so we don't leak DOM nodes.
          await instance.teardown().catch(() => {});
          return;
        }

        dropinRef.current = instance;
        setLoadingDropin(false);
      } catch (err: any) {
        console.error('[BraintreeCheckout] mount error:', err);
        if (!cancelled) {
          setError(err.message ?? 'Could not load checkout');
          setLoadingDropin(false);
        }
      }
    }

    mount();

    return () => {
      cancelled = true;
      // Clean up the Drop-in DOM on unmount.
      if (dropinRef.current) {
        dropinRef.current.teardown().catch(() => {});
        dropinRef.current = null;
      }
    };
    // We intentionally don't depend on userId/email — we mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    if (!dropinRef.current || !customerId) return;
    setSubmitting(true);

    try {
      // 3. Ask the Drop-in for a payment method nonce.
      const { nonce } = await dropinRef.current.requestPaymentMethod();

      // 4. POST the nonce to our API to create the subscription.
      const res = await fetch('/api/braintree/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          paymentMethodNonce: nonce,
          customerId,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Subscription failed');
      }

      toast.success('Welcome to Mitype!');
      onSuccess();
    } catch (err: any) {
      console.error('[BraintreeCheckout] submit error:', err);
      toast.error(err.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div style={{
        padding: 20,
        background: '#fff0f0',
        border: '1px solid rgba(220,100,100,0.3)',
        borderRadius: 16,
        color: '#c07070',
        fontSize: 14,
        textAlign: 'center',
      }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* The Drop-in UI mounts inside this div. */}
      <div
        ref={containerRef}
        style={{
          minHeight: loadingDropin ? 200 : 'auto',
          marginBottom: 20,
        }}
      />

      {loadingDropin && (
        <p style={{ color: '#a89278', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
          Loading secure checkout…
        </p>
      )}

      {!loadingDropin && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '17px',
            background: submitting ? '#d4a882' : '#c8956c',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            fontSize: 17,
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
            marginBottom: 16,
          }}
        >
          {submitting ? 'Processing…' : 'Start Now'}
        </button>
      )}

      <p style={{
        textAlign: 'center',
        color: '#b0967e',
        fontSize: 13,
      }}>
        Your card will not be charged during your 30 day free trial · Cancel anytime
      </p>
    </div>
  );
}
