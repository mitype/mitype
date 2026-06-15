'use client';
// /edit-business-profile — owner-facing editor for a small business
// profile. Optional for every user; if they don't fill anything in, no
// business profile exists for them and nothing public renders.
//
// Saves to `business_profiles` (one row per user) and manages an
// embedded list of `business_events` rows. Logo uploads land in the
// `business-logos` Supabase Storage bucket.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { BackButton } from '../components/BackButton';
import { BUSINESS_CATEGORIES } from '../lib/businessCategories';

interface BusinessEvent {
  id?: string;
  title: string;
  description: string;
  event_date: string; // ISO date-time string (datetime-local format)
  location_name: string;
  location_address: string;
}

export default function EditBusinessProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Business profile fields
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [aboutServices, setAboutServices] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [hideAddress, setHideAddress] = useState(false);
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Events
  const [events, setEvents] = useState<BusinessEvent[]>([]);

  // Track existing row id so we can update instead of insert.
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Load existing business profile if one exists.
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (biz) {
        setBusinessId(biz.id);
        setBusinessName(biz.business_name ?? '');
        setCategory(biz.category ?? '');
        setLogoUrl(biz.logo_url ?? null);
        setAboutServices(biz.about_services ?? '');
        setPhone(biz.phone ?? '');
        setEmail(biz.email ?? '');
        setWebsite(biz.website ?? '');
        setAddressLine(biz.address_line ?? '');
        setCity(biz.city ?? '');
        setState(biz.state ?? '');
        setZipCode(biz.zip_code ?? '');
        setHideAddress(Boolean(biz.hide_address));
        setIsPublished(biz.is_published !== false);
        const social = biz.social_links ?? {};
        setInstagram(social.instagram ?? '');
        setFacebook(social.facebook ?? '');
        setTiktok(social.tiktok ?? '');

        // Load events
        const { data: evRows } = await supabase
          .from('business_events')
          .select('*')
          .eq('business_id', biz.id)
          .order('event_date', { ascending: true });
        if (evRows) {
          setEvents(
            evRows.map((e: any) => ({
              id: e.id,
              title: e.title,
              description: e.description ?? '',
              event_date: toLocalDateTimeInput(e.event_date),
              location_name: e.location_name ?? '',
              location_address: e.location_address ?? '',
            }))
          );
        }
      } else {
        // Default zip from personal profile if available.
        const { data: profile } = await supabase
          .from('profiles')
          .select('zip_code')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profile?.zip_code) setZipCode(profile.zip_code);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogoUpload(file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5 MB');
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('business-logos')
        .upload(path, file, { upsert: false });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { data } = supabase.storage.from('business-logos').getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success('Logo uploaded');
    } finally {
      setUploading(false);
    }
  }

  function addEvent() {
    setEvents((prev) => [
      ...prev,
      {
        title: '',
        description: '',
        event_date: '',
        location_name: '',
        location_address: '',
      },
    ]);
  }

  function updateEvent(i: number, patch: Partial<BusinessEvent>) {
    setEvents((prev) => prev.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  }

  function removeEvent(i: number) {
    setEvents((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!user) return;
    if (!businessName.trim()) {
      toast.error('Please add a business name');
      return;
    }
    if (!category) {
      toast.error('Please pick a category');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        business_name: businessName.trim(),
        category,
        logo_url: logoUrl,
        about_services: aboutServices.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        address_line: addressLine.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip_code: zipCode.trim() || null,
        hide_address: hideAddress,
        social_links: {
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          tiktok: tiktok.trim(),
        },
        is_published: isPublished,
      };

      let savedId = businessId;
      if (savedId) {
        const { error } = await supabase
          .from('business_profiles')
          .update(payload)
          .eq('id', savedId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('business_profiles')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        savedId = data!.id;
        setBusinessId(savedId);
      }

      // Sync events: simplest approach — wipe and re-insert.
      if (savedId) {
        await supabase.from('business_events').delete().eq('business_id', savedId);
        const validEvents = events.filter(
          (e) => e.title.trim() && e.event_date
        );
        if (validEvents.length > 0) {
          const rows = validEvents.map((e) => ({
            business_id: savedId,
            user_id: user.id,
            title: e.title.trim(),
            description: e.description.trim() || null,
            event_date: new Date(e.event_date).toISOString(),
            location_name: e.location_name.trim() || null,
            location_address: e.location_address.trim() || null,
          }));
          const { error: evErr } = await supabase.from('business_events').insert(rows);
          if (evErr) throw evErr;
        }
      }

      toast.success('Business profile saved');
    } catch (err: any) {
      console.error('[edit-business-profile] save error:', err);
      toast.error(err.message ?? 'Could not save business profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f5f0e8', padding: 40, textAlign: 'center' }}>
        Loading…
      </main>
    );
  }

  const filteredCategories = categoryQuery
    ? BUSINESS_CATEGORIES.filter((c) => c.toLowerCase().includes(categoryQuery.toLowerCase()))
    : BUSINESS_CATEGORIES;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        paddingBottom: 80,
      }}
    >
      {/* Top nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', borderBottom: '1px solid rgba(139,92,246,0.18)',
        background: 'rgba(250,246,240,0.95)', backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BackButton fallbackHref="/edit-profile" />
          <Link href="/dashboard" style={{ fontSize: 22, fontWeight: 900, color: '#8b5cf6', letterSpacing: '-1px', textDecoration: 'none' }}>
            mitype<span style={{ color: '#1a1208' }}> · business</span>
          </Link>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 22px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 800,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
            fontFamily: 'inherit',
            boxShadow: '0 8px 24px rgba(139,92,246,0.32)',
          }}
        >
          {saving ? 'Saving…' : 'Save Business Profile'}
        </button>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1a1208', letterSpacing: '-0.6px', marginBottom: 8 }}>
          Your Business Profile
        </h1>
        <p style={{ color: '#7a6a85', fontSize: 15, marginBottom: 32, lineHeight: 1.5 }}>
          Optional. Fill this in if you run a small business and want to be discoverable
          by Mitype members in your area. Logged-in members in your zip code will see your
          profile in the Discover page&apos;s local-business tab.
        </p>

        {/* Published toggle */}
        <SectionCard>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: '#8b5cf6' }}
            />
            <div>
              <div style={{ fontWeight: 700, color: '#1a1208', fontSize: 15 }}>
                Show my business publicly
              </div>
              <div style={{ color: '#7a6a85', fontSize: 13, marginTop: 2 }}>
                Turn this off to save changes without going live.
              </div>
            </div>
          </label>
        </SectionCard>

        {/* Logo */}
        <SectionCard>
          <SectionLabel>Logo</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{
              width: 96, height: 96, borderRadius: 18,
              background: logoUrl ? `url(${logoUrl})` : 'rgba(139,92,246,0.08)',
              backgroundSize: 'cover', backgroundPosition: 'center',
              border: '2px solid rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: 'rgba(139,92,246,0.5)',
            }}>
              {!logoUrl && '🏪'}
            </div>
            <div>
              <label style={{
                display: 'inline-block',
                padding: '10px 18px',
                background: '#8b5cf6',
                color: 'white',
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 700,
                cursor: uploading ? 'wait' : 'pointer',
                opacity: uploading ? 0.7 : 1,
              }}>
                {uploading ? 'Uploading…' : (logoUrl ? 'Replace logo' : 'Upload logo')}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLogoUpload(f);
                    e.target.value = '';
                  }}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              <p style={{ color: '#7a6a85', fontSize: 12, marginTop: 8 }}>
                Square images look best. Max 5 MB.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Business name */}
        <SectionCard>
          <SectionLabel>Business name</SectionLabel>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Maria's Boutique"
            style={inputStyle}
          />
        </SectionCard>

        {/* Category */}
        <SectionCard>
          <SectionLabel>Business category</SectionLabel>
          <p style={{ color: '#7a6a85', fontSize: 13, margin: '0 0 12px' }}>
            Pick the one that fits your business best. This is how local Mitype
            members will find you in Discover.
          </p>
          {category && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: 12,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7a6a85', textTransform: 'uppercase', letterSpacing: '1px' }}>Selected</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#5b21b6', marginTop: 2 }}>{category}</div>
              </div>
              <button onClick={() => setCategory('')} style={clearButtonStyle}>Clear</button>
            </div>
          )}
          <input
            type="text"
            placeholder="Search categories…"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            style={inputStyle}
          />
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            maxHeight: 240, overflowY: 'auto', padding: 6, marginTop: 10,
            background: '#fbfaff', border: '1px solid rgba(139,92,246,0.15)',
            borderRadius: 12,
          }}>
            {filteredCategories.map((cat) => {
              const selected = cat === category;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    background: selected ? '#8b5cf6' : 'white',
                    border: `1px solid ${selected ? '#8b5cf6' : 'rgba(139,92,246,0.2)'}`,
                    color: selected ? 'white' : '#5b21b6',
                    padding: '6px 12px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* About / services */}
        <SectionCard>
          <SectionLabel>About / services</SectionLabel>
          <textarea
            value={aboutServices}
            onChange={(e) => setAboutServices(e.target.value)}
            placeholder="What do you do? Who do you serve? What makes your business yours?"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }}
          />
        </SectionCard>

        {/* Contact */}
        <SectionCard>
          <SectionLabel>Contact</SectionLabel>
          <FieldGrid>
            <Field label="Phone">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" style={inputStyle} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@yourbusiness.com" style={inputStyle} />
            </Field>
            <Field label="Website">
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" style={inputStyle} />
            </Field>
          </FieldGrid>
        </SectionCard>

        {/* Address */}
        <SectionCard>
          <SectionLabel>Address</SectionLabel>
          <FieldGrid>
            <Field label="Street">
              <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="123 Main St." style={inputStyle} />
            </Field>
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="State">
              <input value={state} onChange={(e) => setState(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="ZIP code">
              <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} style={inputStyle} />
            </Field>
          </FieldGrid>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideAddress} onChange={(e) => setHideAddress(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#8b5cf6' }} />
            <span style={{ fontSize: 13, color: '#3a2e4d' }}>
              Hide my street address publicly (only show city + state).
            </span>
          </label>
        </SectionCard>

        {/* Socials */}
        <SectionCard>
          <SectionLabel>Social</SectionLabel>
          <FieldGrid>
            <Field label="Instagram">
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@handle or full link" style={inputStyle} />
            </Field>
            <Field label="Facebook">
              <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="Page name or link" style={inputStyle} />
            </Field>
            <Field label="TikTok">
              <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@handle or full link" style={inputStyle} />
            </Field>
          </FieldGrid>
        </SectionCard>

        {/* Events */}
        <SectionCard>
          <SectionLabel>Upcoming events</SectionLabel>
          <p style={{ color: '#7a6a85', fontSize: 13, margin: '0 0 12px' }}>
            Add any upcoming events, classes, pop-ups, or specials.
            Past events automatically hide.
          </p>
          {events.length === 0 && (
            <p style={{ color: '#7a6a85', fontSize: 13, fontStyle: 'italic' }}>
              No events yet.
            </p>
          )}
          {events.map((ev, i) => (
            <div key={i} style={{
              background: '#fbfaff',
              border: '1px solid rgba(139,92,246,0.15)',
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
            }}>
              <FieldGrid>
                <Field label="Title">
                  <input value={ev.title} onChange={(e) => updateEvent(i, { title: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="When">
                  <input type="datetime-local" value={ev.event_date} onChange={(e) => updateEvent(i, { event_date: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Location name">
                  <input value={ev.location_name} onChange={(e) => updateEvent(i, { location_name: e.target.value })} placeholder="e.g. Studio B" style={inputStyle} />
                </Field>
                <Field label="Address">
                  <input value={ev.location_address} onChange={(e) => updateEvent(i, { location_address: e.target.value })} style={inputStyle} />
                </Field>
              </FieldGrid>
              <textarea
                placeholder="Short description (optional)"
                value={ev.description}
                onChange={(e) => updateEvent(i, { description: e.target.value })}
                rows={2}
                style={{ ...inputStyle, marginTop: 10, resize: 'vertical' }}
              />
              <button
                onClick={() => removeEvent(i)}
                style={{
                  marginTop: 10,
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid rgba(220,100,100,0.3)',
                  color: '#b91c1c',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 100,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Remove event
              </button>
            </div>
          ))}
          <button
            onClick={addEvent}
            style={{
              padding: '10px 18px',
              background: 'rgba(139,92,246,0.1)',
              color: '#5b21b6',
              border: '1px dashed rgba(139,92,246,0.45)',
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Add an event
          </button>
        </SectionCard>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '16px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            fontSize: 16,
            fontWeight: 800,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
            fontFamily: 'inherit',
            boxShadow: '0 12px 32px rgba(139,92,246,0.4)',
          }}
        >
          {saving ? 'Saving…' : 'Save Business Profile'}
        </button>
      </div>
    </main>
  );
}

// Convert ISO string into the `datetime-local` input value format,
// preserving the user's local time.
function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(139,92,246,0.18)',
      borderRadius: 20,
      padding: 20,
      marginBottom: 14,
      boxShadow: '0 4px 18px rgba(139,92,246,0.06)',
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12,
      fontWeight: 800,
      color: '#5b21b6',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 12,
    }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#7a6a85', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(139,92,246,0.22)',
  background: '#fbfaff',
  fontSize: 14,
  color: '#1a1208',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const clearButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#7a6a85',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
