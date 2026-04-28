# Braintree Migration — Setup Steps

The code is built. Before any of it works, you need to do these five
manual setup tasks. Do them in order.

---

## 1. Install the new dependencies

Open your terminal in the project root and run:

```bash
cd ~/Documents/mitypee
npm install
```

This pulls down the four new packages I added to `package.json`:
`braintree`, `braintree-web-drop-in`, `@types/braintree`,
`@types/braintree-web-drop-in`.

---

## 2. Run this SQL in your Supabase project

The new flow needs a few extra columns on the `subscriptions` table.
Go to your Supabase dashboard → SQL Editor → paste and run:

```sql
-- Braintree migration: add provider-aware columns alongside existing
-- Stripe columns. Defaults backfill existing rows as 'stripe'.

alter table public.subscriptions
  add column if not exists braintree_customer_id text,
  add column if not exists braintree_subscription_id text,
  add column if not exists payment_provider text default 'stripe';

-- Backfill: any row that already has a stripe_customer_id stays as
-- 'stripe'. New rows from the Braintree flow will be set to
-- 'braintree' by the API.
update public.subscriptions
   set payment_provider = 'stripe'
 where stripe_customer_id is not null
   and payment_provider is null;

-- Index for the webhook lookup (we look up rows by
-- braintree_subscription_id when a webhook arrives).
create index if not exists idx_subscriptions_braintree_sub_id
  on public.subscriptions (braintree_subscription_id);

-- Index for the client-token lookup (we look up rows by
-- braintree_customer_id when generating tokens).
create index if not exists idx_subscriptions_braintree_cust_id
  on public.subscriptions (braintree_customer_id);
```

---

## 3. Create the $5/month Plan in the Braintree Sandbox

1. Open the Sandbox dashboard at **sandbox.braintreegateway.com**
2. Top nav → **Subscriptions** → **Plans**
3. Click **+ New Plan**
4. Fill in:
   - **Name:** Mitype Monthly
   - **Plan ID:** `mitype-monthly` (this becomes your `BRAINTREE_PLAN_ID`)
   - **Price:** `5.00`
   - **Currency:** USD
   - **Billing cycle:** Every 1 Month
   - **Trial period:** Enabled, **30 Days**
   - **Number of billing cycles:** Leave blank (infinite)
5. Click **Create Plan**
6. Copy the Plan ID — you'll paste it as an env var in Step 4

When production keys arrive later, repeat this same step in the
Production dashboard. Use the same Plan ID (`mitype-monthly`) so no
code changes are needed.

---

## 4. Add these env vars

You need to add them in **two places**: locally (`.env.local`) and in
**Vercel** (Project Settings → Environment Variables → Production).

Add to `.env.local` (create the file at the project root if it doesn't
exist):

```bash
# Braintree — Sandbox keys (from sandbox.braintreegateway.com → home page)
BRAINTREE_ENVIRONMENT=Sandbox
BRAINTREE_MERCHANT_ID=nvybk5rcd6mmbv9k
BRAINTREE_PUBLIC_KEY=mh7534yp5tjycjyk
BRAINTREE_PRIVATE_KEY=9e4a018dab1a513c6554952491060e7f
BRAINTREE_PLAN_ID=mitype-monthly

# Payment provider switch.
# Leave as "stripe" until production Braintree is approved + tested.
# Then flip to "braintree".
NEXT_PUBLIC_PAYMENT_PROVIDER=stripe
```

In Vercel, add the **same five variables** under
Settings → Environment Variables. Set environment to "Production" for
each. **Use Sandbox keys for now even in Vercel** — they're safe to
deploy because Sandbox doesn't charge real money. When you switch to
production keys later, also flip `BRAINTREE_ENVIRONMENT` to
`Production` and `NEXT_PUBLIC_PAYMENT_PROVIDER` to `braintree`.

After adding the Vercel env vars, redeploy from the Deployments tab
(or push any commit) so the new vars get picked up.

---

## 5. Configure the webhook in the Braintree Sandbox

1. Sandbox dashboard → **Settings** (top right gear icon) → **Webhooks**
2. Click **+ Create New Webhook**
3. Fill in:
   - **Destination URL:** `https://mitypeapp.com/api/webhooks/braintree`
   - **Notifications:** Check all of these boxes:
     - Subscription Charged Successfully
     - Subscription Charged Unsuccessfully
     - Subscription Trial Ended
     - Subscription Went Active
     - Subscription Went Past Due
     - Subscription Canceled
     - Subscription Expired
4. Click **Create Webhook**

Test it by clicking **Check URL** on the new webhook — Braintree will
ping your endpoint with a test payload. You should see "200 OK".

When production keys arrive, repeat this in the Production dashboard.

---

## 6. Test the sandbox flow end-to-end

Once steps 1–5 are done, test locally:

```bash
npm run dev
```

Then in your browser:

1. Go to `http://localhost:3000/subscription`
2. **Switch the env temporarily** — open `.env.local` and change
   `NEXT_PUBLIC_PAYMENT_PROVIDER=braintree`
3. Restart `npm run dev` so the new env loads
4. The page should now show the Braintree Drop-in card form
5. Use Braintree's **sandbox test card numbers**:
   - Visa: `4111 1111 1111 1111`, any future expiry, any CVV
   - Mastercard: `5555 5555 5555 4444`
   - Amex: `3782 822463 10005`
6. Click **Start Now** — you should see "Welcome to Mitype!" and the
   page flips to the "subscribed" state
7. Verify in Sandbox dashboard → Subscriptions that a new subscription
   was created
8. Verify in Supabase that the `subscriptions` row has the new
   `braintree_customer_id`, `braintree_subscription_id`, and
   `payment_provider = 'braintree'`

When that all works, flip `NEXT_PUBLIC_PAYMENT_PROVIDER` back to
`stripe` so the live site keeps using Stripe until production
Braintree is approved.

---

## What happens when production Braintree is approved

When PayPal/Braintree sends you the production credentials:

1. In Vercel env vars, replace the **four Braintree keys** with the
   production values
2. Set `BRAINTREE_ENVIRONMENT=Production`
3. Recreate the **Plan** in the Production dashboard with the same
   `mitype-monthly` ID
4. Recreate the **Webhook** in the Production dashboard pointing to
   the same `/api/webhooks/braintree` URL
5. Set `NEXT_PUBLIC_PAYMENT_PROVIDER=braintree`
6. Redeploy

That's it. Live site is now on Braintree. The Stripe code stays in
place so any existing Stripe subscribers keep working — they only
move to Braintree if/when they re-subscribe.

---

## Files I created/modified

**New files:**

- `app/lib/braintreeClient.ts` — server-side Braintree gateway
- `app/api/braintree/client-token/route.ts` — generates Drop-in tokens
- `app/api/braintree/create-subscription/route.ts` — handles checkout submission
- `app/api/webhooks/braintree/route.ts` — handles subscription lifecycle webhooks
- `app/components/BraintreeCheckout.tsx` — frontend Drop-in component

**Modified files:**

- `package.json` — added `braintree`, `braintree-web-drop-in`, types
- `app/subscription/page.tsx` — conditionally renders Braintree or Stripe based on env

**Untouched (kept for Stripe fallback):**

- `app/api/create-checkout-session/route.ts`
- `app/api/webhooks/stripe/route.ts`

These stay in place so existing Stripe subscribers don't break and so
you can roll back instantly if anything goes wrong with Braintree.
