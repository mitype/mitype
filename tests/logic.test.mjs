// Safety-net tests for pure business logic. Run with: npm test
// Uses Node's built-in test runner, so no extra packages are needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calculateCompatibility, getSharedCategories } from '../app/lib/utils.ts';
import { scoreProfileForDiscover, rankCandidates } from '../app/lib/discoverRanking.ts';
import { sanitizeText, safeUrl } from '../app/lib/sanitize.ts';
import { isReservedUsername } from '../app/lib/reservedUsernames.ts';
import { scoreProfileCompleteness } from '../app/lib/profileCompleteness.ts';
import { hasActiveAccess } from '../app/lib/access.ts';

test('access: only active and trialing members have access', () => {
  assert.equal(hasActiveAccess('active'), true);
  assert.equal(hasActiveAccess('trialing'), true);
  for (const s of ['canceled', 'past_due', 'ended', 'pending', '', null, undefined]) {
    assert.equal(hasActiveAccess(s), false, String(s));
  }
});

test('compatibility: shared share of unique categories, as a percent', () => {
  assert.equal(calculateCompatibility(['a', 'b'], ['a', 'b']), 100);
  assert.equal(calculateCompatibility(['a', 'b'], ['b', 'c']), 33);
  assert.equal(calculateCompatibility([], ['a']), 0);
  assert.equal(calculateCompatibility(['a'], ['b']), 0);
  assert.deepEqual(getSharedCategories(['a', 'b', 'c'], ['c', 'a']), ['a', 'c']);
  assert.deepEqual(getSharedCategories([], ['a']), []);
});

const NOW = Date.parse('2026-01-15T12:00:00Z');
const viewer = { categories: ['music', 'film'], effectiveCity: 'Austin', effectiveState: 'TX' };
const ctx = (fresh = []) => ({ freshWaveCreators: new Set(fresh), now: NOW });

test('discover ranking: category overlap is worth 6 each, capped at 5 overlaps', () => {
  const one = scoreProfileForDiscover(viewer, { user_id: 'u1', categories: ['music'] }, ctx());
  const two = scoreProfileForDiscover(viewer, { user_id: 'u2', categories: ['music', 'film'] }, ctx());
  assert.equal(one, 6);
  assert.equal(two, 12);
  const many = { categories: ['1', '2', '3', '4', '5', '6', '7'], effectiveCity: '', effectiveState: '' };
  const big = scoreProfileForDiscover(many, { user_id: 'u3', categories: ['1', '2', '3', '4', '5', '6', '7'] }, ctx());
  assert.equal(big, 30);
});

test('discover ranking: fresh wave, city and state add points', () => {
  const base = { user_id: 'u1', categories: [] };
  assert.equal(scoreProfileForDiscover(viewer, base, ctx(['u1'])), 5);
  assert.equal(scoreProfileForDiscover(viewer, { ...base, city: ' austin ' }, ctx()), 5);
  assert.equal(scoreProfileForDiscover(viewer, { ...base, state: 'tx' }, ctx()), 3);
  assert.equal(scoreProfileForDiscover(viewer, { ...base, city: 'Austin', state: 'TX' }, ctx()), 8);
});

test('discover ranking: a visitor in travel mode matches the destination city', () => {
  const traveler = {
    user_id: 'u1', categories: [], city: 'Boston', state: 'MA',
    travel_city: 'Austin', travel_state: 'TX', travel_ends_at: '2026-02-01T00:00:00Z',
  };
  assert.equal(scoreProfileForDiscover(viewer, traveler, ctx()), 8);
  const expired = { ...traveler, travel_ends_at: '2026-01-01T00:00:00Z' };
  assert.equal(scoreProfileForDiscover(viewer, expired, ctx()), 0);
});

test('discover ranking: completeness and recency bonuses', () => {
  const complete = { user_id: 'u1', categories: ['x'], bio: 'hi', avatar_url: 'a.png' };
  assert.equal(scoreProfileForDiscover({ ...viewer, categories: [] }, complete, ctx()), 2);
  const today = { user_id: 'u1', categories: [], updated_at: new Date(NOW).toISOString() };
  assert.equal(scoreProfileForDiscover(viewer, today, ctx()), 5);
  const old = { user_id: 'u1', categories: [], updated_at: new Date(NOW - 40 * 864e5).toISOString() };
  assert.equal(scoreProfileForDiscover(viewer, old, ctx()), 0);
});

test('discover ranking: sorts high to low, ties are stable by user id', () => {
  const list = [
    { user_id: 'b', categories: [] },
    { user_id: 'a', categories: [] },
    { user_id: 'c', categories: ['music', 'film'] },
  ];
  const out = rankCandidates(list, viewer, ctx()).map((p) => p.user_id);
  assert.deepEqual(out, ['c', 'a', 'b']);
  assert.equal(list[0].user_id, 'b'); // input is not mutated
});

test('sanitize: strips tags and script protocols, keeps normal text', () => {
  assert.equal(sanitizeText(null), '');
  assert.equal(sanitizeText('<b>Hi</b> there'), 'Hi there');
  assert.ok(!sanitizeText('<script>alert(1)</script>ok').includes('<'));
  assert.ok(!/javascript:/i.test(sanitizeText('javascript:alert(1)')));
  assert.equal(sanitizeText('line1\nline2'), 'line1\nline2');
});

test('safeUrl: allows http(s) and relative paths, blocks dangerous schemes', () => {
  assert.equal(safeUrl('/profile/x'), '/profile/x');
  assert.equal(safeUrl('#top'), '#top');
  assert.equal(safeUrl('example.com'), 'https://example.com/');
  assert.equal(safeUrl('http://example.com/a'), 'http://example.com/a');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('data:text/html,x'), null);
  assert.equal(safeUrl(''), null);
  assert.equal(safeUrl(null), null);
});

test('reserved usernames: company and staff names are blocked', () => {
  for (const n of ['mitype', 'Admin', '@support', 'the_mitype_team', 'MITYPE123', 'ceo']) {
    assert.equal(isReservedUsername(n), true, n);
  }
  for (const n of ['painter', 'jazzfan', '']) {
    assert.equal(isReservedUsername(n), false, n);
  }
});

test('profile completeness: a photo is the only requirement', () => {
  assert.equal(scoreProfileCompleteness(null).percent, 0);
  assert.equal(scoreProfileCompleteness({ avatar_url: 'a.png' }).percent, 100);
  assert.equal(scoreProfileCompleteness({ photos: [{ url: 'b.png' }] }).percent, 100);
  assert.equal(scoreProfileCompleteness({ avatar_url: '  ' }).percent, 0);
});
