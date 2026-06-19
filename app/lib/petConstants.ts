// Pet feature — shared constants used by the editor and the dog-tag
// renderer. Keep these lists tight; nobody needs a hundred options.

export const PET_TYPES = [
  { key: 'dog',    label: 'Dog',          emoji: '🐶' },
  { key: 'cat',    label: 'Cat',          emoji: '🐱' },
  { key: 'bird',   label: 'Bird',         emoji: '🐦' },
  { key: 'fish',   label: 'Fish',         emoji: '🐠' },
  { key: 'rabbit', label: 'Rabbit',       emoji: '🐰' },
  { key: 'hamster', label: 'Hamster / Small Mammal', emoji: '🐹' },
  { key: 'reptile', label: 'Reptile',     emoji: '🦎' },
  { key: 'horse',  label: 'Horse',        emoji: '🐴' },
  { key: 'farm',   label: 'Farm Animal',  emoji: '🐐' },
  { key: 'exotic', label: 'Exotic',       emoji: '🦜' },
  { key: 'other',  label: 'Other',        emoji: '🐾' },
];

// Color = the outer ring of the metal dog tag. The "metal" gradient
// inside the tag stays brushed-silver; only the bezel takes the color.
// Gold is the default per the user's spec.
export interface TagColor {
  key: string;
  label: string;
  /** Lighter shade of the bezel — top of the gradient. */
  light: string;
  /** Darker shade of the bezel — bottom of the gradient + edge shadow. */
  dark: string;
}

export const TAG_COLORS: TagColor[] = [
  { key: 'gold',     label: 'Gold',      light: '#f5cf6b', dark: '#a67518' },
  { key: 'silver',   label: 'Silver',    light: '#dddee0', dark: '#7d8388' },
  { key: 'rose',     label: 'Rose Gold', light: '#f6c5b3', dark: '#b86a55' },
  { key: 'black',    label: 'Onyx',      light: '#4d4d52', dark: '#0c0c10' },
  { key: 'pink',     label: 'Pink',      light: '#ffb3d1', dark: '#c83673' },
  { key: 'red',      label: 'Red',       light: '#ff7878', dark: '#9d1a1a' },
  { key: 'blue',     label: 'Blue',      light: '#7ec6ff', dark: '#1856a1' },
  { key: 'teal',     label: 'Teal',      light: '#7ee0d3', dark: '#0f6b67' },
  { key: 'green',    label: 'Green',     light: '#92d782', dark: '#2c7a26' },
  { key: 'purple',   label: 'Purple',    light: '#c5a7ff', dark: '#5b3aa6' },
];

export const DEFAULT_TAG_COLOR = 'gold';
export const PET_BIO_MAX = 200;

export function getTagColor(key: string | null | undefined): TagColor {
  return TAG_COLORS.find((c) => c.key === key) ?? TAG_COLORS[0];
}

export function getPetTypeLabel(key: string | null | undefined): string {
  const t = PET_TYPES.find((t) => t.key === key);
  return t ? `${t.emoji} ${t.label}` : '🐾 Pet';
}
