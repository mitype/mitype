// Open Graph / Twitter preview image for shared Mitype links.
//
// This is the image that iMessage, Facebook, Slack, etc. unfurl when
// someone shares a mitypeapp.com link. NOT the same as the personalized
// /api/share-image (which is the 9:16 story image with the sender's
// avatar). This is the 1200x630 horizontal card.
//
// IMPORTANT: Next.js ImageResponse does NOT resolve CSS variables. Every
// color in this file MUST be a hex literal. Using `var(--brand-*)` here
// used to render every styled surface as solid black, which is why
// shared links looked "faded dark" in iMessage previews.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Mitype. The social media that networks. Connect with people who share your world.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Hardcoded brand colors — must mirror app/lib/brand.ts.
const BRAND_PERSONAL      = '#c8956c';
const BRAND_PERSONAL_LIGHT= '#ffb37c';
const BRAND_CREAM         = '#faf6f0';
const BRAND_CREAM_DEEP    = '#f5e6d3';
const BRAND_TEXT_DARK     = '#1a1208';
const BRAND_TEXT_HEAD     = '#6b5744';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${BRAND_CREAM} 0%, ${BRAND_CREAM_DEEP} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '70px 80px 60px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 14,
            background: `linear-gradient(90deg, ${BRAND_PERSONAL} 0%, ${BRAND_PERSONAL_LIGHT} 100%)`,
            display: 'flex',
          }}
        />
        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: 14,
            background: `linear-gradient(90deg, ${BRAND_PERSONAL_LIGHT} 0%, ${BRAND_PERSONAL} 100%)`,
            display: 'flex',
          }}
        />

        <div
          style={{
            fontSize: 152,
            fontWeight: 900,
            color: BRAND_PERSONAL,
            letterSpacing: -7,
            display: 'flex',
            marginBottom: 14,
            lineHeight: 1,
          }}
        >
          mitype
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: BRAND_TEXT_DARK,
            letterSpacing: 4,
            display: 'flex',
            textTransform: 'uppercase',
            marginBottom: 36,
          }}
        >
          The social media that networks
        </div>
        <div
          style={{
            fontSize: 38,
            color: BRAND_TEXT_HEAD,
            display: 'flex',
            textAlign: 'center',
            maxWidth: 980,
            lineHeight: 1.35,
            fontWeight: 600,
          }}
        >
          Connect with people who share your world.
        </div>
      </div>
    ),
    { ...size }
  );
}
