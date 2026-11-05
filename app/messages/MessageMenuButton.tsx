// Small ⋯ menu button rendered next to each non-game message bubble.
// Tapping opens the delete options inline next to the bubble.
export function MessageMenuButton({
  isMine,
  isOpen,
  onToggle,
  canUnsend,
  onUnsend,
  onDeleteForMe,
}: {
  isMine: boolean;
  isOpen: boolean;
  onToggle: () => void;
  canUnsend: boolean;
  onUnsend: () => void;
  onDeleteForMe: () => void;
}) {
  return (
    <div style={{ position: 'relative', alignSelf: 'flex-end' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Message options"
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.06)',
          border: 'none',
          color: 'var(--brand-personal-text-mid)',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          fontFamily: 'inherit',
          padding: 0,
        }}
      >
        ⋯
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            [isMine ? 'right' : 'left']: 0,
            background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14,
            padding: 6,
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            zIndex: 30,
            minWidth: 160,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {canUnsend && (
            <button
              type="button"
              onClick={onUnsend}
              style={menuActionBtn('#b91c1c')}
            >
              🚫 Unsend for everyone
            </button>
          )}
          <button
            type="button"
            onClick={onDeleteForMe}
            style={menuActionBtn('var(--brand-personal-text-mid)')}
          >
            🗑️ Delete for me
          </button>
        </div>
      )}
    </div>
  );
}

function menuActionBtn(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    color,
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 12px',
    textAlign: 'left',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
