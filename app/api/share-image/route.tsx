// GET /api/share-image?u=<username>&a=<avatarUrl>
//
// Returns a 1080x1920 vertical PNG sized for Instagram/TikTok/Snapchat
// stories, personalized with the sender's @username + avatar.
//
// IMPORTANT: Next.js ImageResponse does NOT resolve CSS variables, so
// every color in this file MUST be a hex literal. Using `var(--brand-*)`
// here used to render every styled surface as solid black, which is
// why shared links looked "faded dark."

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Brand colors — hardcoded from app/lib/brand.ts because CSS variables
// don't resolve inside ImageResponse.
const BRAND_PERSONAL      = '#c8956c';
const BRAND_PERSONAL_DEEP = '#a07a4d';
const BRAND_PERSONAL_LIGHT= '#ffb37c';
const BRAND_CREAM         = '#faf6f0';
const BRAND_CREAM_DEEP    = '#f5e6d3';
const BRAND_TEXT_DARK     = '#1a1208';
const BRAND_TEXT_MID      = '#8a7560';
const BRAND_TEXT_HEAD     = '#6b5744';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get('u') || 'mitype';
  const username = rawUsername.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 30);
  // Avatar URL is passed in as ?a=<encoded url>. Optional — falls back
  // to a bronze monogram of the first letter of the username.
  const rawAvatar = searchParams.get('a') || '';
  // Defensive: only accept http(s) urls so we don't try to render a
  // data: blob or a relative path.
  const avatarUrl = /^https?:\/\//.test(rawAvatar) ? rawAvatar : '';

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
          background: `linear-gradient(180deg, ${BRAND_CREAM} 0%, ${BRAND_CREAM_DEEP} 100%)`,
          padding: '110px 80px 110px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 18,
            background: `linear-gradient(90deg, ${BRAND_PERSONAL} 0%, ${BRAND_PERSONAL_LIGHT} 100%)`,
            display: 'flex',
          }}
        />
        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: 18,
            background: `linear-gradient(90deg, ${BRAND_PERSONAL_LIGHT} 0%, ${BRAND_PERSONAL} 100%)`,
            display: 'flex',
          }}
        />

        {/* Top: brand wordmark + tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 30,
          }}
        >
          <div
            style={{
              fontSize: 160,
              fontWeight: 900,
              color: BRAND_PERSONAL,
              letterSpacing: -8,
              display: 'flex',
              marginBottom: 18,
              lineHeight: 1,
            }}
          >
            mitype
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: BRAND_TEXT_DARK,
              letterSpacing: 4,
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            The social media that networks
          </div>
        </div>

        {/* Middle: sender attribution + hook */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* "Invite sent by @username" card with avatar circle. */}
          {username && username !== 'mitype' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                background: 'white',
                border: `4px solid ${BRAND_PERSONAL}`,
                borderRadius: 200,
                padding: '20px 36px 20px 22px',
                marginBottom: 50,
                boxShadow: '0 24px 60px rgba(200,149,108,0.35)',
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${BRAND_PERSONAL} 0%, ${BRAND_PERSONAL_LIGHT} 100%)`,
                  color: 'white',
                  fontSize: 64,
                  fontWeight: 900,
                  overflow: 'hidden',
                }}
              >
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt=""
                    width={120}
                    height={120}
                    style={{ width: 120, height: 120, objectFit: 'cover' }}
                  />
                ) : (
                  username.charAt(0).toUpperCase()
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: BRAND_TEXT_MID,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    display: 'flex',
                    marginBottom: 6,
                  }}
                >
                  Invite sent by
                </div>
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 900,
                    color: BRAND_TEXT_DARK,
                    letterSpacing: -1,
                    display: 'flex',
                  }}
                >
                  @{username}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: 110,
              fontWeight: 900,
              color: BRAND_TEXT_DARK,
              letterSpacing: -4,
              display: 'flex',
            }}
          >
            Join me.
          </div>
        </div>

        {/* Bottom: CTA + URL */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 36,
          }}
        >
          <div
            style={{
              background: BRAND_PERSONAL,
              color: 'white',
              fontSize: 38,
              fontWeight: 800,
              padding: '28px 64px',
              borderRadius: 120,
              letterSpacing: -0.5,
              display: 'flex',
              marginBottom: 32,
              textAlign: 'center',
            }}
          >
            Connect with people who share your world
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: BRAND_TEXT_HEAD,
              letterSpacing: -0.5,
              display: 'flex',
            }}
          >
            mitypeapp.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  );
}
