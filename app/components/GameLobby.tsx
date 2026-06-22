'use client';
// Pick-a-game lobby — the SINGLE entry point for every game in the
// chat. Shows live multiplayer games at the top, then a "Quick mini-
// games" section at the bottom for the one-shot in-chat games.

import { GAME_CATALOG, type GameKey } from '../lib/gameCatalog';

/** The three mini-game keys come from the existing app/lib/games.ts.
 *  Picking one of these closes the lobby and hands the key up to the
 *  parent so it can open the appropriate mini-game composer. */
export type MiniGameKey = 'ttl' | 'wyr_mini' | 'emoji';

interface MiniGameEntry {
  key: MiniGameKey;
  name: string;
  emoji: string;
  tagline: string;
}

const MINI_GAMES: MiniGameEntry[] = [
  {
    key: 'ttl',
    name: 'Two Truths & a Lie',
    emoji: '🤥',
    tagline: 'Type three things about you. They guess which is the lie.',
  },
  {
    key: 'wyr_mini',
    name: 'Would You Rather (one-shot)',
    emoji: '💭',
    tagline: 'Send a single this-or-that card right into the chat.',
  },
  {
    key: 'emoji',
    name: 'Emoji Movie',
    emoji: '🍿',
    tagline: 'Spell a movie in emojis. They guess the title.',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPickLive: (key: GameKey) => void;
  onPickMini: (key: MiniGameKey) => void;
  /** Optional context — the username of the person you'd invite. */
  partnerUsername?: string | null;
}

export function GameLobby({ open, onClose, onPickLive, onPickMini, partnerUsername }: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick a live game"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: 'min(90vh, 760px)',
          background: 'linear-gradient(180deg, #fff8ec 0%, #fff3ec 100%)',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 900,
            color: '#1a1208',
            letterSpacing: '-0.5px',
          }}>
            🎮 Pick a live game
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)',
              border: 'none', color: '#1a1208',
              fontSize: 16, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>

        <p style={{
          color: '#7a6a4f',
          fontSize: 14,
          margin: '0 0 18px',
          lineHeight: 1.5,
        }}>
          {partnerUsername
            ? <>Invite <strong>@{partnerUsername}</strong> to a quick game.</>
            : 'Invite the other player to a quick game.'}
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflowY: 'auto',
          flex: 1,
        }}>
          <SectionHeader>Live multiplayer</SectionHeader>

          {GAME_CATALOG.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onPickLive(g.key)}
              style={liveCard}
            >
              <div style={iconBubble}>{g.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={cardTitle}>
                  {g.name}
                  <span style={pill}>
                    {g.duration}
                  </span>
                </div>
                <div style={cardTagline}>{g.tagline}</div>
              </div>
              <span aria-hidden="true" style={arrowStyle}>→</span>
            </button>
          ))}

          <SectionHeader style={{ marginTop: 14 }}>Quick mini-games</SectionHeader>
          <p style={miniBlurb}>
            Send a single card straight into the chat — no live session,
            partner replies right inside the message.
          </p>

          {MINI_GAMES.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onPickMini(g.key)}
              style={miniCard}
            >
              <div style={iconBubble}>{g.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={cardTitle}>
                  {g.name}
                </div>
                <div style={cardTagline}>{g.tagline}</div>
              </div>
              <span aria-hidden="true" style={arrowStyle}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800,
      color: '#c8956c', textTransform: 'uppercase',
      letterSpacing: '1.5px',
      marginBottom: 4, marginTop: 2,
      ...style,
    }}>
      {children}
    </div>
  );
}

const liveCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: 16,
  background: 'white',
  border: '1px solid rgba(200,149,108,0.25)',
  borderRadius: 16,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  boxShadow: '0 4px 14px rgba(200,149,108,0.07)',
};
const miniCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: 14,
  background: 'rgba(255,255,255,0.55)',
  border: '1px dashed rgba(200,149,108,0.4)',
  borderRadius: 14,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
};
const iconBubble: React.CSSProperties = {
  width: 50, height: 50, borderRadius: 14,
  background: 'linear-gradient(135deg, #fff3ec, #ffe1c8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 26,
  flexShrink: 0,
};
const cardTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 800, color: '#1a1208',
  letterSpacing: '-0.2px',
  display: 'flex', alignItems: 'center', gap: 8,
  flexWrap: 'wrap',
};
const cardTagline: React.CSSProperties = {
  fontSize: 13, color: '#7a6a4f', marginTop: 3,
  lineHeight: 1.4,
};
const pill: React.CSSProperties = {
  fontSize: 10, fontWeight: 800,
  color: '#c8956c',
  background: 'rgba(200,149,108,0.12)',
  padding: '2px 7px',
  borderRadius: 100,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};
const arrowStyle: React.CSSProperties = {
  color: '#c8956c',
  fontWeight: 800,
  fontSize: 18,
  flexShrink: 0,
};
const miniBlurb: React.CSSProperties = {
  fontSize: 12, color: '#a89278',
  margin: '0 0 4px 2px', lineHeight: 1.4,
};
