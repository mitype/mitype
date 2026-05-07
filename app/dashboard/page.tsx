'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardSkeleton } from '../components/Skeleton';
import { DailySparkCard } from '../components/DailySparkCard';
import { WeeklyPromptCard } from '../components/WeeklyPromptCard';
import { Coachmark } from '../components/Coachmark';
import { ProfileCompleteness } from '../components/ProfileCompleteness';
import { ShareMitypeButton } from '../components/ShareMitypeButton';
import { UnreadBadge } from '../components/UnreadBadge';
import { useUnreadCounts } from '../lib/useUnreadCounts';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { unread } = useUnreadCounts(user?.id);

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        // No profile yet — send to create profile
        router.push('/create-profile');
        return;
      }

      setProfile(profile);
      setLoading(false);
    };
    getData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Shared link styles so desktop nav and mobile drawer stay visually consistent.
  const navLinkStyle: React.CSSProperties = {
    color: '#8a7560',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: 100,
  };
  const mobileLinkStyle: React.CSSProperties = {
    color: '#1a1208',
    textDecoration: 'none',
    fontSize: 16,
    fontWeight: 600,
    padding: '14px 16px',
    borderRadius: 12,
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      padding: '0 0 80px 0',
    }}>

      <Coachmark storageKey="mitype-coachmark-dashboard-v1" title="Welcome to Mitype">
        This is your home base. Your <strong>Daily Spark</strong> and the
        <strong> Weekly Prompt</strong> live here — explore the nav above to
        discover people, browse Spotlight, or check Messages.
      </Coachmark>

      {/* Top Nav — responsive: horizontal on desktop, hamburger drawer on mobile */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(250,246,240,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(200,149,108,0.15)',
      }}>
        <div className="mitype-dash-nav-row" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 900,
            color: '#c8956c',
            letterSpacing: '-1px',
          }}>
            mitype
          </div>

          {/* Hamburger button — visible on mobile only */}
          <button
            className="mitype-dash-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              color: '#8a7560',
              position: 'relative',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              {mobileMenuOpen ? (
                <>
                  <path d="M7 7 L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 19 L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M4 8 H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 13 H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 18 H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
            {unread.total > 0 && !mobileMenuOpen && (
              <span style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 8,
                height: 8,
                background: '#c8956c',
                borderRadius: '50%',
              }} />
            )}
          </button>

          {/* Desktop nav links — hidden on mobile */}
          <div className="mitype-dash-nav-links" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/discover" style={navLinkStyle}>Discover</Link>
            <Link href="/spotlight" style={navLinkStyle}>Spotlight</Link>
            <Link href="/weekly" style={navLinkStyle}>Weekly</Link>
            <Link href="/messages" style={{ ...navLinkStyle, display: 'inline-flex', alignItems: 'center' }}>
              Messages
              <UnreadBadge count={unread.total} />
            </Link>
            <Link href="/edit-profile" style={navLinkStyle}>Edit Profile</Link>
            <button
              onClick={handleSignOut}
              style={{
                padding: '8px 20px',
                background: 'transparent',
                border: '1px solid rgba(200,149,108,0.3)',
                borderRadius: 100,
                color: '#8a7560',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile drawer — only renders when open */}
        {mobileMenuOpen && (
          <div className="mitype-dash-mobile-drawer" style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 24px 20px',
            gap: 4,
            borderTop: '1px solid rgba(200,149,108,0.15)',
          }}>
            <Link href="/discover" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Discover</Link>
            <Link href="/spotlight" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Spotlight</Link>
            <Link href="/weekly" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Weekly</Link>
            <Link href="/messages" onClick={() => setMobileMenuOpen(false)} style={{ ...mobileLinkStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              Messages
              <UnreadBadge count={unread.total} />
            </Link>
            <Link href="/edit-profile" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Edit Profile</Link>
            <button
              onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
              style={{
                marginTop: 8,
                padding: '12px 16px',
                background: 'transparent',
                border: '1px solid rgba(200,149,108,0.35)',
                borderRadius: 12,
                color: '#8a7560',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Responsive switch between desktop nav and mobile hamburger */}
        <style>{`
          @media (max-width: 768px) {
            .mitype-dash-nav-row { padding: 16px 20px !important; }
            .mitype-dash-hamburger { display: flex !important; align-items: center; }
            .mitype-dash-nav-links { display: none !important; }
          }
        `}</style>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{
            fontSize: 40,
            fontWeight: 900,
            color: '#1a1208',
            letterSpacing: '-1px',
            marginBottom: 8,
          }}>
            Welcome back, <span style={{ color: '#c8956c' }}>@{profile?.username}</span> 👋
          </h1>
          <p style={{ color: '#a89278', fontSize: 16 }}>
            Here's what's happening on your Mitype profile.
          </p>
        </div>

        {/* Profile completeness — nudge users to fill in the gaps */}
        <ProfileCompleteness profile={profile} />

        {/* Share-with-friends invite. The link includes ?ref=username so we
            can attribute referrals later if/when a reward system goes in. */}
        <ShareMitypeButton username={profile?.username} />

        {/* Daily Spark — one hand-picked profile per day with a tailored opener */}
        {user?.id && <DailySparkCard userId={user.id} />}

        {/* Weekly Creative Prompt — community thread of the week */}
        <WeeklyPromptCard />

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 48,
        }}>
          {[
            { icon: '🔍', label: 'Discover Creators', desc: 'Browse profiles and connect with creators who share your craft', href: '/discover', color: '#fff3ec' },
            { icon: '✨', label: 'Spotlight', desc: 'Explore portfolio work from the community', href: '/spotlight', color: '#fff8ec' },
            { icon: '💬', label: 'Messages', desc: 'View your conversations', href: '/messages', color: '#f5f5ec' },
            { icon: '👤', label: 'My Profile', desc: 'See how others see you', href: `/profile/${profile?.username}`, color: '#ecf5f0' },
            { icon: '✏️', label: 'Edit Profile', desc: 'Update your info and photo', href: '/edit-profile', color: '#f0ecf5' },
            { icon: '💳', label: 'Subscription', desc: 'Manage your plan', href: '/subscription', color: '#f5ecec' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              style={{
                background: action.color,
                border: '1px solid rgba(200,149,108,0.15)',
                borderRadius: 20,
                padding: '28px 24px',
                textDecoration: 'none',
                display: 'block',
                transition: 'transform 0.15s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{action.icon}</div>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1a1208',
                marginBottom: 6,
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                {action.label}
                {action.href === '/messages' && (
                  <UnreadBadge count={unread.total} size="md" />
                )}
              </h3>
              <p style={{ color: '#a89278', fontSize: 13 }}>{action.desc}</p>
            </Link>
          ))}
        </div>

        {/* Profile summary */}
        <div style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: 24,
          padding: '32px',
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#1a1208',
            marginBottom: 20,
          }}>
            Your Profile
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <p style={{ color: '#a89278', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Username</p>
              <p style={{ color: '#1a1208', fontWeight: 700 }}>@{profile?.username}</p>
            </div>
            <div>
              <p style={{ color: '#a89278', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>ZIP Code</p>
              <p style={{ color: '#1a1208', fontWeight: 700 }}>{profile?.zip_code || 'Not set'}</p>
            </div>
            <div>
              <p style={{ color: '#a89278', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Categories</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile?.categories?.map((cat: string) => (
                  <span key={cat} style={{
                    background: 'rgba(200,149,108,0.1)',
                    border: '1px solid rgba(200,149,108,0.2)',
                    color: '#c8956c',
                    padding: '4px 12px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}