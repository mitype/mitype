'use client';
// Pictionary — one player draws, the other guesses.
//
// The interesting thing about this game vs. our other games is the
// real-time canvas sync. We can't push every drawing point through
// `game_sessions.state` because Postgres updates are ~200-500ms each
// and drawing needs to feel live (~30ms latency). So:
//
//   - We use a Supabase BROADCAST channel for ephemeral, high-rate
//     stroke deltas (the live drawing). Broadcast is fire-and-forget,
//     low-latency, and only delivered to currently-subscribed peers.
//   - We use the existing game_sessions.state (postgres) for slower,
//     persistent things: phase transitions, scores, guesses, round
//     outcome. These survive page reloads.
//
// What the broadcast carries:
//   { type: 'stroke', points: [[x,y], [x,y], ...] }   // adds a stroke
//   { type: 'clear' }                                  // wipes canvas
//
// What the DB carries (state):
//   {
//     phase: 'word-select' | 'drawing' | 'round-end' | 'over',
//     roundNumber: number,
//     totalRounds: number,
//     drawerId: string,
//     wordChoices: PictionaryWord[] | null,  // visible only to drawer client-side
//     currentWord: PictionaryWord | null,    // visible only to drawer client-side
//     scores: { [user_id]: number },
//     guesses: Array<{ by: string; text: string; correct: boolean; at: number }>,
//     roundStartedAt: number | null,
//     lastRoundResult: { ... } | null,
//   }
//
// Privacy note: the word IS in the shared state, so a determined player
// could DevTools-peek. Same trust model as Battleship's fleets. Calling
// it out in the how-to-play card is enough for a friendly chat game.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { GameSession } from '../GameContainer';
import {
  pickPictionaryChoices,
  guessMatches,
  pointsFor,
  type PictionaryWord,
} from '../../lib/pictionaryWords';

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

interface PicGuess {
  by: string;
  text: string;
  correct: boolean;
  at: number;
}

interface RoundResult {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
  guesserCorrect: boolean;
  guesserPoints: number;
  drawerPoints: number;
}

interface PicState {
  phase: 'word-select' | 'drawing' | 'round-end' | 'over';
  roundNumber: number;
  totalRounds: number;
  drawerId: string;
  wordChoices: PictionaryWord[] | null;
  currentWord: PictionaryWord | null;
  scores: Record<string, number>;
  guesses: PicGuess[];
  roundStartedAt: number | null;
  lastRoundResult: RoundResult | null;
}

const ROUND_DURATION_MS = 90_000;
const TOTAL_ROUNDS = 4; // 2 turns per player as drawer
const CANVAS_W = 320;
const CANVAS_H = 320;

function freshState(inviterId: string): PicState {
  return {
    phase: 'word-select',
    roundNumber: 1,
    totalRounds: TOTAL_ROUNDS,
    drawerId: inviterId,
    wordChoices: pickPictionaryChoices(1),
    currentWord: null,
    scores: {},
    guesses: [],
    roundStartedAt: null,
    lastRoundResult: null,
  };
}

