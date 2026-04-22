'use client';
import { useState } from 'react';
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

export default function CreateProfilePage() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function toggleCategory(cat: string) {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else if (selectedCategories.length < 5) {
      setSelectedCategories([...selectedCategories, cat]);
    } else {
      alert('You can select up to 5 categories');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }
    if (selectedCategories.length === 0) {
      alert('Please select at least one category');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { error } = await supabase.from('profiles').insert({
      user_id: user.id,
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      categories: selectedCategories,
      zip_code: zipCode.trim(),
      website_url: websiteUrl.trim(),
      social_links: [],
    });

    if (error) {
      if (error.code === '23505') {
        alert('That username is already taken. Please choose another.');
      } else {
        alert(error.message);
      }
      setLoading(false);
      return;
    }

    router.push('/subscription');
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      padding: '60px 24px',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#c8956c',
            letterSpacing: '-1px',
            marginBottom: 40,
          }}>
            mitype
          </div>
        </Link>

        <h1 style={{
          fontSize: 36,
          fontWeight: 800,
          color: '#1a1208',
          marginBottom: 8,
          letterSpacing: '-1px',
        }}>
          Set up your profile
        </h1>
        <p style={{
          color: '#a89278',
          fontSize: 16,
          marginBottom: 40,
        }}>
          Tell the world who you are and what you're passionate about.
        </p>

        <form onSubmit={handleSubmit}>

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
                fontSize: 16,
              }}>@</span>
              <input
                type="text"
                placeholder="yourcreativename"
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
            <p style={{ color: '#b0967e', fontSize: 12, marginTop: 6 }}>
              Letters, numbers and underscores only
            </p>
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
              placeholder="Tell people about yourself, your work, and what you're looking for..."
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
            <p style={{ color: '#b0967e', fontSize: 12, marginTop: 6, textAlign: 'right' }}>
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
              Your Categories * (pick up to 5)
            </label>
            <p style={{ color: '#b0967e', fontSize: 13, marginBottom: 16 }}>
              {selectedCategories.length}/5 selected
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}>
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
                      transition: 'all 0.15s',
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
            <p style={{ color: '#b0967e', fontSize: 12, marginTop: 6 }}>
              Used for local discovery. Never shown publicly.
            </p>
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#d4a882' : '#c8956c',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 17,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
            }}
          >
            {loading ? 'Saving...' : 'Save Profile & Continue →'}
          </button>

        </form>
      </div>
    </main>
  );
}