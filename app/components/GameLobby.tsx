'use client';
// Game lobby — the picker the user sees when they want to invite the
// other person to play. Lists every available game with a vibe pill
// and a tap target. Tap → calls onPick with the game key.

import { GAME_CATALOG, type GameKey } from '../lib/gameCatalog';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (key: GameKey) => void;
  /** Optional context — the username of the person you'd invite. */
  partnerUsername?: string | null;
}

export function GameLobby({ open, onClose, onPick, partnerUsername }: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick a game to play"
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
          maxHeight: 'min(90vh, 700px)',
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
            🎮 Pick a game
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
          {GAME_CATALOG.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onPick(g.key)}
              style={{
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
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
              }}
            >
              <div style={{
                width: 50, height: 50, borderRadius: 14,
                background: 'linear-gradient(135deg, #fff3ec, #ffe1c8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
                flexShrink: 0,
              }}>
                {g.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 16, fontWeight: 800, color: '#1a1208',
                  letterSpacing: '-0.2px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  flexWrap: 'wrap',
                }}>
                  {g.name}
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    color: '#c8956c',
                    background: 'rgba(200,149,108,0.12)',
                    padding: '2px 7px',
                    borderRadius: 100,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {g.duration}
                  </span>
                </div>
                <div style={{
                  fontSize: 13, color: '#7a6a4f', marginTop: 3,
                  lineHeight: 1.4,
                }}>
                  {g.tagline}
                </div>
              </div>
              <span aria-hidden="true" style={{
                color: '#c8956c',
                fontWeight: 800,
                fontSize: 18,
                flexShrink: 0,
              }}>
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
