// Mi Home Goods — listing categories.
//
// Tighter list than the creator categories because the marketplace is
// a different mental model: people scan by "what kind of thing is
// this", not by skill type. Keep this list edit-friendly — additions
// land seamlessly in the picker.

export interface HomeGoodsCategory {
  key: string;
  emoji: string;
  label: string;
}

export const HOME_GOODS_CATEGORIES: HomeGoodsCategory[] = [
  { key: 'furniture',    emoji: '🛋️', label: 'Furniture' },
  { key: 'home-decor',   emoji: '🖼️', label: 'Home decor' },
  { key: 'kitchen',      emoji: '🍳', label: 'Kitchen & dining' },
  { key: 'appliances',   emoji: '🧺', label: 'Appliances' },
  { key: 'clothing',     emoji: '👕', label: 'Clothing & shoes' },
  { key: 'jewelry',      emoji: '💍', label: 'Jewelry & accessories' },
  { key: 'electronics',  emoji: '💻', label: 'Electronics' },
  { key: 'phones',       emoji: '📱', label: 'Phones & tablets' },
  { key: 'cameras',      emoji: '📷', label: 'Cameras' },
  { key: 'audio',        emoji: '🎧', label: 'Audio & music gear' },
  { key: 'instruments',  emoji: '🎸', label: 'Musical instruments' },
  { key: 'art-supplies', emoji: '🎨', label: 'Art & craft supplies' },
  { key: 'books',        emoji: '📚', label: 'Books & media' },
  { key: 'games',        emoji: '🎮', label: 'Games & toys' },
  { key: 'sports',       emoji: '⚽', label: 'Sports & fitness' },
  { key: 'outdoors',     emoji: '🏕️', label: 'Outdoors & camping' },
  { key: 'tools',        emoji: '🔧', label: 'Tools & DIY' },
  { key: 'garden',       emoji: '🪴', label: 'Garden & patio' },
  { key: 'baby-kids',    emoji: '👶', label: 'Baby & kids' },
  { key: 'pet-supplies', emoji: '🐾', label: 'Pet supplies' },
  { key: 'beauty',       emoji: '💄', label: 'Beauty & wellness' },
  { key: 'vintage',      emoji: '🕰️', label: 'Vintage & collectibles' },
  { key: 'auto',         emoji: '🚗', label: 'Auto parts & accessories' },
  { key: 'free',         emoji: '🎁', label: 'Free stuff' },
  { key: 'other',        emoji: '📦', label: 'Other' },
];

export const HOME_GOODS_CATEGORY_BY_KEY: Record<string, HomeGoodsCategory> =
  Object.fromEntries(HOME_GOODS_CATEGORIES.map((c) => [c.key, c]));

export function categoryLabel(key: string | null | undefined): string {
  if (!key) return 'Uncategorized';
  return HOME_GOODS_CATEGORY_BY_KEY[key]?.label ?? key;
}

export function categoryEmoji(key: string | null | undefined): string {
  if (!key) return '📦';
  return HOME_GOODS_CATEGORY_BY_KEY[key]?.emoji ?? '📦';
}

// ─────────────────────── Condition options ─────────────────────────

export type HomeGoodsCondition =
  | 'new'
  | 'new-in-box'
  | 'like-new'
  | 'gently-used'
  | 'used'
  | 'for-parts';

export interface ConditionEntry {
  key: HomeGoodsCondition;
  label: string;
  blurb: string;
}

export const HOME_GOODS_CONDITIONS: ConditionEntry[] = [
  { key: 'new',          label: 'Brand new',     blurb: 'Unused, no signs of wear.' },
  { key: 'new-in-box',   label: 'New in box',    blurb: 'Sealed, never opened.' },
  { key: 'like-new',     label: 'Like new',      blurb: 'Used once or twice. No flaws.' },
  { key: 'gently-used',  label: 'Gently used',   blurb: 'Light wear, fully functional.' },
  { key: 'used',         label: 'Fairly used',   blurb: 'Visible wear but works fine.' },
  { key: 'for-parts',    label: 'For parts',     blurb: 'Damaged or sold for components.' },
];

export const HOME_GOODS_CONDITION_BY_KEY: Record<string, ConditionEntry> =
  Object.fromEntries(HOME_GOODS_CONDITIONS.map((c) => [c.key, c]));

export function conditionLabel(key: string | null | undefined): string {
  if (!key) return '—';
  return HOME_GOODS_CONDITION_BY_KEY[key]?.label ?? key;
}

// Format integer cents as a clean USD-style display string.
// Handles the 'free' special case + the 'OBO' suffix.
export function formatPrice(priceCents: number | null | undefined, kind?: string | null): string {
  if (kind === 'free' || (priceCents !== null && priceCents !== undefined && priceCents === 0)) {
    return 'Free';
  }
  if (priceCents === null || priceCents === undefined) return '—';
  const dollars = priceCents / 100;
  const formatted = dollars.toLocaleString('en-US', {
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return kind === 'obo' ? `$${formatted} OBO` : `$${formatted}`;
}
