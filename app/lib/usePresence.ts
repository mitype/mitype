'use client';
// Lightweight wrapper over Supabase Realtime presence for the global
// "online users" channel. Two modes:
//
//   usePresence({ userId })  - subscribe AND track yourself as online
//   usePresence()            - read-only; just observe the online set
//
// Returns a Set<string> of user_ids currently considered online.
//
// Each call creates its own channel instance with the shared name
// 'online-users'. The Realtime server merges presence state across all
// subscribers, so any tracked user is visible to every reader.

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

interface PresenceMeta {
  user_id?: string;
  online_at?: string;
}

export function usePresence(track?: { userId: string | undefined }): Set<string> {
  const userId = track?.userId;
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    // If track was requested but the userId isn't ready yet, wait.
    // We still want to subscribe as a reader though, so create a
    // listener-only channel until userId arrives. We re-run the effect
    // when userId changes.
    const channel = supabase.channel('online-users', {
      config: userId ? { presence: { key: userId } } : {},
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, PresenceMeta[]>;
      const ids = new Set<string>();
      for (const arr of Object.values(state)) {
        for (const meta of arr) {
          if (meta?.user_id) ids.add(meta.user_id);
        }
      }
      setOnline(ids);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && userId) {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return online;
}
