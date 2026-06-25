'use client';
// ProfileStatsCard — at-a-glance stats for the dashboard.
//
// Three numbers, three short labels. Built to feel like a quick check-in,
// not an analytics dashboard. We only fetch counts (no PII) so the
// queries stay fast and the privacy posture stays clean.
//
//   Views this week     — distinct viewer count over the last 7 days
//                          (from profile_views; self-views excluded
//                          before insert).
//   New connections     — approved DMs the user is in that were
//                          created in the last 30 days.
//   Latest Wave video   — total views + total likes on the user's
//                          most recent Wave video. Empty if none.
//
// Variants:
//   - Full (dashboard) — three cards side-by-side / stacked on mobile.
//   - Compact (profile own page) — single inline strip.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface StatsData {
  viewsWeek: number;
  newConnections30d: number;
  latestWave: { views: number; likes: number; daysAgo: number } | null;
  loading: boolean;
}

function useProfileStats(userId: string | null | undefined): StatsData {
  const [stats, setStats] = useState<StatsData>({
    viewsWeek: 0,
    newConnections30d: 0,
    latestWave: null,
    loading: true,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [viewsRes, convosRes, waveRes] = await Promise.all([
        supabase
          .from('profile_views')
          .select('viewer_id', { count: 'exact', head: false })
          .eq('viewed_id', userId)
          .gte('viewed_at', weekAgo),
        supabase
          .from('conversations')
          .select('id, created_at, kind', { count: 'exact', head: false })
          .contains('participant_ids', [userId])
          .eq('status', 'approved')
          .eq('kind', 'dm')
          .gte('created_at', monthAgo),
        supabase
          .from('wave_videos')
          .select('view_count, like_count, created_at')
          .eq('user_id', userId)
          .eq('is_removed', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      // Distinct viewers in the last week (a single viewer who hit
      // your profile 4 times shouldn't show up as 4 views).
      const distinctViewers = new Set(
        (viewsRes.data ?? []).map((r: any) => r.viewer_id)
      ).size;

      const newConnections = convosRes.data?.length ?? 0;

      let latestWave: StatsData['latestWave'] = null;
      if (waveRes.data) {
        const daysAgo = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(waveRes.data.created_at).getTime())
            / (24 * 60 * 60 * 1000)
          )
        );
        latestWave = {
          views: waveRes.data.view_count ?? 0,
          likes: waveRes.data.like_count ?? 0,
          daysAgo,
        };
      }

      setStats({
        viewsWeek: distinctViewers,
        newConnections30d: newConnections,
        latestWave,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return stats;
}

/** Full-width stats card for the dashboard. */
export function ProfileStatsCard({ userId }: { userId: string | null | undefined }) {
  const stats = useProfileStats(userId);

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(200,149,108,0.2)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 800,
        color: 'var(--brand-personal-text-light)', textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 12,
      }}>
        Your week
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
      }}>
        <StatTile
          label="Profile views"
          sub="Last 7 days"
          value={stats.loading ? '–' : String(stats.viewsWeek)}
        />
        <StatTile
          label="New connections"
          sub="Last 30 days"
          value={stats.loading ? '–' : String(stats.newConnections30d)}
        />
        <StatTile
          label="Latest Wave"
          sub={
            stats.latestWave
              ? (stats.latestWave.daysAgo === 0 ? 'Today' : `${stats.latestWave.daysAgo}d ago`)
              : 'No video yet'
          }
          value={
            stats.loading ? '–' :
            stats.latestWave
              ? `${stats.latestWave.views} · ${stats.latestWave.likes}♥`
              : '-'
          }
        />
      </div>
    </div>
  );
}

/** Single-row compact strip for an own-profile page. */
export function ProfileStatsStrip({ userId }: { userId: string | null | undefined }) {
  const stats = useProfileStats(userId);
  if (stats.loading) return null;
  return (
    <div style={{
      display: 'flex',
      gap: 18,
      padding: '12px 16px',
      background: 'rgba(255,213,168,0.12)',
      border: '1px solid rgba(200,149,108,0.2)',
      borderRadius: 16,
      flexWrap: 'wrap',
      fontSize: 12,
      color: '#6b4f33',
      alignItems: 'center',
    }}>
      <StripStat label="Views (7d)" value={stats.viewsWeek} />
      <StripStat label="New connections (30d)" value={stats.newConnections30d} />
      {stats.latestWave && (
        <StripStat
          label="Latest Wave"
          value={`${stats.latestWave.views} views · ${stats.latestWave.likes}♥`}
        />
      )}
    </div>
  );
}

function StatTile({ label, sub, value }: { label: string; sub: string; value: string }) {
  return (
    <div style={{
      padding: '14px 12px',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-peach-warm) 0%, var(--brand-personal-bg-peach) 100%)',
      border: '1px solid rgba(200,149,108,0.18)',
      borderRadius: 16,
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 22,
        fontWeight: 900,
        color: 'var(--brand-text-primary)',
        letterSpacing: '-0.5px',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: 'var(--brand-personal-text-deep)',
        marginTop: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 10,
        color: 'var(--brand-personal-text-light)',
        marginTop: 1,
      }}>
        {sub}
      </div>
    </div>
  );
}

function StripStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={{
        fontSize: 16, fontWeight: 900, color: 'var(--brand-text-primary)',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {value}
      </span>
      <span style={{ fontSize: 10, color: 'var(--brand-personal-text-light)', fontWeight: 700, letterSpacing: '0.3px' }}>
        {label}
      </span>
    </div>
  );
}
