'use client';
// Shimmering skeleton placeholders shown while data loads.
// One shared shimmer keyframe (registered in `globals.css`) powers them all.
// The keyframe is named `mitype-shimmer` so it won't clash with anything else.

import React from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}

const BASE_STYLE: React.CSSProperties = {
  display: 'block',
  background:
    'linear-gradient(90deg, rgba(200,149,108,0.08) 0%, rgba(200,149,108,0.18) 50%, rgba(200,149,108,0.08) 100%)',
  backgroundSize: '200% 100%',
  animation: 'mitype-shimmer 1.4s ease-in-out infinite',
};

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        ...BASE_STYLE,
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

const CONTAINER: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  padding: '48px 24px',
};

const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(200,149,108,0.15)',
  borderRadius: 24,
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
};

/** Skeleton grid that mirrors the /discover card layout. */
export function DiscoverSkeleton() {
  return (
    <main style={CONTAINER} aria-busy="true" aria-label="Loading profiles">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Skeleton width={180} height={40} radius={12} style={{ marginBottom: 10 }} />
        <Skeleton width={260} height={18} radius={8} style={{ marginBottom: 40 }} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 24,
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={CARD}>
              <Skeleton width="100%" height={0} radius={0} style={{ aspectRatio: '3/4', height: 'auto' }} />
              <div style={{ padding: 16 }}>
                <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
                <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
                <Skeleton width="90%" height={12} style={{ marginBottom: 16 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Skeleton width="100%" height={40} radius={12} />
                  <Skeleton width="100%" height={40} radius={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/** Skeleton for the /messages page — sidebar + chat area. */
export function MessagesSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading messages"
      style={{
        height: '100vh',
        background: '#faf6f0',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        height: 64,
        borderBottom: '1px solid rgba(200,149,108,0.15)',
        display: 'flex', alignItems: 'center', padding: '0 32px',
        background: 'rgba(250,246,240,0.95)',
      }}>
        <Skeleton width={80} height={22} radius={6} />
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: 300,
          borderRight: '1px solid rgba(200,149,108,0.15)',
          background: 'white',
          padding: 20,
          flexShrink: 0,
        }}>
          <Skeleton width={120} height={22} style={{ marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <Skeleton width={40} height={40} radius={20} />
              <div style={{ flex: 1 }}>
                <Skeleton width="80%" height={14} style={{ marginBottom: 6 }} />
                <Skeleton width="50%" height={12} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 32 }}>
          <Skeleton width={220} height={24} radius={12} style={{ margin: '80px auto 16px' }} />
          <Skeleton width={180} height={16} radius={8} style={{ margin: '0 auto' }} />
        </div>
      </div>
    </main>
  );
}

/** Skeleton for /profile/[username]. */
export function ProfileSkeleton() {
  return (
    <main style={CONTAINER} aria-busy="true" aria-label="Loading profile">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ ...CARD, marginBottom: 24 }}>
          <Skeleton width="100%" height={100} radius={0} />
          <div style={{ padding: '0 32px 32px' }}>
            <Skeleton width={100} height={125} radius={16} style={{ marginTop: -50, border: '4px solid white' }} />
            <Skeleton width="50%" height={28} style={{ marginTop: 16, marginBottom: 12 }} />
            <Skeleton width="30%" height={14} style={{ marginBottom: 20 }} />
            <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="90%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="75%" height={14} />
          </div>
        </div>
      </div>
    </main>
  );
}

/** Skeleton for /dashboard. */
export function DashboardSkeleton() {
  return (
    <main style={CONTAINER} aria-busy="true" aria-label="Loading dashboard">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Skeleton width="60%" height={40} radius={12} style={{ marginBottom: 12 }} />
        <Skeleton width="40%" height={18} style={{ marginBottom: 40 }} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
        }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={140} radius={20} />
          ))}
        </div>
      </div>
    </main>
  );
}
