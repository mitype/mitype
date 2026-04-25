'use client';
// Small status indicator: shows "Online" (with a green pulse dot) when
// the user is currently in the online presence set, otherwise falls back
// to "Active <relative-time> ago" when last_active_at is available.
// Returns null when there's nothing to show.

import { formatRelativeTime } from '../lib/utils';

interface Props {
  userId: string;
  lastActiveAt?: string | null;
  online: Set<string>;
  size?: 'sm' | 'md';
}

export function OnlineDot({ userId, lastActiveAt, online, size = 'sm' }: Props) {
  const isOnline = online.has(userId);
  const fontSize = size === 'md' ? 13 : 12;
  const dot = size === 'md' ? 9 : 8;

  if (isOnline) {
    return (
      <span
        aria-label="Online now"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#16a34a',
          fontSize,
          fontWeight: 700,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: dot,
            height: dot,
            background: '#22c55e',
            borderRadius: '50%',
            boxShadow: '0 0 0 3px rgba(34,197,94,0.18)',
          }}
        />
        Online
      </span>
    );
  }

  if (lastActiveAt) {
    return (
      <span style={{ color: '#a89278', fontSize, fontWeight: 500 }}>
        Active {formatRelativeTime(lastActiveAt)}
      </span>
    );
  }

  return null;
}
