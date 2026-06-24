'use client';
// GameContainer — the chrome around any active game.
//
// Responsibilities:
//   - Subscribes to real-time updates on game_sessions.<id> via Supabase
//   - Shows the title + ⓘ instructions + 🚪 end-game header
//   - Renders the right game body component
//   - Handles "end game" flow:
//       * Sets status='ended', ended_reason='quit'
//       * Real-time update fires on the partner's screen
//       * Both players see the "Play another?" prompt
//       * Picking another game opens GameLobby; picking close deletes
//         the session row (no resume-later persistence)
//   - When the game finishes naturally (status='ended' from inside the
//     game body), shows the final score + same "play another?" CTA

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { GameInstructions } from './GameInstructions';
import { GameLobby } from './GameLobby';
import { getGame, type GameKey } from '../lib/gameCatalog';
import { WouldYouRather } from './games/WouldYouRather';
import { ThisOrThat } from './games/ThisOrThat';
import { TicTacToe } from './games/TicTacToe';
import { ConnectFour } from './games/ConnectFour';
import { TriviaBattle } from './games/TriviaBattle';
import { StoryBuilder } from './games/StoryBuilder';
import { Hangman } from './games/Hangman';
import { Checkers } from './games/Checkers';
import { Battleship } from './games/Battleship';
import { Chess } from './games/Chess';
import { WordDuel } from './games/WordDuel';
import { Pictionary } from './games/Pictionary';
import { WordAssociation } from './games/WordAssociation';
import { LyricQuoteGuess } from './games/LyricQuoteGuess';

export interface GameSession {
  id: string;
  conversation_id: string;
  game_type: string;
  status: 'pending' | 'active' | 'ended';
  inviter_id: string;
  invitee_id: string;
  state: any;
  ended_by_user_id: string | null;
  ended_reason: string | null;
}

interface Props {
  session: GameSession;
  currentUserId: string;
  partnerUsername?: string | null;
  /** Called when the session should be replaced with a fresh one
   *  (the user picked another game). Parent creates the new session. */
  onStartNewGame: (gameKey: GameKey) => void;
  /** Called when the user closes out completely with no follow-up. */
  onExit: () => void;
}

