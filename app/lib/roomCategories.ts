// Single source of truth for Room categories. Used by:
//   - the CreateRoomModal picker
//   - the Discover Rooms tab filter chips
//   - the conversations.category column for rooms
//
// We deliberately keep this list TIGHTER than the creator categories.
// Rooms are about communities/hangouts, not individual disciplines —
// a "Photographer" creator category is too narrow for a room. Instead
// we group several into "Visual arts" so a room can pull in everyone
// who'd be interested.

export interface RoomCategoryEntry {
  /** stored in conversations.category */
  key: string;
  emoji: string;
  label: string;
  /** Tagline shown beneath in the picker. */
  tagline: string;
}

export const ROOM_CATEGORIES: RoomCategoryEntry[] = [
  // ─── Creative work ───
  { key: 'visual-arts',    emoji: '🎨', label: 'Visual arts',     tagline: 'Painters, illustrators, designers, photographers.' },
  { key: 'music',          emoji: '🎵', label: 'Music',            tagline: 'Musicians, producers, singers, DJs.' },
  { key: 'film-video',     emoji: '🎬', label: 'Film & video',     tagline: 'Filmmakers, videographers, editors.' },
  { key: 'writing',        emoji: '✍️', label: 'Writing',          tagline: 'Authors, poets, journalists, copywriters.' },
  { key: 'performing-arts', emoji: '🎭', label: 'Performing arts', tagline: 'Actors, dancers, comedians, theater folk.' },

  // ─── Digital / content ───
  { key: 'creators',       emoji: '🤳', label: 'Creators & influencers', tagline: 'TikTok, IG, YouTube, Twitch.' },
  { key: 'podcasters',     emoji: '🎙️', label: 'Podcasters',       tagline: 'Solo, panel, narrative. All welcome.' },
  { key: 'gamers',         emoji: '🎮', label: 'Gamers',           tagline: 'Streamers, esports, casual play, devs.' },
  { key: 'tech',           emoji: '💻', label: 'Tech & dev',       tagline: 'Web, app, AI, hardware tinkerers.' },

  // ─── Small business / hustle ───
  { key: 'small-business', emoji: '🏪', label: 'Small business',   tagline: 'Owners, side-hustlers, e-commerce.' },
  { key: 'food',           emoji: '🍳', label: 'Food & cooking',   tagline: 'Chefs, bakers, food creators, home cooks.' },
  { key: 'fashion',        emoji: '👗', label: 'Fashion & style',  tagline: 'Designers, stylists, model crews.' },
  { key: 'beauty',         emoji: '💄', label: 'Beauty & wellness', tagline: 'MUA, hair, skin, holistic wellness.' },

  // ─── Lifestyle / interest ───
  { key: 'fitness',        emoji: '🏋️', label: 'Fitness',         tagline: 'Training, sports, athletes, coaching.' },
  { key: 'outdoors',       emoji: '🏔️', label: 'Outdoors',        tagline: 'Hikers, climbers, surfers, campers.' },
  { key: 'travel',         emoji: '✈️', label: 'Travel',           tagline: 'Wanderers, expats, travel creators.' },
  { key: 'family',         emoji: '👨‍👩‍👧', label: 'Family & parenting', tagline: 'Parents, family creators, kid-friendly.' },
  { key: 'pets',           emoji: '🐶', label: 'Pets',             tagline: 'Pet owners, trainers, pet creators.' },

  // ─── Connection ───
  { key: 'local',          emoji: '📍', label: 'Local hangout',    tagline: 'Tied to a specific city, town, or region.' },
  { key: 'skill-share',    emoji: '🧠', label: 'Skill share',      tagline: 'Teach what you know, learn from peers.' },
  { key: 'hangout',        emoji: '☕', label: 'Just hanging out', tagline: 'Casual chat with no agenda.' },
];

export const ROOM_CATEGORY_BY_KEY: Record<string, RoomCategoryEntry> =
  Object.fromEntries(ROOM_CATEGORIES.map((c) => [c.key, c]));

export function roomCategoryLabel(key: string | null | undefined): string {
  if (!key) return 'Uncategorized';
  return ROOM_CATEGORY_BY_KEY[key]?.label ?? key;
}

export function roomCategoryEmoji(key: string | null | undefined): string {
  if (!key) return '💬';
  return ROOM_CATEGORY_BY_KEY[key]?.emoji ?? '💬';
}
