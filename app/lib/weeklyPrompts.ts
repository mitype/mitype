// Weekly Creative Prompt
// ----------------------
// A curated list of open-ended prompts. Which prompt is "active" is derived
// purely from the current ISO week — no admin tooling needed. The list is
// long enough (52+) that the rotation doesn't repeat within a year.
//
// Each prompt has:
//   - text:    the question shown to the user
//   - prompt:  a short eyebrow label ("This week's prompt")
//   - tagline: a one-line nudge to invite a thoughtful answer
//
// Public API:
//   - currentWeekKey(): "YYYY-Wnn" (ISO week label) for the current week
//   - getPromptForWeekKey(weekKey): the active prompt text + metadata
//   - currentPrompt(): convenience wrapper for "today's prompt"

export interface WeeklyPrompt {
  text: string;
  tagline: string;
}

// 52 prompts — one per ISO week — chosen to invite stories rather than
// one-liners. Mix of craft, identity, taste, and small-scale wonder.
export const WEEKLY_PROMPTS: WeeklyPrompt[] = [
  { text: 'Show me your current creative obsession.', tagline: 'The thing you keep coming back to this month.' },
  { text: "What's the most beautiful mistake you've ever made?", tagline: 'A wrong turn that turned out right.' },
  { text: 'A piece of art that broke you in a good way.', tagline: 'The book / song / film / show that rewired you.' },
  { text: 'Describe your creative process when nothing is working.', tagline: 'How do you get unstuck?' },
  { text: 'The smallest detail in your work that no one notices but you.', tagline: 'A loving secret you want someone to find.' },
  { text: 'A "thing you\'re not good at" you wish you were.', tagline: 'What would you learn if time were free?' },
  { text: 'Your origin story in three sentences.', tagline: 'How did you become the maker you are?' },
  { text: 'The compliment that hit hardest.', tagline: 'A thing someone said that changed how you saw yourself.' },
  { text: "A creative risk you're considering taking.", tagline: 'What scares you in the best way?' },
  { text: 'The soundtrack to your current chapter.', tagline: 'One song. Tell us why.' },
  { text: 'A piece you\'d unmake if you could.', tagline: 'And what you\'d make instead.' },
  { text: 'Describe a day in your dream creative life.', tagline: 'Be specific. The weather, the lunch, all of it.' },
  { text: 'A weird ritual you have before you work.', tagline: 'The thing you tell no one but you.' },
  { text: 'The unfinished project that keeps tugging at you.', tagline: 'What\'s the half-thing you can\'t stop thinking about?' },
  { text: "Something you'd love to collaborate on but haven't yet.", tagline: 'Big dream or specific brief — both welcome.' },
  { text: 'The thing you keep meaning to learn.', tagline: 'What\'s on your "someday" list?' },
  { text: 'A creator (alive or gone) you\'d want at dinner — and what you\'d ask.', tagline: 'One question, one answer.' },
  { text: 'A trend you\'re tired of.', tagline: 'Be honest. We can take it.' },
  { text: 'A trend you secretly love.', tagline: 'Defend the indefensible.' },
  { text: 'The piece of feedback that changed everything.', tagline: 'What did someone say that finally clicked?' },
  { text: 'What you wish more people understood about your craft.', tagline: 'The thing you\'d explain at the dinner table.' },
  { text: 'A cultural moment that shaped you.', tagline: 'Where you were, what you saw, why it stuck.' },
  { text: 'A book / film / album that altered your work.', tagline: 'And what you took from it.' },
  { text: 'The best money you ever spent on your craft.', tagline: 'A tool, a class, a trip — what was it?' },
  { text: 'The piece you\'ve made that scares you to share.', tagline: 'You don\'t have to share it. Just tell us about it.' },
  { text: 'Where your work disagrees with you.', tagline: 'When the thing you made knew more than you did.' },
  { text: 'An opinion you have about creative work that\'s controversial.', tagline: 'No need to fight — just plant the flag.' },
  { text: 'A "creative crime" you\'ve committed.', tagline: 'The petty thing you did and don\'t regret.' },
  { text: 'The kind of audience you want most.', tagline: 'Describe them. Be specific.' },
  { text: 'The reason you make things.', tagline: 'No wrong answers. Just yours.' },
  { text: 'A place that feels like a workshop to you.', tagline: 'It might not be a studio.' },
  { text: 'The medium you wish you understood better.', tagline: 'What feels just out of reach?' },
  { text: 'A small win this month.', tagline: 'Something quietly good.' },
  { text: 'A craft you love that isn\'t yours.', tagline: 'Whose work do you sit with?' },
  { text: 'The version of yourself you\'re trying to grow into.', tagline: 'What does she/he/they make? Wear? Eat?' },
  { text: 'A line of dialogue or a lyric that lives rent-free.', tagline: 'Quote it. Tell us where it\'s from.' },
  { text: 'A childhood thing that explains your taste now.', tagline: 'A toy, a show, a smell, anything.' },
  { text: 'The hardest "no" you\'ve had to say.', tagline: 'Or the one you\'re working up to.' },
  { text: 'A new tool you\'re obsessed with.', tagline: 'Software, hardware, kitchenware — fair game.' },
  { text: 'The weather that brings out your best work.', tagline: 'Be poetic about it.' },
  { text: 'A myth or fairytale that hits different now.', tagline: 'Why does it land?' },
  { text: 'Your favorite thing about the city you\'re in.', tagline: 'Real or aspirational.' },
  { text: 'The piece you\'d put in a museum.', tagline: 'Yours or anyone else\'s. Why?' },
  { text: 'The most generous thing a peer has done for your work.', tagline: 'Pass the credit forward.' },
  { text: 'A texture, color, or sound you\'re currently into.', tagline: 'Help us see what you\'re seeing.' },
  { text: 'A quiet rebellion you\'re running.', tagline: 'Inside the work or outside it.' },
  { text: 'A piece of advice you got and ignored — and were right to.', tagline: 'Brag, gently.' },
  { text: 'A piece of advice you ignored and shouldn\'t have.', tagline: 'Learn out loud with us.' },
  { text: 'The thing about your craft that no school taught you.', tagline: 'How did you actually figure it out?' },
  { text: 'The smallest joy in your weekly routine.', tagline: 'Tiny. Recurring. Loved.' },
  { text: 'What you\'d tell your earliest self about making things.', tagline: 'Short letter. Honest.' },
  { text: 'A moment in the last year when you felt undeniably yourself.', tagline: 'Where were you? What were you doing?' },
];

