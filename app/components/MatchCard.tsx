'use client';
// MatchCard — a shareable graphic generated when two mitype members match.
// Displayed as a modal over the chat screen; a Download button renders the
// card to a 1080×1080 PNG via <canvas> so users can save or share.
//
// No DB changes — everything needed to render lives in the conversation
// + the two profile rows we already load for /messages.

import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { toast } from '../lib/toast';

interface Person {
  username: string;
  avatar_url?: string | null;
}

interface MatchCardProps {
  me: Person;
  them: Person;
  matchedOn: Date;
  onClose: () => void;
}

const PEACH = '#c8956c';
const CREAM = '#faf6f0';
const INK = '#1a1208';
const MUTED = '#8a7560';

export function MatchCard({ me, them, matchedOn, onClose }: MatchCardProps) {
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Close on Escape for keyboard users.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const dateLabel = matchedOn.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await renderMatchCardPng({ me, them, matchedOn });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mitype-connected-${me.username}-${them.username}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a tick to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Connection card saved!');
    } catch (err) {
      console.error('Connection card render failed', err);
      toast.error("Couldn't generate image. Try again in a moment.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`You connected with @${them.username}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,18,8,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'mitype-match-fade-in 180ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 24,
          maxWidth: 440,
          width: '100%',
          padding: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          animation: 'mitype-match-pop 260ms cubic-bezier(0.2, 0.8, 0.2, 1.2)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close connection card"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            border: 'none',
            background: '#faf6f0',
            borderRadius: '50%',
            fontSize: 18,
            color: MUTED,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>

        {/* Preview card — HTML/CSS mirror of what we'll render to canvas. */}
        <div
          style={{
            background: `linear-gradient(135deg, ${CREAM} 0%, #fff3ec 100%)`,
            border: `1px solid ${PEACH}33`,
            borderRadius: 20,
            padding: '32px 20px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: PEACH,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            mitype · connected
          </div>
          <div style={{
            fontSize: 26,
            fontWeight: 900,
            color: INK,
            letterSpacing: '-0.5px',
            marginBottom: 20,
          }}>
            You&apos;re connected! <span aria-hidden="true">✨</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            marginBottom: 20,
          }}>
            <AvatarCircle person={me} />
            <div
              aria-hidden="true"
              style={{
                fontSize: 28,
                color: PEACH,
                lineHeight: 1,
              }}
            >
              ✦
            </div>
            <AvatarCircle person={them} />
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>
            @{me.username} <span style={{ color: PEACH }}>&amp;</span> @{them.username}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 0 }}>
            connected on {dateLabel}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: `1px solid ${PEACH}55`,
              background: 'white',
              color: INK,
              borderRadius: 100,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Keep chatting
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: downloading ? '#d8b18f' : PEACH,
              color: 'white',
              borderRadius: 100,
              fontWeight: 700,
              fontSize: 14,
              cursor: downloading ? 'wait' : 'pointer',
            }}
          >
            {downloading ? 'Saving…' : 'Download image'}
          </button>
        </div>

        <p style={{
          fontSize: 11,
          color: MUTED,
          textAlign: 'center',
          marginTop: 12,
        }}>
          The downloaded image is 1080×1080 — perfect for an Instagram story.
        </p>

        {/* Hidden canvas used for PNG generation. */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1080}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </div>

      <style>{`
        @keyframes mitype-match-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes mitype-match-pop {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function AvatarCircle({ person }: { person: Person }) {
  return (
    <div style={{
      width: 96,
      height: 96,
      borderRadius: '50%',
      overflow: 'hidden',
      background: '#f0e8df',
      border: `3px solid ${PEACH}`,
      boxShadow: '0 8px 20px rgba(200,149,108,0.25)',
      flexShrink: 0,
    }}>
      <Avatar
        src={person.avatar_url}
        alt={`@${person.username}`}
        width={96}
        height={96}
        fallbackFontSize={40}
        sizes="96px"
      />
    </div>
  );
}

// Renders the card to a 1080×1080 PNG Blob using an offscreen canvas.
// Handles missing/broken avatars gracefully by falling back to a gradient
// circle with the first letter of the username.
async function renderMatchCardPng({
  me,
  them,
  matchedOn,
}: {
  me: Person;
  them: Person;
  matchedOn: Date;
}): Promise<Blob> {
  const SIZE = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Background: cream → peach gradient
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, CREAM);
  bg.addColorStop(1, '#fff3ec');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Inner card with rounded corners
  const cardMargin = 48;
  const cardX = cardMargin;
  const cardY = cardMargin;
  const cardW = SIZE - cardMargin * 2;
  const cardH = SIZE - cardMargin * 2;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = `${PEACH}33`;
  ctx.lineWidth = 4;
  ctx.stroke();

  // "mitype · match" eyebrow
  ctx.fillStyle = PEACH;
  ctx.font = '700 28px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  // Spaced caps for eyebrow — use explicit separators since canvas
  // letterSpacing is non-standard and not in TS's DOM lib.
  ctx.fillText('M I T Y P E  ·  C O N N E C T E D', SIZE / 2, 200);

  // Big title
  ctx.fillStyle = INK;
  ctx.font = '900 88px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText("You're connected! ✨", SIZE / 2, 320);

  // Avatars
  const avatarRadius = 140;
  const avatarY = SIZE / 2 + 20;
  const leftX = SIZE / 2 - 200;
  const rightX = SIZE / 2 + 200;

  await drawAvatar(ctx, me, leftX, avatarY, avatarRadius);
  await drawAvatar(ctx, them, rightX, avatarY, avatarRadius);

  // Star in the middle
  ctx.fillStyle = PEACH;
  ctx.font = '900 80px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦', SIZE / 2, avatarY + 25);

  // Usernames
  ctx.fillStyle = INK;
  ctx.font = '800 44px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(`@${me.username}  &  @${them.username}`, SIZE / 2, avatarY + avatarRadius + 90);

  // Matched on date
  const dateLabel = matchedOn.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  ctx.fillStyle = MUTED;
  ctx.font = '500 30px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(`connected on ${dateLabel}`, SIZE / 2, avatarY + avatarRadius + 140);

  // Footer brand
  ctx.fillStyle = PEACH;
  ctx.font = '900 36px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('mitype', SIZE / 2, SIZE - 110);
  ctx.fillStyle = MUTED;
  ctx.font = '500 22px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('mitypeapp.com', SIZE / 2, SIZE - 78);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('toBlob returned null'));
    }, 'image/png', 0.95);
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

async function drawAvatar(
  ctx: CanvasRenderingContext2D,
  person: Person,
  cx: number,
  cy: number,
  r: number,
) {
  // Outer peach ring
  ctx.fillStyle = PEACH;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.fill();

  // Clip to circle and draw the image (or fallback)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  let drew = false;
  if (person.avatar_url) {
    try {
      const img = await loadImage(person.avatar_url);
      // Cover-fit the image
      const ratio = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const iw = img.width * ratio;
      const ih = img.height * ratio;
      ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
      drew = true;
    } catch {
      // Fall through to placeholder
    }
  }

  if (!drew) {
    // Cream circle with the first letter of the username in peach
    ctx.fillStyle = '#f0e8df';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = PEACH;
    ctx.font = '900 140px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letter = (person.username || '?').charAt(0).toUpperCase();
    ctx.fillText(letter, cx, cy + 6);
    ctx.textBaseline = 'alphabetic'; // reset
  }

  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}
