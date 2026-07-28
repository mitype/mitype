'use client';
// Small live-presence indicator: shows "Online" (green pulse dot) when
// the user is currently in the online presence set. Returns null when
// they aren't.
//
// Historical: this component used to fall back to "Active <time> ago"
// when the user wasn't currently online. That was removed at user
// request — displaying a stale last-login time didn't add value for
// discovery and made offline users feel exposed. The `lastActiveAt`
// prop is kept on the interface so existing callers don't break, but
// it's no longer read.

interface Props {
  userId: string;
  lastActiveAt?: string | null;   // deprecated; kept for backward compat
  online: Set<string>;
  size?: 'sm' | 'md';
}

export function OnlineDot({ userId, online, size = 'sm' }: Props) {
  const isOnline = online.has(userId);
  if (!isOnline) return null;
  const fontSize = size === 'md' ? 13 : 12;
  const dot = size === 'md' ? 9 : 8;

  return (
    <span
      aria-label="Online now"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--brand-market-success)',
        fontSize,
        fontWeight: 700,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: dot,
          height: dot,
          background: 'var(--brand-market-light)',
          borderRadius: '50%',
          boxShadow: '0 0 0 3px rgba(34,197,94,0.18)',
        }}
      />
      Online
    </span>
  );
}
