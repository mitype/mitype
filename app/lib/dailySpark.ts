// Daily Spark
// ----------
// Once a day, the dashboard shows ONE hand-picked profile with a tailored
// conversation starter. The pick is recorded in the `daily_sparks` table so
// refreshing the dashboard doesn't reroll the choice and we don't repeat the
// same person back-to-back.
//
// Public API:
//   - getOrPickTodaysSpark(userId): returns { profile, opener } or null
//   - dismissSpark(sparkId): marks today's spark dismissed (just records the time)
//
// All DB calls go through the shared anon supabase client. RLS on
// `daily_sparks` restricts each user to their own rows.

import { supabase } from './supabaseClient';
import { normalizePrompts, type ProfilePrompt } from './profilePrompts';

// How far back to look when avoiding spark repeats. 14 days = a fortnight of
// "no repeat" before someone can come around again.
const REPEAT_WINDOW_DAYS = 14;

// Max profiles we examine when picking. Big enough to give variety without
// shipping the entire user base to the client.
const CANDIDATE_POOL_SIZE = 80;

export interface SparkProfile {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  categories: string[] | null;
  portfolio_links: unknown;
  profile_prompts: unknown;
}

export interface DailySpark {
  id: string;
  spark_user_id: string;
  spark_date: string; // ISO date (YYYY-MM-DD)
  opener: string | null;
  dismissed_at: string | null;
  profile: SparkProfile;
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

/**
 * Returns today's spark for the given user, picking and persisting one if
 * none exists yet. Returns null when there are no eligible candidates (e.g.
 * brand-new instance with no other profiles).
 */
export async function getOrPickTodaysSpark(
  userId: string
): Promise<DailySpark | null> {
  const today = todayUtcDateString();

  // 1. Already-picked today? Return it.
  const existing = await loadSparkForDate(userId, today);
  if (existing) return existing;

  // 2. Otherwise, pick a fresh candidate.
  const candidate = await pickCandidate(userId);
  if (!candidate) return null;

  const opener = generateOpener(candidate);

  // 3. Persist the pick. unique(user_id, spark_date) means a race only ever
  //    creates one row — if two parallel inserts race, the second errors and
  //    we re-read.
  const { data: inserted, error: insertErr } = await supabase
    .from('daily_sparks')
    .insert({
      user_id: userId,
      spark_user_id: candidate.user_id,
      spark_date: today,
      opener,
    })
    .select('*')
    .single();

  if (insertErr) {
    // Race / constraint violation — re-read whatever the winning insert wrote.
    const fallback = await loadSparkForDate(userId, today);
    return fallback;
  }

  if (!inserted) return null;

  return {
    id: inserted.id,
    spark_user_id: inserted.spark_user_id,
    spark_date: inserted.spark_date,
    opener: inserted.opener,
    dismissed_at: inserted.dismissed_at,
    profile: candidate,
  };
}

/**
 * Marks a spark as dismissed (user clicked "skip"). The row is left in place
 * so we still avoid showing this person again within the repeat window.
 * Tomorrow they get a fresh pick.
 */
export async function dismissSpark(sparkId: string): Promise<void> {
  await supabase
    .from('daily_sparks')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', sparkId);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function loadSparkForDate(
  userId: string,
  date: string
): Promise<DailySpark | null> {
  const { data: row } = await supabase
    .from('daily_sparks')
    .select('*')
    .eq('user_id', userId)
    .eq('spark_date', date)
    .maybeSingle();

  if (!row) return null;

  // Hydrate the profile attached to the spark.
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'user_id, username, avatar_url, bio, categories, portfolio_links, profile_prompts'
    )
    .eq('user_id', row.spark_user_id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: row.id,
    spark_user_id: row.spark_user_id,
    spark_date: row.spark_date,
    opener: row.opener,
    dismissed_at: row.dismissed_at,
    profile: profile as SparkProfile,
  };
}

async function pickCandidate(userId: string): Promise<SparkProfile | null> {
  // Build the exclusion list: people we've recently sparked + people we've
  // already swiped on.
  const [recentSparks, swipes] = await Promise.all([
    supabase
      .from('daily_sparks')
      .select('spark_user_id, spark_date')
      .eq('user_id', userId)
      .gte('spark_date', daysAgoDateString(REPEAT_WINDOW_DAYS)),
    supabase
      .from('matches')
      .select('target_user_id')
      .eq('user_id', userId),
  ]);

  const exclude = new Set<string>([userId]);
  recentSparks.data?.forEach((r: any) => {
    if (r.spark_user_id) exclude.add(r.spark_user_id);
  });
  swipes.data?.forEach((s: any) => {
    if (s.target_user_id) exclude.add(s.target_user_id);
  });

  // Pull a candidate pool. Order by created_at desc so newer accounts get a
  // chance to surface. We over-fetch and filter client-side rather than
  // building a huge `not in (…)` clause.
  const { data: pool } = await supabase
    .from('profiles')
    .select(
      'user_id, username, avatar_url, bio, categories, portfolio_links, profile_prompts'
    )
    .order('created_at', { ascending: false })
    .limit(CANDIDATE_POOL_SIZE);

  if (!pool || pool.length === 0) return null;

  const eligible = (pool as SparkProfile[]).filter((p) => {
    if (!p.user_id || exclude.has(p.user_id)) return false;
    if (!p.username) return false;
    // Need at least one piece of content to build an opener from.
    return hasOpenerSource(p);
  });

  if (eligible.length === 0) return null;

  // Score: prefer profiles with more "openable" content (prompts > portfolio
  // > bio) so the opener feels specific. Tiny random jitter breaks ties.
  const scored = eligible
    .map((p) => ({ p, score: scoreProfile(p) + Math.random() * 0.5 }))
    .sort((a, b) => b.score - a.score);

  return scored[0].p;
}

