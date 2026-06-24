'use client';
// Pet Editor — embedded inside /edit-profile.
//
// Lets users declare they have pets, then add/edit/remove an unbounded
// list of pet profiles. Each pet has a photo, name, type, birthday,
// favorite activity, favorite food, 200-char bio, and an outer-ring
// tag color (default gold). Loads/saves to the pet_profiles table.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import {
  PET_TYPES,
  TAG_COLORS,
  DEFAULT_TAG_COLOR,
  PET_BIO_MAX,
} from '../lib/petConstants';

interface PetForm {
  id?: string;          // present once persisted
  name: string;
  pet_type: string;
  birthday: string;     // yyyy-mm-dd
  fav_activity: string;
  fav_food: string;
  bio: string;
  photo_url: string | null;
  tag_color: string;
}

const emptyPet = (): PetForm => ({
  name: '',
  pet_type: 'dog',
  birthday: '',
  fav_activity: '',
  fav_food: '',
  bio: '',
  photo_url: null,
  tag_color: DEFAULT_TAG_COLOR,
});

interface Props {
  userId: string;
}

export function PetEditor({ userId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pets, setPets] = useState<PetForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  // Pet IDs that were on the server when we loaded; we delete any that
  // are no longer present in `pets` on save.
  const initialIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('pet_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      if (data && data.length > 0) {
        setPets(data.map((p: any) => ({
          id: p.id,
          name: p.name ?? '',
          pet_type: p.pet_type ?? 'dog',
          birthday: p.birthday ?? '',
          fav_activity: p.fav_activity ?? '',
          fav_food: p.fav_food ?? '',
          bio: p.bio ?? '',
          photo_url: p.photo_url ?? null,
          tag_color: p.tag_color ?? DEFAULT_TAG_COLOR,
        })));
        initialIdsRef.current = new Set(data.map((p: any) => p.id));
        setEnabled(true);
      }
      setLoaded(true);
    })();
  }, [userId]);

  function update(i: number, patch: Partial<PetForm>) {
    setPets((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    setPets((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addAnother() {
    setPets((prev) => [...prev, emptyPet()]);
  }

  async function uploadPhoto(i: number, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5 MB');
      return;
    }
    setUploadingIndex(i);
    try {
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${userId}/pet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('pet-photos')
        .upload(path, file, { upsert: false });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path);
      update(i, { photo_url: data.publicUrl });
    } finally {
      setUploadingIndex(null);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      // Delete pets that are no longer in the list.
      const surviving = new Set(pets.filter((p) => p.id).map((p) => p.id!));
      const toDelete: string[] = [];
      initialIdsRef.current.forEach((id) => {
        if (!surviving.has(id)) toDelete.push(id);
      });
      if (toDelete.length > 0) {
        await supabase.from('pet_profiles').delete().in('id', toDelete);
      }

      // If the toggle was turned off, wipe the whole list and stop.
      if (!enabled) {
        const allIds = Array.from(initialIdsRef.current);
        if (allIds.length > 0) {
          await supabase.from('pet_profiles').delete().in('id', allIds);
        }
        setPets([]);
        initialIdsRef.current = new Set();
        toast.success('Pet profile cleared');
        return;
      }

      // Drop unnamed pets (treat as not-yet-filled).
      const usable = pets.filter((p) => p.name.trim().length > 0);
      if (usable.length === 0) {
        toast.info('Add at least one pet, or turn the toggle off.');
        return;
      }

      // Upsert each pet in order.
      const rows = usable.map((p, idx) => ({
        id: p.id, // null on new — Postgres will generate
        user_id: userId,
        name: p.name.trim().slice(0, 60),
        pet_type: p.pet_type || null,
        birthday: p.birthday || null,
        fav_activity: p.fav_activity.trim().slice(0, 80) || null,
        fav_food:     p.fav_food.trim().slice(0, 80) || null,
        bio:          p.bio.trim().slice(0, PET_BIO_MAX) || null,
        photo_url:    p.photo_url,
        tag_color:    p.tag_color || DEFAULT_TAG_COLOR,
        display_order: idx,
      })).map((row) => {
        // Drop id if undefined so insert generates one.
        if (!row.id) {
          const { id, ...rest } = row;
          return rest;
        }
        return row;
      });

      const { data, error } = await supabase
        .from('pet_profiles')
        .upsert(rows as any, { onConflict: 'id' })
        .select('id');
      if (error) {
        console.error('[pet-editor] save error:', error);
        toast.error(error.message);
        return;
      }
      if (data) {
        initialIdsRef.current = new Set(data.map((r: any) => r.id));
        // Update local state with the new IDs.
        setPets((prev) => prev.map((p, idx) => ({ ...p, id: data[idx]?.id ?? p.id })));
      }
      toast.success('Pet profile saved');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '18px 22px',
          background: enabled
            ? 'linear-gradient(135deg, #fff3ec 0%, #ffe1c8 100%)'
            : 'white',
          borderRadius: 20,
          border: enabled ? '1px solid rgba(200,149,108,0.4)' : '1px solid rgba(200,149,108,0.18)',
          marginBottom: enabled ? 18 : 0,
          boxShadow: enabled ? '0 6px 18px rgba(200,149,108,0.15)' : 'none',
        }}
      >
        <span style={{ fontSize: 28 }}>🐾</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1208' }}>
            Got a pet?
          </div>
          <div style={{ fontSize: 13, color: '#7a6a4f', lineHeight: 1.4, marginTop: 2 }}>
            Add your pet and visitors can tap to see your pet&rsquo;s profile.
          </div>
        </div>
        <label style={switchWrap}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              const on = e.target.checked;
              setEnabled(on);
              if (on && pets.length === 0) setPets([emptyPet()]);
            }}
            style={{ display: 'none' }}
          />
          <span style={switchTrack(enabled)}>
            <span style={switchThumb(enabled)} />
          </span>
        </label>
      </div>

      {enabled && (
        <>
          {pets.map((p, i) => (
            <div
              key={p.id ?? `new-${i}`}
              style={{
                background: 'white',
                border: '1px solid rgba(200,149,108,0.25)',
                borderRadius: 20,
                padding: 18,
                marginBottom: 14,
                boxShadow: '0 4px 14px rgba(200,149,108,0.06)',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#a08a6a', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  Pet {i + 1}
                </div>
                {pets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    style={{
                      padding: '6px 12px',
                      background: '#fff0f0',
                      border: '1px solid rgba(220,100,100,0.25)',
                      borderRadius: 100,
                      color: '#c07070',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Photo + name row */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 96, height: 96, borderRadius: '50%',
                    border: '3px solid rgba(200,149,108,0.4)',
                    background: p.photo_url ? `url(${p.photo_url}) center / cover` : 'rgba(200,149,108,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, color: 'rgba(200,149,108,0.7)',
                  }}>
                    {!p.photo_url && '🐾'}
                  </div>
                  <label style={uploadPill}>
                    {uploadingIndex === i ? '…' : (p.photo_url ? 'Change' : 'Photo')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadPhoto(i, f);
                        e.target.value = '';
                      }}
                      disabled={uploadingIndex === i}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Field label="Pet's name *">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="e.g. Biscuit"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={p.pet_type}
                      onChange={(e) => update(i, { pet_type: e.target.value })}
                      style={inputStyle}
                    >
                      {PET_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* Birthday + activities */}
              <Grid>
                <Field label="Birthday">
                  <input
                    type="date"
                    value={p.birthday}
                    onChange={(e) => update(i, { birthday: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Favorite activity">
                  <input
                    type="text"
                    value={p.fav_activity}
                    onChange={(e) => update(i, { fav_activity: e.target.value })}
                    placeholder="e.g. Fetch at the park"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Favorite food">
                  <input
                    type="text"
                    value={p.fav_food}
                    onChange={(e) => update(i, { fav_food: e.target.value })}
                    placeholder="e.g. Salmon kibble"
                    style={inputStyle}
                  />
                </Field>
              </Grid>

              {/* Bio */}
              <Field label={`Short bio (max ${PET_BIO_MAX} chars)`}>
                <textarea
                  value={p.bio}
                  onChange={(e) => update(i, { bio: e.target.value.slice(0, PET_BIO_MAX) })}
                  rows={3}
                  placeholder="A line or two about your pet."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
                />
                <div style={{ fontSize: 11, color: '#a08a6a', textAlign: 'right', marginTop: 4 }}>
                  {p.bio.length}/{PET_BIO_MAX}
                </div>
              </Field>

              {/* Tag color swatches */}
              <div style={{ marginTop: 6 }}>
                <div style={fieldLabel}>Tag outer ring color</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TAG_COLORS.map((c) => {
                    const selected = c.key === p.tag_color;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => update(i, { tag_color: c.key })}
                        aria-label={`${c.label} tag`}
                        title={c.label}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${c.light}, ${c.dark})`,
                          border: selected ? '3px solid #1a1208' : '2px solid rgba(0,0,0,0.15)',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: selected ? '0 0 0 3px rgba(200,149,108,0.35)' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <button
              type="button"
              onClick={addAnother}
              style={{
                padding: '10px 18px',
                background: 'rgba(200,149,108,0.1)',
                color: '#8a6240',
                border: '1px dashed rgba(200,149,108,0.45)',
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              + Add another pet
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 22px',
                background: '#c8956c',
                color: 'white',
                border: 'none',
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 800,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
                fontFamily: 'inherit',
                boxShadow: '0 6px 18px rgba(200,149,108,0.32)',
              }}
            >
              {saving ? 'Saving…' : 'Save pet(s)'}
            </button>
          </div>
        </>
      )}

      {/* If they turned the toggle off but had pets, give one Save click
          so the clearing actually goes through to the database. */}
      {!enabled && initialIdsRef.current.size > 0 && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 12,
            padding: '10px 18px',
            background: '#fff0f0',
            color: '#c07070',
            border: '1px solid rgba(220,100,100,0.3)',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {saving ? 'Clearing…' : 'Confirm: remove my pet profile'}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 10,
    }}>{children}</div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: '#a08a6a',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid rgba(200,149,108,0.25)',
  background: '#fbf7f0',
  fontSize: 16,
  color: '#1a1208',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
const switchWrap: React.CSSProperties = {
  cursor: 'pointer',
  display: 'inline-block',
};
function switchTrack(on: boolean): React.CSSProperties {
  return {
    display: 'inline-block',
    width: 50,
    height: 28,
    borderRadius: 100,
    background: on ? '#c8956c' : 'rgba(160,138,106,0.3)',
    position: 'relative',
    transition: 'background 0.18s',
  };
}
function switchThumb(on: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: 3,
    left: on ? 25 : 3,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'white',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    transition: 'left 0.18s',
  };
}
const uploadPill: React.CSSProperties = {
  position: 'absolute',
  bottom: -6,
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '5px 12px',
  background: '#c8956c',
  color: 'white',
  borderRadius: 100,
  fontSize: 11,
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 12px rgba(200,149,108,0.5)',
};
