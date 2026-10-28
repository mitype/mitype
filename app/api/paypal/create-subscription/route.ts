// POST /api/paypal/create-subscription
//
// Called from the PayPal Buttons SDK's `createSubscription` callback.
// Creates a PayPal subscription against the configured Plan and
// returns the subscription id. PayPal's button SDK uses that id to
// redirect the user into the approval flow.
//
// We also pre-create a row in our subscriptions table with the
// pending status so we have a paper trail even if the user bails
// before approving.

import { NextRequest, NextResponse } from 'next/server';
import { paypalRequest, getPayPalPlanId } from '../../../lib/paypalClient';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthedUser } from '../../../lib/waveAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PayPalSubscriptionResponse {
  id: string;
  status: string;
  links?: Array<{ rel: string; href: string; method: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Identify the member. A current page sends their login token and we
    // use the verified id. A page that was already open before an update
    // may not send one yet, so we still accept the id in the request, but
    // never let it change a member who already has access (below).
    let userId: string | undefined;
    let email: string | undefined;
    const { user } = await getAuthedUser(req);
    if (user) {
      userId = user.id;
      email = user.email ?? body.email;
    } else if (!req.headers.get('authorization')) {
      userId = body.userId;
      email = body.email;
    } else {
      return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    }

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    // Members who already have access (paid, trialing, or complimentary)
    // never start another subscription. This also means a forged request
    // can never knock an active member out of their account.
    const { data: existing } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('status, is_comped')
      .eq('user_id', userId)
      .maybeSingle();
    if (existing?.is_comped || existing?.status === 'active' || existing?.status === 'trialing') {
      return NextResponse.json(
        { error: 'Your account already has full access.' },
        { status: 400 }
      );
    }

    const planId = getPayPalPlanId();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mitypeapp.com';

    // Create the subscription in APPROVAL_PENDING state. PayPal will
    // move it to ACTIVE after the user approves in the popup.
    const subscription = await paypalRequest<PayPalSubscriptionResponse>(
      'POST',
      '/v1/billing/subscriptions',
      {
        plan_id: planId,
        subscriber: {
          email_address: email,
        },
        application_context: {
          brand_name: 'Mitype',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${baseUrl}/subscription?paypal=success`,
          cancel_url: `${baseUrl}/subscription?paypal=cancel`,
        },
        // custom_id flows through to the BILLING.SUBSCRIPTION.* webhook
        // events as `resource.custom_id`, letting us look up which
        // supabase user a subscription belongs to.
        custom_id: userId,
      }
    );

    // Pre-create / update the subscriptions row so we have somewhere
    // to land the user-id ↔ subscription-id mapping immediately.
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          paypal_subscription_id: subscription.id,
          payment_provider: 'paypal',
          status: subscription.status?.toLowerCase() || 'pending',
        },
        { onConflict: 'user_id' }
      );

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (err: any) {
    console.error('[paypal/create-subscription] error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
