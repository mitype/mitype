'use client';
// /currents — The Current feed.
//
// Public to authenticated members for reading. Posting requires an
// active subscription (handled by RLS + composer gate). Renders against
// the dark ocean background with the per-session vortex intro.

import { useCallback, useEffect, useState } from 'react';
import { FeatureInfoButton } from '../components/FeatureInfoButton';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { OceanBackground } from '../components/OceanBackground';
import { VortexIntro } from '../components/VortexIntro';
import { CurrentCard, type CurrentRecord } from '../components/CurrentCard';
import { CurrentComposer } from '../components/CurrentComposer';
import { CurrentTutorial } from '../components/CurrentTutorial';
import { hydrateMentions, type HydratedEmbeds } from '../lib/currentsHydrate';
import { markSeen } from '../lib/lastSeen';

const PAGE_SIZE = 25;

export default function CurrentsFeedPage() {
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CurrentRecord[]>([]);
  // The first-visit tutorial is gated behind the vortex animation
  // finishing so the educational modal doesn't fight the visual reveal.
  const [vortexDone, setVortexDone] = useState(false);

  // Stamp "last time this device opened The Current" so the dashboard
  // card stops pulsating until new posts arrive after now.
  useEffect(() => {
    markSeen('currents');
  }, []);

  const loadFeed = useCallback(async (viewer: string | null) => {
    const { data: rows } = await supabase
      .from('currents')
      .select('id, user_id, body, parent_id, echo_count, reply_count, created_at')
      .is('parent_id', null)
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (!rows || rows.length === 0) {
      setItems([]);
      return;
    }

    // Hydrate authors + echo-by-me + mentions in parallel.
    const authorIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
    const [authorsRes, echoesRes, embedsBundle] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', authorIds),
      viewer
        ? supabase
            .from('current_echoes')
            .select('current_id')
            .eq('user_id', viewer)
            .in('current_id', rows.map((r: any) => r.id))
        : Promise.resolve({ data: [] as any[] }),
      hydrateMentions(rows.map((r: any) => r.body)),
    ]);
    const authorMap = new Map<string, any>(
      (authorsRes.data ?? []).map((p: any) => [p.user_id, p]),
    );
    const echoedSet = new Set<string>((echoesRes.data ?? []).map((e: any) => e.current_id));
    const empty: HydratedEmbeds = { users: [], businesses: [], listings: [] };

    setItems(rows.map((r: any) => ({
      id: r.id,
      body: r.body,
      parent_id: r.parent_id,
      echo_count: r.echo_count,
      reply_count: r.reply_count,
      created_at: r.created_at,
      author: authorMap.has(r.user_id)
        ? {
            user_id: r.user_id,
            username: authorMap.get(r.user_id).username,
            avatar_url: authorMap.get(r.user_id).avatar_url,
          }
        : null,
      embeds: embedsBundle.byBody.get(r.body) ?? empty,
      echoedByMe: echoedSet.has(r.id),
    })));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      const subscribed = sub?.status === 'active' || sub?.status === 'trialing';
      if (!subscribed) {
        router.push('/subscription');
        return;
      }
      setViewerId(user.id);
      setIsSubscribed(subscribed);
      await loadFeed(user.id);
      setLoading(false);
    })();
  }, [router, loadFeed]);

  const refresh = useCallback(() => { void loadFeed(viewerId); }, [loadFeed, viewerId]);

  return (
    <main
      style={{
        minHeight: '100vh',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        position: 'relative',
        color: 'white',
        paddingBottom: 120,
      }}
    >
      <OceanBackground />
      <VortexIntro onDone={() => setVortexDone(true)} />

      <SiteNav userId={viewerId ?? undefined} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 0' }}>
        {/* First-time tutorial — all "how to use The Current" content
            lives here so the feed itself stays uncluttered. Shows once
            per device (localStorage gated). Held back until the vortex
            finishes so the educational modal doesn't compete with the
            visual reveal on a user's first visit. */}
        {vortexDone && <CurrentTutorial />}

        {/* The Current eyebrow chip — the only chrome on the feed. */}
        <div style={{ marginBottom: 18, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px',
            background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
            borderRadius: 100,
            color: 'white',
            fontSize: 11, fontWeight: 800,
            letterSpacing: '1.4px', textTransform: 'uppercase',
            boxShadow: '0 8px 22px rgba(14,165,233,0.45)',
          }}>
            The Current
          </div>
        </div>

        {/* Composer */}
        {viewerId && (
          <div style={{ marginBottom: 18 }}>
            <CurrentComposer
              viewerId={viewerId}
              isSubscribed={isSubscribed}
              onPosted={refresh}
            />
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.65)', padding: 40 }}>
            Surfacing the latest drops…
          </p>
        ) : items.length === 0 ? (
          <div style={{
            padding: 32,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '1px dashed rgba(255,255,255,0.18)',
            borderRadius: 18,
            color: 'rgba(255,255,255,0.8)',
          }}>
            <p style={{ margin: 0, fontWeight: 800 }}>No currents yet.</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              Float the first one above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((c) => (
              <CurrentCard
                key={c.id}
                current={c}
                viewerId={viewerId}
                onMutated={refresh}
              />
            ))}
          </div>
        )}
      </div>
          <FeatureInfoButton featureKey="currents" />
    </main>
  );
}
