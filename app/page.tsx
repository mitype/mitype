import Link from 'next/link';
import './landing.css';
import { OddcastPill } from './components/OddcastPill';
import { RefBadge } from './components/RefBadge';
import { CategoryShowcase } from './components/CategoryShowcase';
import { LandingFeatures, type LandingFeature } from './components/landing/LandingFeatures';
import { LandingBackground } from './components/landing/LandingBackground';
import { HeroOrb } from './components/landing/HeroOrb';
import { LandingEffects, ScrollHint } from './components/landing/LandingEffects';

// Full feature roster shown in the "Built different. On purpose." grid.
// Each card is clickable and opens a modal with the long-form pitch.
const FEATURES: LandingFeature[] = [
  // Original trust pillars (smaller cards, full pitch on click).
  {
    tone: 'personal',
    title: 'Connect With Purpose',
    blurb: 'Real profiles of creators who share your craft.',
    body: 'Mitype is built around real, considered profiles, not endless swipes. Browse creators in your area, see what they actually do, and reach out when you find someone you click with.',
  },
  {
    logo: '/black-sheep-university/logo.png',
    tone: 'personal',
    title: 'Black Sheep University',
    wide: true,
    blurb: 'Masterclass training to help you succeed on other platforms.',
    body: 'Black Sheep University is professional creator training included with your membership. Each masterclass is built to help creators become successful on the other networks they use, with structured modules and lessons you can work through at your own pace. New masterclasses are added over time.',
  },
  {
    tone: 'personal',
    title: 'You Control Your Inbox',
    blurb: 'Every message request needs your approval first.',
    body: 'No spam, no cold openers piling up. Every new conversation lands as a request you can accept or skip. Your inbox stays yours.',
  },
  {
    tone: 'personal',
    title: 'Filter By What Matters',
    blurb: 'Search by category, city, distance, and ZIP.',
    body: 'Find a guitarist in your neighborhood, a chef across town, or a photographer in the next state over. Filter Discover by category, ZIP, city, or distance, and toggle a "near me" view that respects how far you actually want to travel.',
  },
  {
    tone: 'personal',
    title: 'Share Your Profile',
    blurb: 'One public link for any social platform.',
    body: 'Your Mitype URL is portable. Drop it in an Instagram bio, a TikTok pinned comment, or a business card. People who tap it land on your profile no matter where they came from.',
  },
  {
    tone: 'personal',
    title: 'Safe & Private',
    blurb: 'Your email and personal details stay yours.',
    body: 'We never expose your email, phone number, or location beyond what you choose to display. Block and report are one tap away on every profile and every video.',
  },
  {
    tone: 'personal',
    title: 'Local First',
    blurb: 'Find creators in your actual neighborhood.',
    body: 'Distance-aware feeds make sure your daily picks include people you could realistically meet. Heading somewhere new? Travel mode tells the local Mitype crowd you\'re in town.',
  },

  // New features.
  {
    tone: 'personal',
    title: 'The Wave Feed',
    wide: true,
    blurb: 'Short, 60-second videos from your community.',
    body: 'Post a 60-second clip of what you are working on. The Wave Feed surfaces fresh videos from creators you are compatible with, ranked by craft overlap. Likes, undo skips, and double-tap-to-like are built in.',
  },
  {
    tone: 'personal',
    title: 'MI Moments',
    blurb: 'A full screen photo carousel. Double tap to like.',
    body: 'MI Moments is a full screen photo carousel for members. Photos from the whole Mitype community spin past on a 3D carousel, mixed together, and every photo is shown before any repeat. Swipe to move through photos, double tap to like, and tap a name to visit that profile.',
    bullets: [
      'Post your own: crop and zoom, add a filter, adjust the brightness, then share.',
      'No limit on how many photos you post. Delete your own any time.',
      'Report anything that does not belong with one tap.',
    ],
  },
  {
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
    tone: 'personal',
    title: 'Daily Spark',
    blurb: 'One hand-picked profile per day, with an opener.',
    body: 'Every morning Mitype picks one creator we think you should meet and writes a personalized icebreaker based on their profile prompts. Edit the opener, send it, or skip. Your call.',
  },
  {
    tone: 'business',
    title: 'Small Business profiles',
    wide: true,
    blurb: 'Run a shop, online or local.',
    body: 'Mitype gives small businesses a clean home: logo, services, hours, contact buttons, social links, and events. Local discovery + word-of-mouth recommendations make sure the right people find you.',
    bullets: [
      'Your own business page. Logo, services, contact buttons, hours, links, and events. Free to set up.',
      'Discoverable in your zip code. Mitype members in your area see your business in the local list, filterable by category.',
      'Daily Business Spotlight. One small business gets a hero card on Discover seen by every member, every day. Free exposure on rotation.',
      'Customer recommendations. Your connections can recommend your business right on their own profile. Word-of-mouth, made visible.',
      'Online-only? Totally fine. Etsy, Shopify, custom clothing, e-books, online courses. Pick from 130+ business types, no storefront required.',
      'Direct messages from real members. No DM spam, no bot inbox.',
    ],
  },
  {
    tone: 'market',
    title: 'Mi Home Goods',
    blurb: 'Buy and sell with your Mitype community.',
    body: 'A peer-to-peer marketplace for furniture, electronics, vintage finds, free stuff, and more. Post up to 4 photos per listing, set a price (or mark it free / OBO), and meet in person. Mitype is not the middleman. Just the introduction.',
    bullets: [
      'Up to 4 photos and a clear description per listing.',
      'Brand new, like-new, gently used, used, or for parts. Be honest, sell faster.',
      'Save items you\'re watching, message sellers directly through Mitype.',
      'Seller stats card on every listing: member-since, active listings, sold count.',
      'Safety guidelines baked in. Meet in public, bring a friend, trust your gut.',
    ],
  },
  {
    tone: 'personal',
    title: 'Messages, Games & Voice',
    wide: true,
    blurb: '14 mini-games, Story Builder, voice notes, photos.',
    body: 'Mitype messaging is a real chat, not a stripped-down DM box. Send voice notes, share photos, and challenge a friend to one of 14 built-in games (Chess, Battleship, Pictionary, Word Duel, Trivia Battle, Hangman, and more). The collaborative Story Builder lets you co-write a story and export it as a shareable image.',
  },
  {
    tone: 'personal',
    title: 'Rooms & Groups',
    blurb: 'Open chat by interest. Private group chats.',
    body: 'Rooms are public chat lounges organized by interest like film geeks, beat-makers, and plant parents, with daily prompts to keep conversation alive. Groups are private chats for your crew. Both come with the full messaging toolkit.',
  },
  {
    tone: 'personal',
    title: 'Endorsements',
    blurb: 'Peer testimonials on your profile.',
    body: 'Anyone you\'ve messaged can leave a short endorsement on your profile. The social proof that says "I worked with this person and here\'s what they\'re actually like." Public, honest, and stackable.',
  },
  {
    tone: 'personal',
    title: 'Mipets',
    blurb: 'Show off your pet with a hanging tag.',
    body: 'Add your pet\'s name, type, birthday, favorite snack, and a short bio. A small tag hangs from the top of your profile card with your choice of bezel color. A simple way to add character to your profile.',
  },
];

