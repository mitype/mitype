# Mitype Security Audit

Method: read all API routes, auth helpers, RLS/SQL migrations and config; then confirmed findings against the **live site** with read-only requests made the way an outsider (anonymous, using only the public anon key that ships in every web page) would make them. No data was changed. No member data was copied.

## Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Anyone, signed in or not, can download every member's full profile including date of birth, ZIP, travel dates and flags | **High** | Fix designed, needs your decision (below) |
| 2 | Members can set `is_referrer` on themselves | Medium | Fixed in `supabase-security-hardening.sql` |
| 3 | Share-image routes fetch any web address given in the link | Medium-Low | Fixed in code |
| 4 | `is_subscribed()` and `prune_rate_limit_log()` callable by signed-out visitors | Low | Fixed in `supabase-security-hardening.sql` |
| 5 | Public file listings for avatars, business logos, pet photos, moments | Low | Accepted / by design |
| 6 | Content-Security-Policy is minimal | Low | Recommendation |
| 7 | In-memory API rate limit is per server instance | Low | Recommendation |

## 1. Profile data is readable by the whole internet (High)

**Verified live.** With only the public key, a signed-out request returned all 52 profiles with all 46 columns. That included `date_of_birth` for 50 members, `zip_code` for 32, travel city and travel end date, `is_admin`, `is_cmo`, `referred_by`, `last_active_at` and the other internal flags.

**Why it exists.** The rule "Profiles are publicly readable" (`USING (true)`) lets every visitor read every column of every row. The public profile page also loads `select('*')` for signed-out visitors, so shared profile links work. That is intended. Exposing the private columns is not.

**Realistic attack.** A script pulls the whole table in one request: name handle + exact birth date + ZIP code is enough to identify or locate many people, and travel dates tell someone when a member is away from home. It also contradicts the promise on the landing page ("Your email and personal details stay yours"). Scrapers, stalkers, identity thieves and data brokers are the realistic users. If any member is under 18 or in a privacy-regulated region, it is also a legal exposure.

**Recommended fix (two parts, must ship together):**
1. Database: remove signed-out access to the private columns using column permissions. Keep a short allow-list for signed-out visitors (username, bio, avatar, categories, links, prompts, photos, city, state, etc.). Signed-in members keep today's access.
2. Code: make the public profile page and the public business page ask for the allow-listed columns when nobody is signed in (age is simply not shown to signed-out visitors).

**Better long-term:** signed-in members also do not need other members' exact birth dates (the app only shows an age). Store a computed age/age-band column and stop exposing `date_of_birth` to anyone but its owner.

**Why not done yet:** it changes the public profile page, a growth feature, and the order of deploy matters (a wrong order breaks shared profile links). I want your go-ahead and a live check of a logged-out profile view.

## 2. `is_referrer` self-promotion (Medium)

Admin and CMO flags were already locked by a trigger, but `is_referrer` was only locked on insert. A member could update it on their own profile and unlock the Mi Referrals page and referral-link behavior. The app never changes it from the browser, so locking it has no effect on normal use. Fixed in `supabase-security-hardening.sql` (you set it from the SQL editor as before).

## 3. Share-image routes could fetch any URL (Medium-Low)

`/api/share-image` and `/api/current-share-image` accepted any `https://` address as the avatar and fetched it server-side. Someone could use your server as an image relay or to waste your compute. They now accept only images from your own Supabase storage. (Fixed in code; one deploy.)

## 4. Functions callable by signed-out visitors (Low)

Confirmed live: `prune_rate_limit_log()` ran for an anonymous caller (harmless data, but should never be public) and `is_subscribed(uid)` answered for any member ID. Fixed in the SQL file. Verified protected already: `send_push`, `push_interaction` (permission denied for outsiders).

## 5. Public storage listings (Low, accepted)

Signed-out callers can list files in the `avatars`, `business-logos`, `pet-photos` and `moments` buckets. These buckets are public by design (their images are served by URL), so the extra exposure is only that names can be enumerated. `message-media` and `wave-videos` returned nothing to outsiders.

## What I checked and found sound

- No secrets committed (`.env*` ignored; no keys in tracked files).
- Admin switch route requires a signed-in admin; PayPal webhook verifies PayPal's signature and fails closed; push send and cron routes require a secret (cron confirmed live: 401 without it).
- Payment creation refuses members who already have access and checks the PayPal `custom_id` matches the caller.
- Members cannot write their own `subscriptions` row (read-only policy).
- Admin, CMO flags locked against self-edit; usernames reserved for staff names.
- Only one use of `dangerouslySetInnerHTML` (a fixed theme script, no user input). No open-redirect parameters found.
- Security headers present (HSTS, no framing, nosniff, referrer policy, permissions policy).

## Recommendations

- **CSP:** the current policy blocks framing and form hijacking but does not restrict scripts. Moving to a full script policy needs testing with PayPal and Sentry; do it on a staging copy.
- **Rate limiting:** add Vercel Firewall rate rules for `/api/*` and login; the in-app limiter only counts per server instance.
- **Monitoring:** alert on repeated 401/403 from the webhook and cron routes, and on spikes in profile reads.
- **Backups:** confirm Supabase point-in-time recovery is on.
- **Dependency checks:** run `npm audit` regularly and turn on GitHub Dependabot alerts.
