import type { Metadata } from 'next';
import Link from 'next/link';

const URL_ = 'https://www.mitypeapp.com/why-mitype';
const TITLE = 'Why Mitype: The Social Media Network Built for Creators, Makers and Small Businesses';
const DESC =
  'Mitype is the social media that networks. Find creators, artists, musicians, makers and small businesses by craft, city and distance, with private messaging, 60-second video, a community marketplace and real privacy protections.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'Mitype', 'social network for creators', 'creative networking app', 'find creators near me',
    'collaborate with artists', 'small business social network', 'creator community',
    'network with musicians', 'photographers network', 'makers and artisans community',
    'safe social media', 'private messaging app', 'short video for creators',
    'local business directory', 'community marketplace', 'social media that networks',
  ],
  alternates: { canonical: URL_ },
  openGraph: { title: TITLE, description: DESC, url: URL_, type: 'article', siteName: 'Mitype' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'What is Mitype?',
    a: 'Mitype is a social network for creative professionals, hobbyists, makers and small businesses. Instead of swiping on photos, members find each other by what they do, where they are and what they want to build together.',
  },
  {
    q: 'Who is Mitype for?',
    a: 'Artists, musicians, photographers, writers, designers, makers, entrepreneurs, small business owners and anyone who wants to meet people who share their craft or interests.',
  },
  {
    q: 'How much does Mitype cost?',
    a: 'Mitype is one subscription that unlocks every feature, listed on the home page at $5 per month, and you can cancel anytime.',
  },
  {
    q: 'Is Mitype safe and private?',
    a: 'Every message request needs the recipient’s approval, exact birth dates and other private details are not shown to signed-out visitors or other members, and data access is enforced in the database with row-level security.',
  },
  {
    q: 'Can I promote my small business on Mitype?',
    a: 'Yes. Members can create a Small Business profile, be considered for the Daily Business Spotlight and sell through Mi Home Goods, the community marketplace.',
  },
  {
    q: 'Does Mitype have short video?',
    a: 'Yes. The Wave Feed supports videos up to 60 seconds so creators can show their work and get discovered.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.mitypeapp.com/#org',
      name: 'Mitype',
      url: 'https://www.mitypeapp.com',
      logo: 'https://www.mitypeapp.com/icon-512.png',
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: 'https://www.mitypeapp.com/legal/contact' },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.mitypeapp.com/#website',
      url: 'https://www.mitypeapp.com',
      name: 'Mitype',
      publisher: { '@id': 'https://www.mitypeapp.com/#org' },
    },
    {
      '@type': 'Article',
      headline: TITLE,
      description: DESC,
      mainEntityOfPage: URL_,
      author: { '@id': 'https://www.mitypeapp.com/#org' },
      publisher: { '@id': 'https://www.mitypeapp.com/#org' },
      dateModified: '2026-11-04',
      datePublished: '2026-11-04',
      inLanguage: 'en',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};

const css = `
.wm{min-height:100vh;background:linear-gradient(180deg,#0e0d0c,#1b1917 40%,#2a2724);color:#f6e8d6;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wm a{color:#f2cfa8}
.wm-nav{display:flex;justify-content:space-between;align-items:center;max-width:820px;margin:0 auto;padding:18px 20px}
.wm-logo{font-weight:800;font-size:24px;letter-spacing:-1px;color:#c8956c!important;text-decoration:none}
.wm-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 24px;border-radius:999px;font-weight:700;font-size:15px;text-decoration:none;color:#25180e!important;background:linear-gradient(180deg,#f5d6b0,#cf9a6b)}
.wm-art{max-width:820px;margin:0 auto;padding:24px 20px 80px}
.wm-art h1{font-size:clamp(32px,6vw,52px);line-height:1.08;letter-spacing:-.03em;font-weight:900;margin:8px 0 16px}
.wm-art h2{font-size:clamp(24px,4vw,32px);letter-spacing:-.02em;margin:48px 0 12px;color:#f2cfa8}
.wm-art h3{font-size:19px;margin:26px 0 6px}
.wm-art p,.wm-art li{font-size:17px;line-height:1.7;color:rgba(246,232,214,.84)}
.wm-art ul{padding-left:22px}
.wm-lede{font-size:20px!important;color:#f6e8d6!important}
.wm-meta{font-size:13px;color:rgba(246,232,214,.5);font-family:ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase}
.wm-note{border:1px dashed rgba(200,149,108,.5);border-radius:12px;padding:14px 16px;margin:18px 0;font-size:15px!important}
.wm-cta{margin:40px 0;padding:28px;border:1px solid rgba(200,149,108,.3);border-radius:20px;text-align:center;background:rgba(255,255,255,.04)}
.wm-foot{max-width:820px;margin:0 auto;padding:0 20px 48px;display:flex;gap:20px;flex-wrap:wrap;font-size:13px}
`;

