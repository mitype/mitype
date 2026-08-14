'use client';
// /meetups/[id] — Meetup detail + RSVP button.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { toast } from '../../lib/toast';
import { liquidGlass } from '../../lib/liquidGlass';

interface MeetupDetail {
  id: string; host_id: string; title: string; description: string;
  meetup_time: string; venue_name: string | null; address: string | null;
  city: string | null; state: string | null; zip_code: string | null;
  capacity: number | null; rsvp_count: number; status: string;
  host: { username: string; avatar_url: string | null } | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MeetupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [meetup, setMeetup] = useState<MeetupDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [rsvped, setRsvped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const [mRes, subRes] = await Promise.all([
        supabase.from('meetups').select('*').eq('id', id).maybeSingle(),
        supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!mRes.data) { setLoading(false); return; }
      const m = mRes.data;
      const s = subRes.data?.status;
      setIsSubscribed(s === 'active' || s === 'trialing');
      setIsHost(m.host_id === user.id);
      const [hostRes, rsvpRes] = await Promise.all([
        supabase.from('profiles').select('username, avatar_url').eq('user_id', m.host_id).maybeSingle(),
        supabase.from('meetup_rsvps').select('user_id').eq('meetup_id', m.id).eq('user_id', user.id).maybeSingle(),
      ]);
      setRsvped(!!rsvpRes.data);
      setMeetup({ ...m, host: hostRes.data ?? null });
      setLoading(false);
    })();
  }, [id, router]);

  async function toggleRsvp() {
    if (!meetup || !userId) return;
    if (!isSubscribed) { router.push('/subscription'); return; }
    setBusy(true);
    if (rsvped) {
      const { error } = await supabase.from('meetup_rsvps').delete().eq('meetup_id', meetup.id).eq('user_id', userId);
      if (error) { toast.error(error.message); setBusy(false); return; }
      setRsvped(false);
      setMeetup({ ...meetup, rsvp_count: Math.max(0, meetup.rsvp_count - 1) });
      toast.success('RSVP canceled.');
    } else {
      if (meetup.capacity && meetup.rsvp_count >= meetup.capacity) {
        toast.error('This meetup is full.');
        setBusy(false);
        return;
      }
      const { error } = await supabase.from('meetup_rsvps').insert({ meetup_id: meetup.id, user_id: userId });
      if (error) { toast.error(error.message); setBusy(false); return; }
      setRsvped(true);
      setMeetup({ ...meetup, rsvp_count: meetup.rsvp_count + 1 });
      toast.success('RSVP confirmed. See you there.');
    }
    setBusy(false);
  }

  if (loading) return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-personal-bg-cream)' }}><p style={{ color: 'var(--brand-personal)' }}>Loading...</p></main>;
  if (!meetup) return (
    <main style={{ minHeight: '100vh', background: 'var(--brand-personal-bg-cream)', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/meetups" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Meetup not found</h1>
        <Link href="/meetups" style={{ ...liquidGlass({ tone: 'warm' }), display: 'inline-block', padding: '10px 22px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>Browse meetups</Link>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif", paddingBottom: 80 }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/meetups" />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 8 }}>{formatDate(meetup.meetup_time)}</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.6px', marginBottom: 8 }}>{meetup.title}</h1>
        {meetup.host && (
          <p style={{ fontSize: 13, color: 'var(--brand-personal-text-mid)', marginBottom: 16 }}>
            Hosted by <Link href={`/profile/${meetup.host.username}`} style={{ color: 'var(--brand-personal)', fontWeight: 700, textDecoration: 'none' }}>@{meetup.host.username}</Link>
          </p>
        )}
        <div style={{ background: 'white', border: '1px solid rgba(200,149,108,0.2)', borderRadius: 20, padding: '20px 22px', marginBottom: 20 }}>
          <p style={{ color: 'var(--brand-text-primary)', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 16px' }}>{meetup.description}</p>
          {(meetup.venue_name || meetup.address || meetup.city) && (
            <>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-personal-text-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Where</p>
              {meetup.venue_name && <p style={{ margin: 0, fontWeight: 700 }}>{meetup.venue_name}</p>}
              {meetup.address && <p style={{ margin: 0, fontSize: 14, color: 'var(--brand-personal-text-mid)' }}>{meetup.address}</p>}
              {meetup.city && <p style={{ margin: 0, fontSize: 14, color: 'var(--brand-personal-text-mid)' }}>{meetup.city}{meetup.state ? `, ${meetup.state}` : ''} {meetup.zip_code ?? ''}</p>}
            </>
          )}
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--brand-personal-text-light)' }}>
            {meetup.rsvp_count}{meetup.capacity ? ` / ${meetup.capacity}` : ''} going
          </p>
        </div>
        {isHost ? (
          <div style={{ padding: '16px 20px', background: 'rgba(200,149,108,0.10)', border: '1px solid rgba(200,149,108,0.28)', borderRadius: 16, fontSize: 14 }}>You are the host. {meetup.rsvp_count} guest{meetup.rsvp_count === 1 ? '' : 's'} RSVPd so far.</div>
        ) : !isSubscribed ? (
          <div style={{ padding: 20, background: 'white', border: '1px solid rgba(200,149,108,0.25)', borderRadius: 20 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>Subscribed members can RSVP</p>
            <Link href="/subscription" style={{ ...liquidGlass({ tone: 'warm' }), display: 'inline-block', padding: '11px 24px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>Subscribe to RSVP</Link>
          </div>
        ) : (
          <button type="button" onClick={toggleRsvp} disabled={busy}
            style={{ ...liquidGlass({ tone: rsvped ? 'clear' : 'warm' }), width: '100%', padding: '14px 22px', color: rsvped ? 'var(--brand-personal-text-mid)' : 'var(--brand-text-primary)', fontSize: 15, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}>
            {busy ? 'Saving...' : rsvped ? 'Cancel RSVP' : 'RSVP'}
          </button>
        )}
      </div>
    </main>
  );
}
