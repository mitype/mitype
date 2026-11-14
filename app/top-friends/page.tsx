'use client';
// /top-friends — manage your Top Friends (up to 6), answer requests from
// others, and leave a list you were added to. Subscribers only.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { hasActiveAccess } from '../lib/access';
import { toast } from '../lib/toast';
import { SiteNav } from '../components/SiteNav';
import { Avatar } from '../components/Avatar';

const MAX = 6;

interface Row { id: string; owner_id: string; friend_id: string; status: 'pending' | 'approved'; slot: number; }
interface Person { user_id: string; username: string; avatar_url: string | null; }

export default function TopFriendsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mine, setMine] = useState<Row[]>([]);        // rows I own
  const [incoming, setIncoming] = useState<Row[]>([]); // pending requests to me
  const [listedOn, setListedOn] = useState<Row[]>([]); // approved, I am the friend
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[]>([]);

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('top_friends')
      .select('id, owner_id, friend_id, status, slot')
      .or(`owner_id.eq.${uid},friend_id.eq.${uid}`)
      .order('slot', { ascending: true });
    const rows = (data ?? []) as Row[];
    setMine(rows.filter((r) => r.owner_id === uid));
    setIncoming(rows.filter((r) => r.friend_id === uid && r.status === 'pending'));
    setListedOn(rows.filter((r) => r.friend_id === uid && r.status === 'approved'));
    const ids = Array.from(new Set(rows.flatMap((r) => [r.owner_id, r.friend_id]))).filter((i) => i !== uid);
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles_directory')
        .select('user_id, username, avatar_url')
        .in('user_id', ids);
      const map: Record<string, Person> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = { user_id: p.user_id, username: p.username, avatar_url: p.avatar_url ?? null }; });
      setPeople(map);
    } else {
      setPeople({});
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle();
      if (!hasActiveAccess(sub?.status)) { router.replace('/subscription'); return; }
      setUserId(user.id);
      await load(user.id);
      setReady(true);
    })();
  }, [router, load]);

  // Username search (prefix match, signed-in members only).
  useEffect(() => {
    const term = q.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._-]/g, '');
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles_directory')
        .select('user_id, username, avatar_url')
        .ilike('username', `${term}%`)
        .limit(8);
      setResults(((data ?? []) as any[])
        .filter((p) => p.user_id !== userId)
        .map((p) => ({ user_id: p.user_id, username: p.username, avatar_url: p.avatar_url ?? null })));
    }, 250);
    return () => clearTimeout(t);
  }, [q, userId]);

  async function run(fn: () => Promise<{ error: any }>, okMsg: string) {
    if (busy || !userId) return;
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) { toast.error(error.message ?? 'Something went wrong.'); return; }
      toast.success(okMsg);
      await load(userId);
    } catch (e: any) {
      toast.error(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const sendRequest = (p: Person) =>
    run(() => supabase.rpc('request_top_friend', { p_friend: p.user_id }) as any, `Request sent to @${p.username}.`)
      .then(() => { setQ(''); setResults([]); });
  const respond = (r: Row, accept: boolean) =>
    run(() => supabase.rpc('respond_top_friend', { p_request: r.id, p_accept: accept }) as any,
      accept ? 'Approved. You now show on their Top Friends.' : 'Request denied. They will be told.');
  const remove = (r: Row, msg: string) =>
    run(() => supabase.rpc('remove_top_friend', { p_id: r.id }) as any, msg);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= mine.length) return;
    const ids = mine.map((r) => r.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    return run(() => supabase.rpc('reorder_top_friends', { p_ids: ids }) as any, 'Order saved.');
  };

  if (!ready) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--brand-personal-bg-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <p style={{ color: 'var(--brand-personal)' }}>Loading Top Friends…</p>
      </main>
    );
  }

  const person = (id: string) => people[id];
  const takenIds = new Set(mine.map((r) => r.friend_id));

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/dashboard" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
        <p style={eyebrow}>Profile</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.8px', marginBottom: 10 }}>
          Top Friends
        </h1>
        <p style={{ color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
          Show up to six of your closest friends on your profile. Each person has to approve your request before they appear.
        </p>

        {incoming.length > 0 && (
          <section style={card}>
            <p style={eyebrow}>Requests for you</p>
            {incoming.map((r) => {
              const p = person(r.owner_id);
              return (
                <div key={r.id} style={rowStyle}>
                  <PersonLink p={p} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={busy} onClick={() => respond(r, true)} style={primaryBtn}>Approve</button>
                    <button type="button" disabled={busy} onClick={() => respond(r, false)} style={ghostBtn}>Deny</button>
                  </div>
                </div>
              );
            })}
            <p style={hint}>Approving adds you to their Top Friends. If you deny, they get a notification that it was denied.</p>
          </section>
        )}

        <section style={card}>
          <p style={eyebrow}>Your Top Friends ({mine.length}/{MAX})</p>
          {mine.length === 0 && <p style={hint}>No one yet. Search below to send a request.</p>}
          {mine.map((r, i) => {
            const p = person(r.friend_id);
            return (
              <div key={r.id} style={rowStyle}>
                <PersonLink p={p} tag={r.status === 'pending' ? 'Waiting for approval' : undefined} />
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button type="button" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)} style={iconBtn}>↑</button>
                  <button type="button" aria-label="Move down" disabled={busy || i === mine.length - 1} onClick={() => move(i, 1)} style={iconBtn}>↓</button>
                  <button type="button" disabled={busy} onClick={() => remove(r, r.status === 'pending' ? 'Request cancelled.' : 'Removed.')} style={ghostBtn}>
                    {r.status === 'pending' ? 'Cancel' : 'Remove'}
                  </button>
                </div>
              </div>
            );
          })}

          {mine.length < MAX && (
            <div style={{ marginTop: 16 }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a username"
                aria-label="Search a username"
                autoComplete="off"
                style={inputStyle}
              />
              {results.map((p) => (
                <div key={p.user_id} style={rowStyle}>
                  <PersonLink p={p} />
                  {takenIds.has(p.user_id)
                    ? <span style={{ fontSize: 12, color: 'var(--brand-personal-text-light)', fontWeight: 700 }}>Already added</span>
                    : <button type="button" disabled={busy} onClick={() => sendRequest(p)} style={primaryBtn}>Send request</button>}
                </div>
              ))}
            </div>
          )}
        </section>

        {listedOn.length > 0 && (
          <section style={card}>
            <p style={eyebrow}>You are in their Top Friends</p>
            {listedOn.map((r) => (
              <div key={r.id} style={rowStyle}>
                <PersonLink p={person(r.owner_id)} />
                <button type="button" disabled={busy} onClick={() => remove(r, 'You were removed from their Top Friends.')} style={ghostBtn}>
                  Remove me
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function PersonLink({ p, tag }: { p?: Person; tag?: string }) {
  if (!p) return <span style={{ fontSize: 14, color: 'var(--brand-personal-text-light)' }}>Member</span>;
  return (
    <Link href={`/profile/${p.username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', minWidth: 0, flex: 1 }}>
      <span style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--brand-personal)', background: 'rgba(200,149,108,0.15)', display: 'block' }}>
        <Avatar src={p.avatar_url} alt={p.username} width={44} sizes="44px" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--brand-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.username}</span>
        {tag && <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--brand-personal-text-light)' }}>{tag}</span>}
      </span>
    </Link>
  );
}

const eyebrow: React.CSSProperties = {
  margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'var(--brand-personal)',
  textTransform: 'uppercase', letterSpacing: '1.2px',
};
const card: React.CSSProperties = {
  background: 'white', border: '1px solid rgba(200,149,108,0.20)', borderRadius: 18,
  padding: '18px 20px', marginBottom: 20, boxShadow: '0 4px 16px rgba(200,149,108,0.06)',
};
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap',
};
const hint: React.CSSProperties = { margin: '8px 0 0', fontSize: 12, color: 'var(--brand-personal-text-mid)', lineHeight: 1.45 };
const primaryBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 100, border: 'none', background: 'var(--brand-personal)',
  color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 100, border: '1px solid rgba(200,149,108,0.5)', background: 'transparent',
  color: 'var(--brand-personal-text-mid)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};
const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(200,149,108,0.5)', background: 'transparent',
  color: 'var(--brand-personal-text-mid)', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(200,149,108,0.4)',
  fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', background: 'white', color: 'var(--brand-text-primary)',
};
