'use client';
// Mounted once in the root layout. Two responsibilities for a logged-in
// user:
//   1. Track their presence on the global 'online-users' Realtime channel
//      so other clients can see them as online.
//   2. Stamp profiles.last_active_at on mount and every 5 minutes while
//      the tab is visible, so we can show "Active 2h ago" when they're
//      offline.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { usePresence } from '../lib/usePresence';

const STAMP_INTERVAL_MS = 5 * 60 * 1000;

export function PresenceTracker() {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Track presence — also makes us a reader, but we discard the set here.
  usePresence({ userId });

  // Periodically stamp last_active_at while visible.
  useEffect(() => {
    if (!userId) return;
    const stamp = async () => {
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('user_id', userId);
    };
    void stamp();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void stamp();
      }
    }, STAMP_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void stamp();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId]);

  return null;
}
