const { Chess } = require('chess.js');
const tests = [
  { name: 'starting position', fen: undefined, expect: { turn: 'w', over: false, check: false } },
  { name: 'fools mate',        moves: ['f3','e5','g4','Qh4'], expect: { over: true, mate: true } },
  { name: 'stalemate detect',  fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', expect: { over: true, stalemate: true } },
  { name: 'check detect',      fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', expect: { check: true } },
  { name: 'invalid FEN swallowed', fen: 'totally-junk-fen', expect: 'throws' },
];
let pass = 0;
for (const t of tests) {
  try {
    const c = t.fen ? new Chess(t.fen) : new Chess();
    if (t.expect === 'throws') {
      console.log(`  ✗ ${t.name}: did NOT throw on bad FEN (chess.js was forgiving)`);
      continue;
    }
    if (t.moves) for (const m of t.moves) c.move(m);
    const r = { turn: c.turn(), over: c.isGameOver(), check: c.inCheck(),
                mate: c.isCheckmate(), stalemate: c.isStalemate() };
    const ok = Object.keys(t.expect).every(k => r[k] === t.expect[k]);
    console.log(`  ${ok ? '✓' : '✗'} ${t.name}: ${JSON.stringify(r)}`);
    if (ok) pass++;
  } catch (e) {
    if (t.expect === 'throws') {
      console.log(`  ✓ ${t.name}: throws as expected (${e.message.slice(0, 40)}...)`);
      pass++;
    } else {
      console.log(`  ✗ ${t.name} unexpected throw: ${e.message}`);
    }
  }
}
console.log(`  ${pass}/${tests.length} chess.js tests`);
