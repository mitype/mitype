'use client';
// DiscoverSearch — universal search across People, Rooms, and
// Businesses. Lives at the top of Discover. When the input is empty
// the page renders its normal content; when there's a query, this
// component takes over the main column with tabbed results.
//
// Searches:
//   - profiles      → username + bio (ilike)
//   - conversations → title + description, filtered to kind='room' AND is_public=TRUE
//   - business_profiles → business_name + category
//
// Debounced 300ms so we're not hammering the DB on every keystroke.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { Avatar } from './Avatar';
import { roomCategoryEmoji, roomCategoryLabel } from '../lib/roomCategories';

type Tab = 'people' | 'rooms' | 'business';

interface ProfileHit {
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  categories: string[] | null;
}

interface RoomHit {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  participant_count: number;
}

interface BusinessHit {
  id: string;
  business_name: string;
  category: string | null;
  logo_url: string | null;
  owner_username: string | null;
}

interface Props {
  /** Render prop — when the search has an active query the page hides
   *  its normal content and shows the results panel below. The parent
   *  uses this to decide what to render. */
  onActiveChange?: (active: boolean) => void;
}

export function DiscoverSearch({ onActiveChange }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [tab, setTab] = useState<Tab>('people');
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<ProfileHit[]>([]);
  const [rooms, setRooms] = useState<RoomHit[]>([]);
  const [businesses, setBusinesses] = useState<BusinessHit[]>([]);
  const lastQuerySeq = useRef(0);

  // Debounce input → DB query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Inform parent so it can hide the normal Discover content while
  // a search is active.
  const active = debouncedQ.length > 0;
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Run the search whenever the debounced term changes
  useEffect(() => {
    if (!debouncedQ) {
      setPeople([]); setRooms([]); setBusinesses([]);
      return;
    }
    const seq = ++lastQuerySeq.current;
    setLoading(true);
    (async () => {
      const escaped = debouncedQ.replace(/[%_]/g, (m) => `\\${m}`);
      const pattern = `%${escaped}%`;
      const [profilesRes, roomsRes, businessRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, bio, avatar_url, categories')
          .or(`username.ilike.${pattern},bio.ilike.${pattern}`)
          .limit(24),
        supabase
          .from('conversations')
          .select('id, title, description, category, participant_ids')
          .eq('kind', 'room')
          .eq('is_public', true)
          .or(`title.ilike.${pattern},description.ilike.${pattern}`)
          .limit(24),
        supabase
          .from('business_profiles')
          .select('id, business_name, category, logo_url, user_id')
          .or(`business_name.ilike.${pattern},category.ilike.${pattern}`)
          .limit(24),
      ]);
      // Drop late responses to avoid race-condition flicker.
      if (seq !== lastQuerySeq.current) return;

      setPeople((profilesRes.data ?? []) as ProfileHit[]);
      const r: RoomHit[] = (roomsRes.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        participant_count: Array.isArray(row.participant_ids) ? row.participant_ids.length : 0,
      }));
      setRooms(r);

      // Resolve business owner usernames (one extra query, batched)
      const bizRows = businessRes.data ?? [];
      const ownerIds = Array.from(new Set(bizRows.map((b: any) => b.user_id).filter(Boolean)));
      let ownerMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: ownerProfiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', ownerIds);
        ownerMap = new Map(
          (ownerProfiles ?? []).map((p: any) => [p.user_id, p.username])
        );
      }
      setBusinesses(bizRows.map((b: any) => ({
        id: b.id,
        business_name: b.business_name,
        category: b.category,
        logo_url: b.logo_url,
        owner_username: ownerMap.get(b.user_id) ?? null,
      })));

      setLoading(false);
    })();
  }, [debouncedQ]);

  const tabCounts = useMemo(() => ({
    people: people.length,
    rooms: rooms.length,
    business: businesses.length,
  }), [people, rooms, businesses]);

  return (
    <div style={{ width: '100%' }}>
      {/* Search input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'white',
        border: '1px solid rgba(200,149,108,0.3)',
        borderRadius: 100,
        boxShadow: '0 4px 12px rgba(200,149,108,0.08)',
        marginBottom: active ? 14 : 24,
      }}>
        <span aria-hidden="true" style={{ fontSize: 16, color: '#a89278', lineHeight: 1 }}>🔍</span>
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 80))}
          placeholder="Search people, rooms, businesses…"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            // 16px keeps iOS Safari from zooming the page on focus.
            fontSize: 16,
            color: '#1a1208',
            fontFamily: 'inherit',
            minWidth: 0,
          }}
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            style={{
              width: 26, height: 26,
              border: 'none',
              borderRadius: '50%',
              background: 'rgba(200,149,108,0.12)',
              color: '#8a7560',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Results — only show when search is active */}
      {active && (
        <>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 6,
            marginBottom: 14,
            overflowX: 'auto',
            paddingBottom: 2,
          }}>
            <TabPill label="People" count={tabCounts.people} active={tab === 'people'} onClick={() => setTab('people')} />
            <TabPill label="Rooms" count={tabCounts.rooms} active={tab === 'rooms'} onClick={() => setTab('rooms')} />
            <TabPill label="Businesses" count={tabCounts.business} active={tab === 'business'} onClick={() => setTab('business')} />
          </div>

          {/* Result panel */}
          {loading ? (
            <SkeletonResults />
          ) : tab === 'people' ? (
            people.length === 0
              ? <EmptyState message={`No people match "${debouncedQ}".`} />
              : (
                <div style={resultGrid}>
                  {people.map((p) => <PersonCard key={p.user_id} hit={p} />)}
                </div>
              )
          ) : tab === 'rooms' ? (
            rooms.length === 0
              ? <EmptyState message={`No rooms match "${debouncedQ}".`} />
              : (
                <div style={resultGrid}>
                  {rooms.map((r) => <RoomCard key={r.id} hit={r} />)}
                </div>
              )
          ) : (
            businesses.length === 0
              ? <EmptyState message={`No businesses match "${debouncedQ}".`} />
              : (
                <div style={resultGrid}>
                  {businesses.map((b) => <BusinessCard key={b.id} hit={b} />)}
                </div>
              )
          )}
        </>
      )}
    </div>
  );
}

