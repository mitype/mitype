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

export default function EditProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
// Check subscription — redirect if not subscribed
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
        setSelectedCategories(profile.categories || []);
        setAvatarUrl(profile.avatar_url || '');
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
      alert('You can select up to 5 categories');
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      alert('Username is required');
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
      avatar_url: avatarUrl,
    }, { onConflict: 'user_id' });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    alert('Profile saved!');
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
      padding: '0 0 80px 0',
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
          ← Back to Dashboard
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
          Update your info, photo, and categories.
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
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 48 }}>👤</span>
              )}
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
            <p style={{ color: '#b0967e', fontSize: 12, marginTop: 8 }}>
              JPEG, PNG or WebP · Max 5MB
            </p>
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
          <div style={{ marginBottom: 40 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#6b5744',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Website or Portfolio
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