// Dynamically generates the Open Graph / Twitter preview image for the
// site. Renders once at build time (static) because it doesn't touch any
// request-time APIs. The resulting file is served at /opengraph-image
// and automatically referenced in <head> tags by Next.js.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Mitype — friendships & dating for creative professionals';
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
          padding: 80,
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
            fontSize: 144,
            fontWeight: 900,
            color: '#c8956c',
            letterSpacing: -6,
            display: 'flex',
            marginBottom: 24,
          }}
        >
          mitype
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            color: '#1a1208',
            letterSpacing: -1,
            display: 'flex',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          A cure for boredom.
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#3d2e1f',
            display: 'flex',
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.3,
            marginBottom: 24,
          }}
        >
          Connect with people who share your world.
        </div>
        <div
          style={{
            fontSize: 26,
            color: '#6b5744',
            display: 'flex',
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.4,
          }}
        >
          Friendships &amp; Dating for creative professionals — musicians, writers, artists, photographers and more.
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            display: 'flex',
            gap: 16,
            fontSize: 48,
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
