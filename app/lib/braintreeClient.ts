// Server-only Braintree gateway client.
//
// NEVER import this file into a client component — it uses the private
// API key. Only use inside API route handlers, server actions, or
// server components running on Node.js (not Edge).
//
// Lazy-initialized so build-time module loading doesn't fail when env
// vars aren't present yet. We support both Sandbox and Production via
// BRAINTREE_ENVIRONMENT — set it to "Sandbox" while testing, "Production"
// when the live merchant account is approved.

import braintree from 'braintree';

let _gateway: braintree.BraintreeGateway | null = null;

export function getBraintreeGateway(): braintree.BraintreeGateway {
  if (_gateway) return _gateway;

  const merchantId = process.env.BRAINTREE_MERCHANT_ID;
  const publicKey = process.env.BRAINTREE_PUBLIC_KEY;
  const privateKey = process.env.BRAINTREE_PRIVATE_KEY;
  const env = (process.env.BRAINTREE_ENVIRONMENT || 'Sandbox').trim();

  if (!merchantId || !publicKey || !privateKey) {
    throw new Error(
      'Braintree gateway is missing env vars. Required: BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY, BRAINTREE_PRIVATE_KEY. Optional: BRAINTREE_ENVIRONMENT (Sandbox | Production, default Sandbox).'
    );
  }

  const environment =
    env.toLowerCase() === 'production'
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox;

  _gateway = new braintree.BraintreeGateway({
    environment,
    merchantId,
    publicKey,
    privateKey,
  });

  return _gateway;
}

// The Braintree Plan ID for the $5/month subscription with 30-day trial.
// You configure this in the Braintree Control Panel under
// Recurring Billing → Plans, then drop the Plan ID into this env var.
export function getBraintreePlanId(): string {
  const planId = process.env.BRAINTREE_PLAN_ID;
  if (!planId) {
    throw new Error(
      'BRAINTREE_PLAN_ID env var is not set. Create a $5/month plan with a 30-day trial in the Braintree Control Panel and put the Plan ID here.'
    );
  }
  return planId;
}
