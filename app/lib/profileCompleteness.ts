// Profile completeness scoring — photo-only rule.
//
// Original design tracked seven fields (photo, bio, prompts, categories,
// links, latest project, ZIP) and summed weighted points to grade the
// profile. That was noisy — users without a website or portfolio got
// nagged forever even though their profile was fine.
//
// New rule (user request): the ONLY thing that determines "complete" is
// whether the user has a profile photo. Everything else in Edit Profile
// stays as an optional field, but doesn't count toward completeness and
// doesn't trigger the dashboard card.
//
// Behavior:
//   * Photo present  → percent = 100 → dashboard card hides completely
//                       (ProfileCompleteness returns null)
//   * Photo missing  → percent = 0   → card shows with a single, focused
//                       "Add a profile photo" CTA

export interface CompletenessStep {
  key: string;
  label: string;
  done: boolean;
  weight: number; // kept on the type for backward compatibility
  href?: string;
}

export interface CompletenessResult {
  percent: number;
  steps: CompletenessStep[];
  doneCount: number;
  totalCount: number;
}

// Loose shape — accepts the raw supabase row so callers don't need to
// import a typed model. Only `avatar_url` and `photos` are actually read.
type ProfileShape = {
  avatar_url?: string | null;
  photos?: Array<{ url?: string | null }> | null;
  bio?: string | null;
  categories?: string[] | null;
  zip_code?: string | null;
  website_url?: string | null;
  portfolio_links?: Array<{ url?: string | null }> | null;
  profile_prompts?: unknown;
  creative_status?: string | null;
};

export function scoreProfileCompleteness(profile: ProfileShape | null | undefined): CompletenessResult {
  const p = profile ?? {};
  // A user has "a photo" if either the mirrored avatar_url is set or
  // any of the entries in the multi-photo `photos` array has a URL.
  const hasAvatar = !!(p.avatar_url && p.avatar_url.trim());
  const hasAnyPhoto = hasAvatar || ((p.photos ?? []).some((x) => (x?.url ?? '').trim()));

  const step: CompletenessStep = {
    key: 'avatar',
    label: 'Add a profile photo',
    done: hasAnyPhoto,
    weight: 100,
    href: '/edit-profile',
  };

  return {
    percent: hasAnyPhoto ? 100 : 0,
    steps: [step],
    doneCount: hasAnyPhoto ? 1 : 0,
    totalCount: 1,
  };
}
