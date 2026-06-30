import Link from 'next/link';
import { OddcastPill } from './components/OddcastPill';
import { ScrollIndicator } from './components/ScrollIndicator';
import { RefBadge } from './components/RefBadge';
import { CategoryShowcase } from './components/CategoryShowcase';
import { FeatureExplorer, type Feature } from './components/FeatureExplorer';

// Full feature roster shown in the "Why Mitype" explorer. Each card is
// clickable and opens a modal with the long-form pitch. We surface the
// original 6 trust pillars plus every major feature shipped since
// (Wave, Daily Spark, Small Business, Mi Home Goods, Messages + games,
// Rooms/Groups, Endorsements, Mipets) so curious visitors can see the
// full breadth without scrolling four screens.
const FEATURES: Feature[] = [
  // Original trust pillars (smaller cards, full pitch on click).
  {
    icon: '🤝',
    tone: 'personal',
    title: 'Connect With Purpose',
    blurb: 'Real profiles of creators who share your craft.',
    body: 'Mitype is built around real, considered profiles, not endless swipes. Browse creators in your area, see what they actually do, and reach out when you find someone you click with.',
  },
  {
    icon: '🔐',
    tone: 'personal',
    title: 'You Control Your Inbox',
    blurb: 'Every message request needs your approval first.',
    body: 'No spam, no cold openers piling up. Every new conversation lands as a request you can accept or skip. Your inbox stays yours.',
  },
  {
    icon: '🎯',
    tone: 'personal',
    title: 'Filter By What Matters',
    blurb: 'Search by category, city, distance, and ZIP.',
    body: 'Find a guitarist in your neighborhood, a chef across town, or a photographer in the next state over. Filter Discover by category, ZIP, city, or distance — and toggle a "near me" view that respects how far you actually want to travel.',
  },
  {
    icon: '🔗',
    tone: 'personal',
    title: 'Share Your Profile',
    blurb: 'One public link for any social platform.',
    body: 'Your Mitype URL is portable. Drop it in an Instagram bio, a TikTok pinned comment, or a business card. People who tap it land on your profile no matter where they came from.',
  },
  {
    icon: '🛡️',
    tone: 'personal',
    title: 'Safe & Private',
    blurb: 'Your email and personal details stay yours.',
    body: 'We never expose your email, phone number, or location beyond what you choose to display. Block and report are one tap away on every profile and every video.',
  },
  {
    icon: '📍',
    tone: 'personal',
    title: 'Local First',
    blurb: 'Find creators in your actual neighborhood.',
    body: 'Distance-aware feeds make sure your daily picks include people you could realistically meet. Heading somewhere new? Travel mode tells the local Mitype crowd you\'re in town.',
  },

  // New features.
  {
    icon: '🌊',
    tone: 'personal',
    title: 'The Wave Feed',
    blurb: 'Short, 60-second videos from your community.',
    body: 'Post a 60-second clip of what you are working on. The Wave Feed surfaces fresh videos from creators you are compatible with, ranked by craft overlap. Likes, undo skips, and double-tap-to-like are built in.',
  },
  {
    icon: '🌀',
    tone: 'personal',
    title: 'The Current',
    blurb: 'Text drops with rich entity embeds. A feed unlike any other.',
    body: 'The Current is Mitype\'s text-post feed. Drop a thought up to 500 characters, reply in threads, and Echo posts you like. The signature: you can @mention any user, small business, or Mi Home Goods listing and the feed renders a rich card for it inline.',
    bullets: [
      '500-character drops with threaded replies.',
      'Echoes instead of likes. No public follower counts, no view counters.',
      '@username, @biz/business-handle, and @goods/listing-id all render as rich embed cards inline.',
      'Subscription-gated for posting to keep the feed bot-free and signal-heavy.',
    ],
  },
  {
    icon: '✨',
    tone: 'personal',
    title: 'Daily Spark',
    blurb: 'One hand-picked profile per day, with an opener.',
    body: 'Every morning Mitype picks one creator we think you should meet and writes a personalized icebreaker based on their profile prompts. Edit the opener, send it, or skip — your call.',
  },
  {
    icon: '🏪',
    tone: 'business',
    title: 'Small Business profiles',
    blurb: 'Run a shop, online or local.',
    body: 'Mitype gives small businesses a clean home: logo, services, hours, contact buttons, social links, and events. Local discovery + word-of-mouth recommendations make sure the right people find you.',
    bullets: [
      'Your own business page. Logo, services, contact buttons, hours, links, and events. Free to set up.',
      'Discoverable in your zip code — Mitype members in your area see your business in the local list, filterable by category.',
      'Daily Business Spotlight — one small business gets a hero card on Discover seen by every member, every day. Free exposure on rotation.',
      'Customer recommendations — your connections can recommend your business right on their own profile. Word-of-mouth, made visible.',
      'Online-only? Totally fine. Etsy, Shopify, custom clothing, e-books, online courses — pick from 130+ business types, no storefront required.',
      'Direct messages from real members. No DM spam, no bot inbox.',
    ],
  },
  {
    icon: '🏡',
    tone: 'market',
    title: 'Mi Home Goods',
    blurb: 'Buy and sell with your Mitype community.',
    body: 'A peer-to-peer marketplace for furniture, electronics, vintage finds, free stuff, and more. Post up to 4 photos per listing, set a price (or mark it free / OBO), and meet in person. Mitype is not the middleman — just the introduction.',
    bullets: [
      'Up to 4 photos and a clear description per listing.',
      'Brand new, like-new, gently used, used, or for parts — be honest, sell faster.',
      'Save items you\'re watching, message sellers directly through Mitype.',
      'Seller stats card on every listing: member-since, active listings, sold count.',
      'Safety guidelines baked in. Meet in public, bring a friend, trust your gut.',
    ],
  },
  {
    icon: '💬',
    tone: 'personal',
    title: 'Messages, Games & Voice',
    blurb: '14 mini-games, Story Builder, voice notes, photos.',
    body: 'Mitype messaging is a real chat, not a stripped-down DM box. Send voice notes, share photos, and challenge a friend to one of 14 built-in games (Chess, Battleship, Pictionary, Word Duel, Trivia Battle, Hangman, and more). The collaborative Story Builder lets you co-write a story and export it as a shareable image.',
  },
  {
    icon: '🛋️',
    tone: 'personal',
    title: 'Rooms & Groups',
    blurb: 'Open chat by interest. Private group chats.',
    body: 'Rooms are public chat lounges organized by interest — film geeks, beat-makers, plant parents — with daily prompts to keep conversation alive. Groups are private chats for your crew. Both come with the full messaging toolkit.',
  },
  {
    icon: '💜',
    tone: 'personal',
    title: 'Endorsements',
    blurb: 'Peer testimonials on your profile.',
    body: 'Anyone you\'ve messaged can leave a short endorsement on your profile — the social proof that says "I worked with this person and here\'s what they\'re actually like." Public, honest, and stackable.',
  },
  {
    icon: '🐾',
    tone: 'personal',
    title: 'Mipets',
    blurb: 'Show off your pet with a hanging tag.',
    body: 'Add your pet\'s name, type, birthday, favorite snack, and a short bio. A small tag hangs from the top of your profile card with your choice of bezel color. A simple way to add character to your profile.',
  },
];


