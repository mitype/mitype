'use client';
// /business/[username] — public business profile view.
//
// Auth required (logged-in Mitype members only). Renders the owner's
// business profile: logo, services, contact (tap-to-call/email/map),
// social links, and upcoming events. Includes a Save button (toggles
// a row in business_saves), a "View owner profile" link to the
// personal /profile/[username], and a Message button that opens the
// messaging center with the owner.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../../lib/toast';
import { SiteNav } from '../../components/SiteNav';

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  category: string | null;
  logo_url: string | null;
  about_services: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  hide_address: boolean;
  is_online_only: boolean;
  online_label: string | null;
  social_links: Record<string, string>;
  is_published: boolean;
}

interface BusinessEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location_name: string | null;
  location_address: string | null;
}

export default function BusinessProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = React.use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [biz, setBiz] = useState<BusinessProfile | null>(null);
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  // Recommenders — the (up to 6) most recent Mitype members who added
  // this business to their profile recommendations, plus the total count.
  const [recommenders, setRecommenders] = useState<{
    user_id: string;
    username: string;
    avatar_url: string | null;
  }[]>([]);
  const [recommenderCount, setRecommenderCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        router.push('/login');
        return;
      }
      setUser(u);

      // Resolve username to user_id
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      if (!ownerProfile) {
        toast.error('Business not found');
        router.push('/discover');
        return;
      }

      const { data: bizRow } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', ownerProfile.user_id)
        .eq('is_published', true)
        .maybeSingle();

      if (!bizRow) {
        toast.error('This member doesn\'t have a business profile yet.');
        router.push(`/profile/${username}`);
        return;
      }
      setBiz(bizRow as BusinessProfile);

      const { data: evRows } = await supabase
        .from('business_events')
        .select('*')
        .eq('business_id', bizRow.id)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });
      setEvents((evRows ?? []) as BusinessEvent[]);

      const { data: saveRow } = await supabase
        .from('business_saves')
        .select('id')
        .eq('user_id', u.id)
        .eq('business_id', bizRow.id)
        .maybeSingle();
      setSaved(Boolean(saveRow));

      // Recommenders — recent + count. Two cheap queries.
      try {
        const { count } = await supabase
          .from('business_recommendations')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', bizRow.id);
        setRecommenderCount(count ?? 0);
        if ((count ?? 0) > 0) {
          const { data: recentRecs } = await supabase
            .from('business_recommendations')
            .select('user_id, created_at')
            .eq('business_id', bizRow.id)
            .order('created_at', { ascending: false })
            .limit(6);
          const userIds = (recentRecs ?? []).map((r: any) => r.user_id);
          if (userIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('user_id, username, avatar_url')
              .in('user_id', userIds);
            const profMap = new Map<string, any>(
              (profs ?? []).map((p: any) => [p.user_id, p])
            );
            setRecommenders(
              userIds
                .map((id: string) => profMap.get(id))
                .filter(Boolean)
                .map((p: any) => ({
                  user_id: p.user_id,
                  username: p.username,
                  avatar_url: p.avatar_url,
                }))
            );
          }
        }
      } catch {
        /* Non-fatal. */
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function toggleSave() {
    if (!user || !biz) return;
    if (saved) {
      await supabase
        .from('business_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('business_id', biz.id);
      setSaved(false);
      toast.success('Removed from your saves');
    } else {
      const { error } = await supabase
        .from('business_saves')
        .insert({ user_id: user.id, business_id: biz.id });
      if (error) {
        toast.error('Could not save');
        return;
      }
      setSaved(true);
      toast.success('Saved — find it in Messages → Small Business Saves');
    }
  }

  async function messageOwner() {
    if (!user || !biz) return;
    if (biz.user_id === user.id) {
      router.push('/messages');
      return;
    }
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, biz.user_id])
        .maybeSingle();
      if (!existing) {
        await supabase.from('conversations').insert({
          participant_ids: [user.id, biz.user_id],
          initiated_by: user.id,
          status: 'pending',
        });
      }
    } catch {
      // Non-fatal.
    }
    router.push(`/messages?user=${encodeURIComponent(biz.user_id)}`);
  }

  if (loading || !biz) {
    return (
      <main style={{ minHeight: '100vh', background: '#f5f0e8', padding: 40, textAlign: 'center' }}>
        Loading…
      </main>
    );
  }

  const fullAddress = [
    biz.hide_address ? null : biz.address_line,
    biz.city,
    biz.state,
    biz.zip_code,
  ].filter(Boolean).join(', ');

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f6f3fb 0%, #ebe5f5 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav
        userId={user?.id}
        showBack
        backFallbackHref="/discover"
        accent="purple"
        brandSuffix=" · business"
      />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header card */}
        <div style={{
          background: 'white',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 28,
          padding: 28,
          marginBottom: 20,
          boxShadow: '0 14px 38px rgba(139,92,246,0.1)',
        }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{
              width: 84, height: 84, borderRadius: 18,
              background: biz.logo_url ? `url(${biz.logo_url})` : 'linear-gradient(135deg, #8b5cf6, #c084fc)',
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, color: 'white', flexShrink: 0,
              boxShadow: '0 6px 18px rgba(139,92,246,0.25)',
            }}>
              {!biz.logo_url && '🏪'}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1a1208', letterSpacing: '-0.6px', margin: 0 }}>
                {biz.business_name}
              </h1>
              {biz.category && (
                <div style={{
                  display: 'inline-block', marginTop: 8,
                  padding: '5px 12px',
                  background: 'rgba(139,92,246,0.12)',
                  color: '#5b21b6',
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {biz.category}
                </div>
              )}
              {biz.is_online_only ? (
                biz.website ? (
                  <a
                    href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 10,
                      padding: '6px 14px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
                      color: 'white',
                      borderRadius: 100,
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: 'none',
                      boxShadow: '0 6px 18px rgba(139,92,246,0.35)',
                    }}
                  >
                    🌐 {biz.online_label ?? 'Online Business'}
                    <span aria-hidden="true" style={{ marginLeft: 4 }}>→</span>
                  </a>
                ) : (
                  <div style={{
                    display: 'inline-block',
                    marginTop: 10,
                    padding: '6px 14px',
                    background: 'rgba(139,92,246,0.12)',
                    color: '#5b21b6',
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 800,
                  }}>
                    🌐 {biz.online_label ?? 'Online Business'}
                  </div>
                )
              ) : fullAddress ? (
                <div style={{ color: '#5b4a6e', fontSize: 13, marginTop: 8 }}>
                  📍 {fullAddress}
                </div>
              ) : null}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <button
              onClick={messageOwner}
              style={primaryBtn}
            >
              💬 Message
            </button>
            <button
              onClick={toggleSave}
              style={saved ? savedBtn : secondaryBtn}
            >
              {saved ? '✓ Saved' : '☆ Save'}
            </button>
            <Link href={`/profile/${username}`} style={ghostBtn}>
              ▶ View owner&apos;s profile
            </Link>
          </div>
        </div>

        {/* About / services */}
        {biz.about_services && (
          <Card>
            <SectionLabel>About</SectionLabel>
            <p style={{ color: '#3a2e4d', fontSize: 15, lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
              {biz.about_services}
            </p>
          </Card>
        )}

        {/* Contact */}
        {(biz.phone || biz.email || biz.website) && (
          <Card>
            <SectionLabel>Contact</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {biz.phone && (
                <a href={`tel:${biz.phone}`} style={contactRow}>📞 {biz.phone}</a>
              )}
              {biz.email && (
                <a href={`mailto:${biz.email}`} style={contactRow}>✉️ {biz.email}</a>
              )}
              {biz.website && (
                <a href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`} target="_blank" rel="noreferrer noopener" style={contactRow}>
                  🌐 {biz.website}
                </a>
              )}
              {!biz.is_online_only && fullAddress && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noreferrer noopener" style={contactRow}>
                  🗺️ Open in Maps
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Social */}
        {biz.social_links && Object.values(biz.social_links).some((v) => v) && (
          <Card>
            <SectionLabel>Social</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {biz.social_links.instagram && <SocialLink label="Instagram" value={biz.social_links.instagram} icon="📷" />}
              {biz.social_links.facebook && <SocialLink label="Facebook" value={biz.social_links.facebook} icon="📘" />}
              {biz.social_links.tiktok && <SocialLink label="TikTok" value={biz.social_links.tiktok} icon="🎵" />}
            </div>
          </Card>
        )}

        {/* Recommenders — social proof. Shows the count badge plus
            up to 6 recent recommender avatars. */}
        {recommenderCount > 0 && (
          <Card>
            <SectionLabel>Recommended by {recommenderCount} {recommenderCount === 1 ? 'member' : 'members'}</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {recommenders.map((r, i) => (
                  <Link
                    key={r.user_id}
                    href={`/profile/${r.username}`}
                    aria-label={`@${r.username}'s profile`}
                    title={`@${r.username}`}
                    style={{
                      width: 38, height: 38,
                      borderRadius: '50%',
                      background: r.avatar_url
                        ? `url(${r.avatar_url}) center / cover`
                        : 'linear-gradient(135deg, #8b5cf6, #c084fc)',
                      border: '2px solid white',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: 'white',
                      marginLeft: i === 0 ? 0 : -10,
                      textDecoration: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {!r.avatar_url && '👤'}
                  </Link>
                ))}
              </div>
              {recommenderCount > recommenders.length && (
                <span style={{ fontSize: 13, color: '#7a6a85', fontWeight: 700 }}>
                  + {recommenderCount - recommenders.length} more
                </span>
              )}
            </div>
          </Card>
        )}

        {/* Events */}
        {events.length > 0 && (
          <Card>
            <SectionLabel>Upcoming events</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map((ev) => (
                <div key={ev.id} style={{
                  background: '#fbfaff',
                  border: '1px solid rgba(139,92,246,0.18)',
                  borderRadius: 16,
                  padding: 14,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {formatEventDate(ev.event_date)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1208', marginTop: 4 }}>
                    {ev.title}
                  </div>
                  {ev.description && (
                    <div style={{ fontSize: 13, color: '#5b4a6e', lineHeight: 1.5, marginTop: 6 }}>
                      {ev.description}
                    </div>
                  )}
                  {(ev.location_name || ev.location_address) && (
                    <div style={{ fontSize: 12, color: '#7a6a85', marginTop: 8 }}>
                      📍 {[ev.location_name, ev.location_address].filter(Boolean).join(' — ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(139,92,246,0.18)',
      borderRadius: 22,
      padding: 22,
      marginBottom: 16,
      boxShadow: '0 6px 22px rgba(139,92,246,0.06)',
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 800,
      color: '#7a6a85',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function SocialLink({ label, value, icon }: { label: string; value: string; icon: string }) {
  const href = value.startsWith('http') ? value : `https://${value.replace(/^@/, '')}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      style={{
        padding: '8px 14px',
        background: 'rgba(139,92,246,0.1)',
        color: '#5b21b6',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: 100,
        fontSize: 13,
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      {icon} {label}
    </a>
  );
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 20px',
  background: '#8b5cf6',
  color: 'white',
  border: 'none',
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 6px 18px rgba(139,92,246,0.32)',
};
const secondaryBtn: React.CSSProperties = {
  padding: '10px 20px',
  background: 'white',
  color: '#5b21b6',
  border: '1px solid rgba(139,92,246,0.35)',
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const savedBtn: React.CSSProperties = {
  ...secondaryBtn,
  background: 'rgba(139,92,246,0.12)',
  borderColor: 'rgba(139,92,246,0.5)',
};
const ghostBtn: React.CSSProperties = {
  padding: '10px 20px',
  background: 'transparent',
  color: '#5b21b6',
  border: '1px solid rgba(139,92,246,0.25)',
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
const contactRow: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 0',
  color: '#3a2e4d',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
};
