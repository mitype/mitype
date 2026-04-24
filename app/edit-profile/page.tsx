'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { Avatar } from '../components/Avatar';
import { toast } from '../lib/toast';

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

const PORTFOLIO_TYPES = [
  { value: 'music',     label: '🎵 Music',       placeholder: 'SoundCloud, Spotify, Apple Music...' },
  { value: 'video',     label: '🎬 Video',        placeholder: 'YouTube, Vimeo, TikTok...' },
  { value: 'photo',     label: '📸 Photography',  placeholder: 'Instagram, Flickr, 500px...' },
  { value: 'writing',   label: '✍️ Writing',      placeholder: 'Blog, Medium, Substack...' },
  { value: 'art',       label: '🎨 Art',          placeholder: 'Behance, DeviantArt, ArtStation...' },
  { value: 'gaming',    label: '🎮 Gaming',       placeholder: 'Twitch, Steam, YouTube Gaming...' },
  { value: 'podcast',   label: '🎙️ Podcast',     placeholder: 'Spotify, Apple Podcasts...' },
  { value: 'business',  label: '💼 Business',     placeholder: 'LinkedIn, company website...' },
  { value: 'social',    label: '📱 Social',       placeholder: 'Any social media link...' },
  { value: 'other',     label: '🔗 Other',        placeholder: 'Any other link...' },
];

const STATUS_SUGGESTIONS = [
  '🎵 Recording my first album',
  '📸 Shooting a wedding this weekend',
  '✍️ Writing my first novel',
  '🎨 Working on a new art series',
  '🎬 Editing my latest film project',
  '🎮 Streaming every night this week',
  '🏋️ Training for my first marathon',
  '💡 Building a new startup',
  '🎤 Preparing for an open mic night',
  '📚 Reading everything I can get my hands on',
  '🌍 Planning my next big trip',
  '🍕 Experimenting with new recipes',
  '🚀 Launching something exciting soon',
  '🎹 Learning a new song',
  '📱 Growing my content channel',
];

interface PortfolioLink {
  type: string;
  url: string;
  title: string;
}

