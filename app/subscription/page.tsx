'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { toast } from '../lib/toast';
import { BackButton } from '../components/BackButton';
import { SiteNav } from '../components/SiteNav';
import { BraintreeCheckout } from '../components/BraintreeCheckout';
import { PayPalCheckout } from '../components/PayPalCheckout';

// Switch the active payment provider via env var.
//
//   NEXT_PUBLIC_PAYMENT_PROVIDER=stripe    → Stripe Checkout (legacy)
//   NEXT_PUBLIC_PAYMENT_PROVIDER=braintree → Braintree Drop-in (built but unused)
//   NEXT_PUBLIC_PAYMENT_PROVIDER=paypal    → PayPal Subscriptions (active path)
//
// Default is 'stripe' so existing flow keeps working until PayPal
// production credentials are wired up and we flip the switch.
const PAYMENT_PROVIDER =
  (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? 'stripe').toLowerCase();

export default function SubscriptionPage() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setSubscription(sub);
      setLoading(false);
    };
    getData();
  }, []);

  async function handleCheckout() {
    if (!user) return;
    setCheckoutLoading(true);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong. Please try again.');
      setCheckoutLoading(false);
    }
  }

  // Called by the Braintree Drop-in after a successful subscription
  // create. Optimistically flip the page to the "subscribed" state —
  // the webhook will keep the row authoritative.
  function handleBraintreeSuccess() {
    setSubscription({ ...(subscription ?? {}), status: 'active' });
  }

  // Same idea, called by the PayPal Buttons after a successful
  // subscription approval.
  function handlePayPalSuccess() {
    setSubscription({ ...(subscription ?? {}), status: 'active' });
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  if (loading) return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--brand-personal-bg-cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      <p style={{ color: 'var(--brand-personal)', fontSize: 18 }}>Loading...</p>
    </main>
  );

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>

      <SiteNav userId={user?.id} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '64px 24px' }}>

        {isActive ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h1 style={{
              fontSize: 36,
              fontWeight: 800,
              color: 'var(--brand-text-primary)',
              letterSpacing: '-1px',
              marginBottom: 8,
            }}>
              You're subscribed!
            </h1>
            <p style={{ color: 'var(--brand-personal-text-light)', fontSize: 16, marginBottom: 40 }}>
              Status: <span style={{ color: 'var(--brand-personal)', fontWeight: 700, textTransform: 'capitalize' }}>
                {subscription.status}
              </span>
            </p>
            <Link href="/discover" style={{
              display: 'block',
              padding: '16px',
              background: 'var(--brand-personal)',
              color: 'white',
              borderRadius: 100,
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 700,
              textAlign: 'center',
            }}>
              Start Discovering People
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h1 style={{
                fontSize: 44,
                fontWeight: 900,
                color: 'var(--brand-text-primary)',
                letterSpacing: '-1.5px',
                marginBottom: 12,
              }}>
                Unlock Mitype
              </h1>
              <p style={{ color: 'var(--brand-personal-text-light)', fontSize: 18 }}>
                Start connecting with creatives today
              </p>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid rgba(200,149,108,0.25)',
              borderRadius: 32,
              padding: '48px 40px',
              boxShadow: '0 20px 60px rgba(200,149,108,0.1)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 4,
                marginBottom: 6,
              }}>
                <span style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: 'var(--brand-text-primary)',
                  letterSpacing: '-2px',
                }}>
                  $5
                </span>
                <span style={{ color: 'var(--brand-personal-text-light)', fontSize: 18 }}>/month</span>
              </div>

              <p style={{
                color: 'var(--brand-personal)',
                fontWeight: 700,
                fontSize: 16,
                textAlign: 'center',
                marginBottom: 8,
              }}>
                🎉 First month completely FREE
              </p>

              <p style={{
                color: 'var(--brand-personal-text-light)',
                fontSize: 13,
                textAlign: 'center',
                marginBottom: 40,
              }}>
                Card required to start · You will not be charged for 30 days
              </p>

              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 40 }}>
                {[
                  'Unlimited profile browsing',
                  'Connect with any creator on the platform',
                  'Full messaging after approval',
                  'Filter by category and ZIP code',
                  'Share your public profile link',
                  'Cancel anytime. No commitment',
                ].map((item) => (
                  <li key={item} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(200,149,108,0.1)',
                    color: 'var(--brand-personal-text-head)',
                    fontSize: 15,
                  }}>
                    <span style={{
                      width: 24,
                      height: 24,
                      background: 'rgba(200,149,108,0.15)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-personal)',
                      fontSize: 13,
                      flexShrink: 0,
                      fontWeight: 700,
                    }}>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* Conditional checkout: PayPal Subscriptions, Braintree
                  Drop-in, or Stripe Checkout redirect (legacy). Switch
                  via the NEXT_PUBLIC_PAYMENT_PROVIDER env var. */}
              {PAYMENT_PROVIDER === 'paypal' && user ? (
                <PayPalCheckout
                  userId={user.id}
                  email={user.email}
                  onSuccess={handlePayPalSuccess}
                />
              ) : PAYMENT_PROVIDER === 'braintree' && user ? (
                <BraintreeCheckout
                  userId={user.id}
                  email={user.email}
                  onSuccess={handleBraintreeSuccess}
                />
              ) : (
                <>
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    style={{
                      width: '100%',
                      padding: '17px',
                      background: checkoutLoading ? 'var(--brand-personal-disabled)' : 'var(--brand-personal)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 100,
                      fontSize: 17,
                      fontWeight: 700,
                      cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
                      marginBottom: 16,
                    }}
                  >
                    {checkoutLoading ? 'Redirecting...' : 'Start Now'}
                  </button>

                  <p style={{
                    textAlign: 'center',
                    color: 'var(--brand-personal-text-lighter)',
                    fontSize: 13,
                  }}>
                    Your card will not be charged during your 30 day free trial · Cancel anytime
                  </p>
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </main>
  );
}