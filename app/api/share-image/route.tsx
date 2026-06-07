// GET /api/share-image?u=<username>
//
// Returns a 1080x1920 vertical PNG sized for Instagram/TikTok/Snapchat
// stories, personalized with the user's name. Rendered via Next.js
// ImageResponse on the Edge runtime so it's fast and free to call.

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get('u') || 'mitype';
  const username = rawUsername.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 30);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #faf6f0 0%, #f5e6d3 100%)',
          padding: '120px 80px 110px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 18,
            background: 'linear-gradient(90deg, #c8956c 0%, #e8b490 100%)',
            display: 'flex',
          }}
        />

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 18,
            background: 'linear-gradient(90deg, #e8b490 0%, #c8956c 100%)',
            display: 'flex',
          }}
        />

        {/* Top: brand wordmark */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 40,
          }}
        >
          <div
            style={{
              fontSize: 140,
              fontWeight: 900,
              color: '#c8956c',
              letterSpacing: -6,
              display: 'flex',
              marginBottom: 18,
            }}
          >
            mitype
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#1a1208',
              letterSpacing: 8,
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            Find Your Type
          </div>
        </div>

        {/* Middle: the hook */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginTop: 0,
          }}
        >
          <div
            style={{
              fontSize: 86,
              fontWeight: 900,
              color: '#1a1208',
              letterSpacing: -3,
              lineHeight: 1.1,
              textAlign: 'center',
              maxWidth: 900,
              marginBottom: 30,
              display: 'flex',
            }}
          >
            I just found my type on Mitype.
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#c8956c',
              letterSpacing: -1,
              display: 'flex',
            }}
          >
            Join me.
          </div>
        </div>

        {/* Emoji garland */}
        <div
          style={{
            display: 'flex',
            gap: 30,
            fontSize: 76,
          }}
        >
          <span>🎵</span>
          <span>📸</span>
          <span>🎨</span>
          <span>✍️</span>
          <span>🎬</span>
          <span>🎙️</span>
        </div>

        {/* Bottom: CTA + URL */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              background: '#c8956c',
              color: 'white',
              fontSize: 38,
              fontWeight: 800,
              padding: '28px 64px',
              borderRadius: 120,
              letterSpacing: -0.5,
              display: 'flex',
              marginBottom: 38,
            }}
          >
            Connect with people who share your world
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#3d2e1f',
              display: 'flex',
              marginBottom: 8,
            }}
          >
            mitypeapp.com
          </div>
          {username && username !== 'mitype' ? (
            <div
              style={{
                fontSize: 22,
                color: '#8a7560',
                fontWeight: 600,
                letterSpacing: 1.5,
                display: 'flex',
              }}
            >
              invited by @{username}
            </div>
          ) : (
            <div
              style={{
                fontSize: 22,
                color: '#8a7560',
                fontWeight: 600,
                letterSpacing: 1.5,
                display: 'flex',
              }}
            >
              the creator's social network
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  );
}