export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--brand-personal-bg-cream-deep)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: 'var(--brand-text-primary)',
      overflowX: 'hidden',
    }}>

      {/* "Invited by @username" badge — appears only when ?ref=… is in URL */}
      <RefBadge />

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
          color: 'var(--brand-personal)',
        }}>
          mitype
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{
            color: 'var(--brand-personal-text-mid)',
            textDecoration: 'none',
            fontSize: 15,
            padding: '8px 20px',
            borderRadius: 100,
          }}>
            Sign In
          </Link>
          <Link href="/signup" style={{
            background: 'var(--brand-personal)',
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
        // flex-start (was 'center') anchors content to the top of the
        // hero with a measured offset, instead of dead-centering it
        // between the top of the viewport and the scroll pill. The
        // previous centering produced a big empty gap above the
        // headline on phones AND pushed the scroll pill below the fold.
        justifyContent: 'flex-start',
        textAlign: 'center',
        // Top padding clears the fixed nav (~80px tall) and gives a
        // breathing room band; bottom padding leaves room for the
        // absolutely-positioned scroll pill without crowding it.
        padding: '110px 24px 110px',
        position: 'relative',
        background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
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

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(44px, 8vw, 90px)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-2.5px',
          marginBottom: 12,
          maxWidth: 820,
          color: 'var(--brand-text-primary)',
        }}>
          Connect with people who
          <br />
          <span style={{ color: 'var(--brand-personal)' }}>
            share your world
          </span>
        </h1>

        {/* Tagline — smaller print sits right under the headline. Black
            for stronger emphasis against the cream background. */}
        <p style={{
          fontSize: 'clamp(13px, 1.5vw, 16px)',
          color: 'var(--brand-text-primary)',
          fontWeight: 800,
          letterSpacing: '1.8px',
          textTransform: 'uppercase',
          marginBottom: 18,
        }}>
          The social media that networks
        </p>

        {/* Supporting copy — kept but trimmed and shrunk so the hero
            stays compact enough that the scroll hint fits on screen. */}
        <p style={{
          fontSize: 'clamp(13px, 1.6vw, 15px)',
          color: 'var(--brand-personal-text-mid)',
          maxWidth: 460,
          lineHeight: 1.55,
          marginBottom: 26,
        }}>
          Mitype connects creative professionals, hobbyists, and passionate people based on what they actually love doing. Not just how they look.
        </p>

        {/* CTAs stacked vertically — Create a profile on top, Sign In
            beneath. Same width so they line up cleanly on every screen.
            Centered as a column on phones and small tablets. */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
          marginBottom: 18,
          width: '100%',
          maxWidth: 280,
        }}>
          <Link href="/signup" style={{
            background: 'var(--brand-personal)',
            color: 'white',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 700,
            padding: '14px 36px',
            borderRadius: 100,
            boxShadow: '0 8px 32px rgba(200,149,108,0.35)',
            width: '100%',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}>
            Create a profile →
          </Link>
          <Link href="/login" style={{
            border: '1px solid rgba(138,117,96,0.3)',
            color: 'var(--brand-personal-text-mid)',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 500,
            padding: '14px 36px',
            borderRadius: 100,
            background: 'white',
            width: '100%',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}>
            Sign In
          </Link>
        </div>

        {/* Social proof line — centered under the buttons, emoji-free. */}
        <p style={{
          textAlign: 'center',
          color: 'var(--brand-personal-text-light)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.3px',
          margin: 0,
        }}>
          Thousands of creatives already collaborating
        </p>

        {/* Scroll-down hint — bounces gently, fades out on first scroll */}
        <ScrollIndicator />
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
            color: 'var(--brand-personal)',
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
            color: 'var(--brand-text-primary)',
          }}>
            Every type of creator. One platform.
          </h2>

          {/* Featured: Oddcast — solo at the top. Clickable pill that opens
              a modal explaining the category. */}
          <OddcastPill />

          {/* CategoryShowcase keeps the page tight on mobile: it
              shows the first 20 categories by default with a "+N more"
              button that expands the full list on tap. */}
          <CategoryShowcase
            categories={[
              // Creative Arts
              'Painters', 'Writers', 'Photographers', 'Actors',
              'Dancers', 'Filmmakers', 'Illustrators', 'Sculptors',
              'Poets', 'Storytellers', 'Graphic Designers', 'Art Directors',
              'Tattoo Artists', 'Music Producers', 'Film Producers',
              'Comedians', 'Entertainers', 'Magicians',
              // Music
              'Musicians', 'Pianists', 'Guitarists', 'Singers',
              'Drummers', 'Violinists', 'Brass Players', 'DJs',
              'Composers', 'Saxophonists',
              // Digital & Content
              'Content Creators', 'Gamers', 'YouTubers', 'Influencers',
              'Bloggers', 'Podcasters', 'Streamers', 'Esports Players',
              'Web Developers', 'App Developers', 'AI Enthusiasts',
              'Motivational Speakers', 'Radio Personalities',
              // Healthcare
              'Doctors', 'Nurses', 'Dentists', 'Therapists',
              'Pharmacists', 'Physical Therapists', 'Scientists',
              'Nutritionists', 'Herbalists',
              // Education
              'Teachers', 'Professors', 'Tutors', 'School Counselors',
              'Researchers', 'Historians',
              // Fitness & Outdoors
              'Athletes', 'Yoga Instructors', 'Cyclists', 'Swimmers',
              'Skiers', 'Surfers', 'Rock Climbers', 'Boxers',
              'Equestrians', 'Tennis Players', 'Soccer Players',
              'Personal Trainers', 'Anglers', 'Campers', 'Hikers',
              // Food & Lifestyle
              'Chefs', 'Bakers', 'Sommeliers', 'Foodies',
              'Vegans', 'Baristas', 'Food Bloggers',
              // Animals & Nature
              'Dog Walkers', 'Cat Lovers', 'Pet Trainers',
              'Gardeners', 'Nature Lovers', 'Marine Biologists',
              'Homesteaders', 'Farmers', 'Beekeepers',
              // Enthusiasts
              'Car Enthusiasts', 'Motorcyclists', 'Pilots',
              'Sailors', 'Space Enthusiasts', 'Film Photographers',
              // Professional
              'Entrepreneurs', 'Lawyers', 'Architects',
              'Engineers', 'Finance Professionals', 'Marketing Creatives',
              'Real Estate Agents', 'Fashion Designers', 'Stylists',
              'Hair Stylists', 'Nail Artists', 'Mechanics',
              'Contractors', 'Electricians', 'Firefighters',
              'Law Enforcement', 'Military',
              'Event Organizers', 'Sneaker Resellers',
              // Travel & Culture
              'Travelers', 'Expats', 'Adventurers',
              'Cultural Enthusiasts', 'Spiritual Seekers',
              // Pop Culture & Fandoms
              'Anime Fans', 'Pokémon Fans', 'Movie Buffs', 'TV Show Fans',
              'Marvel Fans', 'DC Fans', 'Star Wars Fans', 'Disney Adults',
              'K-Pop Fans', 'Comic Book Fans',
              // Sports Fans
              'Football Fans', 'Baseball Fans', 'Basketball Fans',
              'Soccer Fans', 'Hockey Fans', 'MMA Fans', 'Racing Fans',
              // Hobbies
              'Chess Players', 'Board Gamers', 'Book Lovers',
              'Book Club Members',
              'Astronomers', 'Collectors', 'Puzzle Enthusiasts',
              'Plant Parents', 'Knitters', 'Woodworkers',
              'Card Collectors', 'Pokémon Collectors', 'Lego Collectors',
              'Sneakerheads', 'Vinyl Collectors', 'Watch Collectors',
              // Mindset & Lifestyle
              'Free Thinkers', 'Alternative Media', 'Truth Seekers',
              'Minimalists', 'Visionaries',
              'Faith Based', 'Activists', 'Environmentalists',
            ]}
          />
        </div>
      </section>

      {/* Why Mitype — clickable feature explorer. Each tile opens a
          modal with the longer pitch so the page stays compact while
          still surfacing every feature on the platform. */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{
            color: 'var(--brand-personal)',
            fontSize: 12,
            letterSpacing: 4,
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 14,
          }}>
            Why Mitype
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: 'var(--brand-text-primary)',
            margin: 0,
          }}>
            Built different. On purpose.
          </h2>
          <p style={{
            margin: '12px auto 0',
            maxWidth: 540,
            color: 'var(--brand-personal-text-mid)',
            fontSize: 15,
            lineHeight: 1.55,
          }}>
            Tap any card to see how it works.
          </p>
        </div>

        <FeatureExplorer features={FEATURES} />
      </section>

      {/* Pricing */}
      <section style={{
        padding: '80px 24px',
        background: '#fff9f2',
        borderTop: '1px solid rgba(200,149,108,0.12)',
        textAlign: 'center',
      }}>
        <p style={{
          color: 'var(--brand-personal)',
          fontSize: 12,
          letterSpacing: 4,
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 16,
        }}>
          Pricing
        </p>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 800,
          letterSpacing: '-1px',
          marginBottom: 36,
          color: 'var(--brand-text-primary)',
        }}>
          One subscription. Every feature.
        </h2>

        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          background: 'white',
          border: '1px solid rgba(200,149,108,0.25)',
          borderRadius: 28,
          padding: '44px 36px 36px',
          boxShadow: '0 20px 60px rgba(200,149,108,0.1)',
          textAlign: 'left',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 4,
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 64, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-2px' }}>$5</span>
            <span style={{ color: 'var(--brand-personal-text-light)', fontSize: 17 }}>/month</span>
          </div>
          <p style={{
            color: 'var(--brand-personal)',
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 28,
            textAlign: 'center',
            letterSpacing: '0.3px',
          }}>
            First month free. Cancel anytime.
          </p>

          {/* Comprehensive feature list. Short bullets, no paragraphs.
              Grouped subtly (no headers) so the eye reads fast. */}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
            {[
              'Full Wave Feed access — post, watch, and connect',
              'The Current — text drops, replies, and rich entity embeds',
              'Unlimited Discover + a personalized Daily Spark each day',
              'Run a Small Business profile (local or online-only)',
              'Featured in the Daily Business Spotlight rotation',
              'Sell on Mi Home Goods, the community marketplace',
              'Unlimited messaging with voice notes and photos',
              '14 mini-games + collaborative Story Builder in chat',
              'Create unlimited Rooms and private Groups',
              'Endorsements, Mipets, and Featured Wave on your profile',
              'Filter people by category, city, distance, and ZIP',
              'Travel mode and Open-to-collab signaling',
              'Cancel anytime. No commitment.',
            ].map((item) => (
              <li key={item} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '9px 0',
                borderBottom: '1px solid rgba(200,149,108,0.08)',
                color: 'var(--brand-personal-text-head)',
                fontSize: 14,
                lineHeight: 1.4,
              }}>
                <span aria-hidden="true" style={{
                  width: 18,
                  height: 18,
                  background: 'rgba(200,149,108,0.15)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-personal)',
                  fontSize: 11,
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: 2,
                }}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <Link href="/signup" style={{
            display: 'block',
            background: 'var(--brand-personal)',
            color: 'white',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 800,
            padding: '15px 32px',
            borderRadius: 100,
            boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
            textAlign: 'center',
            letterSpacing: '0.3px',
          }}>
            Start your free month
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: '100px 24px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, var(--brand-personal-bg-cream-deep) 0%, #ede5d8 100%)',
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 60px)',
          fontWeight: 900,
          letterSpacing: '-1.5px',
          marginBottom: 16,
          color: 'var(--brand-text-primary)',
        }}>
          Your type of people are out there.
        </h2>
        <p style={{
          color: 'var(--brand-personal-text-mid)',
          fontSize: 18,
          marginBottom: 48,
          maxWidth: 400,
          margin: '0 auto 48px',
        }}>
          Connect with people who share your world.
        </p>
        <Link href="/signup" style={{
          background: 'var(--brand-personal)',
          color: 'white',
          textDecoration: 'none',
          fontSize: 18,
          fontWeight: 700,
          padding: '18px 52px',
          borderRadius: 100,
          boxShadow: '0 8px 32px rgba(200,149,108,0.35)',
          display: 'inline-block',
        }}>
          Create a profile →
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
        background: 'var(--brand-personal-bg-cream-deep)',
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          color: 'var(--brand-personal)',
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
              color: 'var(--brand-personal-text-light)',
              textDecoration: 'none',
              fontSize: 14,
            }}>
              {link.label}
            </Link>
          ))}
        </div>
        <p style={{ color: '#c4aa90', fontSize: 13 }}>
          © {new Date().getFullYear()} Mitype · www.mitypeapp.com
        </p>
      </footer>

    </main>
  );
}