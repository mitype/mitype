'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      alert('Passwords do not match!');
      return;
    }
    if (password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
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

      {done ? (
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
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#1a1208',
            marginBottom: 12,
          }}>
            Password updated!
          </h1>
          <p style={{ color: '#a89278', fontSize: 15 }}>
            Your password has been successfully updated. Redirecting you to login...
          </p>
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
            Create new password
          </h1>
          <p style={{
            color: '#a89278',
            fontSize: 15,
            marginBottom: 36,
          }}>
            Enter your new password below.
          </p>

          <form onSubmit={handleUpdate}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#6b5744',
                marginBottom: 8,
              }}>
                New Password
              </label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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

            <div style={{ marginBottom: 32 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#6b5744',
                marginBottom: 8,
              }}>
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <p style={{
              textAlign: 'center',
              color: '#a89278',
              fontSize: 14,
            }}>
              <Link href="/login" style={{
                color: '#c8956c',
                fontWeight: 700,
                textDecoration: 'none',
              }}>
                Back to Login
              </Link>
            </p>
          </form>
        </div>
      )}
    </main>
  );
}