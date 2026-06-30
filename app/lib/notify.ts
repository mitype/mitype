// Shared notification-send helper.
//
// Every place in the codebase that fires a notification at another
// user routes through this function. That gives us a single chokepoint
// to apply rate limiting (so a malicious user can't spam a target with
// thousands of fake notifications) and a single place to add future
// features like recipient mute lists, batching, etc.

import { supabase } from './supabaseClient';
import { checkRateLimit, LIMITS } from './rateLimit';

export interface NotifyOptions {
  /** The user being notified. */
  user_id: string;
  /** Internal type identifier, e.g. 'current_echo', 'home_goods_save'. */
  type: string;
  /** Short title (shown in the bell + push). */
  title: string;
  /** Optional longer body. */
  body?: string | null;
  /** Optional URL to deep-link to from the bell row. */
  action_url?: string | null;
}

/** Sends a notification on behalf of the current authed user.
 *  Silently rate-limited at 120/hour per sender. Returns true if the
 *  notification was sent, false if blocked. Never throws — failures
 *  are non-fatal and logged. */
export async function sendNotification(opts: NotifyOptions): Promise<boolean> {
  try {
    const ok = await checkRateLimit(LIMITS.NOTIFY_SEND);
    if (!ok) {
      // Sender has burned through their hourly notification budget.
      // Silently drop; never tell the user "you spammed too much" via
      // toast — that just teaches abusers how the cap works.
      return false;
    }
    const { error } = await supabase.from('notifications').insert({
      user_id:     opts.user_id,
      type:        opts.type,
      title:       opts.title,
      body:        opts.body ?? null,
      action_url:  opts.action_url ?? null,
    });
    if (error) {
      console.warn('[notify] insert failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notify] threw:', e);
    return false;
  }
}
