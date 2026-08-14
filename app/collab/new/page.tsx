'use client';
// /collab/new — Subscribed creator posts a new collab brief.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { toast } from '../../lib/toast';
import { liquidGlass } from '../../lib/liquidGlass';

const CATEGORIES = ['Photographers','Videographers','Writers','Illustrators','Musicians','Content Creators','Podcasters','Designers','Actors','Voiceover Artists','Motion Designers','Editors','Other'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1px solid rgba(200,149,108,0.28)',
  borderRadius: 12, fontSize: 16, fontFamily: 'inherit', color: 'var(--brand-text-primary)',
  outline: 'none', background: 'white', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 6 };

export default function NewCollabBriefPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [gate, setGate] = useState<'checking' | 'ok'>('checking');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [compensationType, setCompensationType] = useState<'paid' | 'trade' | 'revenue_share' | 'credit'>('trade');
  const [compensationDetails, setCompensationDetails] = useState('');
  const [timeline, setTimeline] = useState('');
  const [locationType, setLocationType] = useState<'remote' | 'local' | 'either'>('remote');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle();
      const s = sub?.status;
      if (s !== 'active' && s !== 'trialing') {
        toast.error('Subscribe to post collab briefs.');
        router.replace('/subscription');
        return;
      }
      setGate('ok');
    })();
  }, [router]);

  async function handleSave() {
    if (!userId) return;
    if (title.trim().length < 3) { toast.error('Title needs 3+ characters.'); return; }
    if (description.trim().length < 20) { toast.error('Description needs 20+ characters.'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('collab_briefs').insert({
      posted_by: userId,
      title: title.trim(),
      description: description.trim(),
      looking_for_category: category || null,
      compensation_type: compensationType,
      compensation_details: compensationDetails.trim() || null,
      timeline: timeline.trim() || null,
      location_type: locationType,
      city: city.trim() || null,
      state: state.trim() || null,
    }).select('id').single();
    setSaving(false);
    if (error || !data?.id) { toast.error(error?.message || 'Could not post.'); return; }
    toast.success('Collab brief posted.');
    router.push(`/collab/${data.id}`);
  }

  if (gate === 'checking') {
    return <main style={{ minHeight: '100vh', background: 'var(--brand-personal-bg-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--brand-personal)' }}>Loading...</p></main>;
  }

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif", paddingBottom: 80 }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/collab" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6 }}>Collab Board</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.6px', marginBottom: 16 }}>Post a collab brief</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Looking for an illustrator for a childrens book cover" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} rows={6} placeholder="Explain the project. The more specific, the better applicants you will get." style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>What kind of creator are you looking for?</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              <option value="">Anyone</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Compensation</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['paid','trade','revenue_share','credit'] as const).map((k) => {
                const label = k === 'paid' ? 'Paid' : k === 'trade' ? 'Trade' : k === 'revenue_share' ? 'Rev share' : 'Credit';
                const active = compensationType === k;
                return (
                  <button key={k} type="button" onClick={() => setCompensationType(k)}
                    style={{ padding: '7px 14px', background: active ? 'var(--brand-personal)' : 'white', color: active ? 'white' : 'var(--brand-personal-text-mid)', border: `1px solid ${active ? 'var(--brand-personal)' : 'rgba(200,149,108,0.28)'}`, borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <input value={compensationDetails} onChange={(e) => setCompensationDetails(e.target.value)} placeholder="Optional details (e.g. $200, 20% royalty, credit + copy)" style={{ ...inputStyle, marginTop: 8 }} />
          </div>
          <div>
            <label style={labelStyle}>Timeline</label>
            <input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 2 weeks, by Sep 15, flexible" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['remote','either','local'] as const).map((k) => {
                const label = k === 'remote' ? 'Remote' : k === 'local' ? 'Local only' : 'Remote or local';
                const active = locationType === k;
                return (
                  <button key={k} type="button" onClick={() => setLocationType(k)}
                    style={{ padding: '7px 14px', background: active ? 'var(--brand-personal)' : 'white', color: active ? 'white' : 'var(--brand-personal-text-mid)', border: `1px solid ${active ? 'var(--brand-personal)' : 'rgba(200,149,108,0.28)'}`, borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {(locationType === 'local' || locationType === 'either') && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 2 }}><label style={labelStyle}>City</label><input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>State</label><input value={state} onChange={(e) => setState(e.target.value)} style={inputStyle} /></div>
            </div>
          )}
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ ...liquidGlass({ tone: 'warm' }), width: '100%', padding: '14px 22px', color: 'var(--brand-text-primary)', fontSize: 15, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Posting...' : 'Post collab brief'}
          </button>
        </div>
      </div>
    </main>
  );
}
