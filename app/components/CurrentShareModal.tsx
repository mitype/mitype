'use client';
// CurrentShareModal — the "Share this current" sheet.
//
// Two-step flow (matches how Threads and X handle it, because
// browsers can't post to a third-party app directly):
//   Step 1: pick a platform. We build a PNG at the aspect ratio
//           that platform expects (Story 9:16 / Post 4:5 / Square 1:1).
//   Step 2: show a save-and-open screen. Tap "Save image" to drop
//           it into the camera roll (uses Web Share on iOS/Android
//           so the OS shows Save to Photos; falls back to a browser
//           download on desktop). Tap "Open <app>" to deep-link
//           straight into that platform so the user can pick the
//           image from their camera roll and post it.
//
// Why not auto-post: iOS/Android do not let a web page hand a file
// into another app's compose screen. This save-then-launch flow is
// the most reliable pattern that still works everywhere.

import { useState } from 'react';
import { toast } from '../lib/toast';

type Format = 'story' | 'post' | 'square';

interface Platform {
  key: string;
  label: string;
  format: Format;
  /** iOS/Android URL scheme that opens the app. Falls back silently
   *  if the app isn't installed. */
  deepLink?: string;
  /** Short one-line instruction for how to actually post the image
   *  once the target app is open. */
  hint: string;
}

const STORY_PLATFORMS: Platform[] = [
  { key: 'ig-story',    label: 'Instagram Story',  format: 'story', deepLink: 'instagram://story-camera',
    hint: 'Inside the Story camera, tap the small photo thumbnail in the bottom-left corner, then pick the saved image.' },
  { key: 'tiktok',      label: 'TikTok',           format: 'story', deepLink: 'snssdk1233://',
    hint: 'Tap the + button, tap Upload, then pick the saved image.' },
  { key: 'snapchat',    label: 'Snapchat',         format: 'story', deepLink: 'snapchat://',
    hint: 'From the camera screen, swipe up to open Memories, then pick the saved image from your camera roll.' },
  { key: 'fb-story',    label: 'Facebook Story',   format: 'story', deepLink: 'fb://',
    hint: 'Tap Create Story, choose Photo, then pick the saved image.' },
];

const POST_PLATFORMS: Platform[] = [
  { key: 'ig-post',     label: 'Instagram Post',   format: 'post', deepLink: 'instagram://camera',
    hint: 'Tap the + button, choose Post, then pick the saved image from your camera roll.' },
  { key: 'fb-post',     label: 'Facebook Post',    format: 'post', deepLink: 'fb://',
    hint: 'Tap What is on your mind, tap Photo, then pick the saved image.' },
  { key: 'pinterest',   label: 'Pinterest',        format: 'post', deepLink: 'pinterest://',
    hint: 'Tap Create, choose Pin, then pick the saved image.' },
];

