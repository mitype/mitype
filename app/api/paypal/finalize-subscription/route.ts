// POST /api/paypal/finalize-subscription
//
// Called from the PayPal Buttons SDK's `onApprove` callback after the
// user has approved the subscription in the PayPal popup. We re-fetch
// the subscription from PayPal as the source of truth (don't trust
// the client) and write its state to Supabase.
//
// The webhook BILLING.SUBSCRIPTION.ACTIVATED is the eventual source
// of truth, but this endpoint gives us immediate UI feedback the
// moment the user clicks approve, before the webhook arrives.

import { NextRequest, NextResponse } from 'next/server';
import { paypalRequest } from '../../../lib/paypalClient';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PayPalSubscription {
  id: string;
  status: string;
  subscriber?: { payer_id?: string; email_address?: string };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { time?: string };
  };
  start_time?: string;
  custom_id?: string;
}

function toIsoOrNull(value?: string | null): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, subscriptionId } = await req.json();

    if (!userId || !subscriptionId) {
      return NextResponse.json(
        { error: 'Missing userId or subscriptionId' },
        { status: 400 }
      );
    }

    // Re-fetch the subscription from PayPal — never trust the client.
    const sub = await paypalRequest<PayPalSubscription>(
      'GET',
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`
    );

    // Sanity check: the custom_id we set when creating the subscription
    // should match the userId. Reject if not — defends against a user
    // submitting someone else's subscription id.
    if (sub.custom_id && sub.custom_id !== userId) {
      console.error('[paypal/finalize-subscription] custom_id mismatch', {
        sub_custom_id: sub.custom_id,
        userId,
      });
      return NextResponse.json(
        { error: 'Subscription does not belong to this user' },
        { status: 403 }
      );
    }

    const status = (sub.status ?? '').toLowerCase() || 'active';

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          paypal_subscription_id: subscriptionId,
          paypal_subscriber_id: sub.subscriber?.payer_id ?? null,
          payment_provider: 'paypal',
          status,
          current_period_end: toIsoOrNull(sub.billing_info?.next_billing_time),
          // PayPal Plans don't expose a separate trial-end field on the
          // subscription resource — our 30-day trial is configured in
          // the Plan itself. Best approximation: start_time.
          trial_end: toIsoOrNull(sub.start_time),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[paypal/finalize-subscription] Supabase upsert failed:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscriptionId,
      status,
    });
  } catch (err: any) {
    console.error('[paypal/finalize-subscription] error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
