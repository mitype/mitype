'use client';
// Unread message counts — for the Messages nav badge and per-conversation
// counts in the conversation list. Refreshes on mount, on window focus,
// on visibility change, and on a 30s interval. We don't use Realtime here
// because postgres_changes filters can't express "all conversations I'm in"
// efficiently, and a 30s polling cadence is plenty for a nav badge.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export interface UnreadState {
  total: number;
  perConvo: Record<string, number>;
}

export function useUnreadCounts(userId: string | undefined) {
  const [unread, setUnread] = useState<UnreadState>({ total: 0, perConvo: {} });

  const refresh = useCallback(async () => {
    if (!userId) return;
    // RLS already restricts the SELECT to messages in the caller's
    // conversations, so a simple "not from me, not read" predicate is
    // both correct and minimal.
    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .neq('sender_id', userId)
      .is('read_at', null);
    if (error || !data) return;
    const perConvo: Record<string, number> = {};
    for (const row of data as Array<{ conversation_id: string }>) {
      perConvo[row.conversation_id] = (perConvo[row.conversation_id] ?? 0) + 1;
    }
    const total = Object.values(perConvo).reduce((s, n) => s + n, 0);
    setUnread({ total, perConvo });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();

    const onFocus = () => { void refresh(); };
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refresh();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibility);
    }
    const interval = setInterval(refresh, 30_000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      }
      clearInterval(interval);
    };
  }, [userId, refresh]);

  return { unread, refresh };
}
