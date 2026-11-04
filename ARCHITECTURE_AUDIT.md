# Mitype Architecture Audit (read-only, no code changed)

Scope: ~67,500 lines in `app/`, 50 pages, 17 API routes, 56 SQL migrations. Method: read key files and grep for patterns across the whole app. Nothing was modified.

## 1. How it is built (architecture)

- **Stack:** Next.js 16 (App Router) on Vercel, Supabase (Postgres, Auth, Storage, Realtime), PayPal for payments, Sentry for errors, web-push for notifications.
- **Rendering model:** 160 of 164 component files are `'use client'`. Almost every page is a client component that talks to Supabase **directly from the browser** (`supabase.from(...)` appears 365 times). Security is therefore enforced by Postgres Row Level Security (RLS), not by server code.
- **Server code:** only 17 API routes. They exist for things the browser cannot do safely: Wave feed/upload/like/report, PayPal create/finalize/webhook, push send, two cron cleanups, the admin "official profile" switch. They use the service-role client (`supabaseAdmin`) and a bearer-token auth helper (`waveAuth`).
- **Global always-on pieces (root layout):** presence tracker, unread-count polling, new-message toast listener, theme/backdrop, install prompt, announcement modals.
- **Typical data flow:** page mounts → `supabase.auth.getUser()` → query `subscriptions` for access → query `profiles` and feature tables → set React state → render. Realtime channels are used only for chat, games and presence.
- **Edge:** `proxy.ts` blocks AI crawlers and applies a per-instance in-memory rate limit to `/api`.

## 2. Critical problems (fix first)

1. **Discover downloads every member to the browser.** `discover/page.tsx` runs `select('*')` on all profiles (no limit), then ranks and filters in the browser. Cost grows with every new member (slower load, more data). Supabase's API returns at most 1,000 rows per request by default, so once Mitype passes ~1,000 members **newer members silently stop appearing**. All published business profiles are loaded the same way. Also `swiped.includes(...)` inside `filter` is slow at scale (n x m).
2. **Chats load the whole conversation.** `loadMessages` in `messages/page.tsx` fetches every message in ascending order with no limit. Long chats get slow, and past 1,000 messages the **newest messages would be the ones cut off**.
3. **Wave feed paging bug.** `api/wave/feed` ranks a pool of 40 videos by score, returns the top 10, but sets the next-page cursor to the `created_at` of the last *ranked* item, not the oldest candidate. Videos ranked 11-40 can be skipped, and some can repeat. It also reloads the viewer's entire like/dismiss/block lists on every request (these only grow).
4. **Unread badge polls a growing table.** `useUnreadCounts` selects every unread message row (just to count them) every 30 seconds per open tab. Needs a database-side count.
5. **No safety net.** There are zero automated tests and no CI. Lint has 20 known errors. Any refactor, including the ones below, currently relies on manual checking.

## 3. Duplicate logic

- **Subscription/access check copied ~45 times.** The `from('subscriptions') ... status === 'active' || 'trialing'` query is pasted into nearly every page (26 identical comparisons). A shared hook, `useSubscriptionGate`, already exists but is **unused**. Risk: one future rule change (grace period, comped accounts, Founders) must be edited in 45 places or members get inconsistent access.
- **Auth lookup repeated 46 times** with `auth.getUser()`, which makes a network round trip to Supabase Auth every time. `getSession()` (local, instant) is enough for deciding what to show because RLS protects the data.
- **Profile lookups** (`from('profiles')`, 82 places) repeat the same "fetch ids then map to usernames/avatars" pattern.
- **Giant single-file pages:** `messages` 2,976 lines, `wave` 2,020, `discover` 1,901, `edit-profile` 1,621, `profile/[username]` 1,324, `PhotoEditor` 1,204. Hard to review, hard to test, slow to compile.

## 4. Performance bottlenecks

- `select('*')` in 26 places pulls columns that are never used.
- Waterfall requests (auth, then subscription, then profile, then data, one after another) on most pages; only a few use `Promise.all`.
- Everything is client-rendered, so first paint waits for JavaScript plus several network calls. No caching (`revalidate`) is used anywhere.
- 21 plain `<img>` tags vs 6 `next/image`; images are not resized or lazily loaded.
- Presence: all online members share **one** global Realtime channel (`mitype-online-users`). Presence sync traffic grows roughly with the square of concurrent users; fine today, a ceiling later.
- `public/wave-intro.mp4` is 6.3 MB.

## 5. Scalability and operational risks

- Per-instance in-memory rate limiting in `proxy.ts` does not coordinate across Vercel instances (the code comments say so). Acceptable as a speed bump only.
- Every Realtime channel and poll runs per tab per user; costs scale with Supabase connection limits.
- 56 loose `.sql` migration files at the repo root with no ordering/ledger; hard to know what is applied where.
- `any` appears ~716 times and 54 `eslint-disable` comments, so TypeScript is not catching data-shape mistakes.

## 6. Maintainability issues

- Dead code: `lib/brand.ts`, `lib/useFoldableViewport.ts`, `lib/useSubscriptionGate.ts`, `components/EndorsementsSection.tsx`, `FeatureExplorer.tsx`, `ScrollIndicator.tsx`, `SmallBusinessCta.tsx` are never imported (verify before deleting).
- `canvas` (a native module) is a production dependency but only used by the one-off script `generate-icons.js`; it should be a devDependency.
- Business logic lives inside page components, mixed with UI.

## 7. Refactoring plan (safest order, each step shippable alone)

**Phase 0 - Safety net (no behavior change)**
1. Add a small test suite for the pure logic that matters most: subscription access rule, discover ranking, compatibility, wave feed scoring, sanitizers. Add a CI check that runs `tsc`, lint and tests on every push.

**Phase 1 - Zero-risk cleanups**
2. Move `canvas` to devDependencies. Remove confirmed-dead files. Fix the 20 lint errors one at a time.

**Phase 2 - Consolidate duplicates (behavior identical)**
3. One `useAccess()` hook/helper for "is this member active or trialing", swapped into pages in small batches, each verified against live behavior.
4. One `useAuthUser()` using `getSession()` first; one profile-map helper.

**Phase 3 - Performance and scale fixes**
5. Messages: load the latest ~50 messages, "load older" on scroll.
6. Unread badge: a database function returning counts (and fewer polls when the tab is hidden).
7. Wave feed: correct the cursor, cache the like/dismiss lists per session.
8. Discover: paginate/page profiles server-side (needs a SQL function or indexed query); select only needed columns.
9. Replace `<img>` with `next/image` where safe; compress the intro video.

**Phase 4 - Structural**
10. Split the 1,000+ line pages into hooks (data) and components (UI), one page per change, starting with `messages`.
11. Add a `migrations/` folder with ordered, numbered SQL.

## 8. Things deliberately NOT touched without tests first

Payments (PayPal routes/webhook), sign-in, subscription rules, RLS policies, and Realtime chat/games. These get changed only after Phase 0 coverage exists.
