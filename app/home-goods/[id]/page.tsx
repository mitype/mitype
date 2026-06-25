'use client';
// /home-goods/[id] — detail page for a single listing.
//
// Public to all authenticated users so even free-tier visitors can
// browse + decide to subscribe. Only the seller can edit / mark sold
// / hide / delete. Buyers can save (heart) and message the seller —
// messaging requires a subscription so we route free users to
// /subscription when they tap that button.

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../../lib/toast';
import { SiteNav } from '../../components/SiteNav';
import { Avatar } from '../../components/Avatar';
import { HomeGoodsSellerStats } from '../../components/HomeGoodsSellerStats';
import {
  categoryEmoji,
  categoryLabel,
  conditionLabel,
  formatPrice,
} from '../../lib/homeGoodsCategories';

interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price_cents: number | null;
  price_kind: string | null;
  condition: string;
  category: string;
  photo_urls: string[];
  city: string | null;
  state: string | null;
  status: string;
  created_at: string;
}

interface SellerProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [user, setUser] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsSubscribed(sub?.status === 'active' || sub?.status === 'trialing');

      // Listing
      const { data: rec, error } = await supabase
        .from('home_goods_listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !rec) {
        toast.error('Listing not found.');
        router.push('/home-goods');
        return;
      }
      setListing(rec as Listing);

      // Seller profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .eq('user_id', rec.seller_id)
        .maybeSingle();
      setSeller(prof as SellerProfile);

      // Already saved?
      const { data: existing } = await supabase
        .from('home_goods_saves')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .maybeSingle();
      setSaved(!!existing);

      setLoading(false);
    })();
  }, [id, router]);

  async function toggleSave() {
    if (!user || !listing) return;
    setBusy(true);
    try {
      if (saved) {
        await supabase
          .from('home_goods_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listing.id);
        setSaved(false);
      } else {
        const { error } = await supabase
          .from('home_goods_saves')
          .insert({ user_id: user.id, listing_id: listing.id });
        if (error) throw error;
        setSaved(true);
        toast.success('Saved');
        // Light-touch engagement loop: ping the seller that someone
        // saved their listing (unless it's their own).
        if (listing.seller_id !== user.id) {
          try {
            await supabase.from('notifications').insert({
              user_id: listing.seller_id,
              type: 'home_goods_save',
              title: 'Someone saved your listing',
              body: `"${listing.title}" was added to a Mitype member's saved items.`,
              action_url: `/home-goods/${listing.id}`,
            });
          } catch {
            // Non-fatal — the save still worked.
          }
        }
      }
    } catch (e: any) {
      console.error('[home-goods/detail] save toggle failed:', e);
      toast.error(e?.message ?? 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function messageSeller() {
    if (!user || !listing || !seller) return;
    if (!isSubscribed) {
      router.push('/subscription');
      return;
    }
    if (seller.user_id === user.id) {
      toast.info("That's your own listing.");
      return;
    }
    const prefill =
      `Hi! I'm interested in your "${listing.title}". ${formatPrice(listing.price_cents, listing.price_kind)}. Is it still available?`;
    router.push(
      `/messages?user=${encodeURIComponent(seller.user_id)}&prefill=${encodeURIComponent(prefill)}`
    );
  }

  async function markSold() {
    if (!listing || !user || listing.seller_id !== user.id) return;
    if (!confirm('Mark this listing as sold?')) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('home_goods_listings')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('id', listing.id);
      if (error) throw error;
      setListing({ ...listing, status: 'sold' });
      toast.success('Marked as sold');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not update.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteListing() {
    if (!listing || !user || listing.seller_id !== user.id) return;
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('home_goods_listings')
        .delete()
        .eq('id', listing.id);
      if (error) throw error;
      toast.success('Listing deleted');
      router.push('/home-goods/mine');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not delete.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !listing) {
    return (
      <main style={{
        minHeight: '100vh', background: 'var(--brand-market-bg-pale)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <p style={{ color: 'var(--brand-market-text-mid)' }}>Loading…</p>
      </main>
    );
  }

  const isOwn = user?.id === listing.seller_id;
  const photos = listing.photo_urls ?? [];
  const where = [listing.city, listing.state].filter(Boolean).join(', ');

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-market-bg-pale) 0%, var(--brand-market-bg-mint) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={user?.id} showBack backFallbackHref="/home-goods" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
        {/* Photo gallery */}
        <div style={{
          background: 'white',
          borderRadius: 22,
          overflow: 'hidden',
          border: '1px solid rgba(21,128,61,0.18)',
          boxShadow: '0 8px 22px rgba(21,128,61,0.08)',
        }}>
          <div style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            background: photos[activePhoto]
              ? `url(${photos[activePhoto]}) center/cover no-repeat`
              : 'linear-gradient(135deg, var(--brand-market-bg-mint), #bbf7d0)',
          }}>
            {photos.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 96, opacity: 0.7,
              }}>
                {categoryEmoji(listing.category)}
              </div>
            )}
            {listing.status === 'sold' && (
              <span style={{
                position: 'absolute',
                top: 14, left: 14,
                padding: '6px 14px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                Sold
              </span>
            )}
          </div>
          {photos.length > 1 && (
            <div style={{
              display: 'flex',
              gap: 6,
              padding: 10,
              overflowX: 'auto',
            }}>
              {photos.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  aria-label={`View photo ${i + 1}`}
                  style={{
                    width: 64, height: 64,
                    background: `url(${url}) center/cover no-repeat`,
                    border: `2px solid ${i === activePhoto ? 'var(--brand-market)' : 'transparent'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Price + title */}
        <div style={{ marginTop: 18 }}>
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            color: 'var(--brand-market)',
            letterSpacing: '-0.5px',
            marginBottom: 4,
          }}>
            {formatPrice(listing.price_cents, listing.price_kind)}
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--brand-market-deep)',
            letterSpacing: '-0.4px',
            lineHeight: 1.25,
          }}>
            {listing.title}
          </h1>
          <div style={{
            fontSize: 13,
            color: 'var(--brand-market-text-mid)',
            marginTop: 8,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <span>{categoryEmoji(listing.category)} {categoryLabel(listing.category)}</span>
            <span>· {conditionLabel(listing.condition)}</span>
            {where && <span>· 📍 {where}</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 16,
          flexWrap: 'wrap',
        }}>
          {!isOwn && (
            <>
              <button
                type="button"
                onClick={messageSeller}
                style={{
                  flex: '1 1 200px',
                  padding: '14px 22px',
                  background: 'linear-gradient(135deg, var(--brand-market), var(--brand-market-light))',
                  color: 'white',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 10px 24px rgba(21,128,61,0.35)',
                  letterSpacing: '0.3px',
                }}
              >
                💬 Message seller
              </button>
              <button
                type="button"
                onClick={toggleSave}
                disabled={busy}
                aria-pressed={saved}
                style={{
                  padding: '14px 18px',
                  background: saved ? 'var(--brand-market)' : 'white',
                  color: saved ? 'white' : 'var(--brand-market)',
                  border: `1px solid ${saved ? 'var(--brand-market)' : 'rgba(21,128,61,0.35)'}`,
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: busy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {saved ? '♥ Saved' : '♡ Save'}
              </button>
            </>
          )}
          {isOwn && (
            <>
              <Link
                href={`/home-goods/${listing.id}/edit`}
                style={{
                  flex: '1 1 140px',
                  padding: '13px 22px',
                  background: 'var(--brand-market)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Edit
              </Link>
              {listing.status !== 'sold' && (
                <button
                  type="button"
                  onClick={markSold}
                  disabled={busy}
                  style={{
                    padding: '13px 18px',
                    background: 'white',
                    color: 'var(--brand-market)',
                    border: '1px solid rgba(21,128,61,0.35)',
                    borderRadius: 100,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: busy ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Mark sold
                </button>
              )}
              <button
                type="button"
                onClick={deleteListing}
                disabled={busy}
                style={{
                  padding: '13px 18px',
                  background: 'transparent',
                  color: 'var(--brand-danger-text)',
                  border: '1px solid rgba(220,90,90,0.35)',
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: busy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <section style={{
            marginTop: 22,
            padding: 18,
            background: 'white',
            border: '1px solid rgba(21,128,61,0.18)',
            borderRadius: 18,
          }}>
            <h2 style={{
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--brand-market-text-mid)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 10px',
            }}>
              Description
            </h2>
            <p style={{
              margin: 0,
              fontSize: 14.5,
              color: 'var(--brand-market-deep)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {listing.description}
            </p>
          </section>
        )}

        {/* Seller mini-card */}
        {seller && (
          <Link
            href={`/profile/${seller.username}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 18,
              padding: 14,
              background: 'white',
              border: '1px solid rgba(21,128,61,0.18)',
              borderRadius: 16,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Avatar src={seller.avatar_url} alt={`@${seller.username}`} width={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#5b7a68', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Seller
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand-market-deep)' }}>
                @{seller.username}
              </div>
            </div>
            <span aria-hidden="true" style={{ color: 'var(--brand-market)', fontWeight: 800 }}>→</span>
          </Link>
        )}

        {/* Seller trust signals — member since, active listings, sold count.
            Hides automatically for brand-new sellers with no history. */}
        {seller && (
          <div style={{ marginTop: 10 }}>
            <HomeGoodsSellerStats sellerId={seller.user_id} />
          </div>
        )}

        {/* Safety footer */}
        <div style={{
          marginTop: 22,
          padding: 14,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(21,128,61,0.2)',
          borderRadius: 14,
          fontSize: 12,
          color: 'var(--brand-market-text-mid)',
          lineHeight: 1.5,
        }}>
          <strong>Stay safe:</strong> Mitype is not a party to your transaction. Meet in a public, well-lit place. Inspect the item before paying. Never share your home address until you trust the other party.
        </div>
      </div>
    </main>
  );
}