export default function EditProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [creativeStatus, setCreativeStatus] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLink[]>([]);
  const [showStatusSuggestions, setShowStatusSuggestions] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setZipCode(profile.zip_code || '');
        setWebsiteUrl(profile.website_url || '');
        setCreativeStatus(profile.creative_status || '');
        setSelectedCategories(profile.categories || []);
        setAvatarUrl(profile.avatar_url || '');
        setPortfolioLinks(profile.portfolio_links || []);
      }

      setLoading(false);
    };
    getData();
  }, []);

  function toggleCategory(cat: string) {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else if (selectedCategories.length < 5) {
      setSelectedCategories([...selectedCategories, cat]);
    } else {
      toast.info('You can select up to 5 categories');
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }

    setUploading(true);
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    // Version the filename instead of using `?t=<timestamp>` as a cache-bust.
    // The timestamp approach defeats both the browser cache AND the
    // Next.js Image optimizer. Using a unique filename keeps each upload
    // cacheable-forever, while older uploads stay addressable (for any
    // stale references). The filename pattern stays inside the user's
    // own storage folder so RLS policies continue to apply.
    const version = Date.now();
    const path = `${user.id}/avatar-${version}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  }

  function addPortfolioLink() {
    setPortfolioLinks([...portfolioLinks, { type: 'music', url: '', title: '' }]);
  }

  function removePortfolioLink(index: number) {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  }

  function updatePortfolioLink(index: number, field: keyof PortfolioLink, value: string) {
    setPortfolioLinks(portfolioLinks.map((link, i) =>
      i === index ? { ...link, [field]: value } : link
    ));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username is required.');
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      categories: selectedCategories,
      zip_code: zipCode.trim(),
      website_url: websiteUrl.trim(),
      creative_status: creativeStatus.trim(),
      avatar_url: avatarUrl,
      portfolio_links: portfolioLinks.filter((p) => p.url.trim()),
    }, { onConflict: 'user_id' });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success('Profile saved!');
    router.push('/dashboard');
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
      <p style={{ color: '#c8956c' }}>Loading...</p>
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
        <Link href="/dashboard" style={{
          color: '#8a7560',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
        }}>
          Back to Dashboard
        </Link>
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 800,
          color: '#1a1208',
          marginBottom: 8,
          letterSpacing: '-1px',
        }}>
          Edit Profile
        </h1>
        <p style={{ color: '#a89278', fontSize: 16, marginBottom: 40 }}>
          Update your info, photo, categories and creative portfolio.
        </p>

        <form onSubmit={handleSave}>

          {/* Avatar */}
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <div style={{
              width: 120,
              height: 150,
              borderRadius: 20,
              background: '#f0e8df',
              border: '2px solid rgba(200,149,108,0.25)',
              margin: '0 auto 16px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Avatar
                src={avatarUrl}
                alt="Your profile photo"
                width={120}
                height={150}
                fallbackFontSize={48}
                sizes="120px"
              />

            </div>
            <label style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'white',
              border: '1px solid rgba(200,149,108,0.3)',
              borderRadius: 100,
              color: '#c8956c',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}>
              {uploading ? 'Uploading...' : '📷 Upload Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Username */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#6b5744',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Username *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#c8956c',
                fontWeight: 700,
              }}>@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                maxLength={30}
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 32px',
                  borderRadius: 12,
                  border: '1px solid rgba(200,149,108,0.25)',
                  background: 'white',
                  fontSize: 15,
                  color: '#1a1208',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#6b5744',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Bio
            </label>
            <textarea
              placeholder="Tell people about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                border: '1px solid rgba(200,149,108,0.25)',
                background: 'white',
                fontSize: 15,
                color: '#1a1208',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
              }}
            />
            <p style={{ color: '#b0967e', fontSize: 12, marginTop: 4, textAlign: 'right' }}>
              {bio.length}/500
            </p>
          </div>

          {/* Creative Status */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#6b5744',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Creative Status
            </label>
            <p style={{ color: '#b0967e', fontSize: 13, marginBottom: 10 }}>
              What are you currently working on or excited about?
            </p>
            <input
              type="text"
              placeholder="e.g. Recording my first album 🎵"
              value={creativeStatus}
              onChange={(e) => setCreativeStatus(e.target.value)}
              maxLength={100}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                border: '1px solid rgba(200,149,108,0.25)',
                background: 'white',
                fontSize: 15,
                color: '#1a1208',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 8,
              }}
            />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: showStatusSuggestions ? 12 : 0,
            }}>
              <p style={{ color: '#b0967e', fontSize: 12 }}>
                {creativeStatus.length}/100
              </p>
              <button
                type="button"
                onClick={() => setShowStatusSuggestions(!showStatusSuggestions)}
                style={{
                  padding: '4px 14px',
                  background: 'transparent',
                  border: '1px solid rgba(200,149,108,0.3)',
                  borderRadius: 100,
                  color: '#c8956c',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showStatusSuggestions ? 'Hide ideas' : '💡 Get ideas'}
              </button>
            </div>

            {/* Status suggestions */}
            {showStatusSuggestions && (
              <div style={{
                background: 'white',
                border: '1px solid rgba(200,149,108,0.2)',
                borderRadius: 14,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <p style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#a89278',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 4,
                }}>
                  Tap to use
                </p>
                {STATUS_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setCreativeStatus(suggestion);
                      setShowStatusSuggestions(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      background: '#faf6f0',
                      border: '1px solid rgba(200,149,108,0.15)',
                      borderRadius: 10,
                      color: '#6b5744',
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#6b5744',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Categories (up to 5)
            </label>
            <p style={{ color: '#b0967e', fontSize: 13, marginBottom: 16 }}>
              {selectedCategories.length}/5 selected
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALL_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 100,
                      border: isSelected
                        ? '1.5px solid #c8956c'
                        : '1px solid rgba(200,149,108,0.2)',
                      background: isSelected ? 'rgba(200,149,108,0.15)' : 'white',
                      color: isSelected ? '#c8956c' : '#6b5744',
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ZIP Code */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
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
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              maxLength={10}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                border: '1px solid rgba(200,149,108,0.25)',
                background: 'white',
                fontSize: 15,
                color: '#1a1208',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Website */}
          <div style={{ marginBottom: 32 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#6b5744',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Website or Portfolio URL
            </label>
            <input
              type="url"
              placeholder="https://yourwebsite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 12,
                border: '1px solid rgba(200,149,108,0.25)',
                background: 'white',
                fontSize: 15,
                color: '#1a1208',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Creative Portfolio Section */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6b5744',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Creative Portfolio
                </label>
                <p style={{ color: '#b0967e', fontSize: 13, marginTop: 4 }}>
                  Share your music, art, writing, videos and more
                </p>
              </div>
              <button
                type="button"
                onClick={addPortfolioLink}
                style={{
                  padding: '8px 18px',
                  background: '#c8956c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                + Add Link
              </button>
            </div>

            {portfolioLinks.length === 0 && (
              <div style={{
                background: 'white',
                border: '1px dashed rgba(200,149,108,0.3)',
                borderRadius: 16,
                padding: '32px',
                textAlign: 'center',
                color: '#a89278',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
                <p style={{ fontSize: 14 }}>No portfolio links yet.</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Click Add Link to share your creative work!</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              {portfolioLinks.map((link, index) => (
                <div
                  key={index}
                  style={{
                    background: 'white',
                    border: '1px solid rgba(200,149,108,0.2)',
                    borderRadius: 16,
                    padding: '20px',
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#6b5744',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Type
                    </label>
                    <select
                      value={link.type}
                      onChange={(e) => updatePortfolioLink(index, 'type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(200,149,108,0.25)',
                        background: '#faf6f0',
                        fontSize: 14,
                        color: '#1a1208',
                        outline: 'none',
                      }}
                    >
                      {PORTFOLIO_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#6b5744',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. My SoundCloud, Photography Portfolio..."
                      value={link.title}
                      onChange={(e) => updatePortfolioLink(index, 'title', e.target.value)}
                      maxLength={50}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(200,149,108,0.25)',
                        background: '#faf6f0',
                        fontSize: 14,
                        color: '#1a1208',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#6b5744',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Link URL
                    </label>
                    <input
                      type="url"
                      placeholder={PORTFOLIO_TYPES.find(t => t.value === link.type)?.placeholder ?? 'https://...'}
                      value={link.url}
                      onChange={(e) => updatePortfolioLink(index, 'url', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(200,149,108,0.25)',
                        background: '#faf6f0',
                        fontSize: 14,
                        color: '#1a1208',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removePortfolioLink(index)}
                    style={{
                      padding: '6px 16px',
                      background: '#fff0f0',
                      border: '1px solid rgba(220,100,100,0.2)',
                      borderRadius: 100,
                      color: '#c07070',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '16px',
              background: saving ? '#d4a882' : '#c8956c',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 17,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

        </form>
      </div>
    </main>
  );
}