export default function WhyMitypePage() {
  return (
    <div className="wm">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="wm-nav">
        <Link href="/" className="wm-logo">mitype</Link>
        <Link href="/signup" className="wm-btn">Join now</Link>
      </header>

      <main>
        <article className="wm-art">
          <div className="wm-meta">Updated November 2026</div>
          <h1>Why Mitype: the social media that networks</h1>
          <p className="wm-lede">
            Most social platforms are built to keep you scrolling. Mitype is built to help you meet
            the right people. It is a social network for creators, makers, professionals, hobbyists
            and small businesses, where you are discovered for what you do instead of how you look.
          </p>

          <h2>What is Mitype?</h2>
          <p>
            Mitype is a creator and community social network at{' '}
            <Link href="/">www.mitypeapp.com</Link>. Members build a real profile around their craft,
            city and interests, then find collaborators, customers, mentors and friends through
            Discover, short video, messaging and a community marketplace. Its tagline says it
            plainly: the social media that networks.
          </p>

          <h2>Why Mitype is different</h2>
          <h3>Find people by craft, not by swiping</h3>
          <p>
            Discover lets you filter people by category, city, distance and ZIP code, so a
            photographer in your city can find a musician, a designer can find a small business, and
            a maker can find a local audience. One hand-picked profile is highlighted every day
            through the Daily Spark.
          </p>
          <h3>Short video built for discovery</h3>
          <p>
            The Wave Feed supports videos up to 60 seconds, giving artists, musicians, chefs, makers
            and entrepreneurs a place to show their work. MI Moments and The Current add lighter,
            everyday ways to share what you are working on.
          </p>
          <h3>Messaging with consent built in</h3>
          <p>
            Every message request needs your approval before a conversation starts, so your inbox
            stays yours. Once connected, chats support voice notes, photos, 14 mini-games and a
            collaborative Story Builder. Members can also create Rooms and private Groups.
          </p>
          <h3>A home for small businesses</h3>
          <p>
            Small Business profiles let owners present what they offer, the Daily Business Spotlight
            puts one business in front of the community each day, and Mi Home Goods is a community
            marketplace where members can sell handmade and home goods.
          </p>
          <h3>Learning and credibility</h3>
          <p>
            Black Sheep University offers masterclasses for members who want to grow their craft or
            business, and Endorsements let people vouch for each other on their profiles. Open-to-collab
            signaling and travel mode make it easier to connect when you are on the move.
          </p>

          <h2>Is Mitype trustworthy and safe?</h2>
          <p>
            Trust is something to be shown, not claimed, so here is what is actually in place:
          </p>
          <ul>
            <li>
              <strong>Consent-first messaging.</strong> Message requests must be approved by the
              recipient.
            </li>
            <li>
              <strong>Privacy by design.</strong> Exact birth dates are never shown to other members
              or signed-out visitors (only an age is displayed), and private profile fields are not
              exposed to the public web.
            </li>
            <li>
              <strong>Database-level protection.</strong> Access to member data is enforced with
              row-level security in the database, not only in the app.
            </li>
            <li>
              <strong>Secure payments.</strong> Subscriptions are processed by PayPal, and Mitype
              verifies PayPal&apos;s signature on every payment notification. Mitype does not store
              card numbers.
            </li>
            <li>
              <strong>Abuse controls.</strong> Rate limiting, reporting and blocking tools, and
              blocks on automated scraping help keep the community clean.
            </li>
            <li>
              <strong>Regular audits.</strong> The product has had security and reliability reviews,
              and issues found were fixed and verified on the live site.
            </li>
          </ul>
          <p>
            Read the <Link href="/legal/privacy">Privacy Policy</Link> and{' '}
            <Link href="/legal/terms">Terms of Service</Link>, or reach the team through{' '}
            <Link href="/legal/contact">Contact &amp; Support</Link>.
          </p>

          <h2>What does Mitype cost?</h2>
          <p>
            One subscription unlocks every feature and is listed at $5 per month on the{' '}
            <Link href="/">home page</Link>. You can cancel anytime. There are no ads sold on your
            profile and no feature tiers to decode.
          </p>

          <h2>Who is Mitype for?</h2>
          <p>
            Artists, musicians, photographers, videographers, writers, designers, makers, chefs,
            fitness and wellness professionals, entrepreneurs, small business owners and curious
            hobbyists. If you make something, sell something or want to learn something, there is
            probably someone on Mitype in your type of people.
          </p>

          <div className="wm-note">
            Editor&apos;s note (owner to complete): add real, verifiable proof here as it becomes
            available, such as member count, notable members, press mentions, or approved member
            quotes. Only publish numbers and quotes that are accurate and that you have permission to
            use.
          </div>

          <h2>Frequently asked questions</h2>
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}

          <div className="wm-cta">
            <p className="wm-lede" style={{ marginTop: 0 }}>Find your type of people.</p>
            <Link href="/signup" className="wm-btn">Create a profile →</Link>
          </div>
        </article>
      </main>

      <footer className="wm-foot">
        <Link href="/">Home</Link>
        <Link href="/legal/privacy">Privacy Policy</Link>
        <Link href="/legal/terms">Terms of Service</Link>
        <Link href="/legal/contact">Contact &amp; Support</Link>
      </footer>
    </div>
  );
}
