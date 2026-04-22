'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { calculateCompatibility, getCompatibilityColor, getCompatibilityLabel, getSharedCategories } from '../../lib/utils';

type PublicProfile = {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  categories?: string[] | null;
  zip_code?: string | null;
  bio?: string | null;
  website_url?: string | null;
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = React.use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myCategories, setMyCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const getData = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) {
          console.error(authError);
        }
        if (cancelled) return;
        setCurrentUser(user);

        if (user) {
          const { data: myProfile, error: myProfileError } = await supabase
            .from('profiles')
            .select('categories')
            .eq('user_id', user.id)
            .maybeSingle();
          if (myProfileError) {
            console.error(myProfileError);
          }
          if (cancelled) return;
          if (myProfile?.categories) {
            setMyCategories(myProfile.categories);
          }
        } else {
          setMyCategories([]);
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        if (cancelled) return;
        if (profileError) {
          console.error(profileError);
          return;
        }
        if (!profileData) {
          router.push('/discover');
          return;
        }
        setProfile(profileData as PublicProfile);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    getData();
    return () => {
      cancelled = true;
    };
  }, [username, router]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  function shareProfile() {
    const url = window.location.href;
    void (async () => {
      try {
        await navigator.clipboard.writeText(url);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        setCopied(true);
        copyTimeoutRef.current = setTimeout(() => {
          setCopied(false);
          copyTimeoutRef.current = null;
        }, 2000);
      } catch {
        window.alert("Couldn't copy the link. Try selecting the address bar and copying it manually.");
      }
    })();
  }

  async function sendMessage() {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!profile) {
      return;
    }

    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [currentUser.id, profile.user_id])
      .maybeSingle();

    if (findError) {
      console.error(findError);
      window.alert('Could not start a conversation. Please try again.');
      return;
    }

    if (existing) {
      router.push('/messages');
      return;
    }

    const { error: insertError } = await supabase.from('conversations').insert({
      participant_ids: [currentUser.id, profile.user_id],
      initiated_by: currentUser.id,
      status: 'pending',
    });

    if (insertError) {
      console.error(insertError);
      window.alert('Could not start a conversation. Please try again.');
      return;
    }

    const { error: upsertError } = await supabase.from('matches').upsert({
      user_id: currentUser.id,
      target_user_id: profile.user_id,
      direction: 'right',
    });

    if (upsertError) {
      console.error(upsertError);
      window.alert('Conversation was created, but we could not update your match. You can still open messages.');
    }

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
      <p style={{ color: '#c8956c', fontSize: 18 }}>Loading profile...</p>
    </main>
  );

  if (!profile) {
    return (
      <main style={{
        minHeight: '100vh',
        background: '#faf6f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        padding: 24,
        textAlign: 'center',
      }}>
        <p style={{ color: '#8a7560', fontSize: 16 }}>We couldn&apos;t load this profile.</p>
        <Link href="/discover" style={{ color: '#c8956c', fontWeight: 600 }}>
          Back to Discover
        </Link>
      </main>
    );
  }

  const isOwnProfile = currentUser?.id === profile.user_id;
  const score = !isOwnProfile && myCategories.length > 0
    ? calculateCompatibility(myCategories, profile.categories ?? [])
    : 0;
  const scoreColor = getCompatibilityColor(score);
  const scoreLabel = getCompatibilityLabel(score);
  const sharedCats = getSharedCategories(myCategories, profile.categories ?? []);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>

      {/* Nav */}
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
              <Link href="/discover" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                Discover
              </Link>
              <Link href="/dashboard" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                Sign In
              </Link>
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

        {/* Profile Card */}
        <div style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: 32,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
          marginBottom: 24,
        }}>

          {/* Banner */}
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

              {/* Avatar */}
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

              {/* Action Buttons */}
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

            {/* Username */}
            <h1 style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#1a1208',
              letterSpacing: '-0.5px',
              marginBottom: 4,
            }}>
              @{profile.username}
            </h1>

            {/* ZIP */}
            {profile.zip_code && (
              <p style={{ color: '#a89278', fontSize: 14, marginBottom: 16 }}>
                📍 {profile.zip_code}
              </p>
            )}

            {/* Bio */}
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

            {/* Categories */}
            {(profile.categories?.length ?? 0) > 0 && (
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
                  {(profile.categories ?? []).map((cat: string) => (
                    <span key={cat} style={{
                      background: sharedCats.includes(cat)
                        ? 'rgba(34,197,94,0.1)'
                        : 'rgba(200,149,108,0.1)',
                      border: sharedCats.includes(cat)
                        ? '1px solid rgba(34,197,94,0.3)'
                        : '1px solid rgba(200,149,108,0.25)',
                      color: sharedCats.includes(cat) ? '#16a34a' : '#c8956c',
                      padding: '6px 14px',
                      borderRadius: 100,
                      fontSize: 13,
                      fontWeight: 600,
                    }}>
                      {sharedCats.includes(cat) ? '✓ ' : ''}{cat}
                    </span>
                  ))}
                </div>
                {sharedCats.length > 0 && (
                  <p style={{ color: '#16a34a', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                    Green = shared interest with you
                  </p>
                )}
              </div>
            )}

            {/* Website */}
            {profile.website_url && (
              <div>
                <p style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#a89278',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 10,
                }}>
                  Website
                </p>
                <a
                  href={
                    profile.website_url.startsWith('http://') ||
                    profile.website_url.startsWith('https://')
                      ? profile.website_url
                      : `https://${profile.website_url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#c8956c',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {profile.website_url}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Compatibility Score Card */}
        {!isOwnProfile && currentUser && score > 0 && (
          <div style={{
            background: 'white',
            border: `1px solid ${scoreColor}40`,
            borderRadius: 24,
            padding: '28px 32px',
            marginBottom: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: sharedCats.length > 0 ? 20 : 0,
            }}>
              <div>
                <p style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#a89278',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 4,
                }}>
                  Your Compatibility
                </p>
                <h2 style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: scoreColor,
                  letterSpacing: '-0.5px',
                }}>
                  {score}% Match
                </h2>
                <p style={{ color: '#a89278', fontSize: 14, fontWeight: 600 }}>
                  {scoreLabel}
                </p>
              </div>

              {/* Score Circle */}
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: `${scoreColor}15`,
                border: `3px solid ${scoreColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: scoreColor,
                }}>
                  {score}%
                </span>
              </div>
            </div>

            {/* Shared Categories */}
            {sharedCats.length > 0 && (
              <div>
                <p style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#a89278',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 10,
                }}>
                  You both love
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sharedCats.map((cat) => (
                    <span key={cat} style={{
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#16a34a',
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
        )}

        {/* Not logged in CTA */}
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
              Join Mitype free to see your compatibility score and send a message!
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