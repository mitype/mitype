// Discover ranking — single source of truth for how we sort creator
// profiles on the Discover feed.
//
// The score is a sum of weighted signals. Bigger = better placement.
// Tweak the weights here and the whole feed adapts; no changes
// elsewhere in the codebase needed.
//
// Signal weights (each is independent, applied additively):
//   +6 per category overlap with viewer (capped at 5 overlaps)
//   +5 the creator has a Wave video in the last 24 hours
//   +5 the creator's city matches the viewer's effective city
//   +3 the creator's state matches the viewer's effective state
//      (note: when city matches, state usually does too — they stack)
//   +2 profile is "complete enough" (bio + at least one category +
//      avatar). Filters out half-empty placeholders.
//   +N recency boost — newer-active creators score higher:
//      N = max(0, 5 − days_since_updated / 6). So a profile touched
//      today scores +5, one touched 30d ago scores 0.

import type { calculateCompatibility } from './utils';

export interface RankingViewer {
  categories: string[];
  effectiveCity: string;
  effectiveState: string;
}

export interface RankingCandidate {
  user_id: string;
  categories?: string[] | null;
  city?: string | null;
  state?: string | null;
  travel_city?: string | null;
  travel_state?: string | null;
  travel_ends_at?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
}

export interface RankingContext {
  /** user_ids of creators who have posted a Wave video in the last 24h. */
  freshWaveCreators: Set<string>;
  /** Wallclock now() — passed in so the same value drives travel-mode
   *  liveness and recency computation. */
  now: number;
}

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

function categoryOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let n = 0;
  for (const x of a) if (setB.has(x)) n++;
  return n;
}

function isCandidateTravelLive(c: RankingCandidate, now: number): boolean {
  if (!c.travel_ends_at) return false;
  const t = new Date(c.travel_ends_at).getTime();
  return !Number.isNaN(t) && t > now;
}

export function scoreProfileForDiscover(
  viewer: RankingViewer,
  candidate: RankingCandidate,
  ctx: RankingContext,
): number {
  let score = 0;

  // Category overlap — biggest single signal. Cap at 5 so a creator
  // who tagged 20 categories doesn't dominate.
  const overlap = Math.min(5, categoryOverlap(viewer.categories, candidate.categories ?? []));
  score += overlap * 6;

  // Fresh Wave activity — visible engagement, recent.
  if (ctx.freshWaveCreators.has(candidate.user_id)) score += 5;

  // Location proximity — city / state. If the candidate is in travel
  // mode, they ALSO match against their travel destination so a Mitype
  // creator visiting your city surfaces too.
  const vCity = norm(viewer.effectiveCity);
  const vState = norm(viewer.effectiveState);
  const cCity = norm(candidate.city);
  const cState = norm(candidate.state);
  const travelLive = isCandidateTravelLive(candidate, ctx.now);
  const cTravelCity = travelLive ? norm(candidate.travel_city) : '';
  const cTravelState = travelLive ? norm(candidate.travel_state) : '';

  if (vCity && (vCity === cCity || vCity === cTravelCity)) {
    score += 5;
  }
  if (vState && (vState === cState || vState === cTravelState)) {
    score += 3;
  }

  // Profile completeness — basic floor: bio + at least one category + avatar.
  const hasBio = !!(candidate.bio && candidate.bio.trim().length > 0);
  const hasAvatar = !!candidate.avatar_url;
  const hasCat = !!(candidate.categories && candidate.categories.length > 0);
  if (hasBio && hasAvatar && hasCat) score += 2;

  // Recency — was the profile touched in the last ~30 days?
  if (candidate.updated_at) {
    const ms = ctx.now - new Date(candidate.updated_at).getTime();
    if (ms >= 0) {
      const days = ms / (24 * 60 * 60 * 1000);
      const recencyBoost = Math.max(0, 5 - days / 6);
      score += recencyBoost;
    }
  }

  return score;
}

/** Sort an array of candidates DESCENDING by their Discover score.
 *  Ties broken by user_id to keep the order stable across renders. */
export function rankCandidates<T extends RankingCandidate>(
  candidates: T[],
  viewer: RankingViewer,
  ctx: RankingContext,
): T[] {
  return [...candidates].sort((a, b) => {
    const sb = scoreProfileForDiscover(viewer, b, ctx);
    const sa = scoreProfileForDiscover(viewer, a, ctx);
    if (sb !== sa) return sb - sa;
    return (a.user_id ?? '').localeCompare(b.user_id ?? '');
  });
}

// Suppress unused-type lint flag — the import surface lives in case
// downstream callers want the same calc helper.
void ({} as typeof calculateCompatibility);
