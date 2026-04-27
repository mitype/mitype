'use client';
// "Invite a creative" share card. Clicking it opens the native OS share
// sheet on mobile (Web Share API), and falls back to copy-to-clipboard on
// desktop browsers that don't expose share. The link includes a ?ref=
// parameter pinned to the user's username so we have an attribution
// foundation if/when we add a referral reward system later. Right now the
// param is just tracked; nothing rewards on it yet.

import { useState } from 'react';
import { toast } from '../lib/toast';

interface Props {
  username: string | undefined;
}

const SHARE_TITLE = 'Mitype — Find Your Type of Creator';
const SHARE_TEXT =
  'Mitype is a creative networking platform for friendships and collaboration — connect with creators based on the craft they actually practice. You should join.';

export function ShareMitypeButton({ username }: Props) {
  const [hover, setHover] = useState(false);

  const link = username
    ? `https://www.mitypeapp.com/?ref=${encodeURIComponent(username)}`
    : 'https://www.mitypeapp.com/';

  async function onShare() {
    // Try the native share sheet first — that's where this is most useful
    // (iOS/Android send sheet hands you Messages, WhatsApp, IG DM, etc.).
    const navAny = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };

    if (typeof navAny.share === 'function') {
      try {
        await navAny.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: link,
        });
        return;
      } catch (e) {
        // User dismissed the sheet — that's fine, just don't fall through
        // to clipboard. AbortError is the standard "user cancelled" signal.
        if ((e as DOMException)?.name === 'AbortError') return;
        // Any other failure → fall through to copy below.
      }
    }

    // Desktop / browsers without share API → copy the link.
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied — paste it anywhere');
    } catch {
      // Last resort: a tiny prompt with the link selected so the user
      // can copy manually. Rare, but covers locked-down environments.
      window.prompt('Copy this link', link);
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, #fff3ec 0%, #ffe1c8 100%)',
        border: '1.5px solid rgba(200,149,108,0.35)',
        borderRadius: 20,
        padding: '20px 24px',
        marginBottom: 32,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        textAlign: 'left',
        fontFamily: 'inherit',
        boxShadow: hover
          ? '0 8px 22px rgba(200,149,108,0.22)'
          : '0 2px 8px rgba(200,149,108,0.12)',
        transform: hover ? 'translateY(-1px)' : 'none',
        transition:
          'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background:
            'linear-gradient(135deg, #c8956c 0%, #a07452 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        💌
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: '#1a1208',
            fontSize: 15,
            fontWeight: 800,
            margin: '0 0 3px',
            letterSpacing: '-0.2px',
          }}
        >
          Invite a creative friend
        </p>
        <p style={{ color: '#8a7560', fontSize: 13, margin: 0, lineHeight: 1.4 }}>
          Mitype works better the bigger your scene gets. Send your link and
          help us grow it.
        </p>
      </div>
      <div
        aria-hidden="true"
        style={{
          color: '#c8956c',
          fontSize: 18,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        →
      </div>
    </button>
  );
}
