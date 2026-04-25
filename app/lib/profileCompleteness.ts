// Profile completeness scoring.
//
// Each step has a fixed point value; total = 100. We grade the profile by
// summing the points for everything that's filled in, and surface the
// missing steps so the user knows what to do next. The list is also ordered
// roughly by impact: avatar + bio + prompts move the needle the most for
// match quality and for Daily Spark openers, so they sit at the top.

import { normalizePrompts } from './profilePrompts';

export interface CompletenessStep {
  key: string;
  label: string;
  done: boolean;
  weight: number; // points contributed when complete
  href?: string;  // where to send the user to fix this step
}

export interface CompletenessResult {
  percent: number; // 0–100, rounded
  steps: CompletenessStep[];
  doneCount: number;
  totalCount: number;
}

// Loose shape for the bits of the profile we care about. Accepts the raw
// row from supabase without forcing every page to import a typed model.
type ProfileShape = {
  avatar_url?: string | null;
  bio?: string | null;
  categories?: string[] | null;
  zip_code?: string | null;
  website_url?: string | null;
  portfolio_links?: Array<{ url?: string | null }> | null;
  profile_prompts?: unknown;
  creative_status?: string | null;
};

const MIN_BIO_LEN = 30;

export function scoreProfileCompleteness(profile: ProfileShape | null | undefined): CompletenessResult {
  const p = profile ?? {};
  const promptCount = normalizePrompts(p.profile_prompts).length;
  const portfolioCount = (p.portfolio_links ?? []).filter((x) => (x?.url ?? '').trim()).length;
  const hasLinks = !!(p.website_url && p.website_url.trim()) || portfolioCount > 0;

  const steps: CompletenessStep[] = [
    {
      key: 'avatar',
      label: 'Add a profile photo',
      done: !!(p.avatar_url && p.avatar_url.trim()),
      weight: 20,
      href: '/edit-profile',
    },
    {
      key: 'bio',
      label: 'Write a bio (30+ characters)',
      done: !!(p.bio && p.bio.trim().length >= MIN_BIO_LEN),
      weight: 15,
      href: '/edit-profile',
    },
    {
      key: 'prompts',
      label: `Answer 3 prompts${promptCount > 0 && promptCount < 3 ? ` (${promptCount}/3 done)` : ''}`,
      done: promptCount >= 3,
      weight: 25,
      href: '/edit-profile',
    },
    {
      key: 'categories',
      label: 'Pick at least one category',
      done: (p.categories?.length ?? 0) > 0,
      weight: 10,
      href: '/edit-profile',
    },
    {
      key: 'links',
      label: 'Add a website or portfolio link',
      done: hasLinks,
      weight: 15,
      href: '/edit-profile',
    },
    {
      key: 'creative_status',
      label: 'Set a creative status',
      done: !!(p.creative_status && p.creative_status.trim()),
      weight: 10,
      href: '/edit-profile',
    },
    {
      key: 'zip',
      label: 'Add your ZIP code',
      done: !!(p.zip_code && p.zip_code.trim()),
      weight: 5,
      href: '/edit-profile',
    },
  ];

  const earned = steps.reduce((sum, s) => sum + (s.done ? s.weight : 0), 0);
  const doneCount = steps.filter((s) => s.done).length;

  return {
    percent: Math.round(earned),
    steps,
    doneCount,
    totalCount: steps.length,
  };
}
