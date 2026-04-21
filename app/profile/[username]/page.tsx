'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = React.use(params);
  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (!profileData) {
        router.push('/discover');
        return;
      }

      setProfile(profileData);
      setLoading(false);
    };
    getData();
  }, [username]);

  function shareProfile() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendMessage() {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [currentUser.id, profile.user_id])
      .single();

    if (existing) {
      router.push('/messages');
      return;
    }

    await supabase.from('conversations').insert({
      participant_ids: [currentUser.id, profile.user_id],
      initiated_by: currentUser.id,
      status: 'pending',
    });

    await supabase.from('matches').upsert({
      user_id: currentUser.id,
      target_user_id: profile.user_id,
      direction: 'right',
    });

    router.push('/messages');
  }

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

  const isOwnProfile = currentUser?.id === profile?.user_id;

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
        <Link href="/" style={{
          fontSize: 24,
          fontWeight: 900,
          color: '#c8956c',
          letterSpacing: '-1px',
          textDecoration: 'none',
        }}>
          mitype
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          {currentUser ? (
            <>
              <Link href="/discover" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Discover</Link>
              <Link href="/dashboard" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Dashboard</Link>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Sign In</Link>
              <Link href="/signup" style={{
                background: '#c8956c',
                color: 'white',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 100,
              }}>
                Join Free
              </Link>
            </>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: 32,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
          marginBottom: 24,
        }}>
          <div style={{
            height: 100,
            background: 'linear-gradient(135deg, #e8d5c4 0%, #c8956c 100%)',
          }} />

          <div style={{ padding: '0 32px 32px' }}>
            <div style={{
              marginTop: -50,
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{
                width: 100,
                height: 125,
                borderRadius: 16,
                border: '4px solid white',
                background: '#f0e8df',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}>
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 48 }}>👤</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
                <button
                  onClick={shareProfile}
                  style={{
                    padding: '10px 20px',
                    background: 'white',
                    border: '1px solid rgba(200,149,108,0.3)',
                    borderRadius: 100,
                    color: '#8a7560',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? 'Copied!' : 'Share'}
                </button>

                {isOwnProfile ? (
                  <Link href="/edit-profile" style={{
                    padding: '10px 20px',
                    background: 'white',
                    border: '1px solid rgba(200,149,108,0.3)',
                    borderRadius: 100,
                    color: '#8a7560',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}>
                    Edit Profile
                  </Link>
                ) : currentUser ? (
                  <button
                    onClick={sendMessage}
                    style={{
                      padding: '10px 20px',
                      background: '#c8956c',
                      border: 'none',
                      borderRadius: 100,
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Message
                  </button>
                ) : (
                  <Link href="/signup" style={{
                    padding: '10px 20px',
                    background: '#c8956c',
                    borderRadius: 100,
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}>
                    Connect
                  </Link>
                )}
              </div>
            </div>

            <h1 style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#1a1208',
              letterSpacing: '-0.5px',
              marginBottom: 4,
            }}>
              @{profile.username}
            </h1>

            {profile.zip_code && (
              <p style={{ color: '#a89278', fontSize: 14, marginBottom: 16 }}>
                📍 {profile.zip_code}
              </p>
            )}

            {profile.bio && (
              <p style={{
                color: '#6b5744',
                fontSize: 15,
                lineHeight: 1.7,
                marginBottom: 20,
              }}>
                {profile.bio}
              </p>
            )}

            {profile.categories?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#a89278',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 10,
                }}>
                  Categories
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {profile.categories.map((cat: string) => (
                    <span key={cat} style={{
                      background: 'rgba(200,149,108,0.1)',
                      border: '1px solid rgba(200,149,108,0.25)',
                      color: '#c8956c',
                      padding: '6px 14px',
                      borderRadius: 100,
                      fontSize: 13,
                      fontWeight: 600,
                    }}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {!currentUser && (
          <div style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.2)',
            borderRadius: 24,
            padding: '40px',
            textAlign: 'center',
          }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#1a1208',
              marginBottom: 8,
            }}>
              Connect with @{profile.username}
            </h2>
            <p style={{ color: '#a89278', fontSize: 15, marginBottom: 24 }}>
              Join Mitype free to send a message and start connecting!
            </p>
            <Link href="/signup" style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: '#c8956c',
              color: 'white',
              borderRadius: 100,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 700,
            }}>
              Join Free
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}