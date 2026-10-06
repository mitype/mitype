'use client';
// Interactive tools for the Cottage Bakery Masterclass.
//   PriceCalculator: cost per unit and suggested price.
//   CapTracker: how much of the yearly sales cap is used, plus pace.
// Everything runs in the browser. Nothing is saved or sent anywhere.

import { useMemo, useState } from 'react';
import { STATE_RULES } from './cottageStateRules';

const box: React.CSSProperties = {
  margin: '8px 0 24px',
  padding: '20px 18px',
  background: 'rgba(200,149,108,0.07)',
  border: '1px solid rgba(200,149,108,0.25)',
  borderRadius: 18,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 800,
  color: 'var(--brand-personal-text-light)',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 12,
  border: '1px solid rgba(200,149,108,0.4)',
  background: 'white',
  fontSize: 15,
  fontFamily: 'inherit',
  color: 'var(--brand-text-primary)',
  boxSizing: 'border-box',
};

const resultRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '8px 0',
  borderBottom: '1px solid rgba(200,149,108,0.18)',
  fontSize: 15,
  color: 'var(--brand-personal-text-head)',
};

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Field({ id, label, value, onChange, step = '0.01' }: {
  id: string; label: string; value: string; onChange: (v: string) => void; step?: string;
}) {
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

export function PriceCalculator() {
  const [yieldUnits, setYieldUnits] = useState('24');
  const [ingredients, setIngredients] = useState('9.60');
  const [packaging, setPackaging] = useState('0.35');
  const [hours, setHours] = useState('2');
  const [rate, setRate] = useState('20');
  const [overheadPct, setOverheadPct] = useState('10');
  const [feePct, setFeePct] = useState('3');
  const [margin, setMargin] = useState('30');

  const r = useMemo(() => {
    const units = num(yieldUnits);
    if (units <= 0) return null;
    const ing = num(ingredients) / units;
    const pack = num(packaging);
    const labor = (num(hours) * num(rate)) / units;
    const subtotal = ing + pack + labor;
    const overhead = subtotal * (num(overheadPct) / 100);
    const cost = subtotal + overhead;
    const m = Math.min(num(margin), 90) / 100;
    const fee = Math.min(num(feePct), 20) / 100;
    // Price so that after card fees, profit is the target share of price.
    const denom = 1 - m - fee;
    const price = denom > 0 ? cost / denom : 0;
    const profit = price - cost - price * fee;
    return { ing, pack, labor, overhead, cost, price, profit, units };
  }, [yieldUnits, ingredients, packaging, hours, rate, overheadPct, feePct, margin]);

  return (
    <div style={box}>
      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 12 }}>
        Cost and Price Calculator
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Field id="pc-yield" label="Units per batch" value={yieldUnits} onChange={setYieldUnits} step="1" />
        <Field id="pc-ing" label="Ingredient cost per batch ($)" value={ingredients} onChange={setIngredients} />
        <Field id="pc-pack" label="Packaging and label per unit ($)" value={packaging} onChange={setPackaging} />
        <Field id="pc-hours" label="Hours per batch (all work)" value={hours} onChange={setHours} step="0.25" />
        <Field id="pc-rate" label="Your hourly rate ($)" value={rate} onChange={setRate} />
        <Field id="pc-over" label="Overhead (%)" value={overheadPct} onChange={setOverheadPct} step="1" />
        <Field id="pc-fee" label="Card and platform fees (%)" value={feePct} onChange={setFeePct} step="0.1" />
        <Field id="pc-margin" label="Target profit (% of price)" value={margin} onChange={setMargin} step="1" />
      </div>
      {r ? (
        <div>
          <div style={resultRow}><span>Ingredients per unit</span><strong>{money(r.ing)}</strong></div>
          <div style={resultRow}><span>Packaging per unit</span><strong>{money(r.pack)}</strong></div>
          <div style={resultRow}><span>Labor per unit</span><strong>{money(r.labor)}</strong></div>
          <div style={resultRow}><span>Overhead per unit</span><strong>{money(r.overhead)}</strong></div>
          <div style={resultRow}><span>Total cost per unit</span><strong>{money(r.cost)}</strong></div>
          <div style={{ ...resultRow, borderBottom: 'none', fontSize: 17 }}>
            <span>Suggested price per unit</span>
            <strong style={{ color: 'var(--brand-personal)' }}>{r.price > 0 ? money(r.price) : 'Check your inputs'}</strong>
          </div>
          {r.price > 0 && (
            <div style={resultRow}>
              <span>Profit per unit after fees</span>
              <strong>{money(r.profit)} ({money(r.profit * r.units)} per batch)</strong>
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--brand-personal-text-mid)' }}>Enter at least one unit per batch.</p>
      )}
      <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--brand-personal-text-light)', margin: '14px 0 0' }}>
        The starting numbers are an example. Replace them with your own. Nothing you type here is saved or sent anywhere.
        Round the suggested price to a clean number and compare it with your local market before you decide.
      </p>
    </div>
  );
}

