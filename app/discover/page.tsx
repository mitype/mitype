'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { calculateCompatibility, getCompatibilityColor, getSharedCategories } from '../lib/utils';
import { Avatar } from '../components/Avatar';
import { Coachmark } from '../components/Coachmark';
import { DiscoverSkeleton } from '../components/Skeleton';
import { OnlineDot } from '../components/OnlineDot';
import { sanitizeText } from '../lib/sanitize';
import { calculateAge } from '../lib/age';
import { usePresence } from '../lib/usePresence';
import { ALL_CATEGORIES } from '../lib/categories';
import { BackButton } from '../components/BackButton';
import { WaveStoryRing } from '../components/WaveStoryRing';
import { BUSINESS_CATEGORIES } from '../lib/businessCategories';

// Get 3 random spotlight profiles that rotate daily
function getSpotlightProfiles(profiles: any[]): any[] {
  if (profiles.length === 0) return [];
  const today = new Date().toDateString();
  const seed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const shuffled = [...profiles].sort((a, b) => {
    const hashA = (seed + a.user_id.charCodeAt(0)) % profiles.length;
    const hashB = (seed + b.user_id.charCodeAt(0)) % profiles.length;
    return hashA - hashB;
  });
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

export default function DiscoverPage() {
  const [user, setUser] = useState<any>(null);
  const [myCategories, setMyCategories] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [spotlightProfiles, setSpotlightProfiles] = useState<any[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [zipFilter, setZipFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Set of user_ids that have posted a Wave video in the last 24h.
  // Drives the bronze "fresh wave" story ring on profile avatars.
  const [freshWaveCreators, setFreshWaveCreators] = useState<Set<string>>(new Set());
  // The viewer's own zip code; used by the local-business tab to scope
  // the listings.
  const [myZip, setMyZip] = useState<string>('');
  // Local-business listings (in the viewer's zip code).
  const [localBusinesses, setLocalBusinesses] = useState<any[]>([]);
  const [bizCategoryFilter, setBizCategoryFilter] = useState<string>('');
  // True when the local-business tab is expanded.
  const [showBusinessTab, setShowBusinessTab] = useState(false);
  // Daily-rotating featured business (everyone sees the same one today).
  const [dailyBusinessSpotlight, setDailyBusinessSpotlight] = useState<any | null>(null);
  // The category that has actually been applied (separate from the
  // typed/picked-but-not-yet-applied `categoryFilter`). When this is set,
  // we also fetch a Wave-Feed preview scoped to the same category so it
  // can be surfaced at the top of the filtered results.
  const [appliedCategory, setAppliedCategory] = useState<string>('');
  const [waveCategoryPreview, setWaveCategoryPreview] = useState<{
    id: string;
    videoUrl: string;
    creator: { username: string; avatarUrl: string | null } | null;
    count: number;
  } | null>(null);
  const router = useRouter();
  const onlineUsers = usePresence();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();

      const isSubscribed = sub?.status === 'active' || sub?.status === 'trialing';
      if (!isSubscribed) {
        router.push('/subscription');
        return;
      }

      // Get current user's profile and categories
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('categories, zip_code')
        .eq('user_id', user.id)
        .single();

      if (myProfile?.categories) {
        setMyCategories(myProfile.categories);
      }
      if (myProfile?.zip_code) {
        setMyZip(myProfile.zip_code);
      }

      // Get already swiped profiles
      const { data: matches } = await supabase
        .from('matches')
        .select('target_user_id')
        .eq('user_id', user.id);

      const swiped = matches?.map((m: any) => m.target_user_id) ?? [];

      // Fetch all profiles except own
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      const allProfiles = profileData ?? [];

      // Get spotlight profiles from ALL profiles (including swiped)
      const spotlight = getSpotlightProfiles(allProfiles);
      setSpotlightProfiles(spotlight);

      // Filter out swiped for main grid
      const filtered = allProfiles.filter(
        (p: any) => !swiped.includes(p.user_id)
      );

      // Sort by compatibility score highest first
      const sorted = filtered.sort((a: any, b: any) => {
        const scoreA = calculateCompatibility(myProfile?.categories ?? [], a.categories ?? []);
        const scoreB = calculateCompatibility(myProfile?.categories ?? [], b.categories ?? []);
        return scoreB - scoreA;
      });

      setProfiles(sorted);
      setFilteredProfiles(sorted);

      // Local business listings — scoped to the viewer's zip code.
      // Also load the daily-rotating business spotlight. Two-step:
      // fetch businesses, then map owner_user_id → username.
      try {
        const { data: allPublishedBiz } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('is_published', true);
        if (allPublishedBiz && allPublishedBiz.length > 0) {
          const ownerIds = Array.from(
            new Set(allPublishedBiz.map((b: any) => b.user_id))
          );
          const { data: ownerProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', ownerIds);
          const ownerMap = new Map<string, any>(
            (ownerProfiles ?? []).map((p: any) => [p.user_id, p])
          );
          const enriched = allPublishedBiz.map((b: any) => ({
            ...b,
            owner: ownerMap.get(b.user_id) ?? null,
          }));

          if (myProfile?.zip_code) {
            const local = enriched.filter((b: any) => b.zip_code === myProfile.zip_code);
            setLocalBusinesses(local);
          }
          // Deterministic daily rotation seeded by today's date — all
          // viewers see the same featured business each day.
          const todaySeed = new Date().toDateString()
            .split('')
            .reduce((a, c) => a + c.charCodeAt(0), 0);
          const idx = todaySeed % enriched.length;
          setDailyBusinessSpotlight(enriched[idx]);
        }
      } catch (e) {
        console.warn('[discover] business load failed:', e);
      }

      // Fresh-wave story-ring: figure out which of these creators has
      // posted a Wave video in the last 24h. One round-trip — only the
      // user_id column, no joins.
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: freshWaves } = await supabase
          .from('wave_videos')
          .select('user_id')
          .eq('is_removed', false)
          .gte('created_at', since);
        if (freshWaves) {
          const ids = new Set<string>(freshWaves.map((w: any) => w.user_id));
          setFreshWaveCreators(ids);
        }
      } catch {
        // Non-fatal — rings just won't appear this session.
      }

      setLoading(false);
    };
    getData();
  }, []);

  function applyFilters() {
    let results = profiles;
    if (categoryFilter) {
      results = results.filter((p) =>
        p.categories?.some((c: string) =>
          c.toLowerCase().includes(categoryFilter.toLowerCase())
        )
      );
    }
    if (zipFilter) {
      results = results.filter((p) => p.zip_code === zipFilter);
    }
    setFilteredProfiles(results);
    setAppliedCategory(categoryFilter);
    // If the filter picks a specific category, also fetch a Wave-Feed
    // preview scoped to that category so we can surface a "scroll the
    // wave for this category" banner at the top of the results.
    if (categoryFilter) {
      fetchWavePreview(categoryFilter);
    } else {
      setWaveCategoryPreview(null);
    }
  }

  function clearFilters() {
    setCategoryFilter('');
    setZipFilter('');
    setFilteredProfiles(profiles);
    setAppliedCategory('');
    setWaveCategoryPreview(null);
  }

  // Fetch a one-video preview from the Wave feed scoped to a specific
  // category. The category filter on the discover page is fuzzy
  // (`includes`), so we try each ALL_CATEGORIES entry that matches the
  // typed text against the feed API (which uses an exact match) and use
  // the first one that returns videos. Most of the time this is a single
  // round-trip; worst case it's a handful.
  async function fetchWavePreview(filterText: string) {
    setWaveCategoryPreview(null);
    const matches = ALL_CATEGORIES.filter((c) =>
      c.toLowerCase().includes(filterText.toLowerCase())
    );
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    for (const cat of matches) {
      try {
        const res = await fetch(
          `/api/wave/feed?category=${encodeURIComponent(cat)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) continue;
        const json = await res.json();
        const items = json.items ?? [];
        if (items.length > 0) {
          const first = items[0];
          setWaveCategoryPreview({
            id: first.id,
            videoUrl: first.videoUrl,
            creator: first.creator
              ? { username: first.creator.username, avatarUrl: first.creator.avatarUrl }
              : null,
            count: items.length,
          });
          return;
        }
      } catch {
        // Try the next candidate.
      }
    }
  }

  async function handleSwipe(targetUserId: string, direction: 'right' | 'left') {
    if (!user) return;

    await supabase.from('matches').upsert({
      user_id: user.id,
      target_user_id: targetUserId,
      direction,
    });

    if (direction === 'right') {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, targetUserId])
        .single();

      if (!existing) {
        await supabase.from('conversations').insert({
          participant_ids: [user.id, targetUserId],
          initiated_by: user.id,
          status: 'pending',
        });
      }
    }

    setFilteredProfiles((prev) =>
      prev.filter((p) => p.user_id !== targetUserId)
    );
    setProfiles((prev) =>
      prev.filter((p) => p.user_id !== targetUserId)
    );
  }

  // Shared link style for the mobile drawer items.
  const mobileLinkStyle: React.CSSProperties = {
    color: '#1a1208',
    textDecoration: 'none',
    fontSize: 16,
    fontWeight: 600,
    padding: '14px 16px',
    borderRadius: 12,
  };

  if (loading) return <DiscoverSkeleton />;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>

      <Coachmark storageKey="mitype-coachmark-discover-v2" title="How discover works">
        Tap to connect with a creator you&rsquo;d like to collaborate with — your
        connection request lands in their <strong>Messages</strong> for them to approve.
      </Coachmark>

      {/* Nav — responsive: horizontal on desktop, hamburger on mobile.
          Mirrors the dashboard pattern for visual consistency. */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(250,246,240,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(200,149,108,0.15)',
      }}>
        <div className="mitype-discover-nav-row" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BackButton fallbackHref="/dashboard" />
            <Link href="/dashboard" style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#c8956c',
              letterSpacing: '-1px',
              textDecoration: 'none',
            }}>
              mitype
            </Link>
          </div>

          {/* Hamburger — visible on mobile only. */}
          <button
            type="button"
            className="mitype-discover-hamburger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              color: '#8a7560',
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
          </button>

          {/* Desktop nav links — hidden on mobile. */}
          <div className="mitype-discover-nav-links" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/dashboard" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Dashboard
            </Link>
            <Link href="/wave" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              The Wave Feed
            </Link>
            <Link href="/spotlight" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Spotlight
            </Link>
            <Link href="/weekly" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Weekly
            </Link>
            <Link href="/messages" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              Messages
            </Link>
          </div>
        </div>

        {/* Mobile drawer — only renders when open. */}
        {mobileMenuOpen && (
          <div className="mitype-discover-mobile-drawer" style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 24px 20px',
            gap: 4,
            borderTop: '1px solid rgba(200,149,108,0.15)',
          }}>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Dashboard</Link>
            <Link href="/wave" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>The Wave Feed</Link>
            <Link href="/spotlight" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Spotlight</Link>
            <Link href="/weekly" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Weekly</Link>
            <Link href="/messages" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Messages</Link>
            <Link href="/edit-profile" onClick={() => setMobileMenuOpen(false)} style={mobileLinkStyle}>Edit Profile</Link>
          </div>
        )}

        <style>{`
          @media (max-width: 768px) {
            .mitype-discover-nav-row { padding: 16px 20px !important; }
            .mitype-discover-hamburger { display: flex !important; align-items: center; }
            .mitype-discover-nav-links { display: none !important; }
          }
          @keyframes mitype-freshwave-pulse {
            0%, 100% { box-shadow: 0 2px 10px rgba(200,149,108,0.55); transform: scale(1); }
            50% { box-shadow: 0 2px 18px rgba(200,149,108,0.85); transform: scale(1.04); }
          }
        `}</style>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* Wave Feed entry point — jump straight to the scrolling video feed */}
        <Link
          href="/wave"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 60%, #c8956c 100%)',
            border: '1px solid rgba(200,149,108,0.35)',
            borderRadius: 24,
            padding: '24px 28px',
            marginBottom: 40,
            textDecoration: 'none',
            boxShadow: '0 10px 32px rgba(30,58,95,0.22)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              flexShrink: 0,
            }}
          >
            🌊
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.4px',
              margin: '0 0 4px',
            }}>
              The Wave Feed
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14,
              margin: 0,
              lineHeight: 1.4,
            }}>
              Scroll, watch, and post quick videos — fresh creative moments from the community.
            </p>
          </div>
          <div aria-hidden="true" style={{
            color: 'white',
            fontSize: 22,
            fontWeight: 800,
            flexShrink: 0,
          }}>
            →
          </div>
        </Link>

        {/* Spotlight Section */}
        {spotlightProfiles.length > 0 && (
          <div style={{ marginBottom: 56 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 20 }}>✨</span>
              <div>
                <h2 style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#1a1208',
                  letterSpacing: '-0.5px',
                }}>
                  Spotlight Profiles
                </h2>
                <p style={{ color: '#a89278', fontSize: 13 }}>
                  Featured creatives today — refreshes daily
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20,
            }}>
              {spotlightProfiles.map((profile) => {
                const score = calculateCompatibility(myCategories, profile.categories ?? []);
                const scoreColor = getCompatibilityColor(score);
                const shared = getSharedCategories(myCategories, profile.categories ?? []);

                return (
                  <div
                    key={profile.id}
                    style={{
                      background: 'white',
                      border: '2px solid rgba(200,149,108,0.3)',
                      borderRadius: 24,
                      overflow: 'hidden',
                      boxShadow: '0 8px 32px rgba(200,149,108,0.12)',
                      position: 'relative',
                    }}
                  >
                    {/* Spotlight banner */}
                    <div style={{
                      background: 'linear-gradient(135deg, #c8956c, #e8b490)',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span style={{ fontSize: 14 }}>✨</span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Spotlight Profile
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 0 }}>
                      {/* Photo */}
                      <div style={{
                        width: 110,
                        flexShrink: 0,
                        background: '#f0e8df',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                        minHeight: 140,
                      }}>
                        <Avatar
                          src={profile.avatar_url}
                          alt={`${profile.username} profile photo`}
                          width={110}
                          height={140}
                          fallbackFontSize={48}
                          sizes="110px"
                        />

                        {score > 0 && (
                          <div style={{
                            position: 'absolute',
                            bottom: 6,
                            left: 6,
                            background: scoreColor,
                            color: 'white',
                            padding: '3px 8px',
                            borderRadius: 100,
                            fontSize: 11,
                            fontWeight: 700,
                          }}>
                            {score}%
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: '16px', flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/profile/${profile.username}`}
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: '#1a1208',
                            textDecoration: 'none',
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          @{profile.username}
                          {(() => {
                            const age = calculateAge(profile.date_of_birth);
                            return age !== null ? (
                              <span style={{ color: '#a89278', fontWeight: 600 }}> · {age}</span>
                            ) : null;
                          })()}
                        </Link>

                        {profile.zip_code && (
                          <p style={{ color: '#a89278', fontSize: 12, marginBottom: 4 }}>
                            📍 {profile.zip_code}
                          </p>
                        )}

                        <div style={{ marginBottom: 8 }}>
                          <OnlineDot
                            userId={profile.user_id}
                            lastActiveAt={profile.last_active_at}
                            online={onlineUsers}
                          />
                        </div>

                        {profile.bio && (
                          <p style={{
                            color: '#6b5744',
                            fontSize: 13,
                            lineHeight: 1.5,
                            marginBottom: 10,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {sanitizeText(profile.bio)}
                          </p>
                        )}

                        {shared.length > 0 && (
                          <p style={{
                            color: '#16a34a',
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}>
                            ✓ You both create {shared.slice(0, 2).join(' · ')}
                            {shared.length > 2 && ` +${shared.length - 2}`}
                          </p>
                        )}

                        {/* Categories */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                          {profile.categories?.slice(0, 2).map((cat: string) => (
                            <span key={cat} style={{
                              background: 'rgba(200,149,108,0.1)',
                              border: '1px solid rgba(200,149,108,0.2)',
                              color: '#c8956c',
                              padding: '3px 10px',
                              borderRadius: 100,
                              fontSize: 11,
                              fontWeight: 600,
                            }}>
                              {cat}
                            </span>
                          ))}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link
                            href={`/profile/${profile.username}`}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: 'white',
                              border: '1px solid rgba(200,149,108,0.3)',
                              borderRadius: 10,
                              color: '#c8956c',
                              fontSize: 12,
                              fontWeight: 700,
                              textDecoration: 'none',
                              textAlign: 'center',
                            }}
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleSwipe(profile.user_id, 'right')}
                            aria-label={`Connect with ${profile.username}`}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: '#c8956c',
                              border: 'none',
                              borderRadius: 10,
                              color: 'white',
                              fontSize: 16,
                              cursor: 'pointer',
                            }}
                          >
                            <span aria-hidden="true">♥</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 40,
            }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(200,149,108,0.15)' }} />
              <span style={{ color: '#a89278', fontSize: 13, fontWeight: 600 }}>All Profiles</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(200,149,108,0.15)' }} />
            </div>
          </div>
        )}

        {/* Daily Business Spotlight — directly under Spotlight Profiles.
            Purple-coded so it's visually distinct from the creator
            spotlight. Same business shown to all viewers for the day. */}
        {dailyBusinessSpotlight && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🏪</span>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1208', letterSpacing: '-0.5px', margin: 0 }}>
                  Today&rsquo;s Business Spotlight
                </h2>
                <p style={{ color: '#7a6a85', fontSize: 13, margin: 0 }}>
                  A different small business every day — rotates at midnight.
                </p>
              </div>
            </div>
            <Link
              href={`/business/${dailyBusinessSpotlight.owner?.username ?? ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                background: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 60%, #c084fc 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 24,
                padding: '22px 24px',
                boxShadow: '0 16px 40px rgba(139,92,246,0.32)',
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: dailyBusinessSpotlight.logo_url
                  ? `url(${dailyBusinessSpotlight.logo_url})`
                  : 'rgba(255,255,255,0.18)',
                backgroundSize: 'cover', backgroundPosition: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0,
              }}>
                {!dailyBusinessSpotlight.logo_url && '🏪'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  Featured Today
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.4px', marginTop: 2 }}>
                  {dailyBusinessSpotlight.business_name}
                </div>
                {dailyBusinessSpotlight.category && (
                  <div style={{ fontSize: 13, opacity: 0.92, marginTop: 4 }}>
                    {dailyBusinessSpotlight.category}
                  </div>
                )}
              </div>
              <div aria-hidden="true" style={{ fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
                →
              </div>
            </Link>
          </div>
        )}

        {/* "Looking for a local small business?" tab */}
        <button
          type="button"
          onClick={() => setShowBusinessTab((v) => !v)}
          style={{
            width: '100%',
            background: showBusinessTab
              ? 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)'
              : 'white',
            border: `1px solid ${showBusinessTab ? 'transparent' : 'rgba(139,92,246,0.35)'}`,
            borderRadius: 20,
            padding: '18px 22px',
            marginBottom: showBusinessTab ? 16 : 32,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            color: showBusinessTab ? 'white' : '#5b21b6',
            fontFamily: 'inherit',
            boxShadow: showBusinessTab
              ? '0 10px 28px rgba(139,92,246,0.35)'
              : '0 2px 8px rgba(139,92,246,0.08)',
          }}
        >
          <span style={{ fontSize: 22 }}>🏪</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px' }}>
              Looking for a local small business?
            </span>
            <span style={{ display: 'block', fontSize: 13, opacity: 0.9, marginTop: 2 }}>
              {myZip
                ? `Browse small businesses in ${myZip}`
                : 'Add your zip code to see local businesses'}
            </span>
          </span>
          <span aria-hidden="true" style={{ fontSize: 18, fontWeight: 800 }}>
            {showBusinessTab ? '▲' : '▼'}
          </span>
        </button>

        {showBusinessTab && (
          <div style={{
            background: '#fbfaff',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 24,
            padding: 18,
            marginBottom: 40,
          }}>
            {/* Category filter — purple chips */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Filter by type
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto', padding: 2 }}>
                <button
                  onClick={() => setBizCategoryFilter('')}
                  style={{
                    background: !bizCategoryFilter ? '#8b5cf6' : 'white',
                    color: !bizCategoryFilter ? 'white' : '#5b21b6',
                    border: '1px solid rgba(139,92,246,0.25)',
                    padding: '5px 11px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  All
                </button>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setBizCategoryFilter(cat === bizCategoryFilter ? '' : cat)}
                    style={{
                      background: cat === bizCategoryFilter ? '#8b5cf6' : 'white',
                      color: cat === bizCategoryFilter ? 'white' : '#5b21b6',
                      border: '1px solid rgba(139,92,246,0.25)',
                      padding: '5px 11px',
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Business cards grid */}
            {(() => {
              const visible = bizCategoryFilter
                ? localBusinesses.filter((b) => b.category === bizCategoryFilter)
                : localBusinesses;
              if (visible.length === 0) {
                return (
                  <div style={{ padding: '40px 16px', textAlign: 'center', color: '#7a6a85', fontSize: 14 }}>
                    {myZip
                      ? bizCategoryFilter
                        ? `No ${bizCategoryFilter} businesses in ${myZip} yet.`
                        : `No local businesses in ${myZip} yet — be the first.`
                      : 'Add a zip code to your profile to see local businesses.'}
                  </div>
                );
              }
              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 14,
                }}>
                  {visible.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        background: 'white',
                        border: '1px solid rgba(139,92,246,0.22)',
                        borderRadius: 18,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: '0 6px 18px rgba(139,92,246,0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: b.logo_url ? `url(${b.logo_url})` : 'linear-gradient(135deg, #8b5cf6, #c084fc)',
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, color: 'white', flexShrink: 0,
                        }}>
                          {!b.logo_url && '🏪'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1208', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.business_name}
                          </div>
                          {b.category && (
                            <div style={{ fontSize: 11, color: '#7a6a85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {b.category}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          href={`/business/${b.owner?.username ?? ''}`}
                          aria-label="View business profile"
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 100,
                            fontSize: 12,
                            fontWeight: 800,
                            textDecoration: 'none',
                            textAlign: 'center',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          ▶ View
                        </Link>
                        <Link
                          href={`/messages?user=${encodeURIComponent(b.user_id)}`}
                          aria-label="Message business"
                          style={{
                            padding: '8px 12px',
                            background: 'rgba(139,92,246,0.1)',
                            color: '#5b21b6',
                            border: '1px solid rgba(139,92,246,0.3)',
                            borderRadius: 100,
                            fontSize: 12,
                            fontWeight: 800,
                            textDecoration: 'none',
                            textAlign: 'center',
                          }}
                        >
                          💬
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 40,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: 40,
              fontWeight: 900,
              color: '#1a1208',
              letterSpacing: '-1px',
              marginBottom: 8,
            }}>
              Discover
            </h1>
            <p style={{ color: '#a89278', fontSize: 16 }}>
              {filteredProfiles.length} creative{filteredProfiles.length !== 1 ? 's' : ''} — sorted by compatibility
            </p>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            aria-expanded={showFilters}
            style={{
              padding: '12px 24px',
              background: showFilters ? '#c8956c' : 'white',
              border: '1px solid rgba(200,149,108,0.3)',
              borderRadius: 100,
              color: showFilters ? 'white' : '#8a7560',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">🔍</span> {showFilters ? 'Hide Filters' : 'Filter'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.2)',
            borderRadius: 20,
            padding: '28px',
            marginBottom: 32,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#6b5744',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(200,149,108,0.25)',
                    background: '#faf6f0',
                    fontSize: 14,
                    color: '#1a1208',
                    outline: 'none',
                  }}
                >
                  <option value="">All Categories</option>
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#6b5744',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  ZIP Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 90210"
                  value={zipFilter}
                  onChange={(e) => setZipFilter(e.target.value)}
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(200,149,108,0.25)',
                    background: '#faf6f0',
                    fontSize: 14,
                    color: '#1a1208',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={applyFilters}
                style={{
                  padding: '10px 28px',
                  background: '#c8956c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                style={{
                  padding: '10px 28px',
                  background: 'transparent',
                  color: '#8a7560',
                  border: '1px solid rgba(200,149,108,0.3)',
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Wave-Feed preview for the active category filter — surfaces
            the first matching video at the top of the results. Clicking
            launches the Wave feed scoped to the same category. */}
        {appliedCategory && waveCategoryPreview && (
          <Link
            href={`/wave?category=${encodeURIComponent(
              ALL_CATEGORIES.find((c) =>
                c.toLowerCase().includes(appliedCategory.toLowerCase())
              ) ?? appliedCategory
            )}`}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 18,
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 60%, #c8956c 100%)',
              border: '1px solid rgba(200,149,108,0.35)',
              borderRadius: 24,
              padding: 16,
              marginBottom: 32,
              textDecoration: 'none',
              boxShadow: '0 10px 32px rgba(30,58,95,0.22)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 92,
                minHeight: 132,
                borderRadius: 16,
                overflow: 'hidden',
                background: '#000',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
              }}
            >
              <video
                src={waveCategoryPreview.videoUrl}
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  position: 'absolute',
                  inset: 0,
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  fontSize: 28,
                  color: 'white',
                  padding: 6,
                }}
              >
                ▶
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, alignSelf: 'center' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.85)',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  marginBottom: 4,
                }}
              >
                🌊 The Wave · {appliedCategory}
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'white',
                  letterSpacing: '-0.4px',
                  margin: '0 0 6px',
                  lineHeight: 1.25,
                }}
              >
                Scroll {appliedCategory} videos
              </h2>
              <p
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13,
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {waveCategoryPreview.creator
                  ? `Starting with @${waveCategoryPreview.creator.username} — tap to start watching.`
                  : 'Tap to start watching.'}
              </p>
            </div>
            <div
              aria-hidden="true"
              style={{
                color: 'white',
                fontSize: 22,
                fontWeight: 800,
                flexShrink: 0,
                alignSelf: 'center',
                paddingRight: 6,
              }}
            >
              →
            </div>
          </Link>
        )}

        {/* Profiles Grid */}
        {filteredProfiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💔</div>
            <h2 style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#1a1208',
              marginBottom: 8,
            }}>
              No profiles yet
            </h2>
            <p style={{ color: '#a89278', fontSize: 16 }}>
              Check back soon as more people join Mitype!
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 24,
          }}>
            {filteredProfiles.map((profile) => {
              const score = calculateCompatibility(myCategories, profile.categories ?? []);
              const scoreColor = getCompatibilityColor(score);
              const shared = getSharedCategories(myCategories, profile.categories ?? []);

              return (
                <div
                  key={profile.id}
                  style={{
                    background: 'white',
                    border: '1px solid rgba(200,149,108,0.15)',
                    borderRadius: 24,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Photo */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '3/4',
                    background: '#f0e8df',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <Avatar
                      src={profile.avatar_url}
                      alt={`${profile.username} profile photo`}
                      width={360}
                      height={480}
                      fallbackFontSize={64}
                      sizes="(max-width: 700px) 100vw, 240px"
                    />


                    {score > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: scoreColor,
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: 100,
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      }}>
                        {score}% Compatible
                      </div>
                    )}

                    {/* Fresh-Wave indicator — this creator has posted a
                        Wave video in the last 24h. Tap to open the Wave
                        feed scoped to just their videos. */}
                    {freshWaveCreators.has(profile.user_id) && (
                      <Link
                        href={`/wave?user=${encodeURIComponent(profile.user_id)}`}
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: 'linear-gradient(135deg, #c8956c 0%, #ffb37c 100%)',
                          color: 'white',
                          padding: '5px 11px',
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.3px',
                          textDecoration: 'none',
                          boxShadow: '0 2px 10px rgba(200,149,108,0.55)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          animation: 'mitype-freshwave-pulse 2.4s ease-in-out infinite',
                        }}
                      >
                        🌊 Fresh Wave
                      </Link>
                    )}

                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                      padding: '16px 12px 12px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4,
                    }}>
                      {profile.categories?.slice(0, 2).map((cat: string) => (
                        <span key={cat} style={{
                          background: 'rgba(200,149,108,0.85)',
                          color: 'white',
                          padding: '3px 10px',
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '16px' }}>
                    <Link
                      href={`/profile/${profile.username}`}
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#1a1208',
                        textDecoration: 'none',
                      }}
                    >
                      @{profile.username}
                      {(() => {
                        const age = calculateAge(profile.date_of_birth);
                        return age !== null ? (
                          <span style={{ color: '#a89278', fontWeight: 600 }}> · {age}</span>
                        ) : null;
                      })()}
                    </Link>
                    {profile.zip_code && (
                      <p style={{ color: '#a89278', fontSize: 12, marginTop: 2 }}>
                        📍 {profile.zip_code}
                      </p>
                    )}
                    <div style={{ marginTop: 6 }}>
                      <OnlineDot
                        userId={profile.user_id}
                        lastActiveAt={profile.last_active_at}
                        online={onlineUsers}
                      />
                    </div>
                    {profile.bio && (
                      <p style={{
                        color: '#8a7560',
                        fontSize: 13,
                        lineHeight: 1.5,
                        margin: '8px 0 16px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {sanitizeText(profile.bio)}
                      </p>
                    )}

                    {shared.length > 0 && (
                      <p style={{
                        color: '#16a34a',
                        fontSize: 12,
                        fontWeight: 600,
                        margin: '0 0 12px',
                      }}>
                        ✓ You both create {shared.slice(0, 2).join(' · ')}
                        {shared.length > 2 && ` +${shared.length - 2}`}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleSwipe(profile.user_id, 'left')}
                        aria-label={`Pass on ${profile.username}`}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: '#fff0f0',
                          border: '1px solid rgba(220,100,100,0.2)',
                          borderRadius: 12,
                          color: '#c07070',
                          fontSize: 20,
                          cursor: 'pointer',
                        }}
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                      <button
                        onClick={() => handleSwipe(profile.user_id, 'right')}
                        aria-label={`Connect with ${profile.username}`}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: '#c8956c',
                          border: 'none',
                          borderRadius: 12,
                          color: 'white',
                          fontSize: 20,
                          cursor: 'pointer',
                        }}
                      >
                        <span aria-hidden="true">♥</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}