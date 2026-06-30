'use client';
// CurrentCard — a single post in The Current feed.
//
// Renders against the dark ocean background, so the surface is a
// translucent glass with white-ish text. Layout:
//   [avatar]  @username  •  X minutes ago
//             post body with inline @mention pills
//             [optional entity embed cards]
//             [optional link chips]
//             [↻ N echoes]  [↪ M replies]
//
// The card is the same shape on the feed page and on the detail page;
// nested replies use this same component with reduced spacing.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { segmentBody } from '../lib/currentsParser';
import {
  UserEmbedCard,
  BusinessEmbedCard,
  ListingEmbedCard,
  type UserEmbed,
  type BusinessEmbed,
  type ListingEmbed,
} from './CurrentEntityEmbed';
import { SailCurrentModal } from './SailCurrentModal';
import { MAX_CURRENT_LENGTH } from './CurrentComposer';
import { checkRateLimit, LIMITS, rateLimitMessage } from '../lib/rateLimit';
import { sendNotification } from '../lib/notify';

export interface CurrentRecord {
  id: string;
  body: string;
  parent_id: string | null;
  echo_count: number;
  reply_count: number;
  created_at: string;
  author: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  /** Hydrated entity embeds resolved from @mentions. Provided by the
   *  feed page so the card stays presentation-only. */
  embeds: {
    users: UserEmbed[];
    businesses: BusinessEmbed[];
    listings: ListingEmbed[];
  };
  /** True if the current viewer has already echoed this current. */
  echoedByMe: boolean;
}

interface Props {
  current: CurrentRecord;
  viewerId: string | null;
  /** Pass true for nested replies — slightly tighter, no top-level link. */
  compact?: boolean;
  /** Whether the body should be tap-to-open. Use false on detail pages. */
  linkBody?: boolean;
  /** Called when the user changes echo state — feeds can update local count. */
  onEchoChange?: (newCount: number, isEchoed: boolean) => void;
  /** Parent feed asks to refresh when the user edits or deletes. */
  onMutated?: () => void;
}

