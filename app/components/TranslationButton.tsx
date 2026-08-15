'use client';
// Reusable "See translation" button, patterned after Instagram/Twitter.
//
// Drop it below any user-written text. If the text is already in
// English (per the languageDetect heuristic), the button does not
// render at all. If it's non-English, the button shows. On tap we
// fetch the English translation and swap the button for the translated
// text inline. Tap again to hide.

import { useState } from 'react';
import { looksLikeEnglish } from '../lib/languageDetect';
import { translateToEnglish } from '../lib/translate';

interface Props {
  /** The user-written text to translate. */
  text: string | null | undefined;
  /** Optional small style override. */
  compact?: boolean;
  /** Set true on dark backgrounds (Currents feed, Wave overlays) so
   *  the button + translated text render in a light color. */
  dark?: boolean;
}

export function TranslationButton({ text, compact = false, dark = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nothing to translate — bail early without rendering.
  if (!text || looksLikeEnglish(text)) return null;

  async function handleClick() {
    if (translated) {
      // Toggle off — hide the translation.
      setTranslated(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const out = await translateToEnglish(text!);
      setTranslated(out || '(no translation returned)');
    } catch {
      setError('Translation unavailable');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: compact ? 4 : 8 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          color: dark ? 'rgba(255,213,168,0.95)' : 'var(--brand-personal)',
          fontSize: compact ? 12 : 13,
          fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          textDecoration: 'none',
        }}
      >
        {loading
          ? 'Translating…'
          : translated
            ? 'Hide translation'
            : 'See translation'}
      </button>
      {translated && (
        <p style={{
          margin: '6px 0 0',
          color: dark ? 'rgba(255,255,255,0.92)' : 'var(--brand-text-primary)',
          fontSize: compact ? 13 : 14,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          fontStyle: 'italic',
          opacity: 0.92,
        }}>
          {translated}
        </p>
      )}
      {error && (
        <p style={{
          margin: '4px 0 0',
          color: dark ? 'rgba(255,255,255,0.6)' : 'var(--brand-personal-text-light)',
          fontSize: 12,
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
