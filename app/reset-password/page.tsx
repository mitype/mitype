'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      alert(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 40 }}>
        <div style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#c8956c',
          letterSpacing: '-1px',
        }}>
          mitype
        </div>
      </Link>

      {sent ? (
        <div style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: 28,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(200,149,108,0.1)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#1a1208',
            marginBottom: 12,
          }}>
            Check your email!
          </h1>
          <p style={{ color: '#a89278', fontSize: 15, marginBottom: 8 }}>
            We sent a password reset link to:
          </p>
          <p style={{ color: '#c8956c', fontWeight: 700, fontSize: 15, marginBottom: 32 }}>
            {email}
          </p>
          <p style={{ color: '#a89278', fontSize: 13, marginBottom: 32 }}>
            Click the link in the email to reset your password. Check your spam folder if you don't see it.
          </p>
          <Link href="/login" style={{
            display: 'inline-block',
            padding: '12px 32px',
            background: '#c8956c',
            color: 'white',
            borderRadius: 100,
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 700,
          }}>
            Back to Login
          </Link>
        </div>
      ) : (
        <div style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: 28,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(200,149,108,0.1)',
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#1a1208',
            marginBottom: 8,
            letterSpacing: '-0.5px',
          }}>
            Reset your password
          </h1>
          <p style={{
            color: '#a89278',
            fontSize: 15,
            marginBottom: 36,
          }}>
            Enter your email and we'll send you a reset link.
          </p>

          <form onSubmit={handleReset}>
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#6b5744',
                marginBottom: 8,
              }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(200,149,108,0.25)',
                  background: '#faf6f0',
                  fontSize: 15,
                  color: '#1a1208',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                background: loading ? '#d4a882' : '#c8956c',
                color: 'white',
                border: 'none',
                borderRadius: 100,
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
                marginBottom: 24,
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <p style={{
              textAlign: 'center',
              color: '#a89278',
              fontSize: 14,
            }}>
              Remember your password?{' '}
              <Link href="/login" style={{
                color: '#c8956c',
                fontWeight: 700,
                textDecoration: 'none',
              }}>
                Sign in
              </Link>
            </p>
          </form>
        </div>
      )}
    </main>
  );
}