'use client';
// Inline rich embed cards for The Current. When a post mentions a
// Mitype entity (user, business, listing), the renderer drops one of
// these cards beneath the body so the mention is browsable in one tap.
//
// Tone-aware: bronze for users, purple for businesses, green for
// Mi Home Goods listings. Stays restrained — small avatar/logo +
// label + one-line context.

import Link from 'next/link';

export interface UserEmbed {
  username: string;
  avatar_url: string | null;
  bio: string | null;
}
export interface BusinessEmbed {
  owner_username: string;
  business_name: string;
  category: string | null;
  logo_url: string | null;
}
export interface ListingEmbed {
  id: string;
  title: string;
  price_label: string;
  photo_url: string | null;
}

export function UserEmbedCard({ user }: { user: UserEmbed }) {
  return (
    <Link
      href={`/profile/${user.username}`}
      style={baseStyle({
        bg: 'rgba(200,149,108,0.10)',
        border: 'rgba(200,149,108,0.35)',
      })}
    >
      <Avatar src={user.avatar_url} fallback={user.username.charAt(0).toUpperCase()} tint="bronze" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
          @{user.username}
        </div>
        {user.bio && (
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.7)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user.bio}
          </div>
        )}
      </div>
      <span aria-hidden="true" style={{ color: '#ffd5a8', fontWeight: 800 }}>›</span>
    </Link>
  );
}

export function BusinessEmbedCard({ business }: { business: BusinessEmbed }) {
  return (
    <Link
      href={`/business/${business.owner_username}`}
      style={baseStyle({
        bg: 'rgba(139,92,246,0.13)',
        border: 'rgba(139,92,246,0.4)',
      })}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: business.logo_url
          ? `url(${business.logo_url}) center/cover no-repeat`
          : 'linear-gradient(135deg, #8b5cf6, #c084fc)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 16, flexShrink: 0,
      }}>
        {!business.logo_url && '🏪'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
          {business.business_name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
          {business.category ?? 'Small business'}
        </div>
      </div>
      <span aria-hidden="true" style={{ color: '#c084fc', fontWeight: 800 }}>›</span>
    </Link>
  );
}

export function ListingEmbedCard({ listing }: { listing: ListingEmbed }) {
  return (
    <Link
      href={`/home-goods/${listing.id}`}
      style={baseStyle({
        bg: 'rgba(21,128,61,0.13)',
        border: 'rgba(21,128,61,0.4)',
      })}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: listing.photo_url
          ? `url(${listing.photo_url}) center/cover no-repeat`
          : 'linear-gradient(135deg, #15803d, #22c55e)',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 800, color: '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {listing.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
          🏡 {listing.price_label}
        </div>
      </div>
      <span aria-hidden="true" style={{ color: '#22c55e', fontWeight: 800 }}>›</span>
    </Link>
  );
}

function baseStyle({ bg, border }: { bg: string; border: string }): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 12,
    textDecoration: 'none',
    backdropFilter: 'blur(6px)',
  };
}

function Avatar({ src, fallback, tint }: {
  src: string | null; fallback: string; tint: 'bronze';
}) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: src
        ? `url(${src}) center/cover no-repeat`
        : 'linear-gradient(135deg, #c8956c, #ffb37c)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: 14, fontWeight: 800,
      flexShrink: 0,
    }}>
      {!src && fallback}
    </div>
  );
}
