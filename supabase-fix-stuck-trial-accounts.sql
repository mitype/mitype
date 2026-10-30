-- ============================================================
-- Fix accounts stuck permanently on "trialing" with no real payment
-- ============================================================
-- Root cause: these accounts were created back when Mitype used a
-- different payment processor (Stripe) before the switch to PayPal.
-- That old integration's code has since been removed from the app,
-- but a handful of accounts were left sitting with
-- subscriptions.status = 'trialing' from that old system. Nothing in
-- today's app is capable of writing or advancing that value anymore
-- (PayPal never produces the literal status "trialing"), so any row
-- still sitting at 'trialing' is permanently stuck there and getting
-- full access with no active payment behind it.
--
-- Run STEP 1 first and look at the results. Once you're satisfied
-- this is exactly who you expected (the users you saw in the admin
-- "TRIAL" pills), run STEP 2 to fix them.
-- ============================================================

-- ---------- STEP 1: see who is affected, review before changing anything --
select
  p.username,
  p.user_id,
  p.created_at as joined_at,
  s.status,
  s.payment_provider,
  s.stripe_subscription_id,
  s.paypal_subscription_id
from public.subscriptions s
join public.profiles p on p.user_id = s.user_id
where s.status = 'trialing'
order by p.created_at asc;

-- ---------- STEP 2: cut off their access, send them back to the paywall --
-- Sets status to 'canceled', the same value the app already uses
-- everywhere else for "not subscribed." On their next page load they
-- will be redirected to /subscription like any other unsubscribed
-- user. This does not delete their account or their data, only their
-- access.
update public.subscriptions
set status = 'canceled'
where status = 'trialing';
