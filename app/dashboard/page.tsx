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
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      padding: '0 0 80px 0',
    }}>

      <Coachmark storageKey="mitype-coachmark-dashboard-v1" title="Welcome to Mitype">
        This is your home base. Your <strong>Daily Spark</strong> and the
        <strong> Weekly Prompt</strong> live here. Explore the nav above to
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
        Swipe <strong>left</strong> on any page to go back to where you came from. Works everywhere except this dashboard.
      </Coachmark>

      {/* "What's new" coachmark — drops in on the user's next login
          and fades after 10s. Bump the v suffix in the storageKey
          whenever there's a big new drop.
          v3 announces groups + rooms + 3 more games. */}
      <Coachmark
        storageKey="mitype-coachmark-homegoods-v1"
        title="🏡 Mi Home Goods is here"
        placement="top"
        delay={1200}
        duration={12000}
      >
        Buy and sell directly with your Mitype community. Furniture, electronics, vintage finds, free stuff. Open the menu and tap Mi Home Goods to browse or list anything.
      </Coachmark>

      <SiteNav userId={user?.id} />

      {/* Main Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Welcome — when this user has Wave videos in the last 24h,
            their avatar lights up with a bronze glow. Tapping it goes
            straight into their own Wave feed (just their videos). */}
        <div style={{
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
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
                background: 'linear-gradient(135deg, var(--brand-personal) 0%, var(--brand-personal-light) 50%, var(--brand-personal) 100%)',
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
                background: 'var(--brand-personal-bg-pale)',
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
              background: 'var(--brand-personal-bg-pale)',
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
              fontSize: 30,
              fontWeight: 900,
              color: 'var(--brand-text-primary)',
              letterSpacing: '-0.8px',
              marginBottom: 4,
              marginTop: 0,
              lineHeight: 1.15,
            }}>
              Welcome back, <span style={{ color: 'var(--brand-personal)' }}>@{profile?.username}</span>
            </h1>
            <p style={{ color: 'var(--brand-personal-text-light)', fontSize: 14, margin: 0, lineHeight: 1.45 }}>
              {hasFreshWave
                ? 'Your Wave is live. Tap your avatar to watch your own videos.'
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
            background: 'linear-gradient(135deg, var(--brand-personal-bg-peach) 0%, #ffe1c8 100%)',
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
              background: 'linear-gradient(135deg, var(--brand-personal) 0%, #a07452 100%)',
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
            <p style={{ color: 'var(--brand-text-primary)', fontSize: 15, fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.2px' }}>
              Invite a creative friend
            </p>
            <p style={{ color: 'var(--brand-personal-text-mid)', fontSize: 13, margin: 0, lineHeight: 1.4 }}>
              Share to Instagram, TikTok, Snapchat, X, Facebook, Threads, or text.
            </p>
          </div>
          <div aria-hidden="true" style={{ color: 'var(--brand-personal)', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
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

        {/* Quick actions — grouped into two quiet sections so the
            surface area feels organized without hiding anything. Cards
            are slim: no emoji, a 3px brand-accent stripe on the left
            indicates which family the destination belongs to (bronze
            personal, purple business, green Mi Home Goods, slate
            account). Tighter padding + smaller minmax lets more cards
            fit per row on every breakpoint. */}
        {(() => {
          // Map of href → display config. Keeping this as a single source
          // of truth means we can re-order or reshuffle sections cheaply.
          type ActionTone = 'personal' | 'business' | 'market' | 'account';
          const explore: Array<{
            label: string; desc: string; href: string; tone: ActionTone;
          }> = [
            { label: 'The Wave Feed',     desc: 'Scrolling video feed. Watch, like, and post your own.', href: '/wave',         tone: 'personal' },
            { label: 'Discover Creators', desc: 'Browse profiles and connect by craft and city.',         href: '/discover',     tone: 'personal' },
            { label: 'Spotlight',         desc: 'Portfolio work from the community.',                     href: '/spotlight',    tone: 'personal' },
            { label: 'Messages',          desc: 'Your conversations, groups, and rooms.',                 href: '/messages',     tone: 'personal' },
            { label: 'Mi Home Goods',     desc: 'Buy and sell with your Mitype community.',               href: '/home-goods',   tone: 'market'   },
            { label: 'Small Businesses',  desc: 'Discover small businesses on Mitype.',                   href: '/businesses',   tone: 'business' },
          ];
          const account: Array<{
            label: string; desc: string; href: string; tone: ActionTone;
          }> = [
            { label: 'My Profile',    desc: 'See how others see you.',           href: `/profile/${profile?.username}`, tone: 'account' },
            { label: 'Edit Profile',  desc: 'Update info, photos, and prompts.', href: '/edit-profile',                  tone: 'account' },
            { label: 'Subscription',  desc: 'Manage your plan.',                 href: '/subscription',                  tone: 'account' },
          ];

          const ACCENT: Record<ActionTone, string> = {
            personal: 'var(--brand-personal)',
            business: 'var(--brand-business)',
            market:   'var(--brand-market)',
            account:  'var(--brand-personal-text-light)',
          };
          const BORDER: Record<ActionTone, string> = {
            personal: 'rgba(200,149,108,0.22)',
            business: 'rgba(139,92,246,0.22)',
            market:   'rgba(21,128,61,0.22)',
            account:  'rgba(168,146,120,0.22)',
          };

          function ActionCard({ a }: { a: { label: string; desc: string; href: string; tone: ActionTone } }) {
            return (
              <Link
                href={a.href}
                style={{
                  background: 'white',
                  border: `1px solid ${BORDER[a.tone]}`,
                  borderRadius: 14,
                  padding: '14px 16px 14px 18px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'transform 0.12s, box-shadow 0.12s',
                }}
              >
                {/* Left brand-accent stripe — replaces the icon */}
                <span aria-hidden="true" style={{
                  position: 'absolute',
                  left: 0, top: 14, bottom: 14,
                  width: 3,
                  borderRadius: 2,
                  background: ACCENT[a.tone],
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--brand-text-primary)',
                    margin: 0,
                    letterSpacing: '-0.2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1.2,
                  }}>
                    {a.label}
                    {a.href === '/messages' && (
                      <UnreadBadge count={unread.total} size="md" />
                    )}
                  </h3>
                  <p style={{
                    color: 'var(--brand-personal-text-light)',
                    fontSize: 12,
                    margin: '3px 0 0',
                    lineHeight: 1.35,
                  }}>
                    {a.desc}
                  </p>
                </div>
                <span aria-hidden="true" style={{
                  color: ACCENT[a.tone], fontSize: 18, fontWeight: 800, flexShrink: 0,
                }}>
                  ›
                </span>
              </Link>
            );
          }

          function SectionLabel({ children }: { children: React.ReactNode }) {
            return (
              <p style={{
                margin: '0 0 10px',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--brand-personal-text-light)',
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
              }}>
                {children}
              </p>
            );
          }

          const grid: React.CSSProperties = {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 10,
          };

          return (
            <>
              <div style={{ marginBottom: 28 }}>
                <SectionLabel>Explore Mitype</SectionLabel>
                <div style={grid}>
                  {explore.map((a) => <ActionCard key={a.href} a={a} />)}
                </div>
              </div>
              <div style={{ marginBottom: 36 }}>
                <SectionLabel>Account</SectionLabel>
                <div style={grid}>
                  {account.map((a) => <ActionCard key={a.href} a={a} />)}
                </div>
              </div>
            </>
          );
        })()}

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
            color: 'var(--brand-text-primary)',
            marginBottom: 20,
          }}>
            Your Profile
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <p style={{ color: 'var(--brand-personal-text-light)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Username</p>
              <p style={{ color: 'var(--brand-text-primary)', fontWeight: 700 }}>@{profile?.username}</p>
            </div>
            <div>
              <p style={{ color: 'var(--brand-personal-text-light)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>ZIP Code</p>
              <p style={{ color: 'var(--brand-text-primary)', fontWeight: 700 }}>{profile?.zip_code || 'Not set'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--brand-personal-text-light)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Categories</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile?.categories?.map((cat: string) => (
                  <span key={cat} style={{
                    background: 'rgba(200,149,108,0.1)',
                    border: '1px solid rgba(200,149,108,0.2)',
                    color: 'var(--brand-personal)',
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