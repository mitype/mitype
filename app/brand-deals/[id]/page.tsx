'use client';
// /brand-deals/[id] — Individual brief detail + apply flow.
//
// Any signed-in member can view the brief (no paywall on browsing).
// The Apply CTA is gated: only subscribed creators can submit an
// application. Non-subscribers get a soft paywall pointing to the
// subscription page.
//
// After a successful application we also insert a message into the
// existing conversations/messages tables so the negotiation moves
// straight to the shared inbox both sides already know.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { toast } from '../../lib/toast';
import { liquidGlass } from '../../lib/liquidGlass';

interface DealDetail {
  id: string;
  posted_by: string;
  title: string;
  description: string;
  creator_category: string | null;
  deliverables: string[];
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  location_type: 'remote' | 'local' | 'either';
  city: string | null;
  state: string | null;
  timeline: string | null;
  application_deadline: string | null;
  status: 'open' | 'closed' | 'filled';
  applications_count: number;
  created_at: string;
  business: {
    id: string;
    business_name: string;
    logo_url: string | null;
    category: string | null;
    owner_username: string | null;
  } | null;
}

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'Negotiable';
  if (min != null && max != null) {
    if (min === max) return `$${(min / 100).toFixed(0)}`;
    return `$${(min / 100).toFixed(0)}–$${(max / 100).toFixed(0)}`;
  }
  if (max != null) return `Up to $${(max / 100).toFixed(0)}`;
  return `From $${((min ?? 0) / 100).toFixed(0)}`;
}

