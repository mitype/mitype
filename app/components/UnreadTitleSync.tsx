'use client';
// Prefixes the browser tab title with "(N) " whenever the user has
// unread messages. Mounted once in the root layout so the prefix follows
// the user across every page (including non-message ones like /discover).
//
// We deliberately don't render anything — this is just a side-effect
// component. The prefix is reapplied whenever the unread total or the
// pathname changes (Next sets a fresh title on client navigation).

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { useUnreadCounts } from '../lib/useUnreadCounts';

export function UnreadTitleSync() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { unread } = useUnreadCounts(userId);
  const pathname = usePathname();

  // Resolve the current user id, and re-resolve on auth state changes
  // (sign in / sign out) so the badge clears when a user logs out.
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Defer one tick so Next finishes applying the new <title> after
    // a client-side navigation, then we layer our prefix on top.
    const timer = setTimeout(() => {
      const stripped = document.title.replace(/^\(\d+\+?\)\s/, '');
      if (unread.total > 0) {
        const display = unread.total > 99 ? '99+' : String(unread.total);
        document.title = `(${display}) ${stripped}`;
      } else {
        document.title = stripped;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [unread.total, pathname]);

  return null;
}
