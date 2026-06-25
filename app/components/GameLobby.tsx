'use client';
// Pick-a-game lobby — the SINGLE entry point for every game in the
// chat. Live multiplayer games are grouped by category (Quick & social,
// Strategy & board, Word & trivia, Creative & collab) so the list
// stays scannable as the catalog grows. Mini-games live at the bottom.
//
// Layout choices that matter:
//   - Cards are deliberately compact (~62px tall) so 6–8 fit per screen
//     before scroll. With 11+ games, we want users to see most of the
//     catalog without thumb-marathoning.
//   - Each card shows the title, vibe pill, and duration. The tagline
//     truncates to one line. Tap the ⓘ-ish info button on a card to
//     expand the full how-to-play preview before committing.
//   - Section headers double as filter chips at the top — tapping a
//     chip jumps the scroll to that section.

import { useMemo, useRef, useState } from 'react';
import {
  GAME_CATALOG,
  GAME_CATEGORY_LABELS,
  GAME_CATEGORY_ORDER,
  type GameCatalogEntry,
  type GameCategory,
  type GameKey,
} from '../lib/gameCatalog';

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

const VIBE_LABEL: Record<GameCatalogEntry['vibe'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Deep',
};

export function GameLobby({ open, onClose, onPickLive, onPickMini, partnerUsername }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [expanded, setExpanded] = useState<GameKey | null>(null);

  // Group games by category. Empty buckets are skipped at render time.
  const grouped = useMemo(() => {
    const map: Record<GameCategory, GameCatalogEntry[]> = {
      quick: [],
      strategy: [],
      word: [],
      creative: [],
    };
    for (const g of GAME_CATALOG) map[g.category].push(g);
    return map;
  }, []);

  function jumpTo(category: GameCategory) {
    const target = sectionRefs.current[category];
    const scroller = scrollRef.current;
    if (!target || !scroller) return;
    scroller.scrollTo({
      top: target.offsetTop - scroller.offsetTop - 8,
      behavior: 'smooth',
    });
  }

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
          maxWidth: 460,
          maxHeight: 'min(92vh, 820px)',
          background: 'linear-gradient(180deg, #fff8ec 0%, #fff3ec 100%)',
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 22px 10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 21,
              fontWeight: 900,
              color: '#1a1208',
              letterSpacing: '-0.5px',
            }}>
              Pick a game
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
            fontSize: 13,
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}>
            {partnerUsername
              ? <>Invite <strong>@{partnerUsername}</strong>. Tap a card to send the invite.</>
              : 'Tap a card to send the invite.'}
          </p>

          {/* Category jump chips */}
          <div style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {GAME_CATEGORY_ORDER.filter((c) => grouped[c].length > 0).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => jumpTo(cat)}
                style={chip}
              >
                {GAME_CATEGORY_LABELS[cat]}
                <span style={chipCount}>{grouped[cat].length}</span>
              </button>
            ))}
            <button type="button" onClick={() => jumpTo('quick')} style={{ ...chip, visibility: 'hidden' }} aria-hidden>
              spacer
            </button>
          </div>
        </div>

        {/* Scroller */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flex: 1,
            padding: '4px 18px 22px',
            gap: 18,
          }}
        >
          {GAME_CATEGORY_ORDER.map((cat) => {
            const games = grouped[cat];
            if (games.length === 0) return null;
            return (
              <div
                key={cat}
                ref={(el) => { sectionRefs.current[cat] = el; }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <SectionHeader>{GAME_CATEGORY_LABELS[cat]}</SectionHeader>
                {games.map((g) => (
                  <GameRow
                    key={g.key}
                    entry={g}
                    expanded={expanded === g.key}
                    onToggleExpand={() => setExpanded((cur) => cur === g.key ? null : g.key)}
                    onPick={() => onPickLive(g.key)}
                  />
                ))}
              </div>
            );
          })}

          {/* Mini-games */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionHeader>Quick mini-games</SectionHeader>
            <p style={miniBlurb}>
              Send a single card straight into the chat. No live session,
              partner replies inside the message.
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
                  <div style={cardTitle}>{g.name}</div>
                  <div style={cardTagline}>{g.tagline}</div>
                </div>
                <span aria-hidden="true" style={arrowStyle}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameRow({ entry, expanded, onToggleExpand, onPick }: {
  entry: GameCatalogEntry;
  expanded: boolean;
  onToggleExpand: () => void;
  onPick: () => void;
}) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(200,149,108,0.22)',
      borderRadius: 14,
      boxShadow: '0 3px 10px rgba(200,149,108,0.06)',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={onPick}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <div style={iconBubble}>{entry.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cardTitle}>{entry.name}</div>
          <div style={cardTagline}>{entry.tagline}</div>
          <div style={{
            display: 'flex',
            gap: 6,
            marginTop: 6,
            flexWrap: 'wrap',
          }}>
            <span style={vibePill(entry.vibe)}>{VIBE_LABEL[entry.vibe]}</span>
            <span style={pill}>{entry.duration}</span>
          </div>
        </div>
        <span aria-hidden="true" style={arrowStyle}>→</span>
      </button>
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        padding: '0 12px 8px',
      }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a07a4d',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '2px 8px',
            borderRadius: 100,
            fontFamily: 'inherit',
          }}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide how to play' : 'How to play'}
        </button>
      </div>
      {expanded && (
        <div style={{
          padding: '0 14px 14px',
          fontSize: 12.5,
          color: '#5b4a36',
          lineHeight: 1.55,
        }}>
          <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {entry.howToPlay.slice(0, 4).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {entry.howToPlay.length > 4 && (
            <div style={{ marginTop: 6, color: '#a89278', fontSize: 11, fontStyle: 'italic' }}>
              Tap ⓘ in-game for the full rules.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      background: 'linear-gradient(180deg, #fff8ec 0%, rgba(255,248,236,0.95) 100%)',
      padding: '6px 2px 4px',
      fontSize: 11, fontWeight: 800,
      color: '#a07a4d', textTransform: 'uppercase',
      letterSpacing: '1.5px',
      zIndex: 1,
    }}>
      {children}
    </div>
  );
}

// ─────────────── Shared styles ───────────────
const chip: React.CSSProperties = {
  flexShrink: 0,
  padding: '6px 12px',
  background: 'white',
  border: '1px solid rgba(200,149,108,0.3)',
  borderRadius: 100,
  fontSize: 12,
  fontWeight: 700,
  color: '#7a5a36',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
};
const chipCount: React.CSSProperties = {
  background: 'rgba(200,149,108,0.18)',
  color: '#8a5e2e',
  borderRadius: 100,
  padding: '0 6px',
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1.6,
};
const miniCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: 12,
  background: 'rgba(255,255,255,0.55)',
  border: '1px dashed rgba(200,149,108,0.4)',
  borderRadius: 14,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
};
const iconBubble: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12,
  background: 'linear-gradient(135deg, #fff3ec, #ffe1c8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 22,
  flexShrink: 0,
};
const cardTitle: React.CSSProperties = {
  fontSize: 15, fontWeight: 800, color: '#1a1208',
  letterSpacing: '-0.2px',
  display: 'flex', alignItems: 'center', gap: 8,
  flexWrap: 'wrap',
};
const cardTagline: React.CSSProperties = {
  fontSize: 12, color: '#7a6a4f', marginTop: 2,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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
function vibePill(vibe: GameCatalogEntry['vibe']): React.CSSProperties {
  const palette = vibe === 'easy'
    ? { bg: 'rgba(34,197,94,0.12)', fg: '#15803d' }
    : vibe === 'medium'
      ? { bg: 'rgba(200,149,108,0.16)', fg: '#a07a4d' }
      : { bg: 'rgba(139,92,246,0.14)', fg: '#6d28d9' };
  return {
    ...pill,
    background: palette.bg,
    color: palette.fg,
  };
}
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