export function CurrentCard({
  current, viewerId, compact = false, linkBody = true, onEchoChange, onMutated,
}: Props) {
  const router = useRouter();
  const [echoed, setEchoed] = useState(current.echoedByMe);
  const [echoCount, setEchoCount] = useState(current.echo_count);
  const [busy, setBusy] = useState(false);
  // Edit / delete / sail UI state.
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(current.body);
  const [sailOpen, setSailOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the kebab menu on outside-click.
  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const isMine = viewerId !== null && current.author?.user_id === viewerId;

  async function saveEdit() {
    const trimmed = editBody.trim();
    if (!trimmed) {
      toast.error('Current cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_CURRENT_LENGTH) {
      toast.error(`Limit is ${MAX_CURRENT_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from('currents')
        .update({ body: trimmed })
        .eq('id', current.id);
      if (error) {
        toast.error(error.message ?? 'Could not save.');
        return;
      }
      toast.success('Updated');
      setEditing(false);
      setMenuOpen(false);
      onMutated?.();
    } finally {
      setBusy(false);
    }
  }

  async function deleteCurrent() {
    if (!confirm('Delete this current? This cannot be undone.')) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('currents')
        .delete()
        .eq('id', current.id);
      if (error) {
        toast.error(error.message ?? 'Could not delete.');
        return;
      }
      toast.success('Deleted');
      setMenuOpen(false);
      onMutated?.();
    } finally {
      setBusy(false);
    }
  }

  async function toggleEcho() {
    if (!viewerId) { router.push('/login'); return; }
    setBusy(true);
    try {
      if (echoed) {
        await supabase
          .from('current_echoes')
          .delete()
          .eq('current_id', current.id)
          .eq('user_id', viewerId);
        const next = Math.max(0, echoCount - 1);
        setEchoed(false);
        setEchoCount(next);
        onEchoChange?.(next, false);
      } else {
        // Rate-limit echoes to prevent vote-spam attacks.
        const allowed = await checkRateLimit(LIMITS.ECHO);
        if (!allowed) {
          toast.error(rateLimitMessage(LIMITS.ECHO));
          return;
        }
        const { error } = await supabase
          .from('current_echoes')
          .insert({ current_id: current.id, user_id: viewerId });
        if (error) {
          // Likely subscription gate — push them to /subscription.
          router.push('/subscription');
          return;
        }
        const next = echoCount + 1;
        setEchoed(true);
        setEchoCount(next);
        onEchoChange?.(next, true);
        // Author ping (non-blocking, never own-echo, rate-limited).
        if (current.author && current.author.user_id !== viewerId) {
          await sendNotification({
            user_id: current.author.user_id,
            type: 'current_echo',
            title: 'Someone echoed your Current',
            body: current.body.slice(0, 100),
            action_url: `/currents/${current.id}`,
          });
        }
      }
    } catch (e: any) {
      console.error('[currents/card] echo toggle failed:', e);
      toast.error(e?.message ?? 'Could not echo.');
    } finally {
      setBusy(false);
    }
  }

  const segments = segmentBody(current.body);
  const userMap = new Map(current.embeds.users.map((u) => [u.username.toLowerCase(), u]));
  const bizMap = new Map(current.embeds.businesses.map((b) => [b.owner_username.toLowerCase(), b]));
  const listingMap = new Map(current.embeds.listings.map((l) => [l.id.toLowerCase(), l]));

  return (
    <article
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18,
        padding: compact ? '12px 14px' : '16px 18px',
        backdropFilter: 'blur(10px)',
        color: 'rgba(255,255,255,0.92)',
        position: 'relative',
      }}
    >
      {/* Header row: avatar + handle + time, plus boat icon for "sail
          to DM" and (if mine) the ⋯ menu for edit/delete. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {current.author && (
          <Link
            href={`/profile/${current.author.username}`}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0, flex: 1 }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: current.author.avatar_url
                  ? `url(${current.author.avatar_url}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #c8956c, #ffb37c)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 800, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                @{current.author.username}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {relativeTime(current.created_at)}
              </div>
            </div>
          </Link>
        )}

        {/* Owner ⋯ menu for edit + delete. (Boat / sail button now lives
            next to the replies button in the footer instead.) */}
        {isMine && !editing && (
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              aria-label="More options for this current"
              aria-expanded={menuOpen}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '50%',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 18, fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute', right: 0, top: 38,
                  minWidth: 150,
                  background: '#0a2540',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 12,
                  boxShadow: '0 18px 40px rgba(0,0,0,0.55)',
                  overflow: 'hidden',
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                    setEditBody(current.body);
                    setMenuOpen(false);
                  }}
                  style={menuItemStyle}
                >
                  Edit
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); deleteCurrent(); }}
                  disabled={busy}
                  style={{ ...menuItemStyle, color: '#fda4af' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline edit mode replaces the body view. Owner only. */}
      {editing ? (
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(125,211,252,0.35)',
          borderRadius: 12,
          padding: 10,
          marginBottom: 10,
        }}>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value.slice(0, MAX_CURRENT_LENGTH + 50))}
            rows={3}
            aria-label="Edit your current"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              color: 'white',
              fontSize: 16,
              fontFamily: 'inherit',
              lineHeight: 1.5,
              minHeight: 56,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: editBody.length > MAX_CURRENT_LENGTH ? '#fda4af' : 'rgba(255,255,255,0.55)',
            }}>
              {MAX_CURRENT_LENGTH - editBody.length}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditBody(current.body); }}
                disabled={busy}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 100,
                  fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy || !editBody.trim() || editBody.length > MAX_CURRENT_LENGTH}
                style={{
                  padding: '6px 16px',
                  background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 12, fontWeight: 800,
                  cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
      <BodyView linkable={linkBody} href={`/currents/${current.id}`}>
        <p style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.55,
          color: 'rgba(255,255,255,0.94)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {segments.map((seg, i) => {
            if (seg.type === 'text') return <span key={i}>{seg.text}</span>;
            if (seg.type === 'link') {
              return (
                <a
                  key={i}
                  href={seg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: '#7dd3fc', textDecoration: 'underline' }}
                >
                  {seg.url}
                </a>
              );
            }
            // mention
            const m = seg.mention;
            let href = '#';
            let color = '#ffd5a8';
            if (m.kind === 'user') {
              href = `/profile/${m.handle}`;
              color = '#ffd5a8';
            } else if (m.kind === 'business') {
              href = `/business/${m.handle}`;
              color = '#c084fc';
            } else if (m.kind === 'listing') {
              href = `/home-goods/${m.handle}`;
              color = '#86efac';
            }
            return (
              <Link
                key={i}
                href={href}
                onClick={(e) => e.stopPropagation()}
                style={{ color, fontWeight: 700, textDecoration: 'none' }}
              >
                {m.raw}
              </Link>
            );
          })}
        </p>
      </BodyView>
      )}

      {/* Hydrated entity embeds. Pulls one card per resolvable mention. */}
      {(current.embeds.users.length > 0 ||
        current.embeds.businesses.length > 0 ||
        current.embeds.listings.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {Array.from(userMap.values()).slice(0, 3).map((u) => (
            <UserEmbedCard key={u.username} user={u} />
          ))}
          {Array.from(bizMap.values()).slice(0, 3).map((b) => (
            <BusinessEmbedCard key={b.owner_username} business={b} />
          ))}
          {Array.from(listingMap.values()).slice(0, 3).map((l) => (
            <ListingEmbedCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {/* Footer: echo + reply count */}
      <div style={{
        marginTop: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
      }}>
        <button
          type="button"
          onClick={toggleEcho}
          disabled={busy}
          aria-pressed={echoed}
          aria-label={echoed ? 'Remove echo' : 'Echo this current'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            background: echoed ? 'rgba(125,211,252,0.18)' : 'transparent',
            border: `1px solid ${echoed ? 'rgba(125,211,252,0.5)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 100,
            color: echoed ? '#7dd3fc' : 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 800,
            cursor: busy ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.3px',
          }}
        >
          <span aria-hidden="true">↻</span>
          {echoCount} {echoCount === 1 ? 'echo' : 'echoes'}
        </button>
        <Link
          href={`/currents/${current.id}`}
          aria-label="View replies"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 100,
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 800,
            textDecoration: 'none',
            letterSpacing: '0.3px',
          }}
        >
          <span aria-hidden="true">↪</span>
          {current.reply_count} {current.reply_count === 1 ? 'reply' : 'replies'}
        </Link>

        {/* Sail-to-DM boat button. Lives next to the replies button so
            the social actions are visually grouped together. */}
        {viewerId && !editing && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSailOpen(true); }}
            aria-label="Sail this current to a friend"
            title="Sail to a friend"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              background: 'rgba(125,211,252,0.10)',
              border: '1px solid rgba(125,211,252,0.40)',
              borderRadius: 100,
              color: '#7dd3fc',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <BoatIcon />
          </button>
        )}
      </div>

      {/* Sail-to-DM modal — opens when the boat icon is tapped. */}
      {viewerId && (
        <SailCurrentModal
          open={sailOpen}
          viewerId={viewerId}
          currentId={current.id}
          currentBody={current.body}
          currentAuthorUsername={current.author?.username ?? null}
          onClose={() => setSailOpen(false)}
        />
      )}
    </article>
  );
}

// Boat icon — small SVG outline.
function BoatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Hull */}
      <path
        d="M3 15 L21 15 L19 19 L5 19 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Mast */}
      <path
        d="M12 4 L12 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Sail */}
      <path
        d="M12 5 L18 14 L12 14 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Water wave below */}
      <path
        d="M3 21 Q6 19.5 9 21 T15 21 T21 21"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '11px 16px',
  background: 'transparent',
  border: 'none',
  color: 'white',
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function BodyView({
  linkable, href, children,
}: { linkable: boolean; href: string; children: React.ReactNode }) {
  if (!linkable) return <>{children}</>;
  return (
    <Link href={href} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      {children}
    </Link>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
