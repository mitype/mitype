'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { toast } from '../lib/toast';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    router.push('/dashboard');
  };

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

      {/* Card */}
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
          Create your account
        </h1>
        <p style={{
          color: '#a89278',
          fontSize: 15,
          marginBottom: 36,
        }}>
          First month completely free 🎉
        </p>

        <form onSubmit={handleSignup}>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
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

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#6b5744',
              marginBottom: 8,
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Confirm Password */}
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#6b5744',
              marginBottom: 8,
            }}>
              Confirm password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

          {/* Terms */}
          <p style={{
            color: '#a89278',
            fontSize: 12,
            marginBottom: 24,
            lineHeight: 1.6,
          }}>
            By signing up you agree to our{' '}
            <Link href="/legal/terms" style={{ color: '#c8956c', textDecoration: 'none', fontWeight: 600 }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" style={{ color: '#c8956c', textDecoration: 'none', fontWeight: 600 }}>
              Privacy Policy
            </Link>
            . You must be 18 or older to use Mitype.
          </p>

          {/* Submit */}
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
            {loading ? 'Creating account...' : 'Create Free Account'}
          </button>

          {/* Login link */}
          <p style={{
            textAlign: 'center',
            color: '#a89278',
            fontSize: 14,
          }}>
            Already have an account?{' '}
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

      {/* Footer links */}
      <div style={{
        marginTop: 32,
        display: 'flex',
        gap: 24,
        fontSize: 13,
      }}>
        <Link href="/legal/privacy" style={{ color: '#c4aa90', textDecoration: 'none' }}>Privacy</Link>
        <Link href="/legal/terms" style={{ color: '#c4aa90', textDecoration: 'none' }}>Terms</Link>
        <Link href="/legal/contact" style={{ color: '#c4aa90', textDecoration: 'none' }}>Support</Link>
      </div>

    </main>
  );
}