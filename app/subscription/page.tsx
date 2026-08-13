'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { BackButton } from '../components/BackButton';
import { SiteNav } from '../components/SiteNav';
import { PayPalCheckout } from '../components/PayPalCheckout';
import { Founders50Toggle } from '../components/Founders50Toggle';

// PayPal is the only active payment provider. The Stripe + Braintree
// checkout paths that used to live here were removed once PayPal went
// live in production — see git history if you ever need to reconstruct.

export default function SubscriptionPage() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Current profile's Founders 50 opt-in state — used to seed the toggle.
  const [foundersOptedIn, setFoundersOptedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const [subRes, profRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('founders_50_opted_in')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      setSubscription(subRes.data);
      setFoundersOptedIn(!!profRes.data?.founders_50_opted_in);
      setLoading(false);
    };
    getData();
  }, []);

  // Leave-warning: if the user arrived here as a non-subscriber and
  // tries to navigate away (via SiteNav, back arrow, or in-app link),
  // confirm they know they can't opt into Founders 50 without subscribing.
  // Bypasses when they've successfully subscribed. Uses history.pushState
  // + popstate interception rather than beforeunload because browsers
  // won't let us show a custom message on beforeunload.
  useEffect(() => {
    if (loading) return;
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    if (isActive) return; // No warning needed for subscribed users.

    // Intercept in-app back navigation.
    function onPopState() {
      const stay = window.confirm(
        "You won't be able to participate in the Founders 50 Rewards Program unless you're subscribed. Leave without subscribing?"
      );
      if (!stay) {
        // User chose "Cancel" — push a state back so they stay on this page.
        window.history.pushState(null, '', window.location.href);
        return;
      }
      // User chose "OK" — send them to dashboard.
      router.push('/dashboard');
    }
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loading, subscription, router]);

  // Called by the PayPal Buttons after a successful subscription
  // approval. Optimistically flip the page to the "subscribed" state —
  // the webhook will keep the row authoritative.
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

      <SiteNav userId={user?.id} showBack backFallbackHref="/dashboard" backForceFallback />

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

              {/* PayPal is the only payment provider. */}
              {user && (
                <PayPalCheckout
                  userId={user.id}
                  email={user.email}
                  onSuccess={handlePayPalSuccess}
                />
              )}

              {/* Founders 50 opt-in — visible to everyone, but the
                  toggle is gated to subscribed members via the DB
                  trigger and the client-side check. */}
              {user && (
                <Founders50Toggle
                  userId={user.id}
                  isSubscribed={isActive}
                  initialOptedIn={foundersOptedIn}
                />
              )}

            </div>
          </div>
        )}
      </div>
    </main>
  );
}