export function CapTracker() {
  const [state, setState] = useState('');
  const [cap, setCap] = useState('50000');
  const [sales, setSales] = useState('0');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));

  const rule = STATE_RULES.find((s) => s.state === state);
  const capN = num(cap);
  const salesN = num(sales);
  const m = Math.min(Math.max(Math.round(num(month)), 1), 12);
  const pct = capN > 0 ? (salesN / capN) * 100 : 0;
  const remaining = Math.max(capN - salesN, 0);
  const pace = salesN / m;
  const projected = pace * 12;
  const monthsLeft = 12 - m;
  const allowance = monthsLeft > 0 ? remaining / monthsLeft : remaining;

  let status = 'Comfortable';
  let color = '#15803d';
  if (capN > 0 && (pct >= 90 || projected > capN * 1.1)) { status = 'Act now: plan your next step'; color = '#b91c1c'; }
  else if (capN > 0 && (pct >= 60 || projected > capN)) { status = 'Watch closely: start planning'; color = '#b45309'; }

  return (
    <div style={box}>
      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 12 }}>
        Sales Cap Tracker
      </p>
      <label htmlFor="ct-state" style={labelStyle}>Look up your state's cap (optional)</label>
      <select
        id="ct-state"
        value={state}
        onChange={(e) => setState(e.target.value)}
        style={{ ...inputStyle, marginBottom: 8 }}
      >
        <option value="">Select a state</option>
        {STATE_RULES.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
      </select>
      {rule && (
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--brand-personal-text-head)', margin: '0 0 14px' }}>
          {rule.state}: {rule.cap}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Field id="ct-cap" label="Your yearly cap ($)" value={cap} onChange={setCap} step="100" />
        <Field id="ct-sales" label="Gross sales so far this year ($)" value={sales} onChange={setSales} step="10" />
        <Field id="ct-month" label="Current month (1 to 12)" value={month} onChange={setMonth} step="1" />
      </div>
      {capN > 0 ? (
        <div>
          <div style={{ height: 12, borderRadius: 100, background: 'rgba(200,149,108,0.18)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 100 }} />
          </div>
          <div style={resultRow}><span>Cap used</span><strong>{pct.toFixed(1)} percent</strong></div>
          <div style={resultRow}><span>Room left this year</span><strong>{money(remaining)}</strong></div>
          <div style={resultRow}><span>Average sales per month so far</span><strong>{money(pace)}</strong></div>
          <div style={resultRow}><span>Projected year end at this pace</span><strong>{money(projected)}</strong></div>
          <div style={resultRow}><span>Monthly room for the rest of the year</span><strong>{money(allowance)}</strong></div>
          <div style={{ ...resultRow, borderBottom: 'none' }}>
            <span>Status</span><strong style={{ color }}>{status}</strong>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--brand-personal-text-mid)' }}>
          Your state may have no cap. If so, you can skip this tracker, but still record your sales.
        </p>
      )}
      <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--brand-personal-text-light)', margin: '14px 0 0' }}>
        Caps usually count gross sales, not profit, and a few states count per product or use a different year.
        Confirm how your state counts it. Nothing you type here is saved or sent anywhere.
      </p>
    </div>
  );
}
