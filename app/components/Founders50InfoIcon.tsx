'use client';
// A small (i) icon that, on click, shows the Founders 50 philosophy
// message as a toast. Used in the opt-in modal, on the subscription
// page, and inside the ProfileCompleteness card.
//
// All three locations share one source of truth for the copy so if we
// ever tune the messaging it changes site-wide in one edit.

import { toast } from '../lib/toast';

export const FOUNDERS_50_INFO_MESSAGE =
  'Mitype seeks to revolutionize the Creator rewards system, different from every other social media platform. We understand the economy and what our creators go through to earn a living, and we plan on assisting our users from simply being an active member. Thank you for being part of the beginning.';

interface Props {
  /** Optional size override — defaults to 20px for inline placement. */
  size?: number;
  /** Optional aria-label context — defaults to a generic label. */
  ariaLabel?: string;
}

export function Founders50InfoIcon({ size = 20, ariaLabel = 'About the Founders 50 Rewards Program' }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        // Longer duration so users have time to read the whole message.
        toast.info(FOUNDERS_50_INFO_MESSAGE, { duration: 12000 });
      }}
      aria-label={ariaLabel}
      title="About the Founders 50 Rewards Program"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1.5px solid var(--brand-personal)',
        background: 'transparent',
        color: 'var(--brand-personal)',
        fontSize: size * 0.6,
        fontWeight: 900,
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      i
    </button>
  );
}
