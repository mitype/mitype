// Small red pill used to surface unread message counts in nav and lists.
// Returns null when the count is zero so callers can drop it inline without
// extra conditional logic.

interface UnreadBadgeProps {
  count: number;
  // 'sm' fits next to nav text. 'md' is a slightly bigger pill for cards.
  size?: 'sm' | 'md';
  // Pass to nudge the badge over after some text — `marginLeft: 6` by default.
  style?: React.CSSProperties;
}

export function UnreadBadge({ count, size = 'sm', style }: UnreadBadgeProps) {
  if (!count || count <= 0) return null;
  const display = count > 99 ? '99+' : String(count);
  const isSmall = size === 'sm';
  return (
    <span
      aria-label={`${count} unread message${count === 1 ? '' : 's'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#dc2626',
        color: 'white',
        fontWeight: 800,
        fontSize: isSmall ? 11 : 12,
        lineHeight: 1,
        padding: isSmall ? '3px 7px' : '4px 9px',
        borderRadius: 100,
        minWidth: isSmall ? 18 : 22,
        marginLeft: 6,
        ...style,
      }}
    >
      {display}
    </span>
  );
}
