'use client';
// Battleship — hidden-information naval combat.
//
// We deliberately keep the experience friendly for a messaging context:
//   - 10×10 standard grid, 5-ship classic fleet (5/4/3/3/2 = 17 cells).
//   - Placement is one-tap randomize. We avoid drag-and-drop manual
//     placement to keep mobile interactions snappy. A "Re-roll" button
//     lets you reshuffle until you like the layout, then "Lock in" to
//     confirm. Manual placement is something we can add later.
//   - Once both players lock in, play begins. The inviter shoots first.
//   - On a hit, the shooter sees a hit marker and the defender's
//     "Your fleet" grid lights up the damaged cell. On a miss, both
//     see a miss marker. Sunk ships are announced.
//   - Win when all 17 cells of the opponent's fleet are hit.
//
// Hidden-information honesty: we keep both fleets in the shared session
// state (which means a determined player could DevTools to peek at the
// opponent's layout). This is a friendly chat game between two real
// people — calling that out in the how-to-play steps is enough for now.
// A future hardening pass could move fleet placement to a server-side
// validator.
//
// State shape:
//   {
//     phase: 'placing' | 'playing' | 'over',
//     fleets: {
//       [user_id]: {
//         ships: Array<Ship>,
//         locked: boolean,         // user confirmed their layout
//       }
//     },
//     shots: { [user_id]: number[] },  // cells THIS user has fired at
//     currentTurn: string,             // user_id
//     winnerId: string | null,
//     lastShot: { by: string; cell: number; hit: boolean; sunk: string | null } | null,
//   }

import { useEffect, useMemo, useState } from 'react';
import type { GameSession } from '../GameContainer';

