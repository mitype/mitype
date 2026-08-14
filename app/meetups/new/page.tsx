'use client';
// /meetups/new — Host a new local meetup.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { toast } from '../../lib/toast';
import { liquidGlass } from '../../lib/liquidGlass';

const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid rgba(200,149,108,0.28)', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', color: 'var(--brand-text-primary)', outline: 'none', background: 'white', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 6 };

export default function NewMeetupPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [gate, setGate] = useState<'checking' | 'ok'>('checking');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetupTime, setMeetupTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle();
      const s = sub?.status;
      if (s !== 'active' && s !== 'trialing') {
        toast.error('Subscribe to host meetups.');
        router.replace('/subscription');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('city, state, zip_code').eq('user_id', user.id).maybeSingle();
      if (profile?.city) setCity(profile.city);
      if (profile?.state) setState(profile.state);
      if (profile?.zip_code) setZip(profile.zip_code);
      setGate('ok');
    })();
  }, [router]);

  async function save() {
    if (!userId) return;
    if (title.trim().length < 3) { toast.error('Title needs 3+ characters.'); return; }
    if (description.trim().length < 10) { toast.error('Description needs 10+ characters.'); return; }
    if (!meetupTime) { toast.error('Pick a date and time.'); return; }
    const iso = new Date(meetupTime).toISOString();
    if (new Date(iso).getTime() < Date.now()) { toast.error('Meetup must be in the future.'); return; }
    let cap: number | null = null;
    if (capacity.trim()) {
      const n = Number(capacity.trim());
      if (!Number.isFinite(n) || n < 2) { toast.error('Capacity must be at least 2.'); return; }
      cap = Math.floor(n);
    }
    setSaving(true);
    const { data, error } = await supabase.from('meetups').insert({
      host_id: userId, title: title.trim(), description: description.trim(),
      meetup_time: iso, venue_name: venueName.trim() || null, address: address.trim() || null,
      city: city.trim() || null, state: state.trim() || null, zip_code: zip.trim() || null,
      capacity: cap,
    }).select('id').single();
    setSaving(false);
    if (error || !data?.id) { toast.error(error?.message || 'Could not save.'); return; }
    toast.success('Meetup posted.');
    router.push(`/meetups/${data.id}`);
  }

  if (gate === 'checking') return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-personal-bg-cream)' }}><p style={{ color: 'var(--brand-personal)' }}>Loading...</p></main>;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif", paddingBottom: 80 }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/meetups" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.6px', marginBottom: 16 }}>Host a meetup</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div><label style={labelStyle}>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. NYC Photographers coffee meetup" style={inputStyle} /></div>
          <div><label style={labelStyle}>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} placeholder="What to expect, what to bring, who should come." style={{ ...inputStyle, resize: 'vertical' }} /></div>
          <div><label style={labelStyle}>Date and time</label><input type="datetime-local" value={meetupTime} onChange={(e) => setMeetupTime(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Venue name</label><input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="e.g. Blue Bottle Coffee" style={inputStyle} /></div>
          <div><label style={labelStyle}>Address</label><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" style={inputStyle} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 2 }}><label style={labelStyle}>City</label><input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>State</label><input value={state} onChange={(e) => setState(e.target.value)} style={inputStyle} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>ZIP</label><input value={zip} onChange={(e) => setZip(e.target.value)} inputMode="numeric" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>Capacity (optional)</label><input value={capacity} onChange={(e) => setCapacity(e.target.value)} inputMode="numeric" placeholder="Leave blank for unlimited" style={inputStyle} /></div>
          <button type="button" onClick={save} disabled={saving}
            style={{ ...liquidGlass({ tone: 'warm' }), width: '100%', padding: '14px 22px', color: 'var(--brand-text-primary)', fontSize: 15, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Posting...' : 'Post meetup'}
          </button>
        </div>
      </div>
    </main>
  );
}