function hasOpenerSource(p: SparkProfile): boolean {
  const prompts = normalizePrompts(p.profile_prompts);
  if (prompts.length > 0) return true;
  if (Array.isArray(p.portfolio_links) && p.portfolio_links.length > 0) {
    return true;
  }
  if (p.bio && p.bio.trim().length > 12) return true;
  return false;
}

function scoreProfile(p: SparkProfile): number {
  let s = 0;
  const prompts = normalizePrompts(p.profile_prompts);
  s += prompts.length * 3;
  if (Array.isArray(p.portfolio_links)) s += Math.min(p.portfolio_links.length, 3);
  if (p.bio && p.bio.trim().length > 30) s += 1;
  if (p.avatar_url) s += 1;
  return s;
}

// ---------------------------------------------------------------------------
// Opener generation
// ---------------------------------------------------------------------------

/**
 * Build a tailored conversation starter for the given profile. We pick the
 * highest-signal source we can find (prompts → portfolio → bio → fallback).
 */
export function generateOpener(p: SparkProfile): string {
  const prompts = normalizePrompts(p.profile_prompts);

  // Prompt-based opener — the highest signal. Reference the question they
  // chose to answer.
  if (prompts.length > 0) {
    const pick = prompts[Math.floor(Math.random() * prompts.length)];
    return openerFromPrompt(pick);
  }

  // Portfolio-based opener — reference the type of work they shared.
  if (Array.isArray(p.portfolio_links) && p.portfolio_links.length > 0) {
    const link = p.portfolio_links[0] as Record<string, unknown> | undefined;
    const linkType = typeof link?.type === 'string' ? link.type : null;
    return openerFromPortfolio(linkType);
  }

  // Bio-based opener — softest, but still personal.
  if (p.bio && p.bio.trim().length > 12) {
    return "Your bio caught my eye. What's the story behind it?";
  }

  // Last resort.
  return 'Hey — what are you working on lately?';
}

function openerFromPrompt(p: ProfilePrompt): string {
  const q = p.prompt.trim().replace(/[…\.\?]+$/, '');
  // Phrase a follow-up that references the prompt without quoting their full
  // answer back at them — leaves them room to expand naturally.
  const variants = [
    `Saw your "${q}" answer — had to ask: what's the backstory there?`,
    `Your "${q}" answer made me curious. Tell me more?`,
    `Loved your take on "${q}". What inspired that?`,
    `"${q}" — your answer was a vibe. How'd you arrive at that?`,
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

function openerFromPortfolio(linkType: string | null): string {
  const t = (linkType ?? '').toLowerCase();

  if (t.includes('music') || t.includes('soundcloud') || t.includes('spotify')) {
    return "Listening to one of your tracks now — what's the story behind your sound?";
  }
  if (t.includes('photo') || t.includes('instagram')) {
    return 'Your photography has a real point of view. What were you chasing when you shot it?';
  }
  if (t.includes('writing') || t.includes('blog') || t.includes('substack')) {
    return "Your writing pulled me in — what's a piece you're particularly proud of?";
  }
  if (t.includes('film') || t.includes('video') || t.includes('youtube') || t.includes('vimeo')) {
    return "I dug into your reel — what's the project you'd most like to make next?";
  }
  if (t.includes('design') || t.includes('dribbble') || t.includes('behance')) {
    return 'Your design work has range. What kind of brief gets you most excited?';
  }
  if (t.includes('art') || t.includes('illustration')) {
    return 'Your work has a really distinct hand. How would you describe your style to someone who hasn\'t seen it?';
  }
  if (t.includes('code') || t.includes('github')) {
    return "Peeked at your projects — what are you building right now?";
  }

  return 'Just looked through your portfolio — which piece are you proudest of right now?';
}

// ---------------------------------------------------------------------------
// Date helpers (UTC, to match the spark_date default in the SQL)
// ---------------------------------------------------------------------------

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoDateString(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
