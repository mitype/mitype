# PayPal (PPCP) Setup — Step by Step

The code is built. Before any of it works, you need to do these manual
setup tasks. Do them in order. We'll do them across two sessions —
the first half right now, the second half once you've got the keys.

---

## Part 1 — Do these now

### 1.1. Install the new dependency

In Terminal:

```bash
cd ~/Documents/mitypee
npm install
```

This pulls down `@paypal/react-paypal-js`.

### 1.2. Add Supabase columns for PayPal

Go to Supabase dashboard → SQL Editor → New query → paste and run:

```sql
alter table public.subscriptions
  add column if not exists paypal_subscription_id text,
  add column if not exists paypal_subscriber_id text;

create index if not exists idx_subscriptions_paypal_sub_id
  on public.subscriptions (paypal_subscription_id);
```

Click Run. You should see "Success. No rows returned."

### 1.3. Get your Sandbox Client ID and Secret

1. Open a new tab → go to **https://developer.paypal.com/dashboard/**
2. Log in with your PayPal business account
3. Top right, you'll see a toggle for **Sandbox** vs **Live** — make sure it's on **Sandbox**
4. Click **Apps & Credentials** in the left sidebar
5. You should see a default app already created (or click **Create App** to make one)
6. Click on the app name to open it
7. Copy the **Client ID** and **Secret** — you'll paste them in Step 1.5

### 1.4. Create the Sandbox Product and Plan

PayPal subscriptions need a Catalog Product first, then a Plan attached to it.

**Create the Product:**

1. Still in the Sandbox developer dashboard
2. Left sidebar → **Pay → Products & Plans** (or visit https://www.sandbox.paypal.com/billing/plans)
3. If you don't see that menu, log into **https://www.sandbox.paypal.com** directly (the sandbox business account, not the developer dashboard) → top nav **Pay & Get Paid → Subscriptions → Manage Subscriptions**
4. Click **Create Plan** → **Create new product first**
5. Fill in:
   - **Product name:** Mitype Subscription
   - **Type:** Service
   - **Category:** Software
6. Save the Product

**Create the Plan:**

1. After creating the Product, you'll be prompted to create a Plan
2. Fill in:
   - **Plan name:** Mitype Monthly
   - **Pricing:** Fixed price, **$5.00 USD**
   - **Billing cycle:** Every 1 month
   - **Total billing cycles:** Until canceled (no end)
   - **Trial:** Enable a free trial → Duration **30 days**, Price **$0.00**, Cycles **1**
3. Save the Plan
4. **Copy the Plan ID** — it'll look like `P-XXXXXXXXXXXXXXXXXXXXXXXX`

### 1.5. Add env vars to your local `.env.local`

In Terminal:

```bash
open -a TextEdit ~/Documents/mitypee/.env.local
```

At the bottom of the file, add:

```
PAYPAL_ENVIRONMENT=Sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<paste_your_sandbox_client_id_here>
PAYPAL_CLIENT_SECRET=<paste_your_sandbox_secret_here>
PAYPAL_PLAN_ID=<paste_the_plan_id_here>
PAYPAL_WEBHOOK_ID=will_set_in_step_1_6
```

Save with Cmd+S.

### 1.6. Create the Sandbox webhook

1. Back in the developer dashboard → Apps & Credentials → click your app
2. Scroll down to **Sandbox Webhooks** → **Add Webhook**
3. **Webhook URL:** `https://mitypeapp.com/api/webhooks/paypal`
4. **Event types:** Check all of these:
   - Billing subscription activated
   - Billing subscription cancelled
   - Billing subscription expired
   - Billing subscription payment failed
   - Billing subscription suspended
   - Billing subscription updated
   - Payment sale completed
5. Save
6. After saving, you'll see a **Webhook ID** that looks like `WH-XXXXXXXXXXXXXX-XXXXXXXX`
7. Copy it and update `PAYPAL_WEBHOOK_ID=WH-...` in your `.env.local` (replacing the placeholder from Step 1.5)
8. Save `.env.local` again

### 1.7. Add the same env vars to Vercel

1. Go to **vercel.com** → your **mitype** project → **Settings → Environment Variables**
2. Add five new variables (Production environment):

| Key | Value |
|---|---|
| `PAYPAL_ENVIRONMENT` | `Sandbox` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | (your sandbox client id) |
| `PAYPAL_CLIENT_SECRET` | (your sandbox secret) |
| `PAYPAL_PLAN_ID` | (your sandbox Plan ID) |
| `PAYPAL_WEBHOOK_ID` | (your sandbox Webhook ID) |

We're using sandbox keys in production for now — they're safe (no real money) and they let us test the live deploy before going to real money.

---

## Part 2 — Test the sandbox flow

Once Part 1 is done, test locally:

### 2.1. Switch local site to PayPal mode

In Terminal:

```bash
open -a TextEdit ~/Documents/mitypee/.env.local
```

Find this line:

```
NEXT_PUBLIC_PAYMENT_PROVIDER=stripe
```

Change to:

```
NEXT_PUBLIC_PAYMENT_PROVIDER=paypal
```

Save.

### 2.2. Start dev server

```bash
npm run dev
```

### 2.3. Test in browser

1. Open `http://localhost:3000/subscription`
2. Log in if needed
3. You should see a yellow PayPal **Subscribe** button
4. Click it → PayPal popup opens
5. Log in with a sandbox buyer account (PayPal Developer Dashboard → Testing Tools → Sandbox Accounts → use one of the buyer accounts there)
6. Approve the subscription
7. Popup closes, page should show "Welcome to Mitype!"

Verify in:
- **Supabase subscriptions table** — new row with `payment_provider = 'paypal'` and `paypal_subscription_id = 'I-XXXXXX'`
- **Sandbox PayPal dashboard** — under Subscriptions, the new active subscription should appear

### 2.4. Switch back to Stripe mode locally

Once tested, in `.env.local` flip back:

```
NEXT_PUBLIC_PAYMENT_PROVIDER=stripe
```

So your local matches your live site (which is still on Stripe).

---

## Part 3 — Going live (after sandbox testing works)

When you're ready to switch the live site from Stripe to PayPal:

1. In the PayPal Developer Dashboard, **toggle to Live** (top right)
2. Repeat steps 1.3, 1.4, 1.6 in the **Live** environment to get production Client ID, Secret, Plan ID, Webhook ID
3. In Vercel, update the five env vars with the **Live** values, and change `PAYPAL_ENVIRONMENT=Live`
4. Set `NEXT_PUBLIC_PAYMENT_PROVIDER=paypal` in Vercel
5. Redeploy from Vercel Deployments tab

Existing Stripe subscribers are unaffected — their Stripe subscriptions keep running. New users go through PayPal.

---

## Files we created/modified

**New files:**
- `app/lib/paypalClient.ts` — server-side PayPal API helper (OAuth + REST)
- `app/api/paypal/create-subscription/route.ts` — creates subscription
- `app/api/paypal/finalize-subscription/route.ts` — confirms subscription after approval
- `app/api/webhooks/paypal/route.ts` — handles subscription lifecycle webhooks
- `app/components/PayPalCheckout.tsx` — frontend PayPal button component

**Modified files:**
- `package.json` — added `@paypal/react-paypal-js`
- `app/subscription/page.tsx` — added `paypal` as a provider option

**Untouched (kept for fallback / future cleanup):**
- All Stripe code (active live)
- All Braintree code (built but unused — we can delete in a later cleanup pass)
