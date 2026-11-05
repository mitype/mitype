'use client';
// Unread message counts — for the Messages nav badge and per-conversation
// counts in the conversation list. Refreshes on mount, on window focus,
// on visibility change, and on a 30s interval. We don't use Realtime here
// because postgres_changes filters can't express "all conversations I'm in"
// efficiently, and a 30s polling cadence is plenty for a nav badge.
//
// Several components on one page use this hook (nav, tab title, dashboard,
// messages). They all share ONE store and ONE polling timer, so the server
// is asked once per cycle no matter how many components are mounted.
//
// Counting happens in the database via the get_unread_counts() function
// (supabase-unread-counts-rpc.sql). If that function has not been created
// yet, we transparently fall back to the original row-based query.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export interface UnreadState {
  total: number;
  perConvo: Record<string, number>;
}

const EMPTY: UnreadState = { total: 0, perConvo: {} };
const POLL_MS = 30_000;

let store: UnreadState = EMPTY;
let activeUserId: string | undefined;
let rpcMissing = false;
let inFlight: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let listenersAttached = false;
const subscribers = new Set<(s: UnreadState) => void>();

function publish(next: UnreadState) {
  store = next;
  subscribers.forEach((cb) => cb(next));
}

function build(perConvo: Record<string, number>): UnreadState {
  const total = Object.values(perConvo).reduce((s, n) => s + n, 0);
  return { total, perConvo };
}

async function fetchCounts(userId: string): Promise<Record<string, number> | null> {
  if (!rpcMissing) {
    const { data, error } = await supabase.rpc('get_unread_counts');
    if (!error && Array.isArray(data)) {
      const perConvo: Record<string, number> = {};
      for (const row of data as Array<{ conversation_id: string; unread_count: number | string }>) {
        perConvo[row.conversation_id] = Number(row.unread_count);
      }
      return perConvo;
    }
    // Function not installed yet (or any RPC error): use the old query.
    rpcMissing = true;
  }
  // RLS already restricts the SELECT to messages in the caller's
  // conversations, so a simple "not from me, not read" predicate is
  // both correct and minimal.
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .neq('sender_id', userId)
    .is('read_at', null);
  if (error || !data) return null;
  const perConvo: Record<string, number> = {};
  for (const row of data as Array<{ conversation_id: string }>) {
    perConvo[row.conversation_id] = (perConvo[row.conversation_id] ?? 0) + 1;
  }
  return perConvo;
}

function refreshShared(): Promise<void> {
  const userId = activeUserId;
  if (!userId) return Promise.resolve();
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const perConvo = await fetchCounts(userId);
      // Ignore the result if the signed-in user changed while we waited.
      if (perConvo && userId === activeUserId) publish(build(perConvo));
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function onFocus() {
  void refreshShared();
}
function onVisibility() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    void refreshShared();
  }
}

function start() {
  if (timer || typeof window === 'undefined') return;
  if (!listenersAttached) {
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    listenersAttached = true;
  }
  timer = setInterval(() => {
    // Nobody is looking at a hidden tab; the visibility handler refreshes
    // as soon as it comes back.
    if (document.visibilityState === 'hidden') return;
    void refreshShared();
  }, POLL_MS);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (listenersAttached && typeof window !== 'undefined') {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    listenersAttached = false;
  }
}

export function useUnreadCounts(userId: string | undefined) {
  const [unread, setUnread] = useState<UnreadState>(
    activeUserId === userId ? store : EMPTY
  );

  const refresh = useCallback(async () => {
    await refreshShared();
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (activeUserId !== userId) {
      activeUserId = userId;
      store = EMPTY;
      inFlight = null;
    }
    subscribers.add(setUnread);
    start();
    void refreshShared();
    return () => {
      subscribers.delete(setUnread);
      if (subscribers.size === 0) stop();
    };
  }, [userId]);

  return { unread, refresh };
}
