// Client-side wrapper around the `check_rate_limit` Postgres RPC.
//
// Returns true if the action is allowed, false if the user has hit the
// cap for the given window. Wrap any user-initiated action that could
// be spammed (current posts, echoes, votes, DMs, listings, etc).
//
// Why we do this server-side via RPC instead of just JS counters:
//   - A malicious client can bypass JS. The RPC enforces the cap at
//     the database, so even direct-to-Supabase API calls are blocked.
//   - Caps survive across devices, browser tabs, page refreshes.
//   - One source of truth for all rate-limit policy.
//
// Failure modes:
//   - If the RPC errors (network glitch, Supabase down), we fail OPEN
//     (allow the action). This is the right tradeoff for user trust —
//     we never want a flaky network to look like a permission denial.
//     The DB INSERT itself will still fail if RLS denies it, so the
//     action is still gated.

import { supabase } from './supabaseClient';

export interface RateLimitSpec {
  /** Stable string key for this action class. Examples: 'current_post',
   *  'echo_toggle', 'message_send'. */
  action: string;
  /** Maximum events allowed within the window. */
  max: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

// Canonical rate-limit policy for every gated action on the site. Keep
// these in one place so the limits stay coherent.
export const LIMITS = {
  CURRENT_POST:    { action: 'current_post',    max: 30,  windowSeconds: 3600  }, // 30 / hour
  CURRENT_REPLY:   { action: 'current_reply',   max: 60,  windowSeconds: 3600  }, // 60 / hour
  ECHO:            { action: 'echo',            max: 200, windowSeconds: 3600  }, // 200 / hour
  POSITIVITY_VOTE: { action: 'positivity_vote', max: 50,  windowSeconds: 3600  }, // 50 / hour
  HOME_GOODS_POST: { action: 'home_goods_post', max: 10,  windowSeconds: 3600  }, // 10 / hour
  HOME_GOODS_SAVE: { action: 'home_goods_save', max: 80,  windowSeconds: 3600  }, // 80 / hour
  MESSAGE_SEND:    { action: 'message_send',    max: 80,  windowSeconds: 3600  }, // 80 / hour
  SAIL_CURRENT:    { action: 'sail_current',    max: 20,  windowSeconds: 3600  }, // 20 / hour
  NOTIFY_SEND:     { action: 'notify_send',     max: 120, windowSeconds: 3600  }, // 120 / hour
} as const satisfies Record<string, RateLimitSpec>;

/** Returns true if the action is allowed. Records the attempt against
 *  the user's quota. Returns true on any RPC error (fail-open). */
export async function checkRateLimit(spec: RateLimitSpec): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      action_key:     spec.action,
      max_count:      spec.max,
      window_seconds: spec.windowSeconds,
    });
    if (error) {
      // Fail-open on RPC errors. The DB-level RLS still gates the
      // actual write, so this is safe.
      console.warn('[rateLimit] RPC error, failing open:', error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.warn('[rateLimit] threw, failing open:', e);
    return true;
  }
}

/** Friendly toast message — deliberately vague about the underlying
 *  policy so users don't tune around it. Only shown when a user has
 *  actually hit the cap; normal usage never sees this. */
export function rateLimitMessage(_spec: RateLimitSpec): string {
  return "You're going a little fast. Take a breath and try again in a minute.";
}
