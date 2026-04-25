'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { calculateCompatibility, getCompatibilityColor, getSharedCategories } from '../lib/utils';
import { Avatar } from '../components/Avatar';
import { Coachmark } from '../components/Coachmark';
import { DiscoverSkeleton } from '../components/Skeleton';
import { sanitizeText } from '../lib/sanitize';
import { calculateAge } from '../lib/age';

const ALL_CATEGORIES = [
  '🎨 Painter', '✍️ Writer', '📸 Photographer', '🎭 Actor',
  '💃 Dancer', '🎬 Filmmaker', '🖌️ Illustrator', '🗿 Sculptor',
  '📖 Poet', '🎙️ Storyteller', '✏️ Graphic Designer', '🖼️ Art Director',
  '🎵 Musician', '🎹 Pianist', '🎸 Guitarist', '🎤 Singer',
  '🥁 Drummer', '🎻 Violinist', '🎺 Brass Player', '🎧 DJ',
  '🎼 Composer', '🎷 Saxophonist',
  '📱 Content Creator', '🎮 Gamer', '📺 YouTuber', '🤳 Influencer',
  '💻 Blogger', '🎙️ Podcaster', '📡 Streamer', '👾 Esports Player',
  '🖥️ Web Developer', '📲 App Developer', '🤖 AI Enthusiast',
  '🩺 Doctor', '👩‍⚕️ Nurse', '🦷 Dentist', '🧠 Therapist',
  '💊 Pharmacist', '🏃 Physical Therapist', '🧬 Scientist',
  '👩‍🏫 Teacher', '👨‍🎓 Professor', '📚 Tutor', '🔬 Researcher',
  '🏋️ Athlete', '🧘 Yoga Instructor', '🚴 Cyclist', '🏊 Swimmer',
  '⛷️ Skier', '🏄 Surfer', '🧗 Rock Climber', '🥊 Boxer',
  '🎾 Tennis Player', '⚽ Soccer Player',
  '👨‍🍳 Chef', '🧁 Baker', '🍷 Sommelier', '🌿 Foodie',
  '☕ Barista', '🍕 Food Blogger',
  '🐶 Dog Walker', '🐱 Cat Lover', '🐾 Pet Trainer',
  '🌿 Gardener', '🦋 Nature Lover',
  '🏎️ Car Enthusiast', '🏍️ Motorcyclist', '✈️ Pilot',
  '⛵ Sailor', '🚀 Space Enthusiast',
  '👔 Entrepreneur', '⚖️ Lawyer', '🏛️ Architect',
  '🏗️ Engineer', '📊 Finance Professional', '🎯 Marketing Creative',
  '🏠 Real Estate Agent', '👗 Fashion Designer', '💈 Stylist',
  '✈️ Traveler', '🌍 Expat', '🗺️ Adventurer',
  '♟️ Chess Player', '🎲 Board Gamer', '📚 Book Lover',
  '🔭 Astronomer', '🪴 Plant Parent', '🧶 Knitter', '🪵 Woodworker',
  '🌐 Free Thinker', '📡 Alternative Media', '🔍 Truth Seeker',
  '🧘 Spiritual Seeker', '🌱 Minimalist', '💡 Visionary',
  '🎙️ Motivational Speaker', '📻 Radio Personality',
  '🏡 Homesteader', '🌾 Farmer', '🐝 Beekeeper',
  '🎨 Tattoo Artist', '💇 Hair Stylist', '💅 Nail Artist',
  '🎤 Comedian', '🎪 Entertainer', '🃏 Magician',
  '🏋️ Personal Trainer', '🥗 Nutritionist', '🌿 Herbalist',
  '🔧 Mechanic', '🔨 Contractor', '⚡ Electrician',
  '🚒 Firefighter', '👮 Law Enforcement', '🪖 Military',
  '✝️ Faith Based', '☮️ Activist', '🌍 Environmentalist',
];

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
  const router = useRouter();

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
        .select('categories')
        .eq('user_id', user.id)
        .single();

      if (myProfile?.categories) {
        setMyCategories(myProfile.categories);
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
  }

  function clearFilters() {
    setCategoryFilter('');
    setZipFilter('');
    setFilteredProfiles(profiles);
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

  if (loading) return <DiscoverSkeleton />;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>

      <Coachmark storageKey="mitype-coachmark-discover-v1" title="How discover works">
        Tap the heart on someone you&rsquo;d like to connect with — your message
        request lands in their <strong>Messages</strong> for them to approve.
      </Coachmark>

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
        <Link href="/dashboard" style={{
          fontSize: 24,
          fontWeight: 900,
          color: '#c8956c',
          letterSpacing: '-1px',
          textDecoration: 'none',
        }}>
          mitype
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Dashboard
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
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

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
                          <p style={{ color: '#a89278', fontSize: 12, marginBottom: 8 }}>
                            📍 {profile.zip_code}
                          </p>
                        )}

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
                            ✓ You both love {shared.slice(0, 2).join(' · ')}
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
                            aria-label={`Like ${profile.username}`}
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
                        {score}% Match
                      </div>
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
                        ✓ You both love {shared.slice(0, 2).join(' · ')}
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
                        aria-label={`Like ${profile.username}`}
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