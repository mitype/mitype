'use client';
// "Small Businesses I Recommend" editor on /edit-profile.
//
// Quality gate: the picker only lists businesses the user has SAVED
// (rows in business_saves). This makes every recommendation feel
// genuine — they had to commit to saving it first.
//
// Cap: 10 recommendations per user (enforced server-side by trigger).

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

interface SavedBusiness {
  id: string;
  business_name: string;
  category: string | null;
  logo_url: string | null;
}

interface Recommendation {
  id: string;
  business_id: string;
  business: SavedBusiness | null;
  display_order: number;
}

const MAX_RECOMMENDATIONS = 10;

export function BusinessRecommendationsEditor({ userId }: { userId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<SavedBusiness[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  useEffect(() => {
    (async () => {
      // Load saved businesses → picker source
      const { data: saveRows } = await supabase
        .from('business_saves')
        .select('business_id, business_profiles(id, business_name, category, logo_url, is_published)')
        .eq('user_id', userId);
      if (saveRows) {
        setSaved(
          saveRows
            .map((s: any) => s.business_profiles)
            .filter((b: any) => b && b.is_published)
            .map((b: any) => ({
              id: b.id,
              business_name: b.business_name,
              category: b.category,
              logo_url: b.logo_url,
            }))
        );
      }

      // Load existing recommendations
      const { data: recRows } = await supabase
        .from('business_recommendations')
        .select('id, business_id, display_order, business_profiles(id, business_name, category, logo_url)')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      if (recRows) {
        setRecs(
          recRows.map((r: any) => ({
            id: r.id,
            business_id: r.business_id,
            display_order: r.display_order,
            business: r.business_profiles
              ? {
                  id: r.business_profiles.id,
                  business_name: r.business_profiles.business_name,
                  category: r.business_profiles.category,
                  logo_url: r.business_profiles.logo_url,
                }
              : null,
          }))
        );
      }

      setLoaded(true);
    })();
  }, [userId]);

  async function addRecommendation(business: SavedBusiness) {
    if (recs.length >= MAX_RECOMMENDATIONS) {
      toast.info(`You can recommend up to ${MAX_RECOMMENDATIONS} businesses.`);
      return;
    }
    if (recs.some((r) => r.business_id === business.id)) {
      toast.info('Already on your list.');
      return;
    }
    const nextOrder = recs.length;
    const { data, error } = await supabase
      .from('business_recommendations')
      .insert({ user_id: userId, business_id: business.id, display_order: nextOrder })
      .select('id, business_id, display_order')
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      setRecs((prev) => [
        ...prev,
        { id: data.id, business_id: data.business_id, display_order: data.display_order, business },
      ]);
      toast.success(`Recommended ${business.business_name}!`);
      setShowPicker(false);
      setPickerQuery('');
    }
  }

  async function removeRecommendation(rec: Recommendation) {
    const { error } = await supabase
      .from('business_recommendations')
      .delete()
      .eq('id', rec.id);
    if (error) {
      toast.error('Could not remove.');
      return;
    }
    setRecs((prev) => prev.filter((r) => r.id !== rec.id));
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= recs.length) return;
    const next = [...recs];
    [next[index], next[target]] = [next[target], next[index]];
    // Re-number display_order
    next.forEach((r, i) => { r.display_order = i; });
    setRecs(next);
    // Persist new order
    const updates = next.map((r) =>
      supabase.from('business_recommendations').update({ display_order: r.display_order }).eq('id', r.id)
    );
    await Promise.all(updates);
  }

  if (!loaded) return null;

  const availableToAdd = saved.filter((b) => !recs.some((r) => r.business_id === b.id));
  const filteredPicker = pickerQuery.trim()
    ? availableToAdd.filter((b) =>
        b.business_name.toLowerCase().includes(pickerQuery.toLowerCase()) ||
        (b.category ?? '').toLowerCase().includes(pickerQuery.toLowerCase())
      )
    : availableToAdd;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        background: 'linear-gradient(135deg, #f6f3fb 0%, #ebe5f5 100%)',
        border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: 20,
        padding: '18px 22px',
        marginBottom: recs.length > 0 ? 16 : 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>🏪</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1208' }}>
              Small Businesses I Recommend
            </div>
            <div style={{ fontSize: 13, color: '#5b4a6e', lineHeight: 1.4, marginTop: 2 }}>
              Recommend up to {MAX_RECOMMENDATIONS} businesses to feature on your profile.
              You can only recommend businesses you&rsquo;ve saved first.
            </div>
          </div>
        </div>
      </div>

      {recs.length === 0 && (
        <p style={{ color: '#7a6a85', fontSize: 13, fontStyle: 'italic', marginBottom: 14 }}>
          No recommendations yet.
        </p>
      )}

      {recs.map((rec, i) => (
        <div
          key={rec.id}
          style={{
            background: 'white',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 16,
            padding: 12,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: rec.business?.logo_url
              ? `url(${rec.business.logo_url}) center / cover`
              : 'linear-gradient(135deg, #8b5cf6, #c084fc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'white',
          }}>
            {!rec.business?.logo_url && '🏪'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 800, color: '#1a1208',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {rec.business?.business_name ?? '(removed)'}
            </div>
            {rec.business?.category && (
              <div style={{ fontSize: 11, color: '#7a6a85' }}>{rec.business.category}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label="Move up"
              style={iconBtn(i === 0)}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === recs.length - 1}
              aria-label="Move down"
              style={iconBtn(i === recs.length - 1)}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeRecommendation(rec)}
              style={{
                ...iconBtn(false),
                background: '#fff0f0',
                color: '#c07070',
                border: '1px solid rgba(220,100,100,0.25)',
              }}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setShowPicker(true)}
        disabled={recs.length >= MAX_RECOMMENDATIONS || saved.length === 0}
        style={{
          padding: '10px 18px',
          marginTop: 6,
          background: recs.length >= MAX_RECOMMENDATIONS || saved.length === 0
            ? 'rgba(139,92,246,0.1)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
          color: recs.length >= MAX_RECOMMENDATIONS || saved.length === 0 ? '#7a6a85' : 'white',
          border: 'none',
          borderRadius: 100,
          fontSize: 13,
          fontWeight: 800,
          cursor: recs.length >= MAX_RECOMMENDATIONS || saved.length === 0 ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: recs.length >= MAX_RECOMMENDATIONS || saved.length === 0
            ? 'none'
            : '0 6px 18px rgba(139,92,246,0.32)',
        }}
      >
        {saved.length === 0
          ? 'Save a business first to recommend it'
          : recs.length >= MAX_RECOMMENDATIONS
            ? `Maximum ${MAX_RECOMMENDATIONS} reached`
            : '+ Add a recommendation'}
      </button>

      {showPicker && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPicker(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 22,
              maxWidth: 460, width: '100%',
              padding: 20,
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1a1208' }}>
                Recommend a saved business
              </h3>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                aria-label="Close"
                style={{
                  background: 'rgba(0,0,0,0.06)',
                  border: 'none',
                  width: 30, height: 30,
                  borderRadius: '50%',
                  color: '#1a1208',
                  fontSize: 16,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search saved businesses…"
              style={{
                width: '100%',
                padding: '11px 14px',
                marginBottom: 12,
                borderRadius: 12,
                border: '1px solid rgba(139,92,246,0.25)',
                background: '#fbfaff',
                fontSize: 14,
                outline: 'none',
                color: '#1a1208',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredPicker.length === 0 ? (
                <p style={{ color: '#7a6a85', fontSize: 13, textAlign: 'center', padding: '24px 8px' }}>
                  {availableToAdd.length === 0
                    ? "You've already recommended every business you've saved."
                    : 'No matches.'}
                </p>
              ) : (
                filteredPicker.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => addRecommendation(b)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%',
                      padding: 10,
                      background: 'transparent',
                      border: '1px solid transparent',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: b.logo_url
                        ? `url(${b.logo_url}) center / cover`
                        : 'linear-gradient(135deg, #8b5cf6, #c084fc)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: 'white',
                    }}>
                      {!b.logo_url && '🏪'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1208' }}>
                        {b.business_name}
                      </div>
                      {b.category && (
                        <div style={{ fontSize: 12, color: '#7a6a85' }}>{b.category}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#5b21b6' }}>+</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 32, height: 32,
    background: disabled ? '#f5f5f5' : '#fbfaff',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 10,
    color: disabled ? '#cbb9a4' : '#5b21b6',
    fontSize: 14, fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  };
}
