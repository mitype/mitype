// POST /api/webhooks/paypal
//
// Receives subscription lifecycle events from PayPal. Configure this
// URL in the PayPal Developer Dashboard under Apps & Credentials →
// (your app) → Webhooks → Add Webhook URL. Subscribe to:
//
//   - BILLING.SUBSCRIPTION.ACTIVATED
//   - BILLING.SUBSCRIPTION.UPDATED
//   - BILLING.SUBSCRIPTION.CANCELLED
//   - BILLING.SUBSCRIPTION.SUSPENDED
//   - BILLING.SUBSCRIPTION.EXPIRED
//   - BILLING.SUBSCRIPTION.PAYMENT.FAILED
//   - PAYMENT.SALE.COMPLETED
//
// PayPal posts JSON. We verify the signature server-side via PayPal's
// /v1/notifications/verify-webhook-signature endpoint before trusting
// any payload.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPayPalWebhook, paypalRequest } from '../../../lib/paypalClient';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type?: string;
  resource: {
    id?: string;
    status?: string;
    custom_id?: string;
    billing_agreement_id?: string;
    billing_info?: {
      next_billing_time?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function toIsoOrNull(value?: string | null): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

async function updateBySubscriptionId(
  subscriptionId: string,
  patch: Record<string, any>
) {
  const supabaseAdmin = getSupabaseAdmin();
  return supabaseAdmin
    .from('subscriptions')
    .update(patch)
    .eq('paypal_subscription_id', subscriptionId);
}

export async function POST(req: NextRequest) {
  try {
    // Read the raw body so we can verify the signature against it.
    const rawBody = await req.text();

    const ok = await verifyPayPalWebhook(req.headers, rawBody);
    if (!ok) {
      console.error('[paypal-webhook] signature verification failed');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody) as PayPalWebhookEvent;
    const eventType = event.event_type;
    const resource = event.resource;

    // BILLING.SUBSCRIPTION.* events use resource.id as the subscription id.
    // PAYMENT.SALE.COMPLETED uses billing_agreement_id (= subscription id).
    const subscriptionId =
      resource.id ?? resource.billing_agreement_id ?? null;

    if (!subscriptionId) {
      // Event we don't have a sub-id for — ack and move on.
      return NextResponse.json({ received: true });
    }

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED': {
        // Subscription is active or just got updated. Fetch the
        // authoritative state from PayPal.
        let nextBilling: string | null = null;
        try {
          const sub = await paypalRequest<{
            status: string;
            billing_info?: { next_billing_time?: string };
          }>('GET', `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
          nextBilling = toIsoOrNull(sub.billing_info?.next_billing_time);
        } catch (err) {
          console.error(
            '[paypal-webhook] failed to refetch subscription:',
            err
          );
        }

        const status = (resource.status ?? '').toLowerCase() || 'active';

        const { error } = await updateBySubscriptionId(subscriptionId, {
          status,
          current_period_end: nextBilling,
        });
        if (error) {
          console.error('[paypal-webhook] activated/updated update failed:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        // A renewal payment just succeeded. Refresh next-billing-time.
        let nextBilling: string | null = null;
        try {
          const sub = await paypalRequest<{
            status: string;
            billing_info?: { next_billing_time?: string };
          }>('GET', `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
          nextBilling = toIsoOrNull(sub.billing_info?.next_billing_time);
        } catch (err) {
          console.error(
            '[paypal-webhook] failed to refetch subscription on renewal:',
            err
          );
        }

        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'active',
          current_period_end: nextBilling,
        });
        if (error) {
          console.error('[paypal-webhook] renewal update failed:', error);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'past_due',
        });
        if (error) {
          console.error('[paypal-webhook] payment_failed update failed:', error);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'suspended',
        });
        if (error) {
          console.error('[paypal-webhook] suspended update failed:', error);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const { error } = await updateBySubscriptionId(subscriptionId, {
          status: 'canceled',
        });
        if (error) {
          console.error('[paypal-webhook] canceled/expired update failed:', error);
        }
        break;
      }

      default:
        // Any other event — acknowledge so PayPal doesn't retry.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[paypal-webhook] handler error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
