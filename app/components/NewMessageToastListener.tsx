'use client';
// Pops a toast whenever a new message arrives in any of the user's
// conversations, *unless* they're already on the messages page (where the
// message will appear live in the chat). Mounted once in the root layout
// so the listener runs on every page.
//
// Relies on RLS to ensure the user only receives INSERT events for
// conversations they're actually a participant of — we do not double-check
// participation here.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
}

// A short two-tone chime via Web Audio. Lazy-init the AudioContext on
// first call (browsers block creation before a user gesture in some
// circumstances; if it fails, we just stay silent — better than crashing).
let audioCtx: AudioContext | null = null;
function playChime() {
  if (typeof window === 'undefined') return;
  try {
    type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
    const w = window as WindowWithWebkitAudio;
    const Ctor = window.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.08, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };
    beep(880, 0, 0.12);
    beep(1175, 0.09, 0.16);
  } catch {
    // Silent fail — chime is non-essential.
  }
}

export function NewMessageToastListener() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  // Resolve user id and watch auth state.
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

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`new-messages-toast:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const row = payload.new as MessageRow;
          // Skip own sends.
          if (!row || row.sender_id === userId) return;
          // Skip if user is already viewing messages — they'll see it live.
          if (pathname?.startsWith('/messages')) return;

          // Resolve sender username for the toast.
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', row.sender_id)
            .single();

          const handle = sender?.username ? `@${sender.username}` : 'someone';
          toast.info(`💬 New message from ${handle}`);
          playChime();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  return null;
}