const CATEGORIES: string[] = [
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
            ];

const PRICING_ITEMS: string[] = [
  'Full Wave Feed access: post, watch, and connect',
  'MI Moments, the full screen photo carousel',
  'The Current: text drops, replies, and rich entity embeds',
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
];

export default function HomePage() {
  return (
    <main className="lp-root">
      <LandingBackground />
      <LandingEffects />

      {/* "Invited by @username" badge, appears only when ?ref=... is in URL */}
      <RefBadge />

      <nav className="lp-nav" aria-label="Main">
        <Link href="/" className="lp-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" aria-hidden="true" />
          mitype
        </Link>
        <div className="lp-nl">
          <Link href="/login" className="lp-btn lp-gh lp-sm">Sign In</Link>
          <Link href="/signup" className="lp-btn lp-pri lp-sm">Join now</Link>
        </div>
      </nav>

      <div className="lp-layer">
        {/* Hero */}
        <section className="lp-hero" aria-labelledby="lp-hero-title">
          <div>
            <div className="lp-mono lp-rv">The social media that networks</div>
            <h1 id="lp-hero-title" className="lp-rv" style={{ ['--i' as string]: 1 }}>
              Find your type <span>of people.</span>
            </h1>
            <p className="lp-lead lp-rv" style={{ ['--i' as string]: 2 }}>
              Mitype connects creative professionals, hobbyists, and passionate people based on what they actually love doing. Not just how they look.
            </p>
            <div className="lp-cta lp-rv" style={{ ['--i' as string]: 3 }}>
              <Link href="/signup" className="lp-btn lp-pri">Create a profile →</Link>
              <Link href="/login" className="lp-btn lp-gh">Sign In</Link>
            </div>
            <p className="lp-proof lp-rv" style={{ ['--i' as string]: 4 }}>
              Thousands of creatives already collaborating
            </p>
          </div>
          <HeroOrb />
          <ScrollHint />
        </section>

        {/* How the signal travels */}
        <section className="lp-sec" aria-labelledby="lp-how-title">
          <div className="lp-mono lp-rv">How the signal travels</div>
          <h2 id="lp-how-title" className="lp-h2 lp-rv" style={{ ['--i' as string]: 1 }}>
            From your craft to the right people.
          </h2>
          <div className="lp-path">
            <div className="lp-track"><div className="lp-fill" /></div>
            <div className="lp-step lp-rv">
              <span className="lp-dot" />
              <div className="lp-mono">01</div>
              <h3>Build your profile</h3>
              <p>Share your craft, your city, and what you make. Real profiles, not endless swipes.</p>
            </div>
            <div className="lp-step lp-rv" style={{ ['--i' as string]: 1 }}>
              <span className="lp-dot" />
              <div className="lp-mono">02</div>
              <h3>Get matched by craft</h3>
              <p>Discover ranks creators by what you do and where you are, with one hand picked profile every day.</p>
            </div>
            <div className="lp-step lp-rv" style={{ ['--i' as string]: 2 }}>
              <span className="lp-dot" />
              <div className="lp-mono">03</div>
              <h3>Connect on your terms</h3>
              <p>Every message request needs your approval first. Your inbox stays yours.</p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="lp-sec lp-center" aria-labelledby="lp-cat-title">
          <div className="lp-mono lp-rv">Who you&apos;ll connect with</div>
          <h2 id="lp-cat-title" className="lp-h2 lp-rv" style={{ ['--i' as string]: 1 }}>
            Every type of creator. One platform.
          </h2>
          <div className="lp-oddwrap">
            <OddcastPill dark />
          </div>
          <div style={{ marginTop: 22 }}>
            <CategoryShowcase dark categories={CATEGORIES} />
          </div>
        </section>

        {/* Why Mitype: clickable feature grid */}
        <section className="lp-sec" aria-labelledby="lp-why-title">
          <div className="lp-center">
            <div className="lp-mono lp-rv">Why Mitype</div>
            <h2 id="lp-why-title" className="lp-h2 lp-rv" style={{ ['--i' as string]: 1 }}>
              Built different. On purpose.
            </h2>
            <p className="lp-sub lp-rv" style={{ ['--i' as string]: 2 }}>
              Everything your craft needs, in one place. Tap any card to see how it works.
            </p>
          </div>
          <LandingFeatures features={FEATURES} />
        </section>

        {/* Pricing */}
        <section className="lp-sec lp-center" aria-labelledby="lp-price-title">
          <div className="lp-mono lp-rv">Pricing</div>
          <h2 id="lp-price-title" className="lp-h2 lp-rv" style={{ ['--i' as string]: 1 }}>
            One subscription. Every feature.
          </h2>
          <div className="lp-price lp-rv" style={{ ['--i' as string]: 2 }}>
            <div className="lp-amt">$5<small>/month</small></div>
            <ul className="lp-list">
              {PRICING_ITEMS.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="lp-btn lp-pri" style={{ width: '100%' }}>
              Create your account today
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="lp-final lp-center" aria-labelledby="lp-final-title">
          <div className="lp-mono lp-rv">Your signal starts here</div>
          <h2 id="lp-final-title" className="lp-h2 lp-rv" style={{ ['--i' as string]: 1 }}>
            Your type of people are out there.
          </h2>
          <p className="lp-sub lp-rv" style={{ ['--i' as string]: 2 }}>
            Connect with people who share your world.
          </p>
          <div className="lp-cta lp-rv" style={{ ['--i' as string]: 3, justifyContent: 'center' }}>
            <Link href="/signup" className="lp-btn lp-pri">Create a profile →</Link>
          </div>
        </section>
      </div>

      <footer className="lp-footer">
        <div className="lp-logo">mitype</div>
        <nav aria-label="Footer">
          <Link href="/legal/privacy">Privacy Policy</Link>
          <Link href="/legal/terms">Terms of Service</Link>
          <Link href="/legal/contact">Contact &amp; Support</Link>
        </nav>
        <p>© {new Date().getFullYear()} Mitype · www.mitypeapp.com</p>
      </footer>
    </main>
  );
}
