// POST /api/braintree/client-token
//
// Generates a short-lived client token that the Braintree Drop-in UI
// needs in order to render its card form. Each token is single-use and
// scoped to a Braintree customer (so we can vault their payment method).
//
// Flow:
//   1. Frontend calls this endpoint with the logged-in user's id + email
//   2. We look up (or create) a matching Braintree customer
//   3. We generate a client token bound to that customer
//   4. Frontend uses the token to mount Drop-in
//
// Why bind to a customer up-front? It lets us vault the card on
// completion and reuse it for future subscription renewals without
// asking the user for it again.

import { NextRequest, NextResponse } from 'next/server';
import { getBraintreeGateway } from '../../../lib/braintreeClient';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    const gateway = getBraintreeGateway();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Check if we already have a Braintree customer ID for this user.
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('braintree_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let customerId = existing?.braintree_customer_id ?? null;

    // 2. If not, create one in Braintree and persist the ID.
    if (!customerId) {
      // We deliberately don't pass customFields here — Braintree
      // requires custom fields to be defined in the dashboard first
      // (Settings → Processing → Custom Fields) before they can be
      // set via API. We track the supabase user → braintree customer
      // relationship in our own subscriptions table, so we don't need
      // a duplicate paper trail in Braintree.
      const result = await gateway.customer.create({
        email,
      });

      if (!result.success) {
        console.error('[braintree/client-token] customer.create failed:', result.message);
        return NextResponse.json(
          { error: result.message ?? 'Failed to create Braintree customer' },
          { status: 500 }
        );
      }

      customerId = result.customer.id;

      // Pre-create a subscriptions row so we have somewhere to store
      // the customer id even if they bail before completing checkout.
      await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            braintree_customer_id: customerId,
            payment_provider: 'braintree',
          },
          { onConflict: 'user_id' }
        );
    }

    // 3. Generate the token bound to this customer.
    const tokenResult = await gateway.clientToken.generate({
      customerId,
    });

    if (!tokenResult.success) {
      console.error('[braintree/client-token] clientToken.generate failed:', tokenResult.message);
      return NextResponse.json(
        { error: 'Failed to generate client token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientToken: tokenResult.clientToken,
      customerId,
    });
  } catch (err: any) {
    console.error('[braintree/client-token] handler error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