// ---------------------------------------------------------------------------
// Week selection
// ---------------------------------------------------------------------------

/**
 * ISO 8601 week key for a date — e.g. "2026-W17". Weeks start on Monday;
 * weeks belong to the year that owns Thursday of that week.
 */
export function isoWeekKey(d: Date): string {
  // Copy and operate in UTC to avoid TZ drift around midnight.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day number.
  // (ISO weekday 1=Mon … 7=Sun.)
  const dayNum = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  // Year of the week.
  const year = date.getUTCFullYear();
  // Calc ordinal week: divide by ms-in-a-week.
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the ISO week key for the current moment (UTC).
 */
export function currentWeekKey(): string {
  return isoWeekKey(new Date());
}

/**
 * Returns the prompt for a given ISO week key. We hash the key to an index
 * in WEEKLY_PROMPTS so the same week always returns the same prompt and
 * weeks rotate through the list.
 */
export function getPromptForWeekKey(weekKey: string): WeeklyPrompt {
  // Stable hash: convert "YYYY-Wnn" to a single integer.
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  let idx = 0;
  if (m) {
    const year = parseInt(m[1], 10);
    const week = parseInt(m[2], 10);
    // year*53 spreads adjacent weeks across years so 2026-W01 and 2027-W01
    // don't both hash to slot 0.
    idx = (year * 53 + week) % WEEKLY_PROMPTS.length;
  }
  return WEEKLY_PROMPTS[idx];
}

export function currentPrompt(): WeeklyPrompt {
  return getPromptForWeekKey(currentWeekKey());
}

/**
 * Human-readable label for a week key — e.g. "Week of Apr 20".
 */
export function weekRangeLabel(weekKey: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return weekKey;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);

  // ISO week 1 contains Jan 4. Find that, walk back to its Monday, then
  // step (week - 1) weeks forward.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  const monthShort = monday.toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `Week of ${monthShort} ${monday.getUTCDate()}`;
}

export const MAX_ANSWER_LENGTH = 600;
