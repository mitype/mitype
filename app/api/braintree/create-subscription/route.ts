// POST /api/braintree/create-subscription
//
// Called from the frontend after the Drop-in UI returns a payment
// method nonce. We:
//   1. Vault the payment method against the customer (so they don't have
//      to re-enter the card on renewal)
//   2. Create a recurring subscription against the configured Plan
//   3. Persist the subscription to Supabase
//
// The Plan itself (price = $5/month, trial = 30 days) is configured
// once in the Braintree Control Panel — the Plan ID lives in the
// BRAINTREE_PLAN_ID env var. We never set price client-side.

import { NextRequest, NextResponse } from 'next/server';
import {
  getBraintreeGateway,
  getBraintreePlanId,
} from '../../../lib/braintreeClient';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIsoOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, paymentMethodNonce, customerId } = await req.json();

    if (!userId || !paymentMethodNonce || !customerId) {
      return NextResponse.json(
        { error: 'Missing userId, paymentMethodNonce, or customerId' },
        { status: 400 }
      );
    }

    const gateway = getBraintreeGateway();
    const supabaseAdmin = getSupabaseAdmin();
    const planId = getBraintreePlanId();

    // 1. Vault the payment method against the customer. This stores the
    //    card token on Braintree's side so we can charge it on renewal.
    const pmResult = await gateway.paymentMethod.create({
      customerId,
      paymentMethodNonce,
      // Make this the default so renewals charge it automatically.
      options: {
        makeDefault: true,
        verifyCard: true,
      },
    });

    if (!pmResult.success) {
      console.error('[braintree/create-subscription] paymentMethod.create failed:', pmResult.message);
      return NextResponse.json(
        { error: pmResult.message ?? 'Card could not be verified' },
        { status: 400 }
      );
    }

    const paymentMethodToken = pmResult.paymentMethod.token;

    // 2. Create the subscription. trialDuration is configured on the
    //    Plan itself in the Control Panel — passing trialDuration here
    //    overrides the Plan default. We rely on the Plan's 30-day trial.
    const subResult = await gateway.subscription.create({
      paymentMethodToken,
      planId,
    });

    if (!subResult.success) {
      console.error('[braintree/create-subscription] subscription.create failed:', subResult.message);
      return NextResponse.json(
        { error: subResult.message ?? 'Subscription could not be created' },
        { status: 400 }
      );
    }

    const sub = subResult.subscription;

    // 3. Persist to Supabase. Upsert so a re-subscribe works cleanly.
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          braintree_customer_id: customerId,
          braintree_subscription_id: sub.id,
          payment_provider: 'braintree',
          // Braintree returns 'Active', 'Pending', etc. — normalize to
          // lowercase to match what the Stripe webhook stores.
          status: (sub.status ?? '').toLowerCase() || 'active',
          // Braintree doesn't expose current_period_end the same way
          // Stripe does. nextBillingDate is the closest equivalent.
          current_period_end: toIsoOrNull(sub.nextBillingDate),
          trial_end: toIsoOrNull(sub.firstBillingDate),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[braintree/create-subscription] Supabase upsert failed:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscriptionId: sub.id,
      status: sub.status,
    });
  } catch (err: any) {
    console.error('[braintree/create-subscription] handler error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