export default function BrandDealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Application form state
  const [showForm, setShowForm] = useState(false);
  const [intro, setIntro] = useState('');
  const [rate, setRate] = useState('');
  const [timelineInput, setTimelineInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      const [dealRes, subRes] = await Promise.all([
        supabase
          .from('brand_deals')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (!dealRes.data) {
        setLoading(false);
        return;
      }
      const d = dealRes.data;
      const sub = subRes.data?.status;
      const subscribed = sub === 'active' || sub === 'trialing';
      setIsSubscribed(subscribed);
      setIsOwner(d.posted_by === user.id);

      // Load the business + owner username
      const [bizRes, alreadyRes] = await Promise.all([
        supabase
          .from('business_profiles')
          .select('id, business_name, logo_url, category, user_id')
          .eq('id', d.business_id)
          .maybeSingle(),
        supabase
          .from('brand_deal_applications')
          .select('id')
          .eq('deal_id', d.id)
          .eq('creator_id', user.id)
          .maybeSingle(),
      ]);
      const ownerUsernameRes = bizRes.data
        ? await supabase.from('profiles').select('username').eq('user_id', bizRes.data.user_id).maybeSingle()
        : { data: null as any };

      setAlreadyApplied(!!alreadyRes.data);
      setDeal({
        id: d.id,
        posted_by: d.posted_by,
        title: d.title,
        description: d.description,
        creator_category: d.creator_category,
        deliverables: d.deliverables ?? [],
        budget_min_cents: d.budget_min_cents,
        budget_max_cents: d.budget_max_cents,
        location_type: d.location_type,
        city: d.city,
        state: d.state,
        timeline: d.timeline,
        application_deadline: d.application_deadline,
        status: d.status,
        applications_count: d.applications_count ?? 0,
        created_at: d.created_at,
        business: bizRes.data
          ? {
              id: bizRes.data.id,
              business_name: bizRes.data.business_name,
              logo_url: bizRes.data.logo_url,
              category: bizRes.data.category,
              owner_username: ownerUsernameRes.data?.username ?? null,
            }
          : null,
      });
      setLoading(false);
    })();
  }, [id, router]);

  async function submitApplication() {
    if (!deal || !userId) return;
    if (!isSubscribed) {
      router.push('/subscription');
      return;
    }
    if (intro.trim().length < 20) {
      toast.error('Intro message must be at least 20 characters.');
      return;
    }
    setSubmitting(true);

    // Parse rate (allow blank = negotiable)
    let rateCents: number | null = null;
    const rateTrim = rate.trim().replace(/[$,\s]/g, '');
    if (rateTrim) {
      const parsed = Number(rateTrim);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error('Rate must be a positive number.');
        setSubmitting(false);
        return;
      }
      rateCents = Math.round(parsed * 100);
    }

    const { error: appErr } = await supabase.from('brand_deal_applications').insert({
      deal_id: deal.id,
      creator_id: userId,
      intro_message: intro.trim(),
      proposed_rate_cents: rateCents,
      proposed_timeline: timelineInput.trim() || null,
    });
    if (appErr) {
      setSubmitting(false);
      if (appErr.message?.toLowerCase().includes('duplicate')) {
        toast.error("You've already applied to this deal.");
        setAlreadyApplied(true);
        return;
      }
      toast.error(appErr.message || 'Could not submit application.');
      return;
    }

    // Open a conversation between the two parties with the intro as the
    // first message. Non-fatal if this fails — the application still
    // exists and the business will see it in their notifications.
    try {
      const otherId = deal.posted_by;
      const participantIds = [userId, otherId].sort();
      const { data: convo } = await supabase
        .from('conversations')
        .insert({
          participant_ids: participantIds,
          initiated_by: userId,
          status: 'pending',
        })
        .select('id')
        .single();
      if (convo?.id) {
        await supabase.from('messages').insert({
          conversation_id: convo.id,
          sender_id: userId,
          content:
            `[Brand deal application: "${deal.title}"]\n\n${intro.trim()}` +
            (rateCents != null ? `\n\nProposed rate: $${(rateCents / 100).toFixed(0)}` : '') +
            (timelineInput.trim() ? `\nProposed timeline: ${timelineInput.trim()}` : ''),
        });
      }
    } catch {
      // Non-fatal.
    }

    setSubmitting(false);
    setAlreadyApplied(true);
    setShowForm(false);
    toast.success('Application sent. The business will reach out via your inbox.');
  }

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--brand-personal-bg-cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <p style={{ color: 'var(--brand-personal)' }}>Loading deal…</p>
      </main>
    );
  }

  if (!deal) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--brand-personal-bg-cream)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/brand-deals" />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, color: 'var(--brand-text-primary)', marginBottom: 8 }}>Deal not found</h1>
          <p style={{ color: 'var(--brand-personal-text-mid)', marginBottom: 20 }}>
            This brand deal may have been closed or removed.
          </p>
          <Link
            href="/brand-deals"
            style={{
              ...liquidGlass({ tone: 'warm' }),
              display: 'inline-block',
              padding: '10px 22px',
              color: 'var(--brand-text-primary)',
              fontSize: 14, fontWeight: 800, textDecoration: 'none',
            }}
          >
            Browse open deals
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/brand-deals" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        {/* Business header */}
        {deal.business && (
          <div style={{
            display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, overflow: 'hidden',
              background: 'var(--brand-personal-bg-pale)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {deal.business.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={deal.business.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 26 }} aria-hidden="true">🏪</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-personal-text-light)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Posted by
              </p>
              {deal.business.owner_username ? (
                <Link
                  href={`/business/${deal.business.owner_username}`}
                  style={{
                    fontSize: 16, fontWeight: 800, color: 'var(--brand-text-primary)',
                    textDecoration: 'none',
                  }}
                >
                  {deal.business.business_name}
                </Link>
              ) : (
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--brand-text-primary)', margin: 0 }}>
                  {deal.business.business_name}
                </p>
              )}
              {deal.business.category && (
                <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)', margin: '2px 0 0' }}>
                  {deal.business.category}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Title */}
        <h1 style={{
          fontSize: 28, fontWeight: 900, color: 'var(--brand-text-primary)',
          letterSpacing: '-0.6px', marginBottom: 12, lineHeight: 1.2,
        }}>
          {deal.title}
        </h1>

        {/* Meta chips */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          marginBottom: 24,
        }}>
          <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: 'rgba(200,149,108,0.12)', color: 'var(--brand-personal)' }}>
            {formatBudget(deal.budget_min_cents, deal.budget_max_cents)}
          </span>
          {deal.creator_category && (
            <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: 'rgba(56,189,248,0.12)', color: '#0369a1' }}>
              {deal.creator_category}
            </span>
          )}
          <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: 'rgba(21,128,61,0.12)', color: 'var(--brand-market)' }}>
            {deal.location_type === 'remote' ? 'Remote'
              : deal.location_type === 'local' ? `Local · ${deal.city ?? ''} ${deal.state ?? ''}`.trim()
              : 'Remote or local'}
          </span>
          {deal.timeline && (
            <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 800, background: 'rgba(0,0,0,0.05)', color: 'var(--brand-personal-text-mid)' }}>
              Timeline: {deal.timeline}
            </span>
          )}
        </div>

        {/* Description */}
        <div style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: 20,
          padding: '24px 26px',
          marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-personal-text-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            The brief
          </h2>
          <p style={{ color: 'var(--brand-text-primary)', fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>
            {deal.description}
          </p>

          {deal.deliverables.length > 0 && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-personal-text-light)', textTransform: 'uppercase', letterSpacing: '1px', margin: '22px 0 10px' }}>
                Deliverables
              </h2>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--brand-text-primary)', fontSize: 14, lineHeight: 1.7 }}>
                {deal.deliverables.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </>
          )}
        </div>

        {/* Apply / manage CTA */}
        {isOwner ? (
          <div style={{
            padding: '16px 20px', background: 'rgba(200,149,108,0.10)',
            border: '1px solid rgba(200,149,108,0.28)', borderRadius: 16,
            color: 'var(--brand-personal-text-head)', fontSize: 14,
          }}>
            You posted this brief. <strong>{deal.applications_count}</strong> application{deal.applications_count === 1 ? '' : 's'} received. Review them in your Messages inbox.
          </div>
        ) : deal.status !== 'open' ? (
          <div style={{
            padding: '16px 20px', background: 'rgba(0,0,0,0.05)',
            borderRadius: 16, color: 'var(--brand-personal-text-mid)', fontSize: 14, textAlign: 'center',
          }}>
            This brief is no longer accepting applications.
          </div>
        ) : alreadyApplied ? (
          <div style={{
            padding: '16px 20px', background: 'rgba(22,163,74,0.10)',
            border: '1px solid rgba(22,163,74,0.28)', borderRadius: 16,
            color: 'var(--brand-market)', fontSize: 14, textAlign: 'center', fontWeight: 700,
          }}>
            You&apos;ve applied. Check your Messages for the conversation with the business.
          </div>
        ) : !isSubscribed ? (
          <div style={{
            padding: '20px', background: 'white',
            border: '1px solid rgba(200,149,108,0.25)', borderRadius: 20,
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-text-primary)', marginBottom: 6 }}>
              Subscribed creators can apply
            </p>
            <p style={{ fontSize: 13, color: 'var(--brand-personal-text-mid)', marginBottom: 14, lineHeight: 1.5 }}>
              Applying to brand deals is one of the perks of your Mitype subscription. Subscribe to start applying today.
            </p>
            <Link
              href="/subscription"
              style={{
                ...liquidGlass({ tone: 'warm' }),
                display: 'inline-block',
                padding: '11px 24px',
                color: 'var(--brand-text-primary)',
                fontSize: 14, fontWeight: 800, textDecoration: 'none',
              }}
            >
              Subscribe to apply
            </Link>
          </div>
        ) : showForm ? (
          <div style={{
            padding: '22px 22px 20px', background: 'white',
            border: '1px solid rgba(200,149,108,0.25)', borderRadius: 20,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 4 }}>
              Apply to this deal
            </h3>
            <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)', marginBottom: 16 }}>
              Your Mitype profile is shared with the business automatically. No need to re-attach a portfolio here.
            </p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--brand-text-primary)', marginBottom: 4 }}>
              Intro message
            </label>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="Tell the business why you're a good fit. Share links to relevant work if helpful."
              rows={5}
              maxLength={2000}
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid rgba(200,149,108,0.28)',
                borderRadius: 10, fontSize: 15, fontFamily: 'inherit',
                color: 'var(--brand-text-primary)', outline: 'none',
                marginBottom: 12, boxSizing: 'border-box', resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--brand-text-primary)', marginBottom: 4 }}>
                  Your rate (USD)
                </label>
                <input
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 400"
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid rgba(200,149,108,0.28)',
                    borderRadius: 10, fontSize: 16, fontFamily: 'inherit',
                    color: 'var(--brand-text-primary)', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--brand-text-primary)', marginBottom: 4 }}>
                  Timeline you can deliver
                </label>
                <input
                  value={timelineInput}
                  onChange={(e) => setTimelineInput(e.target.value)}
                  placeholder="e.g. 5 business days"
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid rgba(200,149,108,0.28)',
                    borderRadius: 10, fontSize: 16, fontFamily: 'inherit',
                    color: 'var(--brand-text-primary)', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={submitApplication}
                disabled={submitting}
                style={{
                  ...liquidGlass({ tone: 'warm' }),
                  padding: '11px 24px',
                  color: 'var(--brand-text-primary)',
                  fontSize: 14, fontWeight: 800,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Sending…' : 'Send application'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                style={{
                  ...liquidGlass({ tone: 'clear' }),
                  padding: '11px 24px',
                  color: 'var(--brand-personal-text-mid)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            style={{
              ...liquidGlass({ tone: 'warm' }),
              width: '100%',
              padding: '14px 22px',
              color: 'var(--brand-text-primary)',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Apply to this deal
          </button>
        )}
      </div>
    </main>
  );
}
