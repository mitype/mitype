'use client';
// InviteSharePanel — invite-a-friend modal.
//
// Lets a user share Mitype to all major social platforms with:
//   - A personalized story image (auto-generated, includes their @handle)
//   - A pre-filled caption: "I just found my type on Mitype — join me."
//   - Their personal referral URL: mitypeapp.com/?ref=<username>
//
// Platform buttons:
//   - Instagram / TikTok / Snapchat → uses the Web Share API to open the
//     OS share sheet with the image attached (works perfectly on iOS;
//     Android picks up the file too)
//   - Facebook / X / Threads → opens the platform's official share intent URL
//   - Text message → opens sms: with prefilled body
//   - Copy link → puts the referral URL on the clipboard
//   - Download image → saves the personalized PNG to their device

import { useRef, useState } from 'react';
import { toast } from '../lib/toast';

interface Props {
  username: string;
  /** The sender's profile photo URL. Passed through to the share image
   *  so the personalized story includes their avatar instead of just
   *  their handle. */
  avatarUrl?: string | null;
  open: boolean;
  onClose: () => void;
}

const BASE = 'https://www.mitypeapp.com';
const SHARE_TEXT = 'I found my type of people on Mitype. Join me.';
// Swipe-down-to-close: minimum vertical pixels and max horizontal drift.
const DISMISS_THRESHOLD_PX = 90;
const MAX_HORIZONTAL_DRIFT = 60;

