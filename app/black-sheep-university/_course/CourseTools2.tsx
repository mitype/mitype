'use client';
// More interactive tools for the Cottage Bakery Masterclass.
//   LabelBuilder: builds and prints a product label draft.
//   RecipeScaler: scales a recipe to a new batch size.
//   PrintableChecklists: tick off or print the master checklists.
//   SeasonalCalendar: a month by month baking and selling plan.
// Everything runs in the browser. Nothing is saved or sent anywhere.

import { useEffect, useState } from 'react';
import { box, inputStyle, labelStyle } from './CourseTools';

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .bsu-print-area, .bsu-print-area * { visibility: visible !important; }
  .bsu-print-area { position: absolute !important; left: 0; top: 0; width: 100%; padding: 24px; background: white; }
}`;

const smallBtn: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 100,
  border: '1px solid rgba(200,149,108,0.45)',
  background: 'white',
  color: 'var(--brand-personal-text-head)',
  fontWeight: 800,
  fontSize: 13.5,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const note: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.55,
  color: 'var(--brand-personal-text-light)',
  margin: '14px 0 0',
};

function printNow() {
  setTimeout(() => window.print(), 60);
}

// ---------------------------------------------------------------------------
// Label builder
// ---------------------------------------------------------------------------

const ALLERGENS = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree nuts', 'Peanuts', 'Wheat', 'Soy', 'Sesame'];

export function LabelBuilder() {
  const [product, setProduct] = useState('Chocolate Chip Cookies');
  const [ingredients, setIngredients] = useState('flour, butter, sugar, brown sugar, eggs, chocolate chips, vanilla extract, baking soda, salt');
  const [allergens, setAllergens] = useState<string[]>(['Wheat', 'Milk', 'Eggs', 'Soy']);
  const [weight, setWeight] = useState('6 oz (170 g)');
  const [maker, setMaker] = useState('Your Name or Business Name');
  const [address, setAddress] = useState('Your city, state');
  const [statement, setStatement] = useState('Made in a home kitchen. Use the exact wording your state requires.');
  const [madeOn, setMadeOn] = useState('');
  const [copied, setCopied] = useState(false);

  function toggle(a: string) {
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  const ing = ingredients.trim()
    ? ingredients.trim().charAt(0).toUpperCase() + ingredients.trim().slice(1)
    : '';
  const ordered = ALLERGENS.filter((a) => allergens.includes(a));
  const lines = [
    product.trim().toUpperCase(),
    ing ? `INGREDIENTS: ${ing}.` : '',
    ordered.length ? `CONTAINS: ${ordered.join(', ')}.` : '',
    weight.trim() ? `NET WT ${weight.trim()}` : '',
    madeOn.trim() ? `MADE ON: ${madeOn.trim()}` : '',
    maker.trim(),
    address.trim(),
    statement.trim(),
  ].filter(Boolean);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div style={box}>
      <style>{PRINT_CSS}</style>
      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 12 }}>Label Builder</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div>
          <label htmlFor="lb-product" style={labelStyle}>Product name</label>
          <input id="lb-product" type="text" value={product} onChange={(e) => setProduct(e.target.value)} style={inputStyle} maxLength={80} />
        </div>
        <div>
          <label htmlFor="lb-weight" style={labelStyle}>Net weight</label>
          <input id="lb-weight" type="text" value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle} maxLength={40} />
        </div>
        <div>
          <label htmlFor="lb-maker" style={labelStyle}>Your name or business name</label>
          <input id="lb-maker" type="text" value={maker} onChange={(e) => setMaker(e.target.value)} style={inputStyle} maxLength={80} />
        </div>
        <div>
          <label htmlFor="lb-address" style={labelStyle}>Address as your state requires</label>
          <input id="lb-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} maxLength={120} />
        </div>
        <div>
          <label htmlFor="lb-date" style={labelStyle}>Made on or best by (optional)</label>
          <input id="lb-date" type="text" value={madeOn} onChange={(e) => setMadeOn(e.target.value)} style={inputStyle} maxLength={40} />
        </div>
      </div>
      <label htmlFor="lb-ing" style={labelStyle}>Ingredients, in order from the most by weight to the least</label>
      <textarea
        id="lb-ing"
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
        rows={3}
        maxLength={600}
        style={{ ...inputStyle, marginBottom: 12, resize: 'vertical' }}
      />
      <p style={labelStyle}>Major allergens in this product</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {ALLERGENS.map((a) => (
          <label key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--brand-personal-text-head)', cursor: 'pointer' }}>
            <input type="checkbox" checked={allergens.includes(a)} onChange={() => toggle(a)} />
            {a}
          </label>
        ))}
      </div>
      <label htmlFor="lb-stmt" style={labelStyle}>Home kitchen statement</label>
      <textarea
        id="lb-stmt"
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        rows={2}
        maxLength={300}
        style={{ ...inputStyle, marginBottom: 16, resize: 'vertical' }}
      />

      <p style={{ ...labelStyle, marginBottom: 8 }}>Preview</p>
      <div
        className="bsu-print-area"
        style={{
          background: 'white',
          border: '2px solid #3b2a18',
          borderRadius: 6,
          padding: '14px 16px',
          maxWidth: 380,
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#1a1208',
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 6px' }}>{lines[0]}</p>
        {lines.slice(1).map((l, i) => (
          <p key={i} style={{ margin: '0 0 5px', fontWeight: l.startsWith('CONTAINS') ? 800 : 400 }}>{l}</p>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <button type="button" style={smallBtn} onClick={printNow}>Print label</button>
        <button type="button" style={smallBtn} onClick={copyText}>{copied ? 'Copied' : 'Copy label text'}</button>
      </div>
      <p style={note}>
        This builds a draft layout. Label rules differ by state, so compare it with your state agency&apos;s
        requirements before you sell, especially the home kitchen statement, address rules, and allergen wording.
        Nothing you type here is saved or sent anywhere.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recipe scaler
// ---------------------------------------------------------------------------

interface Row { name: string; qty: string; unit: string }

export function RecipeScaler() {
  const [rows, setRows] = useState<Row[]>([
    { name: 'Flour', qty: '2.5', unit: 'cups' },
    { name: 'Butter', qty: '1', unit: 'cup' },
    { name: 'Sugar', qty: '1.5', unit: 'cups' },
    { name: 'Eggs', qty: '2', unit: 'whole' },
  ]);
  const [from, setFrom] = useState('24');
  const [to, setTo] = useState('60');

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => (prev.length >= 30 ? prev : [...prev, { name: '', qty: '', unit: '' }]));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const f = parseFloat(from);
  const t = parseFloat(to);
  const factor = Number.isFinite(f) && f > 0 && Number.isFinite(t) && t > 0 ? t / f : 0;

  function scaled(q: string): string {
    const n = parseFloat(q);
    if (!factor || !Number.isFinite(n)) return '';
    const v = n * factor;
    return (Math.round(v * 100) / 100).toString();
  }

  return (
    <div style={box}>
      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 12 }}>Recipe Scaler</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div>
          <label htmlFor="rs-from" style={labelStyle}>Recipe makes (units)</label>
          <input id="rs-from" type="number" inputMode="decimal" min="0" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="rs-to" style={labelStyle}>You want to make (units)</label>
          <input id="rs-to" type="number" inputMode="decimal" min="0" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 2fr) minmax(60px, 1fr) minmax(60px, 1fr) minmax(70px, 1fr) auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
          <div>
            {i === 0 && <label style={labelStyle}>Ingredient</label>}
            <input aria-label={`Ingredient ${i + 1}`} type="text" value={r.name} onChange={(e) => update(i, { name: e.target.value })} style={inputStyle} maxLength={60} />
          </div>
          <div>
            {i === 0 && <label style={labelStyle}>Amount</label>}
            <input aria-label={`Amount ${i + 1}`} type="number" inputMode="decimal" min="0" value={r.qty} onChange={(e) => update(i, { qty: e.target.value })} style={inputStyle} />
          </div>
          <div>
            {i === 0 && <label style={labelStyle}>Unit</label>}
            <input aria-label={`Unit ${i + 1}`} type="text" value={r.unit} onChange={(e) => update(i, { unit: e.target.value })} style={inputStyle} maxLength={20} />
          </div>
          <div>
            {i === 0 && <label style={labelStyle}>New amount</label>}
            <div style={{ ...inputStyle, background: 'rgba(200,149,108,0.1)', fontWeight: 800 }}>{scaled(r.qty) || '0'}</div>
          </div>
          <button type="button" onClick={() => removeRow(i)} aria-label={`Remove ingredient ${i + 1}`} style={{ ...smallBtn, padding: '10px 12px' }}>×</button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
        <button type="button" style={smallBtn} onClick={addRow}>Add ingredient</button>
        <span style={{ fontSize: 14, color: 'var(--brand-personal-text-head)' }}>
          {factor ? `Multiplier: ${Math.round(factor * 1000) / 1000}` : 'Enter both batch sizes'}
        </span>
      </div>
      <p style={note}>
        Scale by weight when you can, because it is more accurate than cups. Bake one scaled test batch before you
        sell it, since spices, leaveners, and bake times do not always scale in a straight line. Nothing you type
        here is saved or sent anywhere.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Printable checklists
// ---------------------------------------------------------------------------

const CHECKLISTS: { id: string; title: string; items: string[] }[] = [
  {
    id: 'first-sale',
    title: 'Before your first sale',
    items: [
      'My products qualify under my state list, confirmed in writing where possible.',
      'I have done any required training, registration, or permit.',
      'I have checked zoning, HOA, lease, county health, and business license rules.',
      'I have insurance, an EIN, a business bank account, and a way to track sales.',
      'My labels are correct and complete.',
      'My food safety routine and records are ready.',
    ],
  },
  {
    id: 'baking-day',
    title: 'Every baking day',
    items: [
      'I am healthy, my hands are washed, and my hair is covered.',
      'The kitchen is clear of pets, kids, and household clutter.',
      'Surfaces and tools are cleaned and sanitized.',
      'I have checked ingredient labels for allergens.',
      'Allergen products are planned and cleaned between.',
      'Products are cooled, packaged, and labeled correctly.',
      'I have logged the batch.',
    ],
  },
  {
    id: 'weekly',
    title: 'Every week',
    items: [
      'I record sales, costs, hours, and units.',
      'I check my fridge and freezer temperatures.',
      'I review upcoming orders against my capacity.',
      'I check my year to date total against my cap.',
    ],
  },
  {
    id: 'market-day',
    title: 'Market day packing list',
    items: [
      'Products, labeled and packed, with a few extra.',
      'Table, tent, weights, and a table cover.',
      'Hand sanitizer, gloves, tongs, and a sample plan if allowed.',
      'Ingredient and allergen cards, plus price signs.',
      'Card reader, cash box with change, and a receipt option.',
      'Permit or registration copy and your business license if needed.',
      'Cooler and ice packs for items that need cold.',
      'Trash bags, wipes, and a way to wash hands.',
    ],
  },
  {
    id: 'quarterly',
    title: 'Every quarter and every January',
    items: [
      'I recheck my state agency page and local requirements.',
      'I recalculate costs and adjust prices.',
      'I review insurance, registration renewals, and training dates.',
      'I review recipes, labels, and suppliers for changes.',
    ],
  },
];

export function PrintableChecklists() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [printId, setPrintId] = useState<string | null>(null);

  useEffect(() => {
    const done = () => setPrintId(null);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  function print(id: string) {
    setPrintId(id);
    printNow();
  }

  return (
    <div style={{ margin: '8px 0 24px' }}>
      <style>{PRINT_CSS}</style>
      {CHECKLISTS.map((c) => (
        <div
          key={c.id}
          className={printId === c.id ? 'bsu-print-area' : undefined}
          style={{ ...box, margin: '0 0 16px' }}
        >
          <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--brand-text-primary)', marginBottom: 10 }}>{c.title}</p>
          {c.items.map((item, i) => {
            const key = `${c.id}-${i}`;
            return (
              <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15, lineHeight: 1.5, color: 'var(--brand-personal-text-head)', marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!checked[key]}
                  onChange={() => setChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
                  style={{ marginTop: 4 }}
                />
                <span>{item}</span>
              </label>
            );
          })}
          <button type="button" style={{ ...smallBtn, marginTop: 6 }} onClick={() => print(c.id)}>Print this list</button>
        </div>
      ))}
      <p style={note}>Your ticks are not saved. Print a list to keep a paper copy for your kitchen.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seasonal calendar
// ---------------------------------------------------------------------------

const MONTHS: { month: string; ideas: string; dates: string; plan: string }[] = [
  { month: 'January', ideas: 'Fresh start treats, citrus, healthier swaps, soups and breads', dates: 'New Year, Super Bowl prep', plan: 'Review last year, reset prices, renew registrations, check your cap and your state agency page.' },
  { month: 'February', ideas: 'Chocolate, red velvet, heart cookies, gift boxes', dates: 'Valentine’s Day (February 14)', plan: 'Open pre orders by the end of January and set a cutoff about a week ahead.' },
  { month: 'March', ideas: 'Spring flavors, lemon, shamrock themes, Easter pre orders', dates: 'St. Patrick’s Day (March 17)', plan: 'Start Easter pre orders and plan spring market applications.' },
  { month: 'April', ideas: 'Easter cookies, hot cross buns, floral themes', dates: 'Easter (date changes each year)', plan: 'Apply for summer markets and refresh your booth signs.' },
  { month: 'May', ideas: 'Mother’s Day gift boxes, graduation treats', dates: 'Mother’s Day (second Sunday), graduation season', plan: 'Cap check before the busy summer. Offer graduation party orders.' },
  { month: 'June', ideas: 'Berries, fruit forward items, wedding favors, Father’s Day', dates: 'Father’s Day (third Sunday)', plan: 'Heat matters. Review transport and cooler plans for markets.' },
  { month: 'July', ideas: 'Patriotic themes, no melt items for hot weather', dates: 'Independence Day (July 4)', plan: 'Mid year review of sales against your cap and your prices.' },
  { month: 'August', ideas: 'Back to school lunchbox treats, peaches, early fall', dates: 'Back to school', plan: 'Plan fall flavors and test new recipes before orders open.' },
  { month: 'September', ideas: 'Apple, pumpkin, cinnamon, tailgate treats', dates: 'Labor Day weekend, football season', plan: 'Launch fall menu and start collecting holiday wait list names.' },
  { month: 'October', ideas: 'Pumpkin, spice, Halloween cookies, harvest breads', dates: 'Halloween (October 31)', plan: 'Open holiday pre orders for November and December. Order packaging early.' },
  { month: 'November', ideas: 'Pies and breads, Thanksgiving sides, gift boxes', dates: 'Thanksgiving (fourth Thursday)', plan: 'Hard cutoff dates. Watch your cap, because this is a big month.' },
  { month: 'December', ideas: 'Cookies, gift tins, spiced and peppermint flavors', dates: 'Christmas, Hanukkah, Kwanzaa, New Year’s Eve', plan: 'Cap your order count, keep records daily, and thank every customer.' },
];

export function SeasonalCalendar() {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  return (
    <div style={{ margin: '8px 0 24px' }}>
      <style>{PRINT_CSS}</style>
      <div className={printing ? 'bsu-print-area' : undefined}>
        {MONTHS.map((m) => (
          <div key={m.month} style={{ ...box, margin: '0 0 10px', padding: '14px 16px' }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--brand-text-primary)', marginBottom: 4 }}>{m.month}</p>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--brand-personal-text-head)', margin: '0 0 3px' }}><strong>Bake:</strong> {m.ideas}</p>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--brand-personal-text-head)', margin: '0 0 3px' }}><strong>Key dates:</strong> {m.dates}</p>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--brand-personal-text-head)', margin: 0 }}><strong>Do:</strong> {m.plan}</p>
          </div>
        ))}
      </div>
      <button type="button" style={smallBtn} onClick={() => { setPrinting(true); printNow(); }}>Print the calendar</button>
      <p style={note}>Use this as a starting plan and adjust it for your region, your products, and your local events.</p>
    </div>
  );
}
