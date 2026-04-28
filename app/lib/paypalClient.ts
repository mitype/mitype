// Server-only PayPal API helper.
//
// Wraps OAuth 2.0 client-credentials auth + REST API calls to PayPal.
// We use raw fetch instead of @paypal/paypal-server-sdk because the
// SDK's TypeScript types are heavy and we only need a small surface
// (subscriptions create, get, cancel + webhook verify).
//
// Switches between Sandbox and Live via PAYPAL_ENVIRONMENT env var.
// Set to "Sandbox" while testing, "Live" when production credentials
// are wired up.

const SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const LIVE_API = 'https://api-m.paypal.com';

// Cached OAuth token + expiry. Tokens last ~9 hours per PayPal docs;
// we expire ours a minute early to be safe.
let _cachedToken: { token: string; expiresAt: number } | null = null;

function getApiBase(): string {
  const env = (process.env.PAYPAL_ENVIRONMENT ?? 'Sandbox').trim().toLowerCase();
  return env === 'live' || env === 'production' ? LIVE_API : SANDBOX_API;
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'PayPal credentials missing. Required env vars: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET. Optional: PAYPAL_ENVIRONMENT (Sandbox | Live, default Sandbox).'
    );
  }

  return { clientId, clientSecret };
}

/**
 * Fetch (and cache) an OAuth 2.0 access token. PayPal returns a JWT
 * we can use as a Bearer token for subsequent API calls.
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if it's still valid (with 60s safety margin).
  if (_cachedToken && _cachedToken.expiresAt > Date.now() + 60_000) {
    return _cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const apiBase = getApiBase();

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '<no body>');
    throw new Error(`PayPal OAuth failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };

  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Make an authenticated request to the PayPal REST API.
 * Returns the parsed JSON response, or throws if the API returns an
 * error status.
 */
export async function paypalRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const token = await getAccessToken();
  const apiBase = getApiBase();

  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Some endpoints (cancel subscription, etc.) return 204 No Content.
  // Don't try to parse an empty body.
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON response — pass through as-is for the error message.
    }
  }

  if (!res.ok) {
    const message =
      json?.message ??
      json?.error_description ??
      json?.error ??
      text ??
      `PayPal API ${method} ${path} failed (${res.status})`;
    throw new Error(message);
  }

  return json as T;
}

/**
 * Verify a PayPal webhook signature. Returns true if the webhook
 * payload is genuinely from PayPal, false otherwise.
 *
 * PAYPAL_WEBHOOK_ID is the webhook id you get when you create a
 * webhook in the PayPal Developer Dashboard.
 */
export async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('[paypal] PAYPAL_WEBHOOK_ID env var is not set');
    return false;
  }

  // Required headers from PayPal's webhook event.
  const required = [
    'paypal-auth-algo',
    'paypal-cert-url',
    'paypal-transmission-id',
    'paypal-transmission-sig',
    'paypal-transmission-time',
  ];

  const headerMap: Record<string, string> = {};
  for (const h of required) {
    const value = headers.get(h);
    if (!value) {
      console.error(`[paypal] webhook missing required header: ${h}`);
      return false;
    }
    headerMap[h] = value;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    console.error('[paypal] webhook body is not valid JSON');
    return false;
  }

  try {
    const result = await paypalRequest<{ verification_status: string }>(
      'POST',
      '/v1/notifications/verify-webhook-signature',
      {
        auth_algo: headerMap['paypal-auth-algo'],
        cert_url: headerMap['paypal-cert-url'],
        transmission_id: headerMap['paypal-transmission-id'],
        transmission_sig: headerMap['paypal-transmission-sig'],
        transmission_time: headerMap['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }
    );

    return result.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('[paypal] webhook verification call failed:', err);
    return false;
  }
}

export function getPayPalPlanId(): string {
  const planId = process.env.PAYPAL_PLAN_ID;
  if (!planId) {
    throw new Error(
      'PAYPAL_PLAN_ID env var is not set. Create a $5/month plan with a 30-day trial in the PayPal Developer Dashboard (Catalog & Billing Plans) and put the Plan ID here.'
    );
  }
  return planId;
}
