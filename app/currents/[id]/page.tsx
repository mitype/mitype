'use client';
// /currents/[id] — Detail view for a single current and its replies.
//
// Same ocean treatment as the feed. Parent at the top, composer in the
// middle (prefilled with @parentAuthor), threaded replies below.

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { OceanBackground } from '../../components/OceanBackground';
import { CurrentCard, type CurrentRecord } from '../../components/CurrentCard';
import { CurrentComposer } from '../../components/CurrentComposer';
import { hydrateMentions, type HydratedEmbeds } from '../../lib/currentsHydrate';

const EMPTY_EMBEDS: HydratedEmbeds = { users: [], businesses: [], listings: [] };

export default function CurrentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parent, setParent] = useState<CurrentRecord | null>(null);
  const [replies, setReplies] = useState<CurrentRecord[]>([]);

  const loadAll = useCallback(async (viewer: string | null) => {
    if (!id) return;

    const [parentRes, repliesRes] = await Promise.all([
      supabase
        .from('currents')
        .select('id, user_id, body, parent_id, echo_count, reply_count, created_at')
        .eq('id', id)
        .eq('is_removed', false)
        .maybeSingle(),
      supabase
        .from('currents')
        .select('id, user_id, body, parent_id, echo_count, reply_count, created_at')
        .eq('parent_id', id)
        .eq('is_removed', false)
        .order('created_at', { ascending: true })
        .limit(120),
    ]);
    if (!parentRes.data) {
      router.push('/currents');
      return;
    }
    const allRows = [parentRes.data, ...(repliesRes.data ?? [])];
    const authorIds = Array.from(new Set(allRows.map((r: any) => r.user_id)));

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
            .in('current_id', allRows.map((r: any) => r.id))
        : Promise.resolve({ data: [] as any[] }),
      hydrateMentions(allRows.map((r: any) => r.body)),
    ]);
    const authorMap = new Map<string, any>(
      (authorsRes.data ?? []).map((p: any) => [p.user_id, p]),
    );
    const echoedSet = new Set<string>((echoesRes.data ?? []).map((e: any) => e.current_id));

    function build(r: any): CurrentRecord {
      return {
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
        embeds: embedsBundle.byBody.get(r.body) ?? EMPTY_EMBEDS,
        echoedByMe: echoedSet.has(r.id),
      };
    }

    setParent(build(parentRes.data));
    setReplies((repliesRes.data ?? []).map(build));
  }, [id, router]);

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
      await loadAll(user.id);
      setLoading(false);
    })();
  }, [router, loadAll]);

  const refresh = useCallback(() => { void loadAll(viewerId); }, [loadAll, viewerId]);

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
      <SiteNav userId={viewerId ?? undefined} showBack backFallbackHref="/currents" />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 0' }}>
        {loading || !parent ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.65)', padding: 40 }}>
            Loading…
          </p>
        ) : (
          <>
            <CurrentCard
              current={parent}
              viewerId={viewerId}
              linkBody={false}
            />

            <div style={{ margin: '18px 0' }}>
              {viewerId && (
                <CurrentComposer
                  viewerId={viewerId}
                  isSubscribed={isSubscribed}
                  parentId={parent.id}
                  parentAuthorId={parent.author?.user_id ?? null}
                  prefill={parent.author ? `@${parent.author.username} ` : ''}
                  placeholder={`Reply to @${parent.author?.username ?? 'this current'}…`}
                  onPosted={refresh}
                />
              )}
            </div>

            {replies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {replies.map((r) => (
                  <CurrentCard
                    key={r.id}
                    current={r}
                    viewerId={viewerId}
                    compact
                  />
                ))}
              </div>
            ) : (
              <p style={{
                margin: '8px 0 0',
                textAlign: 'center',
                fontSize: 13,
                color: 'rgba(255,255,255,0.55)',
              }}>
                No replies yet. Be the first ripple.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
