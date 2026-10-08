'use client';
// Certificate viewer: preview, download in three sizes, and share.
// Everything is generated in the browser from the user's own username,
// course and completion date. Nothing is uploaded.

import { useEffect, useState } from 'react';
import { CERT_SIZES, canvasToBlob, renderCertificate, type CertFormat } from './certificateRender';

interface Props {
  open: boolean;
  onClose: () => void;
  username: string;
  courseTitle: string;
  courseSlug: string;
  completedAt: Date;
  /** Referral members get their ?ref link, everyone else the plain site. */
  shareUrl: string;
}

const FORMATS: CertFormat[] = ['landscape', 'portrait', 'story'];

export function CertificateModal({ open, onClose, username, courseTitle, courseSlug, completedAt, shareUrl }: Props) {
  const [format, setFormat] = useState<CertFormat>('landscape');
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const message = `I just completed the ${courseTitle} at Black Sheep University on Mitype.`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const canvas = await renderCertificate({ format, username, courseTitle, completedAt });
        if (!cancelled) {
          setPreview(canvas.toDataURL('image/png'));
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [open, format, username, courseTitle, completedAt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function makeBlob(f: CertFormat): Promise<Blob> {
    const canvas = await renderCertificate({ format: f, username, courseTitle, completedAt });
    return canvasToBlob(canvas);
  }

  function fileName(f: CertFormat) {
    return `mitype-${courseSlug}-certificate-${f}.png`;
  }

  async function download(f: CertFormat) {
    setBusy(true);
    setNote('');
    try {
      const blob = await makeBlob(f);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName(f);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setNote('Sorry, the download did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNote('Link copied.');
    } catch {
      setNote(shareUrl);
    }
  }

  async function share() {
    setBusy(true);
    setNote('');
    try {
      const blob = await makeBlob(format);
      const file = new File([blob], fileName(format), { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: courseTitle, text: `${message} ${shareUrl}` });
      } else if (nav.share) {
        await nav.share({ title: courseTitle, text: message, url: shareUrl });
      } else {
        await copyLink();
      }
    } catch (e) {
      // Closing the share sheet is not an error.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setNote('Sharing is not available here. Download the image and copy the link instead.');
      }
    } finally {
      setBusy(false);
    }
  }

  const q = encodeURIComponent;
  const btn: React.CSSProperties = {
    padding: '11px 16px', borderRadius: 100, border: '1px solid rgba(200,149,108,0.45)',
    background: 'white', color: 'var(--brand-personal-text-head)', fontWeight: 800, fontSize: 13.5,
    cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block',
  };
  const primary: React.CSSProperties = { ...btn, background: 'var(--brand-personal)', color: 'white', border: 'none' };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your certificate"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,18,8,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--brand-personal-bg-cream)', borderRadius: 22, width: '100%', maxWidth: 760,
          maxHeight: '94vh', overflowY: 'auto', padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: 'var(--brand-text-primary)' }}>Your certificate</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ ...btn, padding: '6px 12px' }}>Close</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              style={{
                ...btn, padding: '7px 14px', fontSize: 12.5,
                background: format === f ? 'var(--brand-personal)' : 'white',
                color: format === f ? 'white' : 'var(--brand-personal-text-head)',
              }}
            >
              {CERT_SIZES[f].label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(200,149,108,0.08)', borderRadius: 14, padding: 10, minHeight: 120 }}>
          {preview && !failed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={`Certificate of completion for ${courseTitle}`}
              style={{ maxWidth: '100%', maxHeight: '58vh', height: 'auto', width: 'auto', borderRadius: 6 }}
            />
          ) : (
            <p style={{ alignSelf: 'center', fontSize: 14, color: 'var(--brand-personal-text-mid)' }}>
              {failed ? 'The certificate could not be created. Please reload and try again.' : 'Creating your certificate...'}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <button type="button" disabled={busy} onClick={() => download(format)} style={primary}>
            Download {CERT_SIZES[format].label}
          </button>
          <button type="button" disabled={busy} onClick={share} style={btn}>Share</button>
          <button type="button" onClick={copyLink} style={btn}>Copy link</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {FORMATS.filter((f) => f !== format).map((f) => (
            <button key={f} type="button" disabled={busy} onClick={() => download(f)} style={{ ...btn, fontSize: 12.5, padding: '8px 12px' }}>
              Download {CERT_SIZES[f].label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--brand-personal-text-light)', margin: '16px 0 6px' }}>
          Post it with a link back to Mitype
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a style={{ ...btn, fontSize: 12.5, padding: '8px 12px' }} target="_blank" rel="noopener noreferrer"
            href={`https://twitter.com/intent/tweet?text=${q(message)}&url=${q(shareUrl)}`}>X</a>
          <a style={{ ...btn, fontSize: 12.5, padding: '8px 12px' }} target="_blank" rel="noopener noreferrer"
            href={`https://www.facebook.com/sharer/sharer.php?u=${q(shareUrl)}`}>Facebook</a>
          <a style={{ ...btn, fontSize: 12.5, padding: '8px 12px' }} target="_blank" rel="noopener noreferrer"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${q(shareUrl)}`}>LinkedIn</a>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--brand-personal-text-mid)', marginTop: 10 }}>
          Instagram does not allow links to be pre filled, so download the post or story size and add the link
          sticker or put the link in your bio. Your link: {shareUrl}
        </p>
        {note && <p role="status" style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-personal)', marginTop: 8 }}>{note}</p>}
      </div>
    </div>
  );
}
