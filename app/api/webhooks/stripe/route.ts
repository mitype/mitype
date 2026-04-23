import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

// Stripe client — same API version as the rest of the app.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

// Next.js specifics: this route must run on the Node.js runtime (so we
// can verify Stripe signatures) and must never be cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Safely read the current period end from a Subscription regardless of
 * which Stripe API version shape we get. In 2026-03-25.dahlia, the
 * field lives on the subscription item; older versions had it at the
 * top level of the subscription.
 */
function getPeriodEnd(sub: Stripe.Subscription): number | null {
  const anySub = sub as any;
  const item = sub.items?.data?.[0] as any;
  return (
    (item?.current_period_end as number | undefined) ??
    (anySub.current_period_end as number | undefined) ??
    null
  );
}

function toIsoOrNull(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[stripe-webhook] Missing stripe-signature header or STRIPE_WEBHOOK_SECRET env var');
    return NextResponse.json(
      { error: 'Missing signature or server is not configured' },
      { status: 400 }
    );
  }

  // IMPORTANT: Stripe needs the RAW request body to verify the signature.
  // `req.text()` in the App Router returns the raw body as a string.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (event.type) {
      // Fired as soon as the Checkout session succeeds. We use this to
      // flip the user to `trialing` (or `active`) the moment they finish paying.
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = (session.customer as string | null) ?? null;
        const subscriptionId = (session.subscription as string | null) ?? null;

        if (!userId) {
          console.error('[stripe-webhook] checkout.session.completed missing supabase_user_id');
          break;
        }

        // Ask Stripe for the subscription to get the authoritative status.
        let status: string = 'trialing';
        let periodEnd: string | null = null;
        let trialEnd: string | null = null;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          status = sub.status;
          periodEnd = toIsoOrNull(getPeriodEnd(sub));
          trialEnd = toIsoOrNull(sub.trial_end);
        }

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status,
              current_period_end: periodEnd,
              trial_end: trialEnd,
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('[stripe-webhook] Supabase upsert failed (checkout.session.completed):', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        break;
      }

      // Any change to the subscription (trial ends, payment succeeds,
      // payment fails, user cancels at period end, etc.) lands here.
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        const customerId = sub.customer as string;

        if (!userId) {
          // No metadata — try to update by subscription id as a fallback.
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: sub.status,
              current_period_end: toIsoOrNull(getPeriodEnd(sub)),
              trial_end: toIsoOrNull(sub.trial_end),
            })
            .eq('stripe_subscription_id', sub.id);
          if (error) {
            console.error(`[stripe-webhook] Fallback update failed (${event.type}):`, error);
          }
          break;
        }

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: sub.id,
              status: sub.status,
              current_period_end: toIsoOrNull(getPeriodEnd(sub)),
              trial_end: toIsoOrNull(sub.trial_end),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error(`[stripe-webhook] Supabase upsert failed (${event.type}):`, error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        break;
      }

      // Subscription fully cancelled / deleted.
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;

        const query = supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled' });

        const { error } = userId
          ? await query.eq('user_id', userId)
          : await query.eq('stripe_subscription_id', sub.id);

        if (error) {
          console.error('[stripe-webhook] Cancel update failed:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        break;
      }

      default:
        // Any event we don't care about — acknowledge with 200 so Stripe
        // doesn't retry it.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[stripe-webhook] Handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
