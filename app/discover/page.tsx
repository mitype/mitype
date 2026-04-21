'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

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
];

export default function DiscoverPage() {
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
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

      const filtered = (profileData ?? []).filter(
        (p: any) => !swiped.includes(p.user_id)
      );

      setProfiles(filtered);
      setFilteredProfiles(filtered);
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

  if (loading) return (
    <main style={{
      minHeight: '100vh',
      background: '#faf6f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      <p style={{ color: '#c8956c', fontSize: 18 }}>Loading profiles...</p>
    </main>
  );

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
          <Link href="/dashboard" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Dashboard</Link>
          <Link href="/messages" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Messages</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

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
              {filteredProfiles.length} creative{filteredProfiles.length !== 1 ? 's' : ''} to explore
            </p>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
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
            🔍 {showFilters ? 'Hide Filters' : 'Filter'}
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
            {filteredProfiles.map((profile) => (
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
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 64 }}>👤</span>
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
                      {profile.bio}
                    </p>
                  )}

                  {/* Swipe Buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSwipe(profile.user_id, 'left')}
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
                      ✕
                    </button>
                    <button
                      onClick={() => handleSwipe(profile.user_id, 'right')}
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
                      ♥
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}