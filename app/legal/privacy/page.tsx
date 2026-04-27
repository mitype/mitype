import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
        <Link href="/" style={{
          fontSize: 24,
          fontWeight: 900,
          color: '#c8956c',
          letterSpacing: '-1px',
          textDecoration: 'none',
        }}>
          mitype
        </Link>
        <Link href="/" style={{
          color: '#8a7560',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
        }}>
          Back to Home
        </Link>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{
          fontSize: 40,
          fontWeight: 900,
          color: '#1a1208',
          letterSpacing: '-1px',
          marginBottom: 8,
        }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#a89278', fontSize: 15, marginBottom: 48 }}>
          Last updated: April 22, 2026
        </p>

        {[
          {
            title: '1. Introduction',
            content: `Mitype ("we," "our," or "us") is a creative networking platform for friendships and collaboration among creators. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at mitypeapp.com. By creating an account or using Mitype, you agree to the practices described in this policy.`,
          },
          {
            title: '2. Information We Collect',
            content: `We collect the following information:

- Account information: Email address and password when you register.
- Profile information: Username, bio, profile photo, creative categories, ZIP code, social media links, and website URL that you provide.
- Usage data: Browsing activity, connection history, and messages exchanged on the platform.
- Payment information: Payment details are processed directly by Stripe and are never stored on our servers. We only retain your subscription status and Stripe customer ID.
- Technical data: IP address, browser type, device information, and cookies used to maintain your session.`,
          },
          {
            title: '3. How We Use Your Information',
            content: `We use your information to:

- Create and manage your account and profile.
- Power the creator discovery, connection, and messaging features.
- Process subscription payments through Stripe.
- Send transactional emails such as email verification and billing notices.
- Improve platform features and analyze usage patterns.
- Comply with legal obligations and enforce our Terms of Service.`,
          },
          {
            title: '4. Message Privacy',
            content: `Your private messages on Mitype are protected by Row Level Security on our database. This means only the two participants in a conversation can read their messages. We do not read, sell, or share your private messages with any third parties. Every message request requires your approval before a conversation opens, giving you full control over who can contact you.`,
          },
          {
            title: '5. Third-Party Services',
            content: `We use the following trusted third-party providers:

- Supabase: Provides our authentication, database, and file storage infrastructure.
- Stripe: Handles all payment processing. Stripe is PCI-DSS compliant. We never see or store your full card details.
- Vercel: Hosts our web application.

Each provider operates under its own privacy policy.`,
          },
          {
            title: '6. Cookies',
            content: `We use essential cookies to maintain your login session. These are strictly necessary for the platform to function. We do not use advertising or tracking cookies.`,
          },
          {
            title: '7. Data Sharing',
            content: `We do not sell, rent, or trade your personal information to third parties. Your profile information such as username, bio, categories, and photo is visible to other registered users. Your email address, payment details, and browsing history are never shared with other users.`,
          },
          {
            title: '8. Your Rights',
            content: `You have the right to:

- Access: Request a copy of the personal data we hold about you.
- Correction: Update inaccurate information via your profile settings.
- Deletion: Request deletion of your account and associated data by contacting us at support.mitypeapp@gmail.com.
- Portability: Request your data in a machine-readable format.

To exercise any of these rights contact us at support.mitypeapp@gmail.com.`,
          },
          {
            title: '9. Security',
            content: `We implement reasonable technical and organizational measures to protect your data including encrypted connections (HTTPS/TLS), hashed passwords, row-level security on our database, and strict access controls. However no system is completely secure and we cannot guarantee absolute security.`,
          },
          {
            title: '10. Data Retention',
            content: `We retain your data for as long as your account is active. If you delete your account we will delete or anonymize your personal data within 30 days except where retention is required by law.`,
          },
          {
            title: '11. Children\'s Privacy',
            content: `Mitype is strictly for users 18 years of age and older. We do not knowingly collect information from anyone under 18. If we discover that a minor has created an account we will immediately terminate it and delete associated data.`,
          },
          {
            title: '12. Changes to This Policy',
            content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by displaying a prominent notice on the platform.`,
          },
          {
            title: '13. Contact Us',
            content: `For privacy related questions or requests contact us at:
support.mitypeapp@gmail.com`,
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: 40 }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1a1208',
              marginBottom: 12,
            }}>
              {section.title}
            </h2>
            <p style={{
              color: '#6b5744',
              fontSize: 15,
              lineHeight: 1.8,
              whiteSpace: 'pre-line',
            }}>
              {section.content}
            </p>
          </div>
        ))}

        {/* Footer links */}
        <div style={{
          borderTop: '1px solid rgba(200,149,108,0.2)',
          paddingTop: 32,
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}>
          <Link href="/legal/terms" style={{ color: '#c8956c', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Terms of Service
          </Link>
          <Link href="/legal/contact" style={{ color: '#c8956c', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Contact & Support
          </Link>
          <Link href="/" style={{ color: '#c8956c', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Back to Mitype
          </Link>
        </div>
      </div>
    </main>
  );
}