'use client';
// HomeGoodsSafetyModal — one-time safety + liability acknowledgement
// shown to a user before they can use Mi Home Goods.
//
// Worded to protect Mitype from liability for in-person meetups
// and transactions. After acknowledging, we stamp
// `profiles.home_goods_terms_accepted_at` so the user never sees it
// again.
//
// Tone: professional, calm, never alarmist. Reads like a courtesy
// brief, not a scary warning. Users still need to actually check the
// "I understand" box before continuing.

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

interface Props {
  open: boolean;
  userId: string;
  onAcknowledged: () => void;
  /** What pressing the X / "Maybe later" does. Usually navigates away. */
  onDismiss: () => void;
}

export function HomeGoodsSafetyModal({ open, userId, onAcknowledged, onDismiss }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAccept() {
    if (!agreed) {
      toast.error('Please check the box to acknowledge.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ home_goods_terms_accepted_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) throw error;
      onAcknowledged();
    } catch (e: any) {
      console.error('[home-goods-safety] save:', e);
      toast.error(e?.message ?? 'Could not save your acknowledgement.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mi Home Goods safety guidelines"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 16,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: 'min(92vh, 820px)',
          background: 'linear-gradient(180deg, #f7fdf9 0%, #ecfdf5 100%)',
          borderRadius: 28,
          boxShadow: '0 32px 70px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '22px 26px 14px',
          borderBottom: '1px solid rgba(21,128,61,0.18)',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 11px',
            background: 'linear-gradient(135deg, #15803d, #22c55e)',
            borderRadius: 100,
            color: 'white',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            <span aria-hidden="true">🏡</span> Mi Home Goods
          </div>
          <h2 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 900,
            color: '#0f3a23',
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
          }}>
            Before you start, a quick safety brief
          </h2>
          <p style={{
            margin: '6px 0 0',
            fontSize: 13,
            color: '#3a5d48',
            lineHeight: 1.55,
          }}>
            Mi Home Goods lets members buy and sell goods directly. We connect you with each other — what happens after that is up to you. Please read these guidelines once, and you won't see them again.
          </p>
        </div>

        {/* Guidelines */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <Guideline
            icon="🤝"
            title="Mitype is not a party to your transaction"
            body="We do not verify items, hold funds, escrow payments, or arbitrate disputes. Sales are between you and the other member. We are not liable for losses, damages, or disagreements arising from a transaction or meetup."
          />
          <Guideline
            icon="📍"
            title="Meet in public, well-lit places"
            body={<>Many police departments offer free "Safe Trade Zones" with cameras — search your city's department site, or meet at busy public places: shopping mall entrances, libraries, big-box-store parking lots during business hours, busy coffee shops, or fire station lobbies. Avoid private homes unless you've established trust over several transactions.</>}
          />
          <Guideline
            icon="👥"
            title="Bring a friend, share your plans"
            body="Let someone know where you're going, who you're meeting, and when you'll be back. Bring a buddy for higher-value pickups."
          />
          <Guideline
            icon="🔒"
            title="Protect your personal information"
            body="Never share your home address until you trust the other party. Avoid sharing financial passwords, SSN, or bank login details. Mitype messaging is a safer place to negotiate than text or email."
          />
          <Guideline
            icon="💵"
            title="Verify before you pay"
            body="Inspect the item in person. Test electronics if you can. Cash and well-known payment apps work fine for casual sales — never wire money or buy a gift card for an unfamiliar buyer or seller."
          />
          <Guideline
            icon="🧭"
            title="Trust your gut"
            body="If something feels off, walk away. You can always end a conversation or report a listing. No sale is worth your safety."
          />
        </div>

        {/* Acknowledge */}
        <div style={{
          padding: '16px 26px 22px',
          borderTop: '1px solid rgba(21,128,61,0.18)',
          background: 'rgba(255,255,255,0.6)',
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
            marginBottom: 14,
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: '#15803d', flexShrink: 0, marginTop: 2 }}
            />
            <span style={{
              fontSize: 13,
              color: '#0f3a23',
              lineHeight: 1.5,
              fontWeight: 600,
            }}>
              I've read the guidelines above and understand that Mitype is not responsible for transactions, meetups, or any loss or harm arising from them.
            </span>
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreed || saving}
              style={{
                flex: '1 1 240px',
                padding: '14px 20px',
                background: (!agreed || saving)
                  ? 'rgba(21,128,61,0.35)'
                  : 'linear-gradient(135deg, #15803d, #22c55e)',
                color: 'white',
                border: 'none',
                borderRadius: 100,
                fontSize: 15,
                fontWeight: 800,
                cursor: (!agreed || saving) ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: agreed ? '0 10px 24px rgba(21,128,61,0.35)' : 'none',
                letterSpacing: '0.3px',
              }}
            >
              {saving ? 'Saving…' : 'I understand — continue'}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              style={{
                padding: '14px 20px',
                background: 'transparent',
                color: '#3a5d48',
                border: '1px solid rgba(21,128,61,0.35)',
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Guideline({ icon, title, body }: {
  icon: string;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: 14,
      background: 'white',
      border: '1px solid rgba(21,128,61,0.18)',
      borderRadius: 14,
    }}>
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'linear-gradient(135deg, #ecfdf5, #bbf7d0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 800,
          color: '#0f3a23',
          marginBottom: 3,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 13,
          color: '#3a5d48',
          lineHeight: 1.5,
        }}>
          {body}
        </div>
      </div>
    </div>
  );
}
