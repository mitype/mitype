'use client';
// In-game "How to play" modal. Renders any game's catalog instructions
// (one paragraph per step). Used by the ⓘ button inside the game header.

import { getGame } from '../lib/gameCatalog';

interface Props {
  gameKey: string;
  open: boolean;
  onClose: () => void;
}

export function GameInstructions({ gameKey, open, onClose }: Props) {
  if (!open) return null;
  const game = getGame(gameKey);
  if (!game) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`How to play ${game.name}`}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 1150,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          maxHeight: 'min(85vh, 640px)',
          background: 'linear-gradient(180deg, #fff8ec 0%, #fff3ec 100%)',
          borderRadius: 24,
          padding: 22,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <h2 style={{
            margin: 0, fontSize: 19, fontWeight: 900, color: '#1a1208',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span aria-hidden="true">{game.emoji}</span>
            How to play
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)',
              border: 'none', color: '#1a1208', fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>

        <p style={{
          fontSize: 11, fontWeight: 800,
          color: '#c8956c', textTransform: 'uppercase',
          letterSpacing: '1.4px', margin: '0 0 8px',
        }}>
          {game.name}
        </p>

        <div style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 12,
          paddingRight: 4,
        }}>
          {game.howToPlay.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#c8956c', color: 'white',
                fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <p style={{
                margin: 0, fontSize: 14, lineHeight: 1.55,
                color: '#1a1208',
              }}>
                {step}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16,
            padding: '12px 18px',
            background: '#c8956c',
            color: 'white',
            border: 'none', borderRadius: 100,
            fontSize: 14, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 8px 22px rgba(200,149,108,0.32)',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
