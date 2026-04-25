'use client';
// Shared singleton wrapper over Supabase Realtime presence for the
// global "online users" channel. Multiple components can call usePresence
// without each opening a fresh channel — they all read from one shared
// store, and only one component (PresenceTracker) supplies a userId to
// track. This avoids the supabase-js "cannot add presence callbacks
// after subscribe()" error you get from creating two channels with the
// same topic name in the same browser session.
//
//   usePresence({ userId })  - track yourself + read the set
//   usePresence()            - read-only

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface PresenceMeta {
  user_id?: string;
  online_at?: string;
}

let channel: RealtimeChannel | null = null;
let initialized = false;
let onlineSet: Set<string> = new Set();
let trackingUserId: string | undefined;
const subscribers = new Set<(s: Set<string>) => void>();

function ensureChannel() {
  if (initialized) return;
  initialized = true;

  channel = supabase.channel('mitype-online-users');

  channel.on('presence', { event: 'sync' }, () => {
    if (!channel) return;
    const state = channel.presenceState() as Record<string, PresenceMeta[]>;
    const ids = new Set<string>();
    for (const arr of Object.values(state)) {
      for (const meta of arr) {
        if (meta?.user_id) ids.add(meta.user_id);
      }
    }
    onlineSet = ids;
    subscribers.forEach((cb) => cb(ids));
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED' && trackingUserId && channel) {
      await channel.track({
        user_id: trackingUserId,
        online_at: new Date().toISOString(),
      });
    }
  });
}

export function usePresence(track?: { userId: string | undefined }): Set<string> {
  const userId = track?.userId;
  const [snapshot, setSnapshot] = useState<Set<string>>(onlineSet);

  useEffect(() => {
    ensureChannel();

    const cb = (s: Set<string>) => setSnapshot(s);
    subscribers.add(cb);
    setSnapshot(onlineSet); // sync with current state on mount

    // If this caller wants to track a userId, register it on the
    // singleton. If the channel is already subscribed, track immediately;
    // otherwise the subscribe callback will pick up trackingUserId.
    if (userId && userId !== trackingUserId) {
      trackingUserId = userId;
      const ch = channel as RealtimeChannel & { state?: string };
      if (ch && ch.state === 'joined') {
        void ch.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    }

    return () => {
      subscribers.delete(cb);
      // We deliberately don't tear down the singleton channel — it lives
      // for the lifetime of the app session.
    };
  }, [userId]);

  return snapshot;
}
