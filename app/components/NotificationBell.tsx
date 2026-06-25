'use client';
// Notification bell — drops into a page nav. Shows an unread count
// badge, and on tap opens a dropdown of the most recent notifications.
// Each row deep-links to its action_url and marks itself read.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ userId, tone = 'bronze' }: {
  userId: string;
  /** Adapts the badge color so the bell can live on either the bronze
   *  or purple-themed pages without clashing. */
  tone?: 'bronze' | 'purple';
}) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void load();
    // Refresh every 60 seconds in case something landed.
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Click outside to close the panel.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, action_url, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data ?? []) as NotificationRow[]);
  }

  async function markAllRead() {
    if (items.every((n) => n.is_read)) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markOne(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  const unread = items.filter((n) => !n.is_read).length;
  const badgeColor = tone === 'purple' ? '#8b5cf6' : '#c8956c';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && unread > 0) void markAllRead();
        }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        style={{
          width: 38,
          height: 38,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: tone === 'purple' ? '#5b21b6' : '#8a7560',
          fontSize: 20,
          position: 'relative',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        🔔
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 100,
              background: badgeColor,
              color: 'white',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
              boxSizing: 'content-box',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxWidth: 'calc(100vw - 24px)',
            background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 18,
            boxShadow: '0 18px 48px rgba(0,0,0,0.18)',
            zIndex: 200,
            overflow: 'hidden',
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          <div style={{
            padding: '14px 18px',
            background: tone === 'purple' ? 'linear-gradient(135deg, #f6f3fb, #ebe5f5)' : 'linear-gradient(135deg, #fff8ec, #fff3ec)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1208' }}>
              Notifications
            </span>
            <span style={{ fontSize: 11, color: '#8a7560', fontWeight: 700 }}>
              {unread > 0 ? `${unread} unread` : 'All caught up'}
            </span>
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: '#a89278', fontSize: 13 }}>
                Nothing here yet. When someone recommends your business or
                interacts with you, you&rsquo;ll see it here.
              </div>
            ) : (
              items.map((n) => {
                const body = (
                  <>
                    <div style={{
                      fontSize: 14, fontWeight: 800, color: '#1a1208',
                      marginBottom: 3,
                    }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 13, color: '#5b4a40', lineHeight: 1.4 }}>
                        {n.body}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#a89278', marginTop: 4 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </>
                );
                const baseRow: React.CSSProperties = {
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  background: n.is_read ? 'white' : 'rgba(139,92,246,0.05)',
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: n.action_url ? 'pointer' : 'default',
                };
                const dot = (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8, height: 8, marginTop: 8, borderRadius: '50%',
                      background: n.is_read ? 'transparent' : badgeColor,
                      flexShrink: 0,
                    }}
                  />
                );
                if (n.action_url) {
                  return (
                    <Link
                      key={n.id}
                      href={n.action_url}
                      onClick={() => { void markOne(n.id); setOpen(false); }}
                      style={baseRow}
                    >
                      {dot}
                      <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
                    </Link>
                  );
                }
                return (
                  <div key={n.id} style={baseRow}>
                    {dot}
                    <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
