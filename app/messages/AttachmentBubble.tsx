import { PhotoLightbox } from '../components/PhotoLightbox';
import { VoiceNotePlayer } from '../components/VoiceNotePlayer';

// AttachmentBubble — renders a chat bubble for a photo or voice-note
// message. When the attachment has expired (cron cleared the URL,
// OR the expires_at has passed) we show an "expired" placeholder.
export function AttachmentBubble({
  msg,
  isMine,
  showReadReceipt,
  timeAgo,
}: {
  msg: any;
  isMine: boolean;
  showReadReceipt: boolean;
  timeAgo: string;
}) {
  const expired =
    !msg.attachment_url ||
    (msg.attachment_expires_at && new Date(msg.attachment_expires_at).getTime() <= Date.now());

  return (
    <div style={{
      maxWidth: '70%',
      padding: msg.attachment_type === 'image' ? 6 : '10px 14px',
      borderRadius: isMine
        ? '18px 18px 4px 18px'
        : '18px 18px 18px 4px',
      background: isMine ? 'var(--brand-personal)' : 'white',
      color: isMine ? 'white' : 'var(--brand-text-primary)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {expired ? (
        <p style={{
          margin: 0,
          padding: '6px 4px',
          fontSize: 13,
          fontStyle: 'italic',
          opacity: 0.75,
        }}>
          {msg.attachment_type === 'image' ? '📷 Photo expired' : '🎤 Voice note expired'}
        </p>
      ) : msg.attachment_type === 'image' ? (
        <PhotoLightbox
          url={msg.attachment_url}
          expiresAt={msg.attachment_expires_at}
        />
      ) : (
        <VoiceNotePlayer
          url={msg.attachment_url}
          durationSeconds={msg.attachment_duration_seconds ?? 0}
          variant={isMine ? 'mine' : 'theirs'}
        />
      )}
      <p style={{
        fontSize: 11,
        margin: '6px 4px 0',
        opacity: 0.6,
        textAlign: 'right',
      }}>
        {timeAgo}
        {showReadReceipt && (
          <span style={{ marginLeft: 6, fontWeight: 700 }}>
            ✓ Read
          </span>
        )}
      </p>
    </div>
  );
}
