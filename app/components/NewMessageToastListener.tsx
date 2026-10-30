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
import { feedback } from '../lib/feedback';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
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
          // Already viewing messages: they see it live, just a soft chime.
          if (pathname?.startsWith('/messages')) { feedback.message(); return; }

          // Resolve sender username for the toast.
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', row.sender_id)
            .single();

          const handle = sender?.username ? `@${sender.username}` : 'someone';
          toast.info(`💬 New message from ${handle}`);
          feedback.message();
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const row = payload.new as { initiated_by?: string; participant_ids?: string[]; kind?: string | null };
          if (row && row.initiated_by !== userId && (row.kind ?? 'dm') === 'dm') feedback.connection();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const row = payload.new as { initiated_by?: string; status?: string };
          const old = payload.old as { status?: string };
          if (row && row.initiated_by === userId && row.status === 'approved' && old?.status !== 'approved') feedback.connection();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  return null;
}
