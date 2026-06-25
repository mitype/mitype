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

import { useState } from 'react';
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
}

export function CurrentCard({
  current, viewerId, compact = false, linkBody = true, onEchoChange,
}: Props) {
  const router = useRouter();
  const [echoed, setEchoed] = useState(current.echoedByMe);
  const [echoCount, setEchoCount] = useState(current.echo_count);
  const [busy, setBusy] = useState(false);

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
        // Author ping (non-blocking, never own-echo).
        if (current.author && current.author.user_id !== viewerId) {
          try {
            await supabase.from('notifications').insert({
              user_id: current.author.user_id,
              type: 'current_echo',
              title: 'Someone echoed your Current',
              body: current.body.slice(0, 100),
              action_url: `/currents/${current.id}`,
            });
          } catch {}
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
      {/* Header row: avatar + handle + time */}
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
      </div>

      {/* Body. Either tap-to-open (feed mode) or static (detail mode). */}
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
      </div>
    </article>
  );
}

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