export function Pictionary({ session, currentUserId, updateState }: Props) {
  // ─────────────── State seeding (inviter only) ───────────────
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.phase)
    ) {
      void updateState(freshState(session.inviter_id), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.phase) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(freshState(session.inviter_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  // ─────────────── Canvas refs + state ───────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  // Per-stroke working buffer for the drawer.
  const currentStrokeRef = useRef<Array<[number, number]>>([]);
  // All strokes drawn this round (used to redraw on resize and to
  // catch up late-joining renders).
  const strokesRef = useRef<Array<Array<[number, number]>>>([]);
  const drawingRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [guess, setGuess] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // Re-render every second so the timer animates.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // ─────────────── Broadcast channel for live strokes ───────────────
  useEffect(() => {
    const channel = supabase.channel(`pictionary-${session.id}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'stroke' }, ({ payload }) => {
      if (!payload?.points) return;
      const pts = payload.points as Array<[number, number]>;
      strokesRef.current.push(pts);
      drawStroke(pts);
    });
    channel.on('broadcast', { event: 'clear' }, () => {
      strokesRef.current = [];
      clearCanvas();
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [session.id]);

  // ─────────────── Setup canvas on mount + reset when round changes ───────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1a1208';
    ctxRef.current = ctx;
    clearCanvas();
    // Replay any strokes we already have (e.g. after a re-render).
    for (const s of strokesRef.current) drawStroke(s);
  }, []);

  // Reset canvas at the start of each new round.
  const rawState = (session.state ?? null) as PicState | null;
  const roundKey = rawState?.roundNumber ?? 0;
  useEffect(() => {
    strokesRef.current = [];
    clearCanvas();
  }, [roundKey, rawState?.phase]);

  if (!rawState || !rawState.phase) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: PicState = rawState;

  const partnerId = currentUserId === session.inviter_id ? session.invitee_id : session.inviter_id;
  const iAmDrawer = state.drawerId === currentUserId;
  const myScore = state.scores[currentUserId] ?? 0;
  const partnerScore = state.scores[partnerId] ?? 0;

  // ─────────────── Drawing helpers ───────────────
  function drawStroke(points: Array<[number, number]>) {
    const ctx = ctxRef.current;
    if (!ctx || points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();
  }
  function clearCanvas() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fffaf2';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function pointFromEvent(ev: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return [
      Math.round((ev.clientX - rect.left) * scaleX),
      Math.round((ev.clientY - rect.top) * scaleY),
    ];
  }

  function handlePointerDown(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!iAmDrawer || state.phase !== 'drawing') return;
    ev.preventDefault();
    drawingRef.current = true;
    currentStrokeRef.current = [pointFromEvent(ev)];
    (ev.target as HTMLCanvasElement).setPointerCapture(ev.pointerId);
  }
  function handlePointerMove(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const point = pointFromEvent(ev);
    const buf = currentStrokeRef.current;
    if (buf.length > 0) {
      const last = buf[buf.length - 1];
      // Drop micro-moves to keep traffic light.
      if (Math.abs(point[0] - last[0]) < 1 && Math.abs(point[1] - last[1]) < 1) return;
    }
    buf.push(point);
    // Render last segment locally
    drawStroke(buf.slice(-2));
  }
  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = [];
    if (stroke.length === 0) return;
    strokesRef.current.push(stroke);
    // Broadcast the completed stroke to the guesser. We send entire
    // strokes (not per-point) to keep wire chatter low while still
    // feeling live — most strokes are <50 points.
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stroke',
      payload: { points: stroke },
    });
  }

  async function clearDrawing() {
    if (!iAmDrawer) return;
    strokesRef.current = [];
    clearCanvas();
    channelRef.current?.send({
      type: 'broadcast',
      event: 'clear',
      payload: {},
    });
  }

  // ─────────────── Round flow ───────────────
  async function chooseWord(word: PictionaryWord) {
    if (!iAmDrawer || state.phase !== 'word-select') return;
    const updated: PicState = {
      ...state,
      phase: 'drawing',
      currentWord: word,
      wordChoices: null,
      guesses: [],
      roundStartedAt: Date.now(),
    };
    await updateState(updated);
  }

  async function submitGuess() {
    const text = guess.trim();
    if (!text || iAmDrawer || state.phase !== 'drawing' || !state.currentWord) return;
    setGuess('');
    const correct = guessMatches(text, state.currentWord.word);
    const newGuess: PicGuess = {
      by: currentUserId,
      text,
      correct,
      at: Date.now(),
    };
    if (!correct) {
      // Just append the guess to the DB list so the drawer sees it.
      await updateState({ ...state, guesses: [...state.guesses, newGuess] });
      return;
    }
    // Correct! End the round.
    await finishRound({ guesserCorrect: true, lastGuess: newGuess });
  }

  async function timeOutRound() {
    if (state.phase !== 'drawing') return;
    await finishRound({ guesserCorrect: false });
  }

  async function finishRound(opts: { guesserCorrect: boolean; lastGuess?: PicGuess }) {
    const word = state.currentWord;
    if (!word) return;
    const pts = pointsFor(word.difficulty);
    const drawerPoints = opts.guesserCorrect ? pts.drawer : 0;
    const guesserPoints = opts.guesserCorrect ? pts.guesser : 0;
    const guesserId = state.drawerId === session.inviter_id
      ? session.invitee_id
      : session.inviter_id;

    const newScores = { ...state.scores };
    newScores[state.drawerId] = (newScores[state.drawerId] ?? 0) + drawerPoints;
    newScores[guesserId] = (newScores[guesserId] ?? 0) + guesserPoints;

    const result: RoundResult = {
      word: word.word,
      difficulty: word.difficulty,
      guesserCorrect: opts.guesserCorrect,
      drawerPoints,
      guesserPoints,
    };
    const updated: PicState = {
      ...state,
      phase: 'round-end',
      scores: newScores,
      guesses: opts.lastGuess ? [...state.guesses, opts.lastGuess] : state.guesses,
      lastRoundResult: result,
    };
    await updateState(updated);
  }

  async function nextRound() {
    if (state.phase !== 'round-end') return;
    const nextNum = state.roundNumber + 1;
    if (nextNum > state.totalRounds) {
      // Game over.
      await updateState({ ...state, phase: 'over' }, { setStatus: 'ended', reason: 'finished' });
      return;
    }
    // Swap drawer.
    const nextDrawer = state.drawerId === session.inviter_id
      ? session.invitee_id
      : session.inviter_id;
    const updated: PicState = {
      ...state,
      phase: 'word-select',
      roundNumber: nextNum,
      drawerId: nextDrawer,
      wordChoices: pickPictionaryChoices(nextNum),
      currentWord: null,
      guesses: [],
      roundStartedAt: null,
      lastRoundResult: null,
    };
    // Also tell both clients to wipe their canvas.
    channelRef.current?.send({
      type: 'broadcast',
      event: 'clear',
      payload: {},
    });
    await updateState(updated);
  }

  async function finishGame() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  // ─────────────── Timer effect: drawer triggers timeout ───────────────
  const msLeft = state.phase === 'drawing' && state.roundStartedAt
    ? Math.max(0, ROUND_DURATION_MS - (now - state.roundStartedAt))
    : 0;

  useEffect(() => {
    if (state.phase !== 'drawing') return;
    if (!iAmDrawer) return;
    if (msLeft > 0) return;
    void timeOutRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msLeft, state.phase, iAmDrawer]);

  // ─────────────── Render ───────────────
  const isGameOver = state.phase === 'over' || session.status === 'ended';
  return (
    <div style={{
      width: '100%', maxWidth: 380,
      display: 'flex', flexDirection: 'column', gap: 12,
      alignItems: 'center',
    }}>
      {/* Score row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, width: '100%',
      }}>
        <ScoreCard label={iAmDrawer ? 'You (drawing)' : 'You (guessing)'} value={myScore} highlight={iAmDrawer ? state.phase === 'drawing' : state.phase === 'drawing'} />
        <ScoreCard label="Them" value={partnerScore} highlight={false} />
      </div>

      {/* Phase pill */}
      {!isGameOver && (
        <div style={{
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.85)',
          borderRadius: 100,
          fontSize: 12, fontWeight: 800,
          letterSpacing: '0.4px',
        }}>
          Round {state.roundNumber} of {state.totalRounds}
          {state.phase === 'drawing' && (
            <span style={{ marginLeft: 8, color: msLeft < 15_000 ? '#fca5a5' : '#ffd5a8' }}>
              · {Math.ceil(msLeft / 1000)}s
            </span>
          )}
        </div>
      )}

      {/* Word-select phase */}
      {state.phase === 'word-select' && (
        iAmDrawer ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center' }}>
              Pick a word to draw:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {(state.wordChoices ?? []).map((w) => (
                <button
                  key={w.word}
                  type="button"
                  onClick={() => chooseWord(w)}
                  style={{
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, #c8956c, #ffb37c)',
                    border: 'none',
                    borderRadius: 14,
                    color: 'white',
                    fontSize: 16, fontWeight: 900,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span style={{ textTransform: 'capitalize' }}>{w.word}</span>
                  <span style={difficultyPill(w.difficulty)}>{w.difficulty}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            padding: 18,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 14, textAlign: 'center', width: '100%',
          }}>
            Waiting for your opponent to pick a word…
          </div>
        )
      )}

      {/* Drawing phase */}
      {state.phase === 'drawing' && (
        <>
          {/* Word display (drawer only) */}
          {iAmDrawer && state.currentWord && (
            <div style={{
              padding: '8px 14px',
              background: 'rgba(255,213,168,0.15)',
              border: '1px solid rgba(255,213,168,0.4)',
              borderRadius: 100,
              color: '#ffd5a8',
              fontSize: 14, fontWeight: 800,
              letterSpacing: '0.5px',
            }}>
              Draw: <span style={{ textTransform: 'capitalize' }}>{state.currentWord.word}</span>
            </div>
          )}

          {/* Canvas */}
          <div style={{
            background: '#fffaf2',
            borderRadius: 12,
            border: '2px solid rgba(255,213,168,0.4)',
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            touchAction: 'none',
            width: '100%',
            maxWidth: 320,
            aspectRatio: '1 / 1',
          }}>
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                cursor: iAmDrawer ? 'crosshair' : 'default',
                touchAction: 'none',
              }}
              aria-label={iAmDrawer ? 'Drawing canvas' : 'Watching partner draw'}
            />
          </div>

          {/* Drawer-only toolbar */}
          {iAmDrawer && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={clearDrawing} style={secondaryBtn}>
                Clear canvas
              </button>
            </div>
          )}

          {/* Guesser-only input */}
          {!iAmDrawer && (
            <form
              onSubmit={(e) => { e.preventDefault(); void submitGuess(); }}
              style={{ display: 'flex', gap: 8, width: '100%' }}
            >
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value.slice(0, 60))}
                placeholder="Type your guess…"
                autoFocus
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,213,168,0.35)',
                  borderRadius: 100,
                  color: 'white',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!guess.trim()}
                style={!guess.trim() ? disabledBtn : primaryBtn}
              >
                Guess
              </button>
            </form>
          )}

          {/* Recent guesses log */}
          {state.guesses.length > 0 && (
            <div style={{
              width: '100%',
              maxHeight: 90,
              overflowY: 'auto',
              padding: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              fontSize: 12,
            }}>
              {state.guesses.slice(-6).map((g, i) => (
                <div key={i} style={{
                  color: g.correct ? '#86efac' : 'rgba(255,255,255,0.7)',
                  fontWeight: g.correct ? 800 : 500,
                  display: 'flex', justifyContent: 'space-between',
                  padding: '2px 0',
                }}>
                  <span>{g.by === currentUserId ? 'You' : 'Them'}: {g.text}</span>
                  {g.correct && <span>✓</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Round-end phase */}
      {state.phase === 'round-end' && state.lastRoundResult && (
        <div style={{
          padding: 16,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16,
          width: '100%',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
        }}>
          <div style={{ fontSize: 24 }}>
            {state.lastRoundResult.guesserCorrect ? '🎯' : '⏱️'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>
            {state.lastRoundResult.guesserCorrect ? 'Guessed it!' : "Time's up."}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            The word was <strong style={{ color: '#ffd5a8', textTransform: 'capitalize' }}>{state.lastRoundResult.word}</strong>.
          </div>
          {state.lastRoundResult.guesserCorrect && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              +{state.lastRoundResult.guesserPoints} guesser · +{state.lastRoundResult.drawerPoints} drawer
            </div>
          )}
          <button type="button" onClick={nextRound} style={primaryBtn}>
            {state.roundNumber >= state.totalRounds ? 'See final score →' : 'Next round →'}
          </button>
        </div>
      )}

      {/* Game-over phase */}
      {state.phase === 'over' && (() => {
        const youWon = myScore > partnerScore;
        const tied = myScore === partnerScore;
        return (
          <div style={{
            padding: 18,
            background: 'rgba(255,213,168,0.15)',
            border: '1px solid rgba(255,213,168,0.4)',
            borderRadius: 16,
            width: '100%', textAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
          }}>
            <div style={{ fontSize: 26 }}>{tied ? '🤝' : youWon ? '🏆' : '🎨'}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>
              {tied ? "It's a tie!" : youWon ? 'You win!' : 'Their win.'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              Final: you {myScore} – them {partnerScore}
            </div>
            <button type="button" onClick={finishGame} style={primaryBtn}>See summary →</button>
          </div>
        );
      })()}
    </div>
  );
}

function ScoreCard({ label, value, highlight }: { label: string; value: number; highlight: boolean }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: highlight ? 'linear-gradient(135deg, #c8956c, #ffb37c)' : 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800,
        color: highlight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', letterSpacing: '1.2px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 900, color: 'white',
        marginTop: 2, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  );
}

function difficultyPill(difficulty: 'easy' | 'medium' | 'hard'): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 900,
    padding: '3px 8px',
    borderRadius: 100,
    background: 'rgba(255,255,255,0.25)',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  };
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 22px',
  background: '#c8956c',
  color: 'white',
  border: 'none', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
};
const secondaryBtn: React.CSSProperties = {
  padding: '8px 18px',
  background: 'transparent',
  color: '#ffd5a8',
  border: '1px solid rgba(255,213,168,0.5)', borderRadius: 100,
  fontSize: 12, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
};
const disabledBtn: React.CSSProperties = {
  padding: '11px 22px',
  background: 'transparent',
  color: 'rgba(255,255,255,0.3)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'default', fontFamily: 'inherit',
};
