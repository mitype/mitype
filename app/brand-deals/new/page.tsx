'use client';
// /brand-deals/new — Business owner posts a new brand deal.
//
// Gated: only signed-in members who (a) own a business_profile and
// (b) have an active or trialing Mitype subscription can create a
// brief. Failing either check redirects to /subscription or
// /edit-business-profile with a friendly toast.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { toast } from '../../lib/toast';
import { liquidGlass } from '../../lib/liquidGlass';

const CREATOR_CATEGORIES = [
  'Photographers',
  'Videographers',
  'Writers',
  'Illustrators',
  'Musicians',
  'Content Creators',
  'Podcasters',
  'Designers',
  'Actors',
  'Voiceover Artists',
  'Motion Designers',
  'Editors',
  'Other',
];

const DELIVERABLE_OPTIONS = [
  'Instagram post',
  'Instagram Story',
  'Instagram Reel',
  'TikTok video',
  'YouTube video',
  'Blog article',
  'Podcast episode',
  'Product photography',
  'Voiceover',
  'Illustration',
  'Graphic design',
  'Motion graphic',
  'Copywriting',
  'Newsletter mention',
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid rgba(200,149,108,0.28)',
  borderRadius: 12,
  fontSize: 16,
  fontFamily: 'inherit',
  color: 'var(--brand-text-primary)',
  outline: 'none',
  background: 'white',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--brand-text-primary)',
  marginBottom: 6,
};

export default function NewBrandDealPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [gateChecking, setGateChecking] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [locationType, setLocationType] = useState<'remote' | 'local' | 'either'>('remote');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [timeline, setTimeline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      const [subRes, bizRes] = await Promise.all([
        supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('business_profiles').select('id, city, state').eq('user_id', user.id).maybeSingle(),
      ]);
      const status = subRes.data?.status;
      const isSubscribed = status === 'active' || status === 'trialing';

      if (!bizRes.data?.id) {
        toast.error('Set up a business profile before posting a brand deal.');
        router.replace('/edit-business-profile');
        return;
      }
      if (!isSubscribed) {
        toast.error('Subscribe to post brand deals.');
        router.replace('/subscription');
        return;
      }
      setBusinessId(bizRes.data.id);
      // Prefill city/state from the business profile when available.
      if (bizRes.data.city) setCity(bizRes.data.city);
      if (bizRes.data.state) setState(bizRes.data.state);
      setGateChecking(false);
    })();
  }, [router]);

  function toggleDeliverable(d: string) {
    setDeliverables((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function handleSave() {
    if (!userId || !businessId) return;
    if (title.trim().length < 3) { toast.error('Title needs at least 3 characters.'); return; }
    if (description.trim().length < 20) { toast.error('Description needs at least 20 characters.'); return; }

    // Parse budget cents (allow blank).
    function parseCents(v: string): number | null {
      const t = v.trim().replace(/[$,\s]/g, '');
      if (!t) return null;
      const n = Number(t);
      if (!Number.isFinite(n) || n < 0) return NaN;
      return Math.round(n * 100);
    }
    const minCents = parseCents(budgetMin);
    const maxCents = parseCents(budgetMax);
    if (Number.isNaN(minCents) || Number.isNaN(maxCents)) {
      toast.error('Budget must be numeric.');
      return;
    }
    if (minCents != null && maxCents != null && minCents > maxCents) {
      toast.error('Min budget can\'t exceed max budget.');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.from('brand_deals').insert({
      business_id: businessId,
      posted_by: userId,
      title: title.trim(),
      description: description.trim(),
      creator_category: category || null,
      deliverables,
      budget_min_cents: minCents,
      budget_max_cents: maxCents,
      location_type: locationType,
      city: city.trim() || null,
      state: state.trim() || null,
      timeline: timeline.trim() || null,
    }).select('id').single();
    setSaving(false);

    if (error || !data?.id) {
      toast.error(error?.message || 'Could not post the deal.');
      return;
    }
    toast.success('Brand deal posted.');
    router.push(`/brand-deals/${data.id}`);
  }

  if (gateChecking) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--brand-personal-bg-cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <p style={{ color: 'var(--brand-personal)' }}>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/brand-deals" />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{
          fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)',
          textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6,
        }}>
          Marketplace
        </p>
        <h1 style={{
          fontSize: 28, fontWeight: 900, color: 'var(--brand-text-primary)',
          letterSpacing: '-0.6px', marginBottom: 16,
        }}>
          Post a brand deal
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Title <span style={{ color: 'var(--brand-personal-text-light)', fontWeight: 500 }}>(required)</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Instagram Reel for our new coffee shop launch"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description <span style={{ color: 'var(--brand-personal-text-light)', fontWeight: 500 }}>(required)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              rows={6}
              placeholder="Describe the brief, the brand, and what a successful outcome looks like. The more specific, the better applicants you'll get."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Creator category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="">Anyone</option>
              {CREATOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Deliverables</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DELIVERABLE_OPTIONS.map((d) => {
                const active = deliverables.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDeliverable(d)}
                    style={{
                      padding: '7px 14px',
                      background: active ? 'var(--brand-personal)' : 'white',
                      color: active ? 'white' : 'var(--brand-personal-text-mid)',
                      border: `1px solid ${active ? 'var(--brand-personal)' : 'rgba(200,149,108,0.28)'}`,
                      borderRadius: 100,
                      fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={labelStyle}>Min budget (USD)</label>
              <input
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 200"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={labelStyle}>Max budget (USD)</label>
              <input
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 500"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['remote','either','local'] as const).map((k) => {
                const label = k === 'remote' ? 'Remote' : k === 'local' ? 'Local only' : 'Remote or local';
                const active = locationType === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setLocationType(k)}
                    style={{
                      padding: '7px 14px',
                      background: active ? 'var(--brand-personal)' : 'white',
                      color: active ? 'white' : 'var(--brand-personal-text-mid)',
                      border: `1px solid ${active ? 'var(--brand-personal)' : 'rgba(200,149,108,0.28)'}`,
                      borderRadius: 100,
                      fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {(locationType === 'local' || locationType === 'either') && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>State</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Timeline</label>
            <input
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g. 2 weeks · by Aug 25 · flexible"
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                ...liquidGlass({ tone: 'warm' }),
                width: '100%',
                padding: '14px 22px',
                color: 'var(--brand-text-primary)',
                fontSize: 15, fontWeight: 800,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {saving ? 'Posting…' : 'Post brand deal'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
