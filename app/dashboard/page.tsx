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
import { ProfileStatsCard } from '../components/ProfileStatsCard';
import { ShareMitypeButton } from '../components/ShareMitypeButton';
import { InviteSharePanel } from '../components/InviteSharePanel';
import { UnreadBadge } from '../components/UnreadBadge';
import { useUnreadCounts } from '../lib/useUnreadCounts';
import { Avatar } from '../components/Avatar';
import { SiteNav } from '../components/SiteNav';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  // True when this user has wave videos posted in the last 24h.
  // Drives the glowing bronze outline around their dashboard avatar.
  const [hasFreshWave, setHasFreshWave] = useState(false);
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

      // Check whether the user has wave videos in the last 24h so we
      // can light up the avatar as a one-tap entry to their own Wave.
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('wave_videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_removed', false)
          .gte('created_at', since);
        setHasFreshWave((count ?? 0) > 0);
      } catch {
        // Non-fatal.
      }

      setLoading(false);
    };
    getData();
  }, []);

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

      {/* Quick tip about the new universal swipe-back gesture. */}
      <Coachmark
        storageKey="mitype-coachmark-swipe-back-v1"
        title="New gesture"
        placement="bottom-right"
        delay={1800}
        duration={9000}
      >
        Swipe <strong>left</strong> on any page to go back to where you came from — works everywhere except this dashboard.
      </Coachmark>

      {/* "What's new" coachmark — drops in on the user's next login
          and fades after 10s. Bump the v suffix in the storageKey
          whenever there's a big new drop.
          v3 announces groups + rooms + 3 more games. */}
      <Coachmark
        storageKey="mitype-coachmark-games-v3"
        title="👥 Groups, rooms & 3 more games"
        placement="top"
        delay={1200}
        duration={12000}
      >
        Group chats, public rooms (browse them on Discover!), and 3 new games — Pictionary, Word Association, and Name That Quote — just landed. Mitype is officially a multi-creator playground now.
      </Coachmark>

      <SiteNav userId={user?.id} />

      {/* Main Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

        {/* Welcome — when this user has Wave videos in the last 24h,
            their avatar lights up with a bronze glow. Tapping it goes
            straight into their own Wave feed (just their videos). */}
        <div style={{
          marginBottom: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
        }}>
          {hasFreshWave ? (
            <Link
              href={`/wave?user=${encodeURIComponent(user?.id ?? '')}`}
              aria-label="Watch your Wave videos"
              style={{
                display: 'inline-block',
                padding: 4,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #c8956c 0%, #ffb37c 50%, #c8956c 100%)',
                boxShadow: '0 0 20px rgba(200,149,108,0.55)',
                animation: 'mitype-dashboard-freshwave 2.4s ease-in-out infinite',
                flexShrink: 0,
                textDecoration: 'none',
              }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '2.5px solid white',
                overflow: 'hidden',
                background: '#f0e8df',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}>
                <Avatar
                  src={profile?.avatar_url}
                  alt="Your profile photo"
                  width={64}
                  height={64}
                  fallbackFontSize={28}
                  sizes="64px"
                />
              </div>
            </Link>
          ) : (
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '3px solid white',
              overflow: 'hidden',
              background: '#f0e8df',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}>
              <Avatar
                src={profile?.avatar_url}
                alt="Your profile photo"
                width={64}
                height={64}
                fallbackFontSize={28}
                sizes="64px"
              />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{
              fontSize: 40,
              fontWeight: 900,
              color: '#1a1208',
              letterSpacing: '-1px',
              marginBottom: 8,
              marginTop: 0,
            }}>
              Welcome back, <span style={{ color: '#c8956c' }}>@{profile?.username}</span> 👋
            </h1>
            <p style={{ color: '#a89278', fontSize: 16, margin: 0 }}>
              {hasFreshWave
                ? 'Your Wave is live — tap your avatar to watch your own videos.'
                : "Here's what's happening on your Mitype profile."}
            </p>
          </div>
        </div>
        <style>{`
          @keyframes mitype-dashboard-freshwave {
            0%, 100% { box-shadow: 0 0 20px rgba(200,149,108,0.55); }
            50% { box-shadow: 0 0 32px rgba(200,149,108,0.85); }
          }
        `}</style>

        {/* Profile completeness — nudge users to fill in the gaps */}
        <ProfileCompleteness profile={profile} />

        {/* Quick stats — your week at a glance */}
        <ProfileStatsCard userId={user?.id} />

        {/* Share-with-friends invite — opens the multi-platform share panel. */}
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #fff3ec 0%, #ffe1c8 100%)',
            border: '1.5px solid rgba(200,149,108,0.35)',
            borderRadius: 20,
            padding: '20px 24px',
            marginBottom: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            textAlign: 'left',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(200,149,108,0.12)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #c8956c 0%, #a07452 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            💌
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#1a1208', fontSize: 15, fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.2px' }}>
              Invite a creative friend
            </p>
            <p style={{ color: '#8a7560', fontSize: 13, margin: 0, lineHeight: 1.4 }}>
              Share to Instagram, TikTok, Snapchat, X, Facebook, Threads, or text.
            </p>
          </div>
          <div aria-hidden="true" style={{ color: '#c8956c', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
            →
          </div>
        </button>

        {profile?.username && (
          <InviteSharePanel
            username={profile.username}
            open={shareOpen}
            onClose={() => setShareOpen(false)}
          />
        )}

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
            { icon: '🌊', label: 'The Wave Feed', desc: 'Jump straight into the scrolling feed — watch, like, and post your own', href: '/wave', color: '#ecf0f5' },
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