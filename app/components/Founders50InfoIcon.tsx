'use client';
// A small (i) icon that shows a short Founders 50 explanation as a toast.
//

import { toast } from '../lib/toast';

export const FOUNDERS_50_INFO_MESSAGE =
  'The Founders 50 is Mitype\'s referral program. Opting in turns your profile share link into a tracked referral link, and everyone who joins through it appears on your Mi Referrals page.';

interface Props {
  /** Optional size override — defaults to 20px for inline placement. */
  size?: number;
  /** Optional aria-label context — defaults to a generic label. */
  ariaLabel?: string;
}

export function Founders50InfoIcon({ size = 20, ariaLabel = 'About the Founders 50' }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        // Longer duration so users have time to read the whole message.
        toast.info(FOUNDERS_50_INFO_MESSAGE, { duration: 12000 });
      }}
      aria-label={ariaLabel}
      title="About the Founders 50"
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
