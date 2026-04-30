import Link from 'next/link';
import { OddcastPill } from './components/OddcastPill';

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#f5f0e8',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: '#1a1208',
      overflowX: 'hidden',
    }}>

      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(245,240,232,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(180,155,120,0.2)',
      }}>
        <div style={{
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: '-1px',
          color: '#c8956c',
        }}>
          mitype
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{
            color: '#8a7560',
            textDecoration: 'none',
            fontSize: 15,
            padding: '8px 20px',
            borderRadius: 100,
          }}>
            Sign In
          </Link>
          <Link href="/signup" style={{
            background: '#c8956c',
            color: 'white',
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 700,
            padding: '10px 26px',
            borderRadius: 100,
            boxShadow: '0 4px 20px rgba(200,149,108,0.3)',
          }}>
            Join now
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '140px 24px 80px',
        position: 'relative',
        background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      }}>
        {/* Soft background circle */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 700,
          background: 'radial-gradient(circle, rgba(200,149,108,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(200,149,108,0.12)',
          border: '1px solid rgba(200,149,108,0.3)',
          borderRadius: 100,
          padding: '7px 18px',
          marginBottom: 36,
          fontSize: 13,
          color: '#c8956c',
          fontWeight: 600,
        }}>
          <span style={{
            width: 7,
            height: 7,
            background: '#c8956c',
            borderRadius: '50%',
            display: 'inline-block',
          }} />
          Connect with people who share your world
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(44px, 8vw, 90px)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-2.5px',
          marginBottom: 24,
          maxWidth: 820,
          color: '#1a1208',
        }}>
          Meet creators who
          <br />
          <span style={{ color: '#c8956c' }}>
            share your craft
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: '#8a7560',
          maxWidth: 540,
          lineHeight: 1.8,
          marginBottom: 48,
        }}>
          Mitype connects creative professionals, hobbyists, and passionate people based on what they actually love doing — not just how they look.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72 }}>
          <Link href="/signup" style={{
            background: '#c8956c',
            color: 'white',
            textDecoration: 'none',
            fontSize: 17,
            fontWeight: 700,
            padding: '17px 44px',
            borderRadius: 100,
            boxShadow: '0 8px 32px rgba(200,149,108,0.35)',
          }}>
            Find Your Creator Type →
          </Link>
          <Link href="/login" style={{
            border: '1px solid rgba(138,117,96,0.3)',
            color: '#8a7560',
            textDecoration: 'none',
            fontSize: 17,
            fontWeight: 500,
            padding: '17px 44px',
            borderRadius: 100,
            background: 'white',
          }}>
            Sign In
          </Link>
        </div>

        {/* Avatars social proof */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          color: '#a89278',
          fontSize: 14,
        }}>
          <div style={{ display: 'flex' }}>
            {['🎨','🎵','📸','✍️','🎬','🎮','🐶','🎹'].map((e, i) => (
              <div key={i} style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: `hsl(${30 + i * 15}, 40%, 80%)`,
                border: '2px solid #f5f0e8',
                marginLeft: i === 0 ? 0 : -10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
              }}>
                {e}
              </div>
            ))}
          </div>
          <span>Thousands of creatives already collaborating</span>
        </div>
      </section>

      {/* Categories Section */}
      <section style={{
        padding: '100px 24px',
        background: '#fff9f2',
        borderTop: '1px solid rgba(200,149,108,0.12)',
        borderBottom: '1px solid rgba(200,149,108,0.12)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            color: '#c8956c',
            fontSize: 12,
            letterSpacing: 4,
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 16,
          }}>
            Who you'll connect with
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800,
            letterSpacing: '-1px',
            marginBottom: 48,
            color: '#1a1208',
          }}>
            Every type of creator. One platform.
          </h2>

          {/* Featured: Oddcast — solo at the top. Clickable pill that opens
              a modal explaining the category. */}
          <OddcastPill />

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
          }}>
            {[
              // 🎨 Creative Arts
              '🎨 Painters', '✍️ Writers', '📸 Photographers', '🎭 Actors',
              '💃 Dancers', '🎬 Filmmakers', '🖌️ Illustrators', '🗿 Sculptors',
              '📖 Poets', '🎙️ Storytellers', '✏️ Graphic Designers', '🖼️ Art Directors',
              '🪶 Tattoo Artists', '🎚️ Music Producers', '🎬 Film Producers',
              '🎤 Comedians', '🎪 Entertainers', '🃏 Magicians',
              // 🎵 Music
              '🎵 Musicians', '🎹 Pianists', '🎸 Guitarists', '🎤 Singers',
              '🥁 Drummers', '🎻 Violinists', '🎺 Brass Players', '🎧 DJs',
              '🎼 Composers', '🎷 Saxophonists',
              // 📱 Digital & Content
              '📱 Content Creators', '🎮 Gamers', '📺 YouTubers', '🤳 Influencers',
              '💻 Bloggers', '🎙️ Podcasters', '📡 Streamers', '👾 Esports Players',
              '🖥️ Web Developers', '📲 App Developers', '🤖 AI Enthusiasts',
              '🎙️ Motivational Speakers', '📻 Radio Personalities',
              // 🏥 Healthcare
              '🩺 Doctors', '👩‍⚕️ Nurses', '🦷 Dentists', '🧠 Therapists',
              '💊 Pharmacists', '🏃 Physical Therapists', '🧬 Scientists',
              '🥗 Nutritionists', '🌿 Herbalists',
              // 📚 Education
              '👩‍🏫 Teachers', '👨‍🎓 Professors', '📚 Tutors', '🏫 School Counselors',
              '🔬 Researchers', '📜 Historians',
              // 🏋️ Fitness & Outdoors
              '🏋️ Athletes', '🧘 Yoga Instructors', '🚴 Cyclists', '🏊 Swimmers',
              '⛷️ Skiers', '🏄 Surfers', '🧗 Rock Climbers', '🥊 Boxers',
              '🏇 Equestrians', '🎾 Tennis Players', '⚽ Soccer Players',
              '🏋️ Personal Trainers', '🎣 Anglers', '🏕️ Campers', '🏔️ Hikers',
              // 🍳 Food & Lifestyle
              '👨‍🍳 Chefs', '🧁 Bakers', '🍷 Sommeliers', '🌿 Foodies',
              '🌱 Vegans', '☕ Baristas', '🍕 Food Bloggers',
              // 🐾 Animals & Nature
              '🐶 Dog Walkers', '🐱 Cat Lovers', '🐾 Pet Trainers',
              '🌿 Gardeners', '🦋 Nature Lovers', '🐠 Marine Biologists',
              '🏡 Homesteaders', '🌾 Farmers', '🐝 Beekeepers',
              // 🚗 Enthusiasts
              '🏎️ Car Enthusiasts', '🏍️ Motorcyclists', '✈️ Pilots',
              '⛵ Sailors', '🚀 Space Enthusiasts', '📷 Film Photographers',
              // 💼 Professional
              '👔 Entrepreneurs', '⚖️ Lawyers', '🏛️ Architects',
              '🏗️ Engineers', '📊 Finance Professionals', '🎯 Marketing Creatives',
              '🏠 Real Estate Agents', '👗 Fashion Designers', '💈 Stylists',
              '💇 Hair Stylists', '💅 Nail Artists', '🔧 Mechanics',
              '🔨 Contractors', '⚡ Electricians', '🚒 Firefighters',
              '👮 Law Enforcement', '🪖 Military',
              '🎫 Event Organizers', '👟 Sneaker Resellers',
              // ✈️ Travel & Culture
              '✈️ Travelers', '🌍 Expats', '🗺️ Adventurers',
              '📿 Cultural Enthusiasts', '🛕 Spiritual Seekers',
              // 🎬 Pop Culture & Fandoms
              '🐉 Anime Fans', '🎴 Pokémon Fans', '🎬 Movie Buffs', '📺 TV Show Fans',
              '🦸 Marvel Fans', '🦇 DC Fans', '⭐ Star Wars Fans', '🏰 Disney Adults',
              '🎤 K-Pop Fans', '📚 Comic Book Fans',
              // 🏈 Sports Fans
              '🏈 Football Fans', '⚾ Baseball Fans', '🏀 Basketball Fans',
              '⚽ Soccer Fans', '🏒 Hockey Fans', '🥊 MMA Fans', '🏎️ Racing Fans',
              // 🎲 Hobbies
              '♟️ Chess Players', '🎲 Board Gamers', '📚 Book Lovers',
              '📖 Book Club Members',
              '🔭 Astronomers', '🎯 Collectors', '🧩 Puzzle Enthusiasts',
              '🪴 Plant Parents', '🧶 Knitters', '🪵 Woodworkers',
              '🎴 Card Collectors', '🎴 Pokémon Collectors', '🧱 Lego Collectors',
              '👟 Sneakerheads', '💿 Vinyl Collectors', '⌚ Watch Collectors',
              // 🌟 Mindset & Lifestyle
              '🌐 Free Thinkers', '📡 Alternative Media', '🔍 Truth Seekers',
              '🌱 Minimalists', '💡 Visionaries',
              '✝️ Faith Based', '☮️ Activists', '🌍 Environmentalists',
            ].map((cat) => (
              <div key={cat} style={{
                background: 'white',
                border: '1px solid rgba(200,149,108,0.2)',
                borderRadius: 100,
                padding: '9px 18px',
                fontSize: 13,
                color: '#6b5744',
                fontWeight: 500,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                {cat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{
            color: '#c8956c',
            fontSize: 12,
            letterSpacing: 4,
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 16,
          }}>
            Why Mitype
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 800,
            letterSpacing: '-1px',
            color: '#1a1208',
          }}>
            Built different. On purpose.
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {[
            {
              icon: '🤝',
              title: 'Connect With Purpose',
              desc: 'Browse real profiles of creators who share your craft. Tap to show interest in collaboration, or skip to keep browsing.',
              bg: '#fff3ec',
              border: 'rgba(200,149,108,0.2)',
            },
            {
              icon: '🔐',
              title: 'You Control Who Talks to You',
              desc: 'Every message request needs your approval first. You are always in control of your inbox.',
              bg: '#f5f5ec',
              border: 'rgba(180,175,130,0.25)',
            },
            {
              icon: '🎯',
              title: 'Filter By What Matters',
              desc: 'Search by creative category and ZIP code. Find a guitarist in your city or a chef across town.',
              bg: '#ecf5f0',
              border: 'rgba(130,175,150,0.25)',
            },
            {
              icon: '🔗',
              title: 'Share Your Profile',
              desc: 'Get a public profile link to share on social media so people can find you outside the app.',
              bg: '#f0ecf5',
              border: 'rgba(160,130,200,0.25)',
            },
            {
              icon: '🛡️',
              title: 'Safe & Private',
              desc: 'Your email and personal details are never shared. We only show what you choose to display.',
              bg: '#f5ecec',
              border: 'rgba(200,130,130,0.25)',
            },
            {
              icon: '📍',
              title: 'Local First',
              desc: 'Find creatives and passionate people right in your neighborhood or nearby ZIP codes.',
              bg: '#ecf2f5',
              border: 'rgba(130,160,200,0.25)',
            },
          ].map((f) => (
            <div key={f.title} style={{
              background: f.bg,
              border: `1px solid ${f.border}`,
              borderRadius: 24,
              padding: '36px 32px',
            }}>
              <div style={{ fontSize: 36, marginBottom: 20 }}>{f.icon}</div>
              <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 12, color: '#1a1208' }}>{f.title}</h3>
              <p style={{ color: '#8a7560', lineHeight: 1.7, fontSize: 15 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        padding: '80px 24px',
        background: '#fff9f2',
        borderTop: '1px solid rgba(200,149,108,0.12)',
        textAlign: 'center',
      }}>
        <p style={{
          color: '#c8956c',
          fontSize: 12,
          letterSpacing: 4,
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 16,
        }}>
          Pricing
        </p>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 800,
          letterSpacing: '-1px',
          marginBottom: 48,
          color: '#1a1208',
        }}>
          Simple. Affordable. Worth it.
        </h2>

        <div style={{
          maxWidth: 460,
          margin: '0 auto',
          background: 'white',
          border: '1px solid rgba(200,149,108,0.25)',
          borderRadius: 32,
          padding: '52px 40px',
          boxShadow: '0 20px 60px rgba(200,149,108,0.1)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 4,
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 72, fontWeight: 900, color: '#1a1208', letterSpacing: '-2px' }}>$5</span>
            <span style={{ color: '#a89278', fontSize: 18 }}>/month</span>
          </div>
          <p style={{ color: '#c8956c', fontWeight: 700, fontSize: 16, marginBottom: 40 }}>
            🎉 First month completely FREE
          </p>

          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 40, textAlign: 'left' }}>
            {[
              'Unlimited profile browsing',
              'Connect with any creator on the platform',
              'Full messaging after approval',
              'Filter by category & ZIP code',
              'Share your public profile link',
              'Cancel anytime — no commitment',
            ].map((item) => (
              <li key={item} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 0',
                borderBottom: '1px solid rgba(200,149,108,0.1)',
                color: '#6b5744',
                fontSize: 15,
              }}>
                <span style={{
                  width: 22,
                  height: 22,
                  background: 'rgba(200,149,108,0.15)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c8956c',
                  fontSize: 13,
                  flexShrink: 0,
                }}>✓</span>
                {item}
              </li>
            ))}
          </ul>

          <Link href="/signup" style={{
            display: 'block',
            background: '#c8956c',
            color: 'white',
            textDecoration: 'none',
            fontSize: 17,
            fontWeight: 700,
            padding: '17px 40px',
            borderRadius: 100,
            boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
          }}>
            Start Free Trial
          </Link>
          <p style={{ color: '#b0967e', fontSize: 13, marginTop: 16 }}>
            
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: '100px 24px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #f5f0e8 0%, #ede5d8 100%)',
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 60px)',
          fontWeight: 900,
          letterSpacing: '-1.5px',
          marginBottom: 16,
          color: '#1a1208',
        }}>
          Your type of people are out there.
        </h2>
        <p style={{
          color: '#8a7560',
          fontSize: 18,
          marginBottom: 48,
          maxWidth: 400,
          margin: '0 auto 48px',
        }}>
          Connect with people who share your world.
        </p>
        <Link href="/signup" style={{
          background: '#c8956c',
          color: 'white',
          textDecoration: 'none',
          fontSize: 18,
          fontWeight: 700,
          padding: '18px 52px',
          borderRadius: 100,
          boxShadow: '0 8px 32px rgba(200,149,108,0.35)',
          display: 'inline-block',
        }}>
          Find Your Type →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(200,149,108,0.15)',
        padding: '36px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        background: '#f5f0e8',
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          color: '#c8956c',
          letterSpacing: '-0.5px',
        }}>
          mitype
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Privacy Policy', href: '/legal/privacy' },
            { label: 'Terms of Service', href: '/legal/terms' },
            { label: 'Contact & Support', href: '/legal/contact' },
          ].map((link) => (
            <Link key={link.href} href={link.href} style={{
              color: '#a89278',
              textDecoration: 'none',
              fontSize: 14,
            }}>
              {link.label}
            </Link>
          ))}
        </div>
        <p style={{ color: '#c4aa90', fontSize: 13 }}>
          © {new Date().getFullYear()} Mitype · www.mitype.com
        </p>
      </footer>

    </main>
  );
}