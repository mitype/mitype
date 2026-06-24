'use client';
// useSubscriptionGate — checks the current user's subscription and
// redirects to /subscription if they're not active or trialing.
//
// Routes that need to be locked behind subscription:
//   /wave/*
//   /edit-business-profile
//   /home-goods/new, /home-goods/[id]/edit, /home-goods/mine
//
// Browse routes (/home-goods, business listings on /discover) stay
// public so visitors can see what they'd get and decide to subscribe.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient';

type GateState = 'checking' | 'subscribed' | 'free' | 'unauthenticated';

interface Options {
  /** Where to send a free user. Defaults to /subscription. */
  redirectTo?: string;
  /** Where to send an unauthenticated user. Defaults to /login. */
  loginRedirect?: string;
}

export function useSubscriptionGate(opts?: Options): GateState {
  const router = useRouter();
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState('unauthenticated');
        router.push(opts?.loginRedirect ?? '/login');
        return;
      }
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      const isSubscribed = sub?.status === 'active' || sub?.status === 'trialing';
      if (cancelled) return;
      if (!isSubscribed) {
        setState('free');
        router.push(opts?.redirectTo ?? '/subscription');
        return;
      }
      setState('subscribed');
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
