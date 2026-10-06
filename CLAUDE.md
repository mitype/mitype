@AGENTS.md

## Referral link setup process (only when the owner gives a profile name)

When the owner gives a profile username to convert into a referral link, do exactly this and nothing more:

1. Create `supabase-referrer-<username>.sql` (copy `supabase-referrer-lechefgrewsum33.sql` and swap the username). It must:
   - set `profiles.is_referrer = TRUE` for that username (this converts their profile share link into a referral link and adds Mi Referrals to their burger menu)
   - insert one `referrer_welcome` notification (deduped by type) titled "Your share link is now a referral link", telling them their share link was converted and that their referrals are listed on the Mi Referrals page in the burger menu. Do not add any other explanation; the owner explains the program details to them directly.
   - end with a check SELECT.
2. Present the SQL file so the owner can run it in the Supabase SQL editor. No code change or push is needed.
3. Only do this when the owner names a profile. Never convert anyone otherwise.
