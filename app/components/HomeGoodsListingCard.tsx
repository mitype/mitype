'use client';
// HomeGoodsListingCard — square tile shown in browse grids and saved
// lists. Image-forward, price-prominent, taps to listing detail.

import Link from 'next/link';
import { categoryEmoji, categoryLabel, formatPrice } from '../lib/homeGoodsCategories';

export interface HomeGoodsListingLite {
  id: string;
  title: string;
  price_cents: number | null;
  price_kind: string | null;
  category: string;
  photo_urls: string[] | null;
  city: string | null;
  state: string | null;
  status?: string | null;
}

export function HomeGoodsListingCard({ listing }: { listing: HomeGoodsListingLite }) {
  const cover = (listing.photo_urls ?? [])[0] ?? null;
  const where = [listing.city, listing.state].filter(Boolean).join(', ');
  return (
    <Link
      href={`/home-goods/${listing.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'white',
        border: '1px solid rgba(21,128,61,0.18)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 6px 16px rgba(21,128,61,0.08)',
        position: 'relative',
      }}
    >
      {/* Photo / fallback */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          background: cover
            ? `url(${cover}) center/cover no-repeat`
            : 'linear-gradient(135deg, #ecfdf5, #bbf7d0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!cover && (
          <div style={{
            fontSize: 64,
            opacity: 0.6,
          }}>
            {categoryEmoji(listing.category)}
          </div>
        )}
        {listing.status === 'sold' && (
          <span style={{
            position: 'absolute',
            top: 10,
            left: 10,
            padding: '4px 10px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
          }}>
            Sold
          </span>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{
          fontSize: 17,
          fontWeight: 900,
          color: '#15803d',
          letterSpacing: '-0.3px',
          marginBottom: 3,
        }}>
          {formatPrice(listing.price_cents, listing.price_kind)}
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#1a1208',
          letterSpacing: '-0.2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 4,
        }}>
          {listing.title}
        </div>
        <div style={{
          fontSize: 11,
          color: '#5b7a68',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          <span aria-hidden="true">{categoryEmoji(listing.category)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {categoryLabel(listing.category)}{where ? ` · ${where}` : ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
