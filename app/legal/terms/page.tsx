import Link from 'next/link';

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p style={{ color: '#a89278', fontSize: 15, marginBottom: 48 }}>
          Last updated: April 22, 2026
        </p>

        {[
          {
            title: '1. Acceptance of Terms',
            content: `Mitype is a creative networking platform that connects creators, professionals, and hobbyists for friendship, collaboration, and community around shared crafts. By accessing or using Mitype ("the Platform") you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree do not use the Platform. These terms constitute a legally binding agreement between you and Mitype.`,
          },
          {
            title: '2. Eligibility',
            content: `You must be at least 18 years of age to create an account or use any features of Mitype. By registering you confirm that you are 18 or older. We reserve the right to terminate accounts of users found to be under 18 without notice.`,
          },
          {
            title: '3. Account Responsibilities',
            content: `• You are responsible for maintaining the confidentiality of your login credentials.
- You agree to provide accurate and truthful profile information.
- You are responsible for all activity that occurs under your account.
- You must notify us immediately if you suspect unauthorized access to your account.
- You may only create one account per person.`,
          },
          {
            title: '4. Acceptable Use',
            content: `You agree NOT to use Mitype to:

- Harass, abuse, threaten, or intimidate other users.
- Send unsolicited messages, spam, or bulk communications.
- Post false, misleading, or fraudulent information.
- Impersonate another person or entity.
- Share explicit, pornographic, or sexually suggestive content.
- Engage in or promote illegal activity.
- Scrape or systematically collect data from the Platform.
- Attempt to gain unauthorized access to any part of the Platform.
- Use the Platform for commercial solicitation without our prior consent.
- Discriminate against or harass users based on race, gender, sexual orientation, religion, disability, or any other protected characteristic.`,
          },
          {
            title: '5. Subscription & Billing',
            content: `Mitype offers a subscription plan at $5.00 per month with a 30-day free trial for new subscribers.

- Auto-renewal: Your subscription renews automatically each month until canceled. By subscribing you authorize us to charge your payment method on a recurring monthly basis.
- Free trial: Your first 30 days are free. You will not be charged until the trial period ends. You may cancel at any time before the trial ends to avoid being charged.
- Card required: A valid payment method is required to start your free trial.
- Cancellation: You may cancel your subscription at any time through the billing portal. Cancellation takes effect at the end of the current billing period and you retain access until then.
- Refunds: We do not offer refunds for partial subscription periods. If you believe you were charged in error contact us at support.mitypeapp@gmail.com.
- Price changes: We will notify you at least 30 days in advance of any price changes.`,
          },
          {
            title: '6. Message Privacy & Safety',
            content: `Mitype takes your privacy seriously. All messages are protected and only visible to the participants in a conversation. Every message request requires your approval before a conversation opens. You are always in control of who can contact you. We do not read or sell your private messages.`,
          },
          {
            title: '7. Content & Intellectual Property',
            content: `You retain ownership of content you post such as photos, bio, and messages. By posting content on Mitype you grant us a non-exclusive royalty-free license to display and store that content as necessary to operate the Platform. You represent that you have the right to share any content you upload.`,
          },
          {
            title: '8. Account Termination',
            content: `We reserve the right to suspend or permanently terminate your account at our sole discretion without prior notice for violations of these Terms or for any other reason including illegal activity, harassment of other users, or provision of false information. You may also delete your account at any time by contacting support.`,
          },
          {
            title: '9. Disclaimer of Warranties',
            content: `Mitype is provided "as is" and "as available" without warranties of any kind. We do not guarantee that the Platform will be uninterrupted, error-free, or free of harmful components. We make no warranties regarding the accuracy of profiles or the conduct of other users.`,
          },
          {
            title: '10. Limitation of Liability',
            content: `To the maximum extent permitted by applicable law Mitype and its founders, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability to you for any claim shall not exceed the amount you paid us in the 3 months preceding the claim.`,
          },
          {
            title: '11. Safety for Collaborations and In-Person Meetings',
            content: `Mitype facilitates online connections between creators for the purposes of collaboration, networking, and friendship. The Platform has no control over interactions or meetings that occur outside of the Platform. Always exercise caution when meeting collaborators in person — we recommend meeting in public places, in professional settings such as studios or workshops, and informing a trusted person of your plans. Mitype is not responsible for any interactions or outcomes that occur outside the Platform.`,
          },
          {
            title: '12. Governing Law',
            content: `These Terms shall be governed by the laws of the United States. Any disputes arising from these Terms or your use of Mitype shall be resolved through binding arbitration except that either party may seek injunctive relief in a court of competent jurisdiction.`,
          },
          {
            title: '13. Changes to Terms',
            content: `We may update these Terms from time to time. We will notify you of material changes via email or platform notification. Your continued use of Mitype after updated Terms take effect constitutes your acceptance.`,
          },
          {
            title: '14. Contact',
            content: `For questions about these Terms contact us at:
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
          <Link href="/legal/privacy" style={{ color: '#c8956c', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Privacy Policy
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