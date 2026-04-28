'use client';
// PayPal subscription checkout component.
//
// Renders the PayPal Subscribe button using @paypal/react-paypal-js.
// Flow:
//   1. SDK loads with vault=true + intent=subscription so it knows to
//      render subscription-flavored buttons
//   2. On click, createSubscription callback hits our backend, which
//      creates a subscription via the PayPal REST API and returns
//      the subscription id
//   3. PayPal popup opens for user approval
//   4. onApprove fires after the user approves, with the sub id
//   5. We POST to /api/paypal/finalize-subscription so our backend
//      can re-fetch the subscription and write it to Supabase
//   6. We call onSuccess() so the parent page flips to "subscribed"
//
// Webhook BILLING.SUBSCRIPTION.ACTIVATED is the eventual source of
// truth — finalize-subscription gives us instant UI feedback while
// the webhook is in transit.

import { useState } from 'react';
import {
  PayPalScriptProvider,
  PayPalButtons,
  type ReactPayPalScriptOptions,
} from '@paypal/react-paypal-js';
import { toast } from '../lib/toast';

interface Props {
  userId: string;
  email: string;
  onSuccess: () => void;
}

export function PayPalCheckout({ userId, email, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
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
        PayPal checkout is not configured. Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID.
      </div>
    );
  }

  const scriptOptions: ReactPayPalScriptOptions = {
    clientId,
    // Required for the subscription flow — tells PayPal to render the
    // subscription-aware button and vault the payment method.
    vault: true,
    intent: 'subscription',
    currency: 'USD',
  };

  return (
    <div>
      <PayPalScriptProvider options={scriptOptions}>
        <PayPalButtons
          style={{
            shape: 'pill',
            color: 'gold',
            layout: 'vertical',
            label: 'subscribe',
          }}
          disabled={submitting}
          // Called when the user clicks the PayPal button. We hit our
          // backend to create the subscription and return its id.
          createSubscription={async () => {
            setSubmitting(true);
            try {
              const res = await fetch('/api/paypal/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email }),
              });
              const data = await res.json();
              if (!res.ok || !data.subscriptionId) {
                throw new Error(data.error ?? 'Could not start subscription');
              }
              return data.subscriptionId as string;
            } catch (err: any) {
              console.error('[PayPalCheckout] createSubscription error:', err);
              toast.error(err.message ?? 'Could not start subscription');
              setSubmitting(false);
              throw err;
            }
          }}
          // Called after the user approves in the PayPal popup.
          onApprove={async (data) => {
            try {
              const res = await fetch('/api/paypal/finalize-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  subscriptionId: data.subscriptionID,
                }),
              });
              const json = await res.json();
              if (!res.ok || !json.success) {
                throw new Error(json.error ?? 'Subscription save failed');
              }
              toast.success('Welcome to Mitype!');
              onSuccess();
            } catch (err: any) {
              console.error('[PayPalCheckout] onApprove error:', err);
              toast.error(err.message ?? 'Something went wrong saving your subscription. Please contact support.');
            } finally {
              setSubmitting(false);
            }
          }}
          onCancel={() => {
            setSubmitting(false);
          }}
          onError={(err) => {
            console.error('[PayPalCheckout] PayPal SDK error:', err);
            toast.error('PayPal checkout error. Please try again.');
            setSubmitting(false);
          }}
        />
      </PayPalScriptProvider>

      <p style={{
        textAlign: 'center',
        color: '#b0967e',
        fontSize: 13,
        marginTop: 12,
      }}>
        Your card will not be charged during your 30 day free trial · Cancel anytime
      </p>
    </div>
  );
}
