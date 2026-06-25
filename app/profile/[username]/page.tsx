'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { calculateCompatibility, getCompatibilityColor, getCompatibilityLabel, getSharedCategories } from '../../lib/utils';
import { Avatar } from '../../components/Avatar';
import { PetTags, type Pet } from '../../components/PetTags';
import { FeatureTutorial } from '../../components/FeatureTutorial';
import { ProfileSkeleton } from '../../components/Skeleton';
import { toast } from '../../lib/toast';
import { sanitizeText, safeUrl } from '../../lib/sanitize';
import { normalizePrompts, type ProfilePrompt } from '../../lib/profilePrompts';
import { calculateAge } from '../../lib/age';
import { normalizePhotos, type ProfilePhoto } from '../../lib/photos';
import { PhotoGallery } from '../../components/PhotoGallery';
import { OnlineDot } from '../../components/OnlineDot';
import { usePresence } from '../../lib/usePresence';
import { SiteNav } from '../../components/SiteNav';
import { EndorsementsSection } from '../../components/EndorsementsSection';

const PORTFOLIO_ICONS: Record<string, string> = {
  music:    '🎵',
  video:    '🎬',
  photo:    '📸',
  writing:  '✍️',
  art:      '🎨',
  gaming:   '🎮',
  podcast:  '🎙️',
  business: '💼',
  social:   '📱',
  other:    '🔗',
};

type PortfolioLink = {
  type: string;
  url: string;
  title: string;
};

