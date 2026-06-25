'use client';
// /currents — The Current feed.
//
// Public to authenticated members for reading. Posting requires an
// active subscription (handled by RLS + composer gate). Renders against
// the dark ocean background with the per-session vortex intro.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { OceanBackground } from '../components/OceanBackground';
import { VortexIntro } from '../components/VortexIntro';
import { CurrentCard, type CurrentRecord } from '../components/CurrentCard';
import { CurrentComposer } from '../components/CurrentComposer';
import { hydrateMentions, type HydratedEmbeds } from '../lib/currentsHydrate';

const PAGE_SIZE = 25;

export default function CurrentsFeedPage() {
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CurrentRecord[]>([]);

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
      setViewerId(user.id);
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsSubscribed(sub?.status === 'active' || sub?.status === 'trialing');
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
      <VortexIntro />

      <SiteNav userId={viewerId ?? undefined} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
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
          <h1 style={{
            margin: '10px 0 4px',
            fontSize: 26,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-0.6px',
            textShadow: '0 2px 14px rgba(0,0,0,0.4)',
          }}>
            What's running through Mitype
          </h1>
          <p style={{
            margin: 0,
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
          }}>
            500-character drops. Echoes, replies, and rich embeds.
          </p>
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
            <p style={{ margin: 0, fontWeight: 800 }}>Still waters.</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              No currents yet. Drop the first one above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((c) => (
              <CurrentCard
                key={c.id}
                current={c}
                viewerId={viewerId}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