const SIZE = 10;
const FLEET_SPEC = [
  { name: 'Carrier',    size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser',    size: 3 },
  { name: 'Submarine',  size: 3 },
  { name: 'Destroyer',  size: 2 },
] as const;
const TOTAL_FLEET_CELLS = FLEET_SPEC.reduce((acc, s) => acc + s.size, 0);

interface Ship {
  name: string;
  size: number;
  cells: number[];
  sunk: boolean;
}

interface FleetState {
  ships: Ship[];
  locked: boolean;
}

interface BsState {
  phase: 'placing' | 'playing' | 'over';
  fleets: Record<string, FleetState>;
  shots: Record<string, number[]>;
  currentTurn: string;
  winnerId: string | null;
  lastShot: { by: string; cell: number; hit: boolean; sunk: string | null } | null;
}

interface Props {
  session: GameSession;
  currentUserId: string;
  updateState: (
    next: any,
    opts?: { setStatus?: 'active' | 'ended'; reason?: string }
  ) => Promise<void>;
}

function idxFor(row: number, col: number): number { return row * SIZE + col; }
function rowOf(i: number): number { return Math.floor(i / SIZE); }
function colOf(i: number): number { return i % SIZE; }

// Randomly place a full fleet. Returns ships array (no overlaps, all
// within bounds, mix of horizontal and vertical). Deterministic-ish
// with seeded RNG so re-rolls feel unique.
function randomFleet(): Ship[] {
  const ships: Ship[] = [];
  const occupied = new Set<number>();
  for (const spec of FLEET_SPEC) {
    let placed = false;
    for (let attempts = 0; attempts < 800 && !placed; attempts++) {
      const horiz = Math.random() < 0.5;
      const row = Math.floor(Math.random() * (horiz ? SIZE : SIZE - spec.size + 1));
      const col = Math.floor(Math.random() * (horiz ? SIZE - spec.size + 1 : SIZE));
      const cells: number[] = [];
      for (let k = 0; k < spec.size; k++) {
        const c = horiz ? idxFor(row, col + k) : idxFor(row + k, col);
        cells.push(c);
      }
      if (cells.some((c) => occupied.has(c))) continue;
      for (const c of cells) occupied.add(c);
      ships.push({ name: spec.name, size: spec.size, cells, sunk: false });
      placed = true;
    }
    if (!placed) {
      // Pathologically bad luck — reset and retry the whole layout.
      return randomFleet();
    }
  }
  return ships;
}

function emptyState(inviterId: string): BsState {
  return {
    phase: 'placing',
    fleets: {},
    shots: {},
    currentTurn: inviterId,
    winnerId: null,
    lastShot: null,
  };
}

function shipAt(ships: Ship[], cell: number): Ship | null {
  return ships.find((s) => s.cells.includes(cell)) ?? null;
}

export function Battleship({ session, currentUserId, updateState }: Props) {
  // Inviter seeds initial state.
  useEffect(() => {
    if (
      session.status === 'pending' &&
      currentUserId === session.inviter_id &&
      (!session.state || !session.state.phase)
    ) {
      void updateState(emptyState(session.inviter_id), { setStatus: 'active' });
    } else if (
      session.status === 'active' &&
      (!session.state || !session.state.phase) &&
      currentUserId === session.inviter_id
    ) {
      void updateState(emptyState(session.inviter_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.state, currentUserId, session.inviter_id]);

  // Local draft: ships the current user has rolled but not yet locked in.
  // We keep them off the wire until "Lock in" so the partner doesn't
  // accidentally see the layout in transit.
  const [draftShips, setDraftShips] = useState<Ship[] | null>(null);

  const rawState = (session.state ?? null) as BsState | null;
  if (!rawState || !rawState.phase) {
    return (
      <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  const state: BsState = rawState;

  const inviterId = session.inviter_id;
  const inviteeId = session.invitee_id;
  const partnerId = currentUserId === inviterId ? inviteeId : inviterId;

  const myFleet = state.fleets[currentUserId];
  const partnerFleet = state.fleets[partnerId];
  const myShots = state.shots[currentUserId] ?? [];
  const partnerShots = state.shots[partnerId] ?? [];
  const myFleetCells = myFleet?.ships.flatMap((s) => s.cells) ?? [];
  const partnerFleetCells = partnerFleet?.ships.flatMap((s) => s.cells) ?? [];
  const myHits = myShots.filter((c) => partnerFleetCells.includes(c)).length;
  const partnerHits = partnerShots.filter((c) => myFleetCells.includes(c)).length;
  const isMyTurn = state.currentTurn === currentUserId && state.phase === 'playing';

  // ─────────────── Placement actions ───────────────
  function rollFleet() {
    setDraftShips(randomFleet());
  }

  async function lockInFleet() {
    if (!draftShips) return;
    const updated: BsState = JSON.parse(JSON.stringify(state));
    updated.fleets[currentUserId] = { ships: draftShips, locked: true };
    if (!updated.shots[currentUserId]) updated.shots[currentUserId] = [];

    // If both players have now locked in, flip to playing phase.
    const bothLocked =
      !!updated.fleets[inviterId]?.locked &&
      !!updated.fleets[inviteeId]?.locked;
    if (bothLocked) {
      updated.phase = 'playing';
      updated.currentTurn = inviterId;
    }
    await updateState(updated);
    setDraftShips(null);
  }

  // ─────────────── Combat actions ───────────────
  async function fire(cell: number) {
    if (!isMyTurn) return;
    if (myShots.includes(cell)) return;
    if (!partnerFleet) return;
    const updated: BsState = JSON.parse(JSON.stringify(state));
    updated.shots[currentUserId] = [...(updated.shots[currentUserId] ?? []), cell];

    const partnerShipsAfter = updated.fleets[partnerId].ships;
    const struck = shipAt(partnerShipsAfter, cell);
    let sunkName: string | null = null;
    let didHit = false;
    if (struck) {
      didHit = true;
      const allShotsAtPartner = updated.shots[currentUserId];
      const stillIntact = struck.cells.some((c) => !allShotsAtPartner.includes(c));
      if (!stillIntact) {
        struck.sunk = true;
        sunkName = struck.name;
      }
    }
    updated.lastShot = { by: currentUserId, cell, hit: didHit, sunk: sunkName };

    // Win check: have we hit every cell of partner's fleet?
    const partnerCells = partnerShipsAfter.flatMap((s) => s.cells);
    const allDown = partnerCells.every((c) => updated.shots[currentUserId].includes(c));
    if (allDown) {
      updated.phase = 'over';
      updated.winnerId = currentUserId;
      await updateState(updated, { setStatus: 'ended', reason: 'finished' });
      return;
    }

    // Pass turn on misses; on hits, you get another shot (classic
    // "hit-again" rule, optional in real Battleship — we use it because
    // it makes the game feel more dynamic and shorter on average).
    if (!didHit) {
      updated.currentTurn = partnerId;
    }
    await updateState(updated);
  }

  async function finishGame() {
    await updateState(state, { setStatus: 'ended', reason: 'finished' });
  }

  // ─────────────── Render switches ───────────────
  if (state.phase === 'placing') {
    return (
      <PlacementPanel
        myFleet={myFleet ?? null}
        partnerLocked={!!partnerFleet?.locked}
        draftShips={draftShips}
        onRoll={rollFleet}
        onLock={lockInFleet}
      />
    );
  }

  if (state.phase === 'over' || state.winnerId) {
    const youWon = state.winnerId === currentUserId;
    return (
      <div style={{
        width: '100%', maxWidth: 400,
        display: 'flex', flexDirection: 'column', gap: 18,
        alignItems: 'center',
      }}>
        <div style={{
          padding: 18,
          background: 'rgba(255,213,168,0.15)',
          border: '1px solid rgba(255,213,168,0.4)',
          borderRadius: 16,
          textAlign: 'center',
          width: '100%',
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{youWon ? '🏆' : '🚢'}</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>
            {youWon ? 'Fleet down. You win!' : 'They sunk your fleet.'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
            Hits: you {myHits} / 17 · them {partnerHits} / 17
          </div>
        </div>
        <button type="button" onClick={finishGame} style={primaryBtn}>
          See summary →
        </button>
      </div>
    );
  }

  // Playing phase — render shot grid + your fleet grid.
  return (
    <div style={{
      width: '100%', maxWidth: 400,
      display: 'flex', flexDirection: 'column', gap: 14,
      alignItems: 'center',
    }}>
      {/* Status row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, width: '100%',
      }}>
        <ScoreCard label="Your hits" value={`${myHits} / 17`} highlight={isMyTurn} />
        <ScoreCard label="Their hits" value={`${partnerHits} / 17`} highlight={!isMyTurn} />
      </div>

      {/* Turn pill */}
      <div style={{
        padding: '8px 16px',
        background: isMyTurn ? 'linear-gradient(135deg, #c8956c, #ffb37c)' : 'rgba(255,255,255,0.08)',
        color: isMyTurn ? 'white' : 'rgba(255,255,255,0.7)',
        borderRadius: 100,
        fontSize: 13, fontWeight: 800,
        boxShadow: isMyTurn ? '0 6px 18px rgba(200,149,108,0.4)' : 'none',
      }}>
        {isMyTurn ? 'Your shot' : 'Their shot'}
      </div>

      {/* Last shot feedback */}
      {state.lastShot && (
        <div style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.5px',
          color: state.lastShot.hit
            ? state.lastShot.sunk ? '#fcd34d' : '#fca5a5'
            : 'rgba(255,255,255,0.55)',
        }}>
          {state.lastShot.by === currentUserId
            ? state.lastShot.sunk
              ? `You sunk their ${state.lastShot.sunk}!`
              : state.lastShot.hit ? 'Direct hit!' : 'Splash. Miss.'
            : state.lastShot.sunk
              ? `They sunk your ${state.lastShot.sunk}.`
              : state.lastShot.hit ? 'They hit you.' : 'They missed.'}
        </div>
      )}

      {/* Their waters — where you fire */}
      <GridSection title="Their waters">
        <GameGrid
          mode="attack"
          fleetCells={partnerFleetCells}
          myShots={myShots}
          partnerShots={[]}
          onCellTap={fire}
          isMyTurn={isMyTurn}
        />
      </GridSection>

      {/* Your fleet */}
      <GridSection title="Your fleet">
        <GameGrid
          mode="defense"
          fleetCells={myFleetCells}
          myShots={[]}
          partnerShots={partnerShots}
          onCellTap={() => {}}
          isMyTurn={false}
          myShips={myFleet?.ships ?? []}
        />
      </GridSection>
    </div>
  );
}

// ─────────────── Placement ───────────────
function PlacementPanel({ myFleet, partnerLocked, draftShips, onRoll, onLock }: {
  myFleet: FleetState | null;
  partnerLocked: boolean;
  draftShips: Ship[] | null;
  onRoll: () => void;
  onLock: () => void;
}) {
  const myLocked = !!myFleet?.locked;
  const shown = myLocked ? myFleet!.ships : draftShips;
  const fleetCells = shown ? shown.flatMap((s) => s.cells) : [];

  return (
    <div style={{
      width: '100%', maxWidth: 400,
      display: 'flex', flexDirection: 'column', gap: 14,
      alignItems: 'center',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 800,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: '1.4px', textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        Place your fleet
      </div>

      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.75)',
        textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        margin: 0,
      }}>
        {myLocked
          ? partnerLocked
            ? 'Both fleets locked in. Starting now…'
            : 'Locked in. Waiting for your opponent to lock theirs.'
          : draftShips
            ? 'Like the layout? Lock it in. Or re-roll for a new one.'
            : 'Tap below. We\'ll randomize a five-ship fleet for you.'}
      </p>

      <GridSection title={myLocked ? 'Your fleet (locked)' : 'Draft fleet'}>
        <GameGrid
          mode="defense"
          fleetCells={fleetCells}
          myShots={[]}
          partnerShots={[]}
          onCellTap={() => {}}
          isMyTurn={false}
          myShips={shown ?? []}
        />
      </GridSection>

      {!myLocked && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onRoll} style={secondaryBtn}>
            {draftShips ? 'Re-roll' : 'Roll fleet'}
          </button>
          {draftShips && (
            <button type="button" onClick={onLock} style={primaryBtn}>
              Lock in
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────── Grid ───────────────
function GridSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        fontSize: 11, fontWeight: 800,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '1.2px', textTransform: 'uppercase',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function GameGrid({
  mode,
  fleetCells,
  myShots,
  partnerShots,
  onCellTap,
  isMyTurn,
  myShips,
}: {
  mode: 'attack' | 'defense';
  fleetCells: number[];
  myShots: number[];
  partnerShots: number[];
  onCellTap: (cell: number) => void;
  isMyTurn: boolean;
  myShips?: Ship[];
}) {
  const shipCellLookup = useMemo(() => {
    const map = new Map<number, Ship>();
    if (myShips) {
      for (const s of myShips) {
        for (const c of s.cells) map.set(c, s);
      }
    }
    return map;
  }, [myShips]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
        gap: 2,
        width: '100%',
        aspectRatio: '1 / 1',
        background: 'rgba(0,30,60,0.55)',
        padding: 4,
        borderRadius: 10,
        border: '1px solid rgba(120,180,255,0.25)',
      }}
    >
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        // Attack mode = "their waters"
        //   - cells I've shot at show hit/miss
        //   - cells I haven't shot at are dark water
        // Defense mode = "my fleet"
        //   - cells where my ships sit show the ship segment
        //   - cells the opponent has hit show damage
        //   - other cells are open water
        const wasShotByMe = myShots.includes(i);
        const wasShotByThem = partnerShots.includes(i);
        const isMyShip = fleetCells.includes(i);

        let bg = 'rgba(15,40,80,0.65)'; // water
        let content: React.ReactNode = null;

        if (mode === 'attack') {
          if (wasShotByMe) {
            if (isMyShip) {
              bg = '#dc2626';
              content = <Dot color="white" />;
            } else {
              bg = 'rgba(120,180,255,0.18)';
              content = <Dot color="rgba(255,255,255,0.6)" small />;
            }
          }
        } else {
          // defense
          if (isMyShip) {
            const ship = shipCellLookup.get(i);
            bg = ship?.sunk ? '#7f1d1d' : '#475569';
          }
          if (wasShotByThem) {
            if (isMyShip) {
              bg = '#dc2626';
              content = <Dot color="white" />;
            } else {
              bg = 'rgba(120,180,255,0.18)';
              content = <Dot color="rgba(255,255,255,0.6)" small />;
            }
          }
        }

        const interactive = mode === 'attack' && isMyTurn && !wasShotByMe;
        return (
          <button
            key={i}
            type="button"
            onClick={() => interactive && onCellTap(i)}
            disabled={!interactive}
            aria-label={`Cell ${rowOf(i) + 1}-${colOf(i) + 1}`}
            style={{
              background: bg,
              border: 'none',
              borderRadius: 4,
              padding: 0,
              cursor: interactive ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
              touchAction: 'manipulation',
              transition: 'background 0.15s ease',
            }}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

function Dot({ color, small }: { color: string; small?: boolean }) {
  const size = small ? '28%' : '50%';
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      boxShadow: small ? 'none' : `0 0 10px ${color}`,
    }} />
  );
}

function ScoreCard({ label, value, highlight }: { label: string; value: string; highlight: boolean }) {
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
        fontSize: 18, fontWeight: 900, color: 'white',
        marginTop: 2, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '11px 26px',
  background: '#c8956c',
  color: 'white',
  border: 'none', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
};

const secondaryBtn: React.CSSProperties = {
  padding: '11px 22px',
  background: 'transparent',
  color: '#ffd5a8',
  border: '1px solid rgba(255,213,168,0.5)', borderRadius: 100,
  fontSize: 14, fontWeight: 800,
  cursor: 'pointer', fontFamily: 'inherit',
};

// Silence unused warning — TOTAL_FLEET_CELLS is exported for clarity
// even though only string-literal "17" appears in JSX. Some bundlers
// warn on dead consts.
void TOTAL_FLEET_CELLS;