type PublicProfile = {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  categories?: string[] | null;
  zip_code?: string | null;
  city?: string | null;
  state?: string | null;
  travel_city?: string | null;
  travel_state?: string | null;
  travel_ends_at?: string | null;
  open_to_collab?: boolean | null;
  collab_pitch?: string | null;
  featured_wave_id?: string | null;
  created_at?: string | null;
  bio?: string | null;
  website_url?: string | null;
  portfolio_links?: PortfolioLink[] | null;
  profile_prompts?: ProfilePrompt[] | null;
  creative_status?: string | null;
  latest_project_url?: string | null;
  date_of_birth?: string | null;
  photos?: ProfilePhoto[] | null;
  last_active_at?: string | null;
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = React.use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myCategories, setMyCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [blocked, setBlocked] = useState(false);
  // True when this profile owner has posted a wave_videos row in the
  // last 24h. Drives the glowing bronze outline around their avatar
  // that, when tapped, opens /wave?user=<theirUserId>.
  const [hasFreshWave, setHasFreshWave] = useState(false);
  // True when this profile owner has a published business profile.
  // Adds a purple "View Business" pill near the action buttons.
  const [hasBusiness, setHasBusiness] = useState(false);
  // True when this profile owner has at least one active Mi Home Goods
  // listing. Adds a soft-green "Mi Home Goods" pill next to View Business.
  const [hasHomeGoods, setHasHomeGoods] = useState(false);
  // Pets — rendered as hanging dog tags off the top of the profile card.
  const [pets, setPets] = useState<Pet[]>([]);
  // Small Business Recommendations — purple cards rendered under
  // Creative Portfolio. Auto-hides any whose business has been
  // unpublished or removed.
  const [recommendations, setRecommendations] = useState<{
    id: string;
    business_id: string;
    name: string;
    category: string | null;
    logo_url: string | null;
    owner_username: string | null;
  }[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const router = useRouter();
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onlineUsers = usePresence();

  useEffect(() => {
    let cancelled = false;
    const getData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setCurrentUser(user);

        if (user) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('categories')
            .eq('user_id', user.id)
            .maybeSingle();
          if (cancelled) return;
          if (myProfile?.categories) setMyCategories(myProfile.categories);
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        if (cancelled) return;
        if (!profileData) { router.push('/discover'); return; }
        setProfile(profileData as PublicProfile);

        // Track the view. We dedupe at the daily granularity by only
        // inserting if there's no row from the same viewer→viewed pair
        // in the last 24h. Self-views are skipped. Failure is silent
        // so a broken insert never blocks the page load.
        try {
          const { data: meRes } = await supabase.auth.getUser();
          const meId = meRes?.user?.id;
          if (meId && meId !== profileData.user_id) {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: existing } = await supabase
              .from('profile_views')
              .select('id')
              .eq('viewer_id', meId)
              .eq('viewed_id', profileData.user_id)
              .gte('viewed_at', dayAgo)
              .limit(1)
              .maybeSingle();
            if (!existing) {
              await supabase
                .from('profile_views')
                .insert({ viewer_id: meId, viewed_id: profileData.user_id });
            }
          }
        } catch {
          // Silent — non-critical telemetry.
        }

        // Pull this user's business recommendations (purple section).
        // Join the businesses + their owner username for the deep link.
        try {
          const { data: recRows } = await supabase
            .from('business_recommendations')
            .select('id, business_id, display_order, business_profiles(id, business_name, category, logo_url, is_published, user_id)')
            .eq('user_id', profileData.user_id)
            .order('display_order', { ascending: true });
          if (recRows && !cancelled) {
            const validRecs = recRows.filter(
              (r: any) => r.business_profiles && r.business_profiles.is_published
            );
            // Map owner user_id → username for deep links.
            const ownerIds = Array.from(
              new Set(validRecs.map((r: any) => r.business_profiles.user_id))
            );
            const { data: ownerProfiles } = ownerIds.length > 0
              ? await supabase.from('profiles').select('user_id, username').in('user_id', ownerIds)
              : { data: [] as any[] };
            const ownerMap = new Map<string, string>(
              (ownerProfiles ?? []).map((p: any) => [p.user_id, p.username])
            );
            setRecommendations(
              validRecs.map((r: any) => ({
                id: r.id,
                business_id: r.business_id,
                name: r.business_profiles.business_name,
                category: r.business_profiles.category,
                logo_url: r.business_profiles.logo_url,
                owner_username: ownerMap.get(r.business_profiles.user_id) ?? null,
              }))
            );
          }
        } catch {
          // Non-fatal.
        }

        // Pull this user's pet profiles (if any). Tags only render when
        // at least one pet exists.
        try {
          const { data: petRows } = await supabase
            .from('pet_profiles')
            .select('id, name, pet_type, birthday, fav_activity, fav_food, bio, photo_url, tag_color')
            .eq('user_id', profileData.user_id)
            .order('display_order', { ascending: true });
          if (!cancelled && petRows) setPets(petRows as Pet[]);
        } catch {
          // Non-fatal — no tags will render.
        }

        // Check if this user has a published business profile.
        try {
          const { data: bizRow } = await supabase
            .from('business_profiles')
            .select('id')
            .eq('user_id', profileData.user_id)
            .eq('is_published', true)
            .maybeSingle();
          if (!cancelled) setHasBusiness(Boolean(bizRow));
        } catch {
          // Non-fatal.
        }

        // Check if this user has any active Mi Home Goods listings.
        // One cheap count.
        try {
          const { count: hgCount } = await supabase
            .from('home_goods_listings')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', profileData.user_id)
            .eq('status', 'active');
          if (!cancelled) setHasHomeGoods((hgCount ?? 0) > 0);
        } catch {
          // Non-fatal.
        }

        // Check for fresh wave videos in the last 24h. One small query.
        try {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabase
            .from('wave_videos')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profileData.user_id)
            .eq('is_removed', false)
            .gte('created_at', since);
          if (!cancelled) setHasFreshWave((count ?? 0) > 0);
        } catch {
          // Non-fatal — outline just won't show.
        }

        // Check if already blocked.
        //
        // The `blocked_users` table may not exist in every environment
        // (it's not in the base supabase-schema.sql). If Supabase returns
        // an error for a missing relation we swallow it and treat the
        // state as "not blocked" instead of letting the profile page crash.
        if (user) {
          const { data: blockData, error: blockErr } = await supabase
            .from('blocked_users')
            .select('id')
            .eq('user_id', user.id)
            .eq('blocked_user_id', profileData.user_id)
            .maybeSingle();
          if (blockErr) {
            console.warn('[profile] blocked_users lookup failed:', blockErr.message);
          }
          if (!cancelled) setBlocked(!!blockData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    getData();
    return () => { cancelled = true; };
  }, [username, router]);

  useEffect(() => {
    return () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); };
  }, []);

  function shareProfile() {
    const url = window.location.href;
    void (async () => {
      try {
        await navigator.clipboard.writeText(url);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopied(true);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Couldn't copy the link.");
      }
    })();
  }

  async function ensureConversationWithProfile(): Promise<boolean> {
    if (!currentUser || !profile) return false;
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [currentUser.id, profile.user_id])
      .maybeSingle();

    if (!existing) {
      await supabase.from('conversations').insert({
        participant_ids: [currentUser.id, profile.user_id],
        initiated_by: currentUser.id,
        status: 'pending',
      });
      await supabase.from('matches').upsert({
        user_id: currentUser.id,
        target_user_id: profile.user_id,
        direction: 'right',
      });
    }
    return true;
  }

  async function sendMessage() {
    if (!currentUser) { router.push('/login'); return; }
    if (!profile) return;
    await ensureConversationWithProfile();
    router.push(`/messages?user=${profile.user_id}`);
  }

  // "Reply to a prompt" — pre-fills the chat compose with the prompt the
  // user is responding to so they don't have to think about an opener.
  async function replyToPrompt(prompt: string, answer: string) {
    if (!currentUser) { router.push('/login'); return; }
    if (!profile) return;
    await ensureConversationWithProfile();
    // Truncate the answer for the prefill — long answers blow out the
    // compose box. The "About" framing reads naturally in chat.
    const trimmed = answer.length > 140 ? answer.slice(0, 137) + '…' : answer;
    const prefill = `About "${trimmed}". `;
    const url = `/messages?user=${profile.user_id}&prefill=${encodeURIComponent(prefill)}`;
    router.push(url);
  }

  async function handleBlock() {
    if (!currentUser || !profile) return;

    if (blocked) {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('blocked_user_id', profile.user_id);
      if (error) {
        toast.error('Block feature is not available yet.');
        return;
      }
      setBlocked(false);
      toast.success('User unblocked.');
    } else {
      const confirmed = window.confirm(
        `Are you sure you want to block @${profile.username}? They will no longer be able to contact you.`
      );
      if (!confirmed) return;
      const { error } = await supabase.from('blocked_users').insert({
        user_id: currentUser.id,
        blocked_user_id: profile.user_id,
      });
      if (error) {
        toast.error('Block feature is not available yet.');
        return;
      }
      setBlocked(true);
      toast.success(`@${profile.username} has been blocked.`);
    }
  }

  async function handleReport() {
    if (!currentUser || !profile || !reportReason.trim()) return;

    const { error } = await supabase.from('blocked_users').upsert({
      user_id: currentUser.id,
      blocked_user_id: profile.user_id,
      reason: reportReason.trim(),
    });

    if (error) {
      // Report storage not available — still thank the user so they
      // aren't stuck; follow up by logging for manual review.
      console.warn('[profile] report upsert failed:', error.message);
    }

    setReportSent(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportSent(false);
      setReportReason('');
    }, 2000);
  }

  if (loading) return <ProfileSkeleton />;

  if (!profile) return (
    <main style={{
      minHeight: '100vh', background: '#faf6f0', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: 24, textAlign: 'center',
    }}>
      <p style={{ color: '#8a7560', fontSize: 16 }}>Profile not found.</p>
      <Link href="/discover" style={{ color: '#c8956c', fontWeight: 600, marginTop: 12 }}>Back to Discover</Link>
    </main>
  );

  const isOwnProfile = currentUser?.id === profile.user_id;
  const score = !isOwnProfile && myCategories.length > 0
    ? calculateCompatibility(myCategories, profile.categories ?? []) : 0;
  const scoreColor = getCompatibilityColor(score);
  const scoreLabel = getCompatibilityLabel(score);
  const sharedCats = getSharedCategories(myCategories, profile.categories ?? []);
  const portfolioLinks = (profile.portfolio_links ?? []).filter((p) => p.url?.trim());
  const profilePrompts = normalizePrompts(profile.profile_prompts);
  // The first photo is mirrored into avatar_url at save time, so the
  // gallery here is intentionally just the *additional* photos to avoid
  // duplicating the big avatar that's already shown at the top of the page.
  const galleryPhotos = normalizePhotos(profile.photos).slice(1);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>

      {/* Report Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24,
        }}>
          <div style={{
            background: 'white', borderRadius: 24, padding: '32px',
            maxWidth: 440, width: '100%',
          }}>
            {reportSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1208', marginBottom: 8 }}>
                  Report submitted
                </h2>
                <p style={{ color: '#a89278', fontSize: 14 }}>
                  Thank you for keeping Mitype safe. We will review this report.
                </p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1208', marginBottom: 8 }}>
                  Report @{profile.username}
                </h2>
                <p style={{ color: '#a89278', fontSize: 14, marginBottom: 20 }}>
                  Help us understand what is wrong with this profile.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {[
                    'Fake or impersonation',
                    'Harassment or bullying',
                    'Inappropriate content',
                    'Spam or scam',
                    'Underage user',
                    'Other',
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      style={{
                        padding: '12px 16px',
                        background: reportReason === reason ? 'rgba(200,149,108,0.15)' : '#faf6f0',
                        border: reportReason === reason ? '1.5px solid #c8956c' : '1px solid rgba(200,149,108,0.2)',
                        borderRadius: 12,
                        color: reportReason === reason ? '#c8956c' : '#6b5744',
                        fontSize: 14,
                        fontWeight: reportReason === reason ? 700 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowReportModal(false)}
                    style={{
                      flex: 1, padding: '12px', background: 'white',
                      border: '1px solid rgba(200,149,108,0.3)', borderRadius: 100,
                      color: '#8a7560', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason.trim()}
                    style={{
                      flex: 1, padding: '12px',
                      background: reportReason.trim() ? '#c8956c' : '#d4a882',
                      border: 'none', borderRadius: 100, color: 'white',
                      fontSize: 14, fontWeight: 700,
                      cursor: reportReason.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Nav — signed-in users get the universal SiteNav hamburger;
          unauthenticated viewers get a slim sign-in/join CTA. */}
      {currentUser ? (
        <SiteNav userId={currentUser.id} showBack backFallbackHref="/discover" />
      ) : (
        <nav style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 40px', borderBottom: '1px solid rgba(200,149,108,0.15)',
          background: 'rgba(250,246,240,0.9)', backdropFilter: 'blur(10px)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <Link href="/" style={{ fontSize: 24, fontWeight: 900, color: '#c8956c', letterSpacing: '-1px', textDecoration: 'none' }}>
            mitype
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Sign In</Link>
            <Link href="/signup" style={{ background: '#c8956c', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700, padding: '8px 20px', borderRadius: 100 }}>
              Join Free
            </Link>
          </div>
        </nav>
      )}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>

        {/* Profile Card */}
        <div style={{
          background: 'white', border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: 32,
          // overflow: 'visible' so dog-tag chains can extend a bit above
          // the bronze banner. Top corners of children are still clipped
          // by the card's own border-radius via individual styling.
          overflow: 'visible',
          boxShadow: '0 20px 60px rgba(0,0,0,0.06)', marginBottom: 24,
          position: 'relative',
        }}>
          <div style={{
            height: 100,
            background: 'linear-gradient(135deg, #e8d5c4 0%, #c8956c 100%)',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
          }} />

          {/* Pet dog tags — hang from the top-right of the bronze banner.
              Chain starts AT the top edge of the card (topOffsetPx=0)
              and a V-shaped beaded chain threads down into each tag's
              hole. Sizes are kept modest so the cluster never crowds
              the profile photo on the left. */}
          {pets.length > 0 && (
            <PetTags
              pets={pets}
              parentWidth={200}
              anchorRightPx={36}
              topOffsetPx={0}
            />
          )}

          <div style={{ padding: '0 32px 32px' }}>
            <div style={{
              marginTop: -50, marginBottom: 16, display: 'flex',
              justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12,
            }}>
              {/* Avatar — wrapped in a glowing bronze gradient outline
                  when this creator has Wave videos in the last 24h.
                  Tapping the avatar in that state opens the Wave feed
                  scoped to just their videos. Works for both your own
                  profile (see your own Wave) and other creators. */}
              {hasFreshWave ? (
                <Link
                  href={`/wave?user=${encodeURIComponent(profile.user_id)}`}
                  aria-label={isOwnProfile
                    ? 'Watch your Wave videos'
                    : `Watch ${profile.username}'s Wave videos`}
                  style={{
                    display: 'inline-block',
                    padding: 4,
                    borderRadius: 20,
                    background: 'linear-gradient(135deg, #c8956c 0%, #ffb37c 50%, #c8956c 100%)',
                    boxShadow: '0 0 24px rgba(200,149,108,0.6)',
                    animation: 'mitype-profile-freshwave 2.4s ease-in-out infinite',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{
                    width: 100, height: 125, borderRadius: 16,
                    border: '3px solid white',
                    background: '#f0e8df', overflow: 'hidden', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    boxSizing: 'border-box',
                  }}>
                    <Avatar
                      src={profile.avatar_url}
                      alt={`${profile.username} profile photo`}
                      width={100}
                      height={125}
                      fallbackFontSize={48}
                      sizes="100px"
                    />
                  </div>
                  <div style={{
                    position: 'absolute',
                    background: 'linear-gradient(135deg, #c8956c 0%, #ffb37c 100%)',
                    color: 'white',
                    padding: '3px 9px',
                    borderRadius: 100,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                    transform: 'translate(-50%, -50%)',
                    left: '50%',
                    marginTop: -8,
                    boxShadow: '0 4px 12px rgba(200,149,108,0.55)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}>
                    🌊 WATCH
                  </div>
                </Link>
              ) : (
                <div style={{
                  width: 100, height: 125, borderRadius: 16, border: '4px solid white',
                  background: '#f0e8df', overflow: 'hidden', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                }}>
                  <Avatar
                    src={profile.avatar_url}
                    alt={`${profile.username} profile photo`}
                    width={100}
                    height={125}
                    fallbackFontSize={48}
                    sizes="100px"
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, paddingBottom: 4, flexWrap: 'wrap' }}>
                {hasBusiness && (
                  <Link
                    href={`/business/${profile.username}`}
                    style={{
                      padding: '10px 18px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
                      border: 'none',
                      borderRadius: 100,
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: 'none',
                      boxShadow: '0 8px 22px rgba(139,92,246,0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    🏪 View Business
                  </Link>
                )}
                {hasHomeGoods && (
                  <Link
                    href={`/home-goods/by/${profile.username}`}
                    style={{
                      padding: '10px 18px',
                      background: 'white',
                      border: '1px solid rgba(21,128,61,0.4)',
                      borderRadius: 100,
                      color: '#15803d',
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: 'none',
                      boxShadow: '0 8px 22px rgba(21,128,61,0.18)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    🏡 Home Goods
                  </Link>
                )}
                <button onClick={shareProfile} style={{
                  padding: '10px 20px', background: 'white',
                  border: '1px solid rgba(200,149,108,0.3)', borderRadius: 100,
                  color: '#8a7560', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {copied ? 'Copied!' : 'Share'}
                </button>

                {isOwnProfile ? (
                  <Link href="/edit-profile" style={{
                    padding: '10px 20px', background: 'white',
                    border: '1px solid rgba(200,149,108,0.3)', borderRadius: 100,
                    color: '#8a7560', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  }}>
                    Edit Profile
                  </Link>
                ) : currentUser ? (
                  <>
                    <button onClick={sendMessage} style={{
                      padding: '10px 20px', background: '#c8956c', border: 'none',
                      borderRadius: 100, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>
                      Message
                    </button>
                    <button
                      onClick={handleBlock}
                      aria-label={blocked ? `Unblock ${profile.username}` : `Block ${profile.username}`}
                      style={{
                        padding: '10px 16px', background: blocked ? '#fff0f0' : 'white',
                        border: blocked ? '1px solid rgba(220,100,100,0.3)' : '1px solid rgba(200,149,108,0.3)',
                        borderRadius: 100, color: blocked ? '#c07070' : '#8a7560',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {blocked ? 'Unblock' : '🚫 Block'}
                    </button>
                    <button
                      onClick={() => setShowReportModal(true)}
                      aria-label={`Report ${profile.username}`}
                      style={{
                        padding: '10px 16px', background: 'white',
                        border: '1px solid rgba(200,149,108,0.3)', borderRadius: 100,
                        color: '#8a7560', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      ⚠️ Report
                    </button>
                  </>
                ) : (
                  <Link href="/signup" style={{
                    padding: '10px 20px', background: '#c8956c', borderRadius: 100,
                    color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none',
                  }}>
                    Connect
                  </Link>
                )}
              </div>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1208', letterSpacing: '-0.5px', marginBottom: 8 }}>
              @{profile.username}
              {(() => {
                const age = calculateAge(profile.date_of_birth);
                if (age === null) return null;
                return (
                  <span style={{ color: '#a89278', fontWeight: 600, fontSize: 22, marginLeft: 10 }}>
                    · {age}
                  </span>
                );
              })()}
            </h1>

            {/* Open to collab pill — shows up first thing under the
                handle when the creator has flipped the toggle on. */}
            {profile.open_to_collab && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #c8956c, #ffb37c)',
                borderRadius: 100,
                color: 'white',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.3px',
                marginBottom: 12,
                boxShadow: '0 6px 16px rgba(200,149,108,0.3)',
              }}>
                <span aria-hidden="true">✨</span>
                Open to collab
              </div>
            )}
            {profile.open_to_collab && profile.collab_pitch && (
              <p style={{
                fontSize: 13,
                color: '#5b4a36',
                lineHeight: 1.45,
                margin: '-4px 0 12px',
                fontStyle: 'italic',
              }}>
                "{profile.collab_pitch}"
              </p>
            )}

            <div style={{ marginBottom: 12 }}>
              <OnlineDot
                userId={profile.user_id}
                lastActiveAt={profile.last_active_at}
                online={onlineUsers}
                size="md"
              />
            </div>

            {profile.creative_status && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(200,149,108,0.08)',
                border: '1px solid rgba(200,149,108,0.2)',
                borderRadius: 100,
                padding: '6px 14px',
                marginBottom: 12,
                flexWrap: 'wrap',
                maxWidth: '100%',
              }}>
                <div style={{ width: 8, height: 8, background: '#c8956c', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: '#6b5744', fontSize: 13, fontWeight: 600 }}>{profile.creative_status}</span>
                {(() => {
                  const projectHref = safeUrl(profile.latest_project_url);
                  if (!projectHref) return null;
                  return (
                    <a
                      href={projectHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#c8956c',
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: 'none',
                        borderLeft: '1px solid rgba(200,149,108,0.4)',
                        paddingLeft: 8,
                      }}
                    >
                      View project →
                    </a>
                  );
                })()}
              </div>
            )}

            {/* Location line. We prefer City, State when set; fall back
                to the ZIP for older profiles. If travel mode is live we
                surface where they're visiting and through when. */}
            {(() => {
              const hasCityState = !!(profile.city || profile.state);
              const home = hasCityState
                ? [profile.city, profile.state].filter(Boolean).join(', ')
                : profile.zip_code ?? null;
              const travelLive = profile.travel_ends_at
                && new Date(profile.travel_ends_at).getTime() > Date.now()
                && (profile.travel_city || profile.travel_state);
              if (!home && !travelLive) return null;
              return (
                <div style={{ marginBottom: 16, color: '#a89278', fontSize: 14, lineHeight: 1.5 }}>
                  {home && <p style={{ margin: 0 }}>📍 {home}</p>}
                  {travelLive && (
                    <p style={{ margin: '2px 0 0', color: '#c8956c', fontWeight: 700 }}>
                      ✈️ In {[profile.travel_city, profile.travel_state].filter(Boolean).join(', ')} through {' '}
                      {new Date(profile.travel_ends_at!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Member since YYYY */}
            {profile.created_at && (
              <p style={{
                margin: '0 0 16px',
                fontSize: 12,
                color: '#a89278',
                letterSpacing: '0.2px',
              }}>
                Member since {new Date(profile.created_at).getFullYear()}
              </p>
            )}

            {/* Featured Wave video — bronze CTA links to the
                creator's Wave feed, starting with that one. */}
            {profile.featured_wave_id && (
              <Link
                href={`/wave?user=${profile.user_id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  marginBottom: 16,
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 60%, #c8956c 100%)',
                  borderRadius: 14,
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.2px',
                  boxShadow: '0 8px 20px rgba(45,90,138,0.25)',
                }}
              >
                <span aria-hidden="true">🎬</span>
                Watch their featured Wave
                <span aria-hidden="true" style={{ fontSize: 16 }}>→</span>
              </Link>
            )}

            {profile.bio && (
              <p style={{
                color: '#6b5744', fontSize: 15, lineHeight: 1.7, marginBottom: 20,
                whiteSpace: 'pre-wrap', // preserve line breaks from user input
              }}>
                {sanitizeText(profile.bio)}
              </p>
            )}

            {(profile.categories?.length ?? 0) > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#a89278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  Categories
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(profile.categories ?? []).map((cat: string) => (
                    <span key={cat} style={{
                      background: sharedCats.includes(cat) ? 'rgba(34,197,94,0.1)' : 'rgba(200,149,108,0.1)',
                      border: sharedCats.includes(cat) ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(200,149,108,0.25)',
                      color: sharedCats.includes(cat) ? '#16a34a' : '#c8956c',
                      padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                    }}>
                      {sharedCats.includes(cat) ? '✓ ' : ''}{cat}
                    </span>
                  ))}
                </div>
                {sharedCats.length > 0 && (
                  <p style={{ color: '#16a34a', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                    Green = shared interest with you
                  </p>
                )}
              </div>
            )}

            {(() => {
              const websiteHref = safeUrl(profile.website_url);
              if (!websiteHref) return null;
              return (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#a89278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                    Website
                  </p>
                  <a
                    href={websiteHref}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: '#c8956c', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
                  >
                    {sanitizeText(profile.website_url)}
                  </a>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Photo Gallery */}
        <PhotoGallery photos={galleryPhotos} altPrefix={profile.username} />

        {/* Endorsements — short notes from connected creators. Anyone
            can read; only people you've messaged can write. */}
        <EndorsementsSection
          profileUserId={profile.user_id}
          profileUsername={profile.username}
          viewerId={currentUser?.id ?? null}
          isOwnProfile={isOwnProfile}
        />

        {/* Compatibility Score Card */}
        {!isOwnProfile && currentUser && score > 0 && (
          <div style={{
            background: 'white', border: `1px solid ${scoreColor}40`,
            borderRadius: 24, padding: '28px 32px', marginBottom: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: sharedCats.length > 0 ? 20 : 0 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#a89278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Your Compatibility</p>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: scoreColor, letterSpacing: '-0.5px' }}>{score}% Compatible</h2>
                <p style={{ color: '#a89278', fontSize: 14, fontWeight: 600 }}>{scoreLabel}</p>
              </div>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${scoreColor}15`, border: `3px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor }}>{score}%</span>
              </div>
            </div>
            {sharedCats.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#a89278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>You both create</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sharedCats.map((cat) => (
                    <span key={cat} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#16a34a', padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Prompts */}
        {profilePrompts.length > 0 && (
          <div style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.2)',
            borderRadius: 24,
            padding: '28px 32px',
            marginBottom: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          }}>
            <p style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#a89278',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 16,
            }}>
              About me
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {profilePrompts.map((p, i) => (
                <div
                  key={i}
                  style={{
                    background: '#faf6f0',
                    border: '1px solid rgba(200,149,108,0.15)',
                    borderRadius: 16,
                    padding: '16px 18px',
                    position: 'relative',
                  }}
                >
                  <p style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#c8956c',
                    marginBottom: 6,
                  }}>
                    {sanitizeText(p.prompt)}
                  </p>
                  <p style={{
                    fontSize: 15,
                    color: '#1a1208',
                    lineHeight: 1.5,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {sanitizeText(p.answer)}
                  </p>
                  {!isOwnProfile && currentUser && (
                    <button
                      type="button"
                      onClick={() => replyToPrompt(p.prompt, p.answer)}
                      aria-label={`Reply to "${p.prompt}"`}
                      style={{
                        marginTop: 12,
                        padding: '8px 16px',
                        background: 'white',
                        border: '1px solid rgba(200,149,108,0.35)',
                        borderRadius: 100,
                        color: '#c8956c',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      💬 Reply to this →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Small Businesses I Recommend — purple section below
            Categories, above Creative Portfolio. Only visible when
            this profile owner has at least one published recommendation. */}
        {recommendations.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #f6f3fb 0%, #ebe5f5 100%)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 24,
            padding: '28px 32px',
            marginBottom: 24,
            boxShadow: '0 8px 32px rgba(139,92,246,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>🏪</span>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                Small Businesses I Recommend
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {recommendations.map((r) => (
                <Link
                  key={r.id}
                  href={r.owner_username ? `/business/${r.owner_username}` : '#'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 12,
                    background: 'white',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 14,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(139,92,246,0.06)',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: r.logo_url
                      ? `url(${r.logo_url}) center / cover`
                      : 'linear-gradient(135deg, #8b5cf6, #c084fc)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: 'white',
                  }}>
                    {!r.logo_url && '🏪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 800, color: '#1a1208',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {r.name}
                    </div>
                    {r.category && (
                      <div style={{
                        fontSize: 11, color: '#5b21b6', fontWeight: 700,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {r.category}
                      </div>
                    )}
                  </div>
                  <span style={{ color: '#8b5cf6', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Creative Portfolio */}
        {portfolioLinks.length > 0 && (
          <div style={{ background: 'white', border: '1px solid rgba(200,149,108,0.2)', borderRadius: 24, padding: '28px 32px', marginBottom: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#a89278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Creative Portfolio</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {portfolioLinks.map((link, index) => {
                const href = safeUrl(link.url);
                if (!href) return null;
                const title = sanitizeText(link.title) || link.type;
                return (
                  <a
                    key={index}
                    href={href}
                    target="_blank" rel="noopener noreferrer"
                    aria-label={`Open ${title} in a new tab`}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#faf6f0', border: '1px solid rgba(200,149,108,0.15)', borderRadius: 14, textDecoration: 'none' }}
                  >
                    <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(200,149,108,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {PORTFOLIO_ICONS[link.type] ?? '🔗'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1208', marginBottom: 2 }}>{title}</p>
                      <p style={{ fontSize: 12, color: '#c8956c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sanitizeText(link.url)}</p>
                    </div>
                    <span aria-hidden="true" style={{ color: '#c8956c', fontSize: 18, flexShrink: 0 }}>→</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Not logged in CTA */}
        {!currentUser && (
          <div style={{ background: 'white', border: '1px solid rgba(200,149,108,0.2)', borderRadius: 24, padding: '40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a1208', marginBottom: 8 }}>Connect with @{profile.username}</h2>
            <p style={{ color: '#a89278', fontSize: 15, marginBottom: 24 }}>Join Mitype free to see compatibility score and send a message!</p>
            <Link href="/signup" style={{ display: 'inline-block', padding: '14px 36px', background: '#c8956c', color: 'white', borderRadius: 100, textDecoration: 'none', fontSize: 15, fontWeight: 700 }}>
              Join Free
            </Link>
          </div>
        )}
      </div>
      <style>{`
        @keyframes mitype-profile-freshwave {
          0%, 100% { box-shadow: 0 0 24px rgba(200,149,108,0.6); }
          50% { box-shadow: 0 0 32px rgba(200,149,108,0.9); }
        }
      `}</style>

      {/* One-time tour of the new profile-page features. */}
      <FeatureTutorial
        storageKey="mitype-profile-features-v2"
        eyebrow="New on Profiles"
        slides={[
          {
            icon: '🐾',
            title: 'Hanging Mipet tags',
            body: "If a creator has added pets, you'll see Mipet dog tags hanging from a chain on the right side of their profile card. Tap any tag to open the pet’s full profile.",
          },
          {
            icon: '🌊',
            title: 'Fresh Wave glow',
            body: "When this profile owner has a new Wave video posted in the last 24 hours, their avatar pulses with a bronze gradient glow. Tap the avatar to drop straight into their personal Wave feed.",
          },
          {
            icon: '🏪',
            title: 'View Business pill',
            body: "If this person runs a small business, a purple 🏪 View Business pill appears next to Share. One tap takes you to their business profile.",
          },
          {
            icon: '💜',
            title: 'Small Businesses I Recommend',
            body: 'Every profile can now showcase up to 10 small businesses they personally recommend, in a purple section above the Creative Portfolio. Tap any card to see the business. Discover your favorites through people you trust.',
          },
          {
            icon: '🔔',
            title: 'Notification bell',
            body: 'A bell appeared in your dashboard nav. When someone recommends your business, sends you a love note, or anything else, you’ll see an unread badge here.',
          },
        ]}
      />
    </main>
  );
}