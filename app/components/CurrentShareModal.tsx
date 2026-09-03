'use client';
// CurrentShareModal — the "Share this current" sheet.
//
// Renders a grouped platform grid organized by canonical aspect
// ratio, so a tap on any platform generates a correctly-sized PNG
// for that surface (Story 9:16 / Feed post 4:5 / Square 1:1).
//
// The share flow is:
//   1. Fetch /api/current-share-image at the format the platform expects
//   2. Wrap it in a File and try navigator.share({ files }) — the phone
//      OS surfaces every installed app that accepts an image
//   3. If Web Share is unavailable (desktop, older browsers), download
//      the PNG and show a toast telling the user to upload it
//
// Every image also carries the referral link at the bottom so a share
// doubles as a growth surface.

import { useState } from 'react';
import { toast } from '../lib/toast';

type Format = 'story' | 'post' | 'square';

interface Platform {
  key: string;
  label: string;
  format: Format;
}

const STORY_PLATFORMS: Platform[] = [
  { key: 'ig-story',    label: 'Instagram Story',  format: 'story' },
  { key: 'tiktok',      label: 'TikTok',           format: 'story' },
  { key: 'snapchat',    label: 'Snapchat',         format: 'story' },
  { key: 'fb-story',    label: 'Facebook Story',   format: 'story' },
];

const POST_PLATFORMS: Platform[] = [
  { key: 'ig-post',     label: 'Instagram Post',   format: 'post' },
  { key: 'fb-post',     label: 'Facebook Post',    format: 'post' },
  { key: 'pinterest',   label: 'Pinterest',        format: 'post' },
];

const SQUARE_PLATFORMS: Platform[] = [
  { key: 'x',           label: 'X',                format: 'square' },
  { key: 'linkedin',    label: 'LinkedIn',         format: 'square' },
  { key: 'threads',     label: 'Threads',          format: 'square' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  currentId: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  body: string;
}

export function CurrentShareModal({
  open, onClose, currentId, authorUsername, authorAvatarUrl, body,
}: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (!open) return null;

  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/currents/${currentId}`
    : `https://mitypeapp.com/currents/${currentId}`;

  function buildImageUrl(format: Format): string {
    const params = new URLSearchParams();
    params.set('u', authorUsername || 'mitype');
    if (authorAvatarUrl) params.set('a', authorAvatarUrl);
    params.set('b', body);
    params.set('format', format);
    return `/api/current-share-image?${params.toString()}`;
  }

  async function shareToPlatform(p: Platform) {
    setBusyKey(p.key);
    try {
      const res = await fetch(buildImageUrl(p.format));
      if (!res.ok) throw new Error(`image build failed: ${res.status}`);
      const blob = await res.blob();
      const filename = `mitype-current-${p.format}-${currentId.slice(0, 8)}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      // Web Share API with files: works on iOS Safari + Android Chrome.
      const shareData: ShareData = {
        files: [file],
        title: `@${authorUsername || 'mitype'} on The Current`,
        text: `${body}\n\n${currentUrl}`,
      };
      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare(shareData);

      if (canShareFiles && typeof navigator.share === 'function') {
        try {
          await navigator.share(shareData);
          toast.success(`Ready for ${p.label}`);
        } catch (err: any) {
          // User cancelled — silent.
          if (err?.name !== 'AbortError') throw err;
        }
      } else {
        // Desktop / unsupported: download the PNG so the user can
        // upload it into the target app themselves.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Image saved. Open ${p.label} and upload it.`);
      }
    } catch (e: any) {
      console.error('[currents/share] failed:', e);
      toast.error(e?.message || 'Could not build share image.');
    } finally {
      setBusyKey(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link.');
    }
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share this current"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(4,10,24,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#0f2044',
          border: '1px solid rgba(125,211,252,0.35)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '20px 22px 28px',
          color: 'white',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 -30px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 42, height: 4, background: 'rgba(255,255,255,0.25)',
          borderRadius: 100, margin: '0 auto 16px',
        }} />

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18,
        }}>
          <h2 style={{
            margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px',
          }}>
            Share this current
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.10)', border: 'none',
              color: 'white', cursor: 'pointer', fontSize: 18, fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        </div>

        <p style={{
          margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.70)',
          lineHeight: 1.5,
        }}>
          Pick where you want to post. The image renders at the exact size that platform needs so nothing gets cropped.
        </p>

        <Group label="Story (9:16)" caption="Full-screen vertical stories">
          {STORY_PLATFORMS.map((p) => (
            <PlatformButton
              key={p.key}
              label={p.label}
              onClick={() => shareToPlatform(p)}
              busy={busyKey === p.key}
              disabled={!!busyKey}
            />
          ))}
        </Group>

        <Group label="Feed post (4:5)" caption="Portrait feed posts">
          {POST_PLATFORMS.map((p) => (
            <PlatformButton
              key={p.key}
              label={p.label}
              onClick={() => shareToPlatform(p)}
              busy={busyKey === p.key}
              disabled={!!busyKey}
            />
          ))}
        </Group>

        <Group label="Square (1:1)" caption="Standard square posts">
          {SQUARE_PLATFORMS.map((p) => (
            <PlatformButton
              key={p.key}
              label={p.label}
              onClick={() => shareToPlatform(p)}
              busy={busyKey === p.key}
              disabled={!!busyKey}
            />
          ))}
        </Group>

        <div style={{
          marginTop: 18, paddingTop: 18,
          borderTop: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <button
            type="button"
            onClick={copyLink}
            style={{
              width: '100%', padding: '12px 16px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, color: 'white',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({
  label, caption, children,
}: { label: string; caption: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 900, color: '#7dd3fc',
          textTransform: 'uppercase', letterSpacing: '1.4px',
        }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          {caption}
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8,
      }}>
        {children}
      </div>
    </div>
  );
}

function PlatformButton({
  label, onClick, busy, disabled,
}: { label: string; onClick: () => void; busy: boolean; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '12px 14px',
        background: busy
          ? 'rgba(125,211,252,0.25)'
          : 'rgba(255,255,255,0.08)',
        border: `1px solid ${busy ? 'rgba(125,211,252,0.55)' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 12, color: 'white',
        fontSize: 13, fontWeight: 700, cursor: disabled ? 'wait' : 'pointer',
        textAlign: 'center', fontFamily: 'inherit',
        opacity: disabled && !busy ? 0.4 : 1,
      }}
    >
      {busy ? 'Building…' : label}
    </button>
  );
}
