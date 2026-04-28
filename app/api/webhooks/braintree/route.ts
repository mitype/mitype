// POST /api/webhooks/braintree
//
// Receives webhook notifications from Braintree for subscription
// lifecycle events:
//   - subscription_charged_successfully → bumps current_period_end
//   - subscription_charged_unsuccessfully → marks past_due
//   - subscription_canceled / subscription_expired → marks canceled
//   - subscription_trial_ended → trial just ended (Braintree will then
//     attempt the first charge)
//
// Configure the webhook URL in the Braintree Control Panel under
// Settings → Webhooks. Subscribe to all the subscription_* events.
//
// Braintree sends webhooks as form-urlencoded with `bt_signature` and
// `bt_payload` fields. We verify by passing both into
// gateway.webhookNotification.parse().

import { NextRequest, NextResponse } from 'next/server';
import { getBraintreeGateway } from '../../../lib/braintreeClient';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIsoOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

// Update the subscription row keyed by braintree_subscription_id.
// Returns the supabase error (if any).
async function updateBySubscriptionId(
  subscriptionId: string,
  patch: Record<string, any>
) {
  const supabaseAdmin = getSupabaseAdmin();
  return supabaseAdmin
    .from('subscriptions')
    .update(patch)
    .eq('braintree_subscription_id', subscriptionId);
}

export async function POST(req: NextRequest) {
  try {
    const gateway = getBraintreeGateway();

    // Braintree posts as application/x-www-form-urlencoded. Parse the
    // body manually so we can pass the raw fields to the SDK verifier.
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const btSignature = params.get('bt_signature');
    const btPayload = params.get('bt_payload');

    if (!btSignature || !btPayload) {
      console.error('[braintree-webhook] Missing bt_signature or bt_payload');
      return NextResponse.json(
        { error: 'Missing webhook signature or payload' },
        { status: 400 }
      );
    }

    // SDK verifies signature and decodes the payload in one call.
    const notification = await gateway.webhookNotification.parse(
      btSignature,
      btPayload
    );

    const sub: any = (notification as any).subscription;
    const subscriptionId: string | undefined = sub?.id;

    if (!subscriptionId) {
      // Some webhook kinds (e.g. dispute opened, merchant account
      // approved) don't carry a subscription. Acknowledge and move on.
      return NextResponse.json({ received: true });
    }

    switch (notification.kind) {
      case 'subscription_charged_successfully': {
        // Renewal succeeded — refresh status + period end.
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'active',
          current_period_end: toIsoOrNull(sub.nextBillingDate),
        });
        if (error) {
          console.error('[braintree-webhook] charged_successfully update failed:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        break;
      }

      case 'subscription_charged_unsuccessfully': {
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'past_due',
        });
        if (error) {
          console.error('[braintree-webhook] charged_unsuccessfully update failed:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        break;
      }

      case 'subscription_trial_ended': {
        // Trial just ended. Braintree will attempt the first charge —
        // we'll get a follow-up webhook with the result. For now, mark
        // them active so the UI doesn't downgrade prematurely.
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'active',
          current_period_end: toIsoOrNull(sub.nextBillingDate),
        });
        if (error) {
          console.error('[braintree-webhook] trial_ended update failed:', error);
        }
        break;
      }

      case 'subscription_canceled':
      case 'subscription_expired': {
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'canceled',
        });
        if (error) {
          console.error('[braintree-webhook] canceled/expired update failed:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        break;
      }

      case 'subscription_went_active': {
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'active',
          current_period_end: toIsoOrNull(sub.nextBillingDate),
        });
        if (error) {
          console.error('[braintree-webhook] went_active update failed:', error);
        }
        break;
      }

      case 'subscription_went_past_due': {
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'past_due',
        });
        if (error) {
          console.error('[braintree-webhook] went_past_due update failed:', error);
        }
        break;
      }

      default:
        // Acknowledge any other webhook kind so Braintree doesn't retry.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[braintree-webhook] handler error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
