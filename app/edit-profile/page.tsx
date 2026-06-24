'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { Coachmark } from '../components/Coachmark';
import { BackButton } from '../components/BackButton';
import { SiteNav } from '../components/SiteNav';
import { PhotoManager } from '../components/PhotoManager';
import { PetEditor } from '../components/PetEditor';
import { BusinessRecommendationsEditor } from '../components/BusinessRecommendationsEditor';
import { FeatureTutorial } from '../components/FeatureTutorial';
import { toast } from '../lib/toast';
import { isAtLeast18, maxDobIso, minDobIso } from '../lib/age';
import { normalizePhotos, type ProfilePhoto } from '../lib/photos';
import {
  PROFILE_PROMPTS,
  MAX_PROMPTS,
  MAX_ANSWER_LENGTH,
  normalizePrompts,
  type ProfilePrompt,
} from '../lib/profilePrompts';

const ALL_CATEGORIES = [
  '♾️ Oddcast',
  // Creative Arts
  '🎨 Painter', '✍️ Writer', '📸 Photographer', '🎭 Actor',
  '💃 Dancer', '🎬 Filmmaker', '🖌️ Illustrator', '🗿 Sculptor',
  '📖 Poet', '🎙️ Storyteller', '✏️ Graphic Designer', '🖼️ Art Director',
  '🪶 Tattoo Artist', '🎚️ Music Producer', '🎬 Film Producer',
  '🎤 Comedian', '🎪 Entertainer', '🃏 Magician',
  // Music
  '🎵 Musician', '🎹 Pianist', '🎸 Guitarist', '🎤 Singer',
  '🥁 Drummer', '🎻 Violinist', '🎺 Brass Player', '🎧 DJ',
  '🎼 Composer', '🎷 Saxophonist',
  // Digital & Content
  '📱 Content Creator', '🎮 Gamer', '📺 YouTuber', '🤳 Influencer',
  '💻 Blogger', '🎙️ Podcaster', '📡 Streamer', '👾 Esports Player',
  '🖥️ Web Developer', '📲 App Developer', '🤖 AI Enthusiast',
  '🎙️ Motivational Speaker', '📻 Radio Personality',
  // Healthcare
  '🩺 Doctor', '👩‍⚕️ Nurse', '🦷 Dentist', '🧠 Therapist',
  '💊 Pharmacist', '🏃 Physical Therapist', '🧬 Scientist',
  '🥗 Nutritionist', '🌿 Herbalist',
  // Education
  '👩‍🏫 Teacher', '👨‍🎓 Professor', '📚 Tutor', '🏫 School Counselor',
  '🔬 Researcher', '📜 Historian',
  // Fitness & Outdoors
  '🏋️ Athlete', '🧘 Yoga Instructor', '🚴 Cyclist', '🏊 Swimmer',
  '⛷️ Skier', '🏄 Surfer', '🧗 Rock Climber', '🥊 Boxer',
  '🏇 Equestrian', '🎾 Tennis Player', '⚽ Soccer Player',
  '🏋️ Personal Trainer', '🎣 Angler', '🏕️ Camper', '🏔️ Hiker',
  // Food & Lifestyle
  '👨‍🍳 Chef', '🧁 Baker', '🍷 Sommelier', '🌿 Foodie',
  '🌱 Vegan', '☕ Barista', '🍕 Food Blogger',
  // Animals & Nature
  '🐶 Dog Walker', '🐱 Cat Lover', '🐾 Pet Trainer',
  '🌿 Gardener', '🦋 Nature Lover', '🐠 Marine Biologist',
  '🏡 Homesteader', '🌾 Farmer', '🐝 Beekeeper',
  // Enthusiasts
  '🏎️ Car Enthusiast', '🏍️ Motorcyclist', '✈️ Pilot',
  '⛵ Sailor', '🚀 Space Enthusiast', '📷 Film Photographer',
  // Professional
  '👔 Entrepreneur', '⚖️ Lawyer', '🏛️ Architect',
  '🏗️ Engineer', '📊 Finance Professional', '🎯 Marketing Creative',
  '🏠 Real Estate Agent', '👗 Fashion Designer', '💈 Stylist',
  '💇 Hair Stylist', '💅 Nail Artist', '🔧 Mechanic',
  '🔨 Contractor', '⚡ Electrician', '🚒 Firefighter',
  '👮 Law Enforcement', '🪖 Military',
  '🎫 Event Organizer', '👟 Sneaker Reseller',
  // Travel & Culture
  '✈️ Traveler', '🌍 Expat', '🗺️ Adventurer',
  '📿 Cultural Enthusiast', '🛕 Spiritual Seeker',
  // Pop Culture & Fandoms
  '🐉 Anime Fan', '🎴 Pokémon Fan', '🎬 Movie Buff', '📺 TV Show Fan',
  '🦸 Marvel Fan', '🦇 DC Fan', '⭐ Star Wars Fan', '🏰 Disney Adult',
  '🎤 K-Pop Fan', '📚 Comic Book Fan',
  // Sports Fans
  '🏈 Football Fan', '⚾ Baseball Fan', '🏀 Basketball Fan',
  '⚽ Soccer Fan', '🏒 Hockey Fan', '🥊 MMA Fan', '🏎️ Racing Fan',
  // Hobbies
  '♟️ Chess Player', '🎲 Board Gamer', '📚 Book Lover', '📖 Book Club Member',
  '🔭 Astronomer', '🎯 Collector', '🧩 Puzzle Enthusiast',
  '🪴 Plant Parent', '🧶 Knitter', '🪵 Woodworker',
  '🎴 Card Collector', '🎴 Pokémon Collector', '🧱 Lego Collector',
  '👟 Sneakerhead', '💿 Vinyl Collector', '⌚ Watch Collector',
  // Mindset & Lifestyle
  '🌐 Free Thinker', '📡 Alternative Media', '🔍 Truth Seeker',
  '🌱 Minimalist', '💡 Visionary',
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
  // Location fields. City + state are display-friendly + filter-friendly
  // companions to the canonical zip_code. Travel mode is an optional
  // temporary override (with end date) for creators visiting another
  // area for a shoot, festival, conference, etc.
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [travelCity, setTravelCity] = useState('');
  const [travelState, setTravelState] = useState('');
  const [travelEndsAt, setTravelEndsAt] = useState(''); // YYYY-MM-DD
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [creativeStatus, setCreativeStatus] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLink[]>([]);
  const [profilePrompts, setProfilePrompts] = useState<ProfilePrompt[]>([]);
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
        setCity(profile.city || '');
        setStateField(profile.state || '');
        setTravelCity(profile.travel_city || '');
        setTravelState(profile.travel_state || '');
        setTravelEndsAt(
          profile.travel_ends_at
            ? new Date(profile.travel_ends_at).toISOString().slice(0, 10)
            : ''
        );
        setWebsiteUrl(profile.website_url || '');
        setCreativeStatus(profile.creative_status || '');
        setDateOfBirth(profile.date_of_birth || '');
        setSelectedCategories(profile.categories || []);
        setAvatarUrl(profile.avatar_url || '');
        setPhotos(normalizePhotos(profile.photos));
        setPortfolioLinks(profile.portfolio_links || []);
        setProfilePrompts(normalizePrompts(profile.profile_prompts));
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

  function addProfilePrompt() {
    if (profilePrompts.length >= MAX_PROMPTS) {
      toast.info(`You can pick up to ${MAX_PROMPTS} prompts.`);
      return;
    }
    // Default to the first prompt that's not already taken.
    const taken = new Set(profilePrompts.map((p) => p.prompt));
    const fallback = PROFILE_PROMPTS.find((p) => !taken.has(p)) ?? PROFILE_PROMPTS[0];
    setProfilePrompts([...profilePrompts, { prompt: fallback, answer: '' }]);
  }

  function removeProfilePrompt(index: number) {
    setProfilePrompts(profilePrompts.filter((_, i) => i !== index));
  }

  function updateProfilePrompt(index: number, field: keyof ProfilePrompt, value: string) {
    setProfilePrompts(
      profilePrompts.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username is required.');
      return;
    }
    if (dateOfBirth && !isAtLeast18(dateOfBirth)) {
      toast.error('You must be at least 18 to use Mitype.');
      return;
    }
    setSaving(true);

    // Mirror the first photo into avatar_url so legacy code paths
    // (Discover cards, Daily Spark, conversation header, etc.) keep working
    // without any changes. If the user has no photos but had an old avatar,
    // we keep the old avatar around.
    const primaryAvatar = photos[0]?.url ?? avatarUrl;

    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      categories: selectedCategories,
      zip_code: zipCode.trim(),
      city: city.trim() || null,
      state: stateField.trim() || null,
      travel_city: travelCity.trim() || null,
      travel_state: travelState.trim() || null,
      // Travel mode is only persisted if there's both a destination
      // AND an end date. Anything else clears it.
      travel_ends_at:
        travelEndsAt && (travelCity.trim() || travelState.trim())
          ? new Date(travelEndsAt + 'T23:59:59').toISOString()
          : null,
      website_url: websiteUrl.trim(),
      creative_status: creativeStatus.trim(),
      date_of_birth: dateOfBirth || null,
      avatar_url: primaryAvatar,
      photos,
      portfolio_links: portfolioLinks.filter((p) => p.url.trim()),
      profile_prompts: profilePrompts
        .filter((p) => p.prompt.trim() && p.answer.trim())
        .slice(0, MAX_PROMPTS),
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

      <Coachmark storageKey="mitype-coachmark-edit-profile-v1" title="Make your profile shine">
        Strong <strong>prompts</strong>, a real <strong>bio</strong>, and a
        <strong> portfolio link</strong> all feed into the personalized openers
        people send through your Daily Spark — fill them in to get noticed.
      </Coachmark>

      <SiteNav userId={user?.id} showBack backFallbackHref="/dashboard" />

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

          {/* Photos */}
          {user && (
            <PhotoManager userId={user.id} photos={photos} onChange={setPhotos} />
          )}

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

          {/* Small Business Profile entry — purple to set it apart from
              the personal profile. Tapping opens the dedicated editor. */}
          <Link
            href="/edit-business-profile"
            style={{
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 20,
              padding: '18px 22px',
              boxShadow: '0 10px 30px rgba(139,92,246,0.32)',
            }}
          >
            <span style={{
              width: 44, height: 44, borderRadius: 14, fontSize: 24,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              🏪
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px' }}>
                Run a small business?
              </span>
              <span style={{ display: 'block', fontSize: 13, opacity: 0.92, marginTop: 2, lineHeight: 1.4 }}>
                Set up a business profile — local Mitype members in your zip will see it.
              </span>
            </span>
            <span aria-hidden="true" style={{ fontSize: 22, fontWeight: 800, flexShrink: 0 }}>→</span>
          </Link>

          {/* Pets — sits above Categories per spec. Rendered inside the
              form but the PetEditor has its own Save button. */}
          {user?.id && <PetEditor userId={user.id} />}

          {/* Small Business Recommendations — purple section, lives
              between Pets and Categories. Auto-saves on each action. */}
          {user?.id && <BusinessRecommendationsEditor userId={user.id} />}

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

          {/* Date of Birth */}
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
              Date of Birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              min={minDobIso()}
              max={maxDobIso()}
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
                fontFamily: 'inherit',
              }}
            />
            <p style={{ color: '#b0967e', fontSize: 12, marginTop: 6 }}>
              Used to show your age. You must be 18+.
            </p>
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

          {/* City + State */}
          <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={fieldLabel}>City</label>
              <input
                type="text"
                placeholder="Los Angeles"
                value={city}
                onChange={(e) => setCity(e.target.value.slice(0, 60))}
                style={fieldInput}
              />
            </div>
            <div>
              <label style={fieldLabel}>State</label>
              <input
                type="text"
                placeholder="CA"
                value={stateField}
                onChange={(e) => setStateField(e.target.value.slice(0, 40))}
                style={fieldInput}
              />
            </div>
          </div>

          {/* Travel mode */}
          <div style={{
            marginBottom: 24,
            padding: 16,
            background: 'rgba(255,213,168,0.12)',
            border: '1px solid rgba(200,149,108,0.25)',
            borderRadius: 16,
          }}>
            <div style={{ ...fieldLabel, marginBottom: 4 }}>
              Travel mode <span style={{ color: '#a89278', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </div>
            <p style={{ fontSize: 12, color: '#7a6a4f', margin: '0 0 12px', lineHeight: 1.4 }}>
              Heading somewhere for a shoot, festival, or visit? Set where and when so creators there can find you.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={subLabel}>Destination city</label>
                <input
                  type="text"
                  placeholder="New York"
                  value={travelCity}
                  onChange={(e) => setTravelCity(e.target.value.slice(0, 60))}
                  style={fieldInput}
                />
              </div>
              <div>
                <label style={subLabel}>State</label>
                <input
                  type="text"
                  placeholder="NY"
                  value={travelState}
                  onChange={(e) => setTravelState(e.target.value.slice(0, 40))}
                  style={fieldInput}
                />
              </div>
            </div>
            <div>
              <label style={subLabel}>Travel ends</label>
              <input
                type="date"
                value={travelEndsAt}
                onChange={(e) => setTravelEndsAt(e.target.value)}
                style={fieldInput}
              />
            </div>
            {(travelCity || travelState || travelEndsAt) && (
              <button
                type="button"
                onClick={() => { setTravelCity(''); setTravelState(''); setTravelEndsAt(''); }}
                style={{
                  marginTop: 10,
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid rgba(200,149,108,0.35)',
                  borderRadius: 100,
                  color: '#8a7560',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Clear travel mode
              </button>
            )}
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

          {/* Profile Prompts Section */}
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
                  Profile Prompts
                </label>
                <p style={{ color: '#b0967e', fontSize: 13, marginTop: 4 }}>
                  Pick up to {MAX_PROMPTS} prompts. Short, fun answers work best.
                </p>
              </div>
              {profilePrompts.length < MAX_PROMPTS && (
                <button
                  type="button"
                  onClick={addProfilePrompt}
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
                  + Add Prompt
                </button>
              )}
            </div>

            {profilePrompts.length === 0 && (
              <div style={{
                background: 'white',
                border: '1px dashed rgba(200,149,108,0.3)',
                borderRadius: 16,
                padding: '32px',
                textAlign: 'center',
                color: '#a89278',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                <p style={{ fontSize: 14 }}>No prompts yet.</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Pick a prompt to give people a fun way in.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              {profilePrompts.map((p, index) => {
                // Show the user every prompt, but disable any that are
                // already taken in another row to prevent duplicates.
                const taken = new Set(
                  profilePrompts.map((x, i) => (i === index ? null : x.prompt)).filter(Boolean) as string[],
                );
                const remaining = MAX_ANSWER_LENGTH - p.answer.length;
                return (
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
                        Prompt
                      </label>
                      <select
                        value={p.prompt}
                        onChange={(e) => updateProfilePrompt(index, 'prompt', e.target.value)}
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
                        {PROFILE_PROMPTS.map((opt) => (
                          <option key={opt} value={opt} disabled={taken.has(opt)}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#6b5744',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        <span>Your answer</span>
                        <span style={{ color: remaining < 20 ? '#c07070' : '#a89278', fontWeight: 600 }}>
                          {remaining}
                        </span>
                      </label>
                      <textarea
                        value={p.answer}
                        onChange={(e) => updateProfilePrompt(index, 'answer', e.target.value.slice(0, MAX_ANSWER_LENGTH))}
                        maxLength={MAX_ANSWER_LENGTH}
                        rows={2}
                        placeholder="Keep it short and you — one or two sentences."
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '1px solid rgba(200,149,108,0.25)',
                          background: '#faf6f0',
                          fontSize: 14,
                          color: '#1a1208',
                          outline: 'none',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProfilePrompt(index)}
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
                );
              })}
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

      {/* One-time tour of the new Edit Profile additions. */}
      <FeatureTutorial
        storageKey="mitype-edit-profile-features-v2"
        eyebrow="New in Edit Profile"
        slides={[
          {
            icon: '📸',
            title: 'Full photo editor',
            body: 'Every photo you upload now opens in a built-in editor — crop with aspect locks, rotate, flip, color filters, adjustment sliders, and beauty enhancements. Tap "Edit" on any existing photo to re-edit it later.',
          },
          {
            icon: '🏪',
            title: 'Small Business profile',
            body: 'Run a business? The purple "Run a small business?" card opens a dedicated editor — logo, services, contact info, social, and upcoming events.',
          },
          {
            icon: '🌐',
            title: 'Online-only businesses',
            body: 'Brick-and-mortar isn’t required. Flip the new "online-only" toggle inside the business editor and pick a label like Online Store, Boutique, Service, or Coaching — your website becomes your storefront.',
          },
          {
            icon: '🏪',
            title: 'Recommend small businesses',
            body: 'Save a business on Mitype, then recommend it on your profile. Up to 10 picks — they appear in a purple section on your profile to help your favorite small businesses reach more people.',
          },
          {
            icon: '🐾',
            title: 'Got a pet? Add Mipet tags',
            body: 'Flip the "Got a pet?" toggle to add your pet — name, type, birthday, favorite activity, food, photo, and a 200-char bio. A bronze Mipet dog tag will hang from your profile card.',
          },
          {
            icon: '🎨',
            title: 'Pick your tag bezel color',
            body: 'Choose any of 10 outer-ring colors for your pet’s tag — gold, silver, rose, black, pink, red, blue, teal, green, or purple.',
          },
        ]}
      />
    </main>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#6b5744',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};
const subLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#7a6a4f',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};
const fieldInput: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid rgba(200,149,108,0.25)',
  background: 'white',
  fontSize: 15,
  color: '#1a1208',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};