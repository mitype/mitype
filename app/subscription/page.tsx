'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { toast } from '../lib/toast';

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

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  if (loading) return (
    <main style={{
      minHeight: '100vh',
      background: '#faf6f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      <p style={{ color: '#c8956c', fontSize: 18 }}>Loading...</p>
    </main>
  );

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>

      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(200,149,108,0.15)',
        background: 'rgba(250,246,240,0.9)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link href="/dashboard" style={{
          fontSize: 24,
          fontWeight: 900,
          color: '#c8956c',
          letterSpacing: '-1px',
          textDecoration: 'none',
        }}>
          mitype
        </Link>
        <Link href="/dashboard" style={{
          color: '#8a7560',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
        }}>
          Back to Dashboard
        </Link>
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '64px 24px' }}>

        {isActive ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h1 style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#1a1208',
              letterSpacing: '-1px',
              marginBottom: 8,
            }}>
              You're subscribed!
            </h1>
            <p style={{ color: '#a89278', fontSize: 16, marginBottom: 40 }}>
              Status: <span style={{ color: '#c8956c', fontWeight: 700, textTransform: 'capitalize' }}>
                {subscription.status}
              </span>
            </p>
            <Link href="/discover" style={{
              display: 'block',
              padding: '16px',
              background: '#c8956c',
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
                color: '#1a1208',
                letterSpacing: '-1.5px',
                marginBottom: 12,
              }}>
                Unlock Mitype
              </h1>
              <p style={{ color: '#a89278', fontSize: 18 }}>
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
                  color: '#1a1208',
                  letterSpacing: '-2px',
                }}>
                  $5
                </span>
                <span style={{ color: '#a89278', fontSize: 18 }}>/month</span>
              </div>

              <p style={{
                color: '#c8956c',
                fontWeight: 700,
                fontSize: 16,
                textAlign: 'center',
                marginBottom: 8,
              }}>
                🎉 First month completely FREE
              </p>

              <p style={{
                color: '#a89278',
                fontSize: 13,
                textAlign: 'center',
                marginBottom: 40,
              }}>
                Card required to start · You will not be charged for 30 days
              </p>

              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 40 }}>
                {[
                  'Unlimited profile browsing',
                  'Swipe and match with anyone',
                  'Full messaging after approval',
                  'Filter by category and ZIP code',
                  'Share your public profile link',
                  'Cancel anytime — no commitment',
                ].map((item) => (
                  <li key={item} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(200,149,108,0.1)',
                    color: '#6b5744',
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
                      color: '#c8956c',
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

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                style={{
                  width: '100%',
                  padding: '17px',
                  background: checkoutLoading ? '#d4a882' : '#c8956c',
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
                color: '#b0967e',
                fontSize: 13,
              }}>
                Your card will not be charged during your 30 day free trial · Cancel anytime
              </p>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}