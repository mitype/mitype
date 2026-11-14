'use client';
// TopFriends — up to six approved friends shown as circle photos with
// usernames on a profile. Sits between the profile card and the Positivity
// Score. Only approved friends appear. Signed-out visitors see nothing
// (the database only returns this list to signed-in members).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { Avatar } from './Avatar';

const MAX = 6;

interface Friend {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export function TopFriends({ profileUserId, isOwnProfile }: {
  profileUserId: string;
  isOwnProfile: boolean;
}) {
  const [friends, setFriends] = useState<Friend[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from('top_friends')
          .select('friend_id, slot')
          .eq('owner_id', profileUserId)
          .eq('status', 'approved')
          .order('slot', { ascending: true })
          .limit(MAX);
        const ids = (rows ?? []).map((r: any) => r.friend_id as string);
        if (ids.length === 0) { if (!cancelled) setFriends([]); return; }
        const { data: profs } = await supabase
          .from('profiles_directory')
          .select('user_id, username, avatar_url')
          .in('user_id', ids);
        const byId = new Map<string, Friend>(
          (profs ?? []).map((p: any) => [p.user_id, {
            user_id: p.user_id, username: p.username, avatar_url: p.avatar_url ?? null,
          }]),
        );
        const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as Friend[];
        if (!cancelled) setFriends(ordered);
      } catch (e) {
        console.error('[top-friends] load failed:', e);
        if (!cancelled) setFriends([]);
      }
    })();
    return () => { cancelled = true; };
  }, [profileUserId]);

  if (friends === null) return null;
  // Visitors only see the block when there is something to show.
  if (friends.length === 0 && !isOwnProfile) return null;

  const empties = isOwnProfile ? Math.max(0, MAX - friends.length) : 0;

  return (
    <div style={shellStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <p style={eyebrowStyle}>Top Friends</p>
        {isOwnProfile && (
          <Link href="/top-friends" style={manageLink}>Manage</Link>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${MAX}, minmax(0, 1fr))`,
        gap: 8,
      }}>
        {friends.map((f) => (
          <Link
            key={f.user_id}
            href={`/profile/${f.username}`}
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}
          >
            <span style={{
              width: '100%', maxWidth: 68, aspectRatio: '1 / 1', borderRadius: '50%',
              overflow: 'hidden', display: 'block',
              border: '2px solid var(--brand-personal)',
              background: 'rgba(200,149,108,0.15)',
            }}>
              <Avatar src={f.avatar_url} alt={f.username} width={68} sizes="68px" />
            </span>
            <span style={nameStyle}>@{f.username}</span>
          </Link>
        ))}
        {Array.from({ length: empties }, (_, i) => (
          <Link
            key={`empty-${i}`}
            href="/top-friends"
            aria-label="Add a Top Friend"
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}
          >
            <span style={{
              width: '100%', maxWidth: 68, aspectRatio: '1 / 1', borderRadius: '50%',
              border: '2px dashed rgba(200,149,108,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--brand-personal)', fontSize: 22, fontWeight: 700,
            }}>+</span>
            <span style={{ ...nameStyle, opacity: 0.6 }}>Add</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(200,149,108,0.20)',
  borderRadius: 18,
  padding: '16px 20px',
  marginBottom: 24,
  boxShadow: '0 4px 16px rgba(200,149,108,0.06)',
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  color: 'var(--brand-personal)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const manageLink: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--brand-personal)',
  textDecoration: 'none',
};

const nameStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--brand-text-primary)',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