const SQUARE_PLATFORMS: Platform[] = [
  { key: 'x',           label: 'X',                format: 'square', deepLink: 'twitter://post',
    hint: 'Tap the image icon on the post composer, then pick the saved image.' },
  { key: 'linkedin',    label: 'LinkedIn',         format: 'square', deepLink: 'linkedin://',
    hint: 'Start a post, tap the photo icon, then pick the saved image.' },
  { key: 'threads',     label: 'Threads',          format: 'square', deepLink: 'barcelona://',
    hint: 'Start a new thread, tap the paperclip icon, then pick the saved image.' },
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
  const [selected, setSelected] = useState<Platform | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);

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

  function reset() {
    setSelected(null);
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null);
    setImgBlob(null);
    setBusyKey(null);
    setSavingImage(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function pickPlatform(p: Platform) {
    setBusyKey(p.key);
    try {
      const res = await fetch(buildImageUrl(p.format));
      if (!res.ok) throw new Error(`image build failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImgBlob(blob);
      setImgUrl(url);
      setSelected(p);
    } catch (e: any) {
      console.error('[currents/share] build failed:', e);
      toast.error(e?.message || 'Could not build share image.');
    } finally {
      setBusyKey(null);
    }
  }

  async function saveImage() {
    if (!imgBlob || !selected) return;
    setSavingImage(true);
    try {
      const filename = `mitype-current-${selected.format}-${currentId.slice(0, 8)}.png`;
      const file = new File([imgBlob], filename, { type: 'image/png' });

      // On iOS/Android, navigator.share with a file surfaces the
      // native share sheet where "Save to Photos" (or Save Image on
      // Android) writes the image to the camera roll.
      const shareData: ShareData = { files: [file] };
      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare(shareData);

      if (canShareFiles && typeof navigator.share === 'function') {
        try {
          await navigator.share(shareData);
          toast.success('Saved. Now open the app.');
        } catch (err: any) {
          if (err?.name !== 'AbortError') throw err;
        }
      } else {
        // Desktop / unsupported browsers: plain download.
        const a = document.createElement('a');
        a.href = imgUrl!;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Image saved. Now open the app.');
      }
    } catch (e: any) {
      console.error('[currents/share] save failed:', e);
      toast.error(e?.message || 'Could not save image.');
    } finally {
      setSavingImage(false);
    }
  }

  function openApp() {
    if (!selected?.deepLink) return;
    // Deep-link into the target app. If the app isn't installed the
    // URL scheme fails silently and the user stays on the page.
    window.location.href = selected.deepLink;
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
      onClick={handleClose}
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
          maxHeight: '90vh',
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
          marginBottom: 14,
        }}>
          <h2 style={{
            margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px',
          }}>
            {selected ? `Share to ${selected.label}` : 'Share this current'}
          </h2>
          <button
            type="button"
            onClick={selected ? reset : handleClose}
            aria-label={selected ? 'Back' : 'Close'}
            style={{
              minWidth: 34, height: 34, padding: '0 10px',
              borderRadius: 100,
              background: 'rgba(255,255,255,0.10)', border: 'none',
              color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            {selected ? 'Back' : '×'}
          </button>
        </div>

        {selected && imgUrl ? (
          /* ---------- Step 2: save + open ---------- */
          <div>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              marginBottom: 18,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt=""
                style={{
                  maxWidth: 200,
                  maxHeight: 320,
                  borderRadius: 14,
                  border: '1px solid rgba(125,211,252,0.4)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
                }}
              />
            </div>

            {/* Reality-check notice. Web browsers can't hand a file
                straight into another app's composer, so the image will
                NOT auto-appear inside Instagram / TikTok / etc. The
                user has to pick it from their camera roll. Calling
                this out up front prevents "the button is broken"
                confusion. */}
            <div style={{
              margin: '0 0 14px', padding: '12px 14px',
              background: 'rgba(200,149,108,0.14)',
              border: '1px solid rgba(200,149,108,0.45)',
              borderRadius: 12,
              fontSize: 13, lineHeight: 1.5, color: '#ffd7ac',
            }}>
              iOS and Android do not let a browser drop an image
              directly into another app. You will pick the image from
              your camera roll once {selected.label} opens.
            </div>

            <ol style={{
              margin: '0 0 18px', padding: '0 0 0 20px',
              fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.85)',
            }}>
              <li style={{ marginBottom: 6 }}>
                Tap <strong>Save image</strong> to add it to your camera roll.
              </li>
              <li style={{ marginBottom: 6 }}>
                Tap <strong>Open {selected.label}</strong>.
              </li>
              <li>{selected.hint}</li>
            </ol>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={saveImage}
                disabled={savingImage}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'linear-gradient(135deg, #0ea5e9, #7dd3fc)',
                  border: 'none', borderRadius: 12,
                  color: '#0a1730', fontSize: 15, fontWeight: 900,
                  cursor: savingImage ? 'wait' : 'pointer',
                  fontFamily: 'inherit', letterSpacing: '-0.2px',
                }}
              >
                {savingImage ? 'Saving…' : 'Save image'}
              </button>
              {selected.deepLink && (
                <button
                  type="button"
                  onClick={openApp}
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: 'rgba(200,149,108,0.20)',
                    border: '1px solid rgba(200,149,108,0.55)',
                    borderRadius: 12,
                    color: '#ffb37c', fontSize: 15, fontWeight: 800,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Open {selected.label}
                </button>
              )}
              <button
                type="button"
                onClick={copyLink}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.20)',
                  borderRadius: 12, color: 'white',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Copy link instead
              </button>
            </div>
          </div>
        ) : (
          /* ---------- Step 1: pick a platform ---------- */
          <div>
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
                  onClick={() => pickPlatform(p)}
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
                  onClick={() => pickPlatform(p)}
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
                  onClick={() => pickPlatform(p)}
                  busy={busyKey === p.key}
                  disabled={!!busyKey}
                />
              ))}
            </Group>

            <div style={{
              marginTop: 18, paddingTop: 18,
              borderTop: '1px solid rgba(255,255,255,0.10)',
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
                Copy link only
              </button>
            </div>
          </div>
        )}
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
