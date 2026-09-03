// GET /api/current-share-image?u=<username>&a=<avatarUrl>&b=<postBody>&format=story|post|square
//
// Returns a Mitype "Ocean Current" share image at the format that
// matches the social platform the user is posting to:
//   story  = 1080x1920 (Instagram/TikTok/Snapchat/FB stories)
//   post   = 1080x1350 (Instagram/Facebook feed post, portrait 4:5)
//   square = 1080x1080 (X, LinkedIn, Threads, generic 1:1)
//
// Design mirrors the /currents feed itself: deep navy background,
// cyan glow, translucent glass card with the author's avatar, @handle,
// post body, and a small The Current chip. mitypeapp.com sits at the
// bottom of every image.
//
// IMPORTANT: Next.js ImageResponse (Satori) does NOT resolve CSS
// variables. Every color here is a hex literal.

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Brand palette pulled from app/lib/brand.ts + the /currents theme.
const NAVY_DEEP    = '#0a1730';
const NAVY_MID     = '#0f2044';
const CYAN         = '#7dd3fc';
const CYAN_DEEP    = '#0ea5e9';
const BRONZE       = '#c8956c';
const BRONZE_LIGHT = '#ffb37c';
const CARD_BG      = 'rgba(255,255,255,0.08)';
const CARD_BORDER  = 'rgba(125,211,252,0.4)';

type Format = 'story' | 'post' | 'square';

// Dimensions per format. Chosen to match the canonical upload size
// each platform expects so nothing gets cropped on the receiving app.
const DIMS: Record<Format, { w: number; h: number }> = {
  story:  { w: 1080, h: 1920 },
  post:   { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get('u') || 'mitype';
  const username = rawUsername.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 30);
  const rawAvatar = searchParams.get('a') || '';
  const avatarUrl = /^https?:\/\//.test(rawAvatar) ? rawAvatar : '';
  const body = (searchParams.get('b') || '').slice(0, 500);
  const fmtRaw = (searchParams.get('format') || 'story') as Format;
  const format: Format = (['story', 'post', 'square'] as const).includes(fmtRaw) ? fmtRaw : 'story';
  const { w, h } = DIMS[format];

  // Layout constants scale with the shorter dimension so the card and
  // type look proportional at every aspect ratio.
  const isStory = format === 'story';
  const isSquare = format === 'square';
  const padOuter = isStory ? 80 : isSquare ? 70 : 76;
  const cardPadX = isSquare ? 60 : 70;
  const cardPadY = isStory ? 60 : 52;
  const avatarSize = isStory ? 96 : 84;
  const usernameSize = isStory ? 44 : 38;
  const bodySize = isStory ? 48 : 42;
  const brandSize = isStory ? 34 : 30;
  const footerSize = isStory ? 28 : 24;

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
          background: `linear-gradient(180deg, ${NAVY_DEEP} 0%, ${NAVY_MID} 100%)`,
          padding: `${padOuter}px ${padOuter}px`,
          fontFamily: 'Helvetica, Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient cyan glows — mimic the ocean shimmer on the feed. */}
        <div style={{
          position: 'absolute',
          top: -h * 0.15,
          left: -w * 0.15,
          width: w * 0.7,
          height: w * 0.7,
          borderRadius: 9999,
          background: CYAN,
          opacity: 0.10,
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -h * 0.10,
          right: -w * 0.20,
          width: w * 0.75,
          height: w * 0.75,
          borderRadius: 9999,
          background: CYAN_DEEP,
          opacity: 0.14,
          display: 'flex',
        }} />

        {/* Top wordmark — subtle so the card is the hero. */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: brandSize,
          fontWeight: 900,
          color: CYAN,
          letterSpacing: -1.2,
          marginTop: isStory ? 20 : 6,
        }}>
          mitype
        </div>

        {/* Central card — translucent glass, cyan hairline border. */}
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: CARD_BG,
          border: `2px solid ${CARD_BORDER}`,
          borderRadius: 40,
          padding: `${cardPadY}px ${cardPadX}px`,
          boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
        }}>
          {/* Header row: avatar + @username, "The Current" chip on right */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isStory ? 34 : 26,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <div style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${BRONZE} 0%, ${BRONZE_LIGHT} 100%)`,
                color: 'white',
                fontSize: avatarSize * 0.5,
                fontWeight: 900,
              }}>
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt=""
                    width={avatarSize}
                    height={avatarSize}
                    style={{ width: avatarSize, height: avatarSize, objectFit: 'cover' }}
                  />
                ) : (
                  (username || 'M').charAt(0).toUpperCase()
                )}
              </div>
              <div style={{
                fontSize: usernameSize,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: -0.4,
                display: 'flex',
              }}>
                @{username}
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              background: `linear-gradient(135deg, ${CYAN_DEEP}, ${CYAN})`,
              borderRadius: 100,
              fontSize: 18,
              fontWeight: 900,
              color: '#0a1730',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}>
              The Current
            </div>
          </div>

          {/* Post body */}
          <div style={{
            fontSize: bodySize,
            fontWeight: 500,
            color: '#ffffff',
            lineHeight: 1.36,
            letterSpacing: -0.3,
            display: 'flex',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {body || 'Come see what is happening on mitype.'}
          </div>
        </div>

        {/* Bottom footer — small, quiet, drives traffic. */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: isStory ? 20 : 6,
          gap: 8,
        }}>
          <div style={{
            fontSize: footerSize,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: 2,
            display: 'flex',
          }}>
            mitypeapp.com
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
    }
  );
}