function TabPill({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        background: active ? '#c8956c' : 'white',
        color: active ? 'white' : '#6b4f33',
        border: `1px solid ${active ? '#c8956c' : 'rgba(200,149,108,0.3)'}`,
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 800,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : 'rgba(200,149,108,0.15)',
        color: active ? 'white' : '#8a5e2e',
        borderRadius: 100,
        padding: '0 6px',
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1.6,
      }}>
        {count}
      </span>
    </button>
  );
}

function PersonCard({ hit }: { hit: ProfileHit }) {
  return (
    <Link
      href={`/profile/${hit.username}`}
      style={{ ...cardStyle, textDecoration: 'none', color: 'inherit' }}
    >
      <Avatar src={hit.avatar_url} alt={`@${hit.username}`} width={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: '#1a1208',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          @{hit.username}
        </div>
        {hit.bio && (
          <div style={{
            fontSize: 12, color: '#7a6a4f',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {hit.bio}
          </div>
        )}
      </div>
      <span aria-hidden="true" style={{ color: '#c8956c', fontWeight: 800, fontSize: 16 }}>→</span>
    </Link>
  );
}

function RoomCard({ hit }: { hit: RoomHit }) {
  return (
    <Link
      href={`/messages?convo=${hit.id}`}
      style={{ ...cardStyle, textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: 'linear-gradient(135deg, #c8956c, #ffb37c)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color: 'white', flexShrink: 0,
      }}>
        {roomCategoryEmoji(hit.category)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: '#1a1208',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {hit.title}
        </div>
        <div style={{ fontSize: 11, color: '#7a6a4f' }}>
          {hit.participant_count} member{hit.participant_count === 1 ? '' : 's'} · {roomCategoryLabel(hit.category)}
        </div>
      </div>
      <span aria-hidden="true" style={{ color: '#c8956c', fontWeight: 800, fontSize: 16 }}>→</span>
    </Link>
  );
}

function BusinessCard({ hit }: { hit: BusinessHit }) {
  const href = hit.owner_username ? `/business/${hit.owner_username}` : '#';
  return (
    <Link
      href={href}
      style={{ ...cardStyle, textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: hit.logo_url ? `url(${hit.logo_url})` : 'linear-gradient(135deg, #8b5cf6, #c084fc)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: 'white', flexShrink: 0,
      }}>
        {!hit.logo_url && '🏪'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: '#1a1208',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {hit.business_name}
        </div>
        {hit.category && (
          <div style={{ fontSize: 11, color: '#7a6a85' }}>{hit.category}</div>
        )}
      </div>
      <span aria-hidden="true" style={{ color: '#8b5cf6', fontWeight: 800, fontSize: 16 }}>→</span>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: 30,
      textAlign: 'center',
      background: 'rgba(255,255,255,0.6)',
      border: '1px dashed rgba(200,149,108,0.3)',
      borderRadius: 16,
      color: '#a89278',
      fontSize: 13,
    }}>
      {message}
    </div>
  );
}

function SkeletonResults() {
  return (
    <div style={resultGrid}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          ...cardStyle,
          opacity: 0.5,
          background: 'rgba(255,255,255,0.5)',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(200,149,108,0.15)',
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ height: 12, background: 'rgba(200,149,108,0.18)', borderRadius: 6, width: '40%' }} />
            <div style={{ height: 10, background: 'rgba(200,149,108,0.12)', borderRadius: 6, width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const resultGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 8,
};
const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  background: 'white',
  border: '1px solid rgba(200,149,108,0.22)',
  borderRadius: 14,
  boxShadow: '0 4px 12px rgba(200,149,108,0.06)',
};
