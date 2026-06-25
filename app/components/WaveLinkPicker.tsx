'use client';
// WaveLinkPicker — optional "Link this video to..." picker shown on the
// Wave create page. Lets the creator attach ONE of their own:
//   - Mi Home Goods listings  (active only)
//   - Business profile        (if they've published one)
//
// We render the result as a chip on the Wave feed that deep-links to the
// entity, giving creators a way to turn a video into an actual call to
// action (shop my listing, visit my business).

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type WaveLink =
  | { kind: 'none' }
  | { kind: 'listing'; id: string; title: string }
  | { kind: 'business'; id: string; name: string };

interface ListingOpt {
  id: string;
  title: string;
  status: string;
}
interface BusinessOpt {
  id: string;
  business_name: string;
}

interface Props {
  userId: string;
  value: WaveLink;
  onChange: (v: WaveLink) => void;
}

export function WaveLinkPicker({ userId, value, onChange }: Props) {
  const [listings, setListings] = useState<ListingOpt[]>([]);
  const [business, setBusiness] = useState<BusinessOpt | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Pull this user's active Mi Home Goods listings + their business.
      const [listingsRes, bizRes] = await Promise.all([
        supabase
          .from('home_goods_listings')
          .select('id, title, status')
          .eq('seller_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('business_profiles')
          .select('id, business_name')
          .eq('user_id', userId)
          .eq('is_published', true)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setListings((listingsRes.data ?? []) as ListingOpt[]);
      setBusiness((bizRes.data ?? null) as BusinessOpt | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const hasAnything = useMemo(
    () => listings.length > 0 || !!business,
    [listings, business],
  );

  if (loading || !hasAnything) return null;

  // Render: a single soft pill row that expands into a small picker.
  const summary =
    value.kind === 'listing'
      ? `🏡 ${value.title}`
      : value.kind === 'business'
        ? `🏪 ${value.name}`
        : 'Link to a listing or your business (optional)';

  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(200,149,108,0.22)',
      borderRadius: 14,
      padding: 12,
      marginBottom: 14,
    }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 4px',
          background: 'transparent',
          border: 'none',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 700,
          color: value.kind === 'none' ? 'var(--brand-personal-text-mid)' : 'var(--brand-text-primary)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {summary}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--brand-personal-text-light)' }}>
          {expanded ? '▴' : '▾'}
        </span>
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <PickerRow
            label="No link"
            active={value.kind === 'none'}
            onClick={() => { onChange({ kind: 'none' }); setExpanded(false); }}
          />
          {business && (
            <PickerRow
              label={`🏪 ${business.business_name}`}
              tone="business"
              active={value.kind === 'business' && value.id === business.id}
              onClick={() => {
                onChange({ kind: 'business', id: business.id, name: business.business_name });
                setExpanded(false);
              }}
            />
          )}
          {listings.map((l) => (
            <PickerRow
              key={l.id}
              label={`🏡 ${l.title}`}
              tone="market"
              active={value.kind === 'listing' && value.id === l.id}
              onClick={() => {
                onChange({ kind: 'listing', id: l.id, title: l.title });
                setExpanded(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PickerRow({
  label, active, onClick, tone = 'neutral',
}: {
  label: string; active: boolean; onClick: () => void;
  tone?: 'neutral' | 'business' | 'market';
}) {
  const activeBg =
    tone === 'business' ? 'rgba(139,92,246,0.12)'
    : tone === 'market' ? 'rgba(21,128,61,0.12)'
    : 'rgba(200,149,108,0.12)';
  const activeBorder =
    tone === 'business' ? 'rgba(139,92,246,0.4)'
    : tone === 'market' ? 'rgba(21,128,61,0.4)'
    : 'rgba(200,149,108,0.4)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '10px 12px',
        borderRadius: 12,
        border: `1px solid ${active ? activeBorder : 'rgba(200,149,108,0.18)'}`,
        background: active ? activeBg : '#fdfbf6',
        color: 'var(--brand-text-primary)',
        fontSize: 14,
        fontWeight: active ? 800 : 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </button>
  );
}