export function GameContainer({
  session: initial,
  currentUserId,
  partnerUsername,
  onStartNewGame,
  onExit,
}: Props) {
  const [session, setSession] = useState<GameSession>(initial);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Realtime: subscribe to changes on this session row.
  useEffect(() => {
    const channel = supabase
      .channel(`game-session-${initial.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${initial.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            onExit();
            return;
          }
          if (payload.new) {
            setSession(payload.new as GameSession);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  // Update local state when parent passes a fresh session prop in.
  const lastSessionId = useRef(initial.id);
  useEffect(() => {
    if (initial.id !== lastSessionId.current) {
      lastSessionId.current = initial.id;
      setSession(initial);
    }
  }, [initial]);

  const game = getGame(session.game_type);

  // Helper exposed to game bodies so they can write state changes.
  async function updateState(nextState: any, opts?: { setStatus?: 'active' | 'ended'; reason?: string }) {
    const patch: any = { state: nextState, updated_at: new Date().toISOString() };
    if (opts?.setStatus) patch.status = opts.setStatus;
    if (opts?.setStatus === 'ended') {
      patch.ended_at = new Date().toISOString();
      patch.ended_reason = opts.reason ?? 'finished';
    }
    const { error } = await supabase
      .from('game_sessions')
      .update(patch)
      .eq('id', session.id);
    if (error) {
      console.error('[game-container] update error:', error);
      toast.error("Game state didn't sync — your partner may need to refresh.");
    } else {
      setSession((prev) => ({ ...prev, ...patch }));
    }
  }

  // Quit handler — flips status to 'ended' AND updates local state
  // immediately so the game-over panel appears without waiting for
  // the Realtime round-trip. This makes the end-game button feel
  // instant AND it works even if Supabase Realtime isn't enabled on
  // the table yet (the partner still gets the update once Realtime
  // catches up).
  async function quitGame() {
    setConfirmEnd(false);

    // Snapshot for rollback in case the DB write fails.
    const previousSession = session;
    const endedAt = new Date().toISOString();

    setSession((prev) => ({
      ...prev,
      status: 'ended',
      ended_reason: 'quit',
      ended_by_user_id: currentUserId,
      ended_at: endedAt,
    }));

    const { error } = await supabase
      .from('game_sessions')
      .update({
        status: 'ended',
        ended_reason: 'quit',
        ended_by_user_id: currentUserId,
        ended_at: endedAt,
      })
      .eq('id', session.id);
    if (error) {
      console.error('[game-container] quit error:', error);
      toast.error('Could not end the game.');
      // Roll the optimistic transition back.
      setSession(previousSession);
      return;
    }
  }

  // Close out completely → deletes the session row so no storage left
  // behind. Per spec, games aren't saved to resume later.
  async function closeOut() {
    await supabase.from('game_sessions').delete().eq('id', session.id);
    onExit();
  }

  const isOver = session.status === 'ended';
  const quitByPartner = isOver && session.ended_reason === 'quit'
    && session.ended_by_user_id !== currentUserId;

  return (
    <div
      data-no-swipe-back="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1080,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'max(14px, env(safe-area-inset-top)) 16px 12px',
        background: 'rgba(20,12,4,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          minWidth: 0, flex: 1,
        }}>
          <span aria-hidden="true" style={{ fontSize: 24 }}>{game?.emoji ?? '🎮'}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 900, color: 'white',
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {game?.name ?? 'Game'}
            </div>
            {partnerUsername && (
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.65)',
                whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                vs @{partnerUsername}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowInstructions(true)}
          aria-label="How to play"
          title="How to play"
          style={iconBtn}
        >
          ⓘ
        </button>
        {!isOver && (
          <button
            type="button"
            onClick={() => setConfirmEnd(true)}
            aria-label="End game"
            title="End game"
            style={{ ...iconBtn, color: '#ff8e8e' }}
          >
            ✕
          </button>
        )}
      </header>

      {/* Body */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px max(20px, env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: 'white',
      }}>
        {isOver ? (
          <GameOverPanel
            session={session}
            quitByPartner={quitByPartner}
            partnerUsername={partnerUsername}
            currentUserId={currentUserId}
            onPlayAnother={() => setShowLobby(true)}
            onClose={closeOut}
          />
        ) : session.game_type === 'wyr' ? (
          <WouldYouRather
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'tot' ? (
          <ThisOrThat
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'ttt' ? (
          <TicTacToe
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'c4' ? (
          <ConnectFour
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'trivia' ? (
          <TriviaBattle
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'story' ? (
          <StoryBuilder
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'hangman' ? (
          <Hangman
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'checkers' ? (
          <Checkers
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'battleship' ? (
          <Battleship
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'chess' ? (
          <Chess
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'wordduel' ? (
          <WordDuel
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'pictionary' ? (
          <Pictionary
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'wordassoc' ? (
          <WordAssociation
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : session.game_type === 'lyricquote' ? (
          <LyricQuoteGuess
            session={session}
            currentUserId={currentUserId}
            updateState={updateState}
          />
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.6)' }}>
            Unsupported game type.
          </div>
        )}
      </main>

      {/* Modals */}
      <GameInstructions
        gameKey={session.game_type}
        open={showInstructions}
        onClose={() => setShowInstructions(false)}
      />

      <GameLobby
        open={showLobby}
        onClose={() => setShowLobby(false)}
        partnerUsername={partnerUsername ?? undefined}
        onPickLive={async (key) => {
          setShowLobby(false);
          // Clean up the current ended session so we don't leak storage,
          // then ask the parent to spin up a fresh one of the picked type.
          await supabase.from('game_sessions').delete().eq('id', session.id);
          onStartNewGame(key);
        }}
        // Mini-games can't be launched from inside an active game.
        onPickMini={() => {
          setShowLobby(false);
        }}
      />

      {/* End-game confirmation */}
      {confirmEnd && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmEnd(false)}
          style={confirmOverlayStyle}
        >
          <div onClick={(e) => e.stopPropagation()} style={confirmPanelStyle}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: '#1a1208' }}>
              End this game?
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 14, color: '#6b5744', lineHeight: 1.5 }}>
              Your partner will be told you ended it, and you&rsquo;ll both
              be asked if you want to play something else.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                style={{ ...confirmBtn, background: 'transparent', color: '#8a7560', border: '1px solid rgba(200,149,108,0.4)' }}
              >
                Keep playing
              </button>
              <button
                type="button"
                onClick={quitGame}
                style={{ ...confirmBtn, background: '#ff5a5a', color: 'white', boxShadow: '0 8px 22px rgba(255,90,90,0.4)' }}
              >
                End game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameOverPanel({
  session,
  quitByPartner,
  partnerUsername,
  currentUserId,
  onPlayAnother,
  onClose,
}: {
  session: GameSession;
  quitByPartner: boolean;
  partnerUsername?: string | null;
  currentUserId: string;
  onPlayAnother: () => void;
  onClose: () => void;
}) {
  // Game-specific final summary. For "in-sync" games (wyr/tot) we
  // show matchCount; for competitive games (ttt/c4) we show the
  // head-to-head match wins.
  const isInSyncGame = session.game_type === 'wyr' || session.game_type === 'tot';
  const totalRounds = session.state?.totalRounds as number | undefined;
  const scores = session.state?.scores as Record<string, number> | undefined;
  const myScore = isInSyncGame ? undefined : scores?.[currentUserId];
  const partnerScore = isInSyncGame
    ? undefined
    : (scores ? Object.entries(scores).find(([id]) => id !== currentUserId && id !== 'draws')?.[1] : undefined);
  const matches = session.state?.matchCount as number | undefined;

  let title: string;
  let body: string;
  if (quitByPartner) {
    title = 'Your partner ended the game';
    body = partnerUsername
      ? `@${partnerUsername} called it. No worries — try a different one?`
      : 'They called it. No worries — try a different one?';
  } else if (session.ended_reason === 'quit') {
    title = 'Game ended';
    body = 'You called it. Want to play something else?';
  } else {
    title = 'GG! 🎉';
    body = 'That was a fun one. Run it back?';
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', textAlign: 'center',
      maxWidth: 420, width: '100%',
      padding: '32px 0',
    }}>
      <div style={{ fontSize: 64, marginBottom: 14 }}>
        {quitByPartner ? '👋' : session.ended_reason === 'quit' ? '🚪' : '🎉'}
      </div>
      <h2 style={{
        margin: '0 0 10px', fontSize: 28, fontWeight: 900,
        color: 'white', letterSpacing: '-0.5px',
      }}>
        {title}
      </h2>
      <p style={{
        margin: '0 0 24px',
        color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.5,
      }}>
        {body}
      </p>

      {/* Score panel — only shown when natural end + scores present. */}
      {session.ended_reason === 'finished' && (myScore !== undefined || matches !== undefined) && (
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18,
          padding: '16px 22px',
          marginBottom: 26,
          minWidth: 240,
        }}>
          {matches !== undefined && (
            <div style={{ marginBottom: myScore !== undefined ? 12 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#ffd5a8', textTransform: 'uppercase', letterSpacing: '1.3px' }}>
                In-sync score
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'white' }}>
                {matches}<span style={{ fontSize: 18, opacity: 0.6 }}> / {totalRounds ?? 7}</span>
              </div>
            </div>
          )}
          {myScore !== undefined && partnerScore !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#ffd5a8', textTransform: 'uppercase' }}>You</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>{myScore}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#ffd5a8', textTransform: 'uppercase' }}>
                  {partnerUsername ? `@${partnerUsername}` : 'Them'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>{partnerScore}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onPlayAnother}
        style={{
          padding: '14px 28px',
          background: '#c8956c',
          color: 'white',
          border: 'none', borderRadius: 100,
          fontSize: 15, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 10px 28px rgba(200,149,108,0.4)',
          marginBottom: 10,
          minWidth: 240,
        }}
      >
        🎮 Play another game
      </button>
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: '12px 26px',
          background: 'transparent',
          color: 'rgba(255,255,255,0.7)',
          border: 'none',
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Close
      </button>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 36, height: 36,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: 'white',
  fontSize: 17,
  fontWeight: 800,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
  padding: 0,
  flexShrink: 0,
};

const confirmOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, zIndex: 1200,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
};
const confirmPanelStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 360,
  background: 'linear-gradient(180deg, #fff8ec, #fff3ec)',
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
};
const confirmBtn: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  border: 'none',
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
