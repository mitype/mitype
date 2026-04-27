// Dynamically generates the Open Graph / Twitter preview image for the
// site. Renders once at build time (static) because it doesn't touch any
// request-time APIs. The resulting file is served at /opengraph-image
// and automatically referenced in <head> tags by Next.js.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Mitype — Find Your Type of Creator. A creative networking platform for collaboration and friendships.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #faf6f0 0%, #f5e6d3 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 80px 60px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            background: 'linear-gradient(90deg, #c8956c 0%, #e8b490 100%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            fontSize: 132,
            fontWeight: 900,
            color: '#c8956c',
            letterSpacing: -6,
            display: 'flex',
            marginBottom: 16,
          }}
        >
          mitype
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#1a1208',
            letterSpacing: -1,
            display: 'flex',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Find Your Type of Creator
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#3d2e1f',
            display: 'flex',
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.3,
            marginBottom: 22,
          }}
        >
          Connect with people who share your world.
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#6b5744',
            display: 'flex',
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.4,
            marginBottom: 36,
          }}
        >
          A creative networking platform for musicians, writers, artists, photographers, chefs, and creators of every kind — to connect, collaborate, and build friendships.
        </div>
        {/* Emoji row — flows in-document so it never overlaps the description */}
        <div
          style={{
            display: 'flex',
            gap: 22,
            fontSize: 52,
          }}
        >
          <span>🎵</span>
          <span>📸</span>
          <span>🎨</span>
          <span>✍️</span>
          <span>🎬</span>
          <span>🎙️</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
