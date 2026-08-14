'use client';
// /meetups — Browse upcoming local creator meetups.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { liquidGlass } from '../lib/liquidGlass';

interface MeetupRow {
  id: string; host_id: string; title: string; description: string;
  meetup_time: string; venue_name: string | null; city: string | null; state: string | null;
  zip_code: string | null; capacity: number | null; rsvp_count: number;
  host: { username: string; avatar_url: string | null } | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MeetupsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [meetups, setMeetups] = useState<MeetupRow[]>([]);
  const [zipFilter, setZipFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const [subRes, meetupsRes] = await Promise.all([
        supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('meetups')
          .select('id, host_id, title, description, meetup_time, venue_name, city, state, zip_code, capacity, rsvp_count')
          .eq('status', 'open')
          .gte('meetup_time', new Date().toISOString())
          .order('meetup_time', { ascending: true })
          .limit(60),
      ]);
      const s = subRes.data?.status;
      setIsSubscribed(s === 'active' || s === 'trialing');
      const hostIds = Array.from(new Set((meetupsRes.data ?? []).map((m: any) => m.host_id)));
      const hostsRes = hostIds.length
        ? await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', hostIds)
        : { data: [] as any[] };
      const hostMap = new Map<string, any>((hostsRes.data ?? []).map((p: any) => [p.user_id, p]));
      setMeetups((meetupsRes.data ?? []).map((m: any) => ({ ...m, host: hostMap.get(m.host_id) ?? null })));
      setLoading(false);
    })();
  }, [router]);

  const filtered = zipFilter.trim() ? meetups.filter((m) => m.zip_code?.startsWith(zipFilter.trim())) : meetups;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif", paddingBottom: 80 }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/dashboard" />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6 }}>In person</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.8px', marginBottom: 8 }}>Local Meetups</h1>
        <p style={{ color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.5, marginBottom: 20, maxWidth: 640 }}>
          In person creator meetups hosted by other Mitype members. Coffee chats, portfolio reviews, gallery visits, studio sessions. Subscribed members can host or RSVP.
        </p>
        <Link href={isSubscribed ? '/meetups/new' : '/subscription'}
          style={{ ...liquidGlass({ tone: 'warm' }), display: 'inline-block', padding: '10px 22px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, textDecoration: 'none', marginBottom: 16 }}>
          {isSubscribed ? 'Host a meetup' : 'Subscribe to host'}
        </Link>
        <input value={zipFilter} onChange={(e) => setZipFilter(e.target.value)} placeholder="Filter by ZIP (e.g. 100)" inputMode="numeric"
          style={{ width: '100%', padding: '12px 16px', border: '1px solid rgba(200,149,108,0.25)', borderRadius: 12, fontSize: 16, background: 'white', outline: 'none', marginBottom: 20, boxSizing: 'border-box', fontFamily: 'inherit' }} />
        {loading ? <p style={{ textAlign: 'center', color: 'var(--brand-personal)', padding: '48px 0' }}>Loading...</p>
          : filtered.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', background: 'white', border: '1px solid rgba(200,149,108,0.15)', borderRadius: 16, color: 'var(--brand-personal-text-light)', fontSize: 14 }}>
              No upcoming meetups. Be the first to host one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((m) => (
                <Link key={m.id} href={`/meetups/${m.id}`}
                  style={{ ...liquidGlass({ tone: 'clear', radius: 16, variant: 'lite' }), display: 'block', padding: '16px 18px', textDecoration: 'none', color: 'var(--brand-text-primary)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-personal)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{formatDate(m.meetup_time)}</p>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--brand-text-primary)', margin: '0 0 6px', letterSpacing: '-0.2px' }}>{m.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--brand-personal-text-mid)', margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.description}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, fontWeight: 700 }}>
                    {m.venue_name && <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(200,149,108,0.12)', color: 'var(--brand-personal)' }}>📍 {m.venue_name}</span>}
                    {m.city && <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(21,128,61,0.12)', color: 'var(--brand-market)' }}>{m.city}{m.state ? `, ${m.state}` : ''}</span>}
                    <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(0,0,0,0.05)', color: 'var(--brand-personal-text-light)' }}>{m.rsvp_count}{m.capacity ? `/${m.capacity}` : ''} going</span>
                    {m.host && <span style={{ marginLeft: 'auto', color: 'var(--brand-personal-text-light)', fontWeight: 500 }}>Hosted by @{m.host.username}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </main>
  );
}
