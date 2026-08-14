'use client';
// /collab/[id] — Collab brief detail + apply flow.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { toast } from '../../lib/toast';
import { liquidGlass } from '../../lib/liquidGlass';

interface BriefDetail {
  id: string;
  posted_by: string;
  title: string;
  description: string;
  looking_for_category: string | null;
  compensation_type: 'paid' | 'trade' | 'revenue_share' | 'credit';
  compensation_details: string | null;
  timeline: string | null;
  location_type: 'remote' | 'local' | 'either';
  city: string | null;
  state: string | null;
  status: 'open' | 'closed' | 'filled';
  applications_count: number;
  created_at: string;
  poster: { username: string; avatar_url: string | null } | null;
}

const COMP_LABELS = { paid: 'Paid', trade: 'Trade', revenue_share: 'Revenue share', credit: 'Credit' };

export default function CollabBriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [intro, setIntro] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const [briefRes, subRes] = await Promise.all([
        supabase.from('collab_briefs').select('*').eq('id', id).maybeSingle(),
        supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!briefRes.data) { setLoading(false); return; }
      const b = briefRes.data;
      const s = subRes.data?.status;
      setIsSubscribed(s === 'active' || s === 'trialing');
      setIsOwner(b.posted_by === user.id);

      const [posterRes, appRes] = await Promise.all([
        supabase.from('profiles').select('username, avatar_url').eq('user_id', b.posted_by).maybeSingle(),
        supabase.from('collab_applications').select('id').eq('brief_id', b.id).eq('applicant_id', user.id).maybeSingle(),
      ]);
      setAlreadyApplied(!!appRes.data);
      setBrief({ ...b, poster: posterRes.data ?? null });
      setLoading(false);
    })();
  }, [id, router]);

  async function submit() {
    if (!brief || !userId) return;
    if (!isSubscribed) { router.push('/subscription'); return; }
    if (intro.trim().length < 20) { toast.error('Intro must be at least 20 characters.'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('collab_applications').insert({
      brief_id: brief.id, applicant_id: userId, intro_message: intro.trim(),
    });
    if (error) {
      setSubmitting(false);
      if (error.message?.toLowerCase().includes('duplicate')) { toast.error('You already applied.'); setAlreadyApplied(true); return; }
      toast.error(error.message);
      return;
    }
    try {
      const otherId = brief.posted_by;
      const participants = [userId, otherId].sort();
      const { data: convo } = await supabase.from('conversations').insert({
        participant_ids: participants, initiated_by: userId, status: 'pending',
      }).select('id').single();
      if (convo?.id) {
        await supabase.from('messages').insert({
          conversation_id: convo.id, sender_id: userId,
          content: `[Collab application: "${brief.title}"]\n\n${intro.trim()}`,
        });
      }
    } catch {}
    setSubmitting(false);
    setAlreadyApplied(true);
    setShowForm(false);
    toast.success('Application sent. Check Messages for the reply.');
  }

  if (loading) return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-personal-bg-cream)' }}><p style={{ color: 'var(--brand-personal)' }}>Loading...</p></main>;
  if (!brief) return (
    <main style={{ minHeight: '100vh', background: 'var(--brand-personal-bg-cream)', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/collab" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Brief not found</h1>
        <Link href="/collab" style={{ ...liquidGlass({ tone: 'warm' }), display: 'inline-block', padding: '10px 22px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>Browse briefs</Link>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif", paddingBottom: 80 }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/collab" />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        {brief.poster && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--brand-personal-bg-pale)', flexShrink: 0 }}>
              {brief.poster.avatar_url && <img src={brief.poster.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Posted by</p>
              <Link href={`/profile/${brief.poster.username}`} style={{ fontSize: 16, fontWeight: 800, color: 'var(--brand-text-primary)', textDecoration: 'none' }}>@{brief.poster.username}</Link>
            </div>
          </div>
        )}
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.6px', marginBottom: 12, lineHeight: 1.2 }}>{brief.title}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: 'rgba(200,149,108,0.12)', color: 'var(--brand-personal)' }}>{COMP_LABELS[brief.compensation_type]}</span>
          {brief.looking_for_category && <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: 'rgba(56,189,248,0.12)', color: '#0369a1' }}>Needs: {brief.looking_for_category}</span>}
          <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: 'rgba(21,128,61,0.12)', color: 'var(--brand-market)' }}>{brief.location_type === 'remote' ? 'Remote' : brief.location_type === 'local' ? `Local · ${brief.city ?? ''}` : 'Remote or local'}</span>
          {brief.timeline && <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: 'rgba(0,0,0,0.05)', color: 'var(--brand-personal-text-mid)' }}>Timeline: {brief.timeline}</span>}
        </div>
        <div style={{ background: 'white', border: '1px solid rgba(200,149,108,0.2)', borderRadius: 20, padding: '24px 26px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-personal-text-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>The project</h2>
          <p style={{ color: 'var(--brand-text-primary)', fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{brief.description}</p>
          {brief.compensation_details && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-personal-text-light)', textTransform: 'uppercase', letterSpacing: '1px', margin: '22px 0 10px' }}>Compensation details</h2>
              <p style={{ color: 'var(--brand-text-primary)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{brief.compensation_details}</p>
            </>
          )}
        </div>
        {isOwner ? (
          <div style={{ padding: '16px 20px', background: 'rgba(200,149,108,0.10)', border: '1px solid rgba(200,149,108,0.28)', borderRadius: 16, fontSize: 14 }}>You posted this. <strong>{brief.applications_count}</strong> applicant{brief.applications_count === 1 ? '' : 's'} so far. Check Messages for their intros.</div>
        ) : brief.status !== 'open' ? (
          <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.05)', borderRadius: 16, textAlign: 'center' }}>This brief is closed.</div>
        ) : alreadyApplied ? (
          <div style={{ padding: '16px 20px', background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.28)', borderRadius: 16, textAlign: 'center', color: 'var(--brand-market)', fontWeight: 700, fontSize: 14 }}>You already applied. Check Messages.</div>
        ) : !isSubscribed ? (
          <div style={{ padding: 20, background: 'white', border: '1px solid rgba(200,149,108,0.25)', borderRadius: 20 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>Subscribed creators can apply</p>
            <Link href="/subscription" style={{ ...liquidGlass({ tone: 'warm' }), display: 'inline-block', padding: '11px 24px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>Subscribe to apply</Link>
          </div>
        ) : showForm ? (
          <div style={{ padding: '22px', background: 'white', border: '1px solid rgba(200,149,108,0.25)', borderRadius: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Apply to this brief</h3>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={5} maxLength={2000} placeholder="Tell them why you are a fit. Share relevant work." style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(200,149,108,0.28)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none', marginBottom: 12, boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={submit} disabled={submitting} style={{ ...liquidGlass({ tone: 'warm' }), padding: '11px 24px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.6 : 1, fontFamily: 'inherit' }}>{submitting ? 'Sending...' : 'Send'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ ...liquidGlass({ tone: 'clear' }), padding: '11px 24px', color: 'var(--brand-personal-text-mid)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowForm(true)} style={{ ...liquidGlass({ tone: 'warm' }), width: '100%', padding: '14px 22px', color: 'var(--brand-text-primary)', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Apply to this brief</button>
        )}
      </div>
    </main>
  );
}
