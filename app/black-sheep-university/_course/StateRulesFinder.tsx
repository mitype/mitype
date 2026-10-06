'use client';
// State rules finder for the Cottage Bakery Masterclass.
// Learner picks a state and sees its cap, permit, and online rules, plus
// any scheduled change and a link to the state agency. Data lives in
// cottageStateRules.ts so it can be refreshed without touching this file.

import { useMemo, useState } from 'react';
import { STATE_RULES, STATE_RULES_VERIFIED_ON } from './cottageStateRules';

const labelStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 800,
  color: 'var(--brand-personal-text-light)',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: 4,
};

const valueStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.55,
  color: 'var(--brand-personal-text-head)',
  margin: 0,
};

export function StateRulesFinder() {
  const [selected, setSelected] = useState('');
  const rule = useMemo(() => STATE_RULES.find((r) => r.state === selected), [selected]);

  return (
    <div style={{
      margin: '8px 0 24px',
      padding: '20px 18px',
      background: 'rgba(200,149,108,0.07)',
      border: '1px solid rgba(200,149,108,0.25)',
      borderRadius: 18,
    }}>
      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 10 }}>
        State Rules Finder
      </p>
      <label htmlFor="cottage-state" style={{ ...labelStyle, display: 'block' }}>
        Choose your state
      </label>
      <select
        id="cottage-state"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid rgba(200,149,108,0.4)',
          background: 'white',
          fontSize: 15,
          fontFamily: 'inherit',
          color: 'var(--brand-text-primary)',
          marginBottom: 16,
        }}
      >
        <option value="">Select a state</option>
        {STATE_RULES.map((r) => (
          <option key={r.state} value={r.state}>{r.state}</option>
        ))}
      </select>

      {rule && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h4 style={{ fontSize: 19, fontWeight: 900, color: 'var(--brand-text-primary)', margin: 0 }}>
            {rule.state}
          </h4>
          <div>
            <p style={labelStyle}>Yearly sales cap</p>
            <p style={valueStyle}>{rule.cap}</p>
          </div>
          <div>
            <p style={labelStyle}>License, permit, or registration</p>
            <p style={valueStyle}>{rule.permit}</p>
          </div>
          <div>
            <p style={labelStyle}>Online orders and shipping</p>
            <p style={valueStyle}>{rule.online}</p>
          </div>
          {rule.upcoming && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: 12,
            }}>
              <p style={{ ...labelStyle, color: '#92400e' }}>Change coming</p>
              <p style={valueStyle}>{rule.upcoming}</p>
            </div>
          )}
          <a
            href={rule.agencyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '12px 16px',
              background: 'white',
              border: '1px solid rgba(200,149,108,0.35)',
              borderRadius: 14,
              color: 'var(--brand-personal)',
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            <span>{rule.state} state food agency</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}

      <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--brand-personal-text-light)', margin: '16px 0 0' }}>
        Compiled from published state summaries, checked against state agency pages as of {STATE_RULES_VERIFIED_ON}.
        Cottage food rules change often and this is education, not legal advice. Always confirm the current rules,
        in writing, with your state agency and your local health department before your first sale.
      </p>
    </div>
  );
}