export function InviteSharePanel({ username, avatarUrl, open, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const referralUrl = `${BASE}/?ref=${encodeURIComponent(username)}`;
  // Pass the avatar URL through to the share image so it can render the
  // sender's circle. Falls back to a bronze monogram in the OG renderer
  // when no avatar is set.
  const avatarParam = avatarUrl ? `&a=${encodeURIComponent(avatarUrl)}` : '';
  const imageUrl = `${BASE}/api/share-image?u=${encodeURIComponent(username)}${avatarParam}`;
  const fullText = `${SHARE_TEXT} ${referralUrl}`;

  if (!open) return null;

  // ---- Swipe-down-to-close gesture (iOS bottom-sheet behavior). ----
  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    startYRef.current = t.clientY;
    startXRef.current = t.clientX;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return;
    const t = e.touches[0];
    if (!t) return;
    const dy = t.clientY - startYRef.current;
    if (dy > 0) setDragY(dy);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const startY = startYRef.current;
    const startX = startXRef.current;
    startYRef.current = null;
    startXRef.current = null;
    if (startY === null || startX === null) { setDragY(0); return; }
    const t = e.changedTouches[0];
    if (!t) { setDragY(0); return; }
    const dy = t.clientY - startY;
    const dx = Math.abs(t.clientX - startX);
    if (dy > DISMISS_THRESHOLD_PX && dx < MAX_HORIZONTAL_DRIFT) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  async function fetchImageFile(): Promise<File | null> {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new File([blob], `mitype-${username}.png`, { type: 'image/png' });
    } catch (err) {
      console.error('[InviteSharePanel] fetch image failed:', err);
      return null;
    }
  }

  async function handleNativeShareWithImage() {
    const navAny = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };
    if (typeof navAny.share !== 'function') {
      toast.error('Your browser doesn\'t support direct sharing. Use the platform buttons instead.');
      return;
    }
    const file = await fetchImageFile();
    if (!file) {
      toast.error('Could not load the share image. Try the download button.');
      return;
    }
    const data: ShareData = {
      title: 'Mitype',
      text: fullText,
      files: [file],
    };
    try {
      if (navAny.canShare && !navAny.canShare(data)) {
        // Fall back to text-only share
        await navAny.share({ title: 'Mitype', text: fullText, url: referralUrl });
      } else {
        await navAny.share(data);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('[InviteSharePanel] share error:', e);
      }
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mitype-${username}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success('Image saved');
    } catch {
      toast.error('Could not save image');
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success('Link copied');
    } catch {
      window.prompt('Copy this link', referralUrl);
    }
  }

  function handleSms() {
    const encoded = encodeURIComponent(fullText);
    // iOS uses & separator; Android often uses ?. Both browsers handle either.
    window.location.href = `sms:?&body=${encoded}`;
  }

  function handleFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}&quote=${encodeURIComponent(SHARE_TEXT)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleX() {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(referralUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleThreads() {
    const url = `https://www.threads.net/intent/post?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleSnapchat() {
    // Snapchat's web sharing flow is limited; falling back to native share with
    // image is much more reliable than the deep link, which only handles URLs.
    handleNativeShareWithImage();
  }

  const platforms: Array<{
    key: string;
    label: string;
    icon: string;
    onClick: () => void;
    desc: string;
  }> = [
    {
      key: 'native',
      label: 'Story / Reel',
      icon: '↗',
      onClick: handleNativeShareWithImage,
      desc: 'Instagram, TikTok, Snapchat. Opens your share sheet with the image',
    },
    {
      key: 'sms',
      label: 'Text message',
      icon: 'SMS',
      onClick: handleSms,
      desc: 'Send to friends via iMessage / SMS',
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: 'f',
      onClick: handleFacebook,
      desc: 'Post to your timeline',
    },
    {
      key: 'x',
      label: 'X (Twitter)',
      icon: '𝕏',
      onClick: handleX,
      desc: 'Tweet your invite',
    },
    {
      key: 'threads',
      label: 'Threads',
      icon: '@',
      onClick: handleThreads,
      desc: 'Post a thread',
    },
    {
      key: 'snap',
      label: 'Snapchat',
      icon: 'S',
      onClick: handleSnapchat,
      desc: 'Save image, then share to your Snap story',
    },
    {
      key: 'copy',
      label: 'Copy link',
      icon: '⇆',
      onClick: handleCopyLink,
      desc: 'Copy your invite URL',
    },
    {
      key: 'download',
      label: downloading ? 'Saving…' : 'Save image',
      icon: '↓',
      onClick: handleDownload,
      desc: 'Download the story image to your device',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Mitype"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,18,8,0.6)',
        backdropFilter: 'blur(6px)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: 'linear-gradient(180deg, var(--brand-personal-bg-peach-warm) 0%, var(--brand-personal-bg-peach) 100%)',
          width: '100%',
          maxWidth: 520,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: '20px 22px max(28px, env(safe-area-inset-bottom)) 22px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.35)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          // Live-track the drag while finger is on screen; snap back via
          // transition when the gesture is released without dismissing.
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? 'transform 0.25s ease-out' : 'none',
          touchAction: 'pan-y',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 44,
            height: 5,
            background: 'rgba(200,149,108,0.4)',
            borderRadius: 100,
            margin: '0 auto 18px',
          }}
        />

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--brand-text-primary)',
            margin: '0 0 6px',
            letterSpacing: '-0.5px',
            textAlign: 'center',
          }}
        >
          Invite a creative friend
        </h2>
        <p
          style={{
            color: 'var(--brand-personal-text-head)',
            fontSize: 14,
            textAlign: 'center',
            margin: '0 0 18px',
          }}
        >
          Share your invite. Mitype gets better as your scene grows.
        </p>

        {/* Preview of the share image */}
        <div
          style={{
            background: 'white',
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(200,149,108,0.25)',
            marginBottom: 18,
            position: 'relative',
            aspectRatio: '9 / 16',
            maxHeight: 240,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={imageUrl}
            alt="Your invite preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        {/* Referral URL display */}
        <div
          style={{
            background: 'rgba(200,149,108,0.1)',
            border: '1px solid rgba(200,149,108,0.25)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: 'var(--brand-personal-text-head)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {referralUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              background: 'var(--brand-personal)',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Copy
          </button>
        </div>

        {/* Platform grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {platforms.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={p.onClick}
              disabled={p.key === 'download' && downloading}
              style={{
                background: 'white',
                border: '1px solid rgba(200,149,108,0.25)',
                borderRadius: 14,
                padding: '14px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(200,149,108,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--brand-text-primary)',
                  flexShrink: 0,
                }}
              >
                {p.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--brand-text-primary)',
                    marginBottom: 2,
                    lineHeight: 1.2,
                  }}
                >
                  {p.label}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: 'var(--brand-personal-text-mid)',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--brand-personal-text-mid)',
            fontSize: 14,
            fontWeight: 600,
            padding: '12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
