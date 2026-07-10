'use client';
// /home-goods/[id]/edit — edit an existing listing.
//
// Subscription-gated. Only the seller can land here (RLS would block
// the update anyway, but we redirect early for a clean UX).

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from '../../../lib/toast';
import { safeUpload } from '../../../lib/safeUpload';
import { SiteNav } from '../../../components/SiteNav';
import {
  HOME_GOODS_CATEGORIES,
  HOME_GOODS_CONDITIONS,
  type HomeGoodsCondition,
} from '../../../lib/homeGoodsCategories';

const MAX_PHOTOS = 4;
const MAX_DESC = 600;
const MAX_TITLE = 80;

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [priceKind, setPriceKind] = useState<'obo' | 'firm' | 'free'>('obo');
  const [condition, setCondition] = useState<HomeGoodsCondition>('gently-used');
  const [category, setCategory] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [status, setStatus] = useState<'active' | 'sold' | 'hidden'>('active');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!id) return;
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
      const ok = sub?.status === 'active' || sub?.status === 'trialing';
      if (!ok) {
        router.push('/subscription');
        return;
      }
      setUser(user);

      const { data: rec } = await supabase
        .from('home_goods_listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!rec || rec.seller_id !== user.id) {
        toast.error('That listing isn\'t yours to edit.');
        router.push('/home-goods/mine');
        return;
      }
      setTitle(rec.title ?? '');
      setDescription(rec.description ?? '');
      setPriceKind(rec.price_kind ?? 'obo');
      if (rec.price_kind === 'free' || rec.price_cents === 0) {
        setPriceDollars('');
      } else if (rec.price_cents !== null && rec.price_cents !== undefined) {
        setPriceDollars((rec.price_cents / 100).toString());
      }
      setCondition(rec.condition ?? 'gently-used');
      setCategory(rec.category ?? '');
      setPhotoUrls(rec.photo_urls ?? []);
      setCity(rec.city ?? '');
      setStateField(rec.state ?? '');
      setStatus(rec.status ?? 'active');
      setLoading(false);
    })();
  }, [id, router]);

  async function handlePhotoSelected(files: FileList | null) {
    if (!files || files.length === 0 || !user) return;
    const remaining = MAX_PHOTOS - photoUrls.length;
    if (remaining <= 0) {
      toast.error(`Max ${MAX_PHOTOS} photos per listing.`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of list) {
        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        try {
          const { publicUrl } = await safeUpload(file, {
            bucket: 'home-goods-photos',
            path,
            kind: 'image',
          });
          newUrls.push(publicUrl);
        } catch (e: any) {
          toast.error(e?.message ?? 'Photo upload failed');
        }
      }
      if (newUrls.length > 0) {
        setPhotoUrls((prev) => [...prev, ...newUrls]);
      }
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleSave() {
    if (!user || !id) return;
    if (!title.trim()) { toast.error('Add a title.'); return; }
    if (!category)     { toast.error('Pick a category.'); return; }
    if (photoUrls.length === 0) { toast.error('Add at least one photo.'); return; }
    let priceCents: number | null = null;
    if (priceKind === 'free') priceCents = 0;
    else {
      const cleaned = priceDollars.trim().replace(/[$,]/g, '');
      if (!cleaned) { toast.error('Add a price (or pick Free).'); return; }
      const dollars = Number(cleaned);
      if (!Number.isFinite(dollars) || dollars < 0) {
        toast.error('Price should be a positive number.');
        return;
      }
      priceCents = Math.round(dollars * 100);
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('home_goods_listings')
        .update({
          title: title.trim().slice(0, MAX_TITLE),
          description: description.trim().slice(0, MAX_DESC) || null,
          price_cents: priceCents,
          price_kind: priceKind,
          condition,
          category,
          photo_urls: photoUrls,
          city: city.trim() || null,
          state: stateField.trim() || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Listing updated');
      router.push(`/home-goods/${id}`);
    } catch (e: any) {
      console.error('[home-goods/edit] update failed:', e);
      toast.error(e?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh', background: 'var(--brand-market-bg-pale)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <p style={{ color: 'var(--brand-market-text-mid)' }}>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-market-bg-pale) 0%, var(--brand-market-bg-mint) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={user?.id} showBack backFallbackHref={`/home-goods/${id}`} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{
          margin: '0 0 22px',
          fontSize: 26,
          fontWeight: 900,
          color: 'var(--brand-market-deep)',
          letterSpacing: '-0.5px',
        }}>
          Edit listing
        </h1>

        {/* Status */}
        <Section label="Status">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <StatusChip label="Active" active={status === 'active'} onClick={() => setStatus('active')} />
            <StatusChip label="Sold" active={status === 'sold'} onClick={() => setStatus('sold')} />
            <StatusChip label="Hidden" active={status === 'hidden'} onClick={() => setStatus('hidden')} />
          </div>
        </Section>

        {/* Photos */}
        <Section label={`Photos · ${photoUrls.length}/${MAX_PHOTOS}`}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 10,
          }}>
            {photoUrls.map((url) => (
              <div
                key={url}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  background: `url(${url}) center/cover no-repeat`,
                  borderRadius: 12,
                  border: '1px solid rgba(21,128,61,0.2)',
                }}
              >
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label="Remove photo"
                  style={{
                    position: 'absolute',
                    top: 6, right: 6,
                    width: 26, height: 26,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {photoUrls.length < MAX_PHOTOS && (
              <label style={{
                aspectRatio: '1 / 1',
                background: 'white',
                border: '1px dashed rgba(21,128,61,0.4)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                color: 'var(--brand-market-text-mid)',
                fontSize: 12,
                fontWeight: 700,
                gap: 4,
              }}>
                <span style={{ fontSize: 24 }}>{uploading ? '⌛' : '＋'}</span>
                {uploading ? 'Uploading…' : 'Add photo'}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => handlePhotoSelected(e.target.files)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
        </Section>

        <Section label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
            maxLength={MAX_TITLE}
            style={inputStyle}
          />
        </Section>

        <Section label="Price">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flex: '1 1 160px',
              padding: '0 12px',
              background: 'white',
              border: '1px solid rgba(21,128,61,0.25)',
              borderRadius: 12,
            }}>
              <span style={{ color: 'var(--brand-market-text-mid)', fontWeight: 700 }}>$</span>
              <input
                type="text"
                inputMode="decimal"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value.slice(0, 8))}
                disabled={priceKind === 'free'}
                style={{ ...inputStyle, border: 'none', padding: '11px 0', background: 'transparent' }}
              />
            </div>
            <StatusChip label="OBO" active={priceKind === 'obo'} onClick={() => setPriceKind('obo')} />
            <StatusChip label="Firm" active={priceKind === 'firm'} onClick={() => setPriceKind('firm')} />
            <StatusChip label="Free" active={priceKind === 'free'} onClick={() => { setPriceKind('free'); setPriceDollars(''); }} />
          </div>
        </Section>

        <Section label="Condition">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
            {HOME_GOODS_CONDITIONS.map((c) => {
              const active = condition === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCondition(c.key)}
                  style={{
                    padding: '10px 12px',
                    background: active ? 'var(--brand-market)' : 'white',
                    color: active ? 'white' : 'var(--brand-market-deep)',
                    border: `1px solid ${active ? 'var(--brand-market)' : 'rgba(21,128,61,0.25)'}`,
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section label="Category">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {HOME_GOODS_CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  style={{
                    padding: '7px 12px',
                    background: active ? 'var(--brand-market)' : 'white',
                    color: active ? 'white' : 'var(--brand-market-deep)',
                    border: `1px solid ${active ? 'var(--brand-market)' : 'rgba(21,128,61,0.25)'}`,
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {c.emoji} {c.label}
                </button>
              );
            })}
          </div>
        </Section>

        <Section label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
            rows={4}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical', minHeight: 110 }}
          />
        </Section>

        <Section label="Location">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value.slice(0, 60))}
              placeholder="City"
              style={inputStyle}
            />
            <input
              type="text"
              value={stateField}
              onChange={(e) => setStateField(e.target.value.slice(0, 40))}
              placeholder="State"
              style={inputStyle}
            />
          </div>
        </Section>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: 16,
            background: saving ? 'rgba(21,128,61,0.4)' : 'linear-gradient(135deg, var(--brand-market), var(--brand-market-light))',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            fontSize: 16,
            fontWeight: 900,
            cursor: saving ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 12px 28px rgba(21,128,61,0.4)',
            marginTop: 20,
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        color: 'var(--brand-market-text-mid)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function StatusChip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '11px 16px',
        background: active ? 'var(--brand-market)' : 'white',
        color: active ? 'white' : 'var(--brand-market-text-mid)',
        border: `1px solid ${active ? 'var(--brand-market)' : 'rgba(21,128,61,0.25)'}`,
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 800,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'white',
  border: '1px solid rgba(21,128,61,0.25)',
  borderRadius: 12,
  fontSize: 16,
  color: 'var(--brand-text-primary)